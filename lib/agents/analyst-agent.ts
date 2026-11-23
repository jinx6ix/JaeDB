// lib/agents/analyst-agent.ts
// Read-only analytics agent — the general "ask about our data" agent for
// counts, lists, metrics, anomalies, and full-content lookups (a specific
// voucher, a specific itinerary, hotel rates on a specific date).
//
// SPEED NOTE: this agent used to always make 2 of its own LLM calls (a plan
// classifier, then a phrasing call), on top of the orchestrator's router
// call — 3 LLM round trips for "how many bookings do I have". It now:
//   1. Reuses the router's classification from history() when available,
//      skipping its OWN classify call entirely (router already did this work).
//   2. Skips the phrasing call completely for "count" — those are formatted
//      deterministically, since there's nothing an LLM adds to "you have 4 bookings".
// That takes the common case down to 1 LLM call total (the router's), and
// list/metric/anomaly/detail down to 2 instead of 3.

import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { parseFlexibleDate, isSameDay, isWithinRange } from './date-parse';
import { Agent, AgentContext, AgentStepResult } from './types';
import type { RouterDecision } from './router';

type AnalystKind = 'count' | 'list' | 'metric' | 'anomaly' | 'detail';
type Filters = { name?: string; dateText?: string; hotelName?: string; refNo?: string };
type Plan = { kind: AnalystKind; entity: string; window: string; metric?: string; field?: string; filters?: Filters };

const WINDOWS: Record<string, () => Date> = {
  today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
  this_week: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; },
  this_month: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  last_30_days: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  last_90_days: () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  all_time: () => new Date(0),
};

const VALID_ENTITIES = new Set([
  'booking', 'invoice', 'costSheet', 'client', 'voucher', 'itinerary',
  'agentRun', 'user', 'srHotel', 'tourPackage',
]);

export const analystAgent: Agent = {
  name: 'analyst',
  description:
    'Read-only analyst. Answers how-many / list / total / average / anomaly / full-content questions about anything in the system — bookings, vouchers, itineraries, invoices, contract hotel rates, clients, users.',

  async run(ctx: AgentContext): Promise<AgentStepResult> {
    // ── 1. Get a query plan — reuse the router's classification if we have it ──
    let plan = await planFromRouterHint(ctx);
    if (!plan) plan = await planFromOwnClassifier(ctx);

    if (!plan || !plan.entity || !VALID_ENTITIES.has(plan.entity)) {
      return {
        ok: false,
        summary: 'Analyst could not understand which part of the system you mean. Try naming it directly, e.g. "vouchers", "bookings", "hotel rates".',
      };
    }

    const since = (WINDOWS[plan.window || 'all_time'] || WINDOWS.all_time)();
    const parsedDate = plan.filters?.dateText ? parseFlexibleDate(plan.filters.dateText) : null;

    // ── 2. Pull the raw snapshot from the DB (no LLM involved) ───────────────
    const snapshot = await pullSnapshot(plan.entity, plan.kind, since, plan.filters || {}, parsedDate);
    await ctx.log({
      agent: 'analyst',
      kind: 'tool',
      content: `DB query ${plan.kind} on ${plan.entity}${plan.filters?.name ? ` name~"${plan.filters.name}"` : ''}${parsedDate ? ` date=${parsedDate.toDateString()}` : ''} → ${snapshot.summary}`,
      payload: snapshot,
    });

    // ── 3. Count queries: format deterministically, skip the LLM entirely ────
    if (plan.kind === 'count') {
      const n = snapshot.metric ?? 0;
      const windowPhrase = plan.window && plan.window !== 'all_time' ? ` (${plan.window.replace(/_/g, ' ')})` : '';
      return {
        ok: true,
        summary: `You have ${n} ${pluralize(plan.entity, n)}${windowPhrase}.`,
        data: { plan, snapshot },
      };
    }

    // ── 4. Everything else: let the LLM phrase the answer from the snapshot ──
    const answerRaw = await ctx.ask(
      `You are the read-only analyst. Answer the user's question using ONLY the snapshot below.
If the snapshot is empty or doesn't contain the answer, say so plainly rather than guessing.
Be concise (2-5 sentences). For lists, summarise in prose or a short list, don't dump raw IDs.
For kind=detail, present the full content clearly (e.g. all fields of the one voucher/itinerary/rate found).
If kind=anomaly, point out the 2-3 most noteworthy outliers.

Return JSON only:
{
  "answer": string,
  "highlights": [string]   // short bullet-style strings, max 5
}

Question:
${ctx.prompt}

Snapshot:
${JSON.stringify(snapshot)}`,
      { jsonMode: true, maxTokens: 900 },
    );

    const parsed = extractJson<{ answer: string; highlights?: string[] }>(answerRaw);
    if (!parsed) {
      return { ok: true, summary: snapshot.summary, data: { plan, snapshot, raw: answerRaw.slice(0, 400) } };
    }

    return {
      ok: true,
      summary: parsed.answer,
      data: { plan, snapshot, highlights: parsed.highlights || [] },
    };
  },
};

