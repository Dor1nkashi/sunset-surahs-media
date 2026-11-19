// kit.js: shared props and camera helpers for the Yusuf lesson films y12-12 .. y12-16 (built on lib_shared/world.js).
// Everything is built once; every animated value is set from t (pure function of time, seeded noise only).
import * as W from '../lib_shared/world.js';
const { THREE, lerp, clamp, sstep } = W;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const K_ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

// ------------------------------------------------------------------ materials
const MC = new Map();
const cached = (k, f) => { if (!MC.has(k)) MC.set(k, f()); return MC.get(k); };
export const mats = {
  hessian: () => cached('hes', () => W.pbr('hessian_230', { tile: 0.45, tint: 0xd2c0a0, res: 1024, side: THREE.DoubleSide })),
  planks: () => cached('pl', () => W.pbr('old_planks_02', { tile: 1.4, tint: 0xb08860, res: 1024 })),
  dyed: (hex) => cached('dy' + hex, async () => { const m = (await W.pbr('hessian_230', { tile: 0.22, tint: hex, res: 1024, side: THREE.DoubleSide, normal: 0.8 })).clone(); return m; }),
};
export const gold = () => cached('gold', () => { const m = W.goldMat(); m.color.set(0xf0c050); m.roughness = 0.2; return m; });

// ------------------------------------------------------------------ the gold measuring bowl (siqāya): hammered hemisphere, rim, foot, ring handle
export function goldBowl({ r = 0.075 } = {}) {
  const g = new THREE.Group(), m = gold();
  const prof = [];
  prof.push([0.001, 0], [r * 0.32, 0], [r * 0.36, r * 0.05], [r * 0.3, r * 0.1]);                 // foot ring
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([r * 0.3 + (r - r * 0.3) * Math.sin(a), r * 0.1 + r * 0.72 * (1 - Math.cos(a))]); }
  prof.push([r * 1.07, r * 0.86], [r * 1.07, r * 0.9], [r * 0.95, r * 0.88]);                       // rolled rim
  for (let i = 0; i <= 20; i++) { const a = (1 - i / 20) * Math.PI / 2; prof.push([Math.max(0.001, (r * 0.95) * Math.sin(a)), r * 0.16 + r * 0.7 * (1 - Math.cos(a))]); }
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 128), p = geo.attributes.position, n = W.noise2(17);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.012 * n(Math.atan2(z, x) * 6, y * 160); p.setXYZ(i, x * k, y, z * k); }  // hammer marks
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, m); body.castShadow = body.receiveShadow = true; g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, r * 0.025, 10, 96), m); band.rotation.x = Math.PI / 2; band.position.y = r * 0.62; g.add(band);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.28, r * 0.06, 16, 48, Math.PI * 1.3), m);
  handle.position.set(r * 1.12, r * 0.6, 0); handle.rotation.z = -Math.PI * 0.65; handle.castShadow = true; g.add(handle);
  g.userData.r = r;
  return g;
}

// ------------------------------------------------------------------ grain: a heaped surface + instanced kernels
function grainColorMat() { return cached('grainM', () => new THREE.MeshStandardMaterial({ color: 0x8a6438, roughness: 0.8 })); }
export function grainHeap({ r = 0.2, dome = 0.04, kernels = 2600, seed = 3 } = {}) {
  const g = new THREE.Group(), n = W.noise2(seed), H = (x, z) => { const d = Math.hypot(x, z) / r; return dome * Math.max(0, 1 - d * d) + 0.004 * n(x * 60, z * 60); };
  const geo = new THREE.CircleGeometry(r, 96, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
  const dense = new THREE.PlaneGeometry(r * 2, r * 2, 120, 120).rotateX(-Math.PI / 2), p = dense.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); const k = d > r ? r / d : 1; p.setXYZ(i, x * k, H(x * k, z * k), z * k); }
  dense.computeVertexNormals(); geo.dispose();
  const base = new THREE.Mesh(dense, grainColorMat()); base.receiveShadow = true; g.add(base);
  const kg = new THREE.SphereGeometry(1, 10, 6); kg.scale(0.0042, 0.0026, 0.0026);
  const km = new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: 0.6 });
  const im = new THREE.InstancedMesh(kg, km, kernels), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), rr = W.rng(seed), C = new THREE.Color();
  for (let i = 0; i < kernels; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.98, x = Math.cos(a) * d, z = Math.sin(a) * d;
    Q.setFromEuler(new THREE.Euler((rr() - 0.5) * 0.6, rr() * 6.28, (rr() - 0.5) * 0.6)); const s = 0.8 + rr() * 0.4;
    M4.compose(V3(x, H(x, z) + 0.0018, z), Q, V3(s, s, s)); im.setMatrixAt(i, M4);
    C.setHSL(0.09 + rr() * 0.025, 0.5 + rr() * 0.15, 0.34 + rr() * 0.12); im.setColorAt(i, C);
  }
  im.castShadow = false; im.receiveShadow = true; g.add(im);
  g.userData.heightAt = H;
  return g;
}

