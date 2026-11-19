// y12-02 "The Worst Plan Began as a Quiet Feeling". Shot list: studio/shotlists/y12_02.md.
// Dusk at the sheep pen: ten brothers (people.js, faceless) kneel around a fire; the father's window glows on
// the slope; the plan points at the well; the fire burns down to one ember that glows back into the fire
// (loop). Sparks and embers are a deterministic emitter: every spark is born, rises and fades on its own
// curve, so nothing pops. Pure function of t.
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
const D = 26.65;
const fv = (f) => (PORT ? f : f * 0.64);
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = () => new THREE.Vector3(), _q = () => new THREE.Quaternion();

let HILLS, CAP, K = {};

// two-bone IK after setPose: hand to a world target, elbow toward a pole
function aimBone(bone, child, target) {
  const bp = bone.getWorldPosition(_v()), cp = child.getWorldPosition(_v());
  const qd = _q().setFromUnitVectors(cp.sub(bp).normalize(), target.clone().sub(bp).normalize());
  const qw = bone.getWorldQuaternion(_q()).premultiply(qd);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q()).invert().multiply(qw)); bone.updateMatrixWorld(true);
}
function reach(p, side, target, pole) {
  const B = p.bones, U = B(side + 'Arm'), L = B(side + 'ForeArm'), H = B(side + 'Hand');
  p.object3d.updateMatrixWorld(true);
  const a = U.getWorldPosition(_v()), b = L.getWorldPosition(_v()), c = H.getWorldPosition(_v());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(c), toT = target.clone().sub(a);
  const d = clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4), dir = toT.normalize();
  const pv = pole.clone().sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const elbow = a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA);
  aimBone(U, L, elbow); aimBone(L, H, a.clone().addScaledVector(dir, d));
}

