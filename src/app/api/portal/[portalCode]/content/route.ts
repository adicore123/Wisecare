import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { materializeImageDataField } from '@/services/contentImage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


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

    const body = await request.json().catch(() => ({}));
    const { url, title, description, type = 'video', imageData, sourceName, category = 'אישי' } = body;

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    if (!url && !description && !imageData) {
      return NextResponse.json({ error: 'נא להזין קישור, תיאור או תמונה' }, { status: 400 });
    }

    const finalTitle = (title && String(title).trim()) ? String(title).trim() : (
      type === 'video' ? `סרטון (${sourceName || 'מהרשת'})` :
        type === 'post' ? `פוסט (${sourceName || 'מרשת חברתית'})` :
          type === 'article' ? 'מאמר אישי' :
            'פריט תוכן'
    );

    // Self-host remote thumbnails so signed CDN links can't rot later
    const storedImageData = await materializeImageDataField(imageData);

    const item = db.collection('contentItems').insertOne({
      therapistId: client.therapistId || null,
      title: finalTitle,
      description: description ? String(description).trim() : '',
      type: type || 'video',
      url: url ? String(url).trim() : '',
      imageData: storedImageData || '',
      sourceName: sourceName ? String(sourceName).trim() : '',
      category: category ? String(category).trim() : 'אישי',
      customNote: '',
      archived: false,
      createdAt: new Date().toISOString()
    });

    const assignment = db.collection('contentAssignments').insertOne({
      contentId: item.id,
      clientId: client.id,
      notificationStatus: 'none',
      createdAt: new Date().toISOString()
    });

    await db.flush();

    try {
      revalidatePath(`/portal/${portalCode}`, 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    return NextResponse.json({
      id: item.id,
      assignmentId: assignment.id,
      title: item.title,
      description: item.description,
      type: item.type,
      url: item.url,
      imageData: item.imageData,
      category: item.category,
      sourceName: item.sourceName,
      assignedAt: assignment.createdAt
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: any) {
    console.error('[Portal Add Content Error]', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תוכן למרחב האישי' }, { status: 500 });
  }
}
