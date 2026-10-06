# bruno-simon.com reference capture (2025 version)

Captured 2026-09-29 in headless Chrome at 1440x900 on the real GPU (ANGLE d3d11). The site's Options tab reported its renderer as WebGPU. Driven over CDP with key events, mouse clicks, drag and wheel.

## Screenshots

| File | What it shows |
|---|---|
| loading-ring-early.jpg | Loading state: dark maroon void, an endless grid of magenta "x" marks with faint diagonal lines, one glowing white ring on the ground |
| loading-click-to-start.jpg | Loaded state: the ring has become a lit round diorama (red jeep, pink trees, lamp post, bench) on the grid void, with a hand-drawn "CLICK TO START", an arrow and a speaker icon |
| start.jpg | First frame after the click: the full island has faded in around the diorama. 3D extruded "BRUNO SIMON" letters, crates, a notice board with a map, a river behind, a "Server connected" toast top centre, and the menu and map buttons top right |
| drive-1.jpg | Seconds into driving: the letters are physics objects and got knocked over (now reading "BRUNOS O"), an explosive crate went off with a cartoon yellow and orange blast, and the car flipped. Pink "whisper" flames on the ground |
| drive-2.jpg | Car beached against a bench and a skull-and-rubble prop. A "RES(E)T" interact prompt with a diamond key icon sits above the car. Stylised shoreline with white foam lines |
| map.jpg | Map overlay (M key or the map button): a painted top-down render of the whole island, square and centred over the dimmed game. The race circuit loops the west half, islands and lakes fill the east, 12 white diamond pins, a car icon at the player position |
| map-night-hover-label.jpg | The same map at night: the texture swaps to a night version (map-night.webp). Hovering a pin shows its label ("LAB"). A "Now playing Boy.mp3" music toast is showing |
| map-teleport-altar.jpg | After clicking the Altar pin: the car teleported with a coarse halftone dither wipe (visible bottom right), a confetti burst, and the achievement toast "I'm going on an adventure! 1/1". A visitor whisper "THIS GAME IS THE BEST" with a flag floats in the world |
| altar-area-night.jpg | Altar at night: stone ring, pentagram with fire, glowing skulls, and a world-space counter "123,826" (global count) |
| camera-zoom-in.jpg | Mouse wheel zoom: the camera moves a little closer at the same fixed high 3/4 angle. Night water glows saturated blue with light-streak highlights |
| camera-drag.jpg | Left-drag pans the camera off the car (the car ends up at the right edge). The view stays panned after release until the car moves again |
| water-drive-in-sunrise.jpg | Car driven into a river at sunrise: warm orange grade, car sitting in the water, floating debris, water dark in the middle and teal at the shallow edges, with white wave lines |
| water-car-submerged-night.jpg | Car fully in a lake at night, visible through blue water, headlights glowing, floating leaf particles |
| menu-home.jpg | Menu (hamburger button): a row of 7 icon tabs plus a red close X, a live 3D preview in the left panel and text on the right. Home tab: "Bruno's Home", a short bio, "And don't break anything!" |
| ui-menu-options.jpg | Options tab: Audio, Quality (High), I'm stuck! (Respawn), Reset, Renderer (WebGPU), Server (Online). While the menu is open, the game behind gets a warm, dithered tint |
| ui-menu-achievements.jpg | Achievements tab: 0/38, a row of 6 locked reward swatches, then a list where each entry has a title in the condensed hand font, a description, a progress bar and an N/M count |
| ui-menu-circuit.jpg | Circuit tab: daily top-10 leaderboard with country flags, 3-letter names and times (best 00:21:025), "Resets in 5h 38m" |
| ui-menu-whispers.jpg | Whispers tab: the rules (everyone sees them, max 30 whispers, one per user, max 30 characters), a flag picker, a text input and a submit button |
| project-area-arrival.jpg | Projects area after a map teleport: a wooden billboard showing one project, signposts to the previous and next projects on either side, a chalkboard reading "NEXT/PREV/OPEN/EXIT", an FWA distinctions bench, a role signpost, and an emblem pad on the ground |
| project-area-interact-prompt.jpg | Car parked on the emblem pad: a "PROJECTS" label with an Enter icon appears above the car |
| project-display-open.jpg | After pressing Enter: the camera flies to a low, front-on close-up of the billboard. Title "Three.js Journey", a url pill, an image carousel with 5 dots and arrows, previous project "Citrix Redbull", next "Bonhomme 10 ans", ROLE "Developer, Formater", WITH "Herve Studio, Bonhomme Paris" |
| project-display-next.jpg | The right arrow moves the carousel to image 2 (a site screenshot). The signs, the controls board and the props are all in the world, with no HTML overlay |
| project-area-career.jpg | Career area: neon timeline lines in different colours laid on the ground, starting from a "2008" tile, each ending in square nodes |
| project-area-lab.jpg | Lab area: a "Black Hole" billboard with a vertical thumbnail list of lab projects, a bubbling pink cauldron, a potion table and an emblem pad |
| game-bowling-arrival.jpg | Bowling area: neon bowling-pin sign with an arrow, neon jukebox, diner booth, pin-count scoreboard, giant bowling ball. The sign hides the car, and nothing fades it |
| game-circuit-arrival.jpg | Circuit start grid at night: painted grid slots, a checkered line, a world-space leaderboard board with flags, a "RESET in 5h 34m" alarm clock, a Three.js banner |
| game-cookie-arrival.jpg | Cookie area: a brick oven with a world-space global counter "5,581,533", a giant cookie on a crate, a banner |

