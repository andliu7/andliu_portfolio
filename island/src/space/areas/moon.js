// Moon Base (builder A). Grey regolith with craters, a little base (three domes joined by tubes, a
// habitat module, a lander on its pad, an antenna dish, solar panels, a flag) and a rover you can
// drive in low gravity: F to get in, W / S throttle, A / D steer, Space hops, F again parks it.
// Bouncy suspension, dust trails, and hops off crater lips. The island (Earth) rises over the
// horizon. moon-1 is on the roof of the tallest dome (climb the crate stack); moon-2 is on the far
// rim of the big crater, a rover trip away. Résumé eggs from src/data/zones.js: the mission board
// (umd), the supply container (clinic) and the plaque by the flag (school).
//
// Scene axes: the base is round the origin, the spawn is 14.5 m toward +z facing it (-z).
// Everything solid is a floor height (floorAt), so you can jump onto domes and crates; the tall
// ones also carry a 2D collider that switches off once your feet are above them (see GATED).

const RING = 40;                 // the walker and the rover stay inside this circle
const G = 4.5;                   // moon gravity, shared by the walker and the rover

// A tiny geometry baker (same as the planet's): every part becomes non-indexed triangles with a
// colour per vertex, merged into one BufferGeometry, so a set of static props is one draw call.
function makeBaker(THREE){
  const pos = [], nor = [], col = [], c = new THREE.Color();
  return {
    add(geo, color, matrix){
      const g = geo.index ? geo.toNonIndexed() : geo;
      if(matrix) g.applyMatrix4(matrix);
      c.set(color);
      const P = g.attributes.position.array, N = g.attributes.normal.array;
      for(let i = 0; i < P.length; i++){ pos.push(P[i]); nor.push(N[i]); }
      for(let i = 0; i < P.length/3; i++) col.push(c.r, c.g, c.b);
      if(g !== geo) g.dispose(); geo.dispose();
    },
    geometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeBoundingSphere();
      return g;
    },
  };
}

