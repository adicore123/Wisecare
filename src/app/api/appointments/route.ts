import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendAppointmentConfirmation } from '@/services/reminderScheduler';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTherapistId = searchParams.get('therapistId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    // Strict Tenant Scope: Therapists only see their own appointments
    const effectiveTherapistId = auth.role === 'therapist' ? auth.userId : requestedTherapistId;

    let appointments = db.collection('appointments').find();

    // Filter out archived appointments unless explicitly requested
    appointments = appointments.filter((a: any) => !a.archived);

    if (effectiveTherapistId) {
      appointments = appointments.filter((a: any) => a.therapistId === effectiveTherapistId);
    }
    if (clientId) {
      appointments = appointments.filter((a: any) => a.clientId === clientId);
    }
    if (status && status !== 'all') {
      appointments = appointments.filter((a: any) => a.status === status);
    }
    if (date) {
      appointments = appointments.filter((a: any) => a.date === date);
    }

    // Clinical Privacy: SuperAdmin sees schedule metadata but not confidential clinical notes
    if (auth.role === 'superadmin') {
      appointments = appointments.map((a: any) => {
        const { notes, clinicalSummary, sessionSummary, ...safeMetadata } = a;
        return {
          ...safeMetadata,
          notesProtected: true
        };
      });
    }

    appointments.sort((a: any, b: any) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    return NextResponse.json(appointments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליפת תורים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      therapistId = auth.userId,
      date,
      time,
      durationMinutes = 50,
      type = 'in_person',
      typeName,
      location,
      notes = '',
      status = 'confirmed',
      sendWhatsApp = true
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'חובה לבחור לקוח' }, { status: 400 });
    }
    if (!date || !time) {
      return NextResponse.json({ error: 'חובה לציין תאריך ושעת פגישה' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    const settings = db.getSettings();
    const isVideo = type === 'zoom' || type === 'video';
    const defaultTypeName = isVideo ? 'פגישת וידאו' : 'פגישה בקליניקה';
    const defaultLocation = location || (isVideo ? 'קישור יישלח לקראת המועד' : (settings.clinicName || 'הקליניקה'));

    const newApt = db.collection('appointments').insertOne({
      therapistId,
      clientId,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: client.phone,
      date,
      time,
      durationMinutes: Number(durationMinutes) || 50,
      type,
      typeName: typeName || defaultTypeName,
      location: defaultLocation,
      notes,
      status,
      reminderSent: false,
      reminderSentAt: null,
      confirmationSent: false,
      confirmationSentAt: null,
      requestedBy: 'therapist'
    });

    let confirmationSent = false;
    if (sendWhatsApp && client.phone) {
      try {
        await sendAppointmentConfirmation(newApt.id);
        confirmationSent = true;
      } catch (waErr: any) {
        console.error('Failed to send appointment confirmation via WhatsApp:', waErr.message);
      }
    }

    return NextResponse.json({
      appointment: newApt,
      confirmationSent
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת תור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
