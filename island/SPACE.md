# Space world

A secret second world for the island. Swim to a tiny islet off the south shore, step on the
carved wing pad, and the wings flap, you lift, the screen flashes white, and you are an astronaut
on a toy space station. Four airlocks lead to four areas; eight star shards are hidden across
them; bringing all eight home changes something on the island.

Everything lives in `src/space/`. Area builders read this file and `src/space/kit.js`, nothing
else.

## Getting there

- **The islet** is at world `(0, 162)`: due south, behind the Education One Schoolhouse, 32 m
  past the coast. From the school beach, swim straight south. It is a sand disc 3.2 m across the
  flat top with a beach sloping into the sea out to 7.4 m, two palms and five rocks. It sits
  inside the walker's limit (`island.radius - 2 = 170`) and more than 40 m from every islet
  map.js stamps (checked in `space.test.mjs` against map.js `layout()`).
- **The wing pad** is in the middle, wings on the seaward side, open toward the island. It glows
  softly by day and clearly at night (bus `atmosphere`), brighter as you come ashore.
- **Trigger**: on foot (mode `walk`), not swimming, not piloting the drone, no dialog open,
  within 1.05 m of the pad centre. The pad is disarmed after you land on it and re-arms once you
  walk 2.2 m away, so arriving home never throws you straight back up.
- **Transition in**: keys are held, the wings beat, the walker rises about 3 m with a spin, a
  white flash covers the screen, the station is built (first time only) and swapped in, the flash
  fades, and the astronaut floats down onto the station's wing pad.
