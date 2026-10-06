// Interior for "now" (Now Building): a workshop with Blueberry on the bench, the Second Brain
// bench, and the empty plot for whatever comes next.
import { tour, wrap } from './clinic.js';

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg: '#2f2616',
    rooms: [
      { key:'workshop', name:'Workshop', w:12, floor:'#d9b48a', floorLine:'#c49a6c', wall:'#fff4d6', wall2:'#fbe7b0', wallKind:'stripes', trim:'#f5d98a', trimDark:'#8a6440', lamp:'#ffe08a',
        build(K, r){ workshop(K, r, zone); } },
      { key:'brainbench', name:'Second Brain Bench', w:11, floor:'#f4e3ec', floorLine:'#e7cbd9', floorKind:'tiles', wall:'#fdf0f5', wall2:'#f7dde8', wallKind:'dots', trim:'#f0cadb', trimDark:'#d6689a', lamp:'#ffd9ec',
        build(K, r){ brainBench(K, r, zone); } },
      { key:'plot', name:'The Empty Plot', w:10, floor:'#e8dcc4', floorLine:'#d6c7a8', wall:'#f6f1e6', wall2:'#ece4d2', wallKind:'plain', trim:'#e0d4bc', trimDark:'#f2b705', lamp:'#fff3c4',
        build(K, r){ plot(K, r, zone); } },
    ],
  });
}

