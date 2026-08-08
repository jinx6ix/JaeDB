// app/dashboard/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  BookOpen, Users, Ticket, TrendingUp, Plus,
  UserPlus, ArrowRight, CalendarRange,
} from 'lucide-react';

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
    {
      label: 'Total Bookings',
      value: totalBookings,
      Icon: BookOpen,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueBg: 'text-blue-700',
      link: '/dashboard/bookings',
    },
    {
      label: 'Active Bookings',
      value: activeBookings,
      Icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueBg: 'text-emerald-700',
      link: '/dashboard/bookings?status=CONFIRMED',
    },
    {
      label: 'Total Clients',
      value: totalClients,
      Icon: Users,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueBg: 'text-violet-700',
      link: '/dashboard/clients',
    },
    {
      label: 'Active Vouchers',
      value: totalVouchers,
      Icon: Ticket,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueBg: 'text-orange-700',
      link: '/dashboard/vouchers',
    },
  ];

  const quickActions = [
    { label: 'New Booking',         href: '/dashboard/bookings/new',           icon: BookOpen,    primary: true  },
    { label: 'New Client',          href: '/dashboard/clients/new',            icon: UserPlus,    primary: false },
    { label: 'Hotel Voucher',       href: '/dashboard/vouchers/new?type=HOTEL',    icon: Plus,    primary: false },
    { label: 'Vehicle Voucher',     href: '/dashboard/vouchers/new?type=VEHICLE',  icon: Plus,    primary: false },
    { label: 'Flight Voucher',      href: '/dashboard/vouchers/new?type=FLIGHT',   icon: Plus,    primary: false },
    { label: 'New Itinerary',       href: '/dashboard/itineraries/new',        icon: CalendarRange, primary: false },
  ];

  const statusColors: Record<string, string> = {
    ENQUIRY:     'badge-enquiry',
    QUOTED:      'badge-quoted',
    CONFIRMED:   'badge-confirmed',
    IN_PROGRESS: 'badge-inprogress',
    COMPLETED:   'badge-completed',
    CANCELLED:   'badge-cancelled',
  };

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Here's what's happening at Jae Travel today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.link}
            className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{s.label}</p>
                <p className={`text-3xl font-bold mt-1.5 ${s.valueBg}`}>{s.value}</p>
              </div>
              <div className={`${s.iconBg} p-2.5 rounded-xl flex-shrink-0 ml-2`}>
                <s.Icon size={20} className={s.iconColor} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1 group-hover:text-orange-500 transition-colors">
              View all <ArrowRight size={11} />
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 text-sm mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all duration-150 ${
                a.primary
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <a.icon size={14} strokeWidth={2} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Bookings</h2>
            <Link href="/dashboard/bookings" className="flex items-center gap-1 text-orange-500 text-xs font-medium hover:text-orange-600 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No bookings yet</p>
              </div>
            ) : recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.client.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {b.bookingRef} · {b.tourPackage?.title || 'Custom Tour'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(b.startDate).toLocaleDateString('en-KE')} – {new Date(b.endDate).toLocaleDateString('en-KE')}
                  </p>
                </div>
                <span className={`ml-3 flex-shrink-0 ${statusColors[b.status] || 'badge-enquiry'}`}>
                  {b.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Vouchers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Vouchers</h2>
            <Link href="/dashboard/vouchers" className="flex items-center gap-1 text-orange-500 text-xs font-medium hover:text-orange-600 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentVouchers.length === 0 ? (
              <div className="text-center py-8">
                <Ticket size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No vouchers yet</p>
              </div>
            ) : recentVouchers.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/vouchers/${v.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{v.voucherNo}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      v.type === 'HOTEL'   ? 'bg-blue-50 text-blue-600' :
                      v.type === 'FLIGHT'  ? 'bg-sky-50 text-sky-600'   :
                      'bg-green-50 text-green-600'
                    }`}>
                      {v.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {v.clientName || v.booking?.client?.name || '—'}
                    {v.property && ` · ${v.property.name}`}
                    {v.vehicle && ` · ${v.vehicle.name}`}
                  </p>
                  {v.checkIn && (
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(v.checkIn).toLocaleDateString('en-KE')} – {v.checkOut ? new Date(v.checkOut).toLocaleDateString('en-KE') : ''}
                    </p>
                  )}
                </div>
                <span className={`ml-3 flex-shrink-0 ${v.status === 'ACTIVE' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                  {v.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
