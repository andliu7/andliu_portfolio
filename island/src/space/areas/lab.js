// Wormhole Lab (builder B): a first-person portal puzzle. Q fires a blue portal, E an orange one,
// onto white panels only. Walk or fall into one and you come out of the other with velocity and
// facing turned from the entry's inward normal to the exit's outward normal. Three chambers teach
// it: 1 walk through a wall, 2 drop through the floor to reach a high ledge (lab-1), 3 fall a long
// way and get flung over a glass rail to a button that opens the vault door (lab-2). Progress is
// saved as kit.setFlag('lab-chamber', n): the highest chamber reached, 4 once the door is open.
// Pure pieces (portalMath, makeLevel, createLabCore) are node-tested in brief-b.test.mjs.
// See SPACE.md ("Area contract" and "Brief B").

const MID = 0.9, BODY_R = 0.45;                     // the body's middle above the feet, and its radius
const PITCH = 1.2;                                  // the kit's first-person look limit (radians)
// Portal sizes and crossing rules. w, h: a wall portal's half width and half height; r: a floor
// portal's radius; hole: how near a floor portal's centre the floor opens (and the crossing reach);
// clear: gap left between the body and the exit surface; touch: how near the body must come to the
// entry surface; latR, latU: how far off-centre you may come out; cool: seconds before a re-cross.
export const PORTAL = { w:0.7, h:1.1, r:0.85, hole:1.0, clear:0.45, touch:0.15, latR:0.3, latU:0.3, cool:0.25, reach:80 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- the portal math (pure; THREE passed in so node tests use real three) ---------- */
// A portal is { c, n, u, r, floor }: c its centre on the surface, n the unit normal out of the
// surface, u its "up" along the surface (world up on a wall, the shooter's heading on a floor) and
// r = u x n, so the columns [r u n] make a right-handed rotation.
//
// Crossing A -> B turns everything by R = M_B * F * M_A^T: M_A^T expresses a vector in A's frame,
// F is a half turn about u (in through A becomes out of B, and your right stays your right), M_B
// puts it back in the world. R maps -n_A to n_B and u_A to u_B exactly. For wall-to-wall it equals
// setFromUnitVectors(-n_A, n_B); unlike that shortest arc it is also defined when the two normals
// are parallel (floor-to-floor, or two walls facing the same way), where the shortest arc is any
// half turn at all.
export function portalMath(THREE){
  const V = () => new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), flip = new THREE.Matrix4().makeScale(-1, 1, -1);   // diag(-1, 1, -1): the half turn about u
  const a = V(), look = V(), f = V();

  // how far the body reaches along n from its middle: half its height up or down, its radius sideways
  const ext = n => { const k = Math.min(1, Math.abs(n.y)); return MID*k + BODY_R*Math.sqrt(1 - k*k); };

  // A frame from a surface normal and a hint for up (projected onto the surface).
  function frame(n, upHint){
    const N = n.clone().normalize(), U = upHint.clone().addScaledVector(N, -upHint.dot(N));
    if(U.lengthSq() < 1e-8){ U.set(0, 0, -1).addScaledVector(N, -N.z); if(U.lengthSq() < 1e-8) U.set(1, 0, 0).addScaledVector(N, -N.x); }
    U.normalize();
    return { n:N, u:U, r:V().crossVectors(U, N) };
  }

  // R = M_B F M_A^T as a quaternion (the transpose of a rotation is its inverse)
  function rotation(A, B, out){
    mA.makeBasis(A.r, A.u, A.n).transpose();
    mB.makeBasis(B.r, B.u, B.n).multiply(flip).multiply(mA);
    return out.setFromRotationMatrix(mB);
  }

  // Should the body at feet pos, moving at vel, go through A now? Its nearest point must be within
  // touch of A's surface, its middle over the portal, and it must be moving into it.
  function probe(A, pos, vel){
    if(vel.dot(A.n) > -0.05) return false;                         // moving out of it or along it
    a.copy(pos); a.y += MID; a.sub(A.c);
    const s = a.dot(A.n);                                          // height of the middle above the surface
    if(s - ext(A.n) > PORTAL.touch || s < -1.5) return false;
    const x = a.dot(A.r), y = a.dot(A.u);
    return A.floor ? Math.hypot(x, y) < PORTAL.hole : Math.abs(x) < PORTAL.w && Math.abs(y) < PORTAL.h;
  }

  // Take ctrl (feet pos, vel, horizontal fwd) through A and out of B. pitch is the first-person look
  // angle; the new one is returned. Position: the sideways offset in A's frame carries over (r flips
  // with the half turn, clamped so you come out of the hole), the depth is reset so the body clears
  // B's surface by PORTAL.clear.
  function cross(ctrl, pitch, A, B, q){
    rotation(A, B, q);
    a.copy(ctrl.pos); a.y += MID; a.sub(A.c);
    const x = clamp(a.dot(A.r), -PORTAL.latR, PORTAL.latR), y = clamp(a.dot(A.u), -PORTAL.latU, PORTAL.latU);
    ctrl.pos.copy(B.c).addScaledVector(B.r, -x).addScaledVector(B.u, y).addScaledVector(B.n, ext(B.n) + PORTAL.clear);
    ctrl.pos.y -= MID;                                             // back from the middle to the feet
    ctrl.vel.applyQuaternion(q);                                   // speed in = speed out, turned
    look.copy(ctrl.fwd).multiplyScalar(Math.cos(pitch)).addScaledVector(UP, Math.sin(pitch)).applyQuaternion(q);
    f.copy(ctrl.fwd).applyQuaternion(q);
    // the new heading is the flat part of the turned look; if that is vertical, the turned heading;
    // if that is vertical too, straight out of B (or along B's up on a floor)
    const flat = v => Math.hypot(v.x, v.z);
    const src = flat(look) > 0.2 ? look : flat(f) > 0.2 ? f : flat(B.n) > 0.2 ? B.n : B.u;
    ctrl.fwd.set(src.x, 0, src.z).normalize();
    ctrl.grounded = false;
    return clamp(Math.asin(clamp(look.y, -1, 1)), -PITCH, PITCH);
  }

  // Where the feet land coming straight out of P's centre (used to refuse a portal with no room).
  function exitFeet(P, out){ out.copy(P.c).addScaledVector(P.n, ext(P.n) + PORTAL.clear); out.y -= MID; return out; }

  return { frame, rotation, probe, cross, exitFeet, ext };
}


