// E2E: portal video deletion — client / superadmin / multi-portal scenarios.
// Runs against an ISOLATED dev server (never production):
//   1. cp server/data/wisecare_db.json <tmp>/sandbox.json  (then set known
//      scrypt passwords for: superadmin 'adicore123', therapist 'dr_sarah',
//      clients 'testuser_client' (unarchive it) and portalCode 'oren-2238')
//   2. WISECARE_DISABLE_MONGODB=1 WISECARE_DB_FILE=<tmp>/sandbox.json \
//      JWT_SECRET=<32+ chars> npm run dev -- -p 8081
//   3. node e2e-portal-delete.cjs
const BASE = 'http://localhost:8081';
const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, pass: Boolean(cond), extra });
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${extra ? ' (' + extra + ')' : ''}`);
};

const j = async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) });

(async () => {
  // --- logins ---
  const saLogin = await j(await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'adicore123', password: 'QaTest!2026#Super', adminPortal: true })
  }));
  check('superadmin login', saLogin.status === 200 && saLogin.body.token);
  const SA = saLogin.body.token;

  const thLogin = await j(await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr_sarah', password: 'QaTest!2026#Sarah' })
  }));
  check('therapist login', thLogin.status === 200 && thLogin.body.token);
  const TH = thLogin.body.token;
  const TH_ID = thLogin.body.user?.id;

  const portalLogin = async (code, username, password) => {
    const res = await fetch(`${BASE}/api/portal/${code}/verify-auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const body = await res.json().catch(() => ({}));
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie().join('; ') : (res.headers.get('set-cookie') || '');
    return { status: res.status, token: body.token, cookie: raw.split(';')[0] };
  };

  const A = await portalLogin('client-6702', 'testuser_client', 'QaTest!2026#Client1');
  check('portal A client login (testuser_client)', A.status === 200 && A.token);
  const B = await portalLogin('oren-2238', 'qa_second_client', 'QaTest!2026#Client2');
  check('portal B client login (qa_second_client)', B.status === 200 && B.token);

  // --- create 3 test videos + assign to client A ---
  const clientA = await j(await fetch(`${BASE}/api/clients?therapistId=${TH_ID}`, { headers: { Authorization: `Bearer ${TH}` } }));
  const clientIdA = (clientA.body || []).find(c => c.portalCode === 'client-6702')?.id;
  check('find client A in CRM list', Boolean(clientIdA));

  const mkItem = async (n) => {
    const created = await j(await fetch(`${BASE}/api/content`, {
      method: 'POST', headers: { Authorization: `Bearer ${TH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: TH_ID, title: `QA-DELETE-TEST ${n}`, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'video' })
    }));
    if (created.status !== 201 && created.status !== 200) return null;
    const id = created.body.id;
    const assigned = await j(await fetch(`${BASE}/api/content/${id}/assign`, {
      method: 'POST', headers: { Authorization: `Bearer ${TH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientIds: [clientIdA], sendWhatsApp: false })
    }));
    return assigned.status === 200 || assigned.status === 201 ? id : null;
  };
  const items = [];
  for (let n = 1; n <= 3; n++) items.push(await mkItem(n));
  check('create+assign 3 test videos', items.filter(Boolean).length === 3, items.join(','));
  if (items.filter(Boolean).length < 3) { console.log('ABORT: setup failed'); process.exit(1); }
  const [item1, item2, item3] = items;

  const portalDel = (itemId, headers) =>
    fetch(`${BASE}/api/portal/client-6702/content/${itemId}`, { method: 'DELETE', headers });

  // T1: delete as the logged-in client of THIS portal
  const t1 = await j(await portalDel(item1, { Authorization: `Bearer ${A.token}` }));
  check('T1 portal delete — own client session', t1.status === 200, JSON.stringify(t1.body).slice(0, 80));

  // T2: delete as SUPERADMIN (app token, no client session at all)
  const t2 = await j(await portalDel(item2, { Authorization: `Bearer ${SA}` }));
  check('T2 portal delete — superadmin', t2.status === 200, JSON.stringify(t2.body).slice(0, 80));

  // T3: multi-portal survival — tab on portal A holds A's token, browser cookie belongs to portal B
  const t3 = await j(await portalDel(item3, { Authorization: `Bearer ${A.token}`, Cookie: B.cookie }));
  check('T3 portal delete — A token + foreign cookie (B)', t3.status === 200, JSON.stringify(t3.body).slice(0, 80));

  // T4 (negative): ONLY portal-B credentials on portal A → must be rejected
  const t4 = await j(await portalDel(item3, { Authorization: `Bearer ${B.token}`, Cookie: B.cookie }));
  check('T4 portal A rejects B-only session (401)', t4.status === 401, `status=${t4.status}`);

  // T5: livekit portal poll as superadmin (no more 401 spam)
  const t5 = await j(await fetch(`${BASE}/api/livekit/portal/client-6702`, { headers: { Authorization: `Bearer ${SA}` } }));
  check('T5 livekit portal poll — superadmin', t5.status === 200, `status=${t5.status}`);

  // T6: verify-auth as superadmin → gate opens in UI
  const t6 = await j(await fetch(`${BASE}/api/portal/client-6702/verify-auth`, { headers: { Authorization: `Bearer ${SA}` } }));
  check('T6 verify-auth — superadmin authenticated', t6.status === 200 && t6.body.authenticated === true, JSON.stringify(t6.body).slice(0, 60));

  // T7: verify items really gone — portal list + CRM list
  const pdata = await j(await fetch(`${BASE}/api/portal/client-6702`, { headers: { Authorization: `Bearer ${A.token}` } }));
  const leftoversPortal = (pdata.body.content || []).filter(c => String(c.title).startsWith('QA-DELETE-TEST'));
  const crm = await j(await fetch(`${BASE}/api/content?therapistId=${TH_ID}`, { headers: { Authorization: `Bearer ${TH}` } }));
  const leftoversCrm = (Array.isArray(crm.body) ? crm.body : []).filter(c => String(c.title).startsWith('QA-DELETE-TEST'));
  check('T7a deleted videos gone from portal list', leftoversPortal.length === 0, `left=${leftoversPortal.length}`);
  check('T7b deleted videos gone from CRM library', leftoversCrm.length === 0, `left=${leftoversCrm.length}`);

  const failed = results.filter(r => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('E2E crashed:', e.message); process.exit(2); });
