'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AgentName } from '@/lib/agents/types';

interface Msg {
  id: string;
  agent: string;
  kind: string;
  content: string;
  payload?: any;
  createdAt: string;
}

const ORIGIN_MAP: Record<string, AgentName> = {
  '/dashboard/cost-sheets': 'cost-sheet',
  '/dashboard/costing': 'cost-sheet',
  '/dashboard/itineraries': 'itinerary',
  '/dashboard/invoices': 'invoice',
  '/dashboard/safari-rates': 'rate-intel',
  '/dashboard/ai-agents': 'orchestrator',
  '/dashboard/bookings': 'booking-coordinator',
  '/dashboard/vouchers': 'voucher-clerk',
  '/dashboard/admin/users': 'user-steward',
};
const ALL_AGENTS: { id: AgentName; label: string; emoji: string }[] = [
  { id: 'analyst', label: 'Analyst', emoji: '🧮' },
  { id: 'cost-sheet', label: 'Cost Sheet', emoji: '💰' },
  { id: 'itinerary', label: 'Itinerary', emoji: '🗺️' },
  { id: 'invoice', label: 'Invoice', emoji: '🧾' },
  { id: 'rate-intel', label: 'Rate Intel', emoji: '📊' },
  { id: 'itinerary-gen', label: 'Itinerary Gen', emoji: '🌐' },
  { id: 'monitor', label: 'Monitor', emoji: '🛡️' },
  { id: 'booking-coordinator', label: 'Booking Coordinator', emoji: '📅' },
  { id: 'voucher-clerk', label: 'Voucher Clerk', emoji: '✉️' },
  { id: 'accessibility', label: 'Accessibility', emoji: '♿' },
  { id: 'user-steward', label: 'User Steward', emoji: '🔐' },
];

// In simple mode (the default) we hide the pipeline's internal chatter —
// routing decisions, handoffs, and raw DB tool calls — and only show what a
// human actually needs: their own message, final answers, notifications,
// and anything needing their input. Flip "Show agent process" to see it all.
const VISIBLE_KINDS_SIMPLE = new Set(['user', 'assistant', 'notify', 'confirm-request', 'confirm-response', 'error']);

