'use client';
import { useState, useEffect, useCallback } from 'react';

interface Tour { id: string; title: string; durationDays: number; durationNights: number; }
interface RateCard { id: string; season: string; currency: string; basedOn2: number; basedOn4: number; basedOn6: number; basedOn8: number; basedOn10?: number|null; basedOn12?: number|null; markupPercent: number; }
interface Client { id: string; name: string; agentId?: string|null; agent?: { id: string; name: string; company?: string|null }|null; }
interface Agent  { id: string; name: string; company?: string|null; }
interface Booking { id: string; bookingRef: string; clientId: string; client: { name: string }; tourPackageId?: string|null; }
interface Hotel { id: number; name: string; stars?: number|null; county: { id: number; name: string }; }
interface RoomPrice { id: number; ratePerPersonSharing?: number|null; singleRoomRate?: number|null; childRate?: number|null; currency: string; roomType: { id: number; name: string; maxOccupancy: number }; season: { id: number; name: string; startDate: string; endDate: string }; }
interface Destination { id: number; name: string; }
interface Props { tours: Tour[]; rateCards: (RateCard & { tourPackage: Tour })[]; clients?: Client[]; agents?: Agent[]; bookings?: Booking[]; hotels?: Hotel[]; destinations?: Destination[]; }

interface DayRow {
  destinationId: number|null;
  hotelId: string;
  hotelName: string;
  // All entered as TOTALS for the full group
  adultAccomTotal: number;    // total accom cost for all adults
  childAccomTotal: number;    // total accom cost for all children
  parkFeeAdultTotal: number;  // total park fees for all adults (NO markup)
  parkFeeChildTotal: number;  // total park fees for all children (NO markup)
  transportTotal: number;     // total transport for the day (NO markup)
  hasFlight: boolean;
  flightAdultPP: number;      // flight per adult (markup applied)
  flightChildPP: number;      // flight per child (markup applied)
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
  return { destinationId: null, hotelId: '', hotelName: '', adultAccomTotal: 0, childAccomTotal: 0, parkFeeAdultTotal: 0, parkFeeChildTotal: 0, transportTotal: 0, hasFlight: false, flightAdultPP: 0, flightChildPP: 0, availableRates: [], ratesLoading: false };
}

