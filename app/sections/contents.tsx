import { ArrowRight } from 'lucide-react';
import { CONTENTS, sectionAttrs } from '@/lib/site';
import './contents.css';

// The contents (the approved Contents design, fp/project/Contents.dc.html), right after College
// Park, in the site's own palette: berry-deep ground, paper text, apricot numbers. "Where to?",
// the short note, then one big numbered row per section that is on the page now (CONTENTS.rows
// in lib/site.ts). Each row is a plain in-page link; the director's link delegate
// (app/motion.tsx) scrolls to it, and #island goes through the island's own delegate.
// Two small flat stickers from the design sit under the note on wide screens (decoration only).
// A server component: no state, no effects; the hover nudge is CSS.

export default function Contents() {
  return (
    <section {...sectionAttrs('contents')} className="contents" aria-labelledby="contents-title">
      <div className="toc-grid">
        <div className="toc-head">
          <div className="toc-intro">
            <span className="eyebrow">{CONTENTS.eyebrow}</span>
            <h2 id="contents-title" className="display toc-title">{CONTENTS.title}</h2>
            <p className="toc-note">{CONTENTS.note}</p>
          </div>
          <div className="toc-stickers" aria-hidden="true">
            <svg className="toc-sticker toc-sticker-a" width="132" height="96" viewBox="0 0 132 96">
              <rect x="16" y="6" width="100" height="66" rx="8" fill="#12142b" stroke="#12142b" strokeWidth="2.5" />
              <circle cx="66" cy="39" r="22" fill="none" stroke="#c9d1f4" strokeWidth="1.5" />
              <circle cx="56" cy="31" r="2.5" fill="#ffcf98" />
              <circle cx="72" cy="28" r="2" fill="#c9d1f4" />
              <circle cx="62" cy="45" r="2.5" fill="#ffcf98" />
              <circle cx="78" cy="42" r="2" fill="#5b6fd6" />
              <path d="M4 74 H128 L120 88 H12 Z" fill="#c9d1f4" stroke="#12142b" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <svg className="toc-sticker toc-sticker-b" width="104" height="96" viewBox="0 0 104 96">
              <rect x="18" y="8" width="80" height="58" rx="8" fill="#ffcf98" stroke="#12142b" strokeWidth="2.5" transform="rotate(8 58 37)" />
              <rect x="6" y="22" width="80" height="58" rx="8" fill="#fbf8f1" stroke="#12142b" strokeWidth="2.5" />
              <text x="18" y="46" fontFamily="Fira Code, monospace" fontWeight="700" fontSize="16" fill="#12142b">Q.</text>
            </svg>
          </div>
        </div>
        <nav className="toc-nav" aria-label={CONTENTS.label}>
          <ol className="toc-list">
            {CONTENTS.rows.map((row, i) => (
              <li key={row.href}>
                <a className="toc-row" href={row.href}>
                  <span className="toc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="toc-text">
                    <span className="toc-name">{row.title}</span>
                    <span className="toc-sub">{row.sub}</span>
                  </span>
                  <span className="toc-meta">{row.meta}</span>
                  <ArrowRight className="toc-arrow" size={22} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
