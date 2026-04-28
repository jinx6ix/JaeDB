'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DayImagePicker from '@/components/DayImagePicker';

interface ItineraryImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  dayId?: string | null;
}

export default function EditItineraryPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [itinerary, setItinerary] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
  }, [id]);

  if (!itinerary) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
        accommodation: '',
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
                  <label className="label text-xs">Destination</label>
                  <input value={day.destination} onChange={e => updateDay(i, 'destination', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label text-xs">Accommodation</label>
                  <input value={day.accommodation || ''} onChange={e => updateDay(i, 'accommodation', e.target.value)} className="input" />
                </div>
              </div>
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
