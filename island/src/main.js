// Boot. FOUNDATION ONLY: later builders extend through ctx hooks, never by editing this file.
// Every non-core module is loaded with a dynamic import inside try/catch, so one broken file
// logs an error and the rest of the island still runs.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createBus } from './core/bus.js';
import { createState } from './core/state.js';
import { createRenderer } from './core/renderer.js';
import { createPhysics } from './core/physics.js';
import { createHelpers } from './core/helpers.js';
import { createSound } from './core/sound.js';
import { createProps } from './core/props.js';
import { createActors } from './core/actors.js';
import { createInput } from './core/input.js';
import { createModes } from './core/modes.js';
import { createHud } from './core/hud.js';
import { createLoop } from './core/loop.js';

// Module load order is also build order, which matters for the seeded rng (map first).
const MODULES = [
  ['map',        './world/map.js'],
  ['car',        './player/car.js'],
  ['character',  './player/character.js'],
  ['camera',     './camera.js'],
  ['menu',       './ui/menu.js'],
  ['interiors',  './interiors/index.js'],
  ['games',      './games/index.js'],
  ['atmosphere', './world/atmosphere.js'],
  ['garage',     './player/garage.js'],
  ['assist',     './player/assist.js'],
  ['drone',      './player/drone.js'],
  ['pets',       './world/pets.js'],
  ['dialog',     './ui/dialog.js'],
  ['inventory',  './ui/inventory.js'],
  ['voices',     './world/voices.js'],
  ['space',      './space/index.js'],
  ['touch',      './ui/touch.js'],
  ['tracker',    './ui/tracker.js'],
];

const failures = [];
const api = window.__island = { ready:false, failures };

const bus = createBus();
const state = createState(THREE);
const { renderer, scene, camera, sun } = createRenderer(THREE, document.getElementById('stage'));
const physics = createPhysics(CANNON);
const sound = createSound();
const H = createHelpers(THREE, scene);

// Island geometry facts. map.js overrides these; the defaults keep the page usable without it.
const island = {
  radius: 96,
  spawn: { x:0, z:6, heading:Math.PI },
  approachOf(id){ const z = ctx.zones.find(q => q.id === id); if(!z) return null; const [x, zz] = H.frameOf(z).w(0, 13); return { x, z:zz, heading:Math.atan2(z.x - x, z.z - zz) }; },
  doorOf(id){ const z = ctx.zones.find(q => q.id === id); if(!z) return null; const f = H.frameOf(z); const [x, zz] = f.w(0, 10); return { x, z:zz, heading:f.ang }; },
};

const ctx = {
  THREE, CANNON, bus, state, renderer, scene, camera, sun, sound, island,
  world: physics.world, colliders: physics.colliders,
  zones: [],
  modules: {},
};
const props = createProps({ THREE, CANNON, scene, world: physics.world, H, sound, island });
const actors = createActors({ THREE, scene, H, sound, state });
ctx.props = props.props; ctx.chars = actors.chars; ctx.animated = H.animated;
ctx.helpers = Object.assign({}, H, {
  solidBox: physics.solidBox, solidCircle: physics.solidCircle,
  prop: props.prop, crate: props.crate, trafficCone: props.trafficCone,
  eyes: actors.eyes, addChar: actors.addChar, blob: actors.blob, berry: actors.berry, tooth: actors.tooth,
  terrapin: actors.terrapin, robot: actors.robot, brainBuddy: actors.brainBuddy, jolt: actors.jolt,
});
ctx.input = createInput({ state, bus });
const loop = createLoop(ctx);
ctx.onUpdate = loop.onUpdate;
ctx.interiorCamera = loop.interiorCamera;
ctx.modes = createModes(ctx);
ctx.hud = createHud(ctx);
// Builders add their own critic hooks here instead of editing main.js.
ctx.expose = (name, value) => { api[name] = value; };

