// Door reachability audit, runnable in node (no browser):  node island/_test/doors.mjs
// Boots map.js, the games' world setup, garage.js and drone.js against DOM stubs, so ctx.colliders
// holds the same static colliders the browser builds. Then, for each zone, it checks that a walker
// of pushRadius (0.95, what character.js writes into state.player) can stand on
// ctx.island.doorOf(id), and that a grid BFS reaches it from ctx.island.approachOf(id) through cells
// where a 0.6 m radius disc (a 1.2 m wide corridor) is clear. Blocked doors name their blocker.
// Exit code 1 when any door is blocked. Uses the three.js in andliu-portfolio/node_modules.
import * as THREE from 'three';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/* ---------- stubs: a permissive "anything" for DOM and canvas ---------- */
const any = new Proxy(function(){}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'length' ? 0 : k === Symbol.iterator ? function*(){} : any,
  set: () => true, apply: () => any, construct: () => any,
});
const el = () => new Proxy({ style:{}, dataset:{}, classList:{ add(){}, remove(){}, toggle(){}, contains:() => false }, children:[], width:0, height:0 }, {
  get: (t, k) => k in t ? t[k] : k === 'getContext' ? () => any : k === 'querySelector' ? () => el() : k === 'querySelectorAll' ? () => [] : typeof k === 'symbol' ? undefined : any,
});
globalThis.window = globalThis;
globalThis.document = { createElement: el, createElementNS: el, getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  body: el(), head: el(), documentElement: el(), addEventListener(){}, fonts: { load: async () => {} } };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = () => 0; globalThis.matchMedia = () => ({ matches:false, addEventListener(){} });
try { globalThis.localStorage = { getItem:() => null, setItem(){}, removeItem(){} }; } catch {}
globalThis.Image = function(){ return el(); };
const CANNON = new Proxy({}, { get: () => any });
const warns = []; console.warn = (...a) => warns.push(a.map(String).join(" ").slice(0, 160));

/* ---------- ctx, as main.js builds it ---------- */
const src = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../src');
const imp = p => import(pathToFileURL(path.join(src, p)).href);
const { createBus } = await imp('core/bus.js');
const { createState } = await imp('core/state.js');
const { createPhysics } = await imp('core/physics.js');
const { createHelpers } = await imp('core/helpers.js');
const { createProps } = await imp('core/props.js');
const { createActors } = await imp('core/actors.js');
const { ZONES } = await imp('data/zones.js');

const scene = new THREE.Scene(), bus = createBus(), state = createState(THREE);
const physics = createPhysics(CANNON), H = createHelpers(THREE, scene);
const island = { radius:96 };
const ctx = { THREE, CANNON, bus, state, scene, camera:new THREE.PerspectiveCamera(), sun:new THREE.DirectionalLight(), sound:any, island,
  renderer:{ domElement:el() }, world:physics.world, colliders:physics.colliders, zones:ZONES, modules:{} };
const props = createProps({ THREE, CANNON, scene, world:physics.world, H, sound:any, island });
const actors = createActors({ THREE, scene, H, sound:any, state });
ctx.props = props.props; ctx.chars = actors.chars; ctx.animated = H.animated;
ctx.helpers = Object.assign({}, H, { solidBox:physics.solidBox, solidCircle:physics.solidCircle, prop:props.prop, crate:props.crate, trafficCone:props.trafficCone,
  eyes:actors.eyes, addChar:actors.addChar, blob:actors.blob, berry:actors.berry, tooth:actors.tooth, terrapin:actors.terrapin, robot:actors.robot, brainBuddy:actors.brainBuddy });
ctx.onUpdate = () => {}; ctx.expose = () => {};
ctx.input = { keys:{}, on:() => () => {}, isDown:() => false, trigger(){}, press(){}, clear(){}, MOVE:{}, ACTIONS:{} };
ctx.modes = { registerPlayer(){}, setMode(){}, placePlayer(){}, enterInterior(){}, exitInterior(){}, teleport(){}, islandMode:() => 'drive' };
ctx.hud = new Proxy({ minimapLayers:[], gameRoot:el(), setHint(){}, hint:el() }, { get: (t, k) => k in t ? t[k] : any });

// Tag every collider with the module that pushed it, so a blocker can be named.
let owner = 'core';
const push = physics.colliders.push.bind(physics.colliders);
physics.colliders.push = (...cs) => { const at = (new Error().stack.split('\n').slice(2).find(l => /src[\\/](world|games|player)[\\/]/.test(l) && !/physics\.js/.test(l)) || '').match(/src[\\/][^:]+:\d+/)?.[0]?.replace(/\\/g, '/'); for(const c of cs) c.from = at || owner; return push(...cs); };

// garage.js only needs the car's vehicle list (car.js is not booted here)
ctx.modules.car = { setVehicle:() => true, ids:['jeep', 'ev', 'rv', 'truck'], info:id => ({ name:id }), vehicle:() => 'jeep', model:() => new THREE.Group(), car:{ x:0, z:6, heading:Math.PI, group:new THREE.Group() } };
for(const [name, p] of [['map', 'world/map.js'], ['games', 'games/index.js'], ['garage', 'player/garage.js'], ['drone', 'player/drone.js']]){
  owner = p;
  try { ctx.modules[name] = (await (await imp(p)).init(ctx)) ?? {}; }
  catch(e){ console.log(`[doors] ${name} did not boot in node (${String(e).slice(0, 120)}); its colliders are missing`); }
}

