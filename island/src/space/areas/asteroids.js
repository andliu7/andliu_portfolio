// Asteroid Field (builder B): zero-g jetpack drifting between tumbling rocks.
//   - spawn floats over a flat home rock that holds the wing pad (home) and the hatch (station)
//   - rocks are two InstancedMeshes of dodecahedra (big and small); the big ones drift on slow
//     sine paths and are jetpack obstacles through live Vector3s, so a drifting rock bounces you
//   - asteroids-1 sits in the middle of a hollow ball of rocks turning about its vertical axis; one
//     gap on its equator comes round every half minute (time it); asteroids-2 is inside a derelict
//     satellite drifting near the boundary, open end toward the field
//   - a comet with a glowing tail crosses the sky on a slow ellipse, the landmark
//   - résumé eggs, words from zones.js only: the skills belt (one small rock per skill from the
//     skills role and first bullet, labels in one draw call), a floating crate from dock, a buoy
//     from studio
// The pure layout (fieldLayout) is node-tested in brief-b.test.mjs.
import { prng, hashSeed } from '../kit.js';

export const FIELD = {
  R:45,                                                   // the jetpack's soft boundary
  spawn:{ x:0, y:2.6, z:5.5, yaw:Math.PI },
  pad:{ x:-2, y:0, z:1.5 }, hatch:{ x:2.4, y:0, z:1.2 },
  ring:{ x:17, y:6, z:-22, r:3.6, n:52, gap:0.72, spin:0.2, rock:0.95, hit:0.85 },   // gap: half angle of the missing cap (rad)
  sat:{ x:-26, y:-6, z:32, drum:2.2, len:4, roll:0.12 },
  crate:{ x:-8, y:4, z:-7 }, buoy:{ x:9, y:-3, z:-6 },
  belt:{ r:15, y:3, tilt:0.22, speed:0.03 },
};

// One skill per small rock: the skills role and first bullet, split on commas.
export function skillWords(z){
  if(!z) return [];
  return [z.role, z.bullets?.[0] || ''].join(', ').split(',').map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
}

