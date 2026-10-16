import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { deriveSongTitleFromUrl, instantThumbnailFor } from '@/lib/songMeta';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const songs = db.collection('recommendedSongs');
    const existing = songs.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'השיר לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const categoryId = String(body.categoryId ?? existing.categoryId).trim();
    const url = String(body.url ?? existing.url).trim().slice(0, 2000);
    const title = String(body.title ?? existing.title ?? '').trim().slice(0, 120);
    const note = String(body.note ?? existing.note ?? '').trim().slice(0, 300);
    let thumbnailUrl = String(body.thumbnailUrl ?? existing.thumbnailUrl ?? '').trim().slice(0, 2000);

    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'נא להזין קישור תקין (http/https)' }, { status: 400 });
    }
    if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
      thumbnailUrl = '';
    }
    if (categoryId && !db.collection('songCategories').findById(categoryId)) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const updated = songs.updateById(id, {
      categoryId: categoryId || existing.categoryId,
      title: title || deriveSongTitleFromUrl(url),
      url,
      note,
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

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const songs = db.collection('recommendedSongs');
    if (!songs.findById(id)) {
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
