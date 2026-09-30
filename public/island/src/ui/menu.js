// Menu and teleport. Owned by the menu builder. Mounts two HUD pills in #menu-root (Map, Menu),
// a tabbed dialog (Map, Resume, Controls, Sound) and a full-screen halftone wipe for teleports.
// The map is a real top-down render of the island scene, taken once with an orthographic camera
// after every module has loaded, then refreshed when the dialog opens if it is stale.
// Keys: M toggles the map, Esc closes. Everything fails soft: a broken map render leaves a plain
// painted disc, and the pins still teleport.

const CSS = `
#mn-open,#mn-map{gap:8px}
#mn-open svg,#mn-map svg{width:16px;height:16px;flex:none}
#mn-map kbd{font:600 10px/1 Fredoka,system-ui,sans-serif;background:var(--ink);color:var(--paper);border-radius:5px;padding:3px 5px}
#map{cursor:pointer}
#mn{position:fixed;inset:0;z-index:9;display:grid;place-items:center;padding:16px;
  background:rgba(38,32,70,.34) radial-gradient(rgba(255,244,220,.16) 1.2px,transparent 1.6px) 0 0/6px 6px;
  opacity:0;transition:opacity .22s ease}
#mn.on{opacity:1}
#mn .box{position:relative;width:min(1060px,100%);height:min(calc(100dvh - 32px),770px);display:grid;grid-template-rows:auto 1fr;
  background:var(--paper);border-radius:28px;box-shadow:0 10px 0 #0000002a,0 30px 60px -20px #1f2a4466;overflow:hidden;
  transform:translateY(18px) scale(.97);transition:transform .32s cubic-bezier(.2,1.5,.4,1)}
#mn.on .box{transform:none}
#mn .bar{display:flex;align-items:center;gap:6px;padding:14px 14px 0 18px;flex-wrap:wrap}
#mn .bar h2{font:700 20px/1 Fredoka,system-ui,sans-serif;margin:0 12px 0 0;color:var(--ink)}
#mn .bar h2 span{color:var(--berry)}
#mn [role=tablist]{display:flex;gap:6px;flex-wrap:wrap;flex:1}
#mn [role=tab]{appearance:none;border:0;cursor:pointer;background:#f1e9d8;color:var(--ink);font:600 14px/1 Fredoka,system-ui,sans-serif;
  padding:10px 14px;border-radius:14px;display:inline-flex;gap:8px;align-items:center;box-shadow:0 3px 0 #0000001a}
#mn [role=tab] svg{width:16px;height:16px}
#mn [role=tab][aria-selected=true]{background:var(--ink);color:var(--paper)}
#mn [role=tab]:focus-visible,#mn .x:focus-visible,#mn .btn:focus-visible,#mn .place:focus-visible{outline:3px solid var(--berry-2);outline-offset:2px}
#mn .x{appearance:none;border:0;cursor:pointer;width:40px;height:40px;border-radius:14px;background:var(--clay);color:#fff;display:grid;place-items:center;box-shadow:0 3px 0 #0000002a;flex:none}
#mn .x svg{width:18px;height:18px}
#mn .x:hover{filter:brightness(1.06)}
#mn .panes{overflow:auto;padding:14px 18px 18px;min-height:0}
#mn [role=tabpanel]{outline:none}
#mn p{margin:0 0 10px;color:var(--ink-2)}
#mn h3{font:700 16px/1.2 Fredoka,system-ui,sans-serif;margin:0 0 8px;color:var(--ink)}
/* map tab */
#mn .maptab{display:flex;gap:20px;align-items:flex-start}
#mn .mapwrap{position:relative;flex:none;aspect-ratio:1;width:min(calc(100dvh - 150px),660px);max-width:100%;border-radius:24px;background:#7cc4d6;
  box-shadow:inset 0 0 0 6px #fffaf0,0 5px 0 #0000001f;touch-action:manipulation}
#mn .mapwrap canvas.paint{position:absolute;inset:0;width:100%;height:100%;border-radius:24px;display:block}
#mn .mapwrap .edge{position:absolute;inset:0;border-radius:24px;pointer-events:none;box-shadow:inset 0 0 0 6px #fffaf0,inset 0 0 40px 8px #1f2a4426}
#mn .compass{position:absolute;right:16px;top:14px;width:38px;height:38px;border-radius:50%;background:#fffaf0e6;display:grid;place-items:center;
  font:700 12px/1 Fredoka,system-ui,sans-serif;color:var(--ink);box-shadow:0 3px 0 #0000001f;pointer-events:none}
#mn .compass i{position:absolute;top:4px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid var(--clay)}
#mn .compass b{margin-top:8px}
#mn .pin{position:absolute;width:40px;height:44px;margin:-44px 0 0 -20px;appearance:none;border:0;background:none;padding:0;cursor:pointer;
  animation:mn-drop .45s cubic-bezier(.2,1.6,.4,1) both;z-index:1}
#mn .pin .head{position:absolute;left:5px;top:2px;width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
  background:var(--c);box-shadow:0 0 0 3px #fffaf0,0 4px 0 3px #0000002a;transition:transform .18s cubic-bezier(.2,1.6,.4,1)}
#mn .pin .num{position:absolute;left:5px;top:2px;width:30px;height:30px;display:grid;place-items:center;font:700 13px/1 Fredoka,system-ui,sans-serif;color:#fff;
  text-shadow:0 1px 0 #0003;transition:transform .18s cubic-bezier(.2,1.6,.4,1)}
#mn .pin .num svg{width:15px;height:15px}
#mn .pin .shadow{position:absolute;left:14px;bottom:0;width:12px;height:5px;border-radius:50%;background:#1f2a4455}
#mn .pin .tip{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translate(-50%,6px);opacity:0;pointer-events:none;white-space:nowrap;
  background:var(--ink);color:var(--paper);font:600 14px/1 Fredoka,system-ui,sans-serif;padding:9px 12px;border-radius:12px;box-shadow:0 4px 0 #0000002a;
  transition:opacity .15s,transform .18s cubic-bezier(.2,1.6,.4,1);display:flex;gap:8px;align-items:center}
#mn .pin .tip i{width:10px;height:10px;border-radius:3px;background:var(--c);flex:none}
#mn .pin .tip small{font:500 11px/1 Fredoka,system-ui,sans-serif;opacity:.7}
#mn .pin:hover,#mn .pin:focus-visible,#mn .pin.hot{z-index:3;outline:none}
#mn .pin:hover .head,#mn .pin:focus-visible .head,#mn .pin.hot .head{transform:translateY(-5px) rotate(-45deg) scale(1.15)}
#mn .pin:hover .num,#mn .pin:focus-visible .num,#mn .pin.hot .num{transform:translateY(-5px) scale(1.15)}
#mn .pin:hover .tip,#mn .pin:focus-visible .tip,#mn .pin.hot .tip{opacity:1;transform:translate(-50%,-4px)}
#mn .pin:focus-visible .head{box-shadow:0 0 0 3px #fffaf0,0 0 0 6px var(--berry-2)}
@keyframes mn-drop{from{opacity:0;transform:translateY(-26px)}to{opacity:1;transform:none}}
#mn .you{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;pointer-events:none;z-index:2}
#mn .you .ring{position:absolute;inset:-6px;border-radius:50%;border:3px solid #fffaf0;animation:mn-ping 1.6s ease-out infinite}
#mn .you svg{position:absolute;inset:0;width:30px;height:30px;filter:drop-shadow(0 2px 0 #0000003a)}
@keyframes mn-ping{from{transform:scale(.6);opacity:.95}to{transform:scale(1.6);opacity:0}}
#mn .list{display:grid;gap:2px;align-content:start;flex:1;min-width:230px}
#mn .list h3{margin-bottom:4px}
#mn .place{appearance:none;border:0;background:transparent;text-align:left;cursor:pointer;display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:center;
  padding:5px 8px;border-radius:12px;color:var(--ink)}
#mn .place:hover,#mn .place.hot{background:#f1e9d8}
#mn .place b{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:var(--c);color:#fff;font:700 12px/1 Fredoka,system-ui,sans-serif;text-shadow:0 1px 0 #0003}
#mn .place b svg{width:13px;height:13px}
#mn .place span{font:600 14px/1.15 Fredoka,system-ui,sans-serif}
#mn .place small{display:block;font:500 12px/1.2 Nunito,system-ui,sans-serif;color:var(--ink-2)}
#mn .note{font:500 12px/1.4 Fredoka,system-ui,sans-serif;color:var(--ink-2);margin-top:6px}
/* buttons, keys */
#mn .btn{appearance:none;border:0;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px;background:var(--berry);color:var(--paper);
  font:600 14px/1 Fredoka,system-ui,sans-serif;padding:11px 15px;border-radius:999px;box-shadow:0 4px 0 #0000002a}
#mn .btn svg{width:18px;height:18px;flex:none}
#mn .btn{white-space:nowrap}
#mn .btn.soft{background:#f1e9d8;color:var(--ink)}
#mn .btn:active{transform:translateY(2px);box-shadow:0 2px 0 #0000002a}
#mn .row{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 16px}
#mn kbd{font:600 12px/1 Fredoka,system-ui,sans-serif;background:var(--ink);color:var(--paper);border-radius:7px;padding:5px 7px;box-shadow:0 2px 0 #0000003a;display:inline-block;min-width:12px;text-align:center}
#mn .keys{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
#mn .key{background:#f7f0e2;border-radius:16px;padding:12px 14px;display:flex;gap:12px;align-items:center}
#mn .key .k{display:flex;gap:4px;flex-wrap:wrap;min-width:118px}
#mn .key span{font:500 14px/1.3 Nunito,system-ui,sans-serif;color:var(--ink)}
/* resume tab */
#mn .cv{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}
#mn .job{background:#f7f0e2;border-radius:18px;padding:14px 16px;border-left:6px solid var(--c);display:grid;gap:4px;align-content:start}
#mn .job .eb{font:600 11px/1.2 Fredoka,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
#mn .job h4{font:700 17px/1.15 Fredoka,system-ui,sans-serif;margin:0;color:var(--ink)}
#mn .job .rl{font:600 13px/1.3 Nunito,system-ui,sans-serif;color:var(--ink-2)}
#mn .job button{justify-self:start;margin-top:6px;appearance:none;border:0;cursor:pointer;background:transparent;color:var(--berry);font:600 13px/1 Fredoka,system-ui,sans-serif;padding:4px 0}
#mn .job button:focus-visible{outline:3px solid var(--berry-2);outline-offset:2px;border-radius:6px}
/* sound tab */
#mn .switch{appearance:none;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:12px;background:#f1e9d8;color:var(--ink);padding:10px 16px 10px 10px;border-radius:999px;
  font:600 15px/1 Fredoka,system-ui,sans-serif;box-shadow:0 4px 0 #0000001f}
#mn .switch i{width:48px;height:28px;border-radius:999px;background:#c9c1b0;position:relative;transition:background .2s}
#mn .switch i::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 0 #0002;transition:transform .22s cubic-bezier(.2,1.6,.4,1)}
#mn .switch[aria-checked=true] i{background:var(--leaf)}
#mn .switch[aria-checked=true] i::after{transform:translateX(20px)}
#mn .switch:focus-visible{outline:3px solid var(--berry-2);outline-offset:2px}
#mn-wipe{position:fixed;inset:0;z-index:9;pointer-events:none;width:100%;height:100%}
@media (max-width:820px){
  #mn .maptab{flex-direction:column}
  #mn .list{min-width:0;width:100%}
  #mn .mapwrap{width:100%}
  #mn .list{grid-template-columns:1fr 1fr}
  #mn .list h3{grid-column:1/-1}
  #mn .bar h2{display:none}
}
@media (max-width:560px){
  #mn{padding:8px}
  #mn .box{border-radius:22px;height:calc(100dvh - 16px)}
  #mn [role=tab]{padding:9px 10px;font-size:13px}
  #mn [role=tab] .lb{display:none}
  #mn .list{grid-template-columns:1fr}
  #mn-open .lb{display:none}
}
@media (prefers-reduced-motion:reduce){#mn,#mn .box,#mn .pin,#mn .you .ring{animation:none!important;transition:none!important}}
`;

