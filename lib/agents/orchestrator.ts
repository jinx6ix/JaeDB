// lib/agents/orchestrator.ts
// Sequential pipeline + chat-style handoff.
// Each agent runs in order, sees the full message history of prior agents,
// and emits a "handoff" message that becomes context for the next agent.

import { prisma } from '@/lib/prisma';
import { chatComplete } from './llm';
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
    analyst: 'You are the read-only analyst. You answer how-many, list, total, average and anomaly questions directly from the live database. Never mutate data. Always return JSON with { answer, highlights[] }.',
    monitor: 'You are the memory + monitoring agent. Summarise recent user logins and agent runs as a short digest, and flag any anomalies. Return JSON with digest, issues[], recommendations[].',
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
  let routerRationale = '';
  if (!req.pinnedAgents) {
    const seedHistory = await prisma.agentMessage.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
      select: { agent: true, kind: true, content: true },
    }).catch(() => []);
    try {
      const decision = await routePrompt(
        req.prompt,
        seedHistory.map((m) => ({ agent: m.agent as AgentName, kind: m.kind as any, content: m.content })),
        orderedAgents,
      );
      routerRationale = decision.rationale;
      orderedAgents = decision.primaryAgents.filter((a): a is AgentName => a !== 'orchestrator');
      await logMessage(runId, {
        agent: 'orchestrator',
        kind: 'routing',
        content: `Router: intent=${decision.intent} → ${orderedAgents.join(' → ') || '(no agents)'}. ${decision.rationale}`,
        payload: decision,
      });
    } catch (e: any) {
      await logMessage(runId, { agent: 'orchestrator', kind: 'routing', content: `Router failed (${e?.message}); using default pipeline.` });
    }
  }

  if (orderedAgents.length === 0) orderedAgents = ['analyst'];

  await logMessage(runId, { agent: 'orchestrator', kind: 'system', content: `Pipeline started → ${orderedAgents.join(' → ')}` });
  await logMessage(runId, { agent: 'ui', kind: 'user', content: req.prompt });

  let data: Record<string, unknown> = {};
  let steps = 0;
  for (const name of orderedAgents) {
    const agent = REGISTRY[name];
    if (!agent) continue;
    await logMessage(runId, { agent: 'orchestrator', kind: 'handoff', content: `→ ${name}` });
    const ctx = await buildContext(runId, name, req);
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
      if (!result.ok) {
        await logMessage(runId, { agent: 'orchestrator', kind: 'error', content: `${name} reported failure: ${result.summary}` });
        break;
      }
    } catch (e: any) {
      steps++;
      await logMessage(runId, { agent: name, kind: 'error', content: String(e?.message || e) });
      await prisma.agentRun.update({ where: { id: runId }, data: { status: 'error', summary: `${name} threw: ${e?.message}` } });
      return;
    }
  }

  const summary = typeof data === 'object' && Object.keys(data).length
    ? `Completed ${steps} step(s): ${Object.keys(data).join(', ')}`
    : `Completed ${steps} step(s)`;
  await prisma.agentRun.update({ where: { id: runId }, data: { status: 'done', steps, summary } });
  await logMessage(runId, { agent: 'orchestrator', kind: 'system', content: `Pipeline finished ✓ (${steps} steps)` });
}

async function buildContext(runId: string, name: AgentName, req: AgentRunRequest): Promise<AgentContext> {
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
