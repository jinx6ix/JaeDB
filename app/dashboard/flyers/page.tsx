'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Eye,
  Printer,
  Plus,
  Save,
} from 'lucide-react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  PDFDownloadLink,
} from '@react-pdf/renderer';

const FORMATS: { id: string; label: string; w: number; h: number; ratio: string }[] = [
  { id: 'a4', label: 'A4 (210×297mm)', w: 210, h: 297, ratio: '1:1.414' },
  { id: 'letter', label: 'US Letter (8.5×11in)', w: 215.9, h: 279.4, ratio: '1:1.294' },
  { id: 'square', label: 'Square (1080×1080)', w: 1080, h: 1080, ratio: '1:1' },
  { id: 'story', label: 'Instagram Story (1080×1920)', w: 1080, h: 1920, ratio: '9:16' },
  { id: 'facebook', label: 'Facebook Post (1200×630)', w: 1200, h: 630, ratio: '1.9:1' },
];

const TEMPLATES: { id: string; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Image header, title below, details grid' },
  { id: 'split', label: 'Split', desc: 'Image left, text right (or reverse)' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean text-focused with small accent image' },
  { id: 'poster', label: 'Poster', desc: 'Full-bleed image with overlay text' },
];

interface SavedImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  createdAt: string;
}

interface FlyerState {
  formatId: string;
  templateId: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  title: string;
  subtitle: string;
  body: string;
  price: string;
  contact: string;
  buttonText: string;
  imagePosition: 'top' | 'left' | 'right' | 'full';
  selectedImage: SavedImage | null;
  logoUrl: string;
}

const DEFAULT_STATE: FlyerState = {
  formatId: 'a4',
  templateId: 'classic',
  bgColor: '#ffffff',
  textColor: '#111827',
  accentColor: '#f97316',
  title: '',
  subtitle: '',
  body: '',
  price: '',
  contact: '',
  buttonText: 'Book Now',
  imagePosition: 'top',
  selectedImage: null,
  logoUrl: '',
};

// Saved flyer (persisted to database)
interface SavedFlyer {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  price: string | null;
  contact: string | null;
  buttonText: string | null;
  formatId: string;
  templateId: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  imagePosition: string;
  selectedImage: any | null;
  logoUrl: string | null;
}

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    padding: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 14,
    opacity: 0.8,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  details: {
    width: '100%',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  button: {
    padding: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  imgBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  textBox: {
    flex: 1,
    padding: 24,
  },
});

