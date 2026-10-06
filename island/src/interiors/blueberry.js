// Interior for the "blueberry" zone, plus the shared building kit used by brain, studio, dock,
// school and umd (they import makeTour from here, because a builder may only edit its own files).
//
// The kit builds a row of rooms along x, joined by framed doorways with doors that swing open as
// you walk up. Each room is a SECTION MODEL: the camera looks in from the front, so the front wall
// is cut low, the side walls step down toward you, and the ceiling is shown only over the back half
// (a vault, a dome, a glass roof, a sawtooth, a coffer), the way an architect's cut-away model shows it.
// Room specs pick the plan shape (rect, chamfer, apse, round), the height, the roof and the windows;
// a builder callback fills the room. Static geometry is merged per material after the build.
//
// The kit also runs the room camera (drag to look around; the view holds until you double-click or
// change room), a fallback walker when character.js is not available, proximity prompts ("E  Spin it"),
// click to use, number keys to hop between rooms, room.tour stops for the tour builder, and
// window.__island.tourA for critics.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const tours = new Map();   // zoneId -> tour api, filled as each interior is built
let exposed = false;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a)*t;
export const prng = seed => { let s = seed | 0 || 1; return () => (s = (s*16807) % 2147483647)/2147483647; };

function exposeOnce(ctx){
  if(exposed) return; exposed = true;
  ctx.expose('tourA', {
    zones: () => [...tours.keys()],
    rooms: id => tours.get(id)?.names() ?? null,
    // Enter the building if needed, then stand in room i facing its back wall.
    async go(id, i = 0){
      if(ctx.state.interior?.zoneId !== id){ const ok = await ctx.modes.enterInterior(id); if(!ok) return null; }
      const tour = tours.get(id); if(!tour) return null;
      return tour.goRoom(i, true);
    },
    use: key => { const id = ctx.state.interior?.zoneId; return tours.get(id)?.use(key) ?? false; },
    uses: () => tours.get(ctx.state.interior?.zoneId)?.uses() ?? [],
    where: () => tours.get(ctx.state.interior?.zoneId)?.where() ?? null,
    stops: () => ctx.state.interior?.tour ?? null,
    look: (yaw, pitch) => tours.get(ctx.state.interior?.zoneId)?.look(yaw, pitch) ?? null,
    walkTo: (x, z) => tours.get(ctx.state.interior?.zoneId)?.walkTo(x, z) ?? null,
    debug: (cmd, arg) => tours.get(ctx.state.interior?.zoneId)?.debug(cmd, arg) ?? null,
  });
}

