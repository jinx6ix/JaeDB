'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface County { id: number; name: string; region?: string | null; }

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<County[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', region: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/safari-rates/destinations');
      const data = await res.json();
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert('Failed to load destinations: ' + err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { alert('Destination name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/safari-rates/counties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), region: form.region.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to add destination' }));
        throw new Error(err.error || 'Failed to add destination');
      }
      setShowForm(false);
      setForm({ name: '', region: '' });
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(d: County) {
    setEditingId(d.id);
    setEditForm({ name: d.name, region: d.region || '' });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/safari-rates/counties/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), region: editForm.region.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to update destination');
      setEditingId(null);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteDestination(id: number) {
    if (!confirm('Delete this destination?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/safari-rates/counties/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete destination');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = destinations.filter(d =>
    !filter || d.name.toLowerCase().includes(filter.toLowerCase()) || (d.region || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destinations ({destinations.length})</h1>
          <p className="text-sm text-gray-500 mt-1">Manage destinations / areas for hotels and tours</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/hotels" className="btn-secondary text-sm">← Hotels</Link>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? '✕ Cancel' : '+ Add Destination'}</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Add Destination / Area</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destination Name *</label>
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Maasai Mara" />
            </div>
            <div>
              <label className="label">Region (optional)</label>
              <input className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Narok County" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Destination'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <SearchInput
          value={filter}
          onChange={setFilter}
          placeholder="Filter by destination or region…"
          widthClass="max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Destination','Region','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                {editingId === d.id ? (
                  <>
                    <td className="px-4 py-2.5 col-span-3">
                      <form onSubmit={saveEdit} className="flex gap-2 items-center">
                        <input
                          required className="input flex-1"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <input
                          className="input flex-1"
                          value={editForm.region}
                          onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}
                          placeholder="Region"
                        />
                        <button type="submit" disabled={savingEdit} className="btn-primary text-xs py-1.5">{savingEdit ? '…' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                      </form>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{d.region || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => startEdit(d)} className="text-xs text-blue-600 hover:underline px-2 py-1 border border-blue-200 rounded">Edit</button>
                        <button type="button" onClick={() => deleteDestination(d.id)} disabled={deletingId === d.id} className="text-xs text-red-600 hover:underline px-2 py-1 border border-red-200 rounded">{deletingId === d.id ? '…' : 'Delete'}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
