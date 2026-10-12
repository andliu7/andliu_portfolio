// Touch controls and tap-to-interact.
//  - Phones (pointer: coarse): two thumbsticks (Andrew, 2026-10-11, replacing the arrow pad).
//    The left one moves: it writes an analog ctx.input.stick { x, y, on } that car.js and
//    character.js read, and also the plain ctx.input.keys (up/down/left/right past a third of the
//    way), so everything that only knows keys (the drone, games) still works. The right one looks
//    around, as a drag on the screen does (camera.js orbitPx). A row of context buttons sits above
//    the right stick (Honk while driving; Run and Jump on foot). Every finger is tracked by
//    pointerId, so both sticks and a button can be held at once.
//  - Everywhere (phone and desktop): a quick tap or click on the canvas (under 8 px of movement
//    and 350 ms) acts on what it hits, so camera drags never trigger anything:
//      driver or own car while driving -> hop out     car on foot -> get in (called over first if far)
//      islander -> talk within 6 m                     building or door -> enter within 8 m, else a
//      pickup -> pick up in reach                      "Go there / Cancel" card
//  - Phones: a round action icon floats over the player whenever F would do something (car, door,
//    talk, hop out, leave a room); tapping it fires the same F resolver as the key.
// Owned by the touch builder. Everything else is read through ctx with ?. so a missing module never throws.

export const TAP_MOVE = 8, TAP_MS = 350;       // a pointer is a tap under both, else it was a drag
export const TALK_R = 6, DOOR_R = 8;           // tap reach for talking and for walking into a building
export const CAR_R = 3.4, PICK_R = 1.6;        // character.js reach for getting in and picking up

/* ---------- pure logic (node-tested; no DOM, no three) ---------- */

// moved = the farthest the pointer got from where it went down, in CSS px; ms = how long it was down.
export function isTap(moved, ms){ return moved < TAP_MOVE && ms < TAP_MS; }

// A thumbstick: the finger's offset (dx, dy in CSS px, screen y down) from the stick's centre,
// over the throw radius R, clamped to the unit circle, with a dead zone near the centre that the
// rest of the throw is stretched over (so just past the dead zone is a crawl, not a jump).
// Returns { x, y } in screen axes (y down) with length 0..1.
export const STICK_DEAD = 0.14;
export function stickVec(dx, dy, R, dead = STICK_DEAD){
  const len = Math.hypot(dx, dy)/R;
  if(!(len > dead)) return { x:0, y:0 };
  const k = Math.min(1, (len - dead)/(1 - dead))/(len*R);
  return { x:dx*k, y:dy*k };
}

// Ray against a building footprint collider { x, z, ang, hw, hd } extruded from y = 0 to h.
// The collider is rotated by ang about y (helpers.frameOf convention), so the ray is turned into
// box-local axes first and then clipped slab by slab. Returns the distance along the ray or null.
export function rayBox(o, d, b, h = 8){
  const c = Math.cos(b.ang || 0), s = Math.sin(b.ang || 0);
  const rx = o.x - b.x, rz = o.z - b.z;
  const lo = [rx*c - rz*s, o.y, rx*s + rz*c], ld = [d.x*c - d.z*s, d.y, d.x*s + d.z*c];
  const min = [-b.hw, 0, -b.hd], max = [b.hw, h, b.hd];
  let t0 = 0, t1 = Infinity;
  for(let i = 0; i < 3; i++){
    if(Math.abs(ld[i]) < 1e-9){ if(lo[i] < min[i] || lo[i] > max[i]) return null; continue; }
    let a = (min[i] - lo[i])/ld[i], z = (max[i] - lo[i])/ld[i];
    if(a > z){ const q = a; a = z; z = q; }
    t0 = Math.max(t0, a); t1 = Math.min(t1, z);
    if(t0 > t1) return null;
  }
  return t0;
}

// Where the ray meets the plane y = gy (null if it points away). d need not be normalised.
export function rayGround(o, d, gy = 0){ if(d.y > -1e-9) return null; const t = (gy - o.y)/d.y; return t >= 0 ? t : null; }