// Textures every building shares: a soft radial glow and a top-bright light shaft.
let shared = null;
function sharedTex(THREE){
  if(shared) return shared;
  const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const glow = mk(64, 64, (g, w) => { const gr = g.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); gr.addColorStop(0, '#ffffffff'); gr.addColorStop(0.35, '#ffffff88'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const shaft = mk(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffffcc'); gr.addColorStop(0.6, '#ffffff44'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const patch = mk(64, 64, (g, w) => { const gr = g.createRadialGradient(w/2, w/2, 4, w/2, w/2, w/2); gr.addColorStop(0, '#ffffffaa'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  return (shared = { glow, shaft, patch });
}

export function makeTour(ctx, kit, spec){
  const { THREE, helpers:H } = ctx;
  const zone = kit.zone;
  const D = spec.depth || 13, T = 0.4, DZ = spec.doorZ ?? 0.4, DW = 2.4, DH = 2.9, LOW = 0.8;
  const ZB = -D/2, ZF = D/2, ZC = DZ + DW/2 + 0.8;          // back, front, where the section cut starts
  const DS = THREE.DoubleSide, TX = sharedTex(THREE);
  const scene = new THREE.Scene();
  const rooms = [], colliders = [], ticks = [], screens = [], uses = [], clickables = [], drags = [], portals = [], tour = [];
  const rnd = prng(zone.id.length*977 + 13);

  // soft two-tone backdrop so the space above the walls reads as a warm dusk, not a void
  const bgTex = H.canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, spec.sky || '#fbe7cf'); gr.addColorStop(1, spec.skyLow || zone.color);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.background = bgTex.tex;
  scene.add(new THREE.HemisphereLight(spec.hemi || '#fff2de', '#7a6858', 1.05));
  const sun = new THREE.DirectionalLight('#ffe4bd', 1.45);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left:-12, right:12, top:12, bottom:-12, near:1, far:60 });
  scene.add(sun, sun.target);

  // The view out of every window: the building's own painting, or a sky with a few clouds.
  const viewTex = H.canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, spec.viewTop || '#bfe3ff'); gr.addColorStop(1, spec.viewLow || '#fff4dc');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if(spec.view) spec.view(g, w, h, H);
    else { g.fillStyle = '#ffffffcc'; for(const [x, y, r] of [[60, 70, 26], [90, 64, 32], [124, 74, 24], [190, 120, 22], [214, 114, 28]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  });

  // ---- layout: rooms side by side along x ----
  const widths = spec.rooms.map(r => r.w || 15);
  const total = widths.reduce((a, b) => a + b, 0) + T*(widths.length - 1);
  let cursor = -total/2;

  // ---- floors ----
  function floorTex(kind, a, b){
    const t = H.canvasTex(128, 128, g => {
      g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b;
      if(kind === 'plank'){ for(let r = 0; r < 4; r++){ g.fillRect(0, r*32 + 30, 128, 2); const o = (r*47) % 128; g.fillRect(o, r*32, 2, 32); g.fillRect((o + 64) % 128, r*32, 2, 32); } }
      else if(kind === 'terrazzo'){ const q = prng(7); for(let k = 0; k < 160; k++){ g.globalAlpha = 0.35 + q()*0.5; g.beginPath(); g.arc(q()*128, q()*128, 1 + q()*2.6, 0, 7); g.fill(); } g.globalAlpha = 1; }
      else if(kind === 'herring'){ for(let y = -32; y < 160; y += 16) for(let x = -32; x < 160; x += 32){ g.save(); g.translate(x + (y/16 % 2)*16, y); g.rotate(Math.PI/4); g.fillRect(0, 0, 30, 2); g.restore(); } }
      else { g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }
    });
    t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; t.tex.repeat.set(0.5, 0.5); return t.tex;
  }

  // ---- text helpers ----
  function wrap(g, text, maxW){
    const words = String(text).split(' '), lines = []; let line = '';
    for(const w of words){ const test = line ? line + ' ' + w : w; if(g.measureText(test).width > maxW && line){ lines.push(line); line = w; } else line = test; }
    if(line) lines.push(line); return lines;
  }
  // A floating pill label that always faces the camera, sized to its text.
  function float(text, x, y, z, opts = {}){
    const size = opts.size || 40, pad = size*0.7;
    const probe = document.createElement('canvas').getContext('2d'); H.F(probe, 600, size);
    const tw = Math.ceil(probe.measureText(text).width + pad*2), th = Math.ceil(size*1.7);
    const t = H.canvasTex(tw, th, g => {
      g.clearRect(0, 0, tw, th); H.F(g, 600, size); H.rr(g, 2, 2, tw - 4, th - 4, (th - 4)/2); g.fillStyle = opts.bg || '#fffaf0'; g.fill();
      g.fillStyle = opts.fg || '#1f2a44'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, tw/2, th/2 + 2);
    });
    screens.push({ t, room:-1, fps:0, last:0 });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t.tex, transparent:true, depthWrite:false }));
    const k = (opts.scale || 1)*0.011; s.scale.set(tw*k, th*k, 1); s.position.set(x, y, z);
    (opts.parent || scene).add(s); return s;
  }
  // A plaque: a plane with a canvas card, title and wrapped subtitle.
  function sign(title, sub, o){
    const w = o.w || 4, h = o.h || 1.2, px = 150;
    const t = H.canvasTex(Math.round(w*px), Math.round(h*px), (g, cw, ch) => {
      g.clearRect(0, 0, cw, ch); H.rr(g, 4, 4, cw - 8, ch - 8, 28); g.fillStyle = o.bg || '#fffaf0'; g.fill();
      g.lineWidth = 6; g.strokeStyle = '#ffffff55'; g.stroke();
      g.fillStyle = o.fg || '#1f2a44'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const big = o.size || Math.min(ch*0.36, 78); H.F(g, 700, big);
      if(sub){
        g.fillText(title, cw/2, ch*0.34);
        H.F(g, 600, Math.round(big*0.46), 'Nunito'); g.globalAlpha = 0.92;
        wrap(g, sub, cw - 60).slice(0, 2).forEach((l, k, a) => g.fillText(l, cw/2, ch*(a.length > 1 ? 0.64 + k*0.2 : 0.7)));
        g.globalAlpha = 1;
      } else g.fillText(title, cw/2, ch/2 + 2);
    });
    screens.push({ t, room:-1, fps:0, last:0 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, transparent:true, toneMapped:false }));
    (o.parent || scene).add(m); return m;
  }
  // A live canvas screen. draw(g, w, h, t). fps 0 = draw once (and again when fonts land).
  function screen(room, sw, sh, draw, o){
    const px = o.px || 128;
    const t = H.canvasTex(Math.round(sw*px), Math.round(sh*px), draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false, transparent:!!o.transparent, side:o.double ? DS : THREE.FrontSide }));
    m.position.set(o.x || 0, o.y || 0, o.z || 0); if(o.rotY) m.rotation.y = o.rotY; if(o.rotX) m.rotation.x = o.rotX;
    (o.parent || scene).add(m);
    const s = { t, room, fps:o.fps || 0, last:0 }; screens.push(s);
    return { mesh:m, t, redraw:time => { t.draw(t.g, t.w, t.h, time ?? performance.now()/1000); t.tex.needsUpdate = true; } };
  }
  const glowMats = new Map();
  function glow(x, y, z, size, color, parent, opacity = 0.8){
    const key = color + opacity;
    if(!glowMats.has(key)) glowMats.set(key, new THREE.SpriteMaterial({ map:TX.glow, color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false }));
    const s = new THREE.Sprite(glowMats.get(key)); s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
  }
  const addMats = new Map();
  const addMat = (map, color, opacity) => { const k = map.uuid + color + opacity; if(!addMats.has(k)) addMats.set(k, new THREE.MeshBasicMaterial({ map, color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false, side:DS })); return addMats.get(k); };

  // A cute blob person: capsule body, eyes, blush, optional cap. Bobs gently.
  function blob(parent, color, x, z, o = {}){
    const b = new THREE.Group(), y0 = o.y || 0; b.position.set(x, y0, z); b.rotation.y = o.face ?? 0; if(o.scale) b.scale.setScalar(o.scale); parent.add(b);
    H.mesh(new THREE.CapsuleGeometry(0.42, 0.42, 6, 16), color, 0, 0.72, 0, b);
    if(H.eyes) H.eyes(b, 0.92, 0.39); else { H.ball(0.065, '#1b1b24', -0.17, 0.92, 0.39, b, 10); H.ball(0.065, '#1b1b24', 0.17, 0.92, 0.39, b, 10); }
    H.ball(0.13, '#2a2a33', -0.18, 0.1, 0.05, b, 10); H.ball(0.13, '#2a2a33', 0.18, 0.1, 0.05, b, 10);
    if(o.cap){ H.cyl(0.36, 0.38, 0.18, o.cap, 0, 1.3, 0, b); H.box(0.4, 0.05, 0.3, o.cap, 0, 1.23, 0.3, b); }
    if(o.leaf){ const l = H.ball(0.14, '#4f9a3a', 0.08, 1.36, 0, b, 8); l.scale.set(1.4, 0.5, 0.8); }
    const phase = x*1.7 + z;
    if(o.bob !== false) ticks.push({ room:-1, fn:(dt, t) => { b.position.y = y0 + Math.abs(Math.sin(t*(o.speed || 2.4) + phase))*(o.amp ?? 0.07); } });
    return b;
  }

  // ---- wall geometry: prisms written straight into one buffer per material ----
  function Buf(){ const P = []; return { P, tri(a, b, c){ P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }, quad(a, b, c, d){ this.tri(a, b, c); this.tri(a, c, d); } }; }
  function bufMesh(buf, material, parent, cast = true){
    if(!buf.P.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.P, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
  }
  // One wall piece on the outline from (x1,z1) to (x2,z2), thickness t pushed outward, bottom yb,
  // top following yt1 -> yt2. The top face goes into the cap buffer so the cut reads as a section.
  function piece(W, C, x1, z1, x2, z2, t, yb1, yb2, yt1, yt2){
    const ux = x2 - x1, uz = z2 - z1, L = Math.hypot(ux, uz); if(L < 1e-4) return;
    const ox = uz/L*t, oz = -ux/L*t;   // outward
    const i1b = [x1, yb1, z1], i2b = [x2, yb2, z2], i1t = [x1, yt1, z1], i2t = [x2, yt2, z2];
    const o1b = [x1 + ox, yb1, z1 + oz], o2b = [x2 + ox, yb2, z2 + oz], o1t = [x1 + ox, yt1, z1 + oz], o2t = [x2 + ox, yt2, z2 + oz];
    W.quad(i1b, i2b, i2t, i1t); W.quad(o1b, o2b, o2t, o1t); W.quad(i1b, o1b, o1t, i1t); W.quad(i2b, o2b, o2t, i2t);
    C.quad(i1t, i2t, o2t, o1t);
    if(yb1 > 0.01) W.quad(i1b, i2b, o2b, o1b);
  }

  // Plan outlines, in room-local coordinates. Each run is a polyline; 'side' runs hold the doorways.
  function shapeOf(rs, w){
    const L = -w/2, R = w/2, c = rs.chamfer || 2.4;
    const z0 = DZ - DW/2 - 0.5, z1 = DZ + DW/2 + 0.5;
    const ell = (zc, rz, a0, a1, n = 20) => { const p = []; for(let k = 0; k <= n; k++){ const a = a0 + (a1 - a0)*k/n; p.push([Math.cos(a)*R, zc + Math.sin(a)*rz]); } return p; };
    switch(rs.shape){
      case 'chamfer': return [
        { kind:'side', pts:[[L, ZF - c], [L, ZB + c]] }, { kind:'back', pts:[[L, ZB + c], [L + c, ZB], [R - c, ZB], [R, ZB + c]] },
        { kind:'side', pts:[[R, ZB + c], [R, ZF - c]] }, { kind:'front', pts:[[R, ZF - c], [R - c, ZF], [L + c, ZF], [L, ZF - c]] }];
      case 'apse': return [
        { kind:'side', pts:[[L, ZF], [L, z0]] }, { kind:'back', pts:ell(z0, z0 - ZB, Math.PI, Math.PI*2), arc:{ zc:z0, rz:z0 - ZB } },
        { kind:'side', pts:[[R, z0], [R, ZF]] }, { kind:'front', pts:[[R, ZF], [L, ZF]] }];
      case 'round': return [
        { kind:'side', pts:[[L, z1], [L, z0]] }, { kind:'back', pts:ell(z0, z0 - ZB, Math.PI, Math.PI*2), arc:{ zc:z0, rz:z0 - ZB } },
        { kind:'side', pts:[[R, z0], [R, z1]] }, { kind:'front', pts:ell(z1, ZF - z1, 0, Math.PI) }];
      default: return [
        { kind:'side', pts:[[L, ZF], [L, ZB]] }, { kind:'back', pts:[[L, ZB], [R, ZB]] },
        { kind:'side', pts:[[R, ZB], [R, ZF]] }, { kind:'front', pts:[[R, ZF], [L, ZF]] }];
    }
  }
  // The roof line seen in section, as a height at each z (back half only).
  function roofOf(rs, h){
    const u = z => z - ZB;
    if(rs.roof === 'barrel'){ const Rv = rs.vault || 3.4; return z => h + Math.sqrt(Math.max(0, Rv*Rv - Math.pow(Math.min(u(z), Rv) - Rv, 2))); }
    if(rs.roof === 'gable' || rs.roof === 'glass'){ const run = rs.run || 5, rise = rs.rise || 2.6; return z => h + Math.min(u(z), run)*rise/run; }
    if(rs.roof === 'sawtooth'){ const n = rs.teeth || 3, Lt = rs.tooth || 1.9, rise = rs.rise || 1.4; return z => h + (u(z) < n*Lt ? (u(z) % Lt)/Lt*rise : 0); }
    return () => h;
  }

  // ---- build each room ----
  spec.rooms.forEach((rs, i) => {
    const w = widths[i], x0 = cursor, cx = x0 + w/2; cursor += w + T;
    const g = new THREE.Group(); g.position.set(cx, 0, 0); scene.add(g);
    const s = new THREE.Group(); g.add(s);      // static: merged per material once the room is built
    const h = rs.h || 4.4, accent = rs.accent || zone.color, wallC = rs.wall || '#f4ead8', capC = rs.cap || '#fffaf0';
    const roofY = roofOf(rs, h);
    const topAt = z => z <= ZC ? roofY(z) : lerp(roofY(ZC), LOW, (z - ZC)/(ZF - ZC));
    const runs = shapeOf(rs, w);
    const first = i === 0, last = i === spec.rooms.length - 1;
    const W = Buf(), C = Buf();
    const wallMat = H.mat(wallC, { side:DS }), capMat = H.mat(capC, { side:DS });
    runs.forEach((run, ri) => {
      const t = run.kind === 'side' ? T/2 : 0.3;
      for(let k = 0; k < run.pts.length - 1; k++){
        const [ax, az] = run.pts[k], [bx, bz] = run.pts[k + 1];
        const L = Math.hypot(bx - ax, bz - az);
        // cut points: doorway edges on side runs, the exit gap on room 0's front
        const cuts = [0, 1];
        const hasDoor = run.kind === 'side' && !((ri === 0 && first) || (ri === 2 && last));
        if(hasDoor) for(const e of [DZ - DW/2, DZ + DW/2]){ const f = (e - az)/(bz - az); if(f > 0 && f < 1) cuts.push(f); }
        if(run.kind === 'front' && first) for(const e of [-1.35, 1.35]){ const f = (e - ax)/(bx - ax); if(bx !== ax && f > 0 && f < 1) cuts.push(f); }
        cuts.sort((a, b) => a - b);
        for(let q = 0; q < cuts.length - 1; q++){
          const span = (cuts[q + 1] - cuts[q])*L, n = Math.max(1, Math.ceil(span/0.7));
          for(let m = 0; m < n; m++){
            const f1 = cuts[q] + (cuts[q + 1] - cuts[q])*m/n, f2 = cuts[q] + (cuts[q + 1] - cuts[q])*(m + 1)/n;
            const p1 = [lerp(ax, bx, f1), lerp(az, bz, f1)], p2 = [lerp(ax, bx, f2), lerp(az, bz, f2)];
            const mx = (p1[0] + p2[0])/2, mz = (p1[1] + p2[1])/2;
            const inDoor = hasDoor && Math.abs(mz - DZ) < DW/2;
            const inExit = run.kind === 'front' && first && Math.abs(mx) < 1.35;
            if(inExit) continue;
            const t1 = run.kind === 'front' ? LOW : topAt(p1[1]), t2 = run.kind === 'front' ? LOW : topAt(p2[1]);
            const yb = inDoor ? DH + 0.3 : 0;
            if(inDoor && Math.min(t1, t2) < yb + 0.1) continue;
            piece(W, C, p1[0], p1[1], p2[0], p2[1], t, yb, yb, t1, t2);
            if(!inDoor){
              const ux = p2[0] - p1[0], uz = p2[1] - p1[1], ll = Math.hypot(ux, uz);
              colliders.push({ kind:'box', x:cx + mx + uz/ll*t/2, z:mz - ux/ll*t/2, ang:Math.atan2(-uz, ux), hw:ll/2 + 0.02, hd:t/2 + 0.05 });
            }
          }
        }
      }
    });
    bufMesh(W, wallMat, s); bufMesh(C, capMat, s, false);
    // skirting along the back runs, so walls sit on the floor with a line
    const skirt = Buf(), skirtMat = H.mat(rs.trim || accent, { side:DS });
    for(const run of runs) if(run.kind === 'back') for(let k = 0; k < run.pts.length - 1; k++){ const [ax, az] = run.pts[k], [bx, bz] = run.pts[k + 1]; const ux = bx - ax, uz = bz - az, L = Math.hypot(ux, uz); const ix = -uz/L*0.06, iz = ux/L*0.06; piece(skirt, skirt, ax + ix, az + iz, bx + ix, bz + iz, 0.06, 0, 0, 0.35, 0.35); }
    bufMesh(skirt, skirtMat, s, false);

    // floor: the plan shape, tiled
    const shp = new THREE.Shape(); const outline = [];
    for(const run of runs) for(const p of run.pts){ const lp = outline[outline.length - 1]; if(!lp || Math.hypot(lp[0] - p[0], lp[1] - p[1]) > 1e-3) outline.push(p); }
    outline.forEach(([x, z], k) => k ? shp.lineTo(x, -z) : shp.moveTo(x, -z));
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(shp), new THREE.MeshStandardMaterial({ map:floorTex(rs.floorKind || 'check', rs.floor || '#e6d2ae', rs.floor2 || '#dcc59c'), roughness:0.85 }));
    fl.rotation.x = -Math.PI/2; fl.position.y = 0.002; fl.receiveShadow = true; g.add(fl);
    // diorama plinth under the room, so the building reads as a model on a table
    const pl = H.box(w + T + 0.02, 0.7, D + T*2 + 0.6, spec.plinth || '#6b4a33', 0, -0.352, 0.3, s); pl.castShadow = false;

    // ---- roof, shown over the back half only ----
    const roofMat = H.mat(rs.ceil || capC, { side:DS });
    const zR = Math.min(ZC - 0.4, ZB + (rs.roofDepth || 4.6));
    const strip = (fn, za, zb, buf, x1 = -w/2, x2 = w/2) => { const n = 14; for(let k = 0; k < n; k++){ const a = lerp(za, zb, k/n), b = lerp(za, zb, (k + 1)/n); buf.quad([x1, fn(a), a], [x2, fn(a), a], [x2, fn(b), b], [x1, fn(b), b]); } };
    const beam = (ax, ay, az, bx, by, bz, th, col, p = s) => { const L = Math.hypot(bx - ax, by - ay, bz - az); const m = H.box(th, th, L, col, (ax + bx)/2, (ay + by)/2, (az + bz)/2, p); m.lookAt(p.localToWorld(new THREE.Vector3(bx, by, bz))); return m; };
    const ribC = rs.rib || accent;
    if(rs.roof === 'barrel' || rs.roof === 'gable'){
      const rb = Buf(); strip(roofY, ZB, zR, rb); bufMesh(rb, roofMat, s, false);
      H.box(w, 0.4, 0.4, ribC, 0, roofY(zR) + 0.1, zR, s);   // the cut edge of the roof
      const n = rs.ribs || 0;
      for(let k = 0; k < n; k++){
        const x = -w/2 + w*(k + 0.5)/n;
        for(let q = 0; q < 8; q++){ const a = lerp(ZB, zR, q/8), b = lerp(ZB, zR, (q + 1)/8); beam(x, roofY(a) - 0.12, a + 0.12, x, roofY(b) - 0.12, b, 0.24, ribC); }
        H.box(0.34, h, 0.2, ribC, x, h/2, ZB + 0.1, s);       // the rib comes down the back wall as a pilaster
      }
    } else if(rs.roof === 'glass'){
      const gb = Buf(); strip(roofY, ZB, zR, gb);
      const gm = bufMesh(gb, new THREE.MeshStandardMaterial({ color:rs.glassTint || '#dff4ff', transparent:true, opacity:0.22, roughness:0.05, side:DS, depthWrite:false }), g, false);
      const mull = rs.rib || '#ffffff', n = Math.round(w/1.6);
      for(let k = 0; k <= n; k++){ const x = -w/2 + w*k/n; beam(x, roofY(ZB), ZB, x, roofY(zR), zR, 0.1, mull); }
      for(let q = 0; q <= 4; q++){ const z = lerp(ZB, zR, q/4); H.box(w, 0.1, 0.1, mull, 0, roofY(z), z, s); }
    } else if(rs.roof === 'sawtooth'){
      const n = rs.teeth || 3, Lt = rs.tooth || 1.9, rise = rs.rise || 1.4, rb = Buf();
      for(let k = 0; k < n; k++){
        const za = ZB + k*Lt, zb = za + Lt - 0.001;
        strip(roofY, za, zb, rb);
        // the north light: a glazed face looking toward you, with mullions
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, rise), new THREE.MeshBasicMaterial({ map:viewTex.tex, color:'#fff7e6', toneMapped:false, side:DS }));
        gl.position.set(0, h + rise/2, zb); g.add(gl);
        for(let m = 0; m <= Math.round(w/1.5); m++) H.box(0.08, rise, 0.1, ribC, -w/2 + m*w/Math.round(w/1.5), h + rise/2, zb, s);
        H.box(w, 0.2, 0.3, ribC, 0, h + 0.05, zb, s);
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(w*0.9, h + 0.6), addMat(TX.shaft, spec.shaft || '#fff1c9', 0.16));
        sh.position.set(0, h/2 + 0.4, zb + h*0.45); sh.rotation.x = -0.9; g.add(sh);
      }
      bufMesh(rb, roofMat, s, false);
      // trusses: steel beams across the room under the teeth
      for(let k = 0; k <= n; k++) H.box(w, 0.22, 0.22, ribC, 0, h - 0.1, ZB + k*Lt + 0.1, s);
    } else if(rs.roof === 'beams' || rs.roof === 'coffer'){
      const rb = Buf(); strip(roofY, ZB, zR, rb); bufMesh(rb, roofMat, s, false);
      const nz = rs.roof === 'coffer' ? 4 : 3, nx = rs.roof === 'coffer' ? Math.round(w/2.2) : 0;
      for(let q = 0; q <= nz; q++) H.box(w, 0.34, 0.26, ribC, 0, h - 0.17, lerp(ZB + 0.15, zR, q/nz), s);
      for(let k = 1; k < nx; k++) H.box(0.24, 0.3, zR - ZB, ribC, -w/2 + w*k/nx, h - 0.15, (ZB + zR)/2, s);
    } else if(rs.roof === 'dome'){
      const arc = runs.find(r => r.arc)?.arc || { zc:ZB + D*0.4, rz:D*0.4 };
      const rh = rs.domeH || 3.2;
      const dm = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14, Math.PI, Math.PI, 0, Math.PI/2), roofMat);
      dm.scale.set(w/2, rh, arc.rz); dm.position.set(0, h, arc.zc); dm.receiveShadow = true; g.add(dm);
      const nr = rs.ribs || 9;
      for(let k = 0; k <= nr; k++){
        const a = Math.PI + Math.PI*k/nr, pts = [];
        for(let q = 0; q <= 8; q++){ const th = q/8*Math.PI/2; pts.push([-Math.cos(a)*Math.sin(th)*w/2*0.985, h + Math.cos(th)*rh*0.985, arc.zc + Math.sin(a)*Math.sin(th)*arc.rz*0.985]); }
        for(let q = 0; q < 8; q++) beam(pts[q][0], pts[q][1], pts[q][2], pts[q + 1][0], pts[q + 1][1], pts[q + 1][2], 0.16, ribC);
      }
      // oculus: a bright ring at the crown and a shaft of light straight down
      const oc = H.mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 28), ribC, 0, h + rh - 0.05, arc.zc, s); oc.rotation.x = Math.PI/2;
      glow(0, h + rh - 0.2, arc.zc, 3.2, '#fff4d6', g, 0.9);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.9, h + rh, 24, 1, true), addMat(TX.shaft, spec.shaft || '#fff1c9', 0.22));
      cone.position.set(0, (h + rh)/2, arc.zc); g.add(cone);
      const pat = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), addMat(TX.patch, spec.shaft || '#fff1c9', 0.35)); pat.rotation.x = -Math.PI/2; pat.position.set(0, 0.02, arc.zc); g.add(pat);
    } else {
      H.box(w, 0.3, 0.5, ribC, 0, h - 0.15, ZB + 0.25, s);    // plain cornice
    }

    // ---- windows on the back run, with light shafts ----
    if(rs.windows){
      const wo = Object.assign({ n:3, y:h*0.62, w:1.2, h:1.8, arch:false, round:false, shafts:true }, rs.windows);
      const back = runs.find(r => r.kind === 'back');
      const seg = []; let len = 0;
      for(let k = 0; k < back.pts.length - 1; k++){ const a = back.pts[k], b = back.pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, L, s:len }); len += L; }
      const glassMat = new THREE.MeshBasicMaterial({ map:viewTex.tex, toneMapped:false, side:DS });
      let wGeo;
      if(wo.round) wGeo = new THREE.CircleGeometry(wo.w/2, 28);
      else if(wo.arch){ const sh = new THREE.Shape(); const hw = wo.w/2, hh = wo.h/2; sh.moveTo(-hw, -hh); sh.lineTo(hw, -hh); sh.lineTo(hw, hh - hw); sh.absarc(0, hh - hw, hw, 0, Math.PI, false); sh.lineTo(-hw, -hh); wGeo = new THREE.ShapeGeometry(sh, 16); }
      else wGeo = new THREE.PlaneGeometry(wo.w, wo.h);
      const at = wo.at || Array.from({ length:wo.n }, (_, k) => (k + 0.5)/wo.n);
      for(const f of at){
        const d = f*len, sg = seg.find(q => d <= q.s + q.L + 1e-6) || seg[seg.length - 1], ff = (d - sg.s)/sg.L;
        const px = lerp(sg.a[0], sg.b[0], ff), pz = lerp(sg.a[1], sg.b[1], ff);
        const ux = (sg.b[0] - sg.a[0])/sg.L, uz = (sg.b[1] - sg.a[1])/sg.L, nx = -uz, nz = ux;   // inward
        const rot = Math.atan2(nx, nz);
        const gw = new THREE.Mesh(wGeo, glassMat); gw.position.set(px + nx*0.03, wo.y, pz + nz*0.03); gw.rotation.y = rot; g.add(gw);
        // frame and mullions
        const fr = new THREE.Group(); fr.position.copy(gw.position); fr.rotation.y = rot; s.add(fr);
        const fc = rs.frame || '#fffaf0';
        if(wo.round){ const t = H.mesh(new THREE.TorusGeometry(wo.w/2, 0.07, 6, 28), fc, 0, 0, 0.02, fr); H.box(wo.w, 0.06, 0.06, fc, 0, 0, 0.03, fr); H.box(0.06, wo.w, 0.06, fc, 0, 0, 0.03, fr); }
        else {
          const hh = wo.arch ? wo.h - wo.w/2 : wo.h;
          H.box(0.1, hh, 0.1, fc, -wo.w/2, (hh - wo.h)/2, 0.03, fr); H.box(0.1, hh, 0.1, fc, wo.w/2, (hh - wo.h)/2, 0.03, fr);
          H.box(wo.w + 0.3, 0.12, 0.26, fc, 0, -wo.h/2 - 0.04, 0.1, fr);
          H.box(0.06, wo.h, 0.06, fc, 0, 0, 0.04, fr); H.box(wo.w, 0.06, 0.06, fc, 0, wo.h*0.1, 0.04, fr);
          if(wo.arch){ const t = H.mesh(new THREE.TorusGeometry(wo.w/2, 0.06, 6, 20, Math.PI), fc, 0, wo.h/2 - wo.w/2, 0.03, fr); }
          else H.box(wo.w + 0.1, 0.1, 0.1, fc, 0, wo.h/2, 0.03, fr);
        }
        if(wo.shafts){
          const yTop = wo.y + wo.h*0.3, reach = yTop*0.85;
          const geo = new THREE.BufferGeometry();
          const hw = wo.w*0.55, lx = -uz*0 + ux*hw, lz = uz*hw;   // along the wall
          const v = [px - ux*hw + nx*0.05, yTop, pz - uz*hw + nz*0.05, px + ux*hw + nx*0.05, yTop, pz + uz*hw + nz*0.05,
                     px + ux*hw*1.5 + nx*reach, 0.03, pz + uz*hw*1.5 + nz*reach, px - ux*hw*1.5 + nx*reach, 0.03, pz - uz*hw*1.5 + nz*reach];
          geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
          g.add(new THREE.Mesh(geo, addMat(TX.shaft, spec.shaft || '#fff1c9', 0.2)));
          const pat = new THREE.Mesh(new THREE.PlaneGeometry(wo.w*2.2, wo.w*1.6), addMat(TX.patch, spec.shaft || '#fff1c9', 0.28));
          pat.rotation.x = -Math.PI/2; pat.rotation.z = -rot; pat.position.set(px + nx*reach*0.95, 0.025, pz + nz*reach*0.95); g.add(pat);
        }
      }
    }

    // title plaque high on the back wall
    if(rs.plaque !== false){
      const pz = runs.find(r => r.kind === 'back').pts.reduce((a, p) => Math.max(a, p[1]), -99);
      const plaque = sign(rs.name, rs.sub || '', { w:Math.min(6.4, w - 3), h:1.05, bg:accent, fg:'#ffffff', parent:g });
      const py = rs.plaqueY ?? Math.min(h - 0.75, 3.9);
      plaque.position.set(rs.plaqueX || 0, py, (rs.shape === 'apse' || rs.shape === 'round') ? ZB + 0.25 : ZB + 0.08);
      if(pz > ZB + 0.5 && rs.shape === 'chamfer') plaque.position.z = ZB + 0.08;
    }
    const lamp = new THREE.PointLight(rs.light || '#ffd29a', rs.lightI ?? 16, 16, 1.5); lamp.position.set(0, Math.min(h - 0.4, 4), 0.6); g.add(lamp);

    const R = {
      i, g, s, cx, w, d:D, h, zone, THREE, H, ctx, accent, back:ZB, front:ZF, doorZ:DZ, rnd,
      box:(a, b, c, col, x, y, z, p = s) => H.box(a, b, c, col, x, y, z, p),
      cyl:(a, b, c, col, x, y, z, p = s, n) => H.cyl(a, b, c, col, x, y, z, p, n),
      ball:(r, col, x, y, z, p = s, n) => H.ball(r, col, x, y, z, p, n),
      mesh:(geo, col, x, y, z, p = s, o) => H.mesh(geo, col, x, y, z, p, o),
      beam,
      group:(x = 0, y = 0, z = 0, p = g) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; },
      solid:(x, z, hw, hd, ang = 0) => colliders.push({ kind:'box', x:cx + x, z, ang, hw, hd }),
      solidR:(x, z, r) => colliders.push({ kind:'circle', x:cx + x, z, r }),
      sign:(title, sub, o = {}) => sign(title, sub, Object.assign({ parent:g }, o)),
      screen:(sw, sh, draw, o = {}) => screen(i, sw, sh, draw, Object.assign({ parent:g }, o)),
      float:(text, x, y, z, o = {}) => float(text, x, y, z, Object.assign({ parent:g }, o)),
      glow:(x, y, z, size, color, p = g, op) => glow(x, y, z, size, color, p, op),
      tick:fn => ticks.push({ fn, room:i }),
      use:u => { const e = Object.assign({ r:1.9, y:2.3, z:0 }, u, { x:cx + u.x, room:i }); uses.push(e); if(u.hit) (Array.isArray(u.hit) ? u.hit : [u.hit]).forEach(o => clickables.push({ o, e })); return e; },
      drag:(mesh, d) => drags.push(Object.assign({ mesh, room:i }, d)),
      stop:(title, text, x, y, z) => tour.push({ id:`${zone.id}-${tour.length + 1}`, title, text, at:[+(cx + x).toFixed(2), y, z], room:i }),
      blob:(col, x, z, o) => blob(g, col, x, z, o),
      chime:(f = 660) => { try { if(ctx.sound?.on){ ctx.sound.tone(f, 0.12, 'sine', 0.08); setTimeout(() => ctx.sound.tone(f*1.5, 0.16, 'sine', 0.07), 90); } } catch(e){} },
      buzz:() => { try { if(ctx.sound?.on) ctx.sound.tone(180, 0.22, 'square', 0.05, 120); } catch(e){} },
      wrap,
      addMat, tex:TX, viewTex,
    };
    // A classical column with base and capital. Solid.
    R.column = (x, z, hc, o = {}) => {
      const r = o.r || 0.24, col = o.color || '#fffaf0', cap = o.cap || col;
      R.box(r*3, 0.22, r*3, cap, x, 0.11, z); R.cyl(r, r*1.08, hc - 0.44, col, x, hc/2, z, s, 14); R.box(r*3.1, 0.22, r*3.1, cap, x, hc - 0.11, z);
      if(o.fluted) for(let k = 0; k < 8; k++){ const a = k/8*Math.PI*2; R.box(0.05, hc - 0.6, 0.05, cap, x + Math.cos(a)*r*1.02, hc/2, z + Math.sin(a)*r*1.02); }
      if(o.solid !== false) R.solidR(x, z, r*1.5);
    };
    // Built-in shelving full of books (or jars, or binders). Merged with the room.
    R.shelf = (x, z, sw, sh, o = {}) => {
      const grp = R.group(x, 0, z, s); grp.rotation.y = o.rotY || 0;
      const wood = o.wood || '#8a5a3c', dp = o.depth || 0.45, rows = Math.max(2, Math.floor(sh/0.55)), q = prng(Math.round(x*31 + z*17 + sw*7) + 5);
      const pal = o.colors || ['#3b4f9e', '#e58a3b', '#35a36a', '#d6689a', '#ffd166', '#8a5cc2', '#e5484d', '#f4ead8'];
      H.box(sw, sh, 0.06, o.backC || '#5d3b27', 0, sh/2, -dp/2 + 0.03, grp);
      for(const sx of [-1, 1]) H.box(0.08, sh, dp, wood, sx*(sw/2 - 0.04), sh/2, 0, grp);
      for(let r = 0; r <= rows; r++) H.box(sw, 0.06, dp, wood, 0, r*sh/rows + 0.03, 0, grp);
      if(o.books !== false) for(let r = 0; r < rows; r++){
        let bx = -sw/2 + 0.12; const y0 = r*sh/rows + 0.06, room = sh/rows - 0.12;
        while(bx < sw/2 - 0.2){
          const bw = 0.06 + q()*0.07, bh = room*(0.6 + q()*0.35);
          if(q() < 0.08){ bx += 0.25; continue; }
          const b = H.box(bw, bh, dp*0.7, pal[(q()*pal.length)|0], bx + bw/2, y0 + bh/2, 0.02, grp);
          if(q() < 0.1){ b.rotation.z = 0.25; b.position.x += 0.06; }
          bx += bw + 0.012;
        }
      }
      if(o.solid !== false){ const c = Math.cos(o.rotY || 0), sn = Math.sin(o.rotY || 0); R.solid(x, z, Math.abs(c)*sw/2 + Math.abs(sn)*dp/2 + 0.05, Math.abs(sn)*sw/2 + Math.abs(c)*dp/2 + 0.05); }
      return grp;
    };
    // A raised platform with steps down toward the front. Solid, because the walker has no height.
    R.dais = (x, z, dw, dd, dh, o = {}) => {
      const col = o.color || '#c9b28e', edge = o.edge || accent, n = Math.max(1, Math.round(dh/0.16));
      R.box(dw, dh, dd, col, x, dh/2, z); R.box(dw + 0.04, 0.06, dd + 0.04, edge, x, dh - 0.03, z);
      for(let k = 0; k < n; k++){ const sh = dh*(n - k)/(n + 1); R.box(o.stepW || dw*0.5, sh, 0.34, col, x + (o.stepX || 0), sh/2, z + dd/2 + 0.17 + k*0.34); }
      R.solid(x, z + n*0.17, dw/2, dd/2 + n*0.17);
    };
    // A balcony along the back at height y, on columns, with a rail. People can stand on it.
    R.mezz = (x0m, x1m, zb, depth, y, o = {}) => {
      const col = o.color || capC, rail = o.rail || accent, xm = (x0m + x1m)/2, wm = x1m - x0m;
      R.box(wm, 0.3, depth, col, xm, y - 0.15, zb + depth/2); R.box(wm, 0.34, 0.12, rail, xm, y - 0.17, zb + depth + 0.02);
      const n = Math.max(2, Math.round(wm/2.6));
      for(let k = 0; k <= n; k++){ const px = x0m + wm*k/n; R.cyl(0.13, 0.15, y - 0.3, o.post || rail, px, (y - 0.3)/2, zb + depth - 0.2, s, 10); R.solidR(px, zb + depth - 0.2, 0.25); }
      const nr = Math.round(wm/0.35);
      for(let k = 0; k <= nr; k++) R.box(0.04, 0.9, 0.04, rail, x0m + wm*k/nr, y + 0.45, zb + depth - 0.05);
      R.box(wm, 0.08, 0.14, rail, xm, y + 0.92, zb + depth - 0.05);
    };
    // A spiral stair around a post, rising to height y.
    R.spiral = (x, z, y, o = {}) => {
      const n = o.steps || 16, col = o.color || capC, post = o.post || accent;
      R.cyl(0.12, 0.12, y + 1, post, x, (y + 1)/2, z, s, 10);
      for(let k = 0; k < n; k++){ const a = (o.a0 || 0) + k/n*Math.PI*1.6, st = H.box(1.0, 0.07, 0.34, col, x + Math.cos(a)*0.5, (k + 1)*y/n, z - Math.sin(a)*0.5, s); st.rotation.y = a; }
      R.solidR(x, z, 1.05);
    };
    // Practical lamps. Only the room light is real; these are bright shades with a soft glow.
    R.lamp = (kind, x, y, z, o = {}) => {
      const shade = o.shade || '#fffaf0', warm = o.glow || '#ffd89a', p = o.parent || s;
      const bulb = new THREE.MeshBasicMaterial({ color:'#fff4d8' });
      if(kind === 'pendant'){
        const top = o.top ?? h;
        R.cyl(0.015, 0.015, top - y, '#2a2a33', x, (top + y)/2, z, p, 4);
        const sh = R.cyl(0.07, 0.34, 0.26, shade, x, y, z, p, 18);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bulb); b.position.set(x, y - 0.12, z); g.add(b);
        glow(x, y - 0.25, z, 1.8, warm, g, 0.7);
      } else if(kind === 'floor'){
        R.cyl(0.18, 0.2, 0.05, '#2a2a33', x, 0.03, z, p, 12); R.cyl(0.025, 0.025, y, '#2a2a33', x, y/2, z, p, 6);
        R.cyl(0.18, 0.28, 0.34, shade, x, y + 0.1, z, p, 16);
        glow(x, y + 0.05, z, 1.6, warm, g, 0.65); R.solidR(x, z, 0.3);
      } else if(kind === 'sconce'){
        R.box(0.12, 0.3, 0.1, '#2a2a33', x, y, z, p); const c = R.cyl(0.16, 0.08, 0.2, shade, x, y + 0.12, z + 0.12, p, 12);
        glow(x, y + 0.35, z + 0.12, 1.5, warm, g, 0.6);
      } else {   // desk
        R.cyl(0.1, 0.12, 0.04, '#2a2a33', x, y + 0.02, z, p, 10); R.cyl(0.018, 0.018, 0.4, '#2a2a33', x, y + 0.22, z, p, 5);
        R.cyl(0.05, 0.14, 0.14, shade, x, y + 0.44, z, p, 12); glow(x, y + 0.38, z, 0.9, warm, g, 0.6);
      }
    };
    rooms.push({ name:rs.name, sub:rs.sub || '', cx, w, h, x0, x1:x0 + w, cam:rs.cam, R });
    try { rs.build?.(R); } catch(e){ console.error(`[interiors] ${zone.id} room "${rs.name}" failed to build`, e); }
    mergeStatic(s);
  });

  // ---- doorways between rooms: a framed portal, two doors that swing open, a plaque with the next room ----
  const portalStatic = new THREE.Group(); scene.add(portalStatic);
  function portal(px, pz, axis, accentC, labels){
    // axis 'x': the doorway is in a divider at x = px (you walk along x); 'z': in a front wall at z = pz
    const frame = new THREE.Group(); frame.position.set(px, 0, pz); if(axis === 'z') frame.rotation.y = Math.PI/2; portalStatic.add(frame);
    const fc = accentC, th = T + 0.24;
    for(const sz of [-1, 1]){ H.box(th, DH + 0.2, 0.3, fc, 0, (DH + 0.2)/2, sz*(DW/2 + 0.15), frame); H.box(th + 0.1, 0.3, 0.44, fc, 0, 0.15, sz*(DW/2 + 0.15), frame); }
    H.box(th + 0.1, 0.36, DW + 0.9, fc, 0, DH + 0.3, 0, frame);
    H.box(th + 0.16, 0.12, DW + 1.1, '#fffaf0', 0, DH + 0.52, 0, frame);
    const key = H.box(th + 0.14, 0.5, 0.42, '#fffaf0', 0, DH + 0.33, 0, frame);
    // the doors: hinged at the jambs, glazed with a porthole, swing away from whoever walks up
    const leaves = [];
    const leafMat = H.mat(fc), glassM = new THREE.MeshBasicMaterial({ color:'#fff4d6' });
    for(const sz of [-1, 1]){
      const hinge = new THREE.Group(); hinge.position.set(px, 0, pz); if(axis === 'z') hinge.rotation.y = Math.PI/2; scene.add(hinge);
      const piv = new THREE.Group(); piv.position.set(0, 0, sz*DW/2); hinge.add(piv);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, DH - 0.06, DW/2 - 0.04), leafMat); leaf.position.set(0, DH/2, -sz*DW/4); leaf.castShadow = true; piv.add(leaf);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), glassM); win.position.set(0.05, DH*0.66, -sz*DW/4); win.rotation.y = Math.PI/2; piv.add(win);
      const win2 = win.clone(); win2.position.x = -0.05; win2.rotation.y = -Math.PI/2; piv.add(win2);
      H.box(0.14, 0.04, 0.3, '#2a2a33', 0, DH*0.45, -sz*(DW/2 - 0.2), piv);
      leaves.push({ piv, sz });
    }
    const p = { x:px, z:pz, axis, leaves, open:0, dir:1, labels };
    portals.push(p); return p;
  }
  rooms.forEach((r, k) => {
    if(k === rooms.length - 1) return;
    const next = rooms[k + 1], nAcc = spec.rooms[k + 1].accent || zone.color, bx = r.x1 + T/2;
    const fwd = float(`Next: ${next.name}  →`, bx - 0.25, DH + 1.25, DZ + 0.3, { size:30, bg:nAcc, fg:'#ffffff', scale:0.85 });
    const bwd = float(`←  ${r.name}`, bx + 0.25, DH + 1.25, DZ + 0.3, { size:30, bg:spec.rooms[k].accent || zone.color, fg:'#ffffff', scale:0.85 });
    fwd.center.set(1, 0.5); bwd.center.set(0, 0.5);   // anchor at the wall edge so a long room name never runs behind the partition
    const p = portal(bx, DZ, 'x', nAcc, { fwd, bwd, a:k, b:k + 1 });
    clickables.push({ o:fwd, e:{ label:'go', room:k, fn:() => goRoom(k + 1, false), silent:true } });
    clickables.push({ o:bwd, e:{ label:'go', room:k + 1, fn:() => goRoom(k, false), silent:true } });
  });
  const exitP = portal(rooms[0].cx, ZF + 0.02, 'z', spec.rooms[0].accent || zone.color, null);
  exitP.exit = true;
  float('Exit  (Esc)', rooms[0].cx, DH + 1.15, ZF + 0.2, { bg:'#1f2a44', fg:'#ffffff', size:30, scale:0.8 });
  { const mat = H.box(2.4, 0.03, 1.2, spec.rooms[0].accent || zone.color, rooms[0].cx, 0.02, ZF - 0.9, portalStatic); mat.castShadow = false; }
  mergeStatic(portalStatic);

  // Merge every opaque standard-material mesh under a static group into one mesh per material.
  function mergeStatic(root){
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mtx = new THREE.Matrix4();
    const buckets = new Map(), drop = [];
    root.traverse(o => {
      if(!o.isMesh || o === root) return;
      const m = o.material;
      if(Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.map) return;
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for(const k of Object.keys(geo.attributes)) if(k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
      geo.applyMatrix4(mtx.multiplyMatrices(inv, o.matrixWorld));
      const key = m.uuid + (o.castShadow ? 's' : 'n');
      if(!buckets.has(key)) buckets.set(key, { m, cast:o.castShadow, list:[] });
      buckets.get(key).list.push(geo); drop.push(o);
    });
    for(const o of drop){ o.parent.remove(o); o.geometry.dispose?.(); }
    for(const { m, cast, list } of buckets.values()){
      const geo = mergeGeometries(list, false); if(!geo) continue;
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; root.add(mesh);
    }
  }

  // ---- shared prompt sprite ("E  label") ----
  const prompt = (() => {
    const c = H.canvasTex(512, 96, () => {});
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:c.tex, transparent:true, depthTest:false }));
    s.renderOrder = 10; s.visible = false; scene.add(s);
    let shown = null;
    function set(u){
      if(u === shown) return; shown = u; s.visible = !!u; if(!u) return;
      const g = c.g; g.clearRect(0, 0, 512, 96); H.F(g, 600, 38);
      const tw = Math.min(500, g.measureText(u.label).width + 110);
      H.rr(g, (512 - tw)/2, 8, tw, 80, 40); g.fillStyle = '#1f2a44'; g.fill();
      H.rr(g, (512 - tw)/2 + 12, 20, 56, 56, 14); g.fillStyle = '#fffaf0'; g.fill();
      g.fillStyle = '#1f2a44'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('F', (512 - tw)/2 + 40, 50);
      g.fillStyle = '#fffaf0'; g.textAlign = 'left'; g.fillText(u.label, (512 - tw)/2 + 84, 50);
      c.tex.needsUpdate = true; s.scale.set(3.6, 0.675, 1);
    }
    return { s, set, get: () => shown };
  })();

  // ---- fallback walker (only while character.js has no real walker) ----
  const avatar = new THREE.Group(); scene.add(avatar); avatar.visible = false;
  {
    H.mesh(new THREE.CapsuleGeometry(0.34, 0.34, 6, 14), '#fffaf0', 0, 0.6, 0, avatar);
    if(H.eyes) H.eyes(avatar, 0.76, 0.32, 0.14, 0.055);
    H.cyl(0.3, 0.32, 0.14, zone.color, 0, 1.08, 0, avatar); H.box(0.34, 0.04, 0.26, zone.color, 0, 1.02, 0.26, avatar);
  }
  const walkerMode = () => !ctx.modules.character?.available;
  function collide(p, r){
    for(const c of colliders){
      if(c.kind === 'circle'){
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if(d < m && d > 1e-6){ p.x = c.x + dx/d*m; p.z = c.z + dz/d*m; }
      } else {
        const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = p.x - c.x, dz = p.z - c.z;
        let lx = dx*co - dz*si, lz = dx*si + dz*co;
        const qx = clamp(lx, -c.hw, c.hw), qz = clamp(lz, -c.hd, c.hd), ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
        if(d < r){
          if(d < 1e-5){ const ox = c.hw - Math.abs(lx), oz = c.hd - Math.abs(lz); if(ox < oz) lx = Math.sign(lx || 1)*(c.hw + r); else lz = Math.sign(lz || 1)*(c.hd + r); }
          else { lx = qx + ex/d*r; lz = qz + ez/d*r; }
          p.x = c.x + lx*co + lz*si; p.z = c.z - lx*si + lz*co;
        }
      }
    }
    p.x = clamp(p.x, -total/2 + r, total/2 - r); p.z = clamp(p.z, ZB + r, ZF + 0.6);
  }

  // ---- camera: framed per room, follows the player a little, drag to look around (the view holds) ----
  const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 0.5, 220);
  const cam = { x:rooms[0].cx, ty:1, tz:-0.6, dist:19, pitch:0.56 }, look = { yaw:0, pitch:0 };
  let cur = -1, toastEl = null, toastTimer = 0, offs = [];
  const roomAt = x => { for(let k = 0; k < rooms.length; k++) if(x < rooms[k].x1 + T/2) return k; return rooms.length - 1; };
  function camWant(r){
    const c = r.cam || {}, extra = Math.max(0, r.h - 4.4);
    return { ty:c.ty ?? 1 + extra*0.42, dist:c.dist ?? 19.5 + extra*1.25, pitch:c.pitch ?? 0.56 - extra*0.025, tz:c.tz ?? -0.8 };
  }
  function placeCam(dt, snap){
    const P = room.player || room.spawn, r = rooms[roomAt(P.x)], want = camWant(r);
    const fx = r.cx + clamp(P.x - r.cx, -r.w/2, r.w/2)*0.3;
    const a = snap ? 1 : 1 - Math.exp(-4*dt);
    cam.x += (fx - cam.x)*a; cam.ty += (want.ty - cam.ty)*a; cam.dist += (want.dist - cam.dist)*a; cam.pitch += (want.pitch - cam.pitch)*a;
    cam.tz += (want.tz + clamp(P.z, ZB, ZF)*0.12 - cam.tz)*a;
    const dist = cam.dist*(ctx.state.zoom || 1), p = cam.pitch + look.pitch, y = look.yaw;
    camera.position.set(cam.x + Math.sin(y)*Math.cos(p)*dist, cam.ty + Math.sin(p)*dist, cam.tz + Math.cos(y)*Math.cos(p)*dist);
    camera.lookAt(cam.x, cam.ty, cam.tz);
    sun.position.set(cam.x + 7, 18, 11); sun.target.position.set(cam.x, 0, 0);
  }

  function toast(k){
    if(!toastEl) return;
    const r = rooms[k];
    toastEl.innerHTML = `<b style="color:${zone.color}">${zone.name}</b> <span style="opacity:.55">· room ${k + 1} of ${rooms.length}</span><br><span style="font:700 20px/1.2 Fredoka,system-ui,sans-serif">${r.name}</span>`;
    toastEl.style.opacity = '1'; toastEl.style.transform = 'translate(-50%,0)'; toastTimer = 3.2;
  }
  function useEntry(e){
    if(!e) return false;
    try { e.fn(performance.now()/1000); if(!e.silent) rooms[e.room]?.R.chime(e.pitch || 660); } catch(err){ console.error(`[interiors] ${zone.id} "${e.label}" failed`, err); }
    return true;
  }
  function nearest(){
    const P = room.player; if(!P) return null; let best = null, bd = 1e9;
    for(const u of uses){ const d = Math.hypot(P.x - u.x, P.z - u.z); if(d < u.r && d < bd){ bd = d; best = u; } }
    return best;
  }
  function place(x, z, heading){
    const P = room.player || (room.player = { x, z, heading, speed:0 });
    P.x = x; P.z = z; P.heading = heading; P.speed = 0;
    const ch = ctx.modules.character;
    try { ch?.placeInRoom?.(x, z, heading); } catch(e){}
  }
  function goRoom(k, snap){
    k = clamp(k|0, 0, rooms.length - 1); const r = rooms[k];
    place(r.cx + (spec.rooms[k].spot?.[0] || 0), spec.rooms[k].spot?.[1] ?? ZF - 2.4, Math.PI);
    look.yaw = 0; look.pitch = 0;
    if(snap) placeCam(0, true);
    return r.name;
  }

  // pointer: drag a screen (the mechanism board), click a thing to use it, or drag anywhere to look around
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let press = null, dragging = null;
  function cast(ev, objs){
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ndc.set((ev.clientX - rect.left)/rect.width*2 - 1, -(ev.clientY - rect.top)/rect.height*2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(objs, true);
  }
  function onDown(ev){
    if(ctx.state.interior !== room || (ev.button !== 0 && ev.button !== 2)) return;
    if(ev.button === 0 && drags.length){
      const live = drags.filter(d => d.room === cur);
      const hit = live.length ? cast(ev, live.map(d => d.mesh))[0] : null;
      if(hit){ const d = live.find(q => q.mesh === hit.object); if(d && hit.uv){ dragging = { d, uv:hit.uv.clone() }; d.down?.(hit.uv.x, hit.uv.y); return; } }
    }
    press = { x:ev.clientX, y:ev.clientY, yaw:look.yaw, pitch:look.pitch, moved:false, button:ev.button, ev };
  }
  function onMove(ev){
    if(ctx.state.interior !== room) return;
    if(dragging){ const hit = cast(ev, [dragging.d.mesh])[0]; if(hit?.uv){ dragging.uv.copy(hit.uv); dragging.d.move?.(hit.uv.x, hit.uv.y); } return; }
    if(!press) return;
    const dx = ev.clientX - press.x, dy = ev.clientY - press.y;
    if(!press.moved && Math.hypot(dx, dy) > 6) press.moved = true;
    if(press.moved){ look.yaw = clamp(press.yaw - dx*0.0042, -0.75, 0.75); look.pitch = clamp(press.pitch + dy*0.003, -0.32, 0.4); }
  }
  function onUp(ev){
    if(dragging){ const d = dragging.d, uv = dragging.uv; dragging = null; d.up?.(uv.x, uv.y); return; }
    if(!press) return;
    const p = press; press = null;
    if(p.moved || p.button !== 0 || ctx.state.interior !== room) return;
    const hits = cast(ev, clickables.map(c => c.o).filter(o => o.visible !== false));
    if(!hits.length) return;
    for(const c of clickables){ let o = hits[0].object; while(o){ if(o === c.o){ useEntry(c.e); return; } o = o.parent; } }
  }
  const onDbl = () => { if(ctx.state.interior === room){ look.yaw = 0; look.pitch = 0; } };
  const noMenu = ev => { if(ctx.state.interior === room) ev.preventDefault(); };

  const room = {
    scene, camera, cameraLocked:true, tour,
    spawn: { x:rooms[0].cx, z:ZF - 2.0, heading:Math.PI },
    exit: { x:rooms[0].cx, z:ZF + 0.1, r:1.1 },
    colliders,
    bounds: { minX:-total/2, maxX:total/2, minZ:ZB, maxZ:ZF + 0.6 },
    tourRooms: rooms.map(r => ({ name:r.name, cx:r.cx, w:r.w })),
    onEnter(){
      cur = -1; look.yaw = 0; look.pitch = 0; placeCam(0, true);
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;top:18px;transform:translate(-50%,-8px);background:#fffaf0;color:#1f2a44;padding:10px 20px 12px;border-radius:22px;box-shadow:0 5px 0 #0000001f;font:600 13px/1.35 Fredoka,system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .35s,transform .35s;z-index:30';
      document.body.appendChild(toastEl);
      const hint = () => ctx.hud?.setHint?.('interior', `<kbd>WASD</kbd> walk · <kbd>F</kbd> use · drag to look · <kbd>1</kbd>-<kbd>${rooms.length}</kbd> rooms · <kbd>Esc</kbd> leave`);
      hint(); setTimeout(() => { if(ctx.state.interior === room) hint(); }, 0);
      offs.push(ctx.bus.on('action:interact', () => { if(ctx.state.interior === room) useEntry(nearest()); }));
      offs.push(ctx.bus.on('key', ({ code, down, repeat }) => {
        if(ctx.state.interior !== room || !down || repeat) return;
        const m = /^Digit([1-9])$/.exec(code); if(m && +m[1] <= rooms.length) goRoom(+m[1] - 1, false);
      }));
      const el = ctx.renderer.domElement;
      el.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
      el.addEventListener('dblclick', onDbl); el.addEventListener('contextmenu', noMenu);
      if(document.fonts?.ready) document.fonts.ready.then(() => { for(const s of screens){ try { s.t.draw(s.t.g, s.t.w, s.t.h, performance.now()/1000); s.t.tex.needsUpdate = true; } catch(e){} } });
      try { spec.onEnter?.(ctx, room); } catch(e){ console.error(e); }
    },
    onExit(){
      for(const off of offs) try { off(); } catch(e){}
      offs = []; toastEl?.remove(); toastEl = null; prompt.set(null); press = null; dragging = null;
      const el = ctx.renderer.domElement;
      el.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
      el.removeEventListener('dblclick', onDbl); el.removeEventListener('contextmenu', noMenu);
    },
    update(dt, t){
      const P = room.player; if(!P) return;
      const walker = walkerMode(); avatar.visible = walker;
      if(walker){
        const k = ctx.input.keys, ix = (k.right ? 1 : 0) - (k.left ? 1 : 0), iz = (k.down ? 1 : 0) - (k.up ? 1 : 0);
        const sp = k.boost ? 7.5 : 5;
        if(ix || iz){ const n = Math.hypot(ix, iz); P.x += ix/n*sp*dt; P.z += iz/n*sp*dt; P.heading = Math.atan2(ix, iz); P.speed = sp; } else P.speed = 0;
        collide(P, 0.4);
        avatar.position.set(P.x, P.speed ? Math.abs(Math.sin(t*12))*0.12 : 0, P.z);
        avatar.rotation.y = H.lerpAngle(avatar.rotation.y, P.heading, 1 - Math.exp(-14*dt));
        if(Math.hypot(P.x - room.exit.x, P.z - room.exit.z) < room.exit.r && iz > 0){ ctx.modes.exitInterior(); return; }
      }
      const k = roomAt(P.x);
      if(k !== cur){ cur = k; toast(k); }
      if(toastTimer > 0){ toastTimer -= dt; if(toastTimer <= 0 && toastEl){ toastEl.style.opacity = '0'; toastEl.style.transform = 'translate(-50%,-8px)'; } }
      // doors swing open as you come near, away from you
      for(const p of portals){
        const d = Math.hypot(P.x - p.x, P.z - p.z), want = d < 3.6 ? 1 : 0;
        if(p.open < 0.02) p.dir = p.axis === 'x' ? (P.x < p.x ? 1 : -1) : (P.z < p.z ? -1 : 1);
        p.open += (want - p.open)*(1 - Math.exp(-(want ? 7 : 3)*dt));
        const ang = p.open*1.45*p.dir;
        p.leaves.forEach(l => { l.piv.rotation.y = l.sz < 0 ? ang : -ang; });
        if(p.labels){ p.labels.fwd.visible = cur === p.labels.a; p.labels.bwd.visible = cur === p.labels.b; }
      }
      for(let n = ticks.length - 1; n >= 0; n--){
        const tk = ticks[n]; if(tk.room >= 0 && Math.abs(tk.room - cur) > 1) continue;
        try { if(tk.fn(dt, t, cur) === true) ticks.splice(n, 1); } catch(e){ console.error(`[interiors] ${zone.id} tick failed; removed`, e); ticks.splice(n, 1); }
      }
      for(const s of screens){
        if(!s.fps || s.room !== cur || t - s.last < 1/s.fps) continue;
        s.last = t; try { s.t.draw(s.t.g, s.t.w, s.t.h, t); s.t.tex.needsUpdate = true; } catch(e){ console.error(`[interiors] ${zone.id} screen failed`, e); s.fps = 0; }
      }
      const u = nearest(); prompt.set(u);
      if(u){ prompt.s.position.set(u.x, u.y + Math.sin(t*3)*0.06, u.z); }
      placeCam(dt, false);
    },
  };

  const api = {
    names: () => rooms.map(r => r.name),
    goRoom,
    uses: () => uses.filter(u => u.room === cur).map(u => u.label),
    use: key => useEntry(key == null ? (nearest() || uses.find(u => u.room === cur)) : uses.find(u => u.room === cur && (u.key === key || u.label === key)) || uses.find(u => u.key === key || u.label === key)),
    where: () => ({ zoneId:zone.id, room:cur, name:rooms[cur]?.name, player:room.player && { x:+room.player.x.toFixed(2), z:+room.player.z.toFixed(2) }, look:{ ...look } }),
    look: (yaw, pitch) => { look.yaw = clamp(yaw ?? 0, -0.75, 0.75); look.pitch = clamp(pitch ?? 0, -0.32, 0.4); return { ...look }; },
    walkTo: (x, z) => { place(x, z, Math.PI); return true; },
    debug: (cmd, arg) => { const d = spec.debug?.[cmd]; return d ? d(arg) : null; },
  };
  tours.set(zone.id, api); exposeOnce(ctx);
  // compile every shader now, while the enter is still awaiting, so the first frames do not stall
  try { placeCam(0, true); ctx.renderer.compile(scene, camera); } catch(e){}
  return room;
}

