// Interior for the "brain" zone: Second Brain Greenhouse. Three rooms built with the shared
// tour kit in blueberry.js. Content comes only from the zone's bullets in data/zones.js.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', pink = '#d6689a';

export function build(ctx, kit){
  return makeTour(ctx, kit, {
    sky:'#fdeef4', skyLow:'#b44d7e', plinth:'#7a4a5c',
    rooms: [
      { name:'Notes Grove', sub:'Notes and AI chat, linked into one brain', w:15, wall:'#fdf2f6', floor:'#f3dbe5', floor2:'#ecceda', accent:pink, build:notesRoom },
      { name:'Kitchen and Gym', sub:'Say a meal or a workout and it becomes a structured entry', w:15, wall:'#fff6ea', floor:'#efe0c8', floor2:'#e6d4b6', accent:'#e58a3b', build:logRoom },
      { name:'Goals and Vault', sub:'A public shell on GitHub Pages; private records behind Google sign-in', w:15, wall:'#eef6fb', floor:'#d8e7f0', floor2:'#cadde9', accent:'#3a86b4', build:vaultRoom },
    ],
  });
}

// Floating notes linked by glowing threads. "Ask" sends pulses along every thread.
function notesRoom(R){
  const { THREE } = R;
  const titles = ['Notes', 'AI chat', 'Nutrition', 'Workouts', 'Goals', 'Projects', 'Voice log', 'Dashboard'];
  const cols = ['#ffd166', '#ff9fb2', '#b5e48c', '#8fd3ff', '#cdb4db', '#ffb35c', '#fff1a8', '#a0e7e5'];
  const notes = titles.map((ttl, k) => {
    const a = k/titles.length*Math.PI*2;
    const home = new THREE.Vector3(Math.cos(a)*4.2, 2.1 + Math.sin(a*2)*0.5, -1.4 + Math.sin(a)*2.2);
    const n = R.screen(1.5, 1.0, (g, w, h) => {
      g.fillStyle = cols[k]; g.fillRect(0, 0, w, h); g.fillStyle = '#00000014'; g.fillRect(0, 0, w, 22);
      g.fillStyle = ink; R.H.F(g, 700, 30); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ttl, w/2, h*0.46);
      g.fillStyle = '#1f2a4455'; for(let l = 0; l < 3; l++) g.fillRect(24, h*0.66 + l*12, w - 48 - l*30, 5);
    }, { x:home.x, y:home.y, z:home.z, px:110 });
    n.mesh.material.side = THREE.DoubleSide;
    return { m:n.mesh, home, ph:k*1.3 };
  });
  // threads: each note links to the next and to the one across the circle
  const pairs = []; for(let k = 0; k < notes.length; k++){ pairs.push([k, (k + 1) % notes.length]); if(k < 4) pairs.push([k, k + 4]); }
  const pos = new Float32Array(pairs.length*6);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color:'#ff3d8b', transparent:true, opacity:0.9 });
  R.g.add(new THREE.LineSegments(lineGeo, lineMat));
  const pulses = pairs.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color:'#ffffff' })); m.visible = false; R.g.add(m); return m; });
  let ask = -10;
  // the brain buddy in the middle
  const brain = new THREE.Group(); brain.position.set(0, 0, -1.4); R.g.add(brain);
  R.cyl(0.9, 1.1, 0.7, '#ffffff', 0, 0.35, 0, brain, 24);
  const lobe = R.ball(0.85, '#ff9fc4', 0, 1.55, 0, brain, 24); lobe.scale.set(1.15, 0.85, 0.95);
  for(let k = 0; k < 5; k++){ const c = R.mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 16, Math.PI), '#e46a9e', -0.6 + k*0.3, 1.8 + (k%2)*0.2, 0.2, brain); c.rotation.z = k%2 ? 0.4 : -0.4; }
  if(R.H.eyes) R.H.eyes(brain, 1.5, 0.78, 0.22, 0.08);
  R.solidR(0, -1.4, 1.2);
  const bubble = R.float('Found 8 linked notes', 0, 3.3, -1.4, { size:26, bg:ink, fg:'#ffffff', scale:0.9 }); bubble.visible = false;
  R.tick((dt, t) => {
    notes.forEach((n, k) => { n.m.position.set(n.home.x, n.home.y + Math.sin(t*1.1 + n.ph)*0.18, n.home.z); n.m.rotation.y = Math.sin(t*0.6 + n.ph)*0.25; n.m.rotation.z = Math.sin(t*0.8 + n.ph)*0.05; });
    pairs.forEach(([a, b], k) => { const A = notes[a].m.position, B = notes[b].m.position; pos.set([A.x, A.y, A.z, B.x, B.y, B.z], k*6); });
    lineGeo.attributes.position.needsUpdate = true;
    const since = t - ask;
    lineMat.color.set(since < 2.5 ? '#ffffff' : '#ff3d8b'); lineMat.opacity = 0.7 + Math.sin(t*2)*0.25;
    pulses.forEach((p, k) => {
      p.visible = since < 2.5; if(!p.visible) return;
      const [a, b] = pairs[k], f = Math.min(1, (since*1.2 + k*0.07) % 1);
      p.position.lerpVectors(notes[a].m.position, notes[b].m.position, f);
    });
    bubble.visible = since < 3;
    brain.rotation.y = Math.sin(t*0.7)*0.25; lobe.scale.y = 0.85 + Math.sin(t*3)*0.03 + (since < 0.5 ? 0.1*(1 - since*2) : 0);
  });
  R.use({ key:'ask', x:0, z:1.0, r:2.4, label:'Ask the AI chat', hit:brain, pitch:780, fn(t){ ask = t; } });
  // greenhouse planters along the back wall
  for(const sx of [-4.5, 4.5]){
    R.box(3.4, 0.6, 0.9, '#b87a4b', sx, 0.3, -5.3); R.solid(sx, -5.3, 1.75, 0.5);
    for(let k = 0; k < 5; k++){ R.cyl(0.03, 0.03, 0.5, '#4f9a3a', sx - 1.3 + k*0.65, 0.85, -5.3, R.g, 5); R.ball(0.2, k%2 ? '#ff9fc4' : '#ffd166', sx - 1.3 + k*0.65, 1.15, -5.3, R.g, 10); }
  }
}

