// k18-02 "They Looked Awake. They Were Asleep for Three Hundred Years" (Al-Kahf 18:18, 18:25). The cave chamber.
// An open hand on the floor in a shaft of sun; the row of cloaked sleepers breathing; the dog stretched across the
// threshold; the cloaks turn to the right and to the left by themselves; a locked time-lapse of the sun sweeping the
// floor; leaves and a creeping vine on the lip; the hand again, untouched. Faceless: the sleepers are cloaks, hoods
// away; the one figure seen is seen from behind (back, sleeve, hand). Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { mountain_cave } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 30.54;

let COVER, SET, ST, CAP, H, MAN, HAND, FUR, MIRR = [], DUST, LEAVES, VINE, VLEAF, VLEAF_BASE = [], DRIP;
const C = {};
const MX = 0.6, MZ = -6.75;                 // the near sleeper (people.js, seen from behind) lies along x, head toward -x
// turn state: 0 = as found, 1 = turned to the other side
const turn = (t) => t < 13 ? E.inOutSine(prog(t, 9.9, 11.9)) : t < 15.35 ? 1 - E.inOutSine(prog(t, 12.9, 14.9)) : E.inOutSine(prog(t, 16.4, 17.4));
// time-lapse clock for shots 7-8: the sun sweeps the floor again and again
const lapse = (t) => (t < 15.35 ? 0 : (t - 15.35) * 1.45);

const SHOTS = [
  { t0: 0.00, t1: 1.89, a: 'hand_a', b: 'hand_b' },
  { t0: 1.89, t1: 3.77, a: 'rack_a', b: 'rack_b', ease: E.inOutSine },
  { t0: 3.77, t1: 6.60, a: 'pull_a', b: 'pull_b', ease: E.inOutCubic },
  { t0: 6.60, t1: 9.51, a: 'dog' },
  { t0: 9.51, t1: 12.43, a: 'roll_a', b: 'roll_b', ease: E.inOutSine },
  { t0: 12.43, t1: 15.35, a: 'roll_b', b: 'roll_a', ease: E.inOutSine },
  { t0: 15.35, t1: 17.77, a: 'lapse', lapse: true },
  { t0: 17.77, t1: 20.18, a: 'lip', lapse: true },
  { t0: 20.18, t1: 22.22, a: 'hand_b' },
  { t0: 22.22, t1: 25.17, a: 'side_a', b: 'side_b', ease: E.inOutSine },
  { t0: 25.17, t1: 27.87, a: 'paws' },
  { t0: 27.87, t1: D, a: 'push_a', b: 'hand_a', ease: E.inOutSine },
];

function poseMan(t) {
  const p = MAN;
  p.setPose('stand', 2.0);                                  // a fixed rest frame (he does not move)
  // lie on the left side along x: head toward -x, facing -z (away from the mouth)
  const R = new THREE.Matrix4().makeBasis(V(0, -1, 0), V(-1, 0, 0), V(0, 0, -1));
  p.object3d.position.set(MX + 0.85, H(MX, MZ) + 0.16, MZ); p.object3d.quaternion.setFromRotationMatrix(R); p.object3d.updateMatrixWorld(true);
  K.tilt(p, 'LeftUpLeg', -28, 0, 0); K.tilt(p, 'RightUpLeg', -34, 0, 0); K.tilt(p, 'LeftLeg', 46, 0, 0); K.tilt(p, 'RightLeg', 52, 0, 0);
  K.tilt(p, 'Spine', 6 + 1.5 * Math.sin(t * Math.PI * 2 / 4.8), 0, 0);       // breathing under the cloak
  K.tilt(p, 'Neck', 18, 0, 0);
  // the upper (right) hand rests open on the floor behind his hip, palm up, fingers curled
  K.reach(p, 'Right', HAND.clone(), V(MX, 0.9, MZ + 0.9));
  K.handAim(p, 'Right', HAND.clone().add(V(0.12, 0.0, 0.07)), -1.3); K.flatHand(p, 'Right', 0.7);
  K.reach(p, 'Left', V(MX - 1.25, H(MX, MZ) + 0.05, MZ - 0.22), V(MX - 0.9, 0.0, MZ - 0.8));
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await mountain_cave({ time: 'day', day: 0.5, sleepers: 5, dog: true, lamp: false, vista: false });
    H = SET.props.terrain.heightAt;
    const S = SET.scene;
    HAND = V(MX - 0.58, H(MX - 0.58, MZ + 0.5) + 0.03, MZ + 0.5);
    // mirrored twins of each cloak (the turned side), dissolved with alpha-hash so the cloaks turn without a hand
    for (const sl of SET.props.sleepers) {
      const m0 = sl.material; m0.alphaHash = true; m0.transparent = false; m0.needsUpdate = true;
      const m1 = m0.clone(); m1.onBeforeCompile = m0.onBeforeCompile; m1.customProgramCacheKey = m0.customProgramCacheKey;
      const tw = new THREE.Mesh(sl.geometry, m1); tw.castShadow = tw.receiveShadow = true; tw.position.copy(sl.position); tw.rotation.copy(sl.rotation); tw.scale.set(-1, 1, 1); tw.userData.U = sl.userData.U;
      S.add(tw); MIRR.push({ a: sl, b: tw, ry: sl.rotation.y });
    }
    // the dog: a short coat of shell fur over the sculpted body
    const dog = SET.props.dog; let body = null; dog.traverse((m) => { if (!body && m.isMesh && m.geometry.attributes.color && m.geometry.attributes.position.count > 5000) body = m; });
    if (body) { FUR = K.shellFur(body, { layers: 12, len: 0.011, dens: 1100, wind: 0.0015, tint: 0.55 }); FUR.shells.forEach((m) => { m.material.envMapIntensity = 0.3; m.material.color.multiply(new THREE.Color(0.75, 0.5, 0.32)); }); }
    // the near sleeper (faceless, from behind): wool cloak over a plain tunic, head-cloth
    const PE = await K.people();
    MAN = PE.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#4a3c30', cloak: '#4a3c30', wrap: '#4a3c30', sash: '#4a3a2c', trousers: '#6a5a46', skin: '#6e4630' }, beard: 'none', headwear: 'wrap', seed: 151, detail: 1 });
    S.add(MAN.object3d);
    MAN.object3d.traverse((o) => { if (o.isMesh && o.material && 'sheen' in o.material) { o.material.sheen = Math.min(o.material.sheen, 0.12); o.material.envMapIntensity = 0.5; if (o.material.emissive && o.material.emissive.getHex() === 0 && o.material.color.getHSL({}).l > 0.3) o.material.color.set(0x4a3c30); } });
    // his clothes in the same coarse wool as the cloaks (plain standard material on the skinned meshes)
    { const src = SET.props.sleepers[0].material, wool = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 1, envMapIntensity: 0.3 });
      MAN.object3d.traverse((o) => { if (o.isMesh && !/hand|head|foot|sandal/i.test(o.name)) o.material = wool; }); }
    // his own cloak drawn over him (the same wool as the others): only the sleeve and hand come out from under its edge
    { const src = SET.props.sleepers[0]; const cm = src.material.clone(); cm.onBeforeCompile = src.material.onBeforeCompile; cm.customProgramCacheKey = src.material.customProgramCacheKey; cm.alphaHash = false; cm.opacity = 1; COVER = new THREE.Mesh(src.geometry, cm); COVER.userData.U = src.userData.U; COVER.castShadow = COVER.receiveShadow = true;
      COVER.position.set(MX - 0.05, H(MX, MZ) - 0.01, MZ - 0.05); COVER.rotation.y = -Math.PI / 2; COVER.scale.set(0.78, 1.3, 1.0); S.add(COVER); }
    // dust in the shaft
    DUST = K.dustMotes({ centre: [0.2, 0.9, -5.6], size: [3.4, 1.8, 3.2], count: 420, seed: 8, px: 0.006, op: 0.55, fall: 0.008 }); S.add(DUST);
    // a drip far back in the dark (a falling bead + a ring)
    DRIP = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.2 })); S.add(DRIP);
    // dry leaves blowing across the lip (time-lapse), and a vine creeping over the lip stone
    { const N = 46, g = new THREE.CircleGeometry(0.055, 10); g.scale(0.55, 1, 1); const m = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.8, side: THREE.DoubleSide });
      LEAVES = new THREE.InstancedMesh(g, m, N); LEAVES.castShadow = true; S.add(LEAVES); LEAVES.userData.r = Array.from({ length: N }, (_, k) => { const r = W.rng(300 + k); return [r(), r(), r(), r()]; }); }
    { const pts = [V(-2.9, 0.02, 1.35), V(-2.6, 0.05, 0.95), V(-2.25, 0.14, 0.7), V(-1.8, 0.16, 0.48), V(-1.25, 0.155, 0.62), V(-0.7, 0.16, 0.36), V(-0.2, 0.15, 0.55)];
      const cur = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(cur, 240, 0.011, 8);
      VINE = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0x3a4a22, roughness: 0.7 })); VINE.castShadow = true; S.add(VINE); VINE.userData.idx = tg.index.count;
      const N = 64, lg = new THREE.CircleGeometry(0.045, 12); lg.scale(0.8, 1, 1); lg.translate(0, 0.024, 0);
      VLEAF = new THREE.InstancedMesh(lg, new THREE.MeshStandardMaterial({ color: 0x46602a, roughness: 0.6, side: THREE.DoubleSide }), N); S.add(VLEAF);
      for (let k = 0; k < N; k++) { const u = (k + 0.5) / N, p = cur.getPointAt(u); VLEAF_BASE.push([u, p, k]); } }
    // cameras (fov = vertical degrees in 9x16)
    C.hand_a = { pos: [HAND.x + 0.24, HAND.y + 0.3, HAND.z + 0.62], look: [HAND.x + 0.07, HAND.y + 0.01, HAND.z + 0.05], fov: 24 };
    C.hand_b = { pos: [HAND.x + 0.23, HAND.y + 0.29, HAND.z + 0.59], look: [HAND.x + 0.07, HAND.y + 0.01, HAND.z + 0.05], fov: 24 };
    C.rack_a = { pos: [HAND.x + 0.22, HAND.y + 0.29, HAND.z + 0.58], look: [HAND.x + 0.1, HAND.y + 0.03, HAND.z], fov: 24 };
    C.rack_b = { pos: [HAND.x + 0.2, HAND.y + 0.3, HAND.z + 0.6], look: [HAND.x + 0.3, HAND.y + 0.12, HAND.z - 0.15], fov: 26 };
    C.pull_a = { pos: [HAND.x + 0.26, HAND.y + 0.33, HAND.z + 0.66], look: [HAND.x + 0.2, HAND.y + 0.05, HAND.z - 0.3], fov: 26 };
    C.pull_b = { pos: [2.3, 1.15, -3.3], look: [-0.4, 0.15, -8.6], fov: 44 };
    C.dog = { pos: [0.6, 0.55, -5.2], look: [-0.7, 0.4, 0.8], fov: 56 };
    C.roll_a = { pos: [2.6, 1.0, -5.0], look: [-0.6, 0.2, -9.3], fov: 42 };
    C.roll_b = { pos: [-2.2, 1.0, -5.0], look: [1.2, 0.2, -9.3], fov: 42 };
    C.lapse = { pos: [-2.2, 1.7, -2.4], look: [0.3, 0.0, -6.8], fov: 60 };
    C.lip = { pos: [-0.4, 0.55, 2.25], look: [-1.6, 0.12, 0.6], fov: 40 };
    C.side_a = { pos: [0.4, 0.75, -5.8], look: [-0.2, 0.2, -9.3], fov: 34 };
    C.side_b = { pos: [0.35, 0.68, -6.25], look: [-0.2, 0.2, -9.3], fov: 32 };
    C.paws = { pos: [-0.5, 0.34, 1.85], look: [-0.86, 0.12, 0.95], fov: 28 };
    C.push_a = { pos: [2.2, 0.75, -5.4], look: [HAND.x, HAND.y, HAND.z], fov: 34 };
    ST = W.stage(SET);
    poseMan(0); SET.update(0, null, {});
    { const w = (n) => MAN.bones(n).getWorldPosition(V()).toArray().map((v) => v.toFixed(2)).join(','); console.error(`[k18-02] head ${w('Head')} hips ${w('Hips')} rarm ${w('RightArm')} rhand ${w('RightHand')} target ${HAND.toArray().map((v) => v.toFixed(2))}`); } G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-02] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    let cam = K.camLerp(C[s.a], s.b ? C[s.b] : null, (s.ease || E.linear)(p));
    cam = K.breathe(cam, t, s.lapse ? 0 : 0.0012, 5 + i);
    poseMan(t);
    // the cloaks turn: twin dissolve + a small roll about the long axis
    const k = turn(t);
    for (const { a, b } of MIRR) { const roll = 0.32 * Math.sin(Math.PI * k);
      a.material.opacity = 1 - sstep01(k); b.material.opacity = sstep01(k); a.visible = a.material.opacity > 0.01; b.visible = b.material.opacity > 0.01;
      a.rotation.z = roll; b.rotation.z = -0.32 * Math.sin(Math.PI * k) * 0 + roll; }
    // sun: midday shaft; in the time-lapse it sweeps morning -> evening again and again (summer white, winter grey)
    const L = lapse(t), day = s.lapse ? (L % 1) : 0.5, winter = s.lapse ? 0.5 + 0.5 * Math.sin(L * 0.9) : 0;
    SET.props.sun.intensity = 4.2 * (1 - 0.45 * winter);
    if (FUR) FUR.update(t);
    DUST.userData.update(t, s.lapse ? 0 : 1);
    // drip (every 2.6 s, far back)
    { const ph = ((t - 4.1) % 2.6 + 2.6) % 2.6, y = 2.6 - 4.9 * ph * ph; DRIP.position.set(-3.1, Math.max(0.02, y), -11.0); DRIP.visible = y > 0.03 && t > 3.77; }
    // leaves: blown in from the slope, across the lip, out again (only while the years pass)
    { const r = LEAVES.userData.r, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Eu = new THREE.Euler();
      r.forEach(([a, b, c, d], j) => { const ph = ((L * (0.35 + 0.4 * a) + b) % 1), x = -3.5 + 7 * ph, z = 0.2 + 1.6 * c + 0.3 * Math.sin(ph * 9 + d * 6);
        const y = 0.16 + 0.006 + Math.max(0, 0.25 * Math.sin(ph * 31 + d * 9)) * (s.lapse ? 1 : 0); Eu.set(1.4 + ph * 20 * a, ph * 13 * d, ph * 7);
        M4.compose(V(x, s.lapse ? y : -5, z), Q.setFromEuler(Eu), V(1, 1, 1)); LEAVES.setMatrixAt(j, M4); }); LEAVES.instanceMatrix.needsUpdate = true; }
    // the vine creeps over the lip during the years and stays (pure function of t)
    { const gk = clamp((t - 16.0) / 4.2); VINE.geometry.setDrawRange(0, Math.floor(VINE.userData.idx * gk / 6) * 6); VINE.visible = gk > 0.002;
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion();
      VLEAF_BASE.forEach(([uu, pp, j]) => { const sc = clamp((gk - uu) * 8) * (0.7 + 0.3 * Math.sin(j * 2.3)); Q.setFromEuler(new THREE.Euler(-1.1 + 0.3 * Math.sin(j), j * 2.1, 0.2 * Math.sin(L * 3 + j)));
        M4.compose(pp, Q, V(sc + 1e-4, sc + 1e-4, sc + 1e-4)); VLEAF.setMatrixAt(j, M4); }); VLEAF.instanceMatrix.needsUpdate = true; }
    const ex = i === 3 ? 0.75 : i === 10 ? 0.85 : i === 7 ? 0.9 : i === 0 || i === 1 || i === 8 ? 0.62 : i === 11 ? 1.45 - 0.83 * E.inOutSine(prog(t, 28.6, 30.0)) : 1.45;
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex, day, mist: 0, breath: 1 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
function sstep01(x) { x = clamp(x); return x * x * (3 - 2 * x); }