// ---------------------------------------------------------------------------------------------
// Shared drawing helpers
// ---------------------------------------------------------------------------------------------

// A 3D ball-and-stick molecule: atoms as {e, x, y, z}, bonds as [a, b, order].
export function molecule3D(R, def, s = 1){
  const { THREE, H } = R;
  const grp = new THREE.Group();
  const col = { C:'#4a4f5c', H:'#f6f4ee', O:'#e5484d', N:'#4a7bd9' }, rad = { C:0.36, H:0.24, O:0.38, N:0.37 };
  const up = new THREE.Vector3(0, 1, 0);
  for(const a of def.atoms) H.ball(rad[a.e]*s, col[a.e], a.x*s, a.y*s, (a.z || 0)*s, grp, 16);
  for(const [ia, ib, order] of def.bonds){
    const A = def.atoms[ia], B = def.atoms[ib];
    const va = new THREE.Vector3(A.x*s, A.y*s, (A.z || 0)*s), vb = new THREE.Vector3(B.x*s, B.y*s, (B.z || 0)*s);
    const dir = vb.clone().sub(va), len = dir.length(); dir.normalize();
    const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.13*s);
    const offs = order === 2 ? [perp, perp.clone().negate()] : [new THREE.Vector3()];
    for(const o of offs){
      const m = H.cyl(0.075*s, 0.075*s, len, '#c9ccd6', 0, 0, 0, grp, 8);
      m.position.copy(va).add(vb).multiplyScalar(0.5).add(o);
      m.quaternion.setFromUnitVectors(up, dir);
    }
  }
  return grp;
}