// A kitchen counter, a squat rack and a microphone. Speaking fills the log screen.
function logRoom(R){
  const { THREE } = R;
  // kitchen, left
  R.box(4.2, 0.95, 1.2, '#fffaf0', -4.4, 0.47, -5.1); R.box(4.4, 0.1, 1.35, '#e58a3b', -4.4, 1.0, -5.1); R.solid(-4.4, -5.1, 2.2, 0.7);
  R.cyl(0.35, 0.3, 0.35, '#9aa3b8', -5.4, 1.23, -5.0); R.ball(0.3, '#fffaf0', -3.4, 1.1, -5.0, R.g, 14).scale.y = 0.5;
  const steam = []; for(let k = 0; k < 4; k++){ const s = R.ball(0.08, '#ffffff', -5.4, 1.5, -5.0, R.g, 8); s.castShadow = false; s.material = new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0.55 }); steam.push(s); }
  // gym, right: squat rack and barbell
  for(const sx of [3.2, 5.6]){ R.box(0.14, 2.4, 0.14, '#3a3f4b', sx, 1.2, -4.9); R.box(0.14, 2.4, 0.14, '#3a3f4b', sx, 1.2, -4.0); }
  const bar = new THREE.Group(); bar.position.set(4.4, 1.55, -4.45); R.g.add(bar);
  const rod = R.cyl(0.04, 0.04, 3.4, '#c7cdd9', 0, 0, 0, bar, 8); rod.rotation.z = Math.PI/2;
  for(const sx of [-1.45, 1.45]){ const p = R.cyl(0.42, 0.42, 0.12, '#e5484d', sx, 0, 0, bar, 20); p.rotation.z = Math.PI/2; }
  R.solid(4.4, -4.45, 1.6, 0.7);
  // the log screen on the back wall
  const entries = [];
  const log = R.screen(4.6, 2.2, (g, w, h, t) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = '#e58a3b'; g.fillRect(0, 0, w, 54);
    g.fillStyle = '#ffffff'; R.H.F(g, 700, 30); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Today’s log', 22, 29);
    if(!entries.length){ g.fillStyle = '#1f2a4488'; R.H.F(g, 600, 26, 'Nunito'); g.fillText('Nothing logged yet. Try the microphone.', 22, 110); }
    entries.slice(-3).forEach((e, k) => {
      const y = 70 + k*62, a = Math.min(1, (t - e.t)*3);
      g.globalAlpha = Math.max(0, a); g.fillStyle = e.c; R.H.rr(g, 16, y, w - 32, 54, 14); g.fill();
      g.fillStyle = ink; R.H.F(g, 700, 24); g.fillText(e.kind, 30, y + 27);
      R.H.F(g, 600, 22, 'Nunito'); g.fillText(e.fields, 170, y + 27); g.globalAlpha = 1;
    });
  }, { x:0, y:2.1, z:-5.8, fps:15 });
  R.box(4.8, 2.4, 0.1, '#6b4a33', 0, 2.1, -5.88);
  // the microphone
  R.cyl(0.35, 0.4, 0.08, '#3a3f4b', 0, 0.04, -0.4); R.cyl(0.04, 0.04, 1.3, '#3a3f4b', 0, 0.7, -0.4, R.g, 6);
  const mic = R.ball(0.2, '#e5484d', 0, 1.45, -0.4, R.g, 14); mic.scale.y = 1.3; R.solidR(0, -0.4, 0.45);
  const lines = [
    { say:'“three sets of squats”', kind:'Workout', fields:'squat · 3 sets', c:'#cdeafe' },
    { say:'“a bowl of rice and eggs”', kind:'Meal', fields:'rice · eggs', c:'#ffe6b8' },
  ];
  let turn = 0, saidT = -10; const speechSprites = lines.map(l => { const s = R.float(l.say, 0, 2.3, -0.4, { size:26, bg:ink, fg:'#ffffff', scale:0.9 }); s.visible = false; return s; });
  R.tick((dt, t) => {
    steam.forEach((s, k) => { const p = (t*0.6 + k*0.25) % 1; s.position.y = 1.45 + p*1.1; s.position.x = -5.4 + Math.sin(t*2 + k)*0.1; s.scale.setScalar(1 + p); s.visible = p < 0.9; });
    const since = t - saidT; speechSprites.forEach((s, k) => { s.visible = since < 2.2 && k === (turn + 1) % 2; });
    mic.scale.x = mic.scale.z = 1 + (since < 1.2 ? Math.abs(Math.sin(t*20))*0.15 : 0);
    bar.position.y = 1.55 + (since < 1.5 && (turn + 1) % 2 === 0 ? Math.sin(since*Math.PI*2)*0.35 : 0);
  });
  R.use({ key:'speak', x:0, z:1.2, r:2.4, label:'Say a meal or a workout', hit:mic, pitch:520, fn(t){ const l = lines[turn % 2]; saidT = t; entries.push({ ...l, t:t + 0.9 }); turn++; } });
  R.blob('#ffb35c', -3, -3.2, { face:0.3 }); R.blob('#8fd3ff', 3.0, -2.6, { face:-0.3 });
  R.solidR(-3, -3.2, 0.5); R.solidR(3.0, -2.6, 0.5);
}

