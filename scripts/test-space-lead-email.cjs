// Node 24+. All Google services and HTTP calls are mocked: no real emails or registrations.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { registerHooks } = require('node:module');
const vm = require('node:vm');
const { createHmac, createHash } = require('node:crypto');

const secret = '8264937150283649'; // Test-only 16-digit key, not the real server key.
const fixture = {
  id: 'id-qa-0001', fullName: 'נועה ישראלי', phone: '050-1234567',
  email: 'noa@example.com', username: 'noa.wellbeing', password: '  Chosen<&"Password!2026  ', goal: 'calm',
  portalUrl: 'https://wisecare.example/portal/my-123456',
  createdAt: '2026-10-19T08:30:00.000Z', source: 'space'
};

function harness(options = {}) {
  const sent = [];
  const logs = [];
  const props = {
    WEBHOOK_SECRET: secret, ADMIN_EMAIL: 'owner@example.com', SITE_URL: 'https://wisecare.example'
  };
  const properties = {
    getProperty: key => props[key] ?? null,
    setProperty: (key, value) => { props[key] = value; },
    deleteProperty: key => { delete props[key]; },
    getProperties: () => ({ ...props })
  };
  let locked = false;
  const context = vm.createContext({
    console: { log: (...args) => logs.push(args.join(' ')), warn: (...args) => logs.push(args.join(' ')) },
    PropertiesService: { getScriptProperties: () => properties },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    Utilities: {
      Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' },
      computeHmacSha256Signature: (value, key) => Array.from(createHmac('sha256', key).update(value).digest()),
      computeDigest: (algorithm, value) => Array.from(createHash(algorithm).update(value).digest()),
      formatDate: date => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }).format(date)
    },
    LockService: { getScriptLock: () => ({
      tryLock: () => { locked = !options.busy; return locked; },
      hasLock: () => locked, releaseLock: () => { locked = false; }
    }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: content => ({ setMimeType: () => JSON.parse(content) })
    },
    MailApp: {
      getRemainingDailyQuota: () => options.quota ?? 100,
      sendEmail: message => { if (options.fail?.(message)) throw new Error('Mock send failure'); sent.push(message); }
    }
  });
  vm.runInContext(readFileSync(resolve(__dirname, '../integrations/google-apps-script/Code.gs'), 'utf8'), context);
  return { context, sent, props, options, logs };
}