export function build(ctx, kit){
  const { THREE } = kit;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const YAX = V(0, 1, 0), ZAX = V(0, 0, 1);
  const rnd = kit.prng(kit.hashSeed('moon-base'));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);          // rotation.y that points local +z from (x, z) at (tx, tz)
  const SPAWN = { x:0, z:14.5 };

  /* ---------- the scene ---------- */
  const scene = kit.scene({ bg:'#05060f', sky:'#e3e7ff', ground:'#4a4f6b', hemi:1.05, light:2.1, stars:1300, seed:31, shadow:true, shadowBox:16 });
  const camera = kit.camera(50);
  const sun = scene.userData.sun; scene.add(sun.target);
  kit.islandPlanet(scene, { x:-45, y:14, z:-135, r:16 });                // Earth, meaning the island, rising over the horizon
  kit.ringedPlanet(scene, { x:95, y:70, z:-90, r:9, color:'#c7b3ff', band:'#a78bfa', ring:'#e8e0ff', tilt:-0.4 });

  /* ---------- terrain: gentle swells and craters ---------- */
  const CRATERS = [
    { x:-16, z:-22, r:9, d:1.7, rim:0.7 },                              // the big one: moon-2 on its far rim
    { x:22, z:16, r:5.5, d:1.1, rim:0.5 }, { x:-25, z:9, r:6, d:1.2, rim:0.5 }, { x:24, z:-15, r:4.5, d:0.9, rim:0.45 },
    { x:8, z:27, r:3.8, d:0.7, rim:0.35 }, { x:-9, z:29, r:4.2, d:0.8, rim:0.4 },
  ];
  for(let tries = 0, n = 0; n < 10 && tries < 400; tries++){
    const a = rnd()*Math.PI*2, d = 20 + rnd()*26, c = { x:Math.cos(a)*d, z:Math.sin(a)*d, r:1.4 + rnd()*1.6 };
    if(Math.hypot(c.x, c.z + 1) - c.r < 19 || CRATERS.some(q => Math.hypot(q.x - c.x, q.z - c.z) < q.r + c.r + 2.5)) continue;
    c.d = c.r*0.2; c.rim = c.r*0.1; CRATERS.push(c); n++;
  }
  function terrain(x, z){
    const db = Math.hypot(x, z + 1);
    let y = (0.22*Math.sin(x*0.21 + 1.3)*Math.sin(z*0.17 - 0.4) + 0.12*Math.sin((x + z)*0.37))*smooth(16, 24, db);   // swells, flat under the base
    for(const c of CRATERS){
      const u = Math.hypot(x - c.x, z - c.z)/c.r;                       // distance in crater radii
      if(u < 1) y += -c.d + (c.d + c.rim)*u*u;                          // a bowl rising to the rim
      else if(u < 2.2) y += c.rim*Math.exp(-(((u - 1)*2.6)**2));           // the rim's outer slope, fading out
    }
    const d0 = Math.hypot(x, z); if(d0 > 44) y -= (d0 - 44)**2*0.06;   // past the ring the ground falls away: a small moon's horizon
    return y;
  }

  /* ---------- the base's solid shapes (floors) ---------- */
  const DOMES = [
    { x:-8, z:-6, r:3.6, drum:4.4, cap:1.4, band:'#a78bfa' },          // the tall one: moon-1 on its roof
    { x:-0.8, z:-10.5, r:2.8, drum:1.1, cap:2.0, band:'#7fd6a0' },
    { x:5.4, z:-9.6, r:2.2, drum:0.7, cap:1.7, band:'#ffb3c7' },
  ];
  const CAPS = [                                                         // capsules lying down: three tubes and the habitat
    { a:[-8, -6], b:[-0.8, -10.5], r:0.75, y:0.8 },
    { a:[-0.8, -10.5], b:[5.4, -9.6], r:0.75, y:0.8 },
    { a:[5.4, -9.6], b:[9.5, -3.5], r:0.75, y:0.8 },
    { a:[6.5, -3.5], b:[12.5, -3.5], r:1.35, y:1.6, hab:true },
  ];
  const BOXES = [                                                        // flat tops
    { x:-8, z:-1.2, hw:1.1, hd:1.0, top:1.0, color:'#e8b86a' },         // the crate stack up to the tall dome
    { x:-8, z:-1.5, hw:0.7, hd:0.7, top:2.0, color:'#f2cf8e' },
    { x:-4.5, z:3.5, hw:1.5, hd:0.9, top:1.8, clinic:true },             // the supply container
  ];
  const PADXZ = { x:13, z:6 }, WING = { x:-3.5, z:13 }, HATCH = { x:3.5, z:13 };
  const DISCS = [
    { x:PADXZ.x, z:PADXZ.z, r:3.6, top:0.22 },                          // the landing pad
    { x:PADXZ.x, z:PADXZ.z, r:1.25, top:2.9 },                          // the lander on it
    { x:WING.x, z:WING.z, r:1.35, top:0.34 },                           // the wing pad
  ];
  for(const c of CAPS){ const dx = c.b[0] - c.a[0], dz = c.b[1] - c.a[1]; c.len = Math.hypot(dx, dz); c.ux = dx/c.len; c.uz = dz/c.len; }
  function structAt(x, z){
    let y = -1e9;
    for(const d of DOMES){ const q = Math.hypot(x - d.x, z - d.z); if(q < d.r) y = Math.max(y, d.drum + d.cap*Math.sqrt(1 - (q/d.r)**2)); }   // a drum with a half-ellipsoid roof
    for(const c of CAPS){
      const t = clamp((x - c.a[0])*c.ux + (z - c.a[1])*c.uz, 0, c.len), q = Math.hypot(x - c.a[0] - c.ux*t, z - c.a[1] - c.uz*t);   // distance to the capsule's axis segment
      if(q < c.r) y = Math.max(y, c.y + Math.sqrt(c.r*c.r - q*q));
    }
    for(const b of BOXES) if(Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) y = Math.max(y, b.top);
    for(const d of DISCS) if(Math.hypot(x - d.x, z - d.z) < d.r) y = Math.max(y, d.top);
    return y;
  }
  const floorAt = (x, z) => Math.max(terrain(x, z), structAt(x, z));

  /* ---------- colliders ---------- */
  // Floors already stop you at a wall's centre line; these keep your whole body out of the tall
  // things. Each GATED one switches off while your feet are above its top, so you can still land
  // on a roof and walk about up there.
  const colliders = [], GATED = [];
  const gate = (col, top) => { colliders.push(col); GATED.push({ col, x:col.x, top }); };
  for(const d of DOMES) gate({ kind:'circle', x:d.x, z:d.z, r:d.r }, d.drum);
  for(const c of CAPS) gate({ kind:'box', x:(c.a[0] + c.b[0])/2, z:(c.a[1] + c.b[1])/2, ang:Math.atan2(-c.uz, c.ux), hw:c.len/2 + (c.hab ? c.r : 0), hd:c.r }, c.y + c.r);   // ang so the box's x axis runs along the capsule
  for(const b of BOXES) gate({ kind:'box', x:b.x, z:b.z, ang:0, hw:b.hw, hd:b.hd }, b.top);
  gate({ kind:'circle', x:PADXZ.x, z:PADXZ.z, r:1.25 }, 2.9);
  const BOARD = { x:8.8, z:1.4 }, PLAQUE = { x:3.6, z:4.6 }, FLAG = { x:1.8, z:3.0 }, DISH = { x:16.5, z:-9 };
  const rotBoard = faceTo(BOARD.x, BOARD.z, SPAWN.x, SPAWN.z), rotPlaque = faceTo(PLAQUE.x, PLAQUE.z, SPAWN.x, SPAWN.z);
  colliders.push({ kind:'box', x:BOARD.x, z:BOARD.z, ang:rotBoard, hw:1.9, hd:0.2 }, { kind:'box', x:PLAQUE.x, z:PLAQUE.z, ang:rotPlaque, hw:1.2, hd:0.15 },
    { kind:'circle', x:FLAG.x, z:FLAG.z, r:0.2 }, { kind:'circle', x:DISH.x, z:DISH.z, r:0.9 });
  const PANELS = [14.8, 16.8, 18.8].map(x => ({ x, z:0.2 }));
  for(const p of PANELS) colliders.push({ kind:'box', x:p.x, z:p.z, ang:0, hw:0.8, hd:0.5 });
  const roverCol = { kind:'circle', x:0, z:0, r:1.4 };                   // moves with the parked rover
  colliders.push(roverCol);

  /* ---------- the ground ---------- */
  {
    const g = new THREE.PlaneGeometry(112, 112, 176, 176).rotateX(-Math.PI/2), pa = g.attributes.position, cols = new Float32Array(pa.count*3);
    const base = new THREE.Color('#c9ccd8'), dark = new THREE.Color('#9ea3b5'), light = new THREE.Color('#e6e8ef'), c = new THREE.Color();
    for(let i = 0; i < pa.count; i++){
      const x = pa.getX(i), z = pa.getZ(i), y = terrain(x, z);
      pa.setY(i, y);
      const n = Math.sin(x*1.7 + Math.sin(z*1.3))*Math.sin(z*1.9 - x*0.7);   // speckle, the same at a given spot every build
      c.copy(base).lerp(y < 0 ? dark : light, clamp(Math.abs(y)*0.9, 0, 1)).lerp(light, Math.max(0, n)*0.25);
      cols.set([c.r, c.g, c.b], i*3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 }));
    m.receiveShadow = true; scene.add(m);
  }

  /* ---------- baked props ---------- */
  const B = makeBaker(THREE);
  const Q = new THREE.Quaternion(), E = new THREE.Euler();
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = null) => {
    const m = new THREE.Matrix4().compose(V(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), V(sx, sy, sz));
    return parent ? m.premultiply(parent) : m;
  };
  const Mq = (p, q, s = V(1, 1, 1)) => new THREE.Matrix4().compose(p, q, s);
  const F = (x, z, ry = 0, y = 0) => M(x, y, z, 0, ry);                 // a local frame standing at (x, z) turned by ry
  const box = (w, h, d, color, m) => B.add(new THREE.BoxGeometry(w, h, d), color, m);
  const cyl = (rt, rb, h, color, m, seg = 12) => B.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, m);
  const ball = (r, color, m) => B.add(new THREE.SphereGeometry(r, 12, 8), color, m);

  // domes: a drum, a half-ellipsoid roof, a coloured band, round windows and a door
  for(const d of DOMES){
    cyl(d.r, d.r, d.drum, '#eef0f6', M(d.x, d.drum/2, d.z), 36);
    B.add(new THREE.SphereGeometry(d.r, 36, 10, 0, Math.PI*2, 0, Math.PI/2), '#f8f9ff', M(d.x, d.drum, d.z, 0, 0, 0, 1, d.cap/d.r, 1));
    B.add(new THREE.TorusGeometry(d.r + 0.02, 0.13, 6, 44), d.band, M(d.x, d.drum, d.z, Math.PI/2));
    if(d.drum > 3) B.add(new THREE.TorusGeometry(d.r + 0.02, 0.1, 6, 44), d.band, M(d.x, d.drum*0.45, d.z, Math.PI/2));
    const nWin = Math.round(d.r*2);
    for(let i = 0; i < nWin; i++){
      const a = i/nWin*Math.PI*2 + 0.3, out = V(Math.cos(a), 0, Math.sin(a)), wy = d.drum > 2 ? d.drum*0.72 : d.drum + d.cap*0.35;
      const rr = d.drum > 2 ? d.r : d.r*Math.sqrt(1 - 0.35*0.35);        // on the roof for the low domes: the ellipse's radius at that height
      B.add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14), '#3b4f9e', Mq(V(d.x + out.x*rr, wy, d.z + out.z*rr), new THREE.Quaternion().setFromUnitVectors(YAX, out)));
    }
    box(1.1, Math.min(1.6, d.drum + 0.5), 0.3, '#ffd166', F(d.x, d.z, Math.PI/2 - 0.9, Math.min(1.6, d.drum + 0.5)/2).multiply(M(0, 0, d.r - 0.05)));
  }
  // tubes and the habitat
  for(const c of CAPS){
    const mid = V((c.a[0] + c.b[0])/2, c.y, (c.a[1] + c.b[1])/2), dir = V(c.ux, 0, c.uz);
    const alongY = new THREE.Quaternion().setFromUnitVectors(YAX, dir), alongZ = new THREE.Quaternion().setFromUnitVectors(ZAX, dir);
    if(c.hab){
      B.add(new THREE.CapsuleGeometry(c.r, c.len, 8, 24), '#f4f3ee', Mq(mid, alongY));
      for(const s of [-1.6, 1.6]) B.add(new THREE.TorusGeometry(c.r + 0.02, 0.1, 6, 28), '#4a5fd0', Mq(V().copy(mid).addScaledVector(dir, s), alongZ));
      for(let i = 0; i < 4; i++){ const x = c.a[0] + 0.9 + i*1.4; if(Math.abs(x - 9.5) < 0.4) continue; B.add(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16), '#3b4f9e', M(x, c.y + 0.25, c.a[1] + c.r - 0.08, Math.PI/2 - 0.2)); }
      box(1.0, 1.4, 0.3, '#ffd166', M(9.5, c.y - 0.1, c.a[1] + c.r - 0.1));                        // the door
      for(const [lx, lz] of [[-2, -0.8], [-2, 0.8], [2, -0.8], [2, 0.8]]) cyl(0.1, 0.14, c.y - 0.2, '#9aa3b8', M(mid.x + lx, (c.y - 0.2)/2, mid.z + lz), 8);
    } else {
      B.add(new THREE.CylinderGeometry(c.r, c.r, c.len, 18, 1, true), '#d9dde6', Mq(mid, alongY));
      for(let s = -c.len/2 + 1.6; s < c.len/2 - 1.2; s += 1.4) B.add(new THREE.TorusGeometry(c.r + 0.03, 0.07, 6, 20), '#b7c0d4', Mq(V().copy(mid).addScaledVector(dir, s), alongZ));
    }
  }
  // the crate stack and the supply container
  for(const b of BOXES){
    const h = b.clinic ? b.top : 1.0, y = b.top - h/2;
    if(b.clinic){
      const zc = kit.zone('clinic')?.color || '#4fa3c7';
      box(b.hw*2, h, b.hd*2, '#e9f4fa', M(b.x, y, b.z));
      for(const yy of [0.12, h - 0.12]) box(b.hw*2 + 0.04, 0.12, b.hd*2 + 0.04, zc, M(b.x, yy, b.z));
      // a toy tooth sits on top (pre-dental), with a little face
      const tx = b.x + 0.8, tz = b.z;
      ball(0.34, '#ffffff', M(tx, b.top + 0.62, tz, 0, 0, 0, 1, 0.85, 0.9));
      for(const s of [-1, 1]) B.add(new THREE.ConeGeometry(0.13, 0.46, 8), '#ffffff', M(tx + s*0.14, b.top + 0.25, tz, Math.PI, 0, s*0.2));
      for(const s of [-1, 1]) ball(0.035, '#1f2a44', M(tx + s*0.1, b.top + 0.68, tz + 0.29));
      box(0.3, 0.3, 0.3, '#f2cf8e', M(b.x - 1.0, b.top + 0.15, b.z - 0.2, 0, 0.4));
    } else {
      box(b.hw*2, h, b.hd*2, b.color, M(b.x, y, b.z));
      for(const s of [-1, 1]) box(b.hw*2 + 0.04, 0.12, b.hd*2 + 0.04, '#c98f4a', M(b.x, y + s*0.38, b.z));
    }
  }
  // the landing pad and the lander
  cyl(3.6, 3.7, 0.22, '#b7bccb', M(PADXZ.x, 0.11, PADXZ.z), 40);
  B.add(new THREE.TorusGeometry(3.1, 0.08, 4, 48), '#ffd166', M(PADXZ.x, 0.23, PADXZ.z, Math.PI/2));
  cyl(1.1, 1.25, 1.1, '#f2c14e', M(PADXZ.x, 1.45, PADXZ.z), 8);
  ball(0.95, '#f4f3ee', M(PADXZ.x, 2.25, PADXZ.z, 0, 0, 0, 1, 0.85, 1));
  B.add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), '#3b4f9e', M(PADXZ.x, 2.35, PADXZ.z + 0.86, Math.PI/2 - 0.35));
  for(let i = 0; i < 4; i++){
    const a = i*Math.PI/2 + Math.PI/4, cx = Math.cos(a), cz = Math.sin(a);
    const top = V(PADXZ.x + cx*0.9, 1.3, PADXZ.z + cz*0.9), foot = V(PADXZ.x + cx*1.9, 0.3, PADXZ.z + cz*1.9), dir = V().subVectors(top, foot);
    B.add(new THREE.CylinderGeometry(0.07, 0.07, dir.length(), 6), '#9aa3b8', Mq(V().addVectors(top, foot).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(YAX, dir.normalize())));
    cyl(0.28, 0.32, 0.08, '#9aa3b8', M(foot.x, 0.26, foot.z), 12);
  }
  // the antenna: tripod and mast baked, the dish turns (its own mesh)
  cyl(0.12, 0.18, 4.2, '#d9dde6', M(DISH.x, 2.1, DISH.z), 10);
  for(let i = 0; i < 3; i++){ const a = i/3*Math.PI*2; cyl(0.07, 0.07, 1.9, '#9aa3b8', M(DISH.x + Math.cos(a)*0.55, 0.8, DISH.z + Math.sin(a)*0.55, Math.sin(a)*0.5, 0, -Math.cos(a)*0.5), 6); }
  // solar panels
  for(const p of PANELS){ cyl(0.07, 0.09, 1.0, '#9aa3b8', M(p.x, 0.5, p.z), 8); box(1.6, 0.06, 1.0, '#5b6fd6', M(p.x, 1.05, p.z, -0.45)); box(1.64, 0.04, 0.06, '#e6e8ef', M(p.x, 1.08, p.z, -0.45)); }
  // the flag: a pale blue flag with a butter-yellow star
  cyl(0.05, 0.05, 3.2, '#fffaf0', M(FLAG.x, 1.6, FLAG.z), 8);
  ball(0.1, '#ffd166', M(FLAG.x, 3.25, FLAG.z));
  box(1.4, 0.85, 0.04, '#7fb8e6', M(FLAG.x + 0.72, 2.7, FLAG.z));
  box(1.4, 0.08, 0.05, '#fffaf0', M(FLAG.x + 0.72, 3.1, FLAG.z));
  B.add(new THREE.OctahedronGeometry(0.22, 0), '#ffd166', M(FLAG.x + 0.72, 2.7, FLAG.z + 0.03, 0, 0, Math.PI/4, 1, 1, 0.3));
  cyl(0.3, 0.45, 0.25, '#b7bccb', M(FLAG.x, 0.12, FLAG.z), 10);
  // a survey stake by moon-2, so the far rim has something to steer for
  const BIG = CRATERS[0], bl = Math.hypot(BIG.x, BIG.z);
  const M2 = { x:BIG.x + BIG.x/bl*BIG.r, z:BIG.z + BIG.z/bl*BIG.r };     // the rim point straight across the crater from the base
  {
    const sx = M2.x + 1.6, sz = M2.z + 0.6, sy = terrain(sx, sz);
    cyl(0.05, 0.05, 2.6, '#fffaf0', M(sx, sy + 1.3, sz), 6);
    box(0.7, 0.45, 0.03, '#ff9f5a', M(sx + 0.36, sy + 2.35, sz));
    for(let i = 0; i < 5; i++){ const a = i*1.3; B.add(new THREE.DodecahedronGeometry(0.18 + (i % 2)*0.08, 0), '#b7bccb', M(sx + Math.cos(a)*0.35, sy + 0.1, sz + Math.sin(a)*0.35)); }
  }

  /* ---------- résumé eggs (signs are the kit's, posts are baked) ---------- */
  const zUmd = kit.zone('umd'), zSchool = kit.zone('school'), zClinic = kit.zone('clinic');
  function boardSign(x, z, rot, lift, o){
    const w = o.w ?? 3.2;
    for(const s of [-1, 1]) cyl(0.08, 0.1, lift + (o.h ?? 2), '#9aa3b8', F(x, z, rot).multiply(M(s*(w/2 - 0.3), (lift + (o.h ?? 2))/2, -0.1)), 8);
    return kit.sign(scene, x, lift, z, { ...o, rot, post:false });
  }
  boardSign(BOARD.x, BOARD.z, rotBoard, 1.0, { zone:'umd', w:3.8, h:2.4, lines:zUmd ? [zUmd.eyebrow, zUmd.bullets[0]] : undefined });
  const boardLbl = kit.label('Mission Board', zUmd?.color || '#c8102e', '#ffffff');
  boardLbl.position.set(BOARD.x, 4.0, BOARD.z); boardLbl.scale.set(2.6, 0.74, 1); scene.add(boardLbl);
  const sat = zSchool?.bullets.find(b => /SAT/.test(b)) ?? zSchool?.bullets[0];
  boardSign(PLAQUE.x, PLAQUE.z, rotPlaque, 0.45, { zone:'school', w:2.6, h:1.5, lines:sat ? [sat] : undefined });
  {
    const b = BOXES[2];
    kit.sign(scene, b.x - 0.25, 0.2, b.z + b.hd + 0.07, { zone:'clinic', post:false, w:2.4, h:1.3, lines:zClinic ? [zClinic.eyebrow] : undefined });
  }

  /* ---------- the ways out, beside the spawn and facing it ---------- */
  kit.wingPad(scene, WING.x, 0, WING.z, { rot:faceTo(WING.x, WING.z, SPAWN.x, SPAWN.z), label:'Home' });
  kit.hatch(scene, HATCH.x, 0, HATCH.z, { rot:faceTo(HATCH.x, HATCH.z, SPAWN.x, SPAWN.z), label:'Station', color:'#b7c0d4' });

  /* ---------- the shards ---------- */
  const ids = kit.shardsFor('moon');
  const top = DOMES[0];
  kit.shard(scene, ids[0], top.x, top.drum + top.cap + 1.3, top.z);
  kit.shard(scene, ids[1], M2.x, terrain(M2.x, M2.z) + 1.3, M2.z);

  /* ---------- rocks ---------- */
  {
    const list = [];
    for(let tries = 0; list.length < 44 && tries < 900; tries++){
      const a = rnd()*Math.PI*2, d = 6 + rnd()*48, x = Math.cos(a)*d, z = Math.sin(a)*d, s = 0.4 + rnd()*rnd()*2.2;
      if(Math.hypot(x, z + 1) < 18 || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6 || Math.hypot(x - M2.x, z - M2.z) < 3.5) continue;
      if(list.some(q => Math.hypot(q.x - x, q.z - z) < q.s + s + 0.8)) continue;
      list.push({ x, z, s });
    }
    const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness:1, flatShading:true }), list.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((q, i) => {
      d.position.set(q.x, terrain(q.x, q.z) + q.s*0.12, q.z); d.rotation.set(rnd()*3, rnd()*3, rnd()*3); d.scale.set(q.s, q.s*0.7, q.s); d.updateMatrix();
      im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(['#b3b7c6', '#a4a9ba', '#c4c1cc'][i % 3]));
      if(q.s > 0.9 && Math.hypot(q.x, q.z) < RING) colliders.push({ kind:'circle', x:q.x, z:q.z, r:q.s*0.45 });
    });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }

  /* ---------- blinking beacons (one instanced mesh) ---------- */
  const beacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color:'#ffffff' }), 9);
  {
    const spots = [[DISH.x, 4.35, DISH.z], [PADXZ.x, 3.1, PADXZ.z], [6.5 - 1.3, 1.9, -3.5], [12.5 + 1.3, 1.9, -3.5], [DOMES[1].x, DOMES[1].drum + DOMES[1].cap + 0.1, DOMES[1].z], [DOMES[2].x, DOMES[2].drum + DOMES[2].cap + 0.1, DOMES[2].z]];
    for(let i = 0; i < 3; i++){ const a = i/3*Math.PI*2 + 0.5; spots.push([PADXZ.x + Math.cos(a)*3.5, 0.32, PADXZ.z + Math.sin(a)*3.5]); }
    const d = new THREE.Object3D(), c = new THREE.Color();
    spots.forEach((p, i) => { d.position.fromArray(p); d.updateMatrix(); beacons.setMatrixAt(i, d.matrix); beacons.setColorAt(i, c.set(['#ff6b6b', '#7fffb0', '#ffd166'][i % 3])); });
  }
  scene.add(beacons);

  const baked = new THREE.Mesh(B.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.8 }));
  baked.castShadow = true; baked.receiveShadow = true; scene.add(baked);

  // the dish (a shallow bowl, both faces drawn) with its feed horn
  const dish = new THREE.Group(); dish.position.set(DISH.x, 4.3, DISH.z); scene.add(dish);
  {
    const D = makeBaker(THREE);
    D.add(new THREE.SphereGeometry(1.6, 22, 6, 0, Math.PI*2, 0, 0.7).rotateX(Math.PI).translate(0, 1.6*Math.cos(0.7) + 0.1, 0), '#f4f3ee', null);   // flipped cap: a bowl whose rim sits 0.1 above the pivot
    D.add(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6).translate(0, 0.75, 0), '#9aa3b8', null);
    D.add(new THREE.SphereGeometry(0.14, 10, 8).translate(0, 1.42, 0), '#ff9f5a', null);
    const m = new THREE.Mesh(D.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.6, side:THREE.DoubleSide }));
    m.rotation.x = -0.55; m.castShadow = true; dish.add(m);
  }

  /* ---------- the walker ---------- */
  const walker = kit.walker({ gravity:G, jump:6, speed:5, run:8.5, floorAt, colliders, ring:{ r:RING } });
  const walkRig = kit.rig(camera, walker, { dist:8, height:3.6 });

  /* ---------- the rover ---------- */
  const roverRoot = new THREE.Group(); scene.add(roverRoot);
  const rBody = new THREE.Group(); roverRoot.add(rBody);
  const WHEELS = [[-0.98, 1.0], [0.98, 1.0], [-0.98, -1.0], [0.98, -1.0]], WR = 0.45;
  {
    const R = makeBaker(THREE);
    const rb = (w, h, d, color, x, y, z, rx = 0) => R.add(new THREE.BoxGeometry(w, h, d), color, M(x, y, z, rx));
    rb(1.7, 0.36, 2.4, '#f4f3ee', 0, 0.74, 0);
    rb(1.72, 0.09, 2.42, '#4a5fd0', 0, 0.84, 0);
    for(const [x, z] of WHEELS) rb(0.46, 0.1, 1.0, '#ff9f5a', x, 1.02, z);                            // fenders
    rb(1.5, 0.24, 0.22, '#ffd166', 0, 0.66, 1.26);
    for(const s of [-1, 1]) R.add(new THREE.SphereGeometry(0.13, 10, 8), '#fff3c4', M(s*0.5, 0.82, 1.3));
    rb(0.9, 0.7, 0.14, '#3a4466', 0, 1.2, -0.62);                                                    // the seat back
    R.add(new THREE.TorusGeometry(0.78, 0.06, 6, 18, Math.PI), '#d9dde6', M(0, 0.92, -0.8));          // the roll bar
    rb(1.4, 0.06, 0.8, '#5b6fd6', 0, 1.1, -1.05, -0.3);                                                // a solar panel on the back
    R.add(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), '#9aa3b8', M(0.62, 1.45, -1.0));
    R.add(new THREE.SphereGeometry(0.08, 8, 6), '#ff6b6b', M(0.62, 1.98, -1.0));
    const m = new THREE.Mesh(R.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.7 }));
    m.castShadow = true; rBody.add(m);
  }
  let wheels;
  {
    const W = makeBaker(THREE);
    W.add(new THREE.CylinderGeometry(WR, WR, 0.34, 16), '#4a4f63', M(0, 0, 0, 0, 0, Math.PI/2));
    W.add(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 10), '#ffd166', M(0, 0, 0, 0, 0, Math.PI/2));
    for(let i = 0; i < 8; i++){ const a = i/8*Math.PI*2; W.add(new THREE.BoxGeometry(0.36, 0.08, 0.12), '#353a4d', M(0, Math.cos(a)*WR, Math.sin(a)*WR, a)); }   // chunky treads
    wheels = new THREE.InstancedMesh(W.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.9 }), 4);
    wheels.castShadow = true; wheels.frustumCulled = false; roverRoot.add(wheels);
  }
  const rover = { kind:'rover', pos:V(), vel:V(), up:V(0, 1, 0), fwd:V(0, 0, 1), grounded:true, speed:0, jet:0, yaw:0, v:0, vy:0 };
  const rs = { bob:0, bobV:0, pitch:0, roll:0, spin:0, emit:0, lastVy:0 };
  const wd = new THREE.Object3D(), seat = V(), back = V();
  function poseRover(dt){
    const P = rover.pos, f = rover.fwd, sx = f.z, sz = -f.x;               // (sx, sz) is the rover's right-hand side
    let pitch, roll = 0;
    if(rover.grounded){
      const fr = floorAt(P.x + f.x*1.1, P.z + f.z*1.1), bk = floorAt(P.x - f.x*1.1, P.z - f.z*1.1);
      const rt = floorAt(P.x + sx*0.95, P.z + sz*0.95), lf = floorAt(P.x - sx*0.95, P.z - sz*0.95);
      pitch = Math.atan2(bk - fr, 2.2); roll = Math.atan2(rt - lf, 1.9);  // lean with the ground under the wheels
    } else pitch = clamp(-rover.vy*0.06, -0.35, 0.35);                    // nose up while rising, down while falling
    const k = dt ? 1 - Math.exp(-dt*10) : 1;
    rs.pitch += (clamp(pitch, -0.6, 0.6) - rs.pitch)*k; rs.roll += (clamp(roll, -0.5, 0.5) - rs.roll)*k;
    roverRoot.position.copy(P); roverRoot.rotation.set(rs.pitch, rover.yaw, rs.roll, 'YXZ');
    const bob = clamp(rs.bob, -0.25, 0.25);
    rBody.position.y = bob;
    rs.spin += rover.v*dt/WR;                                              // rolling: angle = distance / radius
    WHEELS.forEach(([x, z], i) => { wd.position.set(x, WR - bob*0.3, z); wd.rotation.set(rs.spin, 0, 0); wd.updateMatrix(); wheels.setMatrixAt(i, wd.matrix); });
    wheels.instanceMatrix.needsUpdate = true;
    roverRoot.updateMatrixWorld(true);
    if(driving){
      const A = kit.astronaut; if(A){ A.root.position.copy(rBody.localToWorld(seat.set(0, 0.42, 0))); A.root.quaternion.copy(roverRoot.quaternion); }
    }
  }
  rover.place = (x, y, z, yaw = 0) => {
    rover.pos.set(x, floorAt(x, z), z); rover.yaw = yaw; rover.v = rover.vy = 0; rover.grounded = true;
    rover.fwd.set(Math.sin(yaw), 0, Math.cos(yaw)); rover.vel.set(0, 0, 0); rover.speed = 0; poseRover(0);
  };
  rover.update = (dt, view) => {
    const K = kit.keys, P = rover.pos;
    if(rover.grounded){
      const topSpeed = K.f > 0 ? (K.boost ? 12 : 9) : 5;
      const braking = K.f && Math.sign(K.f) !== Math.sign(rover.v) && Math.abs(rover.v) > 0.5;
      const acc = braking ? 14 : K.f ? 6 : 4;
      rover.v += clamp(K.f*topSpeed - rover.v, -acc*dt, acc*dt);
      rover.yaw -= K.s*1.7*dt*clamp(rover.v/3, -1, 1);                    // steers like a car: no turning on the spot, reversed when backing up
      if(K.jumpPressed){ rover.vy = 4.2; rover.grounded = false; ctx.sound?.tone?.(300, 0.2, 'sine', 0.06, 620); }
    }
    rover.fwd.set(Math.sin(rover.yaw), 0, Math.cos(rover.yaw));
    const ox = P.x, oz = P.z;
    P.x += rover.fwd.x*rover.v*dt; P.z += rover.fwd.z*rover.v*dt;
    kit.resolve2D(P, 1.3, colliders);
    const dr = Math.hypot(P.x, P.z), lim = RING - 1.3;
    if(dr > lim){ P.x *= lim/dr; P.z *= lim/dr; rover.v *= 0.9; }
    let floor = floorAt(P.x, P.z);
    if(floor > P.y + 0.6){                                                 // a wall (a dome, a crate): bounce back off it
      P.x = ox; P.z = oz; floor = floorAt(ox, oz);
      if(Math.abs(rover.v) > 2) ctx.sound?.tone?.(110, 0.14, 'square', 0.04, 70);
      rover.v *= -0.3;
    }
    if(rover.grounded){
      // the ground falling away faster than low gravity can pull you down means you left it (a crater lip)
      const pred = P.y + rover.vy*dt - 0.5*G*dt*dt;
      if(floor < pred - 0.06) rover.grounded = false;
      else {
        P.y = floor;
        const behind = floorAt(P.x - rover.fwd.x*0.6*Math.sign(rover.v || 1), P.z - rover.fwd.z*0.6*Math.sign(rover.v || 1));
        const vy = clamp((floor - behind)/0.6*Math.abs(rover.v), -8, 7);   // climb rate = the slope just driven over times speed, so a crest throws you up
        rs.bobV += (vy - rover.vy)*0.12;                                   // bumps jolt the springs
        rover.vy = vy;
      }
    }
    if(!rover.grounded){
      rover.vy -= G*dt; P.y += rover.vy*dt;
      if(rover.vy <= 0 && P.y <= floor){
        const hit = -rover.vy;
        P.y = floor; rover.grounded = true; rover.vy = 0;
        rs.bobV -= Math.min(7, hit)*1.1;
        if(hit > 1.5){ puffRing(P.x, floor, P.z, 10, 1.4); ctx.sound?.tone?.(140, 0.12, 'triangle', 0.05, 80); }
      }
    }
    rs.bobV += (-70*rs.bob - 7*rs.bobV)*dt; rs.bob += rs.bobV*dt;          // the suspension: a damped spring
    rover.vel.set(rover.fwd.x*rover.v, rover.grounded ? 0 : rover.vy, rover.fwd.z*rover.v);
    rover.speed = Math.abs(rover.v);
    if(view){ back.copy(rover.fwd).negate(); view.back.lerp(back, 1 - Math.exp(-dt*2.5)); }   // the camera swings in behind
    // dust from the back wheels, more the faster you go
    if(rover.grounded && rover.speed > 2){
      rs.emit += dt*rover.speed*2.2;
      while(rs.emit >= 1){
        rs.emit -= 1;
        const s = rnd() < 0.5 ? -1 : 1, f = rover.fwd;
        puff(P.x - f.x*1.2 + f.z*0.98*s, floor + 0.2, P.z - f.z*1.2 - f.x*0.98*s, -f.x*rover.v*0.15 + (rnd() - 0.5), 0.5 + rnd()*0.6, -f.z*rover.v*0.15 + (rnd() - 0.5), 0.5 + rover.speed*0.04);
      }
    }
    poseRover(dt);
  };
  const driveRig = kit.rig(camera, rover, { dist:9, height:4, animate:false, fp:false });

  /* ---------- dust ---------- */
  const DUST = 72;
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshStandardMaterial({ color:'#dfe2ea', roughness:1, transparent:true, opacity:0.75, depthWrite:false }), DUST);
  dust.frustumCulled = false; scene.add(dust);
  const bits = Array.from({ length:DUST }, () => ({ life:0, max:1, p:V(), v:V(), s:1 }));
  let di = 0, alive = 0;
  const dd = new THREE.Object3D();
  function puff(x, y, z, vx, vy, vz, s){ const q = bits[di]; di = (di + 1) % DUST; q.max = q.life = 0.9 + rnd()*0.7; q.p.set(x, y, z); q.v.set(vx, vy, vz); q.s = s; alive = DUST; }
  function puffRing(x, y, z, n, sp){ for(let i = 0; i < n; i++){ const a = i/n*Math.PI*2; puff(x + Math.cos(a)*0.5, y + 0.15, z + Math.sin(a)*0.5, Math.cos(a)*sp, 0.4, Math.sin(a)*sp, 0.6); } }
  function stepDust(dt){
    if(!alive) return;
    let live = 0;
    bits.forEach((q, i) => {
      if(q.life > 0){ q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-1.8*dt)); q.v.y -= 0.5*dt; live++; }
      const k = q.life > 0 ? q.life/q.max : 0;
      dd.position.copy(q.p); dd.rotation.set(k*5, k*3, 0);
      dd.scale.setScalar(k > 0 ? q.s*(0.5 + (1 - k)*1.3)*Math.min(1, k*2.5) : 0);   // grows as it spreads, shrinks away at the end
      dd.updateMatrix(); dust.setMatrixAt(i, dd.matrix);
    });
    dust.instanceMatrix.needsUpdate = true;
    alive = live;
  }
  for(let i = 0; i < DUST; i++){ dd.scale.setScalar(0); dd.updateMatrix(); dust.setMatrixAt(i, dd.matrix); }

  /* ---------- getting in and out ---------- */
  const HINT_WALK = '<kbd>WASD</kbd> walk · <kbd>Space</kbd> jump · <kbd>F</kbd> drive the rover · <kbd>V</kbd> first person · <kbd>Esc</kbd> station';
  const HINT_DRIVE = '<kbd>W</kbd> <kbd>S</kbd> throttle · <kbd>A</kbd> <kbd>D</kbd> steer · <kbd>Shift</kbd> boost · <kbd>Space</kbd> hop · <kbd>F</kbd> park';
  let driving = false, offUse = () => {};
  const setHint = h => { area.hint = h; if(ctx.hud?.hint) ctx.hud.hint.innerHTML = h; };
  const useDrive = () => kit.interactable({ obj:roverRoot, offset:[0, 0, 0], r:2.9, label:'Drive rover', onUse:drive });
  function drive(){
    if(driving) return;
    driving = true; roverCol.x = 1e5;                                      // the rover's own collider goes away while you are in it
    rover.v = 0; rover.vy = 0; rover.grounded = true;
    area.rig = driveRig; driveRig.view.back.copy(rover.fwd).negate(); driveRig.view.snap();
    if(kit.astronaut) kit.astronaut.root.visible = true;
    poseRover(0);
    offUse(); offUse = kit.interactable({ obj:roverRoot, offset:[0, 0, 0], r:3, label:'Park rover', onUse:park });
    setHint(HINT_DRIVE); ctx.sound?.tone?.(520, 0.16, 'sine', 0.05, 780);
  }
  function park(){
    if(!driving) return false;
    if(!rover.grounded){ kit.say('Land first!'); return false; }
    const P = rover.pos, f = rover.fwd, sx = f.z, sz = -f.x;
    roverCol.x = P.x; roverCol.z = P.z;
    let spot = null;
    for(const [dx, dz] of [[-sx*2.4, -sz*2.4], [sx*2.4, sz*2.4], [-f.x*3, -f.z*3], [f.x*3, f.z*3]]){
      const x = P.x + dx, z = P.z + dz, q = { x, z };
      kit.resolve2D(q, walker.radius, colliders);
      if(Math.hypot(q.x - x, q.z - z) < 0.01 && Math.abs(floorAt(x, z) - P.y) < 0.45 && Math.hypot(x, z) < RING - 1){ spot = q; break; }
    }
    if(!spot) spot = { x:P.x - sx*2.4, z:P.z - sz*2.4 };                  // nowhere tidy: the walker's own collision sorts it out
    driving = false; rover.v = 0; rover.vy = 0; rover.speed = 0;
    walker.place(spot.x, floorAt(spot.x, spot.z), spot.z, rover.yaw);
    area.rig = walkRig; walkRig.view.back.copy(driveRig.view.back); walkRig.view.snap();
    if(kit.astronaut) kit.astronaut.root.visible = !walkRig.view.fp;
    offUse(); offUse = useDrive();
    setHint(HINT_WALK); ctx.sound?.tone?.(420, 0.16, 'sine', 0.05, 260);
    return true;
  }
  rover.place(6.2, 0, 9.2, Math.PI - 0.5);
  roverCol.x = rover.pos.x; roverCol.z = rover.pos.z;
  offUse = useDrive();

  /* ---------- per frame ---------- */
  let wasGrounded = true, fallVy = 0;
  function update(dt, t){
    const C = area.rig.ctrl, P = C.pos;
    for(const g of GATED) g.col.x = P.y < g.top - 0.3 ? g.x : 1e5;           // tall colliders only while you are below their tops
    sun.position.set(P.x + 9, P.y + 16, P.z + 7); sun.target.position.copy(P);   // shadows follow you across the base
    dish.rotation.y = t*0.25;
    beacons.visible = (t % 1.6) < 1.1;
    if(driving) kit.astronaut?.animate(dt, { speed:0, grounded:true });
    else {
      if(!walker.grounded) fallVy = walker.vel.y;
      else if(!wasGrounded && fallVy < -3.5) puffRing(P.x, P.y, P.z, 8, 1.1);   // a hard landing kicks up dust
      wasGrounded = walker.grounded;
    }
    stepDust(dt);
  }

  const area = {
    title:'Moon Base', scene, camera, rig:walkRig, update,
    spawn:{ x:SPAWN.x, y:0, z:SPAWN.z, yaw:Math.PI },
    hint:HINT_WALK,
    onEnter(){ walkRig.view.back.set(0, 0, 1); setHint(HINT_WALK); },
    onExit(){ if(driving){ rover.grounded = true; rover.pos.y = floorAt(rover.pos.x, rover.pos.z); park(); } },   // never leave the astronaut in the seat
    // debug handles for node checks and the browser console (window.__island.space.kit is not enough to reach these)
    debug:{ rover, walker, drive, park, floorAt, terrain, get driving(){ return driving; }, moon2:M2 },
  };
  return area;
}
