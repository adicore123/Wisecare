// גזירת מטא-דאטה של שיר מהקישור — שם אוטומטי + תמונה.
// החלק הסינכרוני (youtube id, שם קובץ) זמין גם ללא רשת; oEmbed נעשה מהשרת
// כדי לעקוף מגבלות CORS וללא מפתחות API.

export interface SongMeta {
  title: string;
  thumbnailUrl: string | null;
  provider: 'youtube' | 'spotify' | 'soundcloud' | 'direct' | 'link';
}

export function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/** "my_favorite-song.mp3" → "My favorite song" */
function titleFromFilename(url: string): string | null {
  try {
    const u = new URL(url);
    const file = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    if (!file) return null;
    const base = file.replace(/\.(mp3|m4a|aac|ogg|oga|wav|flac|opus|webm)$/i, '');
    if (!base) return null;
    const cleaned = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return null;
  }
}

function providerOf(url: string): SongMeta['provider'] {
  if (youtubeIdFromUrl(url)) return 'youtube';
  if (/^https?:\/\/(?:open\.)?spotify\.com\//i.test(url)) return 'spotify';
  if (/^https?:\/\/(?:www\.)?soundcloud\.com\//i.test(url)) return 'soundcloud';
  if (/\.(mp3|m4a|aac|ogg|oga|wav|flac|opus|webm)(\?|$)/i.test(url)) return 'direct';
  return 'link';
}

/** גזירה מיידית ללא רשת — שם קובץ / תווית ספק */
export function deriveSongTitleFromUrl(url: string): string {
  const provider = providerOf(url);
  const filename = titleFromFilename(url);
  if (filename) return filename;
  switch (provider) {
    case 'youtube': return 'שיר מיוטיוב';
    case 'spotify': return 'שיר מספוטיפיי';
    case 'soundcloud': return 'שיר מ-SoundCloud';
    default: return 'השיר שלי';
  }
}

/** תמונה זמינה-מיד: יוטיוב לפי מזהה הסרטון, בלי קריאת רשת */
export function instantThumbnailFor(url: string): string | null {
  const ytId = youtubeIdFromUrl(url);
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
  return null;
}

interface OembedResponse {
  title?: string;
  thumbnail_url?: string;
}

async function fetchJson(url: string, timeoutMs = 4000): Promise<OembedResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** מטא מלא עם oEmbed בצד השרת (שם אמיתי + עטיפה). נכשל בשקט → נופל לגזירה המקומית. */
export async function fetchSongMeta(url: string): Promise<SongMeta> {
  const provider = providerOf(url);
  const fallback: SongMeta = {
    title: deriveSongTitleFromUrl(url),
    thumbnailUrl: instantThumbnailFor(url),
    provider
  };
  if (!/^https?:\/\//i.test(url)) return fallback;

  let oembedUrl: string | null = null;
  if (provider === 'youtube') oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  else if (provider === 'spotify') oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  else if (provider === 'soundcloud') oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;

  if (!oembedUrl) return fallback;
  const data = await fetchJson(oembedUrl);
  if (!data) return fallback;
  return {
    title: (data.title && data.title.trim()) || fallback.title,
    thumbnailUrl: data.thumbnail_url || fallback.thumbnailUrl,
    provider
  };
}
