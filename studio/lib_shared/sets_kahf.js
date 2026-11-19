// sets_kahf.js: the locations of "15 Lessons from Surah Al-Kahf", built with world.js + growth.js. See SETS_KAHF.md.
//
// Same contract as sets_yusuf.js. Each builder is async and returns
//   { name, scene, group, cameras: { hero, ... }, props: { ... }, atmo, exposure, bloom, update(t, cam, o) }
// group holds everything built (with an empty 'people_slots' group of named anchors for people.js);
// cameras are named anchor poses { pos, look, fov }; props are named objects and PURE setters a film can drive
// (for example props.setDay(p), props.setStage(p), props.setRepair(p), props.setBuild(p)): every setter
// recomputes its whole state from its argument, so frames can be rendered out of order.
// Wrap with W.stage(set) to render through lib/gl.js. Call W.init(G.R) once before building.
//
// New kit pieces in this file (exported for later series):
//   noise3 / fbm3 (seeded 3-D value noise), sdfMesh (narrow-band marching tetrahedra with baked sky
//   occlusion, for overhangs a heightfield cannot make: cliffs, caves, a lying dog), triMat (triplanar PBR from a
//   library texture set, for steep rock), occify (multiplies a material's indirect light by a baked 'occ'
//   attribute or a constant, so cave interiors are not lit by the open sky), seaMat (two-colour water with a
//   moving seam), windAt (the pure-function wind shared by the barley shader and the chaff).
import * as W from './world.js';
import * as GR from './growth.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const { THREE } = W;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dirFrom = (elev, azim) => { const e = elev * Math.PI / 180, a = azim * Math.PI / 180; return V3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); };
const { lerp, sstep, clamp } = W;
const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);

// ------------------------------------------------------------------ shared materials (cached)
const MC = new Map();
function mat(key, name, o = {}) { if (!MC.has(key)) MC.set(key, W.pbr(name, o)); return MC.get(key); }
const MATS = {
  plaster: () => mat('plaster', 'clay_plaster', { tile: 2.2, tint: 0xf0dcc0, res: 1024 }),
  whitewash: () => mat('whitewash', 'rough_plaster_03', { tile: 2.0, tint: 0xf4ece0, res: 1024, normal: 0.7 }),
  mudPlaster: () => mat('mudPlaster', 'rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }),
  stone: () => mat('stone', 'old_stone_wall', { tile: 2.4, tint: 0xe6dccb, res: 2048, normal: 1.3 }),
  rustic: () => mat('rustic', 'rustic_stone_wall', { tile: 2.2, tint: 0xeee2cc, res: 2048, normal: 1.3 }),
  rusticDisp: () => mat('rusticDisp', 'rustic_stone_wall', { tile: 2.0, tint: 0xeee2cc, res: 2048, normal: 1.2, disp: 0.09 }),
  planks: () => mat('planks', 'old_planks_02', { tile: 1.6, tint: 0xcaa880, res: 1024 }),
  darkPlanks: () => mat('darkPlanks', 'old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 }),
  hullPlanks: () => mat('hullPlanks', 'old_planks_02', { tile: 1.2, tint: 0xa88a6a, res: 2048, side: THREE.DoubleSide }),
  hessian: () => mat('hessian', 'hessian_230', { tile: 0.5, tint: 0xc8b8a0, res: 1024 }),
  linen: () => mat('linen', 'hessian_230', { tile: 0.35, tint: 0xf2ebdd, res: 1024, side: THREE.DoubleSide, normal: 0.5 }),
  wool: () => mat('wool', 'hessian_230', { tile: 0.45, tint: 0x6a5a4a, res: 1024, side: THREE.DoubleSide, normal: 1.3 }),
  reed: () => mat('reed', 'reed_roof_03', { tile: 1.6, res: 1024, side: THREE.DoubleSide }),
  mudFloor: () => mat('mudFloor', 'brown_mud_dry', { tile: 2.0, res: 1024 }),
};

// ------------------------------------------------------------------ light presets
const TIMES = {
  night:    { hdri: 'rogland_moonlit_night', sun: { elev: 38, azim: 210 }, sunI: 0.55, sunColor: 0xa8bcff, envI: 1.6, starsOn: 1, exposure: 1.9, fog: 0.003,
              sky: { zenith: 0x02040c, sunColor: 0x000000, glow: 0, hazeH: 0.35 }, fogColor: 0x0b1222, moon: { dir: dirFrom(38, 210), phase: 0.55 }, hemi: 0.15 },
  // blue hour before sunrise: the sun 5 degrees under the eastern (+x) horizon tints that side pink
  bluehour: { hdri: 'rogland_moonlit_night', sun: { elev: -5, azim: 10 }, sunI: 0, envI: 2.6, starsOn: 0.35, exposure: 1.55, fog: 0.0026,
              sky: { zenith: 0x0a1a40, sunColor: 0xff9aa8, glow: 1.6, hazeH: 0.55 }, fogColor: 0x6a7aa6, hemi: 0.35 },
  sunrise:  { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: 10 }, sunI: 2.8, sunColor: 0xffc890, envI: 1.0, exposure: 1.0, fog: 0.0018 },
  day:      { hdri: 'goegap', background: 'hdri', sun: { azim: 40 }, sunI: 3.6, envI: 1.0, exposure: 0.85, fog: 0.0014 },
  golden:   { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: -30 }, sunI: 2.6, sunColor: 0xffc890, envI: 1.0, exposure: 0.95, fog: 0.0016, fogGain: 0.8 },
  dusk:     { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: -35 }, sunI: 2.0, envI: 1.1, exposure: 1.0, fog: 0.0018, fogGain: 0.8 },
  overcast: { hdri: 'rogland_overcast', background: 'hdri', sun: { azim: 60 }, sunI: 0.5, envI: 1.25, exposure: 1.0, fog: 0.003, hemi: 0.3 },
};
async function base(name, time, extra = {}) {
  const scene = new THREE.Scene(), group = new THREE.Group(); group.name = name; scene.add(group);
  const T = { ...TIMES[time], ...extra }, atmo = await W.atmosphere(scene, T);
  return { scene, group, atmo, exposure: T.exposure ?? 1, updaters: [] };
}
function finish(S, name, cameras, props, slots, more = {}) {
  S.group.add(W.peopleSlots(slots));
  const ups = S.updaters;
  return { name, scene: S.scene, group: S.group, cameras, props, atmo: S.atmo, exposure: S.exposure, bloom: more.bloom ?? 0.18, bloomThreshold: more.bloomThreshold ?? 0.9,
    update(t, cam, o = {}) { for (const f of ups) f(t, o, cam); } };
}
const add = (S, o, ...pos) => { if (pos.length) o.position.set(...pos); S.group.add(o); return o; };

// ------------------------------------------------------------------ 3-D noise (seeded, pure)
function hash3(i, j, k, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
export function noise3(seed = 1) {
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let fx = x - xi, fy = y - yi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    const a = hash3(xi, yi, zi, seed), b = hash3(xi + 1, yi, zi, seed), c = hash3(xi, yi + 1, zi, seed), d = hash3(xi + 1, yi + 1, zi, seed);
    const e = hash3(xi, yi, zi + 1, seed), f = hash3(xi + 1, yi, zi + 1, seed), g = hash3(xi, yi + 1, zi + 1, seed), h = hash3(xi + 1, yi + 1, zi + 1, seed);
    const x0 = a + (b - a) * fx, x1 = c + (d - c) * fx, x2 = e + (f - e) * fx, x3 = g + (h - g) * fx;
    const y0 = x0 + (x1 - x0) * fy, y1 = x2 + (x3 - x2) * fy;
    return (y0 + (y1 - y0) * fz) * 2 - 1;
  };
}
export function fbm3(n, x, y, z, oct = 4) { let s = 0, a = 1, f = 1, m = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f + i * 7.1, y * f - i * 3.3, z * f + i * 5.7); m += a; a *= 0.5; f *= 2.02; } return s / m; }
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);
const sdEll = (x, y, z, rx, ry, rz) => { const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz)); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz); };
const sdCap = (x, y, z, a, b, r) => { const pax = x - a[0], pay = y - a[1], paz = z - a[2], bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)); return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r; };

