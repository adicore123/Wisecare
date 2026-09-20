import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

export const ALLOWED_TYPES = new Set(['video', 'article', 'post', 'image', 'link']);
export const MAX_IMAGE_DATA_LENGTH = 2_800_000;

export function cleanText(value: unknown, maxLength = 1000): string {
  return String(value || '').trim().slice(0, maxLength);
}

export function cleanUrl(value: unknown): string {
  const input = cleanText(value, 2000);
  if (!input) return '';
  try {
    const parsed = new URL(input);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export function isPublicWebUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;

    // Normalize the hostname into dotted IPv4 when possible so alternate encodings
    // (hex/octal/integer IPs) can't smuggle an internal address through.
    let ipParts: number[] | null = null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      ipParts = host.split('.').map(Number);
    } else {
      const lastSegment = host.split('.').pop() || '';
      if (/^(0x[0-9a-f]+|\d+)$/.test(lastSegment)) {
        const asInt = lastSegment.startsWith('0x') ? parseInt(lastSegment, 16) : parseInt(lastSegment, 10);
        if (Number.isInteger(asInt) && asInt >= 0 && asInt <= 0xffffffff) {
          ipParts = [(asInt >>> 24) & 255, (asInt >>> 16) & 255, (asInt >>> 8) & 255, asInt & 255];
        }
      }
    }

    if (ipParts) {
      const [a, b] = ipParts;
      if (a === 10) return false;                                   // 10.0.0.0/8
      if (a === 192 && b === 168) return false;                     // 192.168.0.0/16
      if (a === 172 && b >= 16 && b <= 31) return false;            // 172.16.0.0/12
      if (a === 127) return false;                                  // loopback
      if (a === 169 && b === 254) return false;                     // link-local / cloud metadata
      if (a === 0) return false;                                    // 0.0.0.0/8
      if (a === 100 && b >= 64 && b <= 127) return false;           // CGNAT 100.64.0.0/10
    }

    // IPv6 literals: block loopback, link-local, unique-local and IPv4-mapped
    if (host.includes(':') && /^(::1|fe80:|fc[0-9a-f]|fd[0-9a-f]|::ffff:)/.test(host)) {
      return false;
    }

    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200E\u200F]/g, '')
    .trim();
}

export function detectTypeAndSource(urlStr: string): { type: string; sourceName: string } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();

    // YouTube (video)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return {
        type: 'video',
        sourceName: path.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube'
      };
    }
    // Vimeo (video)
    if (host.includes('vimeo.com')) {
      return { type: 'video', sourceName: 'Vimeo' };
    }
    // TikTok (video)
    if (host.includes('tiktok.com')) {
      return { type: 'video', sourceName: 'TikTok' };
    }
    // Instagram (reel vs post)
    if (host.includes('instagram.com')) {
      if (path.includes('/reel') || path.includes('/tv/') || path.includes('/share/r')) {
        return { type: 'video', sourceName: 'Instagram Reels' };
      }
      return { type: 'post', sourceName: 'Instagram' };
    }
    // Facebook (watch/reel/video vs post)
    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) {
      if (
        path.includes('/share/v') ||
        path.includes('/share/r') ||
        path.includes('/watch') ||
        path.includes('/reel') ||
        path.includes('/videos/') ||
        path.includes('/video.php') ||
        host.includes('fb.watch') ||
        parsed.searchParams.has('v')
      ) {
        return {
          type: 'video',
          sourceName: (path.includes('/reel') || path.includes('/share/r')) ? 'Facebook Reel' : 'Facebook Video'
        };
      }
      return { type: 'post', sourceName: 'Facebook' };
    }
    // LinkedIn (post / video)
    if (host.includes('linkedin.com')) {
      return { type: path.includes('/video/') ? 'video' : 'post', sourceName: 'LinkedIn' };
    }
    // Twitter / X (post)
    if (host.includes('twitter.com') || host.includes('x.com')) {
      return { type: 'post', sourceName: 'X (Twitter)' };
    }
    // Threads (post)
    if (host.includes('threads.net')) {
      return { type: 'post', sourceName: 'Threads' };
    }
    // Video direct files
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(path)) {
      return { type: 'video', sourceName: host };
    }

    return { type: 'link', sourceName: host };
  } catch {
    return { type: 'link', sourceName: '' };
  }
}

