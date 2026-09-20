import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeTemplateOptions, defaultQuoteTemplates } from '@/lib/quoteHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();

    const templates = db.collection('quoteTemplates');

    // First use: seed the standard templates (טיפול בודד / 5 / 10 / 15 מפגשים)
    let existing = templates.find({ therapistId: auth.userId });
    if (existing.length === 0) {
      for (const tpl of defaultQuoteTemplates(auth.userId)) {
        templates.insertOne({ ...tpl, createdAt: new Date().toISOString() });
      }
      await db.flush();
      existing = templates.find({ therapistId: auth.userId });
    }

    existing.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json(existing, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת התבניות';
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

    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) {
      return NextResponse.json({ error: 'נא לתת שם לתבנית' }, { status: 400 });
    }

    const normalized = normalizeTemplateOptions(body.options);
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    await db.ensureLoaded();

    const template = db.collection('quoteTemplates').insertOne({
      therapistId: auth.userId,
      name,
      options: normalized.options,
      createdAt: new Date().toISOString()
    });

    await db.flush();
    return NextResponse.json(template, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשמירת התבנית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
