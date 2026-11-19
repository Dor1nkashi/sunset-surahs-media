// y12-14 "He Had Every Reason for Revenge. Listen to What He Said" (Yusuf 12:90, 12:92). The palace court in the
// low afternoon sun: the brothers stand in their dusty cloaks; he leaves the throne, steps down to them, and their long
// shadows merge on the stone as the sun lowers. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { reunion } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from '../y12-12/kit.js';
const { THREE, clamp, lerp, sstep } = W;
const V3 = K.V3, D = 29.25;

let SET, ST, CAP, P = {}, MOTES, SHOTS, SACKS = [];
const pr = (t, a, b) => clamp((t - a) / (b - a));
const sm = (t, a, b) => K.easeIO(pr(t, a, b));
const C = (pos, look, fov, roll = 0) => ({ pos, look, fov, roll });
const DZ = -24, FLOOR = 0.08;
// the dais: three steps (tops 0.38, 0.68, 0.98), fronts at z -21.8, -22.55, -23.3; smooth risers so feet never pop
const stepY = (z) => FLOOR + 0.3 * sstep(-21.7, -21.9, z) + 0.3 * sstep(-22.45, -22.65, z) + 0.3 * sstep(-23.2, -23.4, z);
const BRO = [[-1.4, -10.9], [-0.7, -10.5], [0.0, -11.0], [0.7, -10.6], [1.4, -11.1]];
const YSTOP = -18.0;

// the sun comes from the gate side (+z), low, and sinks a little through the film: shadows lengthen toward the dais
function sunDir(t) { const e = (18 - 6 * sm(t, 15, 22)) * Math.PI / 180, a = 0.0; return V3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); }
function aimSun(t) {
  const L = SET.atmo.sun, f = V3(0, 0, -16), d = sunDir(t);
  L.position.copy(f).addScaledVector(d, 150); L.target.position.copy(f); L.target.updateMatrixWorld();
  Object.assign(L.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 320 }); L.shadow.camera.updateProjectionMatrix();
}

async function build() {
  SET = await reunion({ time: 'golden', stars: 0 });
  ST = W.stage(SET);
  // turn the sky (env + background) so the HDRI's sun sits where our sun is (gate side, +z)
  const da = (250 - 78) * Math.PI / 180; SET.scene.environmentRotation.y += da; SET.scene.backgroundRotation.y += da;
  for (const D0 of SET.props.gate) D0.leaf.rotation.y = 1.62;
  SET.atmo.sun.intensity *= 2.6; SET.scene.environmentIntensity *= 0.55; if (SET.atmo.hemi) SET.atmo.hemi.intensity *= 0.5; SET.atmo.sun.color.set(0xffc58a); ST.bloom = 0.1; ST.bloomThreshold = 0.96;
  // dust in the low sun across the court
  const N = 700, mg = new THREE.SphereGeometry(0.0022, 6, 4), mm = new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  MOTES = new THREE.InstancedMesh(mg, mm, N); MOTES.frustumCulled = false; SET.group.add(MOTES);
  // empty grain sacks at the brothers' feet (folded flat)
  const hs = await K.mats.hessian();
  for (const [x, z, r] of [[-1.35, -10.1, 0.4], [0.45, -9.9, 2.1], [1.35, -10.2, 1.1]]) { const s = W.sack(hs, { w: 0.55, h: 0.5, seed: x * 10 | 0, tie: false, open: true }); s.scale.set(1.1, 0.22, 1.1); s.position.set(x, FLOOR, z); s.rotation.y = r; SET.group.add(s); SACKS.push(s); }
  const PE = await K.people();
  P.y = PE.make({ kind: 'man', outfit: 'noble', palette: K.YUSUF_PAL, beard: 'short', headwear: 'wrap', seed: 12, detail: 1 });
  const bro = [['rust', 'full', 'keffiyeh'], ['olive', 'full', 'turban'], ['night', 'full', 'wrap'], ['earth', 'short', 'keffiyeh'], ['sand', 'short', 'turban']];
  P.bro = bro.map(([pal, beard, hw], i) => PE.make({ kind: 'man', outfit: 'traveller', palette: pal, beard, headwear: hw, seed: 60 + i * 7, detail: 0.7 }));
  for (const p of [P.y, ...P.bro]) SET.group.add(p.object3d);
}

