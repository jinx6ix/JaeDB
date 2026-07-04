// lib/agents/router.ts
// Smart router — given a user prompt + minimal context, decide which
// agents should run. Used by the orchestrator to rewrite the pipeline.
//
// The router itself is a tiny LLM call (~150 tokens) and returns a JSON
// classification. The orchestrator still respects the user's pinnedAgents
// flag (set by the chat panel) — bypass this only when the user explicitly
// picked agents.

import { chatComplete, extractJson } from './llm';
import type { AgentMessageLite, AgentName } from './types';

export type RouterIntent =
  | 'answer'        // user is asking a question; route to analyst
  | 'monitor'       // user is asking about activity/health; route to monitor
  | 'draft'         // user wants new content generated
  | 'verify'        // user wants to check/audit something
  | 'mixed';        // combination — prepend analyst + run user-selected agents

export interface RouterDecision {
  intent: RouterIntent;
  primaryAgents: AgentName[];
  rationale: string;
  /** Optional analyst hint — narrows entity/window selection. */
  analystHint?: {
    kind?: 'count' | 'list' | 'metric' | 'anomaly';
    entity?: string;
    /** e.g. "last_30_days", "this_month", "all_time" */
    window?: string;
  };
}

const INTENT_PROMPT = `You are a routing classifier for a travel-agency AI agent system.

Given the user's prompt and a short conversation trail, return JSON only:
{
  "intent": "answer" | "monitor" | "draft" | "verify" | "mixed",
  "primaryAgents": ["analyst","monitor","cost-sheet","itinerary","invoice","rate-intel","itinerary-gen"],
  "rationale": "1 short sentence",
  "analystHint": { "kind": "count|list|metric|anomaly", "entity": "string", "window": "string" }
}

Rules:
- "answer" → user is asking a question (count/list/metric/anomaly about saved data). primaryAgents must be ["analyst"].
- "monitor" → user is asking about recent activity/logins/agent runs. primaryAgents must be ["monitor"].
- "draft" → user wants new content generated (cost sheet, itinerary, rates, etc.). primaryAgents matches the user-selected agents minus orchestrator/ui.
- "verify" → user wants an audit/check. primaryAgents ["invoice"] or appropriate.
- "mixed" → user wants both a quick analytical answer AND generated output. primaryAgents is analyst-first, then drafter(s).

Pick exactly ONE primaryAgents per intent EXCEPT for "mixed" (which can be many).

If your entity string for analystHint cannot be determined, set it to "".
Pick "window" from {"today","this_week","this_month","last_30_days","last_90_days","all_time"} or "" if unclear.

Return strictly JSON. No prose.`;

/**
 * Classify a prompt.
 *
 * @param prompt user prompt
 * @param history last few messages (chronological)
 * @param defaultAgents what the user originally selected from the chat panel
 */
export async function routePrompt(
  prompt: string,
  history: AgentMessageLite[] = [],
  defaultAgents: AgentName[] = [],
): Promise<RouterDecision> {
  const trail = history.slice(-6).map((m) => `[${m.agent}/${m.kind}] ${m.content}`).join('\n');
  const user = `Prompt:
${prompt}

Default panel selection: ${defaultAgents.join(', ') || '(none)'}

Recent trail:
${trail || '(none)'}

Return JSON only.`;

  try {
    const raw = await chatComplete(
      [
        { role: 'system', content: INTENT_PROMPT },
        { role: 'user', content: user },
      ],
      { maxTokens: 512, temperature: 0, jsonMode: true },
    );
    const parsed = extractJson<RouterDecision>(raw);
    if (!parsed || !parsed.intent) {
      throw new Error('router: invalid JSON');
    }
    // Defensive: ensure primaryAgents is valid AgentName[]
    const allowed = new Set<AgentName>([
      'cost-sheet', 'itinerary', 'invoice', 'rate-intel',
      'itinerary-gen', 'monitor', 'analyst',
    ]);
    parsed.primaryAgents = (parsed.primaryAgents || []).filter((a: any): a is AgentName => allowed.has(a));
    if (parsed.primaryAgents.length === 0) parsed.primaryAgents = ['analyst'];
    return parsed;
  } catch (e: any) {
    // Fallback: never block the user. Use the default panel selection,
    // prepend analyst if it looks like a question.
    const looksLikeQuestion = /(how many|how much|total|count|sum|average|avg|most|least|which|when|where|who|show|list|give me|find)/i.test(prompt);
    return {
      intent: looksLikeQuestion ? 'answer' : 'draft',
      primaryAgents: looksLikeQuestion ? ['analyst'] : (defaultAgents.length ? defaultAgents : ['analyst']),
      rationale: `router fallback: ${e.message}`,
    };
  }
}
