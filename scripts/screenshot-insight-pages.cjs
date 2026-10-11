/* eslint-disable */
// Screenshots the three insight page states against the isolated dev server.
const fs = require('fs');
const path = require('path');
const os = require('os');
const jwt = require('jsonwebtoken');
const { chromium } = require('D:/wisecare/client/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const envGet = (k) =>
  (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^"|"$/g, '');

const JWT_SECRET = envGet('JWT_SECRET');
const DB_FILE = envGet('WISECARE_DB_FILE');
const BASE = 'http://localhost:3100';
const OUT = path.join(os.tmpdir(), 'wisecare-insight-shots');

const localDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const client = (localDb.clients || []).find((c) => c.portalCode);
const token = jwt.sign(
  { clientId: client.id, role: 'client', portalCode: client.portalCode },
  JWT_SECRET,
  { expiresIn: '1h', issuer: 'wisecare', audience: 'wisecare-portal' }
);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // Fresh test insight + share link
  let res = await fetch(`${BASE}/api/portal/${client.portalCode}/insights`, {
    method: 'POST',
    headers: { Cookie: `wisecare_client_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'רגע של בהירות בשיחה עם אמא',
      content: 'הבנתי היום שכשאני מפסיקה לנסות לרצות את כולם, הגוף שלי נרגע.\n\nישבתי אחר הצהריים מול הכוסית קפה, בלי טלפון, ופתאום זה הגיע — התחושה שאני לא חייבת להסביר את עצמי לאף אחד. רק להיות. רשמתי לעצמי את זה כאן כדי לזכור ביום שיהיה קשה.',
      mood: 'שלווה והקלה',
      intensity: 8
    })
  });
  const insight = await res.json();
  res = await fetch(`${BASE}/api/portal/${client.portalCode}/insights/${insight.id}/share`, {
    method: 'POST',
    headers: { Cookie: `wisecare_client_token=${token}` }
  });
  const { url: shareUrl } = await res.json();
  const publicPath = new URL(shareUrl).pathname;
  console.log('insight:', insight.id, '\npublic path:', publicPath);

  const browser = await chromium.launch({ channel: 'chrome' });

  // Anonymous recipient — desktop
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = await ctx.newPage();
  await page.goto(`${BASE}${publicPath}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, '1-public-recipient-desktop.png'), fullPage: true });

  // Anonymous recipient — mobile
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await ctx.newPage();
  await page.goto(`${BASE}${publicPath}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, '2-public-recipient-mobile.png'), fullPage: true });

  // Owner on the public page — share bar + revoke visible
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'wisecare_client_token', value: token, url: BASE }]);
  page = await ctx.newPage();
  await page.goto(`${BASE}${publicPath}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, '3-public-owner-desktop.png'), fullPage: true });

  // Owner on the private view page
  await page.goto(`${BASE}/insight-view/${insight.id}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, '4-view-owner-desktop.png'), fullPage: true });

  await browser.close();

  // Cleanup the test insight + any leftover from a crashed earlier run
  await fetch(`${BASE}/api/portal/${client.portalCode}/insights/${insight.id}`, {
    method: 'DELETE',
    headers: { Cookie: `wisecare_client_token=${token}` }
  });
  await fetch(`${BASE}/api/portal/${client.portalCode}/insights/id-1791753989031-97afd11e`, {
    method: 'DELETE',
    headers: { Cookie: `wisecare_client_token=${token}` }
  }).catch(() => {});
  console.log('screenshots in:', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
