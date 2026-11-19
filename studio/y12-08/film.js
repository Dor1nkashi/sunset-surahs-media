// y12-08 "He Chose Prison. On Purpose" (Yusuf 12:33-34). A lane of latticed houses at late afternoon,
// ending at the prison wall; he walks to the prison door instead of away. Light fades to torchlit dusk.
// No women are shown: the pressure is the lane itself (lamplit lattices, shadows that crawl).
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { egypt_market } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
import { buildLane, GATE_Z, LANE_W, DOOR } from './lane.js';
const { THREE } = W;
const { prog, E } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 32.39;
const Z0 = -1.0;                         // where he stops first (mid-lane)
let ZS = -6.6;                           // where he stops by the lit lattice (set from the window found)
const DOORF = GATE_Z - 0.06;             // the door's outer face
const TORCH = [1.25, 2.42, GATE_Z + 0.34];

let SET, ST, CAP, LANE, MAN, SWING, SUN0, ENV0, INT;
const C = {};
function cams() {
  Object.assign(C, {
    door_side: { pos: [1.35, 1.35, GATE_Z + 2.0], look: [0.15, 1.0, DOORF], fov: 34 },
    bolt_a:    { leaf: true, pos: [0.25, 0.08, 0.5], look: [-0.02, 0.0, 0.02], fov: 24 },
    bolt_b:    { leaf: true, pos: [0.22, 0.07, 0.38], look: [-0.02, 0.0, 0.02], fov: 22 },
    lat_a:     { pos: [1.2, 2.05, 3.2], look: [-1.8, 2.9, 1.6], fov: 42 },
    lat_b:     { pos: [1.2, 2.05, -0.6], look: [-1.8, 2.9, -2.2], fov: 42 },
    stop_a:    { pos: [0.35, 1.6, Z0 + 4.2], look: [0.0, 1.3, Z0 - 3], fov: 40 },
    stop_b:    { pos: [0.3, 1.58, Z0 + 3.1], look: [0.0, 1.3, Z0 - 3], fov: 40 },
    follow_a:  { pos: [1.1, 1.55, Z0 + 1.2], look: [-0.2, 1.4, Z0 - 0.5], fov: 44 },
    follow_b:  { pos: [-0.5, 1.7, Z0 + 1.4], look: [0.1, 1.6, GATE_Z], fov: 44 },
    over:      { pos: [0.5, 1.75, Z0 - 0.6], look: [0.0, 1.5, GATE_Z], fov: 42 },
    hands_a:   { pos: [0.55, 1.5, ZS + 1.7], look: [-0.05, 1.25, ZS], fov: 38 },
    crawl_a:   { pos: [0.35, 1.62, ZS + 1.05], look: [-0.05, 1.45, ZS], fov: 36 },
    crawl_b:   { pos: [0.3, 1.62, ZS + 0.8], look: [-0.05, 1.45, ZS], fov: 34 },
    torch:     { pos: [-0.55, 2.2, GATE_Z + 2.6], look: [TORCH[0], TORCH[1], TORCH[2]], fov: 22 },
    net_a:     { pos: [0.45, 1.55, ZS + 2.0], look: [-0.05, 1.5, ZS], fov: 40 },
    net_b:     { pos: [0.4, 1.55, ZS + 1.55], look: [-0.05, 1.5, ZS], fov: 38 },
    tst_a:     { pos: [0.1, 1.95, GATE_Z + 3.4], look: [TORCH[0] - 0.4, TORCH[1] - 0.3, TORCH[2]], fov: 30 },
    tst_b:     { pos: [0.45, 2.15, GATE_Z + 1.9], look: [TORCH[0] - 0.2, TORCH[1] - 0.1, TORCH[2]], fov: 28 },
    hand_back: { pos: [0.5, 1.6, ZS + 0.9], look: [0.2, 1.25, ZS - 0.3], fov: 34 },
    close_a:   { pos: [0.85, 1.45, GATE_Z + 3.2], look: [0.0, 1.05, DOORF], fov: 38 },
    close_b:   { pos: [0.8, 1.45, GATE_Z + 2.8], look: [0.0, 1.05, DOORF], fov: 37 },
    palm:      { pos: [0.55, 1.55, GATE_Z - 3.05], look: [0.12, 1.35, GATE_Z - 1.65], fov: 30 },
  });
}
const SHOTS = [
  { t0: 0.00, t1: 1.35, a: 'door_side' },
  { t0: 1.35, t1: 2.61, a: 'bolt_a', b: 'bolt_b' },
  { t0: 2.61, t1: 5.03, a: 'lat_a', b: 'lat_b', ease: E.linear },
  { t0: 5.03, t1: 7.20, a: 'stop_a', b: 'stop_b', ease: E.outCubic },
  { t0: 7.20, t1: 9.34, a: 'follow_a', b: 'follow_b', ease: E.inOutSine },
  { t0: 9.34, t1: 11.74, a: 'over' },
  { t0: 11.74, t1: 14.28, a: 'hands_a' },
  { t0: 14.28, t1: 16.13, a: 'crawl_a', b: 'crawl_b', ease: E.inOutSine },
  { t0: 16.13, t1: 18.06, a: 'torch' },
  { t0: 18.06, t1: 19.88, a: 'net_a', b: 'net_b', ease: E.inOutSine },
  { t0: 19.88, t1: 22.54, a: 'tst_a', b: 'tst_b', ease: E.inOutSine },
  { t0: 22.54, t1: 24.54, a: 'bolt_b' },
  { t0: 24.54, t1: 26.13, a: 'hand_back' },
  { t0: 26.13, t1: 29.40, a: 'close_a', b: 'close_b', ease: E.inOutSine },
  { t0: 29.40, t1: 32.39, a: 'palm' },
];

