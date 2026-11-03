'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Mic } from 'lucide-react';
import { cleanDictation } from '@/lib/dictation';
import { CONTACT, CONTACT_FORM } from '@/lib/site';
import { ThinkingIndicator } from '@/components/ui/thinking-indicator';
import { PillFaces } from './pill-faces';
import { useDictation } from './use-dictation';
import { useReducedMotion } from './use-reduced-motion';
import './contact-form.css';

// The contact form on the contact page. It POSTs { name, contact, about, message, botcheck } to the
// Worker's /contact route (worker/contact.js), which emails Andrew through Resend.
//
// The Worker URL is NEXT_PUBLIC_CHAT_URL, set at build time (the same Worker the chat uses).
// Until 2026-10-20 the form hid itself without it; now that the page is built around this form
// (Andrew 2026-10-20: "a quick way to send out an email to me") it always shows, and without a
// Worker, Send opens the visitor's mail app with the message filled in. The hint under the button
// says so before they press it, so the form never claims a "sent" that did not happen.
// Setup: worker/CONTACT.md.
//
// Only the message is required (Andrew 2026-10-31). The Worker still wants a name for the subject
// line, so a blank name goes out as CONTACT_FORM.anonName.
//
// The message box starts as a letter, "Dear Andrew," and "Best,", all of it editable. A letter
// left as it starts is not a message: check() measures what is written between the two.
//
// Validation runs twice: here for instant feedback (on blur, then live once a field has been
// left), and in the Worker, which is the one that counts. The limits match worker/contact.js.
//
// Suspended (Andrew 2026-10-31): past the Worker's daily cap the form goes grey and unusable under
// an "Email suspended" chip. It asks on load (GET /contact) and also believes a refused send, so
// someone who had it open keeps what they typed. Email me stays: it is the visitor's own mail app.
//
// Sending (Andrew 2026-10-31): CONTACT_FORM.steps name the Worker's checks in order. The Worker
// answers all at once, so the steps run on a timer, describing the work and not reporting it. The
// green check and the ding wait for the Worker's real yes.
//
// Dictation (2026-11-01): the session lives in use-dictation.ts and the cleanup in lib/dictation.ts.
// This file only says where the words go. The mic shows only where the browser has speech
// recognition, so Firefox gets a form with no button, and typing always works. Setting a controlled
// textarea's value clears the browser's undo history, so Ctrl+Z will not undo a dictation.

// Inlined at build time, like the chat's ENDPOINT in components/chat/chat-panel.tsx.
const ENDPOINT = process.env.NEXT_PUBLIC_CHAT_URL ?? '';
// Slush's elastic spring for the sent card popping in (motion's spring, not a CSS curve).
const SPRING = { type: 'spring', stiffness: 420, damping: 22 } as const;
const STEP_MS = 650; // long enough to read a step; the whole list always shows, however fast the Worker is
const { steps: STEPS, greeting: GREETING, signoff: SIGNOFF, dictation: SAY } = CONTACT_FORM;
const LETTER = `${GREETING}\n\n\n\n${SIGNOFF}\n`;
const LETTER_START = GREETING.length + 2; // the empty line between the greeting and the sign-off
const LIVE_WORDS = 140; // characters of unsettled speech to show, the newest ones

type Field = 'name' | 'contact' | 'about' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' | 'handoff' | 'error'; text: string };

const EMPTY: Values = { name: '', contact: '', about: '', message: LETTER };
const FIELDS: Field[] = ['name', 'contact', 'about', 'message'];
const E = CONTACT_FORM.errors;

function check(v: Values): Errors {
  const errors: Errors = {};
  const message = v.message.trim();
  const written = message.replace(GREETING, '').replace(SIGNOFF, '').trim();
  if (v.name.trim().length > 100) errors.name = E.name;
  if (v.contact.trim().length > 200) errors.contact = E.contact;
  if (v.about.trim().length > 500) errors.about = E.about;
  if (written.length < 10) errors.message = E.messageShort;
  else if (message.length > 5000) errors.message = E.messageLong;
  return errors;
}

