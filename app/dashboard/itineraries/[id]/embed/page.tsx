// app/dashboard/itineraries/[id]/embed/page.tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EmbedManager from './EmbedManager';

export const dynamic = 'force-dynamic';

export default async function ItineraryEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itinerary = await prisma.itinerary.findUnique({ where: { id } });
  if (!itinerary) notFound();
  const embeds = await prisma.itineraryEmbed.findMany({
    where: { itineraryId: id },
    orderBy: { createdAt: 'desc' },
  });
  const baseUrl = process.env.PUBLIC_BASE_URL || '';
  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <a href={`/dashboard/itineraries/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← {itinerary.title}</a>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embed "{itinerary.title}"</h1>
        <p className="text-gray-500 text-sm mt-1">Generate a public link you can put on another website (or inside an iframe). Each token is unique.</p>
      </div>
      <EmbedManager itineraryId={id} embeds={embeds.map((e) => ({
        id: e.id, token: e.token, label: e.label, visits: e.visits,
        expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      }))} baseUrl={baseUrl} />
    </div>
  );
}
