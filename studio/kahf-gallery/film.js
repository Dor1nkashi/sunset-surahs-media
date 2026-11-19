// Kahf world gallery: every set of "15 Lessons from Surah Al-Kahf" from one of its anchors, 2 s each (a slow
// purposeful 6 % push toward the subject). Proof sheet for lib_shared/sets_kahf.js. Pure function of time.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { SETS } from '../lib_shared/sets_kahf.js';
import { captions } from '../lib_shared/captions.js';
const { prog, E } = M;

// [key, builder, build options, camera anchor, label, render options]
export const SLOTS = [
  ['cave_day', 'mountain_cave', { time: 'day' }, 'hero', 'The cave mouth', { day: 0.3 }],
  ['cave_day', 'mountain_cave', { time: 'day' }, 'mouth_out', 'Looking out of the cave', { day: 0.3 }],
  ['cave_day', 'mountain_cave', { time: 'day' }, 'sleepers', 'The sleepers', { day: 0.8 }],
  ['cave_day', 'mountain_cave', { time: 'day' }, 'threshold', 'The dog at the threshold', { day: 0.6 }],
  ['cave_day', 'mountain_cave', { time: 'day' }, 'vista', 'The valley below', { day: 0.5 }],
  ['town', 'city_of_old', { time: 'dusk', yard: 'tools' }, 'hero', 'A courtyard at dusk'],
  ['town', 'city_of_old', { time: 'dusk', yard: 'tools' }, 'lane', 'The lane of olive trees'],
  ['house', 'city_of_old', { time: 'golden', yard: 'adornment' }, 'mat', 'Wealth and adornment'],
  ['gardens', 'two_gardens', {}, 'hero', 'Two gardens'],
  ['gardens', 'two_gardens', {}, 'gate', 'The garden gate'],
  ['gardens', 'two_gardens', {}, 'grapes', 'Grapes on the vine'],
  ['ruin', 'two_gardens', { state: 'ruined' }, 'trellis', 'The ruined garden'],
  ['rain', 'rain_on_plants', {}, 'hero', 'Rain on the plain', { stage: 0.08 }],
  ['rain', 'rain_on_plants', {}, 'field', 'Green, tangled', { stage: 0.46 }],
  ['rain', 'rain_on_plants', {}, 'hero', 'Gold, then brown', { stage: 0.72 }],
  ['rain', 'rain_on_plants', {}, 'hero', 'Scattered by the wind', { stage: 0.87 }],
  ['seas', 'confluence', {}, 'hero', 'Where two seas meet', { fish: 0 }],
  ['seas', 'confluence', {}, 'basket', 'The fish slips away', { fish: 0.3 }],
  ['seas', 'confluence', {}, 'seam', 'The seam'],
  ['boat', 'sea_boat', {}, 'hero', 'A poor people\'s boat', { damage: 0 }],
  ['boat', 'sea_boat', {}, 'waterline', 'A plank prised loose', { damage: 0.8 }],
  ['boat', 'sea_boat', {}, 'inside', 'Water over the boards', { damage: 1, flood: 0.6 }],
  ['boat', 'sea_boat', {}, 'horizon', 'The king\'s ship', { damage: 0 }],
  ['wall', 'village_wall', {}, 'hero', 'A wall about to fall', { repair: 0 }],
  ['wall', 'village_wall', {}, 'crack', 'The crack', { repair: 0, crack: 1 }],
  ['wall', 'village_wall', {}, 'hero', 'Set straight', { repair: 1 }],
  ['wall', 'village_wall', {}, 'jar', 'The treasure beneath', { repair: 1 }],
  ['west', 'journeys', { side: 'west' }, 'hero', 'Where the sun sets'],
  ['east', 'journeys', { side: 'east' }, 'hero', 'Where the sun rises'],
  ['pass', 'mountain_pass_barrier', {}, 'hero', 'The pass', { build: 0.45, pour: 0 }],
  ['pass', 'mountain_pass_barrier', {}, 'pour', 'Molten copper', { build: 1, pour: 0.3 }],
  ['pass', 'mountain_pass_barrier', {}, 'barrier', 'The barrier', { build: 1, pour: 0.35 }],
  ['pass', 'mountain_pass_barrier', {}, 'hinge', 'Iron and copper', { build: 1, pour: 1 }],
  ['shore', 'night_shore', {}, 'hero', 'If the sea were ink', { writing: 0.6 }],
  ['shore', 'night_shore', {}, 'ink', 'The inkwell', { ink: 0.3 }],
];
const SLOT = 2;
const LINES = SLOTS.map(([, , , , label], i) => ({ t0: i * SLOT + 0.15, t1: i * SLOT + 1.9, text: label + '.', keys: [], quran: null }));
const CAP = captions(LINES, { display: 'Display', ui: 'UI' });
const S = {};
M.film({
  fonts: CAP.fonts,
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 });
    W.init(G.R);
    const t0 = performance.now();
    for (const [key, b, o] of SLOTS) if (!S[key]) { const a = performance.now(); S[key] = W.stage(await SETS[b](o)); console.log(`built ${key} in ${((performance.now() - a) / 1000).toFixed(1)} s`); }
    for (const k of Object.keys(S)) { S[k].update(0, 0, {}); G.R.compile(S[k].scene, S[k].camera); }
    console.log(`all sets built in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t) {
    const i = Math.min(SLOTS.length - 1, Math.floor(t / SLOT)), [key, , , anchor, , ro = {}] = SLOTS[i], st = S[key];
    const p = E.inOutSine(prog(t, i * SLOT, (i + 1) * SLOT));
    const P = W.pose(st.set.cameras, anchor), k = 0.06 * p;
    const cam = { pos: P.pos.map((v, j) => v + (P.look[j] - v) * k), look: P.look, fov: P.fov, roll: P.roll };
    G.renderSet(ctx, st, t, u, { ...ro, cam });
    CAP.draw(ctx, t);
  },
});
