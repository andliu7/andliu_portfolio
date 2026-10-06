// Geometry, material and canvas helpers. mesh/box/cyl/ball default their parent to the ISLAND scene:
// inside an interior always pass the room's scene or group as `parent`.
export function createHelpers(THREE, scene){
  const mats = new Map();
  function mat(color, opts){
    const key = color + (opts ? JSON.stringify(opts) : '');
    if(!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness:.82, metalness:0 }, opts||{})));
    return mats.get(key);
  }
  function mesh(geo, color, x=0, y=0, z=0, parent=scene, opts){
    const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color, opts) : color);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w,h,d,c,x,y,z,p) => mesh(new THREE.BoxGeometry(w,h,d), c, x,y,z,p);
  const cyl = (rt,rb,h,c,x,y,z,p,s=16) => mesh(new THREE.CylinderGeometry(rt,rb,h,s), c, x,y,z,p);
  const ball = (r,c,x,y,z,p,s=18) => mesh(new THREE.SphereGeometry(r,s,Math.max(8,s*0.7|0)), c, x,y,z,p);
  // One seeded stream for the whole island, so the world looks the same on every load.
  // Build order matters: anything that calls rng() during build shifts everything built after it.
  const rng = (() => { let s = 7; return () => (s = (s*16807) % 2147483647) / 2147483647; })();

  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function canvasTex(w, h, draw){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, g, w, h, draw };
  }
  function label(text, bg='#fffaf0', fg='#1f2a44'){
    const t = canvasTex(256, 72, g => { g.font = '600 30px Fredoka, sans-serif'; const tw = Math.min(236, g.measureText(text).width + 36); rr(g, (256-tw)/2, 6, tw, 60, 30); g.fillStyle = bg; g.fill(); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 38); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t.tex, transparent:true }));
    s.scale.set(2.8, 0.8, 1); return s;
  }
  /* Zone frames: each zone has a local frame whose +z points back toward spawn. w(lx,lz) -> [worldX, worldZ]. */
  function frameOf(z){
    const ang = Math.atan2(-z.x, -z.z), c = Math.cos(ang), s = Math.sin(ang);
    return { ang, w:(lx,lz) => [z.x + lx*c + lz*s, z.z - lx*s + lz*c] };
  }
  function segDist(px, pz, x2, z2){ const L = x2*x2 + z2*z2; const t = Math.max(0, Math.min(1, (px*x2 + pz*z2)/L)); return Math.hypot(px - t*x2, pz - t*z2); }
  function lerpAngle(a, b, t){ let d = ((b - a + Math.PI) % (Math.PI*2)) - Math.PI; if(d < -Math.PI) d += Math.PI*2; return a + d*t; }
  const F = (g, weight, size, fam='Fredoka') => { g.font = `${weight} ${size}px ${fam}, sans-serif`; };
  function arrowCurve(g, x1, y1, x2, y2, bend, color, width, progress=1){
    const mx = (x1+x2)/2, my = (y1+y2)/2 - bend;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round';
    g.beginPath();
    const N = 30, end = Math.max(1, Math.floor(N*progress)); let px, py, qx, qy;
    for(let i=0;i<=end;i++){ const t = i/N; const x = (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2; const y = (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2; if(i===0) g.moveTo(x,y); else g.lineTo(x,y); qx = px; qy = py; px = x; py = y; }
    g.stroke();
    if(progress >= 0.98 && qx !== undefined){ const a = Math.atan2(py-qy, px-qx); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 18*Math.cos(a-0.45), py - 18*Math.sin(a-0.45)); g.lineTo(px - 18*Math.cos(a+0.45), py - 18*Math.sin(a+0.45)); g.closePath(); g.fill(); }
  }
  // Canvas textures the core loop redraws at 15 fps while on the island. Push canvasTex() results here.
  const animated = [];
  /* A board on two posts with a canvas screen. draw(g, w, h, t). Visual only: add a collider yourself. */
  function board(parent, lx, lz, w, h, draw, opts={}){
    const g = new THREE.Group(); g.position.set(lx, 0, lz); if(opts.rot) g.rotation.y = opts.rot; parent.add(g);
    const lift = opts.lift ?? 1.4;
    for(const sx of [-w/2+0.25, w/2-0.25]) cyl(0.12, 0.14, lift + h, '#6b4a33', sx, (lift+h)/2, -0.05, g, 8);
    box(w+0.3, h+0.3, 0.2, opts.frame || '#6b4a33', 0, lift + h/2, -0.02, g);
    const px = 96;
    const t = canvasTex(Math.round(w*px), Math.round(h*px), draw);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false }));
    screen.position.set(0, lift + h/2, 0.09); g.add(screen);
    if(opts.animate) animated.push(t);
    return g;
  }
  return { mats, mat, mesh, box, cyl, ball, rng, rr, canvasTex, label, frameOf, segDist, lerpAngle, F, arrowCurve, animated, board };
}
