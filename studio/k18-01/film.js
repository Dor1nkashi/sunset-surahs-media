// k18-01 "Young Men, One Cave, and One Prayer" (Al-Kahf 18:10, 18:14). Dusk on the goat path, then the cave.
// Sandalled feet climb the path; one looks back at the town lights; they duck into the dark mouth; inside they sit
// facing the amber opening and raise their palms; they rise and stand in a line; light spreads on the floor between
// their feet; a lamp leans in a draught, then steadies. People are faceless, seen from behind (backs, hands, feet).
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { mountain_cave } from '../lib_shared/sets_kahf.js';
import { PALETTES } from '../lib_shared/people.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 28.37;

let SET, ST, CAP, H, PX, MEN = [], LAMP, FLOOR_SPOT, DUST, BEAM, TOWN;
const C = {};
// the four seated / standing places inside, facing the mouth (+z)
const SEAT = [[-1.45, -4.55, 0.18], [-0.48, -4.2, 0.06], [0.52, -4.3, -0.05], [1.5, -4.65, -0.16]];
const LAMP_AT = [-1.05, -6.45];
// on the path: the leader's z through the outdoor shots (cuts are small ellipses of the climb)
const leadZ = (t) => t < 1.49 ? 20.6 - 1.25 * t : t < 2.98 ? 17.2 - 1.25 * (t - 1.49) : t < 4.45 ? 11.5 - 0.9 * (t - 2.98) : 1.9 - 1.6 * (t - 4.45);
const OFF = [[0, 0], [0.42, 1.05], [-0.38, 2.0], [0.2, 3.05]];          // follower offsets (x, behind in z)

function walkerAt(i, t) {
  const z = leadZ(t) + OFF[i][1], m = W.sstep(1.5, 10, z), x = PX(z) * m + OFF[i][0] * (z > 7 ? 1 : 0.8);
  const dz = 0.2, dx = PX(z - dz) * W.sstep(1.5, 10, z - dz) - PX(z + dz) * W.sstep(1.5, 10, z + dz), yaw = Math.atan2(dx, -2 * dz);   // facing uphill (-z)
  return { x, z, y: z > 7 ? H(x, z) : 0, yaw };
}
const RISE = (i) => 11.95 + 0.42 * i;

function posePeople(t, i) {
  const outside = t < 5.92;
  MEN.forEach((p, k) => {
    p.object3d.visible = true;
    if (outside) {
      const w = walkerAt(k, t);
      let yaw = w.yaw;
      // shot 3: the last man pauses and looks back down at the town, then turns to follow
      if (k === 3 && t >= 2.98 && t < 4.45) { const back = 1 - E.inOutSine(prog(t, 3.75, 4.4)); yaw = w.yaw + Math.PI * 0.82 * back; }
      K.place(p, w.x, w.y - 0.02, w.z, yaw);
      const still = k === 3 && t >= 2.98 && t < 4.1;
      p.setPose(still ? 'stand' : 'walk', t + k * 0.37);
      // ducking under the low lip
      const duck = 1 - clamp(Math.abs(w.z + 0.6) / 1.4);
      if (duck > 0) { K.tilt(p, 'Spine', 22 * duck, 0, 0); K.tilt(p, 'Spine1', 14 * duck, 0, 0); K.tilt(p, 'Neck', 12 * duck, 0, 0); }
      p.object3d.visible = w.z > -3.2;
      return;
    }
    const [x, z, yaw] = SEAT[k];
    K.place(p, x, H(x, z), z, yaw);
    const rise = t < RISE(k) ? 0 : E.inOutSine(prog(t, RISE(k), RISE(k) + 0.75));
    p.setPose('stand', t + k * 1.3);
    if (rise < 1) K.sit(p, 0.24 + 0.62 * rise, { lean: 8 * (1 - rise), footFwd: 0.42 - 0.3 * rise, footW: 0.16 });
    // palms rise during the prayer (seated), and again in the close-up of shot 10 (standing)
    const pk = t < 11.68 ? E.inOutSine(prog(t, 6.3 + 0.25 * k, 7.9 + 0.25 * k)) : (i === 9 && k === 1) ? 1 : 0;
    if (pk > 0) { K.palmsUp(p, pk, rise < 1 ? { y: 0.62, fwd: 0.36 } : { y: 1.1, fwd: 0.34 }); }
    // shot 11: one man shifts his stance to stand firmer
    if (i === 10 && k === 2) { const s = E.inOutSine(prog(t, 20.9, 21.5)); if (s > 0) K.limb(p, 'LeftUpLeg', 'LeftLeg', 'LeftFoot', K.onBody(p, 0.13 + 0.07 * s, 0.09 + 0.05 * Math.sin(Math.PI * s), 0.02), K.onBody(p, 0.2, 0.6, 3)); }
    K.tilt(p, 'Head', 6, 0, 0);
  });
}

