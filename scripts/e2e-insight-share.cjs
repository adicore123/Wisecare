/* eslint-disable */
// One-off E2E check for the insight view/share feature against an isolated
// dev server (WISECARE_DISABLE_MONGODB=1 → local JSON bundle only).
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const ROOT = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const envGet = (k) =>
  (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^"|"$/g, '');

const JWT_SECRET = envGet('JWT_SECRET');
const DB_FILE = envGet('WISECARE_DB_FILE');
const BASE = process.env.TEST_BASE || 'http://localhost:3100';

const localDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const client = (localDb.clients || []).find((c) => c.portalCode);
if (!client) {
  console.error('FAIL: no client with portalCode in local DB file');
  process.exit(1);
}

const nameLeakCandidates = [client.name, client.clientName, client.firstName, client.lastName, client.fullName]
  .filter(Boolean)
  .filter((v) => String(v).length > 1);

const token = jwt.sign(
  { clientId: client.id, role: 'client', portalCode: client.portalCode },
  JWT_SECRET,
  { expiresIn: '1h', issuer: 'wisecare', audience: 'wisecare-portal' }
);
const authHeaders = { Cookie: `wisecare_client_token=${token}` };

const CONTENT_MARKER = 'תובנת בדיקה אוטומטית E2E-7f3a';
const TITLE_MARKER = 'כותרת בדיקה E2E-7f3a';

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) failures++;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jfetch(pathname, opts = {}) {
  const res = await fetch(`${BASE}${pathname}`, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, text, json };
}

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {}
    await sleep(1500);
  }
  return false;
}

