import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();
    const tasks = db.collection('tasks');

    const existing = tasks.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'משימה לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope: therapists may only update their own tasks
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לעדכן משימה זו' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'description', 'category', 'dueDate', 'completed', 'clientNotes'];
    const updateData: Record<string, any> = {};

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    if (body.completed !== undefined) {
      updateData.completedAt = body.completed ? new Date().toISOString() : null;
    }

    const updated = tasks.updateById(id, updateData);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
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
    await db.ensureLoaded();
    const tasks = db.collection('tasks');

    // Strict Tenant Scope: therapists may only delete their own tasks
    const existing = tasks.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'משימה לא נמצאה למחיקה' }, { status: 404 });
    }
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה למחוק משימה זו' }, { status: 403 });
    }

    const success = tasks.deleteById(id);

    await db.flush();
    return NextResponse.json({ message: 'משימה נמחקה בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
