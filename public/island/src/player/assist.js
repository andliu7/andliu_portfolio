// Driving assist: the road guide and soft barriers. It only touches the active vehicle's x, z, heading and speed.
// 1. Road guide (G, on by default): eases the heading toward the lane ahead while you drive
//    forward on or near a road. Strongest on bridges, weak on the verge, off on open ground.
//    Any steering input scales it down to nothing, and it lets go once you point off the road.
// 2. Wall sliding moved to car.js (resolveCar), so there is one implementation and nothing here
//    fights it.
// 3. Soft barriers: striped kerb walls with tyre stacks on the corners along a path, used by the
//    race (barriers() below) and by the tour through api.corridor(points).
const KEY = 'island.assist.guide';
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function init(ctx){
  const { THREE, state, input } = ctx;
  const car = () => { const c = ctx.modules.car?.car; return c && Number.isFinite(c.x) && Number.isFinite(c.heading) ? c : null; };
  const lay = () => ctx.modules.map?.layout;

  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch(e){}

  /* ---------- road index: every other road sample, bucketed in 8 m cells ---------- */
  const CELL = 8, cellKey = (i, j) => (i + 512)*1024 + (j + 512);
  let hash = null;
  function buildHash(){
    const L = lay(); if(!Array.isArray(L?.roads)) return null;
    const m = new Map();
    L.roads.forEach((r, ri) => (r.pts || []).forEach((p, k) => {
      if(k % 2) return; const key = cellKey(Math.floor(p.x/CELL), Math.floor(p.z/CELL));
      let b = m.get(key); if(!b) m.set(key, b = []); b.push(ri, k);
    }));
    return m;
  }
  // Unit tangent from the neighbours, so the guide works even if a road has no tx/tz.
  function tangent(r, k){
    const n = r.pts.length, a = r.pts[r.closed ? (k + n - 1) % n : Math.max(0, k - 1)], b = r.pts[r.closed ? (k + 1) % n : Math.min(n - 1, k + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; return [tx/l, tz/l];
  }
  const idx = (r, k) => { const n = r.pts.length; return r.closed ? ((k % n) + n) % n : Math.max(0, Math.min(n - 1, k)); };
  // Nearest road sample within 7.5 m, preferring roads that run the way the car points (junctions).
  function nearestRoad(x, z, hx, hz){
    if(!hash) hash = buildHash(); if(!hash) return null;
    const roads = lay().roads, ci = Math.floor(x/CELL), cj = Math.floor(z/CELL);
    let best = null, bs = 1e9;
    for(let dj=-1; dj<=1; dj++) for(let di=-1; di<=1; di++){
      const b = hash.get(cellKey(ci + di, cj + dj)); if(!b) continue;
      for(let q=0; q<b.length; q+=2){
        const r = roads[b[q]], p = r.pts[b[q+1]], d = Math.hypot(p.x - x, p.z - z); if(d > 7.5) continue;
        const [tx, tz] = tangent(r, b[q+1]), s = d + 4*(1 - Math.abs(tx*hx + tz*hz));
        if(s < bs){ bs = s; best = { ri: b[q], k: b[q+1] }; }
      }
    }
    if(!best) return null;
    const r = roads[best.ri];
    for(const k of [best.k - 1, best.k + 1]){ const kk = idx(r, k), p = r.pts[kk], p0 = r.pts[best.k]; if(Math.hypot(p.x - x, p.z - z) < Math.hypot(p0.x - x, p0.z - z)) best.k = kk; }
    best.r = r; return best;
  }

  /* ---------- the glowing lane line: one ribbon, rewritten in place each frame ---------- */
  const SEG = 26;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1)*6), 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((SEG + 1)*6), 3));
  const li = []; for(let i=0;i<SEG;i++) li.push(i*2, i*2+1, i*2+2, i*2+1, i*2+3, i*2+2); lineGeo.setIndex(li);
  // Additive blending: black vertices vanish, so fading a vertex colour fades that end of the line.
  const lineMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const line = new THREE.Mesh(lineGeo, lineMat); line.frustumCulled = false; line.renderOrder = 4; line.visible = false; line.name = 'assist-lane'; ctx.scene.add(line);
  const glow = new THREE.Color('#ffd84a');
  let lineA = 0;
  function drawLine(r, k, dir, lat){
    const pos = lineGeo.attributes.position.array, col = lineGeo.attributes.color.array;
    for(let i=0;i<=SEG;i++){
      const kk = idx(r, k + dir*(5 + i*2)), p = r.pts[kk], [tx, tz] = tangent(r, kk), nx = -tz, nz = tx, cx = p.x + nx*lat, cz = p.z + nz*lat, w = 0.16;
      pos.set([cx - nx*w, 0.3, cz - nz*w, cx + nx*w, 0.3, cz + nz*w], i*6);
      const f = Math.min(1, i/4, (SEG - i)/8);
      for(let v=0; v<2; v++) col.set([glow.r*f, glow.g*f, glow.b*f], i*6 + v*3);
    }
    lineGeo.attributes.position.needsUpdate = lineGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- 1. road guide, order 11 (after the vehicle moved at 10) ---------- */
  let laneSide = 1, lastRoad = -1;
  const G = { active: false, zone: 'none', w: 0, lat: 0, err: 0 };
  function guide(dt, c){
    G.active = false; G.zone = 'none'; G.w = 0;
    if(!on || c.speed < 2.5) return null;
    const hx = Math.sin(c.heading), hz = Math.cos(c.heading), hit = nearestRoad(c.x, c.z, hx, hz); if(!hit) return null;
    const { r, k, ri } = hit, p = r.pts[k], [tx, tz] = tangent(r, k), nx = -tz, nz = tx;
    const lat = (c.x - p.x)*nx + (c.z - p.z)*nz, a = Math.abs(lat);
    const dir = tx*hx + tz*hz >= 0 ? 1 : -1;
    const bridge = !!lay().onBridge?.(ri, k);
    const zone = bridge ? 'bridge' : a < 3.3 ? 'road' : a < 6.5 ? 'verge' : 'none'; if(zone === 'none') return null;
    const [base, cap] = { bridge: [1, 0.95], road: [0.5, 0.55], verge: [0.2, 0.38] }[zone];
    // Pointing well away from the road means the player is leaving on purpose: let go.
    const e0 = wrap(Math.atan2(tx*dir, tz*dir) - c.heading); if(Math.abs(e0) > cap) return null;
    // Keep whichever lane you are in (1.65 m either side of the centre line); a bridge wants the middle.
    if(ri !== lastRoad){ laneSide = lat >= 0 ? 1 : -1; lastRoad = ri; }
    if(lat*laneSide < -0.7) laneSide = -laneSide;
    const target = bridge ? 0 : laneSide*1.65;
    // Pure pursuit: aim at a point on the lane a few metres ahead, further the faster you go.
    const ahead = Math.round((5 + c.speed*0.3)/0.5), q = r.pts[idx(r, k + dir*ahead)], [qx, qz] = tangent(r, idx(r, k + dir*ahead));
    const e = wrap(Math.atan2(q.x - qz*target - c.x, q.z + qx*target - c.z) - c.heading);
    const steer = Math.min(1, Math.max(Math.abs(c.steer || 0), input.keys.left || input.keys.right ? 0.6 : 0));
    const w = base*Math.min(1, (c.speed - 2.5)/5)*(1 - steer)**2*(1 - (e0/cap)**2);
    const rate = Math.max(-1.6, Math.min(1.6, e*4*w));
    c.heading += rate*dt;
    Object.assign(G, { active: w > 0.02, zone, w: +w.toFixed(3), lat: +lat.toFixed(2), err: +e.toFixed(3) });
    return { r, k, dir, lat: target };
  }

  /* ---------- per frame, order 11 ---------- */
  ctx.onUpdate((dt, t, mode) => {
    const c = mode === 'drive' && state.started ? car() : null;
    let lane = null;
    if(c){
      lane = guide(dt, c);
      const P = state.player; P.heading = c.heading; P.speed = c.speed;
      if(c.group) c.group.rotation.y = c.heading;
    } else Object.assign(G, { active: false, zone: 'none', w: 0 });
    lineA += ((lane && G.active ? 1 : 0) - lineA)*Math.min(1, dt*6);
    line.visible = lineA > 0.02;
    if(lane && line.visible) drawLine(lane.r, lane.k, lane.dir, lane.lat);
    lineMat.opacity = lineA*(0.55 + 0.15*Math.sin(t*5));
    pill.hidden = !state.started || state.mode !== 'drive';
  }, 11);

  /* ---------- 3. bridge rails: add solid edges only where a bridge has none ---------- */
  (function railCheck(){
    const L = lay(); if(!Array.isArray(L?.bridges)) return;
    const solidNear = (x, z) => ctx.colliders.some(c => Math.hypot(c.x - x, c.z - z) < 1.2);
    for(const b of L.bridges){
      const r = L.roads[b.road]; if(!r) continue;
      for(const s of [-1, 1]){
        const m = r.pts[(b.a + b.b) >> 1], [tx, tz] = tangent(r, (b.a + b.b) >> 1);
        if(solidNear(m.x - tz*s*4.1, m.z + tx*s*4.1)) continue;   // map.js already laid a rail here
        for(let k=b.a; k+4<=b.b; k+=4){
          const p = r.pts[k], q = r.pts[k + 4], [ax, az] = tangent(r, k), [bx, bz] = tangent(r, k + 4);
          const x0 = p.x - az*s*4.1, z0 = p.z + ax*s*4.1, x1 = q.x - bz*s*4.1, z1 = q.z + bx*s*4.1;
          ctx.helpers.solidBox((x0 + x1)/2, (z0 + z1)/2, Math.atan2(x1 - x0, z1 - z0), 0.3, Math.hypot(x1 - x0, z1 - z0) + 0.1, 1.2);
        }
      }
    }
  })();

  /* ---------- HUD pill and the G key ---------- */
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'pill'; pill.hidden = true; pill.id = 'assist-pill';
  pill.title = 'Road guide: keeps you on the road and off the bridge rails';
  (document.getElementById('topright') || document.body).append(pill);
  function paint(){ pill.innerHTML = `<span class="dot" style="background:${on ? 'var(--leaf)' : '#9aa3b8'}"></span>Guide ${on ? 'on' : 'off'} (G)`; pill.setAttribute('aria-pressed', String(on)); }
  function set(v){
    on = !!v; paint();
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch(e){}
    ctx.bus.emit('assist', { on });
  }
  paint();
  pill.addEventListener('click', () => { set(!on); ctx.renderer.domElement.focus?.({ preventScroll: true }); });
  ctx.bus.on('key', ({ code, down, repeat }) => { if(code === 'KeyG' && down && !repeat && state.mode === 'drive') set(!on); });

  /* ---------- tour corridor: call it on every replan; it keeps one set of walls per destination ---------- */
  let cor = null;
  function clear(){ cor?.walls.remove(); cor = null; }
  function corridor(points){
    const pts = (points || []).map(p => Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z });
    if(pts.length < 2){ clear(); return false; }
    const end = pts[pts.length - 1];
    if(cor && Math.hypot(cor.end.x - end.x, cor.end.z - end.z) < 1){ cor.seen = 0; return true; }
    clear();
    cor = { end, seen: 0, walls: barriers(ctx, pts, { half: 4.6, trimStart: 4, trimEnd: 12 }) };
    return true;
  }
  // The walls fall away at the end of the path, on leaving the island, or when nobody has
  // refreshed them for 5 s (the tour replans every 2 s while it is guiding).
  ctx.onUpdate((dt, t, mode) => {
    if(!cor) return; cor.seen += dt;
    const P = state.player;
    if(mode === 'interior' || cor.seen > 5 || Math.hypot(P.x - cor.end.x, P.z - cor.end.z) < 12) clear();
  }, 12);
  ctx.bus.on('teleport', clear);

  const api = {
    on: () => on, set, corridor, clear,
    state: () => ({ on, ...G, corridor: cor ? cor.walls.count : 0 }),
  };
  ctx.expose('assist', api);
  return api;
}

