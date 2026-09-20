import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeQuoteOptions } from '@/lib/quoteHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();

    // Strict Tenant Scope: therapists see only their own quotes
    const quotes = db.collection('quotes')
      .find(auth.role === 'therapist' ? { therapistId: auth.userId } : {})
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(quotes, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת ההצעות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const leadName = String(body.leadName || '').trim().slice(0, 80);
    const leadPhone = String(body.leadPhone || '').trim().slice(0, 20);
    const title = String(body.title || '').trim().slice(0, 120);
    const description = String(body.description || '').trim().slice(0, 4000);

    if (!leadName) {
      return NextResponse.json({ error: 'נא להזין את שם הלקוח הפוטנציאלי' }, { status: 400 });
    }
    if (!leadPhone || leadPhone.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ error: 'נא להזין מספר טלפון תקין של הלקוח' }, { status: 400 });
    }

    const normalized = normalizeQuoteOptions(body.options);
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    await db.ensureLoaded();

    const therapist = db.collection('users').findById(auth.userId) as any;

    const quote = db.collection('quotes').insertOne({
      therapistId: auth.userId,
      therapistName: therapist?.name || auth.username || '',
      leadName,
      leadPhone,
      title,
      description,
      options: normalized.options,
      status: 'draft',
      selectedOptionId: null,
      confirmTokenHash: null,
      sentAt: null,
      decidedAt: null,
      notificationStatus: 'none',
      notificationError: null
    });

    await db.flush();
    return NextResponse.json(quote, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת ההצעה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
