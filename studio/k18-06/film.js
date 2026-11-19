// k18-06 "Allah Compares This World to a Rainstorm" (Al-Kahf 18:45). The barley plain.
// A raindrop on cracked earth; a seed germinates in the crack; pull back to rain over the plain; one locked time-lapse:
// green, tangled, gold, brown, snapping, wind; chaff streams away; the empty plain with one straw stalk; a green stalk
// with water beads; a dry stalk bends and breaks; chaff drifts out of frame; an open palm lets the last straw go.
// No people except the hand at the end. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { rain_on_plants } from '../lib_shared/sets_kahf.js';
import { PALETTES } from '../lib_shared/people.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 31.85;

let SET, ST, CAP, hy, STALK, BEADS = [], HANDP, STRAWS = [], MAN;
const C = {};
const SK = [-1.2, 11.2];                        // the hero stalk in the foreground (left of the hero camera's view)

// the stage of the plain as a pure function of t
function stageAt(t) {
  if (t < 3.10) return 0.02 + 0.18 * prog(t, 1.55, 3.10) * (t >= 1.55 ? 1 : 0);
  if (t < 5.43) return 0.2 + 0.04 * prog(t, 3.10, 5.43);
  if (t < 16.39) return 0.24 + (0.86 - 0.24) * prog(t, 5.43, 16.39);
  if (t < 19.13) return 0.86 + 0.07 * prog(t, 16.39, 19.13);
  if (t < 23.56) return 1.0;
  if (t < 25.04) return 0.3;
  if (t < 27.12) return 0.8;
  if (t < 29.18) return 0.9;
  return 1.0;
}
const SHOTS = [
  { t0: 0.00, t1: 1.55, a: 'macro_a', b: 'macro_b' },
  { t0: 1.55, t1: 3.10, a: 'macro_b', b: 'macro_c', ease: E.inOutSine },
  { t0: 3.10, t1: 5.43, a: 'macro_c', b: 'hero', ease: E.inOutCubic, log: true },
  { t0: 5.43, t1: 16.39, a: 'hero' },
  { t0: 16.39, t1: 19.13, a: 'chaff_a', b: 'chaff_b', ease: E.inOutSine },
  { t0: 19.13, t1: 21.34, a: 'wide' },
  { t0: 21.34, t1: 23.56, a: 'stalk_a', b: 'stalk_b', ease: E.inOutSine },
  { t0: 23.56, t1: 25.04, a: 'green' },
  { t0: 25.04, t1: 27.12, a: 'dry' },
  { t0: 27.12, t1: 29.18, a: 'drift' },
  { t0: 29.18, t1: D, a: 'palm' },
];

