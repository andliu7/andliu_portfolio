// Interior for "contact" (Mailbox): a little post office, built with the shared tour kit in
// blueberry.js so it walks, frames and tours like the other buildings.
//
// Room 1, Post Office: a counter with a clerk who hands out stamps, a wall of P.O. boxes, and three
// big post boxes that are the real contact links (GitHub and LinkedIn open in a new tab, Email copies
// the address). Room 2, Writing Room: the writing desk opens a letter-paper form; Send folds it into
// an envelope that flies through the mail slot, then opens the visitor's email app pre-filled.
// Everything about Andrew comes from zones.js except the three contact links he gave for this room.
import { makeTour, burst, prng } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', red = '#d9534f', brass = '#e0a93b';
const LINKEDIN = 'https://www.linkedin.com/in/andrew-liu-06154225b/';

export function build(ctx, kit){
  const zone = kit.zone;
  const EMAIL = zone.role || 'zeus.andrewliu@gmail.com';   // zones.js keeps the address in the role line
  const GITHUB = (zone.links || []).find(l => /github/i.test(l[0]))?.[1] || 'https://github.com/andliu7';
  const RESUME = (zone.links || []).find(l => /sum/i.test(l[0]))?.[1] || null;
  const debug = {};
  const S = { dry:false, log:[], letters:0, stamps:0, gave:false };   // dry: record links instead of opening them (tests)
  const tone = (...a) => { try { if(ctx.sound?.on) ctx.sound.tone(...a); } catch(e){} };

  // Every way out of the page goes through here, so tests can run dry.
  function openLink(url){
    S.log.push(url);
    if(S.dry) return;
    // straight from the key or click handler, so the browser still counts it as a user gesture
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  function openMail(href){
    S.log.push(href);
    if(S.dry) return;
    const a = document.createElement('a'); a.href = href; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function copyText(text){
    try { await navigator.clipboard.writeText(text); return true; } catch(e){}
    try {   // older browsers and some embeds block the async clipboard API
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-999px;opacity:0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch(e){ return false; }
  }

  let lobbyR = null, deskR = null, flight = null;
  const room = makeTour(ctx, kit, {
    sky:'#ffeede', skyLow:'#a8403c', plinth:'#6b3a2e', viewTop:'#bfe3ff', viewLow:'#fff4dc', shaft:'#fff1d6', debug,
    rooms: [
      { name:'Post Office', sub:'GitHub, LinkedIn and email, all at one counter', w:18, h:5, roof:'barrel', vault:3.2, ribs:4,
        wall:'#fdf2e4', cap:'#fffaf0', floor:'#f4e6cf', floor2:'#ecd3b4', floorKind:'check', accent:red, rib:'#f1c4ab', ceil:'#fff6ea',
        windows:{ at:[0.25, 0.75], y:4.25, w:0.9, round:true, shafts:false }, plaqueY:4.3, trim:'#b8433f',
        build: R => { lobbyR = R; lobby(R); } },
      { name:'Writing Room', sub:'Write Andrew a letter and post it through the slot', w:13, h:4.6, roof:'beams',
        wall:'#fff6ea', cap:'#fffaf0', floor:'#c99a6b', floor2:'#b98a5d', floorKind:'plank', accent:'#3b4f9e', rib:'#8a4a3a', ceil:'#fbf1e2',
        windows:{ at:[0.1], y:2.4, w:1.0, h:1.8, arch:true }, trim:'#8a4a3a',
        build: R => { deskR = R; writing(R); } },
    ],
    onEnter(){
      // the kit's hint still names E; this room already speaks round 5 (F interacts)
      setTimeout(() => { if(ctx.state.interior === room) ctx.hud?.setHint?.('interior', '<kbd>WASD</kbd> walk · <kbd>F</kbd> use · drag to look · <kbd>1</kbd>-<kbd>2</kbd> rooms · <kbd>Esc</kbd> leave'); }, 0);
    },
  });
  ctx.bus.on('interior:exit', ({ zoneId }) => { if(zoneId === zone.id){ form.close(true); toast.hide(); } });

  // ---------------------------------------------------------------------------------------------
  // Room 1: Post Office
  // ---------------------------------------------------------------------------------------------
  function lobby(R){
    const { THREE, H } = R, ZB = R.back;
    // --- P.O. boxes behind the counter: 9 x 4 brass doors, merged with the room ---
    const cols = 9, rows = 4, PW = 6.2, PH = 2.0, py = 2.3, pz = ZB + 0.26;
    R.box(PW + 0.4, PH + 0.3, 0.24, '#8a5a3c', 0, py, ZB + 0.12);
    const dw = PW/cols, dh = PH/rows, special = [4, 1];
    for(let i = 0; i < cols; i++) for(let j = 0; j < rows; j++){
      if(i === special[0] && j === special[1]) continue;
      const x = -PW/2 + dw*(i + 0.5), y = py + PH/2 - dh*(j + 0.5);
      R.box(dw - 0.07, dh - 0.07, 0.05, brass, x, y, pz);
      R.box(dw*0.45, dh*0.22, 0.02, '#3a2a20', x, y + dh*0.14, pz + 0.03);
      R.ball(0.03, '#6b4a33', x + dw*0.3, y - dh*0.1, pz + 0.04, R.s, 6);
    }
    R.screen(PW, PH, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#5a3a22'; H.F(g, 700, 15); g.textAlign = 'center'; g.textBaseline = 'middle';
      for(let i = 0; i < cols; i++) for(let j = 0; j < rows; j++){ if(i === special[0] && j === special[1]) continue; g.fillText(String(101 + j*cols + i), (i + 0.5)*w/cols, (j + 0.72)*h/rows); }
    }, { x:0, y:py, z:pz + 0.035, px:110, transparent:true });
    // the one box that pops open now and then, a letter peeking out
    const sx = -PW/2 + dw*(special[0] + 0.5) - (dw - 0.07)/2, sy = py + PH/2 - dh*(special[1] + 0.5);
    const hinge = R.group(sx, sy, pz);
    R.box(dw - 0.07, dh - 0.07, 0.05, red, (dw - 0.07)/2, 0, 0, hinge);
    R.ball(0.035, paper, (dw - 0.07)*0.82, 0, 0.04, hinge, 8);
    R.box(dw - 0.14, dh - 0.14, 0.02, '#2a1a12', sx + (dw - 0.07)/2, sy, pz - 0.02, R.g);
    const peek = envelope(R, R.g, sx + (dw - 0.07)/2, sy - 0.08, pz - 0.05); peek.rotation.x = Math.PI/2 - 0.3; peek.scale.setScalar(0.9);
    let boxOpen = 0, boxWant = 0, boxT = 3;
    R.tick((dt, t) => {
      boxT -= dt; if(boxT < 0){ boxWant = boxWant ? 0 : 1; boxT = boxWant ? 2.2 : 5 + Math.sin(t)*1.5; }
      boxOpen += (boxWant - boxOpen)*(1 - Math.exp(-7*dt));
      hinge.rotation.y = -boxOpen*1.9;
      peek.position.z = pz - 0.05 + boxOpen*0.2; peek.position.y = sy - 0.08 + Math.sin(t*4)*0.015*boxOpen;
    });

    // --- the counter: red panels, cream top, half gates so nobody wanders behind it ---
    const cz = -4.2;
    R.box(6.4, 1.0, 0.9, red, 0, 0.5, cz); R.box(6.7, 0.13, 1.15, '#fff4e0', 0, 1.06, cz); R.box(6.4, 0.14, 0.92, '#8a3a36', 0, 0.07, cz);
    for(let k = 0; k < 4; k++) R.box(1.3, 0.56, 0.05, '#e8736e', -2.4 + k*1.6, 0.56, cz + 0.46);
    R.box(6.4, 0.07, 0.05, '#fff4e0', 0, 0.9, cz + 0.47);
    R.solid(0, cz, 3.35, 0.58);
    for(const s of [-1, 1]){ R.box(0.12, 1.0, 1.7, '#b8433f', s*3.3, 0.5, cz - 1.25); R.box(0.16, 0.08, 1.74, '#fff4e0', s*3.3, 1.02, cz - 1.25); R.solid(s*3.3, cz - 1.25, 0.1, 0.9); }
    // on the counter: a sheet of stamps, a bell, a parcel scale
    const stampCols = ['#e5484d', '#3b4f9e', '#35a36a', '#f2b705', '#8a5cc2', '#e58a3b'];
    R.box(0.9, 0.02, 0.6, paper, -1.9, 1.135, cz + 0.1);
    stampCols.forEach((c, k) => R.box(0.22, 0.012, 0.2, c, -2.18 + (k%3)*0.28, 1.15, cz - 0.02 + (k/3|0)*0.26));
    R.cyl(0.13, 0.15, 0.04, '#6b4a33', 1.5, 1.14, cz + 0.2, R.s, 12);
    const bell = R.group(1.5, 1.16, cz + 0.2);
    R.mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI*2, 0, Math.PI/2), brass, 0, 0, 0, bell); R.ball(0.035, brass, 0, 0.15, 0, bell, 8);
    R.box(0.6, 0.18, 0.5, '#9aa3b8', 2.5, 1.21, cz); R.box(0.52, 0.04, 0.42, '#dfe7ea', 2.5, 1.32, cz);
    const parcel = R.group(2.5, 1.34, cz); R.box(0.42, 0.3, 0.32, '#c9985f', 0, 0.15, 0, parcel); R.box(0.43, 0.04, 0.33, '#8a6440', 0, 0.2, 0, parcel); R.box(0.04, 0.31, 0.33, '#8a6440', 0, 0.15, 0, parcel);

    // --- the clerk: a blob on a stool with a postal cap and a rubber stamp ---
    R.cyl(0.3, 0.34, 0.55, '#6b4a33', 0, 0.27, -5.2, R.s, 12);
    const clerk = R.blob('#ffd6a5', 0, -5.2, { cap:'#3b4f9e', y:0.55, scale:1.12, amp:0.05 });
    R.box(0.5, 0.05, 0.12, '#3b4f9e', 0, 1.25, 0.42, clerk);   // cap badge band
    R.ball(0.06, brass, 0, 1.33, 0.36, clerk, 8);
    const arm = R.group(0.46, 0.8, 0.3, clerk);
    R.cyl(0.05, 0.05, 0.28, '#6b4a33', 0, 0.2, 0, arm, 8); R.ball(0.08, '#6b4a33', 0, 0.36, 0, arm, 8); R.box(0.22, 0.08, 0.16, red, 0, 0.04, 0, arm);
    let thump = 0, hop = 0;
    const bubble = R.float('Here, a stamp for your letter!', 0, 2.75, -5.0, { size:30, bg:ink, fg:'#ffffff', scale:0.8 }); bubble.visible = false;
    let bubbleT = 0;
    R.tick((dt, t) => {
      thump = Math.max(0, thump - dt*2.4); hop = Math.max(0, hop - dt*2);
      const k = thump > 0 ? Math.abs(Math.sin(thump*Math.PI*2)) : 0;
      arm.position.y = 0.8 + k*0.25 - (thump > 0 ? 0.1 : 0); arm.position.z = 0.3 + k*0.15;
      clerk.rotation.z = Math.sin(t*1.3)*0.05 + Math.sin(hop*Math.PI*3)*hop*0.2;
      clerk.scale.set(1.12*(1 + hop*0.08), 1.12*(1 - hop*0.1 + Math.sin(hop*Math.PI)*0.15), 1.12);
      const P = ctx.state.interior?.player;   // the clerk turns to watch you walk around
      if(P) clerk.rotation.y += (Math.max(-0.7, Math.min(0.7, Math.atan2(P.x - R.cx, P.z + 5.2))) - clerk.rotation.y)*(1 - Math.exp(-3*dt));
      if(bubbleT > 0){ bubbleT -= dt; bubble.visible = bubbleT > 0; bubble.position.y = 2.75 + Math.sin(t*3)*0.04; }
      bell.scale.setScalar(1 + thump*0.12);
    });
    function talk(){
      thump = 1; hop = 1; tone(1320, 0.25, 'sine', 0.08); setTimeout(() => tone(1760, 0.3, 'sine', 0.05), 70);
      const first = !S.gave; S.gave = true;
      if(first){ S.stamps++; try { ctx.modules.inventory?.add?.({ id:'stamp', name:'Postage stamp', icon:'stamp' }); } catch(e){} }
      const lines = first
        ? ['Welcome to the Mailbox!', 'GitHub, LinkedIn and email are on the three post boxes. The Writing Room is through the door on the right.', 'Here, a stamp for your letter.']
        : ['Email is the fastest way to reach Andrew.', 'Or write him a letter at the desk next door.'];
      const say = ctx.modules.dialog?.say;
      if(typeof say === 'function'){ try { say({ name:'Clerk', lines, portrait:'blob' }); return; } catch(e){} }
      bubble.visible = true; bubbleT = 3;   // no dialog module: a speech bubble says the last line
    }
    R.use({ key:'clerk', x:0, z:cz + 1.3, r:1.9, y:2.6, label:'Talk to the clerk', hit:[clerk, bell], fn:talk });
    debug.clerk = () => { talk(); return S.stamps; };

    // --- three big post boxes: the contact links ---
    const stations = [
      { key:'email', name:'Email', handle:EMAIL, body:red, cap:'#e8736e', x:0, z:1.4, face:0, verb:'copy', icon:iconMail },
      { key:'github', name:'GitHub', handle:'github.com/andliu7', url:GITHUB, body:'#2b3040', cap:'#434b60', x:-5.5, z:-1.3, face:0.4, verb:'open', icon:iconCode },
      { key:'linkedin', name:'LinkedIn', handle:'in/andrew-liu', url:LINKEDIN, body:'#0a66c2', cap:'#2f83d6', x:5.5, z:-1.3, face:-0.4, verb:'open', icon:iconIn },
    ];
    for(const st of stations) postBox(R, st);

    // --- posters on the back wall: the zone's line on the left, the resume on the right ---
    R.box(2.7, 2.0, 0.08, '#b8433f', -6.3, 2.5, ZB + 0.05);
    R.screen(2.5, 1.8, (g, w, h) => {
      g.fillStyle = paper; g.fillRect(0, 0, w, h);
      g.fillStyle = red; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16);
      g.fillStyle = red; H.F(g, 700, 22); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(zone.eyebrow?.toUpperCase() || 'SAY HI', 24, 56);
      g.fillStyle = ink; H.F(g, 700, 44); g.fillText(zone.title || 'Get in touch', 24, 108);
      H.F(g, 600, 22, 'Nunito'); g.fillStyle = '#4b5675'; R.wrap(g, zone.bullets?.[0] || '', w - 48).slice(0, 2).forEach((l, k) => g.fillText(l, 24, 150 + k*28));
      g.fillStyle = red; H.F(g, 700, 20); g.fillText(EMAIL, 24, h - 36);
    }, { x:-6.3, y:2.5, z:ZB + 0.1, px:110 });
    if(RESUME){
      R.box(2.1, 2.0, 0.08, '#3b4f9e', 6.3, 2.5, ZB + 0.05);
      const res = R.screen(1.9, 1.8, (g, w, h) => {
        g.fillStyle = '#eef1fb'; g.fillRect(0, 0, w, h);
        g.fillStyle = paper; g.fillRect(34, 26, w - 68, h - 70); g.fillStyle = '#c7cff0'; for(let k = 0; k < 7; k++) g.fillRect(52, 70 + k*14, (w - 104)*(k % 3 === 2 ? 0.6 : 1), 6);
        g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'center'; g.fillText('Résumé (PDF)', w/2, 56);
        g.fillStyle = '#3b4f9e'; H.F(g, 700, 17); g.fillText('F  open in a new tab', w/2, h - 18);
      }, { x:6.3, y:2.5, z:ZB + 0.1, px:110 });
      R.use({ key:'resume', x:6.3, z:ZB + 1.6, r:1.5, label:'Open the résumé', hit:res.mesh, fn(){ openLink(RESUME); } });
    }

    // --- a flock of envelopes circling under the vault: two InstancedMeshes, not 14 meshes ---
    const N = 7, q = prng(4242), ph = Array.from({ length:N }, () => q()*6.28);
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.025, 0.3), H.mat(paper), N);
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([-0.23, 0, 0, 0.23, 0, 0, 0, 0, 0.2], 3)); fg.computeVertexNormals();
    const flaps = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color:'#f0d9ae', roughness:0.8, side:THREE.DoubleSide }), N);
    // instances fly far from the mesh origin, so the default bounding-sphere culling would drop them
    body.frustumCulled = flaps.frustumCulled = false; body.castShadow = true;
    R.g.add(body, flaps);
    const d0 = new THREE.Object3D(), d1 = new THREE.Object3D(), m1 = new THREE.Matrix4();
    let scatter = 0;
    R.tick((dt, t) => {
      scatter = Math.max(0, scatter - dt*0.6);
      for(let i = 0; i < N; i++){
        const a = t*0.3 + i/N*Math.PI*2, rx = 6.4 + Math.sin(ph[i])*0.5 + scatter*1.5, rz = 1.8 + scatter;
        d0.position.set(Math.cos(a)*rx, 3.75 + Math.sin(t*1.4 + ph[i])*0.28 + scatter*0.6, -2.7 + Math.sin(a)*rz);
        d0.rotation.set(0, Math.atan2(-Math.sin(a)*rx, Math.cos(a)*rz) + Math.PI/2, Math.sin(t*2 + ph[i])*0.25);
        d0.updateMatrix(); body.setMatrixAt(i, d0.matrix);
        d1.position.set(0, 0.014, -0.15); d1.rotation.set(-(0.2 + Math.abs(Math.sin(t*(7 + scatter*8) + ph[i]))*1.3), 0, 0); d1.updateMatrix();
        flaps.setMatrixAt(i, m1.multiplyMatrices(d0.matrix, d1.matrix));
      }
      body.instanceMatrix.needsUpdate = true; flaps.instanceMatrix.needsUpdate = true;
    });
    R.flock = () => { scatter = 1; };

    // --- lamps, a waiting customer on a bench, a parcel pile ---
    R.lamp('pendant', -3.2, 3.6, -3.4, { top:6.4, shade:'#fff4e0' }); R.lamp('pendant', 3.2, 3.6, -3.4, { top:6.4, shade:'#fff4e0' });
    R.box(2.2, 0.12, 0.6, '#8a5a3c', 7.2, 0.5, 3.4); for(const s of [-1, 1]) R.box(0.12, 0.5, 0.5, '#6b4a33', 7.2 + s*0.95, 0.25, 3.4); R.box(2.2, 0.6, 0.1, '#8a5a3c', 7.2, 0.9, 3.72);
    R.solid(7.2, 3.45, 1.15, 0.4);
    const reader = R.blob('#b5e48c', 7.5, 3.35, { y:0.28, face:-0.5, scale:0.8, amp:0.03, speed:1.2 });
    const note = envelope(R, reader, 0, 0.75, 0.5); note.rotation.x = -1.1; note.scale.setScalar(0.9);
    [[0, 0.7, 0.55, '#c9985f'], [0.05, 0.5, 0.45, '#b98a5a'], [-0.04, 0.4, 0.36, '#d9b48a']].reduce((y, [dx, w, hgt, c]) => { R.box(w, hgt, w*0.8, c, -7.6 + dx, y + hgt/2, 4.0); R.box(w + 0.01, 0.04, 0.06, '#8a6440', -7.6 + dx, y + hgt*0.8, 4.0); return y + hgt; }, 0);
    R.solid(-7.6, 4.0, 0.45, 0.35);

    R.stop('The Mailbox', `Andrew's post office. ${zone.bullets?.[0] || ''} Talk to the clerk at the counter for a stamp.`, 0, 2.9, cz);
    R.stop('Email', `The red post box. Press F beside it to copy ${EMAIL} to your clipboard.`, 0, 3.7, 1.4);
    R.stop('GitHub', 'The charcoal post box. Press F beside it to open github.com/andliu7 in a new tab.', -5.5, 3.7, -1.3);
    R.stop('LinkedIn', 'The blue post box. Press F beside it to open his LinkedIn profile in a new tab.', 5.5, 3.7, -1.3);
  }

  // A chunky pillar post box with a round sign on top. Squashes, spits out a letter and lights up on use.
  function postBox(R, st){
    const { THREE, H } = R;
    const grp = R.group(st.x, 0, st.z); grp.rotation.y = st.face;
    const dark = '#1f2a44';
    R.cyl(0.8, 0.86, 0.22, dark, 0, 0.11, 0, grp, 24);
    R.cyl(0.62, 0.62, 1.42, st.body, 0, 0.93, 0, grp, 28);
    R.cyl(0.67, 0.67, 0.12, dark, 0, 1.66, 0, grp, 28);
    const dome = R.mesh(new THREE.SphereGeometry(0.66, 28, 10, 0, Math.PI*2, 0, Math.PI/2), st.cap, 0, 1.7, 0, grp); dome.scale.y = 0.6;
    R.ball(0.1, dark, 0, 2.12, 0, grp, 10);
    R.box(0.56, 0.1, 0.16, '#11141c', 0, 1.42, 0.58, grp); R.box(0.68, 0.05, 0.2, dark, 0, 1.5, 0.6, grp);
    R.box(0.94, 0.74, 0.16, dark, 0, 0.8, 0.56, grp);
    R.screen(0.86, 0.66, (g, w, h) => plate(H, g, w, h, st), { parent:grp, x:0, y:0.8, z:0.645, px:280 });
    // the sign on a post, swaying; faster and brighter when you are close
    R.cyl(0.035, 0.035, 0.6, dark, 0, 2.4, 0, grp, 8);
    const sign = R.group(0, 3.05, 0, grp);
    R.cyl(0.52, 0.52, 0.1, dark, 0, 0, -0.02, sign, 32).rotation.x = Math.PI/2;
    R.screen(0.98, 0.98, (g, w, h) => st.icon(H, g, w, h, st), { parent:sign, z:0.04, px:260, transparent:true });
    const halo = R.glow(0, 3.05, 0.1, 2.2, st.cap, grp, 0.35);
    // the letter that shoots out of the slot
    const pop = envelope(R, grp, 0, 1.42, 0.6); pop.visible = false;
    let squash = 0, popT = 0, near = 0;
    R.tick((dt, t) => {
      const P = ctx.state.interior?.player;
      const d = P ? Math.hypot(P.x - (R.cx + st.x), P.z - st.z) : 99;
      near += ((d < 3 ? 1 : 0) - near)*(1 - Math.exp(-4*dt));
      squash = Math.max(0, squash - dt*1.8);
      const s = Math.sin(squash*Math.PI*3)*squash*0.16;
      grp.scale.set(1 + s, 1 - s, 1 + s);
      sign.rotation.y = Math.sin(t*(1.1 + near*1.6) + st.x)*(0.25 + near*0.15) + squash*Math.PI*4;
      sign.position.y = 3.05 + Math.sin(t*2 + st.x)*0.05 + near*0.12;
      halo.scale.setScalar(2.2 + near*0.9 + Math.sin(t*3)*0.15*near);
      if(popT > 0){
        popT = Math.max(0, popT - dt); const f = 1 - popT/1.1;
        pop.visible = popT > 0;
        pop.position.set(Math.sin(f*6)*0.1, 1.42 + f*2.2 - f*f*1.5, 0.6 + f*1.4);
        pop.rotation.set(-f*2.5, f*4, 0); pop.scale.setScalar(1.3 - f*0.5);
      }
    });
    const act = () => {
      squash = 1; popT = 1.1;
      try { ctx.sound?.on && ctx.sound.sfx?.boing?.(0.5); } catch(e){}
      lobbyR?.flock?.();
      if(st.verb === 'copy'){
        const text = st.handle;
        copyText(text).then(ok => toast.show(ok ? `Copied <b>${text}</b> to your clipboard` : `Here it is: <b style="user-select:all">${text}</b>`, st.body));
        S.log.push('copy:' + text);
      } else {
        openLink(st.url);
        toast.show(`Opening <b>${st.name}</b> in a new tab`, st.body);
      }
    };
    R.use({ key:st.key, x:st.x + Math.sin(st.face)*1.5, z:st.z + Math.cos(st.face)*1.5, r:1.9, y:2.5,
      label:st.verb === 'copy' ? 'Copy my email' : `Open ${st.name} (new tab)`, hit:grp, fn:act });
    debug[st.key] = () => { act(); return S.log[S.log.length - 1]; };
    R.solidR(st.x, st.z, 0.88);
  }

  // ---------------------------------------------------------------------------------------------
  // Room 2: Writing Room
  // ---------------------------------------------------------------------------------------------
  function writing(R){
    const { THREE, H } = R, ZB = R.back;
    // --- the writing desk ---
    const dx = -1.6, dz = -3.7;
    R.box(2.9, 0.12, 1.25, '#8a4a3a', dx, 0.95, dz);
    for(const [x, z] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) R.box(0.12, 0.9, 0.12, '#6b3a2a', dx + x, 0.45, dz + z);
    R.box(0.9, 0.5, 1.1, '#7a4232', dx + 0.9, 0.62, dz); for(const y of [0.5, 0.74]) R.ball(0.04, brass, dx + 0.9, y, dz + 0.56, R.s, 8);
    R.solid(dx, dz, 1.5, 0.66);
    // the letter paper, glowing a little so it reads as the thing to use
    const sheet = R.screen(0.78, 0.56, (g, w, h) => {
      g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = '#cfe0f2'; for(let y = 44; y < h; y += 18) g.fillRect(0, y, w, 2);
      g.fillStyle = '#f2a0a0'; g.fillRect(26, 0, 2, h);
      g.fillStyle = ink; H.F(g, 700, 22); g.textAlign = 'left'; g.fillText('Dear Andrew,', 36, 34);
    }, { x:dx - 0.1, y:1.018, z:dz + 0.12, rotX:-Math.PI/2, px:220 });
    const invite = R.glow(dx - 0.1, 1.15, dz + 0.12, 1.5, '#fff1c9', R.g, 0.55);
    R.float('Write me a letter', dx - 0.1, 2.45, dz + 0.1, { size:32, bg:'#3b4f9e', fg:'#ffffff', scale:0.9 });
    // inkwell and a quill that dips now and then
    R.cyl(0.1, 0.13, 0.14, '#1f2a44', dx + 0.55, 1.08, dz - 0.25, R.s, 14);
    const quill = R.group(dx + 0.55, 1.18, dz - 0.25);
    const vane = R.ball(0.16, paper, 0, 0.42, 0, quill, 10); vane.scale.set(0.35, 1.6, 0.1);
    R.cyl(0.012, 0.012, 0.7, '#e8dcc8', 0, 0.3, 0, quill, 5);
    // envelopes, a rubber stamp and its ink pad, a desk lamp
    for(let k = 0; k < 4; k++){ const e = envelope(R, R.s, dx - 1.05, 1.02 + k*0.03, dz - 0.2); e.rotation.y = (k - 1.5)*0.12; }
    R.box(0.36, 0.04, 0.26, '#3b4f9e', dx + 0.25, 1.03, dz - 0.35);
    const rstamp = R.group(dx + 0.25, 1.05, dz - 0.35);
    R.box(0.2, 0.06, 0.14, red, 0, 0.03, 0, rstamp); R.cyl(0.035, 0.035, 0.16, '#6b3a2a', 0, 0.13, 0, rstamp, 8); R.ball(0.07, '#6b3a2a', 0, 0.24, 0, rstamp, 10);
    R.lamp('desk', dx - 1.15, 1.01, dz - 0.4, { shade:'#f2b705' });
    // chair
    R.box(0.7, 0.1, 0.7, '#6b3a2a', dx, 0.55, dz + 1.15); R.box(0.7, 0.75, 0.1, '#6b3a2a', dx, 0.95, dz + 1.48);
    for(const [x, z] of [[-0.3, 0.85], [0.3, 0.85], [-0.3, 1.45], [0.3, 1.45]]) R.box(0.07, 0.55, 0.07, '#5a2e22', dx + x, 0.27, dz + z);
    R.solidR(dx, dz + 1.15, 0.42);
    // the stamp collection above the desk
    R.box(2.7, 1.4, 0.08, '#8a4a3a', dx, 2.35, ZB + 0.05);
    R.screen(2.55, 1.25, (g, w, h) => stampSheet(H, g, w, h), { x:dx, y:2.35, z:ZB + 0.1, px:120 });

    // --- the mail slot: a red panel with a brass plate and a flap that swings when a letter lands ---
    const mx = 3.4, my = 1.55, mz = ZB + 0.1;
    R.box(2.0, 2.6, 0.14, red, mx, 1.3, ZB + 0.07); R.box(2.1, 0.12, 0.2, '#8a3a36', mx, 2.66, ZB + 0.1);
    R.box(1.1, 0.4, 0.06, brass, mx, my, mz + 0.07);
    R.box(0.84, 0.11, 0.02, '#120c08', mx, my, mz + 0.105);
    const flap = R.group(mx, my + 0.06, mz + 0.12);
    R.box(0.9, 0.14, 0.03, '#f0c05a', 0, -0.07, 0, flap); R.box(0.3, 0.03, 0.03, '#b8862a', 0, -0.1, 0.02, flap);
    const slotSign = R.screen(1.7, 0.62, (g, w, h) => {
      g.fillStyle = paper; H.rr(g, 0, 0, w, h, 18); g.fill();
      g.fillStyle = red; H.F(g, 700, 30); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LETTERS FOR ANDREW', w/2, h*0.38);
      g.fillStyle = '#4b5675'; H.F(g, 600, 20, 'Nunito'); g.fillText(S.letters ? `posted this visit: ${S.letters}` : 'post your letter here', w/2, h*0.75);
    }, { x:mx, y:2.2, z:ZB + 0.16, px:120, transparent:true });
    // the sack under the slot fills up with every letter
    const sack = R.group(mx, 0, ZB + 0.62);
    const bag = R.ball(0.5, '#c9a46a', 0, 0.42, 0, sack, 16); bag.scale.set(1.2, 0.85, 0.8);
    R.cyl(0.18, 0.28, 0.2, '#c9a46a', 0, 0.86, 0, sack, 12); R.cyl(0.19, 0.19, 0.05, '#8a6440', 0, 0.9, 0, sack, 12);
    const peeks = [0, 1, 2].map(k => { const e = envelope(R, sack, -0.2 + k*0.2, 0.95, 0); e.rotation.set(1.2, k*0.5, 0.2*(k - 1)); e.visible = k === 0; return e; });
    R.solid(mx, ZB + 0.62, 0.66, 0.45);
    let flapA = 0, flapV = 0, sackPop = 0;
    R.tick((dt, t) => {
      flapV += (-60*flapA - 6*flapV)*dt; flapA += flapV*dt;   // a damped spring: the flap swings in and settles
      flap.rotation.x = Math.max(-0.2, flapA);
      sackPop = Math.max(0, sackPop - dt*2.5);
      const s = 1 + Math.sin(sackPop*Math.PI*2)*sackPop*0.12 + Math.min(S.letters, 6)*0.03;
      sack.scale.set(s, 2 - s, s);
      quill.rotation.z = -0.35 + Math.sin(t*0.9)*0.08; quill.position.y = 1.18 + Math.max(0, Math.sin(t*0.7))**8*-0.12;
      invite.scale.setScalar(1.4 + Math.sin(t*2.4)*0.2);
    });

    // --- the flight: the folded letter lifts off the desk and dives through the slot ---
    const env = envelope(R, R.g, 0, 0, 0); env.visible = false;
    let stampT = 0;
    R.tick(dt => {
      stampT = Math.max(0, stampT - dt*3);
      rstamp.position.y = 1.05 + Math.abs(Math.sin(stampT*Math.PI))*0.28;
      rstamp.position.x = dx + 0.25 - Math.sin(stampT*Math.PI)*0.35;
      if(!flight) return;
      flight.t += dt;
      const T1 = flight.dur, f = Math.min(1, flight.t/T1), e = f*f*(3 - 2*f);
      const a = [dx - 0.1, 1.1, dz + 0.12], b = [mx, my, mz + 0.55], c = [(a[0] + b[0])/2, 3.3, (a[2] + b[2])/2 + 0.8];
      if(f < 1){
        const u = 1 - e;
        env.position.set(u*u*a[0] + 2*u*e*c[0] + e*e*b[0], u*u*a[1] + 2*u*e*c[1] + e*e*b[1], u*u*a[2] + 2*u*e*c[2] + e*e*b[2]);
        env.rotation.set(Math.sin(f*Math.PI)*0.5, (1 - e)*Math.PI*4, Math.sin(f*Math.PI*2)*0.3);
        env.scale.setScalar(1.25);
        env.visible = true;
      } else {
        const g2 = Math.min(1, (flight.t - T1)/0.28);
        env.position.set(mx, my, mz + 0.55 - g2*0.85); env.rotation.set(0, 0, 0); env.scale.setScalar(1.25 - g2*0.5);
        if(!flight.hit && g2 > 0.45){
          flight.hit = true; flapV = 14; sackPop = 1; S.letters++; slotSign.redraw();
          peeks.forEach((p, k) => { p.visible = k < Math.min(3, S.letters + 1); });
          burst(R, mx, my + 0.4, mz + 0.5);
          tone(880, 0.12, 'triangle', 0.1); setTimeout(() => tone(1320, 0.2, 'triangle', 0.08), 90);
        }
        if(g2 >= 1){ env.visible = false; const done = flight.done; flight = null; done?.(); }
      }
    });
    R.fly = (done) => { stampT = 1; tone(220, 0.08, 'square', 0.05); flight = { t:0, dur:ctx.state.reduced ? 0.5 : 1.15, hit:false, done }; };
    R.use({ key:'letter', x:dx, z:dz + 2.4, r:2.1, label:'Write me a letter', hit:[sheet.mesh, quill], fn(){ form.open(); } });

    // pigeonholes on the right wall and a plant by the door
    R.shelf(R.w/2 - 0.3, -2.3, 2.4, 2.2, { rotY:-Math.PI/2, colors:[paper, '#ffd6a5', '#bde0fe', '#caffbf', '#fbd3e9'], wood:'#8a5a3c' });
    R.cyl(0.3, 0.24, 0.5, '#d97a4a', -5.4, 0.25, 3.8, R.s, 12);
    for(let k = 0; k < 4; k++) R.ball(0.3, '#6fae4a', -5.4 + Math.cos(k*1.6)*0.15, 0.8 + k*0.12, 3.8 + Math.sin(k*1.6)*0.15, R.s, 10);
    R.solidR(-5.4, 3.8, 0.42);
    R.lamp('pendant', dx, 3.3, dz + 0.4, { top:4.6, shade:'#fff4e0' });

    R.stop('Write me a letter', 'Press F at the writing desk. Fill in the letter, press Send, and it folds into an envelope, goes through the slot and opens your email app ready to send.', dx, 2.9, dz);
    R.stop('The mail slot', 'Every letter you post lands in the sack under the slot.', mx, 2.9, ZB + 0.6);
  }

  // ---------------------------------------------------------------------------------------------
  // The letter form (DOM) and a small toast
  // ---------------------------------------------------------------------------------------------
  const toast = (() => {
    let el = null, timer = 0;
    return {
      show(html, color = red){
        css();
        if(!el){ el = document.createElement('div'); el.className = 'ct-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
        el.innerHTML = `<span class="ct-toast-dot" style="background:${color}"></span><span>${html}</span>`;
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        clearTimeout(timer); timer = setTimeout(() => el?.classList.remove('on'), 3600);
      },
      hide(){ clearTimeout(timer); el?.remove(); el = null; },
    };
  })();

  const form = (() => {
    let veil = null, f = null, state = 'closed', timers = [], keyCap = null;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
    function buildDom(){
      css();
      veil = document.createElement('div'); veil.className = 'ct-veil';
      veil.innerHTML = `
        <form class="ct-paper" novalidate aria-label="Write Andrew a letter">
          <div class="ct-stamp" aria-hidden="true"><svg viewBox="0 0 60 72"><circle cx="30" cy="38" r="15" fill="#3b4f9e"/><circle cx="25" cy="33" r="4" fill="#8fa2ff"/><path d="M23 24l7-6 7 6" stroke="#35a36a" stroke-width="4" fill="none" stroke-linecap="round"/><text x="30" y="66" text-anchor="middle" font-family="Fredoka,system-ui" font-weight="700" font-size="10" fill="#fffaf0">ISLAND POST</text></svg></div>
          <div class="ct-mark" aria-hidden="true">MAILBOX<br>ISLAND</div>
          <h2 class="ct-dear">Dear Andrew,</h2>
          <label class="ct-f"><span>Your name</span><input name="name" autocomplete="name" maxlength="80" required></label>
          <div class="ct-err" data-for="name"></div>
          <label class="ct-f"><span>Your email</span><input name="email" type="email" autocomplete="email" maxlength="120" required></label>
          <div class="ct-err" data-for="email"></div>
          <label class="ct-f ct-msg"><span>Your letter</span><textarea name="message" rows="5" maxlength="3000" required></textarea></label>
          <div class="ct-err" data-for="message"></div>
          <p class="ct-note">No server here: Send opens your email app with this letter ready to go to ${esc(EMAIL)}.</p>
          <div class="ct-row"><button type="button" class="ct-cancel">Not now</button><button type="submit" class="ct-send">Fold and send</button></div>
        </form>
        <div class="ct-env" aria-hidden="true"><div class="ct-flap"></div><div class="ct-to">To: Andrew Liu</div><div class="ct-seal"></div></div>`;
      document.body.appendChild(veil);
      f = veil.querySelector('form');
      f.addEventListener('submit', ev => { ev.preventDefault(); send(); });
      veil.querySelector('.ct-cancel').addEventListener('click', () => close());
      veil.addEventListener('pointerdown', ev => { if(ev.target === veil && state === 'open') close(); });
      f.addEventListener('input', ev => { const n = ev.target.name; if(n) setErr(n, ''); });
    }
    function setErr(name, msg){
      const el = f.querySelector(`.ct-err[data-for="${name}"]`), inp = f.elements[name];
      el.textContent = msg; inp.toggleAttribute('aria-invalid', !!msg); inp.closest('.ct-f').classList.toggle('bad', !!msg);
    }
    function validate(){
      const v = { name:f.elements.name.value.trim(), email:f.elements.email.value.trim(), message:f.elements.message.value.trim() };
      const errs = {};
      if(!v.name) errs.name = 'Sign your letter: what is your name?';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errs.email = 'An email Andrew can write back to, like you@example.com';
      if(v.message.length < 10) errs.message = 'A few more words, please (10 characters or more).';
      for(const k of ['name', 'email', 'message']) setErr(k, errs[k] || '');
      return { v, errs, ok:!Object.keys(errs).length };
    }
    function open(){
      if(state !== 'closed') return false;
      if(!veil) buildDom();
      ctx.input?.clear?.();
      f.classList.remove('fold', 'shake'); veil.querySelector('.ct-env').className = 'ct-env';
      for(const k of ['name', 'email', 'message']) setErr(k, '');
      veil.style.display = ''; requestAnimationFrame(() => veil.classList.add('on'));
      state = 'open';
      // Esc and stray keys stop here, so the room does not also close or the walker move; typing still works
      keyCap = ev => {
        if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); if(state === 'open') close(); return; }
        const typing = /^(INPUT|TEXTAREA)$/.test(ev.target?.tagName);
        if(!typing || state !== 'open') ev.stopPropagation();
      };
      addEventListener('keydown', keyCap, true);
      setTimeout(() => f.elements.name.focus(), 60);
      tone(660, 0.12, 'triangle', 0.08);
      return true;
    }
    function close(now){
      if(state === 'closed') return;
      for(const t of timers) clearTimeout(t); timers = [];
      removeEventListener('keydown', keyCap, true); keyCap = null;
      state = 'closed';
      if(!veil) return;
      veil.classList.remove('on');
      if(now) veil.style.display = 'none'; else timers.push(setTimeout(() => { if(state === 'closed') veil.style.display = 'none'; }, 260));
      document.activeElement?.blur?.();
    }
    function send(){
      if(state !== 'open') return { ok:false, errs:{ state } };
      const r = validate();
      if(!r.ok){
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        tone(180, 0.2, 'square', 0.05, 120);
        f.elements[Object.keys(r.errs)[0]].focus();
        return r;
      }
      state = 'sending'; document.activeElement?.blur?.();
      const { name, email, message } = r.v;
      // The site is static with no backend, so there is nowhere to POST a form to. A mailto: link is
      // the honest option: the visitor's own email app sends the letter, from their own address.
      const href = `mailto:${EMAIL}?subject=${encodeURIComponent(`A letter from ${name} (via the island)`)}&body=${encodeURIComponent(`${message}\n\n${name}\n${email}`)}`;
      const slow = ctx.state.reduced ? 0.4 : 1;
      const envEl = veil.querySelector('.ct-env');
      f.classList.add('fold');
      tone(520, 0.1, 'triangle', 0.06);
      timers.push(setTimeout(() => { envEl.classList.add('on'); tone(700, 0.08, 'sine', 0.06); }, 380*slow));
      timers.push(setTimeout(() => {
        // aim the shrinking envelope at the paper on the desk, where the 3D letter takes off
        const p = deskPoint();
        if(p){ envEl.style.setProperty('--dx', `${p.x - innerWidth/2}px`); envEl.style.setProperty('--dy', `${p.y - innerHeight/2}px`); }
        envEl.classList.add('fly'); veil.classList.remove('on');
      }, 1000*slow));
      timers.push(setTimeout(() => {
        veil.style.display = 'none';
        removeEventListener('keydown', keyCap, true); keyCap = null;
        const finish = () => {
          state = 'closed';
          // still inside the click's activation window (about 5 s), so the email app is allowed to open
          openMail(href);
          toast.show(`Your email app should open with the letter. No app? Write to <b style="user-select:all">${EMAIL}</b>`, '#3b4f9e');
          f.reset();
        };
        if(deskR?.fly && ctx.state.interior === room) deskR.fly(finish); else finish();
      }, 1450*slow));
      return r;
    }
    function deskPoint(){
      try {
        const v = new ctx.THREE.Vector3(deskR.cx - 1.7, 1.1, -3.58).project(room.camera);
        return { x:(v.x + 1)/2*innerWidth, y:(1 - v.y)/2*innerHeight };
      } catch(e){ return null; }
    }
    function fill(o = {}){ if(!veil) buildDom(); for(const k of ['name', 'email', 'message']) if(o[k] != null) f.elements[k].value = o[k]; return true; }
    return { open, close, send, fill, state:() => state };
  })();

  ctx.expose?.('contact', {
    open: () => form.open(), close: () => form.close(true), send: () => form.send(), fill: o => form.fill(o), form: () => form.state(),
    dry: (on = true) => { S.dry = !!on; return S.dry; }, log: () => [...S.log], letters: () => S.letters, stamps: () => S.stamps,
    use: key => debug[key]?.() ?? null,
  });
  return room;
}

