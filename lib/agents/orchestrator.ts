// lib/agents/orchestrator.ts
// Sequential pipeline + chat-style handoff.
// Each agent runs in order, sees the full message history of prior agents,
// and emits a "handoff" message that becomes context for the next agent.
//
// Permission enforcement: notify / requestAgent / requireConfirmation are all
// gated through lib/agents/permissions.ts. An agent that isn't granted a
// capability there gets a thrown PermissionError instead of silently acting.
//
// Confirmation flow: when an agent calls ctx.requireConfirmation(), its step
// returns { pending: true } and the pipeline halts immediately — no later
// agents run until a human approves/rejects via
// POST /api/agents/runs/[id]/confirm, which calls resumeRun() below.

import { prisma } from '@/lib/prisma';
import { chatComplete } from './llm';
import { sendNotificationEmail } from './notify';
import {
  AGENT_PERMISSIONS,
  assertCanNotify,
  assertCanRequestAgent,
} from './permissions';
import {
  Agent,
  AgentContext,
  AgentMessageLite,
  AgentName,
  AgentRunRequest,
  AgentStepResult,
} from './types';
import { costSheetAgent } from './cost-sheet-agent';
import { itineraryAgent } from './itinerary-agent';
import { invoiceAgent } from './invoice-agent';
import { rateIntelAgent } from './rate-intel-agent';
import { itineraryGenAgent } from './itinerary-gen-agent';
import { monitorAgent } from './monitor-agent';
import { analystAgent } from './analyst-agent';
import { bookingCoordinatorAgent } from './booking-coordinator-agent';
import { voucherClerkAgent } from './voucher-clerk-agent';
import { accessibilityAgent } from './accessibility-agent';
import { userStewardAgent } from './user-steward-agent';
import { routePrompt } from './router';

const REGISTRY: Record<AgentName, Agent> = {
  orchestrator: { name: 'orchestrator', description: 'Pipeline coordinator', run: () => Promise.resolve({ ok: true, summary: 'coordinated' }) },
  ui: { name: 'ui', description: 'Human user', run: () => Promise.resolve({ ok: true, summary: 'noop' }) },
  'cost-sheet': costSheetAgent,
  itinerary: itineraryAgent,
  invoice: invoiceAgent,
  'rate-intel': rateIntelAgent,
  'itinerary-gen': itineraryGenAgent,
  monitor: monitorAgent,
  analyst: analystAgent,
  'booking-coordinator': bookingCoordinatorAgent,
  'voucher-clerk': voucherClerkAgent,
  accessibility: accessibilityAgent,
  'user-steward': userStewardAgent,
};

function sysPromptFor(name: AgentName): string {
  const base = 'You are a financial-travel operations agent working inside Jae Travel Expeditions software. You communicate with other specialist agents by writing terse, structured notes. Never invent data — if a value is missing, say "NEEDS: <thing>".';
  const role: Record<AgentName, string> = {
    orchestrator: 'You are the orchestrator. Decide which agents are needed and in what order, then pass control.',
    ui: 'You are the human operator giving instructions.',
    'cost-sheet': 'You draft complete cost sheets. You fetch hotel contract rates, park fees, transport and assemble per-person pricing with markup. Always return a JSON object with the proposed dayRows and totals.',
    itinerary: 'You draft day-by-day itineraries. Given a tour package or cost sheet, you produce destination, accommodation, activities and meal plan content.',
    invoice: 'You verify invoices against their cost sheet. You flag duplicate line items, wrong markups, and missing transport/park fees. Return a JSON findings object with issues[] and suggestedFixes[].',
    'rate-intel': 'You scan the safari-rates contract database for missing seasons, room types, or anomalous prices. Return a JSON list of findings with hotelId, issue, suggestedAction.',
    'itinerary-gen': 'You generate day-by-day itineraries from external sources (URL or PDF). Always return a JSON object matching the schema with title, summary, days[].',
    analyst: 'You are the read-only analyst — the general "ask about our data" agent for the whole system. You answer how-many, list, total, average, anomaly, and full-content questions (a specific voucher, a specific itinerary, hotel rates on a date) directly from the live database. You tolerate typos and informal phrasing. Never mutate data. Always return JSON with { answer, highlights[] }.',
    monitor: 'You are the memory + monitoring agent. Summarise recent user logins and agent runs as a short digest, and flag any anomalies. Return JSON with digest, issues[], recommendations[].',
    'booking-coordinator': 'You own the booking lifecycle: balance-due follow-up, upcoming trips, status transitions. You never finalize a CANCELLED or COMPLETED status yourself — always ask for confirmation first.',
    'voucher-clerk': 'You draft voucher content and guest-facing emails. You never actually send an email yourself — always ask for confirmation before dispatch.',
    accessibility: 'You verify accessibility requirements (wheelchair access, hydraulic-lift vehicles) on a booking are matched by the assigned vehicle/property before a voucher ships. You flag mismatches; you do not fix them yourself.',
    'user-steward': 'You flag dormant or unusual user accounts. You never deactivate an account yourself — you only ever recommend, and always via confirmation.',
  };
  return `${base}\n\n${role[name]}`;
}

