// Interior for the "umd" zone: University of Maryland. Three rooms built with the shared tour
// kit in blueberry.js. Content comes only from data/zones.js.
import { makeTour, burst } from './blueberry.js';

const ink = '#1f2a44', paper = '#fffaf0', red = '#c8102e', gold = '#ffd200';
const COURSES = ['Machine Learning', 'Computational Genomics', 'Algorithms', 'Data Science', 'Programming Languages', 'Computer Systems', 'Web Development'];

export function build(ctx, kit){
  return makeTour(ctx, kit, {
    sky:'#fff3e0', skyLow:'#8e0c22', plinth:'#5a2a2a',
    rooms: [
      { name:'Lecture Hall', sub:'B.S. Computer Science, expected May 2027', w:16, wall:'#fff6ea', floor:'#c99a6b', floor2:'#bf8f60', accent:red, build:lectureHall },
      { name:'Terrapin Hall', sub:'Say hi to the terrapin', w:14, wall:'#f7f1e6', floor:'#e8e2d6', floor2:'#ddd6c8', accent:'#b8860b', rug:red, build:terrapinHall },
      { name:'Two Tracks', sub:'Computer science and the pre-dental track, side by side', w:14, wall:'#eef6fb', floor:'#dfe9f0', floor2:'#d3e0ea', accent:'#3a86b4', build:twoTracks },
    ],
  });
}

function lectureHall(R){
  const { THREE, H } = R;
  let course = 0, changed = -10;
  // projector screen showing the coursework, one course per slide
  R.box(7.4, 3.0, 0.1, ink, 0, 1.6, -5.86);
  const slide = R.screen(7.2, 2.8, (g, w, h, t) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = red; g.fillRect(0, 0, w, 60); g.fillStyle = gold; g.fillRect(0, 60, w, 8);
    g.fillStyle = '#ffffff'; H.F(g, 700, 30); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Coursework', 24, 31);
    g.textAlign = 'right'; H.F(g, 600, 22, 'Nunito'); g.fillText(`${course + 1} / ${COURSES.length}`, w - 24, 31);
    const p = Math.min(1, (t - changed)*3), off = (1 - p)*60;
    g.globalAlpha = p; g.fillStyle = ink; g.textAlign = 'center'; H.F(g, 700, 64); g.fillText(COURSES[course], w/2 + off, h*0.52);
    g.globalAlpha = 1; H.F(g, 600, 22, 'Nunito'); g.fillStyle = '#8a93a8';
    g.fillText(COURSES.filter((c, k) => k !== course).slice(0, 4).join('  ·  '), w/2, h - 40);
  }, { x:0, y:1.6, z:-5.8, fps:15, px:100 });
  // lectern
  const lect = new THREE.Group(); lect.position.set(-4.4, 0, -4.0); R.g.add(lect);
  R.box(1.0, 1.2, 0.8, '#8a5a3b', 0, 0.6, 0, lect); R.box(1.2, 0.1, 0.9, red, 0, 1.25, 0, lect);
  R.solid(-4.4, -4.0, 0.6, 0.45);
  R.blob(paper, -4.4, -4.9, { face:0.5, cap:red });
  // tiered seating: three steps, rising toward the camera
  const cols = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db', '#ffb35c'];
  for(let row = 0; row < 3; row++){
    const z = -1.9 + row*1.6, y = row*0.3;
    for(const side of [-1, 1]){
      const cx = side*3.6;
      if(y > 0) R.box(5.4, y, 1.6, '#a8784a', cx, y/2, z);
      R.box(5.2, 0.1, 0.4, '#8a5a3b', cx, y + 0.85, z - 0.55);
      for(let s = 0; s < 4; s++){
        const x = cx - 1.9 + s*1.25;
        R.box(0.8, 0.3, 0.6, red, x, y + 0.15, z + 0.2); R.box(0.8, 0.3, 0.12, '#a10d25', x, y + 0.42, z + 0.5);
        if((s + row) % 3 !== 1) R.blob(cols[(s + row*2) % 6], x, z + 0.1, { face:Math.PI, scale:0.55, amp:0.02, y });
      }
      R.solid(cx, z, 2.75, 0.8);
    }
  }
  R.use({ key:'course', x:0, z:2.6, r:2.6, label:'Next course', hit:slide.mesh, pitch:560, fn(t){ course = (course + 1) % COURSES.length; changed = t; } });
}

