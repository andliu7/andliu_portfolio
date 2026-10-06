// Interior for "skills" (Skills Alley): every language and tool is a thing you can knock, sort or
// light up. A vaulted bowling hall whose pins are skills, with the six languages in neon over the
// seats; a sawtooth-roofed sorting shop where the twelve tools are toy blocks you sort onto shelves
// and tip back out; and an octagonal AI bench whose lamps light up as a check runs and passes.
// F runs each machine; a click knocks a single pin or block (the room's own raycast, see build).
// Built on tour() from clinic.js. Facts come only from zones.js.
import { tour, prng } from './clinic.js';

const LANGS = [['Python', '#ffd166'], ['TypeScript', '#5ab0ff'], ['JavaScript', '#f7df1e'], ['Kotlin', '#b57bff'], ['Java', '#ff8a5b'], ['SQL', '#5ff0e0']];
const PINS = ['Python', 'TypeScript', 'JavaScript', 'Kotlin', 'Java', 'SQL', 'React', 'Node', 'Supabase', 'PostgreSQL'];
const SHELVES = [
  { name:'Web', color:'#e98a5a', tools:['React', 'Vite', 'Tailwind', 'Node'] },
  { name:'Data', color:'#4fa3c7', tools:['Supabase', 'PostgreSQL', 'Firebase', 'MongoDB', 'NumPy'] },
  { name:'Tools', color:'#6fae4a', tools:['Apps Script', 'Git', 'GitHub Actions'] },
];

// the dialog box when dialog.js is loaded; resolves at once without it
const talk = (ctx, o) => { try { return Promise.resolve(ctx.modules.dialog?.say?.(o)); } catch(e){ return Promise.resolve(); } };
const clamp01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
const ease = k => { k = clamp01(k); return k*k*(3 - 2*k); };
// objects flying along an arc to a world point (they live straight in the room scene, so local = world)
function arcTo(jobs, obj, to, dur, arc, done){ jobs.push({ obj, a:obj.position.clone(), b:to.clone(), t:0, dur, arc, done }); }
function stepArcs(jobs, dt){
  for(let i = jobs.length - 1; i >= 0; i--){
    const j = jobs[i]; j.t = Math.min(1, j.t + dt/j.dur);
    j.obj.position.lerpVectors(j.a, j.b, ease(j.t)); j.obj.position.y += Math.sin(j.t*Math.PI)*j.arc;
    if(j.t >= 1){ jobs.splice(i, 1); j.done?.(); }
  }
}

export function build(ctx, { zone }){
  // click to knock: each room pushes a handler that takes the ray and returns true when it used the click
  const clicks = [], ray = new ctx.THREE.Raycaster(), ndc = new ctx.THREE.Vector2();
  let room = null;
  function onDown(e){
    if(!room || ctx.state.interior !== room || e.button !== 0) return;
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -(e.clientY - rect.top)/rect.height*2 + 1);
    ray.setFromCamera(ndc, room.camera);
    for(const f of clicks) if(f(ray)) return;
  }
  room = tour(ctx, zone, {
    bg:'#141a33', bgTop:'#2c3563', seed:21, dark:'#2b3a67',
    onEnter(){ ctx.renderer.domElement.addEventListener('pointerdown', onDown); },
    onExit(){ ctx.renderer.domElement.removeEventListener('pointerdown', onDown); },
    rooms: [
      { key:'hall', name:'Bowling Hall', w:15, tall:4.2, roof:'vault', rise:2.6, view:'sky', floor:'#e8c890', floorLine:'#d3ae70', wall:'#2b3a67', wall2:'#34467a', wallKind:'stripes', trim:'#e98a5a', dark:'#1f2a4d', beam:'#e98a5a', exitX:-4,
        build(K, r){ hall(K, r, ctx, clicks); } },
      { key:'workshop', name:'Sorting Shop', w:13, tall:4.2, roof:'sawtooth', rise:1.4, floorKind:'concrete', floor:'#c9c3b8', floorLine:'#a8a196', wall:'#c96f4f', wall2:'#b25b3d', wallKind:'brick', trim:'#8a4a34', dark:'#4a3a33', beam:'#3d4a5c',
        build(K, r){ workshop(K, r, ctx, clicks); } },
      { key:'ai', name:'AI Bench', w:11, shape:'oct', tall:4.2, roof:'dome', rise:2.0, floorKind:'tiles', floor:'#23304f', floorLine:'#33426a', wall:'#2f6f7a', wall2:'#357f8b', wallKind:'boards', dark:'#1f2a4d', poche:'#141a33', beam:'#9bd3e6', shaftColor:'#bfe9ff',
        build(K, r){ bench(K, r, ctx); } },
    ],
  });
  return room;
}

