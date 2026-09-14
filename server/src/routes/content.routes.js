import express from 'express';
import { db } from '../db/db.js';
import { sendWhatsAppMessage } from '../services/greenApi.js';
import { requireAuth, requireTherapist } from '../middleware/auth.middleware.js';

const router = express.Router();
const ALLOWED_TYPES = new Set(['video', 'article', 'post', 'image', 'link']);
const MAX_IMAGE_DATA_LENGTH = 2_800_000;

function cleanText(value, maxLength = 1000) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanUrl(value) {
  const input = cleanText(value, 2000);
  if (!input) return '';
  try {
    const parsed = new URL(input);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function isPublicWebUrl(urlStr) {
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

function decodeHtmlEntities(str) {
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

function detectTypeAndSource(urlStr) {
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

function validateImageData(value) {
  if (!value) return '';
  if (
    typeof value !== 'string'
    || !/^data:image\/(png|jpe?g|webp);base64,/i.test(value)
    || value.length > MAX_IMAGE_DATA_LENGTH
  ) {
    return null;
  }
  return value;
}

function enrichItems(items) {
  const assignments = db.collection('contentAssignments');
  const clients = db.collection('clients');

  return items.map(item => ({
    ...item,
    assignments: assignments.find({ contentId: item.id }).map(assignment => {
      const client = clients.findById(assignment.clientId);
      return {
        ...assignment,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'מטופל לא זמין'
      };
    })
  }));
}

async function notifyClient(client, assignment, item) {
  const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
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
  } catch (error) {
    return db.collection('contentAssignments').updateById(assignment.id, {
      notificationStatus: 'failed',
      notificationError: error.message,
      lastNotificationAttemptAt: attemptedAt
    });
  }
}

// Smart URL Preview & Metadata Scraper
router.post('/preview-url', requireAuth, requireTherapist, async (req, res) => {
  const url = cleanUrl(req.body.url);
  if (!url) {
    return res.status(400).json({ error: 'כתובת קישור אינה תקינה' });
  }

  const detected = detectTypeAndSource(url);
  let title = '';
  let description = '';
  let image = '';
  let sourceName = detected.sourceName;
  let type = detected.type;

  // Only perform external fetch if it's a public web URL
  if (isPublicWebUrl(url)) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // 1. YouTube oEmbed
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(3000)
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title || '';
          image = data.thumbnail_url || '';
          if (data.author_name) {
            sourceName = `YouTube (${data.author_name})`;
          }
        }
      } 
      // 2. Vimeo oEmbed
      else if (host.includes('vimeo.com')) {
        const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(3000)
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title || '';
          description = data.description || '';
          image = data.thumbnail_url || '';
          if (data.author_name) {
            sourceName = `Vimeo (${data.author_name})`;
          }
        }
      }
      // 3. General OpenGraph scraper with short timeout
      else {
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (compatible; WiseCare/1.0; +https://wisecare.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(4000),
          redirect: 'follow'
        });

        // If the URL redirected (e.g., from /share/v/... to /reel/...), check redirected target
        if (pageRes.url && pageRes.url !== url) {
          const redirectDetails = detectTypeAndSource(pageRes.url);
          if (redirectDetails.type === 'video') {
            type = 'video';
            if (redirectDetails.sourceName) sourceName = redirectDetails.sourceName;
          }
        }

        if (pageRes.ok) {
          // Read up to ~250KB for fast metadata extraction
          const reader = pageRes.body.getReader();
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

          const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
          const htmlTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          let rawTitle = (ogTitleMatch?.[1] || htmlTitleMatch?.[1] || '').trim();

          const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
          let rawDesc = (ogDescMatch?.[1] || '').trim();

          const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          image = decodeHtmlEntities(ogImageMatch?.[1] || '').trim();

          const ogSiteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
          if (ogSiteNameMatch?.[1]) {
            sourceName = decodeHtmlEntities(ogSiteNameMatch[1].trim());
          }

          const ogTypeMatch = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
          if (ogTypeMatch?.[1]?.toLowerCase().includes('video')) {
            type = 'video';
            if (!sourceName.toLowerCase().includes('video') && !sourceName.toLowerCase().includes('reel')) {
              sourceName = `${sourceName} Video`;
            }
          } else if (ogTypeMatch?.[1]?.toLowerCase().includes('article')) {
            type = 'article';
          }

          let cleanTitle = decodeHtmlEntities(rawTitle);
          // If title includes Facebook view counts / shares before pipe
          if (cleanTitle.includes('|')) {
            const parts = cleanTitle.split('|');
            if (parts.length > 1 && /צפיות|views|shares|שיתופים/i.test(parts[0])) {
              cleanTitle = parts.slice(1).join('|').trim();
            }
          }
          const firstTitleLine = cleanTitle.split('\n')[0].trim();
          title = firstTitleLine.length > 120 ? `${firstTitleLine.slice(0, 117)}...` : firstTitleLine;

          description = decodeHtmlEntities(rawDesc || cleanTitle).slice(0, 1000);
        }
      }
    } catch {
      // Gracefully fallback to regex detection without error
    }
  }

  if (title) {
    title = decodeHtmlEntities(title).slice(0, 160);
  }
  if (description) {
    description = decodeHtmlEntities(description).slice(0, 1000);
  }

  return res.json({
    url,
    type,
    title,
    description,
    image,
    sourceName
  });
});

