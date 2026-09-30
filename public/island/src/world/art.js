// Art pass over the island, called once from map.js after the scatter is built.
// Everything here is visual only: no colliders, no physics, no calls to the shared rng(), so the
// map layout and every seeded build after it stay exactly the same.
//
//  - tall grass in clumps along the banks and in rings around the zones, with flowers in
//    single-colour clusters among it
//  - trees, their fallen leaves and the toadstools under them live in trees.js
//  - street lamps along the inner roads, round the plaza and by every zone, with bulbs tagged
//    for the bloom
//  - wind: every grass-like material sways from one shared time uniform
//  - the start screen: until the player starts, the camera holds a slow diorama shot of the car
//    at spawn, then eases into the follow camera
//  - painted surfaces: brushy mottled grass, speckled asphalt, brick-laid paving on the plaza and
//    the zone pads, bushes shaded dark underneath and light on top (all in the shaders, no textures)
//  - short grass carpets in patches, which the ground shader darkens underneath
//  - facades: plinths, corner trim, framed windows with shutters, door frames, awnings and door
//    lamps on every box house map.js falls back to, plus one prop that says what each house is.
//    A houses.js building draws its own facade and gets only a door lamp (where it lacks one)
//    and its light pool
//  - light pools under the lamps and at the doors, and drifting petals and pollen round the car
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function dress(ctx, kit){
  const { THREE, scene, state, bus } = ctx;
  const { Lay, inst, nearBridge } = kit;
  const zones = ctx.zones;

  // Own seeded stream (not helpers.rng, which would shift everything built after map.js).
  let seed = 918273645;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const pick = list => list[Math.floor(rnd()*list.length)];
  const col = new THREE.Color();

  /* ---------------- wind ---------------- */
  const wind = { value:0 };
  function sway(material, amount = 1){
    material.onBeforeCompile = shader => {
      shader.uniforms.uWind = wind;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 wp = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
          #else
            vec2 wp = vec2(0.0);
          #endif
          float sw = sin(uWind*1.6 + wp.x*0.35 + wp.y*0.23) + 0.5*sin(uWind*2.7 + wp.x*0.9 - wp.y*0.4);
          float hy = max(position.y, 0.0);
          transformed.xz += vec2(0.085, 0.05)*sw*hy*hy*${amount.toFixed(2)};`);
    };
    // three caches programs by onBeforeCompile's source text, which is the same for every sway()
    // call: key it by the amount so two sway strengths never share one program.
    material.customProgramCacheKey = () => 'sway' + amount;
    material.needsUpdate = true;
    return material;
  }
  for(const m of kit.sway || []){ sway(m); m.flatShading = false; }
  // The short tufts from map.js: point every normal up so they take the ground's light instead
  // of showing dark, faceted backs.
  if(kit.tuftGeo){ const nr = kit.tuftGeo.attributes.normal; for(let i=0; i<nr.count; i++) nr.setXYZ(i, 0, 1, 0); nr.needsUpdate = true; }
  ctx.onUpdate((dt, t, mode) => { if(mode !== 'interior') wind.value = state.reduced ? 0 : t; }, 70);

  /* ---------------- placement tests ---------------- */
  const onGrass = (x, z, bank = 0.7) => Lay.landAt(x, z) && Lay.dLandAt(x, z) >= bank;
  const offRoad = (x, z, r = 5.2) => Lay.roadDistAt(x, z) >= r;
  const clearOf = (x, z, r) => {
    for(const c of ctx.colliders){
      if(c.kind === 'circle'){ if(Math.hypot(x - c.x, z - c.z) < c.r + r) return false; }
      else { const dx = x - c.x, dz = z - c.z, ca = Math.cos(c.ang), sa = Math.sin(c.ang);
        const lx = dx*ca - dz*sa, lz = dx*sa + dz*ca; if(Math.abs(lx) < c.hw + r && Math.abs(lz) < c.hd + r) return false; }
    }
    return true;
  };
  const zoneDist = (x, z) => Math.min(...zones.map(zn => Math.hypot(x - zn.x, z - zn.z)));

  /* ---------------- tall grass, clumped ---------------- */
  // One tuft is 7 single-triangle blades. Normals all point up, so the grass is lit like the
  // ground it grows from (soft, no black backfaces); a vertex colour runs dark at the root to
  // light at the tip, and the instance colour gives the hue.
  function tuftGeometry(blades, h){
    const P = [], N = [], C = [];
    for(let b=0; b<blades; b++){
      const a = b/blades*Math.PI*2 + rnd()*0.6, lean = 0.18 + rnd()*0.25, hh = h*(0.65 + rnd()*0.45), w = 0.085;
      const bx = Math.cos(a)*0.12, bz = Math.sin(a)*0.12, px = -Math.sin(a)*w, pz = Math.cos(a)*w;
      const tx = bx + Math.cos(a)*lean, tz = bz + Math.sin(a)*lean;
      P.push(bx - px, 0, bz - pz,  bx + px, 0, bz + pz,  tx, hh, tz);
      for(let k=0; k<3; k++) N.push(0, 1, 0);
      C.push(0.55, 0.55, 0.5,  0.55, 0.55, 0.5,  1.08, 1.08, 1.0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    return g;
  }
  const grassMat = sway(new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.9, side:THREE.DoubleSide }), 1.2);
  const TALL = ['#79b64a', '#8cc152', '#6aa845', '#a6c95a', '#b9c763', '#c9c26a'];
  const FLOWER = ['#ff8fab', '#ffd166', '#ffffff', '#c9b5ff', '#ffb4a2', '#ff6b6b', '#9bd4ff'];

  const R = () => (rnd()*2 - 1)*170;
  const centres = [];
  const wantBank = 340, wantRing = 190, wantMeadow = 110;
  let bank = 0, ring = 0, meadow = 0;
  for(let i=0; i<90000 && (bank < wantBank || ring < wantRing || meadow < wantMeadow); i++){
    const x = R(), z = R();
    if(!onGrass(x, z, 0.9) || !offRoad(x, z, 5.6) || x*x + z*z < 13*13 || nearBridge(x, z, 11)) continue;
    const dl = Lay.dLandAt(x, z), zd = zoneDist(x, z);
    let kind = null;
    if(dl < 5 && bank < wantBank) kind = 'bank';
    else if(zd > 14 && zd < 24 && ring < wantRing) kind = 'ring';
    else if(meadow < wantMeadow && rnd() < 0.05) kind = 'meadow';
    if(!kind || zd < 13) continue;
    if(kind === 'bank') bank++; else if(kind === 'ring') ring++; else meadow++;
    centres.push({ x, z, kind });
  }
  const tall = [], flowers = [];
  for(const c of centres){
    const n = c.kind === 'bank' ? 14 + Math.floor(rnd()*16) : 9 + Math.floor(rnd()*12), spread = 1.2 + rnd()*1.6;
    const hue = pick(TALL);
    for(let k=0; k<n; k++){
      const a = rnd()*Math.PI*2, r = Math.sqrt(rnd())*spread, x = c.x + Math.cos(a)*r, z = c.z + Math.sin(a)*r;
      if(!onGrass(x, z, 0.5) || !offRoad(x, z, 5.0) || zoneDist(x, z) < 12.5) continue;
      const s = 0.8 + rnd()*0.6, mid = 1 - r/spread;
      tall.push({ x, y:0, z, sx:s, sy:s*(0.9 + mid*0.7), sz:s, ry:rnd()*6, c:rnd() < 0.7 ? hue : pick(TALL) });
    }
    if(rnd() < 0.6){
      const fc = pick(FLOWER), m = 4 + Math.floor(rnd()*7);
      for(let k=0; k<m; k++){
        const a = rnd()*Math.PI*2, r = spread*(0.6 + rnd()*0.8), x = c.x + Math.cos(a)*r, z = c.z + Math.sin(a)*r;
        if(!onGrass(x, z, 0.6) || !offRoad(x, z, 5.0) || zoneDist(x, z) < 12) continue;
        flowers.push({ x, y:0.28 + rnd()*0.25, z, sx:1, sy:0.8, sz:1, ry:rnd()*6, c:fc });
      }
    }
  }
  inst(tuftGeometry(10, 1.2), grassMat, tall, { shadow:false });
  // flower heads: a tiny five-petal star
  const petal = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 5, 1);
  inst(petal, new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.7, flatShading:true }), flowers, { shadow:false });
  inst(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshStandardMaterial({ color:'#ffcf4a', roughness:.7 }), flowers.map(f => ({ x:f.x, y:f.y + 0.04, z:f.z })), { shadow:false });

  /* ---------------- leaves, crowns and toadstools under the trees ---------------- */
  // All in trees.js now (built from map.js's tree spots): crowns, litter and toadstools follow the
  // species and the season there.

  /* ---------------- lamps ---------------- */
  const lamps = [];
  const okLamp = (x, z) => Lay.landAt(x, z) && Lay.dLandAt(x, z) > 1.2 && offRoad(x, z, 5.0) && !nearBridge(x, z, 12) && clearOf(x, z, 1.1) && lamps.every(l => Math.hypot(l.x - x, l.z - z) > 9);
  Lay.roads.forEach((road, ri) => {
    if(road.name === 'outer') return;           // the race gates own the ring road's verges
    const pts = road.pts; let side = 1;
    for(let k=20; k<pts.length - 20; k += 52){
      const p = pts[k]; if(Lay.onBridge(ri, k)) continue;
      for(const s of [side, -side]){ const x = p.x - p.tz*s*5.6, z = p.z + p.tx*s*5.6; if(x*x + z*z > 16*16 && okLamp(x, z)){ lamps.push({ x, z }); break; } }
      side = -side;
    }
  });
  for(let i=0; i<8; i++){ const a = Math.PI/4 + i*Math.PI/2 + (i >= 4 ? 0.3 : 0), x = Math.cos(a)*10.6, z = Math.sin(a)*10.6; if(okLamp(x, z)) lamps.push({ x, z }); }
  for(const zn of zones){ const f = ctx.helpers.frameOf(zn); for(const sx of [-7.6, 7.6]){ const [x, z] = f.w(sx, 10.8); if(okLamp(x, z)) lamps.push({ x, z }); } }
  const dark = new THREE.MeshStandardMaterial({ color:'#3d3550', roughness:.6 });
  inst(new THREE.CylinderGeometry(0.07, 0.1, 2.7, 6), dark, lamps.map(l => ({ x:l.x, y:1.35, z:l.z })));
  inst(new THREE.CylinderGeometry(0.2, 0.26, 0.24, 8), dark, lamps.map(l => ({ x:l.x, y:0.12, z:l.z })), { shadow:false });
  inst(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 8), dark, lamps.map(l => ({ x:l.x, y:2.74, z:l.z })), { shadow:false });
  // Opaque, but writes alpha .1 straight into the scene target (a plain replace blend, since
  // NormalBlending on an opaque material forces alpha to 1). renderer.js blooms 1 - alpha.
  const glow = new THREE.MeshBasicMaterial({ color:'#fff1c9', opacity:0.1, fog:false,
    blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor });
  inst(new THREE.IcosahedronGeometry(0.26, 1), glow, lamps.map(l => ({ x:l.x, y:3.02, z:l.z })), { shadow:false, receive:false });

  /* ---------------- painted surfaces ---------------- */
  // Each painted material gets its world position (vArtW) and object position (vArtL) and a
  // snippet that runs right after the base colour is known. No textures: value noise in GLSL.
  const NOISE = `
    varying vec3 vArtW; varying vec3 vArtL;
    float aHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    float aNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
      return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), f.x), mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float aPatch(vec2 w){ return sin(w.x*0.09 + sin(w.y*0.07)*1.8)*sin(w.y*0.085 + sin(w.x*0.06)*1.6) + 0.35*sin(w.x*0.23 + w.y*0.19); }`;
  // the same carpet field in JS, so the grass carpets sit exactly on the darkened ground
  const aPatch = (x, z) => Math.sin(x*0.09 + Math.sin(z*0.07)*1.8)*Math.sin(z*0.085 + Math.sin(x*0.06)*1.6) + 0.35*Math.sin(x*0.23 + z*0.19);
  function paint(material, key, body){
    const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, r) => {
      prev.call(material, shader, r);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vArtW; varying vec3 vArtL;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vArtL = position;
          #ifdef USE_INSTANCING
            vArtW = (modelMatrix*instanceMatrix*vec4(transformed, 1.0)).xyz;
          #else
            vArtW = (modelMatrix*vec4(transformed, 1.0)).xyz;
          #endif`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + NOISE)
        .replace('#include <color_fragment>', '#include <color_fragment>\n{\n' + body + '\n}');
    };
    material.customProgramCacheKey = () => prevKey() + '|paint-' + key;
    material.needsUpdate = true;
    return material;
  }
  // Grass: slow mottled patches, brush strokes along one direction, sunny patches go yellow, and
  // the carpet patches sit on darker ground. Sand gets a fine grain.
  if(kit.groundMat) paint(kit.groundMat, 'ground', `
    vec2 w = vArtW.xz;
    float grassy = smoothstep(0.02, 0.09, diffuseColor.g - diffuseColor.r);
    float n1 = aNoise(w*0.16), n2 = aNoise(w*0.55 + 7.3);
    vec2 rw = vec2(w.x*0.8 - w.y*0.6, w.x*0.6 + w.y*0.8);
    float brush = aNoise(rw*vec2(3.4, 0.6));
    diffuseColor.rgb *= 1.0 + ((n1 - 0.5)*0.26 + (n2 - 0.5)*0.12 + (brush - 0.5)*0.2)*grassy;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.1, 1.04, 0.78), smoothstep(0.58, 0.85, n1)*grassy*0.7);
    float carpet = smoothstep(0.3, 0.5, aPatch(w))*grassy;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.74, 0.84, 0.7), carpet*0.8);
    float sandy = 1.0 - grassy;
    diffuseColor.rgb *= 1.0 + ((aHash(floor(w*8.0)) - 0.5)*0.06 + (n2 - 0.5)*0.1)*sandy;`);
  const R0 = kit.roadMats || {};
  if(R0.asphalt) paint(R0.asphalt, 'asphalt', `
    vec2 w = vArtW.xz;
    float n = aNoise(w*0.3), m = aNoise(w*1.6 + 3.0), sp = aHash(floor(w*6.0));
    diffuseColor.rgb *= 0.9 + 0.16*n + 0.07*m + step(0.94, sp)*0.1 - step(sp, 0.05)*0.07;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.08, 0.95, 1.06), smoothstep(0.6, 0.9, n)*0.6);`);
  if(R0.shoulder) paint(R0.shoulder, 'shoulder', `
    vec2 w = vArtW.xz;
    diffuseColor.rgb *= 0.93 + 0.11*aNoise(w*0.8) + (aHash(floor(w*6.0)) - 0.5)*0.08;`);
  // Brick-laid paving, a warm tile colour jittered per tile, a few terracotta tiles, soft grout.
  const tiles = `
    vec2 t = vArtW.xz/1.3;
    t.x += mod(floor(t.y), 2.0)*0.5;
    vec2 id = floor(t), f = fract(t);
    float h = aHash(id);
    vec2 e = min(f, 1.0 - f); float edge = min(e.x, e.y);
    float aa = max(fwidth(t.x), fwidth(t.y));
    float grout = 1.0 - smoothstep(0.03, 0.03 + aa*1.5, edge);
    diffuseColor.rgb *= (0.9 + 0.16*h)*mix(1.0, 0.74, grout)*(0.95 + 0.05*smoothstep(0.0, 0.2, edge));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.02, 0.84, 0.74), step(0.84, h)*0.8);`;
  if(kit.plazaMat) paint(kit.plazaMat, 'tiles', tiles);
  if(kit.paveMat) paint(kit.paveMat, 'tiles', tiles);
  // Bushes: dark underneath, light on top, dappled, so each ball reads as a mass of leaves.
  const crown = `
    float y = clamp(vArtL.y, -1.0, 1.0);
    float n = aNoise(vArtW.xz*1.4 + vArtW.y*0.8);
    diffuseColor.rgb *= mix(0.62, 1.14, smoothstep(-0.9, 0.8, y))*(0.9 + 0.2*n);`;
  if(kit.leafMat) paint(kit.leafMat, 'crown', crown);

  /* ---------------- grass carpets ---------------- */
  // Short dense grass in the patches aPatch() marks, near the roads the player actually drives.
  function carpetGeometry(){
    const P = [], N = [], C = [];
    for(let b=0; b<5; b++){
      const a = b/5*Math.PI*2 + rnd()*0.8, hh = 0.32 + rnd()*0.22, w = 0.07, r = 0.13;
      const bx = Math.cos(a)*r, bz = Math.sin(a)*r, px = -Math.sin(a)*w, pz = Math.cos(a)*w;
      P.push(bx - px, 0, bz - pz,  bx + px, 0, bz + pz,  bx*1.8, hh, bz*1.8);
      for(let k=0; k<3; k++) N.push(0, 1, 0);
      C.push(0.5, 0.52, 0.45,  0.5, 0.52, 0.45,  1.12, 1.1, 0.9);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    return g;
  }
  const CARPET = ['#6ea244', '#7fb14b', '#8fb850', '#a4c05a', '#b4b85a'];
  const carpet = [];
  for(let gx = -168; gx < 168; gx += 0.62) for(let gz = -168; gz < 168; gz += 0.62){
    const x = gx + (rnd() - 0.5)*0.55, z = gz + (rnd() - 0.5)*0.55;
    const f = aPatch(x, z); if(f < 0.36) continue;
    if(f < 0.46 && rnd() > (f - 0.36)*10) continue;
    if(!onGrass(x, z, 0.8) || !offRoad(x, z, 5.0) || x*x + z*z < 11*11 || zoneDist(x, z) < 12.5 || Lay.roadDistAt(x, z) > 34) continue;
    const s = 0.8 + rnd()*0.5;
    carpet.push({ x, y:0, z, sx:s, sy:s*(0.8 + rnd()*0.5), sz:s, ry:rnd()*6, c:CARPET[Math.floor((0.5 + 0.5*Math.sin(x*0.3 + z*0.2))*CARPET.length*0.999)] });
  }
  inst(carpetGeometry(), sway(new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.9, side:THREE.DoubleSide }), 0.8), carpet, { shadow:false });

  /* ---------------- sun ---------------- */
  // Lower and more from the side than core's default offset, for longer painterly shadows.
  ctx.onUpdate((dt, t, mode) => { if(mode === 'interior') return; const f = state.focus; ctx.sun.position.set(f.x + 32, 31, f.z + 9); }, 96);

  /* ---------------- facades ---------------- */
  // Every house() from map.js gets the same kit, merged into one mesh per house (vertex colours),
  // one for its lit windows and one for anything that glows. Visual only: no colliders.
  const winMat = ctx.helpers.mat('#ffe7b0', { emissive:'#ffb85c', emissiveIntensity:1.5 });
  const wallMat = new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.8 });
  const glowAll = new THREE.MeshBasicMaterial({ color:'#ffffff', vertexColors:true, opacity:0.1, fog:false,
    blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor });
  const doors = [];
  function kitOf(){
    const parts = { wall:[], win:[], glow:[] };
    const add = (set, geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
      geo = geo.index ? geo.toNonIndexed() : geo; geo.deleteAttribute('uv');
      if(rx) geo.rotateX(rx); if(ry) geo.rotateY(ry); if(rz) geo.rotateZ(rz); geo.translate(x, y, z);
      col.set(c); const n = geo.attributes.position.count, a = new Float32Array(n*3);
      for(let i=0; i<n; i++){ a[i*3] = col.r; a[i*3+1] = col.g; a[i*3+2] = col.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts[set].push(geo);
    };
    return {
      box:(w, h, d, c, x, y, z, rx, ry, rz, set = 'wall') => add(set, new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz),
      cyl:(rt, rb, h, c, x, y, z, rx, ry, rz, set = 'wall', seg = 12) => add(set, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz),
      ball:(r, c, x, y, z, set = 'wall', seg = 10) => add(set, new THREE.SphereGeometry(r, seg, Math.max(6, seg*0.7|0)), c, x, y, z, 0, 0, 0),
      torus:(r, t, c, x, y, z, rx, ry, set = 'wall') => add(set, new THREE.TorusGeometry(r, t, 8, 20), c, x, y, z, rx, ry, 0),
      build(parent){
        for(const [set, m] of [['wall', wallMat], ['win', winMat], ['glow', glowAll]]){
          if(!parts[set].length) continue;
          const g = mergeGeometries(parts[set]); if(set === 'win') g.deleteAttribute('color');
          const mesh = new THREE.Mesh(g, m); mesh.castShadow = set === 'wall'; mesh.receiveShadow = set !== 'glow'; parent.add(mesh);
        }
      },
    };
  }
  // Door lamps for houses.js designs with no light by the door: [x from the door centre, bulb
  // height]. Studio (marquee), clinic (canopy downlights) and chapel (lanterns) bring their own.
  const DOOR_LAMP = { blueberry:[1.3, 2.2], school:[1.3, 2.2], dock:[0, 2.95] };
  const shade = (c, k, to = '#3a2440') =>'#' + col.set(c).lerp(new THREE.Color(to), k).getHexString();
  let facades = 0;
  for(const hs of kit.houses || []){
    const { zone, g, w, d, h, lx, lz, color, roofColor, windows } = hs;
    const K = kitOf(), fz = lz + d/2;
    if(hs.designed){
      // houses.js already drew this facade (trim, windows, door frame, awnings), so add only a lamp
      // by the door where the design has no light there, and the light pool on the ground.
      const L = DOOR_LAMP[zone.id], y = hs.y || 0;
      if(L){ K.box(0.06, 0.34, 0.06, '#3d3550', lx + L[0], y + L[1] + 0.21, fz + 0.12); K.ball(0.17, '#ffe2a8', lx + L[0], y + L[1], fz + 0.18, 'glow', 8); }
      doors.push({ g, x:lx, z:fz + 1.6 });
      K.build(g); continue;
    }
    const whiteWall = col.set(color).getHSL({}).l > 0.85;
    const trim = whiteWall ? zone.color : '#fff1dc';
    const accent = roofColor || shade(zone.color, 0.25);
    const base = shade(color, 0.32);
    // plinth, corner trim and a band under the eaves
    K.box(w + 0.44, 0.55, d + 0.44, base, lx, 0.275, lz);
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) K.box(0.36, h - 0.5, 0.36, trim, lx + sx*w/2, 0.5 + (h - 0.5)/2, lz + sz*d/2);
    K.box(w + 0.4, 0.3, d + 0.4, trim, lx, h - 0.12, lz);
    // front windows: frame, mullions, shutters and a sill box of flowers
    if(windows) for(const sx of [-w/3, w/3]){
      const x = lx + sx, y = h*0.58;
      K.box(1.44, 1.32, 0.06, trim, x, y, fz + 0.01);
      K.box(0.08, 1.0, 0.05, trim, x, y, fz + 0.095); K.box(1.1, 0.08, 0.05, trim, x, y, fz + 0.095);
      for(const s of [-1, 1]) K.box(0.44, 1.18, 0.07, accent, x + s*0.97, y, fz + 0.04);
      K.box(1.3, 0.26, 0.34, shade('#8a5a3b', 0.1), x, y - 0.66, fz + 0.2);
      for(let i=0; i<4; i++) K.ball(0.13, FLOWER[(i + facades) % FLOWER.length], x - 0.45 + i*0.3, y - 0.46, fz + 0.24, 'wall', 6);
    }
    // side windows, lit
    if(windows && d >= 5) for(const s of [-1, 1]){
      const x = lx + s*(w/2 + 0.02);
      K.box(0.1, 1.0, 1.1, '#ffe7b0', x, h*0.58, lz, 0, 0, 0, 'win');
      K.box(0.06, 1.3, 1.42, trim, x - s*0.02, h*0.58, lz);
      K.box(0.05, 1.0, 0.08, trim, x + s*0.04, h*0.58, lz);
    }
    // door: frame, step, awning and a lamp
    K.box(1.78, 2.5, 0.07, trim, lx, 1.25, fz + 0.005);
    K.box(2.3, 0.16, 0.9, base, lx, 0.08, fz + 0.45);
    K.box(2.4, 0.1, 1.05, accent, lx, 2.72, fz + 0.45, 0.32);
    K.box(0.06, 0.34, 0.06, '#3d3550', lx + 1.12, 2.35, fz + 0.12);
    K.ball(0.14, '#ffe2a8', lx + 1.12, 2.14, fz + 0.16, 'glow', 8);
    doors.push({ g, x:lx, z:fz + 1.6 });
    // a chimney on pitched roofs
    if(roofColor) K.box(0.72, 1.9, 0.72, shade(roofColor, 0.15, '#1f1a2a'), lx + w*0.27, h + 1.2, lz - d*0.14);
    // one prop that says what the house is
    switch(zone.id){
      case 'blueberry': {
        // a round-bottom flask on the roof, glowing violet, with bubbles
        const x = lx - w*0.28, z = lz - d*0.1, y = h + 1.5;
        K.cyl(0.26, 0.26, 1.4, '#dfe8ff', x, y + 1.2, z); K.cyl(0.36, 0.36, 0.14, '#dfe8ff', x, y + 1.95, z);
        K.ball(0.95, '#b99bff', x, y, z, 'glow', 14);
        for(const [bx, by, br] of [[0.1, 2.5, 0.16], [-0.12, 2.9, 0.12], [0.06, 3.25, 0.09]]) K.ball(br, '#f2ecff', x + bx, y + by, z, 'wall', 8);
        // hexagon (benzene) plaques either side of the door
        for(const s of [-1, 1]) K.torus(0.38, 0.07, '#ffffff', lx + s*2.1, 2.2, fz + 0.06, 0, 0);
        break;
      }
      case 'studio': {
        // marquee bulbs round the top of the front wall
        for(let i=0; i<=12; i++) K.ball(0.12, '#ffe7a3', lx - w/2 + 0.4 + i*(w - 0.8)/12, h + 0.12, fz + 0.18, 'glow', 6);
        K.box(w + 0.1, 0.5, 0.2, '#2a2436', lx, h - 0.2, fz + 0.12);
        break;
      }
      case 'dock': {
        K.torus(0.42, 0.11, '#e5484d', lx - w/4, h*0.55, fz + 0.12, 0, 0);
        for(let i=0; i<4; i++) K.box(0.14, 0.23, 0.24, '#ffffff', lx - w/4 + Math.cos(i*Math.PI/2 + 0.78)*0.42, h*0.55 + Math.sin(i*Math.PI/2 + 0.78)*0.42, fz + 0.14);
        for(let i=0; i<5; i++) K.box(w + 0.02, 0.06, d + 0.02, shade(color, 0.18), lx, 0.9 + i*0.55, lz);
        break;
      }
      case 'clinic': {
        // blue and white striped awning
        for(let i=0; i<6; i++) K.box(0.4, 0.1, 1.1, i % 2 ? '#ffffff' : zone.color, lx - 1.0 + i*0.4, 2.76, fz + 0.5, 0.32);
        K.box(0.9, 0.3, 0.08, '#e5484d', lx, h*0.84, fz + 0.06); K.box(0.3, 0.9, 0.08, '#e5484d', lx, h*0.84, fz + 0.06);
        break;
      }
      case 'chapel': {
        // a round rose window in the front wall
        K.cyl(0.62, 0.62, 0.08, '#ffd49a', lx, h*0.8, fz + 0.03, Math.PI/2, 0, 0, 'win', 16);
        K.torus(0.64, 0.08, trim, lx, h*0.8, fz + 0.08, 0, 0);
        for(let i=0; i<4; i++) K.box(0.05, 1.2, 0.04, trim, lx, h*0.8, fz + 0.09, 0, 0, i*Math.PI/4);
        break;
      }
      case 'school': {
        K.torus(0.5, 0.07, '#fff1dc', lx, h*0.84, fz + 0.06, 0, 0);
        K.cyl(0.46, 0.46, 0.05, '#fffaf0', lx, h*0.84, fz + 0.03, Math.PI/2, 0, 0);
        K.box(0.05, 0.36, 0.04, '#1f2a44', lx, h*0.84 + 0.14, fz + 0.08); K.box(0.26, 0.05, 0.04, '#1f2a44', lx + 0.1, h*0.84, fz + 0.08);
        break;
      }
    }
    K.build(g); facades++;
  }

  /* ---------------- light pools ---------------- */
  // A warm additive disc under every lamp and at every door, so the lights visibly light the ground.
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#ffffffaa'); gr.addColorStop(1, '#ffffff00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const pools = lamps.map(l => ({ x:l.x, y:0.19, z:l.z, rx:-Math.PI/2, sx:3.4, sy:3.4, sz:1 }));
  const wp = new THREE.Vector3();
  for(const dr of doors){ dr.g.updateMatrixWorld(true); wp.set(dr.x, 0, dr.z); dr.g.localToWorld(wp); pools.push({ x:wp.x, y:0.2, z:wp.z, rx:-Math.PI/2, sx:3.0, sy:2.4, sz:1, rz:dr.g.rotation.y }); }
  inst(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map:poolTex, color:'#ffab62', transparent:true, opacity:0.5, depthWrite:false,
    blending:THREE.AdditiveBlending, polygonOffset:true, polygonOffsetFactor:-2 }), pools, { shadow:false, receive:false });

  /* ---------------- drifting petals and pollen ---------------- */
  // One Points draw. Each mote lives in a 70 x 12 x 70 m box that wraps round the camera focus, so
  // there are always some near the car and none are ever simulated on the CPU.
  const MOTES = 460;
  const seeds = new Float32Array(MOTES*3), mcol = new Float32Array(MOTES*3);
  const MOTE = ['#ff9fb8', '#ffb06a', '#fff3c4', '#ffd166', '#ffffff', '#f79ac0'];
  for(let i=0; i<MOTES; i++){ seeds.set([rnd(), rnd(), rnd()], i*3); col.set(MOTE[i % MOTE.length]); mcol.set([col.r, col.g, col.b], i*3); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES*3), 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3)); mg.setAttribute('color', new THREE.BufferAttribute(mcol, 3));
  const moteU = { uTime:{ value:0 }, uCenter:{ value:new THREE.Vector3() }, uScale:{ value:900 } };
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({ uniforms:moteU, transparent:true, depthWrite:false, vertexColors:true,
    vertexShader:`
      uniform float uTime, uScale; uniform vec3 uCenter; attribute vec3 aSeed; varying vec3 vC; varying float vA;
      void main(){
        vec3 box = vec3(70.0, 12.0, 70.0);
        vec3 p = aSeed*box + vec3(uTime*0.7, -uTime*(0.18 + aSeed.x*0.25), uTime*0.4);
        p += vec3(sin(uTime*0.7 + aSeed.y*20.0), 0.4*sin(uTime*1.1 + aSeed.z*17.0), cos(uTime*0.6 + aSeed.x*13.0))*0.9;
        vec3 q = mod(p - uCenter + box*0.5, box) - box*0.5;
        vec3 w = vec3(uCenter.x + q.x, mod(p.y, 12.0) + 0.3, uCenter.z + q.z);
        vA = (1.0 - smoothstep(24.0, 35.0, max(abs(q.x), abs(q.z))))*smoothstep(0.3, 1.2, w.y);
        vC = color;
        vec4 mv = viewMatrix*vec4(w, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uScale*(0.11 + aSeed.y*0.09)/max(1.0, -mv.z);
      }`,
    fragmentShader:`
      varying vec3 vC; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float a = 1.0 - smoothstep(0.28, 0.5, abs(d.x) + abs(d.y)*1.4);
        if(a < 0.02) discard;
        gl_FragColor = vec4(vC, a*vA*0.9);
        #include <colorspace_fragment>
      }` }));
  motes.frustumCulled = false; motes.renderOrder = 5; scene.add(motes);
  const moteScale = () => { moteU.uScale.value = innerHeight*ctx.renderer.getPixelRatio()/(2*Math.tan(ctx.camera.fov*Math.PI/360)); };
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    moteScale(); moteU.uCenter.value.copy(state.focus);
    if(!state.reduced) moteU.uTime.value = t;
    motes.visible = !state.reduced;
  }, 94);

  /* ---------------- start screen: the lit world as a diorama ---------------- */
  const cam = ctx.camera;
  // The shot: yaw and pitch around the look point, distance, lens, and the look point's offset
  // from the car. Exposed as __island.art.shot so a critic can re-frame it live.
  const SHOT = { yaw:0.62, pitch:0.68, dist:44, fov:30, dx:-2, dz:-6, drift:0.24 };
  const dio = { pos:new THREE.Vector3(), quat:new THREE.Quaternion(), fov:SHOT.fov };
  const look = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  let blend = -1;
  function diorama(t){
    const P = state.player, sway = state.reduced ? 0 : Math.sin(t*0.13)*SHOT.drift;
    const yaw = SHOT.yaw + sway, pitch = SHOT.pitch, dist = SHOT.dist;
    dio.fov = SHOT.fov;
    look.set(P.x + SHOT.dx, 0.9, P.z + SHOT.dz);
    dio.pos.set(look.x + Math.sin(yaw)*Math.cos(pitch)*dist, look.y + Math.sin(pitch)*dist, look.z + Math.cos(yaw)*Math.cos(pitch)*dist);
    cam.position.copy(dio.pos); cam.lookAt(look); dio.quat.copy(cam.quaternion);
    if(cam.fov !== dio.fov){ cam.fov = dio.fov; cam.updateProjectionMatrix(); }
  }
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    if(!state.started){ diorama(t); return; }
    if(blend < 0 || blend >= 1) return;
    blend = Math.min(1, blend + dt/1.7);
    const k = state.reduced ? 1 : blend*blend*(3 - 2*blend);
    tmpQ.copy(cam.quaternion);
    cam.position.lerpVectors(dio.pos, cam.position, k);
    cam.quaternion.slerpQuaternions(dio.quat, tmpQ, k);
    const fov = dio.fov + (cam.fov - dio.fov)*k; if(Math.abs(fov - cam.fov) > 0.01){ cam.fov = fov; cam.updateProjectionMatrix(); }
  }, 93);
  bus.on('started', () => { blend = 0; });
  bus.once('ready', () => document.body.classList.add('world-ready'));

  const stats = { tallGrass:tall.length, clumps:centres.length, flowers:flowers.length, lamps:lamps.length, carpet:carpet.length, facades, pools:pools.length, motes:MOTES };
  try {
    ctx.expose('art', {
      stats: () => ({ ...stats }),
      shot: SHOT,
      post: (o) => scene.userData.post?.set ? scene.userData.post.set(o) : null,
    });
  } catch(e){ console.warn('[art] expose failed', e); }
  return stats;
}