## What makes it good

### Camera
- A fixed high 3/4 follow camera, close to isometric, that never swings behind the car while driving. Wheel zoom exists but its range is small
- Left-drag pans the view away from the car. It stays panned after release and snaps back to following once the car moves
- Interacting with a project (Enter on the pad) flies the camera to a low, front-on close-up that frames the billboard and its signs. Esc flies back to the follow view
- Strong depth of field: foreground trees and the far background are visibly blurred at all times, which gives a tilt-shift, miniature look
- No occlusion handling: a neon sign completely hid the car in the bowling area

### World and map
- One square island: a race circuit with red and white kerbs across the west half, and smaller islands linked by wooden bridges in the east
- 12 named map pins: Achievements, Altar, Behind the scene, Bowling, Career, Circuit, Cookie, Lab, Landing, Projects, Social, Time Machine. The "Traveler" achievement counts 13 areas
- Each area has its own prop set and colour accent: neon for bowling, pentagram and fire for the altar, a cauldron for the lab, an oven for the cookie
- Almost every small object is physics-driven: the 3D name letters, crates, benches and fences get knocked over, and explosive crates blow up with a cartoon blast
- A full day/night cycle that runs in a few minutes: warm orange sunrise and day, pink dusk, blue-purple night with glowing lanterns. The map texture has a night version too
- Shared global state is shown in the world: the altar counter (123,826), the cookie counter (5,581,533), the circuit leaderboard board, and other visitors' whispers floating as labels with flags

### Water and terrain
- The water is stylised, not realistic: dark in the middle, teal to blue in the shallows, hand-drawn white foam lines along every shoreline, leaves floating on top
- At night the water turns a saturated glowing blue with light streaks
- The car can drive into water and visibly sink below the surface (the "Under the sea" achievement)
- The ground is warm orange paving tiles scattered with red leaf particles. Grass is dense, spiky low-poly tufts. Trees are clouds of small leaf quads in pink, orange, yellow and red

### Menu and navigation
- Two fixed square buttons top right: hamburger (menu) and map pin (map). M also opens the map
- The menu is a centred two-panel modal: a live 3D preview on the left, content on the right, 7 icon tabs across the top (Home, Options, Controls, Achievements, Circuit, Whispers, Behind the scene) and a red close button
- While a modal is open, the game behind is tinted and dithered rather than just dimmed
- The map is a painted top-down render. Hovering a pin shows its name, and clicking a pin teleports the car there with a halftone dither wipe
- R respawns at the closest respawn point (also in Options), and Reset puts every object back
- The Controls tab covers keyboard, touch and gamepad separately. Keyboard: WASD or arrows move, Shift boosts, Ctrl or B brakes, Space jumps, Enter interacts, M opens the map, L mutes, T posts a whisper, R respawns, number keys work the hydraulics, left-drag moves the camera, H honks

### Games and interactivity
- Circuit: a timed race with a daily top-10 leaderboard (flags, reset countdown), shown both in the menu and on a board beside the start grid
- A bowling area with pins, lanes, a ball and a scoreboard (there is an achievement for a strike)
- A cookie oven with a global cookie counter, and an altar you can drive into (the "Sacrifice yourself" achievement)
- 38 achievements with progress bars and toasts, including flips, reaching 15 m high, blowing up 20 explosive crates, distance driven, honking, and staying for a full day cycle
- Whispers: a visitor posts a message of up to 30 characters with a country flag, and it appears in the world for everyone
- Contextual prompts: a small dark label with a diamond key icon appears above the car near anything interactive ("PROJECTS", "RES(E)T")

### Project presentation
- Projects are physical billboards in the world, not HTML pages: a wooden frame, a hand-lettered title, a url pill, and an image carousel with a dot indicator and arrow buttons
- Signposts to the left and right of the board name the neighbouring projects, a separate signpost gives the role and collaborators, and awards sit on a "DISTINCTIONS" bench with the FWA logo
- A chalkboard beside each board teaches the keys: NEXT, PREV, OPEN (Enter), EXIT (Esc)
- Left/right arrow and D stepped through the images; Up did not change the project. The images include site screenshots and a captioned video frame
- The Lab uses the same pattern plus a vertical thumbnail list. Career is a neon timeline on the ground starting in 2008

### Character and vehicle
- A chunky red off-road jeep with a glowing yellow headlight bar, roof lights, pink triangle decals and oversized wheels
- Physics-driven: it flips, lands on its roof, climbs onto props and sinks in water. Space jumps, and number keys work the hydraulics (per the Controls tab)
- A thin white trail line follows the car's recent path along the ground

### Sound and UI feel
- The start screen shows a speaker icon, and audio starts after the click. A music toast reads "Now playing Boy.mp3". (Headless run, so the audio itself was not heard)
- UI fonts: condensed hand-drawn caps (Amatic SC) for titles, labels and toasts; Nunito for body text; Pally is also loaded
- The UI palette is dark aubergine panels with a thin light border, maroon square buttons and green-accent success toasts
- Toasts appear top centre: "Server connected", and achievements with a green tick and "1/1"
- Loading to start is one continuous scene: the glowing ring becomes the spawn diorama, and then the island appears around it

### Performance
- requestAnimationFrame counted over 2 s: 33 fps on the click-to-start screen, 33 at spawn, 44 while driving, 49 zoomed in at the altar, 32 at Career, 31 at Lab (headless Chrome, 1440x900, Intel Arc, WebGPU renderer)
- Options has a Quality toggle (High), described as "Toggles some effects"
