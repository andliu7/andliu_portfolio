// The space kit: everything an area file needs, handed to build(ctx, kit). Area builders use only
// this file and SPACE.md. Three kinds of astronaut controller (flat low-g walking, radial gravity
// round a sphere, zero-g jetpack), a third-person camera that works with all three (V toggles
// first person), and helpers for star shards, résumé signs, the wing pad home, the hatch back to
// the station, triggers, things to press F on, backdrops and a placeholder area.
//
// Coordinates: every area is its own THREE.Scene with nothing transformed at the root, so scene
// coordinates are world coordinates. The player's feet are at ctrl.pos; ctrl.up is "up" for him
// (the sphere normal on a tiny planet), ctrl.fwd is the way he faces (always perpendicular to up).
//
// Pure pieces (prng, tangent, resolve2D, sanitizeSave) are exported for node tests.

export const AREAS = [
  { id:'planet',    title:'Tiny Planet',    color:'#7fd6a0' },
  { id:'moon',      title:'Moon Base',      color:'#b7c0d4' },
  { id:'asteroids', title:'Asteroid Field', color:'#e98a5a' },
  { id:'lab',       title:'Wormhole Lab',   color:'#a78bfa' },
];
// Two shards per area, eight in all. The ids are load-bearing: they are what the save remembers.
export const SHARDS = { planet:['planet-1', 'planet-2'], moon:['moon-1', 'moon-2'], asteroids:['asteroids-1', 'asteroids-2'], lab:['lab-1', 'lab-2'] };
export const SHARD_IDS = Object.values(SHARDS).flat();

