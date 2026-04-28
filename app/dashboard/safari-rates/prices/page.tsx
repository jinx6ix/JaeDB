'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Hotel      { id: number; name: string; county: { name: string }; }
interface RoomType   { id: number; hotelId: number; name: string; maxOccupancy: number; hotel?: { name: string }; }
interface Season     { id: number; hotelId: number; name: string; startDate: string; endDate: string; hotel?: { name: string }; }
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

  // Search filter for hotel in price table
  const [hotelSearch, setHotelSearch] = useState('');

  // Inline add room type
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxOccupancy, setNewRoomMaxOccupancy] = useState('2');
  const [savingRoom, setSavingRoom] = useState(false);

  // Inline add season
  const [addingSeason, setAddingSeason] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('');
  const [newSeasonEnd, setNewSeasonEnd] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Delete loading states
  const [deletingRoomId, setDeletingRoomId] = useState<number|null>(null);
  const [deletingSeasonId, setDeletingSeasonId] = useState<number|null>(null);

  async function load() {
    const [h,r,s,p] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(x=>x.json()),
      fetch('/api/safari-rates/room-types').then(x=>x.json()),
      fetch('/api/safari-rates/seasons').then(x=>x.json()),
      fetch('/api/safari-rates/prices').then(x=>x.json()),
    ]);
    setHotels(Array.isArray(h)?h:[]);
    setRooms(Array.isArray(r)?r:[]);
    setSeasons(Array.isArray(s)?s:[]);
    setPrices(Array.isArray(p)?p:[]);
  }

  useEffect(()=>{ load(); },[]);

  const filtRooms   = rooms.filter(r=>!selHotel||r.hotelId===Number(selHotel));
  const filtSeasons = seasons.filter(s=>!selHotel||s.hotelId===Number(selHotel));

  // Filter prices by hotel name search
  const filteredPrices = prices.filter(p =>
    p.roomType.hotel.name.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/safari-rates/prices', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
    });
    setSaving(false); setShowForm(false); setEditingId(null); load();
  }

  async function handleAddRoom() {
    if (!selHotel) {
      alert('Please select a hotel first (from the filter dropdown above)');
      return;
    }
    if (!newRoomName.trim()) {
      alert('Room type name is required');
      return;
    }
    setSavingRoom(true);
    try {
      const res = await fetch('/api/safari-rates/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: Number(selHotel),
          name: newRoomName.trim(),
          maxOccupancy: Number(newRoomMaxOccupancy) || 2,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add room type');
      }
      // Refresh room types
      const roomsRes = await fetch('/api/safari-rates/room-types');
      const updatedRooms = await roomsRes.json();
      setRooms(Array.isArray(updatedRooms) ? updatedRooms : []);
      // Auto-select the newly added room type
      const newRoom = updatedRooms.find((r: any) => r.name === newRoomName.trim() && r.hotelId === Number(selHotel));
      if (newRoom) setForm(f => ({ ...f, roomTypeId: String(newRoom.id) }));
      setAddingRoom(false);
      setNewRoomName('');
      setNewRoomMaxOccupancy('2');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleAddSeason() {
    if (!selHotel) {
      alert('Please select a hotel first (from the filter dropdown above)');
      return;
    }
    if (!newSeasonName.trim() || !newSeasonStart || !newSeasonEnd) {
      alert('Season name, start date, and end date are required');
      return;
    }
    setSavingSeason(true);
    try {
      const res = await fetch('/api/safari-rates/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: Number(selHotel),
          name: newSeasonName.trim(),
          startDate: newSeasonStart,
          endDate: newSeasonEnd,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add season');
      }
      const seasonsRes = await fetch('/api/safari-rates/seasons');
      const updatedSeasons = await seasonsRes.json();
      setSeasons(Array.isArray(updatedSeasons) ? updatedSeasons : []);
      // Auto-select the newly added season
      const newSeason = updatedSeasons.find((s: any) => s.name === newSeasonName.trim() && s.hotelId === Number(selHotel));
      if (newSeason) setForm(f => ({ ...f, seasonId: String(newSeason.id) }));
      setAddingSeason(false);
      setNewSeasonName('');
      setNewSeasonStart('');
      setNewSeasonEnd('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSeason(false);
    }
  }

  async function deleteRoomType(id: number) {
    if (!confirm('Delete this room type? This will also delete all associated prices (cascade).')) return;
    setDeletingRoomId(id);
    try {
      const res = await fetch(`/api/safari-rates/room-types?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      // Refresh rooms and prices
      await load();
      // If the deleted room was selected in the form, clear it
      if (form.roomTypeId === String(id)) setForm(f => ({ ...f, roomTypeId: '' }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingRoomId(null);
    }
  }

  async function deleteSeason(id: number) {
    if (!confirm('Delete this season? This will also delete all associated prices (cascade).')) return;
    setDeletingSeasonId(id);
    try {
      const res = await fetch(`/api/safari-rates/seasons?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      await load();
      if (form.seasonId === String(id)) setForm(f => ({ ...f, seasonId: '' }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingSeasonId(null);
    }
  }

  function handleEdit(p: Price) {
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
              <label className="label">Hotel (to filter rooms/seasons) *</label>
              <select required className="input" value={selHotel} onChange={e=>setSelHotel(e.target.value)}>
                <option value="">— Select a hotel first —</option>
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
              <div className="flex justify-between items-center">
                <label className="label">Room Type *</label>
                {selHotel && !addingRoom && (
                  <button type="button" onClick={() => setAddingRoom(true)} className="text-xs text-orange-500 hover:underline">+ New Room Type</button>
                )}
              </div>
              {!addingRoom ? (
                <select required className="input" value={form.roomTypeId} onChange={e=>setForm(f=>({...f,roomTypeId:e.target.value}))}>
                  <option value="">—</option>
                  {filtRooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              ) : (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <input type="text" placeholder="Room type name" className="input text-sm" value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} />
                  <input type="number" placeholder="Max occupancy" className="input text-sm" value={newRoomMaxOccupancy} onChange={e=>setNewRoomMaxOccupancy(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddRoom} disabled={savingRoom} className="btn-primary text-sm py-1">{savingRoom ? 'Adding...' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingRoom(false); setNewRoomName(''); setNewRoomMaxOccupancy('2'); }} className="btn-secondary text-sm py-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="label">Season *</label>
                {selHotel && !addingSeason && (
                  <button type="button" onClick={() => setAddingSeason(true)} className="text-xs text-orange-500 hover:underline">+ New Season</button>
                )}
              </div>
              {!addingSeason ? (
                <select required className="input" value={form.seasonId} onChange={e=>setForm(f=>({...f,seasonId:e.target.value}))}>
                  <option value="">—</option>
                  {filtSeasons.map(s=><option key={s.id} value={s.id}>{s.name} ({new Date(s.startDate).toLocaleDateString('en-KE',{month:'short',day:'numeric'})} – {new Date(s.endDate).toLocaleDateString('en-KE',{month:'short',day:'numeric'})})</option>)}
                </select>
              ) : (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <input type="text" placeholder="Season name" className="input text-sm" value={newSeasonName} onChange={e=>setNewSeasonName(e.target.value)} />
                  <input type="date" placeholder="Start date" className="input text-sm" value={newSeasonStart} onChange={e=>setNewSeasonStart(e.target.value)} />
                  <input type="date" placeholder="End date" className="input text-sm" value={newSeasonEnd} onChange={e=>setNewSeasonEnd(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddSeason} disabled={savingSeason} className="btn-primary text-sm py-1">{savingSeason ? 'Adding...' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingSeason(false); setNewSeasonName(''); setNewSeasonStart(''); setNewSeasonEnd(''); }} className="btn-secondary text-sm py-1">Cancel</button>
                  </div>
                </div>
              )}
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
            <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null); setAddingRoom(false); setAddingSeason(false); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Hotel search filter for price table */}
      <div className="flex gap-2 items-center">
        <label className="label mb-0">Filter by Hotel:</label>
        <input
          type="text"
          placeholder="Type hotel name..."
          className="input max-w-sm"
          value={hotelSearch}
          onChange={e => setHotelSearch(e.target.value)}
        />
        {hotelSearch && (
          <button onClick={() => setHotelSearch('')} className="text-gray-400 hover:text-gray-600 text-sm">Clear</button>
        )}
      </div>

      {/* Price Table */}
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
            {filteredPrices.length===0&&(
              <tr><td colSpan={9} className="text-center text-gray-400 py-10">No prices found. Try a different hotel name or add a price.</td></tr>
            )}
            {filteredPrices.slice(0,100).map(p=>(
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

      {/* Manage Room Types & Seasons (Delete) */}
      <div className="grid grid-cols-2 gap-5">
        {/* Room Types Management */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-2">Manage Room Types</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-400 text-sm">No room types yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr><th className="text-left px-2 py-1">Hotel</th><th className="text-left px-2 py-1">Room Type</th><th className="text-left px-2 py-1">Max</th><th></th></tr>
                </thead>
                <tbody className="divide-y">
                  {rooms.map(r => (
                    <tr key={r.id}>
                      <td className="px-2 py-1 truncate max-w-[100px]">{r.hotel?.name || '?'}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.maxOccupancy}</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          onClick={() => deleteRoomType(r.id)}
                          disabled={deletingRoomId === r.id}
                          className="text-red-500 hover:text-red-700"
                        >
                          {deletingRoomId === r.id ? '…' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Seasons Management */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-2">Manage Seasons</h2>
          {seasons.length === 0 ? (
            <p className="text-gray-400 text-sm">No seasons yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr><th className="text-left px-2 py-1">Hotel</th><th className="text-left px-2 py-1">Season</th><th className="text-left px-2 py-1">Period</th><th></th></tr>
                </thead>
                <tbody className="divide-y">
                  {seasons.map(s => (
                    <tr key={s.id}>
                      <td className="px-2 py-1 truncate max-w-[100px]">{s.hotel?.name || '?'}</td>
                      <td className="px-2 py-1">{s.name}</td>
                      <td className="px-2 py-1">{new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          onClick={() => deleteSeason(s.id)}
                          disabled={deletingSeasonId === s.id}
                          className="text-red-500 hover:text-red-700"
                        >
                          {deletingSeasonId === s.id ? '…' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}