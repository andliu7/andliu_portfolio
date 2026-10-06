// Interior for the "dock" zone: Browser Use Dock, Andrew's AI internship at Minnodi LLC (Jun to Aug 2025).
// A harbour office in three rooms, built with the shared tour kit in blueberry.js:
//   1. Agent Control Room: a boathouse where a robot agent drives a wall of 24 browser windows, finds
//      the defects, then every fix is checked against a live run.
//   2. Onboarding Library: a guide press under the dome hands docs to a crowd of 200 contributors
//      sitting on tiers around the apse (three instanced meshes, so 200 figures cost 3 draw calls).
//   3. Async Harbour: Slack and GitHub message boats sail to the team across the water and reply later.
// Facts come only from data/zones.js. F interacts (the kit listens for the 'interact' action).
import { makeTour, burst, prng } from './blueberry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ink = '#1f2a44', paper = '#fffaf0', teal = '#2f9e8f', orange = '#e58a3b', sea = '#3a86b4';
const now = () => performance.now()/1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Open the talk box if the dialog module is there; the speaker hops either way.
function talk(R, o){
  try { const d = R.ctx.modules.dialog; if(d?.say && !d.busy?.()){ d.say(o); return true; } } catch(e){ console.error('[dock] dialog failed', e); }
  return false;
}
// A blob that hops when spoken to. bob:false because this tick owns position.y.
function person(R, col, x, z, o = {}){
  const b = R.blob(col, x, z, Object.assign({}, o, { bob:false })), y0 = o.y || 0, ph = x*1.3 + z;
  let at = -10;
  R.tick((dt, t) => { const s = t - at; b.position.y = y0 + (s < 0.8 ? Math.sin(s/0.8*Math.PI)*0.5 : Math.abs(Math.sin(t*2.2 + ph))*0.05); });
  return { b, hop(){ at = now(); } };
}

export function build(ctx, kit){
  const dbg = {};
  return makeTour(ctx, kit, {
    sky:'#e6f6f3', skyLow:'#1f6f73', plinth:'#3f5d63', viewTop:'#a9dcf5', viewLow:'#e8f7ff',
    // every window looks out over the harbour: sky, a far shore, the sea and a sail
    view(g, w, h){
      g.fillStyle = '#7fb069'; g.beginPath(); g.moveTo(0, h*0.58); g.bezierCurveTo(w*0.3, h*0.48, w*0.55, h*0.62, w, h*0.54); g.lineTo(w, h*0.62); g.lineTo(0, h*0.62); g.fill();
      g.fillStyle = '#3a9bc9'; g.fillRect(0, h*0.62, w, h*0.38);
      g.fillStyle = '#ffffff66'; for(let k = 0; k < 6; k++) g.fillRect((k*53) % w, h*0.7 + k*12, 40, 3);
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w*0.62, h*0.66); g.lineTo(w*0.62, h*0.44); g.lineTo(w*0.72, h*0.66); g.fill();
      g.fillStyle = '#e5484d'; g.fillRect(w*0.57, h*0.66, w*0.18, 8);
    },
    debug: { state: () => ({ agent:dbg.agent?.(), guides:dbg.guides?.(), boats:dbg.boats?.() }) },
    rooms: [
      { name:'Agent Control Room', sub:'An AI agent at work across 20+ real web environments', w:18, h:5.0, roof:'gable', run:5, rise:2.2, ribs:6,
        wall:'#e9f5f2', cap:'#ffffff', floor:'#c9a47a', floor2:'#b99268', floorKind:'plank', accent:teal, rib:'#8a5a3c', ceil:'#f6efe2',
        windows:{ at:[0.08, 0.92], y:3.4, w:1.0, round:true }, plaqueY:4.35, cam:{ ty:1.7, dist:21, pitch:0.52 },
        build: R => controlRoom(R, dbg) },
      { name:'Onboarding Library', sub:'Documentation and onboarding for Browser Use', w:17, shape:'apse', h:5.0, roof:'dome', domeH:2.6, ribs:10,
        wall:'#fff4e4', cap:'#ffffff', floor:'#dcc29a', floor2:'#cfb487', floorKind:'herring', accent:orange, rib:'#f0c28e',
        windows:{ at:[0.16, 0.84], y:3.6, w:0.9, h:1.6, arch:true }, plaqueY:4.3, cam:{ ty:1.9, dist:22, pitch:0.52 },
        build: R => library(R, dbg) },
      { name:'Async Harbour', sub:'Worked async with an international team over Slack and GitHub', w:17, h:4.4, roof:'glass', run:5, rise:2.2, glassTint:'#e6f7ff', rib:'#ffffff',
        wall:'#eef6ff', cap:'#ffffff', floor:'#b98a5a', floor2:'#ab7c4e', floorKind:'plank', accent:sea,
        windows:{ at:[0.14, 0.86], y:2.9, w:2.2, h:1.3 }, plaqueY:3.95, cam:{ ty:1.4, dist:21, pitch:0.58 },
        build: R => harbour(R, dbg) },
    ],
  });
}

// A little robot built into the room (the island robot() helper adds to the island scene).
function bot(R, x, z, face){
  const { THREE, H } = R, g = R.group(x, 0, z); g.rotation.y = face;
  H.box(0.62, 0.5, 0.5, '#e8edf2', 0, 0.45, 0, g);
  const head = new THREE.Group(); head.position.y = 1.02; g.add(head);
  H.box(0.8, 0.62, 0.66, '#f5f7fa', 0, 0, 0, head); H.box(0.62, 0.36, 0.05, ink, 0, 0.01, 0.34, head);
  const eyeM = new THREE.MeshBasicMaterial({ color:'#5ff0e0' });
  const eyes = [-0.14, 0.14].map(ex => H.box(0.13, 0.1, 0.02, eyeM, ex, 0.04, 0.37, head));
  H.cyl(0.02, 0.02, 0.3, '#9aa3b8', 0, 0.46, 0, head, 6);
  const bulbM = new THREE.MeshBasicMaterial({ color:'#e5484d' }); H.ball(0.07, bulbM, 0, 0.63, 0, head, 10);
  for(const sx of [-0.33, 0.33]){ const w = H.cyl(0.14, 0.14, 0.1, ink, sx, 0.15, 0, g, 12); w.rotation.z = Math.PI/2; }
  const arm = new THREE.Group(); arm.position.set(0.42, 0.62, 0); g.add(arm);
  H.box(0.1, 0.1, 0.5, '#c7cdd9', 0, 0, 0.25, arm);
  return { g, head, eyes, eyeM, bulbM, arm };
}