function terrapinHall(R){
  const { THREE, H } = R;
  let hi = -10;
  // columns and banners
  for(const sx of [-5.2, -2.6, 2.6, 5.2]){
    R.cyl(0.35, 0.4, 3.6, '#fffaf0', sx, 1.8, -4.6, R.g, 14); R.box(0.9, 0.2, 0.9, '#e8e2d6', sx, 3.7, -4.6); R.box(0.9, 0.2, 0.9, '#e8e2d6', sx, 0.1, -4.6);
    R.solidR(sx, -4.6, 0.5);
  }
  for(const [sx, c] of [[-3.9, red], [3.9, gold]]){ const b = R.box(1.2, 2.0, 0.05, c, sx, 2.2, -5.8); b.castShadow = false; }
  // the terrapin statue on a plinth
  R.box(2.8, 0.45, 2.4, '#d8d2c4', 0, 0.22, -1.6); R.box(3.0, 0.12, 2.6, '#bdb5a4', 0, 0.5, -1.6); R.solid(0, -1.6, 1.5, 1.3);
  const statue = new THREE.Group(); statue.position.set(0, 0.56, -1.6); R.g.add(statue);
  const bronze = new THREE.MeshStandardMaterial({ color:'#b08a4e', roughness:0.35, metalness:0.45 });
  const nose = new THREE.MeshStandardMaterial({ color:'#e9c46a', roughness:0.2, metalness:0.9, emissive:'#6b4a10', emissiveIntensity:0.2 });
  const k = new THREE.Group(); k.scale.setScalar(1.7); statue.add(k);
  const shell = R.mesh(new THREE.SphereGeometry(0.75, 22, 12, 0, Math.PI*2, 0, Math.PI/2), bronze, 0, 0.25, 0, k); shell.scale.y = 0.75;
  R.mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 22), bronze, 0, 0.22, 0, k);
  for(let n = 0; n < 6; n++){ const a = n/6*Math.PI*2; R.mesh(new THREE.SphereGeometry(0.16, 8, 6), bronze, Math.cos(a)*0.42, 0.62, Math.sin(a)*0.42, k).scale.y = 0.45; }
  const head = new THREE.Group(); head.position.set(0, 0.45, 0.85); k.add(head);
  R.mesh(new THREE.SphereGeometry(0.3, 16, 12), bronze, 0, 0, 0, head);
  const snout = R.mesh(new THREE.SphereGeometry(0.1, 10, 8), nose, 0, -0.02, 0.28, head);
  if(H.eyes) H.eyes(head, 0.07, 0.25, 0.12, 0.05, false);
  for(const [lx, lz] of [[-.5, .45], [.5, .45], [-.5, -.45], [.5, -.45]]) R.mesh(new THREE.SphereGeometry(0.17, 10, 8), bronze, lx, 0.14, lz, k);
  const bubble = R.float('Hi!', 1.6, 3.2, -1.2, { size:36, bg:paper, fg:red }); bubble.visible = false;
  const spot = new THREE.SpotLight('#fff1c4', 30, 12, 0.5, 0.6, 1.5); spot.position.set(0, 5.5, 1.5); spot.target = statue; R.g.add(spot);
  R.tick((dt, t) => {
    const since = t - hi;
    const hop = since < 1.2 ? Math.abs(Math.sin(since*Math.PI*2.5))*0.4*(1 - since/1.2) : 0;
    statue.position.y = 0.56 + hop;
    head.rotation.x = since < 2 ? -0.3*Math.sin(since*6) : Math.sin(t*0.8)*0.05;
    head.rotation.y = since < 2 ? 0 : Math.sin(t*0.5)*0.3;
    nose.emissiveIntensity = 0.2 + (since < 2 ? 1.2*(1 - since/2) : 0);
    bubble.visible = since < 2.5; bubble.position.y = 2.6 + Math.min(0.3, since*0.6);
  });
  R.use({ key:'hi', x:0, z:0.8, r:2.6, y:3.3, label:'Say hi (rub the nose)', hit:statue, pitch:880, fn(t){ hi = t; burst(R, 0, 2.6, -0.8); } });
  // visitors
  R.blob('#ffd166', -3.4, 0.8, { face:0.6 }); R.blob('#8fd3ff', 3.4, 1.0, { face:-0.6, cap:red });
  R.solidR(-3.4, 0.8, 0.5); R.solidR(3.4, 1.0, 0.5);
}

