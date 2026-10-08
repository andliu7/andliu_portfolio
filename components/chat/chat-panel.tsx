'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react';
import {
  BLUEBERRY, CHAT_FALLBACK, CHAT_SUGGESTIONS, CONTACT, IDENTITY, IMAGES, MICROCOPY, section,
  type ImageKey, type SectionId,
} from '@/lib/site';
import { Switch } from '@/components/site/switch';
import { jumpTo } from '@/components/site/jump';
import { isReducedMotion } from '@/components/site/use-reduced-motion';
import { parseSSE, SSE_START, type SSEState } from './sse';
import { route } from './fallback';
import { ChatBerry, type ChatMood } from './chat-berry';
import { COPY } from './copy';

// The chat panel (SITE-PLAN.md 6.2 and 6.4). chat-dock.tsx loads this file with next/dynamic only
// when the visitor heads for the launcher, so none of it is in the landing's first download.
//
// It stays mounted once loaded and renders nothing while closed, so the conversation survives
// closing and reopening. The dock owns open / closed, docking and the transition; this file owns
// the conversation.
//
// What the visitor sees, top to bottom, all inside one scrolling column:
//  - the hello: the berry over a fan of three real project screenshots, Andrew's name and
//    identity line, and a greeting bubble (CHAT_FALLBACK.default, which lists what it can answer)
//  - the conversation; every answer has the berry beside it, whose face follows what is
//    happening (reading while you type, thinking while it waits, happy when it answers, shy
//    when live chat fell back), and a card under it with the real link or screenshot for that
//    topic (Visit Blueberry, Work, Experience, Email ...)
//  - the suggestion chips not asked yet, offered again after every answer
//
// Data path: POST { messages } to NEXT_PUBLIC_CHAT_URL (the Cloudflare Worker in worker/, which
// holds the API key), read the Server-Sent Events stream with parseSSE, and append the words as
// they arrive. Anything going wrong (no URL, network error, non-200, an error event, the rate
// limit, or no first word within 8 seconds) falls back to the offline answers in fallback.ts,
// which type in a word at a time so they read as a reply, not a pasted FAQ.

// Inlined at build time. Empty means offline answers only, and the Live switch is disabled.
const ENDPOINT = process.env.NEXT_PUBLIC_CHAT_URL ?? '';
const MAX_CHARS = 1000; // the Worker's per-message cap
const MAX_TURNS = 12; // the Worker's per-request cap
const FIRST_WORD_MS = 8000;
const WORD_MS = 24; // offline answers type in at this pace per word

type Role = 'user' | 'assistant';
type Message = { id: number; role: Role; text: string; note?: string; intent?: string | null; done?: boolean };
type Reason = 'resting' | 'tooFast' | null;
type Link = { label: string; href: string; external?: boolean };
type Extra = { images: readonly ImageKey[]; links: readonly Link[] };

type Props = {
  open: boolean;
  modal: boolean; // below 1100px: a dialog sheet with a focus trap
  wide: boolean; // 1100px and up: docking is offered
  docked: boolean;
  onDock: (next: boolean) => void;
  onClose: () => void;
  onReady: () => void;
};

const jump = (id: SectionId): Link => ({ label: section(id).label ?? id, href: `#${id}` });
const about: Link = { label: MICROCOPY.nav[3], href: '/about' };

// The card under an answer, by topic. Every label, link and picture is already on the site.
const EXTRAS: Record<string, Extra> = {
  blueberry: { images: ['bbHome'], links: [{ label: MICROCOPY.visitBlueberry, href: BLUEBERRY.live, external: true }] },
  // Used once lib/site.ts has the 'blueberryRole' rule (reported as a needs patch); harmless before.
  blueberryRole: { images: ['bbLesson'], links: [{ label: MICROCOPY.visitBlueberry, href: BLUEBERRY.live, external: true }] },
  projects: { images: ['bbHome', 'mechanismTrainer', 'focusFamilyGuide'], links: [jump('work'), jump('impact')] },
  experience: { images: [], links: [jump('experience')] },
  education: { images: [], links: [about] },
  dental: { images: [], links: [about] },
  skills: { images: [], links: [about] },
  personal: { images: [], links: [jump('island')] },
  contact: { images: [], links: CONTACT.links },
};

