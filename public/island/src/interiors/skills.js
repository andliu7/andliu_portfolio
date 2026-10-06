// Interior for "skills": a vaulted bowling hall whose pins are skills, a sawtooth-roofed workshop
// where tools and frameworks hang on a pegboard, and an octagonal AI bench that checks its own work.
import { tour, prng } from './clinic.js';

const PINS = ['Python', 'TypeScript', 'JavaScript', 'Kotlin', 'Java', 'SQL', 'React', 'Node', 'Supabase', 'PostgreSQL'];
const TOOLS = ['React', 'Vite', 'Tailwind', 'Node', 'Supabase', 'PostgreSQL', 'Firebase', 'MongoDB', 'NumPy', 'Apps Script', 'Git', 'GitHub Actions'];

export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg:'#141a33', bgTop:'#2c3563', seed:21, dark:'#2b3a67',
    rooms: [
      { key:'hall', name:'Bowling Hall', w:15, tall:4.2, roof:'vault', rise:2.6, view:'sky', floor:'#e8c890', floorLine:'#d3ae70', wall:'#2b3a67', wall2:'#34467a', wallKind:'stripes', trim:'#e98a5a', dark:'#1f2a4d', beam:'#e98a5a', exitX:-4,
        build(K, r){ hall(K, r, ctx); } },
      { key:'workshop', name:'Workshop', w:13, tall:4.2, roof:'sawtooth', rise:1.4, floorKind:'concrete', floor:'#c9c3b8', floorLine:'#a8a196', wall:'#c96f4f', wall2:'#b25b3d', wallKind:'brick', trim:'#8a4a34', dark:'#4a3a33', beam:'#3d4a5c',
        build(K, r){ workshop(K, r); } },
      { key:'ai', name:'AI Bench', w:11, shape:'oct', tall:4.2, roof:'dome', rise:2.0, floorKind:'tiles', floor:'#23304f', floorLine:'#33426a', wall:'#2f6f7a', wall2:'#357f8b', wallKind:'boards', dark:'#1f2a4d', poche:'#141a33', beam:'#9bd3e6', shaftColor:'#bfe9ff',
        build(K, r){ bench(K, r); } },
    ],
  });
}

