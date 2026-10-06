// The secret space world. See SPACE.md for the design, the architecture and the area briefs.
//
// How it runs next to core: space borrows the interior slot. Core already knows how to freeze the
// island (every island hook skips mode 'interior') and render state.interior.scene with
// state.interior.camera, so entering space is enterInterior's bookkeeping done by hand with one
// room object whose scene and camera we swap per area. Nothing in core, character.js or map.js is
// edited:
//   - character.js walks whoever is in a room; here its walker is hidden and its keys are held
//     (see the order 9 / 11 hooks) while our astronaut and controllers do the moving
//   - Esc: core's own exit leaves the room from the station (the islet is where you land, placed
//     in room.onExit); in an area a capture-phase listener takes Esc first and goes to the station
//   - leaving by any route (Esc, the menu, a teleport, a game) runs room.onExit, so you always land
//     on the islet pad, never stranded
import { createKit, AREAS, SHARD_IDS, sanitizeSave, prng } from './kit.js';
import { buildAstronaut, buildWingPad, shardParts } from './models.js';
import { buildIslet, isletGround, ISLET } from './islet.js';

const SAVE = 'island.space';
const AREA_IDS = AREAS.map(a => a.id);

const CSS = `
#space-flash{position:fixed;inset:0;z-index:7;pointer-events:none;background:#fff;opacity:0}
#space-chip{pointer-events:none;display:flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:#15161dd9;color:#fffaf0;
  font:600 14px/1 Fredoka,system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 4px 0 #0000002a}
#space-chip svg{width:20px;height:20px}
#space-chip.pop{animation:space-pop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes space-pop{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
#space-toast{position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top,0px));z-index:6;pointer-events:none;transform:translate(-50%,-10px);opacity:0;
  padding:10px 18px;border-radius:999px;background:#15161de6;color:#ffd166;font:700 16px/1.2 Fredoka,system-ui,sans-serif;white-space:nowrap;
  box-shadow:0 6px 0 #00000033;transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
#space-toast.on{opacity:1;transform:translate(-50%,0)}
#space-prompt{position:fixed;left:0;top:0;z-index:6;pointer-events:none;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;
  background:#1f2a44;color:#fffaf0;font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;
  box-shadow:0 4px 0 #00000026;opacity:0;transform:translate(-50%,-100%) scale(.6);transition:opacity .16s ease,transform .22s cubic-bezier(.3,1.6,.5,1)}
#space-prompt.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
#space-prompt .k{width:22px;height:22px;display:grid;place-items:center;position:relative;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
#space-prompt .k::before{content:"";position:absolute;inset:2px;background:#fffaf0;border-radius:4px;transform:rotate(45deg)}
#space-prompt .k b{position:relative}
@media (prefers-reduced-motion:reduce){#space-toast,#space-prompt{transition:none}#space-chip.pop{animation:none}}`;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill="#ffd166" stroke="#1f2a44" stroke-width="1.5" stroke-linejoin="round"/></svg>';

