import axios from 'axios';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

/**
 * Official Zoom integration — "Sign in with Zoom" (user-level OAuth):
 *  - The system OAuth app (Client ID + Client Secret) is configured once by the
 *    superadmin; every therapist connects their own Zoom account with one click
 *    (Zoom's login supports Google/SSO/password, and signup for new users).
 *  - Access/refresh tokens are stored on the therapist's user record and
 *    refreshed automatically.
 *  - Meeting SDK (SDK Key/Secret, also system-level) embeds the actual meeting
 *    inside WiseCare; without it clients/therapists fall back to the Zoom app.
 */

/* ============================ system-level config ============================ */

export function getZoomOAuthConfig(): { clientId: string; clientSecret: string } {
  const settings = db.getSettings();
  return {
    clientId: (settings.zoomOAuthClientId || process.env.ZOOM_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: (settings.zoomOAuthClientSecret || process.env.ZOOM_OAUTH_CLIENT_SECRET || '').trim()
  };
}

export function isZoomOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getZoomOAuthConfig();
  return Boolean(clientId && clientSecret);
}

export function getZoomSdkCreds(): { sdkKey: string; sdkSecret: string } {
  const settings = db.getSettings();
  return {
    sdkKey: (settings.zoomSdkKey || process.env.ZOOM_SDK_KEY || '').trim(),
    sdkSecret: (settings.zoomSdkSecret || process.env.ZOOM_SDK_SECRET || '').trim()
  };
}

export function isZoomSdkConfigured(): boolean {
  const { sdkKey, sdkSecret } = getZoomSdkCreds();
  return Boolean(sdkKey && sdkSecret);
}

/* ==========================================================================
   Method 1 (recommended, previous): Server-to-Server OAuth — the clinic's
   single Zoom account connected once with Account ID + Client ID + Secret.
   No per-therapist login needed at all.
   ========================================================================== */

export function getZoomS2SCreds(): { accountId: string; clientId: string; clientSecret: string } {
  const settings = db.getSettings();
  return {
    accountId: (settings.zoomAccountId || process.env.ZOOM_ACCOUNT_ID || '').trim(),
    clientId: (settings.zoomClientId || process.env.ZOOM_CLIENT_ID || '').trim(),
    clientSecret: (settings.zoomClientSecret || process.env.ZOOM_CLIENT_SECRET || '').trim()
  };
}

export function isZoomS2SConfigured(): boolean {
  const { accountId, clientId, clientSecret } = getZoomS2SCreds();
  return Boolean(accountId && clientId && clientSecret);
}

let cachedS2SToken: { token: string; expiresAt: number } | null = null;

export async function getZoomS2SToken(): Promise<string> {
  const { accountId, clientId, clientSecret } = getZoomS2SCreds();
  if (!accountId || !clientId || !clientSecret) {
    throw new Error('חיבור ה-Zoom הישיר אינו מוגדר — יש להזין את פרטי אפליקציית Server-to-Server OAuth בהגדרת המערכת.');
  }

  if (cachedS2SToken && cachedS2SToken.expiresAt > Date.now() + 60_000) {
    return cachedS2SToken.token;
  }

  try {
    const res = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    cachedS2SToken = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in || 3600) * 1000
    };
    return cachedS2SToken.token;
  } catch (err: any) {
    cachedS2SToken = null;
    console.error('[Zoom] S2S token error:', err.response?.data || err.message);
    if (err.response?.status === 400) {
      throw new Error('חיבור Zoom נכשל (400): פרטי Account ID / Client ID / Client Secret שגויים. נא לתקן בהגדרת המערכת.');
    }
    if (err.response?.status === 401) {
      throw new Error('חיבור Zoom נכשל (401): ה-Client ID או ה-Client Secret אינם תקינים, או שהאפליקציה אינה פעילה ב-Zoom Marketplace.');
    }
    throw new Error(`חיבור Zoom נכשל: ${err.response?.data?.reason || err.message}`);
  }
}

