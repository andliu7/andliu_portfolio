'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { useAfterLoad } from '@/components/site/after-load';

// The Maryland flag waving behind College Park (Andrew 2026-10-06: "an animated flowing maryland
// flag ... with a 'flow' like wind blowing it every now and then").
//
// Rendering comes from the Canvas UI "Cloth" component he pasted (scratchpad cloth-spec.md; Canvas
// UI is MIT + Commons Clause, free to use in a site): its grid mesh, foreshortening and fold
// lighting shaders. Cloth captured live HTML through an experimental browser API, so here the
// cloth is textured with the flag drawn once in code (drawMaryland below). Its contact shadow is
// left out: the cloth is full bleed, so there is nothing for a shadow to fall on.
//
// Motion (reworked 2026-10-07, Andrew: "it should be a couple of wave ripples through the entire
// flag"): Cloth's wave-equation solver is gone, because driven and reflecting off the hems it
// broke into local, blotchy jitter. The surface is now a formula of position and time: two to
// three long waves travel from the pole to the free edge, growing toward the free edge, with a
// small faster flutter on top. Same input, same shape, so it can never turn chaotic. The cursor
// gently deepens the waves passing under it. Paused off screen and while the tab is hidden.
// Reduced motion: one still frame of the same wave.
//
// Load reveal (Andrew 2026-10-07: "the maryland page can do a load reveal if it doesn't have the
// flag rendered"): the canvas exists only once the loader has lifted (useAfterLoad, so WebGL
// setup never lands in hydration) and within one screen of the viewport, and is removed again
// (its WebGL context freed) two screens away. Until its first frame is drawn, umd.css clips it
// away and the section's red shows under the shade; the first frame sets data-ready and it wipes
// in from the pole. No WebGL2, or shaders that will not compile: the red simply stays.
//
// Pattern: everything lives in one useEffect, outside React's render. The GL objects, the arrays
// and the frame loop are plain variables inside the effect, created on mount and freed by the
// cleanup it returns; React re-runs it only when the Motion setting changes.

const P = {
  waves: 2.3, // wavelengths across the cloth, pole to free edge
  hz: 0.4, // crests per second leaving the pole (a crest crosses in about 6 s)
  slant: 0.3, // crests lean this many wavelengths from top to bottom, as on a real flag
  amplitude: 56, // main fold height at the free edge, px
  ripple: 16, // the same waves bending the pattern up and down, px (what makes them read on a full-bleed flag)
  flutter: 0.16, // the faster small ripple, as a share of the main wave
  drape: 22, // a still billow toward the viewer through the middle of the fly, px
  cursor: 0.35, // how much the waves deepen under the cursor (0 disables)
  cursorSize: 240, // cursor radius, px
  light: 0.7,
  sheen: 0.12,
  perspective: 1200,
};

const SEG = 96;
const NODES = SEG + 1;
const TAU = Math.PI * 2;
const MARGIN = 72; // the cloth overhangs the frame on every side, so folds never open a gap

const GOLD = '#FFD200';
const BLACK = '#000000';
const RED = '#E21833';
const WHITE = '#FFFFFF';

// ---------- The flag, drawn in code ----------
// Quarterly: 1st and 4th the Calvert arms (paly of six gold and black, a bend counterchanged),
// 2nd and 3rd the Crossland arms (quartered white and red, a cross bottony counterchanged).
function calvert(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pales = (swap: boolean) => {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = (i % 2 === 0) !== swap ? GOLD : BLACK;
      g.fillRect(x + (i * w) / 6, y, w / 6 + 0.5, h);
    }
  };
  pales(false);
  // The bend: a band from the top left corner to the bottom right, its colours swapped.
  const len = Math.hypot(w, h);
  const nx = -h / len, ny = w / len; // unit normal to the diagonal
  const b = Math.min(w, h) * 0.17; // half the band's width
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.beginPath();
  g.moveTo(x - w * 0.2 + nx * b, y - h * 0.2 + ny * b);
  g.lineTo(x + w * 1.2 + nx * b, y + h * 1.2 + ny * b);
  g.lineTo(x + w * 1.2 - nx * b, y + h * 1.2 - ny * b);
  g.lineTo(x - w * 0.2 - nx * b, y - h * 0.2 - ny * b);
  g.closePath(); g.clip();
  pales(true);
  g.restore();
}