// List a therapist's personal content library.
router.get('/', requireAuth, requireTherapist, (req, res) => {
  const therapistId = cleanText(req.query.therapistId, 120);
  if (!therapistId) {
    return res.status(400).json({ error: 'חסר מזהה מטפל' });
  }

  const items = db.collection('contentItems').find({ therapistId });
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(enrichItems(items));
});

// Save a link, article, post, image or video in the therapist's library.
router.post('/', requireAuth, requireTherapist, (req, res) => {
  const therapistId = cleanText(req.body.therapistId, 120);
  let title = cleanText(req.body.title, 160);
  const type = ALLOWED_TYPES.has(req.body.type) ? req.body.type : 'link';
  const url = cleanUrl(req.body.url);
  const imageData = validateImageData(req.body.imageData);
  const description = cleanText(req.body.description, 12000);
  const sourceName = cleanText(req.body.sourceName, 120);

  if (!therapistId) {
    return res.status(400).json({ error: 'חסר מזהה מטפל' });
  }

  // Auto-generate title if not provided by therapist
  if (!title) {
    if (type === 'video') {
      title = sourceName ? `סרטון (${sourceName})` : 'סרטון טיפולי מהרשת';
    } else if (type === 'post') {
      title = sourceName ? `פוסט (${sourceName})` : 'פוסט מומלץ מהרשת';
    } else if (type === 'article') {
      const firstLine = description ? description.split('\n')[0].trim().slice(0, 60) : '';
      title = firstLine || (sourceName ? `מאמר מאת ${sourceName}` : 'מאמר והדרכה טיפולית');
    } else if (type === 'image') {
      title = 'תמונה / דף עבודה';
    } else {
      title = sourceName ? `תוכן מ-${sourceName}` : 'קישור לתוכן';
    }
  }

  if (!url && !imageData && !description) {
    return res.status(400).json({ error: 'יש להוסיף קישור, תמונה או תוכן כתוב' });
  }
  if (req.body.url && !url) {
    return res.status(400).json({ error: 'הקישור אינו כתובת HTTP/HTTPS תקינה' });
  }
  if (imageData === null) {
    return res.status(413).json({ error: 'התמונה אינה תקינה או גדולה מדי. ניתן להעלות תמונה עד 2MB' });
  }

  const item = db.collection('contentItems').insertOne({
    therapistId,
    title,
    type,
    url,
    imageData,
    description,
    category: cleanText(req.body.category, 80) || 'כללי',
    sourceName: cleanText(req.body.sourceName, 120),
    archived: false
  });

  return res.status(201).json({ ...item, assignments: [] });
});

