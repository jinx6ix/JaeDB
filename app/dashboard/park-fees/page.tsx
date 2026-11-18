"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, Save, Trash2 } from 'lucide-react';

const ORANGE = '#FF7302';
const DEEP_ORANGE = '#C24F00';

interface County { id: number; name: string; region?: string | null; }
interface ParkFeeSeason { id: string; name: string; startDate?: string | null; endDate?: string | null; notes?: string | null; createdAt: string; }
interface ParkFee { id: string; countyId: number; name: string; fee: number; currency: string; seasonId?: string | null; notes?: string | null; createdAt: string; county: County; season?: ParkFeeSeason | null; }

interface ParkFeeForm {
  countyId: string;
  name: string;
  fee: string;
  currency: string;
  seasonId: string;
  notes: string;
}

const DEFAULT_FORM: ParkFeeForm = {
  countyId: '',
  name: '',
  fee: '',
  currency: 'USD',
  seasonId: '',
  notes: '',
};

export default function ParkFeesPage() {
  const [parkFees, setParkFees] = useState<ParkFee[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [seasons, setSeasons] = useState<ParkFeeSeason[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ParkFeeForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [countySearch, setCountySearch] = useState('');
  const [countyDropdownOpen, setCountyDropdownOpen] = useState(false);
  const countyInputRef = useRef<HTMLInputElement>(null);

  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('');
  const [newSeasonEnd, setNewSeasonEnd] = useState('');
  const [newSeasonNotes, setNewSeasonNotes] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);



  const setFormField = (k: keyof ParkFeeForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));



  const filteredCounties = counties.filter(c =>
    !countySearch || c.name.toLowerCase().includes(countySearch.toLowerCase()) || (c.region || '').toLowerCase().includes(countySearch.toLowerCase())
  );

  function selectCounty(county: County) {
    setFormField('countyId', String(county.id));
    setCountySearch(county.name);
    setCountyDropdownOpen(false);
    countyInputRef.current?.blur();
  }

  async function createSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName.trim()) { alert('Season name is required'); return; }
    setSavingSeason(true);
    try {
      const res = await fetch('/api/park-fee-seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeasonName.trim(),
          startDate: newSeasonStart || null,
          endDate: newSeasonEnd || null,
          notes: newSeasonNotes || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create season');
      }
      const created = await res.json();
      setSeasons((prev) => [created, ...prev]);
      setFormField('seasonId', created.id);
      setNewSeasonOpen(false);
      setNewSeasonName('');
      setNewSeasonStart('');
      setNewSeasonEnd('');
      setNewSeasonNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to create season');
    } finally {
      setSavingSeason(false);
    }
  }

  // ---- load data ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch('/api/safari-rates/counties'),
          fetch('/api/park-fee-seasons'),
        ]);
        if (!cRes.ok || !sRes.ok) throw new Error('Failed to load reference data');
        const [c, s] = await Promise.all([cRes.json(), sRes.json()]);
        if (!cancelled) {
          setCounties(Array.isArray(c) ? c : []);
          setSeasons(Array.isArray(s) ? s : []);
        }
      } catch {
        /* ignore */
      }
      loadParkFees();
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadParkFees() {
    try {
      const res = await fetch('/api/park-fees');
      if (!res.ok) throw new Error('Failed to load park fees');
      const data = await res.json();
      setParkFees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load park fees');
    }
  }

  // ---- save ----
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.countyId) { alert('Please select a destination'); return; }
    if (!form.name.trim()) { alert('Park name is required'); return; }
    if (!form.fee.trim()) { alert('Fee amount is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/park-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countyId: Number(form.countyId),
          name: form.name.trim(),
          fee: Number(form.fee),
          currency: form.currency || 'USD',
          seasonId: form.seasonId || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save park fee');
      }
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await loadParkFees();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateParkFee() {
    if (!editingId) return;
    if (!form.countyId) { alert('Please select a destination'); return; }
    if (!form.name.trim()) { alert('Park name is required'); return; }
    if (!form.fee.trim()) { alert('Fee amount is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/park-fees/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countyId: Number(form.countyId),
          name: form.name.trim(),
          fee: Number(form.fee),
          currency: form.currency || 'USD',
          seasonId: form.seasonId || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to update park fee');
      }
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await loadParkFees();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteParkFee(id: string) {
    if (!confirm('Delete this park fee?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/park-fees/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setParkFees((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  function editParkFee(f: ParkFee) {
    setEditingId(f.id);
    setForm({
      countyId: String(f.countyId),
      name: f.name,
      fee: String(f.fee),
      currency: f.currency,
      seasonId: f.seasonId || '',
      notes: f.notes || '',
    });
    setShowForm(true);
  }

  const filtered = parkFees.filter((f) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.county.name.toLowerCase().includes(q) ||
      (f.season?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Park Fees</h1>
          <p className="text-sm text-gray-500 mt-1">Manage park/conservancy fees linked to destinations, with optional seasons.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? '✕ Cancel' : '+ Add Park Fee'}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <form onSubmit={editingId ? updateParkFee : save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">{editingId ? '✏️ Edit Park Fee' : 'Add Park Fee'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="label">Destination *</label>
              <div className="relative">
                <input
                  ref={countyInputRef}
                  type="text"
                  placeholder={countySearch ? '' : 'Search destination…'}
                  className="input w-full pr-8"
                  value={form.countyId ? counties.find(c => String(c.id) === form.countyId)?.name : countySearch}
                  onChange={e => {
                    setCountySearch(e.target.value);
                    setCountyDropdownOpen(true);
                    if (form.countyId) setFormField('countyId', '');
                  }}
                  onFocus={() => setCountyDropdownOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => { setCountySearch(''); setFormField('countyId', ''); setCountyDropdownOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  style={{ display: (form.countyId || countySearch) ? 'block' : 'none' }}
                >
                  ×
                </button>
                {countyDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCounties.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">No destinations found</div>
                    ) : (
                      filteredCounties.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); selectCounty(c); }}
                        >
                          {c.name}
                          {c.region ? <span className="text-gray-400 ml-2 text-xs">({c.region})</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {!form.countyId && (
                <p className="text-xs text-red-500 mt-1">Please select a destination</p>
              )}
            </div>
            <div>
              <label className="label">Park / Conservancy Name *</label>
              <input required className="input" value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder="e.g. Maasai Mara National Reserve" />
            </div>
            <div>
              <label className="label">Fee *</label>
              <input required type="number" min="0" step="0.01" className="input font-mono" value={form.fee} onChange={(e) => setFormField('fee', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={(e) => setFormField('currency', e.target.value)}>
                <option>USD</option>
                <option>KES</option>
                <option>EUR</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Season (optional)</label>
                  <select className="input" value={form.seasonId} onChange={(e) => setFormField('seasonId', e.target.value)}>
                    <option value="">— None —</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => setNewSeasonOpen(true)} className="text-xs text-blue-600 hover:text-blue-800 underline px-2 py-1.5">
                  + New Season
                </button>
              </div>
              <p className="text-[10px] text-gray-400">Pick a park-fee season, or leave as "None" if the fee applies year-round.</p>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setFormField('notes', e.target.value)} placeholder="Additional notes…" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); setEditingId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by park, destination or season…"
          className="input w-full max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Park / Conservancy','Destination','Fee','Currency','Season','Notes'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">No park fees found.</td></tr>
            )}
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{f.name}</td>
                <td className="px-4 py-2 text-gray-600">{f.county.name}</td>
                <td className="px-4 py-2 font-mono">{f.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-gray-500">{f.currency}</td>
                <td className="px-4 py-2 text-gray-600">{f.season?.name || '—'}</td>
                <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">{f.notes || '—'}</td>
                <td className="px-4 py-2 text-right text-xs">
                  <button onClick={() => editParkFee(f)} className="text-orange-500 hover:underline mr-2">Edit</button>
                  {deletingId === f.id ? (
                    <button disabled className="text-gray-400">…</button>
                  ) : (
                    <button onClick={() => deleteParkFee(f.id)} className="text-red-500 hover:text-red-700 underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
