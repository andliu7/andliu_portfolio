// A tiny synthesised sound kit. No audio files, no library.
// Off until the visitor presses the toggle: browsers refuse audio before a gesture,
// and an unasked-for sound is the fastest way to lose an admissions reader.
//
// This is a module-level store. React components read it through useSyncExternalStore
// (see SoundToggle), which is React's hook for "state that lives outside React".

type Voice = 'tap' | 'clink' | 'clank';

let ctx: AudioContext | null = null;
let on = false;
const listeners = new Set<() => void>();

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
  if (!on || !ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const voices: Record<Voice, () => void> = {
  tap: () => tone(180, 0.12, 'triangle', 0.18, 90),
  clink: () => { tone(1320, 0.5, 'sine', 0.12); tone(2640, 0.3, 'sine', 0.04); },
  clank: () => { tone(220, 0.25, 'square', 0.06, 160); tone(660, 0.2, 'sine', 0.08); },
};

export const sound = {
  isOn: () => on,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  toggle: () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    on = !on;
    listeners.forEach(fn => fn());
    if (on) voices.clink();
  },
  play: (voice: Voice) => { voices[voice](); },
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend(); else if (on) void ctx.resume();
  });
}
