// y12-15 "Years Later, the Childhood Dream Came True" (Yusuf 12:100-101). The palace court at golden hour: the
// family comes in through the gate and bows in an arc before the dais; the sun goes down for real, the court dims,
// and the eleven stars of the first dream (lib_shared/eleven.js, same sky as y12-00/01) come out over the throne.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { reunion } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { elevenStars, ELEVEN, BRIGHTEST, ELEVEN_CENTRE } from '../lib_shared/eleven.js';
import * as K from '../y12-12/kit.js';
const { THREE, clamp, lerp, sstep } = W;
const V3 = K.V3, D = 28.94;

let SET, ST, CAP, P = {}, E11, SKY, MOON, MOONL, SHOTS, BASE = {};
const pr = (t, a, b) => clamp((t - a) / (b - a));
const sm = (t, a, b) => K.easeIO(pr(t, a, b));
const C = (pos, look, fov, roll = 0) => ({ pos, look, fov, roll });
const DZ = -24, FLOOR = 0.08;
// night falls: 0 = golden, 1 = moonlit night
const night = (t) => sm(t, 7.0, 17.0);
// the arc where the family bows, facing the dais (yaw pi = facing -z)
const ARC = [-2.6, -1.6, -0.55, 0.55, 1.6, 2.6].map((x, i) => [x, DZ + 7.4 + 0.18 * x * x]);

async function build() {
  SET = await reunion({ time: 'golden', stars: 0 });
  ST = W.stage(SET);
  BASE.sunI = SET.atmo.sun.intensity; BASE.env = SET.scene.environmentIntensity; BASE.bg = SET.scene.backgroundIntensity ?? 1; BASE.hemi = SET.atmo.hemi?.intensity ?? 0;
  BASE.fog = SET.scene.fog ? SET.scene.fog.color.clone() : null;
  BASE.rotY = SET.scene.backgroundRotation.y; { const sd = SET.atmo.sunDir.clone(); sd.y = 0; sd.normalize(); BASE.axis = new THREE.Vector3().crossVectors(sd, new THREE.Vector3(0, 1, 0)).normalize(); }
  SKY = K.starfield({ count: 4200, bright: 1.6 }); SET.scene.add(SKY);
  E11 = elevenStars(THREE, { size: 15 }); SET.scene.add(E11);
  MOON = K.brightStar({ dir: [0.55, 0.42, -0.72], size: 9, color: 0xdfe8ff }); SET.scene.add(MOON);
  MOONL = new THREE.DirectionalLight(0x9fb4ff, 0); MOONL.position.set(0.55 * 200, 0.42 * 200, -0.72 * 200); SET.scene.add(MOONL, MOONL.target);
  const PE = await K.people();
  P.y = PE.make({ kind: 'man', outfit: 'noble', palette: K.YUSUF_PAL, beard: 'short', headwear: 'wrap', seed: 12, detail: 1 });
  P.yq = PE.make({ kind: 'elder', outfit: 'traveller', palette: { robe: '#a8987c', wrap: '#d8ccb4', cloak: '#8e7d62', sash: '#6a4a2a', trousers: '#9c8a6c', shemagh: '#b8892e' }, beard: 'grey', headwear: 'keffiyeh', seed: 3, detail: 0.8 });
  P.w = PE.make({ kind: 'woman', palette: { abaya: '#262b3b', khimar: '#2f3650' }, seed: 21, detail: 0.7 });
  const bro = [['rust', 'full', 'keffiyeh'], ['olive', 'full', 'turban'], ['night', 'full', 'wrap'], ['earth', 'short', 'keffiyeh']];
  P.bro = bro.map(([pal, beard, hw], i) => PE.make({ kind: 'man', outfit: 'traveller', palette: pal, beard, headwear: hw, seed: 60 + i * 7, detail: 0.6 }));
  for (const p of [P.y, P.yq, P.w, ...P.bro]) SET.group.add(p.object3d);
}
const FAM = () => [P.yq, P.w, ...P.bro];          // order in the line (Yaʿqūb leads)

