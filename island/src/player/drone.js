// Drone. Owned by the drone builder (round 5).
// A cardboard box at the spawn plaza with a controller on top. On foot, F by the box picks up the
// controller: the flaps pop open, the quadcopter spins up and rises out, and a halftone wipe hands
// the camera to a god's-eye view that follows it (camera.js setMode('god') + setTarget).
//   WASD / arrows fly (relative to the screen), Space climbs, Shift descends.
//   F   land here: the drone sets down and the walker is put beside it.
//   C   land next to me: the drone flies back and lands beside the walker. Esc does the same.
// Either way the view comes back to the walker (first person too, if it was on), the controller
// pops back onto the box, and the drone flies itself home and the flaps close, ready again.
//
// Keys while piloting: F, Enter, C, Esc and the other action keys are caught on window in the
// capture phase, so the walker, the car call and core never see them. Movement keys still land in
// ctx.input.keys (keyboard, touch or synthetic); a hook at order 9 lifts them out before the walker
// (order 10) reads them and puts them back at order 11, so the walker stands still while the drone
// reads the same keys.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { codeOf } from '../core/input.js';

const BOX_W = 1.8, BOX_H = 0.95, DOCK_Y = 0.1, LAUNCH_Y = 3.2, USE_R = 2.8;
const MAXV = 13, CLIMB = 6, MIN_ALT = 1.2, MAX_ALT = 24;
const TIP = 0.51, PROP_R = 0.34;   // arm tips sit on the diagonals, so docked the props just fit the box
const OWN = new Set(['KeyF', 'Enter', 'NumpadEnter', 'KeyC', 'Escape', 'KeyV', 'KeyQ', 'KeyE', 'KeyH', 'KeyR']);
const HINT = '<kbd>WASD</kbd> fly · <kbd>Space</kbd> up · <kbd>Shift</kbd> down · <kbd>F</kbd> land here · <kbd>C</kbd> land next to me · <kbd>Esc</kbd> cancel';

const CSS = `
#drone-prompt{position:fixed;left:0;top:0;z-index:6;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:0;border-radius:999px;background:#1f2a44;color:#fffaf0;
  font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap;box-shadow:0 4px 0 #00000026;cursor:pointer;touch-action:manipulation;
  opacity:0;pointer-events:none;transform:translate(-50%,-100%) scale(.6);transition:opacity .16s ease,transform .22s cubic-bezier(.3,1.6,.5,1)}
#drone-prompt.on{opacity:1;pointer-events:auto;transform:translate(-50%,-100%) scale(1)}
#drone-prompt.info{padding-left:12px;cursor:default}
#drone-prompt.info .k{display:none}
#drone-prompt .k{width:22px;height:22px;display:grid;place-items:center;position:relative;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
#drone-prompt .k::before{content:"";position:absolute;inset:2px;background:#ffd166;border-radius:4px;transform:rotate(45deg)}
#drone-prompt .k b{position:relative}
#drone-wipe{position:fixed;inset:0;z-index:9;pointer-events:none;width:100%;height:100%}
#drone-pad{position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:6;display:none;flex-direction:column;gap:8px}
#drone-pad button{appearance:none;border:0;min-width:62px;height:46px;padding:0 14px;border-radius:16px;background:#fffaf0;color:#1f2a44;box-shadow:0 4px 0 #0000001f;
  font:600 14px/1 Fredoka,system-ui,sans-serif;touch-action:none}
#drone-pad button.on{transform:translateY(3px);box-shadow:0 1px 0 #0000001f;background:#f1e9d8}
#drone-pad .row{display:flex;gap:8px}
@media (pointer:coarse){#drone-pad.on{display:flex}}
@media (prefers-reduced-motion:reduce){#drone-prompt{transition:none}}`;

