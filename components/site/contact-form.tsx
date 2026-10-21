'use client';
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { CONTACT, CONTACT_FORM } from '@/lib/site';
import { PillFaces } from './pill-faces';
import { useReducedMotion } from './use-reduced-motion';
import './contact-form.css';

// The contact form on the contact page. It POSTs { name, email, message, botcheck } to the
// Worker's /contact route (worker/contact.js), which emails Andrew through Resend.
//
// The Worker URL is NEXT_PUBLIC_CHAT_URL, set at build time (the same Worker the chat uses).
// Until 2026-10-20 the form hid itself without it; now that the page is built around this form
// (Andrew 2026-10-20: "a quick way to send out an email to me") it always shows, and without a
// Worker, Send opens the visitor's mail app with the message filled in. The hint under the button
// says so before they press it, so the form never claims a "sent" that did not happen.
// Setup: worker/CONTACT.md.
//
// Name is optional (Andrew 2026-10-20). The Worker still wants one for the subject line, and the
// Worker is not ours to change here, so a blank name goes out as CONTACT_FORM.anonName.
//
// Validation runs twice: here for instant feedback (on blur, then live once a field has been
// left), and in the Worker, which is the one that counts. The limits match worker/contact.js.

// Inlined at build time, like the chat's ENDPOINT in components/chat/chat-panel.tsx.
const ENDPOINT = process.env.NEXT_PUBLIC_CHAT_URL ?? '';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Slush's elastic spring for the sent card popping in (motion's spring, not a CSS curve).
const SPRING = { type: 'spring', stiffness: 420, damping: 22 } as const;

type Field = 'name' | 'email' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' | 'handoff' | 'error'; text: string };

const EMPTY: Values = { name: '', email: '', message: '' };
const FIELDS: Field[] = ['name', 'email', 'message'];
const E = CONTACT_FORM.errors;

function check(v: Values): Errors {
  const errors: Errors = {};
  const name = v.name.trim(), email = v.email.trim(), message = v.message.trim();
  if (name.length > 100) errors.name = E.name;
  if (email.length > 254 || !EMAIL_SHAPE.test(email)) errors.email = E.email;
  if (message.length < 10) errors.message = E.messageShort;
  else if (message.length > 5000) errors.message = E.messageLong;
  return errors;
}

