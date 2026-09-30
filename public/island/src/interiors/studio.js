// Interior for the "studio" zone: the chemistry explainer pipeline. Three rooms built with
// the shared tour kit in blueberry.js. Content comes only from data/zones.js.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', purple = '#8a5cc2';

// One SN2-style frame: a nucleophile swings in as the leaving group swings out. f in [0, 1].
function reactionFrame(H, g, x, y, w, h, f, dark){
  g.fillStyle = dark ? '#221a33' : paper; g.fillRect(x, y, w, h);
  const cx = x + w/2, cy = y + h*0.52, s = Math.min(w, h)/220;
  const nu = cx - (70 - f*40)*s, lg = cx + (40 + f*40)*s;
  g.lineCap = 'round'; g.lineWidth = 5*s; g.strokeStyle = dark ? '#ffffff' : ink;
  g.setLineDash([6*s, 6*s]); g.globalAlpha = f; g.beginPath(); g.moveTo(nu + 16*s, cy); g.lineTo(cx - 12*s, cy); g.stroke();
  g.globalAlpha = 1 - f; g.beginPath(); g.moveTo(cx + 12*s, cy); g.lineTo(lg - 16*s, cy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  for(const a of [-0.9, 0.9, Math.PI]){ const flip = 1 - f*2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a)*22*s*flip*(a === Math.PI ? 0 : 1), cy + Math.sin(a)*30*s + (a === Math.PI ? 30*s : 0)); g.stroke(); }
  g.fillStyle = '#4a4f5c'; g.beginPath(); g.arc(cx, cy, 12*s, 0, 7); g.fill();
  g.fillStyle = '#4a7bd9'; g.beginPath(); g.arc(nu, cy, 16*s, 0, 7); g.fill();
  g.fillStyle = '#35b36a'; g.beginPath(); g.arc(lg, cy, 16*s, 0, 7); g.fill();
  if(f < 0.5) H.arrowCurve(g, nu + 4*s, cy - 18*s, cx - 8*s, cy - 16*s, 30*s, '#ff8a3d', 4*s, 1);
}

export function build(ctx, kit){
  return makeTour(ctx, kit, {
    sky:'#f1eafb', skyLow:'#5b3b8a', plinth:'#4f3a66',
    rooms: [
      { name:'Render Room', sub:'Reaction frames drawn as SVG in code, then cairosvg and ffmpeg', w:16, wall:'#f5effc', floor:'#e4d8f2', floor2:'#d9cbec', accent:purple, build:renderRoom },
      { name:'Screening Room', sub:'Composited into narrated explainer videos', w:14, wall:'#2d2440', floor:'#3a2f52', floor2:'#342a4a', accent:'#e58a3b', light:'#ffb070', rug:'#c8102e', build:screeningRoom },
      { name:'Textbook Nook', sub:'A specification for interactive chemistry figures in a professor’s online textbook', w:14, wall:'#fff6e8', floor:'#ecdcc0', floor2:'#e2cfae', accent:'#35a36a', build:bookRoom },
    ],
  });
}

