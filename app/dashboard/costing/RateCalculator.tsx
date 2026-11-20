'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateSafariRates } from '@/lib/safari-rate-calculation';

// =============================================================================
// INTERFACES
// =============================================================================
interface Tour { id: string; title: string; durationDays: number; durationNights: number; }
interface RateCard { id: string; season: string; currency: string; basedOn2: number; basedOn4: number; basedOn6: number; basedOn8: number; basedOn9?: number|null; basedOn10?: number|null; basedOn12?: number|null; markupPercent: number; }
interface Client { id: string; name: string; agentId?: string|null; agent?: { id: string; name: string; company?: string|null }|null; }
interface Agent  { id: string; name: string; company?: string|null; }
interface Booking {
  id: string; bookingRef: string; clientId: string; client: { name: string };
  tourPackageId?: string|null;
  startDate?: string | null;
  endDate?: string | null;
  numAdults?: number | null;
  numChildren?: number | null;
}
interface Hotel { id: number; name: string; stars?: number|null; county: { id: number; name: string }; childFreeAge?: number|null; childChargeAge?: number|null; extraBedRate?: number|null; }
interface RoomPrice { id: number; ratePerPersonSharing?: number|null; singleRoomRate?: number|null; childRate?: number|null; thirdAdultRate?: number|null; currency: string; roomType: { id: number; name: string; maxOccupancy: number }; season: { id: number; name: string; startDate: string; endDate: string }; }
interface Destination { id: number; name: string; }
interface Props { tours: Tour[]; rateCards: (RateCard & { tourPackage: Tour })[]; clients?: Client[]; agents?: Agent[]; bookings?: Booking[]; hotels?: Hotel[]; destinations?: Destination[]; initialCostSheet?: any; }

interface DayRow {
  destinationId: number|null;
  hotelId: string;
  hotelName: string;
  adultAccomTotal: number;
  childAccomTotal: number;
  singleRoomRate: number;
  thirdPersonRate: number;
  parkFeeAdultTotal: number;
  parkFeeChildTotal: number;
  /** Per-day daily extras (spreadsheet "Extras" column) — added directly to base PPS. */
  extrasTotal: number;
  transportTotal: number;
  vehicleId: string|null;
  rateType: 'single' | 'pps' | 'mixed' | null;
  hasFlight: boolean;
  flightAdultPP: number;
  flightChildPP: number;
  isTriple: boolean;
  tripleRate: number;
  selectedRateId: number|null;
  availableRates: RoomPrice[];
  ratesLoading: boolean;
  /** true when the lookup matched a season for this day's date; false when fallback was used. */
  ratesMatched: boolean;
  /** Number of extra beds for this day (charged at hotel extraBedRate). */
  extraBeds: number;
}

const BOARD_BASIS = [
  { code: 'FB', label: 'Full Board' },
  { code: 'HB', label: 'Half Board' },
  { code: 'BB', label: 'Bed & Breakfast' },
  { code: 'RO', label: 'Room Only' },
];

const RATE_TYPE_OPTIONS: { value: 'single' | 'pps' | 'mixed'; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'pps', label: 'P.P.S' },
  { value: 'mixed', label: 'Mixed' },
];

function emptyRow(): DayRow {
  return {
    destinationId: null,
    hotelId: '',
    hotelName: '',
    adultAccomTotal: 0,
    childAccomTotal: 0,
    singleRoomRate: 0,
    thirdPersonRate: 0,
    parkFeeAdultTotal: 0,
    parkFeeChildTotal: 0,
    extrasTotal: 0,
    transportTotal: 0,
    vehicleId: null,
    rateType: null,
    hasFlight: false,
    flightAdultPP: 0,
    flightChildPP: 0,
    isTriple: false,
    tripleRate: 0,
    selectedRateId: null,
    availableRates: [],
    ratesLoading: false,
    ratesMatched: false,
    extraBeds: 0,
  };
}

