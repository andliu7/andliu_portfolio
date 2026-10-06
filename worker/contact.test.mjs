// node --test worker/chat.test.mjs worker/contact.test.mjs   (node 22.12 does not take a folder)
// The contact mailer's rules with a fake fetch and a fake limiter: nothing here reaches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, CONTACT_LIMITS, DEFAULT_FROM } from './contact.js';

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

const good = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello Andrew, loved the site.', botcheck: '' };

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

void test('a GET is 405 JSON', async () => {
  const res = await run(new Request('https://chat.example/contact', { headers: { Origin: ORIGIN } }));
  assert.equal(res.status, 405);
  assert.equal((await res.json()).ok, false);
});

void test('each invalid field is a 400 naming that field, and nothing is sent', async () => {
  const cases = [
    [{ name: '' }, 'name'],
    [{ name: '   ' }, 'name'],
    [{ name: 'x'.repeat(CONTACT_LIMITS.name + 1) }, 'name'],
    [{ email: 'not-an-email' }, 'email'],
    [{ email: 'a@b' }, 'email'],
    [{ email: 'a b@c.com' }, 'email'],
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
});

void test('CONTACT_FROM overrides the sender', async () => {
  const f = fakeFetch(new Response('{}'));
  await run(post(good), env({ CONTACT_FROM: 'Andrew <hi@andliu.dev>' }), f);
  assert.equal(JSON.parse(f.calls[0].init.body).from, 'Andrew <hi@andliu.dev>');
});
