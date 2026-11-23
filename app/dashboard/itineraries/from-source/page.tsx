'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ItineraryFromSource() {
  const router = useRouter();
  const [mode, setMode] = useState<'url' | 'pdf'>('url');
  const [url, setUrl] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [runId, setRunId] = useState<string | null>(null);

  async function poll(runId: string) {
    setRunId(runId);
    setBusy(true);
    const start = Date.now();
    const tick = async () => {
      if (Date.now() - start > 180_000) {
        setError('Agent run timed out — check /dashboard/ai-agents');
        setBusy(false);
        return;
      }
      try {
        const r = await fetch(`/api/agents/runs/${runId}`).then((r) => r.json());
        if (r.status === 'done') {
          setBusy(false);
          if (r.summary?.includes('saved as #')) {
            const m = r.summary.match(/saved as #([a-z0-9]+)/i);
            if (m) router.push(`/dashboard/itineraries/${m[1]}`);
            return;
          }
        } else if (r.status === 'error') {
          setError(r.summary || 'agent failed');
          setBusy(false);
          return;
        }
      } catch { /* ignore */ }
      setTimeout(tick, 2000);
    };
    tick();
  }

  async function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { setError('Please paste a URL'); return; }
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/itineraries/from-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), bookingId: bookingId || undefined }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      await poll(res.runId);
    } catch (e: any) { setError(e.message); setBusy(false); }
  }

  async function submitPdf(e: React.FormEvent) {
    e.preventDefault();
    const input = (e.currentTarget as any).pdfFile as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) { setError('Please choose a PDF'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (bookingId) fd.append('bookingId', bookingId);
      const res = await fetch('/api/itineraries/from-source', { method: 'POST', body: fd }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setUploading(false);
      await poll(res.runId);
    } catch (e: any) { setError(e.message); setUploading(false); }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/itineraries" className="text-gray-400 hover:text-gray-600 text-sm">← Itineraries</Link>
        <h1 className="text-2xl font-bold text-gray-900">Generate from Source</h1>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('url')}
          className={`flex-1 card text-left p-5 transition ${mode === 'url' ? 'border-orange-400 ring-2 ring-orange-200' : 'hover:border-orange-300'}`}
        >
          <span className="text-2xl">🌐</span>
          <p className="font-semibold mt-2 text-gray-800">From website URL</p>
          <p className="text-xs text-gray-500 mt-1">Paste a tour company or competitor page. The AI agent pulls the content and structures a day-by-day itinerary.</p>
        </button>
        <button
          onClick={() => setMode('pdf')}
          className={`flex-1 card text-left p-5 transition ${mode === 'pdf' ? 'border-orange-400 ring-2 ring-orange-200' : 'hover:border-orange-300'}`}
        >
          <span className="text-2xl">📄</span>
          <p className="font-semibold mt-2 text-gray-800">From PDF upload</p>
          <p className="text-xs text-gray-500 mt-1">Upload a brochure or supplier proposal. The agent reads it and converts it into a structured itinerary.</p>
        </button>
      </div>

      <div className="card p-5">
        <label className="label text-xs">Booking ID (optional — will save the itinerary to this booking)</label>
        <input className="input mb-4" value={bookingId || ''} onChange={(e) => setBookingId(e.target.value)} placeholder="cuid…" />

        {mode === 'url' ? (
          <form onSubmit={submitUrl} className="space-y-3">
            <label className="label text-xs">Website URL</label>
            <input className="input" value={url || ''} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/7-day-kenya-safari" />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">{busy ? '⏳ Working…' : 'Generate itinerary'}</button>
              <Link href="/dashboard/itineraries" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={submitPdf} className="space-y-3">
            <label className="label text-xs">PDF file</label>
            <input type="file" name="pdfFile" accept="application/pdf" className="input" key={mode} />
            <div className="flex gap-2">
              <button type="submit" disabled={uploading || busy} className="btn-primary">{uploading || busy ? '⏳ Working…' : 'Generate itinerary'}</button>
              <Link href="/dashboard/itineraries" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        )}

        {error && <div className="mt-3 bg-red-50 text-red-700 text-sm rounded p-3">{error}</div>}
        {runId && busy && (
          <div className="mt-3 text-sm text-gray-600">
            <p>🤖 Itinerary-gen agent running…</p>
            <p className="text-xs text-gray-400 mt-1">Run id: <code>{runId.slice(0, 8)}</code> — view <Link className="text-orange-500" href={`/dashboard/ai-agents/${runId}`}>full trace</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
