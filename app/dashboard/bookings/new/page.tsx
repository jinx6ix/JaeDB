'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Client { id: string; name: string; isResident: boolean; }
interface Tour { id: string; title: string; durationDays: number; durationNights: number; }
interface User { id: string; name: string; }
interface RateCard {
  id: string; season: string; currency: string;
  basedOn2: number; basedOn4: number; basedOn6: number; basedOn8: number;
  basedOn10?: number; basedOn12?: number; markupPercent: number;
}

export default function NewBookingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preClientId = sp.get('clientId') || '';

  const [clients, setClients] = useState<Client[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);

  const [clientId, setClientId] = useState(preClientId);
  const [tourId, setTourId] = useState('');
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [selectedRate, setSelectedRate] = useState<RateCard | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/clients?all=1').then(r => r.json()).then(setClients);
    fetch('/api/tours').then(r => r.json()).then(setTours);
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  useEffect(() => {
    if (!tourId) { setRateCards([]); return; }
    fetch(`/api/rates?tourId=${tourId}`).then(r => r.json()).then(setRateCards);
  }, [tourId]);

  useEffect(() => {
    if (!selectedRate) { setEstimatedTotal(null); return; }
    const totalPax = numAdults + numChildren;
    let rate: number;
    if (totalPax <= 2) rate = selectedRate.basedOn2;
    else if (totalPax <= 4) rate = selectedRate.basedOn4;
    else if (totalPax <= 6) rate = selectedRate.basedOn6;
    else if (totalPax <= 8) rate = selectedRate.basedOn8;
    else rate = selectedRate.basedOn10 || selectedRate.basedOn8;
    setEstimatedTotal(rate * numAdults);
  }, [selectedRate, numAdults, numChildren]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      clientId: fd.get('clientId'),
      tourPackageId: fd.get('tourPackageId') || null,
      assignedToId: fd.get('assignedToId') || null,
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate'),
      numAdults: Number(fd.get('numAdults')),
      numChildren: Number(fd.get('numChildren')),
      isResident: fd.get('isResident') === 'true',
      totalAmount: estimatedTotal,
      currency: selectedRate?.currency || 'USD',
      notes: fd.get('notes') || null,
      specialRequirements: fd.get('specialRequirements') || null,
    };
    const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      router.push(`/dashboard/bookings/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to create booking');
      setSaving(false);
    }
  }

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Bookings</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {/* Client & Tour */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Booking Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <select name="clientId" required className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!clientId && <Link href="/dashboard/clients/new" className="text-orange-500 text-xs mt-1 inline-block hover:underline">+ Create new client</Link>}
            </div>
            <div>
              <label className="label">Tour Package</label>
              <select name="tourPackageId" className="input" value={tourId} onChange={e => setTourId(e.target.value)}>
                <option value="">— Custom Tour —</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input name="startDate" type="date" required className="input" />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input name="endDate" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Adults *</label>
              <input name="numAdults" type="number" min={1} required className="input" value={numAdults} onChange={e => setNumAdults(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Children (under 12)</label>
              <input name="numChildren" type="number" min={0} className="input" value={numChildren} onChange={e => setNumChildren(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Resident Status</label>
              <select name="isResident" className="input" defaultValue={selectedClient?.isResident ? 'true' : 'false'}>
                <option value="false">Non-Resident</option>
                <option value="true">Resident</option>
              </select>
            </div>
            <div>
              <label className="label">Assigned To</label>
              <select name="assignedToId" className="input">
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Rate Calculator */}
        {rateCards.length > 0 && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">Rate Card</h2>
            <p className="text-sm text-gray-500">Select a rate to auto-calculate total. Based on {numAdults + numChildren} pax.</p>
            <div className="space-y-2">
              {rateCards.map(rc => {
                const totalPax = numAdults + numChildren;
                let rate = totalPax <= 2 ? rc.basedOn2 : totalPax <= 4 ? rc.basedOn4 : totalPax <= 6 ? rc.basedOn6 : totalPax <= 8 ? rc.basedOn8 : rc.basedOn10 || rc.basedOn8;
                return (
                  <label key={rc.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedRate?.id === rc.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="rateCardId" value={rc.id} checked={selectedRate?.id === rc.id} onChange={() => setSelectedRate(rc)} />
                      <div>
                        <p className="text-sm font-medium">{rc.season} Season</p>
                        <p className="text-xs text-gray-500">{rc.currency} {rate}/person · {rc.markupPercent}% markup</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{rc.currency} {(rate * numAdults).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">total est.</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {estimatedTotal !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-medium text-green-800">
                Estimated Total: {selectedRate?.currency} {estimatedTotal.toLocaleString()} for {numAdults} adult{numAdults !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Additional Information</h2>
          <div>
            <label className="label">Special Requirements</label>
            <textarea name="specialRequirements" rows={2} className="input resize-none" placeholder="e.g. Wheelchair access required, dietary restrictions…" />
          </div>
          <div>
            <label className="label">Internal Notes</label>
            <textarea name="notes" rows={2} className="input resize-none" placeholder="Notes for staff…" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Booking'}
          </button>
          <Link href="/dashboard/bookings" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
