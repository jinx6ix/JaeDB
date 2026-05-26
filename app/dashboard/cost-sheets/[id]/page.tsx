'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface DayRow {
  destinationId?: number | null;
  destinationName?: string | null;
  hotelName?: string;
  adultAccomTotal?: number;
  childAccomTotal?: number;
  singleRoomRate?: number;
  parkFeeAdultTotal?: number;
  parkFeeChildTotal?: number;
  transportTotal?: number;
  hasFlight?: boolean;
  flightAdultPP?: number;
  flightChildPP?: number;
}

interface ExtraItem {
  label: string;
  cost: number;
}

interface Destination {
  id: number;
  name: string;
}

interface Hotel {
  id: number;
  name: string;
  county: { id: number; name: string };
}

function parseDayRows(raw: unknown, fallbackDays: number): DayRow[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  let rows: any[] = [];
  if (Array.isArray(parsed)) rows = parsed;
  else if (parsed && typeof parsed === 'object') rows = Object.values(parsed);
  else rows = [];

  return rows.map((row: any) => ({
    destinationId: row.destinationId ?? null,
    destinationName: row.destination ?? row.destinationName ?? null,
    hotelName: row.hotelName ?? '',
    adultAccomTotal: row.adultCostPP ?? row.adultAccomTotal ?? row.adultTotal ?? 0,
    childAccomTotal: row.childCostPP ?? row.childAccomTotal ?? row.childTotal ?? 0,
    singleRoomRate: row.singleRoomRate ?? 0,
    parkFeeAdultTotal: row.parkFeeAdultPP ?? row.parkFeeAdultTotal ?? 0,
    parkFeeChildTotal: row.parkFeeChildPP ?? row.parkFeeChildTotal ?? 0,
    transportTotal: row.transportPP ?? row.transportTotal ?? 0,
    hasFlight: row.hasFlight ?? false,
    flightAdultPP: row.flightAdultPP ?? 0,
    flightChildPP: row.flightChildPP ?? 0,
  }));
}

