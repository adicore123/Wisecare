import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isZoomS2SConfigured, isUserZoomConnected, updateZoomMeeting, deleteZoomMeeting } from '@/services/zoom';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const appointment = db.collection('appointments').findById(id);

    if (!appointment) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת פרטי התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const existing = db.collection('appointments').findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    const body = await request.json();

    const allowed = [
      'date', 'time', 'durationMinutes', 'type', 'typeName',
      'location', 'status', 'notes'
    ];

    const updates: Record<string, any> = {};
    allowed.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Two-way sync with the linked Zoom meeting
    if (existing.zoomMeetingId) {
      const scheduleChanged =
        (updates.date && updates.date !== existing.date) ||
        (updates.time && updates.time !== existing.time) ||
        (updates.durationMinutes && updates.durationMinutes !== existing.durationMinutes);
      const isBeingCancelled = updates.status === 'cancelled';

      if (existing.therapistId && (isZoomS2SConfigured() || isUserZoomConnected(existing.therapistId))) {
        try {
          if (isBeingCancelled) {
            await deleteZoomMeeting(existing.therapistId, existing.zoomMeetingId);
            updates.zoomCancelledAt = new Date().toISOString();
          } else if (scheduleChanged) {
            await updateZoomMeeting(existing.therapistId, existing.zoomMeetingId, {
              date: updates.date || existing.date,
              time: updates.time || existing.time,
              durationMinutes: updates.durationMinutes || existing.durationMinutes
            });
            updates.zoomSyncedAt = new Date().toISOString();
          }
        } catch (zoomErr: any) {
          console.error('[Zoom] two-way sync failed:', zoomErr.message);
          updates.zoomSyncError = zoomErr.message;
        }
      }
    }

    const updated = db.collection('appointments').updateById(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const existing = db.collection('appointments').findById(id);

    // Delete the linked Zoom room as well (best effort — never block the deletion)
    if (existing?.zoomMeetingId && existing.therapistId && (isZoomS2SConfigured() || isUserZoomConnected(existing.therapistId))) {
      try {
        await deleteZoomMeeting(existing.therapistId, existing.zoomMeetingId);
      } catch (zoomErr: any) {
        console.error('[Zoom] failed to delete linked meeting:', zoomErr.message);
      }
    }

    const success = db.collection('appointments').deleteById(id);

    if (!success) {
      return NextResponse.json({ error: 'תור לא נמצא' }, { status: 404 });
    }

    return NextResponse.json({ message: 'תור נמחק בהצלחה' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת התור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
