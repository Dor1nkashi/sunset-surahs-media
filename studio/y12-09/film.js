// y12-09 "He Asked for One Favor. The Man Forgot" (Yusuf 12:42). The prison cell: its heavy door opens
// on daylight, the freed man walks out, the door shuts; then a locked camera watches years pass in the
// sweep of the window light. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { prison } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 28.31;
// cell geometry (sets_yusuf.js prison): walls x = +-2.1, back wall z = -2.6, front z = 2.6; window in the back
// wall at x 0.6, y 2.95; door in the right wall (x = 2.1) at z = 1.2, 0.95 x 1.9
const DX = 2.1, DZ = 1.2, WIN = [0.6, 2.95, -2.6];
const SEAT = [-1.55, -0.2];                    // where the young man sits, by the left wall
const CUP = [0.35, 0.0, -1.0];                 // the cup on the floor, in the window light

const C = {
  gate_a:  { pos: [-1.2, 1.45, 1.55], look: [DX, 1.1, DZ], fov: 46 },
  gate_b:  { pos: [-0.2, 1.4, 1.5], look: [DX, 1.05, DZ], fov: 44 },
  gate_c:  { pos: [0.6, 1.35, 1.45], look: [DX + 1, 1.0, DZ], fov: 40 },
  two:     { pos: [-2.0, 1.45, -2.3], look: [-0.6, 0.75, 0.6], fov: 64 },
  step_a:  { pos: [-0.6, 1.4, 0.1], look: [DX, 1.05, DZ], fov: 40 },
  step_b:  { pos: [-0.25, 1.4, 0.35], look: [DX, 1.05, DZ], fov: 38 },
  cup:     { pos: [0.75, 0.42, -0.45], look: [CUP[0], 0.08, CUP[2]], fov: 26 },
  hands_a: { pos: [0.45, 0.95, 1.05], look: [-1.2, 0.75, -0.3], fov: 30 },
  hands_b: { pos: [0.3, 0.93, 0.9], look: [-1.2, 0.75, -0.3], fov: 28 },
  rise:    { pos: [-1.2, 1.3, 1.9], look: [1.4, 0.85, 0.4], fov: 48 },
  close:   { pos: [0.4, 1.4, 0.55], look: [DX, 1.0, DZ], fov: 42 },
  lapse:   { pos: [1.5, 1.45, 2.35], look: [-0.2, 1.35, -1.9], fov: 58 },
  shaft:   { pos: [-0.1, 1.2, 1.5], look: [-2.0, 0.75, -0.1], fov: 38 },
  dust_a:  { pos: [1.0, 1.4, 1.2], look: [-0.5, 1.6, -1.3], fov: 40 },
  dust_b:  { pos: [0.75, 1.42, 0.85], look: [-0.5, 1.6, -1.3], fov: 36 },
  hand:    { pos: [-1.98, 1.5, 0.05], look: [-1.3, 1.12, -0.7], fov: 34 },
};
const SHOTS = [
  { t0: 0.00, t1: 1.71, a: C.gate_a, b: C.gate_b },
  { t0: 1.71, t1: 3.17, a: C.gate_b, b: C.gate_c },
  { t0: 3.17, t1: 4.83, a: C.two },
  { t0: 4.83, t1: 6.16, a: C.step_a, b: C.step_b },
  { t0: 6.16, t1: 7.63, a: C.cup },
  { t0: 7.63, t1: 9.16, a: C.hands_a, b: C.hands_b },
  { t0: 9.16, t1: 11.63, a: C.rise },
  { t0: 11.63, t1: 12.81, a: C.close },
  { t0: 12.81, t1: 14.91, a: C.lapse, lapse: true },
  { t0: 14.91, t1: 18.33, a: C.lapse, lapse: true },
  { t0: 18.33, t1: 19.94, a: C.lapse, lapse: true },
  { t0: 19.94, t1: 21.36, a: C.shaft },
  { t0: 21.36, t1: 24.49, a: C.dust_a, b: C.dust_b },
  { t0: 24.49, t1: 28.31, a: C.hand },
];