/* ---------- the level: axis-aligned boxes ---------- */
// The kit's walker lives on a heightfield (floorAt(x, z) -> y; a floor more than 0.5 m above the
// feet is a wall), so the lab is a list of boxes { x0, x1, y0, y1, z0, z1 }. One list feeds
// floorAt, the gun's ray test and the InstancedMeshes. Kinds: wall and floor (solid, dark, refuse
// portals), lintel (over a doorway: drawn and hit by rays, not in floorAt), glass (solid, see
// through), plate (a thin white panel on a wall or floor; only its outward face n takes a portal).
//
// Layout, walking toward -z (feet heights in brackets):
//   lobby      z 11 .. 0      wing pad, hatch, terminal, two résumé eggs            [0]
//   chamber 1  z 0 .. -14     walk through: left-wall panel A1, back-wall panel A2   [0, platform 3]
//   chamber 2  z -14 .. -30   up a ledge: floor panel B1, high back-wall panel B2    [3, ledge 7.5, lab-1]
//   chamber 3  z -30 .. -50   fling: drop slot with floor panel C1, high panel C2 on
//                             the wall behind you, glass rail, soft pool, goal       [7.5, pool -4.5, goal 4]
//   vault      z -50 .. -54   behind the button's door: lab-2 and a hatch            [4]
// Jump apex is 6.5^2 / (2*14) = 1.51 m, so every step up the puzzle needs is at least 2.1 m.
export const CHAMBERS = [
  { name:'Lobby', start:[0, 0, 7.5] },
  { name:'Walk through', tip:'Q fires blue, E fires orange. Portals only stick to white panels. Put one on each white wall and walk in.', start:[0, 0, -1.8] },
  { name:'Up to the ledge', tip:'Floors take portals too. Step into a hole in the floor and come out high on the wall.', start:[4.5, 3, -15.6] },
  { name:'Fling', tip:'A long fall is a lot of speed. Walk off the back of the slot holding W, and let the wall throw you over the glass.', start:[-4.5, 7.5, -31.2] },
  { name:'Vault', start:[0, 4, -47] },
];
export const chamberAt = z => z > 0 ? 0 : z > -14 ? 1 : z > -30 ? 2 : z > -50 ? 3 : 4;

