'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Agent { id: string; name: string; company?: string; }

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => setAgents(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      email: fd.get('email') || null,
      phone: fd.get('phone') || null,
      nationality: fd.get('nationality') || null,
      isResident: fd.get('isResident') === 'true',
      address: fd.get('address') || null,
      notes: fd.get('notes') || null,
      agentId: fd.get('agentId') || null,
    };
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      router.push(`/dashboard/clients/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to create client');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients" className="text-gray-400 hover:text-gray-600 text-sm">← Clients</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input name="name" required className="input" placeholder="Ms. Christina Cosandier" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" placeholder="client@example.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" placeholder="+254 700 000000" />
          </div>
          <div>
            <label className="label">Nationality</label>
            <input name="nationality" className="input" placeholder="Swiss" />
          </div>
          <div>
            <label className="label">Resident Status</label>
            <select name="isResident" className="input">
              <option value="false">Non-Resident</option>
              <option value="true">Resident</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input name="address" className="input" placeholder="City, Country" />
          </div>
          <div className="col-span-2">
            <label className="label">Referred by Agent</label>
            <select name="agentId" className="input">
              <option value="">— No agent / Direct —</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}{a.company ? ` — ${a.company}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Notes / Special Requirements</label>
            <textarea name="notes" rows={3} className="input resize-none" placeholder="E.g. Requires wheelchair accessible room" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Create Client'}
          </button>
          <Link href="/dashboard/clients" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
