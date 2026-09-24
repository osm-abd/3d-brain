# Encephalon — an interactive 3D brain atlas

A browser-based atlas of human brain anatomy, drawn as ink line-art over soft atlas colours on a white background. Each structure has its own colour, and the index shows matching swatches.

- **Rotate, zoom and pan** the model (drag / scroll / right-drag, or touch gestures).
- **Click any structure** (on the model or in the index) to select it. The rest of the brain fades to a faint outline, the camera moves to it, and the panel shows its anatomy, functions, clinical notes and blood supply. While it is selected, the slider (or the **Pop out** button) slides it out of the brain like a Lego brick; paired structures come out on both sides together.
- **Explode** (button, slider or <kbd>E</kbd>) pushes every part outward from the centre so you can see the internal layers: cortex → insula and cingulate → corpus callosum and ventricles → basal ganglia and thalamus → brainstem and cerebellum. Cut faces of the cortical lobes show the grey-matter ribbon (hatched) over white matter.
- **½** (<kbd>H</kbd>) hides the left half to show the medial surface. You can hide individual structures from the index, or **Isolate** one.
- Standard views: L / R lateral, A anterior, P posterior, S superior, I inferior. <kbd>Esc</kbd> deselects and <kbd>R</kbd> resets.

## Structures (27 types, 42 parts)

| Group | Structures |
| --- | --- |
| Cerebral cortex | Frontal, parietal, temporal and occipital lobes; insula |
| Limbic system | Cingulate gyrus, hippocampus, amygdala, fornix |
| Commissures | Corpus callosum |
| Basal ganglia | Caudate nucleus, putamen, globus pallidus |
| Diencephalon | Thalamus, hypothalamus (with mammillary bodies), pituitary gland, pineal gland |
| Ventricular system | Lateral ventricles, third ventricle with cerebral aqueduct, fourth ventricle |
| Brainstem | Midbrain, pons, medulla oblongata |
| Cerebellum | Cerebellar hemispheres, vermis |
| Cranial nerves | Olfactory bulbs and tracts (I); optic nerves, chiasm and tracts (II) |

The text in `js/anatomy.js` follows standard references: Gray's Anatomy, Kandel's *Principles of Neural Science*, Nolte's *The Human Brain* and Blumenfeld's *Neuroanatomy through Clinical Cases*. Primary papers are cited where specific figures are quoted, for example Azevedo et al. 2009 for neuron counts and Sereno et al. 2020 for the surface area of the cerebellum.

**About the model:** the 3D geometry is a *schematic* reconstruction for teaching. Every structure sits in its correct place relative to its neighbours and has roughly adult proportions. The shapes are simplified, and the tertiary sulcal pattern is stylised. The major sulci are drawn: central, precentral, postcentral, superior and inferior frontal, intraparietal, superior and inferior temporal, lateral occipital, calcarine, and the lateral fissure. Do not use the model for clinical purposes.

## Running locally

The site is static and needs no build step. Serve the folder over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js r170 is vendored in `vendor/`, so the site works offline. The only external request is for the Google Fonts stylesheet. The site also works on GitHub Pages without changes.

## How the geometry is made

`tools/build-geometry.mjs` (plain Node ≥ 18, no dependencies) generates `data/brain.bin.gz` and `data/brain.json`. To rebuild them:

```sh
node tools/build-geometry.mjs
```

1. Each structure is written as a **signed distance field** in a brain coordinate frame measured in centimetres: +x right, +y superior, +z anterior.
   - Each cerebral hemisphere is a blend of ellipsoids with a flat medial face and a lateral fissure cut into it. Named sulci are carved as grooves, and domain-warped noise carves the tertiary folds.
   - The hemisphere is hollowed into a cortical shell and cut into lobes along the anatomical boundaries: the central sulcus, the lateral fissure and its continuation, the parieto-occipital / pre-occipital line, and the cingulate sulcus.
   - Deep nuclei, ventricles and tracts are built from ellipsoids and swept tubes, then carved against their neighbours. For example, the ventricles are casts that carry impressions of the caudate and thalamus.
2. Each field is polygonised with **surface nets**, reduced with **quadric-error decimation**, and snapped back onto the true surface.
3. Each vertex also stores the values of the sulcal functions. The fragment shader draws their zero-crossings as anti-aliased ink lines. Silhouettes come from an inverted hull that keeps a constant width in screen pixels, and shading uses screen-space hatching.

Structures that come in pairs are built for the right side only and mirrored in the browser.

## Files

```
index.html            page shell
css/style.css         layout and typography
js/main.js            scene, interaction, explode/pull-out, labels
js/materials.js       line-art shaders
js/anatomy.js         anatomical reference text
data/                 generated geometry
tools/                geometry generator
vendor/               three.js (MIT)
```
