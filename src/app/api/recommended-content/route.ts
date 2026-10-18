import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { instantThumbnailFor } from '@/lib/songMeta';
import { normalizeRecommendedType } from '@/lib/recommendedContent';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const items = db
      .collection('recommendedContent')
      .find({})
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת התוכן המומלץ';
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
    const title = String(body.title || '').trim().slice(0, 160);
    const description = String(body.description || '').trim().slice(0, 1000);
    const sourceName = String(body.sourceName || '').trim().slice(0, 120);
    let thumbnailUrl = String(body.thumbnailUrl || '').trim().slice(0, 2000);
    const shared = body.shared !== false; // פריט שנוסף ידנית מיועד לשיתוף כברירת מחדל

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
    const category = db.collection('contentCategories').findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const item = db.collection('recommendedContent').insertOne({
      categoryId,
      type: normalizeRecommendedType(body.type, url),
      title: title || 'קישור מומלץ',
      url,
      description,
      sourceName,
      thumbnailUrl: thumbnailUrl || instantThumbnailFor(url) || '',
      shared,
      createdAt: new Date().toISOString()
    });
    await db.flush();
    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהוספת התוכן המומלץ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