const SHOTS = [
  { t0: 0.00, t1: 1.49, cam: 'feet' },
  { t0: 1.49, t1: 2.98, cam: 'climb' },
  { t0: 2.98, t1: 4.45, cam: 'glance' },
  { t0: 4.45, t1: 5.92, a: 'mouth' },
  { t0: 5.92, t1: 8.80, a: 'circle_a', b: 'circle_b', ease: E.inOutSine },
  { t0: 8.80, t1: 11.68, a: 'palms' },
  { t0: 11.68, t1: 13.78, a: 'rise_a', b: 'rise_b', ease: E.inOutSine },
  { t0: 13.78, t1: 15.89, a: 'line' },
  { t0: 15.89, t1: 18.00, a: 'floor_a', b: 'floor_b', ease: E.inOutSine },
  { t0: 18.00, t1: 20.00, a: 'palms2' },
  { t0: 20.00, t1: 22.69, a: 'sandals' },
  { t0: 22.69, t1: 25.13, a: 'lamp1' },
  { t0: 25.13, t1: 26.75, a: 'lamp2' },
  { t0: 26.75, t1: D, a: 'lamp3' },
];

function camFor(s, i, t, pe) {
  if (s.cam === 'feet') { const w = walkerAt(0, t), z = w.z - 1.9; return { pos: [PX(z) + 0.15, H(PX(z), z) + 0.32, z], look: [w.x - 0.1, w.y + 0.18, w.z + 0.9], fov: 44 }; }
  if (s.cam === 'climb') { const w = walkerAt(1, t), z = w.z + 5.2; return { pos: [PX(z) - 0.9, H(PX(z), z) + 1.55, z], look: [PX(w.z - 3.5), H(PX(w.z - 3.5), w.z - 3.5) + 1.0, w.z - 3.5], fov: 40 }; }
  if (s.cam === 'glance') { const w = walkerAt(3, 3.3), k = E.inOutSine(prog(t, 2.98, 4.45)), z = w.z - 2.7 + 0.4 * k;
    return { pos: [w.x - 0.55, H(w.x, z) + 2.0 - 0.05 * k, z], look: [w.x + 25, H(w.x, w.z) - 14, w.z + 70], fov: 38 }; }
  return K.camLerp(C[s.a], s.b ? C[s.b] : null, pe);
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await mountain_cave({ time: 'day', day: 0.88, sleepers: 0, dog: false, lamp: true, vista: false });
    H = SET.props.terrain.heightAt; PX = SET.props.pathX;
    const S = SET.scene;
    // the lamp sits behind the group (on a flat stone), so the last shots see the group past its flame
    LAMP = SET.props.lamp; LAMP.position.set(LAMP_AT[0], 0.0, LAMP_AT[1]); LAMP.rotation.y = 0.6;
    const flat = new THREE.MeshStandardMaterial({ color: 0x5e5246, roughness: 0.95 });
    for (const [x, z] of SEAT) { const st = W.rbox(0.5, 0.16, 0.42, flat, { r: 0.05, seg: 3 }); st.position.set(x, H(x, z) - 0.04, z - 0.08); S.add(W.shadows(st)); }
    const ls = W.rbox(0.36, 0.06, 0.3, flat, { r: 0.02, seg: 2 }); const LY = H(LAMP_AT[0], LAMP_AT[1]); ls.position.set(LAMP_AT[0], LY - 0.02, LAMP_AT[1]); S.add(W.shadows(ls)); LAMP.position.y = LY + 0.045;
    // amber light from the opening spreading on the floor between their feet
    FLOOR_SPOT = new THREE.SpotLight(0xffb060, 0, 18, 0.45, 0.85, 1.3); FLOOR_SPOT.position.set(0, 1.6, 2.4); FLOOR_SPOT.target.position.set(0, 0, -4.6);
    FLOOR_SPOT.castShadow = true; FLOOR_SPOT.shadow.mapSize.set(1024, 1024); FLOOR_SPOT.shadow.bias = -0.0005; S.add(FLOOR_SPOT, FLOOR_SPOT.target);
    BEAM = new THREE.PointLight(0xffa860, 4, 7, 1.6); BEAM.position.set(0, 1.4, -2.2); S.add(BEAM);
    SET.props.dust.userData.U.size.value = 1.1;
    DUST = K.dustMotes({ centre: [0.2, 1.1, -3.6], size: [2.6, 1.4, 2.0], count: 380, seed: 4, px: 0.006, op: 0.5, fall: 0.01 }); S.add(DUST);
    // small yellow town lights far down the valley
    { const r = W.rng(31), g = new THREE.SphereGeometry(0.9, 8, 6), m = new THREE.MeshBasicMaterial({ color: 0xffd080, toneMapped: false }); const N = 46;
      TOWN = new THREE.InstancedMesh(g, m, N); const M4 = new THREE.Matrix4();
      for (let k = 0; k < N; k++) { const x = 95 + (r() - 0.5) * 70, z = 330 + (r() - 0.5) * 60; M4.makeTranslation(x, H(x, z) + 1.5, z); TOWN.setMatrixAt(k, M4); }
      S.add(TOWN); }
    // the young men: plain long tunics, head-wraps, different builds; no faces
    const PE = await K.people();
    const looks = [['sand', 'short', 'wrap', 1.0], ['earth', 'none', 'wrap', 0.7], ['cream', 'short', 'turban', 0.75], ['olive', 'none', 'wrap', 0.75]];
    const SK = ['#8a5c3c', '#a06e48', '#7a5034', '#946446'];
    MEN = looks.map(([pal, beard, hw, det], k) => PE.make({ kind: 'man', outfit: 'traveller', palette: { ...PALETTES[pal], skin: SK[k] }, beard, headwear: hw, seed: 140 + k * 11, detail: det }));
    for (const p of MEN) S.add(p.object3d);
    // cameras inside
    C.mouth = { pos: [2.7, 0.3, 4.6], look: [-0.3, 0.95, -1.2], fov: 50 };
    C.circle_a = { pos: [1.05, 1.22, -7.6], look: [-0.1, 0.85, 0.5], fov: 44 };
    C.circle_b = { pos: [0.78, 1.12, -6.3], look: [-0.1, 0.85, 0.5], fov: 42 };
    C.palms = { pos: [0.95, 1.12, -4.75], look: [0.42, 0.66, -3.85], fov: 24 };
    C.rise_a = { pos: [0.25, 0.42, -8.0], look: [0.0, 1.0, 0.5], fov: 58 };
    C.rise_b = { pos: [0.25, 0.42, -7.8], look: [0.0, 1.0, 0.5], fov: 57 };
    C.line = { pos: [-0.4, 0.34, -7.2], look: [0.1, 1.05, 0.5], fov: 46 };
    C.floor_a = { pos: [0.05, 0.13, -6.0], look: [0.0, 0.12, 0.5], fov: 36 };
    C.floor_b = { pos: [0.02, 0.12, -5.0], look: [0.0, 0.14, 0.5], fov: 34 };
    C.palms2 = { pos: [0.2, 1.5, -4.4], look: [-0.46, 1.16, -3.78], fov: 26 };
    C.sandals = { pos: [-3.7, 0.14, -4.0], look: [0.6, 0.1, -4.5], fov: 26 };
    SET.group.updateMatrixWorld(true); const fp = LAMP.userData.flame.getWorldPosition(V()); const LF = [fp.x, fp.y + 0.035, fp.z];
    C.lamp1 = { pos: [LF[0] - 0.3, LF[1] + 0.1, LF[2] - 0.7], look: [LF[0], LF[1] - 0.01, LF[2]], fov: 22 };
    C.lamp2 = { pos: [LF[0] - 0.42, LF[1] + 0.12, LF[2] - 1.35], look: [-0.1, 0.62, -2.0], fov: 30 };
    C.lamp3 = { pos: [LF[0] - 0.16, LF[1] + 0.06, LF[2] - 0.5], look: [LF[0], LF[1] - 0.005, LF[2]], fov: 18 };
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-01] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    let cam = camFor(s, i, t, (s.ease || E.linear)(p));
    cam = K.breathe(cam, t, s.cam ? 0.004 : 0.0015, 3 + i);
    posePeople(t, i);
    // floor light grows from the standing line onward (shot 8 on)
    const fl = E.inOutSine(prog(t, 13.9, 17.6));
    FLOOR_SPOT.intensity = 6 + 30 * fl; BEAM.intensity = 1.0 + 1.0 * fl;
    DUST.userData.update(t, t > 5.9 && t < 22.7 ? 1 : 0);
    // the lamp: leans in a draught, then steadies and grows (shots 12-14)
    const f = LAMP.userData.flame, lean = (1 - E.inOutSine(prog(t, 23.3, 24.5))) * (0.32 + 0.12 * Math.sin(t * 9.0) + 0.06 * Math.sin(t * 23));
    f.rotation.z = t > 22.69 ? lean : 0.04 * Math.sin(t * 5); f.scale.setScalar(1 + 0.35 * E.inOutSine(prog(t, 24.0, 25.5)));
    const ex = t < 5.92 ? 0.95 : i === 11 || i === 13 ? 1.1 : 1.25;
    ST.bloom = i >= 11 ? SET.bloom : 0; SET.props.sun.intensity = t < 5.92 ? 3.4 : 1.6;
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex, mist: 0, lamp: t > 22.69 ? (i === 12 ? 0.6 : 0.32) : 0.7, shaft: 1 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
