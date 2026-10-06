// Island Tour: a friendly guide round all 12 buildings, next to the race.
//
// It is a guide, not a game. Launching 'tour' through the registry opens the guide and frees the
// game slot straight away, so the camera orbit, the game pads and the arcade cabinets all keep
// working while touring. The guide pauses itself (card and trail hidden) while another game runs.
//
// Per building: a step card with a glowing trail, an arrow in front of the player and a floating marker
// at the door (travel), then how to go in (arrive), then the room's own tour stops, one per Next,
// with a marker over each and the room camera easing to look at it (inside). Leaving the room
// moves on to the next building. After the dock's rooms the guide walks you out to the end of the pier to
// cast a line (phase 'fish'); one catch and it carries on. Stops come from room.tour ({ id, title, text, at:[x,y,z] });
// without one, one stop per room from room.tourRooms / room.rooms, else one stop for the building.
//
// Keys: N next, B back, T opens the tour, Esc pauses it (progress is kept in localStorage).
// Critic hooks: window.__island.tourGuide. See CONTRACT.md, TOUR.
import { kit } from './ui.js';
import { codeOf } from '../core/input.js';

export const meta = { title: 'Island Tour', zoneId: null, kind: 'guide' };

// North first, round the coast clockwise, then the four buildings in the middle, ending at the mailbox.
const ROUTE = ['blueberry', 'brain', 'studio', 'dock', 'school', 'umd', 'clinic', 'chapel', 'yard', 'now', 'skills', 'contact'];
const SAVE = 'island.tour', ARRIVE = 11, LEAVE = 17, MAXDOTS = 160, GAP = 1.9;
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } };
const writeSave = v => { try { v ? localStorage.setItem(SAVE, JSON.stringify(v)) : localStorage.removeItem(SAVE); } catch {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tr-card{position:absolute;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:min(360px,calc(100% - 24px));box-sizing:border-box;
  background:#fffaf0;border:3px solid #1f2a44;border-radius:24px;box-shadow:0 6px 0 #0000002a,0 18px 40px #3b2a4a2a;padding:12px 16px 14px;
  transform:translateY(24px);opacity:0;transition:transform .3s cubic-bezier(.2,1.5,.4,1),opacity .2s;color:#1f2a44}
.tr-card.show{transform:none;opacity:1}
.tr-top{display:flex;align-items:center;gap:8px}
.tr-eye{flex:1;font:600 11px/1.2 Fredoka,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4b5675}
.tr-end{appearance:none;border:2px solid #1f2a44;background:#fffaf0;border-radius:999px;font:700 11px/1 Fredoka,system-ui,sans-serif;padding:6px 9px;cursor:pointer;color:#1f2a44}
.tr-end kbd{padding:2px 4px}
.tr-dots{display:flex;gap:4px;margin:9px 0 8px}
.tr-dots i{flex:1;height:7px;border-radius:4px;background:#e6dcc8}
.tr-dots i.done{background:#6fae4a}.tr-dots i.cur{background:#3b4f9e;box-shadow:0 0 0 2px #3b4f9e44}
.tr-title{font:700 22px/1.1 Fredoka,system-ui,sans-serif;margin:0}
.tr-sub{font:700 12px/1.3 Fredoka,system-ui,sans-serif;margin:3px 0 0}
.tr-text{margin:7px 0 10px;color:#4b5675;font-size:14px;line-height:1.42}
.tr-how{background:#f4ecdc;border-radius:14px;padding:8px 11px;margin:-2px 0 10px;font:500 13px/1.7 Fredoka,system-ui,sans-serif}
.tr-row{display:flex;gap:7px;flex-wrap:wrap}
.tr-card .gm-btn{padding:9px 12px;font-size:13px;box-shadow:0 3px 0 #1f2a44}
.tr-card .gm-btn[disabled]{opacity:.4;cursor:default}
.tr-card .gm-btn.skip{background:#ffd166}
.tr-pill{position:fixed;left:12px;top:calc(62px + env(safe-area-inset-top,0px));z-index:5;appearance:none;border:0;background:#1f2a44;color:#fffaf0;
  font:600 13px/1 Fredoka,system-ui,sans-serif;padding:10px 14px;border-radius:999px;box-shadow:0 4px 0 #0000001f;cursor:pointer;display:inline-flex;gap:8px;align-items:center}
.tr-pill[hidden]{display:none}
.tr-pill kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:#fffaf0;color:#1f2a44;border-radius:5px;padding:3px 5px}
.tr-pill:focus-visible{outline:3px solid #5b6fd6;outline-offset:2px}
@media (max-width:600px),(pointer:coarse){.tr-card{top:calc(170px + env(safe-area-inset-top,0px));bottom:auto;padding:9px 12px 11px;border-radius:20px}.tr-text{font-size:13px;line-height:1.35;margin:4px 0 8px}.tr-title{font-size:18px}
  .tr-dots{margin:6px 0}.tr-how{font-size:12px;padding:6px 9px}.tr-card .gm-btn{padding:7px 10px;font-size:12px}.tr-card kbd{display:none}
  .tr-pill{left:auto;right:12px;top:calc(168px + env(safe-area-inset-top,0px))}}
@media (prefers-reduced-motion:reduce){.tr-card{transition:none}}
`;

let W = null;   // the guide, built once by setup()

export function setup(ctx){
  const { THREE, scene, helpers: H, bus, state } = ctx;
  if(!document.getElementById('tour-css')){ const s = document.createElement('style'); s.id = 'tour-css'; s.textContent = CSS; document.head.append(s); }
  const zoneOf = id => ctx.zones.find(z => z.id === id);
  const route = ROUTE.filter(zoneOf);
  const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, depthWrite: false, ...o });

  /* ---------- world pieces ---------- */
  // Trail: flat chevrons along the planned path, one instanced mesh.
  const chev = new THREE.Shape(); chev.moveTo(0, 0.55); chev.lineTo(0.62, -0.1); chev.lineTo(0.38, -0.34); chev.lineTo(0, 0.08); chev.lineTo(-0.38, -0.34); chev.lineTo(-0.62, -0.1); chev.closePath();
  const chevGeo = new THREE.ShapeGeometry(chev); chevGeo.rotateX(-Math.PI/2);
  const trail = new THREE.InstancedMesh(chevGeo, glow('#ffd84a', { opacity: .95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), MAXDOTS);
  trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage); trail.frustumCulled = false; trail.count = 0; trail.renderOrder = 3; trail.name = 'tour-trail'; scene.add(trail);
  // Arrow on the ground in front of the player, pointing along the trail (same shape as the race arrow).
  const ash = new THREE.Shape(); ash.moveTo(0, 1.3); ash.lineTo(0.9, 0.1); ash.lineTo(0.35, 0.1); ash.lineTo(0.35, -0.9); ash.lineTo(-0.35, -0.9); ash.lineTo(-0.35, 0.1); ash.lineTo(-0.9, 0.1); ash.closePath();
  const arrowGeo = new THREE.ShapeGeometry(ash); arrowGeo.rotateX(-Math.PI/2);
  const arrow = new THREE.Mesh(arrowGeo, glow('#ffb703', { opacity: .95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  arrow.renderOrder = 4; arrow.visible = false; arrow.scale.setScalar(1.25); scene.add(arrow);
  // Marker: a spinning gem, a soft beam and a pulsing ring on the floor. One for the island door,
  // one that moves into whichever room is being toured.
  function makeMarker(beamH){
    const g = new THREE.Group(); g.visible = false;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), glow('#ffd84a', { transparent: false, depthWrite: true }));
    gem.scale.y = 1.35; g.add(gem);
    const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), glow('#fff3b0', { opacity: .28, side: THREE.BackSide })); halo.scale.y = 1.35; gem.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, beamH, 12, 1, true), glow('#ffe27a', { opacity: .22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.6, 40), glow('#ffd84a', { opacity: .85, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI/2; g.add(ring);
    return { g, gem, beam, ring, beamH };
  }
  const doorMark = makeMarker(26); scene.add(doorMark.g);
  const doorLabel = H.label('Door: go in here', '#1f2a44', '#fffaf0'); doorLabel.scale.set(3.4, 0.97, 1); doorLabel.material.depthTest = false; doorLabel.renderOrder = 7; doorMark.g.add(doorLabel);
  const roomMark = makeMarker(1); roomMark.beam.material.opacity = 0.16;

  /* ---------- path planning: A* on a 3 m grid, roads cheap, water and buildings blocked ---------- */
  let grid = null;
  function buildGrid(){
    const L = ctx.modules.map?.layout, R = (ctx.island?.radius || 120) + 4, C = 3, N = Math.ceil(2*R/C);
    const cost = new Float32Array(N*N), CLEAR = 1.3;
    // Bucket the colliders by grid cell first (3000+ of them), so each cell only tests its neighbours.
    const bucket = Array.from({ length: N*N }, () => null);
    for(const c of ctx.colliders){
      const br = (c.kind === 'circle' ? c.r : Math.hypot(c.hw, c.hd)) + CLEAR + C;
      const i0 = Math.max(0, Math.floor((c.x - br + R)/C)), i1 = Math.min(N - 1, Math.floor((c.x + br + R)/C));
      const j0 = Math.max(0, Math.floor((c.z - br + R)/C)), j1 = Math.min(N - 1, Math.floor((c.z + br + R)/C));
      for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const k = j*N + i; (bucket[k] || (bucket[k] = [])).push(c); }
    }
    const blocked = (k, x, z) => { const list = bucket[k]; if(!list) return false;
      for(const c of list){ let d;
        if(c.kind === 'circle') d = Math.hypot(x - c.x, z - c.z) - c.r;
        else { const dx = x - c.x, dz = z - c.z, ca = Math.cos(c.ang), sa = Math.sin(c.ang); const lx = Math.abs(dx*ca - dz*sa) - c.hw, lz = Math.abs(dx*sa + dz*ca) - c.hd; d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0); }
        if(d < CLEAR) return true; }
      return false; };
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){
      const x = -R + (i + .5)*C, z = -R + (j + .5)*C;
      const road = typeof L?.roadDistAt === 'function' && L.roadDistAt(x, z) < 3.4;
      const wet = typeof L?.landAt === 'function' ? !L.landAt(x, z) : Math.hypot(x, z) > R - 10;
      if(wet && !road) continue;                          // bridges are roads, so they stay open
      if(blocked(j*N + i, x, z)) continue;   // same distance test as clearance() in ui.js
      cost[j*N + i] = road ? 1 : 1.8;
    }
    return { R, C, N, cost, g: new Float32Array(N*N), from: new Int32Array(N*N), shut: new Uint8Array(N*N), heap: [] };
  }
  const cellOf = (G, x, z) => { const i = Math.floor((x + G.R)/G.C), j = Math.floor((z + G.R)/G.C); return i < 0 || j < 0 || i >= G.N || j >= G.N ? -1 : j*G.N + i; };
  function snap(G, x, z){
    const c = cellOf(G, x, z); if(c >= 0 && G.cost[c]) return c;
    const ci = Math.floor((x + G.R)/G.C), cj = Math.floor((z + G.R)/G.C);
    for(let r=1;r<=7;r++){ let best = -1, bd = 1e9;
      for(let dj=-r; dj<=r; dj++) for(let di=-r; di<=r; di++){ if(Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if(i < 0 || j < 0 || i >= G.N || j >= G.N) continue; const k = j*G.N + i; if(!G.cost[k]) continue; const d = di*di + dj*dj; if(d < bd){ bd = d; best = k; } }
      if(best >= 0) return best; }
    return -1;
  }
  // Binary heap of [f, cell] pairs flattened into one array.
  function push(h, f, c){ h.push(f, c); let i = h.length/2 - 1; while(i > 0){ const p = (i - 1) >> 1; if(h[p*2] <= h[i*2]) break; [h[p*2], h[i*2]] = [h[i*2], h[p*2]]; [h[p*2+1], h[i*2+1]] = [h[i*2+1], h[p*2+1]]; i = p; } }
  function pop(h){
    const c = h[1], lc = h.pop(), lf = h.pop(), n = h.length/2; if(!n) return c;
    h[0] = lf; h[1] = lc; let i = 0;
    for(;;){ const l = i*2 + 1, r = l + 1; let m = i; if(l < n && h[l*2] < h[m*2]) m = l; if(r < n && h[r*2] < h[m*2]) m = r; if(m === i) break;
      [h[m*2], h[i*2]] = [h[i*2], h[m*2]]; [h[m*2+1], h[i*2+1]] = [h[i*2+1], h[m*2+1]]; i = m; }
    return c;
  }
  function plan(sx, sz, gx, gz){
    if(!grid) grid = buildGrid();
    const G = grid, N = G.N, s = snap(G, sx, sz), e = snap(G, gx, gz);
    const pts = [{ x: sx, z: sz }];
    if(s >= 0 && e >= 0){
      G.g.fill(Infinity); G.shut.fill(0); G.heap.length = 0; G.g[s] = 0; G.from[s] = -1;
      const ex = e % N, ez = (e / N) | 0;
      push(G.heap, 0, s); let found = false, it = 0;
      while(G.heap.length && it++ < 40000){
        const c = pop(G.heap); if(G.shut[c]) continue; G.shut[c] = 1; if(c === e){ found = true; break; }
        const ci = c % N, cj = (c / N) | 0;
        for(let dj=-1; dj<=1; dj++) for(let di=-1; di<=1; di++){
          if(!di && !dj) continue; const i = ci + di, j = cj + dj; if(i < 0 || j < 0 || i >= N || j >= N) continue;
          const k = j*N + i; if(!G.cost[k] || G.shut[k]) continue;
          if(di && dj && (!G.cost[cj*N + i] || !G.cost[j*N + ci])) continue;   // no squeezing between two blocked corners
          const ng = G.g[c] + (di && dj ? 1.414 : 1)*(G.cost[c] + G.cost[k])*0.5;
          if(ng < G.g[k]){ G.g[k] = ng; G.from[k] = c; push(G.heap, ng + Math.hypot(i - ex, j - ez), k); }
        }
      }
      if(found){ const cells = []; for(let c = e; c >= 0; c = G.from[c]) cells.push(c); cells.reverse();
        for(let n=1; n<cells.length; n++){ const c = cells[n]; pts.push({ x: -G.R + (c % N + .5)*G.C, z: -G.R + (((c / N) | 0) + .5)*G.C }); } }
    }
    pts.push({ x: gx, z: gz });
    // Two rounds of corner cutting (Chaikin) turn the grid staircase into a soft curve.
    let p = pts; for(let r=0;r<2;r++){ const q = [p[0]]; for(let i=0;i<p.length-1;i++){ const a = p[i], b = p[i+1]; q.push({ x: a.x*.75 + b.x*.25, z: a.z*.75 + b.z*.25 }, { x: a.x*.25 + b.x*.75, z: a.z*.25 + b.z*.75 }); } q.push(p[p.length-1]); p = q; }
    // Resample at even spacing.
    const out = [{ x: p[0].x, z: p[0].z }]; let carry = 0, len = 0;
    for(let i=0;i<p.length-1;i++){ const a = p[i], b = p[i+1], d = Math.hypot(b.x - a.x, b.z - a.z); len += d; let s2 = GAP - carry; while(s2 <= d){ out.push({ x: a.x + (b.x - a.x)*s2/d, z: a.z + (b.z - a.z)*s2/d }); s2 += GAP; } carry = d - (s2 - GAP); }
    return { pts: out, len };
  }

  /* ---------- the HUD pill ---------- */
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'tr-pill'; pill.hidden = true;
  document.body.append(pill);
  function paintPill(){
    const sv = loadSave();
    pill.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5z" fill="#ffd84a"/><circle cx="8" cy="6" r="1.8" fill="#1f2a44"/></svg>${sv?.k > 0 ? `Resume tour ${sv.k + 1}/${route.length}` : 'Take the tour'} <kbd>T</kbd>`;
    pill.hidden = !state.started || G.on;
  }
  pill.addEventListener('click', () => { open({}); ctx.renderer.domElement.focus?.({ preventScroll: true }); });
  bus.on('started', () => paintPill());

  /* ---------- the guide ---------- */
  const G = { on: false, k: 0, phase: 'travel', i: 0, stops: null, room: null, zoneId: null, K: null, paused: false,
    path: null, planAt: null, planT: 0, dist: 0, fishDone: false, fishArmed: true, look: { w: 0, want: 0, at: new THREE.Vector3(), baseQ: new THREE.Quaternion(), setQ: new THREE.Quaternion(), cam: null } };
  const cur = () => zoneOf(route[G.k]);
  const inRoom = () => state.mode === 'interior' && state.interior;
  const otherGame = () => { const a = ctx.modules.games?.active?.(); return a && a !== 'tour' ? a : null; };
  const save = () => writeSave(G.phase === 'done' ? null : { k: G.k });
  // The fishing spot at the end of the dock pier, from the station fishing.js registers. null when fishing failed to load.
  const fishSpot = () => ctx.modules.games?.stations?.find(s => s.id === 'fishing') || null;
  function startFishing(){
    if(otherGame()) return;
    G.fishArmed = false;
    ctx.modules.games?.start('fishing', { tour: true });
  }

  // The stops inside a room: room.tour when the interiors builder gave one, else one per room.
  function stopsFor(room, zone){
    const ok = s => s && Array.isArray(s.at) && s.at.length >= 3 && s.at.every(Number.isFinite);
    if(Array.isArray(room.tour) && room.tour.filter(ok).length) return room.tour.filter(ok).map((s, i) => ({ id: s.id ?? String(i), title: s.title || zone.name, text: s.text || '', at: s.at.slice(0, 3) }));
    const rooms = (Array.isArray(room.tourRooms) ? room.tourRooms : Array.isArray(room.rooms) ? room.rooms : []).filter(r => Number.isFinite(r?.cx));
    const pads = 'Glowing pads on the floor are things you can use: stand on one and press F.';
    if(rooms.length) return rooms.map((r, i) => ({ id: r.key || String(i), title: r.name || `Room ${i + 1}`,
      text: i === 0 ? `${zone.title}: ${zone.role}. ${zone.bullets[0] || ''} ${pads}` : `This is the ${r.name || 'next room'}, room ${i + 1} of ${rooms.length} in ${zone.name}. ${i === 1 ? pads : 'Have a look round, then press Next.'}`,
      at: [r.cx, 2.3, -1] }));
    const sp = room.spawn || { x: 0, z: 0 };
    return [{ id: 'room', title: zone.name, text: `${zone.title}: ${zone.role}. ${zone.bullets[0] || ''}`, at: [sp.x, 2.3, sp.z - 4] }];
  }

  /* ---------- card ---------- */
  let card = null, distEl = null;
  function button(label, key, cls, fn, disabled){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-btn ' + cls; b.innerHTML = esc(label) + (key ? ` <kbd>${key}</kbd>` : ''); b.disabled = !!disabled;
    b.onclick = () => { fn(); ctx.renderer.domElement.focus?.({ preventScroll: true }); };
    return b;
  }
  function render(){
    if(!G.K) return;
    if(!card){ card = document.createElement('div'); card.className = 'tr-card on'; card.setAttribute('role', 'region'); card.setAttribute('aria-live', 'polite'); G.K.el.append(card); requestAnimationFrame(() => card?.classList.add('show')); }
    card.classList.toggle('show', !G.paused);
    const z = cur(), n = route.length, how = G.phase === 'arrive' ? howIn() : '';
    let eye = `Island tour · Stop ${Math.min(G.k + 1, n)} of ${n}`, title = z?.name || '', sub = '', text = '';
    if(G.phase === 'travel'){ sub = `<span style="color:${z.color}">Next: ${esc(z.title)}</span> · <span data-dist></span>`; text = `${z.role}. Follow the glowing trail and the arrow to the door, or press Take me there.`; }
    else if(G.phase === 'arrive'){ sub = `<span style="color:${z.color}">You made it</span>`; text = z.bullets[0] || z.role; }
    else if(G.phase === 'inside'){ const s = G.stops[G.i]; title = s.title; sub = `<span style="color:${z.color}">${esc(z.name)}</span> · inside, ${G.i + 1} of ${G.stops.length}`; text = s.text; }
    else if(G.phase === 'fish'){ title = 'Cast a line off the dock'; sub = `<span style="color:${z.color}">Captain Finn's fishing spot</span> · <span data-dist></span>`; text = 'Follow the trail to the end of the pier. Press F to cast, press F again when the ! pops over the bobber, then stop the needle in the green. One catch and we carry on.'; }
    else if(G.phase === 'done'){ eye = `Island tour · ${n} of ${n}`; title = 'Tour complete'; sub = '<span style="color:#6fae4a">Every building visited</span>'; text = 'That is the whole island. The mailbox has the email and GitHub links, and the checkered arch is waiting if you want a timed lap.'; }
    const dots = route.map((_, j) => `<i class="${j < G.k || G.phase === 'done' ? 'done' : j === G.k ? 'cur' : ''}"></i>`).join('');
    card.innerHTML = `<div class="tr-top"><div class="tr-eye">${esc(eye)}</div><button type="button" class="tr-end" data-end>End tour <kbd>Esc</kbd></button></div>
      <div class="tr-dots" aria-hidden="true">${dots}</div><h3 class="tr-title">${esc(title)}</h3><div class="tr-sub">${sub}</div>
      <p class="tr-text">${esc(text)}</p>${how ? `<div class="tr-how">${how}</div>` : ''}<div class="tr-row"></div>`;
    card.querySelector('[data-end]').onclick = () => { close(); ctx.renderer.domElement.focus?.({ preventScroll: true }); };
    distEl = card.querySelector('[data-dist]'); paintDist();
    const row = card.querySelector('.tr-row');
    if(G.phase === 'done'){
      row.append(button('Race the loop', '', 'primary', () => { close(); ctx.modules.games?.start('race'); }), button('Start over', '', '', () => { G.k = 0; go('travel'); }), button('Close', '', '', close));
      return;
    }
    const last = G.k >= n - 1;
    const nextLabel = G.phase === 'travel' ? 'Take me there' : G.phase === 'arrive' ? 'Go inside' : G.phase === 'fish' ? 'Fish here' : G.i < G.stops.length - 1 ? 'Next' : last ? 'Finish' : 'Head out';
    row.append(button('Back', 'B', '', back, G.k === 0 && G.phase === 'travel'), button(nextLabel, 'N', 'primary', next),
      button(last ? 'Skip to the end' : 'Skip to next building', '', 'skip', skip));
  }
  function howIn(){
    const m = state.mode, z = cur();
    const walk = `walk to the glowing door and press <kbd>F</kbd> to go into ${esc(z.name)}`;
    return m === 'drive' ? `Hop out with <kbd>F</kbd>, ${walk}.` : `${walk[0].toUpperCase() + walk.slice(1)}. Or press <b>Go inside</b>.`;
  }
  function paintDist(){ if(distEl) distEl.textContent = G.dist > 0 ? `${Math.max(1, Math.round(G.dist))} m to go` : ''; }

  /* ---------- steps ---------- */
  // Soft walls along the trail come from assist.js while driving in the travel phase; any other
  // phase, a pause, closing or hopping out drops them. ?. keeps the guide working without assist.
  const dropWalls = () => ctx.modules.assist?.clear?.();
  function go(phase){
    G.phase = phase; G.path = null; G.planAt = null;
    if(phase !== 'travel') dropWalls();
    if(phase === 'inside') showStop(false);
    else hideRoomMark();
    save(); render();
  }
  function showStop(ease){
    const s = G.stops?.[G.i]; if(!s || !G.room) return;
    if(roomMark.g.parent !== G.room.scene){ roomMark.g.removeFromParent(); G.room.scene.add(roomMark.g); }
    roomMark.g.visible = true; roomMark.g.position.set(s.at[0], 0, s.at[2]); roomMark.gem.position.y = s.at[1];
    roomMark.beam.scale.y = Math.max(0.2, s.at[1] - 0.5)/roomMark.beamH; roomMark.beam.position.y = Math.max(0.2, s.at[1] - 0.5)/2; roomMark.ring.position.y = 0.04;
    G.look.at.set(s.at[0], s.at[1]*0.7, s.at[2]);
    if(ease){
      // Walk the player over when the stop is out of reach, then ease the camera onto it.
      const P = G.room.player, b = G.room.bounds;
      if(P && Math.hypot(P.x - s.at[0], P.z - s.at[2]) > 3.6){
        let x = s.at[0], z = s.at[2] + 2.2;
        if(b){ x = Math.max(b.minX + 0.8, Math.min(b.maxX - 0.8, x)); z = Math.max(b.minZ + 0.8, Math.min(b.maxZ - 0.8, z)); }
        P.x = x; P.z = z; P.heading = Math.atan2(s.at[0] - x, s.at[2] - z); P.speed = 0;
      }
      G.look.want = 1;
    }
  }
  function hideRoomMark(){ roomMark.g.visible = false; roomMark.g.removeFromParent(); G.look.want = 0; }
  function teleportTo(id){
    const menu = ctx.modules.menu;
    try { if(typeof menu?.go === 'function') return menu.go(id); } catch(e){ console.error('[tour] menu teleport failed', e); }
    return ctx.modes.teleport(id);
  }
  function next(){
    if(!G.on || G.paused) return;
    tone(660, 0.1, 'triangle', 0.07, 880);
    if(G.phase === 'travel'){ teleportTo(route[G.k]); return; }
    if(G.phase === 'arrive'){ ctx.modes.enterInterior(route[G.k]); return; }
    if(G.phase === 'fish'){ startFishing(); return; }
    if(G.phase === 'inside'){
      if(G.i < G.stops.length - 1){ G.i++; showStop(true); render(); return; }
      advance(); return;
    }
  }
  function back(){
    if(!G.on || G.paused) return;
    tone(520, 0.1, 'triangle', 0.06, 440);
    if(G.phase === 'inside'){
      if(G.i > 0){ G.i--; showStop(true); render(); return; }
      G.leaving = true; ctx.modes.exitInterior(); G.leaving = false; go('arrive'); return;
    }
    if(G.phase === 'fish'){ go('arrive'); return; }
    if(G.k > 0){ G.k--; go('travel'); }
  }
  function skip(){
    if(!G.on || G.paused) return;
    if(G.k >= route.length - 1){ finish(); return; }
    G.k++; G.leaving = true; if(inRoom()) ctx.modes.exitInterior(); G.leaving = false;
    go('travel'); teleportTo(route[G.k]);
  }
  // Done with this building: out of the room and on to the next one.
  function advance(){
    // Leaving the dock: first out to the end of the pier for one catch (skip() jumps past this).
    if(route[G.k] === 'dock' && G.phase !== 'fish' && !G.fishDone && fishSpot()){
      G.leaving = true; if(inRoom()) ctx.modes.exitInterior(); G.leaving = false;
      G.fishArmed = true; go('fish'); fishIntro(); return;
    }
    if(G.k >= route.length - 1){ if(inRoom()){ G.leaving = true; ctx.modes.exitInterior(); G.leaving = false; } finish(); return; }
    G.k++; G.leaving = true; if(inRoom()) ctx.modes.exitInterior(); G.leaving = false;
    toast(`On to ${cur().name}`); go('travel');
  }
  function fishIntro(){
    try { ctx.modules.dialog?.say?.({ name: 'Captain Finn', portrait: 'blob', lines: [
      'Ahoy! Before you go, come cast a line off the end of my dock.',
      'Press F to cast. When the ! pops, press F to hook it, then stop the needle in the green.',
    ] })?.catch?.(() => {}); } catch(e){ console.error('[tour] dialog failed', e); }
  }
  function finish(){ go('done'); writeSave(null); ctx.bus.emit('tour:done', {}); tone(523, 0.2, 'triangle', 0.09); setTimeout(() => tone(784, 0.3, 'triangle', 0.09), 140); G.K?.confetti(50); }
  const tone = (...a) => { try { ctx.sound.tone(...a); } catch {} };
  const toast = s => { try { G.K?.toast(s, 'good'); } catch {} };

  function enteredRoom(zoneId, room){
    if(!G.on) return;
    const k = route.indexOf(zoneId); if(k < 0) return;
    G.k = k; G.room = room; G.zoneId = zoneId; G.i = 0;
    G.stops = stopsFor(room, zoneOf(zoneId));
    G.look.cam = null; G.look.w = 0;
    go('inside'); G.look.want = 0.6;
  }

  /* ---------- open and close ---------- */
  let offs = [];
  function begin(k){
    G.k = Math.max(0, Math.min(route.length - 1, k)); G.on = true; G.paused = !!otherGame(); G.fishDone = false;
    paintPill();
    if(inRoom() && route.includes(state.interior.zoneId)) enteredRoom(state.interior.zoneId, state.interior);
    else go('travel');
    tone(660, 0.12, 'triangle', 0.08, 990);
  }
  function open(opts = {}){
    if(G.on || !state.started) return G.on;
    const K = G.K = kit(ctx, { id: 'tour', root: ctx.hud.gameRoot }); card = null;
    offs.push(ctx.bus.on('interior:enter', ({ zoneId, room }) => enteredRoom(zoneId, room)));
    offs.push(ctx.bus.on('interior:exit', ({ zoneId }) => {
      hideRoomMark(); G.room = null;
      if(G.on && !G.leaving && G.phase === 'inside' && zoneId === route[G.k]){ G.i = G.stops.length - 1; advance(); }
    }));
    offs.push(ctx.bus.on('mode', () => { if(state.mode !== 'drive') dropWalls(); if(G.on && G.phase === 'arrive') render(); }));
    offs.push(ctx.bus.on('game:start', ({ id }) => { if(id !== 'tour'){ G.paused = true; dropWalls(); render(); } }));
    offs.push(ctx.bus.on('fishing:catch', () => { if(G.on && G.phase === 'fish') G.fishDone = true; }));
    offs.push(ctx.bus.on('game:stop', ({ id }) => {
      if(id === 'tour' || !G.paused) return;
      G.paused = false;
      if(id === 'fishing' && G.phase === 'fish' && G.fishDone){ toast('Nice catch! On we go'); advance(); return; }
      render();
    }));
    const sv = loadSave(), k = sv?.k > 0 ? sv.k : 0;
    if(opts.direct || opts.resume){ begin(opts.restart ? 0 : k); return true; }
    const z = zoneOf(route[k]);
    const c = K.card({ icon: `<svg viewBox="0 0 40 40" width="40" height="40"><path d="M20 5a10 10 0 0 0-10 10c0 7.6 10 19 10 19s10-11.4 10-19A10 10 0 0 0 20 5z" fill="#fff"/><circle cx="20" cy="15" r="4" fill="#1f2a44"/></svg>`, color: '#3b4f9e',
      eyebrow: k ? 'Welcome back' : 'Guided tour', title: k ? `Resume at ${z.name}?` : 'Island Tour',
      body: k ? `You stopped at stop ${k + 1} of ${route.length}. Pick up there, or start again from the top.`
        : `A guide takes you round all ${route.length} buildings. Follow the glowing trail to each door, go in, and step through the rooms with Next. Drive or walk, it is your call.`,
      stats: [['Buildings', String(route.length)], ['Now at', `${k + 1} of ${route.length}`]],
      keys: '<kbd>N</kbd> next · <kbd>B</kbd> back · <kbd>F</kbd> hop out, open doors and fish · <kbd>Esc</kbd> pause',
      primary: [k ? 'Resume tour' : 'Start the tour', () => begin(k)], secondary: ['Not now', () => close()] });
    if(k){ const row = c.querySelector('.gm-row'); const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-btn'; b.textContent = 'Start over'; b.onclick = () => { K.closeCard(); begin(0); }; row.insertBefore(b, row.children[1]); }
    return true;
  }
  function close(){
    if(!G.K) return;
    if(G.on) save();
    G.on = false; G.paused = false; offs.forEach(f => { try { f(); } catch {} }); offs = []; dropWalls();
    hideRoomMark(); trail.count = 0; arrow.visible = doorMark.g.visible = false;
    restoreLook();
    G.K.destroy(); G.K = null; card = null; distEl = null;
    paintPill();
  }

  /* ---------- keys: N next, B back, T open, Esc pause. Esc is caught before core sees it,
     so pausing the tour inside a room does not also leave the room. ---------- */
  addEventListener('keydown', e => {
    if(!state.started || e.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
    const code = codeOf(e);
    if(code === 'Escape' && G.on && !G.paused && !G.K?.cardOpen && !ctx.modules.menu?.isOpen?.() && !ctx.modules.drone?.active?.() && !ctx.modules.tracker?.isOpen?.()){ e.stopPropagation(); e.preventDefault(); close(); }
  }, true);
  bus.on('key', ({ code, down, repeat }) => {
    if(!down || repeat) return;
    if(code === 'KeyT' && !G.on && !otherGame() && !ctx.modules.menu?.isOpen?.()) open({});
    else if(G.on && !G.paused && !G.K?.cardOpen){ if(code === 'KeyN') next(); else if(code === 'KeyB') back(); }
  });

  /* ---------- per frame ---------- */
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0), lookM = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  let distTick = 0;
  function restoreLook(){ const L = G.look; if(L.cam && L.w > 0 && L.cam.quaternion.equals(L.setQ)) L.cam.quaternion.copy(L.baseQ); L.w = 0; L.want = 0; L.cam = null; }

  ctx.onUpdate((dt, t, mode) => {
    const island = mode !== 'interior';
    const guiding = G.on && !G.paused && (G.phase === 'travel' || G.phase === 'arrive' || G.phase === 'fish') && island;
    if(!guiding){ trail.count = 0; arrow.visible = doorMark.g.visible = false; }
    if(!G.on || G.paused) return;

    if(island && (G.phase === 'travel' || G.phase === 'arrive' || G.phase === 'fish')){
      const z = cur(), fish = G.phase === 'fish', P = state.player;
      const door = (fish && fishSpot()) || ctx.island.doorOf(z.id) || { x: z.x, z: z.z };
      const dd = Math.hypot(P.x - door.x, P.z - door.z);
      doorLabel.visible = !fish;   // the fishing spot has its own sign
      if(G.phase === 'travel' && dd < ARRIVE){ tone(784, 0.18, 'triangle', 0.09, 1046); go('arrive'); }
      else if(G.phase === 'arrive' && dd > LEAVE) go('travel');
      // At the end of the pier the rod comes out by itself; walk 6 m off to re-arm after closing it.
      else if(fish){ if(dd > 6) G.fishArmed = true; else if(dd < 3.2 && G.fishArmed) startFishing(); }
      // Door marker.
      doorMark.g.visible = true; doorMark.g.position.set(door.x, 0, door.z);
      doorMark.gem.position.y = 4.4 + Math.sin(t*2.6)*0.3; doorMark.gem.rotation.y += dt*1.6;
      doorMark.beam.position.y = doorMark.beamH/2; doorMark.ring.position.y = 0.06;
      const pulse = 1 + 0.12*Math.sin(t*4); doorMark.ring.scale.set(pulse, pulse, 1);
      doorLabel.position.y = 5.9 + Math.sin(t*2.6)*0.3;
      // Trail: replan when the player has moved or every couple of seconds.
      G.planT -= dt;
      const trailOn = G.phase === 'travel' || fish;
      if(trailOn && (!G.path || !G.planAt || G.planT <= 0 || Math.hypot(P.x - G.planAt.x, P.z - G.planAt.z) > 4)){
        G.path = plan(P.x, P.z, door.x, door.z); G.planAt = { x: P.x, z: P.z }; G.planT = 2;
        // Refresh the walls on every replan (assist drops them after 5 s without one). Not inside
        // assist's own 12 m arrival radius, or they would be rebuilt there and dropped next frame.
        if(G.phase === 'travel' && mode === 'drive' && dd > 14) ctx.modules.assist?.corridor?.(G.path.pts);
        else dropWalls();
      }
      if(trailOn && G.path){
        const pts = G.path.pts; G.dist = G.path.len;
        // Skip the first few metres (under the car) and show the rest as flowing chevrons.
        let n = 0;
        for(let i=2; i<pts.length - 1 && n < MAXDOTS; i++){
          const a = pts[i], b = pts[i + 1];
          const wave = Math.max(0, Math.sin(t*5 - i*0.55)), fade = Math.min(1, (i - 1)/3, (pts.length - i)/4);
          const s = (0.8 + 0.35*wave)*fade;
          tmpQ.setFromAxisAngle(yAxis, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI);
          tmpP.set(a.x, 0.16 + 0.05*wave, a.z); tmpS.set(s, 1, s);
          trail.setMatrixAt(n++, tmpM.compose(tmpP, tmpQ, tmpS));
        }
        trail.count = n; trail.instanceMatrix.needsUpdate = true;
        // A big arrow on the ground just ahead of the player, toward a point a few metres down the trail.
        const aim = pts[Math.min(pts.length - 1, 4)], ax = aim.x - P.x, az = aim.z - P.z, al = Math.hypot(ax, az) || 1, lead = 3.4 + Math.sin(t*4)*0.25;
        arrow.visible = dd > (fish ? 4 : ARRIVE); arrow.position.set(P.x + ax/al*lead, 0.22, P.z + az/al*lead);
        arrow.rotation.set(0, Math.atan2(ax, az) + Math.PI, 0);
      } else { trail.count = 0; arrow.visible = false; G.dist = dd; }
      if((distTick -= dt) <= 0){ distTick = 0.25; if(G.phase === 'travel' || fish) paintDist(); }
    }

    if(!island && G.phase === 'inside' && roomMark.g.visible){
      roomMark.gem.rotation.y += dt*1.6; roomMark.gem.position.y = (G.stops[G.i]?.at[1] ?? 2.3) + Math.sin(t*2.6)*0.15;
      const pulse = 1 + 0.12*Math.sin(t*4); roomMark.ring.scale.set(pulse, pulse, 1);
    }
  }, 86);

  // Camera ease inside: blend the room camera's own view toward the current stop. It runs after
  // the room and the walker have aimed the camera (80) and before the camera module's orbit (88),
  // so dragging to look around still works on top. Moving the player lets the room take over again.
  ctx.onUpdate((dt, t, mode) => {
    const L = G.look;
    if(mode !== 'interior' || !G.on || G.paused || G.phase !== 'inside' || !G.room){ if(L.cam) restoreLook(); return; }
    const cam = G.room.camera || ctx.interiorCamera; if(!cam?.isPerspectiveCamera) return;
    if(L.cam === cam && L.w > 0 && cam.quaternion.equals(L.setQ)) cam.quaternion.copy(L.baseQ);   // nobody re-aimed it: undo last frame's blend first
    L.cam = cam;
    if((G.room.player?.speed || 0) > 0.6) L.want = 0;
    const target = L.want*0.55;
    L.w += (target - L.w)*(1 - Math.exp(-dt*(target > L.w ? 3 : 2)));
    if(L.w < 0.002){ L.w = 0; return; }
    L.baseQ.copy(cam.quaternion);
    lookM.lookAt(cam.position, L.at, up); tmpQ.setFromRotationMatrix(lookM);
    cam.quaternion.slerp(tmpQ, L.w); L.setQ.copy(cam.quaternion);
  }, 87);

  // Minimap: the trail and the building the guide is heading to.
  ctx.hud.minimapLayers.push((g, toMap) => {
    if(!G.on || G.paused || G.phase === 'done') return;
    const z = cur(); if(!z) return;
    if((G.phase === 'travel' || G.phase === 'fish') && G.path){ g.strokeStyle = '#ffb703'; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); G.path.pts.forEach((p, i) => { const [x, y] = toMap(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); }
    const [x, y] = toMap(z.x, z.z); g.strokeStyle = '#ffd84a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 13, 0, 7); g.stroke();
  });

  W = { open, close };
  ctx.expose('tourGuide', {
    open: (o) => open(o || {}), close, next, back, skip,
    state: () => ({ on: G.on, paused: G.paused, phase: G.phase, stop: G.k + 1, of: route.length, zone: route[G.k], inside: G.phase === 'inside' ? { i: G.i + 1, of: G.stops.length, title: G.stops[G.i]?.title, source: Array.isArray(G.room?.tour) && G.room.tour.length ? 'room.tour' : 'fallback' } : null,
      trail: trail.count, dist: Math.round(G.dist), look: +G.look.w.toFixed(2), saved: loadSave() }),
    route: () => route.slice(),
    goto: k => { if(!G.on) return false; G.k = Math.max(0, Math.min(route.length - 1, k)); go('travel'); return true; },
    plan: (x, z, id) => { const d = ctx.island.doorOf(id); const p = plan(x, z, d.x, d.z); return { n: p.pts.length, len: Math.round(p.len) }; },
  });
  paintPill();
}

// Registry launch (T, the pill, the race gate's chooser, or launchGame('tour')): open the guide,
// then hand the game slot straight back. opts.direct skips the welcome card; opts.restart starts at 1.
export function start(ctx, api){
  if(!W) throw new Error('tour was not set up');
  const opts = api.opts || {};
  setTimeout(() => api.stop(), 0);
  W.open({ direct: !!opts.direct, resume: !!opts.resume, restart: !!opts.restart });
  return {};
}
