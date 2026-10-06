// Interior for the "umd" zone: University of Maryland, B.S. Computer Science on the pre-dental track
// (expected May 2027). A campus hall of four rooms built with the shared tour kit in blueberry.js:
//   1. Rotunda: a domed apse with columns and red and gold banners, the bronze terrapin in the light.
//   2. Data Wing (glass roof): Machine Learning, Computational Genomics and Data Science exhibits.
//   3. Theory Wing (barrel vault): Algorithms and Programming Languages.
//   4. Systems Lab (sawtooth roof): Computer Systems and Web Development.
// Every course on the coursework line in data/zones.js gets one exhibit that runs when you press F.
// The exhibits only show what each subject is about; they claim nothing beyond the course name.
import { makeTour, burst, prng } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', red = '#c8102e', gold = '#e0b43a';
const now = () => performance.now()/1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function talk(R, o){
  try { const d = R.ctx.modules.dialog; if(d?.say && !d.busy?.()){ d.say(o); return true; } } catch(e){ console.error('[umd] dialog failed', e); }
  return false;
}
function person(R, col, x, z, o = {}){
  const b = R.blob(col, x, z, Object.assign({}, o, { bob:false })), y0 = o.y || 0, ph = x*1.3 + z;
  let at = -10;
  R.tick((dt, t) => { const s = t - at; b.position.y = y0 + (s < 0.7 ? Math.sin(s/0.7*Math.PI)*0.45 : Math.abs(Math.sin(t*2.2 + ph))*0.04); });
  return { b, hop(){ at = now(); } };
}
const tone = (R, f, d = 0.1, type = 'sine', gain = 0.06) => { try { if(R.ctx.sound?.on) R.ctx.sound.tone(f, d, type, gain); } catch(e){} };
// A framed canvas panel on the back wall.
function wallPanel(R, x, y, w, h, draw, fps = 0, frame = ink){
  R.box(w + 0.24, h + 0.24, 0.1, frame, x, y, R.back + 0.06);
  return R.screen(w, h, draw, { x, y, z:R.back + 0.13, fps, px:100 });
}

export function build(ctx, kit){
  const dbg = {};
  return makeTour(ctx, kit, {
    sky:'#fff3e0', skyLow:'#8e0c22', plinth:'#5a2a2a', viewTop:'#bfe3ff', viewLow:'#fff4dc',
    // the view out of every window: red brick, white columns, a green mall with trees
    view(g, w, h){
      g.fillStyle = '#9fd17a'; g.fillRect(0, h*0.7, w, h*0.3);
      g.fillStyle = '#b5523b'; g.fillRect(w*0.2, h*0.34, w*0.6, h*0.36); g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(w*0.16, h*0.36); g.lineTo(w/2, h*0.18); g.lineTo(w*0.84, h*0.36); g.fill();
      for(let k = 0; k < 5; k++) g.fillRect(w*0.26 + k*w*0.11, h*0.4, 8, h*0.3);
      g.fillStyle = '#5f9e4a'; for(const x of [20, 236]){ g.beginPath(); g.arc(x, h*0.62, 30, 0, 7); g.fill(); }
    },
    debug: { state: () => ({ rotunda:dbg.rotunda?.(), data:dbg.data?.(), theory:dbg.theory?.(), systems:dbg.systems?.() }) },
    rooms: [
      { name:'Rotunda', sub:'B.S. Computer Science, Pre-Dental Track, expected May 2027', w:16, shape:'apse', h:5.4, roof:'dome', domeH:3.0, ribs:12,
        wall:'#fbf3e6', cap:'#ffffff', floor:'#efe6d6', floor2:'#c9b8a0', floorKind:'terrazzo', accent:red, rib:gold,
        windows:{ at:[0.14, 0.86], y:3.9, w:0.9, h:1.8, arch:true }, plaqueY:4.7, cam:{ ty:2.0, dist:23, pitch:0.5 },
        build: R => rotunda(R, dbg) },
      { name:'Data Wing', sub:'Machine Learning, Computational Genomics, Data Science', w:20, h:4.6, roof:'glass', run:5, rise:2.4, glassTint:'#e8f6ff', rib:'#ffffff',
        wall:'#f2f7fb', cap:'#ffffff', floor:'#e3ebf2', floor2:'#9fb3c8', floorKind:'terrazzo', accent:'#3a86b4', plaqueY:4.0, cam:{ ty:1.7, dist:23.5, pitch:0.5 },
        build: R => dataWing(R, dbg) },
      { name:'Theory Wing', sub:'Algorithms and Programming Languages', w:16, h:4.8, roof:'barrel', vault:3.2, ribs:5,
        wall:'#f7f0fb', cap:'#ffffff', floor:'#b98a5a', floor2:'#a87a4d', floorKind:'herring', accent:'#8a5cc2', rib:'#e7d8f5', ceil:'#fbf7ff',
        windows:{ at:[0.07, 0.93], y:3.1, w:1.0, h:2.0, arch:true }, plaqueY:4.25, build: R => theoryWing(R, dbg) },
      { name:'Systems Lab', sub:'Computer Systems and Web Development', w:16, h:4.6, roof:'sawtooth', teeth:3, tooth:1.8, rise:1.3,
        wall:'#eef7f1', cap:'#ffffff', floor:'#cfd8d3', floor2:'#bcc7c1', accent:'#35a36a', rib:'#2f6b45', ceil:'#e8f3ec', plaqueY:4.05,
        build: R => systemsLab(R, dbg) },
    ],
  });
}

