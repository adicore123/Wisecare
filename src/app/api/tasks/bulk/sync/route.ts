import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { provisionBroadcastTasksForClient } from '@/lib/broadcastTasks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * סנכרון משימות שידור: משלים לכל בעלי המרחבים האישיים את כל אצוות
 * השידור שחסרות להם (נרשמו אחרי שידור, וכו'). בטוח להרצה חוזרת.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    await db.ensureLoaded();
    const clients = db
      .collection('clients')
      .find()
      .filter((c: any) => !c.archived && c.portalEnabled !== false && (c.isSelfCare || !c.therapistId));

    let clientsTouched = 0;
    let added = 0;
    for (const client of clients) {
      const n = provisionBroadcastTasksForClient(client.id, client.therapistId || null);
      if (n > 0) {
        clientsTouched++;
        added += n;
      }
    }
    if (added > 0) await db.flush();

    return NextResponse.json({ success: true, added, clientsTouched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בסנכרון משימות השידור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
