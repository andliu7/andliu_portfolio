// Interior for "chapel": a timber sanctuary, the round Focus Family circle, and the digest room.
// The cross is fixed: static meshes on the back wall, never a hotspot, never moved or animated.
import { tour, wrap } from './clinic.js';

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg:'#1c140e', bgTop:'#4a3322', seed:7, dark:'#6b4a33', hemi:1.15, sunColor:'#ffe6c4',
    rooms: [
      { key:'sanctuary', name:'Sanctuary', w:14, tall:5.0, roof:'truss', rise:2.6, trussTo:-0.4, view:'dusk', floor:'#c99b6a', floorLine:'#b0845a', wall:'#fbf1dc', wall2:'#f4e6c8', wallKind:'plain', trim:'#ecd9b0', dark:'#7a5236',
        build(K, r){ sanctuary(K, r, zone); } },
      { key:'circle', name:'Focus Family Circle', w:12, shape:'round', tall:4.4, roof:'dome', rise:2.2, floorKind:'herring', floor:'#e9d3ae', floorLine:'#d2b88c', wall:'#fdf0e0', wall2:'#f6dfc4', wallKind:'boards', dark:'#8a6440', poche:'#5a3f2a', beam:'#8a6440',
        build(K, r){ circle(K, r); } },
      { key:'digest', name:'Digest Room', w:12, tall:5.6, floor:'#b98a5a', floorLine:'#a0764c', wall:'#eef1e6', wall2:'#e2e7d6', wallKind:'boards', trim:'#d6dcc6', dark:'#6b4a33',
        build(K, r){ digest(K, r, zone); } },
    ],
  });
}

function sanctuary(K, r, zone){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // a raised chancel across the back, three wide steps up the middle
  const lv = K.level({ x0:cx - 4.6, x1:cx + 4.6, z0:-D/2, z1:-D/2 + 2.6, h:0.45, color:'#b98a5a', edge:'#7a5236', rails:false, stairs:[{ side:'front', a:cx - 2, b:cx + 2 }] });
  // the cross: simple, fixed, with warm light washing the wall behind it
  K.box(0.28, 2.7, 0.16, '#7a5236', cx, lv.h + 2.25, -D/2 + 0.1);
  K.box(1.5, 0.28, 0.16, '#7a5236', cx, lv.h + 2.85, -D/2 + 0.1);
  K.pool(cx, -D/2 + 0.02, 3.6, 4.4, '#ffd89a', 0.22, lv.h + 2.3).rotation.x = 0;
  // a plain table on the chancel
  K.box(2.4, 0.9, 0.9, '#fbf6ea', cx, lv.h + 0.45, -D/2 + 1.4); K.box(2.6, 0.08, 1.05, '#c9a24a', cx, lv.h + 0.94, -D/2 + 1.4);
  for(const s of [-1, 1]){ K.cyl(0.13, 0.1, 0.28, '#fbf6ea', cx + s*0.95, lv.h + 1.12, -D/2 + 1.4, S, 10); for(let i=0;i<4;i++) H.ball(0.08, ['#ffd166','#ff8fab','#ffffff','#b5e48c'][i], cx + s*0.95 + Math.cos(i*1.6)*0.09, lv.h + 1.32, -D/2 + 1.4 + Math.sin(i*1.6)*0.09, S, 8); }
  K.solid(cx, -D/2 + 1.4, 1.3, 0.55);
  // tall lancet windows, light falling across the floor
  for(const dx of [-4.6, -2.4, 2.4, 4.6]) K.win(cx + dx, 2.9, -D/2 + 0.02, 0, 0.95, 3.4, { shape:'lancet', kind:'dusk', frame:'#7a5236', rows:3, beamTo:[cx + dx*1.05 + 0.4, -D/2 + 7.2], beamR:[0.45, 0.8], beamColor:'#ffd9a0', beamOpacity:0.16 });
  K.lamp('#ffcf8a', cx, 4.2, -2.5, 5, 10);
  // pews in two blocks with a centre aisle
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
  const st = new THREE.Group(); st.position.set(cx + 5.6, 0, -2.2); scene.add(st);
  H.box(1.3, 0.9, 0.6, '#6b4a33', 0, 0.45, 0, st); H.box(1.4, 0.06, 0.7, '#c9a24a', 0, 0.93, 0, st);
  const flames = [];
  for(let i=0;i<6;i++){
    const x = -0.5 + (i%3)*0.5, z = i < 3 ? -0.15 : 0.15;
    H.cyl(0.05, 0.05, 0.22 + (i%2)*0.08, '#fffaf0', x, 1.07 + (i%2)*0.04, z, st, 8);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), new THREE.MeshBasicMaterial({ color:'#ffcf5a', toneMapped:false }));
    f.position.set(x, 1.25 + (i%2)*0.08, z); f.visible = false; st.add(f); flames.push(f);
  }
  const glow = K.pool(cx + 5.6, -2.2, 3, 3, '#ffb85a', 0, 0.03);
  K.solid(cx + 5.6, -2.2, 0.7, 0.35);
  let lit = 0;
  K.hot({ x:cx + 5.6, z:-0.9, label:'Light a candle', obj:st, use(){ lit = lit >= flames.length ? 0 : lit + 1; flames.forEach((f, i) => f.visible = i < lit); K.tone(660 + lit*60, 0.3, 'sine', 0.07); } });
  K.tick((dt, t) => { flames.forEach((f, i) => { if(f.visible){ f.scale.y = 1 + Math.sin(t*14 + i*2)*0.15; f.scale.x = 1 + Math.sin(t*11 + i)*0.1; } }); glow.material.opacity = lit*0.035 + (lit ? Math.sin(t*9)*0.01 : 0); });
  // the resume card on an easel by the entrance
  K.info(cx - 5.4, 3.6, { y:1.6, w:2.0, h:1.1, padZ:1.3, rotY:0.35 });
  K.box(0.08, 1.2, 0.08, '#6b4a33', cx - 5.4, 0.55, 3.55);
  K.stop('The sanctuary', 'A warm timber sanctuary: open trusses overhead and four tall windows throwing light across the floor. The cross stays simple, on the back wall above the chancel.', [cx, 4.4, -D/2 + 2]);
  K.stop('Candles', 'At the side stand, each press of E lights one more candle, and the stand glows warmer as they go.', [cx + 5.6, 2.4, -2.2]);
}

