import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { recordModuleView } from '@/lib/usageTracking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * מעקב שימוש — דיווח מהפורטל על כניסה למודול (טאב).
 * Fire-and-forget מהלקוח; כישלון שקט כדי לא להאט את הפורטל.
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
    recordModuleView(client.id, module);
    await db.flush();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
