// app/api/itineraries/from-source/route.ts
// Two endpoints in one route file:
//   POST /api/itineraries/from-source        (JSON: { url, bookingId?, title? })
//   POST /api/itineraries/from-source/pdf     (multipart: file=..., bookingId?...)
//
// Both invoke the itinerary-gen agent and persist the resulting itinerary.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startRun } from '@/lib/agents/orchestrator';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';

  try {
    if (ct.includes('multipart/form-data')) {
      // ── PDF upload branch ─────────────────────────────────────────────────
      const form = await req.formData();
      const file = form.get('file');
      const bookingId = (form.get('bookingId') as string) || null;
      const title = (form.get('title') as string) || '';
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No "file" field in form data' }, { status: 400 });
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      const { runId } = await startRun({
        origin: 'itinerary-gen',
        prompt: `Generate itinerary from PDF "${file.name || title}"`,
        context: {
          bookingId: bookingId || undefined,
          source: { kind: 'pdf', buffer: buf as any, filename: file.name },
        },
        agents: ['itinerary-gen'],
      }, (session.user as any)?.id);
      return NextResponse.json({ runId, status: 'running' }, { status: 202 });
    }

    // ── JSON / URL branch ────────────────────────────────────────────────────
    const body = await req.json();
    if (!body?.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    const { runId } = await startRun({
      origin: 'itinerary-gen',
      prompt: `Generate itinerary from ${body.url}`,
      context: {
        bookingId: body.bookingId || undefined,
        source: { kind: 'url', url: body.url },
      },
      agents: ['itinerary-gen'],
    }, (session.user as any)?.id);
    return NextResponse.json({ runId, status: 'running' }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