function circle(K, r){
  const { THREE, H, D, scene, S } = K, cx = r.cx, cz = r.cz;
  K.cyl(1.3, 1.3, 0.03, '#c9a24a', cx, 0.015, cz, S, 40).castShadow = false;
  K.cyl(3.9, 3.9, 0.02, '#f3e2c2', cx, 0.008, cz, S, 56).castShadow = false;
  // the leader in the middle; advisors, officers and leaders in the ring; students around them
  const lead = K.buddy(scene, '#ffd166', cx, cz, 0, 1.05, '#c9a24a');
  const groups = [
    { name:'Advisors', color:'#8a5cc2', n:2 },
    { name:'Officers', color:'#4fa3c7', n:4 },
    { name:'Leaders', color:'#e98a5a', n:6 },
  ];
  const people = [], lineMat = [];
  let k = 0;
  const ring = groups.reduce((a, g) => a + g.n, 0);
  for(const [gi, g] of groups.entries()){
    for(let i=0;i<g.n;i++, k++){
      const a = -Math.PI/2 + (k - (ring - 1)/2)*(2*Math.PI/ring)*0.75, rr = 3.1;   // open at the front so you can walk in
      const x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr;
      K.cyl(0.36, 0.36, 0.38, '#8a6440', x, 0.19, z, S, 14);
      const b = K.buddy(scene, g.color, x, z, Math.atan2(cx - x, cz - z), 0.85); b.userData.base = 0.3; b.position.y = 0.3;
      const m = new THREE.MeshBasicMaterial({ color:g.color, transparent:true, opacity:0.12, depthWrite:false, toneMapped:false });
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.12, rr - 0.9), m); ln.rotation.x = -Math.PI/2; ln.rotation.z = -(a + Math.PI/2); ln.position.set(cx + Math.cos(a)*(rr/2 + 0.2), 0.04, cz + Math.sin(a)*(rr/2 + 0.2)); scene.add(ln);
      people.push({ b, g:gi, a, line:m, hop:0 });
      K.round(x, z, 0.42);
    }
    // a small floor plaque for each group
    const mid = people.filter(p => p.g === gi).reduce((s, p) => s + p.a, 0)/g.n;
    const pl = K.sign(scene, g.name, cx + Math.cos(mid)*1.95, 0.05, cz + Math.sin(mid)*1.95, { w:1.3, h:0.36, bg:g.color, fg:'#ffffff' }); pl.rotation.x = -Math.PI/2;
  }
  // students standing around the back of the room
  for(let i=0;i<9;i++){
    const a = -Math.PI/2 + (i - 4)*0.27, x = cx + Math.cos(a)*4.55, z = cz + Math.sin(a)*4.55;
    const b = K.buddy(scene, ['#6fae4a','#d6689a','#9bd3e6','#f2b705'][i%4], x, z, Math.atan2(cx - x, cz - z), 0.7); b.userData.base = 0;
    const m = new THREE.MeshBasicMaterial({ color:'#6fae4a', transparent:true, opacity:0, depthWrite:false, toneMapped:false });
    people.push({ b, g:3, a, line:m, hop:0 }); K.round(x, z, 0.32);
  }
  const stu = K.sign(scene, '25+ students', cx, 3.9, cz - r.R + 0.2, { w:2.4, h:0.5, bg:'#6fae4a', fg:'#ffffff' });
  // press E: one message travels out ring by ring
  let run = -1, said = 0;
  const lines = ['Here is the plan for this week.', 'Got it, passing it on!', 'Leaders are set.', 'See everyone Friday!'];
  K.hot({ x:cx, z:cz + 1.6, label:'Pass a message', obj:lead, use(){ run = 0; said = 0; K.say(lead, lines[0], { pitch:540 }); K.tone(523, 0.14, 'triangle', 0.08); } });
  K.tick((dt, t) => {
    lead.position.y = Math.abs(Math.sin(t*2))*0.04;
    if(run >= 0){
      run += dt;
      for(const p of people){
        const start = 0.5 + p.g*0.9 + (p.g === 3 ? 0 : 0);
        const on = run > start ? Math.max(0, 1 - (run - start)/1.6) : 0;
        p.line.opacity = 0.12 + on*0.8;
        if(run > start && run - dt <= start){ p.hop = 1; K.tone(440 + p.g*110 + ((p.a*100)|0)%40, 0.08, 'triangle', 0.04); }
      }
      const gi = Math.floor((run - 0.5)/0.9);
      if(gi >= 0 && gi < 3 && gi + 1 > said){ said = gi + 1; const p = people.find(q => q.g === gi); K.say(p.b, lines[gi + 1], { pitch:600 + gi*60, y:1.6 }); }
      if(run > 5.5) run = -1;
    }
    for(const p of people){ p.hop = Math.max(0, p.hop - dt*2.2); p.b.position.y = (p.b.userData.base || 0) + Math.sin(p.hop*Math.PI)*0.45; }
  });
  K.stop('Focus Family Circle', 'A round room under a timber dome. Andrew is the link between advisors, officers and leaders, and mentors 25+ students. Press E in the middle and watch one message travel out ring by ring.', [cx, 3.2, cz]);
}

