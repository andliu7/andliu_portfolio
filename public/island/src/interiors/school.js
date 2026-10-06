// Interior for the "school" zone: tutoring at Education One. Three rooms built with the shared
// tour kit in blueberry.js. Content comes only from data/zones.js.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', red = '#d9534f';

export function build(ctx, kit){
  return makeTour(ctx, kit, {
    sky:'#fff0e6', skyLow:'#a83e3a', plinth:'#6b3b36',
    rooms: [
      { name:'Classroom', sub:'Anatomy, biology, genetics, chemistry and physics for several dozen students', w:16, wall:'#fff6ea', floor:'#e9d3ae', floor2:'#dfc69c', accent:red, build:classroom },
      { name:'SAT Practice', sub:'Data-driven practice: students improved 100 to 300 points', w:14, wall:'#eef6ff', floor:'#d6e4f2', floor2:'#c9daec', accent:'#3a86b4', build:satRoom },
      { name:'Back Office', sub:'Apps Script for grading, duplicate detection and billing alerts', w:14, wall:'#f3fbef', floor:'#dcead3', floor2:'#d0e2c5', accent:'#35a36a', build:officeRoom },
    ],
  });
}

// Chalk drawings, one per subject.
const SUBJECTS = [
  ['Anatomy', (g, w, h) => { g.beginPath(); g.moveTo(w/2, h*0.78); g.bezierCurveTo(w/2 - 150, h*0.5, w/2 - 90, h*0.2, w/2, h*0.38); g.bezierCurveTo(w/2 + 90, h*0.2, w/2 + 150, h*0.5, w/2, h*0.78); g.stroke(); }],
  ['Biology', (g, w, h) => { g.beginPath(); g.ellipse(w/2, h*0.52, 170, 110, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(w/2 + 30, h*0.5, 40, 0, 7); g.stroke(); for(let k = 0; k < 5; k++){ g.beginPath(); g.ellipse(w/2 - 110 + k*20, h*0.38 + (k%2)*80, 18, 10, k, 0, 7); g.stroke(); } }],
  ['Genetics', (g, w, h) => { for(let k = 0; k <= 40; k++){ const x = w/2 - 200 + k*10, a = k*0.35; g.fillRect(x, h*0.52 + Math.sin(a)*60, 5, 5); g.fillRect(x, h*0.52 - Math.sin(a)*60, 5, 5); if(k % 4 === 0){ g.beginPath(); g.moveTo(x + 2, h*0.52 + Math.sin(a)*60); g.lineTo(x + 2, h*0.52 - Math.sin(a)*60); g.stroke(); } } }],
  ['Chemistry', (g, w, h) => { g.beginPath(); for(let k = 0; k <= 6; k++){ const a = k/6*Math.PI*2 + Math.PI/6; const x = w/2 + Math.cos(a)*90, y = h*0.52 + Math.sin(a)*90; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.beginPath(); g.arc(w/2, h*0.52, 55, 0, 7); g.stroke(); }],
  ['Physics', (g, w, h) => { g.strokeRect(w/2 - 70, h*0.42, 140, 90); g.beginPath(); g.moveTo(w/2 + 70, h*0.42 + 45); g.lineTo(w/2 + 230, h*0.42 + 45); g.stroke(); g.beginPath(); g.moveTo(w/2 + 230, h*0.42 + 45); g.lineTo(w/2 + 205, h*0.42 + 30); g.lineTo(w/2 + 205, h*0.42 + 60); g.closePath(); g.fill(); g.font = '600 44px Fredoka, sans-serif'; g.fillText('F = ma', w/2 - 230, h*0.42 + 60); }],
];

function classroom(R){
  const { THREE, H } = R;
  let subject = 0, changed = -10;
  R.box(8.6, 3.0, 0.14, '#6b4a33', 0, 1.75, -5.86);
  const chalk = R.screen(8.2, 2.7, (g, w, h, t) => {
    g.fillStyle = '#2f4f3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f1e8'; g.fillStyle = '#f4f1e8'; g.lineWidth = 6; g.lineCap = 'round';
    H.F(g, 600, 46); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Today: ' + SUBJECTS[subject][0], 36, 64);
    const p = Math.min(1, (t - changed)*1.5);
    g.save(); g.beginPath(); g.rect(0, 0, w*(changed < 0 ? 1 : p), h); g.clip(); SUBJECTS[subject][1](g, w, h); g.restore();
    H.F(g, 500, 24, 'Nunito'); g.globalAlpha = 0.6; g.textAlign = 'right'; g.fillText(SUBJECTS.map(s => s[0]).join('  ·  '), w - 30, h - 24); g.globalAlpha = 1;
  }, { x:0, y:1.75, z:-5.78, fps:12, px:100 });
  R.box(8.6, 0.12, 0.3, '#6b4a33', 0, 0.28, -5.7);
  // teacher's desk with an apple
  R.box(2.6, 0.95, 1.1, '#8a5a3b', -4.6, 0.47, -3.4); R.solid(-4.6, -3.4, 1.35, 0.6);
  R.ball(0.2, '#e5484d', -4.0, 1.12, -3.4, R.g, 14); R.cyl(0.02, 0.02, 0.14, '#6b4a33', -4.0, 1.34, -3.4, R.g, 5);
  R.box(0.9, 0.12, 0.6, '#ffd166', -5.1, 1.0, -3.4);
  // two rows of student desks with students
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  const kids = [];
  for(let row = 0; row < 2; row++) for(let c = 0; c < 3; c++){
    const x = -1.8 + c*2.8 + (row ? 0 : 0.4), z = -1.6 + row*2.3;
    R.box(1.3, 0.08, 0.8, paper, x, 0.75, z); R.box(1.2, 0.72, 0.1, '#8a5a3b', x, 0.37, z - 0.3);
    R.box(0.4, 0.02, 0.3, '#ffffff', x + 0.2, 0.8, z);
    R.solid(x, z, 0.7, 0.45);
    kids.push(R.blob(cols[(row*3 + c) % 6], x, z + 0.75, { face:Math.PI, scale:0.62, amp:0.02 }));
  }
  R.tick((dt, t) => kids.forEach((k, n) => { const hand = t - changed < 2.5 && n % 2 === subject % 2; k.position.y = hand ? 0.12 + Math.abs(Math.sin(t*8 + n))*0.12 : k.position.y; }));
  R.use({ key:'lesson', x:0, z:2.8, r:2.6, label:'Next lesson', hit:chalk.mesh, pitch:520, fn(t){ subject = (subject + 1) % SUBJECTS.length; changed = t; } });
  R.float('Several dozen students', 5.6, 2.4, -3.4, { size:24, bg:red, fg:'#ffffff', scale:0.85 });
}

function satRoom(R){
  const { THREE, H } = R;
  // a 3D bar chart of point gains; practice raises the bars into the 100 to 300 band
  const bars = [], goal = [0.45, 0.7, 1.0, 0.6, 0.85];
  let practice = -10;
  const base = R.box(6.4, 0.2, 1.4, '#ffffff', 0, 0.1, -3.6); R.solid(0, -3.6, 3.3, 0.8);
  for(let k = 0; k < 5; k++){ const b = R.box(0.8, 1, 0.8, ['#3a86b4', '#35a36a', '#e58a3b', '#d6689a', '#8a5cc2'][k], -2.6 + k*1.3, 0.38, -3.6); b.scale.y = 0.36; bars.push(b); }
  // band markers for +100 and +300
  const band = R.box(6.6, 0.04, 0.04, '#e5484d', 0, 0.2 + 3.0*0.33, -3.0); band.castShadow = false;
  const band2 = R.box(6.6, 0.04, 0.04, '#35b36a', 0, 0.2 + 3.0, -3.0); band2.castShadow = false;
  R.float('+100', -3.8, 1.2, -3.0, { size:22, bg:'#e5484d', fg:'#ffffff', scale:0.75 });
  R.float('+300', -3.8, 3.2, -3.0, { size:22, bg:'#35b36a', fg:'#ffffff', scale:0.75 });
  R.tick((dt, t) => {
    const since = t - practice;
    bars.forEach((b, k) => {
      // h is the bar's fraction of the +300 line; the unit box is scaled to h*3 m tall
      const target = since < 8 ? 0.33 + goal[k]*0.67 : 0.12, h0 = b.userData.h ?? 0.12;
      const h = h0 + (target - h0)*(1 - Math.exp(-(since < 8 ? 2.5 - k*0.25 : 1)*dt));
      b.userData.h = h; b.scale.set(1, h*3.0, 1); b.position.y = 0.2 + h*3.0/2;
    });
  });
  R.use({ key:'practice', x:0, z:-1.2, r:2.8, label:'Run a practice set', hit:base, pitch:660, fn(t){ practice = t; setTimeout(() => burst(R, 0, 3.6, -3.2), 1400); } });
  // practice desks with worksheets
  for(const [x, z] of [[-4.6, 1.6], [4.6, 1.6]]){
    R.box(1.8, 0.08, 1.0, paper, x, 0.8, z); for(const lx of [-0.8, 0.8]) R.box(0.1, 0.8, 0.8, '#6b4a33', x + lx, 0.4, z); R.solid(x, z, 0.95, 0.55);
    R.screen(0.9, 0.6, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 14); g.fillText('Practice set', 8, 18); for(let n = 0; n < 4; n++){ g.strokeStyle = '#8a93a8'; g.lineWidth = 2; g.strokeRect(8, 30 + n*16, 10, 10); g.fillStyle = '#c8d0de'; g.fillRect(24, 32 + n*16, w - 40, 6); } }, { x, y:0.85, z, rotX:-Math.PI/2, px:120 });
    R.blob(x < 0 ? '#ffd166' : '#8fd3ff', x, z + 0.85, { face:Math.PI, scale:0.65 });
  }
}

