// y12-11 "A King Wanted Him. He Asked for the Grain Stores" (Yusuf 12:55-56). The audience hall by day,
// whose open end looks out on the royal silos; then the granary yard: keys, scribes, grain, the store's
// wooden lock, sacks set on a tidy pile. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { palace_hall, nile_fields_granary } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 28.85;
const GX = 22, GZ = -18;
const DZ = -32.5;                                   // palace dais centre (palace_hall)
const STORE = { x0: 30, x1: 36, z0: -17, z1: -11, h: 2.7, door: { z: -14, w: 1.3, h: 2.1 } };

let PAL, NILE, CAP, P = {}, X = {}, ST = {};

// a beehive silo like the set's (for the view out of the hall)
async function silo(mud, { r = 2.1, h = 4.0, dome = 2.4 } = {}) {
  const prof = []; for (let i = 0; i <= 10; i++) prof.push([r * (1.04 - 0.04 * i / 10), (h * i) / 10]);
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([Math.max(0.001, r * 0.96 * Math.cos(a)), h + dome * Math.sin(a)]); }
  return W.shadows(W.lathe(prof, mud, { seg: 96 }));
}
async function extras() {
  const mud = await W.pbr('rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }), hs = await W.pbr('hessian_230', { tile: 0.5, tint: 0xc8b8a0, res: 1024 });
  const pl = await W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 }), sandM = await W.pbr('sand_01', { tile: 4, tint: 0xf0d8b0, res: 1024 });
  // ---- palace: the yard outside the open end of the hall, with a row of silos and a worker crossing
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), sandM); W.boxUV(yard.geometry); yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 64); yard.receiveShadow = true; PAL.scene.add(yard);
  for (let i = 0; i < 5; i++) { const s = await silo(mud, { h: 4 + (i % 2) * 0.4 }); s.position.set(-11 + i * 5.5, 0, 42); PAL.scene.add(s); }
  const wall = W.rbox(40, 2.6, 0.6, mud, { r: 0.1 }); wall.position.set(0, 0, 36); PAL.scene.add(wall);
  // the gold collar for Yusuf in office (added to his neck bone after he is built)
  X.collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 12, 48), W.goldMat()); X.collar.scale.set(1, 0.32, 1);
  // ---- granary yard: storeroom with a wooden pin lock, a heap, keys, a scale on the scribes' table
  const S_ = STORE, H = NILE.props.terrain.heightAt, gy = H((S_.x0 + S_.x1) / 2, (S_.z0 + S_.z1) / 2) - 0.05, g = new THREE.Group(); g.position.y = gy; NILE.scene.add(g); X.store = g;
  const wl = (w, h, d, x, y, z) => { const b = W.rbox(w, h, d, mud, { r: 0.04, seg: 2 }); b.position.set(x, y, z); g.add(b); };
  const t_ = 0.35, dz = S_.door.z, dw = S_.door.w, dh = S_.door.h;
  wl(t_, S_.h, (S_.z1 - (dz + dw / 2)), S_.x0, 0, (S_.z1 + dz + dw / 2) / 2); wl(t_, S_.h, ((dz - dw / 2) - S_.z0), S_.x0, 0, (dz - dw / 2 + S_.z0) / 2); wl(t_, S_.h - dh, dw, S_.x0, dh, dz);
  wl(t_, S_.h, S_.z1 - S_.z0, S_.x1, 0, (S_.z0 + S_.z1) / 2); wl(S_.x1 - S_.x0, S_.h, t_, (S_.x0 + S_.x1) / 2, 0, S_.z0); wl(S_.x1 - S_.x0, S_.h, t_, (S_.x0 + S_.x1) / 2, 0, S_.z1);
  wl(S_.x1 - S_.x0 + 0.6, 0.22, S_.z1 - S_.z0 + 0.6, (S_.x0 + S_.x1) / 2, S_.h, (S_.z0 + S_.z1) / 2);
  X.door = W.door(pl, W.ironMat(), { w: dw - 0.04, h: dh - 0.02, t: 0.07, frame: 0.0001, studs: true }); X.door.group.rotation.y = -Math.PI / 2; X.door.group.position.set(S_.x0 - 0.12, 0, dz); g.add(X.door.group);
  // the wooden pin lock on the outside of the door: a lock case, a sliding wooden bolt, a big wooden key
  const dark = pl.clone(); dark.color = new THREE.Color(0x6a4a30);
  X.lock = new THREE.Group(); X.lock.position.set(S_.x0 - 0.2, 1.1, dz + dw / 2 - 0.2); g.add(X.lock);
  const casing = W.rbox(0.1, 0.22, 0.34, dark, { r: 0.02, centre: true }); X.lock.add(casing);
  X.lbolt = W.rbox(0.07, 0.07, 0.62, pl, { r: 0.015, centre: true }); X.lbolt.position.set(-0.01, -0.03, 0.0); X.lock.add(X.lbolt);
  const keeper = W.rbox(0.12, 0.14, 0.12, dark, { r: 0.02, centre: true }); keeper.position.set(0, -0.03, 0.55); X.lock.add(keeper);
  X.key = new THREE.Group(); const shaft = W.rbox(0.035, 0.035, 0.42, W.brassMat(), { r: 0.008, centre: true }); shaft.position.z = -0.21; X.key.add(shaft);
  for (let k = 0; k < 3; k++) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8), W.brassMat()); pin.position.set(0, 0.03, -0.36 - k * 0.025); X.key.add(pin); }
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 10, 24), W.brassMat()); bow.position.z = 0.02; X.key.add(bow);
  X.key.position.set(-0.07, -0.03, -0.05); X.lock.add(X.key); W.shadows(X.lock);
  // the grain heap by the store door and the stream poured from a sack
  X.heap = W.lathe(Array.from({ length: 24 }, (_, i) => { const a = i / 23; return [Math.max(0.001, 1 - a) * 0.9, Math.sin(a * Math.PI / 2) ** 0.8 * 0.5]; }), new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 1 }), { seg: 64 });
  X.heap.position.set(GX + 2.0, H(GX + 2, GZ + 7.5), GZ + 7.5); X.heap.receiveShadow = X.heap.castShadow = true; NILE.scene.add(X.heap);
  X.stream = K.dustMotes({ centre: [0, 0, 0], size: [0.045, 1.0, 0.045], count: 600, seed: 8, color: 0xf0c868, px: 0.012, op: 0.95, fall: 1.4 }); NILE.scene.add(X.stream);
  X.pourSack = W.sack(hs, { w: 0.45, h: 0.55, seed: 5, open: true }); NILE.scene.add(X.pourSack);
  // keys on a ring
  X.keys = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.004, 10, 40), W.brassMat()); X.keys.add(ring);
  for (let k = 0; k < 4; k++) { const kk = new THREE.Group(), a = -0.5 + k * 0.33; const sh = W.rbox(0.008, 0.11 + 0.02 * k, 0.008, W.brassMat(), { r: 0.002, centre: true }); sh.position.y = -0.07 - 0.01 * k; kk.add(sh);
    const bw = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 16), W.brassMat()); bw.position.y = -0.005; kk.add(bw);
    const bit = W.rbox(0.025, 0.012, 0.006, W.brassMat(), { r: 0.002, centre: true }); bit.position.set(0.012, -0.12 - 0.02 * k, 0); kk.add(bit);
    kk.position.set(Math.sin(a) * 0.035, -Math.cos(a) * 0.035, 0); kk.rotation.z = a * 0.6; X.keys.add(kk); }
  W.shadows(X.keys); NILE.scene.add(X.keys);
  // a brass scale and a reed pen on the scribes' table
  const ty = H(GX + 4, GZ + 5) + 0.75, br = W.brassMat(); X.scale = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.4, 20), br); post.position.y = 0.2; X.scale.add(post);
  X.beam = new THREE.Group(); X.beam.position.y = 0.4; X.scale.add(X.beam);
  X.beam.add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.44, 12).rotateZ(Math.PI / 2), br));
  for (const s of [-1, 1]) { const pan = W.lathe([[0.001, 0], [0.07, 0.004], [0.1, 0.028], [0.096, 0.032]], br, { seg: 48 }); pan.position.set(s * 0.21, -0.2, 0); X.beam.add(pan); }
  X.scale.position.set(GX + 4.35, ty, GZ + 4.85); NILE.scene.add(W.shadows(X.scale));
  X.pen = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.7 })); NILE.scene.add(X.pen);
  X.ty = ty;
  // the tidy pile of sacks the last sack is lifted onto (in front of the silos)
  X.pile = [];
  for (let k = 0; k < 11; k++) { const row = k < 6 ? 0 : k < 10 ? 1 : 2, col = row === 0 ? k : row === 1 ? k - 6 : 0, x = GX - 9 + col * 0.58 + row * 0.29, z = GZ + 1.2, s = W.sack(hs, { w: 0.5, h: 0.62, seed: k + 31 });
    s.position.set(x, H(x, z) + row * 0.5, z); s.rotation.set(0, k * 0.8, 0); NILE.scene.add(s); X.pile.push(s); }
  X.lifted = W.sack(hs, { w: 0.5, h: 0.62, seed: 77 }); NILE.scene.add(X.lifted);
  X.dust = K.dustMotes({ centre: [GX - 3, 2.0, GZ + 6], size: [16, 4, 10], count: 900, seed: 4, color: 0xffe0a0, px: 0.03, op: 0.5, fall: 0.03 }); NILE.scene.add(X.dust);
  X.motes = K.dustMotes({ centre: [0, 2.0, DZ + 2], size: [5, 3.5, 6], count: 500, seed: 6, color: 0xffe8c0, px: 0.012, op: 0.6, fall: 0.02 }); PAL.scene.add(X.motes);
}

