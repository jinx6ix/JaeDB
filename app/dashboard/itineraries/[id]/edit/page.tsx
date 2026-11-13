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
  const [destImagesById, setDestImagesById] = useState<Record<number, DestinationImage[]>>({});
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelsByDest, setHotelsByDest] = useState<Record<number, Hotel[]>>({});
  const [loadingHotels, setLoadingHotels] = useState<Record<number, boolean>>({});
  const destImagesRef = useRef<Record<number, DestinationImage[]>>({});
  const hotelImagesRef = useRef<Record<number, DestinationImage[]>>({});
  const usedImgIds = useRef<Record<string, string[]>>({});
  const previewsComputedRef = useRef<Set<number>>(new Set());

  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<'dest' | 'acc' | null>(null);
  const dropdownMouseDownRef = useRef(false);

  useEffect(() => {
    fetch(`/api/itineraries/${id}`).then(r => r.json()).then(data => {
      setItinerary({
        ...data,
        days: data.days.map((d: any, i: number) => ({
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
    const pending: Promise<void>[] = [];

    itinerary.days.forEach((day: any, i: number) => {
      if (previewsComputedRef.current.has(i)) return;

      if (day.destinationId && !destImagesRef.current[day.destinationId]) {
        pending.push(
          fetch(`/api/destinations/${day.destinationId}/images`)
            .then(r => r.json())
            .then((data: any) => {
              if (Array.isArray(data)) {
                destImagesRef.current = { ...destImagesRef.current, [day.destinationId]: data };
                setDestImagesById(p => ({ ...p, [day.destinationId]: data }));
              }
            })
        );
      }
      if (day.destinationId && !hotelsByDest[day.destinationId]) {
        pending.push(
          fetch(`/api/safari-rates/hotels?destinationId=${day.destinationId}`)
            .then(r => r.json())
            .then((data: any) => {
              if (Array.isArray(data)) {
                setHotelsByDest(p => ({ ...p, [day.destinationId]: data }));
                const imgMap: Record<number, DestinationImage[]> = {};
                data.forEach((h: Hotel) => {
                  if (h.images && h.images.length) imgMap[h.id] = h.images as DestinationImage[];
                });
                if (Object.keys(imgMap).length) {
                  hotelImagesRef.current = { ...hotelImagesRef.current, ...imgMap };
                }
              }
            })
        );
      }
      if (day.accommodationId && !hotelImagesRef.current[day.accommodationId]) {
        pending.push(
          fetch(`/api/safari-rates/hotels/${day.accommodationId}`)
            .then(r => r.json())
            .then((data: any) => {
              if (data && data.images) {
                hotelImagesRef.current = { ...hotelImagesRef.current, [day.accommodationId]: data.images };
              }
            })
        );
      }
    });

    Promise.all(pending).then(() => {
      itinerary.days.forEach((day: any, i: number) => {
        if (previewsComputedRef.current.has(i)) return;
        if (day.destinationId || day.accommodationId) {
          computePreviews(i);
          previewsComputedRef.current.add(i);
        }
      });
    });
  }, [itinerary, destinations, hotelsByDest, destImagesById, hotelImagesRef]);

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

  function getDay(i: number) {
    return itinerary.days[i];
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
    if (editingDayIdx === i) setEditingDayIdx(null);
  }

  function pickRandomUnique<T extends { id: string }>(items: T[], count: number, excludeIds: string[]): T[] {
    const pool = items.filter(i => !excludeIds.includes(i.id));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  function hotelImagesFor(hotelId: number) {
    const fromRef = hotelImagesRef.current[hotelId];
    if (fromRef && fromRef.length) return fromRef;
    return [...hotels, ...Object.values(hotelsByDest).flat()].find(h => h.id === hotelId)?.images || [];
  }

  function computePreviews(i: number) {
    setItinerary((prev: any) => {
      const day = prev.days[i];
      if (!day) return prev;
      const used: string[] = usedImgIds.current[String(day.dayNumber)] || [];
      const destImgs = day.destinationId ? (destImagesRef.current[day.destinationId] || destImagesById[day.destinationId] || []) : [];
      const hotelImgs = day.accommodationId ? hotelImagesFor(day.accommodationId) : [];
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
    const day = getDay(i);
    if (!day) return;
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
      const imgMap: Record<number, DestinationImage[]> = {};
      destHotels.forEach((h: Hotel) => {
        if (h.images && h.images.length) imgMap[h.id] = h.images as DestinationImage[];
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
    const existingImgs = hotelImagesRef.current[hotelId] || (hotel.images as DestinationImage[] | undefined) || [];
    if (!existingImgs.length) {
      try {
        const res = await fetch(`/api/safari-rates/hotels/${hotelId}`);
        const data = await res.json();
        if (data && data.images) {
          const imgs = data.images as DestinationImage[];
          hotelImagesRef.current = { ...hotelImagesRef.current, [hotelId]: imgs };
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

    computePreviews(i);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const body = {
        title: itinerary.title,
        days: itinerary.days.map((d: any) => ({
          dayNumber: d.dayNumber,
          date: d.date,
          destination: d.destination,
          accommodation: d.accommodation,
          mealPlan: JSON.stringify(d.mealPlan),
          activities: JSON.stringify(
            (d.activities || '').split('\n').filter(Boolean).map((a: string) => {
              const idx = a.indexOf(':');
              return idx > 0 && idx < 20
                ? { time: a.slice(0, idx).trim(), description: a.slice(idx + 1).trim() }
                : { description: a.trim() };
            })
          ),
          notes: d.notes,
        })),
      };

      const res = await fetch(`/api/itineraries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) {
        await router.push(`/dashboard/itineraries/${id}`);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save itinerary');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Save request timed out. Please try again.');
      } else {
        console.error('Save error:', err);
        setError('Failed to save itinerary');
      }
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  }

  const mealSummary = (mp: any) => {
    const on = ['breakfast', 'lunch', 'dinner'].filter(m => mp[m]);
    return on.length ? on.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ') : '—';
  };

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

        {/* Days table — click a day row to open its details popup */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Day by Day ({itinerary.days.length} day{itinerary.days.length !== 1 ? 's' : ''})</h2>

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
                {itinerary.days.map((day: any, i: number) => (
                  <tr
                    key={day.id}
                    className="hover:bg-orange-50 cursor-pointer transition-colors"
                    onClick={() => setEditingDayIdx(i)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">{day.dayNumber}</span>
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
                {itinerary.days.length === 0 && (
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

          {/* Day details popup card */}
          {editingDayIdx !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setEditingDayIdx(null)}
              />
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                  <div>
                    <h2 className="font-semibold text-gray-800">Day {getDay(editingDayIdx)?.dayNumber}</h2>
                    <p className="text-xs text-gray-500">
                      {getDay(editingDayIdx)?.date && <span>Date: {new Date(getDay(editingDayIdx)!.date).toLocaleDateString()}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDayIdx(null)}
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
                        value={getDay(editingDayIdx)?.date || ''}
                        onChange={e => updateDay(editingDayIdx, 'date', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="label text-xs block mb-1">Destination *</label>
                      <div className="relative space-y-1">
                        <input
                          type="text"
                          value={getDay(editingDayIdx)?.destination || ''}
                          onChange={e => {
                            updateDay(editingDayIdx, 'destination', e.target.value);
                            updateDay(editingDayIdx, 'destinationId', null);
                            updateDay(editingDayIdx, 'accommodation', '');
                            updateDay(editingDayIdx, 'accommodationId', null);
                            setFocusedField('dest');
                          }}
                          onFocus={() => setFocusedField('dest')}
                          onBlur={() => {
                            if (!dropdownMouseDownRef.current) setFocusedField(null);
                          }}
                          className="input text-sm"
                          placeholder="Type destination…"
                        />
                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                          {focusedField === 'dest' &&
                            destinations
                              .filter(d => d.name.toLowerCase().includes((getDay(editingDayIdx)?.destination || '').toLowerCase()))
                              .slice(0, 8)
                              .map(d => (
                                <div
                                  key={d.id}
                                  onMouseDown={() => { dropdownMouseDownRef.current = true; }}
                                  onClick={() => {
                                    onDestinationChange(editingDayIdx, d.name);
                                    setFocusedField(null);
                                    dropdownMouseDownRef.current = false;
                                  }}
                                  className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 border-b border-gray-50 last:border-0"
                                >
                                  {d.name}
                                </div>
                              ))}
                          {focusedField === 'dest' &&
                            (destinations.length === 0 || !destinations.some(d => d.name.toLowerCase().includes((getDay(editingDayIdx)?.destination || '').toLowerCase()))) ? (
                              <div className="px-3 py-2 text-sm text-gray-400">No matching destinations</div>
                            ) : null}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs block mb-1">Accommodation</label>
                      <div className="relative space-y-1">
                        <input
                          type="text"
                          value={getDay(editingDayIdx)?.accommodation || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateDay(editingDayIdx, 'accommodation', val);
                            setFocusedField('acc');
                            // If user typed a known hotel id as text, resolve it
                            const num = Number(val);
                            if (!isNaN(num) && hotels.some(h => h.id === num)) {
                              onAccommodationChange(editingDayIdx, num);
                              setFocusedField(null);
                            } else {
                              updateDay(editingDayIdx, 'accommodationId', null);
                            }
                          }}
                          onFocus={() => setFocusedField('acc')}
                          onBlur={() => {
                            if (!dropdownMouseDownRef.current) setFocusedField(null);
                          }}
                          className="input text-sm"
                          placeholder="Type accommodation…"
                        />
                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                          {focusedField === 'acc' && (() => {
                            const day = getDay(editingDayIdx);
                            if (!day?.destinationId) return null;
                            const destHotels = hotelsByDest[day.destinationId] ?? [];
                            const matches = destHotels.filter((h: Hotel) =>
                              h.name.toLowerCase().includes((day.accommodation || '').toLowerCase())
                            );
                            return (
                              <>
                                {matches.slice(0, 8).map((h: Hotel) => (
                                  <div
                                    key={h.id}
                                    onMouseDown={() => { dropdownMouseDownRef.current = true; }}
                                    onClick={() => {
                                      onAccommodationChange(editingDayIdx, h.id);
                                      setFocusedField(null);
                                      dropdownMouseDownRef.current = false;
                                    }}
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 border-b border-gray-50 last:border-0"
                                  >
                                    {h.name}
                                  </div>
                                ))}
                                {(matches.length === 0) && (
                                  <div className="px-3 py-2 text-sm text-gray-400">No matching hotels</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(getDay(editingDayIdx)?.destinationId || getDay(editingDayIdx)?.accommodationId) && (
                    <div>
                      <label className="label text-xs block mb-1">Destination &amp; Accommodation Images</label>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {(() => {
                          const day = getDay(editingDayIdx)!;
                          const picks: any[] = [
                            ...(day.previewDestImages || []).map((img: any) => ({ ...img, source: 'Destination' })),
                            ...(day.previewHotelImages || []).map((img: any) => ({ ...img, source: 'Accommodation' })),
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
                      value={getDay(editingDayIdx)?.activities || ''}
                      onChange={e => updateDay(editingDayIdx, 'activities', e.target.value)}
                      rows={3}
                      className="input resize-none text-sm w-full"
                      placeholder="Early Morning: Transfer from Nairobi&#10;Mid Morning: Full day game drive&#10;Afternoon: Return to Nairobi"
                    />
                  </div>

                  <div>
                    <label className="label text-xs block mb-1">Meals</label>
                    <div className="flex items-center gap-4">
                      {['breakfast', 'lunch', 'dinner'].map(m => (
                        <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={getDay(editingDayIdx)?.mealPlan[m] || false}
                            onChange={e => updateMeal(editingDayIdx, m, e.target.checked)}
                            className="rounded"
                          />
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </label>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="label text-xs block mb-1">Meal note</label>
                      <input
                        value={getDay(editingDayIdx)?.mealPlan.note || ''}
                        onChange={e => setItinerary((prev: any) => ({
                          ...prev,
                          days: prev.days.map((d: any, j: number) =>
                            j === editingDayIdx ? { ...d, mealPlan: { ...d.mealPlan, note: e.target.value } } : d
                          ),
                        }))}
                        className="input w-48 text-xs"
                        placeholder="e.g. Packed lunch"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs block mb-1">Notes</label>
                    <input
                      value={getDay(editingDayIdx)?.notes || ''}
                      onChange={e => updateDay(editingDayIdx, 'notes', e.target.value)}
                      className="input text-sm w-full"
                      placeholder="Any special notes for this day…"
                    />
                  </div>

                  <DayImagePicker
                    attachedImages={getDay(editingDayIdx)?.images || []}
                    onImagesChange={(imgs) => updateDay(editingDayIdx, 'images', imgs)}
                    dayId={getDay(editingDayIdx)?.id}
                  />
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingDayIdx(null)}
                    className="btn-secondary text-sm px-4"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href={`/dashboard/itineraries/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
