// The island itself: ground, water, paths, trees, spawn plaza, clouds and every zone's exterior.
// Owned by the map builder. Sets ctx.island (radius, spawn, approachOf, doorOf) for core and others.
export async function init(ctx){
  const { THREE, CANNON, scene } = ctx;
  const zones = ctx.zones;
  const { mats, mat, mesh, box, cyl, ball, rng, rr, canvasTex, label, frameOf, segDist, F, arrowCurve, board,
    solidBox, solidCircle, prop, crate, trafficCone, blob, berry, tooth, terrapin, robot, brainBuddy } = ctx.helpers;

  const DRAW = {
    welcome(g,w,h){ g.fillStyle = '#fffaf0'; g.fillRect(0,0,w,h); g.fillStyle = '#1f2a44'; F(g,700,58); g.fillText('Andrew Liu', 34, 86); g.fillStyle = '#3b4f9e'; F(g,600,28); g.fillText('CS + pre-dental at UMD', 36, 132); g.fillStyle = '#4b5675'; F(g,500,24,'Nunito'); g.fillText('Every building here is a line of my résumé.', 36, 184); g.fillText('Drive around. Honk with H. Knock things over.', 36, 220); },
    blueberry(g,w,h,t){ g.fillStyle = '#26306b'; g.fillRect(0,0,w,h); g.fillStyle = '#fff'; F(g,700,56); g.fillText('Blueberry', 32, 78); g.fillStyle = '#b9c4ff'; F(g,500,24,'Nunito'); g.fillText('Organic chemistry, one step at a time', 34, 116);
      const p = (t*0.35) % 1.4; g.fillStyle = '#ffffff'; F(g,700,40); g.fillText('Nu:', 70, 250); g.fillText('C=O', w-210, 250);
      arrowCurve(g, 130, 222, w-190, 214, 90, '#ffcf5a', 7, Math.min(1, p)); g.fillStyle = '#b9c4ff'; F(g,500,22,'Nunito'); g.fillText('draw the arrow, get graded in the browser', 34, h-30); },
    brain(g,w,h,t){ g.fillStyle = '#2d2140'; g.fillRect(0,0,w,h); const cx = w/2, cy = h/2+18; const names = ['Notes','Food','Workouts','Goals','AI chat'];
      names.forEach((n,i) => { const a = i/names.length*Math.PI*2 - Math.PI/2; const x = cx + Math.cos(a)*190, y = cy + Math.sin(a)*100; g.strokeStyle = '#8f7bb5'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx,cy); g.lineTo(x,y); g.stroke(); g.fillStyle = '#c9b5ff'; g.beginPath(); g.arc(x,y,12,0,7); g.fill(); g.fillStyle = '#e9e0ff'; F(g,600,24); g.textAlign = 'center'; g.fillText(n, x, y + (Math.sin(a) > 0 ? 42 : -22)); g.textAlign = 'left'; });
      const r = 22 + Math.sin(t*2.4)*5; g.fillStyle = '#f29bbd'; g.beginPath(); g.arc(cx,cy,r,0,7); g.fill(); g.fillStyle = '#fff'; F(g,700,40); g.fillText('Second Brain', 28, 56); },
    studio(g,w,h,t){ g.fillStyle = '#17131f'; g.fillRect(0,0,w,h); g.fillStyle = '#2a2436'; for(let x=10;x<w;x+=46){ g.fillRect(x, 8, 26, 16); g.fillRect(x, h-24, 26, 16); }
      const f = (t*0.5) % 1; const k = f < .5 ? f*2 : 1; g.fillStyle = '#fff'; F(g,700,34); g.fillText('Reaction, frame by frame', 30, 76);
      const ax = 120 + k*150; g.fillStyle = '#7fd1ff'; g.beginPath(); g.arc(ax, 190, 34, 0, 7); g.fill(); g.fillStyle = '#ffb36b'; g.beginPath(); g.arc(w-150, 190, 42, 0, 7); g.fill();
      if(f > .5){ arrowCurve(g, ax+30, 170, w-190, 170, 60, '#ffe36b', 6, (f-.5)*2); }
      g.fillStyle = '#9d93b5'; F(g,500,20,'Nunito'); g.fillText(`frame ${String(Math.floor(f*120)).padStart(3,'0')} / 120 · svg to ffmpeg`, 30, h-40); },
    dock(g,w,h){ g.fillStyle = '#e9f5f3'; g.fillRect(0,0,w,h); rr(g, 24, 24, w-48, h-48, 16); g.fillStyle = '#fff'; g.fill(); g.fillStyle = '#2f9e8f'; g.fillRect(24, 24, w-48, 40); ['#ff6b6b','#ffd166','#06d6a0'].forEach((c,i) => { g.fillStyle = c; g.beginPath(); g.arc(50 + i*26, 44, 8, 0, 7); g.fill(); });
      g.fillStyle = '#1f2a44'; F(g,700,40); g.fillText('Browser Use docs', 50, 120); g.fillStyle = '#4b5675'; F(g,500,24,'Nunito'); g.fillText('2,000+ users · 200+ contributors', 50, 160); g.fillText('20+ web environments debugged', 50, 196); g.fillText('every AI fix checked on a live run', 50, 232); },
    chalk(g,w,h){ g.fillStyle = '#2f5d46'; g.fillRect(0,0,w,h); g.strokeStyle = '#ffffff22'; g.lineWidth = 2; for(let i=0;i<14;i++){ g.beginPath(); g.moveTo(rng()*w, rng()*h); g.lineTo(rng()*w, rng()*h); g.stroke(); }
      g.fillStyle = '#f7f3e8'; F(g,600,52); g.fillText('SAT  +100 to 300', 36, 90); F(g,500,30); g.fillText('PV = nRT     F = ma', 36, 160); g.fillText('A-T   G-C', 36, 214); F(g,500,24,'Nunito'); g.fillText('several dozen students · anatomy to physics', 36, h-34); },
    umd(g,w,h){ g.fillStyle = '#c8102e'; g.fillRect(0,0,w,h); g.fillStyle = '#ffd200'; g.fillRect(0, h-60, w, 60); g.fillStyle = '#fff'; F(g,700,62); g.fillText("UMD '27", 32, 90); F(g,600,28); g.fillText('B.S. Computer Science', 34, 140); g.fillText('Pre-Dental Track', 34, 178); g.fillStyle = '#1f2a44'; F(g,600,24); g.fillText('Fear the Turtle', 34, h-22); },
    clinic(g,w,h){ g.fillStyle = '#eaf6fb'; g.fillRect(0,0,w,h); g.fillStyle = '#4fa3c7'; g.fillRect(0,0,w,70); g.fillStyle = '#fff'; F(g,700,40); g.fillText('Pre-Dental', 30, 50); g.fillStyle = '#1f2a44'; F(g,600,32); g.fillText('Future dentist,', 30, 132); g.fillText('current builder.', 30, 176); g.fillStyle = '#4b5675'; F(g,500,22,'Nunito'); g.fillText('Hard ideas, made easier to use.', 30, 226); },
    chapel(g,w,h){ g.fillStyle = '#fff8e8'; g.fillRect(0,0,w,h); g.fillStyle = '#c9a24a'; g.fillRect(0, 0, 14, h); g.fillStyle = '#1f2a44'; F(g,700,46); g.fillText('Focus Family', 40, 74); g.fillStyle = '#4b5675'; F(g,600,26); g.fillText('Leader · Kharis Campus Ministry', 40, 116);
      F(g,500,22,'Nunito'); g.fillText('25+ students, one circle', 40, 172); g.fillText('a weekly digest, written by a script', 40, 206); g.fillText('guides so the next leaders can run it', 40, 240); },
    skills(g,w,h){ g.fillStyle = '#fff4ea'; g.fillRect(0,0,w,h); g.fillStyle = '#e98a5a'; F(g,700,46); g.fillText('Skills Alley', 30, 66); g.fillStyle = '#1f2a44'; F(g,600,24); ['Python · TypeScript · JavaScript','Kotlin · Java · SQL','React · Supabase · Postgres','Claude · Gemini · agentic coding'].forEach((s,i) => g.fillText(s, 32, 118 + i*38)); },
    yard(g,w,h){ g.fillStyle = '#f2f8ea'; g.fillRect(0,0,w,h); g.fillStyle = '#4f7d33'; F(g,700,46); g.fillText('Off the Clock', 30, 66); g.fillStyle = '#1f2a44'; F(g,600,28); g.fillText('cook  ·  lift  ·  garden', 32, 126); g.fillStyle = '#4b5675'; F(g,500,22,'Nunito'); g.fillText('landscape design is the interest that', 32, 182); g.fillText('keeps growing', 32, 212); },
    now(g,w,h,t){ g.fillStyle = '#fff8dc'; g.fillRect(0,0,w,h); g.fillStyle = '#b8860b'; F(g,700,44); g.fillText('Now Building', 30, 62); const items = [['Blueberry','learning game, in the platform'],['Second Brain','one home for everything'],['Next plot','planted 2027']];
      items.forEach(([a,b],i) => { const y = 112 + i*56; g.fillStyle = i===2 ? '#c9b98a' : '#6fae4a'; g.beginPath(); g.arc(44, y-8, 10 + (i===2 ? Math.sin(t*3)*2 : 0), 0, 7); g.fill(); g.fillStyle = '#1f2a44'; F(g,600,28); g.fillText(a, 66, y); g.fillStyle = '#4b5675'; F(g,500,20,'Nunito'); g.fillText(b, 66, y+24); }); },
    contact(g,w,h){ g.fillStyle = '#fffaf0'; g.fillRect(0,0,w,h); g.fillStyle = '#d9534f'; F(g,700,48); g.fillText('Say hi', 30, 70); g.fillStyle = '#1f2a44'; F(g,600,24); g.fillText('zeus.andrewliu@gmail.com', 32, 128); g.fillText('github.com/andliu7', 32, 170); g.fillStyle = '#4b5675'; F(g,500,20,'Nunito'); g.fillText('drive up to the mailbox for links', 32, 220); },
  };


  /* ------------------------------------------------------------------ */
  /* Buildings                                                          */
  /* ------------------------------------------------------------------ */
  function roof(parent, w, d, h, y, color){
    const outer = new THREE.Group(); outer.position.y = y; outer.scale.set(w/Math.SQRT2*1.08, h, d/Math.SQRT2*1.08); parent.add(outer);
    const c = mesh(new THREE.ConeGeometry(1, 1, 4), color, 0, 0.5, 0, outer); c.rotation.y = Math.PI/4; return outer;
  }
  // Each zone's building comes from houses.js (one design per zone, previewed in _test/houses.html).
  // It is loaded softly like art.js: if the import or one design throws, that zone gets the old box
  // house instead. house() returns true when the houses.js design was used, so a zone can skip the
  // roof toppers that the design already draws. y lifts the design (the dock stands on its deck).
  let HOUSES = null;
  try { HOUSES = await import('./houses.js'); } catch(e){ console.error('[map] houses.js unavailable, using box houses', e); }
  function house(zone, f, g, { w, d, h, color, roofColor, lx=0, lz=0, y=0, windows=true, door='#6b4a33' }){
    let hg = null;
    if(HOUSES) try { hg = HOUSES.buildHouse(ctx, zone, { w, d, h, color, roofColor }); }
    catch(e){ console.error(`[map] houses.js failed for ${zone.id}, using the box house`, e); hg = null; }
    if(hg){
      hg.position.set(lx, y, lz); g.add(hg);
      spinners.push(...(hg.userData.spin || [])); wavers.push(...(hg.userData.wave || []));
      dressDoor(zone, f, g, hg, { d, lx, lz, y });
    } else {
      box(w, h, d, color, lx, h/2, lz, g);
      if(roofColor) roof(g, w, d, h*0.55, h, roofColor);
      box(1.3, 2.1, 0.12, door, lx, 1.05, lz + d/2 + 0.02, g);
      if(windows) for(const sx of [-w/3, w/3]){ box(1.1, 1.0, 0.1, '#ffe7b0', lx+sx, h*0.58, lz + d/2 + 0.02, g, { emissive:'#ffb85c', emissiveIntensity:1.5 }); box(1.3, 0.14, 0.2, '#ffffff', lx+sx, h*0.58 - 0.6, lz + d/2 + 0.05, g); }
    }
    const [wx, wz] = f.w(lx, lz); solidBox(wx, wz, f.ang, w, d, h);
    houses.push({ zone, g, w, d, h, lx, lz, y, color, roofColor, windows, designed:!!hg });   // art.js dresses these
    return !!hg;
  }
  const houses = [];

  // Make a houses.js door easy to find: a vivid version of its own colours on its own material (so
  // it can glow as it opens without touching the shared wall material), a welcome mat past the
  // step, and an entry in swingDoors so the update hook below can swing it.
  const swingDoors = [];
  function dressDoor(zone, f, g, hg, { d, lx, lz, y }){
    const { door } = HOUSES.doorParts(hg); if(!door) return;
    const c = door.geometry.attributes.color, col = new THREE.Color(), hsl = {};
    if(c){
      for(let i=0; i<c.count; i++){
        col.fromBufferAttribute(c, i).getHSL(hsl, THREE.SRGBColorSpace);
        col.setHSL(hsl.h, Math.max(hsl.s, 0.7), Math.max(hsl.l, 0.55), THREE.SRGBColorSpace); c.setXYZ(i, col.r, col.g, col.b);
      }
      c.needsUpdate = true;
    }
    door.material = door.material.clone(); door.material.emissive = new THREE.Color(zone.color); door.material.emissiveIntensity = 0.12;
    const fz = lz + d/2;
    const rim = box(2.0, 0.05, 1.05, '#fffaf0', lx, y + 0.075, fz + 1.35, g), mid = box(1.7, 0.05, 0.8, zone.color, lx, y + 0.085, fz + 1.35, g);
    rim.castShadow = mid.castShadow = false;
    const [x, z] = f.w(lx, fz); swingDoors.push({ zone:zone.id, door, x, z, p:0 });
  }

  /* ------------------------------------------------------------------ */
  /* Build the island: terrain, water, roads, bridges, scatter          */
  /* The shape comes from layout() at the bottom of this file.          */
  /* ------------------------------------------------------------------ */
  // Own seeded stream for scatter, so the shared rng() is not drained by a thousand tufts.
  const prng = (s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; })(20260929);
  const pick = list => list[Math.floor(prng()*list.length)];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  const WATER_Y = -0.28;
  const tmpC = new THREE.Color();
  const flatMat = () => new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.85, flatShading:true });

  // Repeated props as InstancedMeshes, one per 40 m tile so the camera and the shadow
  // camera can cull the tiles they cannot see. Items: { x, y, z, rx, ry, rz, sx, sy, sz, c }.
  function inst(geo, material, list, { shadow = true, receive = true } = {}){
    const tiles = new Map();
    for(const it of list){ const k = Math.floor(it.x/40)*1000 + Math.floor(it.z/40); if(!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(it); }
    const o = new THREE.Object3D();
    for(const items of tiles.values()){
      const m = new THREE.InstancedMesh(geo, material, items.length);
      items.forEach((it, i) => {
        o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
        o.updateMatrix(); m.setMatrixAt(i, o.matrix); if(it.c) m.setColorAt(i, tmpC.set(it.c));
      });
      m.instanceMatrix.needsUpdate = true; if(m.instanceColor) m.instanceColor.needsUpdate = true;
      m.castShadow = shadow; m.receiveShadow = receive; m.computeBoundingSphere(); scene.add(m);
    }
  }
  // Merge simple geometries (position + normal only) into one.
  function merge(geos){
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for(const g of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n*3), nor = new Float32Array(n*3); let o = 0;
    for(const g of parts){ pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
  }

  function buildGround(){
    const SEG = 296, geo = new THREE.PlaneGeometry(Lay.SIZE, Lay.SIZE, SEG, SEG); geo.rotateX(-Math.PI/2);
    const pos = geo.attributes.position, n = pos.count, colors = new Float32Array(n*3);
    // Painterly grass: three greens in slow patches, dry ochre where the ground is worn by the
    // roads, lusher deep green along the banks, then sand and wet sand at the waterline.
    const grassA = new THREE.Color('#96c655'), grassB = new THREE.Color('#72ab45'), grassC = new THREE.Color('#bccd62');
    const dry = new THREE.Color('#dbb86e'), lush = new THREE.Color('#579a45');
    const sand = new THREE.Color('#f4cf98'), wet = new THREE.Color('#d9a970'), under = new THREE.Color('#d6b27c');
    for(let k=0; k<n; k++){
      const x = pos.getX(k), z = pos.getZ(k), sd = Lay.sdAt(x, z); let y;
      if(sd < 0){
        const dl = -sd; y = Math.min(0, WATER_Y + 0.2*dl);
        const nz = 0.5 + 0.5*Math.sin(x*0.071 + Math.sin(z*0.043)*2.2)*Math.sin(z*0.063 + Math.sin(x*0.052)*1.8);
        const n2 = 0.5 + 0.5*Math.sin(x*0.19 + Math.sin(z*0.15)*1.7)*Math.sin(z*0.17 - x*0.05);
        tmpC.copy(grassA).lerp(grassB, smooth(.55, .95, nz)).lerp(grassC, smooth(.45, .08, nz)*0.8);
        tmpC.lerp(dry, (1 - smooth(4.6, 8.5, Lay.roadDistAt(x, z)))*0.45 + smooth(.7, .95, n2)*0.25);
        tmpC.lerp(lush, (1 - smooth(3.5, 9, dl))*smooth(1.6, 3.4, dl)*0.55);
        tmpC.lerp(sand, 1 - smooth(1.8, 3.6, dl)); if(dl < 0.8) tmpC.lerp(wet, 1 - dl/0.8);
      } else { y = Math.max(-2.1, WATER_Y - 0.3*sd); tmpC.copy(under); }
      pos.setY(k, y); colors[k*3] = tmpC.r; colors[k*3+1] = tmpC.g; colors[k*3+2] = tmpC.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.95 })); m.receiveShadow = true; scene.add(m);
    artKit.groundMat = m.material;
  }

  // Stylised water, all driven by one signed-distance texture (metres from the nearest shore).
  // Colour darkens with depth: pale turquoise over the sand shelf, teal, then deep blue, then an
  // inky open sea past the islets. The shore foam is not one band: its width, brightness and
  // breakup change along the coast, the travelling foam lines come and go in patches, and bubbles
  // fizz in the shallows. A few sun glints drift over deep water.
  let waterMat = null;
  function buildWater(){
    const N = Lay.N, data = new Uint8Array(N*N);
    for(let k=0; k<N*N; k++){ const s = Lay.land[k] ? -Lay.dL[k] : Lay.dW[k]; data[k] = Math.max(0, Math.min(255, Math.round((s + 6)*10))); }
    const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.unpackAlignment = 1; tex.needsUpdate = true;
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime:{ value:0 }, uSdf:{ value:null }, uBox:{ value:new THREE.Vector3(Lay.MIN, Lay.MIN, Lay.SIZE) },
      uShallow:{ value:new THREE.Color('#8fe6cf') }, uMid:{ value:new THREE.Color('#2aa9b4') }, uDeep:{ value:new THREE.Color('#15658f') },
      uAbyss:{ value:new THREE.Color('#1a3f72') }, uFoam:{ value:new THREE.Color('#fffaf0') },
    }]);
    uniforms.uSdf.value = tex;
    waterMat = new THREE.ShaderMaterial({ uniforms, fog:true,
      vertexShader:`
        #include <fog_pars_vertex>
        varying vec2 vW;
        void main(){
          vec4 wp = modelMatrix*vec4(position, 1.0); vW = wp.xz;
          vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader:`
        uniform float uTime; uniform sampler2D uSdf; uniform vec3 uBox, uShallow, uMid, uDeep, uAbyss, uFoam;
        varying vec2 vW;
        #include <fog_pars_fragment>
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
        float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main(){
          vec2 uv = (vW - uBox.xy)/uBox.z;
          float s = 19.5;
          if(uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) s = texture2D(uSdf, uv).r*25.5 - 6.0;
          float w1 = sin(vW.x*0.21 + uTime*0.8) + sin(vW.y*0.17 - uTime*0.7) + sin((vW.x + vW.y)*0.11 + uTime*0.5);
          float d = s + w1*0.12;
          float big = vnoise(vW*0.045);                 // slow variation along the coast
          float fine = vnoise(vW*0.6 + vec2(uTime*0.15, -uTime*0.1));
          // depth colour, with the open sea darkening further out
          vec3 c = mix(uShallow, uMid, smoothstep(0.4, 4.5 + big*2.0, d));
          c = mix(c, uDeep, smoothstep(4.0, 15.0, d));
          c = mix(c, uAbyss, smoothstep(150.0, 235.0, length(vW)));
          c *= 0.955 + 0.045*sin(vW.x*0.45 + w1*1.3) + 0.03*(big - 0.5);
          // shore foam: width and strength vary along the shore
          float width = mix(0.35, 1.25, smoothstep(0.25, 0.8, big));
          float br = 0.22*sin(uTime*1.3 + vW.x*0.04 + vW.y*0.05);
          float edge = 1.0 - smoothstep(width*0.5 + br, width + br, d + (fine - 0.5)*0.5);
          edge *= mix(0.75, 1.0, smoothstep(0.2, 0.6, big));
          // travelling foam lines, only on some stretches, broken into dashes
          float ph = d*0.42 - uTime*0.3;
          float band = abs(fract(ph) - 0.5);
          float line = 1.0 - smoothstep(0.03, 0.065, band);
          float brk = sin(vW.x*0.31 + vW.y*0.19 + floor(ph)*2.3)*sin(vW.y*0.27 - vW.x*0.12 + floor(ph)*1.3);
          line *= smoothstep(-0.1, 0.35, brk)*(1.0 - smoothstep(2.5 + big*5.0, 4.0 + big*7.0, d))*smoothstep(1.0, 1.8, d);
          line *= smoothstep(0.3, 0.55, vnoise(vW*0.09 + 7.0));
          // bubbles in the shallows
          float bub = step(0.8, vnoise(vW*2.2 + vec2(uTime*0.2, 0.0)))*(1.0 - smoothstep(0.8, 2.4, d))*smoothstep(0.35, 0.7, big);
          // sun glints over deeper water
          float gl = pow(max(0.0, sin(vW.x*1.7 + uTime*1.1 + sin(vW.y*0.9))*sin(vW.y*1.9 - uTime*0.9 + sin(vW.x*0.7))), 60.0)*smoothstep(4.0, 10.0, d)*smoothstep(0.62, 0.8, vnoise(vW*0.05 - uTime*0.02));
          c = mix(c, uFoam, clamp(max(max(edge, line*0.75), bub*0.6) + gl*0.7, 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), waterMat); water.rotation.x = -Math.PI/2; water.position.y = WATER_Y; scene.add(water);
  }

  // Roads: ribbons along the spline samples. Shoulder, asphalt, white edge lines and a dashed
  // yellow centre line. Each road sits a few mm above the one before so junctions never flicker,
  // and markings stop wherever another road covers the same ground.
  function buildRoads(){
    const A = { shoulder:[], asphalt:[], white:[], yellow:[] };
    const quad = (arr, a, b, o1, o2, y) => {
      const nax = -a.tz, naz = a.tx, nbx = -b.tz, nbz = b.tx;
      const p0 = [a.x + nax*o1, y, a.z + naz*o1], p1 = [a.x + nax*o2, y, a.z + naz*o2], p2 = [b.x + nbx*o1, y, b.z + nbz*o1], p3 = [b.x + nbx*o2, y, b.z + nbz*o2];
      arr.push(...p0, ...p1, ...p2, ...p1, ...p3, ...p2);
    };
    const disc = (arr, x, z, r, y) => { for(let k=0; k<20; k++){ const a0 = k/20*Math.PI*2, a1 = (k + 1)/20*Math.PI*2; arr.push(x, y, z, x + Math.sin(a1)*r, y, z + Math.cos(a1)*r, x + Math.sin(a0)*r, y, z + Math.cos(a0)*r); } };
    const alone = (bit, x, z) => (Lay.maskAt(x, z) & ~bit) === 0 && Math.hypot(x, z) > 10.5;
    Lay.roads.forEach((road, ri) => {
      const pts = road.pts, n = pts.length, bit = 1 << ri, ys = 0.012 + ri*0.004, ya = 0.075 + ri*0.004, ym = 0.14;
      const segs = road.closed ? n : n - 1;
      for(let k=0; k<segs; k++){
        const a = pts[k], b = pts[(k + 1) % n];
        if(Lay.onBridge(ri, k) || Lay.onBridge(ri, (k + 1) % n)) continue;
        quad(A.shoulder, a, b, -4.6, 4.6, ys); quad(A.asphalt, a, b, -3.3, 3.3, ya);
        for(const s of [-1, 1]){ const o = s*2.95; if(alone(bit, a.x - a.tz*o, a.z + a.tx*o)) quad(A.white, a, b, o - 0.13, o + 0.13, ym); }
        if(a.s % 4 < 2.2 && alone(bit, a.x, a.z)) quad(A.yellow, a, b, -0.13, 0.13, ym);
      }
      if(!road.closed) for(const p of [pts[0], pts[n-1]]){ disc(A.shoulder, p.x, p.z, 4.6, ys); disc(A.asphalt, p.x, p.z, 3.3, ya); }
    });
    const colors = { shoulder:'#eec58f', asphalt:'#54465c', white:'#fff4e2', yellow:'#ffbe3d' };
    for(const [k, arr] of Object.entries(A)){
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const nor = new Float32Array(arr.length); for(let i=1; i<nor.length; i+=3) nor[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color:colors[k], roughness:k === 'asphalt' ? .9 : .8 })); m.receiveShadow = true; scene.add(m);
      artKit.roadMats[k] = m.material;
    }
    // a paved pad in front of every zone, between its building and the ring road (art.js tiles it)
    const pave = artKit.paveMat = new THREE.MeshStandardMaterial({ color:'#f0c48e', roughness:.85 });
    for(const z of zones){ const [px, pz] = frameOf(z).w(0, 11); const pad = cyl(6.5, 6.5, 0.04, pave, px, 0.04, pz, scene, 28); pad.castShadow = false; }
    const plaza = cyl(9, 9, 0.1, artKit.plazaMat = new THREE.MeshStandardMaterial({ color:'#f5cf98', roughness:.85 }), 0, 0.06, 0, scene, 40); plaza.castShadow = false;
  }

  // Wooden bridges wherever a road crosses water: planks with gaps, beams, posts, two rails,
  // piles into the water, and a line of posts the car cannot pass on each side.
  function buildBridges(){
    const planks = [], beams = [], posts = [], rails = [], piles = [];
    for(const b of Lay.bridges){
      const pts = Lay.roads[b.road].pts, yaw = p => Math.atan2(p.tx, p.tz);
      for(let k=b.a; k<=b.b; k+=2){ const p = pts[k]; planks.push({ x:p.x, y:0.17, z:p.z, ry:yaw(p), c:(k/2)%3 ? '#d9a066' : '#c98f58' }); }
      for(let k=b.a; k<b.b; k+=2){ const p = pts[k]; for(const s of [-1, 1]) beams.push({ x:p.x - p.tz*s*3.3, y:0.02, z:p.z + p.tx*s*3.3, ry:yaw(p) }); }
      let prev = null;
      for(let k=b.a; k<=b.b; k+=4){ const p = pts[k];
        for(const s of [-1, 1]){ const x = p.x - p.tz*s*4.1, z = p.z + p.tx*s*4.1; posts.push({ x, y:0.6, z, ry:yaw(p) }); }
        if(prev) for(const s of [-1, 1]){
          const ax = prev.x - prev.tz*s*4.1, az = prev.z + prev.tx*s*4.1, bx = p.x - p.tz*s*4.1, bz = p.z + p.tx*s*4.1, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
          for(const y of [1.12, 0.62]) rails.push({ x:(ax + bx)/2, y, z:(az + bz)/2, ry, sz:len });
        }
        prev = p;
      }
      for(let k=b.a; k<=b.b; k++){ const p = pts[k]; for(const s of [-1, 1]) if(k % 2 === 0) ctx.colliders.push({ kind:'circle', x:p.x - p.tz*s*4.1, z:p.z + p.tx*s*4.1, r:0.35 }); }
      for(let k=b.a; k<=b.b; k+=8){ const p = pts[k]; if(Lay.landAt(p.x, p.z)) continue; for(const s of [-1, 1]) piles.push({ x:p.x - p.tz*s*3.3, y:-1.0, z:p.z + p.tx*s*3.3 }); }
    }
    const wood = flatMat();
    inst(new THREE.BoxGeometry(8.6, 0.16, 0.82), wood, planks);
    inst(new THREE.BoxGeometry(0.4, 0.3, 1.02), wood, beams.map(b => ({ ...b, c:'#8a5a3b' })));
    inst(new THREE.BoxGeometry(0.3, 1.25, 0.3), wood, posts.map(p => ({ ...p, c:'#a8663f' })));
    inst(new THREE.BoxGeometry(0.16, 0.16, 1), wood, rails.map(r => ({ ...r, c:'#e98a5a' })));
    inst(new THREE.CylinderGeometry(0.28, 0.32, 2.2, 8), wood, piles.map(p => ({ ...p, c:'#7a5236' })));
  }

  // Invisible shoreline: a close chain of circle colliders just off every shore, so the car and
  // the walker stop at the waterline. Bridges leave a gap that their rails close.
  function buildShore(){
    const brPts = []; for(const b of Lay.bridges){ const pts = Lay.roads[b.road].pts; for(let k=b.a; k<=b.b; k+=2) brPts.push(pts[k]); }
    const used = new Set(), N = Lay.N; let count = 0;
    for(let j=0; j<N; j++) for(let i=0; i<N; i++){
      const k = j*N + i; if(Lay.land[k]) continue; const d = Lay.dW[k]; if(d < 0.9 || d > 1.4) continue;
      const x = Lay.MIN + (i + .5)*Lay.RES, z = Lay.MIN + (j + .5)*Lay.RES; if(x*x + z*z > Lay.radius*Lay.radius) continue;
      const key = Math.floor(x/1.25)*4096 + Math.floor(z/1.25); if(used.has(key)) continue;
      if(brPts.some(p => (p.x - x)*(p.x - x) + (p.z - z)*(p.z - z) < 4.45*4.45)) continue;
      used.add(key); ctx.colliders.push({ kind:'circle', x, z, r:1.2 }); count++;
    }
    return count;
  }

  // Trees in clumps, grass tufts, flowers, bushes along the roads, rocks on the shore, reeds and
  // lily pads in the lakes. Every set is a single InstancedMesh.
  function buildScatter(){
    const nearZone = (x, z, r) => zones.some(zn => (x - zn.x)*(x - zn.x) + (z - zn.z)*(z - zn.z) < r*r);
    const nearBridge = (x, z, r) => Lay.bridges.some(b => Math.hypot(x - b.mid.x, z - b.mid.z) < r);
    const forest = (x, z) => 0.5 + 0.5*Math.sin(x*0.045 + 1.3)*Math.sin(z*0.052 + Math.sin(x*0.02)*2);
    const inland = (x, z) => Math.hypot(x, z) < Lay.coast(Math.atan2(z, x)) - 6;
    const R = () => (prng()*2 - 1)*168;
    // trees
    const trunks = [], cones = [], rounds = [], spots = [], cells = new Set();
    const GREEN = ['#6fae4a', '#8cc15a', '#5f9e45', '#93c45a'], BLOSSOM = ['#ff9fb8', '#ffb06a', '#ffd45e', '#f79ac0'], PINE = ['#4a8a4a', '#5a9a4c', '#3f7a44'];
    for(let i=0; i<12000 && trunks.length < 430; i++){
      const x = R(), z = R();
      if(!Lay.landAt(x, z) || Lay.dLandAt(x, z) < 2.4 || Lay.roadDistAt(x, z) < 6.4) continue;
      if(x*x + z*z < 15*15 || nearZone(x, z, 18.5) || nearBridge(x, z, 16)) continue;
      if(prng() > 0.12 + 0.88*forest(x, z)) continue;
      const cx = Math.floor(x/3.3), cz = Math.floor(z/3.3); if(cells.has(cx*1000 + cz)) continue; cells.add(cx*1000 + cz);
      const h = 1.5 + prng()*1.8;
      trunks.push({ x, y:h/2, z, sy:h, c:'#8a5a3b' });
      if(prng() < 0.36){ const r = 1.05 + prng()*0.5, crown = { x, y:h + 1.3, z, sx:r, sy:2.8 + prng()*0.9, sz:r, ry:prng()*6, c:pick(PINE) }; cones.push(crown); spots.push({ x, z, h, kind:'cone', crown }); }
      else { const r = 1.15 + prng()*0.65, crown = { x, y:h + 0.7*r, z, sx:r, sy:r*0.92, sz:r, ry:prng()*6, c:prng() < 0.32 ? pick(BLOSSOM) : pick(GREEN) }; rounds.push(crown); spots.push({ x, z, h, kind:'round', crown }); }
      solidCircle(x, z, 0.5, h + 2);
    }
    const bark = flatMat(), leaf = flatMat();
    // trees.js draws them (forking trunks, leaf clumps, species, wind, seasons) from these same
    // spots, so the layout and colliders above are unchanged. If it cannot load, plain shapes.
    import('./trees.js').then(m => m.build(ctx, spots, { Lay })).catch(e => {
      console.error('[map] trees.js failed, drawing plain trees', e);
      inst(new THREE.CylinderGeometry(0.18, 0.26, 1, 6), bark, trunks);
      inst(new THREE.ConeGeometry(1, 1, 7), leaf, cones);
      inst(new THREE.IcosahedronGeometry(1, 1), leaf, rounds);
    });
    // grass tufts, clumped
    const blades = []; for(let b=0; b<6; b++){ const a = b/6*Math.PI*2 + (b%2)*0.4, g = new THREE.ConeGeometry(0.07, 0.62 + (b%2)*0.18, 3, 1, true); g.rotateZ(Math.cos(a)*0.35); g.rotateX(-Math.sin(a)*0.35); g.translate(Math.cos(a)*0.1, 0.3, Math.sin(a)*0.1); blades.push(g); }
    const tuftGeo = merge(blades), tufts = [];
    const TUFT = ['#7fb84f', '#8fc45c', '#6aa843', '#a3cf6a', '#b6d66e'];
    for(let i=0; i<60000 && tufts.length < 7000; i++){
      const x = R(), z = R(); if(!Lay.landAt(x, z) || Lay.dLandAt(x, z) < 1.4 || Lay.roadDistAt(x, z) < 5.1) continue;
      if(x*x + z*z < 11*11 || nearZone(x, z, 13.5)) continue;
      const patch = 0.5 + 0.5*Math.sin(x*0.13 + Math.sin(z*0.07)*3)*Math.sin(z*0.11 + 1.7); if(prng() > patch*patch*1.5) continue;
      const s = 0.7 + prng()*0.7; tufts.push({ x, y:0, z, sx:s, sy:s*(0.8 + prng()*0.5), sz:s, ry:prng()*6, c:pick(TUFT) });
    }
    const tuftMat = flatMat(); inst(tuftGeo, tuftMat, tufts, { shadow:false });
    // reeds at the edges of lakes and rivers
    const reeds = [];
    for(let i=0; i<40000 && reeds.length < 260; i++){
      const x = R(), z = R(); if(Lay.landAt(x, z)) continue; const d = Lay.dWaterAt(x, z); if(d < 0.3 || d > 1.3 || !inland(x, z) || nearBridge(x, z, 13)) continue;
      const s = 1 + prng()*0.6; reeds.push({ x, y:WATER_Y - 0.1, z, sx:0.7, sy:s*1.9, sz:0.7, ry:prng()*6, c:pick(['#6f9e4a', '#80ab52', '#9bbd5e']) });
    }
    const reedMat = flatMat(); inst(tuftGeo, reedMat, reeds, { shadow:false });
    // flowers
    const flowers = [];
    for(let i=0; i<20000 && flowers.length < 380; i++){
      const x = R(), z = R(); if(!Lay.landAt(x, z) || Lay.dLandAt(x, z) < 2 || Lay.roadDistAt(x, z) < 5.2 || nearZone(x, z, 12) || x*x + z*z < 121) continue;
      flowers.push({ x, y:0.2, z, sx:1, sy:1, sz:1, c:pick(['#ff8fab', '#ffd166', '#ffffff', '#c9b5ff', '#ffb4a2']) });
    }
    inst(new THREE.IcosahedronGeometry(0.15, 0), flatMat(), flowers, { shadow:false });
    // bushes along the roadside
    const bushes = [];
    for(let i=0; i<30000 && bushes.length < 200; i++){
      const x = R(), z = R(); const rd = Lay.roadDistAt(x, z); if(rd < 5.3 || rd > 6.3 || !Lay.landAt(x, z) || Lay.dLandAt(x, z) < 1.5) continue;
      if(nearZone(x, z, 16) || nearBridge(x, z, 14) || x*x + z*z < 12*12) continue;
      const s = 0.55 + prng()*0.45; bushes.push({ x, y:s*0.45, z, sx:s, sy:s*0.78, sz:s, ry:prng()*6, c:prng() < 0.18 ? pick(BLOSSOM) : pick(GREEN) });
    }
    inst(new THREE.IcosahedronGeometry(1, 1), leaf, bushes);
    // rocks where land meets water
    const rocks = [];
    for(let i=0; i<60000 && rocks.length < 150; i++){
      const x = R(), z = R(); const wet = !Lay.landAt(x, z), d = wet ? Lay.dWaterAt(x, z) : Lay.dLandAt(x, z);
      if(d > (wet ? 2.2 : 1.2) || Lay.roadDistAt(x, z) < 6 || nearZone(x, z, 14) || nearBridge(x, z, 12)) continue;
      const s = 0.3 + prng()*prng()*1.1; rocks.push({ x, y:(wet ? WATER_Y : 0) - s*0.25, z, sx:s*1.2, sy:s*0.8, sz:s, rx:prng(), ry:prng()*6, c:pick(['#c9c2b8', '#d8cfc0', '#b9b2c7', '#cfc6b4']) });
    }
    inst(new THREE.DodecahedronGeometry(1, 0), flatMat(), rocks);
    // lily pads in the lakes
    const pads = [], blooms = [];
    for(const L of Lay.lakes){ for(let i=0; i<40 && pads.length < 60; i++){
      const [dx, dz, r] = L.parts[i % L.parts.length], a = prng()*Math.PI*2, rr = Math.sqrt(prng())*r*0.8, x = L.c[0] + dx + Math.cos(a)*rr, z = L.c[1] + dz + Math.sin(a)*rr;
      if(Lay.landAt(x, z) || Lay.dWaterAt(x, z) < 1.4 || prng() < 0.6) continue;
      const s = 0.45 + prng()*0.4; pads.push({ x, y:WATER_Y + 0.03, z, sx:s, sy:1, sz:s, ry:prng()*6, c:pick(['#6fae4a', '#7dba52', '#5f9e45']) });
      if(prng() < 0.35) blooms.push({ x, y:WATER_Y + 0.14, z, sx:1, sy:0.7, sz:1, c:pick(['#ff9fb8', '#ffffff', '#ffd6e5']) });
    } }
    inst(new THREE.CylinderGeometry(1, 1, 0.04, 10, 1, false, 0.35, Math.PI*2 - 0.35), flatMat(), pads, { shadow:false });
    inst(new THREE.IcosahedronGeometry(0.16, 0), flatMat(), blooms, { shadow:false });
    Object.assign(artKit, { rounds, cones, tuftGeo, sway:[tuftMat, reedMat], nearZone, nearBridge, leafMat:leaf, barkMat:bark, trunks });
    return { trees:trunks.length, tufts:tufts.length, reeds:reeds.length, flowers:flowers.length, bushes:bushes.length, rocks:rocks.length, pads:pads.length };
  }

  // The dock stands where the island meets the sea: pilings under the deck and a pier running out.
  function buildPier(){
    const z = zones.find(q => q.id === 'dock'); if(!z) return;
    const f = frameOf(z), g = new THREE.Group(); g.position.set(z.x, 0, z.z); g.rotation.y = f.ang; scene.add(g);
    for(const lx of [-7.6, -3.8, 0, 3.8, 7.6]) cyl(0.25, 0.3, 1.6, '#7a5236', lx, -0.6, -5.3, g, 8);
    const pier = box(3, 0.22, 12, '#c89b6d', -5, 0.12, -11.4, g); pier.castShadow = false;
    for(let lz = -6.4; lz >= -17; lz -= 1.2){ const pl = box(3.04, 0.02, 0.08, '#a47a4f', -5, 0.24, lz, g); pl.castShadow = false; }
    for(let lz = -7; lz >= -17; lz -= 3.3) for(const sx of [-6.35, -3.65]) cyl(0.16, 0.18, 2.4, '#7a5236', sx, -0.1, lz, g, 8);
    // a little moored boat
    const boat = new THREE.Group(); boat.position.set(-8.2, WATER_Y + 0.05, -13); g.add(boat);
    const hull = box(1.6, 0.5, 3.6, '#ffffff', 0, 0.2, 0, boat); box(1.64, 0.14, 3.64, '#e5484d', 0, 0.44, 0, boat); box(1.2, 0.1, 0.5, '#c89b6d', 0, 0.42, 0.4, boat);
    const bow = mesh(new THREE.ConeGeometry(0.8, 1.2, 4), '#ffffff', 0, 0.2, 2.3, boat); bow.rotation.x = Math.PI/2; bow.rotation.y = Math.PI/4; bow.scale.set(1, 1, 0.45);
    bobbers.push({ o:boat, base:boat.position.y, ph:0 });
    // buoys out in the water
    for(const [lx, lz] of [[4, -14], [9, -9], [-12, -19]]){ const b = new THREE.Group(); b.position.set(lx, WATER_Y, lz); g.add(b); ball(0.45, '#e5484d', 0, 0.1, 0, b, 12); cyl(0.46, 0.46, 0.14, '#ffffff', 0, 0.12, 0, b, 12); bobbers.push({ o:b, base:WATER_Y, ph:lx }); }
    void hull;
  }
  const bobbers = [];

  // Minimap: the real island, painted once, drawn under the zone dots and the player arrow.
  function buildMinimap(){
    const S = 368, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S);
    for(let j=0; j<S; j++) for(let i=0; i<S; i++){
      const k = (j*2)*Lay.N + i*2, o = (j*S + i)*4; let c;
      if(!Lay.land[k]){ const d = Lay.dW[k]; c = d < 0.8 ? [255,255,255] : d < 4 ? [143,226,214] : d < 12 ? [95,192,214] : [74,163,204]; }
      else c = Lay.dL[k] < 2.5 ? [243,223,174] : [167,214,118];
      img.data[o] = c[0]; img.data[o+1] = c[1]; img.data[o+2] = c[2]; img.data[o+3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = g.lineJoin = 'round';
    const trace = (pts, closed) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x - Lay.MIN, p.z - Lay.MIN) : g.moveTo(p.x - Lay.MIN, p.z - Lay.MIN)); if(closed) g.closePath(); g.stroke(); };
    g.strokeStyle = '#6b6573'; g.lineWidth = 6.6; for(const r of Lay.roads) trace(r.pts, r.closed);
    g.strokeStyle = '#d9a066'; g.lineWidth = 7.4; for(const b of Lay.bridges) trace(Lay.roads[b.road].pts.slice(b.a, b.b + 1), false);
    g.fillStyle = '#f3e2b8'; g.beginPath(); g.arc(-Lay.MIN, -Lay.MIN, 9, 0, 7); g.fill();
    try {
      ctx.hud.minimapLayers.push((m, toMap) => {
        const [x0, y0] = toMap(Lay.MIN, Lay.MIN), [x1, y1] = toMap(Lay.MIN + Lay.SIZE, Lay.MIN + Lay.SIZE);
        m.drawImage(cv, x0, y0, x1 - x0, y1 - y0);
        for(const z of zones){ const [px, py] = toMap(z.x, z.z); m.fillStyle = '#ffffff'; m.beginPath(); m.arc(px, py, 7, 0, 7); m.fill(); m.fillStyle = z.color; m.beginPath(); m.arc(px, py, 5, 0, 7); m.fill(); }
      });
    } catch(e){ console.warn('[map] minimap layer unavailable', e); }
  }

  const Lay = layout(zones);
  const stats = {};
  const artKit = { roadMats:{} };   // handed to art.js: the scatter lists and helpers it dresses on top of
  buildGround(); buildWater(); buildRoads(); buildBridges(); stats.shore = buildShore(); Object.assign(stats, buildScatter());

  function buildSpawn(){
    const g = new THREE.Group(); scene.add(g);
    board(g, -9, -2, 5.2, 2.6, DRAW.welcome, { rot: 0.5 });
    solidBox(-9, -2, 0.5, 5.4, 0.5, 3);
    // alphabet blocks: ANDREW over LIU, knockable
    const colors = ['#ff6b6b','#ffd166','#06d6a0','#4cc9f0','#b5179e','#f77f00'];
    const put = (word, z, off=0) => [...word].forEach((ch, i) => {
      const t = canvasTex(128, 128, g2 => { g2.fillStyle = colors[(i+off)%colors.length]; g2.fillRect(0,0,128,128); g2.strokeStyle = '#ffffff99'; g2.lineWidth = 10; g2.strokeRect(6,6,116,116); g2.fillStyle = '#fff'; g2.font = '700 84px Fredoka, sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(ch, 64, 70); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2), new THREE.MeshStandardMaterial({ map:t.tex, roughness:.7 })); m.castShadow = m.receiveShadow = true;
      prop(m, new CANNON.Box(new CANNON.Vec3(.6,.6,.6)), 1, (i - (word.length-1)/2)*1.35, 0.61, z);
    });
    put('ANDREW', -7); put('LIU', -8.5, 3);
    // three wandering citizens around the plaza
    const wcol = ['#ffb4a2','#a0c4ff','#caffbf'];
    for(let i=0;i<3;i++) blob(wcol[i], -4 + i*4, 4, { wander:{ cx:0, cz:0, r:22 }, face:false, speed:4 });
  }
  function buildZones(){
    for(const z of zones){
      const f = frameOf(z); const g = new THREE.Group(); g.position.set(z.x, 0, z.z); g.rotation.y = f.ang; scene.add(g);
      const W = (lx, lz) => f.w(lx, lz);
      const boardAt = (lx, lz, w, h, draw, o={}) => { board(g, lx, lz, w, h, draw, o); const [bx, bz] = W(lx, lz); solidBox(bx, bz, f.ang + (o.rot || 0), w+0.4, 0.5, 3); };
      switch(z.id){
        case 'blueberry': {
          if(!house(z, f, g, { w:12, d:8, h:6, color:'#6d80e0', roofColor:'#2c3a8f' })){   // the houses.js design has its own giant berry
            ball(2.4, '#3b4f9e', 0, 9.4, 0, g, 28);
            for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; const c = mesh(new THREE.ConeGeometry(0.35, 0.9, 6), '#23306b', Math.cos(a)*0.55, 11.7, Math.sin(a)*0.55, g); c.rotation.z = Math.cos(a)*0.8; c.rotation.x = -Math.sin(a)*0.8; }
          }
          boardAt(-5.5, 7, 5.4, 3, DRAW.blueberry, { animate:true, rot:0.25 });
          // the team of five
          [-3,-1.5,0,1.5,3].forEach((lx, i) => { const [x, zz] = W(lx + 3, 6.5 + (i%2)*0.8); berry(x, zz); });
          // benzene sculpture
          const mol = new THREE.Group(); mol.position.set(7.5, 2.6, 4); g.add(mol);
          for(let i=0;i<6;i++){ const a = i/6*Math.PI*2; ball(0.38, '#3d3d4a', Math.cos(a)*1.4, Math.sin(a)*1.4, 0, mol, 14); const s = cyl(0.09, 0.09, 1.4, '#c9ced8', Math.cos(a+Math.PI/6)*1.21, Math.sin(a+Math.PI/6)*1.21, 0, mol, 8); s.rotation.z = a + Math.PI/6; }
          cyl(0.12, 0.2, 1.3, '#9aa3b8', 7.5, 0.65, 4, g, 8); spinners.push(mol);
          const [sx, sz] = W(7.5, 4); solidCircle(sx, sz, 0.4);
          for(const [lx, lz] of [[-9,4],[9,8]]){ const [cx, cz] = W(lx, lz); trafficCone(cx, cz); }
          break;
        }
        case 'brain': {
          const glass = box(10, 5, 7, '#cfeeff', 0, 2.5, 0, g, { transparent:true, opacity:.32 }); glass.castShadow = false;
          for(const [fx, fz] of [[-5,-3.5],[5,-3.5],[-5,3.5],[5,3.5]]) box(0.2, 5, 0.2, '#ffffff', fx, 2.5, fz, g);
          roof(g, 10, 7, 2.2, 5, '#e8f7ff').children[0].material = mat('#e8f7ff', { transparent:true, opacity:.55 });
          const hedge = ball(1.8, '#5f9e45', 0, 2.0, 0, g, 18); hedge.scale.set(1.2, 0.9, 0.9);
          for(let i=0;i<10;i++){ const a = i/10*Math.PI*2; ball(0.6, '#6fae4a', Math.cos(a)*1.4, 2.6 + Math.sin(i*2)*0.2, Math.sin(a)*0.9, g, 10); }
          const [hx, hz] = W(0, 0); solidBox(hx, hz, f.ang, 10, 7, 5);
          boardAt(4.5, 7, 5, 3, DRAW.brain, { animate:true, rot:-0.25 });
          { const [x, zz] = W(-3, 6); brainBuddy(x, zz); }
          { const [x, zz] = W(-5.5, 5); brainBuddy(x, zz); }
          break;
        }
        case 'studio': {
          house(z, f, g, { w:10, d:7, h:5, color:'#4a3f5e', roofColor:null, windows:false });
          for(const sx of [-2.2, 2.2]){ const reel = new THREE.Group(); reel.position.set(sx, 6.8, 0); g.add(reel); const r = mesh(new THREE.TorusGeometry(1.4, 0.25, 10, 24), '#1b1b24', 0, 0, 0, reel); for(let i=0;i<3;i++){ const sp = box(0.18, 2.6, 0.18, '#1b1b24', 0, 0, 0, reel); sp.rotation.z = i*Math.PI/3; } spinners.push(reel); }
          boardAt(0, 6.5, 6.4, 3.4, DRAW.studio, { animate:true, frame:'#1b1b24', lift:1.2 });
          { const [x, zz] = W(-4.5, 7.5); blob('#ffd6a5', x, zz, { hat:'beret' }); }
          for(const lx of [4, 5.2]){ const [cx, cz] = W(lx, 8.5); crate(cx, cz, '#b79bd6'); }
          break;
        }
        case 'dock': {
          const deck = box(16, 0.3, 9, '#c89b6d', 0, 0.15, -1, g); deck.castShadow = false;
          for(let i=-7;i<=7;i+=1.4){ const pl = box(0.06, 0.02, 9, '#a47a4f', i, 0.31, -1, g); pl.castShadow = false; }
          house(z, f, g, { w:6, d:4, h:3.6, color:'#2f9e8f', roofColor:'#1f6f64', lz:-3.5, y:0.3 });
          boardAt(-4.5, 5.5, 5, 3, DRAW.dock, { rot:0.2 });
          for(let i=0;i<3;i++){ const [x, zz] = W(-3 + i*3, 1.5); robot(x, zz, { wander:{ cx:W(0,1)[0], cz:W(0,1)[1], r:5.5 }, speed:9 }); }
          for(const lx of [5.5, 6.6, 6.0]){ const [cx, cz] = W(lx, 3 + (lx===6.0?1.1:0)); crate(cx, cz, '#8fd1c6'); }
          break;
        }
        case 'school': {
          if(!house(z, f, g, { w:11, d:7, h:5, color:'#d9534f', roofColor:'#7a2e2b' })){   // the design has its own bell tower
            box(1.8, 2.2, 1.8, '#f3e2b8', 0, 7.2, 0, g); roof(g, 1.8, 1.8, 1.4, 8.3, '#7a2e2b'); ball(0.4, '#ffd166', 0, 7.2, 0.95, g, 12);
          }
          boardAt(-5.2, 7.2, 5.2, 2.8, DRAW.chalk, { frame:'#5a3d26', rot:0.2 });
          const kids = ['#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#bdb2ff'];
          kids.forEach((c, i) => { const [x, zz] = W(-3.4 + (i%3)*3.4, 11 + Math.floor(i/3)*1.8); const k = blob(c, x, zz, { face:false }); k.g.rotation.y = f.ang + Math.PI; k.yaw = k.g.rotation.y; });
          break;
        }
        case 'umd': {
          for(const sx of [-4, 4]) box(1.4, 6, 1.4, '#a8432f', sx, 3, 0, g);
          box(10, 1.2, 1.6, '#a8432f', 0, 6.6, 0, g); box(10.4, 0.3, 1.9, '#f3e2b8', 0, 7.35, 0, g);
          for(const sx of [-4, 4]){ const [px, pz] = W(sx, 0); solidBox(px, pz, f.ang, 1.4, 1.4, 6); }
          cyl(1.6, 1.8, 1.2, '#b8b2a7', -6, 0.6, 5, g, 20); { const [px, pz] = W(-6, 5); solidCircle(px, pz, 1.7, 1.2); }
          const statue = terrapin(0, 0, 2.2, { face:false, amp:0 }); statue.g.removeFromParent(); g.add(statue.g); statue.g.position.set(-6, 1.2, 5); statue.static = true;
          statue.g.traverse(o => { if(o.isMesh && o.material !== mats.get('#1b1b24') && o.material !== mats.get('#ffffff')) o.material = mat('#9a8f5a', { metalness:.35, roughness:.45 }); });
          boardAt(4.8, 6.5, 4.8, 2.8, DRAW.umd, { frame:'#ffd200', rot:-0.2 });
          { const [x, zz] = W(0, 8); terrapin(x, zz, 0.8, { wander:{ cx:W(0,8)[0], cz:W(0,8)[1], r:4 }, face:false, speed:1.6 }); }
          { const [x, zz] = W(2.5, 4); blob('#ffd200', x, zz, { hat:'cap', hatColor:'#c8102e' }); }
          break;
        }
        case 'clinic': {
          if(!house(z, f, g, { w:12, d:8, h:5, color:'#f7fbfd', roofColor:null, door:'#4fa3c7' })){   // the design has its own band and turning tooth
            box(12.05, 0.5, 8.05, '#4fa3c7', 0, 4.2, 0, g);
            // big tooth sign on the roof
            const sign = new THREE.Group(); sign.position.set(0, 5, 0); sign.scale.setScalar(2.2); g.add(sign);
            const tb = ball(0.62, '#ffffff', 0, 1.0, 0, sign, 20); tb.scale.set(1, .85, .6); for(const sx of [-.28,.28]){ const r = mesh(new THREE.ConeGeometry(0.2, 0.7, 12), '#ffffff', sx, 0.38, 0, sign); r.rotation.x = Math.PI; }
            spinners.push(sign);
          }
          { const [x, zz] = W(3.5, 6.5); tooth(x, zz, 1.2); }
          // the figurine, fixed on a pedestal by the door
          const fig = new THREE.Group(); fig.position.set(-2.4, 0, 4.7); g.add(fig);
          box(0.8, 0.8, 0.8, '#d8cbb3', 0, 0.4, 0, fig);
          cyl(0.2, 0.32, 0.8, '#fbf8f0', 0, 1.2, 0, fig, 14); box(0.62, 0.12, 0.12, '#fbf8f0', 0, 1.35, 0, fig); ball(0.17, '#e8c9a0', 0, 1.74, 0, fig, 14); cyl(0.19, 0.12, 0.14, '#7a5236', 0, 1.78, -0.03, fig, 12);
          const [fx, fz] = W(-2.4, 4.7); solidBox(fx, fz, f.ang, 0.8, 0.8, 1);
          boardAt(-6.2, 7.2, 5, 2.8, DRAW.clinic, { rot:0.25 });
          break;
        }
        case 'chapel': {
          if(!house(z, f, g, { w:7, d:9, h:5, color:'#fbf6ea', roofColor:'#8a6440' })){   // the design has its own steeple and cross
            box(1.8, 3, 1.8, '#fbf6ea', 0, 6.4, 2.6, g); roof(g, 1.8, 1.8, 2, 7.9, '#8a6440');
            box(0.22, 1.5, 0.22, '#c9a24a', 0, 10.5, 2.6, g); box(0.9, 0.22, 0.22, '#c9a24a', 0, 10.75, 2.6, g);
          }
          boardAt(5.5, 7, 4.8, 2.8, DRAW.chapel, { rot:-0.25 });
          const ring = ['#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#bdb2ff','#ffc6ff','#ffb4a2','#e5989b','#b5e48c','#99d98c'];
          const [rcx, rcz] = W(-5, 9.5);
          ring.forEach((c, i) => { const a = i/ring.length*Math.PI*2; const x = rcx + Math.cos(a)*3.2, zz = rcz + Math.sin(a)*3.2; const b = blob(c, x, zz, { face:false, amp:0.08 }); b.g.rotation.y = Math.atan2(rcx - x, rcz - zz); b.yaw = b.g.rotation.y; });
          const bench = cyl(0.6, 0.6, 0.4, '#b98a5a', rcx, 0.2, rcz, scene, 16); solidCircle(rcx, rcz, 0.6, 0.4);
          break;
        }
        case 'skills': {
          const lane = box(3.2, 0.08, 18, '#e8c79a', 0, 0.05, -2, g); lane.castShadow = false;
          for(const sx of [-1.8, 1.8]){ const gut = box(0.4, 0.3, 18, '#b98a5a', sx, 0.15, -2, g); }
          boardAt(4.8, 6.5, 4.8, 2.8, DRAW.skills, { rot:-0.2 });
          const skills = ['Python','TypeScript','JavaScript','Kotlin','Java','SQL','React','Supabase','Postgres','Claude'];
          let k = 0;
          for(let row=0; row<4; row++) for(let i=0; i<=row; i++){
            const lx = (i - row/2) * 0.75, lz = -8 - row*0.65; const [x, zz] = W(lx, lz);
            const pin = new THREE.Group(); const body = cyl(0.2, 0.28, 1.1, '#ffffff', 0, 0, 0, pin, 14); cyl(0.205, 0.215, 0.12, '#e5484d', 0, 0.25, 0, pin, 14);
            const lab = label(skills[k++]); lab.position.y = 1.0; lab.scale.set(1.9, 0.54, 1); pin.add(lab);
            prop(pin, new CANNON.Cylinder(0.2, 0.28, 1.1, 10), 0.5, x, 0.56, zz, 0, 'clink');
          }
          { const [bx, bz] = W(0, 3.5); const b = new THREE.Group(); ball(0.55, '#3b4f9e', 0, 0, 0, b, 20); for(const [a,c] of [[.2,.3],[-.1,.35],[.05,.1]]) ball(0.07, '#1b1b24', a, c, 0.48, b, 8); prop(b, new CANNON.Sphere(0.55), 5, bx, 0.56, bz, 0); }
          break;
        }
        case 'yard': {
          // garden beds
          for(const [lx, lz] of [[-6,-2],[-6,1.5]]){ box(4, 0.5, 2.2, '#8a5a3b', lx, 0.25, lz, g); for(let i=0;i<5;i++) ball(0.35, i%2 ? '#6fae4a' : '#8cc15a', lx - 1.5 + i*0.75, 0.7, lz, g, 10); const [bx, bz] = W(lx, lz); solidBox(bx, bz, f.ang, 4, 2.2, 0.5); }
          // kitchen truck
          const truck = new THREE.Group(); truck.position.set(2.5, 0, -2); g.add(truck);
          box(6, 3, 3, '#fffaf0', 0, 2, 0, truck); box(1.8, 2.2, 3, '#e98a5a', 3.9, 1.6, 0, truck); box(3.6, 1.2, 0.1, '#1f2a44', -0.3, 2.3, 1.52, truck);
          const awn = box(4.2, 0.12, 1.4, '#e5484d', -0.3, 3.2, 2.1, truck); awn.rotation.x = 0.3;
          for(const [wx, wz] of [[-2,1.5],[2.8,1.5],[-2,-1.5],[2.8,-1.5]]){ const w = cyl(0.5, 0.5, 0.35, '#1f2a44', wx, 0.5, wz, truck, 14); w.rotation.x = Math.PI/2; }
          const pot = cyl(0.3, 0.26, 0.35, '#3a3531', -1.2, 3.1, 1.3, truck, 12);
          { const [tx, tz] = W(3.2, -2); solidBox(tx, tz, f.ang, 8, 3.2, 3); }
          { const [x, zz] = W(-0.5, 1.2); blob('#ffffff', x, zz, { hat:'cap', hatColor:'#ffffff' }); }
          // barbell and plates, knockable
          { const [bx, bz] = W(5.5, 4.5); const bar = new THREE.Group(); const rod = cyl(0.06, 0.06, 2.6, '#c9c2b8', 0, 0, 0, bar, 8); rod.rotation.z = Math.PI/2; for(const sx of [-1.05, 1.05]){ const p = cyl(0.45, 0.45, 0.16, '#e98a5a', sx, 0, 0, bar, 18); p.rotation.z = Math.PI/2; }
            prop(bar, new CANNON.Box(new CANNON.Vec3(1.3, .45, .45)), 3, bx, 0.46, bz, f.ang, 'clink'); }
          { const [kx, kz] = W(7, 3); const kb = new THREE.Group(); ball(0.35, '#2a2a33', 0, 0, 0, kb, 14); const hnd = mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 16), '#2a2a33', 0, 0.38, 0, kb); prop(kb, new CANNON.Sphere(0.36), 2, kx, 0.37, kz, 0, 'clink'); }
          boardAt(-4.4, 6.5, 4.8, 2.8, DRAW.yard, { rot:0.15 });
          break;
        }
        case 'now': {
          for(let i=0;i<8;i++){ const a = i/8*Math.PI*2; box(0.18, 1, 0.18, '#ffffff', Math.cos(a)*3.2, 0.5, Math.sin(a)*3.2 - 1, g); }
          const soil = cyl(3, 3, 0.2, '#8a5a3b', 0, 0.1, -1, g, 24); soil.castShadow = false;
          const sprout = new THREE.Group(); sprout.position.set(0, 0.2, -1); g.add(sprout); cyl(0.05, 0.06, 0.8, '#5f9e45', 0, 0.4, 0, sprout, 6); for(const s of [-1,1]){ const l = ball(0.22, '#8cc15a', s*0.2, 0.85, 0, sprout, 10); l.scale.set(1.4, .4, .8); }
          spinners.push(sprout);
          { const [sx, sz] = W(0, -1); solidCircle(sx, sz, 3.3, 1); }
          boardAt(4.5, 3.5, 4.6, 2.8, DRAW.now, { animate:true, rot:-0.3 });
          { const [x, zz] = W(-4, 2.5); blob('#fdffb6', x, zz); }
          break;
        }
        case 'contact': {
          const mb = new THREE.Group(); g.add(mb); cyl(0.14, 0.14, 1.4, '#6b4a33', 0, 0.7, 0, mb, 8);
          box(1.3, 1.0, 1.9, '#d9534f', 0, 1.9, 0, mb); const top = cyl(0.65, 0.65, 1.9, '#d9534f', 0, 2.4, 0, mb, 16); top.rotation.x = Math.PI/2;
          const flag = new THREE.Group(); flag.position.set(0.7, 2.2, -0.3); mb.add(flag); box(0.06, 1.0, 0.06, '#ffd166', 0, 0.3, 0, flag); box(0.06, 0.35, 0.45, '#ffd166', 0, 0.65, 0.22, flag);
          wavers.push(flag);
          { const [mx, mz] = W(0, 0); solidCircle(mx, mz, 1, 3); }
          boardAt(4, 2.5, 4.4, 2.5, DRAW.contact, { rot:-0.35 });
          { const [x, zz] = W(-2.5, 2.5); blob('#a0c4ff', x, zz); }
          break;
        }
      }
      // a name label floating over each place
      const lab = label(z.name, z.color, '#ffffff'); lab.scale.set(5, 1.45, 1); lab.position.set(0, z.id === 'contact' ? 5.5 : 12.5, 0); g.add(lab);
    }
  }
  const spinners = [], wavers = [];

  /* Clouds */
  const clouds = [];
  function buildClouds(){ for(let i=0;i<9;i++){ const c = new THREE.Group(); for(let k=0;k<4;k++){ const b = ball(2 + rng()*1.5, '#ffffff', k*2.2 - 3, rng()*1.2, rng()*1.5, c, 12); b.castShadow = false; b.receiveShadow = false; } c.position.set(rng()*360 - 180, 34 + rng()*14, rng()*360 - 180); scene.add(c); clouds.push(c); } }

  buildSpawn(); buildZones(); buildPier(); buildClouds(); buildMinimap();

  // Ambient motion: spinning signs, the mailbox flag, drifting clouds, water, bobbing boats.
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    if(waterMat) waterMat.uniforms.uTime.value = ctx.state.reduced ? 0 : t;
    if(ctx.state.reduced) return;
    for(const s of spinners) s.rotation.y += dt*0.6;
    for(const w of wavers) w.rotation.x = Math.sin(t*3)*0.3;
    for(const c of clouds){ c.position.x += dt*1.2; if(c.position.x > 200) c.position.x = -200; }
    for(const b of bobbers){ b.o.position.y = b.base + Math.sin(t*1.6 + b.ph)*0.06; b.o.rotation.z = Math.sin(t*1.1 + b.ph)*0.05; }
  }, 70);

  // Doors swing open while the player is within DOOR_NEAR metres of them and close when they leave.
  // p walks 0..1 at a steady rate and the angle is smoothstep(p), so each swing eases in and out.
  // A negative rotation.y turns the free edge out toward the player (see _test/houses.html).
  const DOOR_NEAR = 6, DOOR_SWING = 1.35;
  ctx.onUpdate((dt, t, mode) => {
    const P = ctx.state.player; if(mode === 'interior' || !P) return;
    for(const s of swingDoors){
      const want = Math.hypot(P.x - s.x, P.z - s.z) < DOOR_NEAR ? 1 : 0; if(s.p === want) continue;
      s.p = ctx.state.reduced ? want : want > s.p ? Math.min(1, s.p + dt/0.7) : Math.max(0, s.p - dt/0.9);
      const e = s.p*s.p*(3 - 2*s.p);
      s.door.rotation.y = -DOOR_SWING*e; s.door.material.emissiveIntensity = 0.12 + 0.3*e;
    }
  }, 70);

  // Door exits in each zone's local frame (+z faces the plaza). The player is put here, facing
  // away from the building, when leaving that zone's interior. Chosen to clear every collider.
  const DOORS = {
    blueberry:[0, 5.8], brain:[0, 5.3], studio:[-5.6, 5.3], dock:[0, 0.4], school:[0, 5.1], umd:[0, 3],
    clinic:[0, 5.7], chapel:[0, 6.2], skills:[0, 6.5], yard:[0, 3.5], now:[0, 4.8], contact:[0, 3],
  };
  const zoneOf = id => zones.find(z => z.id === id);
  Object.assign(ctx.island, {
    radius: Lay.radius,
    spawn: { x:0, z:6, heading:Math.PI },
    approachOf(id){ const z = zoneOf(id); if(!z) return null; const [x, zz] = frameOf(z).w(0, 13); return { x, z:zz, heading:Math.atan2(z.x - x, z.z - zz) }; },
    doorOf(id){ const z = zoneOf(id); if(!z) return null; const f = frameOf(z); const [lx, lz] = DOORS[id] || [0, 10]; const [x, zz] = f.w(lx, lz); return { x, z:zz, heading:f.ang }; },
  });

  // Critic hooks: a high overview of the whole island (O toggles it), and named spots to jump to.
  let overview = null; const saved = {};
  function setOverview(on = true, height = 430){
    if(on && !overview){ saved.far = ctx.camera.far; saved.fog = scene.fog ? [scene.fog.near, scene.fog.far] : null; saved.shadow = ctx.sun.castShadow; ctx.sun.castShadow = false; }
    if(!on && overview){ ctx.sun.castShadow = saved.shadow; ctx.camera.far = saved.far; ctx.camera.updateProjectionMatrix(); if(saved.fog && scene.fog){ scene.fog.near = saved.fog[0]; scene.fog.far = saved.fog[1]; } }
    overview = on ? { h:height } : null; return !!overview;
  }
  ctx.onUpdate((dt, t, mode) => {
    if(!overview || mode === 'interior') return;
    const cam = ctx.camera; cam.far = 3000; cam.position.set(0, overview.h, overview.h*0.36); cam.lookAt(0, 0, 4); cam.updateProjectionMatrix();
    if(scene.fog){ scene.fog.near = 2000; scene.fog.far = 3000; }
  }, 92);
  ctx.bus.on('key', ({ code, down, repeat }) => { if(code === 'KeyO' && down && !repeat && ctx.state.mode !== 'interior') setOverview(!overview); });
  const along = (road, k) => { const p = Lay.roads[road].pts[k]; return { x:p.x, z:p.z, heading:Math.atan2(p.tx, p.tz) }; };
  const SPOTS = {};
  Lay.bridges.forEach((b, i) => { SPOTS['bridge' + (i + 1)] = along(b.road, Math.max(0, b.a - 14)); });
  { const a = 80*Math.PI/180, R = Lay.coast(a) - 3.5; SPOTS.beach = { x:Math.cos(a)*R, z:Math.sin(a)*R, heading:Math.atan2(Math.cos(a), Math.sin(a)) }; }
  // each lake and each cove head: the nearest dry road sample off any bridge, facing the water
  const facing = (cx, cz) => { let best = null, bd = 1e9; Lay.roads.forEach((r, ri) => r.pts.forEach((p, k) => { const d = Math.hypot(p.x - cx, p.z - cz); if(d < bd && !Lay.onBridge(ri, k)){ bd = d; best = p; } }));
    return best && { x:best.x, z:best.z, heading:Math.atan2(cx - best.x, cz - best.z) }; };
  Lay.lakes.forEach(L => { SPOTS['lake-' + L.name] = facing(L.c[0], L.c[1]); });
  SPOTS.lake = SPOTS['lake-central'];
  Lay.coves.forEach((cv, i) => { const a = cv.deg*Math.PI/180; SPOTS['cove' + (i + 1)] = facing(Math.cos(a)*cv.head, Math.sin(a)*cv.head); });
  // the river: the approach to the lake loop's bridge over the east river
  { const i = Lay.bridges.findIndex(q => Lay.roads[q.road].name === 'lake' && q.mid.x > 0); if(i >= 0) SPOTS.river = SPOTS['bridge' + (i + 1)]; }
  function goto(name){
    const s = SPOTS[name]; if(!s) return false;
    if(ctx.state.mode === 'interior') ctx.modes.exitInterior();
    ctx.modes.placePlayer(s.x, s.z, s.heading); ctx.bus.emit('teleport', { zoneId:null, spot:name, x:s.x, z:s.z }); return true;
  }
  try { ctx.expose('map', { overview:setOverview, goto, spots:() => Object.keys(SPOTS), doors:() => swingDoors.map(s => ({ zone:s.zone, open:+s.p.toFixed(2), x:+s.x.toFixed(1), z:+s.z.toFixed(1) })), stats:() => ({ ...stats, radius:Lay.radius, bridges:Lay.bridges.length, roads:Lay.roads.length, colliders:ctx.colliders.length }) }); }
  catch(e){ console.warn('[map] expose failed', e); }

  // Art pass: bank and zone vegetation, lamps, leaves and clutter, wind, the start-screen diorama.
  // Its own file, loaded softly: without it the island is plainer but complete.
  try { const art = await import('./art.js'); stats.art = art.dress(ctx, { Lay, inst, merge, flatMat, WATER_Y, houses, waterMat, ...artKit }); }
  catch(e){ console.warn('[map] art pass unavailable', e); }

  return { spinners, wavers, clouds, DRAW, DOORS, layout:Lay, overview:setOverview, goto };
}

