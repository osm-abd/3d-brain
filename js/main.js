import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { COLORS, GROUPS, OVERVIEW, STRUCTURES } from './anatomy.js';
import { partMaterial, hullMaterial } from './materials.js';

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
const HOME = { pos: new THREE.Vector3(-30, 12, 26), target: new THREE.Vector3(0, -0.6, 0) };
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 200;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 0.9;

const root = new THREE.Group();
scene.add(root);

const resolution = new THREE.Vector2();
// Portrait screens need the camera further back to fit the brain's width.
const fitScale = () => Math.max(1, 0.8 / camera.aspect);
const homePos = () => HOME.target.clone().add(HOME.pos.clone().sub(HOME.target).multiplyScalar(fitScale()));
const pixelRatio = () => renderer.getPixelRatio();

// ---------------------------------------------------------------------------
// Explode layout. Each vector is where a part travels at full explosion;
// cortical lobes additionally move out from their hemisphere's centre.
// ---------------------------------------------------------------------------
const CORTEX = new Set(['frontal', 'parietal', 'temporal', 'occipital']);
const EXPLODE = {
  insula: [2.9, 0.2, 0.3],
  cingulate: [0.9, 3.4, 0],
  corpus_callosum: [0, 5.2, 0],
  caudate: [1.9, 2.4, 1.4],
  putamen: [3.6, 0.6, 1.4],
  globus_pallidus: [2.4, -0.6, 1.3],
  thalamus: [1.1, 0.8, -1.4],
  hypothalamus: [0, -1.3, 2.4],
  pituitary: [0, -3.4, 3.8],
  pineal: [0, 0.7, -4.0],
  hippocampus: [2.6, -2.2, -1.6],
  amygdala: [2.6, -2.4, 2.4],
  fornix: [0, 3.0, -1.6],
  lateral_ventricle: [1.2, 3.8, -0.8],
  third_ventricle: [0, 1.4, -0.6],
  fourth_ventricle: [0, -2.6, -2.7],
  midbrain: [0, -2.6, -0.6],
  pons: [0, -4.4, 0.8],
  medulla: [0, -6.6, 0.8],
  cerebellar_hemisphere: [2.8, -4.4, -5.2],
  vermis: [0, -4.4, -6.0],
  olfactory: [0.9, -2.6, 5.6],
  optic: [0, -3.0, 4.2],
};
const HEMI_SHIFT = [4.2, 1.0, 0];
const LOBE_PUSH = 3.6;

// ---------------------------------------------------------------------------
// Geometry loading
// ---------------------------------------------------------------------------
async function loadBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  let buf = new Uint8Array(await res.arrayBuffer());
  // The file is gzip-compressed unless the server already decoded it.
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return buf.buffer;
}

function decodePart(entry, buffer, scale) {
  const n = entry.vertexCount;
  const pos = new Float32Array(n * 3);
  const qp = new Int16Array(buffer, entry.position, n * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = qp[i] / scale;
  const qn = new Int8Array(buffer, entry.normal, n * 3);
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < nrm.length; i++) nrm[i] = qn[i] / 127;
  const sulc = new Float32Array(n * 4);
  const extra = new Float32Array(n * 2);
  if (entry.sulc !== undefined) {
    const qs = new Int16Array(buffer, entry.sulc, n * 4);
    for (let i = 0; i < sulc.length; i++) sulc[i] = qs[i] / scale;
    const qe = new Int16Array(buffer, entry.extra, n * 2);
    for (let i = 0; i < extra.length; i++) extra[i] = qe[i] / scale;
  } else {
    for (let i = 0; i < n; i++) { sulc[4 * i] = 16; sulc[4 * i + 2] = 16; extra[2 * i] = 16; }
  }
  const index = entry.index32
    ? new Uint32Array(buffer.slice(entry.index, entry.index + entry.indexCount * 4))
    : new Uint16Array(buffer.slice(entry.index, entry.index + entry.indexCount * 2));
  return { pos, nrm, sulc, extra, index };
}

