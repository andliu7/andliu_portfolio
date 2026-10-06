import { buildRobot } from './models.js';

// The station: the hub of the space world. A round, open-topped deck floating in space, with four
// labelled airlocks along the back wall (walk into one to travel), big window gaps onto the stars,
// a ringed planet and the island far below, the Blueberry satellite drifting past, Cosmo the
// station robot (F or C to chat), a case that lights up with every star shard, the Mission Log
// board, and the wing pad home.
//
// EDIT COSMO'S CHAT HERE. Every fact is from src/data/zones.js. Format (ui/dialog.js run()):
//   node = { lines:[...], choices?:[['Label', 'nodeId' | null]], next?:'nodeId', give?:true, given?:[...] }
//   give:true hands over SOUVENIR once (with a "Got it" line); given replaces the lines after that.
export const COSMO = {
  name:'Cosmo', portrait:'robot', color:'#7ff0ff', voice:[700, 0.5, 'square'],
  start:'hi',
  nodes:{
    hi: { lines:['Beep boop! Welcome aboard, astronaut.', 'I keep this little station tidy while Andrew is down on the island.'],
      choices:[['Where am I?', 'where'], ['Who is Andrew?', 'andrew'], ['What are star shards?', 'shards'], ['Bye!', 'bye']] },
    where: { lines:['This is the station. Four airlocks, four places: Tiny Planet, Moon Base, Asteroid Field and Wormhole Lab.',
      'Walk into a door to go. Press Esc out there to come straight back here.'],
      choices:[['Who is Andrew?', 'andrew'], ['Got it. Bye!', 'bye']] },
    andrew: { lines:['Andrew studies Computer Science at the University of Maryland. Class of May 2027, on the pre-dental track.',
      'See that satellite out the window? That is Blueberry, the learning platform he co-founded.'],
      choices:[['Tell me about Blueberry', 'blueberry'], ['What else has he built?', 'more'], ['Bye!', 'bye']] },
    blueberry: { lines:['Blueberry started as a flashcard tool for classmates.',
      'Now it is an AI-assisted organic chemistry learning platform, with a curved-arrow mechanism trainer and in-browser grading with RDKit.js.'], next:'gift' },
    more: { lines:['Second Brain: notes, AI chat, nutrition and workout logging, goals and a project dashboard, all in one app.',
      'And the docs and onboarding for Browser Use, an open-source AI agent platform with 2,000+ users.'], next:'gift' },
    gift: { lines:['You ask good questions. Every astronaut needs one of these.'], give:true,
      given:['You already have your Mission Patch. Wear it with pride!'] },
    shards: { lines:['Eight star shards fell across the four areas, two in each.',
      'Bring all eight home and something on the island will change. Look up at night!'],
      choices:[['Who is Andrew?', 'andrew'], ['On it. Bye!', 'bye']] },
    bye: { lines:['Safe travels! The wing pad takes you home.'] },
  },
};
export const SOUVENIR = { id:'mission-patch', name:'Mission Patch', icon:'stamp', desc:'From Cosmo on the space station, for asking about Andrew.' };

const R = 10.2;                                   // deck radius
const DOORS = [                                   // airlocks along the back wall, angle in degrees (z < 0 is the back)
  { to:'planet', deg:-145 }, { to:'moon', deg:-110 }, { to:'asteroids', deg:-70 }, { to:'lab', deg:-35 },
];
const PAD = { x:-5.4, z:5.4 };