function renderRoom(R){
  const { THREE, H } = R;
  let rush = 0;
  // filmstrip across the back wall, scrolling reaction frames
  R.screen(12.5, 1.5, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h);
    const fw = 150, off = (t*40*(1 + rush*3)) % fw;
    for(let k = -1; k < w/fw + 1; k++){
      const x = k*fw - off; reactionFrame(H, g, x + 12, 26, fw - 24, h - 52, ((k + 100) % 6)/5, false);
    }
    g.fillStyle = '#fffaf0'; for(let x = -off % 30; x < w; x += 30){ g.fillRect(x + 8, 6, 14, 12); g.fillRect(x + 8, h - 18, 14, 12); }
  }, { x:0, y:1.8, z:-5.8, fps:15, px:100 });
  // step 1: code on a monitor
  R.box(1.8, 0.9, 1.0, '#6b4a33', -5.6, 0.45, -1.6); R.box(1.6, 1.0, 0.1, ink, -5.6, 1.5, -1.9); R.solid(-5.6, -1.6, 0.95, 0.6);
  R.screen(1.5, 0.9, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); H.F(g, 600, 13, 'monospace'); g.textAlign = 'left';
    const code = ['for t in frames:', '  svg = draw(t)', '  png = cairosvg(svg)', 'ffmpeg(pngs)', '  + narration', '= explainer.mp4'];
    const n = (t*2|0) % (code.length + 2);
    code.slice(0, n).forEach((l, k) => { g.fillStyle = ['#8fd3ff', '#ffd166', '#ff9fb2', '#b5e48c', '#cdb4db', '#ffb35c'][k]; g.fillText(l, 10, 18 + k*16); });
  }, { x:-5.6, y:1.5, z:-1.84, fps:6 });
  R.float('1  SVG in code', -5.6, 2.5, -1.6, { size:24, scale:0.85 });
  // step 2: conveyor into a cairosvg press
  R.box(7.2, 0.5, 1.0, '#3a3f4b', -0.4, 0.55, -1.6); R.solid(-0.4, -1.6, 3.6, 0.55);
  const rollers = []; for(let k = 0; k < 9; k++){ const r = R.cyl(0.12, 0.12, 1.0, '#9aa3b8', -3.8 + k*0.85, 0.82, -1.6, R.g, 8); r.rotation.x = Math.PI/2; rollers.push(r); }
  const press = new THREE.Group(); press.position.set(0.8, 0, -1.6); R.g.add(press);
  R.box(1.4, 1.8, 1.3, purple, 0, 1.6, 0, press); const ram = R.box(1.0, 0.3, 0.9, '#c7cdd9', 0, 1.1, 0, press);
  R.float('2  cairosvg', 0.8, 3.0, -1.6, { size:24, scale:0.85 });
  // step 3: ffmpeg projector box and a film reel
  R.box(1.5, 1.2, 1.2, '#e58a3b', 4.2, 0.6, -1.6); R.solid(4.2, -1.6, 0.8, 0.65);
  const reel = R.cyl(0.6, 0.6, 0.15, '#3a3f4b', 4.2, 1.9, -1.6, R.g, 24); reel.rotation.x = Math.PI/2;
  for(let k = 0; k < 5; k++){ const a = k/5*Math.PI*2; R.ball(0.12, '#c7cdd9', 4.2 + Math.cos(a)*0.32, 1.9 + Math.sin(a)*0.32, -1.5, R.g, 8); }
  R.float('3  ffmpeg', 4.2, 2.9, -1.6, { size:24, scale:0.85 });
  // sheets riding the belt: white SVG sheets in, printed frames out
  const sheetTex = R.H.canvasTex(128, 96, (g, w, h) => reactionFrame(H, g, 0, 0, w, h, 0.5, false));
  const sheets = []; for(let k = 0; k < 6; k++){ const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.45), [0,0,new THREE.MeshBasicMaterial({ map:sheetTex.tex }),0,0,0].map(x => x || R.H.mat('#ffffff'))); m.castShadow = true; R.g.add(m); sheets.push({ m, p:k/6 }); }
  R.tick((dt, t) => {
    rush = Math.max(0, rush - dt*0.4); const sp = 0.12*(1 + rush*4);
    rollers.forEach(r => { r.rotation.y += dt*sp*20; });
    sheets.forEach(s => { s.p = (s.p + dt*sp) % 1; const x = -3.8 + s.p*6.4; s.m.position.set(x, 0.95, -1.6); s.m.visible = x < 0.3 || x > 1.3; });
    ram.position.y = 1.1 + Math.abs(Math.sin(t*3*(1 + rush*3)))*0.35; reel.rotation.z -= dt*(1 + rush*4);
  });
  R.use({ key:'render', x:-0.4, z:0.4, r:2.6, label:'Render faster', hit:press, pitch:600, fn(){ rush = 1; } });
  R.blob(purple, -2.6, 1.6, { face:Math.PI*0.85, cap:'#1b1b24' }); R.solidR(-2.6, 1.6, 0.5);
}

