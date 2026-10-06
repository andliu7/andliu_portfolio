// Interior for the "dock" zone: the Browser Use internship at Minnodi LLC. Three rooms built
// with the shared tour kit in blueberry.js. Content comes only from data/zones.js.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', teal = '#2f9e8f';

export function build(ctx, kit){
  return makeTour(ctx, kit, {
    sky:'#e6f6f3', skyLow:'#1f6f73', plinth:'#3f5d63',
    rooms: [
      { name:'Agent Test Bay', sub:'Fixed defects across 20+ real web environments, checked against live agent runs', w:16, wall:'#effaf8', floor:'#d3ece7', floor2:'#c6e4de', accent:teal, build:testBay },
      { name:'Docs Library', sub:'Documentation and onboarding for Browser Use, an open-source AI agent platform', w:14, wall:'#fff7ea', floor:'#ecdcc0', floor2:'#e2cfae', accent:'#e58a3b', build:docsRoom },
      { name:'Async Harbor', sub:'Worked async with an international team over Slack and GitHub', w:14, wall:'#eef4ff', floor:'#b98a5a', floor2:'#ab7c4e', accent:'#3a86b4', build:harborRoom },
    ],
  });
}

// A small robot built into the room (the island robot() helper adds to the island scene).
function bot(R, x, z, face, tint){
  const { THREE } = R, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = face; R.g.add(g);
  R.box(0.62, 0.5, 0.5, '#e8edf2', 0, 0.45, 0, g); const head = R.box(0.8, 0.62, 0.66, '#f5f7fa', 0, 1.02, 0, g);
  R.box(0.62, 0.36, 0.05, ink, 0, 1.03, 0.34, g);
  const eyeA = R.box(0.13, 0.1, 0.02, '#5ff0e0', -0.14, 1.06, 0.37, g), eyeB = R.box(0.13, 0.1, 0.02, '#5ff0e0', 0.14, 1.06, 0.37, g);
  R.cyl(0.02, 0.02, 0.3, '#9aa3b8', 0, 1.48, 0, g, 6); const bulb = R.ball(0.07, tint || '#e5484d', 0, 1.65, 0, g, 10);
  for(const sx of [-0.33, 0.33]){ const w = R.cyl(0.14, 0.14, 0.1, ink, sx, 0.15, 0, g, 12); w.rotation.z = Math.PI/2; }
  return { g, head, eyes:[eyeA, eyeB], bulb };
}

