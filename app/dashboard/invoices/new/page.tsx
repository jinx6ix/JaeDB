'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LineItem { description: string; qty: number; unitPrice: number; total: number; }

export default function NewInvoicePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBookingId  = sp.get('bookingId')  || '';
  const preCostSheetId = sp.get('costSheetId') || '';

  const [bookings, setBookings] = useState<any[]>([]);
  const [selBooking, setSelBooking] = useState<any>(null);
  const [bookingId, setBookingId] = useState(preBookingId);

  const [billTo, setBillTo] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [depositReceived, setDepositReceived] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Account Name: Jae Travel Expeditions Ltd\nAccount No.: 0730285271126\nBank Name: Equity Bank\nBranch: Ngong\nSwift: EQBLKENA'
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unitPrice: 0, total: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [costSheetGrandTotal, setCostSheetGrandTotal] = useState<number | null>(null);

  // Load bookings list (for linking)
  useEffect(() => {
    fetch('/api/bookings?all=1').then(r => r.json()).then(d => {
      setBookings(Array.isArray(d) ? d : []);
    });
  }, []);

  // Pre-fill from booking (if any)
  useEffect(() => {
    if (!bookingId || !bookings.length) return;
    const b = bookings.find((b: any) => b.id === bookingId);
    if (!b) return;
    setSelBooking(b);
    setBillTo(b.client?.name || '');
    setBillToEmail(b.client?.email || '');
    setBillToPhone(b.client?.phone || '');
  }, [bookingId, bookings]);

  // Pre-fill from cost sheet – use its own grand total
  useEffect(() => {
    if (!preCostSheetId) return;
    fetch(`/api/cost-sheets/${preCostSheetId}`).then(r => r.json()).then(cs => {
      if (!cs.id) return;
      setCurrency(cs.currency || 'USD');
      setCostSheetGrandTotal(cs.totalCost); // this is the grand total already computed by the cost sheet

      // If no booking selected, use client info from cost sheet
      if (!bookingId && cs.client) {
        setBillTo(cs.client.name || '');
        setBillToEmail(cs.client.email || '');
        setBillToPhone(cs.client.phone || '');
      }

      // Create a single line item for the entire costing sheet amount
      if (cs.totalCost) {
        setItems([{
          description: `${cs.tourTitle || 'Safari Package'} – as per costing sheet`,
          qty: 1,
          unitPrice: cs.totalCost,
          total: cs.totalCost
        }]);
      }
    });
  }, [preCostSheetId, bookingId]);

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((item, j) => {
      if (j !== i) return item;
      const updated = { ...item, ...patch };
      updated.total = updated.qty * updated.unitPrice;
      return updated;
    }));
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  const balanceDue = totalAmount - depositReceived;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalBookingId = bookingId || null;
    setSaving(true); setError('');
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: finalBookingId,
        billTo, billToEmail, billToPhone,
        invoiceDate, dueDate,
        lineItems: items,
        subtotal, taxAmount, depositReceived,
        totalAmount, amountPaid: depositReceived,
        currency, paymentInstructions, notes, status
      }),
    });
    if (res.ok) {
      const inv = await res.json();
      router.push(`/dashboard/invoices/${inv.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to save');
      setSaving(false);
    }
  }

  const fmt2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {/* Booking link (optional) */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Link to Booking (optional)</h2>
          <div>
            <label className="label">Booking</label>
            <select className="input" value={bookingId} onChange={e => setBookingId(e.target.value)}>
              <option value="">— No booking —</option>
              {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client?.name}</option>)}
            </select>
          </div>
          {selBooking && (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-gray-600">
              Client: <strong>{selBooking.client?.name}</strong>
              {selBooking.tourPackage && <> · Tour: <strong>{selBooking.tourPackage.title}</strong></>}
              {selBooking.startDate && <> · Start: <strong>{new Date(selBooking.startDate).toLocaleDateString('en-KE')}</strong></>}
            </div>
          )}
        </div>

        {/* Bill To */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Bill To</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Name *</label><input required className="input" value={billTo} onChange={e => setBillTo(e.target.value)} placeholder="Client / Company name"/></div>
            <div><label className="label">Email</label><input type="email" className="input" value={billToEmail} onChange={e => setBillToEmail(e.target.value)}/></div>
            <div><label className="label">Phone</label><input className="input" value={billToPhone} onChange={e => setBillToPhone(e.target.value)}/></div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Invoice Date</label><input type="date" className="input" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}/></div>
            <div><label className="label">Due Date *</label><input type="date" required className="input" value={dueDate} onChange={e => setDueDate(e.target.value)}/></div>
            <div><label className="label">Currency</label><select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {['USD','KES','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select></div>
            <div><label className="label">Status</label><select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {[
                { value: 'DRAFT',     label: 'DRAFT' },
                { value: 'SENT',      label: 'SENT' },
                { value: 'PARTIAL',   label: 'PARTIAL' },
                { value: 'PAID',      label: 'PAID' },
                { value: 'OVERDUE',    label: 'OVERDUE' },
                { value: 'CANCELLED',  label: 'CANCELLED' },
                { value: 'NONE',      label: 'None — don\'t display' },
              ].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Line Items</h2>
            <button type="button" onClick={() => setItems(p => [...p, { description: '', qty: 1, unitPrice: 0, total: 0 }])} className="text-orange-500 text-xs hover:underline">+ Add Line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Description</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-gray-600 w-16">Qty</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 w-32">Unit Price</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 w-32">Total</th>
                <th className="w-8"/>
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2"><input className="input text-sm py-1.5 w-full" value={item.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="e.g. Safari Package"/></td>
                    <td className="px-3 py-2"><input type="number" min={1} className="input text-sm py-1.5 text-center w-full" value={item.qty} onChange={e => setItem(i, { qty: Number(e.target.value) })}/></td>
                    <td className="px-3 py-2"><input type="number" min={0} step="0.01" className="input text-sm py-1.5 text-right font-mono w-full" value={item.unitPrice || ''} onChange={e => setItem(i, { unitPrice: Number(e.target.value) })} placeholder="0.00"/></td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-medium">{fmt2(item.total)}</td>
                    <td className="px-3 py-2"><button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-mono">{currency} {fmt2(subtotal)}</span></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Tax</span>
                <input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="input w-16 text-sm py-1 text-center"/>
                <span className="text-sm text-gray-400">%</span>
              </div>
              <span className="font-mono text-sm">{currency} {fmt2(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total Amount</span>
              <span className="font-mono text-green-700">{currency} {fmt2(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Deposit Received</span>
              <input type="number" min={0} step="0.01" value={depositReceived || ''} onChange={e => setDepositReceived(Number(e.target.value))} className="input w-32 text-sm py-1.5 text-right font-mono" placeholder="0.00"/>
            </div>
            <div className={`flex justify-between text-sm font-bold ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              <span>Balance Due</span>
              <span className="font-mono">{currency} {fmt2(Math.max(0, balanceDue))}</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Payment Instructions</h2>
          <textarea className="input resize-none h-28 font-mono text-xs" value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)}/>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none h-20" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes to include on the invoice…"/>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Invoice'}</button>
          <Link href="/dashboard/invoices" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}