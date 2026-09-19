import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connectZoomUser, getZoomCallbackUri } from '@/services/zoom';
import { getBaseUrl } from '@/lib/urlHelpers';

/**
 * Zoom OAuth redirect target. Zoom returns here with ?code=...&state=userId
 * (or ?error=... if the user cancelled). We store the tokens on the therapist
 * and bounce them back to the Zoom management screen.
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const backTo = (state: string | null, ok: boolean) => {
    const user = state ? db.collection('users').findById(state) : null;
    const code = user?.loginCode || '';
    const base = code ? `${baseUrl}/crm/${code}/zoom` : `${baseUrl}/crm`;
    const sep = base.includes('?') ? '&' : '?';
    return NextResponse.redirect(`${base}${sep}${ok ? 'connected=1' : 'connect_failed=1'}`);
  };

  try {
    await db.ensureLoaded();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // our therapist userId
    const zoomError = searchParams.get('error');

    if (zoomError) {
      console.warn('[Zoom] OAuth cancelled by user:', zoomError);
      return backTo(state, false);
    }
    if (!code || !state) {
      return backTo(state, false);
    }

    const user = db.collection('users').findById(state);
    if (!user || (user.role !== 'therapist' && user.role !== 'superadmin')) {
      return backTo(state, false);
    }

    const callbackUri = getZoomCallbackUri(baseUrl);
    await connectZoomUser(state, code, callbackUri);
    return backTo(state, true);
  } catch (err: any) {
    console.error('[Zoom] callback error:', err?.message);
    return NextResponse.redirect(`${baseUrl}/crm?zoom_connect_failed=1`);
  }
}
