// Reference content for every structure in the atlas.
// Sources are standard neuroanatomy texts (Gray's Anatomy; Kandel et al.,
// Principles of Neural Science; Nolte, The Human Brain; Blumenfeld,
// Neuroanatomy through Clinical Cases) plus the primary papers cited inline.

export const GROUPS = [
  { id: 'cortex', name: 'Cerebral cortex', note: 'Lobes of the cerebral hemispheres' },
  { id: 'limbic', name: 'Limbic system', note: 'Memory, emotion and motivation' },
  { id: 'white', name: 'Commissures', note: 'White-matter connections between the hemispheres' },
  { id: 'basal', name: 'Basal ganglia', note: 'Deep grey nuclei for action selection' },
  { id: 'dien', name: 'Diencephalon', note: 'Thalamus, hypothalamus, epithalamus' },
  { id: 'vent', name: 'Ventricular system', note: 'Cavities filled with cerebrospinal fluid' },
  { id: 'stem', name: 'Brainstem', note: 'Connects the brain to the spinal cord' },
  { id: 'cereb', name: 'Cerebellum', note: 'Coordination, balance and motor learning' },
  { id: 'nerves', name: 'Cranial nerves', note: 'Sensory nerves I and II' },
];

export const OVERVIEW = {
  name: 'The human brain',
  latin: 'Encephalon',
  summary:
    'The adult brain weighs about 1.3–1.4 kg — roughly 2% of body mass — yet consumes around 20% of the body’s resting energy. It contains about 86 billion neurons and a comparable number of glial cells.',
  sections: [
    ['How to use', [
      'Drag to rotate, scroll or pinch to zoom, right-drag (or two-finger drag) to pan.',
      'Click any structure — on the model or in the list — to highlight it and read about it; then move the slider (or press “Pop out”) to pull it out of the brain.',
      'Use “Explode” to separate every part from the centre and reveal the internal layers.',
      'Cut faces of the cortical lobes show the ribbon of grey matter (hatched) over white matter.',
    ]],
    ['Key numbers', [
      '≈86 billion neurons: ≈16 billion in the cerebral cortex and ≈69 billion in the cerebellum (Azevedo et al., 2009).',
      'Cerebral cortex is 1–4.5 mm thick (average ≈2.5 mm); its folding lets roughly two-thirds of the cortical surface lie hidden within sulci.',
      'About 150 mL of cerebrospinal fluid surrounds and fills the brain; ≈500 mL is produced each day.',
      'The brain receives ≈15% of cardiac output (≈750 mL of blood per minute) through the internal carotid and vertebral arteries, linked at the circle of Willis.',
    ]],
    ['Orientation', [
      'Anterior / rostral = toward the face; posterior / caudal = toward the back of the head.',
      'Superior / dorsal = toward the top; inferior / ventral = toward the base.',
      'Medial = toward the midline; lateral = away from the midline.',
    ]],
  ],
  note: 'The 3D model is a schematic reconstruction built for teaching: shapes, sizes and positions approximate average adult anatomy but are simplified. It is not intended for clinical use.',
};

