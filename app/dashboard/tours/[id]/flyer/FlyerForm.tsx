// app/dashboard/tours/[id]/flyer/FlyerForm.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface TourImage {
  id: string;
  filename: string;
  caption: string | null;
  isCover: boolean;
  createdAt: string;
}

interface Highlight {
  title: string;
  description: string;
}

interface Tour {
  id: string;
  title: string;
  highlights?: string | null;
  flyerHeadline1?: string | null;
  flyerHeadline2?: string | null;
  flyerSubtitle?: string | null;
  flyerHighlights?: string | null;
  images: TourImage[];
}

interface Props {
  tour: Tour;
  isAdmin: boolean;
}

const EMPTY_HIGHLIGHT: Highlight = { title: '', description: '' };

export default function FlyerForm({ tour, isAdmin }: Props) {
  const [form, setForm] = useState<{
    headline1: string;
    headline2: string;
    subtitle: string;
    highlights: Highlight[];
  }>({
    headline1: '',
    headline2: '',
    subtitle: '',
    highlights: Array.from({ length: 6 }, () => EMPTY_HIGHLIGHT),
  });
  const [initialForm, setInitialForm] = useState<string>('');
  const [problems, setProblems] = useState<{ field: string; problem: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [images, setImages] = useState<TourImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- prefills / initial ----
  useEffect(() => {
    const savedEmpty =
      !tour.flyerHeadline1 &&
      !tour.flyerHeadline2 &&
      !tour.flyerSubtitle &&
      !tour.flyerHighlights;

    const existingHighlights: string[] = tour.highlights
      ? (() => {
          try {
            return JSON.parse(tour.highlights);
          } catch {
            return [];
          }
        })()
      : [];

    const prefilled: Highlight[] = Array.from({ length: 6 }, (_, i) => ({
      title: existingHighlights[i] || '',
      description: '',
    }));

    const next = {
      headline1: savedEmpty ? tour.title : (tour.flyerHeadline1 || ''),
      headline2: savedEmpty ? '' : (tour.flyerHeadline2 || ''),
      subtitle: savedEmpty ? '' : (tour.flyerSubtitle || ''),
      highlights: savedEmpty ? prefilled : (safeParseHighlights(tour.flyerHighlights) || []),
    };

    // Ensure exactly 6 highlight rows.
    while (next.highlights.length < 6) next.highlights.push(EMPTY_HIGHLIGHT);
    next.highlights.length = 6;

    setForm(next);
    setInitialForm(JSON.stringify(next));
  }, [tour]);

  function safeParseHighlights(value: string | null | undefined): Highlight[] | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as Highlight[];
    } catch {
      /* ignore */
    }
    return null;
  }

  const unsavedChanges = JSON.stringify(form) !== initialForm;

  // ---- images ----
  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}/images`);
      if (res.ok) {
        const data = (await res.json()) as TourImage[];
        setImages(Array.isArray(data) ? data : []);
      }
    } catch {
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, [tour.id]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  async function handleUpload(files: FileList | File[]) {
    if (!isAdmin) return;
    const fileArr = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (!fileArr.length) return;
    setUploading(true);
    for (const file of fileArr) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/tours/${tour.id}/images`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          console.error('Upload failed:', await res.text());
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setUploading(false);
    await loadImages();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function setCover(imageId: string) {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/tours/${tour.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCover: true }),
      });
      if (res.ok) await loadImages();
    } catch (err) {
      console.error('Set cover error:', err);
    }
  }

  async function deleteImage(imageId: string) {
    if (!isAdmin) return;
    if (!window.confirm('Delete this photo?')) return;
    try {
      const res = await fetch(`/api/tours/${tour.id}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (res.ok) await loadImages();
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  // ---- form field handlers ----
  function setField<K extends keyof Omit<typeof form, 'highlights'>>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setHighlightTitle(i: number, v: string) {
    setForm((f) => {
      const next = [...f.highlights];
      next[i] = { ...next[i], title: v };
      return { ...f, highlights: next };
    });
  }
  function setHighlightDescription(i: number, v: string) {
    setForm((f) => {
      const next = [...f.highlights];
      next[i] = { ...next[i], description: v };
      return { ...f, highlights: next };
    });
  }

  // ---- save ----
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaveStatus('saving');
    setSaveMessage('');
    setProblems([]);

    try {
      const res = await fetch(`/api/tours/${tour.id}/flyer-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('success');
        setSaveMessage('Flyer details saved.');
        setInitialForm(JSON.stringify(form));
        // refresh saved values from response if provided
        if (data.flyerHeadline1 !== undefined) {
          setForm((f) => ({
            ...f,
            headline1: data.flyerHeadline1 ?? f.headline1,
            headline2: data.flyerHeadline2 ?? f.headline2,
            subtitle: data.flyerSubtitle ?? f.subtitle,
            highlights: Array.isArray(data.highlights) ? data.highlights : f.highlights,
          }));
          setInitialForm(JSON.stringify(form));
        }
      } else if (res.status === 422 && Array.isArray(data.problems)) {
        setSaveStatus('error');
        setSaveMessage('Please fix the highlighted fields.');
        setProblems(data.problems);
      } else {
        setSaveStatus('error');
        setSaveMessage(data.error || 'Failed to save flyer details');
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  const problemsByField = new Map<string, string>();
  for (const p of problems) {
    problemsByField.set(p.field, p.problem);
  }

  const subtitleCounter = `${form.subtitle.length} / 70`;
  const titleCounter = (i: number) => `${form.highlights[i]?.title.length || 0} / 24`;
  const descCounter = (i: number) => `${form.highlights[i]?.description.length || 0} / 95`;

  const disabled = !isAdmin;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/tours/${tour.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back to tour
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Flyer</h1>
          <p className="text-gray-500 text-sm mt-0.5">{tour.title}</p>
        </div>
      </div>

      {saveStatus === 'error' && saveMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
          {saveMessage}
        </div>
      )}
      {saveStatus === 'success' && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm">
          {saveMessage}
        </div>
      )}

      {/* Flyer content form */}
      <form onSubmit={handleSave} className="card space-y-5 p-5">
        <div>
          <label className="label">Headline line 1 *</label>
          <input
            value={form.headline1}
            onChange={(e) => setField('headline1', e.target.value)}
            disabled={disabled}
            className="input"
            placeholder="Your Safari"
          />
          {problemsByField.get('headline1') && (
            <p className="text-xs text-red-600 mt-1">{problemsByField.get('headline1')}</p>
          )}
        </div>
        <div>
          <label className="label">Headline line 2 *</label>
          <input
            value={form.headline2}
            onChange={(e) => setField('headline2', e.target.value)}
            disabled={disabled}
            className="input"
            placeholder="Adventure Awaits"
          />
          {problemsByField.get('headline2') && (
            <p className="text-xs text-red-600 mt-1">{problemsByField.get('headline2')}</p>
          )}
        </div>
        <div>
          <label className="label flex justify-between">
            Subtitle *
            <span className="text-xs text-gray-400">{subtitleCounter}</span>
          </label>
          <textarea
            value={form.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            disabled={disabled}
            className="input h-20 resize-none"
            maxLength={70}
            placeholder="Guided tours into the heart of the wild"
          />
          {problemsByField.get('subtitle') && (
            <p className="text-xs text-red-600 mt-1">{problemsByField.get('subtitle')}</p>
          )}
          {problemsByField.get('text') && (
            <p className="text-xs text-red-600 mt-1">{problemsByField.get('text')}</p>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Highlights (6 cards)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Title up to 24 chars · Description up to 95 chars
          </p>
          <div className="grid grid-cols-2 gap-4">
            {form.highlights.map((h, i) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-baseline">
                  <label className="label text-xs">Title #{i + 1}</label>
                  <span className="text-xs text-gray-400">{titleCounter(i)}</span>
                </div>
                <input
                  value={h.title}
                  onChange={(e) => setHighlightTitle(i, e.target.value)}
                  disabled={disabled}
                  className="input text-sm"
                  maxLength={24}
                  placeholder="Game drives"
                />
                {problemsByField.get(`highlights[${i}].title`) && (
                  <p className="text-xs text-red-600">
                    {problemsByField.get(`highlights[${i}].title`)}
                  </p>
                )}
                <label className="label text-xs">Description</label>
                <textarea
                  value={h.description}
                  onChange={(e) => setHighlightDescription(i, e.target.value)}
                  disabled={disabled}
                  className="input h-24 resize-none"
                  maxLength={95}
                  placeholder="Sunrise and sunset drives…"
                />
                {problemsByField.get(`highlights[${i}].description`) && (
                  <p className="text-xs text-red-600">
                    {problemsByField.get(`highlights[${i}].description`)}
                  </p>
                )}
              </div>
            ))}
          </div>
          {problemsByField.get('highlights') && (
            <p className="text-xs text-red-600 mt-2">{problemsByField.get('highlights')}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={savingOrReadonly()} className="btn-primary">
            {saveStatus === 'saving' ? 'Saving…' : 'Save flyer details'}
          </button>
          {!disabled && saveStatus === 'success' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              ✓ Saved
            </span>
          )}
          <Link href={`/dashboard/tours/${tour.id}`} className="btn-secondary">
            Cancel
          </Link>
        </div>

        {!disabled && (
          <p className="text-xs text-gray-400 mt-3">
            Prefilled suggestions are not saved until you click Save.
          </p>
        )}
      </form>

      {/* Photos section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Cover photo</h2>
          <p className="text-xs text-gray-400">
            If no photo is chosen, a sunset illustration is used.
          </p>
        </div>

        <div className="mb-4">
          <label className="label block mb-2">Add photo</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-orange-300 hover:bg-gray-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              disabled={disabled || uploading}
            />
            {uploading ? (
              <p className="text-xs text-orange-500">Uploading…</p>
            ) : (
              <p className="text-xs text-gray-500">Click to browse (JPG, PNG, WEBP)</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {images.length === 0 && imagesLoading === false && (
            <p className="col-span-4 text-gray-400 text-sm text-center py-6">
              No photos uploaded yet.
            </p>
          )}
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={`/api/tours/${tour.id}/images/${img.id}`}
                alt={img.filename}
                className="w-full h-24 object-cover"
              />
              {img.isCover && (
                <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-between px-2 py-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setCover(img.id)}
                      disabled={img.isCover}
                      className="text-xs text-orange-600 hover:text-orange-800 disabled:opacity-50"
                    >
                      {img.isCover ? 'Cover' : 'Set as cover'}
                    </button>
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate px-1.5 py-1 bg-white">
                {img.filename}
              </p>
            </div>
          ))}
        </div>
        {imagesLoading && <p className="text-xs text-gray-400 text-center py-4">Loading photos…</p>}
      </div>

      {/* Download / Preview */}
      <div className="flex gap-3">
        <a
          href={`/api/tours/${tour.id}/flyer`}
          download
          onClick={(e) => { if (unsavedChanges || disabled) e.preventDefault(); }}
          className={`btn-primary ${unsavedChanges || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {unsavedChanges ? 'Save first' : '⬇ Download flyer'}
        </a>
        <button
          onClick={() => {
            if (unsavedChanges || disabled) return;
            window.open(`/api/tours/${tour.id}/flyer?inline=1`, '_blank');
          }}
          disabled={unsavedChanges || disabled}
          className={`btn-secondary ${unsavedChanges || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {unsavedChanges ? 'Save first' : 'Preview'}
        </button>
      </div>
    </div>
  );

  function savingOrReadonly(): boolean {
    return disabled || saveStatus === 'saving';
  }
}
