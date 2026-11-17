'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Save, Plus } from 'lucide-react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  PDFDownloadLink,
} from '@react-pdf/renderer';

// Design tokens matching lib/tour-flyer-pdf.tsx (Jae_Travel_Tour_Flier.pdf design)
const GREEN = '#1F3D2B';
const GOLD = '#E8A33D';
const SAND = '#F6EBD7';
const ORANGE = '#D9622B';
const DARK = '#16241B';
const BODY = '#4A5A4F';

const W = 595.28;
const H = 841.89;
interface FlyerImage {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  caption?: string | null;
  createdAt: string;
}

interface Highlight {
  title: string;
  description: string;
}

interface FlyerState {
  headline1: string;
  headline2: string;
  subtitle: string;
  highlights: Highlight[];
  coverImage: FlyerImage | null;
  phone: string;
  email: string;
  website: string;
  social: string;
  // 'left' | 'center' | 'right' — where the circular logo sits in the hero header
  logoPosition: 'left' | 'center' | 'right';
  // 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' — where the text block sits
  textPosition: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  // Image placement controls (apply to cover image in hero)
  imageFit: 'cover' | 'contain' | 'fill' | 'none';
  imageScale: number; // 1 = 100%, zoom factor
  imagePositionX: number; // -1 to 1, 0 = center horizontally
  imagePositionY: number; // -1 to 1, 0 = center vertically
}

const DEFAULT_STATE: FlyerState = {
  headline1: 'Your Safari',
  headline2: 'Adventure Awaits',
  subtitle: 'Guided tours into the heart of the wild — crafted around you.',
  highlights: [{ title: '', description: '' }],
  coverImage: null,
  phone: '+254 726 485228',
  email: 'info@jaetravel.co.ke',
  website: 'www.jaetravel.co.ke',
  social: '@JaeTravelExpeditions',
  logoPosition: 'left',
  textPosition: 'bottomLeft',
  imageFit: 'cover',
  imageScale: 1,
  imagePositionX: 0,
  imagePositionY: 0,
};

const blankHighlight: Highlight = { title: '', description: '' };

// react-pdf positions text by its top edge; the Helvetica baseline sits ~0.9 *
// fontSize below the top edge, so a target baseline-from-top B needs
// top = B - 0.9 * fontSize. This is the same top-edge method the card titles
// already use, corrected for the baseline offset.
const topForBaseline = (baselineFromTop: number, fontSize: number) =>
  baselineFromTop - 0.9 * fontSize;

// Convert spec bottom-left y to react-pdf top edge for a block of height h.
const topFromY = (y: number, height: number) => H - y - height;

// Tour-flyer spec constants (bottom-left origin, mirrored from lib/tour-flyer-pdf.tsx)
const HERO_HEIGHT = H * 0.44; // 370.43
const HERO_BOTTOM = H - HERO_HEIGHT; // 471.46
const Y0 = HERO_BOTTOM - 40; // 431.46
const CW = (W - 72 - 20) / 2; // 251.64
const CH = 56;
const BY = 112;

// Logo width/height in the header bar
const LOGO_SIZE = 46;

// ---- Logo position helpers (top of hero) ----
// Returns the left CSS value (or right for 'right') for the logo circle.
function logoLeftPos(pos: 'left' | 'center' | 'right'): number | string {
  if (pos === 'left') return 36;
  if (pos === 'right') return W - 36 - LOGO_SIZE;
  return (W - LOGO_SIZE) / 2; // center
}

// ---- Text position helpers (within hero) ----
// Anchor baselines measured from page top.
const TEXT_BLOCK_BOTTOM = HERO_HEIGHT - 14; // subtitle baseline just inside hero bottom
const H1_BASELINE = TEXT_BLOCK_BOTTOM - 68; // headline 1 baseline
const H2_BASELINE = TEXT_BLOCK_BOTTOM - 24; // headline 2 baseline
const SUB_BASELINE = TEXT_BLOCK_BOTTOM; // subtitle baseline
const H1_TOP = H1_BASELINE - 0.9 * 36;
const H2_TOP = H2_BASELINE - 0.9 * 36;
const SUB_TOP = TEXT_BLOCK_BOTTOM - 0.9 * 11;