function makeGeometry(d, mirror) {
  const g = new THREE.BufferGeometry();
  let pos = d.pos, nrm = d.nrm, index = d.index;
  if (mirror) {
    pos = pos.slice(); nrm = nrm.slice(); index = index.slice();
    for (let i = 0; i < pos.length; i += 3) { pos[i] = -pos[i]; nrm[i] = -nrm[i]; }
    for (let i = 0; i < index.length; i += 3) { const t = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = t; }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('sulc', new THREE.BufferAttribute(d.sulc, 4));
  g.setAttribute('extra', new THREE.BufferAttribute(d.extra, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
const parts = [];          // one per rendered instance (left/right separately)
const partsById = new Map(); // structure id -> [instances]
const pickables = [];

function createInstance(id, geometry, side) {
  const info = STRUCTURES[id];
  const material = partMaterial();
  material.uniforms.uTint.value.setStyle(COLORS[id] || '#dddddd', THREE.LinearSRGBColorSpace); // shader outputs sRGB directly
  const mesh = new THREE.Mesh(geometry, material);
  const hull = new THREE.Mesh(geometry, hullMaterial());
  hull.raycast = () => {};
  const group = new THREE.Group();
  group.add(hull, mesh);
  root.add(group);

  const bb = geometry.boundingBox;
  const center = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  // Anchor labels on the vertex nearest the box centre (C-shaped parts have hollow centres).
  const p = geometry.attributes.position;
  const anchor = new THREE.Vector3();
  let best = Infinity;
  for (let i = 0; i < p.count; i += 7) {
    const dx = p.getX(i) - center.x, dy = p.getY(i) - center.y, dz = p.getZ(i) - center.z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < best) { best = d; anchor.set(p.getX(i), p.getY(i), p.getZ(i)); }
  }

  // Candidate label points: the anchor plus the vertices nearest each octant
  // centre of the bounding box, so a partly hidden part can still be labelled.
  const samples = [anchor.clone()];
  for (let o = 0; o < 8; o++) {
    const oc = new THREE.Vector3(
      center.x + size.x * ((o & 1) ? 0.25 : -0.25),
      center.y + size.y * ((o & 2) ? 0.25 : -0.25),
      center.z + size.z * ((o & 4) ? 0.25 : -0.25));
    let bestD = Infinity; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 5) {
      const dx = p.getX(i) - oc.x, dy = p.getY(i) - oc.y, dz = p.getZ(i) - oc.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; v.set(p.getX(i), p.getY(i), p.getZ(i)); }
    }
    if (samples.every((q) => q.distanceToSquared(v) > 0.04)) samples.push(v);
  }

  const s = side === 'left' ? -1 : 1;
  const explode = new THREE.Vector3();
  if (CORTEX.has(id)) {
    const hemiCenter = new THREE.Vector3(3.3 * s, 1.3, -0.3);
    const out = center.clone().sub(hemiCenter);
    out.x *= 0.6;
    out.normalize().multiplyScalar(LOBE_PUSH);
    explode.set(HEMI_SHIFT[0] * s, HEMI_SHIFT[1], HEMI_SHIFT[2]).add(out);
  } else {
    const e = EXPLODE[id] || [0, 0, 0];
    explode.set(e[0] * (side ? s : 1), e[1], e[2]);
    if (id === 'insula' || id === 'cingulate') explode.x += HEMI_SHIFT[0] * s * (id === 'insula' ? 1 : 0.35);
  }
  // Direction a part slides when it is pulled out on its own.
  const pull = explode.clone();
  if (pull.lengthSq() < 1e-6) pull.set(0, 1, 0);
  pull.normalize().multiplyScalar(CORTEX.has(id) || id === 'cerebellar_hemisphere' ? 2.8 : 2.0);

  // Where the structure travels when it is popped out on its own: far enough
  // to clear the brain even for deep nuclei.
  const popout = explode.clone();
  if (popout.lengthSq() < 1e-6) popout.set(0, 1, 0);
  popout.setLength(Math.max(popout.length(), 3.5)).add(pull.clone().multiplyScalar(1.2));

  const inst = {
    key: side ? `${id}:${side}` : id, id, side, info, mesh, hull, group, center, size, anchor, samples, labelAt: anchor.clone(), explode, pull, popout,
    offset: new THREE.Vector3(), inView: false, ghost: 0, hover: 0, visible: true, label: null,
  };
  mesh.userData.inst = inst;
  parts.push(inst);
  pickables.push(mesh);
  if (!partsById.has(id)) partsById.set(id, []);
  partsById.get(id).push(inst);
  return inst;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  explode: 0,
  explodeTarget: 0,
  selected: null,   // structure id; both members of a pair are selected together
  colorful: false,
  color: 0,         // animated 0..1 blend toward colour mode
  hovered: null,
  labels: true,
  half: false,
  hiddenIds: new Set(),
};

// ---------------------------------------------------------------------------
// UI: index
// ---------------------------------------------------------------------------
const $ = (s) => document.querySelector(s);
const indexList = $('#index-list');
const infoPanel = $('#info');
const tooltip = $('#tooltip');
const labelsLayer = $('#labels');
const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><path d="M4 4l16 16"/></svg>';
const itemEls = new Map();

function buildIndex() {
  let n = 0;
  for (const g of GROUPS) {
    const ids = Object.keys(STRUCTURES).filter((id) => STRUCTURES[id].group === g.id && partsById.has(id));
    if (!ids.length) continue;
    const section = document.createElement('section');
    section.dataset.group = g.id;
    const title = document.createElement('div');
    title.className = 'group-title';
    title.innerHTML = `<span>${g.name}</span>`;
    section.appendChild(title);
    for (const id of ids) {
      n++;
      const row = document.createElement('div');
      row.className = 'item';
      row.dataset.id = id;
      row.innerHTML = `<button class="item-name" type="button"><span class="num">${String(n).padStart(2, '0')}</span><span class="swatch" style="background:${COLORS[id] || '#ddd'}"></span><span class="label">${STRUCTURES[id].name}</span></button>` +
        `<button class="eye" type="button" aria-label="Hide ${STRUCTURES[id].name}" title="Show / hide">${EYE}</button>`;
      row.querySelector('.item-name').addEventListener('click', () => select(state.selected === id ? null : id));
      row.querySelector('.item-name').addEventListener('mouseenter', () => setHover(id));
      row.querySelector('.item-name').addEventListener('mouseleave', () => setHover(null));
      row.querySelector('.eye').addEventListener('click', () => toggleHidden(id));
      section.appendChild(row);
      itemEls.set(id, row);
      STRUCTURES[id].number = n;
    }
    indexList.appendChild(section);
  }
  $('#search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const [id, el] of itemEls) {
      const s = STRUCTURES[id];
      const hit = !q || s.name.toLowerCase().includes(q) || s.latin.toLowerCase().includes(q) ||
        GROUPS.find((g) => g.id === s.group).name.toLowerCase().includes(q);
      el.style.display = hit ? '' : 'none';
    }
    for (const sec of indexList.querySelectorAll('section')) {
      sec.style.display = [...sec.querySelectorAll('.item')].some((el) => el.style.display !== 'none') ? '' : 'none';
    }
  });
}

