import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getClientAuthFromRequest } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { cleanUrl } from '@/lib/contentHelpers';
import { fetchUrlPreview } from '@/lib/contentPreview';

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

    const { type, title, description, image, sourceName } = await fetchUrlPreview(url);

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
