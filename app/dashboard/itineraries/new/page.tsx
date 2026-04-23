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

interface ItineraryImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  dayId?: string | null;
}

export default function NewItineraryPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBookingId = sp.get('bookingId') || '';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [days, setDays] = useState<Array<{
    dayNumber: number; date: string; destination: string;
    accommodation: string; mealPlan: { breakfast: boolean; lunch: boolean; dinner: boolean; note: string };
    activities: string; notes: string;
  }>>([]);
  const [dayImages, setDayImages] = useState<Record<number, ItineraryImage[]>>({});
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/bookings?withTour=1').then(r => r.json()).then((data: Booking[]) => {
      setBookings(data);
      if (preBookingId) {
        const b = data.find(b => b.id === preBookingId);
        if (b) loadBooking(b);
      }
    });
  }, [preBookingId]);

  function loadBooking(b: Booking) {
    setSelectedBooking(b);
    setTitle(`${b.tourPackage?.title || 'Custom Tour'} — ${b.client.name}`);
    const startDate = new Date(b.startDate);

    if (b.tourPackage?.days?.length) {
      setDays(b.tourPackage.days.map((d, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const mp = d.mealPlan ? JSON.parse(d.mealPlan) : {};
        const acts = d.activities ? JSON.parse(d.activities) : [];
        return {
          dayNumber: d.dayNumber,
          date: date.toISOString().split('T')[0],
          destination: d.destination?.name || d.title,
          accommodation: d.accommodation || '',
          mealPlan: { breakfast: mp.breakfast || false, lunch: mp.lunch || false, dinner: mp.dinner || false, note: mp.note || '' },
          activities: acts.map((a: any) => `${a.time}: ${a.description}`).join('\n'),
          notes: '',
        };
      }));
    } else {
      // Auto-generate blank days
      const numDays = Math.ceil(
        (new Date(b.startDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1 || 1;
      setDays([{ dayNumber: 1, date: startDate.toISOString().split('T')[0], destination: '', accommodation: '', mealPlan: { breakfast: false, lunch: false, dinner: false, note: '' }, activities: '', notes: '' }]);
    }
  }

  function addDay() {
    const last = days[days.length - 1];
    const lastDate = last ? new Date(last.date) : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    setDays([...days, {
      dayNumber: days.length + 1,
      date: lastDate.toISOString().split('T')[0],
      destination: '', accommodation: '',
      mealPlan: { breakfast: false, lunch: false, dinner: false, note: '' },
      activities: '', notes: '',
    }]);
  }

  function updateDay(index: number, field: string, value: any) {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function updateMeal(index: number, meal: string, value: boolean) {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, mealPlan: { ...d.mealPlan, [meal]: value } } : d));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking) { setError('Please select a booking'); return; }
    setSaving(true);
    setError('');

    const body = {
      bookingId: selectedBooking.id,
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

    const res = await fetch('/api/itineraries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      // Link any uploaded images to their respective saved day IDs
      const savedDays: any[] = data.days || [];
      const imagePatchPromises: Promise<any>[] = [];
      savedDays.forEach((savedDay: any, idx: number) => {
        const imgs = dayImages[idx] || [];
        imgs.forEach(img => {
          imagePatchPromises.push(
            fetch(`/api/itinerary-images/${img.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dayId: savedDay.id }),
            })
          );
        });
      });
      await Promise.all(imagePatchPromises);
      router.push(`/dashboard/itineraries/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to create itinerary');
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
              <label className="label">Booking *</label>
              <select className="input" value={selectedBooking?.id || ''} onChange={e => {
                const b = bookings.find(b => b.id === e.target.value);
                if (b) loadBooking(b);
              }}>
                <option value="">— Select Booking —</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Itinerary Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="01 DAY Trip Masai Mara…" />
            </div>
          </div>
          {selectedBooking?.tourPackage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              ✓ Auto-populated {selectedBooking.tourPackage.days.length} days from <strong>{selectedBooking.tourPackage.title}</strong>. You can edit below.
            </div>
          )}
        </div>

        {/* Day by Day */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Day by Day ({days.length} day{days.length !== 1 ? 's' : ''})</h2>
            <button type="button" onClick={addDay} className="btn-secondary text-sm">+ Add Day</button>
          </div>

          {days.map((day, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Day {day.dayNumber}</span>
                  <input type="date" value={day.date} onChange={e => updateDay(i, 'date', e.target.value)} className="input w-40 text-sm" />
                </div>
                {days.length > 1 && (
                  <button type="button" onClick={() => setDays(days.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Destination *</label>
                  <input value={day.destination} onChange={e => updateDay(i, 'destination', e.target.value)} className="input" placeholder="Masai Mara National Reserve" />
                </div>
                <div>
                  <label className="label text-xs">Accommodation</label>
                  <input value={day.accommodation} onChange={e => updateDay(i, 'accommodation', e.target.value)} className="input" placeholder="Ashnil Mara Camp / No accommodation" />
                </div>
              </div>
              <div>
                <label className="label text-xs">Activities (one per line)</label>
                <textarea value={day.activities} onChange={e => updateDay(i, 'activities', e.target.value)} rows={3} className="input resize-none text-sm"
                  placeholder="Early Morning: Transfer from Nairobi&#10;Mid Morning: Full day game drive&#10;Afternoon: Return to Nairobi" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-600">Meals:</span>
                {(['breakfast', 'lunch', 'dinner'] as const).map(m => (
                  <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={day.mealPlan[m]} onChange={e => updateMeal(i, m, e.target.checked)} className="rounded" />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
                <input value={day.mealPlan.note} onChange={e => setDays(prev => prev.map((d, j) => j === i ? { ...d, mealPlan: { ...d.mealPlan, note: e.target.value } } : d))}
                  className="input w-32 text-xs" placeholder="e.g. Packed lunch" />
              </div>
              <div>
                <label className="label text-xs">Notes</label>
                <input value={day.notes} onChange={e => updateDay(i, 'notes', e.target.value)} className="input text-sm" placeholder="Any special notes for this day…" />
              </div>
              <DayImagePicker
                attachedImages={dayImages[i] || []}
                onImagesChange={(imgs) => setDayImages(prev => ({ ...prev, [i]: imgs }))}
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
