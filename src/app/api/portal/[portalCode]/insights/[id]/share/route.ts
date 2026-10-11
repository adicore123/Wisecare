import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { generateLinkToken } from '@/lib/linkToken';
import { getBaseUrl } from '@/lib/urlHelpers';

/**
 * Mints (once) the public share link for a journal insight — the "שיתוף"
 * button in the portal journal. The link is stable: re-clicking share re-serves
 * the same URL, insight edits show up on the shared page, and deletion or
 * revoke kills it. The raw token is stored alongside its hash (unlike the
 * quote links) because the URL must stay re-displayable; the insight content
 * sits in the same DB record, so the raw token exposes nothing new.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; id: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode, id } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const clients = db.collection('clients');
    const insights = db.collection('insights');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const insight = insights.findById(id);
    if (!insight || insight.clientId !== client.id) {
      return NextResponse.json({ error: 'אין הרשאה לשתף תובנה זו' }, { status: 403 });
    }

    let token = insight.shareToken;
    if (!insight.shareTokenHash || !insight.shareToken) {
      const minted = generateLinkToken();
      insights.updateById(id, {
        shareTokenHash: minted.hash,
        shareToken: minted.token,
        sharedAt: new Date().toISOString()
      });
      await db.flush();
      token = minted.token;
    }

    return NextResponse.json({
      success: true,
      url: `${getBaseUrl(request)}/insight/${id}/${token}`
    });
  } catch (error: any) {
    console.error('[Portal Share Insight Error]', error);
    return NextResponse.json({ error: 'שגיאה ביצירת קישור השיתוף' }, { status: 500 });
  }
}
