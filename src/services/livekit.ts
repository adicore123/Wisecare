import { AccessToken } from 'livekit-server-sdk';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * LiveKit video-calls service — credentials resolution + access-token minting.
 *
 * Credentials come from env vars only (no per-therapist setup):
 *   LIVEKIT_URL        e.g. wss://your-project.livekit.cloud
 *   LIVEKIT_API_KEY    from the LiveKit cloud console (Settings → API Keys)
 *   LIVEKIT_API_SECRET same page
 */

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  configured: boolean;
  missing: string[];
}

export function getLiveKitConfig(): LiveKitConfig {
  const url = (process.env.LIVEKIT_URL || '').trim();
  const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();

  const missing: string[] = [];
  if (!url) missing.push('LIVEKIT_URL');
  if (!apiKey) missing.push('LIVEKIT_API_KEY');
  if (!apiSecret) missing.push('LIVEKIT_API_SECRET');

  return {
    url,
    apiKey,
    apiSecret,
    configured: missing.length === 0,
    missing
  };
}

/**
 * Deterministic room name for a 1-on-1 call with a client (per spec: customer_{clientId}).
 */
export function clientRoom(clientId: string): string {
  return `customer_${clientId}`;
}

export interface MintTokenOptions {
  room: string;
  identity: string;
  name: string;
  /** host = therapist side, participant = client side */
  role: 'host' | 'participant';
}

/**
 * Mint a LiveKit access token granting join+publish+subscribe on one room.
 * Both sides may publish (1-on-1 conversation); identity keeps them distinguishable.
 */
export async function mintLiveKitToken(opts: MintTokenOptions): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig();
  if (!apiKey || !apiSecret) {
    throw new Error('שירות הווידאו (LiveKit) אינו מוגדר בסביבה — חסרים LIVEKIT_API_KEY / LIVEKIT_API_SECRET');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: 2 * 60 * 60 // 2 hours is plenty for a session
  });

  token.addGrant({
    room: opts.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true
  });

  return token.toJwt();
}

/**
 * Per-call guest join token for the /join/{callId}/{token} link.
 * 192 random bits, passed to the client only via the WhatsApp/copy link;
 * the DB stores just its SHA-256 hash so a DB leak exposes no usable link.
 */
export function generateJoinToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('hex');
  return { token, hash: hashJoinToken(token) };
}

function hashJoinToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time verification against the stored hash; false on any malformed input. */
export function verifyJoinToken(token: string, storedHash: string): boolean {
  try {
    const a = Buffer.from(hashJoinToken(String(token || '')), 'hex');
    const b = Buffer.from(String(storedHash || ''), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
