// Inventory. Owned by the round 5 inventory builder. See CONTRACT.md, ROUND 5, "Inventory".
// Small things lie around the island (shells on the beaches, a wrench, a lost stamp, a flower, a
// flask). Walk within 1.6 m and the nearest one glows with an "F pick up" prompt; F (or tapping
// the prompt) arcs it into the player. The hotbar at the bottom centre shows the first slots; the
// full bag opens with I or Tab, the Bag button, or a click on a slot.
// On the tour every building has one souvenir: at its door while the tour is on that stop, and
// inside the room at the first tour stop. Finding all 12 fills the souvenir page.
// State lives in localStorage 'island.inventory'. Never calls ctx.helpers.rng().
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const REACH = 1.6, KEY = 'island.inventory';

// Souvenirs, one per building. Names and lines come only from zones.js.
const SOUVENIRS = {
  blueberry: ['Mini molecule', 'molecule', 'Blueberry draws molecules like this with its own SVG renderer.'],
  brain:     ['Seed packet', 'seeds', 'Five tools in one app, grown in the Second Brain Greenhouse.'],
  studio:    ['Film reel', 'reel', 'Reaction frames rendered as SVG and cut into narrated explainer videos.'],
  dock:      ['Pocket guide', 'guide', 'Browser Use docs and onboarding, adopted by 200+ contributors.'],
  school:    ['Tutor\'s apple', 'apple', 'Education One: SAT students improved 100 to 300 points.'],
  umd:       ['Terrapin pin', 'terrapin', 'University of Maryland, B.S. Computer Science, expected May 2027.'],
  clinic:    ['Toothbrush', 'toothbrush', 'Pre-dental: future dentist, current builder.'],
  chapel:    ['Weekly digest', 'digest', 'Focus Family: a digest of the master calendar, every week.'],
  yard:      ['Garden trowel', 'trowel', 'Off the Clock: cooking, lifting, gardening.'],
  now:       ['Hard hat', 'hardhat', 'Now Building: what is in the ground right now.'],
  skills:    ['Bowling pin', 'pin', 'Skills Alley: knock them down.'],
  contact:   ['Envelope', 'envelope', 'Email is the fastest way to reach Andrew.'],
};
const TOUR = ['blueberry', 'brain', 'studio', 'dock', 'school', 'umd', 'clinic', 'chapel', 'yard', 'now', 'skills', 'contact'];
const DESC = {
  shell: 'Washed up on the beach. Still smells of salt.', wrench: 'Someone was fixing the car and wandered off.',
  stamp: 'A postage stamp that never made it to the Mailbox.', flower: 'Picked from the edge of the garden beds.',
  flask: 'Left outside Blueberry Lab. Probably organic chemistry.', fish: 'Caught off the island.', berry: 'A giant blueberry from the hunt.',
  floss: 'A gift from an islander.', bolt: 'A gift from an islander.', testudo: 'A gift from an islander.', page: 'A gift from an islander.',
};

// A small deterministic stream, so the scatter never touches the island's seeded rng.
function prng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Distance from (x, z) to the nearest collider in a list.
function clearance(list, x, z){
  let m = 1e9;
  for(const c of list || []){
    let d;
    if(c.kind === 'circle') d = Math.hypot(x - c.x, z - c.z) - c.r;
    else { const dx = x - c.x, dz = z - c.z, ca = Math.cos(c.ang || 0), sa = Math.sin(c.ang || 0); const lx = Math.abs(dx*ca - dz*sa) - c.hw, lz = Math.abs(dx*sa + dz*ca) - c.hd; d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0); }
    if(d < m) m = d;
  }
  return m;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* ---------- 2D icons, drawn in a 100 x 100 box with a chunky ink outline ---------- */