function parseExtras(raw: unknown): ExtraItem[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function fmt2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CostSheetDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [clientName, setClientName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelSearchTerms, setHotelSearchTerms] = useState<{ [key: number]: string }>({});

  const [editable, setEditable] = useState<{
    clientId: string; agentId: string; bookingId: string; tourTitle: string;
    days: number; numAdults: number; numChildren: number; boardBasis: string;
    currency: string; markupPercent: number; dayRows: DayRow[];
    fileHandlingFee: number; ecoBottle: number; evacInsurance: number;
    arrivalTransfer: number; departureTransfer: number; extras: ExtraItem[];
    maasaiVillage: boolean; maasaiCost: number; notes: string;
  }>({
    clientId: '', agentId: '', bookingId: '', tourTitle: '', days: 0,
    numAdults: 0, numChildren: 0, boardBasis: 'FB', currency: 'USD', markupPercent: 10,
    dayRows: [], fileHandlingFee: 0, ecoBottle: 0, evacInsurance: 0,
    arrivalTransfer: 0, departureTransfer: 0, extras: [], maasaiVillage: false,
    maasaiCost: 0, notes: '',
  });

  // Fetch destinations and hotels for dropdowns
  useEffect(() => {
    Promise.all([
      fetch('/api/safari-rates/destinations').then(r => r.json()),
      fetch('/api/safari-rates/hotels').then(r => r.json()),
    ]).then(([dests, h]) => {
      setDestinations(dests);
      setHotels(h);
    }).catch(console.error);
  }, []);

  const fetchSheet = async () => {
    try {
      const res = await fetch(`/api/cost-sheets/${id}`);
      const data = await res.json();
      setSheet(data);

      // Fallback client/agent names
      if (data.client?.name) setClientName(data.client.name);
      else if (data.clientId) fetch(`/api/clients/${data.clientId}`).then(r=>r.json()).then(c=>setClientName(c.name)).catch(()=>setClientName('Unknown'));
      if (data.agent?.name) setAgentName(data.agent.name);
      else if (data.agentId) fetch(`/api/agents/${data.agentId}`).then(r=>r.json()).then(a=>setAgentName(a.name)).catch(()=>setAgentName('Unknown'));

      setEditable({
        clientId: data.clientId || '', agentId: data.agentId || '', bookingId: data.bookingId || '',
        tourTitle: data.tourTitle || '', days: data.days || 0, numAdults: data.numAdults || 0,
        numChildren: data.numChildren || 0, boardBasis: data.boardBasis || 'FB',
        currency: data.currency || 'USD', markupPercent: data.markupPercent || 10,
        dayRows: parseDayRows(data.dayRows, data.days || 1),
        fileHandlingFee: data.fileHandlingFee || 0, ecoBottle: data.ecoBottle || 0,
        evacInsurance: data.evacInsurance || 0, arrivalTransfer: data.arrivalTransfer || 0,
        departureTransfer: data.departureTransfer || 0, extras: parseExtras(data.extras),
        maasaiVillage: !!data.maasaiVillage, maasaiCost: data.maasaiCost || 0,
        notes: data.notes || '',
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSheet(); }, [id]);

  const updateDayRow = (idx: number, field: keyof DayRow, value: unknown) => {
    setEditable(prev => {
      const newRows = [...prev.dayRows];
      if (!newRows[idx]) newRows[idx] = {};
      newRows[idx] = { ...newRows[idx], [field]: value };
      return { ...prev, dayRows: newRows };
    });
  };

  const updateExtra = (idx: number, field: keyof ExtraItem, value: unknown) => {
    setEditable(prev => {
      const newExtras = [...prev.extras];
      if (!newExtras[idx]) newExtras[idx] = { label: '', cost: 0 };
      newExtras[idx] = { ...newExtras[idx], [field]: value };
      return { ...prev, extras: newExtras };
    });
  };

  const addExtra = () => setEditable(prev => ({ ...prev, extras: [...prev.extras, { label: '', cost: 0 }] }));
  const removeExtra = (idx: number) => setEditable(prev => ({ ...prev, extras: prev.extras.filter((_, i) => i !== idx) }));

  const handleCreateInvoice = async () => {
    if (!confirm('Create an invoice from this cost sheet? This will generate line items based on the costing data.')) return;
    setCreatingInvoice(true);
    try {
      const res = await fetch(`/api/cost-sheets/${id}/invoice`, { method: 'POST' });
      if (res.ok) {
        const invoice = await res.json();
        router.push(`/dashboard/invoices/${invoice.id}`);
      } else {
        const err = await res.json();
        alert(`Failed to create invoice: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const currentCurrency = editable.currency || sheet.currency;
  const mf = 1 + (editable.markupPercent / 100);
  const numPax = editable.numAdults + editable.numChildren;
  const adultUnits = editable.numAdults + editable.numChildren * 0.5;

  const storedSubtotal = Number(sheet.subtotal) || 0;
  const storedMarkup = Number(sheet.markupAmount) || 0;
  const storedTotal = Number(sheet.totalCost) || 0;
  const storedPerAdult = Number(sheet.perAdultCost) || 0;
  const storedPerChild = Number(sheet.perChildCost) || 0;

  let accomPerPersonSum = 0;
  let parkGroupTotal = 0;
  let transportGroupTotal = 0;
  let flightGroupTotal = 0;
  editable.dayRows.forEach(row => {
    const adultPP = row.adultAccomTotal || 0;
    const childPP = row.childAccomTotal || 0;
    const singleRate = row.singleRoomRate || 0;
    let accomGroup = 0;
    if (editable.numAdults === 1 && singleRate > 0) {
      accomGroup = singleRate;
    } else if (editable.numAdults > 1 && singleRate > 0) {
      accomGroup = adultPP * (editable.numAdults - 1) + singleRate;
    } else {
      accomGroup = adultPP * editable.numAdults + childPP * editable.numChildren;
    }
    accomPerPersonSum += accomGroup / numPax;
    parkGroupTotal += (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
    transportGroupTotal += row.transportTotal || 0;
    if (row.hasFlight) {
      flightGroupTotal += (row.flightAdultPP || 0) * editable.numAdults + (row.flightChildPP || 0) * editable.numChildren;
    }
  });

  let extrasTotal = editable.fileHandlingFee + editable.ecoBottle + editable.evacInsurance +
    editable.arrivalTransfer + editable.departureTransfer + (editable.maasaiVillage ? editable.maasaiCost : 0);
  editable.extras.forEach(e => extrasTotal += e.cost || 0);

  const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;
  const calcSubtotal = accomPerPersonSum + parkGroupTotal + transportPerPax + extrasTotal + flightGroupTotal;
  const calcMarkup = storedMarkup > 0 ? storedMarkup : calcSubtotal * (editable.markupPercent / 100);
  const calcGrandTotal = calcSubtotal + calcMarkup;

  const handleSave = async () => {
    setSaving(true); setSaveMessage('');
    const dayRowsArray = editable.dayRows;
    const extrasArray = editable.extras;

    const numPaxToUse = editable.numAdults + editable.numChildren;

    let accomPerPersonSum = 0;
    let parkGroupTotal = 0;
    let transportGroupTotal = 0;
    let flightGroupTotal = 0;
    dayRowsArray.forEach(row => {
      const adultPP = row.adultAccomTotal || 0;
      const childPP = row.childAccomTotal || 0;
      const singleRate = row.singleRoomRate || 0;
      let accomGroup = 0;
      if (editable.numAdults === 1 && singleRate > 0) {
        accomGroup = singleRate;
      } else if (editable.numAdults > 1 && singleRate > 0) {
        accomGroup = adultPP * (editable.numAdults - 1) + singleRate;
      } else {
        accomGroup = adultPP * editable.numAdults + childPP * editable.numChildren;
      }
      accomPerPersonSum += accomGroup / numPaxToUse;
      parkGroupTotal += (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
      transportGroupTotal += row.transportTotal || 0;
      if (row.hasFlight) {
        flightGroupTotal += (row.flightAdultPP || 0) * editable.numAdults + (row.flightChildPP || 0) * editable.numChildren;
      }
    });

    let extrasTotal = editable.fileHandlingFee + editable.ecoBottle + editable.evacInsurance +
      editable.arrivalTransfer + editable.departureTransfer + (editable.maasaiVillage ? editable.maasaiCost : 0);
    editable.extras.forEach(e => extrasTotal += e.cost || 0);

    const transportPerAdult = numPaxToUse > 0 ? transportGroupTotal / numPaxToUse : 0;
    const subtotal = accomPerPersonSum + parkGroupTotal + transportPerAdult + extrasTotal + flightGroupTotal;
    const totalCost = subtotal * mf;
    const perAdultCost = totalCost;
    const perChildCost = perAdultCost * 0.5;

    const payload = {
      ...editable,
      dayRows: JSON.stringify(dayRowsArray),
      extras: JSON.stringify(extrasArray),
      subtotal, markupAmount: totalCost - subtotal, totalCost, perAdultCost, perChildCost,
      numPax: numPaxToUse,
    };

    try {
      const res = await fetch(`/api/cost-sheets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setSaveMessage('Saved successfully'); setIsEditing(false); await fetchSheet(); setTimeout(() => setSaveMessage(''), 3000); }
      else { const err = await res.json(); setSaveMessage(`Error: ${err.error || 'Save failed'}`); }
    } catch (err: any) { setSaveMessage(`Network error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const getFilteredHotels = (destName: string | null | undefined) => {
    if (!destName) return hotels;
    const dest = destinations.find(d => d.name === destName);
    if (!dest) return hotels;
    return hotels.filter(h => h.county.id === dest.id);
  };

  return (
    <div className="max-w-6xl space-y-5 print:space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cost-sheets" className="text-gray-400 hover:text-gray-600 text-sm">← Costing Sheets</Link>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Cost Sheet' : sheet.tourTitle}</h1>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">✏️ Edit Inline</button>
              <button onClick={handleCreateInvoice} disabled={creatingInvoice} className="btn-primary text-sm">
                {creatingInvoice ? '⏳ Creating...' : '🧾 Create Invoice'}
              </button>
              <a href={`/api/cost-sheets/${id}/csv`} target="_blank" className="btn-secondary text-sm">⬇ Download CSV</a>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : '💾 Save Changes'}</button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">Cancel</button>
            </>
          )}
        </div>
      </div>
      {saveMessage && <div className={`rounded-lg px-4 py-2 text-sm ${saveMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{saveMessage}</div>}

      <div className="card space-y-6 print:shadow-none">
        {/* Header */}
        <div className="flex justify-between items-start pb-5 border-b border-gray-100">
          <div><div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center"><span className="text-white font-bold text-lg">JT</span></div><div><p className="font-bold text-gray-900">Jae Travel Expeditions</p><p className="text-xs text-gray-500">info@jaetravel.co.ke · +254 726 485228</p></div></div></div>
          <div className="text-right"><p className="text-3xl font-bold text-orange-500">COST SHEET</p><p className="text-sm font-mono font-bold mt-1">{sheet.id.slice(-8).toUpperCase()}</p><p className="text-xs text-gray-400">Created: {new Date(sheet.createdAt).toLocaleDateString()}</p></div>
        </div>

        {/* Client & Agent */}
        <div className="grid grid-cols-2 gap-6">
          <div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Client</p>{isEditing ? <input className="input w-full" value={editable.clientId} onChange={e => setEditable({...editable, clientId: e.target.value})} placeholder="Client ID" /> : <p className="font-bold text-gray-800">{clientName || sheet.client?.name || '—'}</p>}</div>
          <div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Agent</p>{isEditing ? <input className="input w-full" value={editable.agentId} onChange={e => setEditable({...editable, agentId: e.target.value})} placeholder="Agent ID" /> : <p className="text-gray-800">{agentName || sheet.agent?.name || '—'}</p>}</div>
        </div>

        {/* Tour Details */}
        <div className="border-t pt-4"><p className="text-xs font-bold text-gray-500 uppercase mb-3">Tour Details</p>
          {isEditing ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Tour Title</label><input className="input w-full" value={editable.tourTitle} onChange={e => setEditable({...editable, tourTitle: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3"><div><label>Days</label><input type="number" className="input w-full" value={editable.days} onChange={e => setEditable({...editable, days: Number(e.target.value)})} /></div><div><label>Adults</label><input type="number" className="input w-full" value={editable.numAdults} onChange={e => setEditable({...editable, numAdults: Number(e.target.value)})} /></div><div><label>Children</label><input type="number" className="input w-full" value={editable.numChildren} onChange={e => setEditable({...editable, numChildren: Number(e.target.value)})} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label>Board Basis</label><select className="input w-full" value={editable.boardBasis} onChange={e => setEditable({...editable, boardBasis: e.target.value})}><option>FB</option><option>HB</option><option>BB</option><option>RO</option></select></div><div><label>Currency</label><select className="input w-full" value={editable.currency} onChange={e => setEditable({...editable, currency: e.target.value})}><option>USD</option><option>KES</option><option>EUR</option><option>GBP</option></select></div></div>
              <div><label>Markup (%)</label><input type="number" className="input w-full" value={editable.markupPercent} onChange={e => setEditable({...editable, markupPercent: Number(e.target.value)})} /></div>
            </div>
          ) : (
            <div className="text-sm text-gray-600"><p><span className="font-medium">Title:</span> {sheet.tourTitle}</p><p>{sheet.days} days · {sheet.boardBasis} board · {sheet.numAdults}A{sheet.numChildren ? ` / ${sheet.numChildren}C` : ''} · Markup {sheet.markupPercent}% · Currency {sheet.currency}</p></div>
          )}
        </div>

        {/* Day Table with Destination & Hotel dropdowns */}
        <div><h3 className="text-sm font-bold text-gray-700 mb-2">Daily Breakdown</h3>
          <div className="overflow-x-auto border rounded-lg"><table className="w-full text-sm"><thead className="bg-orange-500 text-white"><tr>
            <th className="px-2 py-2 text-left text-xs">Day</th>
            <th className="px-2 py-2 text-left text-xs">Destination</th>
            <th className="px-2 py-2 text-left text-xs">Hotel</th>
            <th className="px-2 py-2 text-right text-xs">Accom Adult</th>
            <th className="px-2 py-2 text-right text-xs">Accom Child</th>
            <th className="px-2 py-2 text-right text-xs">Single Room</th>
            <th className="px-2 py-2 text-right text-xs">Park Adult</th>
            <th className="px-2 py-2 text-right text-xs">Park Child</th>
            <th className="px-2 py-2 text-right text-xs">Transport</th>
            <th className="px-2 py-2 text-center text-xs">Flight?</th>
            <th className="px-2 py-2 text-right text-xs">Flight Adult</th>
            <th className="px-2 py-2 text-right text-xs">Flight Child</th>
            <th className="px-2 py-2 text-right text-xs">Day Total</th>
          </tr></thead>
            <tbody>{editable.dayRows.map((row, idx) => {
              // Formula: accom/pax + parkFees(as-is) + transport/pax + flights
              const adultPP = row.adultAccomTotal || 0;
              const childPP = row.childAccomTotal || 0;
              const singleRate = row.singleRoomRate || 0;
              let accomGroup = 0;
              if (editable.numAdults === 1 && singleRate > 0) {
                accomGroup = singleRate;
              } else if (editable.numAdults > 1 && singleRate > 0) {
                accomGroup = adultPP * (editable.numAdults - 1) + singleRate;
              } else {
                accomGroup = adultPP * editable.numAdults + childPP * editable.numChildren;
              }
              const parkA = row.parkFeeAdultTotal || 0;
              const parkC = row.parkFeeChildTotal || 0;
              const transport = row.transportTotal || 0;
              const transportPerPax = numPax > 0 ? transport / numPax : 0;
              const flightAPerGroup = row.hasFlight ? (row.flightAdultPP || 0) * editable.numAdults : 0;
              const flightCPerGroup = row.hasFlight ? (row.flightChildPP || 0) * editable.numChildren : 0;
              // dayTotal = (accom/pax) + parkFees + (transport/pax) + flights
              const dayTotal = (accomGroup / numPax) + parkA + parkC + transportPerPax + flightAPerGroup + flightCPerGroup;

              const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                const selectedName = e.target.value;
                updateDayRow(idx, 'destinationName', selectedName || null);
                updateDayRow(idx, 'hotelName', '');
              };
              const filteredHotels = getFilteredHotels(row.destinationName);
              const handleHotelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                const selectedName = e.target.value;
                updateDayRow(idx, 'hotelName', selectedName === '__other' ? '' : selectedName);
              };

              return (<tr key={idx} className="border-b even:bg-gray-50">
                <td className="px-2 py-1 font-mono">{idx+1}</td>
                <td className="px-2 py-1">
                  {isEditing ? (
                    <select className="input text-xs w-32" value={row.destinationName || ''} onChange={handleDestinationChange}>
                      <option value="">— Select destination —</option>
                      {destinations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (row.destinationName || '—')}
                </td>
                <td className="px-2 py-1">
                  {isEditing ? (
                    <select className="input text-xs w-40" value={row.hotelName || ''} onChange={handleHotelChange}>
                      <option value="">— Select hotel —</option>
                      {filteredHotels.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="__other">✏️ Other (type below)</option>
                    </select>
                  ) : (row.hotelName || '—')}
                  {isEditing && row.hotelName && !filteredHotels.some(h => h.name === row.hotelName) && (
                    <input className="input text-xs w-40 mt-1" value={row.hotelName} onChange={e => updateDayRow(idx, 'hotelName', e.target.value)} placeholder="Custom hotel name" />
                  )}
                </td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.adultAccomTotal || 0} onChange={e => updateDayRow(idx, 'adultAccomTotal', Number(e.target.value))} /> : <span className="font-mono">{currentCurrency} {fmt2(accomGroup / numPax)} <span className="text-xs text-gray-400">(@{fmt2(adultPP)}/pp)</span></span>}</td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.childAccomTotal || 0} onChange={e => updateDayRow(idx, 'childAccomTotal', Number(e.target.value))} /> : <span className="font-mono">{editable.numChildren ? `${currentCurrency} ${fmt2(childPP * editable.numChildren / numPax)} <span className="text-xs text-gray-400">(@${fmt2(childPP)}/pp)</span>` : '—'}</span>}</td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.singleRoomRate || 0} onChange={e => updateDayRow(idx, 'singleRoomRate', Number(e.target.value))} /> : <span className="font-mono text-blue-600">{row.singleRoomRate ? `${currentCurrency} ${fmt2(row.singleRoomRate)}` : '—'}</span>}</td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.parkFeeAdultTotal || 0} onChange={e => updateDayRow(idx, 'parkFeeAdultTotal', Number(e.target.value))} /> : <span className="font-mono text-green-600">{currentCurrency} {fmt2(parkA)}</span>}</td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.parkFeeChildTotal || 0} onChange={e => updateDayRow(idx, 'parkFeeChildTotal', Number(e.target.value))} /> : <span className="font-mono text-green-600">{editable.numChildren ? `${currentCurrency} ${fmt2(parkC)}` : '—'}</span>}</td>
                <td className="px-2 py-1 text-right">{isEditing ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.transportTotal || 0} onChange={e => updateDayRow(idx, 'transportTotal', Number(e.target.value))} /> : <span className="font-mono text-green-600">{currentCurrency} {fmt2(transport)} <span className="text-xs text-gray-400">({fmt2(transportPerPax)}/pax)</span></span>}</td>
                <td className="px-2 py-1 text-center">{isEditing ? <input type="checkbox" checked={!!row.hasFlight} onChange={e => updateDayRow(idx, 'hasFlight', e.target.checked)} /> : row.hasFlight ? '✈️' : '—'}</td>
                <td className="px-2 py-1 text-right">{isEditing && row.hasFlight ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.flightAdultPP || 0} onChange={e => updateDayRow(idx, 'flightAdultPP', Number(e.target.value))} /> : row.hasFlight ? <span className="font-mono">{currentCurrency} {fmt2(flightAPerGroup)}</span> : '—'}</td>
                <td className="px-2 py-1 text-right">{isEditing && row.hasFlight ? <input type="number" step="0.01" className="input text-xs w-20 text-right" value={row.flightChildPP || 0} onChange={e => updateDayRow(idx, 'flightChildPP', Number(e.target.value))} /> : row.hasFlight ? <span className="font-mono">{currentCurrency} {fmt2(flightCPerGroup)}</span> : '—'}</td>
                <td className="px-2 py-1 text-right font-mono font-bold">{currentCurrency} {fmt2(dayTotal)}</td>
              </tr>);
            })}</tbody></table></div>
        </div>

        {/* Fixed Costs & Extras (same as before) */}
        <div className="border-t pt-4"><h3 className="text-sm font-bold text-gray-700 mb-3">Fixed Costs & Extras</h3>
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label>File Handling</label><input type="number" className="input w-full" value={editable.fileHandlingFee} onChange={e => setEditable({...editable, fileHandlingFee: Number(e.target.value)})} /></div>
                <div><label>Eco Bottle</label><input type="number" className="input w-full" value={editable.ecoBottle} onChange={e => setEditable({...editable, ecoBottle: Number(e.target.value)})} /></div>
                <div><label>Evac Insurance</label><input type="number" className="input w-full" value={editable.evacInsurance} onChange={e => setEditable({...editable, evacInsurance: Number(e.target.value)})} /></div>
                <div><label>Arrival Transfer</label><input type="number" className="input w-full" value={editable.arrivalTransfer} onChange={e => setEditable({...editable, arrivalTransfer: Number(e.target.value)})} /></div>
                <div><label>Departure Transfer</label><input type="number" className="input w-full" value={editable.departureTransfer} onChange={e => setEditable({...editable, departureTransfer: Number(e.target.value)})} /></div>
              </div>
              <div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={editable.maasaiVillage} onChange={e => setEditable({...editable, maasaiVillage: e.target.checked})} /> Maasai Village</label>{editable.maasaiVillage && <input type="number" className="input w-32" value={editable.maasaiCost} onChange={e => setEditable({...editable, maasaiCost: Number(e.target.value)})} />}</div>
              <div><label>Additional Extras</label>{editable.extras.map((ex, idx) => (<div key={idx} className="flex gap-2 mt-2"><input className="input flex-1" value={ex.label} onChange={e => updateExtra(idx, 'label', e.target.value)} /><input className="input w-28" type="number" value={ex.cost} onChange={e => updateExtra(idx, 'cost', Number(e.target.value))} /><button onClick={() => removeExtra(idx)} className="text-red-500">×</button></div>))}<button onClick={addExtra} className="text-orange-500 text-sm mt-2">+ Add Extra</button></div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-gray-600">
              {editable.fileHandlingFee > 0 && <p>File Handling: {currentCurrency} {fmt2(editable.fileHandlingFee)}</p>}
              {editable.ecoBottle > 0 && <p>Eco Bottle: {currentCurrency} {fmt2(editable.ecoBottle)}</p>}
              {editable.evacInsurance > 0 && <p>Evac Insurance: {currentCurrency} {fmt2(editable.evacInsurance)}</p>}
              {editable.arrivalTransfer > 0 && <p>Arrival Transfer: {currentCurrency} {fmt2(editable.arrivalTransfer)}</p>}
              {editable.departureTransfer > 0 && <p>Departure Transfer: {currentCurrency} {fmt2(editable.departureTransfer)}</p>}
              {editable.maasaiVillage && <p>Maasai Village: {currentCurrency} {fmt2(editable.maasaiCost)}</p>}
              {editable.extras.map((e, i) => <p key={i}>{e.label}: {currentCurrency} {fmt2(e.cost)}</p>)}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end"><div className="w-80 space-y-2">
          {editable.numChildren > 0 && <div className="flex justify-between text-sm"><span>Per Child Cost</span><span className="font-mono">{currentCurrency} {fmt2(storedPerChild)}</span></div>}
          <div className="flex justify-between text-base font-bold border-t-2 border-orange-200 pt-2">
            <span>Per Adult Cost</span><span className="font-mono text-orange-600">{currentCurrency} {fmt2(storedPerAdult)}</span>
          </div>
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Accommodation (group)</span><span className="font-mono">{currentCurrency} {fmt2(accomPerPersonSum)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Park Fees</span><span className="font-mono">{currentCurrency} {fmt2(parkGroupTotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Transport</span><span className="font-mono">{currentCurrency} {fmt2(transportGroupTotal)} <span className="text-gray-400">({fmt2(transportPerPax)}/pax)</span></span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Flights</span><span className="font-mono">{currentCurrency} {fmt2(flightGroupTotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Extras & Fees</span><span className="font-mono">{currentCurrency} {fmt2(extrasTotal)}</span></div>
            <div className="flex justify-between text-sm"><span>Subtotal (per adult)</span><span className="font-mono">{currentCurrency} {fmt2(calcSubtotal)}</span></div>
            <div className="flex justify-between text-sm text-orange-600"><span>Markup ({editable.markupPercent}%)</span><span className="font-mono">{currentCurrency} {fmt2(calcMarkup)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t pt-1"><span>Grand Total</span><span className="font-mono">{currentCurrency} {fmt2(calcGrandTotal)}</span></div>
          </div>
        </div></div>

        {/* Notes */}
        <div><label className="text-xs font-bold text-gray-500 uppercase">Notes</label>{isEditing ? <textarea className="input w-full mt-1" rows={3} value={editable.notes} onChange={e => setEditable({...editable, notes: e.target.value})} /> : sheet.notes && <div className="bg-yellow-50 p-3 rounded text-sm mt-1">{sheet.notes}</div>}</div>

<div className="border-t pt-4 flex justify-between text-xs text-gray-400"><span>Jae Travel Expeditions · www.jaetravel.co.ke</span><span>Cost Sheet #{sheet.id.slice(-8).toUpperCase()}</span></div>
      </div>

      <div className="flex gap-3 print:hidden"><button onClick={() => window.print()} className="btn-secondary text-sm">🖨 Print / Save PDF</button><button onClick={handleCreateInvoice} disabled={creatingInvoice} className="btn-primary text-sm">{creatingInvoice ? '⏳ Creating...' : '🧾 Create Invoice'}</button></div>
    </div>
  );
}