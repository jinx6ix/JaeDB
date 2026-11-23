// lib/agents/cost-sheet-agent.ts
import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export const costSheetAgent: Agent = {
  name: 'cost-sheet',
  description: 'Drafts cost sheets from a booking brief, using live contract rates.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const { bookingId } = ctx.context || {};
    let booking: any = null;
    if (bookingId) {
      booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, tourPackage: { include: { days: true } } },
      });
    }
    // Pull a few live hotels+prices so the agent has real numbers to work with.
    const hotels = await prisma.sRHotel.findMany({
      take: 10,
      include: { county: true, roomTypes: { take: 2, include: { prices: { take: 2 } } } },
    });
    const compact = hotels.map((h) => ({
      name: h.name, destination: h.county.name,
      rooms: h.roomTypes.map((rt) => ({
        name: rt.name, max: rt.maxOccupancy,
        prices: rt.prices.map((p) => ({
          boardBasis: p.boardBasis, pp: p.ratePerPersonSharing, srs: p.singleRoomRate, child: p.childRate,
        })),
      })),
    }));

    const brief = booking
      ? `Booking ${booking.bookingRef} · client ${booking.client?.name} · ${booking.numAdults}A/${booking.numChildren}C · tour "${booking.tourPackage?.title}" with ${booking.tourPackage?.days?.length || 0} day(s).`
      : ctx.prompt;

    const userMsg = `Brief:\n${brief}\n\nAvailable contract rates (JSON, sampled):\n${JSON.stringify(compact)}\n\nDraft a complete cost sheet as JSON only. Shape:\n{\n  "tourTitle": string,\n  "days": number,\n  "boardBasis": string,\n  "currency": "USD",\n  "markupPercent": number,\n  "dayRows": [{ "day": number, "destinationName": string, "hotelName": string, "adultAccomTotal": number, "childAccomTotal": number, "singleRoomRate": number, "parkFeeAdultTotal": number, "parkFeeChildTotal": number, "transportTotal": number }],\n  "perAdultCost": number,\n  "perChildCost": number,\n  "totalCost": number,\n  "rationale": string\n}\nUse only the supplied rates where possible; put 0 for unknowns and mark "NEEDS" in rationale.`;

    await ctx.log({ agent: 'cost-sheet', kind: 'tool', content: `Fetched ${hotels.length} hotels + ${booking ? 'booking ' + bookingId : 'no booking'} for context` });
    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 3072 });
    const parsed = extractJson<any>(raw);
    if (!parsed) {
      return { ok: false, summary: 'Could not parse JSON from LLM response', data: { raw } };
    }
    return {
      ok: true,
      summary: `Drafted ${parsed.dayRows?.length || 0}-day cost sheet · per adult ${parsed.perAdultCost ?? '?'} ${parsed.currency || ''} · markup ${parsed.markupPercent}%`,
      data: parsed,
    };
  },
};