function pluralize(entity: string, n: number): string {
  const label: Record<string, string> = {
    booking: 'booking', invoice: 'invoice', costSheet: 'cost sheet', client: 'client',
    voucher: 'voucher', itinerary: 'itinerary', agentRun: 'agent run', user: 'user',
    srHotel: 'contract hotel', tourPackage: 'tour package',
  };
  const l = label[entity] || entity;
  return n === 1 ? l : `${l}s`;
}

// ────────────────────────────────────────────────────────────────────────────
// Plan sources
// ────────────────────────────────────────────────────────────────────────────

/** Reuse the orchestrator's own router classification instead of re-asking the LLM. */
async function planFromRouterHint(ctx: AgentContext): Promise<Plan | null> {
  const history = await ctx.history();
  const routing = [...history].reverse().find((m) => m.kind === 'routing');
  const hint = (routing?.payload as unknown as RouterDecision | undefined)?.analystHint;
  if (!hint || !hint.entity) return null;
  return {
    kind: (hint.kind as AnalystKind) || 'list',
    entity: hint.entity,
    window: hint.window || 'all_time',
    filters: {
      name: hint.filters?.name || undefined,
      dateText: hint.filters?.dateText || undefined,
      hotelName: hint.filters?.hotelName || undefined,
      refNo: hint.filters?.refNo || undefined,
    },
  };
}

/** Fallback: analyst classifies the prompt itself (used when pinned/no router ran). */
async function planFromOwnClassifier(ctx: AgentContext): Promise<Plan | null> {
  const planRaw = await ctx.ask(
    `Classify the user's question so the analyst can pick the right DB query.
Return JSON only:
{
  "kind": "count" | "list" | "metric" | "anomaly" | "detail",
  "entity": "booking" | "invoice" | "costSheet" | "client" | "voucher" | "itinerary" | "agentRun" | "user" | "srHotel" | "tourPackage",
  "window": "today" | "this_week" | "this_month" | "last_30_days" | "last_90_days" | "all_time",
  "metric": "sum" | "avg" | "count" | "min" | "max",
  "field": "totalAmount" | "amountPaid" | "paidAmount" | "steps" | "",
  "filters": { "name": "string or empty", "dateText": "string or empty (copy the user's date phrase verbatim)", "hotelName": "string or empty", "refNo": "string or empty" }
}

Rules:
- "count" for "how many". "list" for "show me / give me several". "detail" for the full content of ONE specific thing (a named voucher, a specific itinerary, hotel rates on one date). "metric" for totals/averages. "anomaly" for "anything weird/outliers".
- The user may misspell words — infer intent anyway (e.g. "vouchars" means vouchers).
- Populate filters whenever a person's name, a date phrase (any format), a hotel name, or a reference number is mentioned. Leave unmentioned filters as "".

Question:
${ctx.prompt}`,
    { jsonMode: true, maxTokens: 400 },
  );
  return extractJson<Plan>(planRaw);
}

// ────────────────────────────────────────────────────────────────────────────
// Snapshot pullers — one per supported entity, switched on kind + filters.
// ────────────────────────────────────────────────────────────────────────────

async function pullSnapshot(
  entity: string,
  kind: AnalystKind,
  since: Date,
  filters: Filters,
  date: Date | null,
): Promise<{ summary: string; rows?: any[]; metric?: number; anomalies?: any[] }> {
  switch (entity) {
    case 'booking': return pullBookings(kind, since, filters, date);
    case 'invoice': return pullInvoices(kind, since, filters);
    case 'costSheet': return pullCostSheets(kind, since);
    case 'client': return pullClients(kind, since, filters);
    case 'voucher': return pullVouchers(kind, since, filters, date);
    case 'itinerary': return pullItineraries(kind, since, filters);
    case 'agentRun': return pullAgentRuns(kind, since);
    case 'user': return pullUsers(kind, since);
    case 'srHotel': return pullSrHotels(kind, since, filters, date);
    case 'tourPackage': return pullTourPackages(kind, since);
    default: return { summary: `Unknown entity: ${entity}` };
  }
}

