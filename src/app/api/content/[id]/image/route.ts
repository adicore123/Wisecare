import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest, getClientAuthFromRequest } from '@/lib/auth';

/**
 * GET /api/content/{id}/image
 * Serves a content item's stored thumbnail (base64 data-URL in the DB) as a
 * real image response with immutable caching — so list/portal payloads don't
 * have to carry megabytes of embedded images. Requires any signed-in session
 * (therapist/superadmin or patient portal); item ids are unguessable.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const staffAuth = getAuthFromRequest(request);
    const clientAuth = getClientAuthFromRequest(request);
    if (!staffAuth && !clientAuth) {
      return NextResponse.json({ error: 'נדרשת התחברות למערכת' }, { status: 403 });
    }

    const { id } = await props.params;

    // imageData stays out of the bulk sync (multi-MB); fetched per item on demand
    const imageData = await db.getContentImageData(id);
    if (!imageData) {
      return NextResponse.json({ error: 'תמונה לא נמצאה' }, { status: 404 });
    }

    const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(imageData);
    if (!match) {
      return NextResponse.json({ error: 'פורמט תמונה שמור אינו נתמך' }, { status: 415 });
    }

    const buffer = Buffer.from(match[2], 'base64');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': match[1],
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת התמונה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