// ------------------------------------------------------------------ saddlebag: lathe sack with a rolled cuff, grain heap inside and a hinged cover flap
// returns { group, flap (rotation.x: 0 = closed over the mouth, -2.6 = hanging open down the front), mouthY, grain }
export async function saddlebag({ seed = 1, open = false, h = 0.62, r = 0.27, cover = 0x6a2a1a } = {}) {
  const hs = await mats.hessian(), g = new THREE.Group(), n = W.noise2(seed + 9);
  const prof = [[0.001, 0], [r * 0.8, 0.0], [r * 0.98, 0.04]];
  for (let i = 1; i <= 14; i++) { const k = i / 14; prof.push([r * (1.0 + 0.12 * Math.sin(k * Math.PI * 0.9)) * (1 - 0.06 * k), 0.04 + k * (h - 0.04)]); }
  prof.push([r * 0.98, h + 0.02], [r * 1.06, h + 0.035], [r * 1.12, h - 0.02], [r * 1.1, h - 0.07]);  // rolled-down cuff
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 96), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.035 * n(a * 3, y * 6) + 0.012 * Math.sin(a * 14 + y * 20 + n(a, y) * 3) * sstep(0.3, 0.9, y / h); p.setXYZ(i, x * k, y, z * k); }
  geo.computeVertexNormals(); W.boxUV(geo);
  const body = new THREE.Mesh(geo, hs); body.castShadow = body.receiveShadow = true; g.add(body);
  const grain = grainHeap({ r: r * 0.95, dome: 0.05, seed: seed + 4, kernels: open ? 2600 : 300 }); grain.position.y = h - 0.05; g.add(grain);
  // cover flap: a dyed cloth disc hinged at the back rim
  const cm = (await mats.dyed(cover)), fr = r * 1.25;
  const fg = new THREE.CircleGeometry(fr, 64); fg.rotateX(-Math.PI / 2); fg.translate(0, 0, fr * 0.92);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), d = Math.hypot(x, z - fr * 0.92) / fr; fp.setY(i, -0.05 * sstep(0.7, 1, d) + 0.006 * n(x * 30, z * 30) + 0.012 * Math.sin(x * 25 + z * 9) * d); }
  fg.computeVertexNormals();
  const flapMesh = new THREE.Mesh(fg, cm); flapMesh.castShadow = flapMesh.receiveShadow = true;
  const flap = new THREE.Group(); flap.position.set(0, h + 0.035, -r * 1.02); flap.add(flapMesh); g.add(flap);
  // setOpen(f): 0 = cover lying over the mouth, 1 = folded back over the rim and draped down the back of the bag (wrapped to its curve)
  const base = Float32Array.from(fp.array), R = r * 1.15;
  const setOpen = (f) => {
    f = clamp(f); const w = sstep(0.55, 1, f);
    flap.rotation.x = -4.2 * K_ease(f); flap.position.z = -r * 1.02 - 0.03 * w; flap.position.y = h + 0.035 + 0.01 * w;
    for (let i = 0; i < fp.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; fp.setXYZ(i, x, base[i * 3 + 1] + 0.25 * w * (x * x / (2 * R)) - w * 0.02 * sstep(0.1, 0.5, z / (fr * 1.84)), z); }
    fp.needsUpdate = true; fg.computeVertexNormals(); flap.updateMatrixWorld(true);
  };
  setOpen(open ? 1 : 0);
  // a lashing rope round the belly
  const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(V3(Math.cos(a) * r * 1.11, h * 0.55 + 0.01 * Math.sin(a * 3), Math.sin(a) * r * 1.11)); }
  g.add(W.rope(pts, 0.009, { segs: 160 }));
  return { group: g, flap, setOpen, flapEdge: () => flap.localToWorld(V3(0, 0.02, fr * 1.75)), mouthY: h, grain, r };
}