function dateWhere(since: Date) {
  return since.getTime() === 0 ? {} : { createdAt: { gte: since } };
}

function nameSearch(name?: string) {
  if (!name) return undefined;
  return { contains: name, mode: 'insensitive' as const };
}

async function pullBookings(kind: AnalystKind, since: Date, filters: Filters, date: Date | null) {
  const where: any = { ...dateWhere(since) };
  if (filters.name) where.client = { name: nameSearch(filters.name) };
  if (filters.refNo) where.bookingRef = nameSearch(filters.refNo);
  if (date) where.OR = [{ startDate: { lte: date }, endDate: { gte: date } }];

  if (kind === 'count') {
    const total = await prisma.booking.count({ where });
    return { summary: `${total} bookings matched`, metric: total };
  }
  if (kind === 'metric') {
    const rows = await prisma.booking.findMany({ where, select: { totalAmount: true, paidAmount: true } });
    const total = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const paid = rows.reduce((s, r) => s + (r.paidAmount || 0), 0);
    return { summary: `${rows.length} bookings • total $${total.toFixed(0)} • paid $${paid.toFixed(0)}`, metric: total, rows: [{ total, paid, count: rows.length }] };
  }
  if (kind === 'anomaly') {
    const rows = await prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const anomalies = rows.filter((r) => (r.totalAmount || 0) > 0 && r.paidAmount > (r.totalAmount || 0) * 1.05);
    return { summary: `${rows.length} recent bookings scanned, ${anomalies.length} overpaid anomalies`, anomalies, rows };
  }
  const rows = await prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, include: { client: { select: { name: true } } } });
  return { summary: `${rows.length} bookings matched`, rows };
}

async function pullInvoices(kind: AnalystKind, since: Date, filters: Filters) {
  const where: any = { ...dateWhere(since) };
  if (filters.refNo) where.invoiceNo = nameSearch(filters.refNo);
  if (kind === 'count') {
    const total = await prisma.invoice.count({ where });
    return { summary: `${total} invoices matched`, metric: total };
  }
  if (kind === 'metric') {
    const rows = await prisma.invoice.findMany({ where, select: { totalAmount: true, amountPaid: true } });
    const total = rows.reduce((s, r) => s + r.totalAmount, 0);
    const paid = rows.reduce((s, r) => s + r.amountPaid, 0);
    return { summary: `${rows.length} invoices • billed $${total.toFixed(0)} • paid $${paid.toFixed(0)}`, metric: total, rows: [{ total, paid, count: rows.length }] };
  }
  if (kind === 'anomaly') {
    const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const anomalies = rows.filter((r) => r.amountPaid > r.totalAmount * 1.05 || (r.status === 'DRAFT' && (Date.now() - r.createdAt.getTime()) > 14 * 24 * 60 * 60 * 1000));
    return { summary: `${rows.length} invoices scanned, ${anomalies.length} anomalies`, anomalies, rows };
  }
  const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25 });
  return { summary: `${rows.length} invoices matched`, rows };
}

