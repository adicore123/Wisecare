import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { getPortalPayload } from '@/lib/portalPayload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    const { portalCode } = await props.params;

    // Clinical data (journal, tasks, appointments) only for a verified patient
    // session of THIS portal — the portal code alone is a link, not a credential.
    const clientAuth = getClientAuthFromRequest(request);
    const includePrivate = Boolean(clientAuth && clientAuth.portalCode === portalCode);

    const payload = await getPortalPayload(portalCode, { includePrivate });
    if (!payload) {
      // Distinguish a disabled portal from a wrong link
      const client = db.collection('clients').findOne({ portalCode });
      if (client && client.portalEnabled === false) {
        return NextResponse.json({ error: 'המרחב האישי אינו פעיל כרגע. יש לפנות למטפל/ת שלך.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'מרחב טיפולי זה לא נמצא או שהקישור שגוי' }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[Portal Get Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת נתוני המרחב האישי' }, { status: 500 });
  }
}
