// Dialog: the Pokemon-style talk box. Owned by the round 5 dialog builder. See CONTRACT.md, ROUND 5.
// A near-black box at the bottom with a thick white double border opens like an old TV turning on:
// a bright line grows across the screen, then opens up into the box, with scanlines over it. Text
// types out with babble blips (ctx.sound.tone, so the sound toggle silences it), a ▼ blinks when
// the line is done, and F, Enter, Space or a click moves on (or finishes the typing first).
// Choices sit in a second box above the right corner: arrows or W / S move, F or Enter picks, click
// or tap works too. Closing squeezes the picture back to a line, then a dot.
//
// One conversation at a time: say() and run() calls queue up, and the box stays on between them.
// While the box is up every key is captured before ctx.input sees it, so the car never moves.
//
// Why the hotbar hides while the box is up (inventory.js listens to bus 'dialog'): both want the
// bottom centre, a phone has no height for both plus the box, and nothing in the bar can be used
// mid-chat because keys are captured. The bar slides back when the box closes, so a "Got X!" gift
// is seen landing in its slot right after the chat.

const MS = 30;                        // ms per letter while typing
const VOICE = [520, 0.35, 'sine'];    // default babble voice: base Hz, pitch spread, oscillator

const CSS = `
#dlg{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:8;width:min(760px,calc(100% - 24px));transform:translateX(-50%);display:none;pointer-events:none;
  font:500 19px/1.45 Fredoka,Nunito,system-ui,sans-serif;color:#fffaf0}
#dlg.show{display:block}
#dlg .tv{position:relative;pointer-events:auto;display:flex;gap:16px;align-items:flex-start;min-height:92px;padding:16px 44px 18px 18px;background:#15161d;border:8px double #fffaf0;border-radius:20px;
  box-shadow:0 0 0 3px #15161d,0 10px 0 #00000033,0 26px 50px -12px #000000aa;cursor:pointer;transform-origin:50% 50%;-webkit-tap-highlight-color:transparent}
#dlg .who{position:absolute;left:14px;bottom:100%;margin-bottom:9px;background:#15161d;color:#ffd166;border:3px solid #fffaf0;border-radius:12px;box-shadow:0 0 0 3px #15161d;
  padding:5px 12px;font:700 14px/1 Fredoka,system-ui,sans-serif;letter-spacing:.06em;white-space:nowrap;opacity:0;transition:opacity .15s}
#dlg .who:empty{display:none}
#dlg .face{flex:none;width:64px;height:64px;border-radius:14px;background:#262838;opacity:0;transition:opacity .15s}
#dlg .face.none{display:none}
#dlg .text{flex:1;min-width:0;min-height:2.9em;white-space:pre-wrap;overflow-wrap:anywhere}
#dlg .text i{font-style:normal;color:transparent}
#dlg .text.got{color:#ffd166;font-weight:700}
#dlg .tri{position:absolute;right:16px;bottom:10px;color:#ffd166;font-size:15px;line-height:1;visibility:hidden;animation:dlg-blink .8s steps(2,jump-none) infinite}
#dlg .tri.on{visibility:visible}
@keyframes dlg-blink{0%{opacity:1;transform:translateY(0)}100%{opacity:.15;transform:translateY(3px)}}
#dlg .opts{position:absolute;right:6px;bottom:100%;margin-bottom:12px;display:none;gap:2px;padding:8px;min-width:190px;max-width:calc(100% - 12px);background:#15161d;border:7px double #fffaf0;border-radius:16px;
  box-shadow:0 0 0 3px #15161d,0 8px 0 #00000033;cursor:default}
#dlg .opts.on{display:grid}
#dlg .opt{appearance:none;position:relative;border:0;background:none;color:#fffaf0;font:600 17px/1.2 Fredoka,system-ui,sans-serif;text-align:left;padding:8px 12px 8px 30px;border-radius:9px;cursor:pointer;touch-action:manipulation}
#dlg .opt.sel{background:#ffffff17}
#dlg .opt.sel::before{content:"▶";position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#ffd166;font-size:13px}
#dlg .opt:focus-visible{outline:3px solid #5b6fd6;outline-offset:1px}
#dlg .scan{position:absolute;inset:0;border-radius:12px;pointer-events:none;background:repeating-linear-gradient(180deg,#ffffff0a 0 1px,transparent 1px 3px);mix-blend-mode:screen}
#dlg .flash{position:absolute;inset:-8px;border-radius:20px;pointer-events:none;background:#f4fbff;opacity:0;box-shadow:0 0 24px 6px #cfe9ffaa}
#dlg.ready .who,#dlg.ready .face{opacity:1}
@media (max-width:600px){#dlg{font-size:16px;width:calc(100% - 16px)}#dlg .tv{padding:12px 36px 14px 12px;gap:10px;min-height:80px;border-width:7px}#dlg .face{width:46px;height:46px;border-radius:11px}#dlg .opt{font-size:16px}}
@media (prefers-reduced-motion:reduce){#dlg .tri{animation:none}}
`;