let GOLD, SET, ST, CAP, YM, FM, CUPM, OUT, DUST, SUNDIR = [], SUN, SHAFT, FILL;
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await prison({ time: 'morning' });
    const S = SET.scene; SUN = SET.props.sun; SHAFT = SET.props.shaft;
    // cut the doorway: the set's right wall is one solid panel; rebuild it in three pieces around the door
    const rw = SET.group.children.find((o) => o.isMesh && Math.abs(o.position.x - DX) < 0.01 && Math.abs(o.rotation.y + Math.PI / 2) < 0.01 && Math.abs(o.position.z) < 0.01);
    if (rw) { rw.visible = false; const sd = rw.material, dw = 1.0, dh = 1.95, CD = 5.2, CH = 3.8;
      const piece = (w, h, z, y) => { const pn = W.panel(w, h, sd, { dens: 22 }); pn.position.set(DX, y, z); pn.rotation.y = -Math.PI / 2; pn.receiveShadow = true; S.add(pn); };
      const z0 = -CD / 2, z1 = DZ - dw / 2, z2 = DZ + dw / 2, z3 = CD / 2;
      piece(z1 - z0, CH, (z0 + z1) / 2, CH / 2); piece(z3 - z2, CH, (z2 + z3) / 2, CH / 2); piece(dw, CH - dh, DZ, dh + (CH - dh) / 2);
      // the wall's thickness around the opening (reveal), so the doorway reads as cut through stone
      for (const [w, h, y, z] of [[0.5, dh, dh / 2, z1 - 0.02], [0.5, dh, dh / 2, z2 + 0.02], [0.5, 0.04, dh, DZ]]) { const b = W.rbox(w, h, z === DZ ? dw : 0.04, sd, { r: 0.01, centre: true }); b.position.set(DX + 0.25, y, z); S.add(b); } }
    // daylight beyond the door: a sunlit yard floor and a bright wall
    const mud = await W.pbr('brown_mud_dry', { tile: 2.0, res: 1024 }), plaster = await W.pbr('clay_plaster', { tile: 2.2, tint: 0xf0dcc0, res: 1024 });
    OUT = new THREE.Group();
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mud); W.boxUV(fl.geometry); fl.rotation.x = -Math.PI / 2; fl.position.set(DX + 5.05, 0.001, DZ); OUT.add(fl);
    const wl = W.rbox(0.5, 4, 10, plaster, { r: 0.05 }); wl.position.set(DX + 6, 0, DZ); OUT.add(wl);
    const day = new THREE.PointLight(0xfff0d8, 60, 14, 1.4); day.position.set(DX + 3, 3.2, DZ); OUT.add(day);
    S.add(OUT);
    // the cup (a plain clay drinking cup) on the floor in the window light
    const clay = new THREE.MeshStandardMaterial({ color: 0x9a5a36, roughness: 0.7 });
    CUPM = W.lathe([[0.001, 0], [0.034, 0], [0.036, 0.008], [0.012, 0.016], [0.009, 0.05], [0.014, 0.06], [0.04, 0.075], [0.05, 0.11], [0.046, 0.112], [0.036, 0.08], [0.001, 0.07]], W.brassMat(), { seg: 64 }); CUPM.position.set(...CUP); S.add(W.shadows(CUPM));
    DUST = K.dustMotes({ centre: [0.1, 1.5, -1.3], size: [1.6, 2.6, 2.0], count: 500, seed: 19, px: 0.007, op: 0.6, fall: 0.01 }); S.add(DUST);
    FILL = new THREE.PointLight(0xffd8b0, 0, 6, 2); FILL.position.set(-0.8, 1.0, 0.6); S.add(FILL);
    // the golden patch of window sun, a narrow beam along the sun's path (the shaft the hand is placed in)
    GOLD = new THREE.SpotLight(0xffb850, 0, 12, 0.11, 0.5, 1.0); S.add(GOLD, GOLD.target);
    const PP = await K.people();
    YM = PP.make({ kind: 'man', outfit: 'thobe', palette: { robe: '#c9b996', wrap: '#ece4d2', sash: '#27345a', cloak: '#3f3026', trousers: '#c2ae8c' }, beard: 'none', headwear: 'none', seed: 12 });
    FM = PP.make({ kind: 'man', outfit: 'worker', palette: { robe: '#8e8a80', wrap: '#cfc6b4', sash: '#5a4a3a', cloak: '#6b645a', trousers: '#a89c88' }, beard: 'short', headwear: 'wrap', seed: 27 });
    S.add(YM.object3d, FM.object3d);
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    world(t, i);
    people(t, i);
    let cam = K.camLerp(s.a, s.b, E.inOutSine(p));
    cam = K.breathe(cam, t, s.lapse ? 0 : 0.002, 41 + i);
    const ex = SET.exposure * [0.7, 0.7, 1, 0.8, 1, 1.15, 1, 0.9, 1, 1, 1, 1, 1, 1.05][i] * (s.lapse ? lapseExposure(t) : 1);
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});

