'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The Maryland flag waving behind College Park (Andrew 2026-10-06: "an animated flowing maryland
// flag ... with a 'flow' like wind blowing it every now and then").
//
// Built from the Canvas UI "Cloth" component he pasted (scratchpad cloth-spec.md): the same
// height-field simulation (a damped wave equation on a grid, driven by travelling wind waves and
// a slowly varying gust), the same cursor brush, the same fold lighting shaders. The difference:
// Cloth captured live HTML through an experimental browser API, so here the cloth is textured
// with the flag drawn once in code (drawMaryland below) on an offscreen 2D canvas. Pinned on the
// left edge like a flag on a pole. Its contact shadow pass is left out: the cloth is full bleed,
// so there is nothing for a shadow to fall on.
//
// Wind: a low base breeze, and every 5 to 11 seconds a gust that rises over about a second and
// dies away over a few. Paused off screen and while the tab is hidden. Reduced motion: the
// simulation runs a few seconds instantly and draws one still, gently folded frame. No WebGL2:
// the flat flag is drawn with the 2D canvas instead.
//
// Pattern: everything lives in one useEffect, outside React's render. The GL objects, the arrays
// and the frame loop are plain variables inside the effect, created on mount and freed by the
// cleanup it returns; React re-runs it only when the Motion setting changes.

const P = {
  wind: 1.6, // base breeze between gusts
  gustPeak: 2.4, // extra wind at the top of a gust
  speed: 0.55, // playback rate of the simulation
  amplitude: 40, // fold height, px
  drape: 26, // billow toward the viewer during a gust, px
  brush: 1.6, // cursor lift (0 disables)
  brushSize: 150, // cursor radius, px
  damping: 1.1,
  light: 0.55,
  sheen: 0.12,
  perspective: 1200,
};

