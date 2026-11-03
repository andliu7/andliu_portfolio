// The contact form's mailer (POST /contact), kept apart from chat.js so node can test it, the
// same split as handler.js. It sends one email to Andrew through Resend's HTTP API; the key is a
// Worker secret (env.RESEND_API_KEY) and never reaches the browser. Setup: worker/CONTACT.md.
//
// Order of checks:
//   1. Origin, against the chat's own ALLOWED_ORIGINS. Missing or not on the list: 403 with no
//      CORS headers, so a page on another site cannot read the refusal.
//   2. OPTIONS: the CORS preflight.
//   3. GET: { ok: true, suspended }, so the form can grey itself out before anyone types.
//   4. Everything else answers JSON, { ok: true } or { ok: false, error: { type, message,
//      fields? } }, with a real status code: 405, 429, 413, 400, 503 (no key, or suspended) or
//      502 (Resend).
//
// The bombardment guard, three layers, all on the server because the Origin check stops browsers
// and not scripts: 3 a minute per IP (CONTACT_LIMIT), 4 a day per IP and a daily cap across
// everyone (ContactGate). At the cap the form is suspended until 00:00 UTC, so one person cannot
// use it up alone but no number of people can put more than the cap in the inbox.
//
// Privacy: nothing here logs. The message body goes to Resend and nowhere else. ContactGate keeps
// only a keyed hash of each sender's IP, and only until the day's counts are replaced.

import { ALLOWED_ORIGINS } from './handler.js';

export const DEFAULT_DAILY_CAP = 50; // emails a day, everyone together; CONTACT_DAILY_CAP overrides it
export const IP_DAILY_CAP = 4; // emails a day from one IP

export const CONTACT_LIMITS = {
  name: 100, // characters, after trimming
  contact: 200, // optional: an email address, phone number, profile link, whatever they prefer
  about: 500, // optional: a little about the sender
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
 * The cleaned fields, or { fields } naming each bad one ('name' | 'contact' | 'about' | 'message' | 'botcheck').
 * @param {unknown} body
 */
export function validateContact(body) {
  const b = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {};
  const str = v => (typeof v === 'string' ? v : '');
  // The name and contact go into the subject and reply_to: no line breaks or control characters.
  const name = str(b.name).replace(CONTROL, ' ').trim();
  const contact = str(b.contact).replace(CONTROL, ' ').trim();
  const about = str(b.about).trim();
  const message = str(b.message).trim();
  const fields = {};
  if (name.length < 1 || name.length > CONTACT_LIMITS.name) fields.name = `1 to ${CONTACT_LIMITS.name} characters`;
  if (contact.length > CONTACT_LIMITS.contact) fields.contact = `at most ${CONTACT_LIMITS.contact} characters`;
  if (about.length > CONTACT_LIMITS.about) fields.about = `at most ${CONTACT_LIMITS.about} characters`;
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    fields.message = `${CONTACT_LIMITS.messageMin} to ${CONTACT_LIMITS.messageMax} characters`;
  }
  // The honeypot: a field people never see. A bot that fills every input fills this one too.
  if (str(b.botcheck) !== '') fields.botcheck = 'must be empty';
  return Object.keys(fields).length ? { fields } : { name, contact, about, message };
}

const dailyCap = env => Number(env.CONTACT_DAILY_CAP) || DEFAULT_DAILY_CAP;
const utcDay = () => new Date().toISOString().slice(0, 10);

/**
 * One send's claim on the day's counts: 'ok' with the new record, or the reason it was refused.
 * @param {{ day: string, total: number, ips: Record<string, number> } | undefined} stored
 * @param {string} day
 * @param {string} ip
 * @param {number} cap
 */
export function takeSlot(stored, day, ip, cap) {
  const record = stored?.day === day ? stored : { day, total: 0, ips: {} };
  if (record.total >= cap) return { verdict: 'suspended', record };
  const used = record.ips[ip] ?? 0;
  if (used >= IP_DAILY_CAP) return { verdict: 'rate_limited', record };
  return { verdict: 'ok', record: { day, total: record.total + 1, ips: { ...record.ips, [ip]: used + 1 } } };
}