// Assign one library item to one or more clients. WhatsApp is optional per action.
router.post('/:id/assign', requireAuth, requireTherapist, async (req, res) => {
  const item = db.collection('contentItems').findById(req.params.id);
  const clientIds = Array.isArray(req.body.clientIds) ? [...new Set(req.body.clientIds.map(String))] : [];
  const sendWhatsApp = Boolean(req.body.sendWhatsApp);

  if (!item) return res.status(404).json({ error: 'פריט התוכן לא נמצא' });
  if (clientIds.length === 0) return res.status(400).json({ error: 'יש לבחור לפחות מטופל אחד' });

  const clientsCollection = db.collection('clients');
  const assignmentsCollection = db.collection('contentAssignments');
  const results = [];

  for (const clientId of clientIds) {
    const client = clientsCollection.findById(clientId);
    if (!client || client.therapistId !== item.therapistId) {
      results.push({ clientId, status: 'invalid_client' });
      continue;
    }

    let assignment = assignmentsCollection.findOne({ contentId: item.id, clientId });
    const assignmentAction = assignment ? 'already_assigned' : 'assigned';
    if (!assignment) {
      assignment = assignmentsCollection.insertOne({
        contentId: item.id,
        clientId,
        therapistId: item.therapistId,
        notificationRequested: sendWhatsApp,
        notificationStatus: sendWhatsApp ? 'pending' : 'skipped',
        notifiedAt: null,
        lastNotificationAttemptAt: null,
        notificationCount: 0,
        notificationError: null
      });
    } else {
      assignment = assignmentsCollection.updateById(assignment.id, {
        notificationRequested: sendWhatsApp,
        notificationStatus: sendWhatsApp ? 'pending' : assignment.notificationStatus
      });
    }

    if (sendWhatsApp) assignment = await notifyClient(client, assignment, item);
    results.push({
      clientId,
      assignment,
      assignmentAction,
      status: assignment.notificationStatus
    });
  }

  return res.json({ item: enrichItems([item])[0], results });
});

// Send or re-send a WhatsApp notification without duplicating the assignment.
router.post('/:id/notify/:clientId', requireAuth, requireTherapist, async (req, res) => {
  const item = db.collection('contentItems').findById(req.params.id);
  const client = db.collection('clients').findById(req.params.clientId);
  const assignment = db.collection('contentAssignments').findOne({
    contentId: req.params.id,
    clientId: req.params.clientId
  });

  if (!item || !client || !assignment) {
    return res.status(404).json({ error: 'פריט, מטופל או שיוך לא נמצאו' });
  }

  const updated = await notifyClient(client, assignment, item);
  return res.json(updated);
});

// Remove content from one selected client only; the library item stays intact.
router.delete('/:id/assignments/:clientId', requireAuth, requireTherapist, (req, res) => {
  const assignment = db.collection('contentAssignments').findOne({
    contentId: req.params.id,
    clientId: req.params.clientId
  });

  if (!assignment) return res.status(404).json({ error: 'השיוך למטופל לא נמצא' });
  db.collection('contentAssignments').deleteById(assignment.id);
  return res.json({ success: true, message: 'התוכן הוסר מהמטופל שנבחר' });
});

// Deleting a library item also revokes it from every patient portal.
router.delete('/:id', requireAuth, requireTherapist, (req, res) => {
  const items = db.collection('contentItems');
  const item = items.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'פריט התוכן לא נמצא' });

  const assignments = db.collection('contentAssignments');
  assignments.find({ contentId: item.id }).forEach(assignment => assignments.deleteById(assignment.id));
  items.deleteById(item.id);
  return res.json({ success: true, message: 'הפריט נמחק מהספרייה והוסר מכל המטופלים' });
});

export default router;
