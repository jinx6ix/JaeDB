'use client';
import { useEffect, useRef, useState } from 'react';
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
  county?: { id: number; name: string };
  images?: { id: string; filename: string; mimeType: string; data: string }[];
}

interface DestinationImage {
  id: string;
  destinationId: number;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
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
  previewDestImages?: any[];
  previewHotelImages?: any[];
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
  const [destSearch, setDestSearch] = useState('');
  const [destImagesById, setDestImagesById] = useState<Record<number, DestinationImage[]>>({});
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotelsByDest, setHotelsByDest] = useState<Record<number, Hotel[]>>({});
  const [loadingHotels, setLoadingHotels] = useState<Record<number, boolean>>({});
  // Refs hold the latest fetched images so computePreviews can read them
  // immediately without waiting for a React state re-render (fixes first-click staleness).
  const destImagesRef = useRef<Record<number, DestinationImage[]>>({});
  const hotelImagesRef = useRef<Record<number, DestinationImage[]>>({});
  const usedImgIds = useRef<Record<string, string[]>>({});
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

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

  function getDay(tempId: string) {
    return days.find(d => d.tempId === tempId);
  }

  async function onDestinationChange(tempId: string, value: string) {
    const day = getDay(tempId);
    if (!day) return;
    updateDay(tempId, 'destination', value);
    updateDay(tempId, 'destinationId', null);
    updateDay(tempId, 'accommodation', '');
    updateDay(tempId, 'accommodationId', null);
    updateDay(tempId, 'previewDestImages', []);
    updateDay(tempId, 'previewHotelImages', []);

    const dest = destinations.find(d => d.name === value);
    if (!dest) return;
    updateDay(tempId, 'destinationId', dest.id);

    // Load destination images for random preview
    let destImgs: DestinationImage[] = [];
    try {
      const res = await fetch(`/api/destinations/${dest.id}/images`);
      const data = await res.json();
      if (Array.isArray(data)) {
        destImgs = data;
        setDestImagesById(p => ({ ...p, [dest.id]: data }));
        destImagesRef.current = { ...destImagesRef.current, [dest.id]: data };
      }
    } catch (err) {
      console.error('Failed to load destination images', err);
    }

    updateDay(tempId, 'previewDestImages', []);
    updateDay(tempId, 'previewHotelImages', []);

    // Load hotels for this destination (includes images)
    if (hotelsByDest[dest.id]) {
      computePreviews(tempId);
      return;
    }
    setLoadingHotels(p => ({ ...p, [dest.id]: true }));
    try {
      const res = await fetch(`/api/safari-rates/hotels?destinationId=${dest.id}`);
      const data = await res.json();
      const destHotels = Array.isArray(data) ? data : [];
      setHotelsByDest(p => ({ ...p, [dest.id]: destHotels }));
      // Store any images that came back with the hotels
      const imgMap: Record<number, DestinationImage[]> = {};
      destHotels.forEach((h: Hotel) => {
        if (h.images && h.images.length) imgMap[h.id] = h.images as DestinationImage[];
      });
      if (Object.keys(imgMap).length) {
        hotelImagesRef.current = { ...hotelImagesRef.current, ...imgMap };
      }
      computePreviews(tempId);
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

    // If hotel has no images loaded yet, fetch them directly so they appear immediately
    const existingImgs = hotelImagesRef.current[hotelId] || (hotel.images as DestinationImage[] | undefined) || [];
    if (!existingImgs.length) {
      try {
        const res = await fetch(`/api/safari-rates/hotels/${hotelId}`);
        const data = await res.json();
        if (data && data.images) {
          const imgs = data.images as DestinationImage[];
          hotelImagesRef.current = { ...hotelImagesRef.current, [hotelId]: imgs };
          // Also reflect in hotelsByDest so subsequent looks pick it up
          Object.keys(hotelsByDest).forEach(destId => {
            const idx = hotelsByDest[Number(destId)].findIndex(h => h.id === hotelId);
            if (idx >= 0) {
              setHotelsByDest(p => ({
                ...p,
                [Number(destId)]: p[Number(destId)].map((h: Hotel) =>
                  h.id === hotelId ? { ...h, images: data.images as any } : h
                ),
              }));
            }
          });
        }
      } catch (err) {
        console.error('Failed to load hotel images', err);
      }
    }

    computePreviews(tempId);
  }

  function updateMeal(tempId: string, meal: 'breakfast' | 'lunch' | 'dinner', value: boolean) {
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
    delete usedImgIds.current[dayToRemove.dayNumber];
    if (editingDayId === tempId) setEditingDayId(null);
  }

  /** Pick up to `count` unique random images from a list, excluding already-used ids. */
  function pickRandomUnique<T extends { id: string }>(items: T[], count: number, excludeIds: string[]): T[] {
    const pool = items.filter(i => !excludeIds.includes(i.id));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /** Compute destination + accommodation preview images for a day and stash on the day. */
  function computePreviews(tempId: string) {
    setDays(prev => prev.map(d => {
      if (d.tempId !== tempId) return d;
      const used: string[] = usedImgIds.current[d.dayNumber.toString()] || [];
      const destImgs = d.destinationId ? (destImagesRef.current[d.destinationId] || destImagesById[d.destinationId] || []) : [];
      const hotelImgs = d.accommodationId ? hotelImagesFor(d.accommodationId) : [];
      const destPicks = pickRandomUnique(destImgs, 2, used);
      const hotelPicks = pickRandomUnique(hotelImgs, 2, used);
      const picked = [...destPicks, ...hotelPicks];
      usedImgIds.current[d.dayNumber.toString()] = [...used, ...picked.map((i: any) => i.id)];
      return {
        ...d,
        previewDestImages: destPicks,
        previewHotelImages: hotelPicks,
      };
    }));
  }

  function hotelImagesFor(hotelId: number) {
    const fromRef = hotelImagesRef.current[hotelId];
    if (fromRef && fromRef.length) return fromRef;
    return [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === hotelId)?.images || [];
  }

  const mealSummary = (mp: DayData['mealPlan']) => {
    const on = (['breakfast', 'lunch', 'dinner'] as const).filter(m => mp[m]);
    return on.length ? on.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ') : '—';
  };

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

        {/* Days table — click a day row to open its details popup */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Day by Day ({days.length} day{days.length !== 1 ? 's' : ''})</h2>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-14">Day</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Destination</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Accommodation</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Activities</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-40">Meal Plan</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr
                    key={day.tempId}
                    className="hover:bg-orange-50 cursor-pointer transition-colors"
                    onClick={() => setEditingDayId(day.tempId)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Day {day.dayNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                      {day.destination || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                      {day.accommodation || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-sm">
                      {day.activities || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs text-gray-500">{mealSummary(day.mealPlan)}</span>
                    </td>
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No days yet. Click "+ Add Day" below to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Day button at bottom left, outside the day card */}
          <div className="flex justify-start pt-2">
            <button type="button" onClick={addDay} className="btn-secondary text-sm">
              + Add Day
            </button>
          </div>
        </div>

        {/* Day details popup card */}
        {editingDayId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingDayId(null)}
            />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                <div>
                  <h2 className="font-semibold text-gray-800">Day {getDay(editingDayId)?.dayNumber}</h2>
                  <p className="text-xs text-gray-500">
                    {getDay(editingDayId)?.date && <span>Date: {new Date(getDay(editingDayId)!.date).toLocaleDateString()}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDayId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="space-y-3">
                  <div>
                    <label className="label text-xs block mb-1">Date *</label>
                    <input
                      type="date"
                      value={getDay(editingDayId)?.date || ''}
                      onChange={e => updateDay(editingDayId!, 'date', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Destination *</label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={destSearch}
                        onChange={e => setDestSearch(e.target.value)}
                        className="input text-sm"
                        placeholder="Search destinations…"
                      />
                      <select
                        value={getDay(editingDayId)?.destinationId ? destinations.find(d => d.id === getDay(editingDayId)!.destinationId)?.name || getDay(editingDayId)?.destination : getDay(editingDayId)?.destination}
                        onChange={e => onDestinationChange(editingDayId!, e.target.value)}
                        className="input"
                      >
                        <option value="">— Select destination —</option>
                        {destinations
                          .filter(d => !destSearch || d.name.toLowerCase().includes(destSearch.toLowerCase()))
                          .map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Accommodation</label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={hotelSearch}
                        onChange={e => setHotelSearch(e.target.value)}
                        className="input text-sm"
                        placeholder="Search hotels…"
                      />
                      <select
                        value={getDay(editingDayId)?.accommodationId || getDay(editingDayId)?.accommodation}
                        onChange={e => {
                          const val = e.target.value;
                          const num = Number(val);
                          if (!isNaN(num) && hotelsByDest[getDay(editingDayId)!.destinationId || 0]?.some(h => h.id === num)) {
                            onAccommodationChange(editingDayId!, num);
                          } else {
                            updateDay(editingDayId!, 'accommodation', val);
                            updateDay(editingDayId!, 'accommodationId', null);
                          }
                        }}
                        className="input"
                      >
                        <option value="">— No accommodation —</option>
                        {hotels
                          .filter(h => h.county?.id === getDay(editingDayId)!.destinationId)
                          .filter(h => !hotelSearch || h.name.toLowerCase().includes(hotelSearch.toLowerCase()))
                          .map((h: Hotel) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        <option value="custom">+ Custom / other…</option>
                      </select>
                      {getDay(editingDayId)?.accommodationId && !hotelsByDest[getDay(editingDayId)!.destinationId || 0]?.some(h => h.id === getDay(editingDayId)!.accommodationId) && (
                        <input
                          type="text"
                          value={getDay(editingDayId)!.accommodation}
                          onChange={e => updateDay(editingDayId!, 'accommodation', e.target.value)}
                          className="input mt-2 text-sm"
                          placeholder="Custom accommodation name"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {(getDay(editingDayId)?.destinationId || getDay(editingDayId)?.accommodationId) && (
                  <div>
                    <label className="label text-xs block mb-1">Destination &amp; Accommodation Images</label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {(() => {
                        const day = getDay(editingDayId)!;
                        const picks: any[] = [
                          ...(day.previewDestImages || []).map(img => ({ ...img, source: 'Destination' })),
                          ...(day.previewHotelImages || []).map(img => ({ ...img, source: 'Accommodation' })),
                        ];
                        return picks.map((img: any) => (
                          <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200 group">
                            <img
                              src={`data:${img.mimeType};base64,${img.data}`}
                              alt={img.filename}
                              className="w-full h-20 object-cover"
                            />
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                              {img.source === 'Destination' ? '🏞 Destination' : '🏨 Accommodation'}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label text-xs block mb-1">Activities (one per line)</label>
                  <textarea
                    value={getDay(editingDayId)?.activities || ''}
                    onChange={e => updateDay(editingDayId!, 'activities', e.target.value)}
                    rows={3}
                    className="input resize-none text-sm w-full"
                    placeholder="Early Morning: Transfer from Nairobi&#10;Mid Morning: Full day game drive&#10;Afternoon: Return to Nairobi"
                  />
                </div>

                <div>
                  <label className="label text-xs block mb-1">Meals</label>
                  <div className="flex items-center gap-4">
                    {(['breakfast', 'lunch', 'dinner'] as const).map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getDay(editingDayId)?.mealPlan[m] || false}
                          onChange={e => updateMeal(editingDayId!, m, e.target.checked)}
                          className="rounded"
                        />
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="label text-xs block mb-1">Meal note</label>
                    <input
                      value={getDay(editingDayId)?.mealPlan.note || ''}
                      onChange={e => setDays(prev => prev.map(d =>
                        d.tempId === editingDayId ? { ...d, mealPlan: { ...d.mealPlan, note: e.target.value } } : d
                      ))}
                      className="input w-48 text-xs"
                      placeholder="e.g. Packed lunch"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs block mb-1">Notes</label>
                  <input
                    value={getDay(editingDayId)?.notes || ''}
                    onChange={e => updateDay(editingDayId!, 'notes', e.target.value)}
                    className="input text-sm w-full"
                    placeholder="Any special notes for this day…"
                  />
                </div>

                <DayImagePicker
                  attachedImages={dayImages[getDay(editingDayId)!.dayNumber] || []}
                  onImagesChange={(imgs) => setDayImages(prev => ({ ...prev, [getDay(editingDayId)!.dayNumber]: imgs }))}
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDayId(null)}
                  className="btn-secondary text-sm px-4"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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