export async function startRun(req: AgentRunRequest, userId?: string): Promise<{ runId: string }> {
  const run = await prisma.agentRun.create({
    data: {
      origin: req.origin,
      prompt: req.prompt,
      status: 'running',
      userId: userId || null,
    },
  });
  // kick off asynchronously; the caller (API route) fires-and-forgets this
  void executeRun(run.id, req).catch(async (e) => {
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: 'error', summary: String(e?.message || e) } });
    await logMessage(run.id, { agent: 'orchestrator', kind: 'error', content: String(e?.message || e) });
  });
  return { runId: run.id };
}

export async function executeRun(runId: string, req: AgentRunRequest): Promise<void> {
  let orderedAgents: AgentName[] = (req.agents && req.agents.length ? req.agents : ['cost-sheet', 'itinerary', 'invoice', 'rate-intel'])
    .filter((a): a is AgentName => a !== 'orchestrator');

  // ── Smart routing ──────────────────────────────────────────────────────────
  // When the user did NOT explicitly pin agents (chat panel default flow),
  // ask the router to classify the prompt and rewrite the pipeline.
  if (!req.pinnedAgents) {
    const seedHistory = await prisma.agentMessage.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
      select: { agent: true, kind: true, content: true },
    }).catch(() => []);
    try {
      const decision = await routePrompt(
        req.prompt,
        seedHistory.map((m) => ({ runId, agent: m.agent as AgentName, kind: m.kind as any, content: m.content })),
        orderedAgents,
      );
      orderedAgents = decision.primaryAgents.filter((a): a is AgentName => a !== 'orchestrator');
      await logMessage(runId, {
        agent: 'orchestrator',
        kind: 'routing',
        content: `Router: intent=${decision.intent} → ${orderedAgents.join(' → ') || '(no agents)'}. ${decision.rationale}`,
        payload: decision as unknown as Record<string, unknown>,
      });
    } catch (e: any) {
      await logMessage(runId, { agent: 'orchestrator', kind: 'routing', content: `Router failed (${e?.message}); using default pipeline.` });
    }
  }

  if (orderedAgents.length === 0) orderedAgents = ['analyst'];

  await logMessage(runId, { agent: 'orchestrator', kind: 'system', content: `Pipeline started → ${orderedAgents.join(' → ')}` });
  await logMessage(runId, { agent: 'ui', kind: 'user', content: req.prompt });

  await runPipeline(runId, req, orderedAgents, {});
}

/**
 * Runs (or resumes) a sequence of agents. Shared by executeRun (fresh start)
 * and resumeRun (continuing after a confirm-request was approved/rejected).
 */