// ---------------------------------------------------------------------------------------------
// Pieces and drawings
// ---------------------------------------------------------------------------------------------

// A small envelope: body, flap and a red seal, lying flat.
function envelope(R, parent, x, y, z, color = '#fffaf0'){
  const { THREE, H } = R;
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  H.box(0.46, 0.025, 0.3, color, 0, 0, 0, g);
  const flap = H.mesh(new THREE.ConeGeometry(0.18, 0.02, 3), '#f0d9ae', 0, 0.016, -0.05, g); flap.rotation.y = Math.PI; flap.scale.set(1.25, 1, 0.62);
  H.cyl(0.045, 0.045, 0.02, '#d9534f', 0, 0.026, 0.02, g, 10);
  return g;
}

function plate(H, g, w, h, st){
  g.fillStyle = '#fffaf0'; H.rr(g, 0, 0, w, h, 22); g.fill();
  g.fillStyle = st.body; H.rr(g, 0, 0, w, 50, 22); g.fill(); g.fillRect(0, 26, w, 24);
  g.fillStyle = '#ffffff'; H.F(g, 700, 34); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st.name, w/2, 27);
  let size = 24; H.F(g, 700, size, 'Nunito'); while(g.measureText(st.handle).width > w - 28 && size > 12){ size--; H.F(g, 700, size, 'Nunito'); }
  g.fillStyle = '#1f2a44'; g.fillText(st.handle, w/2, 88);
  const label = st.verb === 'copy' ? 'copy the address' : 'open in a new tab';
  H.F(g, 700, 19); const tw = g.measureText(label).width + 62, x0 = (w - tw)/2;
  g.fillStyle = '#1f2a44'; H.rr(g, x0, h - 60, tw, 40, 20); g.fill();
  g.fillStyle = '#fffaf0'; H.rr(g, x0 + 6, h - 54, 28, 28, 8); g.fill();
  g.fillStyle = '#1f2a44'; H.F(g, 700, 18); g.fillText('F', x0 + 20, h - 39);
  g.fillStyle = '#fffaf0'; H.F(g, 600, 18); g.textAlign = 'left'; g.fillText(label, x0 + 42, h - 39);
}

