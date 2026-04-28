'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Hotel  { id: number; name: string; county: { name: string }; }
interface Season { id: number; hotelId: number; name: string; startDate: string; endDate: string; hotel: { name: string; county: { name: string } }; }

export default function SeasonsPage() {
  const [hotels,  setHotels]  = useState<Hotel[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ hotelId:'', name:'', startDate:'', endDate:'' });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editForm, setEditForm] = useState({ hotelId:'', name:'', startDate:'', endDate:'' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    const [h,s] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(r=>r.json()),
      fetch('/api/safari-rates/seasons').then(r=>r.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]); 
    setSeasons(Array.isArray(s)?s:[]);
  }
  useEffect(()=>{ load(); },[]);

  // Filter seasons based on search term (hotel name or season name)
  const filteredSeasons = seasons.filter(season =>
    season.hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    season.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function save(e: React.FormEvent) {
    e.preventDefault(); 
    setSaving(true);
    try {
      const res = await fetch('/api/safari-rates/seasons', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add season');
      }
      setShowForm(false);
      setForm({hotelId:'',name:'',startDate:'',endDate:''});
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSeason) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/safari-rates/seasons', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          id: editingSeason.id,
          hotelId: Number(editForm.hotelId),
          name: editForm.name,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      setEditingSeason(null);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteSeason(id: number) {
    if (!confirm('Delete this season? This will also delete all associated prices (cascade).')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/safari-rates/seasons?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(season: Season) {
    setEditingSeason(season);
    setEditForm({
      hotelId: String(season.hotelId),
      name: season.name,
      startDate: season.startDate.slice(0,10),
      endDate: season.endDate.slice(0,10),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/safari-rates" className="text-gray-400 hover:text-gray-600 text-sm">← Safari Rates</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Seasons ({seasons.length})</h1>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="btn-primary">+ Add Season</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Add Season</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Hotel *</label>
              <select required className="input" value={form.hotelId} onChange={e=>setForm(f=>({...f,hotelId:e.target.value}))}>
                <option value="">—</option>
                {hotels.map(h=><option key={h.id} value={h.id}>{h.name} · {h.county.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season Name *</label>
              <input required className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="High Season, Low Season, Peak…" />
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input required type="date" className="input" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input required type="date" className="input" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Season'}</button>
            <button type="button" onClick={()=>setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Edit Modal */}
      {editingSeason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingSeason(null)}>
          <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-800 mb-4">✏️ Edit Season</h2>
            <form onSubmit={updateSeason} className="space-y-4">
              <div>
                <label className="label">Hotel *</label>
                <select required className="input" value={editForm.hotelId} onChange={e=>setEditForm(f=>({...f,hotelId:e.target.value}))}>
                  <option value="">—</option>
                  {hotels.map(h=><option key={h.id} value={h.id}>{h.name} · {h.county.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Season Name *</label>
                <input required className="input" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div>
                <label className="label">Start Date *</label>
                <input required type="date" className="input" value={editForm.startDate} onChange={e=>setEditForm(f=>({...f,startDate:e.target.value}))} />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input required type="date" className="input" value={editForm.endDate} onChange={e=>setEditForm(f=>({...f,endDate:e.target.value}))} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingEdit} className="btn-primary">{savingEdit ? 'Saving…' : 'Update Season'}</button>
                <button type="button" onClick={() => setEditingSeason(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="flex gap-2 items-center">
        <label className="label mb-0">Search:</label>
        <input
          type="text"
          placeholder="Hotel or season name..."
          className="input max-w-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 text-sm">Clear</button>
        )}
      </div>

      {/* Seasons Table with Edit & Delete buttons */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Hotel','Destination','Season','Start','End','Actions'].map(h=>(
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSeasons.length===0&&(
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">No matching seasons – try a different search or add one.</td></tr>
            )}
            {filteredSeasons.map(s=>(
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{s.hotel.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.hotel.county.name}</td>
                <td className="px-4 py-2.5 text-orange-600 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(s.startDate).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(s.endDate).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                    title="Edit season"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteSeason(s.id)}
                    disabled={deletingId === s.id}
                    className="text-red-500 hover:text-red-700"
                    title="Delete season (and all its prices)"
                  >
                    {deletingId === s.id ? '…' : '🗑️'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}