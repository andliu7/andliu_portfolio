// Interior for "yard" (Off the Clock): the rest of the week, one room each for cooking, lifting and
// gardening. A farmhouse kitchen under open trusses where four tosses of the pan put dinner on the
// plate, a sawtooth-roofed home gym where you load plates and the lifter squats the bar, and a
// glasshouse with raised beds to water and a landscape model that redesigns itself. A friend in every
// room reacts: the diner hops for dinner, the spotter for each rep, the gardener for the flowers.
// Built on tour() from clinic.js. Facts come only from zones.js.
import { tour, prng } from './clinic.js';

// the dialog box when dialog.js is loaded; resolves at once without it
const talk = (ctx, o) => { try { return Promise.resolve(ctx.modules.dialog?.say?.(o)); } catch(e){ return Promise.resolve(); } };
const clamp01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
const ease = k => { k = clamp01(k); return k*k*(3 - 2*k); };
const backOut = k => { k = clamp01(k) - 1; return 1 + 2.7*k*k*k + 1.7*k*k; };
// objects flying along an arc to a world point (they live straight in the room scene, so local = world)
function arcTo(jobs, obj, to, dur, arc, done){ jobs.push({ obj, a:obj.position.clone(), b:to.clone(), t:0, dur, arc, done }); }
function stepArcs(jobs, dt){
  for(let i = jobs.length - 1; i >= 0; i--){
    const j = jobs[i]; j.t = Math.min(1, j.t + dt/j.dur);
    j.obj.position.lerpVectors(j.a, j.b, ease(j.t)); j.obj.position.y += Math.sin(j.t*Math.PI)*j.arc;
    if(j.t >= 1){ jobs.splice(i, 1); j.done?.(); }
  }
}
// steam: one instanced mesh of puffs that swell and fade (a single draw call)
function puffs(THREE, scene, n){
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0.5, depthWrite:false, toneMapped:false }), n);
  m.frustumCulled = false; scene.add(m);   // instances roam far from the geometry's own bounds
  const P = Array.from({ length:n }, () => ({ life:0, x:0, y:-9, z:0 })), o = new THREE.Object3D();
  const spawn = (x, y, z) => { const p = P.find(q => q.life <= 0); if(p){ p.life = 1; p.x = x; p.y = y; p.z = z; } };
  const step = (dt, t) => {
    P.forEach((p, i) => {
      if(p.life > 0){ p.life -= dt*0.75; p.y += dt*0.8; p.x += Math.sin(t*2 + i)*dt*0.15; }
      o.position.set(p.x, p.y, p.z); o.scale.setScalar(p.life > 0 ? Math.sin(p.life*Math.PI)*(1.6 - p.life*0.6) : 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  step(0, 0);
  return { spawn, step };
}

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg:'#1d2b1a', bgTop:'#44603a', seed:31, dark:'#6b4a33', hemi:1.2, sunColor:'#fff2d6',
    rooms: [
      { key:'kitchen', name:'Kitchen', w:13, tall:4.2, roof:'truss', rise:2.3, trussTo:-0.6, view:'garden', floorKind:'checker', floor:'#f6ecd8', floorLine:'#ead2b2', wall:'#fdf6e6', wall2:'#f6e2c0', wallKind:'stripes', trim:'#f1d7b0', dark:'#8a5a3c', beam:'#a8744c',
        build(K, r){ kitchen(K, r, ctx); } },
      { key:'gym', name:'Home Gym', w:11, tall:4.0, roof:'sawtooth', rise:1.4, floorKind:'rubber', floor:'#3c4250', floorLine:'#2f3542', wall:'#e3e8ec', wall2:'#d3dbe1', wallKind:'brick', trim:'#c9d2da', dark:'#2f3542', beam:'#4a5163',
        build(K, r){ gym(K, r, ctx); } },
      { key:'garden', name:'Garden Studio', w:13, tall:4.6, roof:'glass', glassWall:'garden', frame:'#fffaf0', floorKind:'tiles', floor:'#d9a47a', floorLine:'#c48c62', wall:'#eef6e4', wall2:'#e0eed2', wallKind:'dots', trim:'#cfe3bb', dark:'#4f7a34',
        build(K, r){ garden(K, r, ctx); } },
    ],
  });
}

