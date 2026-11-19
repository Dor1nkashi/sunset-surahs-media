// y12-12 "A Hidden Bowl in a Bag Changed Everything" (Yusuf 12:70, 12:76-77). Night loading yard outside the
// granary gate: torches, the brothers' saddlebags, the gold measuring bowl on a cloth. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { nile_fields_granary } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE, clamp, lerp, sstep } = W;
const V3 = K.V3, D = 34.04;

let SKY, ST, SET, CAP, P = {}, BOWL, BAGS = [], BAGB, TORCHES = [], STAR, hAt, HOME, TOP;
const EXPO = (t) => (t >= 16.85 && t < 22.93) || (t >= 27.57 && t < 30.08) ? 1.5 : 1.05;
const pr = (t, a, b) => clamp((t - a) / (b - a));
const sm = (t, a, b) => K.easeIO(pr(t, a, b));
const at = (x, z, dy = 0) => [x, hAt(x, z) + dy, z];

async function build() {
  SET = await nile_fields_granary({ time: 'night', ripe: 0.6 });
  ST = W.stage(SET);
  hAt = SET.props.terrain.heightAt;
  const g = SET.group;
  // torches at the gate gap and by the table
  for (const [x, z, s] of [[18.7, -8.3, 1], [25.3, -8.3, 2], [17.6, -4.4, 3]]) { const tc = K.torch({ seed: s, light: 2.2, dist: 11 }); tc.position.set(x, hAt(x, z) - 0.05, z); g.add(tc); TORCHES.push(tc); }
  // gate posts (the gap in the granary wall) with a wooden lintel
  const pl = await K.mats.planks();
  for (const x of [19.05, 24.95]) { const p = W.rbox(0.32, 3.2, 0.32, pl, { r: 0.03 }); p.position.set(x, hAt(x, -9) - 0.1, -9); g.add(W.shadows(p)); }
  const lin = W.rbox(6.4, 0.3, 0.4, pl, { r: 0.03 }); lin.position.set(22, hAt(22, -9) + 3.05, -9); g.add(W.shadows(lin));
  // the table with the cloth and the gold bowl
  const tab = await K.clothTable({ cloth: 0x23325a }); tab.position.set(20.1, hAt(20.1, -5.6), -5.6); g.add(tab);
  TOP = tab.position.y + tab.userData.top; HOME = V3(20.1, TOP, -5.45);
  BOWL = K.goldBowl({ r: 0.075 }); g.add(BOWL);
  // the brothers' saddlebags in a row; the third is Benjamin's (open at first)
  const covers = [0x6a2a1a, 0x3a4a2a, 0x7a5a2a, 0x2a3048, 0x5a3424, 0x6a4a30, 0x3a2a22];
  for (let i = 0; i < 7; i++) { const x = 22.7 + i * 0.78, z = -5.1 + (i % 2) * 0.12;
    const b = await K.saddlebag({ seed: i + 1, open: i === 2, cover: covers[i] }); b.group.position.set(x, hAt(x, z) - 0.02, z); b.group.rotation.y = (i * 0.37) % 0.5 - 0.25 + (i === 2 ? 0.25 : 0);
    g.add(b.group); const cs = W.contactShadow(0.75, 0.75, { op: 0.45 }); cs.position.set(x, hAt(x, z) + 0.01, z); g.add(cs); BAGS.push(b); }
  BAGB = BAGS[2];
  STAR = K.brightStar({ dir: [-0.05, 0.62, -1], size: 14 }); SET.scene.add(STAR); SKY = K.starfield({ count: 5200, bright: 2.2 }); SET.scene.add(SKY);
  // people
  const PE = await K.people();
  P.yusuf = PE.make({ kind: 'man', outfit: 'noble', palette: 'noble', beard: 'short', headwear: 'wrap', seed: 12, detail: 1 });
  P.guard = PE.make({ kind: 'man', outfit: 'worker', palette: 'night', beard: 'full', headwear: 'wrap', seed: 41, detail: 0.8 });
  const bro = [['rust', 'full', 'keffiyeh'], ['olive', 'full', 'turban'], ['earth', 'short', 'wrap'], ['sand', 'full', 'keffiyeh'], ['indigo', 'short', 'turban']];
  P.bro = bro.map(([pal, beard, hw], i) => PE.make({ kind: 'man', outfit: 'traveller', palette: pal, beard, headwear: hw, seed: 60 + i * 7, detail: 0.6 }));
  for (const p of [P.yusuf, P.guard, ...P.bro]) g.add(p.object3d);
  SET.scene.environment = SET.scene.environment || G.ENV;
  // a deeper night: weaker moon and sky light so the torches make the warm pools; a blue night sky instead of black
  SET.atmo.sun.intensity *= 0.45; SET.scene.environmentIntensity *= 0.5; if (SET.atmo.hemi) SET.atmo.hemi.intensity *= 0.5;
  const su = SET.atmo.sky?.userData.u; if (su) { su.zen.value = new THREE.Color(0x050b1e); su.hor.value = new THREE.Color(0x1a2440); su.gnd.value = new THREE.Color(0x0c1018); }
  if (SET.scene.fog) SET.scene.fog.color.set(0x141c30);
}

