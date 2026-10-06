// The contact form's mailer (POST /contact), kept apart from chat.js so node can test it, the
// same split as handler.js. It sends one email to Andrew through Resend's HTTP API; the key is a
// Worker secret (env.RESEND_API_KEY) and never reaches the browser. Setup: worker/CONTACT.md.
//
// Order of checks:
//   1. Origin, against the chat's own ALLOWED_ORIGINS. Missing or not on the list: 403 with no
//      CORS headers, so a page on another site cannot read the refusal.
//   2. OPTIONS: the CORS preflight.
//   3. Everything else answers JSON, { ok: true } or { ok: false, error: { type, message,
//      fields? } }, with a real status code: 405, 429, 413, 400, 503 (no key) or 502 (Resend).
//
// Privacy: nothing here logs. The message body goes to Resend and nowhere else.

import { ALLOWED_ORIGINS } from './handler.js';

export const CONTACT_LIMITS = {
  name: 100, // characters, after trimming
  email: 254, // the longest address SMTP allows
  messageMin: 10,
  messageMax: 5000,
  bodyBytes: 16 * 1024,
};

const RESEND = 'https://api.resend.com/emails';
// Resend's shared test sender. It can only deliver to the Resend account's own address, which is
// fine here: the only recipient is Andrew. Set CONTACT_FROM once a domain is verified.
export const DEFAULT_FROM = 'Portfolio <onboarding@resend.dev>';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]+/g;

function json(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const fail = (origin, status, type, message, fields) =>
  json(origin, status, { ok: false, error: fields ? { type, message, fields } : { type, message } });

/**
 * The cleaned fields, or { fields } naming each bad one ('name' | 'email' | 'message' | 'botcheck').
 * @param {unknown} body
 */
export function validateContact(body) {
  const b = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {};
  const str = v => (typeof v === 'string' ? v : '');
  // The name and address go into the subject and reply_to: no line breaks or control characters.
  const name = str(b.name).replace(CONTROL, ' ').trim();
  const email = str(b.email).trim();
  const message = str(b.message).trim();
  const fields = {};
  if (name.length < 1 || name.length > CONTACT_LIMITS.name) fields.name = `1 to ${CONTACT_LIMITS.name} characters`;
  if (email.length > CONTACT_LIMITS.email || !EMAIL_SHAPE.test(email)) fields.email = 'not an email address';
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    fields.message = `${CONTACT_LIMITS.messageMin} to ${CONTACT_LIMITS.messageMax} characters`;
  }
  // The honeypot: a field people never see. A bot that fills every input fills this one too.
  if (str(b.botcheck) !== '') fields.botcheck = 'must be empty';
  return Object.keys(fields).length ? { fields } : { name, email, message };
}

/**
 * @param {Request} request
 * @param {{ RESEND_API_KEY?: string, CONTACT_FROM?: string, CONTACT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } }} env
 * @param {{ to: string, fetchImpl?: typeof fetch }} deps  to: Andrew's address (EMAIL in lib/site.ts)
 */
export async function handleContact(request, env, { to, fetchImpl = fetch }) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'POST') return fail(origin, 405, 'bad_request', 'POST only');

  // Per-IP rate limit: the CONTACT_LIMIT binding in wrangler.toml, the same kind as the chat's.
  if (env.CONTACT_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.CONTACT_LIMIT.limit({ key: ip });
    if (!success) return fail(origin, 429, 'rate_limited', 'Too many messages, try again in a minute');
  }

  const raw = await request.text();
  if (raw.length > CONTACT_LIMITS.bodyBytes) return fail(origin, 413, 'bad_request', 'Request too large');
  let body;
  try { body = JSON.parse(raw); } catch { return fail(origin, 400, 'bad_request', 'Body is not JSON'); }
  const clean = validateContact(body);
  if ('fields' in clean) return fail(origin, 400, 'invalid', 'Some fields need fixing', clean.fields);

  if (!env.RESEND_API_KEY) return fail(origin, 503, 'upstream', 'Not configured');

  let upstream;
  try {
    upstream = await fetchImpl(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM || DEFAULT_FROM,
        to: [to],
        reply_to: clean.email,
        subject: `Portfolio message from ${clean.name}`,
        text: `${clean.message}\n\n${clean.name} <${clean.email}>`,
      }),
    });
  } catch {
    return fail(origin, 502, 'upstream', 'Could not reach the mail service');
  }
  if (!upstream.ok) return fail(origin, 502, 'upstream', `Mail service returned ${upstream.status}`);
  return json(origin, 200, { ok: true });
}
