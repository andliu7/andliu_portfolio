// Every approved review proposal's flag class, for <html> in app/layout.tsx (2026-11-11). A plain
// module, apart from review.tsx: that file is a client component, and a server component such as
// the layout cannot read a value exported from one. Keep the ids the same as PROPOSALS there.
export const RV_FLAGS = ['rail', 'hours', 'hero', 'spot', 'land', 'thumb', 'page', 'letter', 'island', 'bubble', 'quiet', 'left']
  .map(id => `rvf-${id}`)
  .join(' ');
