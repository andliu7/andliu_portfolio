// Trees with real structure instead of a ball on a stick: a trunk that forks into tapered
// branches, clumps of individual leaf cards at the branch tips, and six species picked by where
// each tree stands: broad oak, birch, cherry blossom, willow by fresh water, pine, palm on the beach.
//
// map.js's scatter still decides every position, size and collider (and draws exactly the same
// numbers from its seeded stream as before); it hands its list to build() below. Nothing here
// calls the shared rng: this file has its own seeded stream.
//
// Per 40 m tile there are two tree draws: one merged "body" mesh (bark, pine tiers, willow strands
// and palm fronds, vertex coloured) and one InstancedMesh of leaf clumps, plus the ground litter
// and toadstools. Wind is a vertex shader on both, driven by one shared time uniform: a steady lean,
// a sway and gust bands that roll across the island, all scaled by a flex weight that is 0 at the
// root and grows toward the tips. Seasons recolour the clumps, drop them in winter (pines and palms
// keep theirs), dust snow on the upward faces, and switch the falling petals and leaves.

const TILE = 40;
const SEASONS = {
  spring: { bare:0, snow:0, petal:1, leaf:0, willow:'#bde27a' },
  summer: { bare:0, snow:0, petal:0.45, leaf:0, willow:'#98c858' },
  autumn: { bare:0, snow:0, petal:0, leaf:1, willow:'#e6c65a' },
  winter: { bare:1, snow:1, petal:0, leaf:0, willow:'#e6c65a' },
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

export function build(ctx, spots, kit = {}){
  const { THREE, scene, state, bus } = ctx;
  const { Lay } = kit;
  const V = THREE.Vector3, Y = new V(0, 1, 0);

  // Own seeded stream (never helpers.rng, which would shift everything seeded after map.js).
  let seed = 7160523;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const rr = (a, b) => a + rnd()*(b - a);
  const col = new THREE.Color();
  const rgb = (hex, k = 1) => { col.set(hex); return [col.r*k, col.g*k, col.b*k]; };
  const dirOf = (a, tilt) => new V(Math.sin(tilt)*Math.cos(a), Math.cos(tilt), Math.sin(tilt)*Math.sin(a));

  /* ---------------- geometry builders (local tree space, metres) ---------------- */
  // An accumulator: positions, normals, colours, flex (wind weight) and leaf kind per vertex.
  // Leaf kind: 0 bark, 1 pine needles, 2 willow strands, 3 palm (no snow on palms).
  const Acc = () => ({ P:[], N:[], C:[], F:[], L:[], I:[], tips:[] });
  function vert(A, p, n, c, f, leaf){ A.P.push(p.x, p.y, p.z); A.N.push(n.x, n.y, n.z); A.C.push(c[0], c[1], c[2]); A.F.push(f); A.L.push(leaf); return A.P.length/3 - 1; }
  const flexAt = (p, H, along = 0) => Math.min(1.4, Math.pow(Math.max(0, p.y)/H, 1.5) + 0.3*along);

  // A tapered tube through pts [{ p, r, f }], colour per ring from colorOf(i, side).
  function tube(A, pts, sides, colorOf, leaf = 0){
    const base = A.P.length/3, t = new V(), u = new V(), w = new V(), n = new V(), q = new V();
    pts.forEach((pt, i) => {
      t.subVectors(pts[Math.min(pts.length - 1, i + 1)].p, pts[Math.max(0, i - 1)].p).normalize();
      u.set(0, 0, 1); if(Math.abs(t.z) > 0.9) u.set(1, 0, 0);
      u.cross(t).normalize(); w.crossVectors(t, u);
      for(let s=0; s<sides; s++){
        const an = s/sides*Math.PI*2; n.copy(u).multiplyScalar(Math.cos(an)).addScaledVector(w, Math.sin(an));
        vert(A, q.copy(pt.p).addScaledVector(n, pt.r), n, colorOf(i, s), pt.f, leaf);
      }
    });
    for(let i=0; i<pts.length - 1; i++) for(let s=0; s<sides; s++){
      const a = base + i*sides + s, b = base + i*sides + (s + 1)%sides;
      A.I.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  // A branch from S along dir, curving up by bend, radius r0 -> r1. Returns its tip.
  function branch(A, S, dir, L, r0, r1, bend, H, colorOf, n = 4, along0 = 0.4){
    const pts = [];
    for(let i=0; i<=n; i++){ const t = i/n, p = S.clone().addScaledVector(dir, L*t); p.y += bend*L*t*t; pts.push({ p, r:r0 + (r1 - r0)*t, f:flexAt(p, H, along0 + t*0.6) }); }
    tube(A, pts, 5, colorOf); return pts[n].p;
  }
  // A leaf card: a diamond from base to tip along u, width along v.
  function card(A, c, u, v, len, wid, nrm, color, f0, f1, leaf){
    const i = A.P.length/3, q = new V();
    vert(A, q.copy(c).addScaledVector(u, -len/2), nrm, color, f0, leaf);
    vert(A, q.copy(c).addScaledVector(u, len*0.06).addScaledVector(v, wid/2), nrm, color, (f0 + f1)/2, leaf);
    vert(A, q.copy(c).addScaledVector(u, len/2), nrm, color, f1, leaf);
    vert(A, q.copy(c).addScaledVector(u, len*0.06).addScaledVector(v, -wid/2), nrm, color, (f0 + f1)/2, leaf);
    A.I.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const ringColor = (a, b, rings) => i => rgb(a, 1).map((x, k) => x + (rgb(b)[k] - x)*Math.min(1, i/rings));
  function trunk(A, top, r0, r1, H, colorOf, rings = 4, lean = null){
    const pts = [];
    for(let i=0; i<=rings; i++){ const t = i/rings, p = lean ? lean(t) : new V(top.x*t*t, top.y*t, top.z*t*t); pts.push({ p, r:(r0 + (r1 - r0)*t) + (i === 0 ? r0*0.3 : 0), f:flexAt(p, H) }); }
    tube(A, pts, 7, colorOf); return pts;
  }

  // Leaf clump: 40 diamond cards facing out round an ellipsoid, plus a dark core so it reads as a
  // solid mass from any side. Normals point out and a little up, so the clump shades like one soft
  // ball (lit on top, dark underneath) while you still see the separate leaves.
  function clumpGeometry(){
    const A = Acc(), d = new V(), u = new V(), v = new V(), nrm = new V(), tmp = new V();
    for(let k=0; k<40; k++){
      d.set(rnd()*2 - 1, rnd()*1.7 - 0.6, rnd()*2 - 1); if(d.lengthSq() < 0.01) d.set(0, 1, 0); d.normalize();
      const r = 0.55 + 0.45*Math.sqrt(rnd()), c = d.clone().multiplyScalar(r); c.y *= 0.85;
      tmp.set(rnd()*2 - 1, rnd()*2 - 1, rnd()*2 - 1).normalize();
      u.crossVectors(d, tmp).normalize(); v.crossVectors(d, u).normalize();
      nrm.copy(d).addScaledVector(Y, 0.45).normalize();
      const sh = 0.6 + 0.5*(d.y*0.5 + 0.5)*(0.55 + 0.45*r) + (rnd() - 0.5)*0.14;
      card(A, c, u, v, 0.44, 0.26, nrm, [sh, sh, sh*0.96], 0, 0, 0);
    }
    const ico = new THREE.IcosahedronGeometry(0.62, 0), ip = ico.attributes.position, p = new V();
    for(let i=0; i<ip.count; i++){ p.fromBufferAttribute(ip, i); p.y *= 0.85; const idx = vert(A, p, p.clone().normalize(), [0.46, 0.46, 0.44], 0, 0); A.I.push(idx); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(A.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(A.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(A.C, 3));
    g.setIndex(A.I);
    return g;
  }

  /* ---------------- species (a few variants each, generated once) ---------------- */
  const tipAt = (A, p, s, H, extra = {}) => A.tips.push({ p:p.clone(), s, f:flexAt(p, H, 1), ...extra });

  function oak(){
    const A = Acc(), H = 4.9, bark = ringColor('#5e3d2a', '#8a5a3b', 3), twig = () => rgb('#8a5a3b');
    const fork = new V(rr(-0.15, 0.15), rr(1.6, 1.9), rr(-0.15, 0.15));
    trunk(A, fork, 0.32, 0.2, H, bark);
    const n = rnd() < 0.5 ? 3 : 4, a0 = rnd()*6.28;
    for(let k=0; k<n; k++){
      const a = a0 + k/n*6.28 + rr(-0.3, 0.3), tilt = rr(0.7, 0.95), L = rr(1.2, 1.5), dir = dirOf(a, tilt);
      const S = fork.clone().addScaledVector(Y, -0.15);
      tipAt(A, branch(A, S, dir, L, 0.16, 0.07, 0.35, H, twig), rr(0.95, 1.12), H);
      const M = S.clone().addScaledVector(dir, L*0.5); M.y += 0.35*L*0.25;
      const side = rnd() < 0.5 ? -1 : 1;
      tipAt(A, branch(A, M, dirOf(a + side*rr(0.7, 1.1), tilt*0.75), L*0.6, 0.08, 0.035, 0.4, H, twig, 3, 0.7), rr(0.75, 0.9), H);
    }
    tipAt(A, branch(A, fork, dirOf(rnd()*6.28, 0.12), 1.5, 0.14, 0.06, 0, H, twig, 3), 1.15, H);
    return { A, H, sp:'oak' };
  }
  function birch(){
    const A = Acc(), H = 5.4, top = new V(rr(-0.2, 0.2), 4.1, rr(-0.2, 0.2));
    // white bark with dark marks: some ring vertices go charcoal, and the colour smears into streaks
    const marks = (i, s) => rnd() < 0.2 ? rgb('#3b3440') : rgb(i === 0 ? '#cfc8bb' : '#f3efe6');
    trunk(A, top, 0.15, 0.06, H, marks, 7, t => new V(top.x*t*t + Math.sin(t*5)*0.06, top.y*t, top.z*t*t));
    tipAt(A, top.clone().add(new V(0, 0.35, 0)), 0.72, H);
    const n = 3 + (rnd() < 0.5 ? 1 : 0), a0 = rnd()*6.28, twig = () => rgb('#e9e3d8');
    for(let k=0; k<n; k++){
      const a = a0 + k/n*6.28 + rr(-0.3, 0.3), y = rr(1.9, 3.5), S = new V(top.x*(y/4.1)**2, y, top.z*(y/4.1)**2);
      const dir = dirOf(a, rr(0.45, 0.7)), L = rr(0.9, 1.25);
      const E = branch(A, S, dir, L, 0.06, 0.025, 0.3, H, twig, 3);
      tipAt(A, E, rr(0.58, 0.72), H);
      tipAt(A, S.clone().addScaledVector(dir, L*0.45).add(new V(0, 0.25, 0)), rr(0.45, 0.55), H);
    }
    return { A, H, sp:'birch' };
  }
  function cherry(){
    const A = Acc(), H = 4.2, bark = ringColor('#4f3029', '#6e4238', 3), twig = () => rgb('#6e4238');
    const fork = new V(rr(-0.2, 0.2), rr(1.1, 1.35), rr(-0.2, 0.2));
    trunk(A, fork, 0.28, 0.19, H, bark);
    const n = rnd() < 0.5 ? 3 : 4, a0 = rnd()*6.28;
    for(let k=0; k<n; k++){
      const a = a0 + k/n*6.28 + rr(-0.25, 0.25), tilt = rr(0.95, 1.15), L = rr(1.4, 1.75), dir = dirOf(a, tilt);
      tipAt(A, branch(A, fork, dir, L, 0.14, 0.05, 0.45, H, twig), rr(0.95, 1.1), H, { flat:true });
      const M = fork.clone().addScaledVector(dir, L*0.45); M.y += 0.45*L*0.2;
      tipAt(A, branch(A, M, dirOf(a + rr(-0.9, 0.9), tilt*0.6), L*0.55, 0.07, 0.03, 0.3, H, twig, 3, 0.7), rr(0.75, 0.9), H, { flat:true });
    }
    tipAt(A, fork.clone().add(new V(0, 1.7, 0)), 1.05, H, { flat:true });
    branch(A, fork, Y, 1.4, 0.12, 0.05, 0, H, twig, 2);
    return { A, H, sp:'cherry' };
  }
  function willow(){
    const A = Acc(), H = 5.1, bark = ringColor('#5a4a3c', '#7d6450', 3), twig = () => rgb('#7d6450');
    const fork = new V(rr(-0.2, 0.2), rr(1.8, 2.1), rr(-0.2, 0.2));
    trunk(A, fork, 0.36, 0.23, H, bark);
    const n = 3, a0 = rnd()*6.28;
    for(let k=0; k<n; k++){
      const a = a0 + k/n*6.28 + rr(-0.3, 0.3), dir = dirOf(a, rr(0.6, 0.8));
      tipAt(A, branch(A, fork, dir, rr(1.2, 1.4), 0.17, 0.07, 0.5, H, twig), rr(0.85, 1.0), H);
    }
    tipAt(A, fork.clone().add(new V(0, 1.9, 0)), 1.0, H);
    branch(A, fork, Y, 1.6, 0.15, 0.07, 0, H, twig, 2);
    // hanging strands: chains of long thin leaves from the rim of the crown down to about knee height
    const out = new V(), side = new V(), c = new V(), dn = new V();
    for(let j=0; j<28; j++){
      const a = j/28*6.28 + rr(-0.12, 0.12), R = rr(1.3, 2.25), y0 = rr(3.4, 4.3), len = rr(2.1, 3.1), cards = 7, step = len/cards;
      out.set(Math.cos(a), 0, Math.sin(a)); side.set(-out.z, 0, out.x);
      const f0 = flexAt(new V(0, y0, 0), H, 0.6);
      for(let k=0; k<cards; k++){
        const t = (k + 0.5)/cards;
        c.set(fork.x + out.x*(R + t*0.35), y0 - t*len, fork.z + out.z*(R + t*0.35)).addScaledVector(side, Math.sin(t*3 + j)*0.06);
        dn.set(out.x*0.12, -1, out.z*0.12).normalize();
        const sh = 0.78 + 0.3*(1 - t) + (rnd() - 0.5)*0.12;
        card(A, c, dn, side, step*1.25, 0.16, out.clone().addScaledVector(Y, 0.35).normalize(), [sh, sh, sh], f0 + 0.55*t, f0 + 0.55*(t + 1/cards), 2);
      }
    }
    return { A, H, sp:'willow' };
  }
  function pine(){
    const A = Acc(), H = 6.0;
    trunk(A, new V(0, 5.3, 0), 0.24, 0.05, H, ringColor('#4e3325', '#6f4a33', 3));
    // tiers: a skirt of needle sprays that droop outward, two layers each, shrinking up the trunk
    const tiers = 4, out = new V(), side = new V(), u = new V(), c = new V(), nrm = new V();
    for(let k=0; k<tiers; k++){
      const y = 1.5 + k*1.05 + rr(-0.08, 0.08), R = 1.8 - k*0.38;
      for(const layer of [0, 1]){
        const m = layer ? 9 : 15, RR = layer ? R*0.68 : R, lift = layer ? 0.28 : 0;
        for(let j=0; j<m; j++){
          const a = (j + layer*0.5)/m*6.28 + rr(-0.1, 0.1);
          out.set(Math.cos(a), 0, Math.sin(a)); side.set(-out.z, 0, out.x);
          const root = new V(0, y + 0.42 + lift, 0), tip = new V(out.x*RR, y - 0.32*RR + lift, out.z*RR);
          u.subVectors(tip, root); const L = u.length(); u.normalize();
          nrm.copy(out).multiplyScalar(0.45).add(Y).normalize();
          for(const [t0, t1] of [[0.1, 0.6], [0.45, 1.0]]){
            c.copy(root).addScaledVector(u, L*(t0 + t1)/2);
            const sh = 0.62 + 0.45*t1 + layer*0.08;
            card(A, c, u, side, L*(t1 - t0)*1.15, 0.5*(1 - t0*0.5), nrm, [sh, sh, sh], flexAt(c, H, t0), flexAt(c, H, t1), 1);
          }
        }
      }
    }
    // a little spike on top
    for(let j=0; j<5; j++){
      const a = j/5*6.28; out.set(Math.cos(a), 0, Math.sin(a)); side.set(-out.z, 0, out.x);
      u.set(out.x*0.25, 1, out.z*0.25).normalize(); c.set(out.x*0.1, 5.55, out.z*0.1);
      card(A, c, u, side, 0.9, 0.3, out.clone().add(Y).normalize(), [1.05, 1.05, 1.05], 0.9, 1.1, 1);
    }
    return { A, H, sp:'pine' };
  }
  function palm(){
    const A = Acc(), H = 5.0, bend = rr(0.8, 1.3), ht = rr(4.2, 4.6);
    const lean = t => new V(bend*t*t, ht*t, 0);
    // banded trunk: rings alternate light and dark
    const pts = [];
    for(let i=0; i<=9; i++){ const t = i/9, p = lean(t); pts.push({ p, r:0.2 - 0.07*t + (i === 0 ? 0.08 : 0), f:flexAt(p, H) }); }
    tube(A, pts, 7, i => rgb(i % 2 ? '#a67a4a' : '#c79a63'), 3);
    const T = lean(1), fT = flexAt(T, H);
    for(let k=0; k<3; k++){ const a = k/3*6.28 + 0.5, p = T.clone().add(new V(Math.cos(a)*0.2, -0.18, Math.sin(a)*0.2)); tube(A, [{ p:p.clone().add(new V(0, -0.14, 0)), r:0.02, f:fT }, { p, r:0.15, f:fT }, { p:p.clone().add(new V(0, 0.14, 0)), r:0.02, f:fT }], 6, () => rgb('#6b4a2e'), 3); }
    // fronds: an arching spine with leaflets both sides, drooping toward the tip
    const n = 8, dir = new V(), side = new V(), u = new V(), c = new V();
    for(let j=0; j<n; j++){
      const a = j/n*6.28 + rr(-0.15, 0.15), L = rr(1.9, 2.3), up = rr(0.4, 0.7);
      dir.set(Math.cos(a), 0, Math.sin(a)); side.set(-dir.z, 0, dir.x);
      const at = t => T.clone().addScaledVector(dir, L*t).add(new V(0, up*t - 1.7*t*t, 0));
      const spine = []; for(let i=0; i<=4; i++){ const t = i/4, p = at(t); spine.push({ p, r:0.045*(1 - t*0.7), f:fT + 0.7*t }); }
      tube(A, spine, 4, () => rgb('#6a8f3a'), 3);
      for(let i=1; i<=8; i++){
        const t = i/9, p = at(t), nx = at(Math.min(1, t + 0.05)).sub(p).normalize();
        for(const s of [-1, 1]){
          u.copy(side).multiplyScalar(s).addScaledVector(nx, 0.5).add(new V(0, -0.45, 0)).normalize();
          const len = 0.75*(1 - t*0.45); c.copy(p).addScaledVector(u, len/2);
          const sh = 0.8 + 0.3*t;
          card(A, c, u, nx, len, 0.16, new V(0, 1, 0), rgb('#4f9a44', sh), fT + 0.7*t, fT + 0.75*t + 0.1, 3);
        }
      }
    }
    return { A, H, sp:'palm' };
  }
  const MAKERS = { oak, birch, cherry, willow, pine, palm };
  const VARIANTS = {};
  for(const [sp, make] of Object.entries(MAKERS)) VARIANTS[sp] = [make(), make(), make()];

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

  /* ---------------- wind and season shader ---------------- */
  const U = { uTreeTime:{ value:0 }, uBare:{ value:0 }, uSnow:{ value:0 }, uWillow:{ value:new THREE.Color(SEASONS.summer.willow) } };
  // Displacement is added in view space after project_vertex, so it is in world metres whatever the
  // instance's rotation and scale are, and the same snippet works for the shadow depth pass.
  const WIND = `
    {
      vec2 wDir = vec2(0.894, 0.447);
      float gust = 0.5 + 0.5*sin(dot(aTree.xy, wDir)*0.05 - uTreeTime*1.1);
      gust = gust*gust*gust*gust;
      float sw = sin(uTreeTime*1.4 + aTree.w)*0.6 + sin(uTreeTime*2.3 + aTree.w*1.9)*0.4;
      float fx = FLEX;
      vec3 off = vec3(wDir.x, 0.0, wDir.y)*(0.06 + 0.5*gust + (0.1 + 0.16*gust)*sw)*fx;
      off.xz += vec2(-wDir.y, wDir.x)*0.07*sin(uTreeTime*1.1 + aTree.w*2.3)*fx;
      off.y -= 0.3*length(off.xz)*min(fx, 1.0);
      off += FLUTTER*(0.035 + 0.07*gust)*vec3(sin(uTreeTime*8.0 + aTree.w + dot(position, vec3(7.1, 3.3, 5.7))),
        sin(uTreeTime*9.3 + aTree.w + dot(position, vec3(4.3, 8.1, 2.9))), cos(uTreeTime*7.2 + dot(position, vec3(6.1, 2.7, 8.3))));
      mvPosition.xyz += mat3(viewMatrix)*off;
      gl_Position = projectionMatrix*mvPosition;
    }`;
  function windy(material, kind){
    const clump = kind === 'clump';
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTreeTime; uniform float uBare; attribute vec4 aTree;
          ${clump ? '' : 'attribute float aLeaf; varying float vLeaf;'}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          ${clump ? 'transformed *= 1.0 - uBare;' : 'vLeaf = aLeaf;'}`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          ${WIND.replace('FLEX', clump ? 'aTree.z' : 'aTree.z').replace('FLUTTER', clump ? '1.0' : 'step(0.5, aLeaf)*min(aTree.z*1.5, 1.0)')}
          ${clump ? '' : 'if(aLeaf > 1.5 && aLeaf < 2.5 && uBare > 0.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);'}`);
      if(material.isMeshDepthMaterial || clump) return;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnow; uniform vec3 uWillow; varying float vLeaf;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif(vLeaf > 1.5 && vLeaf < 2.5) diffuseColor.rgb *= uWillow;')
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          {
            float up = dot(normal, normalize((viewMatrix*vec4(0.0, 1.0, 0.0, 0.0)).xyz));
            float snowy = vLeaf < 1.5 ? 1.0 : 0.0;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), uSnow*snowy*smoothstep(0.2, 0.65, up));
          }`);
    };
    material.customProgramCacheKey = () => 'trees-' + kind + (material.isMeshDepthMaterial ? '-depth' : '');
    material.needsUpdate = true;
    return material;
  }
  const depthOf = kind => windy(new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking }), kind);
  const bodyMat = windy(new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.85, side:THREE.DoubleSide }), 'body');
  const clumpMat = windy(new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.8, side:THREE.DoubleSide }), 'clump');
  const bodyDepth = depthOf('body'), clumpDepth = depthOf('clump');

  /* ---------------- place every tree ---------------- */
  const tiles = new Map();
  const tileOf = (x, z) => { const k = Math.floor(x/TILE)*1000 + Math.floor(z/TILE); if(!tiles.has(k)) tiles.set(k, { P:[], N:[], C:[], T:[], L:[], I:[], clumps:[] }); return tiles.get(k); };
  const trees = [], counts = {};
  for(const s of spots){
    const sp = speciesOf(s), vr = VARIANTS[sp][Math.floor(rnd()*3)];
    const top = s.kind === 'cone' ? s.h + 1.3 + s.crown.sy/2 : s.h + 1.6*s.crown.sx;
    const sc = Math.max(0.62, Math.min(1.35, top/vr.H)) * (sp === 'palm' ? 1.05 : 1);
    const ry = rnd()*6.28, cs = Math.cos(ry), sn = Math.sin(ry), phase = rnd()*6.28;
    const tint = sp === 'pine' ? rgb(s.crown.c, 1.25) : null;
    const tile = tileOf(s.x, s.z), A = vr.A, o = tile.P.length/3;
    for(let i=0; i<A.P.length/3; i++){
      const lx = A.P[i*3]*sc, ly = A.P[i*3 + 1]*sc, lz = A.P[i*3 + 2]*sc;
      tile.P.push(s.x + lx*cs + lz*sn, ly, s.z - lx*sn + lz*cs);
      const nx = A.N[i*3], nz = A.N[i*3 + 2]; tile.N.push(nx*cs + nz*sn, A.N[i*3 + 1], -nx*sn + nz*cs);
      const lf = A.L[i];
      if(lf === 1) tile.C.push(A.C[i*3]*tint[0], A.C[i*3 + 1]*tint[1], A.C[i*3 + 2]*tint[2]); else tile.C.push(A.C[i*3], A.C[i*3 + 1], A.C[i*3 + 2]);
      tile.T.push(s.x, s.z, A.F[i]*sc, phase); tile.L.push(lf);
    }
    for(const ix of A.I) tile.I.push(ix + o);
    const tree = { x:s.x, z:s.z, sp, sc, top:vr.H*sc, base:s.crown.c, clumps:[] };
    for(const tp of A.tips){
      const lx = tp.p.x*sc, lz = tp.p.z*sc, k = tp.s*sc*rr(0.92, 1.08);
      const cl = { x:s.x + lx*cs + lz*sn, y:tp.p.y*sc, z:s.z - lx*sn + lz*cs, sx:k, sy:k*(tp.flat ? 0.78 : 0.95), sz:k, ry:rnd()*6.28, f:tp.f*sc, phase, j:rnd(), tree };
      tileOf(cl.x, cl.z).clumps.push(cl); tree.clumps.push(cl);
    }
    trees.push(tree); counts[sp] = (counts[sp] || 0) + 1;
  }

  const clumpGeo = clumpGeometry(), o3 = new THREE.Object3D();
  const clumpMeshes = [];
  let bodies = 0;
  for(const t of tiles.values()){
    if(t.I.length){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(t.P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(t.N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(t.C, 3));
      g.setAttribute('aTree', new THREE.Float32BufferAttribute(t.T, 4));
      g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(t.L, 1));
      g.setIndex(t.I);
      const m = new THREE.Mesh(g, bodyMat); m.customDepthMaterial = bodyDepth; m.castShadow = m.receiveShadow = true; scene.add(m); bodies++;
    }
    if(t.clumps.length){
      const g = clumpGeo.clone(), n = t.clumps.length, at = new Float32Array(n*4);
      const m = new THREE.InstancedMesh(g, clumpMat, n);
      t.clumps.forEach((c, i) => {
        o3.position.set(c.x, c.y, c.z); o3.rotation.set(0, c.ry, 0); o3.scale.set(c.sx, c.sy, c.sz); o3.updateMatrix(); m.setMatrixAt(i, o3.matrix);
        m.setColorAt(i, col.set('#ffffff'));
        at.set([c.tree.x, c.tree.z, c.f, c.phase], i*4);
      });
      g.setAttribute('aTree', new THREE.InstancedBufferAttribute(at, 4));
      m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.boundingSphere.radius += 1;
      m.customDepthMaterial = clumpDepth; m.castShadow = m.receiveShadow = true; scene.add(m);
      clumpMeshes.push({ m, list:t.clumps, from:new Float32Array(n*3), to:new Float32Array(n*3) });
    }
  }

  /* ---------------- clump colours by season ---------------- */
  const pickJ = (list, j) => list[Math.floor(j*list.length) % list.length];
  function clumpColor(c, season, out){
    const sp = c.tree.sp, j = c.j;
    let hex;
    if(season === 'autumn' || season === 'winter') hex = pickJ(AUTUMN[sp] || AUTUMN.oak, j);
    else if(season === 'spring') hex = pickJ(SPRING[sp] || SPRING.oak, j);
    else hex = sp === 'willow' ? SEASONS.summer.willow : c.tree.base;
    col.set(hex);
    if(season === 'summer' && sp === 'birch') col.lerp(new THREE.Color('#e4f59a'), 0.18);
    const k = 0.9 + 0.2*((j*7.13) % 1);
    out[0] = col.r*k; out[1] = col.g*k; out[2] = col.b*k;
  }
  const tmp3 = [0, 0, 0];
  function targetColors(season){
    for(const cm of clumpMeshes) cm.list.forEach((c, i) => { clumpColor(c, season, tmp3); cm.to.set(tmp3, i*3); });
  }

  /* ---------------- ground litter and toadstools ---------------- */
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
  let season = 'summer', blend = 1, fromU = null;
  targetColors('summer');
  for(const cm of clumpMeshes){ cm.m.instanceColor.array.set(cm.to); cm.m.instanceColor.needsUpdate = true; }
  applyLitter('summer');
  function setSeason(name){
    if(!SEASONS[name]) return false;
    if(name === season) return true;
    fromU = { bare:U.uBare.value, snow:U.uSnow.value, petal:PU.uPetal.value, leaf:PU.uLeaf.value, willow:U.uWillow.value.clone() };
    for(const cm of clumpMeshes) cm.from.set(cm.m.instanceColor.array);
    season = name; targetColors(name); applyLitter(name); blend = 0;
    return true;
  }
  function stepSeason(dt){
    if(blend >= 1) return;
    blend = state.reduced ? 1 : Math.min(1, blend + dt/1.8);
    const k = blend*blend*(3 - 2*blend), T = SEASONS[season];
    U.uBare.value = fromU.bare + (T.bare - fromU.bare)*k;
    U.uSnow.value = fromU.snow + (T.snow - fromU.snow)*k;
    PU.uPetal.value = fromU.petal + (T.petal - fromU.petal)*k;
    PU.uLeaf.value = fromU.leaf + (T.leaf - fromU.leaf)*k;
    U.uWillow.value.copy(fromU.willow).lerp(col.set(T.willow), k);
    for(const cm of clumpMeshes){ const a = cm.m.instanceColor.array; for(let i=0; i<a.length; i++) a[i] = cm.from[i] + (cm.to[i] - cm.from[i])*k; cm.m.instanceColor.needsUpdate = true; }
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

  const api = {
    setSeason, season:() => season,
    stats:() => ({ trees:trees.length, species:{ ...counts }, clumps:clumpMeshes.reduce((n, c) => n + c.list.length, 0), bodies, clumpMeshes:clumpMeshes.length, litter:litter.length, toadstools:caps.length, falling:FN }),
    uniforms:{ wind:U.uTreeTime, bare:U.uBare, snow:U.uSnow },
    find:sp => trees.filter(t => !sp || t.sp === sp).map(t => ({ x:+t.x.toFixed(1), z:+t.z.toFixed(1), sp:t.sp })),
  };
  bus?.on?.('atmosphere', d => { if(d?.season) setSeason(d.season); });
  bus?.once?.('ready', () => { const s = ctx.modules.atmosphere?.season?.(); if(s) setSeason(s); });
  ctx.modules.trees = api;
  try { ctx.expose('trees', api); } catch(e){ console.warn('[trees] expose failed', e); }
  return api.stats();
}
