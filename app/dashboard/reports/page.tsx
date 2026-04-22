// app/dashboard/reports/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ReportsCharts from './ReportsCharts';

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

  // Build monthly revenue for chart
  const monthly: Record<string,number> = {};
  monthlyBookings.forEach(b => {
    const key = new Date(b.createdAt).toLocaleDateString('en-KE',{month:'short',year:'2-digit'});
    monthly[key] = (monthly[key]||0) + (b.totalAmount||0);
  });

  const statusColors: Record<string,string> = {
    ENQUIRY:'badge-enquiry', QUOTED:'badge-quoted', CONFIRMED:'badge-confirmed',
    IN_PROGRESS:'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
    COMPLETED:'badge-completed', CANCELLED:'badge-cancelled',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Business overview — all time</p>
        </div>
        <Link href="/api/reports/export" className="btn-secondary">⬇ Export CSV</Link>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Revenue', value:`USD ${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0})}`, sub:'all confirmed bookings', color:'text-gray-900' },
          { label:'Collected', value:`USD ${totalPaid.toLocaleString(undefined,{minimumFractionDigits:0})}`, sub:`${totalRevenue>0?Math.round((totalPaid/totalRevenue)*100):0}% of total`, color:'text-green-700' },
          { label:'Outstanding', value:`USD ${outstanding.toLocaleString(undefined,{minimumFractionDigits:0})}`, sub:'balance due', color:'text-red-600' },
        ].map(k=>(
          <div key={k.label} className="card">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts — client component */}
      <ReportsCharts
        bookingsByStatus={bookingsByStatus as any[]}
        topTours={topTours.map(t=>({ label: tourMap[t.tourPackageId!]||'Unknown', count: t._count }))}
        vouchersByType={vouchersByType as any[]}
        monthly={monthly}
        totalRevenue={totalRevenue}
        totalPaid={totalPaid}
      />

      {/* Upcoming */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Upcoming Trips (30 days)</h2>
        {upcomingBookings.length===0 ? (
          <p className="text-gray-400 text-sm">No upcoming confirmed trips</p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map(b=>(
              <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{b.client.name}</p>
                  <p className="text-xs text-gray-500">{b.tourPackage?.title||'Custom'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-orange-600">{new Date(b.startDate).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</p>
                  <p className="text-xs text-gray-400">{b.numAdults} pax</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Revenue table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Revenue by Booking</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Booking Ref','Client','Tour','Start Date','Pax','Total','Paid','Balance'].map(h=>(
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentBookings.length===0&&<tr><td colSpan={8} className="text-center text-gray-400 py-8">No data</td></tr>}
            {recentBookings.map(b=>{
              const bal=(b.totalAmount||0)-b.paidAmount;
              return (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{b.bookingRef}</td>
                  <td className="px-4 py-2.5">{b.client.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{b.tourPackage?.title||'Custom'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(b.startDate).toLocaleDateString('en-KE')}</td>
                  <td className="px-4 py-2.5">{b.numAdults}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{b.currency} {(b.totalAmount||0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-green-700">{b.currency} {b.paidAmount.toLocaleString()}</td>
                  <td className={`px-4 py-2.5 font-mono text-xs font-bold ${bal>0?'text-red-600':'text-gray-400'}`}>{b.currency} {bal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