/* ======================================================================== */
/* Layout: pure data, no THREE. Coastline, lakes, rivers, islets, roads and */
/* bridges, all derived from the zone positions in data/zones.js.           */
/* Exported so it can be checked without a browser.                         */
/* ======================================================================== */
export function layout(zones){
  const D = Math.PI/180;
  const P = (R, deg) => [R*Math.cos(deg*D), R*Math.sin(deg*D)];
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const angOf = z => Math.atan2(z.z, z.x), radOf = z => Math.hypot(z.x, z.z);
  const Z = id => zones.find(z => z.id === id);
  // The point d metres in front of a zone, toward the plaza. Roads pass through front(id, 17).
  const front = (id, d = 17) => { const z = Z(id); if(!z) return null; const R = radOf(z), s = (R - d)/R; return [z.x*s, z.z*s]; };
  const outer = zones.filter(z => radOf(z) > 80);
  const dock = Z('dock');

  // Deep sea coves between outer zones: the angle, the radius of the cove head, the mouth width.
  const COVES = [
    { deg:24, head:86, mouth:17, bend:6 }, { deg:114, head:88, mouth:17, bend:-5 }, { deg:-158, head:94, mouth:17, bend:5 },
    { deg:46, head:124, mouth:20, bend:0, arm:false },   // the dock's harbour
  ];
  // Coastline radius by angle: a rounded square with layered sines, pushed out behind every outer zone, pulled in behind
  // the dock so its deck hangs over the sea, and dented where each cove opens.
  function coast(a){
    const q = Math.pow(Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4), 1/4);
    let c = 135/q + 3*Math.sin(3*a + 0.7) + 2.5*Math.sin(5*a + 2.1) + 2*Math.sin(11*a + 0.3) + 1.5*Math.sin(17*a + 1);
    for(const z of outer){ if(z === dock) continue; const d = wrap(a - angOf(z)); c = Math.max(c, radOf(z) + 17 - 176*d*d); }
    if(dock){ const d = wrap(a - angOf(dock)); c = Math.min(c, radOf(dock) + 3 + 300*d*d); }
    for(const cv of COVES){ if(cv.arm === false) continue; const d = wrap(a - cv.deg*D); c -= 9*Math.exp(-(d/0.2)*(d/0.2)); }
    return c;
  }
  const CT = new Float32Array(2049); for(let k=0; k<=2048; k++) CT[k] = coast(k/2048*Math.PI*2 - Math.PI);
  const coastFast = a => { const u = (a + Math.PI)/(Math.PI*2)*2048, k = Math.min(2047, Math.floor(u)), f = u - k; return CT[k]*(1 - f) + CT[k+1]*f; };

  // 0.5 m grid over the whole island and its islets
  const N = 736, RES = 0.5, MIN = -184, SIZE = N*RES;
  const land = new Uint8Array(N*N);
  for(let j=0; j<N; j++){ const z = MIN + (j + .5)*RES; for(let i=0; i<N; i++){ const x = MIN + (i + .5)*RES; const r = Math.sqrt(x*x + z*z); land[j*N + i] = r < 90 ? 1 : r > 170 ? 0 : r < coastFast(Math.atan2(z, x)) ? 1 : 0; } }
  const cell = (x, z) => { const i = Math.floor((x - MIN)/RES), j = Math.floor((z - MIN)/RES); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j*N + i; };
  function stamp(cx, cz, r, val, wob = 0, seed = 0){
    const R = r*(1 + wob) + 1;
    const i0 = Math.max(0, Math.floor((cx - R - MIN)/RES)), i1 = Math.min(N-1, Math.ceil((cx + R - MIN)/RES));
    const j0 = Math.max(0, Math.floor((cz - R - MIN)/RES)), j1 = Math.min(N-1, Math.ceil((cz + R - MIN)/RES));
    for(let j=j0; j<=j1; j++){ const z = MIN + (j + .5)*RES; for(let i=i0; i<=i1; i++){ const x = MIN + (i + .5)*RES;
      const dx = x - cx, dz = z - cz, th = Math.atan2(dz, dx);
      const rr = wob ? r*(1 + wob*Math.sin(3*th + seed)*Math.cos(2*th + seed*1.7)) : r;
      if(dx*dx + dz*dz < rr*rr) land[j*N + i] = val; } }
  }
  // Carve (or raise) a channel along a spline, radius easing r0 -> r1 with a slow wobble.
  const wobble = (s, seed) => 0.6*Math.sin(s*0.083 + seed) + 0.4*Math.sin(s*0.21 + seed*2.3);
  function carve(ctrl, r0, r1, wob = 0.16, seed = 0, val = 0){
    const pts = crSample(ctrl, false, 0.5), L = pts[pts.length - 1].s || 1;
    for(const p of pts){ const r = (r0 + (r1 - r0)*p.s/L)*(1 + wob*wobble(p.s, seed)); stamp(p.x, p.z, Math.max(0.8, r), val); }
    return pts;
  }

  // Lakes: overlapping wobbly blobs plus fingers, short tapering arms that make the shore irregular.
  // fingers: [direction deg, length past the blob, width at the root, bend]
  const LAKES = [
    { name:'central', c:[-20,-48], parts:[[0,0,18],[11,-6,13],[-10,6,12],[-6,-11,12],[9,8,9]],
      fingers:[[-150,9,5,3],[-60,8,4.5,-3],[40,7,4.5,2],[120,8,4,-3],[165,7,4,3]] },
    { name:'southeast', c:[42,65], parts:[[0,0,13],[-6,4,9],[6,-5,8]], fingers:[[130,9,4,3],[175,7,3.5,-3],[-95,7,3.5,2],[40,4,3,-2]], islet:[2, -1, 2.2] },
    { name:'northeast', c:[32,-92], parts:[[0,0,12],[7,-4,9],[-7,-3,8]], fingers:[[-120,9,4,3],[-60,9,3.5,-3],[-5,8,3.5,2],[200,6,3,-2]] },
  ];
  LAKES.forEach((L, k) => {
    for(const [dx, dz, r] of L.parts) stamp(L.c[0] + dx, L.c[1] + dz, r, 0, 0.12, k*2 + dx);
    const R0 = L.parts[0][2];
    L.fingers.forEach(([deg, len, w, bend], f) => {
      const ux = Math.cos(deg*D), uz = Math.sin(deg*D), px = -uz, pz = ux, at = t => [L.c[0] + ux*t, L.c[1] + uz*t];
      const m = at(R0 + len*0.5); carve([at(R0*0.6), [m[0] + px*bend, m[1] + pz*bend], at(R0 + len)], w, w*0.35, 0.12, k*7 + f);
    });
  });

  // Rivers: the central lake drains to the sea three ways (east, west, north), splitting the island
  // into three lobes; a creek runs from the south-east lake to the sea. Widths are 2 to 3 road widths.
  const RIVERS = [
    { name:'east',  ctrl:[[-6,-50],[18,-58],[42,-50],[62,-40],[86,-44],[110,-37],[172,-40]], r0:7, r1:9.5 },
    { name:'west',  ctrl:[[-34,-42],[-52,-32],[-66,-14],[-75,12],[-98,29],[-122,40],[-178,54]], r0:7, r1:9.5 },
    { name:'north', ctrl:[[-26,-58],[-34,-80],[-44,-102],[-52,-124],[-62,-178]], r0:6.5, r1:9.5 },
    { name:'creek', ctrl:[[46,72],[46,94],[50,116],[58,176]], r0:5, r1:7.5 },
  ];
  RIVERS.forEach((rv, k) => { rv.pts = carve(rv.ctrl, rv.r0, rv.r1, 0.14, 11 + k*5); });
  // Coves: a channel from open sea to the head, wide at the mouth, with a side arm for a ragged shore.
  COVES.forEach((cv, k) => {
    const mid = (180 + cv.head)/2;
    carve([P(180, cv.deg), P(mid, cv.deg + cv.bend*0.4), P(cv.head, cv.deg - cv.bend*0.3)], cv.mouth, 7, 0.18, 31 + k*3);
    if(cv.arm === false) return;
    const side = cv.bend > 0 ? 1 : -1, at = P(cv.head + 14, cv.deg - cv.bend*0.2);
    carve([at, P(cv.head + 8, cv.deg + side*9), P(cv.head + 5, cv.deg + side*14)], 5, 2, 0.12, 41 + k);
  });
  for(const L of LAKES) if(L.islet) stamp(L.c[0] + L.islet[0], L.c[1] + L.islet[1], L.islet[2], 1, 0.15, 3);

  // Islets offshore, placed just past the local coastline
  const ISLETS = [[10,6],[62,5],[-40,7],[150,5.5],[-175,4.5],[-100,3.5],[-20,3],[128,3.2]].map(([deg, r], k) => {
    const a = deg*D, R = coast(a) + r + 7 + (k%3)*2; const [x, z] = P(R, deg); stamp(x, z, r, 1, 0.18, k); return { x, z, r };
  });

  // Distance fields in metres: dW = water cell to nearest land, dL = land cell to nearest water
  function chamfer(src){
    const d = new Float32Array(N*N), INF = 1e6, S2 = Math.SQRT2;
    for(let k=0; k<N*N; k++) d[k] = land[k] === src ? 0 : INF;
    for(let j=0; j<N; j++) for(let i=0; i<N; i++){ const k = j*N + i; let v = d[k]; if(v === 0) continue;
      if(i > 0) v = Math.min(v, d[k-1] + 1);
      if(j > 0){ v = Math.min(v, d[k-N] + 1); if(i > 0) v = Math.min(v, d[k-N-1] + S2); if(i < N-1) v = Math.min(v, d[k-N+1] + S2); }
      d[k] = v; }
    for(let j=N-1; j>=0; j--) for(let i=N-1; i>=0; i--){ const k = j*N + i; let v = d[k]; if(v === 0) continue;
      if(i < N-1) v = Math.min(v, d[k+1] + 1);
      if(j < N-1){ v = Math.min(v, d[k+N] + 1); if(i < N-1) v = Math.min(v, d[k+N+1] + S2); if(i > 0) v = Math.min(v, d[k+N-1] + S2); }
      d[k] = v; }
    for(let k=0; k<N*N; k++) d[k] *= RES;
    return d;
  }
  const dW = chamfer(1), dL = chamfer(0);
  const landAt = (x, z) => { const k = cell(x, z); return k >= 0 && land[k] === 1; };
  const dWaterAt = (x, z) => { const k = cell(x, z); return k < 0 ? 99 : dW[k]; };
  const dLandAt = (x, z) => { const k = cell(x, z); return k < 0 ? 0 : dL[k]; };
  // Signed distance to the shoreline, bilinear: positive over water, negative on land.
  const sdCell = (i, j) => { if(i < 0 || j < 0 || i >= N || j >= N) return 30; const k = j*N + i; return land[k] ? -dL[k] : dW[k]; };
  const sdAt = (x, z) => { const u = (x - MIN)/RES - .5, v = (z - MIN)/RES - .5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    return (sdCell(i, j)*(1 - fu) + sdCell(i + 1, j)*fu)*(1 - fv) + (sdCell(i, j + 1)*(1 - fu) + sdCell(i + 1, j + 1)*fu)*fv; };

  // Roads: Catmull-Rom splines through hand-placed points. The outer loop passes 17 m in front of
  // every outer zone, bends inland round each cove head and crosses every river; the lake loop
  // circles the central lake and crosses its three outlets; spokes join the plaza to both.
  const F = front, roads = [];
  const road = (name, pts, closed = false) => roads.push({ name, closed, pts:crSample(pts.filter(Boolean), closed, 0.5) });
  road('outer', [
    F('studio'), [74,18], [62,36], [61,52], F('dock'), [52,90], [28,98], F('school'), [-14,76], [-42,60], F('umd'),
    [-80,48], [-89,27], F('clinic'), [-80,-18], [-72,-36], [-72,-50], F('chapel'), [-60,-88], [-46,-106], [-24,-104], F('blueberry'),
    [14,-78], [34,-70], [54,-66], F('brain'), [82,-52], [89,-27], [92,-12],
  ], true);
  road('lake', [[-18,-19], [4,-26], [14,-40], [12,-60], [0,-76], [-18,-80], [-40,-76], [-54,-62], [-58,-44], [-44,-21]], true);
  road('east', [[8,-4], [18,-1], F('skills'), [29,-19], [50,-27], [70,-24], [90,-21]]);
  road('south', [[0,8], [8,18], F('now'), [-4,34], [-8,58], [-4,76], F('school')]);
  road('west', [[-8,4], [-20,6], F('yard'), [-20,30], [-35,45], [-58,50], [-80,48]]);
  road('north', [[2,-8], F('contact'), [4,-26]]);
  road('nlink', [[-8,-79], [-6,-88], F('blueberry')]);
  road('wlink', [[-56,-54], [-66,-54], [-72,-50]]);

  // Bridges: wherever a road's centreline runs over water, extended 6 m onto each bank
  const bridges = [];
  roads.forEach((r, ri) => {
    const wet = r.pts.map(p => !landAt(p.x, p.z));
    for(let k=0; k<wet.length; k++){
      if(!wet[k]) continue; let e = k;
      for(;;){ let n = -1; for(let q=e+1; q<Math.min(wet.length, e+9); q++) if(wet[q]) n = q; if(n < 0) break; e = n; }
      const a = Math.max(0, k - 12), b = Math.min(r.pts.length - 1, e + 12);
      bridges.push({ road:ri, a, b, mid:r.pts[(a + b) >> 1] }); k = e;
    }
  });
  const onBridge = (ri, k) => bridges.some(b => b.road === ri && k >= b.a && k <= b.b);

  // 1 m road grids: distance to the nearest centreline, and which roads cover each cell
  const N1 = 368, rd = new Float32Array(N1*N1).fill(99*99), mask = new Uint16Array(N1*N1);
  roads.forEach((r, ri) => { for(let q=0; q<r.pts.length; q+=2){ const p = r.pts[q];
    const i0 = Math.max(0, Math.floor(p.x - 10 - MIN)), i1 = Math.min(N1-1, Math.ceil(p.x + 10 - MIN));
    const j0 = Math.max(0, Math.floor(p.z - 10 - MIN)), j1 = Math.min(N1-1, Math.ceil(p.z + 10 - MIN));
    for(let j=j0; j<=j1; j++){ const dz = MIN + j + .5 - p.z, dz2 = dz*dz; for(let i=i0; i<=i1; i++){ const dx = MIN + i + .5 - p.x, d2 = dx*dx + dz2, k = j*N1 + i; if(d2 < rd[k]) rd[k] = d2; if(d2 < 17.6) mask[k] |= 1 << ri; } }
  } });
  const c1 = (x, z) => { const i = Math.floor(x - MIN), j = Math.floor(z - MIN); return (i < 0 || j < 0 || i >= N1 || j >= N1) ? -1 : j*N1 + i; };
  const roadDistAt = (x, z) => { const k = c1(x, z); return k < 0 ? 99 : Math.sqrt(rd[k]); };
  const maskAt = (x, z) => { const k = c1(x, z); return k < 0 ? 0 : mask[k]; };

  // Self-check: roads stay on dry land off their bridges, zones sit on dry land
  function checks(){
    const out = [];
    roads.forEach((r, ri) => { let bad = 0, worst = 99; r.pts.forEach((p, k) => { if(onBridge(ri, k)) return; const d = landAt(p.x, p.z) ? dLandAt(p.x, p.z) : 0; if(d < 5) bad++; worst = Math.min(worst, d); }); if(bad) out.push(`${r.name}: ${bad} samples within 5 m of water (min ${worst.toFixed(1)})`); });
    for(const z of zones){ let worst = 99; for(let a=0; a<24; a++) for(const rr of [0, 7, 13]){ const x = z.x + Math.cos(a/24*Math.PI*2)*rr, zz = z.z + Math.sin(a/24*Math.PI*2)*rr; worst = Math.min(worst, landAt(x, zz) ? dLandAt(x, zz) : 0); } if(worst < (z === dock ? 0 : 2)) out.push(`zone ${z.id}: min dist to water ${worst.toFixed(1)}`); }
    return out;
  }

  let maxCoast = 0; for(let k=0; k<720; k++) maxCoast = Math.max(maxCoast, coast(k/720*Math.PI*2));
  return { N, RES, MIN, SIZE, land, dW, dL, coast, roads, bridges, onBridge, rivers:RIVERS, lakes:LAKES, coves:COVES, islets:ISLETS,
    landAt, dWaterAt, dLandAt, sdAt, roadDistAt, maskAt, checks, radius:Math.ceil(maxCoast) + 4 };
}

