// Interior for "now" (Now Building): a working construction site, one room per line of the zone in
// data/zones.js. Built with the shared tour kit in blueberry.js, like the other buildings.
//
// 1 Blueberry Site: a tower crane lifts the learning game into the Blueberry platform. The progress
//   board by the door tracks all three sites. F at the crane cab runs the lift.
// 2 Second Brain Site: under a pitched roof, the blueprint of one home (notes, food, workouts, goals)
//   sits on a raised drafting floor; F builds the next room and a hoist lowers it onto the slab.
// 3 The Empty Plot: a round room with a skylight over a staked-out plot. F breaks ground with the
//   digger; the board opens every project on GitHub.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', gold = '#f2b705', pink = '#d6689a', berry = '#3b4f9e';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return t*t*(3 - 2*t); };
const lerp = (a, b, t) => a + (b - a)*t;

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

export function build(ctx, kit){
  const zone = kit.zone, debug = {};
  const GITHUB = (zone.links || []).find(l => /project/i.test(l[0]))?.[1] || null;
  // shared by the three rooms: the progress board in room 1 reads all of it
  const S = { installed:false, rooms:0, digs:0, dry:false, opened:[], changed:0 };
  return makeTour(ctx, kit, {
    sky:'#fff3cf', skyLow:'#b98a1e', plinth:'#6b5230', viewTop:'#ffe6a8', viewLow:'#fff8e6', shaft:'#fff1c9', debug,
    rooms: [
      { name:'Blueberry Site', sub:'The learning game now lives inside the platform', w:18, h:6.6, roof:'beams',
        wall:'#fff4d6', cap:'#ffffff', floor:'#d3ccbf', floor2:'#c7bfb1', accent:gold, rib:'#8a6440', ceil:'#fff8e6', trim:'#8a6440',
        plaqueX:3.6, plaqueY:5.6, build: R => craneSite(ctx, R, debug, S) },
      { name:'Second Brain Site', sub:'One home for notes, food, workouts and goals', w:16, h:4.6, roof:'gable', run:5.2, rise:2.4,
        wall:'#fdf0f5', cap:'#ffffff', floor:'#e3cfb0', floor2:'#d8c3a2', floorKind:'plank', accent:pink, rib:'#b44d7e', ceil:'#fff6fa',
        windows:{ at:[0.88], y:2.6, w:1.2, h:2.0 }, plaqueX:2.0, build: R => homeSite(ctx, R, debug, S) },
      { name:'The Empty Plot', sub:'For whatever comes next', w:13, shape:'round', h:4.2, roof:'dome', domeH:2.4, ribs:10,
        wall:'#f6f1e6', cap:'#ffffff', floor:'#e8dcc4', floor2:'#ddcfb3', floorKind:'terrazzo', accent:gold, rib:'#e6cf8a',
        plaqueY:3.55, cam:{ ty:1.4, dist:20, pitch:0.55 }, build: R => plot(ctx, R, debug, S, zone, GITHUB) },
    ],
  });
}

// A worker in a hard hat who hops when something lands.
function worker(R, col, x, z, face){ const b = R.blob(col, x, z, { cap:gold, face, scale:0.8 }); R.solidR(x, z, 0.4); return b; }