/* ---------- portraits: tiny canvas faces, one per speaker kind ---------- */
function drawFace(g, kind, color){
  const S = 128; g.clearRect(0, 0, S, S);
  const circ = (x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fillStyle = fill; g.fill(); };
  const eyes = (y, sep, r, blush = true) => {
    for(const s of [-1, 1]){ circ(64 + s*sep, y, r, '#1b1b24'); circ(64 + s*sep + r*0.35, y - r*0.35, r*0.38, '#ffffff'); if(blush) circ(64 + s*(sep + r*1.9), y + r*1.6, r*0.9, '#ff9fb266'); }
  };
  const P = {
    berry(){ circ(64, 72, 44, '#3b4f9e'); g.fillStyle = '#23306b'; g.beginPath(); for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2 - Math.PI/2; g.lineTo(64 + Math.cos(a)*18, 30 + Math.sin(a)*12); g.lineTo(64 + Math.cos(a + 0.63)*7, 30 + Math.sin(a + 0.63)*5); } g.closePath(); g.fill(); circ(46, 58, 8, '#ffffff33'); eyes(74, 16, 7); },
    robot(){ g.fillStyle = '#9aa3b8'; g.fillRect(62, 12, 4, 22); circ(64, 12, 7, '#e5484d'); g.fillStyle = '#f5f7fa'; g.beginPath(); g.roundRect(18, 32, 92, 76, 14); g.fill(); g.fillStyle = '#1f2a44'; g.beginPath(); g.roundRect(28, 44, 72, 46, 8); g.fill(); g.fillStyle = '#5ff0e0'; g.fillRect(42, 56, 14, 11); g.fillRect(72, 56, 14, 11); g.fillRect(52, 76, 24, 4); },
    tooth(){ g.fillStyle = '#fbfbf7'; g.beginPath(); g.moveTo(30, 60); g.bezierCurveTo(24, 18, 104, 18, 98, 60); g.bezierCurveTo(96, 80, 92, 116, 82, 116); g.bezierCurveTo(72, 116, 72, 90, 64, 90); g.bezierCurveTo(56, 90, 56, 116, 46, 116); g.bezierCurveTo(36, 116, 32, 80, 30, 60); g.fill(); eyes(58, 17, 7); },
    terrapin(){ circ(64, 100, 50, '#6f7d2e'); circ(40, 90, 10, '#58651f'); circ(88, 90, 10, '#58651f'); circ(64, 58, 34, '#9fae54'); eyes(56, 13, 6, false); g.strokeStyle = '#1b1b24'; g.lineWidth = 3; g.beginPath(); g.arc(64, 68, 9, 0.2, Math.PI - 0.2); g.stroke(); },
    brain(){ circ(64, 70, 42, '#f29bbd'); for(let i = 0; i < 7; i++){ const a = Math.PI + i/6*Math.PI; circ(64 + Math.cos(a)*34, 58 + Math.sin(a)*30, 15, '#ec86ad'); } eyes(76, 15, 7); },
    sign(){ g.fillStyle = '#8a5a3c'; g.fillRect(58, 70, 12, 50); g.fillStyle = '#c9965f'; g.beginPath(); g.roundRect(14, 22, 100, 56, 10); g.fill(); g.fillStyle = '#8a5a3c'; for(const y of [38, 50, 62]) g.fillRect(28, y, 72, 5); },
    blob(){ g.fillStyle = color || '#ffd6a5'; g.beginPath(); g.roundRect(22, 22, 84, 120, 42); g.fill(); eyes(66, 16, 7); },
  };
  (P[kind] || P.blob)();
}

// Pure step of a conversation tree: where a node leads after the player picked `pick`.
// Choices are [label, nextId] pairs or { label, next } objects; a missing next ends the chat.
export function nextOf(node, pick){
  if(Array.isArray(node?.choices) && node.choices.length){
    const c = node.choices[pick]; if(c == null) return null;
    return (Array.isArray(c) ? c[1] : typeof c === 'object' ? c.next : null) || null;
  }
  return node?.next || null;
}
export const labelOf = c => Array.isArray(c) ? String(c[0]) : typeof c === 'object' && c ? String(c.label) : String(c);

