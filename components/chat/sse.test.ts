// node --experimental-strip-types --test components/chat/
// parseSSE against recorded streams: a normal answer, the same answer cut into awkward chunks
// (a split line), an `error` event mid-stream, and the Worker's rate-limit event.
//
// The module is imported by URL at run time: node needs the ".ts" extension in the path, and
// TypeScript (tsc --noEmit) refuses ".ts" in a static import without a config change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SSEOut, SSEState, parseSSE as ParseSSE, SSE_START as Start } from './sse';

const mod = await import(new URL('./sse.ts', import.meta.url).href) as { parseSSE: typeof ParseSSE; SSE_START: typeof Start };
const { parseSSE, SSE_START } = mod;

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

function run(chunks: string[]): SSEOut[] {
  let state: SSEState = SSE_START;
  const out: SSEOut[] = [];
  for (const chunk of chunks) {
    const step = parseSSE(chunk, state);
    state = step.state;
    out.push(...step.out);
  }
  return out;
}

const text = (out: SSEOut[]) => out.filter(o => o.type === 'text').map(o => (o as { text: string }).text).join('');

void test('a normal stream yields its text and then done', () => {
  const out = run([fixture('normal.sse')]);
  assert.equal(text(out), 'Blueberry is an organic chemistry learning platform.');
  assert.deepEqual(out.at(-1), { type: 'done' });
  assert.equal(out.filter(o => o.type === 'done').length, 1);
});

void test('a stream cut mid-line, mid-JSON and between \\r and \\n gives the same result', () => {
  const whole = fixture('normal.sse');
  const expected = run([whole]);
  for (const size of [1, 3, 7, 17, 64]) {
    const chunks: string[] = [];
    for (let i = 0; i < whole.length; i += size) chunks.push(whole.slice(i, i + size));
    assert.deepEqual(run(chunks), expected, `chunk size ${size}`);
  }
  const crlf = whole.replace(/\n/g, '\r\n');
  const cut = crlf.indexOf('\r\n') + 1; // the chunk ends on the \r, the next starts with \n
  assert.deepEqual(run([crlf.slice(0, cut), crlf.slice(cut)]), expected);
});

void test('an error event mid-stream keeps the text so far and reports the error', () => {
  const out = run([fixture('error.sse')]);
  assert.equal(text(out), 'Andrew');
  assert.deepEqual(out.at(-1), { type: 'error', kind: 'overloaded_error', message: 'Overloaded' });
  assert.equal(out.some(o => o.type === 'done'), false);
});

void test("the Worker's 429 event reads as rate_limited", () => {
  assert.deepEqual(run([fixture('rate-limited.sse')]), [{ type: 'error', kind: 'rate_limited', message: 'Too many requests' }]);
});

void test('comments, junk data and unknown events are ignored', () => {
  const out = run([': keep-alive\n\nevent: ping\ndata: {"type":"ping"}\n\ndata: not json\n\n']);
  assert.deepEqual(out, []);
});

void test('the input state is not changed (the parser is pure)', () => {
  const before = { buffer: 'event: me', event: null, data: [] as string[] };
  const copy = JSON.stringify(before);
  parseSSE('ssage_stop\ndata: {"type":"message_stop"}\n\n', before);
  assert.equal(JSON.stringify(before), copy);
});
