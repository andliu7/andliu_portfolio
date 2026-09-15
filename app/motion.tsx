'use client';
import { useEffect } from 'react';
export default function Motion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px)');
    const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax], [data-drift]'));
    let frame = 0;
    const render = () => {
      frame = 0;
      if (reduced.matches) { layers.forEach(layer => layer.style.removeProperty('transform')); return; }
      const factor = compact.matches ? 0.35 : 1;
      const viewport = window.innerHeight;
      const positions = layers.map(layer => { const bounds = layer.parentElement!.getBoundingClientRect(); return { layer, top: bounds.top, height: bounds.height, bottom: bounds.bottom }; });
      positions.forEach(({ layer, top, height, bottom }) => {
        if (bottom < -viewport || top > viewport * 2) return;
        const offset = viewport / 2 - (top + height / 2);
        const speed = Number(layer.dataset.parallax ?? layer.dataset.drift);
        const delta = Math.max(-80, Math.min(80, offset * speed * factor));
        layer.style.transform = layer.hasAttribute('data-drift') ? `translate3d(${delta}px,0,0)` : `translate3d(0,${delta}px,0)`;
      });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(render); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reduced.addEventListener('change', schedule);
    schedule();
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); reduced.removeEventListener('change', schedule); layers.forEach(layer => layer.style.removeProperty('transform')); };
  }, []);
  return null;
}
