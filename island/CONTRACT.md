# Andrew Liu Island: module contract

The island is split so seven builders can work in parallel without ever editing the same file.
Serve the `scratchpad/` folder and open `island/index.html`. three 0.160 and cannon-es 0.20 come
from cdn.jsdelivr.net through the import map in `index.html` (`three`, `three/addons/`, `cannon-es`).

## File ownership

| File | Owner | Notes |
|---|---|---|
| `index.html` | foundation | Page shell, CSS, HUD containers, import map. `#menu-root` and `#game-root` are empty mount points |
| `src/main.js`, `src/core/*.js` | foundation | Never edit. Extend through `ctx` hooks below |
| `src/data/zones.js` | map builder (positions only) | `ZONES` array. `id` values are load-bearing (`interiors/<id>.js`) |
| `src/world/map.js` | map builder | Ground, water, paths, trees, spawn plaza, clouds, every zone exterior, `ctx.island` |
| `src/camera.js` | camera builder | Island camera |
| `src/ui/menu.js` | menu builder | Places menu, brings its own CSS |
| `src/player/car.js` | car / character builder | The car. Owns `state.player` in `drive` mode |
| `src/player/character.js` | character builder | STUB. The walker. Owns `state.player` in `walk` mode |
| `src/interiors/index.js` | interiors builder | Resilient registry plus the placeholder room |
| `src/interiors/<zoneId>.js` (12) | interiors builder(s) | One file per zone, STUB returns the placeholder |
| `src/games/index.js`, `src/games/*.js` | games builder | Resilient registry, `GAME_IDS` list, `example.js` stub |
| `_test/` | anyone | `foundation.mjs` (full check), `resilience.mjs` (broken-module check), `cdp.mjs` |

## Module shape

Every non-core module exports `init(ctx)` (sync or async) and returns its API object, which core
stores in `ctx.modules.<name>`. `main.js` imports each with a dynamic `import()` inside try/catch
and calls `init` inside try/catch. A failure is logged with `console.error`, recorded in
`__island.failures`, and the page carries on without that module (the camera falls back to a
fixed follow camera).

Init order is fixed, and it is also build order for the seeded `rng`:
`map, car, character, camera, menu, interiors, games`. `ctx.zones` is loaded before any of them.

## ctx

| Field | What it is |
|---|---|
| `THREE`, `CANNON` | The libraries |
| `renderer` | `THREE.WebGLRenderer` (shadows on, sRGB) |
| `scene` | The ISLAND `THREE.Scene` |
| `camera` | The ISLAND `THREE.PerspectiveCamera` (camera.js moves it) |
| `sun` | Island `DirectionalLight`. Core moves it to follow `state.focus` |
| `world` | cannon `World` for the island (gravity -22, SAP broadphase, ground plane) |
| `colliders` | Static island colliders the car resolves against: `{kind:'box', x, z, ang, hw, hd}` or `{kind:'circle', x, z, r}` |
| `props`, `chars`, `animated` | Live lists: knockable props, cute characters, canvas textures redrawn at 15 fps |
| `zones` | The `ZONES` array from `data/zones.js` |
| `island` | Set by map.js: `{ radius, spawn:{x,z,heading}, approachOf(id) -> {x,z,heading}, doorOf(id) -> {x,z,heading} }`. Core has defaults if map.js fails |
| `state` | Shared state, see below |
| `bus` | `on(ev, fn) -> off`, `once`, `off`, `emit(ev, data)`. Throwing listeners are logged, not fatal |
| `input` | See Input |
| `sound` | `init()`, `setOn(bool)`, `on` (getter), `tone(freq, dur, type, gain, slide)`, `sfx.{honk,thud,clink,boing,bump}(v)`, `engine(speed or null)` |
| `modes` | See Modes |
| `hud` | `begin(withSound)`, `setSound(on)`, `showZone(zone or null)`, `setHint(mode, html)`, `drawMap()`, `minimapLayers` (push `(g, toMap) => {}`), elements `card`, `hint`, `menuRoot`, `gameRoot`, `loading` |
| `onUpdate(fn, order = 0) -> off` | Per-frame hook `fn(dt, t, mode)`. Runs in every mode; check `mode` yourself. A hook that throws is logged and removed |
| `interiorCamera` | Fallback camera for a room that brings none |
| `modules` | `{ map, car, character, camera, menu, interiors, games }`, each the API its `init` returned, or `null` |
| `expose(name, value)` | Add a critic hook to `window.__island` without touching core |
| `helpers` | See Helpers |

