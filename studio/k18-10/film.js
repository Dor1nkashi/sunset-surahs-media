// k18-10 "He Damaged a Poor People's Boat. Wait for the Reason" (Al-Kahf 18:71, 18:79). sea_boat, clear morning.
// A short iron bar prises the waterline plank out (no person is shown doing it), water bubbles in and rises over the
// boards; a lifted hand objects; far off the king's ship takes a fine boat and passes ours by; the plank is patched.
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { sea_boat, swellAt } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 32.59, DRAFT = 0.36;
const T_PATCH = 21.03;

let ST, SET, CAP, MUSA, KHIDR, BOATMAN, HULL, GC, GN, GU, GV, TOOL, BUBBLES, PATCH, SPLINTERS, ROPES = [], SHOTS, C = {};
const XF = new THREE.Object3D();
// the boat's transform at t (the same ride() the set applies)
function boatXf(t) { const w = swellAt(0, 0, t); XF.position.set(0, -DRAFT + w.h, 0); XF.rotation.set(-Math.atan(w.dz) * 0.7, 0, Math.atan(w.dx) * 0.7); XF.updateMatrixWorld(true); return XF; }
const L2W = (t, p) => boatXf(t).localToWorld(V(...p));
// a camera given in boat coordinates (rides with the boat)
const boatCam = (t, c) => ({ pos: L2W(t, c.pos).toArray(), look: L2W(t, c.look).toArray(), fov: c.fov, roll: c.roll ?? 0 });

// story state
const damageAt = (t) => (t >= T_PATCH ? 0 : E.inOutCubic(prog(t, 0.45, 1.55)) * 0.85);
const floodAt = (t) => (t < 1.4 ? 0 : t < 7.85 ? 0.14 * prog(t, 1.4, 7.85) : t < 10.33 ? lerp(0.14, 0.42, E.inOutSine(prog(t, 7.85, 10.33))) : 0.42);
// the royal ship and the boat it seizes (world): approaching, alongside at 15.5, then towing away slowly
const DIR = V(Math.sin(0.9), 0, Math.cos(0.9)), SHIP0 = V(262, 0, -517), FINE0 = V(246, 0, -505);
const shipAt = (t) => SHIP0.clone().addScaledVector(DIR, t < 15.5 ? 3.2 * (t - 15.5) : 2.0 * (t - 15.5));
const fineAt = (t) => FINE0.clone().addScaledVector(DIR, t < 15.5 ? 0 : 2.0 * (t - 15.5));

