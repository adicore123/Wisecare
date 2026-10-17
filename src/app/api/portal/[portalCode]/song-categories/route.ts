import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** קטגוריות שירים אישיות של המטופל */
export async function GET(
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

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const categories = db
      .collection('clientSongCategories')
      .find({ clientId: client.id })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הקטגוריות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
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

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) {
      return NextResponse.json({ error: 'נא לתת שם לקטגוריה' }, { status: 400 });
    }

    // keep the patient's own list tidy
    const existing = db.collection('clientSongCategories').find({ clientId: client.id }) as any[];
    if (existing.some((c) => c.name === name)) {
      return NextResponse.json({ error: 'כבר קיימת קטגוריה בשם זה' }, { status: 409 });
    }

    const category = db.collection('clientSongCategories').insertOne({
      clientId: client.id,
      name,
      createdAt: new Date().toISOString()
    });
    await db.flush();
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת הקטגוריה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
