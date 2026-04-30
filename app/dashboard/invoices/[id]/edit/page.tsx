'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LineItem { description: string; qty: number; unitPrice: number; total: number; }

export default function EditInvoicePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [bookings, setBookings] = useState<any[]>([]);

  // Form fields
  const [bookingId,   setBookingId]   = useState('');
  const [billTo,      setBillTo]      = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  const [currency,    setCurrency]    = useState('USD');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [status,      setStatus]      = useState('DRAFT');
  const [depositReceived, setDepositReceived] = useState(0);
  const [taxRate,     setTaxRate]     = useState(0);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [notes,       setNotes]       = useState('');
  const [items,       setItems]       = useState<LineItem[]>([]);
  const [originalTax, setOriginalTax] = useState(0); // stored tax amount for back-calc

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/bookings?all=1').then(r => r.json()),
    ]).then(([inv, bks]) => {
      if (!inv.id) { setLoading(false); return; }
      setBookings(Array.isArray(bks) ? bks : []);
      setBookingId(inv.bookingId || '');
      setBillTo(inv.billTo || '');
      setBillToEmail(inv.billToEmail || '');
      setBillToPhone(inv.billToPhone || '');
      setCurrency(inv.currency || 'USD');
      setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '');
      setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '');
      setStatus(inv.status || 'DRAFT');
      setDepositReceived(inv.depositReceived || 0);
      setPaymentInstructions(inv.paymentInstructions || '');
      setNotes(inv.notes || '');
      setOriginalTax(inv.taxAmount || 0);

      // Back-calculate tax rate from stored amounts
      const sub = inv.subtotal || 0;
      if (sub > 0 && inv.taxAmount > 0) {
        setTaxRate(Math.round((inv.taxAmount / sub) * 100));
      }

      try {
        const parsed = JSON.parse(inv.lineItems || '[]');
        setItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setItems([]);
      }

      setLoading(false);
    });
  }, [id]);

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((item, j) => {
      if (j !== i) return item;
      const updated = { ...item, ...patch };
      updated.total = updated.qty * updated.unitPrice;
      return updated;
    }));
  }

  const subtotal    = items.reduce((s, i) => s + i.total, 0);
  const taxAmount   = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  const balanceDue  = totalAmount - depositReceived;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId, billTo, billToEmail, billToPhone,
        invoiceDate, dueDate, status,
        lineItems: items, subtotal, taxAmount, totalAmount,
        depositReceived, amountPaid: depositReceived,
        currency, paymentInstructions, notes,
      }),
    });
    if (res.ok) {
      router.push(`/dashboard/invoices/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to save');
      setSaving(false);
    }
  }

  const fmt2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/invoices/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Invoice</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {/* Booking */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Booking Link</h2>
          <div>
            <label className="label">Booking</label>
            <select className="input" value={bookingId} onChange={e => setBookingId(e.target.value)}>
              <option value="">— Select booking —</option>
              {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client?.name}</option>)}
            </select>
          </div>
        </div>

        {/* Bill To */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Bill To</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input required className="input" value={billTo} onChange={e => setBillTo(e.target.value)}/>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={billToEmail} onChange={e => setBillToEmail(e.target.value)}/>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={billToPhone} onChange={e => setBillToPhone(e.target.value)}/>
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Date</label>
              <input type="date" className="input" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}/>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" required className="input" value={dueDate} onChange={e => setDueDate(e.target.value)}/>
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                {['USD','KES','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                {['DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Line Items</h2>
            <button type="button" onClick={() => setItems(p => [...p, { description: '', qty: 1, unitPrice: 0, total: 0 }])} className="text-orange-500 text-xs hover:underline">+ Add Line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Description</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-600 w-16">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 w-32">Unit Price</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 w-32">Total</th>
                  <th className="w-8"/>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input className="input text-sm py-1.5 w-full" value={item.description}
                        onChange={e => setItem(i, { description: e.target.value })}
                        placeholder="e.g. Safari Package"/>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} className="input text-sm py-1.5 text-center w-full"
                        value={item.qty} onChange={e => setItem(i, { qty: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} step="0.01" className="input text-sm py-1.5 text-right font-mono w-full"
                        value={item.unitPrice || ''} onChange={e => setItem(i, { unitPrice: Number(e.target.value) })} placeholder="0.00"/>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-800">{fmt2(item.total)}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400 text-xs">No line items. Click + Add Line.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-mono">{currency} {fmt2(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Tax</span>
                <input type="number" min={0} max={100} value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="input w-16 text-sm py-1 text-center"/>
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
              <input type="number" min={0} step="0.01" value={depositReceived || ''}
                onChange={e => setDepositReceived(Number(e.target.value))}
                className="input w-36 text-sm py-1.5 text-right font-mono" placeholder="0.00"/>
            </div>
            <div className={`flex justify-between text-sm font-bold ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              <span>Balance Due</span>
              <span className="font-mono">{currency} {fmt2(Math.max(0, balanceDue))}</span>
            </div>
          </div>
        </div>

        {/* Payment instructions */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Payment Instructions</h2>
          <textarea className="input resize-none h-28 font-mono text-xs" value={paymentInstructions}
            onChange={e => setPaymentInstructions(e.target.value)}/>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none h-20" value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Any notes to include on the invoice…"/>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/dashboard/invoices/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
