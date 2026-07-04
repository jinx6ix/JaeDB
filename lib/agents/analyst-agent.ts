// lib/agents/analyst-agent.ts
// Read-only analytics agent. Answers count / list / metric / anomaly questions
// by querying the database directly, then handing the snapshot to the LLM to
// phrase a crisp answer. Never mutates data.

import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';
import type { RouterDecision } from './router';

type AnalystKind = NonNullable<NonNullable<RouterDecision['analystHint']>['kind']>;

const WINDOWS: Record<string, () => Date> = {
  today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
  this_week: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; },
  this_month: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  last_30_days: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  last_90_days: () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  all_time: () => new Date(0),
};

export const analystAgent: Agent = {
  name: 'analyst',
  description:
    'Read-only analyst. Answers how-many / list / total / average / anomaly questions directly from the database.',

  async run(ctx: AgentContext): Promise<AgentStepResult> {
    // ── 1. Ask the LLM to classify the question into a structured query plan ──
    const planRaw = await ctx.ask(
      `Classify the user's question so the analyst can pick the right DB query.
Return JSON only:
{
  "kind": "count" | "list" | "metric" | "anomaly",
  "entity": "booking" | "invoice" | "costSheet" | "client" | "voucher" | "itinerary" | "agentRun" | "user" | "srHotel" | "tourPackage",
  "window": "today" | "this_week" | "this_month" | "last_30_days" | "last_90_days" | "all_time",
  "metric": "sum" | "avg" | "count" | "min" | "max",
  "field": "totalAmount" | "amountPaid" | "paidAmount" | "steps" | "" (which numeric field to aggregate; empty for count)
}

Rules:
- Use "count" + field="" for "how many" questions.
- Use "list" for "show me / give me / list" questions (returns rows, not a number).
- Use "metric" for "total / sum / average" questions and set field + metric.
- Use "anomaly" for "anything weird / any issues / outliers" — analyst will scan recent rows for outliers.

Question:
${ctx.prompt}`,
      { jsonMode: true, maxTokens: 400 },
    );

    const plan = extractJson<{
      kind: AnalystKind;
      entity: string;
      window: string;
      metric?: string;
      field?: string;
    }>(planRaw);

    if (!plan || !plan.entity) {
      return {
        ok: false,
        summary: 'Analyst could not understand the question. Try rephrasing, e.g. "how many bookings this month?".',
      };
    }

    const since = (WINDOWS[plan.window || 'all_time'] || WINDOWS.all_time)();

    // ── 2. Pull the raw snapshot from the DB ─────────────────────────────────
    const snapshot = await pullSnapshot(plan.entity, plan.kind, since);
    await ctx.log({
      agent: 'analyst',
      kind: 'tool',
      content: `DB query ${plan.kind} on ${plan.entity} since ${since.toISOString().slice(0, 10)} → ${snapshot.summary}`,
      payload: snapshot,
    });

    // ── 3. Let the LLM phrase the answer (and surface anomalies) ──────────────
    const answerRaw = await ctx.ask(
      `You are the read-only analyst. Answer the user's question using ONLY the snapshot below.
If the snapshot does not contain the answer, say "I don't have enough data to answer that."
Be concise (2-4 sentences). For lists, summarise in prose, do not dump raw IDs.
If kind=anomaly, point out the 2-3 most noteworthy outliers.

Return JSON only:
{
  "answer": string,
  "highlights": [string]   // short bullet-style strings, max 4
}

Question:
${ctx.prompt}

Snapshot:
${JSON.stringify(snapshot)}`,
      { jsonMode: true, maxTokens: 1024 },
    );

    const parsed = extractJson<{ answer: string; highlights?: string[] }>(answerRaw);
    if (!parsed) {
      return {
        ok: true,
        summary: snapshot.summary,
        data: { plan, snapshot, raw: answerRaw.slice(0, 400) },
      };
    }

    return {
      ok: true,
      summary: parsed.answer,
      data: { plan, snapshot, highlights: parsed.highlights || [] },
    };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Snapshot pullers — one per supported entity, switched on kind.
// Kept deliberately small & defensive: every findMany uses `take` to bound rows.
// ────────────────────────────────────────────────────────────────────────────

async function pullSnapshot(
  entity: string,
  kind: AnalystKind,
  since: Date,
): Promise<{ summary: string; rows?: any[]; metric?: number; anomalies?: any[] }> {
  switch (entity) {
    case 'booking':
      return pullBookings(kind, since);
    case 'invoice':
      return pullInvoices(kind, since);
    case 'costSheet':
      return pullCostSheets(kind, since);
    case 'client':
      return pullClients(kind, since);
    case 'voucher':
      return pullVouchers(kind, since);
    case 'itinerary':
      return pullItineraries(kind, since);
    case 'agentRun':
      return pullAgentRuns(kind, since);
    case 'user':
      return pullUsers(kind, since);
    case 'srHotel':
      return pullSrHotels(kind, since);
    case 'tourPackage':
      return pullTourPackages(kind, since);
    default:
      return { summary: `Unknown entity: ${entity}` };
  }
}

function dateWhere(since: Date) {
  return since.getTime() === 0 ? {} : { createdAt: { gte: since } };
}

async function pullBookings(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.booking.count({ where });
    return { summary: `${total} bookings since ${since.toISOString().slice(0, 10)}`, metric: total };
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
  // list
  const rows = await prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, include: { client: { select: { name: true } } } });
  return { summary: `${rows.length} bookings listed`, rows };
}

