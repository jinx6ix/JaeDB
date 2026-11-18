'use client';

import { useCallback, useEffect, useState } from 'react';

const ORANGE = '#FF7302';
const DEEP_ORANGE = '#C24F00';

interface TransportFee {
  id: string;
  vehicleType: string;
  sittingCapacity: number;
  fee: number;
  currency: string;
  seasonId: string;
  route?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface Season { id: string; name: string; }

interface TransportFeeForm {
  vehicleType: string;
  sittingCapacity: string;
  fee: string;
  currency: string;
  seasonId: string;
  route: string;
  notes: string;
}

const DEFAULT_FORM: TransportFeeForm = {
  vehicleType: '',
  sittingCapacity: '',
  fee: '',
  currency: 'USD',
  seasonId: '',
  route: '',
  notes: '',
};

export default function TransportFeesPage() {
  const [transportFees, setTransportFees] = useState<TransportFee[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TransportFeeForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const setFormField = (k: keyof TransportFeeForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // ---- load data ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/safari-rates/seasons');
        if (!res.ok) throw new Error('Failed to load seasons');
        const data = await res.json();
        if (!cancelled) setSeasons(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      }
      loadTransportFees();
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadTransportFees() {
    try {
      const res = await fetch('/api/transport-fees');
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to load transport fees (HTTP ${res.status})`);
      }
      const data = await res.json();
      setTransportFees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transport fees');
      console.error('Transport fees load error:', err);
    }
  }

  // ---- save ----
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleType.trim()) { alert('Vehicle type is required'); return; }
    if (!form.sittingCapacity.trim()) { alert('Sitting capacity is required'); return; }
    if (!form.fee.trim()) { alert('Fee amount is required'); return; }
    if (!form.seasonId) { alert('Please select a season'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/transport-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleType: form.vehicleType.trim(),
          sittingCapacity: Number(form.sittingCapacity),
          fee: Number(form.fee),
          currency: form.currency || 'USD',
          seasonId: form.seasonId,
          route: form.route.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save transport fee');
      }
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await loadTransportFees();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateTransportFee() {
    if (!editingId) return;
    if (!form.vehicleType.trim()) { alert('Vehicle type is required'); return; }
    if (!form.sittingCapacity.trim()) { alert('Sitting capacity is required'); return; }
    if (!form.fee.trim()) { alert('Fee amount is required'); return; }
    if (!form.seasonId) { alert('Please select a season'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/transport-fees/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleType: form.vehicleType.trim(),
          sittingCapacity: Number(form.sittingCapacity),
          fee: Number(form.fee),
          currency: form.currency || 'USD',
          seasonId: form.seasonId,
          route: form.route.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to update transport fee');
      }
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await loadTransportFees();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransportFee(id: string) {
    if (!confirm('Delete this transport fee?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transport-fees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTransportFees((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  function editTransportFee(f: TransportFee) {
    setEditingId(f.id);
    setForm({
      vehicleType: f.vehicleType,
      sittingCapacity: String(f.sittingCapacity),
      fee: String(f.fee),
      currency: f.currency,
      seasonId: f.seasonId,
      route: f.route || '',
      notes: f.notes || '',
    });
    setShowForm(true);
  }

  const filtered = transportFees.filter((f) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      f.vehicleType.toLowerCase().includes(q) ||
      (f.route || '').toLowerCase().includes(q) ||
      (f.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Fees</h1>
          <p className="text-sm text-gray-500 mt-1">Manage transport/transfer rates by vehicle type, season and route.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? '✕ Cancel' : '+ Add Transport Fee'}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <form onSubmit={editingId ? updateTransportFee : save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">{editingId ? '✏️ Edit Transport Fee' : 'Add Transport Fee'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle Type *</label>
              <input required className="input" value={form.vehicleType} onChange={(e) => setFormField('vehicleType', e.target.value)} placeholder="e.g. Safari Van, Land Cruiser" />
            </div>
            <div>
              <label className="label">Sitting Capacity *</label>
              <input required type="number" min="1" className="input" value={form.sittingCapacity} onChange={(e) => setFormField('sittingCapacity', e.target.value)} placeholder="e.g. 6" />
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
            <div>
              <label className="label">Season *</label>
              <select required className="input" value={form.seasonId} onChange={(e) => setFormField('seasonId', e.target.value)}>
                <option value="">— Select —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Route</label>
              <input className="input" value={form.route} onChange={(e) => setFormField('route', e.target.value)} placeholder="e.g. Airport to Hotel, Nairobi to Mara" />
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
          placeholder="Filter by vehicle type, route or notes…"
          className="input w-full max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Vehicle Type','Capacity','Fee','Currency','Season','Route','Notes'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">No transport fees found.</td></tr>
            )}
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{f.vehicleType}</td>
                <td className="px-4 py-2 text-center">{f.sittingCapacity}</td>
                <td className="px-4 py-2 font-mono">{f.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-gray-500">{f.currency}</td>
                <td className="px-4 py-2 text-gray-600">{f.seasonId}</td>
                <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">{f.route || '—'}</td>
                <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">{f.notes || '—'}</td>
                <td className="px-4 py-2 text-right text-xs">
                  <button onClick={() => editTransportFee(f)} className="text-orange-500 hover:underline mr-2">Edit</button>
                  {deletingId === f.id ? (
                    <button disabled className="text-gray-400">…</button>
                  ) : (
                    <button onClick={() => deleteTransportFee(f.id)} className="text-red-500 hover:text-red-700 underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-500 mt-2">
        Transport fees feed into itinerary day-1 (arrival) and last-day (departure) transfer costs on the costing sheet.
      </p>
    </div>
  );
}