// ---------- 1. Blueberry Site: the crane, the platform, the progress board ----------
function craneSite(ctx, R, debug, S){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'berry');
  // the Blueberry platform: a blue block with a slot in the roof, waiting for the game
  const PX = 4.2, PZ = -3.2, PW = 3.2, PD = 2.4, PH = 2.4, HOLE = 1.2;
  R.box(PW, 1.6, PD, berry, PX, 0.8, PZ);
  const rw = (PW - HOLE)/2, rd = (PD - HOLE)/2;
  R.box(rw, 0.8, PD, berry, PX - (HOLE + rw)/2, 2.0, PZ); R.box(rw, 0.8, PD, berry, PX + (HOLE + rw)/2, 2.0, PZ);
  R.box(HOLE, 0.8, rd, berry, PX, 2.0, PZ - (HOLE + rd)/2); R.box(HOLE, 0.8, rd, berry, PX, 2.0, PZ + (HOLE + rd)/2);
  R.box(PW + 0.2, 0.12, PD + 0.2, '#2c3a7a', PX, PH + 0.06, PZ);
  for(let k = 0; k < 4; k++) R.box(0.5, 0.5, 0.05, '#bfd3ff', PX - 1.2 + k*0.8, 1.0, PZ + PD/2 + 0.02);
  R.solid(PX, PZ, PW/2 + 0.05, PD/2 + 0.05);
  const slotGlow = R.glow(PX, PH + 0.4, PZ, 3.0, '#9fb6ff', R.g, 0.0); slotGlow.material = slotGlow.material.clone(); slotGlow.material.opacity = 0;
  R.float('Blueberry platform', PX, PH + 1.35, PZ + PD/2, { size:26, bg:berry, fg:'#ffffff', scale:0.9 });
  // scaffolding up one side
  for(const [x, z] of [[-0.3, -0.3], [-0.3, 0.9], [0.9, -0.3], [0.9, 0.9]]) R.box(0.08, 3.0, 0.08, gold, PX + PW/2 + 0.3 + x*0.6, 1.5, PZ + z*1.2 - 0.3);
  for(const y of [1.0, 2.0, 2.9]) R.box(0.9, 0.06, 1.6, '#b98a5a', PX + PW/2 + 0.6, y, PZ + 0.0);

  // the learning game: an arcade-bright crate with a screen, sitting on a pallet
  const LX = -5.4, LZ = -1.6;
  R.box(1.5, 0.15, 1.3, '#b98a5a', LX, 0.075, LZ); R.solid(LX, LZ, 0.78, 0.68);
  const crate = R.group(LX, 0.65, LZ);
  H.box(1.0, 1.0, 1.0, '#8a5cc2', 0, 0, 0, crate); H.box(1.04, 0.1, 1.04, '#ffd166', 0, 0.5, 0, crate);
  H.mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 14), '#c7cdd9', 0, 0.62, 0, crate);   // the lifting eye
  const scr = R.screen(0.78, 0.62, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h);
    const bx = w/2 + Math.sin(t*2.2)*w*0.28, by = h*0.62 - Math.abs(Math.sin(t*4.4))*h*0.3;
    g.fillStyle = '#35a36a'; g.fillRect(0, h*0.78, w, h*0.22);
    g.fillStyle = berry; g.beginPath(); g.arc(bx, by, 12, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(bx - 5, by - 3, 3, 3); g.fillRect(bx + 2, by - 3, 3, 3);
    g.fillStyle = S.installed ? '#b5e48c' : '#ffd166'; R.H.F(g, 700, 13); g.textAlign = 'center'; g.fillText(S.installed ? 'inside' : 'game', w/2, 16);
  }, { parent:crate, x:0, y:-0.02, z:0.505, fps:12, px:130 });
  R.float('The learning game', LX, 2.2, LZ, { size:24, scale:0.85 });

  // the tower crane: a lattice mast, a slewing top with jib and counter-jib, a trolley, a hook
  const MX = -2.2, MZ = -4.6, MT = 5.4, JY = 5.6, JIB = 7.4, CJ = 1.5;
  R.box(1.4, 0.3, 1.4, '#6d6a7a', MX, 0.15, MZ); R.solidR(MX, MZ, 0.75);
  for(const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) R.box(0.1, MT, 0.1, gold, MX + dx, MT/2 + 0.3, MZ + dz);
  for(let k = 0; k < 7; k++){ const y = 0.6 + k*0.72; for(const [ax, az, bx, bz] of [[-0.3, 0.3, 0.3, 0.3], [0.3, -0.3, 0.3, 0.3], [-0.3, -0.3, -0.3, 0.3]]) R.beam(MX + ax, y, MZ + az, MX + bx, y + 0.72, MZ + bz, 0.05, gold); }
  const slew = R.group(MX, JY, MZ);
  H.box(0.9, 0.7, 0.9, '#fffaf0', 0.2, 0.1, 0.55, slew); H.box(0.6, 0.35, 0.05, '#9fd0ff', 0.3, 0.2, 1.0, slew);      // the operator's cab
  H.box(JIB, 0.16, 0.36, gold, JIB/2, 0.5, 0, slew); H.box(JIB, 0.08, 0.08, gold, JIB/2, 0.9, 0, slew);
  for(let k = 0; k < 10; k++){ const x = 0.4 + k*(JIB - 0.6)/10, d = H.box(0.05, 0.5, 0.05, gold, x + 0.18, 0.7, 0, slew); d.rotation.z = 0.6*(k % 2 ? 1 : -1); }
  H.box(CJ, 0.18, 0.36, gold, -CJ/2, 0.5, 0, slew); H.box(0.8, 0.6, 0.6, '#6d6a7a', -CJ + 0.4, 0.2, 0, slew);
  H.box(0.14, 1.2, 0.14, gold, 0, 1.0, 0, slew);                                                                     // the peak
  const trolley = new THREE.Group(); trolley.position.set(5, 0.35, 0); slew.add(trolley); H.box(0.4, 0.16, 0.44, '#e5484d', 0, 0, 0, trolley);
  const cable = H.cyl(0.02, 0.02, 1, '#2a2a33', 0, 0, 0, R.g, 4);
  const hook = R.group(0, 0, 0); H.box(0.3, 0.24, 0.3, '#e5484d', 0, 0, 0, hook); H.mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12, Math.PI*1.4), '#2a2a33', 0, -0.2, 0, hook);
  R.float('Crane', MX, JY + 1.8, MZ, { size:22, scale:0.8, bg:gold, fg:ink });
  // the lift, as poses: slew angle, trolley radius, hook height; carry = the crate rides the hook
  const rel = (x, z) => ({ ang:Math.atan2(-(z - MZ), x - MX), rad:Math.hypot(x - MX, z - MZ) });
  const A = rel(LX, LZ), B = rel(PX, PZ), HIGH = 4.5, GRAB = 0.65 + 0.5 + 0.28, DROP = 2.1 + 0.5 + 0.28;
  const pose = { ang:B.ang, rad:B.rad, y:HIGH };
  const SEQ = [
    { ang:A.ang, rad:A.rad, y:HIGH, dur:2.4 },
    { ang:A.ang, rad:A.rad, y:GRAB, dur:1.3 },
    { ang:A.ang, rad:A.rad, y:HIGH, dur:1.4, carry:true },
    { ang:B.ang, rad:B.rad, y:HIGH, dur:2.8, carry:true },
    { ang:B.ang, rad:B.rad, y:DROP, dur:1.5, carry:true, land:true },
    { ang:B.ang, rad:B.rad, y:HIGH, dur:1.2 },
  ];
  let step = -1, st = 0, from = { ...pose }, cheer = 0, auto = 1.4;
  function lift(){
    if(step >= 0) return false;
    if(S.installed){ S.installed = false; S.changed++; crate.position.set(LX, 0.65, LZ); crate.rotation.set(0, 0, 0); burst(R, LX, 1.4, LZ); scr.redraw(); }
    step = 0; st = 0; from = { ...pose }; auto = -1; return true;
  }
  // the crane cab at ground level: a little booth with a lever
  const CX = -7.6, CZ = 2.4;
  R.box(1.3, 2.1, 1.3, '#fffaf0', CX, 1.05, CZ); R.box(1.45, 0.14, 1.45, gold, CX, 2.17, CZ); R.box(0.9, 0.7, 0.05, '#9fd0ff', CX, 1.45, CZ + 0.66);
  R.solid(CX, CZ, 0.7, 0.7);
  const lever = R.group(CX + 0.9, 0.9, CZ + 0.2); H.box(0.3, 0.3, 0.3, '#3a3f4b', 0, -0.15, 0, lever); const stick = H.box(0.06, 0.6, 0.06, '#3a3f4b', 0, 0.2, 0, lever); H.ball(0.09, '#e5484d', 0, 0.5, 0, lever, 10);
  R.solidR(CX + 0.9, CZ + 0.2, 0.3);
  R.float('Crane controls', CX, 2.9, CZ, { size:22, scale:0.8 });
  // the crane runs once by itself on the way in, so explain on the first press even while it is busy
  let told = false;
  R.use({ key:'crane', x:CX + 1.6, z:CZ + 1.3, r:1.6, y:2.8, label:'Run the crane', hit:lever, pitch:520, fn(){
    if(lift() || !told){ told = true; say('Blueberry', ['Blueberry: the learning game now lives inside the platform.', 'Watch the crane carry it in.'], PX, 4.0, PZ); }
  } });
  debug.crane = () => lift();
  debug.site = () => ({ step, installed:S.installed });

  // the progress board: all three sites in one place
  const BX = -6.3, BY = 2.6, BZ = -6.32;
  R.box(3.9, 2.6, 0.1, '#8a6440', BX, BY, BZ - 0.06);
  const board = R.screen(3.7, 2.4, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = gold; g.fillRect(0, 0, w, 50);
    g.fillStyle = ink; R.H.F(g, 700, 26); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('What is in the ground right now', 18, 26);
    const rows = [
      ['Blueberry', 'the learning game, inside the platform', S.installed ? 1 : step >= 0 ? clamp(step/SEQ.length, 0.1, 0.95) : 0.1, S.installed ? 'in' : 'moving in', berry],
      ['Second Brain', 'one home: notes, food, workouts, goals', S.rooms/4, S.rooms >= 4 ? 'one home' : `${S.rooms} of 4 rooms`, pink],
      ['The empty plot', 'for whatever comes next', S.digs ? 0.12 : 0, S.digs ? 'ground broken' : 'open', gold],
    ];
    rows.forEach(([name, line, f, chipT, c], k) => {
      const y = 70 + k*62;
      g.fillStyle = c; R.H.rr(g, 16, y, 10, 50, 5); g.fill();
      g.fillStyle = ink; R.H.F(g, 700, 21); g.fillText(name, 36, y + 13);
      g.fillStyle = '#1f2a4499'; R.H.F(g, 600, 15, 'Nunito'); g.fillText(line, 36, y + 34);
      g.fillStyle = '#e7e2d6'; R.H.rr(g, 36, y + 44, w - 190, 8, 4); g.fill(); g.fillStyle = c; R.H.rr(g, 36, y + 44, Math.max(8, (w - 190)*f), 8, 4); g.fill();
      g.fillStyle = c; R.H.F(g, 700, 15); const tw = g.measureText(chipT).width + 24; R.H.rr(g, w - 16 - tw, y + 4, tw, 28, 14); g.fill();
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(chipT, w - 16 - tw/2, y + 19); g.textAlign = 'left';
    });
  }, { x:BX, y:BY, z:BZ, px:120 });
  let seen = '';

  // the crew, site clutter
  const crew = [worker(R, '#ffb35c', -3.6, -0.4, 0.4), worker(R, '#8fd3ff', 1.6, -1.2, -0.8), worker(R, '#b5e48c', 6.8, -0.6, -1.4)];
  for(const [x, z] of [[-1.4, 2.6], [1.4, 2.6], [7.4, 3.2]]){ R.mesh(new THREE.ConeGeometry(0.25, 0.7, 14), '#f28c28', x, 0.35, z); R.box(0.36, 0.06, 0.36, '#f28c28', x, 0.03, z); R.solidR(x, z, 0.3); }
  R.box(0.9, 0.9, 0.9, '#c9985f', 7.6, 0.45, -5.4); R.box(0.7, 0.7, 0.7, '#b98a5a', 7.6, 1.25, -5.4); R.solid(7.6, -5.4, 0.5, 0.5);
  for(let k = 0; k < 5; k++) R.box(1.6, 0.14, 0.2, k % 2 ? gold : ink, -8.0, 0.07 + k*0.14, -4.6);   // a stack of planks
  R.solid(-8.0, -4.6, 0.85, 0.15);
  R.lamp('pendant', PX, 5.0, PZ + 1.8, { top:R.h }); R.lamp('pendant', -5.4, 5.0, -2.8, { top:R.h });

  const hp = new THREE.Vector3();
  R.tick((dt, t, cur) => {
    // run the lift once by itself the first time you walk in
    if(auto > 0 && cur === R.i){ auto -= dt; if(auto <= 0) lift(); }
    if(step >= 0){
      const s = SEQ[step]; st += dt/s.dur; const f = ease(st);
      pose.ang = lerp(from.ang, s.ang, f); pose.rad = lerp(from.rad, s.rad, f); pose.y = lerp(from.y, s.y, f);
      if(st >= 1){
        if(s.land){ S.installed = true; S.changed++; cheer = 1.4; burst(R, PX, PH + 1.2, PZ + 0.6); R.chime(990); scr.redraw(); }
        step++; st = 0; from = { ...pose }; if(step >= SEQ.length) step = -1;
      }
    }
    slew.rotation.y = pose.ang; trolley.position.x = pose.rad;
    hp.set(MX + Math.cos(pose.ang)*pose.rad, pose.y, MZ - Math.sin(pose.ang)*pose.rad);
    hook.position.copy(hp); hook.rotation.y = pose.ang;
    const top = JY + 0.35, len = top - (hp.y + 0.12);
    cable.position.set(hp.x, hp.y + 0.12 + len/2, hp.z); cable.scale.y = Math.max(0.01, len);
    const carrying = step >= 0 && SEQ[step].carry;
    if(carrying){ crate.position.set(hp.x, hp.y - 0.78, hp.z); crate.rotation.y = pose.ang + Math.sin(t*2)*0.05; }
    else if(S.installed){ crate.position.set(PX, 2.1, PZ); crate.rotation.y = 0; }
    slotGlow.material.opacity += ((S.installed ? 0.75 + Math.sin(t*3)*0.15 : 0) - slotGlow.material.opacity)*(1 - Math.exp(-4*dt));
    stick.rotation.z = step >= 0 ? Math.sin(t*6)*0.4 : 0;
    cheer = Math.max(0, cheer - dt);
    crew.forEach((b, k) => {
      if(cheer > 0) b.position.y = Math.abs(Math.sin(t*10 + k))*0.35;
      const lx = crate.position.x - b.position.x, lz = crate.position.z - b.position.z;
      b.rotation.y += (Math.atan2(lx, lz) - b.rotation.y)*(1 - Math.exp(-2*dt));
    });
    const key = `${S.installed} ${S.rooms} ${S.digs} ${step}`; if(key !== seen){ seen = key; board.redraw(t); }
  });

  R.stop('Blueberry', 'Blueberry: the learning game now lives inside the platform. Press F at the crane controls to watch it lifted in.', PX, 4.2, PZ);
  R.stop('What is in the ground', 'The progress board tracks all three sites in this building: Blueberry, Second Brain, and the empty plot.', BX, 4.2, BZ + 0.6);
}

