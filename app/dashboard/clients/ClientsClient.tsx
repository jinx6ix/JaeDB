'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import DeleteClientButton from '@/components/DeleteClientButton';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
            {query ? ` (filtered from ${clients.length})` : ''}
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary">+ New Client</Link>
      </div>

      {/* Live search */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by name, email, phone, nationality…"
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Phone', 'Nationality', 'Resident', 'Bookings', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">No clients found</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.nationality || '—'}</td>
                <td className="px-4 py-3">
                  {c.isResident
                    ? <span className="badge-confirmed">Resident</span>
                    : <span className="badge-enquiry">Non-Resident</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{c._count.bookings}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-2 items-center">
                    <Link href={`/dashboard/clients/${c.id}`} className="text-orange-500 hover:underline text-xs">View</Link>
                    <Link href={`/dashboard/clients/${c.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs">Edit</Link>
                    {isAdmin && <DeleteClientButton clientId={c.id} clientName={c.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
