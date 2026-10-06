// Interior for the "studio" zone: the Chemistry Explainer Pipeline. Three rooms built with the shared
// tour kit in blueberry.js. Every fact on the walls comes from data/zones.js.
//
// 1 Press Hall: Python writes each reaction frame as SVG, the cairosvg press prints it, the frames ride
//   a conveyor into the ffmpeg machine, and a film strip carries the finished video through the wall.
//   F at the press prints a batch; F at the terminal switches the reaction.
// 2 Screening Room: the film strip feeds a screening wall that plays the narrated explainer. Stepped
//   seating, a narration booth, speakers that pump with the voice.
// 3 Drafting Room: a drafting table under a skylight with the textbook figure spec, and the online
//   textbook on a lectern with its figure popping up off the page.
import { makeTour, burst, molecule3D, MOLS, drawMol2D } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', purple = '#8a5cc2', orange = '#e58a3b', green = '#35a36a';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return t*t*(3 - 2*t); };

// A short explanation: the dialog box when dialog.js is live, else a caption over the exhibit.
function teller(ctx, R, portrait){
  const { THREE, H } = R, W = 1024, HH = 190;
  const c = H.canvasTex(W, HH, () => {});
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:c.tex, transparent:true, depthTest:false }));
  s.renderOrder = 9; s.visible = false; R.g.add(s);
  let life = 0;
  R.tick(dt => { if(life > 0){ life -= dt; if(life <= 0) s.visible = false; } });
  return (name, lines, x, y, z) => {
    const d = ctx.modules.dialog;
    if(typeof d?.say === 'function'){ if(d.busy?.()) return; try { d.say({ name, lines, portrait }); return; } catch(e){} }
    const g = c.g; g.clearRect(0, 0, W, HH); H.rr(g, 4, 4, W - 8, HH - 8, 44); g.fillStyle = ink; g.fill();
    H.F(g, 600, 38, 'Nunito'); g.fillStyle = paper; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = R.wrap(g, lines.join(' '), W - 90).slice(0, 3);
    ls.forEach((l, k) => g.fillText(l, W/2, HH/2 + (k - (ls.length - 1)/2)*48 + 2));
    c.tex.needsUpdate = true; s.scale.set(5.4, 1.0, 1); s.position.set(x, y, z); s.visible = true; life = 5.5;
  };
}
const playerLocal = (ctx, R) => { const P = ctx.state.interior?.player; return P ? { x:P.x - R.cx, z:P.z } : null; };

// ---- the two reactions the pipeline animates, drawn as one frame at progress f in [0, 1] ----
const REACTIONS = [
  { name:'SN2', lines:['The nucleophile attacks from the back side.', 'The leaving group departs as the carbon inverts.'] },
  { name:'Carbonyl addition', lines:['The nucleophile attacks the carbonyl carbon.', 'The pi bond electrons move onto the oxygen.'] },
];
function frame(H, g, x, y, w, h, f, dark, which){
  g.fillStyle = dark ? '#221a33' : paper; g.fillRect(x, y, w, h);
  const cx = x + w/2, cy = y + h*0.54, s = Math.min(w, h*1.6)/300, fg = dark ? '#ffffff' : ink;
  g.lineCap = 'round'; g.lineWidth = 6*s; g.strokeStyle = fg;
  const dot = (px, py, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(px, py, r*s, 0, 7); g.fill(); };
  if(which === 0){
    // SN2: Nu comes in from the left, the leaving group swings away, the three arms flip like an umbrella
    const nu = cx - (95 - f*50)*s, lg = cx + (50 + f*60)*s, flip = 1 - f*2;
    g.setLineDash([8*s, 8*s]); g.globalAlpha = f; g.beginPath(); g.moveTo(nu + 20*s, cy); g.lineTo(cx - 14*s, cy); g.stroke();
    g.globalAlpha = 1 - f; g.beginPath(); g.moveTo(cx + 14*s, cy); g.lineTo(lg - 20*s, cy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    for(const [ay, k] of [[-46, 1], [46, 1], [16, 0.55]]){ g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 34*s*flip*k, cy + ay*s*k); g.stroke(); }
    dot(cx, cy, 15, '#4a4f5c'); dot(nu, cy, 20, '#4a7bd9'); dot(lg, cy, 20, '#35b36a');
    if(f < 0.45) H.arrowCurve(g, nu + 6*s, cy - 22*s, cx - 10*s, cy - 20*s, 40*s, '#ff8a3d', 5*s, 1);
    else if(f < 0.8) H.arrowCurve(g, cx + 20*s, cy + 6*s, lg - 8*s, cy + 16*s, -30*s, '#ff8a3d', 5*s, 1);
  } else {
    // carbonyl addition: Nu joins the carbon, the C=O pi bond becomes a lone pair on O
    const ox = cx + 70*s, oy = cy - 50*s, nu = cx - (110 - f*70)*s;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 20*s, cy + 60*s); g.moveTo(cx, cy); g.lineTo(cx + 55*s, cy + 45*s); g.stroke();
    g.beginPath(); g.moveTo(cx + 8*s, cy - 6*s); g.lineTo(ox - 10*s, oy + 8*s); g.stroke();
    g.globalAlpha = 1 - ease((f - 0.4)/0.4); g.beginPath(); g.moveTo(cx + 20*s, cy + 8*s); g.lineTo(ox + 2*s, oy + 22*s); g.stroke(); g.globalAlpha = 1;
    g.globalAlpha = ease((f - 0.3)/0.4); g.beginPath(); g.moveTo(nu + 20*s, cy); g.lineTo(cx - 14*s, cy); g.stroke(); g.globalAlpha = 1;
    dot(cx, cy, 15, '#4a4f5c'); dot(ox, oy, 19, '#e5484d'); dot(nu, cy, 20, '#4a7bd9');
    if(f > 0.7){ g.fillStyle = '#ffd166'; for(const a of [-2.4, -1.9]) dot(ox + Math.cos(a)*30*s, oy + Math.sin(a)*30*s, 5, '#ffd166'); }
    if(f < 0.4) H.arrowCurve(g, nu + 6*s, cy - 22*s, cx - 10*s, cy - 18*s, 40*s, '#ff8a3d', 5*s, 1);
    else if(f < 0.75) H.arrowCurve(g, cx + 16*s, cy - 6*s, ox + 16*s, oy - 12*s, 30*s, '#ff8a3d', 5*s, 1);
  }
}