// ---------- 2. Second Brain Site: the blueprint of one home, and a hoist that builds it ----------
function homeSite(ctx, R, debug, S){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'brain');
  const ROOMS = [
    { name:'Notes', c:'#ffd166', q:[-1, -1] }, { name:'Food', c:'#ffb35c', q:[1, -1] },
    { name:'Workouts', c:'#e5484d', q:[-1, 1] }, { name:'Goals', c:'#6fae4a', q:[1, 1] },
  ];
  // the blueprint: a plan of one home with four rooms, each shaded in once it is built
  function drawPlan(g, w, h, t){
    g.fillStyle = '#1f4e79'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff1f'; g.lineWidth = 1; for(let x = 0; x < w; x += 18){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for(let y = 0; y < h; y += 18){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const px = w*0.08, py = h*0.2, pw = w*0.6, ph = h*0.7;
    ROOMS.forEach((r, k) => {
      const x = px + (r.q[0] > 0 ? pw/2 : 0), y = py + (r.q[1] > 0 ? ph/2 : 0);
      if(k < S.rooms){ g.fillStyle = r.c + '99'; g.fillRect(x, y, pw/2, ph/2); }
      else if(k === S.rooms){ g.fillStyle = `rgba(255,209,102,${0.15 + 0.15*Math.sin(t*4)})`; g.fillRect(x, y, pw/2, ph/2); }
      g.fillStyle = '#e8f1ff'; R.H.F(g, 700, Math.round(h*0.07)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.name, x + pw/4, y + ph/4);
    });
    g.strokeStyle = '#e8f1ff'; g.lineWidth = 4; g.strokeRect(px, py, pw, ph); g.beginPath(); g.moveTo(px + pw/2, py); g.lineTo(px + pw/2, py + ph); g.moveTo(px, py + ph/2); g.lineTo(px + pw, py + ph/2); g.stroke();
    g.fillStyle = '#e8f1ff'; R.H.F(g, 700, Math.round(h*0.09)); g.textAlign = 'left'; g.fillText('One home', px, h*0.1);
    R.H.F(g, 600, Math.round(h*0.06), 'Nunito'); g.fillText('Second Brain', px + pw + 16, py + 16);
    g.fillText(`${S.rooms} of 4 built`, px + pw + 16, py + 16 + h*0.09);
  }
  // the raised drafting floor, back left, with the blueprint table and a big copy on the wall
  const DX = -4.3, DZ = -4.9;
  R.dais(DX, DZ, 5.0, 2.6, 0.5, { color:'#f7dde8', edge:pink, stepW:2.2 });
  const tbl = R.group(DX, 0.5, DZ + 0.2, R.s); H.box(1.8, 0.9, 0.9, '#8a6440', 0, 0.45, 0, tbl);
  const top = R.group(DX, 1.45, DZ + 0.2); top.rotation.x = -0.6; H.box(1.9, 0.06, 1.2, '#e8dcc0', 0, -0.04, 0, top);
  const planT = R.screen(1.8, 1.1, drawPlan, { parent:top, x:0, y:0.001, rotX:-Math.PI/2, fps:8, px:150 });
  R.box(3.9, 1.9, 0.08, '#b44d7e', DX, 3.3, R.back + 0.06);
  const planW = R.screen(3.7, 1.7, drawPlan, { x:DX, y:3.3, z:R.back + 0.12, fps:8, px:120 });
  const architect = R.blob('#ff9fb2', DX + 1.4, DZ + 0.3, { y:0.5, face:-0.4, scale:0.8, cap:ink });

  // the slab and the hoist: an A-frame over the house, its trolley carrying each room in
  const HX = 3.2, HZ = -3.0, RW = 1.7, RD = 1.5, RH = 1.3;
  R.box(3.9, 0.2, 3.5, '#b8b0a2', HX, 0.1, HZ); R.solid(HX, HZ, 1.95, 1.75);
  for(const sx of [-2.4, 2.4]){ R.beam(HX + sx, 0, HZ - 1.6, HX + sx, 4.2, HZ, 0.14, pink); R.beam(HX + sx, 0, HZ + 1.6, HX + sx, 4.2, HZ, 0.14, pink); R.solidR(HX + sx, HZ - 1.6, 0.2); R.solidR(HX + sx, HZ + 1.6, 0.2); }
  R.box(5.2, 0.2, 0.24, '#b44d7e', HX, 4.25, HZ);
  const car = R.group(HX, 4.05, HZ); H.box(0.5, 0.2, 0.4, gold, 0, 0, 0, car);
  const chain = H.cyl(0.02, 0.02, 1, '#2a2a33', 0, 0, 0, R.g, 4);
  const blocks = ROOMS.map((r, k) => {
    const b = R.group(HX + r.q[0]*RW/2, 0, HZ + r.q[1]*RD/2); b.visible = false;
    H.box(RW - 0.06, RH, RD - 0.06, '#fffaf0', 0, RH/2, 0, b); H.box(RW - 0.02, 0.12, RD - 0.02, r.c, 0, RH + 0.06, 0, b);
    H.box(0.5, 0.4, 0.04, '#9fd0ff', 0, RH*0.6, (RD - 0.06)/2 + 0.01, b);
    R.float(r.name, 0, RH + 0.5, 0, { size:22, scale:0.75, bg:r.c, fg:ink, parent:b });
    return { b, x:b.position.x, z:b.position.z, drop:-1 };
  });
  const roof = R.group(HX, 0, HZ); roof.visible = false;
  { const sh = new THREE.Shape(); sh.moveTo(-2.0, 0); sh.lineTo(2.0, 0); sh.lineTo(0, 1.2); sh.closePath();
    H.mesh(new THREE.ExtrudeGeometry(sh, { depth:3.4, bevelEnabled:false }), pink, 0, 0, -1.7, roof); H.box(0.3, 0.6, 0.3, '#b44d7e', 1.0, 0.9, 0.4, roof); }
  const oneHome = R.float('One home', HX, RH + 2.4, HZ, { size:28, bg:pink, fg:'#ffffff', scale:0.9 }); oneHome.visible = false;
  let roofDrop = -1, lifting = -1;
  function buildNext(){
    if(blocks.some(b => b.drop >= 0) || roofDrop >= 0 || lifting >= 0) return null;
    if(S.rooms >= 4){ lifting = 0; return 'reset'; }
    const b = blocks[S.rooms]; b.b.visible = true; b.drop = 0; return ROOMS[S.rooms].name;
  }
  R.use({ key:'build', x:DX + 0.2, z:DZ + 3.9, r:1.6, y:2.6, label:'Build the next room', hit:[top, planW.mesh], pitch:600, fn(){
    const r = buildNext();
    if(r === 'Notes') say('Second Brain', ['Second Brain: one home for notes, food, workouts and goals.', 'Press F again to hoist in each room.'], HX, 4.2, HZ);
  } });
  debug.build = () => buildNext();
  debug.home = () => ({ rooms:S.rooms, roof:roof.visible });
  const crew = [worker(R, '#8fd3ff', 6.4, -1.2, -1.2), worker(R, '#ffd166', 0.6, -0.8, 0.8)];
  R.lamp('pendant', HX, 3.7, HZ + 2.2, { top:R.h + 1.4 }); R.lamp('floor', -7.2, 1.5, 2.8);
  let cheer = 0;

  R.tick((dt, t) => {
    let carX = HX, carY = 4.05, low = 3.9;
    blocks.forEach((b, k) => {
      if(b.drop < 0) return;
      b.drop += dt/1.6; const f = b.drop;
      // down from the hoist with a little bounce at the end
      const y = f < 0.8 ? lerp(3.0, 0.2, ease(f/0.8)) : 0.2 + Math.sin((f - 0.8)/0.2*Math.PI)*0.12;
      b.b.position.y = y; carX = b.x; low = y + RH + 0.1;
      if(f >= 1){ b.drop = -1; b.b.position.y = 0.2; S.rooms++; R.chime(660 + S.rooms*80); cheer = 0.8; if(S.rooms === 4) roofDrop = 0; }
    });
    if(roofDrop >= 0){
      roof.visible = true; roofDrop += dt/1.4; const f = ease(roofDrop);
      roof.position.y = lerp(4.2, 0.2 + RH + 0.12, f); carX = HX; low = roof.position.y + 1.2;
      if(roofDrop >= 1){ roofDrop = -1; oneHome.visible = true; cheer = 1.6; burst(R, HX, 3.4, HZ); R.chime(990); }
    }
    if(lifting >= 0){
      // take it all back up so it can be built again
      lifting += dt/1.2; const f = ease(lifting);
      blocks.forEach(b => { b.b.position.y = 0.2 + f*4; }); roof.position.y = 0.2 + RH + 0.12 + f*4; oneHome.visible = false;
      if(lifting >= 1){ lifting = -1; blocks.forEach(b => { b.b.visible = false; b.b.position.y = 0.2; }); roof.visible = false; S.rooms = 0; }
    }
    car.position.x += (carX - car.position.x)*(1 - Math.exp(-5*dt));
    const len = Math.max(0.05, 3.95 - low);
    chain.position.set(car.position.x, 3.95 - len/2, HZ); chain.scale.y = len; chain.visible = low < 3.9;
    oneHome.position.y = RH + 2.4 + Math.sin(t*2)*0.06;
    architect.rotation.y = -0.4 + Math.sin(t*0.8)*0.3;
    cheer = Math.max(0, cheer - dt);
    crew.forEach((b, k) => { if(cheer > 0) b.position.y = Math.abs(Math.sin(t*10 + k))*0.3; });
  });

  R.stop('Second Brain', 'Second Brain: one home for notes, food, workouts and goals. Press F in front of the drafting floor and the hoist lowers in the next room.', HX, 3.8, HZ);
  R.stop('The blueprint', 'The plan shades each room as it is built, on the table and on the wall above it.', DX, 4.4, DZ + 0.9);   // standing spot (+2.2 m) clears the drafting floor
}