// ------------------------------------------------------------------ people state (pure in t)
// Yusuf: seated on the throne until 8.6, then stands and walks down the dais to YSTOP, then stands (hand raised 22.64-24.48)
function yusuf(t) {
  const p = P.y; p.object3d.visible = true;
  if (t < 8.45) {
    K.place(p, 0, 0.98, DZ - 0.85, 0); p.setPose('stand', t); K.sit(p, 0.55, { lean: 2, footFwd: 0.45 });
    // right hand on the throne arm; it lifts slowly from 7.2
    const arm = V3(-0.6, 0.98 + 0.55 + 0.42 + 0.03, DZ - 0.95), up = sm(t, 7.2, 8.3);
    K.reach(p, 'Right', arm.clone().add(V3(0, 0.12 * up, 0.08 * up)), K.onBody(p, -0.7, 0.8, -0.5));
    K.reach(p, 'Left', V3(0.6, 0.98 + 0.55 + 0.42 + 0.03, DZ - 0.95), K.onBody(p, 0.7, 0.8, -0.5));
    return;
  }
  const z0 = -23.55, sp = P.y.speed('walk') || 0.85, tw = Math.max(0, t - 8.6), z = Math.min(YSTOP, z0 + sp * tw), walking = z < YSTOP && t > 8.6;
  K.place(p, 0.05, stepY(z), z, 0);
  p.setPose(walking ? 'walk' : 'stand', t);
  if (t >= 22.64 && t < 24.6) {                                  // he lifts his open hand toward them
    const e = sm(t, 22.7, 23.6); K.reach(p, 'Right', K.onBody(p, -0.22, 1.12 + 0.18 * e, 0.42), K.onBody(p, -0.8, 0.6, -0.5), e); K.tilt(p, 'RightHand', 0, -60 * e, 0); K.fingers(p, 'Right', 1 - e);
  }
}
function brothers(t) {
  P.bro.forEach((b, i) => { b.object3d.visible = true; const [x, z] = BRO[i];
    const kneel = (i === 1 && t >= 8.6) || (i === 3 && t >= 13.6) || (i === 0 && t >= 17.6);
    K.place(b, x, FLOOR, z, Math.PI + (x * 0.04)); b.setPose(kneel ? 'kneel' : 'stand', t, { offset: i * 0.8 }); if (!kneel) K.tilt(b, 'Neck', 14, 0, 0); });
}
function dust(t) {
  const M4 = new THREE.Matrix4(), n = W.noise2(9);
  for (let i = 0; i < MOTES.count; i++) {
    const x = (M.hash01(i, 1) - 0.5) * 10, z = -26 + M.hash01(i, 2) * 16, y0 = 0.15 + M.hash01(i, 3) * 2.6;
    const p = V3(x + 0.25 * n(t * 0.12 + i, 0.3), y0 + 0.12 * n(i * 0.7, t * 0.1), z + 0.25 * n(0.7, t * 0.11 + i));
    const s = 0.5 + 1.3 * M.hash01(i, 4); M4.makeScale(s, s, s).setPosition(p); MOTES.setMatrixAt(i, M4);
  }
  MOTES.instanceMatrix.needsUpdate = true;
}

function shots() {
  const floorA = C([0.9, 0.5, -12.2], [-0.1, 0.0, -18.0], 60), floorB = C([0.85, 0.5, -12.9], [-0.1, 0.0, -18.6], 60);
  const armA = C([-2.3, 2.45, -23.3], [-0.62, 1.98, -24.95], 32), armB = C([-2.2, 2.42, -23.4], [-0.62, 1.98, -24.95], 30);
  return [
    { t0: 0, t1: 2.16, a: floorA, b: floorB },                                                                                  // 1 long shadows on the stone, toward the dais
    { t0: 2.16, t1: 4.04, a: C([0.6, 0.4, -15.5], [0, 0.7, -23.5], 50), b: C([0.5, 0.42, -16.8], [0, 0.8, -23.5], 46) },            // 2 the shadows reach for the steps; dust
    { t0: 4.04, t1: 6.44, a: C([1.4, 1.6, -4.6], [0, 1.6, -22], 40), b: C([1.3, 1.6, -5.6], [0, 1.6, -22], 38) },                    // 3 their backs, the throne beyond
    { t0: 6.44, t1: 8.38, a: armA, b: armB },                                                                                   // 4 his hand on the throne arm, lifting
    { t0: 8.38, t1: 10.84, a: C([0.8, 3.45, -26.2], [0, 1.2, -12], 40), b: C([0.7, 2.7, -23.2], [0, 1.1, -12], 40) },                 // 5 one brother kneels; he steps down toward them
    { t0: 10.84, t1: 13.5, a: C([0.9, 1.7, -16.4], [0, 1.1, -10.8], 46), b: C([0.8, 0.45, -15.8], [0, 0.5, -10.8], 50) },            // 6 lowering toward the stone between them
    { t0: 13.5, t1: 15.9, a: C([1.6, 0.16, -17.2], [-0.3, 0.1, -12.5], 70), b: C([1.5, 0.16, -16.9], [-0.3, 0.1, -12.5], 68) },        // 7 floor level: the shadows reach toward him
    { t0: 15.9, t1: 17.38, a: C([-1.0, 0.55, -19.6], [0, 1.4, -4], 56), b: C([-0.9, 0.58, -19.0], [0, 1.45, -4], 53) },               // 8 dust glowing in the low sun
    { t0: 17.38, t1: 20.84, a: C([2.9, 2.4, -9.6], [0, 0.0, -16.5], 54), b: null },                                               // 9 the shadows merge into one (locked)
    { t0: 20.84, t1: 22.64, a: armA, b: armB },                                                                                 // 10 the throne arm, empty: the power he had
    { t0: 22.64, t1: 24.48, a: C([0.55, 1.85, YSTOP - 1.3], [-0.1, 1.35, -11], 40), b: C([0.5, 1.8, YSTOP - 1.05], [-0.1, 1.35, -11], 37) }, // 11 his open hand lifted in the light
    { t0: 24.48, t1: 26.42, a: C([2.6, 1.25, -19.6], [0, 1.4, -25], 38), b: null },                                               // 12 the dais, empty
    { t0: 26.42, t1: D + 0.01, a: floorA, b: floorA },                                                                           // 13 the merged shadow on the same floor (shot 1's pose)
  ];
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    await build();
    CAP = captions(await loadLines('lines.json'));
    SHOTS = shots();
    ST.update(0, 0, {}); G.R.compile(ST.scene, ST.camera);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    aimSun(t); yusuf(t); brothers(t); dust(t);
    const s = K.shotAt(SHOTS, t), cam = K.camAt(s, t);
    G.renderSet(ctx, ST, t, u, { cam, exposure: s.t0 === 17.38 ? 0.95 : 0.78 });
    K.vignette(ctx, 0.3);
    CAP.draw(ctx, t);
    K.drawSeal(ctx, IMG.seal, t, 27.65, D);
  },
  post(ctx, u, t) { K.grain(ctx, t, M.mulberry32, 0.035); },
});