const MOLS = [
  { name:'Benzene', atoms:(() => { const a = []; for(let k = 0; k < 6; k++){ const t = k/6*Math.PI*2 + Math.PI/6; a.push({ e:'C', x:Math.cos(t)*1.4, y:Math.sin(t)*1.4 }); } for(let k = 0; k < 6; k++){ const t = k/6*Math.PI*2 + Math.PI/6; a.push({ e:'H', x:Math.cos(t)*2.45, y:Math.sin(t)*2.45 }); } return a; })(),
    bonds:[[0,1,2],[1,2,1],[2,3,2],[3,4,1],[4,5,2],[5,0,1],[0,6,1],[1,7,1],[2,8,1],[3,9,1],[4,10,1],[5,11,1]] },
  { name:'Acetone', atoms:[{e:'C',x:0,y:0},{e:'O',x:0,y:1.25},{e:'C',x:-1.3,y:-0.75},{e:'C',x:1.3,y:-0.75},{e:'H',x:-2.2,y:-0.2},{e:'H',x:-1.3,y:-1.8},{e:'H',x:-1.7,y:-1,z:0.9},{e:'H',x:2.2,y:-0.2},{e:'H',x:1.3,y:-1.8},{e:'H',x:1.7,y:-1,z:0.9}],
    bonds:[[0,1,2],[0,2,1],[0,3,1],[2,4,1],[2,5,1],[2,6,1],[3,7,1],[3,8,1],[3,9,1]] },
  { name:'Ethanol', atoms:[{e:'C',x:-1.2,y:-0.3},{e:'C',x:0.1,y:0.4},{e:'O',x:1.35,y:-0.3},{e:'H',x:2.2,y:0.2},{e:'H',x:-2.1,y:0.3},{e:'H',x:-1.3,y:-1.35},{e:'H',x:-1.2,y:-0.5,z:1},{e:'H',x:0.1,y:1.45},{e:'H',x:0.1,y:0.6,z:1}],
    bonds:[[0,1,1],[1,2,1],[2,3,1],[0,4,1],[0,5,1],[0,6,1],[1,7,1],[1,8,1]] },
];
export { MOLS };