// The no-Worker path: a mailto link carrying the subject and the message, signed with the name
// and address they typed so a reply has somewhere to go.
function mailtoFor(v: Values) {
  const sign = [v.name.trim(), v.email.trim()].filter(Boolean).join(', ');
  const body = `${v.message.trim()}\n\n${sign}`;
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.mailSubject)}&body=${encodeURIComponent(body)}`;
}

export function ContactForm() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const botRef = useRef<HTMLInputElement>(null);
  // Set by Write another, read once the fields have animated back in, so focus lands on them.
  const refocus = useRef(false);
  // Pattern: a ref per field, kept in one object, so a failed submit can move focus to the first bad field.
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), message: useRef<HTMLTextAreaElement>(null) };

  const sending = status.kind === 'sending';
  // Reduced motion: the same swap, with no movement (duration 0 still fires onAnimationComplete).
  const transition = reduced ? { duration: 0 } : SPRING;

  // Pattern: controlled inputs. React state holds each value and the input shows what state says.
  const onChange = (field: Field) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field]) setErrors(prev => ({ ...prev, [field]: check(next)[field] }));
    if (status.kind === 'error' || status.kind === 'handoff') setStatus({ kind: 'idle', text: '' });
  };
  const onBlur = (field: Field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: check(values)[field] }));
  };

  const showFieldErrors = (found: Errors) => {
    setErrors(found);
    setTouched({ name: true, email: true, message: true });
    setStatus({ kind: 'error', text: E.fix });
    const first = FIELDS.find(field => found[field]);
    if (first) refs[first].current?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // no page reload: the browser would otherwise navigate to the form's action
    if (sending) return;
    const found = check(values);
    if (Object.keys(found).length) { showFieldErrors(found); return; }
    if (!ENDPOINT) {
      // Values stay in the form, in case the mail app did not open.
      window.location.href = mailtoFor(values);
      setStatus({ kind: 'handoff', text: CONTACT_FORM.handoff });
      return;
    }
    setStatus({ kind: 'sending', text: CONTACT_FORM.sending });
    try {
      const res = await fetch(`${ENDPOINT.replace(/\/+$/, '')}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...values, name: values.name.trim() || CONTACT_FORM.anonName, botcheck: botRef.current?.value ?? '' }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { fields?: Record<string, string> } } | null;
      if (res.ok && body?.ok) {
        setValues(EMPTY);
        setTouched({});
        setErrors({});
        setStatus({ kind: 'sent', text: CONTACT_FORM.sent });
        return;
      }
      if (res.status === 429) { setStatus({ kind: 'error', text: E.rate }); return; }
      // The Worker named the bad fields: show them in our own words (the honeypot is never named).
      const named = body?.error?.fields ?? {};
      const server: Errors = {};
      if (named.name) server.name = E.name;
      if (named.email) server.email = E.email;
      if (named.message) server.message = values.message.trim().length > 5000 ? E.messageLong : E.messageShort;
      if (res.status === 400 && Object.keys(server).length) { showFieldErrors(server); return; }
      setStatus({ kind: 'error', text: E.failed });
    } catch {
      setStatus({ kind: 'error', text: E.failed });
    }
  };

  const again = () => {
    refocus.current = true;
    setStatus({ kind: 'idle', text: '' });
  };

  const field = (id: Field, label: string, input: ReactElement) => (
    <div className="cf-field" data-invalid={errors[id] ? '' : undefined}>
      <label className="cf-label" htmlFor={`cf-${id}`}>{label}</label>
      {input}
      <p className="cf-error" id={`cf-${id}-error`}>{errors[id] ?? ''}</p>
    </div>
  );
  const common = (id: Field) => ({
    id: `cf-${id}`,
    name: id,
    value: values[id],
    onChange: onChange(id),
    onBlur: onBlur(id),
    disabled: sending,
    'aria-invalid': errors[id] ? true : undefined,
    'aria-describedby': `cf-${id}-error`,
  });

  return (
    <form className="cf" onSubmit={onSubmit} noValidate aria-labelledby="cf-title" aria-busy={sending}>
      <h3 className="cf-title" id="cf-title">{CONTACT_FORM.heading}</h3>
      {/* Pattern: AnimatePresence lets the leaving block animate out before React removes it;
          mode="wait" holds the next one back until it has, so the two never stack. */}
      <AnimatePresence mode="wait" initial={false}>
        {status.kind === 'sent' ? (
          <motion.div
            key="sent" className="cf-sent"
            initial={{ opacity: 0, scale: .7, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} exit={{ opacity: 0, scale: .9 }}
            transition={transition}
          >
            <span className="cf-sent-badge" aria-hidden="true"><Check size={28} strokeWidth={3} /></span>
            {/* Focus moves here when it mounts (the callback ref), so a keyboard user is not left
                on a button that no longer exists. */}
            <p className="display cf-sent-title" tabIndex={-1} ref={el => el?.focus()}>{CONTACT_FORM.sentTitle}</p>
            <button type="button" className="pill pill-light cf-again" onClick={again}><PillFaces>{CONTACT_FORM.again}</PillFaces></button>
          </motion.div>
        ) : (
          <motion.div
            key="fields" className="cf-fields"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={transition}
            onAnimationComplete={() => { if (refocus.current) { refocus.current = false; refs.name.current?.focus(); } }}
          >
            <div className="cf-pair">
              {field('name', CONTACT_FORM.name, <input {...common('name')} ref={refs.name} type="text" autoComplete="name" maxLength={100} />)}
              {field('email', CONTACT_FORM.email, <input {...common('email')} ref={refs.email} type="email" autoComplete="email" maxLength={254} aria-required="true" />)}
            </div>
            {field('message', CONTACT_FORM.message, <textarea {...common('message')} ref={refs.message} rows={5} maxLength={5000} aria-required="true" />)}
            {/* The honeypot: off screen and out of the tab order, so only a bot fills it. */}
            <div className="cf-bot" aria-hidden="true">
              <label htmlFor="cf-botcheck">{CONTACT_FORM.botcheck}</label>
              <input ref={botRef} id="cf-botcheck" name="botcheck" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            {/* The hint first, then Send at the end of the row (Andrew 2026-10-20, the form's
                own wide part), so the hint is read before the button. */}
            <div className="cf-foot">
              {!ENDPOINT && <p className="cf-hint">{CONTACT_FORM.viaMail}</p>}
              <button className="pill pill-berry pill-big cf-send" type="submit" disabled={sending}>
                <PillFaces>{sending ? CONTACT_FORM.sending : CONTACT_FORM.send}</PillFaces>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* One live region for every outcome, outside the swap so it is never unmounted mid-message. */}
      <p className="cf-status" role="status" aria-live="polite" data-kind={status.kind}>
        {status.kind === 'sent' && <Check size={18} aria-hidden="true" />}
        {status.text}
      </p>
    </form>
  );
}

export default ContactForm;