### state

```
started      boolean, true after the start screen
mode         'drive' | 'walk' | 'interior'
prevMode     island mode to return to after an interior
interior     the active room object while mode === 'interior', else null
player       { x, z, heading, speed, pushRadius }  whoever the player is; the mode's owner writes it every frame
focus        THREE.Vector3 camera look-at on the island (camera.js writes it, the sun follows it)
activeZone   zone whose card is showing, or null
zoom         wheel zoom 0.6..1.7
reduced      prefers-reduced-motion
```

`heading` is the angle of travel: forward is `(sin(heading), cos(heading))` in x, z.

### Frame order (hook `order` values)

```
10  car.js movement (drive) / put character.js here too (walk and interior)
50  physics step + props            island only
60  cute characters                 island only
70  map.js ambient motion           island only
80  room.update(dt, t, ctx, room)   interior only
85  active game update
90  camera module update(dt, t)     island only
95  sun follows state.focus         island only
97  animated canvas screens         island only
99  HUD zone card + minimap         island only
then render: room.scene with room.camera (or ctx.interiorCamera) in interior mode, else ctx.scene with ctx.camera
```

While `mode === 'interior'` every island-only step is skipped, so the island is frozen exactly as it was.

## Helpers (`ctx.helpers`)

`mesh`, `box`, `cyl`, `ball` default their parent to the ISLAND scene. Inside an interior, always
pass the room's scene or a group as `parent`.

```
mat(color, opts?) -> cached MeshStandardMaterial (roughness .82)
mats                Map of cached materials
mesh(geo, color|material, x=0, y=0, z=0, parent=scene, opts?) -> Mesh (casts and receives shadows)
box(w, h, d, color, x, y, z, parent?)
cyl(rTop, rBottom, h, color, x, y, z, parent?, segments=16)
ball(r, color, x, y, z, parent?, segments=18)
rng() -> [0,1)      the ONE seeded stream; calling it during build shifts everything built after you
rr(g, x, y, w, h, r)                         rounded-rect path on a 2D context
canvasTex(w, h, draw(g, w, h, t)) -> { tex, g, w, h, draw }
label(text, bg='#fffaf0', fg='#1f2a44') -> Sprite (scale 2.8 x 0.8)
F(g, weight, size, family='Fredoka')         set a canvas font
arrowCurve(g, x1, y1, x2, y2, bend, color, width, progress=1)
board(parent, lx, lz, w, h, draw, { rot, lift=1.4, frame, animate }) -> Group   visual only, add a collider yourself
animated            push canvasTex() results to have core redraw them at 15 fps on the island
frameOf(zone) -> { ang, w(lx, lz) -> [x, z] }   zone-local frame, +z points toward the spawn plaza
segDist(px, pz, x2, z2)                      distance from a point to the segment origin -> (x2, z2)
lerpAngle(a, b, t)
solidBox(cx, cz, ang, w, d, h)               island collider + cannon static twin
solidCircle(x, z, r, h=3)
prop(obj3d, cannonShape, mass, x, y, z, rotY=0, kind='thud'|'clink') -> { body, obj, home }
crate(x, z, color?), trafficCone(x, z)
eyes(parent, y, z, sep=.17, r=.065, blush=true)
addChar(group, x, z, opts) -> char           adds to the island scene and the character sim
blob(color, x, z, { hat:'beret'|'cap', hatColor, wander:{cx,cz,r}, face, speed, amp })
berry(x, z, opts), tooth(x, z, scale), terrapin(x, z, scale, opts), robot(x, z, opts), brainBuddy(x, z)
jolt(x, z, r)                                make characters within r hop (the honk reaction)
```

## Input (`ctx.input`)

```
keys                { up, down, left, right, brake, boost }  movement intent, read every frame
isDown(code)        any key by KeyboardEvent.code
on(action, fn) -> off
trigger(action)     fire an action without a key
press(code, down)   synthetic key (bypasses the started gate)
clear()             release everything
```

Keys: WASD / arrows move, Space brake, Shift boost. Actions: `H` honk, `R` reset, `E` / `Enter`
interact, `Esc` exit. Every key also emits bus `key` `{code, down, repeat}`. Keys are ignored
until the start screen is dismissed and while focus is in a text field. Events without a `code`
(for example CDP `Input.dispatchKeyEvent` with only `windowsVirtualKeyCode`) are mapped from
`keyCode` or `key`, so `rawKeyDown`/`keyUp` work with or without `code`.

