import * as THREE from 'three';

// Moonlit shading for the island's own materials (island-scene.tsx), so the land, the buildings and
// the trees sit in the same night as the water and the sky instead of on top of it (Andrew
// 2026-11-11: "use the same stuff that you did for the water and the moon to also make the island
// more realistic"). It extends three's standard material through onBeforeCompile; nothing here adds
// a texture, a render target or a pass. Three kinds:
//
//   built   walls, roofs, roads, trunks, rocks: a little grain so no face is one flat colour, a
//           dark foot where an upright face meets the ground, a cool rim on the edges turned
//           toward the moon.
//   ground  the terrain: mottled grass and sand whose normal rolls a little (so the moonlight
//           breaks over it), and a wet shoreline: darker, glossier sand at the waterline that
//           reflects the horizon and carries the moon's glint up the beach.
//   leaf    crowns, conifers, fronds, grass: leaf clumps (the normal and the colour wander over the
//           crown), a dark underside, and moonlight coming through the edges from behind.
//
// All three fade a little into the horizon's colour with distance (the same colour the sky band and
// the far water use), so the far shore sits back in the night air.
//
// The light itself is the scene's one directional light, which island-scene.tsx aims from the
// moon's bearing (keyDir): the true moon hangs a couple of degrees over the horizon, too low to
// light a flat island, so the key keeps its bearing and is lifted to KEY_ELEV.

export type IsleKind = 'built' | 'ground' | 'leaf';

export const KEY_ELEV = (24 * Math.PI) / 180; // was 34; lower, nearer the moon in the sky, so shadows run long (Andrew 2026-11-11)
// Where the moonlight comes from (world space, unit): the scene updates it from moonDir each frame.
export const keyDir = new THREE.Vector3(-0.16, 0.56, -0.81).normalize();

export const isleU = {
  uIsleKey: { value: keyDir },
  uIsleMoon: { value: new THREE.Vector3(-0.2, 0.1, -1).normalize() }, // the scene points this at its moonDir
  uIsleMoonCol: { value: new THREE.Color('#e8ecff') },
  uIsleHaze: { value: new THREE.Color('#1d2453') },
  uIsleGround: { value: 0.06 },
};

const VERT_PARS = /* glsl */ `
  varying vec3 vIsleW; // world position
  varying vec3 vIsleO; // object position, offset per instance: where the leaf clumps are read
  varying float vIsleS; // the instance's size, so detail too fine for its pixels can fade
`;
const VERT_MAIN = /* glsl */ `
  {
    vec4 isleP = vec4(transformed, 1.0);
    vIsleO = position;
    vIsleS = 1.0;
    #ifdef USE_INSTANCING
      isleP = instanceMatrix * isleP;
      vIsleS = length(instanceMatrix[0].xyz);
      vIsleO += instanceMatrix[3].xyz * 31.0;
    #endif
    vIsleW = (modelMatrix * isleP).xyz;
  }
`;

const FRAG_PARS = /* glsl */ `
  uniform vec3 uIsleKey, uIsleMoon, uIsleMoonCol, uIsleHaze;
  uniform float uIsleGround;
  varying vec3 vIsleW;
  varying vec3 vIsleO;
  varying float vIsleS;

  float isleHash2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float isleNoise2(vec2 x) {
    vec2 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(isleHash2(i), isleHash2(i + vec2(1.0, 0.0)), f.x),
               mix(isleHash2(i + vec2(0.0, 1.0)), isleHash2(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float isleHash3(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float isleNoise3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(isleHash3(i), isleHash3(i + vec3(1.0, 0.0, 0.0)), f.x),
                   mix(isleHash3(i + vec3(0.0, 1.0, 0.0)), isleHash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(isleHash3(i + vec3(0.0, 0.0, 1.0)), isleHash3(i + vec3(1.0, 0.0, 1.0)), f.x),
                   mix(isleHash3(i + vec3(0.0, 1.0, 1.0)), isleHash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  }
  // The horizon's colour in a direction: the same formula as the sky band and the ocean's fog
  // (HORIZON_GLSL in island-scene.tsx), so the island's haze matches them.
  vec3 isleHorizon(vec3 dir) {
    float az = max(dot(normalize(dir.xz + vec2(1e-5)), normalize(uIsleMoon.xz)), 0.0);
    return uIsleHaze + uIsleMoonCol * (0.035 * az * az * az + 0.07 * pow(az, 18.0) + 0.06 * pow(az, 260.0));
  }
`;

