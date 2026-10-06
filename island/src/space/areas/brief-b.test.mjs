// Node checks for Brief B (Wormhole Lab and Asteroid Field). No browser. Run from island/:
//   node src/space/areas/brief-b.test.mjs
// three comes from andliu-portfolio/node_modules. Exits non-zero if anything fails.
import * as THREE from 'three';
import { createKit } from '../kit.js';
import { ZONES } from '../../data/zones.js';
import { portalMath, PORTAL, createLabCore, chamberAt } from './lab.js';
import { fieldLayout, FIELD, skillWords } from './asteroids.js';

let fails = 0, passes = 0;
const ok = (cond, msg) => { if(cond) passes++; else { fails++; console.log('FAIL', msg); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const vnear = (a, b, eps = 1e-6) => a.distanceTo(b) <= eps;
const fmt = v => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

/* ================= portal math ================= */
const pm = portalMath(THREE);
const portal = (c, n, up, floor) => Object.assign({ c, floor }, pm.frame(n, up));
const ctrlAt = (pos, vel, fwd) => ({ pos:pos.clone(), vel:vel.clone(), fwd:fwd.clone().normalize(), grounded:true });
// the body's clearance from a surface: distance from its middle along n minus its reach along n
const clearance = (ctrl, P) => ctrl.pos.clone().setY(ctrl.pos.y + 0.9).sub(P.c).dot(P.n) - pm.ext(P.n);
const q = new THREE.Quaternion();
const report = [];

{ // frames are right-handed and orthonormal, and the rotation is proper
  const A = portal(V(0, 0, 0), V(0, 1, 0), V(0, 0, -1), true), B = portal(V(3, 2, 0), V(-1, 0, 0), V(0, 1, 0), false);
  for(const P of [A, B]){
    const m = new THREE.Matrix4().makeBasis(P.r, P.u, P.n);
    ok(near(m.determinant(), 1) && near(P.r.dot(P.u), 0) && near(P.u.dot(P.n), 0), 'portal frame is a right-handed orthonormal basis');
  }
  pm.rotation(A, B, q);
  const R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  ok(near(R.determinant(), 1), 'crossing rotation is proper (det 1)');
  ok(vnear(A.n.clone().negate().applyQuaternion(q), B.n), 'R maps the inward normal of A to the outward normal of B');
  ok(vnear(A.u.clone().applyQuaternion(q), B.u), 'R maps up of A to up of B');
  ok(vnear(A.r.clone().applyQuaternion(q), B.r.clone().negate()), 'R maps right of A to minus right of B (your right stays your right)');
  const v = V(1.3, -7.1, 2.2);
  ok(near(v.clone().applyQuaternion(q).length(), v.length()), 'speed is preserved');
}

{ // floor to wall: fall into a floor portal, come out of a wall moving horizontally
  const A = portal(V(0, 0.01, 0), V(0, 1, 0), V(0, 0, -1), true);          // on the floor, shot while facing -z
  const B = portal(V(-7, 1.2, -5), V(1, 0, 0), V(0, 1, 0), false);         // on a wall facing +x
  const c = ctrlAt(V(0.1, 0.05, -0.1), V(0, -12, 0), V(0, 0, -1));
  ok(pm.probe(A, c.pos, c.vel), 'floor-to-wall: falling onto the floor portal crosses');
  const pitch = pm.cross(c, -1.0, A, B, q);                                  // looking down while falling
  ok(vnear(c.vel, V(12, 0, 0), 1e-6), `floor-to-wall: 12 m/s down becomes 12 m/s out of the wall ${fmt(c.vel)}`);
  ok(vnear(c.fwd, V(1, 0, 0), 1e-6), `floor-to-wall: facing turns to face out of the wall ${fmt(c.fwd)}`);
  ok(near(pitch, Math.PI/2 - 1.0, 1e-6), `floor-to-wall: looking 1 rad down becomes ${pitch.toFixed(3)} rad up (pi/2 - 1)`);
  ok(clearance(c, B) >= PORTAL.clear - 1e-9, `floor-to-wall: body clears the wall by ${clearance(c, B).toFixed(2)} m`);
  ok(!pm.probe(B, c.pos, c.vel) && !pm.probe(A, c.pos, c.vel), 'floor-to-wall: no bounce straight back');
  report.push(`floor-to-wall  vel (0, -12, 0) -> ${fmt(c.vel)}, facing -> ${fmt(c.fwd)}, pitch -1.00 -> ${pitch.toFixed(2)}, body ${clearance(c, B).toFixed(2)} m off the wall`);
  // walking onto it (the chamber 2 case): walking along the floor portal's up comes out going up
  const w = ctrlAt(V(0, 0, 0.9), V(0, -0.23, -5), V(0, 0, -1));
  ok(pm.probe(A, w.pos, w.vel), 'floor-to-wall: stepping onto the floor portal crosses');
  pm.cross(w, 0, A, B, q);
  ok(vnear(w.vel, V(0.23, 5, 0), 1e-6), `floor-to-wall: walking 5 m/s along the portal's up comes out 5 m/s up ${fmt(w.vel)}`);
  ok(vnear(w.fwd, V(1, 0, 0), 1e-6), 'floor-to-wall: a vertical look falls back to facing out of the wall');
}

{ // wall to wall: walk through, speed and height kept, heading turned
  const A = portal(V(-7, 1.15, -5), V(1, 0, 0), V(0, 1, 0), false);        // left wall, facing +x
  const B = portal(V(0, 4.2, -13.6), V(0, 0, 1), V(0, 1, 0), false);       // back wall, facing +z
  const c = ctrlAt(V(-6.55, 0, -5.1), V(-5, 1.5, 0.4), V(-1, 0, 0));
  ok(pm.probe(A, c.pos, c.vel), 'wall-to-wall: walking into the wall portal crosses');
  const pitch = pm.cross(c, 0.2, A, B, q);
  ok(vnear(c.vel, V(0.4, 1.5, 5), 1e-6), `wall-to-wall: (-5, 1.5, 0.4) becomes (0.4, 1.5, 5), drift on your left stays on your left ${fmt(c.vel)}`);
  ok(vnear(c.fwd, V(0, 0, 1), 1e-6) && near(pitch, 0.2, 1e-6), `wall-to-wall: facing -x becomes +z, pitch kept ${fmt(c.fwd)}`);
  ok(near(clearance(c, B), PORTAL.clear, 1e-9) && near(c.pos.z - B.c.z, 0.9, 1e-9), `wall-to-wall: feet come out 0.9 m from the wall (${(c.pos.z - B.c.z).toFixed(2)})`);
  const shortest = new THREE.Quaternion().setFromUnitVectors(A.n.clone().negate(), B.n);
  const v = V(-3, 2, 1);
  ok(vnear(v.clone().applyQuaternion(q), v.clone().applyQuaternion(shortest), 1e-9), 'wall-to-wall: same as setFromUnitVectors(-nA, nB)');
  report.push(`wall-to-wall   vel (-5, 1.5, 0.4) -> ${fmt(c.vel)}, facing (-1, 0, 0) -> ${fmt(c.fwd)}, feet ${(c.pos.z - B.c.z).toFixed(2)} m out of the wall`);
  // two walls facing the same way (the shortest arc is undefined here): straight back out, up kept
  const B2 = portal(V(-7, 1.15, -9), V(1, 0, 0), V(0, 1, 0), false);
  const d = ctrlAt(V(-6.55, 0, -5), V(-5, 2, 0), V(-1, 0, 0));
  pm.cross(d, 0, A, B2, q);
  ok(vnear(d.vel, V(5, 2, 0), 1e-6) && vnear(d.fwd, V(1, 0, 0), 1e-6), `wall-to-wall, same facing: comes back out, vertical kept ${fmt(d.vel)}`);
}

{ // floor to floor: down in, up out, heading and horizontal speed kept relative to the portals
  const A = portal(V(0, 0.01, 0), V(0, 1, 0), V(0, 0, -1), true);
  const B = portal(V(10, 3.01, 0), V(0, 1, 0), V(0, 0, -1), true);
  const c = ctrlAt(V(0.2, 0.05, -0.3), V(0, -9, -2), V(0, 0, -1));
  ok(pm.probe(A, c.pos, c.vel), 'floor-to-floor: crosses');
  const pitch = pm.cross(c, -1.2, A, B, q);
  ok(vnear(c.vel, V(0, 9, -2), 1e-6), `floor-to-floor: (0, -9, -2) comes out (0, 9, -2), heading kept ${fmt(c.vel)}`);
  ok(vnear(c.fwd, V(0, 0, -1), 1e-6) && near(pitch, 1.2, 1e-6), `floor-to-floor: facing -z kept, looking down becomes looking up (${pitch.toFixed(2)})`);
  ok(near(c.pos.y - B.c.y, PORTAL.clear, 1e-9), `floor-to-floor: feet come out ${(c.pos.y - B.c.y).toFixed(2)} m above the exit floor`);
  ok(!pm.probe(B, c.pos, c.vel), 'floor-to-floor: moving up, so no re-entry');
  // sideways drift: the half turn about u mirrors r, the rigid-body answer (your right stays your right)
  const s = ctrlAt(V(0, 0.05, 0), V(2, -9, 0), V(0, 0, -1));
  pm.cross(s, 0, A, B, q);
  ok(vnear(s.vel, V(-2, 9, 0), 1e-6), `floor-to-floor: drift along r mirrors with the half turn ${fmt(s.vel)}`);
  // a floor exit turned 90 degrees: heading follows the exit's up
  const B3 = portal(V(10, 3.01, 0), V(0, 1, 0), V(1, 0, 0), true);
  const t = ctrlAt(V(0, 0.05, 0), V(0, -9, -2), V(0, 0, -1));
  pm.cross(t, 0, A, B3, q);
  ok(vnear(t.vel, V(2, 9, 0), 1e-6) && vnear(t.fwd, V(1, 0, 0), 1e-6), `floor-to-floor, exit turned: heading follows the exit's up ${fmt(t.vel)} ${fmt(t.fwd)}`);
  report.push(`floor-to-floor vel (0, -9, -2) -> ${fmt(c.vel)}, facing (0, 0, -1) -> ${fmt(c.fwd)}, pitch -1.20 -> ${pitch.toFixed(2)}, feet ${(c.pos.y - B.c.y).toFixed(2)} m above the floor`);
}

{ // exit clearance, every pairing: the body never starts inside the exit surface
  const P = [portal(V(0, 0.01, 0), V(0, 1, 0), V(0, 0, -1), true), portal(V(-7, 1.15, 0), V(1, 0, 0), V(0, 1, 0), false), portal(V(0, 1.15, -9), V(0, 0, 1), V(0, 1, 0), false), portal(V(4, 12, -30), V(0, 0, -1), V(0, 1, 0), false)];
  let worst = 9;
  for(const A of P) for(const B of P){ if(A === B) continue;
    for(const off of [-0.9, 0, 0.9]){
      const c = ctrlAt(A.c.clone().addScaledVector(A.r, off).addScaledVector(A.u, -off).addScaledVector(A.n, 0.1).setY(A.c.y + (A.floor ? 0.05 : -0.9 + 0.3*off)), A.n.clone().multiplyScalar(-6), V(0, 0, -1));
      pm.cross(c, 0, A, B, q); worst = Math.min(worst, clearance(c, B));
    } }
  ok(worst >= PORTAL.clear - 1e-9, `every pairing clears the exit surface by at least ${PORTAL.clear} m (worst ${worst.toFixed(3)})`);
}

console.log('portal math:\n  ' + report.join('\n  '));

/* ================= the lab's chambers, played by a bot with the real kit walker ================= */
const keys = { f:0, s:0, jump:false, jumpPressed:false, boost:false };
const rt = { keys, astro:null, sfx:null, takeDrag:null, has:() => false };
const kit = createKit({ THREE, helpers:{}, state:{ reduced:false, zoom:1 }, zones:ZONES }, rt);
const cam = new THREE.PerspectiveCamera(62, 1.5, 0.1, 900);
const DT = 1/60;
function lab(n){
  const core = createLabCore(THREE);
  const ctrl = kit.walker({ gravity:14, jump:6.5, speed:5, run:8.5, airControl:0.5, floorAt:core.floorAt, bounds:core.L.bounds });
  const view = kit.view(cam, ctrl, { fpStart:true });
  core.goTo(ctrl, view, n);
  return { core, ctrl, view, crossed:0 };
}
function tick(s, secs, until){
  for(let t = 0; t < secs; t += DT){
    const before = s.core.st.cool;
    s.ctrl.update(DT, s.view); s.view.update(DT); s.core.step(s.ctrl, s.view, DT); keys.jumpPressed = false;
    if(s.core.st.cool > before) s.crossed++;
    if(until?.()) return true;
  }
  return false;
}
function face(s, x, z){ s.ctrl.fwd.set(x - s.ctrl.pos.x, 0, z - s.ctrl.pos.z).normalize(); }
function walkTo(s, x, z, secs = 8){
  keys.f = 1;
  const done = tick(s, secs, () => { face(s, x, z); return Math.hypot(s.ctrl.pos.x - x, s.ctrl.pos.z - z) < 0.12; });
  keys.f = 0; tick(s, 0.4);
  return done;
}
// aim at a point from the eye (as the camera does: feet + 1.45 up + 0.2 along fwd) and fire
function fireAt(s, which, target){
  face(s, target.x, target.z);
  const eye = s.ctrl.pos.clone().add(V(0, 1.45, 0)).addScaledVector(s.ctrl.fwd, 0.2);
  const dir = target.clone().sub(eye).normalize();
  const pitch = Math.asin(dir.y);
  if(Math.abs(pitch) > 1.2 + 1e-9) return { ok:false, why:`pitch ${pitch.toFixed(2)} beyond the look limit` };
  return s.core.fire(which, eye, dir, s.ctrl.fwd);
}
function fireLook(s, which, pitch){
  const eye = s.ctrl.pos.clone().add(V(0, 1.45, 0)).addScaledVector(s.ctrl.fwd, 0.2);
  const dir = s.ctrl.fwd.clone().multiplyScalar(Math.cos(pitch)).add(V(0, Math.sin(pitch), 0));
  return s.core.fire(which, eye, dir, s.ctrl.fwd);
}
const where = s => `(${s.ctrl.pos.x.toFixed(2)}, ${s.ctrl.pos.y.toFixed(2)}, ${s.ctrl.pos.z.toFixed(2)})`;
const labReport = [];

{ // level sanity: every puzzle step is out of jump reach, and the plates are where the chambers are
  const apex = 6.5*6.5/(2*14);
  ok(apex + 0.5 < 3 && apex + 0.5 < 7.5 - 3 && apex + 0.5 < 9.6 - 7.5, `every step up is out of jump reach (apex ${apex.toFixed(2)} + 0.5 step)`);
  const L = createLabCore(THREE).L;
  ok(L.plates.every(p => chamberAt((p.z0 + p.z1)/2) === +p.name[0].replace(/[ABC]/, m => ({ A:1, B:2, C:3 })[m])), 'each white panel sits in its own chamber');
}

{ // chamber 1: walk through a wall portal onto the raised platform
  const s = lab(1);
  ok(!fireAt(s, 0, V(7, 2, -5)).ok, 'a dark wall refuses a portal');
  walkTo(s, -3, -5.5);
  const a = fireAt(s, 0, V(-6.95, 2, -5.5)), b = fireAt(s, 1, V(-1, 5.5, -13.65));
  ok(a.ok && b.ok, `chamber 1: both portals placed (${a.why || 'A1'}, ${b.why || 'A2'})`);
  ok(s.core.st.linked, 'chamber 1: portals linked');
  keys.f = 1; tick(s, 3, () => { face(s, -9, s.ctrl.pos.z); return s.crossed > 0; }); keys.f = 0;
  tick(s, 1.5);
  ok(s.crossed === 1 && s.ctrl.grounded && near(s.ctrl.pos.y, 3, 1e-6) && s.ctrl.pos.z < -9.7, `chamber 1: walked through onto the platform ${where(s)}`);
  labReport.push(`chamber 1: walked into A1 at 5 m/s, landed on the platform at ${where(s)}`);
  walkTo(s, 4.5, -12.5); walkTo(s, 4.5, -15.6);
  ok(s.core.st.chamber === 2 && !s.core.portals[0] && !s.core.portals[1], 'chamber 1 to 2: the doorway field clears the portals');
  // without portals the platform is out of reach
  const n = lab(1); walkTo(n, 0, -8.5);
  let top = 0; keys.f = 1; for(let k = 0; k < 6; k++){ keys.jump = true; keys.jumpPressed = true; tick(n, 0.6, () => { top = Math.max(top, n.ctrl.grounded ? n.ctrl.pos.y : 0); return false; }); keys.jump = false; }
  keys.f = 0;
  ok(top < 0.5 && n.ctrl.pos.z > -9.8, `chamber 1: jumping at the platform never gets on it (z ${n.ctrl.pos.z.toFixed(2)})`);
}

{ // chamber 2: floor portal to the high wall, onto the ledge, where lab-1 is
  const s = lab(2);
  walkTo(s, 0, -17.2);
  const a = fireAt(s, 1, V(1.5, 11.2, -29.65)), b = fireAt(s, 0, V(0, 3.005, -19.8));
  ok(a.ok && b.ok, `chamber 2: both portals placed (${a.why || 'B2'}, ${b.why || 'B1'})`);
  keys.f = 1; tick(s, 3, () => { face(s, 0, -25); return s.crossed > 0; }); keys.f = 0;
  tick(s, 2.5);
  ok(s.crossed === 1 && s.ctrl.grounded && near(s.ctrl.pos.y, 7.5, 1e-6) && s.ctrl.pos.z < -24.7, `chamber 2: stepped into the floor, landed on the ledge ${where(s)}`);
  labReport.push(`chamber 2: walked onto B1, came out of B2 and landed on the ledge at ${where(s)}`);
  walkTo(s, 0, -27.2);
  const mid = s.ctrl.pos.clone().add(V(0, 0.9, 0));
  ok(mid.distanceTo(V(0, 8.6, -27.2)) < 1.5, `chamber 2: lab-1 is within pickup reach on the ledge (${mid.distanceTo(V(0, 8.6, -27.2)).toFixed(2)} m)`);
  walkTo(s, -4.5, -28.5); walkTo(s, -4.5, -31.2);
  ok(s.core.st.chamber === 3 && near(s.ctrl.pos.y, 7.5, 1e-6), 'chamber 2 to 3: the ledge leads onto the balcony');
  const n = lab(2); walkTo(n, 0, -23.5);
  let top = 0; keys.f = 1; for(let k = 0; k < 6; k++){ keys.jump = true; keys.jumpPressed = true; tick(n, 0.6, () => { top = Math.max(top, n.ctrl.grounded ? n.ctrl.pos.y : 0); return false; }); keys.jump = false; }
  keys.f = 0;
  ok(top < 3.5, 'chamber 2: jumping never reaches the ledge');
}

// chamber 3: portal high on the wall behind the balcony, portal at the bottom of the drop slot,
// hold W off the back edge of the slot, get flung over the glass onto the goal ledge
function chamber3(holdAfter){
  const s = lab(3);
  walkTo(s, 2.5, -31.2); walkTo(s, 2.5, -33.2);                       // round the back of the slot, not across it
  const a = fireAt(s, 1, V(2.5, 13.5, -30.34));
  walkTo(s, 2.5, -31.2); walkTo(s, 0, -31.2); walkTo(s, 0, -31.7);
  face(s, 0, -40);
  const b = fireLook(s, 0, -1.2);                                     // looking as far down as the kit allows, from the rim
  walkTo(s, 0, -30.4); face(s, 0, -40);                              // a short run-up: walk off the back edge holding W
  keys.f = 1; tick(s, 4, () => s.crossed > 0);
  keys.f = holdAfter ? 1 : 0;
  let peakZ = 0, overGlass = null;
  tick(s, 4, () => { if(overGlass === null && s.ctrl.pos.z < -38.35) overGlass = s.ctrl.pos.y; peakZ = Math.min(peakZ, s.ctrl.pos.z); return s.ctrl.grounded; });
  keys.f = 0;
  return { s, a, b, overGlass };
}
for(const hold of [true, false]){
  const { s, a, b, overGlass } = chamber3(hold);
  ok(a.ok && b.ok, `chamber 3: both portals placed (${a.why || 'C2'}, ${b.why || 'C1'})`);
  const on = s.ctrl.grounded && near(s.ctrl.pos.y, 4, 1e-6) && s.ctrl.pos.z < -42.6;
  ok(s.crossed === 1 && on, `chamber 3 (${hold ? 'W held' : 'keys released'} after the fling): landed on the goal ${where(s)}`);
  ok(overGlass !== null && overGlass > 9.6, `chamber 3: cleared the glass rail (feet ${overGlass?.toFixed(2)} over a 9.6 rail)`);
  labReport.push(`chamber 3 (${hold ? 'W held' : 'released'}): fell 12 m down the slot, flung out of C2, over the glass at feet ${overGlass?.toFixed(2)}, landed at ${where(s)}`);
  if(hold){
    // the button opens the door to the vault
    walkTo(s, 0, -48.5);
    walkTo(s, 0, -52, 2);
    ok(s.ctrl.pos.z > -49.9, `chamber 3: the closed door blocks the vault (z ${s.ctrl.pos.z.toFixed(2)})`);
    s.core.openDoor();
    walkTo(s, -1, -51.8);
    const mid = s.ctrl.pos.clone().add(V(0, 0.9, 0));
    ok(s.core.st.chamber === 4 && mid.distanceTo(V(-1, 4.9, -51.8)) < 1.5, `chamber 3: open door, lab-2 in reach in the vault ${where(s)}`);
  }
}
{ // chamber 3 without portals: the slot drops you into the soft pool and you are put back on the balcony
  const s = lab(3);
  walkTo(s, 0, -31.2); face(s, 0, -40); keys.f = 1; tick(s, 1, () => s.ctrl.pos.y < 6); keys.f = 0;
  let reset = false; tick(s, 3, () => { reset = s.ctrl.pos.y === 7.5 && Math.abs(s.ctrl.pos.x + 4.5) < 1e-6; return reset; });
  ok(reset, 'chamber 3: falling into the pool puts you back at the balcony start');
  // and the glass rail stops a run-and-jump at the goal
  const n = lab(3); walkTo(n, 3, -31.2); walkTo(n, 3, -36);
  keys.f = 1; keys.boost = true; for(let k = 0; k < 5; k++){ keys.jump = true; keys.jumpPressed = true; tick(n, 0.5, () => { face(n, 3, -48); return false; }); keys.jump = false; }
  keys.f = 0; keys.boost = false;
  ok(n.ctrl.pos.z > -38.9 && n.ctrl.pos.y >= 7.5, `chamber 3: the glass rail stops a running jump (z ${n.ctrl.pos.z.toFixed(2)})`);
}
console.log('lab chambers:\n  ' + labReport.join('\n  '));
/* ================= Asteroid Field: layout checks and jetpack sims ================= */
const astReport = [];
{
  const words = skillWords(ZONES.find(z => z.id === 'skills'));
  ok(words.length === 18 && words[0] === 'Python' && words.includes('GitHub Actions') && !words.some(w => w.endsWith('.')), `skills belt: ${words.length} skills from zones.js (${words.slice(0, 3).join(', ')} ... ${words.at(-1)})`);
  const F = fieldLayout(THREE, words.length);
  const inflated = (p, extra = 0.6) => F.obstacles.find(o => p.distanceTo(o.pos) < o.r + extra);
  ok(F.big.length >= 30 && F.scatter.length >= 100 && F.skills.length === 18, `rocks placed: ${F.big.length} big, ${F.scatter.length + F.shell.length + F.skills.length} small`);
  ok(F.big.every(b => b.base.length() + b.amp + b.r < FIELD.R), 'every big rock stays inside the boundary');
  const S = FIELD.spawn;
  let spawnClear = true;
  for(let t = 0; t < 120; t += 0.5){ F.step(t); if(inflated(V(S.x, S.y, S.z))) spawnClear = false; }
  ok(spawnClear, 'spawn is clear of every obstacle for two minutes of drift');
  F.step(0);
  const padTop = V(FIELD.pad.x, 0.34, FIELD.pad.z), hatchT = V(FIELD.hatch.x, 0.3, FIELD.hatch.z + 0.7);
  const closest = (target) => { let best = 9; for(let x = -1.5; x <= 1.5; x += 0.1) for(let z = -1.5; z <= 1.5; z += 0.1) for(let y = 0; y <= 1.5; y += 0.05){ const p = V(target.x + x, y, target.z + z); if(!inflated(p)) best = Math.min(best, p.distanceTo(target)); } return best; };
  ok(closest(padTop) < 1.4, `the wing pad is reachable on the home rock (feet ${closest(padTop).toFixed(2)} m from its top, trigger 1.4)`);
  ok(closest(hatchT) < 1.2, `the hatch is reachable (feet ${closest(hatchT).toFixed(2)} m from its trigger, 1.2)`);
  // the ring: sealed everywhere on its sphere except the gap cap
  const rc = F.ringCentre, R = FIELD.ring;
  let holes = 0, gapOpen = false;
  for(let t = 0; t < 30; t += 3){
    F.step(t);
    const gap = F.gapAt(t, V());
    for(let i = 0; i < 2000; i++){
      const y = 1 - (i + 0.5)/1000, d = V(Math.cos(i*2.39996)*Math.sqrt(Math.max(0, 1 - y*y)), y, Math.sin(i*2.39996)*Math.sqrt(Math.max(0, 1 - y*y)));
      if(d.angleTo(gap) < R.gap + 0.45) continue;
      if(!inflated(d.clone().multiplyScalar(R.r).add(rc))) holes++;
    }
    if(!inflated(gap.clone().multiplyScalar(R.r).add(rc))) gapOpen = true;
  }
  ok(holes === 0, `the ball of rocks is sealed away from its gap (${holes} leaks in 20000 samples)`);
  ok(gapOpen, 'the gap is wide enough to pass');
  ok(!inflated(rc), 'asteroids-1 at the ring centre is in free space');

  // jetpack sims: steer in first person (W thrusts where you look)
  const keys2 = keys;
  function fly(target, start, t0, secs){
    const c = kit.jetpack({ thrust:7, max:7, damping:0.35, bounds:{ r:FIELD.R }, obstacles:F.obstacles }), v = kit.view(cam, c, { fpStart:true });
    c.place(start.x, start.y, start.z, 0);
    let best = 99, t = t0; keys2.f = 1;
    for(; t < t0 + secs; t += DT){
      F.step(t);
      const tg = target();
      const d = tg.clone().sub(c.pos); c.fwd.set(d.x, 0, d.z).normalize(); v.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(d.y, Math.hypot(d.x, d.z))));
      c.update(DT, v);
      best = Math.min(best, c.pos.clone().add(V(0, 0.9, 0)).distanceTo(tg));   // shards collect within 1.5 m of the body's middle
      if(best < 1.5) break;
    }
    keys2.f = 0;
    return { best, secs:t - t0 };
  }
  // ring: start 8 m out where the gap will be in 2 s, aim at the shard (0.9 below it so the middle meets it)
  const tg = 40, gap = F.gapAt(tg + 2, V());
  const rs = fly(() => rc.clone().add(V(0, -0.9, 0)), gap.clone().multiplyScalar(8).add(rc).add(V(0, -0.9, 0)), tg, 10);
  ok(rs.best < 1.5, `ring: flew through the gap to asteroids-1 in ${rs.secs.toFixed(1)} s (closest ${rs.best.toFixed(2)} m)`);
  // and with the gap turned away, the same straight flight is blocked
  const away = F.gapAt(tg + 2 + Math.PI/R.spin, V());
  const rb = fly(() => rc.clone().add(V(0, -0.9, 0)), gap.clone().multiplyScalar(8).add(rc).add(V(0, -0.9, 0)), tg + Math.PI/R.spin, 6);
  ok(rb.best > 1.5 && away.dot(gap) < -0.9, `ring: with the gap on the far side the rocks keep you out (closest ${rb.best.toFixed(2)} m)`);
  astReport.push(`ring gap: shard reached in ${rs.secs.toFixed(1)} s when timed; ${rb.best.toFixed(2)} m short when the gap is away`);
  // satellite: from 7 m in front of the open end, fly in to the shard (local 0, 0, 0.4)
  const t1 = 25; F.step(t1);
  const shardW = () => V(0, 0, 0.4).applyQuaternion(F.sat.quat).add(F.sat.pos);
  const mouth = V(0, 0, 7).applyQuaternion(F.sat.quat).add(F.sat.pos);
  const ss = fly(() => shardW().add(V(0, -0.9, 0)), mouth.add(V(0, -0.9, 0)), t1, 12);
  ok(ss.best < 1.5, `satellite: flew into the drum to asteroids-2 in ${ss.secs.toFixed(1)} s (closest ${ss.best.toFixed(2)} m)`);
  ok(F.sat.pos.length() > 38 && F.sat.pos.length() < FIELD.R, `the satellite drifts near the boundary (${F.sat.pos.length().toFixed(1)} m of ${FIELD.R})`);
  astReport.push(`satellite: shard reached in ${ss.secs.toFixed(1)} s from 7 m out in front of the open end`);
  // a drifting rock bounces you: the obstacle position is live
  const rock = F.big[0], p0 = rock.pos.clone(); F.step(10); const moved = rock.pos.distanceTo(p0);
  const c = kit.jetpack({ obstacles:F.obstacles }), v = kit.view(cam, c); c.place(rock.pos.x, rock.pos.y, rock.pos.z + rock.hit + 0.3, Math.PI); c.update(DT, v);
  ok(moved > 0.05 && c.pos.distanceTo(rock.pos) >= rock.hit + 0.6 - 1e-6, `big rocks drift (${moved.toFixed(2)} m in 10 s) and push you out where they are now`);
}
console.log('asteroid field:\n  ' + astReport.join('\n  '));
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
