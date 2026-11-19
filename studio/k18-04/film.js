// k18-04 "He Had Two Gardens, and It Went to His Head" (Al-Kahf 18:32, 18:34). Two walled gardens, mid-morning.
// A ringed hand reaches into a grape bunch (a bee lifts off); up to both gardens; a glide along the stream past the
// vines, the palms and the barley; through the arched gate; the owner (fine robe, rings) walks with his plain friend
// and sweeps his arm over his land; dates, the stream, the ring on a palm trunk; one palm; back to the grapes.
// People only from behind / as hands. Pure function of time; seeded noise only.
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
const D = 30.52;

let SET, ST, CAP, hy, HB, OWN, FRI, BEE, WINGS = [], PALM, PALM2, TOPY = 0;
const C = {};
const GATE = [-21, 18];
const sx = (z) => 0.6 * Math.sin(z / 9);           // stream centre line
// the glide along the stream (shots 4-6): one continuous move, z = f(t)
const glideZ = (t) => 26 - 34 * prog(t, 5.19, 13.51);
// the walk (shot 8-9): both men go down the aisle between vine rows in garden A, toward -z
const AISLE = -24.75, walkZ = (t) => 9.5 - 0.95 * (t - 16.28);

const SHOTS = [
  { t0: 0.00, t1: 1.53, cam: 'grapes' },
  { t0: 1.53, t1: 3.05, cam: 'grapes2' },
  { t0: 3.05, t1: 5.19, cam: 'pullup' },
  { t0: 5.19, t1: 7.96, cam: 'glide', look: 'vines' },
  { t0: 7.96, t1: 10.74, cam: 'glide', look: 'palms' },
  { t0: 10.74, t1: 13.51, cam: 'glide', look: 'barley' },
  { t0: 13.51, t1: 16.28, a: 'gate_a', b: 'gate_b', ease: E.inOutSine },
  { t0: 16.28, t1: 18.42, cam: 'follow' },
  { t0: 18.42, t1: 20.55, cam: 'sweep' },
  { t0: 20.55, t1: 22.55, a: 'dates_a', b: 'dates_b', ease: E.inOutSine },
  { t0: 22.55, t1: 24.80, a: 'stream' },
  { t0: 24.80, t1: 27.29, a: 'ring' },
  { t0: 27.29, t1: 28.90, a: 'lone_a', b: 'lone_b', ease: E.inOutSine },
  { t0: 28.90, t1: D, cam: 'rack' },
];

function camFor(s, t, p, pe) {
  if (s.cam === 'grapes') return K.camLerp(C.g0, C.g1, E.inOutSine(p));
  if (s.cam === 'grapes2') return K.camLerp(C.g1, C.g2, E.inOutSine(p));
  if (s.cam === 'pullup') { const k = E.inOutCubic(p); const a = C.g2, b = C.aerial; const L = (x, y) => x.map((v, i) => v + (y[i] - v) * k);
    return { pos: L(a.pos, b.pos), look: L(a.look, b.look), fov: K.lensFov(a.fov * (b.fov / a.fov) ** k) }; }
  if (s.cam === 'glide') { const z = glideZ(t), x = sx(z) + 0.15;
    const ls = { vines: [-14, 0.8, z - 4], palms: [-7.3, 8.5, z - 5], barley: [-3.0, 0.45, z - 6.5] };
    // look blends across the joins so the glide never jumps
    const j0 = prog(t, 7.6, 8.3), j1 = prog(t, 10.4, 11.1);
    const lk = ls.vines.map((v, i) => v + (ls.palms[i] - v) * E.inOutSine(j0) + (ls.barley[i] - ls.palms[i]) * E.inOutSine(j1));
    const y = hy(x, z) + 5.0 - 4.1 * E.inOutSine(j1);
    return { pos: [x, y, z], look: lk, fov: K.lensFov(44) }; }
  if (s.cam === 'follow') { const z = walkZ(t) + 2.6; return { pos: [AISLE + 0.55, hy(AISLE, z) + 1.5, z], look: [AISLE - 0.3, 1.4, z - 9], fov: K.lensFov(42) }; }
  if (s.cam === 'sweep') { const z = walkZ(18.42) + 2.4; return { pos: [AISLE + 1.3, hy(AISLE, z) + 1.35, z - 0.15 * p], look: [AISLE - 1.2, 1.55, z - 4.0], fov: K.lensFov(44) }; }
  if (s.cam === 'rack') { const k = E.inOutSine(p); const L = (x, y) => x.map((v, i) => v + (y[i] - v) * k);
    return { pos: C.g0.pos, look: L(C.rack.look, C.g0.look), fov: K.lensFov(C.g0.fov) }; }
  return K.camLerp(C[s.a], s.b ? C[s.b] : null, pe);
}

