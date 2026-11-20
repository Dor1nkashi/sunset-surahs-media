// k18-16 "Fifteen Lessons from the Surah of the Cave" (outro, Al-Kahf 18:110). mountain_cave at sunrise.
// Sunrise along the cave lip; a glide along the ridge; the four far places lit one by one on a long lens; back to the
// mouth; four object beats (lamp, dates, pen, iron and copper); a tilt down into the mouth that lands on the opener's
// first pose (k18-00 shot 1) so the series loops. No people. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { mountain_cave, two_gardens, night_shore, mountain_pass_barrier } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 17.79;

let CAVE, GARD, SHORE, PASS, CAP, Hc, FOG0 = 0, C = {}, SHOTS;

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    const cave = await mountain_cave({ time: 'sunrise', sleepers: 0, dog: false, lamp: true, vista: true });
    Hc = cave.props.terrain.heightAt; FOG0 = cave.scene.fog ? cave.scene.fog.density : 0;
    const lamp = cave.props.lamp.position.clone();
    CAVE = W.stage(cave);
    // the garden: the palm nearest the back wall of garden A, its date clusters near the crown
    const gard = await two_gardens({ time: 'golden' });
    let best = null; for (const p of gard.props.palms) { const d = Math.hypot(p.position.x - (-28.5), p.position.z - (-15.8)); if (!best || d < best.d) best = { p, d }; }
    const bb = new THREE.Box3().setFromObject(best.p), top = bb.max.y, pc = best.p.position;
    C.dates = { pos: [pc.x - 2.2, top - 2.6, pc.z + 2.6], look: [pc.x, top - 0.8, pc.z], fov: 36 };
    GARD = W.stage(gard);
    // the reed pen over the strokes (night shore table, a warm lamp-like key so it reads in a 0.7 s beat)
    const shore = await night_shore();
    const pr = shore.props.parchment.position, pen = shore.props.pen.position;
    const key = new THREE.SpotLight(0xffc890, 6, 4, 0.5, 0.6, 1.4); key.position.set(pr.x + 0.6, pr.y + 0.9, pr.z + 0.5); key.target.position.copy(pr); shore.scene.add(key, key.target);
    C.pen = { pos: [pen.x + 0.18, pen.y + 0.2, pen.z + 0.2], look: [pen.x - 0.06, pen.y, pen.z - 0.02], fov: 30 };
    SHORE = W.stage(shore);
    const pass = await mountain_pass_barrier({ time: 'golden', build: 1, pour: 0.3 });
    C.iron = { pos: [1.45, 1.4, 2.0], look: [0.55, 1.25, 0.5], fov: 28 };
    C.p_air_a = { pos: [6, 9, 62], look: [0, 5, 0], fov: 40 };
    C.p_air_b = { pos: [2, 7, 40], look: [0, 6, 0], fov: 40 };
    C.g_air_a = { pos: [14, 40, 70], look: [0, 0, 2], fov: 44 };
    C.g_air_b = { pos: [6, 34, 58], look: [0, 0, 2], fov: 44 };
    PASS = W.stage(pass);
    // cave poses (the last one is k18-00's first pose: inside, looking out of the arch)
    Object.assign(C, {
      sun_a:   { pos: [-1.5, 0.9, 6.0], look: [30, 3.0, 14], fov: 52 },
      sun_b:   { pos: [-1.0, 0.95, 6.1], look: [30, 3.6, 14.5], fov: 52 },
      glide_a: { pos: [7.5, 1.9, 15.5], look: [0, 1.2, -1], fov: 46 },
      glide_b: { pos: [4.6, 1.2, 11.5], look: [0, 1.1, -1], fov: 44 },
      v_gard:  { pos: [10, 24, 12], look: [-150, -178, 360], fov: 24 },
      v_seas:  { pos: [10, 24, 12], look: [140, -178, 470], fov: 24 },
      v_wall:  { pos: [10, 24, 12], look: [250, -176, 320], fov: 24 },
      v_pass:  { pos: [10, 24, 12], look: [-330, -120, 640], fov: 24 },
      mouth_a: { pos: [3.4, 0.55, 10.2], look: [0, 1.0, -1], fov: 44 },
      mouth_b: { pos: [2.5, 0.85, 7.6], look: [0, 0.95, -1.5], fov: 44 },
      lamp:    { pos: [lamp.x + 0.6, lamp.y + 0.28, lamp.z + 0.55], look: [lamp.x, lamp.y + 0.06, lamp.z], fov: 28 },
      tilt_a:  { pos: [1.6, 1.3, 6.2], look: [0.0, 3.5, -3], fov: 50 },
      tilt_b:  { pos: [0.3, 1.0, -1.0], look: [0.0, 0.9, -10], fov: 54 },
      in_a:    { pos: [0.3, 0.85, -8.2], look: [0, 1.0, 6], fov: 54 },
      in_b:    { pos: [0.3, 0.85, -7.75], look: [0, 1.0, 6], fov: 54 },
    });
    SHOTS = [
      { t0: 0.00, t1: 2.42, set: 'cave', a: C.sun_a, b: C.sun_b },
      { t0: 2.42, t1: 3.78, set: 'cave', a: C.glide_a, b: C.glide_b, ease: E.inOutSine },
      { t0: 3.78, t1: 6.52, set: 'gard', a: C.g_air_a, b: C.g_air_b, sweep: 1 },
      { t0: 6.52, t1: 9.25, set: 'pass', a: C.p_air_a, b: C.p_air_b, sweep: 1 },
      { t0: 9.25, t1: 11.99, set: 'cave', a: C.mouth_a, b: C.mouth_b, ease: E.inOutSine },
      { t0: 11.99, t1: 12.65, set: 'cave', a: C.lamp },
      { t0: 12.65, t1: 13.31, set: 'gard', a: C.dates },
      { t0: 13.31, t1: 13.97, set: 'shore', a: C.pen },
      { t0: 13.97, t1: 14.63, set: 'pass', a: C.iron },
      { t0: 14.63, t1: 16.21, set: 'cave', a: C.tilt_a, b: C.tilt_b, ease: E.inOutCubic },
      { t0: 16.21, t1: D, set: 'cave', a: C.in_b, b: C.in_a, ease: E.inOutSine },
    ];
    for (const st of [CAVE, GARD, SHORE, PASS]) { st.set.update(0, null, {}); G.R.compile(st.scene, st.camera); }
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    let cam = K.camLerp(s.a, s.b || K.autoMove(s.a, s.k ?? 0.12, s.side ?? 0.05), (s.ease || E.inOutSine)(p));
    cam = K.breathe(cam, t, s.b ? 0.0012 : 0.002, 7 + i);
    if (s.set === 'cave') {
      // which far place is lit: the ray of the place in frame rises (vista rays: [3, 0, 1, 2] order as in k18-00)
      // rays (as in k18-00): 0 garden, 1 two waters, 2 village wall, 3 barrier
      CAVE.set.props.vista.rays.forEach((r, j) => { const on = s.ray === j ? E.inOutSine(prog(t, s.t0, s.t0 + 0.8)) : 0; r.userData.update(t, 1.4 * on); });
      if (CAVE.scene.fog) CAVE.scene.fog.density = FOG0 * (s.ray !== undefined ? 0.3 : 1);
      const inside = i >= 9, ex = i === 10 ? 2.0 : i === 9 ? lerp(1.0, 1.8, E.inOutSine(p)) : i === 5 ? 0.7 : i === 0 ? 0.45 : 1.0;
      CAVE.bloom = i >= 9 ? CAVE.set.bloom : 0;               // grazing outdoor shots: bloom off (NaN spread)
      G.renderSet(ctx, CAVE, t, u, { cam, exposure: ex, mist: i <= 1 ? 0.35 - 0.25 * prog(t, 0, 3.78) : inside ? 1 : 0.3, lamp: inside ? 0.5 : 1 });
    } else if (s.set === 'gard') G.renderSet(ctx, GARD, t, u, { cam, exposure: GARD.set.exposure * (s.sweep ? lerp(0.6, 1.05, E.inOutSine(p)) : 1) });
    else if (s.set === 'shore') G.renderSet(ctx, SHORE, t, u, { cam, writing: 0.62, ink: 0.4 });
    else G.renderSet(ctx, PASS, t, u, { cam, build: 1, pour: 0.3, exposure: PASS.set.exposure * (s.sweep ? lerp(0.6, 1.05, E.inOutSine(prog(t, 6.52, 8.0))) : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
