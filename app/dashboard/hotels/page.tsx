'use client';
import React from 'react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface County { id: number; name: string; region?: string | null; }
interface HotelImage {
  id: string;
  hotelId: number;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  createdAt: string;
}
interface Hotel {
  id: number;
  name: string;
  stars: number | null;
  category: string | null;
  county: { name: string };
  description?: string | null;
  images?: HotelImage[];
  _count?: { roomTypes: number };
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ countyId: '', name: '', stars: '', category: 'Lodge', description: '' });
  const [saving, setSaving] = useState(false);

  // Image upload per hotel
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [hotelImages, setHotelImages] = useState<Record<number, HotelImage[]>>({});
  const [imageUploading, setImageUploading] = useState<Record<number, boolean>>({});
  const [imageEditing, setImageEditing] = useState<Record<string, boolean>>({});
  const [imageCaption, setImageCaption] = useState<Record<string, string>>({});
  const [deletingImage, setDeletingImage] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [hRes, cRes] = await Promise.all([
        fetch('/api/safari-rates/hotels'),
        fetch('/api/safari-rates/counties'),
      ]);
      if (!hRes.ok || !cRes.ok) throw new Error('Failed to load data');
      const [h, c] = await Promise.all([hRes.json(), cRes.json()]);
      setHotels(Array.isArray(h) ? h : []);
      setCounties(Array.isArray(c) ? c : []);
    } catch (err: any) {
      alert('Failed to load: ' + err.message);
      setHotels([]);
      setCounties([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadHotelImages(hotelId: number) {
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotelId}/images`);
      const imgs = await res.json();
      setHotelImages(p => ({ ...p, [hotelId]: Array.isArray(imgs) ? imgs : [] }));
    } catch (err) {
      console.error('Failed to load hotel images', err);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.countyId) { alert('Please select a destination'); return; }
    if (!form.name.trim()) { alert('Please enter a hotel name'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/safari-rates/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, countyId: Number(form.countyId), stars: form.stars ? Number(form.stars) : null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save hotel' }));
        throw new Error(err.error || 'Failed to save hotel');
      }
      const created = await res.json();
      setShowForm(false);
      setForm({ countyId: '', name: '', stars: '', category: 'Lodge', description: '' });
      await load();
      if (created.id) {
        setSelectedHotelId(created.id);
        await loadHotelImages(created.id);
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

  async function processFiles(files: FileList | File[], hotelId: number) {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    setImageUploading(p => ({ ...p, [hotelId]: true }));

    for (const file of fileArr) {
      try {
        const data = await convertToJpegBase64(file);
        const body = {
          hotelId,
          filename: file.name.replace(/\.[^.]+$/, '.jpg'),
          mimeType: 'image/jpeg',
          data,
        };
        const res = await fetch(`/api/safari-rates/hotels/${hotelId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Upload failed');
        const img = await res.json();
        setHotelImages(p => ({ ...p, [hotelId]: [...(p[hotelId] || []), img] }));
      } catch (err) {
        console.error('Error uploading image:', file.name, err);
      }
    }
    setImageUploading(p => ({ ...p, [hotelId]: false }));
  }

  async function removeImage(hotelId: number, imageId: string) {
    setDeletingImage(p => ({ ...p, [imageId]: true }));
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotelId}/images?imageId=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setHotelImages(p => ({ ...p, [hotelId]: (p[hotelId] || []).filter((i: HotelImage) => i.id !== imageId) }));
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    } finally {
      setDeletingImage(p => ({ ...p, [imageId]: false }));
    }
  }

  async function saveImageCaption(hotelId: number, imageId: string) {
    const caption = imageCaption[imageId];
    setImageEditing(p => ({ ...p, [imageId]: false }));
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotelId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) throw new Error('Caption save failed');
      setHotelImages(p => ({
        ...p,
        [hotelId]: (p[hotelId] || []).map((i: HotelImage) => i.id === imageId ? { ...i, caption } : i),
      }));
    } catch (err) {
      console.error('Error saving caption:', err);
    }
  }

  const filtered = hotels.filter(h =>
    !filter || h.name.toLowerCase().includes(filter.toLowerCase()) || h.county.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotels & Camps ({hotels.length})</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hotel details, descriptions and images</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/safari-rates" className="btn-secondary text-sm">← Contract Rates</Link>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? '✕ Cancel' : '+ Add Hotel'}</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Add Hotel / Camp</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Destination *</label>
              <div className="flex gap-2 items-center">
                <select required className="input flex-1" value={form.countyId} onChange={e => setForm(f => ({ ...f, countyId: e.target.value }))}>
                  <option value="">— Select —</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}{c.region ? ` (${c.region})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Hotel / Camp Name *</label>
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mara Serena Safari Lodge" />
            </div>
            <div>
              <label className="label">Stars</label>
              <select className="input" value={form.stars} onChange={e => setForm(f => ({ ...f, stars: e.target.value }))}>
                <option value="">—</option>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['Lodge', 'Camp', 'Tented Camp', 'Hotel', 'Resort', 'Guesthouse'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe the hotel, its facilities, location highlights…"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Hotel'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <SearchInput
          value={filter}
          onChange={setFilter}
          placeholder="Filter by name or destination…"
          widthClass="max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Hotel / Camp','Category','Stars','Destination','Images','Description','Room Types'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(h => (
              <React.Fragment key={h.id}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedHotelId(h.id === selectedHotelId ? null : h.id)}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{h.category || '—'}</td>
                  <td className="px-4 py-2.5 text-yellow-500 text-sm">{h.stars ? '★'.repeat(h.stars) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{h.county.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-orange-500 text-xs font-medium">
                      {(h.images?.length || hotelImages[h.id]?.length || 0)} images
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-sm truncate max-w-xs">{h.description || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-gray-400 text-xs">{selectedHotelId === h.id ? '▲' : '▼'}</span>
                  </td>
                </tr>

                {selectedHotelId === h.id && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-orange-50 border-b border-orange-100">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[260px]">
                          <label className="label block mb-2">Description</label>
                          <p className="text-gray-600 text-sm mb-2">{h.description || 'No description yet.'}</p>
                          <button
                            type="button"
                            onClick={() => {
                              const desc = prompt('Edit description:', h.description || '');
                              if (desc !== null) {
                                fetch(`/api/safari-rates/hotels/${h.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ description: desc }),
                                }).then(async r => {
                                  if (!r.ok) throw new Error('Failed to update description');
                                  const updated = await r.json();
                                  setHotels(prev => prev.map(x => x.id === h.id ? { ...x, description: updated.description } : x));
                                }).catch(err => alert(err.message));
                              }
                            }}
                            className="btn-secondary text-xs mt-2 px-3 py-1.5"
                          >
                            Edit Description
                          </button>
                        </div>

                        <div className="flex-1 min-w-[260px]">
                          <label className="label block mb-2">Hotel Images (drag & drop / browse)</label>
                          <div
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDragLeave={(e) => { e.preventDefault(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files, h.id);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${imageUploading[h.id] ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e => e.target.files && processFiles(e.target.files, h.id)}
                            />
                            {imageUploading[h.id] ? (
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

                          {((h.images || hotelImages[h.id] || []) as HotelImage[]).length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-3 max-h-[220px] overflow-y-auto">
                              {(h.images || hotelImages[h.id] || []).map((img: HotelImage) => (
                                <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200 group">
                                  <img
                                    src={`data:${img.mimeType};base64,${img.data}`}
                                    alt={img.filename}
                                    className="w-full h-20 object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => removeImage(h.id, img.id)}
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
                                        <button onClick={() => saveImageCaption(h.id, img.id)} className="text-xs text-orange-600 hover:underline">Save</button>
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
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
