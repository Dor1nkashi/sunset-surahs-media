# Sets for "15 Lessons from Surah Al-Kahf" (sets_kahf.js)

The Kahf locations, built on the shared world kit (`world.js`, see WORLD.md) and `growth.js` (see GROWTH.md).
The contract is the same as `sets_yusuf.js`: every builder is `async`, and returns
`{ name, scene, group, cameras, props, atmo, exposure, bloom, update(t, cam, o) }`. Wrap it with `W.stage(set)` and
render it with `G.renderSet(ctx, stage, t, u, { cam, p, ...o })`. `group` holds an empty `people_slots` group of named
anchors (position + yaw) for people.js. In `sea_boat` the slots are children of the boat, so they ride the swell.

Every frame is a pure function of t and of the options you pass. Setters such as `setDay`, `setStage`, `setRepair`
or `setBuild` rebuild their whole state from their argument, so frames can be rendered in any order. Each setter
can also be driven through `renderSet` options (the name in brackets below), so a film can write
`G.renderSet(ctx, S, t, u, { cam: 'hero', stage: p })`.

**Per-anchor exposure.** An anchor may carry `exposure`. When the film passes no `exposure` option, it is used
(and interpolated for `[a, b]` camera moves). Cave interiors use this.

## Sets, cameras, slots

| Builder (options) | Lessons | Camera anchors | people_slots | Setters (render option) |
| --- | --- | --- | --- | --- |
| `mountain_cave({ time: 'day'/'bluehour'/'sunrise'/'dusk'/'night', sleepers, dog, lamp, vista, day })` | 0, 1, 2, 16 | hero, mouth_out (exp 1.5), interior (exp 2.8), sleepers (exp 3.0), threshold, path, ridge, vista | youth_1..5 (goat path), sit_1..5 (circle inside) | `setDay(p)` (day) sun morning to evening, only with time 'day'; sleepers' breathing (breath); lamp (lamp); mist (mist); `vista.rays[i].userData.update(t, k)` |
| `city_of_old({ time, yard: 'tools'/'adornment' })` | 1 (town lights), 3, 7, 11, coins | hero, doorway, tally, mat, town, lane, coins, far | man_tools, hand_wall, child_lane, traveller_1/2, parent_1/2, buyer | `setLights(k)` (lights) windows and doorway lamps |
| `two_gardens({ state: 'lush'/'ruined', time })` | 4, 5 | hero (aerial), gate (on the threshold stone), gate_out, stream, grapes (macro), trellis, palms | owner_gate, friend_gate, owner_ruin, friend_ruin | none: lush and ruined are two builds of the same layout (cut between them) |
| `rain_on_plants({ stage })` | 6 | hero, wide, field, macro, hut | none | `setStage(p)` (stage) rain, growth, ripening, wind, snapping, chaff; `setDrop(q)` (drop) macro raindrop |
| `confluence({ time: 'day'/'golden' })` | 8, 9 | hero, basket, seam, footprints, track, wide | traveller_tall, traveller_young, seated_figure | `setFish(q)` (fish): in the basket, flips out, slides, drops in, darts away |
| `sea_boat({ time })` | 10 | hero, waterline, inside, stern, horizon | passenger_tall, passenger_young, boatman (on the boat) | `setDamage(q)` (damage) plank prised out; `setFlood(q)` (flood) water inside; `swellAt(x, z, t)` |
| `village_wall({ time, repair })` | 12 | hero, crack, doors, tree, track_a, track_b, jar (below ground) | traveller_1/2 (under the tree), child_1/2 (on the step), mason | `setRepair(p, crack)` (repair, crack); `setCrack(q)` |
| `journeys({ side: 'west'/'east' })` | 13 | west: hero, reeds, wide. east: hero, shelter, ridge, meeting, wide | east: caravan_1..8 (ridge), ruler, crowd_1..10 (meeting ground) | mist (mist) / dust (dust) |
| `mountain_pass_barrier({ time, build, pour })` | 14, 16 (hinge) | hero, barrier, pour (macro rig), bellows, hinge, gap | ruler, villager_1..4, worker_bellows, worker_1/2 | `setBuild(p)` (build) blocks come up the supply track course by course; `setPour(q)` (pour) copper runs, glows, then cools; sparks (sparks) |
| `night_shore()` | 15 | hero, ink, parchment, shore, sky | writer_hand | `setTide(q)` (tide), `setInk(q)` (ink), `setWriting(q)` (writing) |

`SETS` exports all the builders by name. The Yusuf `caravan_route` set also works as the dusty track of lesson 8.
`confluence` has its own `track` anchor looking from the plain to the two-coloured sea.

## World logic (nothing pops)

- **Cave.** The sun only moves (setDay). The sleepers breathe. The lamp, dog and sleepers never appear or vanish.
- **Ruined garden.** The ruined garden is the same layout as the lush one. Posts fall where they stood, and the
  grapes lie under the vines that bore them.