- **Transition out**: the station pad (or any area's pad) does the same in reverse and you land
  on the islet pad with a small hop. Esc in the station, the menu, a teleport or a world game
  also leave space, always landing you on the islet (never stranded, never at a door).

## Architecture: space borrows the interior slot

**Decision.** Space runs inside core's existing `interior` mode. `index.js` does what
`modes.enterInterior` does, by hand, with one room object (`zoneId:'space'`) whose `scene` and
`camera` it swaps whenever you change area. No core file is edited.

**Why.** Core already has exactly the machinery space needs:

- in mode `interior` every island hook (physics, props, characters, island camera, sun, HUD,
  minimap) skips its work, so the island is frozen as it was and resumes exactly where it was;
- the loop renders `state.interior.scene` with `state.interior.camera` and keeps that camera's
  aspect on resize;
- `modes.exitInterior()` is the one exit every other module already calls (Esc, menu teleports,
  world games, `setMode`), and it calls `room.onExit` first. Space puts the walker on the islet
  pad there, so every way out lands safely.

A new core mode `'space'` would need patches to `modes.js` (the mode list, setMode, teleport),
`loop.js` (render the space scene) and `main.js` (the `onIsland` test), three core files for
behaviour core already has.

**How character.js is kept from fighting it**, without editing it:

- In mode `interior` character.js walks "whoever is in the room". Space sets
  `room.cameraLocked = true` (no camera nudge), `room.cameraOrbit = false` (camera.js leaves it
  alone), no `exit`, no colliders. The walker mesh is hidden while you are away.
- Keys: at frame order 9 space copies `ctx.input.keys` into its own `kit.keys` and blanks them,
  character.js (order 10) sees nothing pressed, and at order 11 space puts them back. So the
  hidden walker never moves, hops or plays footsteps. The same hold freezes the walker during the
  lift on the islet.
- The islet ground uses a hook character.js already reads first: `ctx.modules.map.groundAt(x, z)`
  (a number wins, anything else falls through to the sea floor formula). Space wraps it,
  chaining any existing `groundAt`, and answers only on the islet. The beach profile meets the
  island's own sea floor exactly at the edge, so you wade in and walk out like any other shore.
- Esc in an area goes to the station: a capture-phase `keydown` listener on `window` takes it
  before `input.js` (the same technique as the tour and the talk box). In the station Esc falls
  through to core, which leaves the room.

Events: entering emits `interior:enter {zoneId:'space', room}` and `mode {to:'interior'}` like a
real room (inventory, camera zoom and the tour all expect the pair), then `space:enter`. Also
`space:area {id, from}`, `space:shard {id, count}`, `space:unlock`, `space:exit`.

## Files

| File | What it is |
|---|---|
| `src/space/index.js` | Runtime: save, area registry, enter / exit / airlock transitions, key hold, per-frame step (order 80), shards, triggers, F prompts, HUD (shard chip, toasts, flash), critic hooks |
| `src/space/kit.js` | The kit handed to every area: controllers, camera, helpers, placeholder. Also `AREAS`, `SHARDS` and the pure functions the tests use |
| `src/space/models.js` | Astronaut, wing pad, shard parts, Cosmo the robot |
| `src/space/islet.js` | The islet on the island, `ISLET`, `isletGround()`, the 8-shard reward |
| `src/space/hub.js` | The station (fully built). Cosmo's chat table is at the top |
| `src/space/areas/planet.js` | Tiny Planet. STUB (builder A) |
| `src/space/areas/moon.js` | Moon Base. STUB (builder A) |
| `src/space/areas/asteroids.js` | Asteroid Field. STUB (builder B) |
| `src/space/areas/lab.js` | Wormhole Lab. STUB (builder B) |
| `src/space/space.test.mjs` | Node checks: `node src/space/space.test.mjs` (from `island/`) |

Every area file and the hub are imported on their own inside try/catch. If one fails to import,
its `build` throws, or it returns no `THREE.Scene`, whatever it registered is dropped and
`kit.placeholder(id)` is used instead, so one broken area never breaks the station.

## Keys (in space)

| Key | Does |
|---|---|
| WASD / arrows | Move, relative to the camera. First person: W / S move, A / D turn |
| Space | Jump (walking) or thrust up (zero-g) |
| Shift | Run (walking) or thrust down (zero-g) |
| F / Enter | Use the nearest thing with a prompt (core's `interact` action) |
| C | Talk (the nearest talker, Cosmo in the station) |
| V | First person on / off (per area; an area can forbid it) |
| Mouse drag | Swing the camera (first person: look). Wheel zooms |
| Esc | Area: back to the station. Station: home to the islet |

No global keys are bound through `input.js`. Area keys go through `kit.onKey(code, fn)` and only
fire while that area is active. Free for areas: Q, E, the mouse buttons, digits. Avoid H, R, T,
L, G, O, I, Tab, P (other modules own them on the island and some listen in every mode).

## Star shards and the unlock

- Eight ids, two per area: `planet-1 planet-2 moon-1 moon-2 asteroids-1 asteroids-2 lab-1 lab-2`
  (`SHARDS` in kit.js). Walking within 1.5 m of a shard (measured from the astronaut's middle,
  0.9 m up) collects it: a gold burst, a three-note chime, a toast, the chip pops.
- The chip "Star shards n/8" sits top right while in space (the minimap is hidden there). The
  station's centre case lights one crystal per shard.
- Saved in localStorage `island.space` as `{ v, shards:[ids], unlocked, flags:{} }`, every read
  and write in try/catch and every read through `sanitizeSave()`.
- **All eight unlocks, on the island**: the islet's wing pad turns gold, a soft gold beam rises
  from the islet (a landmark you can see from the south shore, stronger at night), a
  constellation of eight stars in the shape of a pair of wings appears over the islet at night,
  and a "Star Map" goes in the bag. It says "you found the secret" in the island's own sky
  without adding anything to the main paths.
- Cosmo gives a "Mission Patch" (icon `stamp`) once, after you ask him about Andrew.

## Area contract

`src/space/areas/<id>.js` exports:

```js
export function build(ctx, kit){ ... return area; }      // may be async
```

```
area = {
  scene:   THREE.Scene                  required. Own background and lights (kit.scene gives both)
  camera:  THREE.PerspectiveCamera      kit.camera(); the runtime keeps its aspect right
  rig:     kit.rig(camera, ctrl, opts)  the controller plus its camera. The runtime steps it every
                                        frame before update(). You may swap area.rig at any time
                                        (walk, then drive a rover); the runtime follows
  spawn:   { x, y, z, yaw }             where the astronaut appears (scene coordinates; on a planet,
                                        any point above the surface: it is projected down)
  title?:  string                       shown as a toast on arrival (defaults to the AREAS title)
  hint?:   string (HTML)                replaces the hint line while here
  update?(dt, t, ctx)                   every frame after the rig. Throwing disables it (logged)
  onEnter?(ctx, fromId)                 each visit, after the spawn is placed
  onExit?(ctx, toId)                    leaving to 'hub', another area, or 'island'
}
```

Built once on first visit and cached; `onEnter` / `onExit` run every visit. Nothing may be added
to the island scene or `ctx.colliders` from an area.

Every area must contain:

- `kit.wingPad(...)` near the spawn (home to the island), and
- `kit.hatch(...)` near the spawn (back to the station), and
- both of its shards, `kit.shard(parent, kit.shardsFor('<id>')[0], x, y, z)` and `[1]`, and
- at least two résumé easter eggs whose words come only from `src/data/zones.js` (use
  `kit.sign(..., { zone:'<id>' })` or `kit.zone(id)`; never invent a fact, a number or a date).

## Kit reference

Everything below is on `kit`. Positions are scene coordinates. `parent` is a scene or a group.

**Data**: `THREE`, `H` (ctx.helpers; always pass `parent`), `ctx`, `AREAS`, `SHARDS`,
`SHARD_IDS`, `shardsFor(areaId)`, `collected(shardId)`, `zone(id)` (the ZONES entry),
`flag(name)` / `setFlag(name, value)` (saved; prefix names with your area id), `keys` (live:
`{ f:-1..1 forward, s:-1..1 right, jump (Space held), jumpPressed (this frame only), boost (Shift) }`,
all zero while a dialog or transition is up), `player` (the active controller), `astronaut`
(the one model: `root`, `body`, `head`, `animate()`, `land(v)`), `parts` (shard geometry and
materials), `prng(seed)`, `hashSeed(str)`, `tangent(v, up, out)`, `resolve2D(pos, r, list)`,
`orient(obj, up, fwd)`.

**Controllers**. All share `{ kind, pos, vel, up, fwd, grounded, speed, jet, place(x, y, z, yaw), update(dt, view) }`.
`pos` is the feet. They write the astronaut's transform themselves.

```
kit.walker({ gravity=9, jump=6.5, speed=5, run=8.5, radius=0.45, airControl=3,
             floorAt(x, z) -> y, colliders:[{kind:'circle',x,z,r} | {kind:'box',x,z,ang,hw,hd}],
             ring:{ r, x?, z? }, bounds:{ minX, maxX, minZ, maxZ } })
    Flat walking at any gravity. A floor more than 0.5 m above the feet is a wall; lower is a
    step. airControl is how fast air speed follows the keys (3 = floaty; 0.5 keeps momentum,
    for portal flings). Jump apex = jump^2 / (2 gravity); airtime = 2 jump / gravity.
kit.orbiter({ center=origin, radius, gravity=10, jump=7, speed=4.5, run=7, airControl=3,
              heightAt(upUnit) -> metres above radius, obstacles:[{ pos:Vector3, r }] })
    Radial gravity. up = normal from the centre. Straight on is a great circle (tested: one lap
    returns within 0.9 m of the start). Obstacles are spheres; pass a live Vector3 to move them.
kit.jetpack({ thrust=7, max=7, damping=0.35, bounds:{ center?, r }, obstacles:[{ pos, r }] })
    Zero-g with inertia: speed decays as exp(-damping t). Space up, Shift down. Obstacles
    bounce you (half the speed kept). Outside bounds.r a spring pulls you back.
```

**Camera**

```
kit.rig(camera, ctrl, { dist=7, height=3.4, look=1.1, back:[x,y,z] (camera side, default +z),
                        fp:true (allow V), fpStart:false, lag=7, animate:true })
    -> { ctrl, view, update(dt) }
    view.fp, view.toggleFp(), view.snap() (jump to position next frame), view.pitch (first person)
kit.camera(fov=50), kit.scene({ bg, sky, ground, hemi, light, stars=700, seed, shadow:false, shadowBox=14 })
kit.stars(parent, { count, r, seed, size }), kit.ringedPlanet(parent, { x,y,z, r, color, band, ring, tilt }),
kit.islandPlanet(parent, { x,y,z, r })            the island seen from orbit
kit.onSurface(obj, center, dir, dist)            put obj on a sphere, its +y along dir
kit.glow(color, opacity)                          an additive material
kit.aim() -> THREE.Raycaster                      from the screen centre (first-person tools)
```

**Things in the world**

```
kit.shard(parent, id, x, y, z) -> Group          spins, bobs, collects itself; hidden if already saved
kit.sign(parent, x, y, z, { zone, title, sub, lines:[...], color, w=3.4, h=2, rot, post=true, lift=1.1 })
    with zone set, title / sub / lines default to that zone's title, role and first bullet
kit.wingPad(parent, x, y, z, { rot, to:'island', label:'Home' }) -> pad   (pad.top = 0.34, stand height)
kit.hatch(parent, x, y, z, { rot, to:'hub', label:'Station', color })     faces +z: rot it toward the spawn
kit.trigger({ x, y, z, r=1.2, onEnter, needGround }) -> off()     or { obj, offset:[x,y,z], ... } to follow a moving object
    fires once when the feet come within r; re-arms 0.6 m outside. Never fires on arrival.
kit.interactable({ x, y, z, r=2.2, label, onUse, talk:false }) -> off()   or { obj, offset, ... }
    the nearest one in reach shows an "F label" pill; F (or C when talk) calls onUse
kit.onKey(code, fn({ code, down, repeat })) -> off()     only while your area is active
kit.say(text)        a toast        kit.chime()        kit.go('hub' | areaId | 'island')
kit.label(text, bg, fg) -> Sprite
kit.placeholder(id, { mode:'walker'|'orbiter'|'jetpack', title, color, gravity, jump, view, note })
```

## Rules for area builders

- Edit only your own `src/space/areas/<id>.js` files. Add helper files as
  `src/space/areas/<id>-<thing>.js` if you must. Anything you need from `index.js`, `kit.js`,
  `models.js` or `hub.js` goes in your report as an exact patch.
- Never call `ctx.helpers.rng()` (it shifts the island build). Use `kit.prng(seed)`.
- Never recolour a `H.mat()` material (they are shared across the whole island); make your own.
- Budget: about 60 draw calls per area. Use `InstancedMesh` for any scatter of more than a few
  things, one shadow-casting light (`kit.scene({ shadow:true })`), no more than two extra lights.
  Build canvases once. Nothing allocated per frame in `update`.
- The toy look: rounded pastel shapes, chunky outlines of colour, Fredoka on signs, soft light.
  Match `models.js` and `hub.js`.
- Words: no em dashes anywhere, UI copy included. Résumé facts only from `src/data/zones.js`.
  The lab is Wormhole Lab; no Valve names or in-jokes (no "Aperture", no cake, no cubes with
  hearts, no "test subject" voice lines).
- Verify with `node --check` and `node src/space/space.test.mjs`. Never launch a browser.

## Brief A: Tiny Planet and Moon Base

**Tiny Planet** (`areas/planet.js`), a sphere you can walk all the way round.

- `kit.orbiter({ radius:12, gravity:7, jump:7.5 })` gives big floaty jumps (apex 4 m, 2.1 s in
  the air). `kit.rig(camera, ctrl, { dist:8, height:4.5 })`. Spawn at the north pole
  `{ x:0, y:12, z:0, yaw:0 }`.
- Build a low-poly pastel planet (a `SphereGeometry` with a little vertex noise from
  `kit.prng`, or `heightAt` for gentle hills; keep slopes gentle because the orbiter has no
  walls). Scatter trees, flowers and rocks with `kit.onSurface` into two or three
  `InstancedMesh`es; tree trunks become `obstacles`.
- A tiny moon orbits overhead; `kit.ringedPlanet` and `kit.islandPlanet` in the sky.
- `planet-1` at the south pole (the reward for walking all the way round; add a signpost at the
  equator pointing "keep going"). `planet-2` about 3.5 m above a mushroom or a treetop, a big
  jump away.
- Résumé eggs, from zones.js: a little greenhouse with a `{ zone:'brain' }` sign (Second Brain),
  a garden bed with `{ zone:'yard' }` (landscape design), an empty plot with a flag and
  `{ zone:'now' }` ("The empty plot is for whatever comes next.").
- Wing pad and hatch within 4 m of the spawn, both placed with `kit.onSurface`.

**Moon Base** (`areas/moon.js`), a lunar base plus a rover to drive in low gravity.

- `kit.walker({ gravity:4.5, jump:6, floorAt, colliders, ring:{ r:40 } })` on grey regolith
  (apex 4 m). `floorAt` can dip shallow craters (keep neighbouring floors within 0.5 m or they
  become walls; that is also how you make ledges).
- The base: two or three domes, a habitat module, an antenna dish, a landing pad, a flag.
  Colliders for everything solid (`circle` and `box`, same shapes as the island).
- **The rover**: an `interactable` "Drive rover" on it. On use, build a rover controller of the
  controller shape (`{ kind:'rover', pos, vel, up, fwd, grounded:true, speed, jet:0, place(), update(dt, view) }`:
  W / S throttle, A / D steer, low-g hops over crater lips, sets the rover mesh and seats
  `kit.astronaut.root` in it), and set `area.rig = kit.rig(camera, rover, { dist:9, height:4, animate:false })`.
  F again (a `kit.onKey('KeyF', ...)` handler while driving, or an interactable that follows
  the rover) parks it, puts the walker beside it with `walkerRig.ctrl.place(...)` and restores
  `area.rig = walkerRig`. Call `area.rig.view.snap()` after each swap.
- `moon-1` on the roof of the tallest dome (jump from a crate stack); `moon-2` at the far rim of
  the biggest crater, a rover trip away.
- Résumé eggs: a mission board with `{ zone:'umd' }` (B.S. Computer Science, expected May 2027),
  a supply crate stencilled with `{ zone:'clinic' }` (pre-dental), a plaque by the flag from
  `{ zone:'school' }` ("SAT students improved 100 to 300 points").

## Brief B: Asteroid Field and Wormhole Lab

**Asteroid Field** (`areas/asteroids.js`), zero-g jetpack drifting.

- `kit.jetpack({ thrust:7, max:7, damping:0.35, bounds:{ r:45 }, obstacles })`. Spawn floating
  near a big flat "home rock" that holds the wing pad and the hatch.
- Rocks: two `InstancedMesh`es of dodecahedra (big and small), placed with `kit.prng`, tumbling
  slowly (rotation only). Big ones are `obstacles` (`{ pos:mesh.position, r }`; a live position
  lets a rock drift and still bounce you). A slow comet with a glowing tail as a landmark.
- `asteroids-1` inside a slowly turning ring of rocks (time the gap). `asteroids-2` near the
  boundary, tucked inside a drifting derelict satellite.
- Résumé eggs: the skills belt, small asteroids each carrying one skill from `{ zone:'skills' }`
  (role and first bullet, split on commas); a floating crate from `{ zone:'dock' }` (Browser
  Use: "Guides adopted by 200+ contributors"); a buoy with `{ zone:'studio' }` (the Chemistry
  Explainer Pipeline).
- In first person (V) W thrusts where you look; keep that working.

**Wormhole Lab** (`areas/lab.js`), a first-person portal-gun puzzle game. Starts in first
person (`kit.rig(camera, walker, { fpStart:true })`).

- `kit.walker({ gravity:14, jump:6.5, airControl:0.5, colliders, floorAt, bounds })`. The low
  `airControl` keeps momentum, so a fall through one portal flings you out of the other.
- The gun: Q fires blue (`#5b8cff`), E fires orange (`#ff9f5a`) via `kit.onKey`. Aim with
  `kit.aim()` against a list of portal-able panels (white panels only; dark panels refuse with a
  fizzle). A portal is a glowing ring plus a dark disc on the panel, facing the hit normal. Draw
  your own crosshair DOM element in `onEnter` and remove it in `onExit`.
- Passing through: when the feet come within 0.8 m of a portal's centre while moving into it,
  rotate `ctrl.vel` and `ctrl.fwd` by the quaternion that maps the entry portal's inward normal
  to the exit portal's outward normal (`setFromUnitVectors`), set
  `ctrl.pos = exit + exitNormal*0.9`, `ctrl.grounded = false`, then `ctrl.fwd` back to
  `kit.tangent(ctrl.fwd, ctrl.up, ctrl.fwd)`. Wall-to-wall keeps speed; floor-to-wall flings.
- Three small chambers: (1) cross a gap with two wall portals; (2) drop into a floor portal to
  fling up to a ledge (`lab-1` on it); (3) combine both, plus a button that opens the exit door
  (`lab-2` behind it). Save progress with `kit.setFlag('lab-chamber', n)`.
- Résumé eggs: a lab whiteboard with `{ zone:'blueberry' }` (in-browser grading with RDKit.js,
  the curved-arrow mechanism trainer); a monitor with `{ zone:'studio' }`; a poster from
  `{ zone:'skills' }` second bullet (checking AI output against live runs).
- Wing pad and hatch in the entry room. Name it Wormhole Lab everywhere.

## Critic hooks: `window.__island.space`

```
enter()            straight to the station (no lift)     leave()       home to the islet
go(id)             'hub' | area id | 'island'            area()        current area id
state()            { active, area, busy, shards, unlocked, lifting, padArmed, player:{kind,x,y,z,grounded,fp},
                     imported, built, placeholders, near }
toIslet()          on foot 4 m north of the pad, facing it
lift()             start the wing lift (on foot on the island)
shard(id, take)    put the player at a shard in the current area, or collect it outright with take
reset()            forget shards, unlock and flags
shards(), collected(), unlocked(), islet {x, z, r}, kit
```

## Optional patches for the lead (none are required)

Space works today with no edits outside `src/space/`. These make two workarounds explicit:

1. `src/player/character.js`, the per-frame interior branch (skip the hidden walker's work
   instead of relying on the key hold):

   old
   ```js
         const room = state.interior; if(!room) return;
         if(where !== 'room' || root.parent !== room.scene) attach('room');
   ```
   new
   ```js
         const room = state.interior; if(!room) return;
         if(room.ownsPlayer){ showPrompt('', 0, 0, 0, null); return; }   // space: src/space moves its own astronaut
         if(where !== 'room' || root.parent !== room.scene) attach('room');
   ```

2. `src/core/modes.js`, so a synthetic Esc (`__island.key('Escape')`, which skips the DOM and
   so the capture listener) in a space area also goes to the station instead of home:

   old
   ```js
     bus.on('action:exit', () => { if(state.mode === 'interior') exitInterior(); });
   ```
   new
   ```js
     bus.on('action:exit', () => { if(state.mode === 'interior' && state.interior?.onEscape?.() !== true) exitInterior(); });
   ```

The room already carries `ownsPlayer` and `onEscape`, so each patch works the moment it lands.

## Known limits

- A synthetic Esc (CDP `Input.dispatchKeyEvent` is real and fine; `__island.key` is not) in an
  area leaves to the island, not the station, until patch 2 lands.
- The islet ground rides on `ctx.modules.map.groundAt`. If map.js ever replaces its module
  object after init, the islet goes back to deep water; map.js could instead call
  `isletGround` from `src/space/islet.js`, or character.js could read an `ctx.island.groundAt`.
- The menu has no Space entry, on purpose: it is a secret. `__island.space.enter()` is the
  shortcut for tests.
