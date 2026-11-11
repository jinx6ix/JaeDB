'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Price {
  id: number; boardBasis: string; ratePerPersonSharing: number|null;
  singleRoomRate: number|null; childRate: number|null; thirdAdultRate: number|null;
  currency: string;
  roomType: { id: number; name: string; maxOccupancy: number; hotel: { id: number; name: string; stars: number|null; category: string|null; county: { id: number; name: string } } };
  season: { id: number; name: string; startDate: string; endDate: string };
}
interface County { id: number; name: string; }
interface Hotel { id: number; name: string; county: { id: number; name: string }; stars?: number|null; category?: string|null; }
interface RoomType { id: number; hotelId: number; name: string; maxOccupancy: number; }
interface Season { id: number; hotelId: number; name: string; startDate: string; endDate: string; }

const BOARD: Record<string,string> = { RO:'Room Only', BB:'Bed & Breakfast', HB:'Half Board', FB:'Full Board', AI:'All Inclusive' };
function fmt(v: number|null, cur: string) { return v==null?'—':`${cur} ${Number(v).toLocaleString()}`; }

interface RateForm {
  roomTypeId: string; seasonId: string; boardBasis: string;
  ratePerPersonSharing: string; singleRoomRate: string; childRate: string;
  thirdAdultRate: string; currency: string;
  // inline room type creation
  newRoomName: string; newRoomMaxOccupancy: string;
  // inline season creation
  newSeasonName: string; newSeasonStart: string; newSeasonEnd: string;
}

