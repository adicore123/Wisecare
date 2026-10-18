import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { instantThumbnailFor } from '@/lib/songMeta';
import { normalizeRecommendedType } from '@/lib/recommendedContent';

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

    const items = db.collection('recommendedContent');
    const existing = items.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הפריט לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    // מסלול מהיר למתג השיתוף — מאפשר היפוך בודד בלי לשלוח את שאר השדות
    if (Object.keys(body).length === 1 && 'shared' in body) {
      const updated = items.updateById(id, {
        shared: Boolean(body.shared),
        updatedAt: new Date().toISOString()
      });
      await db.flush();
      return NextResponse.json(updated);
    }

    const categoryId = String(body.categoryId ?? existing.categoryId).trim();
    const url = String(body.url ?? existing.url).trim().slice(0, 2000);
    const title = String(body.title ?? existing.title ?? '').trim().slice(0, 160);
    const description = String(body.description ?? existing.description ?? '').trim().slice(0, 1000);
    const sourceName = String(body.sourceName ?? existing.sourceName ?? '').trim().slice(0, 120);
    let thumbnailUrl = String(body.thumbnailUrl ?? existing.thumbnailUrl ?? '').trim().slice(0, 2000);

    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: 'נא להזין קישור תקין (http/https)' }, { status: 400 });
    }
    if (thumbnailUrl && !/^https?:\/\/.+/i.test(thumbnailUrl)) {
      thumbnailUrl = '';
    }
    if (categoryId && !db.collection('contentCategories').findById(categoryId)) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const updated = items.updateById(id, {
      categoryId: categoryId || existing.categoryId,
      type: normalizeRecommendedType(body.type ?? existing.type, url),
      title: title || 'קישור מומלץ',
      url,
      description,
      sourceName,
      thumbnailUrl: thumbnailUrl || instantThumbnailFor(url) || '',
      shared: body.shared !== undefined ? Boolean(body.shared) : Boolean(existing.shared),
      updatedAt: new Date().toISOString()
    });
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הפריט';
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

    const items = db.collection('recommendedContent');
    if (!items.findById(id)) {
      return NextResponse.json({ error: 'הפריט לא נמצא' }, { status: 404 });
    }

    items.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת הפריט';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
