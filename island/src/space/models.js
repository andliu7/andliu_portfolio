// Space world models shared by the islet (island scene) and the space areas: the astronaut, the
// carved wing pad, the star shard crystal and the little station robot. Pure builders: each takes
// THREE and ctx.helpers and a parent, adds meshes, and returns handles. No per-frame work here.
// Materials that change at runtime (glow, gold) are created here, never taken from helpers.mat(),
// whose cached materials are shared by the whole island.

/* ---------- the astronaut: Andrew in a white suit and a round glass helmet ---------- */
// Faces +z, feet at y = 0, about 1.9 m tall with the helmet. animate() is called every frame.
export function buildAstronaut(THREE, H){
  const { mesh, ball, cyl } = H;
  const SUIT = '#f4f3ee', SUIT_D = '#d9dde6', GLOVE = '#9aa3b8', SKIN = '#f6d4b4', HAIR = '#2b2330', INK = '#1b1b24';
  const root = new THREE.Group(); root.name = 'astronaut';
  const body = new THREE.Group(); root.add(body);
  const legs = [], arms = [];
  function limb(x, y, len, r, color, endColor, endR, parent){
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
    mesh(new THREE.CapsuleGeometry(r, len, 4, 10), color, 0, -len/2 - r*0.4, 0, pivot);
    const end = ball(endR, endColor, 0, -len - r*0.9, 0, pivot, 12);
    return { pivot, end };
  }
  for(const sx of [-1, 1]){
    const l = limb(sx*0.18, 0.42, 0.16, 0.12, SUIT, '#8a93a8', 0.14, body);
    l.end.scale.set(1, 0.72, 1.35); l.end.position.z = 0.04; legs.push(l.pivot);
  }
  const torso = ball(0.46, SUIT, 0, 0.78, 0, body, 22); torso.scale.set(1, 1, 0.92);
  // chest panel with three buttons, and the blueberry badge on the shoulder
  H.box(0.34, 0.2, 0.08, SUIT_D, 0, 0.8, 0.4, body);
  [['#5b6fd6', -0.09], ['#e5484d', 0], ['#ffd166', 0.09]].forEach(([c, x]) => ball(0.035, c, x, 0.8, 0.45, body, 8));
  ball(0.075, '#3b4f9e', 0.26, 0.98, 0.3, body, 12);
  const crown = mesh(new THREE.ConeGeometry(0.035, 0.05, 5), '#2c3a8f', 0.26, 1.05, 0.3, body); crown.rotation.x = Math.PI;
  // backpack with a blue stripe and two thrusters
  const pack = H.box(0.62, 0.66, 0.3, SUIT_D, 0, 0.84, -0.44, body);
  H.box(0.64, 0.1, 0.31, '#4a5fd0', 0, 0.98, -0.44, body);
  for(const sx of [-0.17, 0.17]) cyl(0.08, 0.1, 0.14, '#6b7385', sx, 0.44, -0.46, body, 10);
  // thruster flames: one cone per nozzle, own material so they can fade
  const flameMat = new THREE.MeshBasicMaterial({ color:'#ffb347', transparent:true, opacity:0.9, depthWrite:false });
  const flames = [-0.17, 0.17].map(sx => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 10), flameMat); f.rotation.x = Math.PI; f.position.set(sx, 0.2, -0.46); f.visible = false; body.add(f); return f; });
  // head inside the helmet
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); body.add(head);
  ball(0.34, SKIN, 0, 0, 0, head, 20);
  const hair = mesh(new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI*2, 0, Math.PI*0.5), HAIR, 0, 0.02, -0.03, head);
  hair.rotation.x = -0.38; hair.scale.set(1, 0.9, 1);
  const eyeG = new THREE.Group(); head.add(eyeG);
  for(const s of [-1, 1]){
    ball(0.07, INK, s*0.12, 0, 0.29, eyeG, 12).scale.set(1, 1.15, 0.6);
    ball(0.025, '#ffffff', s*0.12 + 0.025, 0.035, 0.33, eyeG, 8);
  }
  const smile = mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), INK, 0, -0.11, 0.32, head); smile.rotation.z = Math.PI;
  // the helmet: a glass bubble and a white collar ring
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 16), new THREE.MeshStandardMaterial({ color:'#d8ecff', transparent:true, opacity:0.22, roughness:0.05, metalness:0.1, depthWrite:false }));
  glass.position.set(0, 1.4, 0); glass.renderOrder = 3; body.add(glass);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:0.55, depthWrite:false }));
  shine.scale.set(1.6, 0.7, 0.3); shine.position.set(-0.22, 1.66, 0.42); shine.rotation.z = 0.5; body.add(shine);
  const collar = mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 20), SUIT_D, 0, 1.02, 0, body); collar.rotation.x = Math.PI/2;
  for(const sx of [-1, 1]){ const a = limb(sx*0.44, 0.98, 0.16, 0.1, SUIT, GLOVE, 0.11, body); a.pivot.rotation.z = sx*0.2; arms.push(a.pivot); }
  root.traverse(o => { if(o.isMesh){ o.receiveShadow = false; o.castShadow = o !== glass && o !== shine && !flames.includes(o); } });

  const st = { phase:0, blink:3, squash:0, squashV:0, lift:0 };
  // s = { speed, grounded, float (zero-g), jet (0..1), dt }
  function animate(dt, s = {}){
    const speed = s.speed || 0, amt = Math.min(1, speed/5);
    const prev = Math.sin(st.phase);
    if(s.float){
      // drifting: slow scissor kick, arms out, a gentle bob
      st.phase += dt*1.6;
      const k = Math.sin(st.phase);
      legs[0].rotation.x = 0.25 + k*0.25; legs[1].rotation.x = 0.25 - k*0.25;
      arms[0].rotation.x = arms[1].rotation.x = -0.3 + k*0.1;
      arms[0].rotation.z = -0.7; arms[1].rotation.z = 0.7;
      body.position.y = Math.sin(st.phase*0.7)*0.06;
    } else {
      st.phase += dt*(3 + speed*2.2)*(amt > 0.05 ? 1 : 0);
      const k = Math.sin(st.phase), swing = amt*0.75;
      legs[0].rotation.x = k*swing; legs[1].rotation.x = -k*swing;
      arms[0].rotation.x = -k*swing; arms[1].rotation.x = k*swing;
      if(!s.grounded){ legs[0].rotation.x = -0.45; legs[1].rotation.x = 0.3; arms[0].rotation.z = 1.0; arms[1].rotation.z = -1.0; }
      else { arms[0].rotation.z += (-0.2 - arms[0].rotation.z)*Math.min(1, dt*10); arms[1].rotation.z += (0.2 - arms[1].rotation.z)*Math.min(1, dt*10); }
      if(amt > 0.25 && s.grounded && Math.sign(k) !== Math.sign(prev)) st.squashV += 1.2;
      body.position.y = Math.abs(k)*0.07*amt;
    }
    // squash spring (landings push squashV) and blinking
    st.squashV += (-120*st.squash - 11*st.squashV)*dt; st.squash += st.squashV*dt;
    const q = Math.max(-0.22, Math.min(0.22, st.squash*0.05));
    body.scale.set(1 + q, 1 - q, 1 + q);
    body.position.y += st.lift;
    st.blink -= dt; if(st.blink < 0) st.blink = 2.4 + Math.random()*2.8;
    eyeG.scale.y = st.blink < 0.12 ? 0.12 : 1;
    const jet = s.jet || 0;
    for(const f of flames){ f.visible = jet > 0.05; f.scale.set(1, 0.5 + jet*(0.8 + Math.random()*0.4), 1); }
  }
  return { root, body, head, pack, glass, animate, land(v){ st.squashV += Math.min(9, v); }, set lift(v){ st.lift = v; }, get lift(){ return st.lift; } };
}