// ------------------------------------------------------------------ low table with a draped cloth (the cloth top sits at y = top)
export async function clothTable({ w = 1.1, d = 0.7, top = 0.62, cloth = 0x2a3a5c, seed = 5 } = {}) {
  const g = new THREE.Group(), pl = await mats.planks();
  const t = W.rbox(w, 0.05, d, pl, { r: 0.012 }); t.position.y = top - 0.05; g.add(t);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = W.rbox(0.06, top - 0.05, 0.06, pl, { r: 0.01 }); l.position.set(sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08)); g.add(l); }
  const cm = await mats.dyed(cloth), cw = w * 0.8, cd = d + 0.3, n = W.noise2(seed);
  const cg = new THREE.PlaneGeometry(cw, cd + 0.3, 80, 90).rotateX(-Math.PI / 2), p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), over = Math.max(0, Math.abs(z) - d / 2);
    const y = top + 0.003 - over * 0.98 + 0.004 * n(x * 20, z * 20) + (over > 0 ? 0.012 * Math.sin(x * 38 + n(x * 3, z) * 2) : 0.002 * Math.sin(x * 30 + z * 7));
    p.setXYZ(i, x, y, Math.sign(z) * (Math.min(Math.abs(z), d / 2) + over * 0.12)); }
  cg.computeVertexNormals();
  const cl = new THREE.Mesh(cg, cm); cl.castShadow = cl.receiveShadow = true; g.add(cl);
  W.shadows(g);
  g.userData.top = top + 0.004;
  return g;
}

// ------------------------------------------------------------------ torch on a pole: wooden pole, iron cup, rag-wrapped head, live flame
export function torch({ h = 2.4, seed = 1, light = 5, dist = 14 } = {}) {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 16), wood); pole.position.y = h / 2; g.add(W.shadows(pole));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.16, 24, 1, true), W.ironMat()); cup.material.side = THREE.DoubleSide; cup.position.y = h + 0.05; g.add(W.shadows(cup));
  const rag = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), new THREE.MeshStandardMaterial({ color: 0x1a120c, emissive: 0xff4a10, emissiveIntensity: 0.5, roughness: 1 })); rag.position.y = h + 0.12; rag.scale.y = 0.8; g.add(rag);
  const f = W.flame({ h: 0.55, w: 0.3, seed, inten: 5.5, light, dist }); f.position.y = h + 0.12; g.add(f);
  g.userData.update = (t, k = 1) => f.userData.update(t, k);
  return g;
}

// one bright star (a billboard sprite far away, no fog), used for "one star" shots
export function brightStar({ dir = [0.2, 0.6, -1], dist = 900, size = 9, color = 0xfff2d8 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(255,246,225,0.95)'); gr.addColorStop(0.25, 'rgba(255,225,170,0.25)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,240,210,0.35)'; x.fillRect(62, 0, 4, 128); x.fillRect(0, 62, 128, 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  const d = V3(...dir).normalize(); s.userData.dir = d; s.userData.dist = dist; s.scale.setScalar(size); s.renderOrder = 5;
  s.userData.update = (cam, t, k = 1) => { s.position.copy(cam.position).addScaledVector(d, dist); s.material.opacity = k * (0.85 + 0.15 * Math.sin(t * 2.3)); };
  return s;
}

