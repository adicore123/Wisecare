import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/security';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const users = db.collection('users');
    const target = users.findById(id);
    if (!target || target.role !== 'therapist') {
      return NextResponse.json({ error: 'מטפל לא נמצא' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const allowedUpdates = ['name', 'email', 'phone', 'title', 'specialty', 'active', 'password'];
    const updateData: Record<string, any> = {};

    allowedUpdates.forEach(key => {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    });

    if (updateData.password) {
      updateData.password = hashPassword(updateData.password);
    }

    const updated = users.updateById(id, updateData);
    const { password: _, ...safeData } = updated;
    return NextResponse.json(safeData);
  } catch (error: any) {
    console.error('[SuperAdmin Update Therapist Error]', error);
    return NextResponse.json({ error: 'שגיאה בעדכון פרטי מטפל' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure the in-memory DB is hydrated from Mongo BEFORE mutating — on
    // serverless a cold instance without data would "delete" nothing, and the
    // therapist would resurrect on the next request.
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const users = db.collection('users');
    const target = users.findById(id);
    if (!target || target.role !== 'therapist') {
      return NextResponse.json({ error: 'מטפל לא נמצא' }, { status: 404 });
    }

    // Cascade delete the therapist's environment:
    const clients = db.collection('clients');
    const tasks = db.collection('tasks');
    const appointments = db.collection('appointments');
    const insights = db.collection('insights');
    const contentItems = db.collection('contentItems');
    const contentAssignments = db.collection('contentAssignments');
    const formSignatures = db.collection('formSignatures');
    const scheduledCalls = db.collection('scheduledCalls');
    const videoCalls = db.collection('videoCalls');

    // 1. Delete associated clients and their child records
    const therapistClients = clients.find({ therapistId: id });
    therapistClients.forEach((c: any) => {
      tasks.find({ clientId: c.id }).forEach((t: any) => tasks.deleteById(t.id));
      insights.find({ clientId: c.id }).forEach((ins: any) => insights.deleteById(ins.id));
      appointments.find({ clientId: c.id }).forEach((app: any) => appointments.deleteById(app.id));
      contentAssignments.find({ clientId: c.id }).forEach((ca: any) => contentAssignments.deleteById(ca.id));
      formSignatures.find({ clientId: c.id }).forEach((fs: any) => formSignatures.deleteById(fs.id));
      clients.deleteById(c.id);
    });

    // 2. Delete all tasks belonging directly to the therapist
    tasks.find({ therapistId: id }).forEach((t: any) => tasks.deleteById(t.id));

    // 3. Delete all appointments of the therapist
    appointments.find({ therapistId: id }).forEach((app: any) => appointments.deleteById(app.id));

    // 4. Delete all content items of the therapist
    contentItems.find({ therapistId: id }).forEach((cnt: any) => contentItems.deleteById(cnt.id));

    // 5. Delete the therapist's video-call records and scheduled calls
    videoCalls.find({ therapistId: id }).forEach((vc: any) => videoCalls.deleteById(vc.id));
    scheduledCalls.find({ therapistId: id }).forEach((sc: any) => scheduledCalls.deleteById(sc.id));

    // 6. Delete therapist user account
    users.deleteById(id);

    // Flush BEFORE responding — guarantees the deletions reached MongoDB
    // before the serverless function is frozen.
    await db.flush();

    return NextResponse.json({
      success: true,
      message: `סביבת המטפל ${target.name} וכלל הנתונים המקושרים נמחקו לצמיתות בהצלחה`,
      deletedId: id
    });
  } catch (error: any) {
    console.error('[SuperAdmin Delete Therapist Error]', error);
    return NextResponse.json({ error: 'שגיאה במחיקת סביבת המטפל' }, { status: 500 });
  }
}

