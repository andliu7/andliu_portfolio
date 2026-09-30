// Island Loop: a one-lap time trial on a ring road that links the outer zone pads.
// setup() lays the track, 8 gates, the start/finish arch and a best-time board once.
// Drive through the start arch (or launch 'race') to open the start card.
import { kit, best, fmtTime, clearance } from './ui.js';
import { barriers } from '../player/assist.js';

export const meta = { title: 'Island Loop Time Trial', zoneId: null, kind: 'world' };

const GATES = 8, WIDTH = 5.4, Y = 0.085;
let T = null;   // the track, built once by setup()

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><rect x="9" y="6" width="3" height="30" rx="1.5" fill="#fff"/><path d="M12 7h20v14H12z" fill="#fff"/><path d="M12 7h5v4.7h-5zM22 7h5v4.7h-5zM17 11.7h5v4.6h-5zM27 11.7h5v4.6h-5zM12 16.3h5V21h-5zM22 16.3h5V21h-5z" fill="#1f2a44"/></svg>`;

/* The loop: map.js may publish ctx.island.raceLoop ([{x,z}] or [[x,z]]); otherwise find the ring
   with the most room. One radius per 5 degree slice, picked by a Viterbi pass (dynamic programming)
   that rewards clearance from every collider, keeps out of each zone's own yard (15 m round its
   centre, where the props and pads live) and charges for sharp radius changes, then smoothed. */
function loopPoints(ctx){
  const given = ctx.island?.raceLoop;
  if(Array.isArray(given) && given.length >= 6) return given.map(p => Array.isArray(p) ? { x:p[0], z:p[1] } : { x:p.x, z:p.z });
  const R = ctx.island?.radius || 90, N = 72, r0 = Math.round(R*0.28), r1 = Math.round(R*0.8), K = r1 - r0 + 1, pref = R*0.44;
  const node = [];
  for(let i=0;i<N;i++){ const a = i/N*Math.PI*2, row = new Float32Array(K); for(let k=0;k<K;k++){ const rr = r0 + k; const x = Math.cos(a)*rr, z = Math.sin(a)*rr; let zp = 0; for(const zn of ctx.zones) zp += Math.max(0, 15 - Math.hypot(x - zn.x, z - zn.z)); row[k] = Math.min(clearance(ctx, x, z), 5) - 0.03*Math.abs(rr - pref) - 0.6*zp; } node.push(row); }
  // Two laps unrolled so the middle lap has no start seam.
  const steps = N*2, score = new Float32Array(K), back = [];
  for(let k=0;k<K;k++) score[k] = node[0][k];
  for(let s=1;s<steps;s++){
    const row = node[s % N], nxt = new Float32Array(K), bk = new Int16Array(K);
    for(let k=0;k<K;k++){ let bs = -1e9, bj = k; for(let d=-2; d<=2; d++){ const j = k + d; if(j < 0 || j >= K) continue; const v = score[j] - 0.5*Math.abs(d); if(v > bs){ bs = v; bj = j; } } nxt[k] = bs + row[k]; bk[k] = bj; }
    score.set(nxt); back.push(bk);
  }
  let k = 0; for(let j=1;j<K;j++) if(score[j] > score[k]) k = j;
  const path = new Array(steps); path[steps - 1] = k;
  for(let s=steps-1; s>0; s--){ k = back[s - 1][k]; path[s - 1] = k; }
  const r = []; for(let i=0;i<N;i++) r[(N/2 + i) % N] = r0 + path[N/2 + i];
  for(let pass=0; pass<2; pass++){ const c = r.slice(); for(let i=0;i<N;i++) r[i] = 0.25*c[(i+N-1)%N] + 0.5*c[i] + 0.25*c[(i+1)%N]; }
  return r.map((rr, i) => { const a = i/N*Math.PI*2; return { x:Math.cos(a)*rr, z:Math.sin(a)*rr }; });
}

function trackTexture(THREE){
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e7b48a'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#dca47a'; for(let i=0;i<40;i++){ g.fillRect((i*37)%120, (i*71)%250, 4, 4); }
  for(let y=0;y<256;y+=32){ g.fillStyle = (y/32)%2 ? '#ffffff' : '#e5484d'; g.fillRect(0, y, 12, 32); g.fillRect(116, y, 12, 32); }
  g.fillStyle = '#fff7e8'; g.fillRect(60, 24, 8, 80); g.fillRect(60, 152, 8, 80);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}
function checkerTexture(THREE, text){
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  for(let x=0;x<32;x++) for(let y=0;y<4;y++){ g.fillStyle = (x + y) % 2 ? '#1f2a44' : '#fffaf0'; g.fillRect(x*16, y*16, 16, 16); }
  g.fillStyle = '#fffaf0'; g.fillRect(120, 6, 272, 52); g.strokeStyle = '#1f2a44'; g.lineWidth = 4; g.strokeRect(120, 6, 272, 52);
  g.fillStyle = '#1f2a44'; g.font = '700 34px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

/* Which loop to race on. First choice: a closed road that map.js lays (ctx.modules.map.layout.roads,
   the 'outer' ring road, else any closed road). The race then only adds gates. Fallback: the ring
   found by loopPoints(), drawn as its own kerbed track. Returns evenly spaced { x, z, tx, tz }. */
function pickLoop(ctx, THREE){
  const L = ctx.modules.map?.layout, roads = Array.isArray(L?.roads) ? L.roads : [];
  let ri = roads.findIndex(r => r.closed && r.name === 'outer'); if(ri < 0) ri = roads.findIndex(r => r.closed && r.pts?.length > 40);
  const src = ri >= 0 ? roads[ri].pts.map(p => ({ x: p.x, z: p.z })) : loopPoints(ctx);
  const onBridge = ri >= 0 && typeof L.onBridge === 'function' ? (x, z) => { const rp = roads[ri].pts; let bk = 0, bd = 1e9; for(let k=0;k<rp.length;k+=2){ const d = (rp[k].x - x)**2 + (rp[k].z - z)**2; if(d < bd){ bd = d; bk = k; } } return L.onBridge(ri, bk); } : () => false;
  const curve = new THREE.CatmullRomCurve3(src.map(p => new THREE.Vector3(p.x, 0, p.z)), true, 'centripetal');
  const len = curve.getLength(), M = Math.max(120, Math.round(len/1.5)), P = curve.getSpacedPoints(M).slice(0, M);
  const pts = P.map((p, i) => { const q = P[(i+1)%M], o = P[(i+M-1)%M]; const tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz) || 1; return { x:p.x, z:p.z, tx:tx/l, tz:tz/l }; });
  return { pts, road: ri >= 0, half: ri >= 0 ? 3.3 : WIDTH/2, step: len/M, onBridge };
}

export function setup(ctx, reg){
  const { THREE, scene, helpers: H } = ctx;
  const loop = pickLoop(ctx, THREE), { pts, half } = loop, M = pts.length, POST = half + 1.4;
  const ahead = m => Math.round(m/loop.step);   // metres along the loop, in samples

  if(!loop.road){
    // Ribbon: one strip mesh, UV v runs along the loop so the kerb texture repeats.
    const pos = [], uv = [], idx = []; let run = 0;
    for(let i=0;i<=M;i++){
      const p = pts[i % M]; if(i) run += Math.hypot(p.x - pts[(i-1) % M].x, p.z - pts[(i-1) % M].z);
      const nx = -p.tz, nz = p.tx;
      pos.push(p.x + nx*WIDTH/2, Y, p.z + nz*WIDTH/2, p.x - nx*WIDTH/2, Y, p.z - nz*WIDTH/2);
      uv.push(0, run/7, 1, run/7);
      if(i < M) idx.push(i*2, i*2+2, i*2+1, i*2+1, i*2+2, i*2+3);   // counter-clockwise from above, so it faces up
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const ribbon = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: trackTexture(THREE), roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    ribbon.receiveShadow = true; ribbon.name = 'race-track'; scene.add(ribbon);
  }

  // A spot is good for a gate when both posts clear every collider, it is off any bridge,
  // and it keeps out of zone yards (cards and doors live there).
  const room = i => { const p = pts[i]; const c = Math.min(clearance(ctx, p.x - p.tz*POST, p.z + p.tx*POST), clearance(ctx, p.x + p.tz*POST, p.z - p.tx*POST));
    let zn = 1e9; for(const z of ctx.zones) zn = Math.min(zn, Math.hypot(p.x - z.x, p.z - z.z));
    return (loop.onBridge(p.x, p.z) ? -20 : 0) + Math.min(c, 3) + Math.min(zn - 18, 0)*0.5; };
  // Start: the roomiest spot, with a nudge toward the east side of the island.
  let start = 0, bestC = -1e9;
  for(let i=0;i<M;i+=2){ const s = room(i) + 0.4*Math.cos(Math.atan2(pts[i].z, pts[i].x) - 0.3); if(s > bestC){ bestC = s; start = i; } }
  const at = k => pts[((start + k) % M + M) % M];
  const slot = k => { if(!k) return 0; const base = Math.round(k*M/GATES); let bi = base, bs = -1e9; for(let d = -ahead(18); d <= ahead(18); d++){ const i = ((start + base + d) % M + M) % M; const s = room(i) - Math.abs(d)*loop.step*0.02; if(s > bs){ bs = s; bi = base + d; } } return bi; };

  // Gates: gate 0 is start/finish; gates 1..7 are checkpoints evenly round the loop.
  const gates = [];
  const postGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 10), barGeo = new THREE.BoxGeometry(1, 0.7, 0.3), capGeo = new THREE.SphereGeometry(0.36, 12, 10);
  for(let k=0;k<GATES;k++){
    const idx = slot(k), p = at(idx); const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(p.tx, p.tz); scene.add(g);
    const postMat = new THREE.MeshStandardMaterial({ color: k ? '#fff4e0' : '#1f2a44', roughness: .7 });
    const flagMat = new THREE.MeshStandardMaterial({ color: k ? '#e98a5a' : '#fffaf0', roughness: .7, emissive: '#000000' });
    for(const s of [-1, 1]){ const m = new THREE.Mesh(postGeo, postMat); m.position.set(s*POST, 2.1, 0); m.castShadow = true; g.add(m); const cap = new THREE.Mesh(capGeo, flagMat); cap.position.set(s*POST, 4.35, 0); g.add(cap); }
    let bar;
    if(k === 0){ bar = new THREE.Mesh(new THREE.BoxGeometry(POST*2 + 0.8, 1.0, 0.3), [postMat, postMat, postMat, postMat, new THREE.MeshStandardMaterial({ map: checkerTexture(THREE, 'START  FINISH'), roughness: .7 }), new THREE.MeshStandardMaterial({ map: checkerTexture(THREE, 'ISLAND LOOP'), roughness: .7 })]); bar.position.y = 4.0; }
    else { bar = new THREE.Mesh(barGeo, flagMat); bar.scale.x = POST*2 + 0.4; bar.position.y = 3.9; }
    bar.castShadow = true; g.add(bar);
    if(k){ const num = H.label(String(k), '#1f2a44', '#fffaf0'); num.scale.set(1.9, 0.54, 1); num.position.y = 4.9; g.add(num); }
    // the posts are solid, so a gate is a real gate
    for(const s of [-1, 1]) H.solidCircle(p.x - p.tz*s*POST, p.z + p.tx*s*POST, 0.3, 4);
    gates.push({ k, idx, x: p.x, z: p.z, tx: p.tx, tz: p.tz, g, postMat, flagMat });
  }

  // Bobbing marker over the next gate and a flat arrow over the car.
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 16), new THREE.MeshStandardMaterial({ color: '#3b4f9e', emissive: '#3b4f9e', emissiveIntensity: .45 }));
  marker.rotation.x = Math.PI; marker.visible = false; scene.add(marker);
  const shape = new THREE.Shape(); shape.moveTo(0, 1.3); shape.lineTo(0.9, 0.1); shape.lineTo(0.35, 0.1); shape.lineTo(0.35, -0.9); shape.lineTo(-0.35, -0.9); shape.lineTo(-0.35, 0.1); shape.lineTo(-0.9, 0.1); shape.closePath();
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#3b4f9e', transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: false }));
  arrow.rotation.order = 'YXZ'; arrow.renderOrder = 5; arrow.visible = false; scene.add(arrow);

  // Best-time board beside the arch on the roomier side, facing cars rolling up to it.
  const g0 = gates[0], off = POST + 3.2; let side = 1, cBest = -1e9;
  for(const s of [-1, 1]){ const x = g0.x - g0.tz*s*off - g0.tx*3, z = g0.z + g0.tx*s*off - g0.tz*3; const c = clearance(ctx, x, z); if(c > cBest){ cBest = c; side = s; } }
  const bx = g0.x - g0.tz*side*off - g0.tx*3, bz = g0.z + g0.tx*side*off - g0.tz*3;
  const boardGroup = new THREE.Group(); boardGroup.position.set(bx, 0, bz); boardGroup.rotation.y = Math.atan2(-g0.tx, -g0.tz) - side*0.35; scene.add(boardGroup);
  const drawBoard = (g, w, h) => {
    const b = best.get('race'); g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd166'; H.F(g, 700, 40); g.fillText('ISLAND LOOP', 24, 56);
    g.fillStyle = '#c9d2ff'; H.F(g, 600, 20); g.fillText(`one lap · ${GATES - 1} gates · beat your best`, 24, 90);
    g.fillStyle = '#fffaf0'; H.F(g, 700, 64); g.fillText(b?.time ? fmtTime(b.time) : '-:--.--', 24, 172);
    g.fillStyle = '#c9d2ff'; H.F(g, 600, 18); g.fillText(b?.time ? 'BEST LAP ON THIS DEVICE' : 'NO LAP YET: DRIVE UNDER THE ARCH', 24, 204);
  };
  H.board(boardGroup, 0, 0, 3.6, 2.2, drawBoard, { frame: '#1f2a44' });
  H.solidBox(bx, bz, boardGroup.rotation.y, 3.9, 0.5, 3);
  const screen = boardGroup.children[0].children.find(c => c.material?.map?.isCanvasTexture);
  const redrawBoard = () => { if(!screen) return; const t = screen.material.map, c = t.image, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); drawBoard(g, c.width, c.height); t.needsUpdate = true; };

  // Minimap: the loop (only when it is our own track), the arch, and the next gate while racing.
  ctx.hud.minimapLayers.push((g, toMap) => {
    if(!loop.road){ g.strokeStyle = '#e7b48a'; g.lineWidth = 3; g.beginPath(); pts.forEach((p, i) => { const [x, y] = toMap(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
    const [sx, sy] = toMap(g0.x, g0.z); g.fillStyle = '#1f2a44'; g.fillRect(sx - 4, sy - 4, 8, 8); g.fillStyle = '#fffaf0'; g.fillRect(sx - 4, sy - 4, 4, 4); g.fillRect(sx, sy, 4, 4);
    if(T.next != null){ const n = gates[T.next % GATES]; const [x, y] = toMap(n.x, n.z); g.fillStyle = '#3b4f9e'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke(); }
  });

  T = { pts, gates, marker, arrow, redrawBoard, next: null, M, start, at, ahead, half, road: loop.road, onBridge: loop.onBridge, POST };
  reg.station({ id: 'race', x: g0.x, z: g0.z, r: half + 0.5, when: m => m === 'drive' || m === 'walk' });
}

function paintGates(next){
  for(const G of T.gates){
    if(G.k === 0){ G.flagMat.emissive.set(next === GATES ? '#3b4f9e' : '#000000'); continue; }
    const passed = next != null && G.k < next, isNext = G.k === next;
    G.flagMat.color.set(isNext ? '#3b4f9e' : passed ? '#6fae4a' : '#e98a5a');
    G.flagMat.emissive.set(isNext ? '#3b4f9e' : '#000000'); G.flagMat.emissiveIntensity = isNext ? 0.5 : 0;
  }
}

export function start(ctx, api){
  if(!T) throw new Error('track was not built');
  const K = kit(ctx, api);
  const S = { phase: 'intro', t0: 0, time: 0, next: null, splits: [], countdown: 0, test: false };
  const rec = () => best.get('race') || null;
  const grid = () => { const p = T.at(-T.ahead(9)); return { x: p.x, z: p.z, h: Math.atan2(p.tx, p.tz) }; };
  const offs = [];
  // Kerb walls line the loop while a lap runs, just outside the gate posts, with a gap on bridges
  // (their own rails keep you on). Up at the countdown, down at the finish or on quitting.
  let walls = null;
  const wallsUp = () => { walls ||= barriers(ctx, T.pts, { closed: true, half: T.POST + 0.4, skip: T.onBridge }); };
  const wallsDown = () => { walls?.remove(); walls = null; };

  // The start gate is a chooser: race the loop, or hand over to the guided tour (tour.js).
  function intro(){
    S.phase = 'intro'; K.hud.show(false);
    const b = rec(), games = ctx.modules.games, hasTour = !!games?.list?.().some(g => g.id === 'tour');
    const c = K.card({ icon: ICON, color: '#e5484d', eyebrow: hasTour ? 'Start gate' : 'Time trial', title: hasTour ? 'Race or tour?' : 'Island Loop',
      body: `Race: one lap of the ${T.road ? 'outer ring road' : 'island loop'}, through the ${GATES - 1} numbered gates in order, then back under the checkered arch.` + (hasTour ? ' Tour: a guide leads you to all 12 buildings and walks you through each one.' : ''),
      stats: [['Best lap', b?.time ? fmtTime(b.time) : 'none yet'], ['Gates', String(GATES - 1)]],
      keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive · <kbd>Shift</kbd> boost · <kbd>Esc</kbd> quit',
      primary: ['Start race', go], secondary: ['Not now', () => api.stop()] });
    if(!hasTour) return;
    const row = c.querySelector('.gm-row'), [race, later] = row.children;
    const tour = document.createElement('button'); tour.type = 'button'; tour.className = 'gm-btn'; tour.dataset.tour = '';
    tour.style.background = '#ffd166'; tour.innerHTML = 'Take the tour <kbd>T</kbd>';
    tour.onclick = () => { K.closeCard(); games.start('tour', { direct: true }); };
    row.insertBefore(tour, later);
    let armed = false; K.later(() => { armed = true; }, 250);   // same guard as the kit's own card keys
    K.capture((code, down) => {
      if(!down || !armed) return;
      if(code === 'Enter' || code === 'Space' || code === 'KeyE') race.click();
      else if(code === 'KeyT') tour.click();
      else if(code === 'Escape') later.click();
    });
  }
  function go(){
    if(ctx.state.mode === 'interior') ctx.modes.exitInterior();
    if(ctx.state.mode !== 'drive') ctx.modes.setMode('drive');
    const g = grid(); ctx.modes.placePlayer(g.x, g.z, g.h); ctx.modules.camera?.setTarget?.(null);
    wallsUp(); S.phase = 'countdown'; S.countdown = 3; S.cd0 = performance.now(); S.next = 1; S.test = false; S.splits = []; S.time = 0; T.next = 1; paintGates(1);
    K.hud.chips([['time', 'Lap time', true], ['gate', 'Gate'], ['best', 'Best']]);
    const b = rec(); K.hud.set('time', fmtTime(0)); K.hud.set('gate', `0/${GATES - 1}`); K.hud.set('best', b?.time ? fmtTime(b.time) : '-'); K.hud.show(true);
    K.big('3'); K.sfx.tick(); K.hint('<kbd>Esc</kbd> quit the race');
  }
  function finish(){
    S.phase = 'done'; wallsDown(); T.next = null; paintGates(null); T.marker.visible = T.arrow.visible = false;
    const old = rec(); const isBest = !S.test && (!old?.time || S.time < old.time);
    if(isBest){ best.set('race', { time: S.time, splits: S.splits.slice() }); T.redrawBoard(); }
    K.hud.set('gate', 'FIN'); K.big('FINISH!', true); isBest ? (K.sfx.win(), K.confetti(80)) : K.sfx.good(4);
    api.end({ time: S.time, best: isBest ? S.time : old?.time ?? null, newBest: isBest, test: S.test });
    K.later(() => {
      K.hint(null); K.hud.show(false);
      const bestT = isBest ? S.time : old?.time;
      K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#e5484d', eyebrow: S.test ? 'Test lap, not saved' : isBest ? 'New best lap' : 'Lap complete', title: fmtTime(S.time),
        body: S.test ? 'A test hook skipped part of this lap, so it does not count as a best.' : isBest ? (old?.time ? `${(old.time - S.time).toFixed(2)} s faster than your old best.` : 'First lap on the board. Now beat it.') : `${(S.time - old.time).toFixed(2)} s off your best. The arch is waiting.`,
        stats: [['This lap', fmtTime(S.time), isBest], ['Best', bestT ? fmtTime(bestT) : 'none yet']],
        primary: ['Race again', go], secondary: ['Done', () => api.stop()] });
    }, 1300);
  }
  function passGate(){
    const k = S.next; const t = S.time; S.splits[k] = t;
    const b = rec(); K.sfx.good(k);
    if(k === GATES){ finish(); return; }
    if(b?.splits?.[k]){ const d = t - b.splits[k]; K.toast(`Gate ${k}  ${d < 0 ? '-' : '+'}${Math.abs(d).toFixed(2)} s`, d < 0 ? 'good' : 'bad'); }
    else K.toast(k === GATES - 1 ? 'Last gate! Back to the arch' : `Gate ${k} of ${GATES - 1}`, 'good');
    S.next = k + 1; T.next = S.next; paintGates(S.next);
    K.hud.set('gate', `${k}/${GATES - 1}`);
  }
  function abandon(){ if(S.phase === 'countdown' || S.phase === 'run'){ api.stop(); } }

  offs.push(ctx.bus.on('action:exit', abandon));
  offs.push(ctx.bus.on('teleport', abandon));
  offs.push(ctx.bus.on('interior:enter', abandon));

  intro();
  return {
    update(dt, t, mode){
      if(S.phase === 'countdown'){
        const g = grid(); ctx.modes.placePlayer(g.x, g.z, g.h);
        const before = Math.ceil(S.countdown); S.countdown = 3 - (performance.now() - S.cd0)/1000; const after = Math.ceil(S.countdown);   // wall clock, so a slow frame never stretches it
        if(after !== before){ if(after > 0){ K.big(String(after)); K.sfx.tick(); } else { K.big('GO!'); K.sfx.go(); S.phase = 'run'; S.t0 = performance.now(); } }
      }
      if(S.phase === 'run'){
        S.time = (performance.now() - S.t0)/1000;
        K.hud.set('time', fmtTime(S.time));
        const P = ctx.state.player, G = T.gates[S.next % GATES];
        if(Math.hypot(P.x - G.x, P.z - G.z) < T.half + 1.6) passGate();
      }
      const racing = S.phase === 'run' || S.phase === 'countdown';
      T.marker.visible = T.arrow.visible = racing && mode !== 'interior';
      if(racing){
        const G = T.gates[S.next % GATES], P = ctx.state.player;
        T.marker.position.set(G.x, 6.2 + Math.sin(t*4)*0.35, G.z); T.marker.rotation.y += dt*2;
        // The arrow shape points +y; tilted flat it points -z, so the yaw is the gate bearing plus half a turn.
        T.arrow.position.set(P.x, 3.4, P.z); T.arrow.rotation.set(-Math.PI/2, Math.atan2(G.x - P.x, G.z - P.z) + Math.PI, 0);
      }
    },
    stop(){ wallsDown(); offs.forEach(f => f?.()); T.next = null; paintGates(null); T.marker.visible = T.arrow.visible = false; K.destroy(); },
    state: () => ({ walls: walls?.count ?? 0, phase: S.phase, time: +S.time.toFixed(2), gate: S.next == null ? 0 : S.next - 1, gates: GATES, best: rec()?.time ?? null }),
    debug(cmd){
      if(cmd === 'start'){ if(S.phase === 'intro' || S.phase === 'done'){ K.closeCard(); go(); } return S.phase; }
      if(cmd === 'gate' && S.phase === 'run'){ S.test = true; const G = T.gates[S.next % GATES]; ctx.modes.placePlayer(G.x - G.tx*6, G.z - G.tz*6, Math.atan2(G.tx, G.tz)); return S.next; }
      if(cmd === 'finish' && S.phase === 'run'){ S.test = true; while(S.phase === 'run') passGate(); return S.time; }
      return S.phase;
    },
  };
}

// Read-only view of the track for tests and other builders: points, gates and the start index.
export const track = () => T && { points: T.pts.map(p => ({ x: p.x, z: p.z })), gates: T.gates.map(G => ({ k: G.k, x: G.x, z: G.z })), half: T.half, onRoad: T.road };
