'use client';
import React from 'react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface Destination { id: number; name: string; region?: string | null; description?: string | null; images?: DestinationImage[]; }
interface DestinationImage {
  id: string;
  destinationId: number;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  createdAt: string;
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Image upload per destination
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [destImages, setDestImages] = useState<Record<number, DestinationImage[]>>({});
  const [imageUploading, setImageUploading] = useState<Record<number, boolean>>({});
  const [imageEditing, setImageEditing] = useState<Record<string, boolean>>({});
  const [imageCaption, setImageCaption] = useState<Record<string, string>>({});
  const [deletingImage, setDeletingImage] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch('/api/safari-rates/destinations');
      const data = await res.json();
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert('Failed to load destinations: ' + err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadDestImages(destId: number) {
    try {
      const res = await fetch(`/api/destinations/${destId}/images`);
      const imgs = await res.json();
      setDestImages(p => ({ ...p, [destId]: Array.isArray(imgs) ? imgs : [] }));
    } catch (err) {
      console.error('Failed to load destination images', err);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { alert('Destination name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/safari-rates/counties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), region: form.region.trim() || null, description: form.description.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to add destination' }));
        throw new Error(err.error || 'Failed to add destination');
      }
      const created = await res.json();
      setShowForm(false);
      setForm({ name: '', region: '', description: '' });
      await load();
      if (created.id) {
        setSelectedDestId(created.id);
        await loadDestImages(created.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Image handling ---
  function convertToJpegBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Could not convert to JPEG')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function processFiles(files: FileList | File[], destId: number) {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    setImageUploading(p => ({ ...p, [destId]: true }));

    for (const file of fileArr) {
      try {
        const data = await convertToJpegBase64(file);
        const body = {
          destinationId: destId,
          filename: file.name.replace(/\.[^.]+$/, '.jpg'),
          mimeType: 'image/jpeg',
          data,
        };
        const res = await fetch(`/api/destinations/${destId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Upload failed');
        const img = await res.json();
        setDestImages(p => ({ ...p, [destId]: [...(p[destId] || []), img] }));
      } catch (err) {
        console.error('Error uploading image:', file.name, err);
      }
    }
    setImageUploading(p => ({ ...p, [destId]: false }));
  }

  async function removeImage(destId: number, imageId: string) {
    setDeletingImage(p => ({ ...p, [imageId]: true }));
    try {
      const res = await fetch(`/api/destinations/${destId}/images?imageId=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setDestImages(p => ({ ...p, [destId]: (p[destId] || []).filter((i: DestinationImage) => i.id !== imageId) }));
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    } finally {
      setDeletingImage(p => ({ ...p, [imageId]: false }));
    }
  }

  async function saveImageCaption(destId: number, imageId: string) {
    const caption = imageCaption[imageId];
    setImageEditing(p => ({ ...p, [imageId]: false }));
    try {
      const res = await fetch(`/api/destinations/${destId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) throw new Error('Caption save failed');
      setDestImages(p => ({
        ...p,
        [destId]: (p[destId] || []).map((i: DestinationImage) => i.id === imageId ? { ...i, caption } : i),
      }));
    } catch (err) {
      console.error('Error saving caption:', err);
    }
  }

  function startEdit(d: Destination) {
    setSelectedDestId(null);
    setEditingId(d.id);
    setEditForm({ name: d.name, region: d.region || '', description: d.description || '' });
  }

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', region: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/safari-rates/counties/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), region: editForm.region.trim() || null, description: editForm.description.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to update destination');
      setEditingId(null);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteDestination(id: number) {
    if (!confirm('Delete this destination?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/safari-rates/counties/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete destination');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = destinations.filter(d =>
    !filter || d.name.toLowerCase().includes(filter.toLowerCase()) || (d.region || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destinations ({destinations.length})</h1>
          <p className="text-sm text-gray-500 mt-1">Manage destinations / areas for hotels and tours</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/hotels" className="btn-secondary text-sm">← Hotels</Link>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? '✕ Cancel' : '+ Add Destination'}</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Add Destination / Area</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destination Name *</label>
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Maasai Mara" />
            </div>
            <div>
              <label className="label">Region (optional)</label>
              <input className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Narok County" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe the destination, highlights, best time to visit…"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Destination'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <SearchInput
          value={filter}
          onChange={setFilter}
          placeholder="Filter by destination or region…"
          widthClass="max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Destination','Region','Images','Description','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(d => (
              <React.Fragment key={d.id}>
                {editingId === d.id ? (
                  <tr>
                    <td className="px-4 py-2.5 col-span-5">
                      <form onSubmit={saveEdit} className="flex gap-2 items-center">
                        <input
                          required className="input flex-1"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <input
                          className="input flex-1"
                          value={editForm.region}
                          onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}
                          placeholder="Region"
                        />
                        <button type="submit" disabled={savingEdit} className="btn-primary text-xs py-1.5">{savingEdit ? '…' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDestId(d.id === selectedDestId ? null : d.id)}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{d.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.region || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-orange-500 text-xs font-medium">
                          {(d.images?.length || destImages[d.id]?.length || 0)} images
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-sm truncate max-w-xs">{d.description || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => startEdit(d)} className="text-xs text-blue-600 hover:underline px-2 py-1 border border-blue-200 rounded">Edit</button>
                          <button type="button" onClick={() => deleteDestination(d.id)} disabled={deletingId === d.id} className="text-xs text-red-600 hover:underline px-2 py-1 border border-red-200 rounded">{deletingId === d.id ? '…' : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>

                    {selectedDestId === d.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-orange-50 border-b border-orange-100">
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[260px]">
                              <label className="label block mb-2">Description</label>
                              <p className="text-gray-600 text-sm mb-2">{d.description || 'No description yet.'}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  const desc = prompt('Edit description:', d.description || '');
                                  if (desc !== null) {
                                    fetch(`/api/safari-rates/counties/${d.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name: d.name, region: d.region || null, description: desc }),
                                    }).then(async r => {
                                      if (!r.ok) throw new Error('Failed to update description');
                                      const updated = await r.json();
                                      setDestinations(prev => prev.map(x => x.id === d.id ? { ...x, description: updated.description } : x));
                                    }).catch(err => alert(err.message));
                                  }
                                }}
                                className="btn-secondary text-xs mt-2 px-3 py-1.5"
                              >
                                Edit Description
                              </button>
                            </div>

                            <div className="flex-1 min-w-[260px]">
                              <label className="label block mb-2">Destination Images (drag & drop / browse)</label>
                              <div
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDragLeave={(e) => { e.preventDefault(); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files, d.id);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${imageUploading[d.id] ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}`}
                              >
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={e => e.target.files && processFiles(e.target.files, d.id)}
                                />
                                {imageUploading[d.id] ? (
                                  <p className="text-xs text-orange-500 flex items-center justify-center gap-2 mt-2">
                                    <span className="inline-block w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                    Uploading…
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-2xl mb-1">🏞</p>
                                    <p className="text-xs text-gray-500">Drag & drop images here, or <span className="text-orange-500 font-medium">click to browse</span></p>
                                  </>
                                )}
                              </div>

                              {(d.images || destImages[d.id] || []).length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-3 max-h-[220px] overflow-y-auto">
                                  {(d.images || destImages[d.id] || []).map((img: DestinationImage) => (
                                    <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200 group">
                                      <img
                                        src={`data:${img.mimeType};base64,${img.data}`}
                                        alt={img.filename}
                                        className="w-full h-20 object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={() => removeImage(d.id, img.id)}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow"
                                          disabled={deletingImage[img.id]}
                                        >
                                          ×
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-500 truncate px-1 py-0.5 bg-white">{img.filename}</p>
                                      {imageEditing[img.id] ? (
                                        <div className="p-1">
                                          <input
                                            className="input text-xs w-full"
                                            value={imageCaption[img.id] || img.caption || ''}
                                            onChange={e => setImageCaption(p => ({ ...p, [img.id]: e.target.value }))}
                                            placeholder="Caption"
                                            autoFocus
                                          />
                                          <div className="flex gap-1 mt-1">
                                            <button onClick={() => saveImageCaption(d.id, img.id)} className="text-xs text-orange-600 hover:underline">Save</button>
                                            <button onClick={() => setImageEditing(p => ({ ...p, [img.id]: false }))} className="text-xs text-gray-500 hover:underline">Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setImageEditing(p => ({ ...p, [img.id]: true }))}
                                          className="absolute top-1 right-1 z-10 text-xs text-gray-500 hover:text-orange-600 bg-white/90 px-1 py-0.5 rounded border border-gray-200"
                                        >
                                          ✏️
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