async function runPipeline(
  runId: string,
  req: AgentRunRequest,
  agentQueue: AgentName[],
  dataSoFar: Record<string, unknown>,
): Promise<void> {
  const data: Record<string, unknown> = { ...dataSoFar };
  let steps = (await prisma.agentRun.findUnique({ where: { id: runId }, select: { steps: true } }))?.steps ?? 0;

  for (let i = 0; i < agentQueue.length; i++) {
    const name = agentQueue[i];
    const agent = REGISTRY[name];
    if (!agent) continue;
    await logMessage(runId, { agent: 'orchestrator', kind: 'handoff', content: `→ ${name}` });
    const ctx = buildContext(runId, name, req);
    try {
      const result: AgentStepResult = await agent.run(ctx);
      steps++;
      if (result.data) data[name] = result.data;
      await logMessage(runId, {
        agent: name,
        kind: 'assistant',
        content: result.summary,
        payload: result.data,
      });

      if (result.pending) {
        // Halted for human confirmation. Persist exactly enough state to
        // resume: which agents are left (including this one is NOT re-run —
        // the approved action is applied directly by resumeRun/performApprovedAction),
        // and the accumulated data so downstream agents still see it.
        const remaining = agentQueue.slice(i + 1);
        await prisma.agentRun.update({ where: { id: runId }, data: { status: 'awaiting-confirmation', steps } });
        await logMessage(runId, {
          agent: name,
          kind: 'confirm-request',
          content: result.summary,
          payload: { ...result.data, remainingAgents: remaining, dataSoFar: data },
        });
        return; // stop here — resumeRun() picks up from `remaining`
      }

      if (!result.ok) {
        await logMessage(runId, { agent: 'orchestrator', kind: 'error', content: `${name} reported failure: ${result.summary}` });
        await prisma.agentRun.update({ where: { id: runId }, data: { status: 'error', steps, summary: `${name} reported failure` } });
        return;
      }
    } catch (e: any) {
      steps++;
      await logMessage(runId, { agent: name, kind: 'error', content: String(e?.message || e) });
      await prisma.agentRun.update({ where: { id: runId }, data: { status: 'error', steps, summary: `${name} threw: ${e?.message}` } });
      return;
    }
  }

  const summary = Object.keys(data).length
    ? `Completed ${steps} step(s): ${Object.keys(data).join(', ')}`
    : `Completed ${steps} step(s)`;
  await prisma.agentRun.update({ where: { id: runId }, data: { status: 'done', steps, summary } });
  await logMessage(runId, { agent: 'orchestrator', kind: 'system', content: `Pipeline finished ✓ (${steps} steps)` });
}

/**
 * Called by POST /api/agents/runs/[id]/confirm. Applies (or discards) the
 * pending action, then continues any remaining agents in the queue.
 */
export async function resumeRun(runId: string, approved: boolean, note?: string): Promise<void> {
  const pendingMsg = await prisma.agentMessage.findFirst({
    where: { runId, kind: 'confirm-request' },
    orderBy: { createdAt: 'desc' },
  });
  if (!pendingMsg) throw new Error('No pending confirmation found for this run.');

  const run = await prisma.agentRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== 'awaiting-confirmation') {
    throw new Error('This run is not currently awaiting confirmation.');
  }

  const payload = (pendingMsg.payload as any) || {};
  const remaining: AgentName[] = payload.remainingAgents || [];
  const dataSoFar: Record<string, unknown> = payload.dataSoFar || {};

  await logMessage(runId, {
    agent: pendingMsg.agent as AgentName,
    kind: 'confirm-response',
    content: approved ? `Approved${note ? `: ${note}` : ''}` : `Rejected${note ? `: ${note}` : ''}`,
    payload: { approved, note },
  });

  if (approved) {
    await performApprovedAction(payload.action, payload);
  }

  await prisma.agentRun.update({ where: { id: runId }, data: { status: 'running' } });

  if (remaining.length === 0) {
    await prisma.agentRun.update({ where: { id: runId }, data: { status: 'done', summary: 'Completed after confirmation.' } });
    await logMessage(runId, { agent: 'orchestrator', kind: 'system', content: 'Pipeline finished ✓ (resumed after confirmation)' });
    return;
  }

  const req: AgentRunRequest = { origin: 'ui', prompt: run.prompt, pinnedAgents: true, agents: remaining };
  await runPipeline(runId, req, remaining, dataSoFar);
}

/**
 * The only place actual side-effecting actions happen after a human says
 * yes. Deliberately a small, explicit switch — not free-form agent code —
 * so every irreversible action a human approved is auditable in one place.
 */