function disc(g, w, h, color){
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(w/2, h/2, w/2 - 2, 0, 7); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(w/2, h/2, w/2 - 16, 0, 7); g.fill();
}
function iconCode(H, g, w, h, st){
  disc(g, w, h, st.body);
  g.fillStyle = '#fffaf0'; H.F(g, 700, w*0.3); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('</>', w/2, h*0.44);
  H.F(g, 700, w*0.1); g.fillStyle = '#8fd3ff'; g.fillText('GitHub', w/2, h*0.7);
}
function iconIn(H, g, w, h, st){
  disc(g, w, h, st.body);
  g.fillStyle = '#fffaf0'; H.rr(g, w*0.3, h*0.26, w*0.4, h*0.4, w*0.07); g.fill();
  g.fillStyle = st.body; H.F(g, 700, w*0.27); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('in', w/2, h*0.47);
  H.F(g, 700, w*0.1); g.fillStyle = '#fffaf0'; g.fillText('LinkedIn', w/2, h*0.78);
}
function iconMail(H, g, w, h, st){
  disc(g, w, h, st.body);
  const x = w*0.26, y = h*0.3, ew = w*0.48, eh = h*0.32;
  g.fillStyle = '#fffaf0'; H.rr(g, x, y, ew, eh, 8); g.fill();
  g.strokeStyle = st.body; g.lineWidth = w*0.03; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(w/2, y + eh*0.6); g.lineTo(x + ew - 6, y + 6); g.stroke();
  H.F(g, 700, w*0.1); g.fillStyle = '#fffaf0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Email', w/2, h*0.77);
}

