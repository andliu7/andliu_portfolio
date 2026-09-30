// Interior for "yard" (Off the Clock): a kitchen, a small gym, and a garden studio.
import { tour, wrap } from './clinic.js';

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg: '#22301e',
    rooms: [
      { key:'kitchen', name:'Kitchen', w:12, floor:'#f3ead6', floorLine:'#e98a5a', floorKind:'checker', wall:'#fdf6e6', wall2:'#f7e4c6', wallKind:'stripes', trim:'#f1d7b0', trimDark:'#e98a5a', lamp:'#ffd59a',
        build(K, r){ kitchen(K, r, zone); } },
      { key:'gym', name:'Home Gym', w:11, floor:'#3c4250', floorLine:'#4a5163', floorKind:'tiles', wall:'#e9eef2', wall2:'#dde4ea', wallKind:'plain', trim:'#c9d2da', trimDark:'#1f2a44', lamp:'#eef6ff', shade:'#1f2a44',
        build(K, r){ gym(K, r); } },
      { key:'garden', name:'Garden Studio', w:11, floor:'#c8b08a', floorLine:'#b39a74', wall:'#eef6e4', wall2:'#e0eed2', wallKind:'dots', trim:'#cfe3bb', trimDark:'#6fae4a', lamp:'#fff0b8',
        build(K, r){ garden(K, r, zone); } },
    ],
  });
}

