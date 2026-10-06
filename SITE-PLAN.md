# andliu.dev: the site plan (revision 3)

## A2. Late amendments from Andrew, 2026-10-01 (override everything below)

17. **Feedback popup with the slider** (`components/ui/slider.tsx`, base-ui, single thumb). A small
    "How was this?" card: a 1 to 5 slider whose ends are the mascot's faces (A9; not emoji), the label
    for the current value in Andrew's voice, an optional one-line note, Send. It appears ONCE per visitor,
    never on the first screen: after the visitor reaches the island finale or after about 60 seconds of
    real scrolling, whichever is first. Esc, a close button and a click outside dismiss it, and dismissal
    is remembered (localStorage, wrapped in try/catch). Submissions go to the same Cloudflare Worker as
    the chat (`POST /feedback`: origin allow-list, rate limit, stores rating, note and timestamp in Workers
    KV; no personal data). If the Worker URL is not configured the popup does not render at all: no fake
    "thanks". Map the slider's `bg-input` and `ring` classes to /andliu tokens (`--color-input` is not
    defined in `globals.css`). Keyboard: arrows move the slider, Tab reaches Send. Reduced motion: no
    entrance animation. Owned by the chat piece (it owns the Worker) unless the planner splits it.
18. **`components/ui/hero-section-6.tsx` is a parts bin, NOT a second hero.** Its SaaS copy, nav and
    "Book a demo" buttons are demo. Use: (a) its `Iphone15Pro` SVG frame as the outer frame layer of the
    exploded Blueberry phone (A4), recoloured to /andliu tokens, with the screen content as live DOM, not an
    image; (b) its desktop-plus-phone composition (a desktop capture of Blueberry with the phone overlapping
    it) in the Blueberry chapter; (c) its blur-and-spring staggered entrance (`components/ui/animated-group.tsx`,
    now importing `motion/react`) as one of the site-wide text animations (A2). Its `next/image` uses
    remote demo URLs; replace with local captures. Delete the file at integration if nothing imports it.

Lead designer's plan for the rebuild. Revision 1 and 2 were written 2026-10-01; revision 3 folds in
Andrew's amendments of the same day (block A, kept verbatim below) after he reviewed the local page.
The projects are the longest act; the page ends by opening into the island, and the island appears
nowhere else.

## A. Amendments from Andrew, 2026-10-01 (these OVERRIDE everything below)

Andrew looked at the current local page and gave this direction. Where a later section disagrees
with this block, this block wins. The lead designer folds it into the body; builders treat it as
the contract.

1. **Not centred on the game.** He likes the hero's style and background palette, but the game
   showing in the background on hover, and the island as the organising metaphor everywhere, is
   too much. The island is the FINALE ONLY, plus at most one small teaser line. Remove: the island
   minimap in the header, island zone names as section labels, "Visit on the island" links, and
   island renders as the imagery for the hero, projects, experience and about. Ground colours can
   still deepen with scroll (keep the dusk curve); just stop naming it after the island. Imagery
   comes from real project screenshots, Blueberry-styled illustration, and photos of Andrew (A11).
2. **Hero: more personable, more text animation.** Keep the paper and contour background and the
   palette. No game, no hover reveal of the game. Personality instead: kinetic type (letters of the
   name arriving, a Fira Code scramble on the identity line, a rotating "currently: ..." line built
   from true facts), the name itself reacts to the pointer, and a portrait slot (A11). More text
   animation across the whole site: masked line rises, per-word reveals, rolling hover
   (`components/ui/rolling-list.tsx` pattern) and highlight hover
   (`components/ui/hover-link-animation.tsx`) on keywords and links.
3. **Big headers flip.** Every section's display header is interactive: on hover or tap its
   letters flip or roll (flip-links / rolling-list mechanics), focusable, keyboard-triggerable,
   off under reduced motion.
4. **The centred object with an exploded view (his "Ferrari" moment).** The Blueberry phone is the
   page's hero object, centred. On scroll it BREAKS APART into its layers, spaced in depth, each
   labelled (glass, the flashcard deck, the lesson screen, the RDKit grading layer, the frame;
   label text only from true facts), then reassembles. Pointer tilt rotates the whole stack in
   perspective so you see it from a slightly different angle. Build with CSS 3D (DOM planes,
   `transform-style: preserve-3d`, translateZ), NOT three.js. Reduced motion: assembled, no tilt.
5. **The phone shows real Blueberry.** Its screen uses Blueberry's own colours, type and patterns
   (`grignard/grignard-app-source/src/index.css` tokens, its card and button styles) and is
   INTERACTIVE: a real flashcard deck from `grignard-app-source/src/data/decks/` (real cards, not
   invented), tap or click or Space to flip, arrows or swipe for next. The plan's Learn / Practice /
   Review tabs can stay if they fit.
6. **Hover depth on images.** Project images and portraits tilt toward the pointer with layered
   parallax (foreground layer moves more than background), the "slightly different view" effect.
   Fine pointer only; tap does nothing odd on touch.
7. **Projects more fun.** Rolling titles (rolling-list mechanics: title rolls to italic and colour,
   image reveals with a tilt), playful card motion, the mascot reacting (A9). The planner decides
   whether morph-gallery stays; if it stays it must earn its WebGL context.
8. **New section: Impact, with interactive graphs.** After Projects. An accordion with one panel
   per project; CLICK or keyboard toggles (not hover: hover is reserved for visual highlights);
   opening one closes the others; the first is open by default. Each panel holds interactive charts
   (recharts is installed; tooltips, legends, keyboard focus) of REAL measured effects. Second
   Brain matters most: e.g. memories saved over time (from `second-brain/second-brain/memories/*.md`
   dates), indexed rows, notes, measured query latency. Blueberry: e.g. commits over time from
   `git log`, lessons, decks, cards, reactions, packages, tests counted from the repo. Others where
   real data exists. A script `scripts/impact-data.mjs` derives every number from disk and git and
   writes `lib/impact.json` with a `source` string per series; the section reads only that file. A
   metric that cannot be derived is omitted, never estimated. Use the `dataviz` skill.
9. **Cute characters that follow you.** A small mascot (a blueberry character, flat /andliu style,
   inline SVG) follows the cursor on a spring (`components/ui/mouse-follow-animations.tsx`,
   `SpringMouseFollow` mechanics), lagging behind, blinking when idle, reacting to what you do
   (peeks at a hovered project, cheers when an Impact panel opens). `pointer-events: none`, never
   covers text it is near, fine pointer only, a small toggle to hide it, off under reduced motion.
10. **Experience fits one screen.** At 1440x900 the whole section (header plus all four roles) fits
    in one viewport with no scrolling inside it. Tighter rows and text; keep the wave or hairline
    in the middle as the visual spine.
11. **Photos of Andrew are coming later.** Build portrait slots (hero, About, Off the clock) that
    read from one list in `lib/site.ts` and files in `public/images/me/`; until files exist, show
    a tasteful designed placeholder (not a grey box, not stock people). Support an optional cutout
    layer per photo so A6's depth effect works.
12. **Off the clock copy needs to be more interesting**, with true facts only (cooking, lifting,
    faith, landscape design, the UMD garden line). Andrew will supply more; keep every line in
    `lib/site.ts` so he can edit one file. Gardening is NOT a hobby.
13. **Blueberry title DECIDED 2026-10-01: "Founder and product lead".** Andrew confirmed he is the sole founder. Every occurrence must
    come from ONE constant in `lib/site.ts` (`BLUEBERRY_TITLE`), now "Founder and product
    lead", so the change is a single edit.
14. **New components saved** (`components/ui/`): `mouse-follow-animations.tsx` (imports
    `motion/react`, already installed), `rolling-list.tsx` (uses `next/image`; in this static
    export use plain `<img>` or an unoptimized image), `hover-link-animation.tsx`. Their demo items
    and images are placeholders to replace.
15. **Keep going off Lando**: more features and animation overall, but each must be about Andrew.
16. **Gradient grounds per section.** The page changes as you scroll, so some sections sit on a soft
    radial gradient ground instead of a flat fill, in the style of `components/ui/gradient-backgrounds.tsx`
    (`radial-gradient(125% 125% at 50% 10%, <light> 40%, <accent> 100%)`). Colours come only from the
    /andliu tokens (paper into apricot, paper into berry, berry into berry-deep), never the demo indigo or teal.
    Each gradient must keep WCAG AA for the text on it at its darkest point. Neighbouring grounds still
    meet on the curved edges. The component's unused `useState` and `cn` are demo leftovers; drop them in use.


Inputs read in full: `_ref/research-imagery.md`, `_ref/research-components.md`,
`_ref/research-bar-content.md`, the Lando shots in `_ref/lando/`, the /andliu skill (`SKILL.md`,
`tokens.css`), the original breakdown (`andliu-breakdown.html`), the current `app/`, and for
revision 3: `components/ui/mouse-follow-animations.tsx`, `rolling-list.tsx`,
`hover-link-animation.tsx`, `gradient-backgrounds.tsx`; `grignard-app-source/src/index.css` (tokens,
`.bb-press`, the berry's `[data-mood]` rules), `src/components/ui/blueberry-mark.tsx` (Blueberry's
own flat berry with eyes and moods), `src/data/decks/` (17 decks; `grignard.ts` is the original
deck, 44 questions) and `src/data/types.ts`; the second-brain repo (`memories/YYYY-MM.md` with one
`## [date] kind | title` block per memory, `MEMORIES.md`, `index.tsv`, `wiki/pages/`,
`bench/results-speed-summary.json`, `bench/results-history-summary.json`); and the foundation's
partial edits now on disk (listed in 11, piece `foundation`).

**Copy rule.** Every fact comes from the content inventory (`_ref/research-bar-content.md` section
2), which cites `island/src/data/zones.js` [Z], `app/page.tsx` [P], the résumé PDF [R] and
Blueberry's `src/data/site.ts` [S], plus, new in revision 3, numbers derived from disk and git by
`scripts/impact-data.mjs` [D] and real cards from Blueberry's decks [B]. UI labels come only from
`MICROCOPY` in `lib/site.ts` (2.4), a short list Andrew signs off. A line in none of these does not
ship. Zone names stay usable as a *source* tag ([Z]) but never as visible labels. No em dashes
anywhere: copy, code, comments, this file.

**What changed from revision 2, in one paragraph.** The island stops being the organising metaphor:
the header minimap, zone labels, `data-zone`, "Visit on the island" links and every island render
outside the finale are gone; the page tracks plain section ids instead. The hero becomes a person:
kinetic, pointer-reactive type, a scramble line, a rotating "currently" line, and a portrait slot.
Every display header flips. Blueberry's chapter is now built around one centred object, its phone,
which explodes into labelled layers in CSS 3D and holds a real, playable flashcard deck.
morph-gallery is cut, so Projects becomes a rolling index plus four full spreads with depth-tilt
images, with zero WebGL. A new Impact section shows measured effects in accordion panels of charts
fed by one generated file. A blueberry mascot (Blueberry's own berry, flat) follows the cursor.
Experience fits one screen. Portraits have slots and designed placeholders. The page grows from 15.9
to 17.75 viewports, and project content (Blueberry, Work, Impact) is 51% of it.

---

## 0. The idea

Lando's site is his helmet colours and his own footage. Andrew's equivalent is **the things he
builds and the person building them**: Blueberry first, then the rest of the work, then the
evidence that it mattered, then who he is off the clock, and only at the very end, the island, the
one toy world he built for fun, which you may enter if you want to.

The page is one evening of light: paper at the top, warming into apricot, deepening through berry
while you are inside Blueberry and the work, reaching ink by the time you get to him and the
island. The light is the continuity; the island is not.

Three Lando moves carry the design:

1. **Two voices in one headline.** Fira Code 700 caps for most words, Antic 400 mixed case for the
   keyword, in the ground's keyword colour. When you touch a headline, the voices answer (A3).
2. **The ground changes with scroll, and grounds meet on a curved edge.** It only ever darkens.
   Some grounds are soft radial gradients (A16).
3. **One hero object you can turn in your hands** (Lando's helmet, here the Blueberry phone, A4),
   and a ticket that says what he is doing now.

Refused: the landscape-phone block screen, header pills over text with no backdrop, a clipped
two-column split at 390px, a page of canvases, and anything that is "the island again".

---

## 1. The scroll story at a glance

### 1.1 Budget (1440x900, in viewports of 900px)

The integration check sums `offsetHeight` of every `section[id]` inside `main` at 1440x900 and fails
if the total exceeds **18.0 viewports** (16,200px) or if `#blueberry` + `#work` + `#impact` is under
**48%** of the total. Non-project rows are **caps**; project rows are **floors**. Every section root
reads its row from `BUDGET` in `lib/site.ts` (in `svh`).

| # | `section[id]` | What | Budget | Project | Pinned |
|---|---|---|---|---|---|
| 1 | `top` | Hero: kinetic name, portrait, NOW BUILDING ticket | 1.00 cap | no | no |
| 2 | `manifesto` | Thesis, then the ON / OFF fork | 0.90 cap | no | no |
| 3 | `dive` | Glyph portal into Blueberry (frame plus chapter head) | 2.00 cap | no | **yes (1 of 3)** |
| 4 | `blueberry` | The phone, exploded and playable; facts; screens | 3.60 floor | **yes** | **yes (2 of 3), 768px and up** |
| 5 | `work` | Rolling index, then four project spreads, then the one island teaser line | 4.20 floor | **yes** | no |
| 6 | `impact` | Accordion of measured effects, one panel per project | 1.30 cap | **yes** | no |
| 7 | `experience` | Four roles, one screen | 1.00 cap (and at most 900px at 1440x900) | no | no |
| 8 | `offclock` | Cover poster plus three portrait notes | 1.15 cap | no | no |
| 9 | `contact` | The footer card | 0.75 cap | no | no |
| 10 | `island` | The finale track and the end strip | 1.85 cap | no (excluded) | **yes (3 of 3)** |
| | | **Total** | **17.75** | **9.10 = 51.3%** | |

Why the total rose from 15.9: Impact is new content Andrew asked for, and the phone needs a real
stage to come apart in. Lando's page is 15.1; this is longer because it has to prove more, and the
share check keeps the extra length on the work.

### 1.2 The light curve and the grounds (asserted from the DOM)

One monotonic curve by relative luminance of the flat ground: paper (0.86) > apricot (0.68) > berry
(0.09) > berry-deep (0.02) > ink (0.008). No section returns to a lighter flat ground after a darker
one. Gradient grounds (A16) are painted by the section itself over its flat ground and end on the
next ground's colour or darker.

| # | `section[id]` | `data-ground` | `data-gradient` | Header label (`data-section`) |
|---|---|---|---|---|
| 1 | `top` | `paper` | `paper-apricot` | none |
| 2 | `manifesto` | `apricot` | none | none |
| 3 | `dive` | `berry` | none | Blueberry |
| 4 | `blueberry` | `berry` | `berry-deep` | Blueberry |
| 5 | `work` | `berry-deep` | none | Work |
| 6 | `impact` | `berry-deep` | none (charts sit on `--card` panels) | Impact |
| 7 | `experience` | `berry-deep` | none | Experience |
| 8 | `offclock` | `ink` | none (the poster paints its own sky) | Off the clock |
| 9 | `contact` | `ink` | none | Contact |
| 10 | `island` | `ink` | none | Island |

`lib/site.ts` exports this as `SECTIONS` (id, ground, gradient, label, budget, kind, project,
pinned). Integration asserts the DOM matches and the flat luminance sequence is non-increasing.

Gradients, exactly (`globals.css`, foundation), in the shape of `gradient-backgrounds.tsx`:

```
[data-gradient="paper-apricot"] { background: radial-gradient(125% 125% at 50% 10%, var(--paper) 40%, var(--apricot) 100%); }
[data-gradient="berry-deep"]    { background: radial-gradient(125% 125% at 50% 10%, var(--berry) 40%, var(--berry-deep) 100%); }
[data-gradient="paper-berry"]   { background: radial-gradient(125% 125% at 50% 10%, var(--paper) 40%, var(--berry) 100%); }
```

AA at the darkest point: ink on apricot 12.61 (hero text is ink); paper on berry 6.55 and paper on
berry-deep 12.58 (Blueberry chapter text is paper). `paper-berry` is defined (Andrew named it) but
**used nowhere on the landing**: ink text fails on its berry end and paper text fails on its paper
end, so no single text colour is AA across it. About uses it only behind the portrait frame, never
behind text (5).

### 1.3 The three pins and what every motion says

At most three pinned or sticky scroll moments: the glyph dive (`scrollLength` 1), the phone stage
(768px and up only), the island finale. Everything else is scroll-linked without a pin or plays on
enter. Each component and motion has to say something about Andrew.

| Component (`components/ui/` unless noted) | Where | The motion | What it says about Andrew |
|---|---|---|---|
| portfolio-hero (fonts, BlurText) | Hero | His name arrives letter by letter, then leans toward your pointer | He is a person who answers when you come near, not a logo |
| mouse-responsive-background | Hero portrait, About portrait | The portrait's layers drift against the pointer | You see him from a slightly different angle (A6) |
| Scramble + "currently" (custom, hero) | Hero | The identity line resolves from code glyphs; a "currently" line rotates through true facts | Half code, half person, and busy right now |
| NOW BUILDING ticket (custom) | Hero | Slides up last | What he is building right now, before anything else |
| flip-links + rolling-list mechanics (`FlipHeading`) | Every display header, menu, footer | Letters roll to the other colour; the keyword swaps voice | The two halves of him trade places when you touch them |
| hover-link-animation mechanics (`Highlight`) | Keywords and inline links | A bar rises behind the word | The words he cares about light up when you point at them |
| glyph-portal | Dive | You fly through the counter of Blueberry's B | Blueberry is a place you go into |
| cinematic-landing-hero, rebuilt as the exploded phone | Blueberry | The phone comes apart into its layers, labelled, then clicks back together; it tilts with the pointer; its deck plays | The thing he builds is real all the way down, and you can hold it |
| Counter (custom) | Blueberry | True numbers count up once | Scale without exaggeration |
| rolling-list | Work index | Titles roll; an image tilts in beside the pointer | Six things, each one alive under your hand |
| Depth frames (`TiltFrame`, foundation) | Work spreads, portraits, screens | Layers part in depth toward the pointer | The work has layers; look closer |
| recharts | Impact | Lines draw in, tooltips on hover and keyboard | Effects measured from disk, not claimed |
| timeline (vertical) | Experience | A wave spine draws; roles rise in order | A path walked one step at a time, readable at a glance |
| sakura-editorial-poster | Off the clock | The title assembles from the centre out | Off the clock the register changes to a magazine cover |
| animated-gradient | Footer card sky | A slow berry-to-apricot sky | The last light of the evening |
| hero-scrub + scroll-locked-video-hero look + island-section | Island | The tab grows into a window that can go full screen | The résumé is a place you can drive, when you choose to |
| about-us-section | About | Staggered reveals, count-ups | What he does, in six plain categories |
| mouse-follow-animations (`SpringMouseFollow`) | The mascot, site-wide | A small berry follows on a spring, blinks, peeks, cheers | The same hand built Blueberry; there is play in the work |
| Blueberry marquee, switch, card, ledge press (ported) | Footer, menu, chat, cards, buttons | Marquee drifts; buttons press onto their ledge | Blueberry and this site share a maker |

**Cut**, with the reason:

- **morph-gallery** (A7 asked it to earn its WebGL context; it does not). Its job was "one stage,
  the picture changes"; the spreads' depth frames show each project larger, sharper, with zero
  WebGL and no pin, and they freed the pin for the phone. The file stays where it is (it predates
  this build); named, not deleted.
- **The header minimap** and every island zone label (A1). `minimap.tsx` and its CSS are deleted by
  foundation, which wrote them.
- **The landscape window and goo blob in the hero** (A2: personality, not scenery). `landscape.webp`
  stays on disk, unused on the landing; About does not use it either (gradients replaced it).
  Integration names it as an orphan for Andrew rather than deleting it (it predates this build).
- **Island renders** (`images/island/zone-*`, `yard-beds`) anywhere but the finale: capture no
  longer produces them.
- **The "How it is built" block** in the Blueberry chapter: its three claims now label the phone's
  layers, which says them better.
- `orbit-delivery-hero` and `components/world/`: predate this build, unused, named and left.

### 1.4 Section state: one writer

`components/site/section-state.ts` (foundation, replacing `zone.ts`) owns `html[data-section]` and
`html[data-ground]`. Nothing else writes either.

- The director (`app/motion.tsx`) creates one ScrollTrigger per `main section[id][data-ground]`
  (`start: "top 55%"`, `end: "bottom 55%"`) and calls `setSection(id, ground)`. It is the only
  caller.
- The header's centre label subscribes (`subscribeSection(fn)`, returns the unsubscribe).
- Both writes are skipped while `html[data-jumping]` is set (1.6) and applied once after.
- There are no item-level overrides any more (they existed only to move the minimap dot).

### 1.5 Hand-offs and events

`components/site/handoffs.ts` (foundation) holds the only cross-section hand-off and every event
name, so names cannot drift.

**`NOTCH_TO_ISLAND`: the footer card opens into the island.** Unchanged from revision 2:

- `:root` custom properties in `globals.css`: `--notch-w: clamp(168px, 22cqi, 288px)` (against
  `main`, a container), `--notch-h: 28px`, `--notch-r: 14px`, `--notch-fill: var(--berry-deep)`,
  `--card-r: 28px`.
- Footer side (contact): the card is the last element of `section#contact`, `margin-bottom: 0`,
  with a tab hanging down from its bottom centre, `width: var(--notch-w)`, `height: var(--notch-h)`,
  fill `var(--notch-fill)`, `data-handoff="notch-out"`; `section#contact` has `padding-bottom: 0`.
- Island side (island): `section#island` follows with `margin-top: 0`; its window carries
  `data-handoff="notch-in"`; at approach progress 0 it is `width: var(--notch-w)`, top corners 0,
  bottom corners `var(--card-r)`, background `var(--notch-fill)`, top edge flush with the tab.
- Verification (integration): where `#island`'s top is 10px above the viewport bottom,
  `|notchOut.bottom - notchIn.top| <= 1` and `|notchOut.width - notchIn.width| <= 1` at 390, 1280
  and 1440, chat closed.

Events (on `window`), declared in `handoffs.ts` with a typed `emit(name, detail)` helper:

| Event | Fired by | Listened to by | Payload |
|---|---|---|---|
| `chat:open` / `chat:close` | chat | mascot | none |
| `island:active` | island | chat (closes a docked panel), mascot (hides) | `{ active: boolean }` |
| `mascot:peek` | projects (index row or spread image hovered), blueberry (phone hovered) | mascot | `{ x: number, y: number } \| null` (a point in viewport px to look toward; null ends it) |
| `mascot:mood` | impact (`cheer` on panel open), contact (`shy` while the email link is hovered), blueberry (`curious` while a card is flipped) | mascot | `{ mood: 'cheer' \| 'shy' \| 'curious' \| 'happy', ms?: number }` |

Sections only emit; none imports mascot code. If the mascot is off or not loaded, the events fall on
the floor, which is correct.

Attributes on `<html>`, one writer each:

| Attribute | Writer | Read by |
|---|---|---|
| `data-section`, `data-ground` | foundation `section-state.ts` | header label, CSS |
| `data-jumping` | foundation `jump.ts` | NearViewport, director |
| `data-motion="reduced"` | foundation BOOT script and the menu's Motion switch | every section's CSS and `useReducedMotion()` |
| `data-mascot="off"` | foundation BOOT script and the menu's mascot switch | mascot |
| `data-chat="open" \| "docked"` | chat | foundation CSS |
| `data-island="active"` | island | foundation CSS (hides the chat launcher), mascot |
| `data-loader="skip"` | foundation BOOT script | foundation CSS |

### 1.6 Long jumps (`components/site/jump.ts`, foundation, already on disk)

`jumpTo(target, opts?)`: set `html[data-jumping]`, fade an ink veil in over 120ms (instant under
reduced motion), `lenis.scrollTo(target, { immediate: true, force: true })`,
`ScrollTrigger.update()`, two frames later remove `data-jumping`, `resyncSection()`, let
NearViewport re-check only what intersects now, fade the veil out over 180ms. Every in-page anchor
more than 2 viewports away goes through it (the director's document delegate handles `a[href^="#"]`
except `#island`, which the island piece's delegate handles).

`preserveAnchor(change)`: records the element at the viewport centre and its offset, runs
`change()`, `ScrollTrigger.refresh()`, and scrolls back to it. Chat docking and Impact's accordion
use it.

---

## 2. Shell and architecture

### 2.1 Files

```
app/layout.tsx               fonts, BOOT script, <Header/>, <ChatDock/>, <MascotSlot/>, <main>
app/page.tsx                 <Motion/>, then the ten sections in SECTIONS order
app/globals.css              tokens, grounds, gradients, type utilities, .press, pills, curve
                             edges, notch vars, header, loader, flip/highlight/tilt/portrait rules,
                             html[data-chat], html[data-island], html[data-mascot] rules
app/motion.tsx               the director: Lenis, [data-reveal] (lines, words), section triggers,
                             the far-anchor delegate
app/smooth.ts                Lenis handle, scrollToY, freezeScroll (API unchanged)
app/copy-email.tsx           unchanged
app/sections/<name>.tsx      server component per section (real HTML, readable with JS off)
app/sections/<name>.client.tsx   that section's client enhancer
app/sections/<name>.css      that section's CSS, every selector prefixed by its root class
app/about/page.tsx           the About route
lib/site.ts                  ALL copy, links, MICROCOPY, APPROVALS, SECTIONS, BUDGET, IMAGES,
                             PORTRAITS, BLUEBERRY_TITLE, CURRENTLY, IMPACT copy
lib/impact.json              generated by scripts/impact-data.mjs (impact piece), never hand edited
lib/bb-deck.json             generated by scripts/bb-deck.mjs (blueberry piece), never hand edited
components/site/             near-viewport, section-state, jump, handoffs, type, flip-heading,
                             highlight, tilt-frame, portrait, header, menu, loader,
                             use-reduced-motion, use-fine-pointer, and the Blueberry ports (switch,
                             marquee, card)
components/mascot/           the mascot (mascot piece); foundation writes the slot stub
components/chat/             the chat dock, SSE parser, fallback router, tests (chat piece)
components/ui/               the saved 21st.dev components, adapted in place by their owner
worker/                      the Cloudflare Worker proxy (not deployed by this workflow)
scripts/                     copy-island.mjs (unchanged), check-text.mjs, capture.mjs,
                             build-system-prompt.mjs, impact-data.mjs, bb-deck.mjs
public/images/               see 2.6
public/images/me/            Andrew's photos, added by him later (2.8)
```

**Why one file per section with its own CSS:** pieces build in parallel without touching a shared
file, and at 1am Andrew opens one section, not a 2,000-line stylesheet.

**Why server sections plus a client enhancer:** the text is real HTML on first paint (LCP, no-JS,
crawlable); motion layers on after hydration. Comment name for the pattern: "server component
renders the content; the client component only adds behaviour".

**Why generated JSON for Impact and the deck:** the numbers and cards live in other repos on this
machine that GitHub Pages' build cannot see. A script reads them here, writes a small JSON file that
is committed with the site, and records where each number came from. The section never reads disk.

### 2.2 Shared primitives (foundation builds, sections import)

- `near-viewport.tsx`: `NearViewport({ children, placeholder, margin = "100%", unmountMargin })`
  (on disk). Renders `placeholder` (same height, CLS 0) until an IntersectionObserver with
  `rootMargin: margin` fires, then `children` (a `React.lazy` component in `<Suspense
  fallback={placeholder}>`); with `unmountMargin`, unmounts when it leaves that margin. Ignores
  callbacks while `html[data-jumping]`. After a mount: `ScrollTrigger.sort(); ScrollTrigger.refresh()`
  on the next frame.
- `use-reduced-motion.ts` (on disk): `useReducedMotion()` reads `html[data-motion="reduced"]`.
  **All CSS reduced-motion rules use `html[data-motion="reduced"]` only.**
- `use-fine-pointer.ts` (new): `useFinePointer()` is true for `(pointer: fine) and (hover: hover)`,
  live via `matchMedia` change events. Every pointer-reactive effect (name lean, tilt, mascot, image
  follow) gates on it and on reduced motion.
- `type.tsx` (on disk, extended): `Letters`, `SplitHeading`, `TwoVoice` (words in `*asterisks*`
  become `<span class="kw">`), `FitHeading({ text, as, max })` (sets `--chars`).
- `flip-heading.tsx` (new, A3), built from `components/ui/flip-links.tsx` and `rolling-list.tsx`
  mechanics, both adapted in place by foundation:
  `FlipHeading({ id, text, as = 'h2', href, max })`. Renders `<h2 id>` containing one `<a
  href={href ?? '#' + sectionId} class="flip-head">`: a link to its own section, so it is focusable,
  activatable and meaningful (copy the link, or jump to the section top). Inside: an `sr-only` span
  with the plain text, and an `aria-hidden` stage of two rows. Row 1 is the two-voice text as set.
  Row 2: every Fira letter is the same glyph in `--kw` (letter cells are equal width because Fira is
  monospaced, so the rows align); the Antic keyword rolls as one word cell to Fira Code 700 caps in
  `--on`. The voices trade places. Trigger: `:hover` (fine pointer), `:focus-visible`, and a tap
  or Enter sets `data-flipped` for 900ms. Per-letter `transition-delay: calc(var(--i) * 18ms)`,
  `500ms cubic-bezier(.76,0,.24,1)` (rolling-list's ease). Reduced motion: no roll; the colour
  changes instantly on hover and focus. Sizing via `.fit` (`--chars`).
- `highlight.tsx` (new, A2), a CSS-only port of `hover-link-animation.tsx` (foundation adapts the
  file in place to this API and removes its `motion/react` import, so the landing never loads
  motion for a hover): `Highlight({ as = 'span', href?, children })`. A bar of
  `calc(1em * .12)` under the word rises to full height on `:hover` / `:focus-visible`, text colour
  flips to `var(--hl-on)`. `--hl-bar: var(--kw)`, `--hl-on: var(--ground)` per ground; every pair is
  AA (paper on berry 6.55, apricot on berry 5.23, berry on apricot 5.23, berry-deep on apricot 10.04,
  ink on apricot 12.61). Spring feel from `--ease-spring`, 260ms. Reduced motion: instant.
- `tilt-frame.tsx` (new, A6): `TiltFrame({ layers, max = 6, shift = 14, className })` where
  `layers` is an ordered list of `{ node, depth }` (0 back to 1 front). On pointer move inside the
  frame (fine pointer only) it writes `--rx`, `--ry` (up to `max` degrees) and per layer
  `--dx`, `--dy` (`depth * shift` px, opposite the pointer) with one `requestAnimationFrame` per
  move, no React state per frame; eases back on leave (`--ease-out`, 600ms). `perspective: 900px`
  on the frame, `transform-style: preserve-3d`. Touch and reduced motion: flat, nothing moves, tap
  does nothing special. Comment names the pattern (refs plus CSS variables instead of state).
- `portrait.tsx` (new, A11): `Portrait({ id, sizes })` reads `PORTRAITS[id]` (2.8). With a `src`,
  renders a `TiltFrame` of up to three layers: back (a ground-coloured shape), the photo, and the
  optional `cutout` in front so the subject separates from the background in depth. Without a
  `src`, the designed placeholder: a `paper-apricot` radial inside the frame, the contours texture as
  the back layer, an apricot disc as the middle layer, and Andrew's monogram as the front layer:
  `A` in Antic 400 and `L` in Fira Code 700 (two voices), sized to the frame. No text beyond the
  monogram, `role="img"` with `alt` from `PORTRAITS`. Not grey, not stock, and it already shows off
  the depth effect.
- `header.tsx`, `menu.tsx`, `loader.tsx`: 6.1 and 4.0.
- Blueberry ports (2.5): `switch.tsx`, `marquee.tsx`, `card.tsx`, and `.press` / `.press-soft` in
  `globals.css`.
- `FlipLink({ href, children, external })` from `flip-links.tsx` (on disk) for menu and footer.

**Reveal attributes** (director, `app/motion.tsx`): `data-reveal="lines"` splits an element into
lines (gsap `SplitText`, `mask: "lines"`) that rise 100% out of their mask with an 80ms stagger;
`data-reveal="words"` rises word by word (35ms); plain `data-reveal` fades up 24px. All on enter
(`start: "top 85%"`), once. Hidden start states apply only under `html.js:not([data-motion=reduced])`
so content is visible with JS off. SplitText re-splits on resize (its `autoSplit`) and reverts on
unmount.

### 2.3 Container queries for display type

Every section root and `main` are `container-type: inline-size` containers. `.fit`, the hero name
and the footer marquee size in `cqi`, never `vw`. Exception: `section#island` is not a container
(its iOS fallback overlay is a fixed descendant; containment would trap it). Fixed-position UI lives
in the layout (header, menu, chat, mascot), never inside a section root.

### 2.4 `lib/site.ts` is complete in batch 1

Foundation writes every string named in sections 4 to 7 into `lib/site.ts` before any section is
built. Sections import; they never inline copy. The file has no imports (the system-prompt script
transpiles it alone). Exports (typed, `as const`):

`EMAIL, GITHUB, LINKEDIN, RESUME, BLUEBERRY, BLUEBERRY_TITLE, BLUEBERRY_ROLE, IDENTITY, META, HERO,
CURRENTLY, TICKET, MANIFESTO, FORK, BLUEBERRY_CHAPTER, PHONE_LAYERS, BB_FACTS, BB_SCREENS,
BB_ENGINEERING, STACK, PROJECTS, JOBS, WORK_HEAD, IMPACT_HEAD, IMPACT, EXPERIENCE_HEAD, OFF_CLOCK,
CONTACT, FOOTER, ISLAND, ABOUT, EDUCATION, SKILLS, CERTS, CHAT_SUGGESTIONS, CHAT_FALLBACK, SECTIONS,
BUDGET, IMAGES, PORTRAITS, MICROCOPY, NAV, A11Y, APPROVALS`. `ZONES` and `zoneName` are removed.

**`BLUEBERRY_TITLE` (A13).** `export const BLUEBERRY_TITLE = 'Founder and product lead'; // [P]`
is the only place the words appear. Derived from it, never retyped:

- `BLUEBERRY_ROLE` = the part before `' and '` ("Founder"), used in the identity line
  `CS and pre-dental at UMD. ${BLUEBERRY_ROLE} of Blueberry.`
- `titleCase(BLUEBERRY_TITLE)` for `JOBS[0].role`.
- `TICKET.line`, `BLUEBERRY_CHAPTER.eyebrow`, `PROJECTS[0].kind`, the chat fallback (`Andrew is
  ${BLUEBERRY_TITLE.toLowerCase()} of Blueberry...`) and `worker/prompt-header.txt` (the chat piece
  fills it from the generated prompt, not by hand).

`check-text.mjs` fails if `/co-?founder/i` appears in `app/`, `components/`, `lib/` (outside that
one line), `worker/prompt-header.txt` or `scripts/`. The résumé PDF and `island/` (read-only) still
say co-founder; that is listed for Andrew, not changed.

**`CURRENTLY`** (hero, A2; assembled from inventory phrases; needs sign-off):

| Line | Source |
|---|---|
| `building Blueberry with a five-person team` | [R] |
| `CS and pre-dental at UMD, expected May 2027` | [R] |
| `leading Focus Family at Kharis Campus Ministry` | [R] |
| `keeping one home for notes, food, workouts and goals` | [Z now] |

The prefix `currently:` is `MICROCOPY.currently`.

**`OFF_CLOCK`** (A12): `keywords: ['Cooking', 'Lifting', 'Faith']`; `interests`: Cooking ("A
kitchen, and people at the table." [P]), Lifting ("A barbell, early." [P]), Landscape design ("The
interest that keeps growing." [P]); `garden`: "I love the UMD garden. Someday, a garden of my own,
with spices on hand." [Z yard] (the only garden line; gardening is **not** a hobby, so no "The
garden" entry anywhere); `faith` as on disk [P]. `FORK.off.line` = "Cooking, lifting, and faith."
The chat fallback `personal` answer is rewritten to match (no garden beds). Andrew will add lines;
this is the one file he edits.

**`PHONE_LAYERS`** (4.4), front to back; label text only from the inventory:

| `id` | Layer | Label | Source |
|---|---|---|---|
| `glass` | Glass and the live deck | Flashcards that hunt down the one thing you keep getting wrong. | [S] HERO.sell |
| `deck` | The flashcard deck | `${deck.count} cards from ${deck.title}` (from `lib/bb-deck.json`) | [B] |
| `lesson` | The lesson screen | Lessons that explain it properly. | [S] HERO.sell |
| `rdkit` | The RDKit grading layer | In-browser grading with RDKit.js on a bond-electron matrix model. | [R] |
| `frame` | The frame | A React 19 and TypeScript monorepo on Supabase with Postgres row-level security. | [R] |

**`IMPACT`** (6, copy keyed by the series ids in 4.6; every label needs sign-off): `IMPACT_HEAD = {
eyebrow: '03 / Impact', headline: 'MEASURED *impact.*' }`; per panel `{ id, title (from PROJECTS),
summary template }`; per series `{ id, title, unit, caption }`. The section renders a series only if
both `lib/impact.json` and `IMPACT` have it; `check-text.mjs` fails on a series in one but not the
other.

**`MICROCOPY`**, UI labels only, each with its origin. `APPROVALS.microcopy` stays `false` until
Andrew signs off; the final report lists it.

| Key | Text | Origin |
|---|---|---|
| skip | Skip to content | existing site |
| menu / close | Menu / Close | UI |
| nav | Work, Impact, Experience, About, Contact, Island | section names [P] plus Impact (A8) |
| nowBuilding | NOW BUILDING | zone name "Now Building" [Z now] |
| currently | currently: | A2 (needs sign-off) |
| visitBlueberry | Visit Blueberry | existing [P] link "Visit site", renamed to name the target |
| source | Source | [P] |
| skipInto | Skip into Blueberry | glyph-portal's `enterLabel` prop |
| forkCounts | `${PROJECTS.length} projects and ${JOBS.length} roles.` | derived from data |
| islandBelow | It is at the bottom of this page. | revision 1 plan (needs sign-off) |
| prompt / yes / no | Go to the game? / Yes, drive / Not now | `app/island-section.tsx:20-22` |
| phoneNote | It plays best on a computer, but you can try it here. | `app/island-section.tsx:21` |
| back | Back to andliu.dev | `app/island-section.tsx:221` |
| flip / next / prev | Flip / Next card / Previous card | phone deck controls (UI) |
| cardOf | `Card ${n} of ${total}` | phone deck position (UI) |
| tapToFlip | Tap to flip | phone hint (needs sign-off) |
| illustration | Illustration | caption on drawn images (needs sign-off) |
| howMeasured | How this was measured | Impact source disclosure (needs sign-off) |
| showData | Show the numbers | Impact table toggle (needs sign-off) |
| motion / sound / mascot / dock | Motion / Sound in the island / The berry follows you / Dock to the side | UI switch labels (mascot needs sign-off) |
| ask | Ask about Andrew | research 3.1 |
| live / offline | Live / Offline answers | research 3.1 |
| resting | Live chat is resting; here is what I know. | research 3.5 |
| tooFast | You're asking faster than my budget allows. Try again in a minute, or email Andrew. | research 3.5 |
| resume | Résumé (PDF) | [P] |
| credits | Photographs from Unsplash | Blueberry footer pattern [S] |
| backHome | Back to andliu.dev | About footer tab (same words as `back`) |

Removed in revision 3: `play` (the header pill now names Blueberry), `visitIsland`, `tapToPlace`,
`backToIsland`, and `A11Y.minimap`.

**`APPROVALS`**: `{ microcopy: false, secondBrainShot: false }`. Flipped by Andrew only.

**Enforcement** (`scripts/check-text.mjs`, foundation; every piece runs it before returning): using
the TypeScript compiler API, walk every `.ts`/`.tsx` under `app/sections/`, `app/about/`,
`components/chat/`, `components/mascot/` and flag any string literal, template head or JSXText with
more than 3 words (skipping `className`, `style`, `d`, `viewBox`, `points`, `transform`, `sizes`,
`srcSet`, `media`, `aria-hidden`, imports). Also:

- zero U+2014 in `app/ components/ lib/ worker/ scripts/ SITE-PLAN.md`;
- zero demo strings (`21st.dev`, `cdn.21st`, `design-layer`, `Orbit Delivery`, `guglielmo`,
  `SUBLIME`, `Happy Clients`, `Hover me`, `#C3E41D`, `Lobster`, `Cormorant`, `Saira`, `Jost`,
  `Discover`, `Skiper`, `#6366f1`, `bg-orange-500`) in `app/ components/site components/chat
  components/mascot lib/`;
- zero `TODO(photo)`, `minimap`, `data-zone`, `data-island-zone`, `visitIsland`, `zoneName` in
  `app/ components/ lib/`;
- no reference to `/images/island/` or `/media/island/` outside `app/sections/island*` (A1);
- the `co-founder` rule above; the string `The garden` nowhere in `lib/site.ts`;
- the glyph-portal MIT notice present;
- every `IMAGES` file that exists is at least its declared width; every `PORTRAITS` entry with a
  `src` exists on disk;
- `lib/impact.json` and `IMPACT` have the same series ids, and every series has a non-empty
  `source`;
- `worker/system-prompt.txt` equals what `scripts/build-system-prompt.mjs` generates.

### 2.5 Blueberry's own patterns, ported (foundation owns each port)

| Pattern | Exact source in `grignard/grignard-app-source/src/` | Ported to | Used by |
|---|---|---|---|
| Ledge press | `index.css` `.bb-press`, `.bb-press-soft` (about lines 1383 to 1417) | `globals.css` `.press`, `.press-soft` in Stage tokens | every pill and square button |
| Button sizing | `components/ui/button.tsx` (44px default height) | `.pill` min-height 44px | all pills |
| Toggle | `Switch` in `components/EntryGate.tsx` (`role="switch"`, `aria-checked`, `bb-press-soft`) | `components/site/switch.tsx` | menu, chat |
| Card | `components/ui/card.tsx` | `components/site/card.tsx` with a `notch` prop | spreads, experience rows, footer |
| Marquee | `components/ui/marquee.tsx` plus `index.css` `bb-marquee-x` | `components/site/marquee.tsx` | footer card |
| The berry | `components/ui/blueberry-mark.tsx` plus `index.css` `.bb-eyes[data-mood]` rules | `components/mascot/berry.tsx` (mascot piece), flat | the mascot |
| The phone's screen | `index.css` `:root` tokens (`--background #f6f4ef`, `--card #fff`, `--foreground #1e293b`, `--ring #5a3fd8`), the primary ink `#472ab4`, brand `#1d4ed8` to `#3b82f6`, Inter and Fraunces (`@fontsource-variable`), `rounded-xl` cards, `.bb-press` | `cinematic-landing-hero.css`, scoped to `.bbphone` (blueberry piece) | the phone |

### 2.6 Images: every file, with its source and owner

Stock is allowed only as sky or atmosphere. Every image of his world is his own: a real screen of
his work, a drawn illustration in the Blueberry or /andliu style, or (later) a photo of him. Island
imagery appears only inside `#island`.

| File | Source | Produced by | Used by |
|---|---|---|---|
| `images/photo/berry-wet.webp` (exists) | Blueberry `public/backgrounds/` (Unsplash) | exists | dive field |
| `images/photo/cut-berry-cluster-a.webp` (exists) | Blueberry `public/backgrounds/` | exists | manifesto left edge |
| `images/photo/sky-cloud-sea.webp` (exists) | Unsplash `photo-1444090542259-0af8fa96557e` | exists | off-the-clock cover sky |
| `images/photo/credits.json` (exists) | `{ file, unsplashId, credit, creditUrl }` | capture fills credits | island end strip credit line |
| `images/work/blueberry-home.webp` (1600 + `-800`) | `https://andliu7.github.io/blueberry/` | capture | hero ticket thumb, Blueberry screens, work index |
| `images/work/blueberry-path.webp` | `.../#/app/pathway` | capture | Blueberry screens |
| `images/work/blueberry-lesson.webp` | `.../#/lessons` | capture | Blueberry screens, phone lesson layer fallback |
| `images/work/mechanism-trainer.webp` | `.../#/app/trainer`; if gated or blank, `Projects/mechanism_trainer/dist/index.html` served locally | capture | work spread 03, index |
| `images/work/focus-family-guide.webp` | `Projects/ff_technical_instructions/repo2/index.html` served locally | capture | work spread 05, index |
| `images/work/second-brain.webp` | `Projects/second-brain/rounds/P2b/crit3/grid-1440.png`, **only after Andrew approves** (2.7) | capture copies to `_ref/pending/` only | spread 02 when `APPROVALS.secondBrainShot` |
| `media/island/s3-{1280,2560,3840}.webp` | island S3 still, 3/4 overview at golden hour | capture | `#island` only: poster and phone / reduced-motion media |
| `images/contours.svg` (exists) | hand-authored | foundation | fixed texture layer, portrait placeholder |
| `images/photo/bb-grignard-start.svg` (exists) | Blueberry `grignard-app-source/public/reactions/grignard-addition-ketone-start-light.svg` @ 4a07a3c | foundation | hero stub ticket thumbnail, menu Work preview (Blueberry art, not island imagery) |
| `images/me/*.webp` | Andrew's photos, later | Andrew | portraits (2.8) |
| `images/landscape.webp`, `images/blueberry.jpg`, `images/island-still.jpg` (exist) | superseded | `blueberry.jpg`: deleted by the blueberry piece; `island-still.jpg`: deleted by the island piece; `landscape.webp`: predates, named by integration, kept | none |

Drawn illustrations (inline SVG in the owning section, captioned `MICROCOPY.illustration` where
they could be mistaken for a screenshot):

- **Second Brain, until the screenshot is approved** (projects piece): "memories as dots", one dot
  per saved memory, placed by date on a timeline and coloured by kind, drawn from `lib/impact.json`.
  A real picture of real data, no private text.
- **Chemistry Explainer Animation Pipeline** (projects piece): one SVG reaction frame in the
  Blueberry style (a Grignard reagent's curved arrow onto a carbonyl carbon, three frames offset in
  depth like a film strip), because the project renders SVG frames in code. Captioned
  `Illustration`; no local source exists (a search of `Projects/` for its code finds none).
- **Off the clock notes** (offclock piece): placeholder art for the three portrait notes until
  photos exist: a pan with rising steam, a barbell plate, a window with morning light. Flat, Stage
  tokens, 2px ink strokes.

### 2.7 The Second Brain screenshot

`second-brain/rounds/P2b/crit3/grid-1440.png` comes from Andrew's personal OS. **Andrew checks it
himself**, by eye. Until he sets `APPROVALS.secondBrainShot = true`, it is never copied into
`public/`: capture copies it to `_ref/pending/second-brain-grid-1440.png`, and spread 02 shows the
"memories as dots" illustration.

### 2.8 Portraits (A11)

`PORTRAITS` in `lib/site.ts`, one list:

```ts
export const PORTRAITS = {
  hero:     { src: null, cutout: null, w: 1200, h: 1500, alt: 'Andrew Liu' },
  about:    { src: null, cutout: null, w: 1200, h: 1500, alt: 'Andrew Liu' },
  cooking:  { src: null, cutout: null, w: 1200, h: 1200, alt: 'Andrew cooking', art: 'pan' },
  lifting:  { src: null, cutout: null, w: 1200, h: 1200, alt: 'Andrew lifting', art: 'plate' },
  faith:    { src: null, cutout: null, w: 1200, h: 1200, alt: 'A quiet morning', art: 'window' },
} as const;
```

To add a photo Andrew drops `public/images/me/hero.webp` (and optionally `hero-cutout.webp`, a
transparent PNG/WebP of just him) and sets `src` (and `cutout`). Nothing else changes. The README
(integration) says this in three lines.

---

## 3. Type and colour

### 3.1 Type (Fira Code + Antic inside the Stage dialect)

Andrew's rule overrides the Stage fonts (Anton, Karla, JetBrains Mono). Exactly two families on the
site's own surfaces. **One flagged exception:** the Blueberry phone's screen is Blueberry's voice, so
it uses Blueberry's own Inter and Fraunces (A5), loaded only in the phone's lazy chunk from
`@fontsource-variable/inter/wght.css` and `@fontsource-variable/fraunces/wght.css` (the same
imports Blueberry's `index.css` uses; latin subset only).

| Role | Face | Weight | Size | Line height / tracking |
|---|---|---|---|---|
| Hero name | Fira Code | 700 | `min(300px, calc(100cqi / (var(--chars) * .58)))`, `--chars: 6` | .82 / -0.04em |
| Section display (`FlipHeading`) | Fira Code | 700 | `.fit`: `min(var(--max, 200px), calc(100cqi / (var(--chars) * .58)))` | .84 / -0.04em |
| Work index titles | Fira Code | 700 | `clamp(34px, 6cqi, 88px)` | .9 / -0.03em |
| Row and card titles | Fira Code | 600 | `clamp(24px, 3.6cqi, 52px)` | .9 / -0.03em |
| Keyword voice | Antic | 400 | 1.08x the line it sits in | 1 / -0.01em, mixed case |
| Scramble and `currently:` | Fira Code | 500 | lead size | 1.45 / 0 |
| Eyebrows, captions, chart axes | Fira Code | 500 | 12px (11px for caps captions) | 1.5 / .12em, uppercase (axes not uppercase) |
| Pills, buttons | Fira Code | 600 | 14px (17px big) | 1 / .04em, uppercase |
| Body | Antic | 400 | 18px desktop, 17px mobile | 1.55 |
| Lead | Antic | 400 | `clamp(20px, 1.9cqi, 26px)` | 1.45 |
| Chart titles and tooltips | Antic | 400 | 16px / 14px | 1.4 |
| Chat | Antic | 400 | 16px | 1.5 |

- **Why `.fit`:** Fira Code is monospaced (0.6em advance), so a line's width follows from its
  character count; `cqi` makes it the column's width.
- Display text and eyebrows set `font-variant-ligatures: none`.
- Antic has one weight; no fake bold, no fake italic. Emphasis is colour or a Fira Code 500 span.
- `next/font/google` in `layout.tsx` (on disk): Fira Code 500/600/700 as `--font-fira`, Antic 400 as
  `--font-antic`, `display: 'swap'`.
- Tokens: `--display: var(--font-fira), ui-monospace, Consolas, monospace;` `--body:
  var(--font-antic), "Segoe UI", system-ui, sans-serif;` `--mono: var(--display);`.
- glyph-portal reads `--font-fira` and awaits `document.fonts.load('700 100px ' + family)`.

### 3.2 Colour tokens

Stage tokens unchanged, plus ground roles. Never a new hex where a token exists (the phone's
Blueberry tokens are scoped to `.bbphone` and are Blueberry's, not new).

```
--paper #f4efe6  --card #fbf8f1  --ink #12142b  --ink-2 #3b3a4f  --muted #5b5a6e
--berry #3b4f9e  --berry-press #2c3a8f  --berry-deep #1d2654  --berry-soft #c9d1f4
--apricot #ffcf98  --apricot-deep #e98a5a (decoration only)  --line #d9d0bf  --sky #bfe3f0
--tile-* as in tokens.css (tiles carry INK text; violet carries paper)  --ledge #0000002e
```

Ground roles (on disk in `globals.css`, plus the two highlight roles):

```
[data-ground="paper"]      { --ground: var(--paper);      --on: var(--ink);   --on-2: var(--ink-2);      --kw: var(--berry);   --ring: var(--berry); }
[data-ground="apricot"]    { --ground: var(--apricot);    --on: var(--ink);   --on-2: var(--berry-deep); --kw: var(--berry);   --ring: var(--berry); }
[data-ground="berry"]      { --ground: var(--berry);      --on: var(--paper); --on-2: var(--berry-soft); --kw: var(--apricot); --ring: var(--apricot); }
[data-ground="berry-deep"] { --ground: var(--berry-deep); --on: var(--paper); --on-2: var(--berry-soft); --kw: var(--apricot); --ring: var(--apricot); }
[data-ground="ink"]        { --ground: var(--ink);        --on: var(--paper); --on-2: var(--berry-soft); --kw: var(--apricot); --ring: var(--apricot); }
[data-ground] { --hl-bar: var(--kw); --hl-on: var(--ground); }
```

Measured pairs (WCAG 2.x), flat; text over imagery is measured on captures by integration:

| Text on ground | Ratio |
|---|---|
| ink on paper / ink-2 on paper / muted on paper / berry on paper | 15.80 / 9.63 / 5.85 / 6.55 |
| ink on apricot / berry-deep on apricot / berry on apricot | 12.61 / 10.04 / 5.23 |
| paper on berry / apricot on berry / berry-soft on berry | 6.55 / 5.23 / 4.97 (16px and up) |
| paper on berry-deep / apricot on berry-deep / berry-soft on berry-deep | 12.58 / 10.04 / 9.54 |
| paper on ink / apricot on ink / berry-soft on ink | 15.80 / 12.61 / 11.98 |
| ink on card (charts, phone labels) | 15.4 |
| NEVER: paper on a tile fill except violet; apricot-deep as text or ring; apricot on paper (2.22) |

**Chart palette** (Impact, on `--card`): series 1 `--berry` #3b4f9e, series 2 `--tile-teal`
#2f9e8f, series 3 `--tile-pink` #d6689a, series 4 `--ink-2` #3b3a4f; gridlines `--line`; axis text
`--muted` (5.85 on paper-like card). The impact piece runs the dataviz skill's validator on this
set against `--card` and replaces any mark under 3:1 with the next token that passes; it records the
measured ratios in a comment.

Focus ring: `3px solid var(--ring)`, 2px offset, on every ground.

Dark mode: the landing is a designed light curve and does not re-theme. About and the chat panel
honour `prefers-color-scheme: dark` with the skill's deep purple block (`#1E1238` surfaces, white
text).

---

## 4. The sections

Each lists: what it says, components, imagery, layout, beats, mobile (390x844), reduced motion, and
acceptance. Heights follow 1.1.

### 4.0 Loader (foundation, on disk)

- At most **900ms**: berry-deep ground, the berry drops (300ms), the count runs 0 to 100 in Fira
  Code 700 apricot (to 600ms), then a `clip-path` wipe up (300ms, `--ease-wipe`).
- Skipped (BOOT sets `html[data-loader="skip"]` before first paint) when the URL has a hash,
  `sessionStorage` says seen (try/catch; a throw means show it), or JS is off (the loader is added by
  BOOT). Reduced motion: a 120ms fade instead.
- The `<h1>` is visible in the server HTML; the loader is an overlay, so the h1 is the LCP element.
- Accept: removed by 900ms after `DOMContentLoaded`; never shown on a second load or on `/#island`;
  LCP under 2.5s on a throttled mobile profile with the loader running.

### 4.1 Hero `#top`, ground `paper`, gradient `paper-apricot` (1.00)

- **Says:** his name, that he is a person with a face and a sense of humour, what he is now (two
  facts), and what he is building right now. No game.
- **Components:** portfolio-hero (Fira / Antic pairing and BlurText only; none of its header, menu,
  theme toggle, monogram, lime or `html.dark`), mouse-responsive-background (as the portrait's
  pointer driver), `Portrait id="hero"`, the scramble and `CURRENTLY` (custom, in the hero piece),
  the NOW BUILDING ticket (`components/site/card.tsx`).
- **Imagery:** the portrait slot only (placeholder until his photo), plus the ticket thumbnail
  `work/blueberry-home-800.webp`. Paper ground, the contours texture, and the `paper-apricot` radial
  so the bottom of the hero is already warm when the apricot manifesto arrives.
- **Layout, desktop:** left column 56%: eyebrow "Future dentist, current builder." [Z clinic];
  `ANDREW` over `LIU` (LIU in `--kw`); the identity line `CS and pre-dental at UMD.
  ${BLUEBERRY_ROLE} of Blueberry.` in lead size; under it the `currently:` line (Fira 500, the label
  in `--on-2`, the rotating fact in `--on`); then the ticket (300x132, `--card`, 1px `--line`,
  ledge: eyebrow NOW BUILDING, 112x70 thumbnail, "Blueberry" Fira 600, `TICKET.line` (built from
  `BLUEBERRY_TITLE`, "Aug 2026 to now") in 14px Antic, arrow "Visit Blueberry"; the whole card is one
  `<a>`). Right column 38%: the portrait, 4:5, 28px radius, from 14svh to 84svh, slightly rotated
  (-2deg) like a print on the table. The name never overlaps the portrait.
- **Beats:**
  1. Loader wipe (or none). ANDREW then LIU arrive letter by letter: BlurText (45ms stagger, 0.9s)
     plus each letter rising 0.3em from below a mask. Hidden start only under `html.js:not(.is-loaded)`.
  2. The identity line **scrambles in**: each character cycles through Fira glyphs
     (`!<>-_\/[]{}=+*^?#`) for 6 to 14 frames and settles left to right over 700ms (one rAF loop,
     a `textContent` write per frame on an `aria-hidden` span; the real sentence is in an `sr-only`
     span from the start). Then the portrait drops in (scale 1.04 to 1, rotate -4 to -2deg, 600ms
     spring), then the ticket slides up 24px (about 1.6s).
  3. `currently:` rotates every 3.2s: the old fact rolls up out of a one-line mask and the next rolls
     in (rolling-list's `translateY(-50%)` mechanic, 500ms). Pauses on hover, on focus within, and
     when the hero is off screen; `aria-live="off"` (the four facts are also in an `sr-only` list).
  4. **The name answers the pointer** (fine pointer only): each letter within 180px of the pointer
     lifts up to `-0.08em` and tilts up to 6deg toward it, scaled by distance; the nearest letter
     takes `--kw` (LIU's nearest takes `--on`, so the swap is always visible). One `gsap.quickTo`
     pair per letter, letter centres cached and refreshed on resize. On touch, tapping a letter
     makes it hop (spring, 400ms). The h1's text is never changed.
  5. The portrait tilts with the pointer (`TiltFrame`, max 6deg) and its layers part (back 0,
     middle 0.5, front 1).
  6. Scroll out (scrub over the hero's height): the name lifts 6svh, the portrait drifts up 10svh
     and straightens to 0deg, and the apricot manifesto rises on a convex curved edge.
- **Mobile:** eyebrow, name (about 100px), identity line, `currently:` (wraps to two lines, mask
  height adapts), then a row: the portrait at 42% width (4:5) beside the ticket stacked compactly,
  all in 844px. No name lean; tap-hop only.
- **Reduced motion:** everything at rest and visible, no scramble (the sentence is plain), the
  first `currently` fact shown with the others listed beneath it in `--on-2`, no lean, no tilt.
- **Accept:** screenshots at 1s, 3s, 5s at 1440x900 and 390x844 show "ANDREW", "LIU", "CS and
  pre-dental at UMD", "Blueberry", the portrait frame and the header; the h1 text equals "Andrew Liu"
  to the accessibility tree; no game, iframe, `three` or island image in the hero chunk or DOM;
  the ticket goes to `BLUEBERRY.live`; the scramble leaves the visible text exactly equal to the
  identity line; at 390 no horizontal scroll; the `currently` loop stops when the hero leaves the
  viewport (no rAF or timer firing).

### 4.2 Manifesto and fork `#manifesto`, ground `apricot` (0.90)

- **Says:** his thesis, once, then the two halves of him and where each leads.
- **Components:** `TwoVoice` with the swash, `Highlight` on the three keywords, `FlipHeading` for
  the two `THE CLOCK` heads, `FlipLink` arrows.
- **Imagery:** left edge `photo/cut-berry-cluster-a.webp` (160px, bleeding off). The right-edge
  island yard window is removed (A1); nothing replaces it.
- **Layout:** eyebrow "B.S. Computer Science, Pre-Dental Track, UMD. Expected May 2027." [R]; the
  manifesto, centred, up to 84px: `I BUILD TOOLS THAT MAKE *complicated* IDEAS EASIER TO
  *understand*, FOR PEOPLE I ACTUALLY *know*.` [P]. Then Lando's split: left block right-aligned
  `on` (Antic) over `THE CLOCK` with `forkCounts` and a berry square arrow to `#work`; right block
  `off` over `THE CLOCK` with "Cooking, lifting, and faith." and an arrow to `#offclock`.
- **Beats:** words start at 22% opacity and light to 100% as you scroll (scrub, `top 75%` to
  `center 45%`); each keyword's apricot-deep swash draws (`stroke-dashoffset`, .7s) when it lights,
  and from then on it is a `Highlight` (the bar rises on hover). The fork heads rise
  (`data-reveal="lines"`); the berry cluster slides in 30% from the left.
- **Mobile:** manifesto at 34px; the fork stacks (on, then off), left-aligned; the berry cluster is
  a 96px corner accent.
- **Reduced motion:** all words lit, swashes drawn, no slides.
- **Accept:** the thesis is one `<h2>` with the full sentence for screen readers; counts render from
  data; both arrows are 44px links; no island image, no "garden"; 390 clean; at most 0.90 viewports.

### 4.3 Into Blueberry `#dive`, ground `berry` (2.00, pin 1 of 3)

- **Says:** Blueberry is the thing he is building now, and you are going inside it.
- **Component:** glyph-portal (MIT notice kept verbatim). `word="BLUEBERRY"` in Fira Code 700,
  `focusChar="B"`, field `--berry` with `photo/berry-wet.webp`, `scrollLength={1}` on every width,
  annotations off, `enterLabel` = `MICROCOPY.skipInto`. `children` = the chapter head: eyebrow
  `01 / ${BLUEBERRY_TITLE} / Aug 2026 to now`, `FlipHeading` `ORGANIC CHEMISTRY THAT *actually
  sticks.*` [S], the sell line [S], pills "Visit Blueberry" (berry, `.press`) and "Source". No island
  link.
- **Beats:** the word sits huge; hovering a letter (arrow keys, or the select on touch) picks it;
  one viewport of scroll dives through the counter of B with a 4 degree bank, the berry photo fills
  the frame, the clip drops, the chapter head is there and its heading lines rise out of their mask.
- **Fonts:** mount only after `document.fonts.load` of the resolved Fira family.
- **Mobile:** same, built-in select, `scrollLength` 1. **Reduced motion:** the static poster with
  content in flow.
- **Accept:** the skip link moves focus into the chapter head; no WebGL context; End, PageDown and
  anchors pass straight through; at most 2.00 viewports; the pin uses `svh`.

### 4.4 The Blueberry chapter `#blueberry`, ground `berry`, gradient `berry-deep` (3.60 floor, pin 2 of 3 at 768px and up)

- **Says:** what Blueberry is, layer by layer, that it is real and live, and that you can use it
  right here.
- **Components:** **cinematic-landing-hero, rebuilt in place as the exploded phone** (its phone
  shell, tabs and scoped CSS are kept; its pin timeline is replaced by the stage below). A counter
  and a screens strip.
- **The phone (A4, A5).** A DOM object, centred, 340x700 at 1440 (`min(340px, 26cqi)` wide,
  aspect 0.486), built from five planes, front to back, each an absolutely positioned layer in one
  `transform-style: preserve-3d` stack:
  1. `glass`: a clear plane with a soft diagonal sheen and the 1px bezel highlight. It holds the
     **live deck UI** (it is the screen you touch): Blueberry's screen chrome (cream `#f6f4ef`,
     white `rounded-xl` card, slate-800 text, Fraunces title, Inter body, the primary ink `#472ab4`
     for `<strong>`, the brand blue gradient on the progress bar, `.bb-press` buttons).
  2. `deck`: two more cards stacked behind the live one (the next cards' backs), offset 6px each,
     so the deck reads as a deck when exploded.
  3. `lesson`: a Blueberry lesson screen (from `images/work/blueberry-lesson-800.webp`, or drawn in
     Blueberry tokens if the capture is not yet on disk), dimmed to 80%.
  4. `rdkit`: a drawn layer: a small molecule in Blueberry's SVG style (a carbonyl with an R group)
     with a bond-electron matrix grid behind it (a 6x6 grid of digits in Inter 11px), and a green
     check, at 70% opacity. It is the picture of what the grader checks.
  5. `frame`: the phone body: a rounded rectangle in `--ink` with a 10px bezel and the camera pill,
     plus the Learn / Practice / Review tabs along its bottom that deep link to `#/lessons`,
     `#/app/trainer`, `#/study-decks` on the live site.
- **The deck.** `scripts/bb-deck.mjs` (blueberry piece) transpiles
  `grignard-app-source/src/data/decks/grignard.ts` (the original deck: "the reason this site
  exists", a fact from its own comment) with `ts.transpileModule`, imports it, keeps the plain Q/A
  cards (no `mc`, no `image`), converts the answer HTML to a safe subset (`<strong>` only, every
  class dropped), converts `$...$` chemistry (`CaCl_2` to CaCl<sub>2</sub>, `^\circ` to the degree
  sign, `\delta^-` to the delta sign with a superscript minus, `\pi` to pi; a card containing any
  other TeX is skipped), takes the first 12 that pass, and writes `lib/bb-deck.json` `{ title,
  deckId, count, source: 'grignard/grignard-app-source/src/data/decks/grignard.ts @ <git short
  hash>', cards: [{ q, a }] }`. The phone renders answer HTML with `dangerouslySetInnerHTML` only
  after a whitelist sanitiser in the same file (tags other than `strong`, `sub`, `sup` are
  stripped). Interaction: click, tap, Space or Enter flips (a 3D `rotateY(180deg)` card flip,
  420ms); ArrowRight / ArrowLeft or a horizontal swipe (pointer events, 40px threshold) moves to the
  next or previous card; `Card n of 12` under it (`aria-live="polite"`); visible Flip, Previous,
  Next buttons (44px) under the screen for anyone without a keyboard or a swipe. The deck region is
  a `role="group"` labelled by the deck title. Flipping emits `mascot:mood` `curious`.
- **The stage, 768px and up** (sticky, `top: 0; height: 100svh`, track 2.6 viewports, scrubbed
  progress `p`):
  - `p` 0 to 0.12: the phone is centred, assembled, facing you at `rotateX(8deg) rotateY(-12deg)`,
    and turns to flat. Left of the phone, the [P] story paragraph set as lead text ("What began as
    flashcards for classmates is becoming an organic chemistry learning platform. I lead product
    direction and learning design for a five-person team, ..."), rising by line. No new heading
    here: the chapter's heading is the dive's, one viewport above.
  - `p` 0.12 to 0.45: **it comes apart.** The stack rotates to `rotateX(18deg) rotateY(-32deg)`
    and the planes separate along Z: glass `+180px`, deck `+90px`, lesson `0`, rdkit `-90px`, frame
    `-180px` (at 1440; scaled by `--phone-scale`). Each plane's label appears beside it as it
    settles: a 1px `--on-2` leader line draws from the plane's edge to the label (SVG
    `stroke-dashoffset`), and the label text rises out of its mask, alternating right and left of
    the phone. Labels are `PHONE_LAYERS`, with the layer name in Fira 600 caps 12px over the fact in
    Antic 17px.
  - `p` 0.45 to 0.72: hold, exploded. The pointer tilt is strongest here.
  - `p` 0.72 to 0.92: it reassembles (labels fade first, then the planes close up with a slight
    overshoot, `--ease-spring`), back to flat and facing you.
  - `p` 0.92 to 1: the hint `Tap to flip` blinks once under the screen; the sticky frame releases.
  - **Pointer tilt** at all `p` (fine pointer): the whole stack adds up to 10deg of `rotateY` and
    7deg of `rotateX` toward the pointer, via `--tx` / `--ty` written by one rAF on pointermove
    (`gsap.quickTo` on two CSS variables, 0.5s); the scroll rotation and the tilt compose in one
    `transform` string. Hovering the phone emits `mascot:peek` with its centre.
  - The deck is interactive at every `p`; flipping while exploded flips the card on the glass plane.
- **Then (no pin):**
  - **Facts (about 0.4):** four numbers counting up once on enter (0.9s): `5` people on the team
    [R], `19` slides in the investor deck [R], `100` founding seats [S], and `${deck count}` cards
    in his first deck [B] (replaces the résumé's "4 packages", which disk now contradicts: there are
    6 under `packages/`; Impact shows the measured count). The stack as tags under them.
  - **Screens (about 0.6):** the three captures (`blueberry-home`, `-path`, `-lesson`) in a row,
    each a `TiltFrame` (screenshot layer depth 0.6 over a ground-coloured card layer at 0), captions
    in 11px caps that are the literal routes, each linking to its route. They rise in with a 3deg
    rotation that settles to 0 (rolling-list's image reveal).
- **Mobile (below 768):** no pin. The phone (260px wide) sits in normal flow, centred; the explode
  is scrubbed over the phone's own pass through the viewport (`start: "top 75%"`, `end: "bottom
  25%"`) at half depth (Z offsets x0.5, rotation x0.5) and the five labels are a numbered list under
  the phone whose items highlight as their plane separates. Swipe on the screen changes cards;
  vertical swipes scroll the page (the handler only claims a gesture whose horizontal travel exceeds
  its vertical travel, `touch-action: pan-y` on the screen). Facts 2x2; screens become a horizontal
  scroll-snap row inside its own `overflow-x: auto` box, 80% card width.
- **Reduced motion:** no stage pin, no explode, no tilt. The phone is assembled and flat; the five
  labels are a numbered list beside it (below it on mobile); the deck still flips (instantly,
  showing the answer face without rotation); facts show final numbers; screens static.
- **Accept:** the phone renders without three.js or WebGL (no `canvas` in `#blueberry`); 12 deck
  cards come from `lib/bb-deck.json` and every `q` is present verbatim in `grignard.ts`; Space,
  Enter, arrows, the buttons and a swipe all work and `Card n of 12` updates; the sanitiser strips a
  `<script>` and an `onerror=` in its unit test (`node --test app/sections/blueberry.test.mjs`); every
  `PHONE_LAYERS` label is in the inventory or derived from `bb-deck.json`; Inter and Fraunces load
  only after the phone's chunk loads (not in the landing's initial requests); the stage releases at
  the end and on End, PageDown, Tab and anchor jumps; no long frame over 50ms while exploding at 1440
  and 390 (transforms only, `will-change: transform` only while the stage is active); the section is
  at least 3.60 viewports at 1440; `public/images/blueberry.jpg` is deleted if nothing references
  it.

### 4.5 Projects `#work`, ground `berry-deep` (4.20 floor, no pin)

- **Says:** he ships more than Blueberry, and each thing was for real people. The longest act.
- **Components:** rolling-list mechanics (the index), `TiltFrame` (the spreads), `FlipHeading`,
  `Highlight`, notched `Card`. No WebGL, no pin.
- **Head (0.35):** eyebrow `02 / Selected work` [P]; `FlipHeading` `SELECTED *work.*` [P].
- **The index (about 1.0)**, Lando's helmet list turned into a rolling list, six rows from
  `PROJECTS`, each a full-width link with a 1px `--line`-on-dark rule (`rgba(paper, .18)`, decorative):
  number (Fira 500), title (Fira 700, index size), kind (eyebrow, right). Row 06 is **the one island
  teaser line**: "06 The résumé island" and `islandBelow`, no image, linking to `#island`.
  - Hover or focus (row): the title rolls (rolling-list: the row's `translateY(-50%)` to the second
    copy, which is the same title in `--kw`), the kind fades out, and a 240x150 image card
    (`TiltFrame`, the project's image) appears beside the pointer: from `opacity 0, scale .95, rotate
    3deg, translateX 16px` to rest (rolling-list's reveal, 500ms), then follows the pointer
    vertically with `gsap.quickTo` (0.4s) clamped to the row's box, never covering the title (it
    sits right of the title's measured right edge, or left of the kind column). `mascot:peek` at the
    image card's centre.
  - Click, Enter: rows 01 to 05 `jumpTo` their spread (01 goes to `#blueberry`); row 06 goes to
    `#island` through the island delegate.
  - Touch: no floating image; a tap navigates.
- **Four spreads (4 x 0.72 = 2.9)**, one per project 02 to 05, alternating image left and right:
  - Image side (58%): a `TiltFrame` of three layers: back (depth 0) a rounded `--berry` slab offset
    24px down-right, the project's ledge; middle (depth 0.55) the screenshot in a minimal browser
    chrome (three dots, the real URL or repo path in Fira 500 11px); front (depth 1) a small notched
    `Card` with the project's tags, overlapping the bottom corner. Second Brain uses the "memories as
    dots" illustration in the middle layer until approved; the Chemistry pipeline uses its drawn
    reaction frames (2.6).
  - Text side (38%): the number large (Fira 700, `--kw`, 120px, outline only), `FlipHeading` with the
    title (`as="h3"`), kind eyebrow, the two inventory lines (`data-reveal="words"`), the note if
    any (Mechanism Trainer: "Now folded into Blueberry." [S]), links as `Highlight` links (Source,
    live where one exists).
  - Beats: as the spread enters, the slab slides in first, the screenshot rises 40px with a 3deg
    rotation that settles (600ms, spring), the tag card pops last (scale .9 to 1, 300ms); the text
    lines rise by line. Hovering the image emits `mascot:peek`.
  - Images: `<img>` with `srcset` 800 / 1600, `sizes="(min-width: 768px) 56vw, 92vw"`,
    `loading="lazy"`, `decoding="async"`, aspect box reserved (rolling-list's `next/image` is
    replaced by plain `<img>` in the static export).
- **Bottom (0.2):** nothing else; the ground continues into Impact.
- **Mobile:** the index without floating images (titles at `clamp(30px, 9cqi, 44px)`, kind under the
  title); spreads stack image first, flat (no tilt), tag card in flow under the image.
- **Reduced motion:** no roll (colour change instead), no floating image (the image shows inline,
  small, beside the focused row's title on desktop), spreads static, no tilt.
- **Accept:** zero `canvas` and zero WebGL contexts in `#work` at any width; no island image (only
  the teaser text line mentions it); every name, year, role and link is from `PROJECTS`; each spread
  image is at least 1280px wide or is an inline SVG illustration; the floating image never overlaps
  the hovered title's box (scripted: `getBoundingClientRect` intersection is empty at 5 pointer
  positions per row); the section is at least 4.20 viewports at 1440; rolling-list's demo items and
  21st.dev URLs are gone from `components/ui/rolling-list.tsx` (foundation adapts it, 2.2).

### 4.6 Impact `#impact`, ground `berry-deep` (1.30 cap), NEW (A8)

- **Says:** what the work measurably did, from disk and git, with every number's source one click
  away. Second Brain first.
- **Components:** an accordion (custom, in the impact piece), recharts (installed, 3.8.0) charts,
  stat tiles with count-up, `FlipHeading`, `components/ui/chart.tsx` if it fits without restyling
  shared files (otherwise recharts directly).
- **Head (0.25):** eyebrow `03 / Impact`; `FlipHeading` `MEASURED *impact.*` (needs sign-off).
- **The accordion:** one row per panel, in this order: Second Brain, Blueberry, Mechanism Trainer.
  (Focus Family Guide and the Chemistry pipeline have no git history or local source on this
  machine, so they have no panel; the island is the finale only.) Each row is a `<button
  aria-expanded aria-controls>` inside an `<h3>`: the project title (Fira 600) rolling on hover like
  the index, and the panel's one-line summary (built from `IMPACT` templates and numbers, e.g.
  "`${n}` memories saved since `${first date}`"). **Click, Enter or Space toggles** (hover never
  toggles: hover only rolls the title). Opening one closes the others; the first is open by default;
  ArrowUp / ArrowDown / Home / End move focus between row buttons. The panel's height animates with
  the `grid-template-rows: 0fr -> 1fr` technique (360ms, `--ease-out`), wrapped in
  `preserveAnchor()` so the row you clicked stays put, then `ScrollTrigger.refresh()`. Opening emits
  `mascot:mood` `cheer`.
- **A panel:** a `--card` surface (ink text), 22px radius. Left column (32%): three stat tiles
  (count up once when the panel opens, final numbers under reduced motion). Right (68%): the primary
  chart, then two small charts side by side. Under each chart, `How this was measured` as a
  `<details>` with the series `source` string (Fira 500 12px, `--muted`), and a `Show the numbers`
  toggle that reveals a real `<table>` of the same points (the accessible alternative; the table is
  also in the DOM, `sr-only`, when collapsed).
- **Series** (ids are the contract between `scripts/impact-data.mjs`, `lib/impact.json` and
  `IMPACT`; a series that cannot be derived is omitted, never estimated):

| Panel | Series id | Form | Derived from |
|---|---|---|---|
| brain | `brain.memories` | cumulative step line by date | every `## [YYYY-MM-DD] kind \|` heading in `second-brain/second-brain/memories/*.md` (dates and kinds only; titles, bodies and tags are never read into the output) |
| brain | `brain.kinds` | horizontal bars | the same headings, counted by kind (decision, pref, gotcha, fact) |
| brain | `brain.retrieval` | grouped bars: tokens per arm, correct out of n as a label | `bench/results-history-summary.json`, the "bench.py hard suite" study (BRAIN, fresh default session, Claude Code auto memory, qmd) |
| brain | `brain.latency` | bars with p90 whiskers, ms per arm | `bench/results-speed-summary.json` `arms.*.median_ms`, `p90_ms` (BRAIN, GREP, GLOB), shown honestly even where BRAIN is slower |
| brain | `brain.toRead` | bars, median tokens to read per arm (log scale, labelled) | the same file, `median_tokens_to_read` |
| brain | stats `brain.rows`, `brain.files`, `brain.wiki` | tiles | `index.tsv` header row count and distinct first-column paths (streamed, never loaded whole); `wiki/pages/*.md` count |
| brain | `brain.commits` | weekly bars | `git -C second-brain log --format=%ad --date=short` |
| blueberry | `bb.commits` | cumulative line by day | `git -C grignard/grignard-app-source log --format=%ad --date=short` |
| blueberry | `bb.content` | bars: decks, cards, lessons, reactions | decks: entries in `src/data/decks/index.ts`'s `DECKS` after transpiling (carbonyl decks expanded); cards: question count across those decks; lessons and reactions: only if a reproducible rule exists (e.g. keys of `SECTION_FAMILIES` in `lessonTopics.ts`), with the rule written into `source`; otherwise omitted |
| blueberry | stats `bb.packages`, `bb.tests`, `bb.commitsTotal` | tiles | `packages/*/package.json` count; `*.test.*` files under `src/` and `packages/` excluding `node_modules`; commit count |
| trainer | `trainer.commits` | cumulative line | `git -C mechanism_trainer log` |
| trainer | stats `trainer.commitsTotal`, `trainer.span` | tiles | commit count; first to last commit date |

- **Privacy:** `lib/impact.json` holds counts, dates, kinds and file counts only. `source` strings use
  paths relative to `Projects/` (never `C:/Users/...`). The script asserts no output string is longer
  than 200 characters and that no memory title text appears (it checks each title against the
  serialised JSON before writing).
- **`scripts/impact-data.mjs`:** Node, no dependencies beyond `typescript` (installed).
  `node scripts/impact-data.mjs` writes `lib/impact.json` `{ generated: <ISO date>, panels: [{ id,
  series: [{ id, kind: 'line' | 'bar' | 'stat', unit, points: [{ x, y, y2? }] | value, source }] }]
  }`; `--check` regenerates in memory and exits 1 if any number differs from the file (ignoring
  `generated`). Missing source repo or file: that series is omitted and a line is printed; the
  script never invents. It runs on Andrew's machine only (GitHub Pages cannot see the sibling repos);
  it is **not** part of `npm run build`.
- **Charts:** loaded by `NearViewport` (margin 100%, never unmounted; no WebGL). Recharts' keyboard
  layer on (`accessibilityLayer`), tooltips on hover and focus, legends where there are two or more
  series, gridlines `--line`, no 3D, no pie. Lines draw in once when the panel opens (recharts'
  `isAnimationActive`, 800ms; off under reduced motion). Colours: 3.2 chart palette. Every axis is
  labelled with its unit.
- **Mobile:** stat tiles 3-up in a row above the primary chart; the two small charts stack; charts at
  full width with `ResponsiveContainer`, min height 220px; tables scroll inside their own box.
- **Reduced motion:** no draw-in, no count-up, instant open and close.
- **Accept:** `node scripts/impact-data.mjs --check` passes; every rendered number equals the JSON
  (scripted against the DOM's tables); every series has a visible `source`; opening a panel by
  keyboard moves no focus and closes the others; only one panel is open at a time; no chart is
  rendered for a series missing from the JSON; axe passes on an open panel; recharts is absent from
  the landing's initial chunks; the section is at most 1.30 viewports at 1440 with the default panel
  open; `lib/impact.json` contains no `C:/` and none of the memory titles.

### 4.7 Experience `#experience`, ground `berry-deep` (1.00 cap, one screen, A10)

- **Says:** the path so far, four roles, readable in one glance.
- **Component:** timeline in its vertical mode (changed to accept N items, `items:
  TimelineItem[]`, optional `label`, numeric `sort`; its "Built using" comment stays). The timeline
  renders the one `<ol>`.
- **Data:** `JOBS` (Blueberry, Minnodi LLC on Browser Use, Education One, Kharis Campus Ministry),
  each with `when`, role, org, the [P] line. No thumbnails (the island renders are gone; a 10px tile
  dot in the role's own tile colour marks each row).
- **Layout at 1440x900 (must fit 900px, no inner scroll):** padding 72px top, 56px bottom. Left
  column 34%: eyebrow `04 / Along the way` [P], `FlipHeading` `ALONG THE *way*` [P], the
  "Résumé (PDF)" pill. Centre: **the spine**, a 2px apricot SVG wave (a gentle sine, 3 periods over
  the rows' height) running down between the columns. Right column 58%: four rows, each at most
  160px: `when` (Fira 500 13px, `--on-2`) and the dot on one line; role and org (Fira 600
  `clamp(20px, 2.2cqi, 28px)`); the line (Antic 16px, at most two lines, `max-width: 56ch`).
  Total: 72 + 4 x 160 + 3 x 24 + 56 = 840px.
- **Beats:** the wave draws down with scroll (`stroke-dashoffset` scrub, `top 70%` to `bottom 60%`);
  each row's dot pops (spring) as the wave reaches it, and its text rises by line.
- **Mobile:** one column: heading, then rows with the wave on their left edge (a straight 2px line
  under 600px); the section may exceed one screen on phones.
- **Reduced motion:** wave fully drawn, rows visible.
- **Accept:** at 1440x900 `#experience.offsetHeight <= 900` and `scrollHeight == clientHeight` for
  every descendant; exactly `JOBS.length` `<li>` in one `<ol>`; `JOBS[0].role` derives from
  `BLUEBERRY_TITLE`; no island image; no horizontal scroll at 390; the `tranlate-y` typo is fixed.

### 4.8 Off the clock `#offclock`, ground `ink` (1.15 cap)

- **Says:** cooking, lifting, faith, landscape design, and the one garden line he loves. The warmest
  notes on the site. Gardening is not a hobby (A12).
- **Component:** sakura-editorial-poster as a non-sticky 100svh cover, then three portrait notes.
- **Poster:** title `OFF THE CLOCK` in Fira Code 700 (Cormorant, Jost and Saira removed, the runtime
  font-link hook deleted); keywords `Cooking` / `Lifting` / `Faith`; headline in Antic "The rest of
  the week." [P]; footer `CS and pre-dental` / `UMD` / `Expected May 2027` [R]; no `socialHandle`;
  `<h2>`. Scene: `photo/sky-cloud-sea.webp` as sky only, foreground `null`, the copy on an opaque
  `--card` panel. Progress from the section's scroll position (`top bottom` to `bottom top`), no
  sticky track; its rAF loop stops when settled and when off screen.
- **The three notes** (A11, A12), overlapping the cover's bottom by 12svh, at varied sizes and
  offsets, each a `--card` note (ink text) with a `Portrait` (cooking, lifting, faith; placeholder
  art until photos) and a line set as a two-voice pull quote:
  1. Cooking: "A kitchen, and people at the table." [P]
  2. Lifting: "A barbell, early." [P], and under it, smaller, "Landscape design: the interest that
     keeps growing." [P]
  3. Faith: "Quietly, it is why the guides I write for my campus community matter to me as much as
     the code." [P], and under it "I love the UMD garden. Someday, a garden of my own, with spices
     on hand." [Z yard]
  Each note parallaxes at its own speed (`data-speed` -0.3 to 0.6) and tilts toward the pointer
  (`TiltFrame` on the portrait, max 4deg).
- **Mobile:** cover 100svh; notes in a staggered single column, parallax at most 30px, no tilt.
- **Reduced motion:** poster at progress 1; notes static.
- **Accept:** no stock image of a kitchen, gym, garden or book; no island image; no "garden" as a
  hobby (only the UMD line); every line comes from `OFF_CLOCK`; the poster's loop is idle off
  screen; nothing sticky; at most 1.15 viewports at 1440.

### 4.9 The footer card `#contact`, ground `ink` (0.75 cap)

Unchanged from revision 2 except as noted.

- **Says:** he is easy to reach, and the page is about to open into the island.
- One card, gutter inset, 28px radius, `--berry-deep` fill, **animated-gradient as the card's
  sky**, the notch tab hanging from its bottom centre (`NOTCH_TO_ISLAND`).
- Contents: eyebrow `06 / Say hi` [P]; `FlipHeading` `LET'S COMPARE *notes.*` [P]; four `FlipLink`s
  (GITHUB, LINKEDIN, EMAIL, RÉSUMÉ (PDF)) in Fira 700 `clamp(40px, 7cqi, 112px)` in paper, with
  `CopyEmail` beside EMAIL and the address once in Antic; two columns "PAGES" (Home, Work, Impact,
  Experience, About, Island) and "ELSEWHERE" (GitHub, LinkedIn, Résumé); the ported Blueberry marquee
  of `STACK`. Hovering EMAIL emits `mascot:mood` `shy`.
- Gradient: Stage tokens only (`#1d2654`, `#3b4f9e`, `#ffcf98` at low proportion, slow); link
  column over a `--berry-deep` scrim at 72%; DPR capped 1.5; IntersectionObserver and
  `visibilitychange` pause; reduced motion renders one frame; colours parsed once; `loseContext()`
  on unmount; a static CSS gradient underneath. `NearViewport` margin 50%, `unmountMargin` 0px.
- Beats: card rises 40px on enter; links roll on hover and focus; the marquee drifts and pauses on
  hover.
- Mobile: links 40px, full-width tap rows; columns side by side.
- Reduced motion: still gradient frame, no roll, static marquee.
- Accept: screen readers read "GitHub" once; the marquee is `aria-hidden` with the list as text;
  `NOTCH_TO_ISLAND` passes; at most 0.75 viewports; the gradient is the only WebGL context alive
  while it is mounted.
- Export for About: `FooterCard({ variant }: { variant: 'home' | 'about' })` from
  `app/sections/contact.tsx` (signature fixed by the foundation stub). On About the tab is a link
  `backHome` ("Back to andliu.dev") to `/`, not to the island.

### 4.10 The island `#island`, ground `ink` (1.85 cap, pin 3 of 3): the finale

Unchanged from revision 2 in mechanism; this is the only place the island appears.

- **Says:** every place on the island is one line of the résumé; you can drive it, if you want to.
- **Components:** hero-scrub's mechanism (tall section, sticky frame, two titles parting, a card
  growing to fill the viewport), scroll-locked-video-hero's look only (blur-out titles, blur-in
  tagline, thin progress line; never mounted as saved: no body lock, no wheel or touch
  `preventDefault`, no autoplay), and the existing island-section logic (the "Go to the game?" box,
  the overlay). Releases at the end and on keyboard and anchor navigation by construction.
- **Media:** poster `media/island/s3-{1280,2560,3840}.webp` (`srcset`, `sizes="100vw"`). Live
  preview on desktop with a fine pointer (`(pointer: fine) and (min-width: 1024px)`), not reduced
  motion, not `saveData`: at track progress 0.02 (the footer gradient has unmounted by then) mount one
  same-origin `<iframe src="/island/index.html#now" title={ISLAND.previewTitle} inert tabindex="-1">`
  under the poster with `pointer-events: none`; on load, from the parent: wait for
  `contentWindow.__island.ready`, `__island.start(false)`, inject a `<style>` hiding the HUD,
  `__island.ctx.modules.camera.setMode('god')` (`camera.js:554`; `modes.setMode` accepts only
  drive, walk, interior), and a late `__island.ctx.onUpdate(hook, 99)` that orbits the camera
  (dist 120, pitch 0.55, 60s per turn) while a parent-owned `previewing` flag is true; crossfade the
  poster out after two rendered frames (`screenshotReady()`); on any throw or after 6s keep the
  poster and unmount the iframe.
- **"Yes, drive"** takes the same iframe interactive with no reload (`previewing = false`, camera
  `follow`, style removed, `inert` and `tabindex` removed, `pointer-events: auto`, sound per the
  menu switch inside the click, then `wrapper.requestFullscreen()` inside the click). Never
  re-parent the iframe. On phones and in reduced motion "Yes, drive" creates the iframe then.
- **iOS / no element fullscreen:** the wrapper becomes a fixed overlay (`inset: 0; height: 100dvh`)
  with `freezeScroll(true)`; landscape phones supported; safe-area padding on Back only.
- **"Back to andliu.dev"** and Esc close it, unfreeze, return focus to "Yes, drive"; desktop returns
  to preview, otherwise the iframe unmounts. "Not now" leaves a small "Go to the game?" pill.
  Visitors are never forced in: no autoplay into the game, no scroll-jack, no timer.
- **Beats:** approach `a` 0 to 1: the window hangs from the footer tab and widens from `--notch-w`
  to 56% of the viewport, top corners rounding to 28px; above it `THE RÉSUMÉ`, below it `ISLAND`
  (Fira 700). Track `p` 0.02: preview mounts (desktop). `p` 0.10 to 0.55: titles part and blur out,
  the window grows to full bleed, the progress line fills. `p` 0.55 to 0.70: the tagline blurs in
  ("Every place on the island is one line of the résumé." [Z]) on an ink chip at 80%. `p` 0.75: the
  talk box slides up, "Go to the game?" typed at 40ms, "Yes, drive" / "Not now", arrows move between
  them. `p` 0.85 to 1: hold, then release into the end strip (15svh, ink): "The empty plot is for
  whatever comes next." [Z now], "© 2026 Andrew Liu", the credits line. Nothing after it.
- **Delegate** (`island.client.tsx`): every `a[href="#island"]` click (menu, footer, the work index
  row 06) is intercepted and `jumpTo` lands at track progress 0.78 (the box showing). There are no
  zone deep links on the site any more; the game always opens at `#now`.
- `island:active` and `html[data-island="active"]` while the track is active or the overlay open.
- **Mobile:** same window and box; media is the 1280 still with a gentle descent; `svh` / `dvh`.
- **Reduced motion:** no pin, no scrub; window full width, tagline visible, box opens at 40% in view.
- **Accept** (scripted by integration): at 390 and 1440, at `p` 0.9 nothing overlaps "Yes, drive" or
  "Not now"; the finale media is at least the viewport's device-pixel width (live iframe or
  `currentSrc` natural width, up to 3840); no island JS or `three` requested before `p` 0.02 on
  desktop or before "Yes, drive" elsewhere; "Yes, drive" from the preview fires no second `load`; the
  iPhone overlay is a fixed 100dvh layer, `body` frozen only while open, landscape 844x390 works;
  closing leaves zero iframes on phones; Space, PageDown, End, arrows, Tab, find-in-page, header
  anchors and Lenis all move past the end and back; `island/` has no changes;
  `app/island-section.tsx` and `images/island-still.jpg` are deleted once nothing references them.

---

## 5. About page (`/about`)

Static route, its own HTML. Ground paper with the `paper-apricot` gradient; honours dark mode with
the skill's block.

1. **Header.** `Portrait id="about"` on the right (4:5, `TiltFrame` driven by
   mouse-responsive-background's pointer logic, typed, fine pointer only; behind the frame, never
   behind text, a `paper-berry` gradient disc as the back layer); left `FlipHeading` `ABOUT
   *andrew.*`; eyebrow "Frederick, MD. College Park, MD." [R]; the `currently:` line, static (first
   fact).
2. **about-us-section** (`motion` from `motion/react`, this route only, inside `<MotionConfig
   reducedMotion="user">`). All interior-design copy goes.
   - Heading: "Computer science and the pre-dental track keep asking the same question: how does a
     hard idea become something someone else can use?" [Z clinic].
   - Six things he does, three each side, from `ABOUT.things` [R][P].
   - Centre image: the flat berry, `Berry` from `components/mascot/berry.tsx` (a static SVG
     component with no motion import; the mascot piece builds it in batch 4, About is batch 5) at
     200px with `mood="happy"`, on an apricot disc. No caption, no stranger's photo, no island
     render.
   - Stats, count-up: `2,000+` Browser Use users, `200+` contributors using his guides, `25+`
     students mentored, `5` on the Blueberry team [R].
   - Fixes: content visible on the server render (`whileInView`, `once: true`, the html.js gate), no
     infinite floats under reduced motion, the `#88734C` eyebrow replaced by berry. No CTA bar.
3. **Education and skills**, plain and scannable: UMD, B.S. Computer Science, Pre-Dental Track,
   expected May 2027; coursework; certifications; `SKILLS` groups. GPA not shown.
4. **Off the clock and faith:** the `OFF_CLOCK` lines with the three note portraits (cooking,
   lifting, faith; placeholder art until photos), no island tiles.
5. Footer: `FooterCard variant="about"`.

Accept: the About chunk is the only one importing `motion` besides the mascot's lazy chunk; zero
WebGL; every claim traces to the inventory; 390 clean; no stock image and no island image;
`check-text.mjs` passes on `app/about/`.

---

## 6. Nav, menu and the chatbot

### 6.1 Header and menu (foundation)

Fixed, 16px from the top, gutter wide; every control on an opaque surface with the ledge. No
minimap, no island anything in the header.

- **Left:** the two-voice wordmark, "Andrew" Antic 22px over "LIU" Fira 700 26px, `var(--on)`;
  links to `/#top` via `jumpTo` (on About, `/`). On hover it flips like a `FlipHeading` (small).
- **Centre (720px and up):** the section label, an opaque pill (`--card`, ink text, ledge) showing
  the current section's `label` from `SECTIONS` (e.g. "Work"), Fira 600 13px caps. When
  `data-section` changes, the old label rolls up and the new one rolls in (rolling-list mechanic,
  400ms); empty sections (`top`, `manifesto`) hide the pill (scale .9, opacity 0). It is not a link
  and not focusable; `aria-hidden` (the landmarks already say where you are).
- **Right:** the berry pill **"Visit Blueberry"** (`BLUEBERRY.live`, new tab, arrow icon), the
  thing he is building, where Lando has STORE; then the 44px square menu button with two offset bars.
- **Menu:** full-screen `berry-deep` overlay of `FlipLink`s in Fira 700 `clamp(44px, 9cqi, 120px)`:
  WORK, IMPACT, EXPERIENCE, ABOUT, CONTACT, ISLAND; small links GitHub, LinkedIn, Résumé, "Ask about
  Andrew" (dispatches the chat open); three Blueberry switches: "Motion" (toggles
  `html[data-motion="reduced"]`), "Sound in the island", "The berry follows you" (toggles
  `html[data-mascot="off"]`; disabled with its reason as `aria-describedby` when there is no fine
  pointer). Each stored in `localStorage` under try/catch. Focus trapped, Esc closes and returns
  focus, `freezeScroll(true)` while open. Far targets go through `jumpTo`.
- **Mobile (390):** wordmark 18/20px, the Visit Blueberry pill 44px tall with a short label (the same
  words, 13px), menu 44px. No centre label. Skip link first in the DOM.
- **Accept:** no `.minimap` in the DOM or CSS; the label matches the section under the 55% line at
  10 scroll positions; every header control has an opaque background (sampled pixel behind = its
  own fill); 390 fits without overlap.

### 6.2 The chat dock (chat piece)

Unchanged from revision 2:

- **Launcher:** fixed bottom-right, safe-area aware, 56px berry pill with a blueberry glyph and "Ask"
  (44px circle on mobile); hidden under `html[data-island="active"]`. The panel is
  `next/dynamic(() => import('./chat-panel'), { ssr: false })`, prefetched on launcher hover or focus.
- **Panel, 1100px and up:** overlays the right edge (380px, full height under the header),
  `role="complementary"` labelled "Ask about Andrew". "Dock to the side" docks it via
  `preserveAnchor(() => set html[data-chat="docked"])`; foundation CSS gives `main`
  `padding-right: 380px`. On `island:active` the panel undocks and closes.
- **Below 1100:** a full-height sheet, `role="dialog"`, `aria-modal`, `freezeScroll(true)`, focus
  trapped, Esc closes and returns focus.
- Surface: berry-deep with a static CSS sky gradient (no WebGL), paper text; user bubbles berry,
  assistant bubbles `--card` with ink; Antic 16px. Header: "Ask about Andrew", the Live / Offline
  switch (Live disabled without an endpoint), close 44px. Four chips from `CHAT_SUGGESTIONS`.
  Textarea, 1000-char cap and counter; Enter sends, Shift+Enter newline; `aria-live="polite"`.

### 6.3 The god's-eye zoom-out

The island drone pulls the camera up to the god preset with a halftone wipe; the web version:

- `document.startViewTransition(() => flushSync(() => setOpen(true)))`. Why not `transform` on
  `<main>`: a transformed ancestor breaks `position: sticky` and the gsap pins.
- `::view-transition-old(root)`: scale 1 to 0.86 with `perspective(1200px) rotateX(8deg)`,
  `transform-origin: 50% 0`, 450ms `--ease-out` (the camera rising and looking down).
- `::view-transition-new(root)`: revealed through a halftone mask growing from the launcher's corner
  (radial-gradient dots at 14px, `mask-size` 0 to 28px, plus a radial clip), 520ms.
- The panel has `view-transition-name: chat` and slides in from the right, 320ms `--ease-spring`.
- `chat:open` fires at the same moment (the mascot turns to read, 7). Closing runs the reverse.
- No `startViewTransition`: no snapshot; the panel slides in while a fixed `pointer-events: none`
  halftone overlay sweeps from the launcher over 400ms. Feature-detected.
- Reduced motion: a 150ms opacity fade. Docking is never a view transition.

### 6.4 Data path and fallback

Unchanged from revision 2: `NEXT_PUBLIC_CHAT_URL` at build time (empty means offline only); the
client sends `{ messages }`; `components/chat/sse.ts` exports a pure `parseSSE(chunk, state)`
(text deltas from `content_block_delta` / `text_delta`, `done` on `message_stop`, `error` on an
`error` event including the Worker's own shape); the panel appends with `setMessages(prev => ...)`;
`components/chat/fallback.ts` is the keyword router built only from `lib/site.ts`, triggered by no
URL, a network error, a non-200, an `error` event, `rate_limited` (the `tooFast` line) or no first
token within 8s, with `resting` shown once. Tests: `node --experimental-strip-types --test
components/chat/` against recorded fixtures (a normal stream, a split line, an `error` event, the
429 event); the router test covers the four chips and five other questions. React patterns named:
`useRef` for the `AbortController`, effect cleanup, the updater form, `next/dynamic` with
`ssr: false`, `flushSync` inside the transition.

### 6.5 The Worker (`worker/`, not deployed by this workflow)

Unchanged from revision 2:

- `worker/chat.js`: origin allow-list (`https://andliu.dev`, `https://www.andliu.dev`,
  `http://localhost:3000` commented as dev only); `OPTIONS` preflight with the same list (echoed
  origin, `POST, OPTIONS`, `content-type`, `Max-Age: 86400`), disallowed origin 403 with no CORS
  headers; a request without `Origin` is rejected; per-IP rate limit (`CHAT_LIMIT`, 10 per minute);
  input caps (12 turns, 1000 chars, alternating roles ending on user); `max_tokens: 400`; model from
  `env.MODEL`; system prompt server-side; SSE piped through; every failure after the origin check is
  a 200 SSE `event: error` with `{ type: 'error', error: { type: 'rate_limited' | 'bad_request' |
  'upstream', message } }`; the key is `env.ANTHROPIC_API_KEY`, a Worker secret, never in a file.
- `worker/prompt-header.txt` (hand written: role, tone, no phone number, GPA only if asked, refuse
  off-topic politely; Blueberry title only via the generated part) and `worker/system-prompt.txt`
  (generated from `lib/site.ts`).
- `worker/wrangler.toml`: name `andliu-chat`, `main = "chat.js"`, `[vars] MODEL` (the current Haiku
  id, confirmed with the claude-api skill, with the date checked), the ratelimits block, a Text rule
  for `.txt`, deploy steps as comments (`npx wrangler secret put ANTHROPIC_API_KEY`, `npx wrangler
  deploy`, set a monthly spend limit first).
- `worker/chat.test.mjs`: `node --test` with fake `fetch` and limiter: preflight allowed and denied,
  missing Origin, oversized input, 429, upstream failure.

---

## 7. The mascot (A9, new)

- **Says:** Blueberry's berry came along; the work has play in it.
- **Art:** `components/mascot/berry.tsx`, a port of Blueberry's `blueberry-mark.tsx` geometry
  (64x64 viewBox: body circle r23, the five-petal calyx squashed to 0.62, eyes, kind arcs, smile,
  blush) redrawn **flat** in /andliu tokens: body `--berry`, a crescent shade in `--berry-deep` at
  the lower right, calyx `--berry-deep`, a shine ellipse in `--paper` at 30%, eyes `--ink` with
  paper glints, blush `--tile-pink` at 50%. 40px rendered. The `[data-mood]` CSS rules are ported
  from `index.css` (moods: rest, curious, happy, cheer, shy, sleepy, reading), scoped under
  `.mascot`. It exports `Berry({ mood, size, title })`, a plain SVG component with no `motion`
  import, so About can render it statically.
- **Motion:** `components/mascot/mascot.tsx` adapts `SpringMouseFollow` from
  `mouse-follow-animations.tsx` (mascot piece adapts that file in place: the demo `Skiper61` and the
  `SimpleMouseFollow` demo removed, `SpringMouseFollow` turned into a hook-friendly export) to the
  whole window: a `position: fixed; pointer-events: none; z-index` above content and below the
  header, menu, chat and island overlay. Target = pointer + (28px, 28px), springs `{ mass: .1,
  damping: 10, stiffness: 131 }` (the saved values), so it lags and overshoots a little. It leans
  (rotate up to 12deg) in the direction of travel.
- **Never covers text:** every 120ms (not every frame) it checks
  `document.elementsFromPoint(target)` for a text-bearing element (`p, h1-h6, li, a, button, label,
  td, th, figcaption, [data-text]`) or the phone, a chart, the chat panel or the island window; if
  hit, it tries the three other corners around the pointer (`-28/+28` combinations) and takes the
  first clear one; if none is clear it shrinks to 0.6 and fades to 0.35. Hidden entirely over the
  island window, the game overlay, and inside the chat panel.
- **Behaviour:** blinks (eyes `scaleY` to 0.1 for 120ms) at random 2.5 to 6s intervals; after 8s
  idle it goes `sleepy`, after 20s it settles where it is and closes its eyes; any movement wakes it
  with `happy` for 600ms. On `mascot:peek` it turns (eye offset 2px) toward the point and goes
  `curious`; on `mascot:mood` it plays that mood for `ms` (default 1200) and on `cheer` it hops
  (y -14px, spring). On `chat:open` it flies to the panel's left edge (outside the panel) and goes
  `reading` until `chat:close`. On `island:active` it hides.
- **Loading:** `components/mascot/mascot-slot.tsx` (foundation writes the stub; the mascot piece
  replaces it) mounts nothing on the server; on the client it waits for `requestIdleCallback`
  (fallback 1200ms), checks fine pointer, not reduced motion, not `html[data-mascot="off"]`, then
  `React.lazy` imports `mascot.tsx` (the only landing chunk with `motion/react`). Toggling the menu
  switch off unmounts it.
- **Accept:** no mascot DOM and no `motion` request at 390 (coarse pointer), under reduced motion, or
  with the switch off; `pointer-events: none`; at 1440 a scripted pointer sweep over every heading,
  paragraph and link in each section finds zero frames where the mascot's box intersects the
  hovered text element's box (sampled every 120ms after the spring settles); the island and chat
  rules hold; the berry's art has no gradient (flat) and uses only Stage tokens.

---

## 8. Mobile (390x844 is the floor)

- No horizontal scroll: integration measures `scrollWidth <= 390` with `body { overflow-x: clip }`
  removed.
- Pins on phones: the dive and the island only. The phone stage and the work index have no pin.
- Display type uses `.fit` in `cqi`; nothing fixed above 72px except the hero name.
- No pointer effects on touch (name lean, tilt, floating images, mascot); taps do only what they
  say (flip a card, hop a letter, follow a link).
- 44px targets everywhere; header controls opaque; chat a full sheet; landscape phones supported.
- Images: `srcset` 800 / 1600; the island 1280 still.

---

## 9. Performance budget

| Item | Budget | Checked by |
|---|---|---|
| Landing initial JS (entry + layout + page chunks, gzip) | 190 KB | build output |
| `three`, `@react-three`, `recharts`, `motion/react` in landing initial chunks | absent (`recharts` only in the Impact chunk, `motion` only in the mascot and About chunks, `three` only inside the island iframe) | grep of `dist/client` initial chunks |
| Live WebGL contexts on the landing | **at most 1 at every step**; 0 before `#contact` (dive, phone, work, impact and experience have none) | instrumented `getContext` |
| WebGL on About | 0 | same |
| Long frames | none over 50ms during the glyph dive or the phone explode, at 390 and 1440 | performance trace |
| CLS | under 0.05 across the scroll, including every NearViewport swap and the default Impact panel | `PerformanceObserver('layout-shift')` |
| LCP | under 2.5s, throttled mobile, loader running | Lighthouse |
| Fonts | Fira Code and Antic site-wide (2 families, 4 files); Inter and Fraunces (latin, variable) only after the phone chunk loads | network log |
| Hero images | ticket thumb under 40 KB; portrait (when Andrew adds it) 1200px WebP under 180 KB | build |
| Work images | WebP q=75, 1600 and 800 widths, lazy, `decoding="async"` | capture output |
| Island S3 still | 3840 under 650 KB, 2560 under 380 KB, 1280 under 140 KB | capture output |
| `lib/impact.json`, `lib/bb-deck.json` | under 40 KB and 20 KB | `check-text.mjs` |
| Off-screen work | no rAF loop, timer or WebGL render for an off-screen component (`currently` rotation, scramble, sakura, gradient, mascot idle timers pause on `visibilitychange`) | each component gates on IntersectionObserver and `visibilitychange` |

Lazy rules: glyph-portal, the phone (with its fonts and deck JSON), the Impact charts, timeline with
SplitText, sakura, animated-gradient, hero-scrub, the island preview, the chat panel and the mascot
mount through `NearViewport`, idle time or a click. Only the WebGL one (the gradient) and the island
iframe unmount when far.

**Machine safety for every builder:** never launch a browser unless your brief says you are the one
allowed (capture and integration only); kill your Chrome and any static server (`python -m
http.server`, `npx serve`) before returning and confirm with a process check; never search the whole
disk; only foundation, capture and integration run `npm run build` (parallel builds fight over
`dist/`); everyone else verifies with `npx tsc --noEmit`, `node scripts/check-text.mjs` and their
own `node --test` files.

---

## 10. Acceptance: the whole page (integration runs every one)

1. `npm run build` passes; `dist/client/index.html` and the About HTML exist; `npx tsc --noEmit`
   clean; `npx oxlint` clean on new files.
2. `node scripts/check-text.mjs` passes (2.4 list).
3. `node --experimental-strip-types --test components/chat/`, `node --test worker/`, `node --test
   app/sections/` (the phone sanitiser) and `node scripts/impact-data.mjs --check` pass.
4. **Budget:** at 1440x900 the `section[id]` heights match 1.1 (total at most 16,200px;
   `#blueberry` + `#work` + `#impact` at least 48%; `#experience` at most 900px).
5. **Light curve:** every `section[id]` has `data-ground` and `data-gradient` equal to 1.2; flat
   ground luminance is non-increasing.
6. **The island stays in the finale:** no `img`, `source`, `iframe` or CSS `url()` referencing
   `/images/island/`, `/media/island/` or `/island/` outside `#island` in the rendered DOM; no
   `.minimap`; no `data-zone`; the only visible text mentioning the island before `#island` is the
   work index row 06 and the menu / footer nav entry.
7. **First five seconds:** the 1s / 3s / 5s screenshots at 1440 and 390 (4.1).
8. **Jumps:** from the top, clicking the menu's ISLAND lands with the island box visible within 1s,
   and zero WebGL contexts are created on the way.
9. **Scroll traps**, reduced motion on and off, chat open and closed: `End` reaches the bottom;
   `Home` returns; Space and PageDown 50 times reach the island box; each header and menu anchor
   lands on its target; `window.find("Blueberry")` scrolls to a match; fail if `body` ever has
   computed `position: fixed` outside the game overlay, the mobile chat sheet and the open menu.
10. **WebGL contexts:** wrap `getContext`; scroll top to bottom and back in 200px steps at 390 and
    1440; at most 1 live at every step, 0 before `#contact`.
11. **Long frames:** none over 50ms while `#dive` or the phone stage is in view.
12. **CLS** under 0.05 across the same scroll.
13. **Contrast over imagery:** sample pixels behind every text node at the worst frame (the footer
    links at the gradient's most apricot frame, the off-clock copy panel, the island tagline over the
    preview and the still, phone labels over the exploded planes, the Highlight bar on each ground);
    fail under 4.5 (3.0 at 24px and up). Plus `axe-core` on every section and on an open Impact panel.
14. **Interactions:** each `FlipHeading` rolls on hover and on focus and is reachable by Tab; the
    phone deck flips by Space, Enter, click and the button and changes card by arrows and buttons;
    the Impact accordion opens by click, Enter and Space only (a hover never changes
    `aria-expanded`), one panel at a time; the mascot check in 7.
15. **Chat docking:** with chat opened, docked, undocked and closed at 1100, 1280 and 1440, the
    section under the viewport centre is the same before and after each step; no overflow while
    docked.
16. **Finale:** the island checks in 4.10; **hand-off** `NOTCH_TO_ISLAND` (1.5).
17. 390: no horizontal scroll, every display line fits, header controls opaque.
18. Keyboard: tab order sane, ring visible on every ground, Esc closes menu, chat and game.
19. `island/` unchanged (`git status --short island/` shows nothing new); nothing committed or
    pushed.
20. **Blind comparison, the last gate.** Capture the site at the same scroll fractions as
    `_ref/lando` (desktop 01 to 10 at 1440x900, mobile 01 to 06 at 390x844), loader skipped. Hand
    both sets, unlabelled and shuffled per pair, to a separate critic agent ("which site better
    conveys who this person is, what they build, and is more memorable"), one verdict per pair plus
    the overall. Loop on losing sections until every pair wins or ties. Kill Chrome and the static
    server after each capture and confirm with a process check.

---

## 11. The build split

Pieces own disjoint files. A piece may read anything and import shared primitives, but writes only
what it owns. A builder who needs a change in a file they do not own reports it instead (copy goes
through `lib/site.ts`, which only foundation writes).

| Batch | Piece | Owns |
|---|---|---|
| 1 | foundation | `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/motion.tsx`, `app/smooth.ts`, `app/copy-email.tsx`, `lib/site.ts`, `components/site/*`, `components/ui/flip-links.tsx`, `rolling-list.tsx`, `hover-link-animation.tsx`, `gradient-backgrounds.tsx`, `package.json` + lock, `scripts/check-text.mjs`, `public/images/contours.svg`, `public/images/photo/*` (except the credit fill), `public/images/me/.gitkeep`, all ten section stubs, the About stub, the chat stub, the mascot slot stub |
| 2 | capture | `scripts/capture.mjs`, `public/images/work/*`, `public/media/island/*`, `credits.json` credit fill, `_ref/pending/*` (the one piece in batches 1 to 6 allowed one headless Chrome) |
| 2 | chat | `components/chat/*`, `worker/*`, `scripts/build-system-prompt.mjs` |
| 2 | impact | `scripts/impact-data.mjs`, `lib/impact.json`, `app/sections/impact*`, `components/ui/chart.tsx` |
| 3 | hero | `app/sections/hero*`, `components/ui/portfolio-hero.tsx`, `components/ui/mouse-responsive-background.tsx` |
| 3 | blueberry | `app/sections/blueberry*`, `components/ui/cinematic-landing-hero.tsx` + `.css`, `scripts/bb-deck.mjs`, `lib/bb-deck.json`, delete `public/images/blueberry.jpg` |
| 3 | projects | `app/sections/projects*` |
| 4 | dive-manifesto | `app/sections/dive*`, `app/sections/manifesto*`, `components/ui/glyph-portal.tsx` |
| 4 | experience | `app/sections/experience*`, `components/ui/timeline.tsx` |
| 4 | mascot | `components/mascot/*` (replacing the slot stub), `components/ui/mouse-follow-animations.tsx` |
| 5 | offclock | `app/sections/offclock*`, `components/ui/sakura-editorial-poster.tsx` |
| 5 | contact | `app/sections/contact*`, `components/ui/animated-gradient.tsx` |
| 5 | about | `app/about/*`, `components/ui/about-us-section.tsx` |
| 6 | island | `app/sections/island*`, `components/ui/hero-scrub.tsx`, `components/ui/scroll-locked-video-hero.tsx`, delete `app/island-section.tsx` and `public/images/island-still.jpg` |
| 7 | integration | `README.md`, `../PORTFOLIO.md`, `scripts/verify/*`, orphan cleanup, the checks in 10, the blind comparison loop (one headless Chrome at a time) |

Left in place and named, owned by nobody: `components/ui/morph-gallery.tsx` (cut),
`components/ui/orbit-delivery-hero.tsx`, `components/ui/cinematic-hero-demo.tsx`,
`components/world/`, `public/images/landscape.webp`.

Open questions for Andrew (the build proceeds with the stated defaults; integration lists them):

1. Sign off `MICROCOPY` (2.4), the `CURRENTLY` lines, the `IMPACT` labels and the headings marked
   "needs sign-off".
2. Look at `_ref/pending/second-brain-grid-1440.png` for private entries before it ships (2.7).
   Default: the "memories as dots" illustration.
3. Photos of himself: drop them in `public/images/me/` and set `PORTRAITS` (2.8).
4. `BLUEBERRY_TITLE`: DECIDED "Founder and product lead". The
   résumé PDF and `island/src/data/zones.js` say Co-Founder and are outside this build.
5. The résumé's "4 packages" vs 6 on disk: the site shows the disk count in Impact and drops the
   résumé number from the Blueberry facts. Update the résumé?
6. Second Brain: the Impact panel measures the memory and retrieval system in
   `second-brain/second-brain`; the [Z brain] card describes the five-tool app. Is `dashboard/`
   part of "Second Brain" too (its git history would add a commits series)? Default: no.
7. Gmail only in public (default), or the terpmail address too. GPA: chatbot only if asked
   (default). Worker hostname: `chat.andliu.dev` or a `*.workers.dev` URL.