// Seeded stream, mulberry32. Never call ctx.helpers.rng(): it would shift the island build.
export function prng(seed = 1){
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
export function hashSeed(str){ let h = 2166136261; for(const ch of String(str)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// v with its component along the unit vector up removed, normalised (a direction in the tangent
// plane). Falls back to any perpendicular when v is parallel to up.
export function tangent(v, up, out){
  out.copy(v).addScaledVector(up, -v.dot(up));
  const l = out.length();
  if(l > 1e-6) return out.multiplyScalar(1/l);
  out.set(Math.abs(up.y) < 0.9 ? 0 : 1, Math.abs(up.y) < 0.9 ? 1 : 0, 0);
  out.addScaledVector(up, -out.dot(up));
  return out.normalize();
}

// Push a circle of radius rad at pos (x, z) out of 2D colliders, the same shapes as ctx.colliders:
// { kind:'circle', x, z, r } or { kind:'box', x, z, ang, hw, hd }.
export function resolve2D(pos, rad, list){
  for(const c of list || []){
    if(c.kind === 'circle'){
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = rad + c.r;
      if(d < m && d > 1e-5){ pos.x = c.x + dx/d*m; pos.z = c.z + dz/d*m; }
    } else if(c.kind === 'box'){
      const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = pos.x - c.x, dz = pos.z - c.z;
      let lx = dx*co - dz*si, lz = dx*si + dz*co;
      const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
      const ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
      if(d < rad){
        if(d < 1e-5){ const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if(px < pz) lx = Math.sign(lx || 1)*(c.hw + rad); else lz = Math.sign(lz || 1)*(c.hd + rad); }
        else { lx = cx + ex/d*rad; lz = cz + ez/d*rad; }
        pos.x = c.x + lx*co + lz*si; pos.z = c.z - lx*si + lz*co;
      }
    }
  }
}

// The save, cleaned: unknown shard ids and junk dropped, so a hand-edited value never breaks it.
export function sanitizeSave(s){
  const ok = !!s && typeof s === 'object';
  return {
    v: 1,
    shards: ok && Array.isArray(s.shards) ? [...new Set(s.shards.filter(id => SHARD_IDS.includes(id)))] : [],
    unlocked: !!(ok && s.unlocked),
    flags: ok && s.flags && typeof s.flags === 'object' && !Array.isArray(s.flags) ? { ...s.flags } : {},
  };
}

/* ======================================================================================== */
// rt is the runtime (index.js): { keys, astro, sfx, areaId(), has(id), addShard, addTrigger,
// addUse, addKey, takeDrag(), camera(), toast(text), go(id), parts, flag, setFlag }.
export function createKit(ctx, rt){
  const { THREE } = ctx, H = ctx.helpers;
  const V = () => new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const tmp = { a:V(), b:V(), c:V(), d:V(), m:new THREE.Matrix4() };

  // Point obj (+z forward, +y up) along fwd with its head toward up.
  function orient(obj, up, fwd){
    tmp.c.crossVectors(up, fwd);                 // up x fwd is the model's +x, so (x, y, z) is right-handed
    tmp.m.makeBasis(tmp.c, up, fwd); obj.quaternion.setFromRotationMatrix(tmp.m);
  }
  function writeModel(c){ const m = rt.astro?.root; if(!m) return; m.position.copy(c.pos); orient(m, c.up, c.fwd); }
  const yawVec = (yaw, out) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- controller 1: flat walking, any gravity (station, moon, lab) ---------- */
  // o: { gravity=9, jump=6.5, speed=5, run=8.5, radius=0.45, airControl=3,
  //      floorAt(x, z) -> y (default 0), colliders:[2D shapes], ring:{ r, x?, z? } keeps him inside
  //      a circle, bounds:{ minX, maxX, minZ, maxZ } }
  // A floor more than 0.5 m above his feet is a wall; lower than that he steps up onto it.
  function walker(o = {}){
    const c = { kind:'walker', pos:V(), vel:V(), up:V().set(0, 1, 0), fwd:V().set(0, 0, 1), grounded:true, speed:0, jet:0,
      gravity:o.gravity ?? 9, jump:o.jump ?? 6.5, walk:o.speed ?? 5, run:o.run ?? 8.5, radius:o.radius ?? 0.45, airControl:o.airControl ?? 3,
      floorAt:o.floorAt || (() => 0), colliders:o.colliders || [], ring:o.ring || null, bounds:o.bounds || null };
    const F = V(), R = V(), mv = V();
    c.place = (x, y, z, yaw = 0) => {
      c.pos.set(x, y ?? c.floorAt(x, z), z); if(!Number.isFinite(c.pos.y)) c.pos.y = c.floorAt(x, z);
      yawVec(yaw, c.fwd); c.vel.set(0, 0, 0); c.grounded = true; c.speed = 0; writeModel(c);
    };
    c.update = (dt, view) => {
      const K = rt.keys, fp = !!view?.fp;
      if(fp && K.s) c.fwd.applyAxisAngle(c.up, -K.s*2.4*dt);       // first person: A / D turn
      if(view) view.basis(c.up, F, R); else { F.copy(c.fwd); R.crossVectors(F, c.up); }
      mv.copy(F).multiplyScalar(K.f).addScaledVector(R, fp ? 0 : K.s);
      const moving = mv.lengthSq() > 1e-6;
      if(moving) mv.normalize().multiplyScalar(K.boost ? c.run : c.walk);
      const k = Math.min(1, dt*(c.grounded ? 12 : c.airControl));  // less grip in the air: floaty jumps
      c.vel.x += (mv.x - c.vel.x)*k; c.vel.z += (mv.z - c.vel.z)*k;
      if(K.jumpPressed && c.grounded){ c.vel.y = c.jump; c.grounded = false; rt.sfx?.hop(); }
      if(!c.grounded) c.vel.y -= c.gravity*dt;
      const ox = c.pos.x, oz = c.pos.z;
      c.pos.x += c.vel.x*dt; c.pos.z += c.vel.z*dt; if(!c.grounded) c.pos.y += c.vel.y*dt;
      resolve2D(c.pos, c.radius, c.colliders);
      if(c.ring){ const rx = c.ring.x || 0, rz = c.ring.z || 0, dx = c.pos.x - rx, dz = c.pos.z - rz, d = Math.hypot(dx, dz), lim = c.ring.r - c.radius; if(d > lim){ c.pos.x = rx + dx/d*lim; c.pos.z = rz + dz/d*lim; } }
      if(c.bounds){ const b = c.bounds; c.pos.x = clamp(c.pos.x, b.minX + c.radius, b.maxX - c.radius); c.pos.z = clamp(c.pos.z, b.minZ + c.radius, b.maxZ - c.radius); }
      let floor = c.floorAt(c.pos.x, c.pos.z);
      if(floor > c.pos.y + 0.5){ c.pos.x = ox; c.pos.z = oz; floor = c.floorAt(ox, oz); }   // too tall to step onto: a wall
      if(c.grounded){
        if(floor < c.pos.y - 0.3){ c.grounded = false; c.vel.y = 0; }                     // walked off an edge
        else c.pos.y = floor;
      } else if(c.vel.y <= 0 && c.pos.y <= floor){
        const hard = -c.vel.y; c.pos.y = floor; c.vel.y = 0; c.grounded = true; rt.astro?.land(hard*0.9); rt.sfx?.land();
      }
      c.speed = Math.hypot(c.vel.x, c.vel.z);
      if(!fp && moving){ tmp.a.copy(mv).normalize(); c.fwd.lerp(tmp.a, Math.min(1, dt*12)); tangent(c.fwd, c.up, c.fwd); }
      writeModel(c);
    };
    return c;
  }

  /* ---------- controller 2: radial gravity round a sphere (tiny planet) ---------- */
  // o: { center:Vector3 = origin, radius (surface), gravity=10, jump=7, speed=4.5, run=7,
  //      heightAt?(upUnit) -> metres above the radius (hills), obstacles:[{ pos:Vector3, r }] }
  // Up is always the normal from the centre. Each frame the facing and the camera's "behind"
  // vector are re-projected onto the new tangent plane (parallel transport), so walking straight
  // on keeps you going straight all the way round.
  function orbiter(o = {}){
    const c = { kind:'orbiter', center:(o.center ? o.center.clone() : V()), radius:o.radius ?? 10, pos:V(), vel:V(), up:V().set(0, 1, 0), fwd:V().set(0, 0, 1),
      grounded:true, speed:0, jet:0, gravity:o.gravity ?? 10, jump:o.jump ?? 7, walk:o.speed ?? 4.5, run:o.run ?? 7, airControl:o.airControl ?? 3,
      heightAt:o.heightAt || null, obstacles:o.obstacles || [], bodyR:0.45 };
    const F = V(), R = V(), mv = V(), vt = V(), n = V();
    const ground = up => c.radius + (c.heightAt ? c.heightAt(up) : 0);
    c.place = (x, y, z, yaw = 0) => {
      n.set(x, y || 0, z).sub(c.center); if(n.lengthSq() < 1e-8) n.set(0, 1, 0); n.normalize();
      c.up.copy(n); c.pos.copy(c.center).addScaledVector(n, ground(n));
      tangent(yawVec(yaw, tmp.a), c.up, c.fwd); c.vel.set(0, 0, 0); c.grounded = true; c.speed = 0; writeModel(c);
    };
    c.update = (dt, view) => {
      const K = rt.keys, fp = !!view?.fp;
      c.up.copy(c.pos).sub(c.center).normalize();
      tangent(c.fwd, c.up, c.fwd);
      if(fp && K.s) c.fwd.applyAxisAngle(c.up, -K.s*2.4*dt);
      if(view) view.basis(c.up, F, R); else { F.copy(c.fwd); R.crossVectors(F, c.up); }
      mv.copy(F).multiplyScalar(K.f).addScaledVector(R, fp ? 0 : K.s);
      const moving = mv.lengthSq() > 1e-6;
      if(moving) mv.normalize().multiplyScalar(K.boost ? c.run : c.walk);
      let vr = c.vel.dot(c.up);                                   // radial part of the velocity
      vt.copy(c.vel).addScaledVector(c.up, -vr);                  // tangential part
      vt.lerp(mv, Math.min(1, dt*(c.grounded ? 12 : c.airControl)));
      if(K.jumpPressed && c.grounded){ vr = c.jump; c.grounded = false; rt.sfx?.hop(); }
      if(!c.grounded) vr -= c.gravity*dt;
      c.pos.addScaledVector(vt, dt).addScaledVector(c.up, c.grounded ? 0 : vr*dt);
      for(const ob of c.obstacles){ tmp.b.copy(c.pos).sub(ob.pos); const d = tmp.b.length(), m = ob.r + c.bodyR; if(d < m && d > 1e-5) c.pos.copy(ob.pos).addScaledVector(tmp.b, m/d); }
      n.copy(c.pos).sub(c.center); const dist = n.length(); n.multiplyScalar(1/dist);
      const g = ground(n);
      if(c.grounded || (vr <= 0 && dist <= g)){
        if(!c.grounded){ rt.astro?.land(-vr*0.9); rt.sfx?.land(); }
        c.pos.copy(c.center).addScaledVector(n, g); c.grounded = true; vr = 0;
      }
      // carry the tangential velocity into the new tangent plane at the same speed
      const sp = vt.length();
      if(sp > 1e-5) tangent(vt, n, vt).multiplyScalar(sp); else vt.set(0, 0, 0);
      c.vel.copy(vt).addScaledVector(n, vr);
      c.up.copy(n); tangent(c.fwd, c.up, c.fwd);
      c.speed = sp;
      if(!fp && moving){ tmp.a.copy(mv); tangent(tmp.a, c.up, tmp.a); c.fwd.lerp(tmp.a, Math.min(1, dt*12)); tangent(c.fwd, c.up, c.fwd); }
      if(view) view.carry(c.up);
      writeModel(c);
    };
    return c;
  }

  /* ---------- controller 3: zero-g jetpack with inertia (asteroid field) ---------- */
  // o: { thrust=7 (m/s^2), max=7 (m/s), damping=0.35 (per second, so a drift slowly dies),
  //      bounds:{ center?:Vector3, r } soft wall, obstacles:[{ pos:Vector3, r }] bounce off }
  // WASD thrusts relative to the camera (flat in third person, where you look in first person),
  // Space thrusts up, Shift down.
  function jetpack(o = {}){
    const c = { kind:'jetpack', pos:V(), vel:V(), up:V().set(0, 1, 0), fwd:V().set(0, 0, 1), grounded:false, speed:0, jet:0,
      thrust:o.thrust ?? 7, max:o.max ?? 7, damping:o.damping ?? 0.35, bounds:o.bounds || null, obstacles:o.obstacles || [], bodyR:0.6 };
    const F = V(), R = V(), U = V(), a = V();
    c.place = (x, y, z, yaw = 0) => { c.pos.set(x, y || 0, z); yawVec(yaw, c.fwd); c.vel.set(0, 0, 0); c.speed = 0; c.jet = 0; writeModel(c); };
    c.update = (dt, view) => {
      const K = rt.keys;
      if(view) view.basis3(F, R, U); else { F.copy(c.fwd); R.crossVectors(F, Y).normalize(); U.copy(Y); }
      a.copy(F).multiplyScalar(K.f).addScaledVector(R, K.s).addScaledVector(Y, (K.jump ? 1 : 0) - (K.boost ? 1 : 0));
      const on = a.lengthSq() > 1e-6;
      if(on) c.vel.addScaledVector(a.normalize(), c.thrust*dt);
      c.jet += ((on ? 1 : 0) - c.jet)*Math.min(1, dt*10);
      c.vel.multiplyScalar(Math.exp(-c.damping*dt));             // exponential drag, frame-rate independent
      const sp = c.vel.length(); if(sp > c.max) c.vel.multiplyScalar(c.max/sp);
      c.pos.addScaledVector(c.vel, dt);
      for(const ob of c.obstacles){
        tmp.b.copy(c.pos).sub(ob.pos); const d = tmp.b.length(), m = ob.r + c.bodyR;
        if(d < m && d > 1e-5){
          tmp.b.multiplyScalar(1/d); c.pos.copy(ob.pos).addScaledVector(tmp.b, m);
          const vn = c.vel.dot(tmp.b); if(vn < 0){ c.vel.addScaledVector(tmp.b, -vn*1.5); if(vn < -2) rt.sfx?.bump(); }   // bounce, keeping half the speed
        }
      }
      if(c.bounds){
        const ctr = c.bounds.center || tmp.d.set(0, 0, 0);
        tmp.b.copy(c.pos).sub(ctr); const d = tmp.b.length(), over = d - c.bounds.r;
        if(over > 0) c.vel.addScaledVector(tmp.b, -over*6*dt/d);   // a soft spring pulls you back in
      }
      c.speed = c.vel.length();
      if(on && (K.f || K.s)){ tmp.a.copy(a); tangent(tmp.a, Y, tmp.a); c.fwd.lerp(tmp.a, Math.min(1, dt*6)); tangent(c.fwd, Y, c.fwd); }
      writeModel(c);
    };
    return c;
  }

  /* ---------- camera: third person that follows any controller, V for first person ---------- */
  // o: { dist=7, height=3.4, look=1.1, back:[x, y, z] start direction from player to camera,
  //      fp:true|false (V allowed, default true), fpStart:false, lag=7 }
  // Drag with the mouse to swing round; the wheel zooms (state.zoom).
  function view(camera, ctrl, o = {}){
    const v = { camera, ctrl, fp:!!o.fpStart, allowFp:o.fp !== false, dist:o.dist ?? 7, height:o.height ?? 3.4, look:o.look ?? 1.1, lag:o.lag ?? 7,
      back:V().fromArray(o.back || [0, 0, 1]).normalize(), elev:1, pitch:0, upS:V().set(0, 1, 0), camPos:V(), ready:false };
    const want = V(), look = V(), eye = V();
    // Movement directions on the ground: forward is away from the camera, right is forward x up.
    v.basis = (up, F, R) => {
      if(v.fp) F.copy(ctrl.fwd); else tangent(v.back, up, F).negate();
      R.crossVectors(F, up).normalize();
    };
    // Full 3D directions for the jetpack: flat forward in third person, the look direction in first.
    v.basis3 = (F, R, U) => {
      if(v.fp){ F.copy(ctrl.fwd).multiplyScalar(Math.cos(v.pitch)).addScaledVector(Y, Math.sin(v.pitch)).normalize(); }
      else tangent(v.back, Y, F).negate();
      R.crossVectors(F, Y); if(R.lengthSq() < 1e-6) R.set(1, 0, 0); R.normalize();
      U.crossVectors(R, F);
    };
    v.carry = up => tangent(v.back, up, v.back);
    v.snap = () => { v.ready = false; };
    v.toggleFp = () => {
      if(!v.allowFp) return v.fp;
      v.fp = !v.fp; v.pitch = 0;
      if(!v.fp) v.back.copy(ctrl.fwd).negate();                  // come back out right behind him
      v.ready = false; if(rt.astro) rt.astro.root.visible = !v.fp;
      return v.fp;
    };
    v.update = dt => {
      const up = ctrl.up, P = ctrl.pos, d = rt.takeDrag?.() || { dx:0, dy:0 };
      if(v.fp){ if(d.dx) ctrl.fwd.applyAxisAngle(up, -d.dx*0.004); v.pitch = clamp(v.pitch - d.dy*0.004, -1.2, 1.2); }
      else { if(d.dx) v.back.applyAxisAngle(up, -d.dx*0.006); v.elev = clamp(v.elev + d.dy*0.005, 0.3, 2.2); }
      tangent(v.back, up, v.back);
      const k = v.ready && !ctx.state.reduced ? 1 - Math.exp(-dt*v.lag) : 1;
      v.upS.lerp(up, k).normalize();
      if(v.fp){
        eye.copy(P).addScaledVector(up, 1.45).addScaledVector(ctrl.fwd, 0.2);
        look.copy(ctrl.fwd).multiplyScalar(Math.cos(v.pitch)).addScaledVector(up, Math.sin(v.pitch)).add(eye);
        camera.position.copy(eye); camera.up.copy(up); camera.lookAt(look);
        v.camPos.copy(eye);
      } else {
        const z = ctx.state.zoom || 1;
        want.copy(P).addScaledVector(up, v.height*v.elev*z).addScaledVector(v.back, v.dist*z);
        if(k >= 1) v.camPos.copy(want); else v.camPos.lerp(want, k);
        camera.position.copy(v.camPos); camera.up.copy(v.upS);
        camera.lookAt(look.copy(P).addScaledVector(up, v.look));
      }
      v.ready = true;
    };
    return v;
  }
  // A controller plus its camera, stepped by the runtime every frame before area.update.
  // o.animate = false skips the astronaut's walk cycle (a seated rover driver poses him himself).
  // Any object with the controller shape works as ctrl: { kind, pos, vel, up, fwd, grounded, speed, jet, place(), update(dt, view) }.
  function rig(camera, ctrl, o = {}){
    const v = view(camera, ctrl, o);
    return { ctrl, view:v, update(dt){
      ctrl.update(dt, v); v.update(dt);
      if(o.animate !== false) rt.astro?.animate(dt, { speed:ctrl.speed, grounded:ctrl.grounded, float:ctrl.kind === 'jetpack', jet:ctrl.jet });
    } };
  }

  /* ---------- scenes, cameras and backdrops ---------- */
  // o: { bg='#0b1030', sky, ground, light=1.6, stars=700, seed, shadow:false, shadowBox=14 }
  function scene(o = {}){
    const s = new THREE.Scene(); s.background = new THREE.Color(o.bg || '#0b1030');
    s.add(new THREE.HemisphereLight(o.sky || '#d6dcff', o.ground || '#2a2f4a', o.hemi ?? 1.15));
    const sun = new THREE.DirectionalLight('#ffffff', o.light ?? 1.6); sun.position.set(9, 16, 7);
    if(o.shadow){ sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const b = o.shadowBox || 14; Object.assign(sun.shadow.camera, { left:-b, right:b, top:b, bottom:-b, near:1, far:60 }); }
    s.add(sun); s.userData.sun = sun;
    if(o.stars !== 0) stars(s, { count:o.stars ?? 700, seed:o.seed ?? 11 });
    return s;
  }
  function camera(fov = 50){ return new THREE.PerspectiveCamera(fov, innerWidth/innerHeight, 0.1, 900); }
  // One Points draw call on a far shell. Colours drift between white, butter and ice blue.
  function stars(parent, o = {}){
    const n = o.count ?? 700, R = o.r ?? 380, rnd = prng(o.seed ?? 11);
    const pos = new Float32Array(n*3), col = new Float32Array(n*3), tints = [[1, 1, 1], [1, 0.93, 0.75], [0.8, 0.9, 1]];
    for(let i = 0; i < n; i++){
      const u = rnd()*2 - 1, a = rnd()*Math.PI*2, s = Math.sqrt(1 - u*u);   // uniform on the sphere
      pos.set([Math.cos(a)*s*R, u*R, Math.sin(a)*s*R], i*3);
      const t = tints[(rnd()*3) | 0], b = 0.55 + rnd()*0.45; col.set([t[0]*b, t[1]*b, t[2]*b], i*3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size:o.size ?? 2.2, sizeAttenuation:false, vertexColors:true, depthWrite:false, fog:false }));
    p.frustumCulled = false; parent.add(p); return p;
  }
  // A big ringed planet for the sky.
  function ringedPlanet(parent, o = {}){
    const g = new THREE.Group(); g.position.set(o.x ?? 60, o.y ?? 20, o.z ?? -120); parent.add(g);
    const r = o.r ?? 18;
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), new THREE.MeshStandardMaterial({ color:o.color || '#f2a86b', roughness:0.9 }));
    g.add(body);
    const band = new THREE.Mesh(new THREE.SphereGeometry(r*1.005, 36, 6, 0, Math.PI*2, Math.PI*0.42, Math.PI*0.12), new THREE.MeshStandardMaterial({ color:o.band || '#e07b54', roughness:0.9 }));
    g.add(band);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r*1.35, r*2.1, 64), new THREE.MeshBasicMaterial({ color:o.ring || '#ffe0b0', transparent:true, opacity:0.55, side:THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x = -Math.PI/2 + 0.35; ring.rotation.y = 0.2; g.add(ring);
    g.rotation.z = o.tilt ?? 0.25;
    return g;
  }
  // The island seen from orbit: blue sea, a green island blob, a sandy rim and a thin cloud belt.
  function islandPlanet(parent, o = {}){
    const g = new THREE.Group(); g.position.set(o.x ?? -50, o.y ?? -10, o.z ?? -90); parent.add(g);
    const r = o.r ?? 12;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), new THREE.MeshStandardMaterial({ color:'#5fb6d6', roughness:0.6 })));
    const cap = (rad, color, lift) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r*lift, 28, 10, 0, Math.PI*2, 0, rad), new THREE.MeshStandardMaterial({ color, roughness:0.9 })); m.rotation.x = 0.7; g.add(m); return m; };
    cap(0.5, '#f1dfb3', 1.004); cap(0.44, '#a7d676', 1.012);
    const cloud = new THREE.Mesh(new THREE.TorusGeometry(r*1.08, r*0.03, 6, 48), new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0.6 }));
    cloud.rotation.x = 1.2; g.add(cloud);
    return g;
  }
  // Put obj on a sphere: at center + dir*dist, its +y along dir.
  function onSurface(obj, center, dir, dist){
    tmp.a.copy(dir).normalize();
    obj.position.copy(center).addScaledVector(tmp.a, dist); obj.quaternion.setFromUnitVectors(Y, tmp.a);
    return obj;
  }
  const glow = (color, opacity = 0.6) => new THREE.MeshBasicMaterial({ color, transparent:true, opacity, depthWrite:false, blending:THREE.AdditiveBlending });

  /* ---------- star shards ---------- */
  // A glowing crystal that spins and bobs; walking within 1.5 m picks it up (burst plus chime).
  // id must be one of SHARDS[area]. A shard already in the save is built hidden.
  function shard(parent, id, x = 0, y = 0, z = 0){
    if(!SHARD_IDS.includes(id)) console.warn(`[space] "${id}" is not a shard id; see SHARDS in kit.js`);
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const m = new THREE.Mesh(rt.parts.geo, rt.parts.mat); g.add(m);
    const halo = new THREE.Sprite(rt.parts.halo); halo.scale.setScalar(1.7); g.add(halo);
    const taken = rt.has(id); g.visible = !taken;
    rt.addShard({ id, area:rt.areaId(), obj:g, mesh:m, taken, seed:hashSeed(id) % 100 });
    return g;
  }

  /* ---------- résumé signs ---------- */
  // kit.sign(parent, x, y, z, { zone:'blueberry' } or { title, sub, lines:[...], color }, w, h, rot, post)
  // With zone set, the words come from src/data/zones.js (title, role, first bullet) unless given.
  function wrap(g, text, maxW){
    const words = String(text).split(/\s+/), out = []; let line = '';
    for(const w of words){ const t = line ? line + ' ' + w : w; if(g.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; }
    if(line) out.push(line); return out;
  }
  function sign(parent, x = 0, y = 0, z = 0, o = {}){
    const zn = o.zone ? zone(o.zone) : null;
    const title = o.title ?? zn?.title ?? '', sub = o.sub ?? zn?.role ?? '', lines = o.lines ?? (zn ? [zn.bullets[0]] : []);
    const color = o.color ?? zn?.color ?? '#4a5fd0', w = o.w ?? 3.4, h = o.h ?? 2;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.rot || 0; parent.add(g);
    const lift = o.post === false ? 0 : (o.lift ?? 1.1);
    if(o.post !== false) for(const sx of [-w/2 + 0.3, w/2 - 0.3]) H.cyl(0.07, 0.09, lift + 0.2, '#9aa3b8', sx, (lift + 0.2)/2, -0.06, g, 8);
    H.box(w + 0.16, h + 0.16, 0.1, '#2a3050', 0, lift + h/2, -0.06, g);
    const px = 150, t = H.canvasTex(Math.round(w*px), Math.round(h*px), (c, W, Hh) => {
      c.fillStyle = '#fffaf0'; H.rr(c, 0, 0, W, Hh, 26); c.fill();
      const band = Math.round(Hh*0.3); c.fillStyle = color; c.beginPath(); c.roundRect(0, 0, W, band, [26, 26, 0, 0]); c.fill();
      c.fillStyle = '#ffffff'; H.F(c, 700, Math.round(band*0.5)); c.textBaseline = 'middle'; c.fillText(title, 28, band*0.52, W - 56);
      let yy = band + 42;
      if(sub){ c.fillStyle = '#4a5270'; H.F(c, 600, 34); c.fillText(sub, 28, yy, W - 56); yy += 48; }
      c.fillStyle = '#1f2a44'; H.F(c, 500, 30, 'Nunito');
      for(const L of lines){ for(const s of wrap(c, L, W - 56)){ if(yy > Hh - 20) break; c.fillText(s, 28, yy); yy += 38; } yy += 8; }
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false }));
    screen.position.set(0, lift + h/2, 0.01); g.add(screen);
    return g;
  }
  function zone(id){ return (ctx.zones || []).find(z => z.id === id) || null; }

  /* ---------- ways out ---------- */
  // The wing pad home. Standing on it (on foot, or drifting within reach in zero-g) flaps the
  // wings and takes you back to the island. o: { rot, to:'island' (default) | 'hub' | area id }
  function wingPad(parent, x = 0, y = 0, z = 0, o = {}){
    const pad = rt.buildPad(parent, { x, y, z, rot:o.rot || 0 });
    rt.addTrigger({ area:rt.areaId(), obj:pad.group, offset:V().set(0, pad.top, 0), r:1.0, needGround:true, pad,
      onEnter:() => rt.go(o.to || 'island', { pad }) });
    const lbl = H.label(o.label || 'Home', '#1f2a44', '#fffaf0'); lbl.position.set(0, 2.9, -0.8); lbl.scale.set(2.2, 0.63, 1); pad.group.add(lbl);
    return pad;
  }
  // A round hatch standing upright; walking into it goes back to the station (or o.to).
  // Faces +z locally: set o.rot so +z points at where the player comes from.
  function hatch(parent, x = 0, y = 0, z = 0, o = {}){
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.rot || 0; parent.add(g);
    H.box(2.2, 0.3, 1.2, '#6b7385', 0, 0.15, 0, g);
    const frame = H.mesh(new THREE.TorusGeometry(0.95, 0.17, 8, 28), '#d9dde6', 0, 1.25, 0, g);
    const door = H.mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.12, 28), o.color || '#ffd166', 0, 1.25, -0.02, g); door.rotation.x = Math.PI/2;
    H.mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16), '#1f2a44', 0, 1.25, 0.06, g);
    const lbl = H.label(o.label || 'Station', '#fffaf0', '#1f2a44'); lbl.position.set(0, 2.75, 0); lbl.scale.set(2.2, 0.63, 1); g.add(lbl);
    rt.addTrigger({ area:rt.areaId(), obj:g, offset:V().set(0, 0.3, 0.7), r:1.2, onEnter:() => rt.go(o.to || 'hub') });
    return g;
  }
  // Something happens when the player walks within r of a point (or of obj, which may move).
  // Fires once on entry; re-arms after he walks 0.6 m clear. Returns an off() function.
  function trigger(o){ return rt.addTrigger({ area:rt.areaId(), obj:o.obj || null, offset:o.obj ? V().fromArray(o.offset || [0, 0, 0]) : V().set(o.x || 0, o.y || 0, o.z || 0), r:o.r ?? 1.2, needGround:!!o.needGround, onEnter:o.onEnter || (() => {}) }); }
  // Something to press F on within r (C also works when talk is true). A prompt pill floats over it.
  function interactable(o){ return rt.addUse({ area:rt.areaId(), obj:o.obj || null, offset:o.obj ? V().fromArray(o.offset || [0, 0, 0]) : V().set(o.x || 0, o.y || 0, o.z || 0), r:o.r ?? 2.2, label:o.label || 'Use', talk:!!o.talk, onUse:o.onUse || (() => {}) }); }
  // Key presses while this area is active. fn({ code, down, repeat }). Do not bind global keys.
  function onKey(code, fn){ return rt.addKey({ area:rt.areaId(), code, fn }); }
  // The aiming ray from the centre of the screen (first-person tools such as a portal gun).
  const ray = new THREE.Raycaster(), centre = new THREE.Vector2(0, 0);
  function aim(){ const cam = rt.camera(); if(cam) ray.setFromCamera(centre, cam); return ray; }

  /* ---------- the placeholder: what a stub area (or a broken one) shows ---------- */
  // o: { mode:'walker'|'orbiter'|'jetpack', title, color, gravity, jump, view:{...}, note }
  function placeholder(id, o = {}){
    const meta = AREAS.find(a => a.id === id) || { title:id === 'hub' ? 'Station' : id, color:'#4a5fd0' };
    const title = o.title || meta.title, color = o.color || meta.color, mode = o.mode || 'walker';
    const s = scene({ seed:hashSeed(id), shadow:mode !== 'jetpack', shadowBox:16 });
    const cam = camera();
    const ids = SHARDS[id] || [];
    const note = o.note || 'Under construction. The shards are real, though.';
    let ctrl, spawn;
    if(mode === 'orbiter'){
      const r = 9, C = V();
      H.ball(r, color, 0, 0, 0, s, 48);
      ctrl = orbiter({ radius:r, gravity:o.gravity ?? 9, jump:o.jump ?? 7 });
      spawn = { x:0, y:r, z:0, yaw:0 };
      const put = (dir, lift = 0) => { const g = new THREE.Group(); s.add(g); return onSurface(g, C, V().fromArray(dir), r + lift); };
      wingPad(put([-0.35, 1, 0.3]), 0, 0, 0, { rot:0 });
      hatch(put([0.4, 1, 0.25]), 0, 0, 0, { rot:0 });
      sign(put([0, 1, -0.45]), 0, 0, 0, { title, sub:'Tiny Planet', lines:[note, 'Walk all the way round. Straight on is the way.'], color, w:3.2, h:1.7 });
      if(ids[0]) shard(put([0, -1, 0], 1.2), ids[0]);
      if(ids[1]) shard(put([1, 0.1, -0.2], 3.2), ids[1]);
    } else if(mode === 'jetpack'){
      const rnd = prng(hashSeed(id) + 3), obstacles = [];
      const rock = (x, y, z, r, c = '#8d8579') => { const m = H.mesh(new THREE.DodecahedronGeometry(r, 0), c, x, y, z, s); m.rotation.set(rnd()*3, rnd()*3, 0); obstacles.push({ pos:m.position, r:r*0.92 }); return m; };
      rock(0, -3.2, 0, 3);
      for(let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; rock(Math.cos(a)*(10 + rnd()*6), (rnd() - 0.5)*10, Math.sin(a)*(10 + rnd()*6), 1.2 + rnd()*2.2); }
      ctrl = jetpack({ bounds:{ r:30 }, obstacles });
      spawn = { x:0, y:1.5, z:6, yaw:Math.PI };
      wingPad(s, -1, -0.34, 0, { rot:0 });
      hatch(s, 2.2, -0.6, -1.2, { rot:0 });
      sign(s, 0, 3.6, -3, { title, sub:'Asteroid Field', lines:[note, 'Space to rise, Shift to sink. You keep drifting.'], color, post:false });
      if(ids[0]) shard(s, ids[0], 8, 4, -8);
      if(ids[1]) shard(s, ids[1], -9, -5, 6);
    } else {
      H.cyl(16, 16, 0.4, color, 0, -0.2, 0, s, 48);
      ctrl = walker({ gravity:o.gravity ?? 9, jump:o.jump ?? 6.5, ring:{ r:15.6 } });
      spawn = { x:0, y:0, z:6, yaw:Math.PI };
      wingPad(s, -4, 0, 7, { rot:0 });
      if(id === 'hub') AREAS.forEach((q, i) => hatch(s, -7.5 + i*5, 0, -9, { to:q.id, label:q.title, color:q.color }));   // a broken hub still reaches every area
      else hatch(s, 4, 0, 7, { rot:Math.PI });
      sign(s, 0, 0, -3, { title, lines:[note], color });
      if(ids[0]) shard(s, ids[0], -6, 1.2, -5);
      if(ids[1]) shard(s, ids[1], 6, Math.min(4.2, (o.jump ?? 6.5)**2/(2*(o.gravity ?? 9)) + 0.6), -4);   // just within a jump's reach
    }
    return { title, scene:s, camera:cam, rig:rig(cam, ctrl, o.view || {}), spawn, placeholder:true };
  }

  return {
    ctx, THREE, H, AREAS, SHARDS, SHARD_IDS, prng, hashSeed, tangent, resolve2D, orient,
    get keys(){ return rt.keys; },
    get player(){ return rt.player || null; },
    get parts(){ return rt.parts; },
    get astronaut(){ return rt.astro; },          // { root, body, head, animate(dt, s), land(v), lift } the one astronaut model               // shared shard geometry and materials { geo, mat, dim, halo }
    shardsFor: id => SHARDS[id] || [],
    collected: id => rt.has(id),
    flag: name => rt.flag(name), setFlag: (name, v = true) => rt.setFlag(name, v),
    walker, orbiter, jetpack, view, rig,
    scene, camera, stars, ringedPlanet, islandPlanet, onSurface, glow,
    shard, sign, zone, wingPad, hatch, trigger, interactable, onKey, aim,
    label: (text, bg, fg) => H.label(text, bg, fg),
    say: text => rt.toast(text),
    go: id => rt.go(id),
    chime: () => rt.sfx?.chime(),
    placeholder,
  };
}
