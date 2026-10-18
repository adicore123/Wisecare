import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { instantThumbnailFor } from '@/lib/songMeta';
import { RECOMMENDED_CONTENT_TYPES } from '@/lib/recommendedContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORY_BY_TYPE: Record<string, string> = {
  video: 'סרטונים',
  post: 'פוסטים',
  article: 'מאמרים'
};

/**
 * ייבוא חד-פעמי/חוזר של ספריית תוכן מפורטל להמלצות הצוות:
 * מעתיק את הפריטים המשויכים למרחב (סרטונים/פוסטים/מאמרים, לא ארכיון)
 * לקטגוריות לפי סוג, במצב "מוסתר" — השיתוף למטופלים נבחר פר-פריט.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const portalCode = String(body.portalCode || '').trim();
    if (!portalCode) {
      return NextResponse.json({ error: 'נא להזין קוד פורטל' }, { status: 400 });
    }

    await db.ensureLoaded();
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'לא נמצא מרחב עם קוד זה' }, { status: 404 });
    }

    // הפריטים שהמרחב רואה היום: שיוכים ← פריטי תוכן פעילים מהסוגים הנתמכים
    const contentIds = new Set(
      db.collection('contentAssignments')
        .find({ clientId: client.id })
        .map((a: any) => a.contentId)
    );
    const candidates = db
      .collection('contentItems')
      .find()
      .filter((item: any) =>
        contentIds.has(item.id) &&
        !item.archived &&
        (RECOMMENDED_CONTENT_TYPES as readonly string[]).includes(item.type)
      );

    // דה-דופליקציה מול ההמלצות הקיימות ובתוך האצווה עצמה
    const existingUrls = new Set(
      db.collection('recommendedContent').find().map((r: any) => String(r.url))
    );

    const categoriesCol = db.collection('contentCategories');
    const categoryByType = new Map<string, string>();
    const ensureCategory = (type: string): string => {
      const known = categoryByType.get(type);
      if (known) return known;
      const name = CATEGORY_BY_TYPE[type];
      let cat = categoriesCol.find({ name })[0];
      if (!cat) {
        cat = categoriesCol.insertOne({ name, createdAt: new Date().toISOString() });
      }
      categoryByType.set(type, cat.id);
      return cat.id;
    };

    let imported = 0;
    let skipped = 0;
    for (const item of candidates) {
      const url = String(item.url || '').trim();
      if (!/^https?:\/\/.+/i.test(url) || existingUrls.has(url)) {
        skipped++;
        continue;
      }
      existingUrls.add(url);

      // התמונה נגזרת מהקישור (יוטיוב); פריטים עם תמונה שמורה מקבלים רפרנס
      // ל-endpoint הקיים — בלי לשכפל מגה-בייטים של base64
      db.collection('recommendedContent').insertOne({
        categoryId: ensureCategory(item.type),
        type: item.type,
        title: String(item.title || 'קישור מומלץ').slice(0, 160),
        url,
        description: String(item.description || '').trim().slice(0, 1000),
        sourceName: String(item.sourceName || '').trim().slice(0, 120),
        thumbnailUrl: instantThumbnailFor(url) || '',
        sourceContentId: item.hasImageData || item.imageData ? item.id : undefined,
        shared: false,
        createdAt: new Date().toISOString()
      });
      imported++;
    }
    await db.flush();

    return NextResponse.json({ imported, skipped, total: candidates.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בייבוא התוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
