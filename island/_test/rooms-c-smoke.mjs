// Node smoke test for the rooms-c interiors (yard, chapel, skills): builds each room with real three
// and a stubbed 2D canvas, then runs every hotspot and a few seconds of room.update. No browser.
// Run from andliu-portfolio/: node island/_test/rooms-c-smoke.mjs
import * as THREE from 'three';
import { createHelpers } from '../src/core/helpers.js';
import { createActors } from '../src/core/actors.js';
import { ZONES } from '../src/data/zones.js';

// a 2D context that accepts every call; measureText is about 0.55 em per character
const ctx2d = new Proxy({}, { get(o, k){
  if(k in o) return o[k];
  if(k === 'measureText') return s => ({ width:String(s).length*10 });
  if(k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
  return () => {};
}, set(o, k, v){ o[k] = v; return true; } });
const el = () => ({ width:0, height:0, style:{}, getContext: () => ctx2d, append(){}, appendChild(){}, remove(){} });
globalThis.document = { createElement: el, body:el() };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.setTimeout = (f) => { f(); return 0; };   // run delayed effects at once so they are exercised too

const scene = new THREE.Scene();
const H = createHelpers(THREE, scene);
const actors = createActors({ THREE, scene, H, sound:{}, state:{} });
const handlers = {}, said = [], downs = new Set();
let rngCalls = 0; const rng0 = H.rng;
const ctx = {
  THREE, scene, state:{ interior:null, zoom:1 }, zones:ZONES,
  helpers:Object.assign({}, H, { eyes:actors.eyes, rng:() => { rngCalls++; return rng0(); } }),
  renderer:{ domElement:{ addEventListener(ev, fn){ if(ev === 'pointerdown') downs.add(fn); }, removeEventListener(ev, fn){ downs.delete(fn); }, getBoundingClientRect:() => ({ left:0, top:0, width:1280, height:720 }) }, info:{ render:{ calls:0 } } },
  modules:{ dialog:{ say:o => { said.push(o); return Promise.resolve(); } } },
  sound:{ on:false, tone(){}, sfx:{} },
  bus:{ on:(ev, fn) => { (handlers[ev] ||= []).push(fn); return () => {}; }, emit(){} },
  input:{ keys:{} }, hud:{ setHint(){} }, expose(){}, modes:{ exitInterior(){} },
};

let fail = 0;
for(const id of ['yard', 'chapel', 'skills']){
  const zone = ZONES.find(z => z.id === id);
  const errs = []; const ce = console.error; console.error = (...a) => errs.push(a.map(String).join(' '));
  const { build } = await import(`../src/interiors/${id}.js`);
  const room = await build(ctx, { zone, placeholder(){} });
  ctx.state.interior = room; room.player = { ...room.spawn, speed:0 };
  room.onEnter?.(ctx, room);
  for(let i = 0; i < 60; i++) room.update(1/30, i/30, ctx, room);
  const labels = room.hotspots.map(h => h.label);
  for(const h of room.hotspots){
    room.player.x = h.x; room.player.z = h.z;
    for(let k = 0; k < 2; k++){ room.use(h.label); for(let i = 0; i < 360; i++) room.update(1/30, 2 + k*12 + i/30, ctx, room); }
  }
  // skills: a click on a pin knocks it over, a click on a block hops it
  if(id === 'skills'){
    const click = (v, roomIdx) => {
      room.go(roomIdx); for(let i = 0; i < 90; i++) room.update(1/30, 40 + i/30, ctx, room);
      room.scene.updateMatrixWorld();   // what a rendered frame does before the browser sees the click
      const p = v.clone().project(room.camera);
      for(const f of downs) f({ button:0, clientX:(p.x + 1)/2*1280, clientY:(1 - p.y)/2*720 });
    };
    const pinBody = room.scene.children.find(o => o.isInstancedMesh && o.count === 10 && o.geometry.type === 'LatheGeometry');
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    pinBody.getMatrixAt(0, m); v.setFromMatrixPosition(m).y += 0.4;
    click(v, 0);
    for(let i = 0; i < 15; i++) room.update(1/30, 50 + i/30, ctx, room);
    pinBody.getMatrixAt(0, m); const e = new THREE.Euler().setFromRotationMatrix(m);
    const pinOk = Math.abs(e.x) + Math.abs(e.z) > 0.5;
    for(let i = 0; i < 120; i++) room.update(1/30, 51 + i/30, ctx, room);
    pinBody.getMatrixAt(0, m); const e2 = new THREE.Euler().setFromRotationMatrix(m);
    const pinBack = Math.abs(e2.x) + Math.abs(e2.z) < 0.01;
    // the ray may meet a block in front of the one aimed at, so any block leaving its spot counts
    const blocks = room.scene.children.filter(o => o.isMesh && o.material.map && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.5);
    const ys = blocks.map(o => o.position.y); click(blocks[0].position.clone(), 1);
    for(let i = 0; i < 8; i++) room.update(1/30, 60 + i/30, ctx, room);
    const blockOk = blocks.length === 12 && blocks.some((o, k) => o.position.y > ys[k] + 0.2);
    console.log(`     click: pin falls ${pinOk}, pin stands back ${pinBack}, block hops ${blockOk}`);
    if(!(pinOk && pinBack && blockOk)) errs.push('click-to-knock did not work');
  }
  room.onExit?.(ctx, room);
  console.error = ce;
  // every hotspot must be reachable: the walker (radius 0.38) can stand within 0.5 m of its pad
  const hitsAny = (x, z) => room.colliders.some(c => {
    if(c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) < c.r + 0.38;
    const ca = Math.cos(c.ang || 0), sa = Math.sin(c.ang || 0), dx = x - c.x, dz = z - c.z;
    const lx = dx*ca - dz*sa, lz = dx*sa + dz*ca;
    return Math.hypot(lx - Math.max(-c.hw, Math.min(c.hw, lx)), lz - Math.max(-c.hd, Math.min(c.hd, lz))) < 0.38;
  });
  const ring = [[0, 0], ...Array.from({ length:8 }, (_, k) => [Math.cos(k*Math.PI/4)*0.5, Math.sin(k*Math.PI/4)*0.5])];
  const blocked = room.hotspots.filter(h => ring.every(([ox, oz]) => hitsAny(h.x + ox, h.z + oz))).map(h => h.label);
  const bad = errs.length || blocked.length;
  if(bad) fail++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${id}: ${room.rooms.length} rooms, ${room.hotspots.length} hotspots, ${room.tour.length} tour stops, ${scene.children.length ? '' : ''}${room.scene.children.length} scene children`);
  console.log(`     hotspots: ${labels.join(' | ')}`);
  console.log(`     stops: ${room.tour.map(s => s.title).join(' | ')}`);
  if(blocked.length) console.log(`     pads inside a collider: ${blocked.join(', ')}`);
  for(const e of errs) console.log('     error: ' + e.slice(0, 300));
}
console.log(`dialog lines: ${said.length}   helpers.rng() calls: ${rngCalls}`);
const text = said.flatMap(o => o.lines).join(' ');
if(/\u2014|\u2013/.test(text)){ console.log('FAIL em dash in dialog'); fail++; }
if(rngCalls){ console.log('FAIL rooms called helpers.rng()'); fail++; }
process.exit(fail ? 1 : 0);