// ---------- 1. Rotunda: columns round the apse, banners, the terrapin under the oculus ----------
function rotunda(R, dbg){
  const { THREE, H } = R;
  const z0 = R.doorZ - 1.7, rx = R.w/2, rz = z0 - R.back;
  const P = (a, d) => [Math.cos(a)*(rx - d), z0 + Math.sin(a)*(rz - d)];
  const face = (x, z) => Math.atan2(-x, (z0 - 0.5) - z);
  // six fluted columns following the curve, banners between them
  for(let k = 0; k < 6; k++){ const [x, z] = P(Math.PI + 0.35 + k*(Math.PI - 0.7)/5, 1.0); R.column(x, z, 4.6, { r:0.24, color:'#fffaf0', cap:gold, fluted:true }); }
  for(let k = 0; k < 5; k++){
    const a = Math.PI + 0.35 + (k + 0.5)*(Math.PI - 0.7)/5, [x, z] = P(a, 0.16), c = k % 2 ? gold : red;
    const b = R.box(0.95, 2.2, 0.04, c, x, 3.0, z); b.rotation.y = face(x, z); b.castShadow = false;
    const s = R.box(0.95, 0.12, 0.05, k % 2 ? red : gold, x, 2.0, z); s.rotation.y = b.rotation.y; s.castShadow = false;
  }
  // the terrapin statue on its plinth, in the oculus light
  const TZ = -2.7;
  R.box(2.8, 0.45, 2.4, '#d8d2c4', 0, 0.22, TZ); R.box(3.0, 0.12, 2.6, '#bdb5a4', 0, 0.5, TZ); R.solid(0, TZ, 1.5, 1.3);
  const statue = R.group(0, 0.56, TZ);
  const bronze = new THREE.MeshStandardMaterial({ color:'#b08a4e', roughness:0.35, metalness:0.45 });
  const noseM = new THREE.MeshStandardMaterial({ color:'#e9c46a', roughness:0.2, metalness:0.9, emissive:'#6b4a10', emissiveIntensity:0.2 });
  const k = new THREE.Group(); k.scale.setScalar(1.7); statue.add(k);
  const shell = H.mesh(new THREE.SphereGeometry(0.75, 22, 12, 0, Math.PI*2, 0, Math.PI/2), bronze, 0, 0.25, 0, k); shell.scale.y = 0.75;
  H.mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 22), bronze, 0, 0.22, 0, k);
  for(let n = 0; n < 6; n++){ const a = n/6*Math.PI*2; H.mesh(new THREE.SphereGeometry(0.16, 8, 6), bronze, Math.cos(a)*0.42, 0.62, Math.sin(a)*0.42, k).scale.y = 0.45; }
  H.mesh(new THREE.SphereGeometry(0.18, 8, 6), bronze, 0, 0.8, 0, k).scale.y = 0.45;
  const head = new THREE.Group(); head.position.set(0, 0.45, 0.85); k.add(head);
  H.mesh(new THREE.SphereGeometry(0.3, 16, 12), bronze, 0, 0, 0, head);
  H.mesh(new THREE.SphereGeometry(0.1, 10, 8), noseM, 0, -0.02, 0.28, head);
  if(H.eyes) H.eyes(head, 0.07, 0.25, 0.12, 0.05, false);
  for(const [lx, lz] of [[-.5, .45], [.5, .45], [-.5, -.45], [.5, -.45]]) H.mesh(new THREE.SphereGeometry(0.17, 10, 8), bronze, lx, 0.14, lz, k);
  const tail = H.mesh(new THREE.ConeGeometry(0.08, 0.3, 8), bronze, 0, 0.2, -0.85, k); tail.rotation.x = -Math.PI/2;
  const shine = R.glow(0, 1.3, TZ + 1.55, 1.2, '#fff1c4', R.g, 0.9); shine.visible = false;
  const spot = new THREE.SpotLight('#fff1c4', 30, 12, 0.5, 0.6, 1.5); spot.position.set(0, 6.5, 0.5); spot.target = statue; R.g.add(spot);
  let hi = -10, rubs = 0;
  const count = R.screen(2.0, 0.5, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = red; H.rr(g, 2, 2, w - 4, h - 4, (h - 4)/2); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(rubs ? `Rubbed for luck: ${rubs}` : 'Rub the nose for luck', w/2, h/2 + 1); }, { x:0, y:0.34, z:TZ + 1.32, transparent:true, px:120 });
  R.tick((dt, t) => {
    const s = t - hi;
    statue.position.y = 0.56 + (s < 1.2 ? Math.abs(Math.sin(s*Math.PI*2.5))*0.4*(1 - s/1.2) : 0);
    head.rotation.x = s < 2 ? -0.3*Math.sin(s*6) : Math.sin(t*0.8)*0.05;
    head.rotation.y = s < 2 ? 0 : Math.sin(t*0.5)*0.3;
    noseM.emissiveIntensity = 0.2 + (s < 2 ? 1.4*(1 - s/2) : 0);
    shine.visible = s < 1.5; shine.scale.setScalar(1.2 + Math.sin(s*12)*0.3);
  });
  R.use({ key:'terrapin', x:0, z:-0.6, r:2.0, y:3.4, label:'Rub the terrapin\'s nose', hit:statue, silent:true, fn(t){
    hi = t; rubs++; count.redraw(); visitors.forEach(v => v.hop()); burst(R, 0, 2.8, TZ + 1.4); tone(R, 660, 0.12, 'triangle', 0.07); tone(R, 990, 0.18, 'sine', 0.05);
    talk(R, { name:'Terrapin', portrait:'terrapin', lines: rubs === 1 ? [
      'Hi! You found the terrapin. Rubbing the nose is for luck.',
      'This is the University of Maryland. Andrew is doing a B.S. in Computer Science on the pre-dental track, expected May 2027.',
      'His coursework fills the wings through the doors on the right. Every exhibit does something when you press F.'] : ['Hi again! That is ' + rubs + ' rubs. Very lucky.'] });
  } });
  // the course directory by the door to the wings
  const dir = R.group(5.4, 0, 3.0); dir.rotation.y = -0.5;
  for(const sx of [-0.95, 0.95]) H.box(0.12, 2.8, 0.12, '#6b4a33', sx, 1.4, 0, dir);
  R.screen(1.8, 2.3, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = red; g.fillRect(0, 0, w, 46); g.fillStyle = gold; g.fillRect(0, 46, w, 6);
    g.fillStyle = '#ffffff'; H.F(g, 700, 24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Coursework', w/2, 24);
    const wings = [['Data Wing', '#3a86b4', ['Machine Learning', 'Computational Genomics', 'Data Science']], ['Theory Wing', '#8a5cc2', ['Algorithms', 'Programming Languages']], ['Systems Lab', '#35a36a', ['Computer Systems', 'Web Development']]];
    let y = 70; g.textAlign = 'left';
    for(const [name, c, list] of wings){ g.fillStyle = c; H.F(g, 700, 17); g.fillText(name + '  →', 14, y); y += 22; g.fillStyle = ink; H.F(g, 600, 14, 'Nunito'); for(const l of list){ g.fillText('· ' + l, 22, y); y += 18; } y += 8; }
  }, { parent:dir, y:1.55, z:0.07, px:100 });
  R.solid(5.4, 3.0, 1.05, 0.2, -0.5);
  const visitors = [person(R, '#ffd166', -5.0, 3.2, { face:0.9 }), person(R, '#8fd3ff', 2.8, 3.8, { face:-0.8, cap:red })];
  R.solidR(-5.0, 3.2, 0.45); R.solidR(2.8, 3.8, 0.45);
  R.lamp('floor', -6.2, 1.6, 1.6);
  dbg.rotunda = () => ({ rubs });
  R.stop('University of Maryland', 'Andrew is studying for a B.S. in Computer Science on the pre-dental track at the University of Maryland, expected May 2027. Say hi to the terrapin: press F in front of it to rub the nose.', 0, 4.8, TZ);
  R.stop('Seven courses, three wings', 'The coursework is Machine Learning, Computational Genomics, Algorithms, Data Science, Programming Languages, Computer Systems and Web Development. Each one has an exhibit in the wings to the right.', 5.4, 3.4, 3.0);
}