// ---------- 1. Agent Control Room: the wall of environments, the console, the agent ----------
const KINDS = ['Shop', 'Search', 'Sign up', 'Log in', 'Maps', 'News', 'Docs', 'Video', 'Mail', 'Calendar', 'Bank', 'Travel',
  'Forum', 'Wiki', 'Jobs', 'Recipes', 'Weather', 'Tickets', 'Checkout', 'Profile', 'Chat', 'Upload', 'Survey', 'Dashboard'];
function controlRoom(R, dbg){
  const { THREE, H } = R;
  const SW = 10.8, SH = 2.9, WY = 2.0, WZ = R.back + 0.16, COLS = 8, ROWS = 3, PX = 120;
  const q = prng(2025), defects = new Set();
  while(defects.size < 4) defects.add((q()*KINDS.length)|0);
  const env = KINDS.map(() => ({ s:'idle' }));   // idle | pass | defect | fixing | live
  const A = { phase:'idle', clock:0, cur:-1, fixQ:[], fixed:0, spin:0 };
  const passing = () => env.filter(e => e.s === 'pass' || e.s === 'live').length;
  const tileXY = (i, cw, ch) => { const gw = cw/COLS, gh = (ch - 40)/ROWS; return [(i % COLS)*gw, 40 + (i/COLS|0)*gh, gw, gh]; };

  // the wall: 24 browser windows on one canvas, with the agent's cursor hopping between them
  R.box(SW + 0.34, SH + 0.34, 0.14, ink, 0, WY, R.back + 0.08);
  R.box(SW + 0.6, 0.14, 0.4, '#3f5d63', 0, WY - SH/2 - 0.22, R.back + 0.2);
  const wall = R.screen(SW, SH, (g, w, h, t) => {
    g.fillStyle = '#16323a'; g.fillRect(0, 0, w, h);
    H.F(g, 700, 24); g.fillStyle = '#5ff0e0'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('20+ real web environments', 14, 21);
    g.textAlign = 'right'; g.fillStyle = '#ffffffcc'; H.F(g, 600, 20, 'Nunito'); g.fillText(`passing ${passing()} / ${KINDS.length}`, w - 14, 21);
    KINDS.forEach((kind, i) => {
      const [x, y, gw, gh] = tileXY(i, w, h), e = env[i], pad = 6;
      const bg = { idle:'#e9eef6', pass:'#dff5e6', defect:'#ffd9d9', fixing:'#fff1c4', live:'#c9f2d6' }[e.s];
      g.fillStyle = bg; H.rr(g, x + pad, y + pad, gw - pad*2, gh - pad*2, 10); g.fill();
      g.fillStyle = '#00000014'; g.fillRect(x + pad, y + pad + 16, gw - pad*2, 2);
      ['#ff6b6b', '#ffd166', '#35b36a'].forEach((c, n) => { g.fillStyle = c; g.beginPath(); g.arc(x + pad + 10 + n*10, y + pad + 9, 3.2, 0, 7); g.fill(); });
      g.fillStyle = ink; H.F(g, 700, 15); g.textAlign = 'left'; g.fillText(kind, x + pad + 40, y + pad + 10);
      g.fillStyle = '#1f2a4430'; for(let n = 0; n < 3; n++) g.fillRect(x + pad + 8, y + pad + 26 + n*10, (gw - pad*2 - 16)*(0.9 - n*0.22), 5);
      g.fillStyle = e.s === 'defect' ? '#e5484d' : teal; H.rr(g, x + pad + 8, y + gh - pad - 22, 36, 14, 5); g.fill();
      const tag = { pass:'ok', defect:'defect', fixing:'fixing', live:'live run ok' }[e.s];
      if(tag){ g.fillStyle = { pass:'#35b36a', defect:'#e5484d', fixing:'#b8860b', live:'#1f8a4c' }[e.s]; H.F(g, 700, 13); g.textAlign = 'right'; g.fillText(tag, x + gw - pad - 8, y + gh - pad - 14); }
      if(e.s === 'defect' && (t*3|0) % 2){ g.strokeStyle = '#e5484d'; g.lineWidth = 4; H.rr(g, x + pad, y + pad, gw - pad*2, gh - pad*2, 10); g.stroke(); }
    });
    if(A.cur >= 0){
      const [x, y, , gh] = tileXY(A.cur, w, h), cx = x + 30 + Math.sin(t*9)*3, cy = y + gh - 20;
      g.fillStyle = '#ffffff'; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 11, cy + 26); g.lineTo(cx + 16, cy + 16); g.lineTo(cx + 27, cy + 12); g.closePath(); g.fill(); g.stroke();
    }
  }, { x:0, y:WY, z:WZ, fps:10, px:PX });

  // the console with a joystick, a big button and a status screen
  const con = R.group(0, 0, -3.3);
  H.box(2.8, 0.95, 0.9, '#24514f', 0, 0.47, 0, con);
  const deck = H.box(2.9, 0.08, 1.0, '#3f5d63', 0, 1.0, 0.02, con); deck.rotation.x = 0.22;
  const btnM = new THREE.MeshStandardMaterial({ color:'#35b36a', roughness:0.4, emissive:'#35b36a', emissiveIntensity:0.2 });
  const btn = H.cyl(0.2, 0.2, 0.1, btnM, 0.85, 1.06, 0.12, con, 18);
  H.ball(0.1, '#1f2a44', -0.7, 1.04, 0.1, con, 10);
  const stick = new THREE.Group(); stick.position.set(-0.7, 1.06, 0.1); con.add(stick);
  H.cyl(0.035, 0.035, 0.4, '#9aa3b8', 0, 0.2, 0, stick, 8); H.ball(0.09, '#e5484d', 0, 0.42, 0, stick, 12);
  H.box(1.6, 0.7, 0.08, ink, 0, 1.45, -0.36, con);
  const status = R.screen(1.5, 0.6, (g, w, h) => {
    g.fillStyle = '#16323a'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    const kind = KINDS[A.cur] || '';
    const [a, b] = { idle:['Press F', 'run the agent'], scan:['Driving', `${kind}  ${A.cur + 1}/${KINDS.length}`], found:[`${A.fixQ.length} defects found`, 'press F to fix them'],
      fix:['Fixing ' + kind, 'checking a live run'], done:['All checked', 'on live agent runs'] }[A.phase];
    g.fillStyle = A.phase === 'found' ? '#ff8a8a' : A.phase === 'done' ? '#7ee2a0' : '#5ff0e0'; H.F(g, 700, 30); g.fillText(a, w/2, h*0.36);
    g.fillStyle = '#ffffffcc'; H.F(g, 600, 22, 'Nunito'); g.fillText(b, w/2, h*0.72);
  }, { parent:con, y:1.45, z:-0.31, fps:6, px:110 });
  R.solid(0, -3.3, 1.5, 0.55);
  R.lamp('pendant', -1.4, 3.7, -3.3, { top:6.3 }); R.lamp('pendant', 1.4, 3.7, -3.3, { top:6.3 });

  // the agent, and the beam it drives the wall with
  const agent = bot(R, -3.3, -3.5, 0.45); R.solidR(-3.3, -3.5, 0.6);
  const beamM = new THREE.MeshBasicMaterial({ color:'#5ff0e0', transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6, 1, true), beamM); beam.visible = false; R.g.add(beam);
  const spark = R.glow(0, 0, 0, 0.9, '#5ff0e0', R.g, 0.9); spark.visible = false;
  const up = new THREE.Vector3(0, 1, 0), pA = new THREE.Vector3(-3.3, 1.66, -3.5), pB = new THREE.Vector3(), dir = new THREE.Vector3();
  const tileWorld = i => pB.set(-SW/2 + ((i % COLS) + 0.5)*SW/COLS, WY + SH/2 - 40/PX - ((i/COLS|0) + 0.5)*(SH - 40/PX)/ROWS, WZ + 0.02);

  // little browser windows orbiting a hologram pad at the front
  const holo = R.group(5.8, 0, 2.8);
  R.cyl(0.8, 0.9, 0.2, '#24514f', 5.8, 0.1, 2.8); R.solidR(5.8, 2.8, 0.9);
  R.glow(0, 0.3, 0, 2.2, '#5ff0e0', holo, 0.5);
  const minis = ['Shop', 'Maps', 'Mail', 'Docs'].map((kind, k) => {
    const s = R.screen(0.9, 0.6, (g, w, h) => {
      g.fillStyle = '#f4f6fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#dfe4ee'; g.fillRect(0, 0, w, 16);
      ['#ff6b6b', '#ffd166', '#35b36a'].forEach((c, n) => { g.fillStyle = c; g.beginPath(); g.arc(9 + n*9, 8, 3, 0, 7); g.fill(); });
      g.fillStyle = ink; H.F(g, 700, 14); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(kind, 36, 9);
      g.fillStyle = '#c8d0de'; for(let n = 0; n < 3; n++) g.fillRect(8, 26 + n*10, w - 16 - n*18, 5);
      g.fillStyle = teal; H.rr(g, 8, h - 18, 30, 11, 4); g.fill();
    }, { parent:holo, double:true, px:110 });
    return { m:s.mesh, a:k/4*Math.PI*2 };
  });

  // harbour things: a life ring and a ship's wheel on the back wall, bollards and rope at the front
  { const ring = R.mesh(new THREE.TorusGeometry(0.42, 0.12, 10, 24), '#ffffff', -7.2, 1.7, R.back + 0.16); for(let k = 0; k < 4; k++){ const b = R.mesh(new THREE.TorusGeometry(0.42, 0.125, 6, 4, 0.5), '#e5484d', -7.2, 1.7, R.back + 0.16); b.rotation.z = k*Math.PI/2 + 0.2; } }
  { const wheel = R.group(7.2, 1.7, R.back + 0.2); H.mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 24), '#8a5a3c', 0, 0, 0, wheel); for(let k = 0; k < 8; k++){ const sp = H.box(0.05, 1.2, 0.05, '#8a5a3c', 0, 0, 0, wheel); sp.rotation.z = k*Math.PI/8; } H.cyl(0.1, 0.1, 0.1, '#6b4a33', 0, 0, 0, wheel, 12).rotation.x = Math.PI/2;
    R.tick((dt, t) => { wheel.rotation.z = Math.sin(t*0.6)*0.5; }); }
  for(const [bx, bz] of [[-6.8, 3.6], [-4.2, 4.6]]){ R.cyl(0.22, 0.26, 0.6, '#3a3a44', bx, 0.3, bz, R.s, 12); R.cyl(0.32, 0.32, 0.1, '#3a3a44', bx, 0.62, bz, R.s, 12); R.solidR(bx, bz, 0.35); }
  { const coil = R.mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 20), '#d8c18f', -5.5, 0.1, 4.1); coil.rotation.x = Math.PI/2; const c2 = R.mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 20), '#d8c18f', -5.5, 0.26, 4.1); c2.rotation.x = Math.PI/2; }

  function run(){
    if(A.phase === 'scan' || A.phase === 'fix') return A.phase;
    if(A.phase === 'found'){ A.phase = 'fix'; A.clock = 0; A.fixed = 0; return 'fix'; }
    env.forEach(e => { e.s = 'idle'; }); A.phase = 'scan'; A.clock = 0; A.cur = 0; A.fixQ = []; return 'scan';
  }
  const STEP = 0.26, FIX = 1.1;
  R.tick((dt, t) => {
    const busy = A.phase === 'scan' || A.phase === 'fix';
    if(A.phase === 'scan'){
      A.clock += dt; const k = Math.min(KINDS.length, Math.floor(A.clock/STEP));
      for(let i = 0; i < k; i++) if(env[i].s === 'idle'){ const bad = defects.has(i); env[i].s = bad ? 'defect' : 'pass'; if(bad){ A.fixQ.push(i); R.buzz(); } }
      A.cur = Math.min(k, KINDS.length - 1);
      if(k >= KINDS.length){ A.phase = 'found'; A.cur = -1; status.redraw(); agentUse.label = 'Fix and check on live runs'; }
    } else if(A.phase === 'fix'){
      A.clock += dt; const k = Math.floor(A.clock/FIX);
      A.fixQ.forEach((i, n) => { if(n < k && env[i].s !== 'live'){ env[i].s = 'live'; A.fixed++; R.chime(700 + n*80); } else if(n === k) env[i].s = 'fixing'; });
      A.cur = A.fixQ[Math.min(k, A.fixQ.length - 1)];
      if(k >= A.fixQ.length){ A.phase = 'done'; A.cur = -1; burst(R, 0, 3.6, R.back + 1.2); R.chime(990); status.redraw(); agentUse.label = 'Run the agent again'; }
    }
    // the beam from the agent's antenna to the window it is driving
    beam.visible = spark.visible = busy && A.cur >= 0;
    if(beam.visible){
      tileWorld(A.cur); dir.subVectors(pB, pA); const L = dir.length();
      beam.position.copy(pA).addScaledVector(dir, 0.5); beam.quaternion.setFromUnitVectors(up, dir.normalize()); beam.scale.set(1, L, 1);
      spark.position.copy(pB); spark.scale.setScalar(0.7 + Math.sin(t*20)*0.2);
    }
    agent.head.rotation.y = busy ? Math.sin(t*3)*0.25 : Math.sin(t*0.7)*0.4;
    agent.arm.rotation.x = busy ? -0.6 + Math.sin(t*9)*0.25 : -0.2;
    agent.eyeM.color.set(A.phase === 'found' ? ((t*4|0) % 2 ? '#ff6b6b' : '#5ff0e0') : A.phase === 'fix' ? '#ffd166' : A.phase === 'done' ? '#7ee2a0' : '#5ff0e0');
    agent.bulbM.color.set(busy ? ((t*6|0) % 2 ? '#ffd166' : '#e5484d') : A.phase === 'done' ? '#35b36a' : '#e5484d');
    const blink = Math.sin(t*2.3) > 0.97; agent.eyes.forEach(e => { e.scale.y = blink ? 0.2 : 1; });
    agent.g.position.y = A.phase === 'done' ? Math.abs(Math.sin(t*6))*0.12 : 0;
    stick.rotation.z = busy ? Math.sin(t*7)*0.35 : 0; stick.rotation.x = busy ? Math.cos(t*5)*0.3 : 0;
    btnM.emissiveIntensity = A.phase === 'idle' || A.phase === 'found' ? 0.25 + Math.sin(t*4)*0.2 : 0.1;
    btnM.color.set(A.phase === 'found' ? '#ffb35c' : '#35b36a'); btnM.emissive.copy(btnM.color);
    if(busy && ((t*6)|0) !== A.last){ A.last = (t*6)|0; status.redraw(); }
    // orbiting windows: faster while the agent works
    A.spin = Math.max(0, A.spin - dt);
    const sp = busy ? 2.2 : A.spin > 0 ? 4 : 0.5;
    minis.forEach((m, k) => { m.a += dt*sp; m.m.position.set(Math.cos(m.a)*1.0, 1.7 + Math.sin(t*1.6 + k)*0.14, Math.sin(m.a)*1.0); m.m.rotation.y = -m.a + Math.PI/2; });
  });
  const agentUse = R.use({ key:'agent', x:0, z:-1.9, r:2.0, y:2.4, label:'Run the agent', hit:[con], pitch:720, fn(){ run(); status.redraw(); } });
  R.use({ key:'robot', x:-3.3, z:-2.2, r:1.4, y:2.4, label:'Talk to the agent', hit:agent.g, silent:true, fn(){
    agent.g.rotation.y = 0.45; A.spin = 1;
    talk(R, { name:'Agent', portrait:'robot', lines:[
      'Beep. I am an AI agent. I open real websites and click through them the way a person would.',
      'On Browser Use, Andrew fixed defects across 20+ real web environments, and checked every AI fix against live agent runs.',
      'Press F at the console and watch me drive the wall.'] });
  } });
  R.use({ key:'windows', x:5.8, z:4.1, r:1.5, y:2.6, label:'Spin the windows', hit:holo, pitch:900, fn(){ A.spin = 2.5; } });
  dbg.agent = () => ({ phase:A.phase, cur:A.cur, passing:passing(), defects:A.fixQ.length, fixed:A.fixed });
  R.stop('Browser Use Dock', 'From June to August 2025 in Frederick, Andrew was an AI intern at Minnodi LLC, working on Browser Use, an open-source AI agent platform with 2,000+ users. Say hi to the agent.', -3.3, 3.0, -3.6);
  R.stop('Twenty-plus web environments', 'The wall is 24 kinds of website. Press F at the console: the agent drives through them and flags the defects, then press F again and every fix is checked against a live agent run.', 0, 4.1, -4.4);
}

