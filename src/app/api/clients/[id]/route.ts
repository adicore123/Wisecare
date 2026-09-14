import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const client = db.collection('clients').findById(id);

    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard: A therapist cannot access another therapist's client
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לגשת למטופל זה' }, { status: 403 });
    }

    const therapist = db.collection('users').findById(client.therapistId);
    const tasks = db.collection('tasks').find({ clientId: client.id });
    const insights = db.collection('insights').find({ clientId: client.id });
    insights.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      client,
      therapist: therapist ? {
        name: therapist.name,
        title: therapist.title,
        phone: therapist.phone,
        email: therapist.email
      } : null,
      tasks,
      insights
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const clients = db.collection('clients');

    const existing = clients.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard: A therapist cannot modify another therapist's client
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לערוך מטופל זה' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['firstName', 'lastName', 'phone', 'age', 'gender', 'notes', 'pin'];
    const updateData: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const updated = clients.updateById(id, updateData);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const clients = db.collection('clients');
    const client = clients.findById(id);

    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard: A therapist cannot delete another therapist's client
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה למחוק מטופל זה' }, { status: 403 });
    }

    // Medical Compliance & Soft Delete Archiving:
    // Retain records in encrypted archive to comply with Patient Rights & Medical Record Laws
    clients.softDelete(id);

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'archive_client',
      targetId: id,
      targetType: 'client',
      details: {
        clientName: `${client.firstName} ${client.lastName}`,
        phone: client.phone
      }
    });

    await db.flush();

    return NextResponse.json({
      success: true,
      message: 'תיק המטופל הועבר לארכיון מאובטח בהתאם לחוק שמירת רשומות רפואיות'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
