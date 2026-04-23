'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => {
        setName(data.name || '');
        setEmail(data.email || '');
        setRole(data.role || 'EMPLOYEE');
        setIsActive(data.isActive ?? true);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load user');
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const body: any = { name, email, role, isActive };
    if (password.trim()) body.password = password;

    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess('User updated successfully!');
      setPassword('');
      setSaving(false);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to update user');
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/users" className="text-gray-400 hover:text-gray-600 text-sm">← Users</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm">{success}</div>}

        <div>
          <label className="label">Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Antony Waititu" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="input" placeholder="antony@jaetravel.co.ke" />
        </div>
        <div>
          <label className="label">Role *</label>
          <select value={role} onChange={e => setRole(e.target.value)} required className="input">
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')} className="input">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="label">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={8} className="input" placeholder="Minimum 8 characters" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href="/dashboard/admin/users" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