export default function AgentChatPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [agents, setAgents] = useState<AgentName[]>(['analyst', 'cost-sheet', 'itinerary', 'invoice', 'rate-intel']);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const origin = (Object.keys(ORIGIN_MAP).find((p) => pathname?.startsWith(p)) && ORIGIN_MAP[pathname!]) || 'ui';
  const defaultAgents: AgentName[] = origin !== 'ui'
    ? ([origin] as AgentName[])
    : (['analyst', 'cost-sheet', 'itinerary', 'invoice', 'rate-intel', 'itinerary-gen', 'monitor'] as AgentName[]);

  useEffect(() => {
    setAgents(defaultAgents);
    setMessages([]);
    setRunId(null);
    setPrompt('');
    setPinned(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!runId) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agents/runs/${runId}`).then((r) => r.json()).catch(() => null);
      if (!res) return;
      setMessages(
        (res.messages || []).map((m: any) => ({
          id: m.id, agent: m.agent, kind: m.kind, content: m.content, payload: m.payload, createdAt: new Date(m.createdAt).toISOString(),
        })),
      );
      if (res.status === 'done' || res.status === 'error' || res.status === 'awaiting-confirmation') {
        setBusy(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [runId]);

  function toggleAgent(a: AgentName) {
    setPinned(true);
    setAgents((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setMessages([{ id: 'temp', agent: 'ui', kind: 'user', content: prompt, createdAt: new Date().toISOString() }]);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, prompt, agents, pinnedAgents: pinned }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setRunId(res.runId);
    } catch (err: any) {
      setBusy(false);
      setMessages((m) => [...m, { id: 'e', agent: 'orchestrator', kind: 'error', content: err.message, createdAt: new Date().toISOString() }]);
    }
  }

  // Seed a sensible prompt per dashboard
  function seedPrompt() {
    const seeds: Record<string, string> = {
      'cost-sheet': 'Draft a 3-day Maasai Mara FB cost sheet using available contract rates, 2 adults, 10% markup.',
      'analyst': 'How many bookings were created this month, and what is the total invoiced across them?',
      'itinerary': 'Write a 3-day itinerary for a first-time Kenya visitor covering Maasai Mara.',
      'invoice': 'Verify the most recent invoice against its cost sheet and flag any markup or totals issues.',
      'rate-intel': 'Scan contract rates and tell me which hotels have missing seasons or zero prices.',
      'monitor': 'Audit the last 24h of activity — give me a memory digest and anything risky.',
      'itinerary-gen': 'Load this PDF and turn it into a clean day-by-day itinerary.',
      'booking-coordinator': 'Which upcoming bookings still have a balance due?',
      'voucher-clerk': 'Draft the hotel voucher and confirmation email for this booking.',
      'accessibility': 'Check whether this booking\u2019s wheelchair-access request has a matching vehicle assigned.',
      'user-steward': 'Flag any dormant user accounts that haven\u2019t logged in for 60+ days.',
    };
    setPrompt(seeds[origin] || 'Brief the agents…');
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition flex items-center justify-center text-2xl print:hidden"
        title="AI agents"
      >
        🤖
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-96 max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col print:hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 text-sm">AI Agents</p>
              <p className="text-xs text-gray-400">origin: <code className="text-orange-500">{origin}</code></p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* Agent selector */}
          <div className="px-4 py-2 border-b bg-gray-50">
            <p className="text-xs text-gray-500 mb-1.5">Agents in this run (sequential):</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AGENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAgent(a.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    agents.includes(a.id) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {a.emoji} {a.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTrace((s) => !s)}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 underline"
            >
              {showTrace ? 'Hide agent process — show just the answer' : 'Show agent process (routing, handoffs, tool calls)'}
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                <p>Pick agents above, write a prompt and hit Run.</p>
                <button onClick={seedPrompt} className="mt-3 text-orange-500 text-xs hover:underline">Insert an example prompt</button>
              </div>
            )}
            {messages
              .filter((m) => showTrace || VISIBLE_KINDS_SIMPLE.has(m.kind))
              .map((m) => {
              const isUser = m.agent === 'ui' && m.kind === 'user';
              const isErr = m.kind === 'error';
              return (
                <div key={m.id} className={`text-sm rounded-lg px-3 py-2 ${isUser ? 'bg-blue-50 border border-blue-200' : isErr ? 'bg-red-50 border border-red-200' : m.kind === 'confirm-request' ? 'bg-amber-50 border border-amber-300' : m.kind === 'notify' ? 'bg-sky-50 border border-sky-200' : m.kind === 'system' || m.kind === 'handoff' ? 'bg-gray-50 border border-gray-200 text-gray-600' : 'bg-orange-50 border border-orange-100'}`}>
                  <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5 text-gray-500">{m.agent} · {m.kind}</p>
                  <p className="whitespace-pre-wrap break-words text-gray-800">{m.content}</p>
                  {m.payload && (
                    <pre className="mt-1 text-[10px] bg-white/60 rounded p-1.5 overflow-x-auto text-gray-600 max-h-32">{JSON.stringify(m.payload, null, 2).slice(0, 600)}</pre>
                  )}
                </div>
              );
            })}
            {busy && <div className="text-center text-xs text-gray-400 animate-pulse">agents working…</div>}
            {!busy && messages.some((m) => m.kind === 'confirm-request') && runId && (
              <a href={`/dashboard/ai-agents/${runId}`} className="block text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 hover:bg-amber-100">
                👤 Waiting on your confirmation — open full run to Approve/Reject
              </a>
            )}
          </div>

          {/* Input */}
          <form onSubmit={submit} className="border-t p-3 flex gap-2">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Brief the agents…" className="input flex-1 text-sm" disabled={busy} />
            <button type="submit" disabled={busy || !prompt.trim()} className="btn-primary text-sm whitespace-nowrap">{busy ? '⏳' : 'Run'}</button>
          </form>
        </div>
      )}
    </>
  );
}