function toggleHidden(id) {
  if (state.hiddenIds.has(id)) state.hiddenIds.delete(id); else state.hiddenIds.add(id);
  const row = itemEls.get(id);
  const hidden = state.hiddenIds.has(id);
  row.classList.toggle('hidden', hidden);
  row.querySelector('.eye').innerHTML = hidden ? EYE_OFF : EYE;
  row.querySelector('.eye').setAttribute('aria-label', `${hidden ? 'Show' : 'Hide'} ${STRUCTURES[id].name}`);
  if (hidden && state.selected === id) select(null);
  applyVisibility();
}

function applyVisibility() {
  for (const p of parts) {
    p.visible = !state.hiddenIds.has(p.id) && !(state.half && p.side === 'left');
    p.group.visible = p.visible;
  }
}

// ---------------------------------------------------------------------------
// UI: info panel
// ---------------------------------------------------------------------------
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function renderInfo() {
  const id = state.selected;
  if (!id) {
    const o = OVERVIEW;
    infoPanel.innerHTML = `<div class="kicker"><span>Overview</span><span>${parts.length} parts</span></div>
      <h2>${o.name}</h2><p class="latin">${o.latin}</p><p class="summary">${esc(o.summary)}</p>
      ${o.sections.map(([h, items]) => `<h3>${h}</h3><ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`).join('')}
      <p class="note">${esc(o.note)}</p>`;
    return;
  }
  const s = STRUCTURES[id];
  const group = GROUPS.find((g) => g.id === s.group);
  const sideText = s.bilateral ? 'Left & right · paired' : 'Midline · unpaired';
  infoPanel.innerHTML = `<div class="kicker"><span>${String(s.number).padStart(2, '0')} · ${group.name}</span><span>${sideText}</span></div>
    <h2>${s.name}</h2><p class="latin">${esc(s.latin)}</p>
    <div class="actions"><button class="chip-btn" data-act="back" type="button">← Overview</button>
    <button class="chip-btn" data-act="isolate" type="button">${isIsolated(id) ? 'Show all' : 'Isolate'}</button></div>
    <p class="summary">${esc(s.summary)}</p>
    ${s.sections.map(([h, items]) => `<h3>${h}</h3><ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`).join('')}`;
  infoPanel.querySelector('[data-act="back"]').addEventListener('click', () => select(null));
  infoPanel.querySelector('[data-act="isolate"]').addEventListener('click', () => isolate(id));
  infoPanel.scrollTop = 0;
}