export function validateImageData(value: unknown): string | null {
  if (!value) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return '';

  // Remote image URL (from OpenGraph / social preview)
  if (/^https?:\/\/.+/i.test(trimmed)) {
    return trimmed.length <= 2048 ? trimmed : null;
  }

  // Base64 data URL
  if (
    !/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmed) ||
    trimmed.length > MAX_IMAGE_DATA_LENGTH
  ) {
    return null;
  }
  return trimmed;
}

export function enrichItems(items: any[]) {
  const assignments = db.collection('contentAssignments');
  const clients = db.collection('clients');

  return items.map(item => ({
    ...item,
    assignments: assignments.find({ contentId: item.id }).map((assignment: any) => {
      const client = clients.findById(assignment.clientId);
      return {
        ...assignment,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'מטופל לא זמין'
      };
    })
  }));
}

export async function notifyClient(client: any, assignment: any, item: any) {
  const isArticle = item.type === 'article';
  const clientAppUrl = getBaseUrl();
  const portalUrl = new URL(`/portal/${encodeURIComponent(client.portalCode)}`, clientAppUrl);
  portalUrl.searchParams.set('tab', 'content');
  portalUrl.searchParams.set('subtab', isArticle ? 'articles' : 'media');
  portalUrl.searchParams.set('content', item.id);

  const settings = db.getSettings();
  let therapistName = '';
  if (item.therapistId) {
    const therapist = db.collection('users').findById(item.therapistId);
    if (therapist?.name) therapistName = therapist.name;
  }

  const defaultArticleTpl = 'שלום {{firstName}} יקר/ה,\nשותף איתך מאמר חדש לקריאה במרחב האישי של WiseCare:\n📖 *{{title}}*\n\nלקריאת המאמר במרחב הטיפולי שלך:\n{{portalUrl}}\n\nקריאה מעשירה ויום נעים! 🌿';
  const defaultMediaTpl = 'שלום {{firstName}} יקר/ה,\nשותף איתך תוכן חדש (סרטון / פוסט) במרחב האישי של WiseCare:\n🎬 *{{title}}*\n\nלצפייה בתוכן במרחב הטיפולי שלך:\n{{portalUrl}}\n\nצפייה מהנה ויום נפלא! ✨';

  const template = isArticle
    ? (settings.articleNotificationTemplate || defaultArticleTpl)
    : (settings.mediaNotificationTemplate || defaultMediaTpl);

  const message = template
    .replace(/\{\{firstName\}\}/g, client.firstName || '')
    .replace(/\{firstName\}/g, client.firstName || '')
    .replace(/\{\{title\}\}/g, item.title || (isArticle ? 'מאמר חדש' : 'סרטון/פוסט'))
    .replace(/\{title\}/g, item.title || (isArticle ? 'מאמר חדש' : 'סרטון/פוסט'))
    .replace(/\{\{portalUrl\}\}/g, portalUrl.toString())
    .replace(/\{portalUrl\}/g, portalUrl.toString())
    .replace(/\{\{type\}\}/g, isArticle ? 'מאמר' : 'סרטון / פוסט')
    .replace(/\{type\}/g, isArticle ? 'מאמר' : 'סרטון / פוסט')
    .replace(/\{\{clinicName\}\}/g, settings.clinicName || 'WiseCare')
    .replace(/\{clinicName\}/g, settings.clinicName || 'WiseCare')
    .replace(/\{\{therapistName\}\}/g, therapistName)
    .replace(/\{therapistName\}/g, therapistName);

  const attemptedAt = new Date().toISOString();

  try {
    await sendWhatsAppMessage({ phone: client.phone, message });
    return db.collection('contentAssignments').updateById(assignment.id, {
      notificationStatus: 'sent',
      notifiedAt: attemptedAt,
      lastNotificationAttemptAt: attemptedAt,
      notificationCount: (assignment.notificationCount || 0) + 1,
      notificationError: null
    });
  } catch (error: any) {
    return db.collection('contentAssignments').updateById(assignment.id, {
      notificationStatus: 'failed',
      notificationError: error.message,
      lastNotificationAttemptAt: attemptedAt
    });
  }
}
