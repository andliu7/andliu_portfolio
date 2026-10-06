// The garage: an open-front carport by the spawn plaza with one bay per vehicle (car.js VEHICLES).
// Every vehicle you are not driving stands in its bay. Walk up and press F beside one, or drive
// nose first into one, and you swap: your old ride pops back into its own bay in a puff of dust and
// the new one is yours, parked in its bay facing out. The choice is saved in localStorage.
// The roof is open slats so the high camera sees into the bays. The displays are static copies
// merged by material into a few meshes, rebuilt on each swap (swaps are rare, draws are not).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEY = 'island.vehicle';
const BAY = 4.2, HALF_D = 3.6, NOSE = 3.1, REACH = 1.6;   // bay width, half depth, where the noses line up
const TINT = { jeep:'#4a5fd0', ev:'#2fd6c6', rv:'#e98a5a', truck:'#d9534f' };

// Signed distance from (x, z) to the nearest collider (negative inside one).
function clearance(colliders, x, z){
  let m = 1e9;
  for(const c of colliders){
    let d;
    if(c.kind === 'circle') d = Math.hypot(x - c.x, z - c.z) - c.r;
    else { const dx = x - c.x, dz = z - c.z, ca = Math.cos(c.ang), sa = Math.sin(c.ang); const lx = Math.abs(dx*ca - dz*sa) - c.hw, lz = Math.abs(dx*sa + dz*ca) - c.hd; d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0); }
    if(d < m) m = d;
  }
  return m;
}

// Where the garage stands. The spawn plaza is ringed by four spoke roads and the woods start
// 15 m out, so there is little room: PREFER is a lot measured offline on the seeded island (west
// of the plaza between the west and north spokes, the mouth toward the plaza and the ANDREW LIU
// blocks on the apron). It is re-checked
// against the live colliders; if anything now stands there, a grid search round the plaza finds
// the best clear lot instead. A lot is valid when the body is on dry land, off every road, clear
// of colliders, game pads, zones, the spawn point and the name blocks, and the apron in front
// is clear enough to drive in. Pure, so node can test it.
const PREFER = { x:-8, z:-12, deg:20 };
export function checkSite({ lay = null, near = [], stations = [], zones = [], radius = 96, halfW, halfD = HALF_D, apron = 4.5 }, x, z, ang){
  const co = Math.cos(ang), si = Math.sin(ang);
  let body = 9, front = 9;
  for(let lx = -halfW; lx <= halfW + 1e-6; lx += halfW/6) for(let lz = -halfD; lz <= halfD + apron + 1e-6; lz += 1.5){
    const wx = x + lx*co + lz*si, wz = z - lx*si + lz*co, inBody = lz <= halfD + 1e-6;
    if(Math.hypot(wx, wz) > radius - 5 || (lay && !lay.landAt(wx, wz))) return null;
    if(stations.some(s => Math.hypot(wx - s.x, wz - s.z) < (s.r || 2) + (inBody ? 2 : 1))) return null;
    const cl = clearance(near, wx, wz);
    if(inBody){
      if(Math.hypot(wx, wz - 6) < 5 || (Math.abs(wx) < 5 && wz < -5 && wz > -10)) return null;   // spawn point, name blocks
      if(lay && (lay.dLandAt(wx, wz) < 1.5 || lay.roadDistAt(wx, wz) < 4.4)) return null;
      if(zones.some(zn => Math.hypot(wx - zn.x, wz - zn.z) < 17) || cl < 0.8) return null;
      body = Math.min(body, cl);
    } else {
      if(cl < 1.2) return null;
      front = Math.min(front, cl);
    }
  }
  // closer is better, a mouth that faces the plaza is better, room to spare is better
  const r = Math.hypot(x, z), facing = r > 1e-3 ? (Math.sin(ang)*-x + Math.cos(ang)*-z)/r : 1;
  return Math.min(body, 2) + 0.5*Math.min(front, 2) - 0.12*r + 1.5*facing;
}
export function findSite(o){
  const nearOf = (x, z) => { const reach = o.halfW + (o.halfD ?? HALF_D) + (o.apron ?? 4.5) + 2; return o.colliders.filter(c => Math.abs(c.x - x) < reach + (c.r || c.hw + c.hd || 0) && Math.abs(c.z - z) < reach + (c.r || c.hw + c.hd || 0)); };
  const pa = PREFER.deg*Math.PI/180, ps = checkSite({ ...o, near:nearOf(PREFER.x, PREFER.z) }, PREFER.x, PREFER.z, pa);
  if(ps !== null) return { x:PREFER.x, z:PREFER.z, ang:pa, score:ps, preferred:true };
  let best = null;
  for(let x = -30; x <= 30; x += 1.5) for(let z = -30; z <= 30; z += 1.5){
    const r = Math.hypot(x, z); if(r < 8 || r > 30) continue;
    const near = nearOf(x, z);
    for(let d = 0; d < 360; d += 10){
      const ang = d*Math.PI/180, s = checkSite({ ...o, near }, x, z, ang);
      if(s !== null && (!best || s > best.score)) best = { x, z, ang, score:s, preferred:false };
    }
  }
  return best;
}

