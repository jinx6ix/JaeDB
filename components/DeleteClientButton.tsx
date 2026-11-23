'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Delete client "${clientName}"? This action cannot be undone.`)) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }
      router.refresh(); // refresh server component
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
      >
        {isLoading ? '...' : 'Delete'}
      </button>
      {error && <span className="text-red-500 text-xs ml-2">{error}</span>}
    </>
  );
}