// ---------- 1. Bowling hall: knock the skill pins, light the languages ----------
function hall(K, r, ctx, clicks){
  const { THREE, H, D, scene, S } = K, cx = r.cx, LX = cx + 2.6, z0 = -D/2 + 0.4, z1 = 3.0;
  // the lane: maple boards, gutters, arrows, a masking unit over the pins
  const laneTex = H.canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#f1d9a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e2c38c'; for(let i=0;i<8;i++) g.fillRect(i*8, 0, 1, h); g.fillStyle = '#e98a5a'; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(10 + i*11, h*0.72); g.lineTo(6 + i*11, h*0.76); g.lineTo(14 + i*11, h*0.76); g.fill(); } });
  const lane = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, z1 - z0), new THREE.MeshStandardMaterial({ map:laneTex.tex, roughness:0.35 }));
  lane.position.set(LX, 0.04, (z0 + z1)/2); lane.receiveShadow = true; S.add(lane);
  for(const s of [-1, 1]){ K.box(0.35, 0.06, z1 - z0, '#8a95a8', LX + s*1.08, 0.03, (z0 + z1)/2).castShadow = false; K.box(0.12, 0.3, z1 - z0, '#1f2a4d', LX + s*1.32, 0.15, (z0 + z1)/2); }
  K.solid(LX, (z0 + z1)/2, 1.4, (z1 - z0)/2);
  K.box(2.9, 0.9, 0.7, '#1f2a4d', LX, 3.1, z0 + 0.6);
  K.pool(LX, z0 + 1.2, 2.6, 2.4, '#fff1d0', 0.3);
  // ten pins in a triangle, apex toward you: instanced bodies and bands (two draw calls)
  const prof = [[0,0],[0.08,0],[0.1,0.08],[0.115,0.2],[0.085,0.36],[0.055,0.45],[0.07,0.53],[0.055,0.62],[0,0.66]].map(([a, b]) => new THREE.Vector2(a*1.35, b*1.35));
  const pinBody = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 14), new THREE.MeshStandardMaterial({ color:'#fbfbf7', roughness:0.4 }), 10);
  const pinBand = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12).translate(0, 0.62, 0), new THREE.MeshStandardMaterial({ color:'#e98a5a', roughness:0.5 }), 10);
  pinBody.castShadow = true; pinBody.frustumCulled = pinBand.frustumCulled = false; scene.add(pinBody, pinBand);   // pins fall outside the first bounds
  const pins = [], rows = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]], headZ = z0 + 1.9, po = new THREE.Object3D();
  rows.forEach((row, ri) => row.forEach((idx, j) => { pins.push({ home:new THREE.Vector3(LX + (j - (row.length - 1)/2)*0.34, 0.08, headZ - ri*0.3), idx, down:0, fall:0, dir:0, back:0 }); }));
  function placePins(){
    pins.forEach((p, i) => {
      if(p.down){ po.rotation.set(-Math.cos(p.dir)*p.fall*1.5, 0, -Math.sin(p.dir)*p.fall*1.5); po.position.set(p.home.x + Math.sin(p.dir)*p.fall*0.35, 0.08, p.home.z - Math.cos(p.dir)*p.fall*0.1 - p.fall*0.25); }
      else { po.rotation.set(0, 0, 0); po.position.copy(p.home); }
      po.updateMatrix(); pinBody.setMatrixAt(i, po.matrix); pinBand.setMatrixAt(i, po.matrix);
    });
    pinBody.instanceMatrix.needsUpdate = pinBand.instanceMatrix.needsUpdate = true;
  }
  placePins();
  // the scoreboard: the pin triangle with each skill's name, knocked ones light up
  let knocked = [], msg = 'SKILLS ALLEY';
  const board = K.panel(scene, LX, 3.5, z0 - 0.15, 3.2, 1.3, (g, w, h) => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e98a5a'; H.F(g, 700, 18); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(msg, w/2, 22);
    rows.slice().reverse().forEach((row, ri) => row.forEach((idx, j) => {
      const x = w/2 + (j - (row.length - 1)/2)*84, y = 44 + ri*24, on = knocked.includes(idx);
      g.fillStyle = on ? '#ffd166' : '#2c3563'; H.rr(g, x - 40, y - 10, 80, 20, 10); g.fill();
      g.fillStyle = on ? '#10162e' : '#9aa6d6'; H.F(g, 700, 11); g.fillText(PINS[idx], x, y + 4);
    }));
  }, { frame:'#e98a5a' });
  // ball, ball return, seats
  const ball = H.ball(0.22, '#3b4f9e', LX, 0.3, z1 + 0.6, scene, 20); ball.material = new THREE.MeshStandardMaterial({ color:'#3b4f9e', roughness:0.25, metalness:0.1 });
  K.box(0.7, 0.5, 1.6, '#1f2a4d', LX - 1.8, 0.25, z1 + 0.5); K.solid(LX - 1.8, z1 + 0.5, 0.35, 0.8);
  for(const [i, c] of ['#e98a5a', '#6fae4a', '#d6689a'].entries()) H.ball(0.2, c, LX - 1.8, 0.66, z1 + i*0.42, S, 16);
  for(let i=0;i<4;i++){ const x = cx - 5.8 + i*1.0; K.cyl(0.4, 0.3, 0.45, '#e98a5a', x, 0.22, -1.6, S, 18); K.box(0.8, 0.7, 0.12, '#e98a5a', x, 0.75, -1.95); }
  K.solid(cx - 4.3, -1.7, 2.0, 0.45);
  K.info(cx - 6.0, -D/2 + 0.08, { y:2.0, w:2.2, h:1.2, padZ:2.9 });
  K.pendant(cx - 4.3, 4.2, -1.2, '#e98a5a', '#ffe0a8', { drop:1.6 });
  // roll: a curving ball, pins in its path fall, the board names what went down
  const rnd = prng(5);
  let roll = -1, bx0 = 0, curve = 0, strikes = 0;
  const lines = { strike:'Strike! Every skill down.', some:n => `${n} down. Roll again?`, none:'Gutter ball. It happens.' };
  K.hot({ x:LX, z:z1 + 1.6, label:'Roll a ball', obj:ball, use(){ if(roll >= 0) return; roll = 0; pins.forEach(q => { q.down = 0; q.fall = 0; q.back = 0; }); placePins(); bx0 = LX + (rnd() - 0.5)*0.9; curve = (rnd() - 0.5)*0.8; knocked = []; K.tone(110, 0.8, 'triangle', 0.06, 80); } });
  K.hot({ x:cx + 0.2, z:3.6, label:'Bowl on the island lane', padColor:'#e98a5a', use(){ ctx.modules.games?.start?.('bowling'); } });
  K.sign(scene, 'Island lane', cx + 0.2, 1.4, 3.3, { w:1.6, h:0.36, bg:'#e98a5a', fg:'#ffffff' });

  // the six languages in neon over the seats: each press lights one more, a seventh switches them off
  let lit = 0, flash = 0;
  const neon = K.panel(scene, cx - 3.2, 3.3, -D/2 + 0.08, 3.4, 1.0, (g, w, h) => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    LANGS.forEach(([name, c], i) => {
      const x = w*(0.18 + (i % 3)*0.32), y = h*(i < 3 ? 0.3 : 0.72), on = i < lit;
      H.F(g, 700, 30); g.lineWidth = 3;
      if(on){ g.shadowColor = c; g.shadowBlur = 18; g.fillStyle = flash > 0 && (i + ((flash*8)|0)) % 2 ? '#ffffff' : c; g.fillText(name, x, y); g.fillText(name, x, y); g.shadowBlur = 0; }
      else { g.strokeStyle = '#3a4166'; g.strokeText(name, x, y); }
    });
  }, { frame:'#2c3563', px:120 });
  const neonPool = K.pool(cx - 3.2, -D/2 + 1.6, 4.4, 2.6, '#b5a6ff', 0, 0.03);
  K.hot({ x:cx - 3.2, z:-D/2 + 2.9, label:'Light the languages', obj:neon, use(){
    if(lit >= LANGS.length){ lit = 0; K.tone(90, 0.3, 'square', 0.03, 60); }
    else { lit++; K.tone(120, 0.06, 'square', 0.03); setTimeout(() => K.tone(520 + lit*70, 0.18, 'sine', 0.06), 70); if(lit === LANGS.length){ flash = 1.2; K.say([cx - 3.2, 4.3, -D/2 + 0.6], 'Python, TypeScript, JavaScript, Kotlin, Java, SQL.', { pitch:620, dur:3.5 }); } }
    neon.redraw();
  } });

  // click a pin to knock just that skill over; it stands back up after a moment
  clicks.push(ray => {
    if(roll >= 0) return false;
    const hit = ray.intersectObject(pinBody, false)[0]; if(hit?.instanceId == null) return false;
    const q = pins[hit.instanceId]; if(q.down) return true;
    q.down = 1; q.fall = 0; q.dir = (rnd() - 0.5)*2.4; q.back = 2.6;
    knocked = knocked.filter(k => k >= 0 && k !== q.idx).concat(q.idx); msg = PINS[q.idx].toUpperCase(); board.redraw();
    K.sfx('clink', 1.2); K.tone(380 + q.idx*40, 0.1, 'triangle', 0.06);
    K.say([q.home.x, 1.4, q.home.z], PINS[q.idx], { pitch:600, dur:1.6 });
    return true;
  });
  // a bowler by the ball return who hops when pins fall and spins on a strike
  const BY = Math.PI - 0.7, bowler = K.buddy(scene, '#5ff0e0', LX - 1.0, z1 + 1.9, BY, 0.9, '#e98a5a'); K.round(LX - 1.0, z1 + 1.9, 0.35);
  let cheer = 0, spinCheer = false;

  K.tick((dt, t, p, n) => {
    cheer = Math.max(0, cheer - dt);
    bowler.position.y = cheer > 0 ? Math.abs(Math.sin(cheer*9))*0.3 : Math.abs(Math.sin(t*2))*0.02;
    bowler.rotation.y = BY + (spinCheer && cheer > 0 ? (1 - cheer/1.4)*Math.PI*4 : 0);
    neonPool.material.opacity = lit/LANGS.length*0.28 + (lit ? Math.sin(t*7)*0.015 : 0);
    if(flash > 0){ flash = Math.max(0, flash - dt); if(n % 2 === 0) neon.redraw(); }
    if(roll >= 0){
      roll += dt;
      const k = Math.min(1, roll/1.5), z = (z1 + 0.6) + (z0 + 0.9 - (z1 + 0.6))*k, x = bx0 + curve*k*k;
      if(roll < 1.6){ ball.position.set(x, 0.3, z); ball.rotation.x -= dt*18; }
      // contact: pins close to the ball's line fall, and knock the ones behind them
      if(k > 0.85 && !knocked.length && roll < 1.7){
        const hit = pins.map((q, i) => ({ i, d:Math.abs(q.home.x - x) })).filter(o => o.d < 0.42 + rnd()*0.12);
        const set = new Set(hit.map(o => o.i));
        for(let pass=0;pass<2;pass++) pins.forEach((q, i) => { if(set.has(i)) return; for(const j of set){ const w = pins[j]; if(q.home.z < w.home.z && Math.abs(q.home.x - w.home.x) < 0.4 && rnd() < 0.65){ set.add(i); break; } } });
        knocked = [...set].map(i => pins[i].idx);
        set.forEach(i => { const q = pins[i]; q.down = 1; q.fall = 0; q.dir = Math.atan2(q.home.x - x, -1) + (rnd() - 0.5); });
        if(!knocked.length) knocked = [-1];
        const nd = set.size; msg = nd === 10 ? 'STRIKE!' : nd ? `${nd} DOWN` : 'GUTTER'; board.redraw();
        if(nd){ K.sfx('thud', 3); for(let i=0;i<Math.min(5, nd);i++) setTimeout(() => K.sfx('clink', 2), 40 + i*50); }
        if(nd === 10) strikes++;
        if(nd >= 4){ cheer = 1.4; spinCheer = nd === 10; }
        K.say([LX, 1.9, headZ - 0.45], nd === 10 ? lines.strike : nd ? lines.some(nd) : lines.none, { pitch:560 });
      }
      if(roll > 1.6) ball.position.set(LX - 1.8, 0.66, z1 + 1.1);
      if(roll > 4.2){
        roll = -1; pins.forEach(q => { q.down = 0; q.fall = 0; }); placePins();
        ball.position.set(LX, 0.3, z1 + 0.6); knocked = []; msg = 'SKILLS ALLEY'; board.redraw();
      }
    }
    let moving = false;
    if(roll < 0) for(const q of pins) if(q.back > 0){
      q.back -= dt;
      if(q.back <= 0){ q.down = 0; q.fall = 0; moving = true; knocked = knocked.filter(k => k !== q.idx); if(!knocked.length) msg = 'SKILLS ALLEY'; board.redraw(); K.tone(300, 0.08, 'triangle', 0.04); }
    }
    for(const q of pins) if(q.down && q.fall < 1){ q.fall = Math.min(1, q.fall + dt*4); moving = true; }
    if(moving) placePins();
  });
  K.stop('Bowling hall', 'A vaulted hall with one lane. Each pin is a skill: Python, TypeScript, JavaScript, Kotlin, Java, SQL, React, Node, Supabase and PostgreSQL. Press F on the pad to roll, and the board shows which ones went down. Click any pin to knock over just that one.', [LX, 3.0, z0 + 1.6]);
  K.stop('The languages', 'Six languages in neon over the seats: Python, TypeScript, JavaScript, Kotlin, Java and SQL. Press F under the sign to light them one at a time.', [cx - 3.2, 3.3, -D/2 + 0.8]);
}

