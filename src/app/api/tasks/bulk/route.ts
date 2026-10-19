import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { newBroadcastId } from '@/lib/broadcastTasks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * שליחת משימה אחת לכמה מרחבים אישיים בבת אחת (שידור).
 * סופראדמין בלבד; כל משימה נוצרת עם דגלי "משימה שקיבלתי"
 * (isSelfCreated:false + assignedBy:'superadmin') ושטיפה אחת ל-DB.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { clientIds, title, description, category, dueDate } = body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'נא לבחור לפחות מרחב אחד' }, { status: 400 });
    }
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'נא לתת כותרת למשימה' }, { status: 400 });
    }

    await db.ensureLoaded();
    const clientsCol = db.collection('clients');
    const tasks = db.collection('tasks');

    // אצוית שידור — מזהה אחד לכל העותקים; נרשמים עתידיים מקבלים אותה אוטומטית
    const broadcastId = newBroadcastId();
    let created = 0;
    const skipped: string[] = [];
    for (const rawId of clientIds) {
      const clientId = String(rawId);
      const client = clientsCol.findById(clientId);
      if (!client) {
        skipped.push(clientId);
        continue;
      }
      tasks.insertOne({
        clientId,
        therapistId: client.therapistId || auth.userId,
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        category: category || 'תרגול ביתי',
        dueDate: dueDate || null,
        completed: false,
        completedAt: null,
        clientNotes: '',
        isSelfCreated: false,
        assignedBy: 'superadmin',
        broadcastId,
        createdAt: new Date().toISOString()
      });
      created++;
    }

    await db.flush();
    return NextResponse.json({ success: true, created, skipped: skipped.length }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
