// app/dashboard/clients/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        orderBy: { createdAt: 'desc' },
        include: { tourPackage: true },
      },
    },
  });

  if (!client) notFound();

  const statusColors: Record<string, string> = {
    ENQUIRY: 'badge-enquiry', QUOTED: 'badge-quoted', CONFIRMED: 'badge-confirmed',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients" className="text-gray-400 hover:text-gray-600 text-sm">← Clients</Link>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.isResident
            ? <span className="badge-confirmed">Resident</span>
            : <span className="badge-enquiry">Non-Resident</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/clients/${client.id}/edit`} className="btn-secondary">Edit</Link>
          <Link href={`/dashboard/bookings/new?clientId=${client.id}`} className="btn-primary">+ New Booking</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 card space-y-3">
          <h2 className="font-semibold text-gray-800">Client Details</h2>
          {[
            { label: 'Email', value: client.email },
            { label: 'Phone', value: client.phone },
            { label: 'Nationality', value: client.nationality },
            { label: 'Address', value: client.address },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-gray-800 mt-0.5">{value || '—'}</p>
            </div>
          ))}
          {client.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-800 mt-0.5 bg-yellow-50 border border-yellow-100 rounded p-2">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Booking History ({client.bookings.length})</h2>
            <Link href={`/dashboard/bookings/new?clientId=${client.id}`} className="text-orange-500 text-sm hover:underline">+ Add</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Ref', 'Tour', 'Dates', 'Pax', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {client.bookings.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">No bookings yet</td></tr>
              )}
              {client.bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{b.bookingRef}</td>
                  <td className="px-4 py-2.5 text-gray-800">{b.tourPackage?.title || 'Custom'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {new Date(b.startDate).toLocaleDateString('en-KE')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{b.numAdults}A{b.numChildren > 0 ? ` ${b.numChildren}C` : ''}</td>
                  <td className="px-4 py-2.5"><span className={statusColors[b.status]}>{b.status}</span></td>
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/bookings/${b.id}`} className="text-orange-500 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
