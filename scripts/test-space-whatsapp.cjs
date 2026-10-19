// Node 24+: exercise the real registration handler with isolated in-memory dependencies.
// No database connections, real accounts, WhatsApp messages or emails.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');

const phoneHelpers = vm.createContext({});
vm.runInContext(stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/lib/phoneHelpers.ts'), 'utf8'))
  .replace(/^export /gm, ''), phoneHelpers);

const source = stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/app/api/portal/join/route.ts'), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export async function POST', 'async function POST');
const password = '  Chosen<&Password!2026  ';
const fixture = { source: 'space', fullName: 'נועה ישראלי', phone: '0509611808', username: 'noa.qa', password, goal: 'growth' };

function harness(options = {}) {
  const records = (options.existingClients || []).map(record => ({ ...record })), messages = [], emails = [], logs = [];
  let flushes = 0;
  const matches = (item, filter) => typeof filter === 'function' ? filter(item) : Object.entries(filter).every(([key, value]) => item[key] === value);
  const clients = {
    findOne: filter => records.find(item => matches(item, filter)),
    insertOne: item => { const record = { id: 'qa-id', ...item }; records.push(record); return record; },
    updateOne: (filter, update) => Object.assign(records.find(item => matches(item, filter)), update)
  };
  const context = vm.createContext({
    console: { warn: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    crypto: { randomInt: () => 123456 },
    db: { ensureLoaded: async () => {}, collection: name => name === 'clients' ? clients : { findOne: () => null },
      flush: async () => { flushes++; }, getSettings: () => ({ autoSendLoginEmail: true, ...options.settings }) },
    NextResponse: { json: (data, init) => new Response(JSON.stringify(data), init) },
    sendWhatsAppMessage: async message => {
      assert.ok(flushes > 0, 'account must be persisted before external notification');
      messages.push(message);
      if (options.failWhatsApp) throw new Error('private-provider-error-' + password);
      return options.invalidResponse ? { success: true } : { success: true, idMessage: 'qa-message-id' };
    },
    sendLoginDetailsEmail: async data => { emails.push(data); return { sent: true }; },
    hashPassword: value => { assert.equal(value, password); return 'hash-only'; },
    createSessionCookie: () => 'test=cookie', signClientToken: () => 'test-session',
    getBaseUrl: request => request ? 'https://request.example' : 'https://canonical.example',
    normalizePhone: phoneHelpers.normalizePhone, isTestPhoneNumber: phoneHelpers.isTestPhoneNumber
  });
  vm.runInContext(source, context);
  return { records, messages, emails, logs, submit: async (overrides = {}) => {
    const response = await context.POST({ json: async () => ({ ...fixture, ...overrides }) });
    return { status: response.status, body: await response.json() };
  } };
}

test('/space accepts an omitted email and sends exact credentials via WhatsApp only', async () => {
  const h = harness();
  const { status, body } = await h.submit();
  assert.equal(status, 201);
  assert.equal(body.whatsappSent, true);
  assert.equal(body.emailSent, false);
  assert.equal(body.adminEmailSent, false);
  assert.equal(h.emails.length, 0);
  assert.equal(h.messages.length, 1);
  assert.equal(h.messages[0].phone, fixture.phone);
  assert.ok(h.messages[0].message.includes(password));
  assert.ok(h.messages[0].message.includes(fixture.username));
  assert.ok(h.messages[0].message.includes('https://canonical.example/portal/'));
  assert.equal(h.records[0].password, 'hash-only');
  assert.equal(h.records[0].email, '');
  assert.equal(h.records[0].registrationOrigin, 'space');
  assert.equal(h.records[0].spaceWhatsAppDelivery.messageId, 'qa-message-id');
  assert.ok(!JSON.stringify({ body, records: h.records, logs: h.logs }).includes(password));
});

test('/space also accepts blank email and never sends email when one is supplied', async () => {
  for (const email of ['', '   ', 'noa@example.com']) {
    const h = harness();
    assert.equal((await h.submit({ email })).status, 201);
    assert.equal(h.emails.length, 0);
  }
});

test('/space still rejects a malformed optional email and missing WhatsApp number', async () => {
  for (const overrides of [{ email: 'invalid' }, { phone: '' }, { phone: '123' }]) {
    const h = harness();
    assert.equal((await h.submit(overrides)).status, 400);
    assert.equal(h.records.length, 0);
    assert.equal(h.messages.length, 0);
  }
});

test('/space always attempts WhatsApp, including when an old caller sends sendWhatsApp:false', async () => {
  const h = harness();
  assert.equal((await h.submit({ sendWhatsApp: false })).body.whatsappSent, true);
  assert.equal(h.messages.length, 1);
});

test('/space reports failed/malformed provider replies without losing the account or leaking passwords', async () => {
  for (const options of [{ failWhatsApp: true }, { invalidResponse: true }]) {
    const h = harness(options);
    const { status, body } = await h.submit();
    assert.equal(status, 201);
    assert.equal(body.whatsappSent, false);
    assert.equal(body.whatsappError, 'WHATSAPP_DELIVERY_FAILED');
    assert.equal(h.records.length, 1);
    assert.equal(h.records[0].spaceWhatsAppDelivery.sent, false);
    assert.equal(h.emails.length, 0);
    assert.ok(!JSON.stringify({ body, records: h.records, logs: h.logs }).includes(password));
    assert.ok(!JSON.stringify(h.logs).includes('private-provider-error'));
  }
});

test('/join keeps its required email and existing email/WhatsApp behavior', async () => {
  const h = harness();
  assert.equal((await h.submit({ source: undefined })).status, 400);
  const result = await h.submit({ source: undefined, email: 'noa@example.com', sendWhatsApp: false });
  assert.equal(result.status, 201);
  assert.equal(result.body.emailSent, true);
  assert.equal(h.emails.length, 1);
  assert.equal(h.messages.length, 0);
  assert.equal(h.records[0].spaceWhatsAppDelivery, undefined);
});

test('existing admin WhatsApp notification is preserved and never includes the chosen password', async () => {
  const h = harness({ settings: { autoSendSelfCareRegistrationWhatsApp: true, selfCareRegistrationNotifyPhone: '0500000000' } });
  const { body } = await h.submit();
  assert.equal(body.registrationNotifySent, true);
  assert.equal(h.messages.length, 2);
  assert.ok(h.messages[0].message.includes(password));
  assert.ok(!h.messages[1].message.includes(password));
});

test('/space allows duplicate 0548354141 in local and international formats without changing the original client', async () => {
  const existing = { id: 'existing-client', phone: '0548354141', username: 'existing.user', portalCode: 'existing-999999' };
  for (const phone of ['0548354141', '054-835-4141', '972548354141', '+972 54 835 4141']) {
    const h = harness({ existingClients: [existing] });
    const result = await h.submit({ phone });
    assert.equal(result.status, 201);
    assert.equal(result.body.whatsappSent, true);
    assert.equal(h.records.length, 2);
    assert.deepEqual(h.records[0], existing);
    assert.equal(h.messages[0].phone, phone);
  }
});

test('the new exception does not allow other duplicate phones or affect /join', async () => {
  for (const phone of ['0548354142', '0541234567']) {
    const h = harness({ existingClients: [{ id: 'existing-client', phone }] });
    assert.equal((await h.submit({ phone })).status, 400);
    assert.equal(h.messages.length, 0);
    assert.equal(h.records.length, 1);
  }
  const h = harness({ existingClients: [{ id: 'existing-client', phone: '0548354141' }] });
  assert.equal((await h.submit({ source: undefined, phone: '054-835-4141', email: 'noa@example.com' })).status, 400);
});

test('the allowed duplicate phone does not bypass username uniqueness', async () => {
  const h = harness({ existingClients: [{ id: 'existing-client', phone: '0548354141', username: fixture.username }] });
  assert.equal((await h.submit({ phone: '0548354141' })).status, 400);
  assert.equal(h.messages.length, 0);
});
