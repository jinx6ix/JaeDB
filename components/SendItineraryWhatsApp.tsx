'use client';
import { useState, useCallback } from 'react';

interface SendItineraryWhatsAppProps {
  itineraryId: string;
  itineraryTitle: string;
  clientPhone?: string | null;
  clientName?: string | null;
  bookingRef?: string | null;
}

export default function SendItineraryWhatsApp({
  itineraryId,
  itineraryTitle,
  clientPhone,
  clientName,
  bookingRef,
}: SendItineraryWhatsAppProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(clientPhone || '');
  const [selectedPax, setSelectedPax] = useState<number[]>([]);
  const [paxDropdownOpen, setPaxDropdownOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const baseUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_URL
      ? process.env.NEXT_PUBLIC_URL
      : window.location.origin;

  const togglePax = (p: number) =>
    setSelectedPax(prev =>
      prev.includes(p) ? prev.filter(n => n !== p) : [...prev, p].sort((a, b) => a - b)
    );

  const isSelected = (p: number) => selectedPax.includes(p);

  // Build the public PDF URL with selected pax params so WhatsApp recipients can download
  // the itinerary PDF with the chosen traveler-count costing tables.
  const pdfParams = selectedPax.length > 0 ? `?${selectedPax.map(p => `pax=${p}`).join('&')}` : '';
  const pdfUrl = `${baseUrl}/api/itineraries/${itineraryId}/pdf-public${pdfParams}`;

  const paxLabel = selectedPax.length > 0
    ? ` (pax: ${selectedPax.join(', ')})`
    : '';

  const message = `*Jae Travel Expeditions*\n\nDear ${clientName || 'Guest'}, your itinerary *${itineraryTitle}*${bookingRef ? ` (Ref: #${bookingRef})` : ''}${paxLabel} is ready.\n\n📄 Download PDF: ${pdfUrl}\n\nThank you for choosing Jae Travel Expeditions!\n"Live life with no excuses, travel with no regret"`;

  const handleSend = useCallback(() => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Please enter a WhatsApp number');
      return;
    }
    // Strip non-digits except leading +
    const digits = trimmed.replace(/[^\d+]/g, '');
    if (!digits) {
      setError('Please enter a valid phone number');
      return;
    }
    setSending(true);
    setError('');
    const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setSending(false);
    setOpen(false);
  }, [phone, message]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setPhone(clientPhone || ''); setError(''); setOpen(true); }}
        className="btn-secondary text-xs py-1.5 px-3"
      >
        📱 Send via WhatsApp
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Send Itinerary via WhatsApp</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label text-xs block mb-1">Traveler counts (pax)</label>
                <p className="text-xs text-gray-500 mb-2">Select one or more. Each gets its own costing table in the PDF.</p>
                <div className="relative w-full">
                  <button
                    onClick={() => setPaxDropdownOpen(!paxDropdownOpen)}
                    className={`w-full input text-sm border rounded px-3 py-2 flex items-center justify-between ${
                      paxDropdownOpen ? 'border-orange-500' : 'border-gray-300'
                    }`}
                  >
                    <span>
                      {selectedPax.length === 0
                        ? 'Select pax'
                        : selectedPax.length === 1
                          ? `${selectedPax[0]} Person`
                          : `${selectedPax.length} pax selected`}
                    </span>
                    <span className="text-gray-400">{paxDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {paxDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100">
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
              </div>
              <div>
                <label className="label text-xs block mb-1">WhatsApp Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +254 700 000000"
                  className="input w-full"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the client's WhatsApp number (with country code, e.g. +254…)
                </p>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Message preview:</p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 max-h-32 overflow-y-auto border border-gray-200">
                  {message}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary text-sm px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="btn-primary text-sm px-4"
                >
                  {sending ? 'Opening WhatsApp…' : 'Open WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
