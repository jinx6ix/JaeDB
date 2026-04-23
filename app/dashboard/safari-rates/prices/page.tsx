'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Hotel      { id: number; name: string; county: { name: string }; }
interface RoomType   { id: number; hotelId: number; name: string; }
interface Season     { id: number; hotelId: number; name: string; startDate: string; endDate: string; }
interface Price      { id: number; boardBasis: string; ratePerPersonSharing: number|null; singleRoomRate: number|null; childRate: number|null; currency: string; roomType: { name: string; hotel: { name: string } }; season: { name: string }; }

const BOARDS = ['FB','HB','BB','RO','AI'];

export default function PricesPage() {
  const [hotels,  setHotels]  = useState<Hotel[]>([]);
  const [rooms,   setRooms]   = useState<RoomType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [prices,  setPrices]  = useState<Price[]>([]);
  const [selHotel, setSelHotel] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [form, setForm] = useState({ roomTypeId:'', seasonId:'', boardBasis:'FB', ratePerPersonSharing:'', singleRoomRate:'', childRate:'', currency:'USD' });

  async function load() {
    const [h,r,s,p] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(x=>x.json()),
      fetch('/api/safari-rates/room-types').then(x=>x.json()),
      fetch('/api/safari-rates/seasons').then(x=>x.json()),
      fetch('/api/safari-rates/prices').then(x=>x.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]); setRooms(Array.isArray(r)?r:[]);
    setSeasons(Array.isArray(s)?s:[]); setPrices(Array.isArray(p)?p:[]);
  }

  useEffect(()=>{ load(); },[]);

  const filtRooms   = rooms.filter(r=>!selHotel||r.hotelId===Number(selHotel));
  const filtSeasons = seasons.filter(s=>!selHotel||s.hotelId===Number(selHotel));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/safari-rates/prices', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
    });
    setSaving(false); setShowForm(false); setEditingId(null); load();
  }

  function handleEdit(p: Price) {
    // Find roomType and season IDs from loaded data
    const room = rooms.find(r => r.name === p.roomType.name && p.roomType.hotel.name);
    const season = seasons.find(s => s.name === p.season.name);
    const hotel = hotels.find(h => h.name === p.roomType.hotel.name);
    setSelHotel(hotel ? String(hotel.id) : '');
    setForm({
      roomTypeId: room ? String(room.id) : '',
      seasonId: season ? String(season.id) : '',
      boardBasis: p.boardBasis,
      ratePerPersonSharing: p.ratePerPersonSharing != null ? String(p.ratePerPersonSharing) : '',
      singleRoomRate: p.singleRoomRate != null ? String(p.singleRoomRate) : '',
      childRate: p.childRate != null ? String(p.childRate) : '',
      currency: p.currency,
    });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/safari-rates" className="text-gray-400 hover:text-gray-600 text-sm">← Safari Rates</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Enter Contract Prices</h1>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="btn-primary">+ Add Price</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">{editingId ? '✏️ Edit Price' : 'Add / Update Price'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Hotel (to filter rooms/seasons)</label>
              <select className="input" value={selHotel} onChange={e=>setSelHotel(e.target.value)}>
                <option value="">— All hotels —</option>
                {hotels.map(h=><option key={h.id} value={h.id}>{h.name} · {h.county.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Board Basis *</label>
              <select required className="input" value={form.boardBasis} onChange={e=>setForm(f=>({...f,boardBasis:e.target.value}))}>
                {BOARDS.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Room Type *</label>
              <select required className="input" value={form.roomTypeId} onChange={e=>setForm(f=>({...f,roomTypeId:e.target.value}))}>
                <option value="">—</option>
                {filtRooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season *</label>
              <select required className="input" value={form.seasonId} onChange={e=>setForm(f=>({...f,seasonId:e.target.value}))}>
                <option value="">—</option>
                {filtSeasons.map(s=><option key={s.id} value={s.id}>{s.name} ({new Date(s.startDate).toLocaleDateString('en-KE',{month:'short',day:'numeric'})} – {new Date(s.endDate).toLocaleDateString('en-KE',{month:'short',day:'numeric'})})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rate Per Person Sharing</label>
              <input type="number" min={0} step="0.01" className="input font-mono" value={form.ratePerPersonSharing} onChange={e=>setForm(f=>({...f,ratePerPersonSharing:e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Single Room Rate</label>
              <input type="number" min={0} step="0.01" className="input font-mono" value={form.singleRoomRate} onChange={e=>setForm(f=>({...f,singleRoomRate:e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Child Rate</label>
              <input type="number" min={0} step="0.01" className="input font-mono" value={form.childRate} onChange={e=>setForm(f=>({...f,childRate:e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                <option>USD</option><option>KES</option><option>EUR</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Price'}</button>
            <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Hotel','Room Type','Season','Board','Per Person Sharing','Single','Child','Currency',''].map(h=>(
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prices.length===0&&<tr><td colSpan={9} className="text-center text-gray-400 py-10">No prices yet. Click + Add Price.</td></tr>}
            {prices.slice(0,100).map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800 text-xs">{p.roomType.hotel.name}</td>
                <td className="px-4 py-2 text-gray-600 text-xs">{p.roomType.name}</td>
                <td className="px-4 py-2 text-orange-600 text-xs">{p.season.name}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{p.boardBasis}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.ratePerPersonSharing?.toLocaleString()||'—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.singleRoomRate?.toLocaleString()||'—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.childRate?.toLocaleString()||'—'}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{p.currency}</td>
                <td className="px-4 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="text-orange-500 hover:underline font-medium"
                  >
                    Edit
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