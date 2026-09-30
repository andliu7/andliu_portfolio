// Pets: walk up to a blueberry and press F to adopt it. Up to five follow you in a little line,
// hopping along your own footsteps (so they go where you could go), keep a polite gap, pop back
// in beside you after a drive or a teleport, paddle when the path crosses water, and look around,
// sit, then doze with a Zzz when you stand still. F on a pet gives a heart and a short line.
// Robots refuse: F on one lights a screen face that goes angry, neutral, then happy, and it stays.
//
// Why pets become `static` characters: core's character sim skips static ones, so this module is
// the only writer of an adopted berry's position, squash and yaw, and nothing fights over it.

const MAX = 5, REACH = 2.4, ROBOT_REACH = 3, KEY = 'island.pets';
const NAME_A = ['Pip', 'Mochi', 'Bloop', 'Juni', 'Dot', 'Blu', 'Tofu', 'Nib', 'Poppy', 'Bean', 'Momo', 'Bibi', 'Plum', 'Sprout'];
const NAME_B = ['', '', 'kin', 'let', 'bo', 'bun', 'y'];
const PET_LINES = [
  n => `${n} does a happy wiggle.`,
  n => `${n} bounces twice. That means thank you.`,
  n => `${n} leans on your leg and hums.`,
  n => `${n} would follow you anywhere. Even into the lake.`,
  n => `${n} blinks slowly. Berry for "I like you".`,
  n => `${n} looks very proud to be here.`,
];

// Small seeded stream so names never touch the island's shared rng.
function prng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// helpers.berry and helpers.robot leave no type tag, so tell them apart by their first meshes.
const geo = (c, i) => c.g?.children?.[i]?.geometry;
const isBerry = c => !!c?.g && geo(c, 0)?.type === 'SphereGeometry' && geo(c, 0).parameters.radius === 0.6 && geo(c, 1)?.type === 'ConeGeometry';
const isRobot = c => !!c?.g && c.face === false && geo(c, 0)?.type === 'BoxGeometry' && geo(c, 0).parameters.width === 0.62 && geo(c, 1)?.parameters?.width === 0.8;

const CSS = `
#pet-prompt{position:fixed;left:0;top:0;z-index:6;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:0;border-radius:999px;background:#1f2a44;color:#fffaf0;
  font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap;box-shadow:0 4px 0 #00000026;cursor:pointer;touch-action:manipulation;
  opacity:0;pointer-events:none;transform:translate(-50%,-100%) scale(.6);transition:opacity .16s ease,transform .22s cubic-bezier(.3,1.6,.5,1)}
#pet-prompt.on{opacity:1;pointer-events:auto;transform:translate(-50%,-100%) scale(1)}
#pet-prompt .k{width:22px;height:22px;display:grid;place-items:center;position:relative;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#1f2a44}
#pet-prompt .k::before{content:"";position:absolute;inset:2px;background:#ff8fab;border-radius:4px;transform:rotate(45deg)}
#pet-prompt .k b{position:relative}
@media (prefers-reduced-motion:reduce){#pet-prompt{transition:none}}`;

