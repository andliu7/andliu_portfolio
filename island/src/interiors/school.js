// Interior for the "school" zone: Education One Schoolhouse, where Andrew tutored (Jun 2025 to Jan 2026).
// Three rooms built with the shared tour kit in blueberry.js:
//   1. Science Classroom: a timber-trussed schoolroom with five lab stations that react (a heart that
//      races, a cell that splits, DNA that unzips, a flask that turns pink, a Newton's cradle).
//   2. SAT Score Lab: practice sets lift each student on a bar into the +100 to +300 point band, with
//      the data on the two chamfered corner walls.
//   3. Back Office: the Apps Script grading machine. Rows ride a belt, duplicates get kicked into a bin,
//      a billing problem rings the alarm, and every catch drops a coin in the pig.
// Facts come only from data/zones.js. F interacts (the kit listens for the 'interact' action).
import { makeTour, burst, prng } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', red = '#d9534f', blue = '#3a86b4', green = '#35a36a';
const now = () => performance.now()/1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function talk(R, o){
  try { const d = R.ctx.modules.dialog; if(d?.say && !d.busy?.()){ d.say(o); return true; } } catch(e){ console.error('[school] dialog failed', e); }
  return false;
}
// A blob that hops on cue. bob:false because this tick owns position.y; base() lets a bar lift it.
function person(R, col, x, z, o = {}){
  const b = R.blob(col, x, z, Object.assign({}, o, { bob:false })), ph = x*1.3 + z;
  let at = -10, y0 = o.y || 0;
  R.tick((dt, t) => { const s = t - at; b.position.y = y0 + (s < 0.7 ? Math.sin(s/0.7*Math.PI)*0.45 : Math.abs(Math.sin(t*2.2 + ph))*0.04); });
  return { b, hop(delay = 0){ at = now() + delay; }, base(y){ y0 = y; } };
}
const tone = (R, f, d = 0.1, type = 'sine', gain = 0.06, slide) => { try { if(R.ctx.sound?.on) R.ctx.sound.tone(f, d, type, gain, slide); } catch(e){} };

export function build(ctx, kit){
  const dbg = {};
  return makeTour(ctx, kit, {
    sky:'#fff0e6', skyLow:'#a83e3a', plinth:'#6b3b36', viewTop:'#bfe3ff', viewLow:'#f3fbe8',
    // the view out of every window: a schoolyard with trees and a flag
    view(g, w, h){
      g.fillStyle = '#9fd17a'; g.fillRect(0, h*0.66, w, h*0.34);
      g.fillStyle = '#5f9e4a'; for(const [x, r] of [[40, 34], [110, 26], [200, 38]]){ g.beginPath(); g.arc(x, h*0.6, r, 0, 7); g.fill(); }
      g.fillStyle = '#8a5a3c'; for(const x of [40, 110, 200]) g.fillRect(x - 4, h*0.6, 8, h*0.1);
      g.fillStyle = '#6b6b6b'; g.fillRect(160, h*0.3, 3, h*0.36); g.fillStyle = red; g.fillRect(163, h*0.3, 26, 16);
    },
    debug: { state: () => ({ classroom:dbg.classroom?.(), sat:dbg.sat?.(), office:dbg.office?.() }) },
    rooms: [
      { name:'Science Classroom', sub:'Anatomy, biology, genetics, chemistry and physics', w:19, h:4.8, roof:'gable', run:5, rise:2.4, ribs:6,
        wall:'#fff6ea', cap:'#ffffff', floor:'#e2c28f', floor2:'#d4b27d', floorKind:'plank', accent:red, rib:'#8a5a3c', ceil:'#fbf3e6',
        windows:{ at:[0.055, 0.945], y:3.2, w:1.0, h:2.0, arch:true }, plaque:false, cam:{ ty:1.6, dist:22.5, pitch:0.5 },
        build: R => classroom(R, dbg) },
      { name:'SAT Score Lab', sub:'Students improved 100 to 300 points on data-driven practice', w:16, shape:'chamfer', chamfer:2.4, h:4.8, roof:'coffer',
        wall:'#eef6ff', cap:'#ffffff', floor:'#d6e4f2', floor2:'#c9daec', accent:blue, rib:'#ffffff', ceil:'#f6fbff', plaqueY:4.25,
        cam:{ ty:2.0, dist:22, pitch:0.5 }, build: R => satLab(R, dbg) },
      { name:'Back Office', sub:'Apps Script for grading, duplicate detection and billing alerts', w:17, h:4.4, roof:'sawtooth', teeth:3, tooth:1.8, rise:1.3,
        wall:'#f3fbef', cap:'#ffffff', floor:'#dcead3', floor2:'#8fb08a', floorKind:'terrazzo', accent:green, rib:'#2f6b45', ceil:'#eef7ea', plaqueY:3.95,
        build: R => office(R, dbg) },
    ],
  });
}

