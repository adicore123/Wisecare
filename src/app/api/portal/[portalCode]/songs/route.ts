import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { deriveSongTitleFromUrl, instantThumbnailFor } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** השם אופציונלי — אם לא הוזן נגזר אוטומטית מהקישור; התמונה נשמרת אם הוזנה */
function normalizeSongFields(body: Record<string, any>, existing?: Record<string, any>) {
  const title = String(body.title ?? existing?.title ?? '').trim().slice(0, 120);
  const url = String(body.url ?? existing?.url ?? '').trim().slice(0, 2000);
  const note = String(body.note ?? existing?.note ?? '').trim().slice(0, 300);
  let thumbnailUrl = String(body.thumbnailUrl ?? existing?.thumbnailUrl ?? '').trim().slice(0, 2000);

  if (!/^https?:\/\/.+/i.test(url)) {
    return { error: 'נא להזין קישור תקין (http/https)' as const };
  }
  if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
    thumbnailUrl = '';
  }

  return {
    title: title || deriveSongTitleFromUrl(url),
    url,
    note,
    // תמונה מיידית ליוטיוב גם אם הלקוח לא שלח (המזהה מספיק, בלי קריאת רשת)
    thumbnailUrl: thumbnailUrl || instantThumbnailFor(url) || ''
  };
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const songs = db
      .collection('songs')
      .find({ clientId: client.id })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(songs, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת השירים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const fields = normalizeSongFields(body);
    if ('error' in fields) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }

    const song = db.collection('songs').insertOne({
      clientId: client.id,
      ...fields,
      createdAt: new Date().toISOString()
    });

    await db.flush();
    return NextResponse.json(song, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשמירת השיר';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
