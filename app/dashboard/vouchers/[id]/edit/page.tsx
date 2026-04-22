'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditVoucherPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [voucher, setVoucher] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/vouchers/${id}`).then(r => r.json()).then(setVoucher);
    fetch('/api/properties').then(r => r.json()).then(setProperties);
    fetch('/api/vehicles').then(r => r.json()).then(setVehicles);
  }, [id]);

  if (!voucher) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);

    const body: Record<string, any> = {
      status: fd.get('status'),
      clientName: fd.get('clientName'),
      remarks: fd.get('remarks') || null,
    };

    if (voucher.type === 'HOTEL') {
      Object.assign(body, {
        propertyId: fd.get('propertyId') || null,
        roomType: fd.get('roomType'),
        checkIn: fd.get('checkIn'),
        checkOut: fd.get('checkOut'),
        numNights: Number(fd.get('numNights')),
        numAdults: Number(fd.get('numAdults')),
        numChildren: Number(fd.get('numChildren') || 0),
        numTwins: Number(fd.get('numTwins') || 0),
        numDoubles: Number(fd.get('numDoubles') || 0),
        numSingles: Number(fd.get('numSingles') || 0),
        numTriples: Number(fd.get('numTriples') || 0),
      });
    } else {
      Object.assign(body, {
        vehicleId: fd.get('vehicleId') || null,
        vehicleType: fd.get('vehicleType'),
        pickupDate: fd.get('pickupDate'),
        dropoffDate: fd.get('dropoffDate'),
        pickupLocation: fd.get('pickupLocation'),
        route: fd.get('route') || null,
        rateKES: fd.get('rateKES') ? Number(fd.get('rateKES')) : null,
        numAdults: Number(fd.get('numAdults')),
      });
    }

    const res = await fetch(`/api/vouchers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push(`/dashboard/vouchers/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
      setSaving(false);
    }
  }

  const fmt = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : '';

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/vouchers/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Voucher</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Voucher {voucher.voucherNo}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={voucher.status}>
              <option value="ACTIVE">Active</option>
              <option value="USED">Used</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Client Name *</label>
            <input name="clientName" required className="input" defaultValue={voucher.clientName || ''} />
          </div>

          {voucher.type === 'HOTEL' ? (
            <>
              <div>
                <label className="label">Hotel / Camp</label>
                <select name="propertyId" className="input" defaultValue={voucher.propertyId || ''}>
                  <option value="">— Select —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Room Type</label>
                <input name="roomType" className="input" defaultValue={voucher.roomType || ''} />
              </div>
              <div>
                <label className="label">Check-in</label>
                <input name="checkIn" type="date" className="input" defaultValue={fmt(voucher.checkIn)} />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input name="checkOut" type="date" className="input" defaultValue={fmt(voucher.checkOut)} />
              </div>
              <div>
                <label className="label">Nights</label>
                <input name="numNights" type="number" min={1} className="input" defaultValue={voucher.numNights || 1} />
              </div>
              <div>
                <label className="label">Adults</label>
                <input name="numAdults" type="number" min={1} className="input" defaultValue={voucher.numAdults || 1} />
              </div>
              <div>
                <label className="label">Children</label>
                <input name="numChildren" type="number" min={0} className="input" defaultValue={voucher.numChildren || 0} />
              </div>
              <div />
              <div className="col-span-2">
                <label className="label">Room Configuration</label>
                <div className="grid grid-cols-4 gap-3">
                  {['Twins', 'Doubles', 'Singles', 'Triples'].map(type => (
                    <div key={type}>
                      <p className="text-xs text-gray-500 mb-1">{type}</p>
                      <input name={`num${type}`} type="number" min={0} className="input text-center"
                        defaultValue={(voucher as any)[`num${type}`] || 0} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Vehicle</label>
                <select name="vehicleId" className="input" defaultValue={voucher.vehicleId || ''}>
                  <option value="">— Select —</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vehicle Type</label>
                <input name="vehicleType" className="input" defaultValue={voucher.vehicleType || ''} />
              </div>
              <div>
                <label className="label">Pickup Date</label>
                <input name="pickupDate" type="date" className="input" defaultValue={fmt(voucher.pickupDate)} />
              </div>
              <div>
                <label className="label">Drop-off Date</label>
                <input name="dropoffDate" type="date" className="input" defaultValue={fmt(voucher.dropoffDate)} />
              </div>
              <div>
                <label className="label">Pickup Location</label>
                <input name="pickupLocation" className="input" defaultValue={voucher.pickupLocation || ''} />
              </div>
              <div>
                <label className="label">Passengers</label>
                <input name="numAdults" type="number" min={1} className="input" defaultValue={voucher.numAdults || 1} />
              </div>
              <div>
                <label className="label">Route</label>
                <input name="route" className="input" defaultValue={voucher.route || ''} />
              </div>
              <div>
                <label className="label">Rate (KES)</label>
                <input name="rateKES" type="number" className="input" defaultValue={voucher.rateKES || ''} />
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="label">Remarks</label>
            <textarea name="remarks" rows={3} className="input resize-none" defaultValue={voucher.remarks || ''} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href={`/dashboard/vouchers/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
