'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Tour { id: string; title: string; durationDays: number; }

export default function NewRateCardPage() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [includes, setIncludes] = useState<string[]>(['Transport', 'Park Entry Fees', 'Game Drives', 'Meals as specified', 'Taxes/VAT']);
  const [excludes, setExcludes] = useState<string[]>(['International Flights', 'Personal Items', 'Tips (US$10 pp/day)', 'Visa Fees']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tours').then(r => r.json()).then(setTours);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      tourPackageId: fd.get('tourPackageId'),
      season: fd.get('season'),
      validFrom: fd.get('validFrom'),
      validTo: fd.get('validTo'),
      basedOn2: Number(fd.get('basedOn2')),
      basedOn4: Number(fd.get('basedOn4')),
      basedOn6: Number(fd.get('basedOn6')),
      basedOn8: Number(fd.get('basedOn8')),
      basedOn10: fd.get('basedOn10') ? Number(fd.get('basedOn10')) : null,
      basedOn12: fd.get('basedOn12') ? Number(fd.get('basedOn12')) : null,
      markupPercent: Number(fd.get('markupPercent')),
      currency: fd.get('currency'),
      includes: JSON.stringify(includes.filter(Boolean)),
      excludes: JSON.stringify(excludes.filter(Boolean)),
      notes: fd.get('notes') || null,
    };
    const res = await fetch('/api/rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      router.push('/dashboard/costing');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/costing" className="text-gray-400 hover:text-gray-600 text-sm">← Rates</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Rate Card</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Rate Card Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Tour Package *</label>
              <select name="tourPackageId" required className="input">
                <option value="">— Select Tour —</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season *</label>
              <select name="season" required className="input">
                <option value="LOW">Low Season</option>
                <option value="SHOULDER">Shoulder Season</option>
                <option value="HIGH">High Season</option>
              </select>
            </div>
            <div>
              <label className="label">Currency</label>
              <select name="currency" className="input">
                <option value="USD">USD</option>
                <option value="KES">KES</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="label">Valid From *</label>
              <input name="validFrom" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Valid To *</label>
              <input name="validTo" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Markup %</label>
              <input name="markupPercent" type="number" min={0} max={100} defaultValue={10} className="input" />
            </div>
          </div>
        </div>

        {/* Pax-based pricing */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Per-Person Rates (pre-markup)</h2>
          <p className="text-sm text-gray-500">Enter cost per person for each group size. These match your costing sheet "Based on N people" columns.</p>
          <div className="grid grid-cols-3 gap-4">
            {[2, 4, 6, 8, 10, 12].map((n) => (
              <div key={n}>
                <label className="label">Based on {n} People {n <= 8 ? '*' : ''}</label>
                <input name={`basedOn${n}`} type="number" min={0} required={n <= 8} placeholder={`0`} className="input font-mono" />
                <p className="text-xs text-gray-400 mt-0.5">per person</p>
              </div>
            ))}
          </div>
        </div>

        {/* Includes / Excludes */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Included / Excluded</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Included Items</label>
              {includes.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={item} onChange={e => setIncludes(prev => prev.map((v, j) => j === i ? e.target.value : v))} className="input text-sm" />
                  <button type="button" onClick={() => setIncludes(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setIncludes(prev => [...prev, ''])} className="text-orange-500 text-sm hover:underline">+ Add item</button>
            </div>
            <div>
              <label className="label">Excluded Items</label>
              {excludes.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={item} onChange={e => setExcludes(prev => prev.map((v, j) => j === i ? e.target.value : v))} className="input text-sm" />
                  <button type="button" onClick={() => setExcludes(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setExcludes(prev => [...prev, ''])} className="text-orange-500 text-sm hover:underline">+ Add item</button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input resize-none" placeholder="Any notes about this rate card…" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Rate Card'}</button>
          <Link href="/dashboard/costing" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
