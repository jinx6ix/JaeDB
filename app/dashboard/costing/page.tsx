// app/dashboard/costing/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import RateCalculator from './RateCalculator';
import RateCardsClient from './RateCardsClient';
import { Download, PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ sheetId?: string }> }) {
  const { sheetId } = await searchParams;
  const [tours, rateCards, clients, agents, bookings, hotels, destinations, initialCostSheet] = await Promise.all([
    prisma.tourPackage.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }),
    prisma.rateCard.findMany({ orderBy: { createdAt: 'desc' }, include: { tourPackage: true } }),
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, agentId: true, agent: { select: { id: true, name: true, company: true } } },
    }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, company: true } }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, bookingRef: true, clientId: true, tourPackageId: true, client: { select: { name: true } } },
    }),
    prisma.sRHotel.findMany({
      orderBy: [{ county: { name: 'asc' } }, { stars: 'desc' }, { name: 'asc' }],
      include: { county: { select: { id: true, name: true } } },
    }),
    prisma.sRCounty.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    sheetId
      ? prisma.costSheet.findUnique({
          where: { id: sheetId },
          include: { client: true, agent: true, booking: { include: { client: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rates & Costing</h1>
          <p className="text-gray-500 text-sm mt-0.5">Build a linked costing sheet for any client</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/rate-cards/csv" className="btn-secondary"><Download size={14} /> CSV</a>
          <Link href="/dashboard/costing/new" className="btn-primary"><PlusCircle size={14} /> New Rate Card</Link>
        </div>
      </div>

      {/* Interactive Cost Calculator */}
      <RateCalculator
        tours={tours as any[]}
        rateCards={rateCards as any[]}
        clients={clients as any[]}
        agents={agents as any[]}
        bookings={bookings as any[]}
        hotels={hotels as any[]}
        destinations={destinations as any[]}
        initialCostSheet={initialCostSheet as any}
      />

      {/* Rate Cards Table with live search */}
      <RateCardsClient rateCards={rateCards as any[]} />
    </div>
  );
}
