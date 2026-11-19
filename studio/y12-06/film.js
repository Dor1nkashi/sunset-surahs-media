// y12-06 "Behind Closed Doors, He Said One Sentence" (Yusuf 12:23). ministers_house, evening.
// Everything stays on his side of the closed door: bolts, the door, the lintel emblem, a lamp.
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { ministers_house } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const P = M.FORMAT.portrait;

// world coordinates of the set (see sets_yusuf.js ministers_house)
const ZB = -9.25, DZ = -9.10;            // back wall centre, door face
const XL = -4.75, LAMP3 = [-4.37, 1.72, -1.2];
const BOLT1 = [0.6, 1.36, DZ + 0.018], BOLT2 = [0.6, 1.95, DZ + 0.045];

// camera poses (fov = vertical degrees in 9x16; 16x9 is tightened in K.lensFov)
const C = {
  bolt_a:   { pos: [0.98, 1.30, DZ + 0.62], look: [0.52, 1.33, DZ], fov: 30 },
  bolt_b:   { pos: [0.95, 1.31, DZ + 0.58], look: [0.54, 1.34, DZ], fov: 29 },
  push_a:   { pos: [0.15, 1.45, DZ + 3.6], look: [0.05, 1.35, DZ], fov: 46 },
  push_b:   { pos: [0.18, 1.42, DZ + 2.3], look: [0.10, 1.38, DZ], fov: 44 },
  court_a:  { pos: [5.7, 1.5, 0.9], look: [10.5, 1.6, -2.6], fov: 50 },
  court_b:  { pos: [5.3, 1.7, 2.3], look: [10.5, 1.7, -2.6], fov: 52 },
  bolt2:    { pos: [1.3, 1.8, DZ + 1.2], look: [0.45, 1.85, DZ], fov: 36 },
  back_a:   { pos: [-0.9, 1.55, DZ + 4.3], look: [0.25, 1.35, DZ], fov: 48 },
  back_b:   { pos: [-0.86, 1.55, DZ + 4.15], look: [0.25, 1.35, DZ], fov: 48 },
  hand_a:   { pos: [1.0, 1.55, DZ + 2.1], look: [0.1, 1.3, DZ], fov: 40 },
  hand_b:   { pos: [0.85, 1.5, DZ + 1.6], look: [0.1, 1.3, DZ], fov: 38 },
  tilt_a:   { pos: [0.1, 1.55, DZ + 2.9], look: [0.0, 1.9, DZ], fov: 48 },
  tilt_b:   { pos: [0.1, 1.6, DZ + 2.9], look: [0.0, 3.25, DZ], fov: 46 },
  emb_a:    { pos: [0.05, 2.9, DZ + 1.9], look: [0.0, 3.38, ZB], fov: 30 },
  emb_b:    { pos: [0.05, 3.05, DZ + 1.45], look: [0.0, 3.38, ZB], fov: 28 },
  lamp:     { pos: [-3.25, 1.86, -0.35], look: [LAMP3[0], 1.5, LAMP3[2]], fov: 28 },
  boltc_a:  { pos: [0.98, 1.47, DZ + 0.8], look: [0.6, 1.36, DZ], fov: 26 },
  boltc_b:  { pos: [0.95, 1.46, DZ + 0.72], look: [0.6, 1.36, DZ], fov: 25 },
  flame:    { pos: [0.0, 1.42, DZ + 0.36], look: [0.55, 1.36, DZ], fov: 26 },
};
// the shot table (times from shotlists/y12_06.md)
const SHOTS = [
  { t0: 0.00, t1: 1.60, a: C.bolt_a, b: C.bolt_b },
  { t0: 1.60, t1: 3.55, a: C.push_a, b: C.push_b, ease: E.inOutSine },
  { t0: 3.55, t1: 6.23, a: C.court_a, b: C.court_b, ease: E.inOutSine },
  { t0: 6.23, t1: 7.96, a: C.bolt2 },
  { t0: 7.96, t1: 10.15, a: C.back_a, b: C.back_b },
  { t0: 10.15, t1: 12.70, a: C.hand_a, b: C.hand_b, ease: E.inOutSine },
  { t0: 12.70, t1: 14.39, a: C.tilt_a, b: C.tilt_b, ease: E.inOutCubic },
  { t0: 14.39, t1: 16.56, a: C.emb_a, b: C.emb_b, ease: E.inOutSine },
  { t0: 16.56, t1: 19.70, a: C.lamp },
  { t0: 19.70, t1: 22.03, a: C.boltc_a, b: C.boltc_b },
  { t0: 22.03, t1: 24.69, a: C.lamp },
  { t0: 24.69, t1: 26.62, a: C.hand_a, b: C.hand_b, ease: E.inOutSine },
  { t0: 26.62, t1: 30.43, a: C.flame },
];
const D = 30.43;

