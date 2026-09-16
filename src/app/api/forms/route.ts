import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function cleanStr(value: unknown, maxLength = 4000): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeTemplate(body: any) {
  const sections = Array.isArray(body.sections)
    ? body.sections.slice(0, 30).map((s: any) => ({
        heading: cleanStr(s?.heading, 200),
        body: cleanStr(s?.body, 6000)
      })).filter((s: any) => s.heading || s.body)
    : [];

  const requiredFields = Array.isArray(body.requiredFields)
    ? body.requiredFields.slice(0, 20).map((f: any) => ({
        label: cleanStr(f?.label, 160),
        type: ['checkbox', 'text', 'date'].includes(f?.type) ? f.type : 'checkbox'
      })).filter((f: any) => f.label)
    : [];

  return {
    name: cleanStr(body.name, 120),
    title: cleanStr(body.title, 200),
    introText: cleanStr(body.introText, 6000),
    sections,
    requiredFields,
    footerText: cleanStr(body.footerText, 2000),
    requiresSignature: body.requiresSignature !== false,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(String(body.accentColor || '')) ? body.accentColor : '#0d9488',
    active: body.active !== false
  };
}

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const templates = db.collection('formTemplates')
      .find({ therapistId: auth.userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const signatures = db.collection('formSignatures').find({ therapistId: auth.userId });
    const countsByTemplate: Record<string, { sent: number; signed: number }> = {};
    signatures.forEach((s: any) => {
      const entry = countsByTemplate[s.formTemplateId] || { sent: 0, signed: 0 };
      entry.sent += 1;
      if (s.status === 'signed') entry.signed += 1;
      countsByTemplate[s.formTemplateId] = entry;
    });

    return NextResponse.json(templates.map((t: any) => ({
      ...t,
      sentCount: countsByTemplate[t.id]?.sent || 0,
      signedCount: countsByTemplate[t.id]?.signed || 0
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הטפסים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const data = normalizeTemplate(body);
    if (!data.name) {
      return NextResponse.json({ error: 'נא להזין שם לטופס' }, { status: 400 });
    }
    if (!data.title) {
      return NextResponse.json({ error: 'נא להזין כותרת שתוצג ללקוח' }, { status: 400 });
    }
    if (!data.introText && data.sections.length === 0) {
      return NextResponse.json({ error: 'הטופס ריק — יש להוסיף טקסט פתיחה או סעיפים' }, { status: 400 });
    }

    const template = db.collection('formTemplates').insertOne({
      therapistId: auth.userId,
      ...data,
      archived: false
    });

    await db.flush();
    return NextResponse.json(template, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת הטופס';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