function kitchen(K, r, zone){
  const { THREE, H, D, scene } = K, cx = r.cx;
  // counter run along the back wall, with the stove in the middle
  H.box(9, 1, 1.1, '#fffaf0', cx - 0.5, 0.5, -4.35, scene); H.box(9.1, 0.1, 1.2, '#6fae4a', cx - 0.5, 1.03, -4.35, scene);
  for(let i=0;i<6;i++) H.box(1.35, 0.8, 0.02, '#f7ecd8', cx - 4.4 + i*1.5, 0.5, -3.79, scene).castShadow = false;
  K.solid(cx - 0.5, -4.35, 4.55, 0.6);
  const stoveX = cx - 0.3;
  H.box(1.6, 0.06, 1.1, '#1f2a44', stoveX, 1.09, -4.35, scene);
  const burners = [];
  for(const [bx, bz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.22], [0.4, 0.22]]){
    const b = H.mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 18), new THREE.MeshBasicMaterial({ color:'#3a3f52', toneMapped:false }), stoveX + bx, 1.13, -4.35 + bz, scene);
    b.rotation.x = -Math.PI/2; burners.push(b);
  }
  for(let i=0;i<4;i++) H.cyl(0.05, 0.05, 0.06, '#e5484d', stoveX - 0.45 + i*0.3, 0.9, -3.78, scene, 8).rotation.x = Math.PI/2;
  // the pot, its lid and a spoon
  const pot = new THREE.Group(); pot.position.set(stoveX - 0.4, 1.13, -4.1); scene.add(pot);
  H.cyl(0.34, 0.3, 0.42, '#e5484d', 0, 0.21, 0, pot, 20);
  H.cyl(0.3, 0.3, 0.02, '#f2b705', 0, 0.4, 0, pot, 20);
  const lid = new THREE.Group(); lid.position.y = 0.44; pot.add(lid);
  H.cyl(0.36, 0.36, 0.04, '#c93c3c', 0, 0, 0, lid, 20); H.ball(0.06, '#1f2a44', 0, 0.06, 0, lid, 8);
  for(const s of [-1, 1]) H.box(0.14, 0.05, 0.08, '#1f2a44', s*0.4, 0.34, 0, pot);
  const spoon = new THREE.Group(); spoon.position.set(0.12, 0.42, 0); pot.add(spoon);
  const sh = H.cyl(0.02, 0.02, 0.7, '#b98a5a', 0, 0.2, 0, spoon, 6); sh.rotation.z = 0.35;
  spoon.visible = false;
  // steam puffs
  const puffs = [];
  for(let i=0;i<8;i++){ const p = H.mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0, depthWrite:false, toneMapped:false }), 0, 0, 0, scene); p.castShadow = false; puffs.push({ m:p, life:0 }); }
  // hood over the stove
  H.box(1.8, 0.5, 0.9, '#dfe7ea', stoveX, 2.7, -4.45, scene); H.box(0.7, 0.4, 0.5, '#dfe7ea', stoveX, 3.05, -4.6, scene);
  // cutting board with vegetables
  H.box(1.1, 0.05, 0.7, '#d9a86a', cx - 2.6, 1.1, -4.3, scene);
  for(let i=0;i<3;i++){ const c = H.mesh(new THREE.ConeGeometry(0.07, 0.4, 8), '#f28c28', cx - 2.95 + i*0.18, 1.18, -4.4, scene); c.rotation.z = Math.PI/2; }
  H.ball(0.13, '#e5484d', cx - 2.2, 1.24, -4.2, scene, 12); H.ball(0.11, '#e5484d', cx - 2.35, 1.22, -4.0, scene, 12);
  H.ball(0.15, '#6fae4a', cx - 2.05, 1.26, -4.5, scene, 10);
  // hanging pans
  H.box(3, 0.06, 0.06, '#1f2a44', cx - 3.8, 2.6, -D/2 + 0.2, scene);
  for(let i=0;i<3;i++){ const p = H.cyl(0.22 + i*0.04, 0.2 + i*0.04, 0.06, '#3a3f52', cx - 4.8 + i*0.9, 2.2 - i*0.05, -D/2 + 0.26, scene, 16); p.rotation.x = Math.PI/2; H.box(0.05, 0.3, 0.03, '#3a3f52', cx - 4.8 + i*0.9, 2.45, -D/2 + 0.26, scene); }
  // fridge
  H.box(1.2, 2.4, 1, '#f5f7fa', cx + 4.9, 1.2, -4.3, scene); H.box(0.05, 0.6, 0.06, '#9aa3b8', cx + 4.4, 1.6, -3.77, scene);
  H.box(1.21, 0.03, 1.01, '#dfe7ea', cx + 4.9, 1.5, -4.3, scene);
  K.solid(cx + 4.9, -4.3, 0.6, 0.55);
  // island table with stools
  H.box(2.6, 0.1, 1.2, '#b98a5a', cx - 0.2, 1.0, -0.6, scene); H.box(2.3, 0.9, 1, '#6fae4a', cx - 0.2, 0.45, -0.6, scene);
  H.cyl(0.18, 0.18, 0.12, '#fffaf0', cx + 0.6, 1.1, -0.6, scene, 14); H.ball(0.1, '#f2b705', cx + 0.6, 1.2, -0.6, scene, 10);
  K.solid(cx - 0.2, -0.6, 1.35, 0.65);
  for(const s of [-1, 1]){ H.cyl(0.26, 0.26, 0.08, '#e98a5a', cx - 0.2 + s*0.8, 0.8, 0.5, scene, 14); H.cyl(0.05, 0.05, 0.78, '#1f2a44', cx - 0.2 + s*0.8, 0.39, 0.5, scene, 6); }
  let cook = 0, target = 0, stirs = 0;
  K.hot({ x:stoveX, z:-2.4, label:'Stir the pot', obj:pot, use(){ target = 1; cook = Math.max(cook, 0.2); stirs++; K.sfx('clink', 0.4); spoon.userData.t = 0; } });
  K.tick((dt, t) => {
    if(target) target = Math.max(0, target - dt*0.12);
    cook += ((target > 0 ? 1 : 0) - cook)*Math.min(1, dt*2);
    const hot = cook > 0.05;
    burners[0].material.color.setRGB(0.23 + cook*0.77, 0.25 + cook*0.2, 0.32 - cook*0.25);
    lid.position.y = 0.44 + (hot ? Math.abs(Math.sin(t*16))*0.04*cook : 0);
    lid.rotation.z = hot ? Math.sin(t*9)*0.05*cook : 0;
    spoon.visible = hot; spoon.rotation.y = t*4;
    for(const p of puffs){
      if(p.life <= 0 && hot && Math.random() < dt*5*cook){ p.life = 1; p.m.position.set(pot.position.x + (Math.random() - 0.5)*0.3, 1.7, pot.position.z); }
      if(p.life > 0){ p.life -= dt*0.6; p.m.position.y += dt*0.9; p.m.position.x += Math.sin(t*2 + p.life*6)*dt*0.2; p.m.scale.setScalar(1 + (1 - p.life)*1.6); p.m.material.opacity = p.life*0.55; }
    }
  });
  K.info(cx + 2.5, -D/2 + 0.1, { y:2.05, w:2.4, h:1.3, padZ:2.8 });
}

