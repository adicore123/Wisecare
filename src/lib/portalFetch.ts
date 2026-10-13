/**
 * Portal session transport.
 *
 * The patient session cookie (`wisecare_client_token`) is a single slot shared by the
 * whole browser, so it can belong to a different portal than the one open in this tab
 * (after visiting another patient's portal, a CRM logout that clears it, etc.). When
 * that happened every portal API call failed with 401 until the patient logged in again.
 *
 * This installs a tiny fetch wrapper that attaches this tab's portal token as an
 * `Authorization: Bearer` header to same-origin portal API calls that don't already
 * carry one. The server picks whichever candidate session matches the requested portal.
 */

const PORTAL_API_RE = /^\/api\/(?:livekit\/)?portal\/[^/?#]+/;

let installed = false;

function resolvePath(input: RequestInfo | URL): string | null {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

export function installPortalAuthFetch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const path = resolvePath(input);
    if (path && PORTAL_API_RE.test(path)) {
      const token =
        localStorage.getItem('wisecare_portal_token') ||
        localStorage.getItem('wisecare_token') ||
        localStorage.getItem('wisecare_admin_token');
      if (token) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    }
    return originalFetch(input, init);
  };
}
