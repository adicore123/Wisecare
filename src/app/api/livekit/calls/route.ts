import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * GET — video call history for the therapist (optionally filtered by ?clientId=)
 */
export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId')?.trim() || '';
    const filter: any = { therapistId: auth.userId };
    if (clientId) filter.clientId = clientId;

    const calls = db.collection('videoCalls')
      .find(filter)
      .sort((a: any, b: any) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))
      .slice(0, 100);

    return NextResponse.json(calls);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת היסטוריית השיחות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