function officeRoom(R){
  const { THREE, H } = R;
  let scanAt = -10, ring = 0;
  // the grading sheet on a big monitor
  R.box(5.2, 3.0, 0.1, ink, -2.0, 1.75, -5.86);
  const rows = [['1', 'A', ''], ['2', 'B', ''], ['1', 'A', 'dup'], ['3', 'A', ''], ['4', 'B', 'bill'], ['5', 'A', '']];
  const sheet = R.screen(5.0, 2.8, (g, w, h, t) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#35a36a'; g.fillRect(0, 0, w, 44);
    g.fillStyle = '#ffffff'; H.F(g, 700, 24); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Grades · Apps Script', 16, 23);
    const since = t - scanAt, scanning = since < 4, scanRow = Math.floor(since*2);
    rows.forEach((r, k) => {
      const y = 48 + k*37;
      const flagged = scanning && scanRow >= k && r[2];
      g.fillStyle = flagged ? (r[2] === 'dup' ? '#ffe0e0' : '#fff1c4') : k % 2 ? '#f4f6fb' : '#ffffff'; g.fillRect(0, y, w, 37);
      if(scanning && scanRow === k){ g.fillStyle = '#35a36a33'; g.fillRect(0, y, w, 37); }
      g.fillStyle = ink; H.F(g, 600, 20, 'Nunito'); g.fillText('Student ' + r[0], 16, y + 19); g.fillText(r[1], w*0.45, y + 19);
      if(flagged){ g.fillStyle = r[2] === 'dup' ? '#e5484d' : '#b8860b'; H.F(g, 700, 18); g.fillText(r[2] === 'dup' ? 'duplicate' : 'billing alert', w*0.65, y + 19); }
    });
  }, { x:-2.0, y:1.75, z:-5.8, fps:10, px:100 });
  // the alert bell
  const bell = new THREE.Group(); bell.position.set(3.4, 2.6, -5.5); R.g.add(bell);
  R.mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI*2, 0, Math.PI/2), '#ffd166', 0, -0.2, 0, bell); R.ball(0.08, '#b8860b', 0, -0.25, 0, bell, 8);
  R.box(0.1, 0.4, 0.1, '#6b4a33', 0, 0.2, 0, bell);
  // piggy bank on a plinth: losses prevented
  const pig = new THREE.Group(); pig.position.set(4.4, 1.0, -1.2); R.g.add(pig);
  const body = R.ball(0.6, '#ff9fb2', 0, 0.45, 0, pig, 20); body.scale.set(1.2, 1, 1);
  R.cyl(0.2, 0.2, 0.2, '#ff7a9a', 0.72, 0.45, 0, pig, 12).rotation.z = Math.PI/2;
  for(const [lx, lz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) R.cyl(0.1, 0.1, 0.3, '#ff9fb2', lx, 0, lz, pig, 8);
  if(H.eyes) { const e = new THREE.Group(); e.position.set(0.55, 0.25, 0); e.rotation.y = Math.PI/2; pig.add(e); H.eyes(e, 0.35, 0.2, 0.15, 0.05, false); }
  R.box(1.4, 1.0, 1.4, '#ffffff', 4.4, 0.5, -1.2); R.solid(4.4, -1.2, 0.75, 0.75);
  R.float('$2,000+ in losses prevented', 4.4, 2.6, -1.2, { size:24, bg:'#35a36a', fg:'#ffffff', scale:0.85 });
  R.float('About 30% more profitable', -4.6, 2.3, 1.4, { size:24, bg:ink, fg:'#ffffff', scale:0.85 });
  // desk with a coffee mug
  R.box(2.4, 0.08, 1.2, '#8a5a3b', -4.6, 0.85, 1.4); for(const lx of [-1.1, 1.1]) R.box(0.1, 0.85, 1.0, '#6b4a33', -4.6 + lx, 0.42, 1.4); R.solid(-4.6, 1.4, 1.25, 0.65);
  R.cyl(0.14, 0.12, 0.26, '#ffffff', -4.0, 1.02, 1.4);
  const coins = [];
  R.tick((dt, t) => {
    const since = t - scanAt;
    ring = since < 3.5 && since > 2 ? 1 : Math.max(0, ring - dt*2);
    bell.rotation.z = Math.sin(t*30)*0.35*ring;
    pig.rotation.y = Math.sin(t*0.8)*0.3; pig.position.y = 1.0 + Math.abs(Math.sin(t*2))*0.05;
    for(let n = coins.length - 1; n >= 0; n--){ const c = coins[n]; c.p += dt*1.5; c.m.position.y = 3.2 - c.p*2.0; c.m.rotation.y += dt*10; if(c.p >= 1){ R.g.remove(c.m); coins.splice(n, 1); pig.scale.setScalar(1.08); } }
    if(pig.scale.x > 1) pig.scale.setScalar(Math.max(1, pig.scale.x - dt*0.3));
  });
  R.use({ key:'scan', x:-2.0, z:-3.2, r:2.6, label:'Scan for duplicates', hit:sheet.mesh, pitch:740, fn(t){
    scanAt = t;
    for(let k = 0; k < 3; k++) setTimeout(() => { const m = R.cyl(0.16, 0.16, 0.05, '#ffd166', 4.4, 3.2, -1.2, R.g, 14); m.rotation.x = Math.PI/2; coins.push({ m, p:0 }); }, 2200 + k*300);
  } });
}