// Skeletal 2D render of a molecule on a canvas, drawn bond by bond (prog 0..1): the SVG renderer idea.
export function drawMol2D(H, g, def, cx, cy, k, prog = 1, ink = '#1f2a44'){
  g.lineCap = 'round'; g.lineWidth = Math.max(3, k*0.1); g.strokeStyle = ink;
  const P = a => [cx + a.x*k, cy - a.y*k];
  const heavy = def.bonds.filter(([ia, ib]) => def.atoms[ia].e !== 'H' && def.atoms[ib].e !== 'H');
  heavy.forEach(([ia, ib, o], n) => {
    const f = clamp(prog*heavy.length - n, 0, 1); if(f <= 0) return;
    const [x1, y1] = P(def.atoms[ia]), [x2, y2] = P(def.atoms[ib]);
    const ex = x1 + (x2 - x1)*f, ey = y1 + (y2 - y1)*f;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(ex, ey); g.stroke();
    if(o === 2 && f > 0.99){ const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ox = -dy/L*k*0.18, oy = dx/L*k*0.18; g.beginPath(); g.moveTo(x1 + ox + dx*0.15, y1 + oy + dy*0.15); g.lineTo(x2 + ox - dx*0.15, y2 + oy - dy*0.15); g.stroke(); }
  });
  if(prog < 1) return;
  H.F(g, 700, Math.round(k*0.6)); g.textAlign = 'center'; g.textBaseline = 'middle';
  for(const a of def.atoms){ if(a.e === 'C' || a.e === 'H') continue; const [x, y] = P(a); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, k*0.38, 0, 7); g.fill(); g.fillStyle = '#e5484d'; g.fillText(a.e === 'O' && def.name === 'Ethanol' ? 'OH' : a.e, x, y + 2); }
}

