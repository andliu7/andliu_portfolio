// Node checks for the space core (no browser). Run from anywhere:
//   node andliu-portfolio/island/src/space/space.test.mjs
// three comes from andliu-portfolio/node_modules. Exits non-zero on the first failed group.
import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createKit, prng, sanitizeSave, tangent, resolve2D, SHARD_IDS, SHARDS, AREAS } from './kit.js';
import { ISLET, isletGround } from './islet.js';
import { COSMO } from './hub.js';
import { ZONES } from '../data/zones.js';
import { layout } from '../world/map.js';

const here = dirname(fileURLToPath(import.meta.url));
let fails = 0, passes = 0;
const ok = (cond, msg) => { if(cond) passes++; else { fails++; console.log('FAIL', msg); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* prng and save */
{ const a = prng(5), b = prng(5), xs = Array.from({ length:1000 }, a);
  ok(xs.every(x => x >= 0 && x < 1), 'prng in [0, 1)');
  ok(xs.slice(0, 5).every(x => x === b()), 'prng is deterministic');
  ok(SHARD_IDS.length === 8 && new Set(SHARD_IDS).size === 8, 'eight unique shard ids');
  ok(AREAS.every(a => SHARDS[a.id]?.length === 2), 'two shards per area');
  const s = sanitizeSave({ shards:['moon-1', 'moon-1', 'nope', 3], unlocked:1, flags:{ patch:true } });
  ok(s.shards.length === 1 && s.shards[0] === 'moon-1' && s.unlocked === true && s.flags.patch === true, 'sanitizeSave keeps good data');
  ok(sanitizeSave('junk').shards.length === 0 && sanitizeSave(null).unlocked === false && !Array.isArray(sanitizeSave({ flags:[] }).flags), 'sanitizeSave survives junk');
}

/* the islet: placement against the real map layout, and the ground profile */
{ const L = layout(ZONES);
  const lim = L.radius - 2;                                   // character.js keeps the walker within island.radius - 2
  ok(Math.hypot(ISLET.x, ISLET.z) + ISLET.edge < lim, `islet inside the walker limit (${(Math.hypot(ISLET.x, ISLET.z) + ISLET.edge).toFixed(1)} < ${lim})`);
  const off = L.dWaterAt(ISLET.x, ISLET.z) - ISLET.flat;
  ok(off >= 25 && off <= 40, `islet sand is 25 to 40 m offshore (${off.toFixed(1)} m)`);
  let dry = 0; for(let a = 0; a < 64; a++) for(const r of [0, 3, 6, ISLET.edge + 2]) if(L.landAt(ISLET.x + Math.cos(a)*r, ISLET.z + Math.sin(a)*r)) dry++;
  ok(dry === 0, 'no map land under or around the islet');
  let minIslet = 1e9; for(const i of L.islets) minIslet = Math.min(minIslet, Math.hypot(i.x - ISLET.x, i.z - ISLET.z));
  ok(minIslet > 40, `clear of map.js islets (${minIslet.toFixed(1)} m)`);
  ok(isletGround(ISLET.x, ISLET.z) === ISLET.padTop, 'pad height at the centre');
  ok(isletGround(ISLET.x + 2.5, ISLET.z) === ISLET.top, 'flat sand');
  ok(isletGround(ISLET.x + ISLET.edge + 0.1, ISLET.z) === undefined, 'undefined off the islet');
  // the island's own sea floor out here (character.js groundY): max(-2.1, WATER_Y - 0.3*sd)
  const sd = L.sdAt(ISLET.x + ISLET.edge, ISLET.z), sea = Math.max(-2.1, -0.28 - 0.3*sd);
  ok(near(isletGround(ISLET.x + ISLET.edge, ISLET.z), sea, 0.01), `beach meets the sea floor (${isletGround(ISLET.x + ISLET.edge, ISLET.z)} vs ${sea})`);
  let prev = 1e9, mono = true; for(let d = ISLET.padR + 0.01; d <= ISLET.edge; d += 0.1){ const y = isletGround(ISLET.x + d, ISLET.z); if(y > prev + 1e-9) mono = false; prev = y; }
  ok(mono, 'beach only slopes down');
  // swimming starts where the water is deeper than 0.98 m (character.js SWIM_SINK)
  let swimAt = null; for(let d = 0; d <= ISLET.edge; d += 0.05){ if(-0.28 - isletGround(ISLET.x + d, ISLET.z) > 0.98){ swimAt = d; break; } }
  ok(swimAt > 4.5 && swimAt < ISLET.edge, `a wade zone before the swim line (${swimAt?.toFixed(2)} m)`);
}

/* controllers, with a fake ctx and runtime */
const keys = { f:0, s:0, jump:false, jumpPressed:false, boost:false };
const rt = { keys, astro:null, sfx:null, takeDrag:null, has:() => false };
const kit = createKit({ THREE, helpers:{}, state:{ reduced:false, zoom:1 }, zones:ZONES }, rt);
const cam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 900);
const run = (ctrl, v, secs, dt = 1/60) => { for(let t = 0; t < secs; t += dt){ ctrl.update(dt, v); v.update(dt); keys.jumpPressed = false; } };

{ // flat walker: forward is away from the camera, a jump lasts 2*jump/gravity, the ring holds
  const c = kit.walker({ gravity:4.5, jump:6, ring:{ r:10 } }), v = kit.view(cam, c, { back:[0, 0, 1] });
  c.place(0, 0, 0, Math.PI);
  const F = new THREE.Vector3(), R = new THREE.Vector3(); v.basis(c.up, F, R);
  ok(near(F.z, -1) && near(R.x, 1), 'walker basis: W is -z, D is +x');
  Object.assign(keys, { f:1 }); run(c, v, 1);
  ok(c.pos.z < -4 && Math.abs(c.pos.x) < 1e-6, `walker moves forward (${c.pos.z.toFixed(2)})`);
  run(c, v, 5);
  ok(Math.hypot(c.pos.x, c.pos.z) <= 10 - c.radius + 1e-6, 'walker stays inside the ring');
  Object.assign(keys, { f:0 }); run(c, v, 1);
  keys.jumpPressed = true; keys.jump = true; let air = 0;
  for(let t = 0; t < 5; t += 1/240){ c.update(1/240, v); keys.jumpPressed = false; if(!c.grounded) air += 1/240; else if(air > 0) break; }
  keys.jump = false;
  ok(near(air, 2*6/4.5, 0.02), `low-g jump airtime ${air.toFixed(3)} s (expect ${(12/4.5).toFixed(3)})`);
  // a floor higher than 0.5 m is a wall, a 0.34 m step is climbed
  const w = kit.walker({ floorAt:(x, z) => z < -2 ? 1.2 : z < -1 ? 0.34 : 0 }), wv = kit.view(cam, w);
  w.place(0, 0, 0, Math.PI); keys.f = 1; run(w, wv, 2); keys.f = 0;
  ok(near(w.pos.y, 0.34) && w.pos.z > -2.01, `steps up 0.34, stops at the 1.2 wall (y ${w.pos.y.toFixed(2)}, z ${w.pos.z.toFixed(2)})`);
  const p = { x:0.2, z:0 }; resolve2D(p, 0.5, [{ kind:'circle', x:0, z:0, r:1 }]);
  ok(near(Math.hypot(p.x, p.z), 1.5), 'resolve2D pushes out of a circle');
}

{ // radial gravity: straight on goes round a great circle and comes back to the start
  const r = 9, c = kit.orbiter({ radius:r, speed:4.5 }), v = kit.view(cam, c);
  c.place(0, r, 0, 0);
  const start = c.pos.clone();
  keys.f = 1; let maxErr = 0, far = 0;
  const T = 2*Math.PI*r/4.5, dt = 1/120;
  for(let t = 0; t < T; t += dt){ c.update(dt, v); v.update(dt); maxErr = Math.max(maxErr, Math.abs(c.pos.length() - r)); far = Math.max(far, c.pos.distanceTo(start)); }
  keys.f = 0;
  ok(maxErr < 1e-6, `stays on the surface (max error ${maxErr.toExponential(1)})`);
  ok(far > 2*r - 0.2, `reaches the far side (${far.toFixed(2)} of ${2*r})`);
  ok(c.pos.distanceTo(start) < 0.9, `one lap brings you home (${c.pos.distanceTo(start).toFixed(2)} m off, the accel ramp costs a little)`);
  ok(Math.abs(c.fwd.dot(c.up)) < 1e-9 && near(c.fwd.length(), 1), 'facing stays tangent');
  // jump and land again
  keys.jumpPressed = true; c.update(1/60, v); keys.jumpPressed = false;
  ok(!c.grounded && c.pos.length() > r, 'jumps off the surface');
  run(c, v, 3);
  ok(c.grounded && near(c.pos.length(), r, 1e-6), 'lands back on the sphere');
  // the south pole works as well as the north
  c.place(0, -r, 0, 0); const sp = c.pos.clone(); keys.f = 1; run(c, v, 1); keys.f = 0;
  ok(near(c.pos.length(), r, 1e-6) && c.up.y < -0.8 && c.pos.distanceTo(sp) > 3, `walks upside down at the south pole (moved ${c.pos.distanceTo(sp).toFixed(2)} m)`);
}

{ // zero-g: thrust builds speed, drift keeps it, drag slowly bleeds it, obstacles bounce
  const c = kit.jetpack({ thrust:7, max:7, damping:0.35, obstacles:[{ pos:new THREE.Vector3(0, 0, -12), r:2 }] }), v = kit.view(cam, c, { back:[0, 0, 1] });
  c.place(0, 0, 0, Math.PI);
  keys.f = 1; run(c, v, 0.5); keys.f = 0;
  const s0 = c.speed; run(c, v, 1); const s1 = c.speed;
  ok(s0 > 2.5 && s1 > 0.6*s0 && s1 < s0, `drifts with inertia (${s0.toFixed(2)} then ${s1.toFixed(2)} m/s)`);
  ok(near(s1/s0, Math.exp(-0.35), 0.03), 'drag is exp(-damping t)');
  keys.f = 1; run(c, v, 4); keys.f = 0;
  ok(c.pos.distanceTo(new THREE.Vector3(0, 0, -12)) >= 2 + 0.6 - 1e-6, 'never inside an asteroid');
  ok(c.vel.z > 0 || c.pos.z > -9.5, 'bounced back off the asteroid');
  keys.jump = true; run(c, v, 0.5); keys.jump = false;
  ok(c.vel.y > 1, 'Space thrusts up');
  keys.boost = true; run(c, v, 1.5); keys.boost = false;
  ok(c.vel.y < 0, 'Shift thrusts down');
}

{ // tangent handles the degenerate case
  const out = new THREE.Vector3(); tangent(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 1, 0), out);
  ok(near(out.length(), 1) && near(out.y, 0), 'tangent of a parallel vector is a unit perpendicular');
}