- **Rain field.** Plants grow from the ground up, and ears form late. Stalks fold over and shrink into the break
  as chaff leaves them. Every chaff bit starts at the top of a broken stalk at that stalk's own break time, and
  flies downwind on `windAt`, which is the same function in JS and GLSL.
- **Wall repair.** The repair moves along the wall from west to east. Each gap is filled by one fresh brick
  carried from the stack by the tree, and the stack shrinks as bricks leave it. The fallen bricks stay in the
  lane as rubble.
- **Barrier.** Each iron block waits in the stack far down the pass, then travels the supply track to its place
  (bottom course first). No block is ever created or deleted.
- **Fish.** The fish follows one closed-form path from the basket into the sea.

## Kit added in sets_kahf.js (exported)

- `sdfMesh(sdf, { min, max, step, ground })`: narrow-band marching tetrahedra. Use it for shapes a heightfield
  cannot make, such as overhangs, caves, the dog, the fish and shore rocks. It bakes an `occ` attribute: local
  AO times sky visibility from 14 sphere-traced rays. It returns `occAt(p, n)` so other meshes can be baked
  with `bakeOcc`.
- `occify(material, value?)`: multiplies the indirect (IBL) light by the `occ` attribute or by a constant. Without
  it, cave interiors would be lit by the open sky.
- `triMat(name, opts)`: triplanar PBR from a library texture set, with strata banding and desaturation. Used for
  cliffs and rocks, so steep faces never stretch.
- `furify(material)`: fine fibre shading for the dog's coat and the fish's scales.
- `seaMat`: two-coloured water with a travelling seam, shore foam and depth-tinted shallows.
- `oceanMaterial`: seaMat plus a sum-of-sines swell. `swellAt` gives the same values in JS.
- `mistLayer`: drifting noise sheets.
- `windAt` and `WIND_DIR`: the shared wind.
- `noise3` and `fbm3`: seeded 3-D noise.
- `ironPBR`: hammered wrought iron.

## Performance (laptop, Intel GPU, ANGLE D3D11)

- **mountain_cave.** The heaviest build: about 300k-triangle SDF cliff, occlusion rays, and an SDF dog. Building
  takes several seconds.
- **rain_on_plants.** 52k barley tufts (3 stalks each) drawn in one instanced call. Fine for stills. Keep motion
  blur samples low.
- **Gallery.** `kahf-gallery` builds 13 sets. Set `MR_READY_TIMEOUT=1500000` and render with `--workers 1`, so
  each page does not build every set again.

## Licences

- **Textures, HDRIs, models.** Poly Haven (studio/library, laptop only): CC0. This covers rocky_terrain,
  dry_ground_rocks, brown_mud_dry, sand_01, mud_cracked_dry_03, farm_soil, grass_ground, cracked_red_ground,
  red_sand, sandy_gravel, gravel_road, raked_dirt, leafy_grass, rustic_stone_wall, old_stone_wall,
  rough_plaster_03, clay_plaster, old_planks_02, hessian_230, reed_roof_03, rock_07, rock_09,
  namaqualand_boulder_02/03, shrub_02, dry_branches_medium_01, wooden_bucket_01, wooden_bowl_01, wooden_table_02,
  planter_pot_clay, stone_fire_pit, and the HDRIs goegap, rogland_*, plains_sunset and belfast_sunset.
- **Code.** growth.js trees (date palm, olive), basket, seed and soil cut-away are original repo code (see GROWTH.md).
- **Procedural geometry and textures.** Original code in this file: the cliff and cave, the dog, the fish, the
  grapevines and grape leaves, the barley, the boat, the bricks, the iron, the copper, the coins, the sail, the
  net, the parchment strokes and the tally marks.
- **Not used.** No CC BY assets (Mandarin Orange, Iridescent Dish) and no Mixamo characters are used. No
  attribution is required.

## Known limits

- **People.** No people are built here; the slots are for people.js. Hands (the hand on the cave floor, the
  hand on the gate post) are also people.js work.
- **No bee.** There is no bee for the grape macro of lesson 4.
- **Dog.** The dog is a smooth SDF sculpture with fine fur shading. It reads well at medium distance; close-ups
  look sculpted, not furry. The ears twitch on a seeded schedule, and its breathing is a small body scale.
- **Sleepers.** The sleepers are draped-cloth heightfields over a lying body. They breathe, but do not roll from
  one side to the other. To show the turning, cut between two builds, or mirror a sleeper's `scale.x` during a
  dissolve.
- **Cave light.** The cave interior has no real bounce light. A shadowed spot from outside stands in for the
  bright opening (only what the mouth sees is lit). Interior anchors carry a higher exposure.
- **Sea.** The sea is a shaded sheet with a swell, not a simulation. Water in the boat is a flat sheet clipped
  to the hull.
- **Barrier.** The copper is an emissive core seen through the seams between blocks. There are no runs down
  the front face; the pour rig is a separate close-up.
- **City.** Distant town houses are plaster blocks with glowing windows (background only).
- **Ruined palms.** Ruined palms keep their fronds, browned (growth.js palms cannot shed fronds).
