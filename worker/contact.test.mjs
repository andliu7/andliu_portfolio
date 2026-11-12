// node --test worker/chat.test.mjs worker/contact.test.mjs   (node 22.12 does not take a folder)
// The contact mailer's rules with a fake fetch and a fake limiter: nothing here reaches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, ContactGate, takeSlot, CONTACT_LIMITS, DEFAULT_FROM, DEFAULT_DAILY_CAP, IP_DAILY_CAP } from './contact.js';

const ORIGIN = 'https://andliu.dev';
const KEY = 're_test_not_a_real_key';
const TO = 'andrew@example.com';

function limiter(success = true) {
  const calls = [];
  return { calls, limit: async opts => { calls.push(opts); return { success }; } };
}

const env = (over = {}) => ({ RESEND_API_KEY: KEY, CONTACT_LIMIT: limiter(), ...over });

function post(body, headers = { Origin: ORIGIN }) {
  return new Request('https://chat.example/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const good = { name: 'Ada Lovelace', contact: 'ada@example.com', about: 'I write programs for engines.', message: 'Hello Andrew, loved the site.', botcheck: '' };

function fakeFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return { calls, impl };
}

const run = (req, e = env(), f = fakeFetch(new Response('{"id":"x"}'))) => handleContact(req, e, { to: TO, fetchImpl: f.impl });

void test('preflight from an allowed origin is answered and echoes the origin', async () => {
  const res = await run(new Request('https://chat.example/contact', { method: 'OPTIONS', headers: { Origin: ORIGIN } }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'content-type');
});

void test('another origin, or none, is 403 with no CORS headers and sends nothing', async () => {
  for (const headers of [{ Origin: 'https://evil.example' }, {}]) {
    const f = fakeFetch(new Response('{}'));
    const res = await run(post(good, headers), env(), f);
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
    assert.equal(f.calls.length, 0);
  }
});

void test('a PUT is 405 JSON', async () => {
  const res = await run(new Request('https://chat.example/contact', { method: 'PUT', headers: { Origin: ORIGIN } }));
  assert.equal(res.status, 405);
  assert.equal((await res.json()).ok, false);
});

// A real ContactGate over a fake storage, behind the namespace shape the Worker calls.
function gate(envOver = {}) {
  const data = new Map();
  const storage = { get: async k => data.get(k), put: async (k, v) => { data.set(k, v); } };
  const object = new ContactGate({ storage }, envOver);
  return { idFromName: name => name, get: () => object };
}
const postFrom = ip => post(good, { Origin: ORIGIN, 'CF-Connecting-IP': ip });
const status = async e => (await (await run(new Request('https://chat.example/contact', { headers: { Origin: ORIGIN } }), e)).json()).suspended;

void test('GET reports the form open, and open with no gate bound', async () => {
  assert.equal(await status(env({ CONTACT_GATE: gate() })), false);
  assert.equal(await status(env()), false);
});

void test('GET from another origin is 403', async () => {
  const res = await run(new Request('https://chat.example/contact', { headers: { Origin: 'https://evil.example' } }));
  assert.equal(res.status, 403);
});

void test('at the daily cap the form suspends: 503, nothing sent, and GET says so', async () => {
  const e = env({ CONTACT_GATE: gate({ CONTACT_DAILY_CAP: '2' }), CONTACT_DAILY_CAP: '2' });
  const f = fakeFetch(new Response('{"id":"x"}'));
  assert.equal((await run(postFrom('203.0.113.1'), e, f)).status, 200);
  assert.equal(await status(e), false);
  assert.equal((await run(postFrom('203.0.113.2'), e, f)).status, 200);
  assert.equal(await status(e), true);
  const res = await run(postFrom('203.0.113.3'), e, f);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.type, 'suspended');
  assert.equal(f.calls.length, 2);
});

void test('one address over its daily share is 429 and does not use up the cap for others', async () => {
  const e = env({ CONTACT_GATE: gate() });
  const f = fakeFetch(new Response('{"id":"x"}'));
  for (let i = 0; i < IP_DAILY_CAP; i += 1) assert.equal((await run(postFrom('203.0.113.1'), e, f)).status, 200);
  const res = await run(postFrom('203.0.113.1'), e, f);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error.type, 'rate_limited');
  assert.equal(f.calls.length, IP_DAILY_CAP);
  assert.equal((await run(postFrom('203.0.113.2'), e, f)).status, 200);
  assert.equal(await status(e), false);
});

