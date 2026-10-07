import { FlaskConical } from 'lucide-react';
import { LOGOS, logosFor, splitVersion } from '@/components/site/work/logos';
import './stack-logos.css';

// One stack item as a chip for the two stack bands (Blueberry's and the contact section's, both
// in components/ui/infinite-slider.tsx): the tool's logo, its name, and the version, if the name
// carries one ("React 19", "Tailwind v4"), as a small berry badge.
// The names come from lib/site.ts (BB_ENGINEERING.stack, STACK) unchanged; the logo paths and the
// name-to-logo map live in work/logos.tsx (Simple Icons). Here every logo is drawn in
// currentColor, one ink, so it reads on any chip fill instead of in its brand colour.
// RDKit.js has no Simple Icon, so it gets a neutral flask glyph.
// `repeat` marks a chip that only repeats an earlier one to fill a wide band: it is hidden from
// assistive tech, so the list is read once.
// A plain component with no state, usable from server and client files.

export function StackChip({ name, repeat = false, className = '' }: { name: string; repeat?: boolean; className?: string }) {
  const { base, version } = splitVersion(name);
  const logos = logosFor(name);
  return (
    <span role={repeat ? undefined : 'listitem'} aria-hidden={repeat || undefined} className={`stack-chip ${className}`}>
      <span className="stack-chip-logos" aria-hidden="true">
        {logos.length
          ? logos.map(key => (
              <svg key={key} viewBox="0 0 24 24" focusable="false"><path d={LOGOS[key].d} fill="currentColor" /></svg>
            ))
          : <FlaskConical strokeWidth={2} />}
      </span>
      <span className="stack-chip-name">{base}</span>
      {version && <span className="stack-chip-v">{version}</span>}
    </span>
  );
}

export default StackChip;
