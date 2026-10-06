// Interior registry. Loads interiors/<zoneId>.js for every zone, each by its own dynamic
// import inside try/catch. A file that fails to import, throws in build(), or returns no scene
// is replaced by the placeholder room, so a half-written interior never breaks the page.
//
// An interior file exports:  build(ctx, kit) -> room | Promise<room>
//   kit = { zone, placeholder() }   placeholder() returns the default room for this zone
// A room is (see CONTRACT.md, "Interiors"):
//   { scene, camera?, spawn:{x,z,heading}, exit:{x,z,r}, colliders:[...], bounds:{minX,maxX,minZ,maxZ},
//     update?(dt, t, ctx, room), onEnter?(ctx, room), onExit?(ctx, room) }
export async function init(ctx){
  const { THREE, helpers:H } = ctx;
  const mods = {};
  await Promise.all(ctx.zones.map(async z => {
    try { mods[z.id] = await import(`./${z.id}.js`); }
    catch(e){ console.error(`[interiors] ${z.id}.js failed to import; the placeholder room will be used`, e); }
  }));

  function placeholder(zone){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f6efe2');
    scene.add(new THREE.HemisphereLight('#fff6e6', '#b9a98a', 1.3));
    const lamp = new THREE.DirectionalLight('#ffffff', 1.4);
    lamp.position.set(6, 14, 8); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024);
    Object.assign(lamp.shadow.camera, { left:-12, right:12, top:12, bottom:-12, near:1, far:40 });
    scene.add(lamp);

    const W = 16, D = 12, Hh = 4, T = 0.4;   // room width, depth, wall height, wall thickness
    const floor = H.box(W, 0.2, D, '#e8d7b5', 0, -0.1, 0, scene); floor.castShadow = false;
    const rug = H.box(7, 0.04, 4.5, zone.color, 0, 0.02, 0.5, scene); rug.castShadow = false;
    H.box(W + T*2, Hh, T, '#fbf6ea', 0, Hh/2, -D/2 - T/2, scene);               // back wall
    H.box(T, Hh, D, '#f3ead6', -W/2 - T/2, Hh/2, 0, scene);                    // left wall
    H.box(T, Hh, D, '#f3ead6', W/2 + T/2, Hh/2, 0, scene);                     // right wall
    // front wall is a low cut-away so the camera can see in; the exit door stands in its gap
    H.box(W/2 - 1.4, 1, T, '#fbf6ea', -(W/4 + 0.7), 0.5, D/2 + T/2, scene);
    H.box(W/2 - 1.4, 1, T, '#fbf6ea', W/4 + 0.7, 0.5, D/2 + T/2, scene);
    for(const sx of [-1.25, 1.25]) H.box(0.3, 2.8, 0.3, '#6b4a33', sx, 1.4, D/2 + T/2, scene);
    H.box(2.8, 0.3, 0.3, '#6b4a33', 0, 2.95, D/2 + T/2, scene);
    H.box(2.1, 2.6, 0.1, zone.color, 0, 1.3, D/2 + T/2 + 0.12, scene);   // the exit door
    const exitLbl = H.label('Exit', '#1f2a44', '#ffffff'); exitLbl.position.set(0, 3.8, D/2 + 0.3); exitLbl.scale.set(2.2, 0.62, 1); scene.add(exitLbl);

    // sign with the zone title on the back wall
    const t = H.canvasTex(1024, 384, (g, w, h) => {
      g.fillStyle = zone.color; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; H.F(g, 700, 96); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(zone.title, w/2, h*0.42);
      H.F(g, 500, 40, 'Nunito'); g.fillStyle = '#ffffffcc'; g.fillText(zone.name + ' · coming soon', w/2, h*0.75);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map:t.tex, toneMapped:false }));
    sign.position.set(0, 2.3, -D/2 + 0.01); scene.add(sign);

    const camera = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.5, 200);
    camera.position.set(0, 14, 19); camera.lookAt(0, 0.5, 0);

    return {
      zoneId: zone.id, placeholder: true, scene, camera,
      spawn: { x:0, z:D/2 - 1.5, heading:Math.PI },
      exit: { x:0, z:D/2, r:1.6 },
      bounds: { minX:-W/2, maxX:W/2, minZ:-D/2, maxZ:D/2 },
      colliders: [
        { kind:'box', x:0, z:-D/2 - T/2, ang:0, hw:W/2 + T, hd:T/2 },
        { kind:'box', x:-W/2 - T/2, z:0, ang:0, hw:T/2, hd:D/2 },
        { kind:'box', x:W/2 + T/2, z:0, ang:0, hw:T/2, hd:D/2 },
        { kind:'box', x:-(W/4 + 0.7), z:D/2 + T/2, ang:0, hw:W/4 - 0.7, hd:T/2 },
        { kind:'box', x:W/4 + 0.7, z:D/2 + T/2, ang:0, hw:W/4 - 0.7, hd:T/2 },
      ],
    };
  }

  const cache = new Map();
  async function get(id){
    if(cache.has(id)) return cache.get(id);
    const zone = ctx.zones.find(z => z.id === id);
    if(!zone) return null;
    let room = null;
    const m = mods[id];
    if(typeof m?.build === 'function'){
      try { room = await m.build(ctx, { zone, placeholder: () => placeholder(zone) }); }
      catch(e){ console.error(`[interiors] ${id}.build threw; using the placeholder room`, e); }
      if(room && !room.scene?.isScene){ console.error(`[interiors] ${id}.build returned no THREE.Scene; using the placeholder room`); room = null; }
    }
    if(!room) room = placeholder(zone);
    room.zoneId = id;
    cache.set(id, room);
    return room;
  }

  return {
    ids: ctx.zones.map(z => z.id),
    get,                                   // async (zoneId) -> room (cached after first build)
    loaded: id => typeof mods[id]?.build === 'function',
    placeholder: id => placeholder(ctx.zones.find(z => z.id === id)),
    forget: id => cache.delete(id),        // drop a cached room so the next get() rebuilds it
  };
}
