'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tour { id: string; title: string; durationDays: number; durationNights: number; }
interface RateCard {
  id: string; season: string; currency: string;
  basedOn2: number; basedOn4: number; basedOn6: number; basedOn8: number;
  basedOn10?: number|null; basedOn12?: number|null; markupPercent: number;
}
interface Client { id: string; name: string; agentId?: string|null; agent?: { id: string; name: string; company?: string|null }|null; }
interface Agent  { id: string; name: string; company?: string|null; }
interface Booking { id: string; bookingRef: string; clientId: string; client: { name: string }; tourPackageId?: string|null; }
interface Hotel { id: number; name: string; stars?: number|null; county: { name: string }; }
interface RoomPrice { id: number; ratePerPersonSharing?: number|null; singleRoomRate?: number|null; childRate?: number|null; currency: string; roomType: { id: number; name: string; maxOccupancy: number }; season: { name: string }; }
interface Props { tours: Tour[]; rateCards: (RateCard & { tourPackage: Tour })[]; clients?: Client[]; agents?: Agent[]; bookings?: Booking[]; hotels?: Hotel[]; }

interface DayRow {
  destination: string;
  // Hotel
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  // Rates per person
  adultCostPP: number;
  childCostPP: number;
  parkFeeAdultPP: number;
  parkFeeChildPP: number;
  transportPP: number;
  // Available rates from DB
  availableRates: RoomPrice[];
  ratesLoading: boolean;
}

const BOARD_BASIS = [
  { code: 'FB', label: 'Full Board' },
  { code: 'HB', label: 'Half Board' },
  { code: 'BB', label: 'Bed & Breakfast' },
  { code: 'RO', label: 'Room Only' },
];

function emptyRow(): DayRow {
  return { destination:'', hotelId:'', hotelName:'', roomTypeId:'', roomTypeName:'', adultCostPP:0, childCostPP:0, parkFeeAdultPP:0, parkFeeChildPP:0, transportPP:0, availableRates:[], ratesLoading:false };
}