// ------------------------------------------------------------------ SDF mesher (marching tetrahedra, Kuhn split)
// sdf(x, y, z, col) < 0 inside solid; sdf.column?(x, z) -> per-column cache passed as col (for 2-D terms).
// ground(x, z) (optional) is extra solid used for occlusion only (the terrain under the mesh).
// Returns { geometry (position, normal, occ, uv), occAt(p, n), field(x,y,z) }.
const CO = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const TETS = [[0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6]];
const RAYS = (() => { const r = W.rng(77), d = []; for (let i = 0; i < 14; i++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); d.push([s * Math.cos(a), z, s * Math.sin(a)]); } return d; })();
export function sdfMesh(sdf, { min, max, step = 0.2, ground = null, occ = true, reach = 22, aoScale = 1 } = {}) {
  const nx = Math.ceil((max[0] - min[0]) / step), ny = Math.ceil((max[1] - min[1]) / step), nz = Math.ceil((max[2] - min[2]) / step);
  const sx = nx + 1, sy = ny + 1, sz = nz + 1, sxy = sx * sy, NT = sxy * sz, F = new Float32Array(NT);
  for (let k = 0; k < sz; k++) { const z = min[2] + k * step;
    for (let i = 0; i < sx; i++) { const x = min[0] + i * step, col = sdf.column ? sdf.column(x, z) : null;
      for (let j = 0; j < sy; j++) F[i + sx * j + sxy * k] = sdf(x, min[1] + j * step, z, col); } }
  // ground occupancy on a 2-D grid (bilinear) for the occlusion field
  let Gd = null;
  if (ground) { Gd = new Float32Array(sx * sz); for (let k = 0; k < sz; k++) for (let i = 0; i < sx; i++) Gd[i + sx * k] = ground(min[0] + i * step, min[2] + k * step); }
  const tri = (x, y, z) => {
    const fx = (x - min[0]) / step, fy = (y - min[1]) / step, fz = (z - min[2]) / step;
    let s = 1e3;
    if (fx >= 0 && fy >= 0 && fz >= 0 && fx < nx && fy < ny && fz < nz) {
      const i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, v = fy - j, w = fz - k, o = i + sx * j + sxy * k;
      const c00 = F[o] + (F[o + 1] - F[o]) * u, c10 = F[o + sx] + (F[o + sx + 1] - F[o + sx]) * u;
      const c01 = F[o + sxy] + (F[o + sxy + 1] - F[o + sxy]) * u, c11 = F[o + sxy + sx] + (F[o + sxy + sx + 1] - F[o + sxy + sx]) * u;
      s = (c00 + (c10 - c00) * v) * (1 - w) + (c01 + (c11 - c01) * v) * w;
    }
    if (Gd && fx >= 0 && fz >= 0 && fx < nx && fz < nz) { const i = fx | 0, k = fz | 0, u = fx - i, w = fz - k, o = i + sx * k;
      const g = (Gd[o] * (1 - u) + Gd[o + 1] * u) * (1 - w) + (Gd[o + sx] * (1 - u) + Gd[o + sx + 1] * u) * w; s = Math.min(s, y - g); }
    return s;
  };
  // occlusion: local AO along the normal x sky visibility (sphere-traced rays over the field)
  const occAt = (px, py, pz, nx_, ny_, nz_) => {
    let ao = 0;
    for (const d of [0.2, 0.5, 1.0, 2.0]) { const dd = d * aoScale; ao += Math.max(0, dd - tri(px + nx_ * dd, py + ny_ * dd, pz + nz_ * dd)) / dd * 0.3; }
    let open = 0, wsum = 0;
    for (const r of RAYS) {
      let dx = r[0] + nx_ * 1.2, dy = r[1] + ny_ * 1.2 + 0.25, dz = r[2] + nz_ * 1.2; const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
      const wgt = Math.max(0.05, dy * 0.6 + 0.4); wsum += wgt;
      let t = 0.25, hit = false;
      while (t < reach) { const s = tri(px + dx * t, py + dy * t, pz + dz * t); if (s < 0.04) { hit = true; break; } t += Math.max(0.12, s * 0.9); }
      if (!hit) open += wgt;
    }
    return clamp(1 - ao) * Math.pow(open / wsum, 1.15);
  };
  // polygonise
  const pos = [], nor = [], idx = [], vmap = new Map();
  const grad = (a) => { const i = a % sx, j = ((a / sx) | 0) % sy, k = (a / sxy) | 0;
    return [(i < nx ? F[a + 1] : F[a]) - (i > 0 ? F[a - 1] : F[a]), (j < ny ? F[a + sx] : F[a]) - (j > 0 ? F[a - sx] : F[a]), (k < nz ? F[a + sxy] : F[a]) - (k > 0 ? F[a - sxy] : F[a])]; };
  const coord = (a) => [min[0] + (a % sx) * step, min[1] + (((a / sx) | 0) % sy) * step, min[2] + ((a / sxy) | 0) * step];
  const vert = (a, b) => {
    const key = a < b ? a * NT + b : b * NT + a; let id = vmap.get(key);
    if (id !== undefined) return id;
    const va = F[a], vb = F[b], t = va / (va - vb), pa = coord(a), pb = coord(b), ga = grad(a), gb = grad(b);
    id = pos.length / 3; pos.push(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t);
    let gx = ga[0] + (gb[0] - ga[0]) * t, gy = ga[1] + (gb[1] - ga[1]) * t, gz = ga[2] + (gb[2] - ga[2]) * t; const L = Math.hypot(gx, gy, gz) || 1;
    nor.push(gx / L, gy / L, gz / L); vmap.set(key, id); return id;
  };
  const emit = (a, b, c) => {
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az, vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-14) return;
    const n = cx * (nor[a * 3] + nor[b * 3] + nor[c * 3]) + cy * (nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1]) + cz * (nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2]);
    if (n >= 0) idx.push(a, b, c); else idx.push(a, c, b);
  };
  const g = new Int32Array(8), v = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { const o = (i + CO[c][0]) + sx * (j + CO[c][1]) + sxy * (k + CO[c][2]); g[c] = o; v[c] = F[o]; if (v[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    for (const T of TETS) {
      const ins = [], out = [];
      for (const c of T) (v[c] < 0 ? ins : out).push(g[c]);
      if (ins.length === 0 || ins.length === 4) continue;
      if (ins.length === 1) emit(vert(ins[0], out[0]), vert(ins[0], out[1]), vert(ins[0], out[2]));
      else if (ins.length === 3) emit(vert(out[0], ins[0]), vert(out[0], ins[1]), vert(out[0], ins[2]));
      else { const ac = vert(ins[0], out[0]), ad = vert(ins[0], out[1]), bd = vert(ins[1], out[1]), bc = vert(ins[1], out[0]); emit(ac, ad, bd); emit(ac, bd, bc); }
    }
  }
  const nv = pos.length / 3, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(nv * 2), 2));
  const oc = new Float32Array(nv).fill(1);
  if (occ) for (let q = 0; q < nv; q++) oc[q] = occAt(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2], nor[q * 3], nor[q * 3 + 1], nor[q * 3 + 2]);
  geo.setAttribute('occ', new THREE.BufferAttribute(oc, 1));
  geo.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return { geometry: geo, occAt: (p, n) => occAt(p.x, p.y, p.z, n.x, n.y, n.z), field: tri };
}
// bake an 'occ' attribute onto any mesh from an occAt(p, n) function (world space)
export function bakeOcc(mesh, occAt, { floor = 0 } = {}) {
  mesh.updateMatrixWorld(true);
  const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, o = new Float32Array(p.count), P = V3(), N = V3(), NM = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < p.count; i++) { P.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); N.fromBufferAttribute(n, i).applyMatrix3(NM).normalize(); o[i] = Math.max(floor, occAt(P, N)); }
  g.setAttribute('occ', new THREE.BufferAttribute(o, 1));
  return mesh;
}
// multiply a material's indirect (sky) light by the vertex attribute 'occ' (mode 'attr') or by a constant
export function occify(m, value = null) {
  const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey?.bind(m);
  const U = { occK: { value: value ?? 1 } }; m.userData.occ = U.occK;
  m.onBeforeCompile = (s, r) => {
    prev?.call(m, s, r); s.uniforms.occK = U.occK;
    if (value === null) {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float occ; varying float vOccA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOccA = occ;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOccA; uniform float occK;');
    } else s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float occK;');
    s.fragmentShader = s.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      { float oo = ${value === null ? 'vOccA * occK' : 'occK'}; reflectedLight.indirectDiffuse *= oo; reflectedLight.indirectSpecular *= mix(0.15, 1., oo) * oo; }`);
  };
  m.customProgramCacheKey = () => (key0 ? key0() : '') + (value === null ? '|occA' : '|occK');
  m.needsUpdate = true;
  return m;
}

// ------------------------------------------------------------------ triplanar PBR (steep rock, cave walls, masonry blocks)
const TRI_DECL = `
uniform float tileInv, nsc, strata, macro, aoTex; uniform vec3 strataTint; varying vec3 vTW; varying vec3 vTN;
float th3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float tvn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(th3(i), th3(i+vec3(1,0,0)), f.x), mix(th3(i+vec3(0,1,0)), th3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(th3(i+vec3(0,0,1)), th3(i+vec3(1,0,1)), f.x), mix(th3(i+vec3(0,1,1)), th3(i+vec3(1,1,1)), f.x), f.y), f.z); }
vec3 triW;
vec4 triS(sampler2D s, vec3 p){ return texture2D(s, p.zy) * triW.x + texture2D(s, p.xz) * triW.y + texture2D(s, p.xy) * triW.z; }
`;
const TRI_MAP = `
  vec3 tN0 = normalize(vTN); triW = pow(abs(tN0), vec3(6.)); triW /= dot(triW, vec3(1.));
  vec3 tp = vTW * tileInv, tp2 = vTW * tileInv * 0.31 + vec3(0.37, 0.11, 0.73);
  float mixk = 0.25 + 0.4 * tvn3(vTW * 0.09);
  vec4 tC = mix(triS(map, tp), triS(map, tp2), mixk), tA = mix(triS(roughnessMap, tp), triS(roughnessMap, tp2), mixk);
  float mn = tvn3(vTW * 0.05) * 0.6 + tvn3(vTW * 0.23) * 0.4;
  vec3 tcol = tC.rgb * (1. + macro * (mn - 0.5) * 2.);
  float band = sin(vTW.y * 2.2 + tvn3(vTW * vec3(0.12, 0.5, 0.12)) * 5.) * 0.6 + 0.4 * sin(vTW.y * 6.9 + 1.3);
  tcol = mix(tcol, tcol * strataTint, strata * (0.5 + 0.5 * band));
  diffuseColor.rgb *= tcol;