Core binds only two actions: `exit` leaves an interior, `reset` teleports to spawn on the island.
`interact` has no default binding: the character builder owns it.

## Modes (`ctx.modes`)

```
setMode('drive'|'walk') -> bool             emits bus 'mode' {from, to}; from an interior it exits to that mode
enterInterior(zoneId) -> Promise<bool>      builds (cached) and swaps to the room's scene
exitInterior() -> bool                      back to prevMode, player placed at island.doorOf(zoneId)
teleport(zoneId | 'spawn') -> bool          places the player at island.approachOf(id); leaves any interior first
placePlayer(x, z, heading)                  writes state.player and calls the current island mode's placeAt
registerPlayer(mode, { placeAt(x, z, heading) })   car.js registers 'drive', character.js registers 'walk'
islandMode() -> 'drive'|'walk'
```

Bus events: `mode`, `interior:enter` {zoneId, room}, `interior:exit` {zoneId, door}, `teleport`,
`zone` {zone}, `started`, `ready`, `resize`, `game:start`, `game:stop`, `key`, `action:<name>`.

## Car (`ctx.modules.car`)

`{ car, placeAt(x, z, heading), position, radius }`. `car` has `x, z, heading, speed, steer, group,
body` (kinematic cannon twin). In `drive` mode it steps from `input.keys`, resolves against
`ctx.colliders` and the island edge, and writes `state.player`. In any other mode it is parked
where it stands and stays solid for props. Honk only works in `drive`.

## Character (`src/player/character.js`, STUB)

Export `init(ctx)` returning at least:

```
{ available: boolean, group: THREE.Group|null, placeAt(x, z, heading), exitCar(), enterCar() }
```

and call `ctx.modes.registerPlayer('walk', api)`. Expected behaviour: on `interact` in drive mode
get out beside the car (`setMode('walk')`); on `interact` near the car get back in
(`setMode('drive')`); on `interact` near `ctx.island.doorOf(id)` call `enterInterior(id)`; inside,
move within `room.colliders` / `room.bounds`, drive `room.camera`, and call `exitInterior()` when at
`room.exit`. Write `state.player` (with a smaller `pushRadius`) every frame while walking on the
island. Register the per-frame work with `ctx.onUpdate(fn, 10)`. With the stub, `setMode('walk')`
works but nothing moves.

## Camera (`src/camera.js`)

`init(ctx)` returns `{ update(dt, t), setTarget(target|null), setMode(name) }`. Core calls
`update` every island frame. It must position `ctx.camera` and write its look-at point into
`ctx.state.focus`. `setTarget(null)` follows `state.player`; any `{x, z, heading?, speed?}` works as
a target. Interiors bring their own camera, so this module is not called inside.

## Interiors (`src/interiors/`)

`index.js` imports `./<zoneId>.js` for every zone, each in its own try/catch. Each file exports:

```
build(ctx, kit) -> room | Promise<room>        kit = { zone, placeholder() }
```

A room is:

```
{
  scene:     THREE.Scene                 required; its own lights and background
  camera?:   THREE.PerspectiveCamera     else ctx.interiorCamera (aspect is kept in sync)
  spawn:     { x, z, heading }           where the player appears (room.player is set from it on enter)
  exit:      { x, z, r }                 the exit door in room coordinates
  colliders: [ same shape as ctx.colliders ]
  bounds:    { minX, maxX, minZ, maxZ }
  update?(dt, t, ctx, room)              runs every frame while inside (order 80); throwing disables it
  onEnter?(ctx, room), onExit?(ctx, room)
}
```

If the import fails, `build` throws, or no `THREE.Scene` comes back, the placeholder room is used
(16 x 12 floor, walls, zone-coloured rug, title sign, exit door, fixed camera). Rooms are cached
after the first build; `forget(id)` drops one. Registry API:
`{ ids, get(id), loaded(id), placeholder(id), forget(id) }`. Esc leaves any room.

Exit placement: `ctx.island.doorOf(id)` (map.js `DOORS` table, zone-local coordinates) puts the
player just outside each building, facing away. All 12 were checked to clear every collider.

## Games (`src/games/`)

`GAME_IDS` in `index.js` lists the files to load. Each game exports:

