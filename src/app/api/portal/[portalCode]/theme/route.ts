import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { THEME_PALETTES } from '@/lib/theme';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PUT /api/portal/{portalCode}/theme
 * Lets the patient restyle their OWN personal space. Client-session only —
 * the palette lives on the client record, so this never touches the clinic
 * CRM palette or any other patient's portal.
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const themeId = THEME_PALETTES.some(p => p.id === body.themeId) ? body.themeId : 'sage';

    const clients = db.collection('clients');
    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    clients.updateById(client.id, { themeId });
    await db.flush();

    try {
      revalidatePath(`/portal/${portalCode}`, 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch {}

    return NextResponse.json({ themeId }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('[Portal Theme Update Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הפלטה' }, { status: 500 });
  }
}