// ------------------------------------------------------------------ staging helpers
const hide = () => { for (const p of [P.yusuf, P.guard, ...P.bro]) p.object3d.visible = false; };
const show = (p) => { p.object3d.visible = true; return p; };
function bowlAt(pos, tilt = 0) { BOWL.visible = true; BOWL.position.copy(pos); BOWL.rotation.set(tilt, 0.6, 0); BOWL.updateMatrixWorld(true); }
// the bowl's grain-rest spot inside Benjamin's bag
const inBag = () => { const g = BAGB.group; g.updateMatrixWorld(true); return g.localToWorld(V3(0.03, BAGB.mouthY - 0.035, 0.02)); };
// grip point on the bowl (its rim, toward the hand) for hand IK
const grip = (p) => V3(p.x + 0.0, p.y + 0.09, p.z + 0.04);
function brothersAt(t, layout) {
  P.bro.forEach((b, i) => { const L = layout[i]; if (!L) return; show(b); K.place(b, L[0], hAt(L[0], L[1]), L[1], L[2]); b.setPose(L[3] || 'stand', t, { offset: i * 0.7, lookYaw: L[4] || 0 }); });
}
// Yusuf at the table (behind it, back to camera when seen from the gate side is not used: he faces the table, -z)
const YT = [20.12, -4.98, Math.PI];