```
meta = { title, zoneId? }
start(ctx, { id, root, stop() }) -> { update?(dt, t), stop?() }
```

`root` is `#game-root`, a full-screen overlay where only children take pointer events. Registry
API: `{ list(), active(), start(id) -> Promise<bool>, stop() }`.

## Test hooks: `window.__island`

```
ready                 true after modules are loaded and two frames have rendered
failures              [{ name, stage:'import'|'init', error }]
fps()                 frames rendered in the last second
mode()                'drive' | 'walk' | 'interior'
start(withSound)      dismiss the start screen
teleport(zoneId | 'spawn')
enterInterior(zoneId) -> Promise<bool>
exitInterior()
setMode(mode)
zones()               the 12 zone ids
player()              { x, z, heading, speed }
activeZone()          id of the zone card showing, or null
interior()            zoneId while inside, else null
modules()             { name: loaded? }
action(name)          fire 'honk' | 'reset' | 'interact' | 'exit' | ...
key(code, down=true)  synthetic key by KeyboardEvent.code
hold(code, ms)        hold a key, resolves with player()
games(), startGame(id), stopGame()
screenshotReady()     resolves after two frames
ctx                   the whole ctx, for anything else
```

Modules add their own with `ctx.expose(name, value)`.

CDP keys work directly: `Input.dispatchKeyEvent {type:'rawKeyDown', code:'KeyW', key:'w', windowsVirtualKeyCode:87}`
then `keyUp`. Call `__island.start(false)` first.

## Known behaviour carried over

- The dock's approach point (13 m toward the plaza) is closer to the Now Building zone, so the
  card shown after `teleport('dock')` is Now Building. Same as the single-file build.
- The minimap still shows the island while inside a room.

## GAMES

Owned by the games builder: `src/games/index.js` (registry), `src/games/ui.js` (shared UI kit, not a
game) and one file per game. `example.js` is gone; `_test/foundation.mjs` now starts `brush-up`.

### Game ids

| id | kind | What it is | How a player reaches it |
|---|---|---|---|
| `race` | world | Island Loop time trial: one lap of the outer ring road (`ctx.modules.map.layout.roads`, name `outer`), 7 numbered gates then the checkered START FINISH arch. Countdown, split times against your best, best lap on a board by the arch | Drive under the arch |
| `bowling` | world | Skills Alley bowling: 5 rolls at the 10 skill pins map.js stands on the lane. Pin-count scoreboard in the world, strike detection, pins and ball reset between rolls | Drive onto the orange BOWL mat beside the lane head |
| `hunt` | world | Blueberry Hunt: 12 giant berries with light pillars, on dry land near roads, a new layout each hunt, 90 s. Arrow over the player points at the nearest; berries show on the minimap | Drive onto the blue HUNT mat by the berry basket at the plaza edge |
| `arrow-pusher` | arcade | 6 mechanism steps (SN2, acid and base, carbonyl addition, carbocation capture, Grignard addition, alkene plus HBr), drag the curved arrow to the atom the electrons attack, 60 s | Launch by id (a cabinet) |
| `brush-up` | arcade | Scrub plaque off four molars for 30 s | Launch by id (a cabinet) |

`meta.zoneId` on the arcade games (`blueberry`, `clinic`) is only a hint for where a cabinet fits.

### Launch API (`ctx.modules.games`)

```
list() -> [{ id, title, zoneId, kind }]        in GAME_IDS order
active() -> id | null
start(id, opts?) -> Promise<bool>             alias launch(id, opts). Stops any running game first
    opts.onEnd(result)    called once per finished round (a game can be replayed from its end card)
    opts.onClose()        called when the game closes for any reason (Close, Esc, stop())
stop()
state() -> { id, phase, ... } | null          phase: intro | countdown | ready | rolling | result | run | aim | verdict | done
best(id) -> stored best | null                 localStorage 'island.games.<id>', per device
stations                                        the world pads, [{ id, x, z, r }]
```

Every game opens on a start card (Enter, Space or E starts it; Esc closes it) and ends on an end
card (Enter plays again; Esc closes). While a card or an arcade screen is open, keydowns are captured
before they reach `ctx.input`, so the car never moves and E never hops out. Pointer and touch work
everywhere (buttons, drag). Esc during a world game quits it; teleporting or entering a room quits
the race and bowling.