const INK = '#1f2a44';
function icon(g, key){
  const sh = (fill, path) => { g.beginPath(); path(); g.fillStyle = fill; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); };
  const c = (x, y, r) => () => g.arc(x, y, r, 0, Math.PI*2);
  const rr = (x, y, w, h, r) => () => g.roundRect(x, y, w, h, r);
  const line = (w, ...p) => { g.beginPath(); g.moveTo(p[0], p[1]); for(let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i+1]); g.lineWidth = w; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke(); };
  const rot = (a, fn) => { g.save(); g.translate(50, 50); g.rotate(a); g.translate(-50, -50); fn(); g.restore(); };
  const D = {
    shell(){ sh('#ffc9b5', () => { g.moveTo(50, 84); g.lineTo(18, 46); g.arc(50, 50, 33, Math.PI*1.1, Math.PI*1.9); g.closePath(); }); for(const x of [34, 50, 66]) line(3, 50, 80, x, 24 + Math.abs(x - 50)*0.3); sh('#ffa98f', rr(38, 76, 24, 12, 5)); },
    wrench(){ rot(-0.8, () => { sh('#b7c0d4', rr(44, 34, 12, 58, 6)); sh('#b7c0d4', c(50, 26, 16)); g.fillStyle = '#fffaf0'; g.fillRect(44, 6, 12, 18); line(5, 44, 10, 44, 24, 56, 24, 56, 10); }); },
    stamp(){ sh('#fffaf0', rr(22, 16, 56, 68, 4)); for(let i = 0; i < 6; i++){ g.fillStyle = '#e6dcc8'; for(const [x, y] of [[26 + i*9.6, 16], [26 + i*9.6, 84]]){ g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } } sh('#d9534f', rr(31, 26, 38, 40, 4)); sh('#3b4f9e', c(50, 44, 9)); g.fillStyle = INK; g.font = '700 11px Fredoka,sans-serif'; g.textAlign = 'center'; g.fillText('25', 50, 78); },
    flower(){ line(6, 50, 54, 50, 92); sh('#6fae4a', () => g.ellipse(62, 76, 12, 6, -0.5, 0, 7)); for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2 - Math.PI/2; sh('#f59ab8', c(50 + Math.cos(a)*17, 38 + Math.sin(a)*17, 12)); } sh('#ffd166', c(50, 38, 11)); },
    flask(){ sh('#d8f1f7', () => { g.moveTo(42, 12); g.lineTo(58, 12); g.lineTo(58, 38); g.lineTo(80, 84); g.quadraticCurveTo(82, 90, 74, 90); g.lineTo(26, 90); g.quadraticCurveTo(18, 90, 20, 84); g.lineTo(42, 38); g.closePath(); });
      g.save(); g.clip(); g.fillStyle = '#8a5cc2'; g.fillRect(0, 60, 100, 40); g.restore(); line(5, 42, 38, 20, 84); line(5, 58, 38, 80, 84); sh('#fffaf0', c(44, 74, 4)); sh('#fffaf0', c(58, 80, 3)); },
    molecule(){ line(7, 28, 66, 50, 42, 76, 62); line(7, 50, 42, 50, 16); sh('#3d4660', c(50, 42, 15)); sh('#ff6b6b', c(26, 68, 13)); sh('#fffaf0', c(76, 64, 11)); sh('#5b6fd6', c(50, 16, 10)); },
    seeds(){ sh('#f59ab8', rr(24, 30, 52, 62, 6)); sh('#fffaf0', rr(30, 56, 40, 22, 4)); for(const x of [40, 50, 60]) sh('#8a5a3c', c(x, 67, 3)); line(5, 50, 30, 50, 14); sh('#6fae4a', () => g.ellipse(40, 14, 11, 6, 0.4, 0, 7)); sh('#6fae4a', () => g.ellipse(60, 12, 11, 6, -0.4, 0, 7)); },
    reel(){ sh('#3d4660', c(50, 50, 36)); for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2; sh('#fffaf0', c(50 + Math.cos(a)*20, 50 + Math.sin(a)*20, 8)); } sh('#ffd166', c(50, 50, 7)); },
    guide(){ sh('#fffaf0', rr(30, 16, 50, 70, 6)); sh('#2f9e8f', rr(22, 12, 50, 72, 6)); sh('#fffaf0', rr(32, 24, 30, 10, 3)); for(const y of [46, 56, 66]) line(4, 32, y, 62, y); },
    apple(){ line(5, 50, 30, 54, 12); sh('#6fae4a', () => g.ellipse(66, 18, 12, 6, -0.5, 0, 7)); sh('#e5484d', () => { g.moveTo(50, 32); g.bezierCurveTo(20, 16, 8, 60, 34, 86); g.quadraticCurveTo(50, 94, 66, 86); g.bezierCurveTo(92, 60, 80, 16, 50, 32); }); sh('#ffffff88', () => g.ellipse(34, 50, 5, 9, 0.3, 0, 7)); },
    terrapin(){ sh('#c8102e', c(50, 50, 38)); sh('#ffd166', c(50, 50, 29)); sh('#8fbf6a', c(50, 26, 7)); sh('#4f7a34', () => g.ellipse(50, 56, 20, 16, 0, 0, 7)); line(3, 38, 56, 62, 56); line(3, 50, 42, 50, 70); },
    toothbrush(){ rot(-0.7, () => { sh('#4fa3c7', rr(44, 34, 12, 60, 6)); sh('#fffaf0', rr(40, 8, 20, 30, 5)); for(const y of [14, 22, 30]) line(3, 40, y, 32, y); }); },
    digest(){ sh('#fffaf0', rr(18, 22, 64, 66, 8)); sh('#c9a24a', () => g.roundRect(18, 22, 64, 20, [8, 8, 0, 0])); for(const x of [34, 66]) line(6, x, 14, x, 28); for(let r = 0; r < 3; r++) for(let k = 0; k < 4; k++) sh(r === 1 && k === 2 ? '#c9a24a' : '#e6dcc8', rr(26 + k*13, 50 + r*11, 8, 7, 2)); },
    trowel(){ rot(0.7, () => { sh('#8a5a3c', rr(44, 60, 12, 32, 6)); line(5, 50, 50, 50, 62); sh('#b7c0d4', () => { g.moveTo(50, 6); g.quadraticCurveTo(72, 30, 50, 54); g.quadraticCurveTo(28, 30, 50, 6); }); }); },
    hardhat(){ sh('#f2b705', () => { g.moveTo(16, 70); g.arc(50, 70, 32, Math.PI, 0); g.closePath(); }); sh('#f2b705', rr(8, 66, 84, 12, 6)); sh('#ffd166', rr(44, 36, 12, 32, 5)); },
    pin(){ sh('#fffaf0', () => { g.moveTo(50, 8); g.bezierCurveTo(64, 8, 64, 30, 58, 40); g.bezierCurveTo(74, 56, 70, 84, 62, 92); g.lineTo(38, 92); g.bezierCurveTo(30, 84, 26, 56, 42, 40); g.bezierCurveTo(36, 30, 36, 8, 50, 8); }); g.fillStyle = '#e5484d'; g.fillRect(40, 30, 20, 4); g.fillRect(40, 37, 20, 4); },
    envelope(){ sh('#fffaf0', rr(12, 26, 76, 52, 6)); line(5, 14, 30, 50, 58, 86, 30); sh('#d9534f', c(50, 58, 8)); },
    fish(){ sh('#ff9f5a', () => { g.moveTo(74, 50); g.lineTo(92, 32); g.lineTo(92, 68); g.closePath(); }); sh('#ffb86b', () => g.ellipse(46, 50, 32, 20, 0, 0, 7)); sh(INK, c(30, 46, 4)); line(4, 54, 36, 54, 64); },
    berry(){ sh('#3b4f9e', c(50, 54, 34)); sh('#2c3a8f', () => { for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2 - Math.PI/2; g.lineTo(50 + Math.cos(a)*12, 28 + Math.sin(a)*12); g.lineTo(50 + Math.cos(a + 0.63)*5, 28 + Math.sin(a + 0.63)*5); } g.closePath(); }); sh('#ffffff66', () => g.ellipse(34, 44, 6, 10, 0.5, 0, 7)); },
    // NPC gifts (voices.js)
    floss(){ sh('#fffaf0', rr(18, 42, 46, 44, 10)); sh('#7fd6c2', () => g.roundRect(18, 42, 46, 14, [10, 10, 0, 0])); g.beginPath(); g.moveTo(56, 46); g.bezierCurveTo(78, 20, 94, 44, 78, 62); g.bezierCurveTo(68, 74, 84, 86, 90, 80);
      g.lineCap = 'round'; g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#7fd6c2'; g.stroke(); },
    bolt(){ rot(-0.6, () => { sh('#b7c0d4', rr(42, 34, 16, 58, 4)); for(const y of [46, 56, 66, 76]) line(3, 42, y, 58, y + 4); sh('#9aa3b8', () => { for(let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; g.lineTo(50 + Math.cos(a)*22, 26 + Math.sin(a)*15); } g.closePath(); }); }); },
    testudo(){ sh('#6f7d2e', () => { g.moveTo(12, 72); g.bezierCurveTo(14, 16, 86, 16, 88, 72); g.closePath(); }); sh('#e3c77a', rr(8, 66, 84, 12, 6)); for(const [x, y] of [[32, 54], [50, 38], [68, 54], [50, 58]]) sh('#58651f', () => g.ellipse(x, y, 9, 6, 0, 0, 7)); },
    page(){ sh('#fffaf0', () => { g.moveTo(24, 12); g.lineTo(64, 12); g.lineTo(78, 26); g.lineTo(78, 88); g.lineTo(24, 88); g.closePath(); }); sh('#e6dcc8', () => { g.moveTo(64, 12); g.lineTo(64, 26); g.lineTo(78, 26); g.closePath(); }); for(const y of [38, 48, 58]) line(4, 32, y, 70, y); sh('#c9a24a', c(36, 74, 6)); },
    gift(){ sh('#e98a5a', rr(18, 38, 64, 50, 6)); sh('#ffd166', rr(44, 38, 12, 50, 2)); sh('#ffd166', () => g.ellipse(38, 30, 12, 8, 0.4, 0, 7)); sh('#ffd166', () => g.ellipse(62, 30, 12, 8, -0.4, 0, 7)); },
  };
  (D[key] || D.gift)();
}
function iconCanvas(key, px, silhouette){
  const cv = document.createElement('canvas'); cv.width = cv.height = px; const g = cv.getContext('2d');
  g.scale(px/100, px/100); icon(g, key);
  if(silhouette){ g.globalCompositeOperation = 'source-in'; g.fillStyle = '#cdbfa6'; g.fillRect(0, 0, 100, 100); }
  return cv;
}

