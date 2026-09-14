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
    const { taskId, completed, clientNotes } = body;

    const clients = db.collection('clients');
    const tasks = db.collection('tasks');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const task = tasks.findById(taskId);
    if (!task || task.clientId !== client.id) {
      return NextResponse.json({ error: 'אין הרשאה לעדכן משימה זו' }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (completed !== undefined) {
      updateData.completed = Boolean(completed);
      updateData.completedAt = completed ? new Date().toISOString() : null;
    }
    if (clientNotes !== undefined) {
      updateData.clientNotes = String(clientNotes).trim();
    }

    const updated = tasks.updateById(taskId, updateData);
    await db.flush();

    return NextResponse.json({
      success: true,
      message: 'סטטוס המשימה עודכן בהצלחה במרחב הטיפולי',
      task: updated
    });
  } catch (error: any) {
    console.error('[Portal Task Status Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון סטטוס משימה' }, { status: 500 });
  }
}
