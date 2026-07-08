'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface Agent {
  id: string; name: string; company?: string; email?: string; phone?: string;
  isActive: boolean; _count: { clients: number };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agents?`)
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Auto-update as the user types — no submit button required.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter(a =>
      a.name?.toLowerCase().includes(needle) ||
      (a.company || '').toLowerCase().includes(needle) ||
      (a.email || '').toLowerCase().includes(needle) ||
      (a.phone || '').toLowerCase().includes(needle)
    );
  }, [agents, q]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Travel agents & partners who refer clients</p>
        </div>
        <Link href="/dashboard/agents/new" className="btn-primary">+ New Agent</Link>
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search by name, company, email, phone…"
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Agent / Company', 'Email', 'Phone', 'Clients', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">{q ? `No agents match "${q}".` : 'No agents yet.'}</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{a.name}</p>
                  {a.company && <p className="text-xs text-gray-500">{a.company}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{a.email || '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{a.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {a._count.clients} client{a._count.clients !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/agents/${a.id}/edit`} className="text-orange-500 hover:underline text-xs font-medium">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
