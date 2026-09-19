import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const therapistId = searchParams.get('therapistId');

    const tasksCollection = db.collection('tasks');
    const filter: Record<string, string> = {};
    if (clientId) filter.clientId = clientId;
    if (therapistId) filter.therapistId = therapistId;

    const tasks = tasksCollection.find(filter);
    await db.flush();
    return NextResponse.json(tasks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, therapistId, title, description, category, dueDate } = body;

    if (!clientId || !title) {
      return NextResponse.json({ error: 'מזהה לקוח וכותרת משימה הינם שדות חובה' }, { status: 400 });
    }

    const tasks = db.collection('tasks');
    const newTask = tasks.insertOne({
      clientId,
      therapistId: therapistId || auth.userId,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'תרגול ביתי',
      dueDate: dueDate || null,
      completed: false,
      completedAt: null,
      clientNotes: ''
    });

    await db.flush();
    return NextResponse.json(newTask, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
