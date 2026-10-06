import type { HTMLAttributes, ReactNode } from 'react';

// Ported from Blueberry: grignard-app-source/src/components/ui/card.tsx (Card, CardHeader,
// CardContent, CardFooter), restyled in Stage tokens (.card in app/globals.css), plus Lando's
// notched card from the helmet grid: with `notch`, a clip-path step cuts the bottom edge so a
// tab hangs at the bottom-left carrying the name (in the card's text colour), and the year sits
// at the bottom-right in the keyword colour.
//
// `tone`:
//   'paper'  (default) the --card fill with ink text, for light grounds and opaque panels
//   'ground' a faint fill of the ground's own text colour with --on text, for dark grounds
// `as` lets the card be an <a>, <article> or <li> without an extra wrapper.

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'li' | 'a' | 'section';
  tone?: 'paper' | 'ground';
  notch?: { name: ReactNode; year?: ReactNode };
  href?: string;
  target?: string;
  rel?: string;
};

export function Card({ as: Tag = 'div', tone = 'paper', notch, className = '', children, ...props }: CardProps) {
  return (
    <Tag className={`card ${notch ? 'card-notched' : ''} ${className}`} data-tone={tone} {...props}>
      {children}
      {notch && <>
        <span className="card-notch">{notch.name}</span>
        {notch.year && <span className="card-year">{notch.year}</span>}
      </>}
    </Tag>
  );
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-header ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-content ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-footer ${className}`} {...props} />;
}

export default Card;
