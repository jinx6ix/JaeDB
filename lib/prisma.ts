// lib/prisma.ts  — Prisma 7 client singleton using @prisma/adapter-pg
// SSL is configured explicitly via env vars so it works with Supabase's
// self-signed certificate without being overridden by sslmode in DATABASE_URL.
//
// Env vars:
//   DIRECT_URL                   — Supabase Session connection string (port 5432, tried first)
//   DATABASE_URL                 — Supabase Transaction connection string (port 6543, fallback)
//   DATABASE_SSL_REJECT_UNAUTHORIZED — "true" | "false" (default: false)
//   DATABASE_SSL_CA                — optional path to CA certificate file
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildSslConfig(): { rejectUnauthorized: boolean; ca?: string } | boolean {
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

  const caPath = process.env.DATABASE_SSL_CA;
  let ca: string | undefined;
  if (caPath && existsSync(caPath)) {
    ca = readFileSync(caPath, 'utf-8');
  }

  // SSL is required by Supabase. If rejectUnauthorized is true but no CA
  // is provided, connections will fail against self-signed certs.
  if (!rejectUnauthorized || !ca) {
    return { rejectUnauthorized: false, ...(ca ? { ca } : {}) };
  }

  return { rejectUnauthorized: true, ca };
}

function makeClient(): PrismaClient {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is not set.');

  // Strip sslmode from the URL — pg parses it as verify-full which rejects
  // Supabase's self-signed cert. We manage SSL explicitly below.
  const connectionString = url
    .replace(/[?&]sslmode=[^&]*/, '')
    .replace(/&$/, '')
    .replace(/\?$/, '');

  const ssl = buildSslConfig();

  const adapter = new PrismaPg({
    connectionString,
    ssl,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  } as any);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
