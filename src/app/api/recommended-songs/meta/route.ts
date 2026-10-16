import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchSongMeta } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** מילוי אוטומטי לטופס הסופראדמין: שם + תמונה מהקישור (oEmbed בצד השרת) */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const url = request.nextUrl.searchParams.get('url') || '';
    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'קישור לא תקין' }, { status: 400 });
    }

    const meta = await fetchSongMeta(url);
    return NextResponse.json(meta, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בקריאת פרטי השיר';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