// ---------- 1. Kitchen: toss the pan four times and dinner lands on the plate ----------
function kitchen(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx, BZ = -D/2, CZ = BZ + 0.6;
  // counter run along the back wall: cabinets, a green worktop, a sink under the window
  K.box(9, 0.95, 1.1, '#fffaf0', cx - 1.5, 0.475, CZ); K.box(9.1, 0.08, 1.2, '#6fae4a', cx - 1.5, 0.99, CZ);
  for(let i=0;i<6;i++){ K.box(1.36, 0.72, 0.03, '#f4e3c6', cx - 5.25 + i*1.5, 0.47, CZ + 0.56); K.box(0.22, 0.05, 0.04, '#8a5a3c', cx - 5.25 + i*1.5, 0.76, CZ + 0.59); }
  K.solid(cx - 1.5, CZ, 4.55, 0.6);
  K.box(1.0, 0.03, 0.6, '#9aa3b8', cx - 4.4, 1.04, CZ);
  K.cyl(0.03, 0.03, 0.42, '#c9d2da', cx - 4.4, 1.24, CZ - 0.34, S, 8); K.box(0.05, 0.05, 0.32, '#c9d2da', cx - 4.4, 1.44, CZ - 0.2);
  K.win(cx - 4.4, 2.35, BZ + 0.02, 0, 2.0, 1.3, { kind:'garden', frame:'#fffaf0', cols:2, beamTo:[cx - 3.8, BZ + 4.6], beamR:[0.5, 0.9], beamOpacity:0.14 });
  // jars and a bread board at the right end of the counter
  ['#f2b705', '#e5484d', '#6fae4a', '#e98a5a'].forEach((c, i) => { K.cyl(0.11, 0.11, 0.26, '#fffaf0', cx + 1.9 + i*0.3, 1.16, CZ - 0.2, S, 12); K.cyl(0.09, 0.09, 0.14, c, cx + 1.9 + i*0.3, 1.13, CZ - 0.2, S, 12); K.cyl(0.12, 0.12, 0.05, '#8a5a3c', cx + 1.9 + i*0.3, 1.31, CZ - 0.2, S, 12); });
  // the range: black top, oven door, knobs, hood
  const SX = cx - 1.2;
  K.box(1.8, 0.05, 1.1, '#1f2a44', SX, 1.055, CZ);
  K.box(1.5, 0.55, 0.04, '#2a2a33', SX, 0.5, CZ + 0.57); K.box(1.0, 0.24, 0.02, '#e98a5a', SX, 0.52, CZ + 0.6);
  for(let i=0;i<4;i++){ const k = K.cyl(0.05, 0.05, 0.05, '#e5484d', SX - 0.45 + i*0.3, 0.88, CZ + 0.58, S, 10); k.rotation.x = Math.PI/2; }
  K.box(2.0, 0.45, 1.0, '#dfe7ea', SX, 2.75, CZ - 0.05); K.box(0.7, 1.0, 0.5, '#dfe7ea', SX, 3.45, BZ + 0.3);
  const ring = new THREE.TorusGeometry(0.17, 0.035, 6, 20);
  for(const [bx, bz] of [[0.42, -0.24], [-0.42, 0.24]]){ const b = H.mesh(ring, '#3a3f52', SX + bx, 1.085, CZ + bz, S); b.rotation.x = -Math.PI/2; }
  const potRing = H.mesh(ring, new THREE.MeshBasicMaterial({ color:'#ff9a4a', toneMapped:false }), SX - 0.42, 1.085, CZ - 0.24, S); potRing.rotation.x = -Math.PI/2;
  // the pot simmers on the back burner by itself
  K.cyl(0.3, 0.27, 0.4, '#e5484d', SX - 0.42, 1.28, CZ - 0.24, S, 20); for(const s of [-1, 1]) K.box(0.12, 0.05, 0.07, '#1f2a44', SX - 0.42 + s*0.35, 1.41, CZ - 0.24);
  const lid = new THREE.Group(); lid.position.set(SX - 0.42, 1.5, CZ - 0.24); scene.add(lid);
  H.cyl(0.32, 0.32, 0.04, '#c93c3c', 0, 0, 0, lid, 20); H.ball(0.05, '#1f2a44', 0, 0.05, 0, lid, 8);
  const steam = puffs(THREE, scene, 10);

  // the pan on the front burner, with eight chunky bits of dinner in it
  const PX = SX + 0.42, PZ = CZ + 0.24, PY = 1.1;
  const flameMat = new THREE.MeshBasicMaterial({ color:'#3a3f52', toneMapped:false });
  const flame = H.mesh(ring.clone(), flameMat, PX, 1.085, PZ, scene); flame.rotation.x = -Math.PI/2;
  const pan = new THREE.Group(); pan.position.set(PX, PY, PZ); scene.add(pan);
  H.cyl(0.4, 0.33, 0.1, '#2a2a33', 0, 0.05, 0, pan, 22); H.cyl(0.35, 0.35, 0.01, '#4a4f5c', 0, 0.105, 0, pan, 22);
  const grip = H.box(0.08, 0.06, 0.62, '#8a5a3c', 0.16, 0.09, 0.66, pan); grip.rotation.y = 0.25;
  const FOOD = [['box', '#e5484d'], ['box', '#6fae4a'], ['ball', '#ffd166'], ['disc', '#f28c28'], ['box', '#f2b705'], ['ball', '#8a5a3c'], ['disc', '#6fae4a'], ['ball', '#e5484d']];
  const bits = FOOD.map(([k, c], i) => {
    const m = k === 'box' ? H.box(0.1, 0.07, 0.1, c, 0, 0, 0, scene) : k === 'ball' ? H.ball(0.06, c, 0, 0, 0, scene, 10) : H.cyl(0.07, 0.07, 0.035, c, 0, 0, 0, scene, 12);
    const a = i/FOOD.length*Math.PI*2, rr = 0.08 + (i % 3)*0.08;
    return { m, ox:Math.cos(a)*rr, oz:Math.sin(a)*rr, st:'pan', y:0, vy:0, spin:0 };
  });

  // the island with the plate, stools and a hungry friend
  const IX = cx + 0.4, IZ = -1.5, PLX = IX - 0.5, PLY = 1.07;
  K.box(3.0, 0.9, 1.2, '#6fae4a', IX, 0.45, IZ); K.box(3.2, 0.1, 1.4, '#c99a6b', IX, 0.95, IZ); K.solid(IX, IZ, 1.6, 0.7);
  K.cyl(0.4, 0.33, 0.05, '#fffaf0', PLX, 1.03, IZ, S, 24); K.cyl(0.3, 0.3, 0.012, '#f3ead6', PLX, 1.06, IZ, S, 24);
  K.cyl(0.26, 0.18, 0.14, '#4fa3c7', IX + 0.9, 1.07, IZ, S, 16); ['#e5484d', '#ffd166', '#6fae4a'].forEach((c, i) => H.ball(0.09, c, IX + 0.84 + i*0.07, 1.18 + (i%2)*0.04, IZ - 0.05 + (i%2)*0.1, S, 10));
  for(const s of [-1, 0, 1]){ const x = IX + s*0.95; K.cyl(0.24, 0.24, 0.07, '#e98a5a', x, 0.78, IZ + 1.05, S, 14); K.cyl(0.04, 0.04, 0.76, '#1f2a44', x, 0.38, IZ + 1.05, S, 6); K.round(x, IZ + 1.05, 0.3); }
  const pal = K.buddy(scene, '#ffd166', IX + 0.95, IZ + 1.05, Math.PI, 0.8); pal.position.y = 0.76;
  K.pendant(IX + 0.9, K.WALL + 0.8, IZ + 0.1, '#6fae4a', '#ffe2a8', { drop:1.3, r:0.34 });
  K.pendant(cx - 4.4, K.WALL + 0.8, CZ + 0.9, '#e98a5a', '#ffe2a8', { drop:1.1, r:0.28, poolR:1.6 });
  // fridge with magnets
  K.box(1.2, 2.4, 1.1, '#f5f7fa', cx + 5.4, 1.2, BZ + 0.6); K.box(1.21, 0.03, 1.11, '#dfe7ea', cx + 5.4, 1.55, BZ + 0.6);
  K.box(0.05, 0.5, 0.06, '#9aa3b8', cx + 4.9, 1.95, BZ + 1.18); K.box(0.05, 0.4, 0.06, '#9aa3b8', cx + 4.9, 1.2, BZ + 1.18);
  ['#e5484d', '#4fa3c7', '#f2b705', '#6fae4a'].forEach((c, i) => K.box(0.12, 0.12, 0.03, c, cx + 5.25 + (i%2)*0.3, 1.9 + (i>>1)*0.25, BZ + 1.17));
  K.solid(cx + 5.4, BZ + 0.6, 0.6, 0.6);
  K.info(cx + 3.8, BZ + 0.08, { y:2.1, w:1.7, h:1.0, padZ:2.8 });

  // the chalkboard counts the tosses
  const NEED = 4;
  let tosses = 0, plated = false, plating = false, tossT = -1, heat = 0, cheer = 0, fed = false;
  const board = K.panel(scene, cx + 0.95, 2.2, BZ + 0.08, 1.4, 1.0, (g, w, h) => {
    g.fillStyle = '#2f3b33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fffaf0'; g.textAlign = 'center'; g.textBaseline = 'middle'; H.F(g, 700, 30); g.fillText('THE PAN', w/2, 30);
    for(let i=0;i<NEED;i++){ g.beginPath(); g.arc(w/2 + (i - (NEED - 1)/2)*46, h*0.5, 15, 0, 7); g.fillStyle = plated || i < tosses ? '#ffd166' : '#ffffff22'; g.fill(); }
    H.F(g, 600, 21, 'Nunito'); g.fillStyle = plated ? '#b5e48c' : '#fffaf0cc'; g.fillText(plated ? 'Dinner is up!' : `Toss it ${NEED} times`, w/2, h - 26);
  }, { frame:'#8a5a3c', px:160 });

  const V = new THREE.Vector3(), jobs = [];
  const panSpot = (b, out) => out.set(pan.position.x + b.ox, pan.position.y + 0.14, pan.position.z + b.oz);
  function toss(){
    if(plating || jobs.length || (tossT >= 0 && tossT < 0.6)) return false;
    heat = 1;
    if(plated){   // scoop dinner back into the pan and start over
      plated = false; tosses = 0; board.redraw();
      bits.forEach((b, i) => { b.st = 'fly'; arcTo(jobs, b.m, panSpot(b, V), 0.55 + i*0.05, 0.9, () => { b.st = 'pan'; }); });
      K.sfx('clink', 0.4); return true;
    }
    tossT = 0; tosses++; board.redraw();
    bits.forEach(b => { b.st = 'air'; b.y = 0; b.vy = 2.7 + Math.random()*1.1; b.spin = (Math.random() - 0.5)*16; });
    K.sfx('clink', 0.5); K.tone(170, 0.3, 'sawtooth', 0.025, 110);
    return true;
  }
  function plate(){
    plating = true;
    bits.forEach((b, i) => { b.st = 'fly'; V.set(PLX + b.ox*0.9, PLY + 0.05, IZ + b.oz*0.9); arcTo(jobs, b.m, V, 0.7 + i*0.06, 1.3, () => {
      b.st = 'plate'; b.m.rotation.set(0, b.m.rotation.y, 0);
      if(i === bits.length - 1){
        plating = false; plated = true; board.redraw(); cheer = 3;
        K.say(pal, 'Smells great!', { pitch:640, y:1.4 }); K.tone(660, 0.12, 'sine', 0.08); setTimeout(() => K.tone(990, 0.2, 'sine', 0.08), 120);
        if(!fed){ fed = true; talk(ctx, { name:'Off the Clock', portrait:'blob', color:'#6fae4a', lines:['Dinner is up.', 'Cooking, lifting and gardening: that is the rest of the week.'] }); }
      }
    }); });
  }
  K.hot({ x:PX, z:CZ + 1.9, label:'Toss the pan', obj:pan, use(){ toss(); } });

  K.tick((dt, t) => {
    // pan flick: tip the far edge up and jerk back toward the handle
    if(tossT >= 0){
      tossT += dt; const k = Math.min(1, tossT/0.32), s = Math.sin(k*Math.PI);
      pan.rotation.x = s*0.38; pan.position.z = PZ + s*0.1; pan.position.y = PY + s*0.05;
      if(tossT > 0.9 && tosses >= NEED && !plating && bits.every(b => b.st === 'pan')){ tossT = -1; plate(); }
      else if(tossT > 1.2) tossT = -1;
    }
    for(const b of bits){
      if(b.st === 'air'){
        b.vy -= 13*dt; b.y += b.vy*dt; b.m.rotation.x += b.spin*dt; b.m.rotation.z += b.spin*0.7*dt;
        if(b.y <= 0 && b.vy < 0){ b.y = 0; b.st = 'pan'; b.m.rotation.set(0, b.m.rotation.y, 0); }
        panSpot(b, b.m.position); b.m.position.y += b.y;
      } else if(b.st === 'pan') panSpot(b, b.m.position);
    }
    stepArcs(jobs, dt);
    // heat: the ring glows while cooking and the pan steams
    heat = Math.max(0, heat - dt*0.07);
    flameMat.color.setRGB(0.23 + heat*0.77, 0.25 + heat*0.35, 0.32 - heat*0.2);
    if(Math.random() < dt*1.6) steam.spawn(lid.position.x + (Math.random() - 0.5)*0.2, 1.62, lid.position.z);
    if(heat > 0.2 && Math.random() < dt*4*heat) steam.spawn(PX + (Math.random() - 0.5)*0.3, 1.3, PZ);
    steam.step(dt, t);
    lid.position.y = 1.5 + Math.abs(Math.sin(t*11))*0.015; lid.rotation.z = Math.sin(t*7)*0.02;
    // the friend turns round and hops when dinner lands
    cheer = Math.max(0, cheer - dt);
    pal.rotation.y = H.lerpAngle(pal.rotation.y, cheer > 0 ? 0 : Math.PI, Math.min(1, dt*6));
    pal.position.y = 0.76 + (cheer > 0 ? Math.abs(Math.sin(t*9))*0.18 : Math.abs(Math.sin(t*2))*0.02);
  });
  K.stop('The kitchen', 'Off the Clock is the rest of the week: cooking, lifting and gardening. Stand at the stove and press F to toss the pan. Four tosses and dinner lands on the plate.', [PX, 2.6, PZ + 0.3]);
  K.stop('Dinner is up', 'The plate on the island is where the pan ends up. Press F at the stove once more to scoop it back and cook again.', [PLX, 2.0, IZ]);
}

