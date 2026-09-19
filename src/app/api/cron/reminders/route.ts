import { NextRequest, NextResponse } from 'next/server';
import { processAutomaticReminders } from '@/services/reminderScheduler';
import { processScheduledCallsTick } from '@/services/scheduledCallScheduler';
import { getBaseUrl } from '@/lib/urlHelpers';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, require it in production
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