// A little confetti pop, cleaned up by itself. Geometry and materials are shared across pops.
const confetti = {};
export function burst(R, x, y, z){
  const { THREE } = R, bits = [];
  if(!confetti.geo){ confetti.geo = new THREE.BoxGeometry(0.12, 0.12, 0.03); confetti.mats = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#ffb35c'].map(c => new THREE.MeshBasicMaterial({ color:c })); }
  for(let k = 0; k < 22; k++){
    const m = new THREE.Mesh(confetti.geo, confetti.mats[k%5]);
    m.position.set(x, y, z); R.g.add(m);
    bits.push({ m, vx:(Math.random() - 0.5)*5, vy:2 + Math.random()*4, vz:Math.random()*3, life:1.6 });
  }
  R.tick(dt => {
    if(bits.every(b => b.life <= 0)) return true;
    for(const b of bits){ if(b.life <= 0) continue; b.life -= dt; b.vy -= 9*dt; b.m.position.x += b.vx*dt; b.m.position.y += b.vy*dt; b.m.position.z += b.vz*dt; b.m.rotation.x += dt*8; b.m.rotation.z += dt*6;
      if(b.life <= 0 || b.m.position.y < 0.05){ b.life = 0; R.g.remove(b.m); } }
  });
}
// An arcade cabinet, only when games/ has a game tied to this zone.
export function arcade(ctx, R, x, z, face = 0){
  let game = null;
  try { game = ctx.modules.games?.list?.().find(gm => gm.zoneId === R.zone.id); } catch(e){}
  if(!game) return null;
  const cab = R.group(x, 0, z); cab.rotation.y = face;
  R.box(1.2, 2.0, 0.9, R.zone.color, 0, 1.0, 0, cab); R.box(1.0, 0.7, 0.05, '#1f2a44', 0, 1.55, 0.46, cab);
  R.box(1.2, 0.12, 0.5, '#fffaf0', 0, 1.02, 0.6, cab); R.ball(0.07, '#e5484d', -0.25, 1.12, 0.62, cab, 10); R.ball(0.07, '#ffd166', 0.2, 1.12, 0.62, cab, 10);
  R.screen(0.9, 0.6, (g, w, h, t) => { g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = (t*2|0)%2 ? '#ffd166' : '#8fd3ff'; R.H.F(g, 700, 22); g.textAlign = 'center'; g.fillText('PRESS F', w/2, h*0.62); }, { parent:cab, y:1.55, z:0.49, fps:4 });
  R.glow(0, 1.6, 0.7, 1.4, '#8fd3ff', cab, 0.5);
  R.solid(x, z, 0.7, 0.55);
  R.float(game.title || 'Play', x, 2.55, z, { size:26, scale:0.9 });
  R.use({ key:'arcade', x:x + Math.sin(face)*1.3, z:z + Math.cos(face)*1.3, r:1.6, label:'Play ' + (game.title || ''), hit:cab, fn(){ ctx.modules.games.start(game.id); } });
  return cab;
}
// Canvas helpers the room builders share.
export function title(H, g, w, text, color, y = 40, size = 34, align = 'left', x = 26){
  g.fillStyle = color; H.F(g, 700, size); g.textAlign = align; g.textBaseline = 'middle'; g.fillText(text, align === 'center' ? w/2 : x, y);
}
export function chip(H, g, x, y, w, h, bg, fg, text, size = 22){
  g.fillStyle = bg; H.rr(g, x, y, w, h, h/2); g.fill(); g.fillStyle = fg; H.F(g, 700, size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w/2, y + h/2 + 1);
}

// =============================================================================================
// Blueberry Lab
// =============================================================================================
export function build(ctx, kit){
  const ink = '#1f2a44', paper = '#fffaf0', indigo = '#3b4f9e';
  const debug = {};
  return makeTour(ctx, kit, {
    sky:'#e6ebff', skyLow:'#33448c', plinth:'#3a3550', viewTop:'#9fd0ff', viewLow:'#e8f4ff', debug,
    rooms: [
      { name:'Molecule Atrium', sub:'Double height, around the molecule renderer', w:17, shape:'apse', h:6.4, roof:'dome', domeH:2.6, ribs:10,
        wall:'#eef0fb', cap:'#ffffff', floor:'#dfe4f6', floor2:'#d2d9f0', floorKind:'terrazzo', accent:indigo, rib:'#c7cff0',
        windows:{ at:[0.22, 0.5, 0.78], y:4.6, w:1.1, h:2.2, arch:true }, plaqueY:5.55, cam:{ ty:2.4, dist:25, pitch:0.5 },
        build: R => atrium(R, debug) },
      { name:'Mechanism Trainer', sub:'Drag a curved arrow and it is graded on the spot', w:16, h:5.2, roof:'barrel', vault:3.2, ribs:5,
        wall:'#fff4e6', floor:'#c99a6b', floor2:'#b98a5d', floorKind:'plank', accent:'#e58a3b', rib:'#f0c28e', ceil:'#fff8ee',
        windows:{ at:[0.07, 0.93], y:3.4, w:1.0, round:true }, plaqueY:4.7, cam:{ ty:1.9, dist:22, pitch:0.5 },
        build: R => trainer(R, ctx, debug) },
      { name:'Package Works', sub:'chem-core, curriculum, validators and interaction', w:17, h:4.6, roof:'sawtooth', teeth:3, tooth:1.8, rise:1.3,
        wall:'#f1eefb', floor:'#d9d6e3', floor2:'#8f8aa6', floorKind:'terrazzo', accent:'#6c4fb0', rib:'#4b3a7c', ceil:'#e9e4f7',
        plaqueY:3.95, build: R => packages(R, debug) },
      { name:'Pitch Room', sub:'The 19-slide investor deck and the team of five', w:15, shape:'chamfer', chamfer:2.6, h:4.8, roof:'coffer',
        wall:'#f6efe4', floor:'#6d4a6e', floor2:'#634265', floorKind:'herring', accent:'#35a36a', rib:'#e8dcc8', ceil:'#fbf5ea',
        plaque:false, build: R => pitch(R, debug) },
    ],
  });

  // ---------- 1. Atrium: a giant molecule turning under an oculus, drawn again in 2D on the wall ----------
  function atrium(R, debug){
    const { THREE, H } = R;
    let molIdx = 0, molGroup = null, spin = 0.4, swap = 0, drawnAt = 0;
    // a curved mezzanine ring hugging the apse, on slim columns, with a spiral stair up to it
    const arcZ = R.doorZ - 1.7, rx = R.w/2, rz = arcZ - R.back, y = 3.1;
    const ring = new THREE.Shape(), IN = 2.2;
    const P = (a, d) => [Math.cos(a)*(rx - d), arcZ + Math.sin(a)*(rz - d)];
    for(let k = 0; k <= 32; k++){ const [x, z] = P(Math.PI + Math.PI*k/32, 0); k ? ring.lineTo(x, -z) : ring.moveTo(x, -z); }
    for(let k = 32; k >= 0; k--){ const [x, z] = P(Math.PI + Math.PI*k/32, IN); ring.lineTo(x, -z); }
    const slab = R.mesh(new THREE.ExtrudeGeometry(ring, { depth:0.28, bevelEnabled:false }), '#ffffff', 0, y, 0); slab.rotation.x = -Math.PI/2; slab.position.y = y - 0.28;
    const railPts = []; for(let k = 0; k <= 24; k++) railPts.push(P(Math.PI + Math.PI*k/24, IN));
    railPts.forEach(([x, z], k) => {
      if(k < railPts.length - 1){ const [x2, z2] = railPts[k + 1]; R.beam(x, y + 0.95, z, x2, y + 0.95, z2, 0.09, R.accent); R.beam(x, y + 0.05, z, x2, y + 0.05, z2, 0.14, '#c7cff0'); }
      if(k % 3 === 0 && k > 0 && k < 24){ R.cyl(0.12, 0.14, y - 0.28, '#ffffff', x, (y - 0.28)/2, z, R.s, 12); R.solidR(x, z, 0.25); }
      R.box(0.04, 0.9, 0.04, R.accent, x, y + 0.5, z);
    });
    R.spiral(-5.6, R.doorZ - 1.9, y, { color:'#ffffff', post:R.accent, a0:0.4 });
    // researchers on the balcony
    [[-3.6, -4.5, '#ffd166'], [2.6, -4.9, '#8fd3ff'], [5.4, -3.2, '#ff9fb2']].forEach(([x, z, c], k) => R.blob(c, x, z, { y, face:Math.atan2(-x, 1.5 - z)*0.6, scale:0.8, cap:k === 1 ? indigo : null }));
    // the molecule, floating in the light
    R.cyl(1.5, 1.7, 0.5, '#ffffff', 0, 0.25, -2.4); R.cyl(1.25, 1.25, 0.06, '#8fa2ff', 0, 0.52, -2.4); R.solidR(0, -2.4, 1.8);
    const holder = R.group(0, 3.4, -2.4);
    const setMol = () => { if(molGroup) holder.remove(molGroup); molGroup = molecule3D(R, MOLS[molIdx], 0.8); holder.add(molGroup); drawnAt = performance.now()/1000; };
    setMol();
    R.glow(0, 0.6, -2.4, 3.4, '#8fa2ff', R.g, 0.6);
    R.tick((dt, t) => {
      spin += (0.35 - spin)*(1 - Math.exp(-1.2*dt));
      holder.rotation.y += spin*dt; holder.rotation.x = Math.sin(t*0.4)*0.2; holder.position.y = 3.4 + Math.sin(t*1.2)*0.12;
      if(swap > 0){ swap = Math.max(0, swap - dt*2.2); holder.scale.setScalar(1 - Math.sin(swap*Math.PI)*0.4); }
    });
    // the renderer's-eye view: the same molecule drawn in 2D, bond by bond, on a freestanding screen
    const scr = new THREE.Group(); scr.position.set(5.2, 0, -0.9); scr.rotation.y = -0.55; R.g.add(scr);
    H.box(3.3, 2.3, 0.14, indigo, 0, 2.3, -0.08, scr); H.box(0.14, 1.2, 0.14, '#2a2a33', 0, 0.6, -0.1, scr); H.box(1.2, 0.08, 0.7, '#2a2a33', 0, 0.04, -0.1, scr);
    R.solid(5.2, -0.9, 1.2, 0.6, -0.55);
    const flat = R.screen(3.1, 2.1, (g, w, h, t) => {
      g.fillStyle = paper; g.fillRect(0, 0, w, h);
      g.fillStyle = indigo; g.fillRect(0, 0, w, 44); title(H, g, w, 'SVG renderer', '#ffffff', 23, 24);
      g.fillStyle = '#ffffffaa'; H.F(g, 600, 18, 'Nunito'); g.textAlign = 'right'; g.fillText(MOLS[molIdx].name, w - 16, 24);
      const prog = clamp((t - drawnAt)/2.4, 0, 1);
      drawMol2D(H, g, MOLS[molIdx], w/2, h*0.58, 44, prog);
      g.fillStyle = '#1f2a4466'; H.F(g, 600, 15, 'Nunito'); g.textAlign = 'left'; g.fillText(`<path d="M ${(prog*100|0)} ..."/>`, 14, h - 14);
    }, { parent:scr, y:2.3, z:0.0, fps:20 });
    R.use({ key:'molecule', x:0, z:0.2, r:2.6, label:'Next molecule', hit:holder, fn(){ molIdx = (molIdx + 1) % MOLS.length; setMol(); spin = 6; swap = 1; } });
    debug.molecule = () => { molIdx = (molIdx + 1) % MOLS.length; setMol(); return MOLS[molIdx].name; };
    // where it started: one flashcard in a glass case, flip it
    const card = R.group(-4.6, 1.75, 2.2); let flip = 0, flipT = 0;
    R.box(1.3, 1.0, 0.9, '#ffffff', -4.6, 0.5, 2.2); R.box(1.4, 0.08, 1.0, indigo, -4.6, 1.02, 2.2); R.solid(-4.6, 2.2, 0.7, 0.5);
    const front = R.screen(1.2, 0.78, (g, w, h) => cardFace(H, g, w, h, 'Front', 'What does a curved arrow show?', '#35a36a'), { parent:card, z:0.02, px:220 });
    const back = R.screen(1.2, 0.78, (g, w, h) => cardFace(H, g, w, h, 'Back', 'Where a pair of electrons moves', indigo), { parent:card, z:-0.02, rotY:Math.PI, px:220 });
    const caseM = R.box(1.35, 1.1, 0.95, '#e8f4ff', -4.6, 1.6, 2.2, R.g); caseM.material = new THREE.MeshStandardMaterial({ color:'#e8f4ff', transparent:true, opacity:0.18, roughness:0.05, depthWrite:false }); caseM.castShadow = false;
    R.float('Where it started', -4.6, 2.5, 2.2, { size:24, scale:0.85 });
    R.tick(dt => { flip += (flipT - flip)*(1 - Math.exp(-6*dt)); card.rotation.y = flip*Math.PI + Math.sin(performance.now()/900)*0.08; });
    R.use({ key:'flip', x:-4.6, z:3.4, r:1.6, y:2.9, label:'Flip the first flashcard', hit:card, fn(){ flipT = flipT ? 0 : 1; } });
    R.lamp('floor', 6.6, 1.6, 2.6); R.lamp('floor', -6.8, 1.6, -0.6);
    R.stop('Blueberry', 'Blueberry is an AI-assisted organic chemistry learning platform. Andrew co-founded it and leads product and learning design for a team of five.', 0, 5.2, -2.4);
    R.stop('The molecule renderer', 'Blueberry draws its structures with a custom SVG molecule renderer. The screen redraws the molecule above you bond by bond. Press F at the pedestal to switch molecules.', 5.2, 3.8, -0.9);
    R.stop('Where it started', 'It began as a flashcard tool for classmates. Flip the card in the case to see the kind of question it asked.', -4.6, 3.1, 2.2);
  }

  // ---------- 2. Mechanism trainer: drag the arrows on the slate, graded as a bond-electron matrix ----------
  function trainer(R, ctx, debug){
    const { THREE, H } = R;
    const SW = 9.6, SH = 3.5, PX = 110, CW = Math.round(SW*PX), CH = Math.round(SH*PX);
    // targets on the canvas
    const LP = [250, 205], Cc = [540, 250], BOND = [612, 190], O = [690, 128], NU = [190, 250];
    const st = { a1:false, a2:false, live:null, fb:null, solved:0, demo:0 };
    const near = (p, q, r) => Math.hypot(p[0] - q[0], p[1] - q[1]) < r;
    function draw(g, w, h, t){
      g.fillStyle = '#233140'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffffff10'; g.lineWidth = 1; for(let x = 0; x < w; x += 40){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      title(H, g, w, 'Push the electrons', '#ffffff', 44, 38);
      g.fillStyle = '#ffffff99'; H.F(g, 600, 21, 'Nunito'); g.fillText('Nucleophilic addition to a carbonyl · draw both arrows', 26, 82);
      const done = st.solved && t - st.solved > 0.6;
      g.strokeStyle = '#f4f1e8'; g.lineWidth = 6; g.lineCap = 'round';
      // the carbonyl carbon with two groups
      g.beginPath(); g.moveTo(Cc[0], Cc[1]); g.lineTo(Cc[0] - 70, Cc[1] + 80); g.moveTo(Cc[0], Cc[1]); g.lineTo(Cc[0] + 95, Cc[1] + 70); g.stroke();
      H.F(g, 700, 30); g.fillStyle = '#f4f1e8'; g.textAlign = 'center'; g.fillText('R', Cc[0] - 86, Cc[1] + 104); g.fillText('R', Cc[0] + 112, Cc[1] + 94);
      // C=O (single after the answer)
      g.beginPath(); g.moveTo(Cc[0] + 10, Cc[1] - 8); g.lineTo(O[0] - 22, O[1] + 18); g.stroke();
      if(!done){ g.beginPath(); g.moveTo(Cc[0] + 26, Cc[1] + 10); g.lineTo(O[0] - 6, O[1] + 36); g.stroke(); }
      H.F(g, 700, 46); g.fillStyle = '#ff8a8a'; g.fillText('O', O[0], O[1]); g.fillStyle = '#f4f1e8'; H.F(g, 700, 40); g.fillText('C', Cc[0], Cc[1] + 4);
      const lp = (x, y, a) => { g.fillStyle = '#ffd166'; for(const s of [-1, 1]){ g.beginPath(); g.arc(x + Math.cos(a + s*0.35)*28, y + Math.sin(a + s*0.35)*28, 5, 0, 7); g.fill(); } };
      lp(O[0], O[1], -1.2); lp(O[0], O[1], 0.2); if(done){ lp(O[0], O[1], -2.6); g.fillStyle = '#ff8a8a'; H.F(g, 700, 32); g.fillText('−', O[0] + 36, O[1] - 30); }
      // the nucleophile
      if(done){ g.strokeStyle = '#f4f1e8'; g.beginPath(); g.moveTo(NU[0] + 40, NU[1]); g.lineTo(Cc[0] - 26, Cc[1]); g.stroke(); }
      H.F(g, 700, 44); g.fillStyle = '#8fd3ff'; g.fillText('Nu', NU[0], NU[1] + 4);
      if(!done){ g.fillStyle = '#ffffff'; H.F(g, 700, 34); g.fillText('−', NU[0] + 44, NU[1] - 34); lp(NU[0] + 12, NU[1] - 6, -0.6); }
      // hot spots, faint, so a first-timer sees where arrows can start
      if(!done){ g.strokeStyle = '#ffd16655'; g.setLineDash([6, 8]); g.lineWidth = 3; for(const p of [LP, BOND]){ g.beginPath(); g.arc(p[0], p[1], 34 + Math.sin(t*3)*3, 0, 7); g.stroke(); } g.setLineDash([]); }
      // arrows already drawn right
      const demoF = st.demo ? (t - st.demo)/1.2 : 0;
      if(st.a1 || (st.demo && demoF > 0)) H.arrowCurve(g, LP[0], LP[1], Cc[0] - 34, Cc[1] - 26, 90, '#ffb35c', 7, st.a1 ? 1 : clamp(demoF, 0, 1));
      if(st.a2 || (st.demo && demoF > 1)) H.arrowCurve(g, BOND[0], BOND[1], O[0] + 26, O[1] + 10, 60, '#ffb35c', 7, st.a2 ? 1 : clamp(demoF - 1, 0, 1));
      if(st.live){ const l = st.live; H.arrowCurve(g, l.sx, l.sy, l.ex, l.ey, Math.min(110, Math.hypot(l.ex - l.sx, l.ey - l.sy)*0.35), '#ffffff', 6, 1); }
      // grading panel: feedback and the bond-electron matrix
      const px = 790, pw = w - px - 24;
      g.fillStyle = '#ffffff0f'; H.rr(g, px, 24, pw, h - 48, 22); g.fill();
      title(H, g, w, 'Graded in the browser', '#ffffff', 58, 24, 'left', px + 22);
      g.fillStyle = '#ffffff88'; H.F(g, 600, 17, 'Nunito'); g.fillText('RDKit.js, bond-electron matrix', px + 22, 86);
      const atoms = ['Nu', 'C', 'O'], before = [[2, 0, 0], [0, 0, 2], [0, 2, 4]], after = [[0, 1, 0], [1, 0, 1], [0, 1, 6]];
      const M = done ? after : before, cs = 52, mx = px + 70, my = 116;
      H.F(g, 700, 20); g.textAlign = 'center';
      atoms.forEach((a, k) => { g.fillStyle = '#ffffffaa'; g.fillText(a, mx + k*cs + cs/2, my - 4); g.fillText(a, mx - 26, my + 18 + k*cs + cs/2 - 8); });
      for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++){
        const changed = done && before[r][c] !== after[r][c];
        g.fillStyle = changed ? '#35b36a' : '#ffffff18'; H.rr(g, mx + c*cs + 3, my + 8 + r*cs + 3, cs - 6, cs - 6, 10); g.fill();
        g.fillStyle = '#ffffff'; H.F(g, 700, 24); g.fillText(String(M[r][c]), mx + c*cs + cs/2, my + 8 + r*cs + cs/2 + 2);
      }
      const fb = st.fb && t - st.fb.t < 3.2 ? st.fb : null;
      if(done){ chip(H, g, px + 22, h - 82, pw - 44, 48, '#35b36a', '#ffffff', 'Correct: both arrows', 22); }
      else if(fb){ chip(H, g, px + 22, h - 82, pw - 44, 48, fb.ok ? '#35b36a' : '#e5484d', '#ffffff', fb.ok ? 'Right! One more arrow' : 'Not quite, try again', 21); }
      else { g.fillStyle = '#ffffff77'; H.F(g, 600, 18, 'Nunito'); g.textAlign = 'left'; g.fillText('Drag from electrons to where', px + 22, h - 70); g.fillText('they go. F at the desk: demo', px + 22, h - 46); }
      if(fb && !fb.ok && !done){ g.fillStyle = '#ffb3b3'; H.F(g, 600, 20, 'Nunito'); g.textAlign = 'left'; g.fillText(fb.msg, 26, h - 26); }
    }
    R.box(SW + 0.4, SH + 0.4, 0.2, '#6b4a33', 0, 2.35, R.back + 0.12);
    R.box(SW + 0.2, 0.12, 0.3, '#6b4a33', 0, 0.55, R.back + 0.2);
    const board = R.screen(SW, SH, draw, { x:0, y:2.35, z:R.back + 0.24, fps:30, px:PX });
    const toCanvas = (u, v) => [u*CW, (1 - v)*CH];
    function grade(sx, sy, ex, ey){
      const t = performance.now()/1000, s = [sx, sy], e = [ex, ey];
      if(Math.hypot(ex - sx, ey - sy) < 30) return;
      let ok = false, msg = 'Arrows start at electrons: a lone pair or a bond.';
      if(near(s, LP, 60)){ ok = near(e, Cc, 70); msg = 'The lone pair should attack the carbon of the C=O.'; if(ok) st.a1 = true; }
      else if(near(s, BOND, 55)){ ok = near(e, O, 70); msg = 'The pi bond electrons move onto the oxygen.'; if(ok) st.a2 = true; }
      st.fb = { ok, msg, t };
      if(ok){ R.chime(ok && st.a1 && st.a2 ? 990 : 760); } else R.buzz();
      if(st.a1 && st.a2 && !st.solved){ st.solved = t; burst(R, 0, 3.6, R.back + 1.2); }
    }
    R.drag(board.mesh, {
      down(u, v){ if(st.solved) return; const [x, y] = toCanvas(u, v); st.live = { sx:x, sy:y, ex:x, ey:y }; },
      move(u, v){ if(!st.live) return; const [x, y] = toCanvas(u, v); st.live.ex = x; st.live.ey = y; },
      up(){ const l = st.live; st.live = null; if(l) grade(l.sx, l.sy, l.ex, l.ey); },
    });
    const reset = () => Object.assign(st, { a1:false, a2:false, live:null, fb:null, solved:0, demo:0 });
    function demo(){
      if(st.solved){ reset(); return 'reset'; }
      st.demo = performance.now()/1000;
      setTimeout(() => { st.a1 = true; }, 1200); setTimeout(() => { st.a2 = true; st.demo = 0; st.solved = performance.now()/1000; burst(R, 0, 3.6, R.back + 1.2); R.chime(990); }, 2400);
      return 'demo';
    }
    debug.arrow = which => { const t = performance.now()/1000; if(which === 'wrong'){ grade(LP[0], LP[1], O[0], O[1]); } else { grade(LP[0], LP[1], Cc[0], Cc[1]); grade(BOND[0], BOND[1], O[0], O[1]); } return { ...st, live:null }; };
    debug.demo = demo;
    // the teaching desk with a green button
    const desk = R.group(0, 0, 1.4);
    H.box(2.2, 1.0, 0.8, '#6b4a33', 0, 0.5, 0, desk); const top = H.box(2.4, 0.08, 1.0, '#e58a3b', 0, 1.04, 0, desk);
    const btn = H.cyl(0.16, 0.16, 0.08, '#35b36a', 0.6, 1.1, 0.1, desk, 16);
    R.solid(0, 1.4, 1.2, 0.5);
    R.use({ key:'demo', x:0, z:2.6, r:2.0, label:'Watch the demo (or reset)', hit:[btn, top], pitch:880, fn(){ demo(); } });
    // student benches with small practice screens, facing the slate
    [-4.8, 4.8].forEach((sx, n) => {
      R.box(2.6, 0.08, 1.0, '#e6cfae', sx, 0.95, -1.6); for(const lx of [-1.1, 1.1]) R.box(0.1, 0.95, 0.9, '#6b4a33', sx + lx, 0.47, -1.6); R.solid(sx, -1.6, 1.35, 0.55);
      R.screen(1.2, 0.72, (g, w, h, t) => { g.fillStyle = '#233140'; g.fillRect(0, 0, w, h); H.arrowCurve(g, w*0.2, h*0.7, w*0.8, h*0.66, h*0.5, '#ffb35c', 7, (t*0.6 + n*0.5) % 1.2); }, { x:sx, y:1.4, z:-1.85, rotY:Math.PI, fps:12, double:true });
      R.blob(n ? '#ffb35c' : '#8fa2ff', sx, -0.6, { face:Math.PI, scale:0.75 });
      R.lamp('desk', sx - 0.9, 0.99, -1.7);
    });
    R.lamp('pendant', -3, 3.9, -2.4, { top:R.h + 3.2 }); R.lamp('pendant', 3, 3.9, -2.4, { top:R.h + 3.2 });
    arcade(ctx, R, 6.4, 3.3, -0.6);
    R.stop('Mechanism trainer', 'This is the curved-arrow mechanism trainer. Drag an arrow on the slate from a pair of electrons to where they attack; every arrow is graded as you let go.', 0, 4.6, R.back + 1);
    R.stop('Graded in the browser', 'Grading runs in the browser with RDKit.js. A correct step shows up as a change in the bond-electron matrix on the right of the slate.', 3.9, 3.6, R.back + 1);
  }

  // ---------- 3. Package works: four linked machines on one line, and the Supabase vault ----------
  function packages(R, debug){
    const { THREE, H } = R;
    const Z = -1.2, Y = 0.95;
    // the belt, with a moving stripe texture
    const beltT = H.canvasTex(64, 16, g => { g.fillStyle = '#3a3550'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#56507a'; for(let x = 0; x < 64; x += 16) g.fillRect(x, 0, 6, 16); });
    beltT.tex.wrapS = THREE.RepeatWrapping; beltT.tex.repeat.set(14, 1);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 1.0), new THREE.MeshStandardMaterial({ map:beltT.tex, roughness:0.7 })); belt.position.set(0, Y, Z); belt.receiveShadow = true; R.g.add(belt);
    R.box(14.2, 0.18, 1.2, '#4b3a7c', 0, Y - 0.12, Z);
    for(let k = 0; k < 8; k++) R.box(0.14, Y - 0.2, 0.9, '#4b3a7c', -6.8 + k*1.94, (Y - 0.2)/2, Z);
    R.solid(0, Z, 7.1, 0.65);
    const machines = [
      { id:'curriculum', x:-4.6, color:'#35a36a', sub:'lessons' },
      { id:'interaction', x:0, color:'#e58a3b', sub:'what you touch' },
      { id:'validators', x:4.6, color:'#d6689a', sub:'right or wrong' },
    ];
    const parts = {};
    // curriculum: a press that stamps a lesson onto the card
    { const m = machines[0]; R.box(1.6, 0.3, 1.5, m.color, m.x, 3.1, Z); for(const s of [-1, 1]) R.box(0.2, 2.2, 0.2, m.color, m.x + s*0.7, 2.0, Z - 0.6);
      parts.press = R.group(m.x, 2.6, Z); H.box(1.1, 0.5, 0.9, '#2f8a58', 0, 0, 0, parts.press); H.box(0.2, 0.6, 0.2, '#c7cdd9', 0, 0.5, 0, parts.press); }
    // interaction: a robot arm that draws a curved arrow on the card
    { const m = machines[1]; R.cyl(0.5, 0.6, 0.5, m.color, m.x, 0.25, Z - 1.25); R.solidR(m.x, Z - 1.25, 0.6);
      parts.arm = R.group(m.x, 0.5, Z - 1.25); const up = H.box(0.24, 1.8, 0.24, m.color, 0, 0.9, 0, parts.arm);
      parts.fore = new THREE.Group(); parts.fore.position.set(0, 1.8, 0); parts.arm.add(parts.fore);
      H.box(0.2, 0.2, 1.3, '#ffb35c', 0, 0, 0.6, parts.fore); H.cyl(0.05, 0.02, 0.4, '#1f2a44', 0, -0.2, 1.25, parts.fore, 8); H.ball(0.18, '#ffffff', 0, 0, 0, parts.fore, 12); }
    // validators: a scanning gate with a light curtain
    { const m = machines[2]; for(const s of [-1, 1]) R.box(0.3, 2.4, 0.3, m.color, m.x + s*0.9, 1.2, Z); R.box(2.1, 0.35, 0.4, m.color, m.x, 2.5, Z);
      parts.scan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), new THREE.MeshBasicMaterial({ color:'#ff9fc4', transparent:true, opacity:0.0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
      parts.scan.position.set(m.x, 1.7, Z); parts.scan.rotation.y = Math.PI/2; R.g.add(parts.scan); }
    machines.forEach(m => {
      const s = R.sign(m.id, m.sub, { w:2.2, h:0.72, bg:m.color, fg:'#ffffff', size:30 }); s.position.set(m.x, 3.62, Z + 0.3);
      m.lamp = R.ball(0.14, '#ffffff', m.x + 0.95, 3.3, Z + 0.3, R.g, 10); m.lamp.material = new THREE.MeshBasicMaterial({ color:'#6d6a7a' });
    });
    // chem-core: the reactor at the back, feeding structures to all three, pipes lit when it works
    const coreX = 0, coreZ = R.back + 1.5;
    R.cyl(1.1, 1.2, 0.4, '#4b3a7c', coreX, 0.2, coreZ); R.cyl(1.1, 1.1, 0.3, '#4b3a7c', coreX, 3.1, coreZ); R.solidR(coreX, coreZ, 1.3);
    const glassC = R.cyl(0.95, 0.95, 2.5, '#cfe0ff', coreX, 1.65, coreZ, R.g, 24); glassC.material = new THREE.MeshStandardMaterial({ color:'#cfe0ff', transparent:true, opacity:0.25, roughness:0.05, depthWrite:false }); glassC.castShadow = false;
    const coreMol = molecule3D(R, MOLS[0], 0.32); coreMol.position.set(coreX, 1.65, coreZ); R.g.add(coreMol);
    const coreGlow = R.glow(coreX, 1.65, coreZ, 3.0, '#a98bff', R.g, 0.5);
    const cs = R.sign('chem-core', 'molecules and electrons', { w:2.4, h:0.74, bg:'#4b3a7c', fg:'#ffffff', size:30 }); cs.position.set(coreX, 3.75, coreZ + 0.4);
    const pipes = machines.map(m => {
      const pts = [new THREE.Vector3(coreX, 3.0, coreZ + 0.4), new THREE.Vector3((coreX + m.x)/2, 4.1, (coreZ + Z)/2), new THREE.Vector3(m.x, 3.3, Z - 0.3)];
      const curve = new THREE.QuadraticBezierCurve3(...pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.08, 8), H.mat('#8a7fb0')); tube.castShadow = true; R.s.add(tube);
      const pulse = R.ball(0.16, '#ffffff', 0, 0, 0, R.g, 10); pulse.material = new THREE.MeshBasicMaterial({ color:'#d9c9ff' }); pulse.visible = false;
      return { curve, pulse, t:-1 };
    });
    // the lesson card that rides the belt
    const card = R.group(-7, Y + 0.08, Z); card.visible = false;
    H.box(0.9, 0.05, 0.62, '#fffaf0', 0, 0, 0, card);
    const lessonMark = H.box(0.6, 0.02, 0.1, '#35a36a', 0, 0.04, -0.15, card); lessonMark.visible = false;
    const arrowMark = H.mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 16, Math.PI*1.2), '#e58a3b', 0, 0.05, 0.08, card); arrowMark.rotation.x = -Math.PI/2; arrowMark.visible = false;
    const check = H.mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 16), '#35b36a', 0.3, 0.06, 0.12, card); check.rotation.x = -Math.PI/2; check.visible = false;
    let run = -1, runs = 0;
    const dwell = 1.1, speed = 2.6, stops = machines.map(m => m.x), startX = -7, endX = 7;
    // timeline: travel to each machine, dwell, travel on
    function cardAt(s){
      let x = startX, tt = s;
      for(let k = 0; k < stops.length; k++){
        const seg = (stops[k] - x)/speed; if(tt < seg) return { x:x + tt*speed, at:-1, f:0 };
        tt -= seg; x = stops[k]; if(tt < dwell) return { x, at:k, f:tt/dwell }; tt -= dwell;
      }
      const seg = (endX - x)/speed; if(tt < seg) return { x:x + tt*speed, at:-1, f:0 };
      return { x:endX, at:-1, f:0, done:true };
    }
    const counter = R.screen(2.6, 0.9, (g, w, h) => { g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); title(H, g, w, 'packages/', '#ffffff', 34, 30); g.fillStyle = '#ffffffaa'; H.F(g, 600, 20, 'Nunito'); g.fillText(`lessons run through: ${runs}`, 26, 82); }, { x:0, y:1.25, z:2.42, px:120 });
    R.box(2.8, 1.1, 0.12, '#4b3a7c', 0, 1.25, 2.35); R.box(2.8, 0.7, 0.6, '#4b3a7c', 0, 0.35, 2.6); R.solid(0, 2.6, 1.45, 0.45);
    const go = R.cyl(0.18, 0.18, 0.1, '#35b36a', 0.9, 0.75, 2.75, R.g, 16);
    function start(){ if(run >= 0) return false; run = 0; card.visible = true; lessonMark.visible = arrowMark.visible = check.visible = false; return true; }
    debug.lesson = () => start();
    R.use({ key:'lesson', x:0, z:3.6, r:2.0, label:'Run a lesson through', hit:[go, belt], pitch:620, fn(){ start(); } });
    R.tick((dt, t) => {
      coreMol.rotation.y += dt*0.8; coreMol.rotation.x = Math.sin(t*0.5)*0.3;
      pipes.forEach(p => { if(p.t < 0) return; p.t += dt*1.4; p.pulse.visible = p.t < 1; if(p.t >= 1){ p.t = -1; return; } p.pulse.position.copy(p.curve.getPoint(1 - p.t)); });
      if(run < 0){ beltT.tex.offset.x += dt*0.2; coreGlow.material.opacity = 0.45; return; }
      run += dt; const c = cardAt(run);
      card.position.x = c.x; beltT.tex.offset.x += (c.at < 0 ? dt*speed*0.5 : 0);
      machines.forEach((m, k) => m.lamp.material.color.set(c.at === k ? m.color : (c.x > m.x + 0.05 ? '#b5e48c' : '#6d6a7a')));
      if(c.at >= 0 && c.f < dt/dwell*1.5 && pipes[c.at].t < 0) pipes[c.at].t = 0;
      parts.press.position.y = 2.6 - (c.at === 0 ? Math.sin(c.f*Math.PI)*1.3 : 0);
      if(c.at === 0 && c.f > 0.5) lessonMark.visible = true;
      parts.arm.rotation.y = c.at === 1 ? Math.sin(c.f*Math.PI*2)*0.5 : 0;
      parts.fore.rotation.x = c.at === 1 ? 0.55 + Math.sin(c.f*Math.PI)*0.25 : 0.3;
      if(c.at === 1 && c.f > 0.6) arrowMark.visible = true;
      parts.scan.material.opacity = c.at === 2 ? 0.5 + Math.sin(t*20)*0.2 : 0;
      if(c.at === 2 && c.f > 0.6 && !check.visible){ check.visible = true; R.chime(880); }
      coreGlow.material.opacity = 0.45 + (c.at >= 0 ? 0.35 : 0);
      if(c.done){ run = -1; card.visible = false; runs++; counter.redraw(); }
    });
    // the Supabase vault: rows in drawers, only yours opens
    const vx = 6.6, vz = R.back + 1.1;
    R.box(2.2, 3.0, 1.2, '#2e3a36', vx, 1.5, vz); R.solid(vx, vz, 1.15, 0.65);
    const drawers = [0, 1, 2, 3].map(k => { const d = R.group(vx, 0.55 + k*0.68, vz + 0.62); H.box(1.9, 0.58, 0.1, k === 1 ? '#3ecf8e' : '#46564f', 0, 0, 0, d); const l = H.ball(0.06, '#e5484d', 0.8, 0, 0.07, d, 8); l.material = new THREE.MeshBasicMaterial({ color:'#e5484d' }); return { d, l }; });
    const vs = R.sign('Supabase', 'row-level security', { w:2.2, h:0.72, bg:'#3ecf8e', fg:'#1f2a44', size:30 }); vs.position.set(vx, 3.45, vz + 0.62);
    const said = R.float('You only get your own row', vx, 4.3, vz + 0.6, { size:26, bg:ink, fg:'#ffffff', scale:0.85 }); said.visible = false;
    let ask = -10;
    R.tick((dt, t) => { const on = t - ask < 3.5; said.visible = on; drawers.forEach((q, k) => { const want = on && k === 1 ? 0.55 : 0; q.d.position.z += (vz + 0.62 + want - q.d.position.z)*(1 - Math.exp(-6*dt)); q.l.material.color.set(k === 1 && on ? '#35b36a' : (on && (t*6|0)%2 ? '#ff7b7b' : '#e5484d')); }); });
    R.use({ key:'rows', x:vx - 0.4, z:vz + 2.0, r:1.8, label:'Ask the vault for rows', hit:drawers.map(q => q.d), pitch:520, fn(t){ ask = t; } });
    debug.rows = () => { ask = performance.now()/1000; return true; };
    R.blob('#8fa2ff', -6.4, 1.8, { face:0.6, cap:'#6c4fb0', scale:0.85 });
    R.lamp('floor', -7.4, 1.6, -4.6);
    R.stop('The monorepo', 'Blueberry is a React 19 and TypeScript monorepo split into four packages. Press F at the console and one lesson travels through them.', 0, 2.6, 2.4);
    R.stop('chem-core', 'At the back, chem-core holds the chemistry. Watch it send a pulse down a pipe whenever curriculum, interaction or validators needs a structure.', 0, 4.4, R.back + 1.5);
    R.stop('Supabase', 'Everything is stored on Supabase with row-level security, so each person gets only their own rows. Ask the vault and see which drawer opens.', 6.6, 4.0, R.back + 1.5);
  }

  // ---------- 4. Pitch room: a stage with the investor deck, the team of five at their table ----------
  function pitch(R, debug){
    const { THREE, H } = R;
    let slide = 0, lastUse = -10, auto = 0;
    R.dais(0, R.back + 1.9, 9, 3.0, 0.48, { color:'#e8dcc8', edge:'#35a36a', stepW:4 });
    const SW = 6.2, SH = 3.2;
    R.box(SW + 0.4, SH + 0.4, 0.14, '#2a2a33', 0, 2.75, R.back + 0.15);
    const scr = R.screen(SW, SH, (g, w, h, t) => drawSlide(H, g, w, h, slide, t), { x:0, y:2.75, z:R.back + 0.24, fps:4, px:120 });
    const q = R.sign('Investor deck', '19 slides', { w:2.8, h:0.7, bg:'#35a36a', fg:'#ffffff', size:30 }); q.position.set(0, 4.7, R.back + 0.2);
    const next = t => { slide = (slide + 1) % 19; lastUse = t ?? performance.now()/1000; scr.redraw(); };
    const lect = R.group(-3.4, 0.48, R.back + 2.6);
    H.box(0.7, 1.1, 0.5, '#6b4a33', 0, 0.55, 0, lect); const lt = H.box(0.8, 0.06, 0.6, '#35a36a', 0, 1.12, 0, lect); lt.rotation.x = 0.3;
    R.use({ key:'slide', x:-3.4, z:R.back + 4.6, r:2.2, label:'Next slide', hit:[lect, scr.mesh], pitch:700, fn(t){ next(t); } });
    debug.slide = () => { next(); return slide + 1; };
    R.tick((dt, t) => { auto += dt; if(t - lastUse > 6 && auto > 4.5){ auto = 0; slide = (slide + 1) % 19; scr.redraw(); } });
    // spotlights on the stage
    R.lamp('pendant', -2.4, 4.0, R.back + 2.2, { top:R.h }); R.lamp('pendant', 2.4, 4.0, R.back + 2.2, { top:R.h });
    // the team of five around a round table, laptops open
    const tx = 3.6, tz = 2.4;
    R.cyl(1.35, 1.35, 0.1, '#fffaf0', tx, 0.85, tz, R.s, 28); R.cyl(0.2, 0.34, 0.85, '#6b4a33', tx, 0.42, tz); R.solidR(tx, tz, 1.45);
    const caps = ['#8fa2ff', '#ffd166', '#ff9fb2', '#b5e48c', '#ffffff'];
    for(let k = 0; k < 5; k++){
      const a = k/5*Math.PI*2 + 0.6, bx = tx + Math.sin(a)*2.0, bz = tz + Math.cos(a)*2.0;
      R.blob(indigo, bx, bz, { face:a + Math.PI, scale:0.62, leaf:true, speed:2 + k*0.3 });
      const lp = R.group(tx + Math.sin(a)*0.95, 0.9, tz + Math.cos(a)*0.95); lp.rotation.y = a + Math.PI;
      H.box(0.44, 0.03, 0.3, '#c7cdd9', 0, 0, 0, lp); const sc = H.box(0.44, 0.3, 0.02, '#c7cdd9', 0, 0.15, -0.16, lp); sc.rotation.x = -0.25;
    }
    R.float('Team of five', tx, 2.2, tz, { size:26, scale:0.9 });
    // audience chairs
    for(let r = 0; r < 2; r++) for(let k = 0; k < 4; k++){ const x = -5.6 + k*1.1, z = 0.6 + r*1.5; R.box(0.7, 0.08, 0.6, '#35a36a', x, 0.5, z); R.box(0.7, 0.6, 0.08, '#35a36a', x, 0.8, z + 0.28); for(const lx of [-0.3, 0.3]) R.box(0.05, 0.5, 0.05, '#2a2a33', x + lx, 0.25, z); }
    R.solid(-4.0, 1.35, 2.3, 1.2);
    R.blob('#ffb35c', -4.5, 0.55, { y:0.1, face:Math.PI, scale:0.6 });
    R.lamp('sconce', -6.9, 2.6, -2.2); R.lamp('sconce', 6.9, 2.6, -2.2);
    R.stop('The pitch', 'Blueberry has a 19-slide investor deck. Step up to the lectern and press F to click through it.', 0, 4.9, R.back + 1.0);
    R.stop('Team of five', 'Andrew leads product and learning design for a team of five, the five blueberries at the table.', 3.6, 2.8, 2.4);
  }
}

