// lib/agents/accessibility-agent.ts
// Checks bookings flagged as needing wheelchair/accessibility support against
// the vehicle and property actually assigned, before a voucher goes out.
//
// DATA NOTE: the schema has no dedicated `isAccessible` boolean on Vehicle or
// Property today — this agent does a best-effort text match against
// Booking.specialRequirements and Vehicle.notes/type. If accessibility checks
// become business-critical (they're your brand differentiator), add a real
// `isAccessible Boolean` column to Vehicle and Property so this stops being
// a keyword guess.

import { prisma } from '@/lib/prisma';
import { Agent, AgentContext, AgentStepResult } from './types';

const ACCESSIBILITY_KEYWORDS = /wheelchair|accessible|hydraulic|mobility|disab/i;

export const accessibilityAgent: Agent = {
  name: 'accessibility',
  description: 'Verifies accessibility requirements on a booking match the assigned vehicle/property before vouchers ship.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const { bookingId } = ctx.context || {};
    if (!bookingId) {
      // Sweep mode: find any bookings that mention accessibility needs at all.
      const flagged = await prisma.booking.findMany({
        where: { specialRequirements: { contains: 'wheelchair' } },
        include: { client: true, vouchers: { include: { vehicle: true, property: true } } },
        take: 50,
      });
      const unresolved = flagged.filter(
        (b) => !b.vouchers.some((v) => ACCESSIBILITY_KEYWORDS.test(v.vehicle?.notes || '') || ACCESSIBILITY_KEYWORDS.test(v.vehicle?.type || '')),
      );
      if (unresolved.length) {
        await ctx.notify(
          `${unresolved.length} booking(s) request wheelchair/accessibility support but have no matching vehicle assigned yet: ${unresolved.map((b) => b.bookingRef).join(', ')}.`,
        );
      }
      return {
        ok: true,
        summary: `${flagged.length} accessibility-flagged booking(s) found, ${unresolved.length} without a confirmed accessible vehicle.`,
        data: { checked: flagged.length, unresolvedRefs: unresolved.map((b) => b.bookingRef) },
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, vouchers: { include: { vehicle: true, property: true } } },
    });
    if (!booking) return { ok: false, summary: `Booking ${bookingId} not found.` };

    const needsAccess = ACCESSIBILITY_KEYWORDS.test(booking.specialRequirements || '') || ACCESSIBILITY_KEYWORDS.test(ctx.prompt);
    if (!needsAccess) {
      return { ok: true, summary: `${booking.bookingRef}: no accessibility requirement flagged.`, data: { needsAccess: false } };
    }

    const hasMatchingVehicle = booking.vouchers.some(
      (v) => ACCESSIBILITY_KEYWORDS.test(v.vehicle?.notes || '') || ACCESSIBILITY_KEYWORDS.test(v.vehicle?.type || ''),
    );

    if (!hasMatchingVehicle) {
      await ctx.notify(
        `Booking ${booking.bookingRef} (${booking.client?.name}) needs wheelchair/accessible support but no accessible vehicle is attached to its voucher(s) yet.`,
      );
      // Ask the voucher clerk to hold any pending send until this is resolved.
      return ctx.requireConfirmation(
        `${booking.bookingRef} needs an accessible vehicle before its voucher can ship — proceed anyway?`,
        { bookingId, action: 'block-voucher-send' },
      );
    }

    return {
      ok: true,
      summary: `${booking.bookingRef}: accessibility requirement matched to an assigned vehicle. Clear to send.`,
      data: { needsAccess: true, resolved: true },
    };
  },
};
