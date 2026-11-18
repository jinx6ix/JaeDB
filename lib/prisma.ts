// lib/prisma.ts  — Prisma 7 client singleton using @prisma/adapter-pg
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  // Supabase requires SSL; append sslmode=require if not already present.
  const connectionString = url.includes('sslmode=')
    ? url
    : url + (url.includes('?') ? '&sslmode=require' : '?sslmode=require');

  const adapter = new PrismaPg({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  } as any);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
