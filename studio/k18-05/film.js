// k18-05 "Everything He Bragged About Was Gone" (Al-Kahf 18:39, 18:42). The same two gardens, lush then ruined.
// The collapsed trellis in grey dust; a bright flashback at the gate (the friend shows the way, the owner's ringed hand
// brushes the gate post, pauses, drops); the ruin: a slow knee-high orbit round the owner wringing his hands; the dry
// stream bed; the empty threshold; a dry date frond; the open gate in clear light that flattens to grey (loop).
// People only from behind / as hands, cropped below the shoulder. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { two_gardens } from '../lib_shared/sets_kahf.js';
import { PALETTES } from '../lib_shared/people.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 33.21;

let LUSH, RUIN, CAP, hy, gy, OWN, FRI, TUMBLE, FROND, DATES;
const C = {};
const GATE = [-21, 18], PIER_X = GATE[0] + 1.3;           // inner face of the east gate pier
const OR = [-24.75, 3];                                       // where he stands in the ruin (the middle vine row)
const sx = (z) => 0.6 * Math.sin(z / 9);

const SHOTS = [
  { t0: 0.00, t1: 2.60, set: 'r', a: 'ruin_a', b: 'ruin_b' },
  { t0: 2.60, t1: 4.37, set: 'l', a: 'thr' },
  { t0: 4.37, t1: 6.13, set: 'l', a: 'fhand_a', b: 'fhand_b', ease: E.inOutSine },
  { t0: 6.13, t1: 8.41, set: 'l', a: 'post' },
  { t0: 8.41, t1: 10.69, set: 'l', a: 'post2' },
  { t0: 10.69, t1: D, set: 'r', orbit: true },              // shots 6-9 (orbit) handled in camFor; later shots below override
];
const LATE = [
  { t0: 21.75, t1: 24.52, set: 'r', a: 'bed' },
  { t0: 24.52, t1: 26.12, set: 'r', a: 'empty' },
  { t0: 26.12, t1: 27.72, set: 'r', a: 'frond' },
  { t0: 27.72, t1: 30.22, set: 'r', a: 'crack_a', b: 'crack_b', ease: E.inOutSine },
  { t0: 30.22, t1: D, set: 'l', a: 'gate_end' },
];
function shot(t) {
  for (let k = 0; k < LATE.length; k++) if (t >= LATE[k].t0) { if (k === LATE.length - 1 || t < LATE[k + 1].t0) { const s = LATE[k]; return { i: 9 + k, s, p: clamp((t - s.t0) / (s.t1 - s.t0)) }; } }
  const r = K.shotAt(SHOTS, t); if (r.s.orbit) { const q = Math.min(3, Math.floor((t - 10.69) / 2.765)); return { i: 5 + q, s: r.s, p: r.p }; } return r;
}
function orbitCam(t) {
  // one continuous orbit (shots 6-9): from behind (+z) round his left to the front-left; knee height rising to the belt
  const k = prog(t, 10.69, 21.75), a = 0.5 + 2.1 * k, R = 2.8;
  const y = hy(OR[0], OR[1]) + 0.45 + 0.3 * E.inOutSine(prog(t, 15.5, 19.5));
  const pos = [OR[0] - Math.sin(a) * R, y, OR[1] + Math.cos(a) * R];
  return { pos, look: [OR[0], hy(OR[0], OR[1]) + 0.55, OR[1]], fov: K.lensFov(36) };
}

