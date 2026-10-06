import type { ReactNode } from 'react';

// The two faces of a pill button, for Slush's 3D roll (app/globals.css, "Pressables"). Put it
// inside any .pill, as its only child:
//
//   <a className="pill pill-berry" href={...}><PillFaces>{MICROCOPY.visitBlueberry} <Arrow /></PillFaces></a>
//
// The front face carries the label; the back face is an identical copy that rolls up in its
// place on hover. The copy is aria-hidden, so a screen reader reads the label once.
// A .pill without PillFaces still works: its colour face rolls in behind a label that stays put.
export function PillFaces({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="pill-face">{children}</span>
      <span className="pill-back" aria-hidden="true">{children}</span>
    </>
  );
}

export default PillFaces;
