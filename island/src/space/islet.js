// The secret islet: a small sand island 32 m off the south shore (behind the Education One
// Schoolhouse), reachable only by swimming. On it: two palms, a few rocks and the carved wing pad
// that lifts you into space. Built into the ISLAND scene at init.
//
// How the walker stands on it without touching character.js: character.js asks
// ctx.modules.map.groundAt(x, z) first for the ground height and falls back to its own sea-floor
// formula when that returns a non-number. index.js wraps that hook with isletGround() below, so
// the beach slopes out of the water exactly like the island's own shores (wade, then walk).
import { buildWingPad } from './models.js';

// Centre (0, 162): due south, 32 m past the coast (coast radius 130 at 90 degrees), inside the
// walker's limit (island.radius 172 minus 2). Checked in space.test.mjs against map.js layout().
export const ISLET = { x:0, z:162, top:0.3, flat:3.2, edge:7.4, seabed:-2.1, padR:1.45, padTop:0.64 };

// Ground height on the islet, or undefined off it (then the island's own formula applies).
// Flat sand to `flat`, a smoothstep beach down to the sea floor at `edge`, the pad on top.
export function isletGround(x, z){
  const d = Math.hypot(x - ISLET.x, z - ISLET.z);
  if(d > ISLET.edge) return undefined;
  if(d < ISLET.padR) return ISLET.padTop;
  if(d <= ISLET.flat) return ISLET.top;
  const k = (d - ISLET.flat)/(ISLET.edge - ISLET.flat), s = k*k*(3 - 2*k);
  return ISLET.top + (ISLET.seabed - ISLET.top)*s;
}

