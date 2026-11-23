'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COUNTRIES = ['KENYA', 'TANZANIA', 'UGANDA', 'RWANDA', 'ETHIOPIA', 'BURUNDI', 'SOUTH_SUDAN'];
const COUNTRY_LABELS: Record<string, string> = {
  KENYA: '🇰🇪 Kenya', TANZANIA: '🇹🇿 Tanzania', UGANDA: '🇺🇬 Uganda',
  RWANDA: '🇷🇼 Rwanda', ETHIOPIA: '🇪🇹 Ethiopia', BURUNDI: '🇧🇮 Burundi', SOUTH_SUDAN: '🇸🇸 South Sudan',
};

interface DayInput {
  dayNumber: number;
  title: string;
  destination: string;
  accommodation: string;
  mealBreakfast: boolean;
  mealLunch: boolean;
  mealDinner: boolean;
  mealNote: string;
  activities: string;
}

export default function NewTourPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<string[]>(['KENYA']);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [days, setDays] = useState<DayInput[]>([{
    dayNumber: 1, title: '', destination: '', accommodation: '',
    mealBreakfast: false, mealLunch: true, mealDinner: false, mealNote: '',
    activities: '',
  }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addDay() {
    setDays(prev => [...prev, {
      dayNumber: prev.length + 1, title: '', destination: '', accommodation: '',
      mealBreakfast: false, mealLunch: false, mealDinner: false, mealNote: '', activities: '',
    }]);
  }

  function updateDay(i: number, field: keyof DayInput, value: any) {
    setDays(prev => prev.map((d, j) => j === i ? { ...d, [field]: value } : d));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);

    const durationDays = Number(fd.get('durationDays'));
    const durationNights = Number(fd.get('durationNights'));

    // Create tour package
    const tourRes = await fetch('/api/tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description'),
        durationDays,
        durationNights,
        countries,
        highlights: highlights.filter(Boolean),
      }),
    });

    if (!tourRes.ok) {
      const d = await tourRes.json();
      setError(d.error || 'Failed');
      setSaving(false);
      return;
    }

    const tour = await tourRes.json();

    // Save days
    await fetch(`/api/tours/${tour.id}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: days.map(d => ({
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.destination,
        accommodation: d.accommodation,
        mealPlan: JSON.stringify({ breakfast: d.mealBreakfast, lunch: d.mealLunch, dinner: d.mealDinner, note: d.mealNote }),
        activities: JSON.stringify(d.activities.split('\n').filter(Boolean).map(a => {
          const colonIdx = a.indexOf(':');
          return colonIdx > 0 && colonIdx < 20
            ? { time: a.slice(0, colonIdx).trim(), description: a.slice(colonIdx + 1).trim() }
            : { description: a.trim() };
        })),
      })) }),
    });

    router.push(`/dashboard/tours/${tour.id}`);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tours" className="text-gray-400 hover:text-gray-600 text-sm">← Tours</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Tour Package</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Package Details</h2>
          <div>
            <label className="label">Title *</label>
            <input name="title" required className="input" placeholder="03 Days Masai Mara Safari" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={3} className="input resize-none" placeholder="Brief description for proposals…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration (Days) *</label>
              <input name="durationDays" type="number" min={1} required defaultValue={1} className="input"
                onChange={e => {
                  const n = Number(e.target.value);
                  // Auto-adjust days array
                  setDays(prev => {
                    if (n > prev.length) {
                      const extra = Array.from({ length: n - prev.length }, (_, i) => ({
                        dayNumber: prev.length + i + 1, title: '', destination: '', accommodation: '',
                        mealBreakfast: false, mealLunch: false, mealDinner: false, mealNote: '', activities: '',
                      }));
                      return [...prev, ...extra];
                    }
                    return prev.slice(0, n);
                  });
                }} />
            </div>
            <div>
              <label className="label">Duration (Nights) *</label>
              <input name="durationNights" type="number" min={0} required defaultValue={0} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Countries</label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <label key={c} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${countries.includes(c) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={countries.includes(c)} onChange={e => {
                    if (e.target.checked) setCountries(prev => [...prev, c]);
                    else setCountries(prev => prev.filter(x => x !== c));
                  }} className="hidden" />
                  {COUNTRY_LABELS[c]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Highlights</label>
            <div className="space-y-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input value={h} onChange={e => setHighlights(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                    className="input text-sm" placeholder="e.g. Big Five Spotting" />
                  <button type="button" onClick={() => setHighlights(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setHighlights(prev => [...prev, ''])} className="text-orange-500 text-sm hover:underline">+ Add highlight</button>
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Day-by-Day Itinerary</h2>
            <button type="button" onClick={addDay} className="btn-secondary text-sm">+ Add Day</button>
          </div>
          {days.map((day, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-orange-500 text-white font-bold text-xs px-3 py-1.5 rounded-full">Day {day.dayNumber}</span>
                {days.length > 1 && (
                  <button type="button" onClick={() => setDays(days.filter((_, j) => j !== i).map((d, k) => ({ ...d, dayNumber: k + 1 })))}
                    className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Day Title *</label>
                  <input value={day.title} onChange={e => updateDay(i, 'title', e.target.value)} required className="input" placeholder="Masai Mara National Reserve" />
                </div>
                <div>
                  <label className="label text-xs">Accommodation</label>
                  <input value={day.accommodation} onChange={e => updateDay(i, 'accommodation', e.target.value)} className="input" placeholder="Ashnil Mara Camp / No accommodation" />
                </div>
              </div>
              <div>
                <label className="label text-xs">Activities (one per line, format: "Time: Activity")</label>
                <textarea value={day.activities} onChange={e => updateDay(i, 'activities', e.target.value)} rows={3}
                  className="input resize-none text-sm"
                  placeholder="Early Morning: Transfer from Nairobi&#10;Mid Morning: Full day game drive&#10;Afternoon: Return to Nairobi" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-600">Meals included:</span>
                {(['mealBreakfast', 'mealLunch', 'mealDinner'] as const).map(m => (
                  <label key={m} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={day[m] as boolean} onChange={e => updateDay(i, m, e.target.checked)} className="rounded" />
                    {m.replace('meal', '')}
                  </label>
                ))}
                <input value={day.mealNote} onChange={e => updateDay(i, 'mealNote', e.target.value)}
                  className="input w-36 text-xs" placeholder="e.g. Packed lunch" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Tour Package'}</button>
          <Link href="/dashboard/tours" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
