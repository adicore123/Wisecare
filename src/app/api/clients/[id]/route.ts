import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizePhone, isTestPhoneNumber } from '@/lib/phoneHelpers';
import { hashPassword } from '@/lib/security';
import { sanitizeClient } from '@/lib/clientSanitize';
import { THEME_PALETTES } from '@/lib/theme';

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
      client: sanitizeClient(client),
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

    // Phone uniqueness is scoped per therapist — the same patient may exist under
    // another therapist, so only a duplicate under THIS client's therapist blocks.
    if (body.phone !== undefined) {
      const cleanPhone = normalizePhone(body.phone);
      if (!isTestPhoneNumber(cleanPhone)) {
        const existingClientWithPhone = clients.findOne((c: any) =>
          c.id !== id && !c.archived && c.therapistId === existing.therapistId && normalizePhone(c.phone) === cleanPhone
        );
        if (existingClientWithPhone) {
          return NextResponse.json({
            error: `מספר טלפון זה (${body.phone}) כבר רשום אצל אותו מטפל עבור לקוח אחר (${existingClientWithPhone.firstName} ${existingClientWithPhone.lastName}). למעט מספר הבדיקות (0509611808) לא ניתן לשייך אותו מספר לשני תיקים של אותו מטפל.`
          }, { status: 400 });
        }

        // Global anti-abuse cap: more than 3 occurrences of the same phone
        // system-wide is suspicious and rejected (test number exempt).
        const phoneOwners = clients.find({}).filter((c: any) =>
          c.id !== id && !c.archived && normalizePhone(c.phone) === cleanPhone
        );
        if (phoneOwners.length >= 3) {
          return NextResponse.json({
            error: `מספר טלפון זה (${body.phone}) רשום כבר עבור ${phoneOwners.length} לקוחות שונים במערכת. יותר מ-3 הופעות של אותו מספר נחשב לחשוד ואינו מורשה (למעט מספר הבדיקות 0509611808). במידה וזו טעות, נא לפנות למנהל המערכת.`
          }, { status: 400 });
        }
      }
    }

    // Check username uniqueness if username is updated
    if (body.username !== undefined && body.username.trim()) {
      const cleanUsername = body.username.trim().toLowerCase();
      const existingUsername = clients.findOne((c: any) => 
        c.id !== id && !c.archived && c.username && c.username.toLowerCase() === cleanUsername
      );
      if (existingUsername) {
        return NextResponse.json({
          error: `שם המשתמש "${body.username}" כבר תפוס במערכת. אנא בחר/י שם משתמש אחר.`
        }, { status: 400 });
      }
    }

    const allowedFields = ['firstName', 'lastName', 'phone', 'username', 'age', 'gender', 'notes', 'pin', 'portalEnabled', 'owesMoney', 'billingNotes', 'debts'];
    const updateData: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    });

    // The client portal's own palette — validated against the known palette ids
    if (body.themeId !== undefined) {
      updateData.themeId = THEME_PALETTES.some(p => p.id === body.themeId) ? body.themeId : 'sage';
    }

    if (body.password && String(body.password).trim()) {
      const rawPassword = String(body.password).trim();
      updateData.password = hashPassword(rawPassword);
      // Never persist the plaintext — the patient gets it via WhatsApp, not the DB
      updateData.initialPassword = '';
      updateData.hasPassword = true;
    }

    const updated = clients.updateById(id, updateData);
    await db.flush();
    return NextResponse.json(sanitizeClient(updated));
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
