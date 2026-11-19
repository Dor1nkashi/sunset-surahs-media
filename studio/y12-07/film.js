// y12-07 "A Torn Shirt Proved the Truth" (Yusuf 12:25-27). ministers_house, morning daylight.
// The evidence is the object: a linen tunic torn in the BACK panel. Non-explicit: the chase is a brief
// wide silhouette shot; the wife of the house appears only fully covered, from behind, and as a sleeve.
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { ministers_house } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
import { makeTunic, foldedTunic } from './tunic.js';
const { THREE } = W;
const { prog, E } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 27.13;

// places (world): the courtyard doorway is at x = 4.75, z -4.2..-1.8
const T_HELD = { pos: [3.7, 1.95, -3.45], ry: -Math.PI / 2 - 0.22 };          // held up against the bright doorway
const T_HANG = { pos: [-0.9, 2.1, -6.2] };                             // hung from a beam in the window light
const HANG_FACE = Math.atan2(1.5, 3.3);                                  // back panel toward the camera side
const BENCH = [-3.2, 0.45, -1.0];

// camera poses: { pos, look, fov } in world, or { local: true, ... } in the tunic's frame
const C = {
  held_a:  { local: true, pos: [-0.3, -0.42, 2.25], look: [0, -0.5, 0], fov: 40 },
  held_b:  { local: true, pos: [0.0, -0.42, 2.27], look: [0, -0.5, 0], fov: 39 },
  witness: { pos: [0.55, 1.62, -0.35], look: [3.6, 1.4, -3.1], fov: 48 },
  race:    { pos: [-2.6, 1.75, -1.7], look: [4.75, 1.2, -3.1], fov: 44 },
  pull:    { local: 'grip', off: [-0.62, 0.1, 0.6], fov: 36 },
  husband: { pos: [-1.6, 1.5, -2.1], look: [4.8, 1.45, -3.0], fov: 46 },
  turn:    { pos: [0.6, 1.7, -2.9], look: [-0.9, 1.55, -6.2], fov: 40 },
  back_a:  { local: true, pos: [0.0, -0.36, 1.05], look: [0, -0.4, 0], fov: 32 },
  back_b:  { local: true, pos: [0.0, -0.37, 0.95], look: [0, -0.4, 0], fov: 31 },
  graze_a: { local: true, pos: [0.25, -0.3, 0.6], look: [0.01, -0.36, 0], fov: 24 },
  graze_b: { local: true, pos: [0.18, -0.34, 0.42], look: [0.0, -0.4, 0], fov: 22 },
  thread:  { local: 'edge', s: 0.32, off: [0.07, 0.03, 0.16], fov: 20 },
  fold_a:  { pos: [-2.55, 1.2, -0.25], look: [BENCH[0], 0.5, BENCH[2]], fov: 34 },
  fold_b:  { pos: [-2.7, 1.05, -0.45], look: [BENCH[0], 0.5, BENCH[2]], fov: 32 },
  door:    { pos: [-0.2, 1.6, -3.3], look: [6.0, 1.4, -3.1], fov: 42 },
  macro:   { local: 'edge', s: 0.18, off: [0.06, -0.02, 0.13], fov: 18 },
};
// tunic: where it is (held | worn | hang), tear state; who is visible; camera
const SHOTS = [
  { t0: 0.00, t1: 2.52, a: C.held_a, b: C.held_b, ease: E.inOutSine, tun: 'held' },
  { t0: 2.52, t1: 5.25, a: C.witness, tun: 'held' },
  { t0: 5.25, t1: 7.20, a: C.race, shake: 1, tun: 'worn' },
  { t0: 7.20, t1: 8.99, a: C.pull, tun: 'worn' },
  { t0: 8.99, t1: 11.64, a: C.husband, tun: 'worn' },
  { t0: 11.64, t1: 13.92, a: C.turn, tun: 'hang' },
  { t0: 13.92, t1: 15.23, a: C.back_a, b: C.back_b, tun: 'hang' },
  { t0: 15.23, t1: 17.18, a: C.graze_a, b: C.graze_b, ease: E.inOutSine, tun: 'hang' },
  { t0: 17.18, t1: 19.07, a: C.thread, tun: 'hang' },
  { t0: 19.07, t1: 20.69, a: C.fold_a, b: C.fold_b, ease: E.inOutSine, tun: 'folded' },
  { t0: 20.69, t1: 23.73, a: C.door, tun: 'none' },
  { t0: 23.73, t1: 27.13, a: C.macro, tun: 'held' },
];
// the race: he hurries toward the doorway, she follows; they stop when the husband is there
const RUN0 = 5.25, RUN1 = 7.5;

