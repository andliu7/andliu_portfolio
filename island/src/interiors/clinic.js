// Interior for "clinic": reception, a round operatory under a domed skylight, and a split-level study.
//
// This file also carries tour(), the architecture kit the interiors-b buildings share (clinic,
// chapel, skills, yard, now, contact). It lives here because those six files are the only ones
// this builder owns; the other five import it from './clinic.js'.
//
// tour() lays rooms left to right along x, joined by framed doorways with a plaque naming the
// rooms on each side. Each room picks a plan (rect, round, oct) and a roof idea (vault, truss,
// dome, glass, sawtooth, skylight, coffer, open), drawn cut-away so the high camera sees in.
// Static geometry goes in K.S and is merged by material at the end (few draw calls); anything
// that moves goes in K.scene. Light is mostly faked: glowing beams and floor pools, one shadowed
// key light, and at most a couple of real point lights per building.
// Split levels: K.level() makes a raised platform with steps; the walker is lifted onto it.
// Every room adds tour stops with K.stop(); they come back as room.tour for the tour module.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// small seeded random for decoration (never ctx.helpers.rng, which would shift the island)
export function prng(seed){ let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }

export function wrap(g, text, x, y, maxW, lh){
  const words = String(text).split(' '); let line = '';
  for(const w of words){ const t = line ? line + ' ' + w : w; if(g.measureText(t).width > maxW && line){ g.fillText(line, x, y); y += lh; line = w; } else line = t; }
  if(line) g.fillText(line, x, y);
  return y;
}