function screeningRoom(R){
  const { THREE, H } = R;
  let playing = true, clock = 0;
  R.box(7.0, 3.1, 0.12, '#1b1426', 0, 1.55, -5.86);
  const scr = R.screen(6.6, 2.8, (g, w, h, t) => {
    const f = (clock % 6)/6, ff = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2)/0.6;
    reactionFrame(H, g, 0, 0, w, h, ff, true);
    g.fillStyle = '#00000088'; g.fillRect(0, h - 70, w, 70); g.fillStyle = '#ffffff'; H.F(g, 600, 30, 'Nunito'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ff < 0.5 ? 'The nucleophile attacks from the back side…' : '…and the leaving group departs.', w/2, h - 35);
    if(!playing){ g.fillStyle = '#ffffffcc'; g.fillRect(w/2 - 40, h/2 - 50, 26, 100); g.fillRect(w/2 + 14, h/2 - 50, 26, 100); }
  }, { x:0, y:1.55, z:-5.78, fps:15, px:100 });
  // projector and its beam
  const proj = new THREE.Group(); proj.position.set(0, 0, 3.2); R.g.add(proj);
  R.cyl(0.08, 0.3, 1.4, '#3a3f4b', 0, 0.7, 0, proj, 8); R.box(0.9, 0.55, 0.8, '#e58a3b', 0, 1.65, 0, proj);
  for(const sx of [-0.25, 0.25]){ const r = R.cyl(0.26, 0.26, 0.08, '#3a3f4b', sx, 2.15, 0.1, proj, 16); r.rotation.z = Math.PI/2; }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.0, 9, 4, 1, true), new THREE.MeshBasicMaterial({ color:'#fff2c8', transparent:true, opacity:0.08, depthWrite:false, side:THREE.DoubleSide }));
  beam.rotation.x = -Math.PI/2; beam.rotation.y = Math.PI/4; beam.position.set(0, 1.9, -1.3); R.g.add(beam);
  R.solidR(0, 3.2, 0.6);
  // rows of seats with an audience
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  [[-1.6, 0], [0.6, 1]].forEach(([z, row]) => {
    for(const side of [-1, 1]){
      for(let k = 0; k < 3; k++){
        const x = side*(1.6 + k*1.2);
        R.box(1.0, 0.45, 0.9, '#c8102e', x, 0.22, z); R.box(1.0, 0.8, 0.2, '#a10d25', x, 0.6, z + 0.45);
        if((k + row + (side > 0 ? 1 : 0)) % 2 === 0) R.blob(cols[(k + row*3) % 6], x, z - 0.1, { face:Math.PI, scale:0.65, amp:0.03 });
      }
      R.solid(side*2.8, z + 0.1, 1.9, 0.55);
    }
  });
  const pop = R.cyl(0.25, 0.18, 0.5, '#ffffff', 5.8, 0.25, -4.6); R.float('Popcorn', 5.8, 1.0, -4.6, { size:22, scale:0.7 });
  R.tick(dt => { if(playing) clock += dt; beam.material.opacity = playing ? 0.07 + Math.random()*0.02 : 0.02; });
  R.use({ key:'play', x:0, z:4.2, r:1.9, label:'Play or pause', hit:[proj, scr.mesh], pitch:440, fn(t){ playing = !playing; scr.redraw(t); } });
}

