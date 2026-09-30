// Brush Up: an arcade cabinet game. Plaque spots keep popping up on four cartoon molars;
// scrub them off with the toothbrush before the 30 second timer runs out.
// Launch by id: ctx.modules.games.start('brush-up', { onEnd, onClose }).
import { kit, best, arcadeScreen, prng } from './ui.js';

export const meta = { title: 'Brush Up', zoneId: 'clinic', kind: 'arcade' };

const LIMIT = 30, MAXSPOTS = 14, BRUSH = 26;

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><path d="M10 9c4-3 7 0 10 0s6-3 10 0c3 3 2 9 0 13-1 3-1 12-4 12-2 0-2-8-6-8s-4 8-6 8c-3 0-3-9-4-12-2-4-3-10 0-13z" fill="#fff" stroke="#1f2a44" stroke-width="2"/><circle cx="16" cy="16" r="1.6" fill="#1f2a44"/><circle cx="24" cy="16" r="1.6" fill="#1f2a44"/><path d="M17 20q3 2.5 6 0" stroke="#1f2a44" stroke-width="1.6" fill="none"/></svg>`;

export function start(ctx, api){
  const K = kit(ctx, api);
  const scr = arcadeScreen(K, { title: meta.title, onClose: () => api.stop() });
  scr.setTitle('Brush Up'); K.dim(true);
  const { g, W, H, canvas } = scr;
  const rnd = prng(Date.now() & 0xffff);
  const TEETH = [0, 1, 2, 3].map(i => ({ x: 70 + i*128, y: 96, w: 116, h: 170, sparkle: 0 }));
  const S = { phase: 'intro', t0: 0, left: LIMIT, cleaned: 0, spots: [], spawn: 0, bx: W/2, by: H/2, down: false, keys: new Set(), foam: [], wig: 0, streak: 0 };

  function addSpot(){
    if(S.spots.length >= MAXSPOTS) return;
    const ti = Math.floor(rnd()*TEETH.length), T = TEETH[ti];
    for(let k=0;k<8;k++){
      const x = T.x + 22 + rnd()*(T.w - 44), y = T.y + 26 + rnd()*(T.h - 70);
      if(S.spots.some(s => Math.hypot(s.x - x, s.y - y) < 36)) continue;
      S.spots.push({ x, y, r: 15 + rnd()*9, hp: 1, ti, born: 0, seed: rnd()*6 }); return;
    }
  }
  function scrubAt(x, y, amount){
    for(const s of S.spots){
      if(Math.hypot(s.x - x, s.y - y) > s.r + BRUSH*0.7) continue;
      s.hp -= amount;
      if(rnd() < 0.5) S.foam.push({ x: s.x + (rnd() - .5)*s.r*2, y: s.y + (rnd() - .5)*s.r*2, r: 4 + rnd()*7, life: 0.8 });
    }
    const before = S.spots.length;
    S.spots = S.spots.filter(s => { if(s.hp > 0) return true; TEETH[s.ti].sparkle = 0.8; return false; });
    const n = before - S.spots.length;
    if(n > 0){ S.cleaned += n; S.streak += n; scr.setScore(String(S.cleaned)); K.sfx.good(S.streak); }
  }

  function tooth(T, t){
    const { x, y, w, h } = T; const dirty = S.spots.filter(s => s.ti === TEETH.indexOf(T)).length;
    g.save();
    g.beginPath();
    g.moveTo(x + 10, y + 20); g.bezierCurveTo(x + 10, y - 8, x + w*0.35, y - 4, x + w/2, y + 10); g.bezierCurveTo(x + w*0.65, y - 4, x + w - 10, y - 8, x + w - 10, y + 20);
    g.bezierCurveTo(x + w, y + h*0.55, x + w - 14, y + h*0.62, x + w - 20, y + h); g.lineTo(x + w*0.62, y + h); g.bezierCurveTo(x + w*0.58, y + h*0.75, x + w*0.42, y + h*0.75, x + w*0.38, y + h);
    g.lineTo(x + 20, y + h); g.bezierCurveTo(x + 14, y + h*0.62, x, y + h*0.55, x + 10, y + 20); g.closePath();
    g.fillStyle = '#fffdf6'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#1f2a44'; g.stroke();
    g.fillStyle = '#ffffffcc'; g.beginPath(); g.ellipse(x + 30, y + 40, 8, 18, -0.3, 0, 7); g.fill();
    // face: happy when clean, worried with plaque on it
    const fy = y + h*0.52, cx = x + w/2; g.fillStyle = '#1f2a44';
    for(const s of [-1, 1]){ g.beginPath(); g.arc(cx + s*18, fy, 4.5, 0, 7); g.fill(); }
    g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath();
    if(dirty >= 2) g.arc(cx, fy + 22, 10, Math.PI*1.15, Math.PI*1.85); else g.arc(cx, fy + 8, 10, Math.PI*0.15, Math.PI*0.85);
    g.stroke();
    g.fillStyle = '#ff8fab88'; for(const s of [-1, 1]){ g.beginPath(); g.ellipse(cx + s*30, fy + 10, 7, 4, 0, 0, 7); g.fill(); }
    if(T.sparkle > 0){ g.strokeStyle = '#ffd166'; g.lineWidth = 3; const k = T.sparkle; for(let i=0;i<4;i++){ const a = i*Math.PI/2 + t*3; g.beginPath(); g.moveTo(x + w - 18 + Math.cos(a)*6, y + 18 + Math.sin(a)*6); g.lineTo(x + w - 18 + Math.cos(a)*(6 + 12*k), y + 18 + Math.sin(a)*(6 + 12*k)); g.stroke(); } }
    g.restore();
  }
  function draw(t){
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffe3ea'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f4a7b9'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, 250); for(let x=0;x<=W;x+=32) g.quadraticCurveTo(x + 16, 236, x + 32, 250); g.lineTo(W, H); g.closePath(); g.fill();
    g.fillStyle = '#ee8fa6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 70); for(let x=0;x<=W;x+=32) g.quadraticCurveTo(x + 16, 84, x + 32, 70); g.lineTo(W, 0); g.closePath(); g.fill();
    for(const T of TEETH) tooth(T, t);
    for(const s of S.spots){
      const k = Math.min(1, s.born*5) * (0.45 + 0.55*s.hp);
      g.fillStyle = `rgba(190, 200, 60, ${0.85*k})`; g.beginPath();
      for(let i=0;i<=10;i++){ const a = i/10*Math.PI*2, rr = s.r*(0.8 + 0.2*Math.sin(a*3 + s.seed)); const px = s.x + Math.cos(a)*rr, py = s.y + Math.sin(a)*rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill(); g.fillStyle = `rgba(150, 160, 40, ${0.7*k})`; g.beginPath(); g.arc(s.x - s.r*0.3, s.y - s.r*0.2, s.r*0.25, 0, 7); g.arc(s.x + s.r*0.35, s.y + s.r*0.25, s.r*0.18, 0, 7); g.fill();
    }
    for(const f of S.foam){ g.fillStyle = `rgba(255,255,255,${f.life})`; g.strokeStyle = `rgba(180,200,255,${f.life})`; g.lineWidth = 1.5; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill(); g.stroke(); }
    // toothbrush
    const wob = (S.down || S.keys.has('Space')) ? Math.sin(t*40)*5 : 0;
    g.save(); g.translate(S.bx + wob, S.by); g.rotate(-0.5);
    g.fillStyle = '#3b4f9e'; g.beginPath(); g.roundRect ? g.roundRect(18, -9, 120, 18, 9) : g.rect(18, -9, 120, 18); g.fill(); g.strokeStyle = '#1f2a44'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fffaf0'; g.fillRect(-26, -12, 44, 14); g.strokeRect(-26, -12, 44, 14);
    g.fillStyle = '#4cc9f0'; for(let i=0;i<6;i++) g.fillRect(-24 + i*7, -24, 4, 12);
    g.restore();
    if(S.phase === 'intro' || S.phase === 'done'){ g.fillStyle = '#1f2a4433'; g.fillRect(0, 0, W, H); }
  }

  function go(){
    S.test = false; S.spots = []; S.cleaned = 0; S.streak = 0; S.spawn = 0; S.foam = []; S.phase = 'run'; S.t0 = performance.now(); scr.setScore('0');
    for(let i=0;i<5;i++) addSpot();
    K.capture(keys); K.sfx.go();
  }
  function end(){
    S.phase = 'done'; K.capture(null); S.down = false; S.keys.clear();
    const old = best.get('brush-up'); const isBest = !S.test && S.cleaned > 0 && (!old || S.cleaned > old.cleaned);
    if(isBest) best.set('brush-up', { cleaned: S.cleaned });
    if(isBest && S.cleaned > 0){ K.sfx.win(); K.confetti(60); } else K.sfx.good(2);
    api.end({ cleaned: S.cleaned, newBest: isBest });
    const grade = S.cleaned >= 30 ? 'Sparkling' : S.cleaned >= 18 ? 'Fresh' : S.cleaned >= 8 ? 'Getting there' : 'Needs a floss';
    K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#4fa3c7', eyebrow: S.test ? 'Test round, not saved' : isBest ? 'New high score' : 'Checkup done', title: grade,
      body: `${S.cleaned} plaque spots scrubbed in ${LIMIT} seconds. ${S.spots.length ? `${S.spots.length} still hanging on.` : 'Not a spot left.'}`,
      stats: [['Cleaned', String(S.cleaned), isBest], ['Left over', String(S.spots.length)], ['Best', isBest ? String(S.cleaned) : old ? String(old.cleaned) : '-']],
      primary: ['Brush again', go], secondary: ['Close', () => api.stop()] });
  }
  function keys(code, down){
    if(code === 'Escape' && down) return api.stop();
    if(down) S.keys.add(code); else S.keys.delete(code);
  }
  let last = null;
  const onDown = e => { if(S.phase !== 'run') return; S.down = true; const [x, y] = scr.local(e); S.bx = x; S.by = y; last = [x, y]; canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const onMove = e => { const [x, y] = scr.local(e); S.bx = x; S.by = y; if(S.phase === 'run' && S.down && last){ const d = Math.hypot(x - last[0], y - last[1]); scrubAt(x, y, Math.min(d, 40)*0.02); } last = [x, y]; };
  const onUp = () => { S.down = false; };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);

  K.card({ icon: ICON, color: '#4fa3c7', eyebrow: 'Arcade · pre-dental', title: 'Brush Up',
    body: `Plaque keeps popping up on these four molars. Scrub it off for ${LIMIT} seconds. Back and forth works best, just like real brushing.`,
    stats: [['Best', best.get('brush-up') ? String(best.get('brush-up').cleaned) : 'none yet'], ['Time', `${LIMIT} s`]],
    keys: 'Drag to scrub · or <kbd>&larr;</kbd><kbd>&uarr;</kbd><kbd>&darr;</kbd><kbd>&rarr;</kbd> move and hold <kbd>Space</kbd> · <kbd>Esc</kbd> quit',
    primary: ['Start brushing', go], secondary: ['Close', () => api.stop()] });

  return {
    update(dt, t){
      if(S.phase === 'run'){
        S.left = LIMIT - (performance.now() - S.t0)/1000;
        scr.setTime(Math.max(0, S.left).toFixed(0) + ' s');
        const el = LIMIT - S.left; S.spawn -= dt;
        if(S.spawn <= 0){ addSpot(); S.spawn = Math.max(0.55, 1.5 - el*0.03); }
        const k = S.keys, sp = 340*dt;
        const kx = (k.has('ArrowRight') || k.has('KeyD')) - (k.has('ArrowLeft') || k.has('KeyA')), ky = (k.has('ArrowDown') || k.has('KeyS')) - (k.has('ArrowUp') || k.has('KeyW'));
        S.bx = Math.max(10, Math.min(W - 10, S.bx + kx*sp)); S.by = Math.max(10, Math.min(H - 10, S.by + ky*sp));
        if(k.has('Space') || k.has('Enter')) scrubAt(S.bx, S.by, dt*2.2);
        if(!S.spots.length) S.streak = 0;
        if(S.left <= 0) end();
      } else if(S.phase === 'intro') scr.setTime(LIMIT + ' s');
      for(const s of S.spots) s.born += dt;
      for(const T of TEETH) T.sparkle = Math.max(0, T.sparkle - dt);
      S.foam = S.foam.filter(f => (f.life -= dt*1.4) > 0); if(S.foam.length > 80) S.foam.splice(0, S.foam.length - 80);
      draw(t);
    },
    stop(){ K.destroy(); },
    state: () => ({ phase: S.phase, cleaned: S.cleaned, spots: S.spots.length, left: +Math.max(0, S.left).toFixed(1) }),
    debug(cmd){
      if(cmd !== 'start') S.test = true;
      if(cmd === 'start' && (S.phase === 'intro' || S.phase === 'done')){ K.closeCard(); go(); return S.phase; }
      if(cmd === 'scrub' && S.phase === 'run'){ const s = S.spots[0]; if(s){ S.bx = s.x; S.by = s.y; for(let i=0;i<60;i++) scrubAt(s.x + Math.sin(i)*12, s.y, 0.02*20); } return S.cleaned; }
      if(cmd === 'end' && S.phase === 'run'){ S.t0 -= LIMIT*1000; return 'ending'; }
      return S.phase;
    },
  };
}