function isIsolated(id) {
  return [...partsById.keys()].every((k) => k === id || state.hiddenIds.has(k));
}
function isolate(id) {
  const isolated = isIsolated(id);
  for (const k of partsById.keys()) {
    const hide = !isolated && k !== id;
    if (hide !== state.hiddenIds.has(k)) toggleHidden(k);
  }
  renderInfo();
  focusOn(id);
}

// ---------------------------------------------------------------------------
// Selection / hover
// ---------------------------------------------------------------------------
// Selecting only highlights a structure; it pops out when the explode
// slider (or the "Pop out" button) is used while it is selected.
function select(id) {
  if (id !== state.selected) setExplode(0, true, false);
  state.selected = id;
  explodeLabel.textContent = id ? 'Pop out' : 'Explode';
  explodeBtn.title = id ? 'Pop the selected structure out of the brain (E)' : 'Expand every part outward from the centre (E)';
  for (const [k, el] of itemEls) el.classList.toggle('active', k === id);
  if (id) {
    const row = itemEls.get(id);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    focusOn(id);
  } else {
    flyTo(null, HOME.target.clone());
  }
  renderInfo();
  infoPanel.classList.remove('collapsed');
}

function setHover(id, side = null) {
  state.hovered = id ? { id, side } : null;
  for (const [k, el] of itemEls) el.classList.toggle('hover', k === id);
}