// his walk: stands at Z0 until 7.35, walks to ZS by 11.6, stays there; at the end he is inside the gate
const WALK0 = 7.35;
let WALK1 = 11.6;
function manZ(t) { return t < WALK0 ? Z0 : t < WALK1 ? Z0 + (ZS - Z0) * ((t - WALK0) / (WALK1 - WALK0)) : ZS; }

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await egypt_market({ time: 'golden' });
    const S = SET.scene;
    LANE = await buildLane(S, { seed: 8 });
    // his stopping place: by the lit lattice window on the left closest to z = -6.6
    const wl = LANE.windows.filter((w) => w.side < 0 && w.wz < -4 && w.wz > -11).sort((a, b) => Math.abs(a.wz + 6.6) - Math.abs(b.wz + 6.6))[0];
    if (wl) ZS = wl.wz + 0.35;
    // the swinging lamp inside that window: its light falls through the lattice onto him
    SWING = new THREE.SpotLight(0xffb060, 0, 9, 0.55, 0.25, 1.4); SWING.castShadow = true; SWING.shadow.mapSize.set(2048, 2048); SWING.shadow.bias = -0.0008; SWING.shadow.radius = 2;
    SWING.userData.base = V(-(LANE_W / 2 + 0.75), (wl ? wl.wy : 2.4) + 0.75, wl ? wl.wz : ZS);
    S.add(SWING, SWING.target);
    if (wl) wl.lamp.userData.on = false;
    // a torch inside the passage, for the last shot
    const tf = W.flame({ h: 0.36, w: 0.2, seed: 9, inten: 5, light: 2.6, dist: 7 }); tf.position.set(-0.85, 2.0, GATE_Z - 2.2); S.add(tf); LANE.inTorch = tf;
    const br = W.rbox(0.05, 0.25, 0.05, W.ironMat(), { r: 0.01 }); br.position.set(-0.88, 1.75, GATE_Z - 2.2); S.add(br);
    // hide the market square props that sit beyond the prison wall
    for (const k of ['block', 'scale', 'coins']) if (SET.props[k]) SET.props[k].visible = false;
    // put the bolt on the leaf so it travels with the door
    const leaf = LANE.door.leaf; leaf.updateMatrixWorld(true); leaf.attach(LANE.bolt);
    SUN0 = SET.atmo.sun.intensity; ENV0 = S.environmentIntensity;
    // Yusuf as a young man
    const PP = await K.people();
    MAN = PP.make({ kind: 'man', outfit: 'thobe', palette: { robe: '#e4d9c2', wrap: '#ece4d2', sash: '#27345a', cloak: '#3f3026', trousers: '#c2ae8c' }, beard: 'none', headwear: 'none', seed: 12 });
    S.add(MAN.object3d);
    WALK1 = WALK0 + Math.abs(ZS - Z0) / Math.max(0.6, MAN.speed('walk'));
    cams();
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    world(t, i);
    poseMan(t, i);
    const A = C[s.a], B = s.b ? C[s.b] : null;
    let cam = K.camLerp(A, B, (s.ease || E.inOutSine)(p));
    if (A.leaf) { const L = LANE.door.leaf; L.updateMatrixWorld(true); const o = LANE.bolt.position; cam = { ...cam, pos: L.localToWorld(V(...cam.pos).add(o)).toArray(), look: L.localToWorld(V(...cam.look).add(o)).toArray() }; }
    if (s.a === 'follow_a' || s.a === 'over') { const mz = manZ(t); cam = { ...cam, pos: [cam.pos[0], cam.pos[1], cam.pos[2] + (s.a === 'follow_a' ? mz - Z0 : 0)], look: s.a === 'follow_a' ? [cam.look[0], cam.look[1], cam.look[2] + (mz - Z0) * (1 - p)] : cam.look }; }
    cam = K.breathe(cam, t, 0.0025, 31 + i);
    // light fades from late afternoon to torchlit dusk over the film
    const dusk = prog(t, 2.0, 30.0);
    const ex = SET.exposure * (1.0 - 0.25 * dusk) * (i === 14 ? 0.9 : 1);
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});

