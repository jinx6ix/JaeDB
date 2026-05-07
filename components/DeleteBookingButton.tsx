'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteBookingButton({ bookingId, bookingRef }: { bookingId: string; bookingRef: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete booking ${bookingRef}? This action cannot be undone.`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      router.refresh(); // re-fetch server component data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="text-red-500 hover:text-red-700 text-xs ml-3 disabled:opacity-50"
    >
      {isLoading ? '...' : 'Delete'}
    </button>
  );
}