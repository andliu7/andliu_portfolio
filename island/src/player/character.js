// The walker: a small round Andrew mascot in a blueberry-blue hoodie.
//  - drive mode: sits in the car's seat (car.js api.seat), leans with the steering
//  - F in drive: the door swings open and he hops out beside the car, onto the first clear spot
//  - walk mode: WASD relative to the camera, Shift runs, Space hops, F near the car hops back in,
//    near a building door (island.doorOf) an "F Enter <place>" pill floats over the doorway, and F
//    walks in behind a short cream fade (modes.enterInterior once the screen is covered)
//  - interior: walks inside room.scene against room.colliders and room.bounds, nudges room.camera,
//    and walking back out through room.exit (or F beside it) returns to the island
//  - water: he wades into the shallows and swims (breaststroke, shoulders at the waterline) in
//    lakes, rivers and the sea, and walks on the pier and bridge planks instead of through them
//  - F runs one priority rule (interact() below): dialog, pickup, pet, door, car.
//    C talks to whoever is within 3 m. H on foot whistles for the car (car.js drives it to his right side)
//  - walking into an open doorway enters it with no key press (see autoEnter)
// One mesh is reparented between the car seat, the island scene and the room scene, so there is
// never a second copy to keep in sync.
export function init(ctx){
  const { THREE, CANNON, scene, world, state, input, sound, bus, modes, helpers:H } = ctx;
  const { mesh, ball, cyl } = H;
  const keys = input.keys;
  const carApi = () => ctx.modules.car;

  const BLUE = '#4a5fd0', BLUE_D = '#35479f', SKIN = '#f6d4b4', HAIR = '#2b2330', INK = '#1b1b24';
  const R = 0.42;                         // walker collision radius
  const WALK = 6.4, RUN = 11.5, GRAV = 24;   // was 4.6 and 8.2 (round 5: about 40% faster)
  const DOOR_R = 3.2;                     // how close to island.doorOf(id) the Enter pill shows

  /* ---------- the mascot ---------- */
  const root = new THREE.Group();          // world placement and yaw
  const body = new THREE.Group(); root.add(body);   // squash, lean and bob
  const legs = [], arms = [];
  function limb(x, y, len, r, color, endColor, endR, parent){
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
    mesh(new THREE.CapsuleGeometry(r, len, 4, 10), color, 0, -len/2 - r*0.4, 0, pivot);
    const end = ball(endR, endColor, 0, -len - r*0.9, 0, pivot, 12);
    return { pivot, end };
  }
  for(const sx of [-1, 1]){
    const l = limb(sx*0.17, 0.4, 0.16, 0.1, '#2e3550', '#f7f3ea', 0.13, body);
    l.end.scale.set(1, 0.7, 1.35); l.end.position.z = 0.04; legs.push(l.pivot);
  }
  const torso = ball(R, BLUE, 0, 0.74, 0, body, 22); torso.scale.set(1, 0.98, 0.9);
  const pocket = mesh(new THREE.CapsuleGeometry(0.1, 0.26, 4, 8), BLUE_D, 0, 0.6, 0.34, body); pocket.rotation.z = Math.PI/2; pocket.scale.set(1, 1, 0.5);
  for(const sx of [-0.07, 0.07]){ cyl(0.018, 0.018, 0.2, '#fffaf0', sx, 0.9, 0.37, body, 6); ball(0.03, '#fffaf0', sx, 0.8, 0.375, body, 6); }
  // blueberry badge on the chest: a berry with a little crown
  ball(0.075, '#23306b', 0.2, 0.86, 0.33, body, 12);
  const crown = mesh(new THREE.ConeGeometry(0.035, 0.05, 5), '#1a2352', 0.2, 0.93, 0.33, body); crown.rotation.x = Math.PI;
  // hood bunched behind the neck
  const hood = mesh(new THREE.TorusGeometry(0.27, 0.1, 8, 18), BLUE_D, 0, 1.08, -0.06, body); hood.rotation.x = Math.PI/2 - 0.35;
  const head = new THREE.Group(); head.position.set(0, 1.38, 0); body.add(head);
  ball(0.42, SKIN, 0, 0, 0, head, 24);
  const hair = mesh(new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI*2, 0, Math.PI*0.5), HAIR, 0, 0.02, -0.03, head);
  hair.rotation.x = -0.38; hair.scale.set(1, 0.9, 1);
  const tuft = mesh(new THREE.ConeGeometry(0.08, 0.2, 6), HAIR, 0.06, 0.44, 0.08, head); tuft.rotation.set(0.5, 0, -0.4);
  // eyes (own group so they can blink), highlights, blush and a small smile
  const eyeG = new THREE.Group(); eyeG.position.set(0, 0, 0); head.add(eyeG);
  for(const s of [-1, 1]){
    ball(0.085, INK, s*0.15, 0.0, 0.36, eyeG, 14).scale.set(1, 1.15, 0.6);
    ball(0.03, '#ffffff', s*0.15 + 0.03, 0.04, 0.41, eyeG, 8);
    const b = mesh(new THREE.CircleGeometry(0.075, 14), '#ff9fb2', s*0.27, -0.1, 0.33, head, { transparent:true, opacity:.8 });
    b.rotation.y = s*0.6; b.castShadow = false;
  }
  const smile = mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI), INK, 0, -0.13, 0.4, head); smile.rotation.z = Math.PI; smile.castShadow = false;
  for(const sx of [-1, 1]){ const a = limb(sx*0.4, 0.92, 0.14, 0.085, BLUE, SKIN, 0.09, body); a.pivot.rotation.z = sx*0.18; arms.push(a.pivot); }
  // Only the big shapes cast shadows; eyes, strings and badges would add shadow draw calls for nothing.
  root.traverse(o => {
    if(!o.isMesh) return;
    o.receiveShadow = false;
    o.geometry.computeBoundingSphere();
    if(o.geometry.boundingSphere.radius < 0.13) o.castShadow = false;
  });

  /* ---------- state ---------- */
  const ch = { x:0, z:0, y:0, vy:0, yaw:Math.PI, vx:0, vz:0, speed:0, phase:0, grounded:true,
    squash:0, squashV:0, idle:0, blink:3, lastStep:0, lean:0 };
  let anim = null;           // { type:'out'|'in'|'door', t, dur, ... } while a scripted move plays
  let where = 'none';        // 'seat' | 'island' | 'room'
  let exitArmed = false, braked = false, notice = null, stopped = 0;
  let busy = false;          // true while the curtain is up for a door, so he holds still
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), headV = new THREE.Vector3();

  function attach(to){
    if(to === 'seat'){
      const seat = carApi()?.seat; if(!seat){ return attach('island'); }
      seat.add(root); root.position.set(0, -0.36, 0); root.rotation.set(0, 0, 0); where = 'seat';
      for(const l of legs) l.rotation.x = -1.35;
      body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
    } else if(to === 'room' && state.interior?.scene){
      state.interior.scene.add(root); where = 'room';
    } else { scene.add(root); where = 'island'; }
  }

  /* ---------- kinematic twin so a walker nudges crates ---------- */
  const twin = new CANNON.Body({ type: CANNON.Body.KINEMATIC, shape: new CANNON.Sphere(R) });
  twin.position.set(0, -100, 0); world.addBody(twin);

  /* ---------- collision ---------- */
  function resolve(list, rad){
    for(const c of list || []){
      if(c.kind === 'circle'){
        const dx = ch.x - c.x, dz = ch.z - c.z, d = Math.hypot(dx, dz), m = rad + c.r;
        if(d < m && d > 1e-5){ ch.x = c.x + dx/d*m; ch.z = c.z + dz/d*m; }
      } else if(c.kind === 'box'){
        const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0);
        const dx = ch.x - c.x, dz = ch.z - c.z;
        let lx = dx*co - dz*si, lz = dx*si + dz*co;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
        const ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if(d < rad){
          if(d < 1e-5){ const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if(px < pz) lx = Math.sign(lx||1)*(c.hw + rad); else lz = Math.sign(lz||1)*(c.hd + rad); }
          else { lx = cx + ex/d*rad; lz = cz + ez/d*rad; }
          ch.x = c.x + lx*co + lz*si; ch.z = c.z - lx*si + lz*co;
        }
      }
    }
  }
  function carBox(){
    const a = carApi(); if(!a?.car) return null;
    return { kind:'box', x:a.car.x, z:a.car.z, ang:a.car.heading, hw:a.halfWidth || 0.98, hd:a.halfLength || 1.62 };
  }
  // True when a walker of radius r fits at (x, z) on the island.
  function clearAt(x, z, r){
    if(Math.hypot(x, z) > ctx.island.radius - 3) return false;
    const list = ctx.colliders.slice(); const cb = carBox(); if(cb) list.push(cb);
    for(const c of list){
      if(c.kind === 'circle'){ if(Math.hypot(x - c.x, z - c.z) < r + c.r) return false; }
      else if(c.kind === 'box'){
        const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = x - c.x, dz = z - c.z;
        const lx = dx*co - dz*si, lz = dx*si + dz*co;
        const ex = Math.max(0, Math.abs(lx) - c.hw), ez = Math.max(0, Math.abs(lz) - c.hd);
        if(Math.hypot(ex, ez) < r) return false;
      }
    }
    return true;
  }

  /* ---------- water and decks ---------- */
  // Heights come from map.js's layout (ctx.modules.map.layout): the seabed uses the same formula
  // map.js shapes the ground mesh with, and decks are the dock's pier plus every road bridge.
  const WATER_Y = -0.28;
  const SWIM_SINK = 0.98;                 // swimming, his root sits this far under the surface: shoulders at the waterline
  const SWIM = 2.4, SWIM_FAST = 3.4;
  const swim = { on:false, depth:0, deck:null, pulse:0, leap:0, ring:0, wadeT:0 };
  const lay = () => ctx.modules.map?.layout || null;
  function groundY(x, z){
    const own = ctx.modules.map?.groundAt?.(x, z); if(typeof own === 'number') return own;
    const L = lay(); if(!L?.sdAt) return 0;
    const sd = L.sdAt(x, z);
    return sd < 0 ? Math.min(0, WATER_Y - 0.2*sd) : Math.max(-2.1, WATER_Y - 0.3*sd);
  }
  let decks = null;
  function deckList(){
    if(decks) return decks;
    decks = [];
    const L = lay(), dock = ctx.zones.find(z => z.id === 'dock');
    // the pier, in the dock zone's frame (map.js buildPier: a 3 x 12 m box centred at (-5, -11.4), top at 0.23)
    if(dock && H.frameOf){ const f = H.frameOf(dock), c = Math.cos(f.ang), s = Math.sin(f.ang);
      decks.push({ kind:'pier', climb:true, y:0.23, test:(x, z) => { const dx = x - dock.x, dz = z - dock.z, lx = dx*c - dz*s, lz = dx*s + dz*c; return lx > -6.5 && lx < -3.5 && lz > -17.4 && lz < -5.4; } }); }
    // road bridges: planks 8.6 m wide along the road samples a..b, top at 0.25
    for(const b of L?.bridges || []){
      const pts = L.roads[b.road]?.pts; if(!pts) continue;
      const seg = pts.slice(b.a, b.b + 1); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for(const p of seg){ x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
      decks.push({ kind:'bridge', climb:false, y:0.25, test:(x, z) => {
        if(x < x0 - 4.5 || x > x1 + 4.5 || z < z0 - 4.5 || z > z1 + 4.5) return false;
        let bd = 1e9, bp = null; for(const p of seg){ const d = (p.x - x)*(p.x - x) + (p.z - z)*(p.z - z); if(d < bd){ bd = d; bp = p; } }
        if(bd > 25) return false;
        const along = (x - bp.x)*bp.tx + (z - bp.z)*bp.tz, lat = Math.abs((x - bp.x)*bp.tz - (z - bp.z)*bp.tx);
        return lat < 4.3 && (bp !== seg[0] || along > -0.4) && (bp !== seg[seg.length - 1] || along < 0.4);
      } });
    }
    return decks;
  }
  // The deck under (x, z), or null. map.js may own this later as map.deckAt(x, z) -> { y, kind }.
  function deckAt(x, z){
    const own = ctx.modules.map?.deckAt; if(typeof own === 'function') return own(x, z) || null;
    for(const d of deckList()) if(d.test(x, z)) return d;
    return null;
  }
  // The walker ignores the invisible shoreline chain (map.js buildShore: r 1.2 circles over water)
  // so he can wade in; everything else (bridge posts, trees, houses) still blocks him.
  let colN = -1, colList = [];
  function walkColliders(){
    const all = ctx.colliders;
    if(all.length !== colN){
      const L = lay(); colN = all.length;
      colList = all.filter(c => !(c.shore || (L && c.kind === 'circle' && c.r === 1.2 && !L.landAt(c.x, c.z))));
    }
    return colList;
  }
  // The floor under him on the island: a deck (pier, bridge), the seabed while wading, or the swim
  // line once the water is deeper than his shoulders. Sets swim.deck and swim.depth as it goes.
  // A bridge only counts from above (he swims under it); the pier can be climbed from the water.
  function floorAt(x, z){
    const d = deckAt(x, z);
    if(d && (d.climb || ch.y > d.y - 0.6)){ swim.deck = d; swim.depth = 0; return d.y; }
    swim.deck = null;
    const g = groundY(x, z); swim.depth = Math.max(0, WATER_Y - g);
    return swim.depth > SWIM_SINK ? WATER_Y - SWIM_SINK : g;
  }

  /* ---------- ripples and splashes ---------- */
  // Rings: a small pool, each with its own material so it can fade on its own; hidden when idle.
  const ringGeo = new THREE.RingGeometry(0.78, 1, 28).rotateX(-Math.PI/2);
  const rings = [];
  for(let i = 0; i < 5; i++){
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:'#f4fbff', transparent:true, opacity:0, depthWrite:false }));
    m.visible = false; m.renderOrder = 2; scene.add(m); rings.push({ m, t:1, life:1, s0:0.5, s1:2 });
  }
  let ringNext = 0;
  function ripple(x, z, s0 = 0.5, s1 = 2.2, life = 1.1){
    const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length;
    r.t = 0; r.life = life; r.s0 = s0; r.s1 = s1; r.m.position.set(x, WATER_Y + 0.03, z); r.m.visible = true;
  }
  // Droplets: one InstancedMesh, so a big splash is still a single draw call.
  const DROPS = 36;
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color:'#e8f7ff', roughness:0.3 }), DROPS);
  drops.castShadow = false; drops.frustumCulled = false; drops.visible = false; scene.add(drops);
  const dropS = Array.from({ length:DROPS }, () => ({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1 }));
  const o3 = new THREE.Object3D();
  let dropNext = 0, dropsAlive = 0;
  function splash(x, z, n, power = 1){
    if(state.reduced) n = Math.min(n, 3);
    for(let i = 0; i < n; i++){
      const d = dropS[dropNext]; dropNext = (dropNext + 1) % DROPS;
      const a = Math.random()*Math.PI*2, sp = (0.6 + Math.random()*1.4)*power;
      d.life = 0.5 + Math.random()*0.4; d.x = x + Math.cos(a)*0.3; d.z = z + Math.sin(a)*0.3; d.y = WATER_Y + 0.05;
      d.vx = Math.cos(a)*sp; d.vz = Math.sin(a)*sp; d.vy = (2.2 + Math.random()*2.6)*power; d.s = 0.6 + Math.random()*0.9;
    }
    drops.visible = true;
  }
  function stepWaterFx(dt){
    for(const r of rings){
      if(!r.m.visible) continue;
      r.t += dt/r.life; if(r.t >= 1){ r.m.visible = false; continue; }
      const k = r.s0 + (r.s1 - r.s0)*(1 - Math.pow(1 - r.t, 2)); r.m.scale.set(k, 1, k); r.m.material.opacity = 0.75*(1 - r.t);
    }
    if(!drops.visible) return;
    dropsAlive = 0;
    for(let i = 0; i < DROPS; i++){
      const d = dropS[i];
      if(d.life > 0){
        d.life -= dt; d.vy -= 16*dt; d.x += d.vx*dt; d.y += d.vy*dt; d.z += d.vz*dt;
        if(d.y < WATER_Y){ d.life = 0; }
      }
      const alive = d.life > 0; if(alive) dropsAlive++;
      o3.position.set(d.x, d.y, d.z); o3.scale.setScalar(alive ? d.s : 0); o3.updateMatrix(); drops.setMatrixAt(i, o3.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
    if(!dropsAlive) drops.visible = false;
  }
  function splashSound(big){
    sound.tone(520 + Math.random()*120, big ? 0.22 : 0.1, 'sine', big ? 0.07 : 0.035, 140);
    if(big) setTimeout(() => sound.tone(880 + Math.random()*200, 0.09, 'triangle', 0.03, 300), 60);
  }
  // Per island frame after locomotion: swimming starts when he is standing on the swim line.
  function stepSwim(dt, moving, stepped){
    const was = swim.on;
    swim.on = ch.grounded && !swim.deck && swim.depth > SWIM_SINK;
    if(swim.on && !was){ splash(ch.x, ch.z, 8, 0.7); ripple(ch.x, ch.z, 0.5, 2.4, 1.1); splashSound(false); }
    if(swim.on){
      if((swim.ring -= dt) <= 0){ swim.ring = moving ? 0.45 : 1.3; ripple(ch.x, ch.z, 0.5, moving ? 1.9 : 1.4, 1.1); }
    } else if(stepped && ch.grounded && !swim.deck && swim.depth > 0.08){
      // wading: every footstep rings and flicks a few drops
      ripple(ch.x, ch.z, 0.35, 1.4, 0.8); splash(ch.x, ch.z, 3, 0.45); splashSound(false);
    }
  }

  /* ---------- doors ---------- */
  let doors = null;
  function doorList(){
    if(doors) return doors;
    doors = [];
    for(const z of ctx.zones){ try { const d = ctx.island.doorOf(z.id); if(d) doors.push({ id:z.id, name:z.name || z.title, x:d.x, z:d.z, heading:d.heading }); } catch(e){ /* a zone without a door is skipped */ } }
    return doors;
  }
  // The door he just came out of stays quiet (no Enter pill, F ignores it) until he walks clear of
  // it once, so stepping outside is not greeted by a prompt to go straight back in.
  let leftDoor = null;
  function nearestDoor(maxD){
    let best = null, bd = maxD;
    if(leftDoor && Math.hypot(ch.x - leftDoor.x, ch.z - leftDoor.z) > DOOR_R + 0.4) leftDoor = null;
    for(const d of doorList()){ if(leftDoor && d.id === leftDoor.id) continue; const dd = Math.hypot(ch.x - d.x, ch.z - d.z); if(dd < bd){ bd = dd; best = d; } }
    return best;
  }
  function carDist(){ const a = carApi(); return a?.car ? Math.hypot(ch.x - a.car.x, ch.z - a.car.z) : 1e9; }

  /* ---------- walk-through doors ---------- */
  // On foot, walking into a doorway enters it with no key press. Only this walker's own frame runs
  // it, so robots, pets and NPCs never trigger a door; vehicles never auto-enter (F still works).
  // It fires within AUTO_R of island.doorOf(id) while he walks inward: the door heading faces out of
  // the building, so the inward normal is (-sin h, -cos h), and his velocity along it must be
  // positive and at least AUTO_COS of his speed (within about 70 degrees of straight in), so brushing
  // past sideways or walking away never pulls him in. A zone whose map.js swing door exists waits for
  // it to be at least half open; a zone with no swing door uses the door point alone.
  // The door he last came out of (or just tried) is skipped for AUTO_WAIT s, or until he is AUTO_CLEAR m away.
  const AUTO_R = 1.2, AUTO_WAIT = 2.5, AUTO_CLEAR = 3, AUTO_COS = 0.34, AUTO_MIN = 0.5;
  let autoSkip = null;          // { id, x, z, until } in performance.now() seconds
  const nowS = () => performance.now()/1000;
  function swingOpen(id){
    // map.js keeps its swing doors private; its critic hook lists them as { zone, open }.
    const list = window.__island?.map?.doors?.(); if(!Array.isArray(list)) return true;
    const s = list.find(q => q.zone === id);
    return !s || s.open >= 0.5;
  }
  function autoEnter(){
    if(!state.started || anim || busy || swim.on) return false;
    if(ctx.modules.drone?.active?.() || ctx.modules.dialog?.busy?.()) return false;
    const g = ctx.modules.games?.active?.(); if(g && g !== 'tour') return false;   // the tour still gets its rooms
    if(autoSkip && (nowS() > autoSkip.until || Math.hypot(ch.x - autoSkip.x, ch.z - autoSkip.z) > AUTO_CLEAR)) autoSkip = null;
    const sp = Math.hypot(ch.vx, ch.vz); if(sp < AUTO_MIN) return false;
    for(const d of doorList()){
      if(autoSkip && autoSkip.id === d.id) continue;
      if(Math.hypot(ch.x - d.x, ch.z - d.z) > AUTO_R) continue;
      const inward = -(ch.vx*Math.sin(d.heading) + ch.vz*Math.cos(d.heading));   // velocity dotted with the inward normal
      if(inward < Math.max(AUTO_MIN, sp*AUTO_COS) || !swingOpen(d.id)) continue;
      // A locked door stays skipped until he walks clear (until = Infinity), so it never loops.
      autoSkip = { id:d.id, x:d.x, z:d.z, until:Infinity };
      return enterDoor(d);
    }
    return false;
  }

  /* ---------- prompt: a small ink label with a diamond key cap, floating over the player ---------- */
  const style = document.createElement('style');
  style.textContent = `
#char-prompt{position:fixed;left:0;top:0;z-index:6;pointer-events:none;display:flex;align-items:center;gap:8px;
  padding:6px 12px 6px 6px;border-radius:999px;background:#1f2a44;color:#fffaf0;font:600 13px/1 Fredoka,system-ui,sans-serif;
  letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 0 #00000026;
  opacity:0;transform:translate(-50%,-100%) scale(.6);transition:opacity .16s ease,transform .22s cubic-bezier(.3,1.6,.5,1)}
#char-prompt.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
#char-prompt .k{width:22px;height:22px;display:grid;place-items:center;position:relative;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
#char-prompt .k::before{content:"";position:absolute;inset:2px;background:#fffaf0;border-radius:4px;transform:rotate(45deg)}
#char-prompt .k b{position:relative}
#char-prompt.info .k{display:none}
#char-prompt.info{padding:7px 12px;background:#e5484d}
#char-prompt.info.calm{background:#1f2a44}
@media (prefers-reduced-motion:reduce){#char-prompt{transition:none}}`;
  document.head.appendChild(style);
  const promptEl = document.createElement('div'); promptEl.id = 'char-prompt'; promptEl.setAttribute('aria-live', 'polite');
  promptEl.innerHTML = '<span class="k"><b>F</b></span><span class="t"></span>';
  document.body.appendChild(promptEl);
  const promptTxt = promptEl.querySelector('.t');
  let promptShown = '';
  function showPrompt(text, wx, wy, wz, cam, info = false){
    if(!text || !cam){ if(promptShown){ promptEl.classList.remove('on'); promptShown = ''; } return; }
    if(promptShown !== text){ promptTxt.textContent = text; promptEl.classList.toggle('info', !!info); promptEl.classList.toggle('calm', info === 'calm'); promptShown = text; }
    v3.set(wx, wy, wz).project(cam);
    if(v3.z > 1){ promptEl.classList.remove('on'); return; }
    promptEl.style.left = ((v3.x*0.5 + 0.5)*innerWidth).toFixed(1) + 'px';
    promptEl.style.top = ((-v3.y*0.5 + 0.5)*innerHeight).toFixed(1) + 'px';
    promptEl.classList.add('on');
  }

  /* ---------- fade: a cream curtain between the island and a room ---------- */
  // fadeTo(1, fn) raises it and calls fn once it covers the screen; fadeTo(0) lowers it.
  // Opacity is stepped per frame (not a CSS transition) so the swap happens exactly when covered.
  const fadeEl = document.createElement('div'); fadeEl.id = 'char-fade';
  fadeEl.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:#fffaf0;opacity:0';
  document.body.appendChild(fadeEl);
  const fade = { a:0, to:0, then:null };
  function fadeTo(to, then = null){ fade.to = to; fade.then = then; }
  function stepFade(dt){
    const rate = state.reduced ? 20 : 3.2;          // about 0.3 s each way
    if(fade.a !== fade.to){
      fade.a = fade.to > fade.a ? Math.min(fade.to, fade.a + dt*rate) : Math.max(fade.to, fade.a - dt*rate);
      fadeEl.style.opacity = fade.a.toFixed(3);
    }
    if(fade.a === fade.to && fade.then){ const fn = fade.then; fade.then = null; fn(); }
  }

  /* ---------- sounds ---------- */
  let stepFoot = 0;
  function footstep(run){ stepFoot ^= 1; sound.tone((stepFoot ? 190 : 160) + Math.random()*25, 0.06, 'triangle', run ? 0.07 : 0.045, 90); }
  function hopSound(){ sound.tone(330, 0.16, 'sine', 0.08, 620); }
  function landSound(){ sound.tone(140, 0.1, 'triangle', 0.07, 80); }
  function doorSound(){ sound.tone(520, 0.08, 'square', 0.03); setTimeout(() => sound.tone(700, 0.1, 'square', 0.03), 90); }

  /* ---------- actions ---------- */
  function spotBesideCar(){
    const a = carApi(); if(!a?.car) return null;
    const c = a.car, s = Math.sin(c.heading), co = Math.cos(c.heading);
    // car-local (lx, lz): +x is the car's left (the door side), +z its nose
    for(const [lx, lz] of [[2.1, 0], [2.1, -0.9], [-2.1, 0], [0, -3.0], [0, 3.0], [2.2, 1.6], [-2.2, -1.6], [2.8, -2.4], [-2.8, 2.4], [3.2, 0], [-3.2, 0]]){
      const x = c.x + lx*co + lz*s, z = c.z - lx*s + lz*co;
      if(clearAt(x, z, R + 0.12)) return { x, z };
    }
    return null;
  }
  function flash(text, calm = false){ notice = { text, t:1.4, calm }; }   // calm: ink pill, not the red warning

  function exitCar(){
    if(state.mode !== 'drive' || anim) return false;
    const spot = spotBesideCar();
    if(!spot){ flash('No room to hop out here'); return false; }
    modes.setMode('walk');           // the 'mode' listener starts the hop
    return true;
  }
  function startHopOut(spot){
    const a = carApi();
    a?.car?.group.updateMatrixWorld(true);
    const from = a?.seat ? a.seat.getWorldPosition(v3b).clone() : new THREE.Vector3(ch.x, 1, ch.z);
    attach('island');
    for(const l of legs) l.rotation.x = 0;
    a?.openDoor?.(); hopSound();
    ch.x = from.x; ch.z = from.z; ch.y = from.y - 0.36; ch.vx = ch.vz = ch.speed = 0;
    const yaw0 = a?.car ? a.car.heading : ch.yaw;
    body.rotation.set(0, 0, 0); head.rotation.x = 0;
    anim = { type:'out', t:0, dur:0.62, fx:from.x, fz:from.z, fy:ch.y, tx:spot.x, tz:spot.z, ty:floorAt(spot.x, spot.z), yaw0, yaw1:Math.atan2(spot.x - from.x, spot.z - from.z) };
  }
  function enterCar(){
    if(state.mode !== 'walk' || anim || carDist() > 3.4) return false;
    const a = carApi(); if(!a?.seat) return false;
    a.stopCall?.();                  // a called car stops where it is, so the seat he hops at stays put
    a.car.group.updateMatrixWorld(true);
    const to = a.seat.getWorldPosition(v3b).clone();
    a.openDoor?.(); hopSound();
    anim = { type:'in', t:0, dur:0.55, fx:ch.x, fz:ch.z, fy:ch.y, tx:to.x, tz:to.z, ty:to.y - 0.36, yaw0:ch.yaw, yaw1:a.car.heading };
    return true;
  }
  function enterDoor(d){
    if(anim) return false;
    if(anim || busy) return false;
    doorSound(); busy = true; fadeTo(1);
    // he steps toward the doorway (the door point sits just outside it, facing away) as the curtain rises
    const ix = d.x - Math.sin(d.heading)*1.2, iz = d.z - Math.cos(d.heading)*1.2;
    anim = { type:'door', t:0, dur:0.42, fx:ch.x, fz:ch.z, tx:ix, tz:iz, yaw0:ch.yaw, yaw1:d.heading + Math.PI, id:d.id };
    return true;
  }
  function leaveRoom(){
    if(state.mode !== 'interior' || busy) return;
    doorSound(); busy = true;
    fadeTo(1, () => { busy = false; modes.exitInterior(); fadeTo(0); });
  }

  /* ---------- F: the one priority rule for interact ---------- */
  // dialog open > pickup within 1.6 m > pet > door > car (CONTRACT, round 5; talking moved to C on
  // 2026-09-30). inventory.js and pets.js have no F listeners of their own; this calls them, so one
  // F press does exactly one thing.
  const PICK_R = 1.6, TALK_R = 3;
  function pickNear(){ const n = ctx.modules.inventory?.nearest?.(); return n && !(n.dist > PICK_R) ? n : null; }
  function talkNear(){ const v = ctx.modules.voices?.nearest?.(); return v && !(v.dist > TALK_R) ? v : null; }
  function interact(){
    if(!state.started) return 'none';
    if(ctx.modules.drone?.active?.()) return 'drone';          // piloting: drone.js lands on F
    if(ctx.modules.dialog?.busy?.()) return 'dialog';    // the dialog handles its own keys
    if(state.mode === 'drive'){ exitCar(); return 'vehicle'; }
    if(state.mode === 'interior'){
      const room = state.interior, P = room?.player;
      if(room?.exit && P && Math.hypot(P.x - room.exit.x, P.z - room.exit.z) < (room.exit.r || 1.5) + 1.4){ leaveRoom(); return 'door'; }
      return 'none';
    }
    if(state.mode !== 'walk' || anim || busy) return 'none';
    if(pickNear()){ ctx.modules.inventory?.pickupNearest?.(); return 'pickup'; }
    if(ctx.modules.pets?.nearest?.()){ ctx.modules.pets.interactNearest?.(); return 'pet'; }
    if(ctx.modules.drone?.nearest?.()){ ctx.modules.drone.interactNearest?.(); return 'drone'; }
    if(ctx.modules.garage?.nearest?.()){ ctx.modules.garage.chooseNearest(); return 'garage'; }
    // door against car: whichever is closer, the same rule the prompt uses (the parked car often
    // sits right in a door approach, and a strict door-first rule would lock you out of it)
    const d = nearestDoor(DOOR_R), cd = carDist();
    if(d && (cd > 3.4 || Math.hypot(ch.x - d.x, ch.z - d.z) < cd)){ enterDoor(d); return 'door'; }
    if(cd <= 3.4){ enterCar(); return 'vehicle'; }
    return 'none';
  }
  input.on('interact', interact);

  // C talks to the nearest character within 3 m (voices.js); with nobody there it says so.
  function talk(){
    if(!state.started || state.mode !== 'walk' || anim || busy) return 'none';
    if(ctx.modules.drone?.active?.() || ctx.modules.dialog?.busy?.()) return 'none';
    if(talkNear() && ctx.modules.voices?.talkNearest?.()) return 'talk';
    flash('Nobody to talk to', true);
    return 'none';
  }
  input.on('talk', talk);
  // H on foot whistles for the car; car.js starts the call from the same 'honk' action while walking.
  function whistle(){ sound.tone(1250, 0.13, 'sine', 0.07, 1900); setTimeout(() => sound.tone(1350, 0.22, 'sine', 0.07, 2300), 170); }
  input.on('honk', () => { if(state.started && state.mode === 'walk' && !ctx.modules.drone?.active?.()) whistle(); });
  bus.on('car:call', ({ ok }) => { if(ok) flash('Calling your car', true); else flash('No room for the car here'); });

  /* ---------- per-frame ---------- */
  const f2 = new THREE.Vector3();
  // First person on foot (camera.js, V): A / D turn him and the view instead of strafing.
  const firstPerson = () => state.mode === 'walk' && !!ctx.modules.camera?.firstPerson?.();
  function moveIntent(cam){
    const up = (keys.up ? 1 : 0) - (keys.down ? 1 : 0), rt = firstPerson() ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if(!up && !rt) return null;
    let fx = 0, fz = -1;
    if(cam){ cam.getWorldDirection(f2); const l = Math.hypot(f2.x, f2.z); if(l > 1e-3){ fx = f2.x/l; fz = f2.z/l; } }
    let mx = fx*up - fz*rt, mz = fz*up + fx*rt; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    return { mx, mz };
  }

  // Run-start dust: a tiny pool of puffs kicked back from his heels, never allocated per frame.
  const dustGeo = new THREE.SphereGeometry(0.12, 7, 5), dustMat = new THREE.MeshStandardMaterial({ color:'#efe4cc', roughness:1 });
  const dust = [];
  for(let i = 0; i < 6; i++){ const m = new THREE.Mesh(dustGeo, dustMat); m.visible = false; m.castShadow = false; scene.add(m); dust.push({ m, life:0, vx:0, vy:0, vz:0 }); }
  let dustNext = 0, wasRun = false;
  function kickDust(){
    if(state.reduced) return;
    const bx = -Math.sin(ch.yaw), bz = -Math.cos(ch.yaw);
    for(let i = 0; i < 3; i++){
      const d = dust[dustNext], sx = (i - 1)*0.22; dustNext = (dustNext + 1) % dust.length;
      d.life = 1; d.vx = bx*1.8 + (Math.random() - 0.5)*0.8; d.vz = bz*1.8 + (Math.random() - 0.5)*0.8; d.vy = 0.5 + Math.random()*0.5;
      d.m.position.set(ch.x + bx*0.3 + bz*sx, ch.y + 0.12, ch.z + bz*0.3 - bx*sx); d.m.visible = true;
    }
  }
  function stepDust(dt){
    for(const d of dust){
      if(d.life <= 0) continue;
      d.life -= dt*2.4; if(d.life <= 0){ d.m.visible = false; continue; }
      d.m.position.x += d.vx*dt; d.m.position.y += d.vy*dt; d.m.position.z += d.vz*dt; d.vx *= 0.92; d.vz *= 0.92;
      d.m.scale.setScalar(Math.sin(d.life*Math.PI)*1.1 + 0.2);
    }
  }

  // Locomotion shared by island and room. Returns true when a foot landed this frame.
  // island: follow the floor (decks, seabed, the swim line) instead of flat y = 0.
  function locomote(dt, cam, colliders, bounds, island = false){
    const it = state.started ? moveIntent(cam) : null;
    const wading = island && !swim.on && !swim.deck && swim.depth > 0.25;
    const top = swim.on ? (keys.boost ? SWIM_FAST : SWIM) : (keys.boost ? RUN : WALK)*(wading ? 0.65 : 1);
    const tx = it ? it.mx*top : 0, tz = it ? it.mz*top : 0;
    const k = Math.min(1, dt*(it ? 15 : 14));           // rate 15: about 95% of top speed in 0.2 s
    ch.vx += (tx - ch.vx)*k; ch.vz += (tz - ch.vz)*k;
    ch.x += ch.vx*dt; ch.z += ch.vz*dt;
    resolve(colliders, R);
    if(bounds){ ch.x = Math.max(bounds.minX + R, Math.min(bounds.maxX - R, ch.x)); ch.z = Math.max(bounds.minZ + R, Math.min(bounds.maxZ - R, ch.z)); }
    ch.speed = Math.hypot(ch.vx, ch.vz);
    if(firstPerson()){ if(state.started) ch.yaw += ((keys.left ? 1 : 0) - (keys.right ? 1 : 0))*2.4*dt; }   // no turn toward the move, so S backs up
    else if(it) ch.yaw = H.lerpAngle(ch.yaw, Math.atan2(it.mx, it.mz), Math.min(1, dt*14));
    // hop on Space (an edge, so holding it does not bunny-hop forever); no hopping while swimming
    if(keys.brake && !braked && ch.grounded && state.started && !swim.on){ ch.vy = 7.2; ch.grounded = false; ch.squashV -= 5; hopSound(); }
    braked = keys.brake;
    const floor = island ? floorAt(ch.x, ch.z) : 0;
    if(ch.grounded){
      if(floor < ch.y - 0.3){ ch.grounded = false; ch.vy = 0; }                    // stepped off the pier: fall
      else if(floor > ch.y + 0.45){ ch.vy = Math.sqrt(2*GRAV*(floor - ch.y + 0.3)); ch.grounded = false; ch.squashV -= 4; hopSound(); }   // climb out onto the pier
      else ch.y += (floor - ch.y)*Math.min(1, dt*18);
    }
    if(!ch.grounded){
      ch.vy -= GRAV*dt; ch.y += ch.vy*dt;
      if(ch.vy <= 0 && ch.y <= floor){
        const hard = -ch.vy; ch.y = floor; ch.grounded = true; ch.vy = 0;
        if(island && !swim.deck && swim.depth > SWIM_SINK){ splash(ch.x, ch.z, 18, 1.1); ripple(ch.x, ch.z, 0.6, 3, 1.3); splashSound(true); swim.on = true; }   // a jump into deep water
        else { ch.squashV += Math.min(9, hard*0.9); landSound(); }
      }
    }
    // a little dust as he breaks into a run on dry ground
    const running = ch.speed > WALK + 0.8;
    if(island && running && !wasRun && ch.grounded && !swim.on && !wading) kickDust();
    wasRun = running;
    const stepped = swim.on ? animateSwim(dt) : animateWalk(dt);
    if(island) stepSwim(dt, !!it, stepped);
    return stepped;
  }

  // Breaststroke: tipped forward, arms reach and sweep out, legs frog-kick, head up out of the water.
  function animateSwim(dt){
    const reduced = state.reduced, amt = Math.min(1, ch.speed/SWIM);
    const prev = Math.cos(ch.phase);
    ch.phase += dt*(2.2 + ch.speed*1.6);
    const s = Math.sin(ch.phase), c = Math.cos(ch.phase);
    const sweep = reduced ? 0.4 : 0.3 + 0.6*Math.max(0, s)*(0.4 + 0.6*amt);
    arms[0].rotation.x = arms[1].rotation.x = -1.35 + (reduced ? 0 : 0.25*c);
    arms[0].rotation.z = -sweep; arms[1].rotation.z = sweep;
    legs[0].rotation.x = legs[1].rotation.x = 0.7 + (reduced ? 0 : 0.35*s*(0.3 + 0.7*amt));
    body.rotation.x += ((reduced ? 0.2 : 0.35) - body.rotation.x)*Math.min(1, dt*6); body.rotation.z *= 0.8;
    head.rotation.x = -0.3; head.rotation.y *= 0.9; head.rotation.z = 0;
    body.scale.set(1, 1, 1); body.position.y = reduced ? 0 : Math.sin(performance.now()*0.004)*0.035;
    ch.blink -= dt; if(ch.blink < 0) ch.blink = 2.4 + Math.random()*2.8; eyeG.scale.y = ch.blink < 0.12 ? 0.12 : 1;
    // a few drops at the end of each pull while he is going somewhere
    if(amt > 0.3 && prev > 0 && c <= 0){ splash(ch.x + Math.sin(ch.yaw)*0.4, ch.z + Math.cos(ch.yaw)*0.4, 3, 0.5); sound.tone(430 + Math.random()*80, 0.08, 'sine', 0.02, 180); }
    root.position.set(ch.x, ch.y, ch.z); root.rotation.y = ch.yaw;
    return false;
  }

  function animateWalk(dt){
    const reduced = state.reduced;
    const amt = Math.min(1, ch.speed/WALK), run = ch.speed > WALK + 0.8;
    const prev = Math.sin(ch.phase);
    ch.phase += dt*(3 + ch.speed*2.6)*(amt > 0.05 ? 1 : 0);   // cadence tracks speed, about 1 m a step, so feet do not skate
    const s = Math.sin(ch.phase);
    let stepped = false;
    if(amt > 0.25 && ch.grounded && Math.sign(s) !== Math.sign(prev)){ stepped = true; footstep(run); ch.squashV += run ? 1.6 : 1.0; }
    if(amt < 0.05) ch.phase *= Math.exp(-dt*10);
    const swing = reduced ? 0 : amt*(run ? 0.95 : 0.7);
    legs[0].rotation.x = s*swing; legs[1].rotation.x = -s*swing;
    arms[0].rotation.x = -s*swing*1.1; arms[1].rotation.x = s*swing*1.1;
    // squash spring
    ch.squashV += (-120*ch.squash - 11*ch.squashV)*dt; ch.squash += ch.squashV*dt;
    // idle: breathing, blinking, a slow look around
    ch.idle = amt < 0.05 && ch.grounded ? ch.idle + dt : 0;
    ch.blink -= dt; if(ch.blink < 0) ch.blink = 2.4 + Math.random()*2.8;
    eyeG.scale.y = ch.blink < 0.12 ? 0.12 : 1;
    const breath = reduced ? 0 : Math.sin(performance.now()*0.003)*0.018*(1 - amt);
    head.rotation.y = ch.idle > 2.5 && !reduced ? Math.sin((ch.idle - 2.5)*0.9)*0.45 : head.rotation.y*0.85;
    head.rotation.z = reduced ? 0 : -s*0.06*amt; head.rotation.x *= 0.8;
    const bob = reduced ? 0 : Math.abs(s)*0.09*amt;
    ch.lean += ((reduced ? 0 : amt*(run ? 0.22 : 0.12)) - ch.lean)*Math.min(1, dt*8);
    const sq = reduced ? 0 : Math.max(-0.25, Math.min(0.25, ch.squash*0.05)) + breath;
    const air = ch.grounded ? 0 : Math.max(-0.12, Math.min(0.12, ch.vy*0.02));
    body.scale.set(1 + sq - air*0.5, 1 - sq + air, 1 + sq - air*0.5);
    body.position.y = bob;
    body.rotation.x = ch.lean; body.rotation.z *= 0.8;
    if(!ch.grounded){ legs[0].rotation.x = -0.5; legs[1].rotation.x = 0.35; arms[0].rotation.z = 0.9; arms[1].rotation.z = -0.9; }
    else { arms[0].rotation.z += (-0.18 - arms[0].rotation.z)*Math.min(1, dt*12); arms[1].rotation.z += (0.18 - arms[1].rotation.z)*Math.min(1, dt*12); }
    root.position.set(ch.x, ch.y, ch.z); root.rotation.y = ch.yaw;
    return stepped;
  }

  const ease = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  function stepAnim(dt){
    anim.t += dt/anim.dur;
    const t = Math.min(1, anim.t), e = ease(t);
    ch.yaw = H.lerpAngle(anim.yaw0, anim.yaw1, Math.min(1, t*1.6));
    if(anim.type === 'step'){
      ch.x = anim.fx + (anim.tx - anim.fx)*e; ch.z = anim.fz + (anim.tz - anim.fz)*e;
      ch.y = Math.sin(t*Math.PI)*0.35;
      legs[0].rotation.x = Math.sin(t*16)*0.6; legs[1].rotation.x = -legs[0].rotation.x;
      arms[0].rotation.x = -legs[0].rotation.x; arms[1].rotation.x = legs[0].rotation.x;
      root.position.set(ch.x, ch.y, ch.z); root.rotation.y = ch.yaw;
    } else if(anim.type === 'door'){
      ch.x = anim.fx + (anim.tx - anim.fx)*e; ch.z = anim.fz + (anim.tz - anim.fz)*e;
      const k = 1 - e*0.35; body.scale.set(k, k, k);
      legs[0].rotation.x = Math.sin(t*18)*0.6; legs[1].rotation.x = -legs[0].rotation.x;
      root.position.set(ch.x, 0, ch.z); root.rotation.y = ch.yaw;
    } else {
      const ty = anim.ty ?? 0;
      ch.x = anim.fx + (anim.tx - anim.fx)*e; ch.z = anim.fz + (anim.tz - anim.fz)*e;
      ch.y = anim.fy + (ty - anim.fy)*t + Math.sin(t*Math.PI)*1.1;
      const tuck = Math.sin(t*Math.PI);
      legs[0].rotation.x = -0.9*tuck; legs[1].rotation.x = -0.6*tuck;
      arms[0].rotation.z = -0.18 + 1.1*tuck; arms[1].rotation.z = 0.18 - 1.1*tuck;
      body.rotation.x = 0; body.position.y = 0;
      const st = state.reduced ? 0 : tuck*0.1; body.scale.set(1 - st, 1 + st, 1 - st);
      root.position.set(ch.x, ch.y, ch.z); root.rotation.y = ch.yaw;
    }
    if(t < 1) return;
    const done = anim; anim = null;
    if(done.type === 'step'){
      ch.y = 0; ch.grounded = true; ch.squashV += 5; landSound();
      for(const l of legs) l.rotation.x = 0; arms[0].rotation.x = arms[1].rotation.x = 0;
    } else if(done.type === 'out'){
      ch.y = done.ty ?? 0; ch.vy = 0; ch.grounded = true; ch.squashV += 7; landSound();
      body.scale.set(1, 1, 1); arms[0].rotation.z = -0.18; arms[1].rotation.z = 0.18;
    } else if(done.type === 'in'){
      modes.setMode('drive');
      carApi()?.bump?.(0.7);
    } else if(done.type === 'door'){
      // swap once the curtain covers the screen; interior:enter lowers it again
      const locked = () => { busy = false; body.scale.set(1, 1, 1); fadeTo(0); flash('That door is locked for now'); };
      fadeTo(1, () => Promise.resolve(modes.enterInterior(done.id)).then(ok => { if(!ok) locked(); }).catch(locked));
    }
  }

  function writePlayer(){
    const P = state.player; P.x = ch.x; P.z = ch.z; P.heading = ch.yaw; P.speed = ch.speed; P.pushRadius = 0.95;
  }
  function parkTwin(){ twin.position.set(0, -100, 0); twin.velocity.setZero(); }

  // Room camera: a gentle follow that keeps the room's own framing (base captured on enter).
  let camBase = null;
  function roomCamera(room, dt){
    const cam = room.camera; if(!cam?.isPerspectiveCamera || room.cameraLocked) return;
    // (Re)capture the room's own framing when first seen, or when the room moved its camera
    // itself (a room with several spots, say), so the nudge composes with it instead of fighting.
    const moved = camBase && camBase.last && cam.position.distanceToSquared(camBase.last) > 1e-4;
    if(!camBase || camBase.cam !== cam || moved){
      const ox = moved ? camBase.ox : 0, oz = moved ? camBase.oz : 0;
      cam.getWorldDirection(f2);
      const k = Math.abs(f2.y) > 1e-3 ? (0.5 - cam.position.y)/f2.y : 10;
      const pos = cam.position.clone(); pos.x -= ox; pos.z -= oz;
      camBase = { cam, pos, look:pos.clone().addScaledVector(f2, k), ox, oz, last:null };
    }
    const b = room.bounds, w = b ? (b.maxX - b.minX) : 16, d = b ? (b.maxZ - b.minZ) : 12;
    const cx = b ? (b.minX + b.maxX)/2 : 0, cz = b ? (b.minZ + b.maxZ)/2 : 0;
    const tx = Math.max(-w*0.2, Math.min(w*0.2, (ch.x - cx)*0.4)), tz = Math.max(-d*0.15, Math.min(d*0.15, (ch.z - cz)*0.25));
    const k = state.reduced ? 1 : 1 - Math.exp(-dt*3);
    camBase.ox += (tx - camBase.ox)*k; camBase.oz += (tz - camBase.oz)*k;
    cam.position.set(camBase.pos.x + camBase.ox, camBase.pos.y, camBase.pos.z + camBase.oz);
    cam.lookAt(camBase.look.x + camBase.ox, camBase.look.y, camBase.look.z + camBase.oz);
    camBase.last = (camBase.last || new THREE.Vector3()).copy(cam.position);
  }
  function restoreRoomCamera(){ if(camBase){ camBase.cam.position.copy(camBase.pos); camBase.cam.lookAt(camBase.look); camBase = null; } }

  ctx.onUpdate((dt, t, mode) => {
    stepFade(dt);
    if(notice){ notice.t -= dt; if(notice.t <= 0) notice = null; }
    if(mode !== 'interior'){ stepWaterFx(dt); stepDust(dt); }

    if(mode === 'drive'){
      parkTwin();
      if(where !== 'seat' && !anim) attach('seat');
      // seated: lean into turns, bob with the road, hands on the wheel
      const c = carApi()?.car;
      if(c && where === 'seat'){
        const st = state.reduced ? 0 : c.steer;
        body.rotation.z = st*0.12*Math.min(1, Math.abs(c.speed)/8); body.rotation.x = 0;
        head.rotation.y = st*0.25; head.rotation.z = 0;
        arms[0].rotation.x = arms[1].rotation.x = -1.2; arms[0].rotation.z = -0.25 - st*0.15; arms[1].rotation.z = 0.25 - st*0.15;
        ch.blink -= dt; if(ch.blink < 0) ch.blink = 2.4 + Math.random()*2.8; eyeG.scale.y = ch.blink < 0.12 ? 0.12 : 1;
        ch.x = c.x; ch.z = c.z; ch.yaw = c.heading;
        stopped = Math.abs(c.speed) < 1 ? stopped + dt : 0;
        const nearDoor = nearestDoor(6);
        const text = notice ? notice.text : (state.started && (stopped > 0.6 || nearDoor) ? 'Hop out' : '');
        showPrompt(text, c.x, 3.1, c.z, ctx.camera, !!notice);
      }
      return;
    }

    if(mode === 'walk'){
      if(where !== 'island') attach('island');
      if(anim) stepAnim(dt);
      else if(!busy) locomote(dt, ctx.camera, walkColliders(), null, true);
      // Hopping in ends inside stepAnim with setMode('drive'), which has already seated him
      // (attach('seat')). Stop here: the code below would push him out of the car box and write
      // that island position into his seat-local transform, which was the sideways glitch.
      if(state.mode !== 'walk') return;
      if(!anim){
        // The parked car sits right in the door approach (teleport and a natural stop both leave
        // it on the approach line, nose to the door). Walking straight at its flat back pushed
        // him into the face dead-on, with no sideways component to slide on, so he stalled
        // behind it. Instead, when the car pushes him back, he slides along its side, toward the
        // side he is already on, and walks round it.
        const cb = carBox();
        if(cb){
          const px = ch.x, pz = ch.z; resolve([cb], R);
          const nx = ch.x - px, nz = ch.z - pz, n = Math.hypot(nx, nz), it = moveIntent(ctx.camera);
          if(n > 1e-4 && it){
            let tx = -nz/n, tz = nx/n;                                   // tangent along the car's face
            const along = tx*it.mx + tz*it.mz;
            if(Math.abs(along) < 0.35){                                  // pushing into it head-on
              const side = (ch.x - cb.x)*tx + (ch.z - cb.z)*tz;          // which side of the centre he is on
              if(side < 0){ tx = -tx; tz = -tz; }
            } else if(along < 0){ tx = -tx; tz = -tz; }
            const step = (keys.boost ? RUN : WALK)*dt*0.9;
            ch.x += tx*step; ch.z += tz*step; resolve([cb], R); resolve(walkColliders(), R);
          }
        }
        const lim = ctx.island.radius - 2, r = Math.hypot(ch.x, ch.z); if(r > lim){ ch.x *= lim/r; ch.z *= lim/r; }
        root.position.x = ch.x; root.position.z = ch.z;
      }
      writePlayer();
      twin.position.set(ch.x, 0.5 + ch.y, ch.z); twin.velocity.set(ch.vx, 0, ch.vz);
      autoEnter();
      // prompt: door beats car when it is the closer of the two
      let text = '', info = false, at = null;
      if(notice){ text = notice.text; info = notice.calm ? 'calm' : true; }
      else if(!anim && state.started && !pickNear() && !ctx.modules.pets?.nearest?.() && !ctx.modules.garage?.nearest?.() && !ctx.modules.drone?.nearest?.() && !ctx.modules.drone?.active?.()){
        // a pickup or a pet in reach wins F, and brings its own prompt (talking is C, with its own badge)
        const d = nearestDoor(DOOR_R), cd = carDist();
        if(d && (cd > 3.4 || Math.hypot(ch.x - d.x, ch.z - d.z) < cd)){
          // pinned over the doorway, not over his head, so it reads as a sign on the building
          text = 'Enter ' + d.name; at = [d.x - Math.sin(d.heading)*1.2, 3.1, d.z - Math.cos(d.heading)*1.2];
        }
        else if(cd <= 3.4) text = 'Drive';
      }
      if(busy) text = '';
      showPrompt(text, at ? at[0] : ch.x, at ? at[1] : ch.y + 2.35, at ? at[2] : ch.z, ctx.camera, info);
      return;
    }

    if(mode === 'interior'){
      parkTwin();
      const room = state.interior; if(!room) return;
      if(room.ownsPlayer){ showPrompt('', 0, 0, 0, null); return; }   // space: src/space moves its own astronaut
      if(where !== 'room' || root.parent !== room.scene) attach('room');
      const P = room.player || (room.player = { x:0, z:0, heading:Math.PI, speed:0 });
      if(anim) anim = null;
      ch.x = P.x; ch.z = P.z;
      if(busy){ ch.vx = ch.vz = ch.speed = 0; animateWalk(dt); }
      else locomote(dt, room.camera || ctx.interiorCamera, room.colliders, room.bounds);
      P.x = ch.x; P.z = ch.z; P.heading = ch.yaw; P.speed = ch.speed;
      roomCamera(room, dt);
      const ex = room.exit;
      let text = notice ? notice.text : '';
      if(ex){
        const d = Math.hypot(ch.x - ex.x, ch.z - ex.z), r = ex.r || 1.5;
        if(!exitArmed && d > r + 0.4) exitArmed = true;
        if(exitArmed && d < r + 0.2){ leaveRoom(); showPrompt('', 0, 0, 0, null); return; }
        if(!text && !busy && d < r + 1.4){ showPrompt('Leave', ex.x, 2.8, ex.z, room.camera || ctx.interiorCamera); return; }
      }
      showPrompt(busy ? '' : text, ch.x, ch.y + 2.35, ch.z, room.camera || ctx.interiorCamera, !!notice);
    }
  }, 10);

  // Held movement keys survive a mode change. Core's setMode / enterInterior / exitInterior call
  // input.clear(), and a key that is still physically down never sends another keydown (a
  // keyboard only auto-repeats the last key pressed, F here; CDP sends none), so holding W
  // through "F hop out" left him standing still beside the car. We track what is physically
  // down from the bus 'key' events and put those back after every mode change.
  const heldMove = new Set();
  bus.on('key', ({ code, down }) => { const m = input.MOVE?.[code]; if(m && m !== 'brake'){ if(down) heldMove.add(code); else heldMove.delete(code); } });
  addEventListener('blur', () => heldMove.clear());
  function restoreHeld(){ for(const code of heldMove) keys[input.MOVE[code]] = true; }

  bus.on('mode', ({ from, to }) => {
    restoreHeld();
    if(to === 'walk' && from === 'drive'){
      const spot = spotBesideCar();
      if(spot) startHopOut(spot);
      else { const a = carApi()?.car; attach('island'); if(a){ ch.x = a.x + 2.2; ch.z = a.z; } for(const l of legs) l.rotation.x = 0; }
    }
    if(to === 'drive'){
      anim = null; busy = false; fadeTo(0); attach('seat'); showPrompt('', 0, 0, 0, null);
      swim.on = false; swim.deck = null; swim.depth = 0; head.rotation.x = 0;
      const c = carApi()?.car; if(c){ ch.x = c.x; ch.z = c.z; ch.yaw = c.heading; ch.y = 0; ch.vy = 0; ch.grounded = true; }
    }
    if(from === 'interior' && to === 'walk'){
      // Out the door: a couple of steps onto the approach, still facing away from the building.
      attach('island');
      const d = doorList().find(q => Math.hypot(q.x - ch.x, q.z - ch.z) < 0.5);
      if(d){
        leftDoor = d; autoSkip = { id:d.id, x:d.x, z:d.z, until:nowS() + AUTO_WAIT };
        const tx = d.x + Math.sin(d.heading)*1.4, tz = d.z + Math.cos(d.heading)*1.4;
        if(clearAt(tx, tz, R)) anim = { type:'step', t:0, dur:0.45, fx:ch.x, fz:ch.z, tx, tz, yaw0:d.heading, yaw1:d.heading };
      }
      if(!anim){ ch.vy = 4.5; ch.grounded = false; ch.y = 0.01; }
    }
    if(to !== 'walk' && to !== 'drive') showPrompt('', 0, 0, 0, null);
  });
  bus.on('interior:enter', ({ room }) => {
    busy = false; fadeTo(0);
    anim = null; body.scale.set(1, 1, 1); for(const l of legs) l.rotation.x = 0;
    ch.vx = ch.vz = ch.speed = 0; ch.y = 0; ch.vy = 0; ch.grounded = true;
    swim.on = false; swim.deck = null; swim.depth = 0; head.rotation.x = 0; body.rotation.x = 0;
    const P = room?.player; if(P){ ch.x = P.x; ch.z = P.z; ch.yaw = P.heading ?? Math.PI; }
    const ex = room?.exit;
    exitArmed = !ex || Math.hypot(ch.x - ex.x, ch.z - ex.z) > (ex.r || 1.5) + 0.4;
    camBase = null;
    attach('room');
    root.position.set(ch.x, 0, ch.z); root.rotation.y = ch.yaw;
  });
  bus.on('interior:exit', () => { busy = false; if(!fade.then) fadeTo(0); restoreRoomCamera(); if(state.mode === 'drive') attach('seat'); });

  // Hints for each mode.
  try {
    const driveHint = ctx.hud?.hint?.innerHTML || '';
    if(driveHint && !/hop out/i.test(driveHint)) ctx.hud.setHint('drive', driveHint + ' · <kbd>F</kbd> hop out · <kbd>V</kbd> first person');
    ctx.hud?.setHint('walk', '<kbd>WASD</kbd> walk · <kbd>Shift</kbd> run · <kbd>Space</kbd> hop · <kbd>F</kbd> interact · <kbd>C</kbd> talk · <kbd>H</kbd> call car · <kbd>R</kbd> reset · <kbd>V</kbd> first person');
    ctx.hud?.setHint('interior', '<kbd>WASD</kbd> walk · walk out the door or <kbd>Esc</kbd> to leave');
  } catch(e){ /* the hint line is optional */ }

  // Minimap: show where the car is parked while walking, so it is never lost.
  ctx.hud?.minimapLayers?.push((g, toMap) => {
    if(state.mode !== 'walk') return;
    const c = carApi()?.car; if(!c) return;
    const [px, py] = toMap(c.x, c.z);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();
    g.fillStyle = '#4a5fd0'; g.fillRect(px - 4, py - 3, 8, 6);
  });

  const api = {
    available: true,
    group: root,
    placeAt(x, z, heading){
      anim = null; leftDoor = null; ch.x = x; ch.z = z; ch.yaw = heading; ch.vx = ch.vz = ch.speed = 0; ch.y = 0; ch.vy = 0; ch.grounded = true;
      body.scale.set(1, 1, 1); for(const l of legs) l.rotation.x = 0;
      if(state.mode !== 'interior') attach('island');
      root.position.set(x, 0, z); root.rotation.y = heading;
      writePlayer();
    },
    exitCar,
    enterCar,
    enterDoorById(id){ if(state.mode !== 'walk') return false; const d = doorList().find(q => q.id === id); return d ? enterDoor(d) : false; },   // touch.js: a tapped door walks in like F
    interact,                          // the F resolver; returns what it did
    swimming: () => swim.on,
    onDock: () => !!swim.deck && swim.deck.kind !== 'bridge' && state.mode === 'walk',
    get position(){ return { x:ch.x, z:ch.z, heading:ch.yaw, speed:ch.speed }; },
    // For a first-person camera: world height of his head centre (seated, swimming or walking).
    get headY(){ head.updateWorldMatrix(true, false); return head.getWorldPosition(headV).y; },
    setFirstPerson(on){ head.visible = !on; hood.visible = !on; },   // hides the head (hair and tuft ride on it) and the hood
  };
  attach('seat');
  modes.registerPlayer('walk', api);

  // Critic hooks: window.__island.character
  ctx.expose('character', {
    info: () => ({ where, anim: anim?.type || null, x:+ch.x.toFixed(2), z:+ch.z.toFixed(2), y:+ch.y.toFixed(2), speed:+ch.speed.toFixed(2), prompt: promptShown, carDist:+carDist().toFixed(2),
      swimming: swim.on, deck: swim.deck?.kind || null, autoSkip: autoSkip?.id || null, depth:+swim.depth.toFixed(2), rootLocal: [+root.position.x.toFixed(2), +root.position.y.toFixed(2), +root.position.z.toFixed(2)] }),
    exitCar, enterCar, interact,
    doors: () => doorList().map(d => ({ id:d.id, x:+d.x.toFixed(2), z:+d.z.toFixed(2) })),
    // Stand just in front of a building's door, facing it, so the Enter prompt shows.
    toDoor(id){
      const d = doorList().find(q => q.id === id); if(!d) return false;
      if(state.mode !== 'walk'){ if(state.mode === 'interior') modes.exitInterior(); if(state.mode !== 'walk') modes.setMode('walk'); }
      anim = null; api.placeAt(d.x + Math.sin(d.heading)*0.6, d.z + Math.cos(d.heading)*0.6, d.heading + Math.PI);
      return true;
    },
  });
  return api;
}
