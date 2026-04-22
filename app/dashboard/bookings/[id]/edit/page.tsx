'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const STATUSES = ['ENQUIRY', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function EditBookingPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [booking, setBooking] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/bookings/${id}`).then(r => r.json()).then(setBooking);
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, [id]);

  if (!booking) return (
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
      status: fd.get('status'),
      totalAmount: fd.get('totalAmount') ? Number(fd.get('totalAmount')) : null,
      paidAmount: Number(fd.get('paidAmount') || 0),
      assignedToId: fd.get('assignedToId') || null,
      notes: fd.get('notes') || null,
      specialRequirements: fd.get('specialRequirements') || null,
    };
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push(`/dashboard/bookings/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to update');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/bookings/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Booking</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Booking {booking.bookingRef}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={booking.status}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned To</label>
            <select name="assignedToId" className="input" defaultValue={booking.assignedToId || ''}>
              <option value="">— Unassigned —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Total Amount ({booking.currency})</label>
            <input name="totalAmount" type="number" min={0} step="0.01" className="input"
              defaultValue={booking.totalAmount || ''} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Amount Paid ({booking.currency})</label>
            <input name="paidAmount" type="number" min={0} step="0.01" className="input"
              defaultValue={booking.paidAmount || 0} />
          </div>
          <div className="col-span-2">
            <label className="label">Special Requirements</label>
            <textarea name="specialRequirements" rows={2} className="input resize-none"
              defaultValue={booking.specialRequirements || ''} />
          </div>
          <div className="col-span-2">
            <label className="label">Internal Notes</label>
            <textarea name="notes" rows={3} className="input resize-none"
              defaultValue={booking.notes || ''} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/dashboard/bookings/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