function workshop(K, r, zone){
  const { THREE, H, D, scene } = K, cx = r.cx;
  // a big blueberry on a stand, wrapped in scaffolding: the learning game moving into the platform
  const bx = cx - 1.6, bz = -2.4;
  H.cyl(1.1, 1.2, 0.3, '#8a6440', bx, 0.15, bz, scene, 24);
  const berry = new THREE.Group(); berry.position.set(bx, 0.3, bz); scene.add(berry);
  H.ball(1.0, '#3b4f9e', 0, 1.0, 0, berry, 26);
  for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; const c = H.mesh(new THREE.ConeGeometry(0.12, 0.34, 6), '#23306b', Math.cos(a)*0.2, 1.95, Math.sin(a)*0.2, berry); c.rotation.z = Math.cos(a)*0.7; c.rotation.x = -Math.sin(a)*0.7; }
  K.eyes(berry, 1.15, 0.92, 0.3, 0.1);
  for(const [x, z] of [[-1.3,-1.1],[1.3,-1.1],[-1.3,1.1],[1.3,1.1]]) H.box(0.08, 2.8, 0.08, '#f2b705', bx + x, 1.4, bz + z, scene);
  for(const y of [1.2, 2.5]){ H.box(2.7, 0.08, 0.08, '#f2b705', bx, y, bz - 1.1, scene); H.box(2.7, 0.08, 0.08, '#f2b705', bx, y, bz + 1.1, scene); }
  H.box(2.7, 0.06, 0.6, '#b98a5a', bx, 2.5, bz + 1.1, scene);
  K.solid(bx, bz, 1.4, 1.2);
  // progress bar sign
  let prog = 0.62;
  const bar = K.panel(scene, bx, 3.2, bz + 1.15, 2.4, 0.5, (g, w, h) => {
    g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; H.F(g, 700, 15); g.fillText('Blueberry, in progress', 10, 19);
    g.fillStyle = '#3a4260'; g.fillRect(10, 28, w - 20, 16); g.fillStyle = '#f2b705'; g.fillRect(10, 28, (w - 20)*prog, 16);
  }, { frame:'#f2b705', px:110 });
  // workbench with a hammer
  H.box(3.2, 0.14, 1.1, '#b98a5a', cx + 3.3, 1.0, -4.2, scene);
  for(const x of [-1.5, 1.5]) H.box(0.14, 1, 1, '#8a6440', cx + 3.3 + x, 0.5, -4.2, scene);
  K.solid(cx + 3.3, -4.2, 1.65, 0.6);
  const hammer = new THREE.Group(); hammer.position.set(cx + 2.8, 1.1, -4.05); scene.add(hammer);
  H.cyl(0.04, 0.04, 0.6, '#b98a5a', 0, 0.3, 0, hammer, 6); H.box(0.3, 0.12, 0.12, '#3a3f52', 0, 0.6, 0, hammer);
  hammer.rotation.z = Math.PI/2;
  for(let i=0;i<3;i++) H.box(0.5, 0.1, 0.3, ['#e98a5a','#4fa3c7','#6fae4a'][i], cx + 3.8 + i*0.1, 1.12 + i*0.1, -4.2, scene);
  // sparks
  const sparks = [];
  for(let i=0;i<10;i++){ const s = H.mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color:'#ffd166', toneMapped:false }), 0, 0, 0, scene); s.visible = false; s.castShadow = false; sparks.push({ m:s, v:new THREE.Vector3(), life:0 }); }
  let swing = -1;
  K.hot({ x:bx + 1.9, z:bz + 2.4, label:'Build a bit more', obj:berry, use(){
    if(swing >= 0) return; swing = 0;
  } });
  K.tick((dt, t) => {
    berry.rotation.y = Math.sin(t*0.6)*0.15; berry.position.y = 0.3 + Math.abs(Math.sin(t*1.8))*0.05;
    if(swing >= 0){
      swing += dt*2.4;
      hammer.position.set(bx + 1.2, 2.2, bz + 1.3); hammer.rotation.set(0, 0, Math.PI*0.2 + Math.sin(Math.min(1, swing)*Math.PI)*1.2);
      if(swing >= 0.5 && !hammer.userData.hit){
        hammer.userData.hit = true; prog = Math.min(1, prog + 0.08); bar.redraw(); K.sfx('clink', 0.7);
        sparks.forEach(s => { s.life = 1; s.m.position.set(bx + 0.8, 1.7, bz + 0.9); s.v.set((Math.random() - 0.5)*3, Math.random()*3, Math.random()*2); s.m.visible = true; });
      }
      if(swing >= 1){ swing = -1; hammer.userData.hit = false; hammer.position.set(cx + 2.8, 1.1, -4.05); hammer.rotation.set(0, 0, Math.PI/2); if(prog >= 1){ prog = 0.62; setTimeout(() => bar.redraw(), 900); } }
    }
    for(const s of sparks){ if(s.life <= 0) continue; s.life -= dt*1.8; s.v.y -= dt*9; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(Math.max(0.01, s.life)); if(s.life <= 0) s.m.visible = false; }
  });
  // crates and a traffic cone
  H.box(0.9, 0.9, 0.9, '#c9985f', cx - 5, 0.45, -4.2, scene); H.box(0.7, 0.7, 0.7, '#b98a5a', cx - 5, 1.25, -4.2, scene).rotation.y = 0.4;
  K.solid(cx - 5, -4.2, 0.5, 0.5);
  H.mesh(new THREE.ConeGeometry(0.25, 0.7, 14), '#f28c28', cx + 4.8, 0.35, 0.8, scene); K.round(cx + 4.8, 0.8, 0.3);
  K.info(cx + 3.3, -D/2 + 0.1, { y:2.05, w:2.4, h:1.3, padZ:3.6 });
}

