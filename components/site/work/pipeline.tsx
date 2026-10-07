import { BookOpen, Clapperboard, Grid3x3, Mic } from 'lucide-react';
import { STUDIO_FLOW } from '@/lib/site';
import { LOGOS, LogoMark, type LogoKey } from './logos';
import './pipeline.css';

// The Chemistry Explainer Animation Pipeline, drawn as what it does (Andrew 2026-10-06: "more
// detailed on what it actually does with logos"), in the place a screenshot would go: Python
// draws each reaction frame as SVG, cairosvg rasterizes the frames, ffmpeg composites them with
// narration, and out comes an explainer video. Below, the spec he wrote for a professor's
// online textbook. Real text in an ordered list, so it reads as steps to a screen reader too; the
// tiles and arrows are decoration. `compact` is the index row's small hover picture: tiles and
// arrows only. Steps run across on a wide card and down on a narrow one (a container query).
// A server component: plain markup.

const LUCIDE = { raster: Grid3x3, video: Clapperboard } as const;

function Tile({ logo }: { logo: LogoKey }) {
  return <span className="pl-tile" style={{ background: LOGOS[logo].bg }}><LogoMark logo={logo} /></span>;
}

function Icons({ id, tools }: { id: string; tools: readonly string[] }) {
  const Drawn = LUCIDE[id as keyof typeof LUCIDE];
  return (
    <span className="pl-icons" aria-hidden="true">
      {tools.map(tool => <Tile key={tool} logo={tool as LogoKey} />)}
      {Drawn && <span className="pl-tile" data-tone={id}><Drawn strokeWidth={2.2} /></span>}
      {id === 'compose' && <span className="pl-tile pl-tile-sm" data-tone="mic"><Mic strokeWidth={2.4} /></span>}
    </span>
  );
}

export function Pipeline({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="pl pl-compact" aria-hidden="true">
        {STUDIO_FLOW.steps.map((step, i) => (
          <span key={step.id} className="pl-step">
            {i > 0 && <span className="pl-arrow" />}
            <Icons id={step.id} tools={step.tools} />
          </span>
        ))}
      </span>
    );
  }
  return (
    // .pl is the size container; its child .pl-in is what the container query lays out.
    <div className="pl">
      <div className="pl-in">
      <ol className="pl-steps" aria-label={STUDIO_FLOW.label}>
        {STUDIO_FLOW.steps.map(step => (
          <li key={step.id} className="pl-step">
            <Icons id={step.id} tools={step.tools} />
            <strong className="pl-name">{step.name}</strong>
            <span className="pl-line">{step.line}</span>
          </li>
        ))}
      </ol>
      <p className="pl-spec">
        <span className="pl-tile" data-tone="spec" aria-hidden="true"><BookOpen strokeWidth={2.2} /></span>
        <span><strong className="pl-name">{STUDIO_FLOW.spec.name}</strong> <span className="pl-line">{STUDIO_FLOW.spec.line}</span></span>
      </p>
      </div>
    </div>
  );
}

export default Pipeline;
