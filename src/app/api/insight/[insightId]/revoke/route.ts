import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

/**
 * Stops an active insight share link ("הפסקת שיתוף" on the public page).
 * Authenticated by the owner's portal session — never by the link token — so
 * recipients holding the link can never kill it.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ insightId: string }> }
) {
  try {
    await db.ensureLoaded();
    const { insightId } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const insights = db.collection('insights');
    const insight = insights.findById(insightId);
    if (!insight || insight.clientId !== clientAuth.clientId) {
      return NextResponse.json({ error: 'אין הרשאה לבטל את השיתוף' }, { status: 403 });
    }

    insights.updateById(insightId, {
      shareTokenHash: null,
      shareToken: null,
      sharedAt: null
    });
    await db.flush();

    return NextResponse.json({ success: true, message: 'השיתוף הופסק — הקישור כבר לא פעיל' });
  } catch (error: any) {
    console.error('[Insight Revoke Share Error]', error);
    return NextResponse.json({ error: 'שגיאה בהפסקת השיתוף' }, { status: 500 });
  }
}
