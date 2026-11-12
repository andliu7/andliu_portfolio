'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Maximize2, Mic, PenLine, Send, X } from 'lucide-react';
import { getLenis } from '@/app/smooth';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cleanDictation } from '@/lib/dictation';
import { CONTACT, CONTACT_FORM } from '@/lib/site';
import { ThinkingIndicator } from '@/components/ui/thinking-indicator';
import { PillFaces } from './pill-faces';
import { OPEN_LETTER } from './open-letter';
import { SignaturePad } from './signature-pad';
import { useDictation } from './use-dictation';
import { useReducedMotion } from './use-reduced-motion';
import './contact-form.css';

// The contact form on the contact page. It POSTs { name, contact, about, message, signature, botcheck } to the
// Worker's /contact route (worker/contact.js), which emails Andrew through Resend.
//
// The Worker URL is NEXT_PUBLIC_CHAT_URL, set at build time (the same Worker the chat uses).
// Until 2026-10-20 the form hid itself without it; now that the page is built around this form
// (Andrew 2026-10-20: "a quick way to send out an email to me") it always shows, and without a
// Worker, Send opens the visitor's mail app with the message filled in. The hint under the button
// says so before they press it, so the form never claims a "sent" that did not happen.
// Setup: worker/CONTACT.md.
//
// Shorter (Andrew 2026-11-11): the "A little about you" box is gone; the hint over the message asks
// for it instead. In its place, "I'm looking for..." is a row of chips to press (any number), sent in
// the Worker's `about` field as "Looking for: ...", so the Worker needed no new field for it. Under
// the letter the visitor may sign by hand (signature-pad.tsx); the PNG goes as `signature` and the
// Worker attaches it. A Worker from before the signature refuses the larger request (413), so that
// one case is sent again without it and the sent line says the signature did not travel.
//
// The message and a way to reach them are required (Andrew 2026-11-11; until then only the
// message was). The contact rule is checked here only: the Worker still accepts a letter without
// one. The Worker wants a name for the subject line, so an unsigned letter goes out as
// CONTACT_FORM.anonName.
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

type Field = 'name' | 'contact' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' | 'handoff' | 'error'; text: string };

