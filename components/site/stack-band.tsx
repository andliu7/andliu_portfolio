import { BB_HEAD, STACK } from '@/lib/site';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { StackChip } from '@/components/site/stack-logos';
import './stack-band.css';

// The stack band: STACK as logo chips sliding across one straight, full-bleed sky band with an
// ink rule top and bottom. On the home page it sits on the seam between Projects and Impact
// (app/page.tsx), straight through the screen (Andrew 2026-10-20: "the marquee should be straight
// through the screen between the projects and along the way"); it used to be a strip of tilted
// tape over the contact card's lower right corner. About keeps it under its contact card.
// A plain div, not a section: it is not one of SECTIONS, so the director's section triggers skip
// it, and app/motion.tsx watches it by its class to pause the slide while it is off screen.
// The slider slows on hover (durationOnHover) and stands still in wrapped rows under reduced
// motion (components/ui/infinite-slider.tsx); its list is named by BB_HEAD.stack for screen readers.

export function StackBand({ className = '' }: { className?: string }) {
  return (
    <div className={`stack-band ${className}`}>
      <InfiniteSlider label={BB_HEAD.stack} gap={16} duration={55} durationOnHover={140}>
        {STACK.map(item => <StackChip key={item} name={item} className="stack-band-item" />)}
      </InfiniteSlider>
    </div>
  );
}

export default StackBand;