export function tour(ctx, zone, spec){
  const { THREE, helpers:H } = ctx;
  const D = spec.depth || 12, T = 0.35, WALL = spec.wall || 3.4, DOOR = 2.4, DZ = 0;
  const accent = spec.accent || zone.color, dark = spec.dark || '#6b4a33';
  const scene = new THREE.Scene();
  const S = new THREE.Group(); scene.add(S);           // static: merged at the end
  const colliders = [], ticks = [], hotspots = [], stops = [], levels = [];
  const rand = prng(spec.seed || 11);

  // ---- backdrop: a soft vertical gradient, so the space above the walls reads as dusk, not a void
  const bgT = H.canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, spec.bgTop || '#3a2f45'); gr.addColorStop(1, spec.bg || '#1f1a24'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  scene.background = bgT.tex;

  let totalW = 0; spec.rooms.forEach(r => totalW += r.w);
  scene.add(new THREE.HemisphereLight(spec.hemiSky || '#fff1dc', spec.hemiGround || '#6e5a48', spec.hemi ?? 1.25));
  const key = new THREE.DirectionalLight(spec.sunColor || '#fff0d8', spec.sun ?? 1.45);
  key.position.set(-7, 18, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 1024); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left:-totalW/2 - 2, right:totalW/2 + 2, top:11, bottom:-11, near:1, far:50 });
  scene.add(key, key.target);

  const M = (c, o) => H.mat(c, o);
  const sbox = (w, h, d, c, x, y, z, p = S) => H.box(w, h, d, c, x, y, z, p);
  const scyl = (a, b, h, c, x, y, z, p = S, s = 16) => H.cyl(a, b, h, c, x, y, z, p, s);

  // ---- textures
  function floorTex(kind, a, b){
    const t = H.canvasTex(256, 256, g => {
      g.fillStyle = a; g.fillRect(0, 0, 256, 256); g.fillStyle = b; g.strokeStyle = b;
      if(kind === 'checker'){ for(let i=0;i<4;i++) for(let j=0;j<4;j++) if((i+j)%2) g.fillRect(i*64, j*64, 64, 64); }
      else if(kind === 'tiles'){ g.lineWidth = 4; for(let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*64, 0); g.lineTo(i*64, 256); g.moveTo(0, i*64); g.lineTo(256, i*64); g.stroke(); } }
      else if(kind === 'herring'){ g.lineWidth = 3; for(let i=-8;i<16;i++) for(let j=0;j<8;j++){ const x0 = i*32, y0 = j*32; g.beginPath(); g.moveTo(x0 + (j%2 ? 0 : 32), y0); g.lineTo(x0 + (j%2 ? 32 : 0), y0 + 32); g.stroke(); } }
      else if(kind === 'rubber'){ for(let i=0;i<64;i++){ g.globalAlpha = 0.25; g.fillRect((i*53)%256, (i*97)%256, 3, 3); } g.globalAlpha = 1; g.lineWidth = 3; for(let i=0;i<=2;i++){ g.beginPath(); g.moveTo(i*128, 0); g.lineTo(i*128, 256); g.moveTo(0, i*128); g.lineTo(256, i*128); g.stroke(); } }
      else if(kind === 'terrazzo'){ for(let i=0;i<90;i++){ g.globalAlpha = 0.5; g.beginPath(); g.arc((i*71)%256, (i*113)%256, 2 + (i%3), 0, 7); g.fill(); } g.globalAlpha = 1; }
      else if(kind === 'concrete'){ g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); for(let i=0;i<40;i++) g.fillRect((i*89)%256, (i*37)%256, 2, 2); g.globalAlpha = 1; }
      else if(kind === 'grass'){ for(let i=0;i<260;i++){ g.globalAlpha = 0.4; g.fillRect((i*83)%256, (i*151)%256, 2, 6); } g.globalAlpha = 1; }
      else { g.lineWidth = 3; for(let i=0;i<=8;i++){ g.beginPath(); g.moveTo(0, i*32); g.lineTo(256, i*32); g.stroke(); const o = (i*97)%256; g.beginPath(); g.moveTo(o, i*32); g.lineTo(o, i*32+32); g.stroke(); } }
    });
    t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; return t.tex;
  }
  function wallTex(a, b, kind){
    const t = H.canvasTex(128, 128, g => {
      g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; g.strokeStyle = b;
      if(kind === 'dots'){ for(let i=0;i<4;i++) for(let j=0;j<4;j++){ g.beginPath(); g.arc(16 + i*32 + (j%2)*16, 16 + j*32, 4, 0, 7); g.fill(); } }
      else if(kind === 'boards'){ g.lineWidth = 3; for(let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*32, 0); g.lineTo(i*32, 128); g.stroke(); } }
      else if(kind === 'brick'){ g.lineWidth = 3; for(let j=0;j<8;j++){ g.beginPath(); g.moveTo(0, j*16); g.lineTo(128, j*16); g.stroke(); for(let i=0;i<4;i++){ const x0 = i*32 + (j%2)*16; g.beginPath(); g.moveTo(x0, j*16); g.lineTo(x0, j*16 + 16); g.stroke(); } } }
      else if(kind === 'stripes'){ for(let i=0;i<4;i++) g.fillRect(i*32, 0, 12, 128); }
    });
    t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; return t.tex;
  }
  // painted views for windows: sky, sea, garden, hills, town, dusk
  const views = new Map();
  function view(kind = 'sky'){
    if(views.has(kind)) return views.get(kind);
    const t = H.canvasTex(256, 256, (g, w, h) => {
      const pal = { sky:['#8fd3ff','#e8f6ff'], sea:['#7cc8f2','#f4f9ff'], garden:['#9bd8ff','#f2fbff'], hills:['#8ec9f5','#fff3dc'], town:['#a6c8ef','#ffe9cf'], dusk:['#f7a86b','#ffe0a8'] }[kind] || ['#8fd3ff','#e8f6ff'];
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffffcc'; for(const [cx, cy, s] of [[60, 50, 1], [180, 80, 0.8]]){ g.beginPath(); g.ellipse(cx, cy, 34*s, 12*s, 0, 0, 7); g.ellipse(cx + 20*s, cy - 8*s, 20*s, 12*s, 0, 0, 7); g.fill(); }
      if(kind === 'sea'){ g.fillStyle = '#3d9ad1'; g.fillRect(0, h*0.62, w, h); g.fillStyle = '#6fbf73'; g.beginPath(); g.ellipse(w*0.72, h*0.63, 70, 22, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ffffff88'; for(let i=0;i<6;i++) g.fillRect(20 + i*40, h*0.72 + (i%2)*16, 22, 3); }
      else if(kind === 'garden' || kind === 'hills'){ g.fillStyle = '#8cc56a'; g.beginPath(); g.ellipse(w*0.3, h*0.8, 190, 70, 0, Math.PI, 0); g.fill(); g.fillStyle = '#6fae4a'; g.beginPath(); g.ellipse(w*0.85, h*0.85, 170, 70, 0, Math.PI, 0); g.fill(); g.fillStyle = '#4f8f3a'; for(const [x, r] of [[40, 22], [90, 30], [200, 26], [235, 18]]){ g.beginPath(); g.arc(x, h*0.62, r, 0, 7); g.fill(); g.fillRect(x - 3, h*0.62, 6, 30); } if(kind === 'garden'){ for(let i=0;i<14;i++){ g.fillStyle = ['#ff8fab','#ffd166','#ffffff'][i%3]; g.beginPath(); g.arc(12 + i*18, h*0.9 - (i%3)*6, 4, 0, 7); g.fill(); } } }
      else if(kind === 'town'){ g.fillStyle = '#d9b48a'; for(let i=0;i<7;i++){ const x0 = i*40 - 6, hh = 50 + (i*37)%50; g.fillRect(x0, h - hh, 34, hh); g.fillStyle = '#c96f4f'; g.beginPath(); g.moveTo(x0 - 3, h - hh); g.lineTo(x0 + 17, h - hh - 18); g.lineTo(x0 + 37, h - hh); g.fill(); g.fillStyle = '#d9b48a'; } }
      else if(kind === 'dusk'){ g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(w*0.5, h*0.7, 34, 0, 7); g.fill(); g.fillStyle = '#7a5a8a'; g.beginPath(); g.ellipse(w*0.5, h, 220, 70, 0, Math.PI, 0); g.fill(); }
    });
    const m = new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false });
    views.set(kind, m); return m;
  }
  // gradient textures for fake light
  const beamTex = H.canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#ffffff55'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }).tex;
  const poolTex = H.canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#ffffffff'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }).tex;
  const addMat = (color, opacity, map) => new THREE.MeshBasicMaterial({ color, map, transparent:true, opacity, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, toneMapped:false });
  // a shaft of light from (x1,y1,z1) at the window down to (x2,y2,z2) on the floor
  function beam(x1, y1, z1, x2, y2, z2, r1 = 0.6, r2 = 1.1, color = '#fff1c8', opacity = 0.22){
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), L = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, L, 20, 1, true), addMat(color, opacity, beamTex));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
    m.renderOrder = 5; scene.add(m);
    pool(x2, z2, r2*2.4, r2*2.0, color, opacity*1.4, y2 + 0.02);
    return m;
  }
  function pool(x, z, w, d, color = '#ffd9a0', opacity = 0.2, y = 0.025){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), addMat(color, opacity, poolTex));
    m.rotation.x = -Math.PI/2; m.position.set(x, y, z); m.renderOrder = 4; scene.add(m); return m;
  }
  function normUV(geo){
    geo.computeBoundingBox(); const b = geo.boundingBox, uv = geo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i, (uv.getX(i) - b.min.x)/(b.max.x - b.min.x), (uv.getY(i) - b.min.y)/(b.max.y - b.min.y));
    return geo;
  }
  function outline(shape, w, h){
    const s = new THREE.Shape();
    if(shape === 'arch' || shape === 'lancet'){
      const r = w/2, top = h/2 - (shape === 'lancet' ? w*0.8 : r);
      s.moveTo(-r, -h/2); s.lineTo(r, -h/2); s.lineTo(r, top);
      if(shape === 'lancet') s.quadraticCurveTo(r, h/2 - w*0.25, 0, h/2), s.quadraticCurveTo(-r, h/2 - w*0.25, -r, top);
      else s.absarc(0, top, r, 0, Math.PI, false);
      s.lineTo(-r, -h/2);
    } else if(shape === 'round'){ s.absarc(0, 0, w/2, 0, Math.PI*2, false); }
    else { s.moveTo(-w/2, -h/2); s.lineTo(w/2, -h/2); s.lineTo(w/2, h/2); s.lineTo(-w/2, h/2); s.lineTo(-w/2, -h/2); }
    return s;
  }
  // a framed window with a painted view, mullions and an optional shaft of light
  function win(x, y, z, rotY, w, h, { shape = 'rect', kind = 'sky', frame = '#fffaf0', cols = 1, rows = 1, beamTo = null, beamR = [0.5, 1.0], beamColor, beamOpacity } = {}){
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; S.add(g);
    const fr = new THREE.Mesh(new THREE.ShapeGeometry(outline(shape, w + 0.3, h + 0.3), 24), M(frame)); fr.position.z = 0.01; g.add(fr);
    const pane = new THREE.Mesh(normUV(new THREE.ShapeGeometry(outline(shape, w, h), 24)), view(kind)); pane.position.z = 0.03; g.add(pane);
    for(let i=1;i<cols;i++) sbox(0.06, h, 0.04, frame, -w/2 + i*w/cols, 0, 0.05, g);
    for(let j=1;j<rows;j++) sbox(w, 0.06, 0.04, frame, 0, -h/2 + j*h/rows, 0.05, g);
    sbox(w + 0.5, 0.1, 0.24, frame, 0, -h/2 - 0.18, 0.1, g);   // sill
    if(beamTo){ g.updateMatrixWorld(true); const c = new THREE.Vector3(0, 0, 0.1).applyMatrix4(g.matrixWorld); beam(c.x, c.y, c.z, beamTo[0], 0, beamTo[1], beamR[0], beamR[1], beamColor, beamOpacity); }
    return g;
  }
  // pendant lamp: cord, shade, glowing bulb and a soft pool on the floor (no real light)
  function pendant(x, y, z, shade = accent, glow = '#ffe2a8', { drop = 1.2, r = 0.36, poolR = 2.4, floorY = 0 } = {}){
    scyl(0.012, 0.012, drop, '#1f2a44', x, y - drop/2 + 0.05, z, S, 4).castShadow = false;
    const sh = H.mesh(new THREE.ConeGeometry(r, r*0.8, 18, 1, true), shade, x, y - drop - r*0.3, z, S, { side:THREE.DoubleSide }); sh.castShadow = false;
    H.mesh(new THREE.SphereGeometry(r*0.36, 12, 8), new THREE.MeshBasicMaterial({ color:glow, toneMapped:false }), x, y - drop - r*0.55, z, S).castShadow = false;
    pool(x, z, poolR*2, poolR*2, glow, 0.16, floorY + 0.025);
  }
  // a built-in bookcase: carcass, shelves and books
  function bookcase(x, y, z, w, h, rotY = 0, { d = 0.45, color = '#8a6440', rows = 4, books = ['#4fa3c7','#e98a5a','#6fae4a','#c9a24a','#d6689a','#3b4f9e','#f2b705'] } = {}){
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; S.add(g);
    sbox(w, h, 0.06, color, 0, h/2, -d/2 + 0.03, g);
    for(const s of [-1, 1]) sbox(0.08, h, d, color, s*(w/2 - 0.04), h/2, 0, g);
    const rh = h/rows;
    for(let j=0;j<=rows;j++) sbox(w, 0.06, d, color, 0, j*rh, 0, g);
    for(let j=0;j<rows;j++){
      let bx = -w/2 + 0.12;
      while(bx < w/2 - 0.2){
        const bw = 0.07 + rand()*0.07, bh = rh*(0.55 + rand()*0.3);
        if(rand() < 0.1){ bx += 0.15; continue; }
        const b = sbox(bw, bh, d*0.7, books[(rand()*books.length)|0], bx + bw/2, j*rh + 0.03 + bh/2, 0.02, g); b.castShadow = false;
        bx += bw + 0.01;
      }
    }
    return g;
  }

  // a mezzanine along the back wall on posts, with a rail and a straight stair at one end.
  // The space under it is closed off (a collider along its front), so builders fill it with shelving.
  function mezz(r, { depth = 2.4, y = 2.8, color = dark, deck = '#b98a5a', stair = 'right', stairW = 1.0 } = {}){
    const z0 = -D/2, z1 = -D/2 + depth, w = r.w - 0.05;
    sbox(w, 0.22, depth, deck, r.cx, y - 0.11, (z0 + z1)/2);
    sbox(w, 0.3, 0.16, color, r.cx, y - 0.15, z1);
    const nP = Math.max(1, Math.round((r.w - 0.8)/3));
    for(let k=0;k<=nP;k++) scyl(0.09, 0.09, y - 0.2, color, r.xa + 0.4 + k*(r.w - 0.8)/nP, (y - 0.2)/2, z1 - 0.12, S, 10);
    sbox(w, 0.07, 0.07, color, r.cx, y + 0.95, z1);
    for(let xx = r.xa + 0.2; xx < r.xb - 0.1; xx += 0.35) sbox(0.04, 0.95, 0.04, color, xx, y + 0.47, z1).castShadow = false;
    colliders.push({ kind:'box', x:r.cx, z:(z0 + z1)/2, ang:0, hw:w/2, hd:depth/2 });
    const n = Math.round(y/0.21), run = 0.27, L = n*run, dir = stair === 'right' ? 1 : -1, x0 = stair === 'right' ? r.xb - 0.25 - L : r.xa + 0.25 + L;
    const zs = z1 + stairW/2 + 0.08;
    for(let k=0;k<n;k++){ const hh = (k + 1)*y/n; sbox(run, hh, stairW, deck, x0 + dir*(k + 0.5)*run, hh/2, zs); }
    for(let k=0;k<n;k+=2){ const hh = (k + 1)*y/n; sbox(0.04, 0.9, 0.04, color, x0 + dir*(k + 0.5)*run, hh + 0.45, zs + stairW/2).castShadow = false; }
    const rl = sbox(Math.hypot(L, y), 0.06, 0.06, color, x0 + dir*L/2, y/2 + 0.95, zs + stairW/2); rl.rotation.z = dir*Math.atan2(y, L);
    colliders.push({ kind:'box', x:x0 + dir*L/2, z:zs, ang:0, hw:L/2, hd:stairW/2 });
    return { y, z0, z1, depth };
  }

  // ---- text on planes
  function sign(parent, text, x, y, z, { w = 3.2, h = 0.8, bg = '#fffaf0', fg = '#1f2a44', sub = null, rotY = 0, size = 0 } = {}){
    const px = 160, cw = Math.round(w*px), ch = Math.round(h*px);
    const t = H.canvasTex(cw, ch, g => {
      g.fillStyle = bg; H.rr(g, 4, 4, cw - 8, ch - 8, Math.min(40, ch/3)); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#00000022'; g.stroke();
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = size || Math.round(ch*(sub ? 0.4 : 0.52));
      H.F(g, 700, fs); while(g.measureText(text).width > cw - 40 && fs > 10){ fs = Math.floor(fs*0.92); H.F(g, 700, fs); }
      g.fillText(text, cw/2, sub ? ch*0.38 : ch/2 + 2);
      if(sub){ g.globalAlpha = 0.8; let ss = Math.round(ch*0.2); H.F(g, 600, ss, 'Nunito'); while(g.measureText(sub).width > cw - 30 && ss > 9){ ss--; H.F(g, 600, ss, 'Nunito'); } g.fillText(sub, cw/2, ch*0.74); }
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, toneMapped:false }));
    m.position.set(x, y, z); m.rotation.y = rotY; parent.add(m);
    return m;
  }
  // a framed canvas panel: draw(g, w, h, ...args); .redraw(...args) repaints it
  function panel(parent, x, y, z, w, h, draw, { rotY = 0, frame = dark, px = 110 } = {}){
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = rotY; parent.add(grp);
    if(frame) H.box(w + 0.16, h + 0.16, 0.08, frame, 0, 0, -0.03, grp).castShadow = false;
    const t = H.canvasTex(Math.round(w*px), Math.round(h*px), draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false }));
    m.position.z = 0.02; grp.add(m);
    grp.redraw = (...args) => { t.g.clearRect(0, 0, t.w, t.h); t.draw(t.g, t.w, t.h, ...args); t.tex.needsUpdate = true; };
    grp.screen = m;
    return grp;
  }

  // ---- rooms
  const rooms = [];
  let x = -totalW/2, exitGroup = null;
  const trimOf = rs => rs.dark || dark;
  spec.rooms.forEach((rs, i) => {
    const r = { i, key:rs.key, name:rs.name, w:rs.w, xa:x, xb:x + rs.w, cx:x + rs.w/2, cz:0, H:rs.tall || WALL, shape:rs.shape || 'rect', spec:rs };
    x += rs.w; rooms.push(r);
    const round = r.shape !== 'rect';
    r.N = r.shape === 'oct' ? 8 : 14;
    r.R = round ? Math.min(rs.w, D)/2 - 0.35 : 0;
    const fmat = new THREE.MeshStandardMaterial({ map:floorTex(rs.floorKind || 'planks', rs.floor || '#e8d7b5', rs.floorLine || '#d6c09a'), roughness:.9 });
    if(!round){
      fmat.map.repeat.set(rs.w/3, (D + 0.6)/3);
      const fl = new THREE.Mesh(new THREE.BoxGeometry(rs.w, 0.2, D + 0.6), fmat); fl.position.set(r.cx, -0.1, 0.3); fl.receiveShadow = true; S.add(fl);
    } else {
      sbox(rs.w, 0.2, D + 0.6, rs.poche || trimOf(rs), r.cx, -0.12, 0.3).castShadow = false;
      fmat.map.repeat.set(3, 3);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r.R + 0.2, r.R + 0.2, 0.2, r.N*3), fmat); disc.position.set(r.cx, -0.095, r.cz); disc.receiveShadow = true; S.add(disc);
    }
    // back wall (the cell wall; round rooms stand their own curved wall in front of it)
    const wmat = new THREE.MeshStandardMaterial({ map:wallTex(rs.wall || '#fbf1dc', rs.wall2 || '#f3e3c4', rs.wallKind), roughness:.95 });
    wmat.map.repeat.set(rs.w/2, r.H/2);
    if(rs.glassWall){
      // a glazed back wall: a painted view behind a grid of mullions, over a low knee wall
      const fr = rs.frame || '#fffaf0', knee = 0.6;
      sbox(rs.w, knee, T, trimOf(rs), r.cx, knee/2, -D/2 - T/2);
      const pane = new THREE.Mesh(normUV(new THREE.PlaneGeometry(rs.w, r.H - knee)), view(rs.glassWall)); pane.position.set(r.cx, knee + (r.H - knee)/2, -D/2 - T/2 - 0.02); S.add(pane);
      for(let xx = r.xa + 1.3; xx < r.xb - 0.2; xx += 1.3) sbox(0.08, r.H - knee, 0.12, fr, xx, knee + (r.H - knee)/2, -D/2 - 0.1).castShadow = false;
      for(const yy of [knee + 1.4, knee + 2.8]) if(yy < r.H) sbox(rs.w, 0.07, 0.12, fr, r.cx, yy, -D/2 - 0.1).castShadow = false;
      sbox(rs.w, 0.14, 0.2, fr, r.cx, r.H, -D/2 - 0.1).castShadow = false;
    } else {
      const bw = new THREE.Mesh(new THREE.BoxGeometry(rs.w, round ? WALL : r.H, T), round ? M(rs.poche || trimOf(rs)) : wmat);
      bw.position.set(r.cx, (round ? WALL : r.H)/2, -D/2 - T/2); bw.receiveShadow = true; S.add(bw);
    }
    if(!round && !rs.glassWall){
      sbox(rs.w, 0.9, 0.06, rs.trim || '#e0c9a0', r.cx, 0.45, -D/2 + 0.03).castShadow = false;
      sbox(rs.w, 0.1, 0.12, trimOf(rs), r.cx, 0.92, -D/2 + 0.06).castShadow = false;
      sbox(rs.w, 0.2, 0.3, trimOf(rs), r.cx, r.H + 0.1, -D/2 - T/2).castShadow = false;
    } else {
      const segL = 2*r.R*Math.sin(Math.PI/r.N) + 0.08;
      for(let k=0;k<r.N;k++){
        const am = k*2*Math.PI/r.N, ca = Math.cos(am), sa = Math.sin(am);
        const leftDoor = i > 0 && Math.abs(Math.abs(am - Math.PI)) < 0.01, rightDoor = i < spec.rooms.length - 1 && k === 0;
        if(leftDoor || rightDoor) continue;
        const h = sa < -0.2 ? r.H : (sa < 0.4 ? WALL : 0.7);
        const px = r.cx + ca*(r.R + T/2), pz = r.cz + sa*(r.R + T/2), ang = -(am + Math.PI/2);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(segL, h, T), sa < 0.4 ? wmat : M(trimOf(rs)));
        seg.position.set(px, h/2, pz); seg.rotation.y = ang; seg.castShadow = true; seg.receiveShadow = true; S.add(seg);
        if(sa < 0.4){ const c = sbox(segL + 0.02, 0.16, T + 0.12, trimOf(rs), px, h + 0.08, pz); c.rotation.y = ang; c.castShadow = false; }
        colliders.push({ kind:'box', x:px, z:pz, ang, hw:segL/2, hd:T/2 });
      }
      // wall mass that closes the corners between the curved wall and the doorways
      const half = r.R*Math.sin(Math.PI/r.N) + 0.4;
      for(const [side, has] of [[-1, i > 0], [1, i < spec.rooms.length - 1]]){
        if(!has) continue;
        const x0 = r.cx + side*r.R*Math.cos(Math.PI/r.N) - side*0.2, x1 = side < 0 ? r.xa : r.xb, len = Math.abs(x1 - x0), mx = (x0 + x1)/2;
        for(const zs of [-1, 1]){
          const zc = zs*(DOOR/2 + (half - DOOR/2)/2), hd = (half - DOOR/2)/2;
          sbox(len, zs < 0 ? WALL : 0.7, hd*2, zs < 0 ? (rs.wall || '#fbf1dc') : trimOf(rs), mx, (zs < 0 ? WALL : 0.7)/2, zc);
          colliders.push({ kind:'box', x:mx, z:zc, ang:0, hw:len/2, hd });
        }
      }
    }
    // name sign over the back wall
    if(!rs.noSign){
      const sw = Math.min(rs.w - 1.5, 1.1 + rs.name.length*0.2), sy = (round ? r.H : r.H) + 0.55;
      const sz = round ? r.cz - r.R + 0.05 : -D/2 - T/2 + 0.1;
      for(const sx of [-sw/2 + 0.3, sw/2 - 0.3]) sbox(0.06, 0.4, 0.06, '#1f2a44', r.cx + sx, sy - 0.5, sz).castShadow = false;
      sign(scene, rs.name, r.cx, sy, sz + 0.06, { w:sw, h:0.62, bg:rs.signBg || accent, fg:'#ffffff' });
    }
    // low front wall (the dollhouse cut); the first room keeps a gap for the exit door
    const fz = D/2 + T/2;
    if(i === 0){
      const gap = 2.2, ex = r.cx + (rs.exitX || 0);
      const lw = (ex - gap/2) - r.xa, rw = r.xb - (ex + gap/2);
      if(lw > 0.05){ sbox(lw, 0.7, T, trimOf(rs), r.xa + lw/2, 0.35, fz); colliders.push({ kind:'box', x:r.xa + lw/2, z:fz, ang:0, hw:lw/2, hd:T/2 }); }
      if(rw > 0.05){ sbox(rw, 0.7, T, trimOf(rs), r.xb - rw/2, 0.35, fz); colliders.push({ kind:'box', x:r.xb - rw/2, z:fz, ang:0, hw:rw/2, hd:T/2 }); }
      sbox(2, 0.04, 1.1, accent, ex, 0.02, D/2 - 0.3).castShadow = false;
      for(const sx of [-1.15, 1.15]) sbox(0.24, 2.6, 0.34, dark, ex + sx, 1.3, fz);
      sbox(2.6, 0.3, 0.4, dark, ex, 2.7, fz);
      exitGroup = sign(scene, 'Exit', ex, 3.15, fz + 0.1, { w:1.3, h:0.5, bg:'#1f2a44', fg:'#ffffff' });
      r.exitX = ex;
    } else if(!round){
      sbox(rs.w, 0.7, T, trimOf(rs), r.cx, 0.35, fz);
      colliders.push({ kind:'box', x:r.cx, z:fz, ang:0, hw:rs.w/2, hd:T/2 });
    } else {
      sbox(rs.w, 0.35, T, trimOf(rs), r.cx, 0.175, fz).castShadow = false;
    }
    roof(r, rs);
  });
  // outer end walls
  for(const s of [-1, 1]){
    const wx = s*(totalW/2 + T/2), rs = spec.rooms[s < 0 ? 0 : spec.rooms.length - 1], eh = rooms[s < 0 ? 0 : rooms.length - 1].H;
    sbox(T, eh, D + T, rs.wall || '#fbf1dc', wx, eh/2, 0);
    sbox(T + 0.06, 0.2, D + T, trimOf(rs), wx, eh + 0.1, 0).castShadow = false;
    colliders.push({ kind:'box', x:wx, z:0, ang:0, hw:T/2, hd:D/2 + T });
  }
  colliders.push({ kind:'box', x:0, z:-D/2 - T/2, ang:0, hw:totalW/2 + T, hd:T/2 });
  // shared walls: framed doorway with a plaque naming the rooms either side
  for(let i=0;i<rooms.length-1;i++){
    const a = rooms[i], b = rooms[i+1], wx = a.xb, rs = spec.rooms[i];
    const z1 = DZ - DOOR/2, z2 = DZ + DOOR/2, back = z1 + D/2, front = D/2 - z2, DH = 2.7, WH = Math.max(a.H, b.H);
    sbox(T, WH, back, rs.wall || '#fbf1dc', wx, WH/2, -D/2 + back/2);
    sbox(T + 0.06, 0.2, back, trimOf(rs), wx, WH + 0.1, -D/2 + back/2).castShadow = false;
    sbox(T, 0.7, front, trimOf(rs), wx, 0.35, z2 + front/2);
    sbox(T, WH - DH, DOOR, rs.wall || '#fbf1dc', wx, DH + (WH - DH)/2, DZ);
    for(const zz of [z1, z2]) sbox(T + 0.2, DH, 0.2, accent, wx, DH/2, zz);
    sbox(T + 0.24, 0.24, DOOR + 0.4, accent, wx, DH + 0.1, DZ);
    colliders.push({ kind:'box', x:wx, z:-D/2 + back/2, ang:0, hw:T/2, hd:back/2 });
    colliders.push({ kind:'box', x:wx, z:z2 + front/2, ang:0, hw:T/2, hd:front/2 });
    doorPlaque(a.name, b.name, wx, DH + 0.75, z2 + 0.35);
    sbox(1.4, 0.03, DOOR - 0.3, '#fffaf0', wx, 0.015, DZ).castShadow = false;
    pool(wx, DZ, 3, 3.4, '#ffe2a8', 0.18);
  }
  // hanging plaque over a doorway, facing the camera: "< A | B >"
  function doorPlaque(left, right, x, y, z){
    const w = 4.4, h = 0.66, cw = 704, ch = 106;
    const t = H.canvasTex(cw, ch, g => {
      g.fillStyle = '#1f2a44'; H.rr(g, 3, 3, cw - 6, ch - 6, 44); g.fill();
      g.fillStyle = accent; H.rr(g, 10, 10, cw - 20, ch - 20, 38); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(cw/2 - 2, 20, 4, ch - 40);
      g.textBaseline = 'middle'; let fs = 36; H.F(g, 700, fs);
      while(fs > 16 && Math.max(g.measureText(left).width, g.measureText(right).width) > cw/2 - 80){ fs -= 2; H.F(g, 700, fs); }
      const tri = (tx, dir) => { g.beginPath(); g.moveTo(tx + dir*13, ch/2); g.lineTo(tx - dir*9, ch/2 - 14); g.lineTo(tx - dir*9, ch/2 + 14); g.closePath(); g.fill(); };
      tri(34, -1); g.textAlign = 'left'; g.fillText(left, 58, ch/2 + 2);
      tri(cw - 34, 1); g.textAlign = 'right'; g.fillText(right, cw - 58, ch/2 + 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, toneMapped:false }));
    m.position.set(x, y, z); scene.add(m);
    for(const sx of [-1.5, 1.5]) sbox(0.03, 0.5, 0.03, '#1f2a44', x + sx, y + h/2 + 0.25, z - 0.02).castShadow = false;
  }

  // ---- roofs, drawn as open structure so the camera still sees in
  function roof(r, rs){
    const kind = rs.roof || 'none', trim = rs.beam || trimOf(rs), top = r.H, rise = rs.rise || 2.2;
    const bz = -D/2, frontZ = D/2 - 2.4;
    if(kind === 'vault'){
      const ribGeo = new THREE.TorusGeometry(r.w/2 - 0.2, 0.09, 6, 40, Math.PI);
      for(let z = bz + 0.25; z <= frontZ; z += 1.8){ const m = new THREE.Mesh(ribGeo, M(trim)); m.position.set(r.cx, top, z); m.scale.y = rise/(r.w/2 - 0.2); S.add(m); }
      // lunette on the back wall with a round window
      const s = new THREE.Shape(); s.absellipse(0, 0, r.w/2, rise, 0, Math.PI, false); s.lineTo(r.w/2, 0);
      const hole = new THREE.Path(); hole.absarc(0, rise*0.45, 0.7, 0, Math.PI*2, true); s.holes.push(hole);
      const lun = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth:T, bevelEnabled:false, curveSegments:28 }), M(rs.wall || '#fbf1dc'));
      lun.position.set(r.cx, top, bz - T); lun.receiveShadow = true; S.add(lun);
      win(r.cx, top + rise*0.45, bz + 0.02, 0, 1.4, 1.4, { shape:'round', kind:rs.view || 'sky', frame:trim, cols:2, rows:2, beamTo:[r.cx + 1.2, bz + 5.5], beamR:[0.5, 1.2] });
    } else if(kind === 'truss'){
      const half = r.w/2, L = Math.hypot(half, rise), a = Math.atan2(rise, half);
      const gs = new THREE.Shape(); gs.moveTo(-half, 0); gs.lineTo(half, 0); gs.lineTo(0, rise); gs.lineTo(-half, 0);
      const gh = new THREE.Path(); gh.moveTo(-0.35, 0.25); gh.lineTo(0.35, 0.25); gh.lineTo(0.35, rise*0.55); gh.lineTo(0, rise*0.7); gh.lineTo(-0.35, rise*0.55); gh.lineTo(-0.35, 0.25); gs.holes.push(gh);
      const gab = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth:T, bevelEnabled:false }), M(rs.wall || '#fbf1dc')); gab.position.set(r.cx, top, bz - T); S.add(gab);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, rise*0.5), view(rs.view || 'dusk')); glass.position.set(r.cx, top + 0.25 + rise*0.22, bz - T + 0.05); S.add(glass);
      beam(r.cx, top + rise*0.35, bz + 0.1, r.cx - 0.6, 0, bz + 5.2, 0.35, 0.9, '#ffe0a0', 0.2);
      // collar-tie trusses (no king post, so nothing stands in the middle of the view)
      const tz = rs.trussTo ?? frontZ;
      for(let z = bz + 0.3; z <= tz; z += 2.1){
        for(const s of [-1, 1]){ const raf = sbox(0.18, L + 0.2, 0.22, trim, r.cx + s*half/2, top + rise/2, z); raf.rotation.z = s*(Math.PI/2 - a); }
        sbox(r.w*0.5, 0.18, 0.2, trim, r.cx, top + rise*0.5, z);
        for(const s of [-1, 1]){ const br = sbox(0.12, 0.9, 0.18, trim, r.cx + s*(half - 0.45), top + 0.3, z); br.rotation.z = s*0.7; }
      }
      sbox(0.2, 0.2, tz - bz + 0.2, trim, r.cx, top + rise - 0.05, (bz + tz)/2 + 0.1);
      for(const s of [-1, 1]) for(const f of [0.35, 0.7]){ const p = sbox(0.14, 0.14, tz - bz, trim, r.cx + s*half*(1 - f), top + rise*f, (bz + tz)/2); p.castShadow = false; }
    } else if(kind === 'dome'){
      const spring = WALL + 0.1, dr = rise, R = r.R;
      const ribGeo = new THREE.TorusGeometry(R, 0.08, 6, 24, Math.PI/2);
      for(let k=0;k<r.N;k++){
        const am = (k + 0.5)*2*Math.PI/r.N; if(Math.sin(am) > 0.5) continue;
        const m = new THREE.Mesh(ribGeo, M(trim)); m.position.set(r.cx, spring, r.cz); m.rotation.y = -am; m.scale.y = dr/R; S.add(m);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 6, 48, Math.PI), M(trim)); ring.rotation.x = -Math.PI/2; ring.position.set(r.cx, spring, r.cz); S.add(ring);
      const ocu = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 8, 32), M(trim)); ocu.rotation.x = Math.PI/2; ocu.position.set(r.cx, spring + dr - 0.08, r.cz); S.add(ocu);
      const sky = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color:'#e8f7ff', toneMapped:false })); sky.rotation.x = Math.PI/2; sky.position.set(r.cx, spring + dr - 0.02, r.cz); S.add(sky);
      r.shaft = beam(r.cx, spring + dr - 0.1, r.cz, r.cx + (rs.shaftDX || 0), 0, r.cz + (rs.shaftDZ || 0), 0.7, 1.35, rs.shaftColor || '#fff4d0', 0.2);
    } else if(kind === 'glass'){
      const y0 = top, y1 = WALL + 0.3, z0 = bz, z1 = D/2 - 3.2, dy = y0 - y1, dz = z1 - z0, L = Math.hypot(dy, dz), a = Math.atan2(-dz, dy);
      const paneMat = new THREE.MeshStandardMaterial({ color:'#cdeef7', transparent:true, opacity:0.14, roughness:0.1, metalness:0.1, depthWrite:false, side:THREE.DoubleSide });
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 0.3, L), paneMat); pane.position.set(r.cx, (y0 + y1)/2, (z0 + z1)/2); pane.rotation.x = a; scene.add(pane);
      for(let xx = r.xa + 0.3; xx <= r.xb - 0.2; xx += 1.3){ const raf = sbox(0.08, L, 0.12, rs.frame || '#fffaf0', xx, (y0 + y1)/2, (z0 + z1)/2); raf.rotation.x = a; raf.castShadow = false; }
      sbox(r.w - 0.3, 0.12, 0.14, rs.frame || '#fffaf0', r.cx, y1, z1).castShadow = false;
      for(let k=1;k<3;k++){ const f = k/3; sbox(r.w - 0.3, 0.06, 0.1, rs.frame || '#fffaf0', r.cx, y0 - dy*f, z0 + dz*f).castShadow = false; }
      for(const xx of [r.xa + 0.35, r.xb - 0.35]) sbox(0.12, WALL + 0.3, 0.12, rs.frame || '#fffaf0', xx, (WALL + 0.3)/2, z1);
    } else if(kind === 'sawtooth'){
      const n = 3, z0 = bz, z1 = 0.6, Lz = (z1 - z0)/n, hh = rs.rise || 1.5;
      const glowMat = new THREE.MeshBasicMaterial({ color:'#fff3cf', transparent:true, opacity:0.75, toneMapped:false, side:THREE.DoubleSide });
      for(let k=0;k<n;k++){
        const zk = z0 + k*Lz, L = Math.hypot(hh, Lz), a = Math.atan2(hh, Lz);
        const g = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 0.4, hh - 0.15), glowMat); g.position.set(r.cx, top + hh/2, zk + 0.05); scene.add(g);
        for(let xx = r.xa + 0.4; xx <= r.xb - 0.3; xx += 2.2){
          sbox(0.14, hh, 0.14, trim, xx, top + hh/2, zk);
          const sl = sbox(0.14, L, 0.14, trim, xx, top + hh/2, zk + Lz/2); sl.rotation.x = Math.PI/2 - a;
        }
        sbox(r.w - 0.3, 0.14, 0.14, trim, r.cx, top + hh, zk);
        sbox(r.w - 0.3, 0.14, 0.14, trim, r.cx, top, zk);
        for(const bx of [r.cx - r.w*0.25, r.cx + r.w*0.25]) beam(bx, top + hh*0.5, zk + 0.2, bx + 0.4, 0, zk + 3.6, 0.9, 1.2, '#fff3cf', 0.13);
      }
    } else if(kind === 'skylight' || kind === 'coffer'){
      const beams = rs.coffer ?? (kind === 'coffer');
      if(beams){
        // a coffered band over the back third only, so the camera still sees the floor
        const cz1 = bz + D*0.36;
        for(let z = bz + 1.2; z <= cz1; z += 1.2) sbox(r.w - 0.3, 0.22, 0.16, trim, r.cx, top - 0.05, z).castShadow = false;
        for(let xx = r.xa + 1.2; xx < r.xb - 0.5; xx += 1.2) sbox(0.16, 0.22, cz1 - bz, trim, xx, top - 0.05, (bz + cz1)/2).castShadow = false;
      }
      for(const [sx, sz, sw, sd] of (rs.skylights || (kind === 'skylight' ? [[0, -1.8, 2.4, 1.6]] : []))){
        const cx = r.cx + sx, y = top + 0.6;
        for(const s of [-1, 1]){ sbox(sw + 0.3, 0.14, 0.14, trim, cx, y, sz + s*sd/2).castShadow = false; sbox(0.14, 0.14, sd, trim, cx + s*sw/2, y, sz).castShadow = false; }
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), new THREE.MeshBasicMaterial({ color:'#dff4ff', transparent:true, opacity:0.55, toneMapped:false, side:THREE.DoubleSide }));
        gl.rotation.x = -Math.PI/2; gl.position.set(cx, y + 0.05, sz); scene.add(gl);
        beam(cx, y, sz, cx + 0.5, 0, sz + 1.2, Math.min(sw, sd)*0.5, Math.min(sw, sd)*0.75, '#fff6dc', 0.16);
      }
    }
  }

  // ---- raised platforms with steps (split levels). The walker is lifted while on one.
  function level({ x0, x1, z0, z1, h = 0.5, color = '#b98a5a', edge = dark, stairs = [], rails = true }){
    const lv = { x0, x1, z0, z1, h, st:[] };
    sbox(x1 - x0, h, z1 - z0, color, (x0 + x1)/2, h/2, (z0 + z1)/2);
    const n = Math.max(2, Math.round(h/0.17)), run = 0.34, len = n*run;
    const cut = { front:[], back:[], left:[], right:[] };
    for(const s of stairs){
      const a = s.a, b = s.b, sd = s.side;
      cut[sd].push([a, b]);
      for(let k=0;k<n;k++){
        const sh = h*(k + 1)/(n + 1), off = len - (k + 0.5)*run;
        if(sd === 'front') sbox(b - a, sh, run, color, (a + b)/2, sh/2, z1 + off);
        if(sd === 'back') sbox(b - a, sh, run, color, (a + b)/2, sh/2, z0 - off);
        if(sd === 'left') sbox(run, sh, b - a, color, x0 - off, sh/2, (a + b)/2);
        if(sd === 'right') sbox(run, sh, b - a, color, x1 + off, sh/2, (a + b)/2);
      }
      const r = sd === 'front' ? { x0:a, x1:b, z0:z1, z1:z1 + len, dir:'z+' } : sd === 'back' ? { x0:a, x1:b, z0:z0 - len, z1:z0, dir:'z-' } : sd === 'left' ? { x0:x0 - len, x1:x0, z0:a, z1:b, dir:'x-' } : { x0:x1, x1:x1 + len, z0:a, z1:b, dir:'x+' };
      lv.st.push(r);
    }
    // edges: a nosing strip, a low rail, and a collider with gaps where the stairs are
    const edges = [['front', x0, x1, z1, true], ['back', x0, x1, z0, true], ['left', z0, z1, x0, false], ['right', z0, z1, x1, false]];
    for(const [sd, a0, a1, c, alongX] of edges){
      const gaps = cut[sd].slice().sort((p, q) => p[0] - q[0]); let s = a0;
      const pieces = []; for(const [a, b] of gaps){ if(a > s) pieces.push([s, a]); s = Math.max(s, b); } if(a1 > s) pieces.push([s, a1]);
      for(const [a, b] of pieces){
        const m = (a + b)/2, L = b - a; if(L < 0.05) continue;
        if(alongX){ colliders.push({ kind:'box', x:m, z:c, ang:0, hw:L/2, hd:0.08 }); sbox(L, 0.06, 0.12, edge, m, h + 0.03, c).castShadow = false; if(rails){ sbox(L, 0.06, 0.06, edge, m, h + 0.85, c); for(let p = a + 0.05; p <= b; p += 0.5) sbox(0.05, 0.85, 0.05, edge, p, h + 0.42, c).castShadow = false; } }
        else { colliders.push({ kind:'box', x:c, z:m, ang:0, hw:0.08, hd:L/2 }); sbox(0.12, 0.06, L, edge, c, h + 0.03, m).castShadow = false; if(rails){ sbox(0.06, 0.06, L, edge, c, h + 0.85, m); for(let p = a + 0.05; p <= b; p += 0.5) sbox(0.05, 0.85, 0.05, edge, c, h + 0.42, p).castShadow = false; } }
      }
    }
    levels.push(lv); return lv;
  }
  function levelAt(px, pz){
    let y = 0;
    for(const lv of levels){
      if(px >= lv.x0 && px <= lv.x1 && pz >= lv.z0 && pz <= lv.z1) y = Math.max(y, lv.h);
      for(const s of lv.st){
        if(px < s.x0 || px > s.x1 || pz < s.z0 || pz > s.z1) continue;
        const f = s.dir === 'z+' ? (s.z1 - pz)/(s.z1 - s.z0) : s.dir === 'z-' ? (pz - s.z0)/(s.z1 - s.z0) : s.dir === 'x-' ? (px - s.x0)/(s.x1 - s.x0) : (s.x1 - px)/(s.x1 - s.x0);
        y = Math.max(y, lv.h*Math.max(0, Math.min(1, f)));
      }
    }
    return y;
  }

  // ---- hotspots: glowing pads, a floating "F" prompt when near, click to use
  const promptTex = H.canvasTex(512, 112, () => {});
  const prompt = new THREE.Sprite(new THREE.SpriteMaterial({ map:promptTex.tex, transparent:true, depthTest:false }));
  prompt.scale.set(3.6, 0.79, 1); prompt.renderOrder = 10; prompt.visible = false; scene.add(prompt);
  let promptFor = null;
  function drawPrompt(text){
    const g = promptTex.g; g.clearRect(0, 0, 512, 112);
    H.F(g, 600, 38); const tw = Math.min(500, g.measureText(text).width + 124), x0 = (512 - tw)/2;
    g.fillStyle = '#1f2a44'; H.rr(g, x0, 10, tw, 88, 44); g.fill();
    g.fillStyle = '#fffaf0'; H.rr(g, x0 + 14, 24, 60, 60, 16); g.fill();
    g.fillStyle = '#1f2a44'; H.F(g, 700, 40); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('F', x0 + 44, 56);
    g.fillStyle = '#fffaf0'; H.F(g, 600, 38); g.textAlign = 'left'; g.fillText(text, x0 + 92, 56);
    promptTex.tex.needsUpdate = true;
  }
  const padGeo = new THREE.RingGeometry(0.5, 0.72, 32);
  function hot(o){
    const h = Object.assign({ r:1.5, y:2.6, count:0 }, o);
    h.pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color:o.padColor || '#ffe9a8', transparent:true, opacity:0.7, depthWrite:false, toneMapped:false }));
    h.pad.rotation.x = -Math.PI/2; h.pad.position.set(h.x, levelAt(h.x, h.z) + 0.035, h.z); scene.add(h.pad);
    h.targets = [];
    if(h.obj) h.obj.traverse(m => { if(m.isMesh){ m.userData.hot = h; h.targets.push(m); } });
    hotspots.push(h); return h;
  }
  function use(h){
    if(!h) return false;
    h.count++;
    try { ctx.sound?.sfx?.clink?.(0.5); } catch(e){}
    try { h.use(h); } catch(e){ console.error(`[interiors] ${zone.id} hotspot "${h.label}" threw`, e); }
    return true;
  }

  // ---- speech bubble with a little babble voice
  const bubT = H.canvasTex(512, 170, () => {});
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map:bubT.tex, transparent:true, depthTest:false }));
  bubble.scale.set(3.4, 1.13, 1); bubble.renderOrder = 11; bubble.visible = false; scene.add(bubble);
  let bub = null;
  function say(target, text, { dur = 3, pitch = 520, y = 2.2 } = {}){
    const g = bubT.g; g.clearRect(0, 0, 512, 170);
    H.F(g, 600, 34); const lines = []; let line = '';
    for(const w of text.split(' ')){ const t = line ? line + ' ' + w : w; if(g.measureText(t).width > 440 && line){ lines.push(line); line = w; } else line = t; }
    if(line) lines.push(line);
    const bw = Math.min(500, Math.max(...lines.map(l => g.measureText(l).width)) + 50), bh = 30 + lines.length*42, x0 = (512 - bw)/2;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#1f2a44'; g.lineWidth = 5; H.rr(g, x0, 6, bw, bh, 26); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(236, bh + 4); g.lineTo(256, bh + 34 > 166 ? 166 : bh + 34); g.lineTo(276, bh + 4); g.fill(); g.stroke();
    g.fillStyle = '#fffaf0'; g.fillRect(238, bh - 2, 36, 8);
    g.fillStyle = '#1f2a44'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.slice(0, 3).forEach((l, i) => g.fillText(l, 256, 6 + 36 + i*42));
    bubT.tex.needsUpdate = true;
    bub = { target, t:dur, y };
    bubble.visible = true;
    // babble: a few quick syllables
    const n = Math.min(7, text.split(' ').length);
    for(let i=0;i<n;i++) setTimeout(() => { try { ctx.sound?.tone?.(pitch*(0.85 + ((i*37)%10)/25), 0.07, 'triangle', 0.05, pitch*(0.9 + ((i*13)%10)/30)); } catch(e){} }, i*85);
  }
  const bv = new THREE.Vector3();

  // ---- DOM card for things you read
  let card = null, cardAt = null;
  function closeCard(){ if(card){ card.remove(); card = null; } }
  function showCard(title, lines, links = []){
    closeCard();
    card = document.createElement('div');
    card.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-1deg);z-index:40;width:min(440px,calc(100% - 32px));max-height:80vh;overflow:auto;background:#fffaf0;border-radius:22px;box-shadow:0 8px 0 #0000002a,0 20px 60px #0000004d;padding:22px 24px 18px;font:15px/1.5 Nunito,system-ui,sans-serif;color:#1f2a44;border-top:10px solid ' + accent;
    const h = document.createElement('h3'); h.textContent = title; h.style.cssText = 'margin:0 0 8px;font:700 22px/1.2 Fredoka,system-ui,sans-serif';
    card.append(h);
    for(const l of lines){ const p = document.createElement('p'); p.textContent = l; p.style.margin = '0 0 8px'; card.append(p); }
    const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
    for(const [txt, href] of links){ const a = document.createElement('a'); a.className = 'pill dark'; a.textContent = txt; a.href = href; if(!href.startsWith('mailto:')){ a.target = '_blank'; a.rel = 'noopener'; } row.append(a); }
    const x = document.createElement('button'); x.className = 'pill'; x.type = 'button'; x.textContent = 'Close'; x.onclick = closeCard; row.append(x);
    card.append(row); document.body.append(card);
    const p = room.player; cardAt = p ? { x:p.x, z:p.z } : null;
    return card;
  }

  // ---- fallback walker (only while the character module is not available)
  const walker = new THREE.Group(); walker.visible = false; scene.add(walker);
  H.mesh(new THREE.CapsuleGeometry(0.34, 0.36, 6, 14), '#ffd166', 0, 0.62, 0, walker);
  H.eyes?.(walker, 0.8, 0.32, 0.14, 0.055);
  const ownWalker = () => !ctx.modules.character?.available;
  function collide(p, rad){
    for(const c of colliders){
      if(c.kind === 'circle'){ const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if(d < m && d > 1e-6){ p.x = c.x + dx/d*m; p.z = c.z + dz/d*m; } continue; }
      const ca = Math.cos(c.ang || 0), sa = Math.sin(c.ang || 0), dx = p.x - c.x, dz = p.z - c.z;
      let lx = dx*ca - dz*sa, lz = dx*sa + dz*ca;
      const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz)), ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
      if(d >= rad) continue;
      if(d < 1e-6){ const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if(px < pz) lx = Math.sign(lx || 1)*(c.hw + rad); else lz = Math.sign(lz || 1)*(c.hd + rad); }
      else { lx = qx + ex/d*rad; lz = qz + ez/d*rad; }
      p.x = c.x + lx*ca + lz*sa; p.z = c.z - lx*sa + lz*ca;
    }
    const b = room.bounds; p.x = Math.max(b.minX + rad, Math.min(b.maxX - rad, p.x)); p.z = Math.max(b.minZ + rad, Math.min(b.maxZ - rad, p.z));
  }

  // ---- camera: a high three-quarter view that slides to the room you are in
  const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 0.5, 140);
  const camT = new THREE.Vector3(), look = new THREE.Vector3(), lookT = new THREE.Vector3();
  function roomAt(px){ for(const r of rooms) if(px < r.xb) return r; return rooms[rooms.length - 1]; }
  function aimCamera(snap, dt = 0.016){
    const p = room.player || room.spawn, r = roomAt(p.x), c = r.spec.cam || {};
    const narrow = Math.min(1, camera.aspect/1.6);
    const dist = (c.dist || Math.max(15.5, r.w*1.3))/Math.max(0.62, narrow), elev = c.elev ?? 0.6;
    const tx = r.cx + (p.x - r.cx)*(narrow < 0.9 ? 0.7 : 0.3);
    lookT.set(tx, c.lookY ?? 1.6, (c.lookZ ?? -0.6) + p.z*0.15);
    camT.set(tx, lookT.y + dist*Math.sin(elev), lookT.z + dist*Math.cos(elev));
    const k = snap ? 1 : 1 - Math.exp(-dt*3.2);
    camera.position.lerp(camT, k); look.lerp(lookT, k);
    camera.lookAt(look);
    return r;
  }

  const first = rooms[0];
  let lift = 0, tickN = 0;
  const room = {
    scene, camera, colliders, rooms, hotspots, tour:stops,
    cameraLocked: true,                                   // this kit drives its own camera
    spawn: { x:first.exitX, z:D/2 - 2, heading:Math.PI },
    exit: { x:first.exitX, z:D/2 + 0.2, r:1.1 },
    bounds: { minX:-totalW/2, maxX:totalW/2, minZ:-D/2, maxZ:D/2 },
    current: first.key,
    levelAt,
    update(dt, t, ctx2, rm){
      const p = rm.player; if(!p) return;
      const I = ctx.input;
      if(ownWalker()){
        walker.visible = true;
        const k = I.keys || {};
        let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0), mz = (k.down ? 1 : 0) - (k.up ? 1 : 0);
        const L = Math.hypot(mx, mz);
        if(L > 0){ mx /= L; mz /= L; const sp = k.boost ? 7 : 4.6; p.x += mx*sp*dt; p.z += mz*sp*dt; p.heading = Math.atan2(mx, mz); p.speed = sp; } else p.speed = 0;
        collide(p, 0.38);
        walker.position.set(p.x, Math.abs(Math.sin(t*12))*(p.speed ? 0.08 : 0.02), p.z);
        walker.rotation.y = H.lerpAngle(walker.rotation.y, p.heading, Math.min(1, dt*12));
        const de = Math.hypot(p.x - rm.exit.x, p.z - rm.exit.z);
        if(de > rm.exit.r + 0.4) rm._armed = true;
        if(rm._armed && de < rm.exit.r && mz > 0){ rm._armed = false; ctx.modes.exitInterior(); return; }
      } else walker.visible = false;
      // split levels: lift whoever is walking
      const want = levelAt(p.x, p.z); lift += (want - lift)*Math.min(1, dt*16);
      const g = ownWalker() ? walker : ctx.modules.character?.group;
      if(g && g.parent === scene) g.position.y += lift;

      const r = aimCamera(false, dt); rm.current = r.key;
      let best = null, bd = 1e9;
      for(const h of hotspots){ const d = Math.hypot(p.x - h.x, p.z - h.z); h.pad.material.opacity = 0.35 + 0.3*Math.sin(t*3 + h.x); if(d < h.r && d < bd){ best = h; bd = d; } }
      if(best !== promptFor){ promptFor = best; if(best) drawPrompt(best.label); }
      prompt.visible = !!best && !card;
      if(best){ prompt.position.set(best.x, best.y + levelAt(best.x, best.z) + Math.sin(t*3)*0.08, best.z); best.pad.material.opacity = 0.95; }
      tickN++;
      for(const f of ticks) f(dt, t, p, tickN);
      if(bub){
        bub.t -= dt;
        if(bub.t <= 0){ bub = null; bubble.visible = false; }
        else { if(Array.isArray(bub.target)) bv.set(...bub.target); else { bub.target.getWorldPosition(bv); bv.y += bub.y; } bubble.position.copy(bv); bubble.material.opacity = Math.min(1, bub.t*3); }
      }
      if(card && cardAt && Math.hypot(p.x - cardAt.x, p.z - cardAt.z) > 2.4) closeCard();
    },
    onEnter(ctx2, rm){
      rm._armed = false; lift = 0;
      look.set(first.cx, 1.5, 0); aimCamera(true);
      if(ownWalker()) ctx.hud?.setHint?.('interior', '<kbd>WASD</kbd> walk &nbsp; <kbd>F</kbd> use &nbsp; <kbd>1</kbd>-<kbd>' + rooms.length + '</kbd> rooms &nbsp; <kbd>Esc</kbd> leave');
      ctx.renderer.domElement.addEventListener('pointerdown', onClick);
      spec.onEnter?.();
    },
    onExit(){ closeCard(); bub = null; bubble.visible = false; ctx.renderer.domElement.removeEventListener('pointerdown', onClick); spec.onExit?.(); },
    // critic and tour hooks
    go(keyOrIndex){
      const r = typeof keyOrIndex === 'number' ? rooms[keyOrIndex] : rooms.find(q => q.key === keyOrIndex);
      if(!r || !room.player) return false;
      room.player.x = r.cx; room.player.z = D/2 - 1.6; room.player.heading = Math.PI;
      placeWalker(); aimCamera(true); room.current = r.key; return true;
    },
    use(label){
      const p = room.player; if(!p) return false;
      const h = label ? hotspots.find(q => q.label === label || q.id === label) : hotspots.slice().sort((a, b) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z))[0];
      if(h && label){ p.x = h.x; p.z = h.z + 0.25; placeWalker(); aimCamera(true); }
      return use(h);
    },
  };
  // teleports inside the room have to reach the character module too
  // character.js copies room.player into its walker at the start of every interior frame,
  // so moving room.player is enough; the fallback walker reads it directly too
  function placeWalker(){ lift = levelAt(room.player.x, room.player.z); }

  // E uses the hotspot you stand on; number keys hop between rooms
  ctx.bus.on('action:interact', () => { if(ctx.state.interior === room && promptFor && !card) use(promptFor); });
  ctx.bus.on('key', ({ code, down }) => {
    if(!down || ctx.state.interior !== room) return;
    const m = /^Digit([1-9])$/.exec(code || ''); if(m && +m[1] <= rooms.length) room.go(+m[1] - 1);
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function onClick(e){
    if(ctx.state.interior !== room) return;
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -(e.clientY - rect.top)/rect.height*2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hotspots.flatMap(h => h.targets), false)[0];
    if(hit?.object.userData.hot) use(hit.object.userData.hot);
  }

  // one shared critic hook for every interiors-b building
  if(!ctx.__tourB){
    ctx.__tourB = true;
    ctx.expose('tourB', {
      rooms: () => ctx.state.interior?.rooms?.map(r => r.key) ?? [],
      current: () => ctx.state.interior?.current ?? null,
      go: k => ctx.state.interior?.go?.(k) ?? false,
      hotspots: () => ctx.state.interior?.hotspots?.map(h => ({ label:h.label, room:h.room, x:h.x, z:h.z, used:h.count })) ?? [],
      use: l => ctx.state.interior?.use?.(l) ?? false,
      stops: () => ctx.state.interior?.tour ?? null,
      drawCalls: () => ctx.renderer.info.render.calls,
    });
  }

  // kit handed to each room's build
  const K = { THREE, H, D, WALL, T, DOOR, scene, S, zone, accent, dark, rooms, rand, M,
    sign, panel, hot, showCard, closeCard, say, win, beam, pool, pendant, bookcase, level, levelAt, mezz, view, normUV, outline,
    box: sbox, cyl: scyl,
    tick: f => ticks.push(f),
    solid: (x, z, hw, hd, ang = 0) => colliders.push({ kind:'box', x, z, ang, hw, hd }),
    round: (x, z, r) => colliders.push({ kind:'circle', x, z, r }),
    lamp: (color, x, y, z, power = 6, dist = 7) => { const l = new THREE.PointLight(color, power, dist, 1.6); l.position.set(x, y, z); scene.add(l); return l; },
    sfx: (name, v = 0.6) => { try { ctx.sound?.sfx?.[name]?.(v); } catch(e){} },
    tone: (...a) => { try { ctx.sound?.tone?.(...a); } catch(e){} },
    eyes: (parent, y, z, sep, r) => H.eyes?.(parent, y, z, sep, r),
    stop(title, text, at){ stops.push({ id:`${zone.id}-${stops.length + 1}`, title, text, at }); },
    // a little capsule friend with a face; returns the group (dynamic)
    buddy(parent, color, x, z, rotY = 0, s = 1, hat = null){
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(s); parent.add(g);
      H.mesh(new THREE.CapsuleGeometry(0.34, 0.34, 6, 14), color, 0, 0.6, 0, g);
      H.eyes?.(g, 0.76, 0.32, 0.14, 0.055);
      if(hat) H.cyl(0.3, 0.34, 0.12, hat, 0, 1.12, 0, g, 14);
      return g;
    },
    // the zone's resume card as a wall board, with a pad in front that opens it as a readable card
    info(x, z, { y = 1.9, w = 2.6, h = 1.4, padZ = 1.7, rotY = 0 } = {}){
      const b = panel(scene, x, y, z, w, h, (g, cw, ch) => {
        const fit = (txt, wt, size, fam) => { let f = size; H.F(g, wt, f, fam); while(f > 9 && g.measureText(txt).width > cw - 28){ f--; H.F(g, wt, f, fam); } };
        g.fillStyle = '#fffaf0'; g.fillRect(0, 0, cw, ch); g.fillStyle = accent; g.fillRect(0, 0, cw, ch*0.08);
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = '#4b5675'; fit(zone.eyebrow.toUpperCase(), 600, Math.round(ch*0.09)); g.fillText(zone.eyebrow.toUpperCase(), 14, ch*0.26);
        g.fillStyle = '#1f2a44'; fit(zone.title, 700, Math.round(ch*0.2)); g.fillText(zone.title, 14, ch*0.48);
        g.fillStyle = '#4b5675'; fit(zone.role, 600, Math.round(ch*0.11), 'Nunito'); g.fillText(zone.role, 14, ch*0.66);
        g.fillStyle = accent; H.F(g, 700, Math.round(ch*0.085)); g.fillText('Stand on the pad, press F to read', 14, ch*0.9);
      }, { frame:accent, rotY });
      hot({ x: x + Math.sin(rotY)*padZ, z: z + Math.cos(rotY)*padZ, label:'Read the card', obj:b, use(){ showCard(zone.title, [zone.eyebrow, zone.role, ...zone.bullets], (zone.links || []).slice()); } });
      return b;
    },
  };
  spec.rooms.forEach((rs, i) => {
    try { rs.build?.(K, rooms[i]); }
    catch(e){ console.error(`[interiors] ${zone.id} room "${rs.key}" failed to build`, e); }
  });
  hotspots.forEach(h => { if(!h.room) h.room = roomAt(h.x).key; });
  bake(THREE, S, scene);
  return room;
}

