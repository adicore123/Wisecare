import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { deriveSongTitleFromUrl, instantThumbnailFor } from '@/lib/songMeta';

interface RouteProps {
  params: Promise<{ portalCode: string; id: string }>;
}

export async function PUT(
  request: NextRequest,
  props: RouteProps
) {
  try {
    await db.ensureLoaded();
    const { portalCode, id } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const songs = db.collection('songs');
    const existing = songs.findById(id);
    if (!existing || existing.clientId !== client.id) {
      return NextResponse.json({ error: 'השיר לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const title = String(body.title ?? existing.title ?? '').trim().slice(0, 120);
    const url = String(body.url ?? existing.url ?? '').trim().slice(0, 2000);
    const note = String(body.note ?? existing.note ?? '').trim().slice(0, 300);
    let thumbnailUrl = String(body.thumbnailUrl ?? existing.thumbnailUrl ?? '').trim().slice(0, 2000);

    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'נא להזין קישור תקין (http/https)' }, { status: 400 });
    }
    if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
      thumbnailUrl = '';
    }

    // קטגוריה אישית — חייבת להיות שייכת לאותו מטופל
    let categoryId = body.categoryId === null || body.categoryId === undefined || body.categoryId === ''
      ? null
      : String(body.categoryId);
    if (categoryId) {
      const cat = db.collection('clientSongCategories').findById(categoryId);
      if (!cat || cat.clientId !== client.id) categoryId = null;
    }

    const updated = songs.updateById(id, {
      title: title || deriveSongTitleFromUrl(url),
      url,
      note,
      categoryId,
      thumbnailUrl: thumbnailUrl || instantThumbnailFor(url) || '',
      updatedAt: new Date().toISOString()
    });

    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון השיר';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: RouteProps
) {
  try {
    await db.ensureLoaded();
    const { portalCode, id } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const songs = db.collection('songs');
    const existing = songs.findById(id);
    if (!existing || existing.clientId !== client.id) {
      return NextResponse.json({ error: 'השיר לא נמצא' }, { status: 404 });
    }

    songs.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת השיר';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
