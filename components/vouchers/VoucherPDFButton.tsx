'use client';
import dynamic from 'next/dynamic';
import HotelVoucherPDF   from './HotelVoucherPDF';
import VehicleVoucherPDF from './VehicleVoucherPDF';
import FlightVoucherPDF  from './FlightVoucherPDF';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false, loading: () => <button className="btn-primary opacity-60">Loading PDF…</button> }
);

export default function VoucherPDFButton({ voucher }: { voucher: any }) {
  const Doc = voucher.type === 'HOTEL'  ? HotelVoucherPDF
            : voucher.type === 'FLIGHT' ? FlightVoucherPDF
            :                             VehicleVoucherPDF;

  return (
    <PDFDownloadLink document={<Doc voucher={voucher} />} fileName={`${voucher.voucherNo}.pdf`}>
      {({ loading }) => (
        <button className="btn-primary">{loading ? 'Preparing PDF…' : '⬇ Download PDF'}</button>
      )}
    </PDFDownloadLink>
  );
}
