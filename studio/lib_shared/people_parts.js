// people_parts.js: the body + clothing of a faceless person, as signed-distance parts in the Xbot rest
// pose (arms lowered; centimetres, y up, +z forward, character's left = +x). Each part is meshed with
// surface nets, skinned to the Xbot skeleton and given a material by people.js.
//
//   part = { name, f(x,y,z), bb:[x0,y0,z0,x1,y1,z1], res, mat, segs:[[bone, jointA|pt, jointB|pt, gain]],
//            custom?(x,y,z) -> [[bone, w], ...] | null, pw?, smooth? }
import { sphere, ellipsoid, roundCone, chain, torusY, ellipse2, box, smin, smax, union, shell, lathe, curve,
  noise3, clamp, mix, sstep, len3 } from './people_sdf.js';

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mirror = (p) => [-p[0], p[1], p[2]];
const SIDES = [['Left', 1], ['Right', -1]];

// fold field around a vertical axis: sum of seeded sines in angle, growing with depth below `top`
function folds(R, n = 3) {
  const w = Array.from({ length: n }, (_, i) => ({ k: [5, 9, 14, 21][i] + Math.floor(R() * 3), ph: R() * 6.283, a: [1, 0.55, 0.3, 0.18][i] }));
  return (x, z, cz) => { const th = Math.atan2(x, z - cz); let s = 0; for (const q of w) s += q.a * Math.sin(q.k * th + q.ph); return s; };
}

