import type { JSX } from 'react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { CommitSkyline } from '@/components/site/work/commit-skyline';
import { APPROVALS, IMAGES, MICROCOPY, PHONES, PROJECTS, WORK_HEAD, WORK_STATS, sectionAttrs, type ImageKey } from '@/lib/site';
import impact from '@/lib/impact.json';
import { ProjectFan, type FanItem } from '@/components/ui/project-fan';
import { CheckSticker, PROJECT_ART } from '@/components/site/work/art';
import { BlueberrySticker, FlashcardSticker } from '@/components/site/stickers/stickers';
import { Shot } from '@/components/site/work/shot';
import { Pipeline } from '@/components/site/work/pipeline';
import { Letters, Words } from '@/components/site/work/rise';
import { StackChip } from '@/components/site/stack-logos';
import './projects.css';

// Projects (SITE-PLAN.md 4.5), rebuilt 2026-10-07 at Andrew's request ("maybe 2 through 6 can be
// a carousel too. apparently it's a lot to scroll through"), cut down 2026-11-03 for "one day,
// scrolled" (the section sits at golden hour on the light apricot sky, so --on is ink):
//   - projects 01 to 06 as one fan of cards (components/ui/project-fan.tsx): each card keeps its
//     fill, number and picture; the pipeline, which has no picture, is a text-and-diagram card.
//     Blueberry joined as card 01 on 2026-10-20 (Andrew: "include 01 the blueberry as a card in
//     the carousel fan"): its picture is three of the phone captures.
//     Hovering a card (or tapping the centre one) shows its words in the caption under the fan.
//   - each caption now also carries what used to be two other things on the page: the project's
//     own measured numbers (the Impact section, WORK_STATS over lib/impact.json) and its stack as
//     small logo chips (the stack band, PROJECTS[].tags). The one number that belongs to no single
//     project, commits across every repo, sits beside the eyebrow.
//   - cut: the text index of project names (it repeated the cards' titles) and the Carousel | Desk
//     switch (the desk showed the same six projects a second way).
// Pictures sit in a fixed 16:10 window and are cropped by object-fit, never stretched.
//
// A server component: the cards and captions are plain markup handed to the client parts.

type Project = (typeof PROJECTS)[number];

const FAN = PROJECTS.filter(p => p.id !== 'island');

// One sticker fill per project, so neighbours never share one (ink text is AA on all of them).
// Blueberry takes its own berry-soft (ink 12:1), between the guide's teal and the flashcards' gold.
const FILL: Record<string, string> = { blueberry: 'berry-soft', flashcards: 'tile-gold', brain: 'tile-pink', trainer: 'tile-leaf', studio: 'tile-apricot', guide: 'tile-teal' };
// The corner sticker on a card's picture. The mechanism trainer and the animation pipeline have
// none: theirs was the molecule, removed 2026-10-06 (Andrew: no chemistry art).
const STICKER: Partial<Record<string, (props: { className?: string }) => JSX.Element>> = { blueberry: BlueberrySticker, flashcards: FlashcardSticker, brain: CheckSticker, guide: FlashcardSticker };

// Measured numbers (lib/impact.json, written by scripts/impact-data.mjs from disk and git). A stat
// series is its value; a running total (line) is its last point; `point` picks one bar.
type Series = { id: string; kind: string; value?: number; points?: { x: string | number; y: number }[] };
const SERIES = new Map((impact as { panels: { series: Series[] }[] }).panels.flatMap(p => p.series).map(s => [s.id, s]));
const fmt = (n: number) => n.toLocaleString('en-US');

function valueOf(id: string, point?: string): number | null {
  const s = SERIES.get(id);
  if (!s) return null;
  if (point) return s.points?.find(p => p.x === point)?.y ?? null;
  if (typeof s.value === 'number') return s.value;
  const pts = s.points ?? [];
  return s.kind === 'line' && pts.length ? pts[pts.length - 1].y : null;
}

const statsOf = (id: string) =>
  (WORK_STATS[id] ?? []).flatMap(st => {
    const n = valueOf(st.series, st.point);
    return n === null ? [] : [{ n, label: st.label, key: `${st.series}:${st.point ?? ''}` }];
  });

