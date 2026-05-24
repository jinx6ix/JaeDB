// app/api/logs/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const lastId = searchParams.get('after');

  const encoder = new TextEncoder();
  let isConnected = true;
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: string) => {
        if (isConnected) {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      };

      const fetchNewLogs = async () => {
        try {
          const where: any = {};
          if (lastId) {
            const lastLog = await prisma.log.findUnique({ where: { id: lastId } });
            if (lastLog) {
              where.createdAt = { gt: lastLog.createdAt };
            }
          }

          const logs = await prisma.log.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: 50,
          });

          if (logs.length > 0) {
            sendEvent(JSON.stringify({ type: 'logs', logs }));
          }
        } catch (err) {
          console.error('[LogStream] Fetch error:', err);
        }
      };

      sendEvent(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

      await fetchNewLogs();

      intervalId = setInterval(fetchNewLogs, 3000);

      req.signal.addEventListener('abort', () => {
        isConnected = false;
        clearInterval(intervalId);
        controller.close();
      });
    },

    cancel() {
      isConnected = false;
      clearInterval(intervalId);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}