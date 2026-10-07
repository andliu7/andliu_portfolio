'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FLAME, FLAME_FRAG, FLAME_VERT } from './flame-shader';
import './flame.css';

// Flame wrap: a WebGL fire round a rounded card, licking up from its top edge, glowing round the
// sides, with a few sparks. Ported from Andrew's own Focus Family guide
// (ff_technical_instructions/repo2/index.html, makeFlame and initFlames); the shader and colours
// are in flame-shader.ts.
//   <Flame className="wordmark-host" height={16} spread={7} radius={12}><a ...>card</a></Flame>
// The host span wraps the card; the canvas hangs off it, sized to the card plus room for the fire
// (the guide's sizing: `height` px of flame above, `spread` px of glow round the rest), and never
// takes the pointer. It only draws while on screen and while the tab is visible. Reduced motion
// (html[data-motion="reduced"], the site's one switch) draws a single still frame. Without
// WebGL there is no canvas at all, just the card. `paused` stops it too, for a card that is on
// screen but covered (the footer's, while the page still lies over it).

type Props = { children: ReactNode; className?: string; height: number; spread: number; radius: number; paused?: boolean };

const UNIFORMS = ['uRes', 'uTime', 'uCenter', 'uHalf', 'uRadius', 'uColor', 'uHot', 'uIntensity', 'uHeight', 'uSpread', 'uScale',
  'uTurb', 'uTurbScale', 'uSparks', 'uSparkSize', 'uSparkDensity', 'uSparkSpeed', 'uRim', 'uSmoke'] as const;

export function Flame({ children, className = '', height, spread, radius, paused = false }: Props) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // No WebGL: drop the canvas from the markup, so only the card renders.
  const [failed, setFailed] = useState(false);
  // Refs, not state: the GL loop reads the latest `paused` without the GL effect re-running, and
  // wakeRef lets the small effect below restart the loop that lives inside the big one.
  const pausedRef = useRef(paused);
  const wakeRef = useRef(() => {});
  useEffect(() => { pausedRef.current = paused; wakeRef.current(); }, [paused]);

  // One effect owns the whole GL lifetime: set up on mount, and its cleanup frees every GL
  // object and observer on unmount (or before re-running if the size props ever change).
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) { setFailed(true); return; }

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('Flame shader:', gl.getShaderInfoLog(s));
      return s;
    };
    const vert = shader(gl.VERTEX_SHADER, FLAME_VERT);
    const frag = shader(gl.FRAGMENT_SHADER, FLAME_FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(prog, name)])) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

    // The guide's sizing: the canvas reaches `top` px above the card and `side` px round the rest.
    const top = Math.round(height * 1.3 + 20);
    const side = Math.round(spread * 3 + 16);
    let w = 0, h = 0, dpr = 1;
    const size = () => {
      w = host.offsetWidth;
      h = host.offsetHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      Object.assign(canvas.style, { left: `${-side}px`, top: `${-top}px`, width: `${w + side * 2}px`, height: `${h + top + side}px` });
      canvas.width = Math.round((w + side * 2) * dpr);
      canvas.height = Math.round((h + top + side) * dpr);
      wake(); // a resize clears the canvas, so a still frame has to be drawn again
    };

    const draw = (time: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, time);
      // GL counts y from the bottom: the card sits `side` px above the canvas floor.
      gl.uniform2f(u.uCenter, (side + w / 2) * dpr, (side + h / 2) * dpr);
      gl.uniform2f(u.uHalf, (w / 2) * dpr, (h / 2) * dpr);
      gl.uniform1f(u.uRadius, radius * dpr);
      gl.uniform3f(u.uColor, FLAME.color[0], FLAME.color[1], FLAME.color[2]);
      gl.uniform3f(u.uHot, FLAME.hot[0], FLAME.hot[1], FLAME.hot[2]);
      gl.uniform1f(u.uIntensity, FLAME.intensity);
      gl.uniform1f(u.uHeight, height * dpr);
      gl.uniform1f(u.uSpread, spread * dpr);
      gl.uniform1f(u.uScale, FLAME.scale);
      gl.uniform1f(u.uTurb, FLAME.turbulence);
      gl.uniform1f(u.uTurbScale, FLAME.turbulenceScale);
      gl.uniform1f(u.uSparks, FLAME.sparks);
      gl.uniform1f(u.uSparkSize, FLAME.sparkSize * dpr);
      gl.uniform1f(u.uSparkDensity, FLAME.sparkDensity);
      gl.uniform1f(u.uSparkSpeed, FLAME.sparkSpeed);
      gl.uniform1f(u.uRim, FLAME.rim);
      gl.uniform1f(u.uSmoke, FLAME.smoke);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // The loop: runs only while the canvas is on screen and the tab is visible. Reduced motion
    // draws one still frame (time stays put) and stops.
    let raf = 0, time = 1, last = 0, onScreen = false;
    const reduced = () => document.documentElement.getAttribute('data-motion') === 'reduced';
    const live = () => onScreen && !pausedRef.current && !document.hidden && w > 0;
    const frame = (now: number) => {
      const still = reduced();
      if (!still) time += Math.min((now - last) / 1000, 1 / 30) * FLAME.speed;
      last = now;
      raf = 0;
      if (!live()) return;
      draw(time);
      if (!still) raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (raf || !live()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    wakeRef.current = wake;

    const io = new IntersectionObserver(entries => { onScreen = entries[entries.length - 1].isIntersecting; wake(); });
    io.observe(canvas);
    const ro = new ResizeObserver(size);
    ro.observe(host);
    document.addEventListener('visibilitychange', wake);
    // The menu's Motion switch flips data-motion at runtime: wake so full motion resumes.
    const mo = new MutationObserver(wake);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    size();

    return () => {
      wakeRef.current = () => {};
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', wake);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      // No loseContext() here: React's dev StrictMode remounts on the same canvas, and a lost
      // context would stay lost. The context itself goes with the canvas element.
    };
  }, [height, spread, radius]);

  return (
    <span ref={hostRef} className={`flame-host ${className}`.trim()}>
      {children}
      {!failed && <canvas ref={canvasRef} className="flame" aria-hidden="true" />}
    </span>
  );
}

export default Flame;
