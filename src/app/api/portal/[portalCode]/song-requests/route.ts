import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { deriveSongTitleFromUrl, instantThumbnailFor } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** "בקשות שיר לכולם" — המטופל מגיש בקשה, הסופראדמין מאשר/דוחה */
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

    const mine = db
      .collection('songRequests')
      .find({ clientId: client.id })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        suggestedCategory: r.suggestedCategory || '',
        status: r.status,
        createdAt: r.createdAt
      }));

    return NextResponse.json(mine, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הבקשות';
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
    const url = String(body.url || '').trim().slice(0, 2000);
    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'נא להזין קישור תקין לשיר (http/https)' }, { status: 400 });
    }

    // בקשה כפולה של אותו שיר מאותו מרחב — עדיין ממתינה? לא כפילויות
    const existing = db.collection('songRequests').findOne(
      (r: any) => r.clientId === client.id && r.url === url && r.status === 'pending'
    );
    if (existing) {
      return NextResponse.json({ error: 'כבר הגשת בקשה לשיר זה והיא ממתינה לטיפול 🎁' }, { status: 409 });
    }

    const req = db.collection('songRequests').insertOne({
      clientId: client.id,
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      title: String(body.title || '').trim().slice(0, 120) || deriveSongTitleFromUrl(url),
      url,
      thumbnailUrl: instantThumbnailFor(url) || '',
      suggestedCategory: String(body.suggestedCategory || '').trim().slice(0, 60),
      note: String(body.note || '').trim().slice(0, 300),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await db.flush();
    return NextResponse.json(req, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