// ---------- 2. Data Wing: Machine Learning, Computational Genomics, Data Science ----------
const GENOME = 'ACGTTGCAAGCTTACGGATCCTAG';
const READS = [[5, -1], [14, 3], [1, -1], [18, 2], [9, -1]];   // [offset in the genome, position of one changed base or -1]
const BASEC = { A:'#35b36a', C:'#3a86b4', G:'#ffd166', T:'#e5484d' };
function dataWing(R, dbg){
  const { THREE, H } = R;
  const cA = new THREE.Color(), WHITE = new THREE.Color('#ffffff'), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);

  // Machine Learning: dots of two kinds, a line that learns to split them, and a little network that lights up
  const MX = -6.4, q = prng(423), pts = [];
  for(let k = 0; k < 28; k++){ const c = k % 2, r = Math.sqrt(q())*0.17, a = q()*Math.PI*2; pts.push({ c, x:(c ? 0.68 : 0.32) + Math.cos(a)*r, y:(c ? 0.34 : 0.66) + Math.sin(a)*r }); }
  const PHI = Math.atan2(-0.32, 0.36), ML = { e:0, run:false };
  const phi = () => PHI + 2.1*Math.exp(-ML.e/7);
  const acc = () => { const f = phi(), nx = Math.cos(f), ny = Math.sin(f); return pts.filter(p => ((p.x - 0.5)*nx + (p.y - 0.5)*ny > 0) === !!p.c).length/pts.length; };
  const losses = [];
  const mlScr = wallPanel(R, MX, 2.2, 3.6, 2.3, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a86b4'; g.fillRect(0, 0, w, 42);
    g.fillStyle = '#ffffff'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Machine Learning', 14, 22);
    g.textAlign = 'right'; H.F(g, 600, 18, 'Nunito'); g.fillText(`epoch ${ML.e|0}  ·  accuracy ${Math.round(acc()*100)}%`, w - 14, 22);
    const px = 16, py = 54, pw = h - 70, ph = h - 70;
    g.fillStyle = '#f4f6fb'; g.fillRect(px, py, pw, ph);
    const f = phi(), nx = Math.cos(f), ny = Math.sin(f);
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    g.fillStyle = '#3a86b41a'; g.beginPath(); const cx = px + pw/2, cy = py + ph/2, L = pw*1.5;
    g.moveTo(cx - ny*L, cy - nx*L); g.lineTo(cx + ny*L, cy + nx*L); g.lineTo(cx + ny*L + nx*L, cy + nx*L - ny*L); g.lineTo(cx - ny*L + nx*L, cy - nx*L - ny*L); g.fill();
    g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - ny*L, cy - nx*L); g.lineTo(cx + ny*L, cy + nx*L); g.stroke(); g.restore();
    for(const p of pts){ g.fillStyle = p.c ? '#e58a3b' : '#3a86b4'; const x = px + p.x*pw, y = py + (1 - p.y)*ph; if(p.c){ g.fillRect(x - 6, y - 6, 12, 12); } else { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
    const lx = px + pw + 24, lw = w - lx - 16, ly = py + 20, lh = ph - 40;
    g.fillStyle = ink; H.F(g, 700, 16); g.textAlign = 'left'; g.fillText('loss', lx, py + 6);
    g.strokeStyle = '#c8d0de'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly + lh); g.lineTo(lx + lw, ly + lh); g.stroke();
    g.strokeStyle = '#e5484d'; g.lineWidth = 3; g.beginPath(); losses.forEach((v, n) => { const x = lx + lw*n/40, y = ly + lh*(1 - v); n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  }, 12);
  // the network sculpture: 3, 4 and 2 nodes, instanced, with lines between layers
  R.cyl(0.5, 0.6, 0.9, '#ffffff', MX, 0.45, -3.6); R.solidR(MX, -3.6, 0.65);
  const net = R.group(MX, 1.75, -3.6), layers = [3, 4, 2], nodes = [];
  layers.forEach((n, l) => { for(let k = 0; k < n; k++) nodes.push([(l - 1)*0.6, (k - (n - 1)/2)*0.34, 0, l]); });
  const nodeI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ roughness:0.4 }), nodes.length);
  nodes.forEach(([x, y, z], i) => { nodeI.setMatrixAt(i, M4.compose(V.set(x, y, z), Q, S1)); nodeI.setColorAt(i, cA.set('#c7cdd9')); });
  net.add(nodeI);
  const seg = []; nodes.forEach(a => nodes.forEach(b => { if(b[3] === a[3] + 1) seg.push(a[0], a[1], a[2], b[0], b[1], b[2]); }));
  const lineG = new THREE.BufferGeometry(); lineG.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const lineM = new THREE.LineBasicMaterial({ color:'#9aa3b8' }); net.add(new THREE.LineSegments(lineG, lineM));
  R.tick((dt, t) => {
    net.rotation.y = Math.sin(t*0.5)*0.5;
    if(ML.run){ ML.e = Math.min(40, ML.e + dt*10); if(losses.length < Math.floor(ML.e) + 1) losses.push(1 - acc() + 0.05*Math.exp(-ML.e/10)); if(ML.e >= 40){ ML.run = false; R.chime(990); burst(R, MX, 3.0, -3.2); } }
    nodes.forEach((nd, i) => nodeI.setColorAt(i, cA.set(ML.run && ((t*6 + nd[3]*2)|0) % 3 === nd[3] ? '#ffd166' : ML.e >= 40 ? '#7ee2a0' : '#c7cdd9')));
    nodeI.instanceColor.needsUpdate = true; lineM.color.set(ML.run ? ((t*8|0) % 2 ? '#ffd166' : '#3a86b4') : '#9aa3b8');
  });
  R.use({ key:'ml', x:MX, z:-2.0, r:1.7, y:2.9, label:'Train the model', hit:[net, mlScr.mesh], pitch:620, fn(){ if(ML.run) return; ML.e = 0; losses.length = 0; ML.run = true; } });

  // Computational Genomics: a genome of 24 bases on a table and a short read that slides until it fits
  const GZ = -3.9, GY = 1.0, GX = i => -2.2 + i*0.19;
  R.box(4.8, 0.9, 1.0, '#2f4f6a', 0, 0.45, -3.8); R.box(4.9, 0.06, 1.1, '#3a86b4', 0, 0.92, -3.8); R.solid(0, -3.8, 2.45, 0.55);
  const blk = new THREE.BoxGeometry(0.17, 0.17, 0.3);
  const gI = new THREE.InstancedMesh(blk, new THREE.MeshStandardMaterial({ roughness:0.5 }), GENOME.length);
  const rI = new THREE.InstancedMesh(blk, new THREE.MeshStandardMaterial({ roughness:0.5, emissive:'#ffffff', emissiveIntensity:0.08 }), 6);
  R.g.add(gI, rI);
  for(let i = 0; i < GENOME.length; i++){ gI.setMatrixAt(i, M4.compose(V.set(GX(i), GY + 0.09, GZ), Q, S1)); gI.setColorAt(i, cA.set(BASEC[GENOME[i]])); }
  R.float('genome', -2.75, 1.25, GZ, { size:22, scale:0.7 });
  const G = { k:-1, read:'', pos:0, best:0, mm:0, t0:-10, phase:'idle' };
  const readOf = k => { const [o, m] = READS[k % READS.length]; let s = GENOME.substr(o, 6); if(m >= 0) s = s.slice(0, m) + ({ A:'C', C:'G', G:'T', T:'A' })[s[m]] + s.slice(m + 1); return s; };
  const mism = (s, p) => { let n = 0; for(let i = 0; i < s.length; i++) if(GENOME[p + i] !== s[i]) n++; return n; };
  function align(){
    if(G.phase === 'scan') return false;
    G.k++; G.read = readOf(G.k); G.best = 0; G.mm = 99;
    for(let p = 0; p + 6 <= GENOME.length; p++){ const m = mism(G.read, p); if(m < G.mm){ G.mm = m; G.best = p; } }
    G.phase = 'scan'; G.t0 = now(); G.pos = 0;
    for(let i = 0; i < 6; i++) rI.setColorAt(i, cA.set(BASEC[G.read[i]]));
    rI.instanceColor.needsUpdate = true; return true;
  }
  const genScr = wallPanel(R, 0, 2.45, 5.0, 1.3, (g, w, h) => {
    g.fillStyle = '#10202c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8fd3ff'; H.F(g, 700, 20); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Computational Genomics', 14, 18);
    g.textAlign = 'right'; g.fillStyle = '#ffffffaa'; H.F(g, 600, 16, 'Nunito');
    g.fillText(G.phase === 'idle' ? 'press F to align a read' : G.phase === 'scan' ? `trying position ${G.pos}` : `best match at ${G.best}, ${G.mm} mismatch${G.mm === 1 ? '' : 'es'}`, w - 14, 18);
    const cw = (w - 40)/GENOME.length; H.F(g, 700, 18); g.textAlign = 'center';
    for(let i = 0; i < GENOME.length; i++){ g.fillStyle = BASEC[GENOME[i]]; g.fillText(GENOME[i], 20 + cw*(i + 0.5), 58); }
    if(G.read){ for(let i = 0; i < 6; i++){ const x = 20 + cw*(G.pos + i + 0.5), ok = GENOME[G.pos + i] === G.read[i];
      g.fillStyle = G.phase === 'lock' && !ok ? '#ff6b6b' : '#ffffff'; g.fillText(ok ? '|' : 'x', x, 80); g.fillStyle = BASEC[G.read[i]]; g.fillText(G.read[i], x, 104); } }
  }, 10, '#2f4f6a');
  R.tick((dt, t) => {
    const s = t - G.t0;
    if(G.phase === 'scan'){ G.pos = Math.min(G.best, Math.floor(s/0.14)); if(s/0.14 >= G.best + 1.5){ G.phase = 'lock'; G.lock = t; if(G.mm) R.buzz(); R.chime(G.mm ? 700 : 990); } }
    const x = G.phase === 'scan' ? GX(0) + (GX(G.best) - GX(0))*clamp(s/0.14/(G.best + 1.5), 0, 1) : GX(G.pos);
    const drop = G.phase === 'lock' ? Math.max(0.2, 0.55 - (t - G.lock)*1.5) : 0.55;   // the read settles just above its match
    for(let i = 0; i < 6; i++) rI.setMatrixAt(i, M4.compose(V.set(x + i*0.19, GY + 0.09 + (G.read ? drop : -5) + Math.sin(t*3 + i)*0.02, GZ), Q, S1));
    rI.instanceMatrix.needsUpdate = true;
    const lit = G.phase === 'lock' && t - G.lock < 4;
    for(let i = 0; i < GENOME.length; i++){ const inRead = i >= G.pos && i < G.pos + 6 && G.read; cA.set(BASEC[GENOME[i]]); if(lit && inRead) cA.lerp(WHITE, GENOME[i] === G.read[i - G.pos] ? 0.45 : 0); if(lit && inRead && GENOME[i] !== G.read[i - G.pos] && (t*6|0) % 2) cA.set('#1f2a44'); gI.setColorAt(i, cA); }
    gI.instanceColor.needsUpdate = true;
  });
  R.use({ key:'genome', x:0, z:-2.0, r:1.7, y:2.2, label:'Align a read', hit:[gI, rI, genScr.mesh], pitch:700, fn(){ align(); } });

  // Data Science: a bean machine. Forty balls bounce through eight rows of pegs into a bell curve.
  const DX = 6.4, DZ = -5.25, ROWS = 8, SP = 0.26, TOP = 3.0, NB = 40;
  R.box(2.7, 3.2, 0.12, '#2f4f6a', DX, 1.75, DZ - 0.1); R.box(2.9, 0.3, 0.9, '#2f4f6a', DX, 0.15, DZ + 0.2); R.solid(DX, DZ + 0.1, 1.5, 0.55);
  const bins = new Array(ROWS + 1).fill(0);
  const dsScr = R.screen(2.5, 3.0, (g, w, h) => {
    g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a86b4'; H.F(g, 700, 22); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Data Science', w/2, 20);
    g.strokeStyle = '#e58a3b66'; g.lineWidth = 4; g.beginPath();
    for(let k = 0; k <= 60; k++){ const u = (k/60 - 0.5)*SP*(ROWS + 1)*1.1, x = w/2 + u/2.5*w, y = h - 30 - Math.exp(-u*u/(2*0.33*0.33))*h*0.3; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    const n = bins.reduce((a, b) => a + b, 0); g.fillStyle = ink; H.F(g, 600, 16, 'Nunito'); g.fillText(n ? `n = ${n}` : 'press F to drop', w/2, 44);
  }, { x:DX, y:1.75, z:DZ - 0.03, px:90 });
  const pegs = []; for(let r = 0; r < ROWS; r++) for(let k = 0; k <= r; k++) pegs.push([(k - r/2)*SP, TOP - r*0.19]);
  const pegI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8).rotateX(Math.PI/2), new THREE.MeshStandardMaterial({ color:'#c7cdd9', roughness:0.4 }), pegs.length);
  pegs.forEach(([x, y], i) => pegI.setMatrixAt(i, M4.compose(V.set(DX + x, y, DZ + 0.07), Q, S1))); R.g.add(pegI);
  for(let k = 0; k <= ROWS + 1; k++) R.box(0.03, 1.1, 0.14, '#c7cdd9', DX + (k - (ROWS + 1)/2)*SP, 0.85, DZ + 0.07);
  R.box(SP*(ROWS + 1) + 0.1, 0.05, 0.16, '#c7cdd9', DX, 0.3, DZ + 0.07);
  const ballI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color:'#e58a3b', roughness:0.35 }), NB);
  ballI.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.g.add(ballI);
  const balls = Array.from({ length:NB }, () => ({ path:[], bin:0, slot:0, t0:-1 }));
  const hide = () => { for(let i = 0; i < NB; i++) ballI.setMatrixAt(i, M4.compose(V.set(DX, -5, DZ), Q, S1)); ballI.instanceMatrix.needsUpdate = true; };
  hide();
  let drops = 0, dropping = false, landed = 0;
  function drop(){
    if(dropping) return false;
    dropping = true; drops++; landed = 0; bins.fill(0);
    const rq = prng(drops*97 + 11), t = now();
    balls.forEach((b, i) => { let r = 0; b.path = []; for(let k = 0; k < ROWS; k++){ const right = rq() < 0.5 ? 1 : 0; r += right; b.path.push(r); } b.bin = r; b.slot = bins[r]++; b.t0 = t + i*0.12; b.done = false; });
    bins.fill(0); dsScr.redraw(); return true;
  }
  const STEP = 0.13;
  R.tick((dt, t) => {
    if(!dropping) return;
    for(let i = 0; i < NB; i++){
      const b = balls[i], s = t - b.t0; let x, y;
      if(s < 0){ x = 0; y = -5; }
      else {
        const u = s/STEP;
        if(u < ROWS){ const r = Math.floor(u), f = u - r, rights0 = r ? b.path[r - 1] : 0, rights1 = b.path[r];
          const x0 = (rights0 - r/2)*SP, x1 = (rights1 - (r + 1)/2)*SP; x = x0 + (x1 - x0)*f; y = TOP + 0.12 - r*0.19 - f*0.19 + Math.sin(f*Math.PI)*0.06; }
        else { x = (b.bin - ROWS/2)*SP; const fs = (u - ROWS)*STEP, y0 = TOP + 0.12 - ROWS*0.19, rest = 0.39 + b.slot*0.1; y = Math.max(rest, y0 - 4.5*fs*fs - 0.6*fs);
          if(y <= rest && !b.done){ b.done = true; landed++; bins[b.bin]++; if(landed % 8 === 0) tone(R, 500 + landed*12, 0.05, 'triangle', 0.04); } }
      }
      ballI.setMatrixAt(i, M4.compose(V.set(DX + x, y, DZ + 0.1), Q, S1));
    }
    ballI.instanceMatrix.needsUpdate = true;
    if(landed >= NB){ dropping = false; dsScr.redraw(); R.chime(880); }
  });
  R.use({ key:'galton', x:DX, z:-2.6, r:1.7, y:3.0, label:'Drop 40 balls', hit:[dsScr.mesh, pegI], pitch:560, fn(){ drop(); } });

  const ta = person(R, '#cdb4db', -2.6, 2.8, { face:0.4, cap:'#3a86b4' }); R.solidR(-2.6, 2.8, 0.45);
  R.use({ key:'ta', x:-2.6, z:4.0, r:1.4, y:2.4, label:'Talk to the TA', hit:ta.b, silent:true, fn(){
    ta.hop();
    talk(R, { name:'TA', portrait:'blob', color:'#cdb4db', lines:[
      'Three of Andrew\'s courses live in this wing: Machine Learning, Computational Genomics and Data Science.',
      'Train the model on the left, align a read in the middle, and drop the balls on the right to grow a bell curve.'] });
  } });
  R.lamp('floor', 9.0, 1.6, 2.6); R.lamp('floor', -9.0, 1.6, 2.6);
  dbg.data = () => ({ ml:{ epoch:ML.e|0, accuracy:Math.round(acc()*100), running:ML.run }, genome:{ read:G.read, phase:G.phase, best:G.best, mismatches:G.mm }, galton:{ drops, landed, bins:[...bins] } });
  R.stop('Machine Learning', 'Machine Learning is on Andrew\'s coursework. Press F here and the model trains: the line turns until it splits the two kinds of dots, and the loss falls.', MX, 3.4, -3.6);
  R.stop('Computational Genomics', 'Computational Genomics: press F and a short read slides along the genome until it finds where it fits best, changed base and all.', 0, 3.2, -3.8);
  R.stop('Data Science', 'Data Science: press F and forty balls bounce left or right through eight rows of pegs. The piles grow into a bell curve.', DX, 3.6, -4.6);
}

