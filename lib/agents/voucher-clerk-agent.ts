// lib/agents/voucher-clerk-agent.ts
// Drafts hotel/vehicle voucher content off a booking, and drafts client-facing
// emails (confirmation, payment reminder, itinerary delivery). Never sends an
// email itself — every send goes through ctx.requireConfirmation, and the
// actual dispatch happens via lib/agents/notify.ts once approved (see
// orchestrator.ts's confirm-resume path).

import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export const voucherClerkAgent: Agent = {
  name: 'voucher-clerk',
  description: 'Drafts hotel/vehicle vouchers and client emails (confirmations, reminders, itinerary delivery) from a booking.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const { bookingId, voucherId } = ctx.context || {};

    if (voucherId) {
      const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
        include: { booking: { include: { client: true } }, property: true, vehicle: true },
      });
      if (!voucher) return { ok: false, summary: `Voucher ${voucherId} not found.` };
      const to = voucher.booking?.client?.email;
      if (!to) return { ok: false, summary: 'No client email on file for this voucher — cannot send.' };

      const clientName = voucher.booking?.client?.name || 'Guest';
      const place = voucher.property?.name || voucher.vehicleName || 'your booking';
      const emailBody = `Dear ${clientName},\n\nPlease find attached your ${voucher.type.toLowerCase()} voucher (${voucher.voucherNo}) for ${place}, linked to booking ${voucher.booking?.bookingRef || ''}.\n\nSafe travels,\nJae Travel Expeditions`;

      // Sending is a real, external, irreversible action -> requires confirmation.
      return ctx.requireConfirmation(
        `Send ${voucher.type} voucher ${voucher.voucherNo} to ${clientName} <${to}>?`,
        { voucherId, to, subject: `Your ${voucher.type} voucher — ${voucher.voucherNo}`, emailBody, action: 'send-email' },
      );
    }

    if (!bookingId) {
      return { ok: false, summary: 'No bookingId or voucherId in context — nothing to draft.' };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, tourPackage: true, vouchers: true },
    });
    if (!booking) return { ok: false, summary: `Booking ${bookingId} not found.` };

    const userMsg = `Draft guest-facing content for this booking. Return JSON only:
{
  "voucherRemarks": string,   // short remarks line for the voucher (mention any special requirements)
  "emailSubject": string,
  "emailBody": string         // warm, professional, 3-6 sentences, mentions bookingRef
}

Booking:
${JSON.stringify({
  ref: booking.bookingRef, client: booking.client?.name, tour: booking.tourPackage?.title,
  start: booking.startDate, end: booking.endDate, adults: booking.numAdults, children: booking.numChildren,
  special: booking.specialRequirements, existingVouchers: booking.vouchers.length,
})}

Instruction: ${ctx.prompt}`;

    await ctx.log({ agent: 'voucher-clerk', kind: 'tool', content: `Drafting voucher/email content for ${booking.bookingRef}` });
    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 1024 });
    const parsed = extractJson<any>(raw);
    if (!parsed) return { ok: false, summary: 'Could not parse draft JSON', data: { raw } };

    return {
      ok: true,
      summary: `Drafted voucher remarks + email for ${booking.bookingRef} — nothing sent yet.`,
      data: parsed,
    };
  },
};
