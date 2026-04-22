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

  async function load() {
    const [h,s] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(r=>r.json()),
      fetch('/api/safari-rates/seasons').then(r=>r.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]); setSeasons(Array.isArray(s)?s:[]);
  }
  useEffect(()=>{ load(); },[]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/safari-rates/seasons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    setSaving(false); setShowForm(false); setForm({hotelId:'',name:'',startDate:'',endDate:''});
    load();
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

      {showForm&&(
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

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Hotel','Destination','Season','Start','End'].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {seasons.length===0&&<tr><td colSpan={5} className="text-center text-gray-400 py-8">No seasons yet</td></tr>}
            {seasons.map(s=>(
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{s.hotel.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.hotel.county.name}</td>
                <td className="px-4 py-2.5 text-orange-600 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(s.startDate).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</td>
                <td className="px-4 py-2.5 text-gray-600">{new Date(s.endDate).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