// Goals, a project dashboard, a public display case and the private vault.
function vaultRoom(R){
  const { THREE } = R;
  let signed = -10, open = 0;
  const goals = R.screen(3.6, 2.2, (g, w, h, t) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink; R.H.F(g, 700, 34); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Goals', 22, 36);
    ['Notes', 'Meals', 'Workouts', 'Projects'].forEach((n, k) => {
      const y = 86 + k*48, f = 0.35 + 0.5*((Math.sin(t*0.6 + k*1.7) + 1)/2);
      R.H.F(g, 600, 22, 'Nunito'); g.fillStyle = ink; g.fillText(n, 22, y);
      g.fillStyle = '#e7e2d6'; R.H.rr(g, 110, y - 13, w - 140, 26, 13); g.fill();
      g.fillStyle = ['#35a36a', '#e5484d', '#e58a3b', '#3a86b4'][k]; R.H.rr(g, 110, y - 13, (w - 140)*f, 26, 13); g.fill();
    });
  }, { x:-4.4, y:1.9, z:-5.8, fps:8 });
  R.box(3.8, 2.4, 0.1, '#3a86b4', -4.4, 1.9, -5.88);
  // the public shell: a glass case with a tiny house in it
  R.box(1.6, 0.9, 1.2, '#ffffff', -4.2, 0.45, 1.4); R.solid(-4.2, 1.4, 0.85, 0.65);
  const glassCase = R.box(1.5, 1.2, 1.1, '#dff1ff', -4.2, 1.5, 1.4); glassCase.material = new THREE.MeshStandardMaterial({ color:'#dff1ff', transparent:true, opacity:0.35, roughness:0.1 }); glassCase.castShadow = false;
  R.box(0.6, 0.45, 0.5, '#fffaf0', -4.2, 1.15, 1.4); const roof = R.mesh(new THREE.ConeGeometry(0.5, 0.35, 4), '#d6689a', -4.2, 1.55, 1.4); roof.rotation.y = Math.PI/4;
  R.float('Public shell', -4.2, 2.45, 1.4, { size:24, scale:0.85 });
  // the vault
  const vault = new THREE.Group(); vault.position.set(3.8, 0, -3.6); R.g.add(vault);
  R.box(2.6, 2.6, 1.6, '#8791a8', 0, 1.3, 0, vault);
  const inside = R.box(2.0, 2.0, 0.1, '#ffe7a3', 0, 1.3, 0.76, vault); inside.material = new THREE.MeshBasicMaterial({ color:'#ffe7a3' });
  const hinge = new THREE.Group(); hinge.position.set(-1.0, 1.3, 0.85); vault.add(hinge);
  const door = R.box(2.0, 2.0, 0.14, '#b7bfd0', 1.0, 0, 0, hinge);
  const lock = R.cyl(0.32, 0.32, 0.12, '#e5484d', 1.0, 0, 0.12, hinge, 18); lock.rotation.x = Math.PI/2;
  const rows = []; for(let k = 0; k < 3; k++){ const r = R.box(1.5, 0.35, 0.1, ['#ff9fb2', '#b5e48c', '#8fd3ff'][k], 0, 0.8 + k*0.5, 0.84, vault); rows.push(r); }
  R.solid(3.8, -3.6, 1.35, 0.85);
  R.float('Private records', 3.8, 3.2, -3.6, { size:24, bg:ink, fg:'#ffffff', scale:0.85 });
  const hint = R.float('Signed in with Google · row-level security', 3.8, 3.8, -3.6, { size:24, bg:'#35a36a', fg:'#ffffff', scale:0.85 }); hint.visible = false;
  R.tick((dt, t) => {
    const want = t - signed < 5 ? 1 : 0; open += (want - open)*(1 - Math.exp(-4*dt));
    hinge.rotation.y = -open*1.9; lock.material = R.H.mat(open > 0.5 ? '#35b36a' : '#e5484d');
    rows.forEach((r, k) => { r.position.z = 0.84 + open*0.2*Math.sin(t*2 + k); });
    hint.visible = open > 0.3;
  });
  R.use({ key:'signin', x:3.8, z:-1.2, r:2.2, label:'Sign in to open', hit:vault, pitch:700, fn(t){ signed = t; if(open < 0.2) burst(R, 3.8, 2.6, -2.6); } });
  // project dashboard table
  R.box(3, 0.1, 1.6, '#fffaf0', 3.6, 0.9, 2.0); for(const [lx, lz] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]]) R.box(0.1, 0.9, 0.1, '#6b4a33', 3.6 + lx, 0.45, 2.0 + lz); R.solid(3.6, 2.0, 1.55, 0.85);
  const dash = R.screen(1.6, 0.9, (g, w, h, t) => {
    g.fillStyle = ink; g.fillRect(0, 0, w, h); ['To do', 'Doing', 'Done'].forEach((c, k) => { const x = 10 + k*(w - 20)/3; g.fillStyle = '#ffffff22'; g.fillRect(x, 26, (w - 20)/3 - 8, h - 36); g.fillStyle = '#ffffffcc'; R.H.F(g, 700, 14); g.fillText(c, x + 4, 18); for(let n = 0; n < 3 - k + ((t|0)%2); n++){ g.fillStyle = ['#ffd166', '#8fd3ff', '#b5e48c'][k]; g.fillRect(x + 4, 34 + n*20, (w - 20)/3 - 16, 14); } });
  }, { x:3.6, y:1.4, z:1.5, rotX:-0.35, fps:2 });
  R.float('Project dashboard', 3.6, 2.3, 2.0, { size:24, scale:0.85 });
}
