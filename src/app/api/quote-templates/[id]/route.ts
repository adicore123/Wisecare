import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const templates = db.collection('quoteTemplates');
    const existing = templates.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'התבנית לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה למחוק תבנית זו' }, { status: 403 });
    }

    templates.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true, message: 'התבנית נמחקה בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת התבנית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