async function pullCostSheets(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.costSheet.count({ where });
    return { summary: `${total} cost sheets since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  if (kind === 'metric') {
    const rows = await prisma.costSheet.findMany({ where, select: { totalCost: true, markupAmount: true, numPax: true } });
    const total = rows.reduce((s, r) => s + r.totalCost, 0);
    const markup = rows.reduce((s, r) => s + r.markupAmount, 0);
    return { summary: `${rows.length} cost sheets • total $${total.toFixed(0)} • markup $${markup.toFixed(0)}`, metric: total, rows: [{ total, markup, count: rows.length }] };
  }
  if (kind === 'anomaly') {
    const rows = await prisma.costSheet.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const anomalies = rows.filter((r) => r.isOutdated || r.markupPercent < 0 || r.totalCost < 0);
    return { summary: `${rows.length} cost sheets scanned, ${anomalies.length} anomalies`, anomalies, rows };
  }
  const rows = await prisma.costSheet.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25 });
  return { summary: `${rows.length} cost sheets listed`, rows };
}

async function pullClients(kind: AnalystKind, since: Date, filters: Filters) {
  const where: any = { ...dateWhere(since) };
  if (filters.name) where.name = nameSearch(filters.name);
  if (kind === 'count') {
    const total = await prisma.client.count({ where });
    return { summary: `${total} clients matched`, metric: total };
  }
  const rows = await prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, name: true, email: true, phone: true, nationality: true } });
  return { summary: `${rows.length} clients matched`, rows };
}

async function pullVouchers(kind: AnalystKind, since: Date, filters: Filters, date: Date | null) {
  const where: any = { ...dateWhere(since) };
  const or: any[] = [];
  if (filters.name) {
    or.push(
      { clientName: nameSearch(filters.name) },
      { client: { name: nameSearch(filters.name) } },
      { booking: { client: { name: nameSearch(filters.name) } } },
    );
  }
  if (filters.refNo) or.push({ voucherNo: nameSearch(filters.refNo) });
  if (or.length) where.OR = or;

  // "detail" — the user wants the full content of one specific voucher.
  if (kind === 'detail') {
    const row = await prisma.voucher.findFirst({
      where, orderBy: { createdAt: 'desc' },
      include: { booking: { include: { client: true } }, property: true, vehicle: true, client: true },
    });
    if (!row) return { summary: 'No matching voucher found.' };
    let matches = true;
    if (date) {
      matches = isSameDay(row.checkIn, date) || isSameDay(row.pickupDate, date) || isSameDay(row.departureDate, date)
        || (row.checkIn && row.checkOut ? isWithinRange(date, row.checkIn, row.checkOut) : false);
      if (!matches) return { summary: `Found voucher ${row.voucherNo} but its dates don't match ${date.toDateString()}.`, rows: [row] };
    }
    return { summary: `Voucher ${row.voucherNo} (${row.type}) for ${row.clientName || row.booking?.client?.name || 'unknown client'}`, rows: [row] };
  }

  if (date) {
    // Fetch a bounded candidate set, then filter by date fields in memory
    // (voucher date fields vary by type — hotel vs vehicle vs flight).
    const candidates = await prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { booking: { include: { client: true } } } });
    const rows = candidates.filter((v) =>
      isSameDay(v.checkIn, date) || isSameDay(v.pickupDate, date) || isSameDay(v.departureDate, date) || isSameDay(v.issuedDate, date)
      || (v.checkIn && v.checkOut && isWithinRange(date, v.checkIn, v.checkOut)),
    ).slice(0, 25);
    return { summary: `${rows.length} voucher(s) matched on ${date.toDateString()}`, rows };
  }

  if (kind === 'count') {
    const total = await prisma.voucher.count({ where });
    return { summary: `${total} vouchers matched`, metric: total };
  }
  const rows = await prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, voucherNo: true, type: true, status: true, clientName: true, hotelName: true, vehicleName: true, checkIn: true, checkOut: true, pickupDate: true, createdAt: true } });
  return { summary: `${rows.length} voucher(s) matched`, rows };
}

async function pullItineraries(kind: AnalystKind, since: Date, filters: Filters) {
  const where: any = { ...dateWhere(since) };
  if (filters.name) where.booking = { client: { name: nameSearch(filters.name) } };
  if (filters.refNo) where.OR = [{ title: nameSearch(filters.refNo) }, { booking: { bookingRef: nameSearch(filters.refNo) } }];

  if (kind === 'detail') {
    const row = await prisma.itinerary.findFirst({
      where, orderBy: { createdAt: 'desc' },
      include: { booking: { include: { client: true } }, days: { orderBy: { dayNumber: 'asc' } } },
    });
    if (!row) return { summary: 'No matching itinerary found.' };
    return { summary: `Itinerary "${row.title}" — ${row.days.length} day(s)`, rows: [row] };
  }

  if (kind === 'count') {
    const total = await prisma.itinerary.count({ where });
    return { summary: `${total} itineraries matched`, metric: total };
  }
  const rows = await prisma.itinerary.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, title: true, bookingId: true, createdAt: true } });
  return { summary: `${rows.length} itineraries matched`, rows };
}

