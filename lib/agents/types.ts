// lib/agents/types.ts
// Shared contracts for the multi-agent system.

export type AgentName =
  | 'orchestrator'
  | 'cost-sheet'
  | 'itinerary'
  | 'invoice'
  | 'rate-intel'
  | 'itinerary-gen'
  | 'monitor'
  | 'analyst'
  | 'booking-coordinator'
  | 'voucher-clerk'
  | 'accessibility'
  | 'user-steward'
  | 'ui';

export type MessageKind =
  | 'system'      // orchestrator status (pipeline started/finished)
  | 'user'        // human-initiated request
  | 'handoff'     // one agent → another agent
  | 'tool'        // agent ↔ DB / API action result
  | 'assistant'   // agent final answer for this step
  | 'audit'       // monitor agent events (user login, agent action, etc.)
  | 'routing'     // router classification + pipeline selection
  | 'notify'      // agent → human notification (surfaced in UI, optionally emailed)
  | 'confirm-request'  // agent is blocked, waiting on a human yes/no
  | 'confirm-response' // human's answer to a confirm-request
  | 'error';

export interface AgentMessageLite {
  id?: string;
  runId: string;
  agent: AgentName;
  kind: MessageKind;
  content: string;
  /** Optional structured payload (JSON-stringified by the API layer). */
  payload?: Record<string, unknown>;
  createdAt?: string;
}

export interface AgentRunRequest {
  /** The dashboard that kicked off the run. */
  origin: AgentName | 'ui';
  /** What the user asked for. */
  prompt: string;
  /** Optional entity IDs already in context (e.g. a bookingId). */
  context?: {
    bookingId?: string;
    costSheetId?: string;
    itineraryId?: string;
    invoiceId?: string;
    voucherId?: string;
    userId?: string;
    hotelId?: number;
    /** Used by itinerary-gen agent — see lib/agents/itinerary-gen-agent.ts */
    source?: any;
  };
  /** Which agents to involve; defaults to all four. */
  agents?: AgentName[];
  /**
   * If true, the orchestrator's smart router is bypassed and `agents` is used
   * verbatim (user's explicit selection from the chat panel). Otherwise the
   * router classifies the prompt and decides which agents run.
   */
  pinnedAgents?: boolean;
}

export interface AgentRunResult {
  runId: string;
  ok: boolean;
  summary: string;
  steps: number;
}

/** Each agent implements this. */
export interface Agent {
  name: AgentName;
  description: string;
  run(ctx: AgentContext): Promise<AgentStepResult>;
}

export interface AgentContext {
  runId: string;
  prompt: string;
  context: AgentRunRequest['context'];
  /** Append a message to the shared log; returns the saved row. */
  log: (msg: Omit<AgentMessageLite, 'runId' | 'createdAt'>) => Promise<void>;
  /** Read the full conversation log so far (chronological). */
  history: () => Promise<AgentMessageLite[]>;
  /** Ask the LLM with this agent's system prompt already prepended. */
  ask: (user: string, opts?: { jsonMode?: boolean; maxTokens?: number }) => Promise<string>;
  /**
   * Push a human-facing notification. Requires the calling agent to have
   * `canNotify: true` in lib/agents/permissions.ts — throws otherwise.
   * `channel: 'email'` actually sends via the existing nodemailer transport
   * (see lib/agents/notify.ts); omitted/'log' just records it for the UI.
   */
  notify: (msg: string, opts?: { channel?: 'log' | 'email'; to?: string; subject?: string }) => Promise<void>;
  /**
   * Ask another registered agent to run, synchronously, as a sub-step of this
   * agent's turn. Requires `canRequestAgent` to include the target's name in
   * lib/agents/permissions.ts — throws otherwise. Logs a 'handoff' message
   * attributed to the requesting agent (not the orchestrator).
   */
  requestAgent: (target: AgentName, prompt: string, context?: AgentRunRequest['context']) => Promise<AgentStepResult>;
  /**
   * Halt this run and wait for a human yes/no before continuing. Logs a
   * 'confirm-request' message and returns a step result with `pending: true`,
   * which the orchestrator uses to stop the pipeline. Resumed via
   * POST /api/agents/runs/[id]/confirm.
   */
  requireConfirmation: (question: string, data?: Record<string, unknown>) => Promise<AgentStepResult>;
}

export interface AgentStepResult {
  ok: boolean;
  /** Human / agent readable summary passed to the next step. */
  summary: string;
  /** Optional structured output for downstream agents. */
  data?: Record<string, unknown>;
  /** True if this step is blocked on a human confirmation (see requireConfirmation). */
  pending?: boolean;
}
