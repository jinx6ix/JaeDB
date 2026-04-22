// components/vouchers/VoucherPDFButton.tsx
'use client';

import { usePDF } from '@react-pdf/renderer';
import dynamic from 'next/dynamic';
import HotelVoucherPDF from './HotelVoucherPDF';
import VehicleVoucherPDF from './VehicleVoucherPDF';
import FlightVoucherPDF from './FlightVoucherPDF';

// Dynamically import the PDF components to reduce initial bundle size
const PDFComponents = {
  HOTEL: HotelVoucherPDF,
  FLIGHT: FlightVoucherPDF,
  VEHICLE: VehicleVoucherPDF,
};

export default function VoucherPDFButton({ voucher }: { voucher: any }) {
  const Doc = PDFComponents[voucher.type as keyof typeof PDFComponents] || VehicleVoucherPDF;

  const [instance, update] = usePDF({
    document: <Doc voucher={voucher} />,
  });

  const handleDownload = () => {
    if (instance.url) {
      const link = document.createElement('a');
      link.href = instance.url;
      link.download = `${voucher.voucherNo}.pdf`;
      link.click();
    }
  };

  return (
    <button
      className="btn-primary"
      onClick={handleDownload}
      disabled={instance.loading}
    >
      {instance.loading ? 'Preparing PDF…' : '⬇ Download PDF'}
    </button>
  );
}