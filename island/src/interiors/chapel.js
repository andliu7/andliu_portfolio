// Interior for "chapel" (Focus Family, Kharis Campus Ministry): a warm timber sanctuary with a
// greeter at the door, friends in the pews and the point-of-contact board where advisors, officers
// and leaders each ring in and get a cord to Andrew; the round
// Focus Family circle where one message travels from the leader to advisors, officers, leaders and
// 25+ students, and the digest room where an Apps Script machine reads the master calendar and the
// shared folders, summarizes them through the Gemini API and sends the weekly digest.
// The cross is fixed: static meshes on the back wall, never a hotspot, never moved or animated.
// Built on tour() from clinic.js. Facts come only from zones.js.
import { tour } from './clinic.js';

// the dialog box when dialog.js is loaded; resolves at once without it
const talk = (ctx, o) => { try { return Promise.resolve(ctx.modules.dialog?.say?.(o)); } catch(e){ return Promise.resolve(); } };
const clamp01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
const ease = k => { k = clamp01(k); return k*k*(3 - 2*k); };

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg:'#1c140e', bgTop:'#4a3322', seed:7, dark:'#6b4a33', hemi:1.15, sunColor:'#ffe6c4',
    rooms: [
      { key:'sanctuary', name:'Sanctuary', w:14, tall:5.0, roof:'truss', rise:2.6, trussTo:-0.4, view:'dusk', floor:'#c99b6a', floorLine:'#b0845a', wall:'#fbf1dc', wall2:'#f4e6c8', wallKind:'plain', trim:'#ecd9b0', dark:'#7a5236',
        build(K, r){ sanctuary(K, r, ctx); } },
      { key:'circle', name:'Focus Family Circle', w:12, shape:'round', tall:4.4, roof:'dome', rise:2.2, floorKind:'herring', floor:'#e9d3ae', floorLine:'#d2b88c', wall:'#fdf0e0', wall2:'#f6dfc4', wallKind:'boards', dark:'#8a6440', poche:'#5a3f2a', beam:'#8a6440',
        build(K, r){ circle(K, r, ctx); } },
      { key:'digest', name:'Digest Room', w:12, tall:5.6, floor:'#b98a5a', floorLine:'#a0764c', wall:'#eef1e6', wall2:'#e2e7d6', wallKind:'boards', trim:'#d6dcc6', dark:'#6b4a33',
        build(K, r){ digest(K, r, ctx); } },
    ],
  });
}