/* Core per-frame work on the island. */
const onIsland = m => m !== 'interior';
loop.onUpdate((dt, t, m) => { if(!onIsland(m)) return; physics.world.step(1/60, dt, 3); props.step(); }, 50);
loop.onUpdate((dt, t, m) => { if(onIsland(m)) actors.step(dt, t); }, 60);
loop.onUpdate((dt, t, m) => {
  const room = state.interior; if(m !== 'interior' || !room?.update) return;
  try { room.update(dt, t, ctx, room); } catch(e){ console.error(`[interiors] ${room.zoneId}.update threw; disabled`, e); room.update = null; }
}, 80);
loop.onUpdate((dt, t, m) => {
  if(!onIsland(m)) return;
  try { ctx.modules.camera.update(dt, t); }
  catch(e){ console.error('[main] camera.update threw; using the fallback camera', e); ctx.modules.camera = fallbackCamera(); }
}, 90);
loop.onUpdate((dt, t, m) => { if(!onIsland(m)) return; const f = state.focus; sun.position.set(f.x + 22, 42, f.z + 14); sun.target.position.copy(f); }, 95);
let screenClock = 0;
loop.onUpdate((dt, t, m) => {
  if(!onIsland(m)) return;
  screenClock += dt; if(screenClock <= 1/15) return; screenClock = 0;
  for(const s of H.animated){ s.g.clearRect(0,0,s.w,s.h); s.draw(s.g, s.w, s.h, t); s.tex.needsUpdate = true; }
}, 97);
loop.onUpdate((dt, t, m) => { if(onIsland(m)) ctx.hud.update(); }, 99);

async function load(name, path){
  try { return await import(path); }
  catch(e){ failures.push({ name, stage:'import', error:String(e) }); console.error(`[main] ${name} (${path}) failed to import; continuing without it`, e); return null; }
}

/* Fallbacks used only when a module fails. */
function fallbackCamera(){
  const off = new THREE.Vector3(9, 19, 17);
  return { update(){ const P = state.player; state.focus.set(P.x, 0, P.z); camera.position.copy(state.focus).addScaledVector(off, state.zoom); camera.lookAt(state.focus); }, setTarget(){}, setMode(){} };
}

(async () => {
  await Promise.race([Promise.all([document.fonts.load('700 40px Fredoka'), document.fonts.load('500 20px Nunito')]), new Promise(r => setTimeout(r, 2500))]);

  const data = await load('zones', './data/zones.js');
  ctx.zones = Array.isArray(data?.ZONES) ? data.ZONES : [];

  const mods = await Promise.all(MODULES.map(([name, path]) => load(name, path)));
  for(let i = 0; i < MODULES.length; i++){
    const [name] = MODULES[i], mod = mods[i];
    ctx.modules[name] = null;
    if(!mod) continue;
    try { ctx.modules[name] = (await mod.init(ctx)) ?? {}; }
    catch(e){ failures.push({ name, stage:'init', error:String(e) }); console.error(`[main] ${name}.init failed; continuing without it`, e); }
  }
  if(!ctx.modules.camera?.update) ctx.modules.camera = fallbackCamera();

  Object.assign(api, {
    ctx,
    fps: () => loop.fps(),
    mode: () => state.mode,
    teleport: id => ctx.modes.teleport(id),
    enterInterior: id => ctx.modes.enterInterior(id),
    exitInterior: () => ctx.modes.exitInterior(),
    setMode: m => ctx.modes.setMode(m),
    start: (withSound = false) => ctx.hud.begin(!!withSound),
    zones: () => ctx.zones.map(z => z.id),
    player: () => ({ x:state.player.x, z:state.player.z, heading:state.player.heading, speed:state.player.speed }),
    activeZone: () => state.activeZone?.id ?? null,
    interior: () => state.interior?.zoneId ?? null,
    modules: () => Object.fromEntries(Object.entries(ctx.modules).map(([k, v]) => [k, !!v])),
    action: name => ctx.input.trigger(name),        // 'honk' | 'reset' | 'interact' | 'exit' ...
    key: (code, down = true) => ctx.input.press(code, down),
    hold: (code, ms = 500) => new Promise(r => { ctx.input.press(code, true); setTimeout(() => { ctx.input.press(code, false); r(api.player()); }, ms); }),
    games: () => ctx.modules.games?.list() ?? [],
    startGame: id => ctx.modules.games?.start(id) ?? false,
    stopGame: () => ctx.modules.games?.stop(),
    screenshotReady: () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
  });

  // Deep link: andliu.dev opens /island/index.html#<zoneId>; start at that building instead of spawn.
  bus.on('started', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if(id && ctx.zones.some(z => z.id === id)) ctx.modes.teleport(id);
  });

  ctx.hud.loading.textContent = 'Ready.';
  loop.start();
  requestAnimationFrame(() => requestAnimationFrame(() => { api.ready = true; bus.emit('ready'); }));
})();
