// app/dashboard/tours/[id]/flyer/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import FlyerForm from './FlyerForm';

export default async function TourFlyerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const tour = await prisma.tourPackage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      highlights: true,
      flyerHeadline1: true,
      flyerHeadline2: true,
      flyerSubtitle: true,
      flyerHighlights: true,
      images: {
        select: {
          id: true,
          filename: true,
          caption: true,
          isCover: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!tour) notFound();

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return <FlyerForm tour={tour as any} isAdmin={isAdmin} />;
}
