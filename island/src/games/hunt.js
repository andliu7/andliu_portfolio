// Blueberry Hunt: twelve giant blueberries hide round the island; collect them before the clock runs out.
// setup() puts a berry basket and its start mat near the spawn plaza. Each berry wears a light
// pillar so it can be spotted from afar, and shows on the minimap.
import { kit, best, fmtTime, clearance, prng } from './ui.js';

export const meta = { title: 'Blueberry Hunt', zoneId: null, kind: 'world' };

const COUNT = 12, LIMIT = 90, PICK = 2.7;
let W = null;

const ICON = `<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="23" r="12" fill="#5b6fd6" stroke="#1f2a44" stroke-width="2"/><path d="M15 13l2.5 3 2.5-4 2.5 4 2.5-3-1 5h-8z" fill="#27306b"/><ellipse cx="15.5" cy="20" rx="3" ry="2" fill="#fff" opacity=".6"/></svg>`;

// Every berry the hunt collects also goes in the bag.
function bag(ctx){
  try { ctx.modules.inventory?.add?.({ id: 'blueberry', name: 'Blueberry', icon: 'berry' }); }
  catch(e){ console.error('[hunt] inventory add failed', e); }
}

function spokeDist(ctx, x, z){
  let m = 1e9;
  for(const zn of ctx.zones){ const [ex, ez] = ctx.helpers.frameOf(zn).w(0, 10); m = Math.min(m, ctx.helpers.segDist(x, z, ex, ez)); }
  return m;
}