A cabinet in a room, for interior builders (works in `interior` mode; nothing on the island moves):

```js
// in room.update or an interact handler, near your cabinet
ctx.modules.games?.start('arrow-pusher', { onClose(){ /* e.g. light the cabinet back up */ } });
```

World games started from inside a room leave the room first. Bus events: `game:start {id}`,
`game:end {id, result}`, `game:stop {id}`. Results: race `{ time, best, newBest, test }`, bowling
`{ total, strikes, newBest }`, hunt `{ berries, total, time, newBest }`, arrow-pusher
`{ score, right, rounds, newBest }`, brush-up `{ cleaned, newBest }`.

### Adding a game

Add `<id>.js` and its id to `GAME_IDS`. Export `meta`, `start(ctx, api)` returning
`{ update?(dt, t, mode), stop?(), state?(), debug?(cmd) }`, and optionally `setup(ctx, reg)` for world
props, where `reg.station({ id, x, z, r, when(mode) })` adds a pad that opens the game. Use
`kit(ctx, api)` from `ui.js` for cards, HUD chips, toasts, confetti, key capture and jingles, and
`K.destroy()` in `stop()`. Never call `ctx.helpers.rng()` (it shifts the island build): `ui.js` exports
`prng(seed)`. Recolour only materials you created; `helpers.mat()` materials are shared.

### Test hooks (`window.__island`)

```
games(), startGame(id), stopGame()     core
launchGame(id, opts)                   same as ctx.modules.games.start
gameState()                            the active game's state, or null
gameDebug(cmd)                         'start' skips the start card in every game
                                       race: 'gate' (put the car 6 m before the next gate), 'finish'
                                       bowling: 'knock' (shove the pins)   hunt: 'next', 'collect', 'timeout'
                                       arrow-pusher: 'drag', 'solve', 'miss', 'end'   brush-up: 'scrub', 'end'
```

Any debug command other than `start` marks that round as a test round: its end card says so and it is never saved as a best.

### Needs from other pieces

- car.js: the car's kinematic cannon body has `allowSleep` on, so it falls asleep while parked and
  then passes through every prop until something wakes it. Bowling wakes it each frame while the car
  moves; the proper fix is `allowSleep: false` (or `wakeUp()` when speed is non-zero) in car.js.
- map.js: the race reads `ctx.modules.map.layout.roads` (closed road named `outer`) and `onBridge`;
  the hunt reads `layout.landAt`, `dLandAt` and `roadDistAt`. Without them the race lays its own kerbed
  loop and the hunt only checks collider clearance. A published `ctx.island.raceLoop` ([{x,z}]) overrides the race road.

## TOUR

Owned by the tour builder: `src/games/tour.js`, the start gate chooser in `src/games/race.js`
(`intro()` only) and the `'tour'` entry in `GAME_IDS`.

### What it is

A guided tour next to the race. The guide is not a game: `start()` opens it and hands the game slot
straight back, so while touring the camera orbit, the game pads and the arcade cabinets all keep
working. When another game starts the guide pauses (card and trail hidden) and comes back on
`game:stop`. `meta.kind` is `'guide'`.

Ways in: the race start gate card ("Race or tour?", `T` or the yellow button), the "Take the tour"
pill under the top-left HUD row (on phones under the Sound button), the `T` key anywhere on the
island, or `ctx.modules.games.start('tour', { direct:true })`. Without `direct` a welcome card opens
first (with Resume and Start over when there is saved progress).

Route, 12 stops: blueberry, brain, studio, dock, school, umd, clinic, chapel, yard, now, skills, contact.

Per building:

| phase | card | world |
|---|---|---|
| `travel` | name, role, metres to go. Next = Take me there (menu wipe teleport) | chevron trail (A* on a 3 m grid over land and bridges, roads cheaper), ground arrow ahead of the player, gem and beam over `island.doorOf(id)` labelled "Door: go in here", dashed trail on the minimap |
| `arrive` | within 11 m of the door: first bullet plus how to go in (hop out with F, walk to the door, press F). Next = Go inside | marker stays on the door |
| `inside` | one card per stop, "inside, 2 of 4". Next walks the player to the stop and eases the room camera toward it; the last Next heads out | gem, short beam and ring over the stop in the room's scene |
| `done` | Tour complete, Race the loop, Start over, Close | nothing |

Walking out of a room during `inside` moves on to the next building. Entering any building on the
route jumps the tour to it. Back goes to the previous stop (from the first stop inside, out to the
door). Skip to next building teleports to the next one.