// ---------- 2. Onboarding Library: the guide press under the dome, 200 contributors on the tiers ----------
function library(R, dbg){
  const { THREE, H } = R;
  const z0 = R.doorZ - 1.7, rx = R.w/2, rz = z0 - R.back;          // the apse ellipse the kit built
  const P = (a, d) => [Math.cos(a)*(rx - d), z0 + Math.sin(a)*(rz - d)];
  const A0 = Math.PI + 0.24, A1 = Math.PI*2 - 0.24;
  // three tiers stepping down from the curved wall, like a little amphitheatre
  const tiers = [{ d:0.15, h:1.05, n:72 }, { d:0.95, h:0.7, n:66 }, { d:1.75, h:0.35, n:62 }];
  tiers.forEach((tr, k) => {
    const N = 26, dm = tr.d + 0.4;
    for(let i = 0; i < N; i++){
      const [xa, za] = P(A0 + (A1 - A0)*i/N, dm), [xb, zb] = P(A0 + (A1 - A0)*(i + 1)/N, dm);
      const L = Math.hypot(xb - xa, zb - za) + 0.06, m = R.box(L, tr.h, 0.82, k % 2 ? '#e9d3ad' : '#f3e1c0', (xa + xb)/2, tr.h/2, (za + zb)/2);
      m.rotation.y = Math.atan2(-(zb - za), xb - xa);
      const e = R.box(L, 0.05, 0.1, orange, (xa + xb)/2, tr.h, (za + zb)/2); e.rotation.y = m.rotation.y;
      e.position.x += Math.cos(A0 + (A1 - A0)*(i + 0.5)/N)*0.36*-1; e.position.z += Math.sin(A0 + (A1 - A0)*(i + 0.5)/N)*0.36*-1;
    }
  });
  for(let i = 0; i < 12; i++){   // the tiers as colliders: the band from the wall to 2.55 m in
    const [xa, za] = P(A0 + (A1 - A0)*i/12, 1.3), [xb, zb] = P(A0 + (A1 - A0)*(i + 1)/12, 1.3);
    R.solid((xa + xb)/2, (za + zb)/2, Math.hypot(xb - xa, zb - za)/2 + 0.1, 1.28, Math.atan2(-(zb - za), xb - xa));
  }

  // the crowd: 200 figures, a body, eyes and a guide each, as three instanced meshes
  const seats = [];
  tiers.forEach(tr => { for(let i = 0; i < tr.n; i++){ const a = A0 + (A1 - A0)*(i + 0.5)/tr.n, [x, z] = P(a, tr.d + 0.42); seats.push({ x, y:tr.h, z, face:Math.atan2(-x, (z0 - 0.9) - z), lit:false, hop:-10 }); } });
  const N = seats.length;   // 200
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.14, 0.18, 4, 10), new THREE.MeshStandardMaterial({ roughness:0.7 }), N);
  const eyeGeo = mergeGeometries([new THREE.SphereGeometry(0.03, 6, 4).translate(-0.06, 0.33, 0.125), new THREE.SphereGeometry(0.03, 6, 4).translate(0.06, 0.33, 0.125)]);
  const eyes = new THREE.InstancedMesh(eyeGeo, new THREE.MeshBasicMaterial({ color:'#1b1b24' }), N);
  const guide = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.26, 0.04), new THREE.MeshStandardMaterial({ color:orange, roughness:0.6 }), N);
  body.castShadow = true; for(const m of [body, eyes, guide]){ m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.g.add(m); }
  const pal = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c', '#a0e7e5', '#f4a261'], grey = new THREE.Color('#b3b9c6'), col = new THREE.Color();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0), G = new THREE.Vector3();
  function pose(i, t){
    const s = seats[i], hp = t - s.hop, jump = hp < 0.6 ? Math.sin(hp/0.6*Math.PI)*0.35 : 0;
    Q.setFromAxisAngle(Y, s.face); V.set(s.x, s.y + 0.23 + jump, s.z);
    body.setMatrixAt(i, M.compose(V, Q, S)); eyes.setMatrixAt(i, M.compose(V.set(s.x, s.y + jump, s.z), Q, S));
    G.set(s.x + Math.sin(s.face)*0.17, s.y + 0.28 + jump + (s.lit && jump ? 0.15 : 0), s.z + Math.cos(s.face)*0.17);
    guide.setMatrixAt(i, M.compose(G, Q, V.setScalar(s.lit ? 1 : 0.0001)));
  }
  const paint = i => body.setColorAt(i, seats[i].lit ? col.set(pal[i % pal.length]) : grey);
  for(let i = 0; i < N; i++){ pose(i, -10); paint(i); }
  const order = seats.map((_, i) => i); { const q = prng(200); for(let i = N - 1; i > 0; i--){ const j = (q()*(i + 1))|0; [order[i], order[j]] = [order[j], order[i]]; } }

  // the press under the oculus: stamps a stack of guides, then they fly to the tiers
  const PZ = -2.4, press = R.group(0, 0, PZ);
  H.box(2.0, 0.9, 1.4, '#6b4a33', 0, 0.45, 0, press); H.box(2.1, 0.08, 1.5, orange, 0, 0.92, 0, press);
  for(const sx of [-0.85, 0.85]) H.box(0.18, 1.9, 0.18, '#4a3526', sx, 1.85, -0.3, press);
  H.box(2.0, 0.24, 0.4, '#4a3526', 0, 2.85, -0.3, press);
  const head = new THREE.Group(); head.position.set(0, 2.2, -0.1); press.add(head);
  H.box(1.2, 0.3, 0.9, orange, 0, 0, 0, head); H.cyl(0.08, 0.08, 0.7, '#c7cdd9', 0, 0.45, 0, head, 8);
  const stack = new THREE.Group(); stack.position.set(0, 0.96, 0.05); press.add(stack);
  const sheetGeo = new THREE.BoxGeometry(0.7, 0.06, 0.5), sheetM = new THREE.MeshStandardMaterial({ color:paper, roughness:0.8 }), coverM = new THREE.MeshStandardMaterial({ color:orange, roughness:0.6 });
  const sheets = Array.from({ length:8 }, (_, k) => { const m = new THREE.Mesh(sheetGeo, k % 2 ? sheetM : coverM); m.position.y = 0.03 + k*0.065; m.visible = false; stack.add(m); return m; });
  R.solid(0, PZ, 1.1, 0.78);
  let lit = 0, stampT = -10, printed = 0;
  const board = R.screen(3.0, 0.62, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = ink; H.rr(g, 2, 2, w - 4, h - 4, (h - 4)/2); g.fill();
    g.fillStyle = '#ffffff'; H.F(g, 700, 34); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(lit >= N ? 'Adopted by 200+ contributors' : `Guides handed out: ${lit} / 200+`, w/2, h/2 + 2);
    g.fillStyle = orange; g.fillRect(40, h - 14, (w - 80)*lit/N, 5);
  }, { x:0, y:3.35, z:PZ - 0.2, transparent:true, px:120 });
  const flyGeo = new THREE.BoxGeometry(0.22, 0.03, 0.16), flights = [];
  const pool = Array.from({ length:26 }, () => { const m = new THREE.Mesh(flyGeo, coverM); m.visible = false; R.g.add(m); return m; });
  function print(){
    const t = now();
    if(lit >= N){ seats.forEach(s => { s.lit = false; }); lit = 0; for(let i = 0; i < N; i++){ paint(i); pose(i, -10); } body.instanceColor.needsUpdate = true; guide.instanceMatrix.needsUpdate = true; board.redraw(); }
    if(flights.length) return false;
    stampT = t; printed++;
    const batch = order.slice(lit, Math.min(N, lit + 25));
    batch.forEach((i, k) => flights.push({ i, t0:t + 0.55 + k*0.05, m:null }));
    return true;
  }
  R.tick((dt, t) => {
    const sp = t - stampT;
    head.position.y = 2.2 - (sp < 0.5 ? Math.sin(sp/0.5*Math.PI)*0.95 : 0);
    const shown = sp < 0.5 ? Math.round(sp/0.5*8) : flights.length ? Math.max(0, 8 - Math.round(flights.filter(f => t > f.t0).length/3)) : 0;
    sheets.forEach((m, k) => { m.visible = k < shown; });
    let dirty = false;
    for(let n = flights.length - 1; n >= 0; n--){
      const f = flights[n], p = (t - f.t0)/0.9;
      if(p < 0) continue;
      if(!f.m){ f.m = pool.find(m => !m.visible) || null; if(f.m) f.m.visible = true; }
      const s = seats[f.i];
      if(p >= 1){ if(f.m) f.m.visible = false; flights.splice(n, 1); s.lit = true; s.hop = t; lit++; paint(f.i); dirty = true; if(lit % 5 === 0) R.chime(560 + (lit % 25)*14); if(lit === N){ burst(R, 0, 3.4, -3.6); R.chime(1040); } board.redraw(); continue; }
      if(f.m){ f.m.position.set(p*s.x, 1.3 + (s.y + 0.5 - 1.3)*p + Math.sin(p*Math.PI)*2.4, PZ + (s.z - PZ)*p); f.m.rotation.set(p*9, p*5, 0); }
    }
    for(let i = 0; i < N; i++){ const s = seats[i]; if(t - s.hop < 0.7){ pose(i, t); dirty = true; } }
    if(dirty){ body.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = guide.instanceMatrix.needsUpdate = true; if(body.instanceColor) body.instanceColor.needsUpdate = true; }
  });
  R.use({ key:'print', x:0, z:-0.7, r:2.0, y:3.2, label:'Print a stack of guides', hit:[press], pitch:620, fn(){ print(); } });

  // the lectern with the open guide
  const lect = R.group(-5.2, 0, 3.0); lect.rotation.y = 0.35;
  H.box(0.7, 1.1, 0.6, '#6b4a33', 0, 0.55, 0, lect);
  R.screen(1.9, 1.25, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = orange; g.fillRect(w/2 - 3, 0, 6, h);
    g.fillStyle = ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const para = (ttl, text, x0) => { H.F(g, 700, 26); g.fillText(ttl, x0, 40); H.F(g, 600, 18, 'Nunito'); let line = '', y = 78;
      for(const wd of text.split(' ')){ const tst = line ? line + ' ' + wd : wd; if(g.measureText(tst).width > w/2 - 36){ g.fillText(line, x0, y); y += 26; line = wd; } else line = tst; } g.fillText(line, x0, y); };
    para('Onboarding', 'Documentation and onboarding for Browser Use, an open-source AI agent platform.', 18);
    para('Adopted', 'Guides adopted by 200+ contributors.', w/2 + 18);
  }, { parent:lect, y:1.2, z:0.08, rotX:-0.95, px:200 });
  R.solidR(-5.2, 3.0, 0.55);
  R.use({ key:'read', x:-5.0, z:4.2, r:1.4, y:2.2, label:'Read the guide', hit:lect, silent:true, fn(){
    talk(R, { name:'Onboarding guide', portrait:'sign', lines:[
      'Welcome to Browser Use, an open-source AI agent platform with 2,000+ users.',
      'Andrew built its documentation and onboarding. 200+ contributors adopted the guides.'] });
  } });
  // a new contributor, and docs on the shelves by the door
  const newbie = person(R, '#8fd3ff', 4.8, 3.0, { face:-0.4, scale:0.9 }); R.solidR(4.8, 3.0, 0.45);
  R.use({ key:'newbie', x:4.8, z:4.2, r:1.4, y:2.3, label:'Talk to the new contributor', hit:newbie.b, silent:true, fn(){
    newbie.hop();
    talk(R, { name:'New contributor', portrait:'blob', color:'#8fd3ff', lines:[
      'Hi! First week on Browser Use, and there are a lot of moving parts.',
      'Good thing the onboarding guides exist. Andrew wrote the docs that 200+ contributors adopted.',
      'Press F at the press and hand some out. Everyone on the tiers is waiting for one.'] });
  } });
  R.shelf(-8.1, 4.3, 3.0, 1.9, { rotY:Math.PI/2, colors:[teal, orange, sea, '#ffd166', '#d6689a', '#f4ead8'] });
  R.shelf(8.1, 4.3, 3.0, 1.9, { rotY:-Math.PI/2, colors:[teal, orange, sea, '#ffd166', '#d6689a', '#f4ead8'] });
  R.float('2,000+ users', 4.8, 2.3, 3.0, { size:24, bg:orange, fg:'#ffffff', scale:0.85 });
  dbg.guides = () => ({ lit, of:N, printed, flying:flights.length });
  R.stop('Onboarding guides', 'Andrew built the documentation and onboarding for Browser Use. Press F at the press under the dome: it stamps a stack of guides and they fly out to the tiers.', 0, 3.8, PZ);
  R.stop('200+ contributors', 'Two hundred little contributors sit on the tiers, one for each of the 200+ who adopted the guides. Every guide that lands lights one up.', -3.6, 2.6, -4.8);
}