async function pullInvoices(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.invoice.count({ where });
    return { summary: `${total} invoices since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  if (kind === 'metric') {
    const rows = await prisma.invoice.findMany({ where, select: { totalAmount: true, amountPaid: true } });
    const total = rows.reduce((s, r) => s + r.totalAmount, 0);
    const paid = rows.reduce((s, r) => s + r.amountPaid, 0);
    return { summary: `${rows.length} invoices • billed $${total.toFixed(0)} • paid $${paid.toFixed(0)}`, metric: total, rows: [{ total, paid, count: rows.length }] };
  }
  if (kind === 'anomaly') {
    const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const anomalies = rows.filter((r) => r.amountPaid > r.totalAmount * 1.05 || r.status === 'DRAFT' && (Date.now() - r.createdAt.getTime()) > 14 * 24 * 60 * 60 * 1000);
    return { summary: `${rows.length} invoices scanned, ${anomalies.length} anomalies`, anomalies, rows };
  }
  const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25 });
  return { summary: `${rows.length} invoices listed`, rows };
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

async function pullClients(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.client.count({ where });
    return { summary: `${total} clients since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  const rows = await prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, name: true, email: true, phone: true, country: true } });
  return { summary: `${rows.length} clients listed`, rows };
}

async function pullVouchers(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.voucher.count({ where });
    return { summary: `${total} vouchers since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  const rows = await prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, voucherNo: true, type: true, status: true, hotelName: true, vehicleName: true, createdAt: true } });
  return { summary: `${rows.length} vouchers listed`, rows };
}

async function pullItineraries(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.itinerary.count({ where });
    return { summary: `${total} itineraries since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  const rows = await prisma.itinerary.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, title: true, bookingId: true, createdAt: true } });
  return { summary: `${rows.length} itineraries listed`, rows };
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

async function pullSrHotels(kind: AnalystKind, since: Date) {
  if (kind === 'count') {
    const total = await prisma.sRHotel.count();
    return { summary: `${total} contract hotels`, metric: total };
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
  const rows = await prisma.sRHotel.findMany({ take: 25, include: { roomTypes: true, seasons: true } });
  return { summary: `${rows.length} contract hotels listed`, rows };
}

async function pullTourPackages(kind: AnalystKind, since: Date) {
  const where = dateWhere(since);
  if (kind === 'count') {
    const total = await prisma.tourPackage.count({ where });
    return { summary: `${total} tour packages since ${since.toISOString().slice(0, 10)}`, metric: total };
  }
  const rows = await prisma.tourPackage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, title: true, duration: true, createdAt: true } });
  return { summary: `${rows.length} tour packages listed`, rows };
}
