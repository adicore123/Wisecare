/**
 * Content image materialization — self-hosting hotlinked thumbnails.
 *
 * Content imported from social networks often stores a signed, expiring CDN
 * URL (e.g. scontent*.xx.fbcdn.net) as `imageData`. Those links rot: they
 * break per-network/per-cache, which is why a video thumbnail can show on a
 * phone (warm cache) and be broken on desktop. Materializing converts such
 * URLs into embedded data-URLs at save time so the image lives in our DB.
 */

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