// ------------------------------------------------------------------ light: the sun really goes down
function light(t) {
  const n = night(t), L = SET.atmo.sun;
  L.intensity = BASE.sunI * (1 - sstep(0, 0.7, n)); L.color.setRGB(1, lerp(0.78, 0.5, n), lerp(0.55, 0.3, n));
  SET.scene.environmentIntensity = BASE.env * lerp(1, 0.12, n); SET.scene.backgroundIntensity = BASE.bg * lerp(1, 0.07, sstep(0, 0.8, n));
  // the sun really sets: the sky image turns about the horizontal axis, carrying its sun below the horizon
  { const q = new THREE.Quaternion().setFromAxisAngle(BASE.axis, -0.32 * sstep(0, 0.8, n)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), BASE.rotY));
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'); SET.scene.backgroundRotation.copy(e); SET.scene.environmentRotation.copy(e); }
  if (SET.atmo.hemi) SET.atmo.hemi.intensity = BASE.hemi * lerp(1, 0.3, n);
  if (SET.scene.fog && BASE.fog) SET.scene.fog.color.copy(BASE.fog).lerp(new THREE.Color(0x0e1426), n);
  MOONL.intensity = 1.3 * sstep(0.4, 1, n);
  return n;
}
// ------------------------------------------------------------------ people (pure in t)
function people(t) {
  for (const p of [P.y, ...FAM()]) p.object3d.visible = false;
  if (t >= 14.55) return;                                         // the court is empty after the family has gone in
  // the line walks in from the gate (z +2) toward the arc, then bows (kneel + forehead low)
  FAM().forEach((p, i) => {
    p.object3d.visible = true;
    const [ax, az] = ARC[i], sp = p.speed('walk') || 1.1, lx = 0.35 * (i % 2 ? 1 : -1);
    if (t < 5.41) {                                     // walking in: at the gate until the cut at 3.65, mid-court after it
      const z = t < 3.65 ? 2.2 + i * 1.15 - sp * Math.max(0, t - 0.3) : -5.2 + i * 1.15 - sp * (t - 3.65);
      K.place(p, lx, FLOOR, z, Math.PI); p.setPose('walk', t, { offset: i * 0.37 }); return;
    }
    const bowT = 5.45 + i * 0.09;
    K.place(p, ax, FLOOR, az, Math.PI - ax * 0.08);
    p.setPose('kneel', t, { offset: i }); const b = sm(t, bowT, bowT + 0.9);
    K.tilt(p, 'Spine', 22 * b, 0, 0); K.tilt(p, 'Spine1', 20 * b, 0, 0); K.tilt(p, 'Spine2', 14 * b, 0, 0); K.tilt(p, 'Neck', 10 * b, 0, 0);
  });
  // Yusuf stands on the dais, facing them; one hand opens toward his father
  // he is only ever seen from behind (shot 6); in the shots that look at the dais he has stepped down out of view
  if (t < 6.71 || t >= 7.88) return;
  P.y.object3d.visible = true; K.place(P.y, 0, 0.98, DZ + 0.55, 0); P.y.setPose('stand', t);
  const o = sm(t, 6.8, 7.6); if (o > 0) { K.reach(P.y, 'Right', K.onBody(P.y, -0.25, 1.15, 0.4), K.onBody(P.y, -0.8, 0.6, -0.5), o); K.tilt(P.y, 'RightHand', 0, -60 * o, 0); K.fingers(P.y, 'Right', 1 - o); }
}