Keys: `N` next, `B` back, `T` open, `Esc` pause. Esc is taken before core sees it while the guide is
running, so pausing inside a room does not also leave the room (a second Esc does). Progress is kept in
localStorage `island.tour` as `{ k }` and the pill reads "Resume tour 5/12".

### Stops inside a room (interiors builders)

The shared stop shape, unchanged: `room.tour = [{ id, title, text, at:[x, y, z] }]` in room coordinates,
`at` where the marker floats (the ring sits on the floor under it, the player is walked to about 2.2 m in
front of it on +z). Without `room.tour` the guide makes one stop per entry of `room.tourRooms` or
`room.rooms` (needs `cx`, uses `name`) at `[cx, 2.3, -1]`, else one stop for the whole building.
The camera ease runs at order 87, after the room and walker aim the camera and before the camera
module's orbit (88); it only turns the camera, never moves it, and fades out when the player walks.

### Test hooks (`window.__island.tourGuide`)

```
open({ direct?, restart? }), close(), next(), back(), skip(), goto(k)   k is 0-based
state() -> { on, paused, phase, stop, of, zone, inside:{ i, of, title, source:'room.tour'|'fallback' }|null, trail, dist, look, saved }
route() -> the 12 zone ids in order
plan(x, z, zoneId) -> { n, len }   trail points and metres from (x, z) to that door
```

### Needs from other pieces

- menu.js: a "Take the tour" entry would call `ctx.modules.games.start('tour')`.
- camera.js: nothing now; orbit keeps working because the tour frees the game slot.

## ROUND 5

The island moved out of the old session scratchpad to `andliu-portfolio/island/` on 2026-09-29. Serve
`andliu-portfolio/` (`python -m http.server 4297 --bind 127.0.0.1`) and open `/island/index.html`.
Bruno Simon reference shots are in `_ref/` (see `_ref/INDEX.md`). Put your screenshots in
`_shots/r5/<piece>/`.

Browsers (rule changed 2026-09-30 after calibration): builders never launch a browser. One headless
SwiftShader Chrome renders the island at about 1 fps and roughly 20 of them pinned the CPU for hours,
so every builder stalled. Builders check their work with `node --check` and by reading code; the lead
runs browser checks one at a time, in the owner's real Chrome where possible. At most 3 builders run
at once, never two on the same file, and a builder with no diff after 45 minutes is stopped and split.
Any browser profile goes in the OS temp folder and is deleted when the check ends.