// ---------- 2. Home gym: load plates from the tree, the lifter squats the bar ----------
function gym(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx, BZ = -D/2;
  const RX = cx - 1.4, RZ = -3.3;
  // a wood lifting platform set into the rubber
  K.box(3.6, 0.04, 2.8, '#2f3542', RX, 0.02, RZ + 0.4).castShadow = false; K.box(1.9, 0.05, 2.8, '#c99a6b', RX, 0.025, RZ + 0.4).castShadow = false;
  // the rack: four uprights, crossbars, a pull-up bar, J-hooks and safety arms
  for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.box(0.12, 2.7, 0.12, '#e5484d', RX + sx*1.1, 1.35, RZ + sz*0.45);
  for(const sz of [-1, 1]) K.box(2.32, 0.12, 0.12, '#e5484d', RX, 2.7, RZ + sz*0.45);
  for(const sx of [-1, 1]){ K.box(0.12, 0.12, 1.02, '#e5484d', RX + sx*1.1, 2.7, RZ); K.box(0.1, 0.08, 1.2, '#9aa3b8', RX + sx*1.02, 0.75, RZ + 0.1); K.box(0.1, 0.14, 0.14, '#1f2a44', RX + sx*1.1, 1.42, RZ + 0.55); }
  K.cyl(0.03, 0.03, 2.4, '#c9d2da', RX, 2.82, RZ + 0.45, S, 8).rotation.z = Math.PI/2;
  K.solid(RX, RZ, 1.25, 0.6);
  // the bar sits in the hooks; a lifter stands under it
  const bar = new THREE.Group(); bar.position.set(RX, 1.5, RZ + 0.55); scene.add(bar);
  H.cyl(0.03, 0.03, 2.5, '#c9d2da', 0, 0, 0, bar, 8).rotation.z = Math.PI/2;
  for(const s of [-1, 1]){ H.cyl(0.05, 0.05, 0.46, '#9aa3b8', s*1.02, 0, 0, bar, 12).rotation.z = Math.PI/2; H.cyl(0.07, 0.07, 0.05, '#1f2a44', s*0.78, 0, 0, bar, 12).rotation.z = Math.PI/2; }
  const lifter = K.buddy(scene, '#ffd166', RX, RZ + 0.68, 0, 1.2);
  for(const s of [-1, 1]){ const a = H.cyl(0.07, 0.07, 0.5, '#ffd166', s*0.4, 1.05, -0.05, lifter, 8); a.rotation.z = s*0.5; }
  K.round(RX, RZ + 0.68, 0.45);

  // the plate tree: three pairs, big to small
  const TX = RX + 2.9, TZ = RZ + 0.1, PL = [[0.42, '#e5484d'], [0.36, '#4fa3c7'], [0.3, '#f2b705']];
  K.cyl(0.4, 0.45, 0.08, '#1f2a44', TX, 0.04, TZ, S, 20); K.cyl(0.06, 0.06, 1.8, '#1f2a44', TX, 0.9, TZ, S, 10);
  for(let k=0;k<3;k++) K.box(0.9, 0.05, 0.05, '#9aa3b8', TX, 1.45 - k*0.45, TZ);
  K.round(TX, TZ, 0.55);
  const plates = [];
  PL.forEach(([rad, c], k) => { for(const s of [-1, 1]){
    const m = H.cyl(rad, rad, 0.07, c, TX + s*0.3, 1.45 - k*0.45, TZ, scene, 22); m.rotation.z = Math.PI/2;
    plates.push({ m, k, s, home:m.position.clone(), slot:new THREE.Vector3(s*(0.88 + k*0.085), 0, 0) });
  } });
  let loaded = 0, moving = 0, lift = -1, dur = 1.2, reps = 0, told = false;
  const jobs = [], V = new THREE.Vector3();
  const counter = K.panel(scene, RX, 3.35, BZ + 0.08, 1.9, 0.8, (g, w, h) => {
    g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.textBaseline = 'middle';
    g.fillStyle = '#ffd166'; H.F(g, 700, 22); g.textAlign = 'left'; g.fillText('REPS', 18, 26);
    g.fillStyle = '#ffffff'; H.F(g, 700, 50); g.fillText(String(reps), 18, h*0.64);
    g.fillStyle = '#ffd166'; H.F(g, 700, 22); g.textAlign = 'right'; g.fillText('PLATES', w - 18, 26);
    PL.forEach(([rad, c], k) => { g.fillStyle = k < loaded ? c : '#ffffff22'; g.beginPath(); g.arc(w - 36 - k*44, h*0.64, 10 + rad*30, 0, 7); g.fill(); });
  }, { frame:'#e5484d', px:120 });

  function load(){
    if(lift >= 0 || moving) return false;
    if(loaded < 3){
      const pair = plates.filter(p => p.k === loaded); loaded++; moving = pair.length;
      pair.forEach((p, i) => { bar.updateMatrixWorld(); arcTo(jobs, p.m, bar.localToWorld(V.copy(p.slot)), 0.55 + i*0.08, 0.8, () => { bar.attach(p.m); p.m.position.copy(p.slot); moving--; K.sfx('clink', 0.6); if(!moving) counter.redraw(); }); });
      K.tone(300 + loaded*80, 0.1, 'triangle', 0.06);
    } else {   // all three pairs on: strip the bar back to the tree
      loaded = 0; moving = plates.length; counter.redraw();
      plates.forEach((p, i) => { scene.attach(p.m); arcTo(jobs, p.m, p.home, 0.5 + i*0.06, 0.7, () => { p.m.rotation.set(0, 0, Math.PI/2); moving--; }); });
      K.say(lifter, 'Stripped. Back to the bar.', { pitch:600, y:1.4 });
    }
    return true;
  }
  function start(){ if(lift >= 0 || moving) return false; lift = 0; dur = (1.2 + loaded*0.45)*(chalked ? 0.8 : 1); K.tone(220, 0.2, 'triangle', 0.05, 180); return true; }
  K.hot({ x:TX, z:TZ + 1.9, label:'Load a plate', obj:plates[0].m, use(){ load(); } });
  K.hot({ x:RX, z:RZ + 2.3, label:'Lift the bar', obj:bar, use(){ start(); } });

  K.tick((dt, t) => {
    stepArcs(jobs, dt);
    let dip = 0;
    if(lift >= 0){
      lift += dt/dur;
      const out = ease(lift/0.15)*(1 - ease((lift - 0.85)/0.15));     // walk the bar out of the hooks and back
      dip = lift > 0.15 && lift < 0.85 ? Math.sin((lift - 0.15)/0.7*Math.PI) : 0;
      bar.position.y = 1.5 - out*0.12 - dip*0.42; bar.position.z = RZ + 0.55 + out*0.18;
      bar.rotation.z = dip*Math.sin(t*22)*0.012*loaded;
      lifter.position.z = RZ + 0.68 + out*0.18;
      if(lift >= 1){
        lift = -1; reps++; counter.redraw(); K.sfx('thud', 0.35 + loaded*0.15); bar.rotation.z = 0; chalked = false; spotCheer = 1.2;
        K.say(lifter, ['Up!', 'Another one.', 'Heavier, still up!', 'That one moved slow.'][Math.min(3, loaded)], { pitch:560 + loaded*30, y:1.5 });
        if(!told){ told = true; talk(ctx, { name:'Home Gym', portrait:'blob', color:'#ffd166', lines:['One rep down.', 'Load more plates at the tree and every rep gets slower.'] }); }
      }
    }
    lifter.scale.set(1.2*(1 + dip*0.1), 1.2*(1 - dip*0.28), 1.2*(1 + dip*0.1));
    if(lift < 0) lifter.position.y = Math.abs(Math.sin(t*1.6))*0.015;
  });

  // dumbbell rack and mirror on the right, bench, kettlebells and a chalk bowl
  K.panel(scene, cx + 3.2, 2.1, BZ + 0.08, 2.6, 1.6, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8f6fb'); gr.addColorStop(1, '#b8d8e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff88'; g.beginPath(); g.moveTo(w*0.2, 0); g.lineTo(w*0.34, 0); g.lineTo(w*0.1, h); g.lineTo(0, h); g.closePath(); g.fill(); }, { frame:'#9aa3b8' });
  K.box(2.6, 0.5, 0.6, '#3a3f52', cx + 3.2, 0.5, BZ + 0.6); K.solid(cx + 3.2, BZ + 0.6, 1.35, 0.35);
  for(let i=0;i<5;i++){ const dx = cx + 2.2 + i*0.5, rr = 0.07 + i*0.012; K.cyl(0.03, 0.03, 0.34, '#c9d2da', dx, 0.84, BZ + 0.6, S, 6).rotation.x = Math.PI/2; for(const s of [-1, 1]) K.cyl(rr, rr, 0.08, ['#e5484d', '#4fa3c7', '#f2b705', '#6fae4a', '#1f2a44'][i], dx, 0.84, BZ + 0.6 + s*0.16, S, 10).rotation.x = Math.PI/2; }
  K.box(0.6, 0.12, 1.7, '#1f2a44', cx + 3.2, 0.55, -1.2); for(const z of [-1.8, -0.6]) K.box(0.1, 0.5, 0.1, '#9aa3b8', cx + 3.2, 0.25, z); K.solid(cx + 3.2, -1.2, 0.35, 0.9);
  for(let i=0;i<3;i++){ const x = cx - 4.6 + i*0.55, rr = 0.17 + i*0.03; K.cyl(rr, rr*0.9, rr*1.6, '#3a3f52', x, rr*0.8, BZ + 0.7, S, 12); H.mesh(new THREE.TorusGeometry(rr*0.55, 0.035, 6, 14, Math.PI), '#3a3f52', x, rr*1.6, BZ + 0.7, S); }
  K.solid(cx - 4.05, BZ + 0.7, 0.9, 0.3);
  K.cyl(0.05, 0.05, 0.9, '#9aa3b8', RX - 1.9, 0.45, RZ + 1.1, S, 8); K.cyl(0.26, 0.2, 0.16, '#fffaf0', RX - 1.9, 0.96, RZ + 1.1, S, 16); K.round(RX - 1.9, RZ + 1.1, 0.3);
  K.cyl(0.1, 0.1, 0.36, '#4fa3c7', cx + 1.9, 0.18, -0.6, S, 10);

  // the chalk bowl: chalk up and a white cloud puffs out; the next rep goes up a little quicker
  const chalk = puffs(THREE, scene, 14), bowl = new THREE.Group(); bowl.position.set(RX - 1.9, 1.04, RZ + 1.1); scene.add(bowl);
  H.cyl(0.22, 0.2, 0.06, '#f4f4f0', 0, 0, 0, bowl, 16);
  let chalked = false;
  K.hot({ x:RX - 1.9, z:RZ + 2.4, label:'Chalk up', obj:bowl, use(){
    for(let i=0;i<10;i++) chalk.spawn(RX - 1.9 + (Math.random() - 0.5)*0.5, 1.1 + Math.random()*0.2, RZ + 1.1 + (Math.random() - 0.5)*0.5);
    K.tone(900, 0.18, 'sine', 0.03, 400);
    if(!chalked){ chalked = true; K.say(spotter, 'Good grip. Go lift!', { pitch:640, y:1.4 }); }
  } });
  // a spotter beside the rack who hops every time the bar comes back up
  const spotter = K.buddy(scene, '#6fae4a', RX - 1.2, RZ + 1.6, 1.5, 0.9); K.round(RX - 1.2, RZ + 1.6, 0.35);
  let spotCheer = 0;
  K.tick((dt, t) => {
    chalk.step(dt, t);
    spotCheer = Math.max(0, spotCheer - dt);
    spotter.position.y = spotCheer > 0 ? Math.abs(Math.sin(spotCheer*9))*0.28 : Math.abs(Math.sin(t*2.2))*0.02;
    spotter.rotation.y = 1.5 + (lift >= 0 ? Math.sin(t*6)*0.12 : 0);
  });
  K.stop('Home gym', 'Lifting is part of the rest of the week. Press F at the plate tree to load a pair, then F at the rack and the lifter squats it. More plates, slower reps.', [RX, 3.0, RZ + 0.3]);
  K.stop('Chalk and a spotter', 'Press F at the chalk bowl for a white puff and a better grip: the next rep goes up quicker, and the spotter hops every time the bar comes back up.', [RX - 1.9, 2.2, RZ + 1.1]);
}

// ---------- 3. Garden studio: raised beds to water, and a landscape model that redesigns itself ----------
function garden(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  const o = new THREE.Object3D(), M = new THREE.Matrix4(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
  // three raised beds; the plants are instanced (stems, leaves, flowers: three draw calls)
  const BEDZ = -2.6, beds = [cx - 4.6, cx - 2.8, cx - 1.0];
  for(const bx of beds){ K.box(1.5, 0.5, 2.4, '#b98a5a', bx, 0.25, BEDZ); K.box(1.3, 0.06, 2.2, '#6b4a33', bx, 0.5, BEDZ); for(const s of [-1, 1]) K.box(1.56, 0.08, 0.08, '#8a5a3c', bx, 0.5, BEDZ + s*1.2); }
  K.solid(cx - 2.8, BEDZ, 2.6, 1.22);
  const spots = []; beds.forEach(bx => { for(const dz of [-0.5, 0.5]) for(const dx of [-0.33, 0.33]) spots.push([bx + dx, BEDZ + dz]); });
  const inst = (geo, n) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness:0.8 }), n); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const stems = inst(new THREE.CylinderGeometry(0.03, 0.035, 0.4, 5).translate(0, 0.2, 0), spots.length);
  const leaves = inst(new THREE.SphereGeometry(0.2, 10, 8).scale(1, 0.75, 1).translate(0, 0.42, 0), spots.length);
  const blooms = inst(new THREE.SphereGeometry(0.1, 8, 6).translate(0.05, 0.6, 0.05), spots.length);
  const C = new THREE.Color();
  spots.forEach((_, i) => { stems.setColorAt(i, C.set('#4a7a30')); leaves.setColorAt(i, C.set(['#6fae4a', '#7fbf57', '#5a9a3c'][i % 3])); blooms.setColorAt(i, C.set(['#ff8fab', '#ffd166', '#bdb2ff', '#ff9f68'][i % 4])); });
  const plants = spots.map(() => ({ s:0.45, to:0.45 }));
  let grown = 0, water = 0;
  // the can flies over the beds and pours; drops are one instanced mesh
  const can = new THREE.Group(); scene.add(can);
  H.cyl(0.26, 0.3, 0.5, '#4fa3c7', 0, 0.25, 0, can, 16); const sp = H.cyl(0.03, 0.05, 0.5, '#4fa3c7', 0.36, 0.42, 0, can, 6); sp.rotation.z = -0.9;
  H.mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 14, Math.PI), '#4fa3c7', 0, 0.5, 0, can);
  const CAN0 = new THREE.Vector3(cx - 0.2, 0, 0.9), CANUP = new THREE.Vector3(cx - 3.2, 1.7, BEDZ + 0.2);
  can.position.copy(CAN0); K.round(CAN0.x, CAN0.z, 0.35);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshBasicMaterial({ color:'#7cc6ff', toneMapped:false }), 24);
  drops.frustumCulled = false; scene.add(drops);   // drops roam far from the geometry's own bounds
  for(let i=0;i<24;i++) drops.setMatrixAt(i, Z0);
  const D8 = Array.from({ length:24 }, () => ({ on:false, x:0, y:0, z:0, v:0 }));
  const jobs = [];
  function waterBeds(){
    if(jobs.length || water > 0) return false;
    grown = (grown + 1) % 4;
    if(grown === 0){ plants.forEach(p => p.to = 0.45); K.say([cx - 2.8, 1.6, BEDZ], 'Harvested. Fresh seedlings in.', { pitch:620 }); K.tone(880, 0.15, 'sine', 0.08); return true; }
    arcTo(jobs, can, CANUP, 0.6, 0.6, () => { water = 1.6; plants.forEach(p => p.to = [0.45, 0.75, 1.05, 1.3][grown]); K.tone(520 + grown*140, 0.2, 'sine', 0.12, 700 + grown*140);
      setTimeout(() => arcTo(jobs, can, CAN0, 0.6, 0.6), 1500); });
    return true;
  }
  K.hot({ x:cx - 2.8, z:0.2, label:'Water the beds', obj:can, use(){ waterBeds(); } });
  // a gardener at the end of the beds who turns to watch the can and hops when the flowers open
  const gardener = K.buddy(scene, '#e98a5a', cx - 5.3, -0.4, 2.4, 0.9, '#6fae4a'); K.round(cx - 5.3, -0.4, 0.35);
  let gHop = 0, gLast = 0;

  // the landscape model: a lit canvas ground, instanced trees and a little house
  const MX = cx + 3.0, MZ = -2.2, MW = 3.0, MD = 2.0, MY = 1.09;
  K.box(3.4, 0.1, 2.4, '#c99a6b', MX, 0.88, MZ); for(const [ox, oz] of [[-1.55, -1.05], [1.55, -1.05], [-1.55, 1.05], [1.55, 1.05]]) K.box(0.1, 0.84, 0.1, '#8a5a3c', MX + ox, 0.42, MZ + oz);
  K.box(MW, 0.16, MD, '#5a9a3c', MX, 1.0, MZ); K.solid(MX, MZ, 1.72, 1.22);
  let L = null, ver = 0;
  function layout(seed){
    const q = prng(seed), path = [[0, 0.2 + q()*0.6], [0.35, q()], [0.65, q()], [1, 0.2 + q()*0.6]];
    const pts = []; for(let k=0;k<=24;k++){ const t = k/24, a = (1 - t)**3, b = 3*(1 - t)**2*t, c = 3*(1 - t)*t*t, d = t**3; pts.push([a*path[0][0] + b*path[1][0] + c*path[2][0] + d*path[3][0], a*path[0][1] + b*path[1][1] + c*path[2][1] + d*path[3][1]]); }
    const far = (u, v, m) => pts.every(([pu, pv]) => Math.hypot((pu - u)*MW, (pv - v)*MD) > m);
    let pond = { u:0.5, v:0.5, r:0.12 }; for(let k=0;k<30;k++){ const p = { u:0.18 + q()*0.64, v:0.22 + q()*0.56, r:0.1 + q()*0.05 }; if(far(p.u, p.v, p.r*MD + 0.18)){ pond = p; break; } }
    const clearOf = (u, v, m) => far(u, v, m) && Math.hypot((u - pond.u)*MW, (v - pond.v)*MD) > pond.r*MD + m;
    let house = { u:0.15, v:0.2 }; for(let k=0;k<30;k++){ const p = { u:0.1 + q()*0.8, v:0.12 + q()*0.76 }; if(clearOf(p.u, p.v, 0.3)){ house = p; break; } }
    const trees = [];
    for(let k=0;k<200 && trees.length < 16;k++){ const u = 0.05 + q()*0.9, v = 0.07 + q()*0.86; if(clearOf(u, v, 0.14) && Math.hypot((u - house.u)*MW, (v - house.v)*MD) > 0.3 && trees.every(t => Math.hypot((t.u - u)*MW, (t.v - v)*MD) > 0.22)) trees.push({ u, v, s:0.8 + q()*0.5 }); }
    return { pts, pond, house, trees };
  }
  const drawGround = (g, w, h, plan) => {
    g.fillStyle = plan ? '#2f5d8a' : '#8cc56a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = plan ? '#ffffff22' : '#ffffff18'; g.lineWidth = 1; for(let x = 0; x < w; x += w/12){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for(let y = 0; y < h; y += h/8){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    if(!L) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = plan ? '#ffffff' : '#e8c79a'; g.lineWidth = plan ? 3 : h*0.07; g.beginPath(); L.pts.forEach(([u, v], k) => k ? g.lineTo(u*w, v*h) : g.moveTo(u*w, v*h)); g.stroke();
    if(!plan){ g.strokeStyle = '#d9b27c'; g.lineWidth = 2; g.stroke(); }
    g.beginPath(); g.ellipse(L.pond.u*w, L.pond.v*h, L.pond.r*h*1.0, L.pond.r*h, 0, 0, 7);
    if(plan){ g.strokeStyle = '#9bd3ff'; g.lineWidth = 3; g.stroke(); } else { g.fillStyle = '#5bb4e6'; g.fill(); g.strokeStyle = '#ffffff99'; g.lineWidth = 3; g.stroke(); }
    if(plan){
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(L.house.u*w - 12, L.house.v*h - 9, 24, 18);
      for(const t of L.trees){ g.beginPath(); g.arc(t.u*w, t.v*h, 7*t.s, 0, 7); g.stroke(); g.beginPath(); g.moveTo(t.u*w - 3, t.v*h); g.lineTo(t.u*w + 3, t.v*h); g.moveTo(t.u*w, t.v*h - 3); g.lineTo(t.u*w, t.v*h + 3); g.stroke(); }
      g.fillStyle = '#ffffff'; H.F(g, 700, 20); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(`PLAN  ${String(ver).padStart(2, '0')}`, 12, 10);
    }
  };
  const groundT = H.canvasTex(384, 256, (g, w, h) => drawGround(g, w, h, false));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MW, MD), new THREE.MeshStandardMaterial({ map:groundT.tex, roughness:0.9 }));
  ground.rotation.x = -Math.PI/2; ground.position.set(MX, MY, MZ); ground.receiveShadow = true; scene.add(ground);
  const trunks = inst(new THREE.CylinderGeometry(0.02, 0.028, 0.12, 6).translate(0, 0.06, 0), 16);
  const crowns = inst(new THREE.SphereGeometry(0.09, 10, 8).translate(0, 0.19, 0), 16);
  for(let i=0;i<16;i++){ trunks.setColorAt(i, C.set('#8a5a3c')); crowns.setColorAt(i, C.set(['#3f8f3a', '#5aa845', '#2f7a3a', '#7fbf57'][i % 4])); }
  const house = new THREE.Group(); scene.add(house);
  H.box(0.26, 0.16, 0.2, '#fffaf0', 0, 0.08, 0, house); const roofM = H.mesh(new THREE.ConeGeometry(0.22, 0.14, 4), '#e98a5a', 0, 0.23, 0, house); roofM.rotation.y = Math.PI/4;
  // the plan on a drafting easel beside it, drawn from the same layout
  const planP = K.panel(scene, cx + 5.55, 1.75, -3.5, 1.3, 0.9, (g, w, h) => drawGround(g, w, h, true), { rotY:-0.4, frame:'#8a5a3c', px:160 });
  for(const s of [-0.5, 0.5]) K.box(0.06, 1.6, 0.06, '#8a5a3c', cx + 5.55 + s*Math.cos(0.4), 0.8, -3.46 + s*Math.sin(0.4));
  K.round(cx + 5.55, -3.5, 0.6);
  const worldOf = (u, v, out) => out.set(MX + (u - 0.5)*MW, MY, MZ + (v - 0.5)*MD);
  const V = new THREE.Vector3();
  let phase = 'in', pt = 0, seed = 3, told = false;
  function relayout(){ L = layout(seed++); ver++; groundT.draw(groundT.g, groundT.w, groundT.h); groundT.tex.needsUpdate = true; planP.redraw(); worldOf(L.house.u, L.house.v, V); house.position.copy(V); house.rotation.y = (ver*1.3) % 6.28; }
  relayout();
  function redesign(){ if(phase !== 'idle') return false; phase = 'out'; pt = 0; K.tone(440, 0.12, 'triangle', 0.07, 660); return true; }
  K.hot({ x:MX, z:MZ + 2.1, label:'Redesign the model', obj:ground, use(){
    if(redesign() && !told){ told = true; talk(ctx, { name:'Garden Studio', portrait:'sign', lines:['Landscape design is the interest that keeps growing.', 'Every press of F draws a new layout: path, pond, house and planting, with the plan to match.'] }); }
  } });

  K.tick((dt, t) => {
    stepArcs(jobs, dt);
    // beds: grow toward the target size, sway, bloom at full size
    plants.forEach((p, i) => {
      p.s += (p.to - p.s)*Math.min(1, dt*3);
      o.position.set(spots[i][0], 0.52, spots[i][1]); o.rotation.set(0, i, Math.sin(t*1.5 + spots[i][0]*3)*0.06); o.scale.setScalar(p.s); o.updateMatrix();
      stems.setMatrixAt(i, o.matrix); leaves.setMatrixAt(i, o.matrix); blooms.setMatrixAt(i, p.s > 1.0 ? o.matrix : Z0);
    });
    stems.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = blooms.instanceMatrix.needsUpdate = true;
    // the gardener watches the can and hops for the flowers and the harvest
    if(grown !== gLast){ if(grown === 3 || grown === 0) gHop = 1.3; gLast = grown; }
    gHop = Math.max(0, gHop - dt);
    gardener.position.y = gHop > 0 ? Math.abs(Math.sin(gHop*9))*0.3 : Math.abs(Math.sin(t*1.9))*0.02;
    gardener.rotation.y = H.lerpAngle(gardener.rotation.y, Math.atan2(can.position.x - gardener.position.x, can.position.z - gardener.position.z), Math.min(1, dt*4));
    // pouring
    water = Math.max(0, water - dt);
    can.rotation.z = water > 0 ? -0.7 + Math.sin(t*6)*0.08 : can.rotation.z*(1 - Math.min(1, dt*6));
    D8.forEach((d, i) => {
      if(!d.on && water > 0.2 && Math.random() < dt*14){ d.on = true; d.x = can.position.x + 0.55 + (Math.random() - 0.5)*1.2; d.y = can.position.y + 0.2; d.z = can.position.z + (Math.random() - 0.5)*1.6; d.v = 0; }
      if(d.on){ d.v += dt*9; d.y -= d.v*dt; if(d.y < 0.6) d.on = false; }
      o.position.set(d.x, d.y, d.z); o.rotation.set(0, 0, 0); o.scale.setScalar(d.on ? 1 : 0); o.updateMatrix(); drops.setMatrixAt(i, o.matrix);
    });
    drops.instanceMatrix.needsUpdate = true;
    // model: trees shrink away, the ground is redrawn, trees pop back in one by one
    pt += dt;
    if(phase === 'out' && pt > 0.35){ relayout(); phase = 'in'; pt = 0; }
    if(phase === 'in' && pt > 0.4 + 16*0.05) phase = 'idle';
    for(let i=0;i<16;i++){
      const tr = L.trees[i];
      let s = 0;
      if(tr) s = tr.s*(phase === 'out' ? 1 - ease(pt/0.3) : phase === 'in' ? backOut((pt - i*0.05)/0.35) : 1);
      if(tr) worldOf(tr.u, tr.v, o.position); o.rotation.set(0, 0, 0); o.scale.setScalar(Math.max(0, s)); o.updateMatrix();
      M.copy(o.matrix); trunks.setMatrixAt(i, M); crowns.setMatrixAt(i, M);
    }
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
    house.scale.setScalar(phase === 'out' ? 1 - ease(pt/0.3) : phase === 'in' ? backOut(pt/0.4) : 1);
  });
  // potted trees in the front corners, and a seed shelf under the glass
  for(const [x, z] of [[cx + 5.7, 3.9], [cx - 5.6, 3.9]]){ K.cyl(0.4, 0.32, 0.6, '#e98a5a', x, 0.3, z, S, 16); K.cyl(0.05, 0.07, 0.9, '#8a5a3c', x, 1.05, z, S, 8); H.ball(0.55, '#5a9a3c', x, 1.75, z, S, 14); K.round(x, z, 0.45); }
  K.box(2.4, 0.06, 0.5, '#b98a5a', cx + 3.2, 0.62, -D/2 + 0.4); ['#ff8fab', '#ffd166', '#bdb2ff', '#6fae4a', '#ff9f68', '#4fa3c7'].forEach((c, i) => K.box(0.26, 0.34, 0.04, c, cx + 2.2 + i*0.38, 0.82, -D/2 + 0.45));
  K.solid(cx + 3.2, -D/2 + 0.4, 1.2, 0.3);
  K.stop('Garden beds', 'Gardening is the third part of the rest of the week. Press F at the pad to water the beds: each watering grows them a size, the third brings flowers, and the next one harvests.', [cx - 2.8, 2.2, BEDZ]);
  K.stop('Landscape model', 'Landscape design is the interest that keeps growing. Press F at the table and the model redesigns itself, a new path, pond, house and planting, drawn again on the plan beside it.', [MX, 2.4, MZ]);
}