`;
const TRI_NORM = `
  { vec3 nX = texture2D(normalMap, tp.zy).xyz * 2. - 1., nY = texture2D(normalMap, tp.xz).xyz * 2. - 1., nZ = texture2D(normalMap, tp.xy).xyz * 2. - 1.;
    nX.xy *= nsc; nY.xy *= nsc; nZ.xy *= nsc;
    vec3 wX = vec3(nX.xy + tN0.zy, abs(nX.z) * tN0.x), wY = vec3(nY.xy + tN0.xz, abs(nY.z) * tN0.y), wZ = vec3(nZ.xy + tN0.xy, abs(nZ.z) * tN0.z);
    vec3 wn = normalize(wX.zyx * triW.x + wY.xzy * triW.y + wZ.xyz * triW.z);
    normal = normalize((viewMatrix * vec4(wn, 0.)).xyz); }
`;
export async function triMat(name, { tile = 4, tint = 0xffffff, normal = 1, rough = 1, strata = 0, strataTint = 0xb8a890, macro = 0.25, res = 2048, occ = null, aoTex = 0.85 } = {}) {
  const T = await W.pbrMaps(name, res);
  const m = new THREE.MeshStandardMaterial({ map: T.map, normalMap: T.nor, roughnessMap: T.arm, roughness: rough, metalness: 0, color: tint });
  const U = { tileInv: { value: 1 / tile }, nsc: { value: normal }, strata: { value: strata }, strataTint: { value: new THREE.Color(strataTint) }, macro: { value: macro }, aoTex: { value: aoTex } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTW; varying vec3 vTN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + TRI_DECL)
      .replace('#include <map_fragment>', TRI_MAP).replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * tA.g;')
      .replace('#include <normal_fragment_maps>', TRI_NORM)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n{ float ta = mix(1., tA.r, aoTex); reflectedLight.indirectDiffuse *= ta; reflectedLight.indirectSpecular *= ta; reflectedLight.directDiffuse *= mix(1., ta, 0.35); }');
  };
  m.customProgramCacheKey = () => 'tri1';
  m.userData.uniforms = U;
  if (occ) occify(m, occ === 'attr' ? null : occ);
  return m;
}

// ------------------------------------------------------------------ small procedural textures (canvas, seeded)
function canvasTex(w, h, fn, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// height image -> tangent-space normal map
function normalFromHeight(w, h, H, k = 2) {
  return canvasTex(w, h, (x) => { const im = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (H[j * w + (i + 1) % w] - H[j * w + (i - 1 + w) % w]) * k, dy = (H[((j + 1) % h) * w + i] - H[((j - 1 + h) % h) * w + i]) * k;
      const L = Math.hypot(dx, dy, 1), o = (j * w + i) * 4; im.data[o] = (-dx / L * 0.5 + 0.5) * 255; im.data[o + 1] = (dy / L * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / L * 0.5 + 0.5) * 255; im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0); }, { srgb: false });
}
const TEXC = new Map();
function cachedTex(key, fn) { if (!TEXC.has(key)) TEXC.set(key, fn()); return TEXC.get(key); }
// hammered, scaled wrought iron (colour + normal)
function ironTextures() {
  return cachedTex('iron', () => {
    const N = 512, n = W.noise2(41), H = new Float32Array(N * N), r = W.rng(5);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = W.fbm(n, i / 64, j / 64, 4) * 0.6;
    for (let d = 0; d < 900; d++) { const cx = r() * N, cy = r() * N, rr = 6 + r() * 14;        // hammer dents
      for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const q = 1 - (i * i + j * j) / (rr * rr); if (q > 0) { const o = ((Math.floor(cy + j) + N) % N) * N + ((Math.floor(cx + i) + N) % N); H[o] -= q * q * 0.5; } } }
    const map = canvasTex(N, N, (x) => { const im = x.createImageData(N, N);
      for (let k = 0; k < N * N; k++) { const v = H[k], rust = Math.max(0, W.fbm(n, (k % N) / 40 + 9, Math.floor(k / N) / 40, 4)) * 1.6, o = k * 4, s = 0.85 + v * 0.25;
        im.data[o] = Math.min(255, (52 + rust * 70) * s); im.data[o + 1] = Math.min(255, (50 + rust * 30) * s); im.data[o + 2] = Math.min(255, (48 + rust * 10) * s); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); });
    return { map, normalMap: normalFromHeight(N, N, H, 3) };
  });
}
export function ironPBR({ tile = 0.6 } = {}) {
  const T = ironTextures(), m = new THREE.MeshStandardMaterial({ map: T.map.clone(), normalMap: T.normalMap.clone(), roughness: 0.62, metalness: 0.75 });
  for (const t of [m.map, m.normalMap]) { t.needsUpdate = true; t.repeat.set(1 / tile, 1 / tile); }
  m.normalScale.set(1.2, 1.2); return m;
}
// a short-haired coat / fine fibre normal (dog, cloaks)
function fibreNormal(seed = 3) {
  return cachedTex('fibre' + seed, () => { const N = 256, r = W.rng(seed), H = new Float32Array(N * N);
    for (let s = 0; s < 6000; s++) { const x0 = r() * N, y0 = r() * N, a = 1.4 + (r() - 0.5) * 0.5, L = 3 + r() * 6;
      for (let t = 0; t < L; t++) { const o = ((Math.floor(y0 + Math.sin(a) * t) + N) % N) * N + ((Math.floor(x0 + Math.cos(a) * t) + N) % N); H[o] += 0.35; } }
    return normalFromHeight(N, N, H, 1.2); });
}

// ------------------------------------------------------------------ water with two colours and a moving seam (seas meeting / muddy lagoon)
// colour A where seamFn < 0, colour B where > 0; seam is a soft foamy band. depth attribute (optional) lightens shallows.
export function seaMat({ colA = 0x2aa8a8, colB = 0x5a6a3a, seam = null, foam = 0.6, rough = 0.06, tile = 7, flow = [0.012, 0.006], opacity = 0.94, shallow = 0x9ad8c8 } = {}) {
  const nm = W.water(new THREE.PlaneGeometry(1, 1)).material.normalMap.clone(); nm.needsUpdate = true; nm.repeat.set(1 / tile, 1 / tile);
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: rough, metalness: 0, normalMap: nm, transparent: opacity < 1, opacity, ior: 1.33, envMapIntensity: 1.25 });
  m.normalScale.set(0.4, 0.4);
  const U = { colA: { value: new THREE.Color(colA) }, colB: { value: new THREE.Color(colB) }, shal: { value: new THREE.Color(shallow) }, time: { value: 0 }, foamK: { value: foam },
    sA: { value: new THREE.Vector4(...(seam?.a ?? [0, 0, 1, 0])) }, sB: { value: new THREE.Vector4(...(seam?.b ?? [0.06, 0.03, 2.5, 0.5])) } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDepth; varying vec3 vSW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = depth; vSW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 colA, colB, shal; uniform float time, foamK; uniform vec4 sA, sB; varying float vDepth; varying vec3 vSW;
      float sh1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float sn1(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(sh1(i), sh1(i+vec2(1,0)), f.x), mix(sh1(i+vec2(0,1)), sh1(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { // seam: a line a.x*x + a.y*z + a.w = 0 warped by slow travelling waves; sB = (amp1, amp2, freq, speed)
        float d = sA.x * vSW.x + sA.y * vSW.z + sA.w;
        float along = -sA.y * vSW.x + sA.x * vSW.z;
        d += sB.x * 40. * sin(along * sB.z * 0.01 + time * sB.w * 0.2) + sB.y * 40. * sin(along * sB.z * 0.037 - time * sB.w * 0.33) + (sn1(vSW.xz * 0.05 + time * 0.02) - 0.5) * 6.;
        float k = smoothstep(-3., 3., d);
        vec3 c = mix(colA, colB, k);
        c = mix(shal, c, smoothstep(0.0, 1.6, vDepth));
        float fz = exp(-d * d / 2.2) * foamK * (0.55 + 0.45 * sn1(vSW.xz * 0.9 + vec2(time * 0.3, 0.)));
        diffuseColor.rgb = mix(c, vec3(0.92, 0.95, 0.92), clamp(fz * 0.8, 0., 1.));
      }`);
  };
  m.customProgramCacheKey = () => 'sea2';
  m.userData.U = U;
  m.userData.update = (t) => { U.time.value = t; nm.offset.set(t * flow[0], t * flow[1]); };
  return m;
}
// a dense water sheet with a per-vertex 'depth' from a bed heightfield (for shallows tint)
function waterSheet({ rect, seg = [200, 200], y = 0, bed = null }) {
  const [x0, z0, x1, z1] = rect, g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, seg[0], seg[1]).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.attributes.position, d = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) d[i] = bed ? Math.max(0, y - bed(p.getX(i), p.getZ(i))) : 10;
  g.setAttribute('depth', new THREE.BufferAttribute(d, 1));
  return g;
}