// ---------------------------------------------------------------------------
// Camera animation
// ---------------------------------------------------------------------------
let fly = null;
function flyTo(pos, target, duration = 0.9) {
  fly = { t: 0, duration, fromPos: camera.position.clone(), toPos: pos ? pos.clone() : null, fromTarget: controls.target.clone(), toTarget: target.clone() };
}
function partWorldCenter(inst) {
  const off = targetOffset(inst);
  return inst.center.clone().add(off);
}
function focusOn(id) {
  const list = (partsById.get(id) || []).filter((p) => p.visible);
  if (!list.length) return;
  // Frame every visible member of the structure (both sides of a pair).
  const box = new THREE.Box3();
  for (const p of list) {
    const c = partWorldCenter(p);
    box.expandByPoint(c.clone().addScaledVector(p.size, 0.5)).expandByPoint(c.clone().addScaledVector(p.size, -0.5));
  }
  const target = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 1.2);
  const dir = (fly && fly.toPos ? fly.toPos.clone().sub(fly.toTarget) : camera.position.clone().sub(controls.target)).normalize();
  if (list.length === 1) dir.lerp(list[0].pull.clone().normalize(), 0.45).normalize();
  const dist = THREE.MathUtils.clamp(radius * 4.2, 20, 70) * fitScale();
  flyTo(target.clone().add(dir.multiplyScalar(dist)), target);
}

const VIEWS = {
  left: [-1, 0.05, 0], right: [1, 0.05, 0], front: [0, 0.08, 1], back: [0, 0.08, -1], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001],
};
function setView(name) {
  const d = new THREE.Vector3(...VIEWS[name]).normalize();
  const target = controls.target.clone();
  const dist = camera.position.distanceTo(controls.target);
  flyTo(target.clone().add(d.multiplyScalar(dist)), target);
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables.filter((m) => m.parent.visible), false);
  if (!hits.length) return null;
  // While something is selected, the solid (selected) part wins over the ghosts in front of it.
  if (state.selected) {
    const solid = hits.find((h) => h.object.userData.inst.id === state.selected);
    if (solid) return solid.object.userData.inst;
  }
  return hits[0].object.userData.inst;
}

