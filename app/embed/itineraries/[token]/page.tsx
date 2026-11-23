// app/embed/itineraries/[token]/page.tsx
// Public-facing itinerary page rendered inside an <iframe> on external sites.

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const embed = await prisma.itineraryEmbed.findUnique({
    where: { token },
    include: { itinerary: { include: { days: { orderBy: { dayNumber: 'asc' }, include: { images: true } } } } },
  });
  if (!embed || !embed.itinerary) notFound();
  if (embed.expiresAt && new Date(embed.expiresAt) < new Date()) {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}><p style={{ color: '#dc2626' }}>This itinerary link has expired.</p></div>;
  }
  void prisma.itineraryEmbed.update({ where: { id: embed.id }, data: { visits: { increment: 1 } } }).catch(() => null);

  const it = embed.itinerary;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{it.title}</title>
        <style>{`
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background: #fff; }
          .wrap { max-width: 760px; margin: 0 auto; padding: 16px; }
          .hero { background: #1a1a2e; color: #fff; padding: 24px 16px; border-radius: 12px; margin-bottom: 16px; }
          .hero h1 { margin: 0 0 6px; font-size: 22px; }
          .hero p { margin: 0; color: #fdba74; font-size: 13px; }
          .day { border: 1px solid #fde6d2; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; background: #fffaf3; }
          .day h3 { margin: 0 0 6px; font-size: 16px; color: #9a3412; }
          .badge { display: inline-block; background: #ea580c; color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-right: 8px; }
          .meal { font-size: 11px; color: #6b7280; margin-top: 6px; }
          .foot { text-align: center; color: #9ca3af; font-size: 11px; padding: 12px 0; }
          .foot a { color: #ea580c; text-decoration: none; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="hero">
            <h1>{it.title}</h1>
            <p>{it.days.length} day{it.days.length !== 1 ? 's' : ''} · {Math.max(0, it.days.length - 1)} night{it.days.length !== 2 ? 's' : ''} · curated by Jae Travel Expeditions</p>
          </div>
          {it.days.map((day) => {
            const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
            const acts = day.activities ? JSON.parse(day.activities) : [];
            const mealText = [meals.breakfast && 'Breakfast', meals.lunch && 'Lunch', meals.dinner && 'Dinner', meals.note].filter(Boolean).join(' · ');
            return (
              <div key={day.id} className="day">
                <h3><span className="badge">Day {day.dayNumber}</span>{day.destination}</h3>
                {day.accommodation && <p style={{ margin: '4px 0', fontSize: 13 }}>🏨 {day.accommodation}</p>}
                {acts.length > 0 && (
                  <ul style={{ margin: '6px 0', paddingLeft: 20, fontSize: 13 }}>
                    {acts.map((a: any, i: number) => (
                      <li key={i}>{a.time ? <strong>{a.time}: </strong> : null}{a.description}</li>
                    ))}
                  </ul>
                )}
                {day.notes && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280' }}>{day.notes}</p>}
                <p className="meal">{mealText || '—'}</p>
              </div>
            );
          })}
          <div className="foot">Powered by <a href="https://jaetravel.co.ke" target="_blank" rel="noreferrer">Jae Travel Expeditions</a></div>
        </div>
      </body>
    </html>
  );
}
