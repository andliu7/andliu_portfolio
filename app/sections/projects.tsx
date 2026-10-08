import type { JSX } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { APPROVALS, MICROCOPY, PROJECTS, WORK_HEAD, sectionAttrs, type ImageKey } from '@/lib/site';
import { RollingRow } from '@/components/ui/rolling-list';
import { ProjectFan, type FanItem } from '@/components/ui/project-fan';
import { CheckSticker, PROJECT_ART } from '@/components/site/work/art';
import { FlashcardSticker } from '@/components/site/stickers/stickers';
import { Shot } from '@/components/site/work/shot';
import { Pipeline } from '@/components/site/work/pipeline';
import { Letters, Words } from '@/components/site/work/rise';
import { WorkViews } from '@/components/site/work/views';
import { HoverHint } from '@/components/site/work/hover-hint';
import './projects.css';

// Projects (SITE-PLAN.md 4.5), rebuilt 2026-10-07 at Andrew's request ("maybe 2 through 6 can be
// a carousel too. apparently it's a lot to scroll through").
//   - the index: one rolling row per project (01 to 07). Row 01 goes to the Blueberry chapter,
//     07 to #island, the rest to their card in the fan (#work-<id>, which also brings the card
//     round).
//   - projects 02 to 06 as one fan of cards (components/ui/project-fan.tsx): each card keeps its
//     fill, number and picture; the pipeline, which has no picture, is a text-and-diagram card.
//     Hovering a card (or tapping the centre one) shows its words in the caption under the fan.
//   - a Carousel | Desk switch over the fan swaps it for the floating tabs
//     (components/site/work/views.tsx).
// Pictures sit in a fixed 16:10 window and are cropped by object-fit, never stretched.
//
// A server component: the cards and captions are plain markup handed to the client parts.

type Project = (typeof PROJECTS)[number];

const FAN = PROJECTS.filter(p => p.id !== 'blueberry' && p.id !== 'island');

// One sticker fill per project, so neighbours never share one (ink text is AA on all of them).
const FILL: Record<string, string> = { flashcards: 'tile-gold', brain: 'tile-pink', trainer: 'tile-leaf', studio: 'tile-apricot', guide: 'tile-teal' };
// The corner sticker on a card's picture. The mechanism trainer and the animation pipeline have
// none: theirs was the molecule, removed 2026-10-06 (Andrew: no chemistry art).
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

/** A card's face. Picture-led: number, kind, the picture in a small browser window with the
 * project's sticker on its corner, then the title. Text-led (the pipeline): number, kind, a big
 * title, and the pipeline's steps with their tool logos where the picture would be. */
function Card({ project }: { project: Project }) {
  const textLed = !imageOf(project) && project.id === 'studio';
  const Sticker = STICKER[project.id];
  return (
    <div className="wk-fc" data-ground="paper" data-fill={FILL[project.id]} data-led={textLed ? 'text' : 'picture'}>
      <div className="wk-fc-top">
        <span className="wk-num" aria-hidden="true">{project.num}</span>
        <span className="wk-fc-kind">{project.kind}{project.year ? ` / ${project.year}` : ''}</span>
      </div>
      {textLed ? (
        <div className="wk-fc-flow"><Pipeline /></div>
      ) : (
        <div className="wk-fc-pic">
          <div className="wk-window">
            <div className="wk-chrome" aria-hidden="true">
              <i /><i /><i />
              {project.url && <span className="wk-url">{project.url}</span>}
            </div>
            <div className="wk-media"><Media project={project} sizes="(min-width: 700px) 340px, 70vw" /></div>
          </div>
          {Sticker && <span className="wk-sticker"><Sticker /></span>}
        </div>
      )}
      <h3 className="wk-fc-title">
        <a href={`#work-${project.id}`} draggable={false}><Letters text={project.title} /></a>
      </h3>
    </div>
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

/** The caption under the fan: the project's number, title, first line and links, short enough
 * that the fan and its words fit one screen (every line is on the Desk view's cards). Its words
 * rise in each time it is shown. */
function Caption({ project }: { project: Project }) {
  return (
    <div className="wk-cap-in" data-ground="paper">
      <span className="wk-cap-num" data-fill={FILL[project.id]} aria-hidden="true">{project.num}</span>
      <div className="wk-cap-text">
        <p className="wk-cap-title">{project.title}</p>
        <p className="wk-cap-line"><Words text={project.lines[0]} start={0} /></p>
        <div className="wk-cap-foot">
          <Links project={project} />
          {project.note && <p className="wk-note">{project.note}</p>}
        </div>
      </div>
    </div>
  );
}

const FAN_ITEMS: FanItem[] = FAN.map((project, i) => ({
  id: `work-${project.id}`,
  label: `${project.title}, ${WORK_HEAD.slideOf(i + 1, FAN.length)}`,
  card: <Card project={project} />,
  caption: <Caption project={project} />,
}));

export default function Projects() {
  return (
    <section {...sectionAttrs('work')} className="work" aria-labelledby="work-title">
      <div className="wk-head">
        <span className="eyebrow split" data-reveal><Letters text={WORK_HEAD.eyebrow} /></span>
        {/* The display title was removed (Andrew, 2026-10-06); the heading stays for screen
            readers, so the section landmark keeps its name (aria-labelledby). */}
        <h2 id="work-title" className="sr-only">{WORK_HEAD.label}</h2>
      </div>

      {/* The "hover!" hint sits on the Selected work list, whose rows show a preview on hover
          (Andrew 2026-10-07: "it should be on the selected work page"). */}
      <div className="wk-index-wrap">
      <HoverHint text={WORK_HEAD.hint} touchText={WORK_HEAD.hintTouch} target=".wk-index" />
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
      </div>

      <WorkViews>
        <ProjectFan items={FAN_ITEMS} name={WORK_HEAD.fan} prevLabel={WORK_HEAD.prev} nextLabel={WORK_HEAD.next} />
      </WorkViews>
    </section>
  );
}