export function init(ctx){
  const { THREE, state, bus, sound, helpers: H } = ctx;
  const pets = [];            // { c, name, tag, zzz, slot, hop, idle, pop, wet }
  const robots = new Map();   // char -> { tex, mesh, mood, t }
  let born = 0;               // adoptions ever, seeds the next name

  /* ---------- shared sprites: hearts pool and the Zzz texture ---------- */
  const heartTex = H.canvasTex(64, 64, g => {
    g.fillStyle = '#ff5c8a'; g.strokeStyle = '#fffaf0'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 8, 8, 32, 20); g.bezierCurveTo(56, 8, 60, 34, 32, 54); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(21, 23, 5, 3.5, -0.6, 0, 7); g.fill();
  }).tex;
  const hearts = [];
  for(let i = 0; i < 6; i++){
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.visible = false; s.renderOrder = 6; ctx.scene.add(s); hearts.push({ s, t: 1 });
  }
  function heart(x, y, z, big = 1){
    const h = hearts.find(q => q.t >= 1) || hearts[0];
    h.t = 0; h.big = big; h.x = x; h.y = y; h.z = z; h.s.visible = true;
  }
  const zzzTex = H.canvasTex(96, 64, g => {
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#1f2a44'; g.lineWidth = 5; g.lineJoin = 'round'; g.textBaseline = 'middle';
    for(const [ch, x, y, sz] of [['z', 10, 46, 22], ['z', 36, 32, 30], ['Z', 62, 18, 36]]){ H.F(g, 700, sz); g.strokeText(ch, x, y); g.fillText(ch, x, y); }
  }).tex;

  /* ---------- sounds (the toggle silences ctx.sound.tone) ---------- */
  const chime = () => { try { [660, 880, 1175].forEach((f, i) => setTimeout(() => sound.tone(f, 0.16, 'triangle', 0.08, f*1.04), i*80)); } catch {} };
  const squeak = () => { try { sound.tone(900, 0.12, 'sine', 0.07, 1300); } catch {} };
  const huff = () => { try { sound.tone(170, 0.28, 'sawtooth', 0.05, 95); setTimeout(() => sound.tone(140, 0.22, 'square', 0.03, 80), 120); } catch {} };
  const beep = up => { try { sound.tone(up ? 620 : 440, 0.1, 'square', 0.03, up ? 900 : 440); } catch {} };

  /* ---------- names, tags, persistence ---------- */
  function nameFor(n){
    const r = prng(0xbe44 + n*7919), taken = new Set(pets.map(p => p.name));
    for(let k = 0; k < 20; k++){ const s = NAME_A[Math.floor(r()*NAME_A.length)] + NAME_B[Math.floor(r()*NAME_B.length)]; if(!taken.has(s)) return s; }
    return 'Berry ' + (n + 1);
  }
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify({ count: pets.length, born, pets: pets.map(p => ({ i: ctx.chars.indexOf(p.c), name: p.name })) })); } catch {}
  }
  function load(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }

  /* ---------- the follow trail: the player's own footsteps, newest first ---------- */
  const trail = [];
  function resetTrail(){
    const P = state.player; trail.length = 0;
    // seed a straight line behind the player so the slots exist straight away
    for(let k = 0; k < 60; k++) trail.push({ x: P.x - Math.sin(P.heading)*k*0.25, z: P.z - Math.cos(P.heading)*k*0.25 });
  }
  function recordTrail(){
    const P = state.player, a = trail[0];
    if(!a){ resetTrail(); return; }
    const d = Math.hypot(P.x - a.x, P.z - a.z);
    if(d > 8){ resetTrail(); respawnAll(); return; }   // a teleport or a room exit: start a new line
    if(d > 0.25){ trail.unshift({ x: P.x, z: P.z }); if(trail.length > 90) trail.length = 90; }
  }
  // The point `dist` metres back along the trail.
  function along(dist){
    const P = state.player; let px = P.x, pz = P.z, acc = 0;
    for(const q of trail){ const s = Math.hypot(q.x - px, q.z - pz); if(acc + s >= dist){ const f = s ? (dist - acc)/s : 0; return { x: px + (q.x - px)*f, z: pz + (q.z - pz)*f }; } acc += s; px = q.x; pz = q.z; }
    return { x: px, z: pz };
  }
  const slotDist = i => (state.mode === 'drive' ? 3.4 : 1.5) + i*1.5;

  function respawnAll(){
    pets.forEach((p, i) => { const s = along(slotDist(i)); p.c.x = s.x + (i % 2 ? 0.3 : -0.3); p.c.z = s.z; p.c.y = 1.4; p.c.vy = 0; p.pop = 0; });
  }

  /* ---------- adopt ---------- */
  function adopt(c, quiet = false){
    if(!isBerry(c) || pets.some(p => p.c === c)) return false;
    if(pets.length >= MAX){
      if(!quiet){ squeak(); ctx.modules.dialog?.say?.({ name: 'Blueberry', portrait: 'berry', lines: ['Your line is full: five berries is plenty of berry.'] })?.catch?.(() => {}); }
      return false;
    }
    const name = nameFor(born++);
    c.static = true; c.wander = null; c.target = null;
    const tag = H.label(name, '#fffaf0', '#26306b');
    tag.scale.set(1.35, 0.38, 1); tag.position.set(0, 1.85, 0); tag.renderOrder = 5; tag.material.depthWrite = false; c.g.add(tag);
    const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex, transparent: true, depthWrite: false }));
    zzz.scale.set(0.75, 0.5, 1); zzz.position.set(0.55, 1.45, 0); zzz.visible = false; c.g.add(zzz);
    const p = { c, name, tag, zzz, hop: 0, idle: 0, pop: quiet ? 1 : 0, wet: false, look: Math.random()*6 };
    pets.push(p); save();
    if(!quiet){
      heart(c.x, 1.7, c.z, 1.3); chime(); c.vy = 6;
      bus.emit('pets', { pets: api.pets() });
    }
    return true;
  }

  function pat(p){
    heart(p.c.x, 1.7, p.c.z); squeak(); if(p.c.y <= 0.01 && !p.wet) p.c.vy = 5; p.idle = 0;
    const line = PET_LINES[Math.floor(Math.random()*PET_LINES.length)](p.name);
    ctx.modules.dialog?.say?.({ name: p.name, portrait: 'berry', lines: [line] })?.catch?.(() => {});
  }

  /* ---------- robots: a screen face drawn on a canvas, only for robots you touch ---------- */
  function drawFace(g, w, h, mood){
    const angry = mood === 'angry', happy = mood === 'happy';
    g.fillStyle = angry ? '#5a1622' : '#1f2a44'; g.fillRect(0, 0, w, h);
    g.fillStyle = angry ? '#ff5d6c' : '#5ff0e0'; g.strokeStyle = g.fillStyle; g.lineWidth = 9; g.lineCap = 'round';
    for(const s of [-1, 1]){
      const cx = w/2 + s*30, cy = h*0.42;
      if(happy){ g.beginPath(); g.arc(cx, cy + 8, 13, Math.PI*1.1, Math.PI*1.9); g.stroke(); }
      else if(angry){
        g.fillRect(cx - 11, cy - 4, 22, 14);
        g.beginPath(); g.moveTo(cx - s*18, cy - 18); g.lineTo(cx + s*14, cy - 7); g.stroke();   // brows slant down toward the middle
      } else g.fillRect(cx - 11, cy - 10, 22, 20);
    }
    g.beginPath();
    if(happy) g.arc(w/2, h*0.62, 16, Math.PI*0.15, Math.PI*0.85);
    else if(angry) g.arc(w/2, h*0.9, 16, Math.PI*1.2, Math.PI*1.8);
    else { g.moveTo(w/2 - 14, h*0.74); g.lineTo(w/2 + 14, h*0.74); }
    g.stroke();
    // scanlines keep it reading as a screen, not a sticker
    g.fillStyle = '#00000022'; for(let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
  }
  function faceOf(c){
    let r = robots.get(c); if(r) return r;
    const t = H.canvasTex(128, 80, (g, w, h) => drawFace(g, w, h, 'neutral'));
    // unlit so the face glows like a screen at night and never goes muddy in shade
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshBasicMaterial({ map: t.tex, toneMapped: false }));
    m.position.set(0, 1.03, 0.385); c.g.add(m);
    r = { t, mesh: m, mood: 'neutral', clock: 99, friend: false }; robots.set(c, r); return r;
  }
  function setMood(r, mood){ if(r.mood === mood) return; r.mood = mood; r.t.g.clearRect(0, 0, 128, 80); drawFace(r.t.g, 128, 80, mood); r.t.tex.needsUpdate = true; }
  function poke(c){
    const r = faceOf(c), P = state.player;
    c.yaw = Math.atan2(P.x - c.x, P.z - c.z); c.pause = 3.6;
    if(r.friend){
      r.clock = 1.5; setMood(r, 'happy'); beep(true); heart(c.x, 2, c.z, 0.8);
      ctx.modules.dialog?.say?.({ name: 'Robot', portrait: 'robot', lines: ['Friends. Still not a pet. Beep.'] })?.catch?.(() => {});
      return;
    }
    r.clock = 0; setMood(r, 'angry'); huff(); c.vy = 3.5;
    ctx.modules.dialog?.say?.({ name: 'Robot', portrait: 'robot', lines: ['HUFF. Robots are not pets.', '...Fine. We can be friends.'] })?.catch?.(() => {});
  }

  /* ---------- who is in reach of F ---------- */
  function target(){
    if(!state.started || state.mode !== 'walk') return null;
    const P = state.player; let best = null, bd = 1e9;
    for(const c of ctx.chars){
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      if(d >= bd) continue;
      const pet = pets.find(p => p.c === c);
      if(pet && d < REACH){ best = { kind: 'pet', c, pet }; bd = d; }
      else if(!pet && d < REACH && isBerry(c)){ best = { kind: 'berry', c }; bd = d; }
      else if(d < ROBOT_REACH && isRobot(c)){ best = { kind: 'robot', c }; bd = d; }
    }
    return best ? Object.assign(best, { dist: bd }) : null;
  }
  // F goes to a pickup first (inventory owns those) and never fires while a dialog is up.
  const blocked = () => !!ctx.modules.dialog?.busy?.() || !!ctx.modules.inventory?.nearest?.();
  function interact(){
    if(blocked()) return false;
    const h = target(); if(!h) return false;
    if(h.kind === 'berry') adopt(h.c);
    else if(h.kind === 'pet') pat(h.pet);
    else poke(h.c);
    return true;
  }
  // Listen to both the interact action and raw KeyF until input.js maps F; the debounce stops a double fire.
  let lastF = 0;
  const onF = () => { const n = performance.now(); if(n - lastF < 150) return; lastF = n; interact(); };
  bus.on('action:interact', onF);
  bus.on('key', ({ code, down, repeat }) => { if(code === 'KeyF' && down && !repeat) onF(); });

  /* ---------- prompt pill over whoever F would reach ---------- */
  const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
  const prompt = document.createElement('button'); prompt.type = 'button'; prompt.id = 'pet-prompt';
  prompt.innerHTML = '<span class="k"><b>F</b></span><span class="lbl"></span>'; document.body.append(prompt);
  prompt.addEventListener('click', () => { interact(); ctx.renderer.domElement.focus?.({ preventScroll: true }); });
  const lbl = prompt.querySelector('.lbl'), wp = new THREE.Vector3();
  let promptKey = '';
  function updatePrompt(){
    const h = (state.mode === 'walk' && !blocked()) ? target() : null;
    if(!h){ if(promptKey){ promptKey = ''; prompt.classList.remove('on'); } return; }
    const text = h.kind === 'pet' ? `Pet ${h.pet.name}` : h.kind === 'berry' ? (pets.length >= MAX ? 'Line is full' : 'Adopt') : 'Say hi';
    if(text !== promptKey){ promptKey = text; lbl.textContent = text; prompt.classList.add('on'); }
    wp.set(h.c.g.position.x, h.c.g.position.y + (h.kind === 'pet' ? 2.3 : 2), h.c.g.position.z).project(ctx.camera);
    prompt.style.left = `${(wp.x*0.5 + 0.5)*innerWidth}px`; prompt.style.top = `${(-wp.y*0.5 + 0.5)*innerHeight}px`;
  }

  /* ---------- per frame ---------- */
  const Lay = () => ctx.modules.map?.layout;
  const wetAt = (x, z) => { const L = Lay(); return !!L?.landAt && !L.landAt(x, z) && !((L.roadDistAt?.(x, z) ?? 9) < 4.5); };
  let still = 0, broken = false;

  function stepPets(dt, t){
    const P = state.player, moving = Math.abs(P.speed || 0) > 0.3, R = state.reduced;
    still = moving ? 0 : still + dt;
    recordTrail();
    pets.forEach((p, i) => {
      const c = p.c, s = along(slotDist(i));
      let dx = s.x - c.x, dz = s.z - c.z, d = Math.hypot(dx, dz);
      const far = Math.hypot(P.x - c.x, P.z - c.z);
      // left far behind: once the player slows (or is very far), pop back in on the line
      if(far > 14 && (Math.abs(P.speed || 0) < 4 || far > 40)){ c.x = s.x; c.z = s.z; c.y = 1.4; c.vy = 0; p.pop = 0; d = 0; }
      if(d > 0.12){
        const v = Math.min(Math.max(2.8, d*3.2), 12)*dt, k = Math.min(1, v/d);
        c.x += dx*k; c.z += dz*k;
        c.yaw = H.lerpAngle(c.yaw, Math.atan2(dx, dz), Math.min(1, dt*10));
        p.idle = 0;
      } else p.idle += dt;
      p.wet = wetAt(c.x, c.z);
      const walking = d > 0.12;
      // gravity for pops and pat hops; swimming floats instead
      if(c.vy !== 0 || c.y > 0){ c.vy -= 24*dt; c.y += c.vy*dt; if(c.y <= 0){ c.y = 0; c.vy = 0; } }
      let y = c.y, sx = 1, sy = 1, lean = 0;
      if(p.wet){
        c.y = 0; c.vy = 0;
        y = -0.5 + (R ? 0 : Math.sin(t*3 + i)*0.05);
        lean = walking ? 0.25 : 0;                                      // leans into the paddle
      } else if(walking && !R){
        p.hop += dt*11; const hp = Math.abs(Math.sin(p.hop));
        y += hp*0.38; sy = 1 - (1 - hp)*0.12; sx = 1 + (1 - hp)*0.07;   // squash on each landing
      } else {
        // idle: face the player and look around, then sit, then sleep once you have been still a while
        const zz = still > 9 + i*0.8, sit = still > 3.5 + i*0.4;
        const face = Math.atan2(P.x - c.x, P.z - c.z) + (zz ? 0 : Math.sin(t*0.9 + p.look)*0.7);
        c.yaw = H.lerpAngle(c.yaw, face, Math.min(1, dt*3));
        if(sit){ sy = zz ? 0.8 + (R ? 0 : Math.sin(t*2 + i)*0.03) : 0.86; sx = zz ? 1.12 : 1.08; }
        else if(!R){ const b = Math.abs(Math.sin(t*3.6 + p.look))*0.08; y += b; sy = 1 - b*0.3; }
      }
      p.zzz.visible = !p.wet && still > 9 + i*0.8 && !walking;
      if(p.zzz.visible){ p.zzz.position.y = 1.45 + (R ? 0 : ((t*0.6 + i*0.3) % 1)*0.25); p.zzz.material.opacity = R ? 1 : 1 - ((t*0.6 + i*0.3) % 1)*0.6; }
      // the tag pops in when adopted
      if(p.pop < 1){ p.pop = Math.min(1, p.pop + dt*3); const e = 1 + Math.sin(p.pop*Math.PI)*0.35; p.tag.scale.set(1.35*p.pop*e, 0.38*p.pop*e, 1); }
      c.g.position.set(c.x, y, c.z); c.g.rotation.set(lean, c.yaw, 0, 'YXZ');
      c.g.scale.set(sx, sy, sx);
    });
  }
  function stepRobots(dt, t){
    for(const [c, r] of robots){
      if(r.clock > 3.2) continue;
      r.clock += dt;
      const P = state.player; c.yaw = H.lerpAngle(c.yaw, Math.atan2(P.x - c.x, P.z - c.z), Math.min(1, dt*8));
      if(r.clock < 1.4){ if(!state.reduced) c.g.position.x += Math.sin(r.clock*70)*0.05*(1.4 - r.clock); }   // offended shake
      else if(r.clock < 2.6) setMood(r, 'neutral');
      else if(!r.friend){ r.friend = true; setMood(r, 'happy'); beep(true); heart(c.x, 2, c.z, 0.8); }
      else setMood(r, 'happy');
    }
  }
  function stepHearts(dt){
    for(const h of hearts){
      if(h.t >= 1) continue;
      h.t = Math.min(1, h.t + dt/0.95);
      const e = h.t < 0.25 ? h.t/0.25 : 1, sc = 0.7*h.big*(e*(1 + Math.sin(e*Math.PI)*0.4));
      h.s.position.set(h.x, h.y + h.t*1.3, h.z); h.s.scale.set(sc, sc, 1);
      h.s.material.opacity = h.t < 0.6 ? 1 : 1 - (h.t - 0.6)/0.4;
      if(h.t >= 1) h.s.visible = false;
    }
  }
  // Order 62: after the character sim (60) and voices (61) have written characters this frame.
  ctx.onUpdate((dt, t, mode) => {
    if(broken) return;
    try {
      if(mode === 'interior'){ if(promptKey){ promptKey = ''; prompt.classList.remove('on'); } return; }
      stepPets(dt, t); stepRobots(dt, t); stepHearts(dt); updatePrompt();
    } catch(e){ broken = true; prompt.classList.remove('on'); console.error('[pets] frame hook threw; pets paused', e); }
  }, 62);

  /* ---------- minimap: a berry dot per pet ---------- */
  ctx.hud?.minimapLayers?.push((g, toMap) => {
    for(const p of pets){ const [x, y] = toMap(p.c.x, p.c.z); g.fillStyle = '#3b4f9e'; g.strokeStyle = '#fffaf0'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); }
  });

  /* ---------- restore saved pets (beside the player once the island starts) ---------- */
  const saved = load();
  if(saved && Array.isArray(saved.pets)){
    born = saved.born | 0;
    for(const q of saved.pets.slice(0, MAX)){
      let c = ctx.chars[q.i];
      if(!isBerry(c) || pets.some(p => p.c === c)) c = ctx.chars.find(k => isBerry(k) && !pets.some(p => p.c === k));
      if(!c) break;
      const keep = born; if(adopt(c, true) && q.name){ pets[pets.length - 1].name = q.name; relabel(pets[pets.length - 1]); } born = keep;
    }
    save();
  }
  function relabel(p){ const old = p.tag; const tag = H.label(p.name, '#fffaf0', '#26306b'); tag.scale.copy(old.scale); tag.position.copy(old.position); tag.renderOrder = 5; tag.material.depthWrite = false; p.c.g.add(tag); p.c.g.remove(old); old.material.map.dispose(); old.material.dispose(); p.tag = tag; }
  const restart = () => { resetTrail(); respawnAll(); };
  bus.on('started', restart);
  bus.on('teleport', () => { resetTrail(); respawnAll(); });
  bus.on('interior:exit', () => setTimeout(restart, 0));

  const api = {
    pets: () => pets.map(p => p.name),
    adopt: c => adopt(c),
    count: () => pets.length,
    // For character.js F priority: what F would do here, or null ({ kind:'pet'|'berry'|'robot', dist }).
    nearest: () => { const h = blocked() ? null : target(); return h ? { kind: h.kind, dist: +h.dist.toFixed(2) } : null; },
    interact,
    release(){ for(const p of pets){ p.c.g.remove(p.tag); p.c.g.remove(p.zzz); p.c.static = false; p.c.y = 0; } pets.length = 0; save(); },
  };
  ctx.expose('pets', Object.assign({}, api, {
    berries: () => ctx.chars.filter(isBerry).map(c => ({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), pet: pets.some(p => p.c === c) })),
    robots: () => ctx.chars.filter(isRobot).map(c => ({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), mood: robots.get(c)?.mood ?? null })),
    target: () => { const h = target(); return h ? { kind: h.kind, dist: h.dist } : null; },
    still: (s) => { if(s != null) still = s; return still; },   // critics can fast-forward the idle clock
  }));
  return api;
}
