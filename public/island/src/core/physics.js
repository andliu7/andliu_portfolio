// Cannon world plus the static collider list the arcade car resolves against.
export function createPhysics(CANNON){
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.32;
  world.defaultContactMaterial.restitution = 0.22;
  const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  world.addBody(groundBody);

  // { kind:'box', x, z, ang, hw, hd } or { kind:'circle', x, z, r }. Props bounce off the cannon twins.
  const colliders = [];
  function solidBox(cx, cz, ang, w, d, h){
    colliders.push({ kind:'box', x:cx, z:cz, ang, hw:w/2, hd:d/2 });
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)) });
    b.position.set(cx, h/2, cz); b.quaternion.setFromEuler(0, ang, 0); world.addBody(b);
  }
  function solidCircle(x, z, r, h=3){
    colliders.push({ kind:'circle', x, z, r });
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Cylinder(r, r, h, 10) });
    b.position.set(x, h/2, z); world.addBody(b);
  }
  return { world, groundBody, colliders, solidBox, solidCircle };
}