async function pullAgentRuns(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.agentRun.count({ where });
    return { summary: `${total} agent runs since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  if (kind === 'anomaly') {
    const rows = await prisma.agentRun.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, origin: true, prompt: true, status: true, steps: true, summary: true, createdAt: true } });
    const anomalies = rows.filter((r) => r.status === 'error');
    return { summary: `${rows.length} runs scanned, ${anomalies.length} errored`, anomalies, rows };
  }
  const rows = await prisma.agentRun.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, origin: true, prompt: true, status: true, steps: true, createdAt: true } });
  return { summary: `${rows.length} agent runs listed`, rows };
}

async function pullUsers(kind: AnalystKind, since: Date) {
  if (kind === 'count') {
    const total = await prisma.user.count();
    return { summary: `${total} users total`, metric: total };
  }
  const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, name: true, email: true, role: true, lastLoginAt: true } });
  return { summary: `${rows.length} users listed`, rows };
}

async function pullSrHotels(kind: AnalystKind, since: Date, filters: Filters, date: Date | null) {
  const where: any = {};
  if (filters.hotelName || filters.name) where.name = nameSearch(filters.hotelName || filters.name);

  // "detail" (or any query with a date) — rates for a specific hotel on a specific day.
  if (kind === 'detail' || date) {
    const hotels = await prisma.sRHotel.findMany({
      where, take: 5,
      include: { roomTypes: { include: { prices: { include: { season: true } } } }, seasons: true },
    });
    if (!hotels.length) return { summary: filters.hotelName || filters.name ? `No hotel matched "${filters.hotelName || filters.name}".` : 'No hotels found.' };

    const rows = hotels.map((h) => {
      const roomTypes = h.roomTypes.map((rt) => {
        const applicable = date
          ? rt.prices.filter((p) => isWithinRange(date, p.season.startDate, p.season.endDate))
          : rt.prices;
        return {
          roomType: rt.name,
          maxOccupancy: rt.maxOccupancy,
          prices: applicable.map((p) => ({
            season: p.season.name, boardBasis: p.boardBasis, currency: p.currency,
            ratePerPersonSharing: p.ratePerPersonSharing, singleRoomRate: p.singleRoomRate, childRate: p.childRate,
          })),
        };
      });
      return { hotelId: h.id, name: h.name, stars: h.stars, roomTypes };
    });

    const dateNote = date ? ` for ${date.toDateString()}` : '';
    return { summary: `Rates${dateNote} for ${rows.length} hotel(s): ${rows.map((r) => r.name).join(', ')}`, rows };
  }

  if (kind === 'count') {
    const total = await prisma.sRHotel.count({ where });
    return { summary: `${total} contract hotels matched`, metric: total };
  }
  if (kind === 'anomaly') {
    const hotels = await prisma.sRHotel.findMany({ include: { roomTypes: { include: { prices: true } }, seasons: true } });
    const anomalies: any[] = [];
    for (const h of hotels) {
      if (h.seasons.length === 0) anomalies.push({ hotelId: h.id, name: h.name, issue: 'no seasons defined' });
      for (const rt of h.roomTypes) {
        if (rt.prices.length === 0) anomalies.push({ hotelId: h.id, name: h.name, roomType: rt.name, issue: 'no prices' });
        for (const p of rt.prices) {
          const allZero = (p.ratePerPersonSharing ?? 0) === 0 && (p.singleRoomRate ?? 0) === 0 && (p.childRate ?? 0) === 0 && (p.thirdAdultRate ?? 0) === 0;
          if (allZero) anomalies.push({ hotelId: h.id, name: h.name, roomType: rt.name, issue: 'zero price' });
        }
      }
    }
    return { summary: `${hotels.length} hotels scanned, ${anomalies.length} anomalies`, anomalies, rows: hotels.map((h) => ({ id: h.id, name: h.name, seasons: h.seasons.length, roomTypes: h.roomTypes.length })) };
  }
  const rows = await prisma.sRHotel.findMany({ where, take: 25, include: { roomTypes: true, seasons: true } });
  return { summary: `${rows.length} contract hotels matched`, rows };
}

async function pullTourPackages(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.tourPackage.count({ where });
    return { summary: `${total} tour packages since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  const rows = await prisma.tourPackage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, title: true, durationDays: true, durationNights: true, createdAt: true } });
  return { summary: `${rows.length} tour packages listed`, rows };
}
