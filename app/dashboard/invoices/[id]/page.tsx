// app/dashboard/invoices/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-100 text-blue-700',
  PARTIAL:  'bg-yellow-100 text-yellow-700',
  PAID:     'bg-green-100 text-green-700',
  OVERDUE:  'bg-red-100 text-red-700',
  CANCELLED:'bg-gray-100 text-gray-400',
  NONE:     'bg-transparent text-transparent',
};

const STATUS_LIST = ['DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED']
  .map(s => ({ value: s, label: s }));

STATUS_LIST.push({ value: 'NONE', label: "None — don't display" });

interface DayRow {
  destinationId?: number | null;
  destinationName?: string | null;
  hotelName?: string;
  adultAccomTotal?: number;
  childAccomTotal?: number;
  parkFeeAdultTotal?: number;
  parkFeeChildTotal?: number;
  transportTotal?: number;
  hasFlight?: boolean;
  flightAdultPP?: number;
  flightChildPP?: number;
}

interface ExtraItem { label: string; cost: number; }

function parseDayRows(raw: unknown): DayRow[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
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

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(d => { setInvoice(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setInvoice((p: any) => ({ ...p, status: newStatus }));
    setUpdatingStatus(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    router.push('/dashboard/invoices');
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice?.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!invoice || invoice.error) return <div className="p-8 text-gray-500">Invoice not found. <Link href="/dashboard/invoices" className="text-orange-500 hover:underline">Back</Link></div>;

  const fmt2 = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceDue = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
  const isOverdue = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'NONE' && new Date(invoice.dueDate) < new Date();
  const lineItems = (() => { try { return JSON.parse(invoice.lineItems); } catch { return []; } })();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{invoice.invoiceNo}</h1>
          {invoice.status && invoice.status !== 'NONE' && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-600'}`}>{invoice.status}</span>
          )}
          {isOverdue && invoice.status !== 'PAID' && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">OVERDUE</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownloadPDF} disabled={downloading} className="btn-primary text-sm">
            {downloading ? '⏳ Generating...' : '⬇ Download PDF'}
          </button>
          <Link href={`/dashboard/invoices/${id}/edit`} className="btn-secondary text-sm">✏️ Edit</Link>
          <button onClick={handleDelete} disabled={deleting} className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
            {deleting ? 'Deleting…' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Status quick-update */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Update status:</span>
        {STATUS_LIST.map(s => (
          <button key={s.value} type="button" disabled={updatingStatus || invoice.status === s.value}
            onClick={() => updateStatus(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              invoice.status === s.value
                ? (s.value === 'NONE'
                    ? 'bg-gray-200 text-gray-500 ring-2 ring-offset-1 ring-gray-400'
                    : (STATUS_COLORS[s.value] || 'bg-gray-100 text-gray-600') + ' ring-2 ring-offset-1 ring-current')
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>{s.label}</button>
        ))}
      </div>

      {/* Invoice Document */}
      <div className="card space-y-6 print:shadow-none" id="invoice-doc">
        {/* Logo + Title */}
        <div className="flex items-start justify-between pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">JT</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">Jae Travel Expeditions</p>
                <p className="text-xs text-gray-500">info@jaetravel.co.ke · +254 726 485228</p>
                <p className="text-xs text-gray-500">www.jaetravel.co.ke</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-orange-500">INVOICE</p>
            <p className="text-sm font-mono font-bold text-gray-700 mt-1">{invoice.invoiceNo}</p>
            <p className="text-xs text-gray-400 mt-1">
              Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400">
              Due: {new Date(invoice.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Bill To + Booking / Client */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-bold text-gray-800">{invoice.billTo}</p>
            {invoice.billToEmail && <p className="text-sm text-gray-600">{invoice.billToEmail}</p>}
            {invoice.billToPhone && <p className="text-sm text-gray-600">{invoice.billToPhone}</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              {invoice.booking ? 'Booking Reference' : invoice.client ? 'Client' : 'Reference'}
            </p>
            {invoice.booking ? (
              <>
                <p className="font-bold text-gray-800 font-mono">{invoice.booking.bookingRef}</p>
                <p className="text-sm text-gray-600">{invoice.booking.client?.name}</p>
                {invoice.booking.tourPackage && <p className="text-xs text-gray-400 mt-1">{invoice.booking.tourPackage.title}</p>}
                {invoice.booking.client?.agent && <p className="text-xs text-gray-400">Agent: {invoice.booking.client.agent.name}</p>}
              </>
            ) : invoice.client ? (
              <>
                <p className="font-bold text-gray-800">{invoice.client.name}</p>
                {invoice.client.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
                {invoice.client.agent && <p className="text-xs text-gray-400">Agent: {invoice.client.agent.name}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-500">— Standalone Invoice —</p>
            )}
          </div>
        </div>

        {/* Cost Sheet Breakdown (when linked) */}
        {invoice.costSheet && (() => {
          const cs = invoice.costSheet;
          const dayRows = parseDayRows(cs.dayRows);
          const extras = parseExtras(cs.extras);
          const numAdults = Number(cs.numAdults) || 1;
          const numChildren = Number(cs.numChildren) || 0;
          const numPax = numAdults + numChildren;
          const mf = 1 + (Number(cs.markupPercent) || 10) / 100;
          const currency = cs.currency || invoice.currency || 'USD';

          // Calculate breakdown
          let accomGroup = 0, parkGroup = 0, transportGroup = 0, flightGroup = 0;
          dayRows.forEach((row: DayRow) => {
            accomGroup += (row.adultAccomTotal || 0) * numAdults + (row.childAccomTotal || 0) * numChildren;
            parkGroup += (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
            transportGroup += row.transportTotal || 0;
            if (row.hasFlight) flightGroup += (row.flightAdultPP || 0) * numAdults + (row.flightChildPP || 0) * numChildren;
          });
          let extrasTotal = Number(cs.fileHandlingFee || 0) + Number(cs.ecoBottle || 0) + Number(cs.evacInsurance || 0) +
            Number(cs.arrivalTransfer || 0) + Number(cs.departureTransfer || 0) + (cs.maasaiVillage ? Number(cs.maasaiCost || 0) : 0);
          extras.forEach((e: ExtraItem) => extrasTotal += Number(e.cost) || 0);

          const storedPerAdult = Number(cs.perAdultCost) || 0;
          const storedPerChild = Number(cs.perChildCost) || 0;
          const storedSubtotal = Number(cs.subtotal) || 0;
          const storedMarkup = Number(cs.markupAmount) || 0;
          const storedTotal = Number(cs.totalCost) || 0;

          return (
            <div className="border border-orange-200 rounded-xl p-5 bg-orange-50/30">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Cost Sheet Breakdown</p>
                  {cs.tourTitle && <span className="text-sm text-gray-700 font-medium">· {cs.tourTitle}</span>}
                </div>
                <Link href={`/dashboard/cost-sheets/${cs.id}`} className="text-xs text-orange-500 hover:underline font-medium">
                  View Cost Sheet →
                </Link>
              </div>
              <p className="text-xs text-gray-500 mb-3">{cs.days} days · {numAdults}A{numChildren > 0 ? ` + ${numChildren}C` : ''} · {cs.boardBasis || 'FB'} board · {currency}</p>

              {/* Daily breakdown */}
              {dayRows.length > 0 && (
                <div className="overflow-x-auto border rounded-lg mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-orange-500 text-white">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Day</th>
                        <th className="px-2 py-1.5 text-left">Destination</th>
                        <th className="px-2 py-1.5 text-left">Hotel</th>
                        <th className="px-2 py-1.5 text-right">Accom</th>
                        <th className="px-2 py-1.5 text-right">Park Fees</th>
                        <th className="px-2 py-1.5 text-right">Transport</th>
                        <th className="px-2 py-1.5 text-center">Flight</th>
                        <th className="px-2 py-1.5 text-right">Day Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dayRows.map((row: DayRow, idx: number) => {
                        const adultGroup = (row.adultAccomTotal || 0) * numAdults;
                        const childGroup = (row.childAccomTotal || 0) * numChildren;
                        const park = (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
                        const transport = row.transportTotal || 0;
                        const flightG = row.hasFlight ? ((row.flightAdultPP || 0) * numAdults + (row.flightChildPP || 0) * numChildren) : 0;
                        const dayTotal = adultGroup + childGroup + park + transport + flightG;
                        return (
                          <tr key={idx} className="even:bg-gray-50">
                            <td className="px-2 py-1 font-mono">{idx + 1}</td>
                            <td className="px-2 py-1">{row.destinationName || '—'}</td>
                            <td className="px-2 py-1">{row.hotelName || '—'}</td>
                            <td className="px-2 py-1 text-right font-mono">{currency} {fmt2(adultGroup + childGroup)}</td>
                            <td className="px-2 py-1 text-right font-mono text-green-600">{currency} {fmt2(park)}</td>
                            <td className="px-2 py-1 text-right font-mono text-green-600">{currency} {fmt2(transport)}</td>
                            <td className="px-2 py-1 text-center">{row.hasFlight ? '✈️' : '—'}</td>
                            <td className="px-2 py-1 text-right font-mono font-bold">{currency} {fmt2(dayTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fixed costs & extras */}
              {(cs.fileHandlingFee > 0 || cs.ecoBottle > 0 || cs.evacInsurance > 0 || cs.arrivalTransfer > 0 || cs.departureTransfer > 0 || cs.maasaiVillage || extras.length > 0) && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-4">
                  {cs.fileHandlingFee > 0 && <div className="flex justify-between"><span>File Handling</span><span className="font-mono">{currency} {fmt2(cs.fileHandlingFee)}</span></div>}
                  {cs.ecoBottle > 0 && <div className="flex justify-between"><span>Eco Bottle</span><span className="font-mono">{currency} {fmt2(cs.ecoBottle)}</span></div>}
                  {cs.evacInsurance > 0 && <div className="flex justify-between"><span>Evac Insurance</span><span className="font-mono">{currency} {fmt2(cs.evacInsurance)}</span></div>}
                  {cs.arrivalTransfer > 0 && <div className="flex justify-between"><span>Arrival Transfer</span><span className="font-mono">{currency} {fmt2(cs.arrivalTransfer)}</span></div>}
                  {cs.departureTransfer > 0 && <div className="flex justify-between"><span>Departure Transfer</span><span className="font-mono">{currency} {fmt2(cs.departureTransfer)}</span></div>}
                  {cs.maasaiVillage && <div className="flex justify-between"><span>Maasai Village</span><span className="font-mono">{currency} {fmt2(cs.maasaiCost)}</span></div>}
                  {extras.map((e: ExtraItem, i: number) => <div key={i} className="flex justify-between"><span>{e.label}</span><span className="font-mono">{currency} {fmt2(e.cost)}</span></div>)}
                </div>
              )}

              {/* Totals from cost sheet */}
              <div className="flex justify-end"><div className="w-72 space-y-1.5">
                {numChildren > 0 && <div className="flex justify-between text-sm"><span>Per Child Cost</span><span className="font-mono">{currency} {fmt2(storedPerChild)}</span></div>}
                <div className="flex justify-between text-base font-bold text-orange-600 border-t-2 border-orange-300 pt-1.5">
                  <span>Per Adult Cost</span><span className="font-mono">{currency} {fmt2(storedPerAdult)}</span>
                </div>
                <div className="border-t pt-1 space-y-0.5 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Accommodation</span><span className="font-mono">{currency} {fmt2(accomGroup)}</span></div>
                  <div className="flex justify-between"><span>Park Fees</span><span className="font-mono">{currency} {fmt2(parkGroup)}</span></div>
                  <div className="flex justify-between"><span>Transport</span><span className="font-mono">{currency} {fmt2(transportGroup)}</span></div>
                  <div className="flex justify-between"><span>Flights</span><span className="font-mono">{currency} {fmt2(flightGroup)}</span></div>
                  <div className="flex justify-between"><span>Extras & Fees</span><span className="font-mono">{currency} {fmt2(extrasTotal)}</span></div>
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{currency} {fmt2(storedSubtotal)}</span></div>
                  <div className="flex justify-between text-orange-600"><span>Markup ({cs.markupPercent}%)</span><span className="font-mono">{currency} {fmt2(storedMarkup)}</span></div>
                  <div className="flex justify-between font-bold"><span>Grand Total</span><span className="font-mono">{currency} {fmt2(storedTotal)}</span></div>
                </div>
              </div></div>
            </div>
          );
        })()}

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Invoice Items</p>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-16">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">Unit Price</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineItems.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-800">{item.description || item.name || 'Item'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right font-mono">{item.quantity || 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right font-mono">{invoice.currency} {fmt2(item.unitPrice || 0)}</td>
                    <td className="px-3 py-2 text-sm text-gray-800 text-right font-mono font-bold">{invoice.currency} {fmt2(item.total || (item.quantity || 1) * (item.unitPrice || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoice Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-mono">{invoice.currency} {fmt2(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-mono">{invoice.currency} {fmt2(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total Amount</span>
              <span className="font-mono text-gray-900">{invoice.currency} {fmt2(invoice.totalAmount)}</span>
            </div>
            {invoice.depositReceived > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Deposit Received</span>
                <span className="font-mono">− {invoice.currency} {fmt2(invoice.depositReceived)}</span>
              </div>
            )}
            <div className={`flex justify-between text-base font-bold border-t-2 pt-2 ${balanceDue <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              <span>Balance Due</span>
              <span className="font-mono">{invoice.currency} {fmt2(Math.max(0, balanceDue))}</span>
            </div>
          </div>
        </div>

        {/* Payment instructions */}
        {invoice.paymentInstructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs font-bold text-yellow-700 uppercase mb-2">Payment Instructions</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{invoice.paymentInstructions}</pre>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between text-xs text-gray-400">
          <span>Jae Travel Expeditions · www.jaetravel.co.ke</span>
          <span>{invoice.invoiceNo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => window.print()} className="btn-secondary text-sm">🖨 Print</button>
        {invoice.booking && (
          <Link href={`/dashboard/bookings/${invoice.booking.id}`} className="btn-secondary text-sm">📋 View Booking</Link>
        )}
        {invoice.client && (
          <Link href={`/dashboard/clients/${invoice.client.id}`} className="btn-secondary text-sm">👤 View Client</Link>
        )}
      </div>
    </div>
  );
}