/* Cosmo's chat tree: every link lands on a node, the gift node exists, facts come from zones */
{ const ids = new Set(Object.keys(COSMO.nodes));
  let bad = [];
  for(const [id, n] of Object.entries(COSMO.nodes)){
    for(const [, to] of n.choices || []) if(to !== null && !ids.has(to)) bad.push(`${id} -> ${to}`);
    if(n.next && !ids.has(n.next)) bad.push(`${id} next ${n.next}`);
  }
  ok(!bad.length, 'chat links resolve ' + bad.join(', '));
  ok(ids.has(COSMO.start) && Object.values(COSMO.nodes).some(n => n.give), 'chat has a start and a gift');
  const text = JSON.stringify(COSMO);
  ok(/May 2027/.test(text) && JSON.stringify(ZONES).includes('Expected May 2027'), 'graduation date matches zones.js');
  ok(text.includes('2,000+') && JSON.stringify(ZONES).includes('2,000+ users'), 'Browser Use figure matches zones.js');
}

/* area files export build, and no em dashes anywhere in src/space or SPACE.md */
{ for(const a of AREAS){ const m = await import(`./areas/${a.id}.js`); ok(typeof m.build === 'function', `areas/${a.id}.js exports build`); }
  const files = [...readdirSync(here).filter(f => /\.(m?js)$/.test(f)).map(f => join(here, f)), ...readdirSync(join(here, 'areas')).map(f => join(here, 'areas', f)), join(here, '..', '..', 'SPACE.md')];
  const dash = files.filter(f => { try { return readFileSync(f, 'utf8').includes(String.fromCharCode(0x2014)); } catch { return false; } });
  ok(!dash.length, 'no em dashes: ' + dash.join(', '));
  // code and UI copy only: SPACE.md states the rule, so it has to name what to avoid
  ok(!/aperture|glados|valve/i.test(files.filter(f => f.endsWith('.js')).map(f => readFileSync(f, 'utf8')).join('\n')), 'no Valve names in code or UI copy');
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
