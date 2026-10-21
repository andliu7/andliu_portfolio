import type { Metadata } from 'next';
import { DRAFT_HERO } from '@/lib/site';
import { HeroPanel } from '../sections/hero';
import Motion from '../motion';

// /draft: kept so Andrew can switch back (2026-10-21: "I think I like A but save D in case I
// change my mind"). The live hero (app/sections/hero.tsx) uses icons A; this page shows the same
// hero with icons D, the objects on the name's outer corners. Not linked from anywhere, not in
// SECTIONS, noindex. To switch the live hero to D, change its HeroPanel icons="a" to "d".

export const metadata: Metadata = {
  title: DRAFT_HERO.title,
  robots: { index: false, follow: false }, // <meta name="robots" content="noindex, nofollow">
};

export default function DraftPage() {
  return (
    <div className="draft">
      <Motion />
      <HeroPanel icons="d" tag={DRAFT_HERO.tag} />
    </div>
  );
}
