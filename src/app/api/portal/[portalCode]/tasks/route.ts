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
    const { title, description, category, dueDate } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'נא להזין כותרת למשימה או לתרגול' }, { status: 400 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const newTask = db.collection('tasks').insertOne({
      clientId: client.id,
      therapistId: client.therapistId || null,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      category: category ? String(category).trim() : 'אישי',
      dueDate: dueDate || null,
      completed: false,
      isSelfCreated: true,
      clientNotes: '',
      createdAt: new Date().toISOString()
    });

    await db.flush();

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error('[Portal Create Task Error]', error);
    return NextResponse.json({ error: 'שגיאה ביצירת משימה אישית' }, { status: 500 });
  }
}
