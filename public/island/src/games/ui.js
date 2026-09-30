// Shared game UI kit: start and end cards, a top-centre HUD strip, big pop text, toasts,
// confetti, key capture for modal screens, jingles and best-score storage.
// Not a game (it is not in GAME_IDS); every game imports it.
import { codeOf } from '../core/input.js';

const CSS = `
.gm{position:fixed;inset:0;pointer-events:none;font:500 15px/1.4 Nunito,system-ui,sans-serif;color:#1f2a44}
.gm .on{pointer-events:auto}
.gm-veil{position:absolute;inset:0;background:radial-gradient(ellipse at center,#fff4dc55,#3b2a4a66);opacity:0;transition:opacity .25s}
.gm-veil.show{opacity:1}
.gm-card{position:absolute;left:50%;top:50%;width:min(420px,calc(100% - 32px));transform:translate(-50%,-46%) scale(.94);opacity:0;transition:transform .28s cubic-bezier(.2,1.6,.4,1),opacity .2s;
  background:#fffaf0;border-radius:28px;box-shadow:0 8px 0 #0000002a,0 24px 60px #3b2a4a33;padding:22px 22px 18px;text-align:center;box-sizing:border-box;border:3px solid #1f2a44}
.gm-card.show{transform:translate(-50%,-50%) scale(1);opacity:1}
.gm-badge{width:64px;height:64px;margin:-54px auto 6px;border-radius:22px;display:grid;place-items:center;font:700 30px/1 Fredoka,system-ui,sans-serif;color:#fff;border:3px solid #1f2a44;box-shadow:0 5px 0 #0000002a;transform:rotate(-6deg)}
.gm-eyebrow{font:600 11px/1 Fredoka,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#4b5675}
.gm-title{font:700 30px/1.05 Fredoka,system-ui,sans-serif;margin:6px 0 8px}
.gm-body{margin:0 0 12px;color:#4b5675;font-size:14px}
.gm-stats{display:flex;justify-content:center;gap:10px;margin:4px 0 14px;flex-wrap:wrap}
.gm-stat{background:#f4ecdc;border-radius:16px;padding:8px 12px;min-width:74px}
.gm-stat b{display:block;font:700 22px/1.1 Fredoka,system-ui,sans-serif;color:#1f2a44}
.gm-stat span{font:600 10px/1 Fredoka,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#4b5675}
.gm-stat.hot{background:#ffd166}
.gm-keys{font:500 12px/1.8 Fredoka,system-ui,sans-serif;color:#4b5675;margin:0 0 12px}
.gm kbd{font:600 11px/1 Fredoka,system-ui,sans-serif;background:#1f2a44;color:#fffaf0;border-radius:6px;padding:3px 6px;margin:0 1px}
.gm-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.gm-btn{appearance:none;border:3px solid #1f2a44;background:#fffaf0;color:#1f2a44;font:700 15px/1 Fredoka,system-ui,sans-serif;padding:12px 18px;border-radius:999px;box-shadow:0 4px 0 #1f2a44;cursor:pointer;display:inline-flex;gap:8px;align-items:center;touch-action:manipulation}
.gm-btn.primary{background:#3b4f9e;color:#fff}
.gm-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #1f2a44}
.gm-btn:focus-visible{outline:3px solid #5b6fd6;outline-offset:3px}
.gm-btn kbd{background:#ffffff33;color:inherit}
.gm-btn:not(.primary) kbd{background:#1f2a44;color:#fffaf0}
.gm-hud{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translate(-50%,-140%);transition:transform .35s cubic-bezier(.2,1.5,.4,1);display:flex;gap:8px;align-items:stretch}
.gm-hud.show{transform:translate(-50%,0)}
.gm-chip{background:#fffaf0;border:3px solid #1f2a44;border-radius:18px;box-shadow:0 4px 0 #0000002a;padding:6px 12px;text-align:center;min-width:64px}
.gm-chip b{display:block;font:700 22px/1.05 Fredoka,system-ui,sans-serif;font-variant-numeric:tabular-nums}
.gm-chip span{font:600 9px/1 Fredoka,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4b5675}
.gm-chip.main{background:#1f2a44;color:#fffaf0;min-width:120px}
.gm-chip.main span{color:#c9d2ff}
.gm-chip.warn{background:#ffb4a2}
.gm-big{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font:700 clamp(56px,11vw,120px)/1 Fredoka,system-ui,sans-serif;color:#fffaf0;-webkit-text-stroke:5px #1f2a44;paint-order:stroke fill;text-shadow:0 8px 0 #1f2a4455;white-space:nowrap;animation:gm-pop .9s cubic-bezier(.2,1.6,.4,1) forwards}
.gm-big.small{font-size:clamp(34px,6vw,64px);-webkit-text-stroke:4px #1f2a44}
@keyframes gm-pop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}25%{transform:translate(-50%,-50%) scale(1.08);opacity:1}70%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-62%) scale(.96);opacity:0}}
.gm-toast{position:absolute;left:50%;top:calc(84px + env(safe-area-inset-top,0px));transform:translateX(-50%);background:#fffaf0;border:3px solid #1f2a44;border-radius:999px;padding:6px 14px;font:700 14px/1.2 Fredoka,system-ui,sans-serif;box-shadow:0 4px 0 #0000002a;animation:gm-toast 1.8s ease forwards;white-space:nowrap}
.gm-toast.good{background:#b8f2c9}.gm-toast.bad{background:#ffc2b4}
@keyframes gm-toast{0%{opacity:0;transform:translate(-50%,-10px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-6px)}}
.gm-conf{position:absolute;top:-20px;width:10px;height:16px;border-radius:3px;animation:gm-fall linear forwards}
@keyframes gm-fall{to{transform:translate(var(--dx),110vh) rotate(var(--r))}}
.gm-screen{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100% - 24px));background:#fffaf0;border:3px solid #1f2a44;border-radius:30px;box-shadow:0 8px 0 #0000002a,0 24px 60px #3b2a4a33;padding:12px;box-sizing:border-box}
.gm-screen canvas{display:block;width:100%;height:auto;border-radius:20px;touch-action:none;cursor:crosshair}
.gm-screenbar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:2px 6px 10px;font:700 18px/1 Fredoka,system-ui,sans-serif}
.gm-screenbar .x{appearance:none;border:3px solid #1f2a44;background:#fffaf0;border-radius:12px;width:34px;height:34px;font:700 16px/1 Fredoka,system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 0 #1f2a44}
.gm-hint{position:absolute;left:50%;bottom:calc(58px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#fffaf0dd;border-radius:999px;padding:7px 14px;font:500 12px/1.4 Fredoka,system-ui,sans-serif;white-space:nowrap}
@media (pointer:coarse){.gm-hint{display:none}}
/* phones: the top corners hold the island's buttons and minimap, so the strip drops below them */
@media (max-width:600px){.gm-hud{top:calc(172px + env(safe-area-inset-top,0px))}.gm-toast{top:calc(240px + env(safe-area-inset-top,0px))}.gm-chip b{font-size:18px}.gm-chip{padding:5px 8px;min-width:52px}.gm-chip.main{min-width:92px}.gm-title{font-size:25px}}
@media (prefers-reduced-motion:reduce){.gm-card,.gm-hud{transition:none}.gm-big{animation-duration:.01s}}
`;

