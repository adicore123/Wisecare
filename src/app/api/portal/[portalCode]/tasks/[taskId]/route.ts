import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; taskId: string }> }
) {
  try {
    const { portalCode, taskId } = await props.params;
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const task = db.collection('tasks').findById(taskId);
    if (!task || task.clientId !== client.id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק משימה זו' }, { status: 403 });
    }

    db.collection('tasks').deleteById(taskId);
    await db.flush();
    return NextResponse.json({ success: true, message: 'המשימה נמחקה בהצלחה' });
  } catch (error: any) {
    console.error('[Portal Delete Task Error]', error);
    return NextResponse.json({ error: 'שגיאה במחיקת משימה' }, { status: 500 });
  }
}