// Merge every opaque static mesh in `root` by material, so a building costs a few dozen draw calls.
function bake(THREE, root, scene){
  root.updateMatrixWorld(true);
  const buckets = new Map(), done = [];
  root.traverse(o => {
    if(!o.isMesh || Array.isArray(o.material) || o.material.transparent) return;
    const g = o.geometry; if(!g.index || !g.attributes.normal || !g.attributes.uv) return;
    const key = o.material.uuid + (o.castShadow ? '|s' : '|n');
    if(!buckets.has(key)) buckets.set(key, { mat:o.material, cast:o.castShadow, list:[] });
    const c = g.clone(); c.applyMatrix4(o.matrixWorld);
    for(const k of Object.keys(c.attributes)) if(!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k);
    c.clearGroups(); c.morphAttributes = {};
    buckets.get(key).list.push(c); done.push(o);
  });
  for(const { mat, cast, list } of buckets.values()){
    const merged = mergeGeometries(list, false);
    list.forEach(g => g.dispose());
    if(!merged) continue;
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = true; scene.add(m);
  }
  for(const o of done){ o.parent?.remove(o); o.geometry.dispose(); }
}

// ------------------------------------------------------------------ the clinic itself
export function build(ctx, { zone }){
  return tour(ctx, zone, {
    bg:'#12303d', bgTop:'#2d5a6c', seed:3,
    rooms: [
      { key:'reception', name:'Reception', w:13, floorKind:'terrazzo', floor:'#eef5f4', floorLine:'#bcd6da', wall:'#e6f3f6', wall2:'#d6ebf1', wallKind:'stripes', trim:'#cde6ee', dark:'#3f86a3',
        roof:'skylight', skylights:[[-2.6, -3.2, 2.2, 1.6], [2.6, -3.2, 2.2, 1.6]], coffer:false, beam:'#f2f7f8', exitX:-1.5,
        build(K, r){ reception(K, r, ctx); } },
      { key:'operatory', name:'Operatory', w:12, shape:'round', tall:4.6, roof:'dome', rise:2.4, floorKind:'checker', floor:'#f4f7f8', floorLine:'#dde9ee', wall:'#f6fbfc', wall2:'#e5f2f6', wallKind:'dots', dark:'#4fa3c7', poche:'#2f6e87', beam:'#e9f3f6',
        build(K, r){ operatory(K, r, ctx); } },
      { key:'study', name:'Study', w:11, tall:4.4, roof:'vault', rise:2.0, view:'sea', floorKind:'herring', floor:'#d9b48a', floorLine:'#c49a6c', wall:'#f7ecd8', wall2:'#efdfc2', trim:'#e6cfa6', dark:'#8a6440',
        build(K, r){ study(K, r, zone); } },
    ],
  });
}