function fmt2(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function RateCalculator({ tours, rateCards, clients = [], agents = [], bookings = [], hotels = [] }: Props) {
  // ── Linking fields ──────────────────────────────────────────────────────────
  const [clientId,   setClientId]   = useState('');
  const [agentId,    setAgentId]    = useState('');
  const [bookingId,  setBookingId]  = useState('');
  const [tourId,     setTourId]     = useState('');

  // ── Core settings ───────────────────────────────────────────────────────────
  const [numAdults,   setNumAdults]   = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [numDays,     setNumDays]     = useState(1);
  const [numNights,   setNumNights]   = useState(0);
  const [currency,    setCurrency]    = useState('USD');
  const [markup,      setMarkup]      = useState(10);
  const [boardBasis,  setBoardBasis]  = useState('FB');
  const [startDate,   setStartDate]   = useState('');

  // ── Day rows ────────────────────────────────────────────────────────────────
  const [dayRows, setDayRows] = useState<DayRow[]>([emptyRow()]);

  // ── Global extras ───────────────────────────────────────────────────────────
  const [fileHandling,      setFileHandling]      = useState(0);
  const [ecoBottle,         setEcoBottle]         = useState(0);
  const [evacInsurance,     setEvacInsurance]     = useState(0);
  const [extraItems,        setExtraItems]        = useState<{label:string;cost:number}[]>([]);
  const [maasaiVillage,     setMaasaiVillage]     = useState(false);
  const [maasaiCost,        setMaasaiCost]        = useState(30);
  // Transfers & flight
  const [arrivalTransfer,   setArrivalTransfer]   = useState(false);
  const [arrivalCostPP,     setArrivalCostPP]     = useState(0);
  const [departureTransfer, setDepartureTransfer] = useState(false);
  const [departureCostPP,   setDepartureCostPP]   = useState(0);
  const [includeFlight,     setIncludeFlight]     = useState(false);
  const [flightCostPP,      setFlightCostPP]      = useState(0);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [saveError, setSaveError] = useState('');

  const numPax = numAdults + numChildren;

  // ── Auto-fill from tour ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = tours.find(t => t.id === tourId);
    if (t) {
      setNumDays(t.durationDays);
      setNumNights(t.durationNights);
      setDayRows(Array.from({ length: t.durationDays }, () => emptyRow()));
    }
  }, [tourId, tours]);

  // ── Sync rows when days change ──────────────────────────────────────────────
  useEffect(() => {
    setDayRows(prev => {
      if (prev.length === numDays) return prev;
      return Array.from({ length: numDays }, (_, i) => prev[i] || emptyRow());
    });
  }, [numDays]);

  // ── Auto-fill from booking ──────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    setClientId(b.clientId);
    if (b.tourPackageId) setTourId(b.tourPackageId);
    const c = clients.find(c => c.id === b.clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [bookingId, bookings, clients]);

  // ── Auto-fill agent from client ─────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find(c => c.id === clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [clientId, clients]);

  // ── Row updater ─────────────────────────────────────────────────────────────
  function updateRow(i: number, patch: Partial<DayRow>) {
    setDayRows(prev => prev.map((r, j) => j === i ? { ...r, ...patch } : r));
  }

  // ── Fetch hotel rates for a row ─────────────────────────────────────────────
  const fetchRates = useCallback(async (i: number, hotelId: string, board: string, date?: string) => {
    if (!hotelId) return;
    updateRow(i, { ratesLoading: true, availableRates: [] });
    try {
      const url = `/api/safari-rates/lookup?hotelId=${hotelId}&boardBasis=${board}${date ? `&date=${date}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      updateRow(i, { ratesLoading: false, availableRates: data.prices || [] });
    } catch {
      updateRow(i, { ratesLoading: false });
    }
  }, []);

  // ── When hotel or board changes on a row, fetch rates ──────────────────────
  function onHotelChange(i: number, hotelId: string) {
    const h = hotels.find(h => String(h.id) === hotelId);
    const dayDate = startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined;
    updateRow(i, { hotelId, hotelName: h?.name || '', roomTypeId: '', roomTypeName: '', adultCostPP: 0, childCostPP: 0 });
    if (hotelId) fetchRates(i, hotelId, boardBasis, dayDate);
  }

  function onRoomTypeSelect(i: number, priceId: string) {
    const row = dayRows[i];
    const price = row.availableRates.find(p => String(p.id) === priceId);
    if (!price) return;
    updateRow(i, {
      roomTypeId:   String(price.roomType.id),
      roomTypeName: price.roomType.name,
      adultCostPP:  price.ratePerPersonSharing || 0,
      childCostPP:  price.childRate || 0,
    });
  }

  // ── Calculations ────────────────────────────────────────────────────────────
  const adultPropertyTotal   = dayRows.reduce((s, r) => s + r.adultCostPP * numAdults, 0);
  const childPropertyTotal   = dayRows.reduce((s, r) => s + r.childCostPP * numChildren, 0);
  const adultParkTotal       = dayRows.reduce((s, r) => s + r.parkFeeAdultPP * numAdults, 0);
  const childParkTotal       = dayRows.reduce((s, r) => s + r.parkFeeChildPP * numChildren, 0);
  const transportTotal       = dayRows.reduce((s, r) => s + r.transportPP * numPax, 0);
  const totalExtras          = extraItems.reduce((s, e) => s + e.cost, 0);
  const maasaiTotal          = maasaiVillage ? maasaiCost * numPax : 0;
  const arrivalTotal         = arrivalTransfer   ? arrivalCostPP   * numPax : 0;
  const departureTotal       = departureTransfer ? departureCostPP * numPax : 0;
  const flightTotal          = includeFlight     ? flightCostPP    * numPax : 0;

  const subtotal = adultPropertyTotal + childPropertyTotal + adultParkTotal + childParkTotal +
    transportTotal + fileHandling + ecoBottle + evacInsurance + totalExtras +
    maasaiTotal + arrivalTotal + departureTotal + flightTotal;

  const markupAmt   = subtotal * (markup / 100);
  const grandTotal  = subtotal + markupAmt;
  const perAdult    = numAdults   > 0 ? grandTotal / numPax : 0;  // simplified: share equally
  const perChild    = numChildren > 0 ? grandTotal / numPax * 0.5 : 0; // children at 50% — adjust as needed

  const selectedTour    = tours.find(t => t.id === tourId);
  const selectedClient  = clients.find(c => c.id === clientId);
  const selectedAgent   = agents.find(a => a.id === agentId);
  const selectedBooking = bookings.find(b => b.id === bookingId);

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaved(false); setSaveError('');
    const payload = {
      bookingId:  bookingId  || null,
      clientId:   clientId   || null,
      agentId:    agentId    || null,
      bookingRef: selectedBooking?.bookingRef || null,
      tourTitle:  selectedTour?.title || 'Custom Tour',
      days:       numDays,
      numAdults,
      numChildren,
      numPax,
      boardBasis,
      currency,
      dayRows: dayRows.map(r => ({
        destination: r.destination,
        hotelName:   r.hotelName,
        roomTypeName:r.roomTypeName,
        adultCostPP: r.adultCostPP,
        childCostPP: r.childCostPP,
        parkFeeAdultPP: r.parkFeeAdultPP,
        parkFeeChildPP: r.parkFeeChildPP,
        transportPP: r.transportPP,
      })),
      fileHandlingFee:   fileHandling,
      ecoBottle,
      evacInsurance,
      arrivalTransfer:   arrivalTransfer   ? arrivalCostPP   * numPax : 0,
      departureTransfer: departureTransfer ? departureCostPP * numPax : 0,
      flightCostPP:      includeFlight ? flightCostPP : 0,
      extras:      extraItems.filter(e => e.cost > 0),
      maasaiVillage,
      maasaiCost,
      subtotal,
      markupPercent: markup,
      markupAmount:  markupAmt,
      totalCost:     grandTotal,
      perAdultCost:  perAdult,
      perChildCost:  perChild,
    };

    const res = await fetch('/api/cost-sheets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) { setSaved(true); setSaving(false); }
    else { const d = await res.json(); setSaveError(d.error || 'Save failed'); setSaving(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            💰 Cost Calculator
            <span className="text-sm font-normal text-gray-500">— linked costing sheet</span>
          </h2>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm px-5">
            {saving ? 'Saving…' : '💾 Save Costing Sheet'}
          </button>
        </div>

        {saved    && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">✓ Costing sheet saved{selectedClient ? ` and linked to ${selectedClient.name}` : ''}.</div>}
        {saveError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{saveError}</div>}

        {/* ── Section 1: Link to Client / Booking ── */}
        <div className="bg-white rounded-xl border border-orange-100 p-4 mb-5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">🔗 Link to Client / Booking</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Agent</label>
              <select className="input text-sm" value={agentId} onChange={e => setAgentId(e.target.value)}>
                <option value="">— No agent —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.company ? ` (${a.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Client *</label>
              <select className="input text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {(agentId
                  ? clients.filter(c => c.agentId === agentId)
                  : clients
                ).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {agentId && clients.filter(c => c.agentId === agentId).length === 0 && (
                <p className="text-xs text-gray-400 mt-0.5">No clients for this agent</p>
              )}
            </div>
            <div>
              <label className="label text-xs">Booking (optional)</label>
              <select className="input text-sm" value={bookingId} onChange={e => setBookingId(e.target.value)}>
                <option value="">— Standalone —</option>
                {(clientId
                  ? bookings.filter(b => b.clientId === clientId)
                  : bookings
                ).map(b => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Tour Package</label>
              <select className="input text-sm" value={tourId} onChange={e => setTourId(e.target.value)}>
                <option value="">— Manual —</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>
          {(selectedClient || selectedAgent || selectedBooking) && (
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {selectedAgent   && <span>🤝 Agent: <strong>{selectedAgent.name}</strong>{selectedAgent.company ? ` — ${selectedAgent.company}` : ''}</span>}
              {selectedClient  && <span>👤 Client: <strong>{selectedClient.name}</strong></span>}
              {selectedBooking && <span>📋 Booking: <strong>{selectedBooking.bookingRef}</strong></span>}
            </div>
          )}
        </div>

        {/* ── Section 2: Core settings ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          <div>
            <label className="label text-xs">Adults *</label>
            <input type="number" min={1} value={numAdults} onChange={e => setNumAdults(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label text-xs">Children</label>
            <input type="number" min={0} value={numChildren} onChange={e => setNumChildren(Number(e.target.value))} className="input" />
            <p className="text-xs text-gray-400 mt-0.5">Total pax: {numPax}</p>
          </div>
          <div>
            <label className="label text-xs">Days *</label>
            <input type="number" min={1} value={numDays} onChange={e => setNumDays(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label text-xs">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label text-xs">Board Basis</label>
            <select className="input" value={boardBasis} onChange={e => setBoardBasis(e.target.value)}>
              {BOARD_BASIS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Currency</label>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {['USD','KES','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Markup %</label>
            <input type="number" min={0} max={100} value={markup} onChange={e => setMarkup(Number(e.target.value))} className="input" />
          </div>
        </div>

        {/* ── Section 3: Day-by-day table ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">🏕 Properties & Costs — Day by Day</h3>
            <p className="text-xs text-gray-400">Select hotel to auto-fill rates from database</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-orange-100">
            <table className="w-full text-xs">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-8">Day</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Destination</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Hotel / Accommodation</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-36">Room Type</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Adult/pp<br/><span className="text-gray-400 font-normal">({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Child/pp<br/><span className="text-gray-400 font-normal">({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Park Fee Adult<br/><span className="text-gray-400 font-normal">({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Park Fee Child<br/><span className="text-gray-400 font-normal">({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Transport/pp<br/><span className="text-gray-400 font-normal">({currency})</span></th>
                  <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">Day Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dayDate = startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined;
                  const adultDayTotal = (row.adultCostPP + row.parkFeeAdultPP) * numAdults;
                  const childDayTotal = (row.childCostPP + row.parkFeeChildPP) * numChildren;
                  const transportDayTotal = row.transportPP * numPax;
                  const dayTotal = adultDayTotal + childDayTotal + transportDayTotal;

                  return (
                    <tr key={i} className="hover:bg-orange-50/40">
                      {/* Day number */}
                      <td className="px-2 py-2">
                        <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i+1}</span>
                        {dayDate && <p className="text-gray-400 text-xs mt-0.5">{new Date(dayDate).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}</p>}
                      </td>

                      {/* Destination */}
                      <td className="px-2 py-2">
                        <input value={row.destination} onChange={e => updateRow(i, { destination: e.target.value })}
                          className="input py-1 text-xs w-full" placeholder="e.g. Masai Mara" />
                      </td>

                      {/* Hotel picker */}
                      <td className="px-2 py-2">
                        <select
                          className="input py-1 text-xs w-full"
                          value={row.hotelId}
                          onChange={e => onHotelChange(i, e.target.value)}
                        >
                          <option value="">— Search hotel —</option>
                          {hotels.map(h => (
                            <option key={h.id} value={h.id}>
                              {h.name} · {h.county.name}{h.stars ? ` ${'★'.repeat(h.stars)}` : ''}
                            </option>
                          ))}
                        </select>
                        {!row.hotelId && (
                          <input value={row.hotelName} onChange={e => updateRow(i, { hotelName: e.target.value })}
                            className="input py-1 text-xs w-full mt-1" placeholder="Or type name manually" />
                        )}
                      </td>

                      {/* Room type — populated from hotel rates */}
                      <td className="px-2 py-2">
                        {row.ratesLoading ? (
                          <div className="text-xs text-orange-500 flex items-center gap-1">
                            <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                            Loading…
                          </div>
                        ) : row.availableRates.length > 0 ? (
                          <select
                            className="input py-1 text-xs w-full"
                            value={String(row.roomTypeId)}
                            onChange={e => onRoomTypeSelect(i, e.target.value)}
                          >
                            <option value="">— Select room —</option>
                            {row.availableRates.map(p => (
                              <option key={p.id} value={String(p.id)}>
                                {p.roomType.name} — {currency} {p.ratePerPersonSharing ?? '?'}/pp
                                {p.childRate ? ` | Child: ${p.childRate}` : ''}
                                {p.season?.name ? ` (${p.season.name})` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input value={row.roomTypeName} onChange={e => updateRow(i, { roomTypeName: e.target.value })}
                            className="input py-1 text-xs w-full" placeholder="Room type" />
                        )}
                      </td>

                      {/* Adult cost/pp */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.adultCostPP || ''}
                          onChange={e => updateRow(i, { adultCostPP: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        <p className="text-gray-400 text-xs text-center">× {numAdults} = {fmt2(row.adultCostPP * numAdults)}</p>
                      </td>

                      {/* Child cost/pp */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.childCostPP || ''}
                          onChange={e => updateRow(i, { childCostPP: Number(e.target.value) })}
                          className={`input py-1 text-xs font-mono text-center w-full ${numChildren === 0 ? 'opacity-40' : ''}`}
                          placeholder="0" disabled={numChildren === 0} />
                        {numChildren > 0 && <p className="text-gray-400 text-xs text-center">× {numChildren} = {fmt2(row.childCostPP * numChildren)}</p>}
                      </td>

                      {/* Park fee adult */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.parkFeeAdultPP || ''}
                          onChange={e => updateRow(i, { parkFeeAdultPP: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        <p className="text-gray-400 text-xs text-center">= {fmt2(row.parkFeeAdultPP * numAdults)}</p>
                      </td>

                      {/* Park fee child */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.parkFeeChildPP || ''}
                          onChange={e => updateRow(i, { parkFeeChildPP: Number(e.target.value) })}
                          className={`input py-1 text-xs font-mono text-center w-full ${numChildren === 0 ? 'opacity-40' : ''}`}
                          placeholder="0" disabled={numChildren === 0} />
                        {numChildren > 0 && <p className="text-gray-400 text-xs text-center">= {fmt2(row.parkFeeChildPP * numChildren)}</p>}
                      </td>

                      {/* Transport/pp */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.transportPP || ''}
                          onChange={e => updateRow(i, { transportPP: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        <p className="text-gray-400 text-xs text-center">= {fmt2(row.transportPP * numPax)}</p>
                      </td>

                      {/* Day total */}
                      <td className="px-2 py-2 text-right">
                        <p className="font-mono font-semibold text-gray-800 text-xs">{currency} {fmt2(dayTotal)}</p>
                        {numAdults > 0 && <p className="text-gray-400 text-xs">{fmt2(adultDayTotal / numAdults)}/adult</p>}
                        {numChildren > 0 && <p className="text-gray-400 text-xs">{fmt2(childDayTotal / numChildren)}/child</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Global extras ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="label">File Handling Fees ({currency})</label>
            <input type="number" min={0} value={fileHandling||''} onChange={e => setFileHandling(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
          <div>
            <label className="label">Eco Bottle + Water ({currency})</label>
            <input type="number" min={0} value={ecoBottle||''} onChange={e => setEcoBottle(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
          <div>
            <label className="label">Evacuation Insurance ({currency})</label>
            <input type="number" min={0} value={evacInsurance||''} onChange={e => setEvacInsurance(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
        </div>

        {/* ── Section 5: Transfers & Flight ── */}
        <div className="border border-orange-100 rounded-xl p-4 mb-5 space-y-3 bg-white">
          <p className="text-sm font-semibold text-gray-700">Transfers & Flight</p>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
              <input type="checkbox" checked={arrivalTransfer} onChange={e => setArrivalTransfer(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium text-gray-700">Arrival Transfer (Day 1)</span>
            </label>
            {arrivalTransfer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{currency}/pp:</span>
                <input type="number" min={0} step="0.01" value={arrivalCostPP||''} onChange={e => setArrivalCostPP(Number(e.target.value))}
                  className="input w-28 font-mono text-sm" placeholder="0" />
                <span className="text-xs text-gray-400">= {fmt2(arrivalCostPP * numPax)} total</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
              <input type="checkbox" checked={departureTransfer} onChange={e => setDepartureTransfer(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium text-gray-700">Departure Transfer (Last Day)</span>
            </label>
            {departureTransfer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{currency}/pp:</span>
                <input type="number" min={0} step="0.01" value={departureCostPP||''} onChange={e => setDepartureCostPP(Number(e.target.value))}
                  className="input w-28 font-mono text-sm" placeholder="0" />
                <span className="text-xs text-gray-400">= {fmt2(departureCostPP * numPax)} total</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
              <input type="checkbox" checked={includeFlight} onChange={e => setIncludeFlight(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium text-gray-700">✈️ Flight Cost/pp</span>
            </label>
            {includeFlight && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{currency}/pp:</span>
                <input type="number" min={0} step="0.01" value={flightCostPP||''} onChange={e => setFlightCostPP(Number(e.target.value))}
                  className="input w-28 font-mono text-sm" placeholder="0" />
                <span className="text-xs text-gray-400">= {fmt2(flightCostPP * numPax)} total</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 6: Optional extras ── */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-orange-100">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={maasaiVillage} onChange={e => setMaasaiVillage(e.target.checked)} className="rounded" />
            Maasai Village (optional)
          </label>
          {maasaiVillage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{currency}/pp:</span>
              <input type="number" min={0} value={maasaiCost} onChange={e => setMaasaiCost(Number(e.target.value))}
                className="input w-24 text-xs py-1.5 font-mono" />
              <span className="text-xs text-gray-400">= {fmt2(maasaiCost * numPax)} total</span>
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Additional Extras</label>
            <button type="button" onClick={() => setExtraItems(p => [...p, {label:'',cost:0}])} className="text-orange-500 text-xs hover:underline">+ Add Item</button>
          </div>
          {extraItems.map((ex, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={ex.label} onChange={e => setExtraItems(p => p.map((x,j) => j===i ? {...x,label:e.target.value} : x))}
                className="input flex-1 text-sm" placeholder="Description" />
              <input type="number" min={0} value={ex.cost||''} onChange={e => setExtraItems(p => p.map((x,j) => j===i ? {...x,cost:Number(e.target.value)} : x))}
                className="input w-32 font-mono text-sm" placeholder={currency} />
              <button type="button" onClick={() => setExtraItems(p => p.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
            </div>
          ))}
        </div>

        {/* ── Section 7: Results ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-orange-100">
            <p className="font-semibold text-gray-700 mb-4 text-sm">Cost Breakdown — {numAdults} adult{numAdults!==1?'s':''}{numChildren>0?`, ${numChildren} child${numChildren!==1?'ren':''}`:''}  ({numPax} pax)</p>
            <div className="space-y-2 text-sm">
              {[
                { label: `Accommodation — Adults (${numAdults}×)`,  value: adultPropertyTotal },
                ...(numChildren > 0 ? [{ label: `Accommodation — Children (${numChildren}×)`, value: childPropertyTotal }] : []),
                { label: `Park Fees — Adults`,                        value: adultParkTotal },
                ...(numChildren > 0 ? [{ label: `Park Fees — Children`,               value: childParkTotal    }] : []),
                { label: 'Transport (total)',                         value: transportTotal },
                ...(arrivalTransfer   ? [{ label: 'Arrival Transfer',   value: arrivalTotal   }] : []),
                ...(departureTransfer ? [{ label: 'Departure Transfer',  value: departureTotal }] : []),
                ...(includeFlight     ? [{ label: '✈️ Flight',           value: flightTotal    }] : []),
                { label: 'File Handling',                             value: fileHandling },
                { label: 'Eco Bottle + Water',                        value: ecoBottle },
                { label: 'Evacuation Insurance',                      value: evacInsurance },
                ...(maasaiVillage ? [{ label: 'Maasai Village',       value: maasaiTotal    }] : []),
                ...extraItems.filter(e => e.cost > 0).map(e => ({ label: e.label || 'Extra', value: e.cost })),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-mono text-gray-700">{currency} {fmt2(value)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="font-mono">{currency} {fmt2(subtotal)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Markup ({markup}%)</span>
                <span className="font-mono">+ {currency} {fmt2(markupAmt)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-green-700">{currency} {fmt2(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Per-person summary */}
          <div className="bg-white rounded-xl p-5 border border-orange-100 space-y-4">
            <p className="font-semibold text-gray-700 text-sm">Charge to Client</p>
            {selectedTour && <p className="text-xs text-gray-500">{selectedTour.durationDays}D / {selectedTour.durationNights}N · {boardBasis}</p>}

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Grand Total ({numPax} pax)</p>
              <p className="text-3xl font-bold text-green-700">{currency} {fmt2(grandTotal)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-600 mb-0.5">Per Adult</p>
                <p className="text-xl font-bold text-orange-600">{currency} {fmt2(perAdult)}</p>
              </div>
              {numChildren > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 mb-0.5">Per Child</p>
                  <p className="text-xl font-bold text-blue-600">{currency} {fmt2(perChild)}</p>
                </div>
              )}
            </div>

            {/* Group size comparison */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Rate per adult at different group sizes:</p>
              <div className="grid grid-cols-4 gap-1">
                {[2,4,6,8,10,12,numAdults].filter((v,i,a)=>a.indexOf(v)===i && v>0).sort((a,b)=>a-b).map(n => {
                  const pp = n > 0 ? grandTotal / n : 0;
                  const active = n === numAdults;
                  return (
                    <div key={n} className={`text-center py-2 rounded-lg text-xs ${active ? 'bg-orange-500 text-white font-bold' : 'bg-gray-50 text-gray-600'}`}>
                      <div className="font-medium">{n} adults</div>
                      <div className="font-mono">{currency} {pp.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