// ---------- 3. Async Harbour: message boats to the team across the water, replies on their own time ----------
const MSGS = [
  { ch:'slack', out:'Update posted', back:'Thanks, looks good' },
  { ch:'github', out:'Pull request opened', back:'Review: approved' },
  { ch:'slack', out:'Question on the docs', back:'Answered overnight' },
  { ch:'github', out:'Issue: flaky run', back:'Fix checked on a live run' },
];
function harbour(R, dbg){
  const { THREE, H } = R;
  const WZ0 = R.back + 0.1, WZ1 = -1.65;   // water from the back wall to the quay
  // water: a scrolling ripple texture on one plane
  const wt = H.canvasTex(128, 128, g => { g.fillStyle = '#4aa6d4'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffffff40'; for(let k = 0; k < 14; k++){ const x = (k*37) % 128, y = (k*53) % 128; g.fillRect(x, y, 22, 3); } });
  wt.tex.wrapS = wt.tex.wrapT = THREE.RepeatWrapping; wt.tex.repeat.set(6, 2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(R.w - 0.3, WZ1 - WZ0), new THREE.MeshStandardMaterial({ map:wt.tex, color:'#bfe6ff', roughness:0.25, metalness:0.1 }));
  water.rotation.x = -Math.PI/2; water.position.set(0, 0.05, (WZ0 + WZ1)/2); water.receiveShadow = true; R.g.add(water);
  R.box(R.w - 0.2, 0.28, 0.34, '#9aa3b8', 0, 0.14, WZ1 + 0.02);                        // the quay edge
  for(let k = 0; k < 9; k++) R.cyl(0.13, 0.13, 0.9, '#6b4a33', -7.6 + k*1.9, 0.45, WZ1 + 0.25, R.s, 8);
  R.solid(0, (WZ0 + WZ1)/2, R.w/2 - 0.1, (WZ1 - WZ0)/2 + 0.05);
  // two piers: ours on the left, the team's on the right with a lighthouse
  for(const px of [-6, 6]){
    R.box(1.4, 0.12, 3.6, '#a8784a', px, 0.3, -3.4);
    for(const [ox, oz] of [[-0.6, -1.6], [0.6, -1.6], [-0.6, -3.4], [0.6, -3.4], [-0.6, -5.1], [0.6, -5.1]]) R.cyl(0.08, 0.08, 0.5, '#5a3b27', px + ox, 0.2, oz, R.s, 6);
  }
  R.float('Us', -6, 1.4, -1.9, { size:26, bg:sea, fg:'#ffffff', scale:0.8 });
  R.float('The team', 6, 1.4, -1.9, { size:26, bg:'#35a36a', fg:'#ffffff', scale:0.8 });
  const lh = R.group(7.4, 0, -5.6);
  for(let k = 0; k < 4; k++) H.cyl(0.42 - k*0.05, 0.46 - k*0.05, 0.6, k % 2 ? '#ffffff' : '#e5484d', 0, 0.3 + k*0.6, 0, lh, 16);
  H.cyl(0.3, 0.3, 0.4, '#fff4d6', 0, 2.6, 0, lh, 12); H.mesh(new THREE.ConeGeometry(0.38, 0.4, 16), '#e5484d', 0, 3.0, 0, lh);
  const lamp = new THREE.Group(); lamp.position.y = 2.6; lh.add(lamp);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 16, 1, true), R.addMat(R.tex.shaft, '#fff1c9', 0.35)); cone.rotation.z = Math.PI/2; cone.position.x = 1.6; lamp.add(cone);   // apex at the lamp, wide end out
  R.glow(0, 2.6, 0, 1.6, '#fff1c9', lh, 0.8);
  // the globe on a buoy: one team, many time zones, pins that light up when their message lands
  const globe = R.group(0, 2.3, -4.4);
  R.cyl(0.35, 0.5, 0.5, '#e5484d', 0, 0.2, -4.4, R.g, 14); R.cyl(0.08, 0.08, 1.4, '#9aa3b8', 0, 1.1, -4.4, R.s, 8);
  const gt = H.canvasTex(256, 128, g => { g.fillStyle = '#5fb4d9'; g.fillRect(0, 0, 256, 128); const q = prng(77); g.fillStyle = '#8fcf6f';
    for(let k = 0; k < 9; k++){ const x = q()*256, y = 24 + q()*80; g.beginPath(); g.ellipse(x, y, 14 + q()*26, 8 + q()*16, q()*3, 0, 7); g.fill(); } });
  H.mesh(new THREE.SphereGeometry(0.75, 28, 18), new THREE.MeshStandardMaterial({ map:gt.tex, roughness:0.6 }), 0, 0, 0, globe);
  const pins = [[0.4, 0.3], [2.1, -0.2], [3.6, 0.5], [5.0, -0.4]].map(([lon, lat]) => {
    const m = new THREE.MeshBasicMaterial({ color:'#ffd166' }), p = H.ball(0.07, m, Math.cos(lat)*Math.sin(lon)*0.78, Math.sin(lat)*0.78, Math.cos(lat)*Math.cos(lon)*0.78, globe, 8);
    return { m, at:-10 };
  });
  R.float('One team, many time zones', 0, 3.55, -4.4, { size:24, bg:ink, fg:'#ffffff', scale:0.85 });

  // boats: hull, bow, mast and a sail that carries the message
  const boats = [0, 1, 2, 3].map(k => {
    const g = R.group(0, 0, 0); g.visible = false;
    const hullM = new THREE.MeshStandardMaterial({ color:'#4a154b', roughness:0.6 });
    H.box(1.1, 0.34, 0.56, hullM, 0, 0.2, 0, g); const bow = H.mesh(new THREE.ConeGeometry(0.28, 0.5, 4), hullM, 0.78, 0.2, 0, g); bow.rotation.z = -Math.PI/2; bow.rotation.x = Math.PI/4;
    H.box(1.2, 0.06, 0.62, '#fffaf0', 0, 0.39, 0, g); H.cyl(0.03, 0.03, 1.3, '#6b4a33', 0, 1.0, 0, g, 6);
    let msg = MSGS[0];
    const sail = R.screen(1.0, 0.9, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = paper; c.beginPath(); c.moveTo(4, h - 4); c.lineTo(w - 4, h - 4); c.lineTo(w/2, 4); c.closePath(); c.fill();
      c.fillStyle = msg.ch === 'slack' ? '#4a154b' : '#24292f'; H.F(c, 700, 44); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg.ch === 'slack' ? '#' : '</>', w/2, h*0.62);
      H.F(c, 700, 13); c.fillText(msg.ch === 'slack' ? 'Slack' : 'GitHub', w/2, h - 16);
    }, { parent:g, x:0, y:1.05, z:0.02, transparent:true, double:true, px:120 });
    return { g, hullM, sail, set(m){ msg = m; sail.redraw(); hullM.color.set(m.ch === 'slack' ? '#4a154b' : '#24292f'); }, busy:false, p:0, dir:1, m:null, t0:0 };
  });
  // the team on their pier waves when a boat arrives
  const team = ['#ffd166', '#b5e48c', '#ff9fb2'].map((c, k) => person(R, c, 5.6 + (k % 2)*0.8, -2.4 - k*1.1, { y:0.36, face:-1.2, scale:0.6 }));
  // the channel feed on a kiosk at the front
  const feed = [{ ch:'slack', text:'#team: morning here, evening there', mine:false }];
  const kiosk = R.group(5.9, 0, 3.0); kiosk.rotation.y = -0.35;
  H.box(0.16, 1.1, 0.16, '#6b4a33', 0, 0.55, 0, kiosk); H.box(2.4, 1.7, 0.12, sea, 0, 1.75, -0.02, kiosk);
  const feedScr = R.screen(2.2, 1.5, (g, w, h) => {
    g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 24); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Messages', 14, 22);
    feed.slice(-5).forEach((m, k) => {
      const y = 44 + k*38, x = m.mine ? 70 : 12, bw = w - 82;
      g.fillStyle = m.ch === 'slack' ? (m.mine ? '#e9d5f0' : '#f5ebf8') : (m.mine ? '#dfe3e8' : '#eef0f3'); H.rr(g, x, y, bw, 32, 12); g.fill();
      g.fillStyle = m.ch === 'slack' ? '#4a154b' : '#24292f'; H.F(g, 700, 14); g.fillText(m.ch === 'slack' ? '#' : '</>', x + 10, y + 16);
      g.fillStyle = ink; H.F(g, 600, 16, 'Nunito'); g.fillText(m.text, x + 42, y + 17);
    });
  }, { parent:kiosk, y:1.75, z:0.05, px:120 });
  R.solid(5.9, 3.0, 1.25, 0.45, -0.35);   // same angle as the kiosk's rotation.y
  // the bell on our pier
  const bell = R.group(-6, 0, WZ1 + 0.45);
  H.box(0.12, 1.8, 0.12, '#6b4a33', 0, 0.9, 0, bell); H.box(0.7, 0.1, 0.12, '#6b4a33', 0.3, 1.8, 0, bell);
  const swing = new THREE.Group(); swing.position.set(0.55, 1.74, 0); bell.add(swing);
  H.mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI*2, 0, Math.PI/2), '#ffd166', 0, -0.2, 0, swing); H.ball(0.05, '#b8860b', 0, -0.22, 0, swing, 8);
  R.solidR(-6, WZ1 + 0.45, 0.3);
  let ring = -10, sentN = 0, repliesN = 0;
  const DUR = 5.0, LANE_OUT = -3.0, LANE_BACK = -5.3;
  function launch(m, dir){
    const b = boats.find(q => !q.busy); if(!b) return false;
    b.busy = true; b.p = 0; b.dir = dir; b.m = m; b.set(m); b.g.visible = true; b.t0 = now();
    return true;
  }
  function send(){
    const m = MSGS[sentN % MSGS.length];
    if(!launch(m, 1)) return false;
    sentN++; ring = now(); feed.push({ ch:m.ch, text:m.out, mine:true }); feedScr.redraw();
    return true;
  }
  const pending = [];   // replies waiting on the other side of the world
  R.tick((dt, t) => {
    wt.tex.offset.x += dt*0.03; wt.tex.offset.y += dt*0.015;
    globe.rotation.y += dt*0.25; lamp.rotation.y += dt*1.2;
    const rs = t - ring; swing.rotation.z = rs < 1.5 ? Math.sin(rs*18)*0.5*(1 - rs/1.5) : 0;
    pins.forEach(p => { const s = t - p.at; p.m.color.set(s < 2 ? ((s*6|0) % 2 ? '#ffffff' : '#35b36a') : '#ffd166'); });
    for(let n = pending.length - 1; n >= 0; n--) if(t >= pending[n].at && launch(pending[n].m, -1)) pending.splice(n, 1);
    boats.forEach((b, k) => {
      if(!b.busy){ b.g.visible = false; return; }
      b.p += dt/DUR; const p = Math.min(1, b.p), lane = b.dir > 0 ? LANE_OUT : LANE_BACK;
      const x = b.dir > 0 ? -5.6 + 11.2*p : 5.6 - 11.2*p;
      b.g.position.set(x, 0.08 + Math.sin(t*2.4 + k)*0.05, lane + Math.sin(p*Math.PI)*(b.dir > 0 ? 0.5 : -0.4));
      b.g.rotation.set(Math.sin(t*1.9 + k)*0.05, b.dir > 0 ? 0 : Math.PI, Math.sin(t*1.6 + k)*0.07);
      if(p >= 1){
        b.busy = false; b.g.visible = false;
        if(b.dir > 0){ team.forEach((m, n) => setTimeout(() => m.hop(), n*120)); pins[sentN % pins.length].at = t; pending.push({ m:b.m, at:t + 1.5 + ((sentN*7) % 3)*0.9 }); R.chime(620); }
        else { repliesN++; feed.push({ ch:b.m.ch, text:b.m.back, mine:false }); feedScr.redraw(); ring = t; R.chime(880); }
      }
    });
  });
  R.use({ key:'send', x:-6, z:0.1, r:1.7, y:2.4, label:'Send a message boat', hit:bell, pitch:760, fn(){ send(); } });
  // the harbour master
  const master = person(R, '#ffffff', -2.6, 2.6, { face:0.3, cap:sea }); R.solidR(-2.6, 2.6, 0.45);
  R.use({ key:'master', x:-2.6, z:3.8, r:1.4, y:2.4, label:'Talk to the harbour master', hit:master.b, silent:true, fn(){
    master.hop();
    talk(R, { name:'Harbour master', portrait:'blob', color:'#ffffff', lines:[
      'Messages sail out on Slack and GitHub, and the answers come back on their own time.',
      'Andrew worked async like this with an international team, from June to August 2025 at Minnodi LLC.',
      'Ring the bell on the left pier to send one. Watch the far pier for the reply.'] });
  } });
  R.lamp('floor', -7.6, 1.6, 3.2); R.lamp('floor', 7.6, 1.6, 4.6);
  dbg.boats = () => ({ sent:sentN, replies:repliesN, sailing:boats.filter(b => b.busy).length, waiting:pending.length });
  R.stop('Async harbour', 'Andrew worked async with an international team over Slack and GitHub. Press F at the bell: a message boat sails to the team, and the reply comes back on its own time.', -6, 2.8, -2.2);
  R.stop('One team, many time zones', 'Each message that lands lights a pin on the globe. The feed at the front keeps the thread, the way a channel does.', 0, 3.4, -3.2);
}