// sparks: N particles, each with its own birth time on a repeating schedule; position/brightness from age only
function sparks(n, seed) {
  const r = mulberry32(seed), pos = new Float32Array(n * 3), b = new Float32Array(n);
  const P = Array.from({ length: n }, () => ({ t0: r() * 1.6, life: 0.9 + r() * 1.3, vx: (r() - 0.5) * 0.35, vz: (r() - 0.5) * 0.35, vy: 0.9 + r() * 1.1, ph: r() * 6.28, x0: (r() - 0.5) * 0.4, z0: (r() - 0.5) * 0.4 }));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('b', new THREE.BufferAttribute(b, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { size: { value: 9 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float b; uniform float size; varying float vB; void main(){ vB = b; vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * (0.4 + b) * (6. / max(0.5, -mv.z)); }',
    fragmentShader: 'varying float vB; void main(){ vec2 q = gl_PointCoord - .5; float a = exp(-dot(q,q) * 30.) * vB; gl_FragColor = vec4(vec3(1.0, 0.55, 0.18) * a * 3., a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  pts.userData.update = (t, rate) => {           // rate 0..1: how strongly the fire throws sparks now
    P.forEach((p, i) => {
      const period = p.life + 0.6 / Math.max(0.05, rate), k = Math.floor((t - p.t0) / period), age = t - p.t0 - k * period;
      const birthRate = rate * (0.6 + 0.4 * Math.sin(k * 1.7 + p.ph));                    // whether this cycle throws a spark
      const on = age >= 0 && age < p.life && ((k * 7 + i) % 10) / 10 < birthRate;
      const a = on ? age : 0, sway = 0.12 * Math.sin(a * 3 + p.ph);
      pos.set([p.x0 + p.vx * a + sway, 0.25 + p.vy * a - 0.18 * a * a, p.z0 + p.vz * a + sway * 0.6], i * 3);
      b[i] = on ? Math.max(0, 1 - a / p.life) ** 1.5 : 0;
    });
    g.attributes.position.needsUpdate = true; g.attributes.b.needsUpdate = true;
  };
  return pts;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    HILLS = W.stage(await canaan_hills({ time: 'predawn' }));
    const fixT = (x) => x.replace(/ʿ/g, '‘').replace(/ʾ/g, '’').replace(/ṣ/g, 's').replace(/ḥ/g, 'h');
    CAP = captions((await loadLines('lines.json')).map((l) => ({ ...l, text: fixT(l.text), keys: (l.keys || []).map(fixT) })), { display: 'Display', ui: 'UI', size: PORT ? 84 : 66 });
    const S = HILLS.set, P = S.props, hy = P.terrain.heightAt, h0 = P.house.position.y, sc = HILLS.scene;
    K.hy = hy; K.h0 = h0;
    // ---- the fire at the pen edge (the set's pit), with our own coal bed: each coal cools on its own schedule
    const FX = 7.2, FZ = -4.5, FY = hy(FX, FZ); K.F = [FX, FY, FZ];
    const nz = W.noise2(77);
    const coalGeo = (rad, sd) => { const g = new THREE.IcosahedronGeometry(rad, 3), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const v = V3(p.getX(k), p.getY(k), p.getZ(k)), l = v.length(), f = 1 + 0.22 * nz(v.x * 40 + sd, v.y * 40 + v.z * 30) + 0.08 * nz(v.x * 130, v.z * 130 + sd); v.multiplyScalar(f); p.setXYZ(k, v.x, v.y, v.z); }
      g.computeVertexNormals(); return g; };
    const crk = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), rr = mulberry32(3); x.fillStyle = '#100604'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(255,${120 + rr() * 90 | 0},40,${0.5 + rr() * 0.5})`; x.lineWidth = 1 + rr() * 3; x.beginPath(); let px = rr() * 256, py = rr() * 256; x.moveTo(px, py);
        for (let k = 0; k < 6; k++) { px += (rr() - 0.5) * 50; py += (rr() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 30; i++) { const g = x.createRadialGradient(rr() * 256, rr() * 256, 0, 0, 0, 0); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const coals = [], r = mulberry32(23);
    for (let i = 0; i < 130; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 0.36, m = new THREE.MeshStandardMaterial({ color: 0x4a443e, emissive: new THREE.Color().setHSL(0.03 + 0.04 * r(), 1, 0.55), emissiveMap: crk, emissiveIntensity: 1.4, roughness: 1 });
      const c = new THREE.Mesh(coalGeo(0.02 + r() * 0.022, i % 12), m); c.scale.set(1 + r() * 0.6, 0.6 + r() * 0.4, 1 + r() * 0.5);
      c.position.set(FX + Math.cos(a) * d, FY + 0.1 + r() * 0.03, FZ + Math.sin(a) * d); c.rotation.set(r() * 3, r() * 3, 0); sc.add(c);
      coals.push({ m, c, d, out: 0 });
    }
    // embers go dark from the edges inward (shot 10), one central coal stays lit (shot 11)
    coals.sort((x, y) => y.d - x.d).forEach((o, i) => { o.out = 18.4 + 2.1 * (i / coals.length) + 0.25 * r(); });
    coals[coals.length - 1].last = true;
    K.coals = coals;
    K.sparks = sparks(70, 5); K.sparks.position.set(FX, FY, FZ); sc.add(K.sparks);
    const EL = new THREE.PointLight(0xff7a30, 2.5, 9, 1.6); EL.position.set(FX, FY + 0.5, FZ); sc.add(EL); K.EL = EL;
    // ---- the father's lit window on the slope (the house front faces +z)
    const H = P.house;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.5, 0.16), toneMapped: false }));
    pane.position.set(3.83, 1.95, -0.85); pane.rotation.y = Math.PI / 2; H.add(pane);                      // a small window in the side wall that faces the pen
    const dpl = await W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 });
    for (const [y, h] of [[1.68, 0.07], [2.18, 0.07]]) { const fr = W.rbox(0.09, h, 0.7, dpl, { r: 0.015 }); fr.position.set(3.86, y, -0.85); H.add(fr); }
    const WL = new THREE.PointLight(0xff9a50, 3, 6, 1.6); WL.position.set(4.6, 1.9, -0.85); H.add(WL);
    H.updateMatrixWorld(true); K.win = pane.getWorldPosition(_v()).toArray();
    // ---- ten brothers kneeling round the fire (four builds, varied palettes and heights), one apart from the glow
    const PP = await loadPeople(THREE, GLTFLoader);
    const PAL = [['#7a3a22', '#3a2b22'], ['#5a6030', '#3b3528'], ['#3a3634', '#2a2624'], ['#9a7034', '#4a3626'], ['#6a2a1c', '#2e2a28'],
      ['#4a5a3a', '#3e3428'], ['#2e2c2a', '#1d1b1a'], ['#8a6a3a', '#5b4130'], ['#5a3424', '#3a2b22'], ['#6a6a52', '#4a3626']];
    K.bros = [];
    for (let i = 0; i < 10; i++) {
      const apart = i === 9, a = (i / 9.6) * Math.PI * 2 + 0.55, rad = apart ? 3.3 : 2.25;
      const x = FX + Math.cos(a) * rad, z = FZ + Math.sin(a) * rad;
      // three body builds (geometry is cached per build), ten palettes and heights
      const T = [{ outfit: 'traveller', beard: 'full', headwear: 'keffiyeh', seed: 41 }, { outfit: 'thobe', beard: 'short', headwear: 'keffiyeh', seed: 42 }, { outfit: 'thobe', beard: 'full', headwear: 'wrap', seed: 43 }][i % 3];
      const p = PP.make({ kind: 'man', ...T, palette: { robe: PAL[i][0], cloak: PAL[i][1], wrap: '#d8ccb4', trousers: '#9a8a70', sash: '#6a4a2a' }, detail: 0.6, height: 0.95 + 0.07 * Math.sin(i * 2.7) });
      p.object3d.position.set(x, hy(x, z) - 0.02, z); p.object3d.rotation.y = Math.atan2(FX - x, FZ - z); sc.add(p.object3d);
      K.bros.push({ p, a, x, z, apart });
    }
    // ---- cameras
    const G0 = (x, z, dy) => [x, hy(x, z) + dy, z], F = K.F;
    const wellP = P.well.position;
    K.cams = {
      fireA: { pos: G0(FX + 0.6, FZ + 4.4, 0.75), look: [FX - 0.3, F[1] + 0.8, FZ - 1], fov: fv(46) },
      fireB: { pos: G0(FX + 0.57, FZ + 4.25, 0.75), look: [FX - 0.3, F[1] + 0.8, FZ - 1], fov: fv(45) },
      rackA: { pos: G0(11.6, -1.2, 1.3), look: [FX, F[1] + 0.4, FZ], fov: fv(30) },
      rackB: { pos: G0(11.6, -1.2, 1.3), look: K.win, fov: fv(24) },
      ringA: { pos: G0(FX + 5.6, FZ + 2.0, 2.2), look: [FX, F[1] + 0.7, FZ], fov: fv(48) },
      ringB: { pos: G0(FX + 4.6, FZ + 3.8, 2.2), look: [FX, F[1] + 0.7, FZ], fov: fv(48) },
      wallA: { pos: G0(12.6, -2.6, 1.6), look: [FX, F[1] + 0.6, FZ], fov: fv(42) },
      wallB: { pos: G0(10.4, -0.9, 1.6), look: [FX, F[1] + 0.6, FZ], fov: fv(42) },
      winA: { pos: G0(11.6, -1.2, 1.5), look: K.win, fov: fv(26) },
      winB: { pos: G0(11.6, -1.2, 1.5), look: [FX - 0.4, F[1] + 0.5, FZ - 0.2], fov: fv(46) },
      listen: { pos: G0(10.2, -0.6, 1.75), look: [FX - 0.2, F[1] + 0.75, FZ - 0.5], fov: fv(46) },
      leanA: { pos: G0(10.0, -0.9, 1.7), look: [FX - 0.2, F[1] + 0.7, FZ - 0.5], fov: fv(44) },
      leanB: { pos: G0(9.7, -1.3, 1.65), look: [FX - 0.3, F[1] + 0.65, FZ - 0.5], fov: fv(41) },
      well: { pos: G0(3.0, 7.5, 1.6), look: [wellP.x, wellP.y + 0.5, wellP.z], fov: fv(16) },
      shrink: { pos: G0(FX + 1.7, FZ + 2.6, 1.3), look: [FX, F[1] + 0.3, FZ], fov: fv(34) },
      embA: { pos: G0(FX + 1.3, FZ + 1.6, 1.35), look: [FX, F[1] + 0.12, FZ], fov: fv(34) },
      embB: { pos: G0(FX + 1.15, FZ + 1.4, 1.25), look: [FX, F[1] + 0.12, FZ], fov: fv(31) },
      spark: { pos: G0(FX + 1.0, FZ + 1.2, 1.1), look: [FX, F[1] + 0.12, FZ], fov: fv(25) },
    };
    K.wellP = [wellP.x, wellP.y, wellP.z];
    { const rim = new THREE.DirectionalLight(0x9ab4ff, 0.8); rim.position.set(FX - 8, FY + 10, FZ - 9); rim.target.position.set(FX, FY, FZ); sc.add(rim, rim.target); }
    { const a = K.cams.well.pos, b = K.wellP; for (const o of P.olives) { const ox = o.position.x - a[0], oz = o.position.z - a[2], dx = b[0] - a[0], dz = b[2] - a[2], L = dx * dx + dz * dz;
      const k = clamp((ox * dx + oz * dz) / L), ex = ox - k * dx, ez = oz - k * dz; if (Math.hypot(ex, ez) < 3.5 && k < 0.9) o.visible = false; } }
    HILLS.update(0, 0, {}); G.R.compile(HILLS.scene, HILLS.camera);
    console.error(`[y12-02] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams;
    let cam, expo = 0.95;
    if (t < 1.96) cam = camL(C.fireA, C.fireB, E.inOutSine(prog(t, 0, 1.96)));
    else if (t < 4.14) cam = camL(C.rackA, C.rackB, E.inOutCubic(prog(t, 2.1, 3.9)));
    else if (t < 5.83) cam = camL(C.ringA, C.ringB, E.inOutSine(prog(t, 4.14, 5.83)));
    else if (t < 7.90) cam = camL(C.wallA, C.wallB, E.inOutSine(prog(t, 5.83, 7.9)));
    else if (t < 11.39) { cam = camL(C.winA, C.winB, E.inOutCubic(prog(t, 8.6, 10.9))); expo = lerp(0.8, 1.05, E.inOutSine(prog(t, 8.6, 10.9))); }
    else if (t < 13.05) cam = C.listen;
    else if (t < 14.69) cam = camL(C.leanA, C.leanB, E.inOutSine(prog(t, 13.05, 14.69)));
    else if (t < 16.75) { cam = C.well; expo = 1.1; }
    else if (t < 18.33) cam = C.shrink;
    else if (t < 20.77) cam = camL(C.embA, C.embB, E.inOutSine(prog(t, 18.33, 20.77)));
    else if (t < 23.58) cam = C.spark;
    else cam = camL(C.spark, C.fireA, E.inOutCubic(prog(t, 25.2, D)));
    // ---- fire state: full -> lower flame (16.75) -> no flame (18.3) -> embers dark from the edge -> one ember
    const P = HILLS.set.props, A = HILLS.set.atmo;
    const flameK = t > 24.6 ? sm((t - 24.6) / 1.6) : 1 - 0.55 * sm((t - 16.8) / 1.2) - 0.45 * sm((t - 17.9) / 0.8);
    P.fire.visible = flameK > 0.01; P.fire.scale.setScalar(Math.max(0.05, 0.3 + 0.45 * flameK));
    let glow = 0;
    K.coals.forEach((o) => { let k = 1 - sm((t - o.out) / 0.6); if (o.last) k = t < 23.58 ? 1 : 1 + 0.8 * sm((t - 23.8) / 1.4);
      if (t > 24.6) k = Math.max(k, sm((t - 24.6 - o.d * 2) / 1.0));                  // the glow spreads back through the bed (loop to shot 1)
      o.m.emissiveIntensity = 2.6 * k * (0.85 + 0.15 * Math.sin(t * 2.3 + o.d * 20)); glow += k; });
    K.EL.intensity = 0.3 + 2.4 * flameK + 0.04 * glow; K.EL.position.y = K.F[1] + 0.3 + 0.3 * flameK;
    K.sparks.userData.update(t, clamp(flameK * 1.1));
    // ---- the brothers: kneeling, heads turn toward each other (12.0), the ring leans in (13.1), one points at the well (13.6)
    K.bros.forEach((b, i) => {
      const p = b.p; p.setPose('kneel', t + i * 1.7);
      const lean = E.inOutSine(prog(t, 13.1, 14.2)) * (b.apart ? 0.05 : 0.16);
      const sp = p.bones('Spine1'); if (sp) { sp.rotation.x += lean; }
      const hd = p.bones('Head'); if (hd) hd.rotation.y += 0.45 * Math.sin(i * 1.9) * E.inOutSine(prog(t, 11.6, 12.4));
      if (i === 0 && t > 13.4) { const k = E.inOutCubic(prog(t, 13.4, 14.0)); const sh = p.bones('RightArm').getWorldPosition(_v());
        const dir = V3(K.wellP[0] - sh.x, 0.25, K.wellP[2] - sh.z).normalize(); const rest = p.bones('RightHand').getWorldPosition(_v());
        reach(p, 'Right', rest.lerp(sh.clone().addScaledVector(dir, 0.62), k), sh.clone().add(V3(0, -1, 0))); }
    });
    // the dusk light keeps falling all film
    // evening: the last glow sinks behind the ridge as the night comes on
    const sky = P.sky.userData.u, dusk = lerp(1.2, 0.45, prog(t, 0, 22));
    sky.sunD.value.set(-0.6, -0.04, -0.8).normalize(); sky.sunC.value.setRGB(1.0 * dusk, 0.5 * dusk, 0.2 * dusk); sky.glow.value = 1.0; sky.sunDisc.value = 2.0; sky.moonOn.value = 0;
    A.sun.intensity = 0.4; HILLS.scene.environmentIntensity = lerp(0.6, 0.3, prog(t, 0, 20)); if (A.hemi) A.hemi.intensity = 0.06;
    G.renderSet(ctx, HILLS, t, u, { cam, exposure: expo, fire: 0.26 * flameK });
    CAP.draw(ctx, t);
    const su = prog(t, 25.05, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
