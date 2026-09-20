import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeQuoteOptions } from '@/lib/quoteHelpers';

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
    await db.ensureLoaded();

    const quote = db.collection('quotes').findById(id);
    if (!quote) {
      return NextResponse.json({ error: 'הצעת המחיר לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope
    if (auth.role === 'therapist' && quote.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בהצעה זו' }, { status: 403 });
    }

    return NextResponse.json(quote);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת ההצעה';
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
    await db.ensureLoaded();

    const quotes = db.collection('quotes');
    const existing = quotes.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הצעת המחיר לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לערוך הצעה זו' }, { status: 403 });
    }

    // Once the lead decided, the quote is a record — edit requires a fresh copy
    if (existing.status === 'confirmed' || existing.status === 'declined') {
      return NextResponse.json(
        { error: 'לא ניתן לערוך הצעה שאושרה או נדחתה. ניתן לשכפל אותה להצעה חדשה.' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const update: Record<string, any> = {};

    if (body.leadName !== undefined) {
      const leadName = String(body.leadName || '').trim().slice(0, 80);
      if (!leadName) return NextResponse.json({ error: 'נא להזין את שם הלקוח הפוטנציאלי' }, { status: 400 });
      update.leadName = leadName;
    }
    if (body.leadPhone !== undefined) {
      const leadPhone = String(body.leadPhone || '').trim().slice(0, 20);
      if (leadPhone.replace(/\D/g, '').length < 9) {
        return NextResponse.json({ error: 'נא להזין מספר טלפון תקין של הלקוח' }, { status: 400 });
      }
      update.leadPhone = leadPhone;
    }
    if (body.title !== undefined) update.title = String(body.title || '').trim().slice(0, 120);
    if (body.description !== undefined) update.description = String(body.description || '').trim().slice(0, 4000);

    if (body.options !== undefined) {
      const normalized = normalizeQuoteOptions(body.options);
      if ('error' in normalized) {
        return NextResponse.json({ error: normalized.error }, { status: 400 });
      }
      update.options = normalized.options;
    }

    const updated = quotes.updateById(id, update);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון ההצעה';
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

    const quotes = db.collection('quotes');
    const existing = quotes.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הצעת המחיר לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope
    if (auth.role === 'therapist' && existing.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה למחוק הצעה זו' }, { status: 403 });
    }

    quotes.deleteById(id);

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'quote_deleted',
      targetId: id,
      targetType: 'quotes',
      details: { leadName: existing.leadName, title: existing.title, status: existing.status }
    });

    await db.flush();
    return NextResponse.json({ success: true, message: 'ההצעה נמחקה בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת ההצעה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