// Everything that moves, as plain data with live vectors. step(t) updates it in place (no
// allocation); obstacles hold the same Vector3s, so the jetpack always sees where rocks are now.
export function fieldLayout(THREE, nSkills = 0){
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Y = V(0, 1, 0), rnd = prng(hashSeed('asteroids'));
  const unit = () => { const u = rnd()*2 - 1, a = rnd()*Math.PI*2, s = Math.sqrt(1 - u*u); return V(Math.cos(a)*s, u, Math.sin(a)*s); };   // uniform on the sphere
  const obstacles = [];

  // home rock: one bulk sphere and a ring of six whose tops sit at y = 0, the flat top
  obstacles.push({ pos:V(0, -3.3, 0), r:3.3, what:'home' });
  for(let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; obstacles.push({ pos:V(Math.cos(a)*3.4, -1.8, Math.sin(a)*3.4), r:1.8, what:'home' }); }

  // the turning ball of rocks round asteroids-1: Fibonacci points on a sphere, minus a cap round +x
  const R = FIELD.ring, rc = V(R.x, R.y, R.z), gapDir = V(1, 0, 0), shell = [];
  const golden = Math.PI*(3 - Math.sqrt(5));              // the golden angle spreads points evenly
  for(let i = 0; i < R.n; i++){
    const y = 1 - (i + 0.5)/R.n*2, rr = Math.sqrt(1 - y*y), d = V(Math.cos(i*golden)*rr, y, Math.sin(i*golden)*rr);
    if(d.angleTo(gapDir) < R.gap) continue;
    const it = { dir:d, pos:V(), scale:V(R.rock, R.rock*0.85, R.rock), axis:unit(), spin:(rnd() - 0.5)*0.6, ph:rnd()*6.3, r:R.hit };
    shell.push(it); obstacles.push({ pos:it.pos, r:R.hit, what:'ring' });
  }

  // the satellite: a drum open at local +z, pointing at the middle of the field
  const S = FIELD.sat, satBase = V(S.x, S.y, S.z);
  const sat = { pos:satBase.clone(), quat:new THREE.Quaternion(), base:new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), satBase.clone().negate().normalize()), roll:new THREE.Quaternion(), local:[], obst:[] };
  const satPt = (x, y, z, r) => { const o = { pos:V(), r, what:'satellite' }; sat.local.push(V(x, y, z)); sat.obst.push(o); obstacles.push(o); };
  for(const zl of [-1.5, 0, 1.5]) for(let k = 0; k < 8; k++){ const a = k/8*Math.PI*2; satPt(Math.cos(a)*S.drum, Math.sin(a)*S.drum, zl, 0.8); }   // the drum wall
  satPt(0, 0, -2, 1.3);                                                                                                  // the closed back
  for(const sx of [-1, 1]) for(let j = 0; j < 3; j++) satPt(sx*(3.2 + j*1.3), 0, -0.3, 0.75);                            // the solar panels

  const crate = { base:V(FIELD.crate.x, FIELD.crate.y, FIELD.crate.z), pos:V(FIELD.crate.x, FIELD.crate.y, FIELD.crate.z) };
  obstacles.push({ pos:crate.pos, r:1.7, what:'crate' });
  const buoy = { pos:V(FIELD.buoy.x, FIELD.buoy.y, FIELD.buoy.z) };
  obstacles.push({ pos:buoy.pos, r:1.2, what:'buoy' });

  // the belt circle: radius r round (0, y, 0), tilted about x
  const B = FIELD.belt, tq = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), B.tilt), tqi = tq.clone().invert();
  const beltAt = (a, out) => out.set(Math.cos(a)*B.r, 0, Math.sin(a)*B.r).applyQuaternion(tq).setY(out.y + B.y);
  const tmp = V();
  const beltDist = p => { tmp.copy(p).setY(p.y - B.y).applyQuaternion(tqi); return Math.hypot(Math.hypot(tmp.x, tmp.z) - B.r, tmp.y); };

  // big rocks: rejection-sampled in a flattened shell, clear of everything above and each other
  const avoid = [[V(), 9], [rc, R.r + 4], [satBase, 7], [crate.base, 4], [buoy.pos.clone(), 4]];
  const big = [];
  for(let tries = 0; big.length < 34 && tries < 5000; tries++){
    const d = 12 + rnd()*29, p = unit().multiplyScalar(d); p.y *= 0.7;
    const r = 1.4 + rnd()*2.2, amp = 0.5 + rnd()*1.3;
    if(p.length() > FIELD.R - 3 || avoid.some(([c, m]) => p.distanceTo(c) < m + r + amp) || beltDist(p) < r + amp + 1.5) continue;
    if(big.some(b => p.distanceTo(b.base) < b.r + r + b.amp + amp + 1.5)) continue;
    const scale = V(r*(0.85 + rnd()*0.3), r*(0.75 + rnd()*0.3), r*(0.85 + rnd()*0.3));
    const it = { base:p, pos:p.clone(), r, amp, dir:unit(), w:0.08 + rnd()*0.12, ph:rnd()*6.3, scale, axis:unit(), spin:(rnd() - 0.5)*0.5, hit:(scale.x + scale.y + scale.z)/3*0.88 };
    big.push(it); obstacles.push({ pos:it.pos, r:it.hit, what:'rock' });
  }

  // small scatter (not obstacles: pebbles you can brush through)
  const scatter = [];
  for(let tries = 0; scatter.length < 110 && tries < 5000; tries++){
    const p = unit().multiplyScalar(7 + rnd()*37); p.y *= 0.75;
    if(p.length() < 7.5 || p.distanceTo(rc) < R.r + 2.5 || p.distanceTo(satBase) < 5.5 || big.some(b => p.distanceTo(b.base) < b.r + b.amp + 1)) continue;
    const s = 0.2 + rnd()*0.55;
    scatter.push({ pos:p, scale:V(s, s*(0.7 + rnd()*0.4), s*(0.8 + rnd()*0.3)), axis:unit(), spin:(rnd() - 0.5)*1.2, ph:rnd()*6.3 });
  }

  // skill rocks riding the belt
  const skills = Array.from({ length:nSkills }, (_, i) => ({ a0:i/nSkills*Math.PI*2, bob:rnd()*6.3, pos:V(), label:V(), scale:V(0.55, 0.45, 0.5), axis:unit(), spin:(rnd() - 0.5)*0.8, ph:rnd()*6.3 }));
  const beltTitle = beltAt(Math.PI/2, V()).add(V(0, 2.2, 0));   // the belt's name floats where it passes nearest the spawn

  function step(t){
    for(const b of big) b.pos.copy(b.base).addScaledVector(b.dir, Math.sin(t*b.w + b.ph)*b.amp);   // drift along a line, a sine back and forth
    const ang = t*R.spin;
    for(const s of shell) s.pos.copy(s.dir).applyAxisAngle(Y, ang).multiplyScalar(R.r).add(rc);
    sat.pos.set(S.x + Math.sin(t*0.13)*0.8, S.y + Math.sin(t*0.17 + 1)*0.5, S.z + Math.cos(t*0.11)*0.8);
    sat.quat.copy(sat.base).multiply(sat.roll.setFromAxisAngle(Z, t*S.roll));                     // roll about its own axis: the open end keeps facing in
    for(let i = 0; i < sat.local.length; i++) sat.obst[i].pos.copy(sat.local[i]).applyQuaternion(sat.quat).add(sat.pos);
    crate.pos.copy(crate.base).setY(crate.base.y + Math.sin(t*0.4)*0.3);
    for(const k of skills){ beltAt(k.a0 + t*B.speed, k.pos); k.pos.y += Math.sin(t*0.6 + k.bob)*0.35; k.label.copy(k.pos).setY(k.pos.y + 0.95); }
  }
  const Z = V(0, 0, 1);
  // where the ring's gap points at time t, and the time it next faces a direction (for tests and hooks)
  const gapAt = (t, out) => out.copy(gapDir).applyAxisAngle(Y, t*R.spin);
  step(0);
  return { obstacles, shell, big, scatter, skills, sat, crate, buoy, ringCentre:rc, beltTitle, gapAt, beltDist, step };
}

