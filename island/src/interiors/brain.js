// Interior for the "brain" zone: Second Brain Greenhouse. Three rooms built with the shared tour
// kit in blueberry.js. Every fact on the walls comes from the zone's lines in data/zones.js.
//
// 1 Glasshouse: five raised beds, one per tool, all fed by pipes from one fountain (five tools in one
//   app). F at a bed waters it and it blooms its own way; F at the fountain waters all five.
// 2 Voice Bench: a round potting shed under a dome. F at the microphone: a spoken bubble rises, drops
//   into the sorter and comes out as a structured card that flies onto the log board.
// 3 Sign-in Gate: the public shell on the ground floor, the private records on a raised floor behind
//   a glass gate. F at the reader signs in: the gate slides open and only your drawers come out.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', pink = '#d6689a', leaf = '#4f9a3a';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return t*t*(3 - 2*t); };

// A short explanation: the dialog box when dialog.js is live, else a caption over the exhibit.
function teller(ctx, R, portrait){
  const { THREE, H } = R, W = 1024, HH = 190;
  const c = H.canvasTex(W, HH, () => {});
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:c.tex, transparent:true, depthTest:false }));
  s.renderOrder = 9; s.visible = false; R.g.add(s);
  let life = 0;
  R.tick(dt => { if(life > 0){ life -= dt; if(life <= 0) s.visible = false; } });
  return (name, lines, x, y, z) => {
    const d = ctx.modules.dialog;
    if(typeof d?.say === 'function'){ if(d.busy?.()) return; try { d.say({ name, lines, portrait }); return; } catch(e){} }
    const g = c.g; g.clearRect(0, 0, W, HH); H.rr(g, 4, 4, W - 8, HH - 8, 44); g.fillStyle = ink; g.fill();
    H.F(g, 600, 38, 'Nunito'); g.fillStyle = paper; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = R.wrap(g, lines.join(' '), W - 90).slice(0, 3);
    ls.forEach((l, k) => g.fillText(l, W/2, HH/2 + (k - (ls.length - 1)/2)*48 + 2));
    c.tex.needsUpdate = true; s.scale.set(5.4, 1.0, 1); s.position.set(x, y, z); s.visible = true; life = 5.5;
  };
}
// The player's position in this room's local frame (the room group sits at x = R.cx).
const playerLocal = (ctx, R) => { const P = ctx.state.interior?.player; return P ? { x:P.x - R.cx, z:P.z } : null; };

export function build(ctx, kit){
  const zone = kit.zone, debug = {};
  const SOURCE = (zone.links || []).find(l => /source/i.test(l[0]))?.[1] || null;
  const S = { dry:false, opened:[] };   // dry: record the link instead of opening it (tests)
  return makeTour(ctx, kit, {
    sky:'#fdeef4', skyLow:'#b44d7e', plinth:'#6a4552', viewTop:'#bfe6ff', viewLow:'#eaf8df', shaft:'#fff6d8', debug,
    // the view out of every window: soft green hills under a pink-blue sky
    view: (g, w, h) => {
      g.fillStyle = '#ffffffcc'; for(const [x, y, r] of [[54, 60, 22], [80, 54, 28], [190, 90, 20]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      [['#a8d98a', 170, 60], ['#7fc36a', 200, 90], ['#5fae55', 228, 120]].forEach(([c, y, a], k) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for(let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x/a + k*2)*14); g.lineTo(w, h); g.fill(); });
    },
    rooms: [
      { name:'Glasshouse', sub:'Five tools in one app', w:19, h:4.6, roof:'glass', run:5.2, rise:3.2, glassTint:'#e6fff0', rib:'#ffffff',
        wall:'#f3faf1', cap:'#ffffff', floor:'#d99a74', floor2:'#cf8c66', accent:pink, trim:leaf,
        windows:{ at:[0.1, 0.26, 0.74, 0.9], y:2.5, w:1.4, h:2.8, arch:true }, plaqueY:3.75, cam:{ ty:1.8, dist:24, pitch:0.52 },
        build: R => glasshouse(ctx, R, debug) },
      { name:'Voice Bench', sub:'Say a meal or a workout and it becomes a structured entry', w:15, shape:'round', h:4.4, roof:'dome', domeH:2.8, ribs:12,
        wall:'#fff6ea', cap:'#ffffff', floor:'#efe0c8', floor2:'#e2cfae', floorKind:'terrazzo', accent:'#e58a3b', rib:'#f6c89a',
        windows:{ at:[0.14, 0.86], y:2.3, w:1.1, round:true }, plaqueY:3.8, cam:{ ty:1.7, dist:22, pitch:0.52 },
        build: R => voiceBench(ctx, R, debug) },
      { name:'Sign-in Gate', sub:'A public shell on GitHub Pages; private records behind Google sign-in', w:17, h:5.2, roof:'barrel', vault:3.4, ribs:4,
        wall:'#eef4fb', cap:'#ffffff', floor:'#d8e7f0', floor2:'#cadde9', accent:'#3a86b4', rib:'#bcd6ea', ceil:'#f6fbff',
        windows:{ at:[0.93], y:2.8, w:1.0, round:true }, plaqueY:4.7, cam:{ ty:2.0, dist:23, pitch:0.52 },
        build: R => gate(ctx, R, debug, S, SOURCE) },
    ],
  });
}