// Closest approach of a ray (d normalised) to a point: { t, dist }.
export function rayPoint(o, d, p){
  const t = Math.max(0, (p.x - o.x)*d.x + (p.y - o.y)*d.y + (p.z - o.z)*d.z);
  return { t, dist:Math.hypot(o.x + d.x*t - p.x, o.y + d.y*t - p.y, o.z + d.z*t - p.z) };
}

// The nearest candidate along the ray wins, so an islander in front of a house gets the tap.
export function nearestTarget(cands){
  let best = null;
  for(const c of cands) if(c && Number.isFinite(c.t) && (!best || c.t < best.t)) best = c;
  return best;
}

// What a tap on a target does. s = { mode, carDist, dist (player to the target), reach (pickup in reach) }.
// Returns { act, ... }: exitCar | enterCar | callCar | talk | enter | card | pickup | bubble | none.
export function decide(target, s){
  if(!target || s.mode === 'interior') return { act:'none' };
  const drive = s.mode === 'drive';
  switch(target.kind){
    case 'player': return drive ? { act:'exitCar' } : { act:'none' };
    case 'car':    return drive ? { act:'exitCar' } : s.carDist <= CAR_R ? { act:'enterCar' } : { act:'callCar' };
    case 'npc':
      if(drive) return { act:'bubble', text:'Hop out to talk' };
      return s.dist <= TALK_R ? { act:'talk' } : { act:'bubble', text:'Walk over to talk' };
    case 'building': return s.dist <= DOOR_R ? { act:'enter', id:target.id } : { act:'card', id:target.id };
    case 'pickup':
      if(drive) return { act:'bubble', text:'Hop out to pick it up' };
      return s.reach ? { act:'pickup' } : { act:'bubble', text:'Walk over to pick it up' };
  }
  return { act:'none' };
}

// Which action icon floats over the player. Mirrors character.js interact() order: pickup (it has its
// own tappable prompt, so no icon), talk, then door against car by whichever is closer.
export function iconFor(s){
  if(s.mode === 'drive') return 'out';
  if(s.mode === 'interior') return s.nearExit ? 'door' : null;
  if(s.mode !== 'walk' || s.pickup) return null;
  if(s.talk) return 'talk';
  const door = s.doorDist <= 3.2, car = s.carDist <= CAR_R;
  if(door && (!car || s.doorDist < s.carDist)) return 'door';
  return car ? 'car' : null;
}

/* ---------- the module ---------- */