export async function init(ctx){
  const { THREE, state, bus, input, sound, modes, helpers:H } = ctx;

  /* ---------- save: localStorage 'island.space', always through sanitizeSave ---------- */
  let save = sanitizeSave(null);
  try { save = sanitizeSave(JSON.parse(localStorage.getItem(SAVE) || 'null')); } catch(e){ /* private mode or junk: start fresh */ }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch(e){ /* storage blocked: progress lasts this visit */ } };
  const count = () => SHARD_IDS.filter(id => save.shards.includes(id)).length;

  /* ---------- the hub and area files, each imported on its own so one broken file is contained ---------- */
  const mods = {};
  await Promise.all(['hub', ...AREA_IDS].map(async id => {
    try { mods[id] = await import(id === 'hub' ? './hub.js' : `./areas/${id}.js`); }
    catch(e){ console.error(`[space] ${id} failed to import; the placeholder will be used`, e); }
  }));

  /* ---------- DOM: flash, shard chip, toast, prompt ---------- */
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = (tag, id, parent = document.body) => { const e = document.createElement(tag); e.id = id; parent.appendChild(e); return e; };
  const flashEl = el('div', 'space-flash');
  const chip = document.createElement('div'); chip.id = 'space-chip'; chip.hidden = true; chip.setAttribute('aria-live', 'polite');
  const topRight = document.getElementById('topright');
  if(topRight) topRight.insertBefore(chip, topRight.firstChild); else { chip.style.cssText = 'position:fixed;top:12px;right:12px;z-index:6'; document.body.appendChild(chip); }
  const toastEl = el('div', 'space-toast');
  const promptEl = el('div', 'space-prompt'); promptEl.innerHTML = '<span class="k"><b>F</b></span><span class="t"></span>';
  const promptTxt = promptEl.querySelector('.t');

  function paintChip(pop = false){
    chip.innerHTML = `${STAR}<span>Star shards ${count()}/8</span>`;
    if(pop){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  }
  function showHud(on){
    chip.hidden = !on; if(on) paintChip();
    const map = document.getElementById('map'); if(map) map.style.display = on ? 'none' : '';
    if(!on){ toastEl.classList.remove('on'); toasts.length = 0; }
  }
  const toasts = []; let toastT = -1;
  function toast(text){ if(!text || toasts[toasts.length - 1] === text) return; toasts.push(String(text)); if(toasts.length > 4) toasts.shift(); }
  function stepToast(dt){
    if(toastT > 0){ toastT -= dt; if(toastT <= 0){ toastEl.classList.remove('on'); toastT = -0.001; } return; }
    toastT -= dt;
    if(toasts.length && toastT < -0.3){ toastEl.textContent = toasts.shift(); toastEl.classList.add('on'); toastT = 2.2; }
  }
  let promptShown = '';
  const pv = new THREE.Vector3();
  function showPrompt(text, pos, cam){
    if(!text || !pos || !cam){ if(promptShown){ promptEl.classList.remove('on'); promptShown = ''; } return; }
    if(text !== promptShown){ promptTxt.textContent = text; promptShown = text; }
    pv.copy(pos).project(cam);
    if(pv.z > 1){ promptEl.classList.remove('on'); return; }
    promptEl.style.left = ((pv.x*0.5 + 0.5)*innerWidth).toFixed(1) + 'px';
    promptEl.style.top = ((-pv.y*0.5 + 0.5)*innerHeight).toFixed(1) + 'px';
    promptEl.classList.add('on');
  }

  // The screen flash, stepped per frame so a swap happens exactly when the screen is covered.
  const flash = { a:0, to:0, rate:3, then:null };
  function flashTo(to, color = null, rate = 3, then = null){ if(color) flashEl.style.background = color; flash.to = to; flash.rate = rate; flash.then = then; }
  function stepFlash(dt){
    const rate = flash.rate*(state.reduced ? 5 : 1);
    if(flash.a !== flash.to){
      flash.a = flash.to > flash.a ? Math.min(flash.to, flash.a + dt*rate) : Math.max(flash.to, flash.a - dt*rate);
      flashEl.style.opacity = flash.a.toFixed(3);
    }
    if(flash.a === flash.to && flash.then){ const fn = flash.then; flash.then = null; fn(); }
  }

  /* ---------- sounds (ctx.sound.tone, so the sound toggle silences them) ---------- */
  const tone = (...a) => sound.tone(...a);
  const sfx = {
    hop(){ tone(360, 0.18, 'sine', 0.06, 700); },
    land(){ tone(150, 0.1, 'triangle', 0.05, 90); },
    bump(){ tone(110, 0.12, 'square', 0.04, 70); },
    chime(){ [880, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.24, 'sine', 0.08), i*90)); },
    whoosh(){ tone(200, 1.0, 'sine', 0.06, 900); setTimeout(() => tone(600, 0.6, 'triangle', 0.03, 1400), 250); },
    hiss(){ tone(240, 0.35, 'square', 0.025, 80); setTimeout(() => tone(900, 0.25, 'sine', 0.02, 300), 120); },
  };

  /* ---------- runtime shared with the kit ---------- */
  const parts = shardParts(THREE);
  const drag = { dx:0, dy:0 }, dragOut = { dx:0, dy:0 };
  const rt = {
    keys:{ f:0, s:0, jump:false, jumpPressed:false, boost:false },
    astro:null, player:null, parts, sfx, busy:false,
    building:null, currentId:null,
    shards:[], triggers:[], uses:[], keyFns:[], pads:[],
  };
  const off = (list, x) => () => { const i = list.indexOf(x); if(i >= 0) list.splice(i, 1); };
  Object.assign(rt, {
    areaId: () => rt.building || rt.currentId,
    has: id => save.shards.includes(id),
    flag: n => save.flags[n], setFlag: (n, v) => { save.flags[n] = v; persist(); },
    addShard: s => { rt.shards.push(s); return off(rt.shards, s); },
    addTrigger: t => { t.armed = true; rt.triggers.push(t); return off(rt.triggers, t); },
    addUse: u => { rt.uses.push(u); return off(rt.uses, u); },
    addKey: k => { rt.keyFns.push(k); return off(rt.keyFns, k); },
    takeDrag: () => { dragOut.dx = drag.dx; dragOut.dy = drag.dy; drag.dx = drag.dy = 0; return dragOut; },
    camera: () => room.camera,
    toast, go:(id, o) => go(id, o),
    buildPad: (parent, o) => { const p = buildWingPad(THREE, H, parent, o); rt.pads.push({ pad:p, area:rt.areaId() }); return p; },
  });
  const kit = createKit(ctx, rt);
  const astro = buildAstronaut(THREE, H); rt.astro = astro;

  // The one room object core renders while we are away. Its scene and camera change per area.
  const room = { zoneId:'space', space:true, scene:null, camera:null, spawn:{ x:0, z:0, heading:0 }, exit:null, colliders:[], bounds:null,
    cameraLocked:true, cameraOrbit:false, player:{ x:0, z:0, heading:0, speed:0 }, onExit:() => leftSpace(),
    ownsPlayer:true,                                   // read by the optional character.js patch in SPACE.md
    // read by the optional modes.js patch in SPACE.md: true means "handled, stay in the room"
    onEscape:() => { if(!active) return false; if(rt.busy) return true; if(cur && cur.id !== 'hub'){ go('hub'); return true; } return false; } };

  /* ---------- area registry: built on first visit, cached, a placeholder when anything fails ---------- */
  const areas = {}, pending = {};
  function dropArea(id){ for(const list of [rt.shards, rt.triggers, rt.uses, rt.keyFns, rt.pads]) for(let i = list.length - 1; i >= 0; i--) if(list[i].area === id) list.splice(i, 1); }
  async function buildArea(id){
    let a = null;
    rt.building = id;
    try {
      const m = mods[id];
      if(typeof m?.build === 'function') a = await m.build(ctx, kit);
      if(a && !a.scene?.isScene){ console.error(`[space] ${id}.build returned no THREE.Scene; using the placeholder`); a = null; }
    } catch(e){ console.error(`[space] ${id}.build threw; using the placeholder`, e); a = null; }
    if(!a){
      dropArea(id);                                   // whatever the half-built area registered
      try { a = kit.placeholder(id); } catch(e){ console.error(`[space] placeholder for ${id} failed`, e); rt.building = null; return null; }
    }
    rt.building = null;
    a.id = id;
    a.title = a.title || (id === 'hub' ? 'The Station' : AREAS.find(q => q.id === id)?.title || id);
    if(!a.camera?.isPerspectiveCamera) a.camera = kit.camera();
    areas[id] = a;
    return a;
  }
  function getArea(id){
    if(areas[id]) return Promise.resolve(areas[id]);
    return pending[id] || (pending[id] = buildArea(id).finally(() => { delete pending[id]; }));
  }

  let active = false, cur = null, session = 0, arrive = 0, warp = null, leavingByPad = false;
  const wp = new THREE.Vector3(), centre = new THREE.Vector3();
  const posOf = (t, out) => t.obj ? t.obj.localToWorld(out.copy(t.offset)) : out.copy(t.offset);

  function hideWalker(on){ const g = ctx.modules.character?.group; if(g) g.visible = !on; }
  function hintFor(a){
    if(a?.hint) return a.hint;
    const k = a?.rig?.ctrl?.kind, fp = a?.rig?.view?.allowFp ? ' · <kbd>V</kbd> first person' : '';
    const move = k === 'jetpack' ? '<kbd>WASD</kbd> drift · <kbd>Space</kbd> up · <kbd>Shift</kbd> down' : '<kbd>WASD</kbd> walk · <kbd>Space</kbd> jump · <kbd>Shift</kbd> run';
    return `${move} · <kbd>F</kbd> use${fp} · <kbd>Esc</kbd> station`;
  }
  function setHint(){ if(active && ctx.hud?.hint) ctx.hud.hint.innerHTML = hintFor(cur); }

  function setArea(a, fromId){
    if(cur && cur !== a){ try { cur.onExit?.(ctx, a.id); } catch(e){ console.error(`[space] ${cur.id}.onExit threw`, e); } }
    cur = a; rt.currentId = a.id;
    room.scene = a.scene; room.camera = a.camera;
    a.camera.aspect = innerWidth/innerHeight; a.camera.updateProjectionMatrix();
    a.scene.add(astro.root); astro.lift = 0;
    rt.player = a.rig?.ctrl || null;
    astro.root.visible = !!rt.player && !a.rig?.view?.fp;
    const sp = (fromId && a.spawnFrom?.(fromId)) || a.spawn || { x:0, y:0, z:0, yaw:0 };
    try { rt.player?.place(sp.x, sp.y, sp.z, sp.yaw ?? 0); } catch(e){ console.error(`[space] ${a.id} spawn failed`, e); }
    a.rig?.view?.snap?.();
    a.scene.updateMatrixWorld(true);
    // nothing fires under your feet on arrival: a trigger you start inside waits until you step clear
    const P = rt.player?.pos;
    for(const t of rt.triggers) if(t.area === a.id) t.armed = !P || posOf(t, wp).distanceTo(P) > t.r;
    try { a.onEnter?.(ctx, fromId || null); } catch(e){ console.error(`[space] ${a.id}.onEnter threw`, e); }
    setHint(); toast(a.title);
    bus.emit('space:area', { id:a.id, from:fromId || null });
  }

  /* ---------- in and out ---------- */
  async function enterSpace(){
    if(active) return true;
    const sess = ++session;
    const hub = await getArea('hub');
    if(!hub || sess !== session) return false;
    if(state.mode === 'interior') modes.exitInterior();
    const from = state.mode;
    state.prevMode = from; state.mode = 'interior'; state.interior = room;
    input.clear(); ctx.hud?.showZone?.(null);
    active = true; rt.busy = false; warp = null;
    setArea(hub, null);
    arrive = 1;
    hideWalker(true);
    bus.emit('interior:enter', { zoneId:'space', room });
    bus.emit('mode', { from, to:'interior', zoneId:'space' });
    bus.emit('space:enter', {});
    showHud(true); setHint();                          // after 'mode', which resets the hint line
    return true;
  }
  // room.onExit: core calls it from exitInterior, whoever asked (our pad, Esc, the menu, a game).
  function leftSpace(){
    session++;
    const byPad = leavingByPad; leavingByPad = false;
    try { cur?.onExit?.(ctx, 'island'); } catch(e){ console.error(`[space] ${cur?.id}.onExit threw`, e); }
    cur = null; rt.currentId = null; rt.player = null; rt.busy = false; warp = null; arrive = 0;
    astro.root.parent?.remove(astro.root); astro.lift = 0;
    active = false;
    hideWalker(false); showHud(false); showPrompt('');
    if(state.prevMode === 'walk') modes.placePlayer(ISLET.x, ISLET.z, Math.PI);   // on the pad, facing the island
    padArmed = false;
    if(!byPad){ flash.a = 1; flashEl.style.background = '#ffffff'; flashEl.style.opacity = '1'; flashTo(0, null, 1.6); }
    bus.emit('space:exit', {});
  }
  function go(target, o = {}){
    if(!active || rt.busy) return false;
    if(target === 'island'){ rt.busy = true; warp = { t:0, pad:o.pad || null, flashed:false }; sfx.whoosh(); return true; }
    if(target !== 'hub' && !AREA_IDS.includes(target)){ console.warn(`[space] no area "${target}"`); return false; }
    if(cur?.id === target) return true;
    rt.busy = true; sfx.hiss();
    const sess = session, from = cur?.id;
    flashTo(1, '#0b1030', 4, async () => {
      const a = await getArea(target);
      if(sess !== session || !active) return;
      if(a) setArea(a, from);
      rt.busy = false; flashTo(0, null, 3);
    });
    return true;
  }

  /* ---------- the islet on the island ---------- */
  let islet = null, lift = null, padArmed = true;
  try { islet = buildIslet(ctx); islet.setUnlocked(save.unlocked); }
  catch(e){ console.error('[space] the islet failed to build; space is reachable only through __island.space.enter()', e); }
  // The walker's ground: chain onto map's groundAt hook (character.js reads it first).
  const map = ctx.modules.map;
  if(map && typeof map === 'object'){
    const prev = typeof map.groundAt === 'function' ? map.groundAt : null;
    map.groundAt = (x, z) => { const y = isletGround(x, z); return y !== undefined ? y : prev ? prev.call(map, x, z) : undefined; };
  }
  function startLift(){ if(lift || active) return false; lift = { t:0, flashed:false }; sfx.whoosh(); return true; }
  ctx.onUpdate((dt, t, mode) => {
    if(mode === 'interior' || !islet) return;
    const ch = ctx.modules.character, P = ch?.position;
    let near = 0, d = 99;
    if(P && mode === 'walk'){ d = Math.hypot(P.x - ISLET.x, P.z - ISLET.z); near = Math.max(0, Math.min(1, 1 - (d - 1.5)/8)); if(!padArmed && d > 2.2) padArmed = true; }
    if(lift){
      if(mode !== 'walk' || d > 2.5){ lift = null; }        // moved off by a teleport or a mode change
      else {
        lift.t += dt;
        const k = Math.min(1, lift.t/1.2), e = k*k;            // ease in: a slow start, then up and away
        const g = ch?.group; if(g){ g.position.y += e*3.2; g.rotation.y += lift.t*lift.t*4; }
        if(lift.t > 0.75 && !lift.flashed){
          lift.flashed = true;
          flashTo(1, '#ffffff', 2.6, () => { enterSpace().catch(err => console.error('[space] enter failed', err)).finally(() => { lift = null; flashTo(0, null, 1.4); }); });
        }
      }
    } else if(mode === 'walk' && padArmed && d < 1.05 && state.started && !ch?.swimming?.() && !ctx.modules.drone?.active?.() && !ctx.modules.dialog?.busy?.()) startLift();
    islet.update(dt, t, near, lift ? Math.min(1, lift.t/1.2) : 0);
  }, 72);

  /* ---------- keys: read ours at 9, hide them from the walker at 10, give them back at 11 ---------- */
  const heldCopy = {}; let holding = false;
  ctx.onUpdate((dt, t, mode) => {
    const inSpace = active && mode === 'interior' && state.interior === room;
    holding = inSpace || !!lift;
    const k = input.keys, K = rt.keys;
    const frozen = !inSpace || rt.busy || !!warp || !!ctx.modules.dialog?.busy?.();
    K.f = frozen ? 0 : (k.up ? 1 : 0) - (k.down ? 1 : 0);
    K.s = frozen ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const j = !frozen && k.brake; K.jumpPressed = j && !K.jump; K.jump = j;
    K.boost = !frozen && k.boost;
    if(holding){ Object.assign(heldCopy, k); for(const n in k) k[n] = false; }
  }, 9);
  ctx.onUpdate(() => { if(holding){ Object.assign(input.keys, heldCopy); holding = false; } }, 11);

  /* ---------- the space frame (order 80, where core runs a room's update) ---------- */
  const fxRand = prng(99);
  const BURST = 18, burst = new THREE.InstancedMesh(parts.geo, new THREE.MeshBasicMaterial({ color:'#ffe27a' }), BURST);
  burst.frustumCulled = false; burst.visible = false;
  const bits = Array.from({ length:BURST }, () => ({ life:0, p:new THREE.Vector3(), v:new THREE.Vector3() }));
  const o3 = new THREE.Object3D();
  function spawnBurst(at){
    if(cur) cur.scene.add(burst);
    for(const b of bits){ b.life = 0.6 + fxRand()*0.4; b.p.copy(at); b.v.set(fxRand() - 0.5, fxRand() - 0.5, fxRand() - 0.5).normalize().multiplyScalar(3 + fxRand()*3); }
    burst.visible = true;
  }
  function stepBurst(dt){
    if(!burst.visible) return;
    let alive = 0;
    bits.forEach((b, i) => {
      if(b.life > 0){ b.life -= dt; b.p.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-dt*2.5)); }
      const on = b.life > 0; if(on) alive++;
      o3.position.copy(b.p); o3.rotation.set(b.life*9, b.life*7, 0); o3.scale.setScalar(on ? 0.2 + b.life*0.5 : 0); o3.updateMatrix(); burst.setMatrixAt(i, o3.matrix);
    });
    burst.instanceMatrix.needsUpdate = true;
    if(!alive) burst.visible = false;
  }
  function collect(s){
    s.taken = true; s.obj.visible = false;
    spawnBurst(s.obj.getWorldPosition(wp)); sfx.chime();
    if(!save.shards.includes(s.id)){ save.shards.push(s.id); persist(); }
    const n = count(); paintChip(true);
    toast(`Star shard ${n} of 8`);
    bus.emit('space:shard', { id:s.id, count:n });
    if(n >= 8 && !save.unlocked) unlock();
  }
  function unlock(){
    save.unlocked = true; persist();
    islet?.setUnlocked(true);
    if(!save.flags.starmap){
      let ok = false;
      try { ok = !!ctx.modules.inventory?.add?.({ id:'star-map', name:'Star Map', icon:'page', desc:'All eight star shards, found. A wing of stars now shines over the secret islet at night.' }); }
      catch(e){ console.error('[space] star map gift failed', e); }
      if(ok || !ctx.modules.inventory){ save.flags.starmap = true; persist(); }
    }
    toast('All eight! A wing of stars now shines over the islet at night.');
    bus.emit('space:unlock', {});
  }

  let nearUse = null;
  function stepSpace(dt, t){
    hideWalker(true);
    if(cur.rig){ try { cur.rig.update(dt); } catch(e){ console.error(`[space] ${cur.id} controller threw; frozen`, e); cur.rig = null; rt.player = null; } }
    if(typeof cur.update === 'function'){ try { cur.update(dt, t, ctx); } catch(e){ console.error(`[space] ${cur.id}.update threw; disabled`, e); cur.update = null; } }
    rt.player = cur.rig?.ctrl || null;                // an area may swap area.rig at any time (walk / drive a rover)
    const P = rt.player;
    if(arrive > 0){ arrive = Math.max(0, arrive - dt*1.3); astro.lift = arrive*arrive*2.6; }
    for(const q of rt.pads) if(q.area === cur.id && q.pad !== warp?.pad) q.pad.flap(t, 0.06), q.pad.setGlow(0.7 + Math.sin(t*2)*0.15);
    if(warp){
      warp.t += dt;
      const k = Math.min(1, warp.t/1.1); astro.lift = k*k*3;
      warp.pad?.flap(t, 1); warp.pad?.setGlow(1);
      if(P) P.fwd.applyAxisAngle(P.up, dt*(2 + warp.t*8));
      if(warp.t > 0.6 && !warp.flashed){ warp.flashed = true; flashTo(1, '#ffffff', 2.6, () => { leavingByPad = true; modes.exitInterior(); flashTo(0, null, 1.6); }); }
    }
    nearUse = null;
    if(P){
      room.player.x = P.pos.x; room.player.z = P.pos.z; room.player.heading = Math.atan2(P.fwd.x, P.fwd.z); room.player.speed = P.speed;
      centre.copy(P.pos).addScaledVector(P.up, 0.9);
      for(const s of rt.shards){
        if(s.area !== cur.id || s.taken) continue;
        s.mesh.rotation.y += dt*1.6; s.mesh.position.y = Math.sin(t*2 + s.seed)*0.12;
        if(!rt.busy && s.obj.getWorldPosition(wp).distanceTo(centre) < 1.5) collect(s);
      }
      if(!rt.busy){
        for(const tr of rt.triggers){
          if(tr.area !== cur.id) continue;
          const d = posOf(tr, wp).distanceTo(P.pos), r = tr.r + (tr.needGround && P.kind === 'jetpack' ? 0.4 : 0);
          if(!tr.armed){ if(d > r + 0.6) tr.armed = true; continue; }
          if(d < r && (!tr.needGround || P.grounded || P.kind === 'jetpack')){
            tr.armed = false;
            try { tr.onEnter(); } catch(e){ console.error('[space] trigger threw', e); }
            if(rt.busy) break;
          }
        }
        let best = 1e9;
        for(const u of rt.uses){ if(u.area !== cur.id) continue; const d = posOf(u, wp).distanceTo(P.pos); if(d < u.r && d < best){ best = d; nearUse = u; } }
      }
    }
    stepBurst(dt);
    const busyDlg = !!ctx.modules.dialog?.busy?.();
    if(nearUse && !busyDlg && !rt.busy){ posOf(nearUse, wp).addScaledVector(P.up, 2.5); showPrompt(nearUse.label, wp, room.camera); }
    else showPrompt('');
  }
  ctx.onUpdate((dt, t, mode) => {
    if(!active || mode !== 'interior' || state.interior !== room || !cur) return;
    try { stepSpace(dt, t); } catch(e){ console.error('[space] frame failed', e); }
  }, 80);
  // flash and toasts run in every mode (the flash spans the island and space)
  ctx.onUpdate(dt => { stepFlash(dt); stepToast(dt); }, 96);

  /* ---------- keys and pointer ---------- */
  const use = u => { try { u.onUse(); } catch(e){ console.error('[space] use threw', e); } };
  input.on('interact', () => { if(active && !rt.busy && nearUse && !ctx.modules.dialog?.busy?.()) use(nearUse); });
  bus.on('key', e => {
    if(!active || rt.busy || !cur || !e.down) return;
    if(e.code === 'KeyC' && !e.repeat && nearUse?.talk && !ctx.modules.dialog?.busy?.()) use(nearUse);
    if(e.code === 'KeyV' && !e.repeat && cur.rig?.view){ cur.rig.view.toggleFp(); setHint(); }
    for(const k of rt.keyFns) if(k.area === cur.id && k.code === e.code){ try { k.fn(e); } catch(err){ console.error('[space] key handler threw', err); } }
  });
  // Esc in an area goes to the station. Taken before core's input sees it (capture phase on window,
  // the same way the tour and the talk box take keys). In the station, Esc falls through to core,
  // which leaves the room, and leftSpace() lands you on the islet.
  addEventListener('keydown', e => {
    if(!active || e.repeat || e.defaultPrevented) return;
    if(!(e.code === 'Escape' || e.key === 'Escape' || e.key === 'Esc')) return;
    if(ctx.modules.dialog?.busy?.() || ctx.modules.menu?.isOpen?.() || ctx.modules.inventory?.isOpen?.() || ctx.modules.tracker?.isOpen?.()) return;
    if(rt.busy){ e.stopPropagation(); e.preventDefault(); return; }
    if(cur && cur.id !== 'hub'){ e.stopPropagation(); e.preventDefault(); go('hub'); }
  }, true);
  let dragging = null;
  ctx.renderer.domElement.addEventListener('pointerdown', e => { if(active && e.button === 0) dragging = { x:e.clientX, y:e.clientY }; });
  addEventListener('pointermove', e => { if(!dragging || !active) return; drag.dx += e.clientX - dragging.x; drag.dy += e.clientY - dragging.y; dragging.x = e.clientX; dragging.y = e.clientY; });
  addEventListener('pointerup', () => { dragging = null; });
  addEventListener('pointercancel', () => { dragging = null; });

  /* ---------- API and critic hooks ---------- */
  const api = {
    enter: () => enterSpace(),                          // straight to the station, no lift
    leave: () => active ? modes.exitInterior() : false,
    go: id => go(id),
    active: () => active,
    area: () => cur?.id ?? null,
    shards: () => count(),
    collected: () => save.shards.slice(),
    unlocked: () => save.unlocked,
    islet: { x:ISLET.x, z:ISLET.z, r:ISLET.edge },
    kit,
  };
  ctx.expose('space', Object.assign({}, api, {
    state: () => {
      const P = rt.player;
      return { active, area:cur?.id ?? null, busy:rt.busy, shards:count(), unlocked:save.unlocked, lifting:!!lift, padArmed,
        player:P ? { kind:P.kind, x:+P.pos.x.toFixed(2), y:+P.pos.y.toFixed(2), z:+P.pos.z.toFixed(2), grounded:P.grounded, fp:!!cur?.rig?.view?.fp } : null,
        imported:Object.keys(mods), built:Object.keys(areas), placeholders:Object.values(areas).filter(a => a.placeholder).map(a => a.id), near:nearUse?.label ?? null };
    },
    // on foot, 4 m north of the pad, facing it
    toIslet(){
      if(state.mode === 'interior') modes.exitInterior();
      if(state.mode !== 'walk') modes.setMode('walk');
      modes.placePlayer(ISLET.x, ISLET.z - 4, 0); padArmed = true; return true;
    },
    lift: () => startLift(),
    // put the player next to a shard (debug), or collect it outright with take = true
    shard(id, take = false){
      const s = rt.shards.find(q => q.id === id); if(!s || s.taken) return false;
      if(take || !active || s.area !== cur?.id){ if(take) collect(s); return !!take; }
      const P = rt.player; if(!P) return false;
      const w = s.obj.getWorldPosition(new THREE.Vector3());
      if(P.center) P.up.copy(w).sub(P.center).normalize();       // on a planet, "under the shard" is along its own normal
      P.pos.copy(w).addScaledVector(P.up, -0.9); P.vel.set(0, 0, 0); P.grounded = false;   // airborne, so no snap back to the floor first
      return true;
    },
    reset(){ save = sanitizeSave(null); persist(); for(const s of rt.shards){ s.taken = false; s.obj.visible = true; } islet?.setUnlocked(false); paintChip(); return true; },
  }));
  return api;
}