// After the normal is known and before the lights: the surface itself (colour, roughness, normal).
const FRAG_SURFACE = /* glsl */ `
  vec3 isleN = inverseTransformDirection(normal, viewMatrix);
  vec3 isleToCam = cameraPosition - vIsleW;
  float isleDist = length(isleToCam);
  vec3 isleV = isleToCam / max(isleDist, 1e-4);
  float isleFw = length(fwidth(vIsleW)); // world units under one pixel
  float isleWet = 0.0;
  float isleUnder = 1.0;
  #if ISLE_KIND == 1
  {
    // grass and sand: a broad mottle that also rolls the normal, and a finer grain up close
    vec2 gp = vIsleW.xz;
    float fine = 1.0 - smoothstep(0.05, 0.16, isleFw);
    float g1 = isleNoise2(gp * 2.3 + 3.1);
    float g2 = isleNoise2(gp * 9.0);
    diffuseColor.rgb *= 1.0 + (g1 - 0.5) * 0.24 + (g2 - 0.5) * 0.22 * fine;
    const float e = 0.07;
    vec2 gs = vec2(isleNoise2((gp + vec2(e, 0.0)) * 2.3 + 3.1) - g1, isleNoise2((gp + vec2(0.0, e)) * 2.3 + 3.1) - g1) / e;
    isleN = normalize(isleN + vec3(-gs.x, 0.0, -gs.y) * 0.1);
    // the wet shoreline: the last metres of sand above the waterline, its edge uneven
    isleWet = 1.0 - smoothstep(0.002, 0.013, vIsleW.y + (g1 - 0.5) * 0.008);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.52, 0.58, 0.72), isleWet);
    roughnessFactor = mix(roughnessFactor, 0.3, isleWet);
    normal = normalize((viewMatrix * vec4(isleN, 0.0)).xyz);
  }
  #elif ISLE_KIND == 2
  {
    // leaf clumps: only where a crown is big enough on screen to show them
    float detail = 1.0 - smoothstep(0.08, 0.3, isleFw / max(vIsleS, 1e-4));
    isleUnder = mix(0.58, 1.08, smoothstep(-0.7, 0.6, isleN.y)); // dark under the crown, lit on top
    diffuseColor.rgb *= isleUnder;
    if (detail > 0.0) { // grass tufts and far crowns skip the noise altogether
      vec3 lp = vIsleO * 2.7;
      vec3 lump = vec3(isleNoise3(lp), isleNoise3(lp + 19.7), isleNoise3(lp + 43.1)) - 0.5;
      isleN = normalize(isleN + lump * 1.2 * detail);
      diffuseColor.rgb *= 1.0 + (isleNoise3(vIsleO * 5.3 + 7.0) - 0.5) * 0.4 * detail;
      normal = normalize((viewMatrix * vec4(isleN, 0.0)).xyz);
    }
  }
  #else
  {
    // walls, roofs, roads: a soft grain and faint streaks, and a dark foot on upright faces
    float fine = 1.0 - smoothstep(0.03, 0.1, isleFw);
    if (fine > 0.0) {
      float grain = (isleNoise3(vIsleW * 15.0) - 0.5) * 0.16 + (isleNoise3(vIsleW * vec3(46.0, 7.0, 46.0)) - 0.5) * 0.1;
      diffuseColor.rgb *= 1.0 + grain * fine;
    }
    float upright = 1.0 - smoothstep(0.35, 0.85, abs(isleN.y));
    float foot = smoothstep(-0.005, 0.06, vIsleW.y - uIsleGround);
    diffuseColor.rgb *= mix(1.0, mix(0.5, 1.0, foot), upright);
  }
  #endif
`;

// After the lights: what the moon adds on top (rim, sheen, back light), then the haze.
const FRAG_LIGHT = /* glsl */ `
  {
    float isleNdv = max(dot(isleN, isleV), 0.0);
    #if ISLE_KIND == 1
    {
      // wet sand mirrors the horizon at a glancing angle and carries the moon's glint
      vec3 r = reflect(-isleV, isleN);
      r.y = abs(r.y);
      float fres = 0.04 + 0.96 * pow(1.0 - isleNdv, 5.0);
      float glint = pow(max(dot(r, uIsleMoon), 0.0), 240.0);
      outgoingLight += isleWet * (isleHorizon(r) * fres * 1.4 + uIsleMoonCol * glint * 0.14);
    }
    #elif ISLE_KIND == 2
    {
      // moonlight through the leaves: the edges of a crown glow when the moon is behind it
      float back = pow(max(dot(-isleV, uIsleKey), 0.0), 3.0);
      float edge = pow(1.0 - isleNdv, 1.5);
      outgoingLight += diffuseColor.rgb * uIsleMoonCol * back * edge * 1.1;
    }
    #else
    {
      // a cool rim on the edges turned toward the moon
      float face = clamp(dot(isleN, uIsleKey) * 0.6 + 0.4, 0.0, 1.0);
      outgoingLight += uIsleMoonCol * mix(diffuseColor.rgb, vec3(1.0), 0.2) * pow(1.0 - isleNdv, 3.0) * face * face * 0.32;
    }
    #endif
    outgoingLight = mix(outgoingLight, isleHorizon(-isleV), 0.3 * smoothstep(4.0, 24.0, isleDist));
  }
`;

const KIND: Record<IsleKind, number> = { built: 0, ground: 1, leaf: 2 };

function compile(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }) {
  Object.assign(shader.uniforms, isleU);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
    .replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_MAIN}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_SURFACE}`)
    .replace('#include <opaque_fragment>', `${FRAG_LIGHT}\n#include <opaque_fragment>`);
}

// Gives a standard material the island's moonlit shading. Materials of one kind (and one set of
// three's own switches) share a program, since they share this one compile function.
export function isle<T extends THREE.MeshStandardMaterial>(material: T, kind: IsleKind): T {
  material.defines = { ...material.defines, ISLE_KIND: KIND[kind] };
  material.onBeforeCompile = compile;
  material.needsUpdate = true;
  return material;
}
