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
    kind?: 'count' | 'list' | 'metric' | 'anomaly' | 'detail';
    entity?: string;
    /** e.g. "last_30_days", "this_month", "all_time" */
    window?: string;
    /** Free-text filters the analyst should apply — passed through as-is. */
    filters?: {
      /** Person/client name mentioned in the prompt, e.g. "nikhil" */
      name?: string;
      /** Raw date phrase exactly as the user typed it, e.g. "1st august" */
      dateText?: string;
      /** Hotel/property name mentioned in the prompt */
      hotelName?: string;
      /** Specific voucher/booking/invoice reference mentioned */
      refNo?: string;
    };
  };
}

const INTENT_PROMPT = `You are a routing classifier for a travel-agency AI agent system.

Given the user's prompt and a short conversation trail, return JSON only:
{
  "intent": "answer" | "monitor" | "draft" | "verify" | "mixed",
  "primaryAgents": ["analyst","monitor","cost-sheet","itinerary","invoice","rate-intel","itinerary-gen","booking-coordinator","voucher-clerk","accessibility","user-steward"],
  "rationale": "1 short sentence",
  "analystHint": {
    "kind": "count|list|metric|anomaly|detail",
    "entity": "string",
    "window": "string",
    "filters": { "name": "string", "dateText": "string", "hotelName": "string", "refNo": "string" }
  }
}

Rules:
- "answer" → user is asking a question (count/list/metric/anomaly/detail about saved data). primaryAgents must be ["analyst"]. This INCLUDES questions about vouchers, itinerary content, hotel rates, invoices, clients — anything already stored in the system. The analyst is the general "ask about our data" agent, not just for bookings.
- "monitor" → user is asking about recent system activity/logins/agent runs (not a specific booking). primaryAgents must be ["monitor"].
- "draft" → user wants NEW content generated that doesn't exist yet (a new cost sheet, a new itinerary from scratch, etc). primaryAgents matches the user-selected agents minus orchestrator/ui.
- "verify" → user wants an audit/check. primaryAgents ["invoice"] or appropriate — use ["accessibility"] specifically for wheelchair/accessibility checks on a booking.
- "mixed" → user wants both a quick analytical answer AND generated output. primaryAgents is analyst-first, then drafter(s).

Use kind="detail" (not "list") when the user wants the FULL content of ONE specific thing — e.g. "give me the content of voucher X", "show me the itinerary for booking Y", "what are hotel X's rates on 1st august". Use kind="list" when they want several rows of a type, e.g. "give me nikhil's vouchers", "show today's bookings".

ALWAYS populate analystHint.filters whenever the prompt names a person, a date (in ANY format — "1st august", "01/08", "next week", etc — copy the phrase verbatim into dateText, don't try to normalize it yourself), a hotel/property, or a specific reference number. Leave a filter field as "" if not mentioned. The user may misspell names or entities — infer their intent anyway (e.g. "vouchars" → vouchers, "nikil" is still a name filter).

Additional routing guidance:
- Booking status changes, balance-due follow-up, "is this booking ready to travel" → "booking-coordinator".
- Voucher DRAFTING or SENDING (not just reading/looking up existing vouchers) → "voucher-clerk".
- IMPORTANT: "give me X's vouchers", "show/list/find vouchers", "what vouchers does X have" are ALL read/lookup requests → "analyst", NOT "voucher-clerk", regardless of singular or plural wording. Only route to "voucher-clerk" when the user explicitly wants to CREATE a new voucher ("draft a voucher for booking Y") or SEND/EMAIL an existing one ("send/email the voucher to the client"). If in doubt between reading and drafting, prefer "analyst" — it's non-destructive.
- Wheelchair / accessibility / hydraulic-lift vehicle checks → "accessibility".
- Dormant accounts, suspicious logins, user account review → "user-steward".
- Hotel/room RATES lookups (existing contract data, possibly for a specific date) → "analyst" with entity="srHotel".

Pick exactly ONE primaryAgents per intent EXCEPT for "mixed" (which can be many).

If your entity string for analystHint cannot be determined, set it to "".
Pick "window" from {"today","this_week","this_month","last_30_days","last_90_days","all_time"} or "" if unclear — leave it "" whenever filters.dateText is set instead (the date filter takes priority over a window).

Return strictly JSON. No prose.`;

