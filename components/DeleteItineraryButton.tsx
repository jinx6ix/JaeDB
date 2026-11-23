'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteItineraryButton({ id, title }: { id: string; title: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/itineraries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Delete?</span>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs px-2 py-1">
          {deleting ? '...' : 'Yes'}
        </button>
        <button onClick={() => setShowConfirm(false)} className="btn-secondary text-xs px-2 py-1">No</button>
      </div>
    );
  }

  return (
    <button onClick={() => setShowConfirm(true)} className="btn-danger text-sm">
      Delete
    </button>
  );
}