void test('messages that fail validation or the honeypot do not count', async () => {
  const e = env({ CONTACT_GATE: gate({ CONTACT_DAILY_CAP: '1' }), CONTACT_DAILY_CAP: '1' });
  const f = fakeFetch(new Response('{"id":"x"}'));
  assert.equal((await run(post({ ...good, botcheck: 'spam' }), e, f)).status, 400);
  assert.equal((await run(post({ ...good, message: 'short' }), e, f)).status, 400);
  assert.equal(await status(e), false);
});

void test('a broken gate fails closed: nothing is sent and the form reads as suspended', async () => {
  const broken = { idFromName: name => name, get: () => ({ fetch: async () => { throw new Error('over quota'); } }) };
  const e = env({ CONTACT_GATE: broken });
  const f = fakeFetch(new Response('{}'));
  assert.equal((await run(post(good), e, f)).status, 503);
  assert.equal(f.calls.length, 0);
  assert.equal(await status(e), true);
});

void test('the IP is not stored in the clear', async () => {
  const data = new Map();
  const storage = { get: async k => data.get(k), put: async (k, v) => { data.set(k, v); } };
  const object = new ContactGate({ storage }, {});
  const e = env({ CONTACT_GATE: { idFromName: name => name, get: () => object } });
  await run(postFrom('203.0.113.9'), e);
  assert.equal(JSON.stringify([...data]).includes('203.0.113.9'), false);
});

void test('takeSlot: a new day starts the counts over', () => {
  const full = { day: '2026-10-31', total: DEFAULT_DAILY_CAP, ips: { a: 3 } };
  assert.equal(takeSlot(full, '2026-10-31', 'b', DEFAULT_DAILY_CAP).verdict, 'suspended');
  const next = takeSlot(full, '2026-11-01', 'a', DEFAULT_DAILY_CAP);
  assert.equal(next.verdict, 'ok');
  assert.deepEqual(next.record, { day: '2026-11-01', total: 1, ips: { a: 1 } });
});

void test('each invalid field is a 400 naming that field, and nothing is sent', async () => {
  const cases = [
    [{ name: '' }, 'name'],
    [{ name: '   ' }, 'name'],
    [{ name: 'x'.repeat(CONTACT_LIMITS.name + 1) }, 'name'],
    [{ contact: 'x'.repeat(CONTACT_LIMITS.contact + 1) }, 'contact'],
    [{ about: 'x'.repeat(CONTACT_LIMITS.about + 1) }, 'about'],
    [{ message: 'too short' }, 'message'],
    [{ message: 'y'.repeat(CONTACT_LIMITS.messageMax + 1) }, 'message'],
    [{ botcheck: 'http://spam.example' }, 'botcheck'],
  ];
  for (const [over, field] of cases) {
    const f = fakeFetch(new Response('{}'));
    const res = await run(post({ ...good, ...over }), env(), f);
    assert.equal(res.status, 400, field);
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.type, 'invalid');
    assert.deepEqual(Object.keys(body.error.fields), [field]);
    assert.equal(f.calls.length, 0);
  }
});

void test('malformed and oversized bodies are 400 and 413', async () => {
  assert.equal((await run(post('not json'))).status, 400);
  assert.equal((await run(post({ ...good, pad: 'z'.repeat(CONTACT_LIMITS.bodyBytes) }))).status, 413);
});