// ---------- 3. Theory Wing: Algorithms and Programming Languages ----------
const EXPRS = [[2, '+', 3, 4], [6, '-', 1, 2], [1, '+', 7, 3]];   // (a op b) * c
function theoryWing(R, dbg){
  const { THREE, H } = R;
  // Algorithms: eight bars that bubble-sort themselves, one comparison at a time
  const AX = -3.8, AZ = -4.0, N = 8, BW = 0.4, GAPX = 0.5;
  R.box(4.4, 0.4, 1.2, '#4b3a7c', AX, 0.2, AZ); R.box(4.5, 0.05, 1.3, '#8a5cc2', AX, 0.4, AZ); R.solid(AX, AZ, 2.25, 0.65);
  let arr = [5, 2, 7, 1, 8, 3, 6, 4];
  const bars = [];
  for(let v = 1; v <= N; v++){ const m = new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(0.72 - v*0.06, 0.55, 0.62), roughness:0.5, emissive:'#ffd166', emissiveIntensity:0 });
    const b = H.box(BW, 0.3 + v*0.26, 0.5, m, 0, 0.42 + (0.3 + v*0.26)/2, AZ, R.g); bars[v] = { b, m, x:0, lift:0 }; }
  const slotX = i => AX + (i - (N - 1)/2)*GAPX;
  arr.forEach((v, i) => { bars[v].x = slotX(i); bars[v].b.position.x = bars[v].x; });
  const A = { steps:[], k:0, t:0, cmp:0, swaps:0, running:false, done:-10, pair:null };
  function plan(a){ const s = [], b = a.slice(); for(let i = 0; i < N - 1; i++) for(let j = 0; j < N - 1 - i; j++){ const sw = b[j] > b[j + 1]; s.push([j, sw]); if(sw) [b[j], b[j + 1]] = [b[j + 1], b[j]]; } return s; }
  const sorted = () => arr.every((v, i) => !i || arr[i - 1] <= v);
  let shuffles = 0;
  function sort(){
    if(A.running) return false;
    if(sorted()){ const q = prng(++shuffles*31 + 5); for(let i = N - 1; i > 0; i--){ const j = (q()*(i + 1))|0; [arr[i], arr[j]] = [arr[j], arr[i]]; } arr.forEach((v, i) => { bars[v].x = slotX(i); bars[v].lift = 0.5; }); }
    A.steps = plan(arr); A.k = 0; A.t = -0.6; A.cmp = 0; A.swaps = 0; A.running = true; return true;
  }
  const algScr = wallPanel(R, AX, 3.0, 4.2, 1.3, (g, w, h) => {
    g.fillStyle = '#231a36'; g.fillRect(0, 0, w, h); g.fillStyle = '#cdb4db'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Algorithms  ·  bubble sort', 14, 20);
    g.textAlign = 'right'; g.fillStyle = '#ffffffaa'; H.F(g, 600, 17, 'Nunito'); g.fillText(`comparisons ${A.cmp}  ·  swaps ${A.swaps}`, w - 14, 20);
    const cw = (w - 40)/N; H.F(g, 700, 34); g.textAlign = 'center';
    arr.forEach((v, i) => { const hl = A.pair && (i === A.pair[0] || i === A.pair[0] + 1); g.fillStyle = hl ? '#ffd166' : '#ffffff22'; H.rr(g, 20 + i*cw + 4, 46, cw - 8, 60, 12); g.fill(); g.fillStyle = hl ? ink : '#ffffff'; g.fillText(String(v), 20 + i*cw + cw/2, 78); });
  }, 10, '#4b3a7c');
  const STEP = 0.34;
  R.tick((dt, t) => {
    if(A.running){
      A.t += dt;
      if(A.t >= STEP){ A.t -= STEP; const [j, sw] = A.steps[A.k]; if(sw){ [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; bars[arr[j]].x = slotX(j); bars[arr[j + 1]].x = slotX(j + 1); A.swaps++; } A.k++; A.pair = null;
        if(A.k >= A.steps.length){ A.running = false; A.done = t; R.chime(990); burst(R, AX, 2.6, AZ + 0.8); } }
      if(A.running && A.t >= 0 && !A.pair){ A.pair = [A.steps[A.k][0]]; A.cmp++; tone(R, 300 + arr[A.pair[0]]*60, 0.06, 'triangle', 0.04); }
    }
    for(let v = 1; v <= N; v++){
      const b = bars[v], i = arr.indexOf(v), hl = A.pair && (i === A.pair[0] || i === A.pair[0] + 1);
      b.lift += ((hl ? 0.18 : 0) - b.lift)*(1 - Math.exp(-10*dt));
      b.b.position.x += (b.x - b.b.position.x)*(1 - Math.exp(-12*dt));
      const wave = t - A.done < 1.5 ? Math.max(0, Math.sin((t - A.done)*6 - i*0.5))*0.2 : 0;
      b.b.position.y = 0.42 + (0.3 + v*0.26)/2 + b.lift + wave; b.m.emissiveIntensity = hl ? 0.35 : wave ? 0.3 : 0;
    }
  });
  R.use({ key:'sort', x:AX, z:-1.9, r:1.7, y:3.0, label:'Sort the bars', hit:[algScr.mesh, ...bars.slice(1).map(b => b.b)], pitch:600, fn(){ sort(); } });

  // Programming Languages: a parse tree for (a op b) * c that evaluates itself from the leaves up
  const PX = 3.8, PZ = -4.2;
  R.box(3.0, 0.3, 1.0, '#4b3a7c', PX, 0.15, PZ); R.solid(PX, PZ, 1.55, 0.55);
  R.cyl(0.05, 0.05, 2.8, '#9aa3b8', PX, 1.6, PZ - 0.3, R.s, 8);
  const NODES = [[0, 3.1], [-0.8, 2.35], [0.8, 2.35], [-1.3, 1.6], [-0.3, 1.6]];   // root, op, c, a, b
  const EDGES = [[0, 1], [0, 2], [1, 3], [1, 4]];
  R.g.updateMatrixWorld(true);   // R.beam aims with localToWorld, so the room group's world matrix must be current
  for(const [a, b] of EDGES) R.beam(PX + NODES[a][0], NODES[a][1], PZ, PX + NODES[b][0], NODES[b][1], PZ, 0.06, '#c7b5e6');
  const E = { k:0, t0:-10, running:false };
  const ex = () => EXPRS[E.k % EXPRS.length];
  const val = () => { const [a, op, b, c] = ex(), l = op === '+' ? a + b : a - b; return { l, r:l*c }; };
  const shown = [false, false, false, false, false];
  const labelOf = i => { const [a, op, b, c] = ex(), v = val(); return [shown[0] ? String(v.r) : '*', shown[1] ? String(v.l) : op, String(c), String(a), String(b)][i]; };
  const nodes = NODES.map(([x, y], i) => R.screen(0.62, 0.62, (g, w, h) => {
    g.clearRect(0, 0, w, h); const lit = shown[i]; g.fillStyle = lit ? '#ffd166' : paper; g.beginPath(); g.arc(w/2, h/2, w/2 - 4, 0, 7); g.fill();
    g.lineWidth = 6; g.strokeStyle = i < 2 ? '#8a5cc2' : '#35a36a'; g.stroke();
    g.fillStyle = ink; H.F(g, 700, labelOf(i).length > 1 ? 30 : 40); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(labelOf(i), w/2, h/2 + 2);
  }, { x:PX + x, y, z:PZ + 0.02, transparent:true, double:true, px:110 }));
  const spark = R.glow(0, 0, 0, 0.7, '#ffd166', R.g, 0.9); spark.visible = false;
  const plScr = wallPanel(R, PX, 3.0, 4.2, 1.3, (g, w, h) => {
    const [a, op, b, c] = ex(), v = val(), s = now() - E.t0;
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); g.fillStyle = '#cdb4db'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Programming Languages', 14, 20);
    H.F(g, 600, 26, 'monospace'); g.fillStyle = '#ffd166'; g.fillText(`(${a} ${op} ${b}) * ${c}`, 20, 58);
    g.fillStyle = '#b5e48c'; H.F(g, 600, 20, 'monospace');
    if(E.running || s < 60){ if(s > 0.9) g.fillText(`eval(${op}, ${a}, ${b}) = ${v.l}`, 20, 90); if(s > 1.9) g.fillText(`eval(*, ${v.l}, ${c}) = ${v.r}`, 20, 114); }
  }, 8, '#4b3a7c');
  function evaluate(){
    if(E.running) return false;
    if(shown[0]){ E.k++; shown.fill(false); }
    E.running = true; E.t0 = now(); nodes.forEach(n => n.redraw()); plScr.redraw(); return true;
  }
  const along = (a, b, f) => spark.position.set(PX + NODES[a][0] + (NODES[b][0] - NODES[a][0])*f, NODES[a][1] + (NODES[b][1] - NODES[a][1])*f, PZ + 0.2);
  R.tick((dt, t) => {
    if(!E.running) return;
    const s = t - E.t0, set = (i, v) => { if(shown[i] !== v){ shown[i] = v; nodes[i].redraw(); tone(R, 520 + i*60, 0.08, 'triangle', 0.05); } };
    if(s > 0.1){ set(3, true); set(4, true); set(2, true); }
    spark.visible = (s > 0.4 && s < 0.9) || (s > 1.4 && s < 1.9);
    if(s > 0.4 && s < 0.9) along(3, 1, (s - 0.4)/0.5);
    if(s > 0.9) set(1, true);
    if(s > 1.4 && s < 1.9) along(1, 0, (s - 1.4)/0.5);
    if(s > 1.9){ set(0, true); E.running = false; spark.visible = false; R.chime(990); burst(R, PX, 3.4, PZ + 0.6); }
  });
  R.use({ key:'eval', x:PX, z:-2.1, r:1.7, y:3.3, label:'Evaluate the tree', hit:[plScr.mesh, ...nodes.map(n => n.mesh)], pitch:640, fn(){ evaluate(); } });

  const st = person(R, '#fffaf0', -0.4, 3.0, { face:0.2, cap:'#8a5cc2' }); R.solidR(-0.4, 3.0, 0.45);
  R.use({ key:'student', x:-0.4, z:4.2, r:1.4, y:2.4, label:'Talk to the student', hit:st.b, silent:true, fn(){
    st.hop();
    talk(R, { name:'Student', portrait:'blob', color:'#fffaf0', lines:[
      'Algorithms and Programming Languages are down this wing, both on Andrew\'s coursework.',
      'The bars sort themselves one comparison at a time. The tree works out its answer from the leaves up.'] });
  } });
  R.lamp('pendant', -3.8, 3.6, -1.6, { top:R.h + 1.2 }); R.lamp('pendant', 3.8, 3.6, -1.6, { top:R.h + 1.2 });
  dbg.theory = () => ({ bars:arr.slice(), sorting:A.running, comparisons:A.cmp, swaps:A.swaps, expr:ex().join(' '), evaluated:shown[0] });
  R.stop('Algorithms', 'Algorithms: press F and the eight bars bubble-sort themselves, comparing two neighbours at a time and swapping when they are out of order.', AX, 3.2, AZ);
  R.stop('Programming Languages', 'Programming Languages: press F and the parse tree evaluates itself, leaves first, until the root holds the answer. Press again for a new expression.', PX, 3.6, PZ);
}

