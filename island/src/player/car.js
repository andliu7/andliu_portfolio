// The car: a kinematic arcade vehicle with a cannon twin that knocks props over.
// Owns state.player while mode === 'drive'. Parked (still solid, not steering) in any other mode.
// Four vehicles share one driving code with their own tuning (VEHICLES below): the open-top jeep,
// an electric speedster, a camper RV and a pickup. garage.js picks one with setVehicle(id); the
// active one's model hangs off car.group, so everything that holds car / car.group keeps working.
// The driver (character.js parents itself to api.seat) is visible from the high follow camera in
// the open cars. The body sits on a fake spring: it pitches when you accelerate or brake, rolls
// into turns, and squashes on a honk. Rear wheels kick up pooled dust puffs.
// Lights: Shift shoots cartoon flames out of the exhaust, Space lights the brake lights, Q / E
// blink the turn signals (with a tick), and the headlights brighten and throw a pool at night.
// Walls guide it along instead of bouncing it back (resolveCar). H while walking calls it: from
// far off it pops in on screen, then drives in fast, wades the shallows, hops low obstacles (never
// trees), circles you once, honks and parks on your right side facing your way.

// Tuning on the same driving code. max/boost m/s, accel/brake m/s^2, rev reverse cap, turn rad/s at
// full lock, coast drag, hand brake drag, k/d spring stiffness and damping (lower = heavier, floatier),
// roll/pitch body lean multipliers, sound engine pitch multiplier, honk the two horn notes.
// hw/hl/bh are the half width, half length and half height of the body; r is the collision disc.
const VEHICLES = {
  jeep:  { name:'Blueberry Jeep', max:20, boost:30, accel:24, brake:42, rev:9, turn:2.3, coast:1.6, hand:7, k:90, d:11, roll:1, pitch:1, sound:1, honk:[415, 523],
           hw:0.98, hl:1.62, bh:0.55, r:1.45 },
  ev:    { name:'Volt Speedster', max:23, boost:34, accel:34, brake:48, rev:10, turn:2.6, coast:1.1, hand:8, k:115, d:13, roll:0.7, pitch:0.8, sound:1.6, honk:[659, 880],
           hw:0.98, hl:2.05, bh:0.5, r:1.66 },
  rv:    { name:'Camper RV', max:14, boost:21, accel:11, brake:26, rev:6, turn:1.45, coast:0.8, hand:4.5, k:50, d:6.5, roll:1.9, pitch:1.5, sound:0.65, honk:[233, 294],
           hw:1.18, hl:2.72, bh:1.3, r:2.1 },
  truck: { name:'Pickup Truck', max:19, boost:28, accel:18, brake:36, rev:8, turn:1.9, coast:1.3, hand:6, k:72, d:8.5, roll:1.3, pitch:1.2, sound:0.8, honk:[311, 392],
           hw:1.08, hl:2.45, bh:0.95, r:1.9 },
};
const IDS = Object.keys(VEHICLES);