export function makeLevel(THREE){
  const boxes = [], plates = [];
  const add = (kind, x0, x1, y0, y1, z0, z1, tone) => { const b = { kind, x0, x1, y0, y1, z0, z1, tone:tone || kind, solid:kind !== 'lintel' }; boxes.push(b); return b; };
  const wall = (...a) => add('wall', ...a), floor = (x0, x1, y0, y1, z0, z1, tone) => add('floor', x0, x1, y0, y1, z0, z1, tone || 'floor');
  const plate = (name, x0, x1, y0, y1, z0, z1, n) => { const p = { kind:'plate', name, x0, x1, y0, y1, z0, z1, n:new THREE.Vector3(...n) }; plates.push(p); return p; };
  // lobby
  floor(-7.6, 7.6, -1, 0, -0.3, 11.6);
  wall(-7.6, -7, -1, 6, 0.3, 11); wall(7, 7.6, -1, 6, 0.3, 11); wall(-7.6, 7.6, -1, 6, 11, 11.6);
  add('wall', 5.1, 5.9, 0, 1.2, 1.6, 2.2, 'trim');                                      // the terminal
  wall(-7.6, -1.2, -1, 8, -0.3, 0.3); wall(1.2, 7.6, -1, 8, -0.3, 0.3); add('lintel', -1.2, 1.2, 3, 8, -0.3, 0.3);
  // chamber 1
  floor(-7.6, 7.6, -1, 0, -14, 0.3);
  wall(-7.6, -7, -1, 8, -14, -0.3); wall(7, 7.6, -1, 8, -14, -0.3);
  floor(-7, 7, -1, 3, -14.3, -9.7, 'step');                                             // the platform
  wall(-7.6, 3.4, -1, 14, -14.3, -13.7); wall(5.6, 7.6, -1, 14, -14.3, -13.7); add('lintel', 3.4, 5.6, 6, 14, -14.3, -13.7);
  plate('A1', -7, -6.95, 0, 4, -8, -3, [1, 0, 0]);
  plate('A2', -5, 2.5, 3, 7.5, -13.7, -13.65, [0, 0, 1]);
  // chamber 2
  floor(-7.6, 7.6, -1, 3, -30, -14);
  wall(-7.6, -7, 3, 14, -30, -14.3); wall(7, 7.6, 3, 14, -30, -14.3);
  floor(-7, 7, -1, 7.5, -30.3, -24.7, 'step');                                          // the ledge
  wall(-7.6, -5.6, -5.5, 16.5, -30.3, -29.7); wall(-3.4, 7.6, -5.5, 16.5, -30.3, -29.7); add('lintel', -5.6, -3.4, 10.5, 16.5, -30.3, -29.7);
  plate('B1', -4, 4, 2.98, 3.005, -22, -17, [0, 1, 0]);
  plate('B2', -2.5, 5.5, 9.3, 13, -29.7, -29.65, [0, 0, 1]);
  // chamber 3: a balcony around a drop slot, a glass rail, the soft pool and the goal ledge
  floor(-7.6, 7.6, -5.5, -4.5, -50, -30.3, 'pool');
  wall(-7.6, -7, -5.5, 17, -50, -30.3); wall(7, 7.6, -5.5, 17, -50, -30.3);
  floor(-7, -1.2, -5.5, 7.5, -38.5, -29.7, 'step'); floor(1.2, 7, -5.5, 7.5, -38.5, -29.7, 'step');
  floor(-1.2, 1.2, -5.5, 7.5, -31.5, -29.7, 'step'); floor(-1.2, 1.2, -5.5, 7.5, -38.5, -37.5, 'step');
  const glass = add('glass', -7, 7, 7.5, 9.6, -38.5, -38.2);
  floor(-7, 7, -5.5, 4, -50.3, -43, 'goal');
  add('floor', 2.4, 3.6, 4, 4.1, -47.1, -45.9, 'trim');                                 // the button's base
  wall(-7.6, -1.2, -5.5, 12, -50.3, -49.7); wall(1.2, 7.6, -5.5, 12, -50.3, -49.7); add('lintel', -1.2, 1.2, 7.5, 12, -50.3, -49.7);
  plate('C1', -1.2, 1.2, -4.52, -4.495, -37.5, -31.5, [0, 1, 0]);
  plate('C2', -3, 6, 11.35, 16, -30.35, -30.3, [0, 0, -1]);
  // the vault behind the exit door
  floor(-3, 3, -1, 4, -54, -50.3, 'vault');
  wall(-7.6, -3, -1, 12, -54.6, -50.3); wall(3, 7.6, -1, 12, -54.6, -50.3); wall(-3, 3, -1, 12, -54.6, -54);
  const door = { kind:'door', x0:-1.2, x1:1.2, y0:4, y1:7.5, z0:-50.15, z1:-49.85, solid:true };
  return {
    boxes, plates, door, glass,
    pads:[{ x:-4.2, z:8.2, r:1.35, top:0.34 }],                                         // the wing pad's stone disc
    button:{ x:3, y:4.1, z:-46.5 },
    fields:[[0, 1.5, 0, 2.4, 3], [4.5, 4.5, -14, 2.2, 3], [-4.5, 9, -30, 2.2, 3]],       // doorway shimmer: x, y, z, w, h
    strips:[[-0.3, 11, 6], [-14, -0.3, 8], [-30, -14.3, 14], [-50, -30.3, 17]],          // light strips on the side walls: z0, z1, top
    bounds:{ minX:-7.6, maxX:7.6, minZ:-54.6, maxZ:11.6 },
  };
}

