import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  ALLOWED_TYPES,
  cleanText,
  cleanUrl,
  enrichItems,
  validateImageData
} from '@/lib/contentHelpers';
import { materializeImageDataField } from '@/services/contentImage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const item = db.collection('contentItems').findById(id);
    if (!item) {
      return NextResponse.json({ error: 'פריט התוכן לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope: therapists may only view their own content
    if (auth.role === 'therapist' && item.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בפריט זה' }, { status: 403 });
    }

    const enriched = enrichItems([item]);
    return NextResponse.json(enriched[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת פריט תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const item = db.collection('contentItems').findById(id);
    if (!item) {
      return NextResponse.json({ error: 'פריט התוכן לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope: therapists may only edit their own content
    if (auth.role === 'therapist' && item.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לערוך פריט זה' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = cleanText(body.title, 160);
    if (body.description !== undefined) updateData.description = cleanText(body.description, 12000);
    if (body.category !== undefined) updateData.category = cleanText(body.category, 80) || 'כללי';
    if (body.sourceName !== undefined) updateData.sourceName = cleanText(body.sourceName, 120);
    if (body.type && ALLOWED_TYPES.has(body.type)) updateData.type = body.type;
    if (body.url !== undefined) updateData.url = cleanUrl(body.url);
    if (body.imageData !== undefined) {
      const validated = validateImageData(body.imageData);
      if (validated === null) {
        return NextResponse.json(
          { error: 'התמונה אינה תקינה או גדולה מדי. ניתן להעלות תמונה עד 2MB' },
          { status: 413 }
        );
      }
      // Self-host remote thumbnails so signed CDN links can't rot later
      updateData.imageData = await materializeImageDataField(validated);
    }

    const updated = db.collection('contentItems').updateById(id, updateData);
    await db.flush();

    try {
      revalidatePath('/crm/[code]/content', 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    const enriched = enrichItems([updated]);
    return NextResponse.json(enriched[0], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון פריט תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    let item = db.collection('contentItems').findById(id);
    if (!item) {
      // This serverless instance may hold a stale snapshot (another instance created
      // the item moments ago) — pull fresh data from MongoDB before deciding.
      await db.ensureLoaded(true).catch(() => false);
      item = db.collection('contentItems').findById(id);
    }
    if (!item) {
      // Still absent after a fresh sync → it is already gone. Deleting is idempotent:
      // report success so the UI can drop the stale row instead of erroring.
      return NextResponse.json({ success: true, alreadyDeleted: true, message: 'הפריט כבר נמחק' }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
      });
    }

    // Strict Tenant Scope: therapists may only delete their own content (superadmin may delete any)
    if (auth.role === 'therapist' && item.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה למחוק פריט זה' }, { status: 403 });
    }

    // Re-acquire collection handles AFTER any forced sync (sync replaces the arrays)
    const items = db.collection('contentItems');
    const assignments = db.collection('contentAssignments');
    const relatedAssignments = assignments.find({ contentId: item.id });
    relatedAssignments.forEach((assignment: any) => assignments.deleteById(assignment.id));
    // Catch assignments created on other instances that this snapshot hasn't seen yet
    db.queueRemoteWrite('contentAssignments', 'deleteMany', col => col.deleteMany({ contentId: item.id }));
    items.deleteById(item.id);

    await db.flush();

    try {
      revalidatePath('/crm/[code]/content', 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'הפריט נמחק מהספרייה והוסר מכל המטופלים' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת פריט תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
