import { createHmac } from 'node:crypto';
import axios from 'axios';
import { isPublicWebUrl } from '@/lib/contentHelpers';

export interface SpaceLead {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  goal: string;
  portalUrl: string;
  createdAt: string;
}

export interface SpaceLeadEmailResult {
  userSent: boolean;
  adminSent: boolean;
  error?: string;
}

export function isSpaceLeadEmailEnabled(): boolean {
  return Boolean(process.env.SPACE_LEADS_APPS_SCRIPT_URL?.trim());
}

/** Signed server-to-server payload. Password is for the registrant's email only; never send session tokens. */
export async function sendSpaceLeadEmails(lead: SpaceLead): Promise<SpaceLeadEmailResult> {
  const endpoint = process.env.SPACE_LEADS_APPS_SCRIPT_URL?.trim() || '';
  const secret = process.env.SPACE_LEADS_WEBHOOK_SECRET?.trim() || '';
  const result: SpaceLeadEmailResult = { userSent: false, adminSent: false };
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 16) {
    return { ...result, error: 'APPS_SCRIPT_CONFIGURATION' };
  }
  if (typeof lead.password !== 'string' || lead.password.length < 8 || lead.password.length > 1024 || /[\r\n\u0000]/.test(lead.password)) {
    return { ...result, error: 'INVALID_REGISTRATION_PASSWORD' };
  }

  // Explicit allowlist: never spread the registration body into an external request.
  const payload = JSON.stringify({
    id: lead.id,
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    username: lead.username,
    password: lead.password,
    goal: lead.goal,
    portalUrl: lead.portalUrl,
    createdAt: lead.createdAt,
    source: 'space'
  });

  // A stable lead ID lets the script retry only the recipient that failed.
  // At most two attempts; no automatic resend through another email provider.
  // Outbound call runs only behind the codebase-wide public-URL sanitizer.
  // Allowlist gate (protocol+host+private-range, the codebase SSRF sanitizer):
  // the outbound request below runs only for a public https URL that also
  // matches the strict script.google.com deployment pattern validated above.
  if (isPublicWebUrl(endpoint)) {
    for (let attempt = 0; attempt < 2; attempt++) {
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    try {
      // axios (כמו greenApi) עוקב אחרי ההפניות של ContentService ל-script.googleusercontent.com;
      // validateStatus:false שומר על הסמנטיקה של fetch — קודי שגיאה מטופלים למטה ולא נזרקים
      const response = await axios.post(
        endpoint,
        { timestamp, payload, signature },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 12000,
          maxRedirects: 5,
          validateStatus: () => true
        }
      );
      const finalUrl = String((response.request as any)?.res?.responseUrl || endpoint);
      if (new URL(finalUrl).hostname === 'accounts.google.com' || response.status === 401 || response.status === 403) {
        result.error = 'APPS_SCRIPT_AUTH_REQUIRED';
        break;
      }
      if (!(response.status >= 200 && response.status < 300)) {
        result.error = 'APPS_SCRIPT_HTTP_ERROR';
        if (response.status < 500 && response.status !== 429) break;
        continue;
      }
      if (!String(response.headers?.['content-type'] || '').includes('application/json')) {
        result.error = 'APPS_SCRIPT_INVALID_RESPONSE';
        break;
      }
      const data = response.data;
      if (data?.ok === false && data.requestId === '' && data.userSent === false && data.adminSent === false) {
        if (data.error === 'INVALID_REQUEST_OR_CONFIGURATION') {
          result.error = 'APPS_SCRIPT_CONFIGURATION';
          break;
        }
        if (data.error === 'UNAUTHORIZED') {
          result.error = 'APPS_SCRIPT_SIGNATURE_REJECTED';
          break;
        }
      }
      // A Google login/error HTML page or unrelated JSON is never a successful send.
      if (data?.requestId !== lead.id || typeof data?.userSent !== 'boolean' || typeof data?.adminSent !== 'boolean') {
        result.error = 'APPS_SCRIPT_INVALID_RESPONSE';
        break;
      }
      result.userSent ||= data.userSent;
      result.adminSent ||= data.adminSent;
      if (result.userSent && result.adminSent) {
        delete result.error;
        return result;
      }
      result.error = 'APPS_SCRIPT_DELIVERY_INCOMPLETE';
      if (data.retryable !== true) break;
    } catch {
      // Do not log payloads, Google response bodies, credentials or personal data.
      result.error = 'APPS_SCRIPT_UNAVAILABLE';
    }
    }
  }
  return result;
}
