// node --test worker/
// The proxy's rules with a fake fetch and a fake limiter: nothing here reaches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, LIMITS } from './handler.js';

const ORIGIN = 'https://andliu.dev';
const KEY = 'sk-test-not-a-real-key';

function limiter(success = true) {
  const calls = [];
  return { calls, limit: async opts => { calls.push(opts); return { success }; } };
}

const env = (over = {}) => ({ ANTHROPIC_API_KEY: KEY, MODEL: 'claude-haiku-4-5', CHAT_LIMIT: limiter(), ...over });

function post(body, headers = { Origin: ORIGIN }) {
  return new Request('https://chat.example/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ask = { messages: [{ role: 'user', content: 'What is Blueberry?' }] };
const STREAM = 'event: message_stop\ndata: {"type":"message_stop"}\n\n';

function fakeFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return { calls, impl };
}

async function errorType(res) {
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const text = await res.text();
  assert.match(text, /^event: error\n/);
  return JSON.parse(text.split('\n')[1].slice(6)).error.type;
}

void test('preflight from an allowed origin is answered and echoes the origin', async () => {
  const res = await handle(new Request('https://chat.example/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env(), { system: 's' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'content-type');
  assert.equal(res.headers.get('access-control-max-age'), '86400');
});

void test('preflight from another origin is 403 with no CORS headers', async () => {
  const res = await handle(new Request('https://chat.example/', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env(), { system: 's' });
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

void test('a POST from another origin is 403 and never calls the model', async () => {
  const f = fakeFetch(new Response(STREAM));
  const res = await handle(post(ask, { Origin: 'https://evil.example' }), env(), { system: 's', fetchImpl: f.impl });
  assert.equal(res.status, 403);
  assert.equal(f.calls.length, 0);
});

void test('a request without Origin is rejected', async () => {
  const f = fakeFetch(new Response(STREAM));
  const res = await handle(post(ask, {}), env(), { system: 's', fetchImpl: f.impl });
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(f.calls.length, 0);
});

void test('oversized and malformed input is a bad_request event', async () => {
  const f = fakeFetch(new Response(STREAM));
  const run = body => handle(post(body), env(), { system: 's', fetchImpl: f.impl }).then(errorType);
  assert.equal(await run({ messages: [{ role: 'user', content: 'x'.repeat(LIMITS.chars + 1) }] }), 'bad_request');
  const many = Array.from({ length: LIMITS.turns + 1 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'hi' }));
  assert.equal(await run({ messages: many }), 'bad_request');
  assert.equal(await run({ messages: [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }] }), 'bad_request');
  assert.equal(await run({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }), 'bad_request');
  assert.equal(await run({ messages: [{ role: 'assistant', content: 'a' }] }), 'bad_request');
  assert.equal(await run({ messages: [] }), 'bad_request');
  assert.equal(await run('not json'), 'bad_request');
  assert.equal(await run(JSON.stringify({ messages: [{ role: 'user', content: 'x' }], pad: 'y'.repeat(LIMITS.bodyBytes) })), 'bad_request');
  assert.equal(f.calls.length, 0);
});

void test('over the per-IP limit is a rate_limited event, keyed by the IP', async () => {
  const lim = limiter(false);
  const f = fakeFetch(new Response(STREAM));
  const res = await handle(post(ask), env({ CHAT_LIMIT: lim }), { system: 's', fetchImpl: f.impl });
  assert.equal(await errorType(res), 'rate_limited');
  assert.deepEqual(lim.calls, [{ key: '203.0.113.7' }]);
  assert.equal(f.calls.length, 0);
});

void test("the model's own 429 is a rate_limited event", async () => {
  const f = fakeFetch(new Response('{}', { status: 429 }));
  assert.equal(await errorType(await handle(post(ask), env(), { system: 's', fetchImpl: f.impl })), 'rate_limited');
});

void test('upstream failures are upstream events, and the key never leaks', async () => {
  for (const response of [new Response('{}', { status: 500 }), new Error('network down')]) {
    const f = fakeFetch(response);
    const res = await handle(post(ask), env(), { system: 's', fetchImpl: f.impl });
    const text = await res.clone().text();
    assert.equal(await errorType(res), 'upstream');
    assert.equal(text.includes(KEY), false);
  }
  const missing = await handle(post(ask), env({ ANTHROPIC_API_KEY: undefined }), { system: 's', fetchImpl: fakeFetch(new Response(STREAM)).impl });
  assert.equal(await errorType(missing), 'upstream');
});

void test('a good request streams the model through with the key, model, cap and system prompt', async () => {
  const f = fakeFetch(new Response(STREAM, { status: 200 }));
  const res = await handle(post(ask), env(), { system: 'SYSTEM', fetchImpl: f.impl });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(await res.text(), STREAM);
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(init.headers['x-api-key'], KEY);
  assert.equal(init.headers['anthropic-version'], '2023-06-01');
  const sent = JSON.parse(init.body);
  assert.deepEqual(sent, { model: 'claude-haiku-4-5', max_tokens: 400, system: 'SYSTEM', messages: ask.messages, stream: true });
});