export function setup(ctx, reg){
  const { THREE, scene, helpers: H } = ctx;
  // Basket spot: a ring round the plaza, away from every path and collider.
  let bx = 10, bz = -10, bs = -1e9;
  for(let i=0;i<32;i++){ const a = i/32*Math.PI*2, x = Math.cos(a)*13, z = Math.sin(a)*13; const s = Math.min(clearance(ctx, x, z) - 1, spokeDist(ctx, x, z) - 4, 4) + (z > 0 ? 0.3 : 0); if(s > bs){ bs = s; bx = x; bz = z; } }

  // Shared berry parts.
  const bodyGeo = new THREE.SphereGeometry(0.62, 20, 16), crownGeo = new THREE.CylinderGeometry(0.24, 0.13, 0.2, 5), leafGeo = new THREE.SphereGeometry(0.3, 10, 8);
  const beamGeo = new THREE.CylinderGeometry(0.45, 0.45, 10, 12, 1, true);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#4a5fc9', roughness: .35, emissive: '#1a237e', emissiveIntensity: .25 });
  const crownMat = new THREE.MeshStandardMaterial({ color: '#27306b', roughness: .8 }), leafMat = new THREE.MeshStandardMaterial({ color: '#6fae4a', roughness: .8 });
  const beamMat = new THREE.MeshBasicMaterial({ color: '#b9c6ff', transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide });
  function berry(parent, scale = 1, beam = false){
    const g = new THREE.Group(); g.scale.setScalar(scale);
    const b = new THREE.Mesh(bodyGeo, bodyMat); b.castShadow = true; g.add(b);
    const c = new THREE.Mesh(crownGeo, crownMat); c.position.y = 0.6; g.add(c);
    const l = new THREE.Mesh(leafGeo, leafMat); l.scale.set(1, 0.35, 0.6); l.position.set(0.28, 0.62, 0); l.rotation.z = -0.5; g.add(l);
    if(beam){ const m = new THREE.Mesh(beamGeo, beamMat); m.position.y = 5; m.renderOrder = 2; g.add(m); }
    parent.add(g); return g;
  }

  // Basket with a heap of berries, a sign, and a start mat in front.
  const base = new THREE.Group(); base.position.set(bx, 0, bz); base.rotation.y = Math.atan2(-bx, -bz); scene.add(base);
  const basket = new THREE.Group(); basket.position.set(0, 0, -2.8); base.add(basket);
  H.cyl(1.3, 1.0, 1.1, '#b98a5a', 0, 0.55, 0, basket, 18);
  for(let k=0;k<3;k++) H.cyl(1.32 - k*0.05, 1.32 - k*0.05, 0.12, '#8a6038', 0, 0.35 + k*0.3, 0, basket, 18);
  const heap = [[0,1.3,0],[0.55,1.2,0.3],[-0.5,1.2,0.25],[0.2,1.25,-0.5],[-0.3,1.6,-0.1],[0.3,1.65,0.15]];
  heap.forEach(([x, y, z]) => { const b = berry(basket, 0.62); b.position.set(x, y, z); b.rotation.y = x*3; });
  const sign = H.label('Blueberry Hunt', '#3b4f9e', '#ffffff'); sign.scale.set(4, 1.15, 1); sign.position.set(0, 3.3, 0); basket.add(sign);
  { const [wx, wz] = [bx + Math.sin(base.rotation.y)*-2.8, bz + Math.cos(base.rotation.y)*-2.8]; H.solidCircle(wx, wz, 1.3, 1.4); }
  const matTex = H.canvasTex(256, 256, gc => {
    gc.fillStyle = '#3b4f9e'; gc.beginPath(); gc.arc(128, 128, 124, 0, 7); gc.fill();
    gc.strokeStyle = '#fffaf0'; gc.lineWidth = 8; gc.setLineDash([18, 12]); gc.beginPath(); gc.arc(128, 128, 108, 0, 7); gc.stroke();
    gc.fillStyle = '#fffaf0'; H.F(gc, 700, 52); gc.textAlign = 'center'; gc.fillText('HUNT', 128, 148);
  });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ map: matTex.tex, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pad.rotation.set(-Math.PI/2, 0, base.rotation.y); pad.position.set(bx, 0.12, bz); pad.receiveShadow = true; scene.add(pad);

  // Pop particles, pooled.
  const sparkGeo = new THREE.SphereGeometry(0.16, 8, 6), sparkMat = new THREE.MeshBasicMaterial({ color: '#c9d2ff' });
  const sparks = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(sparkGeo, sparkMat); m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });

  // Flat arrow over the player pointing at the nearest berry.
  const shape = new THREE.Shape(); shape.moveTo(0, 1.2); shape.lineTo(0.8, 0.1); shape.lineTo(0.3, 0.1); shape.lineTo(0.3, -0.8); shape.lineTo(-0.3, -0.8); shape.lineTo(-0.3, 0.1); shape.lineTo(-0.8, 0.1); shape.closePath();
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#5b6fd6', transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false }));
  arrow.rotation.order = 'YXZ'; arrow.renderOrder = 5; arrow.visible = false; scene.add(arrow);

  W = { berry, sparks, arrow, live: [], station: { x: bx, z: bz }, banked: 0, onBerry: null };
  // bus 'hunt:berry' is a berry found outside the hunt (fishing emits it on a berry catch). Starting
  // fishing stops any running hunt, so a fished berry is banked and the next hunt starts with it in
  // the basket; if some other source fires during a run, onBerry counts it straight away.
  // Fishing puts its own catch in the bag, so only other sources are bagged here.
  ctx.bus.on('hunt:berry', d => {
    if(d?.source !== 'fishing') bag(ctx);
    if(W.onBerry) W.onBerry(); else W.banked++;
  });
  ctx.hud.minimapLayers.push((g, toMap) => {
    const [sx, sy] = toMap(bx, bz); g.fillStyle = '#3b4f9e'; g.beginPath(); g.arc(sx, sy, 3, 0, 7); g.fill();
    for(const b of W.live){ if(b.got) continue; const [x, y] = toMap(b.x, b.z); g.fillStyle = '#3b4f9e'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); }
  });
  reg.station({ id: 'hunt', x: bx, z: bz, r: 2.1, when: m => m === 'drive' || m === 'walk' });
}

// Twelve spots, one per 30 degree slice so they spread round the whole island. When map.js
// publishes its layout, spots must be on dry land and within reach of a road (so never on an
// islet with no bridge); otherwise only collider clearance counts.
function scatter(ctx, seed){
  const L = ctx.modules.map?.layout, lay = typeof L?.landAt === 'function' && typeof L?.roadDistAt === 'function' ? L : null;
  const rnd = prng(seed), R = ctx.island.radius || 90, out = [];
  for(let k=0;k<COUNT;k++){
    let pick = null, score = -1e9;
    for(let tries=0; tries<50; tries++){
      const a = (k + 0.1 + rnd()*0.8)/COUNT*Math.PI*2, r = 16 + rnd()*(R - 28);
      const x = Math.cos(a)*r, z = Math.sin(a)*r;
      const c = clearance(ctx, x, z); if(c < 2.2) continue;
      let s = Math.min(c, 5) - (Math.hypot(x - W.station.x, z - W.station.z) < 14 ? 10 : 0);
      if(lay){ if(!lay.landAt(x, z) || (lay.dLandAt?.(x, z) ?? 9) < 3) continue; const rd = lay.roadDistAt(x, z); if(rd > 16) continue; if(rd > 4 && rd < 11) s += 2; }
      if(s > score){ score = s; pick = { x, z }; }
      if(s >= 7 || (!lay && s >= 5)) break;
    }
    if(pick) out.push(pick);
  }
  return out;
}