export function build(ctx, kit){
  const { THREE, helpers:H } = ctx;
  const debug = {};
  // shared across the rooms: which reaction, and when the latest video came out of ffmpeg
  const S = { which:0, premiere:-99, batches:0, filmSpeed:0.25 };
  // one film-strip texture for every strip in the building, so a single offset scrolls them all
  const film = H.canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff4d6'; for(let x = 6; x < w; x += 22){ g.fillRect(x, 5, 11, 8); g.fillRect(x, h - 13, 11, 8); }
    g.fillStyle = '#cdb4db'; g.fillRect(8, 18, 50, 28); g.fillRect(70, 18, 50, 28);
    g.fillStyle = '#4a7bd9'; g.beginPath(); g.arc(24, 32, 6, 0, 7); g.arc(94, 32, 6, 0, 7); g.fill();
  });
  film.tex.wrapS = THREE.RepeatWrapping;
  return makeTour(ctx, kit, {
    sky:'#f1eafb', skyLow:'#5b3b8a', plinth:'#3f2f55', viewTop:'#d9c9ff', viewLow:'#fff0e0', shaft:'#ffe9c9', debug,
    rooms: [
      { name:'Press Hall', sub:'Reaction frames drawn as SVG in code, printed and cut into video', w:19, h:4.6, roof:'sawtooth', teeth:3, tooth:1.8, rise:1.4,
        wall:'#f5effc', cap:'#ffffff', floor:'#cfc4de', floor2:'#c3b6d6', accent:purple, rib:'#4f3a66', ceil:'#ece4f7', plaqueY:3.95,
        build: R => pressHall(ctx, R, debug, S, film) },
      { name:'Screening Room', sub:'Composited into narrated explainer videos', w:16, h:5.6, roof:'barrel', vault:3.4, ribs:5,
        wall:'#2d2440', cap:'#3b3055', floor:'#3a2f52', floor2:'#342a4a', floorKind:'herring', accent:orange, rib:'#b86a2c', ceil:'#2a2140', trim:orange,
        light:'#ffb070', lightI:9, plaqueY:5.0, cam:{ ty:2.2, dist:24, pitch:0.5 }, spot:[0, 5.2],
        build: R => screening(ctx, R, debug, S, film) },
      { name:'Drafting Room', sub:'The spec for interactive figures in a professor’s online textbook', w:14, shape:'apse', h:4.4, roof:'dome', domeH:2.6, ribs:10,
        wall:'#fff6e8', cap:'#ffffff', floor:'#e3cfa9', floor2:'#d6c096', floorKind:'plank', accent:green, rib:'#cfe6d6',
        plaqueY:3.7, cam:{ ty:1.7, dist:21, pitch:0.52 },
        build: R => drafting(ctx, R, debug) },
    ],
  });
}

// A flat film ribbon from a to b (axis-aligned), textured with the shared strip; uv.x runs along it.
function ribbon(R, film, a, b, wid = 0.34){
  const { THREE } = R;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const geo = new THREE.PlaneGeometry(L, wid);
  const uv = geo.attributes.uv; for(let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k)*L/0.55);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map:film.tex, side:THREE.DoubleSide, toneMapped:false }));
  m.position.set((a[0] + b[0])/2, (a[1] + b[1])/2, (a[2] + b[2])/2);
  if(Math.abs(b[1] - a[1]) > 0.01) m.rotation.z = Math.PI/2;
  else if(Math.abs(b[2] - a[2]) > 0.01) m.rotation.y = Math.PI/2;
  R.g.add(m); return m;
}