const HELLO_IMAGES: readonly ImageKey[] = ['bbHome', 'mechanismTrainer', 'focusFamilyGuide'];
const thumb = (key: ImageKey) => {
  const img: { src: string; sm?: string } = IMAGES[key];
  return img.sm ?? img.src;
};

/** The last messages the Worker accepts: at most 12, starting with the visitor, ending on them. */
function forApi(history: Message[]) {
  const recent = history.filter(m => m.text.trim()).slice(-(MAX_TURNS - 1));
  if (recent[0]?.role === 'assistant') recent.shift();
  return recent.map(m => ({ role: m.role, content: m.text }));
}

export default function ChatPanel({ open, modal, wide, docked, onDock, onClose, onReady }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false); // a reply is arriving or typing in
  const [live, setLive] = useState(true);
  const [announce, setAnnounce] = useState(''); // the finished answer, for screen readers
  const online = live && ENDPOINT !== '';

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Pattern: useRef for the AbortController. A ref holds a value across renders without causing
  // one, so the current request can be cancelled from anywhere (a new question, unmount).
  const abortRef = useRef<AbortController | null>(null);
  const typerRef = useRef<number | null>(null); // the interval typing an offline answer in
  const restingShown = useRef(false); // "Live chat is resting" is said once per visit
  const said = useRef(new Set<string>()); // offline topics already answered (no repeats)
  const nextId = useRef(0);

  // Tell the dock the code has arrived, so its view transition can snapshot a real panel.
  useEffect(() => { onReady(); }, [onReady]);

  // Pattern: effect cleanup. The function an effect returns runs on unmount; here it cancels a
  // stream that is still arriving and stops a reply typing in, so nothing writes into a panel
  // that is gone.
  useEffect(() => () => {
    abortRef.current?.abort();
    if (typerRef.current !== null) window.clearInterval(typerRef.current);
  }, []);

  // Focus the box each time the panel opens.
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // Keep the newest words in view (the hello stays at the top until there is a question).
  useEffect(() => {
    const box = scrollRef.current;
    if (box && messages.length) box.scrollTop = box.scrollHeight;
  }, [messages, open, busy]);

  // Pattern: the updater form, setMessages(prev => ...). Words arrive many times a second, and
  // each update must build on the list as it is now, not on the copy this render closed over.
  const patch = (id: number, change: (m: Message) => Message) =>
    setMessages(prev => prev.map(m => (m.id === id ? change(m) : m)));

  const finish = (id: number, text: string) => {
    patch(id, m => ({ ...m, done: true }));
    setAnnounce(text);
    setBusy(false);
  };

  /** Types an offline answer in a word at a time (all at once under reduced motion). */
  const typeIn = (id: number, text: string) => {
    if (typerRef.current !== null) window.clearInterval(typerRef.current);
    if (isReducedMotion()) {
      patch(id, m => ({ ...m, text }));
      finish(id, text);
      return;
    }
    const words = text.split(' ');
    let shown = 0;
    typerRef.current = window.setInterval(() => {
      shown += 1;
      patch(id, m => ({ ...m, text: words.slice(0, shown).join(' ') }));
      if (shown >= words.length) {
        if (typerRef.current !== null) window.clearInterval(typerRef.current);
        typerRef.current = null;
        finish(id, text);
      }
    }, WORD_MS);
  };

  const answerOffline = (id: number, question: string, reason: Reason) => {
    let note: string | undefined;
    if (reason === 'tooFast') note = MICROCOPY.tooFast;
    else if (reason === 'resting' && !restingShown.current) {
      restingShown.current = true;
      note = MICROCOPY.resting;
    }
    const { intent, answer } = route(question, CHAT_FALLBACK, said.current);
    if (intent) said.current.add(intent);
    patch(id, m => ({ ...m, text: '', note, intent }));
    typeIn(id, answer);
  };

  async function send(raw: string) {
    const question = raw.trim().slice(0, MAX_CHARS);
    if (!question || busy) return;
    const asked: Message = { id: nextId.current++, role: 'user', text: question };
    // The card under a live answer follows the question's topic, from the same router the
    // offline answers use.
    const reply: Message = { id: nextId.current++, role: 'assistant', text: '', intent: route(question, CHAT_FALLBACK).intent };
    const history = [...messages, asked];
    setMessages(prev => [...prev, asked, reply]);
    setDraft('');
    setAnnounce('');
    setBusy(true);

    if (!online) {
      answerOffline(reply.id, question, ENDPOINT ? null : 'resting'); // switched off by choice: no note
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let got = false; // has the first word arrived?
    let text = '';
    const timer = window.setTimeout(() => { if (!got) controller.abort(); }, FIRST_WORD_MS);
    let failure: Reason = null;

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: forApi(history) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let state: SSEState = SSE_START;
      let finished = false; // message_stop or an error event
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        const step = parseSSE(value, state);
        state = step.state;
        for (const event of step.out) {
          if (finished) break;
          if (event.type === 'text') {
            got = true;
            text += event.text;
            patch(reply.id, m => ({ ...m, text: m.text + event.text }));
          } else {
            if (event.type === 'error') failure = event.kind === 'rate_limited' ? 'tooFast' : 'resting';
            finished = true;
          }
        }
      }
      reader.cancel().catch(() => {});
      if (!got && !failure) failure = 'resting';
    } catch {
      failure = 'resting'; // network error, non-200, or the 8 second timeout
    } finally {
      window.clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
    }
    // Words that already arrived stay; only an empty answer is replaced by the offline one,
    // except the rate limit, which is always said.
    if (failure && !got) { answerOffline(reply.id, question, failure); return; }
    if (failure === 'tooFast') patch(reply.id, m => ({ ...m, note: MICROCOPY.tooFast }));
    finish(reply.id, text);
  }

  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    void send(draft);
  };

  // Enter sends, Shift+Enter is a new line. isComposing: an IME (Chinese, Japanese, ...) uses
  // Enter to confirm a word, which must not send the message.
  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  };

  // A link to a section of this page: close the sheet first (it covers the page), then take the
  // long jump. On /about the section is not there, so go home to it.
  const onLink = (event: SyntheticEvent, link: Link) => {
    if (link.external || !link.href.startsWith('#')) return;
    event.preventDefault();
    if (!document.getElementById(link.href.slice(1))) { window.location.assign(`/${link.href}`); return; }
    if (modal) onClose();
    jumpTo(link.href);
  };

  // Esc closes in every mode. In the sheet, Tab is trapped: past the last control it wraps to
  // the first, and Shift+Tab the other way. A plain listener on the panel (not onKeyDown), added
  // while open; the effect cleanup removes it.
  useEffect(() => {
    const panel = rootRef.current;
    if (!open || !panel) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (!modal || event.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, a[href]'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    panel.addEventListener('keydown', onKey);
    return () => { panel.removeEventListener('keydown', onKey); };
  }, [open, modal, onClose]);

  if (!open) return null;

  const mode = modal ? 'sheet' : docked ? 'docked' : 'overlay';
  const lastReply = messages.filter(m => m.role === 'assistant').pop();
  const waiting = busy && lastReply?.text === '';
  const askedAlready = new Set(messages.filter(m => m.role === 'user').map(m => m.text));
  const chips = CHAT_SUGGESTIONS.filter(chip => !askedAlready.has(chip));

  // The berry's face, from what is happening right now.
  const mood: ChatMood =
    waiting ? 'thinking'
    : busy ? 'happy'
    : draft.trim() ? 'reading'
    : lastReply?.note ? 'shy'
    : lastReply ? 'happy'
    : 'rest';

  const renderLink = (link: Link) => (
    <a
      key={link.href}
      className="chat-link"
      href={link.href}
      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
      onClick={event => onLink(event, link)}
    >
      {link.label}
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12L12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </a>
  );

  return (
    <div
      ref={rootRef}
      id="chat-panel"
      className="chat-panel"
      role={modal ? 'dialog' : 'complementary'}
      aria-modal={modal || undefined}
      aria-labelledby="chat-title"
      data-mode={mode}
      data-ground="berry-deep"
      data-lenis-prevent=""
    >
      <div className="chat-head">
        <ChatBerry mood={mood} className="chat-head-berry" />
        <h2 id="chat-title" className="chat-title">{MICROCOPY.ask}</h2>
        <button type="button" className="chat-close" onClick={onClose} aria-label={MICROCOPY.close}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
        <div className="chat-controls">
          <Switch on={online} onChange={setLive} label={MICROCOPY.live} disabled={!ENDPOINT} describedBy={online ? undefined : 'chat-mode'} />
          {!online && <span id="chat-mode" className="chat-mode">{MICROCOPY.offline}</span>}
          {wide && <Switch on={docked} onChange={onDock} label={MICROCOPY.dock} />}
        </div>
      </div>

      <div ref={scrollRef} className="chat-scroll">
        <div className="chat-hello">
          <div className="chat-fan" aria-hidden="true">
            {HELLO_IMAGES.map((key, i) => (
              <img key={key} className="chat-fan-img" style={{ '--i': i } as CSSProperties} src={thumb(key)} alt="" width={160} height={100} decoding="async" />
            ))}
            <ChatBerry mood={messages.length ? 'rest' : 'happy'} className="chat-hello-berry" />
          </div>
          <p className="chat-hello-name">{IDENTITY.name}</p>
          <p className="chat-hello-line">{IDENTITY.short}</p>
        </div>

        <ol className="chat-log" aria-label={MICROCOPY.ask}>
          <li className="chat-row" data-role="assistant">
            <ChatBerry mood="rest" className="chat-avatar" />
            <div className="chat-bubbles"><div className="chat-msg">{CHAT_FALLBACK.default}</div></div>
          </li>
          {messages.map(m => {
            const extra = m.role === 'assistant' && m.done && m.intent ? EXTRAS[m.intent] : undefined;
            const isLast = m === lastReply;
            return (
              <li key={m.id} className="chat-row" data-role={m.role}>
                {m.role === 'assistant' && <ChatBerry mood={isLast ? mood : 'rest'} className="chat-avatar" />}
                <div className="chat-bubbles">
                  <div className="chat-msg">
                    {m.note && <span className="chat-note">{m.note}</span>}
                    {m.text || (isLast && waiting && <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>)}
                  </div>
                  {extra && (
                    <div className="chat-extra">
                      {extra.images.length > 0 && (
                        <div className="chat-shots" data-count={extra.images.length}>
                          {extra.images.map(key => (
                            <img key={key} className="chat-shot" src={thumb(key)} alt={IMAGES[key].alt} width={320} height={200} decoding="async" />
                          ))}
                        </div>
                      )}
                      <div className="chat-links">{extra.links.map(renderLink)}</div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {!busy && chips.length > 0 && (
          <ul className="chat-chips">
            {chips.map(chip => (
              <li key={chip}><button type="button" className="chat-chip" onClick={() => void send(chip)}>{chip}</button></li>
            ))}
          </ul>
        )}
      </div>

      {/* Screen readers hear each answer once, when it is complete, not word by word. */}
      <p className="chat-sr" aria-live="polite">{announce}</p>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="chat-sr">{MICROCOPY.ask}</label>
        <textarea
          ref={inputRef}
          id="chat-input"
          className="chat-input"
          rows={1}
          maxLength={MAX_CHARS}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onInputKey}
          aria-describedby="chat-count"
        />
        <button type="submit" className="chat-send" disabled={busy || !draft.trim()} aria-label={COPY.send}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span id="chat-count" className="chat-count">{draft.length}/{MAX_CHARS}</span>
      </form>
    </div>
  );
}
