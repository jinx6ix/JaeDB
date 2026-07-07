// app/dashboard/ai-agents/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ConfirmActions from '@/components/ConfirmActions';

export const dynamic = 'force-dynamic';

const KIND_COLOR: Record<string, string> = {
  system: 'bg-gray-50 border-gray-200 text-gray-600',
  user: 'bg-blue-50 border-blue-200',
  handoff: 'bg-gray-50 border-gray-200 text-gray-600 italic',
  tool: 'bg-purple-50 border-purple-200',
  assistant: 'bg-orange-50 border-orange-100',
  notify: 'bg-sky-50 border-sky-200',
  'confirm-request': 'bg-amber-50 border-amber-300',
  'confirm-response': 'bg-emerald-50 border-emerald-200',
  error: 'bg-red-50 border-red-200',
};

const VISIBLE_KINDS_SIMPLE = new Set(['user', 'assistant', 'notify', 'confirm-request', 'confirm-response', 'error']);

export default async function AIAgentRunDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ trace?: string }> }) {
  const { id } = await params;
  const { trace } = await searchParams;
  const showTrace = trace === '1';
  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!run) notFound();
  const visibleMessages = showTrace ? run.messages : run.messages.filter((m) => VISIBLE_KINDS_SIMPLE.has(m.kind));

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ai-agents" className="text-gray-400 hover:text-gray-600 text-sm">← AI Agents</Link>
      </div>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Prompt · {new Date(run.createdAt).toLocaleString()}</p>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{run.prompt}</h1>
            <p className="text-xs text-gray-500 mt-2">
              origin <code className="text-orange-500">{run.origin}</code> · {run.steps} steps · status{' '}
              <span className={
                run.status === 'done' ? 'text-green-600'
                  : run.status === 'running' ? 'text-yellow-600'
                  : run.status === 'awaiting-confirmation' ? 'text-amber-600'
                  : 'text-red-600'
              }>{run.status}</span>
            </p>
            {run.summary && <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">{run.summary}</p>}
          </div>
        </div>
      </div>

      {run.status === 'awaiting-confirmation' && (() => {
        const pending = [...run.messages].reverse().find((m) => m.kind === 'confirm-request');
        return pending ? <ConfirmActions runId={run.id} question={pending.content} /> : null;
      })()}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{showTrace ? 'Conversation trace' : 'Answer'}</h2>
        <Link
          href={`/dashboard/ai-agents/${run.id}${showTrace ? '' : '?trace=1'}`}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          {showTrace ? 'Hide process — show just the answer' : 'Show full agent process'}
        </Link>
      </div>
      <div className="space-y-2">
        {visibleMessages.map((m) => (
          <div key={m.id} className={`rounded-lg border px-4 py-2.5 ${KIND_COLOR[m.kind] || 'bg-white border-gray-200'}`}>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-gray-500">
              {m.agent} · {m.kind} · {new Date(m.createdAt).toLocaleTimeString()}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{m.content}</p>
            {m.payload && (
              <pre className="mt-2 text-xs bg-white/70 rounded p-2 overflow-x-auto text-gray-600 max-h-48">
                {JSON.stringify(m.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