const GLYPH = {
  car:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.5v-3.2L5.6 7h12.8l2.1 5.3v3.2z" fill="currentColor"/><path d="M7 8.6h10l1.2 3.2H5.8z" fill="#5b6fd6"/><circle cx="7.3" cy="16.4" r="2.2" fill="currentColor" stroke="#5b6fd6" stroke-width="1.4"/><circle cx="16.7" cy="16.4" r="2.2" fill="currentColor" stroke="#5b6fd6" stroke-width="1.4"/></svg>',
  door: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor"/><circle cx="15" cy="12.5" r="1.3" fill="#5b6fd6"/><path d="M3 21h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-9l-5 4v-4H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z" fill="currentColor"/><circle cx="8" cy="10.5" r="1.3" fill="#5b6fd6"/><circle cx="12" cy="10.5" r="1.3" fill="#5b6fd6"/><circle cx="16" cy="10.5" r="1.3" fill="#5b6fd6"/></svg>',
  out:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M14 7.5l4.5 4.5-4.5 4.5M18.5 12H9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const MOVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l3 3.5H9zM12 21l-3-3.5h6zM3 12l3.5-3v6zM21 12l-3.5 3V9z" fill="currentColor"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
const ICON_LABEL = { car:'Get in the car', door:'Go through the door', talk:'Talk', out:'Hop out' };

const CSS = `
#touch2{position:fixed;z-index:5;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));
  display:none;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;-webkit-touch-callout:none}
@media (pointer:coarse){
  #touch2{display:flex}
  /* the key caps on the F prompts mean nothing without a keyboard */
  #char-prompt .k,#talk-prompt .k,#pet-prompt .k,#inv-prompt .k{display:none}
  #char-prompt,#talk-prompt,#pet-prompt,#inv-prompt{padding-left:12px}
}
/* the zone card clears the sticks; on a narrow phone it spans the width, so it sits above the
   right stick and its button row instead */
@media (pointer:coarse){#card{bottom:calc(150px + env(safe-area-inset-bottom,0px))}}
@media (pointer:coarse) and (max-width:600px){#card{bottom:calc(206px + env(safe-area-inset-bottom,0px))}}
#touch2 .ctxrow{display:flex;gap:8px;min-height:46px;align-items:flex-end}
/* The sticks: a soft paper ring (the throw) and a knob that follows the thumb. The left one is
   fixed bottom left, outside #touch2, so it can sit in its own corner. */
.stick{position:relative;width:124px;height:124px;border-radius:50%;background:#fffaf066;box-shadow:inset 0 0 0 3px #fffaf0,0 5px 0 #0000001f;
  pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.stick .knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:#fffaf0;box-shadow:0 4px 0 #0000002a;
  display:grid;place-items:center;color:#1f2a44;pointer-events:none;will-change:transform}
.stick .knob svg{width:26px;height:26px;opacity:.55}
.stick.on .knob{background:#5b6fd6;color:#fffaf0}
.stick.on .knob svg{opacity:.9}
#stickL{position:fixed;z-index:5;left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));display:none}
@media (pointer:coarse){#stickL{display:block}}
#touch2{right:calc(14px + env(safe-area-inset-right,0px))}
/* the drone's Up / Down / Land pad (player/drone.js) sits bottom left too: lift it over the stick */
@media (pointer:coarse){body #drone-pad{bottom:calc(152px + env(safe-area-inset-bottom,0px));left:calc(14px + env(safe-area-inset-left,0px))}}
@media (max-width:359px){.stick{width:108px;height:108px}.stick .knob{width:50px;height:50px;margin:-25px 0 0 -25px}}
#touch2 button{appearance:none;border:0;margin:0;padding:0;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer;
  color:#1f2a44;background:#fffaf0;box-shadow:0 5px 0 #0000001f;transition:transform .06s,box-shadow .06s,background .06s}
#touch2 .ctxrow button{height:46px;padding:0 16px;border-radius:999px;font:600 14px/1 Fredoka,system-ui,sans-serif;letter-spacing:.02em}
#touch2 .ctxrow button[data-k="honk"]{background:#ffd98a}
#touch2 .ctxrow button[data-k="boost"]{background:#e98a5a;color:#fffaf0}
#touch2 .ctxrow button[data-k="brake"]{background:#6fae4a;color:#fffaf0}
#touch2 button.on{transform:translateY(3px);box-shadow:0 2px 0 #0000001f;filter:brightness(.94)}
#touch2 button[hidden]{display:none}
#tap-fx{position:fixed;left:0;top:0;z-index:6;width:0;height:0;pointer-events:none}
.tap-ring{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #fffaf0;box-shadow:0 0 0 2px #1f2a4433;pointer-events:none;
  animation:tapRing .45s ease-out forwards}
.tap-ring.hit{border-color:#5b6fd6;box-shadow:0 0 0 2px #fffaf0aa}
@keyframes tapRing{from{transform:scale(.25);opacity:1}to{transform:scale(1.35);opacity:0}}
.tap-bubble{position:fixed;z-index:6;transform:translate(-50%,-100%);margin-top:-18px;padding:8px 14px;border-radius:999px;background:#1f2a44;color:#fffaf0;
  font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;box-shadow:0 4px 0 #00000026;pointer-events:none;animation:tapBub 1.6s ease forwards}
@keyframes tapBub{0%{opacity:0;transform:translate(-50%,-80%) scale(.7)}12%{opacity:1;transform:translate(-50%,-100%) scale(1)}80%{opacity:1}100%{opacity:0}}
#tap-card{position:fixed;z-index:7;width:220px;padding:14px 16px 14px;border-radius:20px;background:#fffaf0;color:#1f2a44;box-shadow:0 6px 0 #0000001f,0 14px 30px #1f2a4433;
  font:500 13px/1.35 Nunito,system-ui,sans-serif;display:grid;gap:10px;animation:tapCard .22s cubic-bezier(.3,1.5,.5,1)}
#tap-card .ey{font:600 11px/1 Fredoka,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4b5675;display:flex;gap:7px;align-items:center}
#tap-card .ey i{width:10px;height:10px;border-radius:3px;display:inline-block}
#tap-card h3{margin:0;font:700 18px/1.15 Fredoka,system-ui,sans-serif}
#tap-card .row{display:flex;gap:8px}
#tap-card button{appearance:none;border:0;flex:1;padding:11px 12px;border-radius:999px;font:600 14px/1 Fredoka,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;
  background:#f1e9d8;color:#1f2a44;box-shadow:0 4px 0 #0000001f}
#tap-card button.go{background:#1f2a44;color:#fffaf0}
#tap-card button:active{transform:translateY(2px);box-shadow:0 2px 0 #0000001f}
@keyframes tapCard{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
#tap-act{position:fixed;left:0;top:0;z-index:6;width:56px;height:56px;border-radius:50%;border:3px solid #fffaf0;background:#5b6fd6;color:#fffaf0;padding:10px;
  box-shadow:0 5px 0 #2c3a8f;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;display:none;
  transform:translate(-50%,calc(-100% - 46px))}
#tap-act.on{display:block;animation:tapAct .22s cubic-bezier(.3,1.6,.5,1)}
#tap-act:active{box-shadow:0 2px 0 #2c3a8f;margin-top:3px}
#tap-act svg{width:100%;height:100%;display:block}
@keyframes tapAct{from{transform:translate(-50%,calc(-100% - 46px)) scale(.5)}to{transform:translate(-50%,calc(-100% - 46px)) scale(1)}}
@media (prefers-reduced-motion:reduce){.tap-ring,.tap-bubble,#tap-card,#tap-act.on{animation-duration:.01s}}`;

export function init(ctx){
  const { THREE, state, bus, input } = ctx;
  const keys = input.keys;
  const canvas = ctx.renderer.domElement;
  const coarse = matchMedia('(pointer: coarse)');

  const style = document.createElement('style'); style.id = 'touch2-css'; style.textContent = CSS;
  document.head.appendChild(style);

  /* ---------- the pad ---------- */
  const root = document.createElement('div'); root.id = 'touch2'; root.className = 'hud';   // .hud: hidden with the rest of the HUD on the start screen
  root.innerHTML = `<div class="ctxrow">
      <button type="button" data-k="honk" aria-label="Honk">Honk</button>
      <button type="button" data-k="boost" aria-label="Run">Run</button>
      <button type="button" data-k="brake" aria-label="Jump">Jump</button>
    </div>
    <div class="stick" id="stickR" role="img" aria-label="Look around stick"><i class="knob">${EYE}</i></div>`;
  document.body.appendChild(root);
  // .hud: hidden with the rest of the HUD on the start screen
  const stickL = document.createElement('div'); stickL.id = 'stickL'; stickL.className = 'stick hud';
  stickL.setAttribute('role', 'img'); stickL.setAttribute('aria-label', 'Move stick');
  stickL.innerHTML = `<i class="knob">${MOVE}</i>`;
  document.body.appendChild(stickL);

  // held: pointerId -> key. A key stays down while any finger still holds its button.
  const held = new Map();
  const isHeld = k => { for(const v of held.values()) if(v === k) return true; return false; };
  function release(id){
    const k = held.get(id); if(k === undefined) return;
    held.delete(id);
    if(!isHeld(k)){ keys[k] = false; root.querySelector(`[data-k="${k}"]`)?.classList.remove('on'); }
  }
  function releaseAll(){ for(const id of [...held.keys()]) release(id); for(const st of sticks) st.end(); }
  for(const b of root.querySelectorAll('button[data-k]')){
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); b.classList.add('on');
      if(k === 'honk'){ input.trigger('honk'); return; }
      // capture keeps the pointerup coming to this button even if the thumb slides off it
      try { b.setPointerCapture(e.pointerId); } catch(err){}
      held.set(e.pointerId, k); keys[k] = true;
    });
    const up = e => { if(k === 'honk'){ b.classList.remove('on'); return; } release(e.pointerId); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());   // a long press must not open the menu
  }
  // The sticks. Each tracks one finger (captured, so sliding off the ring keeps it), measures from
  // the ring's centre, and moves its knob up to the ring's edge.
  const stick = input.stick;                     // the move stick's analog intent, y up (input.js)
  const look = { x:0, y:0, on:false };           // the look stick, screen axes
  const DIRS = ['up', 'down', 'left', 'right'];
  let lastMove = { x:0, y:0 };                    // screen axes, kept to re-apply after input.clear()
  function setMove(v){
    lastMove = { x:v.x, y:v.y };
    stick.x = v.x; stick.y = -v.y; stick.on = v.on;
    const t = 0.34;
    const want = { up:v.on && stick.y > t, down:v.on && stick.y < -t, left:v.on && stick.x < -t, right:v.on && stick.x > t };
    for(const k of DIRS) if(!isHeld(k)) keys[k] = want[k];
  }
  function makeStick(el, onVec){
    const knob = el.querySelector('.knob');
    let id = null, cx = 0, cy = 0, R = 1;
    const put = (dx, dy) => {
      const len = Math.hypot(dx, dy), k = len > R ? R/len : 1;
      knob.style.transform = `translate(${(dx*k).toFixed(1)}px, ${(dy*k).toFixed(1)}px)`;
      onVec({ ...stickVec(dx, dy, R), on:true });
    };
    const end = () => {
      if(id === null) return;
      id = null; el.classList.remove('on'); knob.style.transform = '';
      onVec({ x:0, y:0, on:false });
    };
    el.addEventListener('pointerdown', e => {
      if(id !== null) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      id = e.pointerId; cx = r.left + r.width/2; cy = r.top + r.height/2; R = r.width*0.42;
      try { el.setPointerCapture(e.pointerId); } catch(err){}
      el.classList.add('on');
      put(e.clientX - cx, e.clientY - cy);
    });
    el.addEventListener('pointermove', e => { if(e.pointerId === id) put(e.clientX - cx, e.clientY - cy); });
    const up = e => { if(e.pointerId === id) end(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
    return { end, active: () => id !== null };
  }
  const sticks = [
    makeStick(stickL, setMove),
    makeStick(root.querySelector('#stickR'), v => { look.x = v.x; look.y = v.y; look.on = v.on; }),
  ];
  // Look: turn at up to about 2.3 rad/s, fed to the camera as the drag it would have been
  // (order 89, just before camera.js moves the camera at 90).
  ctx.onUpdate((dt) => {
    if(!look.on || !state.started || (!look.x && !look.y)) return;
    ctx.modules.camera?.orbitPx?.(look.x*420*dt, look.y*300*dt);
  }, 89);

  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if(document.hidden) releaseAll(); });
  // Core's setMode / enterInterior call input.clear(); a finger still on the pad keeps its key down.
  // The move stick is put back too (input.clear() zeroes it with the keys).
  ctx.onUpdate(() => {
    for(const k of held.values()) keys[k] = true;
    if(sticks[0].active()) setMove({ ...lastMove, on:true });
  }, 5);

  // Context row: Honk while driving, Run and Jump on foot (and inside rooms).
  const ctxBtn = k => root.querySelector(`.ctxrow [data-k="${k}"]`);
  let shownFor = '';
  function syncRow(){
    const m = state.mode; if(m === shownFor) return; shownFor = m;
    ctxBtn('honk').hidden = m !== 'drive';
    ctxBtn('boost').hidden = ctxBtn('brake').hidden = m === 'drive';
  }
  syncRow();

  /* ---------- tap effects: ripple, bubble, building card ---------- */
  function ripple(x, y, hit){
    const r = document.createElement('div'); r.className = 'tap-ring' + (hit ? ' hit' : '');
    r.style.left = x + 'px'; r.style.top = y + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 500);
  }
  function bubble(x, y, text){
    document.querySelectorAll('.tap-bubble').forEach(b => b.remove());
    const b = document.createElement('div'); b.className = 'tap-bubble'; b.textContent = text;
    b.style.left = Math.max(80, Math.min(innerWidth - 80, x)) + 'px'; b.style.top = Math.max(60, y) + 'px';
    document.body.appendChild(b); setTimeout(() => b.remove(), 1700);
  }
  let card = null;
  function hideCard(){ card?.remove(); card = null; }
  function showCard(x, y, id){
    hideCard();
    const z = ctx.zones.find(q => q.id === id); if(!z) return;
    card = document.createElement('div'); card.id = 'tap-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', z.name);
    card.innerHTML = `<div class="ey"><i></i><span></span></div><h3></h3><div class="row"><button type="button" class="go">Go there</button><button type="button" class="no">Cancel</button></div>`;
    card.querySelector('.ey i').style.background = z.color || '#3b4f9e';
    card.querySelector('.ey span').textContent = z.eyebrow ? z.eyebrow.split('·')[0].trim() : 'Building';
    card.querySelector('h3').textContent = z.name || z.title || id;
    card.querySelector('.go').addEventListener('click', () => { hideCard(); ctx.modes.teleport(id); canvas.focus?.({ preventScroll:true }); });
    card.querySelector('.no').addEventListener('click', () => { hideCard(); canvas.focus?.({ preventScroll:true }); });
    document.body.appendChild(card);
    const w = card.offsetWidth || 220, h = card.offsetHeight || 130;
    card.style.left = Math.round(Math.max(8, Math.min(innerWidth - w - 8, x - w/2))) + 'px';
    card.style.top = Math.round(Math.max(8, Math.min(innerHeight - h - 8, y - h - 16))) + 'px';
  }
  bus.on('action:exit', hideCard);
  bus.on('mode', hideCard);
  bus.on('teleport', hideCard);

  /* ---------- targets ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const shown = o => { for(let p = o; p; p = p.parent) if(!p.visible) return false; return true; };
  let doors = null, houses = null;
  function doorList(){
    if(doors) return doors;
    doors = [];
    for(const z of ctx.zones){ try { const d = ctx.island.doorOf(z.id); if(d) doors.push({ id:z.id, x:d.x, z:d.z }); } catch(e){ /* no door, no target */ } }
    return doors;
  }
  // Each zone's building is the biggest box collider within 16 m of the zone's centre (map.js
  // solidBox()es every house footprint). Found once, on the first tap.
  function houseList(){
    if(houses) return houses;
    houses = [];
    for(const z of ctx.zones){
      let best = null, area = 9;
      for(const c of ctx.colliders){
        if(c.kind !== 'box' || Math.hypot(c.x - z.x, c.z - z.z) > 16) continue;
        const a = c.hw*c.hd; if(a > area){ area = a; best = c; }
      }
      if(best) houses.push({ id:z.id, box:best });
    }
    return houses;
  }
  const doorDist = id => { const d = doorList().find(q => q.id === id), P = state.player; return d ? Math.hypot(P.x - d.x, P.z - d.z) : Infinity; };
  const carObj = () => ctx.modules.car?.car || null;
  const carDist = () => { const c = carObj(), P = state.player; return c ? Math.hypot(P.x - c.x, P.z - c.z) : Infinity; };
  const pickSpots = () => {
    const inv = ctx.modules.inventory;
    const list = inv?.spots?.() || window.__island?.inventory?.world?.() || [];
    return list.filter(q => !q.scene || q.scene === 'island');
  };

  // Everything the ray could mean, nearest first. Returns the winning target or null.
  function resolve(x, y){
    const r = canvas.getBoundingClientRect();
    ndc.set((x - r.left)/r.width*2 - 1, -((y - r.top)/r.height)*2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const cands = [];

    // meshes: the walker (also the seated driver), the car, the islanders
    const owners = new Map();
    const walker = ctx.modules.character?.group, car = carObj();
    if(walker) owners.set(walker, { kind:'player' });
    if(car?.group) owners.set(car.group, { kind:'car' });
    for(const c of ctx.chars || []) if(c.g) owners.set(c.g, { kind:'npc', char:c });
    const roots = [...owners.keys()].filter(g => g.parent);
    for(const h of ray.intersectObjects(roots, true)){
      if(!shown(h.object)) continue;
      let own = null;
      for(let p = h.object; p && !own; p = p.parent) own = owners.get(p) || null;   // nearest owner up the tree: the driver before his car
      if(own){ cands.push({ ...own, t:h.distance }); break; }
    }
    // buildings: the footprint box, or a ground tap within 2.5 m of a door
    for(const hs of houseList()){ const t = rayBox(o, d, hs.box, 8); if(t !== null) cands.push({ kind:'building', id:hs.id, t }); }
    const tg = rayGround(o, d, 0);
    if(tg !== null){
      const gx = o.x + d.x*tg, gz = o.z + d.z*tg;
      for(const dr of doorList()) if(Math.hypot(gx - dr.x, gz - dr.z) < 2.5) cands.push({ kind:'building', id:dr.id, t:tg });
    }
    // pickups: within a metre of the ray, at about hand height
    for(const p of pickSpots()){
      const q = rayPoint(o, d, { x:p.x, y:0.5, z:p.z });
      if(q.dist < 1) cands.push({ kind:'pickup', id:p.id, x:p.x, z:p.z, t:q.t });
    }
    return nearestTarget(cands);
  }

  /* ---------- acting on a tap ---------- */
  let pendingCar = null;     // { t } while a called car drives over; he gets in when it arrives
  bus.on('car:call', ({ ok }) => { if(!ok) pendingCar = null; });
  bus.on('mode', () => { pendingCar = null; });

  function busy(){ return !state.started || !!ctx.modules.dialog?.busy?.() || !!ctx.modules.inventory?.isOpen?.() || !!document.pointerLockElement; }

  function tapAt(x, y){
    hideCard();
    if(busy() || state.mode === 'interior'){ ripple(x, y, false); return { act:'none' }; }
    const tg = resolve(x, y), P = state.player;
    const dist = tg?.kind === 'building' ? doorDist(tg.id)
      : tg?.kind === 'npc' ? Math.hypot(tg.char.x - P.x, tg.char.z - P.z)
      : tg?.kind === 'pickup' ? Math.hypot(tg.x - P.x, tg.z - P.z) : 0;
    const inv = ctx.modules.inventory?.nearest?.();
    const out = decide(tg, { mode:state.mode, carDist:carDist(), dist, reach:!!inv && (inv.id === tg?.id || dist <= PICK_R) });
    ripple(x, y, out.act !== 'none');
    const ch = ctx.modules.character;
    switch(out.act){
      case 'exitCar': if(!(ch?.exitCar ? ch.exitCar() : ctx.modes.setMode('walk'))) out.act = 'none'; break;
      case 'enterCar': if(!ch?.enterCar?.()) out.act = 'none'; break;
      case 'callCar':
        pendingCar = { t:0 };
        input.trigger('honk');               // on foot H calls the car (car.js), which answers on bus car:call {ok}
        if(pendingCar) bubble(x, y, 'Calling the car');
        else out.act = 'none';
        break;
      case 'talk': {
        const v = ctx.modules.voices, c = tg.char;
        let ok = false;
        if(v?.talkChar) ok = v.talkChar(c);
        else if(v?.nearest?.()?.char === c) ok = v.talkNearest();
        else if(c.voice?.type && v?.talkTo) ok = v.talkTo(c.voice.type);   // nearest islander of that kind
        if(!ok) out.act = 'none';
        break;
      }
      case 'enter':
        if(state.mode === 'walk' && ch?.enterDoorById) ch.enterDoorById(out.id);   // the walk-in with the cream fade
        else ctx.modes.enterInterior(out.id);
        break;
      case 'card': showCard(x, y, out.id); break;
      case 'pickup': if(!ctx.modules.inventory?.pickupNearest?.()) out.act = 'none'; break;
      case 'bubble': bubble(x, y, out.text); break;
    }
    return { ...out, target:tg ? { kind:tg.kind, id:tg.id ?? null } : null };
  }

  // Tap versus drag on the canvas only (HUD buttons never reach here). Any second finger cancels:
  // that is a pinch, which camera.js owns.
  const downs = new Map();
  let multi = false;
  canvas.addEventListener('pointerdown', e => {
    if(e.target !== canvas || (e.pointerType === 'mouse' && e.button !== 0)) return;
    downs.set(e.pointerId, { x:e.clientX, y:e.clientY, t:performance.now(), moved:0 });
    if(downs.size > 1) multi = true;
  });
  canvas.addEventListener('pointermove', e => {
    const p = downs.get(e.pointerId); if(!p) return;
    p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.x, e.clientY - p.y));
  });
  const end = (e, cancel) => {
    const p = downs.get(e.pointerId); if(!p) return;
    downs.delete(e.pointerId);
    const wasMulti = multi; if(!downs.size) multi = false;
    if(cancel || wasMulti || e.target !== canvas) return;
    const moved = Math.max(p.moved, Math.hypot(e.clientX - p.x, e.clientY - p.y));
    if(isTap(moved, performance.now() - p.t)) tapAt(p.x, p.y);
  };
  canvas.addEventListener('pointerup', e => end(e, false));
  canvas.addEventListener('pointercancel', e => end(e, true));

  /* ---------- the floating action icon (phones only) ---------- */
  const act = document.createElement('button'); act.type = 'button'; act.id = 'tap-act';
  document.body.appendChild(act);
  let icon = null;
  act.addEventListener('pointerdown', e => e.preventDefault());   // keep focus off the button so no key ever lands on it
  act.addEventListener('click', () => { input.trigger('interact'); canvas.focus?.({ preventScroll:true }); });
  const v3 = new THREE.Vector3();
  function setIcon(k){
    if(k === icon) return;
    icon = k;
    if(!k){ act.classList.remove('on'); return; }
    act.innerHTML = GLYPH[k]; act.setAttribute('aria-label', ICON_LABEL[k]);
    act.classList.remove('on'); void act.offsetWidth; act.classList.add('on');   // reading offsetWidth restarts the pop-in animation
  }
  function iconState(){
    const m = state.mode;
    if(m === 'interior'){
      const room = state.interior, P = room?.player;
      return { mode:m, nearExit:!!(room?.exit && P && Math.hypot(P.x - room.exit.x, P.z - room.exit.z) < (room.exit.r || 1.5) + 1.4) };
    }
    let dd = Infinity; const P = state.player;
    for(const d of doorList()){ const q = Math.hypot(P.x - d.x, P.z - d.z); if(q < dd) dd = q; }
    return { mode:m, pickup:!!ctx.modules.inventory?.nearest?.(), talk:!!ctx.modules.voices?.nearest?.(), doorDist:dd, carDist:carDist() };
  }

  // Order 98: after the camera (90) moved, so the icon sits on this frame's picture.
  ctx.onUpdate((dt) => {
    syncRow();
    if(pendingCar){
      pendingCar.t += dt;
      const calling = ctx.modules.car?.calling?.();
      if(!calling && pendingCar.t > 0.2){
        if(state.mode === 'walk' && carDist() <= CAR_R) ctx.modules.character?.enterCar?.();
        pendingCar = null;
      } else if(pendingCar.t > 20) pendingCar = null;
    }
    const show = coarse.matches && state.started && !ctx.modules.dialog?.busy?.() && !ctx.modules.games?.active?.();
    const k = show ? iconFor(iconState()) : null;
    setIcon(k);
    if(!k) return;
    const cam = state.mode === 'interior' ? (state.interior?.camera || ctx.interiorCamera) : ctx.camera;
    const P = state.mode === 'interior' ? state.interior?.player : state.player;
    if(!cam || !P){ setIcon(null); return; }
    v3.set(P.x, state.mode === 'drive' ? 3.1 : 2.35, P.z).project(cam);    // the same anchor as character.js's F prompt; the icon sits just above it
    if(v3.z > 1){ act.style.visibility = 'hidden'; return; }
    act.style.visibility = '';
    act.style.left = ((v3.x*0.5 + 0.5)*innerWidth).toFixed(1) + 'px';
    act.style.top = ((-v3.y*0.5 + 0.5)*innerHeight).toFixed(1) + 'px';
  }, 98);

  const api = {
    tapAt,                                  // act as if (x, y) in CSS px was tapped; returns { act, target }
    pick: (x, y) => { const t = resolve(x, y); return t ? { kind:t.kind, id:t.id ?? null, t:+t.t.toFixed(2) } : null; },
    icon: () => icon,
    held: () => [...new Set(held.values())],
    stick: () => ({ ...stick }),
    release: releaseAll,                    // let go of every pad button and stick (games that take over the controls)
    coarse: () => coarse.matches,
  };
  ctx.expose('touch', api);
  return api;
}
