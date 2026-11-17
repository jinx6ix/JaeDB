// lib/tour-flyer-pdf.tsx
// Tour flyer PDF layout for Jae Travel Expeditions.
// Follows the pattern of lib/itinerary-pdf.tsx:
//   @react-pdf/renderer, built-in Helvetica fonts, StyleSheet, data-URI images,
//   absolute positioning in points (bottom-left origin from spec -> top for react-pdf).
// One page, A4 (595.28 x 841.89 pt), no page padding.
/* eslint-disable react/display-name */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
  Svg,
  Rect,
  Circle,
  Ellipse,
  Polygon,
} from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

import { BRAND } from './brand.ts';

// ---------------------------------------------------------------------------
// Constants (A4 in points)
// ---------------------------------------------------------------------------
export const W = 595.28;
export const H = 841.89;

const GREEN = '#1F3D2B';
const GOLD = '#E8A33D';
const SAND = '#F6EBD7';
const ORANGE = '#D9622B';
const DARK = '#16241B';
const BODY = '#4A5A4F';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.jpg');

// ---------------------------------------------------------------------------
// Logo: read once, downscale to 256x256 with jimp, cache data URI in memory.
// The helper is synchronous (returns the cached original-resolution URI on the
// first call so a pure component can use it); the downscaled replacement is
// loaded asynchronously in the background and swaps into the cache on the next
// render. Returns null with a console warning if the file cannot be read.
// ---------------------------------------------------------------------------
let LOGO_SRC_CACHE: string | null = null;
let LOGO_LOADED = false;
let LOGO_PROMISE: Promise<void> | null = null;

