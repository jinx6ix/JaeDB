'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Image state per hotel
  const [hotelImages, setHotelImages] = useState<Record<number, HotelImage[]>>({});
  const [imageUploading, setImageUploading] = useState<Record<number, boolean>>({});
  const [imageEditing, setImageEditing] = useState<Record<string, boolean>>({});
  const [imageCaption, setImageCaption] = useState<Record<string, string>>({});
  const [deletingImage, setDeletingImage] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryHotel, setGalleryHotel] = useState<Hotel | null>(null);
  const [galleryImages, setGalleryImages] = useState<HotelImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryDescEditing, setGalleryDescEditing] = useState(false);
  const [galleryDesc, setGalleryDesc] = useState('');

  // Image edit/delete popup state (deliberate buttons — no accidental x-delete)
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupImage, setPopupImage] = useState<HotelImage | null>(null);
  const [popupCaption, setPopupCaption] = useState('');

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
        setGalleryImages(prev => [...prev, img]);
      } catch (err) {
        console.error('Error uploading image:', file.name, err);
      }
    }
    setImageUploading(p => ({ ...p, [hotelId]: false }));
  }

  async function removeImage(hotelId: number, imageId: string) {
    if (!confirm('Delete this image?')) return;
    setDeletingImage(p => ({ ...p, [imageId]: true }));
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotelId}/images?imageId=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setHotelImages(p => ({ ...p, [hotelId]: (p[hotelId] || []).filter((i: HotelImage) => i.id !== imageId) }));
      setGalleryImages(prev => prev.filter(i => i.id !== imageId));
      if (galleryIndex >= galleryImages.length - 1 && galleryImages.length > 1) {
        setGalleryIndex(galleryIndex - 1);
      }
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
      setGalleryImages(prev => prev.map(i => i.id === imageId ? { ...i, caption } : i));
    } catch (err) {
      console.error('Error saving caption:', err);
    }
  }

  async function saveGalleryDescription() {
    if (!galleryHotel) return;
    try {
      const res = await fetch(`/api/safari-rates/hotels/${galleryHotel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: galleryDesc }),
      });
      if (!res.ok) throw new Error('Failed to update description');
      const updated = await res.json();
      setHotelImages(p => p); // no-op, keep reference stable
      setHotels(prev => prev.map(h => h.id === galleryHotel!.id ? { ...h, description: updated.description } : h));
      setGalleryDescEditing(false);
    } catch (err) {
      alert('Failed to update description');
    }
  }

  // --- Gallery handlers ---
  async function openGallery(hotel: Hotel) {
    setGalleryHotel(hotel);
    setGalleryIndex(0);
    setGalleryDesc(hotel.description || '');
    setGalleryOpen(true);

    const cached = hotelImages[hotel.id];
    if (cached && cached.length > 0) {
      setGalleryImages(cached);
      return;
    }
    try {
      const res = await fetch(`/api/safari-rates/hotels/${hotel.id}/images`);
      const imgs = await res.json();
      const images = Array.isArray(imgs) ? imgs : [];
      setHotelImages(p => ({ ...p, [hotel.id]: images }));
      setGalleryImages(images);
    } catch (err) {
      console.error('Failed to load hotel images', err);
    }
  }

  function closeGallery() {
    setGalleryOpen(false);
    setGalleryHotel(null);
    setGalleryImages([]);
    setGalleryIndex(0);
    setGalleryDescEditing(false);
  }

  // --- Image popup handlers (edit + delete, deliberate actions only) ---
  function openImagePopup(image: HotelImage) {
    setPopupImage(image);
    setPopupCaption(image.caption || '');
    setPopupOpen(true);
  }

  function closeImagePopup() {
    setPopupOpen(false);
    setPopupImage(null);
    setPopupCaption('');
  }

  async function savePopupCaption() {
    if (!popupImage || !galleryHotel) return;
    try {
      const res = await fetch(`/api/safari-rates/hotels/${galleryHotel.id}/images/${popupImage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: popupCaption }),
      });
      if (!res.ok) throw new Error('Caption save failed');
      setHotelImages(p => ({
        ...p,
        [galleryHotel.id]: (p[galleryHotel.id] || []).map((i: HotelImage) => i.id === popupImage!.id ? { ...i, caption: popupCaption } : i),
      }));
      setGalleryImages(prev => prev.map(i => i.id === popupImage!.id ? { ...i, caption: popupCaption } : i));
      closeImagePopup();
    } catch (err) {
      console.error('Error saving caption:', err);
      alert('Failed to save caption');
    }
  }

  function deletePopupImage() {
    if (!popupImage || !galleryHotel) return;
    removeImage(galleryHotel.id, popupImage.id);
    closeImagePopup();
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

      {/* Card list — 3 images per card, clickable to open gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(h => {
          const imgs = (h.images || hotelImages[h.id] || []) as HotelImage[];
          return (
            <div
              key={h.id}
              className="card cursor-pointer hover:shadow-md transition-shadow duration-200 group border border-gray-200"
              onClick={() => openGallery(h)}
            >
              <div className="relative h-48 overflow-hidden rounded-t-lg bg-gray-100 flex items-center justify-center">
                {imgs.length === 0 ? (
                  <div className="text-gray-400 text-xs">No images</div>
                ) : (
                  <div className="absolute inset-0 grid grid-cols-3 gap-0">
                    {imgs.slice(0, 3).map((img, idx) => (
                      <div key={img.id} className={idx === 0 ? 'border-r' : idx === 2 ? 'border-l' : ''}>
                        <img
                          src={`data:${img.mimeType};base64,${img.data}`}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                          onClick={(e) => { e.stopPropagation(); openImagePopup(img); }}
                        />
                      </div>
                    ))}
                    {imgs.length > 3 && (
                      <div className="flex items-center justify-center bg-gray-200 border-l border-r text-xs text-gray-500 font-medium">
                        +{imgs.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                  {imgs.length} images
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 text-sm leading-tight">{h.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {h.category || '—'} · {h.stars ? '★'.repeat(h.stars) : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{h.county.name}</p>
                {h.description && (
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{h.description}</p>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <p className="text-gray-500">No hotels found.</p>
          </div>
        )}
      </div>

      {/* Gallery modal — click card to open, click image to open edit/delete popup */}
      {galleryOpen && galleryHotel && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800">{galleryHotel.name}</h2>
                <p className="text-xs text-gray-500">{galleryHotel.category || '—'} · {galleryHotel.stars ? '★'.repeat(galleryHotel.stars) : '—'} · {galleryHotel.county.name}</p>
              </div>
              <div className="flex gap-2">
                {galleryDescEditing ? (
                  <>
                    <button
                      onClick={saveGalleryDescription}
                      disabled={saving}
                      className="text-xs text-orange-600 hover:underline font-medium"
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setGalleryDescEditing(false); setGalleryDesc(galleryHotel.description || ''); }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setGalleryDesc(galleryHotel.description || ''); setGalleryDescEditing(true); }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Edit Description
                    </button>
                    <button onClick={closeGallery} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {galleryDescEditing && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <textarea
                  value={galleryDesc}
                  onChange={e => setGalleryDesc(e.target.value)}
                  rows={3}
                  className="input w-full"
                  placeholder="Describe the hotel…"
                  autoFocus
                />
              </div>
            )}

            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
              {galleryImages.length > 0 ? (
                <>
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex((i) => (i === 0 ? galleryImages.length - 1 : i - 1))}
                        className="absolute left-4 bg-white/90 p-2 rounded-full shadow hover:bg-white transition-colors disabled:opacity-30"
                        disabled={galleryImages.length <= 1}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() => setGalleryIndex((i) => (i === galleryImages.length - 1 ? 0 : i + 1))}
                        className="absolute right-4 bg-white/90 p-2 rounded-full shadow hover:bg-white transition-colors disabled:opacity-30"
                        disabled={galleryImages.length <= 1}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                  <img
                    src={`data:${galleryImages[galleryIndex].mimeType};base64,${galleryImages[galleryIndex].data}`}
                    alt={galleryImages[galleryIndex].filename}
                    className="max-h-[60vh] max-w-full object-contain cursor-pointer"
                    onClick={() => openImagePopup(galleryImages[galleryIndex])}
                  />
                </>
              ) : (
                <div className="text-gray-400">No images</div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between mb-2">
                {galleryImages.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Image {galleryIndex + 1} of {galleryImages.length}
                  </span>
                )}
                <button
                  onClick={() => {
                    const el = fileInputRef.current;
                    if (el) el.click();
                  }}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  + Add Images
                </button>
              </div>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`relative rounded overflow-hidden border-2 ${
                        idx === galleryIndex ? 'border-orange-500' : 'border-transparent hover:border-gray-300'
                      } group cursor-pointer`}
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(idx); }}
                    >
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={img.filename}
                        className="w-full h-16 object-cover"
                        onClick={(e) => { e.stopPropagation(); openImagePopup(img); }}
                      />
                      {idx === galleryIndex && (
                        <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-[10px] text-center px-1">
                          {img.filename}
                        </div>
                      )}
                    </div>
                  ))}
                  {galleryImages.length > 4 && (
                    <div className="flex items-center justify-center bg-gray-100 border text-xs text-gray-500 font-medium">
                      +{galleryImages.length - 4}
                    </div>
                  )}
                </div>
              )}
              {imageUploading[galleryHotel.id] && (
                <p className="text-xs text-orange-500 flex items-center justify-center gap-2 mt-2">
                  <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && galleryHotel && processFiles(e.target.files, galleryHotel.id)}
          />
        </div>
      )}

      {/* Image edit/delete popup — deliberate buttons, no accidental x-delete */}
      {popupOpen && popupImage && galleryHotel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Image Details</h2>
            </div>
            <div className="p-4">
              <img
                src={`data:${popupImage.mimeType};base64,${popupImage.data}`}
                alt={popupImage.filename}
                className="w-full h-48 object-cover rounded-lg border border-gray-200 mb-4 cursor-pointer"
                onClick={() => {}}
              />
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Caption</label>
                  <input
                    type="text"
                    value={popupCaption}
                    onChange={e => setPopupCaption(e.target.value)}
                    className="input w-full"
                    placeholder="Add a caption…"
                  />
                </div>
                <p className="text-xs text-gray-500 truncate">{popupImage.filename}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={closeImagePopup}
                className="btn-secondary text-sm px-4"
              >
                Close
              </button>
              <button
                onClick={() => { savePopupCaption(); }}
                className="btn-primary text-sm px-4"
              >
                Save Caption
              </button>
              <button
                onClick={deletePopupImage}
                className="btn-secondary text-sm px-4 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                Delete Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
