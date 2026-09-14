import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const settings = db.getSettings();
    const auth = getAuthFromRequest(request);

    // Full settings for authenticated users
    if (auth && (auth.role === 'therapist' || auth.role === 'superadmin')) {
      return NextResponse.json(settings);
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
      'greenApiToken',
      'greenApiInstanceId',
      'greenApiUrl',
      'defaultMessageTemplate'
    ];

    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    }

    if (body.defaultMessageTemplate !== undefined) update.defaultMessageTemplate = body.defaultMessageTemplate;
    if (body.clinicArrivalInstructions !== undefined) update.clinicArrivalInstructions = body.clinicArrivalInstructions;

    const updated = db.updateSettings(update);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Settings PUT Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הגדרות' }, { status: 500 });
  }
}
