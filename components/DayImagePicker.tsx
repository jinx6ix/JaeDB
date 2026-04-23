'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

interface ItineraryImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  dayId?: string | null;
}

interface Props {
  // Images already attached to this day (from DB)
  attachedImages: ItineraryImage[];
  // Called when user uploads a new image or picks from library
  onImagesChange: (images: ItineraryImage[]) => void;
  // If the day already has a DB id, we can persist immediately; otherwise caller handles it
  dayId?: string;
}

export default function DayImagePicker({ attachedImages, onImagesChange, dayId }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<ItineraryImage[]>([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    setLoadingLib(true);
    try {
      const res = await fetch('/api/itinerary-images');
      const data = await res.json();
      setLibrary(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingLib(false);
  }, []);

  useEffect(() => {
    if (showLibrary) loadLibrary();
  }, [showLibrary, loadLibrary]);

  async function processFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    setUploading(true);

    const newImages: ItineraryImage[] = [];
    for (const file of fileArr) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const body = { dayId: dayId || null, filename: file.name, mimeType: file.type, data };
      const res = await fetch('/api/itinerary-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const img = await res.json();
        newImages.push(img);
      }
    }

    onImagesChange([...attachedImages, ...newImages]);
    setUploading(false);
  }

  async function removeImage(imgId: string) {
    await fetch(`/api/itinerary-images/${imgId}`, { method: 'DELETE' });
    onImagesChange(attachedImages.filter(i => i.id !== imgId));
  }

  async function pickFromLibrary(img: ItineraryImage) {
    // Attach this existing image to the current day
    if (dayId) {
      await fetch(`/api/itinerary-images/${img.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayId }),
      });
    }
    const updated = { ...img, dayId: dayId || null };
    onImagesChange([...attachedImages, updated]);
    setShowLibrary(false);
  }

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const isAlreadyAttached = (imgId: string) => attachedImages.some(i => i.id === imgId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label text-xs">Day Images</label>
        <button
          type="button"
          onClick={() => setShowLibrary(v => !v)}
          className="text-xs text-orange-500 hover:underline flex items-center gap-1"
        >
          🗂 Select from Library
        </button>
      </div>

      {/* Library picker */}
      {showLibrary && (
        <div className="border border-orange-200 rounded-xl bg-orange-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Image Library</p>
            <button type="button" onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕ Close</button>
          </div>
          {loadingLib ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
          ) : library.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {library.map(img => {
                const already = isAlreadyAttached(img.id);
                return (
                  <button
                    key={img.id}
                    type="button"
                    disabled={already}
                    onClick={() => pickFromLibrary(img)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      already
                        ? 'border-green-400 opacity-60 cursor-not-allowed'
                        : 'border-transparent hover:border-orange-400 cursor-pointer'
                    }`}
                  >
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={img.filename}
                      className="w-full h-16 object-cover"
                    />
                    {already && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/40">
                        <span className="text-white text-lg font-bold">✓</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 truncate px-1 py-0.5 bg-white">{img.filename}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drag & drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-xs text-orange-500 flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Uploading…
          </p>
        ) : (
          <>
            <p className="text-2xl mb-1">🏞</p>
            <p className="text-xs text-gray-500">Drag & drop images here, or <span className="text-orange-500 font-medium">click to browse</span></p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP supported</p>
          </>
        )}
      </div>

      {/* Attached images */}
      {attachedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachedImages.map(img => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.filename}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-gray-500 truncate px-1.5 py-1 bg-white">{img.caption || img.filename}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
