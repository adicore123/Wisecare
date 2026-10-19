import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const DEFAULT_TASK_CATEGORIES = ['רוגע וויסות', 'גוף ונשימה', 'הרגל יומי', 'כתיבה והתבוננות', 'תרגול ביתי'];

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const categoriesCol = db.collection('taskCategories');

    // זריעת ברירות מחדל — idempotent לפי שם: מוסיפה רק שמות חסרים, כך שהרצות
    // חוזרות/מקבילות (או קריאה ראשונה שנקטעה) לא יוצרות כפילויות לעולם
    const existing = categoriesCol.find({});
    const existingNames = new Set(existing.map((c: any) => c.name));
    let added = false;
    for (const name of DEFAULT_TASK_CATEGORIES) {
      if (!existingNames.has(name)) {
        categoriesCol.insertOne({ name, createdAt: new Date().toISOString() });
        added = true;
      }
    }
    if (added) await db.flush();

    const sorted = categoriesCol.find({}).sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return NextResponse.json(sorted, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הקטגוריות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name) {
      return NextResponse.json({ error: 'נא לתת שם לקטגוריה' }, { status: 400 });
    }

    await db.ensureLoaded();
    const category = db.collection('taskCategories').insertOne({
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
