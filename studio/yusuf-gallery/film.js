// Yusuf world gallery: every set of the "15 Lessons from Surah Yusuf" world from its hero camera,
// 2 s each (one slow purposeful push-in per set). Proof sheet for lib_shared/world.js + sets_yusuf.js
// + captions.js. Pure function of time.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { SETS } from '../lib_shared/sets_yusuf.js';
import { captions } from '../lib_shared/captions.js';
const { W: FW, H: FH, prog, E, font } = M;

// [set, options, camera anchor, label]
const SLOTS = [
  ['canaan_hills', { time: 'dusk' }, 'hero', 'Canaan hills'],
  ['the_well', {}, 'hero', 'The well'],
  ['the_well', {}, 'inside_up', 'Inside the well'],
  ['caravan_route', {}, 'hero', 'Caravan route'],
  ['egypt_market', {}, 'hero', 'Egyptian market'],
  ['ministers_house', {}, 'hero', "The minister's house"],
  ['prison', {}, 'hero', 'The prison'],
  ['nile_fields_granary', {}, 'hero', 'Nile fields and granary'],
  ['palace_hall', {}, 'hero', 'Palace hall'],
  ['reunion', {}, 'hero', 'The reunion'],
];
const SLOT = 2;
// demo captions in the lines.json shape (one Quran line to test the verse face + chip)
const LINES = SLOTS.map(([, , , label], i) => ({ t0: i * SLOT + 0.15, t1: i * SLOT + 1.9, text: label + '.', keys: [label.split(' ').pop().replace(/[^\w']/g, '')], quran: null }));
LINES[2] = { t0: 4.15, t1: 5.9, text: 'You will surely inform them about this affair of theirs.', keys: ['surely', 'inform'], quran: { ref: '12:15', surah: 'Yusuf' } };
const CAP = captions(LINES, { display: 'Display', ui: 'UI' });

const S = {};
M.film({
  fonts: CAP.fonts,
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 });
    W.init(G.R);
    const names = [...new Set(SLOTS.map((s) => s[0]))];
    const t0 = performance.now();
    for (const n of names) { const a = performance.now(); S[n] = W.stage(await SETS[n](SLOTS.find((s) => s[0] === n)[1])); console.log(`built ${n} in ${((performance.now() - a) / 1000).toFixed(1)} s`); }
    // compile every set's shaders up front so frame times are honest
    for (const n of names) { S[n].update(0, 0, {}); G.R.compile(S[n].scene, S[n].camera); }
    console.log(`all sets built in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t) {
    const i = Math.min(SLOTS.length - 1, Math.floor(t / SLOT)), [name, , anchor] = SLOTS[i], st = S[name];
    const p = E.inOutSine(prog(t, i * SLOT, (i + 1) * SLOT));
    const P = W.pose(st.set.cameras, anchor), k = 0.06 * p;                   // a slow 6 % push toward the subject
    const cam = { pos: P.pos.map((v, j) => v + (P.look[j] - v) * k), look: P.look, fov: P.fov, roll: P.roll };
    const a = performance.now();
    G.renderSet(ctx, st, t, u, { cam });
    window.LAST_MS = performance.now() - a;
    CAP.draw(ctx, t);
  },
});
