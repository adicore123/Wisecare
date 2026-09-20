import { NextRequest, NextResponse } from 'next/server';
import { processAutomaticReminders } from '@/services/reminderScheduler';
import { processScheduledCallsTick } from '@/services/scheduledCallScheduler';
import { getBaseUrl } from '@/lib/urlHelpers';

// The tick walks appointments and sends WhatsApp messages sequentially — it
// needs more than the default budget as the clinic grows.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed: without a configured secret the endpoint would be a public
    // "mass-WhatsApp everyone" trigger. Refuse to run rather than guess.
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET is not configured — refusing to run reminders (public trigger risk).');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [summary, scheduledCalls] = await Promise.all([
      processAutomaticReminders(),
      processScheduledCallsTick({ force: true, baseUrl: getBaseUrl(request) })
    ]);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      scheduledCalls
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Error processing reminders'
    }, { status: 500 });
  }
}
