// k18-08 "He Would Not Stop Traveling Until He Found a Teacher" (Al-Kahf 18:60, 18:65). The track to the two seas.
// A staff tip and a sandalled foot on cracked earth; the long track and two long shadows; two tiny backs in the heat
// shimmer, the taller points to the horizon; up to the sea line where two colours meet; the staff points at it; the
// shadows reach the wet sand; far down the beach a small robed back on a rock; the staff planted; the footprints back
// to the road; the seam in the water; the staff upright in the wet sand (loop).
// Musa and his servant appear only as a staff, a foot, a hand, a cloak edge, shadows and tiny far-off backs; the seated
// figure only as a small far-off robed back. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { confluence } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 29.52;

let SET, ST, CAP, hy, TALL, YOUNG, SEAT, STAFF, DUST, SHIM;
const C = {};
// the track: from far inland (z = 140) down to the shore near the rock, along x = trX(z)
const trX = (z) => -14 + 17.4 * W.sstep(70, 4, z) + 2.2 * Math.sin(z / 23);
let SEAT_AT = [9, 2.76], SEAT_Y = 0.9;                  // the far rock down the beach (set slot 'seated_figure')
const PLANT = [3.8, 5.6];                                 // where the staff is planted on the wet sand
// the leader's distance along the track (z) through the film
const walkZ = (t) => t < 12.99 ? 120 - 6.5 * t : 7.4 - 0.6 * clamp(t - 12.99, 0, 1.8);

const SHOTS = [
  { t0: 0.00, t1: 1.73, cam: 'foot' },
  { t0: 1.73, t1: 3.45, cam: 'track' },
  { t0: 3.45, t1: 6.27, cam: 'backs' },
  { t0: 6.27, t1: 8.51, cam: 'rise' },
  { t0: 8.51, t1: 10.75, cam: 'point' },
  { t0: 10.75, t1: 12.99, a: 'seam_wide' },
  { t0: 12.99, t1: 15.63, cam: 'shore' },
  { t0: 15.63, t1: 18.28, cam: 'push' },
  { t0: 18.28, t1: 20.92, a: 'seat_a', b: 'seat_b', ease: E.inOutSine },
  { t0: 20.92, t1: 23.02, a: 'planted' },
  { t0: 23.02, t1: 24.63, a: 'prints_a', b: 'prints_b', ease: E.inOutSine },
  { t0: 24.63, t1: 27.04, a: 'seam_a', b: 'seam_b' },
  { t0: 27.04, t1: D, a: 'upright' },
];

function placeWalker(p, z, side, t, off) {
  const dz = 0.3, x = trX(z) + side, yaw = Math.atan2(trX(z - dz) - trX(z + dz), -2 * dz);
  K.place(p, x, hy(x, z), z, yaw); p.setPose('walk', t + off);
}
function staffInHand(p, t, swing = true) {
  // the staff is held in the tall man's left hand; its tip swings forward with the stride
  p.object3d.updateMatrixWorld(true);
  const h = K.handPos(p, 'Left'), fwd = K.onBody(p, 0, 0, 1).sub(p.object3d.position).normalize();
  const ph = swing ? Math.sin(t * Math.PI * 2 * 0.9) : 0, tip = h.clone().addScaledVector(fwd, 0.35 + 0.15 * ph); tip.y = hy(tip.x, tip.z) + Math.max(0, 0.05 * ph);
  const top = h.clone().add(h.clone().sub(tip).normalize().multiplyScalar(0.55));
  STAFF.position.copy(tip); STAFF.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(tip).normalize()); STAFF.visible = true;
}

