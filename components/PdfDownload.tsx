'use client';
import { useState } from 'react';
import Link from 'next/link';

interface PdfDownloadProps {
  itineraryId: string;
}

export default function PdfDownload({ itineraryId }: PdfDownloadProps) {
  const [selectedPax, setSelectedPax] = useState<number[]>([]);
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="relative space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Pax:</label>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
          <label key={p} className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedPax.includes(p)}
              onChange={() => {
                setSelectedPax(prev =>
                  prev.includes(p) ? prev.filter(n => n !== p) : [...prev, p].sort((a, b) => a - b)
                );
              }}
              className="form-checkbox h-4 w-4 text-orange-600 rounded border-gray-300"
            />
            {p} Person{p > 1 ? 's' : ''}
          </label>
        ))}
      </div>
      <button
        onClick={() => {
          setDownloading(true);
          const params = selectedPax.map(p => `pax=${p}`).join('&');
          const url = `/api/itineraries/${itineraryId}/pdf${params ? `?${params}` : ''}`;
          window.open(url, '_blank');
          setDownloading(false);
        }}
        disabled={downloading}
        className="btn-primary text-sm"
      >
        {downloading ? 'Downloading…' : '⬇ Download PDF'}
      </button>
      <p className="text-xs text-gray-400">
        Select one or more traveler counts. Each selected pax gets its own costing table in the PDF.
      </p>
    </div>
  );
}
