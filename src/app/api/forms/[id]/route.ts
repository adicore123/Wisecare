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

  const update: Record<string, any> = {};
  if (body.name !== undefined) update.name = cleanStr(body.name, 120);
  if (body.title !== undefined) update.title = cleanStr(body.title, 200);
  if (body.introText !== undefined) update.introText = cleanStr(body.introText, 6000);
  if (body.sections !== undefined) update.sections = sections;
  if (body.requiredFields !== undefined) update.requiredFields = requiredFields;
  if (body.footerText !== undefined) update.footerText = cleanStr(body.footerText, 2000);
  if (body.requiresSignature !== undefined) update.requiresSignature = Boolean(body.requiresSignature);
  if (body.accentColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.accentColor))) {
    update.accentColor = body.accentColor;
  }
  if (body.active !== undefined) update.active = Boolean(body.active);
  return update;
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const templates = db.collection('formTemplates');
    const template = templates.findById(id);
    if (!template || template.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'הטופס לא נמצא או שאין הרשאה' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const update = normalizeTemplate(body);
    const updated = templates.updateById(id, update);
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הטופס';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const templates = db.collection('formTemplates');
    const template = templates.findById(id);
    if (!template || template.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'הטופס לא נמצא או שאין הרשאה' }, { status: 404 });
    }

    const signatures = db.collection('formSignatures').count({ formTemplateId: id });
    if (signatures > 0) {
      // Preserve the legal record — archive instead of destroying signed history
      templates.updateById(id, { active: false, archived: true });
      await db.flush();
      return NextResponse.json({
        success: true,
        archived: true,
        message: 'לטופס קיימות חתימות — הוא הועבר לארכיון כדי לשמר רישום משפטי'
      });
    }

    templates.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true, archived: false, message: 'הטופס נמחק' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת הטופס';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
