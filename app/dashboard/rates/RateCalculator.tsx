'use client';
import { useState, useEffect } from 'react';

interface Tour { id: string; title: string; durationDays: number; durationNights: number; }
interface RateCard {
  id: string; season: string; currency: string;
  basedOn2: number; basedOn4: number; basedOn6: number; basedOn8: number;
  basedOn10?: number|null; basedOn12?: number|null; markupPercent: number;
  includes?: string|null; excludes?: string|null;
}
interface Props { tours: Tour[]; rateCards: (RateCard & { tourPackage: Tour })[]; }

interface DayRow { destination: string; property: string; propertyCostPerPax: number; parkFeePerPax: number; }

const BOARD_BASIS = [
  { code: 'FB', label: 'Full Board' },
  { code: 'HB', label: 'Half Board' },
  { code: 'BB', label: 'Bed & Breakfast' },
  { code: 'RO', label: 'Room Only' },
];

export default function RateCalculator({ tours, rateCards }: Props) {
  const [tourId,       setTourId]       = useState('');
  const [numPax,       setNumPax]       = useState(4);
  const [numDays,      setNumDays]      = useState(1);
  const [numNights,    setNumNights]    = useState(0);
  const [currency,     setCurrency]     = useState('USD');
  const [markup,       setMarkup]       = useState(10);
  const [boardBasis,   setBoardBasis]   = useState('FB');
  const [dayRows,      setDayRows]      = useState<DayRow[]>([]);
  // Global extras
  const [transport,    setTransport]    = useState(0);
  const [fileHandling, setFileHandling] = useState(0);
  const [ecoBottle,    setEcoBottle]    = useState(0);
  const [evacInsurance,setEvacInsurance]= useState(0);
  const [extraItems,   setExtraItems]   = useState<{label:string;cost:number}[]>([]);
  const [maasaiVillage,setMaasaiVillage]= useState(false);
  const [maasaiCost,   setMaasaiCost]   = useState(30);

  // When tour changes, auto-fill days
  useEffect(() => {
    const t = tours.find(t => t.id === tourId);
    if (t) {
      setNumDays(t.durationDays);
      setNumNights(t.durationNights);
      setDayRows(Array.from({ length: t.durationDays }, (_, i) => ({
        destination: '', property: '', propertyCostPerPax: 0, parkFeePerPax: 0,
      })));
    }
  }, [tourId, tours]);

  // Init rows when numDays changes manually
  useEffect(() => {
    setDayRows(prev => {
      if (prev.length === numDays) return prev;
      const rows = Array.from({ length: numDays }, (_, i) =>
        prev[i] || { destination: '', property: '', propertyCostPerPax: 0, parkFeePerPax: 0 }
      );
      return rows;
    });
  }, [numDays]);

  function updateRow(i: number, field: keyof DayRow, value: any) {
    setDayRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  }

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalPropertyCost = dayRows.reduce((s, r) => s + (r.propertyCostPerPax * numPax), 0);
  const totalParkFees     = dayRows.reduce((s, r) => s + (r.parkFeePerPax     * numPax), 0);
  const totalExtras       = extraItems.reduce((s, e) => s + e.cost, 0);
  const maasaiTotal       = maasaiVillage ? maasaiCost * numPax : 0;

  const subtotal = totalPropertyCost + totalParkFees + transport + fileHandling + ecoBottle + evacInsurance + totalExtras + maasaiTotal;
  const markupAmt = subtotal * (markup / 100);
  const grandTotal = subtotal + markupAmt;
  const perPerson  = numPax > 0 ? grandTotal / numPax : 0;

  const selectedTour = tours.find(t => t.id === tourId);

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <h2 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
          💰 Cost Calculator
          <span className="text-sm font-normal text-gray-500">— mirrors costing sheet structure</span>
        </h2>

        {/* Top row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <div className="col-span-2">
            <label className="label">Tour Package (auto-fills days)</label>
            <select className="input" value={tourId} onChange={e => setTourId(e.target.value)}>
              <option value="">— Manual entry —</option>
              {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">No. of Days *</label>
            <input type="number" min={1} value={numDays} onChange={e => setNumDays(Number(e.target.value))} className="input" />
            {selectedTour && <p className="text-xs text-orange-600 mt-0.5">Auto: {selectedTour.durationDays}D/{selectedTour.durationNights}N</p>}
          </div>
          <div>
            <label className="label">No. of Pax *</label>
            <input type="number" min={1} value={numPax} onChange={e => setNumPax(Number(e.target.value))} className="input" />
            <p className="text-xs text-gray-400 mt-0.5">Any number — no bracket restrictions</p>
          </div>
          <div>
            <label className="label">Markup %</label>
            <input type="number" min={0} max={100} value={markup} onChange={e => setMarkup(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="KES">KES</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="label">Board Basis</label>
            <select className="input" value={boardBasis} onChange={e => setBoardBasis(e.target.value)}>
              {BOARD_BASIS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </div>
        </div>

        {/* Day-by-day property + park fees (mirrors costing sheet rows) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">Properties & Park Fees — Day by Day</h3>
            <p className="text-xs text-gray-400">Enter per-person cost per day</p>
          </div>
          <div className="overflow-auto rounded-lg border border-orange-100">
            <table className="w-full text-sm">
              <thead className="bg-orange-100">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-8">Day</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Destination</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Property / Accommodation</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Property Cost/pp ({currency})</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Park Fees/pp ({currency})</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Day Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-50">
                {dayRows.map((row, i) => {
                  const dayTotal = (row.propertyCostPerPax + row.parkFeePerPax) * numPax;
                  return (
                    <tr key={i} className="hover:bg-orange-50/50">
                      <td className="px-3 py-2">
                        <span className="bg-orange-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">{i+1}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.destination} onChange={e => updateRow(i,'destination',e.target.value)}
                          className="input text-xs py-1.5" placeholder="e.g. Masai Mara" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.property} onChange={e => updateRow(i,'property',e.target.value)}
                          className="input text-xs py-1.5" placeholder="e.g. Mara Serena Safari Lodge" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="0.01" value={row.propertyCostPerPax || ''}
                          onChange={e => updateRow(i,'propertyCostPerPax',Number(e.target.value))}
                          className="input text-xs py-1.5 font-mono text-center" placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="0.01" value={row.parkFeePerPax || ''}
                          onChange={e => updateRow(i,'parkFeePerPax',Number(e.target.value))}
                          className="input text-xs py-1.5 font-mono text-center" placeholder="0" />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-700">
                        {currency} {dayTotal.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global extras (match costing sheet rows) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="label">Transport (total, {currency})</label>
            <input type="number" min={0} value={transport || ''} onChange={e => setTransport(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
          <div>
            <label className="label">File Handling Fees ({currency})</label>
            <input type="number" min={0} value={fileHandling || ''} onChange={e => setFileHandling(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
          <div>
            <label className="label">Eco Steel Bottle + Water ({currency})</label>
            <input type="number" min={0} value={ecoBottle || ''} onChange={e => setEcoBottle(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
          <div>
            <label className="label">Evacuation Insurance ({currency})</label>
            <input type="number" min={0} value={evacInsurance || ''} onChange={e => setEvacInsurance(Number(e.target.value))} className="input font-mono" placeholder="0" />
          </div>
        </div>

        {/* Optional: Maasai Village */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-orange-100">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={maasaiVillage} onChange={e => setMaasaiVillage(e.target.checked)} className="rounded" />
            Maasai Village (optional activity)
          </label>
          {maasaiVillage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{currency}/person:</span>
              <input type="number" min={0} value={maasaiCost} onChange={e => setMaasaiCost(Number(e.target.value))}
                className="input w-24 text-xs py-1.5 font-mono" />
              <span className="text-xs text-gray-500">= {currency} {(maasaiCost * numPax).toLocaleString()} total</span>
            </div>
          )}
        </div>

        {/* Additional extras */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Additional Extras</label>
            <button type="button" onClick={() => setExtraItems(p => [...p, { label:'', cost:0 }])}
              className="text-orange-500 text-xs hover:underline">+ Add Item</button>
          </div>
          {extraItems.map((ex, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={ex.label} onChange={e => setExtraItems(p => p.map((x,j) => j===i ? {...x,label:e.target.value} : x))}
                className="input flex-1 text-sm" placeholder="Description" />
              <input type="number" min={0} value={ex.cost||''} onChange={e => setExtraItems(p => p.map((x,j) => j===i ? {...x,cost:Number(e.target.value)} : x))}
                className="input w-32 font-mono text-sm" placeholder={currency} />
              <button type="button" onClick={() => setExtraItems(p => p.filter((_,j) => j!==i))}
                className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-orange-100">
            <p className="font-semibold text-gray-700 mb-4 text-sm">Cost Breakdown — {numPax} pax</p>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Properties (total)',      value: totalPropertyCost },
                { label: 'Park Fees (total)',        value: totalParkFees },
                { label: 'Transport',               value: transport },
                { label: 'File Handling',           value: fileHandling },
                { label: 'Eco Bottle + Water',      value: ecoBottle },
                { label: 'Evacuation Insurance',    value: evacInsurance },
                ...(maasaiVillage ? [{ label: 'Maasai Village', value: maasaiTotal }] : []),
                ...extraItems.filter(e => e.cost > 0).map(e => ({ label: e.label || 'Extra', value: e.cost })),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-mono text-gray-700">{currency} {value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="font-mono">{currency} {subtotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Markup ({markup}%)</span>
                <span className="font-mono">+ {currency} {markupAmt.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl p-5 border border-orange-100">
            <p className="font-semibold text-gray-700 mb-4 text-sm">Summary for {numPax} Pax</p>
            {selectedTour && (
              <p className="text-xs text-gray-500 mb-3">{selectedTour.durationDays} days / {selectedTour.durationNights} nights · {boardBasis}</p>
            )}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center mb-4">
              <p className="text-xs text-green-600 mb-1">Grand Total ({numPax} pax)</p>
              <p className="text-3xl font-bold text-green-700">
                {currency} {grandTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-xs text-orange-600 mb-1">Rate Charged / Person</p>
              <p className="text-2xl font-bold text-orange-600">
                {currency} {perPerson.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
              </p>
              <p className="text-xs text-gray-400 mt-1">Based on {numPax} people sharing</p>
            </div>

            {/* Per-pax table for different group sizes */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">How it changes with group size:</p>
              <div className="grid grid-cols-4 gap-1">
                {[2,4,6,8,10,12,numPax].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(n => {
                  const pp = n > 0 ? grandTotal * (numPax / n) / n : 0;
                  const active = n === numPax;
                  return (
                    <div key={n} className={`text-center py-2 rounded-lg text-xs ${active ? 'bg-orange-500 text-white font-bold' : 'bg-gray-50 text-gray-600'}`}>
                      <div className="font-medium">{n} pax</div>
                      <div className="font-mono">{currency} {pp.toFixed(0)}/pp</div>
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
