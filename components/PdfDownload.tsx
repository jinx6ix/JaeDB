'use client';
import { useState } from 'react';

interface PdfDownloadProps {
  itineraryId: string;
}

export default function PdfDownload({ itineraryId }: PdfDownloadProps) {
  const [selectedPax, setSelectedPax] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const togglePax = (p: number) =>
    setSelectedPax(prev =>
      prev.includes(p) ? prev.filter(n => n !== p) : [...prev, p].sort((a, b) => a - b)
    );

  const isSelected = (p: number) => selectedPax.includes(p);

  return (
    <div className="relative space-y-2">
      {/* Pax dropdown button */}
      <div className="relative inline-block w-full">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full input text-sm border rounded px-3 py-2 flex items-center justify-between ${
            open ? 'border-orange-500' : 'border-gray-300'
          }`}
        >
          <span>
            {selectedPax.length === 0
              ? 'Select pax'
              : selectedPax.length === 1
                ? `${selectedPax[0]} Person`
                : `${selectedPax.length} pax selected`}
          </span>
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <label className="text-xs font-medium text-gray-600 block mb-2">Traveler counts</label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <label
                    key={p}
                    onClick={() => togglePax(p)}
                    className="flex flex-col items-center gap-1 cursor-pointer select-none py-1.5 rounded hover:bg-orange-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(p)}
                      readOnly
                      className="h-4 w-4 text-orange-600 rounded border-gray-300"
                    />
                    <span className="text-xs">{p}</span>
                    <span className="text-[10px] text-gray-400">{p > 1 ? 'pax' : 'pax'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setOpen(false);
          setDownloading(true);
          const params = selectedPax.map(p => `pax=${p}`).join('&');
          const url = `/api/itineraries/${itineraryId}/pdf${params ? `?${params}` : ''}`;
          window.open(url, '_blank');
          setDownloading(false);
        }}
        disabled={downloading || selectedPax.length === 0}
        className="btn-primary text-sm w-full"
      >
        {downloading ? 'Downloading…' : '⬇ Download PDF'}
      </button>
      <p className="text-xs text-gray-400">
        Select one or more traveler counts. Each selected pax gets its own costing table in the PDF.
      </p>
    </div>
  );
}