/* ---------- the lab core: floor, ray test, the gun, crossing, chambers (pure; node-tested) ---------- */
const FOOT = 0.4, VOID = -60;                        // the feet keep FOOT from any wall; VOID is under everything
export function createLabCore(THREE, on = {}){
  const L = makeLevel(THREE), pm = portalMath(THREE);
  const solids = L.boxes.filter(b => b.solid), rays = [...L.boxes, ...L.plates, L.door];
  const portals = [null, null];
  const st = { chamber:0, cool:0, doorOpen:false, linked:false };
  const q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  const inFoot = (b, x, z) => x > b.x0 - FOOT && x < b.x1 + FOOT && z > b.z0 - FOOT && z < b.z1 + FOOT;

  // The floor without portal holes: the highest box whose footprint, grown by FOOT, holds (x, z).
  // Growing the boxes instead of shrinking the player gives him a radius against every wall.
  function base(x, z){
    let f = VOID;
    for(const b of solids) if(b.y1 > f && inFoot(b, x, z)) f = b.y1;
    if(!st.doorOpen && L.door.y1 > f && inFoot(L.door, x, z)) f = L.door.y1;
    for(const p of L.pads) if(p.top > f && Math.hypot(x - p.x, z - p.z) < p.r) f = p.top;
    return f;
  }
  // With both portals open, the floor under a floor portal falls away so you drop into it.
  function floorAt(x, z){
    const f = base(x, z);
    if(st.linked) for(const p of portals) if(p.floor && Math.abs(f - p.c.y) < 0.1 && Math.hypot(x - p.c.x, z - p.c.z) < PORTAL.hole) return p.c.y - 40;
    return f;
  }

  // Ray against every box by the slab method: the entry distance is the last of the three axis
  // entries, the exit the first of the exits; the axis of the last entry is the face that was hit.
  const hit = { t:0, box:null, point:new THREE.Vector3(), n:new THREE.Vector3() };
  function raycast(o, d, far = PORTAL.reach){
    let best = far, bb = null, ba = 0, bs = 0;
    const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
    for(const b of rays){
      if(b === L.door && st.doorOpen) continue;
      const lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
      let t0 = 0, t1 = best, ax = -1, sg = 0, miss = false;
      for(let a = 0; a < 3 && !miss; a++){
        if(Math.abs(D[a]) < 1e-9){ if(O[a] < lo[a] || O[a] > hi[a]) miss = true; continue; }
        let ta = (lo[a] - O[a])/D[a], tb = (hi[a] - O[a])/D[a], s = -1;     // entering the low face: normal points -a
        if(ta > tb){ const k = ta; ta = tb; tb = k; s = 1; }
        if(ta > t0){ t0 = ta; ax = a; sg = s; }
        if(tb < t1) t1 = tb;
        if(t0 > t1) miss = true;
      }
      if(!miss && ax >= 0 && t0 < best){ best = t0; bb = b; ba = ax; bs = sg; }
    }
    if(!bb) return null;
    hit.t = best; hit.box = bb; hit.point.copy(o).addScaledVector(d, best); hit.n.set(0, 0, 0).setComponent(ba, bs);
    return hit;
  }

  // Fire portal which (0 blue, 1 orange) along a ray. White plate faces only; the portal is slid to
  // fit on its panel, may not overlap the other one, and needs room to come out of.
  function fire(which, origin, dir, facing){
    const h = raycast(origin, dir);
    if(!h) return { ok:false, why:'nothing in reach', point:null };
    const b = h.box, point = h.point.clone();
    if(b.kind !== 'plate' || !b.n.equals(h.n)) return { ok:false, why:'not a white panel', point };
    const floor = b.n.y > 0.5, n = b.n.clone();
    const up = floor ? new THREE.Vector3(dir.x, 0, dir.z) : new THREE.Vector3(0, 1, 0);   // a floor portal's up is the way you were looking
    if(floor && up.lengthSq() < 0.01) up.set(facing.x, 0, facing.z);
    const P = Object.assign({ c:point.clone(), floor, plate:b, which }, pm.frame(n, up));
    const fit = (v, lo, hi) => lo > hi ? NaN : clamp(v, lo, hi);
    const c = P.c;
    if(floor){ c.x = fit(c.x, b.x0 + PORTAL.r, b.x1 - PORTAL.r); c.z = fit(c.z, b.z0 + PORTAL.r, b.z1 - PORTAL.r); }
    else {
      c.y = fit(c.y, b.y0 + PORTAL.h, b.y1 - PORTAL.h);
      if(c.y - PORTAL.h - b.y0 < 1) c.y = b.y0 + PORTAL.h;                        // a small gap underneath: sit it on the panel's bottom, so you can walk in
      if(Math.abs(n.x) > 0.5) c.z = fit(c.z, b.z0 + PORTAL.w, b.z1 - PORTAL.w); else c.x = fit(c.x, b.x0 + PORTAL.w, b.x1 - PORTAL.w);
    }
    if(!Number.isFinite(c.x + c.y + c.z)) return { ok:false, why:'panel too small', point };
    c.addScaledVector(n, 0.01);
    const other = portals[1 - which];
    if(other && other.plate === b){
      tmp.copy(c).sub(other.c);
      const clash = floor ? tmp.length() < 2*PORTAL.r : Math.abs(tmp.dot(P.r)) < 2*PORTAL.w && Math.abs(tmp.y) < 2*PORTAL.h;
      if(clash) return { ok:false, why:'overlaps the other portal', point };
    }
    pm.exitFeet(P, tmp);
    if(base(tmp.x, tmp.z) > tmp.y + 0.5) return { ok:false, why:'no room to come out', point };
    portals[which] = P; st.linked = !!(portals[0] && portals[1]);
    on.portal?.(which, P);
    return { ok:true, portal:P, point };
  }
  function clear(){ if(!portals[0] && !portals[1]) return; portals[0] = portals[1] = null; st.linked = false; on.clear?.(); }

  // Put the player at a chamber's start.
  function goTo(ctrl, view, n){
    const s = CHAMBERS[n].start;
    ctrl.place(s[0], s[1], s[2], Math.PI);
    if(view){ view.pitch = 0; view.snap?.(); }
    st.chamber = n; st.cool = 0; clear();
  }

  // Once per frame, after the walker has moved.
  function step(ctrl, view, dt){
    st.cool = Math.max(0, st.cool - dt);
    if(st.linked && st.cool === 0){
      for(let i = 0; i < 2; i++){
        const A = portals[i], B = portals[1 - i];
        if(!pm.probe(A, ctrl.pos, ctrl.vel)) continue;
        const pitch = pm.cross(ctrl, view?.fp ? view.pitch : 0, A, B, q);
        if(view){ if(view.fp) view.pitch = pitch; else view.back.copy(ctrl.fwd).negate(); view.snap?.(); }
        if(!B.floor){ const f = base(ctrl.pos.x, ctrl.pos.z); if(ctrl.pos.y < f + 0.02) ctrl.pos.y = f + 0.02; }   // never under the floor below a low wall portal
        st.cool = PORTAL.cool; on.cross?.(i);
        break;
      }
    }
    const n = chamberAt(ctrl.pos.z);
    if(n !== st.chamber){ const from = st.chamber; st.chamber = n; clear(); on.chamber?.(n, from); }   // every doorway is a field that clears portals
    if((st.chamber === 3 && ctrl.grounded && ctrl.pos.y < -3) || ctrl.pos.y < -25){ const c = st.chamber === 4 ? 3 : st.chamber; goTo(ctrl, view, c); on.reset?.(c); }
  }
  function openDoor(){ if(st.doorOpen) return false; st.doorOpen = true; return true; }

  return { L, pm, st, portals, base, floorAt, raycast, fire, clear, goTo, step, openDoor };
}

