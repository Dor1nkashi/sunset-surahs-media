# Sunset Surahs 3-D world kit (lib_shared)

Reusable three.js sets for the Motion Reel films of "15 Lessons from Surah Yusuf" (and later series).
Rendered on the laptop GPU (Intel Graphics, ANGLE D3D11). Everything is built once in `init()`. Each
frame is a pure function of time: seeded noise only, no clocks, no `Math.random`.

| File | What |
| --- | --- |
| `world.js` | Loaders, PBR materials, terrain, scatter/LOD, atmosphere (HDRI env + sky + sun + fog), procedural props, trees, water, fire, stage |
| `sets_yusuf.js` | One async builder per location (below) |
| `captions.js` | Closed-caption system (reads `lines.json` from `tools/new_lesson.py`) |
| `../yusuf-gallery/` | Proof film: every set from its hero camera, 2 s each (9x16, 20 s) |

## Using it in a film

```js
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills, the_well } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
let HILLS, WELL, CAP;
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  samples: 1,
  async init() {
    await G.initGL(); W.init(G.R);
    HILLS = W.stage(await canaan_hills({ time: 'night' }));
    WELL = W.stage(await the_well());
    CAP = captions(await loadLines('lines.json'));
  },
  draw(ctx, u, t) {
    if (t < 5) G.renderSet(ctx, HILLS, t, u, { cam: ['wide', 'hero'], p: M.E.inOutSine(M.prog(t, 0, 5)) });
    else G.renderSet(ctx, WELL, t, u, { cam: 'inside_up' });
    CAP.draw(ctx, t);
  },
});
```

`G.renderSet(ctx, stage, t, u, opts)`. opts:
- `cam`: an anchor name, `[a, b]` with `p` (0..1, ease it yourself), or `{ pos, look, fov, roll }`.
- `exposure`: overrides the set's exposure.
- `fire`, `shaft`: 0..1 multipliers on the fire and light-shaft intensity, where a set has them.

Every set object (before `W.stage`) is `{ name, scene, group, cameras, props, atmo, exposure, bloom, update(t, cam, o) }`.
`group` has an empty child group named `people_slots` with named `Object3D` anchors (position + yaw)
where people.js figures will stand. Use `group.getObjectByName('people_slots').getObjectByName('boy_roof')`.
Animate props from `props` in your own draw code (for example `props.door.leaf.rotation.y`, `props.bolt.position.x`,
`props.stars.userData.update(t, k)`, or `props.sky.userData.u` for the sky shader uniforms). Do it as a pure function of t.

## Sets, cameras, slots

| Builder (opts) | Lessons | Camera anchors | people_slots |
| --- | --- | --- | --- |
| `canaan_hills({ time: 'night'/'predawn'/'dawn'/'day'/'golden'/'dusk', olives, tents })` | 0, 1, 2, 4, 13, 16 | hero, roof, sky, pen_fire, doorway, well, wide | father_door, boy_roof, brothers_fire_1..3 |
| `the_well({ time })` | 3 | hero, inside_up, rim_close, over_rim, wide | brother_1..3, boy |
| `caravan_route({ time })` | 5 (road) | hero, track, well, wide | trader_1, trader_2 |
| `egypt_market({ time })` | 5 (sale), 8 (street) | hero, scale, block, high | buyer, seller, on_block, crowd_1, crowd_2 |
| `ministers_house({ time: 'evening'/'morning' })` | 6, 7 | hero, door, lintel, courtyard, window | young_man_door, woman_sleeve, servant_court, husband_threshold |
| `prison({ time: 'morning'/'evening' })` | 8 (cell), 9 | hero, window, floor, door | cellmate_a, cellmate_b, young_man_wall |
| `nile_fields_granary({ time, ripe })` | 10, 11, 12 (yard) | hero, fields, granary, sacks, high | scribe, worker_1, farmer, steward |
| `palace_hall({ time: 'day'/'night' })` | 10, 11 | hero (dais seen from afar), dais, throne, columns, low | king_seat, young_man_before_dais, adviser_1, adviser_2, scribe_1 |
| `reunion({ time: 'golden'/'dusk'/'day', stars })` | 12 (gate), 14, 15 | hero (city gate from the court), court, dais, floor, sky | family_1..3, yusuf_dais, brothers_kneel |

Main props per set: `canaan_hills`: house, door, pen, fire, firepit, wool, well, wellRope, olives, tents, terrain, sky, stars, sun.
`the_well`: well, rope, bucket, water, terrain, sun. `caravan_route`: bundles, well, rope, terrain, path(z), sun.
`egypt_market`: stalls, goods, block, scale, pans, coins. `ministers_house`: door, bolt, lamps, columns, curtain, shaft, pond, emblem.
`prison`: door, bars, beds, jar, bowl, shaft, sun. `nile_fields_granary`: crops (wheat that sways with t), silos, sacks, table, nile.
`palace_hall`: throne, braziers, columns, shafts, dais. `reunion`: gate (two door leaves), pylons, throne, sacks, bundles, sky, stars.

## world.js API (main parts)

