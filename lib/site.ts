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
  // The photo hero's words (Andrew 2026-10-21: "Hi, my name is Andrew Liu," with the software
  // engineer part bigger), picked on /draft
  hi: 'Hi, my name is', // [Andrew 2026-10-21] (needs sign-off)
  comma: ',', // [Andrew 2026-10-21] "Andrew Liu," keeps its comma (needs sign-off)
  role: 'SOFTWARE ENGINEER', // [Andrew 2026-10-21] (needs sign-off)
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
  'Mentoring 25+ students at KCM ← (Kharis Campus Ministry, see timeline!)', // [R] Kharis line; KCM spelled out once here, explained in JOBS kcm [Andrew 2026-10-17]
  'RDKit.js grading in the browser', // [R] Blueberry highlights
] as const;

// 4.1 The caution boxes mixed into the hero's cream bar between the HERO_BAR facts (Andrew
// 2026-10-07: "give the white marquee a caution border and include the try catch and warning and
// the schedule the interview and shorten the recruiters one to just may cause interviews"). Set
// in caps; `code: true` keeps a line's own case, because it is code. All [UI], his wording.
export const HERO_CAUTION = [
  { text: 'try { interview(andrew) } catch { /* unreachable */ }', code: true }, // [UI] signed off 2026-10-06
  { text: 'WARNING: MERGES CLEANLY' }, // [UI] signed off 2026-10-06
  { text: '// TODO: SCHEDULE THE INTERVIEW' }, // [UI] signed off 2026-10-06
  { text: 'MAY CAUSE INTERVIEWS' }, // [UI] Andrew 2026-10-07, shortened from the recruiters line
] as const;

// 4.1 The rotating "currently:" line (prefix MICROCOPY.currently). Assembled from inventory
// phrases; needs Andrew's sign-off (plan 2.4).
export const CURRENTLY = [
  'building Blueberry with a team of four', // [Andrew 2026-10-06] team size from Andrew; the résumé PDF still says five
  'CS and pre-dental at UMD, expected May 2027', // [R]
  'leading Focus Family at KCM', // [R] KCM per Andrew 2026-10-17
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

// 4.4 The Blueberry chapter (the dive section before it was removed 2026-10-06 at Andrew's request)
export const BLUEBERRY_CHAPTER = {
  eyebrow: `01 / ${BLUEBERRY_TITLE} / Aug 2026 to now`, // [P] derived from BLUEBERRY_TITLE
  headline: 'ORGANIC CHEMISTRY THAT *actually sticks.*', // [S] HERO.headline
  headlinePlain: 'Organic chemistry that actually sticks.', // [S] HERO.headline
  sell: 'Lessons that explain it properly, mechanisms you draw yourself, and flashcards that hunt down the one thing you keep getting wrong.', // [S] HERO.sell
  story: 'It started as flashcards for my classmates. Now it is an organic chemistry platform, and I lead product and learning design for a team of four.', // [P] shortened 2026-10-17 (Andrew: "make the text more concise") from the longer [P] line
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

// 4.4 The screens. Four from the app hang as prints on a string (Andrew, 2026-10-07: "i wanted to
// keep it four ... the main part would be the app ... also yeah include the animations of the
// arrow pushing"), in components/ui/polaroid-line-carousel.tsx. Since 2026-10-21 the line stands
// alone: FOR REAL! and the small website carousel beside it were removed (Andrew: "it just feels
// cluttery and distracting from the other projects").
// `route` is the literal route each capture was taken on; `title` is the feature's own name in
// the app; `caption` restates what the capture shows (its IMAGES alt), nothing more.
export const BB_SCREENS = [
  { image: 'bbAldol', title: 'Arrow pushing', caption: 'The aldol addition in two steps: hydroxide makes the enolate, then its carbon attacks formaldehyde. Six curved arrows, drawn in the trainer.', route: '#/app/trainer?sequence=seq-aldol', href: `${BB_LIVE}#/app/trainer?sequence=seq-aldol` }, // [S] game demo/sequences.ts seq-aldol, recorded 2026-10-07 (title needs sign-off)
  { image: 'bbFlashcards', title: 'Flashcards', caption: 'A card flipped to its answer, then rated Again, Hard, Good or Easy.', route: '#/app/cards', href: `${BB_LIVE}#/app/cards` }, // [S] game routes.ts tab "cards"
  { image: 'bbArrows', title: 'Mechanism trainer', caption: "A curved arrow mid-drag, pushing the allyl cation's pi bond toward the empty carbon.", route: '#/app/trainer', href: `${BB_LIVE}#/app/trainer` }, // [S] game routes.ts tab "trainer"; [R] "curved-arrow mechanism trainer"
  { image: 'bbPathway', title: 'Pathway', caption: 'Organic Chemistry II, Unit 1, as a column of lesson nodes.', route: '#/app/pathway', href: `${BB_LIVE}#/app/pathway` }, // [S]
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
  stack: 'The stack', // [UI] label over BB_ENGINEERING.stack (needs sign-off)
} as const;

// 4.4b Blueberry on a phone (app/sections/phones.tsx), right after the chapter. Andrew
// 2026-10-20: "for my projects I want a page of phone screens and updated pictures of
// blueberry". Captured from the live site at 390x844, 2x (780x1688 WebP), by
// scripts/capture-blueberry-phone.mjs. Six of the twelve captures, the most important screens
// (Andrew 2026-10-20: "only include the most important screens ... the periodic table and the
// reactions search. also the schedule and the learn tab. and then maybe a couple more"): those
// four, plus the game's Pathway (its front door: the mascot and the trail of lessons) and a
// Lesson (the chemistry itself, a drawn molecule and a real question). Listed row by row for
// three columns (phones.css), so the two site pages sit in the middle column and the four game
// screens mirror each other on the sides. `where` and `title` make each phone's caption tag;
// `alt` says what the screen shows.
const PHONE_SHOT = (file: string, where: 'Site' | 'Game', title: string, alt: string) =>
  ({ src: `/work/blueberry-phone/${file}.webp`, w: 780, h: 1688, where, title, alt });
export const PHONES = {
  eyebrow: '02 / On a phone', // [Andrew 2026-10-20] (needs sign-off); 02 as its Contents row
  headline: 'IN YOUR\n*pocket.*', // [Andrew 2026-10-20] (needs sign-off)
  line: 'Six screens from the live site and the game, captured at phone size: the periodic table, the reaction search, the calendar, the units, the pathway and a lesson.', // [Andrew 2026-10-20] [S] the captures below (needs sign-off)
  link: 'Open it on your phone', // [Andrew 2026-10-20] (needs sign-off)
  // Blueberry's hidden #/phone page: the real game in a phone frame, with the app stores as
  // plain "coming soon" text. Nothing on Blueberry links to it (Andrew 2026-10-21; built in
  // grignard-app-source 88387f1, live once that repo's next push to main lands).
  href: `${BB_LIVE}#/phone`, // [Andrew 2026-10-21]
  label: 'Blueberry screens on a phone', // [Andrew 2026-10-20] the gallery's accessible name (needs sign-off)
  shots: [
    PHONE_SHOT('game-periodic', 'Game', 'Periodic table', "Blueberry's periodic table on a phone: colour-coded elements by category with carbon selected, showing atomic number 6, mass 12.011 and its electron configuration"), // [S] live game tool (needs sign-off)
    PHONE_SHOT('site-learn', 'Site', 'Learn', "Blueberry's Learn page on a phone: a banner showing butadiene and HBr giving 1-bromobut-2-ene, then Up next, Dienes and Diels-Alder, with a Start Unit 1 button"), // [S] live #/learn (needs sign-off)
    PHONE_SHOT('game-search', 'Game', 'Reaction search', "Blueberry's reaction search on a phone: a search box and tappable chips for reagents like PCC and NaBH4, starting groups like ketone, and named reactions like Grignard and Diels-Alder"), // [S] live game tool (needs sign-off)
    PHONE_SHOT('game-path', 'Game', 'Pathway', "Blueberry's learning game on a phone: the Organic Chemistry II Unit 1 pathway, a glowing start node beside the berry mascot and a trail of locked lessons down to a trophy"), // [S] live #/app/pathway (needs sign-off)
    PHONE_SHOT('site-schedule', 'Site', 'Schedule', "Blueberry's Schedule page on a phone: an October 2026 month calendar for CHEM241 exams and deadlines, with today's date circled"), // [S] live #/schedule (needs sign-off)
    PHONE_SHOT('game-lesson', 'Game', 'Lesson', 'A Blueberry game lesson on a phone: the berry asks which of two products wins, with a drawing of 1-bromobut-2-ene and four answer choices about kinetic and thermodynamic control'), // [S] live #/app/lesson/u1-kvt (needs sign-off)
  ],
} as const;
export type PhoneShot = (typeof PHONES.shots)[number];

// The hover bubble (components/site/hover-bubble.tsx): the round label that follows a mouse over
// a picture (Andrew 2026-10-20: "over images I want there to be a circle that appears beside the
// mouse ... say a few words about the image but focus on what the user can DO with it"). Each
// `text` is an action, two to five words, and it must stay true: a click on that picture does
// exactly this. `icon` picks the bubble's small glyph: open (a link), flip, enlarge (a full-size view). `href` is where a phone screen's click goes.
export type HoverIcon = 'open' | 'flip' | 'enlarge';
export const HOVER = {
  // #phones: each phone opens its own screen on the live site, at the route it was captured on
  // (scripts/capture-blueberry-phone.mjs SHOTS). Keyed by the shot's title.
  phones: {
    'Periodic table': { text: 'Open the periodic table', icon: 'open', href: `${BB_LIVE}#/app/periodic` }, // [Andrew 2026-10-20] (needs sign-off)
    Learn: { text: 'Open the Learn page', icon: 'open', href: `${BB_LIVE}#/learn` }, // [Andrew 2026-10-20] (needs sign-off)
    'Reaction search': { text: 'Search the reactions', icon: 'open', href: `${BB_LIVE}#/app/search` }, // [Andrew 2026-10-20] (needs sign-off)
    Pathway: { text: 'Walk the pathway', icon: 'open', href: `${BB_LIVE}#/app/pathway` }, // [Andrew 2026-10-20] (needs sign-off)
    Schedule: { text: 'Check the exam calendar', icon: 'open', href: `${BB_LIVE}#/schedule` }, // [Andrew 2026-10-20] (needs sign-off)
    Lesson: { text: 'Play this lesson', icon: 'open', href: `${BB_LIVE}#/app/lesson/u1-kvt` }, // [Andrew 2026-10-20] (needs sign-off)
  } as Record<string, { text: string; icon: HoverIcon; href: string }>,
  deskFlip: 'Flip for the details', // [Andrew 2026-10-20] the Desk view's picture side (needs sign-off)
  resume: 'Read it full size', // [Andrew 2026-10-20] the résumé page card, which opens the PDF (needs sign-off)
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

// `num` is the display number: 01 to 06 are the cards in the project fan (01 Blueberry, which
// also has its own chapter, since 2026-10-20), 07 the one island teaser line. `image` is an IMAGES key, or null where the spread draws an illustration
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
    links: [{ kind: 'live', href: 'https://andliu7.github.io/mechanism_trainer/' }, { kind: 'source', href: 'https://github.com/andliu7/mechanism_trainer' }], // [P][S] live link: Andrew 2026-10-07 ("mechanism trainer should take you to andliu7.github.io/mechanism_trainer")
    url: 'andliu7.github.io/mechanism_trainer', // [P] as the live link
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
    id: 'kcm', when: 'Jan 2025 to now', role: 'Focus Family Leader', org: 'Kharis Campus Ministry (KCM)', place: 'College Park, MD', // [P][R]
    gloss: 'Kharis means grace in Greek! Grace is being given something you do not deserve. A ministry of 100+ members.', // [Andrew 2026-10-17] his words
    line: 'The link between advisors, officers and leaders. Mentoring 25+ students, writing the guides that let other leaders run events without help, and a weekly digest email that reads the master calendar and summarizes shared folders with the Gemini API.', // [P][R]
    dot: 'tile-gold', sort: 202501,
  },
] as const;

export const WORK_HEAD = {
  eyebrow: '03 / Selected work', // [P] renumbered after On a phone took Contents row 02 (2026-10-20)
  headline: 'SELECTED *work.*', // [P]
  label: 'Selected work', // [P] as headline, plain, for the Projects section's visually hidden heading
  hint: 'hover!', // [UI] Andrew 2026-10-06 ("add a little 'hover!' icon"); the sticker over the project fan (needs sign-off)
  hintTouch: 'tap!', // [UI] the same sticker on touch screens, which have no hover (needs sign-off)
  // The fan of projects 01 to 06 and its Carousel / Desk switch (Andrew 2026-10-07: "maybe 2
  // through 6 can be a carousel too"; "toggle a view so that you can turn off the carousel";
  // 2026-10-20: "include 01 the blueberry as a card in the carousel fan")
  fan: 'Projects, one card each', // [UI] the carousel's accessible name (needs sign-off)
  bbChapter: 'Read the chapter', // [Andrew 2026-10-20] the Blueberry card's caption link to #blueberry (needs sign-off)
  bbPhones: 'See it on a phone', // [Andrew 2026-10-20] the Blueberry card's caption link to #phones (needs sign-off)
  prev: 'Previous project', // [UI] arrow button name (needs sign-off)
  next: 'Next project', // [UI] arrow button name (needs sign-off)
  slideOf: (n: number, total: number) => `${n} of ${total}`, // [UI] each card's position, read with its title
  views: 'Layout', // [UI] the switch's group name (needs sign-off)
  carousel: 'Carousel', // [UI] Andrew's word for the fan (needs sign-off)
  desk: 'Desk', // [UI] the floating tabs view (needs sign-off)
} as const;

// The projects as floating windows (components/site/work/floating-tabs.tsx), Andrew 2026-10-07:
// "floating tabs you can drag around and minimize and change the size of ... it shows you text
// saying click to flip with a curved arrow". All [UI], needs sign-off.
export const FLOAT_TABS = {
  label: 'Projects as windows', // [UI] the desk's accessible name (needs sign-off)
  flip: 'click to flip', // [UI] Andrew 2026-10-07, his words; the hover hint (needs sign-off)
  tidy: 'Tidy up', // [UI] re-stacks the windows in a grid (needs sign-off)
  keys: 'Enter flips the window. Arrow keys move it. Shift and an arrow key resizes it.', // [UI] keyboard help, read by screen readers (needs sign-off)
  dock: 'Minimized windows', // [UI] the dock row's accessible name (needs sign-off)
  minimize: (title: string) => `Minimize ${title}`, // [UI] title bar button (needs sign-off)
  reset: (title: string) => `Put ${title} back where it started`, // [UI] title bar button: first size, place and side (needs sign-off)
  open: (title: string) => `Open ${title}`, // [UI] a dock chip (needs sign-off)
} as const;

export const EXPERIENCE_HEAD = {
  eyebrow: '05 / Along the way', // [P] renumbered after Impact, then after On a phone (2026-10-20)
  headline: 'ALONG THE *way*', // [P]
  hint: 'Scroll to move through time', // [UI] from the approved timeline design (needs sign-off)
} as const;

// ---------------------------------------------------------------------------------------------
// Impact (4.6). Copy only, keyed by the series ids that scripts/impact-data.mjs writes into
// lib/impact.json. A series renders only when BOTH have it; check-text.mjs fails on a mismatch.
// Every label here needs Andrew's sign-off.
// ---------------------------------------------------------------------------------------------

export const IMPACT_HEAD = {
  eyebrow: '04 / Impact', // [plan 4.6] (needs sign-off); renumbered after On a phone (2026-10-20)
  headline: 'MEASURED *impact.*', // [plan 4.6] (needs sign-off)
} as const;

/** What a panel's one-line summary is built from: its primary series' total and date range. */
export type ImpactSummary = { total: number; first: string; last: string };

export type ImpactSeriesCopy = { id: string; title: string; unit: string; caption?: string };

export const IMPACT: readonly {
  id: 'brain' | 'blueberry' | 'guide' | 'all';
  title: string;
  primary: string;
  summary: (s: ImpactSummary) => string;
  /** The big number's title, when the primary series' title would repeat the chart title under it. */
  hero?: string;
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
  {
    id: 'all', title: 'Every repo', primary: 'all.days', // [D] the repos scripts/impact-data.mjs reads (needs sign-off)
    summary: s => `${s.total} commits across my repos, day by day`, // [D] (needs sign-off)
    hero: 'Commits I authored', // [D] from the all.days caption, so the big number does not repeat the chart title (needs sign-off)
    series: [
      { id: 'all.days', title: 'Commits, day by day', unit: 'commits', caption: 'Every commit I authored, in every repo, one block per day.' }, // [D] (needs sign-off)
      { id: 'all.streak', title: 'Longest streak', unit: 'days' }, // [D] (needs sign-off)
    ],
  },
];

/** The contribution skyline's controls and spoken lines (components/ui/contribution-skyline.tsx). */
export const SKYLINE = {
  view: 'View', // [UI] the 2D / 3D toggle's group name (needs sign-off)
  flat: '2D', // [UI] (needs sign-off)
  city: '3D', // [UI] (needs sign-off)
  less: 'Less', // [UI] legend end (needs sign-off)
  more: 'More', // [UI] legend end (needs sign-off)
  day: (n: number, unit: string, date: string) => `${n} ${unit} on ${date}`, // [D] tooltip and live line
  label: (total: number, unit: string, first: string, last: string) => `${total} ${unit} from ${first} to ${last}, one block per day. Arrow keys move between days.`, // [D][UI] the chart's accessible name (needs sign-off)
} as const;

// ---------------------------------------------------------------------------------------------
// Off the clock (4.8). Gardening goes with cooking [Andrew 2026-10-06]: "the garden fuels the cooking."
// It replaces plan A12's old "gardening is not a hobby" rule; the garden line now sits under COOK.
// Andrew will add lines here; this is the one file he edits.
// ---------------------------------------------------------------------------------------------

const GARDEN_LINE = 'I love the UMD garden. Someday, a garden of my own, with spices on hand.'; // [Z yard]
const FAITH_LINE = 'Quietly, it is why the guides I write for my campus community matter to me as much as the code.'; // [P]

export const OFF_CLOCK = {
  eyebrow: '07 / The rest of the week', // [P][Z yard] renumbered after Impact, then after Contact moved up (2026-10-07), then after On a phone (2026-10-20)
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

// The evening reel in the island finale (components/site/closing/evening-reel.tsx; the pinned
// strip it replaced was removed 2026-10-07): Andrew's evening in the
// order he gave it ("usually I like to get work done in the morning ... after work or classes gym
// and then cook and then eat and then I lead bible studies"). No clock times on purpose: he gave
// an order, not times. `big` is the scene's display word, `voice` its line with keywords in
// *asterisks*, `sub` a smaller line or null. COOK carries the garden (it fuels the cooking,
// [Andrew 2026-10-06]) and SOMEDAY keeps landscape design. All of it needs Andrew's sign-off.
export const EVENING = {
  label: 'My evening', // [UI] the carousel's accessible name (needs sign-off)
  prev: 'Previous scene', // [UI] (needs sign-off)
  next: 'Next scene', // [UI] (needs sign-off)
  scenes: [
    { id: 'after', when: 'After work or classes', big: 'CLOCK OUT', voice: 'Work or *classes* at UMD come first.', sub: null }, // [Andrew 2026-10-06][R] (needs sign-off)
    { id: 'gym', when: 'Then the gym', big: 'GYM', voice: 'Lifting with the *UMD Barbell Club*.', sub: null }, // [Andrew 2026-10-06 via lead brief] (needs sign-off)
    { id: 'cook', when: 'Then I cook', big: 'COOK', voice: 'The *garden* fuels the *cooking*.', sub: GARDEN_LINE }, // [Andrew 2026-10-06] his words, plus the UMD garden line [Z yard] (needs sign-off)
    { id: 'eat', when: 'Then we eat', big: 'EAT', voice: 'A *kitchen*, and people at the *table*.', sub: null }, // [P] OFF_CLOCK.notes[0].voice
    { id: 'study', when: 'Then Bible study', big: 'BIBLE STUDY', voice: 'I lead *Focus Family* at KCM.', sub: FAITH_LINE }, // [R][P] (needs sign-off)
    { id: 'someday', when: 'Someday', big: 'SOMEDAY', voice: 'Landscape design: the interest that keeps *growing*.', sub: null }, // [P] the garden line moved to COOK [Andrew 2026-10-06]
  ],
} as const;

// ---------------------------------------------------------------------------------------------
// The footer card (4.9) and the island finale (4.10)
// ---------------------------------------------------------------------------------------------

export const CONTACT = {
  eyebrow: '06 / Contact me', // renumbered after On a phone (2026-10-20); [UI] Andrew 2026-10-07 ("make it more of a contact me"; was 'Say hi') (needs sign-off)
  headline: "LET'S COMPARE *notes.*", // [P]
  invite: 'Hiring, building something, or stuck on a mechanism? Email me.', // [UI] Andrew 2026-10-07, the one-line invitation under the headline (needs sign-off)
  down: 'Résumé below', // [UI] the bobbing cue under the card (Andrew 2026-10-12, needs sign-off)
  emailCta: 'Email me', // [UI] the primary button, a mailto link (needs sign-off)
  // Shown beside the word when the GitHub and LinkedIn pills open on hover (components/site/social-button.tsx)
  handles: { github: '@andliu7', linkedin: 'Andrew Liu' }, // [UI] from GITHUB's address and his name (needs sign-off)
  links: [
    { label: 'GitHub', href: GITHUB, external: true }, // [P]
    { label: 'LinkedIn', href: LINKEDIN, external: true }, // [P]
    { label: 'Email', href: `mailto:${EMAIL}`, external: false }, // [P]
    { label: 'Résumé (PDF)', href: RESUME, external: true }, // [P]
  ],
  email: EMAIL, // [P]
  emailNote: 'Email is the fastest way to reach me.', // [Z contact]
  // The full-screen contact page (Andrew 2026-10-20: "expanded to a page ... a quick way to send
  // out an email to me"): the one-tap row's label, and the subject Email me fills in.
  quick: 'One tap', // [Andrew 2026-10-20] (needs sign-off)
  mailSubject: 'Hello from andliu.dev', // [Andrew 2026-10-20] (needs sign-off)
} as const;

// The contact form in the footer card (components/site/contact-form.tsx). It always renders now
// (2026-10-20): with the Worker URL set at build time it sends through the Worker
// (worker/CONTACT.md); without it, Send opens the visitor's mail app with the message filled in.
// All new [UI] wording: NEEDS ANDREW'S SIGN-OFF. Limits match worker/contact.js.
export const CONTACT_FORM = {
  heading: 'Or write it here', // [UI] (needs sign-off)
  name: 'Your name (optional)', // [Andrew 2026-10-20] name is optional now (needs sign-off)
  email: 'Your email', // [UI] (needs sign-off)
  message: 'Message', // [UI] (needs sign-off)
  botcheck: 'Leave this empty', // [UI] the honeypot's label, read by bots only (needs sign-off)
  send: 'Send', // [UI] (needs sign-off)
  sending: 'Sending', // [UI] (needs sign-off)
  sent: 'Sent. It is in my inbox now.', // [UI] (needs sign-off)
  // The Worker needs a name for the subject line; a blank one is sent as this.
  anonName: 'A visitor to andliu.dev', // [Andrew 2026-10-20] (needs sign-off)
  sentTitle: 'Got it.', // [Andrew 2026-10-20] the card that replaces the form once sent (needs sign-off)
  again: 'Write another', // [Andrew 2026-10-20] (needs sign-off)
  viaMail: 'Send opens your mail app with this filled in.', // [Andrew 2026-10-20] the hint when no Worker is set (needs sign-off)
  handoff: 'Your mail app should open with this message. Press send there.', // [Andrew 2026-10-20] (needs sign-off)
  errors: {
    name: 'Keep your name under 100 characters.', // [Andrew 2026-10-20] name is optional now (needs sign-off)
    email: 'That email address does not look right.', // [UI] (needs sign-off)
    messageShort: 'A few more words, please: 10 characters at least.', // [UI] (needs sign-off)
    messageLong: 'Keep it under 5000 characters.', // [UI] (needs sign-off)
    fix: 'Fix the highlighted fields, then send again.', // [UI] (needs sign-off)
    rate: 'Too many messages from here. Try again in a minute.', // [UI] (needs sign-off)
    failed: 'That did not send. Tap Email me or copy my address instead.', // [Andrew 2026-10-20] the address is just above the form (needs sign-off)
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
    { q: 'What does he do for fun?', a: 'Off the clock', href: '#island', icon: 'fun', external: false }, // [UI][P] (needs sign-off)
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

// The résumé preview between Contact and the island (app/sections/resume.tsx). The image is page
// one of RESUME, rendered offline (the command is in resume.tsx).
export const RESUME_PREVIEW = {
  title: 'Résumé', // [P] same word as MICROCOPY.resumeShort
  line: 'Everything above on one page: Blueberry, my internship and tutoring, two projects, and UMD.', // [R] (needs sign-off)
  open: 'Open PDF', // [UI] (needs sign-off)
  download: 'Download', // [UI] (needs sign-off)
  enlarge: 'Read the résumé full size', // [UI] the page image button's name (needs sign-off)
  close: 'Close', // [UI]
  noInline: 'This browser cannot show the PDF here, so this is the page as an image.', // [UI] (needs sign-off)
  file: 'andrew-liu-resume.pdf', // [plan] the Download file name
  // The small framed photo at the text block's bottom right (Andrew 2026-10-17), cropped square
  // from his Golden Gate photo at full resolution (700) and lightly sharpened, so the tilt has
  // detail to resample; the caption sits in the frame's foot, the place as an Instagram-style tag
  photo: { src: '/images/me/golden-gate.webp', srcSm: '/images/me/golden-gate-sm.webp', w: 700, h: 700, alt: 'Andrew at the Golden Gate Bridge, smiling with two thumbs up', caption: '(me)', place: '@Golden Gate Bridge' }, // [Andrew 2026-10-17]
  clickHere: 'click here!', // [Andrew 2026-10-17] the note pointing at the page card
  image: {
    // 2026-10-17: sharper (Andrew: "much clearer to look at"). 1600 covers the 520px card grown
    // 15% on hover at 2x; 800 is the 1x size. Rendered at 400 dpi, q=88.
    src: '/images/resume/resume-p1.webp', w: 1600, h: 2071,
    small: '/images/resume/resume-p1-sm.webp', smallW: 800,
    alt: "Page one of Andrew Liu's résumé: experience at Blueberry, Minnodi and Education One, projects, skills, UMD, and leadership.", // [R] (needs sign-off)
  },
} as const;

// The island, project 07: the page's finale (app/sections/island.tsx).
export const ISLAND = {
  eyebrow: '07 / The island', // [P] renumbered after On a phone (2026-10-20); numbered as its Contents row, like every other eyebrow (calibrate F1, 2026-10-08)
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
    { title: 'Community', line: 'Focus Family at KCM, 25+ students mentored.' }, // [R]
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
// UMD, now the first stop on the Experience timeline (app/sections/experience.umd.tsx), and the
// contents (contents.tsx). The College Park section was retired 2026-10-20 (Andrew: "the second
// (UMD) page is going to be removed"). New [UI] wording: NEEDS ANDREW'S SIGN-OFF.
// ---------------------------------------------------------------------------------------------

export const UMD = {
  place: 'College Park, MD', // [R] the timeline's label over the stop (the strip's first, Andrew 2026-10-20)
  when: EDUCATION.expected, // [R] the Coursework card's ink chip, as JOBS[].when on the role cards
  degree: IDENTITY.degree, // [R] derived from IDENTITY
  tags: ['UMD Barbell Club', 'Focus Family at KCM', 'The UMD garden'], // [Andrew 2026-10-06 via lead brief, as EVENING gym][R][Z yard] (needs sign-off)
  courseworkLabel: EDUCATION.courseworkLabel, // [R]
  coursework: EDUCATION.coursework, // [R][Z umd]
  clubsLabel: 'Clubs', // [Andrew 2026-10-20] the club pills' accessible name, now in the stop's foot (needs sign-off)
  schoolShort: IDENTITY.schoolShort, // [P] after the degree on the Coursework card
  sweat: 'Make the terrapin sweat', // [Andrew 2026-10-06 via lead] the terrapin button's name (needs sign-off)
} as const;

// The contents rows: each points at a section that exists on the page. Titles are the footer's
// skip-ahead answers and the section names; the lines under them are derived from the data.
// The two pinned horizontal strips (Experience's timeline, Off the clock's evening) share these:
// the Esc hint and the auto-play button's two states (components/site/strip-autoplay.tsx).
export const STRIP = {
  esc: 'Esc to skip', // [UI] Andrew 2026-10-07 asked for Esc to pass both strips (needs sign-off)
  autoOn: 'Auto: on, tap to stop', // [UI] Andrew 2026-10-07: animates through by default, a red button turns it off (needs sign-off)
  autoOff: 'Auto: off, tap to play', // [UI] the same button once off, green (needs sign-off)
} as const;

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
    { href: '#phones', title: 'Blueberry on a phone', sub: PHONES.shots.slice(0, 4).map(s => s.title).join(', '), meta: `${PHONES.shots.length} screens` }, // [Andrew 2026-10-20] sub and meta derived from PHONES (needs sign-off)
    { href: '#work', title: FOOTER_SKIP.links[0].a, sub: PROJECTS.slice(0, 4).map(p => p.title).join(', '), meta: `${PROJECTS.length} projects` }, // [UI] derived from FOOTER_SKIP and PROJECTS
    { href: '#impact', title: FOOTER_SKIP.links[1].a, sub: IMPACT.map(p => p.title).join(', '), meta: `${IMPACT.length} panels` }, // [UI] derived from FOOTER_SKIP and IMPACT
    { href: '#experience', title: FOOTER_SKIP.links[2].a, sub: [UMD.schoolShort, ...JOBS.map(j => j.org)].join(', '), meta: `${JOBS.length} roles` }, // [UI] derived from FOOTER_SKIP and JOBS; UMD added [Andrew 2026-10-20] first, as it now opens the timeline (needs sign-off)
    { href: '#contact', title: 'Say hi', sub: CONTACT.links.map(l => l.label).join(', '), meta: null }, // [P][Z contact] as CONTACT.eyebrow, links derived
    // One row for the island finale, which also holds Off the clock's evening reel (2026-10-07).
    { href: '#island', title: ISLAND.previewTitle, sub: ISLAND.tagline, meta: OFF_CLOCK.title }, // [plan 4.10][Z] tagline; meta [P][Z yard] as OFF_CLOCK.title
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
// `texture` isolates the section as a stacking context (app/globals.css, section[data-texture]); on berry-deep sections only, components/site/contour-bg.tsx paints contour lines inside that context (2026-10-07).
// The island finale is the last section; Off the clock's evening lives inside it (2026-10-07).
export const SECTIONS = [
  { id: 'top', ground: 'paper', gradient: 'paper-apricot', label: null, budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'contents', ground: 'berry-deep', gradient: null, label: null, budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  // Budget measured 2026-10-21 at 1440x900: 1,561px (the head, the line of prints alone on its
  // band, the stack strip), down from 1,732px with FOR REAL! and the website carousel; 1,355px at
  // 375x812, down from 1,968px; 1,370px at 1366x768 (1.78), down from 1,529 (1.99, over the cap)
  // once the line and the chapter's air shrink on short screens (blueberry.css, "Short laptop
  // screens"). A cap now: the old 3.6 floor was scroll length for a pinned phone
  // stage that is long gone, and blueberry.css had to switch it off.
  // [Andrew 2026-10-21] "I want to make it smaller so it's easier to scroll through"
  { id: 'blueberry', ground: 'berry', gradient: 'berry-deep', label: 'Blueberry', budget: 1.8, kind: 'cap', project: true, pinned: true, texture: true },
  // Blueberry on a phone (app/sections/phones.tsx), the chapter's screens at phone size [Andrew 2026-10-20].
  // Budget measured 2026-10-21 at 1440x900: 2,664px (six phones in two rows of three columns,
  // 398px wide, each as tall as the screen allows, plus the centre column's sink room, 20% of a
  // phone since the stagger grew; it was 2,594 at 12%).
  // [Andrew 2026-10-21] "the phones should have at least two rows (three columns)" (needs sign-off)
  { id: 'phones', ground: 'berry-deep', gradient: null, label: 'Blueberry', budget: 3.0, kind: 'cap', project: true, pinned: false, texture: true },
  { id: 'work', ground: 'berry-deep', gradient: null, label: 'Projects', budget: 4.2, kind: 'floor', project: true, pinned: false, texture: true },
  { id: 'impact', ground: 'berry-deep', gradient: null, label: 'Impact', budget: 1.3, kind: 'cap', project: true, pinned: false, texture: true },
  { id: 'experience', ground: 'berry-deep', gradient: null, label: 'Experience', budget: 1.0, kind: 'cap', project: false, pinned: false, texture: true },
  // Contact sits between the two horizontal strips (Andrew 2026-10-07: "two horizontal scrolls is a lot").
  { id: 'contact', ground: 'ink', gradient: null, label: 'Contact', budget: 0.75, kind: 'cap', project: false, pinned: false, texture: true },
  // The résumé preview, between Contact and the island (2026-10-07); no Contents row on purpose.
  { id: 'resume', ground: 'ink', gradient: null, label: 'Résumé', budget: 0.9, kind: 'cap', project: false, pinned: false, texture: true },
  { id: 'island', ground: 'ink', gradient: null, label: 'Island', budget: 1.3, kind: 'cap', project: false, pinned: false, texture: true },
] as const satisfies readonly {
  id: string; ground: Ground; gradient: Gradient | null; label: string | null;
  budget: number; kind: 'cap' | 'floor'; project: boolean; pinned: boolean; texture: boolean;
}[]; // [plan 1.1, 1.2] labels are the section names [P] plus Impact (A8)

export type SectionId = (typeof SECTIONS)[number]['id'];

export const BUDGET = {
  viewport: 900, // px, the 1440x900 reference viewport
  maxTotal: 18.0, // viewports
  plannedTotal: 17.75,
  projectIds: ['blueberry', 'phones', 'work', 'impact'],
  projectShareMin: 0.48, // (#blueberry + #phones + #work + #impact) over the total
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
  // pathway, and a curved arrow held mid-drag in the trainer. Cropped 4:3 to the readable region.
  bbFlashcards: { src: '/images/work/bb-flashcards.webp', w: 1600, h: 1200, sm: '/images/work/bb-flashcards-800.webp', smW: 800, alt: 'A Blueberry flashcard flipped to its answer: acetophenone and methylamine give an N-methyl imine, with Again, Hard, Good and Easy buttons below', owner: 'capture', sections: ['blueberry'] },
  bbPathway: { src: '/images/work/bb-pathway.webp', w: 1600, h: 1200, sm: '/images/work/bb-pathway-800.webp', smW: 800, alt: "The Blueberry pathway for Organic Chemistry II, Unit 1: a column of lesson nodes starting at allylic and resonance delocalization", owner: 'capture', sections: ['blueberry'] },
  bbArrows: { src: '/images/work/bb-arrows.webp', w: 1600, h: 1200, sm: '/images/work/bb-arrows-800.webp', smW: 800, alt: "A curved arrow being drawn in Blueberry's trainer, pushing the allyl cation's pi bond toward the empty carbon", owner: 'capture', sections: ['blueberry'] },
  // Captured 2026-10-07 the same way (SwiftShader, 2x, onboarding skipped). bbAldol is a recording
  // of the trainer's seq-aldol solved arrow by arrow at 800x600, cropped 4:3 to the step text and
  // canvas; its still is step 2 with all three arrows drawn, before Check.
  bbAldol: { src: '/images/work/bb-aldol.webp', w: 1200, h: 900, sm: '/images/work/bb-aldol-800.webp', smW: 800, video: '/media/work/bb-aldol.webm', alt: "Blueberry's trainer solving the aldol addition in two steps: hydroxide takes an alpha hydrogen from acetone to make the enolate, then the enolate's carbon attacks formaldehyde, each step drawn as three curved arrows", owner: 'capture', sections: ['blueberry'] },
  // Blueberry's home page on a phone (PHONES capture, 2026-10-20), the Projects card's first
  // phone (app/sections/projects.tsx).
  bbSiteHome: { src: '/work/blueberry-phone/site-home.webp', w: 780, h: 1688, alt: "Blueberry's home page on a phone: the headline The class everyone warns you about, one arrow at a time, above a practice card where cyanide adds to a ketone, marked Correct, and a Start the first lesson button", owner: 'capture', sections: ['work', 'phones'] },
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
  pullAsk: 'Pull to ask', // the phone pull-down pill at the top of the page (2026-10-11, needs sign-off)
  pullAskGo: 'Let go to ask', // the same pill once the pull is far enough (needs sign-off)
  pullReload: 'Did you mean to reload?', // shown over the chat when a pull opened it, since the pull replaced pull-to-refresh (2026-10-12, needs sign-off)
  pullReloadGo: 'Reload page', // its button (needs sign-off)
  pullReloadDismiss: 'No, keep the chat', // its close button's name (needs sign-off)
  live: 'Live', // research 3.1
  offline: 'Offline answers', // research 3.1
  resting: 'Live chat is resting; here is what I know.', // research 3.5
  tooFast: "You're asking faster than my budget allows. Try again in a minute, or email Andrew.", // research 3.5
  resume: 'Résumé (PDF)', // [P]
  copyEmail: 'Copy email', // the footer's expanding copy button (Andrew 2026-10-12, needs sign-off)
  copied: 'Copied', // the same button for two seconds after a copy (needs sign-off)
  resumeShort: 'Résumé', // [P] the header pill and the big résumé buttons, which glide to the résumé preview (#resume)
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

// The /draft page (app/draft/page.tsx): the hero redrawn with his photo between the letters of
// his name, then one full-screen panel per icon placement. Unlinked and noindex; not in SECTIONS.
export const DRAFT_HERO = {
  title: 'Hero draft, Andrew Liu', // [Andrew 2026-10-21] the tab title (needs sign-off)
  // /draft keeps the name-corners icon placement (D) in case Andrew changes his mind (2026-10-21:
  // "I think I like A but save D"); the live hero uses A
  tag: 'Saved: icons on the corners of the name', // [Andrew 2026-10-21] (needs sign-off)
} as const;
