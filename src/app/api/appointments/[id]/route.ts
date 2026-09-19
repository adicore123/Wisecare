import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const appointment = db.collection('appointments').findById(id);

    if (!appointment) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    await db.flush();
    return NextResponse.json(appointment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת פרטי התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const existing = db.collection('appointments').findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    const body = await request.json();

    const allowed = [
      'date', 'time', 'durationMinutes', 'type', 'typeName',
      'location', 'status', 'notes'
    ];

    const updates: Record<string, any> = {};
    allowed.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    const updated = db.collection('appointments').updateById(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const existing = db.collection('appointments').findById(id);

    const success = db.collection('appointments').deleteById(id);

    if (!success) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    await db.flush();
    return NextResponse.json({ message: 'תור נמחק בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