// ------------------------------------------------------------------ props added on the hull
function hullFrame(H) {
  const v = 4.5 / 8, c = H.pt(0.5, v, 1), du = H.pt(0.51, v, 1).sub(H.pt(0.49, v, 1)).normalize(), dv = H.pt(0.5, v + 0.01, 1).sub(H.pt(0.5, v - 0.01, 1)).normalize();
  const n = new THREE.Vector3().crossVectors(dv, du).normalize(); if (n.x < 0) n.negate();
  const dv2 = new THREE.Vector3().crossVectors(n, du).normalize();
  return { c, du, dv: dv2, n };
}
function basisQ(x, y, z) { return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await sea_boat({ time: 'day' });
    const S = SET.scene, P = SET.props, boat = P.boat;
    S.environmentIntensity = 0.5; P.sun.intensity = 5.0;            // the HDRI's own sun is unshadowed: let the real sun carry the light
    HULL = P.hull;
    // a livelier sea: lower roughness for sun glints, stronger ripples, sky in the water
    { const o = P.ocean; o.roughness = 0.045; o.normalScale.set(0.9, 0.9); o.envMapIntensity = 1.05; const U = o.userData.U; U.colA.value.set(0x0b4250); U.colB.value.set(0x0b4250); U.shal.value.set(0x0b4250); }
    const F = hullFrame(HULL.H); GC = F.c; GN = F.n; GU = F.du; GV = F.dv;
    // the short iron bar (pushes out through the gap from inside, levers, then withdraws)
    const iron = W.ironMat ? W.ironMat() : new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.5, metalness: 0.8 });
    TOOL = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.46, 12).translate(0, 0.23, 0), iron); TOOL.add(bar);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.006).translate(0, 0.475, 0), iron); TOOL.add(tip);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12).translate(0, 0.07, 0), new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.7 })); TOOL.add(grip);
    W.shadows(TOOL); boat.add(TOOL);
    // fresh pale splinters on the broken plank ends (hidden behind the plank until it is prised out)
    SPLINTERS = new THREE.Group();
    const pale = new THREE.MeshStandardMaterial({ color: 0xd9c49a, roughness: 0.85 }), r = W.rng(5);
    for (const u of [0.43, 0.57]) for (let k = 0; k < 5; k++) { const p = HULL.H.pt(u + (u < 0.5 ? 0.004 : -0.004), (4 + 0.15 + 0.17 * k) / 8, 1);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.008 + 0.006 * r(), 0.012, 0.03 + 0.05 * r()), pale); s.position.copy(p).addScaledVector(GN, -0.004); s.quaternion.copy(basisQ(GN, GV, GU)); s.rotateY((r() - 0.5) * 0.6); SPLINTERS.add(s); }
    boat.add(SPLINTERS);
    // the patch: a fresh board nailed over the mended plank
    PATCH = new THREE.Group();
    const pb = W.rbox(0.2, 0.17, 0.022, new THREE.MeshStandardMaterial({ color: 0xb08c62, roughness: 0.8, map: (await W.pbr('old_planks_02', { tile: 0.8, res: 1024 })).map }), { r: 0.006, centre: true });
    pb.scale.set(5.2, 1, 1); PATCH.add(pb);
    const nail = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.4, metalness: 0.7 });
    for (let k = 0; k < 10; k++) { const nm = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), nail); nm.position.set(-0.48 + 0.96 * (k % 5) / 4, k < 5 ? 0.06 : -0.06, 0.013); PATCH.add(nm); }
    PATCH.position.copy(GC).addScaledVector(GN, 0.02); PATCH.quaternion.copy(basisQ(GU, GV, GN)); W.shadows(PATCH); boat.add(PATCH);
    // bubbles drawn toward the gap at the waterline
    const bm = new THREE.MeshStandardMaterial({ color: 0xeef4f2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 });
    BUBBLES = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bm, 70); BUBBLES.frustumCulled = false; S.add(BUBBLES);
    BUBBLES.userData.base = Array.from({ length: 70 }, (_, i) => { const q = W.rng(100 + i); return [q(), q(), q(), 0.003 + 0.009 * q(), q() * 6.28]; });
    // ropes from the royal ship to the seized boat
    const rm = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.9 });
    for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6).translate(0, 0.5, 0), rm); S.add(m); ROPES.push(m); }
    // people: Musa (only a hand, and tiny far off), the other passenger and the boatman (tiny far off)
    const PP = await K.people();
    MUSA = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#8a7458', wrap: '#9a8468', cloak: '#5a4632', sash: '#3c3024', trousers: '#9a8a70' }, beard: 'full', headwear: 'wrap', seed: 31 });
    KHIDR = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#3e5a3a', wrap: '#6a7a5a', cloak: '#2e3e2a', sash: '#4a3a2a', trousers: '#7a7060' }, beard: 'full', headwear: 'wrap', seed: 52, detail: 0.6 });
    BOATMAN = PP.make({ kind: 'man', outfit: 'worker', palette: { robe: '#8e8a80', wrap: '#a89c88', sash: '#5a4a3a', trousers: '#a89c88' }, beard: 'short', headwear: 'wrap', seed: 21, detail: 0.6 });
    for (const f of [MUSA, KHIDR, BOATMAN]) { boat.add(f.object3d); f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } }); }
    const fy = HULL.floorY;
    // camera poses: boat coordinates (b: true) ride with the boat; others are world
    const g = GC, n = GN;
    const nh = V(n.x, 0, n.z).normalize(), out = (d, up = 0, along = 0) => g.clone().addScaledVector(nh, d).add(V(0, up, along)).toArray();
    Object.assign(C, {
      hull_a:  { b: 1, pos: out(1.05, 0.42, 0.55), look: out(0, -0.02, 0.05), fov: 34 },
      hull_b:  { b: 1, pos: out(0.95, 0.38, 0.45), look: out(0, -0.02, 0.0), fov: 33 },
      gap_a:   { b: 1, pos: out(0.7, 0.3, 0.3), look: out(0, -0.03, 0.0), fov: 28 },
      gap_b:   { b: 1, pos: out(0.5, 0.24, 0.22), look: out(0, -0.03, 0.0), fov: 26 },
      wide_a:  { pos: [8.5, 2.3, 12], look: [0, 0.8, -0.3], fov: 40 },
      wide_b:  { pos: [6.2, 2.1, 13.4], look: [0, 0.8, -0.6], fov: 40 },
      shadows: { b: 1, pos: [-0.3, 2.25, -0.75], look: [-0.45, fy, -1.55], fov: 50 },
      shadows2:{ b: 1, pos: [-0.3, 2.2, -0.8], look: [-0.42, fy, -1.5], fov: 48 },
      floor:   { b: 1, pos: [0.15, fy + 0.36, -1.75], look: [0.3, fy + 0.02, 0.4], fov: 56 },
      tilt_a:  { b: 1, pos: [0.45, 1.25, 0.2], look: [0.5, fy, 1.3], fov: 54 },
      tilt_b:  { b: 1, pos: [0.45, 1.27, 0.22], look: [0.7, 3.4, 2.6], fov: 54 },
      stern:   { pos: [-0.6, 1.5, -2.6], fov: 5.5 },
      fine_a:  { pos: [-0.6, 1.5, -2.6], fov: 3.4 },
      fine_b:  { pos: [-0.6, 1.5, -2.6], fov: 2.7 },
      pass:    { b: 1, pos: [-1.0, 1.15, -0.9], fov: 24 },
      glide_a: { b: 1, pos: out(1.6, 1.0, -1.4), look: out(0, 0.1, -0.2), fov: 40 },
      glide_b: { b: 1, pos: out(0.85, 0.3, -0.35), look: out(0, 0.0, 0.0), fov: 34 },
      close:   { b: 1, pos: out(0.45, 0.1, 0.18), look: out(0, 0.0, 0.0), fov: 26 },
      far:     { b: 1, pos: [1.6, 1.0, -0.5], fov: 9 },
      patch:   { b: 1, pos: out(0.8, 0.22, -0.3), look: out(0, 0.03, 0.0), fov: 30 },
      end_a:   { pos: [5.5, 0.55, 7.5], look: [0, 0.4, 0], fov: 44 },
    });
    SHOTS = [
      { t0: 0.00, t1: 1.93, a: C.hull_a, b: C.hull_b },
      { t0: 1.93, t1: 3.85, a: C.gap_a, b: C.gap_b, ease: E.inOutSine },
      { t0: 3.85, t1: 5.85, a: C.wide_a, b: C.wide_b, ease: E.inOutSine },
      { t0: 5.85, t1: 7.85, a: C.shadows, b: C.shadows2 },
      { t0: 7.85, t1: 10.33, a: C.floor },
      { t0: 10.33, t1: 12.80, a: C.tilt_a, b: C.tilt_b, ease: E.inOutCubic },
      { t0: 12.80, t1: 15.55, a: C.stern, ship: 1 },
      { t0: 15.55, t1: 18.29, a: C.fine_a, b: C.fine_b, ship: 1 },
      { t0: 18.29, t1: 21.03, a: C.pass, ship: 2 },
      { t0: 21.03, t1: 23.77, a: C.glide_a, b: C.glide_b, ease: E.inOutCubic },
      { t0: 23.77, t1: 25.27, a: C.close },
      { t0: 25.27, t1: 27.33, a: C.far, ship: 3 },
      { t0: 27.33, t1: 29.82, a: C.patch },
      { t0: 29.82, t1: D, a: 'end' },
    ];
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t), P = SET.props, fy = HULL.floorY;
    const dmg = damageAt(t), fl = floodAt(t);
    { const bx = boatXf(t); P.boat.position.copy(bx.position); P.boat.rotation.copy(bx.rotation); P.boat.updateMatrixWorld(true); }
    // the bar: slides out through the gap (0.1-0.45), levers with the plank (0.45-1.55), withdraws (1.6-2.3)
    const ins = E.inOutCubic(prog(t, 0.1, 0.45)) * (1 - E.inOutCubic(prog(t, 1.6, 2.3)));
    TOOL.visible = ins > 0.001 && t < 3;
    if (TOOL.visible) { const lever = dmg / 0.85, ax = GN.clone().multiplyScalar(-1).addScaledVector(GV, 0.55 + 0.35 * lever).normalize();
      const tipPos = GC.clone().addScaledVector(GU, -0.33).addScaledVector(GV, -0.035).addScaledVector(GN, -0.06 + 0.11 * ins + 0.03 * lever);
      TOOL.quaternion.setFromUnitVectors(V(0, -1, 0), ax.clone().negate()); TOOL.quaternion.premultiply(new THREE.Quaternion());
      // bar points from inside (grip) to the tip at the gap
      TOOL.position.copy(tipPos).addScaledVector(ax, 0.49); TOOL.quaternion.setFromUnitVectors(V(0, 1, 0), ax.clone().negate()); }
    SPLINTERS.visible = t < T_PATCH;
    PATCH.visible = t >= T_PATCH;
    // bubbles: drawn in toward the open gap while it is open and below the water
    const mtx = new THREE.Matrix4(), on = t > 1.15 && t < T_PATCH ? clamp((dmg - 0.4) / 0.3) * (t > 12 ? 0.5 : 1) : 0;
    const gw = L2W(t, GC.toArray()), nW = GN.clone().applyQuaternion(boatXf(t).quaternion), uW = GU.clone().applyQuaternion(XF.quaternion);
    BUBBLES.userData.base.forEach(([a, b, c, rad, ph], k) => {
      const life = 1.3 + a, age = ((t * 0.9 + ph) % life) / life, d = 0.32 * (1 - age) + 0.01, along = (b - 0.5) * 0.7 * (1 - age * 0.6);
      const pt = gw.clone().addScaledVector(nW, d).addScaledVector(uW, along); const w = swellAt(pt.x, pt.z, t); pt.y = w.h + rad * 0.3;
      const sc = on > 0 ? rad * on * Math.sin(Math.PI * age) : 0; mtx.compose(pt, new THREE.Quaternion(), V(sc, sc * 0.7, sc)); BUBBLES.setMatrixAt(k, mtx);
    });
    BUBBLES.instanceMatrix.needsUpdate = true;
    // bucket floats once the water inside is deep enough
    const lvl = fy - 0.04 + 0.32 * fl; P.bucket.position.y = Math.max(fy + 0.02, lvl - 0.1) + (lvl - 0.1 > fy + 0.02 ? 0.006 * Math.sin(t * 2.1) : 0);
    P.bucket.rotation.z = lvl - 0.1 > fy + 0.02 && t < T_PATCH ? 0.05 * Math.sin(t * 1.7) : 0;
    // the king's ship and the seized boat
    const sp = shipAt(t), fp = fineAt(t); P.kingShip.position.x = sp.x; P.kingShip.position.z = sp.z; P.seizedBoat.position.x = fp.x; P.seizedBoat.position.z = fp.z;
    ROPES.forEach((m, k) => { m.visible = t > 15.2; if (!m.visible) return; const a = sp.clone().add(V(-3 + 6 * k, 2.2, 0)).addScaledVector(DIR, -2 + 4 * k), b = fp.clone().add(V(1.2, 1.0, 0)).addScaledVector(DIR, -1 + 2 * k);
      const d = b.clone().sub(a); m.position.copy(a); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); });
    // people (in boat coordinates)
    MUSA.object3d.visible = KHIDR.object3d.visible = BOATMAN.object3d.visible = false;
    if (i === 2 || i === 13) {
      for (const [f, x, z, ry, ph] of [[MUSA, 0.3, -1.95, 0.3, 0], [KHIDR, -0.3, -1.35, -0.2, 3], [BOATMAN, 0.05, -2.75, 0, 6]]) { if (i === 13 && f !== BOATMAN) continue; f.object3d.visible = true; f.object3d.position.set(x, fy, z); f.object3d.rotation.y = ry; f.setPose('stand', t + ph); }
    }
    if (i === 3) {
      // two passengers at the starboard rail looking down at the gap: only their shadows cross the boards
      for (const [f, z, ph] of [[MUSA, -1.0, 0], [KHIDR, -1.75, 2]]) { f.object3d.visible = true; f.object3d.position.set(0.42, fy, z); f.object3d.rotation.y = Math.PI / 2; f.setPose('stand', t + ph); }
      MUSA.object3d.updateMatrixWorld(true);
      const sh = MUSA.bones('RightArm').getWorldPosition(V()), tgtW = L2W(t, GC.toArray()), dir = tgtW.clone().sub(sh).normalize();
      const k = E.inOutCubic(prog(t, 6.2, 6.9)), h0 = MUSA.bones('RightHand').getWorldPosition(V());
      K.reach(MUSA, 'Right', h0.lerp(sh.clone().addScaledVector(dir, 0.55), k), sh.clone().add(V(0, -0.5, 0)));
      K.handAim(MUSA, 'Right', sh.clone().addScaledVector(dir, 1.2), 0); K.flatHand(MUSA, 'Right', 1 - 0.9 * k);
    }
    if (i === 5) {
      // standing amidships: the right hand comes up, open, in protest
      MUSA.object3d.visible = true; MUSA.object3d.position.set(-0.05, fy, -0.35); MUSA.object3d.rotation.y = 0; MUSA.setPose('stand', t);
      MUSA.object3d.updateMatrixWorld(true);
      const k = E.inOutCubic(prog(t, 10.7, 11.6)), sh = MUSA.bones('RightArm').getWorldPosition(V()), h0 = MUSA.bones('RightHand').getWorldPosition(V());
      const tgt = sh.clone().add(L2W(t, [0.18, 0.36, 0.38]).sub(L2W(t, [0, 0, 0])));
      K.reach(MUSA, 'Right', h0.lerp(tgt, k), sh.clone().add(V(0.5, -0.6, -0.2)));
      K.handAim(MUSA, 'Right', tgt.clone().add(V(0, 0.4, 0.05)), 0); K.flatHand(MUSA, 'Right', 0.1);
    }
    // camera
    let cam;
    if (s.a === 'point') {
      const h = MUSA.bones('RightHand').getWorldPosition(V()), gw2 = L2W(t, GC.toArray()), d = gw2.clone().sub(h).normalize();
      cam = { pos: h.clone().addScaledVector(d, -0.42).add(V(0, 0.08, 0)).toArray(), look: gw2.toArray(), fov: K.lensFov(42) };
    } else if (s.a === 'end') {
      // low on the water by the patched boat, then down onto the patched plank (matches shot 1)
      const k = E.inOutCubic(prog(t, 30.6, 32.4));
      const A = { pos: C.end_a.pos, look: C.end_a.look, fov: C.end_a.fov }, B = boatCam(t, C.hull_a);
      cam = K.camLerp(A, { ...B, fov: C.hull_a.fov }, k);
    } else if (s.ship) {
      const tgt = s.ship === 2 ? sp.clone().lerp(V(0, 0.6, 0), 0.0).add(V(0, 5, 0)) : sp.clone().lerp(fp, 0.4).add(V(0, 5, 0));
      let pos = s.a.b ? L2W(t, s.a.pos).toArray() : s.a.pos, fov = s.b ? Math.exp(lerp(Math.log(s.a.fov), Math.log(s.b.fov), E.inOutSine(p))) : s.a.fov;
      if (s.ship === 2) { const look = tgt.clone().add(V(0, -58 + 6 * p, 0)); cam = { pos, look: look.toArray(), fov: K.lensFov(fov) }; }
      else cam = { pos, look: tgt.toArray(), fov: K.lensFov(fov) };
      cam = K.breathe(cam, t, 0.004, 21 + i);
    } else {
      const a = s.a.b ? boatCam(t, s.a) : s.a, b = s.b ? (s.b.b ? boatCam(t, s.b) : s.b) : null;
      cam = K.camLerp(a, b, (s.ease || E.linear)(p));
      if (!s.a.b) cam = K.breathe(cam, t, 0.004, 11 + i);
    }
    G.renderSet(ctx, ST, t, u, { cam, damage: dmg, flood: fl, exposure: SET.exposure * (i === 4 ? 1.25 : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