function ring(gold, gem) {
  const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.003, 12, 48), gold); r.rotation.x = Math.PI / 2; g.add(r);
  if (gem) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 16, 12), gem); s.position.set(0, 0, 0.012); g.add(s); }
  g.scale.setScalar(100); return g;
}
function makeBee() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1a1208' : '#d89a2a'; x.fillRect(i * 8, 0, 8, 16); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); body.scale.set(0.0062, 0.0062, 0.011); body.rotation.y = Math.PI / 2; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 16, 12), new THREE.MeshStandardMaterial({ color: 0x140e08, roughness: 0.4 })); head.position.set(0, 0.001, 0.0085); g.add(head);
  const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 16), wm); w.scale.set(0.5, 1, 1); const piv = new THREE.Group(); piv.position.set(s * 0.002, 0.003, 0.002); w.position.set(s * 0.004, 0, -0.002); w.rotation.x = -Math.PI / 2; piv.add(w); g.add(piv); WINGS.push([piv, s]); }
  return g;
}

function posePeople(t, i) {
  OWN.object3d.visible = i <= 1 || i === 7 || i === 8 || i === 11;
  FRI.object3d.visible = i === 7 || i === 8;
  if (i <= 1) {
    // beside and a little behind the camera: the ringed hand comes in from the lower right and cups the bunch
    const at = V(HB.x + 0.5, hy(HB.x, HB.z), HB.z + 0.12); K.place(OWN, at.x, at.y, at.z, Math.atan2(HB.x - at.x, HB.z - at.z));
    OWN.setPose('stand', 1.0);
    const k = E.inOutSine(prog(t, 0.05, 0.9)), tug = i === 1 ? 0.05 * E.inOutSine(prog(t, 1.7, 2.4)) : 0;
    const tgt = V(HB.x + 0.035 + tug * 0.5, HB.y - 0.1, HB.z + 0.05 + tug);
    OWN.object3d.updateMatrixWorld(true);
    const h0 = K.handPos(OWN, 'Right');
    K.reach(OWN, 'Right', h0.lerp(tgt, k), K.onBody(OWN, -0.8, 0.6, -0.4));
    K.handAim(OWN, 'Right', tgt.clone().add(V(-0.06, 0.02, -0.06)), -0.9); K.flatHand(OWN, 'Right', 1.4);
    return;
  }
  if (i === 7 || i === 8) {
    const z = walkZ(Math.min(t, 18.42 + (i === 8 ? 0 : 0)));
    const stop = i === 8;
    K.place(OWN, AISLE - 0.35, hy(AISLE, z), z, Math.PI); OWN.setPose(stop ? 'stand' : 'walk', t);
    K.place(FRI, AISLE + 0.42, hy(AISLE, z + 0.55), z + 0.55, Math.PI); FRI.setPose(stop ? 'stand' : 'walk', t + 0.4);
    K.tilt(FRI, 'Neck', 14, 0, 0);
    // the owner's arm sweeps wide over the vines and palms (17.0 -> 20.3)
    const a = E.inOutSine(prog(t, 16.9, 18.0)), sw = E.inOutSine(prog(t, 18.6, 20.3));
    if (a > 0) { const ang = -0.9 + 1.5 * sw, tgt = K.onBody(OWN, 0.62 * Math.sin(ang) * -1, 1.45 + 0.05 * sw, 0.55 * Math.cos(ang));
      OWN.object3d.updateMatrixWorld(true); const h0 = K.handPos(OWN, 'Right');
      K.reach(OWN, 'Right', h0.lerp(tgt, a), K.onBody(OWN, -0.9, 0.4, -0.2)); K.flatHand(OWN, 'Right', 0.4); }
    return;
  }
  if (i === 11) {
    // he rests his hand on a palm trunk; the gold ring catches the sun
    const P = PALM2.position, at = V(P.x + 0.62, hy(P.x + 0.62, P.z + 0.35), P.z + 0.35);
    K.place(OWN, at.x, at.y, at.z, Math.atan2(P.x - at.x, P.z - at.z)); OWN.setPose('stand', 2.0);
    const tgt = V(P.x + 0.2, at.y + 1.42, P.z + 0.12);
    K.reach(OWN, 'Right', tgt, K.onBody(OWN, -0.8, 0.5, -0.3)); K.handAim(OWN, 'Right', tgt.clone().add(V(-0.02, 0.15, -0.02)), 1.3); K.flatHand(OWN, 'Right', 0.35);
  }
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await two_gardens({ state: 'lush' });
    hy = SET.props.terrain.heightAt; HB = SET.props.heroBunch;
    const S = SET.scene;
    BEE = makeBee(); BEE.scale.setScalar(1.5); S.add(BEE);
    // a palm on the east side of garden A (shots 10, 12), and one at the far south-west corner for the lone palm
    const palms = SET.props.palms;
    const near = (x, z) => palms.reduce((b, p) => (Math.hypot(p.position.x - x, p.position.z - z) < Math.hypot(b.position.x - x, b.position.z - z) ? p : b), palms[0]);
    PALM = near(-7.2, -4); PALM2 = near(-7.2, 6);
    { const bb = new THREE.Box3().setFromObject(PALM); TOPY = bb.max.y; }
    const PE = await K.people();
    OWN = PE.make({ kind: 'man', outfit: 'noble', palette: { ...PALETTES.noble, robe: '#f1e8d6', cloak: '#2a1f3a', trim: '#d4a63c', sash: '#7a2e24', skin: '#9a6a48' }, beard: 'full', headwear: 'turban', seed: 41, build: 1.25, detail: 0.9 });
    FRI = PE.make({ kind: 'man', outfit: 'traveller', palette: { ...PALETTES.earth, robe: '#8a7a62', cloak: '#6a5a44', wrap: '#cfc2a8', skin: '#8a5a3a' }, beard: 'short', headwear: 'wrap', seed: 17, build: 0.85, detail: 0.7 });
    S.add(OWN.object3d, FRI.object3d);
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0c050, metalness: 1, roughness: 0.18 }), ruby = new THREE.MeshPhysicalMaterial({ color: 0x9a0a1a, roughness: 0.05, transmission: 0.2, clearcoat: 1 });
    OWN.bones('RightHandRing1').add(ring(gold, ruby)); OWN.bones('RightHandIndex1').add(ring(gold, null)); OWN.bones('LeftHandRing1').add(ring(gold, null));
    // cameras
    C.g0 = { pos: [HB.x + 0.42, HB.y - 0.02, HB.z + 0.48], look: [HB.x + 0.02, HB.y - 0.12, HB.z], fov: 36 };
    C.g1 = { pos: [HB.x + 0.39, HB.y - 0.03, HB.z + 0.45], look: [HB.x + 0.03, HB.y - 0.12, HB.z], fov: 35 };
    C.g2 = { pos: [HB.x + 0.35, HB.y - 0.03, HB.z + 0.4], look: [HB.x + 0.03, HB.y - 0.12, HB.z], fov: 34 };
    C.aerial = { pos: [-6, 38, 52], look: [0, 0, 0], fov: 46 };
    C.gate_a = { pos: [GATE[0] + 2.2, hy(...GATE) + 1.55, GATE[1] + 7], look: [GATE[0], hy(...GATE) + 1.9, GATE[1]], fov: 44 };
    C.gate_b = { pos: [GATE[0] + 0.15, hy(...GATE) + 1.6, GATE[1] - 1.8], look: [GATE[0] - 0.6, hy(...GATE) + 2.2, GATE[1] - 14], fov: 52 };
    const P = PALM.position;
    C.dates_a = { pos: [P.x + 7.5, hy(P.x, P.z) + 1.6, P.z + 3.0], look: [P.x, TOPY - 2.4, P.z], fov: 26 };
    C.dates_b = { pos: [P.x + 7.5, hy(P.x, P.z) + 1.6, P.z + 3.0], look: [P.x, TOPY - 1.6, P.z], fov: 24 };
    C.stream = { pos: [sx(14) + 0.25, -0.05, 14], look: [sx(8), -0.2, 8], fov: 34 };
    const P2 = PALM2.position;
    C.ring = { pos: [P2.x + 0.62, hy(P2.x, P2.z) + 1.58, P2.z - 0.3], look: [P2.x + 0.2, hy(P2.x, P2.z) + 1.45, P2.z + 0.12], fov: 30 };
    const PL = near(-34, -15).position;
    C.lone_a = { pos: [PL.x + 5, hy(PL.x, PL.z) + 0.4, PL.z + 4], look: [PL.x, hy(PL.x, PL.z) + 4, PL.z], fov: 50 };
    C.lone_b = { pos: [PL.x + 5, hy(PL.x, PL.z) + 0.4, PL.z + 4], look: [PL.x, hy(PL.x, PL.z) + 9, PL.z], fov: 50 };
    C.rack = { look: [HB.x - 4, HB.y + 0.6, HB.z - 14] };
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-04] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    let cam = camFor(s, t, p, (s.ease || E.linear)(p));
    if (!s.cam || s.cam === 'grapes' || s.cam === 'grapes2' || s.cam === 'rack') cam = K.breathe(cam, t, 0.0007, 4 + i);
    posePeople(t, i);
    // the bee: crawls on the bunch, lifts off at 2.2 s and flies out of frame; back on the bunch in the last shot
    { const on = V(HB.x + 0.028, HB.y - 0.085, HB.z + 0.04), lift = t < 28 ? clamp((t - 2.2) / 0.8) : 0;
      BEE.visible = (t < 3.05 || t > 28.9);
      BEE.position.copy(on).add(V(0.01 * Math.sin(t * 2.1), 0.005 * Math.sin(t * 1.3), 0)).add(V(0.25 * lift * lift, 0.18 * lift, 0.12 * lift));
      BEE.rotation.set(-0.4, 1.2 + 0.3 * Math.sin(t * 0.9), 0.2);
      for (const [w, sgn] of WINGS) w.rotation.z = sgn * (lift > 0 ? 0.9 * Math.sin(t * 190) : 0.15); }
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * (i === 10 ? 0.9 : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
