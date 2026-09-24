// Builds the schematic brain geometry used by the atlas.
//
// Every structure is described as a signed distance field (SDF) in a brain
// coordinate frame (units ~ centimetres):
//   +x = right, +y = superior, +z = anterior, origin ~ centre of the diencephalon.
// Fields are polygonised with naive surface nets, snapped onto the true
// surface, and written (gzipped) to data/brain.bin.gz + data/brain.json.
//
// Bilateral structures are modelled on the right side only; the viewer mirrors
// them to create the left side. Run with:  node tools/build-geometry.mjs

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }

function sdEllipsoid(x, y, z, rx, ry, rz) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  if (k1 === 0) return -Math.min(rx, ry, rz);
  return (k0 * (k0 - 1)) / k1;
}

// Ellipsoid centred at c with radii r; its local +z axis is yawed toward +x
// and pitched toward -y (world = Ry(yaw) * Rx(pitch) * local).
function sdEll(x, y, z, c, r, yaw = 0, pitch = 0) {
  let px = x - c[0], py = y - c[1], pz = z - c[2];
  if (yaw) { const cs = Math.cos(yaw), sn = Math.sin(yaw); const nx = px * cs - pz * sn; pz = px * sn + pz * cs; px = nx; }
  if (pitch) { const cs = Math.cos(pitch), sn = Math.sin(pitch); const ny = py * cs + pz * sn; pz = -py * sn + pz * cs; py = ny; }
  return sdEllipsoid(px, py, pz, r[0], r[1], r[2]);
}

// Tube along a 3D polyline of [x, y, z, radius] points (radius interpolated).
function sdTube(x, y, z, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
    const px = x - a[0], py = y - a[1], pz = z - a[2];
    const t = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1);
    const dd = Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (a[3] + (b[3] - a[3]) * t);
    if (dd < d) d = dd;
  }
  return d;
}

// Distance from (u, v) to a 2D polyline of [u, v, r] points; returns [dist - r, t-ish index].
function sdPoly2(u, v, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const bu = b[0] - a[0], bv = b[1] - a[1];
    const pu = u - a[0], pv = v - a[1];
    const t = clamp((pu * bu + pv * bv) / (bu * bu + bv * bv), 0, 1);
    const r = (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t;
    const dd = Math.hypot(pu - bu * t, pv - bv * t) - r;
    if (dd < d) d = dd;
  }
  return d;
}

// Piecewise-linear y(z) through [z, y] points sorted by descending z.
function interpZ(z, pts) {
  if (z >= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (z >= b[0]) return a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]);
  }
  return pts[pts.length - 1][1];
}

