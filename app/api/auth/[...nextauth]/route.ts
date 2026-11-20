// app/api/auth/[...nextauth]/route.ts
// NextAuth v4 + Next.js 16 App Router route handler.
// Next.js 16 passes (req, { params: Promise<...> }) to route handlers.
// We explicitly await params and forward them so NextAuth's route handler
// can resolve the catch-all segment (e.g. session, signin, callback).
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nextauth: string[] }> }
) {
  return handler(req, { params } as any);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ nextauth: string[] }> }
) {
  return handler(req, { params } as any);
}