function gym(K, r){
  const { THREE, H, D, scene } = K, cx = r.cx;
  const mat = H.box(4.2, 0.05, 3.2, '#1f2a44', cx - 1.2, 0.03, -2.6, scene); mat.castShadow = false;
  // squat rack
  for(const s of [-1, 1]){ H.box(0.14, 2.6, 0.14, '#9aa3b8', cx - 1.2 + s*1.2, 1.3, -3.6, scene); H.box(0.14, 2.6, 0.14, '#9aa3b8', cx - 1.2 + s*1.2, 1.3, -2.4, scene); H.box(0.14, 0.14, 1.3, '#9aa3b8', cx - 1.2 + s*1.2, 2.6, -3, scene); }
  K.solid(cx - 2.4, -3, 0.12, 0.7); K.solid(cx, -3, 0.12, 0.7);
  // the barbell and a lifter buddy under it
  const bar = new THREE.Group(); bar.position.set(cx - 1.2, 1.55, -3); scene.add(bar);
  const rod = H.cyl(0.035, 0.035, 3.2, '#c9d2da', 0, 0, 0, bar, 8); rod.rotation.z = Math.PI/2;
  for(const s of [-1, 1]){
    for(let i=0;i<2;i++){ const p = H.cyl(0.42 - i*0.08, 0.42 - i*0.08, 0.1, ['#e5484d','#4fa3c7'][i], s*(1.3 + i*0.11), 0, 0, bar, 20); p.rotation.z = Math.PI/2; }
  }
  const lifter = K.buddy(scene, '#ffd166', cx - 1.2, -3, 0, 1.2);
  for(const s of [-1, 1]){ const a = H.cyl(0.07, 0.07, 0.6, '#ffd166', s*0.42, 1.1, 0, lifter, 8); a.rotation.z = s*0.3; }
  // bench and dumbbell rack
  H.box(0.6, 0.12, 1.8, '#1f2a44', cx + 2.2, 0.6, -1.8, scene); H.box(0.1, 0.55, 0.1, '#9aa3b8', cx + 2.2, 0.28, -2.5, scene); H.box(0.1, 0.55, 0.1, '#9aa3b8', cx + 2.2, 0.28, -1.1, scene);
  K.solid(cx + 2.2, -1.8, 0.35, 0.95);
  H.box(2.4, 0.5, 0.6, '#3a3f52', cx + 3, 0.5, -4.4, scene);
  for(let i=0;i<5;i++){ const dbx = cx + 2.1 + i*0.45; const d = H.cyl(0.04, 0.04, 0.4, '#c9d2da', dbx, 0.83, -4.4, scene, 6); d.rotation.x = Math.PI/2; for(const s of [-1, 1]) H.cyl(0.08 + i*0.01, 0.08 + i*0.01, 0.08, '#1f2a44', dbx, 0.83, -4.4 + s*0.16, scene, 10).rotation.x = Math.PI/2; }
  K.solid(cx + 3, -4.4, 1.25, 0.35);
  // mirror
  K.panel(scene, cx + 3.2, 1.85, -D/2 + 0.08, 2.4, 1.6, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dff2fb'); gr.addColorStop(1, '#b8d8e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff88'; g.beginPath(); g.moveTo(w*0.2, 0); g.lineTo(w*0.35, 0); g.lineTo(w*0.1, h); g.lineTo(0, h); g.closePath(); g.fill(); }, { frame:'#9aa3b8' });
  // rep counter
  let reps = 0, lift = -1;
  const counter = K.panel(scene, cx - 1.2, 2.1, -D/2 + 0.08, 1.8, 0.9, (g, w, h) => {
    g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd166'; H.F(g, 700, 18); g.textAlign = 'center'; g.fillText('REPS', w/2, 24);
    g.fillStyle = '#ffffff'; H.F(g, 700, 46); g.fillText(String(reps), w/2, h - 16);
  }, { frame:'#e5484d' });
  K.hot({ x:cx - 1.2, z:-0.8, label:'Do a rep', obj:bar, use(){ if(lift < 0) lift = 0; } });
  K.tick((dt, t) => {
    let y = 0;
    if(lift >= 0){
      lift += dt*1.4;
      y = Math.sin(Math.min(1, lift)*Math.PI);
      if(lift >= 1){ lift = -1; reps++; counter.redraw(); K.sfx('thud', 0.35); }
    }
    bar.position.y = 1.55 + y*0.7;
    lifter.scale.y = 1.2*(1 - (lift >= 0 ? (1 - y)*0.12 : 0));
    lifter.position.y = Math.sin(t*2)*0.01;
  });
  // kettlebells and a water bottle
  for(let i=0;i<3;i++){ H.ball(0.18 + i*0.03, '#3a3f52', cx - 4.4 + i*0.6, 0.2 + i*0.03, -4.3, scene, 12); H.mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), '#3a3f52', cx - 4.4 + i*0.6, 0.45 + i*0.05, -4.3, scene); }
  K.solid(cx - 3.8, -4.3, 1, 0.3);
  H.cyl(0.1, 0.1, 0.36, '#4fa3c7', cx + 1.6, 0.18, -0.5, scene, 10);
}

