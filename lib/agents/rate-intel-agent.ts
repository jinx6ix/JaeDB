// lib/agents/rate-intel-agent.ts
import { prisma } from '@/lib/prisma';
import { extractJson } from './llm';
import { Agent, AgentContext, AgentStepResult } from './types';

export const rateIntelAgent: Agent = {
  name: 'rate-intel',
  description: 'Scans safari contract rates for gaps, anomalies, and missing seasons.',
  async run(ctx: AgentContext): Promise<AgentStepResult> {
    const hotels = await prisma.sRHotel.findMany({
      take: 30,
      include: {
        county: true,
        roomTypes: { include: { prices: true } },
        seasons: true,
      },
    });

    const scan = hotels.map((h) => ({
      hotel: h.name,
      hotelId: h.id,
      destination: h.county.name,
      roomTypes: h.roomTypes.length,
      prices: h.roomTypes.reduce((n, rt) => n + rt.prices.length, 0),
      seasons: h.seasons.length,
      zeroes: h.roomTypes.flatMap((rt) => rt.prices.filter((p) => (p.ratePerPersonSharing ?? 0) === 0).map((p) => ({ board: p.boardBasis }))),
    }));

    const userMsg = `You are auditing safari hotel contract data for completeness. Below is a JSON summary of ${scan.length} hotels.\nDetect:\n- Hotels with 0 prices (missing rate entries)\n- Hotels with 0 seasons (cannot price correctly)\n- Rooms with ratePerPersonSharing = 0 (likely unset)\n- Outliers (no obvious pattern)\nReturn JSON only, shape:\n{\n  "findings": [{\n    "hotelId": number,\n    "hotelName": string,\n    "issue": string,\n    "severity": "warn|error",\n    "suggestedAction": string\n  }],\n  "summary": string\n}\n\nData:\n${JSON.stringify(scan)}`;

    await ctx.log({ agent: 'rate-intel', kind: 'tool', content: `Scanned ${hotels.length} hotels, ${scan.reduce((n, s) => n + s.prices, 0)} prices` });
    const raw = await ctx.ask(userMsg, { jsonMode: true, maxTokens: 3072 });
    const parsed = extractJson<any>(raw);
    if (!parsed) return { ok: false, summary: 'Could not parse rate-intel JSON', data: { raw } };
    return {
      ok: true,
      summary: parsed.summary || `${parsed.findings?.length || 0} finding(s) across ${hotels.length} hotels`,
      data: parsed,
    };
  },
};
