// The UMD seal as a die-cut sticker on the degree banner's top right corner (Andrew 2026-10-28:
// "a separate image that flips in ... like a sticker in the top right corner ... overlapping").
// The university's own seal, trimmed to its circle (public/images/umd/umd-seal.webp, 256px). It is a
// sibling of the chip, not inside it, so the chip's clipping never cuts it; the sticker look and the
// flip are CSS (hero-photo.css .umd-badge). Decoration beside the words "UMD", so the alt is empty.
export function UmdBadge({ className = '' }: { className?: string }) {
  return <img className={`umd-badge ${className}`} src="/images/umd/umd-seal.webp" width={256} height={256} alt="" decoding="async" />;
}
