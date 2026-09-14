import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; clientId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id, clientId } = await props.params;
    const assignment = db.collection('contentAssignments').findOne({
      contentId: id,
      clientId
    });

    if (!assignment) {
      return NextResponse.json({ error: 'השיוך למטופל לא נמצא' }, { status: 404 });
    }

    db.collection('contentAssignments').deleteById(assignment.id);
    return NextResponse.json({ success: true, message: 'התוכן הוסר מהמטופל שנבחר' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהסרת שיוך תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