export function init(ctx){
  const { state, bus } = ctx;
  const style = document.createElement('style'); style.id = 'dlg-css'; style.textContent = CSS; document.head.append(style);
  const root = document.createElement('div'); root.id = 'dlg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Conversation');
  root.innerHTML = '<div class="tv"><div class="who"></div><canvas class="face" width="128" height="128" aria-hidden="true"></canvas><div class="text" aria-live="polite"></div><div class="tri" aria-hidden="true">▼</div><div class="opts" role="listbox"></div><div class="scan"></div><div class="flash"></div></div>';
  document.body.append(root);
  const $ = s => root.querySelector(s);
  const tv = $('.tv'), who = $('.who'), face = $('.face'), text = $('.text'), tri = $('.tri'), opts = $('.opts'), flash = $('.flash');
  const fg = face.getContext('2d');
  // Two spans: the typed part and the rest in transparent ink, so the words never reflow while typing.
  const said = document.createElement('span'), rest = document.createElement('i'); text.append(said, rest);

  let phase = 'off';          // off | opening | on | closing
  let anim = null, opening = null;
  let session = 0;            // bumped by close(), so an aborted conversation stops at its next step
  let cur = null;             // the line on screen: { text, shown, t, done, blip, voice, choices, resolve }
  let pickSt = null;          // { n, sel } while choices are showing
  const queue = []; let running = false;

  const tone = (...a) => { try { ctx.sound?.tone?.(...a); } catch {} };

  /* ---------- the TV: on and off ---------- */
  function play(el, frames, opt){
    // Web Animations API, with a timer fallback so a browser without it still opens and closes.
    if(typeof el.animate === 'function') return el.animate(frames, opt);
    return { finished: new Promise(r => setTimeout(r, opt.duration)), cancel(){} };
  }
  let flashAnim = null;
  function tvOn(){
    if(phase === 'on') return Promise.resolve();
    if(phase === 'opening') return opening;
    anim?.cancel(); flashAnim?.cancel();
    phase = 'opening'; root.classList.add('show'); root.classList.remove('ready');
    try { ctx.input?.clear?.(); } catch {}
    bus.emit('dialog', { open: true });
    const R = state.reduced, d = R ? 140 : 400;
    const a = anim = play(tv, R ? [{ opacity: 0 }, { opacity: 1 }] : [
      { transform: 'scale(.02,.03)', offset: 0 },
      { transform: 'scale(1,.03)', offset: 0.42 },     // the bright line across the screen
      { transform: 'scale(1,1)', offset: 1 },
    ], { duration: d, easing: 'cubic-bezier(.3,.7,.3,1)' });
    flashAnim = R ? null : play(flash, [{ opacity: 1 }, { opacity: 1, offset: 0.42 }, { opacity: 0 }], { duration: d });
    tone(160, 0.3, 'sine', 0.05, 1500);
    opening = a.finished.then(() => { if(anim !== a) return; phase = 'on'; root.classList.add('ready'); }, () => {});
    return opening;
  }
  function tvOff(){
    if(phase === 'off' || phase === 'closing') return;
    anim?.cancel(); flashAnim?.cancel();
    phase = 'closing'; root.classList.remove('ready'); opts.classList.remove('on'); tri.classList.remove('on');
    const R = state.reduced, d = R ? 140 : 340;
    const a = anim = play(tv, R ? [{ opacity: 1 }, { opacity: 0 }] : [
      { transform: 'scale(1,1)', opacity: 1 },
      { transform: 'scale(1,.03)', opacity: 1, offset: 0.45 },  // squeezed to a line
      { transform: 'scale(.012,.05)', opacity: 1, offset: 0.8 }, // then a dot
      { transform: 'scale(0,0)', opacity: 0 },
    ], { duration: d, easing: 'ease-in', fill: 'forwards' });
    flashAnim = R ? null : play(flash, [{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 1 }], { duration: d, fill: 'forwards' });
    tone(1400, 0.22, 'sine', 0.04, 120);
    a.finished.then(() => {
      if(anim !== a) return;
      phase = 'off'; root.classList.remove('show'); a.cancel(); flashAnim?.cancel(); anim = null;
      said.textContent = ''; rest.textContent = '';
      bus.emit('dialog', { open: false });
      ctx.renderer?.domElement?.focus?.({ preventScroll: true });
    }, () => {});
  }

  /* ---------- typing one line ---------- */
  function blip(v, ch){
    if(!ctx.sound?.on) return;
    const [base, spread, type] = v || VOICE;
    const k = (ch.toLowerCase().charCodeAt(0) % 7) / 6, f = base*(1 - spread/2 + spread*k);
    const vowel = 'aeiou'.includes(ch.toLowerCase());
    tone(f, vowel ? 0.08 : 0.055, type, type === 'square' ? 0.022 : 0.045, f*(vowel ? 1.15 : 0.93));
  }
  function paint(){ said.textContent = cur.text.slice(0, cur.shown); rest.textContent = cur.text.slice(cur.shown); }
  function typeLine(L, voice, choices){
    return new Promise(resolve => {
      text.classList.toggle('got', !!L.got); text.setAttribute('aria-label', L.text);
      cur = { text: L.text, shown: 0, t: 0, done: false, blip: 0, voice, choices, resolve };
      tri.classList.remove('on'); opts.classList.remove('on'); pickSt = null;
      paint();
      if(L.got){ [659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.08), i*90)); }
      try { L.fn?.(); } catch(e){ console.error('[dialog] line hook threw', e); }
    });
  }
  function finishLine(){
    if(!cur || cur.done) return;
    cur.shown = cur.text.length; cur.done = true; paint();
    if(cur.choices) openChoices(cur.choices); else tri.classList.add('on');
  }
  ctx.onUpdate(dt => {
    if(phase !== 'on' || !cur || cur.done) return;
    cur.t += Math.min(dt, 0.1);
    const target = state.reduced ? cur.text.length : Math.min(cur.text.length, Math.floor(cur.t*1000/MS));
    while(cur.shown < target){ const ch = cur.text[cur.shown++]; if(/[a-z0-9]/i.test(ch) && (cur.blip++ % 2 === 0)) blip(cur.voice, ch); }
    paint();
    if(cur.shown >= cur.text.length) finishLine();
  }, 99);

  // F, Enter, Space or a click: finish the typing first, then move on.
  function advance(){
    if(phase !== 'on' || !cur || pickSt) return false;
    if(!cur.done){ finishLine(); return true; }
    const r = cur.resolve; cur = null; tri.classList.remove('on');
    tone(880, 0.05, 'square', 0.02);
    r(undefined); return true;
  }

  /* ---------- choices ---------- */
  function openChoices(labels){
    opts.innerHTML = '';
    labels.forEach((l, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('role', 'option'); b.textContent = l;
      b.addEventListener('click', e => { e.stopPropagation(); choose(i); });
      b.addEventListener('pointerenter', () => select(i, true));
      opts.append(b);
    });
    pickSt = { n: labels.length, sel: 0 }; select(0, true);
    opts.classList.add('on');
  }
  function select(i, quiet){
    if(!pickSt) return;
    const s = ((i % pickSt.n) + pickSt.n) % pickSt.n; if(s !== pickSt.sel && !quiet) tone(660, 0.04, 'square', 0.02);
    pickSt.sel = s;
    opts.querySelectorAll('.opt').forEach((b, k) => { b.classList.toggle('sel', k === s); b.setAttribute('aria-selected', String(k === s)); });
  }
  function choose(i){
    if(!pickSt || !cur || i < 0 || i >= pickSt.n) return false;
    const r = cur.resolve; pickSt = null; cur = null; opts.classList.remove('on');
    tone(990, 0.08, 'triangle', 0.06, 1320);
    r(i); return true;
  }

  tv.addEventListener('click', () => { if(!pickSt) advance(); });

  /* ---------- keys: captured on window before core input, the car, the tour or the bag ---------- */
  const codeOf = e => e.code || (e.key === ' ' ? 'Space' : e.key === 'Escape' || e.key === 'Esc' ? 'Escape' : e.key?.length === 1 ? 'Key' + e.key.toUpperCase() : e.key || '');
  const GO = new Set(['KeyF', 'Enter', 'NumpadEnter', 'Space']);
  addEventListener('keydown', e => {
    if(phase === 'off') return;
    const code = codeOf(e);
    e.stopPropagation();
    if(code === 'Space' || code === 'Tab' || code === 'Enter' || code.startsWith('Arrow')) e.preventDefault();
    if(phase !== 'on') return;
    if(code === 'Escape'){ if(!e.repeat) close(); return; }
    if(pickSt){
      if(code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowLeft') select(pickSt.sel - 1);
      else if(code === 'ArrowDown' || code === 'KeyS' || code === 'ArrowRight') select(pickSt.sel + 1);
      else if(GO.has(code) && !e.repeat) choose(pickSt.sel);
      else if(/^Digit[1-9]$/.test(code)) choose(+code.slice(5) - 1);
      return;
    }
    if(GO.has(code) && !e.repeat) advance();
  }, true);
  addEventListener('keyup', e => { if(phase !== 'off') e.stopPropagation(); }, true);

  /* ---------- the queue: one conversation at a time ---------- */
  function enqueue(job){ return new Promise(res => { queue.push({ job, res }); pump(); }); }
  async function pump(){
    if(running) return;
    const q = queue.shift(); if(!q) return;
    running = true;
    const sess = session; let out;
    try { await tvOn(); if(sess === session) out = await q.job(sess); }
    catch(e){ console.error('[dialog] conversation failed', e); }
    running = false;
    q.res(out);
    if(queue.length) pump(); else if(sess === session) tvOff();
  }
  function setSpeaker({ name, portrait, color }){
    who.textContent = name || '';
    face.classList.toggle('none', !portrait);
    if(portrait) drawFace(fg, portrait, color);
  }
  // Show one box worth of lines. Lines are strings, or { text, got?, fn? } (fn runs as the line starts).
  async function show(o, sess){
    setSpeaker(o);
    const list = (Array.isArray(o.lines) ? o.lines : [o.lines]).filter(l => l != null && l !== '').map(l => typeof l === 'object' ? l : { text: String(l) });
    if(!list.length) list.push({ text: '...' });
    const labels = Array.isArray(o.choices) && o.choices.length ? o.choices.map(labelOf) : null;
    for(let i = 0; i < list.length; i++){
      if(sess !== session) return undefined;
      const last = i === list.length - 1;
      const res = await typeLine(list[i], o.voice, last ? labels : null);
      if(sess !== session) return undefined;
      if(last && labels) return res;
    }
    return undefined;
  }

  function say(o = {}){ return enqueue(sess => show(o, sess)); }
  /**
   * A branching conversation.
   *   tree = { name, portrait?, color?, voice?, start:'hi', nodes:{ id:{ lines, choices?:[[label, nextId]], next?, name?, portrait? } },
   *            onEnter?(id, node) -> node }   onEnter may return a changed copy of the node (gifts use it)
   * Resolves { path:[ids], picks:[index] } when the chat ends (no choices and no next, or Esc).
   */
  function run(tree = {}){
    return enqueue(async sess => {
      const nodes = tree.nodes || {}, path = [], picks = [];
      let id = tree.start || Object.keys(nodes)[0];
      for(let guard = 0; id && guard < 60 && sess === session; guard++){
        let node = nodes[id]; if(!node){ console.warn('[dialog] missing node', id); break; }
        path.push(id);
        try { node = tree.onEnter?.(id, node) || node; } catch(e){ console.error('[dialog] onEnter threw', e); }
        const pick = await show({ name: node.name ?? tree.name, portrait: node.portrait ?? tree.portrait, color: node.color ?? tree.color, voice: node.voice ?? tree.voice, lines: node.lines, choices: node.choices }, sess);
        if(sess !== session) break;
        if(node.choices?.length){ if(pick === undefined) break; picks.push(pick); }
        id = nextOf(node, pick);
      }
      return { path, picks };
    });
  }
  function open(){ return tvOn(); }
  function close(){
    session++;
    while(queue.length) queue.shift().res(undefined);
    const r = cur?.resolve; cur = null; pickSt = null;
    r?.(undefined);
    tvOff();
    return true;
  }
  const busy = () => phase !== 'off' || running || queue.length > 0;

  const api = { say, run, open, close, busy };
  // Test hooks: the API plus a peek at what is on screen and buttons for the critic scripts.
  ctx.expose('dialog', Object.assign({}, api, {
    state: () => ({ phase, name: who.textContent, text: cur?.text ?? null, shown: cur?.shown ?? 0, done: !!cur?.done, choices: pickSt ? [...opts.querySelectorAll('.opt')].map(b => b.textContent) : null, sel: pickSt?.sel ?? null, queued: queue.length }),
    advance: () => advance(),
    pick: i => choose(i),
  }));
  return api;
}