// ---------- 2. Sorting shop: the twelve tools are toy blocks; sort them onto shelves, tip them out ----------
function workshop(K, r, ctx, clicks){
  const { THREE, H, D, scene, S } = K, cx = r.cx, BZ = -D/2;
  // one atlas for every block face: 4 x 3 cells, coloured by shelf, the tool's name in the middle
  const all = SHELVES.flatMap((sh, si) => sh.tools.map(name => ({ name, si })));
  const atlas = H.canvasTex(1024, 768, g => {
    all.forEach(({ name, si }, i) => {
      const x = (i % 4)*256, y = Math.floor(i/4)*256;
      g.fillStyle = SHELVES[si].color; g.fillRect(x, y, 256, 256);
      g.fillStyle = '#fffaf0'; H.rr(g, x + 18, y + 18, 220, 220, 34); g.fill();
      g.fillStyle = SHELVES[si].color; H.rr(g, x + 30, y + 30, 196, 196, 26); g.fill();
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = name.split(' '); let fs = 58; H.F(g, 700, fs);
      while(fs > 26 && Math.max(...words.map(wd => g.measureText(wd).width)) > 180){ fs -= 2; H.F(g, 700, fs); }
      words.forEach((wd, k) => g.fillText(wd, x + 128, y + 128 + (k - (words.length - 1)/2)*fs*1.05));
    });
  });
  const blockMat = new THREE.MeshStandardMaterial({ map:atlas.tex, roughness:0.6 });
  const SZ = 0.5;
  const blocks = all.map(({ name, si }, i) => {
    const geo = new THREE.BoxGeometry(SZ, SZ, SZ), uv = geo.attributes.uv;
    const c = i % 4, rw = Math.floor(i/4);
    for(let k=0;k<uv.count;k++) uv.setXY(k, (c + uv.getX(k))/4, 1 - (rw + 1)/3 + uv.getY(k)/3);   // every face shows this block's cell
    const m = new THREE.Mesh(geo, blockMat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    return { m, name, si, spin:0, hop:false };
  });
  // three shelves along the back wall, one per group, with a label over each
  const SY = 0.9, SHZ = BZ + 0.55, spots = [];
  SHELVES.forEach((sh, si) => {
    const sx = cx + (si - 1)*3.9, n = sh.tools.length, sw = n*0.64 + 0.2;
    K.box(sw, SY, 0.7, '#8a6440', sx, SY/2, SHZ); K.box(sw + 0.1, 0.06, 0.8, sh.color, sx, SY + 0.03, SHZ);
    K.solid(sx, SHZ, sw/2, 0.4);
    K.sign(scene, sh.name, sx, 2.1, BZ + 0.1, { w:1.5, h:0.5, bg:sh.color, fg:'#ffffff' });
    sh.tools.forEach((_, k) => spots.push(new THREE.Vector3(sx + (k - (n - 1)/2)*0.64, SY + 0.06 + SZ/2, SHZ)));
  });
  // the pile on the floor: a seeded heap, three layers
  const PX = cx - 3.2, PZ = -1.4, q = prng(12), pile = [];
  const ring = (n, rad, y) => { for(let k=0;k<n;k++){ const a = k/n*Math.PI*2 + q()*0.4; pile.push({ p:new THREE.Vector3(PX + Math.cos(a)*rad, y, PZ + Math.sin(a)*rad), r:[(q() - 0.5)*0.5, q()*6, (q() - 0.5)*0.5] }); } };
  ring(1, 0, SZ/2); ring(7, 0.62, SZ/2); ring(4, 0.36, SZ*1.5);
  K.cyl(1.2, 1.2, 0.02, '#e0d2b8', PX, 0.01, PZ, S, 28).castShadow = false; K.round(PX, PZ, 1.05);
  blocks.forEach((b, i) => { b.m.position.copy(pile[i].p); b.m.rotation.set(...pile[i].r); });
  // workbench with a counter board
  const WX = cx + 2.6, WZ = -1.6;
  K.box(2.4, 0.1, 1.0, '#b98a5a', WX, 0.95, WZ); for(const [ox, oz] of [[-1.1,-0.4],[1.1,-0.4],[-1.1,0.4],[1.1,0.4]]) K.box(0.1, 0.9, 0.1, '#4a3a33', WX + ox, 0.45, WZ + oz);
  K.box(0.4, 0.25, 0.3, '#3d4a5c', WX + 0.8, 1.12, WZ); K.solid(WX, WZ, 1.25, 0.55);
  let sorted = false, busy = 0, count = 0, last = '';
  const disp = K.panel(scene, WX - 0.3, 1.55, WZ - 0.35, 1.6, 0.7, (g, w, h) => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#9aa6d6'; H.F(g, 700, 14); g.fillText(`SORTED ${count} OF ${blocks.length}`, w/2, 16);
    g.fillStyle = '#ffd166'; let fs = 30; H.F(g, 700, fs); const txt = last || (sorted ? 'All sorted' : 'Press F to sort'); while(fs > 12 && g.measureText(txt).width > w - 16){ fs--; H.F(g, 700, fs); } g.fillText(txt, w/2, h*0.62);
  }, { frame:'#3d4a5c', px:110 });
  const jobs = [];
  function sortOrScatter(){
    if(busy || jobs.length) return false;
    if(!sorted){
      busy = blocks.length; count = 0;
      blocks.forEach((b, i) => setTimeout(() => { b.spin = 9; arcTo(jobs, b.m, spots[i], 0.55, 1.4, () => { b.spin = 0; b.m.rotation.set(0, 0, 0); count++; last = b.name; disp.redraw(); K.sfx('clink', 0.5); K.tone(420 + b.si*120 + (i % 4)*30, 0.07, 'triangle', 0.05); if(--busy === 0){ sorted = true; last = ''; disp.redraw(); cheer = 1.6; K.say([cx, 2.8, SHZ + 0.6], 'Web, data and tools, all on their shelves.', { pitch:640 }); } }); }, i*140));
    } else {
      busy = blocks.length; K.sfx('thud', 1.2);
      blocks.forEach((b, i) => setTimeout(() => { b.spin = 12; arcTo(jobs, b.m, pile[i].p, 0.6, 1.0 + (i % 3)*0.3, () => { b.spin = 0; b.m.rotation.set(...pile[i].r); K.sfx('clink', 0.3); if(--busy === 0){ sorted = false; count = 0; last = ''; disp.redraw(); } }); }, (i % 6)*60));
    }
    return true;
  }
  const PAD = { x:cx - 0.2, z:-2.3 };
  K.hot({ x:PAD.x, z:PAD.z, label:'Sort the blocks', obj:blocks[0].m, use(){ sortOrScatter(); } });
  // click a block to knock it into the air; the bench display reads its name
  const hitList = blocks.map(b => b.m);
  clicks.push(ray => {
    const hit = ray.intersectObjects(hitList, false)[0]; if(!hit) return false;
    const i = hitList.indexOf(hit.object), b = blocks[i]; if(busy || b.hop) return true;
    b.hop = true; b.spin = 11; last = b.name; disp.redraw(); K.sfx('clink', 0.4); K.tone(420 + b.si*120 + (i % 4)*30, 0.09, 'triangle', 0.06);
    arcTo(jobs, b.m, b.m.position, 0.55, 0.8, () => { b.hop = false; b.spin = 0; if(sorted) b.m.rotation.set(0, 0, 0); else b.m.rotation.set(...pile[i].r); });
    return true;
  });
  // a shop hand by the bench who cheers when every block is on its shelf
  const hand = K.buddy(scene, '#ffd166', cx + 5.0, 2.4, -2.6, 0.95, '#3d4a5c'); K.round(cx + 5.0, 2.4, 0.36);
  let cheer = 0;
  K.tick((dt, t) => {
    stepArcs(jobs, dt); for(const b of blocks) if(b.spin){ b.m.rotation.x += dt*b.spin; b.m.rotation.y += dt*b.spin*0.7; }
    cheer = Math.max(0, cheer - dt);
    hand.position.y = cheer > 0 ? Math.abs(Math.sin(cheer*8))*0.32 : Math.abs(Math.sin(t*1.8))*0.02;
    hand.rotation.y = -2.6 + (cheer > 0 ? Math.sin(cheer*10)*0.4 : Math.sin(t*0.7)*0.25);
  });
  K.lamp('#ffe2b0', cx, 2.8, -1.6, 4, 7);
  K.stop('The sorting shop', 'Every tool is a toy block: React, Vite, Tailwind, Node, Supabase, PostgreSQL, Firebase, MongoDB, NumPy, Apps Script, Git and GitHub Actions. Press F and they hop onto the web, data and tools shelves; press again to tip them all back out.', [cx, 2.8, -2.6]);
  K.stop('Knock a block', 'Click any block to knock it into the air. The display on the bench reads out its name.', [PX, 2.0, PZ]);
}