/* ============================ user connect / tokens ============================ */

export function isUserZoomConnected(userId: string): boolean {
  const user = db.collection('users').findById(userId);
  return Boolean(user?.zoomRefreshToken);
}

export function getConnectedZoomEmail(userId: string): string {
  const user = db.collection('users').findById(userId);
  return user?.zoomUserEmail || '';
}

export function buildZoomAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = getZoomOAuthConfig();
  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export function getZoomCallbackUri(requestBaseUrl: string): string {
  return `${requestBaseUrl.replace(/\/+$/, '')}/api/zoom/callback`;
}

interface ZoomUserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function exchangeOrRefresh(body: Record<string, string>, redirectUri?: string): Promise<ZoomUserTokens> {
  const { clientId, clientSecret } = getZoomOAuthConfig();
  try {
    const res = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ ...body, ...(redirectUri ? { redirect_uri: redirectUri } : {}) }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresAt: Date.now() + (res.data.expires_in || 3600) * 1000
    };
  } catch (err: any) {
    console.error('[Zoom] user token error:', err.response?.data || err.message);
    if (err.response?.status === 400 && body.refresh_token) {
      throw new Error('תוקף החיבור ל-Zoom פג — יש להתחבר מחדש בלחיצה על "התחבר עם Zoom".');
    }
    if (err.response?.status === 401) {
      throw new Error('חיבור Zoom נכשל (401): פרטי אפליקציית ה-OAuth של המערכת אינם תקינים — יש לתקן בהגדרות המערכת.');
    }
    throw new Error(`חיבור Zoom נכשל: ${err.response?.data?.reason || err.response?.data?.message || err.message}`);
  }
}

export function exchangeZoomCode(code: string, redirectUri: string): Promise<ZoomUserTokens> {
  return exchangeOrRefresh({ grant_type: 'authorization_code', code }, redirectUri);
}