function brainBench(K, r, zone){
  const { THREE, H, D, scene } = K, cx = r.cx;
  // one home: a cabinet of drawers for notes, food, workouts and goals, with the brain on top
  const cab = new THREE.Group(); cab.position.set(cx - 0.6, 0, -4); scene.add(cab);
  H.box(3.4, 1.5, 1, '#fffaf0', 0, 0.75, 0, cab);
  const names = ['Notes', 'Food', 'Workouts', 'Goals'], cols = ['#4fa3c7', '#e98a5a', '#e5484d', '#6fae4a'];
  const drawers = names.map((n, i) => {
    const d = new THREE.Group(); d.position.set(-1.2 + i*0.8, 0.75, 0.5); cab.add(d);
    H.box(0.7, 1.2, 0.12, cols[i], 0, 0, 0, d); H.box(0.3, 0.06, 0.08, '#ffffff', 0, 0.35, 0.08, d);
    const lab = K.sign(d, n, 0, -0.2, 0.07, { w:0.66, h:0.24, bg:'#ffffff', fg:'#1f2a44' });
    return { d, open:0, to:0 };
  });
  K.solid(cx - 0.6, -4, 1.75, 0.55);
  // the brain in a jar on top
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 24, 1, true), new THREE.MeshStandardMaterial({ color:'#dff2fb', transparent:true, opacity:0.35, roughness:.1, side:THREE.DoubleSide }));
  jar.position.set(cx - 0.6, 2.05, -4); scene.add(jar);
  H.cyl(0.66, 0.66, 0.1, '#9aa3b8', cx - 0.6, 2.62, -4, scene, 24);
  const brain = new THREE.Group(); brain.position.set(cx - 0.6, 1.95, -4); scene.add(brain);
  for(let i=0;i<9;i++){ const a = i/9*Math.PI*2; H.ball(0.2, '#f5a3c7', Math.cos(a)*0.24, Math.sin(i*1.7)*0.1, Math.sin(a)*0.2, brain, 10); }
  H.ball(0.3, '#f7b6d2', 0, 0.05, 0, brain, 14);
  K.eyes(brain, 0.05, 0.36, 0.1, 0.045);
  let which = -1;
  K.hot({ x:cx - 0.6, z:-2, label:'Open a drawer', obj:cab, use(){
    which = (which + 1) % 4; drawers.forEach((d, i) => d.to = i === which ? 0.5 : 0);
    K.tone([523, 659, 784, 1046][which], 0.2, 'triangle', 0.15);
  } });
  // things that pop out of each drawer
  const pops = [
    () => { const g = new THREE.Group(); for(let i=0;i<3;i++) H.box(0.5, 0.02, 0.36, '#fffaf0', 0, i*0.03, 0, g).rotation.y = i*0.2; return g; },
    () => { const g = new THREE.Group(); H.ball(0.14, '#e5484d', -0.1, 0, 0, g, 10); H.ball(0.12, '#f2b705', 0.15, 0, 0.05, g, 10); return g; },
    () => { const g = new THREE.Group(); const b = H.cyl(0.03, 0.03, 0.6, '#9aa3b8', 0, 0, 0, g, 6); b.rotation.z = Math.PI/2; for(const s of [-1, 1]) H.cyl(0.1, 0.1, 0.06, '#1f2a44', s*0.26, 0, 0, g, 10).rotation.z = Math.PI/2; return g; },
    () => { const g = new THREE.Group(); H.cyl(0.02, 0.02, 0.5, '#6b4a33', 0, 0.2, 0, g, 5); const f = H.box(0.26, 0.16, 0.01, '#6fae4a', 0.13, 0.38, 0, g); return g; },
  ].map((mk, i) => { const g = mk(); g.visible = false; scene.add(g); return g; });
  K.tick((dt, t) => {
    brain.position.y = 1.95 + Math.sin(t*1.6)*0.05; brain.rotation.y = Math.sin(t*0.7)*0.4;
    drawers.forEach((d, i) => {
      d.open += (d.to - d.open)*Math.min(1, dt*6); d.d.position.z = 0.5 + d.open;
      const p = pops[i]; p.visible = d.open > 0.05;
      if(p.visible) p.position.set(cx - 0.6 - 1.2 + i*0.8, 1.6 + d.open*1.2 + Math.sin(t*3)*0.05, -4 + 0.5 + d.open);
    });
  });
  // wall board with the line from the resume
  K.panel(scene, cx + 3.2, 2.0, -D/2 + 0.08, 2.6, 1.4, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#d6689a'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#1f2a44'; H.F(g, 700, 22); g.textAlign = 'center'; g.fillText('Second Brain', w/2, 44);
    g.fillStyle = '#4b5675'; H.F(g, 600, 18, 'Nunito'); wrap(g, 'One home for notes, food, workouts and goals.', w/2, 78, w - 30, 24);
  }, { frame:'#d6689a' });
  // beanbag
  const bb = H.ball(0.7, '#d6689a', cx + 3.4, 0.4, 0.8, scene, 16); bb.scale.y = 0.6; K.round(cx + 3.4, 0.8, 0.7);
}