function hall(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx, LX = cx + 2.6, z0 = -D/2 + 0.4, z1 = 3.0;
  // the lane: maple boards, gutters, arrows, a raised pin deck at the back
  const laneTex = H.canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#f1d9a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e2c38c'; for(let i=0;i<8;i++) g.fillRect(i*8, 0, 1, h); g.fillStyle = '#e98a5a'; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(10 + i*11, h*0.72); g.lineTo(6 + i*11, h*0.76); g.lineTo(14 + i*11, h*0.76); g.fill(); } });
  const lane = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, z1 - z0), new THREE.MeshStandardMaterial({ map:laneTex.tex, roughness:0.35 }));
  lane.position.set(LX, 0.04, (z0 + z1)/2); lane.receiveShadow = true; S.add(lane);
  for(const s of [-1, 1]){ K.box(0.35, 0.06, z1 - z0, '#8a95a8', LX + s*1.08, 0.03, (z0 + z1)/2).castShadow = false; K.box(0.12, 0.3, z1 - z0, '#1f2a4d', LX + s*1.32, 0.15, (z0 + z1)/2); }
  K.solid(LX, (z0 + z1)/2, 1.4, (z1 - z0)/2);
  K.box(2.9, 0.9, 0.7, '#1f2a4d', LX, 3.1, z0 + 0.6);   // masking unit over the pins
  K.pool(LX, z0 + 1.2, 2.6, 2.4, '#fff1d0', 0.3);
  // pins in a triangle, apex toward you
  const prof = [[0,0],[0.08,0],[0.1,0.08],[0.115,0.2],[0.085,0.36],[0.055,0.45],[0.07,0.53],[0.055,0.62],[0,0.66]].map(([a, b]) => new THREE.Vector2(a*1.35, b*1.35));
  const pinGeo = new THREE.LatheGeometry(prof, 14);
  const pins = [];
  const rows = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];
  const headZ = z0 + 1.9;
  rows.forEach((row, ri) => row.forEach((idx, j) => {
    const x = LX + (j - (row.length - 1)/2)*0.34, z = headZ - ri*0.3;
    const g = new THREE.Group(); g.position.set(x, 0.08, z); scene.add(g);
    const m = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color:'#fbfbf7', roughness:0.4 })); m.castShadow = true; g.add(m);
    H.cyl(0.075, 0.075, 0.05, '#e98a5a', 0, 0.62, 0, g, 12);
    pins.push({ g, m, home:new THREE.Vector3(x, 0.08, z), name:PINS[idx], down:0, fall:0, dir:0 });
  }));
  // the scoreboard: the pin triangle with each skill's name, knocked ones light up
  const board = K.panel(scene, LX, 3.5, z0 - 0.15, 3.2, 1.3, (g, w, h, knocked = [], msg = '') => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e98a5a'; K.H.F(g, 700, 18); g.textAlign = 'center'; g.fillText(msg || 'SKILLS ALLEY', w/2, 22);
    rows.slice().reverse().forEach((row, ri) => row.forEach((idx, j) => {
      const x = w/2 + (j - (row.length - 1)/2)*84, y = 44 + ri*24, on = knocked.includes(idx);
      g.fillStyle = on ? '#ffd166' : '#2c3563'; K.H.rr(g, x - 40, y - 10, 80, 20, 10); g.fill();
      g.fillStyle = on ? '#10162e' : '#9aa6d6'; K.H.F(g, 700, 11); g.fillText(PINS[idx], x, y + 4);
    }));
  }, { frame:'#e98a5a' });
  // ball, ball return, seats
  const ball = H.ball(0.22, '#3b4f9e', LX, 0.3, z1 + 0.6, scene, 20); ball.material = new THREE.MeshStandardMaterial({ color:'#3b4f9e', roughness:0.25, metalness:0.1 });
  K.box(0.7, 0.5, 1.6, '#1f2a4d', LX - 1.8, 0.25, z1 + 0.5); K.solid(LX - 1.8, z1 + 0.5, 0.35, 0.8);
  for(const [i, c] of ['#e98a5a', '#6fae4a', '#d6689a'].entries()) H.ball(0.2, c, LX - 1.8, 0.66, z1 + i*0.42, S, 16);
  for(let i=0;i<4;i++){ const x = cx - 5.8 + i*1.0; K.cyl(0.4, 0.3, 0.45, '#e98a5a', x, 0.22, -1.6, S, 18); K.box(0.8, 0.7, 0.12, '#e98a5a', x, 0.75, -1.95); }
  K.solid(cx - 4.3, -1.7, 2.0, 0.45);
  K.info(cx - 4.3, -D/2 + 0.08, { y:2.0, w:2.6, h:1.3, padZ:2.9 });
  K.pendant(cx - 4.3, 4.2, -2.6, '#e98a5a', '#ffe0a8', { drop:1.6 });
  // roll: a curving ball, pins in its path fall, the board names what went down
  const rnd = prng(5);
  let roll = -1, bx0 = 0, curve = 0, knocked = [], strikes = 0;
  const lines = { strike:'Strike! Every skill down.', some:n => `${n} down. Roll again?`, none:'Gutter ball. It happens.' };
  K.hot({ x:LX, z:z1 + 1.6, label:'Roll a ball', obj:ball, use(){ if(roll >= 0) return; roll = 0; bx0 = LX + (rnd() - 0.5)*0.9; curve = (rnd() - 0.5)*0.8; knocked = []; K.tone(110, 0.8, 'triangle', 0.06, 80); } });
  K.hot({ x:cx + 0.2, z:3.6, label:'Bowl on the island lane', padColor:'#e98a5a', use(){ ctx.modules.games?.start?.('bowling'); } });
  K.sign(scene, 'Island lane', cx + 0.2, 1.4, 3.3, { w:1.6, h:0.36, bg:'#e98a5a', fg:'#ffffff' });
  K.tick((dt, t) => {
    if(roll >= 0){
      roll += dt;
      const k = Math.min(1, roll/1.5), z = (z1 + 0.6) + (z0 + 0.9 - (z1 + 0.6))*k, x = bx0 + curve*k*k;
      if(roll < 1.6){ ball.position.set(x, 0.3, z); ball.rotation.x -= dt*18; }
      // contact: pins close to the ball's line fall, and knock the ones behind them
      if(k > 0.85 && !knocked.length && roll < 1.7){
        const hit = pins.map((p, i) => ({ p, i, d:Math.abs(p.home.x - x) })).filter(o => o.d < 0.42 + rnd()*0.12);
        const set = new Set(hit.map(o => o.i));
        for(let pass=0;pass<2;pass++) pins.forEach((p, i) => { if(set.has(i)) return; for(const j of set){ const q = pins[j]; if(p.home.z < q.home.z && Math.abs(p.home.x - q.home.x) < 0.4 && rnd() < 0.65){ set.add(i); break; } } });
        knocked = [...set].map(i => PINS.indexOf(pins[i].name));
        set.forEach(i => { const p = pins[i]; p.down = 1; p.fall = 0; p.dir = Math.atan2(p.home.x - x, -1) + (rnd() - 0.5); });
        if(!knocked.length) knocked = [-1];
        const n = set.size; board.redraw(knocked, n === 10 ? 'STRIKE!' : n ? `${n} DOWN` : 'GUTTER');
        if(n){ K.sfx('thud', 3); for(let i=0;i<Math.min(5, n);i++) setTimeout(() => K.sfx('clink', 2), 40 + i*50); }
        if(n === 10) strikes++;
        K.say(pins[0].g, n === 10 ? lines.strike : n ? lines.some(n) : lines.none, { pitch:560, y:1.6 });
      }
      if(roll > 1.6) ball.position.set(LX - 1.8, 0.66, z1 + 1.1);
      if(roll > 4.2){
        roll = -1; pins.forEach(p => { p.down = 0; p.fall = 0; p.g.position.copy(p.home); p.g.rotation.set(0, 0, 0); });
        ball.position.set(LX, 0.3, z1 + 0.6); board.redraw([], 'SKILLS ALLEY');
      }
    }
    for(const p of pins){
      if(!p.down) continue;
      p.fall = Math.min(1, p.fall + dt*4);
      p.g.rotation.set(-Math.cos(p.dir)*p.fall*1.5, 0, -Math.sin(p.dir)*p.fall*1.5);
      p.g.position.set(p.home.x + Math.sin(p.dir)*p.fall*0.35, 0.08, p.home.z - Math.cos(p.dir)*p.fall*0.1 - p.fall*0.25);
    }
  });
  K.stop('Bowling hall', 'A vaulted hall with one lane. Each pin is a language or tool: Python, TypeScript, JavaScript, Kotlin, Java, SQL, React, Node, Supabase and PostgreSQL. Roll a ball and the board shows which ones went down.', [LX, 3.0, z0 + 1.6]);
}

