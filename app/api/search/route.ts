// app/api/search/route.ts
// Global cross-model search. GET ?q=<term>&limit=<n>
//
// Runs parallel Prisma findMany across all business models and returns a flat
// list of normalised hits grouped client-side by `kind`. Each model is capped
// (default 4 rows) and the final list is truncated to `limit` (default 20, max 50).
//
// Auth: any authenticated user. Users-model results are only returned to
// admins (everyone else sees no `user` results).

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/src/generated/prisma/client';

export interface SearchHit {
  kind: string;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  badge?: string;
}

const PER_MODEL = 4;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_QUERY = 1;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limitParam = Math.min(
    Math.max(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  if (q.length < MIN_QUERY) {
    return NextResponse.json<SearchHit[]>([]);
  }

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const contains = { contains: q, mode: Prisma.QueryMode.insensitive } as const;

  // Each model returns SearchHit[] (capped to PER_MODEL).
  const tasks: Promise<SearchHit[]>[] = [
    // Bookings
    prisma.booking
      .findMany({
        where: { OR: [{ bookingRef: contains }, { client: { name: contains } }, { tourPackage: { title: contains } }] },
        take: PER_MODEL,
        orderBy: { createdAt: 'desc' },
        include: { client: true, tourPackage: true },
      })
      .then((rows) => rows.map((b) => ({
        kind: 'Booking',
        id: b.id,
        label: b.bookingRef,
        sublabel: `${b.client?.name || '—'} · ${b.tourPackage?.title || 'Custom'}`,
        href: `/dashboard/bookings/${b.id}`,
        badge: b.status.replace('_', ' '),
      }))),

    // Clients
    prisma.client
      .findMany({
        where: { OR: [{ name: contains }, { email: contains }, { phone: contains }] },
        take: PER_MODEL,
        orderBy: { name: 'asc' },
      })
      .then((rows) => rows.map((c) => ({
        kind: 'Client',
        id: c.id,
        label: c.name,
        sublabel: [c.email, c.phone].filter(Boolean).join(' · ') || undefined,
        href: `/dashboard/clients/${c.id}`,
      }))),

    // Vouchers
    prisma.voucher
      .findMany({
        where: {
          OR: [
            { voucherNo: contains },
            { clientName: contains },
            { hotelName: contains },
            { flightName: contains },
          ],
        },
        take: PER_MODEL,
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { client: true } } },
      })
      .then((rows) => rows.map((v) => {
        const sublabel =
          v.clientName || v.booking?.client?.name || v.hotelName || v.flightName || undefined;
        return {
          kind: 'Voucher',
          id: v.id,
          label: v.voucherNo,
          sublabel,
          href: `/dashboard/vouchers/${v.id}`,
          badge: v.type,
        };
      })),

    // Invoices
    prisma.invoice
      .findMany({
        where: {
          OR: [
            { invoiceNo: contains },
            { billTo: contains },
            { booking: { bookingRef: contains } },
            { client: { name: contains } },
          ],
        },
        take: PER_MODEL,
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { client: true } } },
      })
      .then((rows) => rows.map((inv) => ({
        kind: 'Invoice',
        id: inv.id,
        label: inv.invoiceNo,
        sublabel: inv.billTo || inv.booking?.client?.name || undefined,
        href: `/dashboard/invoices/${inv.id}`,
        badge: inv.status,
      }))),

    // Cost Sheets
    prisma.costSheet
      .findMany({
        where: {
          OR: [
            { tourTitle: contains },
            { bookingRef: contains },
            { client: { name: contains } },
            { agent: { name: contains } },
          ],
        },
        take: PER_MODEL,
        orderBy: { createdAt: 'desc' },
        include: { client: true, agent: true },
      })
      .then((rows) => rows.map((cs) => ({
        kind: 'Cost Sheet',
        id: cs.id,
        label: cs.tourTitle,
        sublabel: cs.client?.name || cs.agent?.company || cs.bookingRef || undefined,
        href: `/dashboard/cost-sheets/${cs.id}`,
      }))),

    // Itineraries
    prisma.itinerary
      .findMany({
        where: { OR: [{ title: contains }, { booking: { client: { name: contains } } }, { booking: { bookingRef: contains } }] },
        take: PER_MODEL,
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { client: true } } },
      })
      .then((rows) => rows.map((it) => ({
        kind: 'Itinerary',
        id: it.id,
        label: it.title,
        sublabel: it.booking ? `${it.booking.bookingRef} · ${it.booking.client?.name || ''}` : undefined,
        href: `/dashboard/itineraries/${it.id}`,
      }))),

    // Tour Packages
    prisma.tourPackage
      .findMany({
        where: { OR: [{ title: contains }, { description: contains }] },
        take: PER_MODEL,
        orderBy: { title: 'asc' },
      })
      .then((rows) => rows.map((t) => ({
        kind: 'Tour',
        id: t.id,
        label: t.title,
        sublabel: `${t.durationDays}D / ${t.durationNights}N`,
        href: `/dashboard/tours/${t.id}`,
        badge: t.isActive ? 'Active' : 'Inactive',
      }))),

    // Travel Agents (travel agencies — not AI agents)
    prisma.agent
      .findMany({
        where: { OR: [{ name: contains }, { company: contains }, { email: contains }, { phone: contains }] },
        take: PER_MODEL,
        orderBy: { name: 'asc' },
      })
      .then((rows) => rows.map((a) => ({
        kind: 'Travel Agent',
        id: a.id,
        label: a.name,
        sublabel: a.company || a.email || undefined,
        href: `/dashboard/agents/${a.id}/edit`,
        badge: a.isActive ? 'Active' : 'Inactive',
      }))),

    // Properties (hotels/lodges attached to vouchers)
    prisma.property
      .findMany({
        where: { OR: [{ name: contains }, { location: contains }, { country: contains }] },
        take: PER_MODEL,
        orderBy: { name: 'asc' },
      })
      .then((rows) => rows.map((p) => ({
        kind: 'Property',
        id: p.id,
        label: p.name,
        sublabel: [p.location, p.country].filter(Boolean).join(', ') || p.type,
        href: `/dashboard/safari-rates`,
        badge: p.type,
      }))),

    // Vehicles (safari vehicles)
    prisma.vehicle
      .findMany({
        where: { OR: [{ name: contains }, { type: contains }, { regPlate: contains }] },
        take: PER_MODEL,
        orderBy: { name: 'asc' },
      })
      .then((rows) => rows.map((veh) => ({
        kind: 'Vehicle',
        id: veh.id,
        label: veh.name,
        sublabel: [veh.type, veh.regPlate].filter(Boolean).join(' · '),
        href: `/dashboard/vouchers`,
        badge: veh.isAvailable ? 'Available' : 'Out',
      }))),

    // Safari Rates hotels (contract rates)
    prisma.sRHotel
      .findMany({
        where: { OR: [{ name: contains }, { category: contains }, { county: { name: contains } }] },
        take: PER_MODEL,
        orderBy: { name: 'asc' },
        include: { county: { select: { name: true } } },
      })
      .then((rows) => rows.map((h) => ({
        kind: 'Hotel Rate',
        id: String(h.id),
        label: h.name,
        sublabel: [h.county?.name, h.category, h.stars ? `${h.stars}★` : null].filter(Boolean).join(' · '),
        href: `/dashboard/safari-rates`,
      }))),

    // Users — admin only
    ...(isAdmin
      ? [
          prisma.user
            .findMany({
              where: { OR: [{ name: contains }, { email: contains }] },
              take: PER_MODEL,
              orderBy: { name: 'asc' },
            })
            .then((rows) => rows.map((u) => ({
              kind: 'User',
              id: u.id,
              label: u.name,
              sublabel: u.email,
              href: `/dashboard/admin/users/${u.id}/edit`,
              badge: u.role,
            }))),
        ]
      : []),
  ];

  // Run all model queries in parallel; never let one failure blank the rest.
  const settled = await Promise.allSettled(tasks);
  const flat: SearchHit[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') flat.push(...s.value);
  }

  // Ensure final list does not exceed `limit`, regardless of per-model math.
  flat.length = Math.min(flat.length, limitParam);
  return NextResponse.json<SearchHit[]>(flat);
}
