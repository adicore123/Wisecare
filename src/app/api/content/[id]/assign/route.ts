import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { enrichItems, notifyClient } from '@/lib/contentHelpers';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const item = db.collection('contentItems').findById(id);
    if (!item) {
      return NextResponse.json({ error: 'פריט התוכן לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope: therapists may only assign their own content
    if (auth.role === 'therapist' && item.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לשייך פריט זה' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const clientIds: string[] = Array.isArray(body.clientIds)
      ? Array.from(new Set(body.clientIds.map((cid: any) => String(cid))))
      : [];
    const sendWhatsApp = Boolean(body.sendWhatsApp);

    if (clientIds.length === 0) {
      return NextResponse.json({ error: 'יש לבחור לפחות מטופל אחד' }, { status: 400 });
    }

    const clientsCollection = db.collection('clients');
    const assignmentsCollection = db.collection('contentAssignments');
    const results = [];

    for (const clientId of clientIds) {
      const client = clientsCollection.findById(clientId);
      if (!client || client.therapistId !== item.therapistId) {
        results.push({ clientId, status: 'invalid_client' });
        continue;
      }

      let assignment = assignmentsCollection.findOne({ contentId: item.id, clientId });
      const assignmentAction = assignment ? 'already_assigned' : 'assigned';
      if (!assignment) {
        assignment = assignmentsCollection.insertOne({
          contentId: item.id,
          clientId,
          therapistId: item.therapistId,
          notificationRequested: sendWhatsApp,
          notificationStatus: sendWhatsApp ? 'pending' : 'skipped',
          notifiedAt: null,
          lastNotificationAttemptAt: null,
          notificationCount: 0,
          notificationError: null
        });
      } else {
        assignment = assignmentsCollection.updateById(assignment.id, {
          notificationRequested: sendWhatsApp,
          notificationStatus: sendWhatsApp ? 'pending' : assignment.notificationStatus
        });
      }

      if (sendWhatsApp) {
        assignment = await notifyClient(client, assignment, item);
      }

      results.push({
        clientId,
        assignment,
        assignmentAction,
        status: assignment.notificationStatus
      });
    }

    await db.flush();

    return NextResponse.json({ item: enrichItems([item])[0], results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשיוך תוכן למטופלים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