// Six island stamps with perforated edges.
function stampSheet(H, g, w, h){
  g.fillStyle = '#fdf2e4'; g.fillRect(0, 0, w, h);
  const cs = ['#3b4f9e', '#d6689a', '#c8102e', '#4fa3c7', '#6fae4a', '#e58a3b'];
  const names = ['Blueberry', 'Second Brain', 'Terrapin', 'Clinic', 'Yard', 'Mailbox'];
  const n = 6, sw = (w - 40)/n - 14, sh = h - 60;
  for(let k = 0; k < n; k++){
    const x = 20 + k*((w - 40)/n) + 7, y = 26, tilt = (k % 2 ? 1 : -1)*0.04;
    g.save(); g.translate(x + sw/2, y + sh/2); g.rotate(tilt); g.translate(-sw/2, -sh/2);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, sw, sh);
    g.fillStyle = '#fdf2e4'; for(let px = 6; px < sw; px += 12){ g.beginPath(); g.arc(px, 0, 4, 0, 7); g.arc(px, sh, 4, 0, 7); g.fill(); }
    for(let py = 6; py < sh; py += 12){ g.beginPath(); g.arc(0, py, 4, 0, 7); g.arc(sw, py, 4, 0, 7); g.fill(); }
    g.fillStyle = cs[k]; g.fillRect(9, 9, sw - 18, sh - 40);
    g.fillStyle = '#ffffffd0'; g.beginPath(); g.arc(sw/2, 9 + (sh - 40)/2, Math.min(sw, sh)/5, 0, 7); g.fill();
    g.fillStyle = '#1f2a44'; H.F(g, 700, 13); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(names[k], sw/2, sh - 16);
    g.restore();
  }
}

