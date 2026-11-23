// lib/agents/itinerary-gen-agent.ts
// Generates a day-by-day itinerary from an external source (URL or PDF)
// provided via AgentRunRequest.context.source. Falls back to ctx.prompt.

import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export type ItineraryGenSource =
  | { kind: 'url'; url: string }
  | { kind: 'pdf'; buffer: Uint8Array; filename?: string }
  | { kind: 'inline'; text: string };

export const itineraryGenAgent: Agent = {
  name: 'itinerary-gen',
  description: 'Generates a day-by-day itinerary from a website URL or uploaded PDF.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const source = (ctx.context as any)?.source as ItineraryGenSource | undefined;

    let sourceKind = 'prompt';
    let sourceRef = '';
    let cleanedText = '';
    let meta: Record<string, unknown> = {};

    if (source?.kind === 'url') {
      sourceKind = 'url';
      sourceRef = source.url;
      try {
        const t = await import('./sources');
        const out = await t.extractUrl(source.url);
        cleanedText = out.text;
        meta = { title: out.title, description: out.description, ogImage: out.ogImage };
        await ctx.log({ agent: 'itinerary-gen', kind: 'tool', content: `Fetched ${out.text.length.toLocaleString()} chars from ${source.url}${out.title ? ` — "${out.title}"` : ''}` });
      } catch (e: any) {
        await ctx.log({ agent: 'itinerary-gen', kind: 'error', content: `URL fetch failed: ${e.message}` });
        return { ok: false, summary: `URL fetch failed: ${e.message}` };
      }
    } else if (source?.kind === 'pdf') {
      sourceKind = 'pdf';
      sourceRef = source.filename || 'upload.pdf';
      try {
        const t = await import('./sources');
        const out = await t.extractPdf(new Uint8Array(source.buffer));
        cleanedText = out.text;
        meta = { pages: out.pages };
        await ctx.log({ agent: 'itinerary-gen', kind: 'tool', content: `Parsed ${cleanedText.length.toLocaleString()} chars from PDF (pages: ${out.pages ?? '?'})` });
      } catch (e: any) {
        await ctx.log({ agent: 'itinerary-gen', kind: 'error', content: `PDF parse failed: ${e.message}` });
        return { ok: false, summary: `PDF parse failed: ${e.message}` };
      }
    } else if (source?.kind === 'inline') {
      sourceKind = 'inline';
      cleanedText = source.text;
      await ctx.log({ agent: 'itinerary-gen', kind: 'tool', content: `Using inline source (${cleanedText.length.toLocaleString()} chars)` });
    } else {
      cleanedText = ctx.prompt || '';
      await ctx.log({ agent: 'itinerary-gen', kind: 'tool', content: 'No source payload; using prompt as source text.' });
    }

    if (cleanedText.length < 30) {
      return { ok: false, summary: 'Source text too short to generate from.' };
    }

    const userMsg = `You are a senior Kenya tour designer. Read this source material and write a clean day-by-day itinerary as JSON only.\n\n${(meta as any).description ? `Source description: ${(meta as any).description}\n` : ''}${sourceKind === 'url' ? `Source URL: ${sourceRef}\n` : ''}Source material (cleaned):\n<<<${cleanedText.slice(0, 24_000)}>>>\n\nReturn strictly this JSON shape:\n{\n  "title": string,\n  "summary": string,\n  "nights": number,\n  "days": [\n    {\n      "dayNumber": number,\n      "title": string,\n      "destination": "Maasai Mara|Nairobi|Amboseli|Diani|Nakuru|Samburu|Tsavo|Other",\n      "accommodation": string,\n      "mealPlan": { "breakfast": bool, "lunch": bool, "dinner": bool, "note": string },\n      "activities": [{ "time": string, "description": string }],\n      "notes": string\n    }\n  ]\n}\nNo prose outside the JSON.`;

    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 4096 });
    const parsed = extractJson<any>(raw);
    if (!parsed) {
      return { ok: false, summary: 'Could not parse itinerary JSON', data: { raw: raw.slice(0, 600) } };
    }

    let savedId: string | null = null;
    const { bookingId } = ctx.context || {};
    if (bookingId) {
      const created = await prisma.itinerary.create({
        data: {
          bookingId,
          title: parsed.title || `Itinerary from ${sourceKind}`,
          days: {
            create: (parsed.days || []).map((d: any) => ({
              dayNumber: Number(d.dayNumber) || 1,
              destination: d.destination || d.title || 'TBD',
              accommodation: d.accommodation || null,
              mealPlan: JSON.stringify(d.mealPlan || {}),
              activities: JSON.stringify(d.activities || []),
              notes: d.notes || null,
            })),
          },
        },
      });
      savedId = created.id;
      await ctx.log({ agent: 'itinerary-gen', kind: 'tool', content: `Saved itinerary ${savedId} (${parsed.days?.length || 0} days)` });
    }

    return {
      ok: true,
      summary: `Generated ${parsed.days?.length || 0}-day itinerary from ${sourceKind}${savedId ? ` • saved as #${String(savedId).slice(-6)}` : ''}`,
      data: { itinerary: parsed, savedId, source: { kind: sourceKind, ref: sourceRef }, meta },
    };
  },
};