New modules (registered in `main.js`, init order after `voices`'s predecessors):
`map, car, character, camera, menu, interiors, games, atmosphere, garage, drone, pets, dialog, voices`.

### Wave 1 ownership (each file has exactly one owner; read anything, edit only your own)

| Piece | Owns |
|---|---|
| vehicles | `src/player/car.js`, `src/player/garage.js`, `src/core/input.js` |
| drone | `src/player/drone.js`, `src/camera.js` |
| character | `src/player/character.js` |
| fishing | `src/games/fishing.js` (new), `src/games/tour.js`, `src/games/index.js` |
| pets | `src/world/pets.js` |
| trees | `src/world/trees.js` (new), the tree scatter block in `src/world/map.js` (the `// trees` section of the scatter only), tree and crown code in `src/world/art.js` |
| atmosphere | `src/world/atmosphere.js`, `src/core/renderer.js` |
| dialog | `src/ui/dialog.js`, `src/world/voices.js` |
| contact | `src/interiors/contact.js` |
| rooms-a | `src/interiors/brain.js`, `studio.js`, `now.js` |
| rooms-b | `src/interiors/dock.js`, `school.js`, `umd.js` |
| rooms-c | `src/interiors/yard.js`, `chapel.js`, `skills.js` |
| inventory (added mid-round) | `src/ui/inventory.js` |
| assist (added mid-round) | `src/player/assist.js`, `src/games/race.js` |

Wave 2 (after wave 1 lands): `world` owns `src/world/map.js` (except trees) and the door parts of
`art.js`; `menu` owns `src/ui/menu.js`, `index.html` and the final key-label sweep.

### Keys (changed in round 5)

`F` = interact (hop out, get in, enter a door, adopt, fish, talk). `Enter` still interacts.
`Q` / `E` = left / right turn signal in any vehicle. `Shift` = boost (flames out the back).
`Space` = brake (brake lights on). `C` = talk to the nearest NPC. On foot `H` whistles the vehicle over (drives itself to your right side).
`J` = exploration checklist (src/ui/tracker.js). `V` = first-person view (camera.js). `P` = cycle camera presets (moved off V on 2026-09-30).
Every visible hint that says "E" for interact must say "F". `input.js` emits actions
`interact` (F, Enter), `signalLeft` (Q), `signalRight` (E), `talk` (C), `honk` (H; on foot car.js turns it into the call).

### Cross-module interfaces (implement yours; call others with `?.` so a missing one never throws)

```
ctx.modules.dialog.say({ name, lines:[string], portrait?:'berry'|'robot'|'tooth'|'terrapin'|'blob'|'brain'|'sign', choices?:[label] })
    -> Promise<choiceIndex|undefined>   Pokemon-style black box at the bottom that opens like a
    CRT turning on, typewriter text, blinking ▼, F / Enter / click to advance. One at a time; queued.
ctx.modules.dialog.open()   ctx.modules.dialog.busy() -> bool
ctx.modules.atmosphere.setNight(bool), isNight(), setSeason('spring'|'summer'|'autumn'|'winter'), season()
    bus 'atmosphere' { night, season }   (trees listen and recolour; lanterns light)
ctx.modules.trees?.setSeason(name)      (trees.js exposes this through map's module or ctx.expose)
ctx.modules.garage.vehicles() -> [{ id, name }]   current() -> id   choose(id)   call()
ctx.modules.drone.active() -> bool   land('here'|'me')
ctx.modules.pets.pets() -> [ids]    adopt(char)
ctx.modules.games.start('fishing', { tour?:true })   result { fish, berry?:true }
ctx.modules.character.swimming() -> bool   onDock() -> bool
ctx.modules.camera.setMode('follow'|'god')   holdView(bool)
```

### Inventory (added mid-round 5)

```
ctx.modules.inventory.add({ id, name, icon?, count?=1 }) -> bool   any module can give the player an item
    (fishing: each catch; hunt: each berry; contact: a stamp; rooms: a souvenir)
ctx.modules.inventory.has(id) -> count     remove(id, n=1)     items() -> [{ id, name, count }]
ctx.modules.inventory.pickable(obj3d, { id, name, icon }) registers a world object that F picks up
ctx.modules.inventory.nearest() -> { id, dist } | null     lets the character resolve F priority
I or Tab opens the bag. bus 'inventory' { items } on change.
```
F priority when several things are in reach: dialog open > pickup within 1.6 m > NPC / pet > door > vehicle.

### Driving assist (added mid-round 5)

`src/player/assist.js` runs at frame order 11 (right after the vehicle moves at 10) and only in drive mode.
G toggles the guide (on by default, saved in localStorage). ctx.modules.assist { on(), set(bool) }, bus 'assist' {on}.
It reads and nudges car.heading / x / z / speed; it never replaces car.js movement. Vehicle builders:
keep `car.x, car.z, car.heading, car.speed` on ctx.modules.car.car for whichever vehicle is active.

## Calibration 2026-09-30

Round 5 was stopped at calibration. The reports are in the session scratchpad `calibrate-20260930/`.
Tested as working: night (L), pet adoption, inventory pickup and the bag, and the guide toggle (G).
Tested as broken: F does nothing through input.js (only E and Enter interact). drone.js, garage.js
and dialog.js are still stubs. The swim and dock code in character.js is never called. houses.js,
assist.corridor and hunt:berry are not wired in.
Restart order: D1 put the game live on andliu.dev, D3 make F the only interact key with one priority
rule, D4 dialog/vehicles/drone and then the rooms, D5 wire in the dead code, D2 the scroll site,
D6 wave 2, D7 trees to the EZ-Tree bar (`_ref/TREES-EZTREE.md`). At most 3 builders at a time, and
builders never open a browser (see the Browsers rule above).

## SPACE (secret world)

Owned by `src/space/` (index.js runtime, kit.js controllers, hub.js station, islet.js, models.js, areas/*.js). Design, area contract and briefs: `SPACE.md`. It borrows the interior slot (zoneId 'space') and sets `room.ownsPlayer` and `room.onEscape`. The islet is at (0, 162); walk onto the wing pad on foot. Tests: `node src/space/space.test.mjs`; runtime hook `__island.space`.
