'use client';
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { Check } from 'lucide-react';
import { CONTACT_FORM } from '@/lib/site';
import { PillFaces } from './pill-faces';
import './contact-form.css';

// The contact form in the footer card. It POSTs { name, email, message, botcheck } to the
// Worker's /contact route (worker/contact.js), which emails Andrew through Resend.
//
// It renders ONLY when NEXT_PUBLIC_CHAT_URL is set at build time (the same Worker the chat uses).
// Without it there is nowhere to send, so there is no form at all and the email link above it is
// the way in: the form never shows a "sent" that did not happen. Setup: worker/CONTACT.md.
//
// Validation runs twice: here for instant feedback (on blur, then live once a field has been
// left), and in the Worker, which is the one that counts. The limits match worker/contact.js.

// Inlined at build time, like the chat's ENDPOINT in components/chat/chat-panel.tsx.
const ENDPOINT = process.env.NEXT_PUBLIC_CHAT_URL ?? '';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = 'name' | 'email' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; text: string };

const EMPTY: Values = { name: '', email: '', message: '' };
const FIELDS: Field[] = ['name', 'email', 'message'];
const E = CONTACT_FORM.errors;

function check(v: Values): Errors {
  const errors: Errors = {};
  const name = v.name.trim(), email = v.email.trim(), message = v.message.trim();
  if (name.length < 1 || name.length > 100) errors.name = E.name;
  if (email.length > 254 || !EMAIL_SHAPE.test(email)) errors.email = E.email;
  if (message.length < 10) errors.message = E.messageShort;
  else if (message.length > 5000) errors.message = E.messageLong;
  return errors;
}

export function ContactForm() {
  // Hooks must run on every render in the same order, so they come before the early return.
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const botRef = useRef<HTMLInputElement>(null);
  // Pattern: a ref per field, kept in one object, so a failed submit can move focus to the first bad field.
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), message: useRef<HTMLTextAreaElement>(null) };

  if (!ENDPOINT) return null;

  const sending = status.kind === 'sending';

  // Pattern: controlled inputs. React state holds each value and the input shows what state says.
  const onChange = (field: Field) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field]) setErrors(prev => ({ ...prev, [field]: check(next)[field] }));
    if (status.kind === 'sent' || status.kind === 'error') setStatus({ kind: 'idle', text: '' });
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
    setStatus({ kind: 'sending', text: CONTACT_FORM.sending });
    try {
      const res = await fetch(`${ENDPOINT.replace(/\/+$/, '')}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...values, botcheck: botRef.current?.value ?? '' }),
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
      <div className="cf-pair">
        {field('name', CONTACT_FORM.name, <input {...common('name')} ref={refs.name} type="text" autoComplete="name" maxLength={100} />)}
        {field('email', CONTACT_FORM.email, <input {...common('email')} ref={refs.email} type="email" autoComplete="email" maxLength={254} />)}
      </div>
      {field('message', CONTACT_FORM.message, <textarea {...common('message')} ref={refs.message} rows={5} maxLength={5000} />)}
      {/* The honeypot: off screen and out of the tab order, so only a bot fills it. */}
      <div className="cf-bot" aria-hidden="true">
        <label htmlFor="cf-botcheck">{CONTACT_FORM.botcheck}</label>
        <input ref={botRef} id="cf-botcheck" name="botcheck" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="cf-foot">
        <button className="pill pill-berry cf-send" type="submit" disabled={sending}>
          <PillFaces>{sending ? CONTACT_FORM.sending : CONTACT_FORM.send}</PillFaces>
        </button>
        <p className="cf-status" role="status" aria-live="polite" data-kind={status.kind}>
          {status.kind === 'sent' && <Check size={18} aria-hidden="true" />}
          {status.text}
        </p>
      </div>
    </form>
  );
}

export default ContactForm;
