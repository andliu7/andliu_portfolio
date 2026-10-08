import { ArrowRight } from 'lucide-react';
import './flow-button.css';

// Andrew's FlowButton (pasted 2026-10-06), as a link and in the site's 3D look. On hover the right
// arrow slides out, a left arrow slides in, the label shifts right and an ink circle grows from the
// centre to fill the face, so the label turns light. It keeps the .pill-berry face, ink outline
// and solid ink lip that sinks on press (globals.css), at about twice the usual size.
//
// A server component: plain markup, the motion is CSS (flow-button.css), so no hover state or
// re-render. The arrows and the circle are decoration (aria-hidden); the link reads its label.

export function FlowButton({ href, text, className = '' }: { href: string; text: string; className?: string }) {
  return (
    <a className={`pill pill-berry flow-btn ${className}`} href={href} {...(href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' })}>
      <ArrowRight className="flow-arr flow-arr-in" aria-hidden="true" />
      <span className="flow-text">{text}</span>
      <span className="flow-circle" aria-hidden="true" />
      <ArrowRight className="flow-arr flow-arr-out" aria-hidden="true" />
    </a>
  );
}

export default FlowButton;