// ------------------------------------------------------------------ shared small props
function oilLamp(S, { seed = 1, light = 2.2, dist = 9 } = {}) {
  const g = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.004], [0.075, 0.025], [0.06, 0.04], [0.03, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay);
  body.scale.set(1, 1, 1.35); g.add(W.shadows(body));
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.035, 0.09); g.add(W.shadows(sp));
  const f = W.flame({ h: 0.09, w: 0.04, seed, inten: 3.5, light, dist, planes: 2 }); f.position.set(0, 0.045, 0.115); g.add(f);
  S.updaters.push((t, o) => f.userData.update(t, o.lamp ?? 1));
  g.userData.flame = f; return g;
}
// a sealed / open clay jar (lathe), with optional seal cloth + cord
function clayJar({ h = 0.7, r = 0.26, seal = false, color = 0xa8683e, seed = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, normalMap: fibreNormal(seed + 9), normalScale: new THREE.Vector2(0.15, 0.15) });
  const prof = [[0.001, 0], [r * 0.45, 0.005], [r * 0.85, h * 0.18], [r, h * 0.45], [r * 0.82, h * 0.72], [r * 0.42, h * 0.86], [r * 0.38, h * 0.93], [r * 0.46, h * 0.97], [r * 0.4, h], [r * 0.34, h * 0.96], [r * 0.3, h * 0.8]];
  const g = new THREE.Group(); g.add(W.lathe(prof, m, { seg: 72 }));
  if (seal) { const c = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 32, 12, 0, TAU, 0, 1.3), new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.95 })); c.scale.y = 0.45; c.position.y = h * 0.97; g.add(W.shadows(c));
    const cord = new THREE.Mesh(new THREE.TorusGeometry(r * 0.44, 0.008, 8, 48), W.ropeMat()); cord.rotation.x = Math.PI / 2; cord.position.y = h * 0.92; g.add(W.shadows(cord)); }
  return g;
}
// cloth-roof shelter on 4 poles
async function shelter({ w = 3, d = 2.4, h = 1.9, seed = 1, color = 0xd8c8a8 } = {}) {
  const g = new THREE.Group(), [cl, pl] = await Promise.all([MATS.linen(), MATS.darkPlanks()]), m = cl.clone(); m.color.set(color);
  const roof = W.cloth(w, d, m, { segW: 48, segH: 40, folds: 0.01, seed, sag: (u, v) => -0.18 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) - 0.05 * Math.sin(u * 9 + seed) });
  roof.rotation.x = -Math.PI / 2; roof.position.y = h; g.add(roof);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) { const p = W.rbox(0.06, h + (z < 0 ? 0.25 : 0), 0.06, pl, { r: 0.015 }); p.position.set(x, 0, z); g.add(p);
    g.add(W.rope([V3(x, h - 0.05, z), V3(x * 1.2, h * 0.5, z * 1.6), V3(x * 1.3, 0.02, z * 2.1)], 0.008)); }
  return W.shadows(g);
}
// mud-brick flat-roofed house block with parapet and beam ends; origin at the base centre, door on +z
async function mudHouse({ w = 6, d = 5, h = 3.2, door = true, seed = 1, shutters = true, plaster = null } = {}) {
  const g = new THREE.Group(), r = W.rng(seed), [mud, dpl, pl] = await Promise.all([plaster ?? MATS.mudPlaster(), MATS.darkPlanks(), MATS.planks()]);
  const body = W.rbox(w, h, d, mud, { r: 0.12, seg: 3 }); g.add(body);
  const par = W.rbox(w + 0.1, 0.4, d + 0.1, mud, { r: 0.1 }); par.position.y = h - 0.05; g.add(par);
  const roof = W.rbox(w - 0.5, 0.3, d - 0.5, mud, { r: 0.05 }); roof.position.y = h; g.add(roof);
  for (let i = 0; i < Math.floor(w / 0.8); i++) { const b = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.07, 0.08, 0.4, 16).rotateX(Math.PI / 2)), dpl); b.position.set(-w / 2 + 0.5 + i * 0.8 + (r() - 0.5) * 0.06, h - 0.25, d / 2 + 0.12); g.add(W.shadows(b)); }
  const parts = {};
  if (door) { const dw = 0.95, dh = 1.9; const D = W.door(pl, W.ironMat(), { w: dw, h: dh, t: 0.06, frame: 0.1, studs: false }); D.group.position.set((r() - 0.5) * w * 0.3, 0, d / 2 + 0.02); g.add(D.group); parts.door = D;
    const lin = W.rbox(dw + 0.5, 0.14, 0.2, dpl, { r: 0.02 }); lin.position.set(D.group.position.x, dh + 0.06, d / 2 + 0.06); g.add(lin); }
  if (shutters) { const wx = (parts.door ? -Math.sign(parts.door.group.position.x || 1) : 1) * w * 0.28; const sh = await windowScreen(); sh.position.set(wx, 1.7, d / 2 + 0.02); g.add(sh); parts.window = sh; }
  g.userData = parts;
  return W.shadows(g);
}
// a closed wooden window shutter pair in a frame (lattice screen above)
async function windowScreen({ w = 0.8, h = 0.75 } = {}) {
  const g = new THREE.Group(), [pl, dpl] = await Promise.all([MATS.planks(), MATS.darkPlanks()]);
  const fr = W.rbox(w + 0.14, h + 0.14, 0.08, dpl, { r: 0.015 }); fr.position.y = -0.07; g.add(fr);
  for (const s of [-1, 1]) { const leaf = W.rbox(w / 2 - 0.02, h * 0.62, 0.05, pl, { r: 0.01 }); leaf.position.set(s * w / 4, 0, 0.04); g.add(leaf); }
  for (let i = 0; i < 5; i++) { const b = W.rbox(0.025, h * 0.3, 0.03, dpl, { r: 0.005 }); b.position.set(-w / 2 + 0.1 + i * (w - 0.2) / 4, h * 0.64, 0.05); g.add(b); }
  const bar = W.rbox(w, 0.025, 0.03, dpl, { r: 0.005 }); bar.position.set(0, h * 0.78, 0.05); g.add(bar);
  return W.shadows(g);
}