export function build(ctx, kit){
  const { THREE, H } = kit;
  const D2R = Math.PI/180;
  const scene = kit.scene({ bg:'#0b1030', stars:1100, seed:7, shadow:true, shadowBox:13 });
  const camera = kit.camera(50);
  kit.ringedPlanet(scene, { x:70, y:18, z:-150, r:22 });
  kit.islandPlanet(scene, { x:-70, y:-4, z:-120, r:15 });

  /* ---------- the deck ---------- */
  const deck = H.cyl(R + 0.4, R, 0.5, '#e9ecf5', 0, -0.25, 0, scene, 56); deck.castShadow = false;
  H.cyl(R - 0.4, R - 0.4, 1.4, '#c9cfe0', 0, -1.2, 0, scene, 40).castShadow = false;           // the hull underneath
  const flat = (r0, r1, color) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 56).rotateX(-Math.PI/2), H.mat(color)); m.position.y = 0.012; m.receiveShadow = true; scene.add(m); };
  flat(2.1, 2.35, '#ffd166'); flat(7.3, 7.55, '#8fa0e6');

  /* ---------- the back wall: airlocks and windows ---------- */
  const wallMat = '#f4f3ee';
  const doors = [];
  for(const d of DOORS){
    const meta = kit.AREAS.find(a => a.id === d.to), a = d.deg*D2R;
    const g = new THREE.Group(); g.position.set(Math.cos(a)*R, 0, Math.sin(a)*R); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); scene.add(g);   // local +z faces the centre
    for(const sx of [-1.2, 1.2]) H.box(0.4, 3.4, 0.6, wallMat, sx, 1.7, 0, g);
    H.box(2.8, 0.5, 0.6, wallMat, 0, 3.4, 0, g);
    H.box(2.0, 0.08, 0.7, meta.color, 0, 0.04, 0.2, g).castShadow = false;
    const door = H.box(2.0, 3.1, 0.14, meta.color, 0, 1.55, -0.18, g);
    for(const y of [-0.9, -0.3, 0.3, 0.9]) H.box(1.7, 0.08, 0.02, '#ffffff', 0, y, 0.08, door);   // stripes ride on the door
    const icon = new THREE.Group(); icon.position.set(0, 4.2, 0); g.add(icon);
    if(d.to === 'planet'){ H.ball(0.35, meta.color, 0, 0, 0, icon, 14); H.ball(0.1, '#ffffff', 0.2, 0.3, 0.1, icon, 8); }
    if(d.to === 'moon'){ H.ball(0.35, '#e6e9f2', 0, 0, 0, icon, 14); H.ball(0.08, '#b7c0d4', -0.1, 0.08, 0.3, icon, 8); H.ball(0.06, '#b7c0d4', 0.14, -0.1, 0.3, icon, 8); }
    if(d.to === 'asteroids'){ H.mesh(new THREE.DodecahedronGeometry(0.34, 0), meta.color, 0, 0, 0, icon); H.mesh(new THREE.DodecahedronGeometry(0.16, 0), '#8d8579', 0.42, 0.2, 0, icon); }
    if(d.to === 'lab'){ const s = H.mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), '#ff9f5a', -0.22, 0, 0, icon); s.rotation.y = 0.4; const b = H.mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), '#5b8cff', 0.22, 0, 0, icon); b.rotation.y = -0.4; }
    const lbl = kit.label(meta.title, meta.color, '#ffffff'); lbl.position.set(0, 5.0, 0.2); lbl.scale.set(3.2, 0.9, 1); g.add(lbl);
    // walking into the doorway travels
    const tx = Math.cos(a)*(R - 0.9), tz = Math.sin(a)*(R - 0.9);
    kit.trigger({ x:tx, y:0, z:tz, r:1.1, onEnter:() => kit.go(d.to) });
    doors.push({ door, icon, to:d.to, x:tx, z:tz, a, open:0 });
  }
  // windows between and beside the airlocks: a sill and a lintel, the gap full of stars
  for(const deg of [-172, -127.5, -90, -52.5, -8]){
    const a = deg*D2R, span = deg === -172 || deg === -8 ? 16 : 17.5;
    const w = 2*R*Math.sin(span*D2R/2);                       // chord length of the arc this window fills
    const g = new THREE.Group(); g.position.set(Math.cos(a)*R, 0, Math.sin(a)*R); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); scene.add(g);
    H.box(w, 0.9, 0.5, wallMat, 0, 0.45, 0, g);
    H.box(w, 0.4, 0.5, wallMat, 0, 3.45, 0, g);
    H.box(0.14, 2.6, 0.14, '#c9cfe0', 0, 2.1, 0, g);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.55), new THREE.MeshStandardMaterial({ color:'#bfe3ff', transparent:true, opacity:0.1, roughness:0.05, depthWrite:false }));
    glass.position.set(0, 2.18, 0); g.add(glass);
  }
  // the front half: a low rail so the camera sees in
  const rail = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.09, 6, 48, Math.PI*1.1), H.mat('#c9cfe0'));
  rail.rotation.x = Math.PI/2; rail.rotation.z = -Math.PI*0.05;   // the arc runs through +z, the side nearest the camera rail.position.y = 0.95; scene.add(rail);
  for(let deg = 12; deg <= 168; deg += 26){ const a = deg*D2R; H.cyl(0.07, 0.07, 0.95, '#c9cfe0', Math.cos(a)*(R - 0.1), 0.47, Math.sin(a)*(R - 0.1), scene, 6); }

  /* ---------- shard case in the middle ---------- */
  H.cyl(0.9, 1.1, 0.9, '#d9dde6', 0, 0.45, 0, scene, 24);
  H.cyl(0.95, 0.95, 0.08, '#4a5fd0', 0, 0.92, 0, scene, 24);
  const caseG = new THREE.Group(); caseG.position.y = 1.55; scene.add(caseG);
  const sockets = kit.SHARD_IDS.map((id, i) => {
    const a = i/8*Math.PI*2, m = new THREE.Mesh(kit.parts.geo, kit.parts.dim);
    m.position.set(Math.cos(a)*0.62, 0, Math.sin(a)*0.62); m.scale.setScalar(0.55); caseG.add(m);
    return { id, m };
  });
  let lit = -1;
  function paintCase(){
    const n = kit.SHARD_IDS.filter(id => kit.collected(id)).length; if(n === lit) return; lit = n;
    for(const s of sockets) s.m.material = kit.collected(s.id) ? kit.parts.mat : kit.parts.dim;
  }
  kit.interactable({ x:0, y:0, z:0, r:2.3, label:'Star shards', onUse:() => {
    const n = kit.SHARD_IDS.filter(id => kit.collected(id)).length;
    kit.say(n >= 8 ? 'All 8 star shards! Look to the islet at night.' : `Star shards ${n} of 8. Two in every area.`);
  } });

  /* ---------- Cosmo ---------- */
  const cosmo = buildRobot(THREE, H, scene, 3.4, 0, 2.0); cosmo.group.rotation.y = -0.6;
  kit.interactable({ obj:cosmo.group, offset:[0, 0, 0], r:2.6, label:'Talk to Cosmo', talk:true, onUse:talk });
  let chatting = false;
  async function talk(){
    const dlg = ctx.modules.dialog; cosmo.wave();
    if(typeof dlg?.run !== 'function'){ kit.say(COSMO.nodes.hi.lines[0]); return; }
    if(chatting || dlg.busy?.()) return;
    chatting = true; ctx.input.clear();
    try { await dlg.run({ ...COSMO, onEnter:(id, node) => withGift(node) }); }
    catch(e){ console.error('[space] Cosmo chat failed', e); }
    chatting = false;
  }
  function withGift(node){
    if(!node.give) return node;
    if(kit.flag('patch')) return { ...node, lines:node.given?.length ? node.given : node.lines };
    return { ...node, lines:[...node.lines, { text:`Got ${SOUVENIR.name}!`, got:true, fn(){
      let ok = false; try { ok = !!ctx.modules.inventory?.add?.({ ...SOUVENIR }); } catch(e){ console.error('[space] gift failed', e); }
      if(ok || !ctx.modules.inventory) kit.setFlag('patch', true);
    } }] };
  }

  /* ---------- Mission Log board (résumé egg) ---------- */
  const log = ['blueberry', 'brain', 'dock', 'school', 'umd'].map(id => kit.zone(id)).filter(Boolean).map(z => `${z.title}: ${z.role}`);
  kit.sign(scene, 6.4, 0, 3.4, { title:'Mission Log', sub:'Andrew Liu, astronaut in training', lines:log, color:'#1f2a44', w:4.2, h:2.6, rot:-0.9 });
  const colliders = [
    { kind:'circle', x:0, z:0, r:1.15 },
    { kind:'circle', x:3.4, z:2.0, r:0.75 },
    { kind:'box', x:6.4, z:3.4, ang:-0.9, hw:2.2, hd:0.2 },
  ];

  /* ---------- Blueberry, drifting past the windows ---------- */
  const zb = kit.zone('blueberry');
  const sat = new THREE.Group(); scene.add(sat);
  H.ball(0.9, zb?.color || '#3b4f9e', 0, 0, 0, sat, 20);
  const crown = H.mesh(new THREE.ConeGeometry(0.35, 0.4, 5), '#2c3a8f', 0, 0.95, 0, sat); crown.rotation.x = Math.PI;
  for(const s of [-1, 1]){ H.box(1.8, 0.05, 0.9, '#2f3f8f', s*1.9, 0, 0, sat); H.box(0.5, 0.08, 0.08, '#b7c0d4', s*0.95, 0, 0, sat); }
  const satLbl = kit.label(zb?.title || 'Blueberry', '#3b4f9e', '#ffffff'); satLbl.position.y = 1.9; sat.add(satLbl);

  /* ---------- the wing pad home ---------- */
  const pad = kit.wingPad(scene, PAD.x, 0, PAD.z, { rot:Math.PI*0.75, label:'Home' });   // wings toward the rail, open to the centre

  /* ---------- the walker ---------- */
  const floorAt = (x, z) => Math.hypot(x - PAD.x, z - PAD.z) < 1.35 ? pad.top : 0;
  const ctrl = kit.walker({ gravity:16, jump:6.5, speed:5, run:8.5, ring:{ r:R - 0.6 }, colliders, floorAt });
  const rig = kit.rig(camera, ctrl, { dist:9, height:7.5, look:1, back:[0, 0, 1] });

  function update(dt, t){
    paintCase();
    caseG.rotation.y += dt*0.4;
    cosmo.update(dt, t);
    const s = t*0.16; sat.position.set(Math.cos(s)*20, 5 + Math.sin(t*0.5)*0.6, Math.sin(s)*5 - 18); sat.rotation.y = -s;   // a slow ellipse behind the back wall
    const P = ctrl.pos;
    for(const d of doors){
      const want = Math.hypot(P.x - d.x, P.z - d.z) < 3.2 ? 1 : 0;
      d.open += (want - d.open)*Math.min(1, dt*6);
      d.door.position.y = 1.55 + d.open*2.6;
      d.icon.rotation.y += dt*(0.6 + d.open*3);
    }
    // Cosmo turns to watch you when you are close
    const dx = P.x - cosmo.group.position.x, dz = P.z - cosmo.group.position.z;
    if(dx*dx + dz*dz < 36) cosmo.group.rotation.y = H.lerpAngle(cosmo.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt*4));
  }

  return {
    title:'The Station', scene, camera, rig, update,
    spawn:{ x:PAD.x, y:pad.top, z:PAD.z, yaw:Math.atan2(-PAD.x, -PAD.z) },
    // back from an area: just inside the airlock you left through, facing the centre
    spawnFrom(from){
      const d = doors.find(q => q.to === from); if(!d) return null;
      return { x:Math.cos(d.a)*(R - 3), y:0, z:Math.sin(d.a)*(R - 3), yaw:Math.atan2(-Math.cos(d.a), -Math.sin(d.a)) };
    },
    hint:'<kbd>WASD</kbd> walk · <kbd>Space</kbd> jump · <kbd>F</kbd> use · <kbd>C</kbd> talk · walk into an airlock to travel · <kbd>Esc</kbd> home',
  };
}