export function init(ctx){
  const { THREE, CANNON, scene, world, state, input, sound, helpers:H } = ctx;
  const { mesh, box, cyl, ball, eyes } = H;
  const keys = input.keys;
  const car = { x:0, z:6, heading:Math.PI, speed:0, steer:0, group:new THREE.Group(), wheels:[], fronts:[], body:null, chassis:null };
  const BLUE = '#4a5fd0', DARK = '#3b4f9e', CREAM = '#f7f3ea';
  let seat = null, door = null, wheelRing = null;
  let V = VEHICLES.jeep, cur = 'jeep', rig = null, R_CAR = V.r;
  const rigs = {};                       // live models, built the first time each is chosen

  /* ---------- materials ---------- */
  // A glowing material is opaque with opacity < 1 and a replace blend, so its alpha reaches the scene
  // target, where renderer.js blooms 1 - alpha (the same tag atmosphere.js uses). userData.atmo keeps
  // atmosphere's night pass off them: this file animates them itself.
  const glowTag = m => { Object.assign(m, { blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.ZeroFactor }); m.userData.atmo = true; return m; };
  const lit = (color, emissive) => glowTag(new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity:0, roughness:0.4 }));
  // Additive light for flames and the headlight pool. With bloom, the alpha channel is scaled down by
  // the source alpha so the flame also glows; without it the alpha is left alone.
  const addTag = (m, bloom) => Object.assign(m, { transparent:true, depthWrite:false, toneMapped:false, blending:THREE.CustomBlending,
    blendSrc:THREE.SrcAlphaFactor, blendDst:THREE.OneFactor, blendSrcAlpha:THREE.ZeroFactor, blendDstAlpha:bloom ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor });
  const GLASS = new THREE.MeshStandardMaterial({ color:'#bfe6f5', roughness:0.1, transparent:true, opacity:0.45 });
  const LAMP = { head:lit('#fff6d8', '#fff1c4'), tail:lit('#e5484d', '#ff2a1f'), left:lit('#ffb020', '#ff9a00'), right:lit('#ffb020', '#ff9a00') };
  // Accents shared by the live vehicle and the garage's display copies, so the showroom glows too.
  const ACC = { teal:lit('#63f2e2', '#2fd6c6'), warm:lit('#a9cfe8', '#ffc36b'), fog:lit('#fffbe6', '#fff2b8') };
  ACC.teal.emissiveIntensity = 1.4; ACC.teal.opacity = 0.5;
  const WARM_DAY = new THREE.Color('#a9cfe8'), WARM_NIGHT = new THREE.Color('#ffe7a8');

  /* ---------- models ---------- */
  // Each builder adds its body to rig.chassis (+z is forward, +x is the car's left) and returns the
  // shared parts: seat, door, wheels, lamps (mirrored to both sides from the +x one), exhausts.
  const MODELS = {
    jeep(c){
      // tub: rounded-looking body built from a low box plus a bumper skirt
      box(1.9, 0.6, 3.1, BLUE, 0, 0.62, 0, c);
      box(1.95, 0.2, 3.2, DARK, 0, 0.36, 0, c);
      box(1.7, 0.16, 0.9, CREAM, 0, 0.98, 1.05, c);            // bonnet stripe
      box(1.7, 0.16, 0.7, CREAM, 0, 0.98, -1.2, c);            // boot lid
      // cockpit: dark floor well, a seat, a windscreen and a roll bar, no roof
      const well = box(1.5, 0.08, 1.25, '#2a3160', 0, 0.93, -0.28, c); well.castShadow = false;
      box(1.0, 0.22, 0.6, '#e5484d', 0, 1.02, -0.45, c);         // seat base
      box(1.0, 0.62, 0.18, '#e5484d', 0, 1.3, -0.78, c);         // seat back
      box(1.55, 0.08, 0.08, '#1f2a44', 0, 1.62, 0.52, c);        // screen top rail
      for(const sx of [-0.75, 0.75]) box(0.08, 0.66, 0.08, '#1f2a44', sx, 1.28, 0.52, c);
      mesh(new THREE.BoxGeometry(1.42, 0.5, 0.04), GLASS, 0, 1.3, 0.52, c).castShadow = false;
      for(const sx of [-0.72, 0.72]) cyl(0.06, 0.06, 0.8, CREAM, sx, 1.35, -0.98, c, 8);
      const bar = cyl(0.06, 0.06, 1.5, CREAM, 0, 1.75, -0.98, c, 8); bar.rotation.z = Math.PI/2;
      // antenna with a blueberry on top
      cyl(0.02, 0.02, 1.0, '#9aa3b8', 0.7, 1.4, -1.25, c, 6); ball(0.18, DARK, 0.7, 1.95, -1.25, c, 14);
      eyes(c, 0.85, 1.57, 0.32, 0.09, false);
      return { seat:[0, 1.08, -0.4], door:{ at:[0.97, 0.66, 0.2], h:0.46, l:0.9, color:DARK, trim:CREAM },
        wheel:{ r:0.4, w:0.32, at:[[0.98, 1.0], [0.98, -1.05]], hub:'#e8edf2' },
        head:{ at:[0.62, 0.66, 1.56], ball:0.14 }, tail:{ at:[0.62, 0.66, -1.56], size:[0.3, 0.14, 0.06] },
        sigF:[0.86, 0.66, 1.55], sigR:[0.87, 0.66, -1.57], exhaust:[[-0.5, 0.4, -1.62]], flame:['#ff7a1a', '#ffe066'] };
    },
    // Electric speedster: low pearl wedge, teal light strips (they bloom), glowing charge port and
    // hubs, twin thrusters instead of a tailpipe. Open top so the driver shows.
    ev(c){
      const PEARL = '#eef3f6', SKIRT = '#2b3a4a', SEAT = '#1f5f66';
      box(1.9, 0.42, 3.5, PEARL, 0, 0.58, -0.05, c);
      box(1.95, 0.16, 3.6, SKIRT, 0, 0.34, -0.05, c);
      box(1.8, 0.26, 0.6, PEARL, 0, 0.55, 1.95, c);              // low nose
      box(1.7, 0.1, 1.0, PEARL, 0, 0.84, 1.05, c);               // bonnet
      box(1.8, 0.2, 1.0, PEARL, 0, 0.88, -1.35, c);              // rear deck
      const well = box(1.5, 0.08, 1.2, '#22303c', 0, 0.8, -0.3, c); well.castShadow = false;
      box(1.0, 0.2, 0.6, SEAT, 0, 0.9, -0.45, c); box(1.0, 0.6, 0.16, SEAT, 0, 1.17, -0.8, c);
      const screen = mesh(new THREE.BoxGeometry(1.55, 0.42, 0.04), GLASS, 0, 1.08, 0.45, c); screen.rotation.x = -0.45; screen.castShadow = false;
      const spoiler = box(1.8, 0.08, 0.35, SKIRT, 0, 1.04, -1.78, c); spoiler.rotation.x = -0.2;
      for(const sx of [-0.7, 0.7]) cyl(0.05, 0.05, 0.6, PEARL, sx, 1.25, -1.0, c, 8);
      const hoop = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.45, 8), ACC.teal, 0, 1.56, -1.0, c); hoop.rotation.z = Math.PI/2;
      box(1.5, 0.05, 0.05, ACC.teal, 0, 0.72, 2.26, c);          // light strip across the nose
      box(1.2, 0.06, 0.05, ACC.teal, 0, 0.7, -1.84, c);          // and across the tail
      for(const sx of [-0.985, 0.985]) box(0.03, 0.05, 3.3, ACC.teal, sx, 0.44, -0.05, c);   // side sills
      // charge port on the left rear flank: a glowing ring round a glowing plug
      const port = mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 16), ACC.teal, 0.965, 0.64, -1.2, c); port.rotation.y = Math.PI/2;
      mesh(new THREE.CircleGeometry(0.07, 12), ACC.teal, 0.97, 0.64, -1.2, c).rotation.y = Math.PI/2;
      for(const sx of [-0.4, 0.4]) cyl(0.09, 0.11, 0.16, SKIRT, sx, 0.46, -1.86, c, 10).rotation.x = Math.PI/2;
      eyes(c, 0.58, 2.26, 0.3, 0.08, false);
      return { seat:[0, 0.98, -0.45], door:{ at:[0.97, 0.6, 0.15], h:0.38, l:0.9, color:PEARL, trim:'#2fd6c6' },
        wheel:{ r:0.38, w:0.3, at:[[0.99, 1.3], [0.99, -1.2]], hub:ACC.teal },
        head:{ at:[0.58, 0.63, 2.25], size:[0.34, 0.08, 0.05] }, tail:{ at:[0.55, 0.88, -1.86], size:[0.4, 0.07, 0.05] },
        sigF:[0.84, 0.52, 2.25], sigR:[0.86, 0.88, -1.86], exhaust:[[-0.4, 0.46, -1.95], [0.4, 0.46, -1.95]], flame:['#2fd6ff', '#d9fbff'] };
    },
    // Camper RV: tall cream box, orange and teal stripes, a bunk over the cab, little windows that
    // glow warm at night, a striped awning over the camper door, roof unit, ladder and spare wheel.
    rv(c){
      const BODY = '#fff4e0', STRIPE = '#e98a5a', TEAL = '#2f9e8f', BASE = '#3a4150';
      box(2.3, 0.32, 5.4, BASE, 0, 0.55, 0, c);                  // chassis rail
      box(2.3, 2.4, 3.7, BODY, 0, 1.9, -0.8, c);                 // living box
      box(2.3, 0.55, 1.2, BODY, 0, 3.0, 1.55, c);                // bunk over the cab
      box(2.3, 0.8, 1.05, BODY, 0, 1.1, 1.6, c);                 // cab lower
      box(2.2, 0.8, 0.6, BODY, 0, 1.1, 2.4, c);                  // bonnet
      for(const [sx, sz] of [[-1.1, 2.06], [1.1, 2.06], [-1.1, 1.1], [1.1, 1.1]]) box(0.1, 1.25, 0.1, BODY, sx, 2.1, sz, c);
      const screen = mesh(new THREE.BoxGeometry(2.1, 1.15, 0.05), GLASS, 0, 2.1, 2.07, c); screen.rotation.x = -0.12; screen.castShadow = false;
      for(const sx of [-1.14, 1.14]) mesh(new THREE.BoxGeometry(0.05, 0.95, 0.85), GLASS, sx, 2.05, 1.58, c).castShadow = false;
      box(2.33, 0.18, 3.7, STRIPE, 0, 1.3, -0.8, c); box(2.33, 0.08, 3.7, TEAL, 0, 1.12, -0.8, c);
      box(2.33, 0.18, 1.05, STRIPE, 0, 1.3, 1.6, c);
      // little windows along both sides and one in the camper door; ACC.warm glows at night
      for(const sx of [-1.16, 1.16]) for(const wz of [-2.1, -1.05]) box(0.05, 0.55, 0.62, ACC.warm, sx, 2.2, wz, c);
      box(0.05, 0.4, 0.5, ACC.warm, 1.16, 2.2, 0.1, c);
      box(0.05, 1.7, 0.75, '#e8dcc4', -1.165, 1.6, 0.25, c);     // camper door (right side)
      box(0.05, 0.4, 0.4, ACC.warm, -1.19, 2.05, 0.25, c);
      // awning: six stripes on a tilted frame over the door, with its roller along the wall
      const aw = new THREE.Group(); aw.position.set(-1.2, 2.95, -0.55); aw.rotation.z = 0.22; c.add(aw);
      for(let i = 0; i < 6; i++) box(0.95, 0.04, 0.42, i % 2 ? '#fffaf0' : STRIPE, -0.48, 0, -1.05 + i*0.42, aw);
      const roller = cyl(0.07, 0.07, 2.6, '#9aa3b8', 0, 0.02, 0, aw, 8); roller.rotation.x = Math.PI/2;
      box(0.9, 0.36, 0.8, '#e8edf2', 0, 3.28, -1.3, c);          // roof unit
      for(const sx of [-0.35, 0.35]) box(0.06, 2.2, 0.06, '#9aa3b8', sx, 2.0, -2.7, c);   // ladder
      for(let i = 0; i < 5; i++) box(0.7, 0.05, 0.05, '#9aa3b8', 0, 1.2 + i*0.45, -2.7, c);
      cyl(0.4, 0.4, 0.26, '#1f2a44', 0.75, 1.3, -2.78, c, 14).rotation.x = Math.PI/2;       // spare wheel
      box(2.2, 0.22, 0.22, '#9aa3b8', 0, 0.62, 2.72, c);         // bumper
      eyes(c, 1.3, 2.71, 0.42, 0.12, false);
      return { seat:[0, 1.45, 1.35], door:{ at:[1.17, 1.3, 2.0], h:0.7, l:0.8, color:BODY, trim:STRIPE },
        wheel:{ r:0.5, w:0.38, at:[[1.12, 1.9], [1.12, -1.6]], hub:'#e8edf2' },
        head:{ at:[0.78, 1.0, 2.71], ball:0.18 }, tail:{ at:[0.9, 1.15, -2.67], size:[0.22, 0.4, 0.06] },
        sigF:[1.0, 0.95, 2.71], sigR:[0.9, 1.52, -2.67], exhaust:[[-0.7, 0.45, -2.72]], flame:['#ff7a1a', '#ffe066'] };
    },
    // Pickup: red cab with a glass cabin, chrome grille and bumpers, a light bar on the roof that
    // glows, and a wooden crate in the bed.
    truck(c){
      const RED = '#d9534f', CHROME = '#dfe6ee', BASE = '#2b2f3a', WOOD = '#c98f58';
      box(2.1, 0.25, 4.7, BASE, 0, 0.5, 0, c);
      box(2.05, 0.6, 1.3, RED, 0, 0.95, 1.6, c);                 // bonnet
      box(2.1, 0.6, 1.3, RED, 0, 0.95, 0.3, c);                  // cab lower
      box(1.8, 0.06, 1.1, CREAM, 0, 1.26, 1.6, c);               // bonnet stripe
      for(const [sx, sz] of [[-0.99, 0.86], [0.99, 0.86], [-0.99, -0.3], [0.99, -0.3]]) box(0.1, 1.42, 0.1, RED, sx, 1.95, sz, c);
      box(2.08, 0.12, 1.3, RED, 0, 2.68, 0.28, c);               // cab roof
      const screen = mesh(new THREE.BoxGeometry(1.9, 1.3, 0.05), GLASS, 0, 1.93, 0.86, c); screen.rotation.x = -0.15; screen.castShadow = false;
      mesh(new THREE.BoxGeometry(1.9, 1.2, 0.05), GLASS, 0, 1.9, -0.32, c).castShadow = false;
      for(const sx of [-1.02, 1.02]) mesh(new THREE.BoxGeometry(0.05, 1.1, 1.05), GLASS, sx, 1.88, 0.28, c).castShadow = false;
      box(1.0, 0.2, 0.55, '#3a3f4a', 0, 1.12, 0.0, c);           // bench seat
      // bed with side walls, tailgate and a crate
      box(2.0, 0.12, 2.1, BASE, 0, 0.85, -1.4, c);
      for(const sx of [-1.0, 1.0]) box(0.12, 0.55, 2.1, RED, sx, 1.1, -1.4, c);
      box(2.0, 0.55, 0.12, RED, 0, 1.1, -2.42, c); box(1.6, 0.1, 0.13, CREAM, 0, 1.2, -2.42, c);
      box(1.1, 0.8, 1.0, WOOD, 0.2, 1.31, -1.45, c);
      for(const y of [1.08, 1.52]) box(1.13, 0.08, 1.03, '#8a5a3b', 0.2, y, -1.45, c);
      for(const [cx, cz] of [[-0.33, -0.93], [0.73, -0.93], [-0.33, -1.97], [0.73, -1.97]]) box(0.1, 0.8, 0.1, '#8a5a3b', cx, 1.31, cz, c);
      // chrome grille and bumpers, roof light bar with four glowing pods
      box(1.2, 0.3, 0.06, CHROME, 0, 0.85, 2.26, c);
      box(2.1, 0.2, 0.22, CHROME, 0, 0.55, 2.35, c); box(2.1, 0.2, 0.22, CHROME, 0, 0.55, -2.45, c);
      box(1.4, 0.12, 0.22, BASE, 0, 2.8, 0.6, c);
      for(const sx of [-0.52, -0.18, 0.18, 0.52]) mesh(new THREE.SphereGeometry(0.1, 10, 8), ACC.fog, sx, 2.86, 0.68, c);
      eyes(c, 1.1, 2.26, 0.34, 0.09, false);
      return { seat:[0, 1.2, 0.05], door:{ at:[1.07, 1.0, 0.9], h:0.5, l:1.1, color:RED, trim:CREAM },
        wheel:{ r:0.48, w:0.36, at:[[1.06, 1.55], [1.06, -1.45]], hub:CHROME },
        head:{ at:[0.78, 1.0, 2.26], ball:0.16 }, tail:{ at:[0.9, 1.1, -2.49], size:[0.2, 0.3, 0.06] },
        sigF:[0.99, 1.0, 2.26], sigR:[0.92, 1.33, -2.49], exhaust:[[-0.7, 0.45, -2.45]], flame:['#ff7a1a', '#ffe066'] };
    },
  };

  // Flame cone: base at the origin, tip one unit out along -z, so scale.z is the flame's length.
  const flameGeo = new THREE.ConeGeometry(0.2, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(-Math.PI/2);
  const flameMats = {};
  const flameMat = color => flameMats[color] || (flameMats[color] = addTag(new THREE.MeshBasicMaterial({ color, side:THREE.DoubleSide }), true));

  // Build one vehicle. live = the drivable copy (lamps that light up, flames, a door that swings,
  // a steering wheel that turns); otherwise a static display copy for the garage.
  function makeRig(id, live){
    const root = new THREE.Group(), chassis = new THREE.Group(); root.add(chassis);
    const spec = MODELS[id](chassis);
    const r = { id, V:VEHICLES[id], spec, root, chassis, wheels:[], fronts:[], door:null, wheelRing:null, flames:[] };
    // driver door on the left (+x), hinged at the front
    const d = spec.door, dg = new THREE.Group(); dg.position.set(...d.at); chassis.add(dg); r.door = dg;
    box(0.06, d.h, d.l, d.color, 0, 0, -d.l/2, dg);
    box(0.07, 0.08, 0.22, d.trim, 0.01, d.h*0.2, -d.l*0.78, dg);
    // steering wheel on a short column just ahead of the seat; it turns with the steering input
    const [sx0, sy0, sz0] = spec.seat;
    const col = cyl(0.03, 0.03, 0.4, '#1f2a44', sx0, sy0 + 0.12, sz0 + 0.7, chassis, 6); col.rotation.x = -0.9;
    const ringG = new THREE.Group(); ringG.position.set(sx0, sy0 + 0.26, sz0 + 0.56); ringG.rotation.x = -0.9; chassis.add(ringG); r.wheelRing = ringG;
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 18), '#1f2a44', 0, 0, 0, ringG); ring.rotation.x = Math.PI/2;
    box(0.36, 0.03, 0.05, '#1f2a44', 0, 0, 0, ringG);
    // wheels: a pivot per corner (fronts steer), tyre plus hub cap
    const W = spec.wheel;
    for(const [ax, az] of W.at) for(const sx of [-ax, ax]){
      const pivot = new THREE.Group(); pivot.position.set(sx, W.r, az); root.add(pivot);
      cyl(W.r, W.r, W.w, '#1f2a44', 0, 0, 0, pivot, 16).rotation.z = Math.PI/2;
      mesh(new THREE.CylinderGeometry(W.r*0.5, W.r*0.5, W.w + 0.02, 12), W.hub, 0, 0, 0, pivot).rotation.z = Math.PI/2;
      r.wheels.push(pivot); if(az > 0) r.fronts.push(pivot);
    }
    // lamps, mirrored: +x is the car's left, so the left signal is the +x pair
    const lamp = (L, color, x, y, z, s) => {
      const m = live ? L : color;
      const o = s.ball ? mesh(new THREE.SphereGeometry(s.ball, 10, 8), m, x, y, z, chassis) : mesh(new THREE.BoxGeometry(...s.size), m, x, y, z, chassis);
      o.castShadow = false; return o;
    };
    for(const k of [1, -1]){
      const [hx, hy, hz] = spec.head.at, [tx, ty, tz] = spec.tail.at;
      lamp(LAMP.head, '#fff3b0', hx*k, hy, hz, spec.head);
      lamp(LAMP.tail, '#e5484d', tx*k, ty, tz, spec.tail);
      const sig = k > 0 ? LAMP.left : LAMP.right;
      lamp(sig, '#ffb020', spec.sigF[0]*k, spec.sigF[1], spec.sigF[2], { size:[0.12, 0.1, 0.07] });
      lamp(sig, '#ffb020', spec.sigR[0]*k, spec.sigR[1], spec.sigR[2], { size:[0.12, 0.1, 0.07] });
    }
    // exhaust pipes, and on the live copy a two-layer flame at each
    for(const [ex, ey, ez] of spec.exhaust){
      if(id !== 'ev') cyl(0.08, 0.08, 0.3, '#5b6170', ex, ey, ez + 0.1, chassis, 8).rotation.x = Math.PI/2;
      if(!live) continue;
      const fg = new THREE.Group(); fg.position.set(ex, ey, ez - 0.05); fg.visible = false; chassis.add(fg);
      const outer = new THREE.Mesh(flameGeo, flameMat(spec.flame[0])), inner = new THREE.Mesh(flameGeo, flameMat(spec.flame[1]));
      inner.scale.set(0.55, 0.55, 0.6); inner.renderOrder = 3; outer.renderOrder = 2;
      fg.add(outer, inner); r.flames.push({ g:fg, inner });
    }
    return r;
  }

  // Headlight pool on the ground ahead of the car at night: two soft lobes on one additive quad.
  const poolTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
    for(const x of [40, 88]){ const gr = g.createRadialGradient(x, 150, 4, x, 150, 90); gr.addColorStop(0, 'rgba(255,240,190,0.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.2), addTag(new THREE.MeshBasicMaterial({ map:poolTex, color:'#fff0c0', opacity:0 }), false));
  pool.rotation.x = -Math.PI/2; pool.position.y = 0.07; pool.renderOrder = 1; pool.visible = false; car.group.add(pool);

  // Swap which model hangs off car.group. The seat group moves into the new cockpit, so a seated
  // driver comes along; the cannon twin is rebuilt to the new size.
  function useRig(id){
    const r = rigs[id] || (rigs[id] = makeRig(id, true));
    if(rig) car.group.remove(rig.root);
    rig = r; cur = id; V = r.V; R_CAR = V.r;
    car.group.add(r.root);
    car.chassis = r.chassis; car.wheels = r.wheels; car.fronts = r.fronts; door = r.door; wheelRing = r.wheelRing;
    r.chassis.add(seat); seat.position.set(...r.spec.seat);
    pool.position.z = V.hl + 3.0;
    if(car.body) world.removeBody(car.body);
    // allowSleep off: a sleeping kinematic body passes through every prop until something wakes it
    car.body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, allowSleep: false, shape: new CANNON.Box(new CANNON.Vec3(V.hw, V.bh, V.hl)) });
    world.addBody(car.body);
  }

  function buildCar(){
    scene.add(car.group);
    seat = new THREE.Group();            // seat anchor for the driver, re-parented into each cockpit
    useRig('jeep');
  }

  // Dust puffs: a fixed pool of spheres, never allocated per frame.
  const puffGeo = new THREE.SphereGeometry(0.17, 8, 6), puffMat = new THREE.MeshStandardMaterial({ color:'#efe4cc', roughness:1 });
  const puffs = [];
  for(let i = 0; i < 18; i++){ const m = new THREE.Mesh(puffGeo, puffMat); m.visible = false; scene.add(m); puffs.push({ m, life:0, vx:0, vy:0, vz:0 }); }
  let puffNext = 0, puffClock = 0;
  function puff(x, z, vx, vz){
    const p = puffs[puffNext]; puffNext = (puffNext + 1) % puffs.length;
    p.life = 1; p.vx = vx; p.vy = 0.9 + Math.random()*0.6; p.vz = vz;
    p.m.position.set(x, 0.2, z); p.m.visible = true;
  }
  function stepPuffs(dt){
    for(const p of puffs){
      if(p.life <= 0) continue;
      p.life -= dt*1.6;
      if(p.life <= 0){ p.m.visible = false; continue; }
      p.m.position.x += p.vx*dt; p.m.position.y += p.vy*dt; p.m.position.z += p.vz*dt;
      p.vx *= 0.94; p.vz *= 0.94;
      const s = Math.sin(p.life*Math.PI)*1.3 + 0.2; p.m.scale.setScalar(s);
    }
  }

  // Walls guide instead of bouncing. After the push-out, the push direction is the wall normal
  // (summed over every collider touched, so a chain of rail posts reads as one smooth wall).
  // Within 25 degrees of square on, the car just stops with a soft bump. Otherwise the part of
  // the velocity going into the wall is dropped, the along-wall part is kept, and the nose eases
  // round to the along-wall direction you were already going. This is the only wall slide:
  // assist.js does the road guide and nothing else.
  const HEAD_ON = Math.cos(25*Math.PI/180);
  let touching = false, scrapeT = 0;
  const wall = { hits:0, slides:0, stops:0 };          // critic counters, see api.wall()
  function softBump(v){ sound.tone(95, 0.14, 'sine', 0.05 + 0.05*v, 60); spring.pv += car.speed*0.02; spring.bv -= 0.5 + 0.5*v; }
  // skip(c) true = ignore that collider (the call wades past the shoreline chain and hops low stuff).
  function resolveCar(dt, skip = null){
    const x0 = car.x, z0 = car.z;
    let hit = false;
    for(const c of ctx.colliders){
      if(skip?.(c)) continue;
      if(c.kind === 'circle'){
        const dx = car.x - c.x, dz = car.z - c.z, d = Math.hypot(dx, dz), m = R_CAR + c.r;
        if(d < m && d > 1e-5){ car.x = c.x + dx/d*m; car.z = c.z + dz/d*m; hit = true; }
      } else {
        const co = Math.cos(c.ang), si = Math.sin(c.ang);
        const dx = car.x - c.x, dz = car.z - c.z;
        let lx = dx*co - dz*si, lz = dx*si + dz*co;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if(d < R_CAR){
          if(d < 1e-5){ const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if(px < pz){ lx = Math.sign(lx||1)*(c.hw + R_CAR); } else { lz = Math.sign(lz||1)*(c.hd + R_CAR); } }
          else { lx = cx + ex/d*R_CAR; lz = cz + ez/d*R_CAR; }
          car.x = c.x + lx*co + lz*si; car.z = c.z - lx*si + lz*co; hit = true;
        }
      }
    }
    const lim = ctx.island.radius - 2.5, r = Math.hypot(car.x, car.z); if(r > lim){ car.x *= lim/r; car.z *= lim/r; hit = true; }
    if(!hit){ touching = false; return; }
    let nx = car.x - x0, nz = car.z - z0; const nl = Math.hypot(nx, nz), sp = Math.abs(car.speed);
    if(nl < 1e-6 || sp < 0.05){ touching = true; return; }
    nx /= nl; nz /= nl;
    const sg = Math.sign(car.speed), vx = Math.sin(car.heading)*car.speed, vz = Math.cos(car.heading)*car.speed;
    const vn = vx*nx + vz*nz;
    if(vn >= 0){ touching = true; return; }             // already moving away from it
    const first = !touching; touching = true;
    if(first) wall.hits++;
    const into = -vn/sp;                                // 1 = square on, 0 = grazing
    if(into > HEAD_ON){
      if(first && sp > 3) softBump(Math.min(1, sp/20));
      car.speed = 0; wall.stops++;
      return;
    }
    const tx = vx - vn*nx, tz = vz - vn*nz, vt = Math.hypot(tx, tz);
    // The speed into the wall goes on the first touch only; later frames of the same scrape keep
    // the speed while the nose turns, so a long slide does not bleed it away frame after frame.
    if(first){ car.speed = sg*vt*(1 - 0.1*into); if(sp > 5) softBump(0.3*into); }
    else car.speed *= Math.exp(-0.4*dt);
    car.heading = H.lerpAngle(car.heading, Math.atan2(sg*tx, sg*tz), Math.min(1, dt*12));
    wall.slides++;
    if(sp > 4 && (scrapeT -= dt) <= 0){ scrapeT = 0.07; sound.tone(210 + Math.random()*120, 0.08, 'sawtooth', Math.min(0.04, 0.012 + sp*0.0015), 120); }
  }

  // Fake suspension: pitch (p), roll (r) and bounce (b) are damped springs driven by the motion.
  // Stiffness, damping and lean come from the vehicle, so the RV wallows and the speedster stays flat.
  const spring = { p:0, pv:0, r:0, rv:0, b:0, bv:0, squash:0 };
  function stepSpring(dt, accel, lateral){
    const k = V.k, d = V.d;
    spring.pv += (-k*spring.p - d*spring.pv - accel*0.2*V.pitch)*dt; spring.p += spring.pv*dt;
    spring.rv += (-k*spring.r - d*spring.rv + lateral*0.25*V.roll)*dt; spring.r += spring.rv*dt;
    spring.bv += (-160*spring.b - 12*spring.bv)*dt; spring.b += spring.bv*dt;
    spring.squash = Math.max(0, spring.squash - dt*3.5);
    const c = car.chassis;
    if(state.reduced){ c.rotation.set(0, 0, 0); c.position.y = 0; c.scale.set(1, 1, 1); return; }
    const pm = 0.12*V.pitch, rm = 0.12*V.roll;
    c.rotation.x = Math.max(-pm, Math.min(pm, spring.p));
    c.rotation.z = Math.max(-rm, Math.min(rm, spring.r));
    const road = Math.abs(Math.sin(performance.now()*0.018))*0.025*Math.min(1, Math.abs(car.speed)/6);
    c.position.y = road + spring.b;
    const s = Math.sin(spring.squash*Math.PI)*0.12*spring.squash;
    c.scale.set(1 + s, 1 - s*1.4, 1 + s);
  }

  // ai: { thr, steer } from the call autopilot instead of the keys (thr and steer in -1..1), plus
  // optional max / accel / brake overrides and a skip(collider) filter for resolveCar.
  function stepCar(dt, ai = null){
    const v0 = car.speed;
    const boost = !ai && keys.boost;
    const thr = ai ? ai.thr : (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
    const max = ai?.max ?? (boost ? V.boost : V.max);
    if(thr !== 0){ const opposing = thr * car.speed < 0; car.speed += thr * (opposing ? (ai?.brake ?? V.brake) : (ai?.accel ?? V.accel)) * dt; }
    else car.speed *= Math.exp(-V.coast*dt);
    if(!ai && keys.brake) car.speed *= Math.exp(-V.hand*dt);
    car.speed = Math.max(-V.rev, Math.min(max, car.speed));
    const steerIn = ai ? ai.steer : (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    car.steer += (steerIn - car.steer) * Math.min(1, dt*10);
    car.heading += car.steer * V.turn * dt * Math.max(-1, Math.min(1, car.speed/6));
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    car.x += fx*car.speed*dt; car.z += fz*car.speed*dt;
    resolveCar(dt, ai?.skip);
    // physics twin
    car.body.position.set(car.x, 0.2 + V.bh, car.z);
    car.body.velocity.set(fx*car.speed, 0, fz*car.speed);
    car.body.quaternion.setFromEuler(0, car.heading, 0);
    // visuals
    car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.heading;
    const wr = rig.spec.wheel.r;
    for(const w of car.wheels) w.children.forEach(m => m.rotation.x += car.speed*dt/wr);
    for(const w of car.fronts) w.rotation.y = car.steer*0.45;
    wheelRing.rotation.y = car.steer*1.4;
    const accel = (car.speed - v0)/Math.max(dt, 1e-3);
    const lateral = car.steer*car.speed;
    stepSpring(dt, accel, lateral);
    // dust from the rear wheels when launching, boosting, braking hard or carving a turn
    puffClock -= dt;
    const kick = Math.abs(accel) > 14 || (boost && Math.abs(car.speed) > 12) || Math.abs(lateral) > 14;
    if(kick && Math.abs(car.speed) > 1.5 && puffClock <= 0 && !state.reduced){
      puffClock = 0.05;
      const bx = -fx*(V.hl - 0.4), bz = -fz*(V.hl - 0.4), sx = Math.cos(car.heading)*V.hw, sz = -Math.sin(car.heading)*V.hw;
      const side = Math.random() < 0.5 ? 1 : -1;
      puff(car.x + bx + sx*side, car.z + bz + sz*side, -fx*car.speed*0.12 + (Math.random()-0.5), -fz*car.speed*0.12 + (Math.random()-0.5));
    }
    sound.engine(car.speed*V.sound);
  }

  /* ---------- lights: brake, turn signals, headlights, boost flames ---------- */
  const ls = { night:0, flame:0, sig:null, sigOn:false, sigT:0, turn:0, lastH:0, brake:false, boosting:false };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function signal(dir){
    if(state.mode !== 'drive' || !state.started) return;
    ls.sig = ls.sig === dir ? null : dir;
    ls.sigOn = false; ls.sigT = 0; ls.turn = 0;
    ctx.bus.emit('car:signal', { dir:ls.sig });
  }
  const glowOn = (m, i, a) => { m.emissiveIntensity = i; m.opacity = a; };
  function stepLights(dt, mode){
    const driving = mode === 'drive' && state.started;
    const night = ctx.modules.atmosphere?.isNight?.() ? 1 : 0;
    ls.night += (night - ls.night)*Math.min(1, dt*2);
    const n = ls.night;
    // shared accents: the RV windows go from sky blue glass to warm lamplight, the pods brighten
    ACC.warm.color.copy(WARM_DAY).lerp(WARM_NIGHT, n); glowOn(ACC.warm, 1.8*n, 1 - 0.5*n);
    glowOn(ACC.fog, 0.5 + 1.6*n, 0.75 - 0.35*n);
    ACC.teal.emissiveIntensity = 1.3 + 0.5*n + (state.reduced ? 0 : 0.25*Math.sin(performance.now()*0.004));
    // headlights glow, much brighter by night, and throw a pool on the ground
    glowOn(LAMP.head, 0.45 + 2.4*n, 0.8 - 0.55*n);
    pool.visible = n > 0.02; pool.material.opacity = 0.55*n;
    // brake lights on Space; tail lights glow softly at night
    ls.brake = driving && keys.brake;
    if(ls.brake) glowOn(LAMP.tail, 3.2, 0.25); else glowOn(LAMP.tail, 0.2 + 0.9*n, 1 - 0.35*n);
    // turn signals: blink with a tick and a tock; cancel themselves once a turn of about 60 degrees
    // that way is done and the wheel is back straight (heading grows turning left)
    if(!driving) ls.sig = null;
    if(ls.sig){
      if((ls.sigT -= dt) <= 0){ ls.sigT = 0.36; ls.sigOn = !ls.sigOn; sound.tone(ls.sigOn ? 1560 : 1180, 0.035, 'square', 0.025); }
      ls.turn += wrap(car.heading - ls.lastH);
      if(((ls.sig === 'left' && ls.turn > 1.1) || (ls.sig === 'right' && ls.turn < -1.1)) && Math.abs(car.steer) < 0.2){ ls.sig = null; ctx.bus.emit('car:signal', { dir:null }); }
    }
    ls.lastH = car.heading;
    const L = ls.sig === 'left' && ls.sigOn, R = ls.sig === 'right' && ls.sigOn;
    glowOn(LAMP.left, L ? 3 : 0, L ? 0.3 : 1); glowOn(LAMP.right, R ? 3 : 0, R ? 0.3 : 1);
    // boost flames: flicker in fast, die out a little slower; a whoomp on light-up, a pop on release
    const want = driving && keys.boost && (keys.up || car.speed > 2) ? 1 : 0;
    if(want && !ls.boosting) sound.tone(120, 0.25, 'sawtooth', 0.05, 45);
    if(!want && ls.boosting && ls.flame > 0.5) sound.tone(80, 0.1, 'square', 0.05, 40);
    ls.boosting = !!want;
    ls.flame += (want - ls.flame)*Math.min(1, dt*(want ? 14 : 8));
    const k = ls.flame;
    for(const f of rig.flames){
      f.g.visible = k > 0.02;
      if(!f.g.visible) continue;
      const j = state.reduced ? 0.5 : Math.random();
      f.g.scale.set(k*(0.85 + 0.3*j), k*(0.85 + 0.3*j), k*(1.1 + 0.7*j)*(0.8 + Math.min(0.6, Math.abs(car.speed)/40)));
      f.inner.scale.z = 0.5 + 0.2*(1 - j);
    }
  }

  // Door swing, driven by openDoor(); 0..1 over the animation.
  let doorT = 0;
  function stepDoor(dt){
    if(doorT <= 0){ door.rotation.y = 0; return; }
    doorT = Math.max(0, doorT - dt/0.7);
    door.rotation.y = -Math.sin(doorT*Math.PI) * 1.15;   // swings outward from the front hinge
  }

  // Parked: visuals and the kinematic twin sit still where the car is.
  function park(){
    car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.heading;
    car.body.position.set(car.x, 0.2 + V.bh, car.z); car.body.velocity.setZero(); car.body.quaternion.setFromEuler(0, car.heading, 0);
  }
  function syncPlayer(){ const P = state.player; P.x = car.x; P.z = car.z; P.heading = car.heading; P.speed = car.speed; P.pushRadius = R_CAR + 0.95; }

  /* ---------- call: H while walking, the car comes to you ---------- */
  // Far off (over 35 m, off screen, or deep water in the way) it vanishes in a poof and pops back in
  // on screen 18 to 24 m away, on the side it was on. Then it drives in at up to 26 m/s, wades the
  // light shallows (deep water is a wall), hops low obstacles but never trees, circles the walker
  // once and parks on his right side with a double honk.
  const CALL_TOP = 26, CALL_ACCEL = 30, CALL_BRAKE = 36, FAR = 35, LOW = 1.4, SHALLOW = 2.4, RING = 4.5, RING_AT = 6.5;
  const WATER_Y = -0.28;                 // map.js WATER_Y, the sea surface
  const call = { on:false, t:0, stuck:0, best:1e9, side:1, near:[], low:[], nearT:0, spot:null, spotT:0, settle:0, from:null,
    phase:'drive', pt:0, hop:null, ring:null, circled:false, wet:false, teleT:-9, checkT:0, jumps:0, teleports:0 };
  const lay = () => ctx.modules.map?.layout;
  // True when a disc of radius r at (x, z) is clear of every collider in list and inside the edge.
  function fits(x, z, r, list){
    if(Math.hypot(x, z) > ctx.island.radius - 3) return false;
    for(const c of list){
      const dx = x - c.x, dz = z - c.z;
      if(c.kind === 'circle'){ if(dx*dx + dz*dz < (r + c.r)*(r + c.r)) return false; continue; }
      const reach = r + c.hw + c.hd; if(Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const co = Math.cos(c.ang), si = Math.sin(c.ang), lx = dx*co - dz*si, lz = dx*si + dz*co;
      if(Math.hypot(Math.max(0, Math.abs(lx) - c.hw), Math.max(0, Math.abs(lz) - c.hd)) < r) return false;
    }
    return true;
  }
  // Dry ground or a road (bridges count), so the car never parks in water.
  function dryAt(x, z){ const L = lay(); if(!L?.landAt) return true; return L.landAt(x, z) || (L.roadDistAt?.(x, z) ?? 9) < 4.5; }
  // Water depth as map.js colours it: the signed distance to the shore (metres, positive over
  // water). Its shader is pale turquoise to about 2.5 m out and teal past that, so under 2.4 m is
  // the light shallows the car may wade. Roads (bridges) always count as dry.
  function sdAt(x, z){
    const L = lay(); if(!L?.landAt || (L.roadDistAt?.(x, z) ?? 99) < 4.5) return -9;
    return L.sdAt ? L.sdAt(x, z) : L.landAt(x, z) ? -L.dLandAt(x, z) : L.dWaterAt(x, z);
  }
  const passable = (x, z) => sdAt(x, z) < SHALLOW;
  // Deep water anywhere on the straight line between two points, sampled every 1.5 m.
  function deepBetween(ax, az, bx, bz){
    const n = Math.ceil(Math.hypot(bx - ax, bz - az)/1.5);
    for(let i = 1; i < n; i++){ const u = i/n; if(!passable(ax + (bx - ax)*u, az + (bz - az)*u)) return true; }
    return false;
  }
  // Collider classes. Heights come from the cannon twins: solidBox and solidCircle put a static
  // body of height h at y = h/2, so h = 2y. 'shore' is map.js's invisible shoreline chain (circles
  // of r 1.2 standing in water): the call wades past it and goes by water depth instead. 'low' is
  // 1.4 m or less and gets hopped. Everything else is 'tall' and steered round, including any
  // collider with no twin (bridge rails, islet palms). Tree rule: the scatter registers every trunk
  // as solidCircle(x, z, 0.5, h + 2), a 3.5 to 5.3 m twin, so a tree is always tall, never jumped.
  let cls = null, clsN = -1;
  function classify(){
    if(cls && clsN === ctx.colliders.length) return cls;
    const hs = new Map(), key = (x, z) => Math.round(x*20) + ',' + Math.round(z*20), L = lay();
    for(const b of world.bodies || []) if(b.type === CANNON.Body.STATIC && b.position.y > 0) hs.set(key(b.position.x, b.position.z), b.position.y*2);
    cls = { shore:new Set(), low:new Set(), tall:[], h:new Map() }; clsN = ctx.colliders.length;
    for(const c of ctx.colliders){
      if(c.shore || (c.kind === 'circle' && c.r === 1.2 && L?.landAt && !L.landAt(c.x, c.z))){ cls.shore.add(c); continue; }
      const h = hs.get(key(c.x, c.z));
      if(h !== undefined && h <= LOW){ cls.low.add(c); cls.h.set(c, h); } else cls.tall.push(c);
    }
    return cls;
  }
  const around = (list, x, z, r) => list.filter(c => Math.abs(c.x - x) < r && Math.abs(c.z - z) < r);
  // Resolve against everything except the shore chain, and low colliders while in the air.
  const skip = c => cls.shore.has(c) || (!!call.hop && cls.low.has(c));
  const v3 = new THREE.Vector3();
  // On screen: project the point (half a metre up) through the camera into normalised device
  // coordinates, where the frame is -1..1 on x and y and in front of the camera is -1..1 on z;
  // m is the margin kept from the frame edge.
  function onScreen(x, z, m = 0){
    const cam = ctx.camera; if(!cam) return true;
    v3.set(x, 0.5, z).project(cam);
    return Math.abs(v3.x) < 1 - m && Math.abs(v3.y) < 1 - m && v3.z > -1 && v3.z < 1;
  }
  const propAt = (x, z, r) => (ctx.props || []).some(p => p.body && Math.hypot(p.body.position.x - x, p.body.position.z - z) < r);
  // Where to park: the walker's right side first. Heading h faces (sin h, cos h), so his right is
  // (-cos h, sin h). If that is blocked, the first clear spot round him. Gaps grow with the vehicle.
  function callSpot(){
    const P = state.player, h = P.heading, rx = -Math.cos(h), rz = Math.sin(h), fx = Math.sin(h), fz = Math.cos(h);
    const a = V.hw + 1.62, b = V.hl + 2;
    for(const [u, v] of [[a, 0], [a + 0.7, 0], [a, -1.6], [a, 1.6], [-a, 0], [-a - 0.7, 0], [0, -b], [0, b]]){
      const x = P.x + rx*u + fx*v, z = P.z + rz*u + fz*v;
      if(fits(x, z, R_CAR, ctx.colliders) && dryAt(x, z)) return { x, z, h };
    }
    return null;
  }
  // Where to pop back in: rings 18 to 24 m round the walker every 10 degrees. A spot counts if it
  // is on screen with a 15% margin, wadeable under the whole car, clear of tall colliders and
  // props, and has a clear-ish line to him (no deep water, nothing tall on a 0.8 m disc). Of
  // those, the one whose bearing from him is nearest the car's old bearing. Wider rings if none.
  function teleSpot(){
    const P = state.player, near = around(classify().tall, P.x, P.z, 40), from = Math.atan2(car.x - P.x, car.z - P.z);
    const wade = (x, z) => passable(x, z) && [0, 1, 2, 3].every(k => passable(x + Math.sin(k*Math.PI/2)*R_CAR*0.8, z + Math.cos(k*Math.PI/2)*R_CAR*0.8));
    const line = (x, z) => { const d = Math.hypot(P.x - x, P.z - z), n = Math.ceil(d/1.5);
      for(let i = 1; i < n; i++){ const u = i/n; if(d*(1 - u) < 2) break; const sx = x + (P.x - x)*u, sz = z + (P.z - z)*u; if(!passable(sx, sz) || !fits(sx, sz, 0.8, near)) return false; }
      return true; };
    for(const radii of [[18, 20, 22, 24], [13, 15, 26, 28]]){
      let best = null, bd = 9;
      for(const r of radii) for(let k = 0; k < 36; k++){
        const a = k/36*Math.PI*2, x = P.x + Math.sin(a)*r, z = P.z + Math.cos(a)*r, d = Math.abs(wrap(a - from));
        if(d >= bd || !onScreen(x, z, 0.15) || !wade(x, z) || !fits(x, z, R_CAR, near) || propAt(x, z, R_CAR + 0.6) || !line(x, z)) continue;
        best = { x, z }; bd = d;
      }
      if(best) return best;
    }
    return null;
  }
  const WHISKERS = [0, 0.35, 0.7, 1.05, 1.5, 2.0];
  // A heading is open when two probes along it (half way and at the look distance) fit the car
  // clear of tall colliders, stay out of deep water and keep clear of the walker.
  function openAlong(a, look){
    const P = state.player;
    for(const d of [look*0.5, look]){
      const x = car.x + Math.sin(a)*d, z = car.z + Math.cos(a)*d;
      if(!fits(x, z, R_CAR*0.85, call.near) || !passable(x, z) || Math.hypot(x - P.x, z - P.z) < R_CAR*0.85 + 0.6) return false;
    }
    return true;
  }

  // Water spray: a second pool of droplets thrown up and pulled down by gravity, gone at the surface.
  const dropGeo = new THREE.SphereGeometry(0.11, 6, 4), dropMat = new THREE.MeshStandardMaterial({ color:'#e8fbff', roughness:0.3, transparent:true, opacity:0.85 });
  const drops = [];
  for(let i = 0; i < 28; i++){ const m = new THREE.Mesh(dropGeo, dropMat); m.visible = false; scene.add(m); drops.push({ m, life:0, vx:0, vy:0, vz:0 }); }
  let dropNext = 0, wakeClock = 0, trailClock = 0;
  function drop(x, z, vx, vy, vz){
    const d = drops[dropNext]; dropNext = (dropNext + 1) % drops.length;
    d.life = 1; d.vx = vx; d.vy = vy; d.vz = vz; d.m.position.set(x, WATER_Y + 0.1, z); d.m.visible = true;
  }
  function stepDrops(dt){
    for(const d of drops){
      if(d.life <= 0) continue;
      d.life -= dt*1.4; d.vy -= 14*dt;
      const p = d.m.position; p.x += d.vx*dt; p.y += d.vy*dt; p.z += d.vz*dt;
      if(d.life <= 0 || p.y < WATER_Y - 0.05){ d.life = 0; d.m.visible = false; }
    }
  }
  function splashAt(x, z, n){
    if(state.reduced) n = Math.ceil(n/2);
    for(let i = 0; i < n; i++){ const a = i/n*Math.PI*2 + Math.random(); drop(x + Math.cos(a)*0.8, z + Math.sin(a)*0.8, Math.cos(a)*2.5, 3 + Math.random()*2, Math.sin(a)*2.5); }
  }
  // Wake while wading: droplets off both rear wheels, thrown out sideways and back.
  function wake(dt){
    if((wakeClock -= dt) > 0 || state.reduced && Math.random() < 0.5) return;
    wakeClock = 0.05;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading), sx = fz, sz = -fx, v = Math.abs(car.speed);
    for(const side of [1, -1]){
      const x = car.x - fx*(V.hl - 0.4) + sx*V.hw*side, z = car.z - fz*(V.hl - 0.4) + sz*V.hw*side;
      drop(x, z, sx*side*(1.5 + v*0.12) - fx*v*0.15, 2 + Math.random()*1.5 + v*0.06, sz*side*(1.5 + v*0.12) - fz*v*0.15);
    }
  }
  // Wheels up into the arches while airborne (k 0..1).
  function tuck(k){ const r = rig.spec.wheel.r; for(const w of car.wheels) w.position.y = r + 0.22*k; }
  // Visuals and the kinematic twin at height y with vertical speed vy, so props see the hop too.
  function pose(y, vy = 0){
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    car.group.position.set(car.x, y, car.z); car.group.rotation.y = car.heading;
    car.body.position.set(car.x, 0.2 + V.bh + y, car.z); car.body.velocity.set(fx*car.speed, vy, fz*car.speed); car.body.quaternion.setFromEuler(0, car.heading, 0);
  }

  // The nearest low obstacle in the car's lane just ahead: low colliders, and low props (a prop's
  // top is its bounding box's upper y). A box's reach along a unit direction f is
  // hw|ex.f| + hd|ez.f|, its local axes ex = (cos a, -sin a), ez = (sin a, cos a) projected on f.
  // null when there is none, or the landing (just past it) is deep water or tall.
  function lowAhead(){
    if(car.speed < 3) return null;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading), reach = V.hl + Math.max(1.2, car.speed*0.18);
    let o = null;
    const test = (x, z, ef, es, top) => {
      const dx = x - car.x, dz = z - car.z, ahead = dx*fx + dz*fz, side = Math.abs(dx*fz - dz*fx);
      if(side > V.hw + es || ahead - ef > reach || ahead - ef < 0) return;
      if(!o || ahead - ef < o.near) o = { near:ahead - ef, far:ahead + ef, top };
    };
    for(const c of call.low){
      if(c.kind === 'circle'){ test(c.x, c.z, c.r, c.r, cls.h.get(c)); continue; }
      const co = Math.cos(c.ang), si = Math.sin(c.ang);
      test(c.x, c.z, c.hw*Math.abs(co*fx - si*fz) + c.hd*Math.abs(si*fx + co*fz), c.hw*Math.abs(co*fz + si*fx) + c.hd*Math.abs(si*fz - co*fx), cls.h.get(c));
    }
    for(const p of ctx.props || []){
      const b = p.body; if(!b?.mass) continue;
      const dx = b.position.x - car.x, dz = b.position.z - car.z; if(dx*dx + dz*dz > 400) continue;
      b.updateAABB?.(); const a = b.aabb; if(!a) continue;
      const top = a.upperBound.y; if(top > LOW || top < 0.3) continue;
      const e = Math.max(a.upperBound.x - a.lowerBound.x, a.upperBound.z - a.lowerBound.z)/2;
      test(b.position.x, b.position.z, e, e, top);
    }
    if(!o) return null;
    // the car's centre comes down 0.8 m past its own length beyond the far side
    o.land = o.far + V.hl + 0.8;
    for(const u of [0.5, 1]){
      const x = car.x + fx*o.land*u, z = car.z + fz*o.land*u;
      if(!passable(x, z) || !fits(x, z, R_CAR*(u < 1 ? 0.7 : 0.9), call.near)) return null;
    }
    return o;
  }
  // Take off: fast enough (8 m/s) and a flight time T that carries the car to the landing point,
  // 0.45 to 1 s. Peak height 0.6 m over its top, kept within 1.2 to 1.8 m.
  function startHop(o){
    const T = Math.min(1, Math.max(0.45, o.land/Math.max(8, car.speed)));
    car.speed = Math.max(car.speed, 8, o.land/T);
    call.hop = { t:0, T, H:Math.min(1.8, Math.max(1.2, o.top + 0.6)) };
    call.jumps++; spring.bv += 1.5; sound.tone(300, 0.12, 'sine', 0.05, 520);
  }
  // Height this frame, then pose. A hop is y = 4 H u (1 - u) with u = t/T: the parabola through 0
  // at take-off and landing that peaks at H half way; vy is its slope 4 H (1 - 2u) / T. On the
  // ground in the shallows the wheels sink up to 0.4 m and throw a wake.
  function lift(dt){
    let y = 0, vy = 0;
    const h = call.hop;
    if(h){
      h.t += dt; const u = Math.min(1, h.t/h.T);
      y = 4*h.H*u*(1 - u); vy = 4*h.H*(1 - 2*u)/h.T; tuck(Math.sin(u*Math.PI));
      if(u >= 1){
        call.hop = null; y = 0; vy = 0; tuck(0);
        spring.squash = 1; spring.bv -= 2.2; sound.sfx?.thud ? sound.sfx.thud(4) : sound.tone(110, 0.16, 'triangle', 0.1, 70);
        if(sdAt(car.x, car.z) > 0.1) splashAt(car.x, car.z, 10); else poof(car.x, car.z);
      }
    }
    const sd = sdAt(car.x, car.z), wet = sd > 0.1;
    if(wet !== call.wet){ call.wet = wet; if(wet && !call.hop) splashAt(car.x, car.z, 8); }
    if(wet && !call.hop){ y = -0.4*Math.min(1, sd/2); if(Math.abs(car.speed) > 2) wake(dt); }
    pose(y, vy);
  }

  function honkShort(){ const [a, b] = V.honk; sound.tone(a, 0.12, 'square', 0.06); sound.tone(b, 0.12, 'square', 0.05); setTimeout(() => { sound.tone(a, 0.1, 'square', 0.05); sound.tone(b, 0.1, 'square', 0.04); }, 150); }
  function arrive(){ call.on = false; honkShort(); H.jolt(car.x, car.z, 8); spring.squash = 1; spring.bv += 1.2; sound.engine(null); }
  function poof(x, z){
    const n = state.reduced ? 4 : 8;
    for(let i = 0; i < n; i++){ const a = i/n*Math.PI*2; puff(x + Math.cos(a)*0.9, z + Math.sin(a)*0.9, Math.cos(a)*2.6, Math.sin(a)*2.6); }
  }
  // Straight onto the parking spot in a puff of dust (stuck, or nowhere on screen to pop in).
  function popToSpot(){ const s = call.spot; poof(car.x, car.z); api.placeAt(s.x, s.z, s.h); poof(s.x, s.z); sound.tone(660, 0.16, 'sine', 0.06, 1320); arrive(); }
  // Vanish now; the car moves at once but stays hidden (its twin 3 m up, clear of everything) and
  // pops in 0.3 s later facing the walker.
  function teleport(){
    const t = teleSpot(), P = state.player;
    if(!t){ popToSpot(); return; }
    poof(car.x, car.z); sound.tone(520, 0.14, 'sine', 0.05, 1040);
    car.x = t.x; car.z = t.z; car.heading = Math.atan2(P.x - t.x, P.z - t.z); car.speed = 0; car.steer = 0;
    Object.assign(call, { phase:'gone', pt:0, hop:null, best:1e9, stuck:0, nearT:0, teleT:call.t, wet:sdAt(t.x, t.z) > 0.1 });
    call.teleports++;
    car.group.visible = false; pose(3);
  }
  function startCall(){
    if(state.mode !== 'walk' || !state.started) return false;
    const s = callSpot();
    if(!s){ ctx.bus.emit('car:call', { ok:false }); return false; }
    Object.assign(call, { on:true, t:0, stuck:0, best:1e9, spot:s, spotT:0, nearT:0, settle:0, from:null,
      phase:'drive', pt:0, hop:null, ring:null, circled:false, wet:false, teleT:-9, checkT:0.5, jumps:0, teleports:0 });
    classify(); ctx.camera?.updateMatrixWorld?.();
    const P = state.player;
    if(Math.hypot(car.x - P.x, car.z - P.z) > FAR || !onScreen(car.x, car.z) || deepBetween(car.x, car.z, P.x, P.z)) teleport();
    ctx.bus.emit('car:call', { ok:true });
    return true;
  }
  function stopCall(){
    call.on = false; call.settle = 0; call.hop = null; call.ring = null; call.phase = 'drive';
    car.group.visible = true; if(rig) tuck(0);
  }

  // The lap round the walker. Ring points are P + r (sin a, cos a); the lap is clear when 24 of
  // them fit the car (80%) clear of tall colliders and out of deep water.
  function ringClear(cx, cz, r, from = 0, to = Math.PI*2, r0 = r){
    for(let k = 0; k <= 24; k++){
      const u = k/24, a = from + (to - from)*u, rr = r0 + (r - r0)*Math.min(1, u*4), x = cx + Math.sin(a)*rr, z = cz + Math.cos(a)*rr;
      if(!passable(x, z) || !fits(x, z, R_CAR*0.8, call.near)) return false;
    }
    return true;
  }
  // Pick the radius (4.5 m, else 5.5) and direction. dir +1 turns left (heading grows). The sweep
  // is one full turn plus the rest of the way round to 0.6 rad short of the parking spot's
  // bearing, so it rolls into the spot from behind; the direction with the shorter rest wins,
  // as long as its entry arc (radius easing in over a quarter turn) is clear.
  function startCircle(){
    const P = state.player, a0 = Math.atan2(car.x - P.x, car.z - P.z), r0 = Math.hypot(car.x - P.x, car.z - P.z);
    const as = Math.atan2(call.spot.x - P.x, call.spot.z - P.z);
    const restOf = dir => { const r = wrap(as - dir*0.6 - a0)*dir; return r < 0 ? r + Math.PI*2 : r; };
    for(const R of [RING, RING + 1]){
      if(!ringClear(P.x, P.z, R)) continue;
      for(const dir of [1, -1].sort((a, b) => restOf(a) - restOf(b))){
        if(!ringClear(P.x, P.z, R, a0, a0 + dir*Math.PI/2, r0)) continue;
        call.ring = { cx:P.x, cz:P.z, R, r0, a:a0, dir, sweep:Math.PI*2 + restOf(dir), done:0, v:Math.max(6, Math.min(12, car.speed)) };
        call.phase = 'circle';
        return true;
      }
    }
    return false;
  }
  // Along the ring at 12 m/s: the angle moves v/r rad/s, the radius eases from the entry distance
  // to R over the first quarter (smoothstep), heading follows the direction actually travelled.
  function stepCircle(dt){
    const g = call.ring;
    g.v += (12 - g.v)*Math.min(1, dt*3);
    const q = Math.min(1, g.done/(Math.PI/2)), r = g.r0 + (g.R - g.r0)*q*q*(3 - 2*q);
    const da = g.v*dt/r; g.a += g.dir*da; g.done += da;
    const x0 = car.x, z0 = car.z;
    car.x = g.cx + Math.sin(g.a)*r; car.z = g.cz + Math.cos(g.a)*r;
    car.heading = H.lerpAngle(car.heading, Math.atan2(car.x - x0, car.z - z0), Math.min(1, dt*14));
    car.speed = g.v; car.steer += (g.dir*0.7 - car.steer)*Math.min(1, dt*8);
    if(!call.hop){ const o = lowAhead(); if(o) startHop(o); car.speed = g.v; }
    const wr = rig.spec.wheel.r;
    for(const w of car.wheels) w.children.forEach(m => m.rotation.x += car.speed*dt/wr);
    for(const w of car.fronts) w.rotation.y = car.steer*0.45;
    wheelRing.rotation.y = car.steer*1.4;
    stepSpring(dt, 0, car.steer*car.speed);
    sound.engine(car.speed*V.sound);
    // a dust trail off the outside rear wheel on dry ground
    if(!call.wet && !call.hop && !state.reduced && (trailClock -= dt) <= 0){
      trailClock = 0.06;
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading), out = -g.dir;
      puff(car.x - fx*(V.hl - 0.4) + fz*V.hw*out, car.z - fz*(V.hl - 0.4) - fx*V.hw*out, -fx*1.2 + fz*out*1.5, -fz*1.2 - fx*out*1.5);
    }
    lift(dt);
    if(g.done >= g.sweep){ call.ring = null; call.phase = 'settle'; call.from = null; }
  }

  function stepCall(dt){
    call.t += dt;
    const P = state.player; classify();
    // Popping back in: hidden for 0.3 s, then a poof and a drop from 1.6 m. y = 1.6 (1 - u^2) is
    // a fall from rest that lands at u = 1; the landing squash is the bounce.
    if(call.phase === 'gone' || call.phase === 'drop'){
      call.pt += dt; sound.engine(null);
      if(call.phase === 'gone'){
        pose(3);
        if(call.pt >= 0.3){ call.phase = 'drop'; call.pt = 0; car.group.visible = true; poof(car.x, car.z); sound.tone(660, 0.16, 'sine', 0.06, 1320); }
        return;
      }
      const u = Math.min(1, call.pt/0.3);
      tuck(1 - u); stepSpring(dt, 0, 0); pose(1.6*(1 - u*u), -2*1.6*u/0.3);
      if(u >= 1){
        call.phase = 'drive'; tuck(0); pose(0);
        spring.squash = 1; spring.bv -= 2.4; sound.sfx?.thud ? sound.sfx.thud(3) : sound.tone(110, 0.16, 'triangle', 0.1, 70);
        if(call.wet) splashAt(car.x, car.z, 10); else poof(car.x, car.z);
        car.speed = 6;
      }
      return;
    }
    if(call.phase !== 'settle' && call.settle === 0 && (call.spotT -= dt) <= 0){
      call.spotT = 0.25; const was = call.spot; call.spot = callSpot() || call.spot;
      if(Math.hypot(call.spot.x - was.x, call.spot.z - was.z) > 2) call.best = 1e9;   // he walked on: progress counts from here
    }   // the spot is frozen once it is parking
    if((call.nearT -= dt) <= 0){ call.nearT = 0.25; call.near = around(cls.tall, car.x, car.z, 26); call.low = around([...cls.low], car.x, car.z, 26); }
    const s = call.spot, dx = s.x - car.x, dz = s.z - car.z, dist = Math.hypot(dx, dz);
    // Last stretch: ease onto the spot and turn to face the walker's way, then honk.
    if(call.phase === 'settle' || call.settle > 0 || (dist < 1.2 && !call.hop && call.phase === 'drive')){
      if(!call.from) call.from = { x:car.x, z:car.z, h:car.heading, dur:Math.max(0.4, dist/6) };
      call.phase = 'settle';
      call.settle = Math.min(1, call.settle + dt/call.from.dur);
      const e = 1 - Math.pow(1 - call.settle, 3), f = call.from;
      car.x = f.x + (s.x - f.x)*e; car.z = f.z + (s.z - f.z)*e; car.heading = H.lerpAngle(f.h, s.h, e);
      car.speed = 0; car.steer *= 0.8; park(); stepSpring(dt, 0, 0); sound.engine(null);
      if(call.settle >= 1) arrive();
      return;
    }
    if(call.phase === 'circle'){ stepCircle(dt); return; }
    const dP = Math.hypot(car.x - P.x, car.z - P.z);
    // Far again (he ran off) or deep water now between: pop over again, at most every 3 s.
    if((call.checkT -= dt) <= 0 && !call.hop){
      call.checkT = 0.5;
      if(call.t - call.teleT > 3 && (dP > FAR + 10 || deepBetween(car.x, car.z, P.x, P.z))){ teleport(); return; }
    }
    // Close: one lap round him (skipped when the ring is blocked).
    if(!call.circled && !call.hop && dP < RING_AT){ call.circled = true; if(startCircle()){ stepCircle(dt); return; } }
    // Stuck = no metre of progress toward the spot for 4 s (or 18 s in all): pop over in a puff of dust.
    if(dist < call.best - 1){ call.best = dist; call.stuck = 0; } else call.stuck += dt;
    if(call.stuck > 4 || call.t > 18){ popToSpot(); return; }
    // Whiskers: the open heading nearest the straight line. The side that worked last is tried
    // first, so the car commits to going round an obstacle one way instead of dithering.
    const direct = Math.atan2(dx, dz), look = Math.min(dist, 3 + Math.abs(car.speed)*0.35);
    let want = direct;
    for(const w of WHISKERS){
      const opts = w ? [w*call.side, -w*call.side] : [0];
      const hit = opts.find(o => openAlong(direct + o, look));
      if(hit !== undefined){ want = direct + hit; if(hit) call.side = Math.sign(hit); break; }
    }
    const err = wrap(want - car.heading);
    // Brake in time: the fastest speed that can still slow to vEnd in the distance left at part of
    // the brake, v = sqrt(vEnd^2 + 2 a d). vEnd is the lap's pace, or a crawl onto the spot.
    const left = call.circled ? dist : Math.max(0, dP - RING_AT), vEnd = call.circled ? 2 : 10, a = CALL_BRAKE*(call.circled ? 0.35 : 0.7);
    let cap = Math.max(4, Math.min(CALL_TOP, Math.sqrt(vEnd*vEnd + 2*a*left))*Math.max(0.35, Math.cos(err)));
    if(call.wet) cap *= 0.8;                                  // the shallows cost a little speed
    if(!call.hop){ const o = lowAhead(); if(o) startHop(o); }
    const x0 = car.x, z0 = car.z;
    stepCar(dt, call.hop ? { thr:0, steer:0, max:CALL_TOP, skip }
      : { thr: car.speed < cap - 0.5 ? 1 : car.speed > cap + 0.5 ? -1 : 0, steer: Math.max(-1, Math.min(1, err*3)), max:CALL_TOP, accel:CALL_ACCEL, brake:CALL_BRAKE, skip });
    if(!passable(car.x, car.z)){ car.x = x0; car.z = z0; car.speed = 0; }   // deep water is a wall
    lift(dt);
  }

  buildCar();
  park();

  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior') return;
    if(mode === 'drive' && state.started) stepCar(dt);
    else if(mode === 'walk' && call.on) stepCall(dt);
    else { park(); stepSpring(dt, 0, 0); if(mode !== 'drive') sound.engine(null); }
    stepDoor(dt); stepPuffs(dt); stepDrops(dt); stepLights(dt, mode);
    if(mode === 'drive') syncPlayer();
  }, 10);
  // Into the car: write state.player from the car at once, so nothing reads the walker's last
  // spot for a frame (the camera would swing to it and back).
  ctx.bus.on('mode', ({ to }) => { stopCall(); if(to !== 'drive'){ car.speed = 0; car.steer = 0; sound.engine(null); } else syncPlayer(); });
  ctx.bus.on('teleport', stopCall);
  // H on foot whistles for the car (character.js plays the whistle); in a vehicle H honks below.
  input.on('honk', () => { if(state.mode === 'walk' && !ctx.modules.drone?.active?.()) startCall(); });
  input.on('signalLeft', () => signal('left'));
  input.on('signalRight', () => signal('right'));

  input.on('honk', () => {
    if(state.mode !== 'drive') return;
    const [a, b] = V.honk; sound.tone(a, 0.28, 'square', 0.07); sound.tone(b, 0.28, 'square', 0.06);
    H.jolt(car.x, car.z, 20); spring.squash = 1; spring.bv += 1.5;
  });

  // Switch vehicle. at = { x, z, heading } puts it there; otherwise it takes the old one's place.
  function setVehicle(id, at){
    if(!VEHICLES[id]) return false;
    if(id !== cur){
      stopCall(); useRig(id);
      ls.sig = null; ls.flame = 0; doorT = 0;
      for(const f of rig.flames) f.g.visible = false;
      spring.squash = 1; spring.bv += 1.2;
    }
    if(at) api.placeAt(at.x, at.z, at.heading); else { park(); if(state.mode === 'drive') syncPlayer(); }
    ctx.bus.emit('vehicle', { id });
    return true;
  }

  const api = {
    car,
    seat,                              // Group in the cockpit; the driver parents itself here
    placeAt(x, z, heading){ stopCall(); car.x = x; car.z = z; car.heading = heading; car.speed = 0; car.steer = 0; park(); if(state.mode === 'drive') syncPlayer(); },
    get position(){ return { x:car.x, z:car.z, heading:car.heading }; },
    get radius(){ return R_CAR; },
    get halfWidth(){ return V.hw; },   // footprint for walkers to collide against
    get halfLength(){ return V.hl; },
    openDoor(){ doorT = 1; },
    bump(v = 1){ spring.bv -= 1.4*v; spring.squash = Math.max(spring.squash, 0.6*v); },
    call: startCall,                   // H while walking; false when there is no room beside you
    stopCall,
    calling: () => call.on,
    wall: () => ({ ...wall, touching }),
    // vehicles, for garage.js
    ids: IDS,
    info: id => { const v = VEHICLES[id]; return v && { id, name:v.name, hw:v.hw, hl:v.hl, r:v.r }; },
    vehicle: () => cur,
    setVehicle,
    model: id => MODELS[id] ? makeRig(id, false).root : null,   // a static display copy
    poof,
    lights: () => ({ vehicle:cur, brake:ls.brake, signal:ls.sig, blink:ls.sigOn, flame:+ls.flame.toFixed(2), night:+ls.night.toFixed(2),
      head:+LAMP.head.emissiveIntensity.toFixed(2), tail:+LAMP.tail.emissiveIntensity.toFixed(2), pool:pool.visible }),
  };
  ctx.modes.registerPlayer('drive', api);
  // Critic hooks: window.__island.car
  ctx.expose('car', { call: startCall, stopCall, calling: api.calling, wall: api.wall, lights: api.lights, vehicle: api.vehicle, setVehicle,
    info: () => ({ x:+car.x.toFixed(2), z:+car.z.toFixed(2), heading:+car.heading.toFixed(3), speed:+car.speed.toFixed(2), vehicle:cur, calling:call.on, stuck:+call.stuck.toFixed(2), phase:call.phase, y:+car.group.position.y.toFixed(2), wet:call.wet, jumps:call.jumps, teleports:call.teleports, circled:call.circled, spot:call.spot && { x:+call.spot.x.toFixed(2), z:+call.spot.z.toFixed(2) } }) });
  return api;
}
