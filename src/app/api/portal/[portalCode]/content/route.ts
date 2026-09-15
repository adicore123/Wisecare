import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
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
          'פריט תוכן'
    );

    const item = db.collection('contentItems').insertOne({
      therapistId: client.therapistId || null,
      title: finalTitle,
      description: description ? String(description).trim() : '',
      type: type || 'video',
      url: url ? String(url).trim() : '',
      imageData: imageData || '',
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Portal Add Content Error]', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תוכן למרחב האישי' }, { status: 500 });
  }
}
