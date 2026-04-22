// app/dashboard/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [
    totalBookings, activeBookings, totalClients,
    totalVouchers, recentBookings, recentVouchers,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
    prisma.client.count(),
    prisma.voucher.count({ where: { status: 'ACTIVE' } }),
    prisma.booking.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { client: true, tourPackage: true },
    }),
    prisma.voucher.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { booking: { include: { client: true } }, property: true, vehicle: true },
    }),
  ]);

  const stats = [
    { label: 'Total Bookings', value: totalBookings, icon: '📋', color: 'bg-blue-50 text-blue-700', link: '/dashboard/bookings' },
    { label: 'Active Bookings', value: activeBookings, icon: '✅', color: 'bg-green-50 text-green-700', link: '/dashboard/bookings?status=CONFIRMED' },
    { label: 'Total Clients', value: totalClients, icon: '👥', color: 'bg-purple-50 text-purple-700', link: '/dashboard/clients' },
    { label: 'Active Vouchers', value: totalVouchers, icon: '🎫', color: 'bg-orange-50 text-orange-700', link: '/dashboard/vouchers' },
  ];

  const statusColors: Record<string, string> = {
    ENQUIRY: 'badge-enquiry', QUOTED: 'badge-quoted', CONFIRMED: 'badge-confirmed',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening at Jae Travel today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.link} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <span className={`text-2xl p-2 rounded-lg ${s.color}`}>{s.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: '+ New Booking', href: '/dashboard/bookings/new', color: 'btn-primary' },
            { label: '+ New Client', href: '/dashboard/clients/new', color: 'btn-secondary' },
            { label: '+ Hotel Voucher', href: '/dashboard/vouchers/new?type=HOTEL', color: 'btn-secondary' },
            { label: '+ Vehicle Voucher', href: '/dashboard/vouchers/new?type=VEHICLE', color: 'btn-secondary' },
          { label: '+ Flight Voucher',  href: '/dashboard/vouchers/new?type=FLIGHT',  color: 'btn-secondary' },
            { label: '+ Itinerary', href: '/dashboard/itineraries/new', color: 'btn-secondary' },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={a.color}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Bookings</h2>
            <Link href="/dashboard/bookings" className="text-orange-500 text-sm hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentBookings.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No bookings yet</p>
            )}
            {recentBookings.map((b) => (
              <Link key={b.id} href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{b.client.name}</p>
                  <p className="text-xs text-gray-500">{b.bookingRef} · {b.tourPackage?.title || 'Custom Tour'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(b.startDate).toLocaleDateString('en-KE')} – {new Date(b.endDate).toLocaleDateString('en-KE')}
                  </p>
                </div>
                <span className={statusColors[b.status] || 'badge-enquiry'}>{b.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Vouchers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Vouchers</h2>
            <Link href="/dashboard/vouchers" className="text-orange-500 text-sm hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentVouchers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No vouchers yet</p>
            )}
            {recentVouchers.map((v) => (
              <Link key={v.id} href={`/dashboard/vouchers/${v.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {v.voucherNo}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${v.type === 'HOTEL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {v.type}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {v.clientName || v.booking?.client?.name || '—'}
                    {v.property && ` · ${v.property.name}`}
                    {v.vehicle && ` · ${v.vehicle.name}`}
                  </p>
                  {v.checkIn && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(v.checkIn).toLocaleDateString('en-KE')} – {v.checkOut ? new Date(v.checkOut).toLocaleDateString('en-KE') : ''}
                    </p>
                  )}
                </div>
                <span className={v.status === 'ACTIVE' ? 'badge-confirmed' : 'badge-cancelled'}>{v.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
