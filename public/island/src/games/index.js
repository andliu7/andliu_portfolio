// Mini-game registry. Loads games/<id>.js for every id in GAME_IDS, each by its own dynamic
// import inside try/catch; a broken game is logged and left out of the list.
//
// A game file exports:
//   meta  = { title, zoneId?, kind:'world'|'arcade' }   zoneId: the zone that launches it, if any
//   setup?(ctx, reg)                                     once at load: world props, stations, minimap layers
//   start(ctx, api) -> { update?(dt, t), stop?(), state?(), debug?(cmd) }
//     api = { id, root, opts, stop(), end(result) }
//   root is the #game-root overlay (pointer-events on its children only). Clean up in stop().
// ui.js is the shared UI kit, not a game. The launch API is documented in CONTRACT.md, GAMES.
export const GAME_IDS = ['race', 'bowling', 'hunt', 'arrow-pusher', 'brush-up', 'fishing', 'tour'];

export async function init(ctx){
  const games = {};
  await Promise.all(GAME_IDS.map(async id => {
    try { games[id] = await import(`./${id}.js`); }
    catch(e){ console.error(`[games] ${id}.js failed to import; skipped`, e); }
  }));

  let active = null, starting = false;
  const api = {
    list: () => GAME_IDS.filter(id => games[id]).map(id => ({ id, ...(games[id].meta || {}) })),
    active: () => active?.id ?? null,
    // start(id, opts?) opts: { onEnd(result), onClose(), skipIntro }  resolves true when running
    async start(id, opts = {}){
      if(starting) return false;
      if(active) api.stop();
      const m = games[id];
      if(typeof m?.start !== 'function'){ console.error(`[games] no game "${id}"`); return false; }
      starting = true;
      const gapi = { id, root: ctx.hud.gameRoot, opts, stop: () => { if(active?.id === id) api.stop(); },
        end(result){ try { opts.onEnd?.(result); } catch(e){ console.error(`[games] ${id} onEnd threw`, e); } ctx.bus.emit('game:end', { id, result }); } };
      try {
        const inst = await m.start(ctx, gapi);
        active = { id, inst: inst || {}, opts };
      } catch(e){ console.error(`[games] ${id}.start threw`, e); active = null; starting = false; return false; }
      starting = false;
      ctx.bus.emit('game:start', { id });
      return true;
    },
    stop(){
      if(!active) return;
      const { id, inst, opts } = active; active = null;
      try { inst.stop?.(); } catch(e){ console.error(`[games] ${id}.stop threw`, e); }
      try { opts?.onClose?.(); } catch(e){ console.error(`[games] ${id} onClose threw`, e); }
      ctx.bus.emit('game:stop', { id });
    },
    state: () => { try { return active ? { id: active.id, ...(active.inst.state?.() || {}) } : null; } catch { return null; } },
    debug: cmd => { try { return active?.inst.debug?.(cmd) ?? null; } catch(e){ console.error('[games] debug threw', e); return null; } },
    best: id => { try { return JSON.parse(localStorage.getItem('island.games.' + id)); } catch { return null; } },
    stations: [],
  };
  api.launch = api.start;

  /* Stations: world pads that open a game's start card when the player rolls onto them. */
  const reg = {
    station(s){ const st = { r: 3, ...s, armed: true }; api.stations.push(st); return st; },
    start: (id, opts) => api.start(id, opts),
    stop: () => api.stop(),
    active: () => api.active(),
  };
  for(const id of GAME_IDS){
    if(typeof games[id]?.setup !== 'function') continue;
    try { await games[id].setup(ctx, reg); }
    catch(e){ console.error(`[games] ${id}.setup threw; its world props are skipped`, e); }
  }

  ctx.onUpdate((dt, t, mode) => {
    if(active?.inst.update){
      try { active.inst.update(dt, t, mode); } catch(e){ console.error(`[games] ${active.id}.update threw; stopping it`, e); api.stop(); }
    }
    if(mode === 'interior' || !ctx.state.started) return;
    const P = ctx.state.player;
    for(const s of api.stations){
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      if(d > s.r + 2.5) s.armed = true;
      else if(d < s.r && s.armed && !active && !starting && (!s.when || s.when(mode))){ s.armed = false; api.start(s.id, { via:'station' }); }
    }
  }, 85);

  ctx.expose('gameState', () => api.state());
  ctx.expose('gameDebug', cmd => api.debug(cmd));
  ctx.expose('launchGame', (id, opts) => api.start(id, opts));
  return api;
}