function garden(K, r, zone){
  const { THREE, H, D, scene } = K, cx = r.cx;
  // three raised beds
  const plants = [];
  const leaf = ['#6fae4a', '#7fbf57', '#5a9a3c'], bloom = ['#ff8fab', '#ffd166', '#bdb2ff', '#ff9f68'];
  for(let b=0;b<3;b++){
    const bx = cx - 3.2 + b*2.2, bz = 0.2;
    H.box(1.6, 0.5, 2.6, '#b98a5a', bx, 0.25, bz, scene); H.box(1.4, 0.06, 2.4, '#6b4a33', bx, 0.5, bz, scene);
    K.solid(bx, bz, 0.8, 1.3);
    for(let i=0;i<4;i++){
      const p = new THREE.Group(); p.position.set(bx + ((i % 2) - 0.5)*0.6, 0.52, bz - 0.8 + i*0.55); scene.add(p);
      H.cyl(0.03, 0.03, 0.4, '#4a7a30', 0, 0.2, 0, p, 5);
      H.ball(0.2, leaf[(i + b) % 3], 0, 0.42, 0, p, 10).scale.y = 0.7;
      const f = H.ball(0.1, bloom[(i + b*2) % 4], 0.05, 0.56, 0.05, p, 8); f.visible = false;
      p.scale.setScalar(0.45); plants.push({ p, f, s:0.45, to:0.45 });
    }
  }
  // drafting table with a landscape plan
  H.box(2.4, 0.08, 1.5, '#fffaf0', cx + 2.4, 1.2, -3.7, scene).rotation.x = 0.35;
  for(const x of [-1, 1]) H.box(0.08, 1.1, 0.08, '#6b4a33', cx + 2.4 + x, 0.55, -3.7, scene);
  const plan = K.panel(scene, cx + 2.4, 1.26, -3.66, 2.1, 1.3, (g, w, h) => {
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4fa3c7'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20, h - 20); g.bezierCurveTo(w*0.3, h*0.3, w*0.6, h*0.9, w - 20, 24); g.stroke();
    g.fillStyle = '#6fae4a'; for(const [x, y, rr] of [[50,40,16],[90,60,12],[w-60,h-50,20],[w-100,h-30,12],[w*0.5,30,14]]){ g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    g.fillStyle = '#e8c79a'; g.fillRect(w*0.35, h*0.55, 60, 34); g.fillStyle = '#1f2a44'; H.F(g, 700, 13); g.fillText('plan', 10, 16);
  }, { frame:null, px:110 });
  plan.rotation.x = -1.22; plan.position.y = 1.28;
  K.solid(cx + 2.4, -3.7, 1.25, 0.8);
  // watering can
  const can = new THREE.Group(); can.position.set(cx + 3.9, 0, 1.6); scene.add(can);
  H.cyl(0.26, 0.3, 0.5, '#4fa3c7', 0, 0.25, 0, can, 16); const sp = H.cyl(0.03, 0.05, 0.5, '#4fa3c7', 0.36, 0.42, 0, can, 6); sp.rotation.z = -0.9;
  const hd = H.mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 14, Math.PI), '#4fa3c7', 0, 0.5, 0, can);
  K.round(cx + 3.9, 1.6, 0.35);
  // drops
  const drops = [];
  for(let i=0;i<14;i++){ const d = H.ball(0.04, '#7cc6ff', 0, 0, 0, scene, 6); d.visible = false; d.castShadow = false; drops.push({ m:d, v:0 }); }
  let grown = 0, water = 0;
  K.hot({ x:cx - 1, z:2.6, label:'Water the beds', obj:can, use(){
    grown = Math.min(3, grown + 1); water = 1.2;
    plants.forEach(pl => { pl.to = [0.45, 0.75, 1.05, 1.3][grown]; });
    drops.forEach((d, i) => { const pl = plants[(i*5) % plants.length].p; d.m.position.set(pl.position.x + (Math.random() - 0.5)*0.5, 2.2 + Math.random()*0.8, pl.position.z + (Math.random() - 0.5)*0.5); d.v = 0; d.m.visible = true; });
    K.tone(520 + grown*140, 0.2, 'sine', 0.15, 700 + grown*140);
  } });
  K.tick((dt, t) => {
    water = Math.max(0, water - dt);
    for(const pl of plants){ pl.s += (pl.to - pl.s)*Math.min(1, dt*3); pl.p.scale.setScalar(pl.s); pl.p.rotation.z = Math.sin(t*1.5 + pl.p.position.x*3)*0.05; pl.f.visible = pl.s > 0.9; }
    for(const d of drops){ if(!d.m.visible) continue; d.v += dt*9; d.m.position.y -= d.v*dt; if(d.m.position.y < 0.6) d.m.visible = false; }
    can.rotation.z = water > 0 ? Math.sin(water*3)*0.4 : 0;
  });
  // a note on the wall
  K.panel(scene, cx - 2.6, 2.0, -D/2 + 0.08, 2.8, 1.3, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#6fae4a'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#1f2a44'; H.F(g, 700, 21); g.textAlign = 'center';
    wrap(g, 'Landscape design is the interest that keeps growing.', w/2, 52, w - 36, 28);
  }, { frame:'#6fae4a' });
}