// ---------- 1. Press Hall: Python, cairosvg, conveyor, ffmpeg ----------
function pressHall(ctx, R, debug, S, film){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'sign');
  const Y = 0.95, BZ = -3.2, N = 8;
  // Python terminal: a desk and a monitor that types the SVG it is about to draw
  const TX = -7.3, TZ = -3.4;
  R.box(1.9, 0.9, 1.0, '#6b4a33', TX, 0.45, TZ); R.box(2.0, 0.08, 1.1, purple, TX, 0.94, TZ); R.solid(TX, TZ, 1.0, 0.6);
  R.box(1.7, 1.1, 0.12, ink, TX, 1.65, TZ - 0.3); R.box(0.14, 0.4, 0.14, ink, TX, 1.1, TZ - 0.3);
  const term = R.screen(1.55, 0.95, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); H.F(g, 600, 15, 'monospace'); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const r = REACTIONS[S.which];
    const code = [`reaction = "${r.name}"`, 'for f in frames(8):', '  svg = draw(reaction, f)', '  <path d="M 40 60 Q ..."/>', '  cairosvg(svg, f"{f}.png")', 'ffmpeg(pngs, narration)'];
    const n = ((t*2.5)|0) % (code.length + 3);
    code.slice(0, Math.min(n, code.length)).forEach((l, k) => { g.fillStyle = ['#ffd166', '#8fd3ff', '#b5e48c', '#cdb4db', '#ff9fb2', '#ffb35c'][k]; g.fillText(l, 10, 22 + k*19); });
    if((t*3|0) % 2){ g.fillStyle = '#ffffff'; g.fillRect(10, 22 + Math.min(n, code.length - 1)*19 + 4, 9, 3); }
  }, { x:TX, y:1.65, z:TZ - 0.23, fps:6, px:130 });
  const coder = R.blob('#cdb4db', TX + 0.2, TZ + 1.0, { face:Math.PI, scale:0.8, cap:ink }); R.solidR(TX + 0.2, TZ + 1.0, 0.4);
  R.float('Python writes SVG', TX, 2.65, TZ, { size:24, scale:0.85 });

  // the cairosvg press: two columns, a crown with a flywheel, and a platen that stamps each frame
  const PX = -4.1;
  R.box(1.9, 0.8, 1.5, '#4f3a66', PX, 0.4, BZ); R.box(1.7, 0.1, 1.3, '#c7cdd9', PX, 0.85, BZ);
  for(const sx of [-0.8, 0.8]) R.box(0.26, 2.9, 0.26, '#4f3a66', PX + sx, 2.0, BZ);
  R.box(2.1, 0.6, 1.2, purple, PX, 3.6, BZ); R.solid(PX, BZ, 1.0, 0.8);
  const platen = R.group(PX, 2.6, BZ); H.box(1.5, 0.35, 1.1, '#e8e0f5', 0, 0, 0, platen); H.box(0.3, 1.0, 0.3, '#c7cdd9', 0, 0.6, 0, platen);
  const fly = R.group(PX + 1.25, 3.6, BZ); const flyRim = H.mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 24), '#ffd166', 0, 0, 0, fly); flyRim.rotation.y = Math.PI/2;
  for(let k = 0; k < 3; k++){ const sp = H.box(0.05, 1.2, 0.05, '#ffd166', 0, 0, 0, fly); sp.rotation.x = k*Math.PI/3; }
  const ps = R.sign('cairosvg', 'SVG in, frames out', { w:2.0, h:0.62, bg:purple, fg:'#ffffff', size:30 }); ps.position.set(PX, 3.6, BZ + 0.62);

  // the conveyor: a belt with a scrolling stripe texture, on legs
  const beltT = H.canvasTex(64, 16, g => { g.fillStyle = '#3a3550'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#56507a'; for(let x = 0; x < 64; x += 16) g.fillRect(x, 0, 6, 16); });
  beltT.tex.wrapS = THREE.RepeatWrapping; beltT.tex.repeat.set(10, 1);
  const x0 = PX + 1.0, x1 = 5.4, bl = x1 - x0;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(bl, 0.1, 1.0), new THREE.MeshStandardMaterial({ map:beltT.tex, roughness:0.7 })); belt.position.set((x0 + x1)/2, Y - 0.05, BZ); belt.receiveShadow = true; R.g.add(belt);
  R.box(bl + 0.2, 0.16, 1.2, '#4f3a66', (x0 + x1)/2, Y - 0.18, BZ);
  for(let k = 0; k <= 4; k++) R.box(0.14, Y - 0.26, 0.9, '#4f3a66', x0 + 0.2 + k*(bl - 0.4)/4, (Y - 0.26)/2, BZ);
  R.solid((x0 + x1)/2, BZ, bl/2 + 0.1, 0.62);

  // the ffmpeg machine: a hopper slot for frames, two reels on top, a progress screen
  const FX = 6.7, FZ = -3.4;
  R.box(2.4, 2.3, 1.8, orange, FX, 1.15, FZ); R.box(2.5, 0.14, 1.9, '#c96f25', FX, 2.35, FZ); R.box(0.12, 0.5, 1.1, ink, FX - 1.22, Y + 0.1, BZ);
  R.solid(FX, FZ, 1.25, 0.95);
  for(let k = 0; k < 5; k++) R.box(0.9, 0.06, 0.02, '#c96f25', FX + 0.55, 0.4 + k*0.14, FZ + 0.91);
  const reels = [-0.55, 0.55].map(dx => {
    const r = R.group(FX + dx, 2.95, FZ); const disc = H.cyl(0.52, 0.52, 0.12, '#3a3f4b', 0, 0, 0, r, 24); disc.rotation.x = Math.PI/2;
    for(let k = 0; k < 5; k++){ const a = k/5*Math.PI*2; H.ball(0.1, '#c7cdd9', Math.cos(a)*0.28, Math.sin(a)*0.28, 0.08, r, 8); }
    R.box(0.1, 0.5, 0.1, '#3a3f4b', FX + dx, 2.55, FZ); return r;
  });
  const st = { phase:'idle', k:0, clock:0, got:0, enc:0, done:0 };
  const fscr = R.screen(1.1, 0.7, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffb35c'; H.F(g, 700, 18); g.fillText('ffmpeg', w/2, 18);
    if(st.phase === 'encode'){ const f = clamp(st.enc/2.2, 0, 1); g.fillStyle = '#ffffff'; H.F(g, 700, 15); g.fillText('encoding', w/2, 44); g.fillStyle = '#3a3050'; H.rr(g, 12, 60, w - 24, 14, 7); g.fill(); g.fillStyle = '#b5e48c'; H.rr(g, 12, 60, (w - 24)*f, 14, 7); g.fill(); }
    else if(st.done > 0){ g.fillStyle = '#b5e48c'; H.F(g, 700, 15); g.fillText('explainer.mp4', w/2, 46); H.F(g, 600, 12, 'Nunito'); g.fillStyle = '#ffffffaa'; g.fillText('playing next door', w/2, 70); }
    else { g.fillStyle = '#ffffff'; H.F(g, 700, 22); g.fillText(`${st.got} / ${N}`, w/2, 48); H.F(g, 600, 12, 'Nunito'); g.fillStyle = '#ffffffaa'; g.fillText('frames in', w/2, 72); }
  }, { x:FX - 0.3, y:1.75, z:FZ + 0.91, fps:10, px:130 });
  const fs = R.sign('ffmpeg', 'frames plus narration', { w:2.1, h:0.6, bg:orange, fg:'#ffffff', size:30 }); fs.position.set(FX, 3.75, FZ + 0.3);
  const lampOff = new THREE.MeshBasicMaterial({ color:'#6d6a7a' }), lampOn = new THREE.MeshBasicMaterial({ color:'#b5e48c' });
  const bulbs = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lampOff); m.position.set(FX + 0.5 + k*0.22, 1.95, FZ + 0.92); R.g.add(m); return m; });
  // the film strip out of the top, back along the wall and through it into the Screening Room
  const fyTop = 4.1, fzBack = -6.1;
  ribbon(R, film, [FX, 3.45, FZ], [FX, fyTop, FZ]);
  ribbon(R, film, [FX, fyTop, FZ], [FX, fyTop, fzBack]);
  ribbon(R, film, [FX, fyTop, fzBack], [R.w/2 + 0.3, fyTop, fzBack]);
  const showing = R.float('Now showing next door  →', FX + 0.2, 4.75, FZ + 0.4, { size:26, bg:ink, fg:'#ffffff', scale:0.85 }); showing.visible = false;

  // the printed frames: eight sheets, each wearing its own frame of the reaction on top
  const frameTex = Array.from({ length:N }, () => H.canvasTex(128, 96, () => {}));
  const drawFrames = () => frameTex.forEach((ft, k) => { frame(H, ft.g, 0, 0, 128, 96, k/(N - 1), false, S.which); ft.tex.needsUpdate = true; });
  drawFrames();
  const edge = H.mat('#ffffff');
  const sheets = frameTex.map(ft => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.46), [edge, edge, new THREE.MeshBasicMaterial({ map:ft.tex, toneMapped:false }), edge, edge, edge]);
    m.castShadow = true; m.visible = false; R.g.add(m); return { m, x:0, on:false };
  });
  function print(){
    if(st.phase !== 'idle') return false;
    Object.assign(st, { phase:'print', k:0, clock:0, got:0, enc:0, done:0 }); sheets.forEach(s => { s.on = false; s.m.visible = false; });
    fscr.redraw(); return true;
  }
  R.use({ key:'print', x:PX, z:BZ + 1.8, r:1.6, y:3.0, label:'Print the frames', hit:[platen, fly], pitch:560, fn(){
    const first = S.batches === 0;
    if(print() && first) say('cairosvg', ['Each frame of the reaction is drawn as SVG in Python, then printed to an image by cairosvg.', 'Eight frames coming up. Follow them down the belt.'], PX, 4.4, BZ);
  } });
  R.use({ key:'reaction', x:TX + 0.9, z:TZ + 1.7, r:1.3, y:2.8, label:'Switch the reaction', hit:term.mesh, pitch:760, fn(){
    S.which = (S.which + 1) % REACTIONS.length; drawFrames(); term.redraw();
    say('Python', [`Now drawing: ${REACTIONS[S.which].name}.`, 'The frames are rendered as SVG in code, replacing hand-animated slides.'], TX, 3.2, TZ);
  } });
  R.use({ key:'ffmpeg', x:FX - 0.3, z:FZ + 1.9, r:1.5, y:3.4, label:'What does ffmpeg do?', hit:[fscr.mesh, ...reels], pitch:480, fn(){
    say('ffmpeg', ['ffmpeg composites the rendered frames into a narrated explainer video.', 'Press F at the press to feed it a fresh batch.'], FX, 4.3, FZ);
  } });
  debug.print = () => print();
  debug.reaction = () => { S.which = (S.which + 1) % REACTIONS.length; drawFrames(); term.redraw(); return REACTIONS[S.which].name; };
  debug.press = () => ({ ...st, batches:S.batches });

  // retired: a dusty overhead projector and a crate of hand-animated slides
  const OX = -6.6, OZ = 2.6;
  R.box(1.3, 0.7, 1.0, '#b98a5a', OX, 0.35, OZ); R.solid(OX, OZ, 0.7, 0.55);
  for(let k = 0; k < 6; k++){ const sl = R.box(0.5, 0.02, 0.5, k % 2 ? '#e8e0f5' : '#fff4d6', OX - 0.8 + (k%3)*0.08, 0.02 + k*0.025, OZ + 0.9, R.s); sl.rotation.y = k*0.3; }
  const ohp = R.group(OX, 0.7, OZ); H.box(0.7, 0.25, 0.6, '#9aa3b8', 0, 0.12, 0, ohp); H.box(0.06, 0.8, 0.06, '#6d7486', 0.25, 0.6, -0.15, ohp);
  const ohHead = H.box(0.34, 0.2, 0.26, '#6d7486', 0.25, 1.0, 0, ohp);
  const flick = R.glow(OX + 0.25, 1.55, OZ + 0.35, 1.4, '#fff4d6', R.g, 0.0); flick.material = flick.material.clone(); flick.material.opacity = 0;
  R.float('Hand-animated slides (retired)', OX, 2.25, OZ, { size:22, scale:0.8, bg:'#e7e2d6' });
  let sputter = 0;
  R.use({ key:'slides', x:OX + 1.3, z:OZ + 1.2, r:1.4, y:2.6, label:'Try the old projector', hit:ohp, pitch:300, fn(){
    sputter = 1.6;
    say('Old slides', ['This pipeline replaced hand-animated slides.', 'Now every frame renders as SVG in code and goes straight into video.'], OX, 3.0, OZ);
  } });

  R.blob('#ffb35c', FX - 1.8, FZ + 1.6, { face:0.8, scale:0.8, cap:orange }); R.solidR(FX - 1.8, FZ + 1.6, 0.4);
  R.lamp('pendant', PX, 4.2, BZ + 1.6, { top:R.h }); R.lamp('pendant', 1.0, 4.2, BZ + 1.6, { top:R.h });
  R.lamp('floor', 8.6, 1.5, 3.4);

  const v = new THREE.Vector3();
  R.tick((dt, t) => {
    const run = st.phase !== 'idle';
    S.filmSpeed += ((st.phase === 'encode' ? 2.2 : st.done > 0 ? 1.0 : 0.25) - S.filmSpeed)*(1 - Math.exp(-2*dt));
    beltT.tex.offset.x -= dt*(run ? 0.9 : 0.12);
    fly.rotation.x -= dt*(run ? 5 : 0.4);
    reels.forEach((r, k) => { r.rotation.z -= dt*S.filmSpeed*(k ? 2.4 : 2); });
    if(st.phase === 'print'){
      st.clock += dt;
      const each = 0.8, k = Math.floor(st.clock/each), f = (st.clock % each)/each;
      platen.position.y = 2.6 - Math.sin(clamp(f/0.5, 0, 1)*Math.PI)*1.55;
      if(k < N && f > 0.25 && !sheets[k].on){ const s = sheets[k]; s.on = true; s.x = PX; s.m.visible = true; R.chime(520 + k*40); }
      if(k >= N) platen.position.y = 2.6;
      sheets.forEach(s => {
        if(!s.on) return;
        s.x += dt*1.9;
        if(s.x > x1 - 0.3){ s.on = false; s.m.visible = false; st.got++; fscr.redraw(t); bulbs.forEach((b, i) => { b.material = i < (st.got % 4) ? lampOn : lampOff; }); }
        s.m.position.set(s.x, Y + 0.04, BZ);
      });
      if(st.got >= N){ st.phase = 'encode'; st.enc = 0; }
    } else if(st.phase === 'encode'){
      st.enc += dt; bulbs.forEach((b, i) => { b.material = ((t*6)|0) % 3 === i ? lampOn : lampOff; });
      if(st.enc >= 2.2){
        st.phase = 'idle'; st.done = 8; S.batches++; S.premiere = t; bulbs.forEach(b => { b.material = lampOn; });
        burst(R, FX, 3.2, FZ + 0.8); R.chime(990); fscr.redraw(t);
      }
    }
    if(st.done > 0){ st.done -= dt; showing.visible = st.done > 0; showing.position.y = 4.75 + Math.sin(t*3)*0.06; if(st.done <= 0) fscr.redraw(t); }
    // the old projector sputters when you try it
    sputter = Math.max(0, sputter - dt);
    flick.material.opacity = sputter > 0 ? (Math.random() < 0.5 ? 0.8 : 0.1) : 0; ohHead.rotation.z = sputter > 0 ? Math.sin(t*30)*0.05 : 0;
    const P = playerLocal(ctx, R);
    if(P) coder.rotation.y += ((Math.hypot(P.x - TX, P.z - TZ) < 3 ? Math.atan2(P.x - TX - 0.2, P.z - TZ - 1.0) : Math.PI) - coder.rotation.y)*(1 - Math.exp(-3*dt));
  });

  R.stop('SVG in code', 'Every reaction frame is drawn as SVG by Python code. Press F at the terminal to switch which reaction it draws.', TX, 3.0, TZ);
  R.stop('The cairosvg press', 'cairosvg turns each SVG into an image. Press F at the press to print eight frames and watch them ride the belt.', PX, 4.4, BZ);
  R.stop('ffmpeg', 'ffmpeg composites the frames into a narrated explainer video, which leaves on the film strip for the Screening Room.', FX, 4.2, FZ);
}