function heroStalk() {
  // a single barley stalk: stem (tube), two leaves, and an ear of grains with awns; colour and break are set per frame
  const g = new THREE.Group(), stemM = new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.55 }), earM = new THREE.MeshStandardMaterial({ color: 0x5a8a30, roughness: 0.6 });
  const low = new THREE.Group(), top = new THREE.Group(); g.add(low); low.add(top);
  const pts = []; for (let j = 0; j <= 12; j++) pts.push(V(0.012 * Math.sin(j * 0.4), j / 12 * 0.62, 0));
  low.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0028, 8), stemM));
  top.position.y = 0.62;
  const pts2 = []; for (let j = 0; j <= 8; j++) pts2.push(V(0.01 * Math.sin(j * 0.5 + 2), j / 8 * 0.26, 0));
  top.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 30, 0.0024, 8), stemM));
  const ear = new THREE.Group(); ear.position.y = 0.26; top.add(ear);
  const gr = new THREE.SphereGeometry(1, 12, 8), awnG = new THREE.CylinderGeometry(0.0003, 0.0006, 0.09, 4).translate(0, 0.045, 0);
  for (let k = 0; k < 22; k++) { const y = k * 0.0042, s = k % 2 ? 1 : -1, m = new THREE.Mesh(gr, earM); m.scale.set(0.0032, 0.0062, 0.0032); m.position.set(0.0035 * s, y, 0.0012 * Math.sin(k)); m.rotation.z = -0.35 * s; ear.add(m);
    const aw = new THREE.Mesh(awnG, earM); aw.position.copy(m.position); aw.rotation.z = -0.22 * s; ear.add(aw); }
  for (const [y, s] of [[0.22, 1], [0.4, -1]]) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.012).translate(0.08, 0, 0), new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.55, side: THREE.DoubleSide })); lf.position.y = y; lf.rotation.set(0.2, s > 0 ? 0 : Math.PI, -0.6); low.add(lf); }
  W.shadows(g);
  g.userData = { low, top, ear, mats: [stemM, earM, ...low.children.filter((c) => c.isMesh && c.geometry.type === 'PlaneGeometry').map((c) => c.material)] };
  return g;
}
function stalkState(t) {
  // colour: green (0) -> straw (1) -> brown (2); bend/break 0..1
  const dry = t < 23.56 ? 1.2 : t < 25.04 ? 0 : t < 27.12 ? 1.8 : 1.6;
  const bend = t >= 25.04 && t < 27.12 ? E.inOutSine(prog(t, 25.4, 26.6)) : 0, brk = t >= 25.04 && t < 27.12 ? E.inCubic ? E.inCubic(prog(t, 26.4, 27.0)) : prog(t, 26.4, 27.0) : 0;
  const c0 = new THREE.Color(0x4a7a2a), c1 = new THREE.Color(0xc8a860), c2 = new THREE.Color(0x8a6a44);
  const col = dry <= 1 ? c0.clone().lerp(c1, dry) : c1.clone().lerp(c2, dry - 1);
  STALK.userData.mats.forEach((m) => m.color.copy(col));
  const sway = 0.04 * Math.sin(t * 1.7) + (t >= 19.13 && t < 23.56 ? 0.01 * Math.sin(t * 3.1) : 0);
  STALK.userData.low.rotation.z = sway + 0.18 * bend; STALK.userData.top.rotation.z = 0.25 * bend + 1.3 * brk; STALK.userData.top.rotation.x = 0.2 * brk;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await rain_on_plants({ stage: 0 });
    hy = SET.props.terrain.heightAt;
    const S = SET.scene;
    STALK = heroStalk(); STALK.position.set(SK[0], hy(...SK) - 0.01, SK[1]); S.add(STALK);
    // water beads on the green stalk (shot 11): they roll down the stem
    { const bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.95, thickness: 0.002, ior: 1.33, transparent: true });
      for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0026 + 0.0008 * (k % 3), 20, 14), bm); STALK.userData.low.add(b); BEADS.push(b); } }
    // the hand at the end: a man's open palm (sleeve, no face), letting straw slide off into the breeze
    const PE = await K.people();
    MAN = PE.make({ kind: 'man', outfit: 'traveller', palette: { ...PALETTES.earth, cloak: '#5a4632', skin: '#8a5a3a' }, beard: 'short', headwear: 'wrap', seed: 64, detail: 0.8 });
    S.add(MAN.object3d);
    HANDP = V(2.4, hy(2.4, 9) + 1.15, 9.0);
    { const m = new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 0.8 });
      for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.07 + 0.03 * (k % 3), 6), m); s.castShadow = true; S.add(s); STRAWS.push(s); } }
    // cameras
    const mc = SET.cameras.macro;
    C.macro_a = { ...mc }; C.macro_b = { pos: mc.pos.map((v, i) => v + (mc.look[i] - v) * 0.12), look: mc.look, fov: mc.fov };
    C.macro_c = { pos: mc.pos.map((v, i) => v + (mc.look[i] - v) * 0.22 + (i === 1 ? 0.01 : 0)), look: mc.look.map((v, i) => v + (i === 1 ? 0.012 : 0)), fov: mc.fov };
    C.hero = { ...SET.cameras.hero };
    C.chaff_a = { pos: [-4, 1.4, 10], look: [8, 1.2, -20], fov: 46 };
    C.chaff_b = { pos: [-1, 1.5, 9], look: [12, 1.4, -18], fov: 46 };
    C.wide = { pos: [SK[0] - 0.55, hy(...SK) + 0.75, SK[1] + 1.6], look: [10, 4, -80], fov: 58 };
    C.stalk_a = { pos: [SK[0] + 0.25, hy(...SK) + 0.82, SK[1] + 0.85], look: [SK[0], hy(...SK) + 0.86, SK[1]], fov: 30 };
    C.stalk_b = { pos: [SK[0] + 0.25, hy(...SK) + 0.82, SK[1] + 0.85], look: [52, 3, -150], fov: 30 };
    C.green = { pos: [SK[0] + 0.12, hy(...SK) + 0.5, SK[1] + 0.16], look: [SK[0] + 0.005, hy(...SK) + 0.45, SK[1]], fov: 22 };
    C.dry = { pos: [SK[0] + 0.32, hy(...SK) + 0.78, SK[1] + 0.5], look: [SK[0], hy(...SK) + 0.72, SK[1]], fov: 30 };
    C.drift = { pos: [0.6, 1.0, 8.5], look: [6, 0.8, -6], fov: 40 };
    C.palm = { pos: [HANDP.x + 0.28, HANDP.y + 0.08, HANDP.z + 0.32], look: [HANDP.x, HANDP.y - 0.02, HANDP.z], fov: 30 };
    ST = W.stage(SET);
    SET.update(0, null, { stage: 0.5 }); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-06] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    let cam;
    if (s.log) { const k = (s.ease || E.linear)(p), a = C[s.a], b = C[s.b];
      // fly out in log space (a constant-rate dolly from a few cm to tens of metres)
      const f = (x) => Math.pow(x, 1);
      const da = 0.012, db = 1; const L = (x, y, q) => x.map((v, j) => v + (y[j] - v) * q);
      const q = (Math.pow(db / da, k) - 1) / (db / da - 1);
      cam = { pos: L(a.pos, b.pos, f(q)), look: L(a.look, b.look, E.inOutSine(k)), fov: K.lensFov(a.fov + (b.fov - a.fov) * k) };
    } else cam = K.camLerp(C[s.a], s.b ? C[s.b] : null, (s.ease || E.linear)(p));
    if (i !== 3) cam = K.breathe(cam, t, 0.0006, 8 + i);
    const st = stageAt(t);
    // the hero stalk is in shots 9-12 only (elsewhere it is part of the field you never isolate)
    STALK.visible = i >= 5 && i <= 8; stalkState(t);
    BEADS.forEach((b, k) => { const ph = ((t * (0.18 + 0.05 * k) + k * 0.17) % 1), y = 0.6 - 0.45 * ph; b.position.set(0.0032 + 0.012 * Math.sin(y / 0.62 * 12 * 0.4) * 0, y, 0.0028); b.visible = i === 7; });
    // the drop (shot 1): falls 0.15-0.65 s, splashes; a second and third later beside it (the same drop path offset in time)
    const dq = clamp((t - 0.15) / 0.9);
    // the hand and straws (shot 14)
    MAN.object3d.visible = i === 10;
    if (i === 10) {
      K.place(MAN, HANDP.x - 0.18, hy(HANDP.x, HANDP.z - 0.42), HANDP.z - 0.42, 0.35); MAN.setPose('stand', 2);
      K.reach(MAN, 'Right', HANDP.clone(), K.onBody(MAN, -0.8, 0.6, -0.3)); K.handAim(MAN, 'Right', HANDP.clone().add(V(0.02, 0.0, 0.2)), -1.5); K.flatHand(MAN, 'Right', 0.1);
      // the palm tips slowly; straws slide off one by one and are carried away and down out of frame
      const tip = E.inOutSine(prog(t, 29.4, 31.0));
      K.tilt(MAN, 'RightHand', 0, 0, -25 * tip);
    }
    STRAWS.forEach((sw, k) => { const t0 = 29.6 + k * 0.17, dt = t - t0;
      const base = HANDP.clone().add(V(-0.02 + 0.006 * k, 0.02, -0.03 + 0.008 * k));
      if (dt < 0) { sw.position.copy(base); sw.rotation.set(Math.PI / 2, 0.3 * k, 0); }
      else { sw.position.copy(base).add(V(0.25 * dt + 0.12 * dt * dt, -2.2 * dt * dt - 0.05 * dt, -0.08 * dt)); sw.rotation.set(Math.PI / 2 + 3 * dt, 0.3 * k + 2 * dt, dt * 4); }
      sw.visible = i === 10; });
    G.renderSet(ctx, ST, t, u, { cam, stage: st, drop: i === 0 ? dq : 1, exposure: SET.exposure * (i <= 1 ? 1.15 : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