(async () => {
  console.log(`client: ${client.id} portal: ${client.portalCode}`);
  if (!(await waitForServer())) {
    console.error('FAIL: dev server never became ready');
    process.exit(1);
  }
  console.log('server ready\n');

  // 1. Unauthenticated share attempt → 401
  let r = await jfetch(`/api/portal/${client.portalCode}/insights/id-does-not-matter/share`, { method: 'POST' });
  ok(r.res.status === 401, `unauthenticated share mints nothing (401, got ${r.res.status})`);

  // 2. Create a test insight
  r = await jfetch(`/api/portal/${client.portalCode}/insights`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: TITLE_MARKER, content: CONTENT_MARKER, mood: 'שלווה והקלה', intensity: 8 })
  });
  ok([200, 201].includes(r.res.status) && r.json?.id, `test insight created (${r.res.status})`);
  const insightId = r.json.id;

  // 3. Fetch the list to learn the recordedDate (must never appear on the public page)
  r = await jfetch(`/api/portal/${client.portalCode}/insights`, { headers: authHeaders });
  const created = (r.json || []).find((i) => i.id === insightId);
  ok(Boolean(created), 'insight appears in journal list');
  const recordedDate = created?.recordedDate;
  const recordedTime = created?.recordedTime;

  // 4. Mint the share link
  r = await jfetch(`/api/portal/${client.portalCode}/insights/${insightId}/share`, {
    method: 'POST',
    headers: authHeaders
  });
  ok(r.res.status === 200 && /^https?:\/\/.+\/insight\/.+\/[0-9a-f]{48}$/.test(r.json?.url || ''),
    `share URL minted (${r.json?.url?.slice(-20)}…)`);
  const url1 = r.json.url;
  const publicPath = new URL(url1).pathname;

  // 5. Stable link — second mint returns the SAME url
  r = await jfetch(`/api/portal/${client.portalCode}/insights/${insightId}/share`, {
    method: 'POST',
    headers: authHeaders
  });
  ok(r.json?.url === url1, 'link is stable across share clicks');

  // 6. Public page as an anonymous recipient
  r = await jfetch(publicPath, { redirect: 'manual' });
  ok(r.res.status === 200, `public page renders (${r.res.status})`);
  ok(r.text.includes(CONTENT_MARKER), 'public page shows the insight content');
  ok(r.text.includes(TITLE_MARKER), 'public page shows the title');
  ok(r.text.includes('עוצמת רגש'), 'public page shows the intensity meter');
  ok(!r.text.includes('הפסקת שיתוף'), 'recipient does NOT see the revoke control');
  if (recordedDate) ok(!r.text.includes(recordedDate), `public page hides the date (${recordedDate})`);
  if (recordedTime) ok(!r.text.includes(recordedTime), 'public page hides the time');
  ok(!r.text.includes(client.portalCode), 'public page hides the portal code');
  ok(!r.text.includes(client.id), 'public page hides internal client id');
  for (const name of nameLeakCandidates) {
    ok(!r.text.includes(name), `public page hides client name ("${name}")`);
  }
  ok((r.text.match(/<meta name="robots" content="noindex,nofollow"/) || []).length === 1 || r.text.includes('noindex'),
    'public page is noindex');

  // 7. Public page as the owner → revoke control visible
  r = await jfetch(publicPath, { headers: authHeaders });
  ok(r.res.status === 200 && r.text.includes('הפסקת שיתוף'), 'owner sees the revoke control on the public page');

  // 8. Private view page — anonymous → redirect to the portal gate
  r = await jfetch(`/insight-view/${insightId}`, { redirect: 'manual' });
  ok([307, 303, 302].includes(r.res.status) && (r.res.headers.get('location') || '').includes(`/portal/${client.portalCode}`),
    `anonymous view redirects to portal gate (${r.res.status} → ${r.res.headers.get('location')})`);

  // 9. Private view page — owner → renders
  r = await jfetch(`/insight-view/${insightId}`, { headers: authHeaders });
  ok(r.res.status === 200 && r.text.includes(CONTENT_MARKER), 'owner view page renders the insight');
  ok(!r.text.includes('העתקת קישור'), 'view page has no share bar (private view only)');
  if (recordedDate) ok(!r.text.includes(recordedDate), 'view page also hides the date (per spec)');

  // 10. Revoke as the owner
  r = await jfetch(`/api/insight/${insightId}/revoke`, { method: 'POST', headers: authHeaders });
  ok(r.res.status === 200 && r.json?.success, 'revoke succeeds for the owner');

  // 11. Revoked link now shows the invalid screen
  r = await jfetch(publicPath);
  ok(r.text.includes('הקישור אינו תקין'), 'revoked link shows the invalid-link screen');

  // 12. Revoke attempt by an anonymous visitor → 401 (recipients can't kill links)
  r = await jfetch(`/api/insight/${insightId}/revoke`, { method: 'POST' });
  ok(r.res.status === 401, `anonymous revoke rejected (${r.res.status})`);

  // 13. Sharing again mints a FRESH token
  r = await jfetch(`/api/portal/${client.portalCode}/insights/${insightId}/share`, {
    method: 'POST',
    headers: authHeaders
  });
  ok(r.json?.url && r.json.url !== url1, 're-share after revoke mints a new token');
  const url3 = r.json.url;

  // 14. Bad token format on the public page → invalid screen, no data leak
  r = await jfetch(`/insight/${insightId}/deadbeef`);
  ok(r.text.includes('הקישור אינו תקין') && !r.text.includes(CONTENT_MARKER), 'malformed token shows invalid screen without content');

  // 15. Cleanup — delete the test insight, link dies with it
  r = await jfetch(`/api/portal/${client.portalCode}/insights/${insightId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  ok(r.res.status === 200, 'test insight deleted');
  r = await jfetch(new URL(url3).pathname);
  ok(r.text.includes('הקישור אינו תקין'), 'deleted insight kills its share link');
  r = await jfetch(`/insight-view/${insightId}`, { headers: authHeaders, redirect: 'manual' });
  ok(r.text.includes('התובנה אינה זמינה'), 'deleted insight shows not-available on the view page');

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED ✅' : failures + ' CHECK(S) FAILED ❌'}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