let ST, SET, CAP, MAN, WOMAN, SERV, BOLTS = [], DUST, DUST2, SUNSPOT, EMBLIGHT, FALLDUST;
// people per shot (pure function of t)
const V = (...a) => new THREE.Vector3(...a);
function posePeople(t, i) {
  MAN.object3d.visible = i === 4 || i === 5 || i === 11;
  WOMAN.object3d.visible = i === 3;
  SERV.object3d.visible = i === 2;
  if (MAN.object3d.visible) {
    MAN.object3d.position.set(-0.12, 0, DZ + 0.62); MAN.object3d.rotation.y = Math.PI;
    MAN.setPose('stand', t + 3);
    // shot 6: the hand rises and rests flat on the door; shot 12: it is already there, a little lower light
    const k = i === 5 ? E.inOutCubic(prog(t, 10.45, 11.5)) : i === 11 ? 1 : 0;
    if (k > 0) {
      MAN.object3d.updateMatrixWorld(true);
      const h0 = MAN.bones('RightHand').getWorldPosition(V()), tgt = V(0.2, 1.32, DZ + 0.095);
      const pt = h0.clone().lerp(tgt, k), pole = V(0.8, 0.2, DZ + 0.9);
      K.reach(MAN, 'Right', pt, pole);
      K.flatHand(MAN, 'Right', 0.03 + 0.97 * (1 - k));
      K.handAim(MAN, 'Right', pt.clone().add(V(0.02, 0.2 * k - 0.2 * (1 - k), 0.0)), HROLL);
    }
  }
  if (WOMAN.object3d.visible) {
    WOMAN.object3d.position.set(0.2, 0, DZ + 0.4); WOMAN.object3d.rotation.y = Math.PI;
    WOMAN.setPose('stand', t);
    const b2 = E.inOutCubic(prog(t, 6.75, 7.35)), knob = V(BOLT2[0] - 0.24 * (1 - b2) - 0.08, BOLT2[1], BOLT2[2] + 0.07);
    const reachK = E.inOutCubic(prog(t, 6.23, 6.7));
    WOMAN.object3d.updateMatrixWorld(true);
    const h0 = WOMAN.bones('RightHand').getWorldPosition(V());
    K.reach(WOMAN, 'Right', h0.clone().lerp(knob, reachK), V(0.9, 0.9, DZ + 0.9));
    K.handAim(WOMAN, 'Right', knob.clone().add(V(0.07, 0.0, -0.04)), 0); K.flatHand(WOMAN, 'Right', 1.6);
  }
  if (SERV.object3d.visible) {
    // a servant carries a water jar across the courtyard, away from us
    const w = t - 3.55;
    const sp = SERV.speed('walk') * w; SERV.object3d.position.set(6.9 + 0.95 * sp, 0, 0.1 - 0.3 * sp); SERV.object3d.rotation.y = 1.876;
    SERV.setPose('walk', t, { carry: 'jar' });
  }
}
const HROLL = 0;
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await ministers_house({ time: 'evening' });
    const S = SET.scene, iron = W.ironMat();
    // polished door wood: the leaf boards get a satin finish so the lamp flame shows in them
    const door = SET.props.door;
    door.leaf.traverse((m) => { if (m.isMesh && m.material && !m.material.metalness) { const mm = m.material.clone(); mm.roughness = 0.3; mm.envMapIntensity = 1.4; m.material = mm; } });
    // two bolts on the room side of the door (the set's own bolt is on the far side)
    for (const p of [BOLT1, BOLT2]) { const b = K.doorBolt(iron); b.position.set(...p); S.add(b); BOLTS.push(b);
      const kp = W.rbox(0.06, 0.07, 0.05, iron, { r: 0.008 }); kp.position.set(0.81, p[1] - 0.035, DZ + 0.03); S.add(kp); }
    // dust in the lamp light by the door, and in the window light
    DUST = K.dustMotes({ centre: [0.2, 1.5, DZ + 1.2], size: [2.4, 1.8, 1.8], count: 420, seed: 5, px: 0.008, op: 0.55, fall: 0.012 }); S.add(DUST);
    DUST2 = K.dustMotes({ centre: [LAMP3[0] + 0.5, 1.8, LAMP3[2]], size: [1.2, 1.0, 1.4], count: 160, seed: 9, px: 0.006, op: 0.45, fall: 0.01 }); S.add(DUST2);
    // a few grains on the bolt that slide off (shot 10)
    FALLDUST = K.dustMotes({ centre: [0.62, 1.3, DZ + 0.06], size: [0.25, 0.25, 0.03], count: 40, seed: 13, px: 0.004, op: 0.8, fall: 0.06 }); S.add(FALLDUST);
    // late sun through the high window, landing on the door (moves down as the evening goes)
    SUNSPOT = new THREE.SpotLight(0xffb878, 0, 30, 0.07, 0.6, 1.2); SUNSPOT.position.set(XL - 6, 5.2, -1.5); S.add(SUNSPOT, SUNSPOT.target);
    // amber light sliding across the emblem
    EMBLIGHT = new THREE.SpotLight(0xffa860, 0, 12, 0.18, 0.7, 1.4); EMBLIGHT.position.set(-3, 2.6, DZ + 3); S.add(EMBLIGHT, EMBLIGHT.target);
    // people: the young man (cream linen, indigo sash), the servant in the courtyard, and only the
    // sleeve and hand of the wife of the house on the bolt (deep red, fully covered)
    const PP = await K.people();
    MAN = PP.make({ kind: 'man', outfit: 'thobe', palette: { robe: '#e4d9c2', wrap: '#ece4d2', sash: '#27345a', cloak: '#3f3026', trousers: '#c2ae8c' }, beard: 'none', headwear: 'none', seed: 12 });
    WOMAN = PP.make({ kind: 'woman', outfit: 'abaya', palette: { abaya: '#6a1712', khimar: '#55130f' }, seed: 4, detail: 0.8 });
    SERV = PP.make({ kind: 'man', outfit: 'worker', palette: { robe: '#8e8a80', wrap: '#d8d0c0', sash: '#5a4a3a', trousers: '#a89c88' }, beard: 'short', headwear: 'wrap', seed: 21, detail: 0.6 });
    for (const f of [MAN, WOMAN, SERV]) S.add(f.object3d);
    const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 12, 40), W.goldMat()); bangle.rotation.x = Math.PI / 2; WOMAN.bones('RightHand').add(bangle);
    bangle.scale.setScalar(100); bangle.position.set(0, -2, 0);     // the rig is in centimetres
    // the carved emblem: a lotus rosette in relief (16 petals + a boss) on the lintel disc
    { const em = SET.props.emblem, wood = em.material, g = new THREE.Group();
      const petal = new THREE.SphereGeometry(1, 24, 16); petal.scale(0.035, 0.12, 0.02);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, m = new THREE.Mesh(petal, wood); m.position.set(Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0); m.rotation.z = -a; g.add(m); }
      const petal2 = new THREE.SphereGeometry(1, 20, 12); petal2.scale(0.022, 0.06, 0.018);
      for (let k = 0; k < 16; k++) { const a = (k + 0.5) / 16 * Math.PI * 2, m = new THREE.Mesh(petal2, wood); m.position.set(Math.sin(a) * 0.27, Math.cos(a) * 0.27, -0.035); m.rotation.z = -a; g.add(m); }
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 16), wood); boss.scale.z = 0.6; g.add(boss);
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.012, 12, 96), wood); ringM.position.z = -0.06; g.add(ringM);
      W.shadows(g); g.position.set(0, 3.38, ZB + 0.25 + 0.115); S.add(g); }
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    const pe = (s.ease || E.linear)(p);
    let cam = K.camLerp(s.a, s.b, pe);
    cam = K.breathe(cam, t, s.b ? 0.002 : 0.003, 11 + i);
    // bolt 1 slides home on "closed" in shot 1 and stays closed; bolt 2 is pushed home in shot 4
    const b1 = E.inOutCubic(prog(t, 0.45, 0.95)), b2 = E.inOutCubic(prog(t, 6.75, 7.35));
    BOLTS[0].userData.set(b1 + 0.012 * M.wobble(t - 0.95, 9, 14) * (t > 0.95 ? 1 : 0));
    BOLTS[1].userData.set(b2);
    // window sun on the door: high in shot 6, a hand's width lower in shot 12; off elsewhere
    const sunY = t < 20 ? 1.62 : 1.44, onSun = (i === 5 || i === 11) ? 1 : 0;
    SUNSPOT.intensity = 220 * onSun; SUNSPOT.target.position.set(0.05, sunY - 0.0006 * (t - 10), DZ);
    // amber sweep across the emblem in shot 8
    EMBLIGHT.intensity = i === 7 || i === 6 ? 60 : 0; EMBLIGHT.target.position.set(-0.6 + 1.2 * prog(t, 12.7, 16.6), 3.38, ZB);
    DUST.userData.update(t, i <= 1 || i === 5 || i === 11 || i === 12 ? 1 : 0.0);
    DUST2.userData.update(t, i === 8 || i === 10 ? 1 : 0);
    FALLDUST.userData.update(t, i === 9 ? 1 : 0);
    posePeople(t, i);
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * (i === 2 ? 0.62 : i === 8 || i === 10 ? 0.3 : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
