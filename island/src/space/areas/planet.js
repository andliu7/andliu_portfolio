// Tiny Planet (builder A). A pastel planet with a 12 m radius that you can walk all the way round,
// Super Mario Galaxy style: gentle hills, toy trees, flowers, rocks and crystals (one InstancedMesh
// each), a stepping-stone path down the meridian you face at the spawn, a "Keep going" signpost at
// the equator and planet-1 at the south pole. Behind the spawn a big bouncy mushroom you can stand
// on, with planet-2 floating 3.5 m above its cap. Résumé eggs from src/data/zones.js: a hoop
// greenhouse (brain), a garden bed (yard) and an empty plot with a flag (now).
//
// Frame of reference: the planet sits at the origin. The spawn is the north pole (+y); "north" at
// any point is the tangent toward +y, and every sign faces north, toward where you come from.
//
// Draw calls: everything static is baked into one vertex-coloured mesh (plus one for the glass and
// one for the mushroom cap, which squashes). See the report in the build notes for the count.

const R = 12;                                    // planet radius, the orbiter's surface
const CAP_TOP = 2.2, CAP_H = 0.8, CAP_VR = 1.5;  // mushroom: height of the cap top, dome rise, visual radius
const CAP_R = 1.35;                              // standable part of the cap (a little inside the rim)