export function buildParts(J, P) {
  // P: { sex:'m'|'f', kind, outfit, beard, headwear, cloak, g, belly, sh, hs, seed, R, detail }
  const parts = [], R = P.R, D = P.detail ?? 1, fem = P.sex === 'f', g = P.g, sh = P.sh, hs = P.hs;
  const res = (r) => r / D, DH = P.headDetail ?? D, hres = (r) => r / DH;
  const H = J.Head, HY = H[1];
  const hp = (dx, dy, dz) => [H[0] + dx * hs, HY + dy * hs, H[2] + dz * hs];       // head-relative point
  const N3 = noise3(P.seed * 7 + 3);

  // ---------------------------------------------------------------- weight helpers
  const torsoSegs = [['Hips', 'Hips', 'Spine'], ['Spine', 'Spine', 'Spine1'], ['Spine1', 'Spine1', 'Spine2'], ['Spine2', 'Spine2', 'Neck'],
    ['Neck', 'Neck', 'Head', 0.6], ['LeftShoulder', 'LeftShoulder', 'LeftArm', 0.8], ['RightShoulder', 'RightShoulder', 'RightArm', 0.8]];
  const legSegs = [['LeftUpLeg', 'LeftUpLeg', 'LeftLeg'], ['RightUpLeg', 'RightUpLeg', 'RightLeg'], ['LeftLeg', 'LeftLeg', 'LeftFoot'], ['RightLeg', 'RightLeg', 'RightFoot']];
  // skirt weights: the hem follows the thighs (each half its own leg), damped by the hips, a little shin near the hem
  const hipY = J.Hips[1], kneeY = J.LeftLeg[1];
  const skirt = (follow = 0.78, shin = 0.3) => (x, y, z) => {
    if (y > hipY + 3) return null;
    const f = follow * sstep(hipY + 3, hipY - 30, y), L = sstep(-7, 7, x), s = shin * sstep(kneeY + 5, kneeY - 35, y);
    const out = [['Hips', 1 - f]];
    if (f > 0) { out.push(['LeftUpLeg', f * L * (1 - s)], ['RightUpLeg', f * (1 - L) * (1 - s)], ['LeftLeg', f * L * s], ['RightLeg', f * (1 - L) * s]); }
    return out;
  };

  // ---------------------------------------------------------------- head + neck (skin): smooth, no features
  const cranium = ellipsoid(hp(0, 9.0, 0.2), fem ? [7.1 * hs, 9.0 * hs, 9.3 * hs] : [7.5 * hs, 9.4 * hs, 9.7 * hs]);
  const faceMass = ellipsoid(hp(0, 3.8, 3.9), fem ? [5.4 * hs, 7.1 * hs, 5.4 * hs] : [5.8 * hs, 7.5 * hs, 5.6 * hs]);
  const jawW = fem ? 4.7 : 5.3, jawR = fem ? 1.8 : 2.15;
  const jawL = roundCone(hp(jawW, 3.4, -0.8), hp(1.9, -2.8, 6.4), jawR * hs, (fem ? 1.6 : 1.95) * hs);
  const jawR_ = roundCone(hp(-jawW, 3.4, -0.8), hp(-1.9, -2.8, 6.4), jawR * hs, (fem ? 1.6 : 1.95) * hs);
  const chin = ellipsoid(hp(0, -3.1, 7.0), fem ? [2.1 * hs, 1.9 * hs, 1.9 * hs] : [2.5 * hs, 2.2 * hs, 2.2 * hs]);
  const cheekL = ellipsoid(hp(4.1, 5.2, 5.2), [2.2 * hs, 1.7 * hs, 2.1 * hs]), cheekR = ellipsoid(hp(-4.1, 5.2, 5.2), [2.2 * hs, 1.7 * hs, 2.1 * hs]);
  const headCore = (x, y, z) => smin(smin(smin(cranium(x, y, z), faceMass(x, y, z), 3.2), smin(jawL(x, y, z), jawR_(x, y, z), 1.5), 2.6),
    smin(chin(x, y, z), smin(cheekL(x, y, z), cheekR(x, y, z), 1), 1.8), 1.8);
  const earL = ellipsoid(hp(7.25, 6.0, -0.9), [1.0 * hs, 2.9 * hs, 1.8 * hs]), earR = ellipsoid(hp(-7.25, 6.0, -0.9), [1.0 * hs, 2.9 * hs, 1.8 * hs]);
  const neckR = (fem ? 4.6 : 5.5) * (0.92 + 0.08 * g);
  const neck = roundCone([0, J.Neck[1] - 4, J.Neck[2] - 0.6], hp(0, 2.2, -0.6), neckR, neckR * 0.9);
  const showEars = !['keffiyeh', 'khimar', 'turban'].includes(P.headwear);
  const headF = (x, y, z) => { let d = smin(headCore(x, y, z), neck(x, y, z), 2.6); if (showEars) d = smin(d, Math.min(earL(x, y, z), earR(x, y, z)), 0.7); return d; };
  parts.push({ name: 'head', aoSelf: true, f: headF, bb: [-11 * hs, J.Neck[1] - 6, -13 * hs, 11 * hs, HY + 20 * hs, 13 * hs], res: hres(0.3), mat: 'skin',
    segs: [['Spine2', 'Spine2', 'Neck'], ['Neck', 'Neck', 'Head'], ['Head', 'Head', 'HeadTop_End', 1.4]], pw: 5, smooth: 8 });

  // ---------------------------------------------------------------- beard (no moustache, no mouth): thins to nothing at its edge
  if (P.beard && P.beard !== 'none') {
    const full = P.beard !== 'short', grey = P.beard === 'grey';
    const mass = full ? ellipsoid(hp(0, grey ? -5.9 : -5.2, 5.4), [4.3 * hs, (grey ? 4.2 : 3.2) * hs, 3.3 * hs]) : null;
    // beard region: sideburns in front of the ears, along the cheek line to the mouth corners, under the chin
    const edgeF = (x, y, z) => { const lz = (z - H[2]) / hs, ly = (y - HY) / hs, ax = Math.abs(x - H[0]) / hs;
      const cheek = mix(6.4, 2.6, sstep(-1.5, 5.5, lz)), front = mix(2.6, 0.5, sstep(4.6, 1.0, ax) * sstep(5, 7, lz));
      return Math.max(ly - Math.min(cheek, front + 4 * (1 - sstep(5, 7, lz))), -2.4 - lz); };
    const beardF = (x, y, z) => {
      const lz = (z - H[2]) / hs, edge = edgeF(x, y, z);
      const th = mix(-0.6, full ? mix(0.7, 1.5, sstep(1, 7, lz)) : mix(0.42, 0.78, sstep(1, 7, lz)), sstep(1.2, -1.6, edge));
      let d = headCore(x, y, z) - th * hs + N3(x * 3.0, y * 0.9, z * 3.0) * 0.05 * Math.max(th, 0);
      if (mass) d = smin(d, mass(x, y, z) + N3(x * 2.4, y * 0.8, z * 2.4) * 0.1, 2.6);
      return Math.max(d, edge - 2.5);
    };
    parts.push({ name: 'beard', f: beardF, bb: [-10 * hs, HY - 13 * hs, -6 * hs, 10 * hs, HY + 8 * hs, 13 * hs], res: hres(0.26), mat: 'beard',
      segs: [['Neck', 'Neck', 'Head', 0.3], ['Head', 'Head', 'HeadTop_End', 1.5]], pw: 4, smooth: 4,
      shade: (x, y, z) => 1 + 0.5 * sstep(-1.6, 0.8, edgeF(x, y, z)) });
  }

  // ---------------------------------------------------------------- hair (bare head) / kufi
  if (P.headwear === 'none' || P.headwear === 'kufi') {
    const hairOuter = ellipsoid(hp(0, 9.3, 0.0), fem ? [7.6 * hs, 9.5 * hs, 9.9 * hs] : [8.0 * hs, 9.85 * hs, 10.2 * hs]);
    const hair = (x, y, z) => { const lz = (z - H[2]) / hs, line = HY + hs * mix(2.0, 11.6, sstep(-5, 6, lz)) + 0.0;
      return smax(hairOuter(x, y, z) + N3(x * 0.6, y * 0.6, z * 0.6) * 0.18, line - y, 0.8); };
    parts.push({ name: 'hair', f: hair, bb: [-10 * hs, HY - 2, -13 * hs, 10 * hs, HY + 21 * hs, 12 * hs], res: hres(0.32), mat: 'hair',
      segs: [['Head', 'Head', 'HeadTop_End']], pw: 2, smooth: 0 });
    if (P.headwear === 'kufi') {
      const capO = ellipsoid(hp(0, 9.4, 0.0), [8.3 * hs, 10.1 * hs, 10.5 * hs]);
      const kufi = (x, y, z) => smax(capO(x, y, z), HY + hs * mix(11.5, 13.5, sstep(-6, 6, (z - H[2]) / hs)) - y, 0.6);
      parts.push({ name: 'kufi', f: kufi, bb: [-10 * hs, HY + 8, -13 * hs, 10 * hs, HY + 21 * hs, 13 * hs], res: hres(0.32), mat: 'cap',
        segs: [['Head', 'Head', 'HeadTop_End']], pw: 2, smooth: 0 });
    }
  }

  // ---------------------------------------------------------------- headwear: keffiyeh, turban, wrap, khimar
  const capIn = ellipsoid(hp(0, 9.0, 0.2), fem ? [7.1 * hs, 9.0 * hs, 9.3 * hs] : [7.5 * hs, 9.4 * hs, 9.7 * hs]);
  const headSegs = [['Spine2', 'Spine2', 'Neck', 0.7], ['Neck', 'Neck', 'Head', 0.8], ['Head', 'Head', 'HeadTop_End', 1.6]];
  if (P.headwear === 'keffiyeh') {
    const cap = ellipsoid(hp(0, 9.3, 0.0), [8.6 * hs, 10.4 * hs, 10.9 * hs]);
    const dr = lathe([[HY + 13 * hs, 8.3 * hs, 10.2 * hs, H[2] - 0.6], [HY + 6, 9.2 * hs, 10.8 * hs, H[2] - 1.0], [HY - 1, 10.6, 11.4, H[2] - 1.6],
      [HY - 7, 13.0, 12.2, H[2] - 2.2], [HY - 12, 17.5 * sh, 13.0, H[2] - 2.6], [HY - 16.5, 21.0 * sh, 13.6, H[2] - 2.6]]);
    const fo = folds(R, 3);
    const outer = (x, y, z) => { let d = smin(cap(x, y, z), smax(dr(x, y, z), y - (HY + 12 * hs), 2.5), 3.5);
      return d + 0.35 * fo(x, z, H[2]) * sstep(HY + 2, HY - 14, y); };
    const kHem = (x, y, z) => (HY - 17.5 - 4 * sstep(0, 12, z - H[2])) - y;
    const open = (x, y, z) => { const w = mix(7.6 * hs, 13.5, sstep(HY - 2, HY - 16, y)); return Math.max(H[2] + 2.4 * hs - z, Math.abs(x) - w, y - (HY + 10.4 * hs)); };
    const kSh = shell(outer, 1.1);
    const kf = (x, y, z) => smax(smax(kSh(x, y, z), kHem(x, y, z), 0.4), -open(x, y, z), 0.8);
    parts.push({ name: 'keffiyeh', f: kf, bb: [-24, HY - 23, -17, 24, HY + 22 * hs, 17], res: hres(0.4), mat: 'wrap',
      segs: headSegs, custom: (x, y, z) => { const k = sstep(HY + 2, HY - 12, y); return k <= 0 ? null : [['Head', 1 - k], ['Spine2', k * 0.7], ['Neck', k * 0.3]]; }, pw: 4, smooth: 6 });
    // agal: a doubled black cord ring on the crown
    const ra = 9.85 * hs, rb = 11.75 * hs;
    const ag1 = torusY(hp(0, 10.6, -0.2), ra, rb, 0.55 * hs, 0.14), ag2 = torusY(hp(0, 11.75, -0.35), ra * 0.985, rb * 0.985, 0.55 * hs, 0.14);
    const agal = (x, y, z) => Math.min(ag1(x, y, z), ag2(x, y, z));
    parts.push({ name: 'agal', f: agal, bb: [-12 * hs, HY + 7 * hs, -14 * hs, 12 * hs, HY + 16 * hs, 14 * hs], res: hres(0.26), mat: 'cord',
      segs: [['Head', 'Head', 'HeadTop_End']], pw: 2, smooth: 0 });
  }
  if (P.headwear === 'turban' || P.headwear === 'wrap') {
    // cloth wound around a cap: the cap covers the whole crown; wraps follow the skull's cross-section
    const big = P.headwear === 'turban', n = big ? 6 : 4, cr = fem ? [7.1, 9.0, 9.3] : [7.5, 9.4, 9.7], c0 = 9.0, inf = big ? 1.5 : 0.9;
    const cap = ellipsoid(hp(0, c0 + (big ? 0.6 : 0.2), 0.0), [(cr[0] + inf) * hs, (cr[1] + inf * (big ? 1.5 : 1)) * hs, (cr[2] + inf) * hs]);
    const wraps = [];
    for (let i = 0; i < n; i++) {
      const dy = mix(1.2, big ? 7.6 : 6.4, i / (n - 1)), k = Math.sqrt(Math.max(0.05, 1 - (dy / (cr[1] + inf)) ** 2)), tube = (big ? 1.7 : 1.25) * (1 - 0.12 * i / n);
      wraps.push(torusY(hp(0, c0 + dy, 0.0), (cr[0] * k + inf + tube * 0.35) * hs, (cr[2] * k + inf + tube * 0.35) * hs, tube * hs,
        (i % 2 ? 0.17 : -0.1) + (R() - 0.5) * 0.06, (R() - 0.5) * 0.1));
    }
    const tail = big && P.turbanTail ? roundCone(hp(1.5, 6.5, -10.8), hp(3.5, -13, -12.4), 2.5, 2.2) : null;
    const lowFront = (big ? 10.6 : 10.9), lowBack = big ? 5.5 : 6.5;
    const tf = (x, y, z) => { let d = cap(x, y, z); for (const w of wraps) d = smin(d, w(x, y, z), 0.7);
      d = smax(d, HY + hs * mix(lowBack, lowFront, sstep(-6, 6, (z - H[2]) / hs)) - y, 0.6);
      if (tail) d = smin(d, smax(tail(x, y, z), Math.abs(x - mix(1.5, 3.5, sstep(HY + 6, HY - 13, y)) * hs) - 0.7, 0.3), 1.5);
      return d + N3(x * 0.5, y * 0.5, z * 0.5) * 0.18; };
    parts.push({ name: 'turban', f: tf, bb: [-14 * hs, HY - 16, -17 * hs, 14 * hs, HY + 23 * hs, 15 * hs], res: hres(0.34), mat: 'wrap',
      segs: headSegs, custom: tail ? (x, y, z) => { const k = sstep(HY + 4, HY - 10, y); return k <= 0 ? null : [['Head', 1 - k], ['Neck', k * 0.5], ['Spine2', k * 0.5]]; } : null, pw: 4, smooth: 2 });
  }
  if (P.headwear === 'khimar') {
    const capE = ellipsoid(hp(0, 8.8, -0.2), [8.6 * hs, 10.0 * hs, 10.8 * hs]), bun = ellipsoid(hp(0, 5.0, -8.4), [5.4, 5.6, 4.4]);
    const cap = (x, y, z) => smin(capE(x, y, z), bun(x, y, z), 3);
    const dr = lathe([[HY + 8, 8.8 * hs, 10.7 * hs, H[2] - 0.9], [HY + 1, 8.9 * hs, 10.3 * hs, H[2] - 0.9], [HY - 5, 10.2, 11.0, H[2] - 1.0],
      [HY - 11, 16.0, 12.8, H[2] - 1.2], [HY - 17, 22.5, 14.8, H[2] - 0.8], [HY - 26, 26.0, 16.5, H[2] + 0.2], [HY - 36, 27.0, 17.0, H[2] + 0.8]]);
    const fo = folds(R, 3);
    const outer = (x, y, z) => { const d = smin(cap(x, y, z), smax(dr(x, y, z), y - (HY + 7), 2.5), 3.5);
      return d + 0.9 * fo(x, z, H[2]) * sstep(HY - 10, HY - 32, y); };
    const mHem = (x, y, z) => HY - 35 - 3.5 * Math.abs(z - H[2]) / 17 + 2.0 * Math.sin(Math.atan2(x, z) * 2 + 1) - y;
    const open = ellipsoid(hp(0, 3.0, 11.0), [6.4 * hs, 7.9 * hs, 9.4 * hs]);
    const mSh = shell(outer, 1.3);
    const kf = (x, y, z) => smax(smax(mSh(x, y, z), mHem(x, y, z), 0.4), -Math.max(open(x, y, z), H[2] + 1 - z), 0.7);
    parts.push({ name: 'khimar', f: kf, bb: [-31, HY - 44, -21, 31, HY + 21 * hs, 22], res: hres(0.4), mat: 'wrap', segs: [...headSegs, ['LeftArm', 'LeftArm', 'LeftForeArm', 0], ['RightArm', 'RightArm', 'RightForeArm', 0]],
      custom: (x, y, z) => { const k = sstep(HY + 1, HY - 13, y); if (k <= 0) return null;
        const a = sstep(13, 24, Math.abs(x)) * sstep(HY - 12, HY - 30, y) * 0.35, side = x > 0 ? 'LeftArm' : 'RightArm';
        return [['Head', 1 - k], ['Neck', k * 0.25], ['Spine2', k * 0.75 * (1 - a)], [side, k * 0.75 * a]]; }, pw: 4, smooth: 6 });
  }

  // ---------------------------------------------------------------- torso garment (thobe / abaya / tunic)
  const outfit = P.outfit, abaya = outfit === 'abaya', worker = outfit === 'worker';
  const hem = abaya ? 0.6 : worker ? 50 : P.kind === 'boy' ? 8 : 5.5;
  const gb = g, bl = P.belly;
  const tk = abaya ? [
    [150.6, 6.2, 5.9, -2.6], [148.6, 9.6, 7.8, -2.6], [146.4, 13.6, 9.4, -2.6], [144.2, 16.6 * sh, 10.4, -2.4], [141.5, 17.8 * sh, 11.4, -1.8],
    [136, 17.4 * gb, 12.4 * gb, -1.0], [127, 16.6 * gb, 12.4 * gb, -0.2], [116, 16.6 * gb, 12.0 * gb + bl, 0.6], [104, 19.6 * gb, 13.6 * gb, 1.2],
    [84, 22.0 * gb, 15.6, 1.4], [44, 25.0, 18.4, 1.6], [hem, 28.0, 21.0, 1.6]]
    : [[150.6, 6.6, 6.4, -2.7], [148.6, 10.6, 8.4, -2.7], [146.4, 15.8 * sh, 9.8, -2.6], [144.0, 19.4 * sh, 10.9, -2.4], [141.0, 20.2 * sh, 11.8, -1.8],
      [136, 19.0 * gb * sh, 12.6 * gb, -1.0], [127, 17.8 * gb, 12.8 * gb, -0.2], [116, 17.0 * gb, 12.2 * gb + bl, 0.6 + bl * 0.5], [104, 18.6 * gb, 12.9 * gb, 1.2],
      [88, 19.8 * gb, 13.6 * gb, 1.4], ...(worker ? [[60, 21.5, 15.2, 1.6], [hem, 22.0, 15.6, 1.6]] : [[56, 21.6, 15.6, 1.6], [24, 23.2, 17.4, 1.6], [hem, 24.0, 18.2, 1.6]])];
  const torso = lathe(tk);
  const foT = folds(R, 4), foldA = abaya ? 1.5 : 1.0;
  const hemWave = folds(R, 2);
  const shoulderCaps = SIDES.map(([s, sg]) => roundCone([sg * 5.5, 146.0, -3.0], [J[s + 'Arm'][0] + sg * 0.3, J[s + 'Arm'][1] - 2.0, J[s + 'Arm'][2] + 0.4], 4.4, abaya ? 5.0 : 5.6));
  const robeF = (x, y, z) => {
    let d = torso(x, y, z);
    d = smin(d, Math.min(shoulderCaps[0](x, y, z), shoulderCaps[1](x, y, z)), 3.5);
    const dep = sstep(102, Math.max(hem, 20) + 6, y);
    d += foldA * foT(x, z, 1.4) * dep * 0.9 + 0.25 * foT(x * 1.7, z, 1.4) * sstep(140, 118, y) * sstep(100, 112, y);
    d += 0.08 * N3(x * 0.25, y * 0.25, z * 0.25);
    d = smax(d, (hem + 0.8 * hemWave(x, z, 1.4)) - y, 0.8);
    d = smax(d, y - 150.6, 0.4);
    return d;
  };
  parts.push({ name: 'robe', f: robeF, bb: [-31, hem - 3, -24, 31, 153, 24], res: res(abaya ? 0.85 : 0.8), mat: 'robe',
    segs: [...torsoSegs, ...legSegs.map((q) => [...q.slice(0, 3), 0])], custom: skirt(abaya ? 0.72 : 0.78, worker ? 0 : 0.45), pw: 5, smooth: 10 });
  // collar band (thobe) / neckline binding
  if (!abaya) {
    const collar = torusY([0, 149.8, -2.7], 6.75 * (0.92 + 0.08 * g) * (neckR / 5.5), 6.45 * (neckR / 5.5), 0.75, -0.08);
    parts.push({ name: 'collar', f: collar, bb: [-9, 146, -11, 9, 153, 6], res: res(0.32), mat: 'robe', segs: [['Spine2', 'Spine2', 'Neck'], ['Neck', 'Neck', 'Head', 0.3]], pw: 3, smooth: 2 });
  }

  // ---------------------------------------------------------------- sleeves + hands + forearm skin
  const rolled = worker, flare = abaya || P.cloak === 'bisht';
  for (const [s, sg] of SIDES) {
    const A = J[s + 'Arm'], F = J[s + 'ForeArm'], Hn = J[s + 'Hand'], fd = nrm(sub(Hn, F));
    const cuff = rolled ? lerp3(F, Hn, 0.32) : add(Hn, fd, abaya ? -1.0 : -2.4);
    const r0 = (abaya ? 5.6 : 6.1) * (0.9 + 0.1 * g), r1 = abaya ? 5.6 : 5.6, r2 = rolled ? 5.2 : abaya ? 7.6 : 4.9;
    const ad = nrm(sub(F, A)), tube = chain([add(A, ad, 2.5), F, cuff], [r0, r1, r2], 1.5);
    const hollow = roundCone(add(cuff, fd, -5), add(cuff, fd, 6), Math.min(3.4, r2 - 1.6), r2 - 0.9);
    const roll = rolled ? torusAlong(cuff, fd, r2 + 0.2, 1.25) : null;
    const foS = noise3(P.seed * 13 + (sg > 0 ? 1 : 2));
    const sleeve = (x, y, z) => {
      let d = tube(x, y, z);
      const t = dot(sub([x, y, z], F), fd);
      d += 0.35 * Math.sin(t * 0.9 + foS(x * 0.2, y * 0.2, z * 0.2) * 4) * sstep(-10, -2, t) * sstep(10, 2, t) + 0.15 * foS(x * 0.3, y * 0.3, z * 0.3);
      d = smax(d, t - dot(sub(cuff, F), fd), 0.4);
      if (!rolled) d = smax(d, -hollow(x, y, z), 0.5);
      if (roll) d = smin(d, roll(x, y, z), 0.8);
      return d;
    };
    const lo = Math.min(A[1], cuff[1]) - 12, sx0 = Math.min(A[0], cuff[0], F[0]) - 12, sx1 = Math.max(A[0], cuff[0], F[0]) + 12;
    parts.push({ name: 'sleeve' + s, f: sleeve, bb: [sx0, lo, -18, sx1, A[1] + 9, 18], res: res(0.5), mat: 'robe',
      segs: [[s + 'Shoulder', s + 'Shoulder', s + 'Arm', 0.5], [s + 'Arm', s + 'Arm', s + 'ForeArm'], [s + 'ForeArm', s + 'ForeArm', s + 'Hand'], [s + 'Hand', s + 'Hand', s + 'HandMiddle1', 0.4]], pw: 5, smooth: 6 });

    // hand (+ forearm skin when sleeves are rolled): palm from cones to each knuckle, fingers along their bones
    const fm = fem ? 0.87 : 1.0, fings = ['Index', 'Middle', 'Ring', 'Pinky'];
    const fr = { Index: 0.98, Middle: 1.0, Ring: 0.93, Pinky: 0.8 };
    const fingerF = fings.map((n) => chain([J[s + 'Hand' + n + '1'], J[s + 'Hand' + n + '2'], J[s + 'Hand' + n + '3'], J[s + 'Hand' + n + '4']],
      [0.98 * fr[n] * fm, 0.88 * fr[n] * fm, 0.78 * fr[n] * fm, 0.64 * fr[n] * fm], 0.3));
    const thumbF = chain([J[s + 'HandThumb1'], J[s + 'HandThumb2'], J[s + 'HandThumb3'], J[s + 'HandThumb4']], [1.45 * fm, 1.12 * fm, 0.96 * fm, 0.8 * fm], 0.4);
    const palm = fings.map((n) => roundCone(add(Hn, fd, 0.6), J[s + 'Hand' + n + '1'], 1.75 * fm, 1.18 * fm * fr[n]));
    const thenar = roundCone(Hn, J[s + 'HandThumb2'], 1.7 * fm, 1.25 * fm);
    const wrist = roundCone(rolled ? lerp3(F, Hn, 0.25) : add(Hn, fd, -7), add(Hn, fd, 0.8), rolled ? 3.4 * fm : 2.5 * fm, 2.15 * fm);
    const handF = (x, y, z) => {
      let d = Math.min(palm[0](x, y, z), palm[1](x, y, z), palm[2](x, y, z), palm[3](x, y, z));
      d = smin(d, thenar(x, y, z), 1.6); d = smin(d, wrist(x, y, z), 2.0);
      let fd_ = Math.min(fingerF[0](x, y, z), fingerF[1](x, y, z), fingerF[2](x, y, z), fingerF[3](x, y, z));
      d = smin(d, fd_, 0.9); d = smin(d, thumbF(x, y, z), 1.2);
      return d;
    };
    const pts = [Hn, F, J[s + 'HandMiddle4'], J[s + 'HandThumb4'], J[s + 'HandIndex4'], J[s + 'HandPinky4']];
    const hb = [Math.min(...pts.map((p) => p[0])) - 3, Math.min(...pts.map((p) => p[1])) - 3, Math.min(...pts.map((p) => p[2])) - 3,
      Math.max(...pts.map((p) => p[0])) + 3, (rolled ? F[1] : Hn[1] + 8) + 2, Math.max(...pts.map((p) => p[2])) + 3];
    const hsegs = [[s + 'ForeArm', s + 'ForeArm', s + 'Hand', 1], [s + 'Hand', s + 'Hand', s + 'HandMiddle1', 1.2]];
    for (const n of [...fings, 'Thumb']) for (let i = 1; i <= 3; i++) hsegs.push([s + 'Hand' + n + i, s + 'Hand' + n + i, s + 'Hand' + n + (i + 1), 1]);
    parts.push({ name: 'hand' + s, f: handF, bb: hb, res: res(0.3), mat: 'skin', segs: hsegs, pw: 7, smooth: 2 });
  }

  // ---------------------------------------------------------------- legs: lower legs + feet (skin), sandals; trousers for workers
  for (const [s, sg] of SIDES) {
    const U = J[s + 'UpLeg'], K = J[s + 'Leg'], Fo = J[s + 'Foot'], T = J[s + 'ToeBase'], TE = J[s + 'Toe_End'];
    const fm = fem ? 0.9 : 1.0;
    const shin = roundCone(add(K, [0, -2, 0]), Fo, 4.4 * fm, 3.0 * fm);
    const calf = ellipsoid(add(K, [0, -12, -1.6]), [4.2 * fm, 9, 4.0 * fm]);
    const heel = sphere(add(Fo, [0, -6.5, -2.8]), 2.9 * fm);
    const fw = [-2.3, 0, 2.3].map((o, i) => roundCone(add(Fo, [sg * o * 0.35, -4.4, -1.6]), add(T, [sg * o * 0.9, 0.8 - i * 0.2, -0.2 * i]), 2.6 * fm, [2.1, 2.1, 1.7][i] * fm));
    const toes = roundCone(add(T, [0, 0.9, 0.5]), add(TE, [sg * 0.6, 1.0, -3.6]), 2.0 * fm, 1.35 * fm);
    const legTop = worker ? Fo[1] + 8 : K[1] - 14;
    const footF = (x, y, z) => {
      let d = smin(shin(x, y, z), calf(x, y, z), 3);
      d = smin(d, heel(x, y, z), 2.2);
      d = smin(d, Math.min(fw[0](x, y, z), fw[1](x, y, z), fw[2](x, y, z)), 1.6);
      d = smin(d, toes(x, y, z), 1.0);
      return smax(d, y - legTop, 0.5);
    };
    const fb = [Fo[0] - 9, -3, Fo[2] - 10, Fo[0] + 9, legTop + 1, TE[2] + 2];
    parts.push({ name: 'foot' + s, f: footF, bb: fb, res: res(0.5), mat: 'skin',
      segs: [[s + 'Leg', s + 'Leg', s + 'Foot', 1], [s + 'Foot', s + 'Foot', s + 'ToeBase', 1.1], [s + 'ToeBase', s + 'ToeBase', s + 'Toe_End', 0.8]], pw: 6, smooth: 3 });
    // sandal: a sole under the footprint + two straps hugging the foot
    const solY = -1.6;
    const foot2 = (x, z) => Math.min(...[[add(Fo, [0, 0, -2.4]), add(T, [0, 0, 0]), 3.7], [add(T, [0, 0, 0]), add(TE, [0, 0, -4.2]), 4.0]].map(([a, b, r]) => {
      const abx = b[0] - a[0], abz = b[2] - a[2], l2 = abx * abx + abz * abz, t = clamp(((x - a[0]) * abx + (z - a[2]) * abz) / l2);
      return Math.hypot(x - a[0] - abx * t, z - a[2] - abz * t) - r; }));
    const strapA = torusAlong(add(T, [0, 1.9, -2.4]), nrm([0, 0.2, 1]), 3.3 * fm, 0.42);
    const strapB = torusAlong(add(Fo, [0, -2.9, 0.4]), nrm([0, 0.55, 0.6]), 3.6 * fm, 0.4);
    const sandal = (x, y, z) => {
      let d = Math.max(Math.abs(y - solY) - 0.75, foot2(x, z) + 0.4) - 0.2;
      d = Math.min(d, smax(strapA(x, y, z), solY - y, 0.2), smax(strapB(x, y, z), solY - y, 0.2));
      return d;
    };
    parts.push({ name: 'sandal' + s, f: sandal, bb: [Fo[0] - 8, -3.5, Fo[2] - 10, Fo[0] + 8, Fo[1] + 2, TE[2] + 2], res: res(0.32), mat: 'leather',
      segs: [[s + 'Foot', s + 'Foot', s + 'ToeBase', 1], [s + 'ToeBase', s + 'ToeBase', s + 'Toe_End', 1]], pw: 6, smooth: 1 });
  }
  if (worker) {
    // sirwal: loose trousers gathered at the ankle; a sash at the waist
    const legs = SIDES.map(([s]) => chain([add(J[s + 'UpLeg'], [0, 3, 0]), J[s + 'Leg'], add(J[s + 'Foot'], [0, 5.5, 0.6])], [10.2 * g, 7.4, 5.3], 2));
    const pelvis = ellipsoid([0, 98, 1.2], [17 * g, 10, 12.5 * g]);
    const foTr = noise3(P.seed * 3 + 11);
    const trF = (x, y, z) => { let d = smin(Math.min(legs[0](x, y, z), legs[1](x, y, z)), pelvis(x, y, z), 4);
      d += 0.4 * foTr(x * 0.22, y * 0.12, z * 0.22) + 0.25 * Math.sin(y * 0.55 + foTr(x * 0.1, y * 0.1, z * 0.1) * 5) * sstep(40, 15, y);
      return smax(d, J.LeftFoot[1] + 4.0 - y, 0.6); };
    parts.push({ name: 'trousers', f: trF, bb: [-22, J.LeftFoot[1], -18, 22, 108, 18], res: res(0.65), mat: 'trousers',
      segs: [['Hips', 'Hips', 'Spine', 0.7], ...legSegs, ['LeftFoot', 'LeftFoot', 'LeftToeBase', 0.3], ['RightFoot', 'RightFoot', 'RightToeBase', 0.3]], pw: 5, smooth: 8 });
  }
  if (P.sash) {
    const sy = 109, ra = torso.a(sy) + 0.9, rb = torso.b(sy) + 0.9;
    const band = (x, y, z) => { const e = ellipse2(x, z - torso.c(sy), ra, rb); return Math.max(Math.abs(y - sy) - 3.2, e - 0.9) - 0.4 + 0.15 * Math.sin(Math.atan2(x, z) * 9); };
    const knot = ellipsoid([ra * 0.72, sy - 1, rb * 0.62 + 1], [3.2, 3.6, 2.4]);
    const end = roundCone([ra * 0.75, sy - 2, rb * 0.62 + 1.5], [ra * 0.8 + 1, sy - 22, rb * 0.6 + 2.2], 2.2, 1.6);
    const sashF = (x, y, z) => smin(smin(band(x, y, z), knot(x, y, z), 1.2), smax(end(x, y, z), Math.abs(z - rb * 0.6 - 1.8) - 0.6, 0.4), 1.0);
    parts.push({ name: 'sash', f: sashF, bb: [-26, sy - 26, -20, 26, sy + 6, 20], res: res(0.4), mat: 'sash', segs: [['Hips', 'Hips', 'Spine'], ['Spine', 'Spine', 'Spine1', 0.5], ['LeftUpLeg', 'LeftUpLeg', 'LeftLeg', 0], ['RightUpLeg', 'RightUpLeg', 'RightLeg', 0]],
      custom: (x, y, z) => (y < sy - 5 ? [['Hips', 0.8], [x > 0 ? 'LeftUpLeg' : 'RightUpLeg', 0.2]] : null), pw: 4, smooth: 3 });
  }

  // ---------------------------------------------------------------- outer cloak: traveller's cloak / bisht (open front, wide sleeves)
  if (P.cloak) {
    const bisht = P.cloak === 'bisht', chem = bisht ? 9 : 26;
    const ck = lathe([[151.2, 8.0, 7.9, -3.4], [148.8, 12.6, 9.6, -3.2], [146.2, 18.0 * sh, 11.4, -2.9], [143.6, 21.6 * sh, 12.4, -2.4], [140, 22.6 * sh, 13.4, -1.8],
      [128, 21.0 * g, 14.6 * g, -0.6], [114, 20.6 * g, 14.6 * g + bl, 0.4], [100, 22.0 * g, 15.6 * g, 1.2], [70, 24.6, 18.0, 1.6], [chem, 27.0, 20.4, 1.6]]);
    const caps = SIDES.map(([s, sg]) => roundCone([sg * 6.5, 145.2, -3.4], [J[s + 'Arm'][0] + sg * 1.0, J[s + 'Arm'][1] - 1.6, J[s + 'Arm'][2] + 0.2], 5.6, 6.8));
    const fo = folds(R, 4);
    const outer = (x, y, z) => { const d = smin(ck(x, y, z), Math.min(caps[0](x, y, z), caps[1](x, y, z)), 4);
      return d + 1.25 * fo(x, z, 1.5) * sstep(128, chem + 10, y) + 0.1 * N3(x * 0.2, y * 0.2, z * 0.2); };
    const cuts = (x, y, z) => Math.max(chem + 0.9 * Math.sin(Math.atan2(x, z) * 4 + 0.6) - y, y - 151.2);
    const openW = curve([[0, 15], [90, 12], [118, 9.5], [140, 6.5], [151, 6.0]]);
    const open = (x, y, z) => Math.max(ck.c(y) + 2 - z, Math.abs(x) - openW(y));
    const cSh = shell(outer, bisht ? 1.5 : 1.9);
    const cloakF = (x, y, z) => smax(smax(cSh(x, y, z), cuts(x, y, z), 0.5), -open(x, y, z), 0.5);
    const csegs = [...torsoSegs, ...legSegs.map((q) => [...q.slice(0, 3), 0])];
    parts.push({ name: 'cloak', f: cloakF, bb: [-33, chem - 3, -25, 33, 154, 25], res: res(0.75), mat: 'cloak', segs: csegs, custom: skirt(0.72, 0.25), pw: 5, smooth: 10 });
    if (bisht) {   // gold zari trim along the opening and collar
      const trim = (x, y, z) => smax(smax(Math.abs(open(x, y, z) - 1.1) - 1.3, Math.abs(outer(x, y, z) + 0.75) - 0.95, 0.2), cuts(x, y, z) - 0.2, 0.2);
      parts.push({ name: 'trim', f: trim, bb: [-22, chem - 2, -12, 22, 154, 25], res: res(0.4), mat: 'trim', segs: csegs, custom: skirt(0.72, 0.25), pw: 5, smooth: 6 });
    }
    for (const [s, sg] of SIDES) {   // wide outer sleeves to mid-forearm
      const A = J[s + 'Arm'], F = J[s + 'ForeArm'], Hn = J[s + 'Hand'], fd = nrm(sub(Hn, F)), end = lerp3(F, Hn, bisht ? 0.42 : 0.3);
      const tube = chain([add(A, nrm(sub(F, A)), 3), F, end], [7.4, 7.2, bisht ? 8.8 : 7.6], 2);
      const fs = noise3(P.seed * 5 + (sg > 0 ? 7 : 9));
      const sl = (x, y, z) => { const d = tube(x, y, z) + 0.4 * fs(x * 0.2, y * 0.2, z * 0.2);
        return smax(Math.abs(d + 0.8) - 0.8, dot(sub([x, y, z], end), fd), 0.4); };
      parts.push({ name: 'cloakSleeve' + s, f: sl, bb: [Math.min(A[0], end[0]) - 14, end[1] - 14, -20, Math.max(A[0], end[0]) + 14, A[1] + 12, 20], res: res(0.65), mat: 'cloak',
        segs: [[s + 'Shoulder', s + 'Shoulder', s + 'Arm', 0.6], [s + 'Arm', s + 'Arm', s + 'ForeArm'], [s + 'ForeArm', s + 'ForeArm', s + 'Hand']], pw: 5, smooth: 6 });
    }
  }
  return parts;
}

// a torus around an arbitrary axis (unit dir) through c
function torusAlong(c, dir, R, r) {
  return (x, y, z) => { const p = [x - c[0], y - c[1], z - c[2]], a = dot(p, dir), q = [p[0] - dir[0] * a, p[1] - dir[1] * a, p[2] - dir[2] * a];
    const ql = Math.hypot(q[0], q[1], q[2]); return Math.hypot(ql - R, a) - r; };
}
