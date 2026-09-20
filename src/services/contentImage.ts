/**
 * Content image materialization — self-hosting hotlinked thumbnails.
 *
 * Content imported from social networks often stores a signed, expiring CDN
 * URL (e.g. scontent*.xx.fbcdn.net) as `imageData`. Those links rot: they
 * break per-network/per-cache, which is why a video thumbnail can show on a
 * phone (warm cache) and be broken on desktop. Materializing converts such
 * URLs into embedded data-URLs at save time so the image lives in our DB.
 */

import { decodeHtmlEntities } from '@/lib/contentHelpers';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB cap
const FETCH_TIMEOUT_MS = 8000;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

export function isHttpImageUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

/**
 * Downloads the image behind `url` and returns it as a data-URL.
 * Returns null on any failure (timeout, too big, non-image) — callers keep
 * the original value and rely on the UI's icon fallback.
 */
export async function materializeImage(url: string): Promise<string | null> {
  if (!isHttpImageUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Some CDNs (incl. Facebook's) reject bare server-side requests
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;

    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Materializes in place (returns the value to store). */
export async function materializeImageDataField(imageData: unknown): Promise<unknown> {
  if (!isHttpImageUrl(imageData)) return imageData;
  const materialized = await materializeImage(String(imageData));
  return materialized ?? imageData;
}

const SCRAPE_TIMEOUT_MS = 6000;
// Facebook (and most social networks) serve OpenGraph meta tags to their own
// crawler UA and 400/redirect everyone else — this is the same UA the
// preview-url route uses.
const SCRAPE_USER_AGENT = 'facebookexternalhit/1.1 (compatible; WiseCare/1.0; +https://wisecare.com)';

/**
 * Scrapes a page's og:image URL (fresh, signed CDN link). Returns '' when the
 * page has no og:image or can't be fetched.
 */
export async function scrapeOgImage(pageUrl: string): Promise<string> {
  if (!isHttpImageUrl(pageUrl)) return '';
  // Tolerate paste artifacts on share links (trailing "/_", stray slashes) —
  // e.g. facebook.com/share/v/<id>/_ serves 400 while the trimmed link works.
  const normalized = pageUrl.trim().replace(/[\s/_]+$/, '');
  try {
    const res = await fetch(normalized, {
      headers: { 'User-Agent': SCRAPE_USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS)
    });
    if (!res.ok || !res.body) return '';

    const reader = res.body.getReader();
    let html = '';
    let bytesRead = 0;
    while (bytesRead < 250000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder('utf-8').decode(value, { stream: true });
      bytesRead += value.length;
      if (html.includes('</head>')) break;
    }
    reader.cancel().catch(() => {});

    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return '';
    const url = decodeHtmlEntities(match[1]).trim();
    return isHttpImageUrl(url) ? url : '';
  } catch {
    return '';
  }
}

/**
 * Rescue for hotlinked thumbnails whose signed CDN link has expired: try the
 * stored URL first; when it is dead, re-scrape the item's source page for a
 * FRESH og:image link and materialize that one. Returns the embedded data-URL,
 * or null when both attempts fail.
 */
export async function refreshHotlinkedImage(pageUrl: unknown, currentImageUrl: string): Promise<string | null> {
  const direct = await materializeImage(currentImageUrl);
  if (direct) return direct;

  const source = typeof pageUrl === 'string' ? pageUrl.trim() : '';
  if (!isHttpImageUrl(source)) return null;

  const fresh = await scrapeOgImage(source);
  if (!fresh || fresh === currentImageUrl) return null;
  return materializeImage(fresh);
}
