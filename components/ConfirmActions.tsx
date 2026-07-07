'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfirmActions({ runId, question }: { runId: string; question: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  async function respond(approve: boolean) {
    setBusy(approve ? 'approve' : 'reject');
    try {
      const res = await fetch(`/api/agents/runs/${runId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, note: note || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to respond');
      }
      setDone(true);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (done) return <p className="text-sm text-green-700">Response recorded — refreshing…</p>;

  return (
    <div className="card p-4 border-2 border-amber-300 bg-amber-50 space-y-2">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">👤 Waiting on your confirmation</p>
      <p className="text-sm text-gray-800">{question}</p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="input text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => respond(true)}
          disabled={!!busy}
          className="btn-primary text-sm"
        >
          {busy === 'approve' ? '⏳' : '✅'} Approve
        </button>
        <button
          onClick={() => respond(false)}
          disabled={!!busy}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          {busy === 'reject' ? '⏳' : '✕'} Reject
        </button>
      </div>
    </div>
  );
}