const SEG = 96;
const NODES = SEG + 1;
const DT = 1 / 120;
const STIFFNESS = 0.55;
const FORCE_GAIN = 5.0;
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
    if (!gl) {
      // No WebGL2: the flat flag, drawn straight onto the canvas.
      const draw = () => {
        const dpr = pixelRatio(host);
        canvas.width = Math.round(host.clientWidth * dpr); canvas.height = Math.round(host.clientHeight * dpr);
        const g = canvas.getContext('2d');
        if (g) drawMaryland(g, canvas.width, canvas.height);
      };
      draw();
      const ro = new ResizeObserver(draw);
      ro.observe(host);
      return () => ro.disconnect();
    }

    // ---------- GL setup ----------
    const prog = gl.createProgram()!;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
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

    // ---------- Simulation state ----------
    const h = new Float32Array(N), v = new Float32Array(N);
    let W = 1, H = 1, CW = 1, CH = 1; // frame and cloth size, CSS px
    let ax = 1, ay = 1, K = 1000;
    let t = 0, gust = 0.4, gustAt = 4 + Math.random() * 4, gustStart = -100;
    const pointer = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, inside: false, speed: 0 };

    const resize = () => {
      const dpr = pixelRatio(host);
      W = Math.max(host.clientWidth, 1); H = Math.max(host.clientHeight, 1);
      CW = W + MARGIN * 2; CH = H + MARGIN * 2;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Equal physical wave speed both ways on non-square cells, and a stable explicit step.
      const cx = CW / SEG, cy = CH / SEG;
      ax = 1; ay = (cx / cy) ** 2;
      K = (STIFFNESS * 0.9) / (DT * DT * 2 * (ax + ay));
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flagCanvas(CW, CH));
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    // Gusts "every now and then": a slow breathing base (Cloth's own gust curve, scaled down),
    // plus a gust every 5 to 11 seconds that rises in about a second and decays over a few.
    const windNow = () => {
      const base = Math.max(0.55 + 0.35 * Math.sin(t * 0.31 + 1.3) + 0.25 * Math.sin(t * 0.83) * (0.5 + 0.5 * Math.sin(t * 0.17)), 0.15);
      if (t > gustAt) { gustStart = t; gustAt = t + 5 + Math.random() * 6; }
      const s = t - gustStart;
      const g = s < 0 ? 0 : s < 1.1 ? Math.sin((s / 1.1) * Math.PI * 0.5) : Math.exp(-(s - 1.1) / 1.6);
      return (P.wind * base + P.gustPeak * g) / (P.wind + P.gustPeak);
    };

    const stepSim = () => {
      const target = windNow();
      gust += (target - gust) * 0.02;
      const force = FORCE_GAIN * gust * 12;
      const damp = P.damping * 1.6;
      // The cursor, spring-followed, lifts the cloth under it (Cloth's touchImprint).
      const sigX = P.brushSize / (CW / SEG), sigY = P.brushSize / (CH / SEG);
      const bi = ((pointer.sx + MARGIN) / CW) * SEG, bj = ((pointer.sy + MARGIN) / CH) * SEG;
      const brush = pointer.inside && P.brush > 0 ? P.brush * (0.25 + Math.min(pointer.speed / 900, 1)) : 0;
      for (let j = 1; j < SEG; j++) {
        const vj = j / SEG;
        for (let i = 1; i <= SEG; i++) {
          const k = j * NODES + i;
          const ui = i / SEG;
          // The free edge has one neighbour on the x side: mirror it.
          const right = i < SEG ? h[k + 1] : h[k - 1];
          const lap = (h[k - 1] + right - 2 * h[k]) * ax + (h[k - NODES] + h[k + NODES] - 2 * h[k]) * ay;
          // Wind: waves travelling away from the pole, stronger toward the free edge.
          const f = force * Math.pow(ui, 1.2) * (Math.sin(Math.PI * 2 * (3.2 * ui + 0.35 * vj) - t * 3.4) + 0.45 * Math.sin(Math.PI * 2 * (1.4 * vj + 0.8 * ui) - t * 2.1));
          let acc = K * lap + f - damp * v[k];
          if (brush) {
            const dx = (i - bi) / sigX, dy = (j - bj) / sigY;
            const d2 = dx * dx + dy * dy;
            if (d2 < 9) acc += brush * 60 * Math.exp(-d2 * 0.5);
          }
          v[k] += acc * DT;
        }
      }
      for (let k = 0; k < N; k++) h[k] += v[k] * DT;
      // Top and bottom rows follow their neighbours (free hem); the pole column stays at rest.
      for (let i = 0; i < NODES; i++) { h[i] = h[NODES + i]; h[SEG * NODES + i] = h[(SEG - 1) * NODES + i]; }
      for (let j = 0; j < NODES; j++) { h[j * NODES] = 0; v[j * NODES] = 0; }
      t += DT;
    };

    const z = new Float32Array(N);
    const composeVertices = () => {
      const cx = CW / SEG, cy = CH / SEG;
      for (let j = 0; j < NODES; j++) {
        const vj = j / SEG;
        for (let i = 0; i < NODES; i++) {
          const ui = i / SEG;
          const hang = Math.sin(ui * Math.PI * 0.5) * Math.sin(vj * Math.PI); // billow, zero at the pole
          z[j * NODES + i] = P.amplitude * Math.tanh(h[j * NODES + i]) + P.drape * hang * (0.3 + 0.7 * gust) - P.drape * 0.3;
        }
      }
      for (let j = 0; j < NODES; j++) {
        // Foreshortening: a folded row covers less width than its rest length (arc length).
        let run = 0;
        for (let i = 0; i < NODES; i++) {
          const k = j * NODES + i;
          if (i > 0) { const dz = z[k] - z[k - 1]; run += Math.sqrt(Math.max(cx * cx - dz * dz, cx * cx * 0.25)); }
          offset[k * 2] = run - i * cx;
          offset[k * 2 + 1] = 0;
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

    resize();

    if (reduced) {
      // One still frame: let the breeze shape a few gentle folds, then draw once.
      gustAt = 1e9;
      for (let s = 0; s < 600; s++) stepSim();
      render();
      const ro = new ResizeObserver(() => { resize(); render(); });
      ro.observe(host);
      return () => { ro.disconnect(); destroy(); };
    }

    // ---------- The loop ----------
    let raf = 0, last = 0, acc = 0, onScreen = false;
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      const follow = 1 - Math.exp(-dt * 12);
      const px = pointer.sx;
      pointer.sx += (pointer.x - pointer.sx) * follow; pointer.sy += (pointer.y - pointer.sy) * follow;
      pointer.speed = dt > 0 ? Math.abs(pointer.sx - px) / dt : 0;
      acc += dt * P.speed;
      let steps = 0;
      while (acc >= DT && steps < 8) { stepSim(); acc -= DT; steps++; }
      if (steps === 8) acc = 0;
      render();
      schedule();
    };
    const schedule = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };
    // last = 0 makes the first frame after a pause count as zero time, so the cloth does not jump.
    const pause = () => { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; };

    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) schedule(); else pause(); });
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
    }

    return () => {
      pause(); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      destroy();
    };
  }, [reduced]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export default MarylandFlag;
