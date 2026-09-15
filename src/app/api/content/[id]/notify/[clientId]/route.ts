import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { notifyClient } from '@/lib/contentHelpers';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; clientId: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id, clientId } = await props.params;
    const item = db.collection('contentItems').findById(id);
    const client = db.collection('clients').findById(clientId);
    const assignment = db.collection('contentAssignments').findOne({
      contentId: id,
      clientId
    });

    if (!item || !client || !assignment) {
      return NextResponse.json({ error: 'פריט, מטופל או שיוך לא נמצאו' }, { status: 404 });
    }

    const updated = await notifyClient(client, assignment, item);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליחת התראת תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