// ---------- 1. Science Classroom ----------
// Chalk drawings for the board, one per subject, centred on (cx, cy).
const CHALK = {
  Anatomy(g, cx, cy){ g.beginPath(); g.moveTo(cx, cy + 60); g.bezierCurveTo(cx - 110, cy - 10, cx - 70, cy - 80, cx, cy - 34); g.bezierCurveTo(cx + 70, cy - 80, cx + 110, cy - 10, cx, cy + 60); g.stroke(); },
  Biology(g, cx, cy){ g.beginPath(); g.ellipse(cx, cy, 120, 70, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(cx + 20, cy, 28, 0, 7); g.stroke(); for(let k = 0; k < 4; k++){ g.beginPath(); g.ellipse(cx - 80 + k*18, cy - 30 + (k%2)*56, 14, 8, k, 0, 7); g.stroke(); } },
  Genetics(g, cx, cy){ for(let k = 0; k <= 26; k++){ const x = cx - 130 + k*10, a = k*0.42; g.fillRect(x, cy + Math.sin(a)*48, 5, 5); g.fillRect(x, cy - Math.sin(a)*48, 5, 5); if(k % 3 === 0){ g.beginPath(); g.moveTo(x + 2, cy + Math.sin(a)*48); g.lineTo(x + 2, cy - Math.sin(a)*48); g.stroke(); } } },
  Chemistry(g, cx, cy){ g.beginPath(); for(let k = 0; k <= 6; k++){ const a = k/6*Math.PI*2 + Math.PI/6; const x = cx + Math.cos(a)*62, y = cy + Math.sin(a)*62; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.beginPath(); g.arc(cx, cy, 36, 0, 7); g.stroke(); },
  Physics(g, cx, cy){ g.strokeRect(cx - 120, cy - 30, 90, 60); g.beginPath(); g.moveTo(cx - 30, cy); g.lineTo(cx + 60, cy); g.lineTo(cx + 44, cy - 12); g.moveTo(cx + 60, cy); g.lineTo(cx + 44, cy + 12); g.stroke(); g.font = '600 38px Fredoka, sans-serif'; g.textAlign = 'left'; g.fillText('F = ma', cx + 74, cy + 12); },
};
const SUBJ = ['Anatomy', 'Biology', 'Genetics', 'Chemistry', 'Physics'];
function classroom(R, dbg){
  const { THREE, H } = R;
  const SZ = -4.3, ST = 0.94;                           // station bench z and bench-top height
  let subject = -1, changed = -10;
  // the chalkboard, high on the back wall above the stations
  const BW = 9.4, BH = 2.2, BY = 3.25;
  R.box(BW + 0.34, BH + 0.34, 0.12, '#8a5a3c', 0, BY, R.back + 0.2); R.box(BW + 0.2, 0.1, 0.24, '#8a5a3c', 0, BY - BH/2 - 0.2, R.back + 0.3);   // in front of the gable pilasters (they reach R.back + 0.2)
  for(let k = 0; k < 4; k++) R.box(0.14, 0.05, 0.05, ['#ffffff', '#ffd166', '#ff9fb2', '#8fd3ff'][k], -3.8 + k*0.3, BY - BH/2 - 0.12, R.back + 0.34);
  R.screen(BW, BH, (g, w, h, t) => {
    g.fillStyle = '#2f4f3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff08'; for(let k = 0; k < 8; k++) g.fillRect(k*130 + 20, 10 + (k%3)*50, 90, 30);
    g.strokeStyle = '#f4f1e8'; g.fillStyle = '#f4f1e8'; g.lineWidth = 6; g.lineCap = 'round'; g.textBaseline = 'alphabetic';
    H.F(g, 600, 44); g.textAlign = 'left'; g.fillText('Education One', 30, 58);
    H.F(g, 500, 24, 'Nunito'); g.globalAlpha = 0.75; g.fillText('Math and Sciences Tutor', 32, 92); g.globalAlpha = 1;
    H.F(g, 600, 34); g.fillText(subject < 0 ? 'Pick a station below' : 'Today: ' + SUBJ[subject], 32, 150);
    g.globalAlpha = 0.6; H.F(g, 500, 21, 'Nunito'); g.fillText(SUBJ.join('  ·  '), 32, h - 22); g.globalAlpha = 1;
    if(subject >= 0){ const p = clamp((t - changed)*1.4, 0, 1); g.save(); g.beginPath(); g.rect(w*0.5, 0, w*0.5*p, h); g.clip(); g.lineWidth = 6; CHALK[SUBJ[subject]](g, w*0.72, h*0.52); g.restore(); }
  }, { x:0, y:BY, z:R.back + 0.27, fps:12, px:100 });
  const kids = [];
  const setSubject = k => { subject = k; changed = now(); kids.forEach((p, n) => p.hop(n*0.08)); };

  // five benches, one per subject, each with a painted sign on its front
  const COL = ['#e5484d', green, '#8a5cc2', blue, '#ffb35c'];
  const SX = [-7.2, -3.6, 0, 3.6, 7.2];
  SX.forEach((x, k) => {
    R.box(2.7, 0.9, 1.0, '#8a5a3c', x, 0.45, SZ); R.box(2.84, 0.08, 1.12, '#f4ead8', x, 0.92, SZ);
    const s = R.sign(SUBJ[k], null, { w:1.5, h:0.4, bg:COL[k], fg:'#ffffff', size:44 }); s.position.set(x, 0.5, SZ + 0.52);
    R.solid(x, SZ, 1.42, 0.58);
  });

  // Anatomy: a heart that beats, and an ECG trace beside it
  const heart = R.group(SX[0] - 0.4, ST + 0.75, SZ);
  const heartM = new THREE.MeshStandardMaterial({ color:'#e5484d', roughness:0.45, emissive:'#e5484d', emissiveIntensity:0.1 });
  H.ball(0.26, heartM, -0.15, 0.08, 0, heart, 16); H.ball(0.26, heartM, 0.15, 0.08, 0, heart, 16);
  const tip = H.mesh(new THREE.ConeGeometry(0.34, 0.5, 16), heartM, 0, -0.22, 0, heart); tip.rotation.z = Math.PI;
  const aorta = H.mesh(new THREE.TorusGeometry(0.14, 0.06, 8, 12, Math.PI), '#ff9fb2', 0.05, 0.32, 0, heart); aorta.rotation.y = Math.PI/2;
  R.cyl(0.03, 0.03, 0.5, '#6b4a33', SX[0] - 0.4, ST + 0.25, SZ); R.cyl(0.18, 0.2, 0.05, '#6b4a33', SX[0] - 0.4, ST + 0.03, SZ);
  const HS = { rate:1.1, ph:0, fast:-10, beats:0 };
  const trace = [];
  R.box(1.0, 0.66, 0.06, ink, SX[0] + 0.72, ST + 0.45, SZ - 0.3);
  const ecg = R.screen(0.92, 0.58, (g, w, h) => {
    g.fillStyle = '#0f1f18'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f3b2e'; g.lineWidth = 1; for(let x = 0; x < w; x += 16){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = '#5fff9a'; g.lineWidth = 3; g.beginPath(); trace.forEach((v, n) => { const x = n/(trace.length - 1 || 1)*w, y = h*0.6 - v*h*0.45; n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = '#5fff9a'; H.F(g, 700, 16); g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText(`${Math.round(HS.rate*60)} bpm`, w - 6, 4);
  }, { x:SX[0] + 0.72, y:ST + 0.45, z:SZ - 0.26, fps:15, px:110 });
  R.tick((dt, t) => {
    const fast = t - HS.fast < 5; HS.rate += ((fast ? 2.6 : 1.1) - HS.rate)*(1 - Math.exp(-3*dt));
    const prev = HS.ph; HS.ph += dt*HS.rate;
    if(Math.floor(HS.ph) !== Math.floor(prev)){ HS.beats++; if(fast){ tone(R, 90, 0.07, 'sine', 0.09); setTimeout(() => tone(R, 70, 0.06, 'sine', 0.07), 120); } }
    const f = HS.ph % 1, pulse = Math.exp(-f*14) + Math.exp(-Math.max(0, f - 0.18)*18)*0.6*(f > 0.18 ? 1 : 0);
    heart.scale.setScalar(1 + pulse*0.12); heartM.emissiveIntensity = 0.1 + pulse*0.4;
    trace.push(f < 0.05 ? 1 : f < 0.09 ? -0.4 : f > 0.3 && f < 0.4 ? 0.2 : 0); if(trace.length > 60) trace.shift();
  });
  R.use({ key:'heart', x:SX[0], z:-2.7, r:1.6, y:2.7, label:'Make the heart race', hit:heart, pitch:500, fn(){ HS.fast = now(); setSubject(0); } });

  // Biology: a microscope and a cell in a petri dish that splits in two
  { const m = R.group(SX[1] - 0.8, ST, SZ); H.box(0.5, 0.08, 0.4, '#2a2a33', 0, 0.04, 0, m); const arm = H.box(0.1, 0.7, 0.12, '#2a2a33', -0.12, 0.4, -0.1, m); arm.rotation.z = 0.15;
    const tube = H.cyl(0.07, 0.07, 0.42, '#c7cdd9', 0.02, 0.6, 0.02, m, 10); tube.rotation.z = -0.35; H.box(0.34, 0.03, 0.3, '#c7cdd9', 0.02, 0.25, 0, m); }
  R.cyl(0.46, 0.46, 0.05, '#dff4ff', SX[1] + 0.4, ST + 0.03, SZ);
  const cellM = new THREE.MeshStandardMaterial({ color:'#9be58f', roughness:0.3, transparent:true, opacity:0.75 });
  const cells = [0, 1].map(() => { const c = R.group(SX[1] + 0.4, ST + 0.2, SZ); H.ball(0.2, cellM, 0, 0, 0, c, 16); H.ball(0.07, '#3f7d3a', 0.02, 0.02, 0.04, c, 10); return c; });
  let split = -10;
  R.tick((dt, t) => {
    const s = t - split, open = s < 0 ? 0 : s < 2 ? s/2 : s < 6 ? 1 : s < 7 ? 1 - (s - 6) : 0;
    const e = open*open*(3 - 2*open);
    cells.forEach((c, k) => { c.position.x = SX[1] + 0.4 + (k ? 1 : -1)*e*0.24; const pinch = Math.sin(e*Math.PI)*0.25; c.scale.set(1 + pinch*0.4, 1 - pinch*0.3, 1); c.position.y = ST + 0.2 + Math.sin(t*2 + k)*0.02; });
  });
  R.use({ key:'cell', x:SX[1], z:-2.7, r:1.6, y:2.4, label:'Split the cell', hit:cells, pitch:600, fn(){ split = now(); setSubject(1); } });

  // Genetics: a double helix of 12 base pairs, two instanced meshes; it unzips down the middle
  const NB = 12, HY = ST + 0.2, dna = R.group(SX[2], HY, SZ);
  const ballI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ roughness:0.5 }), NB*2);
  const rungI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).rotateZ(Math.PI/2).translate(0.5, 0, 0), new THREE.MeshStandardMaterial({ roughness:0.6 }), NB*2);
  dna.add(ballI, rungI);
  const BASE = { A:'#35b36a', T:'#e5484d', C:'#3a86b4', G:'#ffd166' }, pair = { A:'T', T:'A', C:'G', G:'C' }, seq = 'ATGCGTACCGTA';
  const cA = new THREE.Color(), M4 = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Yx = new THREE.Vector3(0, 1, 0);
  for(let i = 0; i < NB; i++){ ballI.setColorAt(i*2, cA.set('#fffaf0')); ballI.setColorAt(i*2 + 1, cA.set('#fffaf0')); rungI.setColorAt(i*2, cA.set(BASE[seq[i]])); rungI.setColorAt(i*2 + 1, cA.set(BASE[pair[seq[i]]])); }
  let unzip = -10;
  function helix(t){
    const s = t - unzip, open = s < 0 ? 0 : s < 1.5 ? s/1.5 : s < 5 ? 1 : s < 6.5 ? 1 - (s - 5)/1.5 : 0;
    for(let i = 0; i < NB; i++){
      const a = i*0.52, y = i*0.12, gap = clamp((NB - 1)*open - i + 1, 0, 1);   // unzips from the bottom up
      for(const sd of [0, 1]){
        const ang = a + sd*Math.PI, r = 0.3 + gap*0.22, x = Math.cos(ang)*r, z = Math.sin(ang)*r;
        ballI.setMatrixAt(i*2 + sd, M4.compose(V.set(x, y, z), Q.identity(), S.set(1, 1, 1)));
        // the half rung points from its backbone ball toward the axis, shorter as the pair opens
        Q.setFromAxisAngle(Yx, Math.PI - ang);
        rungI.setMatrixAt(i*2 + sd, M4.compose(V.set(x, y, z), Q, S.set(Math.max(0.02, 0.29 - gap*0.12), 1, 1)));
      }
    }
    ballI.instanceMatrix.needsUpdate = rungI.instanceMatrix.needsUpdate = true;
  }
  helix(0);
  R.cyl(0.22, 0.26, 0.1, '#6b4a33', SX[2], ST + 0.05, SZ); R.cyl(0.02, 0.02, 1.5, '#9aa3b8', SX[2], ST + 0.8, SZ, R.s, 6);
  R.tick((dt, t) => { dna.rotation.y += dt*(t - unzip < 6.5 ? 0.3 : 0.9); helix(t); });
  R.use({ key:'dna', x:SX[2], z:-2.7, r:1.6, y:2.9, label:'Unzip the DNA', hit:dna, pitch:700, fn(){ unzip = now(); setSubject(2); } });

  // Chemistry: a burette over a flask; titrate and the flask turns pink and fizzes
  const glass = new THREE.MeshStandardMaterial({ color:'#dff4ff', roughness:0.05, transparent:true, opacity:0.3, depthWrite:false });
  const CX = SX[3] + 0.2;
  R.box(0.5, 0.05, 0.4, '#2a2a33', CX - 0.5, ST + 0.03, SZ - 0.15); R.cyl(0.025, 0.025, 1.6, '#9aa3b8', CX - 0.6, ST + 0.8, SZ - 0.15, R.s, 6); R.box(0.6, 0.05, 0.05, '#9aa3b8', CX - 0.3, ST + 1.35, SZ - 0.15);
  const bur = H.cyl(0.05, 0.05, 0.8, glass, CX, ST + 1.3, SZ - 0.15, R.g, 10); bur.castShadow = false;
  R.cyl(0.042, 0.042, 0.6, '#ff9fc4', CX, ST + 1.25, SZ - 0.15, R.s, 8);
  const liqM = new THREE.MeshStandardMaterial({ color:'#eef6ff', roughness:0.2, transparent:true, opacity:0.85 });
  H.mesh(new THREE.ConeGeometry(0.28, 0.3, 18), liqM, CX, ST + 0.16, SZ - 0.15, R.g);
  const fl = H.mesh(new THREE.ConeGeometry(0.34, 0.55, 18, 1, true), glass, CX, ST + 0.28, SZ - 0.15, R.g); fl.castShadow = false;
  H.cyl(0.07, 0.07, 0.25, glass, CX, ST + 0.66, SZ - 0.15, R.g, 10).castShadow = false;
  for(const [dx, c] of [[0.75, '#8fd3ff'], [-1.05, '#ffd166']]){ R.cyl(0.14, 0.16, 0.34, c, SX[3] + dx, ST + 0.17, SZ + 0.1, R.s, 14); R.cyl(0.05, 0.05, 0.16, '#dff4ff', SX[3] + dx, ST + 0.42, SZ + 0.1, R.s, 8); }
  const drop = H.ball(0.035, '#ff9fc4', CX, ST + 0.85, SZ - 0.15, R.g, 8); drop.visible = false;
  const bubbles = Array.from({ length:8 }, (_, k) => { const b = H.ball(0.03, '#ffffff', CX, 0, SZ - 0.15, R.g, 6); b.visible = false; return { b, ph:k/8 }; });
  let tit = -10;
  const clear = new THREE.Color('#eef6ff'), pink = new THREE.Color('#ff5fa2');
  R.tick((dt, t) => {
    const s = t - tit, dripping = s >= 0 && s < 2.4, fizz = s > 2.2 && s < 7;
    drop.visible = dripping; if(dripping){ const f = (s*2.5) % 1; drop.position.y = ST + 0.88 - f*0.55; }
    const k = s < 2.2 ? clamp(s/2.2, 0, 1)*0.15 : s < 7 ? 1 : s < 8.5 ? 1 - (s - 7)/1.5 : 0;
    liqM.color.copy(clear).lerp(pink, k);
    bubbles.forEach(q => { q.b.visible = fizz; if(fizz){ const f = (t*0.9 + q.ph) % 1; q.b.position.set(CX + Math.sin(q.ph*20)*0.12, ST + 0.18 + f*0.6, SZ - 0.15 + Math.cos(q.ph*20)*0.08); } });
  });
  R.use({ key:'flask', x:SX[3], z:-2.7, r:1.6, y:2.6, label:'Titrate the flask', hit:[fl, bur], pitch:760, fn(){ tit = now(); setSubject(3); } });

  // Physics: a Newton's cradle. The end ball swings out and the far one answers, click by click.
  const cr = R.group(SX[4], ST, SZ);
  for(const sx of [-0.7, 0.7]) for(const sz of [-0.25, 0.25]) H.cyl(0.025, 0.025, 1.0, '#9aa3b8', sx, 0.5, sz, cr, 6);
  for(const sz of [-0.25, 0.25]) H.box(1.44, 0.04, 0.04, '#9aa3b8', 0, 1.0, sz, cr);
  H.box(1.6, 0.06, 0.7, '#2a2a33', 0, 0.03, 0, cr);
  const steel = new THREE.MeshStandardMaterial({ color:'#d9dde6', roughness:0.15, metalness:0.8 });
  const piv = [-0.48, -0.24, 0, 0.24, 0.48].map(x => {
    const p = new THREE.Group(); p.position.set(x, 1.0, 0); cr.add(p);
    for(const sz of [-0.25, 0.25]){ const s = H.cyl(0.006, 0.006, 0.65, '#1f2a44', 0, -0.3, sz/2, p, 4); s.rotation.x = sz > 0 ? 0.39 : -0.39; }   // a V of two strings up to the rails
    H.ball(0.12, steel, 0, -0.6, 0, p, 16); return p;
  });
  let swing = -10, lastSign = 0;
  R.tick((dt, t) => {
    const s = t - swing, live = s >= 0 && s < 9, A = live ? 0.75*Math.exp(-s*0.32) : 0;
    const v = live ? -A*Math.cos(s*Math.PI*1.8) : 0;   // starts pulled out to the left; below zero the left ball swings, above it the right
    piv.forEach(p => { p.rotation.z = 0; });
    if(v < 0) piv[0].rotation.z = v; else if(v > 0) piv[4].rotation.z = v;
    const sg = Math.sign(v); if(A > 0.03 && sg && lastSign && sg !== lastSign) tone(R, 1900, 0.03, 'square', 0.03); lastSign = sg;
  });
  R.use({ key:'cradle', x:SX[4], z:-2.7, r:1.6, y:2.6, label:'Swing the cradle', hit:cr, pitch:820, fn(){ swing = now(); setSubject(4); } });

  // students at desks in the two front corners, facing the board
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  [[-7.0, 2.6], [-4.6, 2.6], [-5.8, 4.4], [4.6, 2.6], [7.0, 2.6], [5.8, 4.4]].forEach(([x, z], k) => {
    R.box(1.3, 0.07, 0.72, paper, x, 0.74, z); for(const lx of [-0.58, 0.58]) R.box(0.07, 0.72, 0.62, '#8a5a3c', x + lx, 0.36, z);
    R.box(0.36, 0.02, 0.26, '#ffffff', x + 0.25, 0.79, z + 0.05); R.box(0.6, 0.06, 0.5, '#8a5a3c', x, 0.44, z + 0.72);
    R.solid(x, z + 0.3, 0.7, 0.75);
    kids.push(person(R, cols[k], x, z + 0.72, { face:Math.PI, scale:0.6 }));
  });
  const talker = kids[3];
  R.use({ key:'student', x:3.4, z:3.4, r:1.3, y:2.1, label:'Talk to the student', hit:talker.b, silent:true, fn(){
    talker.hop();
    talk(R, { name:'Student', portrait:'blob', color:'#b5e48c', lines:[
      'Every station up front does something. Press F at one and the board switches to that subject.',
      'Andrew taught anatomy, biology, genetics, chemistry and physics here, to several dozen students.',
      'That was Education One in Darnestown, from June 2025 to January 2026.'] });
  } });
  R.lamp('pendant', -4.6, 3.4, -1.0, { top:6.4 }); R.lamp('pendant', 4.6, 3.4, -1.0, { top:6.4 });
  dbg.classroom = () => ({ subject:SUBJ[subject] ?? null, bpm:Math.round(HS.rate*60), beats:HS.beats });
  R.stop('Education One', 'From June 2025 to January 2026 in Darnestown, Andrew was a math and sciences tutor at Education One, teaching several dozen students.', 0, 4.6, SZ);
  R.stop('Five stations', 'Anatomy, biology, genetics, chemistry and physics. Press F at a bench: the heart races, the cell splits, the DNA unzips, the flask turns pink, the cradle swings.', SX[0], 3.0, SZ);
}