- `init(renderer)`: call once after `G.initGL()`.
- `pbr(name, { tile, res, tint, rough, normal, ao, disp, side, vertexColors })`: a MeshStandardMaterial from a library texture set (diffuse sRGB, GL normal, packed AO/rough/metal, optional displacement). Geometry uv is in METRES, and `tile` is metres per repeat.
- `terrain({ size, seg, centre, warp, height(x,z), weights(x,z,h,slope), material })` with `terrainMaterial([{name, tile, tint}] x3)`: a displaced heightfield, dense at the centre. It blends 3 PBR layers with height-aware transitions, two-scale anti-tiling and macro variation. Returns `{ mesh, heightAt, normalAt }`.
- `atmosphere(scene, { hdri, background: 'hdri'|'sky'|colour, sun: { azim, elev? }, sunI, envI, fog, fogGain, starsOn, moon, shadowBox, focus })`: image-based light from a Poly Haven HDRI, an HDRI or analytic sky, a soft-shadow sun (PCF, radius 3), and exp2 fog matched to the HDRI horizon. With an HDRI background the sun keeps the HDRI's own elevation and is rotated to `azim`, so the light, the shadows and the sky agree.
- `gltf(name)`, `prop(name, { pos, height, scale, ry, tint })`, `scatter(name, items, { lod: { focus, far }, tint, matte })`: library models. Scatter uses instancing. LOD: instances beyond `far` use a cheap displaced-icosphere proxy.
- `scatterPoints({ seed, count, rect, area(x,z), heightAt, s, minDist })`, `groundCover({ heightAt, focus, radius, pebbles, rocks, tuftN, boulders })`: scale cues (pebbles, rocks, dry tufts).
- `ground(obj, x, z, heightAt, { sink, ry })`: seats an object, sinks it a little and adds a soft contact shadow. `contactShadow(w, d)`.
- Procedural props: `rbox` (bevelled box), `panel` (dense displaced wall), `lathe`, `sack`, `rope`, `cloth`, `column` (painted lotus/papyrus), `door` (planks, iron straps, bolt), `flame` (shader fire + flickering light), `water`, `lightShaft`, `oliveTree` (ez-tree), `datePalm`, `cropField` (wheat/barley with ears and wind), `tufts`.
- `stars()`, `skyDome()`: tone-mapped night sky. Stars twinkle with t.
- `stage(set)`: wraps a set for `G.renderSet`. `pose(cameras, cam, p)`.

## captions.js

`captions(lines, { display, ui, verse, gold, y, size })` returns `{ draw(ctx, t), chunks, fonts }`. It accepts `lines.json` entries
`{ t0, t1, text, keys, quran: { ref, surah } | null }` or the older `[t0, t1, '*key* text', label]` arrays.
Long lines are split into chunks of 34 characters or less, timed by character count, so only one short caption shows at a time, on at most two rows.
At most 3 gold key words come from `keys`, each matched once, ignoring punctuation and accents. Quran lines use the verse face and a gold chip
such as `YŪSUF 12:15`. Safe areas follow the format: 9x16 sits at 70 % of the height and clears the social UI; 16x9 sits in the lower band at 70 % width.

## Performance (laptop, Intel Graphics, ANGLE D3D11)

- The gallery run (launch, build all 9 sets, 10 stills) takes about 28 s in total. Set `MR_READY_TIMEOUT=600000` if a film builds many sets.
- One 1080x1920 still takes about 0.6 s of wall clock per frame, including Playwright's PNG capture. The WebGL render itself is well under 0.5 s.
- Motion blur multiplies the cost by the number of samples. Use `samples: 1` or a small function of t for 3-D-heavy shots.

## Licences and attributions

- Poly Haven HDRIs, textures and models (studio/library): CC0 1.0. No attribution is needed.
- ez-tree (@dgreenheck/ez-tree, npm, used for olive trees): MIT licence. The provenance of its bundled bark and leaf textures is not stated by the package.
- Khronos glTF sample assets (not used by these sets yet): **if used, credit**: "Mandarin Orange (c) 2015 zamdreamer, (c) 2023 Wayfair, CC BY 4.0, via Khronos glTF-Sample-Assets" and "Iridescent Dish With Olives (c) 2020 Wayfair LLC, CC BY 4.0".
- Xbot / Michelle (Mixamo terms): not used here.
- The procedural geometry and textures (palms, sacks, cloth, columns, doors, wheat, sky, fire) are original code in this repo.
- The library is gitignored (laptop only). Never commit it.

## Known limits

- No animals (no sheep or camel models in the library). Flocks and camels are suggested with props: a pen, bundles and tracks.
- Interiors use HDRI image-based light at a low intensity, and the environment light is not occluded. Bright openings can over-light corners, so tune `envI` and exposure per shot.
- Banners and cloth are static displaced meshes, not simulated. Fold noise on narrow banners can look smeared up close.
- The olive tree is an ez-tree with tuned parameters (ash leaves, silvery tint), so it reads as a generic broadleaf in close-ups. growth.js `makeTree({ species: 'olive' })` can replace it later.
- Gate leaves, doors and the bolt are separate objects. Opening or closing them is up to the film (`props.door.leaf.rotation.y`).
- Terrain textures are planar (xz). Very steep slopes stretch a little. They are kept gentle and far away, under fog.
- The well set uses the goegap HDRI. Far hills are terrain and do not match the HDRI's own skyline exactly.
- Market and city buildings are simple bevelled blocks with plaster textures: fine as backgrounds, not for close-ups.
