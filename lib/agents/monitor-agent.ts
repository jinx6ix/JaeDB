// lib/agents/monitor-agent.ts
// Two responsibilities:
//   1. Memory — keeps an LLM-summarised digest of "what happened recently"
//   2. Monitoring — surfaces anomalies in user logins and agent runs.

import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export const monitorAgent: Agent = {
  name: 'monitor',
  description: 'Auditors user activity & agent runs; produces a memory digest and flags anomalies.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

    // ── Pull raw signals in parallel ───────────────────────────────────────────
    const [agentRuns, agentMessages, logs, users] = await Promise.all([
      prisma.agentRun.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, origin: true, prompt: true, status: true, steps: true, summary: true, createdAt: true, userId: true },
        take: 50,
      }),
      prisma.agentMessage.findMany({
        where: { createdAt: { gte: since }, kind: 'error' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, agent: true, content: true, runId: true, createdAt: true },
        take: 30,
      }),
      prisma.log.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, level: true, message: true, userId: true, userEmail: true, createdAt: true },
        take: 50,
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
        take: 50,
      }).catch(() => []),
    ]);

    const recentErrors = agentMessages.length;
    const errorRate = agentRuns.length > 0 ? Math.round((agentRuns.filter((r) => r.status === 'error').length / agentRuns.length) * 100) : 0;
    const recentlyActiveUsers = users.filter((u: any) => u.lastLoginAt && new Date(u.lastLoginAt) >= since).length;

    const snapshot = {
      window: 'last 24h',
      agentRuns: agentRuns.length,
      errorRate,
      recentAgentErrors: recentErrors,
      userLogs: logs.length,
      logErrors: logs.filter((l) => l.level === 'ERROR' || /error/i.test(l.message)).length,
      activeUsers: recentlyActiveUsers,
      totalUsers: users.length,
      topOrigins: topCount(agentRuns.map((r) => r.origin)),
      sampleErrors: agentMessages.slice(0, 5).map((m) => ({ agent: m.agent, content: m.content.slice(0, 160) })),
      sampleLogs: logs.slice(0, 8).map((l) => ({ level: l.level, msg: l.message.slice(0, 120), user: l.userEmail })),
    };

    await ctx.log({
      agent: 'monitor',
      kind: 'audit',
      content: `Snapshot: ${agentRuns.length} runs • ${errorRate}% errors • ${recentErrors} err msgs • ${snapshot.logErrors} log errors • ${recentlyActiveUsers}/${users.length} users active`,
      payload: snapshot,
    });

    const userMsg = `You are the system monitor + memory agent. Given this 24h snapshot, return JSON only with this shape:\n{\n  "digest": string,            // 2-4 sentence memory of what happened\n  "issues": [{\n    "severity": "warn|error",\n    "category": "users|agents|system",\n    "detail": string\n  }],\n  "recommendations": [string]   // up to 3 short actions for the operator\n}\nHighlight anything that looks risky: errored agent runs, repeating failure patterns, suspicious logins, etc.\n\nSnapshot:\n${JSON.stringify(snapshot)}`;

    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 2048 });
    const parsed = extractJson<any>(raw);
    if (!parsed) {
      return { ok: false, summary: 'Could not parse monitor JSON', data: { snapshot, raw: raw.slice(0, 400) } };
    }

    return {
      ok: true,
      summary: parsed.digest || `Memory: ${agentRuns.length} runs (${errorRate}% errors)`,
      data: parsed,
    };
  },
};

function topCount<T>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) {
    const k = String(i);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