export function start(ctx, api){
  if(!W) throw new Error('hunt world was not built');
  const K = kit(ctx, api);
  const S = { phase: 'intro', left: LIMIT, got: 0, t0: 0, round: 0, total: 0 };
  const offs = [];
  const clearBerries = () => { for(const b of W.live) b.g.removeFromParent(); W.live = []; };

  function intro(){
    S.phase = 'intro'; K.hud.show(false);
    const b = best.get('hunt');
    K.card({ icon: ICON, color: '#5b6fd6', eyebrow: 'Collect hunt', title: 'Blueberry Hunt',
      body: `${COUNT} giant blueberries are hiding round the island. Follow the light pillars and the arrow, and grab them all in ${LIMIT} seconds.`,
      stats: [['Best', b ? `${b.berries}/${COUNT}` + (b.berries === COUNT ? ` in ${fmtTime(b.time)}` : '') : 'none yet'], ['Time', `${LIMIT} s`]],
      keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Shift</kbd> boost · <kbd>Esc</kbd> quit',
      primary: ['Start hunting', go], secondary: ['Not now', () => api.stop()] });
  }
  function go(){
    if(ctx.state.mode === 'interior') ctx.modes.exitInterior();
    clearBerries(); S.round++; S.test = false;
    for(const p of scatter(ctx, 4242 + S.round*977 + Math.floor(Math.random()*1e6))){
      const g = W.berry(ctx.scene, 1.5, true); g.position.set(p.x, 1.1, p.z);
      W.live.push({ ...p, g, got: false, phase: Math.random()*6 });
    }
    S.phase = 'run'; S.left = LIMIT; S.got = 0; S.t0 = performance.now(); S.total = W.live.length;
    K.hud.chips([['got', 'Berries', true], ['left', 'Time left'], ['best', 'Best']]);
    const b = best.get('hunt'); K.hud.set('got', `0/${W.live.length}`); K.hud.set('best', b ? `${b.berries}/${COUNT}` : '-'); K.hud.show(true);
    K.big('Go!'); K.sfx.go(); K.hint('Follow the blue arrow · <kbd>Esc</kbd> quit');
    // Berries fished since the last hunt start in the basket (at most all but one, so a hunt is never won before it starts).
    const head = Math.min(W.banked, W.live.length - 1); W.banked -= head;
    for(let i=0; i<head; i++) collect(W.live[i], true);
    if(head) K.toast(`${head} fished ${head === 1 ? 'berry' : 'berries'} already in the basket`, 'good');
    W.onBerry = () => { const b = W.live.find(q => !q.got); if(b && S.phase === 'run') collect(b, true); };
  }
  // quiet: a berry that came from elsewhere (fishing), already in the bag, so no bag add and no pop at the spot.
  function collect(b, quiet = false){
    b.got = true; S.got++;
    if(!quiet){ K.sfx.good(S.got); bag(ctx);
      let n = 0; for(const s of W.sparks){ if(s.life > 0 || n >= 9) continue; n++; s.m.position.set(b.x, 1.4, b.z); s.v.set((Math.random() - .5)*7, 4 + Math.random()*4, (Math.random() - .5)*7); s.life = 0.7; s.m.visible = true; } }
    b.pop = 0.25;
    K.hud.set('got', `${S.got}/${W.live.length}`);
    if(S.got === W.live.length) finish(true); else K.toast(`${W.live.length - S.got} to go`, 'good');
  }
  function finish(all){
    S.phase = 'done'; W.onBerry = null; K.hint(null); W.arrow.visible = false;
    const time = (performance.now() - S.t0)/1000;
    const old = best.get('hunt');
    const isBest = !S.test && S.got > 0 && (!old || S.got > old.berries || (S.got === old.berries && all && time < old.time));
    if(isBest) best.set('hunt', { berries: S.got, time });
    all ? (K.big('ALL BERRIES!', true), K.sfx.win(), K.confetti(90)) : (K.big("Time's up", true), K.sfx.bad());
    api.end({ berries: S.got, total: W.live.length, time, newBest: isBest });
    K.later(() => {
      K.hud.show(false);
      K.card({ icon: ICON, color: isBest ? '#06d6a0' : '#5b6fd6', eyebrow: S.test ? 'Test round, not saved' : isBest ? 'New best' : all ? 'Basket full' : 'Hunt over', title: `${S.got} of ${W.live.length} berries`,
        body: all ? `Every berry found with ${Math.max(0, LIMIT - time).toFixed(1)} s to spare.` : 'The rest are still out there. They hide somewhere new every hunt.',
        stats: [['Berries', `${S.got}/${W.live.length}`, isBest], ['Time', fmtTime(Math.min(time, LIMIT))], ['Best', isBest ? `${S.got}/${COUNT}` : old ? `${old.berries}/${COUNT}` : '-']],
        primary: ['Hunt again', go], secondary: ['Done', () => api.stop()] });
      clearBerries();
    }, 1400);
  }
  const quit = () => { if(S.phase === 'run') api.stop(); };
  offs.push(ctx.bus.on('action:exit', quit));

  intro();
  return {
    update(dt, t, mode){
      for(const s of W.sparks){ if(s.life <= 0) continue; s.life -= dt; s.v.y -= 18*dt; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(Math.max(0.05, s.life/0.7)); if(s.life <= 0) s.m.visible = false; }
      for(const b of W.live){
        if(b.got){ if(b.pop > 0){ b.pop -= dt; b.g.scale.setScalar(1.5*(1 + (0.25 - b.pop)*3)); b.g.position.y += dt*6; if(b.pop <= 0) b.g.visible = false; } continue; }
        b.g.position.y = 1.1 + Math.sin(t*2.4 + b.phase)*0.25; b.g.rotation.y += dt*1.4;
      }
      if(S.phase !== 'run'){ W.arrow.visible = false; return; }
      S.left = LIMIT - (performance.now() - S.t0)/1000;
      K.hud.set('left', Math.max(0, S.left).toFixed(0) + ' s', S.left < 10 ? 'warn' : '');
      if(mode === 'interior'){ W.arrow.visible = false; }
      else {
        const P = ctx.state.player; let near = null, nd = 1e9;
        for(const b of W.live){ if(b.got) continue; const d = Math.hypot(P.x - b.x, P.z - b.z); if(d < nd){ nd = d; near = b; } }
        if(near && nd < PICK) collect(near);
        if(S.phase === 'run' && near){ W.arrow.visible = nd > 5; W.arrow.position.set(P.x, 3.4, P.z); W.arrow.rotation.set(-Math.PI/2, Math.atan2(near.x - P.x, near.z - P.z) + Math.PI, 0); }
      }
      if(S.phase === 'run' && S.left <= 0) finish(false);
    },
    stop(){ offs.forEach(o => o?.()); W.onBerry = null; clearBerries(); W.arrow.visible = false; for(const s of W.sparks){ s.life = 0; s.m.visible = false; } K.destroy(); },
    state: () => ({ phase: S.phase, got: S.got, total: S.total, left: +Math.max(0, S.left).toFixed(1), berries: W.live.map(b => ({ x: +b.x.toFixed(1), z: +b.z.toFixed(1), got: b.got })) }),
    debug(cmd){
      if(cmd !== 'start') S.test = true;
      if(cmd === 'start' && (S.phase === 'intro' || S.phase === 'done')){ K.closeCard(); go(); return S.phase; }
      if(cmd === 'next' && S.phase === 'run'){ const b = W.live.find(q => !q.got); if(b){ ctx.modes.placePlayer(b.x + 6, b.z + 6, Math.atan2(-6, -6)); } return S.got; }
      if(cmd === 'collect' && S.phase === 'run'){ const b = W.live.find(q => !q.got); if(b) collect(b); return S.got; }
      if(cmd === 'timeout' && S.phase === 'run'){ S.t0 -= LIMIT*1000; return 'timeout'; }
      return S.phase;
    },
  };
}