// ---------- 3. The Empty Plot: a skylight, a staked-out plot, a digger, and every project ----------
function plot(ctx, R, debug, S, zone, GITHUB){
  const { THREE, H } = R;
  const say = teller(ctx, R, 'sign');
  const PX = 0, PZ = -1.6, PW = 3.4, PD = 3.0;
  // the plot under the oculus: soil, stakes and string, little flags
  R.box(PW, 0.1, PD, '#8a5a3b', PX, 0.05, PZ);
  for(let k = 0; k < 5; k++) R.box(PW - 0.2, 0.02, 0.1, '#7a4f33', PX, 0.11, PZ - PD/2 + 0.3 + k*0.6);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [PX + a*(PW/2 + 0.2), PZ + b*(PD/2 + 0.2)]);
  corners.forEach(([x, z], k) => {
    R.box(0.08, 0.7, 0.08, '#c9985f', x, 0.35, z); R.solidR(x, z, 0.12);
    R.box(0.26, 0.16, 0.02, gold, x + 0.14, 0.62, z);
    const [x2, z2] = corners[(k + 1) % 4]; R.beam(x, 0.5, z, x2, 0.5, z2, 0.02, '#fffaf0');
  });
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color:'#4a3020' })); hole.rotation.x = -Math.PI/2; hole.position.set(PX - 0.4, 0.105, PZ + 0.1); hole.scale.setScalar(0.001); R.g.add(hole);
  // the sign, from the zone's own line
  const sg = R.group(PX - 2.4, 0, PZ + 2.0); sg.rotation.y = 0.35;
  H.box(0.1, 1.3, 0.1, '#8a6440', 0, 0.65, 0, sg);
  const s1 = R.sign('For whatever', 'comes next', { w:1.6, h:0.7, bg:gold, fg:ink, size:34, parent:sg }); s1.position.set(0, 1.35, 0.06);
  R.solidR(PX - 2.4, PZ + 2.0, 0.2);
  // a sprout that comes up in the hole, with a question mark
  const sprout = R.group(PX - 0.4, 0.1, PZ + 0.1); sprout.scale.setScalar(0.001);
  H.cyl(0.04, 0.05, 1, '#6fae4a', 0, 0.5, 0, sprout, 6);
  for(const s of [-1, 1]){ const l = H.ball(0.22, '#7fbf57', s*0.2, 0.9 + (s > 0 ? 0.1 : 0), 0, sprout, 10); l.scale.set(1, 0.45, 0.7); }
  const q = R.sign('?', null, { w:0.5, h:0.5, bg:paper, fg:gold, size:52, parent:sprout }); q.position.y = 1.55;

  // the digger: tracks, a turning body, and a boom, stick and bucket that dig into the plot
  const DGX = 3.3, DGZ = -3.0;
  R.box(1.9, 0.4, 0.4, '#2a2a33', DGX, 0.2, DGZ - 0.55); R.box(1.9, 0.4, 0.4, '#2a2a33', DGX, 0.2, DGZ + 0.55); R.solid(DGX, DGZ, 1.0, 0.8);
  const body = R.group(DGX, 0.4, DGZ);
  H.box(1.5, 0.6, 1.3, gold, 0.1, 0.3, 0, body); H.box(0.7, 0.8, 0.8, gold, 0.35, 1.0, 0.1, body); H.box(0.05, 0.5, 0.6, '#9fd0ff', -0.02, 1.05, 0.1, body);
  H.box(0.5, 0.5, 1.2, '#3a3f4b', 0.72, 0.35, 0, body);
  const boom = new THREE.Group(); boom.position.set(-0.55, 0.6, -0.3); body.add(boom);
  H.box(1.9, 0.18, 0.18, gold, -0.95, 0, 0, boom);
  const stickG = new THREE.Group(); stickG.position.set(-1.9, 0, 0); boom.add(stickG);
  H.box(1.2, 0.14, 0.14, '#e0a800', -0.6, 0, 0, stickG);
  const bucket = new THREE.Group(); bucket.position.set(-1.2, 0, 0); stickG.add(bucket);
  H.box(0.4, 0.3, 0.5, '#3a3f4b', -0.15, -0.1, 0, bucket);
  const scoop = H.ball(0.16, '#6b4a33', -0.2, -0.05, 0, bucket, 10); scoop.visible = false;
  // the spoil pile grows with each dig
  const pile = R.mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI*2, 0, Math.PI/2), '#8a5a3b', 2.4, 0, -5.3, R.g); pile.scale.set(1, 0.001, 1);
  let dig = -1;
  function breakGround(){ if(dig >= 0) return false; dig = 0; return true; }
  R.use({ key:'dig', x:DGX - 1.0, z:DGZ + 2.3, r:1.6, y:2.6, label:'Break ground', hit:body, pitch:360, fn(){
    const first = S.digs === 0;
    if(breakGround() && first) say('The empty plot', ['The empty plot is for whatever comes next.'], PX, 3.2, PZ);
  } });
  debug.dig = () => breakGround();
  debug.plot = () => ({ digs:S.digs, sprout:+sprout.scale.x.toFixed(2) });

  // every project on GitHub, on a board by the wall
  const BX = -4.1, BZ = -3.4, bRot = 0.75;
  const bg = R.group(BX, 0, BZ); bg.rotation.y = bRot;
  for(const sx of [-1.0, 1.0]) H.cyl(0.08, 0.1, 2.6, '#6b4a33', sx, 1.3, -0.05, bg, 8);
  H.box(2.3, 1.5, 0.12, gold, 0, 1.85, -0.08, bg);
  R.screen(2.1, 1.3, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = gold; g.fillRect(0, 0, w, 14);
    g.fillStyle = ink; R.H.F(g, 700, 30); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('All projects', w/2, 60);
    g.fillStyle = '#4b5675'; R.H.F(g, 600, 20, 'Nunito'); g.fillText('github.com/andliu7', w/2, 100);
    g.fillStyle = gold; R.H.F(g, 700, 18); g.fillText('press F to open', w/2, h - 26);
  }, { parent:bg, x:0, y:1.85, z:0.0, px:110 });
  R.solid(BX, BZ, 1.2, 0.3, bRot);
  function openAll(){ if(!GITHUB) return null; S.opened.push(GITHUB); if(!S.dry) window.open(GITHUB, '_blank', 'noopener,noreferrer'); return GITHUB; }
  // window.open runs straight from the F or click handler, so the browser counts it as a user gesture
  if(GITHUB) R.use({ key:'projects', x:BX + Math.sin(bRot)*1.5, z:BZ + Math.cos(bRot)*1.5, r:1.4, y:3.0, label:'See all projects on GitHub', hit:bg, pitch:700, fn:openAll });
  debug.projects = () => { S.dry = true; openAll(); return S.opened.slice(); };
  const foreman = R.blob('#ffb35c', DGX - 0.6, DGZ + 1.5, { cap:gold, face:-0.6, scale:0.8 }); R.solidR(DGX - 0.6, DGZ + 1.5, 0.4);
  R.lamp('floor', 4.8, 1.5, 2.4);

  const v = new THREE.Vector3();
  R.tick((dt, t) => {
    // one dig, in beats: swing to the plot, reach down, scoop, lift, swing to the pile, dump, swing back
    let yaw = 0, bA = -0.25, sA = 0.9, kA = 0.4;
    if(dig >= 0){
      dig += dt/4.2; const f = dig;
      const k = (a, b) => ease((f - a)/(b - a));
      yaw = 0.0 + k(0.45, 0.6)*-1.2 - k(0.8, 0.95)*-1.2;
      bA = -0.25 + k(0.05, 0.2)*0.55 - k(0.3, 0.45)*0.65 + k(0.6, 0.7)*0.3 - k(0.85, 0.95)*0.2;
      sA = 0.9 + k(0.05, 0.2)*0.6 - k(0.2, 0.32)*0.4;
      kA = 0.4 + k(0.18, 0.3)*1.2 - k(0.65, 0.78)*1.8 + k(0.85, 0.95)*0.6;
      scoop.visible = f > 0.3 && f < 0.75;
      if(f > 0.28 && hole.scale.x < 1) hole.scale.setScalar(Math.min(1, 0.4 + (f - 0.28)*4));
      if(f >= 0.75 && f - dt/4.2 < 0.75){ const n = S.digs + 1; pile.scale.set(1 + n*0.08, Math.min(1, 0.3 + n*0.2), 1 + n*0.08); }
      if(f >= 1){ dig = -1; S.digs++; R.chime(520 + Math.min(S.digs, 6)*60); if(S.digs === 1) burst(R, PX - 0.4, 1.6, PZ + 0.1); }
    }
    body.rotation.y = yaw; boom.rotation.z = bA; stickG.rotation.z = sA; bucket.rotation.z = kA;
    const grown = S.digs > 0 ? Math.min(1, 0.35 + S.digs*0.25) : 0;
    const sc = sprout.scale.x + (Math.max(0.001, grown) - sprout.scale.x)*(1 - Math.exp(-2.5*dt));
    sprout.scale.setScalar(sc); sprout.rotation.z = Math.sin(t*1.4)*0.06; q.visible = sc > 0.8;
    const P = playerLocal(ctx, R);
    if(P) foreman.rotation.y += (Math.atan2(P.x - DGX + 0.6, P.z - DGZ - 1.5) - foreman.rotation.y)*(1 - Math.exp(-3*dt));
  });

  R.stop('The empty plot', 'The empty plot is for whatever comes next. Press F by the digger to break ground.', PX, 3.0, PZ);
  R.stop('All projects', 'Every project is on GitHub. Press F at the board to open it in a new tab.', BX, 3.3, BZ);
}