function cardFace(H, g, w, h, side, text, color){
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = color; g.fillRect(0, 0, w, h*0.22);
  g.fillStyle = '#ffffff'; H.F(g, 700, Math.round(h*0.14)); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(side, w*0.05, h*0.11);
  g.fillStyle = '#1f2a44'; H.F(g, 700, Math.round(h*0.12)); g.textAlign = 'center';
  const words = text.split(' '); const lines = []; let line = '';
  for(const wd of words){ const tst = line ? line + ' ' + wd : wd; if(g.measureText(tst).width > w*0.86 && line){ lines.push(line); line = wd; } else line = tst; } lines.push(line);
  lines.forEach((l, k) => g.fillText(l, w/2, h*0.6 + (k - (lines.length - 1)/2)*h*0.15));
}

// One slide of the deck. Only the title slide carries words; the rest are drawn as layouts (no invented content).
function drawSlide(H, g, w, h, n, t){
  const q = prng(n*131 + 7), pal = ['#3b4f9e', '#35a36a', '#e58a3b', '#d6689a', '#8a5cc2'];
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
  const c = pal[n % pal.length];
  if(n === 0){
    g.fillStyle = '#3b4f9e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; H.F(g, 700, 84); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Blueberry', w/2, h*0.42);
    H.F(g, 600, 30, 'Nunito'); g.fillStyle = '#ffffffcc'; g.fillText('Organic chemistry learning platform', w/2, h*0.6);
    g.fillStyle = '#8fa2ff'; g.beginPath(); g.arc(w/2, h*0.2, 26, 0, 7); g.fill();
  } else {
    g.fillStyle = c; g.fillRect(0, 0, 18, h);
    g.fillStyle = '#1f2a44'; H.rr(g, 60, 44, w*(0.35 + q()*0.25), 34, 10); g.fill();
    const kind = n % 4;
    if(kind === 0){ for(let k = 0; k < 4; k++){ g.fillStyle = '#1f2a4455'; H.rr(g, 60, 120 + k*52, w*(0.3 + q()*0.25), 18, 9); g.fill(); } g.fillStyle = c + '33'; H.rr(g, w*0.58, 110, w*0.34, h*0.58, 22); g.fill(); g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(w*0.75, h*0.52, 50, 0, 7); g.stroke(); }
    else if(kind === 1){ for(let k = 0; k < 3; k++){ g.fillStyle = pal[(n + k) % 5] + '2a'; H.rr(g, 60 + k*(w - 120)/3, 120, (w - 120)/3 - 20, h*0.6, 20); g.fill(); g.fillStyle = pal[(n + k) % 5]; g.beginPath(); g.arc(60 + k*(w - 120)/3 + ((w - 120)/3 - 20)/2, 190, 30, 0, 7); g.fill(); g.fillStyle = '#1f2a4455'; H.rr(g, 90 + k*(w - 120)/3, 250, (w - 120)/3 - 80, 14, 7); g.fill(); } }
    else if(kind === 2){ g.strokeStyle = '#1f2a44'; g.lineWidth = 5; const ox = w*0.3, oy = h*0.58; for(let k = 0; k < 6; k++){ const a = k/6*Math.PI*2, b = (k + 1)/6*Math.PI*2; g.beginPath(); g.moveTo(ox + Math.cos(a)*70, oy + Math.sin(a)*70); g.lineTo(ox + Math.cos(b)*70, oy + Math.sin(b)*70); g.stroke(); } H.arrowCurve(g, w*0.45, h*0.62, w*0.7, h*0.55, 70, c, 7, 1); g.fillStyle = '#1f2a4455'; H.rr(g, w*0.62, h*0.72, w*0.28, 16, 8); g.fill(); }
    else { const n2 = 5 + (n % 3); for(let k = 0; k < n2; k++){ const bh = h*(0.12 + q()*0.4); g.fillStyle = k === n2 - 1 ? c : c + '66'; H.rr(g, 80 + k*(w - 160)/n2, h - 50 - bh, (w - 160)/n2 - 16, bh, 8); g.fill(); } }
  }
  // slide strip
  for(let k = 0; k < 19; k++){ g.fillStyle = k === n ? '#35a36a' : '#1f2a4422'; H.rr(g, w/2 - 19*14 + k*28, h - 22, 22, 10, 5); g.fill(); }
}
