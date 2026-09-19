import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { checkInstanceStatus } from '@/services/greenApi';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const settings = db.getSettings();
    let greenApiStatus = null;
    try {
      greenApiStatus = await checkInstanceStatus();
    } catch (e: any) {
      greenApiStatus = { status: 'error', message: e.message };
    }

    await db.flush();
    return NextResponse.json({
      settings,
      greenApiStatus
    });
  } catch (err: any) {
    console.error('[SuperAdmin Settings Load Error]', err);
    return NextResponse.json({ error: 'שגיאה בטעינת הגדרות SuperAdmin' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const body = await request.json().catch(() => ({}));
    const allowedKeys = [
      'autoSendTherapistInviteWhatsApp',
      'therapistInviteMessageTemplate',
      'autoSendContentNotificationWhatsApp',
      'articleNotificationTemplate',
      'mediaNotificationTemplate',
      'greenApiInstanceId',
      'greenApiToken',
      'greenApiUrl',
      'clinicName'
    ];

    const updates: Record<string, any> = {};
    allowedKeys.forEach(k => {
      if (body[k] !== undefined) {
        updates[k] = body[k];
      }
    });

    const updated = db.updateSettings(updates);
    await db.flush();
    return NextResponse.json({
      success: true,
      message: 'הגדרות SuperAdmin עודכנו בהצלחה',
      settings: updated
    });
  } catch (err: any) {
    console.error('[SuperAdmin Settings Update Error]', err);
    return NextResponse.json({ error: 'שגיאה בעדכון הגדרות SuperAdmin' }, { status: 500 });
  }
}
