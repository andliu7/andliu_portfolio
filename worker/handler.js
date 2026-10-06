// The chat proxy's logic (SITE-PLAN.md 6.5), kept apart from chat.js so node can test it:
// chat.js imports system-prompt.txt as a Worker text module, which plain node cannot load.
//
// Why a proxy at all: the site is a static export on GitHub Pages, so anything in the client is
// public. The Anthropic key lives here as a Worker secret (env.ANTHROPIC_API_KEY) and nowhere else.
//
// Order of checks:
//   1. Origin. Missing or not on the list: 403 with no CORS headers, so a browser on another
//      site cannot even read the refusal. This is the only failure that is not an SSE event.
//   2. OPTIONS: the CORS preflight, answered for the same list.
//   3. Everything after that fails as a 200 SSE `event: error`, in the API's own error shape,
//      so the client has one code path: { type: 'error', error: { type, message } } with type
//      'rate_limited', 'bad_request' or 'upstream'.

export const ALLOWED_ORIGINS = [
  'https://andliu.dev',
  'https://www.andliu.dev',
  'http://localhost:3000', // dev only: remove before the first deploy if you never run it locally
  'http://localhost:3001', // dev only: vinext falls back to 3001 when 3000 is taken
];

export const LIMITS = {
  turns: 12, // messages per request (6 questions and their answers)
  chars: 1000, // per message, the same cap as the textarea
  bodyBytes: 32 * 1024, // the request body, read before parsing
  maxTokens: 400, // per answer
};

const API = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

function sseHeaders(origin) {
  return { ...cors(origin), 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' };
}

/** One SSE error event as a whole 200 response. */
export function sseError(origin, type, message) {
  const body = `event: error\ndata: ${JSON.stringify({ type: 'error', error: { type, message } })}\n\n`;
  return new Response(body, { status: 200, headers: sseHeaders(origin) });
}

/** The messages if they are acceptable, else a reason string. */
export function validate(body) {
  const messages = body && typeof body === 'object' ? body.messages : null;
  if (!Array.isArray(messages) || messages.length === 0) return 'messages must be a non-empty array';
  if (messages.length > LIMITS.turns) return `at most ${LIMITS.turns} messages`;
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    const role = i % 2 === 0 ? 'user' : 'assistant';
    if (!m || m.role !== role) return 'roles must alternate, starting with user';
    if (typeof m.content !== 'string' || !m.content.trim()) return 'each message needs text';
    if (m.content.length > LIMITS.chars) return `at most ${LIMITS.chars} characters per message`;
  }
  if (messages.length % 2 === 0) return 'the last message must be from the user';
  return messages.map(m => ({ role: m.role, content: m.content }));
}

/**
 * @param {Request} request
 * @param {{ ANTHROPIC_API_KEY?: string, MODEL?: string, CHAT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } }} env
 * @param {{ system: string, fetchImpl?: typeof fetch }} deps
 */
export async function handle(request, env, { system, fetchImpl = fetch }) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors(origin),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'POST') return sseError(origin, 'bad_request', 'POST only');

  // Per-IP rate limit: the CHAT_LIMIT binding in wrangler.toml (10 per minute).
  if (env.CHAT_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.CHAT_LIMIT.limit({ key: ip });
    if (!success) return sseError(origin, 'rate_limited', 'Too many requests');
  }

  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) return sseError(origin, 'bad_request', 'Request too large');
  let body;
  try { body = JSON.parse(raw); } catch { return sseError(origin, 'bad_request', 'Body is not JSON'); }
  const messages = validate(body);
  if (typeof messages === 'string') return sseError(origin, 'bad_request', messages);

  if (!env.ANTHROPIC_API_KEY || !env.MODEL) return sseError(origin, 'upstream', 'Not configured');

  let upstream;
  try {
    upstream = await fetchImpl(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': API_VERSION },
      body: JSON.stringify({ model: env.MODEL, max_tokens: LIMITS.maxTokens, system, messages, stream: true }),
    });
  } catch {
    return sseError(origin, 'upstream', 'Could not reach the model');
  }
  if (upstream.status === 429) return sseError(origin, 'rate_limited', 'Model rate limit');
  if (!upstream.ok || !upstream.body) return sseError(origin, 'upstream', `Model returned ${upstream.status}`);

  // Pipe the model's SSE straight through. The API's own mid-stream `event: error` already has
  // the shape the client reads.
  return new Response(upstream.body, { status: 200, headers: sseHeaders(origin) });
}