// ------------------------------------------------------------------ camera + shot helpers
// a shot: { t0, t1, set: 'NAME', a: pose, b: pose (optional), ease } ; pose { pos, look, fov, roll }
export const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
export function camAt(shot, t) {
  const a = shot.a, b = shot.b || shot.a, e = (shot.ease || easeIO)(clamp((t - shot.t0) / (shot.t1 - shot.t0)));
  const fov = Math.exp(lerp(Math.log(a.fov ?? 40), Math.log(b.fov ?? 40), e));
  return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], e)), look: a.look.map((v, i) => lerp(v, b.look[i], e)), fov, roll: lerp(a.roll ?? 0, b.roll ?? 0, e) };
}
export const shotAt = (shots, t) => shots.find((s) => t >= s.t0 && t < s.t1) || (t < shots[0].t0 ? shots[0] : shots[shots.length - 1]);
// a small handheld-free "breathing" drift for locked shots (seeded, sub-centimetre), so long lenses don't look frozen
export function breathe(pose, t, amt = 0.004, seed = 1) {
  const n = W.noise2(seed); return { ...pose, pos: pose.pos.map((v, i) => v + amt * n(t * 0.35 + i * 7, seed)) };
}

// the end seal: fades in and out across [t0, t1] (centre of the frame, upper third)
export function drawSeal(ctx, img, t, t0, t1) {
  const a = Math.sin(Math.PI * clamp((t - t0) / (t1 - t0)));
  if (a <= 0 || !img) return;
  const Wc = ctx.canvas.width, Hc = ctx.canvas.height, s = Math.min(Wc, Hc) * 0.42;
  ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(img, Wc / 2 - s / 2, Hc * (Hc > Wc ? 0.36 : 0.42) - s / 2, s, s); ctx.restore();
}
// film grain, applied in post (after the blur accumulation)
export function grain(ctx, t, mulberry32, amt = 0.045) {
  const R = mulberry32(Math.floor(t * 30) + 7), Wc = ctx.canvas.width, Hc = ctx.canvas.height; ctx.save(); ctx.globalAlpha = amt;
  for (let i = 0; i < 1600; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * Wc, R() * Hc, 2, 2); }
  ctx.restore();
}
// soft vignette (2-D, cheap)
export function vignette(ctx, k = 0.35) {
  const Wc = ctx.canvas.width, Hc = ctx.canvas.height, g = ctx.createRadialGradient(Wc / 2, Hc / 2, Math.min(Wc, Hc) * 0.35, Wc / 2, Hc / 2, Math.hypot(Wc, Hc) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, Wc, Hc);
}
export { V3 };

// ------------------------------------------------------------------ people (lib_shared/people.js) + arm IK for hand actions
let _people = null;
export async function people() {
  if (_people) return _people;
  const [{ loadPeople }, { GLTFLoader }] = await Promise.all([import('../lib_shared/people.js'), import('three/addons/loaders/GLTFLoader.js')]);
  return (_people = await loadPeople(THREE, GLTFLoader));
}
const _v1 = V3(), _v2 = V3(), _v3 = V3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function aimBone(bone, child, target) {
  const bp = bone.getWorldPosition(_v1), cp = child.getWorldPosition(_v2);
  const qd = _q1.setFromUnitVectors(cp.sub(bp).normalize(), _v3.copy(target).sub(bp).normalize());
  const qw = bone.getWorldQuaternion(_q2).premultiply(qd);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q3).invert().multiply(qw)); bone.updateMatrixWorld(true);
}
// two-bone IK on a person's arm: side 'Left'|'Right', target + pole in world space (metres). Call after setPose.
export function reach(p, side, target, pole, k = 1) { limb(p, side + 'Arm', side + 'ForeArm', side + 'Hand', target, pole, k); }
export function limb(p, nUp, nLo, nEnd, target, pole, k = 1) {
  const B = p.bones, up = B(nUp), lo = B(nLo), end = B(nEnd);
  p.object3d.updateMatrixWorld(true);
  if (k < 1) { const h = end.getWorldPosition(V3()); target = h.lerp(V3().copy(target), k); }
  const a = up.getWorldPosition(V3()), b = lo.getWorldPosition(V3()), c = end.getWorldPosition(V3());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(c), toT = V3().copy(target).sub(a), d = clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4);
  const dir = toT.normalize(), pv = V3().copy(pole).sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  aimBone(up, lo, a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA));
  aimBone(lo, end, a.clone().addScaledVector(dir, d));
  p.object3d.updateMatrixWorld(true);
}
// local point on a person (metres, in the person's object3d frame: +z forward, y up) -> world
export const onBody = (p, x, y, z) => p.object3d.localToWorld(V3(x, y, z));
export const handPos = (p, side) => p.bones(side + 'Hand').getWorldPosition(V3());
// hands folded at the waist / chest (a still, composed posture)
export function foldHands(p, y = 0.98, fwd = 0.2, k = 1) {
  const h = p.height / 1.8;
  if (k <= 0) return;
  reach(p, 'Left', onBody(p, 0.03, y * h, fwd * h), onBody(p, 0.6, 1.0 * h, -0.5), k);
  reach(p, 'Right', onBody(p, -0.03, (y + 0.02) * h, (fwd + 0.02) * h), onBody(p, -0.6, 1.0 * h, -0.5), k);
}
// a person standing/placed with yaw at [x,y,z]
export function place(p, x, y, z, yaw = 0) { p.object3d.position.set(x, y, z); p.object3d.rotation.set(0, yaw, 0); p.object3d.updateMatrixWorld(true); }