function reception(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // curved reception desk: an extruded ring sector, convex side to the room
  const arc = (ro, ri, a0, a1) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, a0, a1, false); s.absarc(0, 0, ri, a1, a0, true); s.closePath(); return s; };
  const dx = cx + 3.2, dz = -2.2, a0 = -Math.PI/2 - 1.1, a1 = -Math.PI/2 + 1.1;
  const desk = new THREE.Mesh(new THREE.ExtrudeGeometry(arc(2.3, 1.85, a0, a1), { depth:1.05, bevelEnabled:false, curveSegments:32 }), K.M('#ffffff'));
  desk.rotation.x = -Math.PI/2; desk.position.set(dx, 0, dz); desk.castShadow = desk.receiveShadow = true; S.add(desk);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(arc(2.42, 1.75, a0 - 0.04, a1 + 0.04), { depth:0.08, bevelEnabled:false, curveSegments:32 }), K.M('#4fa3c7'));
  top.rotation.x = -Math.PI/2; top.position.set(dx, 1.05, dz); top.castShadow = true; S.add(top);
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(arc(2.32, 2.28, a0, a1), { depth:0.12, bevelEnabled:false, curveSegments:32 }), K.M('#9bd3e6'));
  band.rotation.x = -Math.PI/2; band.position.set(dx, 0.5, dz); S.add(band);
  for(let k=0;k<=6;k++){ const a = a0 + (a1 - a0)*k/6; K.round(dx + Math.cos(a)*2.08, dz - Math.sin(a)*2.08, 0.34); }
  // receptionist, check-in screen and the bell
  const host = K.buddy(scene, '#9bd3e6', dx, dz - 0.9, 0, 1, '#4fa3c7');
  const screen = K.panel(scene, dx + 0.7, 1.45, dz + 1.1, 0.8, 0.5, (g, w, h, n = 0) => {
    g.fillStyle = '#0f2a36'; g.fillRect(0, 0, w, h); g.fillStyle = '#9bf6ff'; H.F(g, 700, 13); g.textAlign = 'center';
    g.fillText(n ? 'CHECKED IN' : 'WELCOME', w/2, 22); H.F(g, 600, 11, 'Nunito'); g.fillStyle = '#e8f6fb'; g.fillText(n ? 'Operatory is ready' : 'Ring the bell', w/2, 42);
  }, { frame:'#1f2a44', rotY:-0.3 });
  const bell = new THREE.Group(); bell.position.set(dx - 0.9, 1.13, dz + 1.75); scene.add(bell);
  H.cyl(0.16, 0.18, 0.04, '#6b4a33', 0, 0, 0, bell);
  const dome = H.mesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI*2, 0, Math.PI/2), '#f2b705', 0, 0.02, 0, bell, { metalness:.5, roughness:.35 });
  let ding = 0, checked = 0;
  const lines = ['Welcome in! The operatory is through that door.', 'Checked in. The chair is ready for you.', 'Take your time. The study is past the round room.'];
  K.hot({ x:dx - 1.1, z:dz + 3.1, label:'Ring the bell', obj:bell, use(){ ding = 1; K.tone(1320, 0.5, 'sine', 0.22); K.tone(1980, 0.35, 'sine', 0.1); screen.redraw(1); K.say(host, lines[checked++ % lines.length], { pitch:620 }); } });
  K.tick((dt, t) => { host.position.y = Math.abs(Math.sin(t*2))*0.05; if(ding > 0){ ding = Math.max(0, ding - dt*1.8); dome.scale.setScalar(1 + Math.sin(ding*40)*0.08*ding); bell.rotation.z = Math.sin(ding*30)*0.1*ding; } });
  K.pendant(dx, K.WALL, dz, '#4fa3c7', '#fff0d0', { drop:0.9, r:0.4 });
  // waiting area: a curved bench under a big window with a view out to sea
  K.win(cx - 3.2, 2.1, -D/2 + 0.02, 0, 4.2, 2.2, { kind:'sea', frame:'#fffaf0', cols:3, rows:1, beamTo:[cx - 2.6, -1.4], beamR:[1.1, 1.6], beamOpacity:0.12 });
  const bench = new THREE.Mesh(new THREE.ExtrudeGeometry(arc(3.1, 2.5, Math.PI/2 - 0.8, Math.PI/2 + 0.8), { depth:0.45, bevelEnabled:false, curveSegments:28 }), K.M('#e98a5a'));
  bench.rotation.x = -Math.PI/2; bench.position.set(cx - 3.2, 0, 0.6); bench.castShadow = true; S.add(bench);
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(arc(3.1, 2.95, Math.PI/2 - 0.8, Math.PI/2 + 0.8), { depth:1.0, bevelEnabled:false, curveSegments:28 }), K.M('#d9744a'));
  back.rotation.x = -Math.PI/2; back.position.set(cx - 3.2, 0, 0.6); back.castShadow = true; S.add(back);
  for(let k=0;k<=4;k++){ const a = Math.PI/2 - 0.8 + 1.6*k/4; K.round(cx - 3.2 + Math.cos(a)*2.8, 0.6 - Math.sin(a)*2.8, 0.36); }
  const rug = K.cyl(1.4, 1.4, 0.03, '#bfe3ee', cx - 3.2, 0.015, -1.0, S, 32); rug.castShadow = false;
  K.cyl(0.55, 0.55, 0.06, '#e0c9a0', cx - 3.2, 0.45, -1.0, S, 24); K.cyl(0.07, 0.09, 0.44, '#8a6440', cx - 3.2, 0.22, -1.0, S, 8);
  K.round(cx - 3.2, -1.0, 0.6);
  for(const [px, pz] of [[cx - 6, -5.3], [cx + 0.2, -5.3]]){
    K.cyl(0.3, 0.24, 0.55, '#d97a4a', px, 0.28, pz, S, 12);
    for(let i=0;i<5;i++){ const l = H.ball(0.3, '#6fae4a', px + Math.cos(i*1.3)*0.2, 0.8 + i*0.12, pz + Math.sin(i*1.3)*0.18, S, 10); l.scale.y = 1.3; }
    K.round(px, pz, 0.4);
  }
  K.info(cx - 0.4, -D/2 + 0.08, { y:2.1, w:2.2, h:1.15, padZ:2.6 });
  // the figurine: a small shelf by the door. Fixed: static meshes, no hotspot, never moved.
  const sx = r.exitX + 2.1, sz = D/2 - 0.55;
  K.box(1.2, 1.0, 0.55, '#e0c9a0', sx, 0.5, sz); K.box(1.3, 0.07, 0.62, '#8a6440', sx, 1.03, sz);
  const fig = new THREE.Group(); fig.position.set(sx, 1.07, sz); S.add(fig);
  H.cyl(0.12, 0.2, 0.52, '#fbf8f0', 0, 0.26, 0, fig, 14); H.box(0.42, 0.08, 0.08, '#fbf8f0', 0, 0.36, 0, fig);
  H.ball(0.11, '#e8c9a0', 0, 0.62, 0, fig, 14); H.cyl(0.12, 0.08, 0.09, '#7a5236', 0, 0.66, -0.02, fig, 12);
  K.solid(sx, sz, 0.65, 0.35);
  K.sign(scene, 'From a real office shelf', sx, 1.95, sz - 0.1, { w:1.9, h:0.38, bg:'#fffaf0' }).rotation.x = -0.25;

  K.stop('Reception', 'A calm, light-filled practice: two skylights, a curved front desk and a window out to the sea. Ring the bell and the front desk checks you in.', [dx - 0.9, 2.4, dz + 2]);
  K.stop('The shelf by the door', 'The little figurine by the door is from a real office shelf. It stays right where it is.', [sx, 2.4, sz]);
}