// Merge every mesh under src into one mesh per material (positions baked relative to src).
function bake(THREE, src){
  src.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert(), m4 = new THREE.Matrix4(), by = new Map();
  src.traverse(o => {
    if(!o.isMesh) return;
    let l = by.get(o.material); if(!l) by.set(o.material, l = []);
    const g = o.geometry.clone(); g.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); l.push({ g, cast:o.castShadow, order:o.renderOrder });
  });
  const out = new THREE.Group();
  for(const [mat, l] of by){
    const flat = l.some(e => !e.g.index);
    const geo = mergeGeometries(l.map(e => flat && e.g.index ? e.g.toNonIndexed() : e.g));
    l.forEach(e => e.g.dispose());
    if(!geo) continue;
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = l.some(e => e.cast); mesh.receiveShadow = true; mesh.renderOrder = l[0].order;
    out.add(mesh);
  }
  return out;
}

export function init(ctx){
  const { THREE, scene, state, sound, helpers:H } = ctx;
  const car = ctx.modules.car;
  if(!car?.setVehicle){
    console.warn('[garage] car.js has no setVehicle; garage disabled');
    return { vehicles: () => [], current: () => null, choose: () => false, nearest: () => null, chooseNearest: () => false, call: () => car?.call?.() ?? false };
  }
  const ids = car.ids.slice(), info = Object.fromEntries(ids.map(id => [id, car.info(id)]));
  const W = ids.length*BAY + 0.6, halfW = W/2;
  let cur = car.vehicle();
  // Restore the saved choice. The car stays where it spawned; only the model changes.
  try { const saved = localStorage.getItem(KEY); if(saved && saved !== cur && info[saved]){ car.setVehicle(saved); cur = saved; } } catch(e){}

  /* ---------- site ---------- */
  const stations = ctx.modules.games?.stations || [];
  const site = findSite({ lay:ctx.modules.map?.layout, colliders:ctx.colliders, stations, zones:ctx.zones, radius:ctx.island.radius, halfW:halfW + 0.4 })
    || { x:PREFER.x, z:PREFER.z, ang:PREFER.deg*Math.PI/180, score:null, preferred:false };
  if(site.score === null) console.warn('[garage] no clear lot found; standing on the measured one anyway');
  const co = Math.cos(site.ang), si = Math.sin(site.ang);
  const toWorld = (lx, lz) => [site.x + lx*co + lz*si, site.z - lx*si + lz*co];
  const toLocal = (x, z) => { const dx = x - site.x, dz = z - site.z; return [dx*co - dz*si, dx*si + dz*co]; };
  const G = new THREE.Group(); G.position.set(site.x, 0, site.z); G.rotation.y = site.ang; scene.add(G);
  // The grass and scatter (map.js, art.js) were placed before the garage picked its lot, so tufts
  // poke up through the floor. Collapse every instance that stands inside the footprint.
  { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if(!o.isInstancedMesh) return; let hit = false;
      for(let i = 0; i < o.count; i++){
        o.getMatrixAt(i, m4); p.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld);
        const [lx, lz] = toLocal(p.x, p.z);
        if(Math.abs(lx) < halfW + 0.3 && Math.abs(lz) < HALF_D + 0.3 && p.y < 2){ o.setMatrixAt(i, zero); hit = true; }
      }
      if(hit){ o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); }
    }); }
  const bays = {};
  ids.forEach((id, i) => { const lx = (i - (ids.length - 1)/2)*BAY, lz = NOSE - info[id].hl, [x, z] = toWorld(lx, lz); bays[id] = { lx, lz, x, z }; });

  /* ---------- structure (merged) ---------- */
  const WALL = '#fbe3c0', TRIM = '#2f9e8f', BEAM = '#8a5a3b', SLAB = '#d9d4cc';
  const src = new THREE.Group(), { box, cyl, mesh } = H;
  box(W, 0.12, HALF_D*2, SLAB, 0, 0.06, 0, src).castShadow = false;
  box(W, 3.6, 0.35, WALL, 0, 1.8, -HALF_D + 0.17, src);                        // back wall
  box(W, 0.3, 0.37, TRIM, 0, 0.15, -HALF_D + 0.17, src);                       // skirting
  for(const s of [-1, 1]){
    box(0.35, 3.6, HALF_D*2, WALL, s*(halfW - 0.17), 1.8, 0, src);            // side walls
    box(0.37, 0.3, HALF_D*2, TRIM, s*(halfW - 0.17), 0.15, 0, src);
  }
  // roof: a header beam over the opening (no pillars, so even the RV swings in easily), a strip over the back, open slats between
  box(W + 0.4, 0.55, 0.45, TRIM, 0, 3.85, HALF_D - 0.1, src);
  box(W + 0.4, 0.22, 1.3, BEAM, 0, 3.95, -HALF_D + 0.65, src);
  for(let i = 0; i <= ids.length; i++) box(0.3, 0.35, HALF_D*2 + 0.4, BEAM, -halfW + 0.3 + i*BAY, 3.75, 0, src);
  for(let k = 0; k < 5; k++) box(W, 0.1, 0.24, BEAM, 0, 3.98, -HALF_D + 1.6 + k*1.25, src);
  // back of the shop: a workbench with a pegboard, a tyre stack, and an EV charger behind its bay
  box(2.6, 0.9, 0.7, BEAM, bays[ids[0]].lx, 0.57, -HALF_D + 0.72, src);
  box(2.4, 1.2, 0.06, '#e8c89a', bays[ids[0]].lx, 2.2, -HALF_D + 0.38, src);
  for(const [tx, ty, c] of [[-0.8, 2.3, '#e5484d'], [-0.2, 2.1, '#1f2a44'], [0.5, 2.4, '#ffd166'], [0.9, 2.0, '#9aa3b8']]) box(0.12, 0.5, 0.06, c, bays[ids[0]].lx + tx, ty, -HALF_D + 0.43, src);
  const tyres = bays[ids[ids.length - 1]].lx + 1.2;
  for(let k = 0; k < 3; k++) cyl(0.45, 0.45, 0.28, '#1f2a44', tyres, 0.26 + k*0.3, -HALF_D + 0.8, src, 14);
  const glow = new THREE.MeshStandardMaterial({ color:'#fff4d6', emissive:'#ffe9b0', emissiveIntensity:1.6, opacity:0.45, roughness:0.4 });
  const teal = new THREE.MeshStandardMaterial({ color:'#63f2e2', emissive:'#2fd6c6', emissiveIntensity:1.5, opacity:0.45, roughness:0.4 });
  // glowing tags, same as car.js: opaque, alpha written as 1 - glow for the bloom pass
  for(const m of [glow, teal]){ Object.assign(m, { blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor }); m.userData.atmo = true; }
  if(bays.ev){
    box(0.6, 0.9, 0.3, '#eef3f6', bays.ev.lx + 1.2, 1.5, -HALF_D + 0.5, src);
    box(0.4, 0.26, 0.04, teal, bays.ev.lx + 1.2, 1.65, -HALF_D + 0.66, src);
    const cable = mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 14, Math.PI), '#1f2a44', bays.ev.lx + 1.2, 0.95, -HALF_D + 0.66, src); cable.rotation.z = Math.PI;
  }
  // a glowing strip light under the header over every bay
  for(const id of ids) box(BAY - 1, 0.08, 0.14, glow, bays[id].lx, 3.55, HALF_D - 0.2, src);
  // sign board standing on the header
  box(8.3, 1.2, 0.12, TRIM, 0, 4.7, HALF_D - 0.1, src);
  const signTex = H.canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = TRIM; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fffaf0'; H.F(g, 700, 84); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GARAGE', w/2, h/2 + 4);
    H.F(g, 600, 30); g.textAlign = 'left'; g.fillText('F to swap', 36, h/2 + 2); g.textAlign = 'right'; g.fillText('or ease in', w - 36, h/2 + 2);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map:signTex.tex, toneMapped:false }));
  sign.position.set(0, 4.7, HALF_D - 0.03); G.add(sign);
  G.add(bake(THREE, src));

  // Floor art: one canvas for all the bays, redrawn when a vehicle goes out or comes back.
  const floor = H.canvasTex(1024, Math.round(1024*(HALF_D*2 - 0.4)/(W - 0.7)), (g, w, h) => {
    const bw = w/ids.length;
    ids.forEach((id, i) => {
      const x0 = i*bw, out = id === cur, c = TINT[id] || '#9aa3b8';
      g.fillStyle = out ? 'rgba(0,0,0,0.06)' : c + '33'; H.rr(g, x0 + 14, 14, bw - 28, h - 28, 26); g.fill();
      g.setLineDash([22, 14]); g.lineWidth = 8; g.strokeStyle = out ? '#b9b2a8' : c; H.rr(g, x0 + 14, 14, bw - 28, h - 28, 26); g.stroke(); g.setLineDash([]);
      g.save(); g.translate(x0 + bw/2, h - 70); g.fillStyle = out ? '#9a9288' : c; g.textAlign = 'center'; g.textBaseline = 'middle';
      H.F(g, 700, 30); g.fillText(out ? 'OUT DRIVING' : (info[id].name || id).toUpperCase(), 0, 0);
      H.F(g, 600, 20); g.fillText(out ? 'you have this one' : 'F, or ease in, to swap', 0, 34); g.restore();
    });
  });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.7, HALF_D*2 - 0.4), new THREE.MeshStandardMaterial({ map:floor.tex, transparent:true, roughness:0.9, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }));
  floorMesh.rotation.x = -Math.PI/2; floorMesh.position.y = 0.125; floorMesh.receiveShadow = true; G.add(floorMesh);
  const redrawFloor = () => { floor.g.clearRect(0, 0, floor.w, floor.h); floor.draw(floor.g, floor.w, floor.h, 0); floor.tex.needsUpdate = true; };

  // Walls stop the car and the walker. The back strip covers the bench, tyres and charger too.
  { const [bx, bz] = toWorld(0, -HALF_D + 0.5); H.solidBox(bx, bz, site.ang, W, 1.0, 3.6); }
  for(const s of [-1, 1]){ const [x, z] = toWorld(s*(halfW - 0.17), 0); H.solidBox(x, z, site.ang, 0.35, HALF_D*2, 3.6); }

  /* ---------- displays ---------- */
  const roots = {}, cols = {};
  for(const id of ids){
    roots[id] = car.model(id); roots[id].position.set(bays[id].lx, 0, bays[id].lz);
    // A display is solid while it stands in its bay; the collider is parked far away while it is out.
    cols[id] = { kind:'box', x:1e5, z:1e5, ang:site.ang, hw:info[id].hw, hd:info[id].hl };
    ctx.colliders.push(cols[id]);
  }
  let shown = null;
  function refresh(){
    const tmp = new THREE.Group();
    for(const id of ids){
      const out = id === cur; if(!out) tmp.add(roots[id]);
      cols[id].x = out ? 1e5 : bays[id].x; cols[id].z = out ? 1e5 : bays[id].z;
    }
    if(shown){ G.remove(shown); shown.traverse(o => o.geometry?.dispose()); }
    shown = bake(THREE, tmp); G.add(shown);
    redrawFloor();
  }
  refresh();

  /* ---------- prompt over the nearest display ---------- */
  const prompts = {};
  for(const id of ids){
    const t = H.canvasTex(512, 112, (g, w, h) => {
      g.fillStyle = '#fffaf0'; H.rr(g, 6, 10, w - 12, h - 20, 40); g.fill();
      g.fillStyle = '#1f2a44'; H.rr(g, 22, 22, 68, 68, 16); g.fill();
      g.fillStyle = '#fffaf0'; H.F(g, 700, 46); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('F', 56, 58);
      g.fillStyle = '#1f2a44'; H.F(g, 600, 38); g.textAlign = 'left'; g.fillText('Take the ' + info[id].name, 108, 58, w - 130);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t.tex, transparent:true, depthTest:false }));
    s.scale.set(4.2, 0.92, 1); s.renderOrder = 10; s.visible = false; scene.add(s); prompts[id] = s;
  }

  /* ---------- choosing ---------- */
  const save = id => { try { localStorage.setItem(KEY, id); } catch(e){} };
  function chime(){ sound.tone(660, 0.12, 'sine', 0.06, 990); setTimeout(() => sound.tone(990, 0.16, 'sine', 0.05, 1320), 110); }
  // where: 'bay' parks the new one in its bay facing out; 'here' swaps in place.
  function choose(id, where){
    if(!info[id]) return false;
    if(id === cur) return true;
    if(!where) where = state.mode === 'drive' ? 'here' : 'bay';
    const c = car.car, b = bays[id];
    car.poof?.(c.x, c.z);
    const at = where === 'bay' ? { x:b.x, z:b.z, heading:site.ang } : { x:c.x, z:c.z, heading:c.heading };
    if(!car.setVehicle(id, at)) return false;
    cur = id; save(id); refresh();
    car.poof?.(at.x, at.z); chime(); H.jolt(at.x, at.z, 7);
    ctx.bus.emit('garage:choose', { id });
    return true;
  }
  // The nearest display within F reach of the walker: { id, name, dist } or null.
  function nearest(){
    if(state.mode !== 'walk' || !state.started) return null;
    const P = state.player; let best = null;
    for(const id of ids){
      if(id === cur) continue;
      const d = Math.max(0, clearance([cols[id]], P.x, P.z));
      if(d <= REACH && (!best || d < best.dist)) best = { id, name:info[id].name, dist:+d.toFixed(2) };
    }
    return best;
  }
  function chooseNearest(){
    const n = nearest(); if(!n) return false;
    if(!choose(n.id, 'bay')) return false;
    // hop in: the animated hop when he is close enough to the seat, else straight into it (the
    // dust poof covers the jump)
    if(!ctx.modules.character?.enterCar?.()) ctx.modes.setMode('drive');
    return true;
  }

  /* ---------- per frame: drive-in swaps and the prompt ---------- */
  // Easing nose first into a display swaps; crashing into it at speed is only a bump, so holding
  // W from spawn (the garage is dead ahead) does not swap you by accident. The approach speed is
  // last frame's, because the wall stop has already zeroed this frame's.
  let cool = 0, lastSpeed = 0, against = null;
  const EASE = 7.5;
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    cool = Math.max(0, cool - dt);
    let hit = null;
    if(mode === 'drive' && state.started){
      const c = car.car, [lx, lz] = toLocal(c.x, c.z), lh = c.heading - site.ang;
      if(Math.cos(lh) < -0.5 && lz < HALF_D + car.radius + 1){   // pointing into the garage, at its mouth or inside
        for(const id of ids){
          if(id === cur) continue;
          const b = bays[id], front = b.lz + info[id].hl;
          if(Math.abs(lx - b.lx) < BAY/2 + 0.3 && lz > front && lz < front + car.radius + 0.35){ hit = id; break; }
        }
      }
      if(hit && hit !== against && cool === 0 && lastSpeed > 0.2 && lastSpeed < EASE){ choose(hit, 'bay'); cool = 1.2; hit = null; }
      lastSpeed = car.car.speed;
    }
    against = hit;
    const n = nearest();
    for(const id of ids){
      const s = prompts[id], on = !!n && n.id === id && !ctx.modules.dialog?.busy?.();
      s.visible = on;
      if(on){ const b = bays[id]; s.position.set(b.x, (id === 'rv' ? 4.4 : 3.2) + (state.reduced ? 0 : Math.sin(t*3)*0.08), b.z); }
    }
  }, 12);

  // Drive hint: add the new vehicle keys once (character.js has already added F and V).
  try {
    const h = ctx.hud?.hint?.innerHTML || '';
    if(state.mode === 'drive' && h && !/blinker/i.test(h)) ctx.hud.setHint('drive', h + ' · <kbd>Shift</kbd> boost · <kbd>Space</kbd> brake · <kbd>Q</kbd> <kbd>E</kbd> blinkers');
  } catch(e){ /* the hint line is optional */ }

  ctx.hud?.minimapLayers?.push((g, toMap) => {
    const [x, y] = toMap(site.x, site.z); g.fillStyle = '#2f9e8f'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 5, y + 4); g.lineTo(x - 5, y - 1); g.lineTo(x, y - 5); g.lineTo(x + 5, y - 1); g.lineTo(x + 5, y + 4); g.closePath(); g.fill(); g.stroke();
  });

  const api = {
    vehicles: () => ids.map(id => ({ id, name:info[id].name })),
    current: () => cur,
    choose,
    nearest,
    chooseNearest,
    call: () => car.call?.() ?? false,
    site: { x:+site.x.toFixed(2), z:+site.z.toFixed(2), heading:+site.ang.toFixed(3) },
    bays: () => ids.map(id => ({ id, x:+bays[id].x.toFixed(2), z:+bays[id].z.toFixed(2), out:id === cur })),
    pads: ids.map(id => ({ x:bays[id].x, z:bays[id].z, r:3 })),   // read by drone.js to keep its box off the bays
    position: { x:site.x, z:site.z },
  };
  // Critic hooks: window.__island.garage
  ctx.expose('garage', { ...api,
    // Stand the walker (or the car) just in front of a bay: in front of its display, facing it.
    standAt: id => { const b = bays[id]; if(!b) return false; const [x, z] = toWorld(b.lx, b.lz + (info[id]?.hl || 2) + 1.1); ctx.modes.placePlayer(x, z, site.ang + Math.PI); return true; },
    approach: id => { const b = bays[id]; if(!b) return false; const [x, z] = toWorld(b.lx, HALF_D + 5); ctx.modes.placePlayer(x, z, site.ang + Math.PI); return true; },
  });
  return api;
}