// a night starfield of point stars (sizes, colour temperatures, twinkle), no fog, follows the camera
export function starfield({ count = 2600, seed = 7, minY = -0.02, bright = 1 } = {}) {
  const r = W.rng(seed), pos = new Float32Array(count * 3), size = new Float32Array(count), col = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let x, y, z; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1 || y < minY);
    const l = Math.hypot(x, y, z); pos.set([x / l * 1000, y / l * 1000, z / l * 1000], i * 3);
    const m = Math.pow(r(), 5); size[i] = 2.2 + 8 * m; ph[i] = r() * 6.28;
    const c = new THREE.Color().setHSL(0.08 + r() * 0.55 * (r() < 0.5 ? 1 : 0), 0.35 * r(), 0.82 + 0.18 * m); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, k: { value: bright } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float size, ph; attribute vec3 color; uniform float time, k; varying vec3 vC; varying float vA; void main(){ vC = color; vA = k * (0.75 + 0.25 * sin(time * 2.1 + ph * 3.0)); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r); a = a * a; gl_FragColor = vec4(vC * a * vA * 1.6, a * vA); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -1;
  pts.userData.update = (cam, t, k = 1) => { pts.position.copy(cam.position); m.uniforms.time.value = t; m.uniforms.k.value = bright * k; };
  return pts;
}

// rotate a bone by local euler degrees (after setPose)
export function tilt(p, bone, x = 0, y = 0, z = 0) { const b = p.bones(bone); b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180))); p.object3d.updateMatrixWorld(true); }
// seat a person (after setPose('stand')) on a seat of height seatY (metres above their feet): hips down and back, thighs forward, shins down
export function sit(p, seatY = 0.45, { lean = 12, footFwd = 0.5, footW = 0.13 } = {}) {
  const H = p.bones('Hips'); p.object3d.updateMatrixWorld(true);
  const hw = H.getWorldPosition(V3()), base = p.object3d.position.y, drop = hw.y - base - (seatY + 0.09);
  const s = p.object3d.scale.y || 1, unit = 0.01 * (p.scale || 1) * s;
  H.position.y -= drop / unit; H.position.z -= 0.06 / unit;
  p.object3d.updateMatrixWorld(true);
  tilt(p, 'Spine', lean * 0.5, 0, 0); tilt(p, 'Spine1', lean * 0.5, 0, 0);
  for (const [side, sx] of [['Left', 1], ['Right', -1]]) limb(p, side + 'UpLeg', side + 'Leg', side + 'Foot', onBody(p, sx * footW, 0.09, footFwd), onBody(p, sx * 0.2, 0.6, 3));
  // feet flat-ish
  for (const side of ['Left', 'Right']) tilt(p, side + 'Foot', -25, 0, 0);
}
// curl (k=1, the rest curl x2) or open (k=0, flat) the fingers of one hand
export function fingers(p, side, k = 1) {
  const sg = side === 'Left' ? -1 : 1;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const [i, a] of [[1, 22], [2, 26], [3, 16]]) tilt(p, side + 'Hand' + f + i, 0, 0, sg * (k * a - (1 - k) * a * 0.55));
}