async function refreshZoomUserToken(refreshToken: string): Promise<ZoomUserTokens> {
  return exchangeOrRefresh({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

/** Returns a valid access token for the given therapist, refreshing it if needed. */
export async function getUserAccessToken(userId: string): Promise<string> {
  const user = db.collection('users').findById(userId);
  if (!user?.zoomRefreshToken) {
    throw new Error(
      'חשבון ה-Zoom אינו מחובר. לחץ/י על "התחבר עם Zoom" במסך פגישות הזום — הכניסה נעשית עם חשבון הזום שלך (אפשר גם עם Google).'
    );
  }

  if (user.zoomAccessToken && user.zoomTokenExpiresAt && user.zoomTokenExpiresAt > Date.now() + 60_000) {
    return user.zoomAccessToken;
  }

  const tokens = await refreshZoomUserToken(user.zoomRefreshToken);
  db.collection('users').updateById(userId, {
    zoomAccessToken: tokens.accessToken,
    zoomRefreshToken: tokens.refreshToken,
    zoomTokenExpiresAt: tokens.expiresAt
  });
  await db.flush();
  return tokens.accessToken;
}

export async function connectZoomUser(userId: string, code: string, redirectUri: string): Promise<{ email: string }> {
  const tokens = await exchangeZoomCode(code, redirectUri);
  const meRes = await axios.get('https://zoom.us/v2/users/me', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    timeout: 10000
  });
  const email = meRes.data?.email || '';

  db.collection('users').updateById(userId, {
    zoomAccessToken: tokens.accessToken,
    zoomRefreshToken: tokens.refreshToken,
    zoomTokenExpiresAt: tokens.expiresAt,
    zoomUserEmail: email,
    zoomUserId: String(meRes.data?.id || '')
  });
  await db.flush();
  return { email };
}

export function disconnectZoomUser(userId: string): void {
  db.collection('users').updateById(userId, {
    zoomAccessToken: '',
    zoomRefreshToken: '',
    zoomTokenExpiresAt: 0,
    zoomUserEmail: '',
    zoomUserId: ''
  });
}

/* ============================ meetings API (user token) ============================ */

export interface ZoomMeetingResult {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  passcode: string;
}

function toZoomStartTime(date: string, time: string): string {
  // Zoom expects ISO8601 with offset; we schedule in Israel time
  return `${date}T${time}:00+02:00`;
}

/**
 * Resolves the working token: S2S (clinic account) when configured, otherwise
 * the personal OAuth token of the given therapist.
 */
async function resolveToken(userId: string): Promise<string> {
  if (isZoomS2SConfigured()) return getZoomS2SToken();
  return getUserAccessToken(userId);
}

async function zoomRequest<T>(userId: string, fn: (token: string) => Promise<{ data: T }>): Promise<T> {
  const token = await resolveToken(userId);
  try {
    const res = await fn(token);
    return res.data;
  } catch (err: any) {
    const data = err.response?.data;
    console.error('[Zoom] API error:', data || err.message);
    if (err.response?.status === 401) {
      throw new Error('פג תוקף החיבור ל-Zoom (401) — נסה שוב; אם זה חוזר, בדוק/י את החיבור במסך הזום.');
    }
    if (err.response?.status === 429) {
      throw new Error('חריגה ממכסת הבקשות של Zoom. נסה שוב בעוד רגע.');
    }
    throw new Error(`שגיאת Zoom: ${data?.message || err.message}`);
  }
}

export async function createZoomMeeting(userId: string, opts: {
  topic: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  agenda?: string;
}): Promise<ZoomMeetingResult> {
  return zoomRequest(userId, (token) =>
    axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: opts.topic,
        type: 2, // scheduled meeting
        start_time: toZoomStartTime(opts.date, opts.time),
        duration: Math.max(15, Math.min(180, opts.durationMinutes || 50)),
        timezone: 'Asia/Jerusalem',
        agenda: opts.agenda || '',
        settings: {
          join_before_host: false,
          waiting_room: true,
          mute_upon_entry: true,
          approval_type: 2,
          auto_recording: 'none'
        }
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    )
  ).then((m: any) => ({
    meetingId: String(m.id),
    joinUrl: m.join_url,
    startUrl: m.start_url,
    passcode: m.password || ''
  }));
}

export async function updateZoomMeeting(userId: string, meetingId: string, opts: { topic?: string; date?: string; time?: string; durationMinutes?: number }): Promise<void> {
  const body: Record<string, any> = {};
  if (opts.topic) body.topic = opts.topic;
  if (opts.date && opts.time) {
    body.start_time = toZoomStartTime(opts.date, opts.time);
    body.timezone = 'Asia/Jerusalem';
  }
  if (opts.durationMinutes) body.duration = Math.max(15, Math.min(180, opts.durationMinutes));

  await zoomRequest(userId, (token) =>
    axios.patch(`https://api.zoom.us/v2/meetings/${meetingId}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 15000
    })
  );
}

export async function deleteZoomMeeting(userId: string, meetingId: string): Promise<void> {
  await zoomRequest(userId, (token) =>
    axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000
    })
  );
}

/* ============================ Meeting SDK signature ============================ */

/**
 * Meeting SDK signature for embedding a meeting inside the app.
 * role: 1 = host, 0 = attendee
 */
export function generateSdkSignature(meetingNumber: string, role: 0 | 1): { sdkKey: string; signature: string } {
  const { sdkKey, sdkSecret } = getZoomSdkCreds();
  if (!sdkKey || !sdkSecret) {
    throw new Error('חסרים פרטי Meeting SDK (SDK Key/Secret) — נדרשים להצגת הפגישה בתוך המערכת. יש להשלים בהגדרת המערכת של הזום.');
  }
  if (!meetingNumber || !/^\d{9,12}$/.test(meetingNumber)) {
    throw new Error('מספר פגישת הזום אינו תקין');
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const payload = { appKey: sdkKey, iat, exp, tpc: meetingNumber, role };
  const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } });
  return { sdkKey, signature };
}
