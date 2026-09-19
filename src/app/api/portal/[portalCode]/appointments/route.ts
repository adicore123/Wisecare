import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const appointments = db.collection('appointments').find({ clientId: client.id });
    appointments.sort((a: any, b: any) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('[Portal Appointments Get Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת פגישות' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { preferredDate, preferredTime, type = 'in_person', notes, therapistName, location: customLocation } = body;

    if (!preferredDate) {
      return NextResponse.json({ error: 'נא לבחור תאריך לפגישה' }, { status: 400 });
    }

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const isSelf = Boolean(client.isSelfCare || !client.therapistId);
    const settings = db.getSettings();
    const clinicName = settings.clinicName || 'הקליניקה';

    const isVideo = type === 'zoom' || type === 'video';
    const defaultLocation = isVideo ? 'פגישת וידאו' : type === 'phone' ? 'שיחת טלפון' : clinicName;
    const location = customLocation || defaultLocation;

    const newAppointment = db.collection('appointments').insertOne({
      therapistId: client.therapistId || null,
      therapistName: therapistName ? String(therapistName).trim() : (isSelf ? 'פגישה אישית' : ''),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      clientPhone: client.phone,
      portalCode,
      date: preferredDate,
      time: preferredTime || '10:00',
      durationMinutes: 50,
      type,
      typeName: isVideo ? 'פגישת וידאו' : type === 'phone' ? 'שיחה טלפונית' : 'פגישה בקליניקה',
      location,
      status: isSelf ? 'confirmed' : 'pending',
      isSelfManaged: isSelf,
      requestedBy: 'client',
      notes: notes ? String(notes).trim() : (isSelf ? 'פגישה ביומן האישי' : 'בקשת תור חדש מפורטל הלקוח'),
      reminderSent: false,
      reminderSentAt: null,
      confirmationSent: false,
      confirmationSentAt: null,
      createdAt: new Date().toISOString()
    });

    await db.flush();

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error: any) {
    console.error('[Portal Create Appointment Error]', error);
    return NextResponse.json({ error: 'שגיאה ביצירת פגישה' }, { status: 500 });
  }
}
