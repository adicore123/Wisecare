import { NextRequest, NextResponse } from 'next/server';
import { getClientAuthFromRequest } from '@/lib/auth';
import { fetchSongMeta } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** נקודת קצה למילוי אוטומטי: מקבלת קישור ומחזירה שם + תמונה (oEmbed בצד השרת) */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    const { portalCode } = await props.params;
    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get('url') || '';
    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'קישור לא תקין' }, { status: 400 });
    }

    const meta = await fetchSongMeta(url);
    return NextResponse.json(meta, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בקריאת פרטי השיר';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
