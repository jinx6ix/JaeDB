'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Property { id: string; name: string; location?: string; }
interface Vehicle  { id: string; name: string; type: string; seats: number; ratePerDay?: number; }
interface Booking  { id: string; bookingRef: string; client: { name: string }; startDate: string; endDate: string; }
type VType = 'HOTEL' | 'VEHICLE' | 'FLIGHT';

export default function NewVoucherPage() {
  const router = useRouter();
  const sp     = useSearchParams();
  const initType = (sp.get('type') || 'HOTEL') as VType;
  const preBookingId = sp.get('bookingId') || '';

  const [voucherType, setVoucherType] = useState<VType>(initType);
  const [properties,  setProperties]  = useState<Property[]>([]);
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [selBooking,  setSelBooking]  = useState<Booking | null>(null);
  const [hotelName,   setHotelName]   = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateKES,     setRateKES]     = useState('');
  const [nights,      setNights]      = useState(1);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(setProperties);
    fetch('/api/vehicles').then(r => r.json()).then(setVehicles);
    fetch('/api/bookings?all=1').then(r => r.json()).then((data: Booking[]) => {
      setBookings(data);
      if (preBookingId) setSelBooking(data.find(b => b.id === preBookingId) || null);
    });
  }, [preBookingId]);

  function handleCheckInOut(e: React.ChangeEvent<HTMLInputElement>, field: 'in' | 'out') {
    const form = e.currentTarget.form; if (!form) return;
    const i = field === 'in'  ? e.currentTarget.value : (form.querySelector('[name=checkIn]')  as HTMLInputElement)?.value;
    const o = field === 'out' ? e.currentTarget.value : (form.querySelector('[name=checkOut]') as HTMLInputElement)?.value;
    if (i && o) { const d = Math.ceil((new Date(o).getTime() - new Date(i).getTime()) / 86400000); if (d > 0) setNights(d); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError('');
    const fd = new FormData(e.currentTarget);

    const body: Record<string, any> = {
      type:      voucherType,
      bookingId: fd.get('bookingId') || null,
      clientName: fd.get('clientName'),
      status: 'ACTIVE',
    };

    if (voucherType === 'HOTEL') {
      Object.assign(body, {
        hotelName:   hotelName || fd.get('hotelName'),
        propertyId:  fd.get('propertyId') || null,
        roomType:    fd.get('roomType'),
        numAdults:   Number(fd.get('numAdults')),
        numChildren: Number(fd.get('numChildren') || 0),
        numTwins:    Number(fd.get('numTwins')    || 0),
        numDoubles:  Number(fd.get('numDoubles')  || 0),
        numSingles:  Number(fd.get('numSingles')  || 0),
        numTriples:  Number(fd.get('numTriples')  || 0),
        checkIn:     fd.get('checkIn'),
        checkOut:    fd.get('checkOut'),
        numNights:   Number(fd.get('numNights')),
        remarks:     fd.get('remarks') || null,
      });
    } else if (voucherType === 'VEHICLE') {
      Object.assign(body, {
        vehicleId:     fd.get('vehicleId')     || null,
        vehicleName:   vehicleName,
        vehicleType:   vehicleType,
        numAdults:     Number(fd.get('numAdults')),
        pickupDate:    fd.get('pickupDate'),
        dropoffDate:   fd.get('dropoffDate'),
        pickupLocation:fd.get('pickupLocation'),
        route:         fd.get('route')  || null,
        rateKES:       rateKES ? Number(rateKES) : null,
        remarks:       fd.get('remarks') || null,
      });
    } else {
      Object.assign(body, {
        flightName:     fd.get('flightName'),
        flightSchedule: fd.get('flightSchedule'),
        numAdults:      Number(fd.get('numAdults')),
        numChildren:    Number(fd.get('numChildren') || 0),
        departureDate:  fd.get('departureDate') || null,
        returnDate:     fd.get('returnDate')    || null,
        numDays:        Number(fd.get('numDays') || 0),
        remarks:        fd.get('remarks')       || null,
      });
    }

    const res = await fetch('/api/vouchers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push(`/dashboard/vouchers/${(await res.json()).id}`);
    } else {
      setError((await res.json()).error || 'Failed');
      setSaving(false);
    }
  }

  const tabs: { label: string; type: VType; icon: string; color: string }[] = [
    { label: 'Hotel / Camp', type: 'HOTEL',   icon: '🏨', color: 'bg-orange-500' },
    { label: 'Vehicle',      type: 'VEHICLE', icon: '🚙', color: 'bg-green-600'  },
    { label: 'Flight',       type: 'FLIGHT',  icon: '✈️',  color: 'bg-sky-600'    },
  ];

  const toISO = (d: string) => { try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; } };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/vouchers" className="text-gray-400 hover:text-gray-600 text-sm">← Vouchers</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Voucher</h1>
      </div>

      {/* Type tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {tabs.map((t, i) => (
          <button key={t.type} type="button" onClick={() => setVoucherType(t.type)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              voucherType === t.type ? `${t.color} text-white` : 'bg-white text-gray-600 hover:bg-gray-50'
            } ${i > 0 ? 'border-l border-gray-200' : ''}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {/* Booking link */}
        <div>
          <label className="label">Link to Booking (optional)</label>
          <select name="bookingId" className="input" defaultValue={preBookingId}
            onChange={e => setSelBooking(bookings.find(b => b.id === e.target.value) || null)}>
            <option value="">— Standalone Voucher —</option>
            {bookings.map(b => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>)}
          </select>
        </div>

        {/* Client name */}
        <div>
          <label className="label">Client Name *</label>
          <input name="clientName" required className="input"
            defaultValue={selBooking?.client.name || ''} placeholder="e.g. Amit Shirali" />
        </div>

        {/* ── HOTEL ─────────────────────────────────────────────────────── */}
        {voucherType === 'HOTEL' && (<>
          {/* Free-text hotel name with optional property link */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Hotel / Camp Name *</label>
              <input name="hotelName" required className="input font-medium"
                value={hotelName}
                onChange={e => setHotelName(e.target.value)}
                placeholder="e.g. Fig Tree, Ashnil Mara Camp, Serengeti Serena…" />
            </div>
            <div className="col-span-2">
              <label className="label text-xs text-gray-400">
                Or pick from saved properties (auto-fills name above)
              </label>
              <select name="propertyId" className="input text-sm text-gray-500"
                onChange={e => {
                  const p = properties.find(x => x.id === e.target.value);
                  if (p) setHotelName(p.name);
                }}>
                <option value="">— Select saved property (optional) —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}{p.location ? ` · ${p.location}` : ''}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Room Type *</label>
              <input name="roomType" required className="input" defaultValue="Standard Room FullBoard"
                placeholder="Standard Room FullBoard" />
            </div>
            <div>
              <label className="label">Check-in Date *</label>
              <input name="checkIn" type="date" required className="input"
                defaultValue={selBooking ? toISO(selBooking.startDate) : ''}
                onChange={e => handleCheckInOut(e, 'in')} />
            </div>
            <div>
              <label className="label">Check-out Date *</label>
              <input name="checkOut" type="date" required className="input"
                defaultValue={selBooking ? toISO(selBooking.endDate) : ''}
                onChange={e => handleCheckInOut(e, 'out')} />
            </div>
            <div>
              <label className="label">Number of Nights</label>
              <input name="numNights" type="number" min={1} className="input"
                value={nights} onChange={e => setNights(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">No. of Adults *</label>
              <input name="numAdults" type="number" min={1} required className="input" defaultValue={2} />
            </div>
            <div>
              <label className="label">No. of Children (under 12)</label>
              <input name="numChildren" type="number" min={0} className="input" defaultValue={0} />
            </div>
          </div>
          <div>
            <label className="label">Room Configuration</label>
            <div className="grid grid-cols-4 gap-3">
              {['Twins','Doubles','Singles','Triples'].map(t => (
                <div key={t}>
                  <p className="text-xs text-gray-500 mb-1">{t}</p>
                  <input name={`num${t}`} type="number" min={0}
                    defaultValue={t === 'Twins' ? 1 : 0} className="input text-center" />
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ── VEHICLE ───────────────────────────────────────────────────── */}
        {voucherType === 'VEHICLE' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Vehicle Name / Description *</label>
              <input required className="input font-medium"
                value={vehicleName}
                onChange={e => setVehicleName(e.target.value)}
                placeholder="e.g. 01 Open-sided Jeep, Land Cruiser KCY 234A…" />
            </div>
            <div className="col-span-2">
              <label className="label text-xs text-gray-400">
                Or pick from saved vehicles (auto-fills name and rate)
              </label>
              <select name="vehicleId" className="input text-sm text-gray-500"
                onChange={e => {
                  const v = vehicles.find(x => x.id === e.target.value);
                  if (v) {
                    setVehicleName(v.name);
                    setVehicleType(v.type.replace(/_/g, ' '));
                    setRateKES(v.ratePerDay ? String(v.ratePerDay) : '');
                  }
                }}>
                <option value="">— Select saved vehicle (optional) —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.seats} seats)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vehicle Type *</label>
              <input required className="input"
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value)}
                placeholder="Open-sided Jeep, Land Cruiser, Minivan…" />
            </div>
            <div>
              <label className="label">No. of Passengers</label>
              <input name="numAdults" type="number" min={1} className="input" defaultValue={2} />
            </div>
            <div>
              <label className="label">Pickup Date *</label>
              <input name="pickupDate" type="date" required className="input"
                defaultValue={selBooking ? toISO(selBooking.startDate) : ''} />
            </div>
            <div>
              <label className="label">Drop-off Date</label>
              <input name="dropoffDate" type="date" className="input"
                defaultValue={selBooking ? toISO(selBooking.endDate) : ''} />
            </div>
            <div>
              <label className="label">Pickup Location *</label>
              <input name="pickupLocation" required className="input" placeholder="Nairobi CBD / Hotel Name" />
            </div>
            <div>
              <label className="label">Rate (KES)</label>
              <input className="input font-mono"
                value={rateKES}
                onChange={e => setRateKES(e.target.value)}
                placeholder="26000" />
            </div>
            <div className="col-span-2">
              <label className="label">Route</label>
              <input name="route" className="input" placeholder="Nairobi → Masai Mara → Nairobi" />
            </div>
          </div>
        )}

        {/* ── FLIGHT ────────────────────────────────────────────────────── */}
        {voucherType === 'FLIGHT' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Airline / Flight Name *</label>
              <input name="flightName" required className="input font-medium"
                placeholder="e.g. Mombasa Air, Kenya Airways KQ 100, Safarilink" />
            </div>
            <div className="col-span-2">
              <label className="label">Schedule *</label>
              <input name="flightSchedule" required className="input"
                placeholder="Mara Serena Airstrip to Amboseli Airstrip" />
            </div>
            <div>
              <label className="label">No. of Adults *</label>
              <input name="numAdults" type="number" min={1} required className="input" defaultValue={2} />
            </div>
            <div>
              <label className="label">No. of Children (under 12)</label>
              <input name="numChildren" type="number" min={0} className="input" defaultValue={0} />
            </div>
            <div>
              <label className="label">Departure Date *</label>
              <input name="departureDate" type="date" required className="input"
                defaultValue={selBooking ? toISO(selBooking.startDate) : ''} />
            </div>
            <div>
              <label className="label">Return Date</label>
              <input name="returnDate" type="date" className="input"
                defaultValue={selBooking ? toISO(selBooking.endDate) : ''} />
            </div>
            <div>
              <label className="label">Number of Days</label>
              <input name="numDays" type="number" min={0} className="input" defaultValue={0} />
            </div>
          </div>
        )}

        {/* Remarks — all types */}
        <div>
          <label className="label">Remarks</label>
          <textarea name="remarks" rows={3} className="input resize-none"
            placeholder={
              voucherType === 'FLIGHT'  ? 'Pick up Mara Serena Airstrip 11:30\nDrop off Amboseli Airstrip 12:30'
            : voucherType === 'HOTEL'   ? 'e.g. PLEASE NOTE CLIENT DIETARY REQUEST VEGETERIAN'
            :                             'Any special instructions…'} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : `Create ${voucherType === 'HOTEL' ? 'Hotel' : voucherType === 'VEHICLE' ? 'Vehicle' : 'Flight'} Voucher`}
          </button>
          <Link href="/dashboard/vouchers" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
