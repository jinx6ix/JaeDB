// components/vouchers/HotelVoucherPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const O = '#F97316';  // orange
const B = '#000000';  // black

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 11, padding: '30 40 40 40', backgroundColor: '#fff' },
  // ── logos ─────────────────────────────────────────────────────────────────
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logo:        { width: 120, height: 60, objectFit: 'contain' },
  // ── voucher no (centered) ────────────────────────────────────────────────
  voucherNo:   { textAlign: 'center', fontSize: 14, fontFamily: 'Helvetica-Bold', color: B, marginBottom: 14 },
  // ── date ────────────────────────────────────────────────────────────────
  date:        { fontSize: 11, color: B, marginBottom: 12 },
  // ── hotel / room row ────────────────────────────────────────────────────
  fieldRow:    { flexDirection: 'row', marginBottom: 8 },
  fieldLabel:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B },
  fieldValue:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  // ── orange CLIENTS bar ──────────────────────────────────────────────────
  clientBar:   { backgroundColor: O, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, marginBottom: 14, marginTop: 4 },
  clientLbl:   { fontFamily: 'Helvetica-Bold', color: '#fff', fontSize: 11, marginRight: 8 },
  clientVal:   { color: '#fff', fontSize: 11 },
  // ── adults row ──────────────────────────────────────────────────────────
  adultsRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  boldTxt:     { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B },
  orangeTxt:   { fontFamily: 'Helvetica-Bold', color: O },
  // ── please book + rooms ─────────────────────────────────────────────────
  bookSection: { flexDirection: 'row', marginBottom: 24 },
  pleaseBook:  { fontFamily: 'Helvetica-Bold', fontSize: 12, color: O, width: 120 },
  roomsCol:    { flex: 1 },
  roomRow:     { flexDirection: 'row', marginBottom: 3 },
  roomLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 80 },
  roomValue:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  // ── check-in block ──────────────────────────────────────────────────────
  checkRow:    { flexDirection: 'row', marginBottom: 5 },
  checkLabel:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 140 },
  checkValue:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  // ── remarks ─────────────────────────────────────────────────────────────
  remRow:      { flexDirection: 'row', marginTop: 18, marginBottom: 4 },
  remLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 80 },
  remValue:    { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O, flex: 1 },
  // ── signature ───────────────────────────────────────────────────────────
  sigBlock:    { marginTop: 36 },
  sigRow:      { flexDirection: 'row', marginBottom: 3 },
  sigLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 11, color: B, width: 55 },
  sigValue:    { fontFamily: 'Helvetica-Bold', fontSize: 11, color: O },
  // ── badge (for amended / cancelled status) ──────────────────────────────
  badge:       {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return String(d); }
}

export default function HotelVoucherPDF({ voucher }: { voucher: any }) {
  const hotelName = voucher.hotelName || voucher.property?.name || '—';
  const issueDate = fmtDate(voucher.issuedDate);
  const checkIn   = fmtDate(voucher.checkIn);
  const checkOut  = fmtDate(voucher.checkOut);

  return (
    <Document title={`Voucher ${voucher.voucherNo}`}>
      <Page size="A4" style={s.page}>

        {/* ── Dual logos ──────────────────────────────────────────────── */}
        <View style={s.header}>
          <Image style={s.logo} src="/logos/logo.jpg" />
          <Image style={s.logo} src="/logos/logo.jpg" />
        </View>

        {/* ── Voucher No ─────────────────────────────────────────────── */}
        <Text style={s.voucherNo}>Voucher No: {voucher.voucherNo}</Text>

        {/* ── Date ───────────────────────────────────────────────────── */}
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

        {/* ── Hotel Name ─────────────────────────────────────────────── */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Hotel Name: </Text>
          <Text style={s.fieldValue}>{hotelName}</Text>
        </View>

        {/* ── Room Type ──────────────────────────────────────────────── */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Room Type : </Text>
          <Text style={s.fieldValue}>{voucher.roomType || '—'}</Text>
        </View>

        {/* ── CLIENTS bar ────────────────────────────────────────────── */}
        <View style={s.clientBar}>
          <Text style={s.clientLbl}>CLIENTS:</Text>
          <Text style={s.clientVal}>{voucher.clientName || '—'}</Text>
        </View>

        {/* ── Adults / Children ──────────────────────────────────────── */}
        <View style={s.adultsRow}>
          <Text style={s.boldTxt}>No. of Adults: <Text style={s.orangeTxt}>{voucher.numAdults ?? 0}</Text></Text>
          <Text style={s.boldTxt}>No. of children under 12 years <Text style={s.orangeTxt}>{voucher.numChildren ?? 0}</Text></Text>
        </View>

        {/* ── Please Book + Room breakdown ───────────────────────────── */}
        <View style={s.bookSection}>
          <Text style={[s.pleaseBook, {
            color: voucher.bookingStatus === 'cancel' ? '#dc2626'
                 : voucher.bookingStatus === 'amend'  ? '#f97316'
                 : '#16a34a'
          }]}>
            {voucher.bookingStatus === 'cancel' ? 'Please Cancel'
             : voucher.bookingStatus === 'amend' ? 'Please Amend'
             : 'Please Book'}
          </Text>
          <View style={s.roomsCol}>
            {[['TWINS:',   voucher.numTwins],
              ['DOUBLES:', voucher.numDoubles],
              ['SINGLES:', voucher.numSingles],
              ['TRIPLES:', voucher.numTriples],
            ].map(([lbl, val]) => (
              <View key={lbl as string} style={s.roomRow}>
                <Text style={s.roomLabel}>{lbl as string}</Text>
                <Text style={s.roomValue}>{(val as number) > 0 ? String(val) : ''}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Check in / out / nights ────────────────────────────────── */}
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Check in:</Text>
          <Text style={s.checkValue}>{checkIn}</Text>
        </View>
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Check out:</Text>
          <Text style={s.checkValue}>{checkOut}</Text>
        </View>
        <View style={s.checkRow}>
          <Text style={s.checkLabel}>Number of Nights:</Text>
          <Text style={s.checkValue}>{voucher.numNights ?? ''}</Text>
        </View>

        {/* ── Remarks ────────────────────────────────────────────────── */}
        {voucher.remarks ? (
          <View style={s.remRow}>
            <Text style={s.remLabel}>Remarks:</Text>
            <Text style={s.remValue}>{voucher.remarks}</Text>
          </View>
        ) : null}

        {/* ── Signature ──────────────────────────────────────────────── */}
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