// the time-lapse: years compressed into ~7 s. Each "day" the sun sweeps across the window; the season sets
// the sun's height and colour. lapse(t) -> { day phase 0..1, season 0..1 }
const L0 = 12.81, L1 = 19.94, L2 = 21.0;
function lapse(t) {
  // days per second slows to a stop at L2: integrate a falling rate (closed form)
  const T = Math.min(t, L2) - L0, Tm = L2 - L0, days = 9 * (T - T * T / (2 * Tm));
  return { day: days % 1, years: days / 3.2, season: (days / 3.2) % 1 };
}
const lapseExposure = (t) => 1;
const GAZ = 0.795, GEL = 0.566;          // the golden afternoon sun: its shaft passes through the hand (shot 14)
function setSun(azim, elev, col, inten) {
  const win = V(...WIN), dir = V(Math.sin(azim) * Math.cos(elev), Math.sin(elev), -Math.cos(azim) * Math.cos(elev));
  SUN.position.copy(win.clone().add(dir.clone().multiplyScalar(40))); SUN.target.position.copy(win.clone().sub(dir.clone().multiplyScalar(3)));
  SUN.color.set(col); SUN.intensity = inten;
  // the shaft follows the sun through the window
  SHAFT.position.copy(win); SHAFT.quaternion.setFromUnitVectors(V(0, -1, 0), dir.clone().negate());
}
function world(t, i) {
  // the door: open (daylight) for the first shots; shut with a shove in shot 8 and from then on
  const open = t < 11.75 ? 1 : 1 - E.inCubic(prog(t, 11.75, 12.45));
  SET.props.door.leaf.rotation.y = -1.35 * open;
  OUT.visible = true;
  CUPM.visible = i <= 6;
  FILL.intensity = i === 5 || i === 6 ? 1.6 : 0;
  // sun: morning (fixed) before the lapse; sweeping days during it; a steady golden shaft after
  if (t < L0) setSun(-0.3, 0.6, 0xfff0d8, 7);
  else if (t < L2) {
    const { day, season } = lapse(t), summer = 0.5 + 0.5 * Math.cos(season * Math.PI * 2);
    const az = -1.1 + 2.2 * day, el = (0.35 + 0.35 * summer) * Math.sin(Math.PI * day) + 0.05;
    const night = Math.sin(Math.PI * day);
    const col = new THREE.Color(0xb8c4d8).lerp(new THREE.Color(0xfff2d8), summer);
    // settle on the golden afternoon position as the lapse slows
    const k = prog(t, 19.4, L2), gaz = GAZ, gel = GEL;
    setSun(az + (gaz - az) * k, el + (gel - el) * k, k > 0 ? col.lerp(new THREE.Color(0xffc070), k).getHex() : col.getHex(), 7 * (0.25 + 0.75 * night) * (1 - k) + 7 * k);
  } else setSun(GAZ, GEL, 0xffc070, 7);
  SHAFT.userData.update(t, t > L0 ? (i >= 11 ? 3.2 : 1.6) : 1);
  const g = i >= 11 ? 1 : 0, win = V(...WIN), sd = SUN.position.clone().sub(win).normalize();
  GOLD.intensity = 40 * g; GOLD.position.copy(win.clone().add(sd.clone().multiplyScalar(0.3))); GOLD.target.position.copy(win.clone().sub(sd.multiplyScalar(4)));
  DUST.userData.update(t, i >= 11 ? 1 : 0.4);
}