// ---------- 1. Glasshouse: five beds, one fountain ----------
function glasshouse(ctx, R, debug){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'brain');
  const HX = 0, HZ = -1.2;
  // the fountain in the middle: one app, feeding every bed
  R.cyl(1.3, 1.45, 0.55, '#d8cfc0', HX, 0.27, HZ, R.s, 28); R.cyl(1.36, 1.36, 0.1, '#c4b9a6', HX, 0.58, HZ, R.s, 28);
  R.solidR(HX, HZ, 1.5);
  const pool = R.mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.04, 28), new THREE.MeshBasicMaterial({ color:'#8fd8f5' }), HX, 0.56, HZ, R.g);
  pool.castShadow = false;
  const jetMat = new THREE.MeshBasicMaterial({ color:'#bfeeff', transparent:true, opacity:0.7, depthWrite:false });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1, 10, 1, true), jetMat); jet.position.set(HX, 0.6, HZ); jet.scale.y = 0.01; R.g.add(jet);
  // the Second Brain itself: a pink topiary with a face, growing out of the fountain
  const brain = R.group(HX, 0.58, HZ);
  H.cyl(0.09, 0.13, 0.8, '#7a5236', 0, 0.4, 0, brain, 8);
  const crown = new THREE.Group(); crown.position.y = 1.3; brain.add(crown);
  const lobeC = ['#f29bbd', '#ec86ad', '#f5a9c6'];
  for(let k = 0; k < 9; k++){ const a = k/9*Math.PI*2; H.ball(0.3, lobeC[k%3], Math.cos(a)*0.42, Math.sin(k*2.1)*0.12, Math.sin(a)*0.3, crown, 12); }
  const core = H.ball(0.5, '#f7b6d2', 0, 0.06, 0, crown, 18); core.scale.set(1.1, 0.85, 0.9);
  if(H.eyes) H.eyes(crown, 0.02, 0.44, 0.16, 0.06);
  const wheel = R.group(HX, 0.42, HZ + 1.4);
  const rim = H.mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 18), '#e5484d', 0, 0, 0, wheel);
  for(let k = 0; k < 3; k++){ const sp = H.box(0.5, 0.04, 0.04, '#e5484d', 0, 0, 0, wheel); sp.rotation.z = k*Math.PI/3; }

  // five raised beds on an arc, each turned to face the door
  const BEDS = [
    { key:'notes', name:'Notes', x:-6.4, z:-2.4, color:'#ffd166',
      lines:['Notes: the first of five tools in Second Brain.', 'All five live in one app.'] },
    { key:'chat', name:'AI chat', x:-3.3, z:-4.0, color:'#ff9fb2',
      lines:['AI chat: the second tool, in the same app as the notes.'] },
    { key:'log', name:'Nutrition and workouts', x:0, z:-4.7, color:'#ff8a5c',
      lines:['Nutrition and workout logging.', 'Next door, at the Voice Bench: say a meal or a workout and it becomes a structured entry.'] },
    { key:'goals', name:'Goals', x:3.3, z:-4.0, color:'#ffc94a',
      lines:['Goals: the fourth tool.', 'Every watering fills the ring a little more.'] },
    { key:'dash', name:'Project dashboard', x:6.4, z:-2.4, color:'#8fd3ff',
      lines:['A project dashboard: the fifth tool.', 'Each watering moves one card along.'] },
  ];
  const pipeMat = H.mat('#9aa3b8'), dropMat = new THREE.MeshBasicMaterial({ color:'#6cc9f2' });
  BEDS.forEach((b, k) => {
    b.rot = Math.atan2(-b.x, 3 - b.z);
    const fx = Math.sin(b.rot), fz = Math.cos(b.rot);
    // static frame, merged with the room
    const st = R.group(b.x, 0, b.z, R.s); st.rotation.y = b.rot;
    H.box(2.6, 0.62, 1.3, '#b8794a', 0, 0.31, 0, st); H.box(2.76, 0.1, 1.46, '#9b6238', 0, 0.66, 0, st);
    H.box(2.4, 0.06, 1.1, '#6b4a33', 0, 0.7, 0, st);
    for(const sx of [-1.15, 1.15]) H.box(0.12, 0.66, 1.34, '#9b6238', sx, 0.33, 0, st);
    R.solid(b.x, b.z, 1.4, 0.72, b.rot);
    // the living part: label, plant, sparkle
    b.g = R.group(b.x, 0, b.z); b.g.rotation.y = b.rot;
    const lab = R.sign(b.name, null, { w:b.name.length > 12 ? 2.3 : 1.5, h:0.44, bg:b.color, fg:ink, size:34, parent:b.g }); lab.position.set(0, 0.36, 0.67);
    b.plant = new THREE.Group(); b.plant.position.y = 0.72; b.g.add(b.plant);
    b.anim = PLANTS[b.key](R, b.plant, b);
    b.spark = R.glow(0, 1.6, 0, 2.4, '#fff4b8', b.g, 0.0); b.spark.material = b.spark.material.clone(); b.spark.material.opacity = 0;
    b.water = 0; b.bloom = 0.25; b.kick = 0;
    // a pipe along the floor from the fountain to the front of the bed
    const a = Math.atan2(b.x - HX, b.z - HZ);
    const p0 = new THREE.Vector3(HX + Math.sin(a)*1.45, 0.1, HZ + Math.cos(a)*1.45), p2 = new THREE.Vector3(b.x + fx*0.72, 0.1, b.z + fz*0.72);
    const p1 = p0.clone().lerp(p2, 0.5); p1.x += (b.x === 0 ? 0 : Math.sign(b.x)*0.4); p1.y = 0.14;
    b.curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(b.curve, 20, 0.07, 6), pipeMat); tube.receiveShadow = true; R.s.add(tube);
    b.drop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dropMat); b.drop.visible = false; R.g.add(b.drop); b.dropT = -1;
    b.useE = R.use({ key:b.key, x:b.x + fx*(k === 2 ? 1.25 : 1.6), z:b.z + fz*(k === 2 ? 1.25 : 1.6), r:k === 2 ? 1.2 : 1.6, y:2.6,
      label:'Water ' + b.name, hit:b.g, pitch:620 + k*80, fn(){ water(b); say(b.name, b.lines, b.x, 3.1, b.z); } });
  });
  function water(b){ b.dropT = 0; b.drop.visible = true; }
  let gush = 0, gushN = 0;
  function waterAll(){ gush = 2.4; gushN++; BEDS.forEach((b, k) => setTimeout(() => water(b), k*120)); }
  R.use({ key:'fountain', x:HX, z:HZ + 2.1, r:1.9, y:3.4, label:'Water all five', hit:[brain, wheel], pitch:520, fn(){
    waterAll();
    say('Second Brain', ['Five tools in one app: notes, AI chat, nutrition and workout logging, goals, and a project dashboard.', 'One fountain, five beds.'], HX, 3.9, HZ);
  } });
  debug.water = key => { const b = BEDS.find(q => q.key === key) || BEDS[0]; water(b); return b.key; };
  debug.waterAll = () => { waterAll(); return BEDS.map(b => b.key); };
  debug.beds = () => BEDS.map(b => ({ key:b.key, bloom:+b.bloom.toFixed(2), water:+b.water.toFixed(2) }));

  // hanging baskets from the glass roof, and a gardener with a watering can
  for(const sx of [-5.6, 5.6]){ R.cyl(0.015, 0.015, 1.6, '#2a2a33', sx, 4.25, -5.6, R.s, 4); R.cyl(0.32, 0.22, 0.34, '#b8794a', sx, 3.35, -5.6); for(let k = 0; k < 6; k++){ const a = k/6*Math.PI*2; R.ball(0.14, k%2 ? leaf : '#6fbf4f', sx + Math.cos(a)*0.3, 3.2 - (k%3)*0.2, -5.6 + Math.sin(a)*0.3, R.s, 8); } }
  const gardener = R.blob('#ffd166', 2.6, -0.2, { cap:leaf, face:-0.6 }); R.solidR(2.6, -0.2, 0.5);
  const can = R.group(3.15, 0, 0.05); H.cyl(0.18, 0.2, 0.34, '#4fa3c7', 0, 0.17, 0, can, 12); const spout = H.cyl(0.03, 0.04, 0.4, '#4fa3c7', 0.24, 0.3, 0, can, 6); spout.rotation.z = -0.9;
  R.lamp('floor', -8.4, 1.5, 3.4); R.lamp('floor', 8.4, 1.5, 3.4);

  // butterflies: two hinged wings each; they circle the beds and scatter when you walk close
  const wingGeo = new THREE.PlaneGeometry(0.26, 0.2); wingGeo.translate(0.13, 0, 0);
  const flies = ['#ffb3d1', '#ffd166', '#b5e48c', '#8fd3ff'].map((c, k) => {
    const m = new THREE.MeshBasicMaterial({ color:c, side:THREE.DoubleSide });
    const f = new THREE.Group(); R.g.add(f);
    const w1 = new THREE.Mesh(wingGeo, m), w2 = new THREE.Mesh(wingGeo, m); w2.scale.x = -1; f.add(w1, w2);
    const home = BEDS[[0, 1, 3, 4][k]];
    return { f, w1, w2, cx:home.x, cz:home.z, ph:k*1.7, up:0 };
  });

  R.tick((dt, t) => {
    const P = playerLocal(ctx, R);
    gush = Math.max(0, gush - dt);
    jet.scale.y += ((gush > 0 ? 2.4 : 0.35 + Math.sin(t*3)*0.05) - jet.scale.y)*(1 - Math.exp(-6*dt)); jet.position.y = 0.6 + jet.scale.y/2;
    wheel.rotation.z -= dt*(gush > 0 ? 9 : 0.3);
    crown.scale.setScalar(1 + (gush > 0 ? Math.abs(Math.sin(t*10))*0.06 : Math.sin(t*1.6)*0.02));
    crown.rotation.y = Math.sin(t*0.5)*0.3;
    if(P) brain.rotation.y += (clamp(Math.atan2(P.x - HX, P.z - HZ), -0.9, 0.9) - brain.rotation.y)*(1 - Math.exp(-3*dt));
    for(const b of BEDS){
      if(b.dropT >= 0){
        b.dropT += dt*1.5;
        if(b.dropT >= 1){ b.dropT = -1; b.drop.visible = false; b.water = 1; b.kick = 1; b.anim.water?.(); }
        else b.drop.position.copy(b.curve.getPoint(b.dropT)).setY(0.22 + Math.sin(b.dropT*Math.PI)*0.15);
      }
      b.water = Math.max(0, b.water - dt/14); b.kick = Math.max(0, b.kick - dt*1.4);
      b.bloom += ((b.water > 0 ? 1 : 0.25) - b.bloom)*(1 - Math.exp(-2.2*dt));
      b.spark.material.opacity = b.kick*0.9;
      b.plant.scale.setScalar(0.8 + b.bloom*0.25 + Math.sin(b.kick*Math.PI)*0.12);
      b.plant.rotation.z = Math.sin(t*1.3 + b.x)*0.03;
      b.anim.tick(dt, t, b.bloom, P);
    }
    // gardener turns to watch you; butterflies circle, and flee upward when you get close
    if(P) gardener.rotation.y += (Math.atan2(P.x - 2.6, P.z + 0.2) - gardener.rotation.y)*(1 - Math.exp(-3*dt));
    for(const f of flies){
      const near = P && Math.hypot(P.x - f.cx, P.z - f.cz) < 2.6;
      f.up += ((near ? 1 : 0) - f.up)*(1 - Math.exp(-(near ? 4 : 0.8)*dt));
      const a = t*0.8 + f.ph, r = 1.2 + f.up*1.4;
      f.f.position.set(f.cx + Math.cos(a)*r, 1.9 + Math.sin(t*2.3 + f.ph)*0.25 + f.up*1.6, f.cz + Math.sin(a)*r*0.7);
      f.f.rotation.y = -a;
      const flap = Math.sin(t*(16 + f.up*10) + f.ph)*1.1; f.w1.rotation.y = flap; f.w2.rotation.y = -flap;
    }
  });

  R.stop('Five tools, one app', 'Second Brain is five tools in one app: notes, AI chat, nutrition and workout logging, goals, and a project dashboard. Press F at the fountain to water all five beds at once.', HX, 3.4, HZ);
  R.stop('One bed per tool', 'Each raised bed is one of the five tools. Walk up to a bed and press F to water it and watch it bloom.', 3.3, 2.8, -4.0);
}

