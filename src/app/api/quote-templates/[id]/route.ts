import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { cleanMoney } from '@/lib/quoteHelpers';

interface RouteProps {
  params: Promise<{ id: string }>;
}

async function requireTemplate(request: NextRequest, props: RouteProps) {
  const auth = getAuthFromRequest(request);
  if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
    return { error: NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 }) };
  }

  const { id } = await props.params;
  await db.ensureLoaded();

  const templates = db.collection('quoteTemplates');
  const existing = templates.findById(id);
  if (!existing) {
    return { error: NextResponse.json({ error: 'התבנית לא נמצאה' }, { status: 404 }) };
  }

  // Strict Tenant Scope
  if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
    return { error: NextResponse.json({ error: 'אין הרשאה לגשת לתבנית זו' }, { status: 403 }) };
  }

  return { auth, templates, existing, id };
}

/**
 * Update a template — the therapist sets his default price once and every
 * quote created from the template is pre-filled with it (still overridable
 * per quote). Name is editable too; sessions/structure come from creation.
 */
export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const ctx = await requireTemplate(request, props);
    if (ctx.error) return ctx.error;

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name || '').trim().slice(0, 120);
      if (!name) {
        return NextResponse.json({ error: 'יש להזין שם לתבנית' }, { status: 400 });
      }
      update.name = name;
    }

    if (body.sessionPrice !== undefined) {
      const price = cleanMoney(body.sessionPrice);
      if (price === null) {
        return NextResponse.json({ error: 'מחיר למפגש אינו תקין' }, { status: 400 });
      }
      update.options = (ctx.existing.options || []).map((o: any) => ({ ...o, sessionPrice: price }));
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'לא נשלחו שדות לעדכון' }, { status: 400 });
    }

    const updated = ctx.templates.updateById(ctx.id, update);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון התבנית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const ctx = await requireTemplate(request, props);
    if (ctx.error) return ctx.error;

    ctx.templates.deleteById(ctx.id);
    await db.flush();
    return NextResponse.json({ success: true, message: 'התבנית נמחקה בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת התבנית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
