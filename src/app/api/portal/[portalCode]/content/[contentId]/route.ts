import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; contentId: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode, contentId } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const assignments = db.collection('contentAssignments').find({ contentId, clientId: client.id });
    for (const a of assignments) {
      db.collection('contentAssignments').deleteById(a.id);
    }

    await db.flush();

    try {
      revalidatePath(`/portal/${portalCode}`, 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'התוכן הוסר מהמרחב האישי' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: any) {
    console.error('[Portal Delete Content Error]', error);
    return NextResponse.json({ error: 'שגיאה בהסרת תוכן מהמרחב' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; contentId: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode, contentId } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { url, title, description, type, imageData, sourceName, category } = body;

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const assignment = db.collection('contentAssignments').findOne({ contentId, clientId: client.id });
    const contentItem = db.collection('contentItems').findById(contentId);
    if (!contentItem || (!assignment && contentItem.clientId !== client.id)) {
      return NextResponse.json({ error: 'אין הרשאה לערוך תוכן זה או שהפריט לא נמצא' }, { status: 403 });
    }

    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };
    if (title !== undefined) updateFields.title = String(title).trim();
    if (description !== undefined) updateFields.description = String(description).trim();
    if (url !== undefined) updateFields.url = String(url).trim();
    if (type !== undefined) updateFields.type = type;
    if (category !== undefined) updateFields.category = String(category).trim();
    if (imageData !== undefined) updateFields.imageData = imageData;
    if (sourceName !== undefined) updateFields.sourceName = String(sourceName).trim();

    const updated = db.collection('contentItems').updateById(contentId, updateFields);

    await db.flush();

    try {
      revalidatePath(`/portal/${portalCode}`, 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'התוכן עודכן בהצלחה',
      item: updated
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: any) {
    console.error('[Portal Update Content Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון התוכן' }, { status: 500 });
  }
}