function operatory(K, r, ctx){
  const { THREE, H, D, scene, S } = K, cx = r.cx, cz = r.cz;
  // dental chair under the oculus
  const chair = new THREE.Group(); chair.position.set(cx - 1.2, 0, cz - 1.6); chair.rotation.y = 0.5; scene.add(chair);
  H.cyl(0.55, 0.75, 0.3, '#dfe7ea', 0, 0.15, 0, chair, 20); H.cyl(0.14, 0.14, 0.6, '#9aa3b8', 0, 0.55, 0, chair, 10);
  H.box(1.1, 0.26, 1.6, '#4fa3c7', 0, 0.95, 0.4, chair); H.box(0.7, 0.18, 0.7, '#4fa3c7', 0, 0.8, 1.45, chair);
  const backrest = new THREE.Group(); backrest.position.set(0, 1.05, -0.35); chair.add(backrest);
  H.box(1.0, 1.4, 0.24, '#4fa3c7', 0, 0.7, 0, backrest); H.box(0.6, 0.3, 0.3, '#3b86a8', 0, 1.5, 0.05, backrest);
  for(const s of [-0.62, 0.62]) H.box(0.14, 0.1, 1, '#dfe7ea', s, 1.25, 0.3, chair);
  K.round(cx - 1.2, cz - 1.4, 1.0);
  // lamp on an arm, with a cone of light when the chair is in use
  K.cyl(0.07, 0.07, 3.4, '#dfe7ea', cx - 3.2, 1.7, cz - 2.8, S, 8); K.round(cx - 3.2, cz - 2.8, 0.2);
  const arm = K.box(2.2, 0.12, 0.12, '#dfe7ea', cx - 2.2, 3.35, cz - 2.2, S); arm.rotation.y = -0.55;
  const head = H.box(0.8, 0.2, 0.5, '#ffffff', cx - 1.3, 3.2, cz - 1.7, scene);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ color:'#fff3cf', transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false }));
  cone.position.set(cx - 1.2, 2.1, cz - 1.5); scene.add(cone);
  // instrument cabinet along the curved back wall
  for(let k=0;k<3;k++){ const a = -Math.PI/2 + (k - 1)*0.42, px = cx + Math.cos(a)*(r.R - 0.5), pz = cz + Math.sin(a)*(r.R - 0.5); const c = K.box(1.9, 1.0, 0.7, '#ffffff', px, 0.5, pz); c.rotation.y = -(a + Math.PI/2); const tp = K.box(2.0, 0.08, 0.8, '#4fa3c7', px, 1.04, pz); tp.rotation.y = c.rotation.y; K.solid(px, pz, 0.95, 0.35, c.rotation.y); }
  K.panel(scene, cx + 1.8, 2.3, cz - r.R + 0.45, 1.8, 1.0, (g, w, h) => {
    g.fillStyle = '#16303c'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8f6fb';
    for(let i=0;i<7;i++){ const x = 18 + i*((w - 36)/6); g.beginPath(); g.ellipse(x, h*0.36, 9, 14, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, h*0.68, 9, 14, 0, 0, 7); g.fill(); }
  }, { frame:'#dfe7ea', rotY:-0.2 });

  // the brushing station: a big tooth with plaque, a brush that scrubs, press F to brush
  const tg = new THREE.Group(); tg.position.set(cx + 2.4, 0, cz + 1.2); tg.rotation.y = -0.45; scene.add(tg);
  H.cyl(0.8, 0.9, 0.5, '#dfe7ea', 0, 0.25, 0, tg, 24);
  const tooth = new THREE.Group(); tooth.position.y = 0.5; tg.add(tooth);
  const body = H.ball(0.7, '#fbfbf7', 0, 0.95, 0, tooth, 24); body.scale.set(1, 0.85, 0.9);
  for(const s of [-0.3, 0.3]){ const rt = H.mesh(new THREE.ConeGeometry(0.22, 0.75, 12), '#fbfbf7', s, 0.32, 0, tooth); rt.rotation.x = Math.PI; }
  K.eyes(tooth, 1.02, 0.6, 0.22, 0.085);
  const mouth = H.mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 16, Math.PI), '#1b1b24', 0, 0.86, 0.62, tooth); mouth.rotation.z = Math.PI;
  const plaqueMat = new THREE.MeshStandardMaterial({ color:'#d9c25a', roughness:.9, transparent:true, opacity:1 });
  const spots = [];
  for(let i=0;i<6;i++){
    const a = -1.1 + i*0.45, yy = 0.72 + (i%2)*0.35;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (i%3)*0.02, 10, 8), plaqueMat.clone());
    s.position.set(Math.sin(a)*0.66, yy, Math.cos(a)*0.55); s.scale.set(1, 0.7, 0.4); s.lookAt(0, yy, 0); tooth.add(s); spots.push({ m:s, v:1 });
  }
  const brush = new THREE.Group(); tg.add(brush);
  H.box(0.12, 0.12, 1.3, '#6fcde8', 0, 0, 0, brush); H.box(0.14, 0.2, 0.3, '#ffffff', 0, 0.12, 0.55, brush);
  brush.position.set(0.9, 1.6, 0.4); brush.rotation.set(0.3, -0.6, 0.2);
  const sparkles = [];
  for(let i=0;i<6;i++){ const s = H.mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color:'#fff6a8', toneMapped:false }), 0, 0, 0, scene); s.visible = false; sparkles.push(s); }
  K.round(cx + 2.4, cz + 1.2, 0.95);
  let scrub = 0, clean = 0, shine = 0, target = -1;
  const lines = ['Hi! Got a minute? I have a little plaque.', 'Ooh, that tickles. Keep going!', 'Almost there!', 'Squeaky clean. Thank you!'];
  const bh = K.hot({ x:cx + 1.5, z:cz + 2.7, label:'Brush the tooth', obj:tg, use(){
    if(clean >= spots.length){ spots.forEach(s => { s.v = 1; s.m.visible = true; s.m.material.opacity = 1; }); clean = 0; shine = 0; K.say(tooth, 'Oops, snack time. Brush me again?', { pitch:700, y:1.9 }); bh.label = 'Brush the tooth'; return; }
    target = clean; scrub = 0.7; clean++;
    K.tone(300 + clean*40, 0.12, 'sawtooth', 0.04, 500);
    K.say(tooth, lines[Math.min(lines.length - 1, clean === spots.length ? 3 : clean < 3 ? clean - 1 : 2)], { pitch:720, y:1.9 });
    if(clean === spots.length){ shine = 1; K.tone(880, 0.2, 'sine', 0.12, 1320); setTimeout(() => K.tone(1320, 0.3, 'sine', 0.1, 1760), 160); }
  } });
  // a cabinet that opens the Brush Up game
  const cab = new THREE.Group(); cab.position.set(cx + 3.6, 0, cz - 2.2); cab.rotation.y = -0.9; scene.add(cab);
  H.box(1.1, 2.0, 0.8, '#4fa3c7', 0, 1.0, 0, cab); H.box(0.9, 0.2, 0.9, '#3b86a8', 0, 2.05, 0.05, cab);
  const cabScreen = K.panel(cab, 0, 1.35, 0.41, 0.8, 0.6, (g, w, h, t = 0) => { g.fillStyle = '#0f2a36'; g.fillRect(0, 0, w, h); g.fillStyle = '#9bf6ff'; H.F(g, 700, 14); g.textAlign = 'center'; g.fillText('BRUSH UP', w/2, 22); g.fillStyle = '#fbfbf7'; for(let i=0;i<4;i++){ g.beginPath(); g.ellipse(14 + i*18, 44, 7, 9, 0, 0, 7); g.fill(); } g.fillStyle = '#ffd166'; g.fillRect(8 + ((t*30)%60), 56, 10, 4); }, { frame:'#1f2a44' });
  K.solid(cx + 3.6, cz - 2.2, 0.6, 0.45, -0.9);
  K.hot({ x:cx + 2.8, z:cz - 1.2, label:'Play Brush Up', obj:cab, use(){ ctx.modules.games?.start?.('brush-up'); } });
  let chairOn = 0, chairT = 0;
  K.hot({ x:cx - 0.5, z:cz + 0.2, label:'Take a seat', obj:chair, use(){ chairT = chairT ? 0 : 1; K.tone(chairT ? 660 : 440, 0.18, 'triangle', 0.18, chairT ? 880 : 330); } });
  K.tick((dt, t, p, n) => {
    chairOn += (chairT - chairOn)*Math.min(1, dt*4);
    backrest.rotation.x = -chairOn*0.7; cone.material.opacity = chairOn*0.22; head.rotation.z = chairOn*0.2;
    if(scrub > 0){
      scrub = Math.max(0, scrub - dt);
      const sp = spots[target]; if(sp){ sp.v = Math.max(0, sp.v - dt*1.6); sp.m.material.opacity = sp.v; sp.m.visible = sp.v > 0.02; const wp = sp.m.position; brush.position.set(wp.x*1.35 + Math.sin(t*40)*0.08, wp.y + 0.5 + 0.2, wp.z*1.35 + 0.2); brush.rotation.set(0.9, Math.atan2(wp.x, wp.z), 0.2 + Math.sin(t*40)*0.2); }
    } else { brush.position.lerp(new THREE.Vector3(1.0, 1.7, 0.5), Math.min(1, dt*4)); brush.rotation.set(0.3, -0.6, 0.2 + Math.sin(t*2)*0.05); }
    tooth.position.y = 0.5 + Math.abs(Math.sin(t*2.2))*0.06 + (scrub > 0 ? Math.sin(t*30)*0.015 : 0);
    tooth.rotation.y = scrub > 0 ? Math.sin(t*20)*0.05 : Math.sin(t*0.8)*0.15;
    mouth.scale.set(1 + shine*0.4, 1 + shine*0.6, 1);
    shine = clean >= spots.length ? Math.min(1, shine + dt) : Math.max(0, shine - dt*2);
    sparkles.forEach((s, i) => { s.visible = shine > 0.1; if(!s.visible) return; const a = t*2 + i*1.05; s.position.set(tg.position.x + Math.cos(a)*1.1, 1.4 + Math.sin(a*1.7)*0.5, tg.position.z + Math.sin(a)*1.1); s.rotation.y = t*3; s.scale.setScalar(shine); });
    if(n % 4 === 0) cabScreen.redraw(t);
  });
  K.stop('The operatory', 'A round room under a domed skylight, so the chair sits in a pool of daylight. Press F on the pad to take a seat and the chair tips back under the lamp.', [cx - 1.2, 3.2, cz - 1.4]);
  K.stop('Brushing practice', 'This tooth has six spots of plaque. Stand on the pad and press F to brush them off one at a time, or try the Brush Up cabinet for the timed version.', [cx + 2.4, 3.0, cz + 1.2]);
}