/* Soft barriers along a path: red and white kerb walls on both sides (one instanced mesh), tyre
   stacks on the outside of each corner, box colliders for the vehicle and chunked static cannon
   bodies for props. They rise out of the ground when built and sink away on remove().
   pts: [{x,z}] or [[x,z]]. half: clear half-width inside the walls. skip(x, z): leave a gap there. */
export function barriers(ctx, input, { closed = false, half = 4.6, skip = null, trimStart = 0, trimEnd = 0 } = {}){
  const { THREE, CANNON, scene, world } = ctx;
  const src = [];
  for(const p of input){ const v = Array.isArray(p) ? new THREE.Vector3(p[0], 0, p[1]) : new THREE.Vector3(p.x, 0, p.z); if(!src.length || v.distanceTo(src[src.length - 1]) > 0.3) src.push(v); }
  if(closed && src.length > 2 && src[0].distanceTo(src[src.length - 1]) < 0.3) src.pop();
  if(src.length < 2) return { remove(){}, count: 0 };
  const curve = new THREE.CatmullRomCurve3(src, closed, 'centripetal'), len = curve.getLength();
  const M = Math.max(2, Math.round(len/2)), step = len/M, P = curve.getSpacedPoints(M); if(closed) P.pop();
  const n = P.length, at = i => P[closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))];
  const T = P.map((p, i) => { const a = at(i - 1), b = at(i + 1), l = Math.hypot(b.x - a.x, b.z - a.z) || 1; return [(b.x - a.x)/l, (b.z - a.z)/l]; });
  const O = half + 0.2, W = Math.ceil(2*O/step) + 2;
  const side = [-1, 1].map(s => P.map((p, i) => {
    const x = p.x - T[i][1]*s*O, z = p.z + T[i][0]*s*O;
    if(!closed && (i*step < trimStart || (n - 1 - i)*step < trimEnd)) return null;
    if(skip?.(p.x, p.z)) return null;
    // On the inside of a tight bend the offset folds back over the path: drop those posts.
    for(let j=i-W; j<=i+W; j++){ if(!closed && (j < 0 || j >= n)) continue; const q = at(j); if(Math.hypot(q.x - x, q.z - z) < O - 0.4) return null; }
    return { x, z };
  }));

  const group = new THREE.Group(); group.name = 'barriers'; scene.add(group);
  const segs = [];
  for(const w of side) for(let i=0; i<(closed ? n : n - 1); i++){ const a = w[i], b = w[(i + 1) % n]; if(a && b && Math.hypot(b.x - a.x, b.z - a.z) < step*2.5) segs.push([a, b, i]); }
  const wallGeo = new THREE.BoxGeometry(0.4, 0.62, 1), wallMat = new THREE.MeshStandardMaterial({ roughness: .7 });
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, Math.max(1, segs.length)); walls.count = segs.length;
  walls.castShadow = walls.receiveShadow = true; walls.frustumCulled = false; group.add(walls);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const red = new THREE.Color('#e5484d'), white = new THREE.Color('#fffaf0');
  const added = [], bodies = []; let body = null;
  segs.forEach(([a, b, i], s) => {
    const mx = (a.x + b.x)/2, mz = (a.z + b.z)/2, L = Math.hypot(b.x - a.x, b.z - a.z) + 0.06, ang = Math.atan2(b.x - a.x, b.z - a.z);
    walls.setMatrixAt(s, m4.compose(v.set(mx, 0.31, mz), q.setFromAxisAngle(up, ang), sc.set(1, 1, L)));
    walls.setColorAt(s, i % 2 ? red : white);
    const c = { kind: 'box', x: mx, z: mz, ang, hw: 0.2, hd: L/2, barrier: true }; ctx.colliders.push(c); added.push(c);
    // Static twins in chunks of 12 so each body's bounding box stays small for the broadphase.
    if(s % 12 === 0){ body = new CANNON.Body({ type: CANNON.Body.STATIC }); bodies.push(body); world.addBody(body); }
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.2, 0.4, L/2)), new CANNON.Vec3(mx, 0.4, mz), new CANNON.Quaternion().setFromEuler(0, ang, 0));
  });
  walls.instanceMatrix.needsUpdate = true; if(walls.instanceColor) walls.instanceColor.needsUpdate = true;

  // Tyre stacks, three high, just outside the wall on the outside of every bend.
  const stacks = []; let last = -99;
  for(let i=0; i<n; i++){
    const a = T[(i - 2 + n) % n], b = T[(i + 2) % n]; if(!closed && (i < 2 || i > n - 3)) continue;
    const bend = Math.acos(Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1]))); if(bend < 0.3 || i - last < 3) continue;
    const dx = b[0] - a[0], dz = b[1] - a[1], s = (-T[i][1]*dx + T[i][0]*dz) > 0 ? -1 : 1;   // the side the bend turns away from
    if(!side[s < 0 ? 0 : 1][i]) continue;
    stacks.push({ x: P[i].x - T[i][1]*s*(O + 0.75), z: P[i].z + T[i][0]*s*(O + 0.75) }); last = i;
  }
  const tyreGeo = new THREE.TorusGeometry(0.36, 0.17, 8, 16); tyreGeo.rotateX(Math.PI/2);
  const tyres = new THREE.InstancedMesh(tyreGeo, new THREE.MeshStandardMaterial({ roughness: .9 }), Math.max(1, stacks.length*3)); tyres.count = stacks.length*3;
  tyres.castShadow = true; tyres.frustumCulled = false; group.add(tyres);
  const dark = new THREE.Color('#2b2d3a');
  stacks.forEach((p, s) => { for(let h=0; h<3; h++){ tyres.setMatrixAt(s*3 + h, m4.compose(v.set(p.x, 0.17 + h*0.32, p.z), q.identity(), sc.set(1, 1, 1))); tyres.setColorAt(s*3 + h, h === 2 ? (s % 2 ? red : white) : dark); } });
  tyres.instanceMatrix.needsUpdate = true; if(tyres.instanceColor) tyres.instanceColor.needsUpdate = true;

  // Rise with a little overshoot, then stop ticking; remove() sinks them and frees everything.
  let k = 0, dir = 1, off = null;
  const tick = dt => {
    k = Math.max(0, Math.min(1, k + dir*dt/(dir > 0 ? 0.55 : 0.4)));
    const e = dir > 0 ? 1 + 2.2*(k - 1)**3 + 1.2*(k - 1)**2 : k*k;   // ease out with overshoot / ease in
    group.position.y = -0.95*(1 - e);
    if(dir > 0 && k >= 1){ off?.(); off = null; }
    if(dir < 0 && k <= 0){ off?.(); off = null; scene.remove(group); wallGeo.dispose(); wallMat.dispose(); tyreGeo.dispose(); tyres.material.dispose(); walls.dispose(); tyres.dispose(); }
  };
  tick(0); off = ctx.onUpdate(tick, 71);
  return {
    count: segs.length,
    remove(){
      if(dir < 0) return; dir = -1;
      const gone = new Set(added); for(let i=ctx.colliders.length - 1; i>=0; i--) if(gone.has(ctx.colliders[i])) ctx.colliders.splice(i, 1);
      bodies.forEach(b => world.removeBody(b));
      off?.(); off = ctx.onUpdate(tick, 71);
    },
  };
}