function digest(K, r, zone){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // double height with a mezzanine of procedure guides, clerestory windows above it
  const mz = K.mezz(r, { depth:2.4, y:2.9, stair:'left', deck:'#b98a5a' });
  for(const dx of [-3.6, -1.2, 1.2, 3.6]) K.win(cx + dx, 4.75, -D/2 + 0.02, 0, 1.3, 0.9, { kind:'sky', frame:'#6b4a33', cols:2, beamTo:[cx + dx + 0.4, 1.2], beamR:[0.4, 0.8], beamOpacity:0.12 });
  K.bookcase(cx - 2.6, 0, -D/2 + 0.3, 5, 2.6, 0, { rows:4, books:['#3b4f9e','#c9a24a','#6b8f71','#a8423a'] });
  K.bookcase(cx + 2.9, 0, -D/2 + 0.3, 4.4, 2.6, 0, { rows:4, books:['#3b4f9e','#c9a24a','#6b8f71','#a8423a'] });
  // guides up on the mezzanine: a row of labelled binders
  const bColors = ['#c9a24a','#4fa3c7','#e98a5a','#6fae4a','#8a5cc2','#d6689a'];
  for(let i=0;i<14;i++) K.box(0.2, 0.62, 0.5, bColors[i%6], cx + 0.4 + i*0.26, mz.y + 0.33, -D/2 + 0.5);
  K.sign(scene, 'Procedure guides', cx + 2.1, mz.y + 1.35, -D/2 + 0.3, { w:2.6, h:0.46, bg:'#c9a24a', fg:'#ffffff' });

  // the master calendar on an easel
  const cal = K.panel(scene, cx - 3.4, 2.0, -1.9, 2.6, 1.9, (g, w, h, hi = -1, k = 0) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a24a'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#ffffff'; H.F(g, 700, 18); g.textAlign = 'left'; g.fillText('Master calendar', 10, 21);
    const cw = (w - 20)/7, rh = (h - 44)/5;
    for(let j=0;j<5;j++) for(let i=0;i<7;i++){
      const x = 10 + i*cw, y = 38 + j*rh;
      g.fillStyle = j === hi ? '#fff1c4' : '#f3ead6'; g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
      if((i*3 + j*5)%4 === 0){ g.fillStyle = ['#4fa3c7','#e98a5a','#6fae4a','#8a5cc2'][(i + j)%4]; g.globalAlpha = j === hi ? 0.6 + 0.4*k : 0.55; g.fillRect(x + 4, y + rh*0.45, cw - 8, rh*0.3); g.globalAlpha = 1; }
    }
    if(hi >= 0){ g.strokeStyle = '#e98a5a'; g.lineWidth = 4; g.strokeRect(9, 38 + hi*rh, w - 18, rh); }
  }, { frame:'#6b4a33' });
  for(const s of [-1.1, 1.1]) K.box(0.1, 2.9, 0.1, '#6b4a33', cx - 3.4 + s, 1.45, -2.0);
  K.solid(cx - 3.4, -2.0, 1.3, 0.2);
  // shared folders on a side table
  K.box(1.2, 0.8, 0.7, '#8a6440', cx - 1.4, 0.4, -1.3); K.solid(cx - 1.4, -1.3, 0.6, 0.35);
  for(let i=0;i<3;i++){ K.box(0.5, 0.06, 0.38, ['#f2b705','#4fa3c7','#6fae4a'][i], cx - 1.4 + (i - 1)*0.05, 0.83 + i*0.07, -1.3 + (i - 1)*0.04); }
  K.sign(scene, 'Shared folders', cx - 1.4, 1.35, -1.0, { w:1.3, h:0.3, bg:'#fffaf0' });
  // the machine: Apps Script with a Gemini summarizer, a gear that spins while it works
  const mach = new THREE.Group(); mach.position.set(cx + 0.4, 0, -1.8); scene.add(mach);
  H.box(1.5, 1.5, 1.0, '#4f6d8a', 0, 0.75, 0, mach); H.box(1.6, 0.14, 1.1, '#c9a24a', 0, 1.55, 0, mach);
  H.box(0.9, 0.08, 0.3, '#1f2a44', 0, 1.64, 0.1, mach);
  const gear = new THREE.Group(); gear.position.set(-0.3, 0.8, 0.52); mach.add(gear);
  H.cyl(0.26, 0.26, 0.08, '#c9a24a', 0, 0, 0, gear, 16).rotation.x = Math.PI/2;
  for(let i=0;i<8;i++){ const tth = H.box(0.1, 0.12, 0.08, '#c9a24a', Math.cos(i*Math.PI/4)*0.3, Math.sin(i*Math.PI/4)*0.3, 0, gear); tth.rotation.z = i*Math.PI/4; }
  const star = H.mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color:'#9bd3ff', toneMapped:false }), 0.35, 0.85, 0.55, mach);
  K.sign(mach, 'Apps Script + Gemini API', 0, 2.05, 0, { w:2.2, h:0.4, bg:'#1f2a44', fg:'#ffffff' });
  K.solid(cx + 0.4, -1.8, 0.8, 0.55);
  // the email it writes, on a monitor
  K.box(1.8, 0.8, 0.8, '#8a6440', cx + 3.4, 0.4, -1.6); K.solid(cx + 3.4, -1.6, 0.9, 0.4);
  const mail = K.panel(scene, cx + 3.4, 1.55, -1.75, 1.6, 1.1, (g, w, h, p = 0) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9edf5'; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#1f2a44'; H.F(g, 700, 13); g.textAlign = 'left'; g.fillText('Weekly digest', 8, 16);
    const rows = [['From the master calendar', '#c9a24a'], ['', '#4fa3c7'], ['', '#e98a5a'], ['Shared folders, summarized', '#6fae4a'], ['', '#8a5cc2'], ['Sent every week', '#1f2a44']];
    rows.forEach(([txt, c], i) => { if(p*rows.length < i + 0.2) return; const y = 32 + i*((h - 38)/rows.length); if(txt){ g.fillStyle = c; H.F(g, 700, 11, 'Nunito'); g.fillText(txt, 8, y + 9); } else { g.fillStyle = c; g.globalAlpha = 0.35; g.fillRect(8, y + 2, (w - 30)*(0.5 + ((i*37)%40)/100), 7); g.globalAlpha = 1; } });
    if(p >= 1){ g.fillStyle = '#6fae4a'; H.rr(g, w - 58, h - 26, 50, 18, 9); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 11); g.fillText('Sent', w - 46, h - 13); }
  }, { frame:'#1f2a44' });
  // sheets that fly from the calendar and the folders into the machine
  const sheetMat = new THREE.MeshBasicMaterial({ color:'#fffaf0', side:THREE.DoubleSide, toneMapped:false });
  const sheets = [];
  for(let i=0;i<5;i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), sheetMat); m.visible = false; scene.add(m); sheets.push(m); }
  const src = i => i < 3 ? new THREE.Vector3(cx - 3.4 + (i - 1)*0.6, 2.0, -1.7) : new THREE.Vector3(cx - 1.4, 1.1, -1.3);
  const dst = new THREE.Vector3(cx + 0.4, 1.7, -1.7);
  let run = -1;
  K.hot({ x:cx - 0.4, z:0.6, label:'Run the weekly digest', obj:mach, use(){ run = 0; K.tone(392, 0.12, 'square', 0.04); } });
  K.tick((dt, t, p, n) => {
    star.rotation.y = t*2; gear.rotation.z -= dt*(run >= 0 && run < 4.5 ? 8 : 0.4);
    if(run < 0) return;
    run += dt;
    if(n % 2 === 0) cal.redraw(run < 5 ? 2 : -1, (Math.sin(run*8) + 1)/2);
    sheets.forEach((m, i) => {
      const s0 = 0.4 + i*0.35, k = (run - s0)/0.9;
      m.visible = k > 0 && k < 1;
      if(m.visible){ const a = src(i); m.position.lerpVectors(a, dst, k); m.position.y += Math.sin(k*Math.PI)*1.2; m.rotation.set(-0.3, k*4, k*2); if(k > 0.97) K.tone(700 + i*60, 0.05, 'sine', 0.04); }
    });
    star.scale.setScalar(run > 2 && run < 4.5 ? 1.4 + Math.sin(run*20)*0.3 : 1);
    const pmail = Math.max(0, Math.min(1, (run - 3.2)/2.2));
    if(n % 3 === 0) mail.redraw(pmail);
    if(run > 5.5 && run - dt <= 5.5){ K.tone(784, 0.15, 'sine', 0.1); K.tone(1046, 0.25, 'sine', 0.08); }
    if(run > 8){ run = -1; cal.redraw(-1); }
  });
  // a lectern with an open guide
  const lec = new THREE.Group(); lec.position.set(cx + 4.4, 0, 2.0); lec.rotation.y = -0.5; scene.add(lec);
  H.box(0.5, 1.1, 0.4, '#6b4a33', 0, 0.55, 0, lec); const topb = H.box(0.9, 0.06, 0.6, '#8a6440', 0, 1.15, 0, lec); topb.rotation.x = 0.3;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshBasicMaterial({ color:'#fffaf0', side:THREE.DoubleSide, toneMapped:false }));
  const hinge = new THREE.Group(); hinge.position.set(0, 1.2, 0); hinge.rotation.x = 0.3 - Math.PI/2; lec.add(hinge);
  const flip = new THREE.Group(); hinge.add(flip); page.position.x = 0.19; flip.add(page);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.48), page.material); left.position.x = -0.19; hinge.add(left);
  K.solid(cx + 4.4, 2.0, 0.4, 0.35, -0.5);
  let turn = 0;
  K.hot({ x:cx + 3.6, z:3.2, label:'Read a guide', obj:lec, use(){ turn = 1; K.showCard('Procedure guides', ['Wrote the procedure guides so other leaders can run recurring events without help.', zone.eyebrow]); } });
  K.tick(dt => { if(turn > 0){ turn = Math.max(0, turn - dt*1.5); flip.rotation.y = -(1 - turn)*Math.PI*0.98; } });
  K.pendant(cx + 0.4, 5.6, 0.6, '#c9a24a', '#ffe0a8', { drop:2.4, r:0.34 });
  K.stop('The digest room', 'Every week an Apps Script reads the master calendar, summarizes the shared folders through the Gemini API, and sends one digest. Press E and watch the sheets go in and the email come out.', [cx + 0.4, 3.2, -1.8]);
  K.stop('Procedure guides', 'Up on the mezzanine and on the lectern: the procedure guides, written so other leaders can run recurring events without help.', [cx + 4.4, 2.6, 2.0]);
}
