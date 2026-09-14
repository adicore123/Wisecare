import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { checkInstanceStatus } from '@/services/greenApi';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const status = await checkInstanceStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[Green API Status Error]', err);
    return NextResponse.json({ error: 'שגיאה בבדיקת סטטוס Green API' }, { status: 500 });
  }
}