/* ---------- the wing pad: a round stone pad with a pair of carved, feathered wings ---------- */
// Local frame: the wings stand on the back edge (-z) and open toward the front (+z).
// flap(t, k) beats the wings (k 0 = still, 1 = full beat); setGlow(k) and setGold(on) recolour.
export function buildWingPad(THREE, H, parent, o = {}){
  const g = new THREE.Group(); g.position.set(o.x || 0, o.y || 0, o.z || 0); g.rotation.y = o.rot || 0; parent.add(g);
  const stone = o.stone || '#d8d0c0';
  H.cyl(1.35, 1.5, 0.3, stone, 0, 0.15, 0, g, 28);
  H.cyl(1.12, 1.12, 0.06, o.top || '#ece6d8', 0, 0.31, 0, g, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color:o.glowColor || '#9fe8ff', transparent:true, opacity:0.35, depthWrite:false, side:THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.96, 36).rotateX(-Math.PI/2), ringMat);
  ring.position.y = 0.345; ring.renderOrder = 2; g.add(ring);
  // a small feather carved in the middle of the pad
  const inlay = new THREE.Mesh(new THREE.CircleGeometry(0.3, 5).rotateX(-Math.PI/2), ringMat); inlay.scale.set(0.5, 1, 1.4); inlay.position.y = 0.346; g.add(inlay);
  const featherMat = new THREE.MeshStandardMaterial({ color:o.feather || '#f1ece1', roughness:0.7, emissive:'#9fe8ff', emissiveIntensity:0 });
  const featherGeo = new THREE.SphereGeometry(1, 12, 8);
  const wings = [];
  for(const side of [-1, 1]){
    const hinge = new THREE.Group(); hinge.position.set(side*0.22, 0.45, -1.02); g.add(hinge);
    const wing = new THREE.Group(); hinge.add(wing);
    // five feathers fanned out from the hinge, longest at the top
    for(let i = 0; i < 5; i++){
      const a = 0.35 + i*0.26, len = 0.55 + i*0.1;
      const f = new THREE.Mesh(featherGeo, featherMat);
      f.scale.set(0.13, len, 0.05);
      f.position.set(side*Math.sin(a)*len*0.95, Math.cos(a)*len*0.95 + 0.1, 0);
      f.rotation.z = -side*a;
      f.castShadow = true; wing.add(f);
    }
    wing.rotation.y = -side*0.35;                           // tips swept forward, cupping the pad
    wings.push({ hinge, wing, side });
  }
  // a carved stone post the wings grow from
  H.box(0.5, 0.7, 0.3, stone, 0, 0.62, -1.05, g);
  function flap(t, k){
    for(const w of wings){
      const beat = Math.sin(t*(4 + k*10))*k;
      w.wing.rotation.z = w.side*(0.1 + beat*0.55);
      w.wing.rotation.y = -w.side*(0.35 + k*0.4 + beat*0.2);
    }
  }
  function setGlow(k){ ringMat.opacity = 0.2 + 0.6*k; featherMat.emissiveIntensity = 0.45*k; }
  function setGold(on){
    featherMat.color.set(on ? '#ffd76a' : (o.feather || '#f1ece1'));
    featherMat.emissive.set(on ? '#ffb000' : '#9fe8ff');
    ringMat.color.set(on ? '#ffe27a' : (o.glowColor || '#9fe8ff'));
  }
  return { group:g, wings, ring, ringMat, featherMat, flap, setGlow, setGold, top:0.34 };
}