// A tiny geometry baker: every part becomes non-indexed triangles with a colour per vertex, all
// merged into one BufferGeometry, so a whole set of static props costs one draw call.
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
  const D2R = Math.PI/180;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const NORTH = V(0, 1, 0), XAX = V(1, 0, 0), YAX = V(0, 1, 0);
  const rnd = kit.prng(kit.hashSeed('tiny-planet'));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
  // polar angle th from the north pole, azimuth ph from +z toward +x (degrees) -> unit direction
  const dirOf = (th, ph) => V(Math.sin(th*D2R)*Math.sin(ph*D2R), Math.cos(th*D2R), Math.sin(th*D2R)*Math.cos(ph*D2R)).normalize();
  const arc = (a, b) => R*Math.acos(clamp(a.dot(b), -1, 1));   // metres along the surface between two unit directions
  const randDir = () => { const u = rnd()*2 - 1, a = rnd()*Math.PI*2, s = Math.sqrt(1 - u*u); return V(Math.cos(a)*s, u, Math.sin(a)*s); };   // uniform on the sphere

  /* ---------- the scene ---------- */
  const scene = kit.scene({ bg:'#1d1b45', sky:'#fff1f7', ground:'#7d86c2', hemi:1.25, light:1.8, stars:900, seed:21, shadow:true, shadowBox:13 });
  const camera = kit.camera(50);
  const sun = scene.userData.sun; scene.add(sun.target);
  const hemi = scene.children.find(o => o.isHemisphereLight);
  kit.ringedPlanet(scene, { x:70, y:34, z:-130, r:20, color:'#f7b2c4', band:'#e98aa6', ring:'#fff1c9', tilt:0.3 });
  kit.islandPlanet(scene, { x:-85, y:-26, z:-110, r:14 });

  /* ---------- sites: flat ground where things stand ---------- */
  const S = {
    spawn:{ d:dirOf(0, 0), r:2.6 },
    pad:{ d:dirOf(15, -55), r:1.9 },           // 3.1 m from the spawn
    hatch:{ d:dirOf(15, 55), r:1.9 },
    keep:{ d:dirOf(90, 14), r:1.5 },           // the equator signpost, 2.9 m beside the path
    south:{ d:dirOf(180, 0), r:3.6 },
    brain:{ d:dirOf(50, -118), r:3.8 },
    yard:{ d:dirOf(54, 122), r:3.2 },
    now:{ d:dirOf(122, -62), r:3.2 },
    mush:{ d:dirOf(62, 180), r:2.4 },          // behind the spawn: turn round and it is the tall pink thing
  };
  const SITES = Object.values(S);

  /* ---------- gentle hills ---------- */
  const HILLS = Array.from({ length:18 }, () => ({ d:randDir(), a:rnd() < 0.2 ? -0.35 : 0.4 + rnd()*0.5, w:0.17 + rnd()*0.14 }));
  function baseH(up){
    let h = 0;
    for(const b of HILLS) h += b.a*Math.exp(-(1 - up.dot(b.d))/(b.w*b.w));   // 1 - cos(angle) ~ angle^2/2: a Gaussian bump of angular width w
    let m = 1;
    for(const s of SITES){ m *= smooth(s.r, s.r + 2.6, arc(up, s.d)); if(m === 0) return 0; }
    return h*m;
  }
  // The mushroom cap is solid only from above: it counts as ground once your feet are near its top.
  const MUSH = S.mush.d;
  const capAt = dm => CAP_TOP - CAP_H + CAP_H*Math.sqrt(Math.max(0, 1 - (dm/CAP_VR)**2));   // height of the dome at dm metres from its axis
  let ctrl = null;
  function heightAt(up){
    let h = baseH(up);
    if(arc(up, S.pad.d) < 1.3) h = Math.max(h, 0.34);                        // stand on the wing pad, not in it
    const dm = arc(up, MUSH);
    if(dm < CAP_R && ctrl){ const top = capAt(dm); if(ctrl.pos.length() - R >= top - 0.6) h = top; }
    return h;
  }

  /* ---------- placement ---------- */
  const tf = V();
  // Stand obj on the surface at up, +z toward north (or turned by spin), lifted by lift.
  function stand(obj, up, lift = 0, spin = 0){
    kit.tangent(Math.abs(up.y) > 0.98 ? XAX : NORTH, up, tf);
    if(spin) tf.applyAxisAngle(up, spin);
    kit.orient(obj, up, tf);
    obj.position.copy(up).multiplyScalar(R + baseH(up) + lift);
    obj.updateMatrix(); obj.updateMatrixWorld(true);
    return obj;
  }
  const frame = (up, lift = 0) => { const g = new THREE.Group(); scene.add(g); return stand(g, up, lift); };
  // The unit direction lx metres to the right of and lz metres north of a frame's centre.
  const beside = (g, lx, lz) => V().setFromMatrixPosition(g.matrix).setLength(R)
    .addScaledVector(V().setFromMatrixColumn(g.matrix, 0), lx).addScaledVector(V().setFromMatrixColumn(g.matrix, 2), lz).normalize();
  const M = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz)).premultiply(g.matrix);

  const B = makeBaker(THREE), GLASS = makeBaker(THREE);
  const box = (g, w, h, d, color, x, y, z, rx, ry, rz) => B.add(new THREE.BoxGeometry(w, h, d), color, M(g, x, y, z, rx, ry, rz));
  const cyl = (g, rt, rb, h, color, x, y, z, seg = 10, rx, ry, rz) => B.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, M(g, x, y, z, rx, ry, rz));
  const ball = (g, r, color, x, y, z, sx = 1, sy = 1, sz = 1) => B.add(new THREE.SphereGeometry(r, 12, 8), color, M(g, x, y, z, 0, 0, 0, sx, sy, sz));
  // A résumé sign facing north on two baked posts (post:false keeps the kit's own posts out: two draws fewer).
  function sign(up, o){
    const g = frame(up), w = o.w ?? 3.2, h = o.h ?? 1.9, lift = o.lift ?? 1.0;
    for(const sx of [-w/2 + 0.3, w/2 - 0.3]) cyl(g, 0.07, 0.09, lift + h, '#b8c0d6', sx, (lift + h)/2, -0.08, 8);
    kit.sign(g, 0, lift, 0, { ...o, post:false, w, h });
    return g;
  }

  /* ---------- the planet ---------- */
  {
    const g = new THREE.SphereGeometry(1, 144, 96), pa = g.attributes.position, cols = new Float32Array(pa.count*3);
    const grass = new THREE.Color('#a4e3a0'), light = new THREE.Color('#d6f5c4'), lilac = new THREE.Color('#e2d3fb'), cream = new THREE.Color('#f6efcf'), c = new THREE.Color(), v = V();
    for(let i = 0; i < pa.count; i++){
      v.fromBufferAttribute(pa, i).normalize();
      const h = baseH(v);
      pa.setXYZ(i, v.x*(R + h), v.y*(R + h), v.z*(R + h));
      const meadow = Math.sin(v.x*7.1 + v.y*3.3)*Math.sin(v.z*6.7 - v.y*5.1);   // soft patches of lighter grass
      c.copy(grass).lerp(light, clamp(h/0.9 + meadow*0.35, 0, 1));
      c.lerp(lilac, 1 - smooth(3.2, 6.5, arc(v, S.south.d)));                    // a lilac glade round the south pole
      c.lerp(cream, (1 - smooth(1.6, 2.8, arc(v, S.spawn.d)))*0.6);              // a pale landing spot at the spawn
      cols.set([c.r, c.g, c.b], i*3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.95 }));
    m.receiveShadow = true; scene.add(m);
  }

  /* ---------- the controller and the camera ---------- */
  const obstacles = [];
  const mushOb = { pos:V(), r:CAP_R };               // a live obstacle: the cap's edge, only while you are below it
  obstacles.push(mushOb);
  ctrl = kit.orbiter({ radius:R, gravity:7, jump:7.5, speed:4.5, run:7, heightAt, obstacles });
  const rig = kit.rig(camera, ctrl, { dist:8, height:4.5, back:[0, 0, -1] });
  // Walking off the mushroom cap: the orbiter snaps grounded feet to the ground, which would drop you
  // 1.7 m in one frame. Catch that and let you fall instead. Landing on the cap squashes it.
  let squash = 0, squashV = 0;
  const orbUpdate = ctrl.update;
  ctrl.update = (dt, view) => {
    const wasG = ctrl.grounded, before = ctrl.pos.length();
    orbUpdate(dt, view);
    const after = ctrl.pos.length();
    if(wasG && ctrl.grounded && before - after > 0.5){
      ctrl.pos.multiplyScalar(before/after); ctrl.grounded = false;
      kit.astronaut?.root.position.copy(ctrl.pos);
    }
    if(!wasG && ctrl.grounded && after - R > 1.2 && arc(ctrl.up, MUSH) < CAP_R){ squashV += 7; ctx.sound?.boing?.(); }
  };

  /* ---------- ways out: pad and hatch near the spawn, both facing it ---------- */
  kit.wingPad(frame(S.pad.d), 0, 0, 0, { label:'Home' });
  kit.hatch(frame(S.hatch.d), 0, 0, 0, { label:'Station', color:'#7fd6a0' });

  /* ---------- the path: stepping stones down the meridian you face at the spawn ---------- */
  {
    const list = [];
    for(let th = 24; th <= 172; th += 7.5) list.push(dirOf(th, (rnd() - 0.5)*3));
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 9), new THREE.MeshStandardMaterial({ color:'#fff4dc', roughness:0.9 }), list.length);
    const d = new THREE.Object3D();
    list.forEach((up, i) => { stand(d, up, 0.0, rnd()*6); d.scale.set(0.85 + rnd()*0.3, 1, 0.85 + rnd()*0.3); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.receiveShadow = true; scene.add(im);
  }

  /* ---------- scatter: trees, flowers, rocks ---------- */
  const PASTEL = ['#9be3b5', '#ffb3c7', '#c7b3ff', '#ffd1a1', '#a7e0f5'];
  const clear = (d, pad) => SITES.every(s => arc(d, s.d) > s.r + pad);
  const onPath = (d, w) => Math.abs(d.x)*R < w;           // the stepping-stone great circle is the plane x = 0
  const trees = [];
  for(let tries = 0; trees.length < 26 && tries < 800; tries++){
    const d = randDir();
    if(onPath(d, 2.4) || !clear(d, 1.8) || trees.some(q => arc(d, q.d) < 2.6)) continue;
    trees.push({ d, s:0.8 + rnd()*0.5, kind:rnd() < 0.3 ? 1 : 0, color:PASTEL[(rnd()*PASTEL.length) | 0], spin:rnd()*6.3 });
  }
  {
    const trunkG = new THREE.CylinderGeometry(0.14, 0.2, 1.2, 7).translate(0, 0.6, 0);
    const ballG = new THREE.SphereGeometry(0.8, 14, 10).translate(0, 1.75, 0);
    const coneG = new THREE.ConeGeometry(0.72, 1.8, 10).translate(0, 1.95, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness:0.85 });
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color:'#b98a64', roughness:0.9 }), trees.length);
    const nBall = trees.filter(t => !t.kind).length;
    const balls = new THREE.InstancedMesh(ballG, mat, Math.max(1, nBall)), cones = new THREE.InstancedMesh(coneG, mat, Math.max(1, trees.length - nBall));
    balls.count = nBall; cones.count = trees.length - nBall;
    const d = new THREE.Object3D(), c = new THREE.Color();
    let ib = 0, ic = 0;
    trees.forEach((t, i) => {
      stand(d, t.d, -0.05, t.spin); d.scale.setScalar(t.s); d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      const im = t.kind ? cones : balls, k = t.kind ? ic++ : ib++;
      im.setMatrixAt(k, d.matrix); im.setColorAt(k, c.set(t.color));
      obstacles.push({ pos:V().copy(t.d).multiplyScalar(R + baseH(t.d) + 0.6), r:0.22*t.s + 0.05 });   // the trunk
    });
    for(const im of [trunks, balls, cones]){ im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  }
  {
    const list = [];
    for(let tries = 0; list.length < 90 && tries < 900; tries++){ const d = randDir(); if(!onPath(d, 0.8) && clear(d, 0.2)) list.push(d); }
    const gY = stand(new THREE.Object3D(), S.yard.d);
    for(let i = 0; i < 14; i++) list.push(beside(gY, (rnd() - 0.5)*5, -1.4 - rnd()*1.2));   // a flower border behind the garden bed
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 8, 6).scale(1, 0.7, 1).translate(0, 0.12, 0), new THREE.MeshStandardMaterial({ roughness:0.7 }), list.length);
    const FL = ['#ffb3c7', '#fff3a6', '#ffffff', '#d9c2ff', '#ffc9a8'], d = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((up, i) => { stand(d, up, 0, 0); d.scale.setScalar(0.8 + rnd()*0.6); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(FL[(rnd()*FL.length) | 0])); });
    scene.add(im);
  }
  {
    const list = [];
    for(let tries = 0; list.length < 12 && tries < 400; tries++){ const d = randDir(); if(!onPath(d, 1.6) && clear(d, 0.8) && trees.every(t => arc(d, t.d) > 1.5)) list.push({ d, s:0.7 + rnd()*0.7 }); }
    const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.36, 0), new THREE.MeshStandardMaterial({ roughness:0.95, flatShading:true }), list.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((q, i) => {
      stand(d, q.d, 0.08, rnd()*6); d.scale.set(q.s, q.s*0.75, q.s); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      im.setColorAt(i, c.set(['#cfc8e0', '#bfc6dc', '#e2d6cf'][i % 3]));
      obstacles.push({ pos:V().copy(q.d).multiplyScalar(R + baseH(q.d)), r:0.3*q.s });
    });
    im.castShadow = true; scene.add(im);
  }

  /* ---------- crystals: a ring round the south pole plus a few strays ---------- */
  const crystalMat = new THREE.MeshStandardMaterial({ color:'#ffffff', emissive:'#b8a6ff', emissiveIntensity:0.3, roughness:0.25, flatShading:true });
  {
    const spots = [];
    const gS = stand(new THREE.Object3D(), S.south.d);
    for(let i = 0; i < 9; i++){ const a = i/9*Math.PI*2 + 0.2, d = beside(gS, Math.cos(a)*2.5, Math.sin(a)*2.5); if(!onPath(d, 1.3)) spots.push(d); }
    for(let tries = 0; spots.length < 14 && tries < 300; tries++){ const d = randDir(); if(!onPath(d, 1.6) && clear(d, 0.6) && trees.every(t => arc(d, t.d) > 1.6)) spots.push(d); }
    const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0).scale(0.7, 1.9, 0.7).translate(0, 0.42, 0), crystalMat, spots.length*3);
    const CR = ['#a7f0ff', '#ffc2e2', '#d4c2ff'], d = new THREE.Object3D(), part = new THREE.Object3D(), c = new THREE.Color();
    d.add(part);
    let k = 0;
    for(const up of spots){
      stand(d, up, -0.05, rnd()*6);
      for(let j = 0; j < 3; j++){
        const s = j ? 0.55 + rnd()*0.3 : 1 + rnd()*0.3, a = j*2.4 + rnd();
        part.position.set(j ? Math.cos(a)*0.25 : 0, 0, j ? Math.sin(a)*0.25 : 0);
        part.rotation.set(j ? (rnd() - 0.5)*0.9 : 0, 0, j ? (rnd() - 0.5)*0.9 : 0); part.scale.setScalar(s);
        part.updateMatrixWorld(true); im.setMatrixAt(k, part.matrixWorld); im.setColorAt(k, c.set(CR[(rnd()*3) | 0])); k++;
      }
      obstacles.push({ pos:V().copy(up).multiplyScalar(R + baseH(up) + 0.2), r:0.3 });
    }
    im.castShadow = true; scene.add(im);
  }

  /* ---------- planet-1: the south pole, on a little star plinth ---------- */
  const ids = kit.shardsFor('planet');
  {
    const g = frame(S.south.d);
    cyl(g, 0.55, 0.65, 0.22, '#f3eaff', 0, 0.05, 0, 16);
    for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2; box(g, 0.22, 0.2, 0.5, '#ffd166', Math.sin(a)*0.62, 0.05, Math.cos(a)*0.62, 0, a, 0); }
    kit.shard(g, ids[0], 0, 1.2, 0);
  }

  /* ---------- the equator signpost: keep going ---------- */
  {
    const g = sign(S.keep.d, { title:'Keep going', sub:'', lines:['Straight on, all the way round. Something shines at the south pole.'], color:'#7fd6a0', w:2.6, h:1.4 });
    cyl(g, 0.08, 0.08, 0.6, '#b8c0d6', 0, 2.65, -0.08, 8);
    box(g, 0.16, 0.2, 0.8, '#ffd166', 0, 2.8, -0.35);                          // an arrow pointing on, away from the north
    cyl(g, 0, 0.26, 0.4, '#ffd166', 0, 2.8, -0.9, 8, -Math.PI/2, 0, 0);
  }

  /* ---------- the mushroom and planet-2 ---------- */
  const gM = frame(MUSH);
  cyl(gM, 0.32, 0.46, CAP_TOP - CAP_H + 0.1, '#fff4e0', 0, (CAP_TOP - CAP_H + 0.1)/2, 0, 14);
  for(let i = 0; i < 3; i++){ const a = i*2.1; ball(gM, 0.12, '#ffffff', Math.cos(a)*0.4, 0.5 + i*0.35, Math.sin(a)*0.4, 1, 1.3, 1); }
  const capG = new THREE.Group(); capG.position.y = CAP_TOP - CAP_H; gM.add(capG);
  {
    const C = makeBaker(THREE), I = new THREE.Matrix4();
    C.add(new THREE.SphereGeometry(CAP_VR, 26, 10, 0, Math.PI*2, 0, Math.PI/2).scale(1, CAP_H/CAP_VR, 1), '#ff8fa3', I);
    C.add(new THREE.CircleGeometry(CAP_VR, 26).rotateX(Math.PI/2), '#fff1dc', I);
    const n = V(), q = new THREE.Quaternion();
    for(let i = 0; i < 8; i++){
      const al = i ? 0.55 + (i % 2)*0.35 : 0, be = i*0.9;
      const p = V(Math.sin(al)*Math.cos(be)*CAP_VR, Math.cos(al)*CAP_H, Math.sin(al)*Math.sin(be)*CAP_VR);
      n.set(p.x/(CAP_VR*CAP_VR), p.y/(CAP_H*CAP_H), p.z/(CAP_VR*CAP_VR)).normalize();   // the ellipsoid's normal is the gradient of x^2/a^2 + y^2/b^2 + z^2/a^2
      q.setFromUnitVectors(YAX, n);
      C.add(new THREE.SphereGeometry(0.22, 10, 6), '#ffffff', new THREE.Matrix4().compose(p, q, V(1, 0.3, 1)));
    }
    const cap = new THREE.Mesh(C.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.7 }));
    cap.castShadow = true; cap.receiveShadow = true; capG.add(cap);
  }
  kit.shard(gM, ids[1], 0, CAP_TOP + 3.5, 0);

  /* ---------- résumé egg 1: the Second Brain greenhouse ---------- */
  {
    const g = frame(S.brain.d), r = 1.3, L = 3.2;
    box(g, L + 0.5, 0.12, 2*r + 0.4, '#f4efe6', 0, 0.02, 0);
    // a hoop house: a glass half-tube along x, white hoops over it
    GLASS.add(new THREE.CylinderGeometry(r, r, L, 20, 1, true, 0, Math.PI), '#ffffff', M(g, 0, 0.08, 0, 0, 0, Math.PI/2));
    for(const sx of [-1, 1]) GLASS.add(new THREE.CircleGeometry(r, 20, 0, Math.PI), '#ffffff', M(g, sx*L/2, 0.08, 0, 0, Math.PI/2, 0));
    for(let i = 0; i <= 4; i++) B.add(new THREE.TorusGeometry(r + 0.02, 0.05, 6, 20, Math.PI), '#fffaf0', M(g, -L/2 + i*L/4, 0.08, 0, 0, Math.PI/2, 0));
    box(g, 0.9, 1.1, 0.08, '#d6689a', L/2 + 0.02, 0.63, 0, 0, Math.PI/2, 0);      // the door, in the zone's pink
    // inside: pots of pink brain-coral plants
    for(let i = 0; i < 4; i++){
      const x = -1.1 + i*0.73;
      cyl(g, 0.2, 0.15, 0.3, '#e9a27a', x, 0.23, -0.35, 10);
      for(let j = 0; j < 4; j++) ball(g, 0.14 + (j % 2)*0.04, j % 2 ? '#f29cc0' : '#d6689a', x + Math.cos(j*1.6)*0.1, 0.5 + j*0.06, -0.35 + Math.sin(j*1.6)*0.1);
      ball(g, 0.2, '#9be3b5', x, 0.38, 0.45, 1, 0.7, 1);
    }
    obstacles.push({ pos:V().copy(S.brain.d).multiplyScalar(R + 0.8), r:1.55 });
    sign(beside(g, 0, 2.8), { zone:'brain' });
  }

  /* ---------- résumé egg 2: the garden bed (yard) ---------- */
  {
    const g = frame(S.yard.d);
    box(g, 2.8, 0.36, 1.3, '#c68b59', 0, 0.12, 0);
    box(g, 2.6, 0.06, 1.1, '#7a5236', 0, 0.31, 0);
    for(let i = 0; i < 5; i++){
      const x = -1.05 + i*0.52;
      ball(g, 0.19, i % 2 ? '#8fd16a' : '#a6e07d', x, 0.43, 0.25, 1, 0.8, 1);                       // cabbages
      cyl(g, 0.02, 0.02, 0.35, '#6fae4a', x, 0.5, -0.25, 5); ball(g, 0.11, ['#ff8fa3', '#fff3a6', '#d9c2ff'][i % 3], x, 0.7, -0.25, 1, 1.2, 1);   // tulips
    }
    cyl(g, 0.18, 0.2, 0.34, '#7fb8e6', 1.8, 0.17, 0.5, 12);                                           // a watering can
    cyl(g, 0.03, 0.03, 0.5, '#7fb8e6', 2.05, 0.35, 0.5, 6, 0, 0, -0.9);
    obstacles.push({ pos:V().copy(S.yard.d).multiplyScalar(R), r:1.0 });
    sign(beside(g, 0, 2.2), { zone:'yard', h:1.6 });
  }

  /* ---------- résumé egg 3: the empty plot with a flag (now) ---------- */
  {
    const g = frame(S.now.d), zNow = kit.zone('now');
    box(g, 2.4, 0.06, 1.8, '#8a6446', 0, 0.0, 0);
    for(const z of [-0.5, 0, 0.5]) box(g, 2.2, 0.05, 0.12, '#6f4f37', 0, 0.04, z);                  // furrows, nothing planted yet
    for(let i = 0; i <= 6; i++){ const x = -1.4 + i*0.467; box(g, 0.1, 0.5, 0.06, '#fffaf0', x, 0.25, -1.1); }
    for(let i = 1; i <= 3; i++) for(const sx of [-1, 1]) box(g, 0.06, 0.5, 0.1, '#fffaf0', sx*1.4, 0.25, -1.1 + i*0.55);
    box(g, 2.9, 0.06, 0.04, '#fffaf0', 0, 0.35, -1.1);
    cyl(g, 0.04, 0.05, 2.4, '#fffaf0', 1.1, 1.2, -0.7, 8);                                           // the flag
    box(g, 0.9, 0.55, 0.03, zNow?.color || '#f2b705', 1.56, 2.1, -0.7);
    ball(g, 0.1, '#ffffff', 1.56, 2.1, -0.68, 1, 1, 0.3);
    cyl(g, 0.03, 0.03, 0.9, '#b98a64', -0.7, 0.45, 0.2, 6, 0.3, 0, 0.2);                            // a shovel, ready
    box(g, 0.24, 0.3, 0.04, '#9aa3b8', -0.73, 0.05, 0.12, 0.3, 0, 0.2);
    const line = zNow?.bullets.find(b => /empty plot/i.test(b)) ?? zNow?.bullets[0];
    sign(beside(g, 0, 2.2), { zone:'now', lines:line ? [line] : undefined, h:1.6 });
  }

  /* ---------- the baked meshes ---------- */
  const baked = new THREE.Mesh(B.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.8 }));
  baked.castShadow = true; baked.receiveShadow = true; scene.add(baked);
  const glass = new THREE.Mesh(GLASS.geometry(), new THREE.MeshStandardMaterial({ color:'#dff6ff', transparent:true, opacity:0.32, roughness:0.1, side:THREE.DoubleSide, depthWrite:false }));
  glass.renderOrder = 2; scene.add(glass);

  /* ---------- the sky: clouds, and a tiny moon on a tilted orbit ---------- */
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:1 }), 36);
  {
    const d = new THREE.Object3D(), part = new THREE.Object3D(); d.add(part);
    for(let i = 0; i < 12; i++){
      const up = randDir(); kit.tangent(XAX, up, tf); kit.orient(d, up, tf); d.position.copy(up).multiplyScalar(30 + rnd()*3);
      for(let j = 0; j < 3; j++){ part.position.set((j - 1)*1.3, (j === 1 ? 0.3 : 0), 0); part.scale.set(1.3 - Math.abs(j - 1)*0.35, 0.8, 1); part.scale.multiplyScalar(0.9 + rnd()*0.5); d.updateMatrixWorld(true); clouds.setMatrixAt(i*3 + j, part.matrixWorld); }
    }
  }
  scene.add(clouds);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color:'#f3e3ff', roughness:0.9, flatShading:true }));
  scene.add(moon);

  /* ---------- per frame ---------- */
  const side = V();
  function update(dt, t){
    const P = ctrl.pos, U = ctrl.up;
    // it is always day where you stand: the sun and the sky fill follow you round the planet
    kit.tangent(XAX, U, side);
    sun.position.copy(P).addScaledVector(U, 16).addScaledVector(side, 7); sun.target.position.copy(P);
    if(hemi) hemi.position.copy(U);
    const a = t*0.12; moon.position.set(Math.cos(a)*40, Math.sin(a)*14, Math.sin(a)*38); moon.rotation.y = t*0.3;
    clouds.rotation.y = t*0.015;
    crystalMat.emissiveIntensity = 0.28 + Math.sin(t*2.2)*0.12;
    // the cap's edge pushes you away while your feet are below its rim; above it, you can land on top
    const feet = P.length() - R;
    if(feet < capAt(CAP_R) - 0.2){ mushOb.pos.copy(MUSH).multiplyScalar(R + feet); mushOb.r = CAP_R; }
    else { mushOb.pos.set(0, 0, 0); mushOb.r = 0; }
    squashV += (-90*squash - 9*squashV)*dt; squash += squashV*dt;              // a damped spring
    const q = clamp(squash*0.06, -0.25, 0.25);
    capG.scale.set(1 + q*0.6, 1 - q, 1 + q*0.6);
  }

  return {
    title:'Tiny Planet', scene, camera, rig, update,
    spawn:{ x:0, y:R, z:0, yaw:0 },
    hint:'<kbd>WASD</kbd> walk · <kbd>Space</kbd> big jump · <kbd>Shift</kbd> run · straight on goes all the way round · <kbd>V</kbd> first person · <kbd>Esc</kbd> station',
    onEnter(){ rig.view.back.set(0, 0, -1); squash = squashV = 0; },
  };
}