export default function SafariRatesSearchPage() {
  const [counties, setCounties] = useState<County[]>([]);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hotelInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [results, setResults] = useState<Price[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [nights, setNights] = useState(0);
  const [sortOrder, setSortOrder] = useState<'price_asc' | 'price_desc'>('price_asc');
  const [form, setForm] = useState({ county: '', hotel: '', checkin: '', checkout: '', board: '' });

  // Inline edit state
  const [editingId, setEditingId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<RateForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline add rate state
  const [addingKey, setAddingKey] = useState<string|null>(null);
  const [addForm, setAddForm] = useState<RateForm | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);

  // Inline delete state
  const [deletingId, setDeletingId] = useState<number|null>(null);

  // Extend season state: copies all prices from a season to a new season with new dates
  const [extendingSeasonId, setExtendingSeasonId] = useState<number|null>(null);
  const [extendForm, setExtendForm] = useState<{ name: string; startDate: string; endDate: string } | null>(null);
  const [savingExtend, setSavingExtend] = useState(false);

  // Edit hotel (name + destination) state
  const [editingHotelId, setEditingHotelId] = useState<number|null>(null);
  const [hotelEditForm, setHotelEditForm] = useState<{ name: string; countyId: string } | null>(null);
  const [savingHotel, setSavingHotel] = useState(false);

  // Load counties, hotels, room types, seasons once
  useEffect(() => {
    fetch('/api/safari-rates/counties').then(r => r.json()).then(setCounties).catch(()=>{});
    fetch('/api/safari-rates/hotels')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllHotels(data); })
      .catch(() => {});
    fetch('/api/safari-rates/room-types')
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setRoomTypes(data); }).catch(()=>{});
    fetch('/api/safari-rates/seasons')
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setSeasons(data); }).catch(()=>{});
  }, []);

  // Filter hotels client‑side based on typed text and selected county
  useEffect(() => {
    let filtered = allHotels;
    if (form.hotel.trim()) {
      const lower = form.hotel.toLowerCase();
      filtered = filtered.filter(h => h.name.toLowerCase().includes(lower));
    }
    if (form.county) {
      filtered = filtered.filter(h => h.county.name === form.county);
    }
    setFilteredHotels(filtered.slice(0, 15));
  }, [form.hotel, form.county, allHotels]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node) &&
          hotelInputRef.current && !hotelInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute number of nights when dates change
  useEffect(() => {
    if (form.checkin && form.checkout) {
      const n = Math.max(0, Math.round((new Date(form.checkout).getTime() - new Date(form.checkin).getTime()) / 86400000));
      setNights(n);
    } else {
      setNights(0);
    }
  }, [form.checkin, form.checkout]);

  async function search() {
    setLoading(true);
    setSearched(false);
    const p = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => { if (v) p.set(k, v); });
    try {
      const res = await fetch(`/api/safari-rates/search?${p}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    }
    setLoading(false);
    setSearched(true);
  }

  // Group results by hotel
  const grouped = results.reduce<Record<string, Price[]>>((acc, p) => {
    const key = `${p.roomType.hotel.county.name}__${p.roomType.hotel.name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Compute minimum rate per hotel for sorting
  const hotelMinRates = Object.entries(grouped).map(([key, prices]) => {
    let minRate = Infinity;
    for (const p of prices) {
      if (p.ratePerPersonSharing !== null && p.ratePerPersonSharing < minRate) {
        minRate = p.ratePerPersonSharing;
      }
    }
    return { key, minRate: minRate === Infinity ? Infinity : minRate };
  });

  const sortedHotelKeys = [...Object.keys(grouped)].sort((a, b) => {
    const rateA = hotelMinRates.find(r => r.key === a)?.minRate || Infinity;
    const rateB = hotelMinRates.find(r => r.key === b)?.minRate || Infinity;
    return sortOrder === 'price_asc' ? rateA - rateB : rateB - rateA;
  });

  // --- Season creation (inline) ---
  async function createSeason(hotelId: number, name: string, start: string, end: string): Promise<Season | null> {
    try {
      const res = await fetch('/api/safari-rates/seasons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, name: name.trim(), startDate: start, endDate: end }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create season');
      }
      const data = await res.json();
      setSeasons(prev => [...prev, data]);
      return data as Season;
    } catch (err: any) {
      alert(err.message);
      return null;
    }
  }

  // --- Room type creation (inline) ---
  async function createRoomType(hotelId: number, name: string, maxOccupancy: string): Promise<RoomType | null> {
    try {
      const res = await fetch('/api/safari-rates/room-types', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, name: name.trim(), maxOccupancy: Number(maxOccupancy) || 2 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create room type');
      }
      const data = await res.json();
      setRoomTypes(prev => [...prev, data]);
      return data as RoomType;
    } catch (err: any) {
      alert(err.message);
      return null;
    }
  }

  // Resolve a room type id: if 'new', create it first; otherwise use existing id
  async function resolveRoomType(formData: RateForm, hotel: Hotel): Promise<number> {
    if (formData.roomTypeId === 'new' && formData.newRoomName.trim()) {
      const created = await createRoomType(hotel.id, formData.newRoomName, formData.newRoomMaxOccupancy);
      if (!created) throw new Error('Room type creation failed');
      return created.id;
    }
    return Number(formData.roomTypeId);
  }

  // Resolve a season id: if 'new', create it first; otherwise use existing id
  async function resolveSeason(formData: RateForm, hotel: Hotel): Promise<number> {
    if (formData.seasonId === 'new') {
      if (!formData.newSeasonName.trim() || !formData.newSeasonStart || !formData.newSeasonEnd) {
        throw new Error('Season name, start date and end date are required');
      }
      const created = await createSeason(hotel.id, formData.newSeasonName, formData.newSeasonStart, formData.newSeasonEnd);
      if (!created) throw new Error('Season creation failed');
      return created.id;
    }
    return Number(formData.seasonId);
  }

  // --- Inline edit ---
  function startEdit(p: Price) {
    const rt = roomTypes.find(r => r.id === p.roomType.id);
    setEditForm({
      roomTypeId: String(p.roomType.id),
      seasonId: String(p.season.id),
      boardBasis: p.boardBasis,
      ratePerPersonSharing: p.ratePerPersonSharing != null ? String(p.ratePerPersonSharing) : '',
      singleRoomRate: p.singleRoomRate != null ? String(p.singleRoomRate) : '',
      childRate: p.childRate != null ? String(p.childRate) : '',
      thirdAdultRate: p.thirdAdultRate != null ? String(p.thirdAdultRate) : '',
      currency: p.currency,
      newRoomName: '', newRoomMaxOccupancy: String(rt?.maxOccupancy || 2),
      newSeasonName: '', newSeasonStart: '', newSeasonEnd: '',
    });
    setEditingId(p.id);
  }

  async function saveEdit() {
    if (!editForm || editingId === null) return;
    setSavingEdit(true);
    try {
      const price = results.find(p => p.id === editingId);
      const hotel = price?.roomType.hotel;
      if (!hotel) throw new Error('Could not determine hotel for this rate');
      const roomTypeId = await resolveRoomType(editForm, hotel);
      const seasonId = await resolveSeason(editForm, hotel);
      const res = await fetch(`/api/safari-rates/prices/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId,
          seasonId,
          boardBasis: editForm.boardBasis,
          ratePerPersonSharing: editForm.ratePerPersonSharing ? Number(editForm.ratePerPersonSharing) : null,
          singleRoomRate: editForm.singleRoomRate ? Number(editForm.singleRoomRate) : null,
          childRate: editForm.childRate ? Number(editForm.childRate) : null,
          thirdAdultRate: editForm.thirdAdultRate ? Number(editForm.thirdAdultRate) : null,
          currency: editForm.currency || 'USD',
        }),
      });
      if (!res.ok) throw new Error('Failed to update rate');
      setEditingId(null);
      setEditForm(null);
      search();
    } catch (err: any) { alert(err.message); }
    finally { setSavingEdit(false); }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  // --- Add rate for a hotel ---
  function startAdd(key: string) {
    setAddingKey(key);
    setAddForm({
      roomTypeId: '', seasonId: '', boardBasis: 'FB',
      ratePerPersonSharing: '', singleRoomRate: '', childRate: '', thirdAdultRate: '', currency: 'USD',
      newRoomName: '', newRoomMaxOccupancy: '2',
      newSeasonName: '', newSeasonStart: '', newSeasonEnd: '',
    });
  }

  async function saveAdd() {
    if (!addForm || addingKey === null) return;
    setSavingAdd(true);
    try {
      const price = results.find(p => `${p.roomType.hotel.county.name}__${p.roomType.hotel.name}` === addingKey);
      const hotel = price?.roomType.hotel;
      if (!hotel) throw new Error('Could not determine hotel for this rate');
      const roomTypeId = await resolveRoomType(addForm, hotel);
      const seasonId = await resolveSeason(addForm, hotel);
      const res = await fetch('/api/safari-rates/prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId,
          seasonId,
          boardBasis: addForm.boardBasis,
          ratePerPersonSharing: addForm.ratePerPersonSharing ? Number(addForm.ratePerPersonSharing) : null,
          singleRoomRate: addForm.singleRoomRate ? Number(addForm.singleRoomRate) : null,
          childRate: addForm.childRate ? Number(addForm.childRate) : null,
          thirdAdultRate: addForm.thirdAdultRate ? Number(addForm.thirdAdultRate) : null,
          currency: addForm.currency || 'USD',
        }),
      });
      if (!res.ok) throw new Error('Failed to add rate');
      setAddingKey(null);
      setAddForm(null);
      search();
    } catch (err: any) { alert(err.message); }
    finally { setSavingAdd(false); }
  }

  function cancelAdd() {
    setAddingKey(null);
    setAddForm(null);
  }

  // --- Delete rate ---
  async function deletePrice(id: number) {
    if (!confirm('Delete this rate?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/safari-rates/prices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rate');
      search();
    } catch (err: any) { alert(err.message); }
    finally { setDeletingId(null); }
  }

  // --- Extend season (copy rates to new dates) ---
  function startExtend(seasonId: number) {
    const season = seasons.find(s => s.id === seasonId);
    if (!season) return;
    setExtendingSeasonId(seasonId);
    setExtendForm({
      name: season.name,
      startDate: season.startDate.slice(0, 10),
      endDate: season.endDate.slice(0, 10),
    });
  }

  async function saveExtend() {
    if (extendingSeasonId === null || !extendForm) return;
    setSavingExtend(true);
    try {
      const res = await fetch(`/api/safari-rates/seasons/${extendingSeasonId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extendForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to extend season');
      }
      setExtendingSeasonId(null);
      setExtendForm(null);
      setSeasons(prev => prev.map(s => s.id === extendingSeasonId ? { ...s, ...extendForm } : s));
      search();
    } catch (err: any) { alert(err.message); }
    finally { setSavingExtend(false); }
  }

  function cancelExtend() {
    setExtendingSeasonId(null);
    setExtendForm(null);
  }

  // --- Edit hotel (name + destination) ---
  function startEditHotel(hotelId: number, name: string, countyId: number) {
    setEditingHotelId(hotelId);
    setHotelEditForm({ name, countyId: String(countyId) });
  }

  async function saveHotelEdit() {
    if (editingHotelId === null || !hotelEditForm) return;
    setSavingHotel(true);
    try {
      const res = await fetch(`/api/safari-rates/hotels/${editingHotelId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hotelEditForm.name, countyId: Number(hotelEditForm.countyId) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update hotel');
      }
      setEditingHotelId(null);
      setHotelEditForm(null);
      // Refresh hotels list so destination change shows
      const data = await fetch('/api/safari-rates/hotels').then(r => r.json());
      if (Array.isArray(data)) setAllHotels(data);
      search();
    } catch (err: any) { alert(err.message); }
    finally { setSavingHotel(false); }
  }

  async function deleteHotel(hotelId: number) {
    if (!confirm('Delete this hotel? This will also delete all its room types, seasons, and rates.')) return;
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete hotel');
      setAllHotels(prev => prev.filter(h => h.id !== hotelId));
      search();
    } catch (err: any) { alert(err.message); }
  }

  function cancelHotelEdit() {
    setEditingHotelId(null);
    setHotelEditForm(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏨 Safari Rates — Search</h1>
          <p className="text-gray-500 text-sm">Contract rates across Kenya destinations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/safari-rates/hotels" className="btn-secondary text-sm">Manage Hotels</Link>
          <Link href="/dashboard/safari-rates/prices" className="btn-secondary text-sm">Enter Prices</Link>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="label">Destination</label>
            <select className="input" value={form.county} onChange={e => setForm(f => ({...f, county: e.target.value}))}>
              <option value="">All destinations</option>
              {counties.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 relative">
            <label className="label">Hotel name (partial)</label>
            <input
              ref={hotelInputRef}
              type="text"
              className="input"
              value={form.hotel}
              onChange={e => setForm(f => ({...f, hotel: e.target.value}))}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Type to search hotel..."
              autoComplete="off"
            />
            {showSuggestions && filteredHotels.length > 0 && (
              <div
                ref={suggestionRef}
                className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded shadow-lg"
              >
                {filteredHotels.map(h => (
                  <div
                    key={h.id}
                    className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                    onClick={() => {
                      setForm(f => ({...f, hotel: h.name}));
                      setShowSuggestions(false);
                    }}
                  >
                    {h.name} <span className="text-gray-400 text-xs">({h.county.name})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Check-in</label>
            <input type="date" className="input" value={form.checkin} onChange={e => setForm(f => ({...f, checkin: e.target.value}))} />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input type="date" className="input" value={form.checkout} onChange={e => setForm(f => ({...f, checkout: e.target.value}))} />
          </div>
          <div>
            <label className="label">Board Basis</label>
            <select className="input" value={form.board} onChange={e => setForm(f => ({...f, board: e.target.value}))}>
              <option value="">All</option>
              {Object.entries(BOARD).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <button onClick={search} disabled={loading} className="btn-primary">
              {loading ? 'Searching…' : '🔍 Search'}
            </button>
            {searched && (
              <select
                className="input w-48"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'price_asc' | 'price_desc')}
              >
                <option value="price_asc">Cheapest first (by min rate)</option>
                <option value="price_desc">Most expensive first</option>
              </select>
            )}
          </div>
          {nights > 0 && <p className="text-xs text-orange-600">📅 {nights} night{nights!==1?'s':''} selected</p>}
        </div>
      </div>

      {searched && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {results.length} rate{results.length!==1?'s':''} across {Object.keys(grouped).length} hotel{Object.keys(grouped).length!==1?'s':''}
          </p>
          {Object.keys(grouped).length === 0 && (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏕️</p>
              <p>No rates found. Try fewer filters.</p>
            </div>
          )}
          <div className="space-y-4">
            {sortedHotelKeys.map(key => {
              const prices = grouped[key];
              const hotel = prices[0].roomType.hotel;
              const minRate = Math.min(...prices.map(p => p.ratePerPersonSharing ?? Infinity));
              const hotelRooms = roomTypes.filter(r => r.hotelId === hotel.id);
              const hotelSeasons = seasons.filter(s => s.hotelId === hotel.id);
              const isAdding = addingKey === key;
              return (
                <div key={key} className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{hotel.name}</h3>
                        {hotel.category && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{hotel.category}</span>}
                      </div>
                      <p className="text-sm text-gray-500">
                        {hotel.county.name}{hotel.stars ? ` · ${'★'.repeat(hotel.stars)}` : ''}
                        {minRate !== Infinity && <span className="ml-2 text-xs text-orange-600 font-mono">from {fmt(minRate, prices[0].currency)}</span>}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isAdding ? (
                        <button onClick={cancelAdd} className="text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                      ) : (
                        <button onClick={() => startAdd(key)} className="text-xs text-orange-500 hover:underline">+ Add Rate</button>
                      )}
                      {editingHotelId !== hotel.id && (
                        <>
                          <button onClick={() => startEditHotel(hotel.id, hotel.name, hotel.county.id)} className="text-blue-500 hover:underline text-xs">✏️ Edit Hotel</button>
                          <button onClick={() => deleteHotel(hotel.id)} className="text-red-500 hover:text-red-700 text-xs">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Room Type','Season','Period','Board','Per Person Sharing','Single','Child','Third Adult', nights>0?`${nights}N Total`:'','Actions'].filter(Boolean).map(h => (
                          <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prices.map(p => {
                        const isEditing = editingId === p.id;
                        const period = `${new Date(p.season.startDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})} – ${new Date(p.season.endDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}`;
                        return (
                          <tr key={p.id} className="hover:bg-orange-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{p.roomType.name}</td>
                            <td className="px-4 py-2.5 text-orange-600 font-medium">{p.season.name}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{period}</td>
                            <td className="px-4 py-2.5 text-gray-600">{BOARD[p.boardBasis] || p.boardBasis}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-gray-800">{fmt(p.ratePerPersonSharing, p.currency)}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-600">{fmt(p.singleRoomRate, p.currency)}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500">{fmt(p.childRate, p.currency)}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500">{fmt(p.thirdAdultRate, p.currency)}</td>
                            {nights > 0 && (
                              <td className="px-4 py-2.5 font-mono font-bold text-green-700">
                                {p.ratePerPersonSharing ? `${p.currency} ${(p.ratePerPersonSharing * nights).toLocaleString()}` : '—'}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-xs">
                              <button onClick={() => startEdit(p)} className="text-orange-500 hover:underline font-medium mr-2">Edit</button>
                              <button onClick={() => startExtend(p.season.id)} className="text-purple-600 hover:underline font-medium mr-2">Extend Season</button>
                              <button onClick={() => deletePrice(p.id)} disabled={deletingId === p.id} className="text-red-500 hover:text-red-700 font-medium">
                                {deletingId === p.id ? '…' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {extendingSeasonId !== null && extendForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelExtend} />
                      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Extend Season</h3>
                          <button onClick={cancelExtend} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                          Creates a new season with new start/end dates and copies all existing rates over unchanged.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="label text-xs block mb-1">New Season Name</label>
                            <input className="input input-sm" value={extendForm.name} onChange={e => setExtendForm({ ...extendForm, name: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="label text-xs block mb-1">Start Date</label>
                              <input type="date" className="input input-sm" value={extendForm.startDate} onChange={e => setExtendForm({ ...extendForm, startDate: e.target.value })} />
                            </div>
                            <div>
                              <label className="label text-xs block mb-1">End Date</label>
                              <input type="date" className="input input-sm" value={extendForm.endDate} onChange={e => setExtendForm({ ...extendForm, endDate: e.target.value })} />
                            </div>
                          </div>
                          <div className="pt-4 flex gap-2">
                            <button onClick={saveExtend} disabled={savingExtend} className="btn-primary text-sm py-1.5 flex-1 w-full">
                              {savingExtend ? 'Extending…' : 'Extend Season'}
                            </button>
                            <button onClick={cancelExtend} className="btn-secondary text-sm py-1.5 w-full">Cancel</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Rate Popup */}
      {editingId !== null && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelEdit} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Rate</h3>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {(() => {
              const editingPrice = results.find(p => p.id === editingId);
              const editHotel = editingPrice?.roomType.hotel;
              const editRooms = roomTypes.filter(r => r.hotelId === editHotel?.id);
              const editSeasons = seasons.filter(s => s.hotelId === editHotel?.id);
              const selSeason = editSeasons.find(s => s.id === Number(editForm.seasonId));
              const editPeriod = selSeason
                ? `${new Date(selSeason.startDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})} – ${new Date(selSeason.endDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}`
                : '';
              return (
                <>
              <p className="text-sm text-gray-500 mb-4">
                {editingPrice?.roomType.name} · {editingPrice?.season.name}{editHotel ? ` · ${editHotel.name}` : ''}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="label text-xs block mb-1">Room Type</label>
                  <select className="input input-sm" value={editForm.roomTypeId} onChange={e => setEditForm({ ...editForm, roomTypeId: e.target.value })}>
                    <option value="new">+ Create new room type…</option>
                    {editRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {editForm.roomTypeId === 'new' && (
                    <div className="mt-2 space-y-2">
                      <input type="text" placeholder="New room type name" className="input input-sm" value={editForm.newRoomName} onChange={e => setEditForm({ ...editForm, newRoomName: e.target.value })} />
                      <input type="number" min={1} placeholder="Max occupancy" className="input input-sm w-24" value={editForm.newRoomMaxOccupancy} onChange={e => setEditForm({ ...editForm, newRoomMaxOccupancy: e.target.value })} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="label text-xs block mb-1">Season</label>
                  <select className="input input-sm" value={editForm.seasonId} onChange={e => setEditForm({ ...editForm, seasonId: e.target.value })}>
                    <option value="new">+ Create new season…</option>
                    {editSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {editForm.seasonId === 'new' && (
                    <div className="mt-2 space-y-2">
                      <input type="text" placeholder="New season name" className="input input-sm" value={editForm.newSeasonName} onChange={e => setEditForm({ ...editForm, newSeasonName: e.target.value })} />
                      <div className="flex gap-2">
                        <input type="date" placeholder="Start" className="input input-sm" value={editForm.newSeasonStart} onChange={e => setEditForm({ ...editForm, newSeasonStart: e.target.value })} />
                        <input type="date" placeholder="End" className="input input-sm" value={editForm.newSeasonEnd} onChange={e => setEditForm({ ...editForm, newSeasonEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Board</label>
                    <select className="input input-sm" value={editForm.boardBasis} onChange={e => setEditForm({ ...editForm, boardBasis: e.target.value })}>
                      {Object.entries(BOARD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Period</label>
                    <input type="text" className="input input-sm" value={editPeriod} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Per Person Sharing</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={editForm.ratePerPersonSharing} onChange={e => setEditForm({ ...editForm, ratePerPersonSharing: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Single</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={editForm.singleRoomRate} onChange={e => setEditForm({ ...editForm, singleRoomRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Child</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={editForm.childRate} onChange={e => setEditForm({ ...editForm, childRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Third Adult</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={editForm.thirdAdultRate} onChange={e => setEditForm({ ...editForm, thirdAdultRate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Currency</label>
                    <select className="input input-sm" value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })}>
                      <option>USD</option><option>KES</option><option>EUR</option>
                    </select>
                  </div>
                  <div className="pt-5">
                    <button onClick={saveEdit} disabled={savingEdit} className="btn-primary text-sm py-1.5 flex-1 w-full">
                      {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-800 underline">Cancel</button>
                </div>
              </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit Hotel Popup */}
      {editingHotelId !== null && hotelEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelHotelEdit} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Hotel</h3>
              <button onClick={cancelHotelEdit} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label text-xs block mb-1">Hotel Name</label>
                <input
                  className="input input-sm"
                  value={hotelEditForm.name}
                  onChange={e => setHotelEditForm({ ...hotelEditForm, name: e.target.value })}
                  placeholder="Hotel name"
                />
              </div>
              <div>
                <label className="label text-xs block mb-1">Destination (County)</label>
                <select className="input input-sm" value={hotelEditForm.countyId} onChange={e => setHotelEditForm({ ...hotelEditForm, countyId: e.target.value })}>
                  {counties.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-2">
                <button onClick={saveHotelEdit} disabled={savingHotel} className="btn-primary text-sm py-1.5 flex-1 w-full">
                  {savingHotel ? 'Saving…' : 'Save Hotel'}
                </button>
                <button onClick={cancelHotelEdit} className="btn-secondary text-sm py-1.5 w-full">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Rate Popup */}
      {addingKey !== null && addForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelAdd} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Rate</h3>
              <button onClick={cancelAdd} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {(() => {
              const addingPrice = results.find(p => `${p.roomType.hotel.county.name}__${p.roomType.hotel.name}` === addingKey);
              const addHotel = addingPrice?.roomType.hotel;
              const addRooms = roomTypes.filter(r => r.hotelId === addHotel?.id);
              const addSeasons = seasons.filter(s => s.hotelId === addHotel?.id);
              return (
                <>
              <p className="text-sm text-gray-500 mb-4">Hotel: {addHotel?.name}</p>
              <div className="space-y-3">
                <div>
                  <label className="label text-xs block mb-1">Room Type</label>
                  <select className="input input-sm" value={addForm.roomTypeId} onChange={e => setAddForm({ ...addForm, roomTypeId: e.target.value })}>
                    <option value="new">+ Create new room type…</option>
                    {addRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {addForm.roomTypeId === 'new' && (
                    <div className="mt-2 space-y-2">
                      <input type="text" placeholder="New room type name" className="input input-sm" value={addForm.newRoomName} onChange={e => setAddForm({ ...addForm, newRoomName: e.target.value })} />
                      <input type="number" min={1} placeholder="Max occupancy" className="input input-sm w-24" value={addForm.newRoomMaxOccupancy} onChange={e => setAddForm({ ...addForm, newRoomMaxOccupancy: e.target.value })} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="label text-xs block mb-1">Season</label>
                  <select className="input input-sm" value={addForm.seasonId} onChange={e => setAddForm({ ...addForm, seasonId: e.target.value })}>
                    <option value="new">+ Create new season…</option>
                    {addSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {addForm.seasonId === 'new' && (
                    <div className="mt-2 space-y-2">
                      <input type="text" placeholder="New season name" className="input input-sm" value={addForm.newSeasonName} onChange={e => setAddForm({ ...addForm, newSeasonName: e.target.value })} />
                      <div className="flex gap-2">
                        <input type="date" placeholder="Start" className="input input-sm" value={addForm.newSeasonStart} onChange={e => setAddForm({ ...addForm, newSeasonStart: e.target.value })} />
                        <input type="date" placeholder="End" className="input input-sm" value={addForm.newSeasonEnd} onChange={e => setAddForm({ ...addForm, newSeasonEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Board</label>
                    <select className="input input-sm" value={addForm.boardBasis} onChange={e => setAddForm({ ...addForm, boardBasis: e.target.value })}>
                      {Object.entries(BOARD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="pt-5 flex items-end">
                    <button onClick={saveAdd} disabled={savingAdd} className="btn-primary text-sm py-1.5 w-full">
                      {savingAdd ? 'Adding…' : 'Add Rate'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Per Person Sharing</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={addForm.ratePerPersonSharing} onChange={e => setAddForm({ ...addForm, ratePerPersonSharing: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Single</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={addForm.singleRoomRate} onChange={e => setAddForm({ ...addForm, singleRoomRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Child</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={addForm.childRate} onChange={e => setAddForm({ ...addForm, childRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Third Adult</label>
                    <input type="number" min={0} step="0.01" className="input input-sm font-mono" value={addForm.thirdAdultRate} onChange={e => setAddForm({ ...addForm, thirdAdultRate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Currency</label>
                    <select className="input input-sm" value={addForm.currency} onChange={e => setAddForm({ ...addForm, currency: e.target.value })}>
                      <option>USD</option><option>KES</option><option>EUR</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button onClick={cancelAdd} className="text-xs text-gray-500 hover:text-gray-800 underline">Cancel</button>
                  </div>
                </div>
              </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
