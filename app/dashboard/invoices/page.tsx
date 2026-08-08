'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/SearchInput';
import { FileText, PlusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Invoice {
  id: string; invoiceNo: string; billTo: string; currency: string;
  totalAmount: number; amountPaid: number; depositReceived: number;
  status: string; invoiceDate: string; dueDate: string;
  booking: { id: string; bookingRef: string; client: { id: string; name: string } };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  PARTIAL:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  PAID:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  OVERDUE:  'bg-red-50 text-red-700 ring-1 ring-red-200/60',
  CANCELLED:'bg-gray-100 text-gray-400',
  NONE:     'bg-transparent text-transparent',
};

const STATUS_OPTIONS = [
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'SENT',     label: 'Sent' },
  { value: 'PARTIAL',  label: 'Partial' },
  { value: 'PAID',     label: 'Paid' },
  { value: 'OVERDUE',  label: 'Overdue' },
  { value: 'CANCELLED',label: 'Cancelled' },
  { value: 'NONE',     label: "None" },
];

export default function InvoicesPage() {
  const router = useRouter();
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return invoices.filter(inv => {
      const hasStatus = !statusFilter || inv.status === statusFilter;
      if (!hasStatus) return false;
      if (!needle) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(needle) ||
        inv.billTo.toLowerCase().includes(needle) ||
        inv.booking?.client?.name.toLowerCase().includes(needle) ||
        inv.booking?.bookingRef.toLowerCase().includes(needle)
      );
    });
  }, [invoices, q, statusFilter]);

  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);

  const kpis = [
    { label: 'Total', value: invoices.length, color: 'text-gray-800' },
    { label: 'Outstanding', value: invoices.filter(i => ['SENT','PARTIAL','OVERDUE'].includes(i.status)).length, color: 'text-orange-600' },
    { label: 'Paid', value: invoices.filter(i => i.status === 'PAID').length, color: 'text-emerald-600' },
    { label: 'Overdue', value: invoices.filter(i => i.status === 'OVERDUE').length, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">All client invoices</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          <PlusCircle size={15} /> New Invoice
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="card-sm text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search invoice no, client, booking…"
          widthClass="w-full sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input w-full sm:w-44"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {totalOutstanding > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
            <AlertTriangle size={11} />
            {invoices[0]?.currency || 'USD'} {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['Invoice No', 'Client', 'Booking', 'Bill To', 'Amount', 'Deposit', 'Balance', 'Status', 'Due', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12">
                  <FileText size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No invoices found.</p>
                  <Link href="/dashboard/invoices/new" className="text-orange-500 hover:underline text-xs mt-1 inline-block">Create one →</Link>
                </td>
              </tr>
            )}
            {filtered.map(inv => {
              const balance = inv.totalAmount - inv.amountPaid;
              const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'NONE' && new Date(inv.dueDate) < new Date();
              return (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                  className="cursor-pointer"
                >
                  <td className="font-mono text-xs font-bold text-gray-800">{inv.invoiceNo}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link href={`/dashboard/clients/${inv.booking?.client?.id}`} className="text-orange-500 hover:text-orange-600 text-xs font-medium">
                      {inv.booking?.client?.name || '—'}
                    </Link>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link href={`/dashboard/bookings/${inv.booking?.id || ''}`} className="text-orange-500 hover:text-orange-600 text-xs font-mono font-semibold">
                      {inv.booking?.bookingRef || '—'}
                    </Link>
                  </td>
                  <td className="text-xs text-gray-500 max-w-[110px]">
                    <span className="truncate block">{inv.billTo}</span>
                  </td>
                  <td className="font-mono text-xs font-bold text-gray-900 whitespace-nowrap">
                    {inv.currency} {inv.totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}
                  </td>
                  <td className="font-mono text-xs text-emerald-600 whitespace-nowrap">
                    {inv.depositReceived > 0 ? `${inv.currency} ${inv.depositReceived.toLocaleString(undefined,{minimumFractionDigits:2})}` : '—'}
                  </td>
                  <td className={`font-mono text-xs font-bold whitespace-nowrap ${balance>0?(isOverdue?'text-red-600':'text-orange-600'):'text-emerald-600'}`}>
                    {balance>0 ? `${inv.currency} ${balance.toLocaleString(undefined,{minimumFractionDigits:2})}` : (
                      <span className="flex items-center gap-1"><CheckCircle2 size={12}/> Paid</span>
                    )}
                  </td>
                  <td>
                    {inv.status && inv.status !== 'NONE' ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    ) : <span className="text-gray-200 text-xs">—</span>}
                  </td>
                  <td className={`text-xs whitespace-nowrap ${isOverdue?'text-red-500 font-semibold':'text-gray-400'}`}>
                    {new Date(inv.dueDate).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="text-orange-500 hover:text-orange-600 text-xs font-medium">View</Link>
                      <Link href={`/dashboard/invoices/${inv.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs">Edit</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && (
          <div className="card text-center py-8 text-gray-400">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="card text-center py-10">
            <FileText size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No invoices found</p>
          </div>
        )}
        {filtered.map(inv => {
          const balance = inv.totalAmount - inv.amountPaid;
          const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'NONE' && new Date(inv.dueDate) < new Date();
          return (
            <div
              key={inv.id}
              onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
              className="card cursor-pointer hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-gray-700">{inv.invoiceNo}</span>
                    {inv.status && inv.status !== 'NONE' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                        <AlertTriangle size={11} /> Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{inv.booking?.client?.name || inv.billTo}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{inv.booking?.bookingRef || '—'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                    <span className="font-mono font-bold text-gray-800">{inv.currency} {inv.totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    {balance > 0 ? (
                      <span className={`font-mono font-semibold ${isOverdue?'text-red-500':'text-orange-600'}`}>
                        Balance: {inv.currency} {balance.toLocaleString(undefined,{minimumFractionDigits:2})}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 size={12}/> Paid
                      </span>
                    )}
                    <span className="text-gray-400">
                      Due {new Date(inv.dueDate).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}
                    </span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="flex gap-2 flex-shrink-0">
                  <Link href={`/dashboard/invoices/${inv.id}/edit`} className="btn-ghost text-xs py-1.5 px-3">Edit</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