export const STRUCTURES = {
  frontal: {
    name: 'Frontal lobe',
    latin: 'Lobus frontalis',
    group: 'cortex',
    bilateral: true,
    summary:
      'The largest lobe of each hemisphere, lying in front of the central sulcus and above the lateral (Sylvian) fissure. It plans and executes voluntary movement and supports executive function, language production and social behaviour.',
    sections: [
      ['Landmarks', [
        'Bounded posteriorly by the central sulcus and inferiorly by the lateral fissure; its medial surface faces the other hemisphere across the longitudinal fissure.',
        'Precentral gyrus (primary motor cortex, Brodmann area 4) lies directly in front of the central sulcus.',
        'Superior, middle and inferior frontal gyri run front-to-back, separated by the superior and inferior frontal sulci (drawn on the model).',
        'The orbital surface rests on the roof of the orbits; the olfactory bulb and tract lie in its olfactory sulcus.',
      ]],
      ['Functions', [
        'Primary motor cortex (area 4) sends the corticospinal and corticobulbar tracts; it is somatotopically mapped (the motor homunculus).',
        'Premotor and supplementary motor areas (area 6) plan and sequence movement; frontal eye fields (area 8) direct voluntary gaze.',
        'Broca’s area (pars opercularis and triangularis, areas 44/45), usually in the left hemisphere, is critical for speech production and grammar.',
        'Prefrontal cortex supports working memory, planning, decision-making, inhibition and flexible behaviour; orbitofrontal cortex evaluates reward and guides social conduct.',
      ]],
      ['Clinical notes', [
        'Damage to Broca’s area causes non-fluent (expressive) aphasia with relatively preserved comprehension.',
        'Prefrontal injury can cause disinhibition, apathy or impaired planning — famously illustrated by Phineas Gage (1848).',
        'A lesion of the precentral gyrus produces weakness of the opposite side of the body.',
      ]],
      ['Blood supply', ['Anterior cerebral artery (medial surface) and middle cerebral artery (lateral surface).']],
    ],
  },
  parietal: {
    name: 'Parietal lobe',
    latin: 'Lobus parietalis',
    group: 'cortex',
    bilateral: true,
    summary:
      'Lies between the central sulcus and the parieto-occipital sulcus, above the lateral fissure. It processes touch and body position and builds the spatial maps used for attention and for guiding movement.',
    sections: [
      ['Landmarks', [
        'Postcentral gyrus (primary somatosensory cortex, areas 3, 1, 2) lies directly behind the central sulcus, bounded behind by the postcentral sulcus.',
        'The intraparietal sulcus divides the superior parietal lobule from the inferior parietal lobule.',
        'The inferior parietal lobule contains the supramarginal gyrus (area 40), capping the end of the lateral fissure, and the angular gyrus (area 39).',
        'On the medial surface: the precuneus and the posterior part of the paracentral lobule.',
      ]],
      ['Functions', [
        'Primary somatosensory cortex receives touch, pressure, vibration, pain, temperature and proprioception from the opposite side of the body, mapped as a sensory homunculus.',
        'Posterior parietal cortex integrates vision, touch and proprioception to guide reaching and grasping (the dorsal “where/how” visual stream).',
        'Directs spatial attention; the right hemisphere is dominant for attending to both sides of space.',
        'The left inferior parietal lobule supports reading, writing and calculation.',
      ]],
      ['Clinical notes', [
        'Right parietal damage commonly causes hemispatial neglect — failure to attend to the left side of space.',
        'Gerstmann syndrome (agraphia, acalculia, finger agnosia, left–right confusion) follows lesions of the dominant angular gyrus.',
        'Postcentral lesions cause loss of fine touch and position sense on the opposite side.',
      ]],
      ['Blood supply', ['Middle cerebral artery (lateral surface); anterior cerebral artery (medial surface).']],
    ],
  },
  temporal: {
    name: 'Temporal lobe',
    latin: 'Lobus temporalis',
    group: 'cortex',
    bilateral: true,
    summary:
      'Lies below the lateral fissure, in the middle cranial fossa. It contains the auditory cortex, language-comprehension areas, higher visual areas for recognising objects and faces, and — on its medial side — structures essential for memory.',
    sections: [
      ['Landmarks', [
        'Superior, middle and inferior temporal gyri, separated by the superior and inferior temporal sulci (drawn on the model).',
        'Transverse temporal gyri of Heschl, on the upper surface hidden inside the lateral fissure, contain primary auditory cortex (areas 41/42).',
        'The inferior surface carries the fusiform and parahippocampal gyri; the temporal pole points forward.',
        'The hippocampus and amygdala lie deep in its medial part, alongside the temporal horn of the lateral ventricle.',
      ]],
      ['Functions', [
        'Hearing: primary auditory cortex is tonotopically organised; each side receives input from both ears.',
        'Wernicke’s area (posterior superior temporal gyrus, usually left) is central to understanding spoken language.',
        'The inferior temporal cortex forms the ventral “what” visual stream; the fusiform face area is specialised for recognising faces.',
        'Medial temporal structures form new declarative memories.',
      ]],
      ['Clinical notes', [
        'Temporal lobe epilepsy is the most common focal epilepsy in adults, often with hippocampal sclerosis.',
        'Wernicke’s aphasia: fluent but meaningless speech with poor comprehension.',
        'Bilateral anterior temporal damage can produce Klüver–Bucy syndrome (placidity, hyperorality, visual agnosia).',
        'Upper-quadrant visual field loss (“pie in the sky”) results from damage to Meyer’s loop of the optic radiation.',
      ]],
      ['Blood supply', ['Middle cerebral artery (lateral surface); posterior cerebral artery (inferior and medial surfaces).']],
    ],
  },
  occipital: {
    name: 'Occipital lobe',
    latin: 'Lobus occipitalis',
    group: 'cortex',
    bilateral: true,
    summary:
      'The smallest of the four main lobes, at the back of each hemisphere. It is devoted to vision and contains the primary visual cortex.',
    sections: [
      ['Landmarks', [
        'Separated from the parietal lobe by the parieto-occipital sulcus on the medial surface; on the lateral surface the border is an imaginary line to the pre-occipital notch.',
        'The calcarine sulcus runs horizontally across the medial surface (drawn on the model).',
        'Its underside rests on the tentorium cerebelli, above the cerebellum.',
      ]],
      ['Functions', [
        'Primary visual cortex (V1, area 17, “striate cortex”) lines the calcarine sulcus; it is named for the stria of Gennari visible to the naked eye.',
        'Each V1 receives the opposite visual hemifield; the macula is represented most posteriorly at the occipital pole with a greatly magnified area.',
        'Visual association areas (V2, V3, V4 for colour, V5/MT for motion at the occipito-temporal junction) extract form, colour and movement.',
      ]],
      ['Clinical notes', [
        'Unilateral V1 damage causes a contralateral homonymous hemianopia, often with macular sparing because the occipital pole may also receive blood from the middle cerebral artery.',
        'Bilateral damage causes cortical blindness; in Anton syndrome patients deny being blind.',
      ]],
      ['Blood supply', ['Posterior cerebral artery (calcarine branch).']],
    ],
  },
  insula: {
    name: 'Insula',
    latin: 'Lobus insularis',
    group: 'cortex',
    bilateral: true,
    summary:
      'The “island of Reil” — a lobe of cortex hidden deep in the lateral fissure, covered by the opercula (“lids”) of the frontal, parietal and temporal lobes. Explode the model to see it.',
    sections: [
      ['Landmarks', [
        'Outlined by the circular sulcus; divided by the central insular sulcus into (usually three) short gyri in front and (usually two) long gyri behind.',
        'Lies lateral to the claustrum, the external capsule and the putamen.',
      ]],
      ['Functions', [
        'Interoception: awareness of internal bodily states such as heartbeat, breathing, hunger and temperature.',
        'Contains the primary gustatory (taste) cortex.',
        'Processes pain, visceral and autonomic signals, and emotions such as disgust.',
        'The anterior insula, with the anterior cingulate cortex, forms the core of the “salience network”.',
      ]],
      ['Clinical notes', [
        'Frequently involved in middle cerebral artery strokes; insular damage has been linked to cardiac arrhythmias and to loss of craving in smokers.',
      ]],
      ['Blood supply', ['M2 (insular) branches of the middle cerebral artery.']],
    ],
  },
  cingulate: {
    name: 'Cingulate gyrus',
    latin: 'Gyrus cinguli',
    group: 'limbic',
    bilateral: true,
    summary:
      'A belt (“cingulum”) of cortex on the medial surface of each hemisphere, arching over the corpus callosum. With the parahippocampal gyrus it forms the limbic lobe.',
    sections: [
      ['Landmarks', [
        'Separated from the corpus callosum by the callosal sulcus below and from the frontal and parietal lobes by the cingulate sulcus above.',
        'Posteriorly it narrows into the isthmus and continues into the parahippocampal gyrus of the temporal lobe.',
        'The cingulum bundle of white matter runs within it.',
      ]],
      ['Functions', [
        'Anterior cingulate cortex: error detection and conflict monitoring, motivation, and the emotional (unpleasant) component of pain.',
        'Posterior cingulate cortex: a hub of the default mode network, active during self-referential thought and remembering.',
        'Part of the Papez circuit (1937): hippocampus → fornix → mammillary bodies → anterior thalamus → cingulate gyrus → parahippocampal gyrus → hippocampus.',
      ]],
      ['Clinical notes', [
        'Bilateral anterior cingulate damage can cause akinetic mutism (profound lack of spontaneous action and speech).',
        'The cingulate gyrus can herniate under the falx cerebri (subfalcine herniation) when one hemisphere swells.',
      ]],
      ['Blood supply', ['Branches of the anterior cerebral artery (callosomarginal and pericallosal arteries).']],
    ],
  },
  corpus_callosum: {
    name: 'Corpus callosum',
    latin: 'Corpus callosum',
    group: 'white',
    bilateral: false,
    summary:
      'The largest commissure of the brain: a broad arch of roughly 200 million axons connecting corresponding regions of the two cerebral hemispheres.',
    sections: [
      ['Parts (front to back)', [
        'Rostrum — the thin, downward-curving front end.',
        'Genu — the anterior bend; its fibres connect the prefrontal cortices (forceps minor).',
        'Body (trunk) — forms the roof of the lateral ventricles.',
        'Splenium — the thick posterior end; connects occipital and posterior temporal/parietal cortex (forceps major).',
      ]],
      ['Functions', [
        'Transfers sensory, motor and cognitive information between hemispheres, allowing them to work as a whole.',
        'Split-brain studies by Roger Sperry and Michael Gazzaniga showed that, when it is cut, each hemisphere can perceive and act independently; Sperry shared the 1981 Nobel Prize for this work.',
      ]],
      ['Clinical notes', [
        'Corpus callosotomy is used to reduce drop attacks in some drug-resistant epilepsies.',
        'Agenesis (absence) of the corpus callosum is one of the most common brain malformations.',
        'Multiple sclerosis plaques characteristically involve the callosum (“Dawson’s fingers” on MRI).',
      ]],
      ['Blood supply', ['Pericallosal branches of the anterior cerebral artery; the splenium also from the posterior cerebral artery.']],
    ],
  },
  caudate: {
    name: 'Caudate nucleus',
    latin: 'Nucleus caudatus',
    group: 'basal',
    bilateral: true,
    summary:
      'A C-shaped (“tailed”) nucleus that follows the curve of the lateral ventricle. Together with the putamen it forms the striatum, the main input stage of the basal ganglia.',
    sections: [
      ['Anatomy', [
        'The large head bulges into the lateral wall of the frontal horn of the lateral ventricle.',
        'The body runs along the lateral ventricle; the thin tail curves down into the roof of the temporal horn and ends near the amygdala.',
        'Separated from the putamen by the anterior limb of the internal capsule, but joined to it by bridges of grey matter — the striped appearance that gives the “corpus striatum” its name.',
      ]],
      ['Functions', [
        'Forms loops with prefrontal cortex and thalamus for goal-directed behaviour, learning from feedback and cognitive control.',
        'Receives dopaminergic input from the substantia nigra; its neurons are mostly GABAergic medium spiny neurons.',
      ]],
      ['Clinical notes', [
        'In Huntington’s disease (an expanded CAG repeat in the HTT gene) the caudate atrophies early, enlarging the frontal horns on imaging.',
        'Caudate dysfunction is implicated in obsessive–compulsive disorder.',
      ]],
      ['Blood supply', ['Lenticulostriate arteries (middle cerebral artery) and the recurrent artery of Heubner (anterior cerebral artery).']],
    ],
  },
  putamen: {
    name: 'Putamen',
    latin: 'Putamen',
    group: 'basal',
    bilateral: true,
    summary:
      'The outer, shell-shaped part of the lentiform nucleus. With the caudate it forms the striatum; it is the principal basal ganglia station of the motor loop.',
    sections: [
      ['Anatomy', [
        'Lies lateral to the globus pallidus and medial to the external capsule, claustrum and insula.',
        'Together with the globus pallidus it forms the lens-shaped lentiform nucleus.',
      ]],
      ['Functions', [
        'Receives input from motor and somatosensory cortex and dopamine from the substantia nigra pars compacta (the nigrostriatal pathway).',
        'Helps select and scale learned movements and habits.',
      ]],
      ['Clinical notes', [
        'In Parkinson’s disease dopamine loss is most severe in the putamen, producing slowness, rigidity and tremor.',
        'The putamen is the most common site of hypertensive intracerebral haemorrhage, from rupture of lenticulostriate arteries.',
      ]],
      ['Blood supply', ['Lenticulostriate branches of the middle cerebral artery.']],
    ],
  },
  globus_pallidus: {
    name: 'Globus pallidus',
    latin: 'Globus pallidus',
    group: 'basal',
    bilateral: true,
    summary:
      'The inner, wedge-shaped part of the lentiform nucleus, pale because of the many myelinated fibres crossing it. Its internal segment is a main output of the basal ganglia.',
    sections: [
      ['Anatomy', [
        'Divided into an external segment (GPe) and an internal segment (GPi) by the medial medullary lamina.',
        'Lies medial to the putamen and lateral to the posterior limb of the internal capsule, which separates it from the thalamus.',
      ]],
      ['Functions', [
        'GPi (with the substantia nigra pars reticulata) tonically inhibits the thalamus via GABAergic projections; releasing this brake permits a selected movement.',
        'GPe is part of the “indirect pathway”, which suppresses competing movements.',
      ]],
      ['Clinical notes', [
        'Deep brain stimulation of the GPi is used to treat Parkinson’s disease and dystonia.',
        'The globus pallidus is characteristically damaged in carbon monoxide poisoning.',
      ]],
      ['Blood supply', ['Anterior choroidal artery and lenticulostriate arteries.']],
    ],
  },
  thalamus: {
    name: 'Thalamus',
    latin: 'Thalamus',
    group: 'dien',
    bilateral: true,
    summary:
      'A paired, egg-shaped mass of nuclei, roughly 3–4 cm long, forming the walls of the third ventricle. It is the gateway to the cortex: almost all sensory and motor information passes through it.',
    sections: [
      ['Anatomy', [
        'The two thalami face each other across the third ventricle and are often joined by the interthalamic adhesion (present in roughly 70–80% of people).',
        'The pulvinar forms the bulging posterior pole; the lateral and medial geniculate bodies lie beneath it.',
        'Separated from the lentiform nucleus by the posterior limb of the internal capsule.',
      ]],
      ['Key relay nuclei', [
        'VPL — touch and pain from the body; VPM — from the face, plus taste.',
        'Lateral geniculate nucleus — vision; medial geniculate nucleus — hearing.',
        'VA/VL — motor signals from the basal ganglia and cerebellum.',
        'Anterior nucleus — Papez circuit (memory); mediodorsal — prefrontal cortex; pulvinar — visual attention.',
        'The reticular nucleus gates thalamocortical traffic and generates sleep spindles.',
      ]],
      ['Clinical notes', [
        'Olfaction is the only sense that reaches its primary cortex without an obligatory thalamic relay.',
        'Thalamic strokes can cause Dejerine–Roussy syndrome: sensory loss followed by severe pain on the opposite side.',
        'Fatal familial insomnia, a prion disease, particularly damages the thalamus.',
      ]],
      ['Blood supply', ['Mainly posterior cerebral artery branches (thalamoperforating, thalamogeniculate) and the posterior communicating artery.']],
    ],
  },
  hypothalamus: {
    name: 'Hypothalamus',
    latin: 'Hypothalamus',
    group: 'dien',
    bilateral: false,
    summary:
      'A small region of about 4 g below the thalamus that forms the floor and lower walls of the third ventricle. It is the master regulator of homeostasis and controls the pituitary gland. (Includes the mammillary bodies on this model.)',
    sections: [
      ['Anatomy', [
        'Extends from the optic chiasm in front to the mammillary bodies behind.',
        'The tuber cinereum and median eminence give rise to the infundibulum (pituitary stalk).',
      ]],
      ['Functions', [
        'Suprachiasmatic nucleus: the master circadian clock, entrained by light via the retinohypothalamic tract.',
        'Supraoptic and paraventricular nuclei make vasopressin (ADH) and oxytocin, released from the posterior pituitary.',
        'Releasing and inhibiting hormones reach the anterior pituitary through the hypophyseal portal veins.',
        'Regulates body temperature (preoptic area), hunger and satiety (arcuate, lateral and ventromedial nuclei), thirst, and the autonomic nervous system.',
        'Mammillary bodies relay hippocampal output (via the fornix) to the anterior thalamus.',
      ]],
      ['Clinical notes', [
        'Thiamine deficiency (e.g. in chronic alcohol use) damages the mammillary bodies in Wernicke–Korsakoff syndrome, causing confusion and severe amnesia.',
        'Damage to the supraoptic/paraventricular system causes central diabetes insipidus.',
      ]],
    ],
  },
  pituitary: {
    name: 'Pituitary gland',
    latin: 'Hypophysis cerebri',
    group: 'dien',
    bilateral: false,
    summary:
      'A pea-sized endocrine gland (≈0.5 g) hanging from the hypothalamus by the infundibulum and sitting in the sella turcica of the sphenoid bone.',
    sections: [
      ['Anatomy', [
        'Anterior lobe (adenohypophysis) develops from Rathke’s pouch in the roof of the mouth.',
        'Posterior lobe (neurohypophysis) is a downgrowth of the diencephalon, made of hypothalamic axon terminals.',
        'Lies just below the optic chiasm.',
      ]],
      ['Hormones', [
        'Anterior lobe: growth hormone, prolactin, ACTH, TSH, FSH and LH.',
        'Posterior lobe: releases vasopressin (ADH) and oxytocin made in the hypothalamus.',
      ]],
      ['Clinical notes', [
        'A pituitary adenoma growing upward compresses the optic chiasm, causing bitemporal hemianopia (loss of both outer visual fields).',
        'Hormone-secreting adenomas cause acromegaly (GH), Cushing’s disease (ACTH) or prolactinoma.',
      ]],
    ],
  },
  pineal: {
    name: 'Pineal gland',
    latin: 'Glandula pinealis',
    group: 'dien',
    bilateral: false,
    summary:
      'A small pine-cone-shaped endocrine gland of the epithalamus, projecting backward from the roof of the third ventricle above the superior colliculi. It secretes melatonin.',
    sections: [
      ['Functions', [
        'Secretes melatonin mainly at night, signalling darkness to the body.',
        'Its rhythm is driven by the suprachiasmatic nucleus through a sympathetic pathway via the superior cervical ganglion.',
      ]],
      ['Facts & clinical notes', [
        'It is one of the few unpaired brain structures; Descartes famously called it the principal seat of the soul.',
        'It commonly calcifies with age, making it a visible midline marker on CT.',
        'Pineal region tumours can compress the tectum (Parinaud syndrome — impaired upward gaze) and block the cerebral aqueduct, causing hydrocephalus.',
      ]],
    ],
  },
  hippocampus: {
    name: 'Hippocampus',
    latin: 'Hippocampus',
    group: 'limbic',
    bilateral: true,
    summary:
      'A curved ridge of archicortex, about 4–5 cm long, in the floor of the temporal horn of the lateral ventricle. Named after the seahorse (Arantius, 1587), it is essential for forming new memories.',
    sections: [
      ['Anatomy', [
        'Head (pes, with its digitations), body and tail; the tail curves up behind the thalamus and continues as the fornix.',
        'Subfields CA1–CA4, the dentate gyrus and the subiculum; information flows through the “trisynaptic circuit” from the entorhinal cortex.',
      ]],
      ['Functions', [
        'Encodes and consolidates new declarative (episodic and semantic) memories.',
        'Spatial navigation: “place cells” fire at specific locations (John O’Keefe); with the Mosers’ grid cells in entorhinal cortex this earned the 2014 Nobel Prize.',
      ]],
      ['Clinical notes', [
        'After bilateral medial temporal lobe resection in 1953, patient H.M. (Henry Molaison) could no longer form new long-term memories (Scoville & Milner, 1957).',
        'One of the earliest regions affected in Alzheimer’s disease.',
        'CA1 neurons are very vulnerable to hypoxia; hippocampal sclerosis is the classic lesion of mesial temporal lobe epilepsy.',
      ]],
      ['Blood supply', ['Posterior cerebral artery and anterior choroidal artery.']],
    ],
  },
  amygdala: {
    name: 'Amygdala',
    latin: 'Corpus amygdaloideum',
    group: 'limbic',
    bilateral: true,
    summary:
      'An almond-shaped complex of nuclei in the anterior medial temporal lobe, in front of the hippocampus and the tip of the temporal horn. It detects threat and assigns emotional significance.',
    sections: [
      ['Anatomy', [
        'Main nuclear groups: basolateral (receives sensory input), central (drives output) and corticomedial (olfactory).',
        'Outputs travel via the stria terminalis and the ventral amygdalofugal pathway to the hypothalamus and brainstem.',
      ]],
      ['Functions', [
        'Fear learning and the rapid detection of threat.',
        'Enhances memory for emotionally arousing events by modulating the hippocampus.',
        'Contributes to social behaviour, such as reading facial expressions and personal space.',
      ]],
      ['Clinical notes', [
        'Patient S.M., with bilateral amygdala damage from Urbach–Wiethe disease, showed an almost complete absence of fear (Feinstein et al., 2011).',
        'Amygdala hyperactivity is associated with anxiety disorders and PTSD.',
      ]],
    ],
  },
  fornix: {
    name: 'Fornix',
    latin: 'Fornix',
    group: 'limbic',
    bilateral: false,
    summary:
      'An arch (“fornix”) of white matter that is the main output pathway of the hippocampus, curving beneath the corpus callosum to the mammillary bodies.',
    sections: [
      ['Course', [
        'Fibres gather on the hippocampus as the alveus and fimbria, then rise as the crura behind the thalamus.',
        'The two crura join under the splenium (hippocampal commissure) to form the body, which runs forward beneath the corpus callosum.',
        'In front of the interventricular foramina the columns descend; most fibres end in the mammillary bodies, others in the septal nuclei.',
      ]],
      ['Functions', ['Carries hippocampal output within the Papez circuit; essential for memory.']],
      ['Clinical notes', ['Bilateral fornix damage — for example during removal of a colloid cyst of the third ventricle — can cause lasting anterograde amnesia.']],
    ],
  },
  lateral_ventricle: {
    name: 'Lateral ventricle',
    latin: 'Ventriculus lateralis',
    group: 'vent',
    bilateral: true,
    summary:
      'The largest of the four ventricles: a C-shaped, CSF-filled cavity inside each cerebral hemisphere. Shown here as a cast, with impressions of the neighbouring nuclei.',
    sections: [
      ['Parts', [
        'Frontal (anterior) horn, body, atrium (trigone), occipital (posterior) horn and temporal (inferior) horn.',
        'Roof formed by the corpus callosum; the caudate nucleus bulges into its lateral wall; the septum pellucidum separates the two frontal horns.',
        'Each connects to the third ventricle through an interventricular foramen (of Monro).',
      ]],
      ['Cerebrospinal fluid', [
        'CSF is secreted mainly by the choroid plexus, present in the body, atrium and temporal horn (not the frontal or occipital horns).',
        'About 500 mL is produced daily and the total volume (≈150 mL) is replaced several times a day.',
        'CSF cushions the brain, reduces its effective weight and clears metabolic waste.',
      ]],
      ['Clinical notes', ['Obstruction of CSF flow or impaired absorption causes hydrocephalus with ventricular enlargement.']],
    ],
  },
  third_ventricle: {
    name: 'Third ventricle & cerebral aqueduct',
    latin: 'Ventriculus tertius; Aqueductus mesencephali',
    group: 'vent',
    bilateral: false,
    summary:
      'A narrow midline slit between the two thalami, continuous behind and below with the cerebral aqueduct, a thin channel through the midbrain to the fourth ventricle.',
    sections: [
      ['Anatomy', [
        'Walls: thalamus above and hypothalamus below. Floor: hypothalamic structures from the optic chiasm to the mammillary bodies.',
        'Recesses: optic, infundibular (into the pituitary stalk), pineal and suprapineal.',
        'Receives CSF from both lateral ventricles through the interventricular foramina.',
      ]],
      ['Clinical notes', [
        'Aqueductal stenosis is a common cause of congenital hydrocephalus, enlarging the lateral and third ventricles but not the fourth.',
        'A colloid cyst near the foramina of Monro can block CSF flow suddenly.',
      ]],
    ],
  },
  fourth_ventricle: {
    name: 'Fourth ventricle',
    latin: 'Ventriculus quartus',
    group: 'vent',
    bilateral: false,
    summary:
      'A tent-shaped cavity between the pons and medulla in front and the cerebellum behind. From it CSF escapes into the subarachnoid space.',
    sections: [
      ['Anatomy', [
        'Its diamond-shaped floor (rhomboid fossa) is formed by the pons and upper medulla; its roof peaks into the cerebellum at the fastigium.',
        'CSF leaves through the median aperture (foramen of Magendie) and two lateral apertures (foramina of Luschka); it continues below as the central canal of the spinal cord.',
        'Floor landmarks include the facial colliculus (abducens nucleus looped by facial nerve fibres) and the area postrema, a chemoreceptor trigger zone for vomiting.',
      ]],
      ['Clinical notes', [
        'Dandy–Walker malformation: cystic enlargement of the fourth ventricle with underdevelopment of the vermis.',
        'Tumours in children (ependymoma, medulloblastoma) often arise near and obstruct the fourth ventricle.',
      ]],
    ],
  },
  midbrain: {
    name: 'Midbrain',
    latin: 'Mesencephalon',
    group: 'stem',
    bilateral: false,
    summary:
      'The shortest part of the brainstem (≈2 cm), connecting the diencephalon to the pons. It contains visual and auditory reflex centres, eye-movement nuclei and the dopamine neurons of the substantia nigra.',
    sections: [
      ['Anatomy', [
        'Tectum (roof, behind the aqueduct): superior colliculi (visual orienting) and inferior colliculi (auditory relay).',
        'Tegmentum: red nucleus, substantia nigra, periaqueductal grey, and nuclei of the oculomotor (III) and trochlear (IV) nerves.',
        'Cerebral peduncles (crura cerebri) in front carry corticospinal, corticobulbar and corticopontine fibres.',
      ]],
      ['Functions & facts', [
        'Substantia nigra pars compacta and the ventral tegmental area supply dopamine for movement and reward.',
        'The periaqueductal grey modulates pain and defensive behaviour.',
        'The trochlear nerve is the only cranial nerve to exit from the back of the brainstem, and its fibres cross completely.',
      ]],
      ['Clinical notes', [
        'Loss of nigral dopamine neurons causes Parkinson’s disease.',
        'Weber syndrome (ventral midbrain stroke): ipsilateral oculomotor palsy with contralateral hemiparesis.',
      ]],
      ['Blood supply', ['Posterior cerebral artery, superior cerebellar artery and basilar artery branches.']],
    ],
  },
  pons: {
    name: 'Pons',
    latin: 'Pons',
    group: 'stem',
    bilateral: false,
    summary:
      'The “bridge” of the brainstem (≈2.5 cm), a bulge of transverse fibres linking the cerebral cortex to the cerebellum. Its tegmentum contains cranial nerve nuclei and centres for breathing and sleep.',
    sections: [
      ['Anatomy', [
        'Basilar part: pontine nuclei relay cortical signals into the cerebellum through the middle cerebellar peduncles, the largest peduncles (stumps shown on the model).',
        'The basilar artery runs in the basilar sulcus on its front surface.',
        'Cranial nerve V emerges from its side; VI, VII and VIII emerge at the pontomedullary junction.',
      ]],
      ['Functions', [
        'Relays motor planning from cortex to cerebellum.',
        'The pontine respiratory group helps shape the breathing rhythm.',
        'The locus coeruleus, the main source of brain noradrenaline, lies in the dorsal pons; pontine circuits generate REM sleep.',
        'Contains the pontine micturition centre.',
      ]],
      ['Clinical notes', [
        'Occlusion of the basilar artery damaging the ventral pons can cause locked-in syndrome: full awareness with paralysis except vertical eye movements and blinking.',
        'Rapid correction of low blood sodium can cause osmotic demyelination (central pontine myelinolysis).',
      ]],
    ],
  },
  medulla: {
    name: 'Medulla oblongata',
    latin: 'Medulla oblongata',
    group: 'stem',
    bilateral: false,
    summary:
      'The lowest part of the brainstem (≈3 cm), continuous with the spinal cord at the foramen magnum. It houses vital centres for breathing and circulation.',
    sections: [
      ['Anatomy', [
        'Pyramids on its front surface carry the corticospinal tracts; about 85–90% of the fibres cross in the pyramidal decussation.',
        'The olives, lateral to the pyramids, contain the inferior olivary nuclei, source of climbing fibres to the cerebellum.',
        'Nuclei and roots of cranial nerves IX, X, XI and XII.',
      ]],
      ['Functions', [
        'Respiratory rhythm generation (pre-Bötzinger complex of the ventral respiratory group).',
        'Cardiovascular control via the nucleus of the solitary tract and the ventrolateral medulla.',
        'Reflexes: swallowing, coughing, sneezing, gagging and vomiting.',
      ]],
      ['Clinical notes', [
        'Lateral medullary (Wallenberg) syndrome from vertebral or PICA occlusion: vertigo, hoarseness, ipsilateral facial and contralateral body pain/temperature loss, and Horner syndrome.',
        'Compression at the foramen magnum (tonsillar herniation) can stop breathing.',
      ]],
      ['Blood supply', ['Vertebral arteries, anterior spinal artery and posterior inferior cerebellar artery (PICA).']],
    ],
  },
  cerebellar_hemisphere: {
    name: 'Cerebellar hemisphere',
    latin: 'Hemispherium cerebelli',
    group: 'cereb',
    bilateral: true,
    summary:
      'Each lateral lobe of the cerebellum. The cerebellum is only ≈10% of brain volume but contains roughly 80% of its neurons (≈69 billion, mostly granule cells).',
    sections: [
      ['Anatomy', [
        'Surface folded into thin parallel folia (drawn as fine lines); unfolded, it would reach almost 80% of the neocortical surface area (Sereno et al., 2020).',
        'The primary fissure divides the anterior lobe from the larger posterior lobe; the flocculonodular lobe lies underneath.',
        'Connected to the brainstem by the superior, middle and inferior cerebellar peduncles.',
        'Output leaves only through the deep cerebellar nuclei (dentate, emboliform, globose, fastigial); Purkinje cells are inhibitory.',
      ]],
      ['Functions', [
        'The lateral hemispheres (cerebrocerebellum) plan, time and coordinate skilled limb movements via the dentate nucleus and thalamus to motor cortex.',
        'Motor learning and error correction; growing evidence for roles in cognition and language.',
      ]],
      ['Clinical notes', [
        'Hemisphere lesions cause ataxia on the same side: dysmetria, intention tremor, dysdiadochokinesia and scanning speech.',
        'Swelling after cerebellar stroke can compress the brainstem and fourth ventricle — a neurosurgical emergency.',
      ]],
      ['Blood supply', ['Superior cerebellar (SCA), anterior inferior cerebellar (AICA) and posterior inferior cerebellar (PICA) arteries.']],
    ],
  },
  vermis: {
    name: 'Cerebellar vermis',
    latin: 'Vermis cerebelli',
    group: 'cereb',
    bilateral: false,
    summary:
      'The narrow, worm-like (“vermis”) midline strip of the cerebellum joining the two hemispheres.',
    sections: [
      ['Functions', [
        'With the paravermal zone it forms the spinocerebellum, controlling posture, trunk balance and gait.',
        'The oculomotor vermis and fastigial nucleus help control saccadic eye movements.',
        'The nodulus (with the flocculus) belongs to the vestibulocerebellum, for balance and gaze stabilisation.',
      ]],
      ['Clinical notes', [
        'Vermis damage causes truncal ataxia and a wide-based, unsteady gait.',
        'Chronic alcohol use characteristically degenerates the anterior superior vermis.',
        'Medulloblastoma, a common malignant brain tumour of childhood, often arises in the vermis.',
      ]],
    ],
  },
  olfactory: {
    name: 'Olfactory bulb & tract',
    latin: 'Bulbus et tractus olfactorius (CN I)',
    group: 'nerves',
    bilateral: true,
    summary:
      'The first cranial nerve system: the olfactory bulb lies on the cribriform plate of the ethmoid bone beneath the frontal lobe and sends the olfactory tract backward.',
    sections: [
      ['Anatomy & function', [
        'Olfactory receptor neurons pass through the cribriform plate to synapse with mitral and tufted cells in the bulb’s glomeruli.',
        'The tract projects via the lateral olfactory stria to piriform cortex, the amygdala and entorhinal cortex — without an obligatory thalamic relay.',
        'Olfactory receptor neurons are continually replaced throughout life.',
      ]],
      ['Clinical notes', [
        'Head injury can shear the olfactory fibres at the cribriform plate, causing anosmia.',
        'Loss of smell is an early feature of Parkinson’s and Alzheimer’s disease.',
      ]],
    ],
  },
  optic: {
    name: 'Optic nerves, chiasm & tracts',
    latin: 'Nervus opticus (CN II), chiasma opticum, tractus opticus',
    group: 'nerves',
    bilateral: false,
    summary:
      'The visual pathway from the eyes to the brain. Each optic nerve carries about 1.2 million axons of retinal ganglion cells; at the chiasm, fibres from the nasal half of each retina cross.',
    sections: [
      ['Anatomy', [
        'Optic nerves enter the skull through the optic canals and meet at the chiasm, just in front of the pituitary stalk.',
        'Crossing of nasal-retina fibres (slightly more than half of all fibres) means each optic tract carries the opposite visual field.',
        'Optic tracts wind around the cerebral peduncles to the lateral geniculate nuclei of the thalamus; smaller branches reach the pretectum (pupillary light reflex), superior colliculus and suprachiasmatic nucleus.',
        'Strictly, the optic nerve is a CNS tract: it is myelinated by oligodendrocytes and wrapped in meninges.',
      ]],
      ['Clinical notes', [
        'Optic nerve lesion: blindness in one eye. Chiasm lesion: bitemporal hemianopia. Optic tract lesion: contralateral homonymous hemianopia.',
        'Optic neuritis is a common first presentation of multiple sclerosis.',
      ]],
    ],
  },
};

// Fill colour of each structure (loosely following classic atlas conventions:
// cool lobes, warm limbic structures, blue CSF spaces, tan brainstem).
export const COLORS = {
  frontal: '#6f9fd8',
  parietal: '#e9c46a',
  temporal: '#74c69d',
  occipital: '#e5898f',
  insula: '#b48ad6',
  cingulate: '#f4a261',
  corpus_callosum: '#e3d7b8',
  caudate: '#4fb3b0',
  putamen: '#3e9aa6',
  globus_pallidus: '#9fd6cf',
  thalamus: '#9a7fd1',
  hypothalamus: '#d487b8',
  pituitary: '#c9679d',
  pineal: '#e7b3d2',
  hippocampus: '#e07a5f',
  amygdala: '#c8553d',
  fornix: '#f2c89b',
  lateral_ventricle: '#7ec8e3',
  third_ventricle: '#5aa9d6',
  fourth_ventricle: '#3d85c6',
  midbrain: '#c2a47e',
  pons: '#ad8d6c',
  medulla: '#957a5d',
  cerebellar_hemisphere: '#b7c96a',
  vermis: '#93ad4a',
  olfactory: '#f6d365',
  optic: '#ffc857',
};