const ICON = {
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/></svg>',
  keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-4.5v-6h-3v6H6v-9H3z"/></svg>',
  car: '<svg viewBox="0 0 30 30"><path d="M15 3l9 22-9-5-9 5z" fill="#1f2a44" stroke="#fffaf0" stroke-width="2.4" stroke-linejoin="round"/></svg>',
};

const TABS = [['map', 'Map', ICON.map], ['cv', 'Résumé', ICON.cv], ['keys', 'Controls', ICON.keys], ['sound', 'Sound', ICON.sound]];
const RESUME = 'https://andliu.dev/andrew-liu-resume.pdf';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

export function init(ctx){
  const { state, bus } = ctx;
  const style = document.createElement('style'); style.id = 'menu-css'; style.textContent = CSS; document.head.append(style);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; };

  /* HUD pills */
  const mapBtn = el('button', 'pill', `${ICON.map}<span class="lb">Map</span><kbd>M</kbd>`);
  mapBtn.id = 'mn-map'; mapBtn.type = 'button'; mapBtn.setAttribute('aria-haspopup', 'dialog');
  const openBtn = el('button', 'pill', `${ICON.menu}<span class="lb">Menu</span>`);
  openBtn.id = 'mn-open'; openBtn.type = 'button'; openBtn.setAttribute('aria-haspopup', 'dialog');
  ctx.hud.menuRoot.append(mapBtn, openBtn);

  /* Places: spawn plus every zone, numbered in data order */
  const spawnP = { id:'spawn', name:'Spawn plaza', sub:'Where you start', color:'#1f2a44', num:ICON.home };
  const places = [spawnP, ...ctx.zones.map((z, i) => ({ id:z.id, name:z.name, sub:z.title === z.name ? z.role : z.title, color:z.color, num:String(i + 1), zone:z }))];
  const posOf = p => p.id === 'spawn' ? ctx.island.spawn : p.zone;

  /* Dialog */
  const root = el('div'); root.id = 'mn'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'mn-title');
  const box = el('div', 'box');
  const bar = el('div', 'bar', `<h2 id="mn-title">Andrew Liu <span>Island</span></h2>`);
  const tablist = el('div'); tablist.setAttribute('role', 'tablist'); tablist.setAttribute('aria-label', 'Menu sections');
  const closeBtn = el('button', 'x', ICON.x); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close menu');
  bar.append(tablist, closeBtn);
  const panes = el('div', 'panes');
  box.append(bar, panes); root.append(box); document.body.append(root);

  const tabs = {}, panels = {};
  for(const [id, label, icon] of TABS){
    const t = el('button', null, `${icon}<span class="lb">${label}</span>`); t.type = 'button';
    t.setAttribute('role', 'tab'); t.id = 'mn-t-' + id; t.setAttribute('aria-controls', 'mn-p-' + id); t.setAttribute('aria-label', label);
    t.addEventListener('click', () => select(id, true));
    const p = el('div'); p.id = 'mn-p-' + id; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', t.id); p.tabIndex = -1;
    tabs[id] = t; panels[id] = p; tablist.append(t); panes.append(p);
  }

  /* Map tab */
  const mapTab = el('div', 'maptab');
  const wrap = el('div', 'mapwrap'); wrap.setAttribute('aria-label', 'Top-down map of the island. Choose a pin to teleport.');
  const paint = el('canvas', 'paint'); paint.width = paint.height = 8;
  const edge = el('div', 'edge'), compass = el('div', 'compass', '<i></i><b>N</b>');
  const you = el('div', 'you', `<span class="ring"></span>${ICON.car}`);
  wrap.append(paint, edge, compass, you);
  const list = el('div', 'list', '<h3>Places</h3>');
  const pins = {}, rows = {};
  places.forEach((p, i) => {
    const pin = el('button', 'pin', `<span class="shadow"></span><span class="head"></span><span class="num">${p.num}</span><span class="tip"><i></i>${esc(p.name)}<small>teleport</small></span>`);
    pin.type = 'button'; pin.style.setProperty('--c', p.color); pin.style.animationDelay = (i * 28) + 'ms';
    pin.setAttribute('aria-label', `Teleport to ${p.name}`);
    const row = el('button', 'place', `<b>${p.num}</b><span>${esc(p.name)}<small>${esc(p.sub)}</small></span>`);
    row.type = 'button'; row.style.setProperty('--c', p.color); row.tabIndex = -1; row.setAttribute('aria-label', `Teleport to ${p.name}`);
    for(const b of [pin, row]){
      b.addEventListener('click', () => go(p.id));
      b.addEventListener('pointerenter', () => hover(p.id));
      b.addEventListener('pointerleave', () => hover(null));
      b.addEventListener('focus', () => hover(p.id));
      b.addEventListener('blur', () => hover(null));
    }
    pins[p.id] = pin; rows[p.id] = row; wrap.append(pin); list.append(row);
  });
  list.append(el('p', 'note', 'Tip: press <kbd>M</kbd> anywhere to open this map, <kbd>Tab</kbd> through the pins, <kbd>Enter</kbd> to go.'));
  mapTab.append(wrap, list); panels.map.append(mapTab);

  /* Resume tab */
  const contact = ctx.zones.find(z => z.id === 'contact');
  const email = contact?.role && /@/.test(contact.role) ? contact.role : null;
  const gh = contact?.links?.find(([t]) => /github/i.test(t))?.[1];
  panels.cv.innerHTML = `<h3>Résumé and contact</h3>
    <p>Every place on the island is one line of the résumé. Read it all here, or jump to any of them.</p>
    <div class="row"><a class="btn" href="${RESUME}" target="_blank" rel="noreferrer">${ICON.cv} Read the résumé (PDF)</a>
    ${email ? `<a class="btn soft" href="mailto:${esc(email)}">Email ${esc(email)}</a>` : ''}
    ${gh ? `<a class="btn soft" href="${esc(gh)}" target="_blank" rel="noreferrer">GitHub</a>` : ''}</div>
    <div class="cv"></div>`;
  const cv = panels.cv.querySelector('.cv');
  for(const z of ctx.zones){
    const j = el('div', 'job', `<div class="eb">${esc(z.eyebrow)}</div><h4>${esc(z.title)}</h4><div class="rl">${esc(z.role)}</div>`);
    j.style.setProperty('--c', z.color);
    const b = el('button', null, `Go to ${esc(z.name)} →`); b.type = 'button'; b.addEventListener('click', () => go(z.id));
    j.append(b); cv.append(j);
  }

  /* Controls tab */
  const K = s => s.split(' ').map(k => `<kbd>${k}</kbd>`).join('');
  const keyRows = [
    [K('W A S D'), 'Drive, or walk once you are out of the car. Arrow keys work too'],
    [K('Shift'), 'Boost'], [K('Space'), 'Brake'], [K('H'), 'Honk, and watch everyone hop'],
    [K('E Enter'), 'Get out of the car, get back in, or go through a door'],
    [K('Esc'), 'Leave a room, or close this menu'], [K('R'), 'Back to the spawn plaza'],
    [K('M'), 'Open the map and teleport'], ['<kbd>Wheel</kbd>', 'Zoom the camera in and out'],
    ['<kbd>Touch</kbd>', 'On a phone, the arrow and honk buttons sit bottom right'],
  ];
  panels.keys.innerHTML = `<h3>Controls</h3><p>Drive into things to knock them over. Nothing breaks for real.</p>
    <div class="keys">${keyRows.map(([k, t]) => `<div class="key"><div class="k">${k}</div><span>${t}</span></div>`).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn soft" type="button" data-stuck>I'm stuck: take me to spawn</button></div>`;
  panels.keys.querySelector('[data-stuck]').addEventListener('click', () => go('spawn'));

  /* Sound tab */
  panels.sound.innerHTML = `<h3>Sound</h3><p>Engine hum, honks, thuds and clinks. Everything is made in the browser, nothing is downloaded.</p>
    <div class="row"><button class="switch" type="button" role="switch" aria-checked="false"><i></i><span>Sound</span></button>
    <button class="btn soft" type="button" data-honk>Try the horn</button></div>`;
  const sw = panels.sound.querySelector('.switch');
  const syncSound = () => sw.setAttribute('aria-checked', String(!!ctx.sound?.on));
  sw.addEventListener('click', () => { try { ctx.sound.init(); ctx.hud.setSound(!ctx.sound.on); if(ctx.sound.on) ctx.sound.sfx.boing(); } catch(e){ console.warn('[menu] sound toggle failed', e); } syncSound(); });
  panels.sound.querySelector('[data-honk]').addEventListener('click', () => { try { ctx.sound.init(); ctx.sound.sfx.honk(1); } catch(e){ console.warn('[menu] honk failed', e); } });
  document.getElementById('sound')?.addEventListener('click', () => setTimeout(syncSound, 0));

  /* Open, close, tabs */
  let current = 'map', lastFocus = null, isOpen = false, closeTimer = 0;
  function select(id, focusTab = false){
    if(!tabs[id]) return;
    current = id;
    for(const k in tabs){ const on = k === id; tabs[k].setAttribute('aria-selected', String(on)); tabs[k].tabIndex = on ? 0 : -1; panels[k].hidden = !on; }
    if(id === 'sound') syncSound();
    if(focusTab) tabs[id].focus();
  }
  function open(tab = current){
    if(!state.started) return false;
    clearTimeout(closeTimer);
    select(tab);
    if(!isOpen){
      lastFocus = document.activeElement;
      isOpen = true; root.hidden = false; ctx.input?.clear();
      if(!painted || performance.now() - paintedAt > 20000) paintMap();
      placeYou();
      requestAnimationFrame(() => root.classList.add('on'));
      for(const b of [mapBtn, openBtn]) b.setAttribute('aria-expanded', 'true');
      try { ctx.sound.tone(660, 0.08, 'triangle', 0.06, 880); } catch {}
    }
    tabs[current].focus({ preventScroll:true });
    return true;
  }
  function close(restore = true){
    if(!isOpen) return;
    isOpen = false; hover(null); root.classList.remove('on');
    for(const b of [mapBtn, openBtn]) b.setAttribute('aria-expanded', 'false');
    closeTimer = setTimeout(() => { if(!isOpen) root.hidden = true; }, 230);
    if(restore && lastFocus?.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll:true });
    else ctx.renderer.domElement.focus?.({ preventScroll:true });
  }
  mapBtn.addEventListener('click', () => isOpen && current === 'map' ? close() : open('map'));
  openBtn.addEventListener('click', () => isOpen ? close() : open(current));
  closeBtn.addEventListener('click', () => close());
  document.getElementById('map')?.addEventListener('click', () => open('map'));
  root.addEventListener('pointerdown', e => { if(e.target === root) close(); });
  root.addEventListener('wheel', e => e.stopPropagation(), { passive:true });

  // Keyboard. The game listens on window in the bubble phase, so stopping keydown at document
  // while the dialog is open keeps WASD, Esc (leave room) and friends from reaching it.
  document.addEventListener('keydown', e => {
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    const typing = e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    const code = e.code || (e.key === 'Escape' || e.key === 'Esc' ? 'Escape' : e.key && e.key.length === 1 ? 'Key' + e.key.toUpperCase() : e.key === 'Tab' ? 'Tab' : '');
    if(!isOpen){
      if(code === 'KeyM' && !typing && !e.repeat && state.started && !wiping){ e.stopPropagation(); e.preventDefault(); open('map'); }
      return;
    }
    e.stopPropagation();
    if(code === 'Escape' || (code === 'KeyM' && !e.repeat)){ e.preventDefault(); close(); return; }
    if(code === 'Tab'){ trap(e); return; }
    if(e.target?.getAttribute?.('role') === 'tab' && /^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)){
      e.preventDefault();
      const ids = TABS.map(t => t[0]); let i = ids.indexOf(current);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
      select(ids[i], true);
    }
  });
  function trap(e){
    const f = [...box.querySelectorAll('button,a[href],[tabindex="0"]')].filter(n => n.tabIndex >= 0 && n.offsetParent !== null);
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    else if(!box.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
  }

  /* Hover sync between pins and list rows */
  let hot = null;
  function hover(id){
    if(hot === id) return;
    if(hot){ pins[hot]?.classList.remove('hot'); rows[hot]?.classList.remove('hot'); }
    hot = id && pins[id] ? id : null;
    if(hot){ pins[hot].classList.add('hot'); rows[hot].classList.add('hot'); }
  }

  /* Map projection: world x right, world +z down, same as the minimap */
  const E = () => (ctx.island?.radius || 96) + 10;
  const pct = v => ((v + E()) / (2 * E()) * 100).toFixed(3) + '%';
  function placePins(){ for(const p of places){ const q = posOf(p); if(!q) continue; pins[p.id].style.left = pct(q.x); pins[p.id].style.top = pct(q.z); } }
  let youKey = '';
  function placeYou(){
    const P = state.player; if(!P) return;
    const k = `${P.x.toFixed(1)},${P.z.toFixed(1)},${(P.heading || 0).toFixed(2)}`; if(k === youKey) return; youKey = k;
    you.style.left = pct(P.x); you.style.top = pct(P.z);
    you.style.transform = `rotate(${Math.PI - (P.heading || 0)}rad)`;
  }
  placePins();
  ctx.onUpdate(() => { if(isOpen) placeYou(); }, 100);

  /* The painted map: a real render of the island from straight above */
  let painted = false, paintedAt = 0;
  function paintMap(){
    const { THREE, renderer, scene, sun } = ctx;
    const hidden = [];
    const fog = scene.fog;
    const sc = sun?.shadow?.camera;
    const saved = sun && { pos:sun.position.clone(), tgt:sun.target.position.clone(), l:sc.left, r:sc.right, t:sc.top, b:sc.bottom, far:sc.far };
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    try {
      const e = E();
      const cam = new THREE.OrthographicCamera(-e, e, e, -e, 1, 400);
      cam.position.set(0, 220, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      // Clouds and anything else floating high would block the view; the car gets its own marker.
      for(const o of scene.children) if(o.visible && o.position.y > 26 && !o.isLight){ o.visible = false; hidden.push(o); }
      const carG = ctx.modules.car?.car?.group; if(carG?.visible){ carG.visible = false; hidden.push(carG); }
      scene.fog = null;
      if(sun){
        sun.position.set(70, 80, 46); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
        sc.left = sc.bottom = -e - 12; sc.right = sc.top = e + 12; sc.far = 300; sc.updateProjectionMatrix();
        sun.shadow.needsUpdate = true;
      }
      const S = Math.floor(Math.min(size.x, size.y, 1100) * pr);   // drawing-buffer pixels
      renderer.setViewport(0, 0, S / pr, S / pr);
      renderer.render(scene, cam);
      // Read the drawing buffer in this same task, before the browser composites and clears it.
      const bufH = renderer.domElement.height;
      const out = document.createElement('canvas'); out.width = out.height = S;
      const g = out.getContext('2d');
      g.filter = 'saturate(1.3) contrast(1.06)';
      g.drawImage(renderer.domElement, 0, bufH - S, S, S, 0, 0, S, S);
      g.filter = 'none';
      finishPaint(g, S);
      paint.width = paint.height = S; paint.getContext('2d').drawImage(out, 0, 0);
      painted = true; paintedAt = performance.now();
    } catch(err){
      console.warn('[menu] map render failed; using a plain map', err);
      plainMap();
    } finally {
      renderer.setViewport(0, 0, size.x, size.y);
      scene.fog = fog;
      for(const o of hidden) o.visible = true;
      if(saved){
        sun.position.copy(saved.pos); sun.target.position.copy(saved.tgt); sun.target.updateMatrixWorld();
        Object.assign(sc, { left:saved.l, right:saved.r, top:saved.t, bottom:saved.b, far:saved.far }); sc.updateProjectionMatrix();
        sun.shadow.needsUpdate = true;
      }
    }
  }
  // A little paint on top of the render: warmer, softer, with a vignette like a printed map.
  function finishPaint(g, S){
    g.save();
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = '#ffd9a0'; g.globalAlpha = .35; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const v = g.createRadialGradient(S/2, S/2, S*.36, S/2, S/2, S*.74);
    v.addColorStop(0, 'rgba(31,42,68,0)'); v.addColorStop(1, 'rgba(31,42,68,.30)');
    g.fillStyle = v; g.fillRect(0, 0, S, S);
    g.restore();
  }
  function plainMap(){
    const S = 512; paint.width = paint.height = S; const g = paint.getContext('2d');
    const k = S / 2 / E(), R = (ctx.island?.radius || 96) * k;
    g.fillStyle = '#7cc4d6'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#f3e3b8'; g.beginPath(); g.arc(S/2, S/2, R + 6, 0, 7); g.fill();
    g.fillStyle = '#a7d676'; g.beginPath(); g.arc(S/2, S/2, R, 0, 7); g.fill();
    painted = true; paintedAt = performance.now();
  }
  bus.on('ready', () => { try { paintMap(); } catch(e){ console.warn('[menu] map paint failed', e); } });

  /* Teleport with a halftone wipe */
  const wipe = el('canvas'); wipe.id = 'mn-wipe'; wipe.hidden = true; wipe.setAttribute('aria-hidden', 'true'); document.body.append(wipe);
  const wg = wipe.getContext('2d');
  let wiping = false, frozen = false;
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  function sizeWipe(){ const w = innerWidth, h = innerHeight; if(wipe.width !== w || wipe.height !== h){ wipe.width = w; wipe.height = h; } }
  // cover 0..1 is how much of the screen the dots cover. inward: dots grow outward from the origin;
  // outward: dots shrink starting at the origin, revealing the arrival.
  function drawWipe(cover, ox, oy, inward, place, confetti){
    sizeWipe(); const w = wipe.width, h = wipe.height;
    wg.clearRect(0, 0, w, h);
    const step = 28, maxR = step * .76, band = .35;
    const maxD = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy)) || 1;
    wg.fillStyle = '#1f2a44'; wg.beginPath();
    for(let y = step / 2; y < h + step; y += step){
      const odd = (Math.round((y - step / 2) / step) & 1) ? step / 2 : 0;
      for(let x = step / 2 - odd; x < w + step; x += step){
        const d = Math.hypot(x - ox, y - oy) / maxD;
        const local = inward ? (cover * (1 + band) - d) / band : (cover * (1 + band) - (1 - d)) / band;
        const r = ease(local) * maxR; if(r < .6) continue;
        wg.moveTo(x + r, y); wg.arc(x, y, r, 0, 6.2832);
      }
    }
    wg.fill();
    if(place && cover > .7){
      const a = Math.min(1, (cover - .7) / .25);
      wg.save(); wg.globalAlpha = a; wg.textAlign = 'center'; wg.textBaseline = 'middle';
      wg.font = '600 15px Fredoka, system-ui, sans-serif'; wg.fillStyle = '#fffaf0b3';
      wg.fillText(inward ? 'Teleporting to' : 'Welcome to', w / 2, h / 2 - 34);
      wg.font = '700 ' + Math.round(Math.min(48, w / 14)) + 'px Fredoka, system-ui, sans-serif'; wg.fillStyle = '#fffaf0';
      wg.fillText(place.name, w / 2, h / 2 + 8);
      const tw = Math.min(wg.measureText(place.name).width, w - 40);
      wg.fillStyle = place.color; roundRect(wg, w / 2 - tw / 2, h / 2 + 40, tw, 8, 4); wg.fill();
      wg.restore();
    }
    if(confetti) for(const c of confetti){ wg.save(); wg.translate(c.x, c.y); wg.rotate(c.r); wg.fillStyle = c.c; wg.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); wg.restore(); }
  }
  function roundRect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const tween = (ms, fn) => new Promise(res => { const t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / ms); if(!frozen) fn(k); if(k < 1) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });

  async function go(id){
    const place = places.find(p => p.id === id);
    if(!place){ console.warn(`[menu] unknown place "${id}"`); return false; }
    if(wiping) return false;
    wiping = true;
    let ox = innerWidth / 2, oy = innerHeight / 2;
    const r = pins[id]?.getBoundingClientRect?.();
    if(isOpen && r && r.width) { ox = r.left + r.width / 2; oy = r.top + r.height / 2; }
    close(false);
    ctx.renderer.domElement.focus?.({ preventScroll:true });
    try { ctx.sound.tone(330, 0.45, 'triangle', 0.07, 990); } catch {}
    let ok = false;
    try {
      wipe.hidden = false;
      if(state.reduced){
        wipe.style.opacity = 1; drawWipe(1, ox, oy, true, place);
        ok = doTeleport(id); await tween(500, () => {});
      } else {
        await tween(520, k => drawWipe(k, ox, oy, true, place));
        ok = doTeleport(id);
        await tween(420, () => drawWipe(1, ox, oy, true, place));   // hold while the camera settles
        try { ctx.sound.sfx.boing(); } catch {}
        const cx = innerWidth / 2, cy = innerHeight / 2 + 30;
        const cols = [place.color, '#fffaf0', '#f2b705', '#d6689a', '#5b6fd6', '#6fae4a'];
        const conf = Array.from({ length:46 }, (_, i) => { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 6 + Math.random() * 9; return { x:cx, y:cy, vx:Math.cos(a) * v, vy:Math.sin(a) * v, r:Math.random() * 6, vr:(Math.random() - .5) * .5, s:8 + Math.random() * 7, c:cols[i % cols.length] }; });
        let last = 0;
        await tween(1100, k => {
          const steps = Math.max(1, Math.round((k - last) * 1100 / 16.7)); last = k;
          for(let s = 0; s < steps; s++) for(const c of conf){ c.x += c.vx; c.y += c.vy; c.vy += .42; c.vx *= .985; c.r += c.vr; }
          drawWipe(1 - Math.min(1, k / .6), cx, cy, false, place, k > .05 ? conf : null);
        });
      }
    } catch(e){
      console.warn('[menu] teleport transition failed', e);
      if(!ok) ok = doTeleport(id);
    } finally {
      wg.clearRect(0, 0, wipe.width, wipe.height); wipe.hidden = true; wipe.style.opacity = '';
      wiping = false;
    }
    bus.emit('menu:teleported', { id, ok });
    return ok;
  }
  function doTeleport(id){
    try { return !!ctx.modes.teleport(id); } catch(e){ console.error('[menu] teleport failed', e); return false; }
  }

  /* Critic hooks */
  const api = {
    open: tab => open(tab || 'map'), close: () => close(), toggle: () => isOpen ? close() : open(current),
    isOpen: () => isOpen, tab: () => current, select: id => select(id),
    places: () => places.map(p => p.id),
    go, teleport: go,
    hover: id => { hover(id); return !!hot; },
    pinCenter: id => { const r = pins[id]?.getBoundingClientRect(); return r && r.width ? { x:r.left + r.width / 2, y:r.top + r.height * .45 } : null; },
    // Freeze the wipe at a given cover (0..1) for screenshots; null releases it.
    transitionAt: (cover, id = 'blueberry') => {
      const place = places.find(p => p.id === id) || places[0];
      if(cover == null){ frozen = false; wg.clearRect(0, 0, wipe.width, wipe.height); if(!wiping) wipe.hidden = true; return; }
      frozen = true; wipe.hidden = false; drawWipe(cover, innerWidth / 2, innerHeight / 2, true, place);
    },
    repaintMap: () => { paintMap(); return painted; },
  };
  ctx.expose('menu', api);
  return api;
}
