// Every word the site shows, in one file. Sections import from here and never inline copy
// (scripts/check-text.mjs enforces it). SITE-PLAN.md 2.4 is the contract for this file.
//
// Source tags, one per string, in a trailing comment:
//   [Z <id>]  island/src/data/zones.js, that zone (a source only; zone names are never shown)
//   [P]       the previous app/page.tsx
//   [R]       public/andrew-liu-resume.pdf
//   [S]       grignard/grignard-app-source/src/data/site.ts (Blueberry's own copy)
//   [B]       a real card from Blueberry's decks, via lib/bb-deck.json
//   [D]       a number derived from disk and git by scripts/impact-data.mjs (lib/impact.json)
//   [plan]    a structural value from SITE-PLAN.md (ids, budgets, paths), not visitor copy
//   [UI]      a label from the MICROCOPY table, which Andrew signs off (APPROVALS.microcopy)
//
// This file has no imports on purpose: scripts/build-system-prompt.mjs transpiles it on its own
// and builds the chatbot's system prompt from it, so it must stand alone.

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

export const EMAIL = 'zeus.andrewliu@gmail.com'; // [P][R][Z contact]
export const GITHUB = 'https://github.com/andliu7'; // [P][R][S][Z]
export const LINKEDIN = 'https://www.linkedin.com/in/andrew-liu-06154225b/'; // [P][S]
export const RESUME = '/andrew-liu-resume.pdf'; // [P][Z contact]

const BB_LIVE = 'https://andliu7.github.io/blueberry/'; // [P][S][Z blueberry]
export const BLUEBERRY = {
  live: BB_LIVE,
  source: 'https://github.com/andliu7/blueberry', // [P][S][Z blueberry]
  routes: {
    app: `${BB_LIVE}#/app`, // [S] TRAINER_URL
    pathway: `${BB_LIVE}#/app/pathway`, // [S] the game's own routes live under #/app
    trainer: `${BB_LIVE}#/app/trainer`, // [plan 2.6]
    lessons: `${BB_LIVE}#/lessons`, // [P]
    decks: `${BB_LIVE}#/study-decks`, // [P]
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Andrew's title at Blueberry (plan A13). This line is the ONLY place the words appear: change
// it here and the hero, the ticket, the chapter eyebrow, the work index, the experience row and
// the chatbot all follow. scripts/check-text.mjs fails if the title is typed anywhere else.
// ---------------------------------------------------------------------------------------------

export const BLUEBERRY_TITLE = 'Founder and product lead'; // [P]

/** The part before " and ", for the short identity line. */
export const BLUEBERRY_ROLE = BLUEBERRY_TITLE.split(' and ')[0]; // derived

/** "word word and word" to "Word Word and Word", capitalising after a hyphen too. */
function titleCase(text: string): string {
  return text.split(' ').map(word => (
    word === 'and' ? word : word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-')
  )).join(' ');
}

// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------

export const IDENTITY = {
  name: 'Andrew Liu', // [P][R]
  first: 'ANDREW', // [P]
  last: 'LIU', // [P]
  degree: 'B.S. Computer Science, Pre-Dental Track', // [R][Z umd]
  school: 'University of Maryland, College Park', // [R]
  schoolShort: 'UMD', // [P]
  expected: 'Expected May 2027', // [R][Z umd]
  based: 'Frederick, MD', // [R]
  line: 'I build tools that make complicated ideas easier to understand, for people I actually know.', // [P]
  tagline: 'Future dentist, current builder.', // [Z clinic]
  why: 'Computer science and the pre-dental track keep asking the same question: how does a hard idea become something someone else can use?', // [Z clinic]
  short: `CS and pre-dental at UMD. ${BLUEBERRY_ROLE} of Blueberry.`, // [P][R] derived from BLUEBERRY_TITLE
} as const;

// Page metadata (layout.tsx). Built only from the identity lines above.
export const META = {
  title: 'Andrew Liu', // [P]
  description: `${IDENTITY.line} ${IDENTITY.short}`, // [P][R]
} as const;

// ---------------------------------------------------------------------------------------------
// Landing sections, in page order
// ---------------------------------------------------------------------------------------------

// 4.1 Hero
export const HERO = {
  chip: 'B.S. Computer Science, Pre-Dental Track. Expected May 2027.', // [R] Andrew's wording 2026-10-06 (B.S. instead of "Major")
  first: 'ANDREW', // [P]
  last: 'LIU', // [P]
  // His surname in Chinese, the face LIU flips to under the pointer (Andrew 2026-10-06). Simplified;
  // swap for the traditional '劉' here if he prefers (the hero's font link loads both).
  lastZh: '刘', // [Andrew 2026-10-06 via lead]
  // The four cartoon objects around the name, each a link to its project (labels are PROJECTS titles)
  objects: {
    pencil: { label: 'Focus Family Guide', href: '#work-guide' }, // [P] PROJECTS guide
    laptop: { label: 'Second Brain', href: '#work-brain' }, // [R] PROJECTS brain
    phone: { label: 'Blueberry', href: '#blueberry' }, // [P] PROJECTS blueberry, the game lives inside it
    card: { label: 'Flashcards', href: '#work-flashcards' }, // [R] PROJECTS flashcards
  },
} as const;

// 4.1 The hero's tilted marquee bar: short true facts, one line each (needs Andrew's sign-off)
export const HERO_BAR = [
  `${IDENTITY.degree}, ${IDENTITY.schoolShort}. ${IDENTITY.expected}.`, // [R] derived from IDENTITY
  IDENTITY.line, // [P]
  `${BLUEBERRY_ROLE} of Blueberry, a team of four`, // [R] four per Andrew 2026-10-06
  'Browser Use docs used by 200+ contributors', // [R] Minnodi line
  'SAT students up 100 to 300 points', // [R] Education One line
  'Mentoring 25+ students at Kharis', // [R] Kharis line
  'RDKit.js grading in the browser', // [R] Blueberry highlights
] as const;

// 4.1 The caution tape crossing the bar: "CAUTION" then a dry warning (Andrew 2026-10-06: "CAUTION
// [INSERT WARNING HERE] ... be a little creative"). The tape sets text in caps; `code: true`
// keeps a line's own case, because it is code. All [UI], signed off by Andrew 2026-10-06.
export const HERO_CAUTION = {
  word: 'CAUTION', // [UI] signed off 2026-10-06
  warnings: [
    { text: 'RECRUITERS, PROCEED WITH CAUTION: MAY CAUSE INTERVIEWS' }, // [UI] signed off 2026-10-06
    { text: '// TODO: SCHEDULE THE INTERVIEW' }, // [UI] signed off 2026-10-06
    { text: 'WARNING: MERGES CLEANLY' }, // [UI] signed off 2026-10-06
    { text: 'try { interview(andrew) } catch { /* unreachable */ }', code: true }, // [UI] signed off 2026-10-06
    { text: 'WRITES TESTS BEFORE BEING ASKED' }, // [UI] signed off 2026-10-06; the tape's CAUTION box supplies the "CAUTION:" so it is not doubled
  ],
} as const;

// 4.1 The rotating "currently:" line (prefix MICROCOPY.currently). Assembled from inventory
// phrases; needs Andrew's sign-off (plan 2.4).
export const CURRENTLY = [
  'building Blueberry with a team of four', // [R] team size corrected by Andrew 2026-10-06 (the PDF still says five)
  'CS and pre-dental at UMD, expected May 2027', // [R]
  'leading Focus Family at Kharis Campus Ministry', // [R]
  'keeping one home for notes, food, workouts and goals', // [Z now]
] as const;

// 4.1 The NOW BUILDING ticket (eyebrow is MICROCOPY.nowBuilding, the arrow MICROCOPY.visitBlueberry)
// `role` and `when` are the two halves of `line`, set on their own lines in the card so the
// dates never break apart; `line` is the same words as one sentence.
const TICKET_WHEN = 'Aug 2026 to now'; // [P]
export const TICKET = {
  title: 'Blueberry', // [P]
  role: BLUEBERRY_TITLE, // [P] derived from BLUEBERRY_TITLE
  when: TICKET_WHEN, // [P]
  line: `${BLUEBERRY_TITLE}, ${TICKET_WHEN}`, // [P] derived from BLUEBERRY_TITLE
  href: BB_LIVE, // [P]
  thumb: 'bbHome', // IMAGES key (its 800px variant), once capture has produced it
} as const;

// 4.2 The manifesto band was removed 2026-10-06 (Andrew: "remove the orange page and go directly
// into the from flashcards to a platform page"); its sentence still runs in the hero's marquee.

// 4.2 The ON / OFF fork. The on-side line is MICROCOPY.forkCounts (derived from the data).
export const FORK = {
  on: { voice: 'on', head: 'THE CLOCK', href: '#work', cta: 'See the work' }, // [P][Z yard] "Off the Clock" pairs with "on"; cta [UI] (needs sign-off)
  off: {
    voice: 'off', // [Z yard]
    head: 'THE CLOCK', // [Z yard]
    line: 'Cooking, lifting, and faith.', // [plan 2.4] the OFF_CLOCK keywords as a line
    href: '#offclock',
    cta: 'See the rest of the week', // [UI] (needs sign-off) after OFF_CLOCK.headline [P]
  },
} as const;

// 4.4 The Blueberry chapter (the dive section before it was removed 2026-10-06 at Andrew's request)
export const BLUEBERRY_CHAPTER = {
  eyebrow: `01 / ${BLUEBERRY_TITLE} / Aug 2026 to now`, // [P] derived from BLUEBERRY_TITLE
  headline: 'ORGANIC CHEMISTRY THAT *actually sticks.*', // [S] HERO.headline
  headlinePlain: 'Organic chemistry that actually sticks.', // [S] HERO.headline
  sell: 'Lessons that explain it properly, mechanisms you draw yourself, and flashcards that hunt down the one thing you keep getting wrong.', // [S] HERO.sell
  story: 'What began as flashcards for classmates is becoming an organic chemistry learning platform. I lead product direction and learning design for a team of four, connecting study decks, visual pathways, and mechanism practice.', // [P]
  cardHeading: 'Organic chemistry that actually sticks.', // [S] the phone's heading
  // The phone's three tabs along the frame. Labels are the saved cinematic-landing-hero's own;
  // the routes are real.
  tabs: [
    { label: 'Learn', href: `${BB_LIVE}#/lessons` }, // [P] lessons route
    { label: 'Practice', href: `${BB_LIVE}#/app/trainer` }, // [plan 4.4]
    { label: 'Review', href: `${BB_LIVE}#/study-decks` }, // [P] decks route
  ],
} as const;

// 4.4 Facts that count up. `value` absent means the blueberry piece fills it from
// lib/bb-deck.json (`count`): the résumé's "4 packages" is gone because disk now says 6, and
// Impact shows the measured count instead (plan open question 5).
export const BB_FACTS: readonly { id: string; value?: number; label: string }[] = [
  { id: 'team', value: 4, label: 'people on the team' }, // [R] corrected to four by Andrew 2026-10-06
  { id: 'deck', value: 19, label: 'slides in the investor deck' }, // [R] "Authored the 19-slide investor deck"
  { id: 'seats', value: 100, label: 'founding seats' }, // [S] FOUNDING_SEATS
  { id: 'deckCards', label: 'cards in his first deck' }, // [B] value = lib/bb-deck.json count
] as const;

// 4.4 Seven real screens, each a feature mid-use (Andrew, 2026-10-06: "the functional ones";
// 2026-10-07: "grab like 3 more images. the tetris game maybe. include a quick demo video of the
// aldol addition"). They hang as prints on a string (components/ui/polaroid-line-carousel.tsx).
// `route` is the literal route each capture was taken on; `title` is the feature's own name in
// the app; `caption` restates what the capture shows (its IMAGES alt), nothing more.
export const BB_SCREENS = [
  { image: 'bbFlashcards', title: 'Flashcards', caption: 'A card flipped to its answer, then rated Again, Hard, Good or Easy.', route: '#/app/cards', href: `${BB_LIVE}#/app/cards` }, // [S] game routes.ts tab "cards"
  { image: 'bbAldol', title: 'Aldol addition, 2 steps', caption: 'Hydroxide makes the enolate, then its carbon attacks formaldehyde: six arrows, drawn in the trainer.', route: '#/app/trainer?sequence=seq-aldol', href: `${BB_LIVE}#/app/trainer?sequence=seq-aldol` }, // [S] game demo/sequences.ts seq-aldol, recorded 2026-10-07
  { image: 'bbArrows', title: 'Mechanism trainer', caption: "A curved arrow mid-drag, pushing the allyl cation's pi bond toward the empty carbon.", route: '#/app/trainer', href: `${BB_LIVE}#/app/trainer` }, // [S] game routes.ts tab "trainer"; [R] "curved-arrow mechanism trainer"
  { image: 'bbPathway', title: 'Pathway', caption: 'Organic Chemistry II, Unit 1, as a column of lesson nodes.', route: '#/app/pathway', href: `${BB_LIVE}#/app/pathway` }, // [S]
  { image: 'bbLessonAldol', title: 'Aldol lesson', caption: 'Two acetaldehydes give 3-hydroxybutanal, with the conditions stage by stage.', route: '#/lessons/enolate/aldol-addition', href: `${BB_LIVE}#/lessons/enolate/aldol-addition` }, // [S] App.tsx route lessons/<section>/<reaction>; data/reactions.ts aldol-addition
  { image: 'bbMolecules', title: 'Draw the product', caption: 'A Grignard addition: the starting material beside a molecule editor.', route: '#/draw/grignard-addition-ketone', href: `${BB_LIVE}#/draw/grignard-addition-ketone` }, // [S] App.tsx route draw/<reaction id>
  { image: 'bbTetris', title: 'Break: Tetris', caption: 'The focus timer offers Tetris on a break, and only on a break.', route: '#/lessons', href: `${BB_LIVE}#/lessons` }, // [S] lib/featureIndex.ts "Break: Tetris and sound"; components/ui/break-room.tsx
] as const;

// The carousel's own labels (screen readers and the arrow buttons).
export const BB_CAROUSEL = {
  label: 'Blueberry screens', // [UI] (needs sign-off)
  prev: 'Previous screen', // [UI] (needs sign-off)
  next: 'Next screen', // [UI] (needs sign-off)
} as const;

// 4.4 The engineering claims, one sentence each, and the stack as tags.
export const BB_ENGINEERING = {
  claims: [
    'A custom SVG molecule renderer.', // [R]
    'A curved-arrow mechanism trainer.', // [R]
    'In-browser grading with RDKit.js on a bond-electron matrix model that structurally prevents authoring errors.', // [R]
  ],
  architecture: 'A React 19 and TypeScript monorepo split into chem-core, curriculum, validators and interaction packages, on Supabase with Google OAuth and Postgres row-level security.', // [R]
  stack: ['React 19', 'TypeScript', 'Vite', 'Tailwind v4', 'Supabase', 'Postgres RLS', 'RDKit.js'], // [R]
} as const;

// 4.4 The chapter's own head and its small section labels (the blueberry piece, style pass
// 2026-10-06). This headline tells the story's arc; the product slogan's own section was removed.
export const BB_HEAD = {
  headline: 'FROM FLASHCARDS\nTO A *platform.*', // [P] BLUEBERRY_CHAPTER.story, "What began as flashcards ... learning platform"
  screens: 'Seven real screens', // [plan 4.4] count follows BB_SCREENS (seven since 2026-10-07; needs sign-off)
  forReal: 'FOR\nREAL!', // [UI] Andrew 2026-10-07: "make a for real exclamation on the side" (needs sign-off)
  stack: 'The stack', // [UI] label over BB_ENGINEERING.stack (needs sign-off)
} as const;

// 4.9 The footer marquee
export const STACK = [
  'Python', 'TypeScript', 'React', 'Vite', 'Tailwind', 'Supabase', 'PostgreSQL', 'RDKit.js',
  'Google Apps Script', 'Claude and Gemini APIs',
] as const; // [R] skills

// ---------------------------------------------------------------------------------------------
// Projects (4.5) and roles (4.7)
// ---------------------------------------------------------------------------------------------

export type LinkKind = 'live' | 'source';
export type ProjectLink = { kind: LinkKind; href: string };

// `num` is the display number: 01 is the Blueberry chapter, 02 to 06 the spreads, 07 the one
// island teaser line. `image` is an IMAGES key, or null where the spread draws an illustration
// (Second Brain until approved, the Chemistry pipeline) or has none (the island teaser).
// `imageApproved` is the image used once APPROVALS.secondBrainShot is true.
export const PROJECTS = [
  {
    id: 'blueberry', num: '01', title: 'Blueberry', year: '2026 to now', // [P][R]
    kind: BLUEBERRY_TITLE, // [P] derived from BLUEBERRY_TITLE
    lines: [
      'Turned a flashcard tool for classmates into an AI-assisted organic chemistry learning platform, leading product and learning design for a team of four. I also wrote the 19-slide investor deck.', // [P][R][Z blueberry]
      'Custom SVG molecule renderer, a curved-arrow mechanism trainer, and in-browser grading with RDKit.js.', // [Z blueberry]
    ],
    note: null,
    tags: ['React 19', 'TypeScript', 'Vite', 'Tailwind v4', 'Supabase', 'Postgres RLS', 'RDKit.js'], // [R]
    links: [{ kind: 'live', href: BB_LIVE }, { kind: 'source', href: 'https://github.com/andliu7/blueberry' }], // [P]
    url: 'andliu7.github.io/blueberry', // [P] shown in the spread's browser chrome
    image: 'bbHome', imageApproved: null,
  },
  {
    id: 'flashcards', num: '02', title: 'Flashcards', year: null, // [R] "a flashcard tool built for classmates" (no date on disk, so none shown)
    kind: 'Where Blueberry started', // [R]
    lines: [
      'It started as a Grignard reaction deck for my classmates, and turned into a study engine for any question deck.', // [R][S] flashcard-template README
      'A hub, a title screen, four ways to read the cards, self-rating with saved progress, light and dark themes, and maths rendering.', // [S] flashcard-template README
    ],
    note: 'Now the study decks inside Blueberry.', // [P] decks route
    tags: ['React', 'TypeScript', 'Vite'], // [S]
    links: [{ kind: 'live', href: `${BB_LIVE}#/study-decks` }, { kind: 'source', href: 'https://github.com/andliu7/grignard_LCTA' }], // [P][S]
    url: 'andliu7.github.io/blueberry/#/study-decks', // [P]
    image: null, imageApproved: null,
  },
  {
    id: 'brain', num: '03', title: 'Second Brain', year: '2026', // [R][Z brain]
    kind: 'Personal operating system', // [P][Z brain]
    lines: [
      'Five tools in one app: notes, AI chat, nutrition and workout logging, goals, and a project dashboard.', // [P][Z brain]
      'A public static shell on GitHub Pages, with every private record behind Google sign-in and row-level security.', // [Z brain]
      'Voice-first logging: say a meal or a workout and it becomes a structured entry, with AI macro estimates and a cached known-foods lookup.', // [R]
    ],
    note: null,
    tags: ['React', 'TypeScript', 'Supabase', 'Postgres RLS'], // [R] (open question: [P] also says Python, AI retrieval)
    links: [{ kind: 'source', href: 'https://github.com/andliu7/second-brain' }], // [P][Z brain]
    url: 'github.com/andliu7/second-brain', // [P]
    image: null, imageApproved: 'secondBrain', // "memories as dots" illustration until approved (plan 2.7)
  },
  {
    id: 'trainer', num: '04', title: 'Mechanism Trainer', year: null, // [P]
    kind: 'Interactive chemistry', // [P]
    lines: [
      'Draw the molecule. Push the electrons. Understand the reaction.', // [P]
      'A visual practice space with a connected reaction map and structure-aware answer checking.', // [P]
    ],
    note: 'Now folded into Blueberry.', // [S] the game moved in at #/app
    tags: ['React', 'TypeScript', 'Ketcher'], // [P]
    links: [{ kind: 'live', href: `${BB_LIVE}#/app/trainer` }, { kind: 'source', href: 'https://github.com/andliu7/mechanism_trainer' }], // [P][S]
    url: 'andliu7.github.io/blueberry/#/app/trainer', // [S]
    image: 'mechanismTrainer', imageApproved: null,
  },
  {
    id: 'studio', num: '05', title: 'Chemistry Explainer Animation Pipeline', year: '2026', // [R][Z studio]
    kind: 'Python, cairosvg, ffmpeg', // [Z studio]
    lines: [
      'Renders reaction frames as SVG in code and composites them into narrated explainer videos, replacing hand-animated slides.', // [Z studio][P]
      "Wrote the specification for interactive chemistry figures in a professor's online textbook.", // [Z studio][R]
    ],
    note: null,
    tags: ['Python', 'SVG', 'ffmpeg'], // [P]
    links: [], // [P] none
    url: null,
    image: null, imageApproved: null, // shown as the pipeline diagram (STUDIO_FLOW) instead of a picture
  },
  {
    id: 'guide', num: '06', title: 'Focus Family Guide', year: null, // [P]
    kind: 'Design for community', // [P]
    lines: [
      'A practical publishing guide for the next Focus Family leaders.', // [P]
      'Turning a process passed down informally into something clear, accessible, and easy to use.', // [P]
    ],
    note: null,
    tags: ['Technical writing', 'HTML / CSS', 'Print design'], // [P]
    links: [{ kind: 'live', href: 'https://andliu7.github.io/ff_technical_instructions/' }, { kind: 'source', href: 'https://github.com/andliu7/ff_technical_instructions' }], // [P] live page added at Andrew's request 2026-10-06 (returns 200)
    url: 'andliu7.github.io/ff_technical_instructions', // [P]
    image: 'focusFamilyGuide', imageApproved: null,
  },
  {
    id: 'island', num: '07', title: 'The résumé island', year: '2026', // [inventory 2.4][Z]
    kind: 'three.js', // [inventory 2.4]
    lines: ['Every place on the island is one line of the résumé.'], // [Z]
    note: null,
    tags: ['three.js'], // [inventory 2.4]
    links: [], // it is #island on this page; the row links there (MICROCOPY.islandBelow)
    url: null,
    image: null, imageApproved: null,
  },
] as const;

// 4.5 The animation pipeline's card shows what it does as a flow of steps with tool logos
// (Andrew 2026-10-06: "more detailed on what it actually does with logos"). Every step restates
// the studio lines above and its kind (Python, cairosvg, ffmpeg); `tools` name logos in
// components/site/work/logos.tsx.
export const STUDIO_FLOW = {
  label: 'How the pipeline works', // [UI]
  steps: [
    { id: 'render', tools: ['python', 'svg'], name: 'Python', line: 'Draws each reaction frame as SVG, in code' }, // [Z studio][P]
    { id: 'raster', tools: [], name: 'cairosvg', line: 'Rasterizes the frames' }, // [Z studio] kind; Andrew 2026-10-06
    { id: 'compose', tools: ['ffmpeg'], name: 'ffmpeg', line: 'Composites the frames with narration' }, // [Z studio][P]
    { id: 'video', tools: [], name: 'Explainer video', line: 'Replaces hand-animated slides' }, // [Z studio][P]
  ],
  spec: { name: 'The spec', line: "Interactive chemistry figures for a professor's online textbook" }, // [Z studio][R]
} as const;

// `dot` names the Stage token for the role's 10px tile dot (decoration only, plan 4.7).
export const JOBS = [
  {
    id: 'blueberry', when: 'Aug 2026 to now', role: titleCase(BLUEBERRY_TITLE), org: 'Blueberry', place: 'College Park, MD', // [P][R] role derived from BLUEBERRY_TITLE
    line: 'Leading product direction and learning-science design for a team of four. Architected the React 19 and TypeScript monorepo (chem-core, curriculum, validators, interaction) on Supabase, and wrote the 19-slide investor deck.', // [P][R]
    dot: 'berry-soft', sort: 202608,
  },
  {
    id: 'minnodi', when: 'Jun to Aug 2025', role: 'AI Intern', org: 'Minnodi LLC', place: 'Frederick, MD', // [P][R]
    line: 'Built documentation and onboarding for Browser Use, an open-source AI agent platform with 2,000+ users. Guides adopted by 200+ contributors, and defects fixed across 20+ real web environments, each checked against a live agent run. Remote, async, across time zones.', // [P][R]
    dot: 'tile-teal', sort: 202506,
  },
  {
    id: 'educationone', when: 'Jun 2025 to Jan 2026', role: 'Math and Sciences Tutor', org: 'Education One', place: 'Darnestown, MD', // [P][R]
    line: 'Taught anatomy, biology, genetics, chemistry and physics. SAT students improved 100 to 300 points on data-driven practice. Automated grading, duplicate checks and billing alerts in Apps Script: about 30% better margins and $2,000+ in losses caught.', // [P][R]
    dot: 'tile-apricot', sort: 202506.5,
  },
  {
    id: 'kcm', when: 'Jan 2025 to now', role: 'Focus Family Leader', org: 'Kharis Campus Ministry', place: 'College Park, MD', // [P][R]
    line: 'The link between advisors, officers and leaders. Mentoring 25+ students, writing the guides that let other leaders run events without help, and a weekly digest email that reads the master calendar and summarizes shared folders with the Gemini API.', // [P][R]
    dot: 'tile-gold', sort: 202501,
  },
] as const;

export const WORK_HEAD = {
  eyebrow: '02 / Selected work', // [P]
  headline: 'SELECTED *work.*', // [P]
  label: 'Selected work', // [P] as headline, plain, for the Projects section's visually hidden heading
  hint: 'hover!', // [UI] Andrew 2026-10-06 ("add a little 'hover!' icon"); the sticker over the index (needs sign-off)
} as const;

export const EXPERIENCE_HEAD = {
  eyebrow: '04 / Along the way', // [P] renumbered after Impact
  headline: 'ALONG THE *way*', // [P]
  hint: 'Scroll to move through time', // [UI] from the approved timeline design (needs sign-off)
} as const;

// ---------------------------------------------------------------------------------------------
// Impact (4.6). Copy only, keyed by the series ids that scripts/impact-data.mjs writes into
// lib/impact.json. A series renders only when BOTH have it; check-text.mjs fails on a mismatch.
// Every label here needs Andrew's sign-off.
// ---------------------------------------------------------------------------------------------

export const IMPACT_HEAD = {
  eyebrow: '03 / Impact', // [plan 4.6] (needs sign-off)
  headline: 'MEASURED *impact.*', // [plan 4.6] (needs sign-off)
} as const;

/** What a panel's one-line summary is built from: its primary series' total and date range. */
export type ImpactSummary = { total: number; first: string; last: string };

export type ImpactSeriesCopy = { id: string; title: string; unit: string; caption?: string };

export const IMPACT: readonly {
  id: 'brain' | 'blueberry' | 'guide';
  title: string;
  primary: string;
  summary: (s: ImpactSummary) => string;
  series: readonly ImpactSeriesCopy[];
}[] = [
  {
    id: 'brain', title: 'Second Brain', primary: 'brain.memories', // title from PROJECTS
    summary: s => `${s.total} memories saved since ${s.first}`, // [D] (needs sign-off)
    series: [
      { id: 'brain.memories', title: 'Memories saved', unit: 'memories', caption: 'Every saved memory, counted on the day it was written.' }, // [D]
      { id: 'brain.kinds', title: 'Memories by kind', unit: 'memories', caption: 'Decisions, preferences, gotchas and facts.' }, // [D]
      { id: 'brain.retrieval', title: 'Tokens to answer, by memory system', unit: 'tokens', caption: 'The bench.py hard suite: the brain against a fresh session, Claude Code auto memory and qmd.' }, // [D]
      { id: 'brain.latency', title: 'Lookup time', unit: 'ms', caption: 'Median and p90 per lookup, the brain against grep and glob, as measured.' }, // [D]
      { id: 'brain.toRead', title: 'Tokens read per answer', unit: 'tokens', caption: 'Median tokens an agent reads to answer, on a log scale.' }, // [D]
      { id: 'brain.rows', title: 'Indexed rows', unit: 'rows' }, // [D]
      { id: 'brain.files', title: 'Files indexed', unit: 'files' }, // [D]
      { id: 'brain.wiki', title: 'Wiki pages', unit: 'pages' }, // [D]
      { id: 'brain.commits', title: 'Commits per week', unit: 'commits' }, // [D]
    ],
  },
  {
    id: 'blueberry', title: 'Blueberry', primary: 'bb.commits', // title from PROJECTS
    summary: s => `${s.total} commits since ${s.first}`, // [D] (needs sign-off)
    series: [
      { id: 'bb.commits', title: 'Commits over time', unit: 'commits' }, // [D]
      { id: 'bb.content', title: 'What is inside', unit: 'items', caption: 'Decks, cards, lessons and reactions, counted from the source.' }, // [D]
      { id: 'bb.packages', title: 'Packages', unit: 'packages' }, // [D]
      { id: 'bb.tests', title: 'Test files', unit: 'files' }, // [D]
      { id: 'bb.commitsTotal', title: 'Commits', unit: 'commits' }, // [D]
    ],
  },
  {
    id: 'guide', title: 'Focus Family Guide', primary: 'ff.commits', // title from PROJECTS; replaced the Mechanism Trainer panel 2026-10-06 at Andrew's request
    summary: s => `${s.total} commits from ${s.first} to ${s.last}`, // [D] (needs sign-off)
    series: [
      { id: 'ff.commits', title: 'Commits over time', unit: 'commits' }, // [D]
      { id: 'ff.commitsTotal', title: 'Commits', unit: 'commits' }, // [D]
      { id: 'ff.span', title: 'First to last commit', unit: 'days' }, // [D]
      { id: 'ff.words', title: 'Words in the guide', unit: 'words' }, // [D]
      { id: 'ff.sections', title: 'Sections', unit: 'sections' }, // [D]
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Off the clock (4.8). Gardening goes with cooking [Andrew 2026-10-06]: "the garden fuels the cooking."
// It replaces plan A12's old "gardening is not a hobby" rule; the garden line now sits under COOK.
// Andrew will add lines here; this is the one file he edits.
// ---------------------------------------------------------------------------------------------

const GARDEN_LINE = 'I love the UMD garden. Someday, a garden of my own, with spices on hand.'; // [Z yard]
const FAITH_LINE = 'Quietly, it is why the guides I write for my campus community matter to me as much as the code.'; // [P]

export const OFF_CLOCK = {
  eyebrow: '05 / The rest of the week', // [P][Z yard] renumbered after Impact
  title: 'OFF THE CLOCK', // [P][Z yard]
  keywords: ['Cooking', 'Lifting', 'Faith'], // [P][Z yard]
  headline: 'The rest of the week.', // [P][Z yard]
  footer: ['CS and pre-dental', 'UMD', 'Expected May 2027'], // [R][P]
  interests: [
    { word: 'Cooking', line: 'A kitchen, and people at the table.' }, // [P]
    { word: 'Lifting', line: 'A barbell, early.' }, // [P]
    { word: 'Landscape design', line: 'The interest that keeps growing.' }, // [P]
  ],
  garden: GARDEN_LINE, // [Z yard]
  faith: { word: 'Faith', line: FAITH_LINE }, // [P]
  // The three portrait notes. `voice` is the same line with its keywords in *asterisks* for the
  // two-voice pull quote; `sub` is the smaller line under it; `speed` the parallax rate.
  notes: [
    { portrait: 'cooking', word: 'Cooking', line: 'A kitchen, and people at the table.', voice: 'A *kitchen*, and people at the *table*.', sub: null, speed: -0.3 }, // [P]
    { portrait: 'lifting', word: 'Lifting', line: 'A barbell, early.', voice: 'A *barbell*, early.', sub: 'Landscape design: the interest that keeps growing.', speed: 0.6 }, // [P]
    { portrait: 'faith', word: 'Faith', line: FAITH_LINE, voice: 'Quietly, it is why the guides I write for my campus community matter to me as much as the *code*.', sub: GARDEN_LINE, speed: 0.2 }, // [P][Z yard]
  ],
  sky: 'skyCloudSea', // IMAGES key
} as const;

// The evening strip (app/sections/offclock.tsx, rebuilt 2026-10-06): Andrew's evening in the
// order he gave it ("usually I like to get work done in the morning ... after work or classes gym
// and then cook and then eat and then I lead bible studies"). No clock times on purpose: he gave
// an order, not times. `big` is the scene's display word, `voice` its line with keywords in
// *asterisks*, `sub` a smaller line or null. COOK carries the garden (it fuels the cooking,
// [Andrew 2026-10-06]) and SOMEDAY keeps landscape design. All of it needs Andrew's sign-off.
export const EVENING = {
  intro: 'Mornings are for *work*. Here is the *evening*.', // [Andrew 2026-10-06 via lead brief] (needs sign-off)
  hint: 'Scroll through the evening', // [UI] (needs sign-off)
  skip: 'Skip the evening', // [UI] Andrew 2026-10-06 asked for a way out of the strip (needs sign-off)
  slider: 'Time of evening', // [UI] the sun and moon handle's accessible name (needs sign-off)
  clock: 'THE CLOCK', // [Z yard] as FORK.on.head
  scenes: [
    { id: 'after', when: 'After work or classes', big: 'CLOCK OUT', voice: 'Work or *classes* at UMD come first.', sub: null }, // [Andrew 2026-10-06][R] (needs sign-off)
    { id: 'gym', when: 'Then the gym', big: 'GYM', voice: 'Lifting with the *UMD Barbell Club*.', sub: null }, // [Andrew 2026-10-06 via lead brief] (needs sign-off)
    { id: 'cook', when: 'Then I cook', big: 'COOK', voice: 'The *garden* fuels the *cooking*.', sub: GARDEN_LINE }, // [Andrew 2026-10-06] his words, plus the UMD garden line [Z yard] (needs sign-off)
    { id: 'eat', when: 'Then we eat', big: 'EAT', voice: 'A *kitchen*, and people at the *table*.', sub: null }, // [P] OFF_CLOCK.notes[0].voice
    { id: 'study', when: 'Then Bible study', big: 'BIBLE STUDY', voice: 'I lead *Focus Family* at Kharis Campus Ministry.', sub: FAITH_LINE }, // [R][P] (needs sign-off)
    { id: 'someday', when: 'Someday', big: 'SOMEDAY', voice: 'Landscape design: the interest that keeps *growing*.', sub: null }, // [P] the garden line moved to COOK [Andrew 2026-10-06]
  ],
  // One small framed shot from the island game per scene that has one, keyed by scene id: the
  // IMAGES key and the caption under it (Andrew 2026-10-06: "more images of the game").
  shots: {
    gym: { image: 'islandGym', caption: 'The Home Gym on my island.' }, // [Z yard] the room's own name (needs sign-off)
    cook: { image: 'islandKitchen', caption: 'The Kitchen on my island, with the pan on the stove.' }, // [Z yard] the room's own name and its pan (needs sign-off)
    eat: { image: 'islandTable', caption: 'The table in the Kitchen on my island.' }, // [Z yard] (needs sign-off)
    study: { image: 'islandFocusFamily', caption: 'Focus Family Circle, inside the chapel on my island.' }, // [Z chapel] the room's own name (needs sign-off)
    someday: { image: 'islandPlaza', caption: 'The plaza where my island starts.' }, // [Z] the spawn plaza (needs sign-off)
  },
} as const;

// ---------------------------------------------------------------------------------------------
// The footer card (4.9) and the island finale (4.10)
// ---------------------------------------------------------------------------------------------

export const CONTACT = {
  eyebrow: '06 / Say hi', // [P][Z contact]
  headline: "LET'S COMPARE *notes.*", // [P]
  links: [
    { label: 'GitHub', href: GITHUB, external: true }, // [P]
    { label: 'LinkedIn', href: LINKEDIN, external: true }, // [P]
    { label: 'Email', href: `mailto:${EMAIL}`, external: false }, // [P]
    { label: 'Résumé (PDF)', href: RESUME, external: true }, // [P]
  ],
  email: EMAIL, // [P]
  emailNote: 'Email is the fastest way to reach me.', // [Z contact]
} as const;

// The contact form in the footer card (components/site/contact-form.tsx). It only renders when
// the Worker URL is set at build time (worker/CONTACT.md). All new [UI] wording: NEEDS ANDREW'S
// SIGN-OFF. Limits match worker/contact.js.
export const CONTACT_FORM = {
  heading: 'Or write it here', // [UI] (needs sign-off)
  name: 'Your name', // [UI] (needs sign-off)
  email: 'Your email', // [UI] (needs sign-off)
  message: 'Message', // [UI] (needs sign-off)
  botcheck: 'Leave this empty', // [UI] the honeypot's label, read by bots only (needs sign-off)
  send: 'Send', // [UI] (needs sign-off)
  sending: 'Sending', // [UI] (needs sign-off)
  sent: 'Sent. It is in my inbox now.', // [UI] (needs sign-off)
  errors: {
    name: 'Add your name, up to 100 characters.', // [UI] (needs sign-off)
    email: 'That email address does not look right.', // [UI] (needs sign-off)
    messageShort: 'A few more words, please: 10 characters at least.', // [UI] (needs sign-off)
    messageLong: 'Keep it under 5000 characters.', // [UI] (needs sign-off)
    fix: 'Fix the highlighted fields, then send again.', // [UI] (needs sign-off)
    rate: 'Too many messages from here. Try again in a minute.', // [UI] (needs sign-off)
    failed: 'That did not send. Email me at the address above instead.', // [UI] (needs sign-off)
  },
} as const;

// The site footer (components/site/footer.tsx), after the footer of Andrew's Focus Family guide:
// a "skip ahead" list of the questions a visitor arrives with, each answered by a link, and a
// brand column. The questions and answers are new [UI] wording: NEEDS ANDREW'S SIGN-OFF.
// `icon` names an icon in footer.tsx; `external` opens a new tab.
export const FOOTER_SKIP = {
  heading: 'In a hurry? Skip ahead.', // [UI] after the Focus Family guide's footer (needs sign-off)
  note: 'Pick the one thing you came for.', // [UI] (needs sign-off)
  label: 'Skip ahead', // [UI] the link list's accessible name (needs sign-off)
  links: [
    { q: 'I want to see what he built.', a: 'Projects', href: '#work', icon: 'work', external: false }, // [UI] (needs sign-off)
    { q: 'Show me the numbers.', a: 'Impact', href: '#impact', icon: 'impact', external: false }, // [UI] (needs sign-off)
    { q: 'Where has he worked?', a: 'Timeline', href: '#experience', icon: 'experience', external: false }, // [UI] (needs sign-off)
    { q: 'I need his résumé.', a: 'Résumé (PDF)', href: RESUME, icon: 'resume', external: true }, // [UI][P] (needs sign-off)
    { q: 'How do I reach him?', a: 'Email', href: `mailto:${EMAIL}`, icon: 'email', external: false }, // [UI][P] (needs sign-off)
    { q: 'What does he do for fun?', a: 'Off the clock', href: '#offclock', icon: 'fun', external: false }, // [UI][P] (needs sign-off)
  ],
  blurb: IDENTITY.line, // [P]
  copyright: '© 2026 Andrew Liu', // [P] moved here from the island's end card
  social: [
    { label: 'GitHub', href: GITHUB, icon: 'github' }, // [P]
    { label: 'LinkedIn', href: LINKEDIN, icon: 'linkedin' }, // [P]
  ],
} as const;

// The AND/LIU mark (header and footer): his handle, andliu, set over two lines.
export const MARK = { top: IDENTITY.first.slice(0, 3), bottom: IDENTITY.last } as const; // [P] derived: "AND" over "LIU"

export const ISLAND = {
  eyebrow: '07 / The island', // [P] renumbered after Impact
  titleTop: 'THE RÉSUMÉ', // [inventory 2.4]
  titleBottom: 'ISLAND', // [inventory 2.4]
  tagline: 'Every place on the island is one line of the résumé.', // [Z]
  previewTitle: 'The résumé island', // [plan 4.10] iframe title in preview
  gameTitle: "Andrew Liu's island, a small driving game", // [P] app/island-section.tsx iframe title
  src: '/island/index.html', // [plan 4.10]
  poster: 'islandS3', // IMAGES key
  confirm: { question: 'Head to the island?', enter: 'Enter the island', stay: 'Stay here' }, // [UI] the poster's confirm popup, Andrew 2026-10-06 (needs sign-off)
} as const;

// ---------------------------------------------------------------------------------------------
// About (5)
// ---------------------------------------------------------------------------------------------

export const ABOUT = {
  eyebrow: 'Frederick, MD. College Park, MD.', // [R]
  title: 'ABOUT *andrew.*', // [plan 5] two voices
  heading: 'Computer science and the pre-dental track keep asking the same question: how does a hard idea become something someone else can use?', // [Z clinic]
  things: [
    { title: 'Product and learning design', line: 'Blueberry, a team of four.' }, // [R][P] four per Andrew 2026-10-06
    { title: 'Front-end engineering', line: 'React 19, TypeScript, Vite, Tailwind v4.' }, // [R]
    { title: 'Chemistry tooling', line: 'RDKit.js grading, an SVG molecule renderer, the mechanism trainer.' }, // [R][P]
    { title: 'AI workflows', line: 'Browser Use docs adopted by 200+ contributors, fixes checked against live agent runs.' }, // [R]
    { title: 'Teaching', line: 'Anatomy to physics at Education One, SAT gains of 100 to 300 points.' }, // [R]
    { title: 'Community', line: 'Focus Family at Kharis Campus Ministry, 25+ students mentored.' }, // [R]
  ],
  stats: [
    { value: 2000, suffix: '+', label: 'Browser Use users' }, // [R]
    { value: 200, suffix: '+', label: 'contributors using my guides' }, // [R]
    { value: 25, suffix: '+', label: 'students mentored' }, // [R]
    { value: 4, suffix: '', label: 'on the Blueberry team' }, // [R] four per Andrew 2026-10-06
  ],
  educationTitle: 'Education and skills', // [plan 5]
  offTitle: 'Off the clock', // [P][Z yard]
} as const;

export const EDUCATION = {
  school: 'University of Maryland, College Park', // [R]
  degree: 'B.S. Computer Science, Pre-Dental Track', // [R][Z umd]
  expected: 'Expected May 2027', // [R][Z umd]
  coursework: [
    'Machine Learning', 'Computational Genomics', 'Algorithms', 'Data Science',
    'Programming Languages', 'Computer Systems', 'Web Development',
  ], // [R][Z umd]
  courseworkLabel: 'Coursework', // [R]
  certsLabel: 'Certifications', // [R]
} as const;

// The inventory (2.6) has five groups, in inventory order.
export const SKILLS = [
  { group: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'Kotlin', 'Java', 'SQL'] }, // [R][Z skills]
  { group: 'Frameworks and tools', items: ['React', 'Vite', 'Tailwind', 'Node/Express', 'Supabase', 'PostgreSQL', 'Firebase', 'MongoDB', 'NumPy', 'Google Apps Script', 'Git', 'GitHub Actions'] }, // [R][Z skills]
  { group: 'AI engineering', items: ['Agentic coding workflows', 'LLM API integration (Claude, Gemini)', 'Prompt and spec design', 'Evaluating AI output against live runs'] }, // [R][Z skills]
  { group: 'Chemistry tooling', items: ['RDKit.js', 'A custom SVG molecule renderer', 'Ketcher', 'cairosvg/ffmpeg pipelines'] }, // [R][P]
  { group: 'Teaching and writing', items: ['STEM tutoring', 'Technical guides', 'Procedure docs', 'An investor deck'] }, // [R]
] as const;

export const CERTS = [
  { name: 'AI Fluency and Claude 101', issuer: 'Anthropic' }, // [R]
  { name: 'Career Essentials in Generative AI', issuer: 'Microsoft and LinkedIn' }, // [R]
] as const;

// ---------------------------------------------------------------------------------------------
// Chat (6.2 to 6.4). Answers from research 3.5, built only from the inventory.
// ---------------------------------------------------------------------------------------------

export const CHAT_SUGGESTIONS = [
  'What is Blueberry?', 'What has he built?', 'Why pre-dental?', 'How do I reach him?',
] as const; // [research 3.5]

export const CHAT_FALLBACK = {
  rules: [
    { intent: 'blueberryRole', keywords: ['role', 'title', 'do at', 'did at', 'investor', 'team'],
      answer: `${BLUEBERRY_TITLE} of Blueberry since Aug 2026. He turned a flashcard tool built for classmates into an AI-assisted organic chemistry learning platform, leads product and learning-science design for a team of four, wrote the 19-slide investor deck, and shipped a custom SVG molecule renderer, a curved-arrow mechanism trainer and in-browser grading with RDKit.js.` }, // [R] derived from BLUEBERRY_TITLE
    { intent: 'blueberry', keywords: ['blueberry', 'chem', 'organic', 'startup', 'founder'],
      answer: `Andrew is ${BLUEBERRY_TITLE.toLowerCase()} of Blueberry, an organic chemistry learning platform he has built since Aug 2026: lessons, a mechanism trainer where you draw the arrows, and flashcards that find your weak spots. He leads product for a team of four. Try it at andliu7.github.io/blueberry.` }, // [research 3.5][R][S] derived from BLUEBERRY_TITLE
    { intent: 'projects', keywords: ['project', 'built', 'work', 'portfolio'],
      answer: 'Blueberry (organic chemistry learning, with a pathway game and flashcards), Second Brain (a personal operating system for notes, food, workouts and goals), a Python pipeline that turns SVG reaction frames into narrated videos, and the Focus Family publishing guide. Scroll to Work for links.' }, // [research 3.5]
    { intent: 'experience', keywords: ['experience', 'job', 'intern', 'minnodi', 'browser use', 'tutor'],
      answer: `${BLUEBERRY_ROLE} of Blueberry (2026 to now); AI intern at Minnodi on Browser Use (summer 2025), whose guides were adopted by 200+ contributors; math and science tutor at Education One (2025 to 2026), where SAT students gained 100 to 300 points; Focus Family leader at UMD (2025 to now).` }, // [research 3.5] derived from BLUEBERRY_TITLE
    { intent: 'education', keywords: ['school', 'umd', 'maryland', 'major', 'degree', 'class', 'course', 'graduate'],
      answer: 'B.S. Computer Science on the pre-dental track at the University of Maryland, expected May 2027. Coursework includes machine learning, computational genomics, algorithms and data science.' }, // [research 3.5]
    { intent: 'dental', keywords: ['dent', 'pre-dental', 'teeth', 'why'],
      answer: 'Future dentist, current builder. CS and pre-dental keep asking the same question: how does a hard idea become something someone else can use?' }, // [research 3.5][Z clinic]
    { intent: 'skills', keywords: ['skill', 'stack', 'language', 'react', 'python', 'typescript', 'ai'],
      answer: 'Python, TypeScript, JavaScript, Java, Kotlin and SQL; React, Vite, Tailwind, Supabase and Postgres; plus agentic coding and Claude and Gemini API work, always checked against live runs.' }, // [research 3.5]
    { intent: 'personal', keywords: ['hobby', 'fun', 'free time', 'cook', 'lift', 'garden', 'faith'],
      answer: 'Off the clock: cooking, lifting, faith, and a growing interest in landscape design. He loves the UMD garden, and someday wants a garden of his own with spices on hand. Faith is why the guides he writes for his campus community matter to him.' }, // [P][Z yard] written under plan A12; since [Andrew 2026-10-06] gardening goes with cooking (still true as worded)
    { intent: 'island', keywords: ['island', 'game', 'play'],
      answer: 'The island at the bottom of the page is his résumé as a little world: every building is one line of it. It is opt-in, and it opens full screen when you choose to play.' }, // [research 3.5]
    { intent: 'contact', keywords: ['contact', 'email', 'hire', 'reach', 'linkedin', 'github', 'resume'],
      answer: 'Email zeus.andrewliu@gmail.com (fastest). GitHub: github.com/andliu7. The résumé PDF is in the footer.' }, // [research 3.5]
  ],
  default: "I can tell you about Andrew's projects, experience, school, skills or life off the clock. For anything else, email zeus.andrewliu@gmail.com.", // [research 3.5]
} as const;

// ---------------------------------------------------------------------------------------------
// College Park and the contents (app/sections/umd.tsx, contents.tsx), added 2026-10-06 from the
// approved Umd and Contents designs. New [UI] wording: NEEDS ANDREW'S SIGN-OFF.
// ---------------------------------------------------------------------------------------------

export const UMD = {
  chip: '01 / College Park', // [UI] from the approved design (needs sign-off)
  titleTop: 'COLLEGE', // [R] College Park, MD
  titleBottom: 'PARK, MD.', // [R]
  degree: 'B.S. Computer Science on the pre-dental track at the University of Maryland, College Park. Expected May 2027.', // [R] as CHAT_FALLBACK education
  tags: ['UMD Barbell Club', 'Focus Family at Kharis', 'The UMD garden'], // [Andrew 2026-10-06 via lead brief, as EVENING gym][R][Z yard] (needs sign-off)
  courseworkLabel: EDUCATION.courseworkLabel, // [R]
  coursework: EDUCATION.coursework.join(', '), // [R][Z umd]
  sweat: 'Make the terrapin sweat', // [Andrew 2026-10-06 via lead] the terrapin button's name (needs sign-off)
  down: 'Contents below', // [UI] from the approved design (needs sign-off)
} as const;

// The contents rows: each points at a section that exists on the page. Titles are the footer's
// skip-ahead answers and the section names; the lines under them are derived from the data.
export const CONTENTS = {
  eyebrow: '00 / Contents', // [UI] from the approved design (needs sign-off)
  title: 'WHERE TO?', // [UI] from the approved design (needs sign-off)
  note: 'You do not have to read this front to back. Pick the part you came for.', // [UI] from the approved design (needs sign-off)
  label: 'Contents', // [UI] the list's accessible name (needs sign-off)
  resumeLine: 'Or skip the tour and take the one-page version.', // [UI] the line over the contents' résumé button (needs sign-off)
  spin: 'Spin the compass', // [UI] the compass sticker's button name (needs sign-off)
  rows: [
    // The Blueberry chapter first (Andrew, 2026-10-06: "Where to?" should go into "From flashcards
    // to a platform", numbered 01 as the start of the list).
    { href: '#blueberry', title: 'From flashcards to a platform', sub: BLUEBERRY_CHAPTER.headlinePlain, meta: BLUEBERRY_TITLE }, // [P] as BB_HEAD.headline; sub and meta derived from BLUEBERRY_CHAPTER and BLUEBERRY_TITLE
    { href: '#work', title: FOOTER_SKIP.links[0].a, sub: PROJECTS.slice(0, 4).map(p => p.title).join(', '), meta: `${PROJECTS.length} projects` }, // [UI] derived from FOOTER_SKIP and PROJECTS
    { href: '#impact', title: FOOTER_SKIP.links[1].a, sub: IMPACT.map(p => p.title).join(', '), meta: `${IMPACT.length} panels` }, // [UI] derived from FOOTER_SKIP and IMPACT
    { href: '#experience', title: FOOTER_SKIP.links[2].a, sub: JOBS.map(j => j.org).join(', '), meta: `${JOBS.length} roles` }, // [UI] derived from FOOTER_SKIP and JOBS
    { href: '#offclock', title: FOOTER_SKIP.links[5].a, sub: OFF_CLOCK.headline, meta: null }, // [P] derived
    { href: '#contact', title: 'Say hi', sub: CONTACT.links.map(l => l.label).join(', '), meta: null }, // [P][Z contact] as CONTACT.eyebrow, links derived
    { href: '#island', title: 'The island', sub: ISLAND.tagline, meta: null }, // [P] as ISLAND.eyebrow, [Z] tagline
  ],
} as const;

// ---------------------------------------------------------------------------------------------
// Structure: the ten sections (plan 1.1 and 1.2), the budget, the grounds and gradients
// ---------------------------------------------------------------------------------------------

export type Ground = 'paper' | 'apricot' | 'berry' | 'berry-deep' | 'ink';
export type Gradient = 'paper-apricot' | 'berry-deep' | 'paper-berry';

// Relative luminance of each flat ground (plan 1.2). Integration asserts it never increases.
export const GROUND_LUMINANCE: Record<Ground, number> = {
  paper: 0.86, apricot: 0.68, berry: 0.09, 'berry-deep': 0.02, ink: 0.008,
}; // [plan 1.2]

// `label` is the header's centre pill (null hides it); `budget` is in viewports of the 1440x900
// reference; `kind` says whether it is a cap or a floor; `project` counts toward the project share;
// `texture` isolates the section as a stacking context (app/globals.css, section[data-texture]); the contour lines it once drew were removed 2026-10-06.
// The island has none: its root must not become a stacking context,
// or the game's full-screen overlay inside it could not rise above the header.
export const SECTIONS = [
  { id: 'top', ground: 'paper', gradient: 'paper-apricot', label: null, budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  // umd paints its own UMD red (umd.css); 'apricot' only sets ink text and a light-ground header.
  // budget 1.7 = one sticky viewport plus a 0.7 viewport runway (0 under reduced motion).
  { id: 'umd', ground: 'apricot', gradient: null, label: null, budget: 1.7, kind: 'cap', project: false, pinned: true, texture: true },
  { id: 'contents', ground: 'berry-deep', gradient: null, label: null, budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'blueberry', ground: 'berry', gradient: 'berry-deep', label: 'Blueberry', budget: 3.6, kind: 'floor', project: true, pinned: true, texture: true },
  { id: 'work', ground: 'berry-deep', gradient: null, label: 'Projects', budget: 4.2, kind: 'floor', project: true, pinned: false, texture: true },
  { id: 'impact', ground: 'berry-deep', gradient: null, label: 'Impact', budget: 1.3, kind: 'cap', project: true, pinned: false, texture: true },
  { id: 'experience', ground: 'berry-deep', gradient: null, label: 'Experience', budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'offclock', ground: 'ink', gradient: null, label: 'Off the clock', budget: 1.15, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'contact', ground: 'ink', gradient: null, label: 'Contact', budget: 0.75, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'island', ground: 'ink', gradient: null, label: 'Island', budget: 1.85, kind: 'cap', project: false, pinned: true, texture: false },
] as const satisfies readonly {
  id: string; ground: Ground; gradient: Gradient | null; label: string | null;
  budget: number; kind: 'cap' | 'floor'; project: boolean; pinned: boolean; texture: boolean;
}[]; // [plan 1.1, 1.2] labels are the section names [P] plus Impact (A8)

export type SectionId = (typeof SECTIONS)[number]['id'];

export const BUDGET = {
  viewport: 900, // px, the 1440x900 reference viewport
  maxTotal: 18.0, // viewports
  plannedTotal: 17.75,
  projectIds: ['blueberry', 'work', 'impact'],
  projectShareMin: 0.48, // (#blueberry + #work + #impact) over the total
  experienceMaxPx: 900, // #experience at 1440x900 (plan A10)
  maxPins: 3,
  sections: Object.fromEntries(SECTIONS.map(s => [s.id, { budget: s.budget, kind: s.kind }])) as Record<SectionId, { budget: number; kind: 'cap' | 'floor' }>,
} as const; // [plan 1.1]

export function section(id: SectionId) {
  const found = SECTIONS.find(s => s.id === id);
  if (!found) throw new Error(`Unknown section ${id}`);
  return found;
}

// The attributes every section root spreads, so ids, grounds, gradients and budgets can never
// drift from the table above: <section {...sectionAttrs('top')} className="hero">.
// data-gradient and data-texture are omitted (undefined) where the table says none.
export function sectionAttrs(id: SectionId) {
  const s = section(id);
  return {
    id: s.id,
    'data-ground': s.ground,
    'data-gradient': s.gradient ?? undefined,
    'data-budget': s.kind,
    'data-texture': s.texture ? '' : undefined,
    style: { '--budget': String(s.budget) } as Record<string, string>,
  };
}

// ---------------------------------------------------------------------------------------------
// Images (plan 2.6). `w` and `h` are the declared size of the largest file; `sm` is the 800px
// variant where one exists. `owner` says who produces it; scripts/check-text.mjs checks that
// every file that exists is at least `w` wide. Island imagery appears only inside #island.
// ---------------------------------------------------------------------------------------------

export type ImageEntry = {
  src: string; w: number; h: number; sm?: string; smW?: number;
  alt: string; owner: 'exists' | 'foundation' | 'capture'; sections: readonly string[];
  gated?: 'secondBrainShot'; srcset?: readonly { src: string; w: number }[];
  /** A looping, silent video of the same picture; the image is its poster and the reduced-motion still. */
  video?: string;
};

export const IMAGES = {
  skyCloudSea: { src: '/images/photo/sky-cloud-sea.webp', w: 2000, h: 1333, alt: '', owner: 'exists', sections: ['offclock'] },
  // Blueberry's own drawing of a Grignard reagent and a ketone (its lessons render it with RDKit),
  // copied from grignard-app-source/public/reactions/grignard-addition-ketone-start-light.svg
  // @ 4a07a3c. Real product art, so it stands in wherever the site shows "what he builds".
  bbHome: { src: '/images/work/blueberry-home.webp', w: 1600, h: 1000, sm: '/images/work/blueberry-home-800.webp', smW: 800, alt: 'The Blueberry home page', owner: 'capture', sections: ['top', 'blueberry', 'work'] },
  bbLesson: { src: '/images/work/blueberry-lesson.webp', w: 1600, h: 1000, sm: '/images/work/blueberry-lesson-800.webp', smW: 800, alt: "The twelve sections of Blueberry's CHEM241 course", owner: 'capture', sections: ['blueberry'] },
  // Captured 2026-10-06 from the live site in headless Chrome (SwiftShader), 2x, each mid-use: a
  // card flipped to its rating buttons (800x600 viewport, the review run is full width), the
  // pathway, a curved arrow held mid-drag in the trainer, and the draw page with its starting
  // material loaded into Ketcher. Cropped 4:3 to the readable region.
  bbFlashcards: { src: '/images/work/bb-flashcards.webp', w: 1600, h: 1200, sm: '/images/work/bb-flashcards-800.webp', smW: 800, alt: 'A Blueberry flashcard flipped to its answer: acetophenone and methylamine give an N-methyl imine, with Again, Hard, Good and Easy buttons below', owner: 'capture', sections: ['blueberry'] },
  bbPathway: { src: '/images/work/bb-pathway.webp', w: 1600, h: 1200, sm: '/images/work/bb-pathway-800.webp', smW: 800, alt: "The Blueberry pathway for Organic Chemistry II, Unit 1: a column of lesson nodes starting at allylic and resonance delocalization", owner: 'capture', sections: ['blueberry'] },
  bbArrows: { src: '/images/work/bb-arrows.webp', w: 1600, h: 1200, sm: '/images/work/bb-arrows-800.webp', smW: 800, alt: "A curved arrow being drawn in Blueberry's trainer, pushing the allyl cation's pi bond toward the empty carbon", owner: 'capture', sections: ['blueberry'] },
  bbMolecules: { src: '/images/work/bb-molecules.webp', w: 1600, h: 1200, sm: '/images/work/bb-molecules-800.webp', smW: 800, alt: "Blueberry's draw-the-product page for a Grignard addition: the starting material and conditions beside a molecule editor holding acetophenone", owner: 'capture', sections: ['blueberry'] },
  // Captured 2026-10-07 the same way (SwiftShader, 2x, onboarding skipped). bbAldol is a recording
  // of the trainer's seq-aldol solved arrow by arrow at 800x600, cropped 4:3 to the step text and
  // canvas; its still is step 2 with all three arrows drawn, before Check. bbTetris is the focus
  // timer's break with a few pieces dropped; bbLessonAldol the lesson with its product shown.
  bbAldol: { src: '/images/work/bb-aldol.webp', w: 1200, h: 900, sm: '/images/work/bb-aldol-800.webp', smW: 800, video: '/media/work/bb-aldol.webm', alt: "Blueberry's trainer solving the aldol addition in two steps: hydroxide takes an alpha hydrogen from acetone to make the enolate, then the enolate's carbon attacks formaldehyde, each step drawn as three curved arrows", owner: 'capture', sections: ['blueberry'] },
  bbLessonAldol: { src: '/images/work/bb-lesson-aldol.webp', w: 1600, h: 1200, sm: '/images/work/bb-lesson-aldol-800.webp', smW: 800, alt: "Blueberry's aldol addition lesson: two acetaldehydes give 3-hydroxybutanal, above the conditions, dilute sodium hydroxide in cold water", owner: 'capture', sections: ['blueberry'] },
  bbTetris: { src: '/images/work/bb-tetris.webp', w: 1600, h: 1200, sm: '/images/work/bb-tetris-800.webp', smW: 800, alt: "The Tetris game in Blueberry's focus timer break card, a few pieces stacked on its ten by eighteen board", owner: 'capture', sections: ['blueberry'] },
  mechanismTrainer: { src: '/images/work/mechanism-trainer.webp', w: 1600, h: 1000, sm: '/images/work/mechanism-trainer-800.webp', smW: 800, alt: 'The Mechanism Trainer', owner: 'capture', sections: ['work'] },
  // Re-captured 2026-10-07 at Andrew's request ("make the ff_tech... an animated slide with the
  // new fire animation and the marquee"): the live guide in headless SwiftShader Chrome at
  // 960x600 2x, its clock stepped by hand, as an 11.2s loop: the cover (the flame round the KCM
  // logo, the tool dock marquee), Step 1 and Step 10, joined by slides, ending on the first frame
  // (scratchpad ffv/rec.mjs). The still is that first frame. scripts/capture.mjs would overwrite it.
  focusFamilyGuide: { src: '/images/work/focus-family-guide.webp', w: 1600, h: 1000, sm: '/images/work/focus-family-guide-800.webp', smW: 800, alt: 'The Focus Family Guide: its cover with the KCM logo burning and the tool logos scrolling, then the Procedure and Step 10 pages', owner: 'capture', sections: ['work'], video: '/media/work/focus-family-guide.webm' },
  // Re-captured 2026-10-06 at Andrew's request ("make the second brain animated, like the actual
  // site ... not include the file names, but keep the look"): one full 90s turn of the local app's
  // globe, every label and panel hidden, stepped to 300 frames and played as a 15s seamless loop
  // (scratchpad brain-video.mjs). The still is the loop's own frame, shown under reduced motion.
  secondBrain: { src: '/images/work/second-brain-globe.webp', w: 1200, h: 750, alt: 'The Second Brain globe turning: every file on my machine as one node per folder and kind on the surface of a sphere, linked by the references between them as lines that curve through the inside of the sphere', owner: 'capture', sections: ['work'], gated: 'secondBrainShot', srcset: [{ src: '/images/work/second-brain-globe-800.webp', w: 800 }, { src: '/images/work/second-brain-globe.webp', w: 1200 }], video: '/media/work/second-brain-globe.webm' },
  // Captured 2026-10-06 from the island game (island/src/interiors/chapel.js, room "circle") in
  // headless SwiftShader Chrome via window.__island.enterInterior('chapel') and room.go('circle').
  // Re-captured 2026-10-06 with the gold leader in the middle hidden (Andrew: it read as a cult).
  // Shown small in #offclock's Bible study scene (Andrew asked for it there, 2026-10-06).
  islandFocusFamily: { src: '/images/work/island-focus-family.webp', w: 1600, h: 1000, sm: '/images/work/island-focus-family-800.webp', smW: 800, alt: 'The Focus Family Circle room from my island game: advisors, officers and leaders seated in a ring, and two rows of students behind them', owner: 'capture', sections: ['offclock'] }, // [Z chapel] alt (needs sign-off)
  // Captured 2026-10-06 the same way at 3x (2x for the plaza) and cropped 16:10, HUD hidden: the
  // yard's Home Gym and Kitchen (island/src/interiors/yard.js, rooms "gym" and "kitchen"), and the
  // spawn plaza outdoors. Each sits small in its #offclock scene.
  islandGym: { src: '/images/work/island-gym.webp', w: 1600, h: 1000, sm: '/images/work/island-gym-800.webp', smW: 800, alt: 'The Home Gym from my island game: a round green friend beside a yellow one squatting a barbell in a red rack, a plate tree, kettlebells and a bench', owner: 'capture', sections: ['offclock'] }, // [Z yard] alt (needs sign-off)
  islandKitchen: { src: '/images/work/island-kitchen.webp', w: 1600, h: 1000, sm: '/images/work/island-kitchen-800.webp', smW: 800, alt: 'The Kitchen from my island game: a red pot and a pan of vegetables on the stove, a chalkboard that says toss it 4 times, and an island counter with stools', owner: 'capture', sections: ['offclock'] }, // [Z yard] alt (needs sign-off)
  islandTable: { src: '/images/work/island-table.webp', w: 1600, h: 1000, sm: '/images/work/island-table-800.webp', smW: 800, alt: 'The kitchen table from my island game: a plate, a bowl of fruit and three stools, with a yellow friend on one of them', owner: 'capture', sections: ['offclock'] }, // [Z yard] alt (needs sign-off)
  islandPlaza: { src: '/images/work/island-plaza.webp', w: 1600, h: 1000, sm: '/images/work/island-plaza-800.webp', smW: 800, alt: 'The plaza outdoors on my island game: a sign with my name, letter blocks spelling Andrew Liu, a garage, roads and little round people', owner: 'capture', sections: ['offclock'] }, // [Z] alt (needs sign-off)
  islandS3: {
    src: '/media/island/s3-3840.webp', w: 3840, h: 2160,
    srcset: [
      { src: '/media/island/s3-1280.webp', w: 1280 },
      { src: '/media/island/s3-2560.webp', w: 2560 },
      { src: '/media/island/s3-3840.webp', w: 3840 },
    ],
    alt: 'The résumé island at golden hour', // [Z] "every place on the island is one line of the résumé"
    owner: 'capture', sections: ['island'],
  },
} as const satisfies Record<string, ImageEntry>;

export type ImageKey = keyof typeof IMAGES;

export const CREDITS = '/images/photo/credits.json'; // [plan 2.6] filled by capture

// ---------------------------------------------------------------------------------------------
// Portraits (plan 2.8, A11). To add a photo, drop public/images/me/hero.webp (and optionally
// hero-cutout.webp, a transparent image of just him) and set `src` (and `cutout`) below.
// Without a `src`, components/site/portrait.tsx draws the designed AL monogram placeholder.
// `art` names the drawn placeholder for the three off-the-clock notes.
// ---------------------------------------------------------------------------------------------

export type PortraitId = 'hero' | 'about' | 'cooking' | 'lifting' | 'faith';
export type PortraitEntry = {
  src: string | null; cutout: string | null; w: number; h: number; alt: string;
  art?: 'pan' | 'plate' | 'window';
};

export const PORTRAITS: Record<PortraitId, PortraitEntry> = {
  hero: { src: null, cutout: null, w: 1200, h: 1500, alt: 'Andrew Liu' }, // [plan 2.8]
  about: { src: null, cutout: null, w: 1200, h: 1500, alt: 'Andrew Liu' }, // [plan 2.8]
  cooking: { src: null, cutout: null, w: 1200, h: 1200, alt: 'Andrew cooking', art: 'pan' }, // [plan 2.8]
  lifting: { src: null, cutout: null, w: 1200, h: 1200, alt: 'Andrew lifting', art: 'plate' }, // [plan 2.8]
  faith: { src: null, cutout: null, w: 1200, h: 1200, alt: 'A quiet morning', art: 'window' }, // [plan 2.8]
};

// ---------------------------------------------------------------------------------------------
// MICROCOPY: UI labels only, exactly the table in SITE-PLAN.md 2.4. Andrew signs this off;
// APPROVALS.microcopy stays false until he does.
// ---------------------------------------------------------------------------------------------

export const MICROCOPY = {
  skip: 'Skip to content', // existing site
  menu: 'Menu', // UI
  close: 'Close', // UI
  nav: ['Projects', 'Impact', 'Experience', 'About', 'Contact', 'Island'], // section names [P] plus Impact (A8)
  currently: 'currently:', // A2 (needs sign-off)
  visitBlueberry: 'Visit Blueberry', // existing [P] link "Visit site", renamed to name the target
  source: 'Source', // [P]
  seeLive: 'See it live', // a project spread's live link (needs sign-off)
  skipInto: 'Skip into Blueberry', // glyph-portal's enterLabel prop
  forkCounts: `${PROJECTS.length} projects and ${JOBS.length} roles.`, // derived from data
  islandBelow: 'It is at the bottom of this page.', // revision-1 plan (needs sign-off)
  prompt: 'Go to the game?', // app/island-section.tsx
  yes: 'Yes, drive', // app/island-section.tsx
  no: 'Not now', // app/island-section.tsx
  phoneNote: 'It plays best on a computer, but you can try it here.', // app/island-section.tsx:21
  back: 'Back to andliu.dev', // app/island-section.tsx:221
  flip: 'Flip', // phone deck controls (UI)
  next: 'Next card', // phone deck controls (UI)
  prev: 'Previous card', // phone deck controls (UI)
  cardOf: (n: number, total: number) => `Card ${n} of ${total}`, // phone deck position (UI)
  tapToFlip: 'Tap to flip', // phone hint (needs sign-off)
  illustration: 'Illustration', // caption on drawn images (needs sign-off)
  howMeasured: 'How this was measured', // Impact source disclosure (needs sign-off)
  showData: 'Show the numbers', // Impact table toggle (needs sign-off)
  motion: 'Motion', // UI switch label
  sound: 'Sound in the island', // UI switch label
  mascot: 'Berry cursor', // UI switch label; the berry is the cursor now (Andrew, 2026-10-06; needs sign-off)
  mascotNeedsPointer: 'Needs a mouse or trackpad.', // the mascot switch's disabled reason (needs sign-off)
  dock: 'Dock to the side', // UI switch label
  ask: 'Ask about Andrew', // research 3.1
  send: 'Send', // chat send button name (needs sign-off)
  askShort: 'Ask', // chat launcher label, plan 6.2 (needs sign-off)
  live: 'Live', // research 3.1
  offline: 'Offline answers', // research 3.1
  resting: 'Live chat is resting; here is what I know.', // research 3.5
  tooFast: "You're asking faster than my budget allows. Try again in a minute, or email Andrew.", // research 3.5
  resume: 'Résumé (PDF)', // [P]
  resumeShort: 'Résumé', // header pill; the same [P] link as the footer's "Résumé" (opens the PDF in a new tab)
  credits: 'Photographs from Unsplash', // Blueberry footer pattern [S site-footer]
  backHome: 'Back to andliu.dev', // About footer tab (same words as `back`)
  domain: 'andliu.dev', // [P] public/CNAME; shown in caps beside the header's centre berry on hover (needs sign-off)
} as const;

// Where each MICROCOPY.nav label goes. Far targets go through jumpTo (components/site/jump.ts);
// #island goes through the island piece's own delegate.
export const NAV = [
  { label: MICROCOPY.nav[0], href: '#work' },
  { label: MICROCOPY.nav[1], href: '#impact' },
  { label: MICROCOPY.nav[2], href: '#experience' },
  { label: MICROCOPY.nav[3], href: '/about' },
  { label: MICROCOPY.nav[4], href: '#contact' },
  { label: MICROCOPY.nav[5], href: '#island' },
] as const;

// Accessible names for header controls (plan 6.1). Not visible text; listed here so no
// component inlines a sentence. Part of the MICROCOPY sign-off.
export const A11Y = {
  home: 'Andrew Liu, home', // [P] wordmark
  menuDialog: 'Site menu', // UI
  loader: 'Andrew Liu', // [P] the loader's word
  berryHome: 'andliu.dev, back to top', // [P] the site's domain (public/CNAME), as MICROCOPY.back; the header's centre berry (needs sign-off)
} as const;

export const APPROVALS = { microcopy: false, secondBrainShot: true } as const; // Andrew flips these. secondBrainShot: approved 2026-10-06 (he asked for the globe picture)