function bookRoom(R){
  const { THREE, H } = R;
  let angle = 0, target = 0, spin = 0;
  // shelves along the back wall
  for(const sx of [-4.4, 4.4]){
    R.box(3.4, 2.8, 0.7, '#8a5a3b', sx, 1.4, -5.5); R.solid(sx, -5.5, 1.75, 0.4);
    for(let row = 0; row < 3; row++) for(let k = 0; k < 9; k++){
      const hh = 0.5 + ((k*7 + row*3) % 4)*0.07; R.box(0.28, hh, 0.5, ['#e5484d', '#3b4f9e', '#35a36a', '#ffd166', '#8a5cc2', '#e58a3b'][(k + row) % 6], sx - 1.3 + k*0.32, 0.2 + row*0.9 + hh/2, -5.35).castShadow = false;
    }
  }
  // the giant open textbook on a stand
  const book = new THREE.Group(); book.position.set(0, 0, -2.4); R.g.add(book);
  R.box(0.5, 1.0, 0.5, '#6b4a33', 0, 0.5, 0, book); R.box(1.6, 0.12, 1.0, '#6b4a33', 0, 0.06, 0, book);
  const pages = new THREE.Group(); pages.position.set(0, 1.35, 0); pages.rotation.x = 0.6; book.add(pages);
  R.box(4.2, 0.12, 2.6, '#35a36a', 0, -0.08, 0, pages);
  const left = R.screen(1.95, 2.4, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 26); g.textAlign = 'left'; g.fillText('Figure spec', 18, 40);
    g.fillStyle = '#35a36a'; g.fillRect(18, 56, w - 36, 6);
    H.F(g, 600, 19, 'Nunito'); g.fillStyle = ink;
    const words = 'Wrote the specification for interactive chemistry figures in a professor’s online textbook.'.split(' '); let line = '', y = 96;
    for(const wd of words){ const tst = line ? line + ' ' + wd : wd; if(g.measureText(tst).width > w - 36){ g.fillText(line, 18, y); y += 28; line = wd; } else line = tst; } g.fillText(line, 18, y);
  }, { parent:pages, x:-1.02, y:0.01, rotX:-Math.PI/2, px:110 });
  const right = R.screen(1.95, 2.4, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'center'; g.fillText('Interactive figure', w/2, 34);
    g.save(); g.translate(w/2, h*0.52); g.rotate(angle); g.strokeStyle = ink; g.lineWidth = 6;
    for(let k = 0; k < 6; k++){ const a = k/6*Math.PI*2, b = (k + 1)/6*Math.PI*2; g.beginPath(); g.moveTo(Math.cos(a)*60, Math.sin(a)*60); g.lineTo(Math.cos(b)*60, Math.sin(b)*60); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 36, 0, 7); g.stroke(); g.restore();
    g.fillStyle = '#e7e2d6'; H.rr(g, 30, h - 50, w - 60, 16, 8); g.fill(); const fr = ((angle/(Math.PI*2)) % 1 + 1) % 1; g.fillStyle = '#35a36a'; g.beginPath(); g.arc(30 + (w - 60)*fr, h - 42, 14, 0, 7); g.fill();
  }, { parent:pages, x:1.02, y:0.01, rotX:-Math.PI/2, px:110 });
  R.solid(0, -2.4, 2.2, 1.0);
  R.tick((dt, t) => { angle += (target - angle)*(1 - Math.exp(-5*dt)); spin += dt; if(Math.abs(target - angle) > 0.01 || (spin > 0.07)){ spin = 0; right.redraw(t); } });
  R.use({ key:'figure', x:0, z:-0.4, r:2.3, label:'Turn the figure', hit:book, pitch:620, fn(){ target += Math.PI/3; } });
  // a reading chair, a lamp and a reader
  R.box(1.4, 0.5, 1.2, '#d6689a', -4.4, 0.25, 1.6); R.box(1.4, 1.0, 0.3, '#b44d7e', -4.4, 0.75, 1.1); R.solid(-4.4, 1.5, 0.75, 0.7);
  R.cyl(0.05, 0.05, 2.2, '#3a3f4b', -5.6, 1.1, 1.2, R.g, 6); const shade = R.cyl(0.25, 0.45, 0.4, '#ffd166', -5.6, 2.3, 1.2);
  shade.material = new THREE.MeshStandardMaterial({ color:'#ffd166', emissive:'#ffb347', emissiveIntensity:0.6 });
  R.blob('#8fd3ff', 4.2, 1.2, { face:-0.6 }); R.solidR(4.2, 1.2, 0.5);
}