function testBay(R){
  const { THREE, H } = R;
  const sites = ['Shop', 'Search', 'Form', 'Login', 'Maps', 'News'];
  const state = sites.map((s, k) => ({ phase:k*0.9, status:'run', fixedAt:-10 }));
  let runAll = -10;
  const bots = [];
  sites.forEach((site, k) => {
    const col = k % 3, row = k/3|0, x = -4.6 + col*4.6, z = -3.9 + row*3.0;
    R.box(2.6, 0.08, 1.1, '#fffaf0', x, 0.9, z); for(const lx of [-1.2, 1.2]) R.box(0.1, 0.9, 0.9, '#6b4a33', x + lx, 0.45, z);
    R.box(1.9, 1.25, 0.08, ink, x, 1.62, z - 0.35);
    const st = state[k];
    R.screen(1.8, 1.15, (g, w, h, t) => {
      g.fillStyle = '#f4f6fb'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#dfe4ee'; g.fillRect(0, 0, w, 26); ['#ff6b6b', '#ffd166', '#35b36a'].forEach((c, n) => { g.fillStyle = c; g.beginPath(); g.arc(14 + n*16, 13, 5, 0, 7); g.fill(); });
      g.fillStyle = '#ffffff'; H.rr(g, 66, 5, w - 80, 16, 8); g.fill(); g.fillStyle = '#8a93a8'; H.F(g, 600, 11, 'Nunito'); g.textAlign = 'left'; g.fillText(site.toLowerCase() + '.example', 76, 17);
      g.fillStyle = '#c8d0de'; g.fillRect(14, 38, w*0.5, 16); for(let n = 0; n < 3; n++) g.fillRect(14, 64 + n*14, w - 28 - n*40, 8);
      g.fillStyle = teal; H.rr(g, 14, h - 36, 80, 24, 8); g.fill();
      // the agent's cursor wandering between targets
      const p = (t*0.5 + st.phase) % 1, cx = 30 + Math.sin(p*Math.PI*2)*50 + w*0.35, cy = 60 + Math.cos(p*Math.PI*4)*30;
      g.fillStyle = ink; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 12, cy + 30); g.lineTo(cx + 18, cy + 18); g.lineTo(cx + 30, cy + 12); g.closePath(); g.fill();
      const fixed = t - st.fixedAt < 5 || t - runAll < 6;
      const lbl = fixed ? '✓ passed' : st.status === 'fail' ? '✕ defect' : 'running…';
      g.fillStyle = fixed ? '#35b36a' : st.status === 'fail' ? '#e5484d' : '#ffb35c'; H.rr(g, w - 104, h - 36, 92, 24, 12); g.fill();
      g.fillStyle = '#ffffff'; H.F(g, 700, 13); g.textAlign = 'center'; g.fillText(lbl, w - 58, h - 19);
    }, { x, y:1.62, z:z - 0.3, fps:10, px:120 });
    R.solid(x, z, 1.35, 0.6);
    bots.push({ b:bot(R, x, z + 1.0, Math.PI, ['#e5484d', '#ffd166', '#35b36a', '#8fd3ff', '#cdb4db', '#ff9fb2'][k]), st, x, z:z + 1.0 });
  });
  // one of the six keeps finding a defect until you run the fix
  state[4].status = 'fail';
  R.tick((dt, t) => bots.forEach(({ b, st }, k) => {
    const fixed = t - runAll < 6;
    b.g.position.y = fixed ? Math.abs(Math.sin(t*6 + k))*0.15 : 0;
    b.head.rotation.z = st.status === 'fail' && !fixed ? Math.sin(t*8)*0.12 : 0;
    b.bulb.material = H.mat(fixed ? '#35b36a' : st.status === 'fail' ? '#e5484d' : '#ffd166');
    const blink = Math.sin(t*2.3 + k*1.7) > 0.97; b.eyes.forEach(e => { e.scale.y = blink ? 0.2 : 1; });
  }));
  R.use({ key:'run', x:0, z:2.6, r:2.6, label:'Fix and rerun the agents', pitch:720, fn(t){ runAll = t; state[4].status = 'run'; burst(R, 4.6, 2.4, -0.9); setTimeout(() => { state[4].status = 'fail'; }, 12000); } });
  R.float('20+ real web environments', -6.2, 2.6, 2.4, { size:24, bg:teal, fg:'#ffffff', scale:0.85 });
}