function workshop(K, r){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // the pegboard: a shadow board with an outline and a name under every tool
  const cols = 6, PW = 9.2, PH = 2.9, px0 = cx - PW/2, py0 = 0.95;
  const slot = i => ({ x: px0 + PW*(0.5 + (i%cols))/cols, y: py0 + PH*(i < cols ? 0.72 : 0.28) });
  const peg = K.panel(scene, cx, py0 + PH/2, -D/2 + 0.1, PW, PH, (g, w, h, lit = -1) => {
    g.fillStyle = '#c9a477'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a8845a'; for(let i=0;i<w;i+=22) for(let j=0;j<h;j+=22){ g.beginPath(); g.arc(i + 11, j + 11, 3, 0, 7); g.fill(); }
    TOOLS.forEach((name, i) => {
      const s = slot(i), x = (s.x - px0)/PW*w, y = h - (s.y - py0)/PH*h;
      g.fillStyle = i === lit ? '#ffd166' : '#00000030'; K.H.rr(g, x - 42, y - 44, 84, 76, 14); g.fill();
      g.fillStyle = '#1f2a44'; g.textAlign = 'center'; K.H.F(g, 700, name.length > 10 ? 13 : 16); g.fillText(name, x, y + 52);
    });
  }, { frame:'#4a3a33', px:100 });
  // twelve tools, each a few simple shapes
  const makers = [
    g => { H.box(0.08, 0.55, 0.06, '#8a6440', 0, -0.05, 0, g); H.box(0.34, 0.12, 0.12, '#8a95a8', 0, 0.26, 0, g); },                     // hammer
    g => { H.box(0.08, 0.6, 0.04, '#8a95a8', 0, 0, 0, g); H.cyl(0.1, 0.1, 0.05, '#8a95a8', 0, 0.3, 0, g, 6).rotation.x = Math.PI/2; },     // wrench
    g => { H.cyl(0.05, 0.06, 0.26, '#e98a5a', 0, -0.15, 0, g, 10); H.cyl(0.015, 0.015, 0.34, '#8a95a8', 0, 0.15, 0, g, 6); },            // screwdriver
    g => { H.box(0.36, 0.5, 0.02, '#c9ced8', 0, 0.05, 0, g); H.box(0.14, 0.18, 0.06, '#e98a5a', 0, -0.26, 0, g); },                       // saw
    g => { for(const s of [-1, 1]){ const a = H.box(0.05, 0.5, 0.04, '#d9534f', s*0.05, 0, 0, g); a.rotation.z = s*0.12; } },             // pliers
    g => { H.box(0.34, 0.18, 0.14, '#f2b705', 0, 0.12, 0, g); H.box(0.1, 0.3, 0.12, '#1f2a44', -0.05, -0.1, 0, g); H.cyl(0.02, 0.02, 0.16, '#8a95a8', 0.24, 0.12, 0, g, 6).rotation.z = Math.PI/2; }, // drill
    g => { H.box(0.55, 0.1, 0.06, '#6fae4a', 0, 0, 0, g); H.box(0.1, 0.05, 0.07, '#9bf6ff', 0, 0, 0.01, g); },                              // level
    g => { H.cyl(0.14, 0.14, 0.08, '#f2b705', 0, 0, 0, g, 16).rotation.x = Math.PI/2; },                                                    // tape
    g => { H.box(0.07, 0.5, 0.06, '#8a6440', 0, -0.05, 0, g); H.cyl(0.1, 0.1, 0.3, '#1f2a44', 0, 0.24, 0, g, 12).rotation.z = Math.PI/2; }, // mallet
    g => { H.box(0.06, 0.45, 0.05, '#4fa3c7', -0.12, 0, 0, g); H.box(0.3, 0.06, 0.05, '#4fa3c7', 0, 0.2, 0, g); H.box(0.3, 0.06, 0.05, '#4fa3c7', 0, -0.2, 0, g); }, // clamp
    g => { H.box(0.06, 0.34, 0.04, '#8a6440', 0, -0.1, 0, g); H.box(0.22, 0.16, 0.06, '#1f2a44', 0, 0.16, 0, g); },                         // brush
    g => { H.box(0.06, 0.5, 0.03, '#c9ced8', -0.14, 0, 0, g); H.box(0.34, 0.06, 0.03, '#c9ced8', 0, -0.22, 0, g); },                        // square
  ];
  const tools = TOOLS.map((name, i) => {
    const s = slot(i), g = new THREE.Group(); makers[i](g);
    g.position.set(s.x, s.y + 0.05, -D/2 + 0.25); scene.add(g);
    return { g, name, home:g.position.clone() };
  });
  // workbench with a vise and a display that names the tool in hand
  K.box(4.2, 0.12, 1.2, '#b98a5a', cx - 0.4, 1.0, -2.2);
  for(const [ox, oz] of [[-1.95,-0.5],[1.95,-0.5],[-1.95,0.5],[1.95,0.5]]) K.box(0.12, 1.0, 0.12, '#4a3a33', cx - 0.4 + ox, 0.5, -2.2 + oz);
  K.box(4, 0.08, 1.0, '#8a6440', cx - 0.4, 0.3, -2.2);
  K.box(0.4, 0.25, 0.3, '#3d4a5c', cx + 1.2, 1.18, -2.2);
  K.solid(cx - 0.4, -2.2, 2.15, 0.65);
  const disp = K.panel(scene, cx - 1.8, 1.55, -2.55, 1.6, 0.7, (g, w, h, name = '', n = 0) => {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h); g.textAlign = 'center';
    g.fillStyle = '#9aa6d6'; K.H.F(g, 700, 11); g.fillText(name ? 'IN HAND' : 'PICK A TOOL', w/2, 18);
    if(name){ g.fillStyle = '#ffd166'; let fs = 30; K.H.F(g, 700, fs); while(g.measureText(name).width > w - 16){ fs--; K.H.F(g, 700, fs); } g.fillText(name, w/2, h*0.68); g.fillStyle = '#9aa6d6'; K.H.F(g, 600, 10); g.fillText(`${n} of ${TOOLS.length}`, w/2, h - 6); }
  }, { frame:'#3d4a5c' });
  // a red tool chest and a work light
  K.box(1.2, 1.1, 0.6, '#d9534f', cx + 4.8, 0.55, -D/2 + 1.2); for(let i=0;i<4;i++) K.box(1.1, 0.03, 0.02, '#8a2a28', cx + 4.8, 0.25 + i*0.25, -D/2 + 1.51);
  K.solid(cx + 4.8, -D/2 + 1.2, 0.6, 0.3);
  K.lamp('#ffe2b0', cx - 0.4, 2.6, -1.4, 4, 6);
  let cur = -1, fly = null;
  const hold = new THREE.Vector3(cx + 0.2, 1.55, -2.2);
  K.hot({ x:cx - 0.4, z:-0.6, label:'Take down a tool', obj:peg, use(){
    const prev = cur; cur = (cur + 1) % tools.length;
    fly = { t:0, back:prev >= 0 ? tools[prev] : null, out:tools[cur] };
    peg.redraw(cur); disp.redraw(TOOLS[cur], cur + 1); K.tone(520 + cur*30, 0.12, 'triangle', 0.08);
  } });
  K.tick((dt, t) => {
    if(fly){
      fly.t = Math.min(1, fly.t + dt*1.8); const k = fly.t;
      if(fly.back){ fly.back.g.position.lerpVectors(hold, fly.back.home, k); fly.back.g.position.y += Math.sin(k*Math.PI)*0.8; fly.back.g.rotation.set(0, (1 - k)*6, 0); }
      fly.out.g.position.lerpVectors(fly.out.home, hold, k); fly.out.g.position.y += Math.sin(k*Math.PI)*0.9;
      if(k >= 1) fly = null;
    }
    if(cur >= 0 && !fly){ const g = tools[cur].g; g.rotation.y = t*1.4; g.position.y = hold.y + Math.sin(t*2)*0.05; }
  });
  K.stop('The workshop', 'A sawtooth roof lets daylight in over a pegboard wall. Every tool is a framework or service: React, Vite, Tailwind, Node, Supabase, PostgreSQL, Firebase, MongoDB, NumPy, Apps Script, Git and GitHub Actions. Take one down and it comes to the bench.', [cx - 0.4, 3.0, -2.2]);
}

