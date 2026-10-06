// Exploration tracker. Owned by the tracker builder. Andrew's ask: "a tracker for things I've
// visited and haven't visited".
// What counts, every name taken from data (zones.js, games.list(), space/kit.js AREAS and SHARD_IDS):
//   places   each zone: visited when its card shows (bus 'zone'), explored once you go inside ('interior:enter')
//   games    each id in games.list() except the tour, played on 'game:start' or 'game:end'
//   tour     completed (tour.js has no bus event yet, so tourGuide.state() is polled; 'tour:done' also works)
//   secrets  the space world ('space:enter'), its 4 areas ('space:area'), the 8 star shards ('space:shard'),
//            and the islet (standing on it)
// Extras shown but not counted: tour souvenirs (inventory.souvenirs()) and the most pets adopted at once.
// A chip under the top-left HUD ("Explored 7/45") opens the checklist; so does J. Esc or J closes it.
// Minimap: a pulsing dot on every zone not yet visited, a check on the visited ones.
// State lives in localStorage 'island.tracker'. The pure pieces (blank, sanitize, merge, counts) are
// exported for node tests.

const KEY = 'island.tracker';
const LISTS = ['visited', 'explored', 'games', 'areas', 'shards', 'souvenirs'], FLAGS = ['tour', 'space', 'islet'];

export function blank(){ return { v:1, visited:[], explored:[], games:[], tour:false, space:false, areas:[], shards:[], islet:false, souvenirs:[], pets:0 }; }
// Any junk in, a well formed save out. Unknown ids are kept (a module that failed to load this visit
// must not wipe what was saved); counts() only counts ids it knows. Explored implies visited.
export function sanitize(raw){
  const s = blank(); if(!raw || typeof raw !== 'object') return s;
  for(const k of LISTS) if(Array.isArray(raw[k])) s[k] = [...new Set(raw[k].filter(x => typeof x === 'string'))];
  for(const k of FLAGS) s[k] = raw[k] === true;
  s.pets = Number.isFinite(raw.pets) ? Math.max(0, Math.floor(raw.pets)) : 0;
  for(const id of s.explored) if(!s.visited.includes(id)) s.visited.push(id);
  return s;
}
// Union of two saves: lists joined, flags or'ed, pets the larger. Never loses progress.
export function merge(a, b){
  a = sanitize(a); b = sanitize(b); const s = blank();
  for(const k of LISTS) s[k] = [...new Set([...a[k], ...b[k]])];
  for(const k of FLAGS) s[k] = a[k] || b[k];
  s.pets = Math.max(a.pets, b.pets);
  return s;
}
// defs = { zones:[ids], games:[ids], tour:bool, areas:[ids], shards:[ids] }
export function counts(s, defs){
  const n = (list, ids) => ids.filter(id => list.includes(id)).length;
  const places = { visited: n(s.visited, defs.zones), explored: n(s.explored, defs.zones), of: defs.zones.length };
  const games = { played: n(s.games, defs.games), of: defs.games.length };
  const tour = defs.tour ? { done: s.tour ? 1 : 0, of: 1 } : { done: 0, of: 0 };
  const space = defs.areas.length ? 1 : 0;
  const secrets = { found: (space && s.space ? 1 : 0) + n(s.areas, defs.areas) + n(s.shards, defs.shards) + (space && s.islet ? 1 : 0),
    of: space*2 + defs.areas.length + defs.shards.length, areas: n(s.areas, defs.areas), shards: n(s.shards, defs.shards) };
  return { places, games, tour, secrets,
    done: places.visited + places.explored + games.played + tour.done + secrets.found,
    of: places.of*2 + games.of + tour.of + secrets.of };
}

