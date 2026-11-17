'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CopyItineraryButton({ id, title }: { id: string; title: string }) {
  const [copying, setCopying] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    setCopying(true);
    try {
      const res = await fetch(`/api/itineraries/${id}/copy`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Copy failed:', err.error || res.statusText);
        setCopying(false);
        return;
      }
      const copy = await res.json();
      router.push(`/dashboard/itineraries/${copy.id}`);
      router.refresh();
    } catch (err: any) {
      console.error('Copy error:', err);
      setCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copying}
      className="btn-secondary text-sm px-3 py-1.5"
    >
      {copying ? 'Copying…' : 'Copy'}
    </button>
  );
}