// ---------- 2. SAT Score Lab ----------
function satLab(R, dbg){
  const { THREE, H } = R;
  const BZ = -4.4, BASE = 0.3, XS = [-4.4, -2.2, 0, 2.2, 4.4], GOAL = [1.4, 2.2, 3.0, 1.0, 1.8];   // gains in hundreds of points
  const COL = ['#3a86b4', '#35a36a', '#e58a3b', '#d6689a', '#8a5cc2'];
  const TOPICS = ['Algebra', 'Geometry', 'Data', 'Reading', 'Grammar'];
  const S = { sets:0, fly:[], done:-10 };
  const skill = TOPICS.map((_, i) => XS.map((_, j) => 0.15 + ((i*3 + j*5) % 7)*0.06));
  // the plinth and the band between +100 and +300
  R.box(10.8, BASE, 1.5, '#ffffff', 0, BASE/2, BZ); R.box(10.9, 0.05, 1.6, blue, 0, BASE, BZ);
  R.solid(0, BZ, 5.45, 0.8);
  const bandM = new THREE.MeshBasicMaterial({ color:'#35b36a', transparent:true, opacity:0.12, depthWrite:false, side:THREE.DoubleSide });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.0), bandM); band.position.set(0, BASE + 2.0, BZ - 0.85); R.g.add(band);
  for(const [y, c] of [[1.0, '#e5484d'], [3.0, '#35b36a']]){ const l = R.box(11, 0.06, 0.06, c, 0, BASE + y, BZ - 0.8); l.castShadow = false; }
  R.float('+100', -3.3, BASE + 1.0, BZ - 0.75, { size:22, bg:'#e5484d', fg:'#ffffff', scale:0.75 });
  R.float('+300', -3.3, BASE + 3.0, BZ - 0.75, { size:22, bg:'#35b36a', fg:'#ffffff', scale:0.75 });
  // five bars, each lifting a student
  const bars = XS.map((x, k) => {
    const m = new THREE.MeshStandardMaterial({ color:COL[k], roughness:0.5 });
    const bar = H.box(1.2, 1, 1.0, m, x, BASE, BZ, R.g); bar.scale.y = 0.01;
    const who = person(R, ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#fffaf0'][k], x, BZ, { face:0, scale:0.7, y:BASE + 0.1 });
    return { bar, m, who, h:0.1, want:0.1 };
  });
  // the data, on the two chamfered corner walls
  const corner = (sx, draw, fps) => R.screen(2.9, 1.9, draw, { x:sx*(R.w/2 - 1.2) - sx*0.08, y:2.4, z:R.back + 1.2 + 0.08, rotY:sx < 0 ? Math.PI/4 : -Math.PI/4, fps, px:110 });
  corner(-1, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = blue; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#ffffff'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Practice scores', 14, 21);
    g.textAlign = 'right'; H.F(g, 600, 18, 'Nunito'); g.fillText(`set ${S.sets} of 5`, w - 14, 21);
    const x0 = 44, y0 = h - 30, gw = w - 64, gh = h - 90;
    g.strokeStyle = '#c8d0de'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - gh); g.lineTo(x0, y0); g.lineTo(x0 + gw, y0); g.stroke();
    bars.forEach((b, k) => { g.strokeStyle = COL[k]; g.lineWidth = 4; g.beginPath();
      for(let n = 0; n <= S.sets; n++){ const v = GOAL[k]*Math.sin(n/5*Math.PI/2)/3, x = x0 + gw*n/5, y = y0 - gh*v; n ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); });
  }, 4);
  corner(1, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = blue; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#ffffff'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Weak topics', 14, 21);
    const cw = (w - 110)/5, ch = (h - 60)/5;
    TOPICS.forEach((tp, i) => { g.fillStyle = ink; H.F(g, 600, 15, 'Nunito'); g.textAlign = 'left'; g.fillText(tp, 8, 52 + i*ch + ch/2);
      XS.forEach((_, j) => { const v = skill[i][j]; g.fillStyle = `hsl(${Math.round(v*120)}, 70%, ${60 - v*10}%)`; H.rr(g, 100 + j*cw + 3, 50 + i*ch + 3, cw - 6, ch - 6, 6); g.fill(); }); });
  }, 4);
  // the practice console at the front: worksheets fly from here to the bars
  const con = R.group(0, 0, 2.8);
  H.box(2.0, 0.9, 0.8, '#2f4f6a', 0, 0.45, 0, con); H.box(2.1, 0.06, 0.9, blue, 0, 0.93, 0, con);
  const stackM = new THREE.MeshStandardMaterial({ color:paper, roughness:0.8 });
  for(let k = 0; k < 5; k++) H.box(0.5, 0.03, 0.36, stackM, -0.5, 0.98 + k*0.035, 0, con);
  const slotM = new THREE.MeshBasicMaterial({ color:'#35b36a' }); H.box(0.5, 0.08, 0.08, slotM, 0.5, 1.0, -0.2, con);
  R.solid(0, 2.8, 1.05, 0.45);
  const sheets = XS.map(() => { const m = H.box(0.42, 0.02, 0.3, stackM, 0, 0, 0, R.g); m.visible = false; return m; });
  function practise(){
    const t = now();
    if(S.fly.length) return false;
    if(S.sets >= 5){ S.sets = 0; bars.forEach(b => { b.want = 0.1; }); skill.forEach((row, i) => row.forEach((_, j) => { row[j] = 0.15 + ((i*3 + j*5) % 7)*0.06; })); }
    S.sets++;
    XS.forEach((x, k) => S.fly.push({ k, t0:t + k*0.18 }));
    return true;
  }
  R.tick((dt, t) => {
    for(let n = S.fly.length - 1; n >= 0; n--){
      const f = S.fly[n], p = (t - f.t0)/0.8, m = sheets[f.k];
      if(p < 0) continue;
      if(p >= 1){ m.visible = false; S.fly.splice(n, 1); const b = bars[f.k]; b.want = 0.1 + GOAL[f.k]*Math.sin(S.sets/5*Math.PI/2); b.who.hop(0.3);
        skill.forEach(row => { row[f.k] = Math.min(1, row[f.k] + 0.14 + (1 - row[f.k])*0.1); }); tone(R, 520 + f.k*90, 0.1, 'triangle', 0.05);
        if(!S.fly.length && S.sets >= 5){ S.done = t; burst(R, 0, 3.8, BZ + 0.8); R.chime(990); }
        continue; }
      m.visible = true; const x = XS[f.k]*p, top = bars[f.k].h + BASE + 0.6;
      m.position.set(x, 1.1 + (top - 1.1)*p + Math.sin(p*Math.PI)*2.0, 2.8 + (BZ - 2.8)*p); m.rotation.set(p*6, 0, p*3);
    }
    bars.forEach((b, k) => {
      b.h += (b.want - b.h)*(1 - Math.exp(-2.4*dt));
      b.bar.scale.y = b.h; b.bar.position.y = BASE + b.h/2; b.who.base(BASE + b.h);
      b.m.emissive.set(t - S.done < 3 ? COL[k] : '#000000'); b.m.emissiveIntensity = 0.3;
    });
    slotM.color.set(S.fly.length ? ((t*8|0) % 2 ? '#ffd166' : '#35b36a') : '#35b36a');
  });
  R.use({ key:'practice', x:0, z:1.5, r:1.6, y:2.3, label:'Run a practice set', hit:[con], pitch:660, fn(){ practise(); } });
  const coach = person(R, '#ffb35c', -4.6, 2.6, { face:0.5 }); R.solidR(-4.6, 2.6, 0.45);
  R.use({ key:'coach', x:-4.6, z:3.8, r:1.4, y:2.4, label:'Talk to the SAT student', hit:coach.b, silent:true, fn(){
    coach.hop();
    talk(R, { name:'SAT student', portrait:'blob', color:'#ffb35c', lines:[
      'Take a practice set, see what the data says, then practise the weak spots. Repeat.',
      'Andrew\'s SAT students improved 100 to 300 points on data-driven practice.',
      'Press F at the console five times and watch everyone climb into the band.'] });
  } });
  R.lamp('floor', 6.6, 1.6, 2.4); R.lamp('floor', -7.0, 1.6, 3.8);
  dbg.sat = () => ({ sets:S.sets, flying:S.fly.length, heights:bars.map(b => +(b.h*100).toFixed(0)) });
  R.stop('SAT practice', 'Andrew\'s SAT students improved 100 to 300 points. Press F at the console to run a practice set: each bar lifts its student toward the band between +100 and +300.', 0, 3.9, BZ);
  R.stop('Data-driven', 'The corner screens are the data: scores per practice set on the left, weak topics on the right, turning green as they get practised.', -5.6, 3.1, -4.6);
}