/**
 * Zero-latency fast path: recognizes unambiguous "how many/count of <entity>"
 * questions with no name/date/hotel/ref qualifiers, and skips the LLM router
 * call entirely. Returns null (falls through to the real LLM router) for
 * anything with a qualifier or ambiguity, since those need real language
 * understanding (names, dates in arbitrary formats, misspellings the regex
 * below wouldn't catch).
 */
const ENTITY_KEYWORDS: [RegExp, string][] = [
  [/booking/i, 'booking'],
  [/invoice/i, 'invoice'],
  [/cost\s*sheet/i, 'costSheet'],
  [/client/i, 'client'],
  [/voucher/i, 'voucher'],
  [/itinerary|itineraries/i, 'itinerary'],
  [/(agent\s*run|pipeline\s*run)/i, 'agentRun'],
  [/\buser\b/i, 'user'],
  [/(hotel|rate)/i, 'srHotel'],
  [/tour\s*package/i, 'tourPackage'],
];

function quickClassify(prompt: string): RouterDecision | null {
  const isCount = /^(how many|count of|number of|total number of)\b/i.test(prompt.trim());
  if (!isCount) return null;
  // Bail if the prompt has anything that needs real understanding — a name,
  // a date-like token, or a specific reference — let the LLM router handle it.
  const hasQualifier = /\b(on|for|by|dated?|named?)\b|\d{1,4}[-/]\d{1,2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/i.test(prompt);
  if (hasQualifier) return null;

  const match = ENTITY_KEYWORDS.find(([re]) => re.test(prompt));
  if (!match) return null;

  return {
    intent: 'answer',
    primaryAgents: ['analyst'],
    rationale: 'quick-classified: unambiguous count question, no LLM call needed',
    analystHint: { kind: 'count', entity: match[1], window: 'all_time' },
  };
}

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
  const quick = quickClassify(prompt);
  if (quick) return quick;

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
      'booking-coordinator', 'voucher-clerk', 'accessibility', 'user-steward',
    ]);
    parsed.primaryAgents = (parsed.primaryAgents || []).filter((a: any): a is AgentName => allowed.has(a));
    if (parsed.primaryAgents.length === 0) parsed.primaryAgents = ['analyst'];
    return parsed;
  } catch (e: any) {
    // Fallback: never block the user. Use the default panel selection,
    // prepend analyst if it looks like a question, otherwise check a few
    // obvious keyword routes before giving up to the default panel selection.
    const looksLikeQuestion = /(how many|how much|total|count|sum|average|avg|most|least|which|when|where|who|show|list|give me|find|what)/i.test(prompt);
    const looksLikeAccessibility = /wheelchair|accessib|hydraulic.*lift|mobility/i.test(prompt);
    // Only "voucher-clerk" for actual drafting/sending — NOT for "give me/show/list
    // vouchers" style lookups, which should fall through to analyst below.
    const looksLikeVoucherAction = /(draft|create|issue|generate|send|email).{0,20}voucher|voucher.{0,20}(send|email)/i.test(prompt);
    const looksLikeBooking = /balance due|overdue|cancel booking|complete booking|upcoming trip/i.test(prompt);
    const looksLikeUserOps = /dormant|inactive user|suspicious login|deactivat/i.test(prompt);

    let fallbackAgents: AgentName[] = defaultAgents.length ? defaultAgents : ['analyst'];
    let fallbackIntent: RouterIntent = looksLikeQuestion ? 'answer' : 'draft';
    if (looksLikeAccessibility) { fallbackAgents = ['accessibility']; fallbackIntent = 'verify'; }
    else if (looksLikeVoucherAction) { fallbackAgents = ['voucher-clerk']; fallbackIntent = 'draft'; }
    else if (looksLikeBooking) { fallbackAgents = ['booking-coordinator']; fallbackIntent = 'verify'; }
    else if (looksLikeUserOps) { fallbackAgents = ['user-steward']; fallbackIntent = 'verify'; }
    else if (looksLikeQuestion) { fallbackAgents = ['analyst']; }

    return {
      intent: fallbackIntent,
      primaryAgents: fallbackAgents,
      rationale: `router fallback: ${e.message}`,
    };
  }
}