function shots() {
  const sDir = V3(...ELEVEN_CENTRE), from = [0.4, 0.35, -9.5], up = (k) => [from[0] + sDir.x * 30 * k, from[1] + 2 + (sDir.y * 30 - 2) * k, from[2] + sDir.z * 30 * k];
  const firstA = C(from, [0, 6.6, DZ - 2], 66), firstB = C([0.4, 0.38, -9.8], up(0.3), 64);
  const moonDir = MOON.userData.dir;
  return [
    { t0: 0, t1: 1.47, a: firstA, b: C([0.4, 0.36, -9.65], up(0.15), 65) },                                       // 1 the court in golden light; faint eleven
    { t0: 1.47, t1: 2.6, a: C([0.4, 0.36, -9.65], up(0.15), 65), b: firstB },                                     // 2 the tilt continues; the stars grow clearer
    { t0: 2.6, t1: 3.65, a: C([1.6, 1.9, DZ + 4.2], [0, 1.4, 2.4], 40), b: C([1.7, 2.0, DZ + 3.5], [0, 1.4, 2.4], 42) },      // 3 far at the gate, a line of travellers
    { t0: 3.65, t1: 5.41, a: C([-5.2, 1.45, -1.6], [0.2, 1.1, -3.4], 44), b: C([-5.2, 1.45, -4.4], [0.2, 1.1, -6.0], 44) },   // 4 the line enters, a lateral track with them
    { t0: 5.41, t1: 6.71, a: C([0.3, 1.7, -10.5], [0, 0.7, DZ + 6.8], 52), b: C([0.3, 1.6, -11.6], [0, 0.7, DZ + 6.8], 50) }, // 5 they end in a bow, an arc
    { t0: 6.71, t1: 7.88, a: C([0.9, 2.6, DZ - 1.6], [0, 1.0, DZ + 8], 46), b: null },                                   // 6 his back at the dais, one hand open
    { t0: 7.88, t1: 9.31, a: C([5.6, 0.35, DZ + 8.4], [-2, 2.3, DZ + 6.6], 64), b: C([5.5, 0.35, DZ + 8.3], [-2, 2.4, DZ + 6.6], 63) },                                    // 7 low: the bowed figures, the stars above
    { t0: 9.31, t1: 12.04, a: C([0.6, 0.5, DZ + 12], [0, 6, DZ - 6], 52), b: C([0.6, 0.5, DZ + 12], [from[0] + sDir.x * 30, 0.5 + sDir.y * 30, DZ + 12 + sDir.z * 30], 50) }, // 8 up: the eleven in their arc, the moon
    { t0: 12.04, t1: 14.55, a: C([0.6, 0.5, DZ + 12], [from[0] + sDir.x * 30, 0.5 + sDir.y * 30 - 6, DZ + 12 + sDir.z * 30], 50), b: C([0.6, 0.9, DZ + 12.5], [0, 0.8, DZ + 6.8], 52) }, // 9 down again onto the bowed figures
    { t0: 14.55, t1: 15.95, a: C([2.5, 1.6, -6], [0, 1.6, DZ], 46), b: C([2.6, 1.7, -4.5], [0, 1.6, DZ], 48) },             // 10 the court dims, banners still
    { t0: 15.95, t1: 18.44, a: C([0, 1.4, -10], [0, 4, DZ - 4], 56), b: C([0, 1.4, -10], [sDir.x * 30, 1.4 + sDir.y * 30, -10 + sDir.z * 30], 56) }, // 11 the sky takes over
    { t0: 18.44, t1: 20.8, a: C([0, 1.4, -10], [sDir.x * 30, 1.4 + sDir.y * 30, -10 + sDir.z * 30], 50), b: null },          // 12 the eleven fade toward moonlight
    { t0: 20.8, t1: 23.06, a: C([0, 1.4, -10], (() => { const d = V3(...ELEVEN[BRIGHTEST]); return [d.x * 30, 1.4 + d.y * 30, -10 + d.z * 30]; })(), 36), b: C([0, 1.4, -10], (() => { const d = V3(...ELEVEN[BRIGHTEST]); return [d.x * 30, 1.4 + d.y * 30, -10 + d.z * 30]; })(), 20) }, // 13 the star that remains
    { t0: 23.06, t1: 25.97, a: C([4.5, 1.5, -2.5], [-1, 0.6, DZ + 2], 52), b: null },                                     // 14 the empty court in moonlight
    { t0: 25.97, t1: D + 0.01, a: C(from, [0, 1.6, DZ - 2], 66), b: firstA },                    // 15 the same tilt as frame 1, at night: one star over the empty throne
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
    const n = light(t); people(t);
    const s = K.shotAt(SHOTS, t), cam = K.camAt(s, t);
    ST.update(t, u, { cam, exposure: lerp(0.85, 1.6, n) });
    // the eleven: faint at golden hour, full at dusk, fading toward moonlight (12), one remains (13+)
    const e = 0.18 + 0.82 * sm(t, 6.0, 11.0), fade = 1 - 0.85 * sm(t, 18.6, 20.6);
    E11.userData.update(t, ST.camera, { op: e * fade, hi: sm(t, 18.6, 21) });
    SKY.userData.update(ST.camera, t, sstep(0.3, 1, n));
    MOON.visible = n > 0.05; MOON.userData.update(ST.camera, t, sstep(0.2, 0.8, n));
    G.renderSet(ctx, ST, t, u, { cam, exposure: lerp(0.85, 1.6, n) });
    K.vignette(ctx, 0.32);
    CAP.draw(ctx, t);
    K.drawSeal(ctx, IMG.seal, t, 27.34, D);
  },
  post(ctx, u, t) { K.grain(ctx, t, M.mulberry32, 0.035); },
});
