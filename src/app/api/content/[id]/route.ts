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
    const items = db.collection('contentItems');
    const item = items.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'פריט התוכן לא נמצא' }, { status: 404 });
    }

    const assignments = db.collection('contentAssignments');
    const relatedAssignments = assignments.find({ contentId: item.id });
    relatedAssignments.forEach((assignment: any) => assignments.deleteById(assignment.id));
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
