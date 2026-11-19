// k18-15 "If the Sea Were Ink, It Would Still Run Out" (Al-Kahf 18:109). night_shore.
// A reed pen dips into the ink, a bead falls and rings spread; match cut from the ink's moon glint to the sea; the pen
// draws abstract gold strokes (no legible text); the ink level falls; the sea draws back down the shore, farther and
// farther; the empty inkwell with its dry ring; the pen laid down; a drop of ink on a fingertip falls (loop).
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { night_shore } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 25.43;

let ST, SET, CAP, HAND, PEN, BEAD, RINGS = [], DRYRING, TY, WELL, PARCH, C = {}, SHOTS, PEN0;

// the parchment strokes run right to left along x (setWriting reveals 1 - u < q); the pen tip follows the reveal front
function strokeTip(q, t) {
  const W0 = PARCH.position.x - 0.25, k = Math.floor(clamp(q, 0, 0.999) * 7), f = (clamp(q, 0, 0.999) * 7) % 1;
  const x = PARCH.position.x + 0.25 - 0.5 * (0.12 + 0.76 * f), z = PARCH.position.z - 0.185 + 0.37 * ((120 + k * 85) / 768) + 0.008 * Math.sin(f * 28 + k);
  return V(x, TY + 0.006, z);
}
function lerp3(a, b, k) { return a.clone().lerp(b, k); }
// the pen: tip position and lean (the shaft points up and back toward the hand)
function penAt(t, i) {
  const wellTop = V(WELL.position.x, TY + 0.06, WELL.position.z);
  const rest = V(PEN0.x, TY + 0.012, PEN0.z);
  let tip = rest.clone(), lie = 1;
  if (t < 1.61 || i === 0) { const dip = Math.sin(Math.PI * clamp((t - 0.1) / 1.1)); tip = wellTop.clone().add(V(0.0, 0.035 - 0.05 * dip, 0)); lie = 0; }
  else if (t < 5.28) { tip = wellTop.clone().add(V(0.02, 0.08, 0.02)); lie = 0; }
  else if (t < 6.36) { const k = E.inOutCubic(prog(t, 5.28, 6.2)); tip = lerp3(wellTop.clone().add(V(0.02, 0.08, 0.02)), strokeTip(0, t).add(V(0, 0.002, 0)), k); lie = 0; }
  else if (t < 9.0) { tip = strokeTip(writingAt(t), t); lie = 0; }
  else if (t < 20.22) { tip = rest; lie = 1; }
  else { const k = E.inOutCubic(prog(t, 20.4, 21.4)); tip = lerp3(strokeTip(0.6, t).add(V(0, 0.03, 0)), rest, k); lie = k; }
  return { tip, lie };
}
const writingAt = (t) => (t < 6.36 ? 0 : lerp(0, 0.62, E.inOutSine(prog(t, 6.4, 9.0))));
const inkAt = (t) => (t < 9.0 ? 0.05 : t < 11.64 ? lerp(0.05, 0.8, E.inOutSine(prog(t, 9.0, 11.64))) : t < 16.92 ? 0.8 : 1.0);
const tideAt = (t, i) => (i === 6 ? lerp(0.0, 0.45, E.inOutSine(prog(t, 11.64, 14.28))) : i === 7 ? lerp(0.45, 1.0, E.inOutSine(prog(t, 14.28, 16.92))) : i === 9 ? 0.35 + 0.25 * E.inOutSine(prog(t, 18.63, 20.22)) : 0);

