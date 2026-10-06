// The frame loop. Everything per-frame is an ordered hook: fn(dt, t, mode).
// Hooks run in every mode; a hook decides for itself whether it cares about the mode.
// A hook that throws is logged once and removed, so one broken module cannot freeze the page.
//
// Core hook orders (register yours around these):
//   10  car.js / character.js movement (island)       50  physics step + props (island)
//   60  cute characters (island)                      80  interior room.update (interior)
//   90  camera module update (island)                 95  sun follows state.focus (island)
//   97  animated canvas screens, 15 fps (island)      99  HUD card + minimap (island)
export function createLoop(ctx){
  const { renderer, state } = ctx;
  const hooks = [];
  let seq = 0;
  function onUpdate(fn, order = 0){
    const h = { fn, order, seq: seq++ };
    hooks.push(h); hooks.sort((a, b) => a.order - b.order || a.seq - b.seq);
    return () => { const i = hooks.indexOf(h); if(i >= 0) hooks.splice(i, 1); };
  }

  // Fallback camera for a room that brings none.
  const interiorCamera = new ctx.THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.5, 200);
  interiorCamera.position.set(0, 14, 17); interiorCamera.lookAt(0, 1, 0);

  const frames = [];
  function fps(){ const now = performance.now(); while(frames.length && now - frames[0] > 1000) frames.shift(); return frames.length; }

  let last = performance.now(), running = false;
  function frame(now){
    const dt = Math.min(0.033, (now - last)/1000); last = now; const t = now/1000;
    frames.push(now); if(frames.length > 240) frames.shift();
    const mode = state.mode;
    for(const h of hooks.slice()){
      try { h.fn(dt, t, mode); }
      catch(e){ console.error(`[loop] hook (order ${h.order}) threw and was removed`, e); const i = hooks.indexOf(h); if(i >= 0) hooks.splice(i, 1); }
    }
    const room = state.mode === 'interior' ? state.interior : null;
    if(room) renderer.render(room.scene, room.camera || interiorCamera);
    else renderer.render(ctx.scene, ctx.camera);
    requestAnimationFrame(frame);
  }
  function start(){ if(running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

  addEventListener('resize', () => {
    const a = innerWidth/innerHeight;
    for(const cam of [ctx.camera, interiorCamera, state.interior?.camera]){ if(cam?.isPerspectiveCamera){ cam.aspect = a; cam.updateProjectionMatrix(); } }
    renderer.setSize(innerWidth, innerHeight);
    ctx.bus.emit('resize', { width:innerWidth, height:innerHeight });
  });

  return { onUpdate, start, fps, interiorCamera };
}
