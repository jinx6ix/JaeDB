// app/dashboard/vouchers/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import VoucherPDFButton from '@/components/vouchers/VoucherPDFButton';
import SendEmailButton from '@/components/vouchers/SendEmailButton';

export default async function VoucherDetailPage({ params }: { params: { id: string } }) {
  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    include: {
      booking: { include: { client: true } },
      property: true,
      vehicle: true,
      createdBy: true,
    },
  });

  if (!voucher) notFound();

  const voucherData = {
    ...voucher,
    checkIn: voucher.checkIn?.toISOString() || null,
    checkOut: voucher.checkOut?.toISOString() || null,
    pickupDate: voucher.pickupDate?.toISOString() || null,
    dropoffDate: voucher.dropoffDate?.toISOString() || null,
    issuedDate: voucher.issuedDate.toISOString(),
    booking: voucher.booking ? {
      ...voucher.booking,
      startDate: voucher.booking.startDate.toISOString(),
      endDate: voucher.booking.endDate.toISOString(),
      createdAt: voucher.booking.createdAt.toISOString(),
      updatedAt: voucher.booking.updatedAt.toISOString(),
    } : null,
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/vouchers" className="text-gray-400 hover:text-gray-600 text-sm">← Vouchers</Link>
          <h1 className="text-2xl font-bold text-gray-900">Voucher {voucher.voucherNo}</h1>
          <span className={voucher.status === 'ACTIVE' ? 'badge-confirmed' : 'badge-cancelled'}>{voucher.status}</span>
        </div>
        <div className="flex gap-2">
          <VoucherPDFButton voucher={voucherData as any} />
          <SendEmailButton voucherId={voucher.id} clientName={voucher.clientName} />
          <Link href={`/dashboard/vouchers/${voucher.id}/edit`} className="btn-secondary">Edit</Link>
        </div>
      </div>

      {/* Voucher Preview — matches PDF layout */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 print-voucher" id="voucher-preview">
        {/* Header with logos */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <div className="text-white text-center">
                <p className="text-xs font-bold leading-none">Jae</p>
                <p className="text-xs leading-none">Travel</p>
              </div>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">Jae Travel Expeditions</p>
              <p className="text-orange-500 text-sm">Where the world meets life</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">Voucher No: {voucher.voucherNo}</p>
            <p className="text-gray-500 text-sm mt-1">Date: {new Date(voucher.issuedDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {voucher.type === 'HOTEL' ? (
          <HotelVoucherBody voucher={voucher as any} />
        ) : voucher.type === 'FLIGHT' ? (
          <FlightVoucherBody voucher={voucher as any} />
        ) : (
          <VehicleVoucherBody voucher={voucher as any} />
        )}

        {/* Footer / Signature */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-4">Signed</p>
              <p className="text-sm font-semibold text-orange-600">For: Jae Travel Expeditions</p>
              <p className="text-sm font-semibold text-orange-600">Name: {voucher.createdBy.name}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Jae Travel Expeditions</p>
              <p>Mobile: 0726485228</p>
              <p>Email: info@jaetravel.co.ke</p>
              <p>www.jaetravel.co.ke</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlightVoucherBody({ voucher }: { voucher: any }) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      <div className="text-center border-b border-gray-100 pb-4">
        <p className="text-xs font-bold tracking-[6px] underline text-gray-800">F L I G H T &nbsp; V O U C H E R</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Flight Name</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.flightName || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Schedule</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.flightSchedule || '—'}</p>
        </div>
      </div>
      <div className="bg-orange-500 text-white px-4 py-3 rounded-lg">
        <span className="font-bold text-sm">CLIENTS: </span>
        <span className="text-sm">{voucher.clientName}</span>
      </div>
      <div className="flex justify-between">
        <p className="font-bold text-sm text-gray-700">No. of Adults: <span className="text-orange-600">{voucher.numAdults}</span></p>
        <p className="font-bold text-sm text-gray-700">No. of children under 12 years <span className="text-orange-600">{voucher.numChildren ?? 0}</span></p>
      </div>
      <p className="font-bold text-green-700 text-base">Please Book</p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-bold text-sm text-gray-700">Departure:</p>
          <p className="text-orange-600 font-semibold">{fmt(voucher.departureDate)}</p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Return:</p>
          <p className="text-orange-600 font-semibold">{fmt(voucher.returnDate)}</p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Number of Days: <span className="text-orange-600">{voucher.numDays ?? 0}</span></p>
        </div>
      </div>
      {voucher.remarks && (
        <div>
          <p className="font-bold text-sm text-gray-700">Remarks:</p>
          <p className="text-orange-600 font-semibold mt-1 whitespace-pre-line">{voucher.remarks}</p>
        </div>
      )}
    </div>
  );
}

function HotelVoucherBody({ voucher }: { voucher: any }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Hotel Name</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.property?.name || voucher.hotelName || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Room Type</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.roomType || '—'}</p>
        </div>
      </div>

      <div className="bg-orange-500 text-white px-4 py-3 rounded-lg">
        <span className="font-bold text-sm">CLIENTS: </span>
        <span className="text-sm">{voucher.clientName}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="font-bold text-sm text-gray-700">No. of Adults: <span className="text-orange-600">{voucher.numAdults}</span></p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm text-gray-700">No. of children under 12 years: <span className="text-orange-600">{voucher.numChildren ?? 0}</span></p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <p className="font-bold text-orange-600 mb-3">Please Book</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {[
            ['TWINS', voucher.numTwins],
            ['DOUBLES', voucher.numDoubles],
            ['SINGLES', voucher.numSingles],
            ['TRIPLES', voucher.numTriples],
          ].map(([label, val]) => (
            <p key={label as string} className="text-sm font-bold text-gray-700">
              {label as string}: <span className="text-orange-600">{val || ''}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-bold text-sm text-gray-700">Check in:</p>
          <p className="text-orange-600 font-semibold">
            {voucher.checkIn ? new Date(voucher.checkIn).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Check out:</p>
          <p className="text-orange-600 font-semibold">
            {voucher.checkOut ? new Date(voucher.checkOut).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Number of Nights: <span className="text-orange-600">{voucher.numNights}</span></p>
        </div>
      </div>

      {voucher.remarks && (
        <div>
          <p className="font-bold text-sm text-gray-700">Remarks:</p>
          <p className="text-orange-600 font-semibold mt-1">{voucher.remarks}</p>
        </div>
      )}
    </div>
  );
}

function VehicleVoucherBody({ voucher }: { voucher: any }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vehicle</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.vehicle?.name || voucher.vehicleName || voucher.vehicleType || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vehicle Type</p>
          <p className="text-orange-600 font-semibold text-lg">{voucher.vehicleType?.replace(/_/g, ' ') || '—'}</p>
        </div>
      </div>

      <div className="bg-orange-500 text-white px-4 py-3 rounded-lg">
        <span className="font-bold text-sm">CLIENTS: </span>
        <span className="text-sm">{voucher.clientName}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="font-bold text-sm text-gray-700">No. of Passengers: <span className="text-orange-600">{voucher.numAdults}</span></p>
        </div>
        {voucher.rateKES && (
          <div>
            <p className="font-bold text-sm text-gray-700">Rate: <span className="text-orange-600">KES {voucher.rateKES.toLocaleString()}</span></p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-bold text-sm text-gray-700">Pickup Date:</p>
          <p className="text-orange-600 font-semibold">
            {voucher.pickupDate ? new Date(voucher.pickupDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Drop-off Date:</p>
          <p className="text-orange-600 font-semibold">
            {voucher.dropoffDate ? new Date(voucher.dropoffDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-700">Pickup Location:</p>
          <p className="text-orange-600 font-semibold">{voucher.pickupLocation || '—'}</p>
        </div>
      </div>

      {voucher.route && (
        <div>
          <p className="font-bold text-sm text-gray-700">Route:</p>
          <p className="text-orange-600 font-semibold mt-1">{voucher.route}</p>
        </div>
      )}

      {voucher.remarks && (
        <div>
          <p className="font-bold text-sm text-gray-700">Remarks:</p>
          <p className="text-orange-600 font-semibold mt-1">{voucher.remarks}</p>
        </div>
      )}
    </div>
  );
}