// ---------- 1. Sanctuary: chancel and cross, lancet windows, pews, a candle stand ----------
function sanctuary(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // a raised chancel across the back, three wide steps up the middle
  const lv = K.level({ x0:cx - 4.6, x1:cx + 4.6, z0:-D/2, z1:-D/2 + 2.6, h:0.45, color:'#b98a5a', edge:'#7a5236', rails:false, stairs:[{ side:'front', a:cx - 2, b:cx + 2 }] });
  // the cross: simple, fixed, with warm light washing the wall behind it
  K.box(0.28, 2.7, 0.16, '#7a5236', cx, lv.h + 2.25, -D/2 + 0.1);
  K.box(1.5, 0.28, 0.16, '#7a5236', cx, lv.h + 2.85, -D/2 + 0.1);
  K.pool(cx, -D/2 + 0.02, 3.6, 4.4, '#ffd89a', 0.22, lv.h + 2.3).rotation.x = 0;
  // a plain table on the chancel with two small vases
  K.box(2.4, 0.9, 0.9, '#fbf6ea', cx, lv.h + 0.45, -D/2 + 1.4); K.box(2.6, 0.08, 1.05, '#c9a24a', cx, lv.h + 0.94, -D/2 + 1.4);
  for(const s of [-1, 1]){ K.cyl(0.13, 0.1, 0.28, '#fbf6ea', cx + s*0.95, lv.h + 1.12, -D/2 + 1.4, S, 10); for(let i=0;i<4;i++) H.ball(0.08, ['#ffd166','#ff8fab','#ffffff','#b5e48c'][i], cx + s*0.95 + Math.cos(i*1.6)*0.09, lv.h + 1.32, -D/2 + 1.4 + Math.sin(i*1.6)*0.09, S, 8); }
  K.solid(cx, -D/2 + 1.4, 1.3, 0.55);
  // tall lancet windows, light falling across the floor
  for(const dx of [-4.6, -2.4, 2.4, 4.6]) K.win(cx + dx, 2.9, -D/2 + 0.02, 0, 0.95, 3.4, { shape:'lancet', kind:'dusk', frame:'#7a5236', rows:3, beamTo:[cx + dx*1.05 + 0.4, -D/2 + 7.2], beamR:[0.45, 0.8], beamColor:'#ffd9a0', beamOpacity:0.16 });
  K.lamp('#ffcf8a', cx, 4.2, -2.5, 5, 10);
  // pews in two blocks with a centre aisle and a runner
  for(const side of [-1, 1]){
    const bx = cx + side*3.2;
    for(let k=0;k<5;k++){
      const z = -1.0 + k*1.1;
      K.box(3.8, 0.1, 0.5, '#8a5a3a', bx, 0.45, z); K.box(3.8, 0.7, 0.08, '#7a5236', bx, 0.85, z + 0.27);
      for(const e of [-1.9, 1.9]) K.box(0.08, 0.95, 0.6, '#6b4a33', bx + e, 0.47, z + 0.05);
    }
    K.solid(bx, 1.25, 1.95, 2.55);
  }
  K.box(2.3, 0.02, 7.6, '#a8423a', cx, 0.012, 1.5).castShadow = false;
  for(const s of [-1, 1]) K.pendant(cx + s*3.2, 5.2, 1.0, '#c9a24a', '#ffd89a', { drop:2.0, r:0.32 });
  // candle stand at the side: each press lights one more
  const SX = cx + 5.6, SZ = -2.2;
  K.box(1.3, 0.9, 0.6, '#6b4a33', SX, 0.45, SZ); K.box(1.4, 0.06, 0.7, '#c9a24a', SX, 0.93, SZ);
  const st = new THREE.Group(); st.position.set(SX, 0, SZ); scene.add(st);   // only the flames move; the stand is baked
  const flames = [], flameMat = new THREE.MeshBasicMaterial({ color:'#ffcf5a', toneMapped:false }), flameGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
  for(let i=0;i<6;i++){
    const x = -0.5 + (i%3)*0.5, z = i < 3 ? -0.15 : 0.15;
    K.cyl(0.05, 0.05, 0.22 + (i%2)*0.08, '#fffaf0', SX + x, 1.07 + (i%2)*0.04, SZ + z, S, 8);
    const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(x, 1.25 + (i%2)*0.08, z); f.visible = false; st.add(f); flames.push(f);
  }
  const wick = H.box(1.3, 0.3, 0.5, '#6b4a33', 0, 1.1, 0, st); wick.visible = false;   // an invisible click target over the candles
  const glow = K.pool(cx + 5.6, -2.2, 3, 3, '#ffb85a', 0, 0.03);
  K.solid(cx + 5.6, -2.2, 0.7, 0.35);
  let lit = 0;
  K.hot({ x:cx + 5.6, z:-0.9, label:'Light a candle', obj:wick, use(){
    lit = lit >= flames.length ? 0 : lit + 1; flames.forEach((f, i) => f.visible = i < lit); K.tone(660 + lit*60, 0.3, 'sine', 0.07);
    if(lit === flames.length){ K.tone(523, 0.6, 'sine', 0.05); K.tone(784, 0.6, 'sine', 0.04); }
  } });
  K.tick((dt, t) => { flames.forEach((f, i) => { if(f.visible){ f.scale.y = 1 + Math.sin(t*14 + i*2)*0.15; f.scale.x = 1 + Math.sin(t*11 + i)*0.1; } }); glow.material.opacity = lit*0.035 + (lit ? Math.sin(t*9)*0.01 : 0); });
  // a welcome board by the door, and the resume card on an easel
  K.sign(scene, 'Focus Family', cx + 5.9, 1.7, 4.3, { w:2.2, h:0.8, bg:'#c9a24a', fg:'#ffffff', sub:'Kharis Campus Ministry', rotY:-0.35 });
  K.box(0.08, 1.3, 0.08, '#6b4a33', cx + 5.9, 0.65, 4.26); K.round(cx + 5.9, 4.3, 0.3);
  K.info(cx - 5.4, 3.6, { y:1.6, w:2.0, h:1.1, padZ:1.3, rotY:0.35 });
  K.box(0.08, 1.2, 0.08, '#6b4a33', cx - 5.4, 0.55, 3.55);

  // six friends in the pews, baked into the static mesh because they never move; two peek back at you
  const capGeo = new THREE.CapsuleGeometry(0.34, 0.34, 6, 14);
  [[-1, 0, -0.8, '#6fae4a', 0], [-1, 1, 0.9, '#d6689a', 0.6], [-1, 3, -0.3, '#4fa3c7', 0], [1, 0, 0.6, '#f2b705', 0], [1, 2, -0.9, '#8a5cc2', -0.6], [1, 3, 0.8, '#e98a5a', 0]].forEach(([side, k, dx, c, peek]) => {
    const g = new THREE.Group(); g.position.set(cx + side*3.2 + dx, 0.38, -1.02 + k*1.1); g.rotation.y = Math.PI + peek; g.scale.setScalar(0.72); S.add(g);
    H.mesh(capGeo, c, 0, 0.6, 0, g); for(const s of [-1, 1]) H.ball(0.055, '#1b1b24', s*0.14, 0.78, 0.31, g, 8);
  });
  // a greeter by the door who hops and says hello whenever you come close
  const greeter = K.buddy(scene, '#ffd166', cx + 1.9, 4.7, -2.4, 0.95, '#c9a24a'); K.round(cx + 1.9, 4.7, 0.36);
  let greetCool = 0, greetHop = 0;
  K.tick((dt, t, p) => {
    greetCool -= dt; greetHop = Math.max(0, greetHop - dt*2.2);
    const dx = p.x - greeter.position.x, dz = p.z - greeter.position.z, d = Math.hypot(dx, dz);
    if(d < 2.6 && greetCool <= 0){ greetCool = 14; greetHop = 1; K.say(greeter, 'Welcome to Focus Family!', { pitch:620, y:1.5 }); }
    greeter.rotation.y = H.lerpAngle(greeter.rotation.y, d < 4.5 ? Math.atan2(dx, dz) : -2.4, Math.min(1, dt*5));
    greeter.position.y = Math.sin(greetHop*Math.PI)*0.35 + Math.abs(Math.sin(t*2.2))*0.02;
  });

  // the point of contact: advisors, officers and leaders each ring in, and a cord links each one to Andrew
  const PCX = cx - 5.6, PCZ = -2.2, LINES = [['Advisors', '#8a5cc2'], ['Officers', '#4fa3c7'], ['Leaders', '#e98a5a']];
  K.box(1.4, 0.9, 0.7, '#6b4a33', PCX, 0.45, PCZ); K.box(1.5, 0.06, 0.8, '#c9a24a', PCX, 0.93, PCZ);
  for(const s of [-0.55, 0.55]) K.box(0.08, 0.4, 0.08, '#6b4a33', PCX + s, 1.12, PCZ - 0.3);
  K.solid(PCX, PCZ, 0.75, 0.4);
  let call = -1, linked = false, callTold = false;
  const cordAt = i => call >= 0 ? clamp01((call - 0.5 - i*0.9)/0.6) : linked ? 1 : 0;
  const pcBoard = K.panel(scene, PCX, 1.78, PCZ - 0.3, 1.4, 1.0, (g, w, h) => {
    g.fillStyle = '#2f2419'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd89a'; H.F(g, 700, 19); g.fillText('POINT OF CONTACT', w/2, 18);
    const hx = w/2, hy = h - 36, all = cordAt(2) >= 1;
    LINES.forEach(([name, c], i) => {
      const x = w*(0.2 + i*0.3), y = 62, k = cordAt(i), cxp = (x + hx)/2, cyp = hy + 18;
      if(k > 0){   // the cord sags as a quadratic curve and is drawn up to k
        g.strokeStyle = c; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
        for(let s = 0; s <= 20; s++){ const u = Math.min(s/20, k), a = (1 - u)*(1 - u), b = 2*(1 - u)*u, e = u*u; const px = a*x + b*cxp + e*hx, py = a*y + b*cyp + e*hy; s ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
      }
      g.fillStyle = k >= 1 ? c : '#5a4632'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
      g.fillStyle = k >= 1 ? '#ffffff' : '#c9b08a'; H.F(g, 700, 14); g.fillText(name, x, y - 24);
    });
    const pulse = all ? 0.75 + Math.sin(performance.now()/120)*0.25 : 0;
    g.fillStyle = all ? `rgba(255,209,102,${pulse})` : '#5a4632'; g.beginPath(); g.arc(hx, hy, 16, 0, 7); g.fill();
    g.fillStyle = all ? '#2f2419' : '#c9b08a'; H.F(g, 700, 13); g.fillText('Andrew', hx, hy + 1);
  }, { frame:'#6b4a33', px:150 });
  K.box(0.36, 0.14, 0.3, '#a8423a', PCX + 0.42, 1.03, PCZ + 0.12);
  const handset = new THREE.Group(); handset.position.set(PCX + 0.42, 1.14, PCZ + 0.12); scene.add(handset);
  H.box(0.44, 0.06, 0.1, '#a8423a', 0, 0.02, 0, handset); for(const s of [-1, 1]) H.box(0.1, 0.08, 0.14, '#a8423a', s*0.18, 0, 0, handset);
  function connect(){
    if(call >= 0) return false;
    call = 0; linked = false; pcBoard.redraw();
    if(!callTold){ callTold = true; talk(ctx, { name:'Point of contact', portrait:'sign', lines:['Andrew is the leader and point of contact for Focus Family, part of Kharis Campus Ministry.', 'He is the link between advisors, officers and leaders.'] }); }
    return true;
  }
  K.hot({ x:PCX, z:PCZ + 1.7, label:'Take the calls', obj:pcBoard, use(){ connect(); } });
  K.tick((dt, t, p, n) => {
    if(call < 0){ handset.position.y = 1.14; handset.rotation.z = 0; return; }
    const prev = call; call += dt;
    LINES.forEach((_, i) => {
      const s = 0.2 + i*0.9;
      if(prev < s && call >= s){ K.tone(880, 0.07, 'square', 0.03); setTimeout(() => K.tone(880, 0.07, 'square', 0.03), 110); }
      if(prev < s + 0.9 && call >= s + 0.9) K.tone(440 + i*110, 0.14, 'triangle', 0.07);
    });
    const ring = LINES.some((_, i) => call > 0.2 + i*0.9 && call < 0.55 + i*0.9);
    handset.position.y = 1.14 + (ring ? Math.abs(Math.sin(t*40))*0.05 : 0); handset.rotation.z = ring ? Math.sin(t*50)*0.1 : 0;
    if(prev < 3.1 && call >= 3.1){ K.say([PCX, 2.9, PCZ], 'Advisors, officers and leaders, all linked.', { pitch:560 }); K.tone(784, 0.15, 'sine', 0.08); setTimeout(() => K.tone(1046, 0.25, 'sine', 0.07), 130); }
    if(n % 2 === 0) pcBoard.redraw();
    if(call > 6){ call = -1; linked = true; pcBoard.redraw(); }
  });
  K.stop('The sanctuary', 'A warm timber sanctuary for Focus Family, part of Kharis Campus Ministry: open trusses overhead and four tall windows throwing light across the floor. The cross stays simple, on the back wall above the chancel.', [cx, 4.4, -D/2 + 2]);
  K.stop('Candles', 'At the side stand, each press of F lights one more candle, and the stand glows warmer as they go.', [cx + 5.6, 2.4, -2.2]);
  K.stop('Point of contact', 'Andrew is the leader and point of contact, the link between advisors, officers and leaders. Press F at the board and each one rings in, then gets a cord to Andrew.', [PCX, 2.8, PCZ]);
}

// ---------- 2. The circle: one message from the leader to advisors, officers, leaders and 25+ students ----------
function circle(K, r, ctx){
  const { THREE, H, scene, S } = K, cx = r.cx, cz = r.cz;
  K.cyl(1.3, 1.3, 0.03, '#c9a24a', cx, 0.015, cz, S, 40).castShadow = false;
  K.cyl(3.9, 3.9, 0.02, '#f3e2c2', cx, 0.008, cz, S, 56).castShadow = false;
  // the leader in the middle; advisors, officers and leaders seated in the ring
  const lead = K.buddy(scene, '#ffd166', cx, cz, 0, 1.05, '#c9a24a');
  const groups = [
    { name:'Advisors', color:'#8a5cc2', n:2 },
    { name:'Officers', color:'#4fa3c7', n:4 },
    { name:'Leaders', color:'#e98a5a', n:6 },
  ];
  // everyone around the leader is one instanced crowd: bodies and eyes for 38 people are two draw calls
  const crowd = [], lineGeo = new THREE.PlaneGeometry(0.12, 2.2);
  let k = 0;
  const ring = groups.reduce((a, g) => a + g.n, 0);
  for(const [gi, g] of groups.entries()){
    g.line = new THREE.MeshBasicMaterial({ color:g.color, transparent:true, opacity:0.12, depthWrite:false, toneMapped:false });
    const mine = [];
    for(let i=0;i<g.n;i++, k++){
      const a = -Math.PI/2 + (k - (ring - 1)/2)*(2*Math.PI/ring)*0.75, rr = 3.1;   // open at the front so you can walk in
      const x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr;
      K.cyl(0.36, 0.36, 0.38, '#8a6440', x, 0.19, z, S, 14);
      const ln = new THREE.Mesh(lineGeo, g.line); ln.rotation.x = -Math.PI/2; ln.rotation.z = -(a + Math.PI/2); ln.position.set(cx + Math.cos(a)*(rr/2 + 0.2), 0.04, cz + Math.sin(a)*(rr/2 + 0.2)); scene.add(ln);
      const p = { x, z, yaw:Math.atan2(cx - x, cz - z), s:0.85, base:0.3, color:g.color, hop:0, g:gi, a, at:0.5 + gi*0.9 };
      crowd.push(p); mine.push(p);
      K.round(x, z, 0.42);
    }
    // a small floor plaque for each group
    const mid = mine.reduce((s, p) => s + p.a, 0)/g.n;
    const pl = K.sign(scene, g.name, cx + Math.cos(mid)*1.95, 0.05, cz + Math.sin(mid)*1.95, { w:1.3, h:0.36, bg:g.color, fg:'#ffffff' }); pl.rotation.x = -Math.PI/2;
  }
  // 26 students in two staggered rows around the back
  const pal = ['#6fae4a', '#d6689a', '#9bd3e6', '#f2b705', '#ff9f68', '#bdb2ff'];
  for(let i=0;i<26;i++){
    const row = i % 2, j = i >> 1, a = -Math.PI + 0.62 + (j + row*0.5)/12.5*(Math.PI - 1.24), rr = row ? 5.0 : 4.3;
    const x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr;
    crowd.push({ x, z, yaw:Math.atan2(cx - x, cz - z), s:0.6 + (i % 3)*0.05, base:0, color:pal[i % pal.length], hop:0, g:3, a, at:3.3 + j*0.07 + row*0.035 });
    K.round(x, z, 0.26);
  }
  const N = crowd.length;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.34, 0.34, 6, 14), new THREE.MeshStandardMaterial({ roughness:0.8 }), N);
  const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color:'#1b1b24' }), N*2);
  bodies.castShadow = true; bodies.receiveShadow = true; bodies.frustumCulled = eyes.frustumCulled = false;   // bounds are computed once; hops move them
  scene.add(bodies, eyes);
  const C = new THREE.Color();
  crowd.forEach((p, i) => bodies.setColorAt(i, C.set(p.color)));
  const o = new THREE.Object3D(), M = new THREE.Matrix4(), bodyL = new THREE.Matrix4().makeTranslation(0, 0.6, 0);
  const eyeL = [-1, 1].map(s => new THREE.Matrix4().makeTranslation(s*0.14, 0.78, 0.31));
  function placeCrowd(t){
    crowd.forEach((p, i) => {
      o.position.set(p.x, p.base + Math.sin(p.hop*Math.PI)*0.42 + Math.abs(Math.sin(t*1.8 + i))*0.02, p.z); o.rotation.set(0, p.yaw, 0); o.scale.setScalar(p.s); o.updateMatrix();
      bodies.setMatrixAt(i, M.multiplyMatrices(o.matrix, bodyL));
      eyes.setMatrixAt(i*2, M.multiplyMatrices(o.matrix, eyeL[0])); eyes.setMatrixAt(i*2 + 1, M.multiplyMatrices(o.matrix, eyeL[1]));
    });
    bodies.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = true;
  }
  placeCrowd(0);
  K.sign(scene, '25+ students', cx, 3.9, cz - r.R + 0.2, { w:2.4, h:0.5, bg:'#6fae4a', fg:'#ffffff' });
  // press F: one message travels out ring by ring, then across every student
  let run = -1, said = 0, told = false;
  const lines = ['Here is the plan for this week.', 'Advisors are in.', 'Officers, passing it on!', 'Leaders are set.'];
  function pass(){
    if(run >= 0 && run < 5) return false;
    run = 0; said = 0; K.say(lead, lines[0], { pitch:540 }); K.tone(523, 0.14, 'triangle', 0.08);
    if(!told){ told = true; talk(ctx, { name:'Focus Family', portrait:'blob', color:'#c9a24a', lines:['Andrew is the link between advisors, officers and leaders.', 'He mentors 25+ students too. Watch one message reach every one of them.'] }); }
    return true;
  }
  K.hot({ x:cx, z:cz + 1.6, label:'Pass a message', obj:lead, use(){ pass(); } });
  K.tick((dt, t) => {
    lead.position.y = Math.abs(Math.sin(t*2))*0.04;
    if(run >= 0){
      const prev = run; run += dt;
      groups.forEach((g, gi) => { const s = 0.5 + gi*0.9, on = run > s ? Math.max(0, 1 - (run - s)/1.6) : 0; g.line.opacity = 0.12 + on*0.8; });
      crowd.forEach((p, i) => { if(prev <= p.at && run > p.at){ p.hop = 1; if(p.g < 3) K.tone(440 + p.g*110 + ((p.a*100)|0)%40, 0.08, 'triangle', 0.04); else if(i % 4 === 0) K.tone(620 + (i % 7)*40, 0.06, 'triangle', 0.03); } });
      const gi = Math.floor((run - 0.5)/0.9);
      if(gi >= 0 && gi < 3 && gi + 1 > said){ said = gi + 1; const p = crowd.find(q => q.g === gi); K.say([p.x, 2.1, p.z], lines[gi + 1], { pitch:600 + gi*60 }); }
      if(prev <= 5.4 && run > 5.4){ K.say(lead, 'Everyone has it.', { pitch:560 }); K.tone(784, 0.15, 'sine', 0.08); setTimeout(() => K.tone(1046, 0.25, 'sine', 0.07), 130); }
      if(run > 7) run = -1;
    }
    for(const p of crowd) p.hop = Math.max(0, p.hop - dt*2.3);
    placeCrowd(t);
  });
  K.stop('Focus Family Circle', 'A round room under a timber dome. Andrew is the link between advisors, officers and leaders, and mentors 25+ students. Press F in the middle and watch one message travel out ring by ring, then across every student.', [cx, 3.2, cz]);
  K.stop('25+ students', 'The two rows around the back are the 25+ students Andrew mentors. When the message reaches them they hop, one after another.', [cx, 2.6, cz - 4.4]);
}

// ---------- 3. Digest room: the weekly digest machine, and the procedure guides on a shelf ----------
function digest(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // double height with a mezzanine of procedure guides, clerestory windows above it
  const mz = K.mezz(r, { depth:2.4, y:2.9, stair:'left', deck:'#b98a5a' });
  for(const dx of [-3.6, -1.2, 1.2, 3.6]) K.win(cx + dx, 4.75, -D/2 + 0.02, 0, 1.3, 0.9, { kind:'sky', frame:'#6b4a33', cols:2, beamTo:[cx + dx + 0.4, 1.2], beamR:[0.4, 0.8], beamOpacity:0.12 });
  K.bookcase(cx - 2.6, 0, -D/2 + 0.3, 5, 2.6, 0, { rows:4, books:['#3b4f9e','#c9a24a','#6b8f71','#a8423a'] });
  K.bookcase(cx + 2.9, 0, -D/2 + 0.3, 4.4, 2.6, 0, { rows:4, books:['#3b4f9e','#c9a24a','#6b8f71','#a8423a'] });
  const bColors = ['#c9a24a','#4fa3c7','#e98a5a','#6fae4a','#8a5cc2','#d6689a'];
  for(let i=0;i<14;i++) K.box(0.2, 0.62, 0.5, bColors[i%6], cx + 0.4 + i*0.26, mz.y + 0.33, -D/2 + 0.5);
  K.sign(scene, 'Procedure guides', cx + 2.1, mz.y + 1.35, -D/2 + 0.3, { w:2.6, h:0.46, bg:'#c9a24a', fg:'#ffffff' });

  let run = -1, calHi = -1, calK = 0, mailP = 0, told = false, pulledTold = false;
  // the master calendar on an easel; the row being read lights up
  const cal = K.panel(scene, cx - 3.4, 2.0, -1.9, 2.6, 1.9, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a24a'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#ffffff'; H.F(g, 700, 18); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Master calendar', 10, 21);
    const cw = (w - 20)/7, rh = (h - 44)/5;
    for(let j=0;j<5;j++) for(let i=0;i<7;i++){
      const x = 10 + i*cw, y = 38 + j*rh;
      g.fillStyle = j === calHi ? '#fff1c4' : '#f3ead6'; g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
      if((i*3 + j*5)%4 === 0){ g.fillStyle = ['#4fa3c7','#e98a5a','#6fae4a','#8a5cc2'][(i + j)%4]; g.globalAlpha = j === calHi ? 0.6 + 0.4*calK : 0.55; g.fillRect(x + 4, y + rh*0.45, cw - 8, rh*0.3); g.globalAlpha = 1; }
    }
    if(calHi >= 0){ g.strokeStyle = '#e98a5a'; g.lineWidth = 4; g.strokeRect(9, 38 + calHi*rh, w - 18, rh); }
  }, { frame:'#6b4a33' });
  for(const s of [-1.1, 1.1]) K.box(0.1, 2.9, 0.1, '#6b4a33', cx - 3.4 + s, 1.45, -2.0);
  K.solid(cx - 3.4, -2.0, 1.3, 0.2);
  // shared folders on a side table: their lids lift as they are read
  K.box(1.4, 0.8, 0.7, '#8a6440', cx - 1.4, 0.4, -1.3); K.solid(cx - 1.4, -1.3, 0.7, 0.35);
  const folders = ['#f2b705', '#4fa3c7', '#6fae4a'].map((c, i) => {
    const x = cx - 1.4 + (i - 1)*0.42;
    K.box(0.36, 0.04, 0.44, c, x, 0.82, -1.3);
    const lid = new THREE.Group(); lid.position.set(x, 0.85, -1.52); scene.add(lid);
    H.box(0.36, 0.025, 0.44, c, 0, 0, 0.22, lid); H.box(0.3, 0.012, 0.4, '#fffaf0', 0, -0.02, 0.21, lid);
    return { lid, x, open:0, want:0 };
  });
  K.sign(scene, 'Shared folders', cx - 1.4, 1.35, -1.0, { w:1.3, h:0.3, bg:'#fffaf0' });
  // the machine: a hopper on top, a gear, the Gemini sparkle, a status screen and an output slot
  const MX = cx + 0.4, MZ = -1.8;
  const mach = new THREE.Group(); mach.position.set(MX, 0, MZ); scene.add(mach);
  H.box(1.5, 1.5, 1.0, '#4f6d8a', 0, 0.75, 0, mach); H.box(1.6, 0.14, 1.1, '#c9a24a', 0, 1.55, 0, mach);
  H.mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.45, 16, 1, true), '#c9a24a', 0, 1.85, 0, mach, { side:THREE.DoubleSide });
  H.box(0.9, 0.1, 0.12, '#1f2a44', 0, 0.42, 0.51, mach);
  const gear = new THREE.Group(); gear.position.set(-0.45, 1.05, 0.52); mach.add(gear);
  H.cyl(0.2, 0.2, 0.08, '#c9a24a', 0, 0, 0, gear, 16).rotation.x = Math.PI/2;
  for(let i=0;i<8;i++){ const tth = H.box(0.08, 0.1, 0.08, '#c9a24a', Math.cos(i*Math.PI/4)*0.24, Math.sin(i*Math.PI/4)*0.24, 0, gear); tth.rotation.z = i*Math.PI/4; }
  const starMat = new THREE.MeshBasicMaterial({ color:'#9bd3ff', toneMapped:false });
  const star = new THREE.Group(); star.position.set(0.45, 1.05, 0.56); mach.add(star);
  for(const [sx, sy] of [[0.35, 1], [1, 0.35]]){ const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), starMat); m.scale.set(sx, sy, 0.3); star.add(m); }
  const STATUS = ['READY', 'READING CALENDAR', 'READING FOLDERS', 'GEMINI SUMMARY', 'SENT'];
  let status = 0;
  const scr = K.panel(mach, 0, 0.75, 0.51, 1.1, 0.34, (g, w, h) => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = status === 4 ? '#b5e48c' : status ? '#ffd166' : '#9bd3e6'; H.F(g, 700, 17); g.fillText(STATUS[status], w/2, h/2 + 1);
  }, { frame:'#c9a24a', px:160 });
  K.sign(mach, 'Apps Script + Gemini API', 0, 2.45, 0, { w:2.2, h:0.4, bg:'#1f2a44', fg:'#ffffff' });
  K.sign(mach, 'Every week', 0, 2.05, 0.2, { w:1.2, h:0.28, bg:'#c9a24a', fg:'#ffffff' });
  K.solid(MX, MZ, 0.8, 0.55);
  // the digest it writes, on a monitor
  K.box(1.8, 0.8, 0.8, '#8a6440', cx + 3.4, 0.4, -1.6); K.solid(cx + 3.4, -1.6, 0.9, 0.4);
  const mail = K.panel(scene, cx + 3.4, 1.55, -1.75, 1.6, 1.1, (g, w, h) => {
    const p = mailP;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9edf5'; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#1f2a44'; H.F(g, 700, 13); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Weekly digest', 8, 16);
    const rows = [['From the master calendar', '#c9a24a'], ['', '#4fa3c7'], ['', '#e98a5a'], ['Shared folders, summarized', '#6fae4a'], ['', '#8a5cc2'], ['Sent every week', '#1f2a44']];
    rows.forEach(([txt, c], i) => { if(p*rows.length < i + 0.2) return; const y = 32 + i*((h - 38)/rows.length); if(txt){ g.fillStyle = c; H.F(g, 700, 11, 'Nunito'); g.fillText(txt, 8, y + 9); } else { g.fillStyle = c; g.globalAlpha = 0.35; g.fillRect(8, y + 2, (w - 30)*(0.5 + ((i*37)%40)/100), 7); g.globalAlpha = 1; } });
    if(p >= 1){ g.fillStyle = '#6fae4a'; H.rr(g, w - 58, h - 26, 50, 18, 9); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 11); g.fillText('Sent', w - 46, h - 13); }
  }, { frame:'#1f2a44' });
  // sheets fly from the calendar and the folders into the hopper; an envelope comes out the slot
  const sheetMat = new THREE.MeshBasicMaterial({ color:'#fffaf0', side:THREE.DoubleSide, toneMapped:false }), sheetGeo = new THREE.PlaneGeometry(0.34, 0.44);
  const SRC = [...[-1, 0, 1].map(i => new THREE.Vector3(cx - 3.4 + i*0.6, 2.0, -1.7)), ...folders.map(f => new THREE.Vector3(f.x, 1.0, -1.3))];
  const T0 = [0.4, 0.75, 1.1, 1.7, 2.05, 2.4], DST = new THREE.Vector3(MX, 2.05, MZ);
  const sheets = SRC.map(() => { const m = new THREE.Mesh(sheetGeo, sheetMat); m.visible = false; scene.add(m); return m; });
  const env = new THREE.Group(); env.visible = false; scene.add(env);
  H.box(0.4, 0.03, 0.28, '#fffaf0', 0, 0, 0, env); const flap = H.box(0.2, 0.032, 0.2, '#c9a24a', 0, 0.002, -0.04, env); flap.rotation.y = Math.PI/4; flap.scale.z = 0.7;
  const ENV0 = new THREE.Vector3(MX, 0.45, MZ + 0.62), ENV1 = new THREE.Vector3(cx + 2.8, 0.83, -1.35);
  function runDigest(){
    if(run >= 0) return false;
    run = 0; mailP = 0; mail.redraw(); env.visible = false; status = 1; scr.redraw(); K.tone(392, 0.12, 'square', 0.04);
    if(!told){ told = true; talk(ctx, { name:'Digest machine', portrait:'robot', lines:['Every week an Apps Script reads the master calendar and the shared folders.', 'The Gemini API summarizes them, and one digest goes out to everyone.'] }); }
    return true;
  }
  K.hot({ x:cx - 0.4, z:0.6, label:'Run the weekly digest', obj:mach, use(){ runDigest(); } });
  K.tick((dt, t, p, n) => {
    const busy = run >= 0 && run < 4.6;
    gear.rotation.z -= dt*(busy ? 8 : 0.4);
    star.rotation.z = t*(run > 3 && run < 4.6 ? 6 : 0.8); star.scale.setScalar(run > 3 && run < 4.6 ? 1.3 + Math.sin(run*20)*0.25 : 1);
    folders.forEach(f => { f.open += (f.want - f.open)*Math.min(1, dt*8); f.lid.rotation.x = -f.open*1.9; });
    if(run < 0) return;
    const prev = run; run += dt;
    const cross = s => prev < s && run >= s;
    // calendar sweep, then folders, then the summary, then the envelope
    const hi = run < 1.5 ? Math.min(4, Math.floor(run/0.3)) : -1;
    if(hi !== calHi || (hi >= 0 && n % 2 === 0)){ calHi = hi; calK = (Math.sin(run*8) + 1)/2; cal.redraw(); }
    if(cross(1.5)){ status = 2; scr.redraw(); }
    folders.forEach((f, i) => { if(cross(T0[3 + i] - 0.15)){ f.want = 1; K.sfx('clink', 0.3); } if(cross(T0[3 + i] + 0.9)) f.want = 0; });
    if(cross(3.1)){ status = 3; scr.redraw(); K.tone(660, 0.3, 'sine', 0.05, 990); }
    sheets.forEach((m, i) => {
      const k = (run - T0[i])/0.9;
      m.visible = k > 0 && k < 1;
      if(m.visible){ m.position.lerpVectors(SRC[i], DST, ease(k)); m.position.y += Math.sin(k*Math.PI)*1.1; m.rotation.set(-0.3 - k*1.2, k*4, k*2); }
      if(cross(T0[i] + 0.9)) K.tone(700 + i*50, 0.05, 'sine', 0.04);
    });
    if(run >= 4.6 && run < 5.4){ const k = (run - 4.6)/0.8; env.visible = true; env.position.lerpVectors(ENV0, ENV1, ease(k)); env.position.y += Math.sin(k*Math.PI)*1.0; env.rotation.set(0, k*Math.PI*2, 0); }
    if(cross(4.6)){ status = 4; scr.redraw(); K.sfx('clink', 0.5); }
    if(cross(5.4)){ env.position.copy(ENV1); env.rotation.set(0, 0.3, 0); K.tone(784, 0.15, 'sine', 0.1); setTimeout(() => K.tone(1046, 0.25, 'sine', 0.08), 130); }
    if(run > 5.4 && mailP < 1 && n % 3 === 0){ mailP = Math.min(1, (run - 5.4)/1.6); mail.redraw(); }
    if(run > 8){ run = -1; status = 0; scr.redraw(); }
  });

  // the procedure guides on a low shelf: press F and one slides out for you
  const GX = cx + 4.3, GZ = 1.9;
  K.box(2.3, 0.08, 0.5, '#8a6440', GX, 0.04, GZ); K.box(2.3, 0.08, 0.5, '#8a6440', GX, 0.98, GZ); K.box(2.3, 1.0, 0.06, '#6b4a33', GX, 0.5, GZ - 0.23);
  for(const s of [-1, 1]) K.box(0.08, 1.0, 0.5, '#8a6440', GX + s*1.11, 0.5, GZ);
  K.solid(GX, GZ, 1.18, 0.3);
  // eight binders, instanced (covers and spine labels: two draw calls); one slides out per press
  const covers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.7, 0.42), new THREE.MeshStandardMaterial({ roughness:0.7 }), 8);
  const tags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.2, 0.01).translate(0, 0.12, 0.215), new THREE.MeshBasicMaterial({ color:'#fffaf0', toneMapped:false }), 8);
  covers.castShadow = true; covers.frustumCulled = tags.frustumCulled = false; scene.add(covers, tags);
  const binders = [], bo = new THREE.Object3D(), BC = new THREE.Color();
  for(let i=0;i<8;i++){ covers.setColorAt(i, BC.set(bColors[i % 6])); binders.push({ x:GX - 0.9 + i*0.26, out:0, want:0, hold:0 }); }
  const shelfHit = H.box(2.1, 0.75, 0.45, '#c9a24a', GX, 0.45, GZ, scene); shelfHit.visible = false;   // an invisible click target over the binders
  K.sign(scene, 'Procedure guides', GX, 1.35, GZ, { w:1.9, h:0.34, bg:'#c9a24a', fg:'#ffffff' });
  let next = 0;
  K.hot({ x:GX, z:GZ + 1.7, label:'Pull a guide', obj:shelfHit, use(){
    const q = binders[next]; next = (next + 1) % binders.length;
    q.want = 1; q.hold = 2.6; K.tone(520 + next*30, 0.1, 'triangle', 0.07);
    if(!pulledTold){ pulledTold = true; talk(ctx, { name:'Procedure guides', portrait:'sign', lines:['Andrew wrote the procedure guides so other leaders can run recurring events without help.'] }); }
  } });
  K.tick(dt => {
    binders.forEach((q, i) => {
      if(q.hold > 0){ q.hold -= dt; if(q.hold <= 0) q.want = 0; }
      q.out += (q.want - q.out)*Math.min(1, dt*7);
      bo.position.set(q.x, 0.45 + q.out*0.25, GZ + q.out*0.4); bo.rotation.set(-q.out*0.35, 0, 0); bo.updateMatrix();
      covers.setMatrixAt(i, bo.matrix); tags.setMatrixAt(i, bo.matrix);
    });
    covers.instanceMatrix.needsUpdate = tags.instanceMatrix.needsUpdate = true;
  });
  K.pendant(cx + 0.4, 5.6, 0.6, '#c9a24a', '#ffe0a8', { drop:2.4, r:0.34 });
  K.stop('The digest machine', 'Every week an Apps Script reads the master calendar, summarizes the shared folders through the Gemini API, and sends one digest. Press F and watch the sheets go in and the envelope come out.', [MX, 3.2, MZ]);
  K.stop('Procedure guides', 'On the shelf and up on the mezzanine: the procedure guides, written so other leaders can run recurring events without help. Press F at the shelf to pull one out.', [GX, 2.4, GZ]);
}
