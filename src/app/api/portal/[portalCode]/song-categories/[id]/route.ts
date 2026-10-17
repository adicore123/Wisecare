import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ portalCode: string; id: string }>;
}

export async function PUT(
  request: NextRequest,
  props: RouteProps
) {
  try {
    await db.ensureLoaded();
    const { portalCode, id } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const cats = db.collection('clientSongCategories');
    const existing = cats.findById(id);
    if (!existing || existing.clientId !== client.id) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? existing.name).trim().slice(0, 40);
    if (!name) {
      return NextResponse.json({ error: 'נא לתת שם לקטגוריה' }, { status: 400 });
    }

    const updated = cats.updateById(id, { name });
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הקטגוריה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: RouteProps
) {
  try {
    await db.ensureLoaded();
    const { portalCode, id } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const cats = db.collection('clientSongCategories');
    const existing = cats.findById(id);
    if (!existing || existing.clientId !== client.id) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    // מחיקת הקטגוריה לא מוחקת שירים — הם חוזרים ל"הכול"
    db.collection('songs')
      .find({ clientId: client.id, categoryId: id })
      .forEach((song: any) => db.collection('songs').updateById(song.id, { categoryId: null }));
    cats.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת הקטגוריה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
