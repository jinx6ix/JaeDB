// components/vouchers/VehicleVoucherPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const O = '#F97316';
const B = '#000000';

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 11, padding: '30 40 40 40', backgroundColor: '#fff' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logo:       { width: 120, height: 60, objectFit: 'contain' },
  voucherNo:  { textAlign: 'center', fontSize: 14, fontFamily: 'Helvetica-Bold', color: B, marginBottom: 14 },
  date:       { fontSize: 11, color: B, marginBottom: 12 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 12 },
  fieldRow:   { flexDirection: 'row', marginBottom: 8 },
  fieldLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B },
  fieldValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  clientBar:  { backgroundColor: O, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, marginBottom: 14, marginTop: 4 },
  clientLbl:  { fontFamily: 'Helvetica-Bold', color: '#fff', fontSize: 11, marginRight: 8 },
  clientVal:  { color: '#fff', fontSize: 11 },
  adultsRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  boldTxt:    { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B },
  orangeTxt:  { fontFamily: 'Helvetica-Bold', color: O },
  pleaseBook: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: O, marginBottom: 20 },
  checkRow:   { flexDirection: 'row', marginBottom: 5 },
  checkLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 160 },
  checkValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  remRow:     { flexDirection: 'row', marginTop: 18, marginBottom: 4 },
  remLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 80 },
  remValue:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O, flex: 1 },
  sigBlock:   { marginTop: 36 },
  sigRow:     { flexDirection: 'row', marginBottom: 3 },
  sigLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 55 },
  sigValue:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
});

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return String(d); }
}

export default function VehicleVoucherPDF({ voucher }: { voucher: any }) {
  const vehicleName = voucher.vehicleName || voucher.vehicle?.name || voucher.vehicleType || '—';
  const issueDate   = fmtDate(voucher.issuedDate);
  const pickupDate  = fmtDate(voucher.pickupDate);
  const dropoffDate = fmtDate(voucher.dropoffDate);

  return (
    <Document title={`Vehicle Voucher ${voucher.voucherNo}`}>
      <Page size="A4" style={s.page}>

        {/* Logos */}
        <View style={s.header}>
          <Image style={s.logo} src="/logos/logo.jpg" />
          <Image style={s.logo} src="/logos/logo.jpg" />
        </View>

        <Text style={s.voucherNo}>Voucher No: {voucher.voucherNo}</Text>
        <Text style={s.date}>Date: {issueDate}</Text>
        {/* Booking status badge - top right */}
        {voucher.bookingStatus && voucher.bookingStatus !== 'book' && (
          <Text style={[s.badge, {
            backgroundColor: voucher.bookingStatus === 'cancel' ? '#dc2626' : '#f97316',
            alignSelf: 'flex-end',
          }]}>
            {voucher.bookingStatus === 'cancel' ? 'CANCELLED' : 'AMENDED'}
          </Text>
        )}

        {/* Vehicle Name */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Vehicle Name: </Text>
          <Text style={s.fieldValue}>{vehicleName}</Text>
        </View>

        {/* Vehicle Type */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Vehicle Type : </Text>
          <Text style={s.fieldValue}>{(voucher.vehicleType || '').replace(/_/g, ' ')}</Text>
        </View>

        {/* CLIENTS bar */}
        <View style={s.clientBar}>
          <Text style={s.clientLbl}>CLIENTS:</Text>
          <Text style={s.clientVal}>{voucher.clientName || '—'}</Text>
        </View>

        {/* Adults */}
        <View style={s.adultsRow}>
          <Text style={s.boldTxt}>No. of Passengers: <Text style={s.orangeTxt}>{voucher.numAdults ?? 0}</Text></Text>
          {voucher.rateKES ? (
            <Text style={s.boldTxt}>Rate (KES): <Text style={s.orangeTxt}>{Number(voucher.rateKES).toLocaleString()}</Text></Text>
          ) : null}
        </View>

        {/* Dynamic booking action */}
        <Text style={[s.pleaseBook, {
          color: voucher.bookingStatus === 'cancel' ? '#dc2626'
               : voucher.bookingStatus === 'amend'  ? '#f97316'
               : '#16a34a'
        }]}>
          {voucher.bookingStatus === 'cancel' ? 'Please Cancel'
           : voucher.bookingStatus === 'amend' ? 'Please Amend'
           : 'Please Book'}
        </Text>

        {/* Dates */}
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Pickup Date:</Text>
          <Text style={s.checkValue}>{pickupDate}</Text>
        </View>
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Drop-off Date:</Text>
          <Text style={s.checkValue}>{dropoffDate}</Text>
        </View>
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Pickup Location:</Text>
          <Text style={s.checkValue}>{voucher.pickupLocation || '—'}</Text>
        </View>
        {voucher.route ? (
          <View style={s.checkRow}>
            <Text style={s.checkLabel}>Route:</Text>
            <Text style={s.checkValue}>{voucher.route}</Text>
          </View>
        ) : null}

        {/* Remarks */}
        {voucher.remarks ? (
          <View style={s.remRow}>
            <Text style={s.remLabel}>Remarks:</Text>
            <Text style={s.remValue}>{voucher.remarks}</Text>
          </View>
        ) : null}

        {/* Signature */}
        <View style={s.sigBlock}>
          <View style={s.sigRow}><Text style={s.sigLabel}>Signed</Text></View>
          <View style={s.sigRow}>
            <Text style={s.sigLabel}>For:</Text>
            <Text style={s.sigValue}>Jae Travel Expeditions</Text>
          </View>
          <View style={s.sigRow}>
            <Text style={s.sigLabel}>Name:</Text>
            <Text style={s.sigValue}>{voucher.createdBy?.name || '—'}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