// Commits across every repo: all.days is one point per day, so the total is their sum.
const ALL_DAYS = SERIES.get('all.days')?.points ?? [];
const ALL_TOTAL = ALL_DAYS.reduce((n, p) => n + p.y, 0);
const ALL_SINCE = ALL_DAYS.length
  ? new Date(`${ALL_DAYS[0].x}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  : '';
const ALL_STREAK = valueOf('all.streak');

/** The screenshot to show: the project's own, or Second Brain's once Andrew approves it. */
function imageOf(p: Project): ImageKey | null {
  if (p.image) return p.image;
  return APPROVALS.secondBrainShot && p.imageApproved ? p.imageApproved : null;
}

/** The picture: the capture, else the drawing. Null only for the island row, which has neither. */
function Media({ project, sizes }: { project: Project; sizes: string }) {
  const image = imageOf(project);
  if (image) return <Shot image={image} sizes={sizes} />;
  const Art = PROJECT_ART[project.id];
  return Art ? <Art /> : null;
}

// Blueberry's card picture: three phone captures standing in a sky window, cut off at the bottom
// like phones in a pocket. Decoration (alt=""): Pathway and Lesson are in the #phones section with
// their descriptions, and the caption carries the words. Home left PHONES when the gallery went
// down to six screens (Andrew 2026-10-20), so it comes from IMAGES, the same capture.
// Eager, with the default decoding: card 01 is the first card the fan shows, and lazy loading
// inside the transformed card left the centre phone a blank card for seconds after the fan came
// into view (verified 2026-10-20). The three files are about 40KB each and #phones above loads
// two of them anyway, so eager costs little extra.
const CARD_PHONES = [IMAGES.bbSiteHome, ...['Pathway', 'Lesson'].map(title => PHONES.shots.find(s => s.title === title)!)];

function PhoneTrio() {
  return (
    <div className="wk-phones">
      {CARD_PHONES.map(shot => (
        <img key={shot.src} src={shot.src} width={shot.w} height={shot.h} alt="" draggable={false} />
      ))}
    </div>
  );
}

/** A card's face. Picture-led: number, kind, the picture in a small browser window with the
 * project's sticker on its corner, then the title. Text-led (the pipeline): number, kind, a big
 * title, and the pipeline's steps with their tool logos where the picture would be. */
function Card({ project }: { project: Project }) {
  const textLed = !imageOf(project) && project.id === 'studio';
  const Sticker = STICKER[project.id];
  return (
    <div className="wk-fc ink-card" data-ground="paper" data-fill={FILL[project.id]} data-led={textLed ? 'text' : 'picture'}>
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
            <div className="wk-media">
              {project.id === 'blueberry' ? <PhoneTrio /> : <Media project={project} sizes="(min-width: 700px) 340px, 70vw" />}
            </div>
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

/** The caption under the fan: the project's number, title, first line, its measured numbers and
 * its stack, then its links. Short enough that the fan and its words fit about one screen. Its
 * words rise in each time it is shown. The pipeline shows no chips: its card face is already its
 * stack (Python, SVG, ffmpeg with their logos), so the caption would say it twice. */
function Caption({ project }: { project: Project }) {
  const stats = statsOf(project.id);
  const chips = project.id === 'studio' ? [] : project.tags;
  return (
    <div className="wk-cap-in ink-card" data-ground="paper" data-stats={stats.length ? '' : undefined}>
      <span className="wk-cap-num" data-fill={FILL[project.id]} aria-hidden="true">{project.num}</span>
      <div className="wk-cap-text">
        <p className="wk-cap-title">{project.title}</p>
        <p className="wk-cap-line"><Words text={project.lines[0]} start={0} /></p>
        {stats.length > 0 && (
          <ul className="wk-stats" aria-label={WORK_HEAD.stats(project.title)}>
            {stats.map(st => (
              <li key={st.key}><b>{fmt(st.n)}</b> <span>{st.label}</span></li>
            ))}
          </ul>
        )}
        {chips.length > 0 && (
          <ul className="wk-chips" aria-label={WORK_HEAD.stack(project.title)}>
            {chips.map(tag => <li key={tag}><StackChip name={tag} item={false} className="wk-chip" /></li>)}
          </ul>
        )}
        <div className="wk-cap-foot">
          <Links project={project} />
          {project.id === 'blueberry' && (
            <div className="row-actions wk-actions">
              <a className="pill pill-light" href="#phones">{WORK_HEAD.bbPhones} <ArrowUp size={16} aria-hidden="true" /></a>
            </div>
          )}
          {project.note && <p className="wk-note">{project.note}</p>}
        </div>
      </div>
    </div>
  );
}

// The carousel has no hover bubble and its centre card does not open a link (Andrew 2026-10-21:
// "Get rid of the hover icon thing during the carousel ... keep it the way it was"); the caption
// under the fan carries the project's links.
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
        {/* The one measured number that belongs to no single project (it was Impact's last panel). */}
        {ALL_TOTAL > 0 && (
          <p className="wk-all" data-reveal>
            <span><b>{fmt(ALL_TOTAL)}</b> {WORK_HEAD.allRepos.commits(ALL_SINCE)}.</span>
            {ALL_STREAK !== null && <> <span><b>{ALL_STREAK}</b> {WORK_HEAD.allRepos.streak}.</span></>}
          </p>
        )}
      </div>

      <ProjectFan items={FAN_ITEMS} name={WORK_HEAD.fan} prevLabel={WORK_HEAD.prev} nextLabel={WORK_HEAD.next} />
      {/* The commits-per-day skyline, the chart from the old Impact section (Andrew 2026-11-03). */}
      {ALL_DAYS.length > 0 && (
        <CommitSkyline
          points={ALL_DAYS.map(d => ({ x: String(d.x), y: d.y }))}
          unit={WORK_HEAD.skyline.unit}
          title={WORK_HEAD.skyline.title}
          caption={WORK_HEAD.skyline.caption}
        />
      )}
    </section>
  );
}
