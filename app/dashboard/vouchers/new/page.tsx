'/dashboard/vouchers/new'
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Property { id: string; name: string; location?: string; }
interface Vehicle  { id: string; name: string; type: string; seats: number; ratePerDay?: number; }
interface Booking  { id: string; bookingRef: string; client: { name: string; id: string }; startDate: string; endDate: string; }
interface Client   { id: string; name: string; phone?: string; agentId?: string; agent?: { name: string; company?: string }; }
interface Agent    { id: string; name: string; company?: string; }
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
  const [clients,     setClients]     = useState<Client[]>([]);
  const [agents,      setAgents]      = useState<Agent[]>([]);
  const [selBooking,  setSelBooking]  = useState<Booking | null>(null);
  const [selClientId, setSelClientId] = useState('');
  const [selAgentId,  setSelAgentId]  = useState('');
  const [hotelName,   setHotelName]   = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateKES,     setRateKES]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // --- Hotel specific controlled fields ---
  const [checkInDate,  setCheckInDate]  = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nights,       setNights]       = useState(1);

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(setProperties);
    fetch('/api/vehicles').then(r => r.json()).then(setVehicles);
    fetch('/api/agents').then(r => r.json()).then(d => setAgents(Array.isArray(d) ? d : []));
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/bookings?all=1').then(r => r.json()).then((data: Booking[]) => {
      setBookings(data);
      if (preBookingId) {
        const b = data.find((b: Booking) => b.id === preBookingId) || null;
        setSelBooking(b);
        if (b) {
          setSelClientId(b.client.id);
          // Pre-fill hotel dates from selected booking
          const start = b.startDate.split('T')[0];
          const end   = b.endDate.split('T')[0];
          setCheckInDate(start);
          setCheckOutDate(end);
          if (start && end) {
            const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
            if (diff > 0) setNights(diff);
          }
        }
      }
    });
  }, [preBookingId]);

  // --- Date / Nights helpers (Hotel only) ---
  const updateNightsFromDates = (inDate: string, outDate: string) => {
    if (inDate && outDate) {
      const diff = Math.ceil((new Date(outDate).getTime() - new Date(inDate).getTime()) / 86400000);
      if (diff > 0) setNights(diff);
      else if (diff === 0) setNights(1); // same day counts as 1 night (optional)
    }
  };

  const updateCheckOutFromNights = (inDate: string, nightsVal: number) => {
    if (inDate && nightsVal > 0) {
      const newOut = new Date(inDate);
      newOut.setDate(newOut.getDate() + nightsVal);
      setCheckOutDate(newOut.toISOString().split('T')[0]);
    }
  };

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIn = e.target.value;
    setCheckInDate(newIn);
    if (checkOutDate) {
      updateNightsFromDates(newIn, checkOutDate);
    } else if (nights > 0) {
      // If nights already has a value, adjust checkout accordingly
      updateCheckOutFromNights(newIn, nights);
    }
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOut = e.target.value;
    setCheckOutDate(newOut);
    if (checkInDate) {
      updateNightsFromDates(checkInDate, newOut);
    }
  };

  const handleNightsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNights = Number(e.target.value);
    setNights(newNights);
    if (checkInDate && newNights > 0) {
      updateCheckOutFromNights(checkInDate, newNights);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError('');
    const fd = new FormData(e.currentTarget);

    const body: Record<string, any> = {
      type:      voucherType,
      bookingId: fd.get('bookingId') || null,
      clientId:  selClientId || null,
      agentId:   selAgentId || null,
      clientName: clients.find(c => c.id === selClientId)?.name || fd.get('clientName') || '',
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
        checkIn:     checkInDate,
        checkOut:    checkOutDate,
        numNights:   nights,
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
            onChange={e => {
              const b = bookings.find(bk => bk.id === e.target.value) || null;
              setSelBooking(b);
              if (b) {
                setSelClientId(b.client.id);
                const start = b.startDate.split('T')[0];
                const end   = b.endDate.split('T')[0];
                setCheckInDate(start);
                setCheckOutDate(end);
                if (start && end) {
                  const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
                  if (diff > 0) setNights(diff);
                }
              }
            }}>
            <option value="">— Standalone Voucher —</option>
            {bookings.map(b => <option key={b.id} value={b.id}>{b.bookingRef} · {b.client.name}</option>)}
          </select>
        </div>

        {/* Client picker */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client *</label>
            <select
              className="input"
              value={selClientId}
              onChange={e => {
                setSelClientId(e.target.value);
                const c = clients.find(c => c.id === e.target.value);
                if (c?.agentId) setSelAgentId(c.agentId);
              }}
              required
            >
              <option value="">— Select client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.agent ? ` (via ${c.agent.company || c.agent.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Agent (auto-filled from client)</label>
            <select className="input" value={selAgentId} onChange={e => setSelAgentId(e.target.value)}>
              <option value="">— No agent —</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}{a.company ? ` — ${a.company}` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── HOTEL (with two‑way date ↔ nights calculation) ── */}
        {voucherType === 'HOTEL' && (<>
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
            {/* Controlled date fields with two-way logic */}
            <div>
              <label className="label">Check-in Date *</label>
              <input
                name="checkIn"
                type="date"
                required
                className="input"
                value={checkInDate}
                onChange={handleCheckInChange}
              />
            </div>
            <div>
              <label className="label">Check-out Date *</label>
              <input
                name="checkOut"
                type="date"
                required
                className="input"
                value={checkOutDate}
                onChange={handleCheckOutChange}
              />
            </div>
            <div>
              <label className="label">Number of Nights</label>
              <input
                name="numNights"
                type="number"
                min={1}
                className="input"
                value={nights}
                onChange={handleNightsChange}
              />
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

        {/* ── VEHICLE (unchanged) ───────────────────────────────────── */}
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
                defaultValue={selBooking ? selBooking.startDate.split('T')[0] : ''} />
            </div>
            <div>
              <label className="label">Drop-off Date</label>
              <input name="dropoffDate" type="date" className="input"
                defaultValue={selBooking ? selBooking.endDate.split('T')[0] : ''} />
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

        {/* ── FLIGHT (unchanged) ────────────────────────────────────── */}
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
                defaultValue={selBooking ? selBooking.startDate.split('T')[0] : ''} />
            </div>
            <div>
              <label className="label">Return Date</label>
              <input name="returnDate" type="date" className="input"
                defaultValue={selBooking ? selBooking.endDate.split('T')[0] : ''} />
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