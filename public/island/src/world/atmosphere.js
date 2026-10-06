// Atmosphere: day and night, seasons, glow, and life in the water. Owned by the atmosphere builder.
//
//  - night: L toggles it (or setNight). A 2 s cross-fade of the sky dome (renderer.js), lights,
//    fog, water colours and the grade. Paper lanterns strung across the roads, round the plaza and
//    along the pier light up with warm pools faked by additive ground decals; every lit window and
//    lamp gets brighter and blooms; fireflies drift over the grass; mushrooms in the woods glow
//  - seasons: setSeason tints the ground and grass, adds falling petals, leaves or snow, frosts the
//    lake edges in winter, and emits bus 'atmosphere' so trees.js recolours its crowns
//  - water life: fish schools that dart (and scatter from the player), leaping fish with splash
//    rings, a mother duck with ducklings in two lakes, and a turtle in the south-east lake
// Everything is instanced or merged: about a dozen extra draws by day. Choices persist in
// localStorage. No calls to the shared rng(): this file has its own seeded stream.
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const STORE = 'island.atmosphere';
const WATER_Y = -0.28;

export function init(ctx){
  const { THREE, scene, bus, state } = ctx;
  const sky = scene.userData.sky, post = scene.userData.post;
  const before = new Set(scene.children);   // so a critic can hide everything this file added
  const Lay = ctx.modules.map?.layout || null;
  let seed = 5150917;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const pick = list => list[Math.floor(rnd()*list.length)];
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => x*x*(3 - 2*x);

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch(e){ saved = {}; }
  let night = !!saved.night;
  let season = SEASONS.includes(saved.season) ? saved.season : 'summer';
  let raw = night ? 1 : 0;                // night progress 0..1, linear over 2 s
  let nk = raw;                           // the eased blend every part reads
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ night, season })); } catch(e){ /* private mode */ } };

  // Each part builds inside its own try, and its per-frame hook is switched off if it ever throws,
  // so one broken part never takes the rest of the atmosphere (or the page) with it.
  const parts = [];
  function part(name, build){
    try { const p = build(); if(p) parts.push(Object.assign({ name }, p)); }
    catch(e){ console.error(`[atmosphere] ${name} failed to build; skipping it`, e); }
  }
  const run = (method, ...a) => {
    for(const p of parts){ if(!p[method] || p.dead) continue; try { p[method](...a); } catch(e){ p.dead = true; console.error(`[atmosphere] ${p.name}.${method} threw; disabled`, e); } }
  };

  // Shared bits: a soft radial texture (pools, halos) and a ring texture (splashes).
  const radial = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#ffffff99'); gr.addColorStop(1, '#ffffff00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
  const time = { value:0 };
  const nightU = { value:nk };
  const col = new THREE.Color(), o3 = new THREE.Object3D();

  // Is (x, z) clear of every static collider by margin m? Box colliders are tested in both
  // rotation senses, so the check is conservative whichever way core measures `ang`.
  function clearOf(x, z, m){
    for(const c of ctx.colliders){
      if(c.kind === 'circle'){ if(Math.hypot(x - c.x, z - c.z) < c.r + m) return false; continue; }
      const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.ang || 0), sn = Math.sin(c.ang || 0);
      for(const s of [1, -1]){ const lx = dx*cs - s*dz*sn, lz = s*dx*sn + dz*cs; if(Math.abs(lx) < c.hw + m && Math.abs(lz) < c.hd + m) return false; }
    }
    return true;
  }
  const nearZone = (x, z, r) => ctx.zones.some(zn => Math.hypot(x - zn.x, z - zn.z) < r);
  const dry = (x, z, m = 1.5) => !Lay || (Lay.landAt(x, z) && Lay.dLandAt(x, z) > m);
  // A material that glows: opaque, but written with a replace blend so its alpha reaches the scene
  // target, where renderer.js blooms 1 - alpha. Opacity 1 means "no glow".
  const glowTag = m => Object.assign(m, { blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor });

  /* ================================================================== */
  /* Lights, sky, fog, water, grade                                      */
  /* ================================================================== */
  part('sky', () => {
    const hemi = sky?.hemi, sun = ctx.sun;
    const DAY = { sun:new THREE.Color('#ffcf98'), sunI:2.75, hs:new THREE.Color(hemi ? hemi.color : '#a9c0ff'), hg:new THREE.Color(hemi ? hemi.groundColor : '#e0a27a'), hI:hemi ? hemi.intensity : 1,
      fog:new THREE.Color(scene.fog ? scene.fog.color : '#ffe2bf'), near:scene.fog?.near ?? 150, far:scene.fog?.far ?? 360, bloom:post?.strength ?? 0.9 };
    const NIGHT = { sun:new THREE.Color('#8fa6ff'), sunI:1.05, hs:new THREE.Color('#6770e6'), hg:new THREE.Color('#40317a'), hI:1.05,
      fog:new THREE.Color('#29286e'), near:110, far:320, bloom:1.55 };
    // Water: glowing saturated blue by night (Bruno's night water), icy edges in winter.
    let water = null; scene.traverse(o => { if(!water && o.material?.uniforms?.uSdf) water = o.material; });
    const W = water && ['uShallow', 'uMid', 'uDeep', 'uAbyss', 'uFoam'].map(k => ({ u:water.uniforms[k].value, day:water.uniforms[k].value.clone() }));
    const WN = ['#3fe4ff', '#2f86ff', '#2446d6', '#141c6e', '#d6f6ff'].map(c => new THREE.Color(c));
    const WW = ['#d8f4f6', '#6fc3d2', '#2a78a4', '#1c3f72', '#ffffff'].map(c => new THREE.Color(c));   // winter
    let wk = season === 'winter' ? 1 : 0;
    return {
      update(dt, t){
        if(sky){ sky.uniforms.uNight.value = nk; sky.uniforms.uTime.value = t; }
        if(sun){ sun.color.copy(DAY.sun).lerp(NIGHT.sun, nk); sun.intensity = DAY.sunI + (NIGHT.sunI - DAY.sunI)*nk; }
        if(hemi){ hemi.color.copy(DAY.hs).lerp(NIGHT.hs, nk); hemi.groundColor.copy(DAY.hg).lerp(NIGHT.hg, nk); hemi.intensity = DAY.hI + (NIGHT.hI - DAY.hI)*nk; }
        if(scene.fog && scene.fog.near < 1000){   // map.js's overview pushes the fog out; leave that alone
          scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, nk); scene.fog.near = DAY.near + (NIGHT.near - DAY.near)*nk; scene.fog.far = DAY.far + (NIGHT.far - DAY.far)*nk;
        }
        if(scene.background?.isColor) scene.background.copy(DAY.fog).lerp(NIGHT.fog, nk);
        if(post?.set){ post.strength = DAY.bloom + (NIGHT.bloom - DAY.bloom)*nk; post.set({ night:nk }); }
        if(W){
          wk += ((season === 'winter' ? 1 : 0) - wk)*Math.min(1, dt*1.5);
          W.forEach((w, i) => { w.u.copy(w.day).lerp(WW[i], wk*(i < 2 || i === 4 ? 0.85 : 0.35)).lerp(WN[i], nk*0.9); });
        }
      },
    };
  });

  /* Emissive things already in the world (windows, lamp bulbs, signs lit by emissive): collected
     once every module has built, then brightened and bloomed by night. */
  part('glow', () => {
    let list = null;
    function collect(){
      list = [];
      const seen = new Set();
      scene.traverse(o => {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for(const m of ms){
          if(!m || seen.has(m) || m.userData.atmo) continue; seen.add(m);
          if(m.emissive && m.emissiveIntensity > 0 && m.emissive.getHSL({}).l > 0.2 && !m.transparent){
            // Replace blend so the glow can reach the bloom. Identical by day (opacity stays 1).
            if(m.blending === THREE.NormalBlending){ glowTag(m); m.needsUpdate = true; }
            if(m.blending === THREE.CustomBlending && m.blendDst === THREE.ZeroFactor) list.push({ m, kind:'emit', i:m.emissiveIntensity, a:m.opacity });
          } else if(m.blending === THREE.AdditiveBlending && m.map && m.transparent){
            list.push({ m, kind:'pool', a:m.opacity });   // art.js's light pools under the lamps
          }
        }
      });
    }
    bus.once('ready', () => { try { collect(); } catch(e){ console.error('[atmosphere] glow collect failed', e); list = []; } });
    let last = -1;
    return {
      update(){
        if(!list || Math.abs(nk - last) < 1e-3) return; last = nk;
        for(const g of list){
          if(g.kind === 'emit'){ g.m.emissiveIntensity = g.i*(1 + 1.4*nk); g.m.opacity = g.a*(1 - 0.45*nk); }
          else g.m.opacity = Math.min(1, g.a*(1 + 1.1*nk));
        }
      },
      count: () => list ? list.length : 0,
    };
  });

  /* ================================================================== */
  /* Lanterns: strung across the spoke roads, round the plaza, on the pier */
  /* ================================================================== */
  part('lanterns', () => {
    const poles = [], spans = [];
    const POLE_H = 4.3;
    const okPole = (x, z) => dry(x, z, 1.4) && clearOf(x, z, 0.9) && poles.every(p => Math.hypot(p.x - x, p.z - z) > 4);
    const addPole = (x, z, y0 = 0, h = POLE_H) => { const p = { x, z, y0, top:y0 + h }; poles.push(p); return p; };
    const span = (a, b, sag, n) => spans.push({ a, b, sag, n });
    if(Lay){
      // Festival streets: every ~22 m along the inner spokes and the lake loop, a pole each side and
      // a string of lanterns across the road, plus a string along the verge to the previous pole.
      Lay.roads.forEach((road, ri) => {
        if(road.name === 'outer') return;   // the race owns the ring road
        const pts = road.pts; let prev = null;
        for(let k = 16; k < pts.length - 16; k += 44){
          const p = pts[k];
          if(Lay.onBridge(ri, k) || Math.hypot(p.x, p.z) < 17 || nearZone(p.x, p.z, 15)) { prev = null; continue; }
          // widen until both sides clear this road and any road crossing here
          const side = s => { for(const d of [5.5, 6.1, 6.8]){ const x = p.x - p.tz*s*d, z = p.z + p.tx*s*d; if(Lay.roadDistAt(x, z) > 4.9 && okPole(x, z)) return [x, z]; } return null; };
          const L = side(1), R = side(-1);
          if(!L || !R){ prev = null; continue; }
          const a = addPole(L[0], L[1]), b = addPole(R[0], R[1]);
          span(a, b, 0.85, 5);
          if(prev && Math.hypot(prev[0].x - a.x, prev[0].z - a.z) < 30) span(prev[0], a, 1.1, 5);
          prev = [a, b];
        }
      });
    }
    // The plaza: a ring of poles, strung pole to pole.
    const ring = [];
    for(let i = 0; i < 16 && ring.length < 7; i++){
      const a = i/16*Math.PI*2 + 0.2, x = Math.cos(a)*14.2, z = Math.sin(a)*14.2;
      if((!Lay || Lay.roadDistAt(x, z) > 4.8) && okPole(x, z) && ring.every(p => Math.hypot(p.x - x, p.z - z) > 8)) ring.push(addPole(x, z, 0, 4.6));
    }
    ring.sort((p, q) => Math.atan2(p.z, p.x) - Math.atan2(q.z, q.x));
    ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length]; if(ring.length > 2 && Math.hypot(p.x - q.x, p.z - q.z) < 22) span(p, q, 1.3, 6); });
    // The pier at the dock: posts down both edges, strung along each side and across the end.
    const dock = ctx.zones.find(z => z.id === 'dock');
    if(dock){
      const f = ctx.helpers.frameOf(dock), deck = 0.23, side = [[], []];
      for(const lz of [-6.6, -11.8, -17]) [-6.35, -3.65].forEach((lx, s) => { const [x, z] = f.w(lx, lz); side[s].push(addPole(x, z, deck, 2.5)); });
      for(const s of side) for(let i = 1; i < s.length; i++) span(s[i - 1], s[i], 0.45, 3);
      span(side[0][2], side[1][2], 0.35, 2);
    }

    // Poles: one instanced mesh, no shadows (they are thin; shadows would cost a second pass).
    const poleMat = new THREE.MeshStandardMaterial({ color:'#5b4032', roughness:.8 });
    const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.1, 1, 6).translate(0, 0.5, 0), poleMat, poles.length);
    poles.forEach((p, i) => { o3.position.set(p.x, p.y0, p.z); o3.rotation.set(0, 0, 0); o3.scale.set(1, p.top - p.y0 + 0.15, 1); o3.updateMatrix(); poleMesh.setMatrixAt(i, o3.matrix); });
    poleMesh.computeBoundingSphere(); scene.add(poleMesh);

    // Strings: sagging curves, all in one LineSegments. Lanterns hang at evenly spaced points.
    const seg = [], hangs = [];
    for(const s of spans){
      const at = u => [s.a.x + (s.b.x - s.a.x)*u, s.a.top + (s.b.top - s.a.top)*u - s.sag*4*u*(1 - u), s.a.z + (s.b.z - s.a.z)*u];
      for(let i = 0; i < 10; i++) seg.push(...at(i/10), ...at((i + 1)/10));
      for(let i = 1; i <= s.n; i++) hangs.push(at(i/(s.n + 1)));
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color:'#3b2c3a' })); scene.add(lines);

    // Lantern: paper body, dark caps, a short cord. Origin at the hang point so it swings from there.
    const body = new THREE.SphereGeometry(0.27, 12, 9); body.scale(1, 1.15, 1); body.translate(0, -0.5, 0);
    const capT = new THREE.CylinderGeometry(0.13, 0.16, 0.07, 10).translate(0, -0.18, 0), capB = new THREE.CylinderGeometry(0.16, 0.12, 0.07, 10).translate(0, -0.82, 0);
    const cord = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4).translate(0, -0.08, 0);
    const paint = (g, c) => { g = g.toNonIndexed(); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n*3); for(let i = 0; i < n; i++) a.set(c, i*3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const geo = mergeLocal([paint(body, [1, 1, 1]), paint(capT, [0.16, 0.12, 0.14]), paint(capB, [0.16, 0.12, 0.14]), paint(cord, [0.1, 0.08, 0.1])]);
    const lmat = glowTag(new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.7 }));
    lmat.userData.atmo = true;
    lmat.onBeforeCompile = sh => {
      sh.uniforms.uTime = time; sh.uniforms.uNight = nightU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
          float ph = ip.x*0.37 + ip.y*0.21;
          float sw = sin(uTime*1.3 + ph)*0.13 + sin(uTime*2.3 + ph*1.7)*0.05;
          float sw2 = sin(uTime*1.1 + ph*0.6)*0.08;
          // swing like a pendulum about the hang point (the local origin)
          transformed.xy = vec2(cos(sw)*transformed.x - sin(sw)*transformed.y, sin(sw)*transformed.x + cos(sw)*transformed.y);
          transformed.zy = vec2(cos(sw2)*transformed.z - sin(sw2)*transformed.y, sin(sw2)*transformed.z + cos(sw2)*transformed.y);`);
      // the paper glows in its own colour: emissive from the (instance x vertex) colour, so caps stay dark
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float paper = smoothstep(0.3, 0.6, max(vColor.r, max(vColor.g, vColor.b)));
          totalEmissiveRadiance += diffuseColor.rgb*paper*(0.12 + 1.6*uNight);`);
    };
    lmat.customProgramCacheKey = () => 'atmo-lantern';
    const PAPER = ['#ff5a4e', '#ff8a3d', '#ffc857', '#ff7eb6', '#ff6f5e', '#ffb04a'];
    const lan = new THREE.InstancedMesh(geo, lmat, hangs.length);
    hangs.forEach((h, i) => { o3.position.set(h[0], h[1], h[2]); o3.rotation.set(0, rnd()*6, 0); const s = 0.85 + rnd()*0.3; o3.scale.set(s, s, s); o3.updateMatrix(); lan.setMatrixAt(i, o3.matrix); lan.setColorAt(i, col.set(pick(PAPER))); });
    lan.computeBoundingSphere(); scene.add(lan);

    // Warm pools on the ground under every string, only drawn by night.
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({ map:radial, color:'#ff9c45', transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, polygonOffset:true, polygonOffsetFactor:-3, fog:false }), spans.length);
    spans.forEach((s, i) => {
      const L = Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z);
      o3.position.set((s.a.x + s.b.x)/2, Math.max(s.a.y0, s.b.y0) + 0.24, (s.a.z + s.b.z)/2); o3.rotation.set(0, -Math.atan2(s.b.z - s.a.z, s.b.x - s.a.x), 0);
      o3.scale.set(L + 3, 1, 6.5); o3.updateMatrix(); pools.setMatrixAt(i, o3.matrix);
    });
    pools.computeBoundingSphere(); pools.renderOrder = 2; pools.visible = false; scene.add(pools);
    return {
      update(){ lmat.opacity = 1 - 0.7*nk; pools.visible = nk > 0.01; pools.material.opacity = 0.62*nk; },
      stats: () => ({ poles:poles.length, spans:spans.length, lanterns:hangs.length }),
    };
  });

  /* Glowing mushrooms in the woods, a few clusters in sight of the roads. */
  part('mushrooms', () => {
    if(!Lay) return null;
    const items = [];
    for(let i = 0; i < 9000 && items.length < 150; i++){
      const x = (rnd()*2 - 1)*150, z = (rnd()*2 - 1)*150, rd = Lay.roadDistAt(x, z);
      if(rd < 7 || rd > 16 || !dry(x, z, 3) || nearZone(x, z, 16) || x*x + z*z < 400 || !clearOf(x, z, 0.8)) continue;
      const hue = pick(['#5ef2ff', '#7df9c8', '#b78cff', '#ff8fd8']), n = 3 + Math.floor(rnd()*4);
      for(let k = 0; k < n; k++){
        const px = x + (rnd() - 0.5)*1.6, pz = z + (rnd() - 0.5)*1.6; if(!clearOf(px, pz, 0.4)) continue;
        items.push({ x:px, z:pz, s:0.55 + rnd()*0.7, c:hue });
      }
    }
    const stemG = new THREE.CylinderGeometry(0.05, 0.07, 0.34, 6).translate(0, 0.17, 0);
    const capG = new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI*2, 0, Math.PI/2).scale(1, 0.8, 1).translate(0, 0.3, 0);
    const stem = new THREE.InstancedMesh(stemG, new THREE.MeshStandardMaterial({ color:'#f3ead8', roughness:.8 }), items.length);
    const cmat = glowTag(new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.5, emissive:'#ffffff', emissiveIntensity:0 }));
    cmat.userData.atmo = true;
    // emissive in the cap's own colour: the instance colour feeds diffuse, so tint the emissive with it
    cmat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;'); };
    cmat.customProgramCacheKey = () => 'atmo-cap';
    const cap = new THREE.InstancedMesh(capG, cmat, items.length);
    items.forEach((m, i) => { o3.position.set(m.x, 0, m.z); o3.rotation.set((rnd() - 0.5)*0.3, rnd()*6, (rnd() - 0.5)*0.3); o3.scale.setScalar(m.s); o3.updateMatrix(); stem.setMatrixAt(i, o3.matrix); cap.setMatrixAt(i, o3.matrix); cap.setColorAt(i, col.set(m.c)); });
    stem.computeBoundingSphere(); cap.computeBoundingSphere(); scene.add(stem, cap);
    return { update(){ cmat.emissiveIntensity = 0.15 + 2.2*nk; cmat.opacity = 1 - 0.65*nk; }, stats: () => ({ mushrooms:items.length }) };
  });

  /* ================================================================== */
  /* Particles: fireflies by night, petals / leaves / snow by season    */
  /* ================================================================== */
  // One Points draw each. Every point lives in a box that wraps round the camera focus, so there
  // are always some near the player and none are simulated on the CPU.
  function pointCloud(n, vertex, fragment, uniforms, blending){
    const g = new THREE.BufferGeometry(), sd = new Float32Array(n*3);
    for(let i = 0; i < n*3; i++) sd[i] = rnd();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n*3), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3));
    const u = Object.assign({ uTime:time, uCenter:{ value:new THREE.Vector3() }, uScale:{ value:900 } }, uniforms);
    const m = new THREE.ShaderMaterial({ uniforms:u, transparent:true, depthWrite:false, blending, vertexShader:vertex,
      fragmentShader:fragment.replace('#END', '#include <colorspace_fragment>') });
    m.userData.atmo = true;
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 6; p.visible = false; scene.add(p);
    return { p, u };
  }
  const pointScale = () => innerHeight*ctx.renderer.getPixelRatio()/(2*Math.tan(ctx.camera.fov*Math.PI/360));

  part('fireflies', () => {
    const { p, u } = pointCloud(180, `
      uniform float uTime, uScale; uniform vec3 uCenter; attribute vec3 aSeed; varying float vA;
      void main(){
        vec3 box = vec3(60.0, 1.0, 60.0);
        vec2 drift = vec2(sin(uTime*0.4 + aSeed.x*30.0), cos(uTime*0.33 + aSeed.z*25.0))*2.2 + vec2(sin(uTime*1.7 + aSeed.y*9.0), cos(uTime*1.3 + aSeed.x*7.0))*0.35;
        vec2 q = mod(aSeed.xz*box.xz + drift - uCenter.xz + box.xz*0.5, box.xz) - box.xz*0.5;
        vec3 w = vec3(uCenter.x + q.x, 0.5 + aSeed.y*2.0 + 0.3*sin(uTime*0.9 + aSeed.z*12.0), uCenter.z + q.y);
        float blink = smoothstep(0.35, 1.0, sin(uTime*(1.1 + aSeed.y) + aSeed.x*40.0));
        vA = blink*(1.0 - smoothstep(20.0, 29.0, max(abs(q.x), abs(q.y))));
        vec4 mv = viewMatrix*vec4(w, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uScale*0.26/max(1.0, -mv.z);
      }`, `
      uniform float uNight; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.0, 0.5, d))*vA*uNight;
        float core = 1.0 - smoothstep(0.0, 0.14, d);
        gl_FragColor = vec4(mix(vec3(0.75, 1.0, 0.3), vec3(1.0, 1.0, 0.85), core), a);
        #END
      }`, { uNight:nightU }, THREE.AdditiveBlending);
    return { update(){ p.visible = nk > 0.02 && !state.reduced; u.uCenter.value.copy(state.focus); u.uScale.value = pointScale(); } };
  });

  // Falling season: petals (spring), tumbling leaves (autumn), snow (winter). Nothing in summer.
  const FALL = {
    spring:{ n:0.45, fall:0.5, size:0.22, kind:0, c:['#ffb3c7', '#ff8fb1', '#ffe0ea'] },
    autumn:{ n:0.6, fall:0.8, size:0.34, kind:1, c:['#e8662e', '#f2a13a', '#c2412d'] },
    winter:{ n:1.0, fall:1.4, size:0.2, kind:2, c:['#ffffff', '#f2f6ff', '#e6eeff'] },
  };
  let fallPart = null;
  part('fall', () => {
    const { p, u } = pointCloud(900, `
      uniform float uTime, uScale, uFall, uSize, uN; uniform vec3 uCenter; attribute vec3 aSeed; varying float vA; varying float vR; varying float vK;
      void main(){
        vec3 box = vec3(70.0, 16.0, 70.0);
        float t = uTime;
        vec3 p = aSeed*box + vec3(t*0.6, -t*uFall*(0.7 + aSeed.x*0.6), t*0.3);
        p += vec3(sin(t*0.8 + aSeed.y*20.0), 0.0, cos(t*0.7 + aSeed.x*13.0))*1.2;
        vec3 q = mod(p - uCenter + box*0.5, box) - box*0.5;
        vec3 w = vec3(uCenter.x + q.x, mod(p.y, 16.0) + 0.1, uCenter.z + q.z);
        vA = step(aSeed.z, uN)*(1.0 - smoothstep(26.0, 35.0, max(abs(q.x), abs(q.z))))*smoothstep(0.1, 0.8, w.y);
        vR = t*(1.5 + aSeed.y*2.5) + aSeed.x*6.28; vK = aSeed.y;
        vec4 mv = viewMatrix*vec4(w, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uScale*uSize*(0.7 + aSeed.y*0.6)/max(1.0, -mv.z);
      }`, `
      uniform float uKind, uNight; uniform vec3 uC0, uC1, uC2; varying float vA; varying float vR; varying float vK;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float a;
        if(uKind > 1.5){ a = 1.0 - smoothstep(0.25, 0.5, length(d)); }
        else {
          // a petal or leaf: a rotated almond that tumbles (squashes) as it falls
          float c = cos(vR), s = sin(vR); d = vec2(c*d.x - s*d.y, s*d.x + c*d.y);
          d.x /= 0.35 + 0.65*abs(sin(vR*0.7));
          a = 1.0 - smoothstep(0.28, 0.42, abs(d.x)*1.6 + abs(d.y)*(uKind > 0.5 ? 1.1 : 1.4));
        }
        if(a*vA < 0.02) discard;
        vec3 c = vK < 0.33 ? uC0 : vK < 0.66 ? uC1 : uC2;
        c *= mix(1.0, 0.55, uNight);
        gl_FragColor = vec4(c, a*vA*0.95);
        #END
      }`, { uFall:{ value:1 }, uSize:{ value:0.2 }, uN:{ value:0 }, uKind:{ value:0 }, uNight:nightU,
      uC0:{ value:new THREE.Color() }, uC1:{ value:new THREE.Color() }, uC2:{ value:new THREE.Color() } }, THREE.NormalBlending);
    fallPart = { apply(name){
      const f = FALL[name]; p.visible = !!f && !state.reduced; if(!f) return;
      u.uFall.value = f.fall; u.uSize.value = f.size; u.uN.value = f.n; u.uKind.value = f.kind;
      u.uC0.value.set(f.c[0]); u.uC1.value.set(f.c[1]); u.uC2.value.set(f.c[2]);
    } };
    fallPart.apply(season);
    return { update(){ u.uCenter.value.copy(state.focus); u.uScale.value = pointScale(); if(state.reduced) p.visible = false; } };
  });

  /* Season tints on the ground and the grass: colour multiplies, emissive adds (for snow cover,
     since a multiply can only darken). Lerped so a season change washes over in about a second. */
  part('seasonTint', () => {
    let ground = null; const grass = [];
    scene.traverse(o => {
      const m = o.material; if(!m || Array.isArray(m) || !m.isMeshStandardMaterial) return;
      if(!ground && o.geometry?.type === 'PlaneGeometry' && m.vertexColors && (o.geometry.parameters?.width || 0) > 300) ground = m;
      else if(String(m.customProgramCacheKey?.() || '').startsWith('sway') && !grass.includes(m)) grass.push(m);
    });
    const T = {   // [ground colour, ground emissive, grass colour, grass emissive]
      spring:['#f4fff0', '#000000', '#f0fff0', '#0a0a00'],
      summer:['#ffffff', '#000000', '#ffffff', '#000000'],
      autumn:['#ffd79a', '#140400', '#ffc07a', '#1a0800'],
      winter:['#7c8494', '#b4bfd2', '#8a93a3', '#b8c4d8'],
    };
    const cur = [new THREE.Color(1, 1, 1), new THREE.Color(0, 0, 0), new THREE.Color(1, 1, 1), new THREE.Color(0, 0, 0)];
    const tgt = cur.map(c => c.clone()), tmp = new THREE.Color();
    const setTarget = name => T[name].forEach((c, i) => tgt[i].set(c));
    setTarget(season); cur.forEach((c, i) => c.copy(tgt[i]));
    const baseG = ground && ground.color.clone(), baseT = grass.map(m => m.color.clone());
    return {
      season: setTarget,
      update(dt){
        const k = Math.min(1, dt*2.5); cur.forEach((c, i) => c.lerp(tgt[i], k));
        const lit = 1 - 0.72*nk;   // snow cover is lit by the sky, so it dims at night
        if(ground){ ground.color.copy(baseG).multiply(cur[0]); ground.emissive.copy(cur[1]).multiplyScalar(lit); }
        grass.forEach((m, i) => { m.color.copy(baseT[i]).multiply(cur[2]); if(m.emissive) m.emissive.copy(tmp.copy(cur[3]).multiplyScalar(lit)); });
      },
      stats: () => ({ ground:!!ground, grass:grass.length }),
    };
  });

  /* ================================================================== */
  /* Water life                                                          */
  /* ================================================================== */
  const wet = (x, z, m = 1) => Lay ? !Lay.landAt(x, z) && Lay.dWaterAt(x, z) > m : false;
  const splashes = [];   // queued by fish and ducks, drawn by 'splash'
  const splash = (x, z, s = 1) => { if(splashes.length < 24) splashes.push({ x, z, s, t:0 }); };

  // Fish schools: dark shapes just under the surface. Each school swims a loop in a lake or runs up
  // and down a river, darts every few seconds, and bolts away when the player comes near.
  const schools = [];
  part('fish', () => {
    if(!Lay) return null;
    for(const L of Lay.lakes){
      for(let n = 0; n < (L.name === 'central' ? 2 : 1); n++){
        const R = L.parts[0][2]*(0.35 + n*0.2);
        schools.push({ lake:L, cx:L.c[0], cz:L.c[1], R, a:rnd()*6.28, dir:n ? -1 : 1, speed:1.3 });
      }
    }
    for(const rv of Lay.rivers){
      if(!rv.pts?.length) continue;
      const pts = rv.pts.filter(p => wet(p.x, p.z, 3) && Math.hypot(p.x, p.z) < Lay.coast(Math.atan2(p.z, p.x)) - 10);
      if(pts.length > 40) schools.push({ river:pts, u:rnd()*pts.length, dir:1, speed:1.5 });
    }
    const PER = 8, fish = [];
    for(const s of schools){
      s.x = 0; s.z = 0; s.h = 0; s.dart = 0; s.next = 1 + rnd()*3;
      for(let i = 0; i < PER; i++) fish.push({ s, ox:(rnd() - 0.5)*2.6, oz:(rnd() - 0.5)*1.8, ph:rnd()*6.28, sz:0.7 + rnd()*0.5, x:0, z:0, h:0 });
    }
    const shape = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(58, 24, 44, 15, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(100, 24); g.lineTo(126, 8); g.lineTo(122, 24); g.lineTo(126, 40); g.closePath(); g.fill();
      const t = new THREE.CanvasTexture(c); return t; })();
    const mat = new THREE.MeshBasicMaterial({ map:shape, color:'#0c3550', transparent:true, opacity:0.5, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, fog:false });
    mat.userData.atmo = true;
    // plane: nose toward -x in the texture, so rotate so the nose points along +z (heading 0)
    const g = new THREE.PlaneGeometry(0.95, 0.36).rotateX(-Math.PI/2).rotateY(Math.PI/2);
    const mesh = new THREE.InstancedMesh(g, mat, fish.length); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
    const place = s => {
      if(s.lake){ let R = s.R; for(let k = 0; k < 4; k++){ const x = s.cx + Math.cos(s.a)*R, z = s.cz + Math.sin(s.a)*R; if(wet(x, z, 2) || k === 3){ s.x = x; s.z = z; break; } R *= 0.7; }
        s.h = Math.atan2(-Math.sin(s.a)*s.dir, Math.cos(s.a)*s.dir); }
      else { const pts = s.river, i = Math.max(0, Math.min(pts.length - 1, Math.floor(s.u))), p = pts[i]; s.x = p.x; s.z = p.z; s.h = Math.atan2(p.tx*s.dir, p.tz*s.dir); }
    };
    return {
      update(dt, t){
        const P = state.player;
        for(const s of schools){
          s.next -= dt;
          if(s.next < 0){ s.dart = 0.45; s.next = 2 + rnd()*4; if(rnd() < 0.3) s.dir = -s.dir; }
          const near = Math.hypot(P.x - s.x, P.z - s.z) < 7;
          if(near && s.dart <= 0){ s.dart = 0.8; s.next = 3; s.dir = -s.dir; }
          const sp = s.speed*(s.dart > 0 ? 4.5 : 1); s.dart -= dt;
          if(s.lake) s.a += s.dir*sp*dt/s.R;
          else { s.u += s.dir*sp*dt/0.5; if(s.u < 0 || s.u > s.river.length - 1){ s.dir = -s.dir; s.u = Math.max(0, Math.min(s.river.length - 1, s.u)); } }
          place(s);
        }
        fish.forEach((f, i) => {
          const s = f.s, cs = Math.cos(s.h), sn = Math.sin(s.h), tight = s.dart > 0 ? 0.6 : 1;
          const lx = (f.ox + Math.sin(t*1.3 + f.ph)*0.3)*tight, lz = f.oz*tight;
          const x = s.x + lx*cs + lz*sn, z = s.z - lx*sn + lz*cs;
          const ok = wet(x, z, 0.6);
          f.x = x; f.z = z; f.h = s.h + Math.sin(t*(s.dart > 0 ? 18 : 7) + f.ph)*0.18;
          o3.position.set(x, WATER_Y + 0.025, z); o3.rotation.set(0, f.h, 0); o3.scale.setScalar(ok ? f.sz : 0); o3.updateMatrix(); mesh.setMatrixAt(i, o3.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mat.opacity = 0.5 - 0.15*nk;
      },
      stats: () => ({ schools:schools.length, fish:fish.length }),
    };
  });

  // Leaping fish: every few seconds one jumps out of a school near the player, arcs and splashes.
  part('jumpers', () => {
    if(!Lay || !schools.length) return null;
    const bodyG = new THREE.SphereGeometry(0.2, 10, 7).scale(0.7, 0.8, 1.6);
    const tailG = new THREE.ConeGeometry(0.17, 0.3, 4).rotateX(-Math.PI/2).scale(0.3, 1, 1).translate(0, 0, -0.42);
    const eyeL = new THREE.SphereGeometry(0.035, 6, 4).translate(0.1, 0.05, 0.2), eyeR = eyeL.clone().translate(-0.2, 0, 0);
    const vc = (g, c) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n*3); for(let i = 0; i < n; i++) a.set(c, i*3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const geo = mergeLocal([vc(bodyG, [1, 1, 1]), vc(tailG, [0.85, 0.85, 0.85]), vc(eyeL, [0.05, 0.05, 0.08]), vc(eyeR, [0.05, 0.05, 0.08])]);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.4 }), 3);
    mesh.frustumCulled = false; scene.add(mesh);
    const J = [0, 1, 2].map(i => ({ t:-1, wait:1 + i*1.7, c:['#ff8a3d', '#ffcf5a', '#e9eef5'][i] }));
    J.forEach((j, i) => mesh.setColorAt(i, col.set(j.c)));
    return {
      update(dt){
        const F = state.focus;
        J.forEach((j, i) => {
          if(j.t < 0){
            j.wait -= dt;
            o3.scale.setScalar(0); o3.updateMatrix(); mesh.setMatrixAt(i, o3.matrix);
            if(j.wait > 0) return;
            // prefer a school within sight of the camera focus
            const near = schools.filter(s => Math.hypot(s.x - F.x, s.z - F.z) < 45), s = near.length ? pick(near) : pick(schools);
            j.x = s.x + (rnd() - 0.5)*2; j.z = s.z + (rnd() - 0.5)*2; j.h = s.h + (rnd() - 0.5)*1.2; j.len = 1.8 + rnd()*1.6; j.hi = 0.9 + rnd()*0.9; j.dur = 0.75 + rnd()*0.35;
            if(!wet(j.x, j.z, 1.5) || !wet(j.x + Math.sin(j.h)*j.len, j.z + Math.cos(j.h)*j.len, 1)){ j.wait = 0.5; return; }
            j.t = 0; splash(j.x, j.z, 0.8); plop(j.x, j.z, 700);
          }
          j.t += dt/j.dur;
          const u = Math.min(1, j.t), y = WATER_Y + 4*j.hi*u*(1 - u), d = j.len*u;
          const x = j.x + Math.sin(j.h)*d, z = j.z + Math.cos(j.h)*d;
          o3.position.set(x, y, z); o3.rotation.set(0, 0, 0); o3.rotateY(j.h); o3.rotateX(-Math.atan2(4*j.hi*(1 - 2*u), j.len)); o3.scale.setScalar(1); o3.updateMatrix(); mesh.setMatrixAt(i, o3.matrix);
          if(u >= 1){ j.t = -1; j.wait = 1.5 + rnd()*3.5; splash(x, z, 1.1); plop(x, z, 420); }
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
    };
  });
  function plop(x, z, f){
    const F = state.focus; if(Math.hypot(x - F.x, z - F.z) > 28) return;
    try { ctx.sound?.tone?.(f, 0.12, 'sine', 0.035, f*0.45); } catch(e){ /* sound is optional */ }
  }

  // Ducks: a mother and her ducklings in a line in the central lake, a pair in the south-east lake.
  // They paddle between random points, bob, leave little rings, and quack and scatter at a honk.
  part('ducks', () => {
    if(!Lay) return null;
    const vc = (g, c) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n*3); for(let i = 0; i < n; i++) a.set(c, i*3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const W = [1, 1, 1], O = [1, 0.55, 0.15], K = [0.06, 0.05, 0.08];
    const geo = mergeLocal([
      vc(new THREE.SphereGeometry(0.34, 12, 9).scale(0.95, 0.72, 1.3).translate(0, 0.16, 0), W),
      vc(new THREE.ConeGeometry(0.16, 0.32, 6).rotateX(-1.0).translate(0, 0.32, -0.42), W),       // tail flick
      vc(new THREE.SphereGeometry(0.2, 10, 8).translate(0, 0.55, 0.32), W),
      vc(new THREE.BoxGeometry(0.16, 0.06, 0.2).translate(0, 0.52, 0.56), O),
      vc(new THREE.SphereGeometry(0.035, 6, 4).translate(0.14, 0.6, 0.44), K), vc(new THREE.SphereGeometry(0.035, 6, 4).translate(-0.14, 0.6, 0.44), K),
    ]);
    const ducks = [];
    const flock = (L, colours) => {
      const [dx, dz, r] = L.parts[0]; const home = { x:L.c[0] + dx, z:L.c[1] + dz, r:r*0.75 };
      colours.forEach((c, i) => ducks.push({ lead:i ? ducks[ducks.length - 1] : null, home, c, s:i ? 0.5 : 1, x:home.x + i*0.1, z:home.z + i*0.7, h:0, vy:0, y:0, ph:rnd()*6, tx:home.x, tz:home.z, wait:0, fast:0, ring:rnd() }));
    };
    const central = Lay.lakes.find(L => L.name === 'central'), se = Lay.lakes.find(L => L.name === 'southeast');
    if(central) flock(central, ['#ffffff', '#ffe066', '#ffe066', '#ffd84a']);
    if(se) flock(se, ['#fff6e0', '#fff6e0']);
    if(!ducks.length) return null;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, roughness:.6 }), ducks.length);
    mesh.frustumCulled = false; scene.add(mesh);
    ducks.forEach((d, i) => mesh.setColorAt(i, col.set(d.c)));
    const target = d => { for(let k = 0; k < 12; k++){ const a = rnd()*6.28, r = Math.sqrt(rnd())*d.home.r, x = d.home.x + Math.cos(a)*r, z = d.home.z + Math.sin(a)*r; if(wet(x, z, 1.8)){ d.tx = x; d.tz = z; return; } } };
    const offHonk = bus.on('action:honk', () => {
      const P = state.player; let q = false;
      for(const d of ducks){ if(Math.hypot(P.x - d.x, P.z - d.z) < 18){ d.vy = 2.2 + rnd(); d.fast = 1.6; if(!d.lead){ const a = Math.atan2(d.z - P.z, d.x - P.x); d.tx = d.x + Math.cos(a)*6; d.tz = d.z + Math.sin(a)*6; if(!wet(d.tx, d.tz, 1.5)) target(d); } q = true; } }
      if(q){ try { ctx.sound?.tone?.(640, 0.09, 'square', 0.04, 420); setTimeout(() => ctx.sound?.tone?.(600, 0.1, 'square', 0.035, 380), 140); } catch(e){ /* optional */ } }
    });
    void offHonk;
    ducks.forEach(d => { if(!d.lead) target(d); });
    return {
      update(dt, t){
        const P = state.player;
        ducks.forEach((d, i) => {
          let tx, tz, sp;
          if(d.lead){ tx = d.lead.x - Math.sin(d.lead.h)*0.75*d.lead.s - Math.sin(d.lead.h)*0.2; tz = d.lead.z - Math.cos(d.lead.h)*0.75*d.lead.s - Math.cos(d.lead.h)*0.2; sp = 2.2; }
          else {
            tx = d.tx; tz = d.tz; sp = 0.75;
            if(Math.hypot(P.x - d.x, P.z - d.z) < 5 && d.fast <= 0){ d.fast = 1.2; const a = Math.atan2(d.z - P.z, d.x - P.x); d.tx = d.x + Math.cos(a)*5; d.tz = d.z + Math.sin(a)*5; if(!wet(d.tx, d.tz, 1.5)) target(d); }
            if(Math.hypot(tx - d.x, tz - d.z) < 0.6){ d.wait -= dt; if(d.wait <= 0){ target(d); d.wait = 1 + rnd()*3; } }
          }
          if(d.fast > 0){ d.fast -= dt; sp *= 3; }
          const dx = tx - d.x, dz = tz - d.z, L = Math.hypot(dx, dz);
          if(L > 0.05){
            d.h += Math.atan2(Math.sin(Math.atan2(dx, dz) - d.h), Math.cos(Math.atan2(dx, dz) - d.h))*Math.min(1, dt*4);
            const step = Math.min(L, sp*dt), nx = d.x + Math.sin(d.h)*step, nz = d.z + Math.cos(d.h)*step;
            if(wet(nx, nz, 0.9) || !d.lead){ if(wet(nx, nz, 0.9)){ d.x = nx; d.z = nz; } else target(d); }
          }
          d.vy -= 9*dt; d.y = Math.max(0, d.y + d.vy*dt); if(d.y === 0) d.vy = 0;
          d.ring -= dt; if(d.ring < 0 && !d.lead){ splash(d.x, d.z, 0.45); d.ring = 1.4 + rnd(); }
          const bob = Math.sin(t*2.2 + d.ph)*0.03;
          o3.position.set(d.x, WATER_Y - 0.06*d.s + bob + d.y, d.z); o3.rotation.set(Math.sin(t*1.7 + d.ph)*0.06, d.h, Math.sin(t*2.1 + d.ph)*0.05); o3.scale.setScalar(d.s);
          o3.updateMatrix(); mesh.setMatrixAt(i, o3.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
      stats: () => ({ ducks:ducks.length }),
    };
  });

  // A turtle paddling slow laps round the islet in the south-east lake, surfacing and sinking.
  part('turtle', () => {
    const L = Lay?.lakes.find(q => q.name === 'southeast'); if(!L) return null;
    const vc = (g, c) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n*3); for(let i = 0; i < n; i++) a.set(c, i*3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const SH = [0.36, 0.56, 0.24], SK = [0.55, 0.74, 0.38], K = [0.05, 0.05, 0.06];
    const flip = (x, z, ry) => vc(new THREE.BoxGeometry(0.34, 0.06, 0.16).rotateY(ry).translate(x, 0.02, z), SK);
    const geo = mergeLocal([
      vc(new THREE.SphereGeometry(0.55, 12, 7, 0, Math.PI*2, 0, Math.PI/2).scale(1, 0.55, 1.2), SH),
      vc(new THREE.CylinderGeometry(0.58, 0.58, 0.07, 14).scale(1, 1, 1.2), [0.78, 0.7, 0.42]),
      vc(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 0.85, 1.2).translate(0, 0.06, 0.78), SK),
      vc(new THREE.SphereGeometry(0.03, 6, 4).translate(0.09, 0.12, 0.9), K), vc(new THREE.SphereGeometry(0.03, 6, 4).translate(-0.09, 0.12, 0.9), K),
      flip(0.55, 0.4, -0.5), flip(-0.55, 0.4, 0.5), flip(0.45, -0.5, 0.4), flip(-0.45, -0.5, -0.4),
    ]);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.7 })); scene.add(mesh);
    const cx = L.c[0] + (L.islet ? L.islet[0] : 0), cz = L.c[1] + (L.islet ? L.islet[1] : 0), R = (L.islet ? L.islet[2] : 0) + 3.2;
    let a = 1;
    return {
      update(dt, t){
        a += dt*0.12;
        const x = cx + Math.cos(a)*R, z = cz + Math.sin(a)*R*0.9;
        const dive = 0.5 + 0.5*Math.sin(t*0.23);   // 1 surfaced, 0 just under
        mesh.position.set(x, WATER_Y - 0.1 - (1 - dive)*0.35 + Math.sin(t*1.3)*0.02, z);
        mesh.rotation.set(0, Math.atan2(-Math.sin(a), Math.cos(a)*0.9), Math.sin(t*0.9)*0.05);
      },
    };
  });

  // Splash rings: expanding, fading circles on the water, one instanced draw for all of them.
  part('splash', () => {
    const N = 24;
    const mat = new THREE.MeshBasicMaterial({ map:ringTex, color:'#ffffff', transparent:true, opacity:0.8, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4, fog:false });
    mat.userData.atmo = true;
    // per-ring fade rides in the instance colour (white -> black), so one material serves them all
    mat.blending = THREE.AdditiveBlending;
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI/2), mat, N); mesh.frustumCulled = false; mesh.renderOrder = 3; scene.add(mesh);
    for(let i = 0; i < N; i++){ mesh.setColorAt(i, col.setRGB(0, 0, 0)); }
    return {
      update(dt){
        let i = 0;
        for(let k = splashes.length - 1; k >= 0; k--){ const s = splashes[k]; s.t += dt/1.1; if(s.t >= 1) splashes.splice(k, 1); }
        for(const s of splashes){
          for(const lag of [0, 0.25]){
            if(i >= N) break;
            const u = Math.max(0, s.t - lag)/(1 - lag), r = s.s*(0.4 + 2.6*u), f = (1 - u)*(s.t > lag ? 1 : 0);
            o3.position.set(s.x, WATER_Y + 0.03, s.z); o3.rotation.set(0, 0, 0); o3.scale.set(r, 1, r); o3.updateMatrix();
            mesh.setMatrixAt(i, o3.matrix); mesh.setColorAt(i, col.setRGB(f*0.8, f*0.85, f*0.9)); i++;
          }
        }
        for(let k = i; k < N; k++){ o3.scale.setScalar(0); o3.position.set(0, -50, 0); o3.updateMatrix(); mesh.setMatrixAt(k, o3.matrix); }
        mesh.count = Math.max(1, i);
        mesh.instanceMatrix.needsUpdate = true; if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.visible = i > 0;
      },
    };
  });

  /* ================================================================== */
  /* Driving it                                                          */
  /* ================================================================== */
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    const want = night ? 1 : 0;
    if(raw !== want){ const step = state.reduced ? 1 : dt/2; raw = want > raw ? Math.min(want, raw + step) : Math.max(want, raw - step); }
    nk = nightU.value = ease(clamp01(raw));
    time.value = state.reduced ? 0 : t;
    run('update', dt, t);
  }, 71);

  const emit = () => { try { bus.emit('atmosphere', { night, season }); } catch(e){ console.error('[atmosphere] emit failed', e); } };
  function setNight(on){ on = !!on; if(on === night) return night; night = on; persist(); emit(); return night; }
  function setSeason(name){
    if(!SEASONS.includes(name)) return season;
    season = name; persist();
    try { fallPart?.apply(name); } catch(e){ console.error('[atmosphere] fall apply failed', e); }
    run('season', name);
    try { ctx.modules.trees?.setSeason?.(name); } catch(e){ console.error('[atmosphere] trees.setSeason threw', e); }
    emit(); return season;
  }
  bus.on('key', ({ code, down, repeat }) => { if(code === 'KeyL' && down && !repeat) setNight(!night); });
  // Late listeners (trees.js, lanterns elsewhere) get the restored state once everything is up.
  bus.once('ready', () => { if(season !== 'summer') try { ctx.modules.trees?.setSeason?.(season); } catch(e){ /* optional */ } emit(); });

  const api = {
    setNight, isNight: () => night, setSeason, season: () => season,
    toggleNight: () => setNight(!night), seasons: SEASONS.slice(),
  };
  try {
    ctx.expose('atmosphere', Object.assign({}, api, {
      blend: () => nightU.value,
      stats: () => Object.assign({ parts:parts.map(p => p.name + (p.dead ? ' (dead)' : '')) }, ...parts.map(p => p.stats ? p.stats() : {}), { glowing:parts.find(p => p.name === 'glow')?.count?.() ?? 0 }),
      now: () => { raw = night ? 1 : 0; },
      mine: () => scene.children.filter(o => !before.has(o)),   // skip the fade (for screenshots)
    }));
  } catch(e){ console.warn('[atmosphere] expose failed', e); }
  return api;

  // Merge non-indexed geometries that all carry position, normal and color (no uv).
  function mergeLocal(geos){
    let n = 0; for(const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n*3), nor = new Float32Array(n*3), cl = new Float32Array(n*3); let o = 0;
    for(const g of geos){ pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3); cl.set(g.attributes.color.array, o*3); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    return out;
  }
}