// The day's counts, in one Durable Object so that they are exact: every Worker instance in every
// city asks this one object, one request at a time. Between the get and the put below nothing but
// storage is awaited, and the runtime holds other requests back during storage calls, so two sends
// cannot both take the last slot. (KV would let a burst overshoot: its reads can be a minute old.)
export class ContactGate {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  /** @param {Request} request GET: is it suspended? POST { ip }: take a slot. */
  async fetch(request) {
    const { storage } = this.state;
    const cap = dailyCap(this.env);
    if (request.method === 'GET') {
      const stored = await storage.get('today');
      return Response.json({ suspended: stored?.day === utcDay() && stored.total >= cap });
    }
    const { ip } = await request.json();
    const { verdict, record } = takeSlot(await storage.get('today'), utcDay(), ip, cap);
    if (verdict === 'ok') await storage.put('today', record);
    return Response.json({ verdict });
  }
}

const gateStub = env => env.CONTACT_GATE.get(env.CONTACT_GATE.idFromName('inbox'));

// If the gate cannot answer (Cloudflare's free daily quota, an outage), both of these fail closed:
// no count means no send, and the form says suspended rather than failing on Send.
async function isSuspended(env) {
  if (!env.CONTACT_GATE) return false;
  try {
    const { suspended } = await (await gateStub(env).fetch(new Request('https://gate/'))).json();
    return suspended;
  } catch {
    return true;
  }
}

async function takeFromGate(env, ip) {
  if (!env.CONTACT_GATE) return 'ok';
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.RESEND_API_KEY}${ip}`));
    const key = btoa(String.fromCharCode(...new Uint8Array(hash))).slice(0, 16);
    const res = await gateStub(env).fetch(new Request('https://gate/', { method: 'POST', body: JSON.stringify({ ip: key }) }));
    return (await res.json()).verdict;
  } catch {
    return 'suspended';
  }
}

/**
 * @param {Request} request
 * @param {{ RESEND_API_KEY?: string, CONTACT_FROM?: string, CONTACT_DAILY_CAP?: string, CONTACT_GATE?: any, CONTACT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } }} env
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
  if (request.method === 'GET') return json(origin, 200, { ok: true, suspended: await isSuspended(env) });
  if (request.method !== 'POST') return fail(origin, 405, 'bad_request', 'POST or GET only');

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  // Per-IP rate limit: the CONTACT_LIMIT binding in wrangler.toml, the same kind as the chat's.
  if (env.CONTACT_LIMIT) {
    const { success } = await env.CONTACT_LIMIT.limit({ key: ip });
    if (!success) return fail(origin, 429, 'rate_limited', 'Too many messages, try again later');
  }

  const raw = await request.text();
  if (raw.length > CONTACT_LIMITS.bodyBytes) return fail(origin, 413, 'bad_request', 'Request too large');
  let body;
  try { body = JSON.parse(raw); } catch { return fail(origin, 400, 'bad_request', 'Body is not JSON'); }
  const clean = validateContact(body);
  if ('fields' in clean) return fail(origin, 400, 'invalid', 'Some fields need fixing', clean.fields);

  if (!env.RESEND_API_KEY) return fail(origin, 503, 'upstream', 'Not configured');

  // Last, so that junk and honeypot hits never count. A send Resend then fails still counts: the
  // slot is taken before the send so that a burst cannot pass the cap.
  const verdict = await takeFromGate(env, ip);
  if (verdict === 'suspended') return fail(origin, 503, 'suspended', 'Email is suspended for today');
  if (verdict !== 'ok') return fail(origin, 429, 'rate_limited', 'Too many messages, try again later');

  let upstream;
  try {
    upstream = await fetchImpl(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM || DEFAULT_FROM,
        to: [to],
        // Reply goes straight to them when they left an email address; anything else is in the text.
        ...(EMAIL_SHAPE.test(clean.contact) ? { reply_to: clean.contact } : {}),
        subject: `Portfolio message from ${clean.name}`,
        text: [
          clean.message,
          '',
          '---',
          `From: ${clean.name}`,
          `Reach them at: ${clean.contact || 'not given'}`,
          ...(clean.about ? [`About them: ${clean.about}`] : []),
        ].join('\n'),
      }),
    });
  } catch {
    return fail(origin, 502, 'upstream', 'Could not reach the mail service');
  }
  if (!upstream.ok) return fail(origin, 502, 'upstream', `Mail service returned ${upstream.status}`);
  return json(origin, 200, { ok: true });
}
