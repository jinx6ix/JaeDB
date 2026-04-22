'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface County { id: number; name: string; }
interface Hotel  { id: number; name: string; stars: number|null; category: string|null; county: { name: string }; _count: { roomTypes: number }; }

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ countyId:'', name:'', stars:'', category:'Lodge' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [h, c] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(r=>r.json()),
      fetch('/api/safari-rates/counties').then(r=>r.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]); setCounties(Array.isArray(c)?c:[]);
  }

  useEffect(()=>{ load(); },[]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/safari-rates/hotels', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
    });
    setSaving(false); setShowForm(false); setForm({countyId:'',name:'',stars:'',category:'Lodge'});
    load();
  }

  const filtered = hotels.filter(h =>
    !filter || h.name.toLowerCase().includes(filter.toLowerCase()) || h.county.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/safari-rates" className="text-gray-400 hover:text-gray-600 text-sm">← Safari Rates</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Hotels & Camps ({hotels.length})</h1>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="btn-primary">+ Add Hotel</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Add Hotel / Camp</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destination *</label>
              <select required className="input" value={form.countyId} onChange={e=>setForm(f=>({...f,countyId:e.target.value}))}>
                <option value="">— Select —</option>
                {counties.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hotel / Camp Name *</label>
              <input required className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Mara Serena Safari Lodge" />
            </div>
            <div>
              <label className="label">Stars</label>
              <select className="input" value={form.stars} onChange={e=>setForm(f=>({...f,stars:e.target.value}))}>
                <option value="">—</option>
                {[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {['Lodge','Camp','Tented Camp','Hotel','Resort','Guesthouse'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Hotel'}</button>
            <button type="button" onClick={()=>setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <input className="input max-w-sm" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by name or destination…" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Hotel / Camp','Category','Stars','Destination','Room Types'].map(h=>(
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(h=>(
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{h.category||'—'}</td>
                <td className="px-4 py-2.5 text-yellow-500 text-sm">{h.stars?'★'.repeat(h.stars):'—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{h.county.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{h._count.roomTypes} types</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