// Each tool grows its own plant. build(R, group, bed) -> { tick(dt, t, bloom, player), water?() }
const PLANTS = {
  // Notes: leaves that are note cards, fanning out as it blooms
  notes(R, g){
    const { H } = R;
    H.cyl(0.05, 0.07, 1.2, leaf, 0, 0.6, 0, g, 6);
    const cols = ['#ffd166', '#fffaf0', '#ff9fb2', '#fff1a8', '#fffaf0', '#b5e48c'];
    const cards = cols.map(c => { const m = H.box(0.36, 0.36, 0.02, c, 0, 0, 0, g); H.box(0.24, 0.03, 0.021, '#c9b99a', 0, 0.06, 0.005, m); return m; });
    return { tick(dt, t, b){
      cards.forEach((m, k) => {
        const a = k*1.05 + t*0.1*b, r = 0.2 + b*0.28;
        m.position.set(Math.cos(a)*r, 0.35 + k*0.15*(0.7 + b*0.5), Math.sin(a)*r);
        m.rotation.set(0.2, -a + Math.PI/2, 0.3 + Math.sin(t*2.4 + k)*0.12*b);
        m.scale.setScalar(0.55 + 0.55*b);
      });
    } };
  },
  // AI chat: speech-bubble flowers whose three dots type while it blooms
  chat(R, g){
    const { THREE, H } = R;
    const heads = [[-0.5, 1.0, 0.3, '#ffffff'], [0.05, 1.35, -0.1, '#ffd0e1'], [0.55, 0.95, -0.4, '#ffffff']].map(([x, y, tilt, c], k) => {
      const stem = H.cyl(0.035, 0.045, y, leaf, x*0.5, y/2, 0, g, 6); stem.rotation.z = -tilt*0.5;
      const h = new THREE.Group(); h.position.set(x, y, 0); g.add(h);
      const bub = H.ball(0.3, c, 0, 0, 0, h, 16); bub.scale.set(1.35, 0.95, 0.5);
      const tail = H.mesh(new THREE.ConeGeometry(0.1, 0.22, 8), c, -0.22, -0.28, 0, h); tail.rotation.z = -0.5;
      const dots = [-0.15, 0, 0.15].map(dx => H.ball(0.05, ink, dx, 0, 0.15, h, 8));
      return { h, dots, ph:k*1.3 };
    });
    return { tick(dt, t, b){
      heads.forEach(q => {
        q.h.scale.setScalar(0.45 + 0.65*b); q.h.rotation.z = Math.sin(t*1.7 + q.ph)*0.12;
        q.dots.forEach((d, i) => { d.position.y = Math.max(0, Math.sin(t*8 - i*0.9 + q.ph))*0.07*b; });
      });
    } };
  },
  // Nutrition and workouts: a tomato bush, and a little dumbbell that curls itself
  log(R, g){
    const { THREE, H } = R;
    for(const [x, y, z, r] of [[-0.3, 0.35, 0, 0.34], [0.25, 0.4, 0.05, 0.36], [0, 0.7, -0.05, 0.32], [-0.5, 0.25, 0.2, 0.22]]) H.ball(r, x < 0 ? leaf : '#5fae45', x, y, z, g, 12);
    const fruit = [[-0.35, 0.5, 0.3], [0.3, 0.62, 0.3], [0.05, 0.95, 0.2], [0.45, 0.3, 0.28], [-0.6, 0.4, 0.2]].map(([x, y, z]) => H.ball(0.1, '#e5484d', x, y, z, g, 10));
    const bell = new THREE.Group(); bell.position.set(0.85, 0.08, 0.25); g.add(bell);
    const bar = H.cyl(0.025, 0.025, 0.36, '#9aa3b8', 0, 0, 0, bell, 6); bar.rotation.z = Math.PI/2;
    for(const s of [-1, 1]){ const p = H.cyl(0.09, 0.09, 0.06, ink, s*0.16, 0, 0, bell, 12); p.rotation.z = Math.PI/2; }
    return { tick(dt, t, b){
      fruit.forEach((f, k) => f.scale.setScalar(0.5 + 0.8*b + Math.sin(t*2 + k)*0.03));
      const lift = Math.max(0, Math.sin(t*3.2))*b; bell.position.y = 0.08 + lift*0.4; bell.rotation.z = lift*0.3;
    } };
  },
  // Goals: a sunflower that follows you, with a ring of beads that fills one step per watering
  goals(R, g, bed){
    const { THREE, H } = R;
    H.cyl(0.05, 0.07, 1.4, leaf, 0, 0.7, 0, g, 6);
    for(const s of [-1, 1]){ const l = H.ball(0.18, '#5fae45', s*0.2, 0.55 + (s > 0 ? 0.2 : 0), 0, g, 8); l.scale.set(1.6, 0.35, 0.8); }
    const head = new THREE.Group(); head.position.y = 1.45; g.add(head);
    const disc = H.cyl(0.24, 0.24, 0.1, '#6b4a33', 0, 0, 0.02, head, 18); disc.rotation.x = Math.PI/2;
    for(let k = 0; k < 12; k++){ const a = k/12*Math.PI*2, p = H.box(0.12, 0.3, 0.03, '#ffc94a', Math.cos(a)*0.34, Math.sin(a)*0.34, 0, head); p.rotation.z = a - Math.PI/2; }
    const off = new THREE.MeshBasicMaterial({ color:'#e7e2d6' }), on = new THREE.MeshBasicMaterial({ color:'#35b36a' });
    const beads = []; for(let k = 0; k < 10; k++){ const a = Math.PI/2 - k/10*Math.PI*2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), off); m.position.set(Math.cos(a)*0.58, Math.sin(a)*0.58, 0.03); head.add(m); beads.push(m); }
    let lit = 0, done = 0;
    return {
      water(){ lit = Math.min(10, lit + 3); beads.forEach((m, k) => { m.material = k < lit ? on : off; }); if(lit >= 10){ done = 1.2; burst(R, bed.x, 2.8, bed.z); } },
      tick(dt, t, b, P){
        head.scale.setScalar(0.65 + 0.45*b);
        if(done > 0){ done -= dt; head.rotation.z = done*6; if(done <= 0){ lit = 0; beads.forEach(m => { m.material = off; }); head.rotation.z = 0; } }
        // turn toward the player (the bed is already turned by bed.rot, so take that off)
        const want = P ? clamp(Math.atan2(P.x - bed.x, P.z - bed.z) - bed.rot, -0.8, 0.8) : 0;
        head.rotation.y += (want - head.rotation.y)*(1 - Math.exp(-3*dt));
      },
    };
  },
  // Project dashboard: a trellis board with three columns; each watering moves one card along
  dash(R, g){
    const { THREE, H } = R;
    for(const sx of [-0.75, 0.75]) H.box(0.08, 1.6, 0.08, '#9b6238', sx, 0.8, -0.1, g);
    H.box(1.66, 0.08, 0.1, '#9b6238', 0, 1.62, -0.1, g);
    const board = R.screen(1.4, 0.95, (c, w, h) => {
      c.fillStyle = '#eaf6ff'; c.fillRect(0, 0, w, h);
      ['#ffd166', '#8fd3ff', '#35b36a'].forEach((col, k) => { const x = 8 + k*(w - 16)/3; c.fillStyle = '#ffffff'; R.H.rr(c, x + 3, 8, (w - 16)/3 - 6, h - 16, 10); c.fill(); c.fillStyle = col; R.H.rr(c, x + 3, 8, (w - 16)/3 - 6, 14, 7); c.fill(); });
    }, { parent:g, x:0, y:1.05, z:-0.08, px:110 });
    const colX = [-0.44, 0, 0.44], cols = [0, 0, 0, 1, 2];
    const cards = cols.map((c, k) => ({ m:H.box(0.34, 0.14, 0.03, ['#ffd166', '#ff9fb2', '#b5e48c', '#8fd3ff', '#cdb4db'][k], colX[c], 0, -0.02, g), c, x:colX[c] }));
    return {
      water(){
        const q = cards.find(c => c.c < 2);
        if(q) q.c++; else cards.forEach((c, k) => { c.c = k < 3 ? 0 : k - 2; });
      },
      tick(dt, t, b){
        const rows = [0, 0, 0];
        cards.forEach(c => {
          const r = rows[c.c]++;
          c.x += (colX[c.c] - c.x)*(1 - Math.exp(-6*dt));
          c.m.position.set(c.x, 1.35 - r*0.2, -0.02 + Math.abs(colX[c.c] - c.x)*0.4);
        });
      },
    };
  },
};

