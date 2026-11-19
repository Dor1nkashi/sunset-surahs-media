# growth.js: realistic plant growth for Motion Reel films

`lib_shared/growth.js` is an ES module with no imports: you pass in your `THREE` (tested with three 0.187).
Import it from a film as `import * as GR from '../lib_shared/growth.js'`.

**Pure functions of time.** Every setter (`setGrowth`, `setFruit`, `set`, `setGerm`, the fruit-fall
function) rebuilds every vertex, instance matrix and colour from its arguments. Nothing is carried between
calls and all randomness is seeded (mulberry32). Same input gives the same frame, so frames can be seeked
out of order. This was checked headless: `set(0.2,0.1)` followed by `set(1,1)` gives identical fruit
positions to a fresh `set(1,1)`.

Units are metres, y is up, and the ground is at y = 0 in each object's local space.

## API

### `makeTree(THREE, { species, seed })`
- `species`: `'orange'` (most polished), `'date_palm'`, `'olive'` or `'generic'` (a broadleaf without fruit).
- Returns `{ object3d, setGrowth(g), setFruit(f, {hide}), set(g, f, {hide}), fruitWorldPositions(), fruitCount }`.
- `g` runs from 0 to 1 (seedling whip to mature tree):
  - **Structural growth.** The branch skeleton is built once at full size. Each branch grows from its tip:
    a prefix of its curve that never moves once laid down.
  - **Order of growth.** A child branch breaks bud only after the parent tip has passed its node. Length
    follows an ease-out curve.
  - **Girth.** Girth comes from a pipe model of everything grown beyond each ring, so the trunk thickens
    for as long as the crown grows, with a flare at the base. Young green stems turn to bark as they thicken.
  - **Leaves.** Leaves bud behind the tip, unfold from a folded state (a per-instance `unfold` attribute in
    the vertex shader), expand and darken from flush yellow-green to glossy dark green.
  - **Leaf drop.** Sapling leaves on the trunk and scaffold limbs yellow, fall and stay on the ground as litter.
- `f` runs from 0 to 1 (bud to ripe fruit), with orange timings:
  - 0 to 0.16: buds swell and open into 5-petal blossoms.
  - 0.22 to 0.32: petals fall, land and brown into the litter.
  - From 0.2: the ovary swells into green fruit (one fruit per twig), which hangs lower as it gets heavier.
  - 0.72 to 1: colour break, then deep orange, with a staggered ripening jitter per fruit.
  - Orange peel has a fine, uniform oil-gland pore normal map, a clearcoat, a calyx button and a stalk.
- `hide: [indices]` hides fruits that have been "picked" (for example while a loose copy is falling).
- `fruitWorldPositions()` returns `[{ index, position: Vector3 (world), radius }]` for the fruit currently
  visible.
- Date palm:
  - **Establishment then height.** A ground-level rosette while the stem reaches full girth (g < 0.25),
    then the trunk elongates.
  - **Fronds.** Each frond emerges as a closed spear, its leaflets open in a V, and it arches out. Older
    fronds are pushed down, droop and brown into a skirt.
  - **Bunches.** Strands emerge and hang, and the dates swell and colour green, then yellow, then brown.

### `makeRoots(THREE, { seed, depth, spread, origin, zSpread, obstacles, attractors, baseRadius, hairs })`
- **Growth model.** Space colonization (Runions et al. 2007), run once at build time. Attractor points
  fill a root zone that is wide near the top with a taproot column below. Tips step toward the attractors
  with gravitropism, momentum and tortuosity, plus a low-frequency meander. Laterals sprout behind the
  tips at side angles, then bend downward. `obstacles` (`[{p, r}]`, for example stones) are avoided.
- **What `setGrowth(g)` shows.** Nodes born at or before `g` × the iteration count, with the advancing
  tip interpolated between nodes.
- **Shape and colour.** Smooth Catmull-Rom tubes with parallel-transport frames and rounded root caps.
  Radius depends on root order and thickens slightly with age. The material is matte (roughness 0.72,
  metalness 0): whiter cream at the tips, tan to light brown on older roots.
- **Root hairs.** A soft fuzz of fine translucent lines, drawn only in the zone just behind each tip.
  They grow in, then fade as that zone moves on.
- Returns `{ object3d, setGrowth, nodes, iterations, chains }`. Building takes about 1 s for about
  1,900 nodes.

### `makeSoilCutaway(THREE, { w, h, d, seed, surround, seedPos, seedSize, xray, haze })`
- **Block layout.** A soil block with its surface at y = 0 and the cut face on +z. The back, sides and
  bottom are solid.
- **Cross-section texture.** 2048 px canvas-generated colour and normal maps, layered from top to bottom:
  dark humus topsoil with organic fibres, brown subsoil with sand and gravel, then reddish clay with grey
  mottles and darker moist bands. Shaded pebbles throughout.
- **X-ray depth.** A semi-transparent cut face (`xray` opacity), three soil-haze layers inside the volume
  (`haze`) so deeper roots fade into the soil, and a glass pane with edge highlights.
- **Extras.** Real 3-D stones inside the block (returned as `stones`, which you can pass to `makeRoots`
  as obstacles). With `surround` on, the soil surface and short grass continue behind the block.
