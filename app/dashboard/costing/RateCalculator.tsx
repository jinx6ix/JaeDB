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
interface Hotel {
  id: number;
  name: string;
  stars?: number|null;
  county: { id: number; name: string };
}
interface RoomPrice {
  id: number;
  ratePerPersonSharing?: number|null;
  singleRoomRate?: number|null;
  childRate?: number|null;
  currency: string;
  roomType: { id: number; name: string; maxOccupancy: number };
  season: { id: number; name: string; startDate: string; endDate: string };
}
interface Destination {
  id: number;
  name: string;
}
interface Props {
  tours: Tour[];
  rateCards: (RateCard & { tourPackage: Tour })[];
  clients?: Client[];
  agents?: Agent[];
  bookings?: Booking[];
  hotels?: Hotel[];
  destinations?: Destination[];
}

interface DayRow {
  destinationId: number | null;
  hotelId: string;
  hotelName: string;
  adultTotal: number;
  childTotal: number;
  parkFeeAdultTotal: number;
  parkFeeChildTotal: number;
  transportTotal: number;
  hasFlight: boolean;
  flightAdultPP: number;
  flightChildPP: number;
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
  return {
    destinationId: null,
    hotelId: '',
    hotelName: '',
    adultTotal: 0, childTotal: 0,
    parkFeeAdultTotal: 0, parkFeeChildTotal: 0,
    transportTotal: 0,
    hasFlight: false,
    flightAdultPP: 0, flightChildPP: 0,
    availableRates: [], ratesLoading: false,
  };
}

