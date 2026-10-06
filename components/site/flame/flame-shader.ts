// The flame wrap's settings and shaders, ported from Andrew's own Focus Family technical guide
// (ff_technical_instructions/repo2/index.html, "Flame wrap": FLAME, FLAME_VERT, FLAME_FRAG), which
// itself reimplements the idea of canvas-ui's FlameWrap with a shader written from scratch.
// Changes from the guide: the guide's purple is now the site's berry for the outer flame with
// apricot for the hot core (uHot replaces the guide's mix toward white), and the intensity is
// lower so the fire stays a frame round the card, never a cover over it.

/** Colours as 0..1 RGB. berry-2 #5b6fd6 (fills only, never text) and apricot #ffcf98. */
export const FLAME = {
  color: [0.357, 0.435, 0.839],
  hot: [1, 0.812, 0.596],
  intensity: 0.55,
  speed: 0.4,
  scale: 0.72,
  turbulence: 0.49,
  turbulenceScale: 0.8,
  sparks: 1.6,
  sparkSize: 0.6,
  sparkDensity: 0.9,
  sparkSpeed: 1,
  rim: 1.6,
  smoke: 1.2,
} as const;

export const FLAME_VERT = 'attribute vec2 aPos; void main () { gl_Position = vec4(aPos, 0.0, 1.0); }';

export const FLAME_FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uCenter; uniform vec2 uHalf; uniform float uRadius;
uniform vec3 uColor; uniform vec3 uHot; uniform float uIntensity; uniform float uHeight; uniform float uSpread; uniform float uScale;
uniform float uTurb; uniform float uTurbScale; uniform float uSparks; uniform float uSparkSize;
uniform float uSparkDensity; uniform float uSparkSpeed; uniform float uRim; uniform float uSmoke;
float hash (vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise (vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm (vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.02 + vec2(17.1, 9.7); a *= 0.5; }
  return v;
}
float sdBox (vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main () {
  vec2 p = gl_FragCoord.xy - uCenter;
  float r = min(uRadius, min(uHalf.x, uHalf.y));
  float d = sdBox(p, uHalf, r);
  float t = uTime;
  float unit = max(uHeight, 16.0);
  // Above the top edge the fire may lick up to uHeight; round the sides and bottom it only glows out to uSpread.
  float over = smoothstep(-uHalf.y, uHalf.y * 0.6, p.y) * (1.0 - smoothstep(uHalf.x - r * 0.3, uHalf.x + uSpread, abs(p.x)));
  float reach = mix(uSpread, uHeight, over);
  // Noise that rises with time, swayed by a few sine warps: the turbulence.
  float detail = mix(0.6, 2.2, clamp(uScale, 0.0, 1.0));
  vec2 q = vec2(p.x, p.y - t * unit * 1.4) / unit * detail * 3.0;
  float fq = uTurbScale * 2.0;
  for (int i = 0; i < 4; i++) {
    q += uTurb * 0.35 * vec2(sin(q.y * fq + t * 3.0 + float(i) * 1.7), cos(q.x * fq * 0.8 - t * 2.1 + float(i) * 2.3)) / fq;
    fq *= 1.6;
  }
  float n = fbm(q);
  float k = max(d, 0.0) / reach;
  float slope = mix(1.1, 0.78, over);
  float dens = clamp((n * 1.25 - k * (slope + 0.45 * n) + 0.1 * (1.0 - k)) * 2.2, 0.0, 1.0) * smoothstep(-1.0, 1.5, d);
  float body = dens * dens * (3.0 - 2.0 * dens);
  float e = body * uIntensity * 1.6;
  float ramp = 1.0 - exp(-e * 2.5);
  vec3 col = mix(uColor * 0.8, uColor, smoothstep(0.0, 0.5, ramp));
  // The hot core, nearest the card, burns apricot.
  col = mix(col, uHot, smoothstep(0.55, 1.0, ramp * (1.0 - k * 0.6)));
  float a = clamp(1.0 - exp(-e * 3.0), 0.0, 1.0);
  // A molten rim hugging the outline, and a soft halo past it.
  float rim = exp(-abs(d) / 1.6) * uRim * 0.35 * (0.6 + 0.4 * n);
  float halo = exp(-max(d, 0.0) / (uSpread * 1.1)) * smoothstep(0.0, 2.0, d) * uRim * 0.12 * uIntensity;
  col = col * a + uHot * rim * uIntensity + uColor * halo;
  a = clamp(a + rim * uIntensity * 0.8 + halo * 0.6, 0.0, 1.0);
  // Sparks: one per lit cell, drifting up and twinkling, only above the top.
  if (uSparks > 0.0) {
    float cells = 6.0 * uSparkDensity;
    vec2 sp = vec2(p.x, p.y - t * unit * 0.9 * uSparkSpeed) / unit * cells;
    vec2 id = floor(sp); vec2 fr = fract(sp);
    float h = hash(id); float h2 = hash(id + 7.3);
    vec2 c = vec2(0.2 + 0.6 * h, 0.2 + 0.6 * h2);
    c.x += 0.15 * sin(t * 2.0 + h * 6.28);
    float s = length((fr - c) / cells * unit);
    float size = (0.6 + 1.6 * h2) * uSparkSize;
    float tw = step(0.55, h) * (0.5 + 0.5 * sin(t * (5.0 + 6.0 * h2) + h * 12.0));
    float gate = over * smoothstep(0.0, 0.3, k) * (1.0 - smoothstep(0.7, 1.4, k));
    float spark = exp(-s * s / (size * size)) * tw * gate * uSparks;
    col += uHot * spark;
    a = clamp(a + spark * 0.8, 0.0, 1.0);
  }
  // Smoke: a faint wisp where the flames give out.
  float wisp = smoothstep(0.5, 0.85, fbm(q * 0.5 + 11.0)) * smoothstep(0.7, 1.0, k) * (1.0 - smoothstep(1.0, 1.6, k)) * over;
  float sA = wisp * 0.06 * uSmoke;
  col += mix(vec3(0.5), uColor, 0.5) * sA;
  a = clamp(a + sA, 0.0, 1.0);
  // Fade at the canvas bounds so nothing ends in a straight line.
  vec2 edge = min(gl_FragCoord.xy, uRes - gl_FragCoord.xy);
  float fade = smoothstep(0.0, 12.0, edge.x) * smoothstep(0.0, 12.0, edge.y);
  gl_FragColor = vec4(col * fade, a * fade);
}`;