// ---------- 2. Voice Bench: a spoken bubble becomes a structured card ----------
function voiceBench(ctx, R, debug){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'brain');
  const MX = 0, MZ = -1.4;
  // the microphone, standing in the light from the oculus
  R.cyl(0.42, 0.48, 0.1, '#3a3f4b', MX, 0.05, MZ, R.s, 18); R.cyl(0.04, 0.04, 1.5, '#3a3f4b', MX, 0.8, MZ, R.s, 8);
  const mic = R.group(MX, 1.62, MZ);
  const head = H.ball(0.22, '#c7cdd9', 0, 0.06, 0, mic, 16); head.scale.y = 1.3;
  for(let k = 0; k < 4; k++){ const r = H.mesh(new THREE.TorusGeometry(0.2, 0.018, 4, 18), '#8f97a8', 0, -0.1 + k*0.1, 0, mic); r.rotation.x = Math.PI/2; r.scale.setScalar(0.9 + Math.sin(k*0.8)*0.12); }
  const ringMat = new THREE.MeshBasicMaterial({ color:'#ffb35c', transparent:true, opacity:0.3, depthWrite:false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32), ringMat); ring.rotation.x = -Math.PI/2; ring.position.set(MX, 0.02, MZ); R.g.add(ring);
  R.solidR(MX, MZ, 0.55);

  // the sorter: a hopper on top, gears on the front, a chute on the side
  const SX = 4.0, SZ = -3.7, sRot = -0.55;
  const sorter = R.group(SX, 0, SZ); sorter.rotation.y = sRot;
  H.box(1.7, 1.8, 1.2, '#e58a3b', 0, 0.9, 0, sorter); H.box(1.8, 0.14, 1.3, '#c96f25', 0, 1.85, 0, sorter);
  const hop = H.mesh(new THREE.CylinderGeometry(0.75, 0.25, 0.7, 16, 1, true), H.mat('#f6c89a', { side:THREE.DoubleSide }), 0, 2.25, 0, sorter);
  const gears = [[-0.4, 1.1, 0.34], [0.35, 0.8, 0.26]].map(([x, y, r]) => {
    const gg = new THREE.Group(); gg.position.set(x, y, 0.62); sorter.add(gg);
    H.cyl(r, r, 0.08, '#ffd166', 0, 0, 0, gg, 16).rotation.x = Math.PI/2;
    for(let k = 0; k < 8; k++){ const a = k/8*Math.PI*2, t = H.box(0.1, 0.12, 0.08, '#ffd166', Math.cos(a)*(r + 0.04), Math.sin(a)*(r + 0.04), 0, gg); t.rotation.z = a; }
    H.cyl(0.06, 0.06, 0.1, ink, 0, 0, 0.02, gg, 8).rotation.x = Math.PI/2;
    return gg;
  });
  const chute = H.box(0.7, 0.08, 0.6, '#c7cdd9', -1.1, 0.95, 0.1, sorter); chute.rotation.z = -0.35;
  const lampOff = new THREE.MeshBasicMaterial({ color:'#6d6a7a' }), lampOn = new THREE.MeshBasicMaterial({ color:'#b5e48c' });
  const bulbs = [-0.5, 0, 0.5].map(x => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lampOff); m.position.set(x, 1.6, 0.62); sorter.add(m); return m; });
  const ss = R.sign('Sorter', 'speech in, entry out', { w:1.9, h:0.62, bg:'#e58a3b', fg:'#ffffff', size:30, parent:sorter }); ss.position.set(0, 1.35, 0.62);
  R.solid(SX, SZ, 0.95, 0.7, sRot);
  // world (room) position of the hopper mouth and the chute end
  const hopAt = new THREE.Vector3(SX, 2.55, SZ), chuteAt = new THREE.Vector3(SX - Math.cos(sRot)*1.35, 0.95, SZ + Math.sin(sRot)*1.35);

  // the log board on the back wall
  const BX = 0, BY = 1.85, BZ = -6.0;
  R.box(4.7, 2.5, 0.12, '#6b4a33', BX, BY, BZ - 0.08);
  const entries = [];
  const board = R.screen(4.5, 2.3, (g, w, h, t) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = '#e58a3b'; g.fillRect(0, 0, w, 56);
    g.fillStyle = '#ffffff'; H.F(g, 700, 30); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Log', 22, 29);
    g.fillStyle = '#ffffffbb'; H.F(g, 600, 20, 'Nunito'); g.textAlign = 'right'; g.fillText('demo entries', w - 20, 30);
    g.textAlign = 'left';
    if(!entries.length){ g.fillStyle = '#1f2a4488'; H.F(g, 600, 24, 'Nunito'); g.fillText('Nothing yet. Press F at the microphone.', 22, 112); }
    entries.slice(-3).reverse().forEach((e, k) => {
      const y = 70 + k*72, fresh = clamp(1 - (t - e.t)/1.2, 0, 1);
      g.fillStyle = e.c; H.rr(g, 16, y, w - 32, 62, 14); g.fill();
      if(fresh > 0){ g.lineWidth = 5; g.strokeStyle = `rgba(53,179,106,${fresh})`; g.stroke(); }
      g.fillStyle = ink; H.F(g, 700, 24); g.fillText(e.kind, 32, y + 31);
      H.F(g, 600, 20, 'Nunito'); e.rows.forEach(([k2, v], i) => { g.fillStyle = '#1f2a4488'; g.fillText(k2, 170 + i*210, y + 20); g.fillStyle = ink; g.fillText(v, 170 + i*210, y + 44); });
    });
  }, { x:BX, y:BY, z:BZ, fps:12 });
  const slotAt = new THREE.Vector3(BX, BY + 0.55, BZ + 0.2);

  // the kitchen corner and the squat rack, which answer meals and workouts
  const counter = R.group(-4.2, 0, -3.8, R.s); counter.rotation.y = 0.55;
  H.box(2.2, 0.92, 0.9, '#fffaf0', 0, 0.46, 0, counter); H.box(2.34, 0.08, 1.0, '#e58a3b', 0, 0.96, 0, counter);
  H.box(0.7, 0.04, 0.6, '#3a3f4b', 0.45, 1.01, 0, counter);
  R.solid(-4.2, -3.8, 1.2, 0.55, 0.55);
  const pan = R.group(-4.2 + Math.cos(0.55)*0.45, 1.05, -3.8 - Math.sin(0.55)*0.45);
  H.cyl(0.3, 0.25, 0.08, '#2a2a33', 0, 0.04, 0, pan, 16); H.box(0.5, 0.04, 0.06, '#2a2a33', -0.5, 0.06, 0, pan);
  for(const [x, z] of [[-0.08, 0], [0.1, 0.06]]){ H.ball(0.1, '#fffaf0', x, 0.1, z, pan, 10).scale.y = 0.3; H.ball(0.045, '#ffc94a', x, 0.12, z, pan, 8); }
  const steamMat = new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0.5, depthWrite:false });
  const steam = [0, 1, 2, 3].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), steamMat); R.g.add(s); return s; });
  const rack = R.group(4.8, 0, 3.0, R.s);
  for(const sx of [-0.85, 0.85]){ H.box(0.12, 1.8, 0.12, '#3a3f4b', sx, 0.9, -0.3, rack); H.box(0.12, 1.8, 0.12, '#3a3f4b', sx, 0.9, 0.3, rack); H.box(0.14, 0.1, 0.8, '#3a3f4b', sx, 0.05, 0, rack); }
  R.solid(4.8, 3.0, 1.0, 0.45);
  const bar = R.group(4.8, 1.35, 3.0);
  const rod = H.cyl(0.035, 0.035, 2.3, '#c7cdd9', 0, 0, 0, bar, 8); rod.rotation.z = Math.PI/2;
  for(const sx of [-0.98, 0.98]){ const p = H.cyl(0.32, 0.32, 0.1, '#e5484d', sx, 0, 0, bar, 18); p.rotation.z = Math.PI/2; }
  const lifter = R.blob('#8fd3ff', 4.8, 3.55, { face:Math.PI, scale:0.8 });
  const cook = R.blob('#ffb35c', -3.2, -2.8, { face:0.9, scale:0.8, cap:'#fffaf0' });
  R.lamp('pendant', -4.2, 3.0, -3.8, { top:R.h + 1.5 });

  // the bubble and the card that travel through the room
  const bubbleT = H.canvasTex(640, 150, () => {});
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map:bubbleT.tex, transparent:true, depthWrite:false })); bubble.visible = false; bubble.renderOrder = 5; R.g.add(bubble);
  const cardT = H.canvasTex(390, 240, () => {});
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshBasicMaterial({ map:cardT.tex, side:THREE.DoubleSide, toneMapped:false })); card.visible = false; R.g.add(card);
  const LINES = [
    { say:'Two eggs and toast', kind:'Meal', rows:[['food', 'eggs x2, toast'], ['meal', 'breakfast']], c:'#ffe6b8', k:'meal' },
    { say:'Five sets of squats', kind:'Workout', rows:[['lift', 'squat'], ['sets', '5']], c:'#cdeafe', k:'lift' },
    { say:'A bowl of rice and salmon', kind:'Meal', rows:[['food', 'rice, salmon'], ['meal', 'lunch']], c:'#ffe6b8', k:'meal' },
    { say:'A twenty minute run', kind:'Workout', rows:[['cardio', 'run'], ['time', '20 min']], c:'#cdeafe', k:'lift' },
  ];
  function drawBubble(text){
    const g = bubbleT.g, w = 640, h = 150; g.clearRect(0, 0, w, h); H.F(g, 600, 42, 'Nunito');
    const tw = Math.min(w - 20, g.measureText('“' + text + '”').width + 70);
    H.rr(g, (w - tw)/2, 8, tw, 104, 50); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#e58a3b'; g.stroke();
    g.beginPath(); g.moveTo(w/2 - 20, 108); g.lineTo(w/2, 142); g.lineTo(w/2 + 18, 108); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('“' + text + '”', w/2, 62);
    bubbleT.tex.needsUpdate = true;
  }
  function drawCard(e){
    const g = cardT.g, w = 390, h = 240; g.clearRect(0, 0, w, h);
    g.fillStyle = e.c; H.rr(g, 4, 4, w - 8, h - 8, 26); g.fill(); g.lineWidth = 6; g.strokeStyle = ink; g.stroke();
    g.fillStyle = ink; H.F(g, 700, 38); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(e.kind, 26, 44);
    e.rows.forEach(([k2, v], i) => { const y = 100 + i*62; g.fillStyle = '#ffffffaa'; H.rr(g, 20, y - 24, w - 40, 50, 14); g.fill(); g.fillStyle = '#1f2a4499'; H.F(g, 600, 24, 'Nunito'); g.fillText(k2, 36, y); g.fillStyle = ink; H.F(g, 700, 26); g.fillText(v, 140, y); });
    cardT.tex.needsUpdate = true;
  }
  // timeline of one spoken entry, in seconds
  const T1 = 1.0, T2 = 2.4, T3 = 2.8, T4 = 4.0, T5 = 5.6;
  let run = -1, turn = 0, cur = null, fry = 0, lift = 0;
  const bubbleUp = new THREE.Vector3(MX, 2.55, MZ);
  function speak(){
    if(run >= 0) return false;
    cur = LINES[turn % LINES.length]; turn++; run = 0;
    drawBubble(cur.say); drawCard(cur);
    return cur.say;
  }
  R.use({ key:'speak', x:MX, z:MZ + 1.8, r:1.9, y:2.9, label:'Say a meal or a workout', hit:mic, pitch:520, fn(){
    const first = turn === 0;
    if(speak() && first) say('Voice log', ['Voice-first logging: say a meal or a workout and it becomes a structured entry.', 'Watch the words go through the sorter and onto the log.'], MX, 3.3, MZ);
  } });
  debug.speak = () => speak();
  debug.log = () => entries.map(e => e.kind + ': ' + e.rows.map(r => r[1]).join(', '));
  const v = new THREE.Vector3();
  R.tick((dt, t) => {
    const P = playerLocal(ctx, R);
    const near = P && Math.hypot(P.x - MX, P.z - MZ) < 2.6;
    ringMat.opacity += ((run >= 0 && run < T1 ? 0.9 : near ? 0.55 : 0.2) - ringMat.opacity)*(1 - Math.exp(-5*dt));
    ring.scale.setScalar(1 + (run >= 0 && run < T1 ? Math.sin(t*14)*0.08 : 0));
    mic.scale.setScalar(1 + (run >= 0 && run < T1 ? Math.abs(Math.sin(t*22))*0.12 : 0));
    let spin = 0.4, shake = 0;
    if(run >= 0){
      run += dt;
      // 1: the words swell above the mic, 2: arc over to the hopper, 3: drop in
      if(run < T1){ bubble.visible = true; const f = ease(run/T1); bubble.position.set(MX, 1.9 + f*0.65, MZ); bubble.scale.set(3.2*f, 0.75*f, 1); }
      else if(run < T2){ const f = ease((run - T1)/(T2 - T1)); v.lerpVectors(bubbleUp, hopAt, f); v.y += Math.sin(f*Math.PI)*1.2 + 0.6*(1 - f); bubble.position.copy(v); bubble.scale.set(3.2 - f*1.6, 0.75 - f*0.37, 1); }
      else if(run < T3){ const f = (run - T2)/(T3 - T2); bubble.position.set(hopAt.x, hopAt.y - f*0.5, hopAt.z); bubble.scale.set(1.6*(1 - f), 0.38*(1 - f), 1); }
      else bubble.visible = false;
      // 4: the sorter works
      if(run >= T3 && run < T4){ spin = 9; shake = 1; }
      bulbs.forEach((b, k) => { b.material = run >= T3 && run < T4 ? (((t*8)|0) % 3 === k ? lampOn : lampOff) : run >= T4 ? lampOn : lampOff; });
      // 5: the card slides out of the chute and flies onto the board
      if(run >= T4 && run < T5){
        card.visible = true; const f = ease((run - T4)/(T5 - T4));
        v.lerpVectors(chuteAt, slotAt, f); v.y += Math.sin(f*Math.PI)*1.4; card.position.copy(v);
        card.scale.setScalar(0.5 + Math.sin(f*Math.PI)*0.6 + f*0.1); card.rotation.set(0, (1 - f)*(-sRot + 0.6), Math.sin(f*Math.PI*2)*0.15);
        if(cur.k === 'meal') fry = 1; else lift = 1;
      }
      if(run >= T5){
        card.visible = false; run = -1;
        entries.push({ ...cur, t }); board.redraw(t); R.chime(880);
        bulbs.forEach(b => { b.material = lampOff; });
      }
    }
    gears.forEach((gg, k) => { gg.rotation.z += dt*spin*(k ? -1.4 : 1); });
    sorter.position.x = SX + (shake ? Math.sin(t*50)*0.03 : 0);
    // meals: the eggs hop in the pan and the steam rises; workouts: the bar goes up
    fry = Math.max(0, fry - dt*0.35); lift = Math.max(0, lift - dt*0.3);
    pan.position.y = 1.05 + (fry > 0 ? Math.abs(Math.sin(t*9))*0.06*fry : 0);
    steam.forEach((s, k) => { const p = (t*0.6 + k*0.25) % 1; s.visible = p < 0.9; s.position.set(pan.position.x + Math.sin(t*2 + k)*0.1, 1.2 + p*(0.7 + fry*1.2), pan.position.z); s.scale.setScalar(0.6 + p*(1 + fry)); });
    const ly = lift > 0 ? Math.max(0, Math.sin((1 - lift)*Math.PI*6))*0.55 : 0;
    bar.position.y = 1.35 + ly; lifter.scale.y = 0.8*(1 - ly*0.12);
    cook.rotation.y = 0.9 + (fry > 0 ? Math.sin(t*6)*0.3 : 0);
  });

  R.stop('Voice-first logging', 'Say a meal or a workout and it becomes a structured entry. Press F at the microphone, then follow the words into the sorter and onto the log.', MX, 3.2, MZ);
  R.stop('The log', 'The sorter turns what you said into a card with fields, and the card lands on the log board. These are demo entries.', BX, 3.4, BZ + 0.5);
}

