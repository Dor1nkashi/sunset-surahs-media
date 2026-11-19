// kit.js: small helpers for the k18 films (copied per film folder; no shared state).
// Shot table, camera moves (log-space dolly), per-format lens, dust motes, the end seal, film grain.
import * as M from './lib/motion.js';
import * as W from '../lib_shared/world.js';
const { THREE } = W;
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// SHOTS: [{ t0, t1, ... }] sorted; returns { i, s, p } with p in 0..1 across the shot
export function shotAt(SHOTS, t) {
  let i = SHOTS.length - 1;
  for (let k = 0; k < SHOTS.length; k++) if (t < SHOTS[k].t1) { i = k; break; }
  const s = SHOTS[i];
  return { i, s, p: M.clamp((t - s.t0) / (s.t1 - s.t0)) };
}
// a camera between two poses a, b ({ pos, look, fov, roll }); position eased, fov in log space
export function camLerp(a, b, p) {
  if (!b) return { ...a, fov: lensFov(a.fov) };
  const L = (x, y) => x.map((v, i) => v + (y[i] - v) * p);
  const fa = lensFov(a.fov), fb = lensFov(b.fov ?? a.fov);
  return { pos: L(a.pos, b.pos), look: L(a.look, b.look), fov: fa * (fb / fa) ** p, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * p };
}
// lens: fov values in the tables are vertical degrees for 9x16; 16x9 frames tighter vertically
export const lensFov = (f) => (M.FORMAT.portrait ? f : f * 0.72);
// slow organic hold (a locked camera that still breathes a few mm)
export function breathe(c, t, amt = 0.004, seed = 1) {
  const n = W.noise2(seed);
  return { ...c, pos: c.pos.map((v, i) => v + amt * n(t * 0.35 + i * 7.1, seed)) };
}

// dust motes floating in light: instanced tiny quads, positions a pure function of t
let _dot = null;
function dotTex() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (_dot = new THREE.CanvasTexture(c));
}
export function dustMotes({ centre = [0, 1, 0], size = [1, 1, 1], count = 300, seed = 3, color = 0xffd8a0, op = 0.5, px = 0.006, fall = 0.02 } = {}) {
  const r = W.rng(seed), base = [];
  for (let i = 0; i < count; i++) base.push([r(), r(), r(), r() * 6.28, 0.4 + r() * 0.8]);
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: px, map: dotTex(), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6;
  pts.userData.update = (t, k = 1) => {
    for (let i = 0; i < count; i++) {
      const [a, b, c, ph, sp] = base[i];
      const y = ((b - t * fall * sp / size[1]) % 1 + 1) % 1;
      pos[i * 3] = centre[0] + (a - 0.5) * size[0] + 0.03 * Math.sin(t * 0.4 * sp + ph);
      pos[i * 3 + 1] = centre[1] + (y - 0.5) * size[1];
      pos[i * 3 + 2] = centre[2] + (c - 0.5) * size[2] + 0.03 * Math.cos(t * 0.33 * sp + ph);
    }
    geo.attributes.position.needsUpdate = true; mat.opacity = op * k;
  };
  return pts;
}

// the seal fades in and out over the last `dur` seconds (centred in the safe area above the caption)
export function seal(ctx, IMG, t, D, dur = 1.5) {
  const su = M.prog(t, D - dur, D - 0.05), a = Math.sin(Math.PI * su);
  if (a <= 0 || !IMG.seal) return;
  const s = M.FORMAT.portrait ? 440 : 360, y = M.FORMAT.portrait ? M.H * 0.36 : M.H * 0.42;
  ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, M.W / 2 - s / 2, y - s / 2, s, s); ctx.restore();
}
// fine seeded film grain + a soft vignette (post, after the motion-blur average)
export function grain(ctx, t, amt = 0.045) {
  const W_ = M.W, H_ = M.H, R = M.mulberry32 ? M.mulberry32(Math.floor(t * 30) + 7) : W.rng(Math.floor(t * 30) + 7);
  ctx.save(); ctx.globalAlpha = amt;
  for (let i = 0; i < 1600; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * W_, R() * H_, 2, 2); }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.35, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
  ctx.restore();
}
// a cross-dissolve helper for the first/last frames of a shot (k 0..1 = how much of the previous shot remains)
export const dissolveIn = (t, t0, d = 0.25) => 1 - M.clamp((t - t0) / d);

