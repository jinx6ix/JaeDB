// lib/agents/itinerary-agent.ts
import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export const itineraryAgent: Agent = {
  name: 'itinerary',
  description: 'Drafts day-by-day itineraries from a booking or upstream cost sheet.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const { bookingId, costSheetId } = ctx.context || {};
    const hist = await ctx.history();
    const upstream = hist.filter((m) => m.agent === 'cost-sheet' && m.kind === 'assistant').pop();
    let booking: any = null;
    if (bookingId) {
      booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, tourPackage: { include: { days: true } } },
      });
    }
    let costSheet: any = null;
    if (costSheetId) {
      costSheet = await prisma.costSheet.findUnique({ where: { id: costSheetId } });
    }

    const brief = [
      booking ? `Booking ${booking.bookingRef} · ${booking.client?.name} · tour ${booking.tourPackage?.title}` : '',
      costSheet ? `Linked cost sheet: ${costSheet.tourTitle} · ${costSheet.days} days · board ${costSheet.boardBasis}` : '',
      upstream ? `Upstream cost-sheet agent says: ${upstream.content}` : '',
      ctx.prompt,
    ].filter(Boolean).join('\n');

    const tourDays = booking?.tourPackage?.days || [];
    const userMsg = `Brief:\n${brief}\n\nTour package day skeletons (JSON):\n${JSON.stringify(tourDays.map((d: any) => ({ day: d.dayNumber, dest: d.destination?.name || d.title, accom: d.accommodation })))}\n\nWrite a complete itinerary as JSON only, shape:\n{\n  "title": string,\n  "days": [{\n    "dayNumber": number,\n    "date": "YYYY-MM-DD",\n    "destination": string,\n    "accommodation": string,\n    "mealPlan": { "breakfast": bool, "lunch": bool, "dinner": bool, "note": string },\n    "activities": [{ "time": string, "description": string }],\n    "notes": string\n  }],\n  "introduction": string\n}\nMake day descriptions appealing to a guest. Respect the supplied day count.`;

    await ctx.log({ agent: 'itinerary', kind: 'tool', content: `Context: ${tourDays.length} tour day(s), booking=${!!booking}, costSheet=${!!costSheet}` });
    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 3072 });
    const parsed = extractJson<any>(raw);
    if (!parsed) return { ok: false, summary: 'Could not parse itinerary JSON', data: { raw } };
    return {
      ok: true,
      summary: `Drafted ${parsed.days?.length || 0}-day itinerary "${parsed.title || ''}"`,
      data: parsed,
    };
  },
};
