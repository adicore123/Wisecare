import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { recordModuleView, recordAction } from '@/lib/usageTracking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** הפעולות המשמעותיות שמתועדות ביומן האירועים */
const KNOWN_ACTIONS = new Set(['play_song', 'write_journal', 'save_reflection']);

/**
 * מעקב שימוש — דיווח מהפורטל על כניסה למודול (טאב) או פעולה
 * (ניגון שיר, כתיבת מחשבה). Fire-and-forget; כישלון שקט.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const module = String(body.module || '');
    const action = String(body.action || '');

    if (module) recordModuleView(client.id, module);
    if (action && KNOWN_ACTIONS.has(action)) {
      recordAction(client.id, action, module || undefined);
    }
    await db.flush();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