// The box starts empty (Andrew 2026-11-11): the letter shows as placeholder text, and Tab in the
// empty box writes the greeting and the sign-off for real.
const EMPTY: Values = { name: '', contact: '', message: '' };
const PLACEHOLDER = `${GREETING}\n\n${CONTACT_FORM.format}\n\n${SIGNOFF}\n${CONTACT_FORM.yourName}`;
// There is no name box any more (Andrew 2026-11-11): they sign under the sign-off, as in a letter.
// The Worker still wants a name for the subject line, so it is read from there: the first line
// written after the last "Best,".
const signedName = (message: string) => {
  const at = message.lastIndexOf(SIGNOFF);
  if (at < 0) return '';
  const line = message.slice(at + SIGNOFF.length).split('\n').map(l => l.trim()).find(Boolean) ?? '';
  return line.slice(0, 100);
};
// A way to write back is required: an email address or a phone number (7 to 15 digits).
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_SHAPE = /^[+(]?\d[\d\s().-]*$/;
/** What the text is shaped like: an email address, a phone number, or neither yet. */
const reachKind = (text: string): 'email' | 'phone' | null => {
  const t = text.trim();
  if (EMAIL_SHAPE.test(t)) return 'email';
  const digits = t.replace(/\D/g, '').length;
  return PHONE_SHAPE.test(t) && digits >= 7 && digits <= 15 ? 'phone' : null;
};
const reachable = (text: string) => reachKind(text) !== null;
const FIELDS: Field[] = ['name', 'contact', 'message'];
const LOOKING = CONTACT_FORM.looking;
const OTHER = LOOKING.options[LOOKING.options.length - 1]; // the last answer opens a box to say more
/** The quiz answers, as the one line the Worker's `about` field carries. */
const lookingLine = (picked: readonly string[], more: string) =>
  picked.length ? `${LOOKING.sentAs} ${picked.map(o => (o === OTHER && more.trim() ? `${o} (${more.trim()})` : o)).join(', ')}` : '';
const LETTERS = 'ABCDEFGHIJ';
const E = CONTACT_FORM.errors;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
/** What they wrote themselves: the letter without the greeting, the sign-off and the name under it. */
const ownWords = (message: string) => message.trim().replace(GREETING, '').replace(SIGNOFF, '').replace(signedName(message), '').trim();

function check(v: Values): Errors {
  const errors: Errors = {};
  const message = v.message.trim();
  const written = message.replace(GREETING, '').replace(SIGNOFF, '').replace(signedName(message), '').trim();
  const contact = v.contact.trim();
  if (contact.length > 200) errors.contact = E.contact;
  else if (!reachable(contact)) errors.contact = E.contactNeeded;
  if (written.length < 10) errors.message = E.messageShort(wordCount(written));
  else if (message.length > 5000) errors.message = E.messageLong;
  return errors;
}

// The no-Worker path: a mailto link carrying the subject and the message, signed with what they
// typed so a reply has somewhere to go.
function mailtoFor(v: Values, about: string) {
  const sign = [v.name.trim(), v.contact.trim(), about].filter(Boolean).join('\n');
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

// The stamp and the postmark in the letter's top corner (2026-11-03). Drawn here, decoration only:
// a perforated apricot stamp with a blueberry on it, and a College Park postmark whose wavy
// cancellation lines run off to the left.
const PERFS = Array.from({ length: 7 }, (_, i) => i);
function Stationery() {
  return (
    <svg className="cf-stamp" viewBox="0 0 150 96" aria-hidden="true" focusable="false">
      <defs>
        <mask id="cf-perf">
          <rect x="70" y="6" width="68" height="82" fill="#fff" />
          {PERFS.map(i => <circle key={`t${i}`} cx={74 + i * 10} cy="6" r="3.2" fill="#000" />)}
          {PERFS.map(i => <circle key={`b${i}`} cx={74 + i * 10} cy="88" r="3.2" fill="#000" />)}
          {PERFS.slice(0, 7).map(i => <circle key={`l${i}`} cx="70" cy={11 + i * 12} r="3.2" fill="#000" />)}
          {PERFS.slice(0, 7).map(i => <circle key={`r${i}`} cx="138" cy={11 + i * 12} r="3.2" fill="#000" />)}
        </mask>
      </defs>
      <g className="cf-stamp-paper" mask="url(#cf-perf)">
        <rect x="70" y="6" width="68" height="82" />
      </g>
      <rect className="cf-stamp-frame" x="78" y="14" width="52" height="66" rx="3" />
      {/* The blueberry: a round fruit with its five-point crown. */}
      <circle className="cf-stamp-berry" cx="104" cy="50" r="15" />
      <path className="cf-stamp-crown" d="M98 37.5 l3 3.4 3-4.4 3 4.4 3-3.4" />
      <circle className="cf-stamp-shine" cx="98.5" cy="45" r="3" />
      <g className="cf-postmark">
        <circle cx="60" cy="50" r="34" />
        {/* level text, not bent round the ring, so it reads horizontally (Andrew 2026-11-04) */}
        <text x="60" y="44" textAnchor="middle">COLLEGE PARK</text>
        <text x="60" y="54" textAnchor="middle">MD</text>
        <text x="60" y="64" textAnchor="middle">ANDLIU.DEV</text>
        <path d="M2 40 q6 -5 12 0 t12 0 t12 0 M2 50 q6 -5 12 0 t12 0 t12 0 M2 60 q6 -5 12 0 t12 0 t12 0" />
      </g>
    </svg>
  );
}

// The sent scene (Andrew 2026-11-11): a large envelope comes up from below and closes round the
// letter, the flap folds shut, a seal stamps it, the whole thing shrinks and flies into a black
// mailbox, and the red flag goes up. All CSS keyframes on one SVG (contact-form.css, .cf-post),
// about 3 seconds, played once when the card appears.
// Decoration only: the words beside it say what happened. Reduced motion: the end state, still.
function SentScene() {
  return (
    <svg className="cf-post" viewBox="0 0 480 280" aria-hidden="true" focusable="false">
      {/* the ground line, the post and the mailbox: a black body, a dark mouth, a red flag */}
      <path className="cf-post-ground" d="M12 268 H468" />
      <rect className="cf-post-pole" x="404" y="158" width="14" height="110" rx="2" />
      <g className="cf-post-box">
        <path className="cf-post-body" d="M346 168 V130 a30 30 0 0 1 30 -30 H438 a30 30 0 0 1 30 30 V168 Z" />
        <path className="cf-post-mouth" d="M346 168 V130 a30 30 0 0 1 60 0 V168 Z" />
        <g className="cf-post-flag">
          <rect x="436" y="84" width="6" height="52" rx="2" />
          <rect x="442" y="84" width="26" height="16" rx="2" />
        </g>
      </g>
      {/* the letter and its envelope: everything in here shrinks and flies as one */}
      <g className="cf-post-pack">
        {/* the envelope's back rises from under the card, behind the sheet */}
        <g className="cf-post-rise">
          <rect className="cf-post-back" x="60" y="104" width="240" height="150" rx="8" />
        </g>
        <g className="cf-post-sheet">
          <rect x="84" y="56" width="192" height="150" rx="5" />
          <path d="M104 84 H256 M104 104 H256 M104 124 H256 M104 144 H212" />
        </g>
        {/* its front rises with it, in front of the sheet; then the flap folds and the seal lands */}
        <g className="cf-post-rise">
          <path className="cf-post-front" d="M60 112 a8 8 0 0 1 3 -6 L180 190 L297 106 a8 8 0 0 1 3 6 V246 a8 8 0 0 1 -8 8 H68 a8 8 0 0 1 -8 -8 Z" />
          <path className="cf-post-flap" d="M63 106 L180 14 L297 106 Z" />
          <g className="cf-post-seal">
            <circle cx="180" cy="186" r="19" />
            <circle className="cf-post-seal-ring" cx="180" cy="186" r="12" />
            <path d="M173 186 l5 5 l9 -10" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function ContactForm() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const [suspended, setSuspended] = useState(false);
  const [step, setStep] = useState(0);
  // The quiz answers that are ticked, in the order the options are listed, and what they wrote
  // under the last one ("Something else").
  const [looking, setLooking] = useState<string[]>([]);
  const [more, setMore] = useState('');
  const moreRef = useRef<HTMLInputElement>(null);
  const toggleLooking = (option: string) => {
    const on = !looking.includes(option);
    setLooking(LOOKING.options.filter(o => (o === option ? on : looking.includes(o))));
    // Ticking "Something else" opens its box and puts the caret in it.
    if (option === OTHER && on) requestAnimationFrame(() => moreRef.current?.focus());
  };
  // The full version, a popup over the page; the small card stands empty while it is open.
  const [expanded, setExpanded] = useState(false);
  const [signing, setSigning] = useState(false);
  const [openOn, setOpenOn] = useState<Field>('message');
  const [awayH, setAwayH] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const miniRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const signRef = useRef<HTMLButtonElement>(null);
  const flipBack = useRef(0);
  // The drawn signature as a PNG data URL, or null; padKey wipes the pad after a send.
  const [signature, setSignature] = useState<string | null>(null);
  const [padKey, setPadKey] = useState(0);
  const botRef = useRef<HTMLInputElement>(null);
  // Set by Write another, read once the fields have animated back in, so focus lands on them.
  const refocus = useRef(false);
  // Pattern: a ref per field, kept in one object, so a failed submit can move focus to the first bad field.
  const messageBox = useRef<HTMLTextAreaElement>(null);
  const refs = { name: useRef<HTMLInputElement>(null), contact: useRef<HTMLInputElement>(null), message: messageBox };

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

  const openFull = (on: Field) => {
    setAwayH(miniRef.current?.offsetHeight ?? 0);
    setOpenOn(on);
    setExpanded(true);
  };
  const showFieldErrors = (found: Errors) => {
    setErrors(found);
    setTouched({ name: true, contact: true, message: true });
    setStatus({ kind: 'error', text: E.fix });
    const first = FIELDS.find(field => found[field]);
    if (first) refs[first].current?.focus();
  };

  // "Email me" beside the card (open-letter.tsx) opens the full version. After a send, it starts a
  // new letter first.
  useEffect(() => {
    const open = () => {
      setStatus(now => (now.kind === 'sent' ? { kind: 'idle', text: '' } : now));
      setAwayH(miniRef.current?.offsetHeight ?? 0);
      setOpenOn('message');
      setExpanded(true);
    };
    window.addEventListener(OPEN_LETTER, open);
    return () => window.removeEventListener(OPEN_LETTER, open);
  }, []);

  // Hold the smooth scroller still while a popup is up, so the wheel cannot move the page under it.
  useEffect(() => {
    const lenis = getLenis();
    if (!expanded || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [expanded]);

  // Tab in the empty box takes the suggestion: the greeting and the sign-off become real text, with
  // the caret between them. Only then; in a box with anything in it Tab moves on as usual.
  const onLetterKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || values.message !== '') return;
    event.preventDefault();
    unpainted.current = { text: LETTER, caret: LETTER_START };
    setValues(prev => ({ ...prev, message: LETTER }));
  };
  // The heading's last words flip, a letter to an email, like LIU in the hero: under the pointer,
  // or for a moment after a tap.
  const flipTap = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return;
    setFlipped(true);
    window.clearTimeout(flipBack.current);
    flipBack.current = window.setTimeout(() => setFlipped(false), 1600);
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
      window.location.href = mailtoFor(letter, lookingLine(looking, more));
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
      const post = (withSignature: boolean) => fetch(`${ENDPOINT.replace(/\/+$/, '')}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...letter, name: signedName(letter.message) || CONTACT_FORM.anonName, about: lookingLine(looking, more),
          ...(withSignature && signature ? { signature } : {}), botcheck: botRef.current?.value ?? '',
        }),
      });
      let [res] = await Promise.all([post(true), everyStep]);
      // A Worker from before the signature refuses the larger request: send the letter without it.
      let unsigned = false;
      if (res.status === 413 && signature) { unsigned = true; res = await post(false); }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { type?: string; fields?: Record<string, string> } } | null;
      if (res.ok && body?.ok) {
        if (audio) { ding(audio); audio = null; }
        setValues(EMPTY);
        setTouched({});
        setErrors({});
        setLooking([]);
        setMore('');
        setExpanded(false);
        setSigning(false);
        setSignature(null);
        setPadKey(key => key + 1);
        setStatus({ kind: 'sent', text: unsigned ? CONTACT_FORM.sentUnsigned : CONTACT_FORM.sent });
        return;
      }
      if (body?.error?.type === 'suspended') { setSuspended(true); setStatus({ kind: 'idle', text: '' }); return; }
      if (res.status === 429) { setStatus({ kind: 'error', text: E.rate }); return; }
      // The Worker named the bad fields: show them in our own words (the honeypot is never named).
      const named = body?.error?.fields ?? {};
      const server: Errors = {};
      if (named.name) server.name = E.name;
      if (named.contact) server.contact = E.contact;
      if (named.message) server.message = letter.message.trim().length > 5000 ? E.messageLong : E.messageShort(wordCount(ownWords(letter.message)));
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

  // The letter itself. Empty, it shows the greeting, the suggested format and the sign-off as
  // placeholder text, and a key cap saying Tab writes them in.
  const blank = values.message === '';
  const words = wordCount(ownWords(values.message));
  const letterBox = (
    <div className="cf-field cf-letter" data-invalid={errors.message ? '' : undefined}>
      <label className="cf-label" htmlFor="cf-message">{CONTACT_FORM.message}</label>
      <div className="cf-letter-box">
        <textarea
          {...common('message', blank)} ref={refs.message} rows={5} maxLength={5000} aria-required="true"
          placeholder={PLACEHOLDER} onFocus={onLetterFocus} onKeyDown={onLetterKey}
        />
        {/* The word count, in the box's bottom right corner: red, yellow from 10 words, green from
            20 (Andrew 2026-11-11). It counts their own words, not the greeting, sign-off or name. */}
        {!blank && (
          <p className="cf-count" data-level={words >= 20 ? 'good' : words >= 10 ? 'some' : 'few'}>
            <span aria-hidden="true">{words}</span>
            <span className="sr-only">{CONTACT_FORM.words(words)}</span>
          </p>
        )}
        {blank && (
          <p className="cf-tab" id="cf-message-hint">
            <span aria-hidden="true"><kbd>Tab</kbd> {CONTACT_FORM.tab}</span>
            <span className="sr-only">{CONTACT_FORM.tabSpoken}</span>
          </p>
        )}
      </div>
      <p className="cf-error" id="cf-message-error">{errors.message ?? ''}</p>
    </div>
  );

  const mic = dictation.supported && (
    <>
      {/* Pressing keeps the caret in the letter: without this the box would blur, and leaving it
          empty would flag it before a word is said. */}
      <button
        type="button" className="pill pill-light cf-mic" data-on={listening ? '' : undefined} disabled={locked}
        aria-describedby="cf-dictate-privacy"
        onMouseDown={event => event.preventDefault()} onClick={dictation.toggle}
      >
        <PillFaces><Mic size={16} aria-hidden="true" />{dictation.state === 'off' ? SAY.start : SAY.stop}</PillFaces>
      </button>
      {/* One steady line for screen readers: reading out each word into an open mic would dictate
          the screen reader, so the live words are not announced. */}
      <output className="cf-dictate-status" data-on={listening ? '' : undefined} data-note={dictation.note ? '' : undefined}>
        {dictation.note ? SAY[dictation.note] : listening ? SAY.listening : ''}
      </output>
    </>
  );
  // Where speech goes. Always in the full version; in the small card it shows while the mic is on,
  // and is still read to a screen reader before that.
  const micNote = (always: boolean) => dictation.supported && (
    <div className="cf-dictate-notes">
      {live && <p className="cf-dictate-live">{live}</p>}
      <p className={always || listening ? 'cf-field-hint cf-privacy' : 'sr-only'} id="cf-dictate-privacy">{SAY.privacy}</p>
    </div>
  );
  const honeypot = (
    // Off screen and out of the tab order, so only a bot fills it.
    <div className="cf-bot" aria-hidden="true">
      <label htmlFor="cf-botcheck">{CONTACT_FORM.botcheck}</label>
      <input ref={botRef} id="cf-botcheck" name="botcheck" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
  // Send carries a paper plane; on a press that passes the checks it flies off (.cf-fly, a copy
  // laid over the button's own, which hides while the letter is on its way).
  const send = (
    <span className="cf-send-wrap" data-flying={sending ? '' : undefined}>
      <button className="pill pill-berry pill-big cf-send" type="submit" disabled={locked}>
        <PillFaces>{sending ? CONTACT_FORM.sending : CONTACT_FORM.send} <Send className="cf-plane" size={18} aria-hidden="true" /></PillFaces>
      </button>
      {sending && <Send className="cf-fly" size={18} aria-hidden="true" />}
    </span>
  );
  // How to reach them, checked as they type: the chip says what the text looks like so far.
  const kind = reachKind(values.contact);
  const reach = (
    <div className="cf-field cf-reach" data-invalid={errors.contact ? '' : undefined}>
      <label className="cf-label" htmlFor="cf-contact">{CONTACT_FORM.contact}</label>
      <div className="cf-reach-box">
        <input {...common('contact')} ref={refs.contact} type="text" inputMode="email" autoComplete="email" maxLength={200} aria-required="true" placeholder={CONTACT_FORM.contactPlaceholder} />
        {values.contact.trim() !== '' && (
          <output className="cf-verify" data-ok={kind ? '' : undefined}>
            {kind && <Check size={14} aria-hidden="true" />}
            {kind ? CONTACT_FORM.verify[kind] : CONTACT_FORM.verify.neither}
          </output>
        )}
      </div>
      <p className="cf-error" id="cf-contact-error">{errors.contact ?? ''}</p>
    </div>
  );
  const progress = sending && <ThinkingIndicator className="cf-progress" words={[STEPS[step]]} />;
  const statusLine = (
    <p className="cf-status" role="status" aria-live="polite" data-kind={status.kind}>
      {status.kind === 'sent' && <Check size={18} aria-hidden="true" />}
      {status.text}
    </p>
  );

  // The small card: the box, Dictate, Open and Send, and nothing else (Andrew 2026-11-11).
  const mini = (
    <div className="cf-mini" ref={miniRef}>
      {letterBox}
      {reach}
      {honeypot}
      <div className="cf-foot">
        {mic}
        {progress}
        {send}
      </div>
      {micNote(false)}
      {!ENDPOINT && <p className="cf-hint">{CONTACT_FORM.viaMail}</p>}
    </div>
  );

  // The full version: who they are and how to reach them, the one question, the letter, the
  // signature. Two columns on a wide screen so all of it fits one screen without scrolling.
  const full = (
    <>
      <div className="cf-cols">
        <div className="cf-col">
          {reach}
          {/* One multiple choice question, lettered like a quiz; any number of answers (real
              checkboxes). The last, "Something else", opens a box to say more. */}
          <fieldset className="cf-quiz" disabled={locked}>
            <legend className="cf-label">{LOOKING.label}</legend>
            <div className="cf-answers">
              {LOOKING.options.map((option, i) => (
                <label key={option} className="cf-answer">
                  <input className="cf-answer-radio" type="checkbox" name="looking" value={option} checked={looking.includes(option)} onChange={() => toggleLooking(option)} />
                  <span className="cf-answer-key" aria-hidden="true">{LETTERS[i]}</span>
                  <span className="cf-answer-text">{option}</span>
                </label>
              ))}
            </div>
            {looking.includes(OTHER) && (
              <input
                ref={moreRef} className="cf-more" type="text" value={more} maxLength={120} disabled={locked}
                aria-label={LOOKING.more} placeholder={LOOKING.more} onChange={event => setMore(event.target.value)}
              />
            )}
          </fieldset>
        </div>
        <div className="cf-col cf-col-letter">
          {letterBox}
          {micNote(true)}
        </div>
      </div>
      {honeypot}
      <div className="cf-foot">
        {mic}
        {/* Sign it by hand, if they like, in a popup of its own. Only sent through the Worker: a
            mail app cannot carry it. */}
        {ENDPOINT && (
          <button ref={signRef} type="button" className="cf-sign" aria-haspopup="dialog" disabled={locked} onClick={() => setSigning(true)}>
            {signature
              // eslint-disable-next-line @next/next/no-img-element -- a data URL drawn a moment ago
              ? <><img className="cf-sign-ink" src={signature} alt={CONTACT_FORM.sign.preview} />{CONTACT_FORM.sign.change}</>
              : <><PenLine size={16} aria-hidden="true" />{CONTACT_FORM.sign.add}</>}
          </button>
        )}
        {progress}
        {!ENDPOINT && <p className="cf-hint">{CONTACT_FORM.viaMail}</p>}
        {/* In the row, not under it: the popup keeps its height when a line appears. */}
        {statusLine}
        {send}
      </div>
    </>
  );

  const title = (
    <>
      {/* Read as one plain sentence; the flipping words are for the eye. */}
      <span className="sr-only">{CONTACT_FORM.heading}</span>
      <span aria-hidden="true">
        {CONTACT_FORM.headingLead}{' '}
        <span className="cf-flip" data-on={flipped ? '' : undefined} onPointerDown={flipTap}>
          <span className="cf-flip-track">
            {CONTACT_FORM.headingFlip[0]}
            <span className="cf-flip-b">{CONTACT_FORM.headingFlip[1]}</span>
          </span>
        </span>
      </span>
    </>
  );

  return (
    <>
      {/* The form is the letter itself: the site's one card (.ink-card in app/globals.css), in paper. */}
      <form className="cf ink-card" data-fill="paper" onSubmit={onSubmit} noValidate aria-labelledby="cf-title" aria-busy={sending} data-suspended={suspended ? '' : undefined}>
        <Stationery />
        <div className="cf-head">
          <h3 className="cf-title" id="cf-title">{title}</h3>
          {/* Open, in the card's top right corner (Andrew 2026-11-11); the stamp sits beside it. */}
          {status.kind !== 'sent' && !expanded && (
            <button ref={expandRef} type="button" className="cf-open" aria-label={CONTACT_FORM.expandName} aria-haspopup="dialog" disabled={locked} onClick={() => openFull('message')}>
              {CONTACT_FORM.expand} <Maximize2 size={14} aria-hidden="true" />
            </button>
          )}
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
              initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }}
              transition={transition}
            >
              {/* The letter goes into its envelope and the envelope into the mailbox. */}
              <SentScene />
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
              onAnimationComplete={() => { if (refocus.current) { refocus.current = false; refs.message.current?.focus(); } }}
            >
              {/* While the full version is open the fields live there; the card keeps its height. */}
              {expanded ? <div className="cf-away" style={{ minBlockSize: awayH }} aria-hidden="true" /> : mini}
            </motion.div>
          )}
        </AnimatePresence>
        {/* One live region for every outcome, outside the swap so it is never unmounted mid-message. */}
        {!expanded && statusLine}
      </form>

      {/* The full version (components/ui/dialog.tsx, Base UI): focus is trapped inside; Esc, an
          outside press and the close button close it and keep what was typed; focus goes back to Open. */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="cf-dialog" showCloseButton={false} initialFocus={refs[openOn]} finalFocus={expandRef}>
          <form className="cf cf-full" onSubmit={onSubmit} noValidate aria-busy={sending} data-suspended={suspended ? '' : undefined}>
            <div className="cf-head">
              <DialogTitle className="cf-title">{CONTACT_FORM.heading.replace(/^Or w/, 'W')}</DialogTitle>
              <DialogDescription className="sr-only">{CONTACT_FORM.fullNote}</DialogDescription>
              <output>
                {suspended && <span className="cf-chip"><span className="cf-chip-dot" aria-hidden="true" />{CONTACT_FORM.suspended}</span>}
              </output>
            </div>
            {full}
            <DialogClose className="cf-x" aria-label={CONTACT_FORM.collapse}><X size={20} aria-hidden="true" /></DialogClose>
          </form>
        </DialogContent>
      </Dialog>

      {/* The signature pad, a popup over the full version. Each stroke is kept as it ends; Done closes. */}
      <Dialog open={signing} onOpenChange={setSigning}>
        <DialogContent className="cf-dialog cf-sign-dialog" showCloseButton={false} finalFocus={signRef}>
          <div className="cf cf-signing">
            <div className="cf-head">
              <DialogTitle className="cf-title">{CONTACT_FORM.sign.title}</DialogTitle>
            </div>
            <DialogDescription className="cf-field-hint">{CONTACT_FORM.sign.note}</DialogDescription>
            <SignaturePad onChange={setSignature} disabled={locked} labels={CONTACT_FORM.sign} resetKey={padKey} />
            <div className="cf-foot">
              <DialogClose className="pill pill-berry cf-send"><PillFaces>{CONTACT_FORM.sign.done}</PillFaces></DialogClose>
            </div>
            <DialogClose className="cf-x" aria-label={CONTACT_FORM.sign.close}><X size={20} aria-hidden="true" /></DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


export default ContactForm;
