'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/SearchInput';

interface UserRow {
  id: string; name: string; email: string; role: string;
  isActive: boolean; createdAt: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status !== 'authenticated') return;
    if ((session?.user as any)?.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, session, router]);

  if (status === 'loading' || (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN')) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const filtered = !needle ? users : users.filter(u =>
    u.name.toLowerCase().includes(needle) ||
    u.email.toLowerCase().includes(needle) ||
    (u.role || '').toLowerCase().includes(needle)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Admin only — manage team access</p>
        </div>
        <Link href="/dashboard/admin/users/new" className="btn-primary">+ New User</Link>
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search by name, email, role…"
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">{q ? `No users match "${q}".` : 'No users yet.'}</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'badge-confirmed' : 'badge-cancelled'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('en-KE')}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/admin/users/${u.id}/edit`} className="text-orange-500 hover:underline text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