function posePeople(t, i, set) {
  const show = (p, v) => { p.object3d.visible = v; };
  if (set === 'l') {
    show(OWN, i >= 1 && i <= 4); show(FRI, i === 1 || i === 2);
    // the friend inside the gate on the left, facing into the garden; his right hand shows the way in
    K.place(FRI, GATE[0] - 0.45, gy, GATE[1] - 2.6, Math.PI + 0.35); FRI.setPose('stand', t + 2);
    const pk = E.inOutSine(prog(t, 3.0, 4.0));
    if (pk > 0) { FRI.object3d.updateMatrixWorld(true); const h0 = K.handPos(FRI, 'Right'), tgt = K.onBody(FRI, -0.42, 1.2, 0.45);
      K.reach(FRI, 'Right', h0.lerp(tgt, pk), K.onBody(FRI, -0.9, 0.6, -0.3)); K.handAim(FRI, 'Right', K.onBody(FRI, -0.55, 1.18, 0.9), -1.2 * pk); K.flatHand(FRI, 'Right', 0.25); }
    // the owner walks in through the gate (shot 2), then stands by the east pier with his hand on it (shots 4-5)
    if (i === 1 || i === 2) { const z = GATE[1] - 0.7 - 1.0 * (t - 2.6); K.place(OWN, GATE[0] + 0.55, gy, z, Math.PI); OWN.setPose('walk', t); }
    else if (i === 3 || i === 4) {
      K.place(OWN, PIER_X - 0.55, gy, GATE[1] + 0.25, Math.PI); OWN.setPose('stand', 1.5);
      const zz = GATE[1] + 0.25 - 0.3 * E.inOutSine(prog(t, 6.3, 7.8));           // brushes along the post
      const drop = E.inOutSine(prog(t, 9.7, 10.5)), tgt = V(PIER_X - 0.01, gy + 1.32 - 0.5 * drop, zz - 0.02 * drop);
      K.reach(OWN, 'Right', tgt.clone().add(V(-0.3 * drop, 0, 0)), K.onBody(OWN, 0.9, 0.5, -0.4));
      K.handAim(OWN, 'Right', tgt.clone().add(V(-0.02 - 0.2 * drop, 0.1, -0.1)), 1.45); K.flatHand(OWN, 'Right', 0.15 + 1.0 * E.inOutSine(prog(t, 8.9, 9.6)));
    }
    return;
  }
  show(FRI, false); show(OWN, i >= 5 && i <= 8);
  if (i >= 5 && i <= 8) {
    K.place(OWN, OR[0], hy(OR[0], OR[1]), OR[1], Math.PI); OWN.setPose('stand', t);
    // the hands turn over and over (wringing) at the waist, then hang (shot 9)
    const hang = E.inOutSine(prog(t, 19.0, 19.8)), w = t * 2.1;
    for (const [side, sg] of [['Left', 1], ['Right', -1]]) {
      const tgt = K.onBody(OWN, sg * (0.05 + 0.02 * Math.sin(w + sg)), 0.98 + 0.03 * Math.sin(w * 0.7), 0.24 + 0.03 * Math.cos(w));
      OWN.object3d.updateMatrixWorld(true); const h0 = K.handPos(OWN, side);
      if (hang < 1) { K.reach(OWN, side, tgt.lerp(h0, hang), K.onBody(OWN, sg * 0.8, 0.8, -0.4)); K.handAim(OWN, side, K.onBody(OWN, -sg * 0.1, 1.0, 0.4), sg * (1.2 * Math.sin(w + (sg > 0 ? 0 : 1.6))) * (1 - hang)); K.flatHand(OWN, side, 1.1); }
    }
    K.tilt(OWN, 'Spine1', 6, 0, 0); K.tilt(OWN, 'Neck', 18, 0, 0);
  }
}

