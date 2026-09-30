// Mode state machine: 'drive' | 'walk' on the island, 'interior' inside a room.
// An interior is its own THREE.Scene. While inside, the island is frozen (no physics, no
// island hooks) and resumes exactly where it was on exit.
export const MODES = ['drive', 'walk', 'interior'];

export function createModes(ctx){
  const { state, bus } = ctx;
  const players = {};   // mode -> { placeAt(x, z, heading) }, registered by car.js / character.js

  function registerPlayer(mode, api){ players[mode] = api; }
  function islandMode(){ return state.mode === 'interior' ? state.prevMode : state.mode; }

  // Put whoever is the player in the current island mode at (x, z) facing heading.
  function placePlayer(x, z, heading){
    const P = state.player; P.x = x; P.z = z; P.heading = heading; P.speed = 0;
    try { players[islandMode()]?.placeAt(x, z, heading); } catch(e){ console.error('[modes] placeAt failed', e); }
  }

  function setMode(mode){
    if(!MODES.includes(mode)){ console.error(`[modes] unknown mode "${mode}"`); return false; }
    if(mode === 'interior'){ console.error('[modes] use enterInterior(zoneId) to enter an interior'); return false; }
    if(state.mode === 'interior'){ state.prevMode = mode; return exitInterior(); }
    const from = state.mode; if(from === mode) return true;
    if(!players[mode]) console.warn(`[modes] no player registered for "${mode}" yet`);
    state.mode = mode; ctx.input.clear();
    bus.emit('mode', { from, to:mode });
    return true;
  }

  async function enterInterior(zoneId){
    const zone = ctx.zones.find(z => z.id === zoneId);
    if(!zone){ console.error(`[modes] no zone "${zoneId}"`); return false; }
    if(state.mode === 'interior'){ if(state.interior?.zoneId === zoneId) return true; exitInterior(); }
    const reg = ctx.modules.interiors;
    if(!reg){ console.error('[modes] interiors module is not loaded'); return false; }
    let room = null;
    try { room = await reg.get(zoneId); } catch(e){ console.error(`[modes] interior "${zoneId}" failed`, e); }
    if(!room?.scene) return false;
    const from = state.mode;
    state.prevMode = from; state.mode = 'interior'; state.interior = room;
    ctx.input.clear();
    ctx.hud?.showZone(null);
    const sp = room.spawn || { x:0, z:0, heading:Math.PI };
    if(room.camera?.isPerspectiveCamera){ room.camera.aspect = innerWidth/innerHeight; room.camera.updateProjectionMatrix(); }
    room.player = { x:sp.x, z:sp.z, heading:sp.heading, speed:0 };
    try { room.onEnter?.(ctx, room); } catch(e){ console.error(`[interiors] ${zoneId}.onEnter threw`, e); }
    bus.emit('interior:enter', { zoneId, room });
    bus.emit('mode', { from, to:'interior', zoneId });
    return true;
  }

  function exitInterior(){
    if(state.mode !== 'interior') return false;
    const room = state.interior, zoneId = room.zoneId;
    try { room.onExit?.(ctx, room); } catch(e){ console.error(`[interiors] ${zoneId}.onExit threw`, e); }
    state.mode = state.prevMode; state.interior = null;
    ctx.input.clear();
    const door = ctx.island.doorOf(zoneId);
    if(door) placePlayer(door.x, door.z, door.heading);
    bus.emit('interior:exit', { zoneId, door });
    bus.emit('mode', { from:'interior', to:state.mode, zoneId });
    return true;
  }

  // Move the player to a zone's approach point ('spawn' for the plaza). Leaves any interior first.
  function teleport(zoneId){
    if(state.mode === 'interior') exitInterior();
    const p = zoneId === 'spawn' ? ctx.island.spawn : ctx.island.approachOf(zoneId);
    if(!p){ console.error(`[modes] cannot teleport to "${zoneId}"`); return false; }
    placePlayer(p.x, p.z, p.heading);
    bus.emit('teleport', { zoneId, x:p.x, z:p.z });
    return true;
  }

  // Core bindings: Esc leaves an interior, R resets on the island.
  bus.on('action:exit', () => { if(state.mode === 'interior') exitInterior(); });
  bus.on('action:reset', () => { if(state.mode !== 'interior') teleport('spawn'); });

  return { MODES, registerPlayer, players, placePlayer, setMode, enterInterior, exitInterior, teleport, islandMode };
}