function twoTracks(R){
  const { THREE, H } = R;
  let side = 0, swapT = -10;
  // a dividing line on the floor
  R.box(0.1, 0.02, 9, '#ffffff', 0, 0.02, -1.2).castShadow = false;
  R.float('Computer Science', -3.4, 3.4, -4.2, { size:28, bg:'#3a86b4', fg:'#ffffff' });
  R.float('Pre-Dental', 3.4, 3.4, -4.2, { size:28, bg:'#35a36a', fg:'#ffffff' });
  // CS: a desk, a monitor with code scrolling, and the coursework on sticky notes
  R.box(3.2, 0.08, 1.3, '#8a5a3b', -3.4, 0.9, -3.8); for(const lx of [-1.45, 1.45]) R.box(0.1, 0.9, 1.1, '#6b4a33', -3.4 + lx, 0.45, -3.8); R.solid(-3.4, -3.8, 1.65, 0.7);
  R.box(1.8, 1.1, 0.08, ink, -3.4, 1.6, -4.3);
  R.screen(1.7, 1.0, (g, w, h, t) => {
    g.fillStyle = '#1b1426'; g.fillRect(0, 0, w, h); H.F(g, 600, 13, 'monospace'); g.textAlign = 'left';
    const lines = ['def fit(X, y):', '  model.train(X, y)', 'align(read, genome)', 'dijkstra(graph, s)', 'SELECT * FROM data', 'fetch("/api")'];
    const off = (t*0.8|0) % lines.length;
    for(let n = 0; n < 6; n++){ g.fillStyle = ['#8fd3ff', '#ffd166', '#b5e48c', '#ff9fb2', '#cdb4db', '#ffb35c'][(n + off) % 6]; g.fillText(lines[(n + off) % lines.length], 10, 18 + n*15); }
  }, { x:-3.4, y:1.6, z:-4.25, fps:4 });
  COURSES.slice(0, 5).forEach((c, k) => { const s = R.screen(0.7, 0.5, (g, w, h) => { g.fillStyle = ['#ffd166', '#ff9fb2', '#8fd3ff', '#b5e48c', '#cdb4db'][k]; g.fillRect(0, 0, w, h); g.fillStyle = ink; H.F(g, 700, 11); g.textAlign = 'center'; const words = c.split(' '); words.forEach((wd, n) => g.fillText(wd, w/2, h/2 + (n - (words.length - 1)/2)*14 + 4)); }, { x:-5.8 + (k%3)*0.8, y:2.0 + (k/3|0)*0.6, z:-5.78, px:120 }); s.mesh.rotation.z = (k%2 ? 0.08 : -0.06); });
  // pre-dental: a big tooth model on a stand and a dental chair
  R.cyl(0.5, 0.6, 1.0, '#ffffff', 3.4, 0.5, -4.2); R.solidR(3.4, -4.2, 0.7);
  const tooth = new THREE.Group(); tooth.position.set(3.4, 1.0, -4.2); R.g.add(tooth);
  const crown = R.ball(0.62, '#fbfbf7', 0, 1.0, 0, tooth, 22); crown.scale.set(1, 0.85, 0.9);
  for(const sx of [-0.28, 0.28]){ const r = R.mesh(new THREE.ConeGeometry(0.2, 0.7, 12), '#fbfbf7', sx, 0.38, 0, tooth); r.rotation.x = Math.PI; }
  if(H.eyes) H.eyes(tooth, 1.05, 0.52, 0.2, 0.08);
  const chair = new THREE.Group(); chair.position.set(4.6, 0, -1.0); chair.rotation.y = -0.6; R.g.add(chair);
  R.cyl(0.3, 0.4, 0.6, '#9aa3b8', 0, 0.3, 0, chair); const seat = R.box(0.9, 0.2, 1.8, '#4fa3c7', 0, 0.7, 0, chair); seat.rotation.x = 0.1;
  const backrest = R.box(0.9, 1.1, 0.2, '#4fa3c7', 0, 1.2, -0.85, chair); backrest.rotation.x = -0.5;
  R.solid(4.6, -1.0, 0.8, 1.0);
  // a spotlight that swaps between the two tracks
  const spot = new THREE.SpotLight('#fff1c4', 40, 14, 0.45, 0.6, 1.4); spot.position.set(0, 6, 1); R.g.add(spot); R.g.add(spot.target);
  R.tick((dt, t) => {
    const want = side ? 3.4 : -3.4; spot.target.position.x += (want - spot.target.position.x)*(1 - Math.exp(-3*dt)); spot.target.position.z = -4;
    tooth.rotation.y = Math.sin(t*0.9)*0.4; tooth.position.y = 1.0 + (t - swapT < 1 && side ? Math.abs(Math.sin((t - swapT)*9))*0.2 : 0);
  });
  R.use({ key:'swap', x:0, z:1.6, r:2.6, label:'Switch the spotlight', pitch:500, fn(t){ side = 1 - side; swapT = t; } });
  R.blob(paper, 0, -1.0, { face:0, cap:red }); R.solidR(0, -1.0, 0.5);
}
