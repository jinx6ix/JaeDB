// lib/agents/user-steward-agent.ts
// Extends what monitor-agent already collects (user login data) but actually
// acts on it: flags dormant accounts and suggests deactivation. Never
// deactivates anyone itself — that's an Admin-only human action — it only
// ever recommends, and every recommendation requires confirmation.

import { prisma } from '@/lib/prisma';
import { Agent, AgentContext, AgentStepResult } from './types';

const DORMANT_DAYS = 60;

export const userStewardAgent: Agent = {
  name: 'user-steward',
  description: 'Flags dormant or unusual user accounts and recommends action — never deactivates directly.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const cutoff = new Date(Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });

    const dormant = users.filter((u) => u.isActive && (!u.lastLoginAt || u.lastLoginAt < cutoff));
    const neverLoggedIn = users.filter((u) => u.isActive && !u.lastLoginAt && u.createdAt < cutoff);

    if (dormant.length) {
      await ctx.notify(
        `${dormant.length} active user account(s) haven't logged in for ${DORMANT_DAYS}+ days: ${dormant.map((u) => u.email).join(', ')}.`,
      );
    }

    await ctx.log({
      agent: 'user-steward', kind: 'audit',
      content: `Checked ${users.length} user(s): ${dormant.length} dormant (${DORMANT_DAYS}+ days), ${neverLoggedIn.length} never logged in.`,
    });

    if (dormant.length === 0) {
      return { ok: true, summary: `${users.length} user(s) checked — all active accounts have recent logins.` };
    }

    // Recommending deactivation is exactly the kind of thing that must not
    // happen silently — always route through a human.
    return ctx.requireConfirmation(
      `${dormant.length} account(s) look dormant (${DORMANT_DAYS}+ days since login): ${dormant.map((u) => u.email).join(', ')}. Flag for review/deactivation?`,
      { action: 'flag-account', accounts: dormant.map((u) => ({ id: u.id, email: u.email })) },
    );
  },
};