/* ---------- audit ---------- */
const PUSH = 0.95, LANE = 0.6, STEP = 0.25;
function distTo(c, x, z){
  if(c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) - c.r;
  const co = Math.cos(c.ang || 0), si = Math.sin(c.ang || 0), dx = x - c.x, dz = z - c.z;
  const lx = dx*co - dz*si, lz = dx*si + dz*co;
  return Math.hypot(Math.max(0, Math.abs(lx) - c.hw), Math.max(0, Math.abs(lz) - c.hd));
}
const cols = ctx.colliders.filter(c => !c.shore);
const hitsAt = (x, z, r) => cols.filter(c => distTo(c, x, z) < r);
const fmt = c => `${c.kind} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)})${c.kind === 'box' ? ` ${(c.hw*2).toFixed(1)} x ${(c.hd*2).toFixed(1)}` : ` r ${c.r}`} from ${c.from}`;
function reach(a, b){
  // BFS on a STEP grid in a box round both points; a cell is open when a LANE-radius disc fits.
  const x0 = Math.min(a.x, b.x) - 12, z0 = Math.min(a.z, b.z) - 12, nx = Math.ceil((Math.max(a.x, b.x) + 12 - x0)/STEP), nz = Math.ceil((Math.max(a.z, b.z) + 12 - z0)/STEP);
  const local = cols.filter(c => distTo(c, (a.x + b.x)/2, (a.z + b.z)/2) < Math.hypot(a.x - b.x, a.z - b.z)/2 + 20);
  const open = (i, j) => { const x = x0 + i*STEP, z = z0 + j*STEP; return Math.hypot(x, z) < island.radius - 2 && !local.some(c => distTo(c, x, z) < LANE); };
  const cell = p => [Math.round((p.x - x0)/STEP), Math.round((p.z - z0)/STEP)];
  const [si, sj] = cell(a), [ti, tj] = cell(b), seen = new Uint8Array(nx*nz), q = [[si, sj]];
  if(!open(si, sj)) return { ok:false, why:'approach point itself is blocked' };
  seen[sj*nx + si] = 1;
  while(q.length){
    const [i, j] = q.shift();
    if(Math.abs(i - ti) <= 1 && Math.abs(j - tj) <= 1) return { ok:true };
    for(const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const u = i + di, v = j + dj; if(u < 0 || v < 0 || u >= nx || v >= nz || seen[v*nx + u]) continue; seen[v*nx + u] = 1; if(open(u, v)) q.push([u, v]); }
  }
  return { ok:false, why:'no 1.2 m corridor from the approach point' };
}

for(const w of warns) console.log("[warn]", w);
let bad = 0;
console.log(`colliders: ${cols.length}`);
for(const z of ZONES){
  const d = island.doorOf(z.id), ap = island.approachOf(z.id);
  const stand = hitsAt(d.x, d.z, PUSH), lane = hitsAt(d.x, d.z, LANE), r = lane.length ? { ok:false, why:'door point inside a collider' } : reach(ap, d);
  const ok = !stand.length && r.ok;
  if(!ok) bad++;
  console.log(`${ok ? 'OK     ' : 'BLOCKED'} ${z.id.padEnd(10)} door (${d.x.toFixed(1)}, ${d.z.toFixed(1)})  approach (${ap.x.toFixed(1)}, ${ap.z.toFixed(1)})${r.ok ? '' : '  ' + r.why}`);
  for(const c of stand) console.log(`          within ${PUSH} m of the door point: ${fmt(c)}`);
}
if(process.argv[2]){
  // node doors.mjs <zoneId>: every collider within 10 m of that door, in the zone's local frame (+z toward the plaza)
  const z = ZONES.find(q => q.id === process.argv[2]), d = island.doorOf(z.id), f = H.frameOf(z), c = Math.cos(f.ang), s = Math.sin(f.ang);
  for(const k of cols.filter(k => distTo(k, d.x, d.z) < 10)){ const dx = k.x - z.x, dz = k.z - z.z; console.log(`  local (${(dx*c - dz*s).toFixed(1)}, ${(dx*s + dz*c).toFixed(1)})  gap ${distTo(k, d.x, d.z).toFixed(2)} m  ${fmt(k)}`); }
  // Characters are not colliders, but one within 3 m of the door used to win F (talk) over the door.
  for(const ch of ctx.chars){ const p = ch.g?.position; if(!p) continue; const g = Math.hypot(p.x - d.x, p.z - d.z); if(g < 4){ const dx = p.x - z.x, dz = p.z - z.z; console.log(`  character local (${(dx*c - dz*s).toFixed(1)}, ${(dx*s + dz*c).toFixed(1)})  ${g.toFixed(2)} m from the door${ch.wander ? ' (wanders)' : ''}`); } }
}
process.exit(bad ? 1 : 0);