// ------------------------------------------------------------------ atmosphere helpers (pure functions of t)
// low drifting mist: stacked translucent sheets with a moving noise mask
export function mistLayer({ rect = [-40, -40, 40, 40], y = 0.4, layers = 3, gap = 0.5, color = 0xc8d0e0, op = 0.25, speed = [0.25, 0.08], scale = 0.06, heightAt = null } = {}) {
  const g = new THREE.Group(); g.name = 'mist';
  const U = { time: { value: 0 }, op: { value: op }, col: { value: new THREE.Color(color) }, spd: { value: new THREE.Vector2(...speed) }, sc: { value: scale } };
  for (let i = 0; i < layers; i++) {
    const [x0, z0, x1, z1] = rect, geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 96, 96).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    if (heightAt) { const p = geo.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, heightAt(p.getX(k), p.getZ(k))); }
    const m = new THREE.ShaderMaterial({ uniforms: { ...U, lay: { value: i } }, transparent: true, depthWrite: false, fog: true,
      vertexShader: `varying vec3 vW; #include <fog_pars_vertex>
        void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; #include <fog_vertex> }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
      fragmentShader: `uniform float time, op, sc, lay; uniform vec3 col; uniform vec2 spd; varying vec3 vW; #include <fog_pars_fragment>
        float mh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float mn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(mh(i), mh(i+vec2(1,0)), f.x), mix(mh(i+vec2(0,1)), mh(i+vec2(1,1)), f.x), f.y); }
        void main(){ vec2 p = vW.xz * sc + spd * time * (1. + lay * 0.3) + lay * 7.1;
          float n = mn(p) * 0.55 + mn(p * 2.3 + 3.1) * 0.3 + mn(p * 5.1 - time * 0.05) * 0.15;
          float a = smoothstep(0.45, 0.8, n) * op;
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`.replace(/#include <fog_pars_fragment>/, '\n#include <fog_pars_fragment>\n') });
    m.uniforms = { ...U, lay: { value: i }, ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog) };
    for (const k of Object.keys(U)) m.uniforms[k] = U[k];
    const mesh = new THREE.Mesh(geo, m); mesh.position.y = y + i * gap; mesh.renderOrder = 4; g.add(mesh);
  }
  g.userData.update = (t, k = 1) => { U.time.value = t; U.op.value = op * k; };
  return g;
}
// dust motes lit only inside a moving light beam (axis origin + direction set by the owner)
function motes({ count = 1400, box = [-3, 0, -9, 3, 3, 1], seed = 4, size = 2.2 } = {}) {
  const r = W.rng(seed), pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([lerp(box[0], box[3], r()), lerp(box[1], box[4], r()), lerp(box[2], box[5], r())], i * 3); ph[i] = r() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const U = { time: { value: 0 }, ao: { value: V3() }, ad: { value: V3(0, -1, 0) }, rad: { value: 0.6 }, k: { value: 1 }, size: { value: size } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float ph; uniform float time, rad, size; uniform vec3 ao, ad; varying float vA;
      void main(){ vec3 p = position + vec3(sin(time * 0.21 + ph) * 0.12, sin(time * 0.13 + ph * 1.7) * 0.08 + mod(time * 0.015 + ph, 0.3) - 0.15, cos(time * 0.17 + ph * 0.7) * 0.12);
        vec3 q = p - ao; float along = dot(q, ad); float d = length(q - ad * along);
        vA = exp(-d * d / (rad * rad)) * step(0., along) * (0.6 + 0.4 * sin(time * 2. + ph * 5.));
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * (2.5 / max(0.3, -mv.z)) * 6.; }`,
    fragmentShader: `uniform float k; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float a = exp(-dot(q, q) * 30.) * vA * k; gl_FragColor = vec4(vec3(1., 0.92, 0.78) * a, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 6; p.userData.U = U;
  p.userData.update = (t) => { U.time.value = t; };
  return p;
}

// ------------------------------------------------------------------ cloth over a body (the cave sleepers): draped heightfield
// lying on its side along local +z (head at -z). breath(t) is driven by the owner (uniform).
function sleeperShape({ seed = 1, len = 1.0, mirror = 1 } = {}) {
  const r = W.rng(seed), s = len * (0.95 + r() * 0.1);
  const E = [[0, 0.15, -0.8, 0.14, 0.15, 0.15], [0, 0.2, -0.47, 0.23, 0.2, 0.3], [0.02, 0.19, 0.04, 0.22, 0.19, 0.26], [0.06 * mirror, 0.13, 0.4, 0.15, 0.12, 0.28], [0.02 * mirror, 0.09, 0.76, 0.12, 0.09, 0.22]]
    .map(([x, y, z, rx, ry, rz]) => [x * s, y * s, z * s, rx * s, ry * s, rz * s]);
  const top = (x, z) => { let h = 0; for (const [cx, cy, cz, rx, ry, rz] of E) { const q = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2; if (q > 0) h = Math.max(h, cy + ry * Math.sqrt(q)); } return h; };
  return { top, E, s };
}
function sleeper(material, { seed = 1, len = 1.0, mirror = 1 } = {}) {
  const { top, s } = sleeperShape({ seed, len, mirror }), n = W.noise2(seed + 30);
  const X0 = -0.62 * s, X1 = 0.62 * s, Z0 = -1.18 * s, Z1 = 1.15 * s, st = 0.018, nx = Math.ceil((X1 - X0) / st), nz = Math.ceil((Z1 - Z0) / st);
  const H0 = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) H0[j * (nx + 1) + i] = top(X0 + i * st, Z0 + j * st);
  // drape: the cloth hangs from the body as a tent that falls off over ~0.16 m (separable max-blur with falloff)
  const tent = (A, R = 9) => { const B = new Float32Array(A.length);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let m = 0; for (let k = -R; k <= R; k++) { const ii = i + k; if (ii < 0 || ii > nx) continue; m = Math.max(m, A[j * (nx + 1) + ii] - Math.abs(k) * st * 1.25); } B[j * (nx + 1) + i] = m; }
    const C = new Float32Array(A.length);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let m = 0; for (let k = -R; k <= R; k++) { const jj = j + k; if (jj < 0 || jj > nz) continue; m = Math.max(m, B[jj * (nx + 1) + i] - Math.abs(k) * st * 1.25); } C[j * (nx + 1) + i] = m; }
    return C; };
  const H1 = tent(H0);
  const g = new THREE.PlaneGeometry(1, 1, nx, nz).rotateX(-Math.PI / 2), p = g.attributes.position, uv = g.attributes.uv, wgt = new Float32Array(p.count);
  for (let k = 0; k < p.count; k++) {
    const i = Math.round((p.getX(k) + 0.5) * nx), j = Math.round((p.getZ(k) + 0.5) * nz);
    let x = X0 + i * st, z = Z0 + j * st;
    const edge = Math.min(i, nx - i, j, nz - j) / 6, ew = 1 - clamp(edge);
    x += ew * 0.05 * n(z * 6, 1) * Math.sign(x || 1); z += ew * 0.04 * n(x * 6, 2) * Math.sign(z || 1);
    const h = H1[j * (nx + 1) + i], slope = clamp((h - H0[j * (nx + 1) + i]) * 6);
    const fold = (0.006 + 0.02 * slope) * (Math.sin(z * 26 + 3 * n(x * 3, z * 3)) + 0.6 * n(x * 9, z * 9));
    p.setXYZ(k, x, Math.max(0.004, h + 0.012 + fold), z); uv.setXY(k, x * 2.2, z * 2.2);
    wgt[k] = Math.exp(-(((z + 0.4 * s) / (0.32 * s)) ** 2)) * clamp(h * 4);           // the chest rises with the breath
  }
  g.setAttribute('bw', new THREE.BufferAttribute(wgt, 1)); g.computeVertexNormals();
  const m = material.clone(), U = { breath: { value: 0 } };
  m.onBeforeCompile = (sh) => { sh.uniforms.breath = U.breath;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float bw; uniform float breath;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y *= 1. + breath * bw;'); };
  m.customProgramCacheKey = () => 'sleeper1';
  const mesh = W.shadows(new THREE.Mesh(g, m)); mesh.name = 'sleeper'; mesh.userData.U = U; mesh.userData.s = s;
  return mesh;
}

// ------------------------------------------------------------------ the dog (SDF, lying with forelegs stretched out), +z = forward
function dogSDF() {
  const caps = [
    [[0.08, 0.1, 0.24], [0.09, 0.045, 0.52], 0.042], [[-0.08, 0.1, 0.24], [-0.085, 0.045, 0.53], 0.042],      // forelegs stretched out
    [[0, 0.27, 0.22], [0, 0.39, 0.37], 0.085],                                                                  // neck
    [[0.15, 0.045, -0.22], [0.16, 0.035, 0.02], 0.036], [[-0.15, 0.045, -0.22], [-0.16, 0.035, 0.02], 0.036],    // hind feet tucked forward
    [[-0.05, 0.05, -0.4], [0.08, 0.035, -0.52], 0.027], [[0.08, 0.035, -0.52], [0.21, 0.03, -0.42], 0.022],      // tail curled on the ground
  ];
  const ells = [
    [0, 0.19, -0.02, 0.165, 0.15, 0.36], [0, 0.22, 0.2, 0.15, 0.17, 0.17], [0.12, 0.13, -0.25, 0.11, 0.125, 0.17], [-0.12, 0.13, -0.25, 0.11, 0.125, 0.17],
    [0.09, 0.028, 0.58, 0.046, 0.03, 0.065], [-0.085, 0.028, 0.59, 0.046, 0.03, 0.065], [0, 0.44, 0.41, 0.085, 0.08, 0.1], [0, 0.415, 0.53, 0.046, 0.042, 0.085],
  ];
  const f = (x, y, z) => {
    let d = 1e3;
    for (const [cx, cy, cz, rx, ry, rz] of ells) d = smin(d, sdEll(x - cx, y - cy, z - cz, rx, ry, rz), 0.045);
    for (const [a, b, r] of caps) d = smin(d, sdCap(x, y, z, a, b, r), 0.035);
    d = smax(d, -y + 0.004, 0.01);                                                // flat on the ground
    return d;
  };
  return f;
}
function earSDF(side) { return (x, y, z) => { const lx = x, ly = y, lz = z; return smax(sdEll(lx, ly - 0.05, lz, 0.034, 0.06, 0.014), -sdEll(lx, ly - 0.045, lz + 0.016, 0.024, 0.05, 0.012), 0.004); }; }
function dogMesh(occAt) {
  const grp = new THREE.Group(); grp.name = 'dog';
  const coat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xf0d0a0) });
  const M = sdfMesh(dogSDF(), { min: [-0.3, -0.01, -0.66], max: [0.3, 0.58, 0.72], step: 0.0085, occ: false });
  const p = M.geometry.attributes.position, col = new Float32Array(p.count * 3), n = noise3(9);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const saddle = sstep(0.18, 0.34, y) * sstep(0.35, -0.1, z) * (1 - sstep(0.3, 0.5, z)), muzzle = sstep(0.5, 0.6, z) * sstep(0.35, 0.45, y), belly = 1 - sstep(0.05, 0.15, y);
    const k = 1 + 0.06 * n(x * 30, y * 30, z * 30);
    const c = [0.62, 0.45, 0.28].map((v, q) => v * k * (1 - 0.35 * saddle - 0.3 * muzzle) + belly * [0.12, 0.1, 0.07][q]);
    col.set(c, i * 3); }
  M.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const body = W.shadows(new THREE.Mesh(M.geometry, coat)); grp.add(body);
  const ears = [];
  for (const s of [-1, 1]) { const E = sdfMesh(earSDF(s), { min: [-0.05, -0.01, -0.03], max: [0.05, 0.13, 0.03], step: 0.004, occ: false });
    const ec = new Float32Array(E.geometry.attributes.position.count * 3).fill(0.42); E.geometry.setAttribute('color', new THREE.BufferAttribute(ec, 3));
    const ear = W.shadows(new THREE.Mesh(E.geometry, coat)); const piv = new THREE.Group(); piv.position.set(s * 0.055, 0.49, 0.38); piv.rotation.set(-0.25, 0, -s * 0.35); piv.add(ear); grp.add(piv); ears.push(piv); }
  const dark = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.25 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.019, 24, 16), dark); nose.scale.set(1.2, 0.9, 0.8); nose.position.set(0, 0.425, 0.615); grp.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 14), dark); e.position.set(s * 0.042, 0.465, 0.49); grp.add(e); }
  if (occAt) grp.userData.bake = () => { grp.updateMatrixWorld(true); grp.traverse((m) => { if (m.isMesh && m.geometry.attributes.normal) bakeOcc(m, occAt, { floor: 0.05 }); }); grp.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); occify(m.material); } }); };
  // breathing + ear twitches: a pure function of t
  grp.userData.update = (t) => {
    body.scale.set(1, 1 + 0.012 * Math.sin(t * TAU / 3.1), 1 + 0.004 * Math.sin(t * TAU / 3.1));
    ears.forEach((e, i) => { let tw = 0; for (let k = 0; k < 40; k++) { const tk = k * 3.7 + i * 1.3 + 0.9 * Math.sin(k * 12.9898 + i); tw += Math.exp(-((t - tk) ** 2) / 0.004) * (k % 3 === 0 ? 1 : 0); } e.rotation.x = -0.25 - tw * 0.35; });
  };
  grp.userData.ears = ears;
  return grp;
}

// ================================================================== MOUNTAIN CAVE
// A limestone cliff on a dry mountainside with a low cave mouth (stone lip) facing +z, a goat path winding down to
// a valley, and the cave chamber inside: five sleepers as cloaked shapes, the dog at the threshold, an oil lamp.
// Far below in the valley (for the opener/closer): a walled garden, two waters meeting, a village wall, an iron
// barrier between two peaks (props.vista, with slim light rays, off by default).
// time: 'bluehour' | 'dusk' | 'sunrise' | 'day' (day: props.setDay(p) moves the sun morning (0) -> evening (1),
// sweeping the sunlit patch across the cave walls) | 'night'. Lessons 0, 1, 2, 16.
export async function mountain_cave({ time = 'day', seed = 18, sleepers = 5, dog = true, lamp = true, vista = true, day = 0.35 } = {}) {
  const dayMode = time === 'day';
  const extra = dayMode ? { hdri: 'goegap', background: 'sky', sun: { elev: 30, azim: 60 }, sunI: 4.2, sunColor: 0xfff0d8, envI: 0.9, exposure: 0.9, fog: 0.0012,
    sky: { zenith: 0x3a6ab0, hazeH: 0.45 }, fogColor: 0xc8c0b0 } : { fog: time === 'bluehour' ? 0.0016 : 0.0013 };
  const S = await base('mountain_cave', dayMode ? 'day' : time, { shadowBox: 30, focus: [0, 2, -5], shadowFar: 500, ...extra });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1), n3 = noise3(seed + 2);
  // --- the mountain: shelf at y = 0 before the mouth, a steep step behind (inside the rock), ridge crest at z = -45, valley at y = -180
  const pathX = (z) => 7 + 14 * Math.sin((z - 9) / 38) + 5 * Math.sin(z / 13);
  const peaks = (x, z) => 190 * Math.exp(-(((x + 372) / 55) ** 2 + ((z - 640) / 70) ** 2)) + 190 * Math.exp(-(((x + 288) / 55) ** 2 + ((z - 640) / 70) ** 2)) - 120 * Math.exp(-(((x + 330) / 18) ** 2 + ((z - 640) / 90) ** 2));
  const Hm = (x, z) => {
    const ax = Math.abs(x), stepK = 1 - sstep(20, 36, ax);
    let h = 15 * sstep(-1.5, -8, z) * stepK + (0.85 * Math.max(0, -8 - z) - 1.6 * Math.max(0, -45 - z)) + 6 * (1 - stepK) * sstep(4, -20, z);
    h += -180 * sstep(6, 380, z);
    h += 9 * W.fbm(n, x / 70, z / 70, 5) * sstep(10, 60, Math.hypot(x, z)) + 4 * W.ridged(n2, x / 30, z / 30, 4) * sstep(25, 80, Math.hypot(x, z)) * sstep(380, 120, z);
    h += 120 * sstep(500, 1100, Math.abs(x)) * (0.6 + 0.4 * W.ridged(n2, x / 200, z / 200, 4)) + 160 * sstep(800, 1150, z) * (0.5 + 0.5 * W.ridged(n, x / 180, z / 180, 4));
    h += peaks(x, z) + 30 * sstep(-60, -200, z) * W.fbm(n2, x / 90, z / 90, 4);
    return h;
  };
  const caveMask = (x, z) => 1 - sstep(0.85, 1.05, Math.hypot(x / 7.4, (z + 7.2) / 8.4));
  const shelfMask = (x, z) => (1 - sstep(0.8, 1.15, Math.hypot(x / 17, (z - 3.5) / 7.5))) * sstep(-2.6, -1.2, z);
  const pathK = (x, z) => (z > 8 && z < 260) ? (1 - sstep(0.7, 1.7, Math.abs(x - pathX(z)))) * sstep(8, 12, z) : 0;
  const Hfloor = (x, z) => 0.05 * n(x * 0.7, z * 0.7) - 0.02;
  const H = (x, z) => {
    let h = Hm(x, z);
    h = lerp(h, Hfloor(x, z), Math.max(shelfMask(x, z), caveMask(x, z)));
    const pk = pathK(x, z); if (pk) h = lerp(h, Hm(pathX(z), z) - 0.15, pk * 0.85);
    return h;
  };
  const terrMat = occify(await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3.0, tint: 0xf2e6d4 }, { name: 'rocky_terrain', tile: 4.5, tint: 0xf4ecdc }, { name: 'brown_mud_dry', tile: 2.4, tint: 0xe8d8c0 }], { macro: 0.22 }));
  const T = W.terrain({ size: 2400, seg: 640, warp: 0.1, height: H, material: terrMat,
    weights: (x, z, h, sl) => { const rock = sstep(0.16, 0.38, sl), floor = Math.max(caveMask(x, z), pathK(x, z) * 1.2, (1 - sstep(4, 7, Math.hypot(x, z - 1.5))) * 0.9);
      return [(1 - rock) * (1 - floor), rock * 1.3, floor * 1.5]; } });
  add(S, T.mesh);
  // --- the cliff + cave as one SDF rock mass (limestone with strata ledges), meshed with marching tetrahedra
  const faceZ = (x, y) => -1.4 - 0.05 * y + 0.5 * Math.sin(x * 0.21 + 1.3) + 0.35 * Math.sin(x * 0.53);
  const sdRBox = (x, y, z, bx, by, bz, r) => { const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
  const rockSDF = (x, y, z, col) => {
    const ax = Math.abs(x), top = Math.max(col.hm + 1.4, (12 + 2.2 * n(x * 0.08, 3.3)) * (1 - sstep(15, 25, ax)));
    let d = z - faceZ(x, y);
    d = smax(d, y - top, 1.2);                                                // rounded top: a 12 m cliff band, then the slope
    d = smax(d, col.hf - 1.3 - y, 0.3);                                       // cut off under the ground
    d = smax(d, ax - 25 + 3 * Math.sin(y * 0.3 + z * 0.2), 2.5);             // ends of the outcrop
    const vb = smin(sdEll(x, y - 1.35, z + 8.2, 6.3, 2.85, 6.1), sdEll(x * 1.05, y - 0.45, z + 1.4, 3.1, 1.55, 4.4), 1.3);
    if (d > -3 && d < 3) d += 0.55 * fbm3(n3, x / 3.2, y / 2.4, z / 3.2, 4) + 0.22 * Math.sin(y * 2.2 + 2 * n3(x * 0.2, y * 0.6, z * 0.2)) * sstep(0.5, -0.5, z - faceZ(x, y) - 1.5);
    if (vb < 1.3) d = smax(d, -(vb + 0.3 * fbm3(n3, x / 1.6 + 9, y / 1.4, z / 1.6, 3)), 0.45);
    const lip = sdRBox(x, y + 0.06, z - 0.35, 3.0, 0.08, 1.0, 0.12);          // the worn stone lip at the threshold (top at y = 0.14)
    return lip < 0.4 ? smin(d, lip + 0.018 * n3(x * 3, y * 3, z * 3), 0.2) : Math.min(d, lip);
  };
  rockSDF.column = (x, z) => ({ hm: Hm(x, z), hf: H(x, z) });
  const ROCK = sdfMesh(rockSDF, { min: [-30, -2.6, -22], max: [30, 24, 4.2], step: 0.2, ground: H, reach: 26 });
  const rockMat = await triMat('rocky_terrain', { tile: 4.5, tint: 0xf3eadb, normal: 1.25, strata: 0.38, strataTint: 0xbfae94, macro: 0.3, occ: 'attr' });
  const cliff = W.shadows(new THREE.Mesh(ROCK.geometry, rockMat)); cliff.name = 'cliff'; add(S, cliff);
  // occlusion on the terrain inside the box (cave floor, shelf under the overhang)
  { const g = T.mesh.geometry, p = g.attributes.position, nr = g.attributes.normal, o = new Float32Array(p.count).fill(1), P = V3(), N = V3();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (x < -30 || x > 30 || z < -22 || z > 12) continue; P.set(x, p.getY(i), z); N.fromBufferAttribute(nr, i); o[i] = ROCK.occAt(P, N); }
    g.setAttribute('occ', new THREE.BufferAttribute(o, 1)); }
  // --- inside: sleepers in a row, the lamp, the dog on the lip
  const woolM = (await MATS.wool()).clone(); woolM.color.set(0x5e5044);
  const sleeperList = [];
  for (let i = 0; i < sleepers; i++) { const x = -4 + i * 2.0, z = -9.2 + 0.5 * Math.sin(i * 1.7), sl = sleeper(woolM, { seed: seed + i * 3, len: 0.95 + 0.06 * Math.sin(i * 2.3), mirror: i % 2 ? 1 : -1 });
    sl.position.set(x, H(x, z), z); sl.rotation.y = 0.12 * Math.sin(i * 3.1) + (i % 2 ? 0.05 : -0.05); add(S, sl); bakeOcc(sl, ROCK.occAt, { floor: 0.03 }); occify(sl.material); sleeperList.push(sl); }
  S.updaters.push((t, o) => sleeperList.forEach((sl, i) => { sl.userData.U.breath.value = (o.breath ?? 1) * 0.03 * Math.sin(t * TAU / (4.6 + i * 0.37) + i * 1.9); }));
  let lampObj = null;
  if (lamp) { lampObj = oilLamp(S, { seed: 5, light: time === 'day' ? 0.4 : 1.6, dist: 10 }); add(S, lampObj, 1.4, H(1.4, -3.4) + 0.01, -3.4); lampObj.rotation.y = 0.5; }
  let dogObj = null;
  if (dog) { dogObj = dogMesh(ROCK.occAt); dogObj.position.set(-0.9, 0.14, 0.42); dogObj.rotation.y = 0.12; add(S, dogObj); dogObj.userData.bake(); S.updaters.push((t) => dogObj.userData.update(t)); }
  // --- outside: boulders, scree, thorn scrub; the goat path stays clear
  const clear = (x, z) => !(Math.abs(x) < 26 && z < 1.5 && z > -24) && Math.hypot(x, z - 1) > 5 && !pathK(x, z) && Math.hypot(x - pathX(z), 0) > 2;
  add(S, await W.groundCover({ heightAt: H, focus: [3, 12], radius: 30, seed: seed + 21, pebbles: 900, rocks: 90, tuftN: 260, boulders: 40, tuftColor: 0xb0a070, rockTint: 0xe8dcc8,
    area: (x, z) => clear(x, z) ? 1 : 0 }));
  add(S, await W.scatter('shrub_02', W.scatterPoints({ seed: seed + 5, count: 90, rect: [-90, 4, 90, 160], heightAt: H, s: [0.35, 0.8], sink: 0.05, area: (x, z) => clear(x, z) ? 0.7 : 0 }), { lod: { focus: [0, 10], far: 70 }, tint: 0xc8c0a0 }));
  add(S, await W.scatter('namaqualand_boulder_02', W.scatterPoints({ seed: seed + 7, count: 70, rect: [-140, 6, 140, 260], heightAt: H, s: [0.4, 1.6], sink: 0.3, minDist: 6, area: (x, z) => clear(x, z) ? 0.6 : 0 }), { lod: { focus: [0, 10], far: 60 }, tint: 0xf0e4d0 }));
  add(S, await W.scatter('dry_branches_medium_01', W.scatterPoints({ seed: seed + 8, count: 24, rect: [-30, 4, 30, 50], heightAt: H, s: [0.5, 1.0], area: (x, z) => clear(x, z) ? 1 : 0 })));
  // --- the valley far below: the four places of the series (small, in haze)
  const V = {};
  if (vista) {
    const hv = (x, z) => H(x, z);
    const [mud, wash] = await Promise.all([MATS.mudPlaster(), MATS.whitewash()]);
    // walled garden of palms with green beds
    const GX = -150, GZ = 360, gy = hv(GX, GZ), garden = new THREE.Group(); garden.name = 'vista_garden';
    for (const [w, d, x, z] of [[64, 1.2, 0, -22], [64, 1.2, 0, 22], [1.2, 44, -32, 0], [1.2, 44, 32, 0]]) { const b = W.rbox(w, 2.6, d, mud, { r: 0.2 }); b.position.set(x, 0, z); garden.add(b); }
    const green = new THREE.Mesh(new THREE.PlaneGeometry(62, 42, 1, 1).rotateX(-Math.PI / 2), await W.pbr('leafy_grass', { tile: 4, res: 1024, tint: 0xb8d090 })); green.position.y = 0.06; garden.add(green);
    for (let i = 0; i < 18; i++) { const p = W.datePalm({ seed: seed + 40 + i, height: 9 + (i % 4) }); p.position.set(-28 + (i % 6) * 11 + (i % 2) * 3, 0, -17 + Math.floor(i / 6) * 17); garden.add(p); }
    garden.position.set(GX, gy, GZ); add(S, garden); V.garden = garden;
    // two waters meeting (a basin in the valley floor with the two-colour sea material)
    const SX = 140, SZ = 470, sy = hv(SX, SZ) + 0.6;
    const sea = seaMat({ colA: 0x2a9a9a, colB: 0x5a6a34, seam: { a: [1, 0, 0, -SX], b: [0.05, 0.02, 2, 0.4] }, tile: 14, opacity: 1 });
    const seaMesh = new THREE.Mesh(waterSheet({ rect: [SX - 160, SZ - 80, SX + 160, SZ + 80], seg: [120, 60], y: sy }), sea); add(S, seaMesh); S.updaters.push((t) => sea.userData.update(t)); V.seas = seaMesh;
    // the village wall with houses behind it
    const VX = 250, VZ = 320, vy = hv(VX, VZ), village = new THREE.Group(); village.name = 'vista_village';
    village.add(Object.assign(W.rbox(46, 3.4, 1.4, mud, { r: 0.2 }), {})); 
    for (let i = 0; i < 9; i++) { const hgt = 3.5 + (i % 3) * 1.2, b = W.rbox(6 + (i % 2) * 2, hgt, 6, i % 3 ? mud : wash, { r: 0.15 }); b.position.set(-20 + i * 5, 0, -6 - (i % 3) * 5); village.add(b); }
    village.position.set(VX, vy, VZ); village.rotation.y = -0.3; add(S, village); V.village = village;
    // the iron barrier in the gap between the two peaks
    const BX = -330, BZ = 640, by = hv(BX, BZ), bar = new THREE.Mesh(W.boxUV(new THREE.BoxGeometry(46, 70, 6, 8, 16, 2)), ironPBR({ tile: 3 }));
    bar.position.set(BX, by + 30, BZ); add(S, W.shadows(bar)); V.barrier = bar;
    // one slim ray of light per place (k = 0 by default; the film fades them up with ray.userData.update(t, k))
    V.rays = [[GX, gy, GZ], [SX, sy, SZ], [VX, vy, VZ], [BX, by + 20, BZ]].map(([x, y, z]) => { const r = W.lightShaft({ from: [x + 40, y + 260, z - 60], to: [x, y, z], r0: 1.5, r1: 9, color: 0xffe0b0, op: 0.12 }); r.userData.update(0, 0); add(S, r); return r; });
  }
  // --- light: the sun (setDay), a shaft through the mouth, a warm bounce from the sunlit floor patch, dust motes
  const sun = S.atmo.sun, target = V3(0, 1, -6);
  const shaft = W.lightShaft({ from: [0, 0, 0], to: [0, -1, 0], r0: 0.9, r1: 1.4, color: 0xfff0d0, op: 0.06 }); add(S, shaft);
  const bounce = new THREE.PointLight(0xffc89a, 0, 9, 2); add(S, bounce);
  const dust = motes({ count: 1600, box: [-4, 0, -12, 4, 3.2, 1.5] }); add(S, dust);
  const mouth = V3(0, 1.0, 0.6);
  const setDay = (p) => {
    p = clamp(p);
    const elev = 9 + 30 * Math.sin(Math.PI * p), azim = lerp(28, 152, p), d = dirFrom(elev, azim);
    if (dayMode) {
      sun.position.copy(target).addScaledVector(d, 250); sun.target.position.copy(target); sun.target.updateMatrixWorld();
      sun.color.set(0xffb878).lerp(new THREE.Color(0xfff2e0), Math.sin(Math.PI * p)); sun.intensity = 4.2 * (0.7 + 0.3 * Math.sin(Math.PI * p));
      if (S.atmo.sky) { S.atmo.sky.userData.u.sunD.value.copy(d); S.atmo.sky.userData.u.sunC.value.copy(sun.color); }
    }
    const sd = dayMode ? d : S.atmo.sunDir;
    // where the sun's ray through the mouth lands on the floor
    const hit = sd.y > 0.02 ? mouth.clone().addScaledVector(sd, -mouth.y / sd.y) : mouth.clone().add(V3(0, -1, -3));
    const inside = sstep(-0.3, -1.6, hit.z) * (sd.y > 0.02 ? 1 : 0) * (dayMode || time === 'sunrise' || time === 'dusk' ? 1 : 0);
    const len = mouth.distanceTo(hit);
    shaft.position.copy(mouth); shaft.quaternion.setFromUnitVectors(V3(0, -1, 0), hit.clone().sub(mouth).normalize()); shaft.scale.set(1, Math.max(0.01, len), 1); shaft.visible = inside > 0.01;
    shaft.userData.k = inside;
    bounce.position.copy(hit).add(V3(0, 0.4, 0)); bounce.intensity = 26 * inside * sun.intensity / 4.2;
    const U = dust.userData.U; U.ao.value.copy(mouth); U.ad.value.copy(hit.clone().sub(mouth).normalize()); U.k.value = inside;
  };
  setDay(day);
  S.updaters.push((t, o) => { if (o.day !== undefined) setDay(o.day); shaft.userData.update(t, (o.shaft ?? 1) * (shaft.userData.k ?? 0)); dust.userData.update(t); });
  // blue-hour / sunrise mist crawling over the rocks below the shelf
  const mist = mistLayer({ rect: [-120, 6, 120, 200], y: 1.2, layers: 3, gap: 1.6, color: time === 'bluehour' ? 0x9aa6c8 : 0xe8d8c8, op: time === 'bluehour' || time === 'sunrise' ? 0.22 : 0, heightAt: (x, z) => H(x, z) });
  add(S, mist); S.updaters.push((t, o) => mist.userData.update(t, o.mist ?? 1));
  const y0 = 0;
  const cameras = {
    hero:      { pos: [2.4, 0.55, 7.8], look: [0, 1.2, -1], fov: 42 },                          // low outside: the mouth in the cliff, the lip, the dog
    mouth_out: { pos: [0.3, 1.0, -8.2], look: [0, 0.9, 6], fov: 56 },                           // from deep inside, looking out of the rough arch
    interior:  { pos: [-1.6, 1.55, -2.2], look: [0, 0.25, -9.4], fov: 50 },                     // the sleepers in a row
    sleepers:  { pos: [1.2, 0.75, -6.2], look: [-0.6, 0.3, -9.4], fov: 40 },
    threshold: { pos: [1.5, 0.45, 2.4], look: [-0.8, 0.35, -0.1], fov: 36 },                    // the dog on the stone lip
    path:      { pos: [pathX(34) + 2.5, H(pathX(34) + 2.5, 34) + 1.7, 34], look: [0, 3, -1], fov: 40 },
    ridge:     { pos: [-34, Hm(-34, -16) + 3, -16], look: [-90, -160, 420], fov: 44 },          // along the ridge, the valley below
    vista:     { pos: [12, 4, 14], look: [-20, -175, 430], fov: 34 },                           // down to the four places
  };
  const slots = { youth_1: [pathX(14), H(pathX(14), 14), 14, Math.PI + 0.3], youth_2: [pathX(17), H(pathX(17), 17), 17, Math.PI + 0.3], youth_3: [pathX(20), H(pathX(20), 20), 20, Math.PI + 0.2],
    youth_4: [pathX(23), H(pathX(23), 23), 23, Math.PI + 0.2], youth_5: [pathX(26), H(pathX(26), 26), 26, Math.PI + 0.1] };
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.6; slots[`sit_${i + 1}`] = [Math.cos(a) * 1.7, y0, -5.5 + Math.sin(a) * 1.7, Math.atan2(-Math.cos(a), -Math.sin(a))]; }
  const props = { cliff, terrain: T, sleepers: sleeperList, dog: dogObj, lamp: lampObj, shaft, bounce, dust, mist, vista: V, setDay, pathX, sky: S.atmo.sky, stars: S.atmo.stars, sun, occAt: ROCK.occAt };
  return finish(S, 'mountain_cave', cameras, props, slots, { bloom: 0.2, bloomThreshold: 0.88 });
}
export const SETS = { mountain_cave };
