import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const settings = db.getSettings();
    const auth = getAuthFromRequest(request);

    if (auth && auth.role === 'superadmin') {
      await db.flush();
      return NextResponse.json(settings);
    }

    // Therapists get the operational settings WITHOUT the Green API credentials —
    // the WhatsApp token/instance is a platform secret, not a per-therapist setting
    if (auth && auth.role === 'therapist') {
      const {
        greenApiToken: _t,
        greenApiInstanceId: _i,
        greenApiUrl: _u,
        ...therapistSettings
      } = settings;
      await db.flush();
      return NextResponse.json(therapistSettings);
    }

    // Public safe subset for patient portal / unauthenticated visitors
    const publicSettings = {
      clinicName: settings.clinicName,
      therapistName: settings.therapistName,
      therapistTitle: settings.therapistTitle,
      clinicPhone: settings.clinicPhone,
      clinicEmail: settings.clinicEmail,
      clinicAddress: settings.clinicAddress,
      clinicCity: settings.clinicCity,
      clinicFloor: settings.clinicFloor,
      clinicArrivalInstructions: settings.clinicArrivalInstructions,
      clinicDescription: settings.clinicDescription,
      themeId: settings.themeId || 'sage',
      defaultMessageTemplate: settings.defaultMessageTemplate
    };

    await db.flush();
    return NextResponse.json(publicSettings);
  } catch (error: any) {
    console.error('[Settings GET Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת הגדרות המערכת' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();

    const body = await request.json().catch(() => ({}));
    const allowedFields = [
      'clinicName',
      'therapistName',
      'therapistTitle',
      'clinicPhone',
      'clinicEmail',
      'clinicAddress',
      'clinicCity',
      'clinicFloor',
      'clinicArrivalInstructions',
      'clinicDescription',
      'themeId',
      'defaultMessageTemplate'
    ];

    // Green API credentials control the clinic's shared WhatsApp identity —
    // superadmin only (whoever holds them can send as the clinic / re-pair the QR).
    if (auth.role === 'superadmin') {
      allowedFields.push('greenApiToken', 'greenApiInstanceId', 'greenApiUrl');
    }

    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    }

    if (body.defaultMessageTemplate !== undefined) update.defaultMessageTemplate = body.defaultMessageTemplate;
    if (body.clinicArrivalInstructions !== undefined) update.clinicArrivalInstructions = body.clinicArrivalInstructions;

    // Never echo credentials back to a therapist session
    const updated = db.updateSettings(update);
    await db.flush();
    if (auth.role !== 'superadmin') {
      const { greenApiToken: _t, greenApiInstanceId: _i, greenApiUrl: _u, ...safeUpdated } = updated;
      return NextResponse.json(safeUpdated);
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Settings PUT Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הגדרות' }, { status: 500 });
  }
}
