// Skills Alley bowling: five rolls at the ten skill pins map.js stands at the end of the lane.
// setup() finds those pins (knockable props), adds a pin-count scoreboard and a start mat.
// Scoring is simple on purpose: every pin down is a point, a strike is all ten in one roll.
import { kit, best } from './ui.js';

export const meta = { title: 'Skills Alley Bowling', zoneId: 'skills', kind: 'world' };

const ROLLS = 5;
let B = null;

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><path d="M20 4c3 0 4 3 3.4 6-.4 2 .6 3.4 2 6 2.6 5 2.6 12-1 18H15.6c-3.6-6-3.6-13-1-18 1.4-2.6 2.4-4 2-6C16 7 17 4 20 4z" fill="#fff" stroke="#1f2a44" stroke-width="2"/><path d="M16.8 12.5h6.4M16.3 15h7.4" stroke="#e5484d" stroke-width="2"/></svg>`;

export function setup(ctx, reg){
  const { THREE, CANNON, helpers: H } = ctx;
  const zone = ctx.zones.find(z => z.id === 'skills'); if(!zone) return;
  const f = H.frameOf(zone), c = Math.cos(f.ang), s = Math.sin(f.ang);
  const local = (x, z) => { const dx = x - zone.x, dz = z - zone.z; return [dx*c - dz*s, dx*s + dz*c]; };
  const near = ctx.props.filter(p => Math.hypot(p.home[0] - zone.x, p.home[2] - zone.z) < 16);
  const pins = near.filter(p => p.body.mass === 0.5 && p.body.shapes[0] instanceof CANNON.Cylinder && p.obj.children.some(ch => ch.isSprite))
    .map(p => { const [lx, lz] = local(p.home[0], p.home[2]); return { p, lx, lz }; })
    .sort((a, b) => b.lz - a.lz || a.lx - b.lx);   // head pin first, then row by row
  const ball = near.find(p => p.body.shapes[0] instanceof CANNON.Sphere) || null;
  // Triangle slots for the board: row from distance behind the head pin, column from lx order.
  const rows = []; for(const q of pins){ const row = rows.find(r => Math.abs(r.lz - q.lz) < 0.3); row ? row.list.push(q) : rows.push({ lz: q.lz, list: [q] }); }
  rows.forEach((r, ri) => r.list.sort((a, b) => a.lx - b.lx).forEach((q, ci) => { q.row = ri; q.col = ci; q.n = r.list.length; }));

  const g = new THREE.Group(); g.position.set(zone.x, 0, zone.z); g.rotation.y = f.ang; ctx.scene.add(g);
  B = { zone, f, pins, ball, down: new Set(), rolls: [], redraw: () => {} };

  // Scoreboard on the lane's left, a pin triangle that lights up, like a real alley's pinsetter panel.
  const draw = (gc, w, h) => {
    gc.fillStyle = '#2a2140'; gc.fillRect(0, 0, w, h);
    gc.fillStyle = '#ffd166'; H.F(gc, 700, 30); gc.fillText('SKILLS ALLEY', 18, 40);
    gc.fillStyle = '#c9b5ff'; H.F(gc, 600, 15); gc.fillText(B.rolls.length || B.live ? `ROLL ${Math.min(B.rolls.length + 1, ROLLS)} OF ${ROLLS}` : 'DRIVE ONTO THE MAT TO BOWL', 18, 64);
    const cx = w*0.72, top = 34, sp = 30;
    for(const q of pins){
      const x = cx + (q.col - (q.n - 1)/2)*sp, y = top + (rows.length - 1 - q.row)*sp*0.9 + 10;
      const up = !B.down.has(q);
      gc.beginPath(); gc.arc(x, y, 11, 0, 7); gc.fillStyle = up ? '#fffaf0' : '#4a3d66'; gc.fill();
      if(up){ gc.strokeStyle = '#e5484d'; gc.lineWidth = 3; gc.beginPath(); gc.arc(x, y, 6, 0, 7); gc.stroke(); }
    }
    const bw = 42, y0 = h - 70;
    for(let i=0;i<ROLLS;i++){
      const x = 18 + i*(bw + 6), v = B.rolls[i];
      gc.fillStyle = v === 10 ? '#ffd166' : '#fffaf0'; gc.fillRect(x, y0, bw, 40);
      gc.fillStyle = '#2a2140'; H.F(gc, 700, 22); gc.textAlign = 'center'; gc.fillText(v == null ? '' : v === 10 ? 'X' : String(v), x + bw/2, y0 + 29); gc.textAlign = 'left';
    }
    const total = B.rolls.reduce((a, b) => a + b, 0), bst = best.get('bowling')?.total;
    gc.fillStyle = '#fffaf0'; H.F(gc, 700, 26); gc.fillText(String(total), 18 + ROLLS*(bw + 6) + 6, y0 + 30);
    gc.fillStyle = '#c9b5ff'; H.F(gc, 600, 14); gc.fillText(bst != null ? `BEST ${bst}` : 'NO BEST YET', 18 + ROLLS*(bw + 6) + 6, y0 - 8);
  };
  H.board(g, -5.4, -3, 3.8, 2.3, draw, { rot: 0.3, frame: '#2a2140' });
  { const [bx, bz] = f.w(-5.4, -3); ctx.helpers.solidBox(bx, bz, f.ang + 0.3, 4.1, 0.5, 3); }
  const screen = g.children[g.children.length - 1].children.find(ch => ch.material?.map?.isCanvasTexture);
  B.redraw = () => { if(!screen) return; const t = screen.material.map, cv = t.image, gc = cv.getContext('2d'); gc.clearRect(0, 0, cv.width, cv.height); draw(gc, cv.width, cv.height); t.needsUpdate = true; };

  // Start mat beside the lane head.
  if(!pins.length) return;
  const mat = H.canvasTex(256, 256, (gc) => {
    gc.fillStyle = '#e98a5a'; gc.beginPath(); gc.arc(128, 128, 124, 0, 7); gc.fill();
    gc.strokeStyle = '#fffaf0'; gc.lineWidth = 8; gc.setLineDash([18, 12]); gc.beginPath(); gc.arc(128, 128, 108, 0, 7); gc.stroke();
    gc.fillStyle = '#fffaf0'; H.F(gc, 700, 56); gc.textAlign = 'center'; gc.fillText('BOWL', 128, 150);
  });
  const [mx, mz] = f.w(-4.2, 9);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ map: mat.tex, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pad.rotation.set(-Math.PI/2, 0, f.ang); pad.position.set(mx, 0.09, mz); pad.receiveShadow = true; ctx.scene.add(pad);
  reg.station({ id: 'bowling', x: mx, z: mz, r: 2.1, when: m => m === 'drive' || m === 'walk' });
  B.redraw();
}

function isDown(q){
  const b = q.p.body, h = q.p.home, qu = b.quaternion;
  const upY = 1 - 2*(qu.x*qu.x + qu.z*qu.z);
  return upY < 0.8 || Math.hypot(b.position.x - h[0], b.position.z - h[2]) > 0.6 || b.position.y < h[1] - 0.25;
}
function resetProp(p){
  const b = p.body, h = p.home;
  b.position.set(h[0], h[1], h[2]); b.quaternion.setFromEuler(0, h[3], 0); b.velocity.setZero(); b.angularVelocity.setZero(); b.wakeUp();
  p.obj.position.set(h[0], h[1], h[2]); p.obj.quaternion.copy(b.quaternion);
}

export function start(ctx, api){
  const K = kit(ctx, api);
  if(!B?.pins.length){
    K.card({ icon: ICON, color: '#e98a5a', eyebrow: 'Skills Alley', title: 'The pins wandered off', body: 'This alley has no pins right now. Try again after a reload.', secondary: ['Close', () => api.stop()] });
    return { stop(){ K.destroy(); }, state: () => ({ phase: 'unavailable' }) };
  }
  const S = { phase: 'intro', roll: 0, settle: 0, cap: 0, wait: 0, total: 0, strikes: 0, grace: 0 };
  const { zone, f, pins, ball } = B;
  const offs = [];

  function resetLane(placeCar){
    pins.forEach(q => resetProp(q.p)); if(ball) resetProp(ball);
    B.down.clear();
    if(placeCar && ctx.state.mode === 'drive'){
      // Line the car up behind the ball, aimed at the middle of the pins, whatever way the lane runs.
      const cx = pins.reduce((a, q) => a + q.p.home[0], 0)/pins.length, cz = pins.reduce((a, q) => a + q.p.home[2], 0)/pins.length;
      const [ox, oz] = ball ? [ball.home[0], ball.home[2]] : f.w(0, 3.5); let dx = ox - cx, dz = oz - cz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      ctx.modes.placePlayer(ox + dx*6.5, oz + dz*6.5, Math.atan2(-dx, -dz));
    }
    B.redraw();
  }
  function hud(){ K.hud.set('roll', `${Math.min(S.roll + 1, ROLLS)}/${ROLLS}`); K.hud.set('down', String(B.down.size)); K.hud.set('total', String(S.total)); }
  function intro(){
    S.phase = 'intro'; K.hud.show(false); B.live = false;
    const b = best.get('bowling');
    K.card({ icon: ICON, color: '#e98a5a', eyebrow: 'Skills Alley', title: 'Knock down the skills',
      body: `Five rolls at ten skill pins. Shove the big blue ball down the lane, or bump into the pins yourself. Every pin down is a point.`,
      stats: [['Best', b?.total != null ? `${b.total}/50` : 'none yet'], ['Rolls', String(ROLLS)]],
      keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive · <kbd>Esc</kbd> quit',
      primary: ['Bowl', go], secondary: ['Not now', () => api.stop()] });
  }
  function go(){
    if(ctx.state.mode === 'interior') ctx.modes.exitInterior();
    if(ctx.state.mode !== 'drive') ctx.modes.setMode('drive');
    B.rolls = []; S.roll = 0; S.total = 0; S.strikes = 0; B.live = true; S.test = false;
    K.hud.chips([['roll', 'Roll', true], ['down', 'Pins down'], ['total', 'Score']]); K.hud.show(true);
    ready();
  }
  function ready(){ resetLane(true); S.phase = 'ready'; S.settle = 0; S.cap = 0; S.grace = 0.8; hud(); K.big(`Roll ${S.roll + 1}`, true); K.hint('Drive into the ball or the pins · <kbd>Esc</kbd> quit'); }
  function result(){
    const n = B.down.size; B.rolls.push(n); S.total += n; if(n === pins.length) S.strikes++;
    S.phase = 'result'; S.wait = 2.2; hud(); B.redraw();
    if(n === pins.length){ K.big('STRIKE!'); K.sfx.win(); K.confetti(50); } else if(n === 0){ K.big('Gutter ball', true); K.sfx.bad(); } else { K.big(`${n} pin${n > 1 ? 's' : ''}`, true); K.sfx.good(n); }
  }
  function end(){
    S.phase = 'done'; K.hint(null); B.live = false; K.hud.show(false);
    const old = best.get('bowling'); const isBest = !S.test && S.total > 0 && (old?.total == null || S.total > old.total);
    if(isBest) best.set('bowling', { total: S.total, strikes: S.strikes });
    B.redraw(); if(isBest) K.confetti(70);
    api.end({ total: S.total, strikes: S.strikes, newBest: isBest });
    K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#e98a5a', eyebrow: S.test ? 'Test round, not saved' : isBest ? 'New high score' : 'Game over', title: `${S.total} of ${pins.length*ROLLS}`,
      body: S.strikes ? `${S.strikes} strike${S.strikes > 1 ? 's' : ''}. The skills are back on their feet for the next bowler.` : 'No strikes this time. Line the ball up with the head pin.',
      stats: [['Score', String(S.total), isBest], ['Strikes', String(S.strikes)], ['Best', isBest ? String(S.total) : old?.total != null ? String(old.total) : '-']],
      primary: ['Bowl again', go], secondary: ['Done', () => api.stop()] });
  }
  const quit = () => { if(S.phase !== 'intro' && S.phase !== 'done') api.stop(); };
  offs.push(ctx.bus.on('action:exit', quit), ctx.bus.on('teleport', quit), ctx.bus.on('interior:enter', quit));

  intro();
  return {
    update(dt){
      if(S.phase === 'ready' || S.phase === 'rolling'){
        const P = ctx.state.player;
        // Workaround: the car's kinematic body can fall asleep while parked, and a sleeping body
        // never touches the pins. Keep it awake while it moves during a game.
        const cb = ctx.modules.car?.car?.body; if(cb && cb.sleepState !== 0 && Math.abs(P.speed || 0) > 0.05) cb.wakeUp();
        if(Math.hypot(P.x - zone.x, P.z - zone.z) > 45){ api.stop(); return; }
        let changed = false;
        for(const q of pins){ if(!B.down.has(q) && isDown(q)){ B.down.add(q); changed = true; } }
        if(changed){ hud(); B.redraw(); ctx.sound?.sfx?.clink?.(3); }
        // Freshly reset pins wobble for a moment; only a real hit (a pin down, a pin moving fast, or the ball rolled) starts the roll.
        if(S.phase === 'ready'){ S.grace -= dt; if(S.grace > 0){ if(changed){ B.down.clear(); B.redraw(); hud(); } }
          else if(B.down.size || pins.some(q => q.p.body.velocity.lengthSquared() > 0.5) || (ball && Math.hypot(ball.body.position.x - ball.home[0], ball.body.position.z - ball.home[2]) > 1.5)){ S.phase = 'rolling'; S.settle = 0; S.cap = 0; } }
        if(S.phase === 'rolling'){
          S.cap += dt;
          const moving = pins.some(q => q.p.body.velocity.lengthSquared() > 0.04 || q.p.body.angularVelocity.lengthSquared() > 0.1) || (ball && ball.body.velocity.lengthSquared() > 0.5 && S.cap < 5);
          S.settle = moving ? 0 : S.settle + dt;
          if(S.settle > 1.2 || S.cap > 7 || (B.down.size === pins.length && S.cap > 1.6)) result();
        }
      } else if(S.phase === 'result'){
        S.wait -= dt;
        if(S.wait <= 0){ S.roll++; if(S.roll >= ROLLS) end(); else ready(); }
      }
    },
    stop(){ offs.forEach(o => o?.()); B.live = false; if(S.phase !== 'intro') resetLane(false); B.rolls = []; B.redraw(); K.destroy(); },
    state: () => ({ phase: S.phase, roll: S.roll + 1, rolls: B.rolls.slice(), down: B.down.size, total: S.total, pins: pins.length }),
    debug(cmd){
      if(cmd !== 'start') S.test = true;
      if(cmd === 'start' && (S.phase === 'intro' || S.phase === 'done')){ K.closeCard(); go(); return S.phase; }
      if(cmd === 'knock' && (S.phase === 'ready' || S.phase === 'rolling')){
        // A test hook: shove every pin as if the ball came straight down the lane.
        const dx = -Math.sin(f.ang), dz = -Math.cos(f.ang);
        pins.forEach((q, i) => { if(i % 4 === 3) return; q.p.body.wakeUp(); q.p.body.velocity.set(dx*6, 2, dz*6); q.p.body.angularVelocity.set(dz*8, 0, -dx*8); });
        return 'knocked';
      }
      return S.phase;
    },
  };
}