// ---------- 3. AI bench: spec, agent, live run; the lamps light as the check runs and passes ----------
function bench(K, r, ctx){
  const { THREE, H, scene } = K, cx = r.cx, cz = r.cz;
  // three screens in an arc: spec, agent, live run
  const labels = ['SPEC', 'AGENT', 'LIVE RUN'], st = [{}, {}, {}], place = [];
  const screens = labels.map((lab, i) => {
    const a = -Math.PI/2 + (i - 1)*0.62, rr = 3.2, x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr, ry = -(a + Math.PI/2);
    K.box(1.9, 0.9, 0.7, '#1f2a4d', x, 0.45, z).rotation.y = ry;
    K.solid(x, z, 0.95, 0.35, ry);
    place.push({ x:x - Math.cos(a)*0.1, z:z - Math.sin(a)*0.1, ry });
    return K.panel(scene, x - Math.cos(a)*0.1, 1.75, z - Math.sin(a)*0.1, 1.7, 1.15, (g, w, h) => draw(g, w, h, i), { frame:'#9bd3e6', rotY:ry });
  });
  function draw(g, w, h, i){
    const s = st[i], p = s.p || 0;
    g.fillStyle = '#0c1226'; g.fillRect(0, 0, w, h); g.textBaseline = 'alphabetic';
    g.fillStyle = '#9bd3e6'; H.F(g, 700, 13); g.textAlign = 'left'; g.fillText(labels[i], 8, 16);
    H.F(g, 600, 11, 'monospace');
    if(i === 0){
      const L = ['what done looks like:', '  [ ] page loads', '  [ ] entry saves', '  [ ] matches the spec'];
      L.forEach((l, k) => { if(p > k*0.2){ g.fillStyle = k ? '#e8f6fb' : '#ffd166'; g.fillText(l, 8, 36 + k*16); } });
    } else if(i === 1){
      g.fillStyle = '#cdb4db'; g.fillText('Claude + Gemini APIs', 8, 34);
      const L = ['draft change', 'write code', s.fix ? 'fix: save handler' : 'hand to live run'];
      L.forEach((l, k) => { if(p > 0.2 + k*0.2){ g.fillStyle = s.fix && k === 2 ? '#ff8fab' : '#e8f6fb'; g.fillText('> ' + l, 8, 54 + k*16); } });
      if(p > 0 && p < 1){ g.fillStyle = '#5ff0e0'; g.fillRect(8 + ((p*400)|0)%(w - 30), h - 14, 14, 4); }
    } else {
      ['page loads', 'entry saves', 'matches spec'].forEach((l, k) => {
        if(!(s.run > k*0.3)) return;
        const ok = s.pass || k !== 1;
        g.fillStyle = ok ? '#6fae4a' : '#d9534f'; g.beginPath(); g.arc(16, 32 + k*20, 6, 0, 7); g.fill();
        g.fillStyle = '#e8f6fb'; g.fillText(l + (ok ? '  ok' : '  failed'), 28, 36 + k*20);
      });
      if(s.pass && s.run > 1){ g.fillStyle = '#6fae4a'; H.F(g, 700, 12); g.fillText('Verified on a live run', 8, h - 10); }
    }
  }
  // four lamps over the screens: Spec, Claude, Gemini, Live run
  const LAMPS = [['Spec', '#ffd166', 0, 0], ['Claude', '#e98a5a', 1, -0.45], ['Gemini', '#8fb5ff', 1, 0.45], ['Live run', '#6fae4a', 2, 0]];
  const bulbGeo = new THREE.SphereGeometry(0.16, 14, 10), OFF = new THREE.Color('#3a4166');
  const lamps = LAMPS.map(([name, c, si, off]) => {
    const pl = place[si], ca = Math.cos(pl.ry), sa = Math.sin(pl.ry), x = pl.x + ca*off, z = pl.z - sa*off;
    K.cyl(0.03, 0.03, 0.4, '#9bd3e6', x, 2.65, z, K.S, 6);
    const mat = new THREE.MeshBasicMaterial({ color:OFF.clone(), toneMapped:false });
    const m = new THREE.Mesh(bulbGeo, mat); m.position.set(x, 3.0, z); scene.add(m);
    K.sign(scene, name, x, 3.35, z, { w:0.9, h:0.26, bg:'#1f2a4d', fg:'#ffffff', rotY:pl.ry });
    return { m, mat, on:new THREE.Color(c), want:0, lvl:0, fail:false };
  });
  const redraw = () => screens.forEach(s => s.redraw());
  // a helper robot with a voice
  const bot = new THREE.Group(); bot.position.set(cx, 0, cz + 0.2); scene.add(bot);
  H.box(0.7, 0.6, 0.5, '#c9ced8', 0, 0.55, 0, bot); const head = new THREE.Group(); head.position.y = 1.05; bot.add(head);
  H.box(0.6, 0.45, 0.45, '#e8ecf2', 0, 0, 0, head); K.eyes(head, 0.02, 0.23, 0.13, 0.06);
  H.cyl(0.02, 0.02, 0.25, '#8a95a8', 0, 0.35, 0, head, 6); H.ball(0.06, '#9bf6ff', 0, 0.5, 0, head, 10);
  K.round(cx, cz + 0.2, 0.5);
  let run = -1, told = false;
  const say = ['Spec first: what does done look like?', 'Drafting with the Claude and Gemini APIs.', 'Live run says the save failed. Fixing.', 'Rerun passes. Now it is done.'];
  function check(){
    if(run >= 0 && run < 9) return false;
    run = 0; st.forEach(s => { for(const k in s) delete s[k]; }); redraw();
    lamps.forEach(l => { l.want = 0; l.fail = false; });
    K.say(head, say[0], { pitch:760, y:0.9 });
    if(!told){ told = true; talk(ctx, { name:'Helper bot', portrait:'robot', lines:['Agentic coding, LLM API integration with Claude and Gemini, and spec design.', 'The last step is always the same: check the AI output against a live run.'] }); }
    return true;
  }
  K.hot({ x:cx, z:cz + 1.9, label:'Run the check', obj:bot, use(){ check(); } });
  K.tick((dt, t, p, n) => {
    head.rotation.y = Math.sin(t*0.9)*0.3; bot.position.y = Math.abs(Math.sin(t*2.4))*0.04;
    // lamps ease toward their state; a failed live run blinks red
    lamps.forEach(l => {
      l.lvl += (l.want - l.lvl)*Math.min(1, dt*6);
      if(l.fail) l.mat.color.set((t*6|0) % 2 ? '#d9534f' : '#5a2430'); else l.mat.color.copy(OFF).lerp(l.on, l.lvl);
      l.m.scale.setScalar(1 + l.lvl*0.25 + (l.want && l.lvl < 0.95 ? Math.sin(t*20)*0.05 : 0));
    });
    if(r.shaft) r.shaft.material.opacity = 0.2 + (lamps[3].lvl > 0.5 && !lamps[3].fail ? 0.12 + Math.sin(t*4)*0.04 : 0);
    if(run < 0) return;
    const prev = run; run += dt;
    const cross = s => prev < s && run >= s;
    if(cross(0.3)){ lamps[0].want = 1; K.tone(520, 0.1, 'sine', 0.06); }
    if(cross(1.6)){ K.say(head, say[1], { pitch:760, y:0.9 }); lamps[1].want = lamps[2].want = 1; K.tone(660, 0.1, 'sine', 0.06); }
    if(cross(4.2)){ K.say(head, say[2], { pitch:700, y:0.9 }); lamps[3].fail = true; lamps[3].want = 0; K.tone(220, 0.25, 'square', 0.05); }
    if(cross(6.4)){ lamps[3].fail = false; lamps[3].want = 1; }
    if(cross(7.0)){ K.say(head, say[3], { pitch:820, y:0.9 }); K.tone(660, 0.15, 'sine', 0.08); setTimeout(() => K.tone(990, 0.2, 'sine', 0.08), 140); }
    if(n % 3 === 0){
      st[0].p = Math.min(1, run/1.4);
      st[1].p = Math.min(1, Math.max(0, (run - 1.4)/1.8)); st[1].fix = run > 4.8;
      st[2].run = run < 5.2 ? Math.max(0, run - 3.2) : Math.max(0, run - 6.2); st[2].pass = run > 6.2;
      redraw();
    }
    if(run > 11){ run = -1; lamps.forEach(l => l.want = 0); }
  });
  K.stop('The AI bench', 'Agentic coding here always ends the same way: write the spec, let the agent draft with the Claude and Gemini APIs, then check the output against a live run. Press F and watch the lamps: the live run fails once, gets fixed and passes.', [cx, 3.0, cz]);
  K.stop('Four lamps', 'The lamps over the screens are the steps: Spec, Claude, Gemini and Live run. The live run lamp blinks red before it goes green, because AI output is checked against a live run before it counts.', [cx, 3.3, cz - 3.0]);
}
