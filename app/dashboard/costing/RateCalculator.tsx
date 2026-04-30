'use client';
import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// INTERFACES (same as your original)
// =============================================================================
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
  adultAccomTotal: number;    // PER PERSON
  childAccomTotal: number;    // PER PERSON
  parkFeeAdultTotal: number;  // GROUP TOTAL
  parkFeeChildTotal: number;  // GROUP TOTAL
  transportTotal: number;     // GROUP TOTAL
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
    adultAccomTotal: 0,
    childAccomTotal: 0,
    parkFeeAdultTotal: 0,
    parkFeeChildTotal: 0,
    transportTotal: 0,
    hasFlight: false,
    flightAdultPP: 0,
    flightChildPP: 0,
    availableRates: [],
    ratesLoading: false,
  };
}

function fmt2(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function RateCalculator({
  tours,
  rateCards,
  clients = [],
  agents = [],
  bookings = [],
  hotels: initHotels = [],
  destinations: initDests = [],
}: Props) {
  // Local state for refreshable data
  const [localHotels, setLocalHotels] = useState<Hotel[]>(initHotels);
  const [localDests, setLocalDests] = useState<Destination[]>(initDests);

  // Linking fields
  const [clientId, setClientId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [tourId, setTourId] = useState('');

  // Core settings
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [numDays, setNumDays] = useState(1);
  const [numNights, setNumNights] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [boardBasis, setBoardBasis] = useState('FB');
  const [startDate, setStartDate] = useState('');

  // Day rows
  const [dayRows, setDayRows] = useState<DayRow[]>([emptyRow()]);

  // Global extras – GROUP totals
  const [fileHandling, setFileHandling] = useState(0);
  const [ecoBottle, setEcoBottle] = useState(0);
  const [evacInsurance, setEvacInsurance] = useState(0);
  const [extraItems, setExtraItems] = useState<{ label: string; cost: number }[]>([]);
  const [maasaiVillage, setMaasaiVillage] = useState(false);
  const [maasaiCostTotal, setMaasaiCostTotal] = useState(0);
  const [arrivalTransfer, setArrivalTransfer] = useState(false);
  const [arrivalTotal, setArrivalTotal] = useState(0);
  const [departureTransfer, setDepartureTransfer] = useState(false);
  const [departureTotal, setDepartureTotal] = useState(0);

  // Option tables – now explicitly for Pax 1 to 8 (each with editable markup)
  const [options, setOptions] = useState(
    Array.from({ length: 8 }, (_, i) => ({ pax: i + 1, markup: 10 }))
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const numPax = numAdults + numChildren;

  // =============================================================================
  // AUTO-FILL & SYNC
  // =============================================================================
  useEffect(() => {
    const t = tours.find((t) => t.id === tourId);
    if (t) {
      setNumDays(t.durationDays);
      setNumNights(t.durationNights);
      setDayRows(Array.from({ length: t.durationDays }, () => emptyRow()));
    }
  }, [tourId, tours]);

  useEffect(() => {
    setDayRows((prev) => {
      if (prev.length === numDays) return prev;
      return Array.from({ length: numDays }, (_, i) => prev[i] || emptyRow());
    });
  }, [numDays]);

  useEffect(() => {
    if (!bookingId) return;
    const b = bookings.find((b) => b.id === bookingId);
    if (!b) return;
    setClientId(b.clientId);
    if (b.tourPackageId) setTourId(b.tourPackageId);
    const c = clients.find((c) => c.id === b.clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [bookingId, bookings, clients]);

  useEffect(() => {
    if (!clientId) return;
    const c = clients.find((c) => c.id === clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [clientId, clients]);

  function updateRow(i: number, patch: Partial<DayRow>) {
    setDayRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  // =============================================================================
  // HOTEL & RATE HANDLERS
  // =============================================================================
  const fetchRates = useCallback(
    async (i: number, hotelId: string, board: string, date?: string) => {
      if (!hotelId) return;
      updateRow(i, { ratesLoading: true, availableRates: [] });
      try {
        const url = `/api/safari-rates/lookup?hotelId=${hotelId}&boardBasis=${board}${
          date ? `&date=${date}` : ''
        }`;
        const res = await fetch(url);
        const data = await res.json();
        updateRow(i, { ratesLoading: false, availableRates: data.prices || [] });
      } catch {
        updateRow(i, { ratesLoading: false });
      }
    },
    []
  );

  function dayDate(i: number) {
    if (!startDate) return undefined;
    return new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0];
  }

  function onHotelChange(i: number, hotelId: string) {
    const hotel = localHotels.find((h) => String(h.id) === hotelId);
    updateRow(i, {
      hotelId,
      hotelName: hotel?.name || '',
      destinationId: hotel?.county?.id ?? dayRows[i].destinationId,
      adultAccomTotal: 0,
      childAccomTotal: 0,
    });
    if (hotelId) fetchRates(i, hotelId, boardBasis, dayDate(i));
  }

  // Store per‑person accommodation rates directly
  function onRoomPriceSelect(i: number, priceId: string) {
    const price = dayRows[i].availableRates.find((p) => String(p.id) === priceId);
    if (!price) return;
    updateRow(i, {
      adultAccomTotal: price.ratePerPersonSharing || 0,
      childAccomTotal: price.childRate || 0,
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
    const [h, d] = await Promise.all([
      fetch('/api/safari-rates/hotels').then((r) => r.json()),
      fetch('/api/safari-rates/destinations').then((r) => r.json()),
    ]);
    setLocalHotels(Array.isArray(h) ? h : []);
    setLocalDests(Array.isArray(d) ? d : []);
  };

  // =============================================================================
  // EXACT FORMULA (as requested)
  // =============================================================================
  const accomPerPersonSum = dayRows.reduce(
    (s, r) => s + r.adultAccomTotal + r.childAccomTotal,
    0
  );
  const parkGroupTotal = dayRows.reduce(
    (s, r) => s + r.parkFeeAdultTotal + r.parkFeeChildTotal,
    0
  );
  const transportGroupTotal = dayRows.reduce((s, r) => s + r.transportTotal, 0);
  const flightGroupTotal = dayRows.reduce(
    (s, r) =>
      s + (r.hasFlight ? r.flightAdultPP * numAdults + r.flightChildPP * numChildren : 0),
    0
  );
  const extrasGroupTotal =
    extraItems.reduce((s, e) => s + e.cost, 0) +
    fileHandling +
    ecoBottle +
    evacInsurance +
    (maasaiVillage ? maasaiCostTotal : 0) +
    (arrivalTransfer ? arrivalTotal : 0) +
    (departureTransfer ? departureTotal : 0);

  const flightAndExtrasGroupTotal = flightGroupTotal + extrasGroupTotal;

  // Option results using the exact formula
  const optionResults = options.map((opt) => {
    const pax = opt.pax;
    const basePerPerson =
      accomPerPersonSum +
      parkGroupTotal +
      transportGroupTotal / pax +
      flightAndExtrasGroupTotal;
    const markedUp = basePerPerson * (1 + opt.markup / 100);
    const profit = markedUp - basePerPerson;
    return { ...opt, perPersonBase: basePerPerson, markedUp, profit };
  });

  const selectedTour = tours.find((t) => t.id === tourId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedAgent = agents.find((a) => a.id === agentId);
  const selectedBooking = bookings.find((b) => b.id === bookingId);

  // =============================================================================
  // SAVE HANDLER
  // =============================================================================
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    const payload = {
      bookingId: bookingId || null,
      clientId: clientId || null,
      agentId: agentId || null,
      bookingRef: selectedBooking?.bookingRef || null,
      tourTitle: selectedTour?.title || 'Custom Tour',
      days: numDays,
      numAdults,
      numChildren,
      numPax,
      boardBasis,
      currency,
      dayRows: dayRows.map((r) => ({
        destinationId: r.destinationId,
        hotelName: r.hotelName,
        adultAccomTotal: r.adultAccomTotal,
        childAccomTotal: r.childAccomTotal,
        parkFeeAdultTotal: r.parkFeeAdultTotal,
        parkFeeChildTotal: r.parkFeeChildTotal,
        transportTotal: r.transportTotal,
        hasFlight: r.hasFlight,
        flightAdultPP: r.flightAdultPP,
        flightChildPP: r.flightChildPP,
      })),
      fileHandlingFee: fileHandling,
      ecoBottle,
      evacInsurance,
      arrivalTransfer: arrivalTotal,
      departureTransfer: departureTotal,
      extras: extraItems.filter((e) => e.cost > 0),
      maasaiVillage,
      maasaiCost: maasaiCostTotal,
      accomPerPersonSum,
      parkGroupTotal,
      transportGroupTotal,
      flightAndExtrasGroupTotal,
      options: optionResults.map((opt) => ({
        pax: opt.pax,
        markup: opt.markup,
        perPersonBase: opt.perPersonBase,
        markedUp: opt.markedUp,
        profit: opt.profit,
      })),
    };
    const res = await fetch('/api/cost-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSaved(true);
      setSaving(false);
    } else {
      const d = await res.json();
      setSaveError(d.error || 'Save failed');
      setSaving(false);
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-lg">💰 Cost Calculator (Excel‑style)</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshData}
              className="text-xs text-blue-500 hover:underline"
            >
              🔄 Refresh Hotels
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-5"
            >
              {saving ? 'Saving…' : '💾 Save Costing Sheet'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">
            ✓ Saved{selectedClient ? ` and linked to ${selectedClient.name}` : ''}.
          </div>
        )}
        {saveError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            {saveError}
          </div>
        )}

        {/* ── Section 1: Link to Client / Booking ── */}
        <div className="bg-white rounded-xl border border-orange-100 p-4 mb-5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">
            🔗 Link to Client / Booking
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Agent</label>
              <select
                className="input text-sm"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                <option value="">— No agent —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.company ? ` (${a.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Client</label>
              <select
                className="input text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Select client —</option>
                {(agentId ? clients.filter((c) => c.agentId === agentId) : clients).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Booking (optional)</label>
              <select
                className="input text-sm"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              >
                <option value="">— Standalone —</option>
                {(clientId ? bookings.filter((b) => b.clientId === clientId) : bookings).map(
                  (b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingRef} · {b.client.name}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="label text-xs">Tour Package</label>
              <select
                className="input text-sm"
                value={tourId}
                onChange={(e) => setTourId(e.target.value)}
              >
                <option value="">— Manual —</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(selectedClient || selectedAgent || selectedBooking) && (
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {selectedAgent && (
                <span>
                  🤝 <strong>{selectedAgent.name}</strong>
                  {selectedAgent.company ? ` (${selectedAgent.company})` : ''}
                </span>
              )}
              {selectedClient && (
                <span>
                  👤 <strong>{selectedClient.name}</strong>
                </span>
              )}
              {selectedBooking && (
                <span>
                  📋 <strong>{selectedBooking.bookingRef}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: Core settings ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          <div>
            <label className="label text-xs">Adults *</label>
            <input
              type="number"
              min={1}
              value={numAdults}
              onChange={(e) => setNumAdults(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Children</label>
            <input
              type="number"
              min={0}
              value={numChildren}
              onChange={(e) => setNumChildren(Number(e.target.value))}
              className="input"
            />
            <p className="text-xs text-gray-400 mt-0.5">Total pax: {numPax}</p>
          </div>
          <div>
            <label className="label text-xs">Days *</label>
            <input
              type="number"
              min={1}
              value={numDays}
              onChange={(e) => setNumDays(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Board Basis</label>
            <select
              className="input"
              value={boardBasis}
              onChange={(e) => setBoardBasis(e.target.value)}
            >
              {BOARD_BASIS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Currency</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {['USD', 'KES', 'EUR', 'GBP'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Section 3: Day‑by‑day table ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">
              🏕 Properties & Costs — Day by Day
            </h3>
            <p className="text-xs text-gray-400">
              Accommodation = per person · Park/Transport = group total · ✈️ = flight per person
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-orange-100">
            <table className="w-full text-xs">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-14">Day</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
                    Destination
                  </th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">
                    Hotel / Accommodation
                  </th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                    Accom (per adult)
                  </th>
                  {numChildren > 0 && (
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                      Accom (per child)
                    </th>
                  )}
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                    Park Fees (group total)
                  </th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                    Transport (group total)
                  </th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">✈️</th>
                  {dayRows.some((r) => r.hasFlight) && (
                    <>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                        Flight (per adult)
                      </th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                        Flight (per child)
                      </th>
                    </>
                  )}
                  <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                    Day Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dayDate = startDate
                    ? new Date(new Date(startDate).getTime() + i * 86400000)
                        .toISOString()
                        .split('T')[0]
                    : undefined;
                  const flightAdultDayTotal = row.hasFlight
                    ? row.flightAdultPP * numAdults
                    : 0;
                  const flightChildDayTotal = row.hasFlight
                    ? row.flightChildPP * numChildren
                    : 0;
                  const dayTotalBase =
                    (row.adultAccomTotal + row.childAccomTotal) * numPax +
                    row.parkFeeAdultTotal +
                    row.parkFeeChildTotal +
                    row.transportTotal +
                    flightAdultDayTotal +
                    flightChildDayTotal;

                  return (
                    <tr key={i} className="hover:bg-orange-50/40">
                      <td className="px-2 py-2">
                        <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                          {i + 1}
                        </span>
                        {dayDate && (
                          <p className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">
                            {new Date(dayDate).toLocaleDateString('en-KE', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        )}
                       </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.destinationId ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              destinationId: e.target.value ? Number(e.target.value) : null,
                              hotelId: '',
                              hotelName: '',
                              availableRates: [],
                            })
                          }
                          className="input py-1 text-xs w-full"
                        >
                          <option value="">— Select destination —</option>
                          {localDests.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                       </td>
                      <td className="px-2 py-2 min-w-[180px]">
                        <select
                          className="input py-1 text-xs w-full"
                          value={row.hotelId}
                          onChange={(e) => onHotelChange(i, e.target.value)}
                        >
                          <option value="">— Select hotel —</option>
                          {localHotels
                            .filter(
                              (h) =>
                                !row.destinationId || h.county.id === row.destinationId
                            )
                            .map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} · {h.county.name}
                                {h.stars ? ` ${'★'.repeat(h.stars)}` : ''}
                              </option>
                            ))}
                        </select>
                        {row.ratesLoading && (
                          <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                            Loading rates…
                          </p>
                        )}
                        {!row.ratesLoading && row.availableRates.length > 0 && (
                          <select
                            className="input py-1 text-xs w-full mt-1 border-orange-200 bg-orange-50"
                            onChange={(e) => onRoomPriceSelect(i, e.target.value)}
                            defaultValue=""
                          >
                            <option value="">↑ Pick rate → auto‑fills totals</option>
                            {row.availableRates.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.roomType.name}: {p.ratePerPersonSharing ?? '?'}/adult ·{' '}
                                {p.childRate ?? 0}/child ({p.season?.name})
                              </option>
                            ))}
                          </select>
                        )}
                        {!row.hotelId && (
                          <input
                            value={row.hotelName}
                            onChange={(e) =>
                              updateRow(i, { hotelName: e.target.value })
                            }
                            className="input py-1 text-xs w-full mt-1"
                            placeholder="Or type manually"
                          />
                        )}
                       </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.adultAccomTotal || ''}
                          onChange={(e) =>
                            updateRow(i, { adultAccomTotal: Number(e.target.value) })
                          }
                          className="input py-1 text-xs font-mono text-center w-full"
                          placeholder="0"
                        />
                        <span className="text-gray-400 text-xs block text-center">
                          per adult
                        </span>
                       </td>
                      {numChildren > 0 && (
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.childAccomTotal || ''}
                            onChange={(e) =>
                              updateRow(i, { childAccomTotal: Number(e.target.value) })
                            }
                            className="input py-1 text-xs font-mono text-center w-full"
                            placeholder="0"
                          />
                          <span className="text-gray-400 text-xs block text-center">
                            per child
                          </span>
                         </td>
                      )}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.parkFeeAdultTotal || ''}
                          onChange={(e) =>
                            updateRow(i, { parkFeeAdultTotal: Number(e.target.value) })
                          }
                          className="input py-1 text-xs font-mono text-center w-full"
                          placeholder="0"
                        />
                       </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.transportTotal || ''}
                          onChange={(e) =>
                            updateRow(i, { transportTotal: Number(e.target.value) })
                          }
                          className="input py-1 text-xs font-mono text-center w-full"
                          placeholder="0"
                        />
                       </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.hasFlight}
                          onChange={(e) =>
                            updateRow(i, { hasFlight: e.target.checked })
                          }
                          className="w-4 h-4"
                        />
                       </td>
                      {row.hasFlight && (
                        <>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.flightAdultPP || ''}
                              onChange={(e) =>
                                updateRow(i, { flightAdultPP: Number(e.target.value) })
                              }
                              className="input py-1 text-xs font-mono text-center w-full"
                              placeholder="0"
                            />
                            {row.flightAdultPP > 0 && (
                              <p className="text-gray-400 text-xs text-center mt-0.5">
                                ={fmt2(flightAdultDayTotal)} total
                              </p>
                            )}
                           </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.flightChildPP || ''}
                              onChange={(e) =>
                                updateRow(i, { flightChildPP: Number(e.target.value) })
                              }
                              className="input py-1 text-xs font-mono text-center w-full"
                              placeholder="0"
                            />
                            {numChildren > 0 && row.flightChildPP > 0 && (
                              <p className="text-gray-400 text-xs text-center mt-0.5">
                                ={fmt2(flightChildDayTotal)} total
                              </p>
                            )}
                           </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right">
                        <p className="font-mono font-bold text-gray-800">
                          {currency} {fmt2(dayTotalBase)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {fmt2(dayTotalBase / numPax)}/pax
                        </p>
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
            <label className="label">
              File Handling Fees ({currency}) – total
            </label>
            <input
              type="number"
              min={0}
              value={fileHandling || ''}
              onChange={(e) => setFileHandling(Number(e.target.value))}
              className="input font-mono"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Eco Bottle + Water ({currency}) – total</label>
            <input
              type="number"
              min={0}
              value={ecoBottle || ''}
              onChange={(e) => setEcoBottle(Number(e.target.value))}
              className="input font-mono"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Evacuation Insurance ({currency}) – total</label>
            <input
              type="number"
              min={0}
              value={evacInsurance || ''}
              onChange={(e) => setEvacInsurance(Number(e.target.value))}
              className="input font-mono"
              placeholder="0"
            />
          </div>
        </div>

        {/* ── Section 5: Transfers ── */}
        <div className="border border-orange-100 rounded-xl p-4 mb-5 space-y-3 bg-white">
          <p className="text-sm font-semibold text-gray-700">
            Transfers <span className="text-xs font-normal text-gray-400">— enter TOTAL cost (not per person)</span>
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
              <input
                type="checkbox"
                checked={arrivalTransfer}
                onChange={(e) => setArrivalTransfer(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Arrival Transfer (Day 1)</span>
            </label>
            {arrivalTransfer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Total {currency}:</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={arrivalTotal || ''}
                  onChange={(e) => setArrivalTotal(Number(e.target.value))}
                  className="input w-28 font-mono text-sm"
                  placeholder="0"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
              <input
                type="checkbox"
                checked={departureTransfer}
                onChange={(e) => setDepartureTransfer(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Departure Transfer (Last Day)</span>
            </label>
            {departureTransfer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Total {currency}:</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={departureTotal || ''}
                  onChange={(e) => setDepartureTotal(Number(e.target.value))}
                  className="input w-28 font-mono text-sm"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Section 6: Maasai & extras ── */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-orange-100">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={maasaiVillage}
              onChange={(e) => setMaasaiVillage(e.target.checked)}
              className="rounded"
            />
            Maasai Village (optional)
          </label>
          {maasaiVillage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total {currency}:</span>
              <input
                type="number"
                min={0}
                value={maasaiCostTotal || ''}
                onChange={(e) => setMaasaiCostTotal(Number(e.target.value))}
                className="input w-24 text-xs py-1.5 font-mono"
              />
            </div>
          )}
        </div>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Additional Extras <span className="text-xs font-normal text-gray-400">(enter total per item)</span>
            </label>
            <button
              type="button"
              onClick={() => setExtraItems((p) => [...p, { label: '', cost: 0 }])}
              className="text-orange-500 text-xs hover:underline"
            >
              + Add Item
            </button>
          </div>
          {extraItems.map((ex, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input
                value={ex.label}
                onChange={(e) =>
                  setExtraItems((p) =>
                    p.map((x, j) =>
                      j === idx ? { ...x, label: e.target.value } : x
                    )
                  )
                }
                className="input flex-1 text-sm"
                placeholder="Description"
              />
              <input
                type="number"
                min={0}
                value={ex.cost || ''}
                onChange={(e) =>
                  setExtraItems((p) =>
                    p.map((x, j) =>
                      j === idx ? { ...x, cost: Number(e.target.value) } : x
                    )
                  )
                }
                className="input w-32 font-mono text-sm"
                placeholder={currency}
              />
              <button
                type="button"
                onClick={() =>
                  setExtraItems((p) => p.filter((_, j) => j !== idx))
                }
                className="text-red-400 hover:text-red-600 text-lg px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* ── Section 7: Excel‑style Totals and Option Tables ── */}
        <div className="bg-white rounded-xl border border-orange-100 overflow-hidden mb-5">
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 font-semibold text-gray-700">
            📊 Totals for the calculation (no markup)
          </div>
          <div className="p-4 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Accommodation (per person sum):</span>{' '}
              {currency} {fmt2(accomPerPersonSum)}
            </div>
            <div>
              <span className="text-gray-500">Park Fees (group total):</span> {currency}{' '}
              {fmt2(parkGroupTotal)}
            </div>
            <div>
              <span className="text-gray-500">Transport (group total):</span> {currency}{' '}
              {fmt2(transportGroupTotal)}
            </div>
            <div>
              <span className="text-gray-500">Flights & Extras (group total):</span> {currency}{' '}
              {fmt2(flightAndExtrasGroupTotal)}
            </div>
          </div>

          <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 font-semibold text-gray-700">
            Option Tables – Per Person Sharing (P.P.S)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Pax</th>
                  <th className="p-2 text-left">Per Person Sharing (base)</th>
                  <th className="p-2 text-left">Markup %</th>
                  <th className="p-2 text-left">Marked Up</th>
                  <th className="p-2 text-left">Profit</th>
                </tr>
              </thead>
              <tbody>
                {optionResults.map((opt, idx) => (
                  <tr key={opt.pax} className="border-b">
                    <td className="p-2 font-medium">{opt.pax} people</td>
                    <td className="p-2 font-mono">
                      {currency} {fmt2(opt.perPersonBase)}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={opt.markup}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, markup: Number(e.target.value) } : o
                            )
                          )
                        }
                        className="input w-20 text-center"
                      />
                    </td>
                    <td className="p-2 font-mono">
                      {currency} {fmt2(opt.markedUp)}
                    </td>
                    <td className={`p-2 font-mono ${opt.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currency} {fmt2(opt.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}