'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface County { id: number; name: string; }
interface RoomType { id: number; name: string; maxOccupancy: number; }
interface Hotel  { id: number; name: string; stars: number|null; category: string|null; county: { name: string }; _count: { roomTypes: number }; }

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ countyId:'', name:'', stars:'', category:'Lodge' });
  const [saving, setSaving] = useState(false);
  // Room type management
  const [expandedHotel, setExpandedHotel] = useState<number|null>(null);
  const [hotelRooms, setHotelRooms] = useState<Record<number, RoomType[]>>({});
  const [showRoomForm, setShowRoomForm] = useState<number|null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', maxOccupancy: '2' });
  const [savingRoom, setSavingRoom] = useState(false);

  async function load() {
    const [h, c] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(r=>r.json()),
      fetch('/api/safari-rates/counties').then(r=>r.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]); setCounties(Array.isArray(c)?c:[]);
  }

  useEffect(()=>{ load(); },[]);

  async function loadRooms(hotelId: number) {
    const rooms = await fetch(`/api/safari-rates/room-types?hotelId=${hotelId}`).then(r => r.json());
    setHotelRooms(p => ({ ...p, [hotelId]: Array.isArray(rooms) ? rooms : [] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/safari-rates/hotels', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
    });
    setSaving(false); setShowForm(false); setForm({countyId:'',name:'',stars:'',category:'Lodge'});
    load();
  }
  async function saveRoom(e: React.FormEvent, hotelId: number) {
    e.preventDefault();
    if (!roomForm.name.trim()) {
      alert("Room type name is required");
      return;
    }
    setSavingRoom(true);
    try {
      const res = await fetch('/api/safari-rates/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          name: roomForm.name,
          maxOccupancy: Number(roomForm.maxOccupancy) || 2,
        }),
      });
  
      if (!res.ok) {
        let errorMsg = `Server error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
  
      // Success
      setShowRoomForm(null);
      setRoomForm({ name: '', maxOccupancy: '2' });
      await loadRooms(hotelId);
      await load(); // update room type count in the hotels table
    } catch (err: any) {
      console.error("Failed to add room type:", err);
      alert(err.message); // shows "Room type already exists for this hotel" in case of 409
    } finally {
      setSavingRoom(false);
    }
  }

  async function toggleHotel(hotelId: number) {
    if (expandedHotel === hotelId) { setExpandedHotel(null); return; }
    setExpandedHotel(hotelId);
    if (!hotelRooms[hotelId]) loadRooms(hotelId);
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
              <>
                <tr key={h.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleHotel(h.id)}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{h.category||'—'}</td>
                  <td className="px-4 py-2.5 text-yellow-500 text-sm">{h.stars?'★'.repeat(h.stars):'—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{h.county.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-orange-500 text-xs font-medium">{h._count.roomTypes} room types</span>
                    <span className="text-gray-400 text-xs ml-2">{expandedHotel === h.id ? '▲' : '▼'}</span>
                  </td>
                </tr>
                {expandedHotel === h.id && (
                  <tr key={`${h.id}-rooms`}>
                    <td colSpan={5} className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">Room Types — {h.name}</p>
                        <button onClick={() => setShowRoomForm(h.id)} className="text-orange-500 text-xs hover:underline font-medium">+ Add Room Type</button>
                      </div>
                      {showRoomForm === h.id && (
                        <form onSubmit={e => saveRoom(e, h.id)} className="flex gap-2 mb-3 items-end">
                          <div>
                            <label className="label text-xs">Room Type Name *</label>
                            <input required className="input text-sm py-1.5" value={roomForm.name}
                              onChange={e => setRoomForm(p => ({...p, name: e.target.value}))}
                              placeholder="e.g. Standard Double" />
                          </div>
                          <div>
                            <label className="label text-xs">Max Occupancy</label>
                            <input type="number" min={1} className="input text-sm py-1.5 w-20" value={roomForm.maxOccupancy}
                              onChange={e => setRoomForm(p => ({...p, maxOccupancy: e.target.value}))} />
                          </div>
                          <button type="submit" disabled={savingRoom} className="btn-primary text-sm py-1.5">{savingRoom ? '…' : 'Add'}</button>
                          <button type="button" onClick={() => setShowRoomForm(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                        </form>
                      )}
                      {hotelRooms[h.id]?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {hotelRooms[h.id].map(r => (
                            <span key={r.id} className="bg-white border border-orange-200 text-xs text-gray-700 px-3 py-1 rounded-full">
                              {r.name} <span className="text-gray-400">· max {r.maxOccupancy}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No room types yet. Add one above.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