function injectCss(){
  if(document.getElementById('games-css')) return;
  const s = document.createElement('style'); s.id = 'games-css'; s.textContent = CSS; document.head.append(s);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

export const fmtTime = s => { if(!isFinite(s)) return '-:--.--'; const m = Math.floor(s/60), r = s - m*60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`; };

export const best = {
  get(id){ try { return JSON.parse(localStorage.getItem('island.games.' + id)); } catch { return null; } },
  set(id, v){ try { localStorage.setItem('island.games.' + id, JSON.stringify(v)); } catch {} },
};

// A small deterministic random stream, so games never touch the island's seeded ctx.helpers.rng.
export function prng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Clearance from (x, z) to the nearest island collider, in metres.
export function clearance(ctx, x, z){
  let m = 1e9;
  for(const c of ctx.colliders){
    let d;
    if(c.kind === 'circle') d = Math.hypot(x - c.x, z - c.z) - c.r;
    else { const dx = x - c.x, dz = z - c.z, ca = Math.cos(c.ang), sa = Math.sin(c.ang); const lx = Math.abs(dx*ca - dz*sa) - c.hw, lz = Math.abs(dx*sa + dz*ca) - c.hd; d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0); }
    if(d < m) m = d;
  }
  return m;
}

// kit(ctx, api): one per running game. destroy() removes everything it made.
export function kit(ctx, api){
  injectCss();
  const el = document.createElement('div'); el.className = 'gm'; el.dataset.game = api.id;
  api.root.append(el);
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

  /* Key capture. While a handler is set, every keydown goes to the game and never reaches the car. */
  let handler = null;
  const onKey = e => {
    if(!handler) return;
    const code = codeOf(e); const down = e.type === 'keydown';
    if(down){ e.stopPropagation(); if(/^(Space|Enter|Arrow|Escape|Tab)/.test(code)) e.preventDefault(); }
    try { handler(code, down, e.repeat); } catch(err){ console.error('[games] key handler threw', err); }
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  function capture(fn){ handler = fn; if(fn) ctx.input.clear(); }

  /* Veil and card */
  const veil = document.createElement('div'); veil.className = 'gm-veil'; el.append(veil);
  let cardEl = null, keepVeil = false;
  function dim(on){ keepVeil = on; veil.classList.toggle('show', on || !!cardEl); }
  function closeCard(){ if(!cardEl) return; const c = cardEl; cardEl = null; c.classList.remove('show'); veil.classList.toggle('show', keepVeil); later(() => c.remove(), 260); capture(null); }
  // card({ icon (trusted svg), badge, color, eyebrow, title, body, stats:[[label, value, hot?]], keys, primary:[label, fn], secondary:[label, fn] })
  function card(o){
    closeCard();
    const c = document.createElement('div'); c.className = 'gm-card on'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', o.title);
    c.innerHTML = `${o.icon || o.badge ? `<div class="gm-badge" style="background:${o.color || '#3b4f9e'}">${o.icon || esc(o.badge)}</div>` : ''}
      ${o.eyebrow ? `<div class="gm-eyebrow">${esc(o.eyebrow)}</div>` : ''}<div class="gm-title">${esc(o.title)}</div>
      ${o.body ? `<p class="gm-body">${o.body}</p>` : ''}
      ${o.stats?.length ? `<div class="gm-stats">${o.stats.map(([l, v, hot]) => `<div class="gm-stat${hot ? ' hot' : ''}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
      ${o.keys ? `<div class="gm-keys">${o.keys}</div>` : ''}<div class="gm-row"></div>`;
    const row = c.querySelector('.gm-row');
    const mk = (spec, primary, key) => { if(!spec) return null; const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-btn' + (primary ? ' primary' : ''); b.innerHTML = `${esc(spec[0])} <kbd>${key}</kbd>`; b.onclick = () => { closeCard(); spec[1](); }; row.append(b); return b; };
    const p = mk(o.primary, true, 'Enter'), s = mk(o.secondary, false, 'Esc');
    el.append(c); cardEl = c; veil.classList.add('show');
    requestAnimationFrame(() => c.classList.add('show'));
    let armed = false; later(() => { armed = true; }, 250);   // a key held from driving should not skip the card
    capture((code, down) => {
      if(!down || !armed) return;
      if((code === 'Enter' || code === 'Space' || code === 'KeyE') && p) p.click();
      else if(code === 'Escape' && s) s.click();
    });
    return c;
  }

  /* HUD strip: chips(spec) where spec = [[key, label, main?]]; set(key, value, cls?) */
  const hudEl = document.createElement('div'); hudEl.className = 'gm-hud'; el.append(hudEl);
  const chipMap = {};
  const hud = {
    chips(spec){ hudEl.innerHTML = ''; for(const k in chipMap) delete chipMap[k];
      for(const [key, label, main] of spec){ const c = document.createElement('div'); c.className = 'gm-chip' + (main ? ' main' : ''); c.innerHTML = `<b>-</b><span>${esc(label)}</span>`; hudEl.append(c); chipMap[key] = { c, b:c.firstChild, main }; } },
    set(key, v, cls){ const ch = chipMap[key]; if(!ch) return; const s = String(v); if(ch.b.textContent !== s) ch.b.textContent = s; const want = 'gm-chip' + (ch.main ? ' main' : '') + (cls ? ' ' + cls : ''); if(ch.c.className !== want) ch.c.className = want; },
    show(on){ hudEl.classList.toggle('show', on); },
  };

  function big(text, small){ const b = document.createElement('div'); b.className = 'gm-big' + (small ? ' small' : ''); b.textContent = text; el.append(b); later(() => b.remove(), 950); }
  function toast(text, kind){ el.querySelectorAll('.gm-toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'gm-toast' + (kind ? ' ' + kind : ''); t.textContent = text; el.append(t); later(() => t.remove(), 1850); }
  function hint(html){ let h = el.querySelector('.gm-hint'); if(!html){ h?.remove(); return; } if(!h){ h = document.createElement('div'); h.className = 'gm-hint'; el.append(h); } h.innerHTML = html; }
  function confetti(n = 60){
    if(ctx.state.reduced) return;
    const cols = ['#3b4f9e','#ffd166','#ff6b6b','#06d6a0','#4cc9f0','#e98a5a','#d6689a'];
    for(let i=0;i<n;i++){ const d = document.createElement('i'); d.className = 'gm-conf'; const dur = 1.6 + Math.random()*1.4;
      d.style.cssText = `left:${Math.random()*100}%;background:${cols[i % cols.length]};animation-duration:${dur}s;animation-delay:${Math.random()*0.4}s;--dx:${(Math.random()-.5)*160}px;--r:${(Math.random()-.5)*900}deg`;
      el.append(d); later(() => d.remove(), (dur + 0.5)*1000); }
  }

  /* Jingles through the island's sound (silent when sound is off). */
  const tone = (...a) => { try { ctx.sound.tone(...a); } catch {} };
  const sfx = {
    tick(){ tone(660, 0.12, 'square', 0.05); },
    go(){ tone(990, 0.35, 'square', 0.06); tone(1320, 0.3, 'sine', 0.05); },
    good(i = 0){ tone(660 * Math.pow(1.122, i % 8), 0.14, 'triangle', 0.1, 1100 * Math.pow(1.122, i % 8)); },
    bad(){ tone(220, 0.25, 'square', 0.06, 140); },
    win(){ [523, 659, 784, 1046].forEach((f, i) => later(() => tone(f, 0.22, 'triangle', 0.1), i*110)); },
    pop(){ tone(520, 0.1, 'sine', 0.1, 900); },
  };

  function destroy(){ capture(null); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); for(const t of timers) clearTimeout(t); timers.clear(); el.remove(); }
  return { el, card, closeCard, dim, capture, hud, big, toast, hint, confetti, sfx, later, destroy, get cardOpen(){ return !!cardEl; } };
}

// Arcade screen: a framed canvas cabinet in the middle of the viewport, for the overlay games.
// Returns { box, canvas, g, W, H, setTitle, setScore(text), setTime(text), local(ev) -> [x, y] }.
// The canvas keeps a fixed logical size (W x H) and is drawn at devicePixelRatio for crisp text.
export function arcadeScreen(K, { title, W = 640, H = 400, onClose }){
  const box = document.createElement('div'); box.className = 'gm-screen on';
  box.innerHTML = `<div class="gm-screenbar"><span class="t"></span><span style="display:flex;gap:8px;align-items:center"><span class="gm-chip" style="padding:3px 10px"><b class="sc" style="font-size:18px">0</b><span>Score</span></span><span class="gm-chip main" style="padding:3px 10px;min-width:70px"><b class="tm" style="font-size:18px">-</b><span>Time</span></span><button class="x" type="button" aria-label="Close game">X</button></span></div>`;
  const canvas = document.createElement('canvas'); const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W*dpr; canvas.height = H*dpr; box.append(canvas);
  const g = canvas.getContext('2d'); g.scale(dpr, dpr);
  const t = box.querySelector('.t'), sc = box.querySelector('.sc'), tm = box.querySelector('.tm');
  box.querySelector('.x').onclick = () => onClose?.();
  K.el.append(box);
  return { box, canvas, g, W, H,
    setTitle: s => { t.textContent = s; }, setScore: s => { sc.textContent = s; }, setTime: s => { tm.textContent = s; },
    local(ev){ const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left)/r.width*W, (ev.clientY - r.top)/r.height*H]; } };
}