/* ======================================================================================== */
export function build(ctx, kit){
  const { THREE, H } = kit;
  const scene = kit.scene({ bg:'#0d1030', stars:1000, seed:kit.hashSeed('asteroids'), light:1.7, hemi:1.1 });
  const camera = kit.camera(55);
  kit.ringedPlanet(scene, { x:-110, y:26, z:-170, r:26, color:'#c9a8f0', band:'#a78bfa', ring:'#ffe0b0' });
  const words = skillWords(kit.zone('skills'));
  const F = fieldLayout(THREE, words.length);
  const Vz = new THREE.Vector3(0, 0, 1);

  /* ---------- the home rock: a flat-topped slab over a lumpy bulk ---------- */
  const rockMat = new THREE.MeshStandardMaterial({ color:'#a39382', roughness:0.95, flatShading:true });
  const slabGeo = new THREE.CylinderGeometry(5.4, 3.6, 2.2, 10, 1);
  const jr = kit.prng(kit.hashSeed('home-rock')), sp = slabGeo.attributes.position;
  for(let i = 0; i < sp.count; i++) if(sp.getY(i) < 0){ sp.setX(i, sp.getX(i)*(0.85 + jr()*0.3)); sp.setZ(i, sp.getZ(i)*(0.85 + jr()*0.3)); }   // lumpy underside, flat top
  slabGeo.computeVertexNormals();
  const slab = new THREE.Mesh(slabGeo, rockMat); slab.position.y = -1.1; scene.add(slab);
  const bulk = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 0), rockMat); bulk.position.y = -3.4; bulk.rotation.set(0.4, 0.3, 0); scene.add(bulk);
  const { spawn, pad, hatch } = FIELD;
  kit.wingPad(scene, pad.x, pad.y, pad.z, { rot:Math.atan2(spawn.x - pad.x, spawn.z - pad.z) });
  kit.hatch(scene, hatch.x, hatch.y, hatch.z, { rot:Math.atan2(spawn.x - hatch.x, spawn.z - hatch.z), color:'#e98a5a' });

  /* ---------- rocks: two InstancedMeshes, tumbling every frame ---------- */
  const dodeca = new THREE.DodecahedronGeometry(1, 0);
  const rockInst = new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:0.95, flatShading:true });
  const smallList = [...F.shell, ...F.scatter, ...F.skills];
  const bigMesh = new THREE.InstancedMesh(dodeca, rockInst, F.big.length), smallMesh = new THREE.InstancedMesh(dodeca, rockInst, smallList.length);
  bigMesh.frustumCulled = smallMesh.frustumCulled = false;                 // instances move, so the mesh's bounds would go stale
  const tint = ['#8d8579', '#a3907c', '#b59a82', '#7f7a8c', '#9c8f86'], c = new THREE.Color(), cr = kit.prng(5);
  F.big.forEach((_, i) => bigMesh.setColorAt(i, c.set(tint[(cr()*tint.length) | 0])));
  smallList.forEach((it, i) => smallMesh.setColorAt(i, c.set(F.skills.includes(it) ? '#e98a5a' : F.shell.includes(it) ? '#b8a48f' : tint[(cr()*tint.length) | 0])));
  scene.add(bigMesh, smallMesh);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion();
  function writeRocks(mesh, list, t){
    for(let i = 0; i < list.length; i++){ const it = list[i]; qq.setFromAxisAngle(it.axis, it.ph + t*it.spin); mesh.setMatrixAt(i, m4.compose(it.pos, qq, it.scale)); }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- the comet: an icy head, a halo, two additive tails fading to nothing ---------- */
  const comet = new THREE.Group(); scene.add(comet);
  comet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshStandardMaterial({ color:'#e8f6ff', emissive:'#9fdcff', emissiveIntensity:0.7, flatShading:true })));
  const haloTex = H.canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#e8f8ffff'); gr.addColorStop(0.35, '#9fdcff88'); gr.addColorStop(1, '#9fdcff00'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:haloTex.tex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); halo.scale.setScalar(16); comet.add(halo);
  const tail = (r, len, color) => {
    const g = new THREE.ConeGeometry(r, len, 18, 1, true).translate(0, -len/2, 0);   // apex at the head, the wide end trails behind along -y
    const pos = g.attributes.position, cols = new Float32Array(pos.count*3), base = new THREE.Color(color);
    for(let i = 0; i < pos.count; i++){ const k = Math.pow(1 + pos.getY(i)/len, 1.6); cols.set([base.r*(1 - k), base.g*(1 - k), base.b*(1 - k)], i*3); }   // bright at the head, black (nothing, additively) at the end
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide }));
    comet.add(m); return m;
  };
  const tails = [tail(3.4, 38, '#7fc8ff'), tail(1.4, 52, '#e8f6ff')];
  const cometPos = (s, out) => out.set(Math.cos(s)*150, 55 + Math.sin(s*2)*18, Math.sin(s)*100 - 40);   // a slow ellipse above the field
  const cp = new THREE.Vector3(), cv = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);

  /* ---------- the derelict satellite round asteroids-2 ---------- */
  const S = FIELD.sat, satG = new THREE.Group(); scene.add(satG);
  const hull = new THREE.MeshStandardMaterial({ color:'#d9dde6', roughness:0.6, metalness:0.2, side:THREE.DoubleSide });
  satG.add(new THREE.Mesh(new THREE.CylinderGeometry(S.drum, S.drum, S.len, 18, 1, true).rotateX(Math.PI/2), hull));   // the drum, its axis along local z
  const back = new THREE.Mesh(new THREE.CircleGeometry(S.drum, 18), hull); back.position.z = -S.len/2; satG.add(back);
  for(const sx of [-1, 1]){
    const panel = H.box(3.8, 0.08, 1.5, '#3b4f9e', sx*4.5, 0, -0.3, satG);
    if(sx > 0) panel.rotation.x = 0.5;                                     // one panel knocked askew: derelict
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI*2, 0, Math.PI/2.6), hull); dish.rotation.x = -Math.PI/2; dish.position.z = -S.len/2 - 0.9; satG.add(dish);
  const beaconMat = new THREE.MeshBasicMaterial({ color:'#ff6b6b' });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), beaconMat); beacon.position.set(0, S.drum + 0.2, 0); satG.add(beacon);

  /* ---------- the shards ---------- */
  const [id1, id2] = kit.shardsFor('asteroids');
  kit.shard(scene, id1, F.ringCentre.x, F.ringCentre.y, F.ringCentre.z);   // in the middle of the turning ball of rocks
  kit.shard(satG, id2, 0, 0, 0.4);                                          // inside the drum; rides along as it drifts

  /* ---------- résumé eggs: a floating crate (dock) and a buoy (studio), facing the home rock ---------- */
  const facing = (g, p) => { g.rotation.y = Math.atan2(spawn.x - p.x, spawn.z - p.z); };
  const dock = kit.zone('dock');
  const crateG = new THREE.Group(); crateG.position.copy(F.crate.pos); scene.add(crateG); facing(crateG, F.crate.pos);
  const crateYaw = crateG.rotation.y;
  H.box(2.4, 2.4, 2.4, '#c98b4a', 0, 0, 0, crateG);
  kit.sign(crateG, 0, -0.95, 1.26, { zone:'dock', lines:dock ? [dock.bullets[1]] : undefined, post:false, w:3.2, h:1.9 });
  const buoyG = new THREE.Group(); buoyG.position.copy(F.buoy.pos); scene.add(buoyG); facing(buoyG, F.buoy.pos);
  H.cyl(0.6, 0.75, 2.2, '#8a5cc2', 0, 0, 0, buoyG, 16);
  H.mesh(new THREE.ConeGeometry(0.6, 0.7, 16), '#f4f3ee', 0, 1.45, 0, buoyG);
  const lampMat = new THREE.MeshBasicMaterial({ color:'#ffd166' });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), lampMat); lamp.position.y = 1.9; buoyG.add(lamp);
  kit.sign(buoyG, 0, -1.0, 0.8, { zone:'studio', post:false, w:3.4, h:2 });

  /* ---------- skill labels: one mesh of camera-facing quads, all in one draw call ---------- */
  const title = kit.zone('skills')?.title || '';
  const texts = title ? [title, ...words] : words, n = texts.length, rows = Math.ceil(n/2), cellW = 512, cellH = 96;
  const atlas = H.canvasTex(cellW*2, cellH*rows, g => {
    texts.forEach((s, i) => {
      const x = (i % 2)*cellW, y = ((i/2) | 0)*cellH, big = title && i === 0;
      H.F(g, 700, big ? 46 : 38); const tw = Math.min(cellW - 16, g.measureText(s).width + 44);
      g.fillStyle = big ? '#e98a5a' : '#fffaf0'; H.rr(g, x + (cellW - tw)/2, y + 12, tw, cellH - 24, (cellH - 24)/2); g.fill();
      g.fillStyle = big ? '#ffffff' : '#1f2a44'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x + cellW/2, y + cellH/2 + 2);
    });
  });
  const lpos = new Float32Array(n*12), luv = new Float32Array(n*8), lidx = [];
  for(let i = 0; i < n; i++){
    const u0 = (i % 2)/2, u1 = u0 + 0.5, vt = 1 - ((i/2) | 0)/rows, vb = vt - 1/rows;   // canvas rows run down, uv v runs up
    luv.set([u0, vb, u1, vb, u1, vt, u0, vt], i*8);
    lidx.push(i*4, i*4 + 1, i*4 + 2, i*4, i*4 + 2, i*4 + 3);
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3)); lgeo.setAttribute('uv', new THREE.BufferAttribute(luv, 2)); lgeo.setIndex(lidx);
  const labels = new THREE.Mesh(lgeo, new THREE.MeshBasicMaterial({ map:atlas.tex, transparent:true, depthWrite:false, toneMapped:false, side:THREE.DoubleSide }));
  labels.frustumCulled = false; scene.add(labels);
  const right = new THREE.Vector3(), up = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Yv = new THREE.Vector3(0, 1, 0);
  function writeLabels(){
    right.copy(X).applyQuaternion(camera.quaternion); up.copy(Yv).applyQuaternion(camera.quaternion);   // the camera's own right and up: quads face it
    for(let i = 0; i < n; i++){
      const big = title && i === 0, p = big ? F.beltTitle : F.skills[i - (title ? 1 : 0)].label;
      const hw = big ? 2.2 : 1.35, hh = hw*cellH/cellW;
      for(let k = 0; k < 4; k++){
        const sx = k === 0 || k === 3 ? -hw : hw, sy = k < 2 ? -hh : hh, o = i*12 + k*3;
        lpos[o] = p.x + right.x*sx + up.x*sy; lpos[o + 1] = p.y + right.y*sx + up.y*sy; lpos[o + 2] = p.z + right.z*sx + up.z*sy;
      }
    }
    lgeo.attributes.position.needsUpdate = true;
  }

  /* ---------- the player ---------- */
  const ctrl = kit.jetpack({ thrust:7, max:7, damping:0.35, bounds:{ r:FIELD.R }, obstacles:F.obstacles });
  const rig = kit.rig(camera, ctrl, { dist:7.5, height:2.6, look:1.0 });

  // critic hooks, once the field has been built: __island.spaceField.to('ring' | 'satellite' | 'crate' | 'buoy' | 'belt' | 'home')
  const hookT = { t:0 };
  ctx.expose?.('spaceField', {
    to(name){
      if(kit.player !== ctrl) return false;
      const p = new THREE.Vector3(), rc = F.ringCentre;
      if(name === 'ring') p.copy(F.gapAt(hookT.t + 2, p)).multiplyScalar(8).add(rc);                          // just outside where the gap is about to be
      else if(name === 'satellite') p.copy(Vz).applyQuaternion(F.sat.quat).multiplyScalar(6).add(F.sat.pos);    // in front of the open end
      else if(name === 'crate') p.copy(F.crate.pos).add(new THREE.Vector3(0, 0, 5).applyAxisAngle(Yv, crateYaw));
      else if(name === 'buoy') p.copy(F.buoy.pos).add(new THREE.Vector3(0, 0, 5).applyAxisAngle(Yv, buoyG.rotation.y));
      else if(name === 'belt') p.copy(F.beltTitle).add(new THREE.Vector3(0, -1, 4));
      else p.set(spawn.x, spawn.y, spawn.z);
      ctrl.place(p.x, p.y, p.z, spawn.yaw); rig.view.snap(); return true;
    },
    state:() => ({ t:+hookT.t.toFixed(1), obstacles:F.obstacles.length, skills:words.length }),
  });

  return {
    title:'Asteroid Field', scene, camera, rig, spawn,
    hint:'<kbd>WASD</kbd> drift · <kbd>Space</kbd> up · <kbd>Shift</kbd> down · <kbd>V</kbd> first person (<kbd>W</kbd> thrusts where you look) · <kbd>Esc</kbd> station',
    update(dt, t){
      hookT.t = t;
      F.step(t);
      writeRocks(bigMesh, F.big, t); writeRocks(smallMesh, smallList, t);
      satG.position.copy(F.sat.pos); satG.quaternion.copy(F.sat.quat);
      beaconMat.color.set((t % 1.6) < 0.2 ? '#ff6b6b' : '#5a2a30');
      crateG.position.copy(F.crate.pos); crateG.rotation.set(Math.sin(t*0.3)*0.1, crateYaw + Math.sin(t*0.2)*0.15, Math.sin(t*0.25)*0.08);
      buoyG.rotation.z = Math.sin(t*0.5)*0.06; lampMat.color.set((t % 2) < 1 ? '#ffd166' : '#8a6a2a');
      const s = t*0.012 + 1;
      cometPos(s, comet.position); cometPos(s + 0.001, cv).sub(comet.position).normalize();              // its direction of motion
      for(const m of tails) m.quaternion.setFromUnitVectors(down, cp.copy(cv).negate());                  // tails stream out behind
      writeLabels();
    },
  };
}
