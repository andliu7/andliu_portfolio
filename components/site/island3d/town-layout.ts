// The game island's map (public/island/src/world/map.js, layout()), ported as pure data for the
// page's 3D island. It follows the game's own numbers, so the page shows the same lopsided place as
// the game's overview (ref real-overview-wide.png), not a tidy rosette: a rounded square (exponent
// 4, so its corners run out into long lobes) with layered-sine wobble, a headland behind every
// landmark, three sea coves with ragged side arms, the dock harbour cutting the south-east corner
// into a thin tongue, the central lake at top centre draining west, east and north in long narrow
// channels, the south-east lake with its islet and the creek that splits the south into two
// peninsulas, the small pond in the north-east lobe, and the islets offshore. The roads are the
// game's: the outer loop, the lake loop, the spokes from the plaza and the two links, with a bridge
// wherever one crosses water.
//
// Everything is in the game's metres (x east, z south, the plaza at the origin); the scene scales it
// by S. The only changes from the game, so the water reads from the page's far camera: the outer
// landmarks stand at 114 m (not 110), the channels are a third wider, the cove mouths 20 m, and
// the lakes and the lake loop 1.15 times the game's round the lake's centre. The grid is 1 m, not
// 0.5 m: the page draws the island about 800 px across, so a metre is under 3 px.

export const S = 0.0347; // island units per metre: a landmark at 114 m stands at 3.96 units

type Zone = { id: string; x: number; z: number };
export type RoadPt = { x: number; z: number; s: number; tx: number; tz: number };
export type Road = { name: string; closed: boolean; pts: RoadPt[] };
export type Bridge = { road: number; a: number; b: number };

const D = Math.PI / 180;
const P = (R: number, deg: number): [number, number] => [R * Math.cos(deg * D), R * Math.sin(deg * D)];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Zone positions from public/island/src/data/zones.js (the outer eight pushed out to 114 m).
const RAW: Zone[] = [
  { id: 'blueberry', x: -3.8, z: -109.9 }, { id: 'brain', x: 80.6, z: -77.8 }, { id: 'studio', x: 107.7, z: 7.5 },
  { id: 'dock', x: 79.2, z: 82 }, { id: 'school', x: -3.8, z: 109.9 }, { id: 'umd', x: -80.6, z: 77.8 },
  { id: 'clinic', x: -107.9, z: -3.8 }, { id: 'chapel', x: -80.6, z: -77.8 },
  { id: 'skills', x: 48.9, z: -10.4 }, { id: 'yard', x: -43.3, z: 25 }, { id: 'now', x: 16, z: 44 }, { id: 'contact', x: 20, z: -24 },
];
export const ZONES: Zone[] = RAW.map((z, i) => {
  if (i >= 8) return z;
  const r = Math.hypot(z.x, z.z), k = 114 / r;
  return { id: z.id, x: z.x * k, z: z.z * k };
});