function docsRoom(R){
  const { THREE, H } = R;
  // tall shelves on both sides of the back wall
  for(const sx of [-4.3, 4.3]){
    R.box(3.6, 3.0, 0.7, '#8a5a3b', sx, 1.5, -5.5); R.solid(sx, -5.5, 1.85, 0.4);
    for(let row = 0; row < 3; row++) for(let k = 0; k < 10; k++){ const hh = 0.5 + ((k*5 + row*3) % 4)*0.07; R.box(0.28, hh, 0.5, [teal, '#e58a3b', '#3a86b4', '#ffd166', '#d6689a'][(k + row) % 5], sx - 1.4 + k*0.31, 0.25 + row*0.95 + hh/2, -5.35).castShadow = false; }
  }
  // the guide on a lectern
  const guide = new THREE.Group(); guide.position.set(0, 0, -3.2); R.g.add(guide);
  R.box(0.6, 1.1, 0.6, '#6b4a33', 0, 0.55, 0, guide);
  const book = R.screen(2.4, 1.6, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = '#e58a3b'; g.fillRect(w/2 - 3, 0, 6, h);
    g.fillStyle = ink; g.textAlign = 'left';
    const para = (title, text, x0) => { H.F(g, 700, 28); g.fillText(title, x0, 44); H.F(g, 600, 18, 'Nunito'); let line = '', y = 88;
      for(const wd of text.split(' ')){ const tst = line ? line + ' ' + wd : wd; if(g.measureText(tst).width > w/2 - 40){ g.fillText(line, x0, y); y += 28; line = wd; } else line = tst; } g.fillText(line, x0, y); };
    para('Onboarding', 'Documentation and onboarding for Browser Use, an open-source AI agent platform.', 20);
    para('Adopted', 'Guides adopted by 200+ contributors.', w/2 + 20);
  }, { parent:guide, y:1.3, z:0.1, rotX:-0.9, px:220 });
  R.solid(0, -3.2, 0.6, 0.6);
  // a queue of contributors who each get a guide
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  const queue = cols.map((c, k) => R.blob(c, -4.5 + k*1.6, 0.2, { face:Math.PI*0.95, scale:0.7 }));
  const handed = queue.map(() => false);
  const flyers = [];
  let count = 0;
  const counter = R.screen(3.0, 0.9, (g, w, h) => {
    g.fillStyle = ink; H.rr(g, 0, 0, w, h, 24); g.fill(); g.fillStyle = '#ffffff'; H.F(g, 700, 34); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(count ? `Guides handed out: ${count}` : 'Adopted by 200+ contributors', w/2, h/2 + 2);
  }, { x:0, y:2.25, z:-5.7, transparent:true });
  R.float('2,000+ users', 4.3, 3.35, -5.2, { size:24, bg:'#e58a3b', fg:'#ffffff', scale:0.85 });
  R.tick((dt, t) => {
    for(let n = flyers.length - 1; n >= 0; n--){
      const f = flyers[n]; f.p += dt*1.4; const p = Math.min(1, f.p);
      f.m.position.set(f.x0 + (f.x1 - f.x0)*p, 1.4 + Math.sin(p*Math.PI)*2, -3.0 + (f.z1 + 3.0)*p); f.m.rotation.y += dt*8;
      if(p >= 1){ R.g.remove(f.m); flyers.splice(n, 1); queue[f.k].scale.setScalar(0.8); }
    }
    queue.forEach((q, k) => { if(q.scale.x > 0.7) q.scale.setScalar(Math.max(0.7, q.scale.x - dt*0.3)); if(handed[k]) q.rotation.y = Math.PI + Math.sin(t*4 + k)*0.3; });
  });
  R.use({ key:'guide', x:0, z:-1.4, r:2.6, label:'Hand out a guide', hit:guide, pitch:600, fn(){
    const k = count % queue.length; count++; handed[k] = true; counter.redraw();
    const m = R.box(0.4, 0.08, 0.3, '#e58a3b', 0, 1.4, -3.0); m.castShadow = false;
    flyers.push({ m, p:0, k, x0:0, x1:-4.5 + k*1.6, z1:0.2 });
  } });
}

