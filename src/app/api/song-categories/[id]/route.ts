import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const categories = db.collection('songCategories');
    const existing = categories.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? existing.name).trim().slice(0, 60);
    if (!name) {
      return NextResponse.json({ error: 'נא לתת שם לקטגוריה' }, { status: 400 });
    }

    const updated = categories.updateById(id, { name });
    await db.flush();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הקטגוריה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const categories = db.collection('songCategories');
    const existing = categories.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    // Cascade: remove the category together with all its recommended songs
    const songs = db.collection('recommendedSongs');
    songs.find({ categoryId: id }).forEach((song: any) => songs.deleteById(song.id));
    categories.deleteById(id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת הקטגוריה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
