// Dock Fishing: a rod, a bobber and a bite you have to catch in time, at the end of the Browser Use Dock pier.
// setup() builds the fishing spot (a pad, a bucket, a tackle box, a sign and Captain Finn on his crate)
// and a station on the pad. The game: F casts, the bobber bobs until a "!" pops, F in the window
// hooks it, then F again stops the tension needle in the green to land it. Catches are four kinds
// of fish, an old boot, and now and then a blueberry, which counts for the Blueberry Hunt
// (bus 'hunt:berry'). Every catch also emits bus 'fishing:catch' { kind, name, fish, berry }.
// Results: { fish, berry?:true, berries, boots, catches, test }.
// opts.tour: no intro, straight to the rod, ends by itself after the first catch (the guided tour uses it).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, best, prng } from './ui.js';

export const meta = { title: 'Dock Fishing', zoneId: 'dock', kind: 'world' };

const WY = -0.28;          // sea level, same as map.js WATER_Y
let W = null;

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><ellipse cx="18" cy="21" rx="11" ry="7.5" fill="#ffd166" stroke="#1f2a44" stroke-width="2"/><path d="M28 21l8-6v12z" fill="#ffd166" stroke="#1f2a44" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="19" r="2" fill="#1f2a44"/></svg>`;

// What can bite. weight: odds; zone: width of the green on the tension bar; speed: needle sweep.
const KINDS = [
  { id:'guppy',   name:'Sunny Guppy',   fish:true,  weight:30, zone:0.30, speed:2.6, say:'A little ray of sunshine.' },
  { id:'tetra',   name:'Teal Tetra',    fish:true,  weight:22, zone:0.26, speed:3.0, say:'Quick and shiny.' },
  { id:'snapper', name:'Coral Snapper', fish:true,  weight:15, zone:0.22, speed:3.4, say:'A proper fighter.' },
  { id:'puffer',  name:'Puffy',         fish:true,  weight:10, zone:0.22, speed:3.2, say:'It puffed up at you.' },
  { id:'boot',    name:'Old Boot',      fish:false, weight:14, zone:0.34, speed:2.2, say:'Someone lost a boot.' },
  { id:'berry',   name:'Blueberry',     fish:false, weight:9,  zone:0.24, speed:2.8, say:'+1 for the Blueberry Hunt!', berry:true },
];

const CSS = `
.fs-act{position:absolute;left:50%;bottom:calc(64px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:8px;align-items:center}
.fs-act .gm-btn{font-size:17px;padding:14px 22px}
.fs-act .gm-btn.hot{background:#ff6b6b;color:#fff;animation:fs-shake .35s ease-in-out infinite}
.fs-act .gm-btn.small{font-size:13px;padding:10px 14px}
.fs-act .gm-btn[disabled]{opacity:.55;cursor:default}
@keyframes fs-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg) scale(1.04)}75%{transform:rotate(3deg) scale(1.04)}}
.fs-bar{position:absolute;left:50%;bottom:calc(128px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(380px,calc(100% - 40px));text-align:center;font:700 13px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
.fs-bar span{display:inline-block;background:#fffaf0;border:3px solid #1f2a44;border-radius:999px;padding:5px 12px;margin-bottom:8px;box-shadow:0 3px 0 #0000002a}
.fs-track{position:relative;height:30px;border:3px solid #1f2a44;border-radius:999px;background:repeating-linear-gradient(90deg,#fffaf0 0 18px,#f4ecdc 18px 36px);box-shadow:0 5px 0 #0000002a;overflow:hidden}
.fs-zone{position:absolute;top:0;bottom:0;background:#06d6a0;border-left:3px solid #1f2a44;border-right:3px solid #1f2a44}
.fs-needle{position:absolute;top:-3px;bottom:-3px;width:8px;margin-left:-4px;background:#1f2a44;border-radius:4px}
@media (prefers-reduced-motion:reduce){.fs-act .gm-btn.hot{animation:none}}
`;

/* ---------- geometry: every model is one merged, vertex-coloured mesh, so one draw call each ---------- */
function part(THREE, geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]){
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  const out = geo.clone().applyMatrix4(m);   // built-in shapes are all indexed, which mergeGeometries needs
  for(const k of Object.keys(out.attributes)) if(k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  const c = new THREE.Color(color), n = out.attributes.position.count, col = new Float32Array(n*3);
  for(let i=0;i<n;i++){ col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b; }
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
const merge = list => mergeGeometries(list, false);

function fishGeo(THREE, kind){
  const P = (...a) => part(THREE, ...a), S = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
  const cone = (r, h, n = 4) => new THREE.ConeGeometry(r, h, n);
  const eyes = (x, y, z, r = 0.085) => [P(S(r, 10, 8), '#ffffff', [x, y, z]), P(S(r, 10, 8), '#ffffff', [-x, y, z]), P(S(r*0.55, 8, 6), '#1f2a44', [x*1.12, y, z + r*0.35]), P(S(r*0.55, 8, 6), '#1f2a44', [-x*1.12, y, z + r*0.35])];
  // Fish swim along +z: nose at +z, tail at -z.
  const fish = (body, belly, fin, sx = 0.7, sy = 0.85) => [
    P(S(0.34, 16, 12), body, [0, 0, 0], [0, 0, 0], [sx, sy, 1.3]),
    P(S(0.3, 12, 8), belly, [0, -0.1, 0.05], [0, 0, 0], [sx*0.9, 0.55, 1.1]),
    P(cone(0.3, 0.38), fin, [0, 0, -0.55], [Math.PI/2, 0, 0], [0.3, 1, 1]),
    P(cone(0.14, 0.3), fin, [0, 0.3, -0.02], [-0.5, 0, 0], [0.3, 1, 1]),
    ...eyes(0.17, 0.08, 0.3),
  ];
  let list;
  if(kind === 'guppy') list = fish('#ffd166', '#fff3c4', '#ff9f43');
  else if(kind === 'tetra') list = [...fish('#2ec4b6', '#c9f7f1', '#1f7a8c', 0.6, 0.75), P(new THREE.BoxGeometry(0.44, 0.08, 0.5), '#ff6b6b', [0, 0.05, 0.05])];
  else if(kind === 'snapper') list = [...fish('#ff7b6b', '#ffd1c4', '#d64545', 0.72, 0.95), P(cone(0.1, 0.18), '#d64545', [0, -0.28, -0.1], [Math.PI, 0, 0], [0.3, 1, 1])];
  else if(kind === 'puffer'){
    list = [P(S(0.4, 16, 12), '#c7a6ff'), P(S(0.36, 12, 8), '#f1e8ff', [0, -0.12, 0.04], [0, 0, 0], [0.95, 0.6, 0.95]), P(cone(0.2, 0.26), '#9d7bea', [0, 0, -0.46], [Math.PI/2, 0, 0], [0.3, 1, 1]), ...eyes(0.18, 0.1, 0.31, 0.1)];
    for(let i=0;i<10;i++){ const a = i/10*Math.PI*2, y = (i % 2 ? 0.18 : -0.08); list.push(P(cone(0.05, 0.16), '#6f55b8', [Math.cos(a)*0.4, y, Math.sin(a)*0.34], [0, -a, -Math.PI/2])); }
  }
  else if(kind === 'boot') list = [
    P(new THREE.BoxGeometry(0.36, 0.56, 0.36), '#8a5a3b', [0, 0.14, -0.12]),
    P(new THREE.BoxGeometry(0.36, 0.26, 0.68), '#8a5a3b', [0, -0.14, 0.04]),
    P(new THREE.BoxGeometry(0.4, 0.08, 0.72), '#3b2a22', [0, -0.3, 0.04]),
    P(new THREE.BoxGeometry(0.4, 0.06, 0.4), '#c9a36b', [0, 0.4, -0.12]),
    P(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), '#6fae4a', [0.12, 0.62, -0.12], [0.2, 0, 0.3]),   // a weed stuck in it
  ];
  else list = [   // berry
    P(S(0.42, 18, 14), '#4a5fc9'), P(S(0.3, 12, 8), '#7d8fe6', [-0.12, 0.14, 0.2], [0, 0, 0], [0.5, 0.35, 0.3]),
    P(new THREE.CylinderGeometry(0.16, 0.09, 0.14, 5), '#27306b', [0, 0.42, 0]),
    P(S(0.2, 10, 8), '#6fae4a', [0.18, 0.44, 0], [0, 0, -0.5], [1, 0.35, 0.6]),
  ];
  return merge(list);
}

export function setup(ctx, reg){
  const { THREE, scene, helpers: H } = ctx;
  const z = ctx.zones.find(q => q.id === 'dock'); if(!z) return;
  if(!document.getElementById('fishing-css')){ const s = document.createElement('style'); s.id = 'fishing-css'; s.textContent = CSS; document.head.append(s); }
  const f = H.frameOf(z);
  // The pier (map.js buildPier) runs out along zone-local -z at lx = -5, deck top y 0.23, end at lz = -17.4.
  const [sx, sz] = f.w(-5, -15), [ox, oz] = f.w(-5, -18);
  const heading = Math.atan2(ox - sx, oz - sz);          // facing the open sea
  const fx = Math.sin(heading), fz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading);   // forward, right
  const at = (r, fw) => [sx + rx*r + fx*fw, sz + rz*r + fz*fw];   // pier-local: r to the right, fw toward the sea
  const DECK = 0.24;

  const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 });
  const P = (...a) => part(THREE, ...a);

  // Static props at the end of the pier, one mesh: bucket with a tail poking out, tackle box, spare rod, a mooring post.
  const props = new THREE.Group(); props.position.set(sx, DECK, sz); props.rotation.y = heading; scene.add(props);
  props.add(new THREE.Mesh(merge([
    P(new THREE.CylinderGeometry(0.34, 0.27, 0.5, 14), '#4cc9f0', [1.05, 0.25, -0.6]),
    P(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 14), '#2b8fb3', [1.05, 0.47, -0.6]),
    P(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 14), '#3f7fae', [1.05, 0.44, -0.6]),
    P(new THREE.ConeGeometry(0.16, 0.26, 4), '#ffd166', [1.1, 0.62, -0.55], [0.3, 0, 0.4], [0.3, 1, 1]),
    P(new THREE.BoxGeometry(0.6, 0.3, 0.38), '#e5484d', [1.0, 0.15, 0.4]),
    P(new THREE.BoxGeometry(0.62, 0.06, 0.4), '#b83a3e', [1.0, 0.32, 0.4]),
    P(new THREE.BoxGeometry(0.2, 0.05, 0.08), '#1f2a44', [1.0, 0.37, 0.4]),
    P(new THREE.CylinderGeometry(0.025, 0.035, 2.2, 6), '#3b2a22', [-1.25, 1.0, 0.9], [0, 0, 0.25]),
    P(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8), '#c89b6d', [-1.18, 0.3, 0.9], [0, 0, 0.25]),
    P(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 10), '#7a5236', [1.3, 0.45, 1.8]),
    P(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 10), '#5c3d28', [1.3, 0.92, 1.8]),
  ]), vc));

  // Captain Finn on his crate at the far corner, with his own rod out over the side.
  const finn = new THREE.Group(); { const [x, zz] = at(-0.95, 1.9); finn.position.set(x, DECK, zz); } finn.rotation.y = heading + 0.9; scene.add(finn);
  const finnBody = new THREE.Mesh(merge([
    P(new THREE.BoxGeometry(0.8, 0.5, 0.7), '#b98a5a', [0, 0.25, 0]),
    P(new THREE.BoxGeometry(0.82, 0.06, 0.72), '#8a6038', [0, 0.36, 0]),
    P(new THREE.SphereGeometry(0.42, 16, 12), '#f4a261', [0, 0.92, 0], [0, 0, 0], [1, 1.1, 0.95]),     // round body in an orange slicker
    P(new THREE.SphereGeometry(0.3, 14, 10), '#ffe0c2', [0, 1.45, 0.02]),                              // head
    P(new THREE.CylinderGeometry(0.28, 0.36, 0.2, 14), '#ffd166', [0, 1.7, 0]),                         // bucket hat
    P(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16), '#ffd166', [0, 1.6, 0]),
    P(new THREE.SphereGeometry(0.05, 8, 6), '#1f2a44', [0.1, 1.48, 0.27]), P(new THREE.SphereGeometry(0.05, 8, 6), '#1f2a44', [-0.1, 1.48, 0.27]),
    P(new THREE.SphereGeometry(0.06, 8, 6), '#ff9fb2', [0.18, 1.4, 0.24], [0, 0, 0], [1, 0.6, 0.5]), P(new THREE.SphereGeometry(0.06, 8, 6), '#ff9fb2', [-0.18, 1.4, 0.24], [0, 0, 0], [1, 0.6, 0.5]),
    P(new THREE.SphereGeometry(0.12, 10, 8), '#ffffff', [0, 1.33, 0.26], [0, 0, 0], [1.4, 0.7, 0.8]),   // beard
    P(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 8), '#2b4c7e', [0.16, 0.5, 0.35], [Math.PI/2, 0, 0]), // legs over the edge
    P(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 8), '#2b4c7e', [-0.16, 0.5, 0.35], [Math.PI/2, 0, 0]),
    P(new THREE.CylinderGeometry(0.02, 0.035, 2.4, 6), '#3b2a22', [0.25, 1.55, 0.95], [0.95, 0, 0]),   // his rod
    P(new THREE.CylinderGeometry(0.006, 0.006, 2.6, 4), '#f5f0e6', [0.25, 1.1, 2.0]),                   // his line into the sea
    P(new THREE.SphereGeometry(0.07, 8, 6), '#e5484d', [0.25, -0.2, 2.0]),
  ]), vc);
  finnBody.castShadow = true; finn.add(finnBody);
  { const [x, zz] = at(-0.95, 1.9); H.solidCircle(x, zz, 0.55, 1.8); }

  // The FISH pad, same look as the HUNT and BOWL mats.
  const matTex = H.canvasTex(256, 256, g => {
    g.fillStyle = '#2f9e8f'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#fffaf0'; g.lineWidth = 8; g.setLineDash([18, 12]); g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#fffaf0'; H.F(g, 700, 50); g.textAlign = 'center'; g.fillText('FISH', 128, 120);
    g.beginPath(); g.ellipse(118, 168, 26, 16, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(140, 168); g.lineTo(166, 152); g.lineTo(166, 184); g.closePath(); g.fill();
  });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), new THREE.MeshStandardMaterial({ map: matTex.tex, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pad.rotation.set(-Math.PI/2, 0, heading + Math.PI); pad.position.set(sx, DECK + 0.02, sz); pad.receiveShadow = true; scene.add(pad);
  const sign = H.label('Fishing spot', '#2f9e8f', '#ffffff'); sign.scale.set(3.3, 0.95, 1); { const [x, zz] = at(0, 2.6); sign.position.set(x, 2.9, zz); } scene.add(sign);

  /* ---------- game pieces, hidden until someone fishes ---------- */
  // Rod: pivot at the hand, the blank runs up local +y; the group tilts it forward.
  const rod = new THREE.Group(); rod.rotation.order = 'YXZ'; rod.visible = false; scene.add(rod);
  rod.add(new THREE.Mesh(merge([
    P(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), '#c89b6d', [0, 0.1, 0]),
    P(new THREE.CylinderGeometry(0.012, 0.03, 2.4, 6), '#1f2a44', [0, 1.55, 0]),
    P(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), '#c0c7d6', [0.08, 0.3, 0], [0, 0, Math.PI/2]),
    P(new THREE.SphereGeometry(0.035, 6, 5), '#e5484d', [0, 2.76, 0]),
  ]), vc));
  const tipLocal = new THREE.Vector3(0, 2.76, 0);
  // Bobber: red over white.
  const bobber = new THREE.Mesh(merge([
    P(new THREE.SphereGeometry(0.17, 14, 7, 0, Math.PI*2, 0, Math.PI/2), '#ff4d4d'),
    P(new THREE.SphereGeometry(0.17, 14, 7, 0, Math.PI*2, Math.PI/2, Math.PI/2), '#ffffff'),
    P(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 5), '#1f2a44', [0, 0.22, 0]),
  ]), vc);
  bobber.visible = false; scene.add(bobber);
  // Fishing line: a sagging curve from the rod tip to the bobber, rewritten every frame.
  const LN = 18, lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LN*3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#1f2a44' })); line.frustumCulled = false; line.visible = false; scene.add(line);
  // "!" bubble over the bobber when something bites.
  const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: H.canvasTex(128, 128, g => {
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#1f2a44'; g.lineWidth = 8; g.beginPath(); g.arc(64, 60, 48, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(52, 104); g.lineTo(64, 124); g.lineTo(72, 104); g.fill();
    g.fillStyle = '#e5484d'; H.F(g, 700, 76); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 64, 64);
  }).tex, depthTest: false, transparent: true }));
  bang.renderOrder = 8; bang.visible = false; scene.add(bang);
  // Splash: a ring on the water plus a few instanced droplets (one draw call for all of them).
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2; ring.visible = false; scene.add(ring);
  const DROPS = 10, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: '#e8fbff' }), DROPS);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drops.frustumCulled = false; drops.visible = false; scene.add(drops);
  // The catch: one mesh, its geometry swapped per kind.
  const geos = Object.fromEntries(KINDS.map(k => [k.id, fishGeo(THREE, k.id)]));
  const prize = new THREE.Mesh(geos.guppy, vc); prize.castShadow = true; prize.visible = false; scene.add(prize);

  W = { spot: { x: sx, z: sz, heading }, fwd: { x: fx, z: fz }, right: { x: rx, z: rz }, rod, tipLocal, bobber, line, bang, ring, drops, prize, geos, finn, DECK, hop: 0 };

  // Finn breathes, and hops when someone lands a catch.
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    W.hop = Math.max(0, W.hop - dt);
    finnBody.position.y = W.hop > 0 ? Math.sin((0.5 - W.hop)/0.5*Math.PI)*0.35 : 0;
    finnBody.scale.y = 1 + Math.sin(t*2.2)*0.025;
  }, 70);
  ctx.hud.minimapLayers.push((g, toMap) => { const [x, y] = toMap(sx, sz); g.fillStyle = '#2f9e8f'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.stroke(); });
  W.station = reg.station({ id: 'fishing', x: sx, z: sz, r: 1.6, when: m => m === 'drive' || m === 'walk' });
}

export function start(ctx, api){
  if(!W) throw new Error('fishing spot was not built');
  const { THREE } = ctx;
  const K = kit(ctx, api);
  const opts = api.opts || {}, tour = !!opts.tour;
  // Launched by id or by the tour, the player ends up standing on the pad: disarm it so closing does not reopen the intro.
  if(W.station) W.station.armed = false;
  const rnd = prng((Date.now() ^ 0x5eed) >>> 0);
  const S = { phase: 'intro', fish: 0, boots: 0, berries: 0, catches: 0, casts: 0, t: 0, kind: null, zone: [0.4, 0.6], needle: 0, test: false, force: null, log: [] };
  const offs = [];
  let stopped = false;
  const tmp = new THREE.Vector3(), tip = new THREE.Vector3(), from = new THREE.Vector3(), land = new THREE.Vector3(), dummy = new THREE.Object3D();
  const splash = { t: 1, x: 0, z: 0, v: Array.from({ length: 10 }, () => new THREE.Vector3()), p: Array.from({ length: 10 }, () => new THREE.Vector3()) };
  const fly = { t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };

  /* ---------- on-screen controls: one big action button (click or F) and a Done button ---------- */
  const act = document.createElement('div'); act.className = 'fs-act'; act.hidden = true;
  act.innerHTML = `<button type="button" class="gm-btn primary on" data-a></button><button type="button" class="gm-btn small on" data-d>Done <kbd>Esc</kbd></button>`;
  K.el.append(act);
  const actBtn = act.querySelector('[data-a]');
  actBtn.onclick = () => { press(); ctx.renderer.domElement.focus?.({ preventScroll: true }); };
  act.querySelector('[data-d]').onclick = () => finish();
  const bar = document.createElement('div'); bar.className = 'fs-bar'; bar.hidden = true;
  bar.innerHTML = `<span>Stop the needle in the green! <kbd>F</kbd></span><div class="fs-track"><div class="fs-zone"></div><div class="fs-needle"></div></div>`;
  K.el.append(bar);
  const zoneEl = bar.querySelector('.fs-zone'), needleEl = bar.querySelector('.fs-needle');
  function button(label, key, hot, disabled){ actBtn.innerHTML = `${label}${key ? ` <kbd>${key}</kbd>` : ''}`; actBtn.classList.toggle('hot', !!hot); actBtn.disabled = !!disabled; }

  const keys = (code, down) => {
    if(!down) return;
    if(code === 'KeyF' || code === 'Enter' || code === 'Space') press();
    else if(code === 'Escape') finish();
  };

  /* ---------- flow ---------- */
  async function intro(){
    S.phase = 'intro';
    const d = ctx.modules.dialog;
    if(typeof d?.say === 'function'){
      try {
        const p = d.say({ name: 'Captain Finn', portrait: 'blob', choices: ['Cast a line', 'Not now'], lines: [
          'Ahoy! Best fishing on the island is right here, at the end of the Browser Use Dock.',
          'Press F to cast. When the ! pops over your bobber, press F to hook it.',
          'Then stop the needle in the green and it is yours. Some folk even fish up blueberries.',
        ] });
        if(p && typeof p.then === 'function'){ const ch = await p; if(stopped) return; if(ch === 1){ api.stop(); return; } ready(true); return; }
      } catch(e){ console.error('[fishing] dialog failed; using the card', e); }
    }
    const b = best.get('fishing');
    K.card({ icon: ICON, color: '#2f9e8f', eyebrow: 'Captain Finn says', title: 'Dock Fishing',
      body: 'Cast off the end of the pier, wait for the <b>!</b>, then hook it and stop the needle in the green. Fish, boots, and the odd blueberry for the Blueberry Hunt.',
      stats: [['Best haul', b ? `${b.fish} fish` : 'none yet'], ['Kinds', '4 fish']],
      keys: '<kbd>F</kbd> cast and reel · <kbd>Esc</kbd> done',
      primary: ['Start fishing', () => ready(true)], secondary: ['Not now', () => api.stop()] });
  }
  function ready(first){
    if(stopped) return;
    if(ctx.state.mode === 'interior') ctx.modes.exitInterior();
    if(first){
      const P = ctx.state.player;
      if(Math.hypot(P.x - W.spot.x, P.z - W.spot.z) > 0.8 || Math.abs(((P.heading - W.spot.heading + Math.PI*3) % (Math.PI*2)) - Math.PI) > 0.3) ctx.modes.placePlayer(W.spot.x, W.spot.z, W.spot.heading);
      K.hud.chips([['fish', 'Fish', true], ['boot', 'Boots'], ['berry', 'Berries']]); paintHud(); K.hud.show(true);
      K.capture(keys);
      W.rod.visible = true; act.hidden = false;
      if(tour) K.toast('Press F to cast', 'good');
    }
    S.phase = 'ready'; S.t = 0; W.bobber.visible = W.line.visible = W.bang.visible = false; bar.hidden = true;
    button('Cast', 'F');
  }
  function paintHud(){ K.hud.set('fish', S.fish); K.hud.set('boot', S.boots); K.hud.set('berry', S.berries); }

  function press(){
    if(stopped) return;
    if(S.phase === 'ready') cast();
    else if(S.phase === 'wait'){ K.toast('Too early! Wait for the !', 'bad'); K.sfx.bad(); reelBack(); }
    else if(S.phase === 'bite') hook();
    else if(S.phase === 'reel') stopNeedle();
  }
  function cast(){
    S.phase = 'cast'; S.t = 0; S.casts++;
    const dist = 6.5 + rnd()*2.5, side = (rnd() - 0.5)*2.4;
    land.set(W.spot.x + W.fwd.x*dist + W.right.x*side, WY, W.spot.z + W.fwd.z*dist + W.right.z*side);
    button('Casting...', '', false, true);
    try { ctx.sound.tone(520, 0.3, 'sine', 0.05, 180); } catch {}
  }
  function startWait(){
    S.phase = 'wait'; S.t = 0; S.waitFor = S.force ? 0.8 : 1.6 + rnd()*2.6; S.nibbles = [0.35, 0.6].map(k => S.waitFor*k + rnd()*0.3);
    doSplash(land.x, land.z, 0.8); K.sfx.pop();
    button('Wait for the !', '', false, false);
  }
  function bite(){
    S.phase = 'bite'; S.t = 0;
    S.kind = S.force ? KINDS.find(k => k.id === S.force) : pick(); S.force = null;
    W.bang.visible = true; doSplash(W.bobber.position.x, W.bobber.position.z, 1);
    K.sfx.good(4); button('Reel!', 'F', true);
  }
  function pick(){
    let sum = 0; for(const k of KINDS) sum += k.weight;
    let r = rnd()*sum; for(const k of KINDS){ r -= k.weight; if(r <= 0) return k; }
    return KINDS[0];
  }
  function hook(){
    S.phase = 'reel'; S.t = 0; W.bang.visible = false;
    const w = Math.min(0.46, S.kind.zone + (tour ? 0.1 : 0)), c = w/2 + rnd()*(1 - w);
    S.zone = [c - w/2, c + w/2];
    zoneEl.style.left = (S.zone[0]*100) + '%'; zoneEl.style.width = (w*100) + '%';
    bar.hidden = false; button('Stop!', 'F', true);
    K.sfx.tick();
  }
  function stopNeedle(){
    const n = S.needle;
    if(n >= S.zone[0] && n <= S.zone[1]) landIt();
    else { K.toast(S.kind.fish ? 'Snap! It got away' : 'Snap! The line broke', 'bad'); K.sfx.bad(); reelBack(); }
  }
  function reelBack(){ S.phase = 'back'; S.t = 0; bar.hidden = true; W.bang.visible = false; button('Reeling in...', '', false, true); }
  function landIt(){
    const k = S.kind; S.phase = 'catch'; S.t = 0; bar.hidden = true; S.catches++;
    if(k.fish) S.fish++; else if(k.berry) S.berries++; else S.boots++;
    paintHud(); W.hop = 0.5;
    W.prize.geometry = W.geos[k.id]; W.prize.visible = true; W.prize.scale.setScalar(1);
    fly.t = 0; fly.from.copy(W.bobber.position);
    doSplash(W.bobber.position.x, W.bobber.position.z, 1.3);
    W.bobber.visible = W.line.visible = false;
    K.big(k.berry ? 'Blueberry!' : k.fish ? 'Caught!' : 'A boot...', true);
    K.toast(`${k.name}: ${k.say}`, k.id === 'boot' ? '' : 'good');
    k.id === 'boot' ? K.sfx.bad() : K.sfx.win();
    if(k.berry){
      K.confetti(50);
      ctx.bus.emit('hunt:berry', { source: 'fishing', x: W.spot.x, z: W.spot.z });
    }
    // Every catch goes in the bag too (inventory has fish and berry icons; the boot falls back to its gift icon).
    try { ctx.modules.inventory?.add?.(k.fish ? { id: 'fish-' + k.id, name: k.name, icon: 'fish' } : k.berry ? { id: 'berry', name: 'Blueberry', icon: 'berry' } : { id: 'boot', name: 'Old Boot', icon: 'boot' }); }
    catch(e){ console.error('[fishing] inventory add failed', e); }
    S.log.push(k.id);
    ctx.bus.emit('fishing:catch', { kind: k.id, name: k.name, fish: k.fish, berry: !!k.berry, tour });
    button('Nice!', '', false, true);
    if(tour) K.later(() => { if(!stopped){ api.end(result()); api.stop(); } }, 2400);
  }
  function result(){ const r = { fish: S.fish, berries: S.berries, boots: S.boots, catches: S.catches, test: S.test }; if(S.berries) r.berry = true; return r; }
  function finish(){
    if(stopped || S.phase === 'done' || S.phase === 'intro') { if(S.phase === 'intro') api.stop(); return; }
    S.phase = 'done'; K.capture(null); act.hidden = true; bar.hidden = true; K.hud.show(false);
    W.rod.visible = W.bobber.visible = W.line.visible = W.bang.visible = false;
    const old = best.get('fishing'), isBest = !S.test && S.fish > 0 && (!old || S.fish > old.fish);
    if(isBest) best.set('fishing', { fish: S.fish });
    api.end(result());
    if(tour){ api.stop(); return; }
    K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#2f9e8f', eyebrow: S.test ? 'Test round, not saved' : isBest ? 'New best haul' : 'Gone fishing', title: S.catches ? `${S.catches} in the bucket` : 'Nothing today',
      body: S.catches ? `${S.fish} fish, ${S.boots} ${S.boots === 1 ? 'boot' : 'boots'}${S.berries ? ` and ${S.berries} ${S.berries === 1 ? 'blueberry' : 'blueberries'} for the hunt` : ''}.` : 'The fish will still be here. Finn is not going anywhere.',
      stats: [['Fish', String(S.fish), isBest], ['Boots', String(S.boots)], ['Berries', String(S.berries)]],
      primary: ['Fish again', () => { Object.assign(S, { fish: 0, boots: 0, berries: 0, catches: 0, casts: 0, test: false }); ready(true); }], secondary: ['Done', () => api.stop()] });
  }

  function doSplash(x, z, s){
    splash.t = 0; splash.x = x; splash.z = z; splash.s = s;
    W.ring.visible = true; W.drops.visible = true;
    for(let i=0;i<10;i++){ const a = i/10*Math.PI*2 + rnd(); splash.p[i].set(x, WY, z); splash.v[i].set(Math.cos(a)*(1 + rnd())*s, (2.5 + rnd()*2)*s, Math.sin(a)*(1 + rnd())*s); }
  }

  const quit = () => { if(S.phase !== 'intro' && S.phase !== 'done') api.stop(); };
  offs.push(ctx.bus.on('teleport', quit), ctx.bus.on('interior:enter', quit));

  if(tour) ready(true); else intro();

  /* ---------- per frame ---------- */
  function update(dt, t, mode){
    if(stopped || mode === 'interior') return;
    S.t += dt;
    const P = ctx.state.player;
    // Rolled onto the pad, then drove away during the intro: forget it. (Launched by id, ready() walks you over.)
    if(S.phase === 'intro' && opts.via === 'station' && Math.hypot(P.x - W.spot.x, P.z - W.spot.z) > 10){ api.stop(); return; }
    if(!W.rod.visible) { tickSplash(dt); return; }

    // Rod in the right hand (out of the window when driving), tilted by phase.
    const drive = ctx.state.mode === 'drive', h = P.heading, rx = Math.cos(h), rz = -Math.sin(h);
    const off = drive ? 0.95 : 0.4;
    W.rod.position.set(P.x + rx*off + Math.sin(h)*0.2, drive ? 1.25 : 0.85, P.z + rz*off + Math.cos(h)*0.2);
    let tilt = 0.75;
    if(S.phase === 'cast') tilt = S.t < 0.25 ? 0.75 - S.t/0.25*1.2 : Math.min(1.25, -0.45 + (S.t - 0.25)*9);
    else if(S.phase === 'wait') tilt = 1.15 + Math.sin(t*1.7)*0.02;
    else if(S.phase === 'bite') tilt = 1.3 + Math.sin(t*40)*0.06;
    else if(S.phase === 'reel') tilt = 1.0 + Math.sin(t*22)*0.08 + 0.25*Math.abs(Math.sin(t*3));
    else if(S.phase === 'back') tilt = 0.9 - Math.min(0.3, S.t);
    else if(S.phase === 'catch') tilt = 0.25;
    W.rod.rotation.set(tilt, h, 0);
    W.rod.updateMatrixWorld(); tip.copy(W.tipLocal).applyMatrix4(W.rod.matrixWorld);

    // Bobber.
    const B = W.bobber.position;
    if(S.phase === 'ready'){ W.bobber.visible = false; }
    else if(S.phase === 'cast'){
      if(S.t < 0.25){ W.bobber.visible = true; B.copy(tip); from.copy(tip); }
      else {
        const k = Math.min(1, (S.t - 0.25)/0.75);
        B.lerpVectors(from, land, k); B.y = from.y + (land.y - from.y)*k + Math.sin(k*Math.PI)*2.6;
        if(k >= 1) startWait();
      }
    }
    else if(S.phase === 'wait'){
      B.set(land.x, WY + 0.05 + Math.sin(t*3)*0.04, land.z);
      for(const n of S.nibbles) if(S.t > n && S.t < n + 0.18){ B.y -= 0.1; if(!S.nib || S.nib !== n){ S.nib = n; K.sfx.tick(); } }
      if(S.t >= S.waitFor) bite();
    }
    else if(S.phase === 'bite'){
      B.set(land.x + Math.sin(t*31)*0.08, WY - 0.12 + Math.sin(t*25)*0.06, land.z + Math.cos(t*27)*0.08);
      W.bang.position.set(B.x, 1.5 + Math.sin(t*12)*0.08, B.z);
      const pop = Math.min(1, S.t/0.12); W.bang.scale.setScalar((0.2 + 0.9*pop + (pop < 1 ? 0.2 : 0))*1.2);
      if(S.t > (tour ? 1.5 : 1.0)){ W.bang.visible = false; K.toast('Too slow! It swam off', 'bad'); K.sfx.bad(); reelBack(); }
    }
    else if(S.phase === 'reel'){
      B.set(land.x + Math.sin(t*9)*0.25, WY - 0.05, land.z + Math.cos(t*7)*0.25);
      S.needle = 0.5 + 0.5*Math.sin(S.t*S.kind.speed*(tour ? 0.8 : 1) - Math.PI/2);
      needleEl.style.left = (S.needle*100) + '%';
      if(S.t > 5){ K.toast('It wriggled free', 'bad'); K.sfx.bad(); reelBack(); }
    }
    else if(S.phase === 'back'){
      const k = Math.min(1, S.t/0.6); B.lerpVectors(land, tip, k); B.y += Math.sin(k*Math.PI)*0.6;
      if(k >= 1) ready(false);
    }
    else if(S.phase === 'catch'){
      // The catch arcs up out of the water to above the player's head, wiggles, then shrinks away.
      const k = Math.min(1, S.t/0.7), Pr = W.prize.position;
      fly.to.set(P.x, drive ? 3.2 : 2.7, P.z);
      Pr.lerpVectors(fly.from, fly.to, k); Pr.y += Math.sin(k*Math.PI)*2.2;
      W.prize.rotation.set(Math.sin(t*14)*0.3*(k >= 1 ? 1 : 0), h + (1 - k)*6 + (k >= 1 ? Math.sin(t*3)*0.4 : 0), k < 1 ? k*Math.PI*2 : Math.sin(t*18)*0.25);
      const sc = 1.5*(k < 1 ? 0.6 + 0.4*k : 1 + 0.08*Math.sin(t*12));
      W.prize.scale.setScalar(S.t > 2.1 ? Math.max(0.001, sc*(1 - (S.t - 2.1)/0.3)) : sc);
      if(S.t > 2.4){ W.prize.visible = false; if(!tour) ready(false); }
    }
    // Line: from the rod tip to the bobber, sagging when slack and taut while a fish pulls.
    if(W.bobber.visible){
      W.line.visible = true;
      const a = W.line.geometry.attributes.position, sag = S.phase === 'reel' || S.phase === 'bite' ? 0.05 : S.phase === 'wait' ? 0.9 : 0.3;
      for(let i=0;i<LN_;i++){ const u = i/(LN_ - 1); tmp.lerpVectors(tip, B, u); tmp.y -= Math.sin(u*Math.PI)*sag; a.setXYZ(i, tmp.x, tmp.y + (i === LN_ - 1 ? 0.14 : 0), tmp.z); }
      a.needsUpdate = true;
    } else W.line.visible = false;
    tickSplash(dt);
  }
  const LN_ = W.line.geometry.attributes.position.count;
  function tickSplash(dt){
    if(!W.ring.visible) return;
    splash.t += dt; const k = splash.t/0.7;
    if(k >= 1){ W.ring.visible = W.drops.visible = false; return; }
    W.ring.position.set(splash.x, WY + 0.04, splash.z); W.ring.scale.setScalar((1 + k*4)*splash.s); W.ring.material.opacity = 0.9*(1 - k);
    for(let i=0;i<10;i++){ const v = splash.v[i], p = splash.p[i]; v.y -= 14*dt; p.addScaledVector(v, dt); dummy.position.copy(p); dummy.scale.setScalar(p.y < WY ? 0.001 : 1 - k*0.6); dummy.updateMatrix(); W.drops.setMatrixAt(i, dummy.matrix); }
    W.drops.instanceMatrix.needsUpdate = true;
  }

  return {
    update(dt, t, mode){ try { update(dt, t, mode); } catch(e){ console.error('[fishing] frame failed; closing', e); api.stop(); } },
    stop(){
      stopped = true; offs.forEach(o => { try { o?.(); } catch {} });
      W.rod.visible = W.bobber.visible = W.line.visible = W.bang.visible = W.prize.visible = W.ring.visible = W.drops.visible = false;
      K.destroy();
    },
    state: () => ({ phase: S.phase, fish: S.fish, boots: S.boots, berries: S.berries, catches: S.catches, casts: S.casts, kind: S.kind?.id ?? null, needle: +S.needle.toFixed(2), zone: S.zone.map(v => +v.toFixed(2)), tour, log: S.log.slice() }),
    // 'start' skips the intro. Test commands: 'cast', 'bite' (bite now), 'hook', 'land' (needle into the green and stop),
    // 'berry' / 'boot' / 'guppy' ... (the next bite is that kind), 'miss', 'end'.
    debug(cmd){
      if(cmd !== 'start') S.test = true;
      if(cmd === 'start' && S.phase === 'intro'){ K.closeCard(); ready(true); }
      else if(cmd === 'cast' && S.phase === 'ready') cast();
      else if(cmd === 'bite' && S.phase === 'wait') S.t = S.waitFor;
      else if(cmd === 'hook' && S.phase === 'bite') hook();
      else if(cmd === 'land' && S.phase === 'reel'){ S.needle = (S.zone[0] + S.zone[1])/2; landIt(); }
      else if(cmd === 'miss' && S.phase === 'reel'){ S.needle = S.zone[0] > 0.5 ? 0 : 1; stopNeedle(); }
      else if(KINDS.some(k => k.id === cmd)) S.force = cmd;
      else if(cmd === 'end') finish();
      return S.phase;
    },
  };
}
