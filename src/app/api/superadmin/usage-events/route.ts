import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { recentEventsForClient } from '@/lib/usageTracking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** יומן אירועים מפורט של מרחב אישי — סופראדמין בלבד */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const clientId = request.nextUrl.searchParams.get('clientId') || '';
    if (!clientId) {
      return NextResponse.json({ error: 'נא לציין מזהה לקוח' }, { status: 400 });
    }

    const events = recentEventsForClient(clientId, 150);
    return NextResponse.json(events, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת יומן הפעילות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