function plot(K, r, zone){
  const { THREE, H, D, scene } = K, cx = r.cx, pz = -1.4;
  // a square of soil with a little fence and a spotlight pool
  const soil = H.box(3.4, 0.12, 3, '#7a5236', cx, 0.06, pz, scene);
  for(let i=0;i<5;i++) H.box(3.2, 0.02, 0.12, '#6b4a33', cx, 0.13, pz - 1.2 + i*0.6, scene).castShadow = false;
  for(const [x, z, w, d] of [[0, -1.6, 3.6, 0.08], [-1.8, 0, 0.08, 3.2], [1.8, 0, 0.08, 3.2]]) H.box(w, 0.4, d, '#fffaf0', cx + x, 0.2, pz + z, scene);
  for(let i=0;i<7;i++) for(const s of [-1, 1]) H.box(0.1, 0.55, 0.1, '#fffaf0', cx + s*1.8, 0.28, pz - 1.5 + i*0.5, scene);
  K.solid(cx, pz, 1.85, 1.65);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color:'#fff3c4', transparent:true, opacity:0.18, depthWrite:false, toneMapped:false }));
  pool.rotation.x = -Math.PI/2; pool.position.set(cx, 0.14, pz); scene.add(pool);
  // the sign
  const sg = new THREE.Group(); sg.position.set(cx + 1.4, 0, pz + 1.9); sg.rotation.y = -0.2; scene.add(sg);
  H.box(0.1, 1.2, 0.1, '#8a6440', 0, 0.6, 0, sg);
  K.sign(sg, 'For whatever', 0, 1.3, 0.06, { w:1.5, h:0.62, bg:'#f2b705', fg:'#1f2a44', sub:'comes next' });
  K.round(cx + 1.4, pz + 1.9, 0.2);
  // a sprout that grows each time you plant
  const sprout = new THREE.Group(); sprout.position.set(cx, 0.12, pz); scene.add(sprout);
  const stem = H.cyl(0.04, 0.05, 1, '#6fae4a', 0, 0.5, 0, sprout, 6);
  const l1 = H.ball(0.22, '#7fbf57', -0.2, 0.9, 0, sprout, 10); l1.scale.set(1, 0.45, 0.7);
  const l2 = H.ball(0.22, '#7fbf57', 0.2, 1.0, 0, sprout, 10); l2.scale.set(1, 0.45, 0.7);
  const q = K.sign(sprout, '?', 0, 1.6, 0, { w:0.5, h:0.5, bg:'#fffaf0', fg:'#f2b705', size:52 });
  let size = 0, to = 0;
  sprout.scale.setScalar(0.001);
  K.hot({ x:cx - 0.6, z:pz + 2.6, label:'Plant a seed', obj:soil, use(){ to = to >= 1 ? 0 : Math.min(1, to + 0.34); K.tone(400 + to*500, 0.25, 'sine', 0.15, 600 + to*500); } });
  K.tick((dt, t) => {
    size += (to - size)*Math.min(1, dt*3);
    sprout.scale.setScalar(Math.max(0.001, size)); sprout.rotation.z = Math.sin(t*1.4)*0.06;
    q.visible = size > 0.9; pool.material.opacity = 0.14 + Math.sin(t*1.2)*0.04;
  });
  // a board linking to every project
  const board = K.panel(scene, cx - 2.2, 2.0, -D/2 + 0.08, 2.4, 1.3, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b705'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#1f2a44'; H.F(g, 700, 24); g.textAlign = 'center'; g.fillText('All projects', w/2, 52);
    g.fillStyle = '#4b5675'; H.F(g, 600, 16, 'Nunito'); g.fillText('on GitHub', w/2, 80); g.fillStyle = '#f2b705'; H.F(g, 700, 15); g.fillText('press E on the pad', w/2, h - 16);
  }, { frame:'#f2b705' });
  const links = zone.links || [];
  K.hot({ x:cx - 2.9, z:-3, label:'See all projects', obj:board, use(){ K.showCard(zone.title, [zone.role, ...zone.bullets], links); } });
  // watering can by the fence
  H.cyl(0.2, 0.24, 0.4, '#4fa3c7', cx - 2.6, 0.2, 1.2, scene, 14); K.round(cx - 2.6, 1.2, 0.3);
}
