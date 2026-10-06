'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { SILK_FRAGMENT } from './silk-shader';
import './silk.css';

// "Silk": an animated WebGL background (a Shader Builder flow shader) in four colours,
// #02010A, #04052E, #3D2C8D, #916BBF, low to high. It fills its nearest positioned ancestor and
// sits behind that ancestor's content:
//
//   <section className="relative isolate"><Silk /> ...content... </section>
//
// `isolate` keeps Silk's z-index:-1 inside the section, so it paints above the section's own
// background and below everything else in it.
//
// Plain WebGL1, no libraries: one fullscreen triangle, the shader does all the work.
// The loop only runs while the tab is visible AND the canvas is on screen. Under reduced motion
// (html[data-motion="reduced"]) or with `still`, it draws one frame at a fixed time and stops.
// Without WebGL, or if the context is lost, the wrapper's CSS gradient (silk.css) shows instead.

type Props = { className?: string; still?: boolean };

// The uniform values from the shader's header comment, fed exactly. Cursor is off, so presence
// and the pointer are 0.
const COLORS = [
  0.008, 0.004, 0.039,
  0.016, 0.020, 0.180,
  0.239, 0.173, 0.553,
  0.569, 0.420, 0.749,
];
const SHAPE = [1.26, 0.28, 0.50, 0.00];
const SURFACE = [2.40, 1.11, 0.00, 1.00];
const FINISH = [0.00, 0.00, 0.000, 0.05];
const TRANSFORM = [1581.0, 0.00, 0.00, 0.0];
const SPACE = [0.00, 0.00, 0.0, 0.0];
const CURSOR = [0.0, 2.0, 0.65, 0.46];
const TIME_SCALE = 0.76; // u_scene.z = seconds * 0.76
const COLOR_COUNT = 4.0;
const MAX_DPR = 2;
const STILL_SECONDS = 6; // the fixed moment drawn under reduced motion or `still`

// One triangle that covers the whole clip square (-1..1); the parts outside are clipped away.
// Cheaper and simpler than a two-triangle quad.
const VERTEX = `attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

export function Silk({ className, still = false }: Props) {
  const reduced = useReducedMotion();
  const frozen = still || reduced;
  // A ref holds the <canvas> DOM node. The WebGL loop below is imperative (it draws outside
  // React's render), so it needs the real element, and reading a ref never re-renders.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The only React state: whether to give up on WebGL and show the CSS gradient.
  const [failed, setFailed] = useState(false);

  // useEffect runs after the canvas is on the page (never on the server). Everything it starts
  // (GL objects, observers, listeners, the frame loop) is undone by the function it returns,
  // which React calls on unmount and before re-running when `frozen` changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { setFailed(true); return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, SILK_FRAGMENT);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const release = () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
    if (!vs || !fs || !program || !buffer) { release(); setFailed(true); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[silk] link failed:', gl.getProgramInfoLog(program));
      release(); setFailed(true); return;
    }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const colors = new Float32Array(8 * 3); // u_colors[8]; only the first four are used
    colors.set(COLORS);
    gl.uniform3fv(at('u_colors'), colors);
    gl.uniform4fv(at('u_shape'), SHAPE);
    gl.uniform4fv(at('u_surface'), SURFACE);
    gl.uniform4fv(at('u_finish'), FINISH);
    gl.uniform4fv(at('u_transform'), TRANSFORM);
    gl.uniform4fv(at('u_space'), SPACE);
    gl.uniform4fv(at('u_cursor'), CURSOR);
    const scene = at('u_scene');

    let seconds = frozen ? STILL_SECONDS : 0; // only advances while the loop runs
    const draw = () => {
      gl.uniform4f(scene, canvas.width, canvas.height, seconds * TIME_SCALE, COLOR_COUNT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Match the drawing buffer to the canvas's CSS size times the (capped) pixel ratio.
    // Returns true when the size actually changed (resizing clears the buffer).
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height) return false;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    };

    // The frame loop. `last` is the previous frame's timestamp; a pause resets it, so time
    // resumes where it stopped instead of jumping ahead by however long the pause lasted.
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      if (last) seconds += Math.min(now - last, 100) / 1000;
      last = now;
      draw();
      raf = requestAnimationFrame(frame);
    };
    let onScreen = false;
    const sync = () => {
      const run = !frozen && onScreen && document.visibilityState === 'visible';
      if (run && !raf) raf = requestAnimationFrame(frame);
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    };

    // Resize: ResizeObserver can fire several times per frame, so the work waits for the next
    // animation frame, and only touches the canvas when the size really changed.
    let resizeFrame = 0;
    const resizer = new ResizeObserver(() => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        if (fit() && !raf) draw(); // the loop redraws by itself; a paused or still canvas needs one
      });
    });
    resizer.observe(canvas);

    const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
    visibility.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    // A lost context (GPU reset, too many contexts) leaves a blank canvas: show the gradient.
    const onLost = () => { cancelAnimationFrame(raf); raf = 0; setFailed(true); };
    canvas.addEventListener('webglcontextlost', onLost);

    fit();
    draw(); // the first frame, at once, so there is never an empty canvas

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      resizer.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', onLost);
      release();
    };
  }, [frozen]);

  return (
    <div className={className ? `silk ${className}` : 'silk'} data-failed={failed || undefined} aria-hidden="true">
      <canvas ref={canvasRef} className="silk-canvas" />
    </div>
  );
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('[silk] compile failed:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

export default Silk;