function envelope(lead = fixture, timestamp = Date.now().toString()) {
  const payload = JSON.stringify(lead);
  return { timestamp, payload, signature: createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex') };
}

function post(h, data = envelope()) {
  return h.context.doPost({ postData: { contents: JSON.stringify(data) } });
}

if (process.argv.includes('--preview')) {
  const h = harness();
  assert.equal(post(h).ok, true);
  const folder = resolve(__dirname, '../output/space-emails');
  mkdirSync(folder, { recursive: true });
  h.sent.forEach((mail, i) => writeFileSync(resolve(folder, i === 0 ? 'user.html' : 'admin.html'), mail.htmlBody));
  console.log('Generated user/admin HTML previews in output/space-emails (sample data only).');
} else {
  test('sends two separate RTL emails with correct recipients and reply-to', () => {
    const h = harness();
    const result = post(h);
    assert.equal(result.ok, true);
    assert.equal(result.userSent, true);
    assert.equal(result.adminSent, true);
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[0].to, fixture.email);
    assert.equal(h.sent[0].replyTo, 'owner@example.com');
    assert.equal(h.sent[1].to, 'owner@example.com');
    assert.equal(h.sent[1].replyTo, fixture.email);
    for (const mail of h.sent) {
      assert.match(mail.htmlBody, /<html lang="he" dir="rtl"/);
      assert.match(mail.htmlBody, /dir="ltr"/);
      assert.match(mail.htmlBody, /table-layout:fixed/);
      assert.ok(mail.body.includes(fixture.email));
      assert.ok(mail.htmlBody.includes(fixture.username));
      assert.ok(!('bcc' in mail) && !('cc' in mail));
    }
  });

  test('repeated requests do not resend completed emails', () => {
    const h = harness();
    assert.equal(post(h).ok, true);
    assert.equal(post(h).ok, true);
    assert.equal(h.sent.length, 2);
  });

  test('partial failure retries only the failed recipient', () => {
    const h = harness({ fail: mail => mail.to === 'owner@example.com' });
    assert.equal(post(h).userSent, true);
    assert.equal(h.sent.length, 1);
    h.options.fail = null;
    assert.equal(post(h).ok, true);
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent.filter(mail => mail.to === fixture.email).length, 1);
  });

  test('only registrant receives the exact chosen password; admin and receipts do not', () => {
    const h = harness();
    assert.equal(post(h).ok, true);
    const user = h.sent[0];
    const admin = h.sent[1];
    const escapedPassword = h.context.escape_(fixture.password);
    assert.ok(user.body.includes('סיסמה: ' + fixture.password + '\n'));
    assert.ok(user.htmlBody.includes(escapedPassword));
    assert.match(user.htmlBody, /white-space:pre-wrap/);
    assert.doesNotMatch(user.htmlBody, /הסיסמה אינה נשלחת/);
    for (const value of Object.values(admin)) {
      assert.ok(!String(value).includes(fixture.password));
      assert.ok(!String(value).includes(escapedPassword));
    }
    assert.ok(!JSON.stringify(h.props).includes(fixture.password));
    assert.ok(!JSON.stringify(h.logs).includes(fixture.password));
  });

  test('rejects missing, short and multiline passwords without sending', () => {
    const h = harness();
    for (const password of [undefined, '', 'short', 'chosen\npassword', 'chosen\rpassword', 'x'.repeat(1025)]) {
      assert.equal(post(h, envelope({ ...fixture, password })).ok, false);
    }
    assert.equal(h.sent.length, 0);
  });

  test('does not expose the password in failed delivery logs or responses', () => {
    const h = harness({ fail: () => { throw new Error(fixture.password); } });
    const result = post(h);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'MAIL_SEND_FAILED');
    assert.ok(!JSON.stringify(result).includes(fixture.password));
    assert.ok(!JSON.stringify(h.logs).includes(fixture.password));
  });

  test('rejects unsigned, stale and tampered requests without sending', () => {
    const h = harness();
    assert.equal(post(h, { ...envelope(), signature: '0'.repeat(64) }).ok, false);
    assert.equal(post(h, envelope(fixture, (Date.now() - 360000).toString())).ok, false);
    const changed = envelope();
    changed.payload = JSON.stringify({ ...fixture, email: 'attacker@example.com' });
    assert.equal(post(h, changed).ok, false);
    assert.equal(h.sent.length, 0);
  });

  test('rejects missing email, header injection, and off-site portal URL', () => {
    const h = harness();
    for (const invalid of [{ email: '' }, { fullName: 'Name\r\nBcc: bad@example.com' }, { portalUrl: 'https://evil.example/portal/my-123456' }]) {
      assert.equal(post(h, envelope({ ...fixture, ...invalid })).ok, false);
    }
    assert.equal(h.sent.length, 0);
  });

  test('escapes untrusted names in HTML and preserves Hebrew and LTR values', () => {
    const h = harness();
    assert.equal(post(h, envelope({ ...fixture, fullName: 'נועה <img src=x onerror=alert(1)>' })).ok, true);
    assert.match(h.sent[0].htmlBody, /נועה &lt;img/);
    assert.doesNotMatch(h.sent[0].htmlBody, /<img/);
    assert.match(h.sent[0].htmlBody, /direction:ltr;[^>]*>noa@example.com/);
  });

  test('quota exhaustion is explicit, not a false success', () => {
    const h = harness({ quota: 0 });
    const result = post(h);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'DAILY_QUOTA');
    assert.equal(result.retryable, false);
    assert.equal(h.sent.length, 0);
  });

  test('rejects keys shorter than 16 characters without sending', () => {
    const h = harness();
    h.props.WEBHOOK_SECRET = '1'.repeat(15);
    assert.equal(post(h).error, 'INVALID_REQUEST_OR_CONFIGURATION');
    assert.equal(h.sent.length, 0);
  });

  test('busy lock returns retryable and changed payload cannot reuse a receipt ID', () => {
    const h = harness({ busy: true });
    assert.equal(post(h).retryable, true);
    h.options.busy = false;
    assert.equal(post(h).ok, true);
    assert.equal(post(h, envelope({ ...fixture, email: 'second@example.com' })).error, 'REQUEST_ID_CONFLICT');
    assert.equal(h.sent.length, 2);
  });

  test('receipts contain no contact data and expired receipts are pruned', () => {
    const h = harness();
    h.props.receipt_old = JSON.stringify({ updatedAt: Date.now() - 90000000 });
    assert.equal(post(h).ok, true);
    assert.equal(h.props.receipt_old, undefined);
    assert.ok(!h.props['receipt_' + fixture.id].includes(fixture.email));
    assert.ok(!h.props['receipt_' + fixture.id].includes(fixture.fullName));
  });

  test('setup applies the requested administrator and health check exposes no secrets', () => {
    const h = harness();
    delete h.props.ADMIN_EMAIL;
    h.context.setup();
    assert.equal(h.props.ADMIN_EMAIL, 'adithelevy@gmail.com');
    const health = JSON.stringify(h.context.doGet());
    assert.ok(!health.includes(secret) && !health.includes('owner@example.com'));
  });

  test('Next.js sender and Apps Script interoperate, including a partial retry', async t => {
    const h = harness({ fail: mail => {
      if (mail.to !== 'owner@example.com') return false;
      h.options.fail = null;
      return true;
    } });
    const axios = (await import('axios')).default;
    const original = axios.post;
    // Mock this unrelated dependency so importing the sender never loads the real DB.
    const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier === '@/lib/contentHelpers') {
        return { url: 'data:text/javascript,export function isPublicWebUrl(url){return new URL(url).protocol === "https:";}', shortCircuit: true };
      }
      return nextResolve(specifier, context);
    } });
    const response = (data, status = 200, type = 'application/json', url = 'https://script.googleusercontent.com/test') => ({
      status, data, headers: { 'content-type': type }, request: { res: { responseUrl: url } }
    });
    const oldUrl = process.env.SPACE_LEADS_APPS_SCRIPT_URL;
    const oldSecret = process.env.SPACE_LEADS_WEBHOOK_SECRET;
    t.after(() => {
      axios.post = original;
      hooks.deregister();
      if (oldUrl === undefined) delete process.env.SPACE_LEADS_APPS_SCRIPT_URL; else process.env.SPACE_LEADS_APPS_SCRIPT_URL = oldUrl;
      if (oldSecret === undefined) delete process.env.SPACE_LEADS_WEBHOOK_SECRET; else process.env.SPACE_LEADS_WEBHOOK_SECRET = oldSecret;
    });
    process.env.SPACE_LEADS_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test-deployment/exec';
    process.env.SPACE_LEADS_WEBHOOK_SECRET = secret;
    let calls = 0;
    axios.post = async (url, data, options) => {
      calls++;
      assert.equal(options.maxRedirects, 5);
      const forwarded = JSON.parse(data.payload);
      assert.equal(forwarded.password, fixture.password);
      assert.equal(forwarded.token, undefined);
      return response(post(h, data));
    };
    const { sendSpaceLeadEmails } = await import(pathToFileURL(resolve(__dirname, '../src/services/spaceLeadEmail.ts')).href);
    const result = await sendSpaceLeadEmails({ ...fixture, token: 'PRIVATE_TOKEN' });
    assert.deepEqual(result, { userSent: true, adminSent: true });
    assert.equal(calls, 2);
    assert.equal(h.sent.length, 2);
    assert.ok(h.sent[0].body.includes(fixture.password));
    assert.ok(!h.sent[1].body.includes(fixture.password));
    assert.ok(!h.sent[1].htmlBody.includes(h.context.escape_(fixture.password)));

    // Google authentication pages and unexpected response IDs must fail closed.
    axios.post = async () => response('Unauthorized', 401);
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_AUTH_REQUIRED');
    axios.post = async () => response('', 200, 'text/html', 'https://accounts.google.com/v3/signin');
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_AUTH_REQUIRED');
    axios.post = async () => response('<html>Sign in</html>', 200, 'text/html');
    assert.equal((await sendSpaceLeadEmails(fixture)).userSent, false);
    axios.post = async () => response({ requestId: 'different-id', userSent: true, adminSent: true });
    assert.equal((await sendSpaceLeadEmails(fixture)).userSent, false);
    axios.post = async () => response({ ok: false, requestId: '', userSent: false, adminSent: false, error: 'INVALID_REQUEST_OR_CONFIGURATION' });
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_CONFIGURATION');
    axios.post = async () => response({ ok: false, requestId: '', userSent: false, adminSent: false, error: 'UNAUTHORIZED' });
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_SIGNATURE_REJECTED');
    process.env.SPACE_LEADS_WEBHOOK_SECRET = '1'.repeat(15);
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_CONFIGURATION');
    process.env.SPACE_LEADS_WEBHOOK_SECRET = secret;
    assert.equal((await sendSpaceLeadEmails({ ...fixture, password: undefined })).error, 'INVALID_REGISTRATION_PASSWORD');
    process.env.SPACE_LEADS_APPS_SCRIPT_URL = 'https://evil.example/exec';
    axios.post = async () => { throw new Error('Must not request an untrusted endpoint'); };
    assert.equal((await sendSpaceLeadEmails(fixture)).error, 'APPS_SCRIPT_CONFIGURATION');
  });
}
