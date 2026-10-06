import { GITHUB, LINKEDIN } from '@/lib/site';
import './social-button.css';

// GitHub and LinkedIn as icon buttons whose word slides out on hover or keyboard focus, after
// the buttons in Andrew's Focus Family guide (ff_technical_instructions, .xbtn / .xlbl). The word
// is real text the whole time (only clipped to zero width), so screen readers read "GitHub" even
// while it is hidden. On touch screens there is no hover, so the word always shows.
// `className` carries the look of the place it sits in (a pill on the contact card, the dark
// footer button in the footer); this component only adds the expanding behaviour.

type Kind = 'github' | 'linkedin';

/** Which icon a link gets, from its address. */
export function socialKind(href: string): Kind | null {
  if (href === GITHUB || href.includes('github.com')) return 'github';
  if (href === LINKEDIN || href.includes('linkedin.com')) return 'linkedin';
  return null;
}

export function SocialButton({ href, label, kind, className = '' }: { href: string; label: string; kind: Kind; className?: string }) {
  return (
    <a className={`sbtn ${className}`} href={href} target="_blank" rel="noreferrer">
      {kind === 'github' ? <GitHubIcon /> : <LinkedInIcon />}
      <span className="sbtn-label">{label}</span>
    </a>
  );
}

// lucide dropped its brand icons, so these two are inline: GitHub's mark (the same path as the
// guide's footer) and LinkedIn's "in".
function GitHubIcon() {
  return (
    <svg className="sbtn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="sbtn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