// Top-anchored text baseline (just below header bar + logo + wordmark)
// Baselines are returned (not tops) so textStyle()/topForBaseline() can convert correctly.
const TEXT_TOP_BASELINE = 105; // headline 1 baseline from page top for top-anchored text
const H1_TOP_BASELINE = TEXT_TOP_BASELINE; // 105
const H2_TOP_BASELINE = TEXT_TOP_BASELINE + 44; // 149
const SUB_TOP_BASELINE = H2_TOP_BASELINE + 24; // 173

function textHorizPos(pos: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): string {
  return pos.endsWith('Right') ? 'right:36px;text-align:right' : 'left:36px';
}
function textTop(pos: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): number {
  return pos.startsWith('top') ? H1_TOP_BASELINE : H1_BASELINE;
}
function textTop2(pos: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): number {
  return pos.startsWith('top') ? H2_TOP_BASELINE : H2_BASELINE;
}
function textTopSub(pos: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): number {
  return pos.startsWith('top') ? SUB_TOP_BASELINE : SUB_BASELINE;
}

// Image placement helpers
// object-position: 50% + (pos * 50)%, where pos in [-1,1]; 0 = center
function imageObjectPosition(s: FlyerState): string {
  const x = s.imagePositionX ?? 0;
  const y = s.imagePositionY ?? 0;
  return `${50 + x * 50}% ${50 + y * 50}%`;
}
function imageTransformOrigin(s: FlyerState): string {
  const x = s.imagePositionX ?? 0;
  const y = s.imagePositionY ?? 0;
  return `${50 + x * 50}% ${50 + y * 50}%`;
}

// Logo from the public directory (used by default when no custom logoUrl is set).
// Loaded once on module init and cached as a data URI so both preview and download
// can embed it synchronously.
let PUBLIC_LOGO_CACHE: string | null = null;
void (async () => {
  try {
    const res = await fetch('/logo.jpg');
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      PUBLIC_LOGO_CACHE = `data:image/jpeg;base64,${btoa(binary)}`;
    }
  } catch {
    /* logo unavailable; falls back to text mark */
  }
})();

// Synchronously load the public logo as a data URI (used by buildPdfDoc so the
// logo always appears on download regardless of client-state fetch timing).
function loadLogoSync(): string | null {
  if (typeof XMLHttpRequest === 'undefined') return null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/logo.jpg', false); // synchronous
    xhr.responseType = 'arraybuffer';
    xhr.send();
    if (xhr.status === 200 && xhr.response) {
      const bytes = new Uint8Array(xhr.response as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    }
  } catch {
    /* logo unavailable */
  }
  return null;
}

function publicLogo(): string | null {
  return PUBLIC_LOGO_CACHE;
}

const pdfStyles = StyleSheet.create({
  page: { backgroundColor: SAND, fontFamily: 'Helvetica' },
  hero: { backgroundColor: SAND, height: HERO_HEIGHT, overflow: 'hidden' } as any,
  headline1: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 36, color: '#ffffff' } as any,
  headline2: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 36, color: GOLD } as any,
  subtitle: { position: 'absolute', fontFamily: 'Helvetica', fontSize: 11, color: '#ffffff' } as any,
  section: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 20, color: GREEN } as any,
  sectionUnderline: { position: 'absolute', width: 54, height: 3.5, backgroundColor: GOLD } as any,
  card: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 8 } as any,
  cardAccent: { position: 'absolute', width: 6, backgroundColor: GOLD, borderRadius: 3 } as any,
  cardTitle: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 12.5, color: GREEN } as any,
  cardDesc: { position: 'absolute', fontFamily: 'Helvetica', fontSize: 9.5, color: BODY, lineHeight: 12 } as any,
  banner: { position: 'absolute', backgroundColor: GREEN, borderRadius: 10 } as any,
  bannerTitle: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 16, color: GOLD } as any,
  bannerLine1: { position: 'absolute', fontFamily: 'Helvetica', fontSize: 11, color: '#ffffff' } as any,
  bannerLine2: { position: 'absolute', fontFamily: 'Helvetica', fontSize: 11, color: '#ffffff' } as any,
  bannerButton: {
    position: 'absolute',
    backgroundColor: ORANGE,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  bannerButtonText: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#ffffff' },
  footerDivider: { position: 'absolute', width: W - 72, height: 1.2, backgroundColor: GOLD } as any,
  footerText: { position: 'absolute', fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: GREEN },
  footerCenter: {
    position: 'absolute',
    left: 0,
    width: W,
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    color: BODY,
    textAlign: 'center',
  } as any,
});

