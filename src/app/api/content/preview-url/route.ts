import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getClientAuthFromRequest } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  cleanUrl,
  decodeHtmlEntities,
  detectTypeAndSource,
  isPublicWebUrl
} from '@/lib/contentHelpers';

export async function POST(request: NextRequest) {
  try {
    // The portal's self-content form relies on this preview too — patients
    // paste links from their own session. Allow either a staff session or a
    // verified client session; isPublicWebUrl below stays the SSRF guard and
    // the rate limit is keyed per identity so clients can't drive the fetcher.
    const auth = getAuthFromRequest(request);
    const isStaff = Boolean(auth && (auth.role === 'therapist' || auth.role === 'superadmin'));
    const clientAuth = getClientAuthFromRequest(request);
    if (!isStaff && !clientAuth) {
      return NextResponse.json({ error: 'נדרשת התחברות למערכת' }, { status: 403 });
    }

    const identity = isStaff
      ? `staff:${auth!.username}`
      : `client:${clientAuth!.clientId}`;
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const rl = checkRateLimit(`preview-url:${identity}:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'בוצעו יותר מדי בקשות. נסה/י שוב בעוד דקה.' }, { status: 429 });
    }

    // URL preview is safe as isPublicWebUrl guards against internal SSRF
    const body = await request.json().catch(() => ({}));
    const url = cleanUrl(body.url);
    if (!url) {
      return NextResponse.json({ error: 'כתובת קישור אינה תקינה' }, { status: 400 });
    }

    const detected = detectTypeAndSource(url);
    let title = '';
    let description = '';
    let image = '';
    let sourceName = detected.sourceName;
    let type = detected.type;

    if (isPublicWebUrl(url)) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // 1. YouTube oEmbed
        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
            { signal: AbortSignal.timeout(3000) }
          );
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
          const oembedRes = await fetch(
            `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(3000) }
          );
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
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(4000),
            redirect: 'follow'
          });

          if (pageRes.url && pageRes.url !== url) {
            const redirectDetails = detectTypeAndSource(pageRes.url);
            if (redirectDetails.type === 'video') {
              type = 'video';
              if (redirectDetails.sourceName) sourceName = redirectDetails.sourceName;
            }
          }

          if (pageRes.ok && pageRes.body) {
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
            reader.cancel().catch(() => { });

            const ogTitleMatch =
              html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
            const htmlTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const rawTitle = (ogTitleMatch?.[1] || htmlTitleMatch?.[1] || '').trim();

            const ogDescMatch =
              html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
            const rawDesc = (ogDescMatch?.[1] || '').trim();

            const ogImageMatch =
              html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            image = decodeHtmlEntities(ogImageMatch?.[1] || '').trim();

            const ogSiteNameMatch =
              html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
            if (ogSiteNameMatch?.[1]) {
              sourceName = decodeHtmlEntities(ogSiteNameMatch[1].trim());
            }

            const isExplicitPost = (url.includes('facebook.com') || url.includes('fb.com')) &&
              (url.includes('/share/p/') || url.includes('/posts/') || url.includes('permalink.php'));
            const ogTypeMatch = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
            if (!isExplicitPost && ogTypeMatch?.[1]?.toLowerCase().includes('video')) {
              type = 'video';
              if (!sourceName.toLowerCase().includes('video') && !sourceName.toLowerCase().includes('reel')) {
                sourceName = `${sourceName} Video`;
              }
            } else if (ogTypeMatch?.[1]?.toLowerCase().includes('article')) {
              type = 'article';
            } else if (isExplicitPost) {
              type = 'post';
              if (!sourceName.includes('Post') && !sourceName.includes('פוסט')) {
                sourceName = 'Facebook Post';
              }
            }

            let cleanTitle = decodeHtmlEntities(rawTitle);
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
        // Fallback gracefully
      }
    }

    if (title) title = decodeHtmlEntities(title).slice(0, 160);
    if (description) description = decodeHtmlEntities(description).slice(0, 1000);

    return NextResponse.json({
      url,
      type,
      title,
      description,
      image,
      sourceName
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בחילוץ פרטי קישור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
