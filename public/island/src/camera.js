// Island camera. Owned by the camera builder.
// Contract: init(ctx) returns { update(dt, t), setTarget(target|null), setMode(name) }.
// update() is called by core every island frame (never inside an interior). It must position
// ctx.camera and write the look-at point into ctx.state.focus (the sun's shadow box follows it).
//
// What it does:
//  - Three presets, cycled with P (C calls the vehicle, V is first person): follow (high chase behind
//    the player), overview (high, fixed 3/4 view of the island), cinematic (low, off the shoulder).
//    A fourth, god (high, looking down at a fixed slight tilt), is only set by setMode('god'); the
//    drone uses it. Presets blend, never cut.
//  - V toggles first person (see firstPerson): the walker's eyes, or a cockpit seat in the car.
//    Both ways blend over 0.4 s. Rooms keep their own camera; the mode is back on return.
//  - Drag (mouse left or right button, one finger) orbits around the player, wheel (core) and
//    pinch (here) zoom through state.zoom. With holdView on (the default) the camera then HOLDS
//    that world angle, even as the car turns, until P or a preset change recentres it. With it
//    off, the orbit eases back to the preset after ~1.6 s, sooner once the player moves.
//  - Buildings never sit between the player and the camera: a ray from the player to the camera
//    is tested against building meshes (meshes standing on a box collider), and the camera is
//    pulled in front of the first hit.
//  - Stepping out of a room gets a composed shot (see exitShot): a 3/4 view from the approach side
//    with the walker, the building front and, when it fits, the parked car, held until he moves.
//  - Inside a room the room camera stays the owner. A late hook (order 88) adds the same drag and
//    zoom as a small, clamped offset on top of whatever pose the room or the walker set. A room can
//    opt out with room.cameraOrbit = false.
export function init(ctx){
  const { THREE, camera, state, bus } = ctx;

  const PRESETS = {
    follow:    { label:'Follow',    dist:24,  pitch:0.72, yaw:'behind', bias:0,     fov:38, lookY:0.8, lead:0.18 },
    overview:  { label:'Overview',  dist:50,  pitch:1.0,  yaw:0.487,    bias:0,     fov:38, lookY:0,   lead:0.08 },
    cinematic: { label:'Cinematic', dist:12.5, pitch:0.22, yaw:'behind', bias:0.55, fov:46, lookY:1.7, lead:0.35 },
    god:       { label:'God view',  dist:24,  pitch:1.08, yaw:0.42,     bias:0,     fov:40, lookY:0,   lead:0.3 },
  };
  const ORDER = ['follow', 'overview', 'cinematic'];   // what V cycles; god is set by code only
  let preset = 'follow';

  // Smoothed spherical rig around the focus point.
  const P0 = PRESETS[preset];
  const rig = { dist:P0.dist, pitch:P0.pitch, fov:P0.fov, lookY:P0.lookY, lead:P0.lead, yaw:0 };
  const user = { yaw:0, pitch:0, lastInput:-1e9, hold:false };   // drag offsets on top of the preset
  let zoomS = state.zoom, camDist = rig.dist, snap = true, target = null, pitchLift = 0;
  let shot = null;   // { yaw, pitch, dist, fov, look } while the exit shot holds
  // holdView: after a drag the rig stops chasing the preset yaw, so the dragged world angle stays.
  let holdOn = true, held = false;

  const camLook = state.focus, camPos = new THREE.Vector3();
  const tgt = new THREE.Vector3(), lead = new THREE.Vector3(), dir = new THREE.Vector3(), pivot = new THREE.Vector3();
  const TAU = Math.PI*2;
  const wrap = a => a - TAU*Math.floor((a + Math.PI)/TAU);
  const damp = (a, b, rate, dt) => a + (b - a)*(1 - Math.exp(-rate*dt));
  const dampAngle = (a, b, rate, dt) => a + wrap(b - a)*(1 - Math.exp(-rate*dt));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => performance.now()/1000;

  // ---------- occluders: meshes that stand on a building's box collider ----------
  const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
  let occluders = [], occAge = 1e9;
  const sph = new THREE.Sphere();
  function insideBuilding(x, z){
    for(const c of ctx.colliders){
      if(c.kind !== 'box' || c.hw*c.hd < 0.75) continue;
      const dx = x - c.x, dz = z - c.z, co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0);
      const lx = dx*co - dz*si, lz = dx*si + dz*co;
      if(Math.abs(lx) <= c.hw + 0.5 && Math.abs(lz) <= c.hd + 0.5) return true;
    }
    return false;
  }
  function movers(){
    const skip = new Set();
    const add = o => { if(o) skip.add(o); };
    add(ctx.modules.car?.car?.group); add(ctx.modules.character?.group);
    for(const p of ctx.props || []) add(p.obj || p.mesh || p.group);
    for(const c of ctx.chars || []) add(c.group || c.obj);
    return skip;
  }
  function collectOccluders(){
    const skip = movers();
    const out = [];
    ctx.scene.updateMatrixWorld();
    ctx.scene.traverse(o => {
      if(skip.has(o)) return;   // traverse still visits children; checked again below via ancestry
      if(!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry) return;
      const m = o.material; if(!m || m.transparent || Array.isArray(m)) return;
      for(let a = o.parent; a; a = a.parent) if(skip.has(a)) return;
      if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if(sph.radius < 0.8 || sph.radius > 45 || sph.center.y + sph.radius < 1.4) return;
      if(insideBuilding(sph.center.x, sph.center.z)) out.push(o);
    });
    occluders = out;
  }
  const hits = [];
  function clearDistance(from, toDir, far){
    if(!occluders.length) return far;
    ray.set(from, toDir); ray.near = 0.3; ray.far = far;
    hits.length = 0;
    ray.intersectObjects(occluders, false, hits);
    return hits.length ? hits[0].distance : far;
  }

  // ---------- island update ----------
  function update(dt){
    const on = fpActive();
    if(on !== fp.was){ fp.was = on; startBlend(); if(on) fp.snap = true; else snap = true; }
    let done = false;
    if(on){
      try { firstPerson(dt); done = true; }
      catch(e){ console.warn('[camera] first person failed; back to follow', e); fp.on = fp.was = false; snap = true; }
    }
    if(!done){ hideHead(false); if(locked()) exitLock(); follow(dt); }
    try { applyBlend(dt); } catch(e){ blend.t = 1; }
  }

  function follow(dt){
    const T = target || state.player;
    const p = PRESETS[preset], t = now();
    occAge += dt; if(occAge > 5){ occAge = 0; try { collectOccluders(); } catch(e){ occluders = []; } }

    // Rest yaw: behind the player's heading, or a fixed world angle.
    const heading = T.heading || 0, speed = Math.abs(T.speed || 0);
    const restYaw = p.yaw === 'behind' ? heading + Math.PI + p.bias : p.yaw;
    const chase = p.yaw === 'behind' ? 0.45 + Math.min(speed, 14)*0.17 : 4;

    // The exit shot holds until the player moves or drags; the rig then eases from it as usual.
    if(shot && (speed > 1.5 || drag.active || target)){ shot = null; user.yaw = user.pitch = 0; }
    if(shot){
      rig.yaw = shot.yaw; rig.dist = shot.dist; rig.pitch = shot.pitch; rig.fov = shot.fov; rig.lookY = shot.look.y; rig.lead = 0;
      if(Math.abs(camera.fov - rig.fov) > 0.01){ camera.fov = rig.fov; camera.updateProjectionMatrix(); }
      camLook.copy(shot.look); pitchLift = 0; camDist = shot.dist; zoomS = state.zoom; snap = false;
      aimAt(camPos, shot.look, shot.yaw, shot.pitch, shot.dist);
      camera.position.copy(camPos); camera.lookAt(camLook);
      return;
    }

    // Drag offsets relax after idle, faster when the player is moving.
    const idle = t - user.lastInput;
    if(user.hold && (speed > 1.5 || drag.active)) user.hold = false;
    if(!drag.active && !user.hold && !held && idle > (speed > 1.5 ? 0.5 : 1.6)){
      user.yaw = damp(user.yaw, 0, speed > 1.5 ? 2.2 : 1.3, dt);
      user.pitch = damp(user.pitch, 0, 1.6, dt);
    }

    zoomS = damp(zoomS, state.zoom, 9, dt);
    if(snap){
      rig.yaw = restYaw; rig.dist = p.dist; rig.pitch = p.pitch; rig.fov = p.fov; rig.lookY = p.lookY; rig.lead = p.lead;
      zoomS = state.zoom;
    } else {
      if(!held) rig.yaw = dampAngle(rig.yaw, restYaw, chase, dt);
      rig.dist = damp(rig.dist, p.dist, 3, dt); rig.pitch = damp(rig.pitch, p.pitch, 3, dt);
      rig.fov = damp(rig.fov, p.fov, 3, dt); rig.lookY = damp(rig.lookY, p.lookY, 3, dt); rig.lead = damp(rig.lead, p.lead, 3, dt);
    }
    if(Math.abs(camera.fov - rig.fov) > 0.01){ camera.fov = rig.fov; camera.updateProjectionMatrix(); }

    // Focus point with a small look-ahead in the direction of travel.
    tgt.set(T.x, rig.lookY + (T.y || 0), T.z);
    lead.set(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar((T.speed || 0)*rig.lead);
    tgt.add(lead);
    if(snap || state.reduced) camLook.copy(tgt); else camLook.lerp(tgt, 1 - Math.exp(-dt*5));

    const yaw = rig.yaw + user.yaw, basePitch = clamp(rig.pitch + user.pitch, 0.1, 1.45);
    const want = rig.dist*zoomS;
    const aim = pitch => dir.set(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch));

    // Never through a building. First rise over it (up to near top-down), then pull in to just
    // before whatever is still in the way.
    pivot.set(T.x, Math.max(1.2, T.y || 0), T.z);
    let lift = 0;
    if(clearDistance(pivot, aim(basePitch), want + 0.8) < want*0.75 + 0.8){
      lift = 1.45 - basePitch;
      for(let l = 0.15; basePitch + l < 1.45; l += 0.15){
        if(clearDistance(pivot, aim(basePitch + l), want + 0.8) >= want*0.75 + 0.8){ lift = l; break; }
      }
    }
    pitchLift = snap ? lift : damp(pitchLift, lift, lift > pitchLift ? 7 : 1.2, dt);
    const pitch = clamp(basePitch + pitchLift, 0.1, 1.45);
    const clear = clearDistance(pivot, aim(pitch), want + 0.8);
    const allowed = clamp(clear - 0.8, 3.2, want);
    camDist = snap ? allowed : (allowed < camDist ? damp(camDist, allowed, 18, dt) : damp(camDist, allowed, 2.5, dt));

    camPos.copy(camLook).addScaledVector(dir, camDist);
    if(camPos.y < 0.9) camPos.y = 0.9;
    camera.position.copy(camPos); camera.lookAt(camLook);
    snap = false;
  }

  function aimAt(out, look, yaw, pitch, dist){
    return out.set(look.x + Math.sin(yaw)*Math.cos(pitch)*dist, look.y + Math.sin(pitch)*dist, look.z + Math.cos(yaw)*Math.cos(pitch)*dist);
  }

  // ---------- first person (V) ----------
  // Walking: the eye sits in the walker's head; mouse (pointer lock) or drag turns and tilts it.
  // character.js steers WASD by ctx.camera's facing, so W walks where you look with nothing
  // written to state.player. Driving: the driver's eye over the bonnet, trailing the car's turns a
  // little; a look around eases back to straight ahead 1.5 s after the last input.
  const PMAX = 1.22;                                   // pitch clamp, about 70 degrees either way
  const fp = { on:false, was:false, snap:true, yaw:0, pitch:0, cy:0, ly:0, lp:0, fov:70, bob:0, lastInput:-1e9, hidden:false, near:camera.near };
  const eye = new THREE.Vector3(), fdir = new THREE.Vector3(), flook = new THREE.Vector3();
  const blend = { t:1, pos:new THREE.Vector3(), quat:new THREE.Quaternion(), fov:38 };
  const bv = new THREE.Vector3(), bq = new THREE.Quaternion();
  const fpActive = () => fp.on && !target;             // a drone (setTarget) takes the camera back
  const locked = () => document.pointerLockElement === ctx.renderer.domElement;
  function exitLock(){ try { if(locked()) document.exitPointerLock?.(); } catch(e){} }
  function requestLock(){
    try { const p = ctx.renderer.domElement.requestPointerLock?.(); if(p?.catch) p.catch(() => {}); } catch(e){}   // refused: drag still looks
  }
  // Hide the walker's head (character.js, if it offers it). Only then may the near plane come in,
  // so a wall he stands against stays solid; without it the default near plane clips the head.
  function hideHead(on){
    if(fp.hidden === on) return;
    fp.hidden = on;
    let ok = false;
    try { const f = ctx.modules.character?.setFirstPerson; if(typeof f === 'function'){ f(on); ok = true; } } catch(e){}
    const n = on && ok ? 0.3 : fp.near;
    if(camera.near !== n){ camera.near = n; camera.updateProjectionMatrix(); }
  }
  // Eye height in world y: character.headY (number or getter) if offered, else 1.5 m over his feet.
  function headY(){
    const c = ctx.modules.character, h = typeof c?.headY === 'function' ? c.headY() : c?.headY;
    if(Number.isFinite(h)) return h;
    const g = c?.group;
    return (g && g.parent === ctx.scene ? g.position.y : 0) + 1.5;
  }
  // Yaw of where the camera faces now, in the heading convention: forward is (sin yaw, cos yaw).
  function camYaw(){ camera.getWorldDirection(fdir); return Math.atan2(fdir.x, fdir.z); }
  function fpLook(dx, dy, k){
    // Moving right turns right, and with forward (sin yaw, cos yaw) turning right lowers yaw.
    if(state.mode === 'drive'){ fp.ly = clamp(fp.ly - dx*k, -2.2, 2.2); fp.lp = clamp(fp.lp - dy*k, -0.9, 0.9); }
    else { fp.yaw = wrap(fp.yaw - dx*k); fp.pitch = clamp(fp.pitch - dy*k, -PMAX, PMAX); }
    fp.lastInput = now();
  }
  function setFirstPerson(on){
    on = !!on;
    if(on === fp.on) return fp.on;
    fp.on = on; shot = null;
    if(on){ fp.yaw = state.player.heading || 0; fp.pitch = 0; fp.ly = fp.lp = 0; say('First person  (V to go back)'); }
    else { exitLock(); say('Camera: ' + PRESETS[preset].label + '  (P to change)'); }
    return fp.on;
  }
  function firstPerson(dt){
    const P = state.player, t = now();
    const car = state.mode === 'drive' ? ctx.modules.car?.car : null;
    hideHead(true);
    if(locked() && ctx.modules.dialog?.busy?.()) exitLock();   // the dialog box wants its clicks
    let yaw, pitch, fov;
    if(car){
      fp.cy = fp.snap ? car.heading : dampAngle(fp.cy, car.heading, 7, dt);   // trails the car's turn slightly
      if(!drag.active && t - fp.lastInput > 1.5){ fp.ly = damp(fp.ly, 0, 2.5, dt); fp.lp = damp(fp.lp, 0, 2.5, dt); }
      yaw = fp.cy + fp.ly; pitch = clamp(-0.1 + fp.lp, -PMAX, PMAX); fov = 64;   // -0.1: a touch down, over the bonnet
      const seat = ctx.modules.car?.seat;
      // The driver's head: seat, his root 0.36 below it, head 1.38 above that.
      if(seat?.parent){ seat.updateWorldMatrix(true, false); seat.localToWorld(eye.set(0, 1.02, 0)); }
      else eye.set(car.x - Math.sin(car.heading)*0.4, 2.1, car.z - Math.cos(car.heading)*0.4);
    } else {
      const speed = Math.abs(P.speed || 0), amt = state.reduced ? 0 : Math.min(1, speed/4.6);
      if(amt > 0.05) fp.bob += dt*(6 + speed*1.9);                 // the walker's stride clock, so bobs land on steps
      yaw = fp.yaw; pitch = fp.pitch; fov = speed > 6 ? 78 : 70;    // sprinting widens the view by 8 degrees
      const s = Math.sin(fp.bob), sway = s*0.03*amt;
      // Up and down twice a stride, side to side once; screen right at this yaw is (-cos yaw, 0, sin yaw).
      eye.set(P.x - Math.cos(yaw)*sway, headY() + (Math.abs(s) - 0.5)*0.08*amt, P.z + Math.sin(yaw)*sway);
    }
    fp.fov = fp.snap ? fov : damp(fp.fov, fov, 5, dt);
    if(Math.abs(camera.fov - fp.fov) > 0.01){ camera.fov = fp.fov; camera.updateProjectionMatrix(); }
    // View direction from yaw and pitch; look at a point one metre down it.
    fdir.set(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch));
    camera.position.copy(eye); camera.lookAt(flook.copy(eye).add(fdir));
    // The sun's shadow box follows state.focus, so centre it on the ground 10 m ahead.
    camLook.set(eye.x + Math.sin(yaw)*10, 0, eye.z + Math.cos(yaw)*10);
    fp.snap = false;
  }
  // Blend: ease from the pose held when the camera changed owner to whatever this frame computed.
  function startBlend(){ blend.t = state.reduced ? 1 : 0; blend.pos.copy(camera.position); blend.quat.copy(camera.quaternion); blend.fov = camera.fov; }
  function applyBlend(dt){
    if(blend.t >= 1) return;
    blend.t = Math.min(1, blend.t + dt/0.4);
    const k = blend.t*blend.t*(3 - 2*blend.t);                        // smoothstep
    bv.copy(camera.position); camera.position.lerpVectors(blend.pos, bv, k);
    bq.copy(camera.quaternion); camera.quaternion.copy(blend.quat).slerp(bq, k);
    camera.fov = blend.fov + (camera.fov - blend.fov)*k; camera.updateProjectionMatrix();
  }
  // Hopping in or out mid first person: blend from the old eye; walking keeps the car's facing.
  bus.on('mode', ({ from, to }) => {
    if(!fp.on || from === 'interior' || to === 'interior') return;
    startBlend(); fp.snap = true; fp.ly = fp.lp = 0;
    if(to === 'walk'){ fp.yaw = camYaw(); fp.pitch = 0; }
  });
  // Rooms own their camera: show his head there and free the mouse. fp.on survives, so the island
  // comes back in first person, facing out of the door.
  bus.on('interior:enter', () => { hideHead(false); exitLock(); blend.t = 1; });
  bus.on('interior:exit', ({ door }) => { if(fp.on){ fp.yaw = door ? door.heading : (state.player.heading || 0); fp.pitch = 0; fp.snap = true; } });
  bus.on('game:start', exitLock);

  // ---------- exit shot: a composed view of the walker, the building front and the car ----------
  // Leaving a room drops the walker just outside the door, facing away from it. A plain chase
  // camera there looks back past the building (or gets pulled into his head by whatever stands
  // by the door), so instead we pick a 3/4 view from the approach side once, under the fade.
  // Candidates sweep yaw either side of straight-on, a few pitches and distances; each must sit
  // outside every collider, see the walker and the doorway unblocked, keep both on screen and clear
  // of the zone card (lower left), and scores extra when the parked car is in frame too.
  const sc = camera.clone(), pv = new THREE.Vector3(), pc = new THREE.Vector3(), pl = new THREE.Vector3(), rd = new THREE.Vector3();
  let nearCols = [];                             // colliders within reach of the shot, gathered once per exit
  function inFootprint(x, z, m){
    for(const c of nearCols){
      if(c.kind === 'circle'){ if(Math.hypot(x - c.x, z - c.z) < c.r + m) return true; continue; }
      if(c.kind !== 'box' || c.hw*c.hd < 0.75) continue;
      const dx = x - c.x, dz = z - c.z, co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0);
      if(Math.abs(dx*co - dz*si) <= c.hw + m && Math.abs(dx*si + dz*co) <= c.hd + m) return true;
    }
    return false;
  }
  // Everything solid near the door, signs and boards included (the running occluder list keeps
  // only buildings, since the follow camera rises over the rest).
  let near = [];
  function collectNear(x, z, r){
    const skip = movers(), out = [];
    ctx.scene.updateMatrixWorld();
    ctx.scene.traverse(o => {
      if(!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry) return;
      for(let a = o; a; a = a.parent) if(skip.has(a)) return;
      if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if(sph.radius < 0.35 || sph.radius > 45 || sph.center.y + sph.radius < 0.6) return;
      if(Math.hypot(sph.center.x - x, sph.center.z - z) - sph.radius < r) out.push(o);
    });
    return out;
  }
  let rayCount = 0;
  function seen(from, x, y, z, slack){
    rayCount++;          // true when nothing solid stands between from and (x, y, z)
    rd.set(x, y, z).sub(from); const L = rd.length(); rd.divideScalar(L);
    ray.set(from, rd); ray.near = 0.3; ray.far = L;
    hits.length = 0; ray.intersectObjects(near, false, hits);
    return !hits.length || hits[0].distance >= L - slack;
  }
  function onScreen(x, y, z, lim){ pv.set(x, y, z).project(sc); return pv.z < 1 && Math.abs(pv.x) < lim && Math.abs(pv.y) < lim ? pv : null; }
  function exitShot(door){
    if(!door) return null;
    const t0 = performance.now();
    near = collectNear(door.x, door.z, 30);
    nearCols = ctx.colliders.filter(c => Math.hypot(c.x - door.x, c.z - door.z) < 34 + (c.r || Math.hypot(c.hw || 0, c.hd || 0)));
    const t1 = performance.now();
    const fx = Math.sin(door.heading), fz = Math.cos(door.heading);
    const px = door.x + fx*1.4, pz = door.z + fz*1.4;                 // where he ends up after stepping out
    const bx = door.x - fx*1.4, bz = door.z - fz*1.4;                 // the doorway on the facade
    const car = ctx.modules.car?.car, carOn = car && state.mode === 'walk' && Math.hypot(car.x - px, car.z - pz) < 26;
    sc.aspect = camera.aspect; sc.fov = 40; sc.updateProjectionMatrix();
    let best = null; const cands = [];
    for(const off of [-1.05, -0.8, -0.55, -0.3, 0, 0.3, 0.55, 0.8, 1.05]){
      const yaw = door.heading + off;
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);                 // screen right at this yaw
      // Look between him and the doorway (and, as a second option, pulled toward the car), nudged so
      // the group sits right of centre, away from the card.
      for(const wc of carOn ? [0, 0.3] : [0]) for(const pitch of [0.4, 0.52, 0.66, 0.8]) for(const dist of [12, 14.5, 17, 20, 23]){
        const cx = wc ? car.x : 0, cz = wc ? car.z : 0, wp = 0.6 - wc*0.6, wb = 0.4 - wc*0.4;
        const lx = px*wp + bx*wb + cx*wc - rx*dist*0.1, lz = pz*wp + bz*wb + cz*wc - rz*dist*0.1;
        pl.set(lx, 1.5, lz); aimAt(pc, pl, yaw, pitch, dist);
        if(inFootprint(pc.x, pc.z, 1.2) || Math.hypot(pc.x - px, pc.y - 1, pc.z - pz) < 4) continue;
        sc.position.copy(pc); sc.lookAt(pl); sc.updateMatrixWorld();
        const me = onScreen(px, 1, pz, 0.8); if(!me) continue;
        const inCard = me.x < -0.3 && me.y < 0.05;
        if(!onScreen(bx, 1.8, bz, 0.85) || !onScreen(bx, 3.2, bz, 0.9)) continue;
        let score = -Math.abs(Math.abs(off) - 0.5)*1.2 - Math.abs(pitch - 0.55)*2 - Math.abs(dist - 15)*0.1 - (inCard ? 4 : 0);
        const carIn = carOn && (cv => cv && !(cv.x < -0.25 && cv.y < 0.1))(onScreen(car.x, 0.8, car.z, 0.72));
        for(const c of nearCols){                                        // a tree between him and the lens
          if(c.kind !== 'circle' || c.r < 0.3) continue;
          const sx = pc.x - px, sz = pc.z - pz, L2 = sx*sx + sz*sz;
          const u = clamp(((c.x - px)*sx + (c.z - pz)*sz)/L2, 0, 1);
          if(u > 0.05 && Math.hypot(px + sx*u - c.x, pz + sz*u - c.z) < c.r + 0.5 && 1 + (pc.y - 1)*u < 7) score -= 1.5;
        }
        cands.push({ score, carIn, pos:pc.clone(), yaw, pitch, dist, fov:40, look:pl.clone() });
      }
    }
    // Rays are the expensive part (a few hundred candidates, a few rays each), so check the best
    // looking candidates first and stop once nothing left can beat the best one that passed.
    const CAR = 3;
    cands.sort((a, b) => (b.score + (b.carIn ? CAR : 0)) - (a.score + (a.carIn ? CAR : 0)));
    for(const k of cands){
      if(best && k.score + (k.carIn ? CAR : 0) <= best.score) break;
      if(!seen(k.pos, px, 1.2, pz, 0.6) || !seen(k.pos, bx, 1.6, bz, 2.4)) continue;
      if(k.carIn && seen(k.pos, car.x, 1, car.z, 1.2)) k.score += CAR;
      if(!best || k.score > best.score) best = k;
    }
    near = []; nearCols = [];
    if(best) best.ms = [+(t1 - t0).toFixed(1), +(performance.now() - t1).toFixed(1), rayCount]; rayCount = 0;
    return best;
  }

  // ---------- pointer: drag orbit and pinch zoom ----------
  const el = ctx.renderer.domElement;
  const drag = { active:false, pts:new Map(), pinch:0, moved:0 };
  try { el.style.touchAction = 'none'; } catch(e){}
  const canUse = () => state.started && !(ctx.modules.games?.active?.());
  function orbitBy(dx, dy){
    const inside = state.mode === 'interior';
    if(!inside && fpActive()){ fpLook(dx, dy, 0.0045); return; }
    const o = inside ? iuser : user;
    o.yaw -= dx*0.0055; o.pitch += dy*0.004;
    if(inside){ o.yaw = clamp(o.yaw, -0.55, 0.55); o.pitch = clamp(o.pitch, -0.5, 0.5); }
    else {
      o.yaw = wrap(o.yaw); o.pitch = clamp(o.pitch, -0.62, 0.8);
      if(holdOn && !held){ held = true; say('View held. P to recentre'); }
    }
    o.lastInput = now();
  }
  function zoomBy(f){
    if(state.mode === 'interior'){ izoom = clamp(izoom*f, 0.55, 1.35); iuser.lastInput = now(); }
    else state.zoom = clamp(state.zoom*f, 0.6, 1.7);
  }
  el.addEventListener('pointerdown', e => {
    if(!canUse() || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2)) return;
    if(e.pointerType === 'mouse' && state.mode !== 'interior' && fpActive() && !locked()) requestLock();
    drag.pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    try { el.setPointerCapture(e.pointerId); } catch(err){}
    drag.active = true; drag.moved = 0;
    if(drag.pts.size === 2){ const [a, b] = [...drag.pts.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  el.addEventListener('pointermove', e => {
    // Pointer lock: the cursor never moves, so read the raw movement and look with it, button or not.
    if(locked()){ if(canUse() && state.mode !== 'interior' && fpActive()) fpLook(e.movementX || 0, e.movementY || 0, 0.0025); return; }
    const pt = drag.pts.get(e.pointerId); if(!pt) return;
    const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
    pt.x = e.clientX; pt.y = e.clientY;
    if(drag.pts.size >= 2){
      const [a, b] = [...drag.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if(drag.pinch > 0 && d > 0) zoomBy(drag.pinch/d);
      drag.pinch = d;
      return;
    }
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if(drag.moved > 3) orbitBy(dx, dy);
  });
  const up = e => {
    drag.pts.delete(e.pointerId); drag.pinch = 0;
    if(!drag.pts.size){ drag.active = false; user.lastInput = iuser.lastInput = now(); }
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
  // Trackpad pinch arrives as ctrl+wheel; stop the browser zooming the page. Core's wheel
  // listener still changes state.zoom on the island.
  addEventListener('wheel', e => {
    if(!state.started) return;
    if(e.ctrlKey) e.preventDefault();
    if(state.mode === 'interior') zoomBy(e.deltaY > 0 ? 1.08 : 0.93);
  }, { passive:false });

  // ---------- presets ----------
  const toast = document.createElement('div');
  toast.setAttribute('aria-live', 'polite');
  Object.assign(toast.style, { position:'fixed', left:'50%', top:'18px', transform:'translate(-50%, -8px)', padding:'7px 16px',
    borderRadius:'999px', background:'#fffaf0', color:'#1f2a44', font:'600 15px/1.2 Fredoka, system-ui, sans-serif',
    boxShadow:'0 4px 0 #0000001f', opacity:'0', transition:'opacity .25s, transform .25s', pointerEvents:'none', zIndex:'40' });
  document.body.appendChild(toast);
  let toastTimer = 0;
  function say(text){
    toast.textContent = text; toast.style.opacity = '1'; toast.style.transform = 'translate(-50%, 0)';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%, -8px)'; }, 1300);
  }
  function setPreset(name, announce = true){
    if(!PRESETS[name]) return false;
    preset = name; user.yaw = 0; user.pitch = 0; held = false;
    if(announce) say('Camera: ' + PRESETS[name].label + '  (P to change)');
    return true;
  }
  function cycle(){
    if(state.mode === 'interior'){ iuser.yaw = iuser.pitch = 0; izoom = 1; say('Camera: room view'); return 'room'; }
    if(fp.on){ setFirstPerson(false); return preset; }     // P from first person goes back to the preset
    // A held view recentres first (P again then cycles). God view belongs to the drone: P only recentres it.
    if(held || preset === 'god'){ held = false; say('Camera: ' + PRESETS[preset].label + '  (P to change)'); return preset; }
    setPreset(ORDER[(ORDER.indexOf(preset) + 1) % ORDER.length]);
    return preset;
  }
  // P cycles presets, V toggles first person (never while typing or while a dialog box is open).
  const typing = () => { const a = document.activeElement; return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  bus.on('key', ({ code, down, repeat }) => {
    if(!down || repeat) return;
    if(code === 'KeyP' && !ctx.modules.games?.active?.()) cycle();
    else if(code === 'KeyV' && state.mode !== 'interior' && !typing() && !ctx.modules.dialog?.busy?.()) setFirstPerson(!fp.on);
  });
  bus.on('teleport', () => { snap = true; shot = null; user.yaw = user.pitch = 0; user.hold = false; held = false; fp.yaw = state.player.heading || 0; fp.pitch = 0; fp.snap = true; });
  // Stepping out of a room: the composed exit shot. If no candidate passes, fall back to facing
  // the door and holding that until the player moves off (then ease round behind as usual).
  bus.on('interior:exit', ({ door }) => {
    user.yaw = user.pitch = 0; user.hold = false; held = false; snap = true; shot = null;
    if(fp.on) return;                              // first person comes back facing out of the door instead
    try { shot = exitShot(door); } catch(e){ console.warn('[camera] exit shot failed', e); shot = null; }
    if(!shot){ user.yaw = Math.PI; user.hold = true; }
  });

  // ---------- interior: clamped orbit on top of the room's own camera ----------
  const iuser = { yaw:0, pitch:0, lastInput:-1e9 };
  let izoom = 1, islandZoom = state.zoom;
  const base = { pos:new THREE.Vector3(), quat:new THREE.Quaternion(), cam:null };
  const wrote = { pos:new THREE.Vector3(), quat:new THREE.Quaternion() };
  const ipivot = new THREE.Vector3(), ioff = new THREE.Vector3(), fwd = new THREE.Vector3();
  bus.on('interior:enter', () => { iuser.yaw = iuser.pitch = 0; izoom = 1; base.cam = null; islandZoom = state.zoom; });
  bus.on('interior:exit', () => { state.zoom = islandZoom; zoomS = state.zoom; });

  // First thing each frame, hand the room camera back its own pose, so a walker or room that
  // eases the camera from its current pose never eases from our offset one.
  ctx.onUpdate((dt, t, mode) => {
    if(mode !== 'interior' || !base.cam) return;
    const cam = state.interior?.camera || ctx.interiorCamera;
    if(cam === base.cam && cam.position.equals(wrote.pos) && cam.quaternion.equals(wrote.quat)){
      cam.position.copy(base.pos); cam.quaternion.copy(base.quat);
      wrote.pos.copy(base.pos); wrote.quat.copy(base.quat);
    }
  }, 1);

  ctx.onUpdate((dt, t, mode) => {
    if(mode !== 'interior') return;
    const room = state.interior; if(!room || room.cameraOrbit === false) return;
    const cam = room.camera || ctx.interiorCamera; if(!cam?.isPerspectiveCamera) return;
    // If someone else moved the camera since we last wrote it, that pose is the new base.
    if(base.cam !== cam || !cam.position.equals(wrote.pos) || !cam.quaternion.equals(wrote.quat)){
      base.cam = cam; base.pos.copy(cam.position); base.quat.copy(cam.quaternion);
    }
    if(!drag.active && now() - iuser.lastInput > 1.6){
      iuser.yaw = damp(iuser.yaw, 0, 1.3, dt); iuser.pitch = damp(iuser.pitch, 0, 1.3, dt);
      izoom = damp(izoom, 1, 0.8, dt);
    }
    if(Math.abs(iuser.yaw) < 1e-4 && Math.abs(iuser.pitch) < 1e-4 && Math.abs(izoom - 1) < 1e-4){
      cam.position.copy(base.pos); cam.quaternion.copy(base.quat);
    } else {
      // Pivot: where the base view direction meets the floor (y = 0.8).
      fwd.set(0, 0, -1).applyQuaternion(base.quat);
      const k = fwd.y < -0.05 ? (0.8 - base.pos.y)/fwd.y : 14;
      ipivot.copy(base.pos).addScaledVector(fwd, clamp(k, 2, 40));
      ioff.copy(base.pos).sub(ipivot);
      const r = ioff.length(), yaw0 = Math.atan2(ioff.x, ioff.z), pitch0 = Math.asin(clamp(ioff.y/r, -1, 1));
      const yaw = yaw0 + iuser.yaw, pitch = clamp(pitch0 + iuser.pitch, 0.2, 1.45), rr = r*izoom;
      cam.position.set(ipivot.x + Math.sin(yaw)*Math.cos(pitch)*rr, ipivot.y + Math.sin(pitch)*rr, ipivot.z + Math.cos(yaw)*Math.cos(pitch)*rr);
      cam.lookAt(ipivot);
    }
    wrote.pos.copy(cam.position); wrote.quat.copy(cam.quaternion);
  }, 88);

  const api = {
    update,
    setTarget(t){ target = t || null; },
    setMode(m){ return setPreset(m, false); },          // 'follow' | 'god' | 'overview' | 'cinematic'
    get mode(){ return preset; },
    // holdView(bool) turns hold-after-drag on or off (off also lets go of a held view); no argument reads it.
    holdView(on){ if(on === undefined) return holdOn; holdOn = !!on; if(!holdOn) held = false; return holdOn; },
    held: () => held,
    recentre(){ held = false; user.yaw = user.pitch = 0; },
    snap(){ snap = true; shot = null; },
    presets: ORDER.slice(),
    cycle,
    // firstPerson(bool) turns first person on or off (as V does); no argument reads it.
    firstPerson(on){ return on === undefined ? fp.on : setFirstPerson(on); },
  };
  try {
    ctx.expose('camera', {
      preset: name => name === undefined ? preset : setPreset(name),
      holdView: on => api.holdView(on), held: () => held,
      presets: () => ORDER.slice(),
      cycle,
      firstPerson: on => api.firstPerson(on),
      // First person look by degrees (+yaw turns left, +pitch looks up). Driving eases back after 1.5 s.
      look: (yawDeg = 0, pitchDeg = 0) => { fpLook(-yawDeg*Math.PI/180, -pitchDeg*Math.PI/180, 1); return { yaw:fp.yaw, pitch:fp.pitch, ly:fp.ly, lp:fp.lp }; },
      // Orbit by degrees, as a drag would. Held while holdView is on, else eases back after ~1.6 s.
      orbit: (yawDeg = 0, pitchDeg = 0) => { orbitBy(-yawDeg*Math.PI/180/0.0055, pitchDeg*Math.PI/180/0.004); if(state.mode !== 'interior') user.lastInput = now() + 3; else iuser.lastInput = now() + 3; },
      zoom: v => { if(v !== undefined){ if(state.mode === 'interior') izoom = clamp(v, 0.55, 1.35); else state.zoom = clamp(v, 0.6, 1.7); } return state.mode === 'interior' ? izoom : state.zoom; },
      info: () => ({ preset, mode:state.mode, yaw:rig.yaw + user.yaw, pitch:rig.pitch + user.pitch, lift:pitchLift, dist:camDist, want:rig.dist*zoomS,
        occluders:occluders.length, held, holdView:holdOn,
        fp:{ on:fp.on, active:fpActive(), yaw:+fp.yaw.toFixed(3), pitch:+fp.pitch.toFixed(3), look:[+fp.ly.toFixed(3), +fp.lp.toFixed(3)], fov:+camera.fov.toFixed(1), near:camera.near, hidden:fp.hidden, locked:locked(), blend:+blend.t.toFixed(2) }, shot: shot ? { yaw:+shot.yaw.toFixed(2), pitch:shot.pitch, dist:shot.dist, score:+shot.score.toFixed(2), ms:shot.ms } : null, user:{ ...user }, interior:{ ...iuser, zoom:izoom }, pos:camera.position.toArray().map(v => +v.toFixed(2)) }),
    });
  } catch(e){ console.warn('[camera] expose failed', e); }
  return api;
}
