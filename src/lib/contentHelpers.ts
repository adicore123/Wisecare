import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';

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
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
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
  if (
    typeof value !== 'string' ||
    !/^data:image\/(png|jpe?g|webp);base64,/i.test(value) ||
    value.length > MAX_IMAGE_DATA_LENGTH
  ) {
    return null;
  }
  return value;
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
  const clientAppUrl = process.env.CLIENT_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const portalUrl = new URL(`/portal/${encodeURIComponent(client.portalCode)}`, clientAppUrl);
  portalUrl.searchParams.set('tab', 'content');
  portalUrl.searchParams.set('content', item.id);
  const message = `שלום ${client.firstName},\nנוסף עבורך תוכן חדש במרחב האישי של WiseCare.\n\nלצפייה בתוכן:\n${portalUrl}`;
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
