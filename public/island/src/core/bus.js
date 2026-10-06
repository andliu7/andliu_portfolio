// Tiny event bus. A throwing listener is logged and skipped so one module cannot break another.
export function createBus(){
  const map = new Map();
  const bus = {
    on(ev, fn){ if(!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return () => map.get(ev)?.delete(fn); },
    once(ev, fn){ const off = bus.on(ev, d => { off(); fn(d); }); return off; },
    off(ev, fn){ map.get(ev)?.delete(fn); },
    emit(ev, data){
      for(const fn of [...(map.get(ev) || [])]){
        try { fn(data); } catch(e){ console.error(`[bus] listener for "${ev}" threw`, e); }
      }
    },
  };
  return bus;
}