function world(t, i) {
  const S = SET.scene, dusk = prog(t, 2.0, 30.0);
  SET.atmo.sun.intensity = SUN0 * (1 - 0.9 * dusk);
  S.environmentIntensity = ENV0 * (1 - 0.7 * dusk);
  // lattice windows: lamplight flickers (pure function of t)
  const n = W.noise2(17);
  for (const w of LANE.windows) { const f = 0.75 + 0.25 * n(t * w.rate * 3, w.ph); w.glow.material.color.setRGB(1.0 * f * (0.5 + 0.6 * dusk), 0.55 * f * (0.5 + 0.6 * dusk), 0.2 * f * (0.5 + 0.6 * dusk)); w.lamp.intensity = w.lamp.userData.on === false ? 0 : 3 * f * (0.3 + dusk); }
  // the swinging lamp in his window: a slow pendulum; its lattice shadow crawls over him, then lifts (shot 10)
  const sw = 0.28 * Math.sin(t * 1.3), lift = prog(t, 18.2, 19.8);
  const b = SWING.userData.base; SWING.position.set(b.x, b.y + 0.05 * Math.cos(t * 2.6), b.z + sw);
  SWING.target.position.set(0.0, 1.45 + 1.6 * E.inOutSine(lift), ZS + 0.1);
  SWING.intensity = (i >= 6 && i <= 9) || i === 12 ? 26 * (1 - 0.8 * lift * (i === 9 ? 1 : 0)) : 0;
  // torches: flicker that steadies in shot 11 (the light intensity jitter is damped)
  const steady = prog(t, 19.9, 21.8), base = 0.4 + 0.6 * dusk;
  for (const T of LANE.torches) T.flame.userData.update(t * (1 - 0.6 * steady), base * (1 + (1 - steady) * 0.18 * Math.sin(t * 17 + T.group.position.x)));
  LANE.inTorch.userData.update(t, 1);
  // the door: closed with the bolt home; the bolt slides back in shot 1; open from shot 3 on (it waits);
  // it swings closed behind him in shot 14
  LANE.bolt.userData.set(1 - E.inOutCubic(prog(t, 0.35, 0.95)));
  const open = t < 2.61 ? 0 : t < 26.6 ? 1 : 1 - E.inOutCubic(prog(t, 26.6, 28.6));
  LANE.door.leaf.rotation.y = 1.25 * open;
  LANE.inLight.intensity = 6 * (0.3 + 0.7 * open);
}

function poseMan(t, i) {
  const vis = i === 3 || i === 4 || i === 5 || i === 6 || i === 7 || i === 9 || i === 12 || i === 14;
  MAN.object3d.visible = vis; if (!vis) return;
  if (i === 14) {             // inside the gate: his open palm held out in the torchlight, the door behind
    MAN.object3d.position.set(0.05, 0, GATE_Z - 1.35); MAN.object3d.rotation.y = 0;
    MAN.setPose('stand', t);
    MAN.object3d.updateMatrixWorld(true);
    const tgt = V(0.2, 1.3, GATE_Z - 1.0);
    // facing the door (+z), right hand on world -x side
    const sh = MAN.bones('RightArm').getWorldPosition(V());
    K.reach(MAN, 'Right', tgt.clone().setX(sh.x + 0.05), V(sh.x - 0.4, 0.6, GATE_Z - 1.6));
    K.flatHand(MAN, 'Right', 0.25); K.handAim(MAN, 'Right', tgt.clone().setX(sh.x + 0.05).add(V(0, 0.02, 0.15)), PALM_ROLL);
    return;
  }
  const z = manZ(t), walking = t > WALK0 && t < WALK1;
  MAN.object3d.position.set(0.0, 0, z); MAN.object3d.rotation.y = Math.PI;
  MAN.setPose(walking ? 'walk' : 'stand', walking ? (t - WALK0) : t + 2);
  // open hands lifted slightly away from the body (shots 4, 7, 8, 13)
  const lift = i === 3 ? E.inOutCubic(prog(t, 5.6, 6.6)) : i === 6 || i === 7 || i === 9 ? 1 : i === 12 ? 0.6 + 0.4 * E.inOutCubic(prog(t, 24.6, 25.4)) : 0;
  if (lift > 0) {
    MAN.object3d.updateMatrixWorld(true);
    for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
      // facing -z: his left hand is at world -x... figure faces +z with left at +x, rotated by PI
      const h0 = MAN.bones(side + 'Hand').getWorldPosition(V());
      const tgt = MAN.object3d.localToWorld(V(sx * 0.36, 1.02, 0.28));
      K.reach(MAN, side, h0.clone().lerp(tgt, lift), MAN.object3d.localToWorld(V(sx * 0.6, 1.0, -0.4)));
      K.flatHand(MAN, side, 1 - 0.7 * lift);
      K.handAim(MAN, side, h0.clone().lerp(tgt, lift).add(MAN.object3d.localToWorld(V(sx * 0.06, 0, 0.12)).sub(MAN.object3d.localToWorld(V(0, 0, 0)))), PALM_ROLL * sx);
    }
  }
}
const PALM_ROLL = 0;