// The hotbar. Where it sits (layoutBar() below does the measuring):
// - Bottom centre, as asked. On a desktop the controls hint is a centred pill at the very bottom,
//   so the bar sits 8 px above the hint rather than beside it: the hint text changes per mode and
//   can be wide, and stacking never collides however long it gets.
// - On touch screens the hint is hidden and the touch pad owns the bottom right, so the bar drops
//   to the bottom edge and keeps left of the pad, showing fewer slots if a phone is narrow.
// - The zone card owns the bottom left: when it is up the bar slides right to clear it, and if
//   there is no room it hides until the card goes.
// - While the talk box is open the bar hides (see dialog.js for why).
const CSS = `
#hotbar{left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:6px;padding:6px;background:#fffaf0e0;border-radius:22px;box-shadow:0 4px 0 #0000001f;
  transform:translateX(-50%);transition:opacity .2s ease,transform .25s cubic-bezier(.3,1.4,.5,1)}
#hotbar.off{opacity:0;transform:translate(-50%,18px)}
#hotbar.off,#hotbar.off *{pointer-events:none}
#hotbar .slots{display:flex;gap:6px}
#hotbar .hs{appearance:none;position:relative;flex:none;width:48px;height:48px;border:0;border-radius:14px;background:#f1e9d8;box-shadow:inset 0 2px 0 #0000000f;padding:6px;cursor:pointer;touch-action:manipulation;color:#1f2a44}
#hotbar .hs canvas{width:100%;height:100%;display:block}
#hotbar .hs.empty{background:#efe7d6;box-shadow:inset 0 0 0 2px #e6dcc8;cursor:default}
#hotbar .hs .n{position:absolute;right:-5px;bottom:-5px;background:var(--berry);color:#fff;border:2px solid #fffaf0;border-radius:999px;font:700 11px/1 Fredoka,system-ui,sans-serif;padding:3px 6px}
#hotbar .hs .more{font:700 15px/1 Fredoka,system-ui,sans-serif}
#hotbar .hs:hover:not(.empty){transform:translateY(-2px)}
#hotbar .hs:focus-visible{outline:3px solid var(--berry-2);outline-offset:2px}
#hotbar .bag{width:auto;display:flex;align-items:center;gap:6px;padding:0 12px;background:var(--ink);color:var(--paper);font:600 13px/1 Fredoka,system-ui,sans-serif;box-shadow:0 3px 0 #0000002a}
#hotbar .bag svg{width:20px;height:20px;flex:none}
#hotbar .bag b{font:700 12px/1 Fredoka,system-ui,sans-serif;background:var(--berry);color:#fff;border-radius:999px;min-width:20px;padding:3px 6px;text-align:center}
#hotbar .bump{animation:inv-bump .45s cubic-bezier(.2,1.8,.4,1)}
@keyframes inv-bump{30%{transform:scale(1.18) rotate(-4deg)}}
@media (pointer:coarse){#hotbar .hs{width:44px;height:44px}#hotbar .bag span{display:none}}
#inv-prompt{position:fixed;left:0;top:0;z-index:6;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:0;border-radius:999px;background:#1f2a44;color:#fffaf0;
  font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap;box-shadow:0 4px 0 #00000026;cursor:pointer;touch-action:manipulation;
  opacity:0;pointer-events:none;transform:translate(-50%,-100%) scale(.6);transition:opacity .16s ease,transform .22s cubic-bezier(.3,1.6,.5,1)}
#inv-prompt.on{opacity:1;pointer-events:auto;transform:translate(-50%,-100%) scale(1)}
#inv-prompt .k{width:22px;height:22px;display:grid;place-items:center;position:relative;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
#inv-prompt .k::before{content:"";position:absolute;inset:2px;background:#ffd166;border-radius:4px;transform:rotate(45deg)}
#inv-prompt .k b{position:relative}
.inv-toast{position:fixed;left:50%;top:calc(70px + env(safe-area-inset-top,0px));z-index:7;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#fffaf0;border:3px solid #1f2a44;border-radius:999px;
  padding:4px 14px 4px 6px;font:700 14px/1.2 Fredoka,system-ui,sans-serif;color:#1f2a44;box-shadow:0 4px 0 #0000002a;animation:inv-toast 1.9s ease forwards;white-space:nowrap;pointer-events:none}
.inv-toast canvas{width:30px;height:30px}
.inv-toast.gold{background:#ffd166}
@keyframes inv-toast{0%{opacity:0;transform:translate(-50%,-10px) scale(.8)}12%{opacity:1;transform:translate(-50%,0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-6px)}}
.inv-conf{position:fixed;top:-20px;z-index:9;width:10px;height:16px;border-radius:3px;pointer-events:none;animation:inv-fall linear forwards}
@keyframes inv-fall{to{transform:translate(var(--dx),110vh) rotate(var(--r))}}
#inv{position:fixed;inset:0;z-index:9;display:grid;place-items:center;padding:16px;background:rgba(38,32,70,.3);opacity:0;transition:opacity .2s ease;font:500 15px/1.4 Nunito,system-ui,sans-serif;color:#1f2a44}
#inv.on{opacity:1}
#inv .box{width:min(620px,100%);max-height:calc(100dvh - 32px);display:grid;grid-template-rows:auto auto 1fr auto;background:#fffaf0;border:3px solid #1f2a44;border-radius:28px;
  box-shadow:0 8px 0 #0000002a,0 30px 60px -20px #1f2a4466;overflow:hidden;transform:translateY(18px) scale(.96);transition:transform .3s cubic-bezier(.2,1.5,.4,1)}
#inv.on .box{transform:none}
#inv .bar{display:flex;align-items:center;gap:10px;padding:14px 14px 8px 18px}
#inv h2{font:700 22px/1 Fredoka,system-ui,sans-serif;margin:0;flex:1;display:flex;gap:10px;align-items:center}
#inv h2 svg{width:26px;height:26px}
#inv .x{appearance:none;border:3px solid #1f2a44;cursor:pointer;width:40px;height:40px;border-radius:14px;background:#e98a5a;color:#fff;font:700 18px/1 Fredoka,system-ui,sans-serif;box-shadow:0 3px 0 #1f2a44;touch-action:manipulation}
#inv .tabs{display:flex;gap:8px;padding:0 18px 10px;flex-wrap:wrap}
#inv .tab{appearance:none;border:0;cursor:pointer;background:#f1e9d8;color:#1f2a44;font:600 14px/1 Fredoka,system-ui,sans-serif;padding:10px 14px;border-radius:14px;box-shadow:0 3px 0 #0000001a;touch-action:manipulation}
#inv .tab[aria-selected=true]{background:#1f2a44;color:#fffaf0}
#inv .tab kbd,#inv .keys kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:#1f2a4422;border-radius:5px;padding:2px 5px;margin-left:4px}
#inv .tab[aria-selected=true] kbd{background:#fffaf033}
#inv .body{overflow:auto;padding:4px 18px 12px;min-height:0}
#inv .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:10px}
#inv .slot{appearance:none;position:relative;aspect-ratio:1;border:3px solid #1f2a44;border-radius:20px;background:#f4ecdc;box-shadow:0 4px 0 #0000002a;cursor:pointer;padding:8px;touch-action:manipulation;transition:transform .12s}
#inv .slot canvas{width:100%;height:100%;display:block}
#inv .slot.empty{border:3px dashed #d8ccb4;background:transparent;box-shadow:none;cursor:default}
#inv .slot.sel{background:#ffd166;transform:translateY(-3px);box-shadow:0 7px 0 #1f2a44}
#inv .slot:focus-visible{outline:3px solid #5b6fd6;outline-offset:3px}
#inv .slot .n{position:absolute;right:-6px;bottom:-6px;background:#3b4f9e;color:#fff;border:3px solid #1f2a44;border-radius:999px;font:700 12px/1 Fredoka,system-ui,sans-serif;padding:3px 7px}
#inv .slot.miss{background:#efe7d6;border-color:#cdbfa6}
#inv .slot.miss .q{position:absolute;inset:0;display:grid;place-items:center;font:700 26px/1 Fredoka,system-ui,sans-serif;color:#fffaf0;text-shadow:0 2px 0 #b3a58b}
#inv .info{display:flex;gap:14px;align-items:center;padding:12px 18px 16px;border-top:3px dashed #e6dcc8;min-height:64px}
#inv .info canvas{width:56px;height:56px;flex:none}
#inv .info .t{flex:1;min-width:0}
#inv .info b{display:block;font:700 18px/1.2 Fredoka,system-ui,sans-serif}
#inv .info span{display:block;color:#4b5675;font-size:14px}
#inv .drop{appearance:none;border:3px solid #1f2a44;background:#fffaf0;color:#1f2a44;font:700 15px/1 Fredoka,system-ui,sans-serif;padding:11px 16px;border-radius:999px;box-shadow:0 4px 0 #1f2a44;cursor:pointer;flex:none;touch-action:manipulation}
#inv .drop:active{transform:translateY(3px);box-shadow:0 1px 0 #1f2a44}
#inv .drop[disabled]{opacity:.4;cursor:default}
#inv .drop kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:#1f2a44;color:#fffaf0;border-radius:5px;padding:2px 5px;margin-left:4px}
#inv .meter{height:14px;border-radius:999px;background:#efe7d6;border:3px solid #1f2a44;overflow:hidden;margin:0 0 12px}
#inv .meter i{display:block;height:100%;background:linear-gradient(90deg,#ffd166,#e98a5a)}
#inv .keys{font:500 12px/1.6 Fredoka,system-ui,sans-serif;color:#4b5675;padding:0 18px 12px}
@media (pointer:coarse){#inv .keys,#inv .tab kbd,#inv .drop kbd{display:none}}
@media (max-width:600px){#inv{padding:10px;align-items:end}#inv .box{border-radius:24px}#inv .grid{grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}#inv .slot{border-radius:16px;padding:6px}#inv h2{font-size:19px}}
@media (prefers-reduced-motion:reduce){#inv,#inv .box,#inv-prompt,#hotbar{transition:none}.inv-toast{animation-duration:.01s}#hotbar .bump{animation:none}}
`;
const BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>';

