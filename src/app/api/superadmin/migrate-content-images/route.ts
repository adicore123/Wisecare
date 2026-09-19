import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isHttpImageUrl, materializeImage } from '@/services/contentImage';

/**
 * POST /api/superadmin/migrate-content-images
 * One-shot (re-runnable) migration: walks every content item whose imageData
 * is a hotlinked http(s) URL (e.g. expiring Facebook CDN thumbnails) and
 * downloads + embeds it as a data-URL so the image is self-hosted forever.
 * Safe to re-run — already-materialized items are skipped.
 */
export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const all = db.collection('contentItems').find({})
      .filter((item: any) => isHttpImageUrl(item.imageData));

    // Batching: each invocation converts at most `limit` items so the
    // function stays well under the serverless timeout; re-run until done.
    const limit = Math.max(1, Math.min(20, Number(new URL(request.url).searchParams.get('limit')) || 10));
    const items = all.slice(0, limit);

    let converted = 0;
    let failed = 0;
    const failedIds: string[] = [];

    for (const item of items) {
      const dataUrl = await materializeImage(String(item.imageData));
      if (dataUrl) {
        db.collection('contentItems').updateById(item.id, { imageData: dataUrl });
        converted++;
      } else {
        failed++;
        if (failedIds.length < 10) failedIds.push(item.id);
      }
    }

    await db.flush();

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'migrate_content_images',
      targetId: 'contentItems',
      targetType: 'collection',
      details: { candidates: items.length, converted, failed }
    } as any);

    return NextResponse.json({
      success: true,
      candidates: all.length,
      remaining: Math.max(0, all.length - items.length),
      converted,
      failed,
      failedIds,
      message: `הומרו ${converted} מתוך ${items.length} בבאץ' (נותרו ${Math.max(0, all.length - items.length)} להמרה)${failed ? ` — ${failed} נכשלו` : ''}`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהמרת התמונות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