let down = null;
let lastHoverPick = 0;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  canvas.classList.add('dragging');
});
window.addEventListener('pointerup', (e) => {
  canvas.classList.remove('dragging');
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const wasCanvas = e.target === canvas;
  down = null;
  if (!wasCanvas || moved > 6) return;
  const inst = pick(e.clientX, e.clientY);
  if (!inst) { if (state.selected) select(null); return; }
  if (state.selected === inst.id) select(null);
  else select(inst.id);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const now = performance.now();
  if (down || now - lastHoverPick < 50) return;
  lastHoverPick = now;
  const inst = pick(e.clientX, e.clientY);
  setHover(inst?.id || null, inst?.side || null);
  canvas.classList.toggle('pointing', !!inst);
  if (inst) {
    const side = inst.side ? `<span class="side">${inst.side}</span>` : '';
    tooltip.innerHTML = `${esc(inst.info.name)}${side}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.classList.add('show');
  } else tooltip.classList.remove('show');
});
canvas.addEventListener('pointerleave', () => { tooltip.classList.remove('show'); setHover(null); });

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------
const explodeBtn = $('#explode-btn');
const explodeRange = $('#explode-range');
const explodeLabel = explodeBtn.querySelector('span');
function setExplode(v, animate = true, reframe = true) {
  state.explodeTarget = v;
  if (!animate) state.explode = v;
  explodeBtn.setAttribute('aria-pressed', String(v > 0.5));
  explodeRange.value = v;
  if (!reframe) return;
  if (state.selected) focusOn(state.selected);
  else zoomForExplode(v);
}
// Pull the camera back far enough to frame the exploded (or assembled) brain.
function zoomForExplode(v) {
  const from = fly && fly.toPos ? fly.toPos : camera.position;
  const dir = from.clone().sub(fly ? fly.toTarget : controls.target).normalize();
  const dist = THREE.MathUtils.lerp(HOME.pos.distanceTo(HOME.target), 66, v) * fitScale();
  flyTo(HOME.target.clone().add(dir.multiplyScalar(dist)), HOME.target);
}
explodeBtn.addEventListener('click', () => setExplode(state.explodeTarget > 0.5 ? 0 : 1));
explodeRange.addEventListener('input', () => {
  state.explodeTarget = Number(explodeRange.value);
  state.explode = state.explodeTarget;
  explodeBtn.setAttribute('aria-pressed', String(state.explodeTarget > 0.5));
});
explodeRange.addEventListener('change', () => {
  if (state.selected) focusOn(state.selected);
  else zoomForExplode(state.explodeTarget);
});
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => setView(b.dataset.view));
$('#reset-btn').addEventListener('click', resetAll);
const halfBtn = $('#half-btn');
function toggleHalf() {
  state.half = !state.half;
  halfBtn.setAttribute('aria-pressed', String(state.half));
  applyVisibility();
  if (state.half && !state.selected) {
    const d = HOME.pos.distanceTo(HOME.target) * (1 + state.explodeTarget * 0.6) * fitScale();
    flyTo(HOME.target.clone().add(new THREE.Vector3(-1, 0.05, 0).multiplyScalar(d)), HOME.target);
  }
}
halfBtn.addEventListener('click', toggleHalf);
const colorBtn = $('#color-btn');
function toggleColor() {
  state.colorful = !state.colorful;
  colorBtn.setAttribute('aria-pressed', String(state.colorful));
  document.body.classList.toggle('colorful', state.colorful);
}
colorBtn.addEventListener('click', toggleColor);
const labelsBtn = $('#labels-btn');
labelsBtn.addEventListener('click', () => {
  state.labels = !state.labels;
  labelsBtn.setAttribute('aria-pressed', String(state.labels));
});
function resetAll() {
  for (const id of [...state.hiddenIds]) toggleHidden(id);
  if (state.half) toggleHalf();
  setExplode(0);
  select(null);
  flyTo(homePos(), HOME.target, 1.1);
}
const indexToggle = $('#index-toggle');
indexToggle.addEventListener('click', () => {
  const open = !$('#index').classList.contains('open');
  $('#index').classList.toggle('open', open);
  indexToggle.setAttribute('aria-expanded', String(open));
});
infoPanel.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && infoPanel.classList.contains('collapsed') && !e.target.closest('button')) infoPanel.classList.remove('collapsed');
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') select(null);
  else if (e.key === 'e' || e.key === 'E') setExplode(state.explodeTarget > 0.5 ? 0 : 1);
  else if (e.key === 'h' || e.key === 'H') toggleHalf();
  else if (e.key === 'c' || e.key === 'C') toggleColor();
  else if (e.key === 'r' || e.key === 'R') resetAll();
});

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
let labelOrder = [];
function buildLabels() {
  // Bigger structures claim label space first.
  labelOrder = [...parts].sort((a, b) => b.size.length() - a.size.length());
  for (const p of parts) {
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = p.info.name;
    el.style.opacity = '0';
    labelsLayer.appendChild(el);
    p.label = el;
  }
}
const tmp = new THREE.Vector3();
const placed = [];
function overlaps(x, y, w, h) {
  for (const r of placed) if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
  return false;
}
// Occlusion test for labels: a label is shown only if the first opaque
// surface on the ray from the camera to its anchor belongs to that structure.
// A few parts are re-tested each frame so the cost stays small.
const occRay = new THREE.Raycaster();
const occDir = new THREE.Vector3();
let occCursor = 0;
function updateOcclusion(budget = 4) {
  if (!labelOrder.length) return;
  const blockers = parts.filter((q) => q.visible && q.ghost < 0.5).map((q) => q.mesh);
  for (let n = 0; n < budget; n++) {
    const p = labelOrder[occCursor++ % labelOrder.length];
    p.inView = false;
    if (!p.visible) continue;
    for (const sample of p.samples) {
      const pt = tmp.copy(sample).add(p.offset);
      occDir.subVectors(pt, camera.position);
      const dist = occDir.length();
      occRay.set(camera.position, occDir.divideScalar(dist));
      occRay.far = dist + 0.05;
      const hit = occRay.intersectObjects(blockers, false)[0];
      if (!hit || hit.object === p.mesh) { p.inView = true; p.labelAt.copy(sample); break; }
    }
  }
}

function updateLabels() {
  placed.length = 0;
  updateOcclusion();
  const w = resolution.x / pixelRatio(), h = resolution.y / pixelRatio();
  const showAll = state.labels && state.explode > 0.55;
  for (const p of labelOrder) {
    const isSel = state.selected === p.id;
    let show = p.visible && state.labels && (isSel || (showAll && !state.selected));
    if (show && !isSel && p.side && !state.half) {
      // Only label the member of a pair that faces the camera.
      const twin = partsById.get(p.id).find((q) => q !== p);
      if (twin && twin.visible) {
        const dp = camera.position.distanceToSquared(tmp.copy(p.anchor).add(p.offset));
        const dq = camera.position.distanceToSquared(tmp.copy(twin.anchor).add(twin.offset));
        if (dp > dq) show = false;
      }
    }
    // Hide labels of structures hidden behind others (seen from this angle).
    if (show && !p.inView) show = false;
    if (!show) { if (p.label.style.opacity !== '0') p.label.style.opacity = '0'; continue; }
    tmp.copy(p.labelAt).add(p.offset).project(camera);
    if (tmp.z > 1) { p.label.style.opacity = '0'; continue; }
    const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
    if (!p.labelW) p.labelW = p.label.offsetWidth + 6;
    if (!isSel && overlaps(x - 4, y - 16, p.labelW, 17)) { p.label.style.opacity = '0'; continue; }
    placed.push({ x: x - 4, y: y - 16, w: p.labelW, h: 17 });
    p.label.style.transform = `translate(${x.toFixed(1)}px, ${(y - 8).toFixed(1)}px)`;
    p.label.style.opacity = '1';
    p.label.classList.toggle('selected', state.selected === p.id);
  }
}

// ---------------------------------------------------------------------------
// Orientation compass
// ---------------------------------------------------------------------------
const compass = $('#compass');
const AXES = [
  { v: new THREE.Vector3(0, 0, 1), pos: 'A', neg: 'P' },
  { v: new THREE.Vector3(0, 1, 0), pos: 'S', neg: 'I' },
  { v: new THREE.Vector3(1, 0, 0), pos: 'R', neg: 'L' },
];
function updateCompass() {
  const q = camera.quaternion.clone().invert();
  let html = '<circle r="46" fill="none" stroke="#e4e4e0" />';
  const items = [];
  for (const a of AXES) {
    const d = a.v.clone().applyQuaternion(q);
    items.push({ d, label: a.pos, strong: true }, { d: d.clone().negate(), label: a.neg, strong: false });
  }
  items.sort((a, b) => a.d.z - b.d.z);
  for (const it of items) {
    const x = it.d.x * 30, y = -it.d.y * 30;
    const op = it.d.z < 0 ? 0.35 : 1;
    html += `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#111" stroke-opacity="${op * (it.strong ? 1 : 0.4)}" ${it.strong ? '' : 'stroke-dasharray="2 2"'}/>`;
    html += `<text x="${(x * 1.33).toFixed(1)}" y="${(y * 1.33).toFixed(1)}" fill="#111" fill-opacity="${op * (it.strong ? 1 : 0.55)}">${it.label}</text>`;
  }
  compass.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
// With nothing selected the slider explodes every part. With a selection it
// pops out only the selected structure (both sides of a pair); the rest stay put.
function offsetFor(p, amount, out = new THREE.Vector3()) {
  if (!state.selected) return out.copy(p.explode).multiplyScalar(amount);
  if (state.selected !== p.id) return out.set(0, 0, 0);
  return out.copy(p.popout).multiplyScalar(amount);
}
function targetOffset(p) {
  return offsetFor(p, state.explodeTarget);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(resolution);
  camera.aspect = w / h;
  // Keep the brain clear of the side panels on wide screens.
  const shift = w > 900 ? ((240 - 340) / 2) : 0;
  camera.setViewOffset(w, h, -shift, w > 900 ? 0 : h * 0.06, w, h);
  camera.updateProjectionMatrix();
  for (const p of parts) p.hull.material.uniforms.uResolution.value.copy(resolution);
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
const tmpOffset = new THREE.Vector3();
let compassTick = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  let k = 1 - Math.exp(-dt * 5.5);
  if (state.instant) { k = 1; if (fly) fly.t = 1; }

  state.explode += (state.explodeTarget - state.explode) * k;
  state.color += ((state.colorful ? 1 : 0) - state.color) * k;
  if (Math.abs(state.color - (state.colorful ? 1 : 0)) < 0.002) state.color = state.colorful ? 1 : 0;

  if (fly) {
    fly.t += dt / fly.duration;
    const t = Math.min(fly.t, 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
    if (fly.toPos) camera.position.lerpVectors(fly.fromPos, fly.toPos, e);
    if (t >= 1) fly = null;
  }
  controls.update();

  const sel = state.selected;
  for (const p of parts) {
    const pulled = sel === p.id;
    p.offset.lerp(offsetFor(p, state.explode, tmpOffset), k);
    p.group.position.copy(p.offset);

    const ghostTarget = sel && sel !== p.id ? 1 : 0;
    p.ghost += (ghostTarget - p.ghost) * k;
    if (Math.abs(p.ghost - ghostTarget) < 0.002) p.ghost = ghostTarget;
    const hov = state.hovered && state.hovered.id === p.id && (!state.hovered.side || !p.side || state.hovered.side === p.side) ? 1 : 0;
    p.hover += (hov - p.hover) * Math.min(1, k * 2);

    const u = p.mesh.material.uniforms;
    u.uGhost.value = p.ghost;
    u.uHover.value = p.hover;
    u.uColor.value = state.color;
    u.uPixelRatio.value = pixelRatio();
    const transparent = p.ghost > 0.001;
    if (p.mesh.material.transparent !== transparent) {
      p.mesh.material.transparent = transparent;
      p.mesh.material.depthWrite = !transparent;
      p.mesh.material.needsUpdate = true;
    }
    p.mesh.renderOrder = transparent ? 2 : 0;
    p.hull.visible = p.ghost < 0.5;
    p.hull.material.uniforms.uWidth.value = (pulled ? 2.1 : 1.35) * pixelRatio();
  }

  renderer.render(scene, camera);
  updateLabels();
  if (++compassTick % 2 === 0) updateCompass();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  const loaderText = $('#loader-text');
  try {
    if (!renderer.getContext()) throw new Error('WebGL unavailable');
    const [manifest, buffer] = await Promise.all([
      fetch('data/brain.json').then((r) => r.json()),
      loadBinary('data/brain.bin.gz'),
    ]);
    for (const entry of manifest.parts) {
      if (!STRUCTURES[entry.id]) continue;
      const decoded = decodePart(entry, buffer, manifest.scale);
      if (entry.mirror) {
        createInstance(entry.id, makeGeometry(decoded, false), 'right');
        createInstance(entry.id, makeGeometry(decoded, true), 'left');
      } else {
        createInstance(entry.id, makeGeometry(decoded, false), null);
      }
    }
    buildIndex();
    buildLabels();
    renderInfo();
    resize();
    camera.position.copy(homePos());
    if (window.innerWidth <= 900) infoPanel.classList.add('collapsed');
    requestAnimationFrame(frame);
    $('#loader').classList.add('done');
    window.__atlas = { state, parts, select, setExplode, setView, camera, controls, toggleHalf, toggleColor };
  } catch (err) {
    console.error(err);
    loaderText.textContent = 'Sorry — this atlas needs a browser with WebGL. (' + err.message + ')';
  }
}
boot();
