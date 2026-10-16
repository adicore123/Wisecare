import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** "המלצות הצוות" — קריאה למטופל: קטגוריות עם השירים המומלצים */
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
      .collection('songCategories')
      .find({})
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const songs = db.collection('recommendedSongs').find({});
    const byCategory = new Map<string, any[]>();
    for (const song of songs) {
      const list = byCategory.get(song.categoryId) || [];
      list.push(song);
      byCategory.set(song.categoryId, list);
    }

    const result = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      songs: (byCategory.get(cat.id) || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        note: s.note || '',
        thumbnailUrl: s.thumbnailUrl || ''
      }))
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת ההמלצות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
