// y12-04 "His Son Was Gone. Watch How the Father Answered". Shot list: studio/shotlists/y12_04.md.
// Night at the family house: lamp on a ledge by the door, door ajar and swaying, thin moon over the hills.
// The brothers (people.js, faceless, backs) arrive weeping with the stained tunic. The father (a prophet) is
// never shown as a figure: his staff leans by the door in the lamp pool, and his turning to Allah is the
// tilt up to the moon. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { loadPeople } from '../lib_shared/people.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const { THREE } = W;
const { W: FW, H: FH, prog, E, lerp, clamp, mulberry32 } = M;
const PORT = M.FORMAT.portrait;
const D = 27.93;
const fv = (f) => (PORT ? f : f * 0.64);
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = () => new THREE.Vector3(), _q = () => new THREE.Quaternion();

let HILLS, CAP, K = {};

function aimBone(bone, child, target) {
  const bp = bone.getWorldPosition(_v()), cp = child.getWorldPosition(_v());
  const qd = _q().setFromUnitVectors(cp.sub(bp).normalize(), target.clone().sub(bp).normalize());
  const qw = bone.getWorldQuaternion(_q()).premultiply(qd);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q()).invert().multiply(qw)); bone.updateMatrixWorld(true);
}
function reach(p, side, target, pole) {
  const B = p.bones, U = B(side + 'Arm'), L = B(side + 'ForeArm'), H = B(side + 'Hand');
  p.object3d.updateMatrixWorld(true);
  const a = U.getWorldPosition(_v()), b = L.getWorldPosition(_v());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(H.getWorldPosition(_v())), toT = target.clone().sub(a);
  const d = clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4), dir = toT.normalize();
  const pv = pole.clone().sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  aimBone(U, L, a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA)); aimBone(L, H, a.clone().addScaledVector(dir, d));
}
function clayLamp(seed, light = 1.4) {
  const g = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ color: 0x8a5030, roughness: 0.82 });
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.05, 0.004], [0.068, 0.022], [0.056, 0.038], [0.022, 0.034], [0.012, 0.045]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay);
  body.scale.set(1, 1, 1.3); g.add(body);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.02, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.032, 0.085); g.add(sp);
  const f = W.flame({ h: 0.075, w: 0.034, seed, inten: 1.0, light: 0, planes: 2 }); f.position.set(0, 0.05, 0.112); g.add(f);
  const L = new THREE.PointLight(0xff9a50, light, 7, 1.6); L.position.set(0, 0.16, 0.13); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; g.add(L);
  W.shadows(g); f.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); body.castShadow = false;
  g.userData = { flame: f, light: L, set(t, k = 1, lean = 0) { f.visible = k > 0.003; f.scale.set(0.6 + 0.4 * k, Math.max(0.03, k), 0.6 + 0.4 * k); f.rotation.z = lean; f.userData.update(t, k); L.intensity = light * k * (0.92 + 0.08 * Math.sin(t * 13.1 + seed)); } };
  return g;
}
// a child's tunic: T-shaped cloth (alpha cut), undyed wool weave, a dried dark-red stain
function tunic(wool, { w = 0.62, h = 0.72, seed = 3, folded = false } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d');
  x.fillStyle = '#d8c8a6'; x.fillRect(0, 0, 256, 320);
  const r = mulberry32(seed);
  for (let i = 0; i < 9; i++) { const cx = 120 + (r() - 0.5) * 70, cy = 150 + (r() - 0.5) * 90, rr = 18 + r() * 34; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgba(92,24,14,0.7)'); g.addColorStop(0.6, 'rgba(104,34,20,0.5)'); g.addColorStop(1, 'rgba(120,40,24,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rr, rr * (0.6 + r() * 0.6), r() * 3, 0, 7); x.fill(); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const a = document.createElement('canvas'); a.width = 256; a.height = 320; const y = a.getContext('2d');
  y.fillStyle = '#000'; y.fillRect(0, 0, 256, 320); y.fillStyle = '#fff';
  y.beginPath(); y.moveTo(20, 20); y.lineTo(236, 20); y.lineTo(236, 95); y.lineTo(190, 95); y.lineTo(198, 312); y.lineTo(58, 312); y.lineTo(66, 95); y.lineTo(20, 95); y.closePath(); y.fill();
  y.fillStyle = '#000'; y.beginPath(); y.ellipse(128, 20, 26, 14, 0, 0, 7); y.fill();
  const alpha = new THREE.CanvasTexture(a);
  const m = new THREE.MeshStandardMaterial({ map, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, normalMap: wool.normalMap, normalScale: new THREE.Vector2(0.8, 0.8) });
  const geo = new THREE.PlaneGeometry(w, h, 40, 48), p = geo.attributes.position, n = W.noise2(seed + 11);
  for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i); p.setZ(i, (folded ? 0.004 : 0.03) * n(X * 6, Y * 6) + (folded ? 0 : 0.04 * Math.sin(X * 9) * (0.5 - Y / h))); }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    HILLS = W.stage(await canaan_hills({ time: 'night' }));
    const fixT = (x) => x.replace(/ʿ/g, '‘').replace(/ʾ/g, '’').replace(/ṣ/g, 's').replace(/ḥ/g, 'h');
    CAP = captions((await loadLines('lines.json')).map((l) => ({ ...l, text: fixT(l.text), keys: (l.keys || []).map(fixT) })), { display: 'Display', ui: 'UI', size: PORT ? 84 : 74 });
    const S = HILLS.set, P = S.props, hy = P.terrain.heightAt, sc = HILLS.scene, H = P.house, h0 = H.position.y;
    K.h0 = h0; K.hy = hy; const DZ = H.position.z;                              // door threshold (house front, faces +z)
    K.DZ = DZ;
    const [wool, stoneM, darkPl] = await Promise.all([W.pbr('hessian_230', { tile: 0.14, tint: 0xd8c8a8, res: 1024, normal: 0.6 }),
      W.pbr('rustic_stone_wall', { tile: 1.2, tint: 0xeee2cc, res: 1024 }), W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 })]);
    // ---- the lamp on a stone ledge beside the door (right of the door, on the front wall)
    const shelf = W.rbox(0.42, 0.07, 0.24, stoneM, { r: 0.015 }); shelf.position.set(1.05, h0 + 1.32, DZ + 0.3); sc.add(W.shadows(shelf));
    const lamp = clayLamp(7, 2.6); lamp.position.set(1.05, h0 + 1.39, DZ + 0.36); lamp.rotation.y = -0.2; sc.add(lamp); K.lamp = lamp;
    K.lampW = [1.05, h0 + 1.45, DZ + 0.42];
    // ---- the father's staff leaning by the door, his folded cloak on the threshold stone
    const staff = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.022, 0.03, 1.8, 16)), darkPl); staff.position.set(-0.78, h0 + 0.88, DZ + 0.32); staff.rotation.z = 0.13; sc.add(W.shadows(staff));
    const cloak = W.cloth(0.7, 0.5, wool.clone(), { segW: 40, segH: 30, folds: 0.02, seed: 8, sag: (u, v) => 0.04 * Math.sin(u * 7) }); cloak.material.color.set(0xb8a888);
    cloak.rotation.x = -Math.PI / 2; cloak.position.set(-0.3, h0 + 0.03, DZ + 0.75); sc.add(W.shadows(cloak));
    // ---- the tunic: one held by a brother (shots 4-5), the same tunic later laid folded on the step (shot 11)
    K.tHeld = tunic(wool, { seed: 3 }); sc.add(K.tHeld);
    K.tStep = tunic(wool, { seed: 3, w: 0.42, h: 0.36, folded: true }); K.tStep.rotation.x = -Math.PI / 2; K.tStep.rotation.z = 0.2; K.tStep.position.set(0.25, h0 + 0.025, DZ + 0.42); sc.add(K.tStep);
    // ---- a moth circling the lamp (two wings flapping; orbit is a pure function of t)
    { const wm = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.9, side: THREE.DoubleSide }), g = new THREE.Group();
      const wing = (s) => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12, 0, Math.PI).translate(0, 0, 0).scale(1, 1.4, 1), wm); w.rotation.z = s * Math.PI / 2; const piv = new THREE.Group(); piv.add(w); g.add(piv); return piv; };
      K.moth = { g, l: wing(1), r: wing(-1) }; sc.add(g); }
    // ---- the brothers (ten, three cached builds), arriving through the yard gate to the door
    const PP = await loadPeople(THREE, GLTFLoader);
    const PAL = [['#7a3a22', '#3a2b22'], ['#5a6030', '#3b3528'], ['#3a3634', '#2a2624'], ['#9a7034', '#4a3626'], ['#6a2a1c', '#2e2a28'],
      ['#4a5a3a', '#3e3428'], ['#2e2c2a', '#1d1b1a'], ['#8a6a3a', '#5b4130'], ['#5a3424', '#3a2b22'], ['#6a6a52', '#4a3626']];
    const T3 = [{ outfit: 'traveller', beard: 'full', headwear: 'keffiyeh', seed: 41 }, { outfit: 'thobe', beard: 'short', headwear: 'keffiyeh', seed: 42 }, { outfit: 'thobe', beard: 'full', headwear: 'wrap', seed: 43 }];
    const r = mulberry32(5);
    K.bros = Array.from({ length: 10 }, (_, i) => {
      const p = PP.make({ kind: 'man', ...T3[i % 3], palette: { robe: PAL[i][0], cloak: PAL[i][1], wrap: '#d8ccb4', trousers: '#9a8a70', sash: '#6a4a2a' }, detail: 0.6, height: 0.95 + 0.07 * Math.sin(i * 2.7) });
      // end spot: a loose cluster in the lamp pool before the door; start: back through the gate (+z)
      const ex = -1.9 + (i % 5) * 0.95 + (r() - 0.5) * 0.3, ez = DZ + 3.3 + Math.floor(i / 5) * 0.9 + (r() - 0.5) * 0.3;
      const sx = ex * 0.4, sz = DZ + 6.5 + i * 0.35;
      sc.add(p.object3d); return { p, ex, ez, sx, sz, t0: 3.1 + i * 0.12 };
    });
    K.holder = K.bros[2];
    // ---- cameras
    const G0 = (x, z, dy) => [x, hy(x, z) + dy, z], L = K.lampW;
    const moonDir = V3(-0.35, 0.32, -0.88).normalize(); K.moonDir = moonDir;
    const sky = (p) => [p[0] + moonDir.x * 40, p[1] + moonDir.y * 40 - 4, p[2] + moonDir.z * 40];
    K.cams = {
      door: { pos: [1.9, h0 + 1.75, DZ + 3.6], look: [0.1, h0 + 1.15, DZ], fov: fv(46) },
      ledgeA: { pos: [1.8, h0 + 1.55, DZ + 2.6], look: L, fov: fv(40) },
      ledgeB: { pos: [1.45, h0 + 1.5, DZ + 1.45], look: L, fov: fv(36) },
      gateA: { pos: G0(2.2, DZ + 9.0, 1.7), look: [0, h0 + 1.3, DZ + 1.5], fov: fv(50) },
      gateB: { pos: G0(1.6, DZ + 7.4, 1.65), look: [0, h0 + 1.3, DZ], fov: fv(48) },
      tunic: { pos: [0, 0, 0], look: [0, 0, 0], fov: fv(34) },           // set per frame from the held tunic
      stainA: { pos: [0, 0, 0], look: [0, 0, 0], fov: fv(20) },
      pastA: { pos: [0.9, h0 + 2.3, DZ + 6.0], look: [-0.4, h0 + 1.0, DZ + 0.3], fov: fv(44) },
      pastB: { pos: [0.2, h0 + 1.6, DZ + 2.6], look: [-0.6, h0 + 0.85, DZ + 0.3], fov: fv(40) },
      staff: { pos: [0.45, h0 + 1.35, DZ + 2.1], look: [-0.55, h0 + 0.85, DZ + 0.3], fov: fv(42) },
      skyA: { pos: [-0.2, h0 + 1.25, DZ + 2.2], look: [-0.6, h0 + 1.8, DZ + 0.3], fov: fv(46) },
      skyB: { pos: [-0.2, h0 + 1.25, DZ + 2.2], look: sky([-0.2, h0 + 1.25, DZ + 2.2]), fov: fv(46) },
      court: { pos: [2.3, h0 + 1.5, DZ + 3.0], look: [0.6, h0 + 1.3, DZ + 0.3], fov: fv(46) },
      step: { pos: [1.3, h0 + 1.25, DZ + 2.2], look: [0.2, h0 + 0.3, DZ + 0.3], fov: fv(40) },
      stepB: { pos: [1.1, h0 + 1.05, DZ + 1.8], look: [0.2, h0 + 0.2, DZ + 0.35], fov: fv(38) },
      flame: { pos: [1.05 + 0.25, h0 + 1.62, DZ + 1.3], look: L, fov: fv(30) },
    };
    K.door = P.door; P.door.leaf.rotation.y = -0.5;
    // cool moonlight rim from behind-left so the figures read against the dark hills, and a faint sky fill
    const rim = new THREE.DirectionalLight(0x9ab4ff, 0.9); rim.position.set(-6, h0 + 9, DZ - 10); rim.target.position.set(0, h0, DZ + 2); sc.add(rim, rim.target);
    P.fire.visible = false;                                                    // no fire tonight: lamp and moon only
    HILLS.update(0, 0, {}); G.R.compile(HILLS.scene, HILLS.camera);
    console.error(`[y12-04] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams, P = HILLS.set.props, A = HILLS.set.atmo, h0 = K.h0, DZ = K.DZ;
    // ---- brothers: walk in from the gate (3.1-5.9), stand weeping in the lamp pool; shoulders shake
    K.bros.forEach((b, i) => {
      const p = b.p, o = p.object3d, sp = p.speed ? p.speed('walk') * 0.8 : 1.0, dist = Math.hypot(b.ex - b.sx, b.ez - b.sz), dur = dist / sp, k = clamp((t - b.t0) / dur);
      const x = lerp(b.sx, b.ex, k), z = lerp(b.sz, b.ez, k);
      if (k < 1) p.setPose('walk', (t - b.t0) * 0.8 + i * 0.3); else p.setPose('sad_pose', t + i * 0.7);
      o.position.set(x, K.hy(x, z), z); o.rotation.y = Math.PI + Math.atan2(b.sx - b.ex, b.sz - b.ez) * (k < 1 ? 1 : 0.4);
      const sh = p.bones('Spine2'); if (sh && t > 4) sh.rotation.x += 0.03 * Math.sin(t * 9 + i) * Math.exp(-0.25 * Math.max(0, t - 6));
      o.visible = t > 3.0;
    });
    // the holder raises the tunic in the lamp pool (6.4-9.0), then it is laid on the step (seen from 20.3)
    const hb = K.holder, hp = hb.p;
    let tv = false;
    if (t > 6.2 && t < 9.2) {
      const up = E.inOutSine(prog(t, 6.3, 7.1)), o = hp.object3d, fw = V3(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y));
      const c = o.position.clone().addScaledVector(fw, 0.45).setY(h0 + lerp(1.0, 1.32, up)), side = V3(fw.z, 0, -fw.x);
      const pole = o.position.clone().add(V3(0, 0.6, 0)).addScaledVector(fw, -0.4);
      reach(hp, 'Right', c.clone().addScaledVector(side, -0.24).add(V3(0, 0.34, 0)), pole); reach(hp, 'Left', c.clone().addScaledVector(side, 0.24).add(V3(0, 0.34, 0)), pole);
      const hr = hp.bones('RightHand').getWorldPosition(_v()), hl = hp.bones('LeftHand').getWorldPosition(_v());
      K.tHeld.position.copy(hr.clone().add(hl).multiplyScalar(0.5)).add(V3(0, -0.34, 0)).addScaledVector(fw, 0.03);
      K.tHeld.rotation.set(0, o.rotation.y + Math.PI, 0); tv = true;
      K.tHeldFw = fw; K.tHeldC = K.tHeld.position.clone();
    }
    K.tHeld.visible = tv; K.tStep.visible = t > 18.0;
    // ---- shots
    let cam;
    if (t < 1.17) cam = C.door;
    else if (t < 3.41) cam = camL(C.ledgeA, C.ledgeB, E.inOutSine(prog(t, 1.17, 3.41)));
    else if (t < 6.41) { const p = E.inOutSine(prog(t, 3.41, 6.41)); cam = camL(C.gateA, C.gateB, p); const sh = 0.012 * Math.sin(t * 7.3) + 0.008 * Math.sin(t * 11.1); cam = { ...cam, pos: [cam.pos[0] + sh, cam.pos[1] + sh * 0.6, cam.pos[2]] }; }
    else if (t < 9.05) {
      const c = K.tHeldC || V3(0, h0 + 1.0, DZ + 3.0);           // seen from the lamp side of the yard, the door dark behind
      if (t < 8.0) cam = { pos: [c.x + 1.5, c.y + 0.25, c.z + 0.9], look: [c.x, c.y - 0.05, c.z - 0.2], fov: fv(42) };
      else { const p = E.inOutSine(prog(t, 8.0, 9.05)); cam = { pos: [c.x + lerp(0.9, 0.7, p), c.y + 0.15, c.z + lerp(0.6, 0.45, p)], look: [c.x, c.y - 0.12, c.z], fov: fv(28) }; }
    }
    else if (t < 11.34) cam = camL(C.pastA, C.pastB, E.inOutSine(prog(t, 9.05, 11.34)));
    else if (t < 13.68) cam = C.staff;
    else if (t < 15.56) cam = camL(C.skyA, C.skyB, E.inOutSine(prog(t, 13.68, 15.4)));
    else if (t < 20.30) cam = C.court;
    else if (t < 22.34) cam = camL(C.step, C.stepB, E.inOutSine(prog(t, 20.3, 22.34)));
    else if (t < 24.48) cam = camL(C.skyA, C.skyB, E.inOutSine(prog(t, 22.34, 24.3)));
    else cam = C.flame;
    // ---- world: thin moon, lamp, door sway, moth
    const sky = P.sky.userData.u; sky.moonD.value.copy(K.moonDir); sky.moonOn.value = 1; sky.moonPhase.value = -0.55;
    HILLS.scene.environmentIntensity = 0.42; A.sun.intensity = 0.7; if (A.hemi) A.hemi.intensity = 0.08;
    const gust = Math.exp(-((t - 25.7) ** 2) / 0.12);
    K.lamp.userData.set(t, 1 - 0.55 * gust, 1.1 * gust * Math.sin(clamp((t - 25.35) / 0.8) * Math.PI) + 0.04 * Math.sin(t * 2.1));
    K.door.leaf.rotation.y = -0.5 + 0.035 * Math.sin(t * 0.9) + 0.02 * Math.sin(t * 2.3);
    { const L = K.lampW, a = t * 3.1, rr = 0.16 + 0.04 * Math.sin(t * 1.3); K.moth.g.position.set(L[0] + Math.cos(a) * rr, L[1] + 0.12 + 0.05 * Math.sin(t * 2.2), L[2] + Math.sin(a) * rr);
      K.moth.g.rotation.y = -a; const fl = 0.9 * Math.sin(t * 60); K.moth.l.rotation.x = fl; K.moth.r.rotation.x = -fl; K.moth.g.visible = t < 24.4; }
    G.renderSet(ctx, HILLS, t, u, { cam, exposure: t > 24.48 ? 0.85 : t < 3.41 && t > 1.17 ? 0.9 : 1.25, fire: 0 });
    CAP.draw(ctx, t);
    const su = prog(t, 26.33, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
