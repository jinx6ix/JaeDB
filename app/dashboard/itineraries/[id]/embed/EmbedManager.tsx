'use client';
import { useState } from 'react';

interface EmbedRow {
  id: string; token: string; label: string; visits: number;
  expiresAt: string | null; createdAt: string;
}

export default function EmbedManager({ itineraryId, embeds: initial, baseUrl }: { itineraryId: string; embeds: EmbedRow[]; baseUrl: string }) {
  const [embeds, setEmbeds] = useState<EmbedRow[]>(initial);
  const [label, setLabel] = useState('Public');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [busy, setBusy] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : (baseUrl || '');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, expiresInDays: expiresInDays ? Number(expiresInDays) : undefined }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setEmbeds((p) => [{ ...res, createdAt: new Date().toISOString() }, ...p]);
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function remove(tokenId: string) {
    if (!confirm('Revoke this embed token? Any page using it will stop working.')) return;
    await fetch(`/api/itineraries/${itineraryId}/embed?tokenId=${tokenId}`, { method: 'DELETE' });
    setEmbeds((p) => p.filter((e) => e.id !== tokenId));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Create new embed</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Label</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Public" />
          </div>
          <div>
            <label className="label text-xs">Expires (days, optional)</label>
            <input type="number" min={1} className="input" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="leave blank for never" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? '…' : 'Create embed'}</button>
          </div>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Public URL</th>
              <th className="px-4 py-3">Visits</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {embeds.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No embeds yet — create one above.</td></tr>}
            {embeds.map((e) => {
              const url = `${origin}/embed/itineraries/${e.token}`;
              const iframe = `<iframe src="${url}" width="100%" height="540" frameborder="0" style="border:0;border-radius:12px;overflow:hidden"></iframe>`;
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.label}<div className="text-[10px] text-gray-400">{e.expiresAt ? `exp ${new Date(e.expiresAt).toLocaleDateString()}` : 'no expiry'}</div></td>
                  <td className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 rounded px-2 py-0.5 truncate max-w-md">{url}</code>
                      <button type="button" className="text-xs text-orange-500 hover:underline" onClick={() => navigator.clipboard?.writeText(url)}>copy URL</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] bg-orange-50 text-orange-800 rounded px-2 py-0.5 truncate max-w-md">{iframe.slice(0, 110)}…</code>
                      <button type="button" className="text-xs text-orange-500 hover:underline" onClick={() => navigator.clipboard?.writeText(iframe)}>copy iframe</button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.visits}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove(e.id)} className="text-red-400 hover:text-red-600 text-xs">Revoke</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