function bench(K, r){
  const { THREE, H, D, scene, S } = K, cx = r.cx, cz = r.cz;
  // three screens in an arc: spec, agent, live run
  const labels = ['SPEC', 'AGENT', 'LIVE RUN'];
  const screens = labels.map((lab, i) => {
    const a = -Math.PI/2 + (i - 1)*0.62, rr = 3.2, x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr;
    K.box(1.9, 0.9, 0.7, '#1f2a4d', x, 0.45, z).rotation.y = -(a + Math.PI/2);
    K.solid(x, z, 0.95, 0.35, -(a + Math.PI/2));
    return K.panel(scene, x - Math.cos(a)*0.1, 1.75, z - Math.sin(a)*0.1, 1.7, 1.15, (g, w, h, st = {}) => draw(g, w, h, i, st), { frame:'#9bd3e6', rotY:-(a + Math.PI/2) });
  });
  function draw(g, w, h, i, st){
    g.fillStyle = '#0c1226'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9bd3e6'; K.H.F(g, 700, 13); g.textAlign = 'left'; g.fillText(labels[i], 8, 16);
    K.H.F(g, 600, 11, 'monospace');
    const p = st.p || 0;
    if(i === 0){
      const L = ['what done looks like:', '  [ ] page loads', '  [ ] entry saves', '  [ ] matches the spec'];
      L.forEach((l, k) => { if(p > k*0.2){ g.fillStyle = k ? '#e8f6fb' : '#ffd166'; g.fillText(l, 8, 36 + k*16); } });
    } else if(i === 1){
      g.fillStyle = '#cdb4db'; g.fillText('Claude + Gemini APIs', 8, 34);
      const L = ['draft change', 'write code', st.fix ? 'fix: save handler' : 'hand to live run'];
      L.forEach((l, k) => { if(p > 0.2 + k*0.2){ g.fillStyle = st.fix && k === 2 ? '#ff8fab' : '#e8f6fb'; g.fillText('> ' + l, 8, 54 + k*16); } });
      if(p > 0 && p < 1){ g.fillStyle = '#5ff0e0'; g.fillRect(8 + ((p*400)|0)%(w - 30), h - 14, 14, 4); }
    } else {
      const rows = ['page loads', 'entry saves', 'matches spec'];
      rows.forEach((l, k) => {
        if(!(st.run > k*0.3)) return;
        const ok = st.pass || k !== 1;
        g.fillStyle = ok ? '#6fae4a' : '#d9534f'; g.beginPath(); g.arc(16, 32 + k*20, 6, 0, 7); g.fill();
        g.fillStyle = '#e8f6fb'; g.fillText(l + (ok ? '  ok' : '  failed'), 28, 36 + k*20);
      });
      if(st.pass && st.run > 1){ g.fillStyle = '#6fae4a'; K.H.F(g, 700, 12); g.fillText('Verified on a live run', 8, h - 10); }
    }
  }
  screens.forEach(s => s.redraw({}));
  // a helper robot with a voice
  const bot = new THREE.Group(); bot.position.set(cx, 0, cz + 0.2); scene.add(bot);
  H.box(0.7, 0.6, 0.5, '#c9ced8', 0, 0.55, 0, bot); const head = new THREE.Group(); head.position.y = 1.05; bot.add(head);
  H.box(0.6, 0.45, 0.45, '#e8ecf2', 0, 0, 0, head); K.eyes(head, 0.02, 0.23, 0.13, 0.06);
  H.cyl(0.02, 0.02, 0.25, '#8a95a8', 0, 0.35, 0, head, 6); const tip = H.ball(0.06, '#9bf6ff', 0, 0.5, 0, head, 10);
  K.round(cx, cz + 0.2, 0.5);
  let run = -1;
  const say = ['Spec first: what does done look like?', 'Drafting with the Claude and Gemini APIs.', 'Live run says the save failed. Fixing.', 'Rerun passes. Now it is done.'];
  K.hot({ x:cx, z:cz + 1.9, label:'Run the check', obj:bot, use(){ if(run >= 0 && run < 9) return; run = 0; K.say(head, say[0], { pitch:760, y:0.9 }); } });
  K.tick((dt, t, p, n) => {
    head.rotation.y = Math.sin(t*0.9)*0.3; bot.position.y = Math.abs(Math.sin(t*2.4))*0.04;
    if(run < 0) return;
    const prev = run; run += dt;
    const cross = s => prev < s && run >= s;
    if(cross(1.6)) K.say(head, say[1], { pitch:760, y:0.9 });
    if(cross(4.2)){ K.say(head, say[2], { pitch:700, y:0.9 }); K.tone(220, 0.25, 'square', 0.05); }
    if(cross(7.0)){ K.say(head, say[3], { pitch:820, y:0.9 }); K.tone(660, 0.15, 'sine', 0.08); setTimeout(() => K.tone(990, 0.2, 'sine', 0.08), 140); }
    if(n % 3 === 0){
      screens[0].redraw({ p:Math.min(1, run/1.4) });
      screens[1].redraw({ p:Math.min(1, Math.max(0, (run - 1.4)/1.8)), fix:run > 4.8 });
      screens[2].redraw({ run:run < 5.2 ? Math.max(0, run - 3.2) : Math.max(0, run - 6.2), pass:run > 6.2 });
    }
    if(run > 11) run = -1;
  });
  K.stop('The AI bench', 'Agentic coding here always ends the same way: write the spec, let the agent draft with the Claude and Gemini APIs, then check the output against a live run. Press E and watch a failed check get fixed and pass.', [cx, 3.0, cz]);
}
