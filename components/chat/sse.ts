// A pure parser for the Server-Sent Events stream the chat Worker passes through from the
// Messages API (SITE-PLAN.md 6.4). Pure means no fetch, no DOM, no React: it takes the text that
// arrived and the leftover state from the last call, and returns what happened plus the new
// state. That is why node can test it against recorded fixtures (sse.test.ts).
//
// The stream is lines. "event: x" names the event, "data: {...}" carries JSON, and a blank line
// ends one event. A network chunk can stop anywhere, even in the middle of a line, so the
// unfinished tail is kept in `buffer` until the next chunk completes it.
//
// What we keep, and ignore everything else (message_start, ping, content_block_start, ...):
//   content_block_delta with a text_delta  -> { type: 'text', text }
//   message_stop                            -> { type: 'done' }
//   error (the API's own, or the Worker's)  -> { type: 'error', kind, message }
// The Worker's error shape is { type: 'error', error: { type: 'rate_limited' | 'bad_request' |
// 'upstream', message } }, the same shape the API uses, so one branch reads both.

export type SSEState = { buffer: string; event: string | null; data: string[] };

export type SSEOut =
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; kind: string; message: string };

export const SSE_START: SSEState = { buffer: '', event: null, data: [] };

type Payload = {
  type?: string;
  delta?: { type?: string; text?: string };
  error?: { type?: string; message?: string };
};

function dispatch(event: string | null, data: string[], out: SSEOut[]) {
  if (!data.length) return;
  let json: Payload;
  try { json = JSON.parse(data.join('\n')) as Payload; } catch { return; } // not JSON: not ours
  const type = json.type ?? event;
  if (type === 'content_block_delta' && json.delta?.type === 'text_delta' && typeof json.delta.text === 'string') {
    out.push({ type: 'text', text: json.delta.text });
  } else if (type === 'message_stop') {
    out.push({ type: 'done' });
  } else if (type === 'error') {
    out.push({ type: 'error', kind: json.error?.type ?? 'upstream', message: json.error?.message ?? '' });
  }
}

export function parseSSE(chunk: string, state: SSEState = SSE_START): { state: SSEState; out: SSEOut[] } {
  const out: SSEOut[] = [];
  const lines = (state.buffer + chunk).split('\n');
  const buffer = lines.pop() ?? ''; // the unfinished last line waits for the next chunk
  let event = state.event;
  let data = [...state.data];

  for (const raw of lines) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line === '') {
      dispatch(event, data, out);
      event = null;
      data = [];
    } else if (line.startsWith(':')) {
      continue; // a comment line, used as a keep-alive
    } else if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''));
    }
  }
  return { state: { buffer, event, data }, out };
}