/* ======================================================================================== */
const LAB = '#a78bfa', BLUE = '#5b8cff', ORANGE = '#ff9f5a';
const TONES = { wall:'#4b5470', lintel:'#3f4760', floor:'#9aa3bf', step:'#c3cae0', pool:'#63c7e6', goal:'#ffd166', vault:'#c9b6ff', trim:LAB, glass:'#bfe3ff' };
const CSS = `#lab-aim{position:fixed;left:50%;top:50%;width:64px;height:40px;transform:translate(-50%,-12px);pointer-events:none;z-index:5}
#lab-aim i{position:absolute;left:29px;top:9px;width:6px;height:6px;border-radius:50%;background:#fffaf0;box-shadow:0 0 0 2px #1f2a44}
#lab-aim b{position:absolute;top:24px;width:22px;height:14px;border-radius:7px;font:700 10px/14px Fredoka,system-ui,sans-serif;text-align:center;color:#fffaf0;background:#1f2a44b0;border:2px solid}
#lab-aim .q{left:6px;border-color:${BLUE}}#lab-aim .e{right:6px;border-color:${ORANGE}}
#lab-aim .q.on{background:${BLUE}}#lab-aim .e.on{background:${ORANGE}}`;

export function build(ctx, kit){
  const { THREE, H } = kit;
  const scene = kit.scene({ bg:'#10142a', sky:'#e8ecff', ground:'#3a4060', hemi:1.3, light:1.4, stars:500, seed:kit.hashSeed('lab') });
  const camera = kit.camera(62);
  const tone = (...a) => { try { ctx.sound?.tone?.(...a); } catch(e){ /* sound is optional */ } };
  const looks = [];

  /* ---------- the core, wired to the visuals ---------- */
  const core = createLabCore(THREE, {
    portal:(i, P) => showPortal(i, P),
    clear:() => { for(const p of looks) p.g.visible = false; },
    cross:() => tone(300, 0.25, 'sine', 0.05, 1200),
    chamber:n => {
      if(n < 1 || n > 3) return;
      kit.say(`Chamber ${n} of 3: ${CHAMBERS[n].name}`);
      if((kit.flag('lab-chamber') || 0) < n) kit.setFlag('lab-chamber', n);
    },
    reset:n => kit.say(n === 3 ? 'Soft landing. Back to the balcony.' : `Back to the start of chamber ${n}`),
  });
  const { L } = core;
  if((kit.flag('lab-chamber') || 0) >= 4) core.openDoor();

  /* ---------- the boxes: one draw call for all dark ones, one for all white panels ---------- */
  const unit = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), col = new THREE.Color();
  const placeBox = (mesh, i, b) => { P3.set((b.x0 + b.x1)/2, (b.y0 + b.y1)/2, (b.z0 + b.z1)/2); S3.set(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0); mesh.setMatrixAt(i, m4.compose(P3, q0, S3)); };
  const solid = L.boxes.filter(b => b.kind !== 'glass');
  const structure = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:0.85 }), solid.length);
  solid.forEach((b, i) => { placeBox(structure, i, b); structure.setColorAt(i, col.set(TONES[b.tone] || TONES.wall)); });
  scene.add(structure);
  const panels = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color:'#f7f8fc', roughness:0.5, emissive:'#dfe7ff', emissiveIntensity:0.18 }), L.plates.length);
  L.plates.forEach((b, i) => placeBox(panels, i, b));
  scene.add(panels);
  const gb = L.glass, glass = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color:TONES.glass, transparent:true, opacity:0.22, roughness:0.05, depthWrite:false }));
  glass.position.set((gb.x0 + gb.x1)/2, (gb.y0 + gb.y1)/2, (gb.z0 + gb.z1)/2); glass.scale.set(gb.x1 - gb.x0, gb.y1 - gb.y0, gb.z1 - gb.z0); scene.add(glass);
  const d = L.door, door = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color:LAB, roughness:0.6 }));
  door.scale.set(d.x1 - d.x0, d.y1 - d.y0, d.z1 - d.z0); scene.add(door);
  const doorY = (d.y0 + d.y1)/2; let doorK = core.st.doorOpen ? 1 : 0;
  // doorway fields (they clear your portals) and light strips along the wall tops, instanced
  const fields = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color:'#9fe8ff', transparent:true, opacity:0.16, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending }), L.fields.length);
  L.fields.forEach(([x, y, z, w, h], i) => fields.setMatrixAt(i, m4.compose(P3.set(x, y, z), q0, S3.set(w, h, 1))));
  scene.add(fields);
  const strips = new THREE.InstancedMesh(unit, new THREE.MeshBasicMaterial({ color:'#e6ebff' }), L.strips.length*2);
  L.strips.forEach(([z0, z1, top], i) => { for(const s of [0, 1]) strips.setMatrixAt(i*2 + s, m4.compose(P3.set(s ? 7.3 : -7.3, top + 0.06, (z0 + z1)/2), q0, S3.set(0.3, 0.12, z1 - z0 - 0.4))); });
  scene.add(strips);

  /* ---------- portals: an oval ring and a swirling disc each ---------- */
  const swirl = H.canvasTex(256, 256, (g, W) => {
    const c = W/2, gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, '#0b1030'); gr.addColorStop(0.7, '#3a4a8a'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, Math.PI*2); g.fill();
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 7; g.lineCap = 'round';
    for(let k = 0; k < 4; k++){ g.beginPath(); for(let s = 0; s <= 1.001; s += 0.05){ const a = k*Math.PI/2 + s*3.2, r = 12 + s*(c - 22); const x = c + Math.cos(a)*r, y = c + Math.sin(a)*r; if(s === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  });
  const ringGeo = new THREE.TorusGeometry(1, 0.07, 8, 48), discGeo = new THREE.CircleGeometry(1, 40);
  for(const color of [BLUE, ORANGE]){
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const inner = new THREE.Group(); g.add(inner);
    inner.add(new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color })));
    const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ map:swirl.tex, color, transparent:true, opacity:0.95, depthWrite:false }));
    disc.position.z = -0.01; inner.add(disc);
    looks.push({ g, inner, disc, open:0, hw:1, hh:1 });
  }
  const basis = new THREE.Matrix4();
  function showPortal(i, P){
    const p = looks[i];
    p.g.position.copy(P.c).addScaledVector(P.n, 0.02);
    p.g.quaternion.setFromRotationMatrix(basis.makeBasis(P.r, P.u, P.n));   // ring and disc face +z in their own frame, so +z goes to n
    p.hw = P.floor ? PORTAL.r : PORTAL.w; p.hh = P.floor ? PORTAL.r : PORTAL.h;
    p.open = 0; p.g.visible = true;
  }
  // a grey puff where a shot fizzled
  const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map:swirl.tex, color:'#c9cfe0', transparent:true, opacity:0, depthWrite:false }));
  puff.scale.setScalar(0.6); scene.add(puff); let puffT = 0;

  /* ---------- signs: chamber numbers, the lab name, and the résumé eggs (zones.js only) ---------- */
  function wrap(g, text, maxW){ const out = []; let line = ''; for(const w of text.split(' ')){ const t = line ? line + ' ' + w : w; if(g.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; } if(line) out.push(line); return out; }
  function chamberSign(n, x, y, z, rot){
    const ch = CHAMBERS[n];
    const t = H.canvasTex(400, 520, (g, W, Hh) => {
      g.fillStyle = '#fffaf0'; H.rr(g, 0, 0, W, Hh, 34); g.fill();
      g.fillStyle = LAB; g.beginPath(); g.roundRect(0, 0, W, 84, [34, 34, 0, 0]); g.fill();
      g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; H.F(g, 700, 38); g.fillText('Wormhole Lab', 28, 44);
      g.fillStyle = '#1f2a44'; H.F(g, 700, 180); g.fillText(String(n).padStart(2, '0'), 22, 196);
      g.fillStyle = '#9aa3b8'; H.F(g, 600, 46); g.fillText('/03', 262, 236);
      for(let k = 1; k <= 3; k++){ g.fillStyle = k <= n ? LAB : '#d9dde6'; g.beginPath(); g.arc(40 + (k - 1)*44, 312, 14, 0, Math.PI*2); g.fill(); }
      g.fillStyle = '#1f2a44'; H.F(g, 700, 38); g.fillText(ch.name, 28, 370);
      g.fillStyle = '#4a5270'; H.F(g, 500, 25, 'Nunito'); let yy = 414;
      for(const s of wrap(g, ch.tip, W - 56)){ if(yy > Hh - 16) break; g.fillText(s, 28, yy); yy += 31; }
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.08), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false }));
    m.position.set(x, y, z); m.rotation.y = rot; scene.add(m);
  }
  chamberSign(1, 6.94, 2.45, -2.4, -Math.PI/2);
  chamberSign(2, 6.94, 5.45, -16.6, -Math.PI/2);
  chamberSign(3, -6.94, 9.95, -32.6, Math.PI/2);
  const title = kit.label('Wormhole Lab', LAB, '#ffffff'); title.position.set(0, 4.7, 0.7); title.scale.set(4.4, 1.25, 1); scene.add(title);
  const bb = kit.zone('blueberry'), sk = kit.zone('skills');
  kit.sign(scene, -6.92, 0.9, 5.2, { zone:'blueberry', lines:bb ? [bb.bullets[2]] : undefined, rot:Math.PI/2, post:false, w:3.6, h:2.1 });    // the whiteboard
  kit.sign(scene, 6.92, 0.9, 5.2, { zone:'studio', rot:-Math.PI/2, post:false, w:3.6, h:2.1 });                                              // the monitor
  kit.sign(scene, 6.92, 0.9, -6.4, { zone:'skills', lines:sk ? [sk.bullets[1]] : undefined, rot:-Math.PI/2, post:false, w:3.6, h:2.1 });      // the poster

  /* ---------- the player, first person, and the gun ---------- */
  const ctrl = kit.walker({ gravity:14, jump:6.5, speed:5, run:8.5, airControl:0.5, floorAt:core.floorAt, bounds:L.bounds });
  const rig = kit.rig(camera, ctrl, { fpStart:true, dist:6, height:3 });
  function shoot(which){
    const ray = kit.aim().ray;
    const res = core.fire(which, ray.origin, ray.direction, ctrl.fwd);
    if(res.ok){ tone(which ? 460 : 620, 0.14, 'sine', 0.05, which ? 700 : 950); return res; }
    if(res.point){ puff.position.copy(res.point); puffT = 0.35; }
    tone(200, 0.15, 'square', 0.03, 120);
    return res;
  }
  kit.onKey('KeyQ', e => { if(!e.repeat) shoot(0); });
  kit.onKey('KeyE', e => { if(!e.repeat) shoot(1); });

  /* ---------- ways out, shards, the button, the terminal ---------- */
  const pad = L.pads[0], spawn = CHAMBERS[0].start;
  kit.wingPad(scene, pad.x, 0, pad.z, { rot:Math.atan2(spawn[0] - pad.x, spawn[2] - pad.z) });
  kit.hatch(scene, 4.2, 0, 8.6, { rot:Math.atan2(spawn[0] - 4.2, spawn[2] - 8.6), color:LAB });
  kit.hatch(scene, 2, 4, -53, { rot:Math.atan2(-2, 3), color:LAB });                    // a second way back, in the vault
  const [id1, id2] = kit.shardsFor('lab');
  kit.shard(scene, id1, 0, 8.6, -27.2);                   // on chamber 2's ledge, in sight from the floor
  kit.shard(scene, id2, -1, 4.9, -51.8);                  // in the vault behind chamber 3's door
  const btn = L.button, capMat = new THREE.MeshStandardMaterial({ color:core.st.doorOpen ? '#57c785' : '#e5484d', roughness:0.4 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.2, 20), capMat); cap.position.set(btn.x, btn.y + 0.1, btn.z); scene.add(cap);
  kit.trigger({ x:btn.x, y:btn.y, z:btn.z, r:0.9, needGround:true, onEnter:() => {
    cap.position.y = btn.y + 0.03;
    if(!core.openDoor()) return;
    capMat.color.set('#57c785'); kit.chime(); kit.say('Exit door open'); kit.setFlag('lab-chamber', 4);
  } });
  kit.interactable({ x:5.5, y:0, z:1.9, r:2.2, label:'Lab terminal', onUse:() => {
    const best = Math.min(3, kit.flag('lab-chamber') || 0);
    if(best >= 2){ core.goTo(ctrl, rig.view, best); kit.say(`Chamber ${best} of 3: ${CHAMBERS[best].name}`); }
    else kit.say('Chamber 1 is through the door. Q blue, E orange.');
  } });

  let aim = null;
  if(!document.getElementById('lab-aim-css')){ const s = document.createElement('style'); s.id = 'lab-aim-css'; s.textContent = CSS; document.head.appendChild(s); }

  // critic hooks, once the lab has been built: __island.spaceLab.chamber(n), .fire(0 | 1), .state()
  ctx.expose?.('spaceLab', {
    chamber:n => { if(kit.player !== ctrl) return false; core.goTo(ctrl, rig.view, clamp(n | 0, 0, 4)); return true; },
    fire:which => kit.player === ctrl ? shoot(which ? 1 : 0) : null,
    state:() => ({ chamber:core.st.chamber, doorOpen:core.st.doorOpen, linked:core.st.linked, flag:kit.flag('lab-chamber') || 0,
      portals:core.portals.map(p => p && { plate:p.plate.name, x:+p.c.x.toFixed(2), y:+p.c.y.toFixed(2), z:+p.c.z.toFixed(2) }) }),
  });

  return {
    title:'Wormhole Lab', scene, camera, rig,
    spawn:{ x:spawn[0], y:spawn[1], z:spawn[2], yaw:Math.PI },
    hint:'<kbd>Q</kbd> blue portal · <kbd>E</kbd> orange portal · <kbd>WASD</kbd> walk · <kbd>Space</kbd> jump · drag to look · <kbd>V</kbd> view · <kbd>F</kbd> use · <kbd>Esc</kbd> station',
    onEnter(){
      core.st.chamber = 0; core.clear();
      if(!aim){ aim = document.createElement('div'); aim.id = 'lab-aim'; aim.innerHTML = '<i></i><b class="q">Q</b><b class="e">E</b>'; }
      document.body.appendChild(aim);
    },
    onExit(){ core.clear(); aim?.remove(); },
    update(dt, t){
      core.step(ctrl, rig.view, dt);
      for(const p of looks){
        if(!p.g.visible) continue;
        p.open = Math.min(1, p.open + dt*6);
        const k = p.open*(1.12 - 0.12*p.open);                               // a small overshoot as it opens
        p.inner.scale.set(p.hw*k, p.hh*k, 1);
        p.disc.rotation.z += dt*(core.st.linked ? 2.2 : 0.6);
        p.disc.material.opacity = core.st.linked ? 0.95 : 0.55;
      }
      if(puffT > 0){ puffT -= dt; puff.material.opacity = Math.max(0, puffT/0.35); puff.scale.setScalar(0.6 + (0.35 - puffT)*2); }
      doorK += ((core.st.doorOpen ? 1 : 0) - doorK)*Math.min(1, dt*2.5);
      door.position.set((d.x0 + d.x1)/2, doorY + doorK*3.6, (d.z0 + d.z1)/2);   // slides up into the wall
      fields.material.opacity = 0.12 + Math.sin(t*3)*0.05;
      if(aim){ aim.children[1].classList.toggle('on', !!core.portals[0]); aim.children[2].classList.toggle('on', !!core.portals[1]); aim.style.display = rig.view.fp ? '' : 'none'; }
    },
  };
}
