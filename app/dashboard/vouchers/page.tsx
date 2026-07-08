import { prisma } from '@/lib/prisma';
import VouchersClient from './VouchersClient';

export const dynamic = 'force-dynamic';

export default async function VouchersPage() {
  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { include: { client: true } },
      property: true,
      vehicle: true,
      createdBy: true,
    },
  });

  return <VouchersClient vouchers={vouchers as any[]} />;
}