export default function FlyersPage() {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FlyerState>(DEFAULT_STATE);
  const [savedFlyers, setSavedFlyers] = useState<SavedFlyer[]>([]);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch saved images from the image library
  useEffect(() => {
    fetch('/api/itinerary-images')
      .then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) setImages(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError('Failed to load image library'); });
  }, []);

  // Fetch saved flyers from database
  useEffect(() => {
    fetch('/api/saved-flyers')
      .then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) setSavedFlyers(data);
      })
      .catch(() => setError('Failed to load saved flyers'));
  }, []);

  const setField = (k: keyof FlyerState, v: any) =>
    setState(prev => ({ ...prev, [k]: v }));

  const selectImage = (img: SavedImage) => setField('selectedImage', img);
  const removeImage = () => setField('selectedImage', null);

  const format = FORMATS.find(f => f.id === state.formatId)!;
  const mmToPx = (mm: number) => mm * 3.779528; // 96 DPI

  // Convert uploaded file to JPEG base64
  const convertToJpegBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('No blob')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  // Upload a new image directly to the image library
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    setUploading(true);
    setError('');
    try {
      const data = await convertToJpegBase64(file);
      const body = {
        hotelId: null,
        filename: file.name.replace(/\.[^.]+$/, '.jpg'),
        mimeType: 'image/jpeg',
        data,
      };
      const res = await fetch('/api/itinerary-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Upload failed');
      const created = await res.json();
      setImages(prev => [created, ...prev]);
      selectImage(created as SavedImage);
      e.target.value = '';
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Save current flyer to database ──
  const saveFlyer = useCallback(async () => {
    if (!state.title.trim() && !state.selectedImage) {
      setError('Add a title or image before saving');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/saved-flyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.title || null,
          subtitle: state.subtitle || null,
          body: state.body || null,
          price: state.price || null,
          contact: state.contact || null,
          buttonText: state.buttonText || 'Book Now',
          formatId: state.formatId,
          templateId: state.templateId,
          bgColor: state.bgColor,
          textColor: state.textColor,
          accentColor: state.accentColor,
          imagePosition: state.imagePosition,
          selectedImage: state.selectedImage || null,
          logoUrl: state.logoUrl || null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const created = await res.json();
      setSavedFlyers(prev => [created, ...prev]);
      setSaving(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Save failed');
      setSaving(false);
    }
  }, [state]);

  // ── Delete saved flyer ──
  const deleteFlyer = async (id: string) => {
    try {
      const res = await fetch(`/api/saved-flyers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSavedFlyers(prev => prev.filter(x => x.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  // Render the flyer HTML string for preview and canvas draw
  const flyerHtml = useCallback(() => {
    const s = state;
    const imgHtml = s.selectedImage
      ? `<img src="data:${s.selectedImage.mimeType};base64,${s.selectedImage.data}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:14px;">No image selected</div>`;

    const detailsRows = [
      s.price ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Price</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:13px;">${s.price}</td></tr>` : '',
      s.contact ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Contact</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:13px;">${s.contact}</td></tr>` : '',
    ].filter(Boolean).join('');

    const accent = s.accentColor;
    const txt = s.textColor;
    const bg = s.bgColor;

    const header = s.title
      ? `<div style="padding:24px;text-align:center;">
          <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:${txt};letter-spacing:-0.5px;">${s.title}</h1>
          ${s.subtitle ? `<p style="margin:0;color:${txt};font-size:16px;opacity:0.8;">${s.subtitle}</p>` : ''}
        </div>`
      : '';

    const bodyHtml = s.body
      ? `<div style="padding:0 24px 24px;line-height:1.6;color:${txt};font-size:14px;">${s.body.split('\n').map(p => `<p style="margin:0 0 8px;">${p}</p>`).join('')}</div>`
      : '';

    const buttonHtml = s.buttonText
      ? `<div style="padding:16px 24px;text-align:center;">
          <a href="#" style="display:inline-block;padding:12px 28px;background:${accent};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${s.buttonText}</a>
        </div>`
      : '';

    if (s.templateId === 'poster') {
      return `
        <div style="width:${format.w}mm;height:${format.h}mm;background:${bg};color:${txt};font-family:'Segoe UI',sans-serif;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:0;${imgHtml.replace('width:100%;height:100%','width:100%;height:100%')}"></div>
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
          <div style="position:absolute;bottom:24px;left:24px;right:24px;z-index:2;">
            ${header}
            ${bodyHtml}
            ${buttonHtml}
          </div>
        </div>`;
    }

    if (s.templateId === 'split') {
      const imgSide = s.imagePosition === 'left' ? 'order-1' : 'order-2';
      const txtSide = s.imagePosition === 'left' ? 'order-2' : 'order-1';
      return `
        <div style="width:${format.w}mm;height:${format.h}mm;background:${bg};color:${txt};font-family:'Segoe UI',sans-serif;display:flex;">
          <div style="flex:1;${imgSide};display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">${imgHtml}</div>
          <div style="flex:1;${txtSide};display:flex;flex-direction:justify:center;padding:24px;box-sizing:border-box;">
            ${header}${bodyHtml}${detailsRows ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${detailsRows}</table>` : ''}${buttonHtml}
          </div>
        </div>`;
    }

    if (s.templateId === 'minimal') {
      return `
        <div style="width:${format.w}mm;height:${format.h}mm;background:${bg};color:${txt};font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;box-sizing:border-box;text-align:center;">
          <div style="width:90px;height:90px;border:2px dashed ${accent};border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:${accent};font-size:11px;">${s.selectedImage ? imgHtml : '📷'}</div>
          ${header}${bodyHtml}${buttonHtml}
        </div>`;
    }

    // classic
    return `
      <div style="width:${format.w}mm;height:${format.h}mm;background:${bg};color:${txt};font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;box-sizing:border-box;">
        ${s.selectedImage ? `<div style="height:42%;border-bottom:1px solid #e5e7eb;">${imgHtml}</div>` : ''}
        <div style="flex:1;padding:24px;overflow-y:auto;">
          ${header}
          ${bodyHtml}
          ${detailsRows ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${detailsRows}</table>` : ''}
          ${buttonHtml}
        </div>
      </div>`;
  }, [state, format]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flyer Builder</h1>
          <p className="text-gray-500 text-sm">Design tour flyers from your saved images</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadLink
            document={
              <Document>
                <Page size={[format.w * 2.83465, format.h * 2.83465]} style={pdfStyles.page}>
                  {state.selectedImage && (
                    <View style={pdfStyles.imgBox}>
                      <PdfImage
                        src={`data:${state.selectedImage.mimeType};base64,${state.selectedImage.data}`}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                  )}
                  <View style={pdfStyles.textBox}>
                    {state.title && (
                      <View style={pdfStyles.header}>
                        <Text style={pdfStyles.title}>{state.title}</Text>
                        {state.subtitle && <Text style={pdfStyles.subtitle}>{state.subtitle}</Text>}
                      </View>
                    )}
                    {state.body && (
                      <Text style={pdfStyles.body}>
                        {state.body.split('\n').map((p, i) => (
                          <Text key={i}>{p}</Text>
                        ))}
                      </Text>
                    )}
                    {(state.price || state.contact) && (
                      <View style={pdfStyles.details}>
                        {state.price && (
                          <View style={pdfStyles.detailsRow}>
                            <Text>Price</Text>
                            <Text>{state.price}</Text>
                          </View>
                        )}
                        {state.contact && (
                          <View style={pdfStyles.detailsRow}>
                            <Text>Contact</Text>
                            <Text>{state.contact}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {state.buttonText && (
                      <View style={pdfStyles.button}>
                        <Text>{state.buttonText}</Text>
                      </View>
                    )}
                  </View>
                </Page>
              </Document>
            }
            fileName={`flyer-${state.formatId}.pdf`}
          >
            {({ blob, url, loading: isLoading }) => (
              <button
                disabled={(!state.title.trim() && !state.selectedImage) || isLoading}
                className={`btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? <Save size={14} className="animate-spin" /> : <Save size={14} />}
                {isLoading ? ' Generating PDF…' : ' Download PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Controls */}
        <div className="lg:col-span-4 space-y-4">
        {/* Direct image upload */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Add Image</h2>
            <div className="flex items-center justify-between">
              <label className="cursor-pointer block w-full">
                <Plus size={14} className="mr-1" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              {uploading && <span className="text-[10px] text-orange-500 animate-pulse">Uploading…</span>}
            </div>
            <p className="text-[10px] text-gray-400">JPEG/PNG — uploaded to your image library</p>
          </div>

          {/* Image Library */}
          <div className="card">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Saved Images</h2>
              <button
                onClick={() => setLoading(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
                disabled={loading}
              >
                {loading ? '⟳' : 'Refresh'}
              </button>
            </div>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">Loading images…</div>
            ) : images.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">
                No images in library. Upload via Hotels / Destinations pages.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {images.map(img => (
                  <button
                    key={img.id}
                    onClick={() => selectImage(img)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer ${state.selectedImage?.id === img.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={img.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                      {img.filename.split('.').slice(0,-1).join('.') || img.filename}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {state.selectedImage && (
              <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-700">Selected:</span>
                  <button onClick={removeImage} className="text-xs text-orange-500 hover:text-orange-700 underline">Remove</button>
                </div>
                <div className="flex items-center gap-2">
                  <img src={`data:${state.selectedImage.mimeType};base64,${state.selectedImage.data}`} alt={state.selectedImage.filename} className="w-8 h-8 rounded object-cover" />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">{state.selectedImage.filename}</span>
                </div>
              </div>
            )}
          </div>

          {/* Format & Template */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Format</h2>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setField('formatId', f.id)}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.formatId === f.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  <div className="font-semibold">{f.label}</div>
                  <div className="text-[10px] text-gray-400">{f.ratio}</div>
                </button>
              ))}
            </div>

            <h2 className="font-semibold text-gray-800 text-sm">Template</h2>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setField('templateId', t.id)}
                  className={`text-xs w-full rounded border px-3 py-2 text-left flex items-center gap-2 ${state.templateId === t.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <span className="text-[10px] text-gray-400 ml-auto">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Colors</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Background</label>
                <input
                  type="color"
                  value={state.bgColor}
                  onChange={e => setField('bgColor', e.target.value)}
                  className="w-full h-8 cursor-pointer border-0 bg-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Text</label>
                <input
                  type="color"
                  value={state.textColor}
                  onChange={e => setField('textColor', e.target.value)}
                  className="w-full h-8 cursor-pointer border-0 bg-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Accent</label>
                <input
                  type="color"
                  value={state.accentColor}
                  onChange={e => setField('accentColor', e.target.value)}
                  className="w-full h-8 cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Content</h2>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Title</label>
              <input
                className="input w-full text-sm"
                value={state.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Masai Mara Safari — 3 Days"
              />
              <label className="text-xs text-gray-500 block">Subtitle</label>
              <input
                className="input w-full text-sm"
                value={state.subtitle}
                onChange={e => setField('subtitle', e.target.value)}
                placeholder="Departing Nairobi • All inclusive"
              />
              <label className="text-xs text-gray-500 block">Body / Description</label>
              <textarea
                className="input w-full text-sm"
                value={state.body}
                onChange={e => setField('body', e.target.value)}
                rows={3}
                placeholder="Experience the great migration…"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block">Price</label>
                  <input className="input w-full text-sm" value={state.price} onChange={e => setField('price', e.target.value)} placeholder="$1,200" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Contact</label>
                  <input className="input w-full text-sm" value={state.contact} onChange={e => setField('contact', e.target.value)} placeholder="+254 700 000000" />
                </div>
              </div>
              <label className="text-xs text-gray-500 block">Button Text</label>
              <input
                className="input w-full text-sm"
                value={state.buttonText}
                onChange={e => setField('buttonText', e.target.value)}
                placeholder="Book Now"
              />
            </div>
            <button
              onClick={saveFlyer}
              disabled={saving}
              className="w-full btn-secondary text-xs mt-3"
            >
              {saving ? 'Saving…' : 'Save Flyer'}
            </button>
          </div>

          {/* Image position (only for classic/split) */}
          {['classic', 'split'].includes(state.templateId) && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-800 text-sm">Image Placement</h2>
              <div className="grid grid-cols-2 gap-2">
                {['top', 'left', 'right', 'full'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => setField('imagePosition', pos)}
                    className={`text-xs rounded border px-2 py-2 ${state.imagePosition === pos ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">Preview</h2>
            <span className="text-xs text-gray-400">{format.w} × {format.h} mm · {format.label}</span>
          </div>
          <div
            ref={previewRef}
            className="flex-1 relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: flyerHtml() }}
          />
          <div className="absolute bottom-2 right-2 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 border border-gray-100 shadow-sm">
            <button
              title="Zoom"
              onClick={() => {
                const w = previewRef.current?.clientWidth;
                const h = previewRef.current?.clientHeight;
                const win = window.open('', '_blank', `width=${w || 800},height=${h || 1000}`);
                win!.document.write(`<html><body style="margin:0;background:#f3f4f6;display:flex;align-items:center;justify-content:center;height:100vh">${flyerHtml()}</body></html>`);
              }}
              className="w-8 h-8 rounded flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-gray-50 transition-colors"
            >
              <Eye size={14} />
            </button>
            <button
              title="Print / Save PDF"
              onClick={() => window.print()}
              className="w-8 h-8 rounded flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>
        {/* Bottom: Saved Flyers gallery */}
        {savedFlyers.length > 0 && (
          <div className="lg:col-span-12">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">Saved Flyers</h2>
                <button
                  onClick={() => setSavedFlyers([])}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {savedFlyers.map(f => {
                  const fFormat = FORMATS.find(fm => fm.id === f.formatId)!;
                  return (
                    <div key={f.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="relative h-32 mb-2 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        {f.selectedImage ? (
                          <img src={`data:${f.selectedImage.mimeType};base64,${f.selectedImage.data}`} alt="flyer" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[10px] text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{f.title || 'Untitled'}</span>
                        <span className="text-[10px] text-gray-400">{fFormat.label}</span>
                      </div>
                      <div className="flex gap-1">
                        <PDFDownloadLink
                          document={
                            <Document>
                              <Page size={[fFormat.w * 2.83465, fFormat.h * 2.83465]} style={pdfStyles.page}>
                                {f.selectedImage && (
                                  <View style={pdfStyles.imgBox}>
                                    <PdfImage
                                      src={`data:${f.selectedImage.mimeType};base64,${f.selectedImage.data}`}
                                      style={{ width: '100%', height: '100%' }}
                                    />
                                  </View>
                                )}
                                <View style={pdfStyles.textBox}>
                                  {f.title && (
                                    <View style={pdfStyles.header}>
                                      <Text style={pdfStyles.title}>{f.title}</Text>
                                      {f.subtitle && <Text style={pdfStyles.subtitle}>{f.subtitle}</Text>}
                                    </View>
                                  )}
                                  {f.body && (
                                    <Text style={pdfStyles.body}>
                                      {f.body.split('\n').map((p, i) => (
                                        <Text key={i}>{p}</Text>
                                      ))}
                                    </Text>
                                  )}
                                  {(f.price || f.contact) && (
                                    <View style={pdfStyles.details}>
                                      {f.price && (
                                        <View style={pdfStyles.detailsRow}>
                                          <Text>Price</Text>
                                          <Text>{f.price}</Text>
                                        </View>
                                      )}
                                      {f.contact && (
                                        <View style={pdfStyles.detailsRow}>
                                          <Text>Contact</Text>
                                          <Text>{f.contact}</Text>
                                        </View>
                                      )}
                                    </View>
                                  )}
                                  {f.buttonText && (
                                    <View style={pdfStyles.button}>
                                      <Text>{f.buttonText}</Text>
                                    </View>
                                  )}
                                </View>
                              </Page>
                            </Document>
                          }
                          fileName={`flyer-${f.formatId}.pdf`}
                        >
                          {({ loading: isPdfLoading }) => (
                            <button
                              disabled={isPdfLoading}
                              className="text-xs flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-center hover:bg-gray-50 disabled:opacity-50"
                            >
                              {isPdfLoading ? <Save size={10} className="animate-spin" /> : 'PDF'}
                            </button>
                          )}
                        </PDFDownloadLink>
                        <button
                          onClick={() => deleteFlyer(f.id)}
                          className="text-xs flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