// Styles for the letter form and the toast, added once.
function css(){
  if(document.getElementById('contact-css')) return;
  const s = document.createElement('style'); s.id = 'contact-css';
  s.textContent = `
.ct-veil{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:16px;background:rgba(31,42,68,.42);opacity:0;transition:opacity .25s}
.ct-veil.on{opacity:1}
.ct-paper{position:relative;box-sizing:border-box;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;margin:0;padding:26px 28px 20px 66px;border-radius:8px 8px 22px 8px;
  color:#1f2a44;font:16px/32px Nunito,system-ui,sans-serif;background-color:#fffaf0;
  background-image:linear-gradient(90deg,transparent 48px,#f2a0a0 48px,#f2a0a0 50px,transparent 50px),repeating-linear-gradient(#fffaf0 0 31px,#d6e4f3 31px 32px);
  box-shadow:0 10px 0 #0000002a,0 26px 60px #00000040;transform:rotate(-1deg) translateY(10px);transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.ct-veil.on .ct-paper{transform:rotate(-1deg)}
.ct-paper.shake{animation:ct-shake .4s}
.ct-paper.fold{animation:ct-fold .42s ease-in forwards}
@keyframes ct-shake{20%{translate:-10px 0}40%{translate:9px 0}60%{translate:-6px 0}80%{translate:4px 0}}
@keyframes ct-fold{0%{transform:rotate(-1deg)}45%{transform:perspective(900px) rotateX(62deg) scale(.9,.55)}100%{transform:perspective(900px) rotateX(80deg) scale(.55,.2);opacity:0}}
.ct-stamp{position:absolute;right:18px;top:16px;width:60px;height:72px;background:#d9534f;border:4px dotted #fffaf0;outline:3px solid #d9534f;transform:rotate(4deg)}
.ct-stamp svg{display:block;width:100%;height:100%}
.ct-mark{position:absolute;right:62px;top:46px;width:70px;height:70px;border:3px solid #3b4f9e88;border-radius:50%;display:grid;place-items:center;text-align:center;font:700 10px/12px Fredoka,system-ui;color:#3b4f9e99;transform:rotate(-14deg);pointer-events:none}
.ct-dear{margin:0 0 4px;font:700 30px/48px Fredoka,system-ui,sans-serif;color:#1f2a44}
.ct-f{display:block;margin:0}
.ct-f span{display:block;font:700 12px/20px Fredoka,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#6b7390;margin-top:4px}
.ct-f input,.ct-f textarea{display:block;box-sizing:border-box;width:100%;margin:0;border:0;border-bottom:2px dashed #9fb3cc;background:transparent;color:#1f2a44;font:600 18px/32px Nunito,system-ui,sans-serif;padding:0 4px;outline:none;border-radius:0}
.ct-f textarea{resize:vertical;min-height:160px;border-bottom:0;background:transparent}
.ct-f input:focus{border-bottom-color:#3b4f9e}
.ct-f textarea:focus{box-shadow:inset 3px 0 0 #3b4f9e55}
.ct-f.bad input{border-bottom-color:#d9534f}.ct-f.bad textarea{box-shadow:inset 3px 0 0 #d9534f}
.ct-err{min-height:0;font:700 13px/18px Nunito,system-ui;color:#c43d39}
.ct-err:empty{display:none}
.ct-note{margin:6px 0 0;font:600 13px/20px Nunito,system-ui;color:#6b7390}
.ct-row{display:flex;justify-content:flex-end;gap:10px;margin-top:12px;flex-wrap:wrap}
.ct-row button{font:700 17px/1 Fredoka,system-ui,sans-serif;border:0;border-radius:999px;padding:13px 22px;cursor:pointer}
.ct-send{background:#d9534f;color:#fff;box-shadow:0 5px 0 #9c3431}
.ct-send:active{transform:translateY(3px);box-shadow:0 2px 0 #9c3431}
.ct-cancel{background:transparent;color:#4b5675;box-shadow:inset 0 0 0 2px #c9cfdd}
.ct-row button:focus-visible{outline:3px solid #3b4f9e;outline-offset:3px}
.ct-env{position:absolute;left:50%;top:50%;width:300px;height:190px;margin:-95px 0 0 -150px;border-radius:10px;background:#fff4dc;box-shadow:0 8px 0 #0000002a;perspective:700px;opacity:0;transform:scale(.6);pointer-events:none;
  background-image:linear-gradient(to top right,#f3e3c4 50%,transparent 50.5%),linear-gradient(to top left,#f3e3c4 50%,transparent 50.5%);background-size:50% 100%;background-position:left bottom,right bottom;background-repeat:no-repeat}
.ct-env.on{opacity:1;transform:scale(1);transition:opacity .15s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.ct-flap{position:absolute;left:0;top:0;width:100%;height:62%;background:#ead3a8;clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:50% 0;transform:rotateX(178deg);transition:transform .32s .12s ease-in}
.ct-env.on .ct-flap{transform:rotateX(0)}
.ct-seal{position:absolute;left:50%;top:60%;width:42px;height:42px;margin:-21px;border-radius:50%;background:#d9534f;box-shadow:inset 0 -4px 0 #0000002a;transform:scale(0);transition:transform .25s .42s cubic-bezier(.3,1.9,.5,1)}
.ct-env.on .ct-seal{transform:scale(1)}
.ct-to{position:absolute;left:0;right:0;bottom:22px;text-align:center;font:700 16px Fredoka,system-ui;color:#8a6440}
.ct-env.on.fly{transition:transform .45s ease-in,opacity .45s ease-in;opacity:0;transform:translate(var(--dx,0),var(--dy,200px)) scale(.12) rotate(-25deg)}
.ct-toast{position:fixed;left:50%;bottom:74px;z-index:46;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 18px;border-radius:18px;background:#fffaf0;color:#1f2a44;
  font:600 15px/1.35 Nunito,system-ui,sans-serif;box-shadow:0 5px 0 #0000001f;transform:translate(-50%,16px);opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.3,1.5,.5,1);pointer-events:none}
.ct-toast.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.ct-toast b{font-family:Fredoka,system-ui,sans-serif;overflow-wrap:anywhere}
.ct-toast-dot{flex:none;width:14px;height:14px;border-radius:50%}
@media (prefers-reduced-motion:reduce){.ct-paper,.ct-env,.ct-flap,.ct-seal,.ct-toast{transition-duration:.01s!important;animation-duration:.01s!important}}`;
  document.head.appendChild(s);
}
