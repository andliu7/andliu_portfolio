// Cute characters: builders plus the shared wander / face-the-player / get-bumped simulation.
// addChar and the builders add to the ISLAND scene. For an interior, build a Group yourself
// and reuse eyes() with the room as parent.
export function createActors({ THREE, scene, H, sound, state }){
  const { mesh, box, cyl, ball, rng, lerpAngle } = H;
  const chars = [];
  function eyes(parent, y, z, sep=0.17, r=0.065, blush=true){
    for(const s of [-1, 1]){
      ball(r, '#1b1b24', s*sep, y, z, parent, 10);
      ball(r*0.35, '#ffffff', s*sep + r*0.3, y + r*0.35, z + r*0.75, parent, 8);
      if(blush){ const b = mesh(new THREE.CircleGeometry(r*1.05, 14), '#ff9fb2', s*(sep + r*1.7), y - r*1.5, z - r*0.2, parent, { transparent:true, opacity:.75 }); b.castShadow = false; }
    }
  }
  function addChar(g, x, z, opts={}){
    g.position.set(x, 0, z); scene.add(g);
    const c = Object.assign({ g, x, z, y:0, vy:0, phase:rng()*6, amp:0.12, speed:3.2, face:true, yaw:rng()*6, wander:null, lastBoing:0 }, opts);
    g.rotation.y = c.yaw; chars.push(c); return c;
  }
  function blob(color, x, z, opts={}){
    const g = new THREE.Group();
    mesh(new THREE.CapsuleGeometry(0.42, 0.42, 6, 16), color, 0, 0.72, 0, g);
    eyes(g, 0.92, 0.39);
    ball(0.13, '#2a2a33', -0.18, 0.1, 0.05, g, 10); ball(0.13, '#2a2a33', 0.18, 0.1, 0.05, g, 10);
    if(opts.hat === 'beret'){ const h = cyl(0.3, 0.34, 0.1, '#1b1b24', 0.06, 1.33, 0, g); h.rotation.z = -0.25; }
    if(opts.hat === 'cap'){ cyl(0.36, 0.38, 0.18, opts.hatColor || '#c8102e', 0, 1.3, 0, g); box(0.4, 0.05, 0.3, opts.hatColor || '#c8102e', 0, 1.23, 0.3, g); }
    return addChar(g, x, z, opts);
  }
  function berry(x, z, opts={}){
    const g = new THREE.Group();
    ball(0.6, '#3b4f9e', 0, 0.62, 0, g, 22);
    for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; const c = mesh(new THREE.ConeGeometry(0.08, 0.22, 6), '#23306b', Math.cos(a)*0.13, 1.2, Math.sin(a)*0.13, g); c.rotation.z = Math.cos(a)*0.7; c.rotation.x = -Math.sin(a)*0.7; }
    eyes(g, 0.72, 0.55, 0.2, 0.075);
    return addChar(g, x, z, Object.assign({ amp:0.2, speed:3.6 }, opts));
  }
  function tooth(x, z, s=1){
    const g = new THREE.Group(); const k = new THREE.Group(); k.scale.setScalar(s); g.add(k);
    const b = ball(0.62, '#fbfbf7', 0, 1.0, 0, k, 22); b.scale.set(1, 0.85, 0.9);
    for(const sx of [-0.28, 0.28]){ const r = mesh(new THREE.ConeGeometry(0.2, 0.7, 12), '#fbfbf7', sx, 0.38, 0, k); r.rotation.x = Math.PI; }
    eyes(k, 1.05, 0.52, 0.2, 0.08);
    return addChar(g, x, z, { amp:0.18, speed:2.6 });
  }
  function terrapin(x, z, s=1, opts={}){
    const g = new THREE.Group(); const k = new THREE.Group(); k.scale.setScalar(s); g.add(k);
    const shell = mesh(new THREE.SphereGeometry(0.75, 20, 12, 0, Math.PI*2, 0, Math.PI/2), '#6f7d2e', 0, 0.25, 0, k); shell.scale.y = 0.75;
    cyl(0.78, 0.78, 0.12, '#e3c77a', 0, 0.22, 0, k, 20);
    for(let i=0;i<6;i++){ const a = i/6*Math.PI*2; ball(0.16, '#58651f', Math.cos(a)*0.42, 0.62, Math.sin(a)*0.42, k, 8).scale.y = 0.45; }
    ball(0.3, '#9fae54', 0, 0.45, 0.85, k, 16); eyes(k, 0.52, 1.1, 0.12, 0.05);
    for(const [lx,lz] of [[-.5,.45],[.5,.45],[-.5,-.45],[.5,-.45]]) ball(0.17, '#9fae54', lx, 0.14, lz, k, 10);
    return addChar(g, x, z, Object.assign({ amp:0.06, speed:2 }, opts));
  }
  function robot(x, z, opts={}){
    const g = new THREE.Group();
    box(0.62, 0.5, 0.5, '#e8edf2', 0, 0.45, 0, g); box(0.8, 0.62, 0.66, '#f5f7fa', 0, 1.02, 0, g);
    box(0.62, 0.36, 0.05, '#1f2a44', 0, 1.03, 0.34, g);
    box(0.13, 0.1, 0.02, '#5ff0e0', -0.14, 1.06, 0.37, g); box(0.13, 0.1, 0.02, '#5ff0e0', 0.14, 1.06, 0.37, g);
    cyl(0.02, 0.02, 0.3, '#9aa3b8', 0, 1.48, 0, g, 6); ball(0.07, '#e5484d', 0, 1.65, 0, g, 10);
    for(const sx of [-0.33, 0.33]){ const w = cyl(0.14, 0.14, 0.1, '#1f2a44', sx, 0.15, 0, g, 12); w.rotation.z = Math.PI/2; }
    const panel = box(0.7, 0.46, 0.04, '#ffffff', 0, 0.52, 0.34, g); box(0.7, 0.08, 0.05, '#2f9e8f', 0, 0.72, 0.34, g); panel.castShadow = false;
    return addChar(g, x, z, Object.assign({ amp:0.05, speed:8, face:false }, opts));
  }
  function brainBuddy(x, z){
    const g = new THREE.Group(); ball(0.55, '#f29bbd', 0, 0.75, 0, g, 20);
    for(let i=0;i<9;i++){ const a = i/9*Math.PI*2; ball(0.2, '#ec86ad', Math.cos(a)*0.34, 1.05 + Math.sin(i*1.7)*0.05, Math.sin(a)*0.3 - 0.05, g, 10); }
    eyes(g, 0.78, 0.52, 0.18, 0.07);
    return addChar(g, x, z, { amp:0.2, speed:3 });
  }
  // Make every non-static character within r of (x, z) hop: the honk reaction.
  function jolt(x, z, r){
    for(const c of chars){ if(c.static) continue; if(Math.hypot(c.x - x, c.z - z) < r && c.y <= 0.001) c.vy = 5 + rng()*2; }
  }
  // Characters face, dodge and hop away from state.player (car or walker), using player.pushRadius.
  function step(dt, t){
    const P = state.player, push = P.pushRadius ?? 2.4, R = state.reduced;
    for(const c of chars){
      if(c.static) continue;
      if(c.wander){
        if(!c.target || Math.hypot(c.target[0]-c.x, c.target[1]-c.z) < 0.4){ const a = rng()*Math.PI*2, r = rng()*c.wander.r; c.target = [c.wander.cx + Math.cos(a)*r, c.wander.cz + Math.sin(a)*r]; c.pause = rng()*1.5; }
        if(c.pause > 0) c.pause -= dt; else { const dx = c.target[0]-c.x, dz = c.target[1]-c.z, d = Math.hypot(dx, dz); const v = (c.kind === 'slow' ? 0.8 : 1.4) * dt; c.x += dx/d*Math.min(v, d); c.z += dz/d*Math.min(v, d); c.yaw = lerpAngle(c.yaw, Math.atan2(dx, dz), Math.min(1, dt*6)); }
      }
      const dcx = P.x - c.x, dcz = P.z - c.z, dc = Math.hypot(dcx, dcz);
      if(c.face && dc < 16) c.yaw = lerpAngle(c.yaw, Math.atan2(dcx, dcz), Math.min(1, dt*5));
      if(dc < push && dc > 1e-4){ c.x = P.x - dcx/dc*push; c.z = P.z - dcz/dc*push; if(c.y <= 0.001){ c.vy = 6; const n = performance.now(); if(n - c.lastBoing > 350){ c.lastBoing = n; sound.sfx.boing(); } } }
      if(c.vy !== 0 || c.y > 0){ c.vy -= 24*dt; c.y += c.vy*dt; if(c.y <= 0){ c.y = 0; c.vy = 0; } }
      const bob = R ? 0 : Math.abs(Math.sin(t*c.speed + c.phase))*c.amp;
      c.g.position.set(c.x, c.y + bob, c.z); c.g.rotation.y = c.yaw;
      const sq = R ? 0 : (c.amp > 0 ? (1 - bob/c.amp)*0.06 : 0);
      c.g.scale.set(1 + sq, 1 - sq, 1 + sq);
    }
  }
  return { chars, eyes, addChar, blob, berry, tooth, terrapin, robot, brainBuddy, jolt, step };
}
