// app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    orderBy: { startDate: 'asc' },
    include: { client: true, tourPackage: true, assignedTo: true },
  });

  const headers = [
    'Booking Ref', 'Client', 'Email', 'Nationality', 'Resident',
    'Tour', 'Start Date', 'End Date', 'Duration Days',
    'Adults', 'Children', 'Status',
    'Total (USD)', 'Paid', 'Balance',
    'Assigned To', 'Created',
  ];

  const rows = bookings.map(b => {
    const days = Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24));
    return [
      b.bookingRef,
      b.client.name,
      b.client.email || '',
      b.client.nationality || '',
      b.isResident ? 'Yes' : 'No',
      b.tourPackage?.title || 'Custom',
      new Date(b.startDate).toLocaleDateString('en-KE'),
      new Date(b.endDate).toLocaleDateString('en-KE'),
      days,
      b.numAdults,
      b.numChildren,
      b.status,
      b.totalAmount || 0,
      b.paidAmount,
      (b.totalAmount || 0) - b.paidAmount,
      b.assignedTo?.name || '',
      new Date(b.createdAt).toLocaleDateString('en-KE'),
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="jae-travel-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