async function loadLogoDownscaled(): Promise<void> {
  try {
    const { Jimp, JimpMime } = await import('jimp');
    const image = await Jimp.read(LOGO_PATH);
    image.resize({ w: 256, h: 256 });
    const buf = await image.getBuffer(JimpMime.jpeg);
    LOGO_SRC_CACHE = `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (err: unknown) {
    console.warn('[tour-flyer-pdf] Could not downscale public/logo.jpg:', err instanceof Error ? err.message : String(err));
  }
}

export function getLogoSrc(): string | null {
  if (LOGO_LOADED) return LOGO_SRC_CACHE;
  LOGO_LOADED = true;
  try {
    const buf = fs.readFileSync(LOGO_PATH);
    LOGO_SRC_CACHE = `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (err: unknown) {
    console.warn('[tour-flyer-pdf] Could not read public/logo.jpg:', err instanceof Error ? err.message : String(err));
    return null;
  }
  LOGO_PROMISE = loadLogoDownscaled();
  return LOGO_SRC_CACHE;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Convert spec bottom-left coordinates to react-pdf `top` (top-left origin).
export function topFromY(y: number, height: number): number {
  return H - y - height;
}
export function topFromBaseline(baseline: number): number {
  return H - baseline;
}

// Place absolutely-positioned text so its BASELINE sits `baselineFromTop` pt
// below the page top. react-pdf positions text by its top edge and the Helvetica
// baseline sits ~0.9 * fontSize below that edge, so we subtract it to hit the
// target baseline exactly (same top-edge method the card titles use, corrected
// for the baseline offset).
export function topForBaseline(baselineFromTop: number, fontSize: number): number {
  return baselineFromTop - 0.9 * fontSize;
}

// Rough Helvetica width estimate (points) for the shrink-to-fit rule.
// Helvetica average glyph width ≈ 0.5 * fontSize for mixed-case latin text.
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52;
}

// Shrink font size in steps of 1 down to `minSize` while the text exceeds maxWidth.
function fitFontSize(text: string, startSize: number, maxWidth: number, minSize: number): number {
  let size = startSize;
  while (size > minSize && estimateTextWidth(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

// Wrap text into at most 2 lines using the Helvetica width estimate. Used for
// card descriptions because react-pdf misplaces wrapped lines inside an
// absolutely-positioned container; we position every line explicitly instead.
function wrapToLines(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (!cur || estimateTextWidth(trial, fontSize) <= maxWidth) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= 2) break;
    }
  }
  if (cur && lines.length < 2) lines.push(cur);
  else if (cur && lines.length === 2) lines[1] = (lines[1] || '') + ' ' + cur;
  return lines;
}

// WinAnsi (Helvetica) drawability: allow printable ASCII + common control chars.
// Anything outside Latin-1 / CP1252 range cannot be drawn by built-in Helvetica.
function isWinAnsiDrawable(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  if (code === 0x0a || code === 0x09 || code === 0x0d) return true; // \n \t \r
  if (code < 0x20) return false;
  if (code <= 0xff) return true;
  switch (code) {
    case 0x00a0: // nbsp
    case 0x2013: // en dash
    case 0x2014: // em dash
    case 0x2018:
    case 0x2019:
    case 0x201c:
    case 0x201d:
    case 0x2022: // bullet
      return true;
    default:
      return false;
  }
}

export interface FlyerFieldProblem {
  field: string;
  problem: string;
}

export interface FlyerInput {
  headline1: string;
  headline2: string;
  subtitle: string;
  highlights: { title: string; description: string }[];
}

export function validateFlyerFields(input: FlyerInput): FlyerFieldProblem[] {
  const problems: FlyerFieldProblem[] = [];

  if (!input.headline1 || !input.headline1.trim()) {
    problems.push({ field: 'headline1', problem: 'Headline line 1 is required' });
  }
  if (!input.headline2 || !input.headline2.trim()) {
    problems.push({ field: 'headline2', problem: 'Headline line 2 is required' });
  }
  if (input.subtitle && input.subtitle.length > 70) {
    problems.push({ field: 'subtitle', problem: 'Subtitle exceeds 70 characters' });
  }
  if (!Array.isArray(input.highlights) || input.highlights.length !== 6) {
    problems.push({ field: 'highlights', problem: 'Exactly 6 highlights are required' });
  } else {
    input.highlights.forEach((h, i) => {
      if (h.title.length > 24) {
        problems.push({ field: `highlights[${i}].title`, problem: 'Title exceeds 24 characters' });
      }
      if (h.description.length > 95) {
        problems.push({ field: `highlights[${i}].description`, problem: 'Description exceeds 95 characters' });
      }
    });
  }

  const allText = [
    input.headline1,
    input.headline2,
    input.subtitle,
    ...input.highlights.map((h) => h.title + ' ' + h.description),
  ].join('');
  for (const ch of allText) {
    if (!isWinAnsiDrawable(ch)) {
      problems.push({
        field: 'text',
        problem: `Character not supported by Helvetica (WinAnsi): ${ch} (U+${codePointHex(ch)})`,
      });
      break; // report once
    }
  }

  return problems;
}

function codePointHex(ch: string): string {
  return ch.codePointAt(0)!.toString(16).toUpperCase();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S = StyleSheet.create({
  page: {
    backgroundColor: SAND,
  },
  // Hero rectangle (top 44% of page)
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H * 0.44,
    overflow: 'hidden',
  } as any,
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '50% 40%',
  } as any,
  // Hero overlay: two stacked gradients (drawn on top of the photo)
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H * 0.44,
  } as any,
  // Header bar (full width, height 62, at the very top, black 28% alpha)
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: 62,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  // Circular logo: 46x46, x=36, top offset 8 from page top
  logoWrap: {
    position: 'absolute',
    top: 8,
    left: 36,
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  // Wordmark: x=92, baseline H-37 (top edge set via topForBaseline)
  wordmark: {
    position: 'absolute',
  },
  // Tagline: right-aligned x=W-36, baseline H-37 -> top 37
  tagline: {
    position: 'absolute',
    top: 37,
    right: 36,
    textAlign: 'right',
  },
  // Headline block
  headline1: {
    position: 'absolute',
    top: 135, // baseline H-135
    left: 36,
  },
  headline2: {
    position: 'absolute',
    top: 183, // baseline H-183
    left: 36,
  },
  subtitle: {
    position: 'absolute',
    top: 210, // baseline H-210
    left: 38,
  },
  // Section title: baseline y0, underline below it
  sectionTitle: {
    position: 'absolute',
    left: 36,
  },
  sectionUnderline: {
    position: 'absolute',
    left: 36,
    width: 54,
    height: 3.5,
    backgroundColor: GOLD,
  },
  // Cards
  card: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 8,
  } as any,
  cardAccent: {
    position: 'absolute',
    width: 6,
    backgroundColor: GOLD,
    borderRadius: 3,
  } as any,
  cardTitle: {
    position: 'absolute',
  },
  cardDesc: {
    position: 'absolute',
  },
  // Booking banner
  banner: {
    position: 'absolute',
    backgroundColor: GREEN,
    borderRadius: 10,
  } as any,
  bannerTitle: {
    position: 'absolute',
  },
  bannerLine1: {
    position: 'absolute',
  },
  bannerLine2: {
    position: 'absolute',
  },
  bannerButton: {
    position: 'absolute',
    backgroundColor: ORANGE,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  bannerButtonText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  // Footer
  footerLine: {
    position: 'absolute',
  },
  footerText: {
    position: 'absolute',
  },
  footerCenter: {
    position: 'absolute',
    textAlign: 'center',
  },
  // Fallback sunset scene (drawn inside the hero rect)
  fallbackSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H * 0.44,
  },
});

