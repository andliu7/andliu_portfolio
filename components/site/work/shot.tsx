import { IMAGES, type ImageEntry, type ImageKey } from '@/lib/site';

// A screenshot from IMAGES as a plain <img> with its 800 / full-size srcset (the site is a static
// export, so no next/image). width and height reserve the 16:10 box before the file arrives.
// A server component.

export function Shot({ image, sizes, className = '', eager = false }: {
  image: ImageKey;
  /** Which width the image is drawn at, so the browser picks 800 or 1600. */
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  const entry: ImageEntry = IMAGES[image];
  // Two ways an entry names its smaller file: `sm` (the captures) or a `srcset` list.
  const set = entry.srcset ?? (entry.sm ? [{ src: entry.sm, w: entry.smW ?? 800 }, { src: entry.src, w: entry.w }] : null);
  return (
    <img
      className={`shot ${className}`}
      src={set ? set[0].src : entry.src}
      srcSet={set ? set.map(f => `${f.src} ${f.w}w`).join(', ') : undefined}
      sizes={set ? sizes : undefined}
      width={entry.w}
      height={entry.h}
      alt={entry.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

export default Shot;