let _ring = null;
function ringTex() {
  if (_ring) return _ring;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0)'); g.addColorStop(0.9, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return (_ring = new THREE.CanvasTexture(c));
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await night_shore();
    const S = SET.scene, P = SET.props;
    WELL = P.inkwell; PARCH = P.parchment; PEN = P.pen; PEN0 = PEN.position.clone(); TY = WELL.position.y;
    // the bead of ink and the rings it makes on the ink surface
    BEAD = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x050407, roughness: 0.02, clearcoat: 1 })); S.add(BEAD);
    for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9aa8c8 })); r.renderOrder = 7; S.add(r); RINGS.push(r); }
    // the dry ring where the ink stood
    DRYRING = new THREE.Mesh(new THREE.TorusGeometry(0.0203, 0.0012, 8, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
    DRYRING.position.set(WELL.position.x, TY + 0.068 - 0.035 * 0.05, WELL.position.z); S.add(DRYRING);
    // the writer: one figure behind the table (only the hand, the sleeve and a fingertip are framed)
    const PP = await K.people();
    HAND = PP.make({ kind: 'man', outfit: 'thobe', palette: { robe: '#e8e0cc', wrap: '#ddd2bc', sash: '#5a4a38', skin: '#9a6a48' }, beard: 'short', headwear: 'wrap', seed: 160 });
    S.add(HAND.object3d); HAND.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } });
    // a soft moon key on the table (the set's moon is far and dim)
    const key = new THREE.SpotLight(0xb8c8ff, 6, 8, 0.5, 0.6, 1.5); key.position.set(-1.8, TY + 2.2, -1.2); key.target.position.set(0, TY, 0.6); S.add(key, key.target);
    const wx = WELL.position.x, wz = WELL.position.z, px = PARCH.position.x, pz = PARCH.position.z;
    Object.assign(C, {
      dip:     { pos: [wx + 0.11, TY + 0.13, wz + 0.12], look: [wx, TY + 0.06, wz], fov: 30 },
      bead_a:  { pos: [wx + 0.09, TY + 0.11, wz + 0.1], look: [wx, TY + 0.064, wz], fov: 26 },
      bead_b:  { pos: [wx + 0.075, TY + 0.1, wz + 0.085], look: [wx, TY + 0.064, wz], fov: 25 },
      pull_a:  { pos: [wx + 0.06, TY + 0.11, wz + 0.09], look: [wx - 0.02, TY + 0.06, wz - 0.05], fov: 28 },
      pull_b:  { pos: [1.4, TY + 0.55, 2.3], look: [-1.0, TY - 0.6, -9], fov: 46 },
      table:   SET.cameras.hero,
      write_a: { pos: [px + 0.15, TY + 0.38, pz + 0.38], look: [px + 0.05, TY, pz], fov: 36 },
      write_b: { pos: [px - 0.08, TY + 0.38, pz + 0.38], look: [px - 0.08, TY, pz], fov: 36 },
      level:   { pos: [wx + 0.1, TY + 0.15, wz + 0.1], look: [wx, TY + 0.05, wz], fov: 28 },
      shore:   { pos: [1.6, 0.45, 1.2], look: [-0.8, -0.2, -6], fov: 44 },
      far_a:   { pos: [1.8, 0.6, 1.6], look: [-0.8, -0.3, -7], fov: 44 },
      far_b:   { pos: [2.6, 1.3, 3.6], look: [-0.8, -0.4, -8], fov: 48 },
      empty:   { pos: [wx + 0.08, TY + 0.14, wz + 0.09], look: [wx, TY + 0.04, wz], fov: 26 },
      wave:    { pos: [0.8, 0.3, -0.6], look: [-0.5, -0.15, -4.5], fov: 40 },
      laid:    { pos: [PEN0.x + 0.22, TY + 0.2, PEN0.z + 0.28], look: [PEN0.x - 0.02, TY, PEN0.z], fov: 32 },
      finger:  null,
    });
    SHOTS = [
      { t0: 0.00, t1: 1.61, a: C.dip },
      { t0: 1.61, t1: 3.21, a: C.bead_a, b: C.bead_b, ease: E.inOutSine },
      { t0: 3.21, t1: 5.28, a: C.pull_a, b: C.pull_b, ease: E.inOutCubic },
      { t0: 5.28, t1: 6.36, a: C.table },
      { t0: 6.36, t1: 9.00, a: C.write_a, b: C.write_b, ease: E.inOutSine },
      { t0: 9.00, t1: 11.64, a: C.level },
      { t0: 11.64, t1: 14.28, a: C.shore },
      { t0: 14.28, t1: 16.92, a: C.far_a, b: C.far_b, ease: E.inOutSine },
      { t0: 16.92, t1: 18.63, a: C.empty },
      { t0: 18.63, t1: 20.22, a: C.wave },
      { t0: 20.22, t1: 22.91, a: C.laid },
      { t0: 22.91, t1: D, a: 'finger' },
    ];
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    // the pen
    const pn = penAt(t, i);
    if (pn.lie > 0.999) { PEN.position.copy(PEN0); PEN.rotation.set(Math.PI / 2, 0, 0.35); }
    else { const up = V(0.35, 1, 0.55).normalize().lerp(V(-Math.sin(0.35), 0.02, Math.cos(0.35)).normalize(), pn.lie).normalize();
      PEN.position.copy(pn.tip).addScaledVector(up, 0.15); PEN.quaternion.setFromUnitVectors(V(0, 1, 0), up); }
    // the bead: swells on the nib (0.6-1.0), falls (1.0-1.2) into the ink; again in shot 2 (1.9-2.3)
    const inkY = TY + 0.068 - 0.035 * inkAt(t), wx = WELL.position.x, wz = WELL.position.z;
    const drops = [[1.0, wx + 0.003, wz + 0.002], [2.1, wx - 0.004, wz + 0.003]];
    BEAD.visible = false;
    for (const [td, bx, bz] of drops) { const a = t - td; if (a > -0.4 && a < 0.2) { BEAD.visible = true; const fall = Math.max(0, a); const sw = clamp((a + 0.4) / 0.4); BEAD.scale.setScalar(0.4 + 0.6 * sw); BEAD.position.set(bx, Math.max(inkY, TY + 0.088 - 4.9 * fall * fall), bz); if (BEAD.position.y <= inkY + 0.0005 && a > 0) BEAD.visible = false; } }
    RINGS.forEach((r, k) => { const [td, bx, bz] = drops[k % 2 === 0 ? 0 : 1], a = t - td - 0.06 - 0.12 * (k === 2 ? 1 : 0); r.visible = a > 0 && a < 1.4 && t < 3.3;
      if (!r.visible) return; const rad = 0.002 + 0.012 * Math.sqrt(a); r.scale.set(rad * 2, 1, rad * 2); r.position.set(bx, inkY + 0.0004, bz); r.material.opacity = 0.7 * (1 - a / 1.4); });
    DRYRING.visible = inkAt(t) > 0.5;
    // the hand: holds the pen while it is lifted; a fingertip with a drop in the last shot
    HAND.object3d.visible = false;
    const handOn = (i <= 1) || (i === 4) || (i === 3 && t < 6.0) || (i === 10 && t < 21.6);
    if (handOn) {
      HAND.object3d.visible = true; HAND.object3d.position.set(0.12, SET.props.terrain.heightAt(0.12, 1.25), 1.25); HAND.object3d.rotation.y = Math.PI; HAND.setPose('stand', t);
      HAND.object3d.updateMatrixWorld(true);
      const grip = PEN.localToWorld(V(0, 0.02, 0)), k = i === 10 ? 1 - E.inOutCubic(prog(t, 21.0, 21.6)) : 1, h0 = HAND.bones('RightHand').getWorldPosition(V());
      K.reach(HAND, 'Right', h0.lerp(grip, k), grip.clone().add(V(0.3, -0.3, 0.4)));
      K.handAim(HAND, 'Right', grip.clone().add(PEN.localToWorld(V(0, -0.1, 0)).sub(grip)), Math.PI / 2); K.flatHand(HAND, 'Right', 0.9);
    }
    let fingerCam = null;
    if (s.a === 'finger') {
      HAND.object3d.visible = true; HAND.object3d.position.set(0.12, SET.props.terrain.heightAt(0.12, 1.25), 1.25); HAND.object3d.rotation.y = Math.PI; HAND.setPose('stand', t);
      HAND.object3d.updateMatrixWorld(true);
      const sh = HAND.bones('RightArm').getWorldPosition(V()), tg = sh.clone().add(V(0.05, 0.35, -0.42));
      K.reach(HAND, 'Right', tg, sh.clone().add(V(0.5, -0.4, 0.2))); K.handAim(HAND, 'Right', tg.clone().add(V(0, 0.3, -0.25)), 0);
      for (const f of ['Middle', 'Ring', 'Pinky', 'Thumb']) for (let j = 1; j <= 3; j++) { const b = HAND.bones(`RightHand${f}${j}`); if (!b) continue; const q = b.quaternion.clone(); b.quaternion.slerp(q.clone().multiply(q).multiply(q), 1); }
      for (let j = 1; j <= 3; j++) { const b = HAND.bones(`RightHandIndex${j}`); if (b) b.quaternion.slerp(new THREE.Quaternion(), 0.9); }
      HAND.object3d.updateMatrixWorld(true);
      const tip = (HAND.bones('RightHandIndex4') || HAND.bones('RightHandIndex3')).getWorldPosition(V());
      const a = t - 24.2; BEAD.visible = a < 0.6; BEAD.scale.setScalar(1.6); BEAD.position.copy(tip).add(V(0, -0.006 - (a > 0 ? 4.9 * a * a : 0), 0));
      fingerCam = { pos: tip.clone().add(V(0.12, -0.08, 0.16)).toArray(), look: tip.clone().add(V(-0.05, 0.03, -0.2)).toArray(), fov: K.lensFov(32) };
    }
    // camera
    let cam = fingerCam || K.camLerp(s.a, s.b, (s.ease || E.linear)(p));
    if (!fingerCam) cam = K.breathe(cam, t, s.b ? 0.0006 : 0.0009, 11 + i);
    G.renderSet(ctx, ST, t, u, { cam, ink: inkAt(t), writing: writingAt(t), tide: tideAt(t, i) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.03); },
});
