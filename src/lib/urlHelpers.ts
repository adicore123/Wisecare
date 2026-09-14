import { NextRequest } from 'next/server';

/**
 * Returns the canonical base URL for the application.
 *
 * Priority:
 * 1. Request headers (x-forwarded-proto, x-forwarded-host / host) - dynamically matches client's current domain
 * 2. CLIENT_APP_URL environment variable
 * 3. NEXT_PUBLIC_APP_URL environment variable
 * 4. VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL (auto-populated by Vercel)
 * 5. Production fallback: https://wisecare-rlgv.vercel.app
 * 6. Local development fallback: http://localhost:3000
 */
export function getBaseUrl(request?: Request | NextRequest | null): string {
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  }

  if (process.env.CLIENT_APP_URL) {
    return process.env.CLIENT_APP_URL.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://wisecare-rlgv.vercel.app';
  }

  return 'http://localhost:3000';
}
