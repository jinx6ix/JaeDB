'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/SearchInput';
import DeleteClientButton from '@/components/DeleteClientButton';
import { UserPlus, Users } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  isResident: boolean;
  _count: { bookings: number };
}

export default function ClientsClient({
  clients,
  isAdmin,
}: {
  clients: ClientRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.nationality?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
            {query ? ` of ${clients.length}` : ''}
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary">
          <UserPlus size={16} /> New Client
        </Link>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by name, email, phone, nationality…"
        widthClass="w-full max-w-md"
      />

      {/* Desktop table */}
      <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['Name', 'Email', 'Phone', 'Nationality', 'Resident', 'Bookings', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Users size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No clients found</p>
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                className="cursor-pointer"
              >
                <td className="font-semibold text-gray-900">{c.name}</td>
                <td className="text-gray-500">{c.email || '—'}</td>
                <td className="text-gray-500">{c.phone || '—'}</td>
                <td className="text-gray-500">{c.nationality || '—'}</td>
                <td>
                  {c.isResident
                    ? <span className="badge-confirmed">Resident</span>
                    : <span className="badge-enquiry">Non-Resident</span>}
                </td>
                <td className="text-gray-600 text-center">{c._count.bookings}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 items-center justify-end">
                    <Link href={`/dashboard/clients/${c.id}`} className="text-orange-500 hover:text-orange-600 text-xs font-medium">View</Link>
                    <Link href={`/dashboard/clients/${c.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs font-medium">Edit</Link>
                    {isAdmin && <DeleteClientButton clientId={c.id} clientName={c.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-10">
            <Users size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No clients found</p>
          </div>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => router.push(`/dashboard/clients/${c.id}`)}
            className="card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{c.name}</p>
                {c.email && <p className="text-sm text-gray-500 mt-0.5">{c.email}</p>}
                {c.phone && <p className="text-sm text-gray-400">{c.phone}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {c.nationality && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{c.nationality}</span>
                  )}
                  <span className={c.isResident ? 'badge-confirmed' : 'badge-enquiry'}>
                    {c.isResident ? 'Resident' : 'Non-Resident'}
                  </span>
                  <span className="text-xs text-gray-400">{c._count.bookings} booking{c._count.bookings !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link href={`/dashboard/clients/${c.id}/edit`} className="btn-ghost text-xs py-1.5 px-3">Edit</Link>
                {isAdmin && <DeleteClientButton clientId={c.id} clientName={c.name} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