function study(K, r, zone){
  const { THREE, H, D, scene, S } = K, cx = r.cx;
  // split level: a raised reading platform along the back, three steps up at the front
  const lv = K.level({ x0:r.xa + 0.2, x1:r.xb - 0.2, z0:-D/2, z1:-D/2 + 4.2, h:0.5, color:'#c9a177', edge:'#8a6440', stairs:[{ side:'front', a:cx - 1.3, b:cx + 1.3 }] });
  const y0 = lv.h;
  // floor-to-ceiling built-in shelving with a rolling ladder
  K.bookcase(cx - 3.2, y0, -D/2 + 0.3, 3.6, 3.7, 0, { rows:5 });
  K.bookcase(cx + 3.2, y0, -D/2 + 0.3, 3.6, 3.7, 0, { rows:5 });
  const lad = new THREE.Group(); lad.position.set(cx + 2.2, y0, -D/2 + 0.75); lad.rotation.x = -0.18; S.add(lad);
  for(const s of [-0.3, 0.3]) K.box(0.06, 3.8, 0.06, '#6b4a33', s, 1.9, 0, lad);
  for(let k=0;k<9;k++) K.box(0.6, 0.04, 0.05, '#6b4a33', 0, 0.3 + k*0.4, 0, lad);
  // window seat between the shelves, framing the view out
  K.win(cx, y0 + 2.2, -D/2 + 0.02, 0, 2.4, 2.8, { shape:'arch', kind:'sea', frame:'#fffaf0', cols:2, rows:3, beamTo:[cx + 0.8, -D/2 + 5.8], beamR:[0.9, 1.3], beamOpacity:0.12 });
  K.box(2.6, 0.45, 0.8, '#fffaf0', cx, y0 + 0.22, -D/2 + 0.55); K.box(2.4, 0.12, 0.7, '#e98a5a', cx, y0 + 0.5, -D/2 + 0.55);
  // desk on the platform: laptop and a tooth model, one person's two tracks
  const dx = cx - 3, dz = -D/2 + 2.6;
  K.box(2.4, 0.1, 1.0, '#b98a5a', dx, y0 + 0.95, dz); for(const [ox, oz] of [[-1.1,-0.4],[1.1,-0.4],[-1.1,0.4],[1.1,0.4]]) K.box(0.08, 0.95, 0.08, '#8a6440', dx + ox, y0 + 0.47, dz + oz);
  const scr = K.panel(scene, dx - 0.4, y0 + 1.33, dz - 0.25, 0.9, 0.56, (g, w, h, t = 0) => {
    // a tangle of lines that combs itself into one clean path: a hard idea becoming something usable
    g.fillStyle = '#0f1a2b'; g.fillRect(0, 0, w, h);
    const k = (Math.sin(t*0.7) + 1)/2;
    g.lineWidth = 2;
    for(let i=0;i<6;i++){
      g.strokeStyle = ['#5ff0e0','#ffd166','#ff8fab','#9bf6ff','#b5e48c','#cdb4db'][i]; g.beginPath();
      for(let j=0;j<=20;j++){ const x = 6 + j*(w - 12)/20, messy = Math.sin(j*1.7 + i*2.1 + t)*h*0.3, neat = (i - 2.5)*3; g.lineTo(x, h/2 + messy*(1 - k) + neat*k); }
      g.stroke();
    }
  }, { frame:'#1f2a44', rotY:0 });
  scr.rotation.x = -0.15;
  const model = new THREE.Group(); model.position.set(dx + 0.7, y0 + 1.0, dz); model.scale.setScalar(0.32); scene.add(model);
  const mb = H.ball(0.62, '#fbfbf7', 0, 1.0, 0, model, 18); mb.scale.set(1, 0.85, 0.9);
  for(const s of [-0.28, 0.28]){ const rt = H.mesh(new THREE.ConeGeometry(0.2, 0.7, 10), '#fbfbf7', s, 0.38, 0, model); rt.rotation.x = Math.PI; }
  K.solid(dx, dz, 1.25, 0.55);
  K.pendant(dx, K.WALL + 1, dz, '#e98a5a', '#ffd89a', { drop:1.6, floorY:y0 });
  // the question on a board at floor level: press F to turn it over
  let side = 0;
  const bd = K.panel(scene, cx + 3.1, 1.6, -D/2 + 4.35, 3.0, 1.35, (g, w, h, s = 0) => {
    g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f1e8'; g.textAlign = 'center';
    if(s === 0){ H.F(g, 700, 24); g.fillText('Computer science + pre-dental', w/2, 38); H.F(g, 500, 19, 'Nunito'); wrap(g, 'keep asking the same question: how does a hard idea become something someone else can use?', w/2, 74, w - 36, 24); }
    else { H.F(g, 700, 28); g.fillText(zone.role, w/2, h/2 - 8); H.F(g, 500, 19, 'Nunito'); g.fillText(zone.eyebrow, w/2, h/2 + 26); }
  }, { frame:'#8a6440' });
  const flipper = { v:0, want:0 };
  K.hot({ x:cx + 3.1, z:-D/2 + 5.9, label:'Flip the board', obj:bd, use(){ flipper.want += Math.PI; } });
  K.tick((dt, t, p, n) => {
    if(n % 3 === 0) scr.redraw(t);
    model.rotation.y = t*0.6;
    if(flipper.v !== flipper.want){ flipper.v = Math.min(flipper.want, flipper.v + dt*6); bd.rotation.x = Math.sin(flipper.v)*0.9; if(Math.abs(flipper.v - (flipper.want - Math.PI/2)) < dt*6){ side = 1 - side; bd.redraw(side); } }
  });
  // rug and armchair on the lower level
  K.cyl(1.7, 1.7, 0.03, '#e98a5a', cx - 1.2, 0.015, 2.2, S, 32).castShadow = false;
  K.box(1.2, 0.5, 1.0, '#4fa3c7', cx - 2.8, 0.25, 2.4); K.box(1.2, 0.9, 0.25, '#3b86a8', cx - 2.8, 0.7, 1.95); K.round(cx - 2.8, 2.3, 0.7);
  K.stop('The study', 'A split-level study: shelving up to the vault, a window seat looking out to sea, and a desk up three steps. The laptop screen keeps combing a tangle of lines into one clean path.', [dx, y0 + 2.6, dz]);
  K.stop('The question', 'Computer science and the pre-dental track keep asking the same question: how does a hard idea become something someone else can use? Press F to flip the board.', [cx + 3.1, 3.0, -D/2 + 4.4]);
}
