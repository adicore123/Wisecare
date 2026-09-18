import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { buildZoomAuthorizeUrl, getZoomCallbackUri, isZoomOAuthConfigured } from '@/services/zoom';
import { getBaseUrl } from '@/lib/urlHelpers';

/** Kicks off the "Sign in with Zoom" flow: redirects the therapist to Zoom's consent page. */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }
    if (!isZoomOAuthConfigured()) {
      return NextResponse.json({ error: 'חיבור Zoom טרם הוגדר במערכת — יש להזין את פרטי האפליקציה בהגדרת המערכת למעלה' }, { status: 400 });
    }

    await db.ensureLoaded();
    const callbackUri = getZoomCallbackUri(getBaseUrl(request));
    const authorizeUrl = buildZoomAuthorizeUrl(callbackUri, auth.userId);
    return NextResponse.redirect(authorizeUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בפתיחת חיבור Zoom';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