/* ---------- star shard: a long glowing crystal with a soft halo ---------- */
// Geometry and materials are made once per kit and shared by every shard (see kit.js).
export function shardParts(THREE){
  const geo = new THREE.OctahedronGeometry(0.28, 0); geo.scale(1, 1.7, 1);
  const mat = new THREE.MeshStandardMaterial({ color:'#fff3c4', emissive:'#ffc93c', emissiveIntensity:1.1, roughness:0.25, flatShading:true });
  const dim = new THREE.MeshStandardMaterial({ color:'#6b7390', emissive:'#20263d', emissiveIntensity:0.4, roughness:0.5, flatShading:true });
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff6d0ff'); gr.addColorStop(0.35, '#ffd16688'); gr.addColorStop(1, '#ffd16600');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = new THREE.SpriteMaterial({ map:haloTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  return { geo, mat, dim, halo, haloTex };
}

/* ---------- Cosmo, the station robot ---------- */
export function buildRobot(THREE, H, parent, x, y, z){
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const bob = new THREE.Group(); g.add(bob);
  const body = H.ball(0.62, '#f4f3ee', 0, 1.1, 0, bob, 20); body.scale.set(1, 0.9, 0.95);
  H.cyl(0.5, 0.64, 0.18, '#4a5fd0', 0, 0.66, 0, bob, 20);
  // screen face
  const face = H.box(0.74, 0.46, 0.1, '#15161d', 0, 1.16, 0.52, bob);
  const eyeMat = new THREE.MeshBasicMaterial({ color:'#7ff0ff' });
  const eyes = [-0.15, 0.15].map(sx => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.08, 3, 8), eyeMat); e.position.set(sx, 1.18, 0.58); bob.add(e); return e; });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI), eyeMat); mouth.rotation.z = Math.PI; mouth.position.set(0, 1.06, 0.58); bob.add(mouth);
  // antenna with a blinking bulb
  H.cyl(0.025, 0.025, 0.4, '#9aa3b8', 0, 1.78, 0, bob, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color:'#ff6b6b' });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), bulbMat); bulb.position.y = 2.0; bob.add(bulb);
  // little arms and a hover ring instead of legs
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s*0.6, 1.05, 0); bob.add(p); H.ball(0.14, '#9aa3b8', s*0.12, -0.2, 0, p, 10); return p; });
  const hoverMat = new THREE.MeshBasicMaterial({ color:'#7ff0ff', transparent:true, opacity:0.5, depthWrite:false });
  const hover = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 20), hoverMat); hover.rotation.x = Math.PI/2; hover.position.y = 0.45; bob.add(hover);
  let wave = 0;
  function update(dt, t){
    bob.position.y = Math.sin(t*2)*0.12;
    arms[0].rotation.z = -0.3 + Math.sin(t*1.4)*0.1;
    arms[1].rotation.z = 0.3 - Math.sin(t*1.4)*0.1 - (wave > 0 ? Math.abs(Math.sin(t*12))*1.3 : 0);
    if(wave > 0) wave -= dt;
    bulbMat.color.set(Math.sin(t*3) > 0 ? '#ff6b6b' : '#ffd166');
    hoverMat.opacity = 0.35 + Math.sin(t*6)*0.15;
    const blink = (t % 3.3) < 0.12; for(const e of eyes) e.scale.y = blink ? 0.2 : 1;
  }
  return { group:g, face, update, wave(){ wave = 1.2; } };
}