// ------------------------------------------------------------------ shots
// each: [t0, t1, camA, camB|null, stage(t)]
const C = (pos, look, fov, roll = 0) => ({ pos, look, fov, roll });
const starLook = (pos, dy) => { const d = STAR.userData.dir; return [pos[0] + d.x * 50, pos[1] + (d.y - dy) * 50, pos[2] + d.z * 50]; };
let SHOTS;
function shots() {
  const H = HOME, B = inBag(), bx = BAGB.group.position;
  const macroA = C([H.x - 0.62, H.y + 0.2, H.z + 0.18], [H.x + 0.02, H.y + 0.05, H.z], 22);
  return [
    // 1 hook: the bowl glints on the cloth; Yusuf's hand comes in and lifts it away
    { t0: 0, t1: 0.97, a: macroA, b: C([H.x - 0.58, H.y + 0.21, H.z + 0.17], [H.x + 0.02, H.y + 0.07, H.z], 21.5), s(t) {
      show(P.yusuf); K.place(P.yusuf, ...at(YT[0], YT[1]), YT[2]); P.yusuf.setPose('stand', t);
      const lift = sm(t, 0.42, 0.97), pos = H.clone().add(V3(0.02 * lift, 0.32 * lift, 0.34 * lift));
      bowlAt(pos, -0.1 * lift);
      const k = sm(t, 0.0, 0.4); K.bendReach(P.yusuf, 'Right', grip(pos), K.onBody(P.yusuf, -0.6, 0.9, -0.4), k);
    } },
    // 2 the open saddlebag on the grain, slow push (the bowl is not there yet)
    { t0: 0.97, t1: 3.16, a: C([bx.x - 0.2, bx.y + 1.15, bx.z + 1.5], [bx.x - 0.1, bx.y + 0.45, bx.z - 1.2], 36), b: C([bx.x - 0.1, bx.y + 1.05, bx.z + 0.95], [bx.x - 0.05, bx.y + 0.5, bx.z - 0.8], 32), s(t) {
      BOWL.visible = false; BAGB.setOpen(1);
      brothersAt(t, [[bx.x + 1.6, bx.z - 1.4, -0.6, 'stand']]);
    } },
    // 3 the yard: the brothers load up under the torches, slow track along the bags toward the gate
    { t0: 3.16, t1: 6.05, a: C(at(29.4, -1.4, 1.55), [23.5, hAt(23, -6) + 0.9, -6.8], 40), b: C(at(27.6, -1.0, 1.5), [22.3, hAt(22, -6) + 1.0, -7.2], 40), s(t) {
      BOWL.visible = false; BAGB.setOpen(1);
      brothersAt(t, [[26.3, -4.3, 0.3, 'kneel'], [27.4, -6.1, -1.9, 'stand'], [25.0 + 0.9 * pr(t, 3.16, 6.05), -6.6, Math.PI / 2, 'walk'], [28.4, -4.9, -2.2, 'agree'], [23.6, -7.3, 2.6, 'stand']]);
    } },
    // 4 he lowers the gold bowl into his brother's bag
    { t0: 6.05, t1: 7.24, a: C([bx.x + 0.9, bx.y + 1.3, bx.z + 0.95], [bx.x, bx.y + 0.75, bx.z], 30), b: C([bx.x + 0.75, bx.y + 1.2, bx.z + 0.8], [bx.x, bx.y + 0.68, bx.z], 29), s(t) {
      BAGB.setOpen(1);
      show(P.yusuf); K.place(P.yusuf, ...at(bx.x + 0.55, bx.z - 0.15), -Math.PI / 2 - 0.35); P.yusuf.setPose('stand', t);
      const e = sm(t, 5.9, 6.95), pos = B.clone().add(V3(0.0, 0.42 * (1 - e), 0.05 * (1 - e)));
      bowlAt(pos, 0.25 * (1 - e));
      const pole = K.onBody(P.yusuf, -0.7, 0.8, -0.4);
      K.bendReach(P.yusuf, 'Right', grip(pos).add(V3(0, 0.02 + 0.12 * sm(t, 6.95, 7.24), 0)), pole);
    } },
    // 5 the cover is folded over the mouth; pull back: one bag among the others
    { t0: 7.24, t1: 9.33, a: C([bx.x - 0.45, bx.y + 1.15, bx.z + 0.75], [bx.x, bx.y + 0.58, bx.z], 28), b: C([bx.x + 0.9, bx.y + 1.5, bx.z + 2.6], [bx.x + 0.8, bx.y + 0.45, bx.z], 34), s(t) {
      bowlAt(B, 0);
      const f = sm(t, 7.3, 8.3); BAGB.setOpen(1 - f);
      show(P.yusuf); K.place(P.yusuf, ...at(bx.x + 0.55, bx.z - 0.15), -Math.PI / 2 - 0.35); P.yusuf.setPose('stand', t);
      const edge = BAGB.flapEdge();
      const k = t < 8.3 ? 1 : 1 - sm(t, 8.3, 8.9);
      K.bendReach(P.yusuf, 'Right', edge, K.onBody(P.yusuf, -0.7, 0.8, -0.4), k);
    } },
    // 6 the brothers at the gate; one points toward the bags
    { t0: 9.33, t1: 10.54, a: C(at(23.0, -12.6, 1.6), [23.6, hAt(24, -6) + 1.0, -5.6], 40), b: C(at(23.1, -12.3, 1.6), [23.6, hAt(24, -6) + 1.0, -5.6], 39), s(t) {
      BOWL.visible = false; BAGB.setOpen(0);
      brothersAt(t, [[22.4, -7.6, 0.35, 'stand'], [23.3, -7.2, 0.15, 'stand'], [24.2, -7.7, -0.1, 'stand'], [25.1, -8.1, -0.3, 'agree'], [21.6, -8.2, 0.5, 'stand']]);
      const pt = P.bro[1]; K.reach(pt, 'Right', V3(bx.x + 0.3, hAt(bx.x, bx.z) + 1.6, bx.z + 0.6), K.onBody(pt, -0.8, 0.6, -0.5), sm(t, 9.4, 9.9));
    } },
    // 7 the search: the guard lifts the cover, reaches in, the gold comes up into the torchlight
    { t0: 10.54, t1: 12.65, a: C([bx.x - 0.95, bx.y + 1.25, bx.z + 1.1], [bx.x, bx.y + 0.75, bx.z], 32), b: C([bx.x - 0.75, bx.y + 1.3, bx.z + 0.9], [bx.x + 0.05, bx.y + 1.05, bx.z], 30), s(t) {
      const open = sm(t, 10.6, 11.2); BAGB.setOpen(open);
      show(P.guard); K.place(P.guard, ...at(bx.x + 0.15, bx.z - 0.62), 0.15); P.guard.setPose('stand', t);
      BAGB.flap.updateMatrixWorld(true);
      const up = sm(t, 11.45, 12.35), pos = B.clone().add(V3(0.02 * up, 0.95 * up, -0.12 * up));
      bowlAt(pos, -0.35 * up);
      if (t < 11.2) K.bendReach(P.guard, 'Right', BAGB.flapEdge(), K.onBody(P.guard, -0.7, 0.8, -0.4), sm(t, 10.54, 10.7));
      else K.bendReach(P.guard, 'Right', grip(pos), K.onBody(P.guard, -0.7, 0.8, -0.4), sm(t, 11.2, 11.45));
      brothersAt(t, [[bx.x - 1.6, bx.z - 1.9, 0.9, 'stand']]);
    } },
    // 8 restraint: Yusuf stands very still at the edge of the torchlight, hands folded (long lens, back)
    { t0: 12.65, t1: 14.56, a: C(at(21.0, 1.5, 1.45), [21.2, hAt(21, -4) + 1.25, -4.2], 18), b: C(at(21.0, 1.3, 1.45), [21.2, hAt(21, -4) + 1.25, -4.2], 17.5), s(t) {
      BOWL.visible = false; BAGB.setOpen(1);
      show(P.yusuf); K.place(P.yusuf, ...at(21.2, -3.9), Math.PI); P.yusuf.setPose('stand', t); K.foldHands(P.yusuf);
      brothersAt(t, [[23.4, -6.6, 2.4, 'stand'], [24.3, -6.9, 2.6, 'headShake'], [22.6, -7.2, 2.9, 'stand']]);
      show(P.guard); K.place(P.guard, ...at(bx.x - 0.4, bx.z - 0.5), 2.2); P.guard.setPose('stand', t);
    } },
    // 9 his folded hands in the torchlight, motionless
    { t0: 14.56, t1: 16.85, a: C(at(21.55, -3.2, 1.72), [bx.x, hAt(bx.x, bx.z) + 1.35, bx.z - 0.4], 30), b: C(at(21.5, -3.35, 1.7), [bx.x, hAt(bx.x, bx.z) + 1.4, bx.z - 0.4], 26), s(t) {
      BAGB.setOpen(1);
      show(P.yusuf); K.place(P.yusuf, ...at(21.2, -3.9), Math.PI); P.yusuf.setPose('stand', t); K.foldHands(P.yusuf);
      show(P.guard); K.place(P.guard, ...at(bx.x + 0.15, bx.z - 0.62), 0.15 - 0.6 * sm(t, 14.6, 16.0)); P.guard.setPose('stand', t);
      const pos = B.clone().add(V3(0.02, 0.95, -0.12)); bowlAt(pos, -0.35);
      K.reach(P.guard, 'Right', grip(pos), K.onBody(P.guard, -0.7, 0.8, -0.4));
      brothersAt(t, [[bx.x - 1.3, bx.z - 1.6, 0.6, 'headShake'], [bx.x - 0.4, bx.z - 1.9, 0.2, 'stand'], [bx.x + 0.9, bx.z - 1.7, -0.3, 'stand']]);
    } },
    // 10 tilt from the bag up past the torches to the stars (small to vast)
    { t0: 16.85, t1: 18.84, a: C(at(23.4, -2.3, 1.2), [bx.x, bx.y + 0.5, bx.z], 34), b: C(at(23.4, -2.3, 1.25), [bx.x - 1.0, bx.y + 9.0, bx.z - 8], 34), s(t) {
      BOWL.visible = false; BAGB.setOpen(1);
    } },
    // 11 the stars above the gate and torches
    { t0: 18.84, t1: 21.23, a: C(at(22.0, 2.5, 1.0), [22.0, hAt(22, -9) + 7.0, -9], 52), b: C(at(22.0, 2.2, 1.0), [22.0, hAt(22, -9) + 7.2, -9], 51), s(t) { BOWL.visible = false; } },
    // 12 one star among the rest: a slow push
    { t0: 21.23, t1: 22.93, a: C(at(22.0, 2.2, 1.0), starLook(at(22.0, 2.2, 1.0), 0.04), 34), b: C(at(22.0, 2.2, 1.0), starLook(at(22.0, 2.2, 1.0), 0), 20), s(t) { BOWL.visible = false; } },
    // 13 the folded hands again, unmoving
    { t0: 22.93, t1: 24.69, a: C(at(YT[0] - 0.9, YT[1] + 1.1, 1.55), [YT[0], hAt(YT[0], YT[1]) + 1.15, YT[1] - 0.5], 34), b: C(at(YT[0] - 0.8, YT[1] + 0.95, 1.5), [YT[0], hAt(YT[0], YT[1]) + 1.12, YT[1] - 0.5], 32), s(t) {
      BAGB.setOpen(1);
      show(P.yusuf); K.place(P.yusuf, ...at(YT[0], YT[1]), YT[2]); P.yusuf.setPose('stand', t);
      const pos = K.onBody(P.yusuf, 0, 1.0, 0.24); bowlAt(pos.clone().add(V3(0, -0.06, 0)), 0);
      K.reach(P.yusuf, 'Right', pos.clone().add(V3(0.07, 0, 0)), K.onBody(P.yusuf, -0.6, 0.9, -0.4)); K.reach(P.yusuf, 'Left', pos.clone().add(V3(-0.07, 0, 0)), K.onBody(P.yusuf, 0.6, 0.9, -0.4));
    } },
    // 14 the bowl is set back on the cloth
    { t0: 24.69, t1: 27.57, a: C([H.x - 0.75, H.y + 0.32, H.z + 0.05], [H.x + 0.05, H.y + 0.1, H.z + 0.05], 30), b: C([H.x - 0.7, H.y + 0.28, H.z + 0.08], [H.x + 0.03, H.y + 0.07, H.z + 0.03], 27), s(t) {
      show(P.yusuf); K.place(P.yusuf, ...at(YT[0], YT[1]), YT[2]); P.yusuf.setPose('stand', t);
      const e = sm(t, 24.69, 25.9), held = K.onBody(P.yusuf, 0, 1.0, 0.24).add(V3(0, -0.06, 0)), pos = held.lerp(H, e);
      bowlAt(pos, -0.1 * (1 - e));
      const k = 1 - sm(t, 26.0, 26.9); K.bendReach(P.yusuf, 'Right', pos.clone().add(V3(0.07, 0.03 + 0.05 * sm(t, 25.9, 26.3), 0.06 * sm(t, 25.9, 26.6))), K.onBody(P.yusuf, -0.6, 0.9, -0.4), k); K.reach(P.yusuf, 'Left', pos.clone().add(V3(-0.07, 0.03 + 0.05 * sm(t, 25.9, 26.3), 0.06 * sm(t, 25.9, 26.6))), K.onBody(P.yusuf, 0.6, 0.9, -0.4), k);
    } },
    // 15 a star above the gate, slow tilt up
    { t0: 27.57, t1: 30.08, a: C(at(22.6, -1.0, 1.4), [22.0, hAt(22, -9) + 2.4, -9], 38), b: C(at(22.6, -1.0, 1.4), [21.6, hAt(22, -9) + 9.0, -9], 38), s(t) {
      bowlAt(H, 0); BAGB.setOpen(1);
    } },
    // 16 the quiet folded hands, then a tilt down to the bowl on the cloth (= frame 1)
    { t0: 30.08, t1: D + 0.01, s(t) {
      show(P.yusuf); K.place(P.yusuf, ...at(YT[0], YT[1]), YT[2]); P.yusuf.setPose('stand', t); K.foldHands(P.yusuf, 0.98, 0.2, 1 - sm(t, 32.0, 33.3));
      bowlAt(H, 0); BAGB.setOpen(1);
    } },
  ];
}
// the hands close-ups (9, 13, and the start of 16): framed from Yusuf's side, in front of the table
function handsCam(variant, t, s) {
  const y = P.yusuf; y.object3d.updateMatrixWorld(true);
  const hc = K.handPos(y, 'Left').lerp(K.handPos(y, 'Right'), 0.5);
  const off = variant === 0 ? V3(0.55, 0.22, -0.55) : V3(-0.6, 0.12, -0.5);
  const push = variant === 0 ? 1 - 0.12 * sm(t, s.t0, s.t1) : 1;
  return { pos: hc.clone().add(off.multiplyScalar(push)).toArray(), look: hc.toArray(), fov: 26 };
}