// Uniform Catmull-Rom through 2D points, resampled every `step` metres with unit tangents.
function crSample(pts, closed, step){
  const n = pts.length, dense = [];
  const ext = (a, b) => [2*a[0] - b[0], 2*a[1] - b[1]];
  const get = k => closed ? pts[((k % n) + n) % n] : k < 0 ? ext(pts[0], pts[1]) : k >= n ? ext(pts[n-1], pts[n-2]) : pts[k];
  const segs = closed ? n : n - 1;
  for(let s=0; s<segs; s++){
    const p0 = get(s-1), p1 = get(s), p2 = get(s+1), p3 = get(s+2);
    for(let k=0; k<32; k++){ const t = k/32, t2 = t*t, t3 = t2*t;
      const f = (a, b, c, d) => 0.5*(2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
  }
  dense.push(closed ? dense[0] : pts[n-1]);
  const out = []; let acc = 0, next = 0;
  for(let k=1; k<dense.length; k++){
    const a = dense[k-1], b = dense[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if(L < 1e-9) continue;
    while(next <= acc + L){ const u = (next - acc)/L; out.push({ x:a[0] + (b[0] - a[0])*u, z:a[1] + (b[1] - a[1])*u, s:next }); next += step; }
    acc += L;
  }
  if(closed && out.length > 2 && Math.hypot(out[out.length-1].x - out[0].x, out[out.length-1].z - out[0].z) < step*0.5) out.pop();
  const m = out.length;
  for(let k=0; k<m; k++){
    const a = closed ? out[(k - 1 + m) % m] : out[Math.max(0, k-1)], b = closed ? out[(k + 1) % m] : out[Math.min(m-1, k+1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; out[k].tx = dx/l; out[k].tz = dz/l;
  }
  return out;
}