// iron door bolt: bar sliding through two staples into a keeper. Origin = closed bar centre; slides along +x.
export function doorBolt(iron, { len = 0.36, travel = 0.24 } = {}) {
  const g = new THREE.Group();
  const bar = W.rbox(len, 0.034, 0.026, iron, { r: 0.006 }); bar.position.y = -0.017;
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.05, 16).rotateX(Math.PI / 2), iron); knob.position.set(-len * 0.22, 0, 0.035);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 14), iron); ball.position.set(-len * 0.22, 0, 0.06);
  const slider = new THREE.Group(); slider.add(bar, knob, ball); g.add(slider);
  const staple = (x) => { const s = new THREE.Group(), f = W.rbox(0.028, 0.07, 0.008, iron, { r: 0.003, centre: true }); f.position.z = 0.019; s.add(f);
    for (const yy of [-0.03, 0.03]) { const q = W.rbox(0.028, 0.008, 0.03, iron, { r: 0.002, centre: true }); q.position.set(0, yy, 0.004); s.add(q); }
    for (const yy of [-0.028, 0.028]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), iron); n.position.set(0, yy, 0.024); s.add(n); } s.position.set(x, 0, 0); return s; };
  // staples are fixed to the door (not to the slider)
  const st1 = staple(-travel - len * 0.1), st2 = staple(-travel + len * 0.3);
  const plate = W.rbox(0.07, 0.12, 0.012, iron, { r: 0.004 }); plate.position.set(len / 2 - 0.02, -0.06, -0.012);
  g.add(st1, st2);
  W.shadows(g);
  // set(k): 0 = open (drawn back by `travel`), 1 = closed
  g.userData.set = (k) => { slider.position.x = -travel * (1 - k); };
  g.userData.keeper = plate;
  return g;
}

// ------------------------------------------------------------------ people (people.js on the Xbot rig)
import { loadPeople } from '../lib_shared/people.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let _people = null;
export async function people() { return _people || (_people = await loadPeople(THREE, GLTFLoader)); }
// two-bone IK on a built figure, after setPose: put the hand at a world target, elbow toward pole
const _v = () => new THREE.Vector3(), _q = () => new THREE.Quaternion();
function aimBone(bone, child, target) {
  const bp = bone.getWorldPosition(_v()), cp = child.getWorldPosition(_v());
  const qd = _q().setFromUnitVectors(cp.sub(bp).normalize(), target.clone().sub(bp).normalize());
  const qw = bone.getWorldQuaternion(_q()).premultiply(qd);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q()).invert().multiply(qw)); bone.updateMatrixWorld(true);
}
export function reach(p, side, target, pole) {
  const B = p.bones, U = B(side + 'Arm'), L = B(side + 'ForeArm'), H = B(side + 'Hand');
  p.object3d.updateMatrixWorld(true);
  const a = U.getWorldPosition(_v()), b = L.getWorldPosition(_v()), c = H.getWorldPosition(_v());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(c), toT = target.clone().sub(a);
  const d = M.clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4), dir = toT.normalize();
  const pv = pole.clone().sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const cosA = M.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const elbow = a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA);
  aimBone(U, L, elbow); aimBone(L, H, a.clone().addScaledVector(dir, d));
}
// orient the hand: fingers along `up` (world dir), then roll about it by `roll` radians
export function handAim(p, side, fingerTip, roll = 0) {
  const H = p.bones(side + 'Hand'), mid = p.bones(side + 'HandMiddle1');
  aimBone(H, mid, fingerTip);
  if (roll) { const hp = H.getWorldPosition(_v()), ax = mid.getWorldPosition(_v()).sub(hp).normalize();
    const qw = H.getWorldQuaternion(_q()).premultiply(_q().setFromAxisAngle(ax, roll));
    H.quaternion.copy(H.parent.getWorldQuaternion(_q()).invert().multiply(qw)); H.updateMatrixWorld(true); }
}
// bend all fingers by a factor (0 = flat, 1 = rest curl kept)
export function flatHand(p, side, k = 0.15) {
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) { const b = p.bones(`${side}Hand${f}${i}`); if (b) b.quaternion.slerp(new THREE.Quaternion(), 1 - k); }
  p.object3d.updateMatrixWorld(true);
}