function people(t, i) {
  YM.object3d.visible = i >= 2 && i <= 6 || i === 13;
  FM.object3d.visible = i <= 3 || i === 6;
  // freed man: walks out through the door (shots 1-2), stands by the door (3), steps toward it (4); walks away (7)
  if (FM.object3d.visible) {
    const sp = FM.speed('walk');
    let x, z, ry = Math.PI / 2, walk = true, tt = t;
    if (i <= 1) { x = 0.9 + sp * t; z = DZ; }                              // walking out into the light
    else if (i === 2) { x = 0.95; z = 0.85; ry = Math.PI / 2 - 0.3; walk = false; }       // by the door, turned to the young man
    else if (i === 3) { const w = Math.min(t - 4.83, 1.0); x = 0.95 + 0.45 * w; z = 0.85 + 0.2 * w; ry = Math.PI / 2 - 0.3; walk = t < 5.83; }
    else { const w = t - 9.16; x = 0.0 + sp * w; z = 0.4 + 0.35 * w; ry = Math.PI / 2 - 0.4; }
    FM.object3d.position.set(x, 0, z); FM.object3d.rotation.y = ry;
    FM.setPose(walk ? 'walk' : 'stand', tt);
  }
  if (YM.object3d.visible) {
    YM.object3d.position.set(SEAT[0], 0, SEAT[1]); YM.object3d.rotation.y = Math.PI / 2 - 0.25;
    YM.setPose('kneel', t + 4);
    YM.object3d.updateMatrixWorld(true);
    // shot 6: hands explaining (a slow open gesture); shot 7: the right hand rises toward the man leaving;
    // shot 14: a hand placed in the golden shaft
    const B = (n) => YM.bones(n).getWorldPosition(V());
    if (i === 5) {
      for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
        const g = Math.sin((t - 7.63) * 2.2 + (sx > 0 ? 0 : 1.3));
        const tgt = YM.object3d.localToWorld(V(sx * (0.2 + 0.05 * g), 0.74 + 0.05 * g, 0.42));
        K.reach(YM, side, tgt, YM.object3d.localToWorld(V(sx * 0.6, 0.4, -0.2)));
        K.flatHand(YM, side, 0.4); K.handAim(YM, side, tgt.clone().add(YM.object3d.localToWorld(V(sx * 0.05, 0.08, 0.1)).sub(YM.object3d.localToWorld(V(0, 0, 0)))), 0);
      }
    }
    if (i === 6) {
      const k = E.inOutCubic(prog(t, 9.4, 10.3)), h0 = B('RightHand');
      const tgt = YM.object3d.localToWorld(V(-0.2, 1.25, 0.5));
      K.reach(YM, 'Right', h0.clone().lerp(tgt, k), YM.object3d.localToWorld(V(-0.6, 0.6, -0.2)));
      K.flatHand(YM, 'Right', 1 - 0.7 * k);
    }
    if (i === 13) {
      const k = E.inOutCubic(prog(t, 24.8, 25.9)), h0 = B('RightHand');
      const tgt = V(-1.42, 1.15, -0.62);
      K.reach(YM, 'Right', h0.clone().lerp(tgt, k), YM.object3d.localToWorld(V(-0.6, 0.3, -0.2)));
      K.flatHand(YM, 'Right', 1 - 0.8 * k); K.handAim(YM, 'Right', tgt.clone().add(V(-0.06, 0.02, -0.14)), Math.PI / 2 * k);
    }
  }
}
