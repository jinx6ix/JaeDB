'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, Save, Trash2 } from 'lucide-react';

const LOGO_URL = '/logo.jpg';

const ORANGE = '#FF7302';
const DEEP_ORANGE = '#C24F00';
const YELLOW = '#FFC21A';
const CHARCOAL = '#201E1F';
const GREY = '#6B6B6B';
const WHITE = '#ffffff';
const PAGE_BG = '#F5F0EA';

interface NewsImage { data: string | null; description: string; }

interface LibImage { id: string; filename: string; mimeType: string; data: string; caption?: string | null; createdAt: string; }

interface NewsState {
  announcementTitle: string;
  announcementSubtitle: string;
  heroImage: NewsImage;
  items: { id: string; title: string; text: string; image: NewsImage }[];
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
}

const DEFAULT_STATE: NewsState = {
  announcementTitle: '[Announcement title]',
  announcementSubtitle: '[Subtitle]',
  heroImage: { data: null, description: 'Sunset over the savannah with acacia trees' },
  items: [
    { id: '1', title: '[Tour / news title]', text: '[What to say — two or three sentences about this tour or announcement.]', image: { data: null, description: 'Image 1: [description]' } },
    { id: '2', title: '[Tour / news title]', text: '[What to say — two or three sentences about this tour or announcement.]', image: { data: null, description: 'Image 2: [description]' } },
    { id: '3', title: '[Tour / news title]', text: '[What to say — two or three sentences about this tour or announcement.]', image: { data: null, description: 'Image 3: [description]' } },
  ],
  contactEmail: 'marketing@jaetravel.co.ke',
  contactPhone: '+254 700 000000',
  contactWebsite: 'www.jaetravel.co.ke',
};

function escapeHtml(v: string): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Normalize stored image data (may already be a data URL) into a usable data URL.
function toDataUrl(mimeType: string, data: string): string {
  const clean = data.replace(/^data:image\/[^;]+;base64,/, '');
  return `data:${mimeType};base64,${clean}`;
}

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

