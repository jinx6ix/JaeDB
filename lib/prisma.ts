// lib/prisma.ts  — Prisma 7 client singleton using @prisma/adapter-pg
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  // Limit the pool per serverless invocation so many concurrent
  // Vercel functions don't exhaust Supabase's connection pool.
  // max: 3 keeps each function lightweight while allowing a few concurrent queries.
  // idleTimeoutMillis: close idle connections after 10s.
  // connectionTimeoutMillis: fail fast (10s) instead of waiting 60s.
  const adapter = new PrismaPg({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  } as any);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
