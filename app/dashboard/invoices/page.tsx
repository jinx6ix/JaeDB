'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Invoice {
  id: string; invoiceNo: string; billTo: string; currency: string;
  totalAmount: number; amountPaid: number; depositReceived: number;
  status: string; invoiceDate: string; dueDate: string;
  booking: { bookingRef: string; client: { id: string; name: string } };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-100 text-blue-700',
  PARTIAL:  'bg-yellow-100 text-yellow-700',
  PAID:     'bg-green-100 text-green-700',
  OVERDUE:  'bg-red-100 text-red-700',
  CANCELLED:'bg-gray-100 text-gray-400',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => {
      setInvoices(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const filtered = invoices.filter(inv =>
    (!statusFilter || inv.status === statusFilter) &&
    (!q || inv.invoiceNo.toLowerCase().includes(q.toLowerCase()) ||
      inv.billTo.toLowerCase().includes(q.toLowerCase()) ||
      inv.booking?.client?.name.toLowerCase().includes(q.toLowerCase()) ||
      inv.booking?.bookingRef.toLowerCase().includes(q.toLowerCase()))
  );

  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">All client invoices</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">+ New Invoice</Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-gray-800' },
          { label: 'Outstanding', value: invoices.filter(i => ['SENT','PARTIAL','OVERDUE'].includes(i.status)).length, color: 'text-orange-600' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'PAID').length, color: 'text-green-600' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'OVERDUE').length, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} className="input max-w-xs" placeholder="Search invoice no, client, booking…" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">All statuses</option>
          {['DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice No', 'Client', 'Booking', 'Bill To', 'Amount', 'Deposit', 'Balance Due', 'Status', 'Due Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">No invoices. <Link href="/dashboard/invoices/new" className="text-orange-500 hover:underline">Create one →</Link></td></tr>
            )}
            {filtered.map(inv => {
              const balance = inv.totalAmount - inv.amountPaid;
              const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < new Date();
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">{inv.invoiceNo}</td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={`/dashboard/clients/${inv.booking?.client?.id}`} className="text-orange-500 hover:underline">{inv.booking?.client?.name || '—'}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={`/dashboard/bookings/${inv.booking?.id || ''}`} className="text-orange-500 hover:underline font-mono">{inv.booking?.bookingRef || '—'}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{inv.billTo}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-900">{inv.currency} {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-xs font-mono text-green-600">{inv.depositReceived > 0 ? `${inv.currency} ${inv.depositReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className={`px-4 py-3 text-xs font-mono font-bold ${balance > 0 ? (isOverdue ? 'text-red-600' : 'text-orange-600') : 'text-green-600'}`}>
                    {balance > 0 ? `${inv.currency} ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '✓ Paid'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {new Date(inv.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="text-orange-500 hover:underline text-xs">View</Link>
                      <Link href={`/dashboard/invoices/${inv.id}/edit`} className="text-gray-500 hover:underline text-xs">Edit</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
