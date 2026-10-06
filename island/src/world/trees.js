// Trees grown the EZ-Tree way (_ref/TREES-EZTREE.md) at the island's toy scale: branches come off a
// queue, each one a chain of tapered ring sections that wander (gnarliness), twist and bend toward a
// growth force; children sprout from a random point along their parent; the last level carries
// crossed leaf cards cut out of a canvas-drawn leaf atlas. Six species picked by where each tree
// stands: oak, birch, cherry blossom, willow by fresh water, pine, palm on the beach.
//
// map.js's scatter still decides every position, size and collider (and draws exactly the same
// numbers from its seeded stream as before); it hands its list to build() below. Nothing here
// calls the shared rng: this file has its own seeded stream.
//
// Three variants per species are grown once at load. Each tree is a stamped copy of one, merged
// into one mesh per 40 m tile (bark and leaves share a material: bark samples a solid white cell of
// the atlas), so a tile is one draw and frustum culling still works per tile. Wind is EZ-Tree's
// layered sine in the vertex shader, scaled by a flex weight that is 0 at the root and grows toward
// the tips. Seasons blend the leaf colours, drop the leaves card by card in winter (pines and palms
// keep theirs), dust snow on the upward faces, and switch the falling petals and leaves.

const TILE = 40;
const SEASONS = {
  spring: { bare:0, snow:0, petal:1, leaf:0, spring:1, autumn:0 },
  summer: { bare:0, snow:0, petal:0.45, leaf:0, spring:0, autumn:0 },
  autumn: { bare:0, snow:0, petal:0, leaf:1, spring:0, autumn:1 },
  winter: { bare:1, snow:1, petal:0, leaf:0, spring:0, autumn:1 },
};
const AUTUMN = {
  oak:['#e2682c', '#d4452f', '#f0a236', '#c93d2b', '#e98a33'],
  birch:['#ffd45e', '#f6c343', '#ffe07a'],
  cherry:['#e0453f', '#ec6c3c', '#c9383a'],
  willow:['#e6c65a', '#d9b44a'],
};
const SPRING = {
  oak:['#a6d65c', '#b8e06a', '#97cc55'],
  birch:['#c6e37a', '#d4ea86'],
  cherry:['#ffe0ea', '#ffd0e0', '#fff4f8'],
  willow:['#bde27a'],
};
const WILLOW = '#98c858', PALM = '#4f9a44';

// Leaf atlas: 4 x 2 cells of 128 px. Cell k sits at column k % 4, row floor(k / 4) counted from the
// bottom (uv space). Cell 7 has a solid white block at its centre for bark: bark uv never varies across
// a triangle, so it always samples the full-size level, and the clear margin keeps mipmaps from
// bleeding white into the leaf cells.
const CELLS = { oak:0, birch:1, cherry:2, willow:3, pine:4, palm:5 }, SOLID = 7;
const BARK_UV = [(SOLID % 4 + 0.5)/4, (Math.floor(SOLID/4) + 0.5)/2];

// Leaf kinds in aLeaf (integer part): 0 bark, 1 pine needles, 2 deciduous leaf (drops in winter),
// 3 palm leaf, 4 palm bark. The fraction on a leaf is its drop order, 0.05 to 0.95.
// Per-level arrays, as in EZ-Tree: index 0 is the trunk. radius[0] is metres, deeper levels are a
// fraction of the parent's radius where they sprout. angle is degrees off the parent. force is
// [x, y, z, strength] per level; the bend per section is strength / section radius, so thin twigs
// bend most. lead: the branch carries on from its own tip as the next level (deciduous). cone:
// the radius runs to a point and lower children are longer (evergreen). floor: no leaf card reaches
// below this height (metres, before the tree is scaled), so nothing hangs into the ground or the car.
export const SPECIES = {
  oak: { levels:2, lead:true, length:[2.0, 1.7, 1.05], radius:[0.3, 0.62, 0.6], taper:[0.45, 0.55, 0.7],
    sections:[4, 3, 2], segments:[7, 5, 3], angle:[0, 58, 48], start:[0, 0.45, 0.3], children:[4, 3, 0],
    gnarl:[0.015, 0.04, 0.06], twist:[0, 0.15, 0], force:[[0, 1, 0, 0.002], [0, 1, 0, 0.003], [0, 1, 0, 0.002]],
    leaves:{ count:4, start:0.2, angle:40, size:1.0, vary:0.2, aspect:1 }, bark:['#5e3d2a', '#8a5a3b'] },
  birch: { levels:2, lead:true, length:[3.6, 1.3, 0.7], radius:[0.14, 0.5, 0.55], taper:[0.6, 0.6, 0.7],
    sections:[6, 3, 2], segments:[6, 4, 3], angle:[0, 42, 40], start:[0, 0.35, 0.3], children:[6, 2, 0],
    gnarl:[0.008, 0.03, 0.05], twist:[0, 0, 0], force:[[0, 1, 0, 0], [0, 1, 0, 0.001], [0, -1, 0, 0.004]],
    leaves:{ count:4, start:0.1, angle:35, size:0.72, vary:0.2, aspect:0.9 }, bark:['#cfc8bb', '#f3efe6'], marks:'#3b3440' },
  cherry: { levels:2, lead:true, length:[1.3, 1.8, 1.0], radius:[0.26, 0.6, 0.6], taper:[0.35, 0.55, 0.7],
    sections:[3, 3, 2], segments:[7, 5, 3], angle:[0, 62, 50], start:[0, 0.5, 0.3], children:[4, 3, 0],
    gnarl:[0.02, 0.05, 0.07], twist:[0, 0.1, 0], force:[[0, 1, 0, 0.001], [0, 1, 0, 0.004], [0, 1, 0, 0.002]],
    leaves:{ count:4, start:0.15, angle:45, size:0.92, vary:0.2, aspect:1 }, bark:['#4f3029', '#6e4238'] },
  willow: { levels:2, lead:true, length:[2.0, 1.5, 2.4], radius:[0.32, 0.6, 0.5], taper:[0.4, 0.55, 0.8],
    sections:[4, 3, 4], segments:[7, 5, 3], angle:[0, 50, 30], start:[0, 0.5, 0.15], children:[5, 4, 0],
    gnarl:[0.015, 0.03, 0.02], twist:[0, 0, 0], force:[[0, 1, 0, 0], [0, 1, 0, 0.002], [0, -1, 0, 0.02]],
    leaves:{ count:5, start:0.15, angle:15, size:0.85, vary:0.15, aspect:0.45 }, bark:['#5a4a3c', '#7d6450'], floor:0.5 },
  pine: { levels:1, cone:true, length:[5.6, 2.3], radius:[0.22, 0.55], taper:[1, 1],
    sections:[6, 2], segments:[6, 3], angle:[0, 100], start:[0, 0.18], children:[16, 0],
    gnarl:[0.004, 0.02], twist:[0, 0], force:[[0, 1, 0, 0], [0, -1, 0, 0.002]], axial:true, floor:0.6,
    leaves:{ count:6, start:0, angle:30, size:1.0, vary:0.15, aspect:0.9 }, bark:['#4e3325', '#6f4a33'] },
  palm: { levels:1, length:[4.4, 2.2], radius:[0.17, 0.3], taper:[0.35, 0.8], tilt:0.35, nuts:3,
    sections:[7, 4], segments:[7, 3], angle:[0, 75], start:[0, 0.97], children:[9, 0],
    gnarl:[0, 0], twist:[0, 0], force:[[0, 1, 0, 0.008], [0, -1, 0, 0.012]],
    leaves:{ count:7, start:0.15, angle:65, size:0.75, vary:0.1, aspect:0.6, sides:2 }, bark:['#a67a4a', '#c79a63'], frond:'#6a8f3a' },
};

