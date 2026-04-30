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
};

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!invoice || invoice.error) return <div className="p-8 text-gray-500">Invoice not found. <Link href="/dashboard/invoices" className="text-orange-500 hover:underline">Back</Link></div>;

  const lineItems: any[] = (() => { try { return JSON.parse(invoice.lineItems || '[]'); } catch { return []; } })();
  const fmt2 = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceDue = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
  const isOverdue = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate) < new Date();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{invoice.invoiceNo}</h1>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-600'}`}>{invoice.status}</span>
          {isOverdue && invoice.status !== 'PAID' && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">OVERDUE</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/invoices/${id}/edit`} className="btn-secondary text-sm">✏️ Edit</Link>
          <button onClick={handleDelete} disabled={deleting} className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
            {deleting ? 'Deleting…' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Status quick-update */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Update status:</span>
        {['DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED'].map(s => (
          <button key={s} type="button" disabled={updatingStatus || invoice.status === s}
            onClick={() => updateStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              invoice.status === s ? (STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>{s}</button>
        ))}
      </div>

      {/* Invoice document */}
      <div className="card space-y-6 print:shadow-none" id="invoice-doc">
        {/* Top: Logo + Invoice title */}
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

        {/* Bill To + Booking */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-bold text-gray-800">{invoice.billTo}</p>
            {invoice.billToEmail && <p className="text-sm text-gray-600">{invoice.billToEmail}</p>}
            {invoice.billToPhone && <p className="text-sm text-gray-600">{invoice.billToPhone}</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Booking Reference</p>
            {invoice.booking && (
              <>
                <p className="font-bold text-gray-800 font-mono">{invoice.booking.bookingRef}</p>
                <p className="text-sm text-gray-600">{invoice.booking.client?.name}</p>
                {invoice.booking.tourPackage && <p className="text-xs text-gray-400 mt-1">{invoice.booking.tourPackage.title}</p>}
                {invoice.booking.client?.agent && <p className="text-xs text-gray-400">Agent: {invoice.booking.client.agent.name}</p>}
              </>
            )}
          </div>
        </div>

        {/* Line items */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-500 text-white">
                <th className="text-left px-4 py-2.5 text-xs font-semibold rounded-tl-lg">Description</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold w-16">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold w-32">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold w-32 rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, i: number) => (
                <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{item.qty}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">{invoice.currency} {fmt2(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium text-gray-800">{invoice.currency} {fmt2(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
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
        <button onClick={() => window.print()} className="btn-secondary text-sm">🖨 Print / Save PDF</button>
        <Link href={`/dashboard/bookings/${invoice.booking?.id}`} className="btn-secondary text-sm">📋 View Booking</Link>
      </div>
    </div>
  );
}
