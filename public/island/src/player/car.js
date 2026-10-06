// The car: a kinematic arcade car with a cannon twin that knocks props over.
// Owns state.player while mode === 'drive'. Parked (still solid, not steering) in any other mode.
// It is an open-top toy buggy so the driver (character.js parents itself to api.seat) is visible
// from the high follow camera. The body sits on a fake spring: it pitches when you accelerate or
// brake, rolls into turns, and squashes on a honk. Rear wheels kick up pooled dust puffs.
// Walls guide it along instead of bouncing it back (resolveCar). C while walking calls it: it
// drives itself round obstacles to your right side, honks and parks facing your way.
export function init(ctx){
  const { THREE, CANNON, scene, world, state, input, sound, helpers:H } = ctx;
  const { mesh, box, cyl, ball, eyes } = H;
  const keys = input.keys;
  const car = { x:0, z:6, heading:Math.PI, speed:0, steer:0, group:new THREE.Group(), wheels:[], fronts:[], body:null, chassis:null };
  const BLUE = '#4a5fd0', DARK = '#3b4f9e', CREAM = '#f7f3ea';
  let seat = null, door = null, wheelRing = null;

  function buildCar(){
    const g = car.group; scene.add(g);
    const chassis = new THREE.Group(); g.add(chassis); car.chassis = chassis;
    // tub: rounded-looking body built from a low box plus a bumper skirt
    box(1.9, 0.6, 3.1, BLUE, 0, 0.62, 0, chassis);
    box(1.95, 0.2, 3.2, DARK, 0, 0.36, 0, chassis);
    box(1.7, 0.16, 0.9, CREAM, 0, 0.98, 1.05, chassis);            // bonnet stripe
    box(1.7, 0.16, 0.7, CREAM, 0, 0.98, -1.2, chassis);            // boot lid
    // cockpit: dark floor well, a seat, a windscreen and a roll bar, no roof
    const well = box(1.5, 0.08, 1.25, '#2a3160', 0, 0.93, -0.28, chassis); well.castShadow = false;
    box(1.0, 0.22, 0.6, '#e5484d', 0, 1.02, -0.45, chassis);         // seat base
    box(1.0, 0.62, 0.18, '#e5484d', 0, 1.3, -0.78, chassis);         // seat back
    box(1.55, 0.08, 0.08, '#1f2a44', 0, 1.62, 0.52, chassis);        // screen top rail
    for(const sx of [-0.75, 0.75]) box(0.08, 0.66, 0.08, '#1f2a44', sx, 1.28, 0.52, chassis);
    const glass = mesh(new THREE.BoxGeometry(1.42, 0.5, 0.04), new THREE.MeshStandardMaterial({ color:'#bfe6f5', roughness:0.1, transparent:true, opacity:0.45 }), 0, 1.3, 0.52, chassis);
    glass.castShadow = false;
    for(const sx of [-0.72, 0.72]) cyl(0.06, 0.06, 0.8, '#f7f3ea', sx, 1.35, -0.98, chassis, 8);
    const bar = cyl(0.06, 0.06, 1.5, '#f7f3ea', 0, 1.75, -0.98, chassis, 8); bar.rotation.z = Math.PI/2;
    // lights, tail lights, antenna with a blueberry on top
    for(const sx of [-0.62, 0.62]){ ball(0.14, '#fff3b0', sx, 0.66, 1.56, chassis, 10); box(0.3, 0.14, 0.06, '#e5484d', sx, 0.66, -1.56, chassis); }
    cyl(0.02, 0.02, 1.0, '#9aa3b8', 0.7, 1.4, -1.25, chassis, 6); ball(0.18, DARK, 0.7, 1.95, -1.25, chassis, 14);
    eyes(chassis, 0.85, 1.57, 0.32, 0.09, false);
    // driver door on the left (+x is the car's left when heading forward along +z), hinged at the front
    door = new THREE.Group(); door.position.set(0.97, 0.66, 0.2); chassis.add(door);
    box(0.06, 0.46, 0.9, DARK, 0, 0, -0.45, door);
    box(0.07, 0.08, 0.22, CREAM, 0.01, 0.1, -0.7, door);
    // seat anchor for the driver
    seat = new THREE.Group(); seat.position.set(0, 1.08, -0.4); chassis.add(seat);
    // steering wheel on a short column; it turns with the steering input
    const col = cyl(0.03, 0.03, 0.4, '#1f2a44', 0, 1.2, 0.3, chassis, 6); col.rotation.x = -0.9;
    wheelRing = new THREE.Group(); wheelRing.position.set(0, 1.34, 0.16); wheelRing.rotation.x = -0.9; chassis.add(wheelRing);
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 18), '#1f2a44', 0, 0, 0, wheelRing); ring.rotation.x = Math.PI/2;
    box(0.36, 0.03, 0.05, '#1f2a44', 0, 0, 0, wheelRing);
    for(const [sx, sz] of [[-0.98, 1.0],[0.98, 1.0],[-0.98, -1.05],[0.98, -1.05]]){
      const pivot = new THREE.Group(); pivot.position.set(sx, 0.4, sz); g.add(pivot);
      const w = cyl(0.4, 0.4, 0.32, '#1f2a44', 0, 0, 0, pivot, 16); w.rotation.z = Math.PI/2; cyl(0.2, 0.2, 0.34, '#e8edf2', 0, 0, 0, pivot, 12).rotation.z = Math.PI/2;
      car.wheels.push(pivot); if(sz > 0) car.fronts.push(pivot);
    }
    // allowSleep off: a sleeping kinematic body passes through every prop until something wakes it
    car.body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, allowSleep: false, shape: new CANNON.Box(new CANNON.Vec3(0.95, 0.55, 1.6)) });
    world.addBody(car.body);
  }

  // Dust puffs: a fixed pool of spheres, never allocated per frame.
  const puffGeo = new THREE.SphereGeometry(0.17, 8, 6), puffMat = new THREE.MeshStandardMaterial({ color:'#efe4cc', roughness:1 });
  const puffs = [];
  for(let i = 0; i < 18; i++){ const m = new THREE.Mesh(puffGeo, puffMat); m.visible = false; scene.add(m); puffs.push({ m, life:0, vx:0, vy:0, vz:0 }); }
  let puffNext = 0, puffClock = 0;
  function puff(x, z, vx, vz){
    const p = puffs[puffNext]; puffNext = (puffNext + 1) % puffs.length;
    p.life = 1; p.vx = vx; p.vy = 0.9 + Math.random()*0.6; p.vz = vz;
    p.m.position.set(x, 0.2, z); p.m.visible = true;
  }
  function stepPuffs(dt){
    for(const p of puffs){
      if(p.life <= 0) continue;
      p.life -= dt*1.6;
      if(p.life <= 0){ p.m.visible = false; continue; }
      p.m.position.x += p.vx*dt; p.m.position.y += p.vy*dt; p.m.position.z += p.vz*dt;
      p.vx *= 0.94; p.vz *= 0.94;
      const s = Math.sin(p.life*Math.PI)*1.3 + 0.2; p.m.scale.setScalar(s);
    }
  }

  const R_CAR = 1.45;
  // Walls guide instead of bouncing. After the push-out, the push direction is the wall normal
  // (summed over every collider touched, so a chain of rail posts reads as one smooth wall).
  // Within 25 degrees of square on, the car just stops with a soft bump. Otherwise the part of
  // the velocity going into the wall is dropped, the along-wall part is kept, and the nose eases
  // round to the along-wall direction you were already going. This is the only wall slide:
  // assist.js does the road guide and nothing else.
  const HEAD_ON = Math.cos(25*Math.PI/180);
  let touching = false, scrapeT = 0;
  const wall = { hits:0, slides:0, stops:0 };          // critic counters, see api.wall()
  function softBump(v){ sound.tone(95, 0.14, 'sine', 0.05 + 0.05*v, 60); spring.pv += car.speed*0.02; spring.bv -= 0.5 + 0.5*v; }
  function resolveCar(dt){
    const x0 = car.x, z0 = car.z;
    let hit = false;
    for(const c of ctx.colliders){
      if(c.kind === 'circle'){
        const dx = car.x - c.x, dz = car.z - c.z, d = Math.hypot(dx, dz), m = R_CAR + c.r;
        if(d < m && d > 1e-5){ car.x = c.x + dx/d*m; car.z = c.z + dz/d*m; hit = true; }
      } else {
        const co = Math.cos(c.ang), si = Math.sin(c.ang);
        const dx = car.x - c.x, dz = car.z - c.z;
        let lx = dx*co - dz*si, lz = dx*si + dz*co;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if(d < R_CAR){
          if(d < 1e-5){ const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if(px < pz){ lx = Math.sign(lx||1)*(c.hw + R_CAR); } else { lz = Math.sign(lz||1)*(c.hd + R_CAR); } }
          else { lx = cx + ex/d*R_CAR; lz = cz + ez/d*R_CAR; }
          car.x = c.x + lx*co + lz*si; car.z = c.z - lx*si + lz*co; hit = true;
        }
      }
    }
    const lim = ctx.island.radius - 2.5, r = Math.hypot(car.x, car.z); if(r > lim){ car.x *= lim/r; car.z *= lim/r; hit = true; }
    if(!hit){ touching = false; return; }
    let nx = car.x - x0, nz = car.z - z0; const nl = Math.hypot(nx, nz), sp = Math.abs(car.speed);
    if(nl < 1e-6 || sp < 0.05){ touching = true; return; }
    nx /= nl; nz /= nl;
    const sg = Math.sign(car.speed), vx = Math.sin(car.heading)*car.speed, vz = Math.cos(car.heading)*car.speed;
    const vn = vx*nx + vz*nz;
    if(vn >= 0){ touching = true; return; }             // already moving away from it
    const first = !touching; touching = true;
    if(first) wall.hits++;
    const into = -vn/sp;                                // 1 = square on, 0 = grazing
    if(into > HEAD_ON){
      if(first && sp > 3) softBump(Math.min(1, sp/20));
      car.speed = 0; wall.stops++;
      return;
    }
    const tx = vx - vn*nx, tz = vz - vn*nz, vt = Math.hypot(tx, tz);
    // The speed into the wall goes on the first touch only; later frames of the same scrape keep
    // the speed while the nose turns, so a long slide does not bleed it away frame after frame.
    if(first){ car.speed = sg*vt*(1 - 0.1*into); if(sp > 5) softBump(0.3*into); }
    else car.speed *= Math.exp(-0.4*dt);
    car.heading = H.lerpAngle(car.heading, Math.atan2(sg*tx, sg*tz), Math.min(1, dt*12));
    wall.slides++;
    if(sp > 4 && (scrapeT -= dt) <= 0){ scrapeT = 0.07; sound.tone(210 + Math.random()*120, 0.08, 'sawtooth', Math.min(0.04, 0.012 + sp*0.0015), 120); }
  }

  // Fake suspension: pitch (p), roll (r) and bounce (b) are damped springs driven by the motion.
  const spring = { p:0, pv:0, r:0, rv:0, b:0, bv:0, squash:0 };
  function stepSpring(dt, accel, lateral){
    const k = 90, d = 11;
    spring.pv += (-k*spring.p - d*spring.pv - accel*0.2)*dt; spring.p += spring.pv*dt;
    spring.rv += (-k*spring.r - d*spring.rv + lateral*0.25)*dt; spring.r += spring.rv*dt;
    spring.bv += (-160*spring.b - 12*spring.bv)*dt; spring.b += spring.bv*dt;
    spring.squash = Math.max(0, spring.squash - dt*3.5);
    const c = car.chassis;
    if(state.reduced){ c.rotation.set(0, 0, 0); c.position.y = 0; c.scale.set(1, 1, 1); return; }
    c.rotation.x = Math.max(-0.12, Math.min(0.12, spring.p));
    c.rotation.z = Math.max(-0.12, Math.min(0.12, spring.r));
    const road = Math.abs(Math.sin(performance.now()*0.018))*0.025*Math.min(1, Math.abs(car.speed)/6);
    c.position.y = road + spring.b;
    const s = Math.sin(spring.squash*Math.PI)*0.12*spring.squash;
    c.scale.set(1 + s, 1 - s*1.4, 1 + s);
  }

  // ai: { thr, steer } from the call autopilot instead of the keys (thr and steer in -1..1).
  function stepCar(dt, ai = null){
    const v0 = car.speed;
    const boost = !ai && keys.boost;
    const thr = ai ? ai.thr : (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
    const max = boost ? 30 : 20;
    if(thr !== 0){ const opposing = thr * car.speed < 0; car.speed += thr * (opposing ? 42 : 24) * dt; }
    else car.speed *= Math.exp(-1.6*dt);
    if(!ai && keys.brake) car.speed *= Math.exp(-7*dt);
    car.speed = Math.max(-9, Math.min(max, car.speed));
    const steerIn = ai ? ai.steer : (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    car.steer += (steerIn - car.steer) * Math.min(1, dt*10);
    car.heading += car.steer * 2.3 * dt * Math.max(-1, Math.min(1, car.speed/6));
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    car.x += fx*car.speed*dt; car.z += fz*car.speed*dt;
    resolveCar(dt);
    // physics twin
    car.body.position.set(car.x, 0.75, car.z);
    car.body.velocity.set(fx*car.speed, 0, fz*car.speed);
    car.body.quaternion.setFromEuler(0, car.heading, 0);
    // visuals
    car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.heading;
    for(const w of car.wheels) w.children.forEach(m => m.rotation.x += car.speed*dt/0.4);
    for(const w of car.fronts) w.rotation.y = car.steer*0.45;
    wheelRing.rotation.y = car.steer*1.4;
    const accel = (car.speed - v0)/Math.max(dt, 1e-3);
    const lateral = car.steer*car.speed;
    stepSpring(dt, accel, lateral);
    // dust from the rear wheels when launching, boosting, braking hard or carving a turn
    puffClock -= dt;
    const kick = Math.abs(accel) > 14 || (boost && Math.abs(car.speed) > 12) || Math.abs(lateral) > 14;
    if(kick && Math.abs(car.speed) > 1.5 && puffClock <= 0 && !state.reduced){
      puffClock = 0.05;
      const bx = -fx*1.2, bz = -fz*1.2, sx = Math.cos(car.heading)*0.95, sz = -Math.sin(car.heading)*0.95;
      const side = Math.random() < 0.5 ? 1 : -1;
      puff(car.x + bx + sx*side, car.z + bz + sz*side, -fx*car.speed*0.12 + (Math.random()-0.5), -fz*car.speed*0.12 + (Math.random()-0.5));
    }
    sound.engine(car.speed);
  }

  // Door swing, driven by openDoor(); 0..1 over the animation.
  let doorT = 0;
  function stepDoor(dt){
    if(doorT <= 0){ door.rotation.y = 0; return; }
    doorT = Math.max(0, doorT - dt/0.7);
    door.rotation.y = -Math.sin(doorT*Math.PI) * 1.15;   // swings outward from the front hinge
  }

  // Parked: visuals and the kinematic twin sit still where the car is.
  function park(){
    car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.heading;
    car.body.position.set(car.x, 0.75, car.z); car.body.velocity.setZero(); car.body.quaternion.setFromEuler(0, car.heading, 0);
  }
  function syncPlayer(){ const P = state.player; P.x = car.x; P.z = car.z; P.heading = car.heading; P.speed = car.speed; P.pushRadius = 2.4; }

  /* ---------- call: C while walking, the car drives itself to your right side ---------- */
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const call = { on:false, t:0, stuck:0, best:1e9, side:1, near:[], nearT:0, spot:null, spotT:0, settle:0, from:null };
  // True when a disc of radius r at (x, z) is clear of every collider in list and inside the edge.
  function fits(x, z, r, list){
    if(Math.hypot(x, z) > ctx.island.radius - 3) return false;
    for(const c of list){
      const dx = x - c.x, dz = z - c.z;
      if(c.kind === 'circle'){ if(dx*dx + dz*dz < (r + c.r)*(r + c.r)) return false; continue; }
      const reach = r + c.hw + c.hd; if(Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const co = Math.cos(c.ang), si = Math.sin(c.ang), lx = dx*co - dz*si, lz = dx*si + dz*co;
      if(Math.hypot(Math.max(0, Math.abs(lx) - c.hw), Math.max(0, Math.abs(lz) - c.hd)) < r) return false;
    }
    return true;
  }
  // Dry ground or a road (bridges count), so the car is never sent into a lake after a swimmer.
  function dryAt(x, z){ const L = ctx.modules.map?.layout; if(!L?.landAt) return true; return L.landAt(x, z) || (L.roadDistAt?.(x, z) ?? 9) < 4.5; }
  // Where to park: the walker's right side first. Heading h faces (sin h, cos h), so his right is
  // (-cos h, sin h). If that is blocked, the first clear spot round him.
  function callSpot(){
    const P = state.player, h = P.heading, rx = -Math.cos(h), rz = Math.sin(h), fx = Math.sin(h), fz = Math.cos(h);
    for(const [a, b] of [[2.6, 0], [3.3, 0], [2.6, -1.6], [2.6, 1.6], [-2.6, 0], [-3.3, 0], [0, -3.6], [0, 3.6]]){
      const x = P.x + rx*a + fx*b, z = P.z + rz*a + fz*b;
      if(fits(x, z, R_CAR, ctx.colliders) && dryAt(x, z)) return { x, z, h };
    }
    return null;
  }
  const WHISKERS = [0, 0.35, 0.7, 1.05, 1.5, 2.0];
  // A heading is open when two probes along it (half way and at the look distance) fit the car
  // and stay dry and clear of the walker.
  function openAlong(a, look){
    const P = state.player;
    for(const d of [look*0.5, look]){
      const x = car.x + Math.sin(a)*d, z = car.z + Math.cos(a)*d;
      if(!fits(x, z, R_CAR*0.85, call.near) || !dryAt(x, z) || Math.hypot(x - P.x, z - P.z) < R_CAR*0.85 + 0.6) return false;
    }
    return true;
  }
  function honkShort(){ sound.tone(415, 0.12, 'square', 0.06); sound.tone(523, 0.12, 'square', 0.05); setTimeout(() => { sound.tone(415, 0.1, 'square', 0.05); sound.tone(523, 0.1, 'square', 0.04); }, 150); }
  function arrive(){ call.on = false; honkShort(); H.jolt(car.x, car.z, 8); spring.squash = 1; spring.bv += 1.2; sound.engine(null); }
  function poof(x, z){
    const n = state.reduced ? 4 : 8;
    for(let i = 0; i < n; i++){ const a = i/n*Math.PI*2; puff(x + Math.cos(a)*0.9, z + Math.sin(a)*0.9, Math.cos(a)*2.6, Math.sin(a)*2.6); }
  }
  function startCall(){
    if(state.mode !== 'walk' || !state.started) return false;
    const s = callSpot();
    if(!s){ ctx.bus.emit('car:call', { ok:false }); return false; }
    Object.assign(call, { on:true, t:0, stuck:0, best:1e9, spot:s, spotT:0, nearT:0, settle:0, from:null });
    ctx.bus.emit('car:call', { ok:true });
    return true;
  }
  function stopCall(){ call.on = false; call.settle = 0; }
  function stepCall(dt){
    call.t += dt;
    if(call.settle === 0 && (call.spotT -= dt) <= 0){
      call.spotT = 0.25; const was = call.spot; call.spot = callSpot() || call.spot;
      if(Math.hypot(call.spot.x - was.x, call.spot.z - was.z) > 2) call.best = 1e9;   // he walked on: progress counts from here
    }   // the spot is frozen once it is parking
    if((call.nearT -= dt) <= 0){ call.nearT = 0.25; call.near = ctx.colliders.filter(c => Math.abs(c.x - car.x) < 26 && Math.abs(c.z - car.z) < 26); }
    const s = call.spot, dx = s.x - car.x, dz = s.z - car.z, dist = Math.hypot(dx, dz);
    // Last metre: ease onto the spot and turn to face the walker's way, then honk.
    if(call.settle > 0 || dist < 1.2){
      if(!call.from) call.from = { x:car.x, z:car.z, h:car.heading };
      call.settle = Math.min(1, call.settle + dt/0.4);
      const e = 1 - Math.pow(1 - call.settle, 3), f = call.from;
      car.x = f.x + (s.x - f.x)*e; car.z = f.z + (s.z - f.z)*e; car.heading = H.lerpAngle(f.h, s.h, e);
      car.speed = 0; car.steer *= 0.8; park(); stepSpring(dt, 0, 0); sound.engine(null);
      if(call.settle >= 1) arrive();
      return;
    }
    // Stuck = no metre of progress toward the spot for 4 s (or 15 s in all): pop over in a puff of dust.
    if(dist < call.best - 1){ call.best = dist; call.stuck = 0; } else call.stuck += dt;
    if(call.stuck > 4 || call.t > 15){ poof(car.x, car.z); api.placeAt(s.x, s.z, s.h); poof(s.x, s.z); sound.tone(660, 0.16, 'sine', 0.06, 1320); arrive(); return; }
    // Whiskers: the open heading nearest the straight line. The side that worked last is tried
    // first, so the car commits to going round an obstacle one way instead of dithering.
    const direct = Math.atan2(dx, dz), look = Math.min(dist, 3 + Math.abs(car.speed)*0.35);
    let want = direct;
    for(const w of WHISKERS){
      const opts = w ? [w*call.side, -w*call.side] : [0];
      const hit = opts.find(o => openAlong(direct + o, look));
      if(hit !== undefined){ want = direct + hit; if(hit) call.side = Math.sign(hit); break; }
    }
    const err = wrap(want - car.heading);
    const cap = Math.max(4, Math.min(16, 2 + dist*2.2)*Math.max(0.35, Math.cos(err)));   // slow into tight turns and on arrival
    stepCar(dt, { thr: car.speed < cap - 0.5 ? 1 : car.speed > cap + 0.5 ? -1 : 0, steer: Math.max(-1, Math.min(1, err*3)) });
  }

  buildCar();
  park();

  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    if(mode === 'drive' && state.started) stepCar(dt);
    else if(mode === 'walk' && call.on) stepCall(dt);
    else { park(); stepSpring(dt, 0, 0); if(mode !== 'drive') sound.engine(null); }
    stepDoor(dt); stepPuffs(dt);
    if(mode === 'drive') syncPlayer();
  }, 10);
  // Into the car: write state.player from the car at once, so nothing reads the walker's last
  // spot for a frame (the camera would swing to it and back).
  ctx.bus.on('mode', ({ to }) => { stopCall(); if(to !== 'drive'){ car.speed = 0; car.steer = 0; sound.engine(null); } else syncPlayer(); });
  ctx.bus.on('teleport', stopCall);
  input.on('call', () => { if(state.mode === 'walk') startCall(); });

  input.on('honk', () => {
    if(state.mode !== 'drive') return;
    sound.sfx.honk(); H.jolt(car.x, car.z, 20); spring.squash = 1; spring.bv += 1.5;
  });

  const api = {
    car,
    seat,                              // Group in the cockpit; the driver parents itself here
    placeAt(x, z, heading){ stopCall(); car.x = x; car.z = z; car.heading = heading; car.speed = 0; car.steer = 0; park(); if(state.mode === 'drive') syncPlayer(); },
    get position(){ return { x:car.x, z:car.z, heading:car.heading }; },
    radius: R_CAR,
    halfWidth: 0.98, halfLength: 1.62, // footprint for walkers to collide against
    openDoor(){ doorT = 1; },
    bump(v = 1){ spring.bv -= 1.4*v; spring.squash = Math.max(spring.squash, 0.6*v); },
    call: startCall,                   // C while walking; false when there is no room beside you
    stopCall,
    calling: () => call.on,
    wall: () => ({ ...wall, touching }),
  };
  ctx.modes.registerPlayer('drive', api);
  // Critic hooks: window.__island.car
  ctx.expose('car', { call: startCall, stopCall, calling: api.calling, wall: api.wall,
    info: () => ({ x:+car.x.toFixed(2), z:+car.z.toFixed(2), heading:+car.heading.toFixed(3), speed:+car.speed.toFixed(2), calling:call.on, stuck:+call.stuck.toFixed(2), spot:call.spot && { x:+call.spot.x.toFixed(2), z:+call.spot.z.toFixed(2) } }) });
  return api;
}
