import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; id: string }> }
) {
  try {
    const { portalCode, id } = await props.params;
    const clients = db.collection('clients');
    const insights = db.collection('insights');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const insight = insights.findById(id);
    if (!insight || insight.clientId !== client.id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק תובנה זו' }, { status: 403 });
    }

    insights.deleteById(id);
    return NextResponse.json({ success: true, message: 'התובנה נמחקה' });
  } catch (error: any) {
    console.error('[Portal Delete Insight Error]', error);
    return NextResponse.json({ error: 'שגיאה במחיקת תובנה' }, { status: 500 });
  }
}
