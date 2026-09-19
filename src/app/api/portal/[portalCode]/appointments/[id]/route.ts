import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; id: string }> }
) {
  try {
    const { portalCode, id } = await props.params;
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const appt = db.collection('appointments').findById(id);
    if (!appt || appt.clientId !== client.id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק פגישה זו' }, { status: 403 });
    }

    db.collection('appointments').deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true, message: 'הפגישה נמחקה בהצלחה' });
  } catch (error: any) {
    console.error('[Portal Delete Appointment Error]', error);
    return NextResponse.json({ error: 'שגיאה במחיקת פגישה' }, { status: 500 });
  }
}
