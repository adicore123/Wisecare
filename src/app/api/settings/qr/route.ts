import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getQrCode } from '@/services/greenApi';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const qr = await getQrCode();
    return NextResponse.json(qr);
  } catch (err: any) {
    console.error('[Green API QR Error]', err);
    return NextResponse.json({ error: 'שגיאה בטעינת קוד QR' }, { status: 500 });
  }
}
