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
  ['cave_day', 'mountain_cave', { time: 'day' }, 'interior', 'The sleepers', { day: 0.2 }],
  ['cave_day', 'mountain_cave', { time: 'day' }, 'threshold', 'The dog at the threshold', { day: 0.6 }],
  ['gardens', 'two_gardens', {}, 'hero', 'Two gardens'],
  ['gardens', 'two_gardens', {}, 'gate', 'The garden gate'],
  ['gardens', 'two_gardens', {}, 'grapes', 'Grapes on the vine'],
  ['ruin', 'two_gardens', { state: 'ruined' }, 'trellis', 'The ruined garden'],
  ['rain', 'rain_on_plants', {}, 'hero', 'Rain on the plain', { stage: 0.08 }],
  ['rain', 'rain_on_plants', {}, 'macro', 'A drop, a shoot', { stage: 0.16, drop: 0.75 }],
  ['rain', 'rain_on_plants', {}, 'field', 'Green, tangled', { stage: 0.46 }],
  ['rain', 'rain_on_plants', {}, 'hero', 'Gold, then brown', { stage: 0.72 }],
  ['rain', 'rain_on_plants', {}, 'hero', 'Scattered by the wind', { stage: 0.87 }],
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