const CSS = `
#tk-chip{position:fixed;left:12px;top:calc(104px + env(safe-area-inset-top,0px));z-index:5;appearance:none;border:0;display:inline-flex;align-items:center;gap:8px;
  background:var(--paper,#fffaf0);color:var(--ink,#1f2a44);font:600 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.02em;padding:7px 12px 7px 7px;border-radius:999px;
  box-shadow:0 4px 0 #0000001f;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#tk-chip[hidden]{display:none}
#tk-chip:hover{transform:translateY(-1px)}
#tk-chip:active{transform:translateY(2px);box-shadow:0 2px 0 #0000001f}
#tk-chip:focus-visible{outline:3px solid #5b6fd6;outline-offset:2px}
#tk-chip svg{width:22px;height:22px;flex:none}
#tk-chip kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:#1f2a44;color:#fffaf0;border-radius:5px;padding:3px 5px}
#tk-chip.pop{animation:tk-pop .45s cubic-bezier(.2,1.8,.4,1)}
@keyframes tk-pop{30%{transform:scale(1.12)}}
.tk-toast{position:fixed;left:12px;z-index:6;max-width:calc(100% - 140px);display:flex;align-items:center;gap:8px;background:#fffaf0;border:3px solid #1f2a44;border-radius:999px;
  padding:6px 14px 6px 8px;font:700 14px/1.2 Fredoka,system-ui,sans-serif;color:#1f2a44;box-shadow:0 4px 0 #0000002a;pointer-events:none;animation:tk-toast 2.6s ease forwards}
.tk-toast i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 13px/1 Fredoka,system-ui,sans-serif;font-style:normal;color:#fff;border:2px solid #1f2a44}
.tk-toast span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes tk-toast{0%{opacity:0;transform:translateY(-8px) scale(.85)}10%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
#tk{position:fixed;inset:0;z-index:9;display:grid;place-items:center;padding:16px;background:rgba(38,32,70,.3);opacity:0;transition:opacity .2s ease;font:500 15px/1.4 Nunito,system-ui,sans-serif;color:#1f2a44}
#tk.on{opacity:1}
#tk .box{width:min(560px,100%);max-height:calc(100dvh - 32px);display:grid;grid-template-rows:auto auto 1fr auto;background:#fffaf0;border:3px solid #1f2a44;border-radius:28px;
  box-shadow:0 8px 0 #0000002a,0 30px 60px -20px #1f2a4466;overflow:hidden;transform:translateY(18px) scale(.96);transition:transform .3s cubic-bezier(.2,1.5,.4,1)}
#tk.on .box{transform:none}
#tk .bar{display:flex;align-items:center;gap:12px;padding:14px 14px 10px 16px}
#tk .ring{width:58px;height:58px;flex:none;position:relative}
#tk .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
#tk .ring b{position:absolute;inset:0;display:grid;place-items:center;font:700 14px/1 Fredoka,system-ui,sans-serif}
#tk h2{font:700 22px/1.1 Fredoka,system-ui,sans-serif;margin:0}
#tk .sub{font:500 13px/1.3 Fredoka,system-ui,sans-serif;color:#4b5675}
#tk .ttl{flex:1;min-width:0}
#tk .x{appearance:none;border:3px solid #1f2a44;cursor:pointer;width:40px;height:40px;flex:none;border-radius:14px;background:#e98a5a;color:#fff;font:700 18px/1 Fredoka,system-ui,sans-serif;box-shadow:0 3px 0 #1f2a44;touch-action:manipulation}
#tk .tabs{display:flex;gap:8px;padding:0 16px 10px;flex-wrap:wrap}
#tk .tab{appearance:none;border:0;cursor:pointer;background:#f1e9d8;color:#1f2a44;font:600 14px/1 Fredoka,system-ui,sans-serif;padding:10px 14px;border-radius:14px;box-shadow:0 3px 0 #0000001a;touch-action:manipulation}
#tk .tab[aria-selected=true]{background:#1f2a44;color:#fffaf0}
#tk .tab kbd,#tk .keys kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:#1f2a4422;border-radius:5px;padding:2px 5px;margin-left:4px}
#tk .tab[aria-selected=true] kbd{background:#fffaf033}
#tk .body{overflow:auto;padding:4px 16px 12px;min-height:0;display:grid;gap:8px;align-content:start}
#tk .row{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 10px;border:3px solid #1f2a44;border-radius:18px;background:#f4ecdc;box-shadow:0 3px 0 #0000002a}
#tk .row.no{background:#fffaf0;border-color:#cdbfa6;box-shadow:none}
#tk .st{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:3px solid #1f2a44;font:700 15px/1 Fredoka,system-ui,sans-serif;color:#fff}
#tk .row.no .st{border:3px dashed #cdbfa6;background:transparent;color:#cdbfa6}
#tk .nm{flex:1;min-width:0}
#tk .nm b{display:block;font:700 16px/1.2 Fredoka,system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tk .nm span{display:block;font-size:13px;color:#4b5675}
#tk .go{appearance:none;flex:none;border:3px solid #1f2a44;background:#fffaf0;color:#1f2a44;font:700 13px/1 Fredoka,system-ui,sans-serif;padding:9px 12px;border-radius:999px;box-shadow:0 3px 0 #1f2a44;cursor:pointer;touch-action:manipulation}
#tk .go:active{transform:translateY(2px);box-shadow:0 1px 0 #1f2a44}
#tk .go[disabled]{opacity:.4;cursor:default}
#tk h3{font:700 13px/1 Fredoka,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#4b5675;margin:8px 0 0}
#tk .stars{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
#tk .stars i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font:700 11px/1 Fredoka,system-ui,sans-serif;font-style:normal;background:#efe7d6;color:#b3a58b}
#tk .stars i.on{background:#ffd166;color:#1f2a44}
#tk .foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px 14px;border-top:3px dashed #e6dcc8}
#tk .foot .q{flex:1;min-width:180px;font:600 13px/1.3 Fredoka,system-ui,sans-serif}
#tk .foot .keys{flex:1;font:500 12px/1.6 Fredoka,system-ui,sans-serif;color:#4b5675}
#tk .go.red{background:#d9534f;color:#fff}
@media (pointer:coarse){#tk-chip{padding:9px 14px 9px 9px;min-height:44px}#tk-chip kbd,#tk .tab kbd,#tk .keys{display:none}
  #tk{padding:0;align-items:end}#tk .box{width:100%;max-height:88dvh;border-radius:24px 24px 0 0;border-bottom:0}#tk .go{padding:11px 14px}}
@media (max-width:600px){#tk{padding:0;align-items:end}#tk .box{width:100%;max-height:88dvh;border-radius:24px 24px 0 0;border-bottom:0}#tk h2{font-size:19px}}
@media (prefers-reduced-motion:reduce){#tk,#tk .box{transition:none}.tk-toast{animation-duration:.01s}#tk-chip.pop{animation:none}}
`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const ring = (done, of, size, stroke, color) => {
  const r = (size - stroke)/2, C = 2*Math.PI*r, f = of ? done/of : 0;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#efe7d6" stroke-width="${stroke}"/>` +
    `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(C*f).toFixed(2)} ${C.toFixed(2)}"/></svg>`;
};