function makeTumble() {
  // a loose knot of dry vine (tubes wound on a sphere); it rolls on its own radius as a pure function of t
  const g = new THREE.Group(), r = W.rng(9), m = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.95 });
  for (let k = 0; k < 7; k++) { const pts = []; const a0 = r() * 6.28, b0 = r() * 6.28; for (let j = 0; j <= 12; j++) { const a = a0 + j * 0.55, b = b0 + j * 0.31 * (k % 2 ? 1 : -1); pts.push(V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(0.17 + 0.04 * r())); }
    g.add(W.shadows(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 6), m))); }
  return g;
}
function makeFrond() {
  const g = new THREE.Group(), stem = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 }), lm = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.9, side: THREE.DoubleSide });
  const pts = []; for (let j = 0; j <= 10; j++) pts.push(V(j * 0.18, 0.02 + 0.05 * Math.sin(j / 10 * Math.PI), 0.06 * Math.sin(j * 0.5)));
  const cur = new THREE.CatmullRomCurve3(pts); g.add(W.shadows(new THREE.Mesh(new THREE.TubeGeometry(cur, 60, 0.012, 8), stem)));
  const r = W.rng(4);
  for (let j = 0; j < 46; j++) { const u = 0.12 + 0.85 * j / 46, p = cur.getPointAt(u), s = j % 2 ? 1 : -1, L = 0.32 * (1 - 0.6 * u) + 0.05;
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.034).translate(L / 2, 0, 0), lm); leaf.position.copy(p); leaf.rotation.set(-1.35 + 0.3 * r(), s * (1.0 + 0.3 * r()), 0.25 * r()); g.add(W.shadows(leaf)); }
  return g;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    const l = await two_gardens({ state: 'lush', time: 'day' });
    const r = await two_gardens({ state: 'ruined' });
    hy = l.props.terrain.heightAt; gy = hy(...GATE);
    const PE = await K.people();
    OWN = PE.make({ kind: 'man', outfit: 'noble', palette: { ...PALETTES.noble, robe: '#f1e8d6', cloak: '#2a1f3a', trim: '#d4a63c', sash: '#7a2e24', skin: '#9a6a48' }, beard: 'full', headwear: 'turban', seed: 41, build: 1.25, detail: 0.9 });
    FRI = PE.make({ kind: 'man', outfit: 'traveller', palette: { ...PALETTES.earth, robe: '#8a7a62', cloak: '#6a5a44', wrap: '#cfc2a8', skin: '#8a5a3a' }, beard: 'short', headwear: 'wrap', seed: 17, build: 0.85, detail: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0c050, metalness: 1, roughness: 0.18 }), ruby = new THREE.MeshPhysicalMaterial({ color: 0x9a0a1a, roughness: 0.05, clearcoat: 1 });
    const ring = (gem) => { const g = new THREE.Group(), q = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.003, 12, 48), gold); q.rotation.x = Math.PI / 2; g.add(q); if (gem) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 16, 12), ruby); s.position.z = 0.012; g.add(s); } g.scale.setScalar(100); return g; };
    OWN.bones('RightHandRing1').add(ring(true)); OWN.bones('RightHandIndex1').add(ring(false)); OWN.bones('LeftHandRing1').add(ring(false));
    TUMBLE = makeTumble(); r.scene.add(TUMBLE);
    FROND = makeFrond(); FROND.position.set(-15.2, hy(-15.2, 13.2) + 0.005, 13.2); FROND.rotation.y = 0.5; r.scene.add(FROND);
    // shrivelled dates falling from a bare palm beyond him (shot 8)
    { const g = new THREE.SphereGeometry(0.02, 10, 8).scale(1, 1, 1.6), m = new THREE.MeshStandardMaterial({ color: 0x3a2212, roughness: 0.8 }); DATES = new THREE.InstancedMesh(g, m, 6); r.scene.add(DATES); }
    // cameras
    C.ruin_a = { pos: [-17.6, hy(-17.6, 12) + 0.5, 12.8], look: [-21.5, 0.25, 5], fov: 44 };
    C.ruin_b = { pos: [-17.75, hy(-17.75, 12.4) + 0.5, 12.4], look: [-21.5, 0.25, 5], fov: 44 };
    C.thr = { pos: [GATE[0] + 0.2, gy + 0.45, GATE[1] + 0.35], look: [GATE[0] - 0.2, gy + 1.5, GATE[1] - 8], fov: 58 };
    C.fhand_a = { pos: [GATE[0] - 0.55, gy + 1.45, GATE[1] - 0.15], look: [GATE[0] - 1.1, gy + 1.15, GATE[1] - 1.6], fov: 36 };
    C.fhand_b = { pos: [GATE[0] - 0.62, gy + 1.38, GATE[1] - 0.45], look: [GATE[0] - 1.1, gy + 1.15, GATE[1] - 1.6], fov: 34 };
    C.post = { pos: [PIER_X - 1.0, gy + 1.5, GATE[1] + 1.7], look: [PIER_X - 0.05, gy + 1.28, GATE[1] + 0.0], fov: 30 };
    C.post2 = { pos: [PIER_X - 0.95, gy + 1.45, GATE[1] + 1.6], look: [PIER_X - 0.05, gy + 1.2, GATE[1] - 0.05], fov: 30 };
    C.bed = { pos: [sx(10) + 0.2, hy(sx(10), 10) + 0.18, 10], look: [sx(4), hy(sx(4), 4) - 0.05, 4], fov: 34 };
    C.empty = { pos: [GATE[0] + 0.1, gy + 0.95, GATE[1] - 3.2], look: [GATE[0], gy + 0.4, GATE[1] + 0.2], fov: 46 };
    C.frond = { pos: [-13.4, hy(-13.4, 14.6) + 0.55, 14.6], look: [-14.6, hy(-15, 13.3) + 0.03, 13.3], fov: 40 };
    C.crack_a = { pos: [sx(-6) - 0.1, hy(sx(-6), -6) + 0.22, -6], look: [sx(-9), hy(sx(-9), -9) - 0.1, -9], fov: 30 };
    C.crack_b = { pos: [sx(-6.5) - 0.1, hy(sx(-6.5), -6.5) + 0.18, -6.5], look: [sx(-9), hy(sx(-9), -9) - 0.1, -9], fov: 28 };
    C.gate_end = { pos: [GATE[0] + 2.6, gy + 1.55, GATE[1] + 8.5], look: [GATE[0], gy + 1.8, GATE[1]], fov: 42 };
    LUSH = W.stage(l); RUIN = W.stage(r);
    for (const st of [LUSH, RUIN]) { st.set.update(0, null, {}); }
    l.scene.add(OWN.object3d, FRI.object3d); G.R.compile(l.scene, LUSH.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-05] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = shot(t);
    const ST = s.set === 'l' ? LUSH : RUIN;
    for (const f of [OWN, FRI]) if (f.object3d.parent !== ST.scene) ST.scene.add(f.object3d);
    posePeople(t, i, s.set);
    let cam = s.orbit ? orbitCam(t) : K.camLerp(C[s.a], s.b ? C[s.b] : null, (s.ease || E.linear)(p));
    if (i === 2) { const k = E.inOutSine(p), a = K.onBody(FRI, -0.75 + 0.05 * k, 1.5, -1.9 + 0.2 * k), b = K.onBody(FRI, -0.5, 1.05, 1.4); cam = { pos: a.toArray(), look: b.toArray(), fov: K.lensFov(40) }; }
    cam = K.breathe(cam, t, 0.0008, 6 + i);
    // the loose vine rolls past his feet in the gust (shot 9), and across the bed (shot 10)
    { const a = prog(t, 19.3, 21.6), b = prog(t, 21.9, 24.4), on = a > 0 && a < 1 ? 1 : b > 0 && b < 1 ? 2 : 0;
      TUMBLE.visible = on > 0;
      if (on === 1) { const x = OR[0] - 2.4 + 4.8 * a; TUMBLE.position.set(x, hy(x, OR[1] + 0.5) + 0.18, OR[1] + 0.55); TUMBLE.rotation.set(0, 0, -(x - OR[0]) / 0.19); }
      if (on === 2) { const z = 9.2 - 4.5 * b, x = sx(z) - 1.6 + 3.0 * b; TUMBLE.position.set(x, hy(x, z) + 0.18, z); TUMBLE.rotation.set(-(z) / 0.19, 0, -(x) / 0.19); } }
    { const M4 = new THREE.Matrix4(); for (let k = 0; k < 6; k++) { const t0 = 16.6 + k * 0.33, dt = t - t0, y = 9.5 - 4.9 * dt * dt;
        M4.makeTranslation(-27.5 + 0.2 * k, dt > 0 && y > hy(-27.5, -6) ? y : (dt > 0 ? hy(-27.5, -6) + 0.02 : -50), -6 + 0.15 * k); DATES.setMatrixAt(k, M4); } DATES.instanceMatrix.needsUpdate = true; }
    LUSH.bloom = (i === 3 || i === 4 || i === 2) ? 0 : LUSH.set.bloom;
    const ex = (i === 3 || i === 4) ? 0.5 : (i === 9 || i === 12) ? 0.72 : 1;
    G.renderSet(ctx, ST, t, u, { cam, dust: 1, exposure: ST.set.exposure * ex });
    // the last 1.6 s: the clear light flattens toward the grey of the ruin (loop into frame 1)
    const grey = s.set === 'l' && i === 13 ? E.inOutSine(prog(t, D - 1.6, D)) : 0;
    if (grey > 0) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.85 * grey; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, M.W, M.H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.22 * grey; ctx.fillStyle = '#b8b0a0'; ctx.fillRect(0, 0, M.W, M.H); ctx.restore(); }
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