let SET, ST, CAP, TUN, FOLD, CORD, ROD, GRAZE, P = {};
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await ministers_house({ time: 'morning' });
    const S = SET.scene;
    const linen = await W.pbr('hessian_230', { tile: 0.07, tint: 0xf3ead6, res: 1024, side: THREE.DoubleSide, normal: 0.35 });
    TUN = await makeTunic({ seed: 5, linen }); S.add(TUN);
    FOLD = await foldedTunic({ linen }); FOLD.position.set(...BENCH); FOLD.rotation.y = 0.25; S.add(FOLD);
    // a wooden shoulder rod on a cord from the ceiling beam, for the hung tunic
    const wood = await W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 });
    ROD = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 16).rotateZ(Math.PI / 2), wood); ROD.castShadow = true; S.add(ROD);
    CORD = W.rope([V(0, 0, 0), V(0, 1.0, 0), V(0, 2.0, 0)], 0.006); S.add(CORD);
    // a low grazing light for the rip (morning sun reflected off the courtyard floor)
    GRAZE = new THREE.SpotLight(0xffc27a, 0, 6, 0.35, 0.8, 1.5); S.add(GRAZE, GRAZE.target);
    // people
    const PP = await K.people();
    P.man = PP.make({ kind: 'man', outfit: 'thobe', palette: { robe: '#e4d9c2', wrap: '#ece4d2', sash: '#27345a', cloak: '#3f3026', trousers: '#c2ae8c' }, beard: 'none', headwear: 'none', seed: 12 });
    P.woman = PP.make({ kind: 'woman', outfit: 'abaya', palette: { abaya: '#6a1712', khimar: '#55130f' }, seed: 4, detail: 0.8 });
    P.holder = PP.make({ kind: 'man', outfit: 'thobe', palette: 'white', beard: 'short', headwear: 'wrap', seed: 31, detail: 0.7 });
    P.witness = PP.make({ kind: 'elder', outfit: 'noble', palette: { robe: '#b8863a', wrap: '#e9dfc8', cloak: '#6b4a24', sash: '#5a2e1a', trim: '#d9b25a', trousers: '#c8b48e' }, beard: 'grey', headwear: 'turban', seed: 41, detail: 0.8 });
    P.husband = PP.make({ kind: 'man', outfit: 'noble', palette: 'noble', beard: 'full', headwear: 'kufi', seed: 51, detail: 0.8, build: 1.15 });
    P.hh = PP.make({ kind: 'man', outfit: 'thobe', palette: 'white', beard: 'short', headwear: 'keffiyeh', seed: 61, detail: 0.6 });
    for (const p of Object.values(P)) S.add(p.object3d);
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    placeTunic(t, i, s);
    posePeople(t, i);
    let cam = K.camLerp(s.a, s.b, (s.ease || E.linear)(p));
    TUN.updateMatrixWorld(true);
    if (s.a.local === 'edge') { const e = TUN.userData.edge(s.a.s, 1); cam = { ...cam, pos: TUN.localToWorld(e.clone().add(V(...s.a.off))).toArray(), look: TUN.localToWorld(e).toArray() }; }
    else if (s.a.local === 'grip') { const e = TUN.userData.edge(0.12, 0).lerp(TUN.userData.tearTip(), 0.5); cam = { ...cam, pos: TUN.localToWorld(e.clone().add(V(...s.a.off))).toArray(), look: TUN.localToWorld(e).toArray() }; }
    else if (s.a.local) cam = { ...cam, pos: TUN.localToWorld(V(...cam.pos)).toArray(), look: TUN.localToWorld(V(...cam.look)).toArray() };
    if (s.shake) { const n = W.noise2(7); cam = { ...cam, pos: cam.pos.map((v, k) => v + 0.025 * n(t * 2.2, k * 5)), look: cam.look.map((v, k) => v + 0.05 * n(t * 1.7 + 9, k * 3)) }; }
    else cam = K.breathe(cam, t, 0.002, 21 + i);
    const ex = [0.95, 0.9, 0.8, 1.0, 0.85, 1.0, 1.0, 0.9, 0.9, 1.0, 0.9, 0.9][i];
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * ex, shaft: 1 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});

// tear state as a pure function of t: intact until the pull (7.55-8.45 s), then torn
function tearAt(t) { const k = E.outCubic(prog(t, 7.55, 8.45)); return { L: TUN.userData.TEAR_MAX * 0.92 * k, open: Math.min(1, k * 1.3) }; }