export function init(ctx){
  const { THREE, state, bus, scene } = ctx;

  /* ---------- saved state ---------- */
  const S = { items:[], picked:[], found:[], drops:[], done:false };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const found = new Set(S.found), picked = new Set(S.picked);
  const total = () => S.items.reduce((n, it) => n + it.count, 0);
  const changed = () => { S.found = [...found]; S.picked = [...picked]; save(); paintBar(); if(open) render(); bus.emit('inventory', { items: api.items() }); };

  /* ---------- 3D models: primitives merged into one vertex-coloured mesh each (one draw call) ---------- */
  const mat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.6 });
  const tmpM = new THREE.Matrix4(), tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function P(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx){
    const g = geo.index ? geo.toNonIndexed() : geo; geo.dispose?.();
    g.applyMatrix4(tmpM.compose(tmpV.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), tmpS.set(sx, sy, sz)));
    const col = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n*3);
    for(let i = 0; i < n; i++){ a[i*3] = col.r; a[i*3+1] = col.g; a[i*3+2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (r1, r2, h, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s);
  const O = (r, s = 12) => new THREE.SphereGeometry(r, s, Math.max(6, s*0.7|0)), T = (r, t) => new THREE.TorusGeometry(r, t, 8, 18);
  const H = Math.PI/2;
  const PARTS = {
    wrench: () => [P(B(0.1, 0.06, 0.6), '#b7c0d4', 0, 0.04, 0), P(T(0.11, 0.045), '#b7c0d4', 0, 0.05, 0.34, H), P(T(0.08, 0.04), '#9aa3b8', 0, 0.05, -0.34, H)],
    stamp: () => [P(B(0.42, 0.03, 0.52), '#fffaf0', 0, 0.02, 0), P(B(0.3, 0.04, 0.36), '#d9534f', 0, 0.03, -0.02), P(O(0.07, 10), '#3b4f9e', 0, 0.06, -0.02, 0, 0, 0, 1, 0.4, 1)],
    flower: () => [P(C(0.025, 0.03, 0.5, 6), '#4f7a34', 0, 0.25, 0), P(O(0.09), '#6fae4a', 0.08, 0.16, 0, 0, 0, 0.6, 1, 0.4, 0.6),
      ...[0, 1, 2, 3, 4].map(i => P(O(0.08), '#f59ab8', Math.cos(i*1.2566)*0.1, 0.52, Math.sin(i*1.2566)*0.1, 0, 0, 0, 1, 0.6, 1)), P(O(0.07), '#ffd166', 0, 0.55, 0)],
    flask: () => [P(C(0.07, 0.24, 0.3, 14), '#d8f1f7', 0, 0.2, 0), P(C(0.06, 0.07, 0.16, 12), '#d8f1f7', 0, 0.42, 0), P(C(0.16, 0.245, 0.12, 14), '#8a5cc2', 0, 0.1, 0), P(C(0.075, 0.075, 0.04, 12), '#fffaf0', 0, 0.51, 0)],
    molecule: () => [P(O(0.14), '#3d4660', 0, 0, 0), P(O(0.11), '#ff6b6b', 0.26, -0.1, 0), P(O(0.09), '#fffaf0', -0.22, -0.12, 0.08), P(O(0.09), '#5b6fd6', 0, 0.26, 0),
      P(C(0.03, 0.03, 0.26, 6), '#fffaf0', 0.13, -0.05, 0, 0, 0, H + 0.36), P(C(0.03, 0.03, 0.24, 6), '#fffaf0', -0.11, -0.06, 0.04, 0, 0, -H + 0.5), P(C(0.03, 0.03, 0.2, 6), '#fffaf0', 0, 0.14, 0)],
    seeds: () => [P(B(0.36, 0.46, 0.05), '#f59ab8', 0, 0, 0), P(B(0.28, 0.16, 0.06), '#fffaf0', 0, -0.08, 0), P(C(0.015, 0.015, 0.14, 5), '#4f7a34', 0, 0.3, 0), P(O(0.06), '#6fae4a', -0.05, 0.36, 0, 0, 0, 0.5, 1, 0.5, 0.6), P(O(0.06), '#6fae4a', 0.05, 0.37, 0, 0, 0, -0.5, 1, 0.5, 0.6)],
    reel: () => [P(C(0.26, 0.26, 0.06, 18), '#3d4660', 0, 0, 0, H), P(C(0.07, 0.07, 0.1, 10), '#ffd166', 0, 0, 0, H), ...[0, 1, 2, 3, 4].map(i => P(C(0.05, 0.05, 0.08, 8), '#fffaf0', Math.cos(i*1.2566)*0.15, Math.sin(i*1.2566)*0.15, 0, H)), P(B(0.5, 0.12, 0.01), '#1f2a44', 0.28, -0.2, 0.05, 0, 0, 0.3)],
    guide: () => [P(B(0.34, 0.46, 0.07), '#2f9e8f', 0, 0, 0), P(B(0.3, 0.42, 0.06), '#fffaf0', 0.03, 0, -0.03), P(B(0.2, 0.07, 0.02), '#fffaf0', 0, 0.12, 0.04)],
    apple: () => [P(O(0.2, 14), '#e5484d', 0, 0, 0, 0, 0, 0, 1, 0.9, 1), P(C(0.02, 0.02, 0.12, 5), '#8a5a3c', 0, 0.22, 0), P(O(0.06), '#6fae4a', 0.07, 0.24, 0, 0, 0, -0.6, 1.3, 0.35, 0.7)],
    terrapin: () => [P(C(0.24, 0.24, 0.05, 20), '#c8102e', 0, 0, 0, H), P(C(0.18, 0.18, 0.06, 20), '#ffd166', 0, 0, 0.01, H), P(O(0.11), '#4f7a34', 0, -0.02, 0.04, 0, 0, 0, 1, 0.85, 0.5), P(O(0.045), '#8fbf6a', 0, 0.12, 0.04)],
    toothbrush: () => [P(B(0.07, 0.5, 0.05), '#4fa3c7', 0, 0, 0), P(B(0.09, 0.14, 0.06), '#fffaf0', 0, 0.3, 0), P(B(0.09, 0.12, 0.06), '#bfe8ff', 0, 0.3, 0.05)],
    digest: () => [P(B(0.4, 0.42, 0.05), '#fffaf0', 0, 0, 0), P(B(0.4, 0.1, 0.06), '#c9a24a', 0, 0.17, 0), P(T(0.035, 0.012), '#3d4660', -0.1, 0.23, 0), P(T(0.035, 0.012), '#3d4660', 0.1, 0.23, 0), P(B(0.08, 0.06, 0.06), '#c9a24a', 0.06, -0.06, 0.005)],
    trowel: () => [P(C(0.035, 0.035, 0.22, 8), '#8a5a3c', 0, -0.18, 0), P(C(0.012, 0.012, 0.1, 5), '#9aa3b8', 0, -0.03, 0), P(O(0.13, 12), '#b7c0d4', 0, 0.12, 0, 0, 0, 0, 0.9, 1.5, 0.25)],
    hardhat: () => [P(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI*2, 0, H), '#f2b705', 0, 0, 0), P(C(0.32, 0.32, 0.03, 20), '#f2b705', 0.03, 0, 0), P(B(0.06, 0.24, 0.49), '#ffd166', 0, 0.02, 0)],
    pin: () => [P(C(0.08, 0.14, 0.26, 14), '#fffaf0', 0, -0.1, 0), P(C(0.05, 0.08, 0.12, 14), '#fffaf0', 0, 0.09, 0), P(O(0.08), '#fffaf0', 0, 0.2, 0), P(C(0.066, 0.066, 0.05, 14), '#e5484d', 0, 0.06, 0)],
    envelope: () => [P(B(0.5, 0.34, 0.05), '#fffaf0', 0, 0, 0), P(B(0.37, 0.03, 0.02), '#e6dcc8', -0.09, 0.05, 0.03, 0, 0, -0.55), P(B(0.37, 0.03, 0.02), '#e6dcc8', 0.09, 0.05, 0.03, 0, 0, 0.55), P(C(0.05, 0.05, 0.03, 12), '#d9534f', 0, -0.03, 0.04, H)],
    fish: () => [P(O(0.14, 12), '#ffb86b', 0, 0, 0, 0, 0, 0, 1.8, 1, 0.6), P(C(0, 0.13, 0.16, 4), '#ff9f5a', -0.3, 0, 0, 0, 0, H), P(O(0.03, 8), '#1f2a44', 0.17, 0.04, 0.07)],
    berry: () => [P(O(0.22, 16), '#3b4f9e', 0, 0, 0), P(C(0.07, 0.02, 0.06, 5), '#2c3a8f', 0, 0.22, 0)],
    floss: () => [P(B(0.3, 0.3, 0.14), '#fffaf0', 0, 0, 0), P(B(0.31, 0.08, 0.15), '#7fd6c2', 0, 0.12, 0), P(T(0.1, 0.022), '#7fd6c2', 0.18, 0.2, 0, H)],
    bolt: () => [P(C(0.15, 0.15, 0.08, 6), '#9aa3b8', 0, 0.2, 0), P(C(0.06, 0.06, 0.36, 10), '#b7c0d4', 0, 0, 0)],
    testudo: () => [P(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI*2, 0, H), '#6f7d2e', 0, 0, 0), P(C(0.3, 0.3, 0.04, 18), '#e3c77a', 0, 0, 0), P(O(0.08), '#58651f', 0, 0.26, 0, 0, 0, 0, 1, 0.4, 1)],
    page: () => [P(B(0.36, 0.46, 0.02), '#fffaf0', 0, 0, 0), P(B(0.26, 0.02, 0.025), '#c9a24a', 0, 0.12, 0.005)],
    gift: () => [P(B(0.36, 0.3, 0.36), '#e98a5a', 0, 0, 0), P(B(0.08, 0.31, 0.37), '#ffd166', 0, 0, 0), P(B(0.37, 0.31, 0.08), '#ffd166', 0, 0, 0), P(T(0.06, 0.025), '#ffd166', 0, 0.18, 0)],
  };
  const geos = new Map();
  function model(key){
    const k = PARTS[key] ? key : 'gift';
    if(!geos.has(k)){ const g = mergeGeometries(PARTS[k]()); g.computeBoundingBox(); geos.set(k, g); }
    const m = new THREE.Mesh(geos.get(k), mat); m.castShadow = true; m.userData.bottom = -geos.get(k).boundingBox.min.y;
    return m;
  }
  // Items that stand up (souvenirs) bob and spin; flat things lie still.
  const STANDING = new Set(['molecule', 'seeds', 'reel', 'guide', 'apple', 'terrapin', 'toothbrush', 'digest', 'trowel', 'hardhat', 'pin', 'envelope', 'berry', 'gift', 'fish', 'floss', 'bolt', 'testudo', 'page']);

  /* ---------- pickables ---------- */
  // entry: { obj, id, name, icon, spot?, drop?, souvenir?, inst?, i?, base, spin, gone }
  const entries = new Set();
  const rootOf = o => { while(o.parent) o = o.parent; return o; };
  function pickable(obj, info = {}){
    const e = { obj, id: info.id || 'thing', name: info.name || 'Something', icon: info.icon || info.id || 'gift', spot: info.spot, drop: info.drop, souvenir: info.souvenir, inst: info.inst, i: info.i,
      base: obj?.position?.y ?? 0, spin: !!info.spin, count: info.count || 1, onPick: info.onPick };
    entries.add(e);
    return () => { entries.delete(e); };
  }
  function place(parent, key, x, z, y0 = 0, extra = {}){
    const m = model(key); const stand = STANDING.has(key);
    m.position.set(x, y0 + m.userData.bottom + (stand ? 0.35 : 0), z); m.rotation.y = extra.rotY ?? 0;
    parent.add(m);
    const off = pickable(m, { spin: stand, ...extra });
    return { m, off };
  }
  const curScene = () => state.mode === 'interior' ? state.interior?.scene : scene;
  const playerPos = () => state.mode === 'interior' ? (state.interior?.player || state.player) : state.player;
  const wp = new THREE.Vector3();
  function posOf(e, out){
    if(e.inst){ e.inst.getMatrixAt(e.i, tmpM); return out.setFromMatrixPosition(tmpM).applyMatrix4(e.inst.matrixWorld); }
    return e.obj.getWorldPosition(out);
  }
  function nearestEntry(maxD){
    const sc = curScene(), P = playerPos(); if(!sc || !P) return null;
    let best = null, bd = maxD;
    for(const e of entries){
      if(e.flying) continue;
      if((e.inst ? rootOf(e.inst) : rootOf(e.obj)) !== sc) continue;
      posOf(e, wp); const d = Math.hypot(wp.x - P.x, wp.z - P.z);
      if(d < bd){ bd = d; best = e; }
    }
    return best ? { e: best, dist: bd } : null;
  }

  /* ---------- items ---------- */
  function descOf(it){
    const z = it.id.startsWith('souvenir-') ? SOUVENIRS[it.id.slice(9)] : null;
    return z ? z[2] : it.desc || DESC[it.id] || DESC[it.icon] || 'Found on the island.';
  }
  function add(item = {}, quiet = false){
    if(!item.id) return false;
    const n = Math.max(1, item.count | 0 || 1);
    let it = S.items.find(q => q.id === item.id);
    if(it) it.count += n; else S.items.push(it = { id: item.id, name: item.name || item.id, icon: item.icon || item.id, count: n, ...(item.desc ? { desc: String(item.desc) } : {}) });
    if(item.id.startsWith('souvenir-')) found.add(item.id.slice(9));
    changed();
    if(!quiet){ toast(`+${n} ${it.name}`, it.icon, item.id.startsWith('souvenir-')); popSound(); bumpBar(S.items.indexOf(it)); }
    if(found.size >= TOUR.length && !S.done) celebrate();
    return true;
  }
  function remove(id, n = 1){
    const it = S.items.find(q => q.id === id); if(!it) return false;
    it.count -= n; if(it.count <= 0) S.items.splice(S.items.indexOf(it), 1);
    changed(); return true;
  }

  /* ---------- picking up: the item arcs into the player ---------- */
  const flights = [];
  function pickUp(hit){
    const e = hit.e; e.flying = true;
    const sc = curScene(), P = playerPos();
    let obj = e.obj;
    if(e.inst){
      // An instanced shell: hide the instance and fly a stand-in mesh built from the same geometry.
      e.inst.getMatrixAt(e.i, tmpM); tmpM.decompose(tmpV, tmpQ, tmpS);
      obj = new THREE.Mesh(e.inst.geometry, e.inst.material); obj.position.copy(tmpV); obj.quaternion.copy(tmpQ); obj.scale.copy(tmpS); sc.add(obj);
      e.inst.setMatrixAt(e.i, tmpM.makeScale(0, 0, 0)); e.inst.instanceMatrix.needsUpdate = true;
    } else sc.attach(obj);   // attach() reparents while keeping the world transform, so the arc starts where it lay
    flights.push({ e, obj, sc, t: 0, from: obj.position.clone(), s0: obj.scale.x, P });
    if(e.spot){ picked.add(e.spot); }
    if(e.drop){ S.drops = S.drops.filter(d => d !== e.drop); }
    if(doorS && doorS.m === obj) doorS = null;   // it is flying now; the door spot is simply empty
    entries.delete(e);
    add({ id: e.id, name: e.name, icon: e.icon, count: e.count });
    try { e.onPick?.(); } catch(err){ console.error('[inventory] onPick threw', err); }
    hidePrompt();
  }
  function stepFlights(dt){
    for(let k = flights.length - 1; k >= 0; k--){
      const f = flights[k]; f.t += dt/0.42; const u = Math.min(1, f.t);
      const P = playerPos() || f.P;
      f.obj.position.set(f.from.x + (P.x - f.from.x)*u, f.from.y + (1.1 - f.from.y)*u + Math.sin(u*Math.PI)*1.4, f.from.z + (P.z - f.from.z)*u);
      f.obj.rotation.y += dt*9; f.obj.scale.setScalar(f.s0*(1 - 0.7*u));
      if(u >= 1){ f.obj.parent?.remove(f.obj); flights.splice(k, 1); }
    }
  }
  const popSound = () => { try { ctx.sound.tone(520, 0.1, 'sine', 0.12, 980); setTimeout(() => ctx.sound.tone(1040, 0.12, 'triangle', 0.07), 70); } catch {} };

  /* ---------- glow and prompt ---------- */
  // Soft glow: one additive sprite with a radial gradient, moved to whichever item is in reach.
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g = gc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff6cfcc'); gr.addColorStop(0.4, '#ffd16666'); gr.addColorStop(1, '#ffd16600'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.visible = false; glow.renderOrder = 5;

  const style = document.createElement('style'); style.id = 'inv-css'; style.textContent = CSS; document.head.append(style);
  const prompt = document.createElement('button'); prompt.type = 'button'; prompt.id = 'inv-prompt'; prompt.setAttribute('aria-label', 'Pick up');
  prompt.innerHTML = '<span class="k"><b>F</b></span><span class="lbl">Pick up</span>';
  document.body.append(prompt);
  let promptFor = null;
  prompt.addEventListener('click', () => { const h = reach(); if(h) pickUp(h); ctx.renderer.domElement.focus?.({ preventScroll: true }); });
  function hidePrompt(){ promptFor = null; prompt.classList.remove('on'); glow.visible = false; }
  const reach = () => (!state.started || open || ctx.modules.dialog?.busy?.()) ? null : nearestEntry(REACH);

  /* ---------- F: no key listener here. The one F resolver in character.js asks nearest() and calls
     pickupNearest(), so F never fires two things at once (CONTRACT: pickup beats NPC, pet, door, car). */
  function pickupNearest(){ const h = reach(); if(!h) return false; pickUp(h); return true; }

  /* ---------- the hotbar (bottom centre) and toasts ---------- */
  const SLOTS = 8;
  const bar = document.createElement('div'); bar.className = 'hud off'; bar.id = 'hotbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Inventory');
  const slotRow = document.createElement('div'); slotRow.className = 'slots'; bar.append(slotRow);
  const slots = [];
  for(let k = 0; k < SLOTS; k++){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hs empty';
    b.addEventListener('click', () => { if(state.started && b.dataset.key) openAt(k); });
    slotRow.append(b); slots.push(b);
  }
  const bagBtn = document.createElement('button'); bagBtn.type = 'button'; bagBtn.className = 'hs bag'; bagBtn.setAttribute('aria-label', 'Open the bag (I)');
  bagBtn.innerHTML = `${BAG}<span>Bag</span><b>0</b>`;
  bagBtn.addEventListener('click', () => { if(state.started) toggle(); });
  bar.append(bagBtn); document.body.append(bar);
  let fit = SLOTS;   // how many slots fit on this screen right now (layoutBar)
  function paintBar(){
    const L = S.items;
    slots.forEach((b, k) => {
      b.hidden = k >= fit;
      const more = L.length > fit && k === fit - 1, it = more ? null : L[k];
      const key = it ? `${it.icon}:${it.count}:${it.name}` : more ? `+${L.length - k}` : '';
      if(b.dataset.key === key) return;   // repaint a slot only when what it shows changed
      b.dataset.key = key; b.innerHTML = ''; b.className = 'hs' + (key ? '' : ' empty');
      if(it){
        b.append(iconCanvas(it.icon, 96));
        if(it.count > 1){ const s = document.createElement('span'); s.className = 'n'; s.textContent = it.count; b.append(s); }
        b.setAttribute('aria-label', it.name + (it.count > 1 ? ` x${it.count}` : ''));
      } else if(more){ const s = document.createElement('span'); s.className = 'more'; s.textContent = key; b.append(s); b.setAttribute('aria-label', `${L.length - k} more in the bag`); }
      else b.setAttribute('aria-label', 'Empty slot');
      b.tabIndex = key ? 0 : -1;
    });
    bagBtn.querySelector('b').textContent = total();
  }
  function bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }   // reading offsetWidth restarts the CSS animation
  function bumpBar(k){ bump(bagBtn); if(k >= 0 && k < fit && !slots[k].hidden) bump(slots[k]); }
  function openAt(k){ tab = 'items'; sel = k; if(open) render(); else show(); }

  // Placement, measured a few times a second (the hint text, the zone card and the touch pad all
  // come and go). See the note above CSS for the rules.
  const GAP = 6, PAD = 6;
  let dialogUp = false, shy = false, layClock = 1;
  const rectOf = el => { if(!el) return null; const r = el.getBoundingClientRect(); if(r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(el); return cs.display === 'none' || cs.visibility === 'hidden' ? null : r; };
  function layoutBar(){
    const W = innerWidth, H = innerHeight;
    const hint = rectOf(ctx.hud?.hint || document.getElementById('hint')), touch = rectOf(document.getElementById('touch'));
    const cardEl = ctx.hud?.card || document.getElementById('card'), card = cardEl?.classList.contains('on') ? rectOf(cardEl) : null;
    bar.style.bottom = hint ? `${Math.round(H - hint.top + 8)}px` : '';
    const bottom = parseFloat(getComputedStyle(bar).bottom) || 14, top = H - bottom - (bar.offsetHeight || 60);
    const over = r => !!r && r.top < H - bottom && r.bottom > top;
    const s = (slots[0].offsetWidth || 48) + GAP, fixed = 2*PAD + bagBtn.offsetWidth;
    const fitIn = (a, b) => Math.max(0, Math.min(SLOTS, Math.floor((b - a - fixed)/s)));
    let lo = 8, hi = W - 8;
    if(over(touch)) hi = Math.min(hi, touch.left - 8);
    let n = fitIn(lo, hi); shy = false;
    if(over(card)){ const lo2 = Math.max(lo, card.right + 8), n2 = fitIn(lo2, hi); if(n2 >= Math.min(3, n)){ lo = lo2; n = n2; } else shy = true; }
    n = Math.max(1, n);
    const w = fixed + n*s;
    bar.style.left = `${Math.round(Math.max(lo + w/2, Math.min(hi - w/2, W/2)))}px`;
    if(n !== fit){ fit = n; paintBar(); }
    bar.classList.toggle('off', !state.started || dialogUp || shy);
  }
  bus.on('dialog', ({ open: o }) => { dialogUp = !!o; bar.classList.toggle('off', !state.started || dialogUp || shy); if(!o) layClock = 1; });
  bus.on('resize', () => { layClock = 1; });

  function toast(text, key, gold){
    document.querySelectorAll('.inv-toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'inv-toast' + (gold ? ' gold' : ''); t.append(iconCanvas(key, 60)); t.append(text);
    document.body.append(t); setTimeout(() => t.remove(), 1950);
  }
  function confetti(n = 80){
    if(state.reduced) return;
    const cols = ['#3b4f9e', '#ffd166', '#ff6b6b', '#06d6a0', '#4cc9f0', '#e98a5a', '#d6689a'];
    for(let i = 0; i < n; i++){ const d = document.createElement('i'); d.className = 'inv-conf'; const dur = 1.6 + Math.random()*1.4;
      d.style.cssText = `left:${Math.random()*100}%;background:${cols[i % cols.length]};animation-duration:${dur}s;animation-delay:${Math.random()*0.4}s;--dx:${(Math.random() - 0.5)*160}px;--r:${(Math.random() - 0.5)*900}deg`;
      document.body.append(d); setTimeout(() => d.remove(), (dur + 0.5)*1000); }
  }
  function celebrate(){
    S.done = true; save(); confetti();
    try { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => ctx.sound.tone(f, 0.22, 'triangle', 0.1), i*110)); } catch {}
    ctx.modules.dialog?.say?.({ name: 'Tour souvenirs', portrait: 'berry', lines: ['You found all 12 souvenirs, one from every building on the island!', 'They are in your bag. Press I or Tab to look at the whole set.'] });
  }

  /* ---------- the bag ---------- */
  let open = false, root = null, tab = 'items', sel = 0;
  function toggle(){ open ? close() : show(); }
  function show(){
    if(open) return; open = true; hidePrompt(); ctx.input.clear();
    root = document.createElement('div'); root.id = 'inv'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Bag');
    root.innerHTML = `<div class="box"><div class="bar"><h2>${BAG}Bag</h2><button class="x" type="button" aria-label="Close bag">X</button></div>
      <div class="tabs" role="tablist"><button class="tab" role="tab" data-t="items" type="button">Items<kbd>1</kbd></button><button class="tab" role="tab" data-t="tour" type="button">Tour souvenirs<kbd>2</kbd></button></div>
      <div class="body"></div><div><div class="info"></div><div class="keys"><kbd>Arrows</kbd> choose · <kbd>X</kbd> drop · <kbd>1</kbd> <kbd>2</kbd> pages · <kbd>I</kbd> or <kbd>Esc</kbd> close</div></div></div>`;
    root.addEventListener('pointerdown', ev => { if(ev.target === root) close(); });
    root.querySelector('.x').onclick = close;
    root.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; sel = 0; render(); });
    document.body.append(root); render();
    requestAnimationFrame(() => root?.classList.add('on'));
    try { ctx.sound.tone(440, 0.08, 'sine', 0.06, 660); } catch {}
  }
  function close(){
    if(!open) return; open = false; const r = root; root = null; r.classList.remove('on'); setTimeout(() => r.remove(), 220);
    ctx.renderer.domElement.focus?.({ preventScroll: true });
  }
  function list(){
    if(tab === 'items') return S.items.map(it => ({ it, key: it.icon, name: it.name, desc: descOf(it), count: it.count }));
    return TOUR.filter(id => ctx.zones.some(z => z.id === id)).map(id => { const [name, key, desc] = SOUVENIRS[id], z = ctx.zones.find(q => q.id === id), got = found.has(id);
      return { key, name: got ? name : '???', desc: got ? desc : `Found on the tour at ${z.name}.`, miss: !got }; });
  }
  function render(){
    if(!root) return;
    const L = list(); sel = Math.max(0, Math.min(sel, L.length - 1));
    root.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
    root.querySelector('.tab[data-t=tour]').firstChild.textContent = `Tour souvenirs ${found.size}/${TOUR.length}`;
    const body = root.querySelector('.body'); body.innerHTML = '';
    if(tab === 'tour'){ const m = document.createElement('div'); m.className = 'meter'; m.innerHTML = `<i style="width:${found.size/TOUR.length*100}%"></i>`; body.append(m); }
    const grid = document.createElement('div'); grid.className = 'grid'; grid.setAttribute('role', 'listbox'); body.append(grid);
    const slots = Math.max(tab === 'items' ? 12 : 0, L.length);
    for(let k = 0; k < slots; k++){
      const q = L[k], b = document.createElement('button'); b.type = 'button';
      if(!q){ b.className = 'slot empty'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); grid.append(b); continue; }
      b.className = 'slot' + (q.miss ? ' miss' : '') + (k === sel ? ' sel' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-label', q.name + (q.count > 1 ? ` x${q.count}` : ''));
      b.append(iconCanvas(q.key, 128, q.miss));
      if(q.miss){ const s = document.createElement('span'); s.className = 'q'; s.textContent = '?'; b.append(s); }
      if(q.count > 1){ const s = document.createElement('span'); s.className = 'n'; s.textContent = q.count; b.append(s); }
      b.onclick = () => { sel = k; render(); };
      b.onpointerenter = () => info(q);
      b.onpointerleave = () => info(L[sel]);
      grid.append(b);
    }
    info(L[sel]);
    grid.querySelector('.sel')?.focus({ preventScroll: false });
  }
  function info(q){
    const el = root?.querySelector('.info'); if(!el) return;
    el.innerHTML = '';
    if(!q){ el.innerHTML = `<div class="t"><b>${tab === 'items' ? 'Your bag is empty' : ''}</b><span>${tab === 'items' ? 'Walk up to something small and press F to pick it up.' : ''}</span></div>`; return; }
    el.append(iconCanvas(q.key, 112, q.miss));
    const t = document.createElement('div'); t.className = 't'; t.innerHTML = `<b>${esc(q.name)}${q.count > 1 ? ` <small>x${q.count}</small>` : ''}</b><span>${esc(q.desc)}</span>`; el.append(t);
    if(q.it){ const d = document.createElement('button'); d.type = 'button'; d.className = 'drop'; d.innerHTML = 'Drop<kbd>X</kbd>'; d.onclick = () => drop(q.it); el.append(d); }
  }
  function move(dx, dy){
    const grid = root?.querySelector('.grid'); if(!grid) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1, n = list().length; if(!n) return;
    sel = Math.max(0, Math.min(n - 1, sel + dx + dy*cols)); render();
  }

  /* ---------- dropping: back into the world, a step in front of the player ---------- */
  function spawnDrop(parent, d){ place(parent, d.icon, d.x, d.z, 0, { id: d.id, name: d.name, icon: d.icon, drop: d, rotY: d.x*3.1 }); }
  function drop(it){
    const P = playerPos(), sc = curScene(); if(!P || !sc) return;
    const h = P.heading || 0, d = { id: it.id, name: it.name, icon: it.icon, x: +(P.x + Math.sin(h)*1.9).toFixed(2), z: +(P.z + Math.cos(h)*1.9).toFixed(2), zone: state.mode === 'interior' ? state.interior.zoneId : null };
    S.drops.push(d); spawnDrop(state.mode === 'interior' ? roomGroup(state.interior) : scene, d);
    remove(it.id, 1);
    try { ctx.sound.tone(300, 0.14, 'triangle', 0.1, 160); } catch {}
  }

  /* ---------- keys while the bag is open (captured before the car, the tour or anything else) ---------- */
  const codeOf = e => e.code || (e.key === 'Tab' ? 'Tab' : e.key === 'Escape' || e.key === 'Esc' ? 'Escape' : e.key?.length === 1 ? 'Key' + e.key.toUpperCase() : e.key || '');
  const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown', e => {
    if(!open) return;
    const code = codeOf(e); e.stopPropagation();
    if(code === 'Tab' || code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
    if(e.repeat && !code.startsWith('Arrow')) return;
    if(code === 'Escape' || code === 'KeyI' || code === 'Tab'){ e.preventDefault(); close(); }
    else if(code === 'ArrowLeft' || code === 'KeyA') move(-1, 0);
    else if(code === 'ArrowRight' || code === 'KeyD') move(1, 0);
    else if(code === 'ArrowUp' || code === 'KeyW') move(0, -1);
    else if(code === 'ArrowDown' || code === 'KeyS') move(0, 1);
    else if(code === 'Digit1' || code === 'Digit2'){ tab = code === 'Digit1' ? 'items' : 'tour'; sel = 0; render(); }
    else if((code === 'KeyX' || code === 'Delete' || code === 'Backspace') && tab === 'items'){ const q = list()[sel]; if(q?.it) drop(q.it); }
  }, true);
  addEventListener('keyup', e => { if(open) e.stopPropagation(); }, true);
  // Opening listens in the bubble phase on document, so a game card or the menu that captured the key first keeps it.
  document.addEventListener('keydown', e => {
    if(open || !state.started || e.repeat || typing(e.target) || document.querySelector('#mn.on') || ctx.modules.menu?.isOpen?.()) return;
    const code = codeOf(e);
    if(code === 'KeyI' || code === 'Tab'){ e.preventDefault(); show(); }
  });

  /* ---------- the scatter: shells on the beaches and a few lost things by the buildings ---------- */
  const R = prng(0x5eed1e5), Lay = ctx.modules.map?.layout;
  const zoneAt = id => ctx.zones.find(z => z.id === id);
  const dryAt = (x, z) => (!Lay?.landAt || Lay.landAt(x, z)) && Math.hypot(x, z) < ctx.island.radius - 2;
  function spotNear(cx, cz, r0, r1, need = 1.4){
    for(let k = 0; k < 60; k++){
      const a = R()*Math.PI*2, r = r0 + R()*(r1 - r0), x = cx + Math.cos(a)*r, z = cz + Math.sin(a)*r;
      if(dryAt(x, z) && (!Lay?.dLandAt || Lay.dLandAt(x, z) > 1.5) && clearance(ctx.colliders, x, z) > need) return [x, z];
    }
    return null;
  }
  // Shells: one InstancedMesh (a single draw call for all of them) with per-instance tints.
  const shellGeo = mergeGeometries([P(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI*2, 0, H), '#ffffff', 0, 0, 0, 0, 0, 0, 1, 0.45, 0.85), P(B(0.12, 0.06, 0.08), '#ffffff', 0, 0.02, 0.17)]);
  const shellSpots = [];
  if(Lay?.coast && Lay?.landAt && Lay?.dLandAt){
    for(let k = 0; k < 6; k++){
      for(let tries = 0; tries < 30; tries++){
        const a = (k + R()*0.8)/6*Math.PI*2, c = Lay.coast(a);
        let hit = null;
        for(let r = c + 2; r > c - 8 && !hit; r -= 0.5){ const x = Math.cos(a)*r, z = Math.sin(a)*r; if(Lay.landAt(x, z)){ const d = Lay.dLandAt(x, z); if(d > 0.9 && d < 3 && clearance(ctx.colliders, x, z) > 1.3 && (!Lay.roadDistAt || Lay.roadDistAt(x, z) > 3)) hit = [x, z]; } }
        if(hit){ shellSpots.push(hit); break; }
      }
    }
  }
  const shells = new THREE.InstancedMesh(shellGeo, mat, Math.max(1, shellSpots.length)); shells.count = shellSpots.length; shells.castShadow = true; shells.name = 'inventory-shells';
  const tints = ['#ffc9b5', '#fff1dc', '#ffb4a2', '#f7d9a8'];
  shellSpots.forEach(([x, z], i) => {
    const hide = picked.has('shell-' + i);
    shells.setMatrixAt(i, tmpM.compose(tmpV.set(x, 0.02, z), tmpQ.setFromEuler(tmpE.set(0, R()*6.28, 0)), tmpS.setScalar(hide ? 0 : 1)));
    shells.setColorAt(i, new THREE.Color(tints[i % tints.length]));
    if(!hide) pickable(null, { id: 'shell', name: 'Sea shell', icon: 'shell', inst: shells, i, spot: 'shell-' + i });
  });
  if(shells.count) scene.add(shells);
  const LOST = [['wrench', 'Wrench', ctx.island.spawn.x, ctx.island.spawn.z, 7, 12], ['stamp', 'Lost stamp', 'contact', 0, 6, 10], ['flower', 'Flower', 'yard', 0, 10, 15], ['flask', 'Chemistry flask', 'blueberry', 0, 14, 19]];
  for(const [id, name, a, b, r0, r1] of LOST){
    const z0 = typeof a === 'string' ? zoneAt(a) : { x: a, z: b }; const s = z0 && spotNear(z0.x, z0.z, r0, r1);
    if(!s || picked.has(id)) continue;
    place(scene, id, s[0], s[1], 0, { id, name, icon: id, spot: id, rotY: R()*6.28 });
  }
  for(const d of S.drops) if(!d.zone) spawnDrop(scene, d);

  /* ---------- tour souvenirs ---------- */
  const souvenirInfo = id => ({ id: 'souvenir-' + id, name: SOUVENIRS[id][0], icon: SOUVENIRS[id][1], souvenir: id });
  // At the door: while the tour is on a building, its souvenir waits beside the door (3.6 m to the side,
  // clear of the door's own F zone so the two never compete).
  let doorS = null;
  function setDoorSouvenir(id){
    if(doorS?.id === id) return;
    if(doorS){ doorS.off(); doorS.m.parent?.remove(doorS.m); doorS = null; }
    if(!id || !SOUVENIRS[id] || found.has(id)) return;
    const d = ctx.island.doorOf?.(id); if(!d) return;
    const fx = Math.sin(d.heading), fz = Math.cos(d.heading);
    let spot = null;
    for(const side of [1, -1, 1.4, -1.4]){ const x = d.x + fz*3.6*side + fx*0.8, z = d.z - fx*3.6*side + fz*0.8; if(clearance(ctx.colliders, x, z) > 0.8 && dryAt(x, z)){ spot = [x, z]; break; } }
    spot ||= [d.x + fx*2.4, d.z + fz*2.4];
    const r = place(scene, SOUVENIRS[id][1], spot[0], spot[1], 0, souvenirInfo(id)); doorS = { id, ...r };
  }
  let tourTick = 0;
  function tourDoor(dt){
    if((tourTick -= dt) > 0) return; tourTick = 0.4;
    let s = null; try { s = window.__island?.tourGuide?.state?.(); } catch {}
    setDoorSouvenir(s?.on && !s.paused && s.phase !== 'done' ? s.zone : null);
    if(doorS && found.has(doorS.id)) setDoorSouvenir(null);
  }
  // Inside: the room's souvenir sits on the floor at its first tour stop, plus anything dropped there.
  const roomGroups = new Map();
  function roomGroup(room){
    let g = roomGroups.get(room);
    if(!g){ g = new THREE.Group(); g.name = 'inventory'; roomGroups.set(room, g); }
    if(g.parent !== room.scene) room.scene.add(g);
    return g;
  }
  function firstStop(room){
    if(Array.isArray(room.tour)){ const s = room.tour.find(q => Array.isArray(q?.at) && q.at.length >= 3 && q.at.every(Number.isFinite)); if(s) return [s.at[0], s.at[2]]; }
    const rs = (Array.isArray(room.tourRooms) ? room.tourRooms : Array.isArray(room.rooms) ? room.rooms : []).find(r => Number.isFinite(r?.cx));
    if(rs) return [rs.cx, -1];
    const sp = room.spawn || { x: 0, z: 0 }; return [sp.x, sp.z - 4];
  }
  function roomSpot(room, x, z){
    const b = room.bounds, inB = (px, pz) => !b || (px > b.minX + 0.6 && px < b.maxX - 0.6 && pz > b.minZ + 0.6 && pz < b.maxZ - 0.6);
    for(const [dx, dz] of [[0, 1.2], [0.9, 1.2], [-0.9, 1.2], [0, 1.8], [1.2, 0.4], [-1.2, 0.4], [0, 0], [0, 2.4]]){ const px = x + dx, pz = z + dz; if(inB(px, pz) && clearance(room.colliders, px, pz) > 0.45) return [px, pz]; }
    const sp = room.spawn || { x: 0, z: 0 }; return [sp.x + 1, sp.z - 1.5];
  }
  let inRoom = null;
  bus.on('interior:enter', ({ zoneId, room }) => {
    if(!room?.scene) return;
    const g = roomGroup(room); inRoom = { zoneId, room, g, offs: [] };
    if(SOUVENIRS[zoneId] && !found.has(zoneId)){ const [sx, sz] = firstStop(room), [x, z] = roomSpot(room, sx, sz); inRoom.offs.push(place(g, SOUVENIRS[zoneId][1], x, z, 0, souvenirInfo(zoneId)).off); }
    for(const d of S.drops) if(d.zone === zoneId) spawnDrop(g, d);
  });
  bus.on('interior:exit', () => {
    if(!inRoom) return;
    for(const e of [...entries]) if(rootOf(e.obj || e.inst) === inRoom.room.scene) entries.delete(e);
    inRoom.g.clear(); inRoom.g.parent?.remove(inRoom.g); inRoom = null;
  });

  /* ---------- per frame: idle motion, glow, prompt, flights ---------- */
  const cam = () => state.mode === 'interior' ? (state.interior?.camera || ctx.interiorCamera) : ctx.camera;
  ctx.onUpdate((dt, t, mode) => {
    if((layClock += dt) > 0.25){ layClock = 0; layoutBar(); }
    if(mode !== 'interior') tourDoor(dt);
    const sc = curScene();
    for(const e of entries) if(e.spin && e.obj && !e.flying){ e.obj.rotation.y += dt*1.2; e.obj.position.y = e.base + Math.sin(t*2 + e.base*9)*0.08; }
    stepFlights(dt);
    const h = reach();
    if(!h){ if(promptFor) hidePrompt(); return; }
    posOf(h.e, wp);
    if(glow.parent !== sc) sc.add(glow);   // one glow sprite, moved into whichever scene the player is in
    glow.visible = true; glow.position.set(wp.x, wp.y + 0.1, wp.z); glow.scale.setScalar(1.5 + Math.sin(t*4)*0.15);
    if(promptFor !== h.e){ promptFor = h.e; prompt.querySelector('.lbl').textContent = `Pick up ${h.e.name}`; prompt.classList.add('on'); }
    const c = cam(); if(!c) return;
    wp.y += 0.7; wp.project(c);
    prompt.style.left = `${(wp.x*0.5 + 0.5)*innerWidth}px`; prompt.style.top = `${(-wp.y*0.5 + 0.5)*innerHeight}px`;
  }, 96);

  paintBar();
  const api = {
    add: item => add(item),
    has: id => S.items.find(q => q.id === id)?.count || 0,
    remove,
    items: () => S.items.map(({ id, name, count, icon }) => ({ id, name, count, icon })),
    pickable: (obj, info) => pickable(obj, info),
    nearest: () => { const h = reach(); return h ? { id: h.e.id, dist: +h.dist.toFixed(2) } : null; },
    pickupNearest,   // F resolver in character.js: picks up whatever nearest() named; false if nothing is in reach
    open: show, close, isOpen: () => open,
    souvenirs: () => ({ found: TOUR.filter(id => found.has(id)), of: TOUR.length }),
  };
  // Test hooks: the API plus a few probes for the critic scripts.
  ctx.expose('inventory', Object.assign({}, api, {
    world: () => [...entries].map(e => { posOf(e, wp); return { id: e.id, spot: e.spot || null, souvenir: e.souvenir || null, x: +wp.x.toFixed(2), z: +wp.z.toFixed(2), scene: rootOf(e.obj || e.inst) === scene ? 'island' : 'room' }; }),
    pick: pickupNearest,
    hotbar: () => ({ shown: !bar.classList.contains('off'), fit, slots: slots.filter(b => !b.hidden).map(b => b.dataset.key || null), rect: bar.getBoundingClientRect().toJSON() }),
    reset: () => { try { localStorage.removeItem(KEY); } catch {} },
  }));
  return api;
}
