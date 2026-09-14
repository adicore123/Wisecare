import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { sendAppointmentConfirmation } from '@/services/reminderScheduler';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const result = await sendAppointmentConfirmation(id);

    return NextResponse.json({
      success: true,
      message: 'אישור תור נשלח בהצלחה בוואטסאפ',
      result
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'שגיאה בשליחת אישור פגישה בוואטסאפ'
    }, { status: 500 });
  }
}