// ---------- 2. Screening Room: stepped seats, a narration booth, the screening wall ----------
function screening(ctx, R, debug, S, film){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'blob');
  let playing = true, clock = 0, narrated = true, seen = -99, lastF = 0, cheer = 0, take = 0, cheered = true;
  const LEN = 9;
  // the screening wall
  const SY = 2.45, SZ = -6.28, SW = 8.0, SH = 3.4;
  R.box(SW + 0.5, SH + 0.5, 0.14, '#1b1426', 0, SY, SZ - 0.1);
  const wall = R.screen(SW, SH, (g, w, h, t) => {
    const r = REACTIONS[S.which], tt = clock % LEN;
    g.fillStyle = '#221a33'; g.fillRect(0, 0, w, h);
    if(tt < 1.2){
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; H.F(g, 700, 56); g.fillText(r.name, w/2, h*0.42);
      H.F(g, 600, 24, 'Nunito'); g.fillStyle = '#ffffffaa'; g.fillText('explainer.mp4', w/2, h*0.62);
    } else {
      const f = ease((tt - 1.4)/6.2);
      frame(H, g, 0, 0, w, h - 50, f, true, S.which);
      if(narrated){ g.fillStyle = '#000000aa'; g.fillRect(0, h - 120, w, 70); g.fillStyle = '#ffffff'; H.F(g, 600, 28, 'Nunito'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.lines[f < 0.5 ? 0 : 1], w/2, h - 85); }
    }
    // the timeline
    g.fillStyle = '#3a3050'; g.fillRect(0, h - 50, w, 50);
    g.fillStyle = orange; g.fillRect(0, h - 50, w*(tt/LEN), 8);
    g.fillStyle = '#ffffffcc'; H.F(g, 700, 20); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(playing ? '▶' : '❚❚', 16, h - 22);
    H.F(g, 600, 18, 'Nunito'); g.fillText(narrated ? 'narration on' : 'narration off', 56, h - 22);
    if(t - S.premiere < 12){ g.fillStyle = '#ffd166'; H.rr(g, w - 170, 16, 150, 40, 20); g.fill(); g.fillStyle = ink; H.F(g, 700, 20); g.textAlign = 'center'; g.fillText('new render', w - 95, 37); }
    if(!playing){ g.fillStyle = '#ffffffcc'; g.fillRect(w/2 - 40, h/2 - 70, 26, 100); g.fillRect(w/2 + 14, h/2 - 70, 26, 100); }
  }, { x:0, y:SY, z:SZ, fps:20, px:90 });
  // speakers either side, which pump with the narration
  const speakers = [-1, 1].map(s => {
    const sp = R.group(s*(SW/2 + 1.0), 0, SZ + 0.5);
    H.box(1.0, 2.6, 0.8, '#1b1426', 0, 1.3, 0, sp);
    const cones = [0.8, 1.9].map(y => { const c = H.cyl(0.3, 0.3, 0.06, '#3a3050', 0, y, 0.41, sp, 18); c.rotation.x = Math.PI/2; return c; });
    R.solid(s*(SW/2 + 1.0), SZ + 0.5, 0.55, 0.45); return { cones };
  });
  // the film strip comes in through the wall from the Press Hall and feeds the screen
  ribbon(R, film, [-R.w/2 - 0.3, 4.1, -6.1], [-SW/2 - 0.1, 4.1, -6.1]);
  ribbon(R, film, [-SW/2 - 0.1, 4.1, -6.1], [-SW/2 - 0.1, SY + 1.2, -6.1]);

  // seating: a floor row, then two raised tiers either side of the centre aisle
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  const fans = [];
  [[-1.6, 0], [2.7, 0.3], [4.1, 0.6]].forEach(([z, y], row) => {
    for(const side of [-1, 1]){
      if(y > 0){ R.box(5.2, y, 1.4, '#4a3b66', side*4.0, y/2, z); R.box(5.2, 0.05, 0.08, orange, side*4.0, y, z + 0.7); R.solid(side*4.0, z, 2.6, 0.7); }
      for(let k = 0; k < 4; k++){
        const x = side*(1.9 + k*1.2);
        R.box(0.9, 0.4, 0.8, '#c8102e', x, y + 0.2, z); R.box(0.9, 0.75, 0.16, '#a10d25', x, y + 0.55, z + 0.42);
        if((k + row + (side > 0 ? 1 : 0)) % 2 === 0 && fans.length < 8) fans.push({ b:R.blob(cols[(k + row*3) % 6], x, z - 0.05, { y:y + 0.15, face:Math.PI, scale:0.62, amp:0.03 }), y:y + 0.15, ph:k + row });
      }
      if(y === 0) R.solid(side*3.7, z, 2.3, 0.5);
    }
  });
  // the narration booth: glass, a mic, a narrator with headphones, a waveform
  const NX = -6.2, NZ = -3.6;
  R.box(2.0, 0.12, 1.8, '#3b3055', NX, 0.06, NZ); R.box(2.0, 0.12, 1.8, '#3b3055', NX, 2.5, NZ); R.solid(NX, NZ, 1.05, 0.95);
  for(const [dx, dz] of [[-0.95, -0.85], [0.95, -0.85], [-0.95, 0.85], [0.95, 0.85]]) R.box(0.08, 2.4, 0.08, orange, NX + dx, 1.25, NZ + dz);
  const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.3, 1.7), new THREE.MeshStandardMaterial({ color:'#ffd9b0', transparent:true, opacity:0.12, roughness:0.05, depthWrite:false })); boothGlass.position.set(NX, 1.3, NZ); R.g.add(boothGlass);
  const narrator = R.blob('#8fd3ff', NX - 0.2, NZ - 0.2, { face:0.6, scale:0.8 });
  H.mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 16, Math.PI), '#1b1426', 0, 1.0, 0, narrator);   // headphones
  R.cyl(0.03, 0.03, 1.2, '#3a3f4b', NX + 0.4, 0.6, NZ + 0.2, R.s, 6); const nmic = R.ball(0.12, '#c7cdd9', NX + 0.4, 1.3, NZ + 0.2, R.g, 12);
  const wave = R.screen(1.3, 0.5, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); g.strokeStyle = narrated ? '#ffb35c' : '#6d6a7a'; g.lineWidth = 3; g.beginPath();
    for(let x = 0; x < w; x += 3){ const a = narrated && playing ? (Math.sin(x*0.13 + t*9)*Math.sin(x*0.031 + t*2.3))*h*0.36 : 0; x ? g.lineTo(x, h/2 + a) : g.moveTo(x, h/2 + a); } g.stroke();
  }, { x:NX, y:2.85, z:NZ + 0.92, fps:15, px:110 });
  R.float('Narration', NX, 3.45, NZ + 0.9, { size:24, scale:0.85, bg:orange, fg:'#ffffff' });
  R.cyl(0.25, 0.18, 0.5, '#ffffff', 6.9, 0.25, -2.6); R.solidR(6.9, -2.6, 0.3); R.float('Popcorn', 6.9, 1.05, -2.6, { size:22, scale:0.7 });

  function toggle(t){ playing = !playing; wall.redraw(t); return playing; }
  R.use({ key:'play', x:0, z:1.4, r:1.8, y:2.6, label:'Play or pause', hit:wall.mesh, pitch:440, fn(t){
    toggle(t);
    if(seen < 0){ seen = t; say('Screening Room', ['The frames are composited into narrated explainer videos like this one.', 'Print a new batch in the Press Hall and it plays here next.'], 0, 4.8, -4.5); }
  } });
  R.use({ key:'narrate', x:NX + 1.4, z:NZ + 1.9, r:1.5, y:3.2, label:'Toggle the narration', hit:[narrator, boothGlass], pitch:620, fn(t){
    narrated = !narrated; take++; wall.redraw(t);
    if(take === 1) say('Narrator', ['Each video is narrated. Turn it off and the pictures have to carry it alone.'], NX, 3.9, NZ);
  } });
  debug.play = () => toggle(performance.now()/1000);
  debug.narrate = () => (narrated = !narrated);
  debug.wall = () => ({ playing, narrated, clock:+(clock % LEN).toFixed(2), reaction:REACTIONS[S.which].name, premiere:S.premiere > 0 });

  R.lamp('sconce', -7.6, 2.8, -1.8, { glow:'#ffb070' }); R.lamp('sconce', 7.6, 2.8, -1.8, { glow:'#ffb070' });
  let pre = -99;
  R.tick((dt, t) => {
    film.tex.offset.x -= dt*S.filmSpeed;   // one texture, so every strip in the building scrolls
    if(S.premiere !== pre){ pre = S.premiere; clock = 0; playing = true; cheered = false; }   // a fresh render starts from the top
    if(playing) clock += dt;
    const tt = clock % LEN, f = tt < 1.4 ? 0 : ease((tt - 1.4)/6.2);
    if(lastF < 0.5 && f >= 0.5 && playing){ cheer = 1; }
    if(pre > 0 && !cheered && clock >= LEN){ cheered = true; burst(R, 0, 4.3, -4.8); }   // the first full showing of a new render
    lastF = f;
    cheer = Math.max(0, cheer - dt*1.2);
    fans.forEach(q => { q.b.position.y = q.y + (cheer > 0 ? Math.abs(Math.sin(t*10 + q.ph))*0.3*cheer : 0); });
    const talk = narrated && playing && tt > 1.4 ? Math.abs(Math.sin(t*11)*Math.sin(t*3.1)) : 0;
    speakers.forEach(s => s.cones.forEach(c => c.scale.setScalar(1 + talk*0.12)));
    narrator.scale.y = 0.8*(1 + talk*0.06); nmic.scale.setScalar(1 + talk*0.2);
  });

  R.stop('Narrated explainers', 'Frames rendered in code are composited into narrated explainer videos. Press F in the aisle to pause, or at the booth to hear the difference narration makes.', 0, 4.6, -4.5);
}

