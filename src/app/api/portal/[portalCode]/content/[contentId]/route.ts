import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; contentId: string }> }
) {
  try {
    const { portalCode, contentId } = await props.params;
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const assignments = db.collection('contentAssignments').find({ contentId, clientId: client.id });
    for (const a of assignments) {
      db.collection('contentAssignments').deleteById(a.id);
    }

    return NextResponse.json({ success: true, message: 'התוכן הוסר מהמרחב האישי' });
  } catch (error: any) {
    console.error('[Portal Delete Content Error]', error);
    return NextResponse.json({ error: 'שגיאה בהסרת תוכן מהמרחב' }, { status: 500 });
  }
}
