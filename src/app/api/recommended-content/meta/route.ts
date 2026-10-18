import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { cleanUrl } from '@/lib/contentHelpers';
import { fetchUrlPreview } from '@/lib/contentPreview';
import { instantThumbnailFor } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** מילוי אוטומטי לטופס הסופראדמין: סוג + שם + תיאור + תמונה מהקישור */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const identity = `staff:${auth.username}`;
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const rl = checkRateLimit(`recommended-content-meta:${identity}:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'בוצעו יותר מדי בקשות. נסה/י שוב בעוד דקה.' }, { status: 429 });
    }

    const url = cleanUrl(request.nextUrl.searchParams.get('url') || '');
    if (!url) {
      return NextResponse.json({ error: 'קישור לא תקין' }, { status: 400 });
    }

    const { type, title, description, image, sourceName } = await fetchUrlPreview(url);

    // תמונות מוטמעות (data:) לא נשמרות בהמלצות — רק כתובות http(s) ישירות
    const thumbnailUrl =
      (/^https?:\/\/.+/i.test(image) && image.length <= 2000 ? image : '') ||
      instantThumbnailFor(url) ||
      '';

    return NextResponse.json(
      { type, title, description, sourceName, thumbnailUrl },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בקריאת פרטי הקישור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
