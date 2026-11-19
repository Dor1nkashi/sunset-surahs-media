// k18-11 "Musa Was Shocked. Then He Heard the Other Side" (Al-Kahf 18:80-81). city_of_old, golden hour then dawn.
// Nothing of what happened is shown: a hand clenched on a staff, the lane, a child far off with a hoop, the hoop rolling
// to a stop in the empty lane, two parents seated at their lamp-lit door, then inside: a shutter opens on the dawn, the
// lamp is steady, the hand loosens. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { city_of_old } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 31.0;
const RX = 40, RZ = 40, RW = 4.2, RD = 4.0, RH = 2.7;           // the room inside the family house (built apart, entered by a cut)

let ST, SET, CAP, HT, MUSA, CHILD, DAD, MUM, HAND, STAFF, HOOP, SHUT = [], SPOT, ROOMLAMP, DOOR, DUST, DUST2, SHAFT, C = {}, SHOTS, SUN0 = {};

// Musa at the lane mouth, his right hand clenched on the staff (k: 0 rest curl .. 1 tight); returns the hand position
function gripPose(t, k) {
  MUSA.object3d.position.copy(C.musaAt); MUSA.object3d.rotation.y = 0.08; MUSA.setPose('stand', t + 4);
  MUSA.object3d.updateMatrixWorld(true);
  const grip = MUSA.object3d.localToWorld(V(-0.3, 1.12, 0.22));
  K.reach(MUSA, 'Right', grip, MUSA.object3d.localToWorld(V(-0.9, 0.9, -0.5)));
  K.handAim(MUSA, 'Right', grip.clone().add(V(0.05, 0.02, 0.2)), 0);
  for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let j = 1; j <= 3; j++) { const b = MUSA.bones(`RightHand${f}${j}`); if (!b) continue; const q = b.quaternion.clone(); b.quaternion.slerp(q.clone().multiply(q).multiply(q), k); }
  MUSA.object3d.updateMatrixWorld(true);
  STAFF.position.set(grip.x + 0.035, HT(grip.x, grip.z), grip.z + 0.06); STAFF.rotation.set(0.02, 0, -0.03);
  return MUSA.bones('RightHand').getWorldPosition(V());
}
// the hoop rolls down the lane beside the child (3.39-5.28), then alone, slower, and falls over (7.3-9.6)
function hoopAt(t) {
  const x0 = 7.7, z0 = 6.2;
  let z, lean = 0, rollA, y;
  if (t < 7.18) { z = z0 + 2.6 * Math.max(0, t - 3.0); }
  else { const a = t - 7.18, v0 = 1.1, dec = 0.48, ts = v0 / dec, s = a < ts ? v0 * a - 0.5 * dec * a * a : v0 * ts - 0.5 * dec * ts * ts; z = z0 + 2.6 * 4.18 + 3.0 + s;
    const f = clamp((a - ts + 0.25) / 0.8); lean = (Math.PI / 2) * E.inQuad(f) + 0.06 * Math.sin(f * 14) * f * (1 - f); }
  rollA = -(z - z0) / 0.22;
  return { x: x0, z, lean, rollA };
}
function childAt(t) { const z = 5.6 + CHILD.speed('run') * 0.85 * Math.max(0, t - 3.0); return V(7.4, HT(7.4, z), z); }

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await city_of_old({ time: 'golden', yard: 'tools' });
    const S = SET.scene, P = SET.props; HT = P.terrain.heightAt;
    SUN0 = { pos: P.sun.position.clone(), tgt: P.sun.target.position.clone(), I: P.sun.intensity, env: S.environmentIntensity };
    // the family door: its leaf opens inward for the push through the doorway
    DOOR = P.familyHouse.userData.door;
    // the hoop the child rolls
    HOOP = W.shadows(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 12, 96), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.75 }))); S.add(HOOP);
    // ---- the room inside the house (walls cast shadows; a window with two shutter leaves on the west wall)
    const [mud, planks] = await Promise.all([W.pbr('rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }), W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 })]);
    const floorM = await W.pbr('brown_mud_dry', { tile: 2.0, res: 1024, tint: 0xd8c4a8 });
    const room = new THREE.Group(), gy = HT(RX, RZ);
    const box = (w, h, d, x, y, z, m = mud) => { const b = W.rbox(w, h, d, m, { r: 0.03, seg: 2 }); b.position.set(x, y, z); room.add(b); return b; };
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD).rotateX(-Math.PI / 2), floorM); { const uv = fl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * RW, uv.getY(i) * RD); }
    fl.position.y = 0.01; fl.receiveShadow = true; room.add(fl);
    const T = 0.3;
    box(RW + 2 * T, RH, T, 0, 0, -RD / 2 - T / 2); box(RW + 2 * T, RH, T, 0, 0, RD / 2 + T / 2); box(T, RH, RD, RW / 2 + T / 2, 0, 0);
    // west wall (x = -RW/2) with the window: sill 1.0 m, 0.8 x 0.8 opening centred at z = 0
    const WY0 = 1.0, WH = 0.8, WW = 0.8, wx = -RW / 2 - T / 2;
    box(T, WY0, RD, wx, 0, 0); box(T, RH - WY0 - WH, RD, wx, WY0 + WH, 0);
    box(T, WH, (RD - WW) / 2, wx, WY0, -(RD + WW) / 4); box(T, WH, (RD - WW) / 2, wx, WY0, (RD + WW) / 4);
    box(RW + 2 * T, 0.2, RD + 2 * T, 0, RH, 0);
    const sill = box(T + 0.08, 0.05, WW + 0.1, wx + 0.04, WY0 - 0.05, 0, planks);
    for (let k = 0; k < 6; k++) { const bm = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.07, 0.08, RW + 0.4, 12).rotateZ(Math.PI / 2)), planks); bm.position.set(0, RH - 0.08, -RD / 2 + 0.4 + k * 0.64); room.add(W.shadows(bm)); }
    // two shutter leaves hinged on the outside of the opening; they swing outward (open = away from the room)
    for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(wx - T / 2 - 0.02, WY0, sd * WW / 2); const leaf = new THREE.Group();
      for (let k = 0; k < 3; k++) { const b = W.rbox(0.03, WH - 0.02, WW / 2 / 3 - 0.006, planks, { r: 0.006 }); b.position.set(0, 0, -sd * (k + 0.5) * (WW / 2 / 3)); leaf.add(b); }
      piv.add(leaf); room.add(piv); SHUT.push({ piv, sd }); }
    // a bench and a jar so the floor light has something to cross
    const bench = box(1.2, 0.42, 0.36, 0.6, 0, -1.6, planks);
    const jar = await W.prop('planter_pot_clay', { pos: [1.5, 0, 1.4], height: 0.55 }); room.add(jar);
    W.shadows(room); room.position.set(RX, gy, RZ); S.add(room);
    // the lamp on the sill (clay lamp + flame + its light)
    { const g = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 0.85 });
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.004], [0.075, 0.025], [0.06, 0.04], [0.03, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay); body.scale.set(1, 1, 1.35); g.add(W.shadows(body));
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.035, 0.09); g.add(W.shadows(sp));
      const f = W.flame({ h: 0.09, w: 0.04, seed: 5, inten: 3.5, light: 1.6, dist: 7, planes: 2 }); f.position.set(0, 0.045, 0.115); g.add(f); g.userData.flame = f;
      g.position.set(RX + wx + 0.16, gy + WY0, RZ + 0.12); g.rotation.y = Math.PI; S.add(g); ROOMLAMP = g; }
    // the dawn: a spot from outside the window, down across the floor (shutters and walls cast its shadow)
    SPOT = new THREE.SpotLight(0xffc488, 0, 30, 0.3, 0.35, 1.2); SPOT.castShadow = true; SPOT.shadow.mapSize.set(2048, 2048); SPOT.shadow.bias = -0.0004;
    SPOT.position.set(RX + wx - 4.2, gy + WY0 + 2.2, RZ - 0.4); SPOT.target.position.set(RX + 0.4, gy, RZ + 0.1); S.add(SPOT, SPOT.target);
    SHAFT = W.lightShaft({ from: [RX + wx - 0.2, gy + WY0 + WH * 0.5, RZ], to: [RX + 0.7, gy + 0.05, RZ + 0.1], r0: 0.32, r1: 0.6, color: 0xffd09a, op: 0.05 }); S.add(SHAFT);
    DUST = K.dustMotes({ centre: [RX - 0.6, gy + 0.9, RZ], size: [2.2, 1.6, 1.4], count: 380, seed: 7, px: 0.007, op: 0.6, fall: 0.012 }); S.add(DUST);
    DUST2 = K.dustMotes({ centre: [7.6, HT(7.6, 3) + 1.1, 3.0], size: [1.6, 1.2, 1.4], count: 260, seed: 3, px: 0.008, op: 0.55, fall: -0.01 }); S.add(DUST2);
    // ---- people: Musa (hand and staff only), the child (small and far), the parents (seated backs)
    const PP = await K.people();
    MUSA = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#8a7458', wrap: '#9a8468', cloak: '#5a4632', sash: '#3c3024', trousers: '#9a8a70', skin: '#a8724c' }, beard: 'full', headwear: 'wrap', seed: 31 });
    CHILD = PP.make({ kind: 'boy', outfit: 'thobe', palette: { robe: '#d8c8a4', sash: '#8a3a2a' }, seed: 9, detail: 0.6 });
    DAD = PP.make({ kind: 'elder', outfit: 'thobe', palette: { robe: '#6a5a46', wrap: '#c8bca4', cloak: '#4a3a2c', sash: '#3a2c20' }, beard: 'grey', seed: 61, detail: 0.6 });
    MUM = PP.make({ kind: 'woman', outfit: 'abaya', palette: { abaya: '#3a3040', khimar: '#4a3a48' }, seed: 62, detail: 0.6 });
    for (const f of [MUSA, CHILD, DAD, MUM]) { S.add(f.object3d); f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } }); }
    HAND = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#8a7458', cloak: '#5a4632', skin: '#a8724c' }, beard: 'full', headwear: 'wrap', seed: 31 });
    S.add(HAND.object3d);
    STAFF = W.shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 1.75, 16).translate(0, 0.875, 0), new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: 0.62, map: planks.map }))); S.add(STAFF);
    // ---- world points and cameras
    const fd = DOOR.group.position.x, doorW = V(7.5 - fd, HT(7.5, 19.5), 19.48), lampW = V(7.5 - fd + 0.5, HT(7.5, 19.3) + 0.06, 19.35);
    C.doorW = doorW; C.lampW = lampW;
    C.musaAt = V(7.15, HT(7.15, 1.2), 1.2);
    const lw = ROOMLAMP.position;
    Object.assign(C, {
      lane_wide: { pos: [7.0, HT(7.0, 1.0) + 1.05, 1.0], look: [7.6, HT(7.6, 14) + 0.7, 14], fov: 44 },
      olive_a:   { pos: [5.6, HT(5, 5) + 1.3, 6.4], look: [4.2, HT(5, 5) + 5.5, 4.0], fov: 46 },
      olive_b:   { pos: [5.6, HT(5, 5) + 1.3, 6.4], look: [4.5, HT(5, 5) + 5.6, 3.8], fov: 45 },
      lane_low:  { pos: [7.25, HT(7.3, 9.0) + 0.32, 9.0], look: [7.7, HT(7.7, 17) + 0.25, 17], fov: 38 },
      door_a:    { pos: [7.45 - fd, doorW.y + 1.25, 14.2], look: [doorW.x, doorW.y + 0.9, doorW.z], fov: 40 },
      door_b:    { pos: [7.45 - fd, doorW.y + 1.2, 15.6], look: [doorW.x, doorW.y + 0.9, doorW.z], fov: 38 },
      flame_out: { pos: [lampW.x - 0.12, lampW.y + 0.1, lampW.z - 0.32], look: [lampW.x + 0.0, lampW.y + 0.06, lampW.z + 0.1], fov: 22 },
      push_a:    { pos: [doorW.x + 0.05, doorW.y + 1.15, 16.6], look: [doorW.x, doorW.y + 1.0, doorW.z + 2], fov: 44 },
      push_b:    { pos: [doorW.x + 0.02, doorW.y + 1.05, 19.15], look: [doorW.x, doorW.y + 0.95, doorW.z + 2], fov: 50 },
      window:    { pos: [RX + 1.3, HT(RX, RZ) + 1.35, RZ + 1.5], look: [RX + wx, HT(RX, RZ) + 1.15, RZ - 0.1], fov: 46 },
      lamp_a:    { pos: [lw.x + 1.25, lw.y + 0.45, lw.z + 1.0], look: [lw.x, lw.y - 0.35, lw.z - 0.1], fov: 40 },
      lamp_b:    { pos: [lw.x + 1.0, lw.y + 0.4, lw.z + 0.8], look: [lw.x, lw.y - 0.3, lw.z - 0.1], fov: 38 },
      cup:       { pos: [lw.x + 0.4, lw.y + 0.1, lw.z + 0.08], look: [lw.x, lw.y + 0.07, lw.z - 0.0], fov: 26 },
      sill:      { pos: [RX + 0.5, HT(RX, RZ) + 1.25, RZ + 0.75], look: [RX + wx, HT(RX, RZ) + 1.05, RZ - 0.05], fov: 40 },
      lampwin:   { pos: [lw.x + 0.9, lw.y + 0.18, lw.z + 0.4], look: [lw.x - 0.2, lw.y + 0.1, lw.z - 0.05], fov: 36 },
      gold_a:    { pos: [lw.x + 0.36, lw.y + 0.07, lw.z + 0.12], look: [lw.x - 0.05, lw.y + 0.07, lw.z - 0.01], fov: 30 },
      gold_b:    { pos: [lw.x + 0.24, lw.y + 0.07, lw.z + 0.08], look: [lw.x - 0.05, lw.y + 0.07, lw.z - 0.01], fov: 28 },
    });
    SHOTS = [
      { t0: 0.00, t1: 1.69, a: 'grip' },
      { t0: 1.69, t1: 3.39, a: 'rack' },
      { t0: 3.39, t1: 5.28, a: C.lane_wide },
      { t0: 5.28, t1: 7.18, a: C.olive_a, b: C.olive_b },
      { t0: 7.18, t1: 9.69, a: C.lane_low },
      { t0: 9.69, t1: 12.20, a: C.door_a, b: C.door_b, ease: E.inOutSine },
      { t0: 12.20, t1: 14.72, a: C.flame_out },
      { t0: 14.72, t1: 17.17, a: C.push_a, b: C.push_b, ease: E.inCubic },
      { t0: 17.17, t1: 19.62, a: C.window, room: 1 },
      { t0: 19.62, t1: 22.07, a: C.lamp_a, b: C.lamp_b, room: 1, ease: E.inOutSine },
      { t0: 22.07, t1: 24.22, a: 'grip', loosen: 1 },
      { t0: 24.22, t1: 25.89, a: C.cup, room: 1 },
      { t0: 25.89, t1: 27.89, a: C.sill, room: 1 },
      { t0: 27.89, t1: 29.45, a: C.lampwin, room: 1 },
      { t0: 29.45, t1: D, a: C.gold_a, b: C.gold_b, room: 1, ease: E.inOutSine },
    ];
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t), P = SET.props, S = SET.scene;
    // light: outside golden; inside the room the dawn spot carries the light and the sun shadow box follows us in
    const inRoom = !!s.room;
    if (inRoom) { P.sun.intensity = 0.0; S.environmentIntensity = SUN0.env * 0.18; }
    else { P.sun.intensity = SUN0.I; S.environmentIntensity = SUN0.env; }
    // the shutters: closed until 17.6, swing open by 18.6; then the dawn grows
    const op = E.inOutCubic(prog(t, 17.6, 18.7)), dawn = t < 17.17 ? 0 : op * (0.75 + 0.25 * prog(t, 18.7, D));
    SHUT.forEach(({ piv, sd }) => { piv.rotation.y = sd * -1.9 * op; });
    SPOT.intensity = 520 * dawn; SHAFT.visible = dawn > 0.02; SHAFT.material.uniforms.op.value = 0.05 * dawn;
    DUST.userData.update(t, inRoom ? 0.3 + 0.7 * dawn : 0); DUST2.userData.update(t, i <= 1 || i === 10 ? 1 : 0);
    // the lamp on the sill: a steady flame; the room lamp is unlit outside the room shots
    ROOMLAMP.userData.flame.userData.update(t, inRoom ? 1 : 0);
    // the family door opens inward during the push
    DOOR.leaf.rotation.y = -1.25 * E.inOutSine(prog(t, 14.9, 16.4));
    // the hoop
    const h = hoopAt(t); HOOP.position.set(h.x, HT(h.x, h.z) + 0.224 * Math.cos(h.lean), h.z); HOOP.rotation.set(0, Math.PI / 2, 0); HOOP.rotateZ(h.rollA * 0); HOOP.rotateX(0);
    HOOP.rotation.set(h.rollA, Math.PI / 2, 0, 'YXZ'); HOOP.rotation.z = h.lean;
    if (h.lean > 0) HOOP.position.x = h.x + 0.224 * Math.sin(h.lean);
    HOOP.visible = i >= 2 && i <= 4;
    // people
    for (const f of [MUSA, CHILD, DAD, MUM, HAND]) f.object3d.visible = false; STAFF.visible = false;
    if (i === 2) { const c = childAt(t); CHILD.object3d.visible = true; CHILD.object3d.position.copy(c); CHILD.object3d.rotation.y = 0; CHILD.setPose('run', t);
      // the two travellers walk behind the camera: only their long shadows reach into the lane
      for (const [f, dx, ph] of [[MUSA, -0.5, 0], [DAD, 0.55, 0.4]]) { const z = -1.4 + f.speed('walk') * 0.8 * (t - 3.39); f.object3d.visible = true; f.object3d.position.set(7.2 + dx, HT(7.2 + dx, z), z); f.object3d.rotation.y = 0; f.setPose('walk', t + ph); } }
    if (i === 5 || i === 7) {
      // the parents kneel side by side before their door, a space between them
      for (const [f, dx, ph] of [[DAD, -0.62, 0], [MUM, 0.58, 3]]) { f.object3d.visible = true; f.object3d.position.set(C.doorW.x + dx, HT(C.doorW.x + dx, 18.55), 18.55); f.object3d.rotation.y = 0; f.setPose('kneel', t + ph); }
    }
    if (s.a === 'grip' || s.a === 'rack') {
      const k = s.loosen ? 1 - 0.85 * E.inOutSine(prog(t, 22.4, 23.6)) : s.a === 'rack' ? 1 : 0.6 + 0.4 * E.outCubic(prog(t, 0.05, 0.6));
      C.handW = gripPose(t, k); MUSA.object3d.visible = true; STAFF.visible = true;
    }
    if (i === 11) {
      // a hand cups the flame from behind it
      HAND.object3d.visible = true; const lw = ROOMLAMP.position; HAND.object3d.position.set(lw.x - 0.0, lw.y - 1.0, lw.z - 0.55); HAND.object3d.rotation.y = 0.0; HAND.setPose('stand', t);
      HAND.object3d.updateMatrixWorld(true);
      const k = E.inOutCubic(prog(t, 24.3, 25.0)), tgt = V(lw.x - 0.02, lw.y + 0.07, lw.z - 0.06), h0 = HAND.bones('RightHand').getWorldPosition(V());
      K.reach(HAND, 'Right', h0.lerp(tgt, k), V(lw.x - 0.6, lw.y - 0.4, lw.z - 0.6));
      K.handAim(HAND, 'Right', tgt.clone().add(V(0.0, 0.12, 0.1)), 0.6); K.flatHand(HAND, 'Right', 1.0);
    }
    // camera
    let cam;
    if (s.a === 'grip' || s.a === 'rack') {
      const hp = C.handW.clone();
      if (s.a === 'grip') { const k = s.loosen ? 0 : E.inOutSine(p); cam = { pos: hp.clone().add(V(0.42 - 0.04 * k, -0.04, -0.3 + 0.03 * k)).toArray(), look: hp.clone().add(V(0.0, 0.0, 0.05)).toArray(), fov: K.lensFov(24) }; }
      else { const k = E.inOutCubic(p), a = hp.clone().add(V(0.42, -0.04, -0.27)), b = V(7.0, HT(7.0, 1.0) + 1.0, 0.6);
        cam = { pos: a.lerp(b, k).toArray(), look: hp.clone().add(V(0, 0, 0.05)).lerp(V(7.6, HT(7.6, 14) + 0.9, 14), k).toArray(), fov: K.lensFov(lerp(24, 42, k)) };
        // the hand stays in the shot only while the camera is still close: keep the figure posed from the grip shot
        MUSA.object3d.visible = k < 0.5; STAFF.visible = k < 0.5; }
    } else {
      cam = K.camLerp(s.a, s.b, (s.ease || E.linear)(p));
      cam = K.breathe(cam, t, s.b ? 0.0012 : 0.002, 11 + i);
    }
    const expo = SET.exposure * (inRoom ? 1.5 + 0.4 * dawn : i === 6 ? 0.9 : 1);
    G.renderSet(ctx, ST, t, u, { cam, exposure: expo, lights: i >= 5 ? 1 : 0.4 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.55);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
