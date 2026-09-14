import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  ALLOWED_TYPES,
  cleanText,
  cleanUrl,
  validateImageData,
  enrichItems
} from '@/lib/contentHelpers';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const therapistId = cleanText(searchParams.get('therapistId'), 120);

    if (!therapistId) {
      return NextResponse.json({ error: 'חסר מזהה מטפל' }, { status: 400 });
    }

    const items = db.collection('contentItems').find({ therapistId });
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(enrichItems(items));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת ספריית התוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const therapistId = cleanText(body.therapistId || auth.userId, 120);
    let title = cleanText(body.title, 160);
    const type = ALLOWED_TYPES.has(body.type) ? body.type : 'link';
    const url = cleanUrl(body.url);
    const imageData = validateImageData(body.imageData);
    const description = cleanText(body.description, 12000);
    const sourceName = cleanText(body.sourceName, 120);

    if (!therapistId) {
      return NextResponse.json({ error: 'חסר מזהה מטפל' }, { status: 400 });
    }

    // Auto-generate title if not provided
    if (!title) {
      if (type === 'video') {
        title = sourceName ? `סרטון (${sourceName})` : 'סרטון טיפולי מהרשת';
      } else if (type === 'post') {
        title = sourceName ? `פוסט (${sourceName})` : 'פוסט מומלץ מהרשת';
      } else if (type === 'article') {
        const firstLine = description ? description.split('\n')[0].trim().slice(0, 60) : '';
        title = firstLine || (sourceName ? `מאמר מאת ${sourceName}` : 'מאמר והדרכה טיפולית');
      } else if (type === 'image') {
        title = 'תמונה / דף עבודה';
      } else {
        title = sourceName ? `תוכן מ-${sourceName}` : 'קישור לתוכן';
      }
    }

    if (!url && !imageData && !description) {
      return NextResponse.json({ error: 'יש להוסיף קישור, תמונה או תוכן כתוב' }, { status: 400 });
    }
    if (body.url && !url) {
      return NextResponse.json({ error: 'הקישור אינו כתובת HTTP/HTTPS תקינה' }, { status: 400 });
    }
    if (imageData === null) {
      return NextResponse.json(
        { error: 'התמונה אינה תקינה או גדולה מדי. ניתן להעלות תמונה עד 2MB' },
        { status: 413 }
      );
    }

    const item = db.collection('contentItems').insertOne({
      therapistId,
      title,
      type,
      url,
      imageData,
      description,
      category: cleanText(body.category, 80) || 'כללי',
      sourceName,
      archived: false
    });

    return NextResponse.json({ ...item, assignments: [] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשמירת תוכן';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
