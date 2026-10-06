// Renderer, island scene, island camera and lights.
//
// Art direction: golden hour under a clean sky. A warm apricot key light with a cool blue sky
// fill, a gradient sky dome (deep blue overhead to a warm soft horizon) with painted clouds, and
// fog pushed far out so distant land stays crisp instead of dissolving into milk. The island view
// (and only the island view: interiors and the map snapshot render as before) goes through a small
// post chain: restrained bloom on emissive props, then one grade pass (tilt-shift at the frame
// edges, colour grade, vignette, sRGB out). atmosphere.js drives night and seasons through
// scene.userData.sky and scene.userData.post.
export function createRenderer(THREE, stage){
  const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const HORIZON = '#ffe2bf';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HORIZON);
  // Far fog only: the island itself stays crisp, the open sea fades into the horizon colour.
  scene.fog = new THREE.Fog(HORIZON, 150, 360);
  const camera = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.5, 400);

  // Fill: clean blue from above, terracotta bounce from below. This is the colour of every shadow,
  // so it is kept well under the key: shadows read as cool shapes, not as a grey or violet wash.
  const hemi = new THREE.HemisphereLight('#a9c0ff', '#e0a27a', 1.0);
  scene.add(hemi);
  // Key: apricot and a little low (art.js lowers the sun's offset), so trees throw long shadows.
  const sun = new THREE.DirectionalLight('#ffcf98', 2.75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -42;
  sun.shadow.camera.right = sun.shadow.camera.top = 42;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const sky = createSky(THREE, scene, camera);
  sky.hemi = hemi;
  scene.userData.sky = sky;
  setupPost(THREE, renderer, scene, camera);
  return { renderer, scene, camera, sun };
}