// Grows one tree. Pure apart from THREE maths and the rnd it is handed, so node can test it.
// Returns flat arrays per vertex: P position, N normal, UV atlas uv, C colour (bark) or shade
// (leaves, grey), F wind flex, K leaf kind + drop, J leaf colour jitter; I indices; H height.
export function grow(THREE, sp, rnd){
  const S = SPECIES[sp], B = S, L = S.leaves, top = B.levels;
  const { Vector3:V, Quaternion:Q, Euler:E, Color } = THREE;
  const rr = (a, b) => a + rnd()*(b - a);
  const T = { P:[], N:[], UV:[], C:[], F:[], K:[], J:[], I:[], quads:[], cards:0 };
  const UP = new V(0, 1, 0), AX = new V(1, 0, 0);
  const qForce = B.force.map(f => new Q().setFromUnitVectors(UP, new V(f[0], f[1], f[2]).normalize()));
  const col = new Color(), rgb = hex => { col.set(hex); return [col.r, col.g, col.b]; };
  const barkKind = sp === 'palm' ? 4 : 0, leafKind = sp === 'pine' ? 1 : sp === 'palm' ? 3 : 2;
  const cell = CELLS[sp], cu = cell % 4, cv = Math.floor(cell/4);
  const vert = (p, n, u, v, c, f, k, j) => { T.P.push(p.x, p.y, p.z); T.N.push(n.x, n.y, n.z); T.UV.push(u, v); T.C.push(c[0], c[1], c[2]); T.F.push(f); T.K.push(k); T.J.push(j); };
  const barkColor = (lv, i, n) => {
    if(sp === 'palm') return rgb(lv ? S.frond : (i % 2 ? S.bark[0] : S.bark[1]));
    if(S.marks && lv === 0 && rnd() < 0.2) return rgb(S.marks);
    const a = rgb(S.bark[0]), b = rgb(S.bark[1]), t = Math.min(1, (lv*n + i)/(n*1.5));
    return a.map((x, k) => x + (b[k] - x)*t);
  };

  // One leaf cluster: two crossed quads standing on o, pointing along q's +y, uv up the card.
  const p = new V(), nrm = new V(), qy = new Q();
  function leaf(o, q){
    const h = L.size*(1 + rr(-L.vary, L.vary)), w = h*L.aspect, j = rnd(), k = leafKind + 0.05 + 0.9*rnd();
    if(Math.min(o.y, p.set(0, h, 0).applyQuaternion(q).add(o).y) - w/2 < (S.floor ?? 0.8)) return;
    for(const rot of [0, Math.PI/2]){
      const i0 = T.P.length/3;
      qy.setFromAxisAngle(UP, rot).premultiply(q);
      for(const [x, y] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]){
        p.set(x*w, y*h, 0).applyQuaternion(qy).add(o);
        // normal and shade are set once the whole crown is known (see below)
        vert(p, UP, (cu + 0.02 + 0.96*(x + 0.5))/4, (cv + 0.02 + 0.96*y)/2, [1, 1, 1], 0.25 + 0.35*y, k, j);
      }
      T.I.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3); T.quads.push(i0);
    }
    T.cards++;
  }
  // Point and orientation at fraction t along a branch's sections.
  function along(secs, t){
    const m = secs.length - 1, k = Math.min(m - 1, Math.floor(t*m)), a = t*m - k, A = secs[k], Bs = secs[k + 1];
    return { o:new V().lerpVectors(A.o, Bs.o, a), q:A.q.clone().slerp(Bs.q, a), r:A.r + (Bs.r - A.r)*a };
  }
  // EZ-Tree's child frame: parent orientation, then spun round the parent by the radial angle,
  // then tipped off it by the level angle.
  const qa = new Q(), qb = new Q();
  const childQ = (pq, radial, deg) => pq.clone().multiply(qb.setFromAxisAngle(UP, radial).multiply(qa.setFromAxisAngle(AX, deg*Math.PI/180)));

  const q0 = new Q().setFromEuler(new E(S.tilt || 0, rnd()*Math.PI*2, 0, 'YXZ'));
  const queue = [{ o:new V(), q:q0, len:B.length[0], r:B.radius[0], lv:0 }];
  const e = new E(), qs = new Q(), qt = new Q(), step = new V();
  while(queue.length){
    const b = queue.shift(), n = B.sections[b.lv], seg = B.segments[b.lv], base = T.P.length/3, secs = [];
    const o = b.o.clone(); e.setFromQuaternion(b.q);
    for(let i=0; i<=n; i++){
      let r = B.cone ? b.r*(1 - i/n) : b.r*(1 - B.taper[b.lv]*i/n);
      if(i === n && b.lv === top) r = 0.001;
      if(i === 0 && b.lv === 0) r *= 1.35;
      const q = new Q().setFromEuler(e), c = barkColor(b.lv, i, n);
      for(let s=0; s<seg; s++){
        const a = s/seg*Math.PI*2;
        nrm.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q);
        vert(p.copy(o).addScaledVector(nrm, Math.max(r, 0.001)), nrm, BARK_UV[0], BARK_UV[1], c, 0.12*b.lv + 0.1*i/n, barkKind, 0);
      }
      secs.push({ o:o.clone(), q, r:i === 0 && b.lv === 0 ? b.r : r });
      o.add(step.set(0, b.len/n, 0).applyQuaternion(q));
      // gnarliness: thin sections wander more
      const g = Math.max(1, 1/Math.sqrt(Math.max(r, 0.001)))*B.gnarl[b.lv];
      e.x += rr(-g, g); e.z += rr(-g, g);
      qs.setFromEuler(e).multiply(qt.setFromAxisAngle(UP, B.twist[b.lv]));
      if(B.force[b.lv][3]) qs.rotateTowards(qForce[b.lv], B.force[b.lv][3]/Math.max(r, 0.02));
      e.setFromQuaternion(qs);
    }
    for(let i=0; i<n; i++) for(let s=0; s<seg; s++){
      const a = base + i*seg + s, c = base + i*seg + (s + 1)%seg;
      T.I.push(a, a + seg, c, c, a + seg, c + seg);
    }
    const last = secs[n];
    if(B.lead){ if(b.lv < top) queue.push({ o:last.o.clone(), q:last.q.clone(), len:B.length[b.lv + 1], r:last.r, lv:b.lv + 1 }); else leaf(last.o, last.q); }
    if(B.cone && b.lv === 0){ leaf(secs[n - 1].o, last.q); leaf(secs[n - 1].o, childQ(last.q, Math.PI/2, 8)); }
    if(S.nuts && b.lv === 0){
      const ico = new THREE.IcosahedronGeometry(0.13, 0), ip = ico.attributes.position, c = rgb('#6b4a2e');
      for(let k=0; k<S.nuts; k++){
        const a = k/S.nuts*Math.PI*2 + 0.5, at = last.o.clone().add(new V(Math.cos(a)*0.17, -0.2, Math.sin(a)*0.17)), i0 = T.P.length/3;
        for(let i=0; i<ip.count; i++){ p.fromBufferAttribute(ip, i); nrm.copy(p).normalize(); p.y *= 1.2; vert(p.add(at), nrm, BARK_UV[0], BARK_UV[1], c, 0.2, barkKind, 0); T.I.push(i0 + i); }
      }
    }
    if(b.lv === top){
      const off = rnd();
      for(let i=0; i<L.count; i++){
        const at = along(secs, rr(L.start, 1));
        const radial = L.sides ? Math.PI/2 + Math.PI*(i % 2) + rr(-0.2, 0.2) : Math.PI*2*(off + i/L.count);
        leaf(at.o, childQ(at.q, radial, L.angle));
      }
    } else {
      const count = B.children[b.lv], off = rnd(), lv = b.lv + 1;
      for(let i=0; i<count; i++){
        const t = rr(B.start[lv], 1), at = along(secs, t);
        queue.push({ o:at.o, q:childQ(at.q, Math.PI*2*(off + i/count), B.angle[lv]), len:B.length[lv]*(B.cone ? 1 - t : 1), r:B.radius[lv]*at.r, lv });
      }
    }
  }

  // Height, then flex: (height fraction)^1.5 plus what each vertex already carries for its level.
  let H = 0;
  for(let i=1; i<T.P.length; i+=3) H = Math.max(H, T.P[i]);
  for(let i=0; i<T.F.length; i++) T.F[i] = Math.min(1.4, Math.pow(Math.max(0, T.P[i*3 + 1])/H, 1.5) + T.F[i]);
  // Leaf normals point out of the crown (and a little up), so the crown shades like one soft mass,
  // lit on top and dark underneath, while each card still shows. Pines use the trunk as the axis.
  const cen = new V(), d = new V(); let nl = 0, R = 0;
  for(let i=0; i<T.K.length; i++) if(T.K[i] >= 1 && T.K[i] < 4){ cen.x += T.P[i*3]; cen.y += T.P[i*3 + 1]; cen.z += T.P[i*3 + 2]; nl++; }
  cen.multiplyScalar(1/Math.max(1, nl));
  const centreOf = (x, y, z) => d.set(x - cen.x, S.axial ? 0 : y - cen.y, z - cen.z);
  for(const i of T.quads) R = Math.max(R, centreOf(T.P[i*3], T.P[i*3 + 1], T.P[i*3 + 2]).length());
  for(const i of T.quads){
    let x = 0, y = 0, z = 0; for(let k=0; k<4; k++){ x += T.P[(i + k)*3]/4; y += T.P[(i + k)*3 + 1]/4; z += T.P[(i + k)*3 + 2]/4; }
    centreOf(x, y, z); const rn = Math.min(1, d.length()/Math.max(R, 0.01));
    if(d.lengthSq() < 1e-6) d.set(0, 1, 0);
    d.normalize(); nrm.copy(d).addScaledVector(UP, 0.45).normalize();
    const sh = 0.6 + 0.5*(d.y*0.5 + 0.5)*(0.55 + 0.45*rn) + (rnd() - 0.5)*0.14;
    for(let k=0; k<4; k++){ const v = i + k; T.N[v*3] = nrm.x; T.N[v*3 + 1] = nrm.y; T.N[v*3 + 2] = nrm.z; T.C[v*3] = T.C[v*3 + 1] = T.C[v*3 + 2] = sh; }
  }
  T.H = H; T.n = T.P.length/3; T.tris = T.I.length/3; T.sp = sp;
  return T;
}