// ---------- 3. Drafting Room: the figure spec and the online textbook ----------
function drafting(ctx, R, debug){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'sign');
  let sheet = 0, prog = 1, drawing = false, molIdx = 0, pop = 0;
  const blueprint = '#1f4e79';
  // one sheet of the spec: a figure frame, the molecule, a control, callouts, and a title block
  function drawSheet(g, w, h, n, p){
    g.fillStyle = blueprint; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff22'; g.lineWidth = 1; for(let x = 0; x < w; x += 20){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for(let y = 0; y < h; y += 20){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const ln = '#e8f1ff', seg = a => clamp((p - a)/0.2, 0, 1);
    g.strokeStyle = ln; g.lineWidth = 3;
    // 1: the figure frame with dimension arrows
    const fx = 30, fy = 34, fw = w*0.56, fh = h*0.56, a1 = seg(0);
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + fw*a1, fy); g.moveTo(fx, fy); g.lineTo(fx, fy + fh*a1); g.stroke();
    if(a1 >= 1){ g.strokeRect(fx, fy, fw, fh); g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx, fy - 14); g.lineTo(fx + fw, fy - 14); g.moveTo(fx + fw + 14, fy); g.lineTo(fx + fw + 14, fy + fh); g.stroke(); g.lineWidth = 3; }
    // 2: the molecule, bond by bond
    if(p > 0.2) drawMol2D(H, g, MOLS[n % MOLS.length], fx + fw/2, fy + fh/2 + 6, 22, clamp((p - 0.2)/0.35, 0, 1), ln);
    // 3: a slider under the figure
    const sp = seg(0.55); if(sp > 0){ g.strokeStyle = ln; g.lineWidth = 4; g.beginPath(); g.moveTo(fx + 20, fy + fh + 30); g.lineTo(fx + 20 + (fw - 40)*sp, fy + fh + 30); g.stroke(); if(sp >= 1){ g.fillStyle = '#ffd166'; g.beginPath(); g.arc(fx + 20 + (fw - 40)*(0.3 + (n % 3)*0.2), fy + fh + 30, 10, 0, 7); g.fill(); } }
    // 4: numbered callouts with leader lines
    const cp = seg(0.75);
    if(cp > 0){
      g.globalAlpha = cp; g.lineWidth = 2; g.strokeStyle = '#ffd166'; g.fillStyle = '#ffd166'; H.F(g, 700, 16); g.textAlign = 'center'; g.textBaseline = 'middle';
      [[fx + fw + 50, fy + 30, fx + fw - 30, fy + 50], [fx + fw + 50, fy + fh*0.6, fx + fw/2 + 30, fy + fh/2], [fx + fw + 50, fy + fh + 30, fx + fw - 40, fy + fh + 30]].forEach(([cx, cy, tx, ty], k) => {
        g.beginPath(); g.moveTo(cx - 14, cy); g.lineTo(tx, ty); g.stroke(); g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.stroke(); g.fillText(String(k + 1), cx, cy + 1);
      });
      g.globalAlpha = 1;
    }
    // the title block
    g.strokeStyle = ln; g.lineWidth = 2; const tx = w - 170, ty = h - 70; g.strokeRect(tx, ty, 156, 58); g.beginPath(); g.moveTo(tx, ty + 30); g.lineTo(tx + 156, ty + 30); g.stroke();
    g.fillStyle = ln; H.F(g, 700, 15); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Figure spec', tx + 8, ty + 15);
    H.F(g, 600, 12, 'Nunito'); g.fillText(`interactive figure · sheet ${n + 1}`, tx + 8, ty + 44);
  }
  // the drafting table under the oculus: a tilted board, and an arm that moves while it draws
  const DX = 0, DZ = -1.9;
  R.box(0.14, 1.0, 0.14, '#6b4a33', DX - 1.1, 0.5, DZ - 0.5); R.box(0.14, 1.0, 0.14, '#6b4a33', DX + 1.1, 0.5, DZ - 0.5);
  R.box(0.14, 0.8, 0.14, '#6b4a33', DX - 1.1, 0.4, DZ + 0.5); R.box(0.14, 0.8, 0.14, '#6b4a33', DX + 1.1, 0.4, DZ + 0.5);
  R.solid(DX, DZ, 1.4, 0.8);
  const board = R.group(DX, 1.05, DZ); board.rotation.x = -0.75;
  H.box(2.8, 0.08, 1.9, '#e8dcc0', 0, -0.05, 0, board);
  const sheetScr = R.screen(2.6, 1.7, (g, w, h) => drawSheet(g, w, h, sheet, prog), { parent:board, x:0, y:0.001, rotX:-Math.PI/2, px:150 });
  const arm = new THREE.Group(); arm.position.set(-1.35, 0.06, -0.9); board.add(arm);
  const a1 = H.box(1.2, 0.05, 0.06, '#9aa3b8', 0.6, 0.04, 0, arm);
  const elbow = new THREE.Group(); elbow.position.set(1.2, 0.05, 0); arm.add(elbow);
  H.box(1.0, 0.05, 0.06, '#9aa3b8', 0.5, 0.04, 0, elbow);
  const head = new THREE.Group(); head.position.set(1.0, 0.07, 0); elbow.add(head);
  H.box(0.7, 0.03, 0.08, green, 0.3, 0, 0, head); H.box(0.08, 0.03, 0.5, green, 0, 0, 0.22, head); H.cyl(0.08, 0.08, 0.06, '#ffd166', 0, 0.03, 0, head, 10);
  const drafter = R.blob('#ffd166', DX + 1.7, DZ + 1.0, { face:-2.2, scale:0.8, cap:green }); R.solidR(DX + 1.7, DZ + 1.0, 0.4);
  // finished sheets pinned around the apse, one appears per draft
  const PINS = 5, pins = [];
  for(let k = 0; k < PINS; k++){
    const a = Math.PI + Math.PI*(0.18 + k*0.16), rx = R.w/2 - 0.2, zc = R.doorZ - 1.7, rz = zc - R.back - 0.2;
    const px = Math.cos(a)*rx, pz = zc + Math.sin(a)*rz;
    const pt = H.canvasTex(260, 170, (g, w, h) => drawSheet(g, w, h, k, 1));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), new THREE.MeshBasicMaterial({ map:pt.tex, toneMapped:false }));
    m.position.set(px*0.97, 2.1 + (k % 2)*0.25, pz*0.97 + (1 - 0.97)*zc); m.lookAt(0, m.position.y, zc + 2); m.visible = k === 0; R.g.add(m); pins.push(m);
    m.userData.tack = R.ball(0.05, '#e5484d', 0, 0.38, 0.02, m, 8);
  }
  let pinned = 1;
  function draft(){
    if(drawing) return false;
    sheet++; prog = 0; drawing = true; return true;
  }
  R.use({ key:'draft', x:DX, z:DZ + 1.9, r:1.5, y:2.6, label:'Draft the next sheet', hit:board, pitch:640, fn(){
    const first = sheet === 0;
    if(draft() && first) say('Figure spec', ['Andrew wrote the specification for interactive chemistry figures in a professor’s online textbook.', 'Each sheet: the figure, its control, and numbered notes.'], DX, 3.6, DZ);
  } });
  debug.draft = () => { draft(); return sheet + 1; };

  // the online textbook on a lectern, its interactive figure popping up off the page
  const BX = 4.0, BZ = -2.4, bRot = -0.5;
  const lect = R.group(BX, 0, BZ, R.s); lect.rotation.y = bRot;
  H.box(0.6, 1.0, 0.6, '#6b4a33', 0, 0.5, 0, lect); H.box(1.1, 0.1, 0.8, '#6b4a33', 0, 0.05, 0, lect);
  R.solid(BX, BZ, 0.75, 0.6, bRot);
  const book = R.group(BX, 1.08, BZ); book.rotation.y = bRot;
  H.box(2.1, 0.06, 1.4, green, 0, 0, 0, book);
  const pageL = R.screen(0.98, 1.3, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 18); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Online textbook', 12, 22);
    g.fillStyle = green; g.fillRect(12, 36, w - 24, 4); g.fillStyle = '#1f2a4433'; for(let k = 0; k < 7; k++) g.fillRect(12, 56 + k*16, (w - 24)*(0.6 + ((k*37) % 40)/100), 7);
  }, { parent:book, x:-0.52, y:0.035, rotX:-Math.PI/2, px:120 });
  const pageR = R.screen(0.98, 1.3, (g, w, h, t) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f2a4433'; g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(10, 14, w - 20, h*0.55); g.setLineDash([]);
    g.fillStyle = ink; H.F(g, 700, 15); g.textAlign = 'center'; g.fillText(MOLS[molIdx].name, w/2, h*0.7);
    g.fillStyle = '#e7e2d6'; H.rr(g, 20, h*0.8, w - 40, 10, 5); g.fill(); g.fillStyle = green; g.beginPath(); g.arc(20 + (w - 40)*(molIdx/(MOLS.length - 1)), h*0.8 + 5, 9, 0, 7); g.fill();
  }, { parent:book, x:0.52, y:0.035, rotX:-Math.PI/2, px:120 });
  const holder = R.group(BX, 2.3, BZ);
  let mol = null;
  const setMol = () => { if(mol) holder.remove(mol); mol = molecule3D(R, MOLS[molIdx], 0.26); holder.add(mol); pageR.redraw(); };
  setMol();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.3, 1.1, 12, 1, true), new THREE.MeshBasicMaterial({ color:'#b5e48c', transparent:true, opacity:0.25, depthWrite:false, side:THREE.DoubleSide }));
  stem.position.set(BX, 1.65, BZ); R.g.add(stem);
  R.float('Interactive figure', BX, 3.4, BZ, { size:24, scale:0.85 });
  function nextFigure(){ molIdx = (molIdx + 1) % MOLS.length; setMol(); pop = 1; return MOLS[molIdx].name; }
  R.use({ key:'figure', x:BX - 0.8, z:BZ + 1.6, r:1.5, y:3.0, label:'Turn to the next figure', hit:[book, holder], pitch:700, fn(){
    nextFigure();
    say('Online textbook', ['A figure in the textbook, the kind the spec describes.', 'It turns to face you as you walk around it.'], BX, 3.8, BZ);
  } });
  debug.figure = () => nextFigure();
  R.blob('#ff9fb2', -4.2, -2.4, { face:0.9, scale:0.75 }); R.solidR(-4.2, -2.4, 0.4);
  R.lamp('floor', 5.8, 1.5, 2.2);

  R.tick((dt, t) => {
    if(drawing){
      prog = Math.min(1, prog + dt/2.6); sheetScr.redraw(t);
      // the arm follows the pen: sweep across the sheet as it draws
      const sw = Math.sin(prog*Math.PI*5);
      arm.rotation.y = -0.35 + sw*0.25; elbow.rotation.y = 0.6 - sw*0.4 - prog*0.3; head.rotation.y = -arm.rotation.y - elbow.rotation.y;
      if(prog >= 1){ drawing = false; R.chime(880); if(pinned < PINS){ pins[pinned].visible = true; pinned++; } else burst(R, DX, 3.2, DZ); }
    }
    drafter.rotation.y = -2.2 + (drawing ? Math.sin(t*4)*0.2 : 0);
    // the figure pops, then turns to face the player
    pop = Math.max(0, pop - dt*1.8);
    const P = playerLocal(ctx, R), near = P && Math.hypot(P.x - BX, P.z - BZ) < 3.2;
    const want = P ? Math.atan2(P.x - BX, P.z - BZ) : 0;
    holder.rotation.y += ((near ? want : holder.rotation.y + dt*0.6) - holder.rotation.y)*(1 - Math.exp(-3*dt));
    holder.position.y = 2.3 + (near ? 0.2 : 0) + Math.sin(t*1.4)*0.06;
    holder.scale.setScalar(1 + Math.sin(pop*Math.PI)*0.35);
  });

  R.stop('The figure spec', 'Andrew wrote the specification for interactive chemistry figures in a professor’s online textbook. Press F at the drafting table to draw a sheet.', DX, 3.4, DZ);
  R.stop('The online textbook', 'The figure pops up off the page and turns toward you. Press F to turn to the next one.', BX, 3.6, BZ);
}