function placeTunic(t, i, s) {
  const mode = s.tun;
  TUN.visible = mode === 'held' || (mode === 'worn' && i === 3) || mode === 'hang';
  FOLD.visible = mode === 'folded';
  ROD.visible = CORD.visible = mode === 'hang';
  GRAZE.intensity = 0;
  // the hook and the end are after the event: torn. During the race it is whole until her pull.
  const tr = i <= 1 || i >= 5 ? { L: TUN.userData.TEAR_MAX * 0.92, open: 1 } : tearAt(t);
  TUN.userData.tear(tr.L, tr.open);
  TUN.rotation.set(0, 0, 0); TUN.scale.setScalar(1);
  if (mode === 'held') { TUN.position.set(...T_HELD.pos); TUN.rotation.y = T_HELD.ry; TUN.userData.glow(i === 11 ? 1 : 0.85); }
  if (mode === 'worn') {
    // on his back: he faces +x, so the back panel faces -x
    const x = manXat(t); TUN.position.set(x - 0.14, 1.5, -3.2); TUN.rotation.y = -Math.PI / 2; TUN.scale.set(0.8, 0.95, 1); TUN.userData.glow(0.15);
  }
  if (mode === 'hang') {
    // shot 6: it turns slowly on its cord from the intact front to the torn back, then hangs still
    const turn = i === 5 ? HANG_FACE + Math.PI * (1 - E.inOutSine(prog(t, 11.75, 13.75))) : HANG_FACE;
    TUN.position.set(...T_HANG.pos); TUN.rotation.y = turn; TUN.userData.glow(i === 7 || i === 8 ? 0.45 : 0.12);
    ROD.position.set(T_HANG.pos[0], T_HANG.pos[1] + 0.005, T_HANG.pos[2]); ROD.rotation.y = turn;
    CORD.position.set(T_HANG.pos[0], T_HANG.pos[1], T_HANG.pos[2]); CORD.scale.set(1, (4.1 - T_HANG.pos[1]) / 2.0, 1);
    if (i === 7 || i === 8) {   // grazing light along the rip, sweeping down its length
      TUN.updateMatrixWorld(true);
      GRAZE.intensity = 14; GRAZE.position.copy(TUN.localToWorld(V(-0.55, -0.15 - 0.2 * prog(t, 15.23, 19.07), 0.18)));
      GRAZE.target.position.copy(TUN.localToWorld(V(0.02, -0.4, 0)));
    }
  }
}

// x of the young man during the race (he hurries toward the doorway and stops on the threshold)
function manXat(t) { const w = Math.min(Math.max(t - RUN0, 0), RUN1 - RUN0); return 0.2 + 1.25 * w; }
function posePeople(t, i) {
  for (const p of Object.values(P)) p.object3d.visible = false;
  const show = (k, x, z, ry, clip, tt, op) => { const p = P[k]; p.object3d.visible = true; p.object3d.position.set(x, 0, z); p.object3d.rotation.y = ry; p.setPose(clip, tt, op); return p; };
  const holder = () => {   // holding the tunic up by the shoulders against the doorway
    const h = show('holder', T_HELD.pos[0] + 0.24, T_HELD.pos[2], -Math.PI / 2, 'stand', t);
    TUN.updateMatrixWorld(true);
    for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
      const tgt = TUN.localToWorld(TUN.userData.shoulder(sx === 1 ? -1 : 1).add(V(0, 0.01, -0.02)));
      K.reach(h, side, tgt, h.object3d.localToWorld(V(sx * 0.5, 0.6, -0.4)));
      K.handAim(h, side, TUN.localToWorld(TUN.userData.shoulder(sx === 1 ? -1 : 1).add(V(0, -0.06, 0.09))), 0); K.flatHand(h, side, 1.5);
    }
  };
  if (i === 0 || i === 11) holder();
  if (i === 1) {
    holder();
    const w = show('witness', 2.1, -2.15, Math.PI / 2 + 0.25, 'stand', t + 2);
    // his right arm rises to point at the tear
    const k = E.inOutCubic(prog(t, 2.9, 3.6));
    w.object3d.updateMatrixWorld(true);
    const h0 = w.bones('RightHand').getWorldPosition(V()), tip = V(3.0, 1.45, -2.95);
    K.reach(w, 'Right', h0.clone().lerp(tip, k * 0.85), V(2.3, 0.4, -1.4));
    show('husband', 5.35, -2.45, -Math.PI / 2 - 0.15, 'stand', t + 5);
    show('hh', 5.55, -3.85, -Math.PI / 2 + 0.1, 'stand', t + 9);
  }
  if (i >= 2 && i <= 4) {
    // he hurries to the doorway; she follows and catches his back; they stop when they see the husband
    const x = manXat(t), walking = t < RUN1;
    const m = show('man', x, -3.2, Math.PI / 2, walking ? 'walk' : 'stand', walking ? t * 1.25 : t);
    const wx = x - 0.48 - 0.3 * (1 - prog(t, RUN0, 7.0));
    const wo = show('woman', wx, i === 2 ? -2.85 : -3.05, Math.PI / 2, walking ? 'walk' : 'stand', walking ? t * 1.25 + 0.4 : t);
    if (i >= 3 || t > 6.6) {
      // her right hand grips the cloth at the top of the tear and pulls it down
      TUN.updateMatrixWorld(true);
      const grip = i >= 3 ? TUN.localToWorld(TUN.userData.tearTip().add(V(0, 0.02, 0.02))) : m.bones('Spine2').getWorldPosition(V()).add(V(-0.16, 0, 0));
      const k = i >= 3 ? 1 : E.inOutCubic(prog(t, 6.6, 7.2));
      wo.object3d.updateMatrixWorld(true);
      const h0 = wo.bones('RightHand').getWorldPosition(V());
      K.reach(wo, 'Right', h0.clone().lerp(grip, k), wo.object3d.localToWorld(V(-0.5, 0.2, -0.3)));
      K.handAim(wo, 'Right', grip.clone().add(V(0.06, -0.06, 0)), 0); K.flatHand(wo, 'Right', 1.7);
    }
    if (i === 4) show('husband', 5.1, -3.0, -Math.PI / 2, 'stand', t + 5);
  }
}