export async function init(ctx){
  const { state, bus } = ctx;

  /* ---------- what exists, all from data ---------- */
  let AREAS = [], SHARD_IDS = [];
  if(ctx.modules.space){
    try { ({ AREAS, SHARD_IDS } = await import('../space/kit.js')); } catch(e){ console.error('[tracker] space/kit.js failed; secrets are left out', e); }
  }
  const allGames = (() => { try { return ctx.modules.games?.list?.() || []; } catch { return []; } })();
  const tourGame = allGames.find(g => g.id === 'tour');
  const games = allGames.filter(g => g.id !== 'tour' && g.kind !== 'guide');
  const defs = { zones: ctx.zones.map(z => z.id), games: games.map(g => g.id), tour: !!tourGame, areas: AREAS.map(a => a.id), shards: [...SHARD_IDS] };
  const zoneById = id => ctx.zones.find(z => z.id === id);

  /* ---------- saved state ---------- */
  let S = blank();
  try { S = sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { /* private mode or junk: start fresh */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage blocked: progress lasts this visit */ } };

  // Pull in what other modules already remember (shards, souvenirs, pets), without toasts.
  function sync(){
    const from = blank();
    try { from.shards = ctx.modules.space?.collected?.() || []; } catch {}
    try { from.souvenirs = ctx.modules.inventory?.souvenirs?.().found || []; } catch {}
    try { from.pets = ctx.modules.pets?.count?.() || 0; } catch {}
    const next = merge(S, from);
    if(JSON.stringify(next) !== JSON.stringify(S)){ S = next; persist(); paint(); }
  }

  // mark('visited', id) etc. Returns true the first time. Toasts unless quiet.
  function mark(list, id, toastText, color){
    if(S[list].includes(id)) return false;
    S[list].push(id);
    if(list === 'explored' && !S.visited.includes(id)) S.visited.push(id);
    persist(); paint(true);
    if(toastText) toast(toastText, color);
    return true;
  }
  function flag(k, toastText, color){ if(S[k]) return false; S[k] = true; persist(); paint(true); if(toastText) toast(toastText, color); return true; }

  /* ---------- DOM ---------- */
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const chip = document.createElement('button'); chip.type = 'button'; chip.id = 'tk-chip'; chip.hidden = true;
  chip.setAttribute('aria-label', 'Exploration checklist'); document.body.append(chip);
  chip.addEventListener('click', () => toggle());

  function paint(pop = false){
    const c = counts(S, defs);
    chip.innerHTML = `${ring(c.done, c.of, 22, 4, '#6fae4a')}<span>Explored ${c.done}/${c.of}</span><kbd>J</kbd>`;
    chip.title = `Explored ${c.done} of ${c.of}`;
    if(pop && !state.reduced){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
    if(open) render();
  }

  // Under the top-left HUD row, and under the tour pill when it sits on the left (desktop).
  // The pill hides while touring, so its last bottom edge is remembered to keep the chip still.
  let pillBottom = 0;
  function place(){
    const tl = document.getElementById('topleft')?.getBoundingClientRect();
    let y = tl && tl.height ? tl.bottom : 50;
    const pill = document.querySelector('.tr-pill');
    if(pill && !pill.hidden){ const r = pill.getBoundingClientRect(); pillBottom = r.width && r.left < innerWidth/2 ? r.bottom : 0; }
    y = Math.max(y, pillBottom);
    chip.style.top = `${Math.round(y + 8)}px`;
    if(toastEl) toastEl.style.top = `${Math.round(y + 8 + chip.offsetHeight + 8)}px`;
  }
  bus.on('resize', () => { pillBottom = 0; place(); });
  const begin = () => { chip.hidden = false; sync(); paint(); place(); };
  bus.on('started', begin);

  /* ---------- toasts: one at a time, held while the talk box or the panel is open ---------- */
  const queue = []; let toastEl = null, toastT = 0, dialogUp = false;
  function toast(text, color = '#6fae4a'){ if(queue.length < 6) queue.push({ text, color }); }
  bus.on('dialog', ({ open: o }) => { dialogUp = !!o; if(dialogUp && toastEl){ toastEl.remove(); toastEl = null; } });
  function stepToast(dt){
    if(toastEl){ toastT -= dt; if(toastT <= 0){ toastEl.remove(); toastEl = null; } return; }
    if(!queue.length || dialogUp || open || !state.started) return;
    const q = queue.shift();
    toastEl = document.createElement('div'); toastEl.className = 'tk-toast'; toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = `<i style="background:${q.color}">&#10003;</i><span>${esc(q.text)}</span>`;
    document.body.append(toastEl); place(); toastT = 2.6;
    try { ctx.sound.tone(660, 0.09, 'triangle', 0.05, 880); } catch {}
  }

  /* ---------- what counts ---------- */
  bus.on('zone', ({ zone }) => { if(zone && state.started && defs.zones.includes(zone.id)) mark('visited', zone.id, `New place: ${zone.name}`, zone.color); });
  bus.on('interior:enter', ({ zoneId }) => { const z = zoneById(zoneId); if(z) mark('explored', z.id, `Explored inside: ${z.name}`, z.color); });
  const played = ({ id }) => { const g = games.find(q => q.id === id); if(g) mark('games', id, `New game: ${g.title || id}`, '#e98a5a'); };
  bus.on('game:start', played); bus.on('game:end', played);
  bus.on('game:start', ({ id }) => { if(id !== 'tour') close(); });
  const tourDone = () => { if(defs.tour) flag('tour', `${tourGame.title || 'Tour'} complete`, '#f2b705'); };
  bus.on('tour:done', tourDone);
  bus.on('space:enter', () => { if(defs.areas.length) flag('space', 'Secret found: The Station', '#a78bfa'); });
  bus.on('space:area', ({ id }) => { const a = AREAS.find(q => q.id === id); if(a) mark('areas', id, `Secret found: ${a.title}`, a.color); });
  bus.on('space:shard', ({ id }) => { if(defs.shards.includes(id)) mark('shards', id); });
  bus.on('inventory', sync); bus.on('pets', sync);

  // Cheap polls, twice a second in any mode: the islet (by position), the tour's done phase, the chip's place.
  let clock = 0;
  ctx.onUpdate(dt => {
    stepToast(dt);
    clock += dt; if(clock < 0.5) return; clock = 0;
    if(!state.started) return;
    const I = ctx.modules.space?.islet, P = state.player;
    if(I && defs.areas.length && !S.islet && state.mode !== 'interior' && Math.hypot(P.x - I.x, P.z - I.z) < I.r) flag('islet', 'Secret found: the islet', '#7fd6a0');
    if(defs.tour && !S.tour){ try { if(window.__island?.tourGuide?.state?.().phase === 'done') tourDone(); } catch {} }
    place();
  }, 98);

  /* ---------- minimap: pulsing dot = not visited yet, check = visited ---------- */
  ctx.hud.minimapLayers.push((g, toMap) => {
    if(!state.started) return;
    const pulse = state.reduced ? 0.5 : 0.5 + 0.5*Math.sin(performance.now()/260);
    for(const z of ctx.zones){
      const [x, y] = toMap(z.x, z.z);
      if(S.visited.includes(z.id)){
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(x - 4.5, y + 0.5); g.lineTo(x - 1, y + 4); g.lineTo(x + 5, y - 4);
        g.strokeStyle = '#1f2a44'; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#fffaf0'; g.lineWidth = 2.5; g.stroke(); g.restore();
      } else {
        g.beginPath(); g.arc(x, y, 9 + 5*pulse, 0, 7); g.strokeStyle = `rgba(255,250,240,${(0.85 - 0.6*pulse).toFixed(2)})`; g.lineWidth = 2.5; g.stroke();
        g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fillStyle = '#fffaf0'; g.fill();
      }
    }
  });

  /* ---------- the panel ---------- */
  let open = false, root = null, tab = 'places', confirming = false;
  const TABS = ['places', 'games', 'secrets'];
  function toggle(){ open ? close() : show(); }
  function blocked(){
    const a = ctx.modules.games?.active?.();
    return !state.started || (a && a !== 'tour') || !!ctx.modules.dialog?.busy?.() || !!ctx.modules.menu?.isOpen?.() || !!ctx.modules.inventory?.isOpen?.();
  }
  function show(){
    if(open || blocked()) return; open = true; confirming = false; ctx.input.clear(); sync();
    root = document.createElement('div'); root.id = 'tk'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Exploration checklist');
    root.addEventListener('pointerdown', ev => { if(ev.target === root) close(); });
    root.addEventListener('click', onClick);
    document.body.append(root); render();
    requestAnimationFrame(() => root?.classList.add('on'));
    try { ctx.sound.tone(440, 0.08, 'sine', 0.06, 660); } catch {}
  }
  function close(){
    if(!open) return; open = false; const r = root; root = null; r.classList.remove('on'); setTimeout(() => r.remove(), 220);
    ctx.renderer.domElement.focus?.({ preventScroll: true });
  }
  function onClick(ev){
    const b = ev.target.closest('button'); if(!b) return;
    const d = b.dataset;
    if(d.x != null) close();
    else if(d.t){ tab = d.t; confirming = false; render(); }
    else if(d.go){ close(); ctx.modes.teleport(d.go); }
    else if(d.play){ close(); ctx.modules.games?.start?.(d.play); }
    else if(d.reset === 'ask'){ confirming = true; render(); }
    else if(d.reset === 'no'){ confirming = false; render(); }
    else if(d.reset === 'yes'){ api.reset(); confirming = false; render(); }
  }
  const row = (done, mark, color, name, sub, btn) =>
    `<div class="row${done ? '' : ' no'}"><span class="st" style="${done ? `background:${color}` : ''}">${done ? mark : ''}</span><div class="nm"><b>${esc(name)}</b><span>${esc(sub)}</span></div>${btn || ''}</div>`;
  function render(){
    if(!root) return;
    const c = counts(S, defs), pct = c.of ? Math.round(c.done/c.of*100) : 0;
    let body = '';
    if(tab === 'places'){
      body = ctx.zones.map(z => {
        const ex = S.explored.includes(z.id), vi = S.visited.includes(z.id);
        return row(vi, ex ? '&#9733;' : '&#10003;', z.color, z.name, ex ? 'Explored inside' : vi ? 'Visited, not inside yet' : 'Not yet',
          `<button class="go" type="button" data-go="${esc(z.id)}">Go there</button>`);
      }).join('');
    } else if(tab === 'games'){
      if(tourGame) body += row(S.tour, '&#10003;', '#f2b705', tourGame.title || 'Tour', S.tour ? 'Completed' : 'Not finished yet', `<button class="go" type="button" data-play="tour">Start</button>`);
      body += games.map(g => row(S.games.includes(g.id), '&#10003;', '#e98a5a', g.title || g.id, S.games.includes(g.id) ? 'Played' : 'Not played yet',
        `<button class="go" type="button" data-play="${esc(g.id)}">Play</button>`)).join('');
      if(!body) body = '<p>No games loaded.</p>';
    } else {
      if(defs.areas.length){
        body += row(S.space, '&#9733;', '#a78bfa', S.space ? 'The Station' : '???', S.space ? 'Found' : 'A secret');
        body += AREAS.map(a => row(S.areas.includes(a.id), '&#9733;', a.color, S.areas.includes(a.id) ? a.title : '???', S.areas.includes(a.id) ? 'Found' : 'A secret')).join('');
        body += row(S.islet, '&#9733;', '#7fd6a0', S.islet ? 'The islet' : '???', S.islet ? 'Found' : 'A secret');
        const got = c.secrets.shards;
        body += `<div class="row${got ? '' : ' no'}"><span class="st" style="${got ? 'background:#ffd166;color:#1f2a44' : ''}">${got ? '&#9733;' : ''}</span><div class="nm"><b>${got ? `Star shards ${got}/${defs.shards.length}` : '???'}</b>` +
          `<div class="stars">${defs.shards.map(id => S.shards.includes(id) ? '<i class="on">&#9733;</i>' : '<i>?</i>').join('')}</div></div></div>`;
      } else body += '<p>No secrets loaded.</p>';
      const sv = (() => { try { return ctx.modules.inventory?.souvenirs?.(); } catch { return null; } })();
      if(sv || ctx.modules.pets){
        body += '<h3>Collections (not counted)</h3>';
        if(sv) body += row(S.souvenirs.length > 0, '&#10003;', '#3b4f9e', `Tour souvenirs ${sv.found.length}/${sv.of}`, 'One from every building, picked up on the tour');
        if(ctx.modules.pets) body += row(S.pets > 0, '&#10003;', '#3b4f9e', `Pets adopted: ${S.pets}`, 'Most following you at once');
      }
    }
    const foot = confirming
      ? `<span class="q">Reset the checklist? Star shards and souvenirs stay found, they live in their own saves.</span><button class="go" type="button" data-reset="no">Keep it</button><button class="go red" type="button" data-reset="yes">Reset</button>`
      : `<span class="keys"><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> tabs · <kbd>J</kbd> or <kbd>Esc</kbd> close</span><button class="go" type="button" data-reset="ask">Reset progress</button>`;
    const label = { places: `Places ${c.places.visited}/${c.places.of}`, games: `Games ${c.games.played + c.tour.done}/${c.games.of + c.tour.of}`, secrets: `Secrets ${c.secrets.found}/${c.secrets.of}` };
    const scroll = root.querySelector('.body')?.scrollTop || 0;
    root.innerHTML = `<div class="box"><div class="bar"><div class="ring">${ring(c.done, c.of, 58, 8, '#6fae4a')}<b>${pct}%</b></div>` +
      `<div class="ttl"><h2>Explored ${c.done}/${c.of}</h2><div class="sub">${c.places.explored} of ${c.places.of} buildings explored inside</div></div>` +
      `<button class="x" type="button" data-x aria-label="Close checklist">X</button></div>` +
      `<div class="tabs" role="tablist">${TABS.map((t, i) => `<button class="tab" role="tab" type="button" data-t="${t}" aria-selected="${t === tab}">${label[t]}<kbd>${i + 1}</kbd></button>`).join('')}</div>` +
      `<div class="body">${body}</div><div class="foot">${foot}</div></div>`;
    root.querySelector('.body').scrollTop = scroll;
  }

  /* ---------- keys: J opens (bus 'key'); while open every key is captured before the game sees it ---------- */
  bus.on('key', ({ code, down, repeat }) => { if(code === 'KeyJ' && down && !repeat && !open) show(); });
  const codeOf = e => e.code || (e.key === 'Escape' || e.key === 'Esc' ? 'Escape' : e.key?.length === 1 ? 'Key' + e.key.toUpperCase() : e.key || '');
  addEventListener('keydown', e => {
    if(!open) return;
    const code = codeOf(e); e.stopPropagation();
    if(code === 'Tab' || code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
    if(e.repeat) return;
    if(code === 'Escape' || code === 'KeyJ'){ e.preventDefault(); close(); }
    else if(/^Digit[1-3]$/.test(code)){ tab = TABS[+code.slice(5) - 1]; confirming = false; render(); }
    else if(code === 'ArrowLeft' || code === 'ArrowRight'){ tab = TABS[(TABS.indexOf(tab) + (code === 'ArrowLeft' ? 2 : 1)) % 3]; confirming = false; render(); }
  }, true);
  addEventListener('keyup', e => { if(open) e.stopPropagation(); }, true);

  /* ---------- API ---------- */
  const api = {
    state: () => ({ ...sanitize(S), counts: counts(S, defs) }),
    visited: id => S.visited.includes(id) || S.games.includes(id) || S.areas.includes(id) || S.shards.includes(id) || (id === 'tour' && S.tour) || (id === 'space' && S.space) || (id === 'islet' && S.islet),
    reset(){ S = blank(); persist(); queue.length = 0; sync(); paint(); return true; },
    open: show, close, isOpen: () => open,
  };
  ctx.expose('tracker', Object.assign({}, api, { defs: () => JSON.parse(JSON.stringify(defs)) }));
  paint();
  if(state.started) begin();          // the start screen can be dismissed before the modules finish loading
  return api;
}
