'use client';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

// Talking into the contact form, with the browser's own speech recognition. Two parts:
//   createDictation  the session, with no React and no timers it cannot be handed, so it can be
//                    tested in Node against a fake recogniser
//   useDictation     the thin hook that connects it to a component
//
// What the session keeps: the text on either side of the insertion point, taken once at the start,
// and every final phrase said since. After each pause it reruns the cleanup on all of those phrases
// and rebuilds before + cleaned + after, so a correction can reach back through this dictation but
// can never touch the rest of the letter. Typing ends the session, so the two sides cannot go stale.
//
// Browser behaviour handled here, none of it visible in the types:
//   - Chrome ends a session after some seconds of silence, so a new recogniser takes over.
//   - Android Chrome marks unsettled words final with confidence 0, and can resend what it already
//     said, as the same words or as those words plus more. See collapseRepeats. On Android only, so
//     someone on a laptop who says "yes", pauses and says "yes please" keeps both.
//   - stop() may deliver one more final, and on some browsers may never fire end. See DRAIN_MS.

const QUIET_MS = 60_000; // no words for this long, so the mic turns off rather than staying open
const QUICK_MS = 1_000; // a session this short heard nothing and something is refusing it
const QUICK_LIMIT = 3; // that many in a row, so stop restarting
const DRAIN_MS = 2_000; // how long after Stop the last words may still arrive

export type DictationState = 'off' | 'starting' | 'listening';
export type DictationNote = 'blocked' | 'noMic' | 'failed' | 'stopped' | null;
export type DictationView = { state: DictationState; interim: string; note: DictationNote };
// The field's text and selection when dictation starts.
export type DictationField = { value: string; start: number; end: number };

type SpeechResult = { isFinal: boolean; 0: { transcript: string; confidence: number } };
type ResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: ResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognizerClass = new () => Recognizer;

type Deps = {
  Recognition: RecognizerClass;
  clean: (said: string[]) => string;
  read: () => DictationField | null;
  write: (text: string, caret: number) => void;
  onChange: (view: DictationView) => void;
  android?: boolean;
  lang?: string;
  now?: () => number;
};

const wordsOf = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').split(/\s+/).filter(Boolean);
const opensWith = (all: string[], start: string[]) => start.length <= all.length && start.every((word, i) => all[i] === word);

// Android's repeats, as a pure rule over the list of finals. Scanning from the oldest piece finds
// the longest match: a final that opens with the last few pieces replaces them, since it says them
// and more, and a final those pieces already open with is old news. Nothing is ever lost, because a
// piece only goes when a final holding all its words takes its place.
export function collapseRepeats(finals: string[]) {
  const out: string[] = [];
  for (const final of finals) {
    const words = wordsOf(final);
    if (!words.length) continue;
    let keep = true;
    for (let from = 0; from < out.length; from += 1) {
      const tail = wordsOf(out.slice(from).join(' '));
      if (opensWith(words, tail)) {
        out.length = from;
        break;
      }
      if (opensWith(tail, words)) {
        keep = false;
        break;
      }
    }
    if (keep) out.push(final);
  }
  return out;
}

// One space between the dictation and whatever it lands against, and none before punctuation.
function placeBetween({ value, start, end }: DictationField) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before && !/\s$/.test(before) ? ' ' : '';
  const trail = after && !/^[\s.,;:!?)]/.test(after) ? ' ' : '';
  return (cleaned: string) => cleaned
    ? { text: before + lead + cleaned + trail + after, caret: before.length + lead.length + cleaned.length }
    : { text: value, caret: end }; // nothing said yet, or "never mind": the field goes back as it was
}

