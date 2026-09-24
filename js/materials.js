import * as THREE from 'three';

// Grey-matter thickness drawn on the cut faces of cortical lobes (must match the build).
const GM_T = 0.28;

const partVertex = /* glsl */ `
  attribute vec4 sulc;
  attribute vec2 extra;
  varying vec3 vN;
  varying vec3 vP;
  varying vec4 vS;
  varying vec2 vE;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    vN = normalize(normalMatrix * normal);
    vS = sulc;
    vE = extra;
    gl_Position = projectionMatrix * mv;
  }
`;

const partFragment = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform vec3 uTint;
  uniform float uColor;
  uniform float uGhost;
  uniform float uHover;
  uniform float uPixelRatio;
  varying vec3 vN;
  varying vec3 vP;
  varying vec4 vS;
  varying vec2 vE;

  // Anti-aliased line along the zero set of f, half-width given in device pixels.
  float inkLine(float f, float halfWidth) {
    float d = abs(f) / max(fwidth(f), 1e-6);
    return 1.0 - smoothstep(halfWidth - 0.6, halfWidth + 0.6, d);
  }
  // Screen-space hatching (distance to the nearest stroke, in CSS pixels).
  float hatch(vec2 fc, vec2 dir, float spacing, float width) {
    float t = dot(fc, dir) / spacing;
    float d = abs(fract(t) - 0.5) * spacing;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.8, d);
  }

  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(-vP);
    float pr = uPixelRatio;
    vec2 fc = gl_FragCoord.xy / pr;

    // Soft key light from the upper left of the viewer.
    float ndl = dot(n, normalize(vec3(-0.45, 0.7, 0.55)));
    float shade = 1.0 - smoothstep(-0.2, 0.35, ndl);

    // Cortical cut faces: depth below the pial surface.
    float depth = vE.y;
    float cut = smoothstep(0.035, 0.09, depth);

    // Sulci: major (named) families + fine tertiary pattern.
    float major = max(
      inkLine(vS.x, 0.85 * pr) * smoothstep(0.35, 0.65, vS.y),
      inkLine(vS.z, 0.85 * pr) * smoothstep(0.35, 0.65, vS.w));
    float minor = inkLine(vE.x, 0.5 * pr) * 0.55;
    float sulci = max(major, minor) * (1.0 - cut);

    // Cut surface: hatched grey-matter ribbon over plain white matter.
    float gm = 1.0 - smoothstep(${GM_T.toFixed(2)} - 0.015, ${GM_T.toFixed(2)} + 0.015, depth);
    float boundary = inkLine(depth - ${GM_T.toFixed(2)}, 0.45 * pr) * cut * 0.8;
    float gmInk = hatch(fc, normalize(vec2(1.0, -1.0)), 3.2, 0.9) * gm * cut * 0.55;

    // Shadow hatching (single, then cross-hatch in the darkest areas).
    float h = hatch(fc, normalize(vec2(1.0, 1.0)), 5.0, 0.9) * smoothstep(0.35, 0.75, shade) * 0.35;
    h = max(h, hatch(fc, normalize(vec2(1.0, -1.0)), 5.0, 0.9) * smoothstep(0.8, 1.0, shade) * 0.25);

    vec3 paper = uPaper * (1.0 - 0.03 * shade);
    // Colour mode: soft watercolour wash under the ink, darker in shadow;
    // cortical cut faces show pinkish grey matter over pale white matter.
    vec3 wash = mix(uTint, vec3(1.0), 0.18) * (1.0 - 0.22 * shade);
    wash = mix(wash, mix(vec3(0.96, 0.95, 0.92), vec3(0.86, 0.72, 0.72), gm), cut);
    paper = mix(paper, wash, uColor);
    paper = mix(paper, paper * vec3(0.9, 0.9, 0.88), uHover * 0.7);
    // Hatching and tertiary lines are lighter over colour.
    h *= 1.0 - 0.5 * uColor;
    float ink = max(max(sulci * (1.0 - 0.25 * uColor), boundary), max(h * (1.0 - cut), gmInk * (1.0 - 0.5 * uColor)));
    vec3 col = mix(paper, uInk, ink);

    // Ghost mode: only a thin silhouette and faint sulci remain.
    float facing = abs(dot(n, v));
    float rimLine = 1.0 - smoothstep(0.6 * pr, 1.6 * pr, facing / max(fwidth(facing), 1e-4));
    float nearFade = smoothstep(3.0, 12.0, -vP.z);
    float ghostAlpha = max(rimLine * 0.4, major * (1.0 - cut) * 0.12) * (0.45 + 0.55 * uHover) * nearFade;
    gl_FragColor = vec4(mix(col, uInk, uGhost), mix(1.0, ghostAlpha, uGhost));
  }
`;

export function partMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: partVertex,
    fragmentShader: partFragment,
    uniforms: {
      uInk: { value: new THREE.Color(0x111111) },
      uPaper: { value: new THREE.Color(0xffffff) },
      uTint: { value: new THREE.Color(0xffffff) },
      uColor: { value: 0 },
      uGhost: { value: 0 },
      uHover: { value: 0 },
      uPixelRatio: { value: 1 },
    },
    side: THREE.DoubleSide,
  });
}

// Inverted hull: back faces pushed outward by a constant number of pixels
// draw the silhouette and contour lines.
const hullVertex = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uWidth;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 nv = normalize(normalMatrix * normal);
    vec2 dir = nv.xy;
    float l = length(dir);
    dir = l > 1e-4 ? dir / l : vec2(0.0);
    clip.xy += dir * uWidth / uResolution * 2.0 * clip.w;
    gl_Position = clip;
  }
`;
const hullFragment = /* glsl */ `
  uniform vec3 uInk;
  void main() { gl_FragColor = vec4(uInk, 1.0); }
`;

export function hullMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: hullVertex,
    fragmentShader: hullFragment,
    uniforms: {
      uInk: { value: new THREE.Color(0x111111) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWidth: { value: 1.5 },
    },
    side: THREE.BackSide,
  });
}