export default function FlyersPage() {
  const [images, setImages] = useState<FlyerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FlyerState>(DEFAULT_STATE);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [savedFlyers, setSavedFlyers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof FlyerState>(k: K, v: FlyerState[K]) =>
    setState((prev) => ({ ...prev, [k]: v }));

  const setHighlight = (i: number, k: 'title' | 'description', v: string) =>
    setState((prev) => {
      const next = [...prev.highlights];
      next[i] = { ...next[i], [k]: v };
      return { ...prev, highlights: next };
    });

  // ---- image library ----
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/itinerary-images');
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      } catch {
        setImages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  // Load the public logo into component state so the preview re-renders when it arrives.
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch('/logo.jpg');
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          setLogoSrc(`data:image/jpeg;base64,${btoa(binary)}`);
        }
      } catch {
        /* logo unavailable; falls back to text mark */
      }
    };
    loadLogo();
  }, []);

  // ---- load saved flyers ----
  useEffect(() => {
    fetch('/api/saved-flyers')
      .then((r) => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) setSavedFlyers(data);
      })
      .catch(() => setError('Failed to load saved flyers'));
  }, []);

  // Hydrate state from a saved flyer (full state stored as JSON in `body`, cover in `selectedImage`)
  const loadSaved = useCallback((f: any) => {
    let next = { ...DEFAULT_STATE };
    try {
      const parsed = f.body ? JSON.parse(f.body) : {};
      if (typeof parsed === 'object' && parsed !== null) {
        next = { ...DEFAULT_STATE, ...parsed };
      }
    } catch {
      /* keep defaults */
    }
    next.coverImage = f.selectedImage || null;
    next.headline1 = f.title || next.headline1;
    next.headline2 = f.subtitle || next.headline2;
    next.textPosition = f.textPosition ?? next.textPosition;
    // keep whatever number of cards was saved (no fixed 6)
    setState(next);
  }, []);

  const selectImage = (img: FlyerImage) => setField('coverImage', img);
  const removeImage = () => setField('coverImage', null);

  const addCard = () =>
    setField('highlights', [...state.highlights, { title: '', description: '' }]);

  const removeCard = (i: number) =>
    setField('highlights', state.highlights.filter((_, idx) => idx !== i));

  const imageSrc = (img: FlyerImage | null | undefined) => {
    if (!img || !img.data) return '';
    const data = img.data.replace(/^data:image\/[^;]+;base64,/, '');
    return `data:${img.mimeType};base64,${data}`;
  };

  const convertToJpegBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No canvas context'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No blob'));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          0.8,
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG or WEBP image');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const data = await convertToJpegBase64(file);
      const body = {
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
      setImages((prev) => [created, ...prev]);
      selectImage(created as FlyerImage);
      e.target.value = '';
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveFlyer = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({
        headline1: state.headline1,
        headline2: state.headline2,
        subtitle: state.subtitle,
        highlights: state.highlights,
        coverImage: state.coverImage ? { id: state.coverImage.id, filename: state.coverImage.filename } : null,
        textPosition: state.textPosition,
        imageFit: state.imageFit,
        imageScale: state.imageScale,
        imagePositionX: state.imagePositionX,
        imagePositionY: state.imagePositionY,
        phone: state.phone,
        email: state.email,
        website: state.website,
        social: state.social,
      });
      const res = await fetch('/api/saved-flyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.headline1 || null,
          subtitle: state.headline2 || null,
          body,
          price: null,
          contact: state.phone || null,
          buttonText: 'BOOK NOW',
          formatId: 'a4',
          templateId: 'classic',
          bgColor: SAND,
          textColor: '#111827',
          accentColor: GOLD,
          imagePosition: 'top',
          selectedImage: state.coverImage || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      setSavedFlyers((prev) => [created, ...prev]);
      setSaving(false);
    } catch (err: any) {
      setError(err.message || 'Save failed');
      setSaving(false);
    }
  }, [state]);

  const deleteFlyer = async (id: string) => {
    try {
      const res = await fetch(`/api/saved-flyers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSavedFlyers((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  // ---- preview HTML (mirrors the tour flyer design) ----
  const flyerHtml = useCallback(() => {
    const s = state;
    const CW = (W - 72 - 20) / 2;
    const CH = 56;
    const heroImg = s.coverImage
      ? `<img src="${imageSrc(s.coverImage)}" style="width:100%;height:100%;object-fit:${s.imageFit ?? 'cover'};object-position:${imageObjectPosition({ ...s, imagePositionX: s.imagePositionX ?? 0, imagePositionY: s.imagePositionY ?? 0 })};transform:scale(${s.imageScale ?? 1});transform-origin:${imageTransformOrigin({ ...s, imagePositionX: s.imagePositionX ?? 0, imagePositionY: s.imagePositionY ?? 0 })};" />`
      : `<div style="width:100%;height:100%;background:#2B1B3D;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:14px;">Cover image</div>`;

    // Logo position: left | center | right
    const logoPos = s.logoPosition;
    const logoCSS =
      logoPos === 'right'
        ? `right:36px`
        : logoPos === 'center'
        ? `left:${(W - LOGO_SIZE) / 2}px`
        : 'left:36px';
    // Wordmark sits below the logo, aligned with it (left / centered / right).
    const textPosCSS =
      logoPos === 'right'
        ? `right:36px;text-align:right`
        : logoPos === 'center'
        ? `left:${(W - LOGO_SIZE) / 2}px;text-align:center`
        : 'left:36px;text-align:left';

    // Text block anchor (top or bottom of hero) and horizontal side
    const isTop = s.textPosition.startsWith('top');
    const isRight = s.textPosition.endsWith('Right');
    const tHPos = isRight ? `right:36px;text-align:right` : 'left:36px';
    const h1T = textTop(s.textPosition);
    const h2T = textTop2(s.textPosition);
    const sT = textTopSub(s.textPosition);

    const cardRows: string[] = [];
    // 2-column wrap: as many rows as needed for the number of cards
    const rows = Math.ceil(s.highlights.length / 2);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 2; col++) {
        const i = row * 2 + col;
        if (i >= s.highlights.length) continue;
        const h = s.highlights[i];
        const x = 36 + col * (CW + 20);
        const y = 470 + row * (CH + 10);
        cardRows.push(`
          <div style="position:absolute;left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;background:#fff;border-radius:8px;overflow:hidden;">
            <div style="position:absolute;left:0;top:0;width:6px;height:${CH}px;background:${GOLD};border-radius:3px 0 0 3px;"></div>
            <div style="position:absolute;left:20px;top:${CH - 48}px;font-family:Helvetica-Bold;font-size:12.5px;color:${GREEN};">${h.title}</div>
            <div style="position:absolute;left:20px;top:${CH - 28}px;width:${CW - 30}px;font-family:Helvetica;font-size:9.5px;color:${BODY};line-height:12px;overflow:hidden;max-height:24px;">${h.description}</div>
          </div>
        `);
      }
    }

    return `
      <div style="width:${W}px;height:${H}px;background:${SAND};font-family:'Segoe UI',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:100%;height:62px;background:rgba(0,0,0,0.28);"></div>
        <div style="position:absolute;${logoCSS};top:8px;width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;border-radius:23px;overflow:hidden;background:${DARK};display:flex;align-items:center;justify-content:center;z-index:2;">
          ${logoSrc ? `<img src="${logoSrc}" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-family:Helvetica-Bold;font-size:14px;color:#fff;">JT</span>`}
        </div>
        <div style="position:absolute;${textPosCSS};top:${LOGO_SIZE + 12}px;font-family:Helvetica-Bold;font-size:10px;color:#fff;z-index:2;">
          JAE TRAVEL EXPEDITIONS
        </div>
        <div style="position:absolute;top:0;left:0;width:100%;height:${HERO_HEIGHT}px;">${heroImg}</div>
        <div style="position:absolute;top:${topForBaseline(h1T, 36)}px;${tHPos};font-family:Helvetica-Bold;font-size:36px;color:#fff;max-width:${W - 72}px;z-index:2;">${s.headline1}</div>
        <div style="position:absolute;top:${topForBaseline(h2T, 36)}px;${tHPos};font-family:Helvetica-Bold;font-size:36px;color:${GOLD};max-width:${W - 72}px;z-index:2;">${s.headline2}</div>
        <div style="position:absolute;top:${topForBaseline(sT, 11)}px;${tHPos};font-family:Helvetica;font-size:11px;color:#fff;max-width:${W - 76}px;z-index:2;">${s.subtitle}</div>
        <div style="position:absolute;top:410px;left:36px;font-family:Helvetica-Bold;font-size:20px;color:${GREEN};">What's included</div>
        <div style="position:absolute;top:435px;left:36px;width:54px;height:3.5px;background:${GOLD};"></div>
        ${cardRows.join('')}
        <div style="position:absolute;top:620px;left:36px;width:${W - 72}px;height:74px;background:${GREEN};border-radius:10px;"></div>
        <div style="position:absolute;top:634px;left:54px;font-family:Helvetica-Bold;font-size:16px;color:${GOLD};">Secure your adventure</div>
        <div style="position:absolute;top:654px;left:54px;font-family:Helvetica;font-size:11px;color:#fff;">A 30% non-refundable deposit confirms your booking.</div>
        <div style="position:absolute;top:670px;left:54px;font-family:Helvetica;font-size:11px;color:#fff;">Contact us for dates, group rates and custom quotes.</div>
        <div style="position:absolute;top:634px;left:${W - 36 - 118}px;width:100px;height:34px;background:${ORANGE};border-radius:17px;display:flex;align-items:center;justify-content:center;">
          <span style="font-family:Helvetica-Bold;font-size:12px;color:#fff;">BOOK NOW</span>
        </div>
        <div style="position:absolute;top:795px;left:36px;width:${W - 72}px;height:1.2px;background:${GOLD};"></div>
        <div style="position:absolute;top:778px;left:36px;font-family:Helvetica-Bold;font-size:10.5px;color:${GREEN};">Phone:  ${s.phone}</div>
        <div style="position:absolute;top:794px;left:36px;font-family:Helvetica-Bold;font-size:10.5px;color:${GREEN};">Email:   ${s.email}</div>
        <div style="position:absolute;top:778px;left:${W / 2 + 10}px;font-family:Helvetica-Bold;font-size:10.5px;color:${GREEN};">Web:  ${s.website}</div>
        ${s.social ? `<div style="position:absolute;top:794px;left:${W / 2 + 10}px;font-family:Helvetica-Bold;font-size:10.5px;color:${GREEN};">Social:  ${s.social}</div>` : ''}
        <div style="position:absolute;top:811px;left:0;width:100%;text-align:center;font-family:Helvetica-Oblique;font-size:9px;color:${BODY};">Jae Travel Expeditions  •  ${s.social}</div>
      </div>
    `;
  }, [state, imageSrc, logoSrc]);

  // ---- react-pdf document mirroring the tour flyer (baseline-corrected positions) ----
  const buildPdfDoc = (s: FlyerState = state) => {
    const cards: any[] = [];
    const isRight = s.textPosition.endsWith('Right');
    const isTop = s.textPosition.startsWith('top');
    const textStyle = (baseline: number, fontSize: number, x: number) => ({
      top: topForBaseline(baseline, fontSize),
      ...(isRight ? { right: x, textAlign: 'right' } : { left: x }),
    });

    const h1T = textTop(s.textPosition);
    const h2T = textTop2(s.textPosition);
    const sT = textTopSub(s.textPosition);

    // 2-column wrap: as many rows as needed for the number of cards
    const rows = Math.ceil(s.highlights.length / 2);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 2; col++) {
        const i = row * 2 + col;
        if (i >= s.highlights.length) continue;
        const h = s.highlights[i];
        const x = 36 + col * (CW + 20);
        const y = Y0 - 30 - CH - row * (CH + 10); // bottom-left origin of card
        cards.push(
          <View key={`card-bg-${i}`} style={[pdfStyles.card, { top: topFromY(y, CH), left: x, width: CW, height: CH }]} />,
          <View key={`card-accent-${i}`} style={[pdfStyles.cardAccent, { top: topFromY(y, CH), left: x, width: 6, height: CH }]} />,
          <View key={`card-title-${i}`} style={[pdfStyles.cardTitle, { top: topFromY(y + CH - 20, 12.5), left: x + 18 }]}>
            <Text>{h.title}</Text>
          </View>,
          <View key={`card-desc-${i}`} style={[pdfStyles.cardDesc, { top: topForBaseline(H - (y + CH - 34), 9.5), left: x + 18, width: CW - 30, maxHeight: 24 }]}>
            <Text>{h.description}</Text>
          </View>,
        );
      }
    }

    const logoPos = s.logoPosition;
    const logoCSS =
      logoPos === 'right'
        ? { right: 36 }
        : logoPos === 'center'
        ? { left: (W - LOGO_SIZE) / 2 }
        : { left: 36 };
    const textPosCSS =
      logoPos === 'right'
        ? { right: 36 }
        : logoPos === 'center'
        ? { left: (W - LOGO_SIZE) / 2 }
        : { left: 36 };

    return (
      <Document>
        <Page size="A4" style={pdfStyles.page}>
          {s.coverImage ? (
            <View style={pdfStyles.hero}>
              <PdfImage src={imageSrc(s.coverImage)} style={{ width: '100%', height: '100%', objectFit: s.imageFit ?? 'cover', objectPosition: imageObjectPosition(s), transform: [{ scale: s.imageScale ?? 1 }] } as any} />
            </View>
          ) : null}
          {/* Logo (public/logo.jpg) + wordmark */}
          <View style={{ position: 'absolute', top: 8, ...logoCSS, width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 23, overflow: 'hidden', backgroundColor: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            {(() => {
              const src = logoSrc || publicLogo() || loadLogoSync();
              return src ? (
                <PdfImage src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, color: '#ffffff' }}>JT</Text>
              );
            })()}
          </View>
          <View style={{ position: 'absolute', top: LOGO_SIZE + 12, ...textPosCSS, fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#ffffff', zIndex: 2 }}>
            <Text style={{ textAlign: logoPos === 'right' ? 'right' : logoPos === 'center' ? 'center' : 'left' }}>JAE TRAVEL EXPEDITIONS</Text>
          </View>
          <View style={[pdfStyles.headline1, textStyle(h1T, 36, 36)]}>
            <Text>{s.headline1}</Text>
          </View>
          <View style={[pdfStyles.headline2, textStyle(h2T, 36, 36)]}>
            <Text>{s.headline2}</Text>
          </View>
          <View style={[pdfStyles.subtitle, textStyle(sT, 11, 38)]}>
            <Text>{s.subtitle}</Text>
          </View>
          <View style={[pdfStyles.section, { top: topForBaseline(410.4, 20), left: 36 }]}>
            <Text>What's included</Text>
          </View>
          <View style={[pdfStyles.sectionUnderline, { top: topFromY(Y0 - 9, 3.5), left: 36, width: 54 }]} />
          {cards}
          <View style={[pdfStyles.banner, { top: topFromY(BY, 74), left: 36, width: W - 72, height: 74 }]} />
          <View style={[pdfStyles.bannerTitle, { top: topForBaseline(681.9, 16), left: 54 }]}>
            <Text>Secure your adventure</Text>
          </View>
          <View style={[pdfStyles.bannerLine1, { top: topForBaseline(701.9, 11), left: 54 }]}>
            <Text>A 30% non-refundable deposit confirms your booking.</Text>
          </View>
          <View style={[pdfStyles.bannerLine2, { top: topForBaseline(717.9, 11), left: 54 }]}>
            <Text>Contact us for dates, group rates and custom quotes.</Text>
          </View>
          <View style={[pdfStyles.bannerButton, { top: topFromY(BY + 20, 34), left: W - 36 - 118, width: 100, height: 34 }]}>
            <Text style={pdfStyles.bannerButtonText}>BOOK NOW</Text>
          </View>
          <View style={[pdfStyles.footerDivider, { top: topFromY(46, 1.2), left: 36 }]} />
          <View style={[pdfStyles.footerText, { top: topForBaseline(763.9, 10.5), left: 36 }]}>
            <Text>Phone:  {s.phone}</Text>
          </View>
          <View style={[pdfStyles.footerText, { top: topForBaseline(779.9, 10.5), left: 36 }]}>
            <Text>Email:   {s.email}</Text>
          </View>
          <View style={[pdfStyles.footerText, { top: topForBaseline(763.9, 10.5), left: W / 2 + 10 }]}>
            <Text>Web:  {s.website}</Text>
          </View>
          {s.social && (
            <View style={[pdfStyles.footerText, { top: topForBaseline(779.9, 10.5), left: W / 2 + 10 }]}>
              <Text>Social:  {s.social}</Text>
            </View>
          )}
          <View style={[pdfStyles.footerCenter, { top: topForBaseline(811.9, 9) }]}>
            <Text>Jae Travel Expeditions  •  {s.social}</Text>
          </View>
        </Page>
      </Document>
    );
  };

  // Hydrate a saved flyer record into a FlyerState for PDF rendering
  const hydrateSaved = (f: any): FlyerState => {
    const s: FlyerState = { ...DEFAULT_STATE };
    try {
      const parsed = f.body ? JSON.parse(f.body) : {};
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(s, parsed);
      }
    } catch {}
    s.coverImage = f.selectedImage || null;
    s.headline1 = f.title || s.headline1;
    s.headline2 = f.subtitle || s.headline2;
    s.textPosition = f.textPosition ?? s.textPosition;
    // keep whatever number of cards was saved (no fixed 6)
    return s;
  };

  if (error) {
    return <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flyer Builder</h1>
          <p className="text-gray-500 text-sm">Design tour flyers matching the Jae_Travel_Tour_Flier layout</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadLink document={buildPdfDoc()} fileName={`flyer-${slugify(state.headline1)}.pdf`}>
            {({ loading: isLoading }) => (
              <button disabled={isLoading} className={`btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
        <div className="lg:col-span-4 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)] pr-2">
          {/* Cover image */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">Cover Image</h2>
              <button
                onClick={() => setLoading(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
                disabled={loading}
              >
                {loading ? '⟳' : 'Refresh'}
              </button>
            </div>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400 text-xs">Loading images…</div>
            ) : images.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
                No images in library.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => selectImage(img)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer ${
                      state.coverImage?.id === img.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={imageSrc(img)} alt={img.filename} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                      {img.filename.split('.').slice(0, -1).join('.') || img.filename}
                    </div>
                    {state.coverImage?.id === img.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/40">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {state.coverImage && (
              <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-700">Selected:</span>
                  <button onClick={removeImage} className="text-xs text-orange-500 hover:text-orange-700 underline">
                    Remove
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <img src={imageSrc(state.coverImage)} alt={state.coverImage.filename} className="w-8 h-8 rounded object-cover" />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">{state.coverImage.filename}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="cursor-pointer block w-full">
                <Plus size={14} className="mr-1" />
                Upload Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-[10px] text-orange-500 animate-pulse">Uploading…</span>}
            </div>
            <p className="text-[10px] text-gray-400">JPG/PNG/WEBP — max 10 MB</p>
          </div>

          {/* Image placement controls — move, zoom, stretch, crop */}
          {state.coverImage && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-800 text-sm">Image Placement</h2>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 block">Fit (stretch / crop)</label>
                <select
                  className="input w-full text-sm"
                  value={state.imageFit}
                  onChange={(e) => setField('imageFit', e.target.value as any)}
                >
                  <option value="cover">Cover (fill, may crop)</option>
                  <option value="contain">Contain (full image, may show edges)</option>
                  <option value="fill">Fill (stretch to fit)</option>
                  <option value="none">None (original size)</option>
                </select>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>Zoom</span>
                    <span className="text-[10px] text-gray-400">{Math.round(state.imageScale * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={Math.round(state.imageScale * 100)}
                    onChange={(e) => setField('imageScale', Number(e.target.value) / 100)}
                    className="w-full accent-orange-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>Position X (left/right)</span>
                    <span className="text-[10px] text-gray-400">{Math.round(state.imagePositionX * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="10"
                    value={Math.round(state.imagePositionX * 100)}
                    onChange={(e) => setField('imagePositionX', Number(e.target.value) / 100)}
                    className="w-full accent-orange-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>Position Y (up/down)</span>
                    <span className="text-[10px] text-gray-400">{Math.round(state.imagePositionY * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="10"
                    value={Math.round(state.imagePositionY * 100)}
                    onChange={(e) => setField('imagePositionY', Number(e.target.value) / 100)}
                    className="w-full accent-orange-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Headlines */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Headlines</h2>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Headline line 1 *</label>
              <input
                className="input w-full text-sm"
                value={state.headline1}
                onChange={(e) => setField('headline1', e.target.value)}
                placeholder="Your Safari"
              />
              <label className="text-xs text-gray-500 block">Headline line 2 *</label>
              <input
                className="input w-full text-sm"
                value={state.headline2}
                onChange={(e) => setField('headline2', e.target.value)}
                placeholder="Adventure Awaits"
              />
              <label className="text-xs text-gray-500 block">Subtitle</label>
              <span className="text-xs text-gray-400">{state.subtitle.length} / 70</span>
              <textarea
                className="input w-full text-sm"
                value={state.subtitle}
                onChange={(e) => setField('subtitle', e.target.value)}
                rows={2}
                maxLength={70}
                placeholder="Guided tours into the heart of the wild"
              />
              <label className="text-xs text-gray-500 block">Text position</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setField('textPosition', 'topLeft')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.textPosition === 'topLeft' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Top Left
                </button>
                <button
                  onClick={() => setField('textPosition', 'topRight')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.textPosition === 'topRight' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Top Right
                </button>
                <button
                  onClick={() => setField('textPosition', 'bottomLeft')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.textPosition === 'bottomLeft' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Bottom Left
                </button>
                <button
                  onClick={() => setField('textPosition', 'bottomRight')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.textPosition === 'bottomRight' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Bottom Right
                </button>
              </div>
              <label className="text-xs text-gray-500 block mt-2">Logo position</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setField('logoPosition', 'left')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.logoPosition === 'left' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Left
                </button>
                <button
                  onClick={() => setField('logoPosition', 'center')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.logoPosition === 'center' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Center
                </button>
                <button
                  onClick={() => setField('logoPosition', 'right')}
                  className={`text-xs rounded border px-2 py-2 text-left ${state.logoPosition === 'right' ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' : 'border-transparent hover:border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  Right
                </button>
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Highlights</h2>
            <p className="text-xs text-gray-400 mb-3">
              Title up to 24 chars · Description up to 95 chars · add as many cards as you like
            </p>
            <div className="grid grid-cols-2 gap-3">
              {state.highlights.map((h, i) => (
                <div key={i} className="space-y-2 p-2 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-baseline">
                    <label className="label text-xs">Card #{i + 1}</label>
                    <span className="text-xs text-gray-400">{h.title.length} / 24</span>
                    <button
                      onClick={() => removeCard(i)}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                      title="Delete card"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    value={h.title}
                    onChange={(e) => setHighlight(i, 'title', e.target.value)}
                    className="input text-sm"
                    maxLength={24}
                    placeholder="Game drives"
                  />
                  <label className="label text-xs mt-1">Description</label>
                  <textarea
                    value={h.description}
                    onChange={(e) => setHighlight(i, 'description', e.target.value)}
                    className="input h-20 resize-none"
                    maxLength={95}
                    placeholder="Sunrise drives…"
                  />
                  <span className="text-xs text-gray-400">{h.description.length} / 95</span>
                </div>
              ))}
              {state.highlights.length === 0 && (
                <p className="col-span-2 text-xs text-gray-400 text-center py-4">
                  No cards yet — add one below.
                </p>
              )}
            </div>
            <button
              onClick={addCard}
              className="text-xs flex items-center justify-center w-full gap-1 border border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <Plus size={12} /> Add highlight card
            </button>
          </div>

          {/* Contact */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Contact</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block">Phone</label>
                  <input className="input w-full text-sm" value={state.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+254 726 485228" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Email</label>
                  <input className="input w-full text-sm" value={state.email} onChange={(e) => setField('email', e.target.value)} placeholder="info@jaetravel.co.ke" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block">Website</label>
                  <input className="input w-full text-sm" value={state.website} onChange={(e) => setField('website', e.target.value)} placeholder="www.jaetravel.co.ke" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Social</label>
                  <input className="input w-full text-sm" value={state.social} onChange={(e) => setField('social', e.target.value)} placeholder="@JaeTravelExpeditions" />
                </div>
              </div>
            </div>
          </div>

          <button onClick={saveFlyer} disabled={saving} className="w-full btn-secondary text-xs mt-3">
            {saving ? 'Saving…' : 'Save Flyer'}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">Preview</h2>
            <span className="text-xs text-gray-400">A4 · matches Jae_Travel_Tour_Flier</span>
          </div>
          <div className="flex-1 relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" dangerouslySetInnerHTML={{ __html: flyerHtml() }} />
        </div>

        {/* Bottom: Saved Flyers gallery */}
        {savedFlyers.length > 0 && (
          <div className="lg:col-span-12">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">Saved Flyers</h2>
                <button onClick={() => setSavedFlyers([])} className="text-xs text-red-500 hover:text-red-700 underline">
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {savedFlyers.map((f) => {
                  const parsed = (() => {
                    try { return f.body ? JSON.parse(f.body) : {}; } catch { return {}; }
                  })();
                  const cover = f.selectedImage || null;
                  const hs = hydrateSaved(f);
                  return (
                    <div key={f.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="relative h-32 mb-2 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        {cover ? (
                          <img src={imageSrc(cover)} alt="flyer" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[10px] text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{f.title || hs.headline1 || 'Untitled'}</span>
                        <span className="text-[10px] text-gray-400">A4</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadSaved(f)}
                          className="text-xs flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-center hover:bg-gray-50"
                        >
                          Load
                        </button>
                        <PDFDownloadLink document={buildPdfDoc(hs)} fileName={`flyer-${slugify(f.title || hs.headline1 || 'tour')}.pdf`}>
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

  function slugify(v: string): string {
    return String(v || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'tour_flyer';
  }
}
