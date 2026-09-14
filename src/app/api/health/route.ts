import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const health = await db.getHealth();
    return NextResponse.json(health, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unhealthy';
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: message
    }, { status: 503 });
  }
}