// ---------- 3. Back Office: the Apps Script grading machine ----------
const ROWS = [['Ana', 'ok'], ['Ben', 'ok'], ['Ana', 'dup'], ['Cal', 'ok'], ['Dee', 'bill'], ['Eli', 'ok'], ['Ben', 'dup'], ['Fay', 'ok']];
const WHO = { Ana:'#ffd166', Ben:'#8fd3ff', Cal:'#b5e48c', Dee:'#ff9fb2', Eli:'#cdb4db', Fay:'#ffb35c' };
function office(R, dbg){
  const { THREE, H } = R;
  const BZ = -2.9, BY = 0.9, X0 = -7.0, X1 = 5.0, SCAN = -2.0, BILL = 1.2, SPEED = 1.4, GAP = 1.0;
  const S = { run:-10, active:false, dups:0, bills:0, graded:0, runs:0, alarm:-10 };
  // the belt, with a moving stripe texture
  const beltT = H.canvasTex(64, 16, g => { g.fillStyle = '#2f3b36'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#46564f'; for(let x = 0; x < 64; x += 16) g.fillRect(x, 0, 6, 16); });
  beltT.tex.wrapS = THREE.RepeatWrapping; beltT.tex.repeat.set(12, 1);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.1, 0.9), new THREE.MeshStandardMaterial({ map:beltT.tex, roughness:0.7 }));
  belt.position.set((X0 + X1)/2, BY, BZ); belt.receiveShadow = true; R.g.add(belt);
  R.box(X1 - X0 + 0.2, 0.18, 1.1, '#2f6b45', (X0 + X1)/2, BY - 0.12, BZ);
  for(let k = 0; k <= 6; k++) R.box(0.14, BY - 0.2, 0.8, '#2f6b45', X0 + 0.2 + k*(X1 - X0 - 0.4)/6, (BY - 0.2)/2, BZ);
  R.solid((X0 + X1)/2 + 0.35, BZ, (X1 - X0)/2 + 0.45, 0.62);
  // the scanner arch with the Apps Script sign and a beacon on top
  for(const sz of [-0.62, 0.62]) R.box(0.22, 2.2, 0.22, green, SCAN, 1.1, BZ + sz);
  R.box(0.5, 0.4, 1.5, green, SCAN, 2.3, BZ);
  const sg = R.sign('Apps Script', null, { w:1.6, h:0.42, bg:'#1f6b45', fg:'#ffffff', size:48 }); sg.position.set(SCAN, 2.3, BZ + 0.76);
  const scanM = new THREE.MeshBasicMaterial({ color:'#7ee2a0', transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), scanM); curtain.rotation.y = Math.PI/2; curtain.position.set(SCAN, 1.5, BZ); R.g.add(curtain);
  const beaconM = new THREE.MeshStandardMaterial({ color:'#e5484d', emissive:'#e5484d', emissiveIntensity:0.1, roughness:0.3 });
  const beacon = R.group(SCAN, 2.5, BZ); H.cyl(0.16, 0.2, 0.26, beaconM, 0, 0.13, 0, beacon, 14);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 14, 1, true), R.addMat(R.tex.shaft, '#ff6b6b', 0.0)); beam.material = beam.material.clone(); beam.rotation.z = Math.PI/2; beam.position.set(1.2, 0.15, 0); beacon.add(beam);
  // bins behind the belt: duplicates (red) at the scanner, billing alerts (amber) further on
  const bin = (x, c, name) => { R.box(1.2, 0.08, 1.0, c, x, 0.04, -4.6); for(const [bx, bz, w, d] of [[-0.58, 0, 0.06, 1.0], [0.58, 0, 0.06, 1.0], [0, -0.48, 1.2, 0.06], [0, 0.48, 1.2, 0.06]]) R.box(w, 0.7, d, c, x + bx, 0.35, -4.6 + bz);
    const s = R.sign(name, null, { w:1.3, h:0.34, bg:c, fg:'#ffffff', size:40 }); s.position.set(x, 1.0, -4.05); R.solid(x, -4.6, 0.65, 0.55); };
  bin(SCAN, '#e5484d', 'Duplicates'); bin(BILL, '#d99a00', 'Billing alerts');
  // the kicker paddle at the scanner
  const kick = R.group(SCAN, BY + 0.25, BZ + 0.5); H.box(0.1, 0.3, 0.5, '#fffaf0', 0, 0, -0.25, kick);
  // the graded stack at the end, with a stamp
  R.box(1.0, 0.9, 1.0, '#2f6b45', 5.7, 0.45, BZ); R.solid(5.7, BZ, 0.55, 0.55);
  const stamp = R.group(4.75, 1.9, BZ); H.box(0.36, 0.3, 0.36, '#35b36a', 0, 0, 0, stamp); H.cyl(0.05, 0.05, 0.6, '#9aa3b8', 0, 0.45, 0, stamp, 6);
  R.box(0.1, 1.4, 0.1, '#9aa3b8', 4.75, 1.6, BZ - 0.55); R.box(0.1, 0.1, 0.6, '#9aa3b8', 4.75, 2.3, BZ - 0.28);
  // the cards: one per row, reused every run
  const cards = ROWS.map(([who, kind], i) => {
    const g = R.group(X0, BY + 0.07, BZ); g.visible = false;
    H.box(0.5, 0.04, 0.36, paper, 0, 0, 0, g); H.box(0.5, 0.045, 0.1, WHO[who], 0, 0.002, -0.12, g);
    const markM = new THREE.MeshBasicMaterial({ color:'#35b36a' }); const mark = H.box(0.16, 0.05, 0.16, markM, 0.12, 0.01, 0.06, g); mark.visible = false;
    return { g, who, kind, i, mark, markM, state:'wait', t:0, from:null };
  });
  // piggy bank on a plinth: every catch drops a coin in
  const pig = R.group(7.1, 1.05, -4.6);
  const pBody = H.ball(0.5, '#ff9fb2', 0, 0.38, 0, pig, 20); pBody.scale.set(1.25, 1, 1);
  H.cyl(0.16, 0.16, 0.16, '#ff7a9a', 0.62, 0.4, 0, pig, 12).rotation.z = Math.PI/2;
  for(const [lx, lz] of [[-0.34, -0.26], [0.34, -0.26], [-0.34, 0.26], [0.34, 0.26]]) H.cyl(0.09, 0.09, 0.24, '#ff9fb2', lx, 0.02, lz, pig, 8);
  H.box(0.24, 0.03, 0.05, '#b24a6a', 0, 0.87, 0, pig);
  { const e = new THREE.Group(); e.position.set(0.5, 0.2, 0); e.rotation.y = Math.PI/2; pig.add(e); if(H.eyes) H.eyes(e, 0.35, 0.18, 0.14, 0.045, false); }
  R.box(1.3, 1.0, 1.3, '#ffffff', 7.1, 0.5, -4.6); R.solid(7.1, -4.6, 0.7, 0.7);
  const coins = Array.from({ length:6 }, () => { const m = H.cyl(0.13, 0.13, 0.04, '#ffd166', 0, 0, 0, R.g, 14); m.rotation.x = Math.PI/2; m.visible = false; return { m, t:-1, x:0, z:0 }; });
  const coin = (x, z) => { const c = coins.find(q => q.t < 0); if(c){ c.t = 0; c.x = x; c.z = z; c.m.visible = true; } };
  // the sheet on the back wall and the profit gauge beside it
  R.box(5.4, 2.4, 0.1, ink, -4.6, 2.15, R.back + 0.06);
  const sheet = R.screen(5.2, 2.2, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = green; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#ffffff'; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Grades  ·  Apps Script', 14, 21);
    const rh = (h - 44)/ROWS.length;
    cards.forEach((c, k) => {
      const y = 44 + k*rh, seen = c.state !== 'wait' && c.state !== 'belt' || (c.state === 'belt' && c.g.position.x > SCAN);
      g.fillStyle = seen && c.kind === 'dup' ? '#ffe0e0' : seen && c.kind === 'bill' ? '#fff1c4' : k % 2 ? '#f4f6fb' : '#ffffff'; g.fillRect(0, y, w, rh);
      if(c.state === 'belt' && Math.abs(c.g.position.x - SCAN) < 0.4){ g.fillStyle = '#35a36a33'; g.fillRect(0, y, w, rh); }
      g.fillStyle = WHO[c.who]; g.fillRect(8, y + 5, 8, rh - 10);
      g.fillStyle = ink; H.F(g, 600, 17, 'Nunito'); g.fillText(c.who, 26, y + rh/2); g.fillText(c.kind === 'bill' ? 'invoice' : 'quiz grade', w*0.3, y + rh/2);
      if(seen && c.kind !== 'ok'){ g.fillStyle = c.kind === 'dup' ? '#e5484d' : '#b8860b'; H.F(g, 700, 16); g.fillText(c.kind === 'dup' ? 'duplicate' : 'billing alert', w*0.62, y + rh/2); }
      else if(c.state === 'done'){ g.fillStyle = '#35a36a'; H.F(g, 700, 16); g.fillText('graded', w*0.62, y + rh/2); }
    });
  }, { x:-4.6, y:2.15, z:R.back + 0.13, fps:8, px:100 });
  R.box(2.3, 2.3, 0.1, ink, 5.6, 2.3, R.back + 0.06);
  const gauge = R.screen(2.2, 2.2, (g, w, h, t) => {
    g.fillStyle = '#f7fbf5'; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Profit', w/2, 26);
    const cx = w/2, cy = h*0.62, r = w*0.36;
    g.lineWidth = 18; g.lineCap = 'butt'; [['#e5484d', 0, 0.33], ['#ffd166', 0.33, 0.66], ['#35b36a', 0.66, 1]].forEach(([c, a, b]) => { g.strokeStyle = c; g.beginPath(); g.arc(cx, cy, r, Math.PI + a*Math.PI, Math.PI + b*Math.PI); g.stroke(); });
    const v = S.runs ? 0.88 : 0.4 + Math.sin(t*0.8)*0.02, a = Math.PI + v*Math.PI;
    g.strokeStyle = ink; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a)*r*0.9, cy + Math.sin(a)*r*0.9); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
    H.F(g, 700, 20); g.fillText(S.runs ? 'about 30% more' : 'run the script', w/2, h*0.78);
    H.F(g, 600, 16, 'Nunito'); g.fillStyle = '#1f2a44aa'; g.fillText(`caught: ${S.dups} duplicates, ${S.bills} bills`, w/2, h*0.9);
  }, { x:5.6, y:2.3, z:R.back + 0.13, fps:6, px:100 });
  R.float('$2,000+ in losses prevented', 7.1, 2.55, -4.6, { size:24, bg:green, fg:'#ffffff', scale:0.8 });

  // the run: cards leave the start of the belt one by one
  function run(){
    if(S.active) return false;
    S.active = true; S.run = now(); S.dups = 0; S.bills = 0; S.graded = 0;
    cards.forEach(c => { c.state = 'wait'; c.g.visible = false; c.mark.visible = false; c.g.rotation.set(0, 0, 0); });
    return true;
  }
  const arc = (c, p, to, lift) => { const [fx, fy, fz] = c.from; c.g.position.set(fx + (to[0] - fx)*p, fy + (to[1] - fy)*p + Math.sin(p*Math.PI)*lift, fz + (to[2] - fz)*p); };
  R.tick((dt, t) => {
    let moving = false, scanning = false;
    if(S.active){
      const e = t - S.run;
      cards.forEach(c => {
        if(c.state === 'wait' && e >= c.i*GAP){ c.state = 'belt'; c.g.visible = true; c.g.position.set(X0, BY + 0.07, BZ); }
        if(c.state === 'belt'){
          moving = true; c.g.position.x += SPEED*dt;
          const x = c.g.position.x; if(Math.abs(x - SCAN) < 0.3) scanning = true;
          if(c.kind === 'dup' && x >= SCAN){ c.state = 'kick'; c.t = 0; c.from = [x, BY + 0.07, BZ]; S.dups++; R.buzz(); coin(SCAN, -4.6); }
          else if(c.kind === 'bill' && x >= BILL){ c.state = 'alarm'; c.t = 0; c.from = [x, BY + 0.07, BZ]; S.bills++; S.alarm = t; coin(BILL, -4.6); }
          else if(x >= X1 - 0.3){ c.state = 'stamp'; c.t = 0; c.from = [x, BY + 0.07, BZ]; }
        } else if(c.state === 'kick'){ c.t += dt/0.7; arc(c, Math.min(1, c.t), [SCAN, 0.35 + c.i*0.02, -4.6], 0.8); c.g.rotation.x = c.t*6; if(c.t >= 1) c.state = 'binned'; }
        else if(c.state === 'alarm'){ c.t += dt/1.2; if(c.t > 0.4) arc(c, Math.min(1, (c.t - 0.4)/0.6), [BILL, 0.35, -4.6], 0.9); if(c.t >= 1) c.state = 'binned'; }
        else if(c.state === 'stamp'){ c.t += dt/0.9; if(c.t > 0.45 && !c.mark.visible){ c.mark.visible = true; tone(R, 440, 0.06, 'square', 0.04); }
          if(c.t > 0.55) arc(c, Math.min(1, (c.t - 0.55)/0.45), [5.7, 0.95 + S.graded*0.045, BZ], 0.4); if(c.t >= 1){ c.state = 'done'; S.graded++; } }
      });
      if(cards.every(c => c.state === 'done' || c.state === 'binned')){ S.active = false; S.runs++; burst(R, 5.7, 2.2, BZ + 0.5); R.chime(990); sheet.redraw(); }
    }
    beltT.tex.offset.x -= (moving ? SPEED/(X1 - X0)*12 : 0.1)*dt;
    scanM.opacity = scanning ? 0.45 + Math.sin(t*30)*0.15 : 0;
    kick.rotation.y = cards.some(c => c.state === 'kick' && c.t < 0.3) ? -1.2 : kick.rotation.y*(1 - Math.min(1, dt*6));
    const stamping = cards.find(c => c.state === 'stamp'); stamp.position.y = stamping ? 1.9 - Math.sin(clamp(stamping.t/0.5, 0, 1)*Math.PI)*0.8 : 1.9;
    const al = t - S.alarm < 3;
    beacon.rotation.y += dt*(al ? 9 : 0); beam.material.opacity = al ? 0.4 : 0; beaconM.emissiveIntensity = al ? 0.6 + Math.sin(t*20)*0.4 : 0.1;
    if(al && ((t*4)|0) !== S.ding){ S.ding = (t*4)|0; tone(R, 1320, 0.05, 'triangle', 0.04); }
    coins.forEach(c => { if(c.t < 0) return; c.t += dt/1.1; const p = Math.min(1, c.t); c.m.position.set(c.x + (7.1 - c.x)*p, 1.2 + Math.sin(p*Math.PI)*2.2 + (1.95 - 1.2)*p, -4.6); c.m.rotation.y += dt*10;
      if(p >= 1){ c.t = -1; c.m.visible = false; pig.scale.setScalar(1.12); tone(R, 1568, 0.08, 'sine', 0.06); } });
    if(pig.scale.x > 1) pig.scale.setScalar(Math.max(1, pig.scale.x - dt*0.4));
    pig.rotation.y = Math.sin(t*0.8)*0.25;
  });
  // the control panel at the start of the belt
  const panel = R.group(-7.4, 0, -1.55);
  H.cyl(0.3, 0.36, 1.0, '#2f6b45', 0, 0.5, 0, panel, 14); const go = H.cyl(0.18, 0.18, 0.08, '#35b36a', 0, 1.04, 0, panel, 16);
  R.solidR(-7.4, -1.55, 0.4);
  R.use({ key:'grade', x:-6.3, z:-0.4, r:1.6, y:2.2, label:'Run the grading script', hit:[panel, belt], pitch:740, fn(){ run(); } });
  // the script itself, as a small robot with a spreadsheet for a face
  const bot = R.group(3.2, 0, 2.8); bot.rotation.y = -0.4;
  H.box(0.7, 0.55, 0.5, '#e8edf2', 0, 0.45, 0, bot); const head = H.box(0.9, 0.66, 0.6, '#f5f7fa', 0, 1.05, 0, bot);
  R.screen(0.7, 0.44, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#35a36a'; g.lineWidth = 2; for(let k = 1; k < 4; k++){ g.beginPath(); g.moveTo(0, k*h/4); g.lineTo(w, k*h/4); g.stroke(); g.beginPath(); g.moveTo(k*w/4, 0); g.lineTo(k*w/4, h); g.stroke(); } g.fillStyle = ink; g.beginPath(); g.arc(w*0.33, h*0.4, 6, 0, 7); g.arc(w*0.67, h*0.4, 6, 0, 7); g.fill(); }, { parent:bot, y:1.06, z:0.31, px:110 });
  for(const sx of [-0.36, 0.36]){ const w = H.cyl(0.14, 0.14, 0.1, ink, sx, 0.15, 0, bot, 12); w.rotation.z = Math.PI/2; }
  R.solidR(3.2, 2.8, 0.55);
  let hopAt = -10; R.tick((dt, t) => { const s = t - hopAt; bot.position.y = s < 0.6 ? Math.sin(s/0.6*Math.PI)*0.4 : 0; head.rotation.z = S.active ? Math.sin(t*6)*0.08 : 0; });
  R.use({ key:'script', x:3.2, z:4.0, r:1.4, y:2.3, label:'Talk to the grading script', hit:bot, silent:true, fn(){
    hopAt = now();
    talk(R, { name:'Grading script', portrait:'robot', lines:[
      'I read every grade row, flag duplicates, and ring the alarm when a bill looks wrong.',
      'Andrew built Apps Script systems like me at Education One, for grading, duplicate detection and billing alerts.',
      'About 30% more profitable, and $2,000+ in losses prevented. Press F at the green panel to watch me work.'] });
  } });
  R.lamp('pendant', -4.6, 3.3, -1.2, { top:R.h }); R.lamp('pendant', 2.4, 3.3, -1.2, { top:R.h });
  dbg.office = () => ({ active:S.active, runs:S.runs, dups:S.dups, bills:S.bills, graded:S.graded });
  R.stop('The grading machine', 'Apps Script systems for grading, duplicate detection and billing alerts. Press F at the green panel: rows ride the belt, the scanner kicks duplicates into the red bin, and a billing problem sets off the alarm.', SCAN, 3.3, BZ);
  R.stop('Losses prevented', 'The scripts made Education One about 30% more profitable and prevented $2,000+ in losses. Every catch drops a coin in the pig.', 7.1, 2.9, -4.2);
}
