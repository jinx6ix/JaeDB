// app/dashboard/ai-agents/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { pingLLM } from '@/lib/agents/llm';

export const dynamic = 'force-dynamic';

const AGENTS = [
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

export default async function AIAgentsPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
  });
  const ping = await pingLLM();
  const total = await prisma.agentRun.count();
  const byStatus: Record<string, number> = {};
  for (const r of await prisma.agentRun.groupBy({ by: ['status'], _count: true })) {
    byStatus[r.status] = r._count;
  }

  // Count recent (last 24h) runs per agent name from message trails
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPerAgent = await prisma.agentMessage.groupBy({
    by: ['agent'],
    where: { kind: { in: ['assistant', 'error'] }, createdAt: { gte: since } },
    _count: true,
  });
  const agentCount: Record<string, number> = Object.fromEntries(AGENTS.map((a) => [a.id, 0]));
  for (const row of recentPerAgent) {
    if (row.agent in agentCount) agentCount[row.agent] = (agentCount[row.agent] || 0) + row._count;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Multi-agent automation console</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">LLM Status</p>
          <p className={`mt-2 text-lg font-bold flex items-center gap-2 ${ping.ok ? 'text-green-600' : 'text-red-600'}`}>
            <span>{ping.ok ? '●' : '○'}</span> {ping.ok ? 'Online' : 'Offline'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{ping.model}</p>
          {ping.detail && <p className="text-xs text-red-500 mt-1 break-all">{ping.detail}</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">Total Runs</p>
          <p className="mt-2 text-3xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-gray-400 mt-1">{byStatus.done || 0} done · {byStatus.running || 0} running · {byStatus.error || 0} errored</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">Active Agents</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AGENTS.map((a) => {
              const n = agentCount[a.id] || 0;
              const dot = n === 0 ? '○' : '●';
              const tone = n === 0 ? 'text-gray-400' : 'text-orange-700';
              return (
                <span key={a.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                  <span className={`mr-1 ${tone}`}>{dot}</span>
                  {a.emoji} {a.label} <span className="text-gray-400">·{n} 24h</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        The 🤖 button in the bottom-right corner of every dashboard opens the agent prompt drawer. Pick which agents should participate and brief them — they run sequentially and share context through handoffs.
      </p>

      <h2 className="text-lg font-semibold text-gray-800">Recent Runs</h2>
      <div className="grid gap-3">
        {runs.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🤖</p>
            <p>No agent runs yet. Open the floating 🤖 button on any dashboard to brief the agents.</p>
          </div>
        )}
        {runs.map((r) => (
          <Link href={`/dashboard/ai-agents/${r.id}`} key={r.id} className="card hover:shadow-md transition-shadow p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 truncate">{r.prompt}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(r.createdAt).toLocaleString()} · origin <code className="text-orange-500">{r.origin}</code> · {r.steps} step(s)
                </p>
                {r.summary && <p className="text-sm text-gray-600 mt-1">{r.summary}</p>}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
                r.status === 'done' ? 'bg-green-100 text-green-700' : r.status === 'running' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {r.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
