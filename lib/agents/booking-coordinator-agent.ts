// lib/agents/booking-coordinator-agent.ts
// Owns the booking lifecycle: flags balance-due bookings approaching travel,
// surfaces upcoming trips, and proposes status transitions. Never mutates a
// booking's status directly for CANCELLED/COMPLETED — those go through
// ctx.requireConfirmation first (see lib/agents/permissions.ts).

import { prisma } from '@/lib/prisma';
import { Agent, AgentContext, AgentStepResult } from './types';

export const bookingCoordinatorAgent: Agent = {
  name: 'booking-coordinator',
  description: 'Monitors the booking lifecycle: balance-due follow-up, upcoming trips, and status transitions.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const { bookingId } = ctx.context || {};
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, tourPackage: true },
      });
      if (!booking) return { ok: false, summary: `Booking ${bookingId} not found.` };

      const balance = (booking.totalAmount || 0) - (booking.paidAmount || 0);
      const travelSoon = new Date(booking.startDate) <= in14Days;

      if (balance > 0 && travelSoon) {
        await ctx.notify(
          `Booking ${booking.bookingRef} (${booking.client?.name}) travels ${new Date(booking.startDate).toDateString()} with an outstanding balance of ${balance.toFixed(2)}.`,
        );
      }

      // Proposing a terminal status change requires a human yes/no.
      const wantsCancel = /cancel/i.test(ctx.prompt);
      const wantsComplete = /complete|mark.*done|finished/i.test(ctx.prompt);
      if (wantsCancel) {
        return ctx.requireConfirmation(
          `Cancel booking ${booking.bookingRef} for ${booking.client?.name}?`,
          { bookingId, action: 'booking.status -> CANCELLED' },
        );
      }
      if (wantsComplete) {
        return ctx.requireConfirmation(
          `Mark booking ${booking.bookingRef} as completed?`,
          { bookingId, action: 'booking.status -> COMPLETED' },
        );
      }

      return {
        ok: true,
        summary: `${booking.bookingRef}: balance ${balance.toFixed(2)}, travels ${new Date(booking.startDate).toDateString()}${travelSoon && balance > 0 ? ' — flagged, balance due soon' : ''}.`,
        data: { bookingId, balance, travelSoon },
      };
    }

    // No specific booking in context: sweep for anything needing attention.
    const upcoming = await prisma.booking.findMany({
      where: { startDate: { gte: now, lte: in14Days }, status: { not: 'CANCELLED' } },
      include: { client: true },
      take: 50,
    });
    const atRisk = upcoming.filter((b) => (b.totalAmount || 0) - (b.paidAmount || 0) > 0);

    if (atRisk.length) {
      await ctx.notify(
        `${atRisk.length} booking(s) travel within 14 days with an outstanding balance: ${atRisk.map((b) => b.bookingRef).join(', ')}.`,
      );
    }

    await ctx.log({
      agent: 'booking-coordinator', kind: 'tool',
      content: `Swept ${upcoming.length} upcoming booking(s), ${atRisk.length} with a balance due.`,
    });

    return {
      ok: true,
      summary: `${upcoming.length} booking(s) travel in the next 14 days; ${atRisk.length} still owe a balance.`,
      data: { upcomingCount: upcoming.length, atRiskRefs: atRisk.map((b) => b.bookingRef) },
    };
  },
};
