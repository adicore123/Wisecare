import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  getZoomS2SCreds, isZoomS2SConfigured, isZoomOAuthConfigured, isZoomSdkConfigured,
  isUserZoomConnected, getConnectedZoomEmail, disconnectZoomUser, getZoomCallbackUri
} from '@/services/zoom';
import { getBaseUrl } from '@/lib/urlHelpers';

const ALL_ZOOM_FIELDS = [
  'zoomAccountId', 'zoomClientId', 'zoomClientSecret',          // S2S — direct clinic account
  'zoomOAuthClientId', 'zoomOAuthClientSecret',                // user OAuth (one-click sign in)
  'zoomSdkKey', 'zoomSdkSecret'                                // Meeting SDK (embedded calls)
];

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const s2s = isZoomS2SConfigured();
    const userConnected = isUserZoomConnected(auth.userId);
    const creds = getZoomS2SCreds();

    return NextResponse.json({
      // Mode status
      connected: s2s || userConnected,
      connectedMode: s2s ? 's2s' : (userConnected ? 'personal' : 'none'),
      connectedEmail: userConnected ? getConnectedZoomEmail(auth.userId) : '',
      s2sConfigured: s2s,
      oauthConfigured: isZoomOAuthConfigured(),
      sdkConfigured: isZoomSdkConfigured(),
      isSuperadmin: auth.role === 'superadmin',
      callbackUri: auth.role === 'superadmin' ? getZoomCallbackUri(getBaseUrl(request)) : undefined,
      maskedS2S: auth.role === 'superadmin' ? {
        accountId: creds.accountId ? `${creds.accountId.slice(0, 4)}••••` : '',
        clientId: creds.clientId ? `${creds.clientId.slice(0, 4)}••••` : ''
      } : undefined
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת מצב החיבור';
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

    // Every user can disconnect their personal Zoom account
    if (body.action === 'disconnect') {
      disconnectZoomUser(auth.userId);
      await db.flush();
      return NextResponse.json({ success: true, message: 'חשבון הזום האישי שלך נותק' });
    }

    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'הגדרת החיבור מורשית למנהל הראשי בלבד' }, { status: 403 });
    }

    // Superadmin: clear all system-level Zoom settings
    if (body.action === 'clearSystemConfig') {
      db.updateSettings({
        zoomAccountId: '', zoomClientId: '', zoomClientSecret: '',
        zoomOAuthClientId: '', zoomOAuthClientSecret: '',
        zoomSdkKey: '', zoomSdkSecret: ''
      });
      await db.flush();
      return NextResponse.json({ success: true, message: 'הגדרת המערכת נמחקה' });
    }

    // Superadmin: save any of the system-level credentials (S2S / OAuth / SDK)
    if (body.action === 'saveSystemConfig') {
      const update: Record<string, string> = {};
      for (const field of ALL_ZOOM_FIELDS) {
        if (typeof body[field] === 'string' && body[field].trim()) {
          update[field] = body[field].trim();
        }
      }
      if (!Object.keys(update).length) {
        return NextResponse.json({ error: 'לא הוזנו פרטים לשמירה' }, { status: 400 });
      }
      db.updateSettings(update);
      await db.flush();
      return NextResponse.json({ success: true, message: 'פרטי החיבור נשמרו בהצלחה' });
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הגדרות הזום';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