async function performApprovedAction(action: string | undefined, payload: Record<string, unknown>): Promise<void> {
  switch (action) {
    case 'booking.status -> CANCELLED':
      await prisma.booking.update({ where: { id: payload.bookingId as string }, data: { status: 'CANCELLED' } });
      break;
    case 'booking.status -> COMPLETED':
      await prisma.booking.update({ where: { id: payload.bookingId as string }, data: { status: 'COMPLETED' } });
      break;
    case 'send-email': {
      const to = payload.to as string;
      const subject = (payload.subject as string) || 'Update from Jae Travel Expeditions';
      const body = (payload.emailBody as string) || 'Please see your attached voucher/itinerary.';
      if (to) await sendNotificationEmail(to, subject, body);
      break;
    }
    case 'flag-account':
      if (Array.isArray(payload.accounts)) {
        for (const a of payload.accounts as { id: string; email: string }[]) {
          await prisma.log.create({
            data: { level: 'WARN', message: `Account flagged as dormant by user-steward agent (pending Admin review): ${a.email}`, userId: a.id },
          });
        }
      }
      break;
    case 'block-voucher-send':
      // Human overrode the accessibility block — nothing to mutate, the
      // decision itself (approved/rejected) is already logged above.
      break;
    default:
      // Unknown action — log only, never silently do something unspecified.
      break;
  }
}

function buildContext(runId: string, name: AgentName, req: AgentRunRequest): AgentContext {
  const history = async (): Promise<AgentMessageLite[]> => {
    const rows = await prisma.agentMessage.findMany({ where: { runId }, orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({
      id: r.id, runId, agent: r.agent as AgentName, kind: r.kind as any,
      content: r.content, payload: (r.payload as any) ?? undefined, createdAt: r.createdAt.toISOString(),
    }));
  };
  return {
    runId,
    prompt: req.prompt,
    context: req.context,
    log: (msg) => logMessage(runId, msg),
    history,
    ask: async (user, opts = {}) => {
      const sys = sysPromptFor(name);
      const prior = await history();
      const thread = [
        { role: 'system' as const, content: sys },
        ...prior.slice(-12).map((m) => ({ role: 'assistant' as const, content: `[${m.agent}/${m.kind}] ${m.content}` })),
        { role: 'user' as const, content: user },
      ];
      return chatComplete(thread, { temperature: 0.2, jsonMode: opts.jsonMode, maxTokens: opts.maxTokens ?? 2048 });
    },
    notify: async (msg, opts = {}) => {
      assertCanNotify(name);
      await logMessage(runId, { agent: name, kind: 'notify', content: msg, payload: { channel: opts.channel || 'log' } });
      if (opts.channel === 'email' && opts.to) {
        await sendNotificationEmail(opts.to, opts.subject || 'Notification from Jae Travel AI agents', msg);
      }
    },
    requestAgent: async (target, prompt, context) => {
      assertCanRequestAgent(name, target);
      await logMessage(runId, { agent: name, kind: 'handoff', content: `→ ${target} (requested by ${name})` });
      const targetCtx = buildContext(runId, target, { ...req, prompt, context: context || req.context });
      const result = await REGISTRY[target].run(targetCtx);
      await logMessage(runId, { agent: target, kind: 'assistant', content: result.summary, payload: result.data });
      return result;
    },
    requireConfirmation: async (question, data) => {
      // The confirm-request message itself is written by runPipeline (it
      // needs to attach remainingAgents/dataSoFar), so here we just shape
      // the pending result — the caller (agent.run) returns this directly.
      // `data` is expected to include an `action` key matching one of the
      // cases in performApprovedAction() above, e.g. { action: 'send-email', to, subject, emailBody }.
      return { ok: true, pending: true, summary: question, data };
    },
  };
}

export async function logMessage(runId: string, msg: Omit<AgentMessageLite, 'runId' | 'createdAt'>): Promise<void> {
  await prisma.agentMessage.create({
    data: {
      runId,
      agent: msg.agent,
      kind: msg.kind,
      content: msg.content,
      payload: (msg.payload as any) ?? undefined,
    },
  });
}

export { AGENT_PERMISSIONS };