void test('over the per-IP limit is 429, keyed by the IP, and sends nothing', async () => {
  const lim = limiter(false);
  const f = fakeFetch(new Response('{}'));
  const res = await run(post(good), env({ CONTACT_LIMIT: lim }), f);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error.type, 'rate_limited');
  assert.deepEqual(lim.calls, [{ key: '203.0.113.7' }]);
  assert.equal(f.calls.length, 0);
});

void test('no key is 503; Resend failing or unreachable is 502; the key never leaks', async () => {
  assert.equal((await run(post(good), env({ RESEND_API_KEY: undefined }))).status, 503);
  for (const response of [new Response('{}', { status: 422 }), new Error('network down')]) {
    const res = await run(post(good), env(), fakeFetch(response));
    assert.equal(res.status, 502);
    assert.equal((await res.text()).includes(KEY), false);
  }
});

void test('a good message is one Resend call to Andrew, reply_to the visitor, and 200 ok', async () => {
  const f = fakeFetch(new Response('{"id":"x"}', { status: 200 }));
  const res = await run(post({ ...good, name: 'Ada\r\nBcc: x@y.z' }), env(), f);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(f.calls.length, 1);
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
  const sent = JSON.parse(init.body);
  assert.equal(sent.from, DEFAULT_FROM);
  assert.deepEqual(sent.to, [TO]);
  assert.equal(sent.reply_to, 'ada@example.com');
  assert.equal(sent.subject, 'Portfolio message from Ada Bcc: x@y.z'); // line breaks stripped
  assert.match(sent.text, /^Hello Andrew, loved the site\./);
  assert.match(sent.text, /Reach them at: ada@example\.com/);
  assert.match(sent.text, /About them: I write programs for engines\./);
});

void test('a contact that is not an email is passed on, with no reply_to', async () => {
  const f = fakeFetch(new Response('{"id":"x"}'));
  const res = await run(post({ ...good, contact: 'linkedin.com/in/ada\r\nBcc: x@y.z' }), env(), f);
  assert.equal(res.status, 200);
  const sent = JSON.parse(f.calls[0].init.body);
  assert.equal('reply_to' in sent, false);
  assert.match(sent.text, /Reach them at: linkedin\.com\/in\/ada Bcc: x@y\.z/);
});

void test('contact and about are optional, and the email says when they were left out', async () => {
  const f = fakeFetch(new Response('{"id":"x"}'));
  const { contact: _contact, about: _about, ...bare } = good;
  const res = await run(post(bare), env(), f);
  assert.equal(res.status, 200);
  const sent = JSON.parse(f.calls[0].init.body);
  assert.equal('reply_to' in sent, false);
  assert.match(sent.text, /Reach them at: not given/);
  assert.equal(sent.text.includes('About them'), false);
});

void test('CONTACT_FROM overrides the sender', async () => {
  const f = fakeFetch(new Response('{}'));
  await run(post(good), env({ CONTACT_FROM: 'Andrew <hi@andliu.dev>' }), f);
  assert.equal(JSON.parse(f.calls[0].init.body).from, 'Andrew <hi@andliu.dev>');
});

void test('the html body bolds the labels, escapes what was typed, and drops From for an unsigned letter', async () => {
  const { contactHtml, ANON_NAME } = await import('./contact.js');
  const html = contactHtml({ name: 'Ada <b>', contact: 'ada@example.com', about: 'Looking for: A website, Tutoring', message: 'Hi <script>x</script>\nSecond line', signature: '' });
  assert.match(html, /<b>From:<\/b> Ada &lt;b&gt;/);
  assert.match(html, /<b>Reach them at:<\/b> ada@example\.com/);
  assert.match(html, /<b>Looking for:<\/b> A website, Tutoring/);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('cid:signature'), false);
  const anon = contactHtml({ name: ANON_NAME, contact: '3015550199', about: '', message: 'Hello there, a test.', signature: 'AAAA' });
  assert.equal(anon.includes('From:'), false);
  assert.match(anon, /cid:signature/);
});