function fmt2(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function RateCalculator({
  tours,
  rateCards,
  clients = [],
  agents = [],
  bookings = [],
  hotels: initialHotels = [],
  destinations: initialDestinations = [],
}: Props) {
  // ── Local state for refreshable data ───────────────────────────────────────
  const [localHotels, setLocalHotels] = useState<Hotel[]>(initialHotels);
  const [localDestinations, setLocalDestinations] = useState<Destination[]>(initialDestinations);

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
  const [arrivalTransfer,   setArrivalTransfer]   = useState(false);
  const [arrivalCostPP,     setArrivalCostPP]     = useState(0);
  const [departureTransfer, setDepartureTransfer] = useState(false);
  const [departureCostPP,   setDepartureCostPP]   = useState(0);

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

  // ── Hotel change: auto‑fill destination, fetch rates with day date ──────────
  function onHotelChange(i: number, hotelId: string) {
    const hotel = localHotels.find(h => String(h.id) === hotelId);
    const dayDate = startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined;

    if (hotel && hotel.county) {
      updateRow(i, {
        hotelId,
        hotelName: hotel.name,
        destinationId: hotel.county.id,
        adultTotal: 0,
        childTotal: 0,
      });
    } else {
      updateRow(i, {
        hotelId,
        hotelName: hotel?.name || '',
        adultTotal: 0,
        childTotal: 0,
      });
    }

    if (hotelId) fetchRates(i, hotelId, boardBasis, dayDate);
  }

  function onRoomPriceSelect(i: number, priceId: string) {
    const row = dayRows[i];
    const price = row.availableRates.find(p => String(p.id) === priceId);
    if (!price) return;
    updateRow(i, {
      adultTotal: (price.ratePerPersonSharing || 0) * numAdults,
      childTotal: (price.childRate || 0) * numChildren,
    });
  }

  // ── Re‑fetch rates when startDate or boardBasis changes ─────────────────────
  useEffect(() => {
    if (!startDate) return;
    dayRows.forEach((row, i) => {
      if (row.hotelId) {
        const dayDate = new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0];
        fetchRates(i, row.hotelId, boardBasis, dayDate);
      }
    });
  }, [startDate, boardBasis, fetchRates, dayRows.length]);

  // ── Cost components (before markup) ─────────────────────────────────────────
  const adultAccom  = dayRows.reduce((s, r) => s + r.adultTotal, 0);
  const childAccom  = dayRows.reduce((s, r) => s + r.childTotal, 0);
  const adultPark   = dayRows.reduce((s, r) => s + r.parkFeeAdultTotal, 0);
  const childPark   = dayRows.reduce((s, r) => s + r.parkFeeChildTotal, 0);
  const transport   = dayRows.reduce((s, r) => s + r.transportTotal, 0);
  const adultFlight = dayRows.reduce((s, r) => s + (r.hasFlight ? r.flightAdultPP * numAdults : 0), 0);
  const childFlight = dayRows.reduce((s, r) => s + (r.hasFlight ? r.flightChildPP * numChildren : 0), 0);
  const maasaiTotal = maasaiVillage ? maasaiCost * numPax : 0;
  const arrivalTotal = arrivalTransfer   ? arrivalCostPP   * numPax : 0;
  const departureTotal = departureTransfer ? departureCostPP * numPax : 0;
  const extrasTotal = extraItems.reduce((s, e) => s + e.cost, 0);

  // ── Apply markup to each line item individually ─────────────────────────────
  const markupFactor = 1 + markup / 100;
  const adultAccomMarkup   = adultAccom   * markupFactor;
  const childAccomMarkup   = childAccom   * markupFactor;
  const adultParkMarkup    = adultPark    * markupFactor;
  const childParkMarkup    = childPark    * markupFactor;
  const transportMarkup    = transport    * markupFactor;
  const adultFlightMarkup  = adultFlight  * markupFactor;
  const childFlightMarkup  = childFlight  * markupFactor;
  const fileHandlingMarkup = fileHandling * markupFactor;
  const ecoBottleMarkup    = ecoBottle    * markupFactor;
  const evacMarkup         = evacInsurance* markupFactor;
  const maasaiMarkup       = maasaiTotal  * markupFactor;
  const arrivalMarkup      = arrivalTotal * markupFactor;
  const departureMarkup    = departureTotal* markupFactor;
  const extrasMarkupTotal  = extrasTotal  * markupFactor;

  const subtotal = adultAccom + childAccom + adultPark + childPark + transport +
                   adultFlight + childFlight + fileHandling + ecoBottle + evacInsurance +
                   maasaiTotal + arrivalTotal + departureTotal + extrasTotal;
  const grandTotal = adultAccomMarkup + childAccomMarkup + adultParkMarkup + childParkMarkup +
                     transportMarkup + adultFlightMarkup + childFlightMarkup +
                     fileHandlingMarkup + ecoBottleMarkup + evacMarkup +
                     maasaiMarkup + arrivalMarkup + departureMarkup + extrasMarkupTotal;

  const adultUnits = numAdults + numChildren * 0.5;
  const perAdult = adultUnits > 0 ? grandTotal / adultUnits : 0;
  const perChild = perAdult * 0.5;

  const selectedTour    = tours.find(t => t.id === tourId);
  const selectedClient  = clients.find(c => c.id === clientId);
  const selectedAgent   = agents.find(a => a.id === agentId);
  const selectedBooking = bookings.find(b => b.id === bookingId);

  // ── Refresh hotels & destinations ───────────────────────────────────────────
  const refreshData = async () => {
    const [h, d] = await Promise.all([
      fetch('/api/safari-rates/hotels').then(r => r.json()),
      fetch('/api/safari-rates/destinations').then(r => r.json()),
    ]);
    setLocalHotels(Array.isArray(h) ? h : []);
    setLocalDestinations(Array.isArray(d) ? d : []);
  };

  // ── Save costing sheet ──────────────────────────────────────────────────────
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
        destinationId:   r.destinationId,
        hotelName:       r.hotelName,
        adultTotal:      r.adultTotal,
        childTotal:      r.childTotal,
        parkFeeAdultTotal: r.parkFeeAdultTotal,
        parkFeeChildTotal: r.parkFeeChildTotal,
        transportTotal:    r.transportTotal,
        hasFlight:         r.hasFlight,
        flightAdultPP:     r.flightAdultPP,
        flightChildPP:     r.flightChildPP,
      })),
      fileHandlingFee:   fileHandling,
      ecoBottle,
      evacInsurance,
      arrivalTransfer:   arrivalTotal,
      departureTransfer: departureTotal,
      extras:      extraItems.filter(e => e.cost > 0),
      maasaiVillage,
      maasaiCost,
      subtotal,
      markupPercent: markup,
      markupAmount:  grandTotal - subtotal,
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
          <div className="flex gap-2">
            <button type="button" onClick={refreshData} className="text-xs text-blue-500 hover:underline">
              🔄 Refresh Hotels/Destinations
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5">
              {saving ? 'Saving…' : '💾 Save Costing Sheet'}
            </button>
          </div>
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
            <p className="text-xs text-gray-400">Accom / Park / Transport = day total · Flight optional per day (✔️ to enable)</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-orange-100">
            <table className="w-full text-xs">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-14">Day</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Destination</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Hotel / Accommodation</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom Total<br/><span className="text-gray-400 font-normal">Adults ({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom Total<br/><span className="text-gray-400 font-normal">Children ({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Park Fees Total<br/><span className="text-gray-400 font-normal">Adults ({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Park Fees Total<br/><span className="text-gray-400 font-normal">Children ({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Transport<br/><span className="text-gray-400 font-normal">total ({currency})</span></th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">✈️</th>
                  {dayRows.some(r => r.hasFlight) && (
                    <>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Flight<br/><span className="text-gray-400 font-normal">Adult/pp</span></th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Flight<br/><span className="text-gray-400 font-normal">Child/pp</span></th>
                    </>
                  )}
                  <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">Day Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dayDate = startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined;
                  const flightAdultDayTotal = row.hasFlight ? row.flightAdultPP * numAdults : 0;
                  const flightChildDayTotal = row.hasFlight ? row.flightChildPP * numChildren : 0;
                  const dayTotal = row.adultTotal + row.childTotal + row.parkFeeAdultTotal + row.parkFeeChildTotal +
                    row.transportTotal + flightAdultDayTotal + flightChildDayTotal;

                  const perAdultAccom   = numAdults > 0 ? row.adultTotal / numAdults : 0;
                  const perChildAccom   = numChildren > 0 ? row.childTotal / numChildren : 0;
                  const perAdultPark    = numAdults > 0 ? row.parkFeeAdultTotal / numAdults : 0;
                  const perChildPark    = numChildren > 0 ? row.parkFeeChildTotal / numChildren : 0;
                  const perPaxTransport = numPax > 0 && row.transportTotal > 0 ? row.transportTotal / numPax : 0;

                  return (
                    <tr key={i} className="hover:bg-orange-50/40">
                      <td className="px-2 py-2">
                        <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i+1}</span>
                        {dayDate && <p className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">{new Date(dayDate).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}</p>}
                      </td>

                      {/* Destination dropdown */}
                      <td className="px-2 py-2">
                        <select
                          value={row.destinationId ?? ''}
                          onChange={e => {
                            const destId = e.target.value ? Number(e.target.value) : null;
                            updateRow(i, { destinationId: destId, hotelId: '', hotelName: '', availableRates: [] });
                          }}
                          className="input py-1 text-xs w-full"
                        >
                          <option value="">— Select destination —</option>
                          {localDestinations.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Hotel dropdown filtered by destination */}
                      <td className="px-2 py-2 min-w-[180px]">
                        <select
                          className="input py-1 text-xs w-full"
                          value={row.hotelId}
                          onChange={e => onHotelChange(i, e.target.value)}
                        >
                          <option value="">— Select hotel —</option>
                          {localHotels
                            .filter(h => !row.destinationId || h.county.id === row.destinationId)
                            .map(h => (
                              <option key={h.id} value={h.id}>
                                {h.name} · {h.county.name}
                                {h.stars ? ` ${'★'.repeat(h.stars)}` : ''}
                              </option>
                            ))}
                        </select>
                        {row.ratesLoading && (
                          <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> Loading rates…
                          </p>
                        )}
                        {!row.ratesLoading && row.availableRates.length > 0 && (
                          <select className="input py-1 text-xs w-full mt-1 border-orange-200 bg-orange-50"
                            onChange={e => onRoomPriceSelect(i, e.target.value)} defaultValue="">
                            <option value="">↑ Pick rate → auto‑fills totals</option>
                            {row.availableRates.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.roomType.name}: {p.ratePerPersonSharing ?? '?'}/adult · {p.childRate ?? '?'}/child ({p.season?.name})
                              </option>
                            ))}
                          </select>
                        )}
                        {!row.hotelId && (
                          <input value={row.hotelName} onChange={e => updateRow(i, { hotelName: e.target.value })}
                            className="input py-1 text-xs w-full mt-1" placeholder="Or type manually" />
                        )}
                      </td>

                      {/* Adult Total Accom */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.adultTotal || ''}
                          onChange={e => updateRow(i, { adultTotal: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        <p className="text-gray-400 text-xs text-center mt-0.5">{fmt2(perAdultAccom)}/adult</p>
                      </td>

                      {/* Child Total Accom */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.childTotal || ''}
                          onChange={e => updateRow(i, { childTotal: Number(e.target.value) })}
                          className={`input py-1 text-xs font-mono text-center w-full ${numChildren === 0 ? 'opacity-30 bg-gray-50' : ''}`}
                          placeholder="0" />
                        {numChildren > 0 && <p className="text-gray-400 text-xs text-center mt-0.5">{fmt2(perChildAccom)}/child</p>}
                      </td>

                      {/* Adult Total Park */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.parkFeeAdultTotal || ''}
                          onChange={e => updateRow(i, { parkFeeAdultTotal: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        <p className="text-gray-400 text-xs text-center mt-0.5">{fmt2(perAdultPark)}/adult</p>
                      </td>

                      {/* Child Total Park */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.parkFeeChildTotal || ''}
                          onChange={e => updateRow(i, { parkFeeChildTotal: Number(e.target.value) })}
                          className={`input py-1 text-xs font-mono text-center w-full ${numChildren === 0 ? 'opacity-30 bg-gray-50' : ''}`}
                          placeholder="0" />
                        {numChildren > 0 && <p className="text-gray-400 text-xs text-center mt-0.5">{fmt2(perChildPark)}/child</p>}
                      </td>

                      {/* Transport Total */}
                      <td className="px-2 py-2">
                        <input type="number" min={0} step="0.01" value={row.transportTotal || ''}
                          onChange={e => updateRow(i, { transportTotal: Number(e.target.value) })}
                          className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                        {numPax > 0 && row.transportTotal > 0 && (
                          <p className="text-gray-400 text-xs text-center mt-0.5">{fmt2(perPaxTransport)}/pax</p>
                        )}
                      </td>

                      {/* Flight toggle */}
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" checked={row.hasFlight} onChange={e => updateRow(i, { hasFlight: e.target.checked })} className="w-4 h-4" />
                      </td>

                      {row.hasFlight && (
                        <>
                          <td className="px-2 py-2">
                            <input type="number" min={0} step="0.01" value={row.flightAdultPP || ''}
                              onChange={e => updateRow(i, { flightAdultPP: Number(e.target.value) })}
                              className="input py-1 text-xs font-mono text-center w-full" placeholder="0" />
                            {row.flightAdultPP > 0 && <p className="text-gray-400 text-xs text-center mt-0.5">={fmt2(flightAdultDayTotal)} total</p>}
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min={0} step="0.01" value={row.flightChildPP || ''}
                              onChange={e => updateRow(i, { flightChildPP: Number(e.target.value) })}
                              className={`input py-1 text-xs font-mono text-center w-full ${numChildren === 0 ? 'opacity-30 bg-gray-50' : ''}`}
                              placeholder="0" />
                            {numChildren > 0 && row.flightChildPP > 0 && <p className="text-gray-400 text-xs text-center mt-0.5">={fmt2(flightChildDayTotal)} total</p>}
                          </td>
                        </>
                      )}

                      {/* Day total */}
                      <td className="px-2 py-2 text-right">
                        <p className="font-mono font-bold text-gray-800">{currency} {fmt2(dayTotal)}</p>
                        {numAdults > 0 && <p className="text-gray-400 text-xs">{fmt2(dayTotal / numAdults)}/adult</p>}
                        {numChildren > 0 && <p className="text-gray-400 text-xs">{fmt2(dayTotal / numChildren)}/child</p>}
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

        {/* ── Section 5: Transfers (per person rates) ── */}
        <div className="border border-orange-100 rounded-xl p-4 mb-5 space-y-3 bg-white">
          <p className="text-sm font-semibold text-gray-700">Transfers</p>
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
        </div>

        {/* ── Section 6: Extras (Maasai + custom) ── */}
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
          {extraItems.map((ex, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input value={ex.label} onChange={e => setExtraItems(p => p.map((x,j) => j===idx ? {...x,label:e.target.value} : x))}
                className="input flex-1 text-sm" placeholder="Description" />
              <input type="number" min={0} value={ex.cost||''} onChange={e => setExtraItems(p => p.map((x,j) => j===idx ? {...x,cost:Number(e.target.value)} : x))}
                className="input w-32 font-mono text-sm" placeholder={currency} />
              <button type="button" onClick={() => setExtraItems(p => p.filter((_,j) => j!==idx))} className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
            </div>
          ))}
        </div>

        {/* ── Section 7: Results with per‑line markup breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-5 border border-orange-100">
            <p className="font-semibold text-gray-700 mb-4 text-sm">Cost Breakdown — {numAdults} adult{numAdults!==1?'s':''}{numChildren>0?`, ${numChildren} child${numChildren!==1?'ren':''}`:''}  ({numPax} pax)</p>
            <div className="space-y-2 text-sm">
              {[
                { label: `Accommodation — Adults (${numAdults}×)`, base: adultAccom, markupValue: adultAccomMarkup - adultAccom },
                ...(numChildren > 0 ? [{ label: `Accommodation — Children (${numChildren}×)`, base: childAccom, markupValue: childAccomMarkup - childAccom }] : []),
                { label: `Park Fees — Adults (${numAdults}×)`, base: adultPark, markupValue: adultParkMarkup - adultPark },
                ...(numChildren > 0 ? [{ label: `Park Fees — Children (${numChildren}×)`, base: childPark, markupValue: childParkMarkup - childPark }] : []),
                { label: 'Transport (all days total)', base: transport, markupValue: transportMarkup - transport },
                ...(adultFlight > 0 ? [{ label: `Day Flights — Adults`, base: adultFlight, markupValue: adultFlightMarkup - adultFlight }] : []),
                ...(childFlight > 0 ? [{ label: `Day Flights — Children`, base: childFlight, markupValue: childFlightMarkup - childFlight }] : []),
                { label: 'File Handling', base: fileHandling, markupValue: fileHandlingMarkup - fileHandling },
                { label: 'Eco Bottle + Water', base: ecoBottle, markupValue: ecoBottleMarkup - ecoBottle },
                { label: 'Evacuation Insurance', base: evacInsurance, markupValue: evacMarkup - evacInsurance },
                ...(arrivalTransfer ? [{ label: 'Arrival Transfer', base: arrivalTotal, markupValue: arrivalMarkup - arrivalTotal }] : []),
                ...(departureTransfer ? [{ label: 'Departure Transfer', base: departureTotal, markupValue: departureMarkup - departureTotal }] : []),
                ...(maasaiVillage ? [{ label: 'Maasai Village', base: maasaiTotal, markupValue: maasaiMarkup - maasaiTotal }] : []),
                ...extraItems.filter(e => e.cost > 0).map(e => ({ label: e.label || 'Extra', base: e.cost, markupValue: e.cost * markupFactor - e.cost })),
              ].map(({ label, base, markupValue }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-mono text-gray-700">
                    {currency} {fmt2(base)}
                    {markupValue !== 0 && <span className="text-orange-500 text-xs ml-1">(+{fmt2(markupValue)})</span>}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Subtotal (excl. markup)</span>
                <span className="font-mono">{currency} {fmt2(subtotal)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Total Markup ({markup}%)</span>
                <span className="font-mono">+ {currency} {fmt2(grandTotal - subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-green-700">{currency} {fmt2(grandTotal)}</span>
              </div>
            </div>
          </div>
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
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Rate per person at different group sizes (2 → {numPax}):</p>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: Math.max(0, numPax - 1) }, (_, i) => i + 2).map(n => {
                  // Scale each component linearly with group size ratio
                  const scale = n / numAdults;
                  const scaledAccom   = adultAccom * scale;
                  const scaledPark    = adultPark * scale;
                  const scaledFlight  = adultFlight * scale;
                  const scaledTransport = transport; // fixed total cost
                  const scaledMaasai  = maasaiVillage ? maasaiCost * n : 0;
                  const scaledExtras  = fileHandling + ecoBottle + evacInsurance + extrasTotal +
                    (arrivalTransfer ? arrivalCostPP * n : 0) +
                    (departureTransfer ? departureCostPP * n : 0);
                  const scaledSub = scaledAccom + scaledPark + scaledFlight + scaledTransport + scaledMaasai + scaledExtras;
                  const scaledTotal = scaledSub * markupFactor;
                  const ppRate = n > 0 ? scaledTotal / n : 0;
                  const active = n === numAdults;
                  return (
                    <div key={n} className={`text-center py-2 rounded-lg text-xs transition-all ${active ? 'bg-orange-500 text-white font-bold ring-2 ring-orange-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                      <div className="font-medium">{n} pax</div>
                      <div className="font-mono text-xs">{currency} {ppRate.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">* Transport cost is fixed total — divided among group size</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}