// ------------------------------------------------------------------ shots
const C = {
  dais_a: { pos: [-1.3, 2.3, DZ - 2.4], look: [0, 1.6, 30], fov: 30 },
  dais_b: { pos: [-1.25, 2.3, DZ - 2.3], look: [0, 1.6, 30], fov: 30 },
  rack_a: { pos: [-1.25, 2.3, DZ - 2.3], look: [0, 1.6, 30], fov: 30 },
  rack_b: { pos: [-1.0, 2.25, DZ - 2.0], look: [2.0, 3.5, 42], fov: 16 },
  aud_a: { pos: [0.6, 1.65, DZ + 9.5], look: [0, 1.8, DZ - 1], fov: 46 },
  aud_b: { pos: [0.5, 1.65, DZ + 8.2], look: [0, 1.8, DZ - 1], fov: 44 },
  turn_a: { pos: [-1.6, 1.8, DZ + 6.5], look: [0.2, 1.7, DZ + 4.2], fov: 32 },
  turn_b: { pos: [-1.5, 1.8, DZ + 6.2], look: [0.2, 1.7, DZ + 4.2], fov: 30 },
  dolly_a: { pos: [0.4, 1.7, -14], look: [0.6, 2.0, 40], fov: 48 },
  dolly_b: { pos: [0.4, 1.7, 2.5], look: [0.6, 2.5, 40], fov: 48 },
  yard_a: { pos: [GX - 3, 1.7, GZ + 11], look: [GX - 2, 2.6, GZ - 4.5], fov: 48 },
  yard_b: { pos: [GX - 3, 1.7, GZ + 7.5], look: [GX - 2, 2.8, GZ - 4.5], fov: 48 },
  keys: { pos: [GX + 1.55, 1.15, GZ + 6.55], look: [GX + 2.05, 0.98, GZ + 6.0], fov: 26 },
  sun: { pos: [GX - 10, 1.6, GZ + 12], look: [GX, 2.0, GZ - 4], fov: 56 },
  domes_a: { pos: [GX - 1, 1.4, GZ + 10.5], look: [GX - 2, 2.2, GZ - 4.5], fov: 46 },
  domes_b: { pos: [GX - 1, 4.6, GZ + 11.5], look: [GX - 2, 3.0, GZ - 4.5], fov: 46 },
  pour_a: { pos: [GX + 2.95, 1.0, GZ + 8.6], look: [GX + 2.0, 0.6, GZ + 7.5], fov: 34 },
  pour_b: { pos: [GX + 2.8, 0.95, GZ + 8.35], look: [GX + 2.0, 0.6, GZ + 7.5], fov: 32 },
  lock: { pos: [STORE.x0 - 0.75, 1.3, STORE.door.z + 0.35], look: [STORE.x0 - 0.2, 1.1, STORE.door.z + 0.45], fov: 32 },
  table_a: { pos: [GX + 5.1, 1.55, GZ + 5.7], look: [GX + 4.1, 0.75, GZ + 4.9], fov: 40 },
  table_b: { pos: [GX + 4.4, 1.55, GZ + 5.8], look: [GX + 4.3, 0.75, GZ + 4.85], fov: 40 },
  sacks: { pos: [GX - 7.4, 1.4, GZ + 5.0], look: [GX - 7.6, 0.6, GZ + 1.2], fov: 44 },
  lift_a: { pos: [GX - 6.2, 1.25, GZ + 3.6], look: [GX - 7.7, 1.15, GZ + 1.2], fov: 36 },
  lift_b: { pos: [GX - 6.2, 1.3, GZ + 3.6], look: [GX - 4.5, 3.0, GZ - 4.5], fov: 30 },
};
const SHOTS = [
  { t0: 0.00, t1: 1.23, set: 'pal', a: C.dais_a, b: C.dais_b },
  { t0: 1.23, t1: 3.45, set: 'pal', a: C.rack_a, b: C.rack_b },
  { t0: 3.45, t1: 5.57, set: 'pal', a: C.aud_a, b: C.aud_b },
  { t0: 5.57, t1: 7.07, set: 'pal', a: C.turn_a, b: C.turn_b },
  { t0: 7.07, t1: 8.45, set: 'pal', a: C.dolly_a, b: C.dolly_b, ease: E.inCubic },
  { t0: 8.45, t1: 9.83, set: 'nile', a: C.yard_a, b: C.yard_b, ease: E.outCubic },
  { t0: 9.83, t1: 12.70, set: 'nile', a: C.keys },
  { t0: 12.70, t1: 14.82, set: 'nile', a: C.sun },
  { t0: 14.82, t1: 17.33, set: 'nile', a: C.domes_a, b: C.domes_b },
  { t0: 17.33, t1: 19.03, set: 'nile', a: C.pour_a, b: C.pour_b },
  { t0: 19.03, t1: 21.47, set: 'nile', a: C.lock },
  { t0: 21.47, t1: 24.08, set: 'nile', a: C.table_a, b: C.table_b },
  { t0: 24.08, t1: 25.85, set: 'nile', a: C.sacks },
  { t0: 25.85, t1: 28.85, set: 'nile', a: C.lift_a, b: C.lift_b, ease: (p) => E.inOutCubic(prog(p, 0.45, 1)) },
];

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    PAL = await palace_hall({ time: 'day' });
    NILE = await nile_fields_granary({ time: 'golden', ripe: 0.3 });
    await extras();
    const PP = await K.people();
    P.yusuf = PP.make({ kind: 'man', outfit: 'noble', palette: { robe: '#f2ede2', wrap: '#f3efe6', cloak: '#f2ede2', trim: '#c9a046', sash: '#c9a046', trousers: '#e6dccb' }, beard: 'short', headwear: 'none', seed: 12, height: 1.04 });
    P.yusuf.bones('Neck').add(X.collar); X.collar.scale.multiplyScalar(100); X.collar.position.set(0, 2, 2);
    PAL.scene.add(P.yusuf.object3d);
    P.scribes = [0, 1].map((k) => PP.make({ kind: 'man', outfit: 'thobe', palette: 'white', beard: k ? 'short' : 'full', headwear: 'kufi', seed: 90 + k, detail: 0.55 }));
    for (const s of P.scribes) PAL.scene.add(s.object3d);
    P.steward = PP.make({ kind: 'man', outfit: 'thobe', palette: 'white', beard: 'full', headwear: 'wrap', seed: 95, detail: 0.8 });
    P.s1 = PP.make({ kind: 'man', outfit: 'thobe', palette: 'cream', beard: 'short', headwear: 'kufi', seed: 96, detail: 0.6 });
    P.worker = PP.make({ kind: 'man', outfit: 'worker', palette: 'white', beard: 'short', headwear: 'wrap', seed: 97, detail: 0.7 });
    P.worker2 = PP.make({ kind: 'man', outfit: 'worker', palette: 'sand', beard: 'full', headwear: 'keffiyeh', seed: 98, detail: 0.5 });
    for (const k of ['steward', 's1', 'worker', 'worker2']) NILE.scene.add(P[k].object3d);
    P.steward.bones('Hips').add(X.keys); X.keys.scale.setScalar(100); X.keys.position.set(16, -6, 6);
    for (const [k, s] of [['pal', PAL], ['nile', NILE]]) { ST[k] = W.stage(s); s.update(0, null, {}); G.R.compile(s.scene, ST[k].camera); }
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    if (s.set === 'pal') palace(t, i); else yard(t, i);
    let cam = K.camLerp(s.a, s.b, (s.ease || E.inOutSine)(p));
    cam = K.breathe(cam, t, 0.002, 61 + i);
    // the sun comes out over the yard in shot 7 (clouds clear): the exposure and the sun rise together
    const sunK = i === 7 ? 0.45 + 0.55 * E.inOutSine(prog(t, 12.9, 14.4)) : 1;
    if (s.set === 'nile') { NILE.atmo.sun.intensity = SUN0 * sunK; }
    G.renderSet(ctx, ST[s.set], t, u, { cam, exposure: ST[s.set].set.exposure * (s.set === 'nile' ? 0.75 + 0.25 * sunK : 1) * (s.ex ?? 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
let SUN0 = null;

function palace(t, i) {
  X.motes.userData.update(t, 1);
  const y = P.yusuf; y.object3d.visible = i === 2 || i === 3;
  if (y.object3d.visible) {
    y.object3d.position.set(0, 0, DZ + 4.6); y.object3d.rotation.y = Math.PI;
    // shot 4: he turns his head toward the open end of the hall (the silos), in outline
    const look = i === 3 ? -95 * E.inOutCubic(prog(t, 5.7, 6.7)) : 0;
    y.setPose('stand', t, { lookYaw: look });
  }
  P.scribes.forEach((s, k) => { s.object3d.visible = i === 2; if (!s.object3d.visible) return;
    s.object3d.position.set(k ? 3.4 : -3.3, 0, DZ + 6.2 + k * 0.4); s.object3d.rotation.y = k ? -2.3 : 2.3; s.setPose('kneel', t + k * 2); });
}
function yard(t, i) {
  if (SUN0 === null) SUN0 = NILE.atmo.sun.intensity;
  const H = NILE.props.terrain.heightAt;
  for (const k of ['steward', 's1', 'worker', 'worker2']) P[k].object3d.visible = false;
  X.stream.visible = X.pourSack.visible = i === 9;
  X.dust.userData.update(t, i === 7 || i === 8 ? 1 : 0);
  // steward with the keys on his belt (shot 6), scribes at the table (shots 6, 8, 11)
  if (i === 6) { const s = P.steward; s.object3d.visible = true; s.object3d.position.set(GX + 2.0, H(GX + 2, GZ + 6), GZ + 6.0); s.object3d.rotation.y = 2.5; s.setPose('stand', t); }
  if (i === 6 || i === 8 || i === 11) {
    const s = P.s1; s.object3d.visible = true; s.object3d.position.set(GX + 4.0, H(GX + 4, GZ + 5.7), GZ + 5.75); s.object3d.rotation.y = Math.PI; s.setPose('stand', t);
    s.bones('Spine').rotation.x += 0.25; s.bones('Spine1').rotation.x += 0.15; s.object3d.updateMatrixWorld(true);
    // the reed pen scratches a tally on the tablet
    const tip = V(GX + 4.0 + 0.04 * Math.sin(t * 6), X.ty + 0.04, GZ + 5.0 + 0.02 * Math.sin(t * 3));
    K.reach(s, 'Right', tip.clone().add(V(0, 0.06, 0.05)), s.object3d.localToWorld(V(-0.6, 0.8, -0.3))); K.flatHand(s, 'Right', 1.5);
    X.pen.position.copy(tip.clone().add(V(0, 0.08, 0.03))); X.pen.rotation.set(0.5, 0, 0.2);
  }
  X.pen.visible = i === 6 || i === 8 || i === 11;
  X.beam.rotation.z = 0.06 * Math.sin(t * 1.3) * Math.exp(-0.3 * Math.max(0, t - 21.5));
  if (i === 9) {      // a worker pours grain from a sack in a golden stream onto the heap
    const w = P.worker; w.object3d.visible = true; w.object3d.position.set(GX + 2.0, H(GX + 2, GZ + 6.85), GZ + 6.85); w.object3d.rotation.y = 0.0; w.setPose('stand', t);
    w.object3d.updateMatrixWorld(true);
    const mouth = V(GX + 2.0, 1.05, GZ + 7.35);
    X.pourSack.position.copy(mouth.clone().add(V(0, 0.2, -0.1))); X.pourSack.rotation.set(2.4, 0, 0);
    K.reach(w, 'Left', mouth.clone().add(V(0.2, 0.25, -0.12)), w.object3d.localToWorld(V(0.7, 0.8, -0.2)));
    K.reach(w, 'Right', mouth.clone().add(V(-0.2, 0.3, -0.18)), w.object3d.localToWorld(V(-0.7, 0.8, -0.2)));
    const top = X.heap.position.y + 0.5 * X.heap.scale.y;
    X.stream.position.set(mouth.x, (mouth.y + top) / 2, mouth.z); X.stream.scale.set(1, mouth.y - top, 1); X.stream.userData.update(t, 1);
  }
  X.heap.scale.setScalar(0.8 + 0.2 * prog(t, 17.3, 19.0));
  // the key turns in the wooden lock and the bolt draws back (shot 10)
  const turn = E.inOutCubic(prog(t, 19.4, 20.2)), draw_ = E.inOutCubic(prog(t, 20.3, 21.2));
  X.key.rotation.z = -Math.PI / 2 * turn; X.lbolt.position.z = -0.22 * draw_; X.key.position.z = -0.05 - 0.22 * draw_;
  if (i === 10) { const w = P.worker2; w.object3d.visible = true; w.object3d.position.set(STORE.x0 - 0.75, X.store.position.y, STORE.door.z + 0.75); w.object3d.rotation.y = Math.PI / 2 + 0.6; w.setPose('stand', t);
    w.object3d.updateMatrixWorld(true); X.lock.updateMatrixWorld(true);
    K.reach(w, 'Right', X.key.localToWorld(V(0, 0, 0.03)), w.object3d.localToWorld(V(-0.6, 0.6, -0.3))); K.flatHand(w, 'Right', 1.6); }
  // the last sack is set on the pile (shot 13); before that it waits on the ground
  const lift = E.inOutCubic(prog(t, 26.0, 27.3)), top = X.pile[10].position.clone(), rest = V(GX - 6.6, H(GX - 6.6, GZ + 2.3), GZ + 2.3);
  const dst = top.clone().add(V(0.32, 0.0, 0.05)), mid = rest.clone().lerp(dst, lift).add(V(0, 0.45 * Math.sin(Math.PI * lift), 0));
  X.lifted.position.copy(mid); X.lifted.rotation.set(0, 1.2 + 0.4 * lift, 0);
  if (i === 12 || i === 13) {
    const w = P.worker; w.object3d.visible = true;
    const wx = GX - 6.3 - 0.4 * lift, wz = GZ + 2.75; w.object3d.position.set(wx, H(wx, wz), wz); w.object3d.rotation.y = Math.PI + 0.5; w.setPose('stand', t);
    w.object3d.updateMatrixWorld(true);
    if (i === 13) { const c = X.lifted.position.clone().add(V(0, 0.3, 0));
      K.reach(w, 'Left', c.clone().add(V(0.2, 0, 0.1)), w.object3d.localToWorld(V(0.7, 0.6, -0.2))); K.reach(w, 'Right', c.clone().add(V(-0.2, 0, 0.1)), w.object3d.localToWorld(V(-0.7, 0.6, -0.2))); }
    const w2 = P.worker2; w2.object3d.visible = i === 12; w2.object3d.position.set(GX - 9.2, H(GX - 9.2, GZ + 2.4), GZ + 2.4); w2.object3d.rotation.y = Math.PI - 0.3; w2.setPose('carry', t);
  }
}