// The leaf shapes, white on clear (vertex colour tints them), grey stems and veins.
function leafAtlas(THREE){
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d'), GREY = '#8f8f8f';
  const at = (k, draw) => { g.save(); g.translate((k % 4)*128, (1 - Math.floor(k/4))*128); draw(); g.restore(); };
  const stem = (y1, w = 4) => { g.strokeStyle = GREY; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 124); g.lineTo(64, y1); g.stroke(); };
  // An almond leaf from (x, y) at angle a (0 = straight up), with a vein.
  const almond = (x, y, a, len, wid, vein = true) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(wid, -len*0.45, 0, -len); g.quadraticCurveTo(-wid, -len*0.45, 0, 0); g.fill();
    if(vein){ g.strokeStyle = GREY; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len*0.8); g.stroke(); }
    g.restore();
  };
  const dot = (x, y, r, c = '#ffffff') => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill(); };
  at(CELLS.oak, () => {
    stem(28);
    for(let i=0; i<5; i++){
      const y = 112 - i*19, s = i % 2 ? 1 : -1, a = s*0.95, len = 50 - i*3;
      g.save(); g.translate(64, y); g.rotate(a);
      for(let k=0; k<4; k++) dot((k % 2 ? 7 : -7), -len*(0.25 + k*0.18), 11 - k);
      g.restore(); almond(64, y, a, len, 14);
    }
    almond(64, 34, 0, 32, 16);
  });
  at(CELLS.birch, () => {
    stem(20, 3);
    for(let i=0; i<8; i++) almond(64, 116 - i*12, (i % 2 ? 1 : -1)*0.85, 36, 15);
    almond(64, 24, 0, 22, 12);
  });
  at(CELLS.cherry, () => {
    g.strokeStyle = GREY; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 124); g.lineTo(64, 70); g.lineTo(40, 30); g.moveTo(64, 70); g.lineTo(90, 36); g.stroke();
    for(const [x, y, r] of [[64, 92, 13], [40, 64, 14], [88, 62, 14], [62, 46, 15], [36, 28, 12], [90, 26, 12], [64, 16, 11]]){
      for(let k=0; k<5; k++){ const a = k/5*Math.PI*2; dot(x + Math.cos(a)*r*0.7, y + Math.sin(a)*r*0.7, r*0.55); }
      dot(x, y, r*0.28, '#c8c8c8');
    }
  });
  at(CELLS.willow, () => {
    stem(6, 2);
    for(let i=0; i<9; i++) almond(64, 120 - i*12, (i % 2 ? 1 : -1)*0.32, 56 - i*2, 8, false);
  });
  at(CELLS.pine, () => {
    stem(8, 5);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.lineCap = 'round';
    for(let i=0; i<20; i++){
      const y = 120 - i*5.6, len = 36 - i*0.9;
      for(const s of [-1, 1]){ g.beginPath(); g.moveTo(64, y); g.lineTo(64 + s*Math.sin(0.8)*len, y - Math.cos(0.8)*len); g.stroke(); }
    }
  });
  at(CELLS.palm, () => {
    stem(4, 4);
    for(let i=0; i<12; i++){
      const y = 118 - i*9.5, len = 58*(1 - i*0.045);
      for(const s of [-1, 1]) almond(64, y, s*1.05, len, 7, false);
    }
  });
  at(SOLID, () => { g.fillStyle = '#ffffff'; g.fillRect(40, 40, 48, 48); });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function build(ctx, spots, kit = {}){
  const { THREE, scene, state, bus } = ctx;
  const { Lay } = kit;

  // Own seeded stream (never helpers.rng, which would shift everything seeded after map.js).
  let seed = 7160523;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const col = new THREE.Color();
  const rgbCache = new Map();
  const rgb = hex => { if(!rgbCache.has(hex)){ col.set(hex); rgbCache.set(hex, [col.r, col.g, col.b]); } return rgbCache.get(hex); };

  /* ---------------- variants, grown once ---------------- */
  const VARIANTS = {};
  for(const sp of Object.keys(SPECIES)) VARIANTS[sp] = [grow(THREE, sp, rnd), grow(THREE, sp, rnd), grow(THREE, sp, rnd)];

  /* ---------------- species by setting ---------------- */
  const coastGap = (x, z) => Lay.coast ? Lay.coast(Math.atan2(z, x)) - Math.hypot(x, z) : 99;
  function speciesOf(s){
    if(s.kind === 'cone') return 'pine';
    const dl = Lay.dLandAt(s.x, s.z), gap = coastGap(s.x, s.z);
    if(dl < 9 && gap < 13) return 'palm';
    if(dl < 7.5) return 'willow';
    const c = s.crown.c;
    if(c === '#ff9fb8' || c === '#f79ac0') return 'cherry';
    if(c === '#ffd45e') return 'birch';
    if(c === '#ffb06a') return 'oak';
    return rnd() < 0.3 ? 'birch' : 'oak';
  }

  /* ---------------- leaf colours: summer, spring, autumn per card ---------------- */
  const pickJ = (list, j) => list[Math.floor(j*list.length) % list.length];
  const BIRCH_SUMMER = new THREE.Color('#e4f59a');
  function leafColors(tree, j, out){
    const sp = tree.sp, k = 0.9 + 0.2*((j*7.13) % 1);
    if(sp === 'pine' || sp === 'palm'){ const c = sp === 'pine' ? tree.needle : rgb(PALM); for(let i=0; i<9; i++) out[i] = c[i % 3]; return; }
    if(sp === 'willow') out.set(rgb(WILLOW), 0);
    else if(sp === 'birch'){ col.set(tree.base).lerp(BIRCH_SUMMER, 0.18); out[0] = col.r; out[1] = col.g; out[2] = col.b; }
    else out.set(rgb(tree.base), 0);
    out.set(rgb(pickJ(SPRING[sp], j)), 3); out.set(rgb(pickJ(AUTUMN[sp], j)), 6);
    for(let i=0; i<9; i++) out[i] *= k;
  }

  /* ---------------- wind and season shader ---------------- */
  const U = { uTreeTime:{ value:0 }, uBare:{ value:0 }, uSnow:{ value:0 }, uSpring:{ value:0 }, uAutumn:{ value:0 } };
  // Displacement is added in view space after project_vertex, so it is in world metres, and the
  // same snippet works for the shadow depth pass. aTree = (tree x, tree z, flex, phase).
  const WIND = `
    {
      vec2 wDir = vec2(0.894, 0.447);
      float gust = 0.5 + 0.5*sin(dot(aTree.xy, wDir)*0.05 - uTreeTime*1.1);
      gust = gust*gust*gust*gust;
      // EZ-Tree's layered sway: sines at 1x, 2x and 5x the base rate, offset per tree and across the crown
      float o = aTree.w + dot(position, vec3(0.31, 0.17, 0.23));
      float tf = uTreeTime*1.4;
      float sw = 0.5*sin(tf + o) + 0.3*sin(2.0*tf + 1.3*o) + 0.2*sin(5.0*tf + 1.5*o);
      float fx = aTree.z;
      vec3 off = vec3(wDir.x, 0.0, wDir.y)*(0.06 + 0.5*gust + (0.12 + 0.16*gust)*sw)*fx;
      off.xz += vec2(-wDir.y, wDir.x)*0.07*sin(uTreeTime*1.1 + o*2.3)*fx;
      off.y -= 0.3*length(off.xz)*min(fx, 1.0);
      float kind = floor(aLeaf);
      float leafy = step(0.5, kind)*step(kind, 3.5);
      off += leafy*min(fx, 1.0)*(0.03 + 0.06*gust)*vec3(sin(uTreeTime*8.0 + o*3.0 + dot(position, vec3(7.1, 3.3, 5.7))),
        sin(uTreeTime*9.3 + o*2.0 + dot(position, vec3(4.3, 8.1, 2.9))), cos(uTreeTime*7.2 + dot(position, vec3(6.1, 2.7, 8.3))));
      mvPosition.xyz += mat3(viewMatrix)*off;
      gl_Position = projectionMatrix*mvPosition;
      // winter: each deciduous card goes once uBare passes its drop order
      if(kind > 1.5 && kind < 2.5 && fract(aLeaf) < uBare) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    }`;
  function windy(material){
    const depth = !!material.isMeshDepthMaterial;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTreeTime; uniform float uBare; attribute vec4 aTree; attribute float aLeaf;
          ${depth ? '' : 'uniform float uSpring; uniform float uAutumn; attribute vec3 aSpring; attribute vec3 aAutumn; varying float vKind;'}`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          ${WIND}`);
      if(depth) return;
      shader.vertexShader = shader.vertexShader
        .replace('#include <color_vertex>', `#include <color_vertex>
          vColor.rgb = 2.0*(color*(1.0 - uSpring - uAutumn) + aSpring*uSpring + aAutumn*uAutumn);
          vKind = floor(aLeaf);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnow; varying float vKind;')
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          {
            #ifdef DOUBLE_SIDED
              // leaf cards keep their out-of-the-crown normal on both faces
              if(vKind > 0.5 && vKind < 3.5) normal *= faceDirection;
            #endif
            float up = dot(normal, normalize((viewMatrix*vec4(0.0, 1.0, 0.0, 0.0)).xyz));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), uSnow*step(vKind, 1.5)*smoothstep(0.2, 0.65, up));
          }`);
    };
    material.customProgramCacheKey = () => 'trees-ez' + (depth ? '-depth' : '');
    material.needsUpdate = true;
    return material;
  }
  const atlas = leafAtlas(THREE);
  const treeMat = windy(new THREE.MeshStandardMaterial({ color:'#ffffff', map:atlas, vertexColors:true, alphaTest:0.5, roughness:.85, side:THREE.DoubleSide }));
  const treeDepth = windy(new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:atlas, alphaTest:0.5 }));

  /* ---------------- place every tree ---------------- */
  const tiles = new Map(), trees = [], counts = {};
  for(const s of spots){
    const sp = speciesOf(s), vr = VARIANTS[sp][Math.floor(rnd()*3)];
    const top = s.kind === 'cone' ? s.h + 1.3 + s.crown.sy/2 : s.h + 1.6*s.crown.sx;
    const sc = Math.max(0.62, Math.min(1.35, top/vr.H)) * (sp === 'palm' ? 1.05 : 1);
    const ry = rnd()*6.28, phase = rnd()*6.28, jo = rnd();
    const tree = { x:s.x, z:s.z, sp, sc, top:vr.H*sc, base:s.crown.c, vr, cs:Math.cos(ry), sn:Math.sin(ry), phase, jo,
      needle:sp === 'pine' ? rgb(s.crown.c).map(x => x*1.15) : null };
    const k = Math.floor(s.x/TILE)*1000 + Math.floor(s.z/TILE);
    if(!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(tree);
    trees.push(tree); counts[sp] = (counts[sp] || 0) + 1;
  }

  // Stamp each tile's trees into typed arrays, then one mesh per tile.
  // Colours are stored as bytes at half value (the shader doubles them), so shades up to 2 survive.
  const meshes = [], c9 = new Float32Array(9), byte = x => Math.min(255, Math.round(x*127.5));
  let cards = 0, tris = 0;
  for(const list of tiles.values()){
    let nv = 0, ni = 0;
    for(const t of list){ nv += t.vr.n; ni += t.vr.I.length; }
    const P = new Float32Array(nv*3), N = new Float32Array(nv*3), UV = new Float32Array(nv*2), C = new Uint8Array(nv*3);
    const SP = new Uint8Array(nv*3), AU = new Uint8Array(nv*3), TR = new Float32Array(nv*4), LF = new Float32Array(nv), IX = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let o = 0, oi = 0;
    for(const t of list){
      const A = t.vr, sc = t.sc, cs = t.cs, sn = t.sn;
      let lastJ = -1;
      for(let i=0; i<A.n; i++){
        const v = o + i, lx = A.P[i*3]*sc, lz = A.P[i*3 + 2]*sc, nx = A.N[i*3], nz = A.N[i*3 + 2];
        P[v*3] = t.x + lx*cs + lz*sn; P[v*3 + 1] = A.P[i*3 + 1]*sc; P[v*3 + 2] = t.z - lx*sn + lz*cs;
        N[v*3] = nx*cs + nz*sn; N[v*3 + 1] = A.N[i*3 + 1]; N[v*3 + 2] = -nx*sn + nz*cs;
        UV[v*2] = A.UV[i*2]; UV[v*2 + 1] = A.UV[i*2 + 1];
        TR[v*4] = t.x; TR[v*4 + 1] = t.z; TR[v*4 + 2] = A.F[i]*sc; TR[v*4 + 3] = t.phase;
        const kd = A.K[i]; LF[v] = kd;
        if(kd >= 1 && kd < 4){
          // the 8 corners of one card share a jitter, so the colours are worked out once per card
          if(A.J[i] !== lastJ){ lastJ = A.J[i]; leafColors(t, (A.J[i] + t.jo) % 1, c9); }
          const sh = A.C[i*3];
          for(let k=0; k<3; k++){ C[v*3 + k] = byte(c9[k]*sh); SP[v*3 + k] = byte(c9[3 + k]*sh); AU[v*3 + k] = byte(c9[6 + k]*sh); }
        } else for(let k=0; k<3; k++) C[v*3 + k] = SP[v*3 + k] = AU[v*3 + k] = byte(A.C[i*3 + k]);
      }
      for(let i=0; i<A.I.length; i++) IX[oi + i] = A.I[i] + o;
      o += A.n; oi += A.I.length; cards += A.cards; tris += A.tris;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3, true));
    g.setAttribute('aSpring', new THREE.BufferAttribute(SP, 3, true));
    g.setAttribute('aAutumn', new THREE.BufferAttribute(AU, 3, true));
    g.setAttribute('aTree', new THREE.BufferAttribute(TR, 4));
    g.setAttribute('aLeaf', new THREE.BufferAttribute(LF, 1));
    g.setIndex(new THREE.BufferAttribute(IX, 1));
    g.computeBoundingSphere(); g.boundingSphere.radius += 1;
    const m = new THREE.Mesh(g, treeMat); m.customDepthMaterial = treeDepth; m.castShadow = m.receiveShadow = true; scene.add(m);
    meshes.push(m);
  }

  /* ---------------- ground litter and toadstools ---------------- */
  const o3 = new THREE.Object3D();
  const onGrass = (x, z, bank) => Lay.landAt(x, z) && Lay.dLandAt(x, z) >= bank;
  const offRoad = (x, z, r) => Lay.roadDistAt(x, z) >= r;
  const litter = [], stems = [], caps = [];
  for(const t of trees){
    if(t.sp === 'pine' || t.sp === 'palm') continue;
    for(let k=0; k<12; k++){
      const a = rnd()*Math.PI*2, d = 0.5 + rnd()*2.1*t.sc, x = t.x + Math.cos(a)*d, z = t.z + Math.sin(a)*d;
      if(!onGrass(x, z, 0.4) || !offRoad(x, z, 4.8)) continue;
      litter.push({ x, y:0.035 + rnd()*0.01, z, rz:rnd()*6.28, sx:0.8 + rnd()*0.6, sy:0.8 + rnd()*0.5, k, j:rnd(), tree:t });
    }
    if(t.sp !== 'cherry' && rnd() < 0.16){
      const m = 1 + Math.floor(rnd()*3), a0 = rnd()*6;
      for(let k=0; k<m; k++){
        const a = a0 + k*0.7, d = 0.85 + rnd()*0.5, x = t.x + Math.cos(a)*d, z = t.z + Math.sin(a)*d, s = 0.7 + rnd()*0.6;
        if(!onGrass(x, z, 0.5)) continue;
        stems.push({ x, y:0.11*s, z, s }); caps.push({ x, y:0.2*s, z, s, c:rnd() < 0.8 ? '#e5484d' : '#ffb06a' });
      }
    }
  }
  function tiled(geo, material, list, set, shadow){
    const groups = new Map(), out = [];
    for(const it of list){ const k = Math.floor(it.x/TILE)*1000 + Math.floor(it.z/TILE); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    for(const items of groups.values()){
      const m = new THREE.InstancedMesh(geo, material, items.length);
      items.forEach((it, i) => { set(it, o3); o3.updateMatrix(); m.setMatrixAt(i, o3.matrix); m.setColorAt(i, col.set(it.c || '#ffffff')); });
      m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = shadow; m.receiveShadow = true; scene.add(m);
      out.push({ m, items });
    }
    return out;
  }
  const litterMeshes = tiled(new THREE.PlaneGeometry(0.2, 0.13), new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.9, side:THREE.DoubleSide }), litter,
    (it, o) => { o.position.set(it.x, it.y, it.z); o.rotation.set(-Math.PI/2, 0, it.rz); o.scale.set(it.sx, it.sy, 1); }, false);
  tiled(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6), new THREE.MeshStandardMaterial({ color:'#fbf3e4', roughness:.8 }), stems,
    (it, o) => { o.position.set(it.x, it.y, it.z); o.rotation.set(0, 0, 0); o.scale.setScalar(it.s); }, false);
  tiled(new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.6 }), caps,
    (it, o) => { o.position.set(it.x, it.y, it.z); o.rotation.set(0, 0, 0); o.scale.set(it.s, it.s*0.75, it.s); }, false);
  // How many of a tree's 12 litter leaves show, per season; winter's are under the snow.
  const LITTER = { spring:{ cherry:9, other:2 }, summer:{ cherry:6, other:3 }, autumn:{ cherry:12, other:12 }, winter:{ cherry:0, other:0 } };
  function applyLitter(season){
    for(const { m, items } of litterMeshes){
      items.forEach((it, i) => {
        const sp = it.tree.sp, show = it.k < LITTER[season][sp === 'cherry' ? 'cherry' : 'other'];
        o3.position.set(it.x, it.y, it.z); o3.rotation.set(-Math.PI/2, 0, it.rz); o3.scale.set(show ? it.sx : 0, show ? it.sy : 0, 1); o3.updateMatrix(); m.setMatrixAt(i, o3.matrix);
        let hex;
        if(season === 'autumn') hex = pickJ(AUTUMN[sp] || AUTUMN.oak, it.j);
        else if(sp === 'cherry') hex = season === 'spring' ? '#ffd6e3' : it.tree.base;
        else hex = pickJ(['#d9c25a', '#e0a94f', '#b8c85a'], it.j);
        m.setColorAt(i, col.set(hex));
      });
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
    }
  }

  /* ---------------- falling petals and leaves ---------------- */
  // One Points draw, all on the GPU: every particle belongs to a tree, falls from its crown to the
  // ground downwind on a loop, and starts from a new spot each loop. Petals under cherries, leaves
  // under the others; the season uniforms fade each kind in or out.
  const fall = [];
  for(const t of trees){
    if(t.sp === 'pine' || t.sp === 'palm') continue;
    const n = t.sp === 'cherry' ? 7 : 3;
    for(let k=0; k<n; k++) fall.push({ t, kind:t.sp === 'cherry' ? 0 : 1 });
  }
  const FN = fall.length, fo = new Float32Array(FN*3), fs = new Float32Array(FN*4), fc = new Float32Array(FN*3);
  const PETAL = ['#ffc3d4', '#ff9fb8', '#fff0f5', '#ffd6e3'];
  fall.forEach((p, i) => {
    fo.set([p.t.x, p.t.top*0.72, p.t.z], i*3); fs.set([rnd(), rnd(), rnd(), p.kind], i*4);
    col.set(p.kind ? pickJ(AUTUMN[p.t.sp] || AUTUMN.oak, rnd()) : pickJ(PETAL, rnd())); fc.set([col.r, col.g, col.b], i*3);
  });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(fo, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(fs, 4)); pg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const PU = { uTime:{ value:0 }, uScale:{ value:900 }, uPetal:{ value:SEASONS.summer.petal }, uLeaf:{ value:0 }, uSpread:{ value:1.6 } };
  const points = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms:PU, transparent:true, depthWrite:false, vertexColors:true,
    vertexShader:`
      uniform float uTime, uScale, uPetal, uLeaf, uSpread; attribute vec4 aSeed; varying vec3 vC; varying float vA; varying float vSpin;
      void main(){
        float dur = 6.0 + aSeed.x*5.0, cyc = uTime/dur + aSeed.y, life = fract(cyc);
        float h = fract(sin(floor(cyc)*12.9898 + aSeed.z*78.233)*43758.5453);
        float a = h*6.2832, rad = uSpread*(0.3 + 0.7*fract(h*7.13));
        vec3 p = position + vec3(cos(a)*rad, -life*position.y, sin(a)*rad);
        p.xz += vec2(0.894, 0.447)*life*3.0 + vec2(sin(uTime*1.3 + aSeed.x*20.0), cos(uTime*1.1 + aSeed.z*17.0))*0.45*life;
        p.y = max(p.y, 0.06);
        float on = mix(uPetal, uLeaf, aSeed.w);
        vA = on*smoothstep(0.0, 0.08, life)*(1.0 - smoothstep(0.9, 1.0, life));
        vSpin = uTime*(2.5 + aSeed.x*3.0) + aSeed.z*10.0; vC = color;
        vec4 mv = viewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = vA > 0.01 ? uScale*(0.16 + aSeed.x*0.06 + aSeed.w*0.06)/max(1.0, -mv.z) : 0.0;
      }`,
    fragmentShader:`
      varying vec3 vC; varying float vA; varying float vSpin;
      void main(){
        vec2 d = gl_PointCoord - 0.5; float c = cos(vSpin), s = sin(vSpin);
        d = vec2(c*d.x - s*d.y, s*d.x + c*d.y);
        float w = 0.16 + 0.14*abs(sin(vSpin*0.7));
        float a = 1.0 - smoothstep(0.8, 1.0, length(d/vec2(w, 0.42)));
        if(a < 0.05) discard;
        gl_FragColor = vec4(vC*(0.85 + 0.3*abs(cos(vSpin*0.7))), a*vA);
        #include <colorspace_fragment>
      }` }));
  points.frustumCulled = false; points.renderOrder = 4; scene.add(points);

  /* ---------------- seasons ---------------- */
  // Leaf colours live in the vertex buffers (summer, spring, autumn); a season change only blends
  // uniforms, so nothing is re-uploaded but the litter.
  let season = 'summer', blend = 1, fromU = null;
  applyLitter('summer');
  const KEYS = [['bare', U.uBare], ['snow', U.uSnow], ['spring', U.uSpring], ['autumn', U.uAutumn], ['petal', PU.uPetal], ['leaf', PU.uLeaf]];
  function setSeason(name){
    if(!SEASONS[name]) return false;
    if(name === season) return true;
    fromU = Object.fromEntries(KEYS.map(([k, u]) => [k, u.value]));
    season = name; applyLitter(name); blend = 0;
    return true;
  }
  function stepSeason(dt){
    if(blend >= 1) return;
    blend = state.reduced ? 1 : Math.min(1, blend + dt/1.8);
    const k = blend*blend*(3 - 2*blend), T = SEASONS[season];
    for(const [key, u] of KEYS) u.value = fromU[key] + (T[key] - fromU[key])*k;
  }

  let broken = false;
  ctx.onUpdate((dt, t, mode) => {
    if(broken) return;
    try {
      stepSeason(dt);
      if(mode === 'interior') return;
      if(!state.reduced){ U.uTreeTime.value = t; PU.uTime.value = t; }
      PU.uScale.value = innerHeight*ctx.renderer.getPixelRatio()/(2*Math.tan(ctx.camera.fov*Math.PI/360));
      points.visible = !state.reduced;
    } catch(e){ broken = true; console.warn('[trees] frame hook disabled', e); }
  }, 70);

  const variants = {};
  for(const [sp, list] of Object.entries(VARIANTS)) variants[sp] = list.map(v => ({ tris:v.tris, verts:v.n, cards:v.cards, h:+v.H.toFixed(2) }));
  const api = {
    setSeason, season:() => season,
    stats:() => ({ trees:trees.length, species:{ ...counts }, meshes:meshes.length, cards, tris, variants, litter:litter.length, toadstools:caps.length, falling:FN }),
    uniforms:{ wind:U.uTreeTime, bare:U.uBare, snow:U.uSnow },
    find:sp => trees.filter(t => !sp || t.sp === sp).map(t => ({ x:+t.x.toFixed(1), z:+t.z.toFixed(1), sp:t.sp })),
  };
  bus?.on?.('atmosphere', d => { if(d?.season) setSeason(d.season); });
  bus?.once?.('ready', () => { const s = ctx.modules.atmosphere?.season?.(); if(s) setSeason(s); });
  ctx.modules.trees = api;
  try { ctx.expose('trees', api); } catch(e){ console.warn('[trees] expose failed', e); }
  return api.stats();
}