// ---------- 4. Systems Lab: Computer Systems and Web Development ----------
const STAGES = ['F', 'D', 'E', 'W'], STC = ['#3a86b4', '#8a5cc2', '#e58a3b', '#35a36a'];
function systemsLab(R, dbg){
  const { THREE, H } = R;
  // Computer Systems: a big CPU with a fan, a memory tower, and the pipeline on the wall
  const CX = -4.2, CZ = -3.9;
  R.box(2.4, 0.6, 2.4, '#3a4a44', CX, 0.3, CZ); R.solid(CX, CZ, 1.25, 1.25);
  R.box(1.9, 0.16, 1.9, '#2a2d3a', CX, 0.68, CZ);
  for(let k = 0; k < 7; k++) for(const [dx, dz, w, d] of [[-0.6 + k*0.2, 1.0, 0.07, 0.14], [-0.6 + k*0.2, -1.0, 0.07, 0.14], [1.0, -0.6 + k*0.2, 0.14, 0.07], [-1.0, -0.6 + k*0.2, 0.14, 0.07]]) R.box(w, 0.04, d, '#e0b43a', CX + dx, 0.62, CZ + dz);
  for(let k = 0; k < 7; k++) R.box(1.3, 0.3, 0.05, '#9aa3b8', CX, 0.91, CZ - 0.6 + k*0.2);
  const fan = R.group(CX, 1.2, CZ);
  H.mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 28), '#2a2d3a', 0, 0, 0, fan).rotation.x = Math.PI/2;
  for(let k = 0; k < 5; k++){ const bl = H.box(0.5, 0.03, 0.16, '#c7cdd9', Math.cos(k/5*Math.PI*2)*0.26, 0, Math.sin(k/5*Math.PI*2)*0.26, fan); bl.rotation.y = -k/5*Math.PI*2; bl.rotation.x = 0.35; }
  H.cyl(0.1, 0.1, 0.08, '#35a36a', 0, 0, 0, fan, 12);
  const leds = STAGES.map((s, k) => { const m = new THREE.MeshBasicMaterial({ color:'#33403a' }); H.box(0.18, 0.08, 0.08, m, CX - 0.45 + k*0.3, 0.72, CZ + 0.97, R.g); return m; });
  const MEM = [['Disk', 1.0, 0.5, '#9aa3b8'], ['RAM', 0.82, 0.4, '#35a36a'], ['Cache', 0.64, 0.34, '#3a86b4'], ['Registers', 0.46, 0.28, '#e0b43a']];
  let my = 0; const mem = MEM.map(([name, s, h, c]) => { const m = new THREE.MeshStandardMaterial({ color:c, roughness:0.5, emissive:c, emissiveIntensity:0 }); H.box(s, h, s*0.8, m, -1.4, my + h/2, -4.6, R.g); my += h; return { name, m }; });
  R.solid(-1.4, -4.6, 0.55, 0.45);
  R.float('memory', -1.4, my + 0.35, -4.6, { size:22, scale:0.7 });
  const C = { cycle:0, t:0, running:false, hit:-1, runs:0 };
  const pipe = wallPanel(R, CX, 2.7, 4.4, 1.4, (g, w, h) => {
    g.fillStyle = '#10201a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7ee2a0'; H.F(g, 700, 20); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Computer Systems  ·  pipeline', 12, 18);
    g.textAlign = 'right'; g.fillStyle = '#ffffffaa'; H.F(g, 600, 16, 'Nunito'); g.fillText(C.hit >= 0 ? `cycle ${C.cycle}  ·  found in ${mem[C.hit].name}` : `cycle ${C.cycle}`, w - 12, 18);
    const cols = 8, cw = (w - 60)/cols, rh = (h - 44)/5;
    for(let i = 0; i < 5; i++){ g.fillStyle = '#ffffff66'; H.F(g, 600, 14, 'Nunito'); g.textAlign = 'left'; g.fillText('i' + (i + 1), 10, 44 + i*rh + rh/2);
      for(let c = 0; c < cols; c++){ const st = c - i; if(st < 0 || st > 3 || c >= C.cycle) continue;
        g.fillStyle = STC[st]; H.rr(g, 44 + c*cw + 2, 38 + i*rh + 2, cw - 4, rh - 4, 5); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 14); g.textAlign = 'center'; g.fillText(STAGES[st], 44 + c*cw + cw/2, 38 + i*rh + rh/2 + 1); } }
  }, 0, '#2f6b45');
  const hitOrder = [3, 2, 3, 3, 1, 2, 3, 0];   // mostly registers and cache, now and then RAM, once the disk
  function clock(){ if(C.running) return false; C.running = true; C.cycle = 0; C.t = 0.6; C.runs++; return true; }
  R.tick((dt, t) => {
    fan.rotation.y += dt*(C.running ? 22 : 3);
    if(C.running){ C.t += dt; if(C.t >= 0.6){ C.t -= 0.6; C.cycle++; C.hit = hitOrder[(C.cycle - 1) % hitOrder.length]; tone(R, 880, 0.03, 'square', 0.03); pipe.redraw(); if(C.cycle >= 8){ C.running = false; R.chime(990); } } }
    leds.forEach((m, k) => m.color.set(C.running && (C.cycle - 1) % 4 === k ? STC[k] : C.running ? '#33403a' : ((t*1.5|0) % 4 === k ? '#46604f' : '#33403a')));
    mem.forEach((q, k) => { q.m.emissiveIntensity = C.running && C.hit === k ? 0.45 + Math.sin(t*20)*0.15 : 0; });
  });
  R.use({ key:'clock', x:CX, z:-1.9, r:1.7, y:2.6, label:'Run the clock', hit:[fan, pipe.mesh], pitch:700, fn(){ clock(); } });

  // Web Development: a giant browser window that builds its page. HTML drops the boxes in, CSS paints them, JS makes the button work.
  const WX = 4.2, WZ = -4.4, top = 3.05, bot = 0.45, half = 1.9;
  for(const [x, y, w, h] of [[-half, (top + bot)/2, 0.12, top - bot], [half, (top + bot)/2, 0.12, top - bot], [0, bot, half*2 + 0.12, 0.12], [0, top, half*2 + 0.12, 0.12]]) R.box(w, h, 0.22, '#2a2d3a', WX + x, y, WZ);
  R.box(half*2, top - bot, 0.04, '#f4f6fb', WX, (top + bot)/2, WZ - 0.08);
  for(const sx of [-1.2, 1.2]) R.box(0.14, bot, 0.6, '#2a2d3a', WX + sx, bot/2, WZ);
  R.solid(WX, WZ, half + 0.15, 0.35);
  const W = { t0:-10, built:false, clicks:0, press:-10 };
  const barScr = R.screen(half*2 - 0.1, 0.24, (g, w, h) => {
    g.fillStyle = '#dfe4ee'; g.fillRect(0, 0, w, h); ['#ff6b6b', '#ffd166', '#35b36a'].forEach((c, n) => { g.fillStyle = c; g.beginPath(); g.arc(16 + n*20, h/2, 7, 0, 7); g.fill(); });
    g.fillStyle = '#ffffff'; H.rr(g, 80, 4, w*0.4, h - 8, 8); g.fill(); g.fillStyle = '#8a93a8'; H.F(g, 600, 13, 'Nunito'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('my-page.html', 92, h/2);
    const s = now() - W.t0;
    ['HTML', 'CSS', 'JS'].forEach((n, k) => { const on = s > [0, 1.9, 3.2][k] && W.t0 > 0; g.fillStyle = on ? ['#e58a3b', '#3a86b4', '#e0b43a'][k] : '#c8d0de'; H.rr(g, w - 210 + k*68, 4, 60, h - 8, (h - 8)/2); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 13); g.textAlign = 'center'; g.fillText(n, w - 180 + k*68, h/2 + 1); });
  }, { x:WX, y:top - 0.18, z:WZ - 0.04, fps:4, px:110 });
  const BLOCKS = [[0, 2.62, 3.6, 0.26, '#3a86b4'], [0, 2.4, 3.6, 0.12, '#1f2a44'], [-0.62, 1.93, 2.3, 0.62, '#ffd166'], [1.15, 1.93, 1.2, 0.62, '#b5e48c'],
    [-1.2, 1.2, 1.1, 0.5, '#ff9fb2'], [0, 1.2, 1.1, 0.5, '#8fd3ff'], [1.2, 1.2, 1.1, 0.5, '#cdb4db'], [0, 0.74, 1.0, 0.24, '#35a36a']];
  const grey = new THREE.Color('#c9ced8');
  const blocks = BLOCKS.map(([x, y, w, h, c], k) => { const m = new THREE.MeshStandardMaterial({ color:grey.clone(), roughness:0.55 }); const b = H.box(w, h, 0.05, m, WX + x, y, WZ + 0.02, R.g); b.visible = false; return { b, m, y, c:new THREE.Color(c), k }; });
  const btn = blocks[7];
  const btnScr = R.screen(0.9, 0.2, (g, w, h) => { g.fillStyle = '#35a36a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; H.F(g, 700, 15); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(W.clicks ? `Clicked ${W.clicks}` : 'Click me', w/2, h/2 + 1); }, { parent:btn.b, z:0.03, px:110 });
  btnScr.mesh.visible = false;
  function web(){
    const t = now();
    if(W.built){ W.clicks++; W.press = t; btnScr.redraw(); tone(R, 740, 0.06, 'square', 0.04); if(W.clicks % 5 === 0) burst(R, WX, 1.4, WZ + 0.6); return 'click'; }
    if(W.t0 > 0 && t - W.t0 < 3.4) return false;
    W.t0 = t; W.clicks = 0; btnScr.redraw(); blocks.forEach(q => { q.b.visible = false; q.m.color.copy(grey); }); btnScr.mesh.visible = false; barScr.redraw(); return 'build';
  }
  R.tick((dt, t) => {
    if(W.t0 < 0) return;
    const s = t - W.t0;
    blocks.forEach(q => {
      const d = s - q.k*0.18; q.b.visible = d > 0;
      if(d > 0){ const f = Math.min(1, d/0.35); q.b.position.y = q.y + (1 - f)*(1 - f)*1.2; }
      const css = clamp((s - 1.9 - q.k*0.08)/0.4, 0, 1); q.m.color.copy(grey).lerp(q.c, css);
      q.b.scale.z = 1 + css*1.4; const pop = css > 0 && css < 1 ? Math.sin(css*Math.PI)*0.08 : 0; q.b.scale.x = q.b.scale.y = 1 + pop;
    });
    if(s > 3.2 && !W.built){ W.built = true; btnScr.mesh.visible = true; R.chime(880); barScr.redraw(); }
    if(W.built){ const p = t - W.press; btn.b.scale.x = btn.b.scale.y = p < 0.25 ? 0.85 : 1 + Math.sin(t*4)*0.04; }
  });
  const webUse = R.use({ key:'web', x:WX, z:-2.3, r:1.7, y:3.3, label:'Build the page', hit:[barScr.mesh, ...blocks.map(q => q.b)], pitch:660, fn(){ if(web() === 'build') webUse.label = 'Click the button'; } });

  const dev = person(R, '#ffd166', 0.2, 2.8, { face:-0.2, cap:'#35a36a' }); R.solidR(0.2, 2.8, 0.45);
  R.use({ key:'dev', x:0.2, z:4.0, r:1.4, y:2.4, label:'Talk to the lab tech', hit:dev.b, silent:true, fn(){
    dev.hop();
    talk(R, { name:'Lab tech', portrait:'blob', color:'#ffd166', lines:[
      'Last two on Andrew\'s coursework: Computer Systems and Web Development.',
      'Run the clock and watch instructions move through the pipeline. Then build the page: HTML, then CSS, then JavaScript.'] });
  } });
  R.lamp('floor', -7.2, 1.6, 2.6); R.lamp('floor', 7.2, 1.6, 2.6);
  dbg.systems = () => ({ cycle:C.cycle, clocking:C.running, runs:C.runs, pageBuilt:W.built, clicks:W.clicks });
  R.stop('Computer Systems', 'Computer Systems: press F to run the clock. Each instruction moves through fetch, decode, execute and write, and the memory tower lights where the data was found.', CX, 3.4, CZ);
  R.stop('Web Development', 'Web Development: press F and the page builds itself, HTML boxes first, then CSS colour, then JavaScript. Once it is built, F clicks the button.', WX, 3.5, WZ);
}