// Small seeded stream for blinks, so the island's shared rng is never touched.
function prng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function init(ctx){
  const { THREE, scene, state, bus, input, helpers: H } = ctx;
  const TAU = Math.PI*2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const damp = (a, b, rate, dt) => a + (b - a)*(1 - Math.exp(-rate*dt));
  const wrap = a => a - TAU*Math.floor((a + Math.PI)/TAU);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t*t*(3 - 2*t);
  const backOut = t => { t = clamp(t, 0, 1) - 1; return 1 + t*t*(2.4*t + 1.4); };
  const rand = prng(0xD120);

  /* ---------- geometry: vertex-coloured parts merged into one mesh per material ---------- */
  function part(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]){
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
    const out = geo.clone().applyMatrix4(m);
    for(const k of Object.keys(out.attributes)) if(k !== 'position' && k !== 'normal') out.deleteAttribute(k);
    const c = new THREE.Color(color), n = out.attributes.position.count, col = new Float32Array(n*3);
    for(let i = 0; i < n; i++){ col[i*3] = c.r; col[i*3 + 1] = c.g; col[i*3 + 2] = c.b; }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  const merge = list => mergeGeometries(list, false);
  const vcMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.55 });
  const card = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.9 });
  const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const Cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
  const Ball = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);

  /* ---------- where the box goes ---------- */
  // A ring inside the plaza disc (r 9), scored like the hunt basket: away from the road spokes,
  // colliders, game pads, props (the ANDREW LIU blocks), the car's spawn, and the garage's pads if
  // garage.js publishes them (pads / spots [{x, z, r}]); near the garage building if it gives a
  // position. Deterministic, so the box is always in the same place for the same island.
  const Lay = () => ctx.modules.map?.layout;
  function edgeDist(c, x, z){
    if(c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) - c.r;
    const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = x - c.x, dz = z - c.z;
    const lx = Math.abs(dx*co - dz*si) - c.hw, lz = Math.abs(dx*si + dz*co) - c.hd;
    return lx > 0 || lz > 0 ? Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) : Math.max(lx, lz);
  }
  function garageSpots(){
    const g = ctx.modules.garage, out = [];
    for(const p of [].concat(g?.pads || [], g?.spots || [])) if(Number.isFinite(p?.x) && Number.isFinite(p?.z)) out.push({ x:p.x, z:p.z, r:p.r || 3 });
    const gp = g?.position || g?.group?.position;
    const home = gp && Number.isFinite(gp.x) && Number.isFinite(gp.z) ? { x:gp.x, z:gp.z } : null;
    return { pads:out, home };
  }
  function pickSpot(){
    const L = Lay(), sp = ctx.island.spawn || { x:0, z:6 }, gar = garageSpots();
    const stations = ctx.modules.games?.stations || [];
    const props = (ctx.props || []).map(p => p.body?.position).filter(Boolean);
    let best = { x:5.6, z:3.3 }, bs = -1e9;
    for(const r of [6.5, 7.5, 8.5]) for(let i = 0; i < 36; i++){
      const a = i/36*TAU, x = Math.cos(a)*r, z = Math.sin(a)*r;
      let s = 3;
      if(L?.roadDistAt) s = Math.min(s, L.roadDistAt(x, z) - 4.6);
      if(L?.landAt && !L.landAt(x, z)) continue;
      for(const c of ctx.colliders) s = Math.min(s, edgeDist(c, x, z) - 1.6);
      for(const st of stations) s = Math.min(s, Math.hypot(x - st.x, z - st.z) - (st.r || 2) - 1.6);
      for(const p of props) s = Math.min(s, Math.hypot(x - p.x, z - p.z) - 1.8);
      for(const p of gar.pads) s = Math.min(s, Math.hypot(x - p.x, z - p.z) - p.r - 1.4);
      s = Math.min(s, Math.hypot(x - sp.x, z - sp.z) - 5);
      if(gar.home) s -= Math.hypot(x - gar.home.x, z - gar.home.z)*0.05;
      s -= (r - 6.5)*0.1;
      if(s > bs){ bs = s; best = { x, z }; }
    }
    return best;
  }
  const spot = pickSpot();
  const BX = spot.x, BZ = spot.z, BANG = Math.atan2(-BX, -BZ);   // the printed face looks at the plaza centre
  H.solidCircle(BX, BZ, 1.15, BOX_H);

  /* ---------- the box: body, four flaps on hinges, a printed side ---------- */
  const boxG = new THREE.Group(); boxG.position.set(BX, 0, BZ); boxG.rotation.y = BANG; scene.add(boxG);
  const bodyGeo = part(Box(BOX_W, BOX_H, BOX_W), '#c98f58', [0, BOX_H/2, 0]);
  // BoxGeometry face order is +x, -x, +y, -y, +z, -z, four vertices each: darken +y so the open
  // top reads as the shadowy inside of the box.
  { const col = bodyGeo.attributes.color, c = new THREE.Color('#5a3a1e'); for(let i = 8; i < 12; i++) col.setXYZ(i, c.r, c.g, c.b); }
  const boxBody = new THREE.Mesh(merge([bodyGeo,
    part(Box(BOX_W + 0.02, 0.12, 0.24), '#e8d4a8', [0, BOX_H - 0.065, BOX_W/2 - 0.1]),    // tape over the top front edge (kept under the top face)
  ]), card);
  boxBody.castShadow = boxBody.receiveShadow = true; boxG.add(boxBody);
  const flaps = [];
  const flapX = s => {   // hinge on the +-x top edge, flap lies inward to the centre seam
    const g = new THREE.Group(); g.position.set(s*BOX_W/2, BOX_H, 0); boxG.add(g);
    const m = new THREE.Mesh(merge([part(Box(BOX_W/2, 0.04, BOX_W), '#d49a60', [-s*BOX_W/4, 0.03, 0]),
      part(Box(0.16, 0.012, BOX_W + 0.01), '#e8d4a8', [-s*(BOX_W/2 - 0.08), 0.056, 0])]), card);
    m.castShadow = true; g.add(m); flaps.push({ g, axis:'z', sign:-s, delay:0 });
  };
  const flapZ = s => {   // shorter flaps on the +-z edges, tucked under the long ones
    const g = new THREE.Group(); g.position.set(0, BOX_H, s*BOX_W/2); boxG.add(g);
    const m = new THREE.Mesh(part(Box(BOX_W - 0.04, 0.03, 0.45), '#bf8650', [0, 0.012, -s*0.225]), card);
    m.castShadow = true; g.add(m); flaps.push({ g, axis:'x', sign:s, delay:0.12 });
  };
  flapX(1); flapX(-1); flapZ(1); flapZ(-1);
  function setFlaps(open){
    for(const f of flaps){
      const k = ease((open - f.delay)/(1 - f.delay))*2.25*f.sign;
      if(f.axis === 'z') f.g.rotation.z = k; else f.g.rotation.x = k;
    }
  }
  const printed = H.canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#c98f58'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a2412'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 54px Fredoka, sans-serif'; g.fillText('DRONE', w/2, 52);
    g.font = '600 18px Fredoka, sans-serif'; g.fillText('THIS SIDE UP', w/2, 102);
    g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#3a2412';
    for(const x of [28, w - 28]){ g.beginPath(); g.moveTo(x, 108); g.lineTo(x, 40); g.moveTo(x - 13, 55); g.lineTo(x, 40); g.lineTo(x + 13, 55); g.stroke(); }
  });
  const printM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map:printed.tex, roughness:.9 }));
  printM.position.set(0, 0.42, BOX_W/2 + 0.006); boxG.add(printM);
  const boxTop = () => new THREE.Vector3(BX, BOX_H + 0.1, BZ);

  /* ---------- the controller ---------- */
  const ctrl = new THREE.Mesh(merge([
    part(Box(0.46, 0.1, 0.22), '#26306b'),
    part(Cyl(0.08, 0.08, 0.1, 12), '#26306b', [-0.22, 0, -0.03], [0, 0, 0], [1, 1, 1.3]),
    part(Cyl(0.08, 0.08, 0.1, 12), '#26306b', [0.22, 0, -0.03], [0, 0, 0], [1, 1, 1.3]),
    part(Cyl(0.025, 0.025, 0.08, 8), '#fffaf0', [-0.12, 0.08, 0]), part(Ball(0.045, 10, 8), '#ff6b6b', [-0.12, 0.13, 0]),
    part(Cyl(0.025, 0.025, 0.08, 8), '#fffaf0', [0.12, 0.08, 0]), part(Ball(0.045, 10, 8), '#06d6a0', [0.12, 0.13, 0]),
    part(Cyl(0.012, 0.012, 0.34, 6), '#9aa3c7', [0.18, 0.2, -0.08], [-0.25, 0, 0]), part(Ball(0.03, 8, 6), '#ff6b6b', [0.18, 0.36, -0.13]),
    part(Box(0.12, 0.04, 0.05), '#ffd166', [0, 0.06, 0.05]),
  ]), vcMat);
  ctrl.castShadow = true; scene.add(ctrl);
  const C = { mode:'box', t:0, from:new THREE.Vector3(), pop:1 };   // mode: box | toHand | hand
  const handAt = out => { const P = state.player, h = P.heading || 0; return out.set(P.x + Math.sin(h)*0.42, 1.02, P.z + Math.cos(h)*0.42); };

  /* ---------- the drone: an X of four arms, a prop at each tip, a round pod with two LED eyes ---------- */
  const drone = new THREE.Group(); scene.add(drone);          // yaw
  const tilt = new THREE.Group(); drone.add(tilt);             // pitch, roll and hover bob
  const tips = [[TIP, TIP], [-TIP, TIP], [-TIP, -TIP], [TIP, -TIP]];   // front-left, front-right, back-right, back-left (+z is forward, +x is left)
  const frameParts = [
    part(Ball(0.34, 22, 16), '#fffaf0', [0, 0.42, 0], [0, 0, 0], [1.1, 0.78, 1.25]),
    part(new THREE.SphereGeometry(0.33, 20, 10, 0, TAU, 0, Math.PI/2), '#ff6b6b', [0, 0.47, 0], [0, 0, 0], [1.12, 0.85, 1.22]),
    part(Ball(0.2, 18, 12), '#1f2a44', [0, 0.43, 0.34], [0, 0, 0], [1.35, 0.78, 0.55]),
    part(Box(1.62, 0.07, 0.11), '#3a4466', [0, 0.5, 0], [0, Math.PI/4, 0]),
    part(Box(1.62, 0.07, 0.11), '#3a4466', [0, 0.5, 0], [0, -Math.PI/4, 0]),
    part(Cyl(0.025, 0.025, 0.2, 6), '#3a4466', [0, 0.74, -0.2], [-0.3, 0, 0]), part(Ball(0.05, 10, 8), '#ffd166', [0, 0.84, -0.24]),
    part(Box(0.06, 0.05, 0.92), '#3a4466', [0.3, 0.03, 0]), part(Box(0.06, 0.05, 0.92), '#3a4466', [-0.3, 0.03, 0]),
  ];
  for(const [x, z] of [[0.27, 0.24], [-0.27, 0.24], [0.27, -0.24], [-0.27, -0.24]]) frameParts.push(part(Cyl(0.025, 0.025, 0.34, 6), '#3a4466', [x, 0.2, z], [0, 0, x > 0 ? -0.15 : 0.15]));
  for(const [x, z] of tips){ frameParts.push(part(Cyl(0.085, 0.1, 0.16, 14), '#26306b', [x, 0.56, z]), part(Cyl(0.05, 0.05, 0.05, 10), '#ffd166', [x, 0.66, z])); }
  const frame = new THREE.Mesh(merge(frameParts), vcMat); tilt.add(frame);
  // LED eyes on the face panel; one mesh with its origin between them so scale.y blinks both.
  const eyeMat = new THREE.MeshStandardMaterial({ color:'#c9f7ff', emissive:'#4fdcff', emissiveIntensity:1.6, roughness:.3 });
  const eyes = new THREE.Mesh(merge([part(Ball(0.062, 12, 10), '#ffffff', [0.1, 0, 0], [0, 0, 0], [1, 1.4, 0.6]), part(Ball(0.062, 12, 10), '#ffffff', [-0.1, 0, 0], [0, 0, 0], [1, 1.4, 0.6])]), eyeMat);
  eyes.position.set(0, 0.45, 0.445); tilt.add(eyes);
  // Nav lights: red on the left (+x) front motor, green on the right (-x), as on aircraft.
  const red = new THREE.MeshBasicMaterial({ color:'#ff3b3b' }), green = new THREE.MeshBasicMaterial({ color:'#3bff7a' });
  const navGeo = Ball(0.045, 10, 8);
  const navL = new THREE.Mesh(navGeo, red); navL.position.set(TIP + 0.07, 0.5, TIP + 0.07); tilt.add(navL);
  const navR = new THREE.Mesh(navGeo, green); navR.position.set(-TIP - 0.07, 0.5, TIP + 0.07); tilt.add(navR);
  // Props: a two-blade bar per motor, all sharing one geometry.
  const bladeGeo = merge([
    part(Box(PROP_R*2 - 0.1, 0.018, 0.075), '#26306b', [0, 0, 0], [0.18, 0, 0]),
    part(Box(0.07, 0.02, 0.08), '#ff6b6b', [PROP_R - 0.06, 0, 0], [0.18, 0, 0]), part(Box(0.07, 0.02, 0.08), '#ff6b6b', [-PROP_R + 0.06, 0, 0], [-0.18, 0, 0]),
    part(Cyl(0.04, 0.04, 0.04, 10), '#ffd166'),
  ]);
  const props = tips.map(([x, z], i) => { const m = new THREE.Mesh(bladeGeo, vcMat); m.position.set(x, 0.7, z); m.rotation.y = i*0.8; tilt.add(m); return m; });
  // The blur: one merged mesh of four faint discs that fade in with the spin.
  const discMat = new THREE.MeshBasicMaterial({ color:'#e8eeff', transparent:true, opacity:0, depthWrite:false });
  const discs = new THREE.Mesh(merge(tips.map(([x, z]) => { const g = new THREE.CircleGeometry(PROP_R, 28); g.rotateX(-Math.PI/2); g.translate(x, 0.7, z); return g; })), discMat);
  discs.renderOrder = 2; tilt.add(discs);
  drone.traverse(o => { if(o.isMesh) o.castShadow = false; });
  // Soft round shadow on the ground (a radial gradient, not a shadow-map shadow, so it stays soft).
  const shTex = H.canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); gr.addColorStop(0, 'rgba(31,42,68,0.9)'); gr.addColorStop(0.5, 'rgba(31,42,68,0.45)'); gr.addColorStop(1, 'rgba(31,42,68,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const shMat = new THREE.MeshBasicMaterial({ map:shTex.tex, transparent:true, depthWrite:false, opacity:0.5 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), shMat); shadow.rotation.x = -Math.PI/2; shadow.renderOrder = 1; shadow.visible = false; scene.add(shadow);

  /* ---------- state ---------- */
  // phase: docked > launch > fly > descend > landed > rest > return > closing > docked
  const D = { phase:'docked', t:0, x:BX, y:DOCK_Y, z:BZ, vx:0, vy:0, vz:0, heading:BANG, pitch:0, roll:0, spin:0, flaps:0, goal:null, how:null, blink:2, owned:false };
  const view = { x:BX, y:DOCK_Y, z:BZ, heading:BANG, speed:0 };   // the camera's target while the drone has the view
  let viewTaken = false, prevPreset = 'follow', savedHint = null, snapKeys = null, broken = false, whine = 0, dir = new THREE.Vector3();
  const pad = { lift:0 };
  const groundAt = (x, z) => Math.hypot(x, z) < 9 ? 0.11 : 0.04;
  const dockYaw = () => BANG + Math.round(wrap(D.heading - BANG)/(Math.PI/2))*(Math.PI/2);   // fits the box in any quarter turn

  function placeDrone(){
    drone.position.set(D.x, D.y, D.z); drone.rotation.y = D.heading;
    tilt.rotation.set(D.pitch, 0, D.roll);
  }
  placeDrone(); setFlaps(0); ctrl.position.copy(boxTop()); ctrl.rotation.y = BANG;

  /* ---------- UI: prompt pill, halftone wipe, touch pad ---------- */
  const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
  const prompt = document.createElement('button'); prompt.type = 'button'; prompt.id = 'drone-prompt';
  prompt.innerHTML = '<span class="k"><b>F</b></span><span class="lbl"></span>'; document.body.append(prompt);
  prompt.addEventListener('click', () => { if(nearest()) interactNearest(); ctx.renderer.domElement.focus?.({ preventScroll:true }); });
  const lbl = prompt.querySelector('.lbl'), wp = new THREE.Vector3();
  let promptKey = '';
  function showPrompt(text, info, x, y, z){
    if(!text){ if(promptKey){ promptKey = ''; prompt.classList.remove('on'); } return; }
    if(text !== promptKey){ promptKey = text; lbl.textContent = text; prompt.classList.toggle('info', !!info); prompt.classList.add('on'); }
    wp.set(x, y, z).project(ctx.camera);
    if(wp.z > 1){ prompt.classList.remove('on'); promptKey = ''; return; }
    prompt.style.left = `${(wp.x*0.5 + 0.5)*innerWidth}px`; prompt.style.top = `${(-wp.y*0.5 + 0.5)*innerHeight}px`;
  }

  const padEl = document.createElement('div'); padEl.id = 'drone-pad';
  padEl.innerHTML = '<div class="row"><button data-k="up">Up</button><button data-k="down">Down</button></div><div class="row"><button data-k="here">Land here</button><button data-k="me">Land by me</button></div>';
  document.body.append(padEl);
  padEl.querySelectorAll('button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); b.classList.add('on'); if(k === 'up') pad.lift = 1; else if(k === 'down') pad.lift = -1; else land(k); b.setPointerCapture?.(e.pointerId); };
    const off = () => { b.classList.remove('on'); if(k === 'up' || k === 'down') pad.lift = 0; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  });

  // Halftone wipe in the menu's style: ink dots grow out from the drone, the view swaps under full
  // cover, then the dots shrink away from the centre. Stepped per frame so the swap is exact.
  const wipeEl = document.createElement('canvas'); wipeEl.id = 'drone-wipe'; wipeEl.hidden = true; wipeEl.setAttribute('aria-hidden', 'true'); document.body.append(wipeEl);
  const wg = wipeEl.getContext('2d');
  const W = { on:false, t:0, ox:0, oy:0, mid:null, fired:false };
  function drawWipe(cover, ox, oy, inward){
    const w = innerWidth, h = innerHeight;
    if(wipeEl.width !== w || wipeEl.height !== h){ wipeEl.width = w; wipeEl.height = h; }
    wg.clearRect(0, 0, w, h);
    const step = 28, maxR = step*0.76, band = 0.35;
    const maxD = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy)) || 1;
    wg.fillStyle = '#1f2a44'; wg.beginPath();
    for(let y = step/2; y < h + step; y += step){
      const odd = (Math.round((y - step/2)/step) & 1) ? step/2 : 0;
      for(let x = step/2 - odd; x < w + step; x += step){
        const d = Math.hypot(x - ox, y - oy)/maxD;
        const r = ease(inward ? (cover*(1 + band) - d)/band : (cover*(1 + band) - (1 - d))/band)*maxR;
        if(r < 0.6) continue;
        wg.moveTo(x + r, y); wg.arc(x, y, r, 0, TAU);
      }
    }
    wg.fill();
  }
  function startWipe(wx, wy, wz, mid){
    wp.set(wx, wy, wz).project(ctx.camera);
    const onScreen = wp.z < 1 && Math.abs(wp.x) < 1 && Math.abs(wp.y) < 1;
    W.on = true; W.t = 0; W.fired = false; W.mid = mid;
    W.ox = onScreen ? (wp.x*0.5 + 0.5)*innerWidth : innerWidth/2; W.oy = onScreen ? (-wp.y*0.5 + 0.5)*innerHeight : innerHeight/2;
    wipeEl.hidden = false;
    try { ctx.sound.tone(330, 0.32, 'triangle', 0.05, 880); } catch(e){}
  }
  function stepWipe(dt){
    if(!W.on) return;
    const IN = state.reduced ? 0.06 : 0.26, OUT = state.reduced ? 0.06 : 0.36;
    W.t += dt;
    if(!W.fired){
      const c = Math.min(1, W.t/IN); drawWipe(c, W.ox, W.oy, true);
      if(c >= 1){ W.fired = true; W.t = 0; const f = W.mid; W.mid = null; try { f?.(); } catch(e){ console.error('[drone] wipe swap failed', e); } }
    } else {
      const c = 1 - Math.min(1, W.t/OUT); drawWipe(c, innerWidth/2, innerHeight/2, false);
      if(c <= 0){ W.on = false; wg.clearRect(0, 0, wipeEl.width, wipeEl.height); wipeEl.hidden = true; }
    }
  }
  function cancelWipe(){ W.on = false; W.mid = null; wg.clearRect(0, 0, wipeEl.width, wipeEl.height); wipeEl.hidden = true; }

  /* ---------- the view: take it for the drone, give it back to the walker ---------- */
  const cam = () => ctx.modules.camera;
  function takeView(){
    const c = cam();
    const m = c?.mode; prevPreset = m && m !== 'god' ? m : 'follow';
    c?.setTarget?.(view); c?.setMode?.('god'); c?.snap?.(0.45);
    viewTaken = true;
    savedHint = ctx.hud?.hint?.innerHTML ?? null;
    ctx.hud?.setHint?.('walk', HINT);
    padEl.classList.add('on');
  }
  // Hands the keys back too; the view (camera, hint, touch pad) only if the drone had taken it.
  function giveView(){
    D.owned = false; pad.lift = 0;
    C.mode = 'box'; C.pop = 0;                                   // the controller pops back onto the box
    if(!viewTaken) return;
    viewTaken = false;
    const c = cam();
    c?.setTarget?.(null); c?.setMode?.(prevPreset); c?.snap?.();
    if(savedHint != null) ctx.hud?.setHint?.('walk', savedHint);
    savedHint = null;
    padEl.classList.remove('on');
  }

  /* ---------- F at the box: pick up the controller, open up, take off ---------- */
  const blockedUI = () => !!ctx.modules.dialog?.busy?.() || !!ctx.modules.menu?.isOpen?.() || !!ctx.modules.inventory?.isOpen?.() || !!ctx.modules.tracker?.isOpen?.() || !!ctx.modules.games?.active?.();
  function boxDist(){ const P = state.player; return Math.hypot(P.x - BX, P.z - BZ); }
  function nearest(){
    if(!state.started || broken || state.mode !== 'walk' || D.phase !== 'docked' || W.on || blockedUI()) return null;
    const d = boxDist();
    return d <= USE_R ? { kind:'drone', dist:+d.toFixed(2) } : null;
  }
  function interactNearest(){
    if(!nearest()) return false;
    input.clear();
    D.phase = 'launch'; D.t = 0; D.x = BX; D.z = BZ; D.y = DOCK_Y; D.vx = D.vy = D.vz = 0; D.heading = dockYaw();
    C.mode = 'toHand'; C.t = 0; C.from.copy(ctrl.position);
    D.owned = true;                                               // keys are the drone's from here
    try { ctx.sound.sfx.clink(3); } catch(e){}
    return true;
  }

  /* ---------- landing ---------- */
  // A free spot: on land (or a road, which covers the bridges), inside the island, clear of every collider.
  function clearAt(x, z, r){
    if(Math.hypot(x, z) > (ctx.island.radius || 96) - 4) return false;
    const L = Lay();
    if(L?.landAt && !L.landAt(x, z) && !((L.roadDistAt?.(x, z) ?? 9) < 3)) return false;
    for(const c of ctx.colliders) if(edgeDist(c, x, z) < r) return false;
    const car = ctx.modules.car?.car;                            // the parked vehicle is not in ctx.colliders
    if(car && Math.hypot(x - car.x, z - car.z) < 2.4 + r) return false;
    return Math.hypot(x - BX, z - BZ) > 1.2 + r;
  }
  function spotNear(x, z, r){
    if(clearAt(x, z, r)) return { x, z };
    for(let ring = 1; ring <= 18; ring++){
      const n = ring*6;
      for(let i = 0; i < n; i++){ const a = i/n*TAU, px = x + Math.cos(a)*ring*0.9, pz = z + Math.sin(a)*ring*0.9; if(clearAt(px, pz, r)) return { x:px, z:pz }; }
    }
    return null;
  }
  function land(how){
    if(D.phase !== 'fly') return false;
    how = how === 'here' ? 'here' : 'me';
    let g = null;
    if(how === 'here'){
      const s = spotNear(D.x, D.z, 1.1);
      if(s){
        // The walker stands 1.6 m from the drone on the camera's side, so both are in the shot.
        ctx.camera.getWorldDirection(dir); const l = Math.hypot(dir.x, dir.z) || 1, cx = -dir.x/l, cz = -dir.z/l;
        let p = null;
        for(const off of [0, 0.8, -0.8, 1.6, -1.6, Math.PI]){
          const a = Math.atan2(cx, cz) + off, px = s.x + Math.sin(a)*1.6, pz = s.z + Math.cos(a)*1.6;
          if(clearAt(px, pz, 0.5)){ p = { x:px, z:pz, heading:Math.atan2(s.x - px, s.z - pz) }; break; }   // facing the drone
        }
        if(p) g = { x:s.x, z:s.z, player:p, cruise:MIN_ALT, vmax:8 };
      }
      if(!g) how = 'me';                                          // nowhere to stand here: come home instead
    }
    if(how === 'me'){
      const P = state.player, h = P.heading || 0, rx = -Math.cos(h), rz = Math.sin(h), fx = Math.sin(h), fz = Math.cos(h);
      let s = null;
      for(const [ox, oz] of [[rx, rz], [-rx, -rz], [-fx, -fz], [fx, fz]]){ if(clearAt(P.x + ox*1.8, P.z + oz*1.8, 0.9)){ s = { x:P.x + ox*1.8, z:P.z + oz*1.8 }; break; } }
      s = s || spotNear(P.x + rx*1.8, P.z + rz*1.8, 0.9) || { x:P.x + rx*1.8, z:P.z + rz*1.8 };
      g = { x:s.x, z:s.z, player:null, cruise:Math.max(D.y, 6), vmax:16 };
    }
    D.goal = g; D.how = how; D.phase = 'descend'; D.t = 0;
    try { ctx.sound.tone(660, 0.12, 'sine', 0.05, 440); } catch(e){}
    return true;
  }
  function handOff(){
    if(D.how === 'here' && D.goal?.player){
      const p = D.goal.player;
      if(state.mode !== 'walk') ctx.modes.setMode('walk');
      ctx.modes.placePlayer(p.x, p.z, p.heading);
    }
    giveView();
    D.phase = 'rest'; D.t = 0;
  }
  // Instant reset: a teleport, a room, a game or a mode change mid-flight puts everything back.
  function abort(){
    cancelWipe();
    giveView();
    dockNow();
  }
  function dockNow(){
    D.phase = 'docked'; D.t = 0; D.x = BX; D.z = BZ; D.y = DOCK_Y; D.vx = D.vy = D.vz = 0; D.spin = 0; D.flaps = 0; D.pitch = D.roll = 0; D.heading = dockYaw(); D.goal = null;
    setFlaps(0); C.mode = 'box'; C.pop = 1; D.owned = false; pad.lift = 0;
  }
  bus.on('teleport', () => { if(D.phase !== 'docked') abort(); });
  bus.on('game:start', () => { if(D.owned) abort(); });
  bus.on('mode', ({ to }) => { if(D.owned && to !== 'walk') abort(); });

  /* ---------- keys while piloting ---------- */
  const piloting = () => D.owned && state.mode === 'walk';
  addEventListener('keydown', e => {
    if(!piloting() || blockedUI() || !state.started) return;
    const code = codeOf(e); if(!OWN.has(code)) return;
    e.stopPropagation(); e.preventDefault();
    if(!e.repeat) command(code);
  }, true);
  function command(code){
    if(code === 'KeyF' || code === 'Enter' || code === 'NumpadEnter') return land('here');
    if(code === 'KeyC' || code === 'Escape') return land('me');
    return false;
  }
  // Synthetic actions (__island.action, input.trigger) arrive on the bus instead of as key events.
  input.on('interact', () => { if(piloting() && D.phase === 'fly') land('here'); });
  input.on('call', () => { if(piloting() && D.phase === 'fly') land('me'); });
  input.on('exit', () => { if(piloting() && D.phase === 'fly') land('me'); });
  // Lift the movement keys out before the walker reads them (order 10), put them back after.
  const keys = input.keys;
  ctx.onUpdate((dt, t, mode) => {
    snapKeys = null;
    if(mode !== 'walk' || !D.owned) return;
    snapKeys = { ...keys };
    for(const k in keys) keys[k] = false;
  }, 9);
  ctx.onUpdate(() => { if(snapKeys){ for(const k in snapKeys) if(snapKeys[k]) keys[k] = true; } }, 11);

  /* ---------- flight ---------- */
  function resolve(r){
    for(const c of ctx.colliders){
      if(c.kind === 'circle'){
        if(D.y > 3.5) continue;
        const dx = D.x - c.x, dz = D.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if(d < m && d > 1e-5){ D.x = c.x + dx/d*m; D.z = c.z + dz/d*m; }
      } else {
        if(D.y > 8 || c.hw*c.hd < 0.75) continue;               // over the rooftops; skip thin boards
        const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = D.x - c.x, dz = D.z - c.z;
        let lx = dx*co - dz*si, lz = dx*si + dz*co;
        const cx = clamp(lx, -c.hw, c.hw), cz = clamp(lz, -c.hd, c.hd), ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if(d >= r) continue;
        if(d < 1e-5){ if(c.hw - Math.abs(lx) < c.hd - Math.abs(lz)) lx = Math.sign(lx || 1)*(c.hw + r); else lz = Math.sign(lz || 1)*(c.hd + r); }
        else { lx = cx + ex/d*r; lz = cz + ez/d*r; }
        D.x = c.x + lx*co + lz*si; D.z = c.z - lx*si + lz*co;
      }
    }
  }
  function fly(dt){
    const k = snapKeys || keys;
    const f = (k.up ? 1 : 0) - (k.down ? 1 : 0), s = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const u = clamp((k.brake ? 1 : 0) - (k.boost ? 1 : 0) + pad.lift, -1, 1);
    // Screen-relative: W flies away from the camera. Screen right of a ground direction (fx, fz) is (-fz, fx).
    ctx.camera.getWorldDirection(dir); const l = Math.hypot(dir.x, dir.z) || 1, fx = dir.x/l, fz = dir.z/l;
    let mx = fx*f - fz*s, mz = fz*f + fx*s; const ml = Math.hypot(mx, mz); if(ml > 1){ mx /= ml; mz /= ml; }
    D.vx = damp(D.vx, mx*MAXV, 2.6, dt); D.vz = damp(D.vz, mz*MAXV, 2.6, dt); D.vy = damp(D.vy, u*CLIMB, 4, dt);
    D.x += D.vx*dt; D.z += D.vz*dt; D.y += D.vy*dt;
    const g = groundAt(D.x, D.z);
    if(D.y < g + MIN_ALT){ D.y = g + MIN_ALT; if(D.vy < 0) D.vy = 0; }
    if(D.y > MAX_ALT){ D.y = MAX_ALT; if(D.vy > 0) D.vy = 0; }
    const lim = (ctx.island.radius || 96) + 8, r = Math.hypot(D.x, D.z); if(r > lim){ D.x *= lim/r; D.z *= lim/r; }
    resolve(1.0);
  }
  // Autopilot toward (gx, gz): cruise at height until close, then drop to gy.
  function seek(dt, gx, gz, gy, cruise, vmax, dropAt){
    const dx = gx - D.x, dz = gz - D.z, d = Math.hypot(dx, dz);
    const want = Math.min(vmax, d*1.8);
    D.vx = damp(D.vx, d > 1e-4 ? dx/d*want : 0, 4, dt); D.vz = damp(D.vz, d > 1e-4 ? dz/d*want : 0, 4, dt);
    const ty = d > dropAt ? Math.max(cruise, gy) : gy;
    D.vy = damp(D.vy, clamp((ty - D.y)*2.4, -4.5, 5), 5, dt);
    D.x += D.vx*dt; D.z += D.vz*dt; D.y = Math.max(gy, D.y + D.vy*dt);
    return { d, dy:D.y - gy };
  }
  function faceTravel(dt, rate){
    const sp = Math.hypot(D.vx, D.vz);
    if(sp > 1.2) D.heading += wrap(Math.atan2(D.vx, D.vz) - D.heading)*(1 - Math.exp(-rate*dt));
  }

  function step(dt, t){
    D.t += dt;
    switch(D.phase){
      case 'docked': D.spin = damp(D.spin, 0, 3, dt); break;
      case 'launch': {
        D.flaps = clamp((D.t - 0.15)/0.45, 0, 1);
        D.spin = clamp((D.t - 0.3)/0.6, 0, 1);
        if(D.t > 0.15 && D.t - dt <= 0.15) try { ctx.sound.sfx.boing(); } catch(e){}
        D.y = DOCK_Y + (LAUNCH_Y - DOCK_Y)*backOut((D.t - 0.55)/0.9);
        if(D.t >= 1.3 && !W.on) startWipe(D.x, D.y + 0.5, D.z, () => { takeView(); D.phase = 'fly'; D.t = 0; });
        break;
      }
      case 'fly': D.spin = 1; fly(dt); faceTravel(dt, 3); break;
      case 'descend': {
        const g = D.goal, gy = groundAt(g.x, g.z);
        D.spin = 1;
        const r = seek(dt, g.x, g.z, gy, g.cruise, g.vmax, 2.5); faceTravel(dt, 3);
        if(r.d < 0.25 && r.dy < 0.03){ D.x = g.x; D.z = g.z; D.y = gy; D.vx = D.vy = D.vz = 0; D.phase = 'landed'; D.t = 0; try { ctx.sound.sfx.thud(2); } catch(e){} }
        break;
      }
      case 'landed':
        D.spin = damp(D.spin, 0, 5, dt);
        if(D.t > 0.35 && !W.on) startWipe(D.x, D.y + 0.5, D.z, handOff);
        break;
      case 'rest':
        D.spin = damp(D.spin, 0, 5, dt);
        if(D.t > 1.4){ D.phase = 'return'; D.t = 0; }
        break;
      case 'return': {
        D.spin = damp(D.spin, 1, 4, dt);
        if(D.t < 0.4) break;                                      // spin up before lifting off
        const r = seek(dt, BX, BZ, DOCK_Y, 9, 9, 0.3);
        if(r.d > 3) faceTravel(dt, 2.5); else D.heading += wrap(dockYaw() - D.heading)*(1 - Math.exp(-4*dt));
        if(r.d < 0.3 && r.dy < 0.02){ D.x = BX; D.z = BZ; D.y = DOCK_Y; D.vx = D.vy = D.vz = 0; D.heading = dockYaw(); D.phase = 'closing'; D.t = 0; }
        break;
      }
      case 'closing':
        D.spin = damp(D.spin, 0, 6, dt);
        D.flaps = 1 - clamp(D.t/0.5, 0, 1);
        if(D.t >= 0.5){ D.phase = 'docked'; D.t = 0; try { ctx.sound.sfx.thud(1); } catch(e){} }
        break;
    }

    // Tilt toward travel, bob when hovering. Pitch + tips the nose down, roll + drops the right side.
    const h = D.heading, fwdV = D.vx*Math.sin(h) + D.vz*Math.cos(h), rightV = -D.vx*Math.cos(h) + D.vz*Math.sin(h);
    const air = D.phase !== 'docked' && D.phase !== 'closing' && D.phase !== 'landed' && D.phase !== 'rest';
    D.pitch = damp(D.pitch, air ? clamp(fwdV*0.035, -0.42, 0.42) : 0, 6, dt);
    D.roll = damp(D.roll, air ? clamp(rightV*0.035, -0.42, 0.42) : 0, 6, dt);
    const sp = Math.hypot(D.vx, D.vz), hover = air && D.y - groundAt(D.x, D.z) > 0.6 && !state.reduced ? 1 - Math.min(1, sp/6) : 0;
    placeDrone();
    tilt.position.y = Math.sin(t*2.4)*0.07*hover;
    tilt.rotation.z += Math.sin(t*1.7)*0.02*hover;

    // Props and blur, nav lights, eyes.
    for(let i = 0; i < 4; i++) props[i].rotation.y += dt*D.spin*46*(i & 1 ? -1 : 1);
    discMat.opacity = 0.24*D.spin*D.spin; discs.visible = D.spin > 0.05;
    const inside = D.phase === 'docked' || (D.phase === 'closing' && D.t > 0.3);
    drone.visible = !inside;
    const blinkOn = air || D.spin > 0.1 ? (t*1.3) % 1 < 0.5 : true;
    red.color.set(blinkOn ? '#ff3b3b' : '#5a1f1f'); green.color.set(blinkOn ? '#3bff7a' : '#1f5a33');
    D.blink -= dt; if(D.blink < 0) D.blink = 2.2 + rand()*3;
    eyes.scale.y = D.blink < 0.12 ? 0.15 : 1;

    // Ground shadow: shrinks and fades with height.
    const g = groundAt(D.x, D.z), alt = D.y - g;
    shadow.visible = !inside && !(D.phase === 'launch' && D.y < BOX_H);
    shadow.position.set(D.x, g + 0.03, D.z); const ss = 0.8 + Math.min(alt, 20)*0.05; shadow.scale.set(ss, ss, 1);
    shMat.opacity = clamp(0.55 - alt*0.018, 0.14, 0.55);

    // Flaps and the controller.
    setFlaps(D.flaps);
    if(C.mode === 'toHand'){
      C.t = Math.min(1, C.t + dt/0.45);
      handAt(wp); const k = ease(C.t);
      ctrl.position.lerpVectors(C.from, wp, k); ctrl.position.y += Math.sin(C.t*Math.PI)*0.9;
      ctrl.rotation.y = BANG + wrap((state.player.heading || 0) - BANG)*k;
      if(C.t >= 1) C.mode = 'hand';
    } else if(C.mode === 'hand'){
      handAt(ctrl.position); ctrl.rotation.y = state.player.heading || 0;
    } else {
      const near = D.phase === 'docked' && state.mode === 'walk' && boxDist() < USE_R + 1.5;
      C.pop = Math.min(1, C.pop + dt/0.4);
      const sc = C.pop < 1 ? Math.max(0.01, backOut(C.pop)) : 1;
      ctrl.scale.setScalar(sc);
      ctrl.position.set(BX, BOX_H + 0.1 + (near && !state.reduced ? Math.abs(Math.sin(t*5))*0.12 : 0), BZ); ctrl.rotation.y = BANG;
    }
    if(C.mode !== 'box') ctrl.scale.setScalar(1);

    // Camera target and the prop whine (a stream of short tones; silent when sound is off).
    view.x = D.x; view.y = D.y; view.z = D.z; view.heading = sp > 0.5 ? Math.atan2(D.vx, D.vz) : D.heading; view.speed = sp;
    whine -= dt;
    if(whine <= 0 && D.spin > 0.2 && ctx.sound.on){
      whine = 0.08;
      const f = state.focus, near = clamp(1 - Math.hypot(D.x - f.x, D.z - f.z)/40, 0, 1);
      const pitchHz = 170 + D.spin*60 + sp*7 + Math.max(0, D.vy)*10;
      if(near > 0.05) try { ctx.sound.tone(pitchHz, 0.12, 'triangle', 0.028*D.spin*near, pitchHz*1.03); } catch(e){}
    }
  }

  function stepPrompt(){
    if(state.mode !== 'walk' || D.owned || !state.started){ showPrompt(''); return; }
    // F goes to a pickup or a pet first (character.js), so their pills win. Talk is on C, so a talker does not hide this.
    const other = (ctx.modules.inventory?.nearest?.()?.dist ?? 9) <= 1.6 || !!ctx.modules.pets?.nearest?.();
    if(nearest() && !other) showPrompt('Fly the drone', false, BX, BOX_H + 1.1, BZ);
    else if(D.phase !== 'docked' && boxDist() < USE_R) showPrompt('Drone flying home', true, BX, BOX_H + 1.1, BZ);
    else showPrompt('');
  }

  // Order 75: after the walker (10) and the world (50 to 70), before the camera (90) follows the drone.
  ctx.onUpdate((dt, t, mode) => {
    if(broken) return;
    try {
      stepWipe(dt);
      if(mode === 'interior'){ showPrompt(''); return; }
      step(Math.min(dt, 0.05), t);
      stepPrompt();
    } catch(e){
      broken = true; console.error('[drone] frame hook threw; drone parked', e);
      try { abort(); showPrompt(''); } catch(err){}
    }
  }, 75);

  // Minimap: the box, and the drone while it is out.
  ctx.hud?.minimapLayers?.push((g, toMap) => {
    const [bx, by] = toMap(BX, BZ);
    g.fillStyle = '#c98f58'; g.strokeStyle = '#fffaf0'; g.lineWidth = 1.5; g.fillRect(bx - 3.5, by - 3.5, 7, 7); g.strokeRect(bx - 3.5, by - 3.5, 7, 7);
    if(D.phase === 'docked') return;
    const [px, py] = toMap(D.x, D.z);
    g.strokeStyle = '#ff6b6b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px - 4, py - 4); g.lineTo(px + 4, py + 4); g.moveTo(px + 4, py - 4); g.lineTo(px - 4, py + 4); g.stroke();
  });

  const api = {
    active: () => D.owned,
    land,
    nearest,
    interactNearest,
    box: { x:BX, z:BZ },
    phase: () => D.phase,
  };
  // Critic hooks: window.__island.drone
  ctx.expose('drone', {
    ...api,
    info: () => ({ phase:D.phase, owned:D.owned, x:+D.x.toFixed(2), y:+D.y.toFixed(2), z:+D.z.toFixed(2), heading:+D.heading.toFixed(2), speed:+Math.hypot(D.vx, D.vz).toFixed(2),
      spin:+D.spin.toFixed(2), flaps:+D.flaps.toFixed(2), controller:C.mode, box:{ x:+BX.toFixed(2), z:+BZ.toFixed(2) }, camera:cam()?.mode ?? null, wipe:W.on, broken }),
    // Stand 1.9 m from the box on the plaza side, facing it, on foot.
    toBox(){
      if(state.mode === 'interior') ctx.modes.exitInterior();
      if(state.mode !== 'walk') ctx.modes.setMode('walk');
      const a = Math.atan2(-BX, -BZ), x = BX + Math.sin(a)*1.9, z = BZ + Math.cos(a)*1.9;
      ctx.modes.placePlayer(x, z, a + Math.PI);
      return { x:+x.toFixed(2), z:+z.toFixed(2), near:!!nearest() };
    },
    // Fly for ms with a movement intent (f forward, s right, u up; each -1..1), like holding keys.
    fly(f = 1, s = 0, u = 0, ms = 800){
      return new Promise(res => {
        const set = on => { keys.up = on && f > 0; keys.down = on && f < 0; keys.right = on && s > 0; keys.left = on && s < 0; keys.brake = on && u > 0; keys.boost = on && u < 0; };
        set(true); setTimeout(() => { set(false); res(api.phase()); }, ms);
      });
    },
    abort,
  });
  return api;
}
