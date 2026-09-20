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
    const requestedTherapistId = searchParams.get('therapistId');

    await db.ensureLoaded();

    const tasksCollection = db.collection('tasks');
    const filter: Record<string, string> = {};
    if (clientId) filter.clientId = clientId;
    // Strict Tenant Scope: therapists always see only their own tasks
    filter.therapistId = auth.role === 'therapist' ? auth.userId : requestedTherapistId;
    if (!filter.therapistId) delete filter.therapistId;

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
    const { clientId, title, description, category, dueDate } = body;

    if (!clientId || !title) {
      return NextResponse.json({ error: 'מזהה לקוח וכותרת משימה הינם שדות חובה' }, { status: 400 });
    }

    await db.ensureLoaded();

    // Strict Tenant Scope: therapists may only create tasks for their own clients
    const client = db.collection('clients').findById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה ליצור משימה עבור לקוח זה' }, { status: 403 });
    }
    const therapistId = auth.role === 'superadmin' ? (body.therapistId || client.therapistId || auth.userId) : auth.userId;

    const tasks = db.collection('tasks');
    const newTask = tasks.insertOne({
      clientId,
      therapistId,
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
