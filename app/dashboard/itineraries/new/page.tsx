'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DayImagePicker from '@/components/DayImagePicker';

interface TourDay {
  dayNumber: number;
  title: string;
  destination: { name: string } | null;
  accommodation: string | null;
  mealPlan: string | null;
  activities: string | null;
}

interface Booking {
  id: string;
  bookingRef: string;
  startDate: string;
  numAdults: number;
  client: { name: string };
  tourPackage: {
    title: string;
    durationDays: number;
    days: TourDay[];
  } | null;
}

interface Destination { id: number; name: string; }
interface Hotel {
  id: number;
  name: string;
  category?: string | null;
  stars?: number | null;
  images?: { id: string; filename: string; mimeType: string; data: string }[];
}

interface ItineraryImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  dayId?: string | null;
}

interface DayData {
  tempId: string;
  dayNumber: number;
  date: string;
  destination: string;
  destinationId?: number | null;
  accommodation: string;
  accommodationId?: number | null;
  mealPlan: { breakfast: boolean; lunch: boolean; dinner: boolean; note: string };
  activities: string;
  notes: string;
}

export default function NewItineraryPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBookingId = sp.get('bookingId') || '';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [dayImages, setDayImages] = useState<Record<string, ItineraryImage[]>>({});
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Destination / accommodation lookups
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelsByDest, setHotelsByDest] = useState<Record<number, Hotel[]>>({});
  const [loadingHotels, setLoadingHotels] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/bookings?withTour=1').then(r => r.json()).then((data: Booking[]) => {
      setBookings(data);
      if (preBookingId) {
        const b = data.find((b: Booking) => b.id === preBookingId);
        if (b) loadBooking(b);
      }
    });
    fetch('/api/safari-rates/destinations').then(r => r.json()).then((data: Destination[]) => {
      setDestinations(Array.isArray(data) ? data : []);
    });
    fetch('/api/safari-rates/hotels').then(r => r.json()).then((data: Hotel[]) => {
      setHotels(Array.isArray(data) ? data : []);
    });
  }, [preBookingId]);

  function generateTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  function loadBooking(b: Booking) {
    setSelectedBooking(b);
    setTitle(`${b.tourPackage?.title || 'Custom Tour'} — ${b.client.name}`);
    const startDate = new Date(b.startDate);

    if (b.tourPackage?.days?.length) {
      setDays(b.tourPackage.days.map((d: TourDay, i: number) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const mp = d.mealPlan ? JSON.parse(d.mealPlan) : {};
        const acts = d.activities ? JSON.parse(d.activities) : [];
        const tempId = generateTempId();
        return {
          tempId,
          dayNumber: d.dayNumber,
          date: date.toISOString().split('T')[0],
          destination: d.destination?.name || d.title,
          destinationId: null,
          accommodation: d.accommodation || '',
          accommodationId: null,
          mealPlan: { breakfast: mp.breakfast || false, lunch: mp.lunch || false, dinner: mp.dinner || false, note: mp.note || '' },
          activities: acts.map((a: any) => `${a.time}: ${a.description}`).join('\n'),
          notes: '',
        };
      }));
    } else {
      const tempId = generateTempId();
      setDays([{
        tempId,
        dayNumber: 1,
        date: startDate.toISOString().split('T')[0],
        destination: '',
        destinationId: null,
        accommodation: '',
        accommodationId: null,
        mealPlan: { breakfast: false, lunch: false, dinner: false, note: '' },
        activities: '',
        notes: '',
      }]);
    }
  }

  function addDay() {
    const last = days[days.length - 1];
    const lastDate = last ? new Date(last.date) : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    const maxDayNumber = days.length > 0 ? Math.max(...days.map(d => d.dayNumber)) : 0;
    const tempId = generateTempId();
    setDays([...days, {
      tempId,
      dayNumber: maxDayNumber + 1,
      date: lastDate.toISOString().split('T')[0],
      destination: '',
      destinationId: null,
      accommodation: '',
      accommodationId: null,
      mealPlan: { breakfast: false, lunch: false, dinner: false, note: '' },
      activities: '',
      notes: '',
    }]);
  }

  function updateDay(tempId: string, field: string, value: any) {
    setDays(prev => prev.map(d => d.tempId === tempId ? { ...d, [field]: value } : d));
  }

  async function onDestinationChange(tempId: string, value: string) {
    updateDay(tempId, 'destination', value);
    updateDay(tempId, 'destinationId', null);
    updateDay(tempId, 'accommodation', '');
    updateDay(tempId, 'accommodationId', null);

    const dest = destinations.find(d => d.name === value);
    if (!dest) return;
    updateDay(tempId, 'destinationId', dest.id);

    if (hotelsByDest[dest.id]) return;
    setLoadingHotels(p => ({ ...p, [dest.id]: true }));
    try {
      const res = await fetch(`/api/safari-rates/hotels?destinationId=${dest.id}`);
      const data = await res.json();
      const destHotels = Array.isArray(data) ? data : [];
      setHotelsByDest(p => ({ ...p, [dest.id]: destHotels }));
    } catch (err) {
      console.error('Failed to load hotels for destination', err);
    } finally {
      setLoadingHotels(p => ({ ...p, [dest.id]: false }));
    }
  }

  async function onAccommodationChange(tempId: string, hotelId: number) {
    updateDay(tempId, 'accommodationId', hotelId);
    const hotel = [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === hotelId);
    if (!hotel) return;
    updateDay(tempId, 'accommodation', hotel.name);
  }

  function updateMeal(tempId: string, meal: string, value: boolean) {
    setDays(prev => prev.map(d => d.tempId === tempId ? { ...d, mealPlan: { ...d.mealPlan, [meal]: value } } : d));
  }

  function removeDay(tempId: string) {
    const dayToRemove = days.find(d => d.tempId === tempId);
    if (!dayToRemove) return;
    setDays(prev => prev.filter(d => d.tempId !== tempId));
    setDayImages(prev => {
      const newPrev = { ...prev };
      delete newPrev[dayToRemove.dayNumber];
      return newPrev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (days.length === 0) { setError('Please add at least one day'); return; }
    setSaving(true);
    setError('');

    const body = {
      bookingId: selectedBooking?.id || null,
      title,
      days: days.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        destination: d.destination,
        accommodation: d.accommodation,
        mealPlan: JSON.stringify(d.mealPlan),
        activities: JSON.stringify(d.activities.split('\n').filter(Boolean).map(a => ({ description: a }))),
        notes: d.notes,
      })),
    };

    try {
      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        const savedDays: any[] = data.days || [];
        const imagePatchPromises: Promise<any>[] = [];

        savedDays.forEach((savedDay: any) => {
          const dayData = days.find(d => d.dayNumber === savedDay.dayNumber);
          if (dayData) {
            const imgs = dayImages[dayData.dayNumber] || [];
            imgs.forEach(img => {
              imagePatchPromises.push(
                fetch(`/api/itinerary-images/${img.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dayId: savedDay.id }),
                })
              );
            });
          }
        });

        await Promise.all(imagePatchPromises);
        router.push(`/dashboard/itineraries/${data.id}`);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to create itinerary');
        setSaving(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to create itinerary');
      setSaving(false);
    }
  }

  function hotelImagesFor(hotelId: number) {
    return [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === hotelId)?.images || [];
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/itineraries" className="text-gray-400 hover:text-gray-600 text-sm">← Itineraries</Link>
        <h1 className="text-2xl font-bold text-gray-900">Generate Itinerary</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Itinerary Setup</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Booking (optional)</label>
              <select
                className="input"
                value={selectedBooking?.id || ''}
                onChange={e => {
                  const b = bookings.find((b: Booking) => b.id === e.target.value);
                  if (b) loadBooking(b);
                }}
              >
                <option value="">— No booking (standalone itinerary) —</option>
                {bookings.map((b: Booking) => (
                  <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Itinerary Title *</label>
              <input
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="01 DAY Trip Masai Mara…"
              />
            </div>
          </div>
          {selectedBooking?.tourPackage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              ✓ Auto-populated {selectedBooking.tourPackage.days.length} days from <strong>{selectedBooking.tourPackage.title}</strong>. You can edit below.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Day by Day ({days.length} day{days.length !== 1 ? 's' : ''})</h2>
            <button type="button" onClick={addDay} className="btn-secondary text-sm">+ Add Day</button>
          </div>

          {days.map((day) => (
            <div key={day.tempId} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Day {day.dayNumber}</span>
                  <input
                    type="date"
                    value={day.date}
                    onChange={e => updateDay(day.tempId, 'date', e.target.value)}
                    className="input w-40 text-sm"
                  />
                </div>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(day.tempId)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Destination *</label>
                  <select
                    value={day.destinationId ? destinations.find(d => d.id === day.destinationId)?.name || day.destination : day.destination}
                    onChange={e => onDestinationChange(day.tempId, e.target.value)}
                    className="input"
                  >
                    <option value="">— Select destination —</option>
                    {destinations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Accommodation</label>
                  <select
                    value={day.accommodationId || day.accommodation}
                    onChange={e => {
                      const val = e.target.value;
                      const num = Number(val);
                      if (!isNaN(num) && hotelsByDest[day.destinationId || 0]?.some(h => h.id === num)) {
                        onAccommodationChange(day.tempId, num);
                      } else {
                        updateDay(day.tempId, 'accommodation', val);
                        updateDay(day.tempId, 'accommodationId', null);
                      }
                    }}
                    className="input"
                  >
                    <option value="">— No accommodation —</option>
                    {(day.destinationId ? hotelsByDest[day.destinationId] : []) .map((h: Hotel) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                    <option value="custom">+ Custom / other…</option>
                  </select>
                  {day.accommodationId && !hotelsByDest[day.destinationId || 0]?.some(h => h.id === day.accommodationId) && (
                    <input
                      type="text"
                      value={day.accommodation}
                      onChange={e => updateDay(day.tempId, 'accommodation', e.target.value)}
                      className="input mt-2 text-sm"
                      placeholder="Custom accommodation name"
                    />
                  )}
                </div>
              </div>

              {(day.destinationId && hotelsByDest[day.destinationId]?.some(h => h.id === day.accommodationId)) && (
                <div className="mt-2">
                  <label className="label text-xs block mb-1">Accommodation Images</label>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {day.accommodationId ? hotelImagesFor(day.accommodationId).slice(0, 4).map((img: any) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={`data:${img.mimeType};base64,${img.data}`}
                          alt={img.filename}
                          className="w-full h-16 object-cover"
                        />
                      </div>
                    )) : null}
                  </div>
                </div>
              )}

              <div>
                <label className="label text-xs">Activities (one per line)</label>
                <textarea
                  value={day.activities}
                  onChange={e => updateDay(day.tempId, 'activities', e.target.value)}
                  rows={3}
                  className="input resize-none text-sm"
                  placeholder="Early Morning: Transfer from Nairobi&#10;Mid Morning: Full day game drive&#10;Afternoon: Return to Nairobi"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-600">Meals:</span>
                {(['breakfast', 'lunch', 'dinner'] as const).map(m => (
                  <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.mealPlan[m]}
                      onChange={e => updateMeal(day.tempId, m, e.target.checked)}
                      className="rounded"
                    />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
                <input
                  value={day.mealPlan.note}
                  onChange={e => setDays(prev => prev.map(d =>
                    d.tempId === day.tempId ? { ...d, mealPlan: { ...d.mealPlan, note: e.target.value } } : d
                  ))}
                  className="input w-32 text-xs"
                  placeholder="e.g. Packed lunch"
                />
              </div>

              <div>
                <label className="label text-xs">Notes</label>
                <input
                  value={day.notes}
                  onChange={e => updateDay(day.tempId, 'notes', e.target.value)}
                  className="input text-sm"
                  placeholder="Any special notes for this day…"
                />
              </div>

              <DayImagePicker
                attachedImages={dayImages[day.dayNumber] || []}
                onImagesChange={(imgs) => setDayImages(prev => ({ ...prev, [day.dayNumber]: imgs }))}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Itinerary'}
          </button>
          <Link href="/dashboard/itineraries" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