function harborRoom(R){
  const { THREE, H } = R;
  // water along the back with a little boat
  const water = R.box(12.4, 0.1, 3.0, '#5fb4d9', 0, 0.06, -4.3); water.material = new THREE.MeshStandardMaterial({ color:'#5fb4d9', roughness:0.25, transparent:true, opacity:0.9 }); water.castShadow = false;
  R.solid(0, -4.3, 6.2, 1.5);
  for(let k = 0; k < 7; k++) R.cyl(0.14, 0.14, 1.0, '#6b4a33', -6 + k*2, 0.3, -2.75, R.g, 8);
  const boat = new THREE.Group(); boat.position.set(-2, 0.1, -4.4); R.g.add(boat);
  R.box(1.8, 0.45, 0.8, '#fffaf0', 0, 0.2, 0, boat); R.box(1.9, 0.08, 0.9, '#e5484d', 0, 0.45, 0, boat);
  R.cyl(0.04, 0.04, 1.4, '#6b4a33', 0, 1.1, 0, boat, 6); const sail = R.mesh(new THREE.ConeGeometry(0.5, 1.1, 3), '#ffffff', 0.25, 1.2, 0, boat); sail.rotation.z = -0.1;
  // clocks: one team, many time zones
  const zones = [[-4.5, 'Here', 0], [-1.5, 'There', 6], [1.5, 'Far', 11], [4.5, 'Farther', 13]];
  zones.forEach(([x, name, off]) => R.screen(1.3, 1.3, (g, w, h) => {
    const d = new Date(), hr = (d.getHours() + off) % 12 + d.getMinutes()/60, mn = d.getMinutes();
    g.clearRect(0, 0, w, h); g.fillStyle = paper; g.beginPath(); g.arc(w/2, h/2, w/2 - 4, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#3a86b4'; g.stroke();
    g.strokeStyle = ink; g.lineCap = 'round';
    for(const [ang, len, lw] of [[hr/12*Math.PI*2, w*0.22, 9], [mn/60*Math.PI*2, w*0.33, 6]]){ g.lineWidth = lw; g.beginPath(); g.moveTo(w/2, h/2); g.lineTo(w/2 + Math.sin(ang)*len, h/2 - Math.cos(ang)*len); g.stroke(); }
    H.F(g, 700, 18); g.fillStyle = ink; g.textAlign = 'center'; g.fillText(name, w/2, h*0.78);
  }, { x, y:2.2, z:-5.8, fps:0.2, transparent:true }));
  // message board and paper planes
  R.box(2.6, 1.8, 0.12, '#3a86b4', 4.4, 1.5, 0.8); R.box(0.12, 1.2, 0.12, '#6b4a33', 4.4, 0.6, 0.8); R.solid(4.4, 0.8, 1.35, 0.2);
  const msgs = ['Update posted', 'Reviewed on GitHub', 'Replied on Slack', 'Fix checked on a live run'];
  let sent = 0;
  const board = R.screen(2.4, 1.6, (g, w, h) => {
    g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'left'; g.fillText('#team', 14, 28);
    const shown = msgs.slice(0, Math.max(1, Math.min(msgs.length, sent + 1)));
    shown.slice(-4).forEach((m, k) => { const mine = k % 2 === 0; g.fillStyle = mine ? '#cdeafe' : '#ffe6b8'; H.rr(g, mine ? 12 : 60, 42 + k*38, w - 72, 30, 12); g.fill(); g.fillStyle = ink; H.F(g, 600, 15, 'Nunito'); g.fillText(m, (mine ? 12 : 60) + 10, 62 + k*38); });
  }, { x:4.4, y:1.5, z:0.87 });
  const planes = [];
  R.tick((dt, t) => {
    boat.position.x = -2 + Math.sin(t*0.3)*3.5; boat.rotation.z = Math.sin(t*1.7)*0.06; boat.position.y = 0.1 + Math.sin(t*2)*0.04;
    for(let n = planes.length - 1; n >= 0; n--){
      const p = planes[n]; p.p += dt*0.6; const f = Math.min(1, p.p);
      p.m.position.set(-4.5 + f*8.9, 1.2 + Math.sin(f*Math.PI)*2.2, 1.6 - f*0.6); p.m.rotation.set(0, -Math.PI/2, -Math.cos(f*Math.PI)*0.5);
      if(f >= 1){ R.g.remove(p.m); planes.splice(n, 1); sent++; board.redraw(); }
    }
  });
  // the sender at a desk with a laptop
  R.box(1.8, 0.08, 1.0, '#fffaf0', -4.5, 0.85, 1.4); for(const lx of [-0.8, 0.8]) R.box(0.1, 0.85, 0.8, '#6b4a33', -4.5 + lx, 0.42, 1.4); R.solid(-4.5, 1.4, 0.95, 0.55);
  const lid = R.box(0.8, 0.5, 0.04, '#9aa3b8', -4.5, 1.14, 1.2); lid.rotation.x = -0.25;
  const sender = bot(R, -4.5, 2.4, Math.PI, '#8fd3ff');
  R.use({ key:'send', x:-4.5, z:3.0, r:2.4, label:'Send an update', hit:[lid, sender.g], pitch:880, fn(){
    const m = R.mesh(new THREE.ConeGeometry(0.22, 0.6, 3), '#ffffff', -4.5, 1.2, 1.6); m.castShadow = false; planes.push({ m, p:0 });
  } });
}
