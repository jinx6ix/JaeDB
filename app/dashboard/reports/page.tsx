// app/dashboard/reports/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ReportsCharts from './ReportsCharts';
import { Download, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

export default async function ReportsPage() {
  const [
    bookingsByStatus, topTours, vouchersByType, revenueData, upcomingBookings,
    monthlyBookings, recentBookings,
  ] = await Promise.all([
    prisma.booking.groupBy({ by: ['status'], _count: true }),
    prisma.booking.groupBy({ by: ['tourPackageId'], _count: true, orderBy: { _count: { tourPackageId: 'desc' } }, take: 5, where: { tourPackageId: { not: null } } }),
    prisma.voucher.groupBy({ by: ['type'], _count: true }),
    prisma.booking.aggregate({ _sum: { totalAmount: true, paidAmount: true }, where: { status: { not: 'CANCELLED' } } }),
    prisma.booking.findMany({
      where: { startDate: { gte: new Date(), lte: new Date(Date.now()+30*86400000) }, status: { in: ['CONFIRMED','IN_PROGRESS'] } },
      orderBy: { startDate: 'asc' }, include: { client: true, tourPackage: true }, take: 10,
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'asc' }, take: 100, select: { createdAt: true, totalAmount: true, status: true },
    }),
    prisma.booking.findMany({
      orderBy: { startDate: 'asc' }, include: { client: true, tourPackage: true }, take: 50,
      where: { totalAmount: { gt: 0 } },
    }),
  ]);

  const tourIds = topTours.map(t=>t.tourPackageId!).filter(Boolean);
  const tours   = await prisma.tourPackage.findMany({ where: { id: { in: tourIds } } });
  const tourMap = Object.fromEntries(tours.map(t=>[t.id,t.title]));

  const totalRevenue = revenueData._sum.totalAmount || 0;
  const totalPaid    = revenueData._sum.paidAmount  || 0;
  const outstanding  = totalRevenue - totalPaid;

  const monthly: Record<string,number> = {};
  monthlyBookings.forEach(b => {
    const key = new Date(b.createdAt).toLocaleDateString('en-KE',{month:'short',year:'2-digit'});
    monthly[key] = (monthly[key]||0) + (b.totalAmount||0);
  });

  const statusColors: Record<string,string> = {
    ENQUIRY:'badge-enquiry', QUOTED:'badge-quoted', CONFIRMED:'badge-confirmed',
    IN_PROGRESS:'badge-inprogress',
    COMPLETED:'badge-completed', CANCELLED:'badge-cancelled',
  };

  const kpis = [
    {
      label: 'Total Revenue',
      value: `USD ${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0})}`,
      sub: 'all confirmed bookings',
      Icon: DollarSign,
      iconBg: 'bg-gray-50',
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
    },
    {
      label: 'Collected',
      value: `USD ${totalPaid.toLocaleString(undefined,{minimumFractionDigits:0})}`,
      sub: `${totalRevenue>0?Math.round((totalPaid/totalRevenue)*100):0}% of total`,
      Icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    {
      label: 'Outstanding',
      value: `USD ${outstanding.toLocaleString(undefined,{minimumFractionDigits:0})}`,
      sub: 'balance due',
      Icon: AlertCircle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Business overview — all time</p>
        </div>
        <Link href="/api/reports/export" className="btn-secondary">
          <Download size={14} /> Export CSV
        </Link>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(k=>(
          <div key={k.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1.5 ${k.valueColor}`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${k.iconBg} flex-shrink-0`}>
                <k.Icon size={18} className={k.iconColor} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <ReportsCharts
        bookingsByStatus={bookingsByStatus as any[]}
        topTours={topTours.map(t=>({ label: tourMap[t.tourPackageId!]||'Unknown', count: t._count }))}
        vouchersByType={vouchersByType as any[]}
        monthly={monthly}
        totalRevenue={totalRevenue}
        totalPaid={totalPaid}
      />

      {/* Upcoming trips */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 text-sm mb-4">Upcoming Trips (next 30 days)</h2>
        {upcomingBookings.length===0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No upcoming confirmed trips</p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map(b=>(
              <Link key={b.id} href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.client.name}</p>
                  <p className="text-xs text-gray-400">{b.tourPackage?.title||'Custom'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-orange-600">
                    {new Date(b.startDate).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}
                  </p>
                  <p className="text-xs text-gray-400">{b.numAdults} pax</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Revenue table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Revenue by Booking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Booking Ref','Client','Tour','Start Date','Pax','Total','Paid','Balance'].map(h=>(
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.length===0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No data</td></tr>
              )}
              {recentBookings.map(b=>{
                const bal=(b.totalAmount||0)-b.paidAmount;
                return (
                  <tr key={b.id}>
                    <td className="font-mono text-xs font-semibold">{b.bookingRef}</td>
                    <td className="font-medium text-gray-800 text-xs">{b.client.name}</td>
                    <td className="text-gray-400 text-xs max-w-[140px]">
                      <span className="truncate block">{b.tourPackage?.title||'Custom'}</span>
                    </td>
                    <td className="text-gray-400 text-xs">{new Date(b.startDate).toLocaleDateString('en-KE')}</td>
                    <td className="text-gray-600 text-xs text-center">{b.numAdults}</td>
                    <td className="font-mono text-xs font-semibold text-gray-800">{b.currency} {(b.totalAmount||0).toLocaleString()}</td>
                    <td className="font-mono text-xs text-emerald-600">{b.currency} {b.paidAmount.toLocaleString()}</td>
                    <td className={`font-mono text-xs font-bold ${bal>0?'text-red-500':'text-gray-400'}`}>
                      {b.currency} {bal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
