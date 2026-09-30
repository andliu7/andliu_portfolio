// HUD: start screen, sound button, zone card, hint line, minimap.
export function createHud(ctx){
  const { state, sound, bus } = ctx;
  const $ = id => document.getElementById(id);
  const cardEl = $('card'), hintEl = $('hint'), mapEl = $('map'), mg = mapEl.getContext('2d');
  const soundBtn = $('sound'), soundLbl = $('sound-lbl');

  /* Sound button */
  function setSound(on){ sound.setOn(on); soundBtn.setAttribute('aria-pressed', String(on)); soundLbl.textContent = on ? 'Sound on' : 'Sound off'; }
  soundBtn.addEventListener('click', () => { sound.init(); setSound(!sound.on); if(sound.on) sound.sfx.boing(); });

  /* Start screen */
  function begin(withSound){
    if(state.started) return;
    sound.init(); setSound(withSound); if(withSound) sound.sfx.boing();
    state.started = true; $('start').hidden = true; ctx.renderer.domElement.focus?.();
    bus.emit('started', { withSound });
  }
  $('go-sound').addEventListener('click', () => begin(true));
  $('go-quiet').addEventListener('click', () => begin(false));

  /* Zone card */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  function showZone(z){
    if(z === state.activeZone) return; state.activeZone = z;
    bus.emit('zone', { zone:z });
    if(!z){ cardEl.classList.remove('on'); return; }
    cardEl.innerHTML = `<div class="eyebrow"><i style="background:${z.color}"></i>${esc(z.eyebrow)}</div><h2>${esc(z.title)}</h2><p class="role">${esc(z.role)}</p><ul>${z.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>${z.links.length ? `<div class="links">${z.links.map(([t,u]) => `<a href="${u}" target="_blank" rel="noreferrer">${esc(t)}</a>`).join('')}</div>` : ''}`;
    cardEl.classList.add('on');
  }

  /* Hint line, one per mode. Modules may replace a mode's hint with setHint(mode, html). */
  const hints = { drive: hintEl.innerHTML, walk: '<kbd>WASD</kbd> walk', interior: '<kbd>Esc</kbd> leave' };
  function setHint(mode, html){ hints[mode] = html; if(mode === state.mode) hintEl.innerHTML = html; }
  bus.on('mode', ({ to }) => { hintEl.innerHTML = hints[to] ?? ''; if(to === 'interior') showZone(null); });

  /* Minimap. Extra layers: push (g, toMap) => {} onto minimapLayers; toMap(x, z) -> [px, py]. */
  const minimapLayers = [];
  function drawMap(){
    const S = mapEl.width, R = ctx.island.radius, k = S/2/(R+8), P = state.player;
    const toMap = (x, z) => [S/2 + x*k, S/2 + z*k];
    mg.clearRect(0,0,S,S); mg.fillStyle = '#7cc4d6'; mg.fillRect(0,0,S,S);
    mg.fillStyle = '#a7d676'; mg.beginPath(); mg.arc(S/2, S/2, R*k, 0, 7); mg.fill();
    for(const z of ctx.zones){ mg.fillStyle = z.color; mg.beginPath(); mg.arc(S/2 + z.x*k, S/2 + z.z*k, 9, 0, 7); mg.fill(); }
    for(const layer of minimapLayers){ try { layer(mg, toMap); } catch(e){ console.error('[hud] minimap layer threw; removed', e); minimapLayers.splice(minimapLayers.indexOf(layer), 1); } }
    mg.save(); mg.translate(S/2 + P.x*k, S/2 + P.z*k); mg.rotate(-P.heading); mg.fillStyle = '#1f2a44'; mg.beginPath(); mg.moveTo(0, 14); mg.lineTo(-9, -9); mg.lineTo(9, -9); mg.closePath(); mg.fill(); mg.restore();
  }

  // Island-mode per-frame work: nearest zone card and minimap.
  function update(){
    const P = state.player;
    let near = null, best = 1e9;
    for(const z of ctx.zones){ const d = Math.hypot(P.x - z.x, P.z - z.z); if(d < 17 && d < best){ best = d; near = z; } }
    showZone(state.started ? near : null);
    drawMap();
  }

  return { begin, setSound, showZone, setHint, drawMap, update, minimapLayers,
    card: cardEl, hint: hintEl, menuRoot: $('menu-root'), gameRoot: $('game-root'), loading: $('loading') };
}
