// lib/agents/llm.ts
// Thin wrapper around NVIDIA's OpenAI-compatible NIM endpoint.
// Free-tier models live at https://integrate.api.nvidia.com/v1
// We use native fetch (no SDK dependency) so this works without `openai` installed.

const NVIDIA_BASE = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** Optional timeout in ms (default 60s). */
  timeoutMs?: number;
}

/**
 * Default model for the NVIDIA NIM free tier.
 * Override globally via NVIDIA_MODEL env var, or per-call via LLMOptions.model.
 * `nvidia/llama-3.3-nemotron-super-49b-v1.5` is the user's preferred free-tier model.
 */
export const DEFAULT_MODEL = process.env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1.5';

/**
 * Fallback models tried in order if the primary returns 404 / 403 / 5xx.
 */
export const FALLBACK_MODELS: string[] = [
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'mistralai/mistral-large-2-instruct',
  'nvidia/nemotron-mini-4b-instruct',
  'microsoft/phi-3-medium-128k-instruct',
];

export function availableFallbacks(): string[] {
  const head = process.env.NVIDIA_MODEL ? [process.env.NVIDIA_MODEL] : [DEFAULT_MODEL];
  return [...head, ...FALLBACK_MODELS.filter((m) => !head.includes(m))];
}

/**
 * Call a NVIDIA NIM chat-completions endpoint and return the assistant text.
 * If the requested model is unavailable (404), tries each FALLBACK_MODELS candidate.
 * Throws on non-2xx-after-fallback or missing API key.
 */
export async function chatComplete(
  messages: LLMMessage[],
  opts: LLMOptions = {},
): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error('NVIDIA_API_KEY environment variable is not set. Get a free key at https://build.nvidia.com.');
  }
  const budgetMs = opts.timeoutMs ?? 60_000;
  const deadline = Date.now() + budgetMs;
  const tried: string[] = [];
  const requested = opts.model || (opts as any).model; // allow explicit opts.model
  const queue = requested ? [requested] : availableFallbacks();

  let lastErr: Error | null = null;
  while (queue.length) {
    const model = queue.shift()!;
    if (tried.includes(model)) continue;
    tried.push(model);
    const remaining = Math.max(5_000, deadline - Date.now());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 2048,
          ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`NVIDIA LLM ${res.status} (${model}): ${text.slice(0, 240)}`);
        // Only try other models for these recoverable statuses, otherwise throw immediately.
        if (res.status === 404 || res.status === 403 || res.status === 401 || (res.status >= 500 && res.status !== 503)) {
          lastErr = err;
          continue; // try next fallback
        }
        throw err;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('NVIDIA LLM: unexpected response shape (no content).');
      }
      return content;
    } catch (e: any) {
      // If we have alternate fallbacks and this was a transient error, keep going;
      // otherwise surface immediately.
      if (queue.length === 0) throw e;
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('NVIDIA LLM: no model succeeded.');
}

/**
 * Extract a JSON object from an LLM response that may be wrapped in prose or
 * fenced code blocks. Returns null if no JSON object can be found.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  // 1) Try fenced ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch { /* fall through */ }
  }
  // 2) Try first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fall through */ }
  }
  // 3) Try the whole thing
  try { return JSON.parse(text); } catch { /* fall through */ }
  return null;
}

/**
 * Verify the API key + endpoint are reachable with a tiny ping.
 * Returns { ok, model, detail }.
 */
export async function pingLLM(): Promise<{ ok: boolean; model: string; detail?: string }> {
  try {
    const out = await chatComplete(
      [{ role: 'user', content: 'Reply with the single word: pong' }],
      { maxTokens: 8, temperature: 0 },
    );
    return { ok: /pong/i.test(out), model: DEFAULT_MODEL };
  } catch (e: any) {
    return { ok: false, model: DEFAULT_MODEL, detail: e.message };
  }
}