export function createDictation({ Recognition, clean, read, write, onChange, android = false, lang = '', now = Date.now }: Deps) {
  let live: Recognizer | null = null; // the recogniser running now; a stopped one may still be draining
  let state: DictationState = 'off';
  let note: DictationNote = null;
  let interim = '';
  let wanted = false; // false once the visitor has stopped, so the end of a session is really the end
  let place = placeBetween({ value: '', start: 0, end: 0 });
  let lastText = '';
  let settled: string[] = []; // finals from sessions that have ended
  let finals: string[] = []; // this session's finals, by the browser's result index, so a resend overwrites
  let startedAt = 0;
  let heardAt = 0;
  let quickEnds = 0;
  let restarted = false;
  let drainTimer: ReturnType<typeof setTimeout> | undefined;

  const emit = () => onChange({ state, interim, note });

  const render = () => {
    const pieces = [...settled, ...finals.filter(Boolean)];
    const { text, caret } = place(clean(android ? collapseRepeats(pieces) : pieces));
    if (text === lastText) return;
    lastText = text;
    write(text, caret);
  };

  // Moves everything heard into settled, including words the browser never confirmed: they were on
  // screen, so they are kept.
  const settle = () => {
    settled.push(...finals.filter(Boolean));
    if (interim) settled.push(interim);
    finals = [];
    interim = '';
  };

  // Handlers come off first, so a late result from this recogniser can never reach the form.
  const release = (end: 'abort' | 'none') => {
    clearTimeout(drainTimer);
    if (!live) return;
    live.onstart = live.onresult = live.onerror = live.onend = null;
    if (end === 'abort') {
      try { live.abort(); } catch { /* already ended */ }
    }
    live = null;
  };

  const halt = (why: DictationNote) => {
    wanted = false;
    settle();
    render();
    release('abort');
    state = 'off';
    note = why;
    emit();
  };

  const onResult = ({ resultIndex, results }: ResultEvent) => {
    heardAt = now();
    quickEnds = 0;
    let words = '';
    let changed = false;
    for (let i = resultIndex; i < results.length; i += 1) {
      const said = results[i][0].transcript.trim();
      if (results[i].isFinal && (!android || results[i][0].confidence > 0)) {
        if (finals[i] !== said) {
          finals[i] = said;
          changed = true;
        }
      } else {
        // Android's unsettled words repeat each other, so only its latest counts.
        words = android || !words ? said : `${words} ${said}`;
      }
    }
    interim = words;
    if (changed) render();
    emit();
  };

  const onError = ({ error }: { error: string }) => {
    if (error === 'no-speech') return; // silence: the end event that follows restarts it
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      // Allowed once and then refused means the browser would not restart it, not a blocked mic.
      halt(restarted ? 'stopped' : 'blocked');
    } else if (error === 'audio-capture') halt('noMic');
    else if (error === 'aborted') halt('stopped');
    else halt('failed'); // network, language-not-supported, and browsers with no speech service
  };

  const onEnd = () => {
    settle();
    render();
    if (!wanted) {
      release('none');
      state = 'off';
      emit();
      return;
    }
    quickEnds = now() - startedAt < QUICK_MS ? quickEnds + 1 : 0;
    if (now() - heardAt >= QUIET_MS || quickEnds >= QUICK_LIMIT) {
      halt('stopped');
      return;
    }
    release('none');
    restarted = true;
    begin();
    emit();
  };

  const begin = () => {
    startedAt = now();
    try {
      const next = new Recognition();
      next.continuous = true;
      next.interimResults = true;
      if (lang) next.lang = lang;
      next.onstart = () => {
        state = 'listening';
        emit();
      };
      next.onresult = onResult;
      next.onerror = onError;
      next.onend = onEnd;
      live = next;
      next.start();
    } catch {
      halt('failed');
    }
  };

  const start = () => {
    finish(); // anything still draining goes in first, so the caret below lands after it
    const field = read();
    if (!field) return;
    place = placeBetween(field);
    lastText = field.value;
    settled = [];
    wanted = true;
    note = null;
    state = 'starting';
    heardAt = now();
    quickEnds = 0;
    restarted = false;
    begin();
    emit();
  };

  // Stop: the button shows off at once, and the last words may still land for a moment.
  const stop = () => {
    if (state === 'starting') {
      cancel(); // still waiting on the permission prompt: nothing was said
      return;
    }
    wanted = false;
    state = 'off';
    emit();
    drainTimer = setTimeout(finish, DRAIN_MS);
    try { live?.stop(); } catch { finish(); }
  };

  // Ends it now and keeps every word heard, confirmed or not. Before a send, and when the form locks.
  function finish() {
    if (!live && !note) return;
    wanted = false;
    settle();
    if (live) render();
    release('abort');
    state = 'off';
    note = null;
    emit();
  }

  // Ends it now and keeps only what is already in the field. The visitor typed, so their text is the
  // truth; words not yet written cannot be placed against it, and they are dropped.
  function cancel() {
    if (!live && !note) return;
    wanted = false;
    release('abort');
    finals = [];
    interim = '';
    state = 'off';
    note = null;
    emit();
  }

  return { toggle: () => (state === 'off' ? start() : stop()), finish, cancel };
}

function recognizerClass(): RecognizerClass | null {
  const w = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const neverChanges = () => () => {};

type Options = {
  clean: Deps['clean'];
  read: Deps['read'];
  write: Deps['write'];
};

export function useDictation(options: Options) {
  // Pattern: useSyncExternalStore reads something outside React. The server snapshot is false, and
  // React uses it for hydration too before re-rendering with the real answer, so the mic appears
  // only after mount and the server's HTML always matches. Stable Firefox stays false: no button.
  const supported = useSyncExternalStore(neverChanges, () => recognizerClass() !== null, () => false);
  const [view, setView] = useState<DictationView>({ state: 'off', interim: '', note: null });

  // Pattern: a ref to the latest callbacks. The session outlives any one render, and this lets it
  // call the current ones and not the ones from the render that started it.
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });

  // Pattern: a useState initialiser, used for its one-time run. The controls never change identity,
  // so a form can use them in an effect, and the recogniser is only built on the first press.
  const [controls] = useState(() => {
    let session: ReturnType<typeof createDictation> | null = null;
    return {
      toggle: () => {
        const Recognition = recognizerClass();
        if (!Recognition) return;
        session ??= createDictation({
          Recognition,
          clean: said => latest.current.clean(said),
          read: () => latest.current.read(),
          write: (text, caret) => latest.current.write(text, caret),
          onChange: setView,
          android: /android/i.test(navigator.userAgent),
          lang: navigator.language,
        });
        session.toggle();
      },
      finish: () => session?.finish(),
      cancel: () => session?.cancel(),
    };
  });

  // Leaving the page turns the mic off.
  useEffect(() => controls.cancel, [controls]);

  return { supported, ...view, ...controls };
}