// ------------------------------------------------------------------ film
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    await build();
    CAP = captions(await loadLines('lines.json'));
    SHOTS = shots();
    ST.update(0, 0, {}); G.R.compile(ST.scene, ST.camera);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    hide(); BAGB.setOpen(1); BOWL.visible = false;
    const s = K.shotAt(SHOTS, t);
    let cam;
    if (t >= 33.86) {                                   // the loop seam: exactly frame 1's state and camera
      hide(); SHOTS[0].s(0); BAGB.setOpen(1); cam = K.camAt(SHOTS[0], 0);
    } else if (s.t0 === 30.08) {
      s.s(t);
      // Yusuf still at the table (rear three-quarter), then the camera cranes down to the bowl: frame 1's camera
      const A = C(at(YT[0] - 1.0, YT[1] + 0.7, 1.45), [YT[0] - 0.05, hAt(YT[0], YT[1]) + 0.95, YT[1] - 0.6], 34);
      cam = t < 31.6 ? K.camAt({ t0: 30.08, t1: 31.6, a: C(at(YT[0] - 1.05, YT[1] + 0.75, 1.47), A.look, 34.5), b: A }, t) : K.camAt({ t0: 31.6, t1: 33.85, a: A, b: SHOTS[0].a }, t);
    } else { s.s(t); cam = K.camAt(s, t); }
    // torches + one star
    const k = 1;
    TORCHES.forEach((tc) => tc.userData.update(t, k));
    ST.update(t, u, { cam, exposure: EXPO(t) });
    STAR.visible = t >= 16.85 && t < 30.08; STAR.userData.update(ST.camera, t, 1); SKY.userData.update(ST.camera, t, 1);
    G.renderSet(ctx, ST, t, u, { cam, exposure: EXPO(t) });
    K.vignette(ctx, 0.38);
    CAP.draw(ctx, t);
    K.drawSeal(ctx, IMG.seal, t, 32.5, D);
  },
  post(ctx, u, t) { K.grain(ctx, t, M.mulberry32, 0.04); },
});