// ---------------------------------------------------------------------------
// Improved Perlin noise (seeded) for tertiary sulcal patterns
// ---------------------------------------------------------------------------
const perm = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 1337;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  const l = (a, b, t) => a + t * (b - a);
  return l(
    l(l(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      l(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    l(l(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      l(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
    w);
}
// Domain-warped noise; zero set forms meandering "tertiary sulci".
function gyralNoise(x, y, z) {
  const wx = noise(x * 0.32 + 11.3, y * 0.32, z * 0.32) * 1.6;
  const wy = noise(x * 0.32, y * 0.32 + 23.1, z * 0.32) * 1.6;
  const wz = noise(x * 0.32, y * 0.32, z * 0.32 + 37.7) * 1.6;
  const f = 0.62;
  const px = (x + wx) * f, py = (y + wy) * f, pz = (z + wz) * f;
  return noise(px, py, pz) + 0.3 * noise(px * 2.1 + 5, py * 2.1, pz * 2.1);
}

// ---------------------------------------------------------------------------
// Cerebral hemisphere (right)
// ---------------------------------------------------------------------------
// Lateral (Sylvian) fissure as seen on the lateral surface, [z, y, halfWidth].
const FISSURE_SLOT = [[4.3, -1.15, 0.13], [3.2, -0.65, 0.13], [1.5, -0.1, 0.12], [0, 0.35, 0.12],
  [-1.5, 0.85, 0.11], [-2.6, 1.35, 0.1], [-3.3, 2.05, 0.06]];
// Temporal / frontoparietal labelling boundary: the fissure, then continued
// posteriorly to the occipital boundary (the conventional arbitrary line).
const FISSURE_LABEL = [[4.6, -1.3], [3.2, -0.65], [1.5, -0.1], [0, 0.35], [-1.5, 0.85], [-2.7, 1.3], [-7, 1.3]];
const yFiss = (z) => interpZ(z, FISSURE_LABEL);
// Central sulcus: runs from the superomedial margin (just behind the midpoint)
// down and forward toward the lateral fissure, with its typical sinuous course.
const zCS = (y) => (y < 0.6 ? 1.1 : 1.1 - 0.38 * (y - 0.6) + 0.16 * Math.sin((y - 0.6) * 2.4));
// Occipital boundary: parieto-occipital sulcus -> pre-occipital notch.
const zOcc = (y) => -5.2 - 0.13 * y;
// Corpus callosum centre line in the midsagittal plane, [z, y, halfThickness].
const CC_LINE = [[1.9, -0.05, 0.16], [2.85, 0.35, 0.36], [3.15, 1.15, 0.46], [2.75, 1.95, 0.4],
  [1.8, 2.45, 0.3], [0, 2.7, 0.28], [-1.8, 2.62, 0.3], [-3.0, 2.2, 0.42], [-3.65, 1.5, 0.56], [-3.45, 0.95, 0.4]];

const SHELL_T = 1.2; // modelled cortical "shell" (grey matter + subjacent white matter)
const GM_T = 0.28;   // cortical grey matter thickness drawn on cut faces (~2.5-3 mm)

function hemiBase(x, y, z) {
  const tz = (z + 1.5) / 8.5;
  const taper = 1 - 0.17 * tz * tz;
  let d = sdEllipsoid((x - 0.9) / taper, y - 1.5, z + 0.2, 6.0, 4.4, 8.3) * taper;
  d = smax(d, -1.25 - y, 0.9); // orbital / tentorial base
  const dT = sdEll(x, y, z, [4.5, -1.45, -0.8], [2.3, 1.9, 4.7], 0.05, 0.2); // temporal lobe
  d = smin(d, dT, 1.0);
  // Medial temporal lobe (parahippocampal gyrus and uncus) wrapping the
  // hippocampus and amygdala from below and medially.
  d = smin(d, sdEll(x, y, z, [2.35, -1.95, 0.35], [1.3, 1.0, 3.4], 0, 0.12), 0.6);
  d = smax(d, 0.12 - x, 0.45); // flat medial surface (interhemispheric fissure)
  return d;
}

// Sulcal families. Each is a smooth signed function whose zero set is a sulcus,
// plus a mask saying where that sulcus exists. Returned as [f1, m1, f2, m2].
function cortexSulci(x, y, z) {
  const dz = z - zCS(y);
  const dyF = y - yFiss(z);
  // 0 = lateral, pi/2 = dorsal; perturbed so longitudinal sulci meander.
  const theta = Math.atan2(y - 1.2, x - 0.9) + 0.07 * Math.sin(z * 1.9 + x) + 0.06 * noise(x * 0.5 + 3, y * 0.5, z * 0.5);
  // Family 1: precentral and postcentral sulci, parallel to the central sulcus.
  const f1 = ((dz - 1.6) * (dz + 1.5)) / 3.1;
  const m1 = smoothstep(0.35, 0.8, dyF) * smoothstep(1.4, 2.0, x) * (1 - smoothstep(5.5, 5.95, y + 0.25 * x));
  // Family 2: longitudinal sulci, chosen by region.
  const cands = [];
  // Superior + inferior frontal sulci.
  cands.push([(5 * (theta - 1.05) * (theta - 0.42)) / 0.63,
    smoothstep(1.9, 2.4, dz) * (1 - smoothstep(6.3, 7.1, z)) * smoothstep(0.12, 0.3, theta) *
    (1 - smoothstep(1.28, 1.42, theta)) * smoothstep(0.3, 0.7, dyF)]);
  // Intraparietal sulcus.
  cands.push([5 * (theta - 0.85),
    (1 - smoothstep(-2.3, -1.8, dz)) * smoothstep(zOcc(y) + 0.3, zOcc(y) + 0.9, z) * smoothstep(0.6, 1.0, dyF) *
    smoothstep(0.3, 0.5, theta) * (1 - smoothstep(1.2, 1.35, theta))]);
  // Superior and inferior temporal sulci.
  cands.push([((dyF + 1.0) * (dyF + 2.15)) / 1.15,
    smoothstep(0.35, 0.6, -dyF) * smoothstep(3.7, 4.3, x) * smoothstep(zOcc(y) + 0.2, zOcc(y) + 0.7, z) *
    (1 - smoothstep(2.6, 3.4, z))]);
  // Lateral occipital sulcus.
  cands.push([5 * (theta - 0.35), smoothstep(0.4, 0.9, zOcc(y) - z) * smoothstep(2.4, 3.0, x) * (1 - smoothstep(-7.4, -6.9, -z) * 0)]);
  // Calcarine sulcus (medial occipital surface).
  cands.push([y - (0.75 + 0.1 * (z + 6)), (1 - smoothstep(0.9, 1.4, x)) * smoothstep(0.1, 0.5, -4.5 - z) * smoothstep(-8.6, -8.0, z)]);
  let best = cands[0];
  for (const c of cands) if (c[1] > best[1]) best = c;
  return [f1, m1, best[0], best[1]];
}

// Grooves carved by the sulci (outer surface only).
function sulcalGroove(x, y, z) {
  const [f1, m1, f2, m2] = cortexSulci(x, y, z);
  const n = gyralNoise(x, y, z);
  return 0.24 * m1 * Math.exp(-(f1 * f1) / 0.02) + 0.24 * m2 * Math.exp(-(f2 * f2) / 0.02) +
    0.13 * Math.exp(-(n * n) / 0.006);
}

function hemiOuter(x, y, z, base = hemiBase(x, y, z)) {
  let d = base;
  if (Math.abs(base) < 0.8) d += sulcalGroove(x, y, z);
  // Lateral fissure: a deep cleft down to the insula.
  const slot = smax(sdPoly2(z, y, FISSURE_SLOT), 4.55 - x, 0.15);
  d = smax(d, -slot, 0.06);
  return d;
}

function hemiShell(x, y, z) {
  const base = hemiBase(x, y, z);
  if (base > 0.9) return base;
  if (base < -(SHELL_T + 0.6)) return -(base + SHELL_T);
  return Math.max(hemiOuter(x, y, z, base), -(base + SHELL_T));
}

// Region functions (negative inside) used to cut the shell into lobes.
function regionCingulate(x, y, z) {
  return Math.max(sdPoly2(z, y, CC_LINE.map(([a, b]) => [a, b, 0])) - 1.45, x - 1.75, -0.35 - y);
}
function regionTemporal(x, y, z) {
  // Below the fissure line, behind the occipital line, and either lateral,
  // posterior, or lower than the orbital surface of the frontal lobe.
  return Math.max(y - yFiss(z), zOcc(y) - z, z - 4.8, Math.min(2.4 - x, z - 1.1, y + 1.45));
}

const GAP = 0.03;
const LOBE_REGION = {
  frontal: (x, y, z) => Math.max(-regionTemporal(x, y, z), zCS(y) - z, -regionCingulate(x, y, z)),
  parietal: (x, y, z) => Math.max(-regionTemporal(x, y, z), z - zCS(y), zOcc(y) - z, -regionCingulate(x, y, z)),
  temporal: (x, y, z) => Math.max(regionTemporal(x, y, z), -regionCingulate(x, y, z)),
  occipital: (x, y, z) => Math.max(z - zOcc(y), -regionCingulate(x, y, z)),
  cingulate: (x, y, z) => regionCingulate(x, y, z),
};

// Insula: a lens-shaped cortical island at the floor of the lateral fissure.
function insula(x, y, z) {
  let d = sdEll(x, y, z, [4.25, 0.35, 0.35], [0.5, 1.45, 2.2], 0.08, -0.3);
  if (Math.abs(d) < 0.4) {
    // Short gyri anteriorly, long gyri posteriorly: grooves radiating from the limen.
    const a = Math.atan2(y + 0.6, z - 1.6);
    d += 0.07 * Math.exp(-Math.pow(Math.sin(a * 5.5), 2) / 0.04);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Deep structures (right-sided unless noted; midline ones use |x|)
// ---------------------------------------------------------------------------
const THAL = (x, y, z) => {
  let d = sdEll(x, y, z, [1.15, 0.3, -0.85], [0.8, 0.9, 1.55], -0.28, 0.05);
  d = smin(d, sdEll(x, y, z, [1.5, 0.35, -2.05], [0.72, 0.72, 0.75]), 0.5); // pulvinar
  d = smax(d, 0.2 - x, 0.15); // wall of the third ventricle
  d = smin(d, sdTube(x, y, z, [[0.0, 0.35, -0.55, 0.22], [0.35, 0.35, -0.55, 0.26]]), 0.15); // interthalamic adhesion
  return d;
};
const CAUDATE = (x, y, z) => sdTube(x, y, z, [
  [1.55, 1.1, 2.35, 0.78], [1.75, 1.55, 1.2, 0.62], [1.95, 1.95, -0.2, 0.42], [2.15, 2.0, -1.7, 0.3],
  [2.55, 1.6, -2.95, 0.22], [3.0, 0.75, -3.35, 0.17], [3.25, -0.15, -2.45, 0.14], [3.2, -0.6, -1.0, 0.11], [3.1, -0.8, 0.2, 0.08]]);
const PUTAMEN = (x, y, z) => sdEll(x, y, z, [2.8, 0.45, 0.6], [0.55, 1.15, 1.95], 0.12, 0);
const GP = (x, y, z) => {
  let d = sdEll(x, y, z, [2.05, 0.15, 0.35], [0.42, 0.72, 1.1], 0.12, 0);
  d = smax(d, -(PUTAMEN(x, y, z) - 0.03), 0.05);
  d = smax(d, -(THAL(x, y, z) - 0.28), 0.1); // posterior limb of the internal capsule
  return d;
};
const HIPPO = (x, y, z) => {
  let d = sdTube(x, y, z, [[2.55, -1.95, 1.05, 0.52], [2.75, -1.8, 0.0, 0.44], [2.8, -1.45, -1.2, 0.37],
    [2.55, -0.9, -2.3, 0.28], [2.15, -0.25, -2.85, 0.2]]);
  if (Math.abs(d) < 0.2 && z > 0.3) d += 0.05 * Math.exp(-Math.pow(Math.sin(x * 9 + y * 3), 2) / 0.08); // pes digitations
  return d;
};
const AMYG = (x, y, z) => smax(sdEll(x, y, z, [2.35, -1.5, 2.05], [0.68, 0.62, 0.74]), -(HIPPO(x, y, z) - 0.03), 0.05);
const FORNIX_PTS = [[2.2, -0.35, -2.85, 0.14], [1.45, 0.9, -3.1, 0.17], [0.75, 1.65, -2.45, 0.19], [0.3, 1.9, -1.2, 0.19],
  [0.25, 1.7, 0.5, 0.17], [0.25, 1.05, 1.3, 0.15], [0.32, 0.0, 1.15, 0.13], [0.36, -1.15, 0.5, 0.12]];
const FORNIX = (x, y, z) => sdTube(Math.abs(x), y, z, FORNIX_PTS);
const CC = (x, y, z) => {
  // Distance within the sagittal plane to the arch, combined with lateral extent.
  let best = Infinity, w = 2;
  for (let i = 0; i < CC_LINE.length - 1; i++) {
    const a = CC_LINE[i], b = CC_LINE[i + 1];
    const bu = b[0] - a[0], bv = b[1] - a[1], pu = z - a[0], pv = y - a[1];
    const t = clamp((pu * bu + pv * bv) / (bu * bu + bv * bv), 0, 1);
    const r = a[2] + (b[2] - a[2]) * t;
    const dd = Math.hypot(pu - bu * t, pv - bv * t) - r;
    if (dd < best) { best = dd; w = 1.5 + 0.9 * Math.min(1, (i + t) / 3) - 0.4 * Math.max(0, (i + t - 7) / 2); }
  }
  return smax(best, Math.abs(x) - w, 0.5);
};
const LAT_VENT = (x, y, z) => {
  const main = [[1.0, 1.45, 3.0, 0.26], [1.12, 1.7, 2.25, 0.4], [1.22, 1.88, 1.0, 0.42], [1.32, 1.98, -0.6, 0.4],
    [1.6, 1.9, -2.1, 0.46], [2.3, 1.45, -3.2, 0.55], [2.2, 1.1, -4.4, 0.33], [1.85, 1.0, -5.3, 0.16]];
  const temporal = [[2.3, 1.45, -3.2, 0.45], [2.95, 0.4, -3.1, 0.36], [3.15, -0.7, -1.8, 0.3], [3.1, -1.25, -0.2, 0.26], [2.95, -1.4, 1.05, 0.18]];
  const foramen = [[1.15, 1.75, 1.15, 0.16], [0.1, 1.2, 1.1, 0.13]];
  let d = Math.min(sdTube(x, (y - 1.9) * 1.25 + 1.9, z, main), sdTube(x, y, z, temporal));
  d = smin(d, sdTube(x, y, z, foramen), 0.1);
  if (d > 0.3) return d;
  for (const c of [CAUDATE, THAL, HIPPO, FORNIX, CC]) d = smax(d, -(c(x, y, z) - 0.02), 0.04);
  return d;
};
const THIRD_VENT = (x, y, z) => {
  const ax = Math.abs(x);
  // Rounded slit between the thalami
  const qx = ax - 0.06, qy = Math.abs(y - 0.1) - 0.95, qz = Math.abs(z + 0.15) - 1.2;
  let d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 0.12;
  d = smin(d, sdTube(ax, y, z, [[0, -0.85, 0.85, 0.12], [0, -1.35, 1.25, 0.08]]), 0.1); // infundibular recess
  d = smin(d, sdTube(ax, y, z, [[0, -0.7, 1.15, 0.1], [0, -1.2, 1.65, 0.08]]), 0.1);   // optic recess
  d = smin(d, sdTube(ax, y, z, [[0, 0.3, -1.35, 0.1], [0, 0.05, -2.1, 0.08]]), 0.1);   // pineal recess
  d = Math.min(d, sdTube(ax, y, z, [[0, -0.75, -1.45, 0.11], [0, -1.35, -2.05, 0.08], [0, -2.15, -2.3, 0.1]])); // cerebral aqueduct
  d = smax(d, -(THAL(ax, y, z) - 0.01), 0.03);
  return d;
};
const HYPOTHAL = (x, y, z) => {
  const ax = Math.abs(x);
  let d = sdEll(ax, y, z, [0, -0.95, 0.8], [0.62, 0.52, 0.92]);
  d = smin(d, sdEll(ax, y, z, [0.34, -1.4, 0.22], [0.24, 0.24, 0.26]), 0.12); // mammillary bodies
  d = smin(d, sdEll(ax, y, z, [0, -1.35, 1.1], [0.35, 0.2, 0.35]), 0.15);     // tuber cinereum
  if (d > 0.3) return d;
  d = smax(d, -(THIRD_VENT(x, y, z) - 0.02), 0.03);
  d = smax(d, -(OPTIC(x, y, z) - 0.02), 0.03);
  d = smax(d, -(THAL(ax, y, z) - 0.02), 0.05);
  return d;
};
const PITUITARY = (x, y, z) => {
  let d = sdEll(x, y, z, [0, -2.72, 1.62], [0.6, 0.36, 0.48]);
  d = smin(d, sdEll(x, y, z, [0, -2.68, 1.25], [0.34, 0.3, 0.26]), 0.12); // neurohypophysis
  d = smin(d, sdTube(x, y, z, [[0, -1.4, 1.2, 0.14], [0, -2.4, 1.4, 0.1]]), 0.12); // infundibulum
  return d;
};
const PINEAL = (x, y, z) => sdEll(x, y, z, [0, -0.2, -2.45], [0.26, 0.22, 0.4], 0, -0.35);
const OPTIC = (x, y, z) => {
  const ax = Math.abs(x);
  let d = sdEll(x, y, z, [0, -1.55, 1.95], [0.62, 0.14, 0.34]);
  d = smin(d, sdTube(ax, y, z, [[0.35, -1.55, 2.1, 0.19], [1.35, -1.72, 4.3, 0.2]]), 0.15); // optic nerves
  d = smin(d, sdTube(ax, y, z, [[0.35, -1.5, 1.75, 0.17], [1.3, -1.25, 0.8, 0.17], [1.75, -0.85, -0.5, 0.16], [1.8, -0.55, -1.25, 0.2]]), 0.15);
  return d;
};
const OLFACTORY = (x, y, z) => smin(sdEll(x, y, z, [0.72, -1.52, 6.15], [0.26, 0.17, 0.58]),
  sdTube(x, y, z, [[0.72, -1.48, 5.7, 0.1], [0.95, -1.42, 3.0, 0.1], [1.2, -1.45, 2.4, 0.07]]), 0.1);

// Brainstem (midline). Split into midbrain / pons / medulla below.
function brainstemBase(x, y, z) {
  const ax = Math.abs(x);
  let d = sdTube(ax / 1.2, y, z, [[0, -0.6, -1.45, 0.82], [0, -3.3, -1.75, 0.8], [0, -7.3, -2.0, 0.55]]);
  d = smin(d, sdTube(ax, y, z, [[0.55, -2.0, -0.85, 0.46], [1.15, -0.5, 0.05, 0.52]]), 0.35); // cerebral peduncles
  d = smin(d, sdEll(ax, y, z, [0.45, -1.05, -2.35], [0.34, 0.3, 0.3]), 0.12); // superior colliculi
  d = smin(d, sdEll(ax, y, z, [0.42, -1.7, -2.3], [0.3, 0.26, 0.27]), 0.12);  // inferior colliculi
  d = smin(d, sdEll(x, y, z, [0, -3.25, -0.95], [1.6, 1.25, 1.25]), 0.4);      // basilar pons
  d = smin(d, sdTube(ax, y, z, [[0.9, -3.2, -1.5, 0.62], [2.2, -3.4, -3.1, 0.58]]), 0.3); // middle cerebellar peduncles
  d = smin(d, sdTube(ax, y, z, [[0.45, -1.95, -2.1, 0.22], [1.05, -2.9, -2.95, 0.26]]), 0.2); // superior cerebellar peduncles
  d = smin(d, sdTube(ax, y, z, [[0.28, -4.6, -0.6, 0.3], [0.22, -6.9, -1.35, 0.26]]), 0.15); // pyramids
  d = smin(d, sdEll(ax, y, z, [0.72, -5.25, -1.0], [0.3, 0.62, 0.34]), 0.15);   // olives
  d = smax(d, y + 0.45, 0.15);   // rostral limit (diencephalon above)
  d = smax(d, -7.3 - y, 0.1);    // caudal limit at the foramen magnum
  return d;
}
function brainstemSulci(x, y, z) {
  const ax = Math.abs(x);
  // f1: transverse pontine fibres (basilar pons) or pre-olivary sulcus (medulla)
  // f2: basilar sulcus / anterior median fissure
  const anterior = smoothstep(-1.0, -0.4, z - (-1.2 - 0.08 * (y + 3)));
  if (y > -4.45 && y < -2.15) {
    return [Math.sin(y * Math.PI / 0.3) * 0.3 / Math.PI, anterior * smoothstep(0.25, 0.4, ax) * 0.999, x, anterior * (1 - smoothstep(0.6, 0.9, ax))];
  }
  if (y <= -4.45) return [ax - 0.52, anterior * smoothstep(-7.1, -6.8, y), x, anterior * (1 - smoothstep(0.6, 0.9, ax))];
  return [ax - 0.02, 0, 16, 0];
}

// Cerebellum (midline, symmetric).
const CB_P0 = [-3.1, -3.0]; // (y, z) centre of the folial arcs (near the fastigium)
function cerebellumBase(x, y, z) {
  const ax = Math.abs(x);
  let d = sdEll(ax, y, z, [2.3, -3.75, -5.0], [2.75, 1.95, 2.75]);
  d = smin(d, sdEll(x, y, z, [0, -3.5, -4.95], [1.1, 2.1, 2.55]), 0.8); // vermis
  d = smax(d, y + 1.6 + 0.07 * x * x, 0.5);                              // tentorial surface
  d = smax(d, -sdTube(x, y, z, [[0, -5.6, -7.9, 0.45], [0, -4.8, -7.0, 0.3]]), 0.3); // posterior notch
  return d;
}
function cerebellumSulci(x, y, z) {
  const r = Math.hypot(y - CB_P0[0], z - CB_P0[1]);
  const f1 = (Math.sin(r * Math.PI / 0.3) * 0.3) / Math.PI;               // folia
  const m1 = smoothstep(-3.0, -3.4, z) * 0.999 + 0.0;
  const phi = Math.atan2(y - CB_P0[0], z - CB_P0[1]);
  const f2 = (phi - 2.39) * r;                                             // primary fissure
  const m2 = smoothstep(-3.3, -2.9, y) * smoothstep(-3.2, -3.6, z);
  return [f1, m1, f2, m2];
}
function cerebellumOuter(x, y, z) {
  let d = cerebellumBase(x, y, z);
  if (Math.abs(d) < 0.4) {
    const [f1, m1, f2, m2] = cerebellumSulci(x, y, z);
    d += 0.06 * m1 * Math.exp(-(f1 * f1) / 0.0025) + 0.3 * m2 * Math.exp(-(f2 * f2) / 0.012);
  }
  return d;
}
const FOURTH_VENT = (x, y, z) => {
  const q = Math.abs(x) / 1.05 + Math.abs(y + 3.35) / 1.3 + Math.abs(z + 2.45) / 0.72;
  let d = (q - 1) * 0.42;
  if (d > 0.3) return d;
  d = smax(d, -(brainstemBase(x, y, z) - 0.02), 0.04);
  return d;
};
const CEREBELLUM = (x, y, z) => {
  let d = cerebellumOuter(x, y, z);
  if (d > 0.3) return d;
  d = smax(d, -(brainstemBase(x, y, z) - 0.12), 0.2);
  d = smax(d, -(FOURTH_VENT(x, y, z) - 0.02), 0.05);
  return d;
};
const BRAINSTEM = (x, y, z) => {
  let d = brainstemBase(x, y, z);
  if (d > 0.3) return d;
  d = smax(d, -(THIRD_VENT(x, y, z) - 0.015), 0.02); // cerebral aqueduct
  const ax = Math.abs(x);
  d = smax(d, -(THAL(ax, y, z) - 0.03), 0.05);
  d = smax(d, -(HYPOTHAL(x, y, z) - 0.03), 0.05);
  return d;
};

// Everything the right hemisphere's cortex must not intersect.
function deepCore(x, y, z) {
  let d = sdEll(x, y, z, [0, -0.1, -0.5], [1.85, 1.85, 3.1]); // diencephalic hilum
  for (const f of [THAL, CAUDATE, PUTAMEN, GP, HIPPO, AMYG, FORNIX, CC, LAT_VENT, OPTIC, OLFACTORY, HYPOTHAL, PINEAL])
    d = Math.min(d, f(x, y, z));
  d = Math.min(d, brainstemBase(x, y, z), cerebellumBase(x, y, z) - 0.15);
  return d;
}

// ---------------------------------------------------------------------------
// Part catalogue
// ---------------------------------------------------------------------------
// kind: 'cortex' | 'cerebellum' | 'brainstem' | 'plain'
// mirror: build right side; viewer mirrors to the left.
const HEMI_BOX = [[0.05, -4.3, -8.9], [7.3, 6.3, 8.6]];
const parts = [];
const lobe = (id, box) => parts.push({ id, kind: 'cortex', mirror: true, box: box || HEMI_BOX, h: 0.12, lobe: id });
lobe('frontal', [[0.05, -2.0, -1.8], [7.0, 6.3, 8.6]]);
lobe('parietal', [[0.05, -0.8, -6.8], [7.3, 6.3, 2.2]]);
lobe('temporal', [[1.2, -4.3, -6.4], [7.3, 1.8, 5.0]]);
lobe('occipital', [[0.05, -2.6, -8.9], [6.4, 5.0, -4.2]]);
lobe('cingulate', [[0.05, -0.8, -4.9], [2.0, 4.4, 4.6]]);
parts.push({ id: 'insula', kind: 'plain', mirror: true, h: 0.07, sdf: insula });
parts.push({ id: 'corpus_callosum', kind: 'plain', mirror: false, h: 0.08, sdf: CC });
parts.push({ id: 'caudate', kind: 'plain', mirror: true, h: 0.055, sdf: CAUDATE });
parts.push({ id: 'putamen', kind: 'plain', mirror: true, h: 0.07, sdf: PUTAMEN });
parts.push({ id: 'globus_pallidus', kind: 'plain', mirror: true, h: 0.06, sdf: GP });
parts.push({ id: 'thalamus', kind: 'plain', mirror: true, h: 0.07, sdf: THAL });
parts.push({ id: 'hypothalamus', kind: 'plain', mirror: false, h: 0.045, sdf: HYPOTHAL });
parts.push({ id: 'pituitary', kind: 'plain', mirror: false, h: 0.04, sdf: PITUITARY });
parts.push({ id: 'pineal', kind: 'plain', mirror: false, h: 0.025, sdf: PINEAL });
parts.push({ id: 'hippocampus', kind: 'plain', mirror: true, h: 0.055, sdf: HIPPO });
parts.push({ id: 'amygdala', kind: 'plain', mirror: true, h: 0.055, sdf: AMYG });
parts.push({ id: 'fornix', kind: 'plain', mirror: false, h: 0.04, sdf: FORNIX });
parts.push({ id: 'lateral_ventricle', kind: 'plain', mirror: true, h: 0.055, sdf: LAT_VENT });
parts.push({ id: 'third_ventricle', kind: 'plain', mirror: false, h: 0.035, sdf: THIRD_VENT });
parts.push({ id: 'fourth_ventricle', kind: 'plain', mirror: false, h: 0.05, sdf: FOURTH_VENT });
parts.push({ id: 'midbrain', kind: 'brainstem', mirror: false, h: 0.06, sdf: (x, y, z) => smax(BRAINSTEM(x, y, z), -2.15 - y + GAP, 0.05) });
parts.push({ id: 'pons', kind: 'brainstem', mirror: false, h: 0.07, sdf: (x, y, z) => smax(BRAINSTEM(x, y, z), Math.max(y + 2.15, -4.45 - y) + GAP, 0.05) });
parts.push({ id: 'medulla', kind: 'brainstem', mirror: false, h: 0.06, sdf: (x, y, z) => smax(BRAINSTEM(x, y, z), y + 4.45 + GAP, 0.05) });
parts.push({ id: 'cerebellar_hemisphere', kind: 'cerebellum', mirror: true, h: 0.07, sdf: (x, y, z) => Math.max(CEREBELLUM(x, y, z), 0.95 - x + GAP) });
parts.push({ id: 'vermis', kind: 'cerebellum', mirror: false, h: 0.06, sdf: (x, y, z) => Math.max(CEREBELLUM(x, y, z), Math.abs(x) - 0.95 + GAP) });
parts.push({ id: 'olfactory', kind: 'plain', mirror: true, h: 0.04, sdf: OLFACTORY });
parts.push({ id: 'optic', kind: 'plain', mirror: false, h: 0.045, sdf: OPTIC });

// ---------------------------------------------------------------------------
// Cortex fields (computed on a shared grid for all lobes)
// ---------------------------------------------------------------------------
function lobeSDF(name) {
  const region = LOBE_REGION[name];
  return (x, y, z) => {
    let d = hemiShell(x, y, z);
    if (d > 0.3) return d;
    d = Math.max(d, region(x, y, z) + GAP);
    if (d > 0.3) return d;
    d = smax(d, -(insula(x, y, z) - 0.06), 0.05);
    d = Math.max(d, -(deepCore(x, y, z) - 0.1));
    return d;
  };
}
for (const p of parts) if (p.kind === 'cortex') p.sdf = lobeSDF(p.lobe);

// ---------------------------------------------------------------------------
// Surface nets
// ---------------------------------------------------------------------------
function sampleGrid(sdf, box, h) {
  const [lo, hi] = box;
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 3, ny = Math.ceil((hi[1] - lo[1]) / h) + 3, nz = Math.ceil((hi[2] - lo[2]) / h) + 3;
  const ox = lo[0] - h, oy = lo[1] - h, oz = lo[2] - h;
  const field = new Float32Array(nx * ny * nz);
  let i = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let ii = 0; ii < nx; ii++) {
    field[i++] = sdf(ox + ii * h, oy + j * h, oz + k * h);
  }
  return { field, nx, ny, nz, ox, oy, oz, h };
}

function surfaceNets(g) {
  const { field, nx, ny, nz, ox, oy, oz, h } = g;
  const idx = (i, j, k) => i + nx * (j + ny * k);
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = field[idx(i + corner[c][0], j + corner[c][1], k + corner[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
      sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
      sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
      n++;
    }
    cellVert[idx(i, j, k)] = pos.length / 3;
    pos.push(ox + (i + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
  }
  const tris = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) { const t = b; b = d; d = t; }
    tris.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = field[idx(i, j, k)] < 0;
    if (f0 !== (field[idx(i + 1, j, k)] < 0)) // x edge
      quad(cellVert[idx(i, j - 1, k - 1)], cellVert[idx(i, j, k - 1)], cellVert[idx(i, j, k)], cellVert[idx(i, j - 1, k)], !f0);
    if (f0 !== (field[idx(i, j + 1, k)] < 0)) // y edge
      quad(cellVert[idx(i - 1, j, k - 1)], cellVert[idx(i - 1, j, k)], cellVert[idx(i, j, k)], cellVert[idx(i, j, k - 1)], !f0);
    if (f0 !== (field[idx(i, j, k + 1)] < 0)) // z edge
      quad(cellVert[idx(i - 1, j - 1, k)], cellVert[idx(i, j - 1, k)], cellVert[idx(i, j, k)], cellVert[idx(i - 1, j, k)], !f0);
  }
  return { pos: Float64Array.from(pos), tris: Uint32Array.from(tris) };
}

function gradient(sdf, x, y, z, e = 0.012) {
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
  const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
  const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l, l / (2 * e)];
}

// Keep only the largest connected component groups above a size threshold
// (drops specks produced where carving leaves slivers).
function dropSpecks(mesh, minTris) {
  const { pos, tris } = mesh;
  const nv = pos.length / 3;
  const parent = new Int32Array(nv).map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < tris.length; t += 3) {
    const a = find(tris[t]), b = find(tris[t + 1]), c = find(tris[t + 2]);
    parent[b] = a; parent[find(c)] = a;
  }
  const count = new Map();
  for (let t = 0; t < tris.length; t += 3) { const r = find(tris[t]); count.set(r, (count.get(r) || 0) + 1); }
  const keep = [];
  for (let t = 0; t < tris.length; t += 3) if (count.get(find(tris[t])) >= minTris) keep.push(tris[t], tris[t + 1], tris[t + 2]);
  // compact vertices
  const remap = new Int32Array(nv).fill(-1);
  const np = [];
  const nt = new Uint32Array(keep.length);
  for (let i = 0; i < keep.length; i++) {
    const v = keep[i];
    if (remap[v] < 0) { remap[v] = np.length / 3; np.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); }
    nt[i] = remap[v];
  }
  return { pos: Float64Array.from(np), tris: nt };
}

// Quadric error metric decimation (Garland & Heckbert) down to `targetTris`.
class MinHeap {
  constructor() { this.a = []; }
  push(e) { const a = this.a; a.push(e); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}
function decimate(mesh, targetTris) {
  const pos = Float64Array.from(mesh.pos);
  const tris = Int32Array.from(mesh.tris);
  const nv = pos.length / 3, nf = tris.length / 3;
  if (nf <= targetTris) return mesh;
  const Q = new Float64Array(nv * 10);
  const vFaces = Array.from({ length: nv }, () => []);
  const faceAlive = new Uint8Array(nf).fill(1);
  const vAlive = new Uint8Array(nv).fill(1);
  const ver = new Uint32Array(nv);
  const faceNormal = (f, out) => {
    const a = tris[3 * f], b = tris[3 * f + 1], c = tris[3 * f + 2];
    const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx;
    return out;
  };
  const n3 = [0, 0, 0];
  for (let f = 0; f < nf; f++) {
    faceNormal(f, n3);
    const l = Math.hypot(n3[0], n3[1], n3[2]);
    if (l === 0) continue;
    const a = n3[0] / l, b = n3[1] / l, c = n3[2] / l;
    const v0 = tris[3 * f];
    const d = -(a * pos[3 * v0] + b * pos[3 * v0 + 1] + c * pos[3 * v0 + 2]);
    const w = l * 0.5; // area weighted
    const q = [a * a, a * b, a * c, a * d, b * b, b * c, b * d, c * c, c * d, d * d];
    for (let k = 0; k < 3; k++) { const v = tris[3 * f + k]; vFaces[v].push(f); for (let i = 0; i < 10; i++) Q[10 * v + i] += q[i] * w; }
  }
  const qerr = (q, x, y, z) =>
    q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const qs = new Float64Array(10);
  const bestPos = (u, v) => {
    for (let i = 0; i < 10; i++) qs[i] = Q[10 * u + i] + Q[10 * v + i];
    const [a, b, c, d, e, f, g, h, i2] = qs;
    // Solve [a b c; b e f; c f h] x = -[d g i2]
    const det = a * (e * h - f * f) - b * (b * h - f * c) + c * (b * f - e * c);
    let best = null;
    if (Math.abs(det) > 1e-9) {
      const x = (-d * (e * h - f * f) + b * (g * h - f * i2) - c * (g * f - e * i2)) / det;
      const y = (-a * (g * h - f * i2) + d * (b * h - f * c) - c * (b * i2 - g * c)) / det;
      const z = (-a * (e * i2 - g * f) + b * (b * i2 - g * c) - d * (b * f - e * c)) / det;
      const mx = (pos[3 * u] + pos[3 * v]) / 2, my = (pos[3 * u + 1] + pos[3 * v + 1]) / 2, mz = (pos[3 * u + 2] + pos[3 * v + 2]) / 2;
      const el = Math.hypot(pos[3 * u] - pos[3 * v], pos[3 * u + 1] - pos[3 * v + 1], pos[3 * u + 2] - pos[3 * v + 2]);
      if (Math.hypot(x - mx, y - my, z - mz) < el * 1.5) best = [qerr(qs, x, y, z), x, y, z];
    }
    for (const [x, y, z] of [[pos[3 * u], pos[3 * u + 1], pos[3 * u + 2]], [pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]],
      [(pos[3 * u] + pos[3 * v]) / 2, (pos[3 * u + 1] + pos[3 * v + 1]) / 2, (pos[3 * u + 2] + pos[3 * v + 2]) / 2]]) {
      const e2 = qerr(qs, x, y, z);
      if (!best || e2 < best[0]) best = [e2, x, y, z];
    }
    return best;
  };
  const heap = new MinHeap();
  const pushEdge = (u, v) => { const [c, x, y, z] = bestPos(u, v); heap.push([Math.max(c, 0), u, v, ver[u], ver[v], x, y, z]); };
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
    const u = tris[3 * f + k], v = tris[3 * f + (k + 1) % 3];
    if (u < v) pushEdge(u, v);
  }
  const neighbors = (u) => { const s = new Set(); for (const f of vFaces[u]) if (faceAlive[f]) for (let k = 0; k < 3; k++) s.add(tris[3 * f + k]); s.delete(u); return s; };
  let faces = nf;
  const nb = [0, 0, 0], na = [0, 0, 0];
  while (faces > targetTris && heap.size) {
    const [, u, v, vu, vv, x, y, z] = heap.pop();
    if (!vAlive[u] || !vAlive[v] || ver[u] !== vu || ver[v] !== vv) continue;
    const Nu = neighbors(u), Nv = neighbors(v);
    if (!Nu.has(v)) continue;
    let common = 0; for (const w of Nu) if (Nv.has(w)) common++;
    const shared = vFaces[u].filter((f) => faceAlive[f] && (tris[3 * f] === v || tris[3 * f + 1] === v || tris[3 * f + 2] === v));
    if (common !== 2 || shared.length !== 2) continue; // link condition
    // Reject collapses that flip any surviving face.
    let ok = true;
    for (const w of [u, v]) {
      for (const f of vFaces[w]) {
        if (!faceAlive[f] || shared.includes(f)) continue;
        faceNormal(f, nb);
        const saveU = [pos[3 * u], pos[3 * u + 1], pos[3 * u + 2]], saveV = [pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]];
        pos[3 * u] = x; pos[3 * u + 1] = y; pos[3 * u + 2] = z; pos[3 * v] = x; pos[3 * v + 1] = y; pos[3 * v + 2] = z;
        faceNormal(f, na);
        pos[3 * u] = saveU[0]; pos[3 * u + 1] = saveU[1]; pos[3 * u + 2] = saveU[2]; pos[3 * v] = saveV[0]; pos[3 * v + 1] = saveV[1]; pos[3 * v + 2] = saveV[2];
        const lb = Math.hypot(...nb), la = Math.hypot(...na);
        if (la < 1e-12 || (nb[0] * na[0] + nb[1] * na[1] + nb[2] * na[2]) / (lb * la + 1e-12) < 0.3) { ok = false; break; }
      }
      if (!ok) break;
    }
    if (!ok) continue;
    pos[3 * u] = x; pos[3 * u + 1] = y; pos[3 * u + 2] = z;
    for (const f of shared) { faceAlive[f] = 0; faces--; }
    for (const f of vFaces[v]) {
      if (!faceAlive[f]) continue;
      for (let k = 0; k < 3; k++) if (tris[3 * f + k] === v) tris[3 * f + k] = u;
      vFaces[u].push(f);
    }
    vFaces[u] = vFaces[u].filter((f) => faceAlive[f]);
    vAlive[v] = 0;
    for (let i = 0; i < 10; i++) Q[10 * u + i] += Q[10 * v + i];
    ver[u]++;
    for (const w of neighbors(u)) pushEdge(u, w);
  }
  // compact
  const remap = new Int32Array(nv).fill(-1);
  const np = [], nt = [];
  for (let f = 0; f < nf; f++) {
    if (!faceAlive[f]) continue;
    for (let k = 0; k < 3; k++) {
      const v = tris[3 * f + k];
      if (remap[v] < 0) { remap[v] = np.length / 3; np.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); }
      nt.push(remap[v]);
    }
  }
  return { pos: Float64Array.from(np), tris: Uint32Array.from(nt) };
}

function autoBox(sdf) {
  const h = 0.2;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let x = -8; x <= 8; x += h) for (let y = -8; y <= 7; y += h) for (let z = -9.2; z <= 9.2; z += h) {
    if (sdf(x, y, z) < h) {
      if (x < lo[0]) lo[0] = x; if (y < lo[1]) lo[1] = y; if (z < lo[2]) lo[2] = z;
      if (x > hi[0]) hi[0] = x; if (y > hi[1]) hi[1] = y; if (z > hi[2]) hi[2] = z;
    }
  }
  return [lo.map((v) => v - 0.3), hi.map((v) => v + 0.3)];
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const BUDGET = {frontal: 24000, parietal: 15000, temporal: 19000, occipital: 10000, cingulate: 7000, insula: 4000, corpus_callosum: 9000, caudate: 5000, putamen: 3000, globus_pallidus: 2000, thalamus: 4000, hypothalamus: 4000, pituitary: 2400, pineal: 1200, hippocampus: 5000, amygdala: 2000, fornix: 4500, lateral_ventricle: 9000, third_ventricle: 6000, fourth_ventricle: 2400, midbrain: 9000, pons: 12000, medulla: 8000, cerebellar_hemisphere: 26000, vermis: 20000, olfactory: 1800, optic: 5000};
const Q = 2000; // fixed-point scale for int16 storage
const chunks = [];
let offset = 0;
function pushArray(typed) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
  const at = offset;
  chunks.push(bytes);
  offset += bytes.length;
  return at;
}
const toI16 = (arr) => Int16Array.from(arr, (v) => clamp(Math.round(v * Q), -32767, 32767));

