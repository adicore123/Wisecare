import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeQuoteOptions } from '@/lib/quoteHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generatePortalCode(firstName: string): string {
  const cleanName = (firstName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '') || 'client';
  return `${cleanName}-${crypto.randomInt(100000, 999999)}`;
}

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

    let leadName = String(body.leadName || '').trim().slice(0, 80);
    let leadPhone = String(body.leadPhone || '').trim().slice(0, 20);
    const title = String(body.title || '').trim().slice(0, 120);
    const description = String(body.description || '').trim().slice(0, 4000);

    await db.ensureLoaded();

    // ---- Link the quote to a client record in the system ----
    let clientId: string | null = null;

    if (body.clientId) {
      const client = db.collection('clients').findById(String(body.clientId));
      if (!client) {
        return NextResponse.json({ error: 'הלקוח לא נמצא במערכת' }, { status: 404 });
      }
      // Strict Tenant Scope
      if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
        return NextResponse.json({ error: 'אין הרשאה לשייך הצעה ללקוח זה' }, { status: 403 });
      }
      clientId = client.id;
      leadName = `${client.firstName} ${client.lastName || ''}`.trim();
      leadPhone = String(client.phone || '').trim();
    } else if (body.newClient && String(body.newClient.firstName || '').trim() && String(body.newClient.phone || '').trim()) {
      // Create a minimal client record straight from the quote module. No credentials
      // are generated or messaged — this is still a potential client; the personal
      // space onboarding happens later, when they actually join.
      const firstName = String(body.newClient.firstName).trim().slice(0, 60);
      const lastName = String(body.newClient.lastName || '').trim().slice(0, 60);
      const phone = String(body.newClient.phone).trim().slice(0, 20);
      const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const created = db.collection('clients').insertOne({
        therapistId: auth.userId,
        firstName,
        lastName,
        phone,
        username: cleanFirst ? `${cleanFirst}${crypto.randomInt(100, 999)}` : `client${crypto.randomInt(1000, 9999)}`,
        password: '',
        initialPassword: '',
        hasPassword: false,
        clientSetsCredentials: false,
        portalEnabled: true,
        portalCode: generatePortalCode(firstName),
        notes: 'נוצר אוטומטית ממודול הצעות מחיר',
        whatsappStatus: 'not_sent',
        lastSentAt: null
      });
      clientId = created.id;
      leadName = `${firstName} ${lastName}`.trim();
      leadPhone = phone;
    }

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

    const therapist = db.collection('users').findById(auth.userId) as any;

    const quote = db.collection('quotes').insertOne({
      therapistId: auth.userId,
      therapistName: therapist?.name || auth.username || '',
      clientId,
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