- Returns `{ object3d, seed, stones, seedRootOrigin (Vector3, local to the block), surfaceY, frontZ, size }`.
- Keep roots in front of the middle haze layer for crisp roots. For the test film I used seed z = 0.046,
  `zSpread` 0.021 and d = 0.14.

### `makeSeed(THREE, { size, seed, surface })` (also built into the cutaway as `.seed`)
- `setGerm(g)`, following citrus germination (hypogeal, so the cotyledons stay in the seed):
  - 0 to 0.25: the seed swells.
  - 0.18 to 0.42: the seed coat splits open.
  - From about 0.3: the radicle leaves the pointed end. Drive the roots with
    `roots.setGrowth(seed.rootStart(g))`.
  - 0.42 to 0.88: the shoot pushes up as a protective hook and straightens once it is out of the soil.
  - 0.84 to 1: the first true leaves unfold.

### `makeGround(THREE, { size, seed, clear, grass, pebbles, center })`
- A displaced field, with canvas-generated soil and straw colour and normal maps plus macro colour
  variation.
- A bare circle of radius `clear` under the tree.
- Grass as about 36k instanced, curved, tapered blades in tufts, mixing green and straw tones.
- Instanced pebbles.
- Returns `{ object3d, heightAt(x, z) }`. Use `size` ≥ 600 with `FogExp2(…, 0.012)` for a soft horizon.

### `makeBasket(THREE, { radius, height })`
- A lathe-turned basket with a procedural over-and-under weave (colour and normal maps) and a rim.
- `slots(n, fruitRadius)` returns hex-packed resting centres in basket-local space, layer by layer.

### `fallingFruit({ from, to, t0, radius, gravity = 9.81, restitution = 0.32, seed })`
- Returns `(t) => { position, quaternion [x,y,z,w], phase }`. The phase runs `hanging`, then `falling`,
  then `bounce`, then `settling`, then `rest`.
- **Motion.** A ballistic fall, one bounce slightly off the slot, then a roll into the slot that is
  consistent with the fruit's radius. After that it rests at `to` for every later t, so the fruit never
  vanishes.
- **Use with a tree.** Pair it with `tree.set(g, f, { hide: [index] })` from `t0` onward, plus a loose
  `makeFruitMesh(THREE)` scaled to the fruit's radius.

### `makeFruitMesh(THREE, { kind, color })`
- A single loose orange (or olive) with the same peel and a calyx. Its radius is 1, so scale it.

## Test film
- `growth-test/` (9x16, 22 s): (a) 0 to 9 s cut-away, where the seed germinates, the radicle and roots
  grow and the seedling breaks the surface; (b) 9 to 15.4 s an orange tree grows from a sapling;
  15.4 to 19.5 s a close-up of blossom, then fruit set, swelling and colour; (c) 19.5 to 22 s three
  oranges drop into a basket.
- `growth-species/` is a scratch check of olive and date palm (g = 0.45 and g = 1).
- Contact sheets: `out/growth-test/contact_final.png`, `out/growth-species/contact_species.png`.

## Licences
- **Code:** all of growth.js is original code written for this project. Space colonization is
  re-implemented from the published algorithm (Runions, Lane and Prusinkiewicz 2007).
- **npm packages: none installed.** I reviewed `space-colonization@0.2.0` (MIT): it uses `Math.random`
  (not seedable), is CommonJS and depends on pex-math, so it can't meet the pure-function rule. I also
  considered `@dgreenheck/ez-tree` (MIT): its `generate()` builds a finished tree and has no structural
  growth parameter, it is 24 MB, and its bundled textures have unverified provenance. So I used neither.
- **Textures:** all bark, leaf, peel, soil, ground, weave, root and seed-coat textures are generated
  procedurally at load time, so there are no third-party texture files.
- **HDRIs used by the test film** (`growth-test/assets/*.hdr`): Poly Haven HDRIs by Greg Zaall
  (Rooitou Park, Kiara 1 Dawn) and Venice Sunset, taken from the pmndrs/market-assets GitHub repo.
  Its `info.json` lists `team: poly-haven`. Poly Haven publishes under CC0, but I did not read that on
  the source page.

## Limits
- **Performance.** Per-frame CPU rebuild costs about 5k leaves plus about 500 branch tubes for the
  orange, and about 1,900 root nodes with 42k hair lines. That is fine on a GPU. In SwiftShader each
  still takes about 10 s or more. In the test film, motion blur `samples` is 2.
- **Blossoms are botanically sized** (about 3 cm). They read in a close-up but are specks in a
  whole-tree shot.
- **Olive is the least polished species.** The crown is sparse and the small black olives are hard to
  see. Generic has no fruit.
- **Leaves.** Leaf translucency is faked (the back faces are brightened). There is no wind or sway.
  Leaves are never hidden once born, except that abscised leaves lie on the ground.
- **Roots.** The topology is fixed per seed. Roots can pass through a stone if no attractor pulls them
  around it, and they don't react to anything placed later.
- **Date palm.** Old fronds form a skirt and are never shed. Dates are simple ellipsoids.
