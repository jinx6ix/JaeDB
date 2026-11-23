'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditVoucherPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [voucher, setVoucher] = useState<any>(null);
  const [hotels, setHotels] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selHotelId, setSelHotelId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState<any>({});

  useEffect(() => {
    fetch(`/api/vouchers/${id}`).then(r => r.json()).then(v => {
      setVoucher(v);
      setF({
        status: v.status || 'ACTIVE',
        bookingStatus: v.bookingStatus || 'book',
        clientName: v.clientName || '',
        clientId: v.clientId || '',
        bookingId: v.bookingId || '',
        remarks: v.remarks || '',
        hotelName: v.hotelName || v.property?.name || '',
        propertyId: v.propertyId || '',
        roomType: v.roomType || '',
        checkIn: v.checkIn ? new Date(v.checkIn).toISOString().split('T')[0] : '',
        checkOut: v.checkOut ? new Date(v.checkOut).toISOString().split('T')[0] : '',
        numNights: v.numNights || 1,
        numAdults: v.numAdults || 1,
        numChildren: v.numChildren || 0,
        numTwins: v.numTwins || 0,
        numDoubles: v.numDoubles || 0,
        numSingles: v.numSingles || 0,
        numTriples: v.numTriples || 0,
        vehicleId: v.vehicleId || '',
        vehicleName: v.vehicleName || '',
        vehicleType: v.vehicleType || '',
        pickupDate: v.pickupDate ? new Date(v.pickupDate).toISOString().split('T')[0] : '',
        dropoffDate: v.dropoffDate ? new Date(v.dropoffDate).toISOString().split('T')[0] : '',
        pickupLocation: v.pickupLocation || '',
        route: v.route || '',
        rateKES: v.rateKES || '',
        flightName: v.flightName || '',
        flightSchedule: v.flightSchedule || '',
        departureDate: v.departureDate ? new Date(v.departureDate).toISOString().split('T')[0] : '',
        returnDate: v.returnDate ? new Date(v.returnDate).toISOString().split('T')[0] : '',
        numDays: v.numDays || 1,
      });
      if (v.propertyId) setSelHotelId(String(v.propertyId));
    });
    fetch('/api/safari-rates/hotels').then(r => r.json()).then(d => setHotels(Array.isArray(d) ? d : []));
    fetch('/api/vehicles').then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/bookings?all=1').then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []));
  }, [id]);

  // Automatically calculate nights when check-in or check-out changes (for hotels)
  useEffect(() => {
    if (voucher?.type === 'HOTEL' && f.checkIn && f.checkOut) {
      const start = new Date(f.checkIn);
      const end = new Date(f.checkOut);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays !== f.numNights) {
          setF((prev: any) => ({ ...prev, numNights: diffDays }));
        }
      }
    }
  }, [f.checkIn, f.checkOut, voucher?.type]);

  // Automatically adjust check-out when number of nights changes (for hotels)
  useEffect(() => {
    if (voucher?.type === 'HOTEL' && f.checkIn && f.numNights > 0) {
      const start = new Date(f.checkIn);
      if (!isNaN(start.getTime())) {
        const newCheckOut = new Date(start);
        newCheckOut.setDate(start.getDate() + f.numNights);
        const newCheckOutStr = newCheckOut.toISOString().split('T')[0];
        if (newCheckOutStr !== f.checkOut) {
          setF((prev: any) => ({ ...prev, checkOut: newCheckOutStr }));
        }
      }
    }
  }, [f.numNights, f.checkIn, voucher?.type]);

  useEffect(() => {
    if (selHotelId) {
      fetch(`/api/safari-rates/room-types?hotelId=${selHotelId}`)
        .then(r => r.json()).then(d => setRoomTypes(Array.isArray(d) ? d : []));
    }
  }, [selHotelId]);

  if (!voucher) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  function set(k: string, v: any) { setF((p: any) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await fetch(`/api/vouchers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, type: voucher.type }),
    });
    if (res.ok) { router.push(`/dashboard/vouchers/${id}`); }
    else { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this voucher? This cannot be undone.')) return;
    setDeleting(true);
    const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
    if (res.ok) { router.push('/dashboard/vouchers'); }
    else { const d = await res.json(); setError(d.error || 'Failed to delete'); setDeleting(false); }
  }

  const typeColor = voucher.type === 'HOTEL' ? 'bg-blue-100 text-blue-700'
    : voucher.type === 'VEHICLE' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/vouchers/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Voucher</Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit {voucher.voucherNo}</h1>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeColor}`}>{voucher.type}</span>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleting}
          className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
          {deleting ? 'Deleting…' : '🗑 Delete'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={f.status} onChange={e => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="USED">Used</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label">Booking Status</label>
              <select className="input" value={f.bookingStatus} onChange={e => set('bookingStatus', e.target.value)}>
                <option value="book">Book</option>
                <option value="amend">Amend</option>
                <option value="cancel">Cancel</option>
              </select>
            </div>
            <div>
              <label className="label">Link to Client</label>
              <select className="input" value={f.clientId} onChange={e => {
                set('clientId', e.target.value);
                const c = clients.find((c: any) => c.id === e.target.value);
                if (c) set('clientName', c.name);
              }}>
                <option value="">— No client —</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Link to Booking</label>
              <select className="input" value={f.bookingId} onChange={e => set('bookingId', e.target.value)}>
                <option value="">— Standalone —</option>
                {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Client Name (on voucher)</label>
              <input className="input" value={f.clientName} onChange={e => set('clientName', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input resize-none h-16" value={f.remarks} onChange={e => set('remarks', e.target.value)} />
            </div>
          </div>
        </div>

        {voucher.type === 'HOTEL' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">🏨 Hotel / Accommodation</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Select Hotel from Database</label>
                <select className="input" value={selHotelId} onChange={e => {
                  setSelHotelId(e.target.value);
                  const h = hotels.find((h: any) => String(h.id) === e.target.value);
                  if (h) set('hotelName', h.name);
                }}>
                  <option value="">— Search hotel —</option>
                  {hotels.map((h: any) => (
                    <option key={h.id} value={h.id}>{h.name} · {h.county?.name}{h.stars ? ` · ${'★'.repeat(h.stars)}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Hotel Name (on voucher)</label>
                <input className="input" value={f.hotelName} onChange={e => set('hotelName', e.target.value)} placeholder="Or type custom hotel name" />
              </div>
              <div className="col-span-2">
                <label className="label">Room Type</label>
                {roomTypes.length > 0 ? (
                  <select className="input" value={f.roomType} onChange={e => set('roomType', e.target.value)}>
                    <option value="">— Select room type —</option>
                    {roomTypes.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                ) : (
                  <input className="input" value={f.roomType} onChange={e => set('roomType', e.target.value)} placeholder="e.g. Standard Double" />
                )}
              </div>
              <div><label className="label">Check In</label><input type="date" className="input" value={f.checkIn} onChange={e => set('checkIn', e.target.value)} /></div>
              <div><label className="label">Check Out</label><input type="date" className="input" value={f.checkOut} onChange={e => set('checkOut', e.target.value)} /></div>
              <div><label className="label">Nights</label><input type="number" min={1} className="input" value={f.numNights} onChange={e => set('numNights', Number(e.target.value))} /></div>
              <div><label className="label">Adults</label><input type="number" min={1} className="input" value={f.numAdults} onChange={e => set('numAdults', Number(e.target.value))} /></div>
              <div><label className="label">Children</label><input type="number" min={0} className="input" value={f.numChildren} onChange={e => set('numChildren', Number(e.target.value))} /></div>
              <div><label className="label">Twins</label><input type="number" min={0} className="input" value={f.numTwins} onChange={e => set('numTwins', Number(e.target.value))} /></div>
              <div><label className="label">Doubles</label><input type="number" min={0} className="input" value={f.numDoubles} onChange={e => set('numDoubles', Number(e.target.value))} /></div>
              <div><label className="label">Singles</label><input type="number" min={0} className="input" value={f.numSingles} onChange={e => set('numSingles', Number(e.target.value))} /></div>
            </div>
          </div>
        )}

        {voucher.type === 'VEHICLE' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">🚐 Vehicle / Transfer</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Select Vehicle</label>
                <select className="input" value={f.vehicleId} onChange={e => {
                  set('vehicleId', e.target.value);
                  const v = vehicles.find((v: any) => v.id === e.target.value);
                  if (v) { set('vehicleName', v.name); set('vehicleType', v.type); }
                }}>
                  <option value="">— Custom —</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name} · {v.seats} seats</option>)}
                </select>
              </div>
              <div><label className="label">Vehicle Name</label><input className="input" value={f.vehicleName} onChange={e => set('vehicleName', e.target.value)} /></div>
              <div><label className="label">Vehicle Type</label><input className="input" value={f.vehicleType} onChange={e => set('vehicleType', e.target.value)} /></div>
              <div><label className="label">Pickup Date</label><input type="date" className="input" value={f.pickupDate} onChange={e => set('pickupDate', e.target.value)} /></div>
              <div><label className="label">Dropoff Date</label><input type="date" className="input" value={f.dropoffDate} onChange={e => set('dropoffDate', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Pickup Location</label><input className="input" value={f.pickupLocation} onChange={e => set('pickupLocation', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Route</label><input className="input" value={f.route} onChange={e => set('route', e.target.value)} /></div>
              <div><label className="label">Rate (KES)</label><input type="number" min={0} className="input" value={f.rateKES} onChange={e => set('rateKES', e.target.value)} /></div>
              <div><label className="label">Adults</label><input type="number" min={1} className="input" value={f.numAdults} onChange={e => set('numAdults', Number(e.target.value))} /></div>
            </div>
          </div>
        )}

        {voucher.type === 'FLIGHT' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">✈️ Flight</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Airline / Flight Name</label><input className="input" value={f.flightName} onChange={e => set('flightName', e.target.value)} placeholder="e.g. Kenya Airways KQ101" /></div>
              <div className="col-span-2"><label className="label">Schedule / Route</label><input className="input" value={f.flightSchedule} onChange={e => set('flightSchedule', e.target.value)} placeholder="e.g. NBO → MRE 07:00 – 08:00" /></div>
              <div><label className="label">Departure Date</label><input type="date" className="input" value={f.departureDate} onChange={e => set('departureDate', e.target.value)} /></div>
              <div><label className="label">Return Date</label><input type="date" className="input" value={f.returnDate} onChange={e => set('returnDate', e.target.value)} /></div>
              <div><label className="label">Adults</label><input type="number" min={1} className="input" value={f.numAdults} onChange={e => set('numAdults', Number(e.target.value))} /></div>
              <div><label className="label">Children</label><input type="number" min={0} className="input" value={f.numChildren} onChange={e => set('numChildren', Number(e.target.value))} /></div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href={`/dashboard/vouchers/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}