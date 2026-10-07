import type { JSX } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { APPROVALS, MICROCOPY, PROJECTS, WORK_HEAD, sectionAttrs, type ImageKey } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { RollingRow } from '@/components/ui/rolling-list';
import { TiltFrame } from '@/components/site/tilt-frame';
import { CheckSticker, PROJECT_ART } from '@/components/site/work/art';
import { FlashcardSticker } from '@/components/site/stickers/stickers';
import { Shot } from '@/components/site/work/shot';
import { HoverHint } from '@/components/site/work/hover-hint';
import './projects.css';

// Projects (SITE-PLAN.md 4.5), style pass 2026-10-06.
//   - the index: one rolling row per project (01 to 07). Row 01 goes to the Blueberry chapter,
//     07 to #island, the rest to their spread. Hover or focus rolls the title and shows a small
//     picture of the project where the kind label was.
//   - two feature spreads (Flashcards, Second Brain: the ones Andrew most wants seen; the game
//     left the list 2026-10-06, the Blueberry chapter covers it),
//     picture and text side by side on a pastel panel, alternating sides
//   - the other three as sticker cards, two up, the odd one full width. The animation pipeline
//     has no screenshot, so its picture is its flow diagram (components/site/work/pipeline.tsx)
// Text columns stop at 60ch. Pictures are the real captures in a small browser window that tilts
// toward the pointer; a project without one gets a drawn illustration, never an empty box.
//
// A server component; TiltFrame and the "hover!" sticker (HoverHint) are the client parts.

type Project = (typeof PROJECTS)[number];

const FEATURED = ['flashcards', 'brain'];
const SPREADS = PROJECTS.filter(p => p.id !== 'blueberry' && p.id !== 'island');
const FEATURES = SPREADS.filter(p => FEATURED.includes(p.id));
const CARDS = SPREADS.filter(p => !FEATURED.includes(p.id));

// One sticker fill per project, so neighbours never share one (ink text is AA on all of them).
const FILL: Record<string, string> = { flashcards: 'tile-gold', brain: 'tile-pink', trainer: 'tile-leaf', studio: 'tile-apricot', guide: 'tile-teal' };
// The mechanism trainer and the animation pipeline have no sticker: theirs was the molecule,
// removed 2026-10-06 (Andrew: no chemistry art). Visual already skips a missing one.
const STICKER: Partial<Record<string, (props: { className?: string }) => JSX.Element>> = { flashcards: FlashcardSticker, brain: CheckSticker, guide: FlashcardSticker };

const rowHref = (id: string) => (id === 'blueberry' ? '#blueberry' : id === 'island' ? '#island' : `#work-${id}`);

/** The screenshot to show: the project's own, or Second Brain's once Andrew approves it. */
function imageOf(p: Project): ImageKey | null {
  if (p.image) return p.image;
  return APPROVALS.secondBrainShot && p.imageApproved ? p.imageApproved : null;
}

/** The picture: the capture, else the drawing. Null only for the island row, which has neither. */
function Media({ project, sizes, compact = false }: { project: Project; sizes: string; compact?: boolean }) {
  const image = imageOf(project);
  if (image) return <Shot image={image} sizes={sizes} />;
  const Art = PROJECT_ART[project.id];
  return Art ? <Art compact={compact} /> : null;
}

/** The picture in a small browser window (three dots and the real address), tilting toward the
 * pointer, with the project's sticker on the front layer so it parts from the window. */
function Visual({ project, sizes }: { project: Project; sizes: string }) {
  const Sticker = STICKER[project.id];
  return (
    <TiltFrame
      className="wk-visual"
      max={6}
      shift={12}
      layers={[
        {
          depth: 0.4,
          node: (
            <div className="wk-window">
              <div className="wk-chrome" aria-hidden="true">
                <i /><i /><i />
                {project.url && <span className="wk-url">{project.url}</span>}
              </div>
              <div className="wk-media"><Media project={project} sizes={sizes} /></div>
            </div>
          ),
        },
        { depth: 1, node: Sticker ? <span className="wk-sticker"><Sticker /></span> : null },
      ]}
    />
  );
}

function Links({ project }: { project: Project }) {
  if (!project.links.length) return null;
  return (
    <div className="row-actions wk-actions">
      {project.links.map(link => (
        <a
          key={link.href}
          className={link.kind === 'live' ? 'pill pill-berry press' : 'pill pill-light'}
          href={link.href}
          target="_blank"
          rel="noreferrer"
        >
          {link.kind === 'live' ? MICROCOPY.seeLive : MICROCOPY.source} <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

/** A project's words: number, title, kind, lines, note, tags, links. Shared by spreads and cards. */
function Text({ project }: { project: Project }) {
  return (
    <div className="wk-text">
      <span className="wk-num" aria-hidden="true">{project.num}</span>
      <FlipHeading id={`work-${project.id}-title`} as="h3" text={project.title} fit={false} className="wk-title" />
      <span className="eyebrow wk-kind">{project.kind}{project.year ? ` / ${project.year}` : ''}</span>
      <div className="wk-lines">
        {project.lines.map(line => <p key={line} data-reveal="lines">{line}</p>)}
      </div>
      {project.note && <p className="wk-note">{project.note}</p>}
      <ul className="wk-tags">
        {project.tags.map(tag => <li key={tag} className="wk-tag">{tag}</li>)}
      </ul>
      <Links project={project} />
    </div>
  );
}

export default function Projects() {
  return (
    <section {...sectionAttrs('work')} className="work curve-top" aria-labelledby="work-title">
      <div className="wk-head">
        <span className="eyebrow">{WORK_HEAD.eyebrow}</span>
        {/* The display title was removed (Andrew, 2026-10-06); the heading stays for screen
            readers, so the section landmark keeps its name (aria-labelledby). */}
        <h2 id="work-title" className="sr-only">{WORK_HEAD.label}</h2>
        <HoverHint text={WORK_HEAD.hint} />
      </div>

      <ol className="wk-index">
        {PROJECTS.map(project => {
          const hasMedia = Boolean(imageOf(project) || PROJECT_ART[project.id]);
          return (
            <li key={project.id}>
              <RollingRow
                href={rowHref(project.id)}
                lead={<span className="wk-index-num">{project.num}</span>}
                meta={project.id === 'island' ? MICROCOPY.islandBelow : project.kind}
                aside={hasMedia ? <span className="wk-thumb"><Media project={project} sizes="240px" compact /></span> : undefined}
              >
                {project.title}
              </RollingRow>
            </li>
          );
        })}
      </ol>

      <ol className="wk-spreads">
        {FEATURES.map(project => (
          <li key={project.id} id={`work-${project.id}`} className="wk-spread" data-ground="paper" data-fill={FILL[project.id]} data-reveal>
            <Visual project={project} sizes="(min-width: 900px) 50vw, 90vw" />
            <Text project={project} />
          </li>
        ))}
      </ol>

      <ol className="wk-cards">
        {CARDS.map(project => (
          <li key={project.id} id={`work-${project.id}`} className="wk-card" data-ground="paper" data-fill={FILL[project.id]} data-reveal>
            <Visual project={project} sizes="(min-width: 900px) 30vw, 90vw" />
            <Text project={project} />
          </li>
        ))}
      </ol>
    </section>
  );
}