const manifest = { version: 1, scale: Q, parts: [] };
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const t0 = Date.now();
for (const part of parts) {
  if (only && !only.has(part.id)) continue;
  const t1 = Date.now();
  const sdf = part.sdf;
  const box = part.box || autoBox(sdf);
  const grid = sampleGrid(sdf, box, part.h);
  let mesh = surfaceNets(grid);
  mesh = dropSpecks(mesh, 60);
  const before = mesh.tris.length / 3;
  mesh = decimate(mesh, BUDGET[part.id] || before);
  const nv = mesh.pos.length / 3;
  const P = mesh.pos;
  const normals = new Float32Array(nv * 3);
  const sulc = new Float32Array(nv * 4);
  const extra = new Float32Array(nv * 2);
  const hasSulci = part.kind !== 'plain';
  for (let i = 0; i < nv; i++) {
    let x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2];
    // snap onto the surface (two Newton steps)
    for (let it = 0; it < 2; it++) {
      const d = sdf(x, y, z);
      const [gx, gy, gz, gl] = gradient(sdf, x, y, z);
      if (!isFinite(d) || Math.abs(d) > part.h) break;
      const s = d / Math.max(gl, 0.3);
      x -= gx * s; y -= gy * s; z -= gz * s;
    }
    P[3 * i] = x; P[3 * i + 1] = y; P[3 * i + 2] = z;
    const [nx, ny, nz] = gradient(sdf, x, y, z, part.h * 0.5);
    normals[3 * i] = nx; normals[3 * i + 1] = ny; normals[3 * i + 2] = nz;
    if (part.kind === 'cortex') {
      const s = cortexSulci(x, y, z);
      sulc.set(s, 4 * i);
      extra[2 * i] = gyralNoise(x, y, z);
      extra[2 * i + 1] = Math.max(0, -hemiOuter(x, y, z));
    } else {
      // Folia / transverse pontine fibres are drawn as fine lines (the minor
      // channel); blending toward a positive constant fades them out smoothly.
      const [f1, m1, f2, m2] = part.kind === 'cerebellum' ? cerebellumSulci(x, y, z) : brainstemSulci(x, y, z);
      sulc.set([16, 0, f2, m2], 4 * i);
      extra[2 * i] = m1 * f1 + (1 - m1) * 0.25;
    }
  }
  const entry = {
    id: part.id, kind: part.kind, mirror: part.mirror, vertexCount: nv, indexCount: mesh.tris.length,
    position: pushArray(toI16(P)),
    normal: pushArray(Int8Array.from(normals, (v) => Math.round(v * 127))),
  };
  if (hasSulci) {
    entry.sulc = pushArray(toI16(sulc));
    entry.extra = pushArray(toI16(extra));
  }
  entry.index32 = nv > 65535;
  entry.index = pushArray(entry.index32 ? mesh.tris : Uint16Array.from(mesh.tris));
  manifest.parts.push(entry);
  console.log(`${part.id.padEnd(22)} ${String(before).padStart(6)} -> verts ${String(nv).padStart(6)}  tris ${String(mesh.tris.length / 3).padStart(6)}  ${((Date.now() - t1) / 1000).toFixed(1)}s`);
}

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
const out = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)));
manifest.byteLength = out.length;
fs.writeFileSync(path.join(ROOT, 'data/brain.bin.gz'), zlib.gzipSync(out, { level: 9 }));
fs.writeFileSync(path.join(ROOT, 'data/brain.json'), JSON.stringify(manifest, null, 1));
console.log(`total ${(out.length / 1e6).toFixed(2)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