function drawnBannerSvg(width: number, height: number): string {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bannerTitle"><title id="bannerTitle">Sunset and acacia banner</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${CHARCOAL}" />
      <stop offset="55%" stop-color="${ORANGE}" />
      <stop offset="100%" stop-color="${YELLOW}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sky)" />
  <circle cx="${width * 0.78}" cy="${height * 0.42}" r="${height * 0.22}" fill="${YELLOW}" opacity="0.95" />
  <circle cx="${width * 0.78}" cy="${height * 0.42}" r="${height * 0.22}" fill="${CHARCOAL}" opacity="0.18" />
  <g fill="${CHARCOAL}">
    <path d="M ${width * 0.12} ${height * 0.92} L ${width * 0.12} ${height * 0.62} L ${width * 0.16} ${height * 0.62} L ${width * 0.16} ${height * 0.92} Z" />
    <path d="M ${width * 0.10} ${height * 0.58} L ${width * 0.14} ${height * 0.42} L ${width * 0.18} ${height * 0.58} L ${width * 0.10} ${height * 0.58} Z" />
    <path d="M ${width * 0.08} ${height * 0.50} L ${width * 0.16} ${height * 0.34} L ${width * 0.24} ${height * 0.50} L ${width * 0.08} ${height * 0.50} Z" />
    <path d="M ${width * 0.06} ${height * 0.42} L ${width * 0.14} ${height * 0.26} L ${width * 0.22} ${height * 0.42} L ${width * 0.06} ${height * 0.42} Z" />
    <path d="M ${width * 0.82} ${height * 0.92} L ${width * 0.82} ${height * 0.64} L ${width * 0.86} ${height * 0.64} L ${width * 0.86} ${height * 0.92} Z" />
    <path d="M ${width * 0.80} ${height * 0.60} L ${width * 0.84} ${height * 0.44} L ${width * 0.88} ${height * 0.60} L ${width * 0.80} ${height * 0.60} Z" />
    <path d="M ${width * 0.78} ${height * 0.52} L ${width * 0.86} ${height * 0.36} L ${width * 0.94} ${height * 0.52} L ${width * 0.78} ${height * 0.52} Z" />
    <path d="M ${width * 0.76} ${height * 0.44} L ${width * 0.84} ${height * 0.28} L ${width * 0.92} ${height * 0.44} L ${width * 0.76} ${height * 0.44} Z" />
  </g>
</svg>`;
}

export default function NewsLetterPage() {
  const [state, setState] = useState<NewsState>(DEFAULT_STATE);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<LibImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [savedNewsletters, setSavedNewsletters] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  // Tracks which library image is selected per target: key 'hero' or a block id
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<Record<string, string>>({});

  const setField = <K extends keyof NewsState>(k: K, v: NewsState[K]) =>
    setState((prev) => ({ ...prev, [k]: v }));

  const setItemField = (id: string, k: keyof NewsState['items'][number], v: any) =>
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)),
    }));

  const setItemImageField = (id: string, k: 'data' | 'description', v: string) =>
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === id ? { ...it, image: { ...it.image, [k]: v } } : it
      ),
    }));

  const hydrateFrom = useCallback((n: any) => {
    try {
      const next: NewsState = { ...DEFAULT_STATE };
      if (n.announcementTitle) next.announcementTitle = n.announcementTitle;
      if (n.announcementSubtitle) next.announcementSubtitle = n.announcementSubtitle;
      if (n.heroImage) next.heroImage = typeof n.heroImage === 'string' ? JSON.parse(n.heroImage) : n.heroImage;
      if (n.items) {
        const parsed = typeof n.items === 'string' ? JSON.parse(n.items) : n.items;
        next.items = Array.isArray(parsed) ? parsed : next.items;
      }
      if (n.contactEmail) next.contactEmail = n.contactEmail;
      if (n.contactPhone) next.contactPhone = n.contactPhone;
      if (n.contactWebsite) next.contactWebsite = n.contactWebsite;
      setState(next);
      setError('');
    } catch {
      setError('Failed to load that newsletter');
    }
  }, []);

  const loadSaved = (n: any) => hydrateFrom(n);

  const deleteSaved = async (id: string) => {
    if (!confirm('Delete this newsletter?')) return;
    try {
      const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSavedNewsletters((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  function useLibraryImage(img: LibImage, target: 'hero' | 'item', itemId?: string) {
    const data = toDataUrl(img.mimeType, img.data);
    if (target === 'hero') {
      setField('heroImage', { data, description: img.filename });
      setSelectedLibraryImage(prev => ({ ...prev, hero: img.id }));
    } else if (itemId) {
      setItemImageField(itemId, 'data', data);
      setSelectedLibraryImage(prev => ({ ...prev, [itemId]: img.id }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LOGO_URL);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          if (!cancelled) setLogoSrc(`data:image/jpeg;base64,${btoa(binary)}`);
        }
      } catch {
        /* logo unavailable; falls back to text mark */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- load existing image library (for picking into newsletter) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setImagesLoading(true);
      try {
        const res = await fetch('/api/itinerary-images');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setImages(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- load saved newsletters from DB ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSavedLoading(true);
      try {
        const res = await fetch('/api/newsletters');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSavedNewsletters(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleImageUpload(file: File, target: 'hero' | 'item', itemId?: string) {
    try {
      const data = await convertToJpegBase64(file);
      if (target === 'hero') {
        setField('heroImage', { data, description: file.name.replace(/\.[^/.]+$/, '') });
      } else if (itemId) {
        setItemImageField(itemId, 'data', data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    }
  }

  function addItem() {
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: String(Date.now()),
          title: '[Tour / news title]',
          text: '[What to say — two or three sentences about this tour or announcement.]',
          image: { data: null, description: `Image ${prev.items.length + 1}: [description]` },
        },
      ],
    }));
  }

  function removeItem(id: string) {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  }

  function generateHtml(): string {
    const logo = logoSrc || '';
    const title = escapeHtml(state.announcementTitle);
    const subtitle = escapeHtml(state.announcementSubtitle);
    const hero = state.heroImage;
    const items = state.items;

    const heroImgHtml = hero.data
      ? `<img src="${hero.data}" alt="${escapeHtml(hero.description || 'Hero image')}" class="hero-image" style="width:100%;max-width:640px;height:auto;max-height:300px;object-fit:contain;display:block;margin:0 auto;" />`
      : drawnBannerSvg(640, 300);

    const blocksHtml = items
      .map((it, idx) => {
        const reverse = idx % 2 === 1;
        const imgHtml = it.image.data
          ? `<img src="${it.image.data}" alt="${escapeHtml(it.title)}" class="block-image" style="width:100%;max-width:260px;height:auto;max-height:180px;object-fit:contain;display:block;margin:0 auto;" />`
          : `<div class="block-placeholder">${escapeHtml(it.image.description || `Image ${idx + 1}: [description]`)}</div>`;
        const dirClass = reverse ? 'block reverse' : 'block';
        return `
<div class="${dirClass}">
  <div class="block-image-wrap">${imgHtml}</div>
  <div class="block-text">
    <h3>${escapeHtml(it.title)}</h3>
    <p>${escapeHtml(it.text).replace(/\n/g, '<br>')}</p>
    <a href="#" class="small-link">Read more &rarr;</a>
  </div>
</div>`;
      })
      .join('');

    const closingCopy = `Book your next safari with us — departures available year-round, expert guides, and the 30% deposit secures your place.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title} &mdash; Jae Travel Expeditions</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    margin: 0; padding: 0;
    background: {PAGE_BG};
    color: {CHARCOAL};
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 15px;
    line-height: 1.62;
    -webkit-text-size-adjust: 100%;
  }}
  .page {{
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 12px;
    background: {PAGE_BG};
  }}
  .email {{
    width: 100%;
    max-width: 640px;
    background: {WHITE};
    border: 1px solid #e8e0d6;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}
  .email-inner {{ padding: 24px 28px 28px; }}
  .view-browser {{
    display: block;
    text-align: center;
    font-size: 11px;
    color: {GREY};
    text-decoration: underline;
    margin-bottom: 16px;
  }}
  .view-browser:focus {{ outline: 2px solid {ORANGE}; outline-offset: 2px; color: {CHARCOAL}; }}
  .logo-wrap {{
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
  }}
  .logo {{
    width: 64px;
    height: 64px;
    min-width: 64px;
    min-height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid {WHITE};
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    display: block;
    max-width: 100%;
  }}
  .logo-fallback {{
    width: 64px;
    height: 64px;
    min-width: 64px;
    min-height: 64px;
    border-radius: 50%;
    background: {ORANGE};
    color: {WHITE};
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 16px;
    border: 2px solid {WHITE};
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    max-width: 100%;
  }}
  .menu {{
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }}
  .menu a {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: {CHARCOAL};
    text-decoration: none;
    padding: 4px 8px;
    border-radius: 4px;
  }}
  .menu a:focus, .menu a:hover {{ outline: 2px solid {ORANGE}; outline-offset: 2px; color: {ORANGE}; }}
  .hero {{
    position: relative;
    width: 100%;
    height: 180px;
    margin-bottom: 22px;
    overflow: hidden;
    border-radius: 8px;
    background: #e8e0d6;
  }}
  .hero-image {{
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    background: #e8e0d6;
    display: block;
    margin: 0 auto;
  }}
  .hero-text {{
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 16px;
    text-align: center;
    color: {WHITE};
    text-shadow: 0 1px 3px rgba(0,0,0,0.45);
  }}
  .hero-text .kicker {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: {YELLOW};
    margin-bottom: 6px;
  }}
  .hero-text h1 {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 26px;
    line-height: 1.25;
    margin: 0 0 8px;
    max-width: 520px;
  }}
  .hero-text p {{
    font-size: 14px;
    opacity: 0.95;
    max-width: 430px;
    margin: 0;
  }}
  .letter {{
    padding: 0 4px 22px;
    border-bottom: 1px solid #e8e0d6;
  }}
  .letter .salute {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 17px;
    margin-bottom: 14px;
  }}
  .letter p {{
    margin: 0 0 12px;
    max-width: 44ch;
    color: {CHARCOAL};
  }}
  .letter p:last-child {{ margin-bottom: 0; }}
  .main-button {{
    display: block;
    width: fit-content;
    margin: 24px auto 0;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    color: {WHITE};
    background: {CHARCOAL};
    border: none;
    border-radius: 6px;
    padding: 13px 26px;
    text-decoration: none;
    cursor: pointer;
  }}
  .main-button:focus {{ outline: 3px solid {ORANGE}; outline-offset: 3px; }}
  .main-button:hover {{ background: {CHARCOAL}; filter: brightness(1.06); }}
  .blocks {{ padding: 22px 0; }}
  .block {{
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid #e8e0d6;
  }}
  .block:last-child {{ border-bottom: none; }}
  @media (min-width: 521px) {{
    .block.reverse {{ flex-direction: row-reverse; }}
  }}
  .block-image-wrap {{
    flex: 0 0 42%;
    min-width: 0;
    background: #e8e0d6;
    border-radius: 6px;
    overflow: hidden;
    height: 140px;
  }}
  @media (max-width: 520px) {{
    .logo {{ width: 56px; height: 56px; min-width: 56px; min-height: 56px; }}
    .logo-fallback {{ width: 56px; height: 56px; min-width: 56px; min-height: 56px; font-size: 14px; }}
    .block {{ flex-direction: column; align-items: stretch; }}
    .block.reverse {{ flex-direction: column; }}
    .block-image-wrap {{ width: 100%; height: 200px; }}
  }}
  .block-image {{
    width: 100%;
    height: auto;
    max-height: 180px;
    object-fit: contain;
    background: #e8e0d6;
    display: block;
    margin: 0 auto;
  }}
  .block-placeholder {{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e8e0d6;
    color: {GREY};
    font-size: 11px;
    text-align: center;
    padding: 12px;
    border: 1px dashed {GREY};
    border-radius: 6px;
  }}
  .block-text {{ flex: 1; }}
  .block-text h3 {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 17px;
    margin: 0 0 6px;
    color: {CHARCOAL};
  }}
  .block-text p {{
    margin: 0 0 8px;
    max-width: 44ch;
    color: {CHARCOAL};
  }}
  .block-text p:last-child {{ margin-bottom: 0; }}
  .small-link {{
    display: inline-block;
    margin-top: 4px;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: {DEEP_ORANGE};
    text-decoration: none;
  }}
  .small-link:focus {{ outline: 2px solid {ORANGE}; outline-offset: 2px; }}
  .small-link:hover {{ color: {ORANGE}; text-decoration: underline; }}
  .closing {{
    background: {CHARCOAL};
    color: {YELLOW};
    padding: 26px 28px;
    text-align: center;
  }}
  .closing .tagline {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: {YELLOW};
    margin-bottom: 10px;
  }}
  .closing p {{
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 13px;
    opacity: 0.9;
    max-width: 44ch;
    margin: 0 auto 16px;
    line-height: 1.6;
  }}
  .discover {{
    display: inline-block;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: {WHITE};
    background: {ORANGE};
    border: none;
    border-radius: 6px;
    padding: 11px 24px;
    text-decoration: none;
    cursor: pointer;
  }}
  .discover:focus {{ outline: 3px solid {YELLOW}; outline-offset: 3px; }}
  .discover:hover {{ filter: brightness(1.1); }}
  .footer {{
    padding: 22px 28px;
    text-align: center;
    font-size: 11px;
    color: {GREY};
    border-top: 1px solid #e8e0d6;
  }}
  .footer .company {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700;
    font-size: 13px;
    color: {CHARCOAL};
    margin-bottom: 4px;
  }}
  .footer .rights {{ margin-bottom: 10px; }}
  .footer .contact {{ margin-bottom: 10px; }}
  .footer .contact b {{ color: {CHARCOAL}; font-weight: 600; }}
  .footer a {{
    color: {DEEP_ORANGE};
    text-decoration: underline;
    font-size: 11px;
  }}
  .footer a:focus {{ outline: 2px solid {ORANGE}; outline-offset: 2px; }}
  .footer a:hover {{ color: {ORANGE}; }}
  .footer .sep {{ margin: 0 6px; color: #c9c0b6; }}
  @media (max-width: 520px) {{
    .hero {{ height: 200px; }}
    .hero-text h1 {{ font-size: 20px; }}
    .email-inner {{ padding: 18px 20px 22px; }}
    .closing {{ padding: 22px 20px; }}
    .footer {{ padding: 18px 20px; }}
  }}
</style>
</head>
<body>
  <div class="page">
    <div class="email">
      <div class="email-inner">
        <a href="#" class="view-browser" tabindex="0">View in browser</a>
        <div class="logo-wrap">
          ${logo ? `<img src="${escapeHtml(logo)}" class="logo" width="64" height="64" alt="Jae Travel Expeditions logo" />` : `<div class="logo-fallback" style="width:64px;height:64px">JT</div>`}
        </div>
        <nav class="menu" aria-label="Main menu">
          <a href="#" tabindex="0">Tours</a>
          <span class="sep">·</span>
          <a href="#" tabindex="0">Experiences</a>
          <span class="sep">·</span>
          <a href="#" tabindex="0">Transport</a>
          <span class="sep">·</span>
          <a href="#" tabindex="0">Contact</a>
        </nav>
        <div class="hero">${heroImgHtml}
          <div class="hero-text">
            <span class="kicker">Jae Travel Expeditions</span>
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
        </div>
        <div class="letter">
          <p class="salute">Dear Travel Partner,&nbsp;</p>
          <p>We hope you are well. This note shares what&apos;s new with Jae Travel Expeditions and the tours we&apos;re most excited to send your way this season.</p>
          <p>From classic Big Five safaris to private family departures, each itinerary is built around real wildlife moments and the comfort your clients expect.</p>
          <p>Thank you for traveling with us. We look forward to welcoming your clients to the wild.</p>
        </div>
        <a href="#" class="main-button" tabindex="0">View all tours</a>
        <div class="blocks">${blocksHtml}</div>
        <div class="closing">
          <div class="tagline">Where the world meets the wild</div>
          <p>${escapeHtml(closingCopy)}</p>
          <a href="#" class="discover" tabindex="0">Discover</a>
        </div>
        <div class="footer">
          <div class="company">Jae Travel Expeditions</div>
          <div class="rights">&copy; Jae Travel Expeditions. All rights reserved.</div>
          <div class="contact">
            <b>Contact:</b>&nbsp;${escapeHtml(state.contactEmail)}
            <span class="sep">|</span>
            ${escapeHtml(state.contactPhone)}
            <span class="sep">|</span>
            ${escapeHtml(state.contactWebsite)}
          </div>
          <div class="prefs">
            <a href="#" tabindex="0">Unsubscribe</a>
            <span class="sep">|</span>
            <a href="#" tabindex="0">Manage preferences</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // ---- save newsletter to DB ----
  const saveNewsletter = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.announcementTitle || null,
          subtitle: state.announcementSubtitle || null,
          announcementTitle: state.announcementTitle || null,
          announcementSubtitle: state.announcementSubtitle || null,
          body: generateHtml(),
          heroImage: state.heroImage,
          items: state.items,
          contactEmail: state.contactEmail || null,
          contactPhone: state.contactPhone || null,
          contactWebsite: state.contactWebsite || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      setSavedNewsletters((prev) => [created, ...prev]);
      setError('Saved to database');
      setTimeout(() => setError(''), 2500);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [state, generateHtml]);

  function downloadHtml() {
    const html = generateHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jae-travel-newsletter.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setError('');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Build a self-contained "Dear Travel Partner" trade email. Download as HTML.</p>
        </div>
        <div className="flex gap-2">
          {loading ? (
            <span className="text-xs text-gray-400 flex items-center gap-1">Loading logo…</span>
          ) : null}
          <button onClick={downloadHtml} disabled={saving} className="btn-primary">
            {saving ? 'Building…' : <><Download size={16} /> Download HTML</>}
          </button>
          <button onClick={saveNewsletter} disabled={saving} className="btn-secondary">
            {saving ? 'Saving…' : <><Save size={16} /> Save to DB</>}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: controls */}
        <div className="lg:col-span-4 space-y-5 max-h-[calc(100vh-150px)] overflow-y-auto pr-2">
          <div className="card p-4 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Newsletter details</h2>
            <div className="space-y-3">
              <label className="label text-xs">Announcement title *</label>
              <input required className="input w-full text-sm" value={state.announcementTitle} onChange={(e) => setField('announcementTitle', e.target.value)} placeholder="e.g. New safari season opens" />
              <label className="label text-xs">Subtitle</label>
              <input className="input w-full text-sm" value={state.announcementSubtitle} onChange={(e) => setField('announcementSubtitle', e.target.value)} placeholder="e.g. What&apos;s new this season" />
            </div>
            <div className="space-y-3">
              <label className="label text-xs">Hero banner image</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'hero')} className="flex-1 block w-full text-xs text-gray-500" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs px-3">Upload</button>
                </div>
                {images.length > 0 && (
                  <>
                    <label className="label text-xs">Or choose from library</label>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded bg-gray-50 p-1">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => useLibraryImage(img, 'hero')}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer w-16 h-16 max-w-none max-h-none ${
                          selectedLibraryImage.hero === img.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-300'
                        }`}
                        aria-label={img.filename}
                      >
                        <img
                          src={toDataUrl(img.mimeType, img.data)}
                          alt={img.filename}
                          className="max-w-full max-h-full object-contain p-1"
                        />
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                          {img.filename.split('.').slice(0, -1).join('.') || img.filename}
                        </div>
                        {selectedLibraryImage.hero === img.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/40">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                    </div>
                  </>
                )}
                {state.heroImage.data && <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{state.heroImage.description}</span>}
              </div>
              <p className="text-[10px] text-gray-400">Falls back to a drawn sunset-and-acacia banner in logo colours.</p>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Content blocks</h2>
            <p className="text-[10px] text-gray-400">Items render in order. Each block pairs an image (16:9) with a text block.</p>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded bg-gray-50 p-2 space-y-2">
              {state.items.map((it) => (
                <div key={it.id} className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label text-xs">Block title</label>
                  <button type="button" onClick={() => removeItem(it.id)} className="text-[10px] text-red-500 hover:text-red-700 underline">Remove</button>
                </div>
                <input className="input w-full text-sm" value={it.title} onChange={(e) => setItemField(it.id, 'title', e.target.value)} placeholder="[Tour / news title]" />
                <label className="label text-xs">Text (2&ndash;3 sentences)</label>
                <textarea className="input w-full text-sm resize-none" rows={3} value={it.text} onChange={(e) => setItemField(it.id, 'text', e.target.value)} placeholder="[What to say&hellip;]" />
                <div className="space-y-2">
                  <label className="label text-xs">Image</label>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'item', it.id)} className="flex-1 block w-full text-xs text-gray-500" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs px-3">Upload</button>
                    </div>
                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded bg-gray-50 p-1">
                        {images.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => useLibraryImage(img, 'item', it.id)}
                            className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer w-16 h-16 max-w-none max-h-none ${
                              selectedLibraryImage[it.id] === img.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-300'
                            }`}
                            aria-label={img.filename}
                          >
                            <img
                              src={toDataUrl(img.mimeType, img.data)}
                              alt={img.filename}
                              className="max-w-full max-h-full object-contain p-1"
                            />
                            <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                              {img.filename.split('.').slice(0, -1).join('.') || img.filename}
                            </div>
                            {selectedLibraryImage[it.id] === img.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500/40">
                                <span className="text-white text-sm font-bold">✓</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {it.image.data ? (
                    <span className="text-[10px] text-gray-500 truncate max-w-[120px]">Image set</span>
                  ) : (
                    <span className="text-[10px] text-gray-500 italic">{it.image.description}</span>
                  )}
                </div>
              </div>
            ))}
            </div>
            <button type="button" onClick={addItem} className="w-full text-xs flex items-center justify-center w-full gap-1 border border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-orange-600 transition-colors">
              <Plus size={12} /> Add content block
            </button>
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Contact</h2>
            <div className="space-y-3">
              <label className="label text-xs">Email</label>
              <input className="input w-full text-sm" value={state.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} placeholder="reservations@jaetravel.co.ke" />
              <label className="label text-xs">Phone</label>
              <input className="input w-full text-sm" value={state.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} placeholder="+254 700 000000" />
              <label className="label text-xs">Website</label>
              <input className="input w-full text-sm" value={state.contactWebsite} onChange={(e) => setField('contactWebsite', e.target.value)} placeholder="www.jaetravel.co.ke" />
            </div>
            <p className="text-[10px] text-gray-500">Deposit note (fixed): 30% non-refundable deposit; balance and full terms come with the booking confirmation.</p>
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Saved newsletters</h2>
            {savedLoading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : savedNewsletters.length === 0 ? (
              <p className="text-xs text-gray-400">None saved yet.</p>
            ) : (
              <div className="space-y-2">
                {savedNewsletters.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">{n.title || n.subtitle || 'Untitled'}</div>
                      <div className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadSaved(n)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 underline px-2 py-1"
                      >
                        Load
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSaved(n.id); }}
                        className="text-[10px] text-red-500 hover:text-red-700 underline px-2 py-1"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-8 flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Preview</h2>
            <span className="text-xs text-gray-400">640px max &middot; self-contained HTML</span>
          </div>
          <div className="flex-1 relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <iframe
              title="Newsletter preview"
              srcDoc={generateHtml()}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={saveNewsletter} disabled={saving} className="btn-secondary text-sm px-4">
              {saving ? 'Saving…' : <><Save size={14} /> Save to DB</>}
            </button>
            <button onClick={downloadHtml} disabled={saving} className="btn-primary">
              {saving ? 'Building…' : <><Download size={16} /> Download HTML</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
