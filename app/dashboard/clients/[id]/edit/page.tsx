'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditClientPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [client, setClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(setClient);
  }, [id]);

  if (!client) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
    };
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push(`/dashboard/clients/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Client</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit {client.name}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input name="name" required className="input" defaultValue={client.name} />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" defaultValue={client.email || ''} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" defaultValue={client.phone || ''} />
          </div>
          <div>
            <label className="label">Nationality</label>
            <input name="nationality" className="input" defaultValue={client.nationality || ''} />
          </div>
          <div>
            <label className="label">Resident Status</label>
            <select name="isResident" className="input" defaultValue={client.isResident ? 'true' : 'false'}>
              <option value="false">Non-Resident</option>
              <option value="true">Resident</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input name="address" className="input" defaultValue={client.address || ''} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes / Special Requirements</label>
            <textarea name="notes" rows={3} className="input resize-none" defaultValue={client.notes || ''} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href={`/dashboard/clients/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
