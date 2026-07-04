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
  | 'ui';

export type MessageKind =
  | 'system'      // orchestrator status (pipeline started/finished)
  | 'user'        // human-initiated request
  | 'handoff'     // one agent → another agent
  | 'tool'        // agent ↔ DB / API action result
  | 'assistant'   // agent final answer for this step
  | 'audit'       // monitor agent events (user login, agent action, etc.)
  | 'routing'     // router classification + pipeline selection
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
}

export interface AgentStepResult {
  ok: boolean;
  /** Human / agent readable summary passed to the next step. */
  summary: string;
  /** Optional structured output for downstream agents. */
  data?: Record<string, unknown>;
}