function lerpColor(a: string, b: string, t: number): string {
  const aa = a.slice(1).match(/../)!.map((h) => parseInt(h, 16));
  const bb = b.slice(1).match(/../)!.map((h) => parseInt(h, 16));
  const c = aa.map((v, i) => Math.round(v + (bb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// Fallback sunset scene (vector, drawn with Svg when coverSrc is null)
// Ported in spirit from flier_reference.py: sky gradient, sun + 3 halos,
// hills, ground, two acacias, two giraffes.
// ---------------------------------------------------------------------------
function FallbackScene(): React.ReactElement {
  const HERO_HEIGHT = H * 0.44; // 370.43
  const groundY = HERO_HEIGHT - 90; // svgY of ground line (N = 90 above hero bottom)
  const sunCx = W * 0.78;
  const sunCy = HERO_HEIGHT - 130; // svgY of sun centre (N = 130)
  const stripH = HERO_HEIGHT / 60;

  return (
    <Svg style={S.fallbackSvg} width={W} height={HERO_HEIGHT} viewBox={`0 0 ${W} ${HERO_HEIGHT}`}>
      {/* Sky: 60 thin full-width horizontal strips, #2B1B3D -> #D9622B -> #F2B45A */}
      {Array.from({ length: 60 }).map((_, i) => {
        const t = i / 59;
        let color: string;
        if (t <= 0.5) {
          color = lerpColor('#2B1B3D', '#D9622B', t * 2);
        } else {
          color = lerpColor('#D9622B', '#F2B45A', (t - 0.5) * 2);
        }
        return <Rect key={`sky-${i}`} x={0} y={i * stripH} width={W} height={stripH} fill={color} />;
      })}

      {/* Sun: 3 translucent halos (#FFE2A0) + solid pale disc (#FFE9B8) */}
      <Circle cx={sunCx} cy={sunCy} r={95} fill="#FFE2A0" opacity={0.12} />
      <Circle cx={sunCx} cy={sunCy} r={75} fill="#FFE2A0" opacity={0.18} />
      <Circle cx={sunCx} cy={sunCy} r={55} fill="#FFE2A0" opacity={0.3} />
      <Circle cx={sunCx} cy={sunCy} r={40} fill="#FFE9B8" />

      {/* Brown hills (#7A3E2A) sitting on the ground line */}
      <Ellipse cx={W * 0.22} cy={groundY + 22} rx={130} ry={48} fill="#7A3E2A" />
      <Ellipse cx={W * 0.66} cy={groundY + 14} rx={100} ry={40} fill="#7A3E2A" opacity={0.92} />

      {/* Dark ground (#16241B) */}
      <Rect x={0} y={groundY} width={W} height={HERO_HEIGHT - groundY} fill={DARK} />

      {/* Two acacia trees: trunk + two canopy ellipses, scale 1.25 left / 0.75 right */}
      {[1, 2].map((n) => {
        const s = n === 1 ? 1.25 : 0.75;
        const tx = n === 1 ? W * 0.30 : W * 0.72;
        const trunkH = 46 * s;
        return (
          <G key={n}>
            <Rect x={tx - 6 * s} y={groundY - trunkH} width={12 * s} height={trunkH} fill="#4e342e" />
            <Ellipse cx={tx} cy={groundY - trunkH - 14 * s} rx={52 * s} ry={22 * s} fill="#3e2723" />
            <Ellipse cx={tx} cy={groundY - trunkH - 30 * s} rx={44 * s} ry={18 * s} fill="#3e2723" opacity={0.95} />
          </G>
        );
      })}

      {/* Two giraffes: body ellipse, four legs, neck polygon, head ellipse, scale 1.0 / 0.75 */}
      {[1, 2].map((n) => {
        const s = n === 1 ? 1.0 : 0.75;
        const gx = n === 1 ? W * 0.50 : W * 0.82;
        const bodyBottom = groundY - 4 * s;
        const neckTop = groundY - 58 * s;
        return (
          <G key={n}>
            <Ellipse cx={gx} cy={groundY - 16 * s} rx={20 * s} ry={12 * s} fill="#bf8f6f" />
            {[-10, -4, 4, 10].map((lx) => (
              <Rect
                key={lx}
                x={gx + lx * s - 2.5 * s}
                y={bodyBottom}
                width={5 * s}
                height={groundY - bodyBottom}
                fill="#8d6e63"
              />
            ))}
            <Polygon
              points={`${gx - 4 * s},${groundY - 28 * s} ${gx + 4 * s},${groundY - 28 * s} ${gx + 8 * s},${neckTop} ${gx - 8 * s},${neckTop}`}
              fill="#bf8f6f"
            />
            <Ellipse cx={gx} cy={groundY - 64 * s} rx={7 * s} ry={5 * s} fill="#bf8f6f" />
          </G>
        );
      })}
    </Svg>
  );
}

// react-pdf fragment wrapper (grouping element without a <g> node, which react-pdf does not support)
function G(props: { children: React.ReactNode }): React.ReactElement {
  return <>{props.children}</>;
}

// ---------------------------------------------------------------------------
// TourFlyerPDF component
// ---------------------------------------------------------------------------
export interface TourFlyerPDFProps {
  headline1: string;
  headline2: string;
  subtitle: string;
  highlights: { title: string; description: string }[]; // exactly 6
  coverSrc: string | null; // data URI or null
}

const HERO_HEIGHT = H * 0.44;
const HERO_BOTTOM = H - HERO_HEIGHT; // bottom-left y of hero bottom edge
const Y0 = HERO_BOTTOM - 40;
const CW = (W - 72 - 20) / 2;
const CH = 56;
const BY = 112;

export function TourFlyerPDF(props: TourFlyerPDFProps): React.ReactElement {
  const { headline1, headline2, subtitle, highlights, coverSrc } = props;

  // Shrink-to-fit for headline lines (max width W-72, min 34)
  const h1Size = fitFontSize(headline1, 46, W - 72, 34);
  const h2Size = fitFontSize(headline2, 46, W - 72, 34);
  const subSize = fitFontSize(subtitle, 13, W - 72, 10);

  // Wordmark: "JAE TRAVEL" in white + " EXPEDITIONS" in gold (split at last space)
  const upperName = BRAND.companyName.toUpperCase();
  const lastSpace = upperName.lastIndexOf(' ');
  const wordmarkPart1 = lastSpace > 0 ? upperName.slice(0, lastSpace) : upperName;
  const wordmarkPart2 = lastSpace > 0 ? upperName.slice(lastSpace) : '';

  // Tagline collision: measure combined wordmark width; keep tagline >= 16 pt away
  const tagline = BRAND.tagline || '';
  let taglineFontSize = 10;
  let taglineShown = true;
  if (tagline) {
    const wordmarkWidth = estimateTextWidth(wordmarkPart1, 16) + estimateTextWidth(wordmarkPart2, 16);
    const taglineWidth = estimateTextWidth(tagline, 10);
    const gap = (W - 36) - (92 + wordmarkWidth) - taglineWidth;
    if (gap < 16) {
      taglineFontSize = 8;
      const taglineWidth8 = estimateTextWidth(tagline, 8);
      const gap8 = (W - 36) - (92 + wordmarkWidth) - taglineWidth8;
      if (gap8 < 16) {
        taglineShown = false;
      }
    }
  }

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* ---------- Hero ---------- */}
        <View style={S.hero}>
          {coverSrc ? (
            <PDFImage src={coverSrc as string} style={S.heroImage} />
          ) : (
            <FallbackScene />
          )}
          {/* Hero overlay (cover mode): 60 thin horizontal opacity strips */}
          {coverSrc && (
            <Svg style={S.fallbackSvg} width={W} height={HERO_HEIGHT} viewBox={`0 0 ${W} ${HERO_HEIGHT}`}>
              {Array.from({ length: 60 }).map((_, i) => {
                let color: string;
                let opacity: number;
                if (i < 36) {
                  // top 60%: #2B1B3D 0.55 -> 0
                  color = '#2B1B3D';
                  opacity = 0.55 * (1 - i / 36);
                } else {
                  // bottom 40%: #16241B 0 -> 0.35
                  color = '#16241B';
                  opacity = 0.35 * ((i - 36) / 23);
                }
                return (
                  <Rect
                    key={`ov-${i}`}
                    x={0}
                    y={i * (HERO_HEIGHT / 60)}
                    width={W}
                    height={HERO_HEIGHT / 60}
                    fill={color}
                    opacity={opacity}
                  />
                );
              })}
            </Svg>
          )}
        </View>

        {/* ---------- Header bar ---------- */}
        <View style={S.headerBar} />
        <View style={S.logoWrap}>
          {getLogoSrc() ? (
            <PDFImage src={getLogoSrc() as string} style={S.logoImage} />
          ) : null}
        </View>
        {/* Wordmark: single element, x=92, nested spans, baseline H-37 */}
        <View style={[S.wordmark, { top: topForBaseline(37, 16), left: 92 }]}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16 }}>
            <Text style={{ color: '#ffffff' }}>{wordmarkPart1}</Text>
            <Text style={{ color: GOLD }}>{wordmarkPart2}</Text>
          </Text>
        </View>
        {taglineShown && (
          <View style={[S.tagline, { top: topForBaseline(37, 10), right: 36 }]}>
            <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: taglineFontSize, color: '#FBE7C0' }}>{tagline}</Text>
          </View>
        )}

        {/* ---------- Headline block ---------- */}
        <View style={{ position: 'absolute', top: topForBaseline(135, h1Size), left: 36 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: h1Size, color: '#ffffff' }}>{headline1}</Text>
        </View>
        <View style={{ position: 'absolute', top: topForBaseline(183, h2Size), left: 36 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: h2Size, color: GOLD }}>{headline2}</Text>
        </View>
        <View style={{ position: 'absolute', top: topForBaseline(210, subSize), left: 38 }}>
          <Text style={{ fontFamily: 'Helvetica', fontSize: subSize, color: '#ffffff' }}>{subtitle}</Text>
        </View>

        {/* ---------- Section title + underline ---------- */}
        <View style={[S.sectionTitle, { top: topForBaseline(410.4, 20) }]}>
          <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 20, color: GREEN }]}>
            What's included
          </Text>
        </View>
        <View style={[S.sectionUnderline, { top: topFromY(Y0 - 9, 3.5) }]} />

        {/* ---------- Six highlight cards (flat) ---------- */}
        {highlights.slice(0, 6).map((h, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 36 + col * (CW + 20);
          const y = Y0 - 30 - CH - row * (CH + 10);
          const cardTop = topFromY(y, CH);
          const titleTop = topFromY(y + CH - 20, 12.5);
          const descBaselineFromTop = H - (y + CH - 34);
          const descTop = topForBaseline(descBaselineFromTop, 9.5);
          return (
            <React.Fragment key={i}>
              <View key={`${i}-bg`} style={[S.card, { top: cardTop, left: x, width: CW, height: CH }]} />
              <View key={`${i}-accent`} style={[S.cardAccent, { top: cardTop, left: x, width: 6, height: CH }]} />
              <View key={`${i}-title`} style={[S.cardTitle, { top: titleTop, left: x + 18 }]}>
                <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 12.5, color: GREEN }]}>
                  {h.title}
                </Text>
              </View>
              {/* Description: two full lines inside the card, each positioned explicitly */}
              {wrapToLines(h.description, 9.5, CW - 30).slice(0, 2).map((line, li) => {
                const baselineBottomLeft = y + CH - 34 - li * 12;
                return (
                  <Text
                    key={`${i}-desc-${li}`}
                    style={{
                      position: 'absolute',
                      top: topForBaseline(H - baselineBottomLeft, 9.5),
                      left: x + 18,
                      fontFamily: 'Helvetica',
                      fontSize: 9.5,
                      color: BODY,
                      lineHeight: 12,
                    }}
                  >
                    {line}
                  </Text>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* ---------- Booking banner (flat) ---------- */}
        <View style={[S.banner, { top: topFromY(BY, 74), left: 36, width: W - 72, height: 74 }]} />
        <View style={{ position: 'absolute', top: topForBaseline(681.9, 16), left: 54 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: GOLD }}>Secure your adventure</Text>
        </View>
        <View style={{ position: 'absolute', top: topForBaseline(701.9, 11), left: 54 }}>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: '#ffffff' }}>
            A {BRAND.depositPercent}% non-refundable deposit confirms your booking.
          </Text>
        </View>
        <View style={{ position: 'absolute', top: topForBaseline(717.9, 11), left: 54 }}>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: '#ffffff' }}>
            Contact us for dates, group rates and custom quotes.
          </Text>
        </View>
        <View style={[S.bannerButton, { top: topFromY(BY + 20, 34), left: W - 36 - 118, width: 100, height: 34 }]} />
        {/* BOOK NOW centred inside the pill (fixed-width view, textAlign center) */}
        <View style={{ position: 'absolute', top: topForBaseline(698.9, 12), left: W - 36 - 118, width: 100 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#ffffff', textAlign: 'center' }}>
            BOOK NOW
          </Text>
        </View>

        {/* ---------- Footer ---------- */}
        {/* Divider: GOLD line y=46 */}
        <View style={[S.footerLine, { top: topFromY(46, 1.2), left: 36, width: W - 72, height: 1.2, backgroundColor: GOLD }]} />
        {/* Left column */}
        <View style={[S.footerText, { top: topForBaseline(763.9, 10.5), left: 36 }]} >
          <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: GREEN }]} >
            Phone:  {BRAND.phone}
          </Text>
        </View>
        <View style={[S.footerText, { top: topForBaseline(779.9, 10.5), left: 36 }]} >
          <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: GREEN }]} >
            Email:   {BRAND.email}
          </Text>
        </View>
        {/* Right column */}
        <View style={[S.footerText, { top: topForBaseline(763.9, 10.5), left: W / 2 + 10 }]} >
          <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: GREEN }]} >
            Web:  {BRAND.website}
          </Text>
        </View>
        {BRAND.social && (
          <View style={[S.footerText, { top: topForBaseline(779.9, 10.5), left: W / 2 + 10 }]} >
            <Text style={[{ fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: GREEN }]} >
              Social:  {BRAND.social}
            </Text>
          </View>
        )}
        {/* Footer centre: company + tagline, centred on page (centre x = W/2) */}
        <View style={[S.footerCenter, { top: topForBaseline(811.9, 9), left: 0, width: W }]} >
          <Text style={[{ fontFamily: 'Helvetica-Oblique', fontSize: 9, color: BODY, textAlign: 'center' }]} >
            {BRAND.companyName}  •  {BRAND.tagline}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