function crossland(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2, cy = y + h / 2;
  const field = (swap: boolean) => {
    const a = swap ? RED : WHITE, c = swap ? WHITE : RED;
    g.fillStyle = a; g.fillRect(x, y, w / 2 + 0.5, h / 2 + 0.5); g.fillRect(cx, cy, w / 2, h / 2);
    g.fillStyle = c; g.fillRect(cx, y, w / 2, h / 2 + 0.5); g.fillRect(x, cy, w / 2 + 0.5, h / 2);
  };
  field(false);
  // The cross bottony: two bars, each end finished with three round lobes.
  const t = Math.min(w, h) * 0.07; // half the bar thickness
  const r = t * 0.95; // lobe radius
  const ex = w / 2 - r * 2.1, ey = h / 2 - r * 2.1; // arm reach from the centre
  const cross = new Path2D();
  cross.rect(cx - t, cy - ey, t * 2, ey * 2);
  cross.rect(cx - ex, cy - t, ex * 2, t * 2);
  const lobes = (px: number, py: number, dx: number, dy: number) => {
    // (dx, dy) points outward along the arm; the side lobes sit a little back from the tip.
    for (const [ox, oy] of [[dx * r, dy * r], [-dy * r * 1.05 - dx * r * 0.2, dx * r * 1.05 - dy * r * 0.2], [dy * r * 1.05 - dx * r * 0.2, -dx * r * 1.05 - dy * r * 0.2]]) {
      cross.moveTo(px + ox + r, py + oy);
      cross.arc(px + ox, py + oy, r, 0, Math.PI * 2);
    }
  };
  lobes(cx, cy - ey, 0, -1); lobes(cx, cy + ey, 0, 1); lobes(cx - ex, cy, -1, 0); lobes(cx + ex, cy, 1, 0);
  g.save();
  g.clip(cross);
  field(true);
  g.restore();
}

export function drawMaryland(g: CanvasRenderingContext2D, w: number, h: number) {
  const hw = w / 2, hh = h / 2;
  calvert(g, 0, 0, hw, hh);
  crossland(g, hw, 0, hw, hh);
  crossland(g, 0, hh, hw, hh);
  calvert(g, hw, hh, hw, hh);
}

// ---------- Shaders (Cloth's cloth pass; corner radius 0, light mode) ----------
const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aGrid;
layout(location = 1) in vec4 aData;
layout(location = 2) in vec2 aOffset;
uniform vec2 uRes;
uniform vec2 uOut;
uniform float uBleed;
uniform float uFocal;
out vec2 vUv;
out vec3 vNormal;
out float vFold;
void main () {
  vUv = aGrid;
  float z = aData.x;
  vec2 nxy = aData.yz;
  vNormal = vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.04)));
  vFold = aData.w;
  vec2 px = aGrid * uRes + aOffset + vec2(uBleed);
  vec2 ndc = (px / uOut) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  float w = (uFocal - z) / uFocal;
  gl_Position = vec4(ndc, -z / uFocal, w);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vNormal;
in float vFold;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uLight;
uniform float uSheen;
void main () {
  vec3 fabric = texture(uContent, clamp(vUv, vec2(0.001), vec2(0.999))).rgb;
  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(-0.3, 0.42, 0.86));
  float diffFlat = 0.58 + 0.42 * lightDir.z;
  float diff = 0.58 + 0.42 * dot(n, lightDir);
  float shade = mix(1.0, (diff / diffFlat) * vFold, uLight);
  vec3 lit = fabric * shade;
  vec3 halfway = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float specFlat = pow(halfway.z, 34.0);
  float spec = max(pow(max(dot(n, halfway), 0.0), 34.0) - specFlat, 0.0) / (1.0 - specFlat);
  lit += uSheen * spec * mix(vec3(1.0), fabric, 0.35);
  outColor = vec4(clamp(lit, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

function pixelRatio(el: HTMLElement) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const area = Math.max(el.clientWidth, 1) * Math.max(el.clientHeight, 1);
  return Math.min(ratio, Math.sqrt(8_000_000 / area)); // keep big screens under ~8M pixels
}


export function MarylandFlag({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const loaded = useAfterLoad();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Two IntersectionObservers with different margins: mount within one screen, unmount beyond
    // two, so scrolling to and fro at one boundary does not rebuild the GL scene each time.
    const mount = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '100% 0px' });
    const unmount = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setNear(false); }, { rootMargin: '200% 0px' });
    mount.observe(el); unmount.observe(el);
    return () => { mount.disconnect(); unmount.disconnect(); };
  }, []);

  return <div ref={ref} className={className} aria-hidden="true">{loaded && near && <FlagCanvas />}</div>;
}

function FlagCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement ?? canvas;

    // The flag texture, sized to the cloth (frame plus margin) so its quarters keep the frame's shape.
    const flagCanvas = (w: number, h: number) => {
      const k = Math.min(2048 / Math.max(w, h), 2);
      const c = document.createElement('canvas');
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      drawMaryland(c.getContext('2d')!, c.width, c.height);
      return c;
    };

    const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) return; // no WebGL2: the placeholder red stays

    // ---------- GL setup ----------
    let vs: WebGLShader, fs: WebGLShader;
    try { vs = compile(gl, gl.VERTEX_SHADER, VERT); fs = compile(gl, gl.FRAGMENT_SHADER, FRAG); } catch { return; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u('uRes'), uOut = u('uOut'), uBleed = u('uBleed'), uFocal = u('uFocal'), uLight = u('uLight'), uSheen = u('uSheen');

    const N = NODES * NODES;
    const grid = new Float32Array(N * 2);
    for (let j = 0; j < NODES; j++) for (let i = 0; i < NODES; i++) { grid[(j * NODES + i) * 2] = i / SEG; grid[(j * NODES + i) * 2 + 1] = j / SEG; }
    const index = new Uint32Array(SEG * SEG * 6);
    let q = 0;
    for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) {
      const a = j * NODES + i, b = a + 1, c = a + NODES, d = c + 1;
      index.set([a, c, b, b, c, d], q); q += 6;
    }
    const data = new Float32Array(N * 4); // z, normal x, normal y, fold
    const offset = new Float32Array(N * 2); // foreshortening, px

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffer = (attr: number, size: number, arr: Float32Array, usage: number) => {
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, usage);
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const gridBuf = buffer(0, 2, grid, gl.STATIC_DRAW);
    const dataBuf = buffer(1, 4, data, gl.DYNAMIC_DRAW);
    const offBuf = buffer(2, 2, offset, gl.DYNAMIC_DRAW);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const tex = gl.createTexture()!;

    // ---------- State ----------
    let W = 1, H = 1, CW = 1, CH = 1; // frame and cloth size, CSS px
    let t = 0;
    // x, y: the cursor; sx, sy: a softly following copy; k: its strength, eased in and out.
    const pointer = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, inside: false, k: 0 };

    const resize = () => {
      const dpr = pixelRatio(host);
      W = Math.max(host.clientWidth, 1); H = Math.max(host.clientHeight, 1);
      CW = W + MARGIN * 2; CH = H + MARGIN * 2;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flagCanvas(CW, CH));
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    // The surface at time t: height toward the viewer, px, for every grid node. u runs from the
    // pole (0) to the free edge (1), v from top to bottom.
    const z = new Float32Array(N);
    const dy = new Float32Array(N); // vertical shift of each node, px
    const shapeCloth = () => {
      const breathe = 0.88 + 0.12 * Math.sin(t * 0.23); // the breeze swells and eases slowly
      // The cursor, in grid units, and its Gaussian radius.
      const pu = (pointer.sx + MARGIN) / CW, pv = (pointer.sy + MARGIN) / CH;
      const ru = P.cursorSize / CW, rv = P.cursorSize / CH;
      for (let j = 0; j < NODES; j++) {
        const vj = j / SEG;
        for (let i = 0; i < NODES; i++) {
          const ui = i / SEG;
          // Main wave: long crests leaving the pole, leaning slightly, deepening toward the fly.
          const main = Math.sin(TAU * (P.waves * ui + P.slant * vj - P.hz * t));
          // Flutter: a shorter, faster ripple that only shows near the free edge.
          const flutter = P.flutter * ui * Math.sin(TAU * (2.1 * P.waves * ui - 0.2 * vj - 2.3 * P.hz * t) + 1.7);
          // A slow sway along the height, so crests are not ruler straight.
          const sway = 0.12 * Math.sin(TAU * (0.7 * vj - 0.11 * t) + 2.5 * ui);
          let lift = 1;
          if (pointer.k > 0.001) {
            const du = (ui - pu) / ru, dv = (vj - pv) / rv;
            lift += P.cursor * pointer.k * Math.exp(-(du * du + dv * dv) * 0.5);
          }
          const env = Math.pow(ui, 0.8) * breathe * lift; // zero at the pole, full at the free edge
          const billow = P.drape * Math.sin(ui * Math.PI * 0.6) * Math.sin(vj * Math.PI) - P.drape * 0.4;
          z[j * NODES + i] = P.amplitude * env * (main + flutter + sway) + billow;
          // A quarter wave behind the height, as a rippling flag rises into each crest.
          dy[j * NODES + i] = P.ripple * env * Math.cos(TAU * (P.waves * ui + P.slant * vj - P.hz * t));
        }
      }
    };

    const rowRun = new Float32Array(NODES);
    const composeVertices = () => {
      shapeCloth();
      const cx = CW / SEG, cy = CH / SEG;
      for (let j = 0; j < NODES; j++) {
        // Foreshortening: a sloped stretch of cloth covers less width than its rest length (arc
        // length), so the texture bunches on the folds. Each row is then stretched back to its rest
        // width so the free edge never pulls in and opens a gap at the frame's right side.
        let run = 0;
        rowRun[0] = 0;
        for (let i = 1; i < NODES; i++) {
          const dz = z[j * NODES + i] - z[j * NODES + i - 1];
          run += Math.sqrt(Math.max(cx * cx - dz * dz, cx * cx * 0.25));
          rowRun[i] = run;
        }
        const stretch = (SEG * cx) / run;
        for (let i = 0; i < NODES; i++) {
          const k = j * NODES + i;
          offset[k * 2] = rowRun[i] * stretch - i * cx;
          offset[k * 2 + 1] = dy[k];
          const l = z[j * NODES + Math.max(i - 1, 0)], r = z[j * NODES + Math.min(i + 1, SEG)];
          const up = z[Math.max(j - 1, 0) * NODES + i], dn = z[Math.min(j + 1, SEG) * NODES + i];
          let nx = -(r - l) / (2 * cx), ny = (dn - up) / (2 * cy);
          const len = Math.hypot(nx, ny, 1); nx /= len; ny /= len;
          const lap = (l + r - 2 * z[k]) / (cx * cx) + (up + dn - 2 * z[k]) / (cy * cy);
          data[k * 4] = z[k]; data[k * 4 + 1] = nx; data[k * 4 + 2] = ny;
          data[k * 4 + 3] = Math.min(1.06, Math.max(0.86, 1 - lap * 6));
        }
      }
    };

    const render = () => {
      composeVertices();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(uRes, CW, CH); gl.uniform2f(uOut, W, H); gl.uniform1f(uBleed, -MARGIN); gl.uniform1f(uFocal, P.perspective);
      gl.uniform1f(uLight, P.light); gl.uniform1f(uSheen, P.sheen);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, dataBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      gl.bindBuffer(gl.ARRAY_BUFFER, offBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, offset);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
    };

    // The first drawn frame uncovers the canvas top to bottom (umd.css). Leaving the screen clears
    // data-ready, so the reveal slides again each time the section comes back (Andrew 2026-10-07:
    // "always slides when you get to it so that it doesn't look like it glitches into the flag").
    const reveal = () => { if (!('ready' in canvas.dataset)) canvas.dataset.ready = ''; };

    resize();

    if (reduced) {
      // One still frame of the same wave, at a moment where its folds sit evenly across the flag.
      t = 1.1;
      render();
      reveal();
      const ro = new ResizeObserver(() => { resize(); render(); });
      ro.observe(host);
      return () => { ro.disconnect(); destroy(); };
    }

    // ---------- The loop ----------
    let raf = 0, last = 0, onScreen = false;
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      // The cursor's effect trails it softly and fades in and out over about half a second.
      const follow = 1 - Math.exp(-dt * 4);
      pointer.sx += (pointer.x - pointer.sx) * follow; pointer.sy += (pointer.y - pointer.sy) * follow;
      pointer.k += ((pointer.inside ? 1 : 0) - pointer.k) * (1 - Math.exp(-dt * 3));
      t += dt;
      render();
      reveal();
      schedule();
    };
    const schedule = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };
    // last = 0 makes the first frame after a pause count as zero time, so the cloth does not jump.
    const pause = () => { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; };

    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) schedule(); else { pause(); delete canvas.dataset.ready; } });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? pause() : schedule());
    document.addEventListener('visibilitychange', onVisibility);
    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= box.width && pointer.y <= box.height;
      if (pointer.sx < -1000) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const ro = new ResizeObserver(() => { resize(); if (!raf) render(); });
    ro.observe(host);

    function destroy() {
      if (!gl) return;
      gl.deleteBuffer(gridBuf); gl.deleteBuffer(dataBuf); gl.deleteBuffer(offBuf); gl.deleteBuffer(ibo);
      gl.deleteVertexArray(vao); gl.deleteTexture(tex);
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // free the context now, not at garbage collection
    }

    return () => {
      pause(); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      destroy();
    };
  }, [reduced]);

  return <canvas ref={ref} />;
}

export default MarylandFlag;