function fmt2(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function RateCalculator({ tours, rateCards, clients = [], agents = [], bookings = [], hotels: initHotels = [], destinations: initDests = [] }: Props) {
  const [localHotels, setLocalHotels] = useState<Hotel[]>(initHotels);
  const [localDests,  setLocalDests]  = useState<Destination[]>(initDests);

  const [clientId,   setClientId]   = useState('');
  const [agentId,    setAgentId]    = useState('');
  const [bookingId,  setBookingId]  = useState('');
  const [tourId,     setTourId]     = useState('');

  const [numAdults,   setNumAdults]   = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [numDays,     setNumDays]     = useState(1);
  const [numNights,   setNumNights]   = useState(0);
  const [currency,    setCurrency]    = useState('USD');
  const [markup,      setMarkup]      = useState(10);
  const [boardBasis,  setBoardBasis]  = useState('FB');
  const [startDate,   setStartDate]   = useState('');

  const [dayRows, setDayRows] = useState<DayRow[]>([emptyRow()]);

  // Global extras — all entered as TOTAL amounts
  const [fileHandling,      setFileHandling]      = useState(0);
  const [ecoBottle,         setEcoBottle]         = useState(0);
  const [evacInsurance,     setEvacInsurance]     = useState(0);
  const [extraItems,        setExtraItems]        = useState<{label:string;cost:number}[]>([]);
  const [maasaiVillage,     setMaasaiVillage]     = useState(false);
  const [maasaiCostTotal,   setMaasaiCostTotal]   = useState(0);
  const [arrivalTransfer,   setArrivalTransfer]   = useState(false);
  const [arrivalTotal,      setArrivalTotal]      = useState(0);  // TOTAL not pp
  const [departureTransfer, setDepartureTransfer] = useState(false);
  const [departureTotal,    setDepartureTotal]    = useState(0); // TOTAL not pp

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [saveError, setSaveError] = useState('');

  const numPax = numAdults + numChildren;
  const mf = 1 + markup / 100; // markup factor

  // ── Auto-fill from tour ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = tours.find(t => t.id === tourId);
    if (t) {
      setNumDays(t.durationDays);
      setNumNights(t.durationNights);
      setDayRows(Array.from({ length: t.durationDays }, () => emptyRow()));
    }
  }, [tourId, tours]);

  useEffect(() => {
    setDayRows(prev => {
      if (prev.length === numDays) return prev;
      return Array.from({ length: numDays }, (_, i) => prev[i] || emptyRow());
    });
  }, [numDays]);

  useEffect(() => {
    if (!bookingId) return;
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    setClientId(b.clientId);
    if (b.tourPackageId) setTourId(b.tourPackageId);
    const c = clients.find(c => c.id === b.clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [bookingId, bookings, clients]);

  useEffect(() => {
    if (!clientId) return;
    const c = clients.find(c => c.id === clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [clientId, clients]);

  function updateRow(i: number, patch: Partial<DayRow>) {
    setDayRows(prev => prev.map((r, j) => j === i ? { ...r, ...patch } : r));
  }

  // ── Fetch rates matching the day's date within season ──────────────────────
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

  function dayDate(i: number) {
    if (!startDate) return undefined;
    return new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0];
  }

  function onHotelChange(i: number, hotelId: string) {
    const hotel = localHotels.find(h => String(h.id) === hotelId);
    updateRow(i, { hotelId, hotelName: hotel?.name || '', destinationId: hotel?.county?.id ?? dayRows[i].destinationId, adultAccomTotal: 0, childAccomTotal: 0 });
    if (hotelId) fetchRates(i, hotelId, boardBasis, dayDate(i));
  }

  // Auto-fill totals from selected rate (rate is per person, multiply by pax)
  function onRoomPriceSelect(i: number, priceId: string) {
    const price = dayRows[i].availableRates.find(p => String(p.id) === priceId);
    if (!price) return;
    updateRow(i, {
      adultAccomTotal: (price.ratePerPersonSharing || 0) * numAdults,
      childAccomTotal: (price.childRate || 0) * numChildren,
    });
  }

  // Re-fetch when start date or board basis changes
  useEffect(() => {
    if (!startDate) return;
    dayRows.forEach((row, i) => {
      if (row.hotelId) fetchRates(i, row.hotelId, boardBasis, dayDate(i));
    });
  }, [startDate, boardBasis]);

  const refreshData = async () => {
    const [h] = await Promise.all([fetch('/api/safari-rates/hotels').then(r => r.json())]);
    setLocalHotels(Array.isArray(h) ? h : []);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULATIONS
  // Markup applied to: accommodation, flight, file handling, eco, evac, maasai, transfers, extras
  // NO markup on: park fees, transport
  // ─────────────────────────────────────────────────────────────────────────────
  const accomAdultBase  = dayRows.reduce((s, r) => s + r.adultAccomTotal, 0);
  const accomChildBase  = dayRows.reduce((s, r) => s + r.childAccomTotal, 0);
  const parkAdultBase   = dayRows.reduce((s, r) => s + r.parkFeeAdultTotal, 0);
  const parkChildBase   = dayRows.reduce((s, r) => s + r.parkFeeChildTotal, 0);
  const transportBase   = dayRows.reduce((s, r) => s + r.transportTotal, 0);
  const flightAdultBase = dayRows.reduce((s, r) => s + (r.hasFlight ? r.flightAdultPP * numAdults : 0), 0);
  const flightChildBase = dayRows.reduce((s, r) => s + (r.hasFlight ? r.flightChildPP * numChildren : 0), 0);
  const maasaiBase      = maasaiVillage ? maasaiCostTotal : 0;
  const extrasBase      = extraItems.reduce((s, e) => s + e.cost, 0);

  // Items WITH markup
  const accomAdult  = accomAdultBase  * mf;
  const accomChild  = accomChildBase  * mf;
  const flightAdult = flightAdultBase * mf;
  const flightChild = flightChildBase * mf;
  const fileH       = fileHandling    * mf;
  const eco         = ecoBottle       * mf;
  const evac        = evacInsurance   * mf;
  const maasai      = maasaiBase      * mf;
  const arrival     = arrivalTransfer   ? arrivalTotal   * mf : 0;
  const departure   = departureTransfer ? departureTotal * mf : 0;
  const extras      = extrasBase      * mf;

  // Items WITHOUT markup (park + transport stay as-is)
  const parkAdult   = parkAdultBase;
  const parkChild   = parkChildBase;
  const transport   = transportBase;

  const grandTotal = accomAdult + accomChild + parkAdult + parkChild + transport +
    flightAdult + flightChild + fileH + eco + evac + maasai + arrival + departure + extras;

  const adultUnits = numAdults + numChildren * 0.5;
  const perAdult   = adultUnits > 0 ? grandTotal / adultUnits : 0;
  const perChild   = perAdult * 0.5;

  const selectedTour    = tours.find(t => t.id === tourId);
  const selectedClient  = clients.find(c => c.id === clientId);
  const selectedAgent   = agents.find(a => a.id === agentId);
  const selectedBooking = bookings.find(b => b.id === bookingId);

  // ── Breakdown rows for the 4-column table ──────────────────────────────────
  // [label, baseTotal, finalTotal, markupApplied]
  // pp = finalTotal / numPax
  const breakdownRows: { label: string; base: number; final: number; hasMarkup: boolean }[] = [
    { label: `Accommodation — Adults (${numAdults} pax)`, base: accomAdultBase, final: accomAdult, hasMarkup: true },
    ...(numChildren > 0 ? [{ label: `Accommodation — Children (${numChildren})`, base: accomChildBase, final: accomChild, hasMarkup: true }] : []),
    { label: `Park Fees — Adults (${numAdults} pax)`, base: parkAdultBase, final: parkAdult, hasMarkup: false },
    ...(numChildren > 0 ? [{ label: `Park Fees — Children (${numChildren})`, base: parkChildBase, final: parkChild, hasMarkup: false }] : []),
    { label: 'Transport (all days)', base: transportBase, final: transport, hasMarkup: false },
    ...(flightAdultBase > 0 ? [{ label: `Day Flights — Adults`, base: flightAdultBase, final: flightAdult, hasMarkup: true }] : []),
    ...(flightChildBase > 0 ? [{ label: `Day Flights — Children`, base: flightChildBase, final: flightChild, hasMarkup: true }] : []),
    { label: 'File Handling', base: fileHandling, final: fileH, hasMarkup: true },
    { label: 'Eco Bottle + Water', base: ecoBottle, final: eco, hasMarkup: true },
    { label: 'Evacuation Insurance', base: evacInsurance, final: evac, hasMarkup: true },
    ...(arrivalTransfer   ? [{ label: 'Arrival Transfer',   base: arrivalTotal,   final: arrival,   hasMarkup: true }] : []),
    ...(departureTransfer ? [{ label: 'Departure Transfer', base: departureTotal, final: departure, hasMarkup: true }] : []),
    ...(maasaiVillage     ? [{ label: 'Maasai Village',     base: maasaiBase,     final: maasai,    hasMarkup: true }] : []),
    ...extraItems.filter(e => e.cost > 0).map(e => ({ label: e.label || 'Extra', base: e.cost, final: e.cost * mf, hasMarkup: true })),
  ];

  const subtotalBase  = breakdownRows.reduce((s, r) => s + r.base, 0);
  const subtotalFinal = grandTotal;

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaved(false); setSaveError('');
    const payload = {
      bookingId: bookingId || null, clientId: clientId || null, agentId: agentId || null,
      bookingRef: selectedBooking?.bookingRef || null,
      tourTitle: selectedTour?.title || 'Custom Tour',
      days: numDays, numAdults, numChildren, numPax, boardBasis, currency,
      dayRows: dayRows.map(r => ({ destinationId: r.destinationId, hotelName: r.hotelName, adultAccomTotal: r.adultAccomTotal, childAccomTotal: r.childAccomTotal, parkFeeAdultTotal: r.parkFeeAdultTotal, parkFeeChildTotal: r.parkFeeChildTotal, transportTotal: r.transportTotal, hasFlight: r.hasFlight, flightAdultPP: r.flightAdultPP, flightChildPP: r.flightChildPP })),
      fileHandlingFee: fileHandling, ecoBottle, evacInsurance,
      arrivalTransfer: arrivalTotal, departureTransfer: departureTotal,
      extras: extraItems.filter(e => e.cost > 0), maasaiVillage, maasaiCost: maasaiCostTotal,
      subtotal: subtotalBase, markupPercent: markup, markupAmount: subtotalFinal - subtotalBase,
      totalCost: grandTotal, perAdultCost: perAdult, perChildCost: perChild,
    };
    const res = await fetch('/api/cost-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { setSaved(true); setSaving(false); }
    else { const d = await res.json(); setSaveError(d.error || 'Save failed'); setSaving(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-lg">💰 Cost Calculator</h2>
          <div className="flex gap-2">
            <button type="button" onClick={refreshData} className="text-xs text-blue-500 hover:underline">🔄 Refresh Hotels</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5">{saving ? 'Saving…' : '💾 Save Costing Sheet'}</button>
          </div>
        </div>

        {saved     && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">✓ Saved{selectedClient ? ` and linked to ${selectedClient.name}` : ''}.</div>}
        {saveError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{saveError}</div>}

        {/* ── Section 1: Linking ── */}
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
              <label className="label text-xs">Client</label>
              <select className="input text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {(agentId ? clients.filter(c => c.agentId === agentId) : clients).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Booking (optional)</label>
              <select className="input text-sm" value={bookingId} onChange={e => setBookingId(e.target.value)}>
                <option value="">— Standalone —</option>
                {(clientId ? bookings.filter(b => b.clientId === clientId) : bookings).map(b => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>)}
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
              {selectedAgent   && <span>🤝 <strong>{selectedAgent.name}</strong>{selectedAgent.company ? ` — ${selectedAgent.company}` : ''}</span>}
              {selectedClient  && <span>👤 <strong>{selectedClient.name}</strong></span>}
              {selectedBooking && <span>📋 <strong>{selectedBooking.bookingRef}</strong></span>}
            </div>
          )}
        </div>

        {/* ── Section 2: Settings ── */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-5">
          <div><label className="label text-xs">Adults</label><input type="number" min={1} value={numAdults} onChange={e => setNumAdults(Number(e.target.value))} className="input" /></div>
          <div><label className="label text-xs">Children</label><input type="number" min={0} value={numChildren} onChange={e => setNumChildren(Number(e.target.value))} className="input" /><p className="text-xs text-gray-400 mt-0.5">Total: {numPax}</p></div>
          <div><label className="label text-xs">Days</label><input type="number" min={1} value={numDays} onChange={e => setNumDays(Number(e.target.value))} className="input" /></div>
          <div><label className="label text-xs">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
          <div><label className="label text-xs">Board Basis</label><select className="input" value={boardBasis} onChange={e => setBoardBasis(e.target.value)}>{BOARD_BASIS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}</select></div>
          <div><label className="label text-xs">Currency</label><select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>{['USD','KES','EUR','GBP'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label text-xs">Markup %</label><input type="number" min={0} max={100} value={markup} onChange={e => setMarkup(Number(e.target.value))} className="input" /></div>
        </div>

        {/* ── Section 3: Day-by-day table ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">🏕 Day by Day — enter TOTALS for entire group</h3>
            <p className="text-xs text-gray-400">Park fees & transport: no markup applied · ✈️ checkbox = add flight this day</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-orange-100">
            <table className="w-full text-xs">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-14">Day</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Destination</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Hotel / Accommodation</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom Adults<br/><span className="text-orange-500 font-normal text-xs">total · +markup</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom Children<br/><span className="text-orange-500 font-normal text-xs">total · +markup</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Park Fees Adults<br/><span className="text-green-600 font-normal text-xs">total · no markup</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Park Fees Children<br/><span className="text-green-600 font-normal text-xs">total · no markup</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Transport<br/><span className="text-green-600 font-normal text-xs">total · no markup</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-10">✈️</th>
                  {dayRows.some(r => r.hasFlight) && <>
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Flight Adult/pp<br/><span className="text-orange-500 font-normal text-xs">+markup</span></th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Flight Child/pp<br/><span className="text-orange-500 font-normal text-xs">+markup</span></th>
                  </>}
                  <th className="px-2 py-2 text-right font-semibold text-gray-600 w-32">Day Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dd = dayDate(i);
                  const flightAdultDay = row.hasFlight ? row.flightAdultPP * numAdults * mf : 0;
                  const flightChildDay = row.hasFlight ? row.flightChildPP * numChildren * mf : 0;
                  const dayTotalFinal = row.adultAccomTotal * mf + row.childAccomTotal * mf +
                    row.parkFeeAdultTotal + row.parkFeeChildTotal + row.transportTotal +
                    flightAdultDay + flightChildDay;

                  // Per-person breakdown for sub-row
                  const ppAdult = numAdults > 0 ? dayTotalFinal / numAdults : 0;
                  const ppChild = numChildren > 0 ? dayTotalFinal / (numAdults + numChildren) : 0;

                  return (
                    <>
                      {/* Main input row */}
                      <tr key={`${i}-main`} className="hover:bg-orange-50/30">
                        <td className="px-2 py-2" rowSpan={2}>
                          <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i+1}</span>
                          {dd && <p className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">{new Date(dd).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</p>}
                        </td>

                        {/* Destination */}
                        <td className="px-2 py-2">
                          <select value={row.destinationId ?? ''} onChange={e => updateRow(i, { destinationId: e.target.value ? Number(e.target.value) : null, hotelId:'', hotelName:'', availableRates:[] })} className="input py-1 text-xs w-full">
                            <option value="">— Destination —</option>
                            {localDests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </td>

                        {/* Hotel */}
                        <td className="px-2 py-2 min-w-[200px]">
                          <select className="input py-1 text-xs w-full" value={row.hotelId} onChange={e => onHotelChange(i, e.target.value)}>
                            <option value="">— Select hotel —</option>
                            {localHotels.filter(h => !row.destinationId || h.county.id === row.destinationId).map(h => (
                              <option key={h.id} value={h.id}>{h.name}{h.stars ? ` ${'★'.repeat(h.stars)}` : ''}</option>
                            ))}
                          </select>
                          {row.ratesLoading && <p className="text-orange-400 text-xs mt-1 flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/>Loading rates…</p>}
                          {!row.ratesLoading && row.availableRates.length > 0 && (
                            <select className="input py-1 text-xs w-full mt-1 bg-orange-50 border-orange-200" onChange={e => onRoomPriceSelect(i, e.target.value)} defaultValue="">
                              <option value="">↑ Pick rate → auto-fills totals</option>
                              {row.availableRates.map(p => (
                                <option key={p.id} value={p.id}>{p.roomType.name}: {p.ratePerPersonSharing ?? '?'}/adult · {p.childRate ?? 0}/child ({p.season?.name})</option>
                              ))}
                            </select>
                          )}
                          {!row.hotelId && <input value={row.hotelName} onChange={e => updateRow(i, { hotelName: e.target.value })} className="input py-1 text-xs w-full mt-1" placeholder="Or type manually"/>}
                        </td>

                        {/* Accom adults total */}
                        <td className="px-2 py-2">
                          <input type="number" min={0} step="0.01" value={row.adultAccomTotal||''} onChange={e => updateRow(i, { adultAccomTotal: Number(e.target.value) })} className="input py-1 text-xs font-mono text-center w-full" placeholder="0"/>
                        </td>

                        {/* Accom children total */}
                        <td className="px-2 py-2">
                          <input type="number" min={0} step="0.01" value={row.childAccomTotal||''} onChange={e => updateRow(i, { childAccomTotal: Number(e.target.value) })} className={`input py-1 text-xs font-mono text-center w-full ${numChildren===0?'opacity-30 bg-gray-50':''}`} placeholder="0"/>
                        </td>

                        {/* Park fees adults total */}
                        <td className="px-2 py-2">
                          <input type="number" min={0} step="0.01" value={row.parkFeeAdultTotal||''} onChange={e => updateRow(i, { parkFeeAdultTotal: Number(e.target.value) })} className="input py-1 text-xs font-mono text-center w-full" placeholder="0"/>
                        </td>

                        {/* Park fees children total */}
                        <td className="px-2 py-2">
                          <input type="number" min={0} step="0.01" value={row.parkFeeChildTotal||''} onChange={e => updateRow(i, { parkFeeChildTotal: Number(e.target.value) })} className={`input py-1 text-xs font-mono text-center w-full ${numChildren===0?'opacity-30 bg-gray-50':''}`} placeholder="0"/>
                        </td>

                        {/* Transport total */}
                        <td className="px-2 py-2">
                          <input type="number" min={0} step="0.01" value={row.transportTotal||''} onChange={e => updateRow(i, { transportTotal: Number(e.target.value) })} className="input py-1 text-xs font-mono text-center w-full" placeholder="0"/>
                        </td>

                        {/* Flight toggle */}
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={row.hasFlight} onChange={e => updateRow(i, { hasFlight: e.target.checked })} className="w-4 h-4"/>
                        </td>

                        {row.hasFlight && <>
                          <td className="px-2 py-2">
                            <input type="number" min={0} step="0.01" value={row.flightAdultPP||''} onChange={e => updateRow(i, { flightAdultPP: Number(e.target.value) })} className="input py-1 text-xs font-mono text-center w-full" placeholder="0"/>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min={0} step="0.01" value={row.flightChildPP||''} onChange={e => updateRow(i, { flightChildPP: Number(e.target.value) })} className={`input py-1 text-xs font-mono text-center w-full ${numChildren===0?'opacity-30 bg-gray-50':''}`} placeholder="0"/>
                          </td>
                        </>}

                        {/* Day total */}
                        <td className="px-2 py-2 text-right">
                          <p className="font-mono font-bold text-gray-800">{currency} {fmt2(dayTotalFinal)}</p>
                        </td>
                      </tr>

                      {/* ── Per-person sub-row ── */}
                      <tr key={`${i}-pp`} className="bg-orange-50/50 border-b border-orange-100">
                        <td colSpan={2} className="px-2 py-1 text-right">
                          <span className="text-xs text-gray-400 italic">per person →</span>
                        </td>
                        {/* Accom adult pp */}
                        <td className="px-2 py-1 text-center text-xs font-mono text-orange-600">{numAdults>0?fmt2(row.adultAccomTotal*mf/numAdults):'-'}</td>
                        {/* Accom child pp */}
                        <td className="px-2 py-1 text-center text-xs font-mono text-orange-600">{numChildren>0?fmt2(row.childAccomTotal*mf/numChildren):'-'}</td>
                        {/* Park adult pp */}
                        <td className="px-2 py-1 text-center text-xs font-mono text-green-600">{numAdults>0?fmt2(row.parkFeeAdultTotal/numAdults):'-'}</td>
                        {/* Park child pp */}
                        <td className="px-2 py-1 text-center text-xs font-mono text-green-600">{numChildren>0?fmt2(row.parkFeeChildTotal/numChildren):'-'}</td>
                        {/* Transport pp */}
                        <td className="px-2 py-1 text-center text-xs font-mono text-green-600">{numPax>0?fmt2(row.transportTotal/numPax):'-'}</td>
                        {/* Flight toggle placeholder */}
                        <td/>
                        {row.hasFlight && <>
                          <td className="px-2 py-1 text-center text-xs font-mono text-orange-600">{fmt2(row.flightAdultPP*mf)}</td>
                          <td className="px-2 py-1 text-center text-xs font-mono text-orange-600">{numChildren>0?fmt2(row.flightChildPP*mf):'-'}</td>
                        </>}
                        {/* Day total pp */}
                        <td className="px-2 py-1 text-right">
                          <p className="text-xs font-mono text-orange-600">{currency} {fmt2(ppAdult)}/adult</p>
                          {numChildren>0 && <p className="text-xs font-mono text-blue-600">{currency} {fmt2(ppChild)}/child</p>}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Global extras ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {[
            { label: `File Handling Fees (${currency}) — total`, val: fileHandling, set: setFileHandling },
            { label: `Eco Bottle + Water (${currency}) — total`, val: ecoBottle,    set: setEcoBottle },
            { label: `Evacuation Insurance (${currency}) — total`, val: evacInsurance, set: setEvacInsurance },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="label">{label}</label>
              <input type="number" min={0} value={val||''} onChange={e => set(Number(e.target.value))} className="input font-mono" placeholder="0"/>
              <p className="text-xs text-gray-400 mt-0.5">+markup → {currency} {fmt2(val * mf)} · pp: {numPax>0?fmt2(val*mf/numPax):'-'}</p>
            </div>
          ))}
        </div>

        {/* ── Section 5: Transfers — entered as TOTAL ── */}
        <div className="border border-orange-100 rounded-xl p-4 mb-5 space-y-3 bg-white">
          <p className="text-sm font-semibold text-gray-700">Transfers <span className="text-xs font-normal text-gray-400">— enter TOTAL cost (not per person)</span></p>
          {[
            { label: 'Arrival Transfer (Day 1)', checked: arrivalTransfer, setChecked: setArrivalTransfer, val: arrivalTotal, setVal: setArrivalTotal },
            { label: 'Departure Transfer (Last Day)', checked: departureTransfer, setChecked: setDepartureTransfer, val: departureTotal, setVal: setDepartureTotal },
          ].map(({ label, checked, setChecked, val, setVal }) => (
            <div key={label} className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer min-w-[220px]">
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="rounded"/>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </label>
              {checked && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">Total {currency}:</span>
                  <input type="number" min={0} step="0.01" value={val||''} onChange={e => setVal(Number(e.target.value))} className="input w-28 font-mono text-sm" placeholder="0"/>
                  <span className="text-xs text-gray-400">+markup → {fmt2(val * mf)} · pp: {numPax>0?fmt2(val*mf/numPax):'-'}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Section 6: Maasai + extras ── */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-orange-100">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={maasaiVillage} onChange={e => setMaasaiVillage(e.target.checked)} className="rounded"/>
            Maasai Village (optional)
          </label>
          {maasaiVillage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total {currency}:</span>
              <input type="number" min={0} value={maasaiCostTotal||''} onChange={e => setMaasaiCostTotal(Number(e.target.value))} className="input w-24 text-xs py-1.5 font-mono"/>
              <span className="text-xs text-gray-400">+markup → {fmt2(maasaiCostTotal * mf)} · pp: {numPax>0?fmt2(maasaiCostTotal*mf/numPax):'-'}</span>
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Additional Extras <span className="text-xs font-normal text-gray-400">(enter total per item)</span></label>
            <button type="button" onClick={() => setExtraItems(p => [...p, {label:'',cost:0}])} className="text-orange-500 text-xs hover:underline">+ Add Item</button>
          </div>
          {extraItems.map((ex, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input value={ex.label} onChange={e => setExtraItems(p => p.map((x,j) => j===idx?{...x,label:e.target.value}:x))} className="input flex-1 text-sm" placeholder="Description"/>
              <input type="number" min={0} value={ex.cost||''} onChange={e => setExtraItems(p => p.map((x,j) => j===idx?{...x,cost:Number(e.target.value)}:x))} className="input w-28 font-mono text-sm" placeholder={currency}/>
              <span className="text-xs text-gray-400 whitespace-nowrap">→ {fmt2(ex.cost*mf)} · pp:{numPax>0?fmt2(ex.cost*mf/numPax):'-'}</span>
              <button type="button" onClick={() => setExtraItems(p => p.filter((_,j)=>j!==idx))} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
            </div>
          ))}
        </div>

        {/* ── Section 7: Results — 4-column breakdown table ── */}
        <div className="bg-white rounded-xl border border-orange-100 overflow-hidden mb-5">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
            <p className="font-semibold text-gray-700 text-sm">Cost Breakdown — {numAdults} adult{numAdults!==1?'s':''}{numChildren>0?`, ${numChildren} child${numChildren!==1?'ren':''}`:''}  ({numPax} pax)</p>
            <p className="text-xs text-gray-400 mt-0.5">Orange columns = markup applied · Green = no markup (park fees & transport)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Line Item</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 w-32">Total<br/><span className="font-normal text-gray-400">no markup</span></th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-orange-600 w-32">Total<br/><span className="font-normal text-orange-400">+{markup}% markup</span></th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 w-28">Per Person<br/><span className="font-normal text-gray-400">no markup</span></th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-orange-600 w-28">Per Person<br/><span className="font-normal text-orange-400">+markup</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {breakdownRows.map(({ label, base, final, hasMarkup }) => {
                  const ppBase  = numPax > 0 ? base  / numPax : 0;
                  const ppFinal = numPax > 0 ? final / numPax : 0;
                  return (
                    <tr key={label} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 text-xs">{label}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-gray-700">{fmt2(base)}</td>
                      <td className={`px-4 py-2 text-right font-mono text-xs font-semibold ${hasMarkup ? 'text-orange-600' : 'text-green-600'}`}>
                        {fmt2(final)}
                        {hasMarkup && <span className="text-orange-400 text-xs ml-1">(+{fmt2(final-base)})</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-gray-500">{fmt2(ppBase)}</td>
                      <td className={`px-4 py-2 text-right font-mono text-xs font-semibold ${hasMarkup ? 'text-orange-600' : 'text-green-600'}`}>{fmt2(ppFinal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 text-xs font-semibold text-gray-700">Subtotal</td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-bold text-gray-800">{currency} {fmt2(subtotalBase)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-bold text-orange-600">{currency} {fmt2(subtotalFinal)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-gray-500">{fmt2(subtotalBase/numPax)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-bold text-orange-600">{fmt2(subtotalFinal/numPax)}</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="px-4 py-3 font-bold text-gray-900">Grand Total</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-400">{currency} {fmt2(subtotalBase)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-green-700 text-base">{currency} {fmt2(grandTotal)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">{fmt2(subtotalBase/numPax)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-orange-600">{fmt2(grandTotal/numPax)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Section 8: Per-person cards + group size grid ── */}
        <div className="bg-white rounded-xl p-5 border border-orange-100 space-y-4">
          <p className="font-semibold text-gray-700 text-sm">Charge to Client{selectedTour ? ` — ${selectedTour.durationDays}D/${selectedTour.durationNights}N · ${boardBasis}` : ''}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Grand Total</p>
              <p className="text-2xl font-bold text-green-700">{currency} {fmt2(grandTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{numPax} pax</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-xs text-orange-600 mb-1">Per Adult</p>
              <p className="text-2xl font-bold text-orange-600">{currency} {fmt2(perAdult)}</p>
              <p className="text-xs text-gray-400 mt-1">{numAdults} adult{numAdults!==1?'s':''}</p>
            </div>
            {numChildren > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 mb-1">Per Child</p>
                <p className="text-2xl font-bold text-blue-600">{currency} {fmt2(perChild)}</p>
                <p className="text-xs text-gray-400 mt-1">{numChildren} child{numChildren!==1?'ren':''}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Markup Amount</p>
                <p className="text-2xl font-bold text-gray-500">{currency} {fmt2(subtotalFinal - subtotalBase)}</p>
                <p className="text-xs text-gray-400 mt-1">{markup}% on marked-up items</p>
              </div>
            )}
          </div>

          {numPax >= 2 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Rate per person at different group sizes (2 → {numPax}):</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                {Array.from({ length: Math.max(0, numPax - 1) }, (_, k) => k + 2).map(n => {
                  const scale = numAdults > 0 ? n / numAdults : 1;
                  const scaledAccom  = accomAdultBase  * scale * mf;
                  const scaledPark   = parkAdultBase   * scale; // no markup
                  const scaledFlight = flightAdultBase * scale * mf;
                  const scaledTrans  = transportBase;           // fixed total, no markup, no scaling
                  const scaledExtras = (fileHandling + ecoBottle + evacInsurance + extrasBase + maasaiBase) * mf +
                    (arrivalTransfer   ? arrivalTotal   * mf : 0) +
                    (departureTransfer ? departureTotal * mf : 0);
                  const scaledTotal = scaledAccom + scaledPark + scaledFlight + scaledTrans + scaledExtras;
                  const ppRate = n > 0 ? scaledTotal / n : 0;
                  const active = n === numAdults;
                  return (
                    <div key={n} className={`text-center py-2 rounded-lg text-xs transition-all ${active ? 'bg-orange-500 text-white font-bold ring-2 ring-orange-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                      <div className="font-medium">{n} pax</div>
                      <div className="font-mono">{currency} {ppRate.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">* Transport & park fees are fixed totals — divided proportionally</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