function fmt2(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RateCalculator({
  tours,
  rateCards,
  clients = [],
  agents = [],
  bookings = [],
  hotels: initHotels = [],
  destinations: initDests = [],
  initialCostSheet,
}: Props) {
  const [localHotels, setLocalHotels] = useState<Hotel[]>(initHotels);
  const [localDests, setLocalDests] = useState<Destination[]>(initDests);
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents);
  // Bookings come from server props as a one-time snapshot. We mirror them in
  // state and re-fetch on mount / focus so newly-created bookings appear
  // without forcing the user to reload the page.
  const [localBookings, setLocalBookings] = useState<Booking[]>(bookings);

  // Cost sheet versioning
  const [costSheetsList, setCostSheetsList] = useState<any[]>([]);
  const [currentCostSheetId, setCurrentCostSheetId] = useState<string | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // Linking fields
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientId, setClientId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [showAgentCreate, setShowAgentCreate] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentCompany, setAgentCompany] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [tourId, setTourId] = useState('');

  // Core settings
  const [numAdults, setNumAdults] = useState(0);
  const [numChildren, setNumChildren] = useState(0);
  /** Per-child ages for age-based child pricing (one entry per child). */
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [numDays, setNumDays] = useState(1);
  const [numNights, setNumNights] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [boardBasis, setBoardBasis] = useState('FB');
  const [startDate, setStartDate] = useState('');
  const [globalMarkup, setGlobalMarkup] = useState(10);
  const [notes, setNotes] = useState('');

  // Global selections — chosen before the day-to-day table.
  // Flow: Destination → Hotel → Room Type → Vehicle.
  // These values pre-fill the day editor modal and serve as defaults for each day row.
  const [globalVehicleId, setGlobalVehicleId] = useState<string>('');

  // Day editor modal state
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [modalDestId, setModalDestId] = useState<number | null>(null);
  const [modalHotelId, setModalHotelId] = useState<string>('');
  const [modalRoomTypeId, setModalRoomTypeId] = useState<string>('');
  const [modalVehicleId, setModalVehicleId] = useState<string>('');
  const [modalExtraBeds, setModalExtraBeds] = useState(0);
  const [modalRateType, setModalRateType] = useState<'single' | 'pps' | 'mixed' | null>(null);
  // Park fees available for the selected destination (county).
  const [modalParkFees, setModalParkFees] = useState<{ id: string; name: string; fee: number; currency: string }[]>([]);
  const [modalParkFeeAdult, setModalParkFeeAdult] = useState(0);
  const [modalParkFeeChild, setModalParkFeeChild] = useState(0);
  const [modalTransportTotal, setModalTransportTotal] = useState(0);
  const [modalExtrasTotal, setModalExtrasTotal] = useState(0);
  const [modalHasFlight, setModalHasFlight] = useState(false);
  const [modalFlightAdultPP, setModalFlightAdultPP] = useState(0);
  const [modalFlightChildPP, setModalFlightChildPP] = useState(0);
  const [modalIsTriple, setModalIsTriple] = useState(false);
  const [modalTripleRate, setModalTripleRate] = useState(0);
  const [modalAdultAccomTotal, setModalAdultAccomTotal] = useState(0);
  const [modalChildAccomTotal, setModalChildAccomTotal] = useState(0);
  const [modalSingleRoomRate, setModalSingleRoomRate] = useState(0);
  const [modalThirdPersonRate, setModalThirdPersonRate] = useState(0);
  const [modalHotels, setModalHotels] = useState<Hotel[]>([]);
  const [modalRoomTypes, setModalRoomTypes] = useState<{ id: string; roomTypeId: number; name: string; maxOccupancy: number; ratePerPersonSharing: number|null|undefined; singleRoomRate: number|null|undefined; childRate: number|null|undefined; thirdAdultRate: number|null|undefined }[]>([]);
  const [modalPrices, setModalPrices] = useState<RoomPrice[]>([]);
  const [transportFees, setTransportFees] = useState<{ id: string; vehicleType: string; sittingCapacity: number; fee: number; currency: string; seasonId: string | null; route: string | null }[]>([]);
  const [transportFeeSeasons, setTransportFeeSeasons] = useState<{ id: string; name: string; startDate: string | null; endDate: string | null }[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFallback, setModalFallback] = useState<{ type: 'season' | 'occupancy' | null; message: string } | null>(null);

  // Day rows
  const [dayRows, setDayRows] = useState<DayRow[]>([emptyRow()]);

  // Global extras
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

  // Option tables
  const [options, setOptions] = useState<{ pax: number; markup: number }[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Computed
  const numPax = numAdults + numChildren;
  // Costing by Pax: if ≤8 show up to 8; if >8 show up to numPax
  const maxDisplayPax = numPax <= 8 ? 8 : numPax;
  const filteredClients = localClients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );
  const exactMatch = filteredClients.some(c => c.name.toLowerCase() === clientSearch.toLowerCase());

  // Close client dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node) &&
          clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Options based on numPax — Costing by Pax (Each Person)
  // If ≤8: show even pax up to 8. If >8: show even pax up to numPax.
  useEffect(() => {
    if (numPax === 0) { setOptions([]); return; }
    // Build pax options: even numbers from 2 to maxDisplayPax
    const paxOptions: number[] = [];
    for (let p = 2; p <= maxDisplayPax; p += 2) {
      paxOptions.push(p);
    }
    // If numPax is odd and > 8, add it as an additional option
    if (numPax > 8 && numPax % 2 !== 0) {
      paxOptions.push(numPax);
    }
    setOptions(prev => {
      const newOptions = paxOptions.map(p => {
        const existing = prev.find(opt => opt.pax === p);
        return { pax: p, markup: existing?.markup ?? 10 };
      });
      return newOptions;
    });
  }, [numPax, maxDisplayPax]);

  // Auto-fill from tour
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
      return Array.from({ length: numDays }, (_, i) => {
        const existing = prev[i];
        if (existing) return existing;
        // New rows inherit the global vehicle selection. Destination/hotel/room type
        // are chosen per-day inside the day editor modal.
        return {
          ...emptyRow(),
          vehicleId: globalVehicleId || null,
          rateType: null,
          transportTotal: calculateModalTransport(globalVehicleId).costPerDay,
        };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays, globalVehicleId, numAdults]);

  // Auto-fill from booking
  useEffect(() => {
    if (!bookingId) return;
    const b = localBookings.find((b) => b.id === bookingId);
    if (!b) return;
    setClientId(b.clientId);
    setClientSearch(b.client.name);
    if (b.tourPackageId) setTourId(b.tourPackageId);
    const c = localClients.find((c) => c.id === b.clientId);
    if (c?.agentId) setAgentId(c.agentId);

    // Reflect booking details: start date, pax, and day count (from start→end).
    if (b.startDate) {
      setStartDate(b.startDate.split('T')[0]);
    }
    if (typeof b.numAdults === 'number') setNumAdults(b.numAdults);
    if (typeof b.numChildren === 'number') setNumChildren(b.numChildren);
    if (b.startDate && b.endDate) {
      const ms = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
      const days = Math.max(1, Math.round(ms / 86400000) + 1); // inclusive of start day
      setNumDays(days);
      setNumNights(Math.max(0, days - 1));
    }
  }, [bookingId, localBookings, localClients]);

  useEffect(() => {
    if (!clientId) return;
    const c = localClients.find((c) => c.id === clientId);
    if (c?.agentId) setAgentId(c.agentId);
  }, [clientId, localClients]);

  useEffect(() => {
    if (numChildren === 0) {
      setDayRows(prev => prev.map(row => ({
        ...row,
        childAccomTotal: 0,
        parkFeeChildTotal: 0,
        flightChildPP: 0,
      })));
    }
  }, [numChildren]);

  // Keep childrenAges in sync with numChildren count.
  useEffect(() => {
    setChildrenAges(prev => {
      if (prev.length === numChildren) return prev;
      return Array.from({ length: numChildren }, (_, i) => prev[i] ?? 0);
    });
  }, [numChildren]);

  const fetchCostSheets = useCallback(async () => {
    if (!clientId && !bookingId) {
      setCostSheetsList([]);
      return;
    }
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (bookingId) params.append('bookingId', bookingId);
    const res = await fetch(`/api/cost-sheets?${params.toString()}`);
    const data = await res.json();
    const sheets = Array.isArray(data) ? data : (data.data || []);
    setCostSheetsList(sheets);
  }, [clientId, bookingId]);

  const loadCostSheet = useCallback(async (sheetId: string) => {
    if (!sheetId) return;
    setIsLoadingSheet(true);
    try {
      const res = await fetch(`/api/cost-sheets/${sheetId}`);
      const sheet = await res.json();
      if (!sheet.id) return;
      setCurrentCostSheetId(sheet.id);
      setClientId(sheet.clientId || '');
      setClientSearch(sheet.client?.name || '');
      setAgentId(sheet.agentId || '');
      setBookingId(sheet.bookingId || '');
      setTourId(sheet.booking?.tourPackageId || '');
      setNumAdults(sheet.numAdults || 0);
      setNumChildren(sheet.numChildren || 0);
      try { setChildrenAges(JSON.parse(sheet.childrenAges || '[]')); } catch { setChildrenAges([]); }
      setNumDays(sheet.days || 1);
      setBoardBasis(sheet.boardBasis || 'FB');
      setCurrency(sheet.currency || 'USD');
      setGlobalMarkup(sheet.markupPercent || 10);
      setFileHandling(sheet.fileHandlingFee || 0);
      setEcoBottle(sheet.ecoBottle || 0);
      setEvacInsurance(sheet.evacInsurance || 0);
      setArrivalTransfer(sheet.arrivalTransfer > 0);
      setArrivalTotal(sheet.arrivalTransfer || 0);
      setDepartureTransfer(sheet.departureTransfer > 0);
      setDepartureTotal(sheet.departureTransfer || 0);
      setMaasaiVillage(!!sheet.maasaiVillage);
      setMaasaiCostTotal(sheet.maasaiCost || 0);
      setNotes(sheet.notes || '');
      let extrasArr = [];
      try { extrasArr = JSON.parse(sheet.extras || '[]'); } catch {}
      setExtraItems(extrasArr);
      let parsedRows = [];
      try { parsedRows = JSON.parse(sheet.dayRows || '[]'); } catch {}
      const newRows = parsedRows.map((row: any) => ({
        ...emptyRow(),
        destinationId: row.destinationId ?? null,
        hotelId: row.hotelId || '',
        hotelName: row.hotelName || '',
        adultAccomTotal: row.adultAccomTotal ?? row.adultTotal ?? 0,
        childAccomTotal: row.childAccomTotal ?? row.childTotal ?? 0,
        thirdPersonRate: row.thirdPersonRate ?? 0,
        parkFeeAdultTotal: row.parkFeeAdultTotal ?? 0,
        parkFeeChildTotal: row.parkFeeChildTotal ?? 0,
        transportTotal: row.transportTotal ?? 0,
        extrasTotal: row.extrasTotal ?? 0,
        hasFlight: !!row.hasFlight,
        flightAdultPP: row.flightAdultPP ?? 0,
        flightChildPP: row.flightChildPP ?? 0,
        isTriple: row.isTriple ?? false,
        tripleRate: row.tripleRate ?? 0,
        selectedRateId: row.selectedRateId ?? null,
        singleRoomRate: row.singleRoomRate ?? 0,
        extraBeds: row.extraBeds ?? 0,
        rateType: row.rateType ?? null,
      }));
      setDayRows(newRows);
    } catch (err) {
      console.error('Failed to load cost sheet', err);
    } finally {
      setIsLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    if (initialCostSheet) loadCostSheet(initialCostSheet.id);
  }, [initialCostSheet, loadCostSheet]);

  useEffect(() => {
    fetchCostSheets();
  }, [fetchCostSheets]);

  function updateRow(i: number, patch: Partial<DayRow>) {
    setDayRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  const fetchRates = useCallback(
    async (i: number, hotelId: string, board: string, date?: string) => {
      if (!hotelId) return;
      updateRow(i, { ratesLoading: true, availableRates: [], ratesMatched: false });
      try {
        const url = `/api/safari-rates/lookup?hotelId=${hotelId}&boardBasis=${board}${date ? `&date=${date}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        updateRow(i, {
          ratesLoading: false,
          availableRates: data.prices || [],
          ratesMatched: data.matched === true,
        });
      } catch {
        updateRow(i, { ratesLoading: false, ratesMatched: false });
      }
    },
    []
  );

  function dayDate(i: number) {
    if (!startDate) return undefined;
    // Parse as UTC midnight to avoid timezone offset shifting the date
    const d = new Date(startDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().split('T')[0];
  }

  function onHotelChange(i: number, hotelId: string) {
    const hotel = localHotels.find((h) => String(h.id) === hotelId);
    updateRow(i, {
      hotelId,
      hotelName: hotel?.name || '',
      destinationId: hotel?.county?.id ?? dayRows[i].destinationId,
      adultAccomTotal: 0,
      childAccomTotal: 0,
      singleRoomRate: 0,
      thirdPersonRate: 0,
      selectedRateId: null,
      isTriple: false,
      tripleRate: 0,
    });
    if (hotelId) fetchRates(i, hotelId, boardBasis, dayDate(i));
  }

  function onRoomPriceSelect(i: number, priceId: string) {
    const price = dayRows[i].availableRates.find((p) => String(p.id) === priceId);
    if (!price) return;
    let tripleRate = 0;
    let thirdPersonRate = price.thirdAdultRate || 0;
    if (price.thirdAdultRate && price.ratePerPersonSharing) {
      tripleRate = (price.ratePerPersonSharing * 2) + price.thirdAdultRate;
    }
    updateRow(i, {
      selectedRateId: price.id,
      adultAccomTotal: price.ratePerPersonSharing || 0,
      childAccomTotal: numChildren > 0 ? (price.childRate || 0) : 0,
      singleRoomRate: price.singleRoomRate || 0,
      thirdPersonRate: thirdPersonRate,
      tripleRate: tripleRate,
    });
  }

  // ── Day editor modal handlers ──
  function openDayEditor(i: number) {
    const row = dayRows[i];
    setEditingDay(i);
    setModalDestId(row.destinationId);
    setModalHotelId(row.hotelId);
    setModalRoomTypeId(row.selectedRateId?.toString() || '');
    setModalExtraBeds(row.extraBeds ?? 0);
    setModalParkFeeAdult(row.parkFeeAdultTotal ?? 0);
    setModalParkFeeChild(row.parkFeeChildTotal ?? 0);
    setModalTransportTotal(row.transportTotal ?? 0);
    setModalExtrasTotal(row.extrasTotal ?? 0);
    setModalHasFlight(row.hasFlight ?? false);
    setModalFlightAdultPP(row.flightAdultPP ?? 0);
    setModalFlightChildPP(row.flightChildPP ?? 0);
    setModalIsTriple(row.isTriple ?? false);
    setModalTripleRate(row.tripleRate ?? 0);
    setModalAdultAccomTotal(row.adultAccomTotal ?? 0);
    setModalChildAccomTotal(row.childAccomTotal ?? 0);
    setModalSingleRoomRate(row.singleRoomRate ?? 0);
    setModalThirdPersonRate(row.thirdPersonRate ?? 0);
    setModalVehicleId('');
    setModalRateType(row.rateType ?? null);
    setModalHotels([]);
    setModalRoomTypes([]);
    setModalPrices([]);
    setModalDestId(row.destinationId ?? null);
    if (row.hotelId) {
      const hotel = localHotels.find((h) => String(h.id) === row.hotelId);
      if (!hotel) return;
      const destId = row.destinationId ?? hotel.county.id;
      setModalDestId(destId);
      setModalHotels(localHotels.filter((h) => h.county.id === destId));
      onModalHotelChange(row.hotelId, destId, i);
    }
  }

  function closeDayEditor() {
    setEditingDay(null);
    setModalDestId(null);
    setModalHotelId('');
    setModalRoomTypeId('');
    setModalVehicleId('');
    setModalExtraBeds(0);
    setModalParkFeeAdult(0);
    setModalParkFeeChild(0);
    setModalParkFees([]);
    setModalTransportTotal(0);
    setModalExtrasTotal(0);
    setModalHasFlight(false);
    setModalFlightAdultPP(0);
    setModalFlightChildPP(0);
    setModalIsTriple(false);
    setModalTripleRate(0);
    setModalAdultAccomTotal(0);
    setModalChildAccomTotal(0);
    setModalSingleRoomRate(0);
    setModalThirdPersonRate(0);
    setModalHotels([]);
    setModalRoomTypes([]);
    setModalPrices([]);
  }

  function onModalDestChange(destId: number | null) {
    setModalDestId(destId);
    setModalHotelId('');
    setModalRoomTypeId('');
    setModalRoomTypes([]);
    setModalPrices([]);
    if (destId) {
      setModalHotels(localHotels.filter((h) => h.county.id === destId));
    } else {
      setModalHotels([]);
    }
  }

  async function onModalHotelChange(hotelId: string, destId?: number | null, dayIndex: number | null = editingDay) {
    setModalHotelId(hotelId);
    setModalRoomTypeId('');
    setModalRoomTypes([]);
    setModalPrices([]);
    setModalFallback(null);
    if (!hotelId || dayIndex == null) return;
    // destId is passed explicitly when called from openDayEditor because React
    // state updates (setModalDestId just before) are not yet visible here.
    const effectiveDestId = destId ?? modalDestId;
    if (!effectiveDestId) {
      setModalFallback({
        type: 'occupancy',
        message: 'Please select a Destination before choosing a hotel.',
      });
      return;
    }
    const row = dayRows[dayIndex];
    setModalLoading(true);
    try {
      // Step 3 Room Type: load available room types for the hotel.
      const rtRes = await fetch(`/api/safari-rates/room-types?hotelId=${hotelId}`);
      if (!rtRes.ok) throw new Error(`HTTP ${rtRes.status}`);
      const rtData = await rtRes.json();
      const roomTypes: any[] = Array.isArray(rtData) ? rtData : [];

      // Also pre-load rates for this hotel + board basis + date (if start date set)
      // so Step 4 can auto-fill from the selected room type without another API call.
      let prices: RoomPrice[] = [];
      if (startDate) {
        const dateStr = new Date(startDate + 'T00:00:00Z').toISOString().split('T')[0];
        const lpRes = await fetch(
          `/api/safari-rates/lookup?hotelId=${hotelId}&destinationId=${effectiveDestId}&boardBasis=${boardBasis}&date=${dateStr}`
        );
        if (lpRes.ok) {
          const lpData = await lpRes.json();
          prices = Array.isArray(lpData.prices) ? lpData.prices : [];
          if (lpData.matched === false) {
            setModalFallback({
              type: 'season',
              message: `No rate season covers ${dateStr} for this hotel and board basis — showing all available rates. Rates will load once you add them for this season.`,
            });
          } else {
            setModalFallback(null);
          }
        }
      }
      setModalPrices(prices);

      // Pre-load park fees for the hotel's county so Step 7 auto-fills.
      try {
        const pfRes = await fetch(`/api/park-fees?countyId=${effectiveDestId}`);
        if (pfRes.ok) {
          const pfData = await pfRes.json();
          const parkFees: any[] = Array.isArray(pfData) ? pfData : [];
          setModalParkFees(
            parkFees.map((f: any) => ({
              id: f.id,
              name: f.name,
              fee: Number(f.fee || 0),
              currency: f.currency || 'USD',
            }))
          );
          const adultFee = parkFees.find((f) => f.name?.toLowerCase().includes('adult'));
          const childFee = parkFees.find((f) => f.name?.toLowerCase().includes('child'));
          setModalParkFeeAdult(adultFee ? Number(adultFee.fee) : 0);
          setModalParkFeeChild(childFee ? Number(childFee.fee) : 0);
        } else {
          setModalParkFees([]);
          setModalParkFeeAdult(0);
          setModalParkFeeChild(0);
        }
      } catch {
        setModalParkFees([]);
        setModalParkFeeAdult(0);
        setModalParkFeeChild(0);
      }

      const modalRoomTypeList = roomTypes.map((rt: any) => {
        const matchingPrice = prices.find((p) => p.roomType?.id === rt.id);
        return {
          id: String(rt.id),
          roomTypeId: rt.id,
          name: rt.name,
          maxOccupancy: rt.maxOccupancy ?? 2,
          ratePerPersonSharing: matchingPrice?.ratePerPersonSharing ?? null,
          singleRoomRate: matchingPrice?.singleRoomRate ?? null,
          childRate: matchingPrice?.childRate ?? null,
          thirdAdultRate: matchingPrice?.thirdAdultRate ?? null,
        };
      });
      const seen = new Set<number>();
      setModalRoomTypes(
        modalRoomTypeList.filter((r) => {
          if (seen.has(r.roomTypeId)) return false;
          seen.add(r.roomTypeId);
          return true;
        })
      );
    } catch (err: any) {
      setModalFallback({
        type: 'season',
        message: `Failed to load room types: ${err.message || 'Network error'}.`,
      });
      setModalPrices([]);
      setModalRoomTypes([]);
    } finally {
      setModalLoading(false);
    }
  }

  async function onModalRoomTypeChange(roomTypeId: string) {
    setModalRoomTypeId(roomTypeId);
    if (!roomTypeId) return;
    // Determine default rate type based on number of persons:
    // 1 person → single only; even number → pps only; odd > 1 → mixed (user selects)
    const numPersons = numAdults + numChildren;
    if (numPersons === 1) {
      setModalRateType('single');
      setModalAdultAccomTotal(0);
    } else if (numPersons % 2 === 0) {
      setModalRateType('pps');
      setModalSingleRoomRate(0);
      setModalThirdPersonRate(0);
    } else if (numPersons > 0) {
      setModalRateType('mixed');
    } else {
      setModalRateType(null);
    }
    // Use the rate data already embedded in the room type option (pre-loaded
    // in onModalHotelChange). Falls back to modalPrices lookup if needed.
    const selected = modalRoomTypes.find((rt) => rt.id === roomTypeId);
    if (selected) {
      setModalAdultAccomTotal(selected.ratePerPersonSharing || 0);
      setModalSingleRoomRate(selected.singleRoomRate || 0);
      setModalChildAccomTotal(selected.childRate || 0);
      setModalThirdPersonRate(selected.thirdAdultRate || 0);
      setModalIsTriple(!!selected.thirdAdultRate && (selected.ratePerPersonSharing ?? 0) > 0);
    } else {
      setModalAdultAccomTotal(0);
      setModalSingleRoomRate(0);
      setModalChildAccomTotal(0);
      setModalThirdPersonRate(0);
      setModalIsTriple(false);
    }
  }

  function onModalVehicleChange(vehicleId: string) {
    setModalVehicleId(vehicleId);
  }

  /** Calculate transport cost based on vehicle capacity and transport fee from DB.
   * vehiclesNeeded = ceil(totalPax / seats).
   * Both seats and fee per vehicle come ONLY from transport_fees table
   * (matched by vehicle type + season). No data from vehicles table is used.
   */
  function calculateModalTransport(vehicleType: string): { vehiclesNeeded: number; costPerDay: number; vehicleName: string } {
    const transportFee = transportFees.find((tf) => tf.vehicleType === vehicleType);
    if (!transportFee) return { vehiclesNeeded: 0, costPerDay: 0, vehicleName: vehicleType };
    const totalPax = numAdults + numChildren;
    const seats = transportFee.sittingCapacity || 1;
    const vehiclesNeeded = Math.ceil(totalPax / seats);
    const feePerVehicle = transportFee.fee ?? 0;
    const costPerDay = vehiclesNeeded * feePerVehicle;
    return { vehiclesNeeded, costPerDay, vehicleName: transportFee.vehicleType };
  }

  function getModalSelectedPrice(): RoomPrice | undefined {
    if (!modalRoomTypeId) return undefined;
    return modalPrices.find((p: RoomPrice) => String(p.id) === modalRoomTypeId);
  }

  /** Get the active transport fee season ID for a given date. */
  function getActiveTransportSeasonId(dateStr: string): string | null {
    const targetDate = new Date(dateStr + 'T00:00:00Z');
    const season = transportFeeSeasons.find((s) => {
      if (!s.startDate || !s.endDate) return false;
      const sStart = new Date(s.startDate + 'T00:00:00Z');
      const sEnd = new Date(s.endDate + 'T00:00:00Z');
      return sStart <= targetDate && sEnd >= targetDate;
    });
    return season?.id ?? null;
  }

  /** Calculate accommodation total based on traveller count rules:
   * 1 → single room rate; even → double per-sharing × adults; odd > 1 → double/triple.
   */
  function calculateModalAccommodation(price: RoomPrice | undefined): number {
    if (!price) return modalAdultAccomTotal || 0;
    const numAdultsCount = numAdults;

    if (numAdultsCount === 1) {
      return price.singleRoomRate || 0;
    }
    if (numAdultsCount % 2 === 0) {
      return (price.ratePerPersonSharing || 0) * numAdultsCount;
    }
    if (price.roomType.maxOccupancy >= 3 && price.thirdAdultRate && price.ratePerPersonSharing) {
      return (price.ratePerPersonSharing * 2 + price.thirdAdultRate) * Math.ceil(numAdultsCount / 3);
    }
    return (price.ratePerPersonSharing || 0) * numAdultsCount;
  }

  function onModalSave() {
    if (editingDay == null) return;
    const price = getModalSelectedPrice();
    const accomTotal = calculateModalAccommodation(price);
    const hotel = localHotels.find((h) => String(h.id) === modalHotelId);
    const childTotal = numChildren > 0 && childrenAges.length > 0
      ? childrenAges.reduce((sum, age) => sum + getChildCost(age, hotel, price), 0)
      : modalChildAccomTotal;
    const transport = calculateModalTransport(modalVehicleId);
    const finalTransport = modalTransportTotal > 0 ? modalTransportTotal : transport.costPerDay;

    updateRow(editingDay, {
      destinationId: modalDestId ?? null,
      hotelId: modalHotelId || '',
      hotelName: hotel?.name || '',
      adultAccomTotal: modalAdultAccomTotal > 0 ? modalAdultAccomTotal : (numAdults > 0 ? accomTotal / numAdults : 0),
      childAccomTotal: childTotal,
      singleRoomRate: numAdults === 1 && price ? price.singleRoomRate || 0 : modalSingleRoomRate,
      thirdPersonRate: modalThirdPersonRate,
      isTriple: modalIsTriple,
      tripleRate: modalTripleRate,
      selectedRateId: price?.id ?? null,
      parkFeeAdultTotal: modalParkFeeAdult,
      parkFeeChildTotal: modalParkFeeChild,
      transportTotal: finalTransport,
      extraBeds: modalExtraBeds,
      extrasTotal: modalExtrasTotal,
      hasFlight: modalHasFlight,
      flightAdultPP: modalFlightAdultPP,
      flightChildPP: modalFlightChildPP,
      rateType: modalRateType,
    });
    closeDayEditor();
  }

  /** Age-based child cost applying the hotel's child policy:
   * below childFreeAge → free; childFreeAge→childChargeAge → childRate; childChargeAge+ → adult PPS.
   */
  function getChildCost(age: number, hotel: Hotel | undefined, rate: RoomPrice | undefined): number {
    if (!rate) return 0;
    const hasPolicy = hotel?.childFreeAge != null || hotel?.childChargeAge != null;
    if (!hasPolicy) return rate.childRate ?? 0;
    if (hotel.childFreeAge != null && age < hotel.childFreeAge) return 0;
    if (hotel.childChargeAge != null && age < hotel.childChargeAge) return rate.childRate ?? 0;
    return rate.ratePerPersonSharing ?? 0;
  }

  /** Extra bed cost for this day row (hotel extraBedRate × number of extra beds). */
  function getExtraBedCost(row: DayRow): number {
    const hotel = localHotels.find((h) => String(h.id) === row.hotelId);
    return (hotel?.extraBedRate ?? 0) * (row.extraBeds ?? 0);
  }

  useEffect(() => {
    if (!startDate) return;
    dayRows.forEach((row, i) => {
      if (row.hotelId) fetchRates(i, row.hotelId, boardBasis, dayDate(i));
    });
  }, [startDate, boardBasis]);

  const refreshData = async () => {
    // Fetch each endpoint independently so one failure doesn't crash the whole refresh.
    // Sequential-ish (Promise.allSettled) reduces connection-pool pressure vs firing 5 parallel writes.
    const results = await Promise.allSettled([
      fetch('/api/safari-rates/hotels'),
      fetch('/api/safari-rates/destinations'),
      fetch('/api/clients'),
      fetch('/api/bookings?all=1'),
      fetch('/api/transport-fees'),
      fetch('/api/park-fee-seasons'),
    ]);
    const safeJson = async (p: PromiseSettledResult<Response>) => {
      if (p.status !== 'fulfilled') return null;
      const r = p.value;
      if (!r.ok) return null;
      try { return await r.json(); } catch { return null; }
    };
    const [h, d, c, b, tf, pfs] = await Promise.all(results.map(safeJson));
    setLocalHotels(Array.isArray(h) ? h : []);
    setLocalDests(Array.isArray(d) ? d : []);
    setLocalClients(Array.isArray(c) ? c : []);
    setLocalBookings(Array.isArray(b) ? b : []);
    setTransportFees(Array.isArray(tf) ? tf : []);
    setTransportFeeSeasons(Array.isArray(pfs) ? pfs : []);
  };
  useEffect(() => {
    // Fetch once on mount. Focus/visibility re-fetches are intentional user actions
    // (Refresh button) to avoid exhausting the Supabase connection pool.
    refreshData();
    return () => {};
  }, []);

  const createClient = async (name: string) => {
    setIsCreatingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, agentId: agentId || null }),
      });
      if (res.ok) {
        const newClient = await res.json();
        setLocalClients(prev => [...prev, newClient]);
        setClientId(newClient.id);
        setClientSearch(newClient.name);
        return newClient;
      } else {
        throw new Error('Failed to create client');
      }
    } catch (err) {
      console.error(err);
      alert('Could not create client. Please try again.');
      return null;
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleClientSelect = async (client: Client | null, typedName: string) => {
    if (client) {
      setClientId(client.id);
      setClientSearch(client.name);
      setShowClientDropdown(false);
    } else if (typedName.trim()) {
      const newClient = await createClient(typedName.trim());
      if (newClient) {
        setClientId(newClient.id);
        setClientSearch(newClient.name);
        setShowClientDropdown(false);
      }
    }
  };

  const createAgent = async () => {
    if (!agentName.trim()) {
      alert('Please enter an agent name');
      return;
    }
    setCreatingAgent(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName.trim(),
          company: agentCompany.trim() || null,
          email: agentEmail.trim() || null,
          phone: agentPhone.trim() || null,
        }),
      });
      if (res.ok) {
        const newAgent = await res.json();
        setLocalAgents(prev => [...prev, newAgent]);
        setAgentId(newAgent.id);
        setShowAgentCreate(false);
        setAgentName(''); setAgentCompany(''); setAgentEmail(''); setAgentPhone('');
        return newAgent;
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (err) {
      console.error(err);
      alert('Could not create agent. Please try again.');
      return null;
    } finally {
      setCreatingAgent(false);
    }
  };

  function getSelectedRate(row: DayRow): RoomPrice | undefined {
    if (!row.selectedRateId) return undefined;
    return row.availableRates.find(r => r.id === row.selectedRateId);
  }

  function getAccommodationGroupTotal(row: DayRow): number {
    if (row.isTriple) {
      return row.tripleRate;
    }
    const numPersons = numAdults + numChildren;
    const rateType = row.rateType ?? modalRateType;
    if (rateType === 'single' && row.singleRoomRate > 0) {
      return row.singleRoomRate;
    }
    if (rateType === 'pps' && row.adultAccomTotal > 0) {
      return row.adultAccomTotal * numPersons;
    }
    if (rateType === 'mixed' && numPersons > 0) {
      let total = 0;
      if (row.singleRoomRate > 0) {
        total += row.singleRoomRate;
      }
      const remaining = numPersons - (row.singleRoomRate > 0 ? 1 : 0);
      if (remaining > 0 && row.adultAccomTotal > 0) {
        total += row.adultAccomTotal * remaining;
      }
      return total;
    }
    // Fallback: original logic
    if (numAdults === 1 && row.singleRoomRate > 0) {
      return row.singleRoomRate;
    }
    return (row.adultAccomTotal || 0) * numAdults;
  }

  // ── Group-level totals (for the day table / cost-sheet payload) ──
  const accomGroupTotal = dayRows.reduce((s, r) => s + getAccommodationGroupTotal(r), 0);
  const parkGroupTotal = dayRows.reduce((s, r) => s + r.parkFeeAdultTotal + r.parkFeeChildTotal, 0);
  const transportGroupTotal = dayRows.reduce((s, r) => s + r.transportTotal, 0);
  const dailyExtrasTotal = dayRows.reduce((s, r) => s + (r.extrasTotal || 0), 0);
  const flightGroupTotal = dayRows.reduce((s, r) => s + (r.hasFlight ? r.flightAdultPP * numAdults + r.flightChildPP * numChildren : 0), 0);
  const extrasGroupTotal = dayRows.reduce((s, r) => s + (r.extrasTotal || 0), 0);
  const flightAndExtrasGroupTotal = flightGroupTotal + extrasGroupTotal;

  // ── Pure per-person PPS calculation (spreadsheet methodology) ──
  // Accommodation PPS is already per-person — do NOT multiply or divide by passenger count.
  const accommodationPpsTotal = dayRows.reduce((s, r) => s + (r.adultAccomTotal || 0), 0);

  // SRS handled separately — only applies when a single adult travels and books a single room.
  const srsTotal = numAdults === 1
    ? dayRows.reduce((s, r) => s + (r.singleRoomRate > 0 ? r.singleRoomRate : 0), 0)
    : 0;

  const pdfComponents = {
    accommodationPpsTotal,
    parkFeesTotal: parkGroupTotal,
    transportGroupTotal,
    dailyExtrasTotal,
    additionalExtrasTotal: extrasGroupTotal,
    srsTotal,
  };

  // Each option calculates independently with its own pax and markup percentage.
  const optionResults = calculateSafariRates(pdfComponents, options.map((opt) => ({
    pax: opt.pax,
    markupPercent: opt.markup,
  }))).map((r) => ({
    ...r,
    perPersonBase: r.basePps,
    markedUp: r.finalRate,
    profit: r.markupAmount,
  }));

  const selectedTour = tours.find((t) => t.id === tourId);
  const selectedClientObj = localClients.find((c) => c.id === clientId);
  const selectedAgent = localAgents.find((a) => a.id === agentId);
  const selectedBooking = localBookings.find((b) => b.id === bookingId);

  function buildPayload() {
    const safe = (n: number) => (isNaN(n) ? 0 : n);
    const dayRowsJson = JSON.stringify(dayRows.map(r => ({
      destinationId: r.destinationId,
      hotelId: r.hotelId,
      hotelName: r.hotelName,
      adultAccomTotal: r.adultAccomTotal,
      childAccomTotal: r.childAccomTotal,
      singleRoomRate: r.singleRoomRate,
      thirdPersonRate: r.thirdPersonRate,
      parkFeeAdultTotal: r.parkFeeAdultTotal,
      parkFeeChildTotal: r.parkFeeChildTotal,
      transportTotal: r.transportTotal,
      extrasTotal: r.extrasTotal,
      hasFlight: r.hasFlight,
      flightAdultPP: r.flightAdultPP,
      flightChildPP: r.flightChildPP,
      isTriple: r.isTriple,
      tripleRate: r.tripleRate,
      selectedRateId: r.selectedRateId,
      extraBeds: r.extraBeds,
      rateType: r.rateType ?? null,
    })));
    const extrasJson = JSON.stringify(extraItems.filter(e => e.cost > 0));
    // New spreadsheet methodology:
    // Base PPS = Accommodation PPS + Park Fees + (Group Transport / Pax) + Daily Extras + Additional Extras + SRS
    // Accommodation PPS is already per-person — never multiplied/divided by passenger count.
    const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;
    const subtotal = accommodationPpsTotal + parkGroupTotal + transportPerPax + dailyExtrasTotal + extrasGroupTotal + srsTotal;
    const markupAmount = subtotal * (globalMarkup / 100);
    const grandTotal = subtotal + markupAmount;
    const adultUnits = numAdults + numChildren * 0.5;
    const perAdult = adultUnits > 0 ? grandTotal / adultUnits : 0;
    const perChild = numChildren > 0 ? perAdult * 0.5 : 0;
    return {
      bookingId: bookingId || null,
      clientId: clientId || null,
      agentId: agentId || null,
      bookingRef: selectedBooking?.bookingRef || null,
      tourTitle: selectedTour?.title || 'Custom Tour',
      days: numDays,
      numAdults,
      numChildren,
      childrenAges,
      numPax,
      boardBasis,
      currency,
      dayRows: dayRowsJson,
      fileHandlingFee: fileHandling,
      ecoBottle,
      evacInsurance,
      arrivalTransfer: arrivalTotal,
      departureTransfer: departureTotal,
      extras: extrasJson,
      maasaiVillage,
      maasaiCost: maasaiCostTotal,
      subtotal: safe(subtotal),
      markupPercent: globalMarkup,
      markupAmount: safe(markupAmount),
      totalCost: safe(grandTotal),
      perAdultCost: safe(perAdult),
      perChildCost: safe(perChild),
      notes: notes,
    };
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setSaveError('');
    const payload = buildPayload();
    try {
      let res;
      if (currentCostSheetId) {
        res = await fetch(`/api/cost-sheets/${currentCostSheetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/cost-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        const updated = await res.json();
        setCurrentCostSheetId(updated.id);
        setSaved(true);
        await fetchCostSheets();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json();
        setSaveError(err.error || `Save failed (${res.status})`);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    setSaving(true); setSaved(false); setSaveError('');
    const payload = buildPayload();
    delete (payload as any).id;
    try {
      const res = await fetch('/api/cost-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newSheet = await res.json();
        setCurrentCostSheetId(newSheet.id);
        setSaved(true);
        await fetchCostSheets();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json();
        setSaveError(err.error || `Save failed (${res.status})`);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const currentIndex = costSheetsList.findIndex(s => s.id === currentCostSheetId);
  const goPrev = () => { if (currentIndex > 0) loadCostSheet(costSheetsList[currentIndex - 1].id); };
  const goNext = () => { if (currentIndex < costSheetsList.length - 1) loadCostSheet(costSheetsList[currentIndex + 1].id); };

  // Agent creation popup (used in both creation & editing flows)
  const AgentCreatePopup = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowAgentCreate(false)}
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Create New Agent</h3>
          <button
            type="button"
            onClick={() => setShowAgentCreate(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label text-xs block mb-1">Agent Name *</label>
            <input
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="e.g. Safaris Kenya Ltd"
              className="input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="label text-xs block mb-1">Company</label>
            <input
              type="text"
              value={agentCompany}
              onChange={e => setAgentCompany(e.target.value)}
              placeholder="Company name"
              className="input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-xs block mb-1">Email</label>
              <input
                type="email"
                value={agentEmail}
                onChange={e => setAgentEmail(e.target.value)}
                placeholder="email@example.com"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label text-xs block mb-1">Phone</label>
              <input
                type="tel"
                value={agentPhone}
                onChange={e => setAgentPhone(e.target.value)}
                placeholder="+254 700 000000"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={() => setShowAgentCreate(false)}
            className="btn-secondary text-sm px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createAgent}
            disabled={creatingAgent}
            className="btn-primary text-sm px-4"
          >
            {creatingAgent ? 'Creating…' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {showAgentCreate && AgentCreatePopup()}
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h2 className="font-bold text-gray-800 text-lg">💰 Cost Calculator (Excel‑style)</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <button type="button" onClick={refreshData} className="text-xs text-blue-500 hover:underline">🔄 Refresh Data</button>
            {costSheetsList.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="input text-sm w-48"
                  value={currentCostSheetId || ''}
                  onChange={e => loadCostSheet(e.target.value)}
                  disabled={isLoadingSheet}
                >
                  <option value="">— Select version —</option>
                  {costSheetsList.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.createdAt).toLocaleDateString()} – {s.tourTitle} (v{idx+1})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  {currentIndex >= 0 ? `Version ${currentIndex+1} of ${costSheetsList.length}` : ''}
                </span>
                <button
                  onClick={goPrev}
                  disabled={currentIndex <= 0 || isLoadingSheet}
                  className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex >= costSheetsList.length-1 || isLoadingSheet}
                  className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                >
                  Next ▶
                </button>
              </div>
            )}
            <button onClick={handleSaveAsNew} disabled={saving} className="btn-secondary text-sm">📑 Save as New Version</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : '💾 Save Costing Sheet'}</button>
          </div>
        </div>

        {saved && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">✓ Saved{selectedClientObj ? ` and linked to ${selectedClientObj.name}` : ''}.</div>}
        {saveError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{saveError}</div>}

        {/* Section 1: Link to Client / Booking */}
        <div className="bg-white rounded-xl border border-orange-100 p-4 mb-5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">🔗 Link to Client / Booking</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <label className="label text-xs">Client *</label>
              <input
                ref={clientInputRef}
                type="text"
                className="input text-sm"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) setClientId('');
                }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Type client name..."
                autoComplete="off"
              />
              {showClientDropdown && (filteredClients.length > 0 || clientSearch.trim()) && (
                <div ref={clientDropdownRef} className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded shadow-lg">
                  {filteredClients.map(c => (
                    <div key={c.id} className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm" onClick={() => handleClientSelect(c, '')}>{c.name}</div>
                  ))}
                  {!exactMatch && clientSearch.trim() && (
                    <div className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm text-orange-600 border-t" onClick={() => handleClientSelect(null, clientSearch)}>+ Create new client: "{clientSearch}"</div>
                  )}
                  {isCreatingClient && <div className="px-3 py-2 text-gray-400 text-sm">Creating...</div>}
                </div>
              )}
            </div>
            <div>
              <label className="label text-xs">Agent</label>
              <div className="flex items-end gap-2">
                <select className="input text-sm flex-1" value={agentId} onChange={e => setAgentId(e.target.value)}>
                  <option value="">— No agent —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.company ? ` (${a.company})` : ''}</option>)}
                  <option value="__create__">+ Create new agent…</option>
                </select>
                <button
                  type="button"
                  onClick={() => { setShowAgentCreate(true); setAgentId(''); }}
                  className="text-xs text-orange-500 hover:underline px-2"
                  title="Create new agent"
                >
                  +
                </button>
              </div>
              </div>
              <div>
              <label className="label text-xs">Booking (optional)</label>
              <select className="input text-sm" value={bookingId} onChange={e => setBookingId(e.target.value)}>
                <option value="">— Standalone —</option>
                {(clientId ? localBookings.filter(b => b.clientId === clientId) : localBookings).map(b => (
                  <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>
                ))}
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
          {(selectedClientObj || selectedAgent || selectedBooking) && (
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {selectedAgent && <span>🤝 <strong>{selectedAgent.name}</strong>{selectedAgent.company ? ` (${selectedAgent.company})` : ''}</span>}
              {selectedClientObj && <span>👤 <strong>{selectedClientObj.name}</strong></span>}
              {selectedBooking && <span>📋 <strong>{selectedBooking.bookingRef}</strong></span>}
            </div>
          )}
        </div>

        {/* Section 2: Core settings */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-5">
          <div><label className="label text-xs">Adults</label><input type="number" min={0} value={numAdults} onChange={e => setNumAdults(Number(e.target.value))} className="input" /></div>
          <div><label className="label text-xs">Children</label><input type="number" min={0} value={numChildren} onChange={e => setNumChildren(Number(e.target.value))} className="input" /><p className="text-xs text-gray-400 mt-0.5">Total: {numPax}</p></div>
          <div><label className="label text-xs">Days</label><input type="number" min={1} value={numDays} onChange={e => setNumDays(Number(e.target.value))} className="input" /></div>
          <div><label className="label text-xs">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
          <div><label className="label text-xs">Board Basis</label><select className="input" value={boardBasis} onChange={e => setBoardBasis(e.target.value)}>{BOARD_BASIS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}</select></div>
          <div><label className="label text-xs">Currency</label><select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>{['USD','KES','EUR','GBP'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label text-xs">Markup %</label><input type="number" min={0} max={100} value={globalMarkup} onChange={e => setGlobalMarkup(Number(e.target.value))} className="input" /></div>
        </div>

        {/* Section 2.5: Global Transport (vehicle) selection */}
        {/* Vehicle chosen once here; applied as default to each new day row. */}
        <div className="bg-white rounded-xl border border-orange-100 p-4 mb-5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">🚗 Global Transport (Vehicle)</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex-1">
              <label className="label text-xs">Vehicle</label>
              <select
                className="input w-full"
                value={globalVehicleId}
                onChange={e => setGlobalVehicleId(e.target.value)}
              >
                <option value="">— No vehicle —</option>
                {transportFees.map(tf => (
                  <option key={tf.id} value={tf.id}>{tf.vehicleType}</option>
                ))}
              </select>
            </div>
          </div>
          {globalVehicleId && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>Transport per day:</span>
              <span>
                {currency} {(calculateModalTransport(globalVehicleId).costPerDay).toFixed(2)}
              </span>
              <span>Vehicles needed:</span>
              <span>{calculateModalTransport(globalVehicleId).vehiclesNeeded}</span>
            </div>
          )}
        </div>

        {/* Section 3: Day‑by‑day table (read‑only, click to edit) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">🏕 Properties & Costs — Day by Day</h3>
            <p className="text-xs text-gray-400">Click any day row to edit destination, hotel, room type, children, transport & extras.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-orange-100">
            <table className="w-full text-xs">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-14 cursor-pointer" onClick={() => {}}>Day</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Destination</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-600">Hotel / Accommodation</th>
                  {dayRows.some(r => r.rateType === 'pps') && (
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom (per adult)</th>
                  )}
                  {numChildren > 0 && <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Accom (per child)</th>}
                  {dayRows.some(r => r.rateType === 'single' || r.rateType === 'mixed') && (
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Single Room</th>
                  )}
                  {dayRows.some(r => r.rateType === 'mixed') && (
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">3rd Person</th>
                  )}
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Triple?</th>
                  {dayRows.some(r => r.isTriple) && (
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Triple Rate (per room)</th>
                  )}
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Park Fees (group)</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Transport (group)</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Extra Beds</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Daily Extras</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">✈️</th>
                  {dayRows.some(r => r.hasFlight) && (
                    <>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Flight (per adult)</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Flight (per child)</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">Day Total</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Edit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dayDate = startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined;
                  const flightAdultDayTotal = row.hasFlight ? row.flightAdultPP * numAdults : 0;
                  const flightChildDayTotal = row.hasFlight ? row.flightChildPP * numChildren : 0;
                  const accomGroup = getAccommodationGroupTotal(row);
                  const dayTotalBase = accomGroup + row.parkFeeAdultTotal + row.parkFeeChildTotal + row.transportTotal + (row.extrasTotal || 0) + getExtraBedCost(row) + flightAdultDayTotal + flightChildDayTotal;
                  const hotelObj = localHotels.find((h) => String(h.id) === row.hotelId);
                  const destObj = localDests.find((d) => d.id === row.destinationId);
                  return (
                    <tr key={i} className="hover:bg-orange-50/40 cursor-pointer border-b border-orange-20" onClick={() => openDayEditor(i)}>
                      <td className="px-2 py-2">
                        <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i+1}</span>
                        {dayDate && <p className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">{new Date(dayDate).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</p>}
                      </td>
                      <td className="px-2 py-2">{destObj?.name || row.destinationId ? '—' : 'Not set'}</td>
                      <td className="px-2 py-2 min-w-[180px] truncate">{row.hotelName || 'Not set'}{hotelObj ? ` (${hotelObj.stars ? '★'.repeat(hotelObj.stars) : ''})` : ''}</td>
                      <td className="px-2 py-2 text-center">
                        {row.rateType === 'single' ? (
                          currency + fmt2(row.singleRoomRate || 0)
                        ) : (
                          currency + fmt2(row.adultAccomTotal || 0)
                        )}
                      </td>
                      {numChildren > 0 && (
                        <td className="px-2 py-2 text-center">
                          {currency + fmt2(row.childAccomTotal || 0)}
                        </td>
                      )}
                      {row.rateType === 'single' ? (
                        <td className="px-2 py-2 text-center">
                          {currency + fmt2(row.singleRoomRate || 0)}
                        </td>
                      ) : null}
                      {row.rateType === 'mixed' ? (
                        <td className="px-2 py-2 text-center">
                          {currency + fmt2(row.thirdPersonRate || 0)}
                        </td>
                      ) : null}
                      <td className="px-2 py-2 text-center">{row.isTriple ? 'Yes' : 'No'}</td>
                      {row.isTriple && (
                        <td className="px-2 py-2 text-center">{currency} {fmt2(row.tripleRate || 0)}</td>
                      )}
                      <td className="px-2 py-2 text-center">{currency} {fmt2(row.parkFeeAdultTotal + row.parkFeeChildTotal)}</td>
                      <td className="px-2 py-2 text-center">{currency} {fmt2(row.transportTotal || 0)}</td>
                      <td className="px-2 py-2 text-center">{row.extraBeds || 0}</td>
                      <td className="px-2 py-2 text-center">{currency} {fmt2(row.extrasTotal || 0)}</td>
                      <td className="px-2 py-2 text-center">{row.hasFlight ? '✈️' : '—'}</td>
                      {row.hasFlight && (
                        <>
                          <td className="px-2 py-2 text-center">{currency} {fmt2(flightAdultDayTotal)}</td>
                          <td className="px-2 py-2 text-center">{currency} {fmt2(flightChildDayTotal)}</td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right"><p className="font-mono font-bold text-gray-800">{currency} {fmt2(dayTotalBase)}</p><p className="text-gray-400 text-xs">{numPax > 0 ? fmt2(dayTotalBase / numPax) : '0'}/pax</p></td>
                      <td className="px-2 py-2 text-center"><button onClick={(e) => { e.stopPropagation(); openDayEditor(i); }} className="text-xs text-orange-600 hover:underline px-2">✎</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Day Editor Modal */}
        {editingDay !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDayEditor} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Edit Day {editingDay + 1}</h3>
                <button type="button" onClick={closeDayEditor} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="space-y-5">
                {/* Step 1: Destination */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">1. Destination</label>
                  <select
                    className="input w-full"
                    value={modalDestId ?? ''}
                    onChange={e => onModalDestChange(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Select destination —</option>
                    {localDests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {/* Step 2: Hotel */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">2. Hotel</label>
                  <select
                    className="input w-full"
                    value={modalHotelId}
                    onChange={e => onModalHotelChange(e.target.value)}
                    disabled={!modalDestId}
                  >
                    <option value="">— Select hotel —</option>
                    {modalHotels.map(h => (
                      <option key={h.id} value={h.id}>{h.name} · {h.county.name}{h.stars ? ` ${'★'.repeat(h.stars)}` : ''}</option>
                    ))}
                  </select>
                  {!modalDestId && <p className="text-xs text-gray-400 mt-1">Select a destination first</p>}
                </div>

                {/* Step 3: Room Type */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">3. Room Type</label>
                  {modalLoading && <p className="text-xs text-orange-500">Loading room types…</p>}
                  {!modalLoading && modalFallback && (
                    <p className="text-xs text-yellow-600 mt-0.5 mb-2">{modalFallback.message}</p>
                  )}
                  {!modalLoading && modalRoomTypes.length > 0 && (
                    <select
                      className="input w-full"
                      value={modalRoomTypeId}
                      onChange={e => onModalRoomTypeChange(e.target.value)}
                    >
                      <option value="">— Select room type —</option>
                      {modalRoomTypes.map(rt => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} (max {rt.maxOccupancy}) · PPS: {currency} {rt.ratePerPersonSharing?.toFixed(0) ?? '—'} · Single: {currency} {rt.singleRoomRate?.toFixed(0) ?? '—'} · Child: {currency} {rt.childRate?.toFixed(0) ?? '—'} · 3rd Adult: {currency} {rt.thirdAdultRate?.toFixed(0) ?? '—'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 4: Accommodation Rates */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">4. Accommodation Rates</label>
                  {numAdults + numChildren === 0 && (
                    <p className="text-xs text-gray-400 mb-2">Enter Adults/Children above first.</p>
                  )}
                  {numAdults + numChildren > 0 && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {numAdults + numChildren === 1 ? (
                          // Single traveller → only Single Room Rate
                          <div>
                            <label className="label text-xs block mb-1">Single Room Rate</label>
                            <input
                              type="number" min={0} step="0.01"
                              value={modalSingleRoomRate}
                              onChange={e => setModalSingleRoomRate(Number(e.target.value))}
                              className="input w-full font-mono text-sm" placeholder="0"
                            />
                          </div>
                        ) : numAdults + numChildren === 2 ? (
                          // Two persons → only Per Person Sharing
                          <div>
                            <label className="label text-xs block mb-1">Adult Accom (per person)</label>
                            <input
                              type="number" min={0} step="0.01"
                              value={modalAdultAccomTotal}
                              onChange={e => setModalAdultAccomTotal(Number(e.target.value))}
                              className="input w-full font-mono text-sm" placeholder="0"
                            />
                          </div>
                        ) : (
                          // 3+ persons → rate type selector + relevant fields
                          <>
                            <div className="flex items-end gap-2">
                              <label className="label text-xs block">Rate Type</label>
                              <div className="flex gap-1">
                                {RATE_TYPE_OPTIONS.map((rt) => (
                                  <button
                                    key={rt.value}
                                    type="button"
                                    onClick={() => setModalRateType(rt.value)}
                                    className={`px-2 py-1 text-xs border rounded ${
                                      modalRateType === rt.value
                                        ? 'bg-orange-100 text-orange-700 border-orange-500 font-medium'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    {rt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {modalRateType === 'single' && (
                              <div>
                                <label className="label text-xs block mb-1">Single Room Rate</label>
                                <input
                                  type="number" min={0} step="0.01"
                                  value={modalSingleRoomRate}
                                  onChange={e => setModalSingleRoomRate(Number(e.target.value))}
                                  className="input w-full font-mono text-sm" placeholder="0"
                                />
                              </div>
                            )}
                            {modalRateType === 'pps' && (
                              <div>
                                <label className="label text-xs block mb-1">Adult Accom (per person)</label>
                                <input
                                  type="number" min={0} step="0.01"
                                  value={modalAdultAccomTotal}
                                  onChange={e => setModalAdultAccomTotal(Number(e.target.value))}
                                  className="input w-full font-mono text-sm" placeholder="0"
                                />
                              </div>
                            )}
                            {modalRateType === 'mixed' && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="label text-xs block mb-1">Single Room Rate</label>
                                  <input
                                    type="number" min={0} step="0.01"
                                    value={modalSingleRoomRate}
                                    onChange={e => setModalSingleRoomRate(Number(e.target.value))}
                                    className="input w-full font-mono text-sm" placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="label text-xs block mb-1">Adult Accom (per person)</label>
                                  <input
                                    type="number" min={0} step="0.01"
                                    value={modalAdultAccomTotal}
                                    onChange={e => setModalAdultAccomTotal(Number(e.target.value))}
                                    className="input w-full font-mono text-sm" placeholder="0"
                                  />
                                </div>
                                {numChildren > 0 && (
                                  <div>
                                    <label className="label text-xs block mb-1">Child Accom (per child)</label>
                                    <input
                                      type="number" min={0} step="0.01"
                                      value={modalChildAccomTotal}
                                      onChange={e => setModalChildAccomTotal(Number(e.target.value))}
                                      className="input w-full font-mono text-sm" placeholder="0"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="label text-xs block mb-1">3rd Person Rate</label>
                                  <input
                                    type="number" min={0} step="0.01"
                                    value={modalThirdPersonRate}
                                    onChange={e => setModalThirdPersonRate(Number(e.target.value))}
                                    className="input w-full font-mono text-sm" placeholder="0"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {modalRateType === 'mixed' && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={modalIsTriple}
                            onChange={e => setModalIsTriple(e.target.checked)}
                            className="rounded"
                          />
                          <label className="text-xs font-medium text-gray-700 cursor-pointer">Triple Room</label>
                          {modalIsTriple && (
                            <div className="ml-4">
                              <label className="label text-xs block mb-1">Triple Rate (per room)</label>
                              <input
                                type="number" min={0} step="0.01"
                                value={modalTripleRate}
                                onChange={e => setModalTripleRate(Number(e.target.value))}
                                className="input w-32 font-mono text-sm" placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Step 5: Children Ages */}
                {numChildren > 0 && (
                  <div className="border-b border-gray-100 pb-2">
                    <label className="label text-xs block mb-1">5. Child Ages</label>
                    <p className="text-xs text-gray-400 mt-0.5 mb-2">Enter each child's age for age-based pricing.</p>
                    <div className="flex gap-2 flex-wrap">
                      {childrenAges.map((age, idx) => (
                        <input
                          key={idx}
                          type="number"
                          min={0}
                          max={18}
                          value={age}
                          onChange={e => {
                            const next = [...childrenAges];
                            next[idx] = Number(e.target.value) || 0;
                            setChildrenAges(next);
                          }}
                          className="input text-sm w-16"
                          placeholder="Age"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 6: Extra Beds */}
                {numAdults + numChildren > 1 && (
                  <div className="border-b border-gray-100 pb-2">
                    <label className="label text-xs block mb-1">6. Extra Beds</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={modalExtraBeds}
                      onChange={e => setModalExtraBeds(Number(e.target.value))}
                      className="input w-24 font-mono text-sm" placeholder="0"
                    />
                    {modalHotelId && (
                      <p className="text-xs text-gray-400 mt-1">
                        Rate: {currency} {fmt2(localHotels.find((h) => String(h.id) === modalHotelId)?.extraBedRate ?? 0)} / bed
                      </p>
                    )}
                  </div>
                )}

                {/* Step 7: Park Fees */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">7. Park Fees (group total)</label>
                  {modalParkFees.length === 0 && (
                    <p className="text-xs text-gray-400 mb-2">No park fees for this destination.</p>
                  )}
                  {modalParkFees.length > 0 && (
                    <div className="space-y-2">
                      {modalParkFees.map((pf) => {
                        const isAdult = pf.name?.toLowerCase().includes('adult');
                        const isChild = pf.name?.toLowerCase().includes('child');
                        const isSelected = isAdult
                          ? modalParkFeeAdult === pf.fee
                          : isChild
                            ? modalParkFeeChild === pf.fee
                            : false;
                        return (
                          <div key={pf.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const val = e.target.checked ? pf.fee : 0;
                                if (isAdult) setModalParkFeeAdult(val);
                                else if (isChild) setModalParkFeeChild(val);
                              }}
                              className="rounded"
                            />
                            <label className="text-xs text-gray-700 cursor-pointer">
                              {pf.name} — {currency} {pf.fee?.toFixed(0)}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 8: Transport */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">8. Transport</label>
                  <div>
                    <label className="label text-xs block mb-1">Vehicle</label>
                    <select
                      className="input w-full"
                      value={modalVehicleId}
                      onChange={e => onModalVehicleChange(e.target.value)}
                    >
                      <option value="">— No vehicle —</option>
                      {transportFees.map(tf => (
                        <option key={tf.id} value={tf.id}>{tf.vehicleType}</option>
                      ))}
                    </select>
                  </div>
                  {modalVehicleId && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">
                        Pax: {numPax} · Vehicles needed: {calculateModalTransport(modalVehicleId).vehiclesNeeded} ·
                        Calc. cost/day: {currency} {fmt2(calculateModalTransport(modalVehicleId).costPerDay)}
                      </p>
                    </div>
                  )}
                  <div className="mt-2">
                    <label className="label text-xs block mb-1">Transport Total (override)</label>
                    <input
                      type="number" min={0} step="0.01"
                      value={modalTransportTotal}
                      onChange={e => setModalTransportTotal(Number(e.target.value))}
                      className="input w-full font-mono text-sm" placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave 0 to use vehicle-calculated cost.</p>
                  </div>
                </div>

                {/* Step 9: Daily Extras */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">9. Daily Extras</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={modalExtrasTotal}
                    onChange={e => setModalExtrasTotal(Number(e.target.value))}
                    className="input w-full font-mono text-sm" placeholder="0"
                  />
                </div>

                {/* Step 10: Flight */}
                <div className="border-b border-gray-100 pb-2">
                  <label className="label text-xs block mb-1">10. Flight</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={modalHasFlight}
                      onChange={e => setModalHasFlight(e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-xs font-medium text-gray-700 cursor-pointer">Has Flight</label>
                  </div>
                  {modalHasFlight && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs block mb-1">Flight (per adult)</label>
                        <input
                          type="number" min={0} step="0.01"
                          value={modalFlightAdultPP}
                          onChange={e => setModalFlightAdultPP(Number(e.target.value))}
                          className="input w-full font-mono text-sm" placeholder="0"
                        />
                      </div>
                      {numChildren > 0 && (
                        <div>
                          <label className="label text-xs block mb-1">Flight (per child)</label>
                          <input
                            type="number" min={0} step="0.01"
                            value={modalFlightChildPP}
                            onChange={e => setModalFlightChildPP(Number(e.target.value))}
                            className="input w-full font-mono text-sm" placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button type="button" onClick={closeDayEditor} className="btn-secondary text-sm px-4">Cancel</button>
                <button type="button" onClick={onModalSave} disabled={!modalHotelId} className="btn-primary text-sm px-4">
                  {modalLoading ? 'Saving…' : 'Save Day'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extras sections */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div><label className="label">File Handling Fees ({currency}) – total</label><input type="number" min={0} value={fileHandling||''} onChange={e => setFileHandling(Number(e.target.value))} className="input font-mono" placeholder="0" /></div>
          <div><label className="label">Eco Bottle + Water ({currency}) – total</label><input type="number" min={0} value={ecoBottle||''} onChange={e => setEcoBottle(Number(e.target.value))} className="input font-mono" placeholder="0" /></div>
          <div><label className="label">Evacuation Insurance ({currency}) – total</label><input type="number" min={0} value={evacInsurance||''} onChange={e => setEvacInsurance(Number(e.target.value))} className="input font-mono" placeholder="0" /></div>
        </div>

        <div className="border border-orange-100 rounded-xl p-4 mb-5 space-y-3 bg-white">
          <p className="text-sm font-semibold text-gray-700">Transfers <span className="text-xs font-normal text-gray-400">— enter TOTAL cost (not per person)</span></p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]"><input type="checkbox" checked={arrivalTransfer} onChange={e => setArrivalTransfer(e.target.checked)} className="rounded" /><span className="text-sm font-medium text-gray-700">Arrival Transfer (Day 1)</span></label>
            {arrivalTransfer && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Total {currency}:</span><input type="number" min={0} step="0.01" value={arrivalTotal||''} onChange={e => setArrivalTotal(Number(e.target.value))} className="input w-28 font-mono text-sm" placeholder="0" /></div>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]"><input type="checkbox" checked={departureTransfer} onChange={e => setDepartureTransfer(e.target.checked)} className="rounded" /><span className="text-sm font-medium text-gray-700">Departure Transfer (Last Day)</span></label>
            {departureTransfer && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Total {currency}:</span><input type="number" min={0} step="0.01" value={departureTotal||''} onChange={e => setDepartureTotal(Number(e.target.value))} className="input w-28 font-mono text-sm" placeholder="0" /></div>}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-orange-100">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={maasaiVillage} onChange={e => setMaasaiVillage(e.target.checked)} className="rounded" />Maasai Village (optional)</label>
          {maasaiVillage && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Total {currency}:</span><input type="number" min={0} value={maasaiCostTotal||''} onChange={e => setMaasaiCostTotal(Number(e.target.value))} className="input w-24 text-xs py-1.5 font-mono" /></div>}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-700">Additional Extras <span className="text-xs font-normal text-gray-400">(enter total per item)</span></label><button type="button" onClick={() => setExtraItems(p => [...p, {label:'',cost:0}])} className="text-orange-500 text-xs hover:underline">+ Add Item</button></div>
          {extraItems.map((ex, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input value={ex.label} onChange={e => setExtraItems(p => p.map((x,j) => j===idx?{...x,label:e.target.value}:x))} className="input flex-1 text-sm" placeholder="Description" />
              <input type="number" min={0} value={ex.cost||''} onChange={e => setExtraItems(p => p.map((x,j) => j===idx?{...x,cost:Number(e.target.value)}:x))} className="input w-32 font-mono text-sm" placeholder={currency} />
              <button type="button" onClick={() => setExtraItems(p => p.filter((_,j)=>j!==idx))} className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
            </div>
          ))}
        </div>

        {/* Totals section */}
        <div className="bg-white rounded-xl border border-orange-100 overflow-hidden mb-5">
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 font-semibold text-gray-700">📊 Group totals (no markup)</div>
          <div className="p-4 flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-500">Accommodation PPS total:</span> {currency} {fmt2(accommodationPpsTotal)}</div>
            <div><span className="text-gray-500">Park fees (group total):</span> {currency} {fmt2(parkGroupTotal)}</div>
            <div><span className="text-gray-500">Transport (group total):</span> {currency} {fmt2(transportGroupTotal)}</div>
            <div><span className="text-gray-500">Daily extras total:</span> {currency} {fmt2(dailyExtrasTotal)}</div>
            <div><span className="text-gray-500">Additional extras total:</span> {currency} {fmt2(extrasGroupTotal)}</div>
            <div><span className="text-gray-500">SRS total:</span> {currency} {fmt2(srsTotal)}</div>
          </div>
          <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 font-semibold text-gray-700">Option Tables – Per Person Sharing (P.P.S)</div>
          <div className="overflow-x-auto">
            {numPax === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Enter at least 1 adult or child to see pricing options.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-2 text-left">Pax</th><th className="p-2 text-left">Markup %</th><th className="p-2 text-left">Accommodation PPS</th><th className="p-2 text-left">Park Fees</th><th className="p-2 text-left">Transport / pax</th><th className="p-2 text-left">Daily + Addl Extras</th><th className="p-2 text-left">SRS</th><th className="p-2 text-left">Base PPS</th><th className="p-2 text-left">Markup Amt</th><th className="p-2 text-left">Final Rate</th></tr></thead>
                <tbody>
                  {optionResults.map((opt, idx) => (
                    <tr key={opt.pax} className="border-b">
                      <td className="p-2 font-medium">{opt.pax} people</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={opt.markupPercent}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setOptions(prev => prev.map((o, j) => j === idx ? { ...o, markup: val } : o));
                          }}
                          className="input py-1 text-xs font-mono text-center w-16"
                        />
                      </td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.accommodationPpsTotal)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.parkFeesTotal)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.transportPerPerson)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.dailyExtrasTotal + opt.additionalExtrasTotal)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.srsTotal)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.perPersonBase)}</td>
                      <td className="p-2 font-mono">{currency} {fmt2(opt.markupAmount)}</td>
                      <td className={`p-2 font-mono font-bold`}>{currency} {fmt2(opt.finalRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
