import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    const { portalCode } = await props.params;
    const clients = db.collection('clients');
    const insights = db.collection('insights');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const clientInsights = insights.find({ clientId: client.id });
    clientInsights.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(clientInsights);
  } catch (error: any) {
    console.error('[Portal Insights Get Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת תובנות' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    const { portalCode } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { title, content, mood, intensity } = body;

    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: 'נא למלא תוכן לתובנה או למחשבה' }, { status: 400 });
    }

    const clients = db.collection('clients');
    const insights = db.collection('insights');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    const newInsight = insights.insertOne({
      clientId: client.id,
      therapistId: client.therapistId,
      portalCode,
      title: title ? String(title).trim() : 'תובנה שבועית',
      content: String(content).trim(),
      mood: mood || 'רגיל',
      intensity: Number(intensity) || 5,
      recordedDate: dateStr,
      recordedTime: timeStr,
      createdAt: now.toISOString()
    });

    return NextResponse.json(newInsight, { status: 201 });
  } catch (error: any) {
    console.error('[Portal Create Insight Error]', error);
    return NextResponse.json({ error: 'שגיאה בשמירת תובנה' }, { status: 500 });
  }
}
