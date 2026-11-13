'use client';
import Link from 'next/link';

interface PdfDownloadProps {
  itineraryId: string;
}

export default function PdfDownload({ itineraryId }: PdfDownloadProps) {
  return (
    <div className="relative">
      <select
        id={`pdfPax-${itineraryId}`}
        defaultValue=""
        className="input text-sm border border-gray-300 rounded px-2 py-1.5"
      >
        <option value="">Select pax for download</option>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
          <option key={p} value={p}>
            {p} Person{p > 1 ? 's' : ''}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          const sel = document.getElementById(
            `pdfPax-${itineraryId}`,
          ) as HTMLSelectElement | null;
          const pax = sel ? sel.value : '';
          window.open(`/api/itineraries/${itineraryId}/pdf?pax=${pax}`, '_blank');
        }}
        className="btn-primary text-sm"
      >
        ⬇ Download PDF
      </button>
    </div>
  );
}
