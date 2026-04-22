// app/dashboard/clients/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q || '';

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary">+ New Client</Link>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, phone…"
          className="input max-w-sm"
        />
        <button type="submit" className="btn-secondary">Search</button>
        {q && <Link href="/dashboard/clients" className="btn-secondary">Clear</Link>}
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Phone', 'Nationality', 'Resident', 'Bookings', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">No clients found</td></tr>
            )}
            {clients.map((c) => (
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
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/dashboard/clients/${c.id}`} className="text-orange-500 hover:underline text-xs">View</Link>
                    <Link href={`/dashboard/clients/${c.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs">Edit</Link>
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
