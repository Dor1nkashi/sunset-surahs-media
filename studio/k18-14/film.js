// k18-14 "He Built a Wall of Iron, Then Gave the Credit Away" (Al-Kahf 18:95, 18:98). mountain_pass_barrier, golden.
// Molten copper on iron; villagers at the mouth of the pass offer a bag of coins; the ruler (back and hand only) pushes it
// back; villagers carry iron; bellows and fire; the blocks travel up the supply track and rise course by course; the
// finished wall from below; his hand flat on the cooled metal; the seam cools, then glows again (loop). Pure in t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { mountain_pass_barrier } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 33.39;

let FILL;
let ST, SET, CAP, HT, RULER, VILL = [], WORK = [], BAG, STONE, CARRY = [], C = {}, SHOTS, BELLOWS_BODY, SITE;
const RUL = [0.5, 17.6], ST0 = [0.5, 19.0];          // the ruler, the flat stone between him and the villagers

// story state
const buildAt = (t) => (t < 3.73 ? 1 : t < 16.62 ? 0.04 : t < 19.53 ? lerp(0.08, 0.92, E.inOutSine(prog(t, 16.62, 19.53))) : 1);
const pourAt = (t, i) => (i === 0 || i === 1 ? 0.3 : i === 9 ? 0.35 : i === 10 || i === 11 ? 1 : i === 13 ? lerp(0.4, 1, E.inOutSine(prog(t, 28.63, 30.4))) : i === 14 ? lerp(1, 0.32, E.inOutSine(prog(t, 31.6, D))) : 0.3);
// the coin bag on the stone: pushed toward the ruler (5.4-6.4), pushed back toward the villagers (9.0-10.2)
const bagZ = (t) => ST0[1] + 0.35 - 0.5 * E.inOutCubic(prog(t, 5.4, 6.4)) + 0.62 * E.inOutCubic(prog(t, 9.0, 10.2));

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await mountain_pass_barrier({ time: 'golden', build: 0.04, pour: 0.3 });
    const S = SET.scene, P = SET.props; HT = P.terrain.heightAt;
    SITE = P.fire.position.clone();
    BELLOWS_BODY = P.bellows.children[0];
    // the flat stone and the coin bag
    const rock = await W.pbr('rustic_stone_wall', { tile: 0.8, res: 1024, tint: 0xd8ccb8 });
    STONE = W.rbox(1.1, 0.42, 0.9, rock, { r: 0.08, seg: 3 }); STONE.position.set(ST0[0], HT(...ST0) - 0.05, ST0[1]); W.shadows(STONE); S.add(STONE);
    const hs = await W.pbr('hessian_230', { tile: 0.3, tint: 0xa88a62, res: 1024 });
    BAG = W.sack(hs, { w: 0.15, h: 0.17, seed: 3 }); W.shadows(BAG); S.add(BAG);
    // people
    const PP = await K.people();
    RULER = PP.make({ kind: 'man', outfit: 'noble', palette: { robe: '#3a3530', cloak: '#2a2622', wrap: '#d8d0c0', sash: '#5a4a38', trousers: '#4a4440', trim: '#6a5a40', skin: '#9a6a48' }, headwear: 'wrap', beard: 'full', seed: 90 });
    S.add(RULER.object3d);
    const pals = ['earth', 'sand', 'olive', 'indigo', 'rust', 'cream'], kinds = ['man', 'elder', 'man', 'woman', 'man', 'elder'];
    for (let i = 0; i < 6; i++) { const f = PP.make({ kind: kinds[i], outfit: kinds[i] === 'woman' ? 'abaya' : 'thobe', palette: pals[i], seed: 140 + i, detail: 0.6 }); S.add(f.object3d); VILL.push(f); }
    for (let i = 0; i < 4; i++) { const f = PP.make({ kind: 'man', outfit: 'worker', palette: ['earth', 'rust', 'sand', 'olive'][i], seed: 150 + i, detail: 0.6 }); S.add(f.object3d); WORK.push(f); }
    for (const f of [RULER, ...VILL, ...WORK]) f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } });
    const iron = new THREE.MeshStandardMaterial({ color: 0x2e2a28, roughness: 0.55, metalness: 0.8 });
    for (let k = 0; k < 2; k++) { const b = W.rbox(1.5, 0.38, 0.9, iron, { r: 0.03, seg: 3 }); W.shadows(b); S.add(b); CARRY.push(b); }
    // cameras
    const rg = HT(...RUL), sg = HT(...ST0) + 0.37, si = SITE;
    Object.assign(C, {
      pour:    SET.cameras.pour,
      seam_a:  { pos: [1.2, 1.5, 1.6], look: [0.5, 1.3, 0.5], fov: 30 },
      seam_b:  { pos: [0.9, 1.45, 1.25], look: [0.3, 1.3, 0.5], fov: 28 },
      mouth:   { pos: [0.6, HT(0.6, 28.5) + 1.7, 28.5], look: [-0.2, HT(0, 20) + 2.5, 12], fov: 46 },
      bag_a:   { pos: [ST0[0] + 1.05, sg + 0.45, ST0[1] + 0.2], look: [ST0[0], sg + 0.1, ST0[1] + 0.25], fov: 34 },
      bag_b:   { pos: [ST0[0] + 0.9, sg + 0.4, ST0[1] + 0.15], look: [ST0[0], sg + 0.1, ST0[1] + 0.2], fov: 32 },
      gap_a:   { pos: [0, 2.2, 46], look: [0, 4, 0], fov: 44 },
      gap_b:   { pos: [0, 2.2, 44], look: [0, 22, 0], fov: 44 },
      back:    { pos: [RUL[0] - 0.55, rg + 0.75, RUL[1] - 2.2], look: [RUL[0] + 0.1, rg + 1.0, ST0[1] + 3], fov: 42 },
      carry_a: { pos: [0.6, HT(0.6, 19.5) + 2.6, 19.5], look: [0.6, HT(0.6, 12) + 0.6, 12], fov: 44 },
      carry_b: { pos: [0.6, HT(0.6, 18.0) + 2.6, 18.0], look: [0.6, HT(0.6, 10) + 0.6, 10], fov: 44 },
      fire:    { pos: [si.x + 1.6, si.y + 1.3, si.z + 3.2], look: [si.x - 0.9, si.y + 0.35, si.z], fov: 42 },
      stack_a: { pos: [-3, 1.5, 22], look: [0, 2, 0], fov: 50 },
      stack_b: { pos: [-3, 6.5, 24], look: [0, 6.5, 0], fov: 50 },
      up:      { pos: [0.8, 0.35, 3.2], look: [0.0, 9.0, 0], fov: 64 },
      palm:    { pos: [-0.3, 1.5, 1.4], look: [0.35, 1.32, 0.52], fov: 32 },
      bagm:    { pos: [ST0[0] - 0.6, sg + 0.3, ST0[1] - 0.15], look: [ST0[0], sg + 0.05, ST0[1] + 0.2], fov: 32 },
      belh:    { pos: [si.x - 0.3, si.y + 1.0, si.z + 2.0], look: [si.x - 1.5, si.y + 0.3, si.z + 0.3], fov: 38 },
      cool:    { pos: [0.75, 1.36, 1.0], look: [0.4, 1.3, 0.5], fov: 24 },
      warm_a:  { pos: [0.8, 1.38, 1.05], look: [0.4, 1.3, 0.5], fov: 24 },
      warm_b:  { pos: [0.7, 1.36, 0.95], look: [0.4, 1.3, 0.5], fov: 23 },
    });
    SHOTS = [
      { t0: 0.00, t1: 1.86, a: C.pour },
      { t0: 1.86, t1: 3.73, a: C.seam_a, b: C.seam_b, ease: E.inOutSine },
      { t0: 3.73, t1: 5.22, a: C.mouth },
      { t0: 5.22, t1: 6.71, a: C.bag_a, b: C.bag_b, ease: E.inOutSine },
      { t0: 6.71, t1: 8.21, a: C.gap_a, b: C.gap_b, ease: E.inOutSine },
      { t0: 8.21, t1: 11.01, a: C.back },
      { t0: 11.01, t1: 13.82, a: C.carry_a, b: C.carry_b },
      { t0: 13.82, t1: 16.62, a: C.fire },
      { t0: 16.62, t1: 19.53, a: C.stack_a, b: C.stack_b, ease: E.inOutSine },
      { t0: 19.53, t1: 22.45, a: C.up },
      { t0: 22.45, t1: 25.36, a: C.palm },
      { t0: 25.36, t1: 27.16, a: C.bagm },
      { t0: 27.16, t1: 28.63, a: C.belh },
      { t0: 28.63, t1: 30.55, a: C.cool },
      { t0: 30.55, t1: D, a: C.warm_a, b: C.warm_b, ease: E.inOutSine },
    ];
    FILL = new THREE.SpotLight(0xffc890, 0, 30, 0.5, 0.6, 1.2); FILL.position.set(4, 4, 7); FILL.target.position.set(0.3, 1.3, 0.5); S.add(FILL, FILL.target);
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t), P = SET.props;
    // the pour rig only in the macro shot
    for (const k of ['crucible', 'stream', 'puddle', 'sparks', 'steam']) P.pour[k].visible = i === 0;
    P.pour.glow.intensity = i === 0 ? 1.2 : 0;
    // bellows breathe (pumped in shots 8 and 13)
    const pump = i === 7 || i === 12 ? 0.5 + 0.5 * Math.sin(t * 5.2) : 0.6; BELLOWS_BODY.scale.z = 0.45 * (0.72 + 0.28 * pump);
    const sg = HT(...ST0) + 0.37;
    BAG.position.set(ST0[0] + 0.02, sg + 0.005, bagZ(t)); BAG.rotation.y = 0.4; BAG.visible = t > 5.0 && t < 28;
    // people
    for (const f of [RULER, ...VILL, ...WORK]) f.object3d.visible = false; CARRY.forEach((c) => (c.visible = false));
    if (i === 2 || i === 5) VILL.forEach((f, k) => {
      const row = k < 3 ? 0 : 1, x = -1.6 + 1.25 * (k % 3) + (row ? 0.6 : 0), z = (i === 5 ? 20.6 : 22.5) + row * 1.1;
      f.object3d.visible = true; f.object3d.position.set(x, HT(x, z), z); f.object3d.rotation.y = Math.PI + (i === 2 ? 0 : 0.05 * (k - 2)); f.setPose('stand', t + k);
      if (i === 2 && (k === 1 || k === 4)) { f.object3d.updateMatrixWorld(true); const sh = f.bones('RightArm').getWorldPosition(V()), tg = sh.clone().add(V(0.05, 0.25, -0.55)), kk = E.inOutCubic(prog(t, 3.9 + 0.3 * k / 4, 4.6));
        K.reach(f, 'Right', f.bones('RightHand').getWorldPosition(V()).lerp(tg, kk), sh.clone().add(V(0.4, -0.4, 0.2))); K.handAim(f, 'Right', tg.clone().add(V(0, 0.2, -0.5)), 0); }
    });
    if (i === 3 || i === 11) {
      // a villager kneels at the stone and pushes the bag forward (shot 4); shot 12: the ruler's hand pushes it away
      const f = i === 3 ? VILL[0] : RULER;
      if (i === 3) { f.object3d.visible = true; f.object3d.position.set(ST0[0] + 0.1, HT(ST0[0], ST0[1] + 0.95), ST0[1] + 0.95); f.object3d.rotation.y = Math.PI; f.setPose('kneel', t); }
      else { f.object3d.visible = true; f.object3d.position.set(RUL[0], HT(...RUL), ST0[1] - 0.85); f.object3d.rotation.y = 0; f.setPose('stand', t); }
      f.object3d.updateMatrixWorld(true);
      const bz = bagZ(t), k = i === 3 ? 1 - E.inOutCubic(prog(t, 6.45, 6.7)) : 1 - E.inOutCubic(prog(t, 26.2, 26.9));
      const tg = V(ST0[0] + 0.02, sg + 0.08, i === 3 ? bz + 0.1 : BAG.position.z - 0.1), h0 = f.bones('RightHand').getWorldPosition(V());
      K.reach(f, 'Right', h0.lerp(tg, i === 3 ? clamp((t - 5.25) / 0.2) * k : k), tg.clone().add(V(0.4, 0.3, i === 3 ? 0.4 : -0.4)));
      K.handAim(f, 'Right', tg.clone().add(V(0, -0.02, i === 3 ? -0.2 : 0.2)), 0); K.flatHand(f, 'Right', 0.4);
      if (i === 11) BAG.position.z = ST0[1] + 0.05 + 0.3 * E.inOutCubic(prog(t, 25.5, 26.2));
    }
    if (i === 5) {
      // the ruler, back to us, before the villagers: his hand pushes the bag back across the stone
      RULER.object3d.visible = true; RULER.object3d.position.set(RUL[0], HT(...RUL), ST0[1] - 0.85); RULER.object3d.rotation.y = 0; RULER.setPose('stand', t);
      RULER.object3d.updateMatrixWorld(true);
      const bz = bagZ(t), k = E.inOutCubic(prog(t, 8.5, 9.0)) * (1 - E.inOutCubic(prog(t, 10.4, 10.9)));
      const tg = V(ST0[0] + 0.02, sg + 0.08, bz - 0.1), h0 = RULER.bones('RightHand').getWorldPosition(V());
      K.reach(RULER, 'Right', h0.lerp(tg, k), tg.clone().add(V(0.4, 0.3, -0.4))); K.handAim(RULER, 'Right', tg.clone().add(V(0, -0.02, 0.2)), 0); K.flatHand(RULER, 'Right', 1 - 0.6 * k);
    }
    if (i === 6) {
      // two pairs carry iron blocks down to the barrier line (backs to camera)
      [0, 1].forEach((pr) => { const z = 14.5 - 1.1 * (t - 11.01) - pr * 2.6, x = -0.6 + pr * 2.4, blk = CARRY[pr], y = HT(x, z) + 0.82;
        blk.visible = true; blk.position.set(x, y, z); blk.rotation.y = 0;
        [WORK[pr * 2], VILL[pr + 2]].forEach((f, side) => { const sx = x + (side ? 0.95 : -0.95); f.object3d.visible = true; f.object3d.position.set(sx, HT(sx, z), z); f.object3d.rotation.y = Math.PI; f.setPose('walk', t + pr * 0.4 + side * 0.5);
          f.object3d.updateMatrixWorld(true); const sd = side ? 'Left' : 'Right', ex = x + (side ? 0.72 : -0.72);
          for (const dz of [0]) { const tg = V(ex, y + 0.12, z + dz); K.reach(f, sd, tg, tg.clone().add(V(side ? 0.4 : -0.4, -0.5, 0.3))); K.handAim(f, sd, tg.clone().add(V(side ? -0.2 : 0.2, -0.05, 0)), 0); }
          const sd2 = side ? 'Right' : 'Left', tg2 = V(ex, y + 0.12, z - 0.3); K.reach(f, sd2, tg2, tg2.clone().add(V(side ? 0.4 : -0.4, -0.5, 0.3))); }); });
    }
    if (i === 7 || i === 12) { const f = WORK[3], si = SITE; f.object3d.visible = true; f.object3d.position.set(si.x - 1.55, HT(si.x - 1.55, si.z + 0.75), si.z + 0.75); f.object3d.rotation.y = Math.PI; f.setPose('kneel', t);
      f.object3d.updateMatrixWorld(true); const top = P.bellows.localToWorld(V(0.45, 0.22 + 0.15 * (0.72 + 0.28 * pump), 0));
      for (const [sd, dx] of [['Right', -0.12], ['Left', 0.12]]) { const tg = top.clone().add(V(dx, 0.02, 0.05)); K.reach(f, sd, tg, tg.clone().add(V(dx * 3, 0.3, 0.5))); K.handAim(f, sd, tg.clone().add(V(0, -0.05, -0.25)), 0); K.flatHand(f, sd, 0.3); } }
    if (i === 8) WORK.forEach((f, k) => { const x = -6 + 4 * k, z = 2.4 + 0.3 * (k % 2); f.object3d.visible = true; f.object3d.position.set(x, HT(x, z), z); f.object3d.rotation.y = Math.PI + 0.2 * (k - 1.5); f.setPose('stand', t + k); });
    if (i === 10) {
      RULER.object3d.visible = true; RULER.object3d.position.set(0.55, HT(0.55, 1.15), 1.15); RULER.object3d.rotation.y = Math.PI; RULER.setPose('stand', t);
      RULER.object3d.updateMatrixWorld(true);
      const k = E.inOutCubic(prog(t, 22.7, 23.6)), tg = V(0.35, 1.32, 0.52), h0 = RULER.bones('RightHand').getWorldPosition(V());
      K.reach(RULER, 'Right', h0.lerp(tg, k), V(0.2, 0.8, 1.4)); K.handAim(RULER, 'Right', tg.clone().add(V(0.0, 0.25, 0.0)), -Math.PI / 2 * k); K.flatHand(RULER, 'Right', 1 - 0.95 * k);
    }
    // camera
    let cam = K.camLerp(s.a, s.b || K.autoMove(s.a, s.k ?? 0.12, s.side ?? 0.05), (s.ease || E.inOutSine)(p));
    cam = K.breathe(cam, t, s.b ? 0.0012 : 0.002, 11 + i);
    FILL.intensity = i === 1 || i >= 10 && i !== 11 && i !== 12 ? 60 : 0;
    ST.bloom = i === 0 ? 0.08 : 0.15;
    const ex = i === 0 ? 0.55 : i === 7 || i === 12 ? 0.55 : 1;
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * ex, build: buildAt(t), pour: pourAt(t, i), sparks: i === 0 ? 1 : i === 7 ? 0.6 : 0, fire: 1 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
