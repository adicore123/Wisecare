import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { deriveSongTitleFromUrl, instantThumbnailFor } from '@/lib/songMeta';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const songs = db
      .collection('recommendedSongs')
      .find({})
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json(songs, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת השירים המומלצים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const categoryId = String(body.categoryId || '').trim();
    const url = String(body.url || '').trim().slice(0, 2000);
    const title = String(body.title || '').trim().slice(0, 120);
    const note = String(body.note || '').trim().slice(0, 300);
    let thumbnailUrl = String(body.thumbnailUrl || '').trim().slice(0, 2000);

    if (!categoryId) {
      return NextResponse.json({ error: 'נא לבחור קטגוריה' }, { status: 400 });
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'נא להזין קישור תקין (http/https)' }, { status: 400 });
    }
    if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
      thumbnailUrl = '';
    }

    await db.ensureLoaded();
    const category = db.collection('songCategories').findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const song = db.collection('recommendedSongs').insertOne({
      categoryId,
      title: title || deriveSongTitleFromUrl(url),
      url,
      note,
      thumbnailUrl: thumbnailUrl || instantThumbnailFor(url) || '',
      createdAt: new Date().toISOString()
    });
    await db.flush();
    return NextResponse.json(song, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהוספת השיר המומלץ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
