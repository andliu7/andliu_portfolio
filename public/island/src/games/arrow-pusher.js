// Arrow Pusher: an arcade cabinet game. Each round shows one mechanism step; drag the curved
// arrow from the electrons to the atom they attack. Six rounds against a 60 second clock.
// Launch by id: ctx.modules.games.start('arrow-pusher', { onEnd, onClose }).
import { kit, best, arcadeScreen } from './ui.js';

export const meta = { title: 'Arrow Pusher', zoneId: 'blueberry', kind: 'arcade' };

const LIMIT = 60;
const COL = { C:'#4b5675', O:'#e5484d', N:'#3b4f9e', Br:'#a0522d', Cl:'#2f9e8f', H:'#9aa3b8', Mg:'#8a5cc2' };

// Atoms: [element, x, y, charge?]. Bonds: [a, b, order]. tail: {atom, dx, dy} lone pair, or {bond:[a, b]}.
// targets: atom indexes the player may aim at; answer: the right one. after: the arrow that follows.
const ROUNDS = [
  { name:'SN2', what:'Hydroxide meets bromomethane',
    atoms:[['H',92,200],['O',150,200,'-'],['C',410,200],['H',410,140],['H',372,248],['H',448,248],['Br',510,200]],
    bonds:[[0,1,1],[2,3,1],[2,4,1],[2,5,1],[2,6,1]], lps:[[1,0,-26],[1,0,26],[1,22,-14]], tail:{ atom:1, dx:22, dy:-14 },
    targets:[2,3,6], answer:2, after:{ bond:[2,6], to:6 },
    why:'The oxygen lone pair attacks the carbon from the back side, and bromide leaves with the C-Br electrons.' },
  { name:'Acid and base', what:'Ammonia meets hydrogen chloride',
    atoms:[['N',160,200],['H',118,166],['H',118,234],['H',160,252],['H',400,200],['Cl',480,200]],
    bonds:[[0,1,1],[0,2,1],[0,3,1],[4,5,1]], lps:[[0,24,-8]], tail:{ atom:0, dx:24, dy:-8 },
    targets:[4,5], answer:4, after:{ bond:[4,5], to:5 },
    why:'The nitrogen lone pair grabs the proton, and chloride keeps the old H-Cl bonding pair.' },
  { name:'Carbonyl addition', what:'Cyanide meets acetone',
    atoms:[['N',80,210],['C',150,210,'-'],['C',420,220],['O',420,138],['C',356,262],['C',484,262]],
    bonds:[[0,1,3],[2,3,2],[2,4,1],[2,5,1]], lps:[[1,24,0]], tail:{ atom:1, dx:24, dy:0 },
    targets:[2,3,4], answer:2, after:{ bond:[2,3], to:3 },
    why:'Cyanide adds to the carbonyl carbon, the partial positive end of C=O, and the pi electrons move onto oxygen.' },
  { name:'Carbocation capture', what:'Water meets the tert-butyl cation',
    atoms:[['O',150,205],['H',112,172],['H',112,238],['C',420,205,'+'],['C',420,132],['C',358,248],['C',482,248]],
    bonds:[[0,1,1],[0,2,1],[3,4,1],[3,5,1],[3,6,1]], lps:[[0,22,-12],[0,22,14]], tail:{ atom:0, dx:22, dy:-12 },
    targets:[3,4,5], answer:3, after:null,
    why:'The positive carbon has an empty p orbital, so the oxygen lone pair goes straight to it.' },
  { name:'Grignard addition', what:'Methylmagnesium bromide meets formaldehyde',
    atoms:[['C',100,215],['Mg',184,215],['Br',262,215],['C',440,225],['O',440,145],['H',396,272],['H',484,272]],
    bonds:[[0,1,1],[1,2,1],[3,4,2],[3,5,1],[3,6,1]], lps:[], tail:{ bond:[0,1] },
    targets:[3,4,5], answer:3, after:{ bond:[3,4], to:4 },
    why:'The C-Mg bond acts as a carbon nucleophile, so its electrons add to the carbonyl carbon.' },
  { name:'Alkene addition', what:'Ethene meets hydrogen bromide',
    atoms:[['C',110,215],['C',196,215],['H',72,176],['H',72,254],['H',234,176],['H',234,254],['H',410,210],['Br',496,210]],
    bonds:[[0,1,2],[0,2,1],[0,3,1],[1,4,1],[1,5,1],[6,7,1]], lps:[], tail:{ bond:[0,1] },
    targets:[6,7], answer:6, after:{ bond:[6,7], to:7 },
    why:'The pi bond reaches for the proton on HBr, and bromide leaves with the H-Br electrons.' },
];

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><path d="M8 28C10 12 26 8 32 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M34 12l-1 9-8-3z" fill="#fff"/><circle cx="8" cy="31" r="3" fill="#ffd166"/></svg>`;

export function start(ctx, api){
  const K = kit(ctx, api);
  const S = { phase: 'intro', round: 0, score: 0, right: 0, t0: 0, left: LIMIT, roundT0: 0, drag: null, sel: 0, anim: 0, verdict: null, shake: 0, wait: 0 };
  const scr = arcadeScreen(K, { title: meta.title, onClose: () => api.stop() });
  scr.setTitle('Arrow Pusher'); K.dim(true);
  const { g, W, H, canvas } = scr;
  // The dotted paper background never changes, so it is painted once and copied each frame.
  const bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
  { const b = bg.getContext('2d'); b.scale(canvas.width/W, canvas.height/H); const grd = b.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#f6f0ff'); grd.addColorStop(1, '#e7f3ff'); b.fillStyle = grd; b.fillRect(0, 0, W, H);
    b.fillStyle = '#e3dcf2'; for(let x=20;x<W;x+=40) for(let y=20;y<H;y+=40){ b.beginPath(); b.arc(x, y, 1.6, 0, 7); b.fill(); } }

  const R = () => ROUNDS[S.round];
  const tailPt = r => { const t = r.tail; if(t.atom != null){ const a = r.atoms[t.atom]; return [a[1] + t.dx, a[2] + t.dy]; } const [a, b] = t.bond.map(i => r.atoms[i]); return [(a[1] + b[1])/2, (a[2] + b[2])/2 - 10]; };
  const nearest = (x, y) => { let best = null, bd = 40; for(const i of R().targets){ const a = R().atoms[i]; const d = Math.hypot(a[1] - x, a[2] - y); if(d < bd){ bd = d; best = i; } } return best; };

  function curve(x1, y1, x2, y2, color, width, progress = 1, lift = 70){
    const mx = (x1 + x2)/2, my = Math.min(y1, y2) - lift;
    const N = 32, end = Math.max(1, Math.floor(N*progress)); let px = x1, py = y1, qx = x1, qy = y1;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1);
    for(let i=1;i<=end;i++){ const t = i/N; qx = px; qy = py; px = (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2; py = (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2; g.lineTo(px, py); }
    g.stroke();
    const a = Math.atan2(py - qy, px - qx); g.beginPath(); g.moveTo(px + Math.cos(a)*4, py + Math.sin(a)*4); g.lineTo(px - 16*Math.cos(a - 0.5), py - 16*Math.sin(a - 0.5)); g.lineTo(px - 16*Math.cos(a + 0.5), py - 16*Math.sin(a + 0.5)); g.closePath(); g.fill();
  }

  function draw(t){
    g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0, W, H);
    const r = R(); if(!r) return;
    g.save(); if(S.shake > 0) g.translate(Math.sin(t*70)*S.shake*8, 0);
    g.fillStyle = '#1f2a44'; g.font = '700 22px Fredoka, sans-serif'; g.textAlign = 'left'; g.fillText(`${S.round + 1}. ${r.name}`, 22, 38);
    g.fillStyle = '#4b5675'; g.font = '600 15px Nunito, sans-serif'; g.fillText(r.what, 22, 60);
    // bonds
    for(const [a, b, o] of r.bonds){
      const A = r.atoms[a], B = r.atoms[b]; const dx = B[1] - A[1], dy = B[2] - A[2], l = Math.hypot(dx, dy), nx = -dy/l*5, ny = dx/l*5;
      g.strokeStyle = '#1f2a44'; g.lineWidth = 4; g.lineCap = 'round';
      const offs = o === 1 ? [0] : o === 2 ? [-1, 1] : [-1.6, 0, 1.6];
      for(const k of offs){ g.beginPath(); g.moveTo(A[1] + nx*k, A[2] + ny*k); g.lineTo(B[1] + nx*k, B[2] + ny*k); g.stroke(); }
    }
    // atoms
    const hover = S.drag?.hover ?? (S.phase === 'aim' && S.drag == null ? r.targets[S.sel] : null);
    for(let i=0;i<r.atoms.length;i++){
      const [el, x, y, ch] = r.atoms[i]; const rad = el === 'H' ? 15 : 21;
      if(S.phase === 'aim' && r.targets.includes(i)){ g.strokeStyle = i === hover ? '#ffd166' : '#ffd16688'; g.lineWidth = i === hover ? 6 : 3; g.setLineDash(i === hover ? [] : [5, 5]); g.beginPath(); g.arc(x, y, rad + 8 + (i === hover ? Math.sin(t*8)*2 : 0), 0, 7); g.stroke(); g.setLineDash([]); }
      if(S.verdict && i === r.answer){ g.fillStyle = '#06d6a055'; g.beginPath(); g.arc(x, y, rad + 12, 0, 7); g.fill(); }
      g.fillStyle = COL[el] || '#4b5675'; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      g.strokeStyle = '#1f2a44'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.font = `700 ${el.length > 1 ? 15 : 18}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(el, x, y + 1);
      if(ch){ g.fillStyle = ch === '+' ? '#e5484d' : '#3b4f9e'; g.beginPath(); g.arc(x + rad*0.85, y - rad*0.85, 10, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 16px Fredoka, sans-serif'; g.fillText(ch === '+' ? '+' : '−', x + rad*0.85, y - rad*0.85 + 1); }
      g.textBaseline = 'alphabetic';
    }
    for(const [ai, dx, dy] of r.lps){ const a = r.atoms[ai]; const l = Math.hypot(dx, dy), px = -dy/l*5, py = dx/l*5; g.fillStyle = '#1f2a44'; for(const s of [-1, 1]){ g.beginPath(); g.arc(a[1] + dx + px*s, a[2] + dy + py*s, 3, 0, 7); g.fill(); } }
    // tail glow, then the live arrow
    const [tx, ty] = tailPt(r);
    if(S.phase === 'aim'){ g.strokeStyle = '#3b4f9e'; g.lineWidth = 3; g.beginPath(); g.arc(tx, ty, 13 + Math.sin(t*6)*2.5, 0, 7); g.stroke(); }
    if(S.drag){ curve(tx, ty, S.drag.x, S.drag.y, '#3b4f9e', 5, 1, Math.max(40, Math.abs(S.drag.x - tx)*0.3)); }
    else if(S.phase === 'aim' && hover != null){ const a = r.atoms[hover]; g.globalAlpha = 0.35; g.setLineDash([8, 8]); curve(tx, ty, a[1], a[2] - (a[0] === 'H' ? 17 : 23), '#3b4f9e', 4, 1, Math.max(40, Math.abs(a[1] - tx)*0.3)); g.setLineDash([]); g.globalAlpha = 1; }
    if(S.verdict){
      const tgt = r.atoms[S.verdict.target]; const ok = S.verdict.ok;
      curve(tx, ty, tgt[1], tgt[2] - (tgt[0] === 'H' ? 17 : 23), ok ? '#06a37a' : '#e5484d', 5, Math.min(1, S.anim*3), Math.max(40, Math.abs(tgt[1] - tx)*0.3));
      if(ok && r.after && S.anim > 0.35){ const [a, b] = r.after.bond.map(i => r.atoms[i]); const to = r.atoms[r.after.to]; const sx = (a[1] + b[1])/2, sy = (a[2] + b[2])/2 + 8; curve(sx, sy, to[1] + 12, to[2] + 22, '#8a5cc2', 4, Math.min(1, (S.anim - 0.35)*3), -36); }
    }
    g.restore();
    // footer
    g.fillStyle = '#fffaf0ee'; g.fillRect(0, H - 64, W, 64);
    g.textAlign = 'left'; g.font = '600 15px Nunito, sans-serif';
    if(S.verdict){ g.fillStyle = S.verdict.ok ? '#06835f' : '#c0392b'; g.font = '700 16px Fredoka, sans-serif'; g.fillText(S.verdict.ok ? 'Nice push!' : 'Not quite.', 18, H - 38); g.fillStyle = '#1f2a44'; g.font = '600 13.5px Nunito, sans-serif'; wrap(r.why, 110, H - 38, W - 128, 18); }
    else { g.fillStyle = '#1f2a44'; g.fillText('Drag from the glowing electrons to the atom they attack.', 18, H - 38); g.fillStyle = '#4b5675'; g.font = '500 13px Nunito, sans-serif'; g.fillText('Keys: Left and Right pick an atom, Enter pushes the arrow.', 18, H - 17); }
  }
  function wrap(text, x, y, w, lh){ const words = text.split(' '); let line = ''; for(const wd of words){ const test = line ? line + ' ' + wd : wd; if(g.measureText(test).width > w && line){ g.fillText(line, x, y); y += lh; line = wd; } else line = test; } g.fillText(line, x, y); }

  function fire(target){
    if(S.phase !== 'aim' || target == null) return;
    S.drag = null; const ok = target === R().answer; S.verdict = { target, ok }; S.anim = 0; S.phase = 'verdict'; S.wait = ok ? 2.4 : 3.2;
    if(ok){ const secs = (performance.now() - S.roundT0)/1000; S.right++; S.score += 100 + Math.round(Math.max(0, 12 - secs)*5); K.sfx.good(S.right + 2); }
    else { S.shake = 0.4; K.sfx.bad(); }
    scr.setScore(String(S.score));
  }
  function next(){ S.round++; S.verdict = null; S.drag = null; S.sel = 0; if(S.round >= ROUNDS.length) end(); else { S.phase = 'aim'; S.roundT0 = performance.now(); } }
  function go(){ S.test = false; S.round = 0; S.score = 0; S.right = 0; S.verdict = null; S.sel = 0; S.phase = 'aim'; S.t0 = S.roundT0 = performance.now(); scr.setScore('0'); K.capture(keys); K.sfx.go(); }
  function end(){
    S.phase = 'done'; K.capture(null);
    const old = best.get('arrow-pusher'); const isBest = !S.test && S.score > 0 && (!old || S.score > old.score);
    if(isBest) best.set('arrow-pusher', { score: S.score, right: S.right });
    if(isBest && S.score > 0){ K.sfx.win(); K.confetti(60); }
    api.end({ score: S.score, right: S.right, rounds: ROUNDS.length, newBest: isBest });
    K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#8a5cc2', eyebrow: S.test ? 'Test round, not saved' : isBest ? 'New high score' : 'Mechanisms done', title: `${S.right} of ${ROUNDS.length} arrows right`,
      body: S.right === ROUNDS.length ? 'Every arrow started at the electrons and landed on the right atom.' : 'Arrows always start at electrons: a lone pair or a bond. They end where those electrons go.',
      stats: [['Score', String(S.score), isBest], ['Right', `${S.right}/${ROUNDS.length}`], ['Best', isBest ? String(S.score) : old ? String(old.score) : '-']],
      primary: ['Play again', go], secondary: ['Close', () => api.stop()] });
  }
  function keys(code, down){
    if(!down) return;
    if(code === 'Escape') return api.stop();
    if(S.phase === 'aim'){
      const n = R().targets.length;
      if(code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') S.sel = (S.sel + 1) % n;
      else if(code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') S.sel = (S.sel + n - 1) % n;
      else if(/^Digit[1-9]$/.test(code) && +code.slice(5) <= n) S.sel = +code.slice(5) - 1;
      else if(code === 'Enter' || code === 'Space') fire(R().targets[S.sel]);
    } else if(S.phase === 'verdict' && (code === 'Enter' || code === 'Space') && S.anim > 0.5) next();
  }
  const onDown = e => { if(S.phase === 'verdict' && S.anim > 0.5){ next(); return; } if(S.phase !== 'aim') return; const [x, y] = scr.local(e); S.drag = { x, y, hover: nearest(x, y) }; canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const onMove = e => { if(!S.drag) return; const [x, y] = scr.local(e); S.drag.x = x; S.drag.y = y; S.drag.hover = nearest(x, y); };
  const onUp = () => { if(!S.drag) return; const h = S.drag.hover; S.drag = null; if(h != null) fire(h); };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { S.drag = null; });

  K.card({ icon: ICON, color: '#8a5cc2', eyebrow: 'Arcade · organic chemistry', title: 'Arrow Pusher',
    body: `Six mechanism steps, ${LIMIT} seconds. Drag each curved arrow from the electrons to the atom they attack. Faster pushes score more.`,
    stats: [['Best', best.get('arrow-pusher') ? String(best.get('arrow-pusher').score) : 'none yet'], ['Rounds', String(ROUNDS.length)]],
    keys: 'Drag with mouse or finger · <kbd>&larr;</kbd><kbd>&rarr;</kbd> pick · <kbd>Enter</kbd> push · <kbd>Esc</kbd> quit',
    primary: ['Start', go], secondary: ['Close', () => api.stop()] });

  return {
    update(dt, t){
      if(S.phase === 'aim' || S.phase === 'verdict'){
        S.left = LIMIT - (performance.now() - S.t0)/1000;
        scr.setTime(Math.max(0, S.left).toFixed(0) + ' s');
        if(S.left <= 0){ end(); }
      } else if(S.phase === 'intro') scr.setTime(LIMIT + ' s');
      if(S.phase === 'verdict'){ S.anim += dt; S.wait -= dt; if(S.wait <= 0) next(); }
      if(S.shake > 0) S.shake = Math.max(0, S.shake - dt);
      draw(t);
    },
    stop(){ K.destroy(); },
    state: () => ({ phase: S.phase, round: S.round + 1, rounds: ROUNDS.length, score: S.score, right: S.right, left: +Math.max(0, S.left ?? LIMIT).toFixed(1) }),
    debug(cmd){
      if(cmd !== 'start') S.test = true;
      if(cmd === 'start' && (S.phase === 'intro' || S.phase === 'done')){ K.closeCard(); go(); return S.phase; }
      if(cmd === 'solve' && S.phase === 'aim'){ fire(R().answer); return S.score; }
      if(cmd === 'miss' && S.phase === 'aim'){ fire(R().targets.find(i => i !== R().answer)); return S.score; }
      if(cmd === 'drag' && S.phase === 'aim'){ const a = R().atoms[R().answer]; S.drag = { x: a[1] - 30, y: a[2] - 40, hover: R().answer }; return 'dragging'; }
      if(cmd === 'end' && S.phase !== 'done'){ end(); return S.score; }
      return S.phase;
    },
  };
}