// Uniform Catmull-Rom through 2D points, resampled every `step` metres with unit tangents (map.js).
function crSample(pts: [number, number][], closed: boolean, step: number): RoadPt[] {
  const n = pts.length, dense: [number, number][] = [];
  const ext = (a: [number, number], b: [number, number]): [number, number] => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const get = (k: number) => closed ? pts[((k % n) + n) % n] : k < 0 ? ext(pts[0], pts[1]) : k >= n ? ext(pts[n - 1], pts[n - 2]) : pts[k];
  const segs = closed ? n : n - 1;
  for (let s = 0; s < segs; s++) {
    const p0 = get(s - 1), p1 = get(s), p2 = get(s + 1), p3 = get(s + 2);
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(closed ? dense[0] : pts[n - 1]);
  const out: RoadPt[] = [];
  let acc = 0, next = 0;
  for (let k = 1; k < dense.length; k++) {
    const a = dense[k - 1], b = dense[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) continue;
    while (next <= acc + L) { const u = (next - acc) / L; out.push({ x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, s: next, tx: 0, tz: 0 }); next += step; }
    acc += L;
  }
  if (closed && out.length > 2 && Math.hypot(out[out.length - 1].x - out[0].x, out[out.length - 1].z - out[0].z) < step * 0.5) out.pop();
  const m = out.length;
  for (let k = 0; k < m; k++) {
    const a = closed ? out[(k - 1 + m) % m] : out[Math.max(0, k - 1)], b = closed ? out[(k + 1) % m] : out[Math.min(m - 1, k + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    out[k].tx = dx / l; out[k].tz = dz / l;
  }
  return out;
}

export function townLayout() {
  const Z = (id: string) => ZONES.find(z => z.id === id)!;
  const radOf = (z: Zone) => Math.hypot(z.x, z.z), angOf = (z: Zone) => Math.atan2(z.z, z.x);
  const front = (id: string, d = 17): [number, number] => { const z = Z(id), R = radOf(z), s = (R - d) / R; return [z.x * s, z.z * s]; };
  const outer = ZONES.slice(0, 8), dock = Z('dock');

  // the coves: bearing, head radius, mouth width, bend; the last is the dock's harbour (no side arm)
  const COVES = [
    { deg: 24, head: 86, mouth: 20, bend: 6, arm: true }, { deg: 114, head: 88, mouth: 20, bend: -5, arm: true },
    { deg: -158, head: 94, mouth: 20, bend: 5, arm: true }, { deg: 46, head: 124, mouth: 22, bend: 0, arm: false },
  ];
  function coast(a: number) {
    const q = Math.pow(Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4), 1 / 4);
    let c = 135 / q + 3 * Math.sin(3 * a + 0.7) + 2.5 * Math.sin(5 * a + 2.1) + 2 * Math.sin(11 * a + 0.3) + 1.5 * Math.sin(17 * a + 1);
    for (const z of outer) { if (z === dock) continue; const d = wrap(a - angOf(z)); c = Math.max(c, radOf(z) + 17 - 176 * d * d); }
    { const d = wrap(a - angOf(dock)); c = Math.min(c, radOf(dock) + 3 + 300 * d * d); }
    for (const cv of COVES) { if (!cv.arm) continue; const d = wrap(a - cv.deg * D); c -= 9 * Math.exp(-(d / 0.2) * (d / 0.2)); }
    return c;
  }

  // 1 m grid over the island and its islets
  const N = 368, RES = 1, MIN = -184;
  const land = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    const z = MIN + (j + 0.5) * RES;
    for (let i = 0; i < N; i++) {
      const x = MIN + (i + 0.5) * RES, r = Math.hypot(x, z);
      land[j * N + i] = r < 90 ? 1 : r > 174 ? 0 : r < coast(Math.atan2(z, x)) ? 1 : 0;
    }
  }
  function stamp(cx: number, cz: number, r: number, val: number, wob = 0, seed = 0) {
    const R = r * (1 + wob) + 1;
    const i0 = Math.max(0, Math.floor((cx - R - MIN) / RES)), i1 = Math.min(N - 1, Math.ceil((cx + R - MIN) / RES));
    const j0 = Math.max(0, Math.floor((cz - R - MIN) / RES)), j1 = Math.min(N - 1, Math.ceil((cz + R - MIN) / RES));
    for (let j = j0; j <= j1; j++) {
      const z = MIN + (j + 0.5) * RES;
      for (let i = i0; i <= i1; i++) {
        const x = MIN + (i + 0.5) * RES, dx = x - cx, dz = z - cz, th = Math.atan2(dz, dx);
        const rr = wob ? r * (1 + wob * Math.sin(3 * th + seed) * Math.cos(2 * th + seed * 1.7)) : r;
        if (dx * dx + dz * dz < rr * rr) land[j * N + i] = val;
      }
    }
  }
  const wobble = (s: number, seed: number) => 0.6 * Math.sin(s * 0.083 + seed) + 0.4 * Math.sin(s * 0.21 + seed * 2.3);
  function carve(ctrl: [number, number][], r0: number, r1: number, wob = 0.16, seed = 0, val = 0) {
    const pts = crSample(ctrl, false, 1), L = pts[pts.length - 1].s || 1;
    for (const p of pts) { const r = (r0 + (r1 - r0) * p.s / L) * (1 + wob * wobble(p.s, seed)); stamp(p.x, p.z, Math.max(0.8, r), val); }
    return pts;
  }

  // Lakes: overlapping wobbly blobs plus short tapering fingers.
  const K = 1.15; // the lakes' scale on the game's
  type Lake = { c: [number, number]; parts: [number, number, number][]; fingers: [number, number, number, number][]; islet?: [number, number, number] };
  const RAW_LAKES: Lake[] = [
    { c: [-20, -48], parts: [[0, 0, 18], [11, -6, 13], [-10, 6, 12], [-6, -11, 12], [9, 8, 9]],
      fingers: [[-150, 9, 5, 3], [-60, 8, 4.5, -3], [40, 7, 4.5, 2], [120, 8, 4, -3], [165, 7, 4, 3]] },
    { c: [42, 65], parts: [[0, 0, 13], [-6, 4, 9], [6, -5, 8]], fingers: [[130, 9, 4, 3], [175, 7, 3.5, -3], [-95, 7, 3.5, 2], [40, 4, 3, -2]], islet: [2, -1, 2.4] },
    { c: [32, -92], parts: [[0, 0, 12], [7, -4, 9], [-7, -3, 8]], fingers: [[-120, 9, 4, 3], [-60, 9, 3.5, -3], [-5, 8, 3.5, 2], [200, 6, 3, -2]] },
  ];
  const LAKES: Lake[] = RAW_LAKES.map(L => ({ ...L, parts: L.parts.map(([x, z, r]) => [x * K, z * K, r * K] as [number, number, number]),
    fingers: L.fingers.map(([d, l, w, b]) => [d, l * K, w * K, b] as [number, number, number, number]) }));
  LAKES.forEach((L, k) => {
    for (const [dx, dz, r] of L.parts) stamp(L.c[0] + dx, L.c[1] + dz, r, 0, 0.12, k * 2 + dx);
    const R0 = L.parts[0][2];
    L.fingers.forEach(([deg, len, w, bend], f) => {
      const ux = Math.cos(deg * D), uz = Math.sin(deg * D), px = -uz, pz = ux;
      const at = (t: number): [number, number] => [L.c[0] + ux * t, L.c[1] + uz * t];
      const m = at(R0 + len * 0.5);
      carve([at(R0 * 0.6), [m[0] + px * bend, m[1] + pz * bend], at(R0 + len)], w, w * 0.35, 0.12, k * 7 + f);
    });
  });
  // Rivers: the central lake drains east, west and north to the sea, splitting the island into
  // lobes; the creek runs from the south-east lake to the sea and cuts the south in two.
  const RIVERS: { ctrl: [number, number][]; r0: number; r1: number }[] = [
    { ctrl: [[-6, -50], [18, -58], [42, -50], [62, -40], [86, -44], [110, -37], [176, -40]], r0: 9, r1: 12.5 },
    { ctrl: [[-34, -42], [-52, -32], [-66, -14], [-75, 12], [-98, 29], [-122, 40], [-180, 54]], r0: 9, r1: 12.5 },
    { ctrl: [[-26, -58], [-34, -80], [-44, -102], [-52, -124], [-62, -180]], r0: 8.5, r1: 12.5 },
    { ctrl: [[46, 72], [46, 94], [50, 116], [58, 178]], r0: 7, r1: 10 },
  ];
  RIVERS.forEach((rv, k) => carve(rv.ctrl, rv.r0, rv.r1, 0.14, 11 + k * 5));
  // Coves: a channel in from the open sea to the head, wide at the mouth, with a side arm.
  COVES.forEach((cv, k) => {
    const mid = (180 + cv.head) / 2;
    carve([P(180, cv.deg), P(mid, cv.deg + cv.bend * 0.4), P(cv.head, cv.deg - cv.bend * 0.3)], cv.mouth, 8.5, 0.18, 31 + k * 3);
    if (!cv.arm) return;
    const side = cv.bend > 0 ? 1 : -1, at = P(cv.head + 14, cv.deg - cv.bend * 0.2);
    carve([at, P(cv.head + 8, cv.deg + side * 9), P(cv.head + 5, cv.deg + side * 14)], 5, 2, 0.12, 41 + k);
  });
  for (const L of LAKES) if (L.islet) stamp(L.c[0] + L.islet[0], L.c[1] + L.islet[1], L.islet[2], 1, 0.15, 3);
  // Islets just past the coast
  const ISLETS = ([[10, 6], [62, 5], [-40, 7], [150, 5.5], [-175, 4.5], [-100, 3.5], [-20, 3], [128, 3.2]] as [number, number][]).map(([deg, r], k) => {
    const R = coast(deg * D) + r + 7 + (k % 3) * 2, [x, z] = P(R, deg);
    stamp(x, z, r, 1, 0.18, k);
    return { x, z, r };
  });

  // Signed distance to the shore in metres, positive over water (two chamfer passes, map.js).
  function chamfer(src: number) {
    const d = new Float32Array(N * N), INF = 1e6, S2 = Math.SQRT2;
    for (let k = 0; k < N * N; k++) d[k] = land[k] === src ? 0 : INF;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; let v = d[k]; if (v === 0) continue;
      if (i > 0) v = Math.min(v, d[k - 1] + 1);
      if (j > 0) { v = Math.min(v, d[k - N] + 1); if (i > 0) v = Math.min(v, d[k - N - 1] + S2); if (i < N - 1) v = Math.min(v, d[k - N + 1] + S2); }
      d[k] = v;
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = j * N + i; let v = d[k]; if (v === 0) continue;
      if (i < N - 1) v = Math.min(v, d[k + 1] + 1);
      if (j < N - 1) { v = Math.min(v, d[k + N] + 1); if (i < N - 1) v = Math.min(v, d[k + N + 1] + S2); if (i > 0) v = Math.min(v, d[k + N - 1] + S2); }
      d[k] = v;
    }
    return d;
  }
  const dW = chamfer(1), dL = chamfer(0);
  const sdCell = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N) ? 30 : land[j * N + i] ? -dL[j * N + i] + 0.5 : dW[j * N + i] - 0.5;
  const sdAt = (x: number, z: number) => {
    const u = (x - MIN) / RES - 0.5, v = (z - MIN) / RES - 0.5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    return (sdCell(i, j) * (1 - fu) + sdCell(i + 1, j) * fu) * (1 - fv) + (sdCell(i, j + 1) * (1 - fu) + sdCell(i + 1, j + 1) * fu) * fv;
  };

  // Roads (map.js, the same hand-placed points), sampled every 2 m.
  const roads: Road[] = [];
  const road = (name: string, pts: [number, number][], closed = false) => roads.push({ name, closed, pts: crSample(pts, closed, 2) });
  const F = front;
  road('outer', [
    F('studio'), [76, 18], [64, 36], [63, 52], F('dock'), [54, 92], [28, 100], F('school'), [-14, 78], [-43, 62], F('umd'),
    [-82, 48], [-91, 27], F('clinic'), [-82, -18], [-74, -36], [-74, -50], F('chapel'), [-61, -90], [-46, -108], [-24, -106], F('blueberry'),
    [14, -80], [34, -72], [55, -68], F('brain'), [84, -53], [91, -27], [94, -12],
  ], true);
  // the lake loop, K times the game's round the lake's centre (-20, -48), as the lake is
  const lk = (x: number, z: number): [number, number] => [-20 + (x + 20) * K, -48 + (z + 48) * K];
  road('lake', ([[-18, -19], [4, -26], [14, -40], [12, -60], [0, -76], [-18, -80], [-40, -76], [-54, -62], [-58, -44], [-44, -21]] as [number, number][]).map(([x, z]) => lk(x, z)), true);
  road('east', [[8, -4], [18, -1], F('skills'), [29, -19], [50, -27], [70, -24], [92, -21]]);
  road('south', [[0, 8], [8, 18], F('now'), [-4, 34], [-8, 58], [-4, 78], F('school')]);
  road('west', [[-8, 4], [-20, 6], F('yard'), [-20, 30], [-35, 45], [-58, 51], [-82, 48]]);
  road('north', [[2, -8], F('contact'), lk(4, -26)]);
  road('nlink', [lk(-8, -79), [-6, -92], F('blueberry')]);
  road('wlink', [lk(-56, -54), [-68, -54], [-74, -50]]);

  const landAt = (x: number, z: number) => sdAt(x, z) < 0;
  const bridges: Bridge[] = [];
  roads.forEach((r, ri) => {
    const wet = r.pts.map(p => !landAt(p.x, p.z));
    for (let k = 0; k < wet.length; k++) {
      if (!wet[k]) continue;
      let e = k;
      for (;;) { let n = -1; for (let q = e + 1; q < Math.min(wet.length, e + 5); q++) if (wet[q]) n = q; if (n < 0) break; e = n; }
      bridges.push({ road: ri, a: Math.max(0, k - 3), b: Math.min(r.pts.length - 1, e + 3) });
      k = e;
    }
  });
  const onBridge = (ri: number, k: number) => bridges.some(b => b.road === ri && k >= b.a && k <= b.b);

  // Distance to the nearest road centreline, on a 2 m grid (for keeping trees off the roads).
  const N2 = 184, rd = new Float32Array(N2 * N2).fill(99 * 99);
  for (const r of roads) for (const p of r.pts) {
    const i0 = Math.max(0, Math.floor((p.x - 12 - MIN) / 2)), i1 = Math.min(N2 - 1, Math.ceil((p.x + 12 - MIN) / 2));
    const j0 = Math.max(0, Math.floor((p.z - 12 - MIN) / 2)), j1 = Math.min(N2 - 1, Math.ceil((p.z + 12 - MIN) / 2));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = MIN + i * 2 + 1 - p.x, dz = MIN + j * 2 + 1 - p.z, d2 = dx * dx + dz * dz, k = j * N2 + i;
      if (d2 < rd[k]) rd[k] = d2;
    }
  }
  const roadDistAt = (x: number, z: number) => {
    const i = Math.floor((x - MIN) / 2), j = Math.floor((z - MIN) / 2);
    return i < 0 || j < 0 || i >= N2 || j >= N2 ? 99 : Math.sqrt(rd[j * N2 + i]);
  };

  return { MIN, SIZE: N * RES, sdAt, roads, bridges, onBridge, roadDistAt, islets: ISLETS, zones: ZONES, coast };
}
export type TownLayout = ReturnType<typeof townLayout>;
