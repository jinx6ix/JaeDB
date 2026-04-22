'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password'),
      role: fd.get('role'),
    };
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      router.push('/dashboard/admin/users');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to create user');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/users" className="text-gray-400 hover:text-gray-600 text-sm">← Users</Link>
        <h1 className="text-2xl font-bold text-gray-900">New User</h1>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}
        <div>
          <label className="label">Full Name *</label>
          <input name="name" required className="input" placeholder="Antony Waititu" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" required className="input" placeholder="antony@jaetravel.co.ke" />
        </div>
        <div>
          <label className="label">Password *</label>
          <input name="password" type="password" required minLength={8} className="input" placeholder="Minimum 8 characters" />
        </div>
        <div>
          <label className="label">Role *</label>
          <select name="role" required className="input">
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create User'}</button>
          <Link href="/dashboard/admin/users" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
