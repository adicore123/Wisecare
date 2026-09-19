import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getLiveKitConfig } from '@/services/livekit';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const config = getLiveKitConfig();
    return NextResponse.json({
      configured: config.configured,
      url: config.url || null,
      missing: config.missing
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בבדיקת חיבור הווידאו';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
