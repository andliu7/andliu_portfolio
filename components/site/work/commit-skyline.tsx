'use client';
import { lazy, Suspense } from 'react';
import { NearViewport } from '@/components/site/near-viewport';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { SKYLINE } from '@/lib/site';
import './commit-skyline.css';

// The commits-per-day skyline, back on the page after Impact was folded into the projects
// (Andrew 2026-11-03: "the impact animation for the repo commits is gone"). It sits in one
// .ink-card under the project fan, as the only chart in the section. The skyline module (a canvas
// that folds a heat map up into an isometric city) is its own lazy chunk, mounted near the viewport.

const Skyline = lazy(() => import('@/components/ui/contribution-skyline'));

type Props = { points: { x: string; y: number }[]; unit: string; title: string; caption: string };

export function CommitSkyline({ points, unit, title, caption }: Props) {
  const reduced = useReducedMotion();
  const placeholder = <div className="impact-chart impact-chart-days skc-ph" aria-hidden="true" />;
  return (
    <figure className="skc">
      <figcaption className="skc-head">
        <h3 className="skc-title">{title}</h3>
        <p className="skc-cap">{caption}</p>
      </figcaption>
      <NearViewport placeholder={placeholder} margin="100%">
        <Suspense fallback={placeholder}>
          <Skyline points={points} unit={unit} reduced={reduced} labels={SKYLINE} />
        </Suspense>
      </NearViewport>
    </figure>
  );
}