function posePeople(t, i) {
  TALL.object3d.visible = YOUNG.object3d.visible = SEAT.object3d.visible = false; STAFF.visible = false;
  if (i <= 3 || i === 6) {
    const z = walkZ(t), stop = i === 2 && t > 4.6;
    placeWalker(TALL, z, -0.32, t, 0); placeWalker(YOUNG, z + 0.9, 0.42, t, 0.45);
    if (stop) { TALL.setPose('stand', t); TALL.object3d.updateMatrixWorld(true);
      const k = E.inOutSine(prog(t, 4.7, 5.4)), h0 = K.handPos(TALL, 'Right'); K.reach(TALL, 'Right', h0.lerp(K.onBody(TALL, -0.25, 1.75, 0.55), k), K.onBody(TALL, -0.8, 1.0, -0.3)); }
    if (i === 6) { const s = t > 13.6; if (s) { TALL.setPose('stand', t); YOUNG.setPose('stand', t + 1); } }
    TALL.object3d.visible = YOUNG.object3d.visible = true; staffInHand(TALL, t, !(i === 6 && t > 13.6));
  }
  if (i === 4) {
    // the staff raised and pointed toward the seam; the hand on it does not move
    const z = 14; K.place(TALL, trX(z) - 0.3, hy(trX(z), z), z, Math.PI + 0.12); TALL.setPose('stand', 2); TALL.object3d.visible = true;
    const grip = K.onBody(TALL, -0.12, 1.35, 0.45); K.reach(TALL, 'Left', grip, K.onBody(TALL, 0.8, 0.8, -0.3));
    const dir = V(2.8, -0.05, -40).sub(grip).normalize(); STAFF.position.copy(grip).addScaledVector(dir, -0.7); STAFF.quaternion.setFromUnitVectors(V(0, 1, 0), dir); STAFF.visible = true;
  }
  if (i >= 7 && i <= 8) { K.place(SEAT, SEAT_AT[0], SEAT_Y - 0.42, SEAT_AT[1] - 0.6, Math.PI); SEAT.setPose('stand', 1); K.sit(SEAT, 0.42, { lean: 10, footFwd: 0.3 }); SEAT.object3d.visible = true; }
  if (i === 7 || i >= 9) { STAFF.position.set(PLANT[0], hy(...PLANT) - 0.12, PLANT[1]); STAFF.quaternion.setFromEuler(new THREE.Euler(0.02, 0, -0.05)); STAFF.visible = i !== 10 && i !== 11 ? true : i === 11 ? false : true; }
  if (i === 9) { // a cloak edge flutters by the staff (the tall man stands beside it, seen from the knees down)
    K.place(TALL, PLANT[0] + 0.42, hy(...PLANT), PLANT[1] + 0.15, Math.PI); TALL.setPose('stand', t); TALL.object3d.visible = true; }
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await confluence({ time: 'day' });
    hy = SET.props.terrain.heightAt;
    { const sl = SET.group.getObjectByName('people_slots')?.getObjectByName('seated_figure'); if (sl) { SET.group.updateMatrixWorld(true); const w = sl.getWorldPosition(V()); SEAT_AT = [w.x, w.z]; SEAT_Y = w.y; } }
    const S = SET.scene;
    // the dusty track: a pale worn band laid over the plain
    { const pts = []; for (let z = 150; z >= 2; z -= 1) pts.push([trX(z), z]);
      const g = new THREE.BufferGeometry(), pos = [], idx = [];
      pts.forEach(([x, z], k) => { for (const s of [-1, 1]) pos.push(x + s * 1.1, hy(x + s * 1.1, z) + 0.012, z); if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const r = W.rng(5);
      for (let k = 0; k < 3000; k++) { const a = 0.05 + 0.12 * r(); x.fillStyle = `rgba(${200 + 40 * r() | 0},${180 + 30 * r() | 0},${140 + 30 * r() | 0},${a})`; x.fillRect(r() * 64, r() * 256, 2, 2); }
      const gr = x.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.25, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
      const uv = []; pts.forEach((_, k) => { uv.push(0, k / 8, 1, k / 8); }); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const tx = new THREE.CanvasTexture(c); tx.wrapT = THREE.RepeatWrapping;
      const m = new THREE.MeshStandardMaterial({ color: 0xe8d8b8, map: tx, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const band = new THREE.Mesh(g, m); band.receiveShadow = true; S.add(band); }
    // dust puffs at the staff tip and the foot (shot 1)
    DUST = K.dustMotes({ centre: [0, 0.1, 0], size: [0.5, 0.2, 0.5], count: 120, seed: 9, px: 0.012, op: 0.45, fall: -0.02, color: 0xd8c8a8 }); DUST.material.blending = THREE.NormalBlending; S.add(DUST);
    // heat shimmer: a refraction-like wobble is done in 2-D (draw), on the far band of the frame
    const PE = await K.people();
    TALL = PE.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#8a7458', wrap: '#9a8468', cloak: '#5a4632', sash: '#3c3024', trousers: '#9a8a70', skin: '#7e5234' }, beard: 'full', headwear: 'wrap', seed: 31, detail: 0.8 });
    YOUNG = PE.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#c8b89a', wrap: '#b49a74', cloak: '#7a6a52', sash: '#5a3a2a', trousers: '#b0a080', skin: '#8a5a3a' }, beard: 'none', headwear: 'wrap', seed: 44, detail: 0.6 });
    SEAT = PE.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#2e5a3a', cloak: '#24462e', wrap: '#e8e0cc', sash: '#2e5a3a', trousers: '#2e5a3a' }, beard: 'none', headwear: 'wrap', seed: 90, detail: 0.6 });
    for (const f of [TALL, YOUNG, SEAT]) S.add(f.object3d);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.7 });
    STAFF = W.shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.7, 14).translate(0, 0.85, 0), wood)); S.add(STAFF);
    // cameras
    C.seam_wide = { pos: [-10, hy(-10, 28) + 1.6, 28], look: [2.8, 0.2, -120], fov: 34 };
    C.seat_a = { pos: [5.0, hy(5, 8) + 1.4, 8.0], look: [SEAT_AT[0], SEAT_Y + 0.35, SEAT_AT[1]], fov: 20 };
    C.seat_b = { pos: [5.2, hy(5.2, 7.8) + 1.38, 7.8], look: [SEAT_AT[0], SEAT_Y + 0.35, SEAT_AT[1]], fov: 14 };
    C.planted = { pos: [PLANT[0] - 0.75, hy(...PLANT) + 0.42, PLANT[1] + 1.05], look: [PLANT[0] + 0.05, hy(...PLANT) + 0.55, PLANT[1]], fov: 40 };
    C.prints_a = { pos: [trX(6.5) + 0.3, hy(trX(6.5), 6.5) + 0.4, 6.5], look: [trX(20), hy(trX(20), 20) + 0.2, 20], fov: 38 };
    C.prints_b = { pos: [trX(8) + 0.3, hy(trX(8), 8) + 0.45, 8], look: [trX(22), hy(trX(22), 22) + 0.25, 22], fov: 38 };
    C.seam_a = { pos: [2.0, 2.4, 0.6], look: [2.8, 0, -9], fov: 40 };
    C.seam_b = { pos: [2.05, 2.35, 0.4], look: [2.8, 0, -9.5], fov: 40 };
    C.upright = { pos: [PLANT[0] - 0.6, hy(PLANT[0], PLANT[1] + 2.4) + 0.65, PLANT[1] + 2.4], look: [PLANT[0] + 0.8, 0.7, PLANT[1] - 12], fov: 46 };
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-08] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    posePeople(t, i);
    let cam;
    if (s.cam === 'foot') { const z = walkZ(t), x = trX(z); cam = { pos: [x + 0.2, hy(x, z - 1.4) + 0.28, z - 1.5], look: [x - 0.2, hy(x, z) + 0.15, z], fov: K.lensFov(40) }; }
    else if (s.cam === 'track') { const k = E.inOutSine(p), z = 52 - 4 * k; cam = { pos: [trX(z) + 0.4, hy(trX(z), z) + 1.6, z], look: [trX(z - 60), hy(trX(z - 60), z - 60) + 0.6, z - 60], fov: K.lensFov(40) }; }
    else if (s.cam === 'backs') { const z = walkZ(4.86); cam = { pos: [trX(z + 90) + 1.5, hy(trX(z + 90), z + 90) + 1.7, z + 90], look: [trX(z), hy(trX(z), z) + 1.0, z], fov: K.lensFov(7) }; }
    else if (s.cam === 'rise') { const k = E.inOutSine(p), z = walkZ(7.4) + 5, x = trX(z); cam = { pos: [x + 0.6, hy(x, z) + 1.5 + 9 * k, z + 3 * k], look: [trX(z - 30) * (1 - k) + 2.8 * k, 1 * (1 - k), (z - 30) * (1 - k) - 300 * k], fov: K.lensFov(36) }; }
    else if (s.cam === 'point') { const z = 14, x = trX(z) - 0.3; cam = { pos: [x - 0.45, hy(x, z) + 1.25, z + 1.1], look: [2.8, 0.4, -60], fov: K.lensFov(30) }; }
    else if (s.cam === 'shore') { const z = 7.4; cam = { pos: [trX(z) - 0.2, hy(trX(z), z + 2.6) + 0.32, z + 2.6], look: [trX(z) + 0.3, 0.02, z - 3.2], fov: K.lensFov(44) }; }
    else if (s.cam === 'push') { const k = E.inOutSine(p), a = V(PLANT[0] - 1.3, hy(...PLANT) + 1.2, PLANT[1] + 2.0), b = V(PLANT[0] + 0.5, hy(...PLANT) + 1.25, PLANT[1] - 0.2); const pos = a.lerp(b, k);
      cam = { pos: pos.toArray(), look: [SEAT_AT[0], SEAT_Y + 0.3, SEAT_AT[1]], fov: K.lensFov(28 - 6 * k) }; }
    else cam = K.camLerp(C[s.a], s.b ? C[s.b] : null, (s.ease || E.linear)(p));
    cam = K.breathe(cam, t, 0.002, 4 + i);
    // dust at the staff tip / footfalls
    { const z = walkZ(t); DUST.position.set(trX(z) - 0.4, hy(trX(z), z), z - 0.2); DUST.userData.update(t, i === 0 ? 1 : 0); }
    // the seated figure's hem lifts in the breeze
    if (SEAT.object3d.visible) K.tilt(SEAT, 'Spine', 0.6 * Math.sin(t * 1.3), 0, 0);
    // afternoon: the sun lowers toward the shore shots
    SET.props.sun.intensity = 3.4 - 0.9 * E.inOutSine(prog(t, 12.0, 15.0));
    G.renderSet(ctx, ST, t, u, { cam, fish: 1, exposure: SET.exposure * (i === 11 ? 0.6 : i === 12 ? 0.85 : 1) });
    // heat shimmer on the far band (shots 2-4, 6): a gentle horizontal wobble of thin strips near the horizon
    if (i === 1 || i === 2 || i === 3 || i === 5) {
      const y0 = M.H * (M.FORMAT.portrait ? 0.4 : 0.38), h = M.H * 0.08, src = ctx.canvas;
      for (let y = 0; y < h; y += 4) { const dx = 2.2 * Math.sin(t * 9 + y * 0.35) * (1 - y / h); ctx.drawImage(src, 0, y0 + y, M.W, 4, dx, y0 + y, M.W, 4); }
    }
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
