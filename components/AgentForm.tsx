'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AgentFormData {
  name: string; company: string; email: string; phone: string;
  address: string; notes: string; isActive: boolean;
}

interface Props {
  initial?: Partial<AgentFormData>;
  agentId?: string;
}

export default function AgentForm({ initial, agentId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<AgentFormData>({
    name: initial?.name || '',
    company: initial?.company || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    notes: initial?.notes || '',
    isActive: initial?.isActive ?? true,
  });

  function set(k: keyof AgentFormData, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');

    const url = agentId ? `/api/agents/${agentId}` : '/api/agents';
    const method = agentId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push('/dashboard/agents');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to save agent');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/agents" className="text-gray-400 hover:text-gray-600 text-sm">← Agents</Link>
        <h1 className="text-2xl font-bold text-gray-900">{agentId ? 'Edit Agent' : 'New Agent'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Contact Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required className="input" placeholder="Jane Mwangi" />
          </div>
          <div className="col-span-2">
            <label className="label">Company / Agency</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} className="input" placeholder="Savanna Tours Ltd." />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="input" placeholder="agent@company.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+254 700 000000" />
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className="input" placeholder="Nairobi, Kenya" />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input h-20 resize-none" placeholder="Any internal notes…" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')} className="input">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : agentId ? 'Save Changes' : 'Create Agent'}</button>
          <Link href="/dashboard/agents" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
