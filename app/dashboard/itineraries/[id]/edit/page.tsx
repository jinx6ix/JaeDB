'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DayImagePicker from '@/components/DayImagePicker';

interface Destination { id: number; name: string; }
interface Hotel {
  id: number;
  name: string;
  category?: string | null;
  stars?: number | null;
  county?: { id: number; name: string };
  images?: HotelImage[];
}
interface DestinationImage {
  id: string;
  destinationId: number;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
}
interface HotelImage {
  id: string;
  hotelId: number;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  createdAt: string;
}

interface ItineraryImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  dayId?: string | null;
}

interface Booking {
  id: string;
  bookingRef: string;
  client: { name: string };
}

export default function EditItineraryPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [itinerary, setItinerary] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [linkingBooking, setLinkingBooking] = useState(false);
  const [error, setError] = useState('');

  // Destination / accommodation lookups
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destSearch, setDestSearch] = useState('');
  const [destImagesById, setDestImagesById] = useState<Record<number, DestinationImage[]>>({});
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotelsByDest, setHotelsByDest] = useState<Record<number, Hotel[]>>({});
  const [loadingHotels, setLoadingHotels] = useState<Record<number, boolean>>({});
  const [hotelImagesByDest, setHotelImagesByDest] = useState<Record<number, HotelImage[]>>({});
  // Refs hold the latest fetched images so computePreviews can read them
  // immediately without waiting for a React state re-render (fixes first-click staleness).
  const destImagesRef = useRef<Record<number, DestinationImage[]>>({});
  const hotelImagesRef = useRef<Record<number, HotelImage[]>>({});
  const usedImgIds = useRef<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`/api/itineraries/${id}`).then(r => r.json()).then(data => {
      setItinerary({
        ...data,
        days: data.days.map((d: any) => ({
          ...d,
          mealPlan: d.mealPlan ? JSON.parse(d.mealPlan) : { breakfast: false, lunch: false, dinner: false, note: '' },
          activities: d.activities
            ? JSON.parse(d.activities).map((a: any) => a.time ? `${a.time}: ${a.description}` : a.description).join('\n')
            : '',
          date: d.date ? new Date(d.date).toISOString().split('T')[0] : '',
          images: d.images || [],
        })),
      });
    });
    fetch('/api/bookings?withTour=1').then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : []);
    });
    fetch('/api/safari-rates/destinations').then(r => r.json()).then((data: Destination[]) => {
      setDestinations(Array.isArray(data) ? data : []);
    });
    fetch('/api/safari-rates/hotels').then(r => r.json()).then((data: Hotel[]) => {
      setHotels(Array.isArray(data) ? data : []);
    });
  }, [id]);

  // Compute previews for existing days on mount once destinations/hotels load
  useEffect(() => {
    if (!itinerary) return;
    itinerary.days.forEach((day: any, i: number) => {
      if (day.destinationId || day.accommodationId) {
        computePreviews(i);
      }
    });
  }, [itinerary, destinations, hotelsByDest, destImagesById, hotelImagesByDest]);

  if (!itinerary) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  async function handleLinkBooking(bookingId: string) {
    setLinkingBooking(true);
    setError('');
    try {
      const res = await fetch(`/api/itineraries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setItinerary((prev: any) => ({ ...prev, bookingId: data.bookingId, booking: data.booking }));
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to link booking');
      }
    } catch (err) {
      setError('Failed to link booking');
    }
    setLinkingBooking(false);
  }

  function addDay() {
    const days = itinerary.days;
    const last = days[days.length - 1];
    const nextDate = last?.date
      ? new Date(new Date(last.date).getTime() + 86400000).toISOString().split('T')[0]
      : '';
    setItinerary((prev: any) => ({
      ...prev,
      days: [...prev.days, {
        id: `new-${Date.now()}`,
        dayNumber: prev.days.length + 1,
        date: nextDate,
        destination: '',
        destinationId: null,
        accommodation: '',
        accommodationId: null,
        mealPlan: { breakfast: false, lunch: false, dinner: false, note: '' },
        activities: '',
        notes: '',
        images: [],
      }],
    }));
  }

  function removeDay(i: number) {
    setItinerary((prev: any) => ({
      ...prev,
      days: prev.days
        .filter((_: any, j: number) => j !== i)
        .map((d: any, j: number) => ({ ...d, dayNumber: j + 1 })),
    }));
    delete usedImgIds.current[String(i + 1)];
  }

  function updateDay(i: number, field: string, value: any) {
    setItinerary((prev: any) => ({
      ...prev,
      days: prev.days.map((d: any, j: number) => j === i ? { ...d, [field]: value } : d),
    }));
  }

  function updateMeal(i: number, meal: string, value: boolean) {
    setItinerary((prev: any) => ({
      ...prev,
      days: prev.days.map((d: any, j: number) =>
        j === i ? { ...d, mealPlan: { ...d.mealPlan, [meal]: value } } : d
      ),
    }));
  }

  function pickRandomUnique<T extends { id: string }>(items: T[], count: number, excludeIds: string[]): T[] {
    const pool = items.filter(i => !excludeIds.includes(i.id));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  function computePreviews(i: number) {
    setItinerary((prev: any) => {
      const day = prev.days[i];
      if (!day) return prev;
      const used: string[] = usedImgIds.current[String(day.dayNumber)] || [];
      const destImgs = day.destinationId ? (destImagesRef.current[day.destinationId] || destImagesById[day.destinationId] || []) : [];
      const hotelFromLists = [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === day.accommodationId)?.images || [];
      const hotelFromSingle = hotelImagesByDest[day.accommodationId || 0] || hotelImagesRef.current[day.accommodationId || 0] || [];
      // merge, dedupe by id
      const hotelImgs = [...hotelFromSingle, ...hotelFromLists.filter(h => !hotelFromSingle.some(s => s.id === h.id))];
      const destPicks = pickRandomUnique(destImgs, 2, used);
      const hotelPicks = pickRandomUnique(hotelImgs, 2, used);
      const picked = [...destPicks, ...hotelPicks];
      usedImgIds.current[String(day.dayNumber)] = [...used, ...picked.map((p: any) => p.id)];
      return {
        ...prev,
        days: prev.days.map((d: any, j: number) => j === i ? {
          ...d,
          previewDestImages: destPicks,
          previewHotelImages: hotelPicks,
        } : d),
      };
    });
  }

  async function onDestinationChange(i: number, value: string) {
    updateDay(i, 'destination', value);
    updateDay(i, 'destinationId', null);
    updateDay(i, 'accommodation', '');
    updateDay(i, 'accommodationId', null);
    updateDay(i, 'previewDestImages', []);
    updateDay(i, 'previewHotelImages', []);

    const dest = destinations.find(d => d.name === value);
    if (!dest) return;
    updateDay(i, 'destinationId', dest.id);

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

    updateDay(i, 'previewDestImages', []);
    updateDay(i, 'previewHotelImages', []);

    // Load hotels for this destination (includes images)
    if (hotelsByDest[dest.id]) {
      computePreviews(i);
      return;
    }
    setLoadingHotels(p => ({ ...p, [dest.id]: true }));
    try {
      const res = await fetch(`/api/safari-rates/hotels?destinationId=${dest.id}`);
      const data = await res.json();
      const destHotels = Array.isArray(data) ? data : [];
      setHotelsByDest(p => ({ ...p, [dest.id]: destHotels }));
      // Store any images that came back with the hotels
      const imgMap: Record<number, HotelImage[]> = {};
      destHotels.forEach((h: Hotel) => {
        if (h.images && h.images.length) imgMap[h.id] = h.images as HotelImage[];
      });
      if (Object.keys(imgMap).length) {
        hotelImagesRef.current = { ...hotelImagesRef.current, ...imgMap };
      }
      computePreviews(i);
    } catch (err) {
      console.error('Failed to load hotels for destination', err);
    } finally {
      setLoadingHotels(p => ({ ...p, [dest.id]: false }));
    }
  }

  async function onAccommodationChange(i: number, hotelId: number) {
    updateDay(i, 'accommodationId', hotelId);
    const hotel = [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === hotelId);
    if (!hotel) return;
    updateDay(i, 'accommodation', hotel.name);

    // If hotel has no images loaded yet, fetch them directly so they appear immediately
    const existingImgs = hotelImagesRef.current[hotelId] || (hotel.images as HotelImage[] | undefined) || [];
    if (!existingImgs.length) {
      try {
        const res = await fetch(`/api/safari-rates/hotels/${hotelId}`);
        const data = await res.json();
        if (data && data.images) {
          const imgs = data.images as HotelImage[];
          hotelImagesRef.current = { ...hotelImagesRef.current, [hotelId]: imgs };
          setHotelImagesByDest(p => ({ ...p, [hotelId]: imgs }));
          // Also reflect in hotelsByDest so subsequent looks pick it up
          Object.keys(hotelsByDest).forEach(destId => {
            const idx = hotelsByDest[Number(destId)].findIndex(h => h.id === hotelId);
            if (idx >= 0) {
              setHotelsByDest(p => ({
                ...p,
                [Number(destId)]: p[Number(destId)].map((h: Hotel) =>
                  h.id === hotelId ? { ...h, images: data.images } : h
                ),
              }));
            }
          });
        }
      } catch (err) {
        console.error('Failed to load hotel images', err);
      }
    }

    computePreviews(i);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body = {
      title: itinerary.title,
      days: itinerary.days.map((d: any) => ({
        dayNumber: d.dayNumber,
        date: d.date,
        destination: d.destination,
        accommodation: d.accommodation,
        mealPlan: JSON.stringify(d.mealPlan),
        activities: JSON.stringify(d.activities.split('\n').filter(Boolean).map((a: string) => {
          const idx = a.indexOf(':');
          return idx > 0 && idx < 20
            ? { time: a.slice(0, idx).trim(), description: a.slice(idx + 1).trim() }
            : { description: a.trim() };
        })),
        notes: d.notes,
      })),
    };

    const res = await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push(`/dashboard/itineraries/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/itineraries/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Itinerary</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Itinerary</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="card">
          <label className="label">Itinerary Title</label>
          <input className="input" value={itinerary.title}
            onChange={e => setItinerary((p: any) => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="card">
          <label className="label">Link to Booking</label>
          {itinerary.booking ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-green-600 text-sm font-medium">✓ Linked to: {itinerary.booking.bookingRef} ({itinerary.booking.client?.name})</span>
              </div>
              <button
                type="button"
                onClick={() => handleLinkBooking('')}
                disabled={linkingBooking}
                className="btn-secondary text-sm"
              >
                {linkingBooking ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className="input flex-1"
                value=""
                onChange={e => handleLinkBooking(e.target.value)}
                disabled={linkingBooking}
              >
                <option value="">— Select a booking to link —</option>
                {bookings.map((b: Booking) => (
                  <option key={b.id} value={b.id}>{b.bookingRef} · {b.client?.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Day by Day ({itinerary.days.length} day{itinerary.days.length !== 1 ? 's' : ''})</h2>
            <button type="button" onClick={addDay} className="btn-secondary text-sm">+ Add Day</button>
          </div>
          {itinerary.days.map((day: any, i: number) => (
            <div key={day.id} className="card space-y-3">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">Day {day.dayNumber}</span>
                  <input type="date" value={day.date} onChange={e => updateDay(i, 'date', e.target.value)} className="input w-40 text-sm" />
                </div>
                {itinerary.days.length > 1 && (
                  <button type="button" onClick={() => removeDay(i)} className="text-red-400 hover:text-red-600 text-xs font-medium">✕ Remove Day</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Destination *</label>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={destSearch}
                      onChange={e => setDestSearch(e.target.value)}
                      className="input text-sm"
                      placeholder="Search destinations…"
                    />
                    <select
                      value={day.destinationId ? destinations.find(d => d.id === day.destinationId)?.name || day.destination : day.destination}
                      onChange={e => onDestinationChange(i, e.target.value)}
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
                  <label className="label text-xs">Accommodation</label>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={hotelSearch}
                      onChange={e => setHotelSearch(e.target.value)}
                      className="input text-sm"
                      placeholder="Search hotels…"
                    />
                    <select
                      value={day.accommodationId || day.accommodation}
                      onChange={e => {
                        const val = e.target.value;
                        const num = Number(val);
                        if (!isNaN(num) && hotelsByDest[day.destinationId || 0]?.some(h => h.id === num)) {
                          onAccommodationChange(i, num);
                        } else {
                          updateDay(i, 'accommodation', val);
                          updateDay(i, 'accommodationId', null);
                          computePreviews(i);
                        }
                      }}
                      className="input"
                    >
                      <option value="">— No accommodation —</option>
                      {(day.destinationId ? hotels.filter(h => h.county?.id === day.destinationId) : [])
                        .filter(h => !hotelSearch || h.name.toLowerCase().includes(hotelSearch.toLowerCase()))
                        .map((h: Hotel) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      <option value="custom">+ Custom / other…</option>
                    </select>
                    {day.accommodationId && !hotelsByDest[day.destinationId || 0]?.some(h => h.id === day.accommodationId) && (
                      <input
                        type="text"
                        value={day.accommodation}
                        onChange={e => updateDay(i, 'accommodation', e.target.value)}
                        className="input mt-2 text-sm"
                        placeholder="Custom accommodation name"
                      />
                    )}
                  </div>
                </div>
              </div>

              {(day.destinationId || day.accommodationId) && (
                <div className="mt-2">
                  <label className="label text-xs block mb-1">Destination &amp; Accommodation Images</label>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {(() => {
                      const picks: any[] = [
                        ...(day.previewDestImages || []).map((img: any) => ({ ...img, source: 'Destination' })),
                        ...(day.previewHotelImages || []).map((img: any) => ({ ...img, source: 'Accommodation' })),
                      ];
                      return picks.map((img: any) => (
                        <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200 group">
                          <img
                            src={`data:${img.mimeType};base64,${img.data}`}
                            alt={img.filename}
                            className="w-full h-16 object-cover"
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
                <label className="label text-xs">Activities (one per line)</label>
                <textarea value={day.activities} onChange={e => updateDay(i, 'activities', e.target.value)}
                  rows={3} className="input resize-none text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-600">Meals:</span>
                {['breakfast', 'lunch', 'dinner'].map(m => (
                  <label key={m} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={day.mealPlan?.[m] || false}
                      onChange={e => updateMeal(i, m, e.target.checked)} className="rounded" />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
                <input value={day.mealPlan?.note || ''}
                  onChange={e => setItinerary((prev: any) => ({
                    ...prev,
                    days: prev.days.map((d: any, j: number) =>
                      j === i ? { ...d, mealPlan: { ...d.mealPlan, note: e.target.value } } : d
                    ),
                  }))}
                  className="input w-32 text-xs" placeholder="e.g. Packed lunch" />
              </div>
              <div>
                <label className="label text-xs">Notes</label>
                <input value={day.notes || ''} onChange={e => updateDay(i, 'notes', e.target.value)} className="input text-sm" />
              </div>
              <DayImagePicker
                attachedImages={day.images || []}
                onImagesChange={(imgs) => updateDay(i, 'images', imgs)}
                dayId={day.id}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href={`/dashboard/itineraries/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