// ---------- 3. Sign-in Gate: public shell below, private records above ----------
function gate(ctx, R, debug, S, SOURCE){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'sign');
  const blue = '#3a86b4', me = pink;
  let signed = false, open = 0, since = 99;
  // the raised floor for the private records, with steps down to the gate
  const DX = 1.8, DZ = -4.5;
  R.dais(DX, DZ, 9.4, 3.6, 0.6, { color:'#dfe9f3', edge:blue, stepW:3.4 });
  // the records cabinet: 6 x 3 drawers as one instanced mesh, coloured by owner
  const CY = 0.6, CZ = -5.8;
  R.box(7.6, 2.3, 0.8, '#2e3a4c', DX, CY + 1.15, CZ); R.box(7.8, 0.12, 0.9, blue, DX, CY + 2.36, CZ);
  const owners = [1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 3, 2, 1, 0, 3, 2];   // 0 = you
  const ownerC = ['#d6689a', '#6c7fa6', '#6ea38c', '#b8906a'];
  const drawerGeo = new THREE.BoxGeometry(1.1, 0.6, 0.14);
  const drawers = new THREE.InstancedMesh(drawerGeo, new THREE.MeshStandardMaterial({ roughness:0.7 }), 18);   // one draw call for all 18 drawers
  drawers.castShadow = true; drawers.receiveShadow = true; R.g.add(drawers);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial(), 18); R.g.add(lamps);
  const col = new THREE.Color(), mtx = new THREE.Matrix4(), cells = [];
  for(let k = 0; k < 18; k++){
    const c = k % 6, r = (k/6)|0;
    cells.push({ x:DX + (c - 2.5)*1.2, y:CY + 0.45 + r*0.72, out:0 });
    drawers.setColorAt(k, col.set(ownerC[owners[k]]));
  }
  const handles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.06, 0.06), H.mat('#e8eef6'), 18); R.g.add(handles);
  function layout(t){
    cells.forEach((c, k) => {
      mtx.makeTranslation(c.x, c.y, CZ + 0.47 + c.out); drawers.setMatrixAt(k, mtx);
      mtx.makeTranslation(c.x, c.y + 0.12, CZ + 0.57 + c.out); handles.setMatrixAt(k, mtx);
      mtx.makeTranslation(c.x + 0.42, c.y + 0.18, CZ + 0.55 + c.out); lamps.setMatrixAt(k, mtx);
      const mine = owners[k] === 0;
      lamps.setColorAt(k, col.set(!signed ? '#6d6a7a' : mine ? '#35b36a' : (((t*4)|0) % 2 && since < 2 ? '#ff7b7b' : '#e5484d')));
    });
    drawers.instanceMatrix.needsUpdate = true; handles.instanceMatrix.needsUpdate = true; lamps.instanceMatrix.needsUpdate = true; lamps.instanceColor.needsUpdate = true;
  }
  const rs = R.sign('Private records', 'row-level security', { w:2.8, h:0.72, bg:ink, fg:'#ffffff', size:30 }); rs.position.set(DX, CY + 2.95, CZ + 0.3);
  const yours = R.float('Only your rows', DX, CY + 3.6, CZ + 1.2, { size:26, bg:'#35b36a', fg:'#ffffff', scale:0.9 }); yours.visible = false;

  // the glass gate at the foot of the steps
  const GZ = -0.95;
  for(const sx of [-1.75, 1.75]){ R.box(0.34, 3.0, 0.34, blue, DX + sx, 1.5, GZ); R.solid(DX + sx, GZ, 0.2, 0.2); }
  R.box(3.9, 0.36, 0.4, blue, DX, 3.1, GZ); R.box(4.1, 0.1, 0.5, '#ffffff', DX, 3.32, GZ);
  const glassM = new THREE.MeshStandardMaterial({ color:'#cfe8ff', transparent:true, opacity:0.35, roughness:0.05, depthWrite:false });
  const leaves = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.06), glassM); m.position.set(DX + s*0.8, 1.4, GZ); R.g.add(m); H.box(0.06, 0.5, 0.08, '#e8eef6', -s*0.66, 0.1, 0.05, m); return { m, s }; });
  // the reader: a pillar with a little screen that walks through signing in
  const RX = -0.7, RZ = -0.6;
  R.box(0.5, 1.3, 0.4, '#e8eef6', RX, 0.65, RZ); R.box(0.6, 0.08, 0.5, blue, RX, 1.34, RZ); R.solid(RX, RZ, 0.3, 0.25);
  const reader = R.screen(0.46, 0.34, (g, w, h, t) => {
    g.fillStyle = ink; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    const busy = signed && since < 1.1;
    g.fillStyle = busy ? '#ffd166' : signed ? '#35b36a' : '#ffffff'; H.F(g, 700, busy ? 13 : 12);
    if(busy){ g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.beginPath(); g.arc(w/2, h*0.62, 8, t*6, t*6 + 4.2); g.stroke(); g.fillText('checking', w/2, h*0.28); }
    else { g.fillText(signed ? 'Signed in' : 'Sign in with', w/2, h*0.36); H.F(g, 700, 14); g.fillText(signed ? 'F to sign out' : 'Google', w/2, h*0.68); }
  }, { x:RX, y:1.12, z:RZ + 0.21, fps:10, px:130 });
  function toggle(){
    signed = !signed; since = 0; R.chime(signed ? 740 : 440);
    if(signed) setTimeout(() => { if(signed) burst(R, DX, 2.6, CZ + 1.4); }, 1300);
    return signed;
  }
  R.use({ key:'signin', x:RX + 0.3, z:RZ + 1.4, r:1.7, y:2.3, label:'Sign in with Google', hit:[reader.mesh], pitch:700, fn(){
    const on = toggle();
    say('Sign-in Gate', on ? ['Signed in with Google.', 'Row-level security hands back only your own rows: the pink drawers.'] : ['Signed out. The gate closes and the records stay put.'], DX, 3.8, GZ);
  } });
  debug.signin = v => { if(v === undefined || !!v !== signed) toggle(); return signed; };

  // the two views of one page, side by side on the back wall
  const VX = -5.6, VY = 2.4, VZ = -6.28;
  R.box(4.5, 2.5, 0.1, '#6b7e96', VX, VY, VZ - 0.06);
  const views = R.screen(4.3, 2.3, (g, w, h, t) => {
    g.fillStyle = '#f6fbff'; g.fillRect(0, 0, w, h);
    const pane = (x, title, active, fill) => {
      const pw = w/2 - 24;
      g.fillStyle = active ? '#ffffff' : '#eef3f8'; H.rr(g, x, 14, pw, h - 28, 18); g.fill();
      g.lineWidth = active ? 6 : 2; g.strokeStyle = active ? blue : '#c9d6e3'; g.stroke();
      g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, x + 18, 40);
      g.fillStyle = '#dbe4ee'; H.rr(g, x + 16, 62, pw - 32, 22, 8); g.fill();           // the shell: a header bar
      for(let k = 0; k < 3; k++){                                                        // and three empty slots
        const y = 96 + k*58;
        if(fill){ const f = clamp((since - 1.1 - k*0.25)*3, 0, 1); g.fillStyle = ['#ffd0e1', '#ffe6b8', '#cdeafe'][k]; g.globalAlpha = 0.25 + 0.75*f; H.rr(g, x + 16, y, pw - 32, 46, 12); g.fill(); g.globalAlpha = 1; g.fillStyle = me; H.rr(g, x + 26, y + 16, 14, 14, 4); g.fill(); g.fillStyle = '#1f2a4455'; H.rr(g, x + 50, y + 18, (pw - 90)*(0.5 + k*0.15)*f, 10, 5); g.fill(); }
        else { g.setLineDash([8, 8]); g.strokeStyle = '#c9d6e3'; g.lineWidth = 3; H.rr(g, x + 16, y, pw - 32, 46, 12); g.stroke(); g.setLineDash([]); }
      }
      if(!fill && title !== 'Signed out'){   // a padlock over the empty slots
        const lx = x + pw/2, ly = h/2 + 34; g.lineWidth = 8; g.strokeStyle = '#9aa7b8'; g.beginPath(); g.arc(lx, ly - 14, 18, Math.PI, 0); g.stroke();
        g.fillStyle = '#9aa7b8'; H.rr(g, lx - 30, ly - 14, 60, 46, 10); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(lx, ly + 6, 6, 0, 7); g.fill();
      }
    };
    pane(16, 'Signed out', !signed, false);
    pane(w/2 + 8, 'Signed in', signed, signed);
  }, { x:VX, y:VY, z:VZ, fps:8, px:110 });
  const vs = R.sign('One page, two views', null, { w:3.0, h:0.5, bg:blue, fg:'#ffffff', size:30 }); vs.position.set(VX, VY + 1.55, VZ + 0.02);

  // the public shell: a tiny browser window in a glass case that anyone can walk up to
  const KX = -5.4, KZ = -2.2;
  R.box(1.6, 0.9, 1.2, '#ffffff', KX, 0.45, KZ); R.box(1.7, 0.08, 1.3, blue, KX, 0.92, KZ); R.solid(KX, KZ, 0.85, 0.65);
  const shell = R.group(KX, 0.96, KZ);
  H.box(1.1, 0.72, 0.08, '#e8eef6', 0, 0.42, 0, shell); H.box(1.1, 0.1, 0.1, '#c9d6e3', 0, 0.74, 0.01, shell);
  for(const [x, c] of [[-0.46, '#e5484d'], [-0.38, '#ffd166'], [-0.3, '#35b36a']]) H.ball(0.025, c, x, 0.74, 0.06, shell, 6);
  R.screen(1.0, 0.56, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#dbe4ee'; g.fillRect(8, 8, w - 16, 12); for(let k = 0; k < 3; k++){ g.strokeStyle = '#c9d6e3'; g.lineWidth = 2; g.setLineDash([5, 5]); g.strokeRect(8, 28 + k*12, w - 16, 9); } g.setLineDash([]); }, { parent:shell, x:0, y:0.38, z:0.045, px:120 });
  const caseM = R.box(1.4, 0.95, 1.0, '#e8f4ff', KX, 1.45, KZ, R.g); caseM.material = new THREE.MeshStandardMaterial({ color:'#e8f4ff', transparent:true, opacity:0.18, roughness:0.05, depthWrite:false }); caseM.castShadow = false;
  R.float('Public shell · GitHub Pages', KX, 2.35, KZ, { size:24, scale:0.85 });
  const visitors = [R.blob('#ffd166', KX - 1.5, KZ + 1.2, { face:2.4, scale:0.7 }), R.blob('#b5e48c', KX + 1.4, KZ + 1.3, { face:-2.3, scale:0.7 })];
  R.solidR(KX - 1.5, KZ + 1.2, 0.4); R.solidR(KX + 1.4, KZ + 1.3, 0.4);
  let wave = 0;
  R.use({ key:'shell', x:KX, z:KZ + 1.6, r:1.3, y:2.4, label:'Look at the public shell', hit:shell, pitch:600, fn(){
    wave = 1.2;
    say('Public shell', ['The public side is a static shell on GitHub Pages: the same page for everyone.', 'Every private record stays behind Google sign-in and row-level security.'], KX, 3.0, KZ);
  } });

  // the source, on a lectern by the far wall
  if(SOURCE){
    const LX = 6.6, LZ = 2.2;
    R.box(0.7, 1.05, 0.5, '#6b4a33', LX, 0.52, LZ); const lt = R.box(0.84, 0.06, 0.62, ink, LX, 1.1, LZ, R.g); lt.rotation.x = 0.3;
    R.solid(LX, LZ, 0.42, 0.3);
    R.float('Source on GitHub', LX, 1.9, LZ, { size:24, bg:ink, fg:'#ffffff', scale:0.85 });
    const openSource = () => { S.opened.push(SOURCE); if(!S.dry) window.open(SOURCE, '_blank', 'noopener,noreferrer'); };
    // window.open runs straight from the F or click handler, so the browser counts it as a user gesture
    R.use({ key:'source', x:LX, z:LZ + 1.3, r:1.4, y:2.4, label:'Open the source on GitHub', hit:lt, pitch:660, fn:openSource });
    debug.source = () => { S.dry = true; openSource(); return S.opened.slice(); };
  }
  R.lamp('pendant', DX - 2.4, 3.9, CZ + 1.6, { top:R.h + 1.5 }); R.lamp('pendant', DX + 2.4, 3.9, CZ + 1.6, { top:R.h + 1.5 });
  R.lamp('floor', -7.6, 1.5, 3.2);

  R.tick((dt, t) => {
    since += dt;
    const want = signed && since > 1.1 ? 1 : 0;
    open += (want - open)*(1 - Math.exp(-(want ? 3 : 5)*dt));
    leaves.forEach(l => { l.m.position.x = DX + l.s*(0.8 + open*1.5); });
    cells.forEach((c, k) => { const w2 = owners[k] === 0 && open > 0.5 ? 0.5 + Math.sin(t*2 + k)*0.03 : 0; c.out += (w2 - c.out)*(1 - Math.exp(-5*dt)); });
    layout(t);
    yours.visible = open > 0.6; yours.position.y = CY + 3.6 + Math.sin(t*2.5)*0.05;
    wave = Math.max(0, wave - dt);
    visitors.forEach((b, k) => { b.position.y = wave > 0 ? Math.abs(Math.sin(t*9 + k))*0.25 : b.position.y; });
  });
  layout(0);
  drawers.instanceColor.needsUpdate = true;

  R.stop('Public shell', 'The public side of Second Brain is a static shell on GitHub Pages. The case holds the part anyone can see; the board behind it shows the same page signed out and signed in.', KX, 2.9, KZ);
  R.stop('Private records', 'Every private record sits behind Google sign-in and row-level security. Press F at the reader: the gate opens and only your own drawers slide out.', DX, 3.8, GZ - 1.45);   // the tour stands you 2.2 m in front, which must be off the dais
}