export function buildIslet(ctx){
  const { THREE, scene, helpers:H } = ctx;
  const g = new THREE.Group(); g.name = 'space-islet'; g.position.set(ISLET.x, 0, ISLET.z); scene.add(g);

  // sand: a lathe of the same profile the walker stands on
  const prof = [];
  for(let i = 0; i <= 14; i++){ const d = ISLET.flat + (ISLET.edge - ISLET.flat)*i/14; prof.push(new THREE.Vector2(d, isletGround(ISLET.x + d, ISLET.z))); }
  prof.unshift(new THREE.Vector2(0, ISLET.top));
  prof.push(new THREE.Vector2(ISLET.edge + 0.5, ISLET.seabed - 0.1));
  const sand = new THREE.Mesh(new THREE.LatheGeometry(prof.reverse(), 36), H.mat('#f1dfb3', { side:THREE.DoubleSide }));
  sand.receiveShadow = true; g.add(sand);

  // palms: a bent trunk (one mesh), leaves and coconuts as two instanced meshes for both palms
  const PALMS = [[-2.5, 1.9, 0.5, 4.2], [2.7, 0.9, -0.6, 3.6]];   // [x, z, lean direction, height]
  const leafGeo = new THREE.SphereGeometry(1, 10, 6); leafGeo.scale(0.32, 0.06, 1.5); leafGeo.translate(0, 0, 1.3);
  const leaves = new THREE.InstancedMesh(leafGeo, H.mat('#5fa84a'), PALMS.length*6);
  const nuts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), H.mat('#8a5a3c'), PALMS.length*3);
  leaves.castShadow = nuts.castShadow = true;
  const o3 = new THREE.Object3D(); let li = 0, ni = 0;
  for(const [px, pz, lean, h] of PALMS){
    const trunkGeo = new THREE.CylinderGeometry(0.13, 0.22, h, 8, 8); trunkGeo.translate(0, h/2, 0);
    const pos = trunkGeo.attributes.position;
    for(let i = 0; i < pos.count; i++){ const y = pos.getY(i), bend = 0.09*y*y; pos.setX(i, pos.getX(i) + Math.cos(lean)*bend); pos.setZ(i, pos.getZ(i) + Math.sin(lean)*bend); }   // quadratic bend: steeper toward the top
    trunkGeo.computeVertexNormals();
    const trunk = new THREE.Mesh(trunkGeo, H.mat('#b08a5a')); trunk.position.set(px, ISLET.top - 0.1, pz); trunk.castShadow = true; g.add(trunk);
    const tx = px + Math.cos(lean)*0.09*h*h, tz = pz + Math.sin(lean)*0.09*h*h, ty = ISLET.top - 0.1 + h;
    for(let k = 0; k < 6; k++){
      o3.position.set(tx, ty, tz); o3.rotation.set(0.45, k/6*Math.PI*2 + lean, 0, 'YXZ'); o3.scale.setScalar(1); o3.updateMatrix(); leaves.setMatrixAt(li++, o3.matrix);
    }
    for(let k = 0; k < 3; k++){ const a = k/3*Math.PI*2; o3.position.set(tx + Math.cos(a)*0.2, ty - 0.2, tz + Math.sin(a)*0.2); o3.rotation.set(0, 0, 0); o3.updateMatrix(); nuts.setMatrixAt(ni++, o3.matrix); }
  }
  g.add(leaves, nuts);

  // rocks round the waterline, one instanced mesh
  const ROCKS = [[5.2, -1.5, 0.7], [-4.6, -3.2, 0.55], [1.2, 5.4, 0.8], [-5.6, 2.4, 0.5], [4.2, 4.2, 0.45]];
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), H.mat('#cfc6b4'), ROCKS.length);
  ROCKS.forEach(([x, z, s], i) => { o3.position.set(x, isletGround(ISLET.x + x, ISLET.z + z) + s*0.3, z); o3.rotation.set(i, i*2.1, 0); o3.scale.set(s*1.2, s*0.8, s); o3.updateMatrix(); rocks.setMatrixAt(i, o3.matrix); });
  rocks.castShadow = true; g.add(rocks);

  // the walker bumps into the trunks and the dry rocks (circles; never r 1.2, which character.js
  // treats as the invisible shoreline chain and ignores)
  for(const [px, pz] of PALMS) ctx.colliders.push({ kind:'circle', x:ISLET.x + px, z:ISLET.z + pz, r:0.3 });
  for(const [x, z, s] of ROCKS) ctx.colliders.push({ kind:'circle', x:ISLET.x + x, z:ISLET.z + z, r:s*0.9 });

  // the wing pad: front (+z local) faces the island to the north, so rot = PI
  const pad = buildWingPad(THREE, H, g, { x:0, y:ISLET.top, z:0, rot:Math.PI });

  // the reward for all eight shards: gold wings, a soft beam and a constellation overhead
  const reward = new THREE.Group(); reward.visible = false; g.add(reward);
  const beamMat = new THREE.MeshBasicMaterial({ color:'#ffe27a', transparent:true, opacity:0.14, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 70, 18, 1, true), beamMat); beam.position.y = 35; reward.add(beam);
  const sky = new THREE.Group(); sky.position.y = 64; reward.add(sky);
  // eight stars in the shape of a pair of wings, joined by faint lines
  const W = [[-9, 0], [-15, 4], [-20, 9], [-13, 11], [9, 0], [15, 4], [20, 9], [13, 11]];
  const starTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d'); const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.3, '#ffe27acc'); gr.addColorStop(1, '#ffe27a00'); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const starMat = new THREE.SpriteMaterial({ map:starTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false });
  for(const [x, z] of W){ const s = new THREE.Sprite(starMat); s.position.set(x, z*0.6, -z*0.3); s.scale.setScalar(4.5); sky.add(s); }
  const seg = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4].flatMap(i => [W[i][0], W[i][1]*0.6, -W[i][1]*0.3]);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const lineMat = new THREE.LineBasicMaterial({ color:'#ffe9a8', transparent:true, opacity:0.45, fog:false });
  sky.add(new THREE.LineSegments(lineGeo, lineMat));

  let night = !!ctx.modules.atmosphere?.isNight?.(), unlocked = false;
  ctx.bus.on('atmosphere', e => { night = !!e?.night; });
  function setUnlocked(on){ unlocked = !!on; reward.visible = unlocked; pad.setGold(unlocked); }

  // near: 0..1 how close the walker is (the pad brightens as you come ashore); lift: 0..1 while lifting
  function update(dt, t, near = 0, lift = 0){
    pad.flap(t, lift > 0 ? 0.3 + lift*0.7 : 0.05 + near*0.15);
    pad.setGlow(Math.min(1, (night ? 0.85 : 0.2) + near*0.4 + lift + Math.sin(t*2)*0.08));
    if(unlocked){
      beamMat.opacity = (night ? 0.26 : 0.1) + Math.sin(t*1.3)*0.03;
      sky.visible = night; sky.rotation.y = Math.sin(t*0.05)*0.1;
    }
  }
  return { group:g, pad, padPos:{ x:ISLET.x, z:ISLET.z, y:ISLET.padTop }, update, setUnlocked };
}
