import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** "המלצות הצוות" — קריאה למטופל: קטגוריות עם התוכן המומלץ שסומן לשיתוף בלבד */
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
      .collection('contentCategories')
      .find({})
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // רק פריטים שהצוות סימן לשיתוף מגיעים למטופלים
    const items = db.collection('recommendedContent').find({ shared: true });
    const byCategory = new Map<string, any[]>();
    for (const item of items) {
      const list = byCategory.get(item.categoryId) || [];
      list.push(item);
      byCategory.set(item.categoryId, list);
    }

    const result = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      items: (byCategory.get(cat.id) || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        description: item.description || '',
        sourceName: item.sourceName || '',
        thumbnailUrl:
          item.thumbnailUrl ||
          (item.sourceContentId ? `/api/content/${item.sourceContentId}/image` : '')
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
