// Dynamic props: anything the car can knock over. Island only (island scene, island physics world).
export function createProps({ THREE, CANNON, scene, world, H, sound, island }){
  const props = [];
  function prop(obj3d, shape, mass, x, y, z, rotY=0, kind='thud'){
    const body = new CANNON.Body({ mass, shape, allowSleep:true, sleepSpeedLimit:0.25, sleepTimeLimit:0.6, linearDamping:0.08, angularDamping:0.12 });
    body.position.set(x, y, z); body.quaternion.setFromEuler(0, rotY, 0); world.addBody(body);
    obj3d.position.set(x, y, z); scene.add(obj3d);
    const p = { body, obj:obj3d, home:[x,y,z,rotY], last:0 };
    body.addEventListener('collide', e => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal()); const t = performance.now();
      if(v > 1.6 && t - p.last > 90){ p.last = t; kind === 'clink' ? sound.sfx.clink(v) : sound.sfx.thud(v); }
    });
    props.push(p); return p;
  }
  function crate(x, z, color='#d9a066'){
    const g = new THREE.Group(); H.box(0.9,0.9,0.9,color,0,0,0,g); H.box(0.94,0.12,0.94,'#b07c45',0,0.25,0,g); H.box(0.94,0.12,0.94,'#b07c45',0,-0.25,0,g);
    return prop(g, new CANNON.Box(new CANNON.Vec3(.45,.45,.45)), 0.8, x, 0.46, z, H.rng()*3);
  }
  function trafficCone(x, z){
    const g = new THREE.Group(); H.mesh(new THREE.ConeGeometry(0.32, 0.8, 14), '#f07c2a', 0, 0.05, 0, g); H.box(0.7,0.08,0.7,'#f07c2a',0,-0.36,0,g); H.cyl(0.2,0.24,0.1,'#ffffff',0,0.05,0,g);
    return prop(g, new CANNON.Cylinder(0.05, 0.35, 0.8, 8), 0.3, x, 0.41, z, 0, 'clink');
  }
  function step(){
    for(const p of props){
      const b = p.body;
      if(b.position.y < -6 || Math.hypot(b.position.x, b.position.z) > island.radius + 12){ b.position.set(p.home[0], p.home[1] + 1, p.home[2]); b.velocity.setZero(); b.angularVelocity.setZero(); b.quaternion.setFromEuler(0, p.home[3], 0); b.wakeUp(); }
      p.obj.position.copy(b.position); p.obj.quaternion.copy(b.quaternion);
    }
  }
  return { props, prop, crate, trafficCone, step };
}