// Sky dome: one inside-out sphere that follows the camera, drawn first with no depth test, so it
// is always behind everything and never clipped. Gradient, painted clouds, stars and moon are all
// in the fragment shader (one draw, no textures). uNight 0..1 cross-fades day into night.
// Stars and the moon write alpha < 1, which the post chain reads as "glow" (see setupPost).
function createSky(THREE, scene, camera){
  const uniforms = {
    uNight:{ value:0 }, uTime:{ value:0 }, uCloud:{ value:1 },
    uTop:{ value:new THREE.Color('#2f6fd8') }, uMid:{ value:new THREE.Color('#86bdf2') }, uHorizon:{ value:new THREE.Color('#ffe2bf') },
    uNTop:{ value:new THREE.Color('#070b2e') }, uNMid:{ value:new THREE.Color('#1c1d63') }, uNHorizon:{ value:new THREE.Color('#4b3d8f') },
    uSun:{ value:new THREE.Vector3(0.62, 0.42, 0.18).normalize() }, uMoon:{ value:new THREE.Vector3(-0.45, 0.5, -0.55).normalize() },
  };
  const material = new THREE.ShaderMaterial({ uniforms, side:THREE.BackSide, depthTest:false, depthWrite:false, fog:false,
    blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor,
    vertexShader:`
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }`,
    fragmentShader:`
      uniform float uNight, uTime, uCloud; uniform vec3 uTop, uMid, uHorizon, uNTop, uNMid, uNHorizon, uSun, uMoon;
      varying vec3 vDir;
      float sh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      float sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
        return mix(mix(sh(i), sh(i + vec2(1.0, 0.0)), f.x), mix(sh(i + vec2(0.0, 1.0)), sh(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 day = mix(uHorizon, uMid, smoothstep(-0.02, 0.2, h)); day = mix(day, uTop, smoothstep(0.18, 0.75, h));
        vec3 nit = mix(uNHorizon, uNMid, smoothstep(-0.02, 0.22, h)); nit = mix(nit, uNTop, smoothstep(0.2, 0.8, h));
        vec3 c = mix(day, nit, uNight);
        // warm glow round the sun by day, a cool halo round the moon by night
        float sd = max(dot(d, uSun), 0.0), md = max(dot(d, uMoon), 0.0);
        c += vec3(1.0, 0.72, 0.42)*(pow(sd, 8.0)*0.35 + pow(sd, 90.0)*0.6)*(1.0 - uNight);
        c += vec3(0.45, 0.55, 1.0)*pow(md, 30.0)*0.35*uNight;
        // painted clouds: flattened onto a high ceiling, two octaves, soft top and a shaded belly
        float glowA = 0.0;
        if(h > 0.0){
          vec2 q = d.xz/(h + 0.12)*2.2 + vec2(uTime*0.012, uTime*0.004);
          float n = sn(q)*0.62 + sn(q*2.3 + 5.1)*0.28 + sn(q*5.1 - 2.7)*0.1;
          float cl = smoothstep(0.52, 0.72, n)*smoothstep(0.02, 0.16, h)*uCloud;
          float belly = smoothstep(0.52, 0.8, sn(q*2.3 + 5.4));
          vec3 cDay = mix(vec3(1.0, 0.97, 0.93), vec3(1.0, 0.84, 0.74), belly*0.6);
          vec3 cNit = mix(vec3(0.33, 0.34, 0.62), vec3(0.2, 0.2, 0.45), belly*0.6);
          c = mix(c, mix(cDay, cNit, uNight), cl*0.92);
          // stars, twinkling, hidden by cloud and near the horizon haze
          vec3 sp = d*220.0; vec2 cellId = floor(sp.xz + sp.y*vec2(0.7, 1.3));
          float r = sh(cellId);
          if(r > 0.965){
            vec2 f = fract(sp.xz + sp.y*vec2(0.7, 1.3)) - 0.5;
            float s = (1.0 - smoothstep(0.02, 0.2, length(f)))*(0.6 + 0.4*sin(uTime*2.0 + r*80.0));
            s *= uNight*smoothstep(0.06, 0.3, h)*(1.0 - cl);
            c += vec3(0.95, 0.95, 1.0)*s; glowA = max(glowA, s*0.8);
          }
        }
        // the moon: a pale disc with a soft rim and two faint maria
        float mdisc = smoothstep(0.9982, 0.9987, md);
        vec3 moon = vec3(1.0, 0.97, 0.88)*(1.0 - 0.12*smoothstep(0.4, 0.8, sn(d.xy*900.0)));
        c = mix(c, moon, mdisc*uNight);
        glowA = max(glowA, mdisc*uNight*0.9);
        gl_FragColor = vec4(c, 1.0 - glowA);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), material);
  mesh.renderOrder = -1000; mesh.frustumCulled = false; mesh.name = 'sky';
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); mesh.updateMatrixWorld(); };
  scene.add(mesh);
  return { mesh, uniforms };
}

// Post chain for the island view, hand-rolled to stay cheap (four small draws on top of the scene):
//   scene -> 4x MSAA sRGB8 target. Measured: a half-float MSAA target tripled the GPU time on the
//     Intel Arc (8 ms -> 24 ms at blueberry), so the scene stays 8-bit and bloom is tagged instead:
//     a glowing material is opaque with opacity < 1, which writes 1 - glow into alpha
//   tagged parts -> quarter-res target -> 9-tap blur across, then down (the bloom)
//   grade pass to the screen: scene + bloom, tilt-shift edges, colour grade, vignette, sRGB.
// Exposed as scene.userData.post.set({ enabled, bloom, tilt, grade, strength }) for critics.
function setupPost(THREE, renderer, scene, camera){
  const post = { enabled:true, bloom:true };
  scene.userData.post = post;
  const pr = () => renderer.getPixelRatio();
  const half = { type:THREE.HalfFloatType, depthBuffer:false };
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { type:THREE.UnsignedByteType, colorSpace:THREE.SRGBColorSpace, samples:4 });
  const rtA = new THREE.WebGLRenderTarget(1, 1, half), rtB = new THREE.WebGLRenderTarget(1, 1, half);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
  const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const fx = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms, depthTest:false, depthWrite:false });
  const bright = fx(`
    uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    vec3 pick(vec2 o){ vec4 c = texture2D(tSrc, vUv + o*uTexel); return c.rgb*(1.0 - c.a)*3.2; }
    void main(){ gl_FragColor = vec4((pick(vec2(-1.5)) + pick(vec2(1.5)) + pick(vec2(-1.5, 1.5)) + pick(vec2(1.5, -1.5)))*0.25, 1.0); }`,
    { tSrc:{ value:rtScene.texture }, uTexel:{ value:new THREE.Vector2() } });
  const blur = fx(`
    uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb*0.2270;
      c += (texture2D(tSrc, vUv + uDir*1.3846).rgb + texture2D(tSrc, vUv - uDir*1.3846).rgb)*0.3162;
      c += (texture2D(tSrc, vUv + uDir*3.2308).rgb + texture2D(tSrc, vUv - uDir*3.2308).rgb)*0.0703;
      gl_FragColor = vec4(c, 1.0);
    }`, { tSrc:{ value:null }, uDir:{ value:new THREE.Vector2() } });
  const G = GRADE(THREE), grade = fx(G.fragmentShader, G.uniforms);
  grade.uniforms.tDiffuse.value = rtScene.texture; grade.uniforms.tBloom.value = rtA.texture;

  function resize(){
    const w = Math.max(1, Math.round(innerWidth*pr())), h = Math.max(1, Math.round(innerHeight*pr()));
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    rtScene.setSize(w, h); rtA.setSize(qw, qh); rtB.setSize(qw, qh);
    bright.uniforms.uTexel.value.set(1/w, 1/h); grade.uniforms.uTexel.value.set(1/w, 1/h);
    post.qTexel = [1.4/qw, 1.4/qh];
  }
  resize(); addEventListener('resize', resize);

  const raw = renderer.render.bind(renderer);
  const pass = (material, target) => { quad.material = material; renderer.setRenderTarget(target); raw(quadScene, quadCam); };
  // Every render of the island scene with the island camera goes through the chain. Anything else
  // (interiors, the menu's map snapshot) renders exactly as before.
  renderer.render = (s, c) => {
    if(!post.enabled || s !== scene || c !== camera) return raw(s, c);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rtScene); raw(scene, camera);
    if(post.bloom){
      pass(bright, rtA);
      blur.uniforms.tSrc.value = rtA.texture; blur.uniforms.uDir.value.set(post.qTexel[0], 0); pass(blur, rtB);
      blur.uniforms.tSrc.value = rtB.texture; blur.uniforms.uDir.value.set(0, post.qTexel[1]); pass(blur, rtA);
    }
    grade.uniforms.uBloom.value = post.bloom ? post.strength : 0;
    pass(grade, prev);
  };
  Object.assign(post, { strength:0.9,
    set(o = {}){
      if('enabled' in o) post.enabled = !!o.enabled;
      if('bloom' in o) post.bloom = !!o.bloom;
      if('strength' in o) post.strength = +o.strength;
      if('tilt' in o) grade.uniforms.uTilt.value = +o.tilt;
      if('grade' in o) grade.uniforms.uGrade.value = +o.grade;
      if('night' in o) grade.uniforms.uNight.value = +o.night;
      if('samples' in o){ rtScene.samples = +o.samples; rtScene.dispose(); }
      return { enabled:post.enabled, bloom:post.bloom, strength:post.strength, tilt:grade.uniforms.uTilt.value, grade:grade.uniforms.uGrade.value };
    } });
}

// One full-screen pass: tilt-shift blur toward the top and bottom edges (the miniature look),
// then the grade in display space: a light plum lift in the shadows, apricot highlights, more saturation
// and contrast, and a rose vignette. Near-white paper is left ungraded so signs stay crisp.
const GRADE = THREE => ({
  uniforms: {
    tDiffuse: { value:null },
    tBloom: { value:null },
    uBloom: { value:0.9 },
    uTexel: { value:new THREE.Vector2(1/1440, 1/900) },
    uTilt: { value:1 },
    uGrade: { value:1 },
    uNight: { value:0 },
  },
  fragmentShader: `
    uniform sampler2D tDiffuse, tBloom; uniform vec2 uTexel; uniform float uTilt, uGrade, uBloom, uNight;
    varying vec2 vUv;
    vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // tilt-shift: sharp band through the middle (where the car and the signs are), soft edges
      float band = abs(vUv.y - 0.47);
      float blur = smoothstep(0.26, 0.5, band)*uTilt;
      if(blur > 0.02){
        vec3 acc = c; float wsum = 1.0;
        float r = blur*4.5;
        for(int i = 0; i < 8; i++){
          float a = float(i)*2.39996;
          float d = sqrt(float(i) + 0.5)/2.9;
          vec2 o = vec2(cos(a), sin(a))*d*r*uTexel;
          acc += texture2D(tDiffuse, vUv + o).rgb; wsum += 1.0;
        }
        c = acc/wsum;
      }
      c += texture2D(tBloom, vUv).rgb*uBloom;
      c = clamp(toSRGB(c), 0.0, 1.0);   // bloom can push past 1; the curve below expects 0..1
      if(uGrade > 0.0){
        vec3 g = c;
        float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
        float sat = max(g.r, max(g.g, g.b)) - min(g.r, min(g.g, g.b));
        // paper: bright and nearly grey (sign faces, cards, foam). The grade leaves it alone.
        float paper = smoothstep(0.78, 0.92, l)*(1.0 - smoothstep(0.06, 0.2, sat));
        g = mix(vec3(l), g, 1.16);                                          // saturation
        g += mix(vec3(0.035, 0.0, 0.05), vec3(0.0, 0.01, 0.06), uNight)*pow(1.0 - l, 2.4);   // a little plum (day) or ink blue (night) in the shadows
        g *= mix(mix(vec3(0.98, 0.97, 1.02), vec3(1.06, 1.0, 0.9), smoothstep(0.2, 0.75, l)), vec3(0.92, 0.96, 1.08), uNight*0.7); // cool lows, apricot highs; bluer at night
        g = mix(g, g*g*(3.0 - 2.0*g), 0.3);                                // S-curve for contrast
        vec2 q = vUv - 0.5; q.x *= 1.25;
        float v = smoothstep(0.32, 0.92, length(q));
        g = mix(g, g*mix(vec3(0.8, 0.66, 0.74), vec3(0.42, 0.4, 0.78), uNight), v*mix(0.5, 0.75, uNight)); // rose vignette, indigo at night
        g = mix(g, c, paper*(1.0 - v));
        c = mix(c, g, uGrade);
      }
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
});
