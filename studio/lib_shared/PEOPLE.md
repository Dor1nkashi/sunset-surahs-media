# people.js: faceless human figures for the reels

Realistic-stylised, fully clothed, faceless people for three.js films. Skeleton and animation clips come
from the three.js example `Xbot.glb` (Mixamo rig); every visible surface is generated here: signed-distance
parts (`people_parts.js`) meshed with surface nets (`people_sdf.js`), smooth-skinned to the Xbot skeleton in a
relaxed rest pose, with baked AO + hem dust in vertex colours and MeshPhysical cloth / skin materials with
procedural weave, slub and beard/hair strand micro-normals (shader patch, no textures). Faces are a smooth
skull + jaw + chin + cheek mass with NO eyes, nose, mouth or brows.

## API
```js
import { loadPeople } from '../lib_shared/people.js';          // film folder next to lib_shared/
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const people = await loadPeople(THREE, GLTFLoader);              // opts: { url } or { gltf }
const p = people.make({
  kind: 'man' | 'woman' | 'elder' | 'boy',
  outfit: 'thobe' | 'worker' | 'traveller' | 'noble' | 'abaya',  // women always wear abaya + khimar
  palette: 'white'|'cream'|'sand'|'earth'|'olive'|'indigo'|'rust'|'night'|'noble' | { robe, wrap, cloak, sash, trousers, trim, skin, abaya, khimar, shemagh },
  beard: 'none' | 'short' | 'full' | 'grey',
  headwear: 'keffiyeh' | 'turban' | 'wrap' | 'kufi' | 'none' | 'khimar',   // optional; default by kind/outfit/seed
  seed: 7,                 // deterministic height, build, belly, colours, fold phases
  detail: 1,               // mesh density multiplier (0.6-0.8 for crowds / far figures)
  headDetail: 1,           // head-only density (1.5-1.8 for a head close-up)
  height, build, skin,     // optional overrides
});
scene.add(p.object3d);     // feet on y = 0, faces +z; move/rotate object3d yourself
p.setPose(clip, t, opts);  // pure function of absolute time t (mixer.setTime): seekable, no state
```
Clips: `stand` (idle upper body, legs together), `idle`, `walk`, `run`, `agree`, `headShake`, `sad_pose`,
`sneak_pose`, plus helpers `kneel` (right knee down, hands on knee), `dig` (hoe stroke, `opts.rate` strokes/s,
hoe prop shown), `carry` (= stand with a jar on the shoulder).
`opts`: `{ carry: 'jar' | 'basket', offset: secs, lookYaw: deg, gait: 'free' }`. `carry` works on any base
clip (e.g. `setPose('walk', t, { carry: 'basket' })`).
In-place clips: translate the root yourself: `x = x0 + p.speed('walk') * t` (m/s, scaled to the person).
Also: `p.bones(name)` (Mixamo bone names without prefix), `p.props(name)`, `p.height` (m), `p.info`.

## Cost
~160-350k verts per person at detail 1; build 3-8 s per person on CPU (once, in init). Geometry is cached by
shape params. render.mjs waits 120 s for init: in heavy films build far/secondary figures lazily on first use
(people-test/film.js shows the pattern) or use `detail: 0.6`. Set `scene.environment` (e.g. `G.ENV`) for the
physical materials.

## Licence
`assets/Xbot.glb`: three.js examples (MIT repo); model credited "from mixamo.com" in three.js examples. Mixamo
assets are royalty-free in commercial work but must not be redistributed stand-alone. Only skeleton + clips are
used; the Xbot surface is discarded. See assets/LICENSE_NOTES.md.

## Known limits
- Cloth is skinned, not simulated: skirts follow the thighs (left half left leg) and a damped shin; long
  garments use a damped knee flex while walking (`gait: 'free'` disables). Fast runs and `kneel` stretch robes.
- Beards have no moustache by design (no mouth); the front edge dips under the lower lip line.
- The agal can graze the keffiyeh at close range; hands are a soft palm + finger capsules (no nails).
- Kneel/dig/carry are IK overlays on the idle clip, tuned for the default proportions; boys' carry poses are rough.
- Women share the male skeleton scaled ~0.92 (garment volumes give the silhouette).
