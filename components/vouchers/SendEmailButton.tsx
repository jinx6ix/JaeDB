'use client';
import { useState } from 'react';

interface Props {
  voucherId: string;
  clientName: string | null;
}

export default function SendEmailButton({ voucherId, clientName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!email) {
      setMessage('Please enter an email address.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      const res = await fetch(`/api/vouchers/${voucherId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✓ Email sent successfully!');
        setTimeout(() => setIsOpen(false), 1500);
      } else {
        setMessage(data.error || 'Failed to send email.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
      >
        ✉️ Send Email
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Voucher by Email</h3>
            <p className="text-sm text-gray-500 mb-4">Send voucher {voucherId} to:</p>
            <input
              type="email"
              placeholder="recipient@example.com"
              className="input w-full mb-4"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {message && <p className={`text-sm mb-3 ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSend} disabled={sending} className="btn-primary">
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}