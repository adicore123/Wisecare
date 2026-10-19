import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { instantThumbnailFor } from '@/lib/songMeta';

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * טיפול בבקשת שיר:
 *  - approve + categoryId: מוסיף את השיר להמלצות הצוות (לכל המטופלים) ומסמן אושרה
 *  - reject: מסמן נדחתה
 */
export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const requests = db.collection('songRequests');
    const existing = requests.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הבקשה לא נמצאה' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'approve') {
      const categoryId = String(body.categoryId || '').trim();
      if (!categoryId || !db.collection('songCategories').findById(categoryId)) {
        return NextResponse.json({ error: 'נא לבחור קטגוריה קיימת לשיר' }, { status: 400 });
      }
      // אישור כפול — לא מוסיפים את השיר פעמיים
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'בקשה זו כבר אושרה' }, { status: 409 });
      }

      const song = db.collection('recommendedSongs').insertOne({
        categoryId,
        title: String(body.title || existing.title).trim().slice(0, 120) || existing.title,
        url: existing.url,
        note: existing.note || '',
        thumbnailUrl: existing.thumbnailUrl || instantThumbnailFor(existing.url) || '',
        createdAt: new Date().toISOString()
      });
      const updated = requests.updateById(id, {
        status: 'approved',
        approvedSongId: song.id,
        approvedCategoryId: categoryId,
        handledAt: new Date().toISOString()
      });
      await db.flush();
      return NextResponse.json({ request: updated, song });
    }

    if (action === 'reject') {
      const updated = requests.updateById(id, {
        status: 'rejected',
        rejectionReason: String(body.reason || '').trim().slice(0, 200),
        handledAt: new Date().toISOString()
      });
      await db.flush();
      return NextResponse.json({ request: updated });
    }

    return NextResponse.json({ error: 'פעולה לא נתמכת (approve / reject)' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטיפול בבקשה';
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

    const requests = db.collection('songRequests');
    if (!requests.findById(id)) {
      return NextResponse.json({ error: 'הבקשה לא נמצאה' }, { status: 404 });
    }

    requests.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת הבקשה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
