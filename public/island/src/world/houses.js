// Zone buildings: one chunky, toy-like design per zone that says what the zone is. Each fits the
// same w x d footprint map.js gives its collider, with the group's origin at the footprint centre
// on the ground and the front door centred at (0, d/2), facing +z (toward the plaza).
//
// Static parts are merged per material, so one building costs 4 to 7 draw calls:
//   wall   vertex colours, every painted part
//   win    lit windows, emissive, userData.nightGlow (userData.glow holds the day and night values)
//   glow   bloom-tagged bulbs and neon (renderer.js blooms 1 - alpha)
//   glass  the greenhouse only
//   door   its own mesh, pivot on the hinge edge, so it can swing open (see doorParts)
//   frame  the door surround and step
//   one moving part at most: userData.spin (turn about y) or userData.wave (swing about x)
// Visual only: no colliders, no physics, never calls helpers.rng().
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Window glow for day and night. Night drops opacity, which the blend below turns into bloom.
export const WINDOW_GLOW = { day:{ emissiveIntensity:0.45, opacity:1 }, night:{ emissiveIntensity:1.5, opacity:0.45 } };

export function doorParts(group){ return group?.userData?.doorParts || { door:null, frame:null }; }

const cache = new WeakMap();
function materials(ctx){
  const { THREE } = ctx, mat = ctx.helpers.mat;
  if(cache.has(ctx.helpers)) return cache.get(ctx.helpers);
  // One/Zero blending writes the fragment's alpha straight into the target (NormalBlending on an
  // opaque material forces alpha to 1), so opacity < 1 tags a part for renderer.js's bloom.
  const tag = { blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor };
  const M = {
    wall: mat('#ffffff', { vertexColors:true, roughness:.78 }),
    win: mat('#ffdca6', { emissive:'#ff9442', roughness:.35, ...WINDOW_GLOW.day, ...tag }),
    glow: new THREE.MeshBasicMaterial({ color:'#ffffff', vertexColors:true, opacity:0.12, ...tag }),
    glass: mat('#dff6ff', { transparent:true, opacity:.26, roughness:.08, depthWrite:false }),
  };
  cache.set(ctx.helpers, M); return M;
}

/* ------------------------------------------------------------------ */
/* Kit: collects transformed, coloured geometry per material role      */
/* ------------------------------------------------------------------ */
function Kit(THREE){
  const parts = {}, col = new THREE.Color(), stack = [new THREE.Matrix4()];
  const m4 = new THREE.Matrix4(), eu = new THREE.Euler();
  function put(geo, c, x = 0, y = 0, z = 0, o = {}){
    let g = geo.index ? geo.toNonIndexed() : geo;
    for(const k of Object.keys(g.attributes)) if(k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if(o.s) g.scale(o.s[0], o.s[1], o.s[2]);
    if(o.rx) g.rotateX(o.rx); if(o.rz) g.rotateZ(o.rz); if(o.ry) g.rotateY(o.ry);
    if(o.S) g.scale(o.S[0], o.S[1], o.S[2]);
    g.translate(x, y, z); g.applyMatrix4(stack[stack.length - 1]);
    const p = g.attributes.position, n = p.count, a = new Float32Array(n*3);
    if(typeof c !== 'function') col.set(c);
    for(let i=0; i<n; i++){
      if(typeof c === 'function') col.set(c(p.getX(i), p.getY(i), p.getZ(i)));
      a[i*3] = col.r; a[i*3+1] = col.g; a[i*3+2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    (parts[o.role || 'wall'] ||= []).push(g);
  }
  const K = {
    // Run fn with everything it adds moved by (x, y, z) and turned by [rx, ry, rz].
    at(x, y, z, r, fn){
      eu.set(r?.[0] || 0, r?.[1] || 0, r?.[2] || 0);
      m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(eu), new THREE.Vector3(1, 1, 1));
      stack.push(stack[stack.length - 1].clone().multiply(m4)); fn(); stack.pop();
    },
    box:(w, h, d, c, x, y, z, o) => put(new THREE.BoxGeometry(w, h, d), c, x, y, z, o),
    // bevelled box: RoundedBoxGeometry, one bevel segment unless asked
    rbox:(w, h, d, c, x, y, z, o = {}) => {
      const r = Math.min(o.r ?? 0.08, Math.min(w, h, d)/2 - 0.005);
      put(new RoundedBoxGeometry(w, h, d, o.seg || 1, Math.max(0.005, r)), c, x, y, z, o);
    },
    cyl:(rt, rb, h, c, x, y, z, o = {}) => put(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14, 1, !!o.open, o.t0 || 0, o.tl || Math.PI*2), c, x, y, z, o),
    cone:(r, h, c, x, y, z, o = {}) => put(new THREE.ConeGeometry(r, h, o.seg || 14), c, x, y, z, o),
    ball:(r, c, x, y, z, o = {}) => put(new THREE.SphereGeometry(r, o.seg || 14, Math.max(6, (o.seg || 14)*0.7|0)), c, x, y, z, o),
    torus:(r, t, c, x, y, z, o = {}) => put(new THREE.TorusGeometry(r, t, o.rs || 8, o.seg || 20, o.arc || Math.PI*2), c, x, y, z, o),
    lathe:(pts, c, x, y, z, o = {}) => put(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), o.seg || 16), c, x, y, z, o),
    // a flat polygon in x-y, extruded `depth` along z and centred on it
    shape:(pts, depth, c, x, y, z, o = {}) => {
      const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
      const g = new THREE.ExtrudeGeometry(sh, { depth, steps:1, bevelEnabled:!!o.bevel, bevelThickness:o.bevel || 0, bevelSize:o.bevel || 0, bevelSegments:1, curveSegments:o.curve || 12 });
      g.translate(0, 0, -depth/2); put(g, c, x, y, z, o);
    },
    // a prism along x: the triangle (or polygon) is given in (z, y), length along x
    prism:(pts, len, c, x, y, z, o = {}) => K.shape(pts.map(p => [-p[0], p[1]]), len, c, x, y, z, { ...o, ry:Math.PI/2 }),
    // Merge each role into one mesh under parent. Returns { role: mesh }.
    build(parent, M){
      const out = {};
      for(const [role, geos] of Object.entries(parts)){
        const m = new THREE.Mesh(mergeGeometries(geos), M[role]);
        m.castShadow = role === 'wall';
        m.receiveShadow = role !== 'glow';
        if(role === 'win'){ m.userData.nightGlow = true; m.userData.glow = WINDOW_GLOW; }
        if(role === 'glass') m.renderOrder = 2;
        parent.add(m); out[role] = m;
      }
      return out;
    },
  };
  return K;
}

/* ------------------------------------------------------------------ */
/* Shared parts                                                       */
/* ------------------------------------------------------------------ */
const INK = '#3d3550', DARK = '#2b2238', WOOD = '#a8663f', BRASS = '#f2c14e', CREAM = '#fff4e2';
const FLOWERS = ['#ff8fab', '#ffd166', '#ffffff', '#c9b5ff', '#ff6b6b'];
const hash = i => { const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };

// A framed window facing +z, centred on the wall surface at the current origin.
function pane(K, w, h, o = {}){
  const t = o.trim || CREAM, f = 0.15;
  K.box(w, h, 0.06, '#ffe7b0', 0, 0, 0.03, { role:'win' });
  K.rbox(w + f*2, f, 0.18, t, 0, h/2 + f/2, 0.08, { r:.05 }); K.rbox(w + f*2, f, 0.18, t, 0, -h/2 - f/2, 0.08, { r:.05 });
  K.rbox(f, h, 0.18, t, -w/2 - f/2, 0, 0.08, { r:.05 }); K.rbox(f, h, 0.18, t, w/2 + f/2, 0, 0.08, { r:.05 });
  if(o.cross !== false){ K.box(0.08, h, 0.06, t, 0, 0, 0.09); K.box(w, 0.08, 0.06, t, 0, o.crossY ?? 0, 0.09); }
  if(o.sill !== false) K.rbox(w + 0.5, 0.14, 0.34, o.sillC || t, 0, -h/2 - f - 0.04, 0.16, { r:.05 });
  if(o.shutters) for(const s of [-1, 1]){ K.rbox(w*0.5, h + 0.12, 0.1, o.shutters, s*(w*0.75 + f + 0.06), 0, 0.05, { r:.04 });
    K.box(w*0.36, 0.06, 0.04, o.trimShutter || t, s*(w*0.75 + f + 0.06), h*0.2, 0.11); K.box(w*0.36, 0.06, 0.04, o.trimShutter || t, s*(w*0.75 + f + 0.06), -h*0.2, 0.11); }
  if(o.flowers){
    K.rbox(w + 0.3, 0.3, 0.34, o.flowers, 0, -h/2 - f - 0.28, 0.24, { r:.06 });
    for(let i=0; i<5; i++) K.ball(0.13, FLOWERS[(i + (o.seed || 0)) % FLOWERS.length], -w/2 + 0.05 + i*(w - 0.1)/4, -h/2 - f - 0.06, 0.26 + (i % 2)*0.06, { seg:6 });
  }
  if(o.awning){ // striped slanted awning
    const n = Math.max(3, Math.round((w + 0.5)/0.32)), sw = (w + 0.5)/n;
    for(let i=0; i<n; i++) K.box(sw, 0.08, 0.75, o.awning[i % 2], -(w + 0.5)/2 + sw*(i + 0.5), h/2 + f + 0.3, 0.38, { rx:0.45 });
    for(let i=0; i<n; i++) K.ball(sw*0.5, o.awning[i % 2], -(w + 0.5)/2 + sw*(i + 0.5), h/2 + f + 0.13, 0.72, { seg:8, s:[1, 0.6, 0.5] });
  }
}
// A round window facing +z.
function porthole(K, r, trim, o = {}){
  K.cyl(r, r, 0.06, '#ffe7b0', 0, 0, 0.03, { role:'win', rx:Math.PI/2, seg:20 });
  K.torus(r + 0.05, o.t || 0.11, trim, 0, 0, 0.08, { seg:22 });
  if(o.cross){ K.box(0.07, r*2, 0.05, trim, 0, 0, 0.08); K.box(r*2, 0.07, 0.05, trim, 0, 0, 0.08); }
}
// Gable roof with its ridge along local x: two thick bevelled slabs, gable-end walls, a ridge cap.
function gable(K, len, span, rise, y, roofC, wallC, o = {}){
  const oh = o.oh ?? 0.45, end = o.end ?? 0.35, t = o.t ?? 0.3, a = Math.atan2(rise, span/2), L = (span/2 + oh)/Math.cos(a);
  for(const s of [-1, 1]){
    const cz = s*(L/2)*Math.cos(a), cy = y + rise - (L/2)*Math.sin(a);
    // push the slab out along its own normal so its underside lies on the slope line
    K.rbox(len + end*2, t, L, roofC, 0, cy + Math.cos(a)*t/2, cz + s*Math.sin(a)*t/2, { rx:s*a, r:o.round ?? 0.1, seg:o.seg });
  }
  // courses: strips laid along the slope, for shingles or thatch
  if(o.rows) for(const s of [-1, 1]) for(let k=1; k<=o.rows; k++){
    const u = k*L/(o.rows + 1), nz = s*Math.sin(a), ny = Math.cos(a), lift = t + (o.rowT ?? 0.08)/2 - 0.02;
    K.rbox(len + end*2 + 0.04, o.rowT ?? 0.08, o.rowW ?? 0.3, o.rowC || roofC, 0, y + rise - u*Math.sin(a) + ny*lift, s*u*Math.cos(a) + nz*lift, { rx:s*a, r:.03 });
  }
  if(wallC) K.prism([[-span/2, 0], [span/2, 0], [0, rise]], len, wallC, 0, y, 0);
  K.cyl(t*0.7, t*0.7, len + end*2 + 0.1, o.ridge || roofC, 0, y + rise + t*0.75, 0, { rz:Math.PI/2, seg:10 });
  return { a, oh, end, t };
}
// Door and frame for a front wall at z = fz. The door pivots on its left (hinge) edge.
function doorway(THREE, parts, fz, o){
  const { dw = 1.5, dh = 2.35, color = '#6b4a33', trim = CREAM, step = '#d8cbb3', knob = BRASS } = o;
  const DK = parts.door, FK = parts.frame;
  // door slab, hinge at x = 0
  DK.rbox(dw, dh, 0.12, color, dw/2, dh/2, 0.06, { r:.05 });
  if(o.porthole) DK.at(dw/2, dh*0.72, 0.12, null, () => { DK.cyl(0.26, 0.26, 0.04, '#ffe0a8', 0, 0, 0, { rx:Math.PI/2, seg:16 }); DK.torus(0.3, 0.06, knob, 0, 0, 0.02, { seg:16 }); });
  else DK.rbox(dw - 0.5, dh*0.34, 0.05, o.panel || color, dw/2, dh*0.72, 0.13, { r:.03 });
  DK.rbox(dw - 0.5, dh*0.34, 0.05, o.panel || color, dw/2, dh*0.3, 0.13, { r:.03 });
  DK.ball(0.08, knob, dw - 0.2, 1.05, 0.18, { seg:8 });
  // frame: dark doorway behind (seen when the door opens), posts, lintel, step
  FK.box(dw, dh, 0.02, DARK, 0, dh/2, fz + 0.01);
  for(const s of [-1, 1]) FK.rbox(0.2, dh + 0.1, 0.24, trim, s*(dw/2 + 0.1), (dh + 0.1)/2, fz + 0.1, { r:.05 });
  FK.rbox(dw + 0.64, 0.26, 0.3, trim, 0, dh + 0.18, fz + 0.12, { r:.06 });
  if(o.arch) FK.torus(dw/2 + 0.1, 0.12, trim, 0, dh + 0.05, fz + 0.12, { arc:Math.PI, seg:16 });
  FK.rbox(dw + 1.0, 0.18, 0.8, step, 0, 0.09, fz + 0.4, { r:.06 });
  return { dw, dh };
}

/* ------------------------------------------------------------------ */
/* The twelve designs                                                 */
/* ------------------------------------------------------------------ */
const DESIGNS = {
  // A playful lab: cream block, berry-blue base, portholes, and a giant blueberry for a dome.
  blueberry(K, P, { w, d, h, body, roof }){
    const hw = w/2, hd = d/2, hb = Math.min(h*0.7, 4.4), band = '#4a5fc4', trim = roof || '#7d8ff0';
    K.rbox(w + 0.2, 0.55, d + 0.2, band, 0, 0.27, 0, { r:.15 });
    K.rbox(w, hb, d, body || '#fff3e4', 0, hb/2, 0, { r:.35, seg:2 });
    K.rbox(w + 0.06, 0.3, d + 0.06, band, 0, 1.2, 0, { r:.12 });
    K.rbox(w + 0.5, 0.42, d + 0.5, band, 0, hb - 0.06, 0, { r:.18 });
    K.rbox(w + 0.2, 0.2, d + 0.2, '#fff8ee', 0, hb + 0.18, 0, { r:.08 });
    // the blueberry: dusty bloom on top, deep blue below, a star-shaped crown and a leaf
    const R = Math.min(3.6, d*0.45), cy = hb + 1.25, cz = -0.3, top = cy + R*0.9;
    K.cyl(R*0.86, R*0.92, 0.7, trim, 0, hb + 0.45, cz, { seg:32 });
    const lo = new P.THREE.Color('#2a3888'), hi = new P.THREE.Color('#7489dc'), c = new P.THREE.Color();
    K.ball(R, (x, y, z) => '#' + c.copy(lo).lerp(hi, Math.min(1, Math.max(0, (y - cy + R*0.3)/(R*1.4)))*0.9 + Math.max(0, (x + z)*0.02)).getHexString(), 0, cy, cz, { seg:32, s:[1, 0.9, 1] });
    K.cyl(0.62, 0.9, 0.34, '#1c2566', 0, top + 0.02, cz, { seg:10 });
    for(let i=0; i<5; i++){ const a = i/5*Math.PI*2; K.cone(0.3, 0.9, '#23306b', Math.cos(a)*0.72, top + 0.25, cz + Math.sin(a)*0.72, { seg:6, rx:Math.sin(a)*1.25, rz:-Math.cos(a)*1.25 }); }
    K.cyl(0.08, 0.1, 0.7, '#5f9e45', 0.1, top + 0.55, cz, { rz:-0.3, seg:6 });
    K.ball(0.55, '#6fae4a', 0.6, top + 0.85, cz, { s:[1.5, 0.3, 0.75], rz:-0.45, seg:10 });
    // portholes and a scalloped canopy over the door
    for(const x of [-4.2, -2.4, 2.4, 4.2]) if(Math.abs(x) < hw - 0.8) K.at(x, 2.35, hd, null, () => porthole(K, Math.abs(x) > 3 ? 0.55 : 0.7, trim));
    for(const s of [-1, 1]) for(const z of [-hd/2, hd/2]) K.at(s*hw, 2.35, z, [0, s*Math.PI/2, 0], () => porthole(K, 0.55, trim));
    K.rbox(2.8, 0.2, 1.1, band, 0, 2.95, hd + 0.5, { rx:0.22, r:.08 });
    for(let i=0; i<7; i++) K.ball(0.2, i % 2 ? '#ffffff' : '#8fa0ff', -1.2 + i*0.4, 2.76, hd + 1.02, { seg:8, s:[1, 0.7, 0.6] });
    // lab vents with bubbles, and a glowing flask on the front corner of the roof
    for(const s of [-1, 1]){ const x = s*(hw - 1.1), z = -hd + 1.1;
      K.cyl(0.36, 0.4, 1.5, '#e8ecff', x, hb + 0.95, z, { seg:12 }); K.cyl(0.46, 0.46, 0.22, band, x, hb + 1.1, z, { seg:12 }); K.cyl(0.48, 0.44, 0.22, '#c9d1ff', x, hb + 1.8, z, { seg:12 }); }
    for(const [x, y, r] of [[hw - 1.0, hb + 2.3, 0.2], [hw - 1.25, hb + 2.75, 0.15], [hw - 1.0, hb + 3.1, 0.11]]) K.ball(r, '#d8c9ff', x, y, -hd + 1.1, { role:'glow', seg:8 });
    const fx = hw - 1.3, fz = hd - 1.2;
    K.ball(0.8, '#b99bff', fx, hb + 1.0, fz, { role:'glow', seg:14 });
    K.cyl(0.24, 0.28, 0.9, '#e8ecff', fx, hb + 2.05, fz, { seg:10 }); K.cyl(0.34, 0.34, 0.14, '#e8ecff', fx, hb + 2.52, fz, { seg:10 });
    K.torus(0.84, 0.06, '#e8ecff', fx, hb + 1.0, fz, { rx:Math.PI/2, seg:18 });
    return { door:{ color:band, trim:'#ffffff', porthole:true, knob:'#ffd166' } };
  },

  // A glass greenhouse: brick base, glass walls and a vaulted glass roof on white ribs, plants and
  // a pink brain topiary inside, grow lights along the vault.
  brain(K, P, { w, d, h }){
    const hw = w/2, hd = d/2, he = h*0.72, R = hd, vs = 0.6, white = '#fffaf0', pink = '#d6689a', brick = '#d98a6a';
    K.rbox(w, 0.9, d, brick, 0, 0.45, 0, { r:.12 });
    K.rbox(w + 0.2, 0.14, d + 0.2, white, 0, 0.95, 0, { r:.05 });
    // glass walls and vault
    K.box(w - 0.1, he - 1, 0.05, '#fff', 0, (1 + he)/2, hd - 0.04, { role:'glass' }); K.box(w - 0.1, he - 1, 0.05, '#fff', 0, (1 + he)/2, -hd + 0.04, { role:'glass' });
    K.box(0.05, he - 1, d - 0.1, '#fff', hw - 0.04, (1 + he)/2, 0, { role:'glass' }); K.box(0.05, he - 1, d - 0.1, '#fff', -hw + 0.04, (1 + he)/2, 0, { role:'glass' });
    K.cyl(R, R, w - 0.1, '#fff', 0, he, 0, { role:'glass', open:true, t0:0, tl:Math.PI, rz:Math.PI/2, S:[1, vs, 1], seg:20 });
    const half = []; for(let i=0; i<=16; i++){ const a = i/16*Math.PI; half.push([Math.cos(a)*R, Math.sin(a)*R*vs]); }
    for(const s of [-1, 1]) K.prism(half, 0.05, '#fff', s*(hw - 0.05), he, 0, { role:'glass' });
    // ribs: arches over the vault, mullions and rails on the walls
    const n = 8;
    for(let i=0; i<=n; i++){
      const x = -hw + 0.06 + i*(w - 0.12)/n;
      K.torus(R, 0.08, white, x, he, 0, { arc:Math.PI, ry:Math.PI/2, S:[1, vs, 1], rs:6, seg:18 });
      for(const s of [-1, 1]) K.box(0.12, he - 0.95, 0.12, white, x, (he + 0.95)/2, s*(hd - 0.04));
    }
    for(let i=1; i<4; i++){ const z = -hd + i*d/4; for(const s of [-1, 1]) K.box(0.12, he - 0.95, 0.12, white, s*(hw - 0.04), (he + 0.95)/2, z); }
    K.rbox(w + 0.12, 0.18, d + 0.12, white, 0, he, 0, { r:.06 });
    K.box(w, 0.1, 0.1, white, 0, 2.4, hd - 0.02); K.box(w, 0.1, 0.1, white, 0, 2.4, -hd + 0.02);
    K.box(0.1, 0.1, d, white, hw - 0.02, 2.4, 0); K.box(0.1, 0.1, d, white, -hw + 0.02, 2.4, 0);
    // ridge cap with pink finials, and a little roof vent
    K.rbox(w + 0.2, 0.22, 0.34, pink, 0, he + R*vs + 0.05, 0, { r:.08 });
    for(const s of [-1, 1]){ K.cyl(0.05, 0.05, 0.5, white, s*(hw + 0.05), he + R*vs + 0.3, 0, { seg:6 }); K.ball(0.2, pink, s*(hw + 0.05), he + R*vs + 0.62, 0, { seg:10 }); }
    // plants: beds along the back and sides, a palm, a monstera, and the pink brain in the middle
    const G = ['#5f9e45', '#6fae4a', '#8cc15a', '#4f8f3f'];
    K.rbox(w - 1.0, 0.9, 1.1, '#8a5a3b', 0, 0.45, -hd + 0.9, { r:.08 });
    for(let i=0; i<9; i++){ const x = -hw + 1.0 + i*(w - 2)/8; K.ball(0.5 + hash(i)*0.25, G[i % 4], x, 1.3 + hash(i + 9)*0.25, -hd + 0.9, { seg:10 }); if(i % 3 === 1) K.ball(0.14, '#ff8fab', x + 0.2, 1.75, -hd + 1.3, { seg:6 }); }
    for(const s of [-1, 1]) for(let i=0; i<3; i++) K.ball(0.55, G[(i + 2) % 4], s*(hw - 0.9), 1.25, -1.2 + i*1.4, { seg:10 });
    const px = -hw + 1.8, pz = 0.4;
    K.cyl(0.14, 0.2, he + 0.2, '#b98a5a', px, (he + 0.2)/2 + 0.2, pz, { seg:8 });
    for(let i=0; i<6; i++){ const a = i/6*Math.PI*2; K.ball(0.8, '#5f9e45', px + Math.cos(a)*0.75, he + 0.25, pz + Math.sin(a)*0.75, { s:[1.2, 0.2, 0.45], ry:-a, seg:8 }); }
    K.cyl(0.5, 0.4, 0.6, '#c96f4a', hw - 1.8, 0.3, 0.6, { seg:12 });
    for(let i=0; i<5; i++){ const a = i/5*Math.PI*2; K.ball(0.55, '#4f8f3f', hw - 1.8 + Math.cos(a)*0.45, 1.3 + hash(i)*0.4, 0.6 + Math.sin(a)*0.45, { s:[1, 0.3, 0.7], ry:-a, seg:8 }); }
    K.cyl(0.55, 0.45, 0.7, '#c96f4a', 0, 0.35, -0.2, { seg:14 }); K.cyl(0.1, 0.12, 0.8, '#5f9e45', 0, 1.0, -0.2, { seg:6 });
    for(const s of [-1, 1]) K.ball(0.9, '#f29bbd', s*0.5, 2.0, -0.2, { s:[0.72, 0.8, 1.15], seg:16 });
    for(let i=0; i<10; i++){ const s = i % 2 ? 1 : -1, zz = -0.95 + Math.floor(i/2)*0.38; K.torus(0.26, 0.08, '#e27aa8', s*0.55, 2.55 - Math.abs(zz)*0.25, zz - 0.2, { rx:Math.PI/2, rz:hash(i)*3, arc:Math.PI*1.3, seg:10, rs:5 }); }
    // grow lights under the vault
    for(const z of [-1.3, 1.3]) K.box(w - 1.6, 0.08, 0.08, '#ff9fd0', 0, he + 0.55, z, { role:'glow' });
    return { door:{ color:pink, trim:white, panel:'#f7b6d2', step:'#e8d8c8' } };
  },

  // A film studio: a purple sound stage with a sawtooth roof of glowing north lights, a theatre
  // marquee over the door, poster boxes and a big clapperboard on the roof.
  studio(K, P, { w, d, h }){
    const hw = w/2, hd = d/2, he = h - 0.6, wall = '#5b4a7a', rib = '#4a3c66', roof = '#e2725b', gold = '#ffd166', ink = '#221c2e';
    K.rbox(w + 0.2, 0.5, d + 0.2, INK, 0, 0.25, 0, { r:.12 });
    K.rbox(w, he, d, wall, 0, he/2, 0, { r:.22, seg:2 });
    for(let x = -hw + 0.55; x < hw - 0.4; x += 0.7) if(Math.abs(x) > 2.9) K.box(0.14, he - 1.1, 0.1, rib, x, (he - 1.1)/2 + 0.55, hd + 0.02);
    for(let z = -hd + 0.6; z < hd - 0.4; z += 0.7) for(const s of [-1, 1]) K.box(0.1, he - 1.1, 0.14, rib, s*(hw + 0.02), (he - 1.1)/2 + 0.55, z);
    K.rbox(w + 0.3, 0.34, d + 0.3, ink, 0, he, 0, { r:.1 });
    // sawtooth: three teeth, each a sloped slab rising to a glazed vertical face toward the front
    const n = 3, td = d/n, gh = 1.5;
    for(let i=0; i<n; i++){
      const z0 = -hd + i*td, z1 = z0 + td, a = Math.atan2(gh, td), L = Math.hypot(td, gh) + 0.25;
      K.rbox(w + 0.36, 0.24, L, roof, 0, he + gh/2 + Math.cos(a)*0.12 + 0.1, (z0 + z1)/2 - Math.sin(a)*0.12, { rx:-a, r:.08 });
      K.box(w - 0.4, gh - 0.3, 0.06, i === n - 1 ? '#fff' : '#9cc7e6', 0, he + gh/2 + 0.05, z1 - 0.1, { role:i === n - 1 ? 'win' : 'wall' });
      for(let x = -hw + 0.2; x <= hw - 0.2 + 1e-6; x += (w - 0.4)/6) K.box(0.12, gh - 0.2, 0.12, ink, x, he + gh/2 + 0.05, z1 - 0.05);
      for(const s of [-1, 1]) K.prism([[z0, 0], [z1, 0], [z1, gh]], 0.2, wall, s*(hw - 0.05), he + 0.1, 0);
    }
    // marquee: dark box with a cream face, bulbs all round, a star on top
    const mz = hd + 0.6;
    K.rbox(5.2, 1.0, 1.25, ink, 0, 3.55, mz, { r:.14 });
    K.box(4.5, 0.62, 0.05, '#fff1c9', 0, 3.55, mz + 0.63);
    for(let i=0; i<4; i++) K.rbox(0.62, 0.36, 0.05, ['#e5484d', '#8a5cc2', '#e5484d', '#8a5cc2'][i], -1.35 + i*0.9, 3.55, mz + 0.66, { r:.06 });
    for(let i=0; i<=13; i++){ const x = -2.4 + i*4.8/13; K.ball(0.09, '#ffe7a3', x, 4.08, mz + 0.64, { role:'glow', seg:6 }); K.ball(0.09, '#ffe7a3', x, 3.02, mz + 0.64, { role:'glow', seg:6 }); }
    for(let i=0; i<6; i++) K.ball(0.08, '#ffe7a3', -2.2 + i*0.88, 3.0, mz, { role:'glow', seg:6 });
    const star = []; for(let i=0; i<10; i++){ const a = Math.PI/2 + i*Math.PI/5, r = i % 2 ? 0.28 : 0.62; star.push([Math.cos(a)*r, Math.sin(a)*r]); }
    K.shape(star, 0.2, gold, 0, 4.72, mz, { bevel:0.04 });
    // poster lightboxes either side of the door
    for(const s of [-1, 1]){ const x = s*3.9;
      K.rbox(1.5, 2.1, 0.16, gold, x, 1.85, hd + 0.06, { r:.06 });
      K.box(1.22, 1.82, 0.04, s < 0 ? '#f29bbd' : '#7fd1ff', x, 1.85, hd + 0.15);
      K.ball(0.34, s < 0 ? '#ffd166' : '#ffffff', x, 2.1, hd + 0.16, { s:[1, 1, 0.25], seg:12 });
      K.box(0.9, 0.12, 0.03, ink, x, 1.4, hd + 0.18); K.box(0.6, 0.1, 0.03, ink, x, 1.2, hd + 0.18); }
    // clapperboard on the roof, front left
    const cx = -hw + 1.9, cy = he + gh + 1.05, cz = hd - 0.9;
    K.at(cx, cy, cz, [0, 0.25, 0], () => {
      K.rbox(2.6, 1.6, 0.24, ink, 0, 0, 0, { r:.08 });
      K.box(2.2, 0.08, 0.03, '#fffaf0', 0, -0.1, 0.13); K.box(2.2, 0.08, 0.03, '#fffaf0', 0, -0.45, 0.13);
      K.box(0.08, 0.7, 0.03, '#fffaf0', 0, -0.35, 0.13);
      K.at(-1.3, 0.9, 0, [0, 0, 0.32], () => {
        K.rbox(2.7, 0.4, 0.24, ink, 1.35, 0, 0, { r:.06 });
        for(let i=0; i<5; i++) K.box(0.24, 0.4, 0.03, '#fffaf0', 0.35 + i*0.52, 0, 0.13, { rz:0.55 });
      });
      K.rbox(2.6, 0.4, 0.24, ink, 0, 1.0 - 0.2 - 0.02, 0, { r:.06 });
      for(let i=0; i<5; i++) K.box(0.24, 0.4, 0.03, '#fffaf0', -1.0 + i*0.52, 0.78, 0.13, { rz:-0.55 });
      K.cyl(0.14, 0.14, 0.3, '#9aa3b8', -1.25, 0.84, 0, { rx:Math.PI/2, seg:8 });
    });
    return { door:{ color:'#e5484d', trim:gold, panel:'#c73b40', step:INK } };
  },

  // A harbour office: clapboard walls, a steep boathouse gable facing front with a round window,
  // pilings roped at the front corners, a life ring, and a striped lighthouse at the back corner.
  dock(K, P, { w, d, h, body, roof }){
    const hw = w/2, hd = d/2, wall = body || '#2f9e8f', plank = '#26877a', white = '#fffaf0', rf = roof || '#1f6f64', red = '#e5484d', pile = '#7a5236';
    K.rbox(w, h, d, wall, 0, h/2, 0, { r:.12 });
    for(let y = 0.75; y < h - 0.2; y += 0.42) K.box(w + 0.05, 0.06, d + 0.05, plank, 0, y, 0);
    K.rbox(w + 0.24, 0.26, d + 0.24, white, 0, h - 0.05, 0, { r:.06 });
    const rise = 2.6, oh = 0.45, fo = 0.45;
    K.at(0, 0, 0, [0, Math.PI/2, 0], () => gable(K, d, w, rise, h, rf, wall, { oh, end:fo, t:0.3, ridge:white, rows:3, rowC:'#1a6158' }));
    // white bargeboards up the front gable
    const A = Math.atan2(rise, w/2), run = w/2 + oh, Lb = run/Math.cos(A);
    for(const s of [-1, 1]) K.rbox(Lb, 0.26, 0.14, white, s*run/2, h + rise - (run/2)*Math.tan(A) + 0.32, hd + fo + 0.02, { rz:-s*A, r:.05 });
    K.at(0, h + 0.95, hd, null, () => porthole(K, 0.5, white, { cross:true }));
    // pilings with rope at the front corners
    for(const s of [-1, 1]){ const x = s*(hw - 0.12), z = hd - 0.12;
      K.cyl(0.28, 0.32, h + 0.7, pile, x, (h + 0.7)/2, z, { seg:10 }); K.cone(0.3, 0.3, '#5e3f28', x, h + 0.85, z, { seg:10 });
      K.torus(0.32, 0.07, '#e8d3a8', x, 1.1, z, { rx:Math.PI/2, seg:12 }); K.torus(0.32, 0.07, '#e8d3a8', x, 1.3, z, { rx:Math.PI/2, seg:12 }); }
    // life ring and a window
    K.at(-1.5, 1.9, hd, null, () => { K.torus(0.42, 0.13, red, 0, 0, 0.13, { seg:20, rs:8 }); for(let i=0; i<4; i++){ const a = Math.PI/4 + i*Math.PI/2; K.box(0.16, 0.3, 0.3, white, Math.cos(a)*0.42, Math.sin(a)*0.42, 0.13, { rz:a }); } });
    K.at(1.55, 1.95, hd, null, () => pane(K, 0.9, 1.0, { trim:white, shutters:'#1f6f64' }));
    for(const s of [-1, 1]) K.at(s*hw, 1.95, 0.3, [0, s*Math.PI/2, 0], () => pane(K, 0.8, 0.9, { trim:white }));
    // lighthouse at the back corner, rising through the roof
    const lx = hw - 0.85, lz = -hd + 0.85, lr = 0.72;
    for(let i=0; i<7; i++) K.cyl(lr - i*0.02, lr - i*0.02 + 0.02, 0.92, i % 2 ? white : red, lx, 0.46 + i*0.92, lz, { seg:16 });
    const top = 7*0.92;
    K.cyl(1.0, 0.9, 0.18, white, lx, top + 0.09, lz, { seg:16 });
    K.torus(0.94, 0.05, white, lx, top + 0.5, lz, { rx:Math.PI/2, seg:18 });
    for(let i=0; i<8; i++){ const a = i/8*Math.PI*2; K.box(0.05, 0.4, 0.05, white, lx + Math.cos(a)*0.94, top + 0.3, lz + Math.sin(a)*0.94); }
    K.cyl(0.48, 0.48, 0.8, '#fff1c9', lx, top + 0.58, lz, { role:'glow', seg:12 });
    for(let i=0; i<4; i++){ const a = i/4*Math.PI*2; K.box(0.06, 0.8, 0.06, INK, lx + Math.cos(a)*0.5, top + 0.58, lz + Math.sin(a)*0.5); }
    K.cone(0.72, 0.75, red, lx, top + 1.35, lz, { seg:16 }); K.ball(0.13, BRASS, lx, top + 1.8, lz, { seg:8 });
    return { door:{ color:'#1f6f64', trim:white, porthole:true, step:'#c89b6d' } };
  },

  // A red schoolhouse: white corner boards, tall windows, a clock in the front gable and an open
  // bell tower on the ridge.
  school(K, P, { w, d, h, body, roof }){
    const hw = w/2, hd = d/2, wall = body || '#d9534f', white = '#fff4e2', rf = roof || '#7a2e2b', stone = '#c9b8a6';
    K.rbox(w + 0.3, 0.5, d + 0.3, stone, 0, 0.25, 0, { r:.12 });
    K.rbox(w, h, d, wall, 0, h/2, 0, { r:.12 });
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.rbox(0.34, h - 0.4, 0.34, white, sx*hw, h/2 + 0.2, sz*hd, { r:.05 });
    K.rbox(w + 0.3, 0.3, d + 0.3, white, 0, h - 0.1, 0, { r:.08 });
    const rise = 2.3;
    K.at(0, 0, 0, [0, Math.PI/2, 0], () => gable(K, d, w, rise, h, rf, wall, { oh:0.5, end:0.45, t:0.32, rows:4, rowC:'#6a2826' }));
    // front gable: white bargeboards and a clock
    const A = Math.atan2(rise, hw), run = hw + 0.5;
    for(const s of [-1, 1]) K.rbox(run/Math.cos(A), 0.28, 0.14, white, s*run/2, h + rise - (run/2)*Math.tan(A) + 0.34, hd + 0.47, { rz:-s*A, r:.05 });
    K.at(0, h + 0.95, hd, null, () => {
      K.cyl(0.62, 0.62, 0.08, '#fffaf0', 0, 0, 0.04, { rx:Math.PI/2, seg:24 }); K.torus(0.66, 0.1, white, 0, 0, 0.1, { seg:24 });
      K.box(0.08, 0.42, 0.04, INK, 0, 0.17, 0.12); K.box(0.32, 0.08, 0.04, INK, 0.12, 0, 0.12);
    });
    for(const x of [-4.2, -2.5, 2.5, 4.2]) if(Math.abs(x) < hw - 0.8) K.at(x, 2.5, hd, null, () => pane(K, 0.95, 1.8, { trim:white, crossY:0.2, flowers:'#8a5a3b', seed:Math.round(x) + 5 }));
    for(const s of [-1, 1]) for(const z of [-1.8, 0, 1.8]) if(Math.abs(z) < hd - 0.8) K.at(s*hw, 2.5, z, [0, s*Math.PI/2, 0], () => pane(K, 0.9, 1.7, { trim:white, crossY:0.2 }));
    // bell tower astride the ridge, toward the front
    const tz = hd - 1.1, ty = h + rise - 0.15;
    K.rbox(1.6, 1.0, 1.6, white, 0, ty + 0.5, tz, { r:.06 });
    K.rbox(1.8, 0.16, 1.8, white, 0, ty + 1.05, tz, { r:.05 });
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.box(0.18, 1.05, 0.18, white, sx*0.65, ty + 1.6, tz + sz*0.65);
    K.cyl(0.2, 0.46, 0.62, BRASS, 0, ty + 1.55, tz, { seg:12 }); K.torus(0.44, 0.06, '#d9a53a', 0, ty + 1.26, tz, { rx:Math.PI/2, seg:12 }); K.ball(0.1, '#8a5a3b', 0, ty + 1.2, tz, { seg:6 });
    K.rbox(1.8, 0.16, 1.8, white, 0, ty + 2.15, tz, { r:.05 });
    K.cone(1.45, 1.1, rf, 0, ty + 2.78, tz, { seg:4, ry:Math.PI/4 });
    K.cyl(0.03, 0.03, 0.8, INK, 0, ty + 3.6, tz, { seg:5 }); K.box(0.6, 0.05, 0.05, INK, 0, ty + 3.75, tz); K.cone(0.1, 0.2, INK, 0.3, ty + 3.75, tz, { rz:-Math.PI/2, seg:4 });
    // chimney at the back
    K.rbox(0.7, 2.2, 0.7, '#a8432f', hw - 2.2, h + 1.1, -hd + 1.4, { r:.06 }); K.rbox(0.9, 0.2, 0.9, stone, hw - 2.2, h + 2.2, -hd + 1.4, { r:.05 });
    return { door:{ color:'#7a2e2b', trim:white, panel:'#943a36', step:stone } };
  },

  // A brick collegiate hall in UMD red: white quoins, two storeys of windows, engaged columns
  // under a pediment with a red and gold tympanum, and a cupola on the ridge.
  umd(K, P, { w, d, h }){
    const hw = w/2, hd = d/2, brick = '#b3402f', course = '#9c3527', white = '#fff6e6', slate = '#5d5470', red = '#c8102e', gold = '#ffd200';
    K.rbox(w + 0.3, 0.6, d + 0.3, '#e9dfcf', 0, 0.3, 0, { r:.1 });
    K.rbox(w, h, d, brick, 0, h/2, 0, { r:.1 });
    for(let y = 1.0; y < h - 0.4; y += 0.5) K.box(w + 0.03, 0.04, d + 0.03, course, 0, y, 0);
    K.rbox(w + 0.16, 0.2, d + 0.16, white, 0, 2.95, 0, { r:.05 });
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) for(let i=0; i<8; i++){ const y = 0.85 + i*0.55, big = i % 2 === 0; K.box(big ? 0.62 : 0.42, 0.42, big ? 0.62 : 0.42, white, sx*(hw - 0.2), y, sz*(hd - 0.2)); }
    K.rbox(w + 0.44, 0.38, d + 0.44, white, 0, h, 0, { r:.1 });
    gable(K, w, d, 1.5, h + 0.15, slate, brick, { oh:0.4, end:0.35, t:0.28, rows:2, rowC:'#524a64' });
    // windows, two storeys, with keystones
    const xs = [-4.45, -3.4, 3.4, 4.45].filter(x => Math.abs(x) < hw - 0.5);
    for(const x of xs) for(const y of [1.85, 3.95]) K.at(x, y, hd, null, () => { pane(K, 0.7, 1.3, { trim:white, sill:true }); K.box(0.3, 0.3, 0.14, white, 0, 0.83, 0.1); });
    for(const s of [-1, 1]) for(const z of [-hd + 1.3, hd - 1.3]) for(const y of [1.85, 3.95]) K.at(s*hw, y, z, [0, s*Math.PI/2, 0], () => pane(K, 0.75, 1.3, { trim:white }));
    K.at(0, 3.55, hd, null, () => { pane(K, 0.8, 1.0, { trim:white, sill:false }); K.torus(0.52, 0.1, white, 0, 0.5, 0.1, { arc:Math.PI, seg:14 }); K.cyl(0.4, 0.4, 0.05, '#ffe7b0', 0, 0.5, 0.03, { role:'win', rx:Math.PI/2, t0:Math.PI/2, tl:Math.PI, seg:12 }); });
    // portico: four engaged columns, entablature, pediment
    for(const x of [-2.45, -1.25, 1.25, 2.45]){
      K.rbox(0.72, 0.3, 0.72, white, x, 0.75, hd, { r:.05 });
      K.cyl(0.28, 0.31, h - 1.65, white, x, 0.9 + (h - 1.65)/2, hd, { seg:14 });
      K.rbox(0.74, 0.26, 0.74, white, x, h - 0.66, hd, { r:.05 });
    }
    K.rbox(5.6, 0.55, 0.9, white, 0, h - 0.28, hd + 0.08, { r:.08 });
    const pw = 3.1, pr = 1.45, py = h;
    K.shape([[-pw, 0], [pw, 0], [0, pr]], 0.8, white, 0, py, hd + 0.02, { bevel:0.06 });
    K.shape([[-pw + 0.62, 0.2], [pw - 0.62, 0.2], [0, pr - 0.34]], 0.1, red, 0, py, hd + 0.47);
    K.cyl(0.3, 0.3, 0.08, gold, 0, py + 0.52, hd + 0.52, { rx:Math.PI/2, seg:16 }); K.torus(0.3, 0.05, '#fff6e6', 0, py + 0.52, hd + 0.55, { seg:16 });
    // cupola: octagonal drum with lit windows, a slate dome and a gold ball
    const cy = h + 1.2;
    K.rbox(1.9, 0.9, 1.9, white, 0, cy + 0.3, 0, { r:.08 });
    K.cyl(0.85, 0.85, 1.2, white, 0, cy + 1.35, 0, { seg:8 });
    for(let i=0; i<4; i++){ const a = i*Math.PI/2 + Math.PI/8; K.at(Math.sin(a)*0.8, cy + 1.35, Math.cos(a)*0.8, [0, a, 0], () => K.box(0.4, 0.7, 0.05, '#fff', 0, 0, 0.02, { role:'win' })); }
    K.cyl(1.0, 1.0, 0.16, white, 0, cy + 2.0, 0, { seg:8 });
    K.ball(0.88, slate, 0, cy + 2.05, 0, { seg:16, s:[1, 0.95, 1] });
    K.cyl(0.05, 0.05, 0.7, gold, 0, cy + 3.1, 0, { seg:6 }); K.ball(0.16, gold, 0, cy + 3.5, 0, { seg:10 });
    // gold lamps either side of the door
    for(const s of [-1, 1]){ K.box(0.08, 0.3, 0.14, INK, s*0.62, 2.55, hd + 0.08); K.ball(0.13, '#ffe2a8', s*0.62, 2.35, hd + 0.2, { role:'glow', seg:8 }); }
    return { door:{ color:red, trim:gold, panel:'#a90d27', step:'#e9dfcf', knob:gold } };
  },

  // A modern dental clinic: rounded white block, a blue band, a glass curtain wall, a blue stair
  // tower, a cantilevered canopy, and a big tooth on the roof that turns slowly.
  clinic(K, P, { w, d, h }, SK){
    const hw = w/2, hd = d/2, white = '#f7fbfd', blue = '#4fa3c7', blueD = '#3a8db5', mint = '#bfe6de', grey = '#dfe8ee';
    K.rbox(w + 0.2, 0.55, d + 0.2, blueD, 0, 0.27, 0, { r:.2 });
    K.rbox(w, h - 0.2, d, white, 0, (h - 0.2)/2, 0, { r:.4, seg:2 });
    K.rbox(w + 0.3, 0.5, d + 0.3, blue, 0, h - 0.2, 0, { r:.2 });
    // glass curtain wall on the left of the door
    const gx = -hw/2 - 0.35, gw = hw - 1.9;
    K.box(gw, 2.9, 0.06, '#fff', gx, 2.1, hd + 0.02, { role:'win' });
    K.rbox(gw + 0.3, 0.2, 0.2, white, gx, 3.6, hd + 0.08, { r:.06 }); K.rbox(gw + 0.3, 0.2, 0.2, white, gx, 0.6, hd + 0.08, { r:.06 });
    for(let i=0; i<=5; i++) K.box(0.12, 2.9, 0.16, white, gx - gw/2 + i*gw/5, 2.1, hd + 0.08);
    K.box(gw, 0.1, 0.14, white, gx, 2.4, hd + 0.08);
    // blue stair tower on the right, taller than the roof, with a ribbon window
    const tx = hw - 1.6;
    K.rbox(2.6, h + 1.4, 1.8, blue, tx, (h + 1.4)/2, hd - 0.9, { r:.25, seg:2 });
    K.box(0.7, h - 0.4, 0.06, '#fff', tx, (h - 0.4)/2 + 0.7, hd + 0.01, { role:'win' });
    K.rbox(0.95, h - 0.2, 0.12, white, tx, (h - 0.2)/2 + 0.6, hd - 0.02, { r:.05 });
    K.rbox(2.8, 0.2, 2.0, white, tx, h + 1.45, hd - 0.9, { r:.08 });
    // a tooth-and-plus sign on the tower's face
    K.at(tx, h + 0.55, hd + 0.01, null, () => { K.box(0.7, 0.2, 0.08, '#ffffff', 0, 0, 0.04); K.box(0.2, 0.7, 0.08, '#ffffff', 0, 0, 0.04); });
    // cantilevered canopy with downlights
    K.rbox(4.0, 0.24, 1.8, white, -0.2, 3.05, hd + 0.8, { r:.1 });
    K.rbox(4.04, 0.1, 1.84, blue, -0.2, 2.9, hd + 0.8, { r:.04 });
    for(const x of [-1.4, -0.2, 1.0]) K.cyl(0.12, 0.12, 0.04, '#fff1c9', x, 2.84, hd + 1.1, { role:'glow', seg:10 });
    // side ribbon windows and roof plant
    for(const s of [-1, 1]) K.at(s*hw, 2.4, -0.6, [0, s*Math.PI/2, 0], () => pane(K, 4.2, 1.2, { trim:white, cross:false, sill:false }));
    for(const [x, z] of [[1.0, -1.8], [2.6, -1.8], [1.0, 0.6]]){ K.rbox(1.1, 0.2, 1.1, white, x, h + 0.1, z, { r:.06 }); K.ball(0.45, '#bfe3f0', x, h + 0.15, z, { s:[1, 0.6, 1], seg:12 }); }
    K.rbox(2.0, 0.8, 1.4, grey, -hw + 1.8, h + 0.35, -hd + 1.4, { r:.1 }); for(let i=0; i<3; i++) K.box(1.6, 0.06, 0.05, '#b8c6d0', -hw + 1.8, h + 0.2 + i*0.2, -hd + 0.68);
    // mint planters built into the front, left of the glass
    K.rbox(1.0, 0.7, 0.6, mint, -hw + 0.6, 0.35, hd - 0.3, { r:.1 }); for(let i=0; i<3; i++) K.ball(0.3, '#6fae4a', -hw + 0.4 + i*0.2, 0.85 + (i % 2)*0.1, hd - 0.3, { seg:8 });
    // the tooth sign on a short pole: the spin kit (pivot at the pole top) turns about y
    K.cyl(0.14, 0.2, 1.2, grey, -1.2, h + 0.5, -0.6, { seg:10 }); K.rbox(1.0, 0.3, 1.0, grey, -1.2, h + 0.15, -0.6, { r:.08 });
    SK.pivot = [-1.2, h + 1.05, -0.6];
    SK.ball(1.15, '#ffffff', 0, 1.55, 0, { s:[1.15, 0.85, 0.72], seg:20 });
    for(const s of [-1, 1]){ SK.ball(0.62, '#ffffff', s*0.62, 2.12, 0, { s:[1, 0.9, 0.75], seg:14 }); SK.cone(0.46, 1.25, '#ffffff', s*0.52, 0.55, 0, { rx:Math.PI, rz:s*0.18, seg:12 }); }
    SK.torus(1.62, 0.13, blue, 0, 1.5, -0.12, { seg:28 });
    for(const s of [-1, 1]) SK.ball(0.11, '#2a2140', s*0.4, 1.7, 0.8, { seg:8 });
    SK.torus(0.28, 0.06, '#2a2140', 0, 1.4, 0.8, { arc:Math.PI, rz:Math.PI, seg:10 });
    SK.ball(0.13, '#ff9fb8', -0.72, 1.4, 0.72, { seg:8 }); SK.ball(0.13, '#ff9fb8', 0.72, 1.4, 0.72, { seg:8 });
    return { door:{ color:blue, trim:white, porthole:true, step:grey, knob:'#dfe3ea' } };
  },

  // A warm chapel: cream walls, buttresses, lancet windows, a rose window over an arched door, and
  // a steeple with a belfry, a spire and a gold cross.
  chapel(K, P, { w, d, h, body, roof }){
    const hw = w/2, hd = d/2, wall = body || '#fbf6ea', rf = roof || '#b5653f', stone = '#d8cbb3', gold = '#c9a24a';
    K.rbox(w + 0.3, 0.5, d + 0.3, stone, 0, 0.25, 0, { r:.1 });
    K.rbox(w, h, d, wall, 0, h/2, 0, { r:.12 });
    K.rbox(w + 0.2, 0.22, d + 0.2, stone, 0, h - 0.1, 0, { r:.06 });
    const rise = 2.3;
    K.at(0, 0, 0, [0, Math.PI/2, 0], () => gable(K, d, w, rise, h, rf, wall, { oh:0.45, end:0.4, t:0.3, rows:3, rowC:'#a4583a' }));
    const A = Math.atan2(rise, hw), run = hw + 0.45;
    for(const s of [-1, 1]) K.rbox(run/Math.cos(A), 0.26, 0.14, stone, s*run/2, h + rise - (run/2)*Math.tan(A) + 0.33, hd + 0.42, { rz:-s*A, r:.05 });
    // buttresses along the sides, lancet windows between them
    const zs = [-hd + 1.2, 0, hd - 1.2];
    for(const s of [-1, 1]){
      for(const z of zs){ K.rbox(0.55, 2.4, 0.6, stone, s*(hw - 0.05), 1.2, z, { r:.06 }); K.rbox(0.5, 0.9, 0.55, stone, s*(hw - 0.2), 2.6, z, { rz:s*0.5, r:.06 }); }
      for(const z of [-hd/2 + 0.1, hd/2 - 0.3]) K.at(s*hw, 2.6, z, [0, s*Math.PI/2, 0], () => lancet(K, 0.7, 1.6, gold));
    }
    // rose window and an arched door
    K.at(0, 3.75, hd, null, () => {
      K.cyl(0.72, 0.72, 0.06, '#ffe7b0', 0, 0, 0.03, { role:'win', rx:Math.PI/2, seg:24 });
      K.torus(0.78, 0.12, stone, 0, 0, 0.1, { seg:24 });
      for(let i=0; i<4; i++) K.box(0.07, 1.46, 0.05, gold, 0, 0, 0.08, { rz:i*Math.PI/4 });
      K.ball(0.16, gold, 0, 0, 0.08, { seg:8, s:[1, 1, 0.5] });
    });
    // steeple on the front of the ridge: tower, belfry, spire, cross
    const tz = hd - 1.1, tb = h + rise - 0.5;
    K.rbox(1.9, 0.9, 1.9, wall, 0, tb + 0.45, tz, { r:.06 });
    K.rbox(2.1, 0.18, 2.1, stone, 0, tb + 0.95, tz, { r:.05 });
    K.rbox(1.7, 1.1, 1.7, wall, 0, tb + 1.55, tz, { r:.06 });
    for(let i=0; i<4; i++){ const a = i*Math.PI/2; K.at(Math.sin(a)*0.86, tb + 1.55, tz + Math.cos(a)*0.86, [0, a, 0], () => { K.box(0.55, 0.7, 0.04, DARK, 0, -0.05, 0.01); K.torus(0.29, 0.07, stone, 0, 0.28, 0.03, { arc:Math.PI, seg:10 }); for(let k=0; k<3; k++) K.box(0.55, 0.06, 0.08, stone, 0, -0.28 + k*0.2, 0.04, { rx:0.5 }); }); }
    K.rbox(1.95, 0.18, 1.95, stone, 0, tb + 2.15, tz, { r:.05 });
    K.cone(1.3, 1.9, rf, 0, tb + 3.2, tz, { seg:4, ry:Math.PI/4 });
    K.ball(0.14, gold, 0, tb + 4.2, tz, { seg:8 });
    K.box(0.18, 0.9, 0.18, gold, 0, tb + 4.7, tz); K.box(0.62, 0.18, 0.18, gold, 0, tb + 4.85, tz);
    // lanterns either side of the door
    for(const s of [-1, 1]){ K.box(0.3, 0.06, 0.3, INK, s*1.25, 2.55, hd + 0.2); K.ball(0.14, '#ffe2a8', s*1.25, 2.34, hd + 0.2, { role:'glow', seg:8 }); K.box(0.26, 0.36, 0.04, INK, s*1.25, 2.34, hd + 0.02); }
    return { door:{ color:'#8a5a3b', trim:stone, panel:'#9c6a42', step:stone, arch:true, dh:2.3 } };
  },

  // A bowling-alley diner: a big rounded cream block, checker base, chrome bands, a coral stripe,
  // striped awnings over ribbon windows, a giant pin and ball on the roof, and a neon sign.
  skills(K, P, { w, d, h }){
    const hw = w/2, hd = d/2, cream = '#fff4ea', coral = '#e98a5a', red = '#e5484d', chrome = '#dfe3ea', ink = '#2a2140';
    K.rbox(w, h, d, cream, 0, h/2, 0, { r:.6, seg:2 });
    // checker band round the front and sides
    const sq = 0.4;
    for(let x = -hw + 0.6; x <= hw - 0.6; x += sq) for(let r=0; r<2; r++) K.box(sq, sq, 0.05, (Math.round((x + hw)/sq) + r) % 2 ? ink : '#fffaf0', x, 0.25 + r*sq, hd + 0.01);
    for(const s of [-1, 1]) for(let z = -hd + 0.6; z <= hd - 0.6; z += sq) for(let r=0; r<2; r++) K.box(0.05, sq, sq, (Math.round((z + hd)/sq) + r) % 2 ? ink : '#fffaf0', s*(hw + 0.01), 0.25 + r*sq, z);
    K.rbox(w + 0.12, 0.16, d + 0.12, chrome, 0, 1.08, 0, { r:.07 }); K.rbox(w + 0.12, 0.5, d + 0.12, coral, 0, h - 0.7, 0, { r:.2 });
    K.rbox(w + 0.32, 0.3, d + 0.32, chrome, 0, h, 0, { r:.12 });
    // ribbon windows with striped awnings
    for(const s of [-1, 1]) K.at(s*2.55, 2.1, hd, null, () => pane(K, 2.6, 1.1, { trim:chrome, cross:false, awning:[red, '#fffaf0'], sill:false }));
    for(const s of [-1, 1]) K.at(s*hw, 2.1, 0, [0, s*Math.PI/2, 0], () => pane(K, 3.2, 1.0, { trim:chrome, cross:false, sill:false }));
    // giant pin and ball on the roof
    const pin = [[0, 0], [0.42, 0], [0.6, 0.35], [0.75, 1.1], [0.66, 1.8], [0.4, 2.45], [0.33, 2.8], [0.4, 3.15], [0.46, 3.5], [0.34, 3.9], [0.16, 4.05], [0, 4.08]];
    K.lathe(pin, (x, y, z) => { const ly = y - h - 0.2; return (ly > 2.47 && ly < 2.62) || (ly > 2.74 && ly < 2.89) ? red : '#ffffff'; }, -hw + 1.8, h + 0.2, -0.6, { seg:18 });
    K.ball(0.95, '#6b4bb8', -hw + 3.5, h + 1.05, -0.2, { seg:18 });
    for(const [a, b] of [[0.25, 0.3], [-0.1, 0.42], [0.1, 0.05]]) K.cyl(0.13, 0.13, 0.1, ink, -hw + 3.5 + a, h + 1.05 + b, 0.72, { rx:Math.PI/2 - 0.5, seg:8 });
    // neon sign on the roof: dark board, pink neon border, a cyan triangle of pins, an arrow
    const sx = hw - 2.2, sy = h + 1.6, sz = 0.6;
    K.at(sx, sy, sz, [0, -0.25, 0], () => {
      K.rbox(3.4, 2.1, 0.3, ink, 0, 0, 0, { r:.2 });
      K.box(0.14, 1.1, 0.14, ink, -1.1, -1.3, -0.05); K.box(0.14, 1.1, 0.14, ink, 1.1, -1.3, -0.05);
      K.box(3.0, 0.08, 0.06, '#ff5fa2', 0, 0.86, 0.17, { role:'glow' }); K.box(3.0, 0.08, 0.06, '#ff5fa2', 0, -0.86, 0.17, { role:'glow' });
      K.box(0.08, 1.8, 0.06, '#ff5fa2', -1.5, 0, 0.17, { role:'glow' }); K.box(0.08, 1.8, 0.06, '#ff5fa2', 1.5, 0, 0.17, { role:'glow' });
      for(let r=0; r<4; r++) for(let i=0; i<=r; i++) K.ball(0.1, '#6be4ff', (i - r/2)*0.3 - 0.45, 0.5 - r*0.3, 0.18, { role:'glow', seg:6 });
      K.box(0.7, 0.1, 0.06, '#ffd166', 0.85, -0.1, 0.17, { role:'glow' });
      K.box(0.36, 0.1, 0.06, '#ffd166', 1.08, 0.0, 0.17, { role:'glow', rz:-0.7 }); K.box(0.36, 0.1, 0.06, '#ffd166', 1.08, -0.2, 0.17, { role:'glow', rz:0.7 });
    });
    return { door:{ color:red, trim:chrome, porthole:true, step:chrome, knob:chrome } };
  },

  // A cottage: half-timbered cream walls under a thick thatch, a stone chimney, shuttered windows
  // with flower boxes; a vine pergola over a kitchen bed on one side, a rain barrel, logs and
  // sunflowers on the other.
  yard(K, P, { w, d, h }){
    const hw = w/2, hd = d/2, bw = Math.min(6.6, w - 4.2), cream = '#fff4de', beam = '#8a5a3b', thatch = '#e0b36a', green = '#6fae4a', stone = '#c9c2b8';
    K.rbox(bw + 0.3, 0.45, d + 0.3, stone, 0, 0.22, 0, { r:.1 });
    K.rbox(bw, h, d, cream, 0, h/2, 0, { r:.12 });
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.box(0.24, h, 0.24, beam, sx*bw/2, h/2, sz*hd);
    K.box(bw + 0.05, 0.2, 0.1, beam, 0, 1.55, hd + 0.02); K.box(bw + 0.05, 0.2, 0.1, beam, 0, h - 0.12, hd + 0.02);
    for(const s of [-1, 1]){ K.box(0.18, 1.9, 0.08, beam, s*(bw/2 - 0.55), 2.4, hd + 0.04, { rz:s*0.55 }); K.box(0.2, h, 0.08, beam, s*1.05, h/2, hd + 0.03); }
    gable(K, bw, d, 2.6, h, thatch, cream, { oh:0.6, end:0.45, t:0.5, round:0.22, seg:2, ridge:'#c9954f', rows:4, rowC:'#cf9d55', rowT:0.14, rowW:0.36 });
    K.at(0, h + 0.85, hd, null, () => porthole(K, 0.38, beam, { cross:true }));
    // chimney
    K.rbox(0.85, 3.0, 0.85, stone, -bw/2 + 1.2, h + 1.2, -hd + 1.2, { r:.1 }); K.rbox(1.0, 0.24, 1.0, '#a9a197', -bw/2 + 1.2, h + 2.7, -hd + 1.2, { r:.06 });
    K.cyl(0.18, 0.2, 0.4, '#c96f4a', -bw/2 + 1.35, h + 3.0, -hd + 1.1, { seg:8 });
    // windows
    for(const s of [-1, 1]) K.at(s*2.05, 2.2, hd, null, () => pane(K, 0.9, 1.0, { trim:'#fffaf0', shutters:green, flowers:beam, seed:s + 2 }));
    // pergola on the right: posts, beams, rafters, vines, tomatoes, a raised bed of greens
    const px0 = bw/2 + 0.25, px1 = hw - 0.15, pc = (px0 + px1)/2, pw = px1 - px0, ph = 2.8;
    for(const x of [px0, px1]) for(const z of [-hd + 0.35, 0, hd - 0.35]) K.box(0.2, ph, 0.2, beam, x, ph/2, z);
    for(const x of [px0, px1]) K.box(0.16, 0.24, d - 0.3, beam, x, ph + 0.1, 0);
    for(let z = -hd + 0.4; z <= hd - 0.3; z += 0.55) K.box(pw + 0.5, 0.12, 0.12, beam, pc, ph + 0.28, z);
    for(let i=0; i<11; i++){ const x = px0 + hash(i)*pw, z = -hd + 0.4 + hash(i + 20)*(d - 0.8); K.ball(0.34 + hash(i + 40)*0.2, i % 3 ? green : '#5f9e45', x, ph + 0.42, z, { s:[1, 0.6, 1], seg:8 }); }
    for(let i=0; i<6; i++){ const z = -hd + 0.8 + i*(d - 1.6)/5; K.ball(0.13, '#e5484d', pc + (hash(i)*0.6 - 0.3), ph - 0.1 - hash(i + 3)*0.3, z, { seg:6 }); K.box(0.03, 0.3, 0.03, '#5f9e45', pc + (hash(i)*0.6 - 0.3), ph + 0.1, z); }
    K.rbox(pw - 0.3, 0.5, d - 1.1, beam, pc, 0.25, 0, { r:.06 });
    for(let i=0; i<6; i++) K.ball(0.26, i % 2 ? '#8cc15a' : '#6fae4a', pc + (i % 2 ? 0.25 : -0.25), 0.62, -hd + 0.9 + i*(d - 1.8)/5, { seg:8, s:[1, 0.7, 1] });
    K.ball(0.3, '#f28c28', pc - 0.2, 0.7, hd - 0.9, { s:[1, 0.75, 1], seg:10 });
    // left side: rain barrel, a log pile, sunflowers
    const lx = -(bw/2 + (hw - bw/2)/2);
    K.cyl(0.45, 0.42, 1.0, '#9c6a42', lx + 0.2, 0.5, hd - 0.7, { seg:12 }); K.torus(0.46, 0.04, INK, lx + 0.2, 0.25, hd - 0.7, { rx:Math.PI/2, seg:12 }); K.torus(0.46, 0.04, INK, lx + 0.2, 0.78, hd - 0.7, { rx:Math.PI/2, seg:12 });
    for(let r=0; r<3; r++) for(let i=0; i<3 - r; i++) K.cyl(0.2, 0.2, 1.2, i % 2 ? '#b98a5a' : '#a8763f', lx - 0.55 + i*0.42 + r*0.21, 0.2 + r*0.36, -hd + 0.9, { rx:Math.PI/2, seg:8 });
    for(let i=0; i<3; i++){ const x = lx - 0.3 + i*0.45, z = -0.4 + (i % 2)*0.5, sh = 2.0 + i*0.35;
      K.cyl(0.05, 0.06, sh, '#5f9e45', x, sh/2, z, { seg:6 });
      K.at(x, sh, z + 0.05, [-0.5, 0, 0], () => { K.cyl(0.36, 0.36, 0.1, '#ffd166', 0, 0, 0, { rx:Math.PI/2, seg:12 }); K.cyl(0.17, 0.17, 0.14, '#7a5236', 0, 0, 0.02, { rx:Math.PI/2, seg:10 }); });
      K.ball(0.2, '#6fae4a', x + 0.15, sh*0.55, z, { s:[1.4, 0.4, 0.8], seg:8 }); }
    return { door:{ color:green, trim:'#fffaf0', panel:'#5f9e45', step:stone } };
  },

  // A half-built workshop: the left part finished in plywood and yellow trim, the right part bare
  // studs and trusses, scaffolding in front, a hazard barrier, and a little tower crane whose jib
  // turns (the spin kit).
  now(K, P, { w, d, h }, SK){
    const hw = w/2, hd = d/2, ply = '#e7bf86', stud = '#f0cf98', yellow = '#f2b705', steel = '#8f98ae', dark = INK;
    K.rbox(w + 0.2, 0.3, d + 0.2, '#cfc6b4', 0, 0.15, 0, { r:.08 });
    // finished part: from the left wall to just past the door
    const fx1 = 1.3, fw = fx1 + hw, fc = (fx1 - hw)/2;
    K.rbox(fw, h, d, ply, fc, h/2, 0, { r:.1 });
    K.rbox(fw + 0.1, 0.25, d + 0.1, yellow, fc, h - 0.1, 0, { r:.06 }); K.rbox(fw + 0.1, 0.25, d + 0.1, yellow, fc, 0.45, 0, { r:.06 });
    for(let x = -hw + 0.6; x < fx1 - 0.2; x += 1.2) K.box(0.05, h - 0.8, 0.04, '#d8aa6c', x, h/2, hd + 0.01);
    K.at(-hw + 1.6, 2.3, hd, null, () => pane(K, 1.2, 1.1, { trim:yellow }));
    K.at(fc, 0, 0, null, () => gable(K, fw, d, 2.0, h, '#c98f58', ply, { oh:0.4, end:0.25, t:0.26, ridge:yellow, rows:3, rowC:'#b5794a' }));
    K.rbox(2.6, 0.08, 2.2, '#4c8fd6', -hw + 1.8, h + 1.18, 1.55, { rx:Math.atan2(2.0, d/2), r:.03 });
    // the open frame: plates, studs, braces, trusses
    const ox0 = fx1, ox1 = hw - 0.1, fz = hd - 1.0, bz = -hd + 0.1;
    for(const z of [fz, bz]){ K.box(ox1 - ox0, 0.14, 0.14, stud, (ox0 + ox1)/2, 0.37, z); K.box(ox1 - ox0, 0.14, 0.14, stud, (ox0 + ox1)/2, h - 0.07, z);
      for(let x = ox0 + 0.5; x <= ox1 + 0.01; x += 0.55) K.box(0.13, h - 0.3, 0.13, stud, x, h/2 + 0.15, z); }
    K.box(0.14, 0.14, fz - bz, stud, ox1, h - 0.07, (fz + bz)/2); K.box(0.14, 0.14, fz - bz, stud, ox1, 0.37, (fz + bz)/2);
    for(let z = bz + 0.5; z < fz; z += 0.6) K.box(0.13, h - 0.3, 0.13, stud, ox1, h/2 + 0.15, z);
    K.box(0.12, 2.6, 0.1, stud, (ox0 + ox1)/2, h/2, fz + 0.1, { rz:0.8 });
    const tri = (x) => { const span = fz - bz + 0.6, a = Math.atan2(2.0, span/2), L = (span/2)/Math.cos(a), zc = (fz + bz)/2;
      K.box(0.12, 0.14, span, stud, x, h + 0.05, zc);
      for(const s of [-1, 1]) K.box(0.12, 0.14, L, stud, x, h + 1.0, zc + s*span/4, { rx:s*a });
      K.box(0.12, 2.0, 0.12, stud, x, h + 1.0, zc); };
    for(let x = ox0 + 0.5; x <= ox1 + 0.01; x += 0.9) tri(x);
    K.box(ox1 - ox0 + 0.2, 0.14, 0.14, stud, (ox0 + ox1)/2, h + 2.0, (fz + bz)/2);
    // lumber stack inside, a blue tarp over it
    for(let i=0; i<4; i++) K.box(2.2, 0.14, 0.32, i % 2 ? '#e3b778' : '#d9a066', (ox0 + ox1)/2, 0.4 + i*0.15, -0.6 + (i % 2)*0.1);
    K.rbox(2.0, 0.12, 1.1, '#4c8fd6', (ox0 + ox1)/2, 1.0, -0.6, { rz:0.12, r:.04 });
    // scaffolding across the open front
    const sz0 = hd - 0.85, sz1 = hd - 0.12, sxs = [ox0 + 0.1, (ox0 + ox1)/2 + 0.05, ox1];
    for(const x of sxs) for(const z of [sz0, sz1]) K.cyl(0.06, 0.06, 4.6, steel, x, 2.3, z, { seg:6 });
    for(const y of [1.5, 3.0, 4.4]){ for(const z of [sz0, sz1]) K.cyl(0.05, 0.05, ox1 - ox0 + 0.2, steel, (ox0 + ox1)/2, y, z, { rz:Math.PI/2, seg:6 });
      if(y < 4) { K.box(ox1 - ox0 + 0.1, 0.08, 0.72, '#d9a066', (ox0 + ox1)/2, y + 0.06, (sz0 + sz1)/2); K.box(ox1 - ox0 + 0.1, 0.22, 0.04, yellow, (ox0 + ox1)/2, y + 0.2, sz1 + 0.02); } }
    K.cyl(0.04, 0.04, 2.1, steel, (ox0 + ox1)/2, 2.25, sz1, { rz:0.95, seg:5 });
    K.ball(0.16, '#fff1c9', sxs[1], 4.25, sz1 + 0.1, { role:'glow', seg:8 }); K.box(0.3, 0.2, 0.2, dark, sxs[1], 4.45, sz1 + 0.05);
    // hazard barrier
    for(let i=0; i<8; i++) K.box(0.33, 0.3, 0.06, i % 2 ? dark : yellow, ox0 + 0.25 + i*0.33, 0.95, hd - 0.02);
    for(const x of [ox0 + 0.2, ox0 + 0.2 + 8*0.33]) K.box(0.08, 1.1, 0.08, dark, x, 0.55, hd - 0.05);
    // tower crane: lattice mast at the back left corner
    const mx = -hw + 0.6, mz = -hd + 0.6, mh = 9.0, m = 0.34;
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.box(0.1, mh, 0.1, yellow, mx + sx*m, mh/2, mz + sz*m);
    for(let y = 0.8; y < mh; y += 0.9){ for(const s of [-1, 1]){ K.box(m*2, 0.07, 0.07, yellow, mx, y, mz + s*m); K.box(0.07, 0.07, m*2, yellow, mx + s*m, y, mz); }
      K.box(0.05, 1.1, 0.05, yellow, mx, y + 0.45, mz + m, { rz:0.62 }); K.box(0.05, 1.1, 0.05, yellow, mx + m, y + 0.45, mz, { rx:0.62 }); }
    K.rbox(1.3, 0.5, 1.3, '#9aa3b8', mx, 0.25, mz, { r:.06 });
    SK.pivot = [mx, mh, mz];
    SK.rbox(1.0, 0.3, 1.0, yellow, 0, 0.15, 0, { r:.06 });
    SK.rbox(0.9, 0.85, 0.8, yellow, 0.35, 0.72, 0.62, { r:.1 }); SK.box(0.7, 0.4, 0.05, '#bfe3f0', 0.35, 0.82, 1.03);
    for(const s of [-1, 1]) SK.box(6.4, 0.08, 0.08, yellow, 3.4, 0.4, s*0.28);
    SK.box(6.4, 0.08, 0.08, yellow, 3.4, 0.95, 0);
    for(let i=0; i<11; i++){ const x = 0.6 + i*0.55; for(const s of [-1, 1]) SK.box(0.05, 0.7, 0.05, yellow, x, 0.68, s*0.14, { rz:i % 2 ? 0.6 : -0.6, rx:s*0.35 }); }
    SK.box(2.4, 0.3, 0.6, yellow, -1.3, 0.45, 0); SK.rbox(0.9, 0.8, 0.8, '#9aa3b8', -2.1, 0.15, 0, { r:.08 });
    SK.box(0.12, 1.5, 0.12, yellow, 0, 1.2, 0);
    SK.box(0.03, 0.03, 5.2, dark, 2.8, 1.35, 0, { ry:Math.PI/2, rz:-0.16 }); SK.box(0.03, 0.03, 2.4, dark, -1.1, 1.3, 0, { ry:Math.PI/2, rz:0.3 });
    SK.rbox(0.36, 0.22, 0.4, dark, 4.9, 0.25, 0, { r:.04 });
    SK.cyl(0.02, 0.02, 3.2, dark, 4.9, -1.5, 0, { seg:4 });
    SK.torus(0.14, 0.04, '#e5484d', 4.9, -3.2, 0, { arc:Math.PI*1.4, rz:-0.6, seg:10 });
    SK.box(1.8, 0.2, 0.3, '#e5484d', 4.9, -3.45, 0); SK.box(1.8, 0.05, 0.3, '#c73b40', 4.9, -3.34, 0);
    return { door:{ color:yellow, trim:'#fffaf0', panel:'#d9a405', step:'#cfc6b4', knob:dark } };
  },

  // A post office: cream walls under a red false front with a giant brass mail slot (letters half
  // posted), a stamp sign, blue awnings, a flagpole with a mail flag, and a big red mailbox whose
  // little flag swings (the wave kit).
  contact(K, P, { w, d, h }, SK){
    const hw = w/2, hd = d/2, bw = Math.min(7.0, w - 2.6), cream = '#fff1dc', red = '#d9534f', blue = '#3b4f9e', white = '#fffaf0';
    K.rbox(bw + 0.3, 0.45, d + 0.3, '#c9b8a6', 0, 0.22, 0, { r:.1 });
    K.rbox(bw, h, d, cream, 0, h/2, 0, { r:.14 });
    K.rbox(bw + 0.2, 0.3, d + 0.2, red, 0, h - 0.05, 0, { r:.08 });
    // flat roof and the false front
    K.rbox(bw + 0.1, 0.2, d, '#b9a58f', 0, h + 0.1, 0, { r:.05 });
    K.rbox(bw + 0.3, 1.7, 0.45, red, 0, h + 0.7, hd - 0.12, { r:.1 });
    K.rbox(3.4, 0.9, 0.45, red, 0, h + 1.85, hd - 0.12, { r:.14 });
    for(let i=0; i<Math.floor((bw + 0.2)/0.34); i++){ const x = -bw/2 + 0.1 + i*0.34; K.box(0.16, 0.2, 0.05, i % 2 ? blue : white, x, h - 0.05, hd + 0.13, { rz:0.6 }); }
    // the mail slot with two letters half posted
    const my = h + 0.72, mz = hd + 0.12;
    K.rbox(5.4, 1.0, 0.14, BRASS, 0, my, mz, { r:.14 });
    K.box(4.8, 0.42, 0.08, DARK, 0, my - 0.08, mz + 0.05);
    K.rbox(4.9, 0.2, 0.12, '#d9a53a', 0, my + 0.24, mz + 0.16, { rx:-0.4, r:.05 });
    for(const [x, rz] of [[-1.1, 0.12], [1.2, -0.08]]){ K.at(x, my + 0.1, mz + 0.05, [0.45, 0, rz], () => { K.rbox(1.3, 0.75, 0.05, white, 0, 0.12, 0.05, { r:.03 });
      K.box(0.62, 0.05, 0.02, red, -0.25, 0.25, 0.09, { rz:-0.5 }); K.box(0.62, 0.05, 0.02, red, 0.25, 0.25, 0.09, { rz:0.5 }); K.box(0.2, 0.24, 0.02, blue, 0.35, 0.05, 0.09); }); }
    // stamp sign on the raised centre: scalloped edge, a red heart
    K.at(0, h + 1.9, hd + 0.12, null, () => {
      K.box(1.3, 0.72, 0.08, white, 0, 0, 0);
      for(let i=0; i<7; i++) for(const s of [-1, 1]) K.ball(0.07, white, -0.6 + i*0.2, s*0.36, 0, { seg:6 });
      for(let i=0; i<4; i++) for(const s of [-1, 1]) K.ball(0.07, white, s*0.65, -0.27 + i*0.18, 0, { seg:6 });
      K.box(1.06, 0.5, 0.04, '#f4c9c0', 0, 0, 0.05);
      K.shape(heart(0.22), 0.06, red, 0, 0.02, 0.08, {});
    });
    // windows with blue awnings
    for(const s of [-1, 1]) K.at(s*2.15, 2.1, hd, null, () => pane(K, 1.2, 1.2, { trim:white, awning:[blue, white] }));
    for(const s of [-1, 1]) K.at(s*bw/2, 2.1, 0, [0, s*Math.PI/2, 0], () => pane(K, 1.0, 1.1, { trim:white }));
    // flagpole with a mail flag, on the right
    const fx = bw/2 + (hw - bw/2)/2, fz = hd - 0.6;
    K.cyl(0.35, 0.45, 0.4, '#c9b8a6', fx, 0.2, fz, { seg:10 });
    K.cyl(0.06, 0.08, 6.4, white, fx, 3.4, fz, { seg:8 }); K.ball(0.14, BRASS, fx, 6.65, fz, { seg:8 });
    for(let i=0; i<3; i++) K.box(0.55, 1.0, 0.05, red, fx + 0.33 + i*0.52, 5.9 - i*0.04, fz + Math.sin(i*1.6)*0.14, { ry:Math.cos(i*1.6)*0.35 });
    K.rbox(0.7, 0.44, 0.05, white, fx + 0.85, 5.9, fz + 0.1, { r:.02 }); K.box(0.4, 0.04, 0.02, red, fx + 0.73, 6.0, fz + 0.14, { rz:-0.5 }); K.box(0.4, 0.04, 0.02, red, fx + 0.97, 6.0, fz + 0.14, { rz:0.5 });
    // the big mailbox on the left: post, box, round top, door, and the swinging flag
    const bx = -(bw/2 + (hw - bw/2)/2), bz = hd - 1.15, mw = Math.min(1.3, hw - bw/2 - 0.05), my2 = 2.1;
    K.rbox(0.8, 0.3, 0.8, '#c9b8a6', bx, 0.15, bz, { r:.06 });
    K.box(0.32, my2 - 0.4, 0.32, '#6b4a33', bx, (my2 - 0.4)/2, bz);
    K.rbox(mw, 1.0, 2.1, red, bx, my2, bz, { r:.08 });
    K.cyl(mw/2, mw/2, 2.1, red, bx, my2 + 0.5, bz, { rx:Math.PI/2, t0:Math.PI/2, tl:Math.PI, seg:18 });
    K.cyl(mw/2 + 0.01, mw/2 + 0.01, 0.08, '#c73b40', bx, my2 + 0.5, bz + 1.06, { rx:Math.PI/2, t0:Math.PI/2, tl:Math.PI, seg:18 });
    K.rbox(mw + 0.03, 1.0, 0.08, '#c73b40', bx, my2, bz + 1.06, { r:.03 });
    K.rbox(0.4, 0.12, 0.12, BRASS, bx, my2 + 0.55, bz + 1.12, { r:.04 });
    K.rbox(0.9, 0.12, 0.05, '#fffaf0', bx, my2 - 0.15, bz + 1.11, { r:.02 });
    SK.pivot = [bx - mw/2 - 0.05, my2, bz - 0.3];
    SK.box(0.08, 1.4, 0.08, '#ffd166', 0, 0.5, 0); SK.rbox(0.08, 0.5, 0.7, '#ffd166', 0, 1.0, 0.33, { r:.03 });
    return { door:{ color:blue, trim:white, panel:'#34468f', step:'#c9b8a6' }, wave:true };
  },
};

// A lancet: a tall pane with a pointed arch head, facing +z.
function lancet(K, w, h, trim){
  const head = []; for(let i=0; i<=8; i++){ const a = i/8*Math.PI; head.push([Math.cos(a)*w/2, Math.sin(a)*w*0.75]); }
  K.box(w, h, 0.06, '#fff', 0, 0, 0.03, { role:'win' });
  K.shape(head, 0.06, '#fff', 0, h/2, 0.03, { role:'win' });
  K.torus(w/2 + 0.08, 0.09, trim, 0, h/2, 0.08, { arc:Math.PI, seg:12, S:[1, 1.5, 1] });
  for(const s of [-1, 1]) K.rbox(0.16, h, 0.16, trim, s*(w/2 + 0.08), 0, 0.08, { r:.04 });
  K.box(0.07, h + w*0.7, 0.05, trim, 0, w*0.35, 0.09);
  K.rbox(w + 0.4, 0.14, 0.3, trim, 0, -h/2 - 0.07, 0.14, { r:.04 });
}
function heart(s){ const pts = []; for(let i=0; i<24; i++){ const t = i/24*Math.PI*2; pts.push([16*Math.pow(Math.sin(t), 3)*s/16, (13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t))*s/16]); } return pts; }

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */
// buildHouse(ctx, zone, { w, d, h, color?, roofColor? }) -> THREE.Group
// color and roofColor override a design's body and roof colours where it has them.
export function buildHouse(ctx, zone, opts){
  const { THREE } = ctx, M = materials(ctx);
  const { w, d, h } = opts, id = typeof zone === 'string' ? zone : zone.id;
  const group = new THREE.Group(); group.name = 'house:' + id;
  const K = Kit(THREE), SK = Kit(THREE), parts = { door:Kit(THREE), frame:Kit(THREE) };
  const design = DESIGNS[id] || DESIGNS.school;
  const out = design(K, { THREE, zone }, { w, d, h, body:opts.color, roof:opts.roofColor }, SK) || {};
  const dp = doorway(THREE, parts, d/2, out.door || {});
  K.build(group, M);
  // the moving part (tooth sign, crane jib, mailbox flag) turns about its pivot
  if(SK.pivot){
    const pivot = new THREE.Group(); pivot.position.set(SK.pivot[0], SK.pivot[1], SK.pivot[2]); group.add(pivot);
    SK.build(pivot, M); pivot.name = out.wave ? 'wave' : 'spin';
    group.userData[out.wave ? 'wave' : 'spin'] = [pivot];
  }
  const frame = parts.frame.build(group, M).wall;
  // Door: its geometry starts at the hinge (x = 0), so rotation.y swings it open on that edge.
  const door = parts.door.build(group, M).wall;
  door.position.set(-dp.dw/2, 0, d/2 + 0.02); door.name = 'door'; frame.name = 'doorFrame';
  group.userData.doorParts = { door, frame };
  group.userData.zone = id;
  return group;
}
