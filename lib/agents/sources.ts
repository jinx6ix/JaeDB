// lib/agents/sources.ts
// Dependency-light extractors for itinerary sources:
// - URL: native fetch + regex tag strip
// - PDF: unpdf (serverless-friendly pdfjs wrapper)

export interface ExtractedDoc {
  title: string;
  description: string;
  text: string;
  meta: Record<string, string | undefined>;
  ogImage?: string;
  pages?: number;
}

/** Fetch + clean HTML into plain text. Throws on network error. */
export async function extractUrl(rawUrl: string, fetchOpts: RequestInit = {}): Promise<ExtractedDoc> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JaeTravelBot/1.0; +https://jaetravel.co.ke)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    ...fetchOpts,
  });
  if (!res.ok) throw new Error(`URL fetch ${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  let html = await res.text();

  // If we accidentally got PDF bytes as text, surface a friendly error
  if (html.startsWith('%PDF-')) {
    throw new Error('That URL serves a PDF — use the Upload PDF button instead.');
  }
  if (!/html|xhtml/i.test(ct) && !/<html|<!doctype/i.test(html.slice(0, 200))) {
    // Plain text or unknown — return as-is
    return { title: url, description: '', text: html.slice(0, 50_000), meta: {} };
  }

  const title = pick(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || url;
  const description = pick(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]) ||
    pick(html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1]) || '';
  const ogImage = pick(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1]);

  // Strip scripts / styles / svg / noscript first
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Break block-level tags into newlines so prose reads better
  let txt = stripped
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article|td)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"|[&#39;]|&#x27;/g, "'")
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Limit to ~50k chars to keep LLM prompt bounded
  if (txt.length > 50_000) txt = txt.slice(0, 50_000);
  const words = txt.split(/\s+/).filter(Boolean).length;
  return { title, description, text: txt, meta: { words: String(words), url }, ogImage };
}

/** Extract plain text from a PDF buffer (uses unpdf). */
export async function extractPdf(buf: Uint8Array): Promise<ExtractedDoc> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  let text = '';
  let pages = 0;
  // unpdf v1 returns { totalPages, text: string|[] } depending on mergePages.
  // We pin mergePages:true so text is a single string + we get totalPages.
  const out: any = await extractText(pdf, { mergePages: true });
  pages = Number(out?.totalPages) || 0;
  text = typeof out?.text === 'string' ? out.text : Array.isArray(out?.text) ? out.text.join('\n') : '';
  text = String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length > 50_000) text = text.slice(0, 50_000);
  return { title: 'PDF document', description: '', text, meta: { pages: String(pages || 0) }, pages: pages || undefined };
}

function pick(x?: string | null): string | undefined {
  if (!x) return undefined;
  const v = String(x).replace(/\s+/g, ' ').trim();
  return v ? v : undefined;
}