// The no-Worker path: a mailto link carrying the subject and the message, signed with what they
// typed so a reply has somewhere to go.
function mailtoFor(v: Values) {
  const sign = [v.name.trim(), v.contact.trim(), v.about.trim()].filter(Boolean).join('\n');
  const body = `${v.message.trim()}\n\n${sign}`;
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.mailSubject)}&body=${encodeURIComponent(body)}`;
}

// A small bell, made here and not downloaded: a high sine and its octave, fading in 0.7 seconds.
function ding(audio: AudioContext) {
  const now = audio.currentTime;
  for (const [frequency, peak] of [[1320, 0.16], [2640, 0.05]]) {
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.frequency.value = frequency;
    level.gain.setValueAtTime(0.0001, now);
    level.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    level.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    tone.connect(level).connect(audio.destination);
    tone.start(now);
    tone.stop(now + 0.72);
  }
  window.setTimeout(() => void audio.close(), 900);
}

export function ContactForm() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const [suspended, setSuspended] = useState(false);
  const [step, setStep] = useState(0);
  const botRef = useRef<HTMLInputElement>(null);
  // Set by Write another, read once the fields have animated back in, so focus lands on them.
  const refocus = useRef(false);
  // Pattern: a ref per field, kept in one object, so a failed submit can move focus to the first bad field.
  const messageBox = useRef<HTMLTextAreaElement>(null);
  const refs = { name: useRef<HTMLInputElement>(null), contact: useRef<HTMLInputElement>(null), about: useRef<HTMLTextAreaElement>(null), message: messageBox };

  // A dictated write that React has not put on screen yet. Speech events can outrun a render, so
  // this is the newest text until then, and it carries the caret, because setting a textarea's
  // value sends the caret to the end.
  const unpainted = useRef<{ text: string; caret: number } | null>(null);

  const sending = status.kind === 'sending';
  const locked = sending || suspended;

  const dictation = useDictation({
    clean: cleanDictation,
    read: () => {
      const box = messageBox.current;
      if (!box) return null;
      const value = unpainted.current?.text ?? box.value;
      if (value === LETTER) return { value, start: LETTER_START, end: LETTER_START };
      if (unpainted.current) return { value, start: unpainted.current.caret, end: unpainted.current.caret };
      return { value, start: box.selectionStart, end: box.selectionEnd };
    },
    write: (text, caret) => {
      unpainted.current = { text, caret };
      setValues(prev => ({ ...prev, message: text }));
      if (touched.message || text.trim().length > 5000) setErrors(prev => ({ ...prev, message: check({ ...values, message: text }).message }));
      if (status.kind === 'error' || status.kind === 'handoff') setStatus({ kind: 'idle', text: '' });
    },
  });
  const { finish: finishDictation } = dictation;
  const listening = dictation.state === 'listening';
  const live = dictation.interim.length > LIVE_WORDS ? `...${dictation.interim.slice(-LIVE_WORDS)}` : dictation.interim;

  // The mic goes off when the form locks: on a send, or when the daily limit turns out to be spent.
  useEffect(() => {
    if (locked) finishDictation();
  }, [locked, finishDictation]);

  // Pattern: useLayoutEffect runs after React updates the page and before it paints, so the caret
  // never visibly jumps. It runs on every render and waits until the box shows the dictated text.
  useLayoutEffect(() => {
    const box = messageBox.current;
    const wrote = unpainted.current;
    if (!box || !wrote || box.value !== wrote.text) return;
    unpainted.current = null;
    box.setSelectionRange(wrote.caret, wrote.caret);
    // Setting the caret does not scroll to it, so keep the new words in a long letter on screen.
    box.scrollTop = (box.scrollHeight - box.clientHeight) * (wrote.caret / wrote.text.length);
  });

  useEffect(() => {
    if (!ENDPOINT) return;
    const ask = new AbortController();
    fetch(`${ENDPOINT.replace(/\/+$/, '')}/contact`, { signal: ask.signal })
      .then(res => res.json() as Promise<{ suspended?: boolean }>)
      .then(body => { if (body.suspended) setSuspended(true); })
      .catch(() => {}); // no answer: leave it open, and a refused send still flips it
    return () => ask.abort();
  }, []);

  // Walks the steps while sending, and rests on the last one if the Worker takes longer.
  useEffect(() => {
    if (!sending) return;
    const timer = window.setInterval(() => setStep(now => Math.min(now + 1, STEPS.length - 1)), STEP_MS);
    return () => window.clearInterval(timer);
  }, [sending]);

  // Reduced motion: the same swap, with no movement (duration 0 still fires onAnimationComplete).
  const transition = reduced ? { duration: 0 } : SPRING;

  // Pattern: controlled inputs. React state holds each value and the input shows what state says.
  const onChange = (field: Field) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Typing takes over from dictation, and what they typed stands.
    dictation.cancel();
    unpainted.current = null;
    const next = { ...values, [field]: event.target.value };
    // The updater form: a dictated write still on its way must not be lost to this keystroke.
    setValues(prev => ({ ...prev, [field]: next[field] }));
    if (touched[field]) setErrors(prev => ({ ...prev, [field]: check(next)[field] }));
    if (status.kind === 'error' || status.kind === 'handoff') setStatus({ kind: 'idle', text: '' });
  };
  const onBlur = (field: Field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: check(values)[field] }));
  };
  // The first visit to an untouched letter lands between the greeting and the sign-off. It waits a
  // frame because a click places the caret after focus, which would undo this.
  const onLetterFocus = () => {
    if (values.message !== LETTER) return;
    requestAnimationFrame(() => {
      const start = GREETING.length + 2;
      refs.message.current?.setSelectionRange(start, start);
    });
  };

  const showFieldErrors = (found: Errors) => {
    setErrors(found);
    setTouched({ name: true, contact: true, about: true, message: true });
    setStatus({ kind: 'error', text: E.fix });
    const first = FIELDS.find(field => found[field]);
    if (first) refs[first].current?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // no page reload: the browser would otherwise navigate to the form's action
    if (locked) return;
    // Send while still talking: the words on screen go too, so read the text after they land.
    finishDictation();
    const letter = unpainted.current ? { ...values, message: unpainted.current.text } : values;
    const found = check(letter);
    if (Object.keys(found).length) { showFieldErrors(found); return; }
    if (!ENDPOINT) {
      // Values stay in the form, in case the mail app did not open.
      window.location.href = mailtoFor(letter);
      setStatus({ kind: 'handoff', text: CONTACT_FORM.handoff });
      return;
    }
    // Browsers only allow sound that starts from a press, so the bell is readied here and rung
    // after the answer. No audio on this device just means no ding.
    let audio: AudioContext | null = null;
    try { audio = new AudioContext(); void audio.resume(); } catch { audio = null; }
    setStep(0);
    setStatus({ kind: 'sending', text: '' });
    try {
      const everyStep = new Promise(done => window.setTimeout(done, STEP_MS * STEPS.length));
      const [res] = await Promise.all([
        fetch(`${ENDPOINT.replace(/\/+$/, '')}/contact`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...letter, name: letter.name.trim() || CONTACT_FORM.anonName, botcheck: botRef.current?.value ?? '' }),
        }),
        everyStep,
      ]);
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { type?: string; fields?: Record<string, string> } } | null;
      if (res.ok && body?.ok) {
        if (audio) { ding(audio); audio = null; }
        setValues(EMPTY);
        setTouched({});
        setErrors({});
        setStatus({ kind: 'sent', text: CONTACT_FORM.sent });
        return;
      }
      if (body?.error?.type === 'suspended') { setSuspended(true); setStatus({ kind: 'idle', text: '' }); return; }
      if (res.status === 429) { setStatus({ kind: 'error', text: E.rate }); return; }
      // The Worker named the bad fields: show them in our own words (the honeypot is never named).
      const named = body?.error?.fields ?? {};
      const server: Errors = {};
      if (named.name) server.name = E.name;
      if (named.contact) server.contact = E.contact;
      if (named.about) server.about = E.about;
      if (named.message) server.message = letter.message.trim().length > 5000 ? E.messageLong : E.messageShort;
      if (res.status === 400 && Object.keys(server).length) { showFieldErrors(server); return; }
      setStatus({ kind: 'error', text: E.failed });
    } catch {
      setStatus({ kind: 'error', text: E.failed });
    } finally {
      void audio?.close();
    }
  };

  const again = () => {
    refocus.current = true;
    setStatus({ kind: 'idle', text: '' });
  };

  const field = (id: Field, label: string, input: ReactElement, hint?: string) => (
    <div className="cf-field" data-invalid={errors[id] ? '' : undefined}>
      <label className="cf-label" htmlFor={`cf-${id}`}>{label}</label>
      {hint && <p className="cf-field-hint" id={`cf-${id}-hint`}>{hint}</p>}
      {input}
      <p className="cf-error" id={`cf-${id}-error`}>{errors[id] ?? ''}</p>
    </div>
  );
  const common = (id: Field, hinted = false) => ({
    id: `cf-${id}`,
    name: id,
    value: values[id],
    onChange: onChange(id),
    onBlur: onBlur(id),
    disabled: locked,
    'aria-invalid': errors[id] ? true : undefined,
    'aria-describedby': hinted ? `cf-${id}-hint cf-${id}-error` : `cf-${id}-error`,
  });

  return (
    <form className="cf" onSubmit={onSubmit} noValidate aria-labelledby="cf-title" aria-busy={sending} data-suspended={suspended ? '' : undefined}>
      <div className="cf-head">
        <h3 className="cf-title" id="cf-title">{CONTACT_FORM.heading}</h3>
        {/* The live region stays mounted so a screen reader hears the chip when it appears. */}
        <output>
          {suspended && <span className="cf-chip"><span className="cf-chip-dot" aria-hidden="true" />{CONTACT_FORM.suspended}</span>}
        </output>
      </div>
      {/* Pattern: AnimatePresence lets the leaving block animate out before React removes it;
          mode="wait" holds the next one back until it has, so the two never stack. */}
      <AnimatePresence mode="wait" initial={false}>
        {status.kind === 'sent' ? (
          <motion.div
            key="sent" className="cf-sent"
            initial={{ opacity: 0, scale: .7, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} exit={{ opacity: 0, scale: .9 }}
            transition={transition}
          >
            {/* The green check draws itself once the card has popped in. */}
            <span className="cf-sent-badge" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 12.5 10 17.5 19.5 7"
                  stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }}
                  transition={reduced ? { duration: 0 } : { duration: .38, delay: .12, ease: 'easeOut' }}
                />
              </svg>
            </span>
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
              {field('contact', CONTACT_FORM.contact, <input {...common('contact', true)} ref={refs.contact} type="text" autoComplete="email" maxLength={200} placeholder={CONTACT_FORM.contactPlaceholder} />, CONTACT_FORM.contactHint)}
            </div>
            {field('about', CONTACT_FORM.about, <textarea {...common('about')} ref={refs.about} className="cf-about" rows={2} maxLength={500} placeholder={CONTACT_FORM.aboutPlaceholder} />)}
            {field('message', CONTACT_FORM.message, <textarea {...common('message', true)} ref={refs.message} rows={8} maxLength={5000} aria-required="true" onFocus={onLetterFocus} />, CONTACT_FORM.format)}
            {dictation.supported && (
              <div className="cf-dictate">
                <div className="cf-dictate-row">
                  {/* Pressing keeps the caret in the letter: without this the box would blur, and
                      leaving it empty would flag it before a word is said. */}
                  <button
                    type="button" className="pill pill-light cf-mic" data-on={listening ? '' : undefined} disabled={locked}
                    aria-describedby="cf-dictate-privacy"
                    onMouseDown={event => event.preventDefault()} onClick={dictation.toggle}
                  >
                    <PillFaces><Mic size={16} aria-hidden="true" />{dictation.state === 'off' ? SAY.start : SAY.stop}</PillFaces>
                  </button>
                  {/* One steady line for screen readers: reading out each word into an open mic
                      would dictate the screen reader, so the live words below are not announced. */}
                  <output className="cf-dictate-status" data-on={listening ? '' : undefined} data-note={dictation.note ? '' : undefined}>
                    {dictation.note ? SAY[dictation.note] : listening ? SAY.listening : ''}
                  </output>
                  {live && <p className="cf-dictate-live">{live}</p>}
                </div>
                <p className="cf-field-hint" id="cf-dictate-privacy">{SAY.privacy}</p>
              </div>
            )}
            {/* The honeypot: off screen and out of the tab order, so only a bot fills it. */}
            <div className="cf-bot" aria-hidden="true">
              <label htmlFor="cf-botcheck">{CONTACT_FORM.botcheck}</label>
              <input ref={botRef} id="cf-botcheck" name="botcheck" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            {/* The hint first, then Send at the end of the row (Andrew 2026-10-20, the form's
                own wide part), so the hint is read before the button. */}
            <div className="cf-foot">
              {!ENDPOINT && <p className="cf-hint">{CONTACT_FORM.viaMail}</p>}
              {/* One word at a time, so the indicator swaps on our step and never cycles back. */}
              {sending && <ThinkingIndicator className="cf-progress" words={[STEPS[step]]} />}
              <button className="pill pill-berry pill-big cf-send" type="submit" disabled={locked}>
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
