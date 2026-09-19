// Temporary end-to-end video-call test: therapist flow in page A (CRM),
// client flow in page B (/video-call), both with fake cameras.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';
const PORTAL = 'client-260305'; // עדי לוי

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr_sarah', password: 'Sarah@WiseCare2024!' })
  }).then((r) => r.json());
  if (!login.token) throw new Error('login failed: ' + JSON.stringify(login).slice(0, 200));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const issues = [];
  const hook = (page, name) => {
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') issues.push(`[${name}] ${m.type()}: ${m.text().slice(0, 220)}`);
    });
    page.on('pageerror', (e) => issues.push(`[${name}] PAGEERROR: ${e.message.slice(0, 220)}`));
  };

  // ── Page A: therapist opens the meetings screen and starts the call ──
  const pageA = await browser.newPage();
  await pageA.setViewport({ width: 1280, height: 900 });
  hook(pageA, 'therapist');
  await pageA.evaluateOnNewDocument(
    (user, token) => {
      localStorage.setItem('wisecare_user', JSON.stringify(user));
      localStorage.setItem('wisecare_token', token);
    },
    login.user,
    login.token
  );
  await pageA.goto(BASE + '/crm/dr-sarah-8821/meetings', { waitUntil: 'networkidle2', timeout: 60000 });

  await pageA.waitForSelector('select.form-control', { timeout: 30000 });
  const adiValue = await pageA.evaluate(() => {
    const sel = document.querySelector('select.form-control');
    const opt = [...sel.options].find((o) => o.textContent.includes('עדי'));
    return opt ? opt.value : null;
  });
  if (!adiValue) throw new Error('עדי לוי not found in client select');
  await pageA.select('select.form-control', adiValue);
  await sleep(400);
  await pageA.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) cb.click(); // turn off WhatsApp for the test
  });
  const started = await pageA.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('התחל שיחה'));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  });
  if (!started) throw new Error('start button not clickable');
  console.log('» therapist clicked start, waiting for call view…');
  await pageA.waitForSelector('.lk-call-view', { timeout: 30000 });

  // ── Page B: client join page (auto-joins on load when a call is active) ──
  const pageB = await browser.newPage();
  await pageB.setViewport({ width: 1280, height: 900 });
  hook(pageB, 'client');
  await pageB.goto(BASE + '/video-call/' + PORTAL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('» both sides up, letting them connect for 14s…');
  await sleep(14000);

  const readout = (label, page, extra = {}) =>
    page
      .evaluate(() => ({
        videos: document.querySelectorAll('video').length,
        videoReady: [...document.querySelectorAll('video')].map((v) => v.readyState),
        videoSizes: [...document.querySelectorAll('video')].map((v) => v.videoWidth + 'x' + v.videoHeight),
        waiting: document.body.innerText.includes('ממתין'),
        ended: document.body.innerText.includes('השיחה הסתיימה'),
        connecting: document.body.innerText.includes('מתחבר')
      }))
      .then((s) => console.log(`STATE ${label}:`, JSON.stringify({ ...s, ...extra })));

  await readout('A-therapist', pageA);
  await readout('B-client', pageB);

  await pageA.screenshot({ path: 'tmp-e2e-therapist.png' });
  await pageB.screenshot({ path: 'tmp-e2e-client.png' });
  console.log('CONSOLE ISSUES:\n' + (issues.slice(0, 20).join('\n') || '  none'));

  await browser.close();
}

main().catch((e) => {
  console.error('E2E FAIL:', e.message);
  process.exit(1);
});
