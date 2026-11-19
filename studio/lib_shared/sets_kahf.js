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
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
let RECT_INIT = false;
function rectLight(color, intensity, w, h) { if (!RECT_INIT) { RectAreaLightUniformsLib.init(); RECT_INIT = true; } return new THREE.RectAreaLight(color, intensity, w, h); }
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
  (more.slotsParent ?? S.group).add(W.peopleSlots(slots));
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
uniform float tileInv, nsc, strata, macro, aoTex, desat; uniform vec3 strataTint; varying vec3 vTW; varying vec3 vTN;
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
  tcol = mix(tcol, vec3(dot(tcol, vec3(0.3, 0.55, 0.15))), desat);
  diffuseColor.rgb *= tcol;
`;
const TRI_NORM = `
  { vec3 nX = texture2D(normalMap, tp.zy).xyz * 2. - 1., nY = texture2D(normalMap, tp.xz).xyz * 2. - 1., nZ = texture2D(normalMap, tp.xy).xyz * 2. - 1.;
    nX.xy *= nsc; nY.xy *= nsc; nZ.xy *= nsc;
    vec3 wX = vec3(nX.xy + tN0.zy, abs(nX.z) * tN0.x), wY = vec3(nY.xy + tN0.xz, abs(nY.z) * tN0.y), wZ = vec3(nZ.xy + tN0.xy, abs(nZ.z) * tN0.z);
    vec3 wn = normalize(wX.zyx * triW.x + wY.xzy * triW.y + wZ.xyz * triW.z);
    normal = normalize((viewMatrix * vec4(wn, 0.)).xyz); }
`;
export async function triMat(name, { tile = 4, tint = 0xffffff, normal = 1, rough = 1, strata = 0, strataTint = 0xb8a890, macro = 0.25, res = 2048, occ = null, aoTex = 0.85, desat = 0 } = {}) {
  const T = await W.pbrMaps(name, res);
  const m = new THREE.MeshStandardMaterial({ map: T.map, normalMap: T.nor, roughnessMap: T.arm, roughness: rough, metalness: 0, color: tint });
  const U = { tileInv: { value: 1 / tile }, nsc: { value: normal }, strata: { value: strata }, strataTint: { value: new THREE.Color(strataTint) }, macro: { value: macro }, aoTex: { value: aoTex }, desat: { value: desat } };
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
    for (let d = 0; d < 2600; d++) { const cx = r() * N, cy = r() * N, rr = 3 + r() * 7;        // hammer dents
      for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const q = 1 - (i * i + j * j) / (rr * rr); if (q > 0) { const o = ((Math.floor(cy + j) + N) % N) * N + ((Math.floor(cx + i) + N) % N); H[o] -= q * q * 0.18; } } }
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
// fine fur: perturbs the shading normal with oriented high-frequency 3-D noise (world space, no uvs needed)
export function furify(m, { scale = 380, amp = 0.35 } = {}) {
  const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (s, r) => { prev?.call(m, s, r);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFurP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFurP = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vFurP; float fh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float fn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(mix(fh(i), fh(i+vec3(1,0,0)), f.x), mix(fh(i+vec3(0,1,0)), fh(i+vec3(1,1,0)), f.x), f.y), mix(mix(fh(i+vec3(0,0,1)), fh(i+vec3(1,0,1)), f.x), mix(fh(i+vec3(0,1,1)), fh(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 q = vFurP * vec3(${scale.toFixed(1)}, ${(scale * 0.25).toFixed(1)}, ${(scale * 0.25).toFixed(1)}); float e = 0.35;
        vec3 g = vec3(fn(q + vec3(e,0,0)) - fn(q - vec3(e,0,0)), fn(q + vec3(0,e,0)) - fn(q - vec3(0,e,0)), fn(q + vec3(0,0,e)) - fn(q - vec3(0,0,e)));
        normal = normalize(normal + (viewMatrix * vec4(g, 0.)).xyz * ${amp.toFixed(3)}); }`);
  };
  m.customProgramCacheKey = () => (key0 ? key0() : '') + '|fur';
  return m;
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
export function seaMat({ colA = 0x2aa8a8, colB = 0x5a6a3a, seam = null, foam = 0.6, rough = 0.06, tile = 7, flow = [0.012, 0.006], opacity = 0.94, shallow = 0x9ad8c8, envI = 0.55 } = {}) {
  const nm = W.water(new THREE.PlaneGeometry(1, 1)).material.normalMap.clone(); nm.needsUpdate = true; nm.repeat.set(1 / tile, 1 / tile);
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: rough, metalness: 0, normalMap: nm, transparent: opacity < 1, opacity, ior: 1.33, envMapIntensity: envI, specularIntensity: 0.6 });
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
        float sf = foamK * smoothstep(0.06, 0.0, vDepth) * smoothstep(0.35, 0.75, sn1(vSW.xz * 1.4 + vec2(time * 0.25, time * 0.1)) + 0.25 * sin(time * 0.8 + vSW.x * 0.3));
        diffuseColor.rgb = mix(c, vec3(0.92, 0.95, 0.92), clamp(fz * 0.8 + sf * 0.7, 0., 1.));
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
    [[0.07, 0.09, 0.24], [0.08, 0.04, 0.53], 0.034, 0.028], [[-0.07, 0.09, 0.24], [-0.075, 0.04, 0.54], 0.034, 0.028],   // forelegs stretched out (taper)
    [[0, 0.24, 0.24], [0, 0.32, 0.38], 0.07, 0.058],                                                                    // neck, carried forward
    [[0, 0.37, 0.49], [0, 0.345, 0.62], 0.04, 0.024],                                                                   // muzzle, tapering to the nose
    [[0.12, 0.04, -0.24], [0.13, 0.03, 0.0], 0.03, 0.024], [[-0.12, 0.04, -0.24], [-0.13, 0.03, 0.0], 0.03, 0.024],     // hind feet tucked forward
    [[-0.04, 0.05, -0.46], [0.08, 0.03, -0.58], 0.024, 0.017], [[0.08, 0.03, -0.58], [0.22, 0.025, -0.5], 0.017, 0.01], // tail curled on the ground
  ];
  const ells = [
    [0, 0.17, -0.06, 0.12, 0.13, 0.36], [0, 0.2, 0.18, 0.115, 0.16, 0.15], [0.09, 0.12, -0.3, 0.085, 0.11, 0.15], [-0.09, 0.12, -0.3, 0.085, 0.11, 0.15],
    [0.08, 0.024, 0.57, 0.036, 0.024, 0.055], [-0.075, 0.024, 0.58, 0.036, 0.024, 0.055], [0, 0.385, 0.42, 0.068, 0.066, 0.085],
  ];
  const capT = (x, y, z, a, b, ra, rb) => { const pax = x - a[0], pay = y - a[1], paz = z - a[2], bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)); return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - lerp(ra, rb, h); };
  return (x, y, z) => {
    let d = 1e3;
    for (const [cx, cy, cz, rx, ry, rz] of ells) d = smin(d, sdEll(x - cx, y - cy, z - cz, rx, ry, rz), 0.04);
    for (const [a, b, ra, rb] of caps) d = smin(d, capT(x, y, z, a, b, ra, rb), 0.03);
    return smax(d, -y + 0.004, 0.01);                                           // flat on the ground
  };
}
// upright pointed ear: a thin ellipsoid cut to a point by two slanted planes, cupped at the front
function earSDF() { return (x, y, z) => { let d = sdEll(x, y - 0.05, z, 0.038, 0.07, 0.013); d = smax(d, Math.abs(x) * 0.93 + (y - 0.11) * 0.37, 0.006); return smax(d, -sdEll(x, y - 0.045, z + 0.014, 0.026, 0.055, 0.011), 0.004); }; }
function dogMesh(occAt) {
  const grp = new THREE.Group(); grp.name = 'dog';
  const coat = furify(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, sheen: 0.15, sheenRoughness: 0.9, sheenColor: new THREE.Color(0x6a4a28) }), { scale: 300, amp: 1.1 });
  const M = sdfMesh(dogSDF(), { min: [-0.26, -0.01, -0.68], max: [0.26, 0.52, 0.7], step: 0.007, occ: false });
  const p = M.geometry.attributes.position, col = new Float32Array(p.count * 3), n = noise3(9);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const saddle = sstep(0.17, 0.3, y) * sstep(0.3, -0.05, z), muzzle = sstep(0.55, 0.63, z) * sstep(0.3, 0.38, y), belly = 1 - sstep(0.06, 0.16, y);
    const k = 1 + 0.1 * n(x * 30, y * 30, z * 30) + 0.12 * n(x * 7 + 3, y * 7, z * 7);
    const c = [0.34, 0.19, 0.08].map((v, q) => v * k * (1 - 0.35 * saddle - 0.45 * muzzle) + belly * [0.12, 0.08, 0.04][q]);
    col.set(c, i * 3); }
  M.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const body = W.shadows(new THREE.Mesh(M.geometry, coat)); grp.add(body);
  const ears = [];
  for (const s of [-1, 1]) { const E = sdfMesh(earSDF(), { min: [-0.05, -0.01, -0.03], max: [0.05, 0.13, 0.03], step: 0.0035, occ: false });
    const ec = new Float32Array(E.geometry.attributes.position.count * 3); for (let q = 0; q < ec.length; q += 3) ec.set([0.26, 0.14, 0.06], q); E.geometry.setAttribute('color', new THREE.BufferAttribute(ec, 3));
    const ear = W.shadows(new THREE.Mesh(E.geometry, coat)); const piv = new THREE.Group(); piv.position.set(s * 0.048, 0.43, 0.405); piv.rotation.set(-0.2, s * 0.35, -s * 0.28); piv.add(ear); grp.add(piv); ears.push(piv); }
  const dark = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.25 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.019, 24, 16), dark); nose.scale.set(1.2, 0.9, 0.8); nose.position.set(0, 0.352, 0.642); grp.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 14), dark); e.position.set(s * 0.036, 0.4, 0.49); grp.add(e); }
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
  const rockMat = await triMat('rocky_terrain', { tile: 4.5, tint: 0xf3eadb, normal: 1.25, strata: 0.38, strataTint: 0xbfae94, macro: 0.3, occ: 'attr', desat: 0.55 });
  const cliff = W.shadows(new THREE.Mesh(ROCK.geometry, rockMat)); cliff.name = 'cliff'; add(S, cliff);
  // occlusion on the terrain inside the box (cave floor, shelf under the overhang)
  { const g = T.mesh.geometry, p = g.attributes.position, nr = g.attributes.normal, o = new Float32Array(p.count).fill(1), P = V3(), N = V3();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (x < -30 || x > 30 || z < -22 || z > 12) continue; P.set(x, p.getY(i), z); N.fromBufferAttribute(nr, i); o[i] = ROCK.occAt(P, N); }
    g.setAttribute('occ', new THREE.BufferAttribute(o, 1)); }
  // --- inside: sleepers in a row, the lamp, the dog on the lip
  const woolM = (await MATS.wool()).clone(); woolM.color.set(0xb4a288);
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
  const bounce = new THREE.PointLight(0xffc89a, 0, 10, 1.6); add(S, bounce);
  // the bright opening lights the cave: a soft shadow-casting spot from outside, so only what the opening sees is lit
  const mouthGlow = new THREE.SpotLight(dayMode ? 0xf0e2cc : time === 'bluehour' || time === 'night' ? 0x6a78a8 : 0xffc890, 1, 0, 0.62, 1, 1.35);
  mouthGlow.position.set(0, 1.1, 5.5); mouthGlow.target.position.set(0, 0.2, -9); mouthGlow.castShadow = true; mouthGlow.shadow.mapSize.set(1024, 1024); mouthGlow.shadow.bias = -0.0004; mouthGlow.shadow.radius = 6;
  add(S, mouthGlow); add(S, mouthGlow.target);
  const fill = new THREE.PointLight(0xffd8b0, { day: 3.4, sunrise: 1.4, dusk: 1.2, bluehour: 0.5, night: 0.3 }[time] ?? 1, 13, 1.2); fill.position.set(0, 2.6, -6.5); add(S, fill);   // light bounced off the sunlit floor near the mouth
  const glowI = { day: 60, sunrise: 34, dusk: 30, bluehour: 12, night: 5 }[time] ?? 28; mouthGlow.intensity = glowI;
  const dust = motes({ count: 1600, box: [-4, 0, -12, 4, 3.2, 1.5] }); add(S, dust);
  const mouth = V3(0, 1.0, 0.6);
  const setDay = (p) => {
    p = clamp(p);
    const elev = 5 + 14 * Math.sin(Math.PI * p), azim = lerp(24, 156, p), d = dirFrom(elev, azim);
    if (dayMode) {
      sun.position.copy(target).addScaledVector(d, 250); sun.target.position.copy(target); sun.target.updateMatrixWorld();
      sun.color.set(0xffa860).lerp(new THREE.Color(0xfff0d8), Math.sin(Math.PI * p)); sun.intensity = 4.2 * (0.75 + 0.25 * Math.sin(Math.PI * p));
      if (S.atmo.sky) { S.atmo.sky.userData.u.sunD.value.copy(d); S.atmo.sky.userData.u.sunC.value.copy(sun.color); }
    }
    const sd = dayMode ? d : S.atmo.sunDir;
    mouthGlow.intensity = glowI * (dayMode ? 0.75 + 0.25 * Math.sin(Math.PI * p) : 1);
    // where the sun's ray through the mouth lands on the floor
    const hit = sd.y > 0.02 ? mouth.clone().addScaledVector(sd, -mouth.y / sd.y) : mouth.clone().add(V3(0, -1, -3));
    const inside = sstep(-0.3, -1.6, hit.z) * (sd.y > 0.02 ? 1 : 0) * (dayMode || time === 'sunrise' || time === 'dusk' ? 1 : 0);
    const len = mouth.distanceTo(hit);
    shaft.position.copy(mouth); shaft.quaternion.setFromUnitVectors(V3(0, -1, 0), hit.clone().sub(mouth).normalize()); shaft.scale.set(1, Math.max(0.01, len), 1); shaft.visible = inside > 0.01;
    shaft.userData.k = inside;
    bounce.position.copy(hit).add(V3(0, 1.8, -1.5)); bounce.intensity = 1.2 * inside * sun.intensity / 4.2;
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
    mouth_out: { pos: [0.3, 1.0, -8.2], look: [0, 0.9, 6], fov: 56, exposure: 1.5 },                           // from deep inside, looking out of the rough arch
    interior:  { pos: [-1.6, 1.55, -2.2], look: [0, 0.25, -9.4], fov: 50, exposure: 3.6 },                     // the sleepers in a row
    sleepers:  { pos: [1.2, 0.75, -6.2], look: [-0.6, 0.3, -9.4], fov: 40, exposure: 4.2 },
    threshold: { pos: [0.1, 0.36, 2.75], look: [-0.85, 0.32, 0.55], fov: 34 },                    // the dog on the stone lip
    path:      { pos: [pathX(34) + 2.5, H(pathX(34) + 2.5, 34) + 1.7, 34], look: [0, 3, -1], fov: 40 },
    ridge:     { pos: [-34, Hm(-34, -16) + 3, -16], look: [-90, -160, 420], fov: 44 },          // along the ridge, the valley below
    vista:     { pos: [12, 25, 10], look: [-40, -175, 420], fov: 40 },                           // down to the four places
  };
  const slots = { youth_1: [pathX(14), H(pathX(14), 14), 14, Math.PI + 0.3], youth_2: [pathX(17), H(pathX(17), 17), 17, Math.PI + 0.3], youth_3: [pathX(20), H(pathX(20), 20), 20, Math.PI + 0.2],
    youth_4: [pathX(23), H(pathX(23), 23), 23, Math.PI + 0.2], youth_5: [pathX(26), H(pathX(26), 26), 26, Math.PI + 0.1] };
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.6; slots[`sit_${i + 1}`] = [Math.cos(a) * 1.7, y0, -5.5 + Math.sin(a) * 1.7, Math.atan2(-Math.cos(a), -Math.sin(a))]; }
  const props = { cliff, terrain: T, sleepers: sleeperList, dog: dogObj, lamp: lampObj, shaft, bounce, dust, mist, vista: V, setDay, pathX, sky: S.atmo.sky, stars: S.atmo.stars, sun, occAt: ROCK.occAt };
  return finish(S, 'mountain_cave', cameras, props, slots, { bloom: 0.2, bloomThreshold: 0.88 });
}

// ------------------------------------------------------------------ grapevines on trellises (lush or collapsed)
function grapeLeafTexture() {
  return cachedTex('grapeleaf', () => canvasTex(256, 256, (x) => {
    x.translate(128, 140); const path = new Path2D();
    for (let i = 0; i <= 200; i++) { const a = -Math.PI / 2 + (i / 200) * TAU, lob = 1 + 0.22 * Math.cos(5 * (a + Math.PI / 2)) - 0.18 * Math.pow(Math.max(0, Math.cos(a + Math.PI / 2)), 24);
      const tooth = 1 + 0.025 * Math.sin(a * 46), r = 104 * lob * tooth * (0.9 + 0.1 * Math.sin(a)); const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.95;
      i ? path.lineTo(px, py) : path.moveTo(px, py); }
    path.closePath();
    const gr = x.createRadialGradient(0, 0, 10, 0, 0, 120); gr.addColorStop(0, '#6a8040'); gr.addColorStop(1, '#3e5a24'); x.fillStyle = gr; x.fill(path);
    x.save(); x.clip(path); const rr = W.rng(4); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${rr() < 0.5 ? '30,50,15' : '140,160,80'},${0.05 + rr() * 0.08})`; x.beginPath(); x.arc(-120 + rr() * 240, -120 + rr() * 240, 2 + rr() * 9, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(190,205,140,0.3)'; x.lineWidth = 2.2;
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + Math.PI + (k - 2) * 0.75; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 110, -Math.sin(a) * 100); x.stroke();
      x.lineWidth = 1.2; for (let s = 1; s < 5; s++) { const bx = Math.cos(a) * s * 22, by = -Math.sin(a) * s * 20; for (const side of [-1, 1]) { x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(a + side * 0.9) * 22, by - Math.sin(a + side * 0.9) * 22); x.stroke(); } } x.lineWidth = 3; }
    x.restore();
  }));
}
// rows of pergola trellis with vines; ruined = posts fallen, beams on the ground, withered leaves, rotted grapes
async function vineyard({ rows = [[0, 0]], len = 21, width = 2.4, h = 2.15, gap = 3, seed = 1, ruined = false, heightAt = () => 0 } = {}) {
  const r = W.rng(seed), n = W.noise2(seed + 3), grp = new THREE.Group(); grp.name = ruined ? 'vineyard_ruined' : 'vineyard';
  const pl = (await MATS.planks()).clone(); pl.color.set(ruined ? 0xb8b0a4 : 0xa88a6a);
  const bark = new THREE.MeshStandardMaterial({ color: ruined ? 0x7a6a5a : 0x5a4232, roughness: 0.9, normalMap: fibreNormal(7), normalScale: new THREE.Vector2(0.6, 0.6) });
  const postG = [], beamG = [], caneG = [], leafM = [], bunchP = [], hangs = [];
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), up = V3(0, 1, 0);
  const pole = (a, b, rad) => { const d = b.clone().sub(a), L = d.length(), g = W.boxUV(new THREE.CylinderGeometry(rad * 0.9, rad, L, 14, Math.max(2, Math.ceil(L * 3))));
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 0.012 * Math.sin(y * 5 + seed)); }
    g.computeVertexNormals(); g.applyMatrix4(M4.compose(a.clone().add(b).multiplyScalar(0.5), Q.setFromUnitVectors(up, d.normalize()), V3(1, 1, 1))); return g; };
  const tube = (pts, rad, tw = 1) => { const c = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(c, Math.max(8, pts.length * 6), rad, 8, false);
    const p = g.attributes.position, nr = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const k = 1 - uv.getX(i) * 0.55 * tw; p.setXYZ(i, p.getX(i) - nr.getX(i) * rad * (1 - k), p.getY(i) - nr.getY(i) * rad * (1 - k), p.getZ(i) - nr.getZ(i) * rad * (1 - k)); }
    g.computeVertexNormals(); return g; };
  const leavesAlong = (pts, dens = 9, hang = 0.0) => { const c = new THREE.CatmullRomCurve3(pts), L = c.getLength(), N = Math.ceil(L * dens);
    for (let i = 0; i < N; i++) { const p = c.getPoint((i + r()) / N); leafM.push({ p: p.add(V3((r() - 0.5) * 0.3, (r() - 0.35) * 0.22 - hang * r(), (r() - 0.5) * 0.3)), s: 0.11 + r() * 0.08, a: r() * TAU, tilt: 0.3 + r() * 0.9 }); } };
  for (const [rx, rz] of rows) {
    const np = Math.round(len / gap) + 1, z0 = rz - len / 2;
    const tops = [[], []];
    for (const side of [0, 1]) for (let i = 0; i < np; i++) {
      const x = rx + (side ? width / 2 : -width / 2), z = z0 + i * gap, y0 = heightAt(x, z), base = V3(x, y0 - 0.3, z);
      let dir = V3(0, 1, 0), hh = h + 0.3 + (r() - 0.5) * 0.08;
      if (ruined) { const fallen = r() < 0.65, ang = fallen ? 1.15 + r() * 0.35 : 0.2 + r() * 0.5, az = (side ? 1 : -1) * (0.4 + r() * 1.2) + (r() < 0.3 ? Math.PI / 2 : 0);
        dir = V3(Math.sin(ang) * Math.cos(az), Math.cos(ang), Math.sin(ang) * Math.sin(az)); }
      let top = base.clone().addScaledVector(dir, hh);
      if (top.y < heightAt(top.x, top.z) + 0.07) { top.y = heightAt(top.x, top.z) + 0.07; }
      postG.push(pole(base, top, 0.065)); tops[side].push(top);
    }
    // beams along both sides, cross-beams at every post, rigid lengths
    const beam = (a, b) => { let e = b; if (ruined) { const d = b.clone().sub(a); const L = gap * (0.9 + r() * 0.1); e = a.clone().addScaledVector(d.normalize(), L); e.y = Math.max(heightAt(e.x, e.z) + 0.06, e.y - r() * 1.2); } beamG.push(pole(a, e, 0.045)); return e; };
    for (const side of [0, 1]) for (let i = 0; i + 1 < np; i++) beam(tops[side][i], tops[side][i + 1]);
    for (let i = 0; i < np; i += ruined ? 2 : 1) beam(tops[0][i], tops[1][i]);
    // vines: a gnarled trunk up every other post, canes along and across the top; leaves, bunches hang under
    for (const side of [0, 1]) for (let i = 0; i < np; i += 1) {
      const top = tops[side][i], x = rx + (side ? width / 2 : -width / 2), z = z0 + i * gap, gy = heightAt(x, z), inw = side ? -1 : 1;
      const trunk = []; for (let k = 0; k <= 8; k++) { const f = k / 8; const p = V3(x + inw * 0.12, gy + f * (h - 0.1), z + 0.1).lerp(top.clone().add(V3(inw * 0.08, -0.08, 0.1)), ruined ? f * f : f > 0.85 ? (f - 0.85) / 0.15 : 0); p.x += 0.05 * Math.sin(f * 9 + i); p.z += 0.05 * Math.cos(f * 7 + i); if (ruined) p.y = Math.max(heightAt(p.x, p.z) + 0.04, p.y); trunk.push(p); }
      caneG.push(tube(trunk, 0.04, 0.6));
      const ends = [i + 1 < np ? tops[side][i + 1] : null, tops[1 - side][i]].filter(Boolean);
      for (const e of ends) {
        const pts = []; for (let k = 0; k <= 10; k++) { const f = k / 10, p = top.clone().lerp(e, f); p.y += 0.06 * Math.sin(f * Math.PI) + 0.03 * n(p.x * 3, p.z * 3) - (ruined ? 0.25 * Math.sin(f * Math.PI) : 0); p.x += 0.08 * n(p.z * 2, 3); if (ruined) p.y = Math.max(heightAt(p.x, p.z) + 0.03, p.y); pts.push(p); }
        caneG.push(tube(pts, 0.016, 0.8));
        leavesAlong(pts, ruined ? 4 : 16, ruined ? 0 : 0.25);
        if (!ruined) for (let b = 0; b < 2; b++) { const p = new THREE.CatmullRomCurve3(pts).getPoint(0.2 + 0.6 * r()); bunchP.push(p.add(V3((r() - 0.5) * 0.25, -0.06, (r() - 0.5) * 0.25))); }
        else for (let b = 0; b < 2; b++) { const x2 = lerp(top.x, e.x, r()) + (r() - 0.5) * 0.8, z2 = lerp(top.z, e.z, r()) + (r() - 0.5) * 0.8; bunchP.push(V3(x2, heightAt(x2, z2), z2)); }
      }
    }
  }
  const merge = (gs) => W.BGU.mergeGeometries(gs.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; }));
  grp.add(W.shadows(new THREE.Mesh(merge([...postG, ...beamG]), pl)), W.shadows(new THREE.Mesh(merge(caneG), bark)));
  // leaves (instanced, cupped quads with the lobed texture); colour by health
  const lg = new THREE.PlaneGeometry(1, 1, 4, 4), lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, -0.12 * (x * x + y * y) - (ruined ? 0.25 * x * x : 0)); } lg.computeVertexNormals();
  const lm = new THREE.MeshStandardMaterial({ map: grapeLeafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62 });
  const leaves = new THREE.InstancedMesh(lg, lm, leafM.length), E = new THREE.Euler(), C = new THREE.Color();
  leafM.forEach((L, i) => { let p = L.p; if (ruined) p = V3(p.x + (r() - 0.5) * 0.6, heightAt(p.x, p.z) + 0.02 + r() * 0.08, p.z + (r() - 0.5) * 0.6);
    E.set(-Math.PI / 2 + (ruined ? (r() - 0.5) * 0.6 : L.tilt * (r() < 0.5 ? 1 : -1) * 0.8), L.a, 0, 'YXZ'); M4.compose(p, Q.setFromEuler(E), V3(L.s, L.s * (ruined ? 0.75 : 1), L.s)); leaves.setMatrixAt(i, M4);
    if (ruined) C.setHSL(0.07 + r() * 0.04, 0.35 + r() * 0.2, 0.18 + r() * 0.12); else C.setHSL(0.24 + r() * 0.05, 0.4 + r() * 0.2, 0.32 + r() * 0.16); leaves.setColorAt(i, C); });
  leaves.castShadow = leaves.receiveShadow = true; grp.add(leaves);
  // grape bunches: a tapering cone of berries (instanced spheres with a dusty bloom); ruined = shrivelled heaps on the ground
  const berry = new THREE.SphereGeometry(1, 18, 14), bm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: ruined ? 0.85 : 0.5, sheen: ruined ? 0 : 0.18, sheenColor: new THREE.Color(0x7a7a9a), sheenRoughness: 0.6, clearcoat: ruined ? 0 : 0.15, clearcoatRoughness: 0.6 });
  const per = ruined ? 30 : 90, berries = new THREE.InstancedMesh(berry, bm, bunchP.length * per);
  let q = 0;
  bunchP.forEach((b, bi) => { const L = 0.17 + r() * 0.07, pts = [];
    for (let tries = 0; pts.length < per && tries < per * 40; tries++) {
      const s = ruined ? 0.006 + r() * 0.004 : 0.0085 + r() * 0.003, f = r(), a = r() * TAU;
      let p;
      if (ruined) { const rad = Math.sqrt(r()) * 0.13; p = V3(b.x + Math.cos(a) * rad, b.y + s * 0.6, b.z + Math.sin(a) * rad); }
      else { const rad = (0.055 * (1 - f * 0.8) + 0.008) * Math.sqrt(0.35 + 0.65 * r()); p = V3(b.x + Math.cos(a) * rad, b.y - f * L, b.z + Math.sin(a) * rad); }
      if (pts.some((o) => o.p.distanceTo(p) < (o.s + s) * 0.92)) continue;
      pts.push({ p, s });
    }
    for (const { p, s } of pts) { M4.compose(p, Q.identity(), V3(s, ruined ? s * 0.6 : s * 1.06, s)); berries.setMatrixAt(q, M4);
      if (ruined) C.setHSL(0.05 + r() * 0.04, 0.4, 0.07 + r() * 0.06); else C.setRGB(0.05 + r() * 0.03, 0.012 + r() * 0.008, 0.045 + r() * 0.03); berries.setColorAt(q++, C); }
    if (!ruined) { hangs.push(b); caneG.push(tube([b.clone().add(V3(0, 0.06, 0)), b.clone(), b.clone().add(V3(0.004, -L * 0.5, 0.003)), b.clone().add(V3(0, -L * 0.9, 0))], 0.0025, 0.5)); }
  });
  berries.count = q;
  berries.castShadow = berries.receiveShadow = true; grp.add(berries);
  if (hangs.length) grp.add(W.shadows(new THREE.Mesh(merge(caneG.slice(-hangs.length)), bark)));
  grp.userData = { bunches: bunchP, leaves, berries };
  return grp;
}

// ================================================================== TWO GARDENS
// Two adjoining walled gardens in open farmland: mud-brick walls with an arched wooden gate (garden A, front wall),
// a ring of date palms heavy with orange dates, rows of grapevines on wooden pergolas, and between the gardens a
// strip of green barley with a stone-lined stream. state 'ruined' rebuilds the SAME layout ruined: trellises fallen
// flat, vines withered, grapes rotted on the ground, palms brown and bare, the stream bed dry and cracked, flat
// grey dusty light. Lessons 4, 5 (and the vista beat of 16).
export async function two_gardens({ state = 'lush', time = null, seed = 32 } = {}) {
  const ruined = state === 'ruined';
  const S = await base('two_gardens', time ?? (ruined ? 'overcast' : 'day'), ruined ? { fog: 0.0065, fogColor: 0xb8b0a0, sun: { azim: 70 }, exposure: 1.0, envI: 1.1 } : { sun: { azim: 55 }, shadowBox: 46, focus: [0, 0, 4] });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const A = [-21, 0], B = [21, 0], GW = 32, GD = 36;                                   // garden centres + size (x by z)
  const chan = (x, z) => Math.abs(x - 0.6 * Math.sin(z / 9));                         // the stream between the gardens
  const height = (x, z) => 0.12 * n(x / 9, z / 9) + 0.04 * n2(x, z) - 0.55 * (1 - sstep(0.55, 1.25, chan(x, z))) + 14 * sstep(160, 480, Math.hypot(x, z)) * W.fbm(n2, x / 120, z / 120, 4);
  const inside = (x, z, c) => Math.abs(x - c[0]) < GW / 2 - 0.8 && Math.abs(z - c[1]) < GD / 2 - 0.8;
  const mt = await W.terrainMaterial(ruined
    ? [{ name: 'dry_ground_rocks', tile: 3, tint: 0xe0d4c0 }, { name: 'farm_soil', tile: 3.2, tint: 0xc8b8a0 }, { name: 'mud_cracked_dry_03', tile: 2.2 }]
    : [{ name: 'grass_ground', tile: 3.2 }, { name: 'farm_soil', tile: 3.0 }, { name: 'brown_mud_dry', tile: 2.4 }], { macro: 0.2 });
  const T = W.terrain({ size: 1200, seg: 480, warp: 0.14, centre: [0, 4], height, material: mt,
    weights: (x, z) => { const bed = 1 - sstep(0.8, 1.6, chan(x, z)), strip = Math.abs(x) < 5.5 ? 1 : 0, gin = inside(x, z, A) || inside(x, z, B) ? 1 : 0;
      return [(1 - strip) * (ruined ? 1 : 0.6 + 0.4 * gin) + 0.2, strip * (1 - bed) * 1.4 + (gin ? 0.5 * sstep(0.2, 0.6, n(x / 3, z / 3)) : 0), bed * 2 + (1 - gin) * (1 - strip) * 0.4 * sstep(0, 0.5, n2(x / 15, z / 15))]; } });
  add(S, T.mesh);
  const hy = (x, z) => height(x, z);
  // walls (mud brick over a stone plinth, rounded coping) with the arched gate in garden A's front wall
  const [mud, stone, pl, dpl] = await Promise.all([MATS.mudPlaster(), MATS.rustic(), MATS.planks(), MATS.darkPlanks()]);
  const WH = 2.7, WT = 0.55, GATE = [A[0], A[1] + GD / 2], GATEW = 2.6;
  const wallSeg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ry = Math.atan2(-(z1 - z0), x1 - x0);
    const g = new THREE.Group(), pl0 = W.rbox(L + 0.1, 0.6, WT + 0.12, stone, { r: 0.05 }), body = W.rbox(L, WH - 0.6, WT, mud, { r: 0.08, seg: 3 }); body.position.y = 0.6;
    const cop = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(WT / 2 + 0.04, WT / 2 + 0.04, L, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2)), mud); cop.position.y = WH;
    g.add(pl0, body, W.shadows(cop)); g.position.set(cx, hy(cx, cz) - 0.08, cz); g.rotation.y = ry; add(S, g); return g; };
  const walls = [];
  for (const C of [A, B]) { const x0 = C[0] - GW / 2, x1 = C[0] + GW / 2, z0 = C[1] - GD / 2, z1 = C[1] + GD / 2;
    walls.push(wallSeg(x0, z0, x1, z0), wallSeg(x0, z0, x0, z1), wallSeg(x1, z0, x1, z1));
    if (C === A) { walls.push(wallSeg(x0, z1, GATE[0] - GATEW / 2 - 0.5, z1), wallSeg(GATE[0] + GATEW / 2 + 0.5, z1, x1, z1)); }
    else walls.push(wallSeg(x0, z1, x1, z1)); }
  // the arched gate: two piers, an arch (extruded), double plank doors, the threshold stone
  const gate = new THREE.Group(), gy = hy(...GATE);
  for (const s of [-1, 1]) { const p = W.rbox(1.0, 3.3, 0.9, mud, { r: 0.1, seg: 3 }); p.position.set(s * (GATEW / 2 + 0.5), 0, 0); gate.add(p); }
  { const sh = new THREE.Shape(); sh.moveTo(-GATEW / 2 - 1, 2.2); sh.lineTo(GATEW / 2 + 1, 2.2); sh.lineTo(GATEW / 2 + 1, 3.9); sh.lineTo(-GATEW / 2 - 1, 3.9); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(GATEW / 2, 2.15); hole.absarc(0, 2.25, GATEW / 2, 0, Math.PI, false); hole.lineTo(-GATEW / 2, 2.15); hole.closePath(); sh.holes.push(hole);
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 48 }); ag.translate(0, 0, -0.45); W.boxUV(ag);
    gate.add(W.shadows(new THREE.Mesh(ag, mud))); }
  const leaves = [];
  for (const s of [-1, 1]) { const D = W.door(pl, W.ironMat(), { w: GATEW / 2 - 0.02, h: 2.2, t: 0.08, frame: 0.001, studs: true }); D.group.position.set(s * GATEW / 4, 0, 0.05); D.group.scale.x = -s; D.leaf.rotation.y = ruined ? 0.35 : 1.25; gate.add(D.group); leaves.push(D); }
  const thr = W.rbox(GATEW + 0.3, 0.16, 1.0, await MATS.stone(), { r: 0.04, seg: 3 }); thr.position.set(0, -0.06, 0.1); gate.add(thr);
  gate.position.set(GATE[0], gy - 0.05, GATE[1]); add(S, W.shadows(gate));
  // date palms ringing each garden (growth.js palms; 5 shapes cloned)
  const palmProto = [];
  for (let k = 0; k < 5; k++) { const tr = GR.makeTree(THREE, { species: 'date_palm', seed: seed + k * 7 }); tr.set(1, ruined ? 1 : 0.8); const o = tr.object3d;
    o.traverse((m) => { if (m.isInstancedMesh && m.material && m.material.side === THREE.DoubleSide) { m.material = m.material.clone(); m.material.roughness = 0.68; m.material.color.set(ruined ? 0x9a7448 : 0xe6e2b0);
      if (ruined && m.instanceColor) { const a = m.instanceColor.array; for (let q = 0; q < a.length; q += 3) { const l = (a[q] + a[q + 1] + a[q + 2]) / 3; a[q] = l * 1.1; a[q + 1] = l * 0.85; a[q + 2] = l * 0.55; } m.instanceColor.needsUpdate = true; } } });
    palmProto.push(o); }
  const palms = [];
  for (const C of [A, B]) { const per = 2 * (GW + GD) - 8, N = 22;
    for (let i = 0; i < N; i++) { let s = (i + 0.5) / N * per, x, z; const hw = GW / 2 - 2.2, hd = GD / 2 - 2.2;
      if (s < 2 * hw) { x = -hw + s; z = -hd; } else if ((s -= 2 * hw) < 2 * hd) { x = hw; z = -hd + s; } else if ((s -= 2 * hd) < 2 * hw) { x = hw - s; z = hd; } else { s -= 2 * hw; x = -hw; z = hd - s; }
      x += C[0]; z += C[1]; if (C === A && Math.abs(x - GATE[0]) < 3.5 && z > C[1] + hd - 1) continue;
      const o = palmProto[(i + (C === A ? 0 : 2)) % 5].clone(true), sc = 1.65 + 0.35 * Math.sin(i * 2.7 + C[0]);
      o.position.set(x, hy(x, z) - 0.05, z); o.rotation.y = i * 1.37; o.scale.setScalar(sc); add(S, o); palms.push(o); } }
  // grapevines: three pergola rows per garden
  const vines = [];
  for (const C of [A, B]) { const v = await vineyard({ rows: [[C[0] - 7.5, C[1]], [C[0], C[1]], [C[0] + 7.5, C[1]]], len: 21, seed: seed + C[0], ruined, heightAt: hy }); add(S, v); vines.push(v); }
  // the barley strip and the stone-lined stream
  const crops = [];
  for (const [x0, x1] of [[-5.2, -1.3], [1.3, 5.2]]) { const c = W.cropField({ rect: [x0, -GD / 2, x1, GD / 2 + 30], count: ruined ? 9000 : 26000, seed: seed + x0 * 10 | 0, heightAt: hy, h: ruined ? [0.12, 0.28] : [0.65, 0.95], ripe: ruined ? 1.1 : 0.08, rows: 0.28, wind: ruined ? 0.25 : 0.8 });
    if (ruined) c.material.color = new THREE.Color(0x9a8a70); add(S, c); crops.push(c); }
  S.updaters.push((t) => crops.forEach((c) => c.userData.update(t)));
  const bankRocks = []; for (let z = -60; z < 60; z += 0.42) for (const s of [-1, 1]) { const x = 0.6 * Math.sin(z / 9) + s * (0.95 + 0.08 * n(z, s)); bankRocks.push({ x, y: hy(x, z) + 0.02, z: z + 0.1 * n(z * 3, 1), s: 2.2 + 1.2 * Math.abs(n(z * 2, s)), ry: z * 3, rx: 0.2, rz: 0.1 }); }
  add(S, await W.scatter('rock_09', bankRocks, { tint: ruined ? 0xd8ccb8 : 0xc8bca8, matte: true }));
  let stream = null;
  if (!ruined) { const pts = []; for (let z = -70; z <= 70; z += 1) pts.push([0.6 * Math.sin(z / 9), z]);
    const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [], dp = [];
    pts.forEach(([x, z], i) => { for (const s of [-1, 1]) { pos.push(x + s * 0.95, -0.22, z); uv.push(s, z); dp.push(0.3); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('depth', new THREE.Float32BufferAttribute(dp, 1)); g.setIndex(idx); g.computeVertexNormals();
    const wm = seaMat({ colA: 0x3a5a4a, colB: 0x3a5a4a, shallow: 0x5a7a62, foam: 0, tile: 1.6, flow: [0, -0.25], opacity: 0.9 }); stream = new THREE.Mesh(g, wm); stream.receiveShadow = true; add(S, stream); S.updaters.push((t) => wm.userData.update(t)); }
  // dust in the air over the ruin
  const haze = ruined ? mistLayer({ rect: [-60, -40, 60, 60], y: 0.6, layers: 3, gap: 1.2, color: 0xc8bca8, op: 0.18, speed: [0.6, 0.1], scale: 0.08 }) : null;
  if (haze) { add(S, haze); S.updaters.push((t, o) => haze.userData.update(t, o.dust ?? 1)); }
  // fields + farmland beyond, a few farm palms
  for (let i = 0; i < 14; i++) { const a = i * 0.7 + 1, d = 70 + (i % 5) * 25, x = Math.cos(a) * d, z = -Math.abs(Math.sin(a)) * d - 30; const o = palmProto[i % 5].clone(true); o.position.set(x, hy(x, z), z); o.scale.setScalar(1.6); add(S, o); }
  // the hero bunch for the macro (lush): the lowest bunch nearest the gate path in garden A
  const bunches = vines[0].userData.bunches; let hb = bunches[0];
  for (const b of bunches) if (Math.hypot(b.x - (A[0] - 7.5 + 1.2), b.z - (A[1] + 9)) < Math.hypot(hb.x - (A[0] - 7.5 + 1.2), hb.z - (A[1] + 9))) hb = b;
  const cameras = {
    hero:    { pos: [8, 46, 66], look: [0, 0, 2], fov: 46 },                                              // aerial: both gardens, the barley strip and the stream
    gate:    { pos: [GATE[0] + 0.4, gy + 0.42, GATE[1] + 1.4], look: [GATE[0] - 0.3, gy + 1.5, GATE[1] - 8], fov: 50 },   // from the threshold stone into the garden
    gate_out:{ pos: [GATE[0] + 3.2, gy + 1.6, GATE[1] + 9], look: [GATE[0], gy + 2.0, GATE[1]], fov: 42 },
    stream:  { pos: [0.5, hy(0.5, 34) + 0.9, 34], look: [0, 0.4, 0], fov: 44 },                           // low glide along the stream
    grapes:  { pos: [hb.x + 0.28, hb.y - 0.05, hb.z + 0.3], look: [hb.x, hb.y - 0.11, hb.z], fov: 32 },   // macro on one bunch
    trellis: { pos: [A[0] + 0.2, hy(A[0], A[1] + 12) + 1.5, A[1] + 12], look: [A[0], 1.6, A[1] - 6], fov: 52 },
    palms:   { pos: [A[0] + 9, 1.2, A[1] - 11], look: [A[0] + 13, 8, A[1] - 16], fov: 50 },
  };
  const slots = { owner_gate: [GATE[0] + 0.3, gy, GATE[1] + 0.9, Math.PI], friend_gate: [GATE[0] - 1.6, gy, GATE[1] + 1.8, 2.6], owner_ruin: [A[0], hy(A[0], A[1] + 2), A[1] + 2, Math.PI], friend_ruin: [A[0] + 2.4, hy(A[0] + 2.4, A[1] + 7), A[1] + 7, 2.8] };
  return finish(S, 'two_gardens', cameras, { gate, gateLeaves: leaves, walls, palms, vines, crops, stream, terrain: T, heroBunch: hb, sun: S.atmo.sun }, slots);
}

// all builders by name (for the gallery and lesson films)


// ------------------------------------------------------------------ the shared pure-function wind (JS + GLSL agree)
// strength 0..1 -> a gusting field over x,z moving downwind (+x, slightly +z). Used by the barley and the chaff.
export const WIND_DIR = [0.94, 0.34];
export function windAt(x, z, t, strength = 1) {
  const along = x * WIND_DIR[0] + z * WIND_DIR[1];
  const gust = 0.55 + 0.45 * Math.sin(t * 0.9 - along * 0.045) * Math.sin(t * 0.37 - along * 0.018 + 1.3);
  return strength * gust * (0.75 + 0.25 * Math.sin(t * 2.3 - along * 0.21 + z * 0.17));
}
const WIND_GLSL = `
  vec2 WIND_DIR = vec2(0.94, 0.34);
  float windAt(vec2 xz, float t, float s){ float along = dot(xz, WIND_DIR);
    float gust = 0.55 + 0.45 * sin(t * 0.9 - along * 0.045) * sin(t * 0.37 - along * 0.018 + 1.3);
    return s * gust * (0.75 + 0.25 * sin(t * 2.3 - along * 0.21 + xz.y * 0.17)); }`;

// one barley plant (3 stalks per tuft): stems, leaves, awned ears; attribute 'part' = 1 on the ear
function barleyTuftGeometry(seed = 3) {
  const r = W.rng(seed), parts = [];
  const tag = (g, part) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    n.setAttribute('part', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count).fill(part), 1)); return n; };
  for (let k = 0; k < 3; k++) {
    const ox = (r() - 0.5) * 0.06, oz = (r() - 0.5) * 0.06, h = 0.82 + r() * 0.18, lean = (r() - 0.5) * 0.12;
    const stem = new THREE.CylinderGeometry(0.0028, 0.0042, h, 6, 10, true).translate(0, h / 2, 0), sp = stem.attributes.position;
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / h; sp.setX(i, sp.getX(i) + lean * y * y * h + ox); sp.setZ(i, sp.getZ(i) + oz + 0.03 * y * y); }
    parts.push(tag(stem, 0));
    for (const [y0, a] of [[0.22, r() * 6], [0.45, r() * 6], [0.62, r() * 6]]) { const L = 0.26 + r() * 0.08, lf = new THREE.PlaneGeometry(0.014, L, 1, 6).translate(0, L / 2, 0), lp = lf.attributes.position;
      for (let i = 0; i < lp.count; i++) { const y = lp.getY(i) / L; lp.setX(i, lp.getX(i) * (1 - y * 0.85)); lp.setZ(i, y * y * 0.14); }
      lf.rotateX(-0.45); lf.rotateY(a); lf.translate(ox + lean * y0 * y0 * h, y0 * h, oz); parts.push(tag(lf, 0)); }
    // the ear: two rows of plump spikelets on a nodding tip, long awns
    const top = V3(ox + lean * h, h, oz + 0.03);
    for (let q = 0; q < 16; q++) { const side = q % 2 ? 1 : -1, t = q / 16, g = new THREE.SphereGeometry(0.0055, 7, 5).scale(1, 2.1, 0.8);
      g.rotateZ(side * 0.32); g.translate(top.x + side * 0.0045, top.y + t * 0.075, top.z + t * t * 0.02); parts.push(tag(g, 1));
      const awn = new THREE.CylinderGeometry(0.00045, 0.0003, 0.11, 3, 1).translate(0, 0.055, 0); awn.rotateZ(side * 0.18); awn.rotateX(0.12); awn.translate(top.x + side * 0.006, top.y + 0.008 + t * 0.075, top.z + t * t * 0.02); parts.push(tag(awn, 1)); }
  }
  const geo = W.BGU.mergeGeometries(parts); geo.computeVertexNormals();
  return geo;
}
// a barley field whose whole life is setStage-driven: grow (0..1), ripe (0 green, 0.5 gold, 1 brown), wind 0..1,
// broken (0..1: stalks snap and their tops are carried off, leaving stubble). All per-instance timing is seeded.
function barleyField({ rect, count, seed = 7, heightAt, focus = [0, 0] }) {
  const geo = barleyTuftGeometry(seed), r = W.rng(seed + 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, side: THREE.DoubleSide });
  const U = { time: { value: 0 }, grow: { value: 1 }, ripe: { value: 0 }, wind: { value: 0.2 }, broken: { value: 0 }, wet: { value: 0 } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
      uniform float time, grow, ripe, wind, broken, wet; attribute float part; attribute vec4 aR; varying vec3 vPC; varying float vH;
      ${WIND_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float delay = aR.z, gi = clamp((grow - delay * 0.35) / 0.65, 0., 1.), ge = 1. - (1. - gi) * (1. - gi);
        float yy = clamp(position.y, 0., 1.2);
        float head = smoothstep(0.62, 0.92, gi);
        // the ear forms late: until heading it is folded into the top of the stem
        if (part > 0.5) { vec3 c = vec3(position.x, 0.9, position.z); transformed = mix(c + (transformed - c) * 0.05, transformed, head); }
        transformed.y *= ge * aR.y; transformed.xz *= mix(0.45, 1., ge);
        // snapping: tops above 45 % fold and shrink into the break as the chaff leaves
        float bt = 0.06 + aR.x * 0.85, bk = clamp((broken - bt) / 0.08, 0., 1.);
        float cut = 0.38 * aR.y;
        if (transformed.y > cut) { vec3 b = vec3(transformed.x * 0.3, cut, transformed.z * 0.3); vec3 rel = transformed - b;
          float fold = smoothstep(0., 0.5, bk) * 1.4; rel = vec3(rel.x + rel.y * sin(fold) , rel.y * cos(fold), rel.z);
          transformed = b + rel * (1. - smoothstep(0.4, 1., bk)); }
        vH = yy;
        float rk = clamp(ripe + (aR.x - 0.5) * 0.18, 0., 1.);
        vec3 green = vec3(0.13, 0.26, 0.05), gold = vec3(0.62, 0.48, 0.18), brown = vec3(0.3, 0.2, 0.1);
        vPC = rk < 0.5 ? mix(green, gold, rk * 2.) : mix(gold, brown, rk * 2. - 1.);
        if (part > 0.5) vPC = mix(vPC, vPC * vec3(1.15, 1.1, 0.8) + vec3(0.04, 0.03, 0.), 0.6);
        vPC *= mix(0.35, 1., smoothstep(0., 0.7, yy)) * mix(1., 0.75, wet);`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        { vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          float w = windAt(ip, time, wind) * (1.2 - 0.4 * ge) + (aR.w - 0.5) * 0.35 * ge;      // gusts + the tangle of a grown stand
          float k = vH * vH * mix(1.2, 0.7, ripe);
          mvPosition.xz += (WIND_DIR * w * 0.32 + vec2(sin(time * 3.1 + ip.x) , cos(time * 2.7 + ip.y)) * 0.012 * wind) * k;
          mvPosition.y -= abs(w) * 0.08 * k; }
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPC; varying float vH;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vPC;');
  };
  mat.customProgramCacheKey = () => 'barley2';
  const im = new THREE.InstancedMesh(geo, mat, count), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), aR = new Float32Array(count * 4), tops = [];
  for (let i = 0; i < count; i++) {
    // denser near the focus
    let x, z; do { x = lerp(rect[0], rect[2], r()); z = lerp(rect[1], rect[3], r()); } while (r() > 0.35 + 0.65 * Math.exp(-Math.hypot(x - focus[0], z - focus[1]) / 25));
    Q.setFromAxisAngle(V3(0, 1, 0), r() * TAU); M.compose(V3(x, heightAt(x, z) - 0.01, z), Q, V3(1, 1, 1)); im.setMatrixAt(i, M);
    aR.set([r(), 0.85 + r() * 0.3, r(), r()], i * 4); tops.push([x, z, aR[i * 4]]);
  }
  im.geometry.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4));
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.name = 'barley';
  im.userData = { U, tops };
  return im;
}
// straw chaff carried downwind: each bit leaves a broken stalk top at that stalk's break stage and flies on the wind
function chaff({ tops, count = 7000, seed = 9, heightAt }) {
  const r = W.rng(seed), g = new THREE.PlaneGeometry(0.035, 0.008, 2, 1), a = new Float32Array(count * 4), o = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { const t = tops[Math.floor(r() * tops.length)]; o.set([t[0], heightAt(t[0], t[1]) + 0.55, t[1]], i * 3); a.set([0.06 + t[2] * 0.85 + r() * 0.03, 0.6 + r() * 0.8, r() * 100, r()], i * 4); }
  const ig = new THREE.InstancedBufferGeometry().copy(g); ig.instanceCount = count;
  ig.setAttribute('aO', new THREE.InstancedBufferAttribute(o, 3)); ig.setAttribute('aC', new THREE.InstancedBufferAttribute(a, 4));
  const U = { time: { value: 0 }, broken: { value: 0 }, wind: { value: 0 } };
  const m = new THREE.MeshStandardMaterial({ color: 0xb89a62, roughness: 0.85, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\nuniform float time, broken, wind; attribute vec3 aO; attribute vec4 aC;\n${WIND_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float age = (broken - aC.x) * 60.;                          // stage -> seconds of flight
        float alive = step(0., age) * (1. - smoothstep(18., 26., age));
        float sp = time * (3. + aC.w * 4.) + aC.z;
        mat3 rot = mat3(cos(sp), sin(sp), 0., -sin(sp), cos(sp), 0., 0., 0., 1.) * mat3(1., 0., 0., 0., cos(sp * 0.7), sin(sp * 0.7), 0., -sin(sp * 0.7), cos(sp * 0.7));
        transformed = rot * transformed * alive;
        float a = max(age, 0.);
        vec3 drift = vec3(WIND_DIR.x, 0., WIND_DIR.y) * (a * 2.2 * aC.y + a * a * 0.06) + vec3(0., sin(a * 0.9 + aC.z) * 0.6 + a * 0.12 * aC.y, 0.) + vec3(sin(a * 1.7 + aC.z), 0., cos(a * 1.3 + aC.z)) * 0.25;
        transformed += aO + drift;`);
  };
  m.customProgramCacheKey = () => 'chaff1';
  const mesh = new THREE.Mesh(ig, m); mesh.frustumCulled = false; mesh.castShadow = false; mesh.userData.U = U; mesh.name = 'chaff';
  return mesh;
}
// rain streaks (pure in t) in a box; k = 0..1 opacity
function rainStreaks({ box = [-30, 0, -60, 30, 22, 12], count = 9000, seed = 2 } = {}) {
  const r = W.rng(seed), p = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) p.set([lerp(box[0], box[3], r()), lerp(box[2], box[5], r()), r(), 0.7 + r() * 0.6], i * 4);
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(0.006, 0.55).translate(0, 0.275, 0)); g.instanceCount = count; g.setAttribute('aP', new THREE.InstancedBufferAttribute(p, 4));
  const U = { time: { value: 0 }, k: { value: 0 }, y0: { value: box[1] }, hh: { value: box[4] - box[1] } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, y0, hh; attribute vec4 aP; varying float vA;
      void main(){ float y = y0 + hh * (1. - fract(time * 1.25 * aP.w + aP.z)); vec3 c = vec3(aP.x + (hh - y + y0) * 0.06, y, aP.y);
        vec4 mv = viewMatrix * vec4(c, 1.); mv.x += position.x * 1.0; mv.y += position.y; vA = 1.; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float k; void main(){ gl_FragColor = vec4(vec3(0.75, 0.8, 0.85) * 0.22 * k, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.userData.U = U; mesh.name = 'rain';
  return mesh;
}

// ================================================================== RAIN ON PLANTS (the parable of 18:45)
// A wide flat barley plain under a huge sky, scattered stones, one mud-brick field hut far off. Everything is driven
// by props.setStage(p), one continuous time-lapse:
//   0.00-0.14 rain on dry cracked earth, the ground darkens, first green points (the macro seedling: growth.js)
//   0.14-0.42 green stalks thicken, tangle and lean together      0.42-0.55 rain gone, golden sun, ears form
//   0.55-0.75 baked yellow, then brown and brittle, the ground dries   0.75-0.95 wind rises, stalks snap, chaff streams off
//   0.95-1.00 the wind drops: stubble on a bare plain.
// props.setDrop(q) (0..1) is the raindrop for the macro: falls, splashes, leaves a dark wet spot. Lesson 6.
export async function rain_on_plants({ seed = 45, stage = 0.5 } = {}) {
  const S = await base('rain_on_plants', 'overcast', { background: 'sky', sky: { zenith: 0x6a7480, hazeH: 0.6 }, fog: 0.0035, fogColor: 0x8a9096, sun: { elev: 24, azim: 140 }, sunI: 0.6, shadowBox: 40, focus: [0, 0, -14] });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const height = (x, z) => 0.08 * n(x / 8, z / 8) + 0.03 * n2(x * 1.3, z * 1.3) + 8 * sstep(250, 700, Math.hypot(x, z)) * W.fbm(n2, x / 300, z / 300, 3);
  const tm = await W.terrainMaterial([{ name: 'mud_cracked_dry_03', tile: 2.4 }, { name: 'farm_soil', tile: 2.8 }, { name: 'dry_ground_rocks', tile: 3 }], { macro: 0.18 });
  // wetness + far-field vegetation colour (the plain beyond the near plants greens and browns with the stage)
  const GU = { wet: { value: 0 }, veg: { value: 0 }, vegCol: { value: new THREE.Color(0x3a5a1a) } };
  { const prev = tm.onBeforeCompile; tm.onBeforeCompile = (s, r) => { prev(s, r); Object.assign(s.uniforms, GU);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float wet, veg; uniform vec3 vegCol;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= mix(1., 0.3, wet);')
        .replace('diffuseColor.rgb *= col;', 'diffuseColor.rgb *= col; diffuseColor.rgb *= mix(1., 0.5, wet); { float vn = tvn(vWP.xz * 0.6) * 0.5 + tvn(vWP.xz * 0.11) * 0.5; diffuseColor.rgb = mix(diffuseColor.rgb, vegCol * (0.7 + 0.6 * vn), veg * smoothstep(0.2, 0.6, vn + 0.25)); }'); };
    tm.customProgramCacheKey = () => 'terrainWet'; }
  const T = W.terrain({ size: 1600, seg: 460, warp: 0.12, centre: [0, -12], height, material: tm, weights: (x, z) => [0.8 + 0.4 * n(x / 20, z / 20), 0.6 * sstep(-0.2, 0.5, n2(x / 30, z / 30)), 0.25] });
  add(S, T.mesh);
  const field = barleyField({ rect: [-36, -95, 36, 14], count: 52000, seed, heightAt: height, focus: [0, 4] }); add(S, field);
  const bits = chaff({ tops: field.userData.tops, count: 8000, heightAt: height }); add(S, bits);
  const rain = rainStreaks({ box: [-24, 0, -50, 24, 20, 14] }); add(S, rain);
  add(S, await W.scatter('rock_07', W.scatterPoints({ seed: seed + 3, count: 40, rect: [-60, -150, 60, 12], heightAt: height, s: [1.5, 5], sink: 0.15, minDist: 4 }), { tint: 0xd8ccb8, matte: true, lod: { focus: [0, 0], far: 60 } }));
  const hut = await mudHouse({ w: 4.2, d: 3.6, h: 2.6, seed: seed + 2, shutters: false }); hut.rotation.y = 0.6; add(S, hut, 52, height(52, -150) - 0.05, -150);
  // the macro: a seed under cracked earth that germinates, and a raindrop that hits beside it
  const MX = 0.6, MZ = 7.2, my = height(MX, MZ);
  const sd = GR.makeSeed(THREE, { size: 0.012, seed: seed + 4 }); sd.object3d.position.set(MX, my - 0.035, MZ); add(S, sd.object3d);
  const dropM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.9, thickness: 0.004, ior: 1.33, transparent: true });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 32, 24), dropM); add(S, drop);
  const spot = W.contactShadow(0.06, 0.06, { op: 0 }); spot.position.set(MX + 0.012, my + 0.003, MZ + 0.008); add(S, spot);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.6, 1, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xdde8f0, roughness: 0.05, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); add(S, crown);
  const setDrop = (q) => { q = clamp(q); const fall = clamp(q / 0.5), imp = clamp((q - 0.5) / 0.5);
    drop.visible = q < 0.5; drop.position.set(MX + 0.012, my + 0.003 + 0.25 * (1 - fall * fall), MZ + 0.008); drop.scale.set(1, 1 + 0.6 * fall, 1);
    crown.visible = false; const cr = 0.004 + 0.016 * Math.sqrt(imp), ch = 0.006 * Math.sin(Math.PI * Math.min(1, imp / 0.6)); crown.scale.set(cr, ch + 1e-4, cr); crown.position.set(MX + 0.012, my + ch / 2 + 0.002, MZ + 0.008);
    spot.material.opacity = 0.55 * sstep(0.5, 0.7, q) * (1 - 0.3 * sstep(0.8, 1, q)); };
  setDrop(0);
  // stage
  const sky = S.atmo.sky.userData.u, sun = S.atmo.sun, fog = S.scene.fog;
  const C = (h) => new THREE.Color(h);
  const keys = [ // [p, zenith, horizon, fog density, sun I, sun colour, env I]
    [0.0, C(0x5a636c), C(0x7e868c), 0.006, 0.4, C(0xd8dce0), 1.0], [0.14, C(0x5a636c), C(0x7e868c), 0.006, 0.4, C(0xd8dce0), 1.0],
    [0.3, C(0x5a7aa0), C(0xa8b0b0), 0.003, 1.8, C(0xfff0d8), 1.1], [0.5, C(0x3a6aac), C(0xe0c8a0), 0.0018, 3.2, C(0xffd8a0), 1.0],
    [0.75, C(0x5a7aa8), C(0xd8b888), 0.0024, 2.8, C(0xffc888), 0.9], [0.92, C(0x7a8aa0), C(0xc8a880), 0.004, 2.2, C(0xffc080), 0.85], [1.0, C(0x6a86b0), C(0xd8c098), 0.0022, 2.6, C(0xffc888), 0.9] ];
  const kAt = (p) => { let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1], f = sstep(a[0], b[0], p);
    return { zen: a[1].clone().lerp(b[1], f), hor: a[2].clone().lerp(b[2], f), fog: lerp(a[3], b[3], f), sunI: lerp(a[4], b[4], f), sunC: a[5].clone().lerp(b[5], f), env: lerp(a[6], b[6], f) }; };
  const setStage = (p) => {
    p = clamp(p); const k = kAt(p);
    sky.zen.value.copy(k.zen); sky.hor.value.copy(k.hor); sky.gnd.value.copy(k.hor).multiplyScalar(0.7); sky.glow.value = sstep(0.2, 0.45, p);
    fog.color.copy(k.hor); fog.density = k.fog; sun.intensity = k.sunI; sun.color.copy(k.sunC); sky.sunC.value.copy(k.sunC); S.scene.environmentIntensity = k.env;
    const rainK = 1 - sstep(0.12, 0.2, p), wet = sstep(0.0, 0.08, p) * (1 - sstep(0.4, 0.7, p));
    const grow = sstep(0.06, 0.45, p), ripe = sstep(0.5, 0.62, p) * 0.5 + sstep(0.64, 0.76, p) * 0.5, wind = 0.15 + 0.85 * sstep(0.74, 0.8, p) * (1 - sstep(0.93, 0.99, p)), broken = clamp((p - 0.78) / 0.15);
    Object.assign(field.userData.U, {}); const U = field.userData.U; U.grow.value = grow; U.ripe.value = ripe; U.wind.value = wind; U.broken.value = broken; U.wet.value = wet;
    bits.userData.U.broken.value = broken; bits.userData.U.wind.value = wind;
    rain.userData.U.k.value = rainK; GU.wet.value = wet;
    const vegC = ripe < 0.5 ? C(0x3a5a1a).lerp(C(0xa88a40), ripe * 2) : C(0xa88a40).lerp(C(0x7a5e3a), ripe * 2 - 1);
    GU.vegCol.value.copy(vegC); GU.veg.value = 0.85 * sstep(0.12, 0.35, p) * (1 - 0.6 * broken);
    sd.setGerm(sstep(0.02, 0.2, p));
    field.userData.stage = p;
  };
  setStage(stage);
  S.updaters.push((t, o) => { if (o.stage !== undefined) setStage(o.stage); if (o.drop !== undefined) setDrop(o.drop); field.userData.U.time.value = t; bits.userData.U.time.value = t; rain.userData.U.time.value = t; });
  const cameras = {
    hero:   { pos: [2, 1.3, 16], look: [-2, 1.2, -40], fov: 52 },                      // low over the plain, the huge sky
    wide:   { pos: [-6, 4.5, 26], look: [4, 6, -80], fov: 58 },                        // locked-off wide: the empty plain, enormous sky
    field:  { pos: [1.4, 0.75, 9.5], look: [-0.5, 0.55, 2], fov: 44 },                  // in among the stalks
    macro:  { pos: [MX + 0.07, my + 0.035, MZ + 0.09], look: [MX + 0.005, my + 0.012, MZ], fov: 34 },
    hut:    { pos: [10, 1.6, 10], look: [52, 2, -150], fov: 30 },
  };
  return finish(S, 'rain_on_plants', cameras, { field, chaff: bits, rain, seedling: sd, drop, setStage, setDrop, terrain: T, hut, sun, sky: S.atmo.sky }, { }, { bloom: 0.12 });
}


// ------------------------------------------------------------------ the fish (SDF): silver body, darker back, forked tail; +z = head
function fishMesh() {
  const f = (x, y, z) => {
    let d = sdEll(x, y, z, 0.024, 0.04, 0.12);                                                     // body
    d = smin(d, sdEll(x, y - 0.002, z - 0.085, 0.02, 0.03, 0.045), 0.02);                           // head
    const tz = z + 0.135, fork = Math.abs(y) - 0.036 * clamp(-tz / 0.05 + 0.2);
    const tail = smax(smax(Math.abs(x) - 0.0025, -tz - 0.055, 0.004), smax(tz - 0.02, Math.abs(y) - 0.012 - 0.75 * Math.max(0, -tz), 0.004), 0.004);
    d = smin(d, smax(tail, -(fork + 0.008) * 0.3 * (tz < -0.04 ? 1 : 0) , 0.002), 0.01);
    const dors = smax(smax(Math.abs(x) - 0.0018, -(y - 0.03), 0.003), smax(Math.abs(z + 0.01) - 0.035 + (y - 0.03) * 0.6, y - 0.058, 0.004), 0.003);
    return smin(d, dors, 0.006);
  };
  const M = sdfMesh(f, { min: [-0.035, -0.06, -0.2], max: [0.035, 0.07, 0.16], step: 0.0028, occ: false });
  const p = M.geometry.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = sstep(-0.01, 0.03, y); c.set([lerp(0.75, 0.16, k), lerp(0.78, 0.22, k), lerp(0.8, 0.26, k)], i * 3); }
  M.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const m = furify(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.85, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15, iridescence: 0.3 }), { scale: 900, amp: 0.25 });
  const g = new THREE.Group(), body = W.shadows(new THREE.Mesh(M.geometry, m)); g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.1 }));
  for (const s of [-1, 1]) { const e = eye.clone(); e.position.set(s * 0.019, 0.006, 0.105); g.add(e); }
  g.name = 'fish'; return g;
}
// a flat-topped shore rock (SDF, triplanar), top at about h; footprint w x d
async function shoreRock({ w = 3, d = 2.2, h = 0.9, seed = 3, tint = 0xd8d0c4, wet = 0.35 } = {}) {
  const n3 = noise3(seed), f = (x, y, z) => {
    let s = sdEll(x, (y - h * 0.45) * 1.0, z, w / 2, h * 0.75, d / 2);
    s = smax(s, y - h + 0.03 * n3(x * 2, 0, z * 2), 0.12);                                     // flat, worn top
    if (s < 0.4) s += 0.07 * fbm3(n3, x * 1.7, y * 2.2, z * 1.7, 4) + 0.025 * Math.sin(y * 18 + n3(x, y, z) * 3);
    return smax(s, -y - 0.6, 0.05);
  };
  const M = sdfMesh(f, { min: [-w / 2 - 0.4, -0.65, -d / 2 - 0.4], max: [w / 2 + 0.4, h + 0.3, d / 2 + 0.4], step: 0.03, occ: false });
  const m = await triMat('rocky_terrain', { tile: 1.6, tint, normal: 1.4, macro: 0.2, desat: 0.4 });
  // darker wet band near the waterline (vertex colour via onBeforeCompile on world y)
  const prev = m.onBeforeCompile; m.onBeforeCompile = (s2, r) => { prev(s2, r); s2.fragmentShader = s2.fragmentShader.replace('diffuseColor.rgb *= tcol;', `diffuseColor.rgb *= tcol * mix(1., ${(1 - wet).toFixed(2)}, smoothstep(0.35, 0.05, vTW.y));`); };
  m.customProgramCacheKey = () => 'tri1wet';
  return W.shadows(new THREE.Mesh(M.geometry, m));
}

// ================================================================== CONFLUENCE: the meeting of two seas
// A rocky shore where two bands of water meet in a visible, slowly moving seam (clear turquoise to the west,
// murky green to the east), a flat-topped rock at the water's edge with a reed basket, a silver fish, a cloth bag
// and a skin water bottle, wet sand with a double line of footprints, and inland a dusty track across dry plains.
// props.setFish(q): 0 in the basket .. flips out, slides over the wet rock, drops into the sea, darts away (gone by 1).
// time: 'day' (midday glare, lesson 9) | 'golden' (lesson 8 shore). Lessons 8, 9.
export async function confluence({ time = 'day', seed = 60 } = {}) {
  const S = await base('confluence', time, { sun: { azim: time === 'day' ? 115 : 160 }, shadowBox: 22, focus: [0, 0, 2], fog: 0.0011 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const ROCK = [0.5, 1.2], SEAM_X = 2.8;
  // footprints: two walkers coming from the track down to the rock (alternating left/right ellipses, 1.5 cm deep)
  const prints = [];
  for (const [ox, ph] of [[-2.4, 0], [-1.7, 0.35]]) for (let i = 0; i < 46; i++) { const z = 3.0 + i * 0.36 + ph * 0.36, x = ox + 0.35 * Math.sin(z / 6) + (i % 2 ? 0.09 : -0.09); prints.push([x, z, 0.08 * Math.sin(z / 6)]); }
  const fp = (x, z) => { let d = 0; for (const [px, pz, a] of prints) { const dx = x - px, dz = z - pz; if (Math.abs(dz) > 0.2 || Math.abs(dx) > 0.12) continue;
    const u = dx * Math.cos(a) - dz * Math.sin(a), v = dx * Math.sin(a) + dz * Math.cos(a), e = (u / 0.055) ** 2 + (v / 0.13) ** 2; if (e < 1.6) d = Math.min(d, -0.026 * (1 - sstep(0.6, 1.6, e)) + 0.006 * sstep(1.0, 1.4, e) * (1 - sstep(1.4, 1.6, e))); } return d; };
  const shore = (x) => 0.0 + 1.6 * Math.sin(x / 23) + 0.8 * Math.sin(x / 7.3);
  const height = (x, z) => {
    const zz = z - shore(x);
    let h = zz > 0 ? 0.035 * zz + 0.06 * n(x / 6, z / 6) : 0.06 * zz - 0.0012 * zz * zz;             // beach slope / sea floor
    h += sstep(30, 60, zz) * (1.5 + 3 * W.fbm(n2, x / 60, z / 60, 4)) + 30 * sstep(260, 600, Math.hypot(x, z)) * W.ridged(n, x / 200, z / 200, 4) * sstep(-20, 40, zz);
    h += sstep(80, 140, Math.abs(x)) * sstep(-60, 10, zz) * 14 * W.ridged(n2, x / 40, z / 40, 4);   // rocky headlands on both sides
    return h + (zz > 0 && zz < 25 ? fp(x, z) : 0);
  };
  const wetLine = (x, z) => z - shore(x);
  const mt = await W.terrainMaterial([{ name: 'sand_01', tile: 3.2, tint: 0xf4e4c8 }, { name: 'sand_01', tile: 2.6, tint: 0xa89070 }, { name: 'rocky_terrain', tile: 4, tint: 0xd8ccb8 }], { macro: 0.2, normal: 0.8 });
  const T = W.terrain({ size: 1400, seg: 720, warp: 0.035, centre: [-1.5, 4], height, material: mt,
    weights: (x, z, h, sl) => { const zz = wetLine(x, z), rock = sstep(0.2, 0.45, sl) + sstep(70, 120, Math.abs(x)) * sstep(-40, 0, zz) * 0.8; return [sstep(1.2, 4.5, zz) * (1 - rock), (1 - sstep(1.2, 4.5, zz)) * (1 - rock), rock * 1.5 + sstep(40, 80, zz) * 0.6]; } });
  add(S, T.mesh);
  const hy = height;
  // the two seas
  const sea = seaMat({ colA: 0x0a7a8c, colB: 0x34461c, shallow: 0x3aa8a0, seam: { a: [1, 0, 0, -SEAM_X], b: [0.04, 0.02, 3, 0.6] }, foam: 0.7, tile: 6, opacity: 0.95, rough: 0.12, envI: 0.45 });
  const water = new THREE.Mesh(waterSheet({ rect: [-700, -900, 700, 40], seg: [420, 420], y: 0.0, bed: hy }), sea); water.receiveShadow = true; add(S, water); S.updaters.push((t) => sea.userData.update(t));
  // the flat rock, scattered boulders along the shore
  const rock = await shoreRock({ w: 3.0, d: 2.3, h: 0.95, seed }); rock.position.set(ROCK[0], hy(...ROCK) - 0.05, ROCK[1]); rock.rotation.y = 0.3; add(S, rock);
  const top = rock.position.y + 0.95;
  for (const [x, z, s, h] of [[-6, 0.2, 1.6, 0.6], [5.5, -0.8, 1.2, 0.5], [9, 1.4, 2.0, 0.9], [-11, -1.2, 2.4, 1.1], [14, -2, 1.4, 0.7]]) { const b = await shoreRock({ w: 1.6 * s, d: 1.3 * s, h, seed: seed + x | 0 }); b.position.set(x, hy(x, z) - 0.08, z + shore(x)); b.rotation.y = x; add(S, b); }
  add(S, await W.scatter('rock_09', W.scatterPoints({ seed: seed + 4, count: 260, rect: [-30, -6, 30, 10], heightAt: hy, s: [0.4, 2.2], sink: 0.01, area: (x, z) => Math.abs(wetLine(x, z) - 0.5) < 3 && Math.hypot(x - ROCK[0], z - ROCK[1]) > 1.8 ? 0.8 : 0 }), { tint: 0xcfc4b4, matte: true }));
  add(S, await W.groundCover({ heightAt: hy, focus: [0, 18], radius: 30, seed: seed + 7, pebbles: 500, rocks: 30, tuftN: 140, boulders: 20, tuftColor: 0xb8a878, rockTint: 0xe0d4c0, area: (x, z) => wetLine(x, z) > 5 ? 1 : 0 }));
  // on the rock: the reed basket (lid ajar), a cloth bag, a skin water bottle
  const BK = GR.makeBasket(THREE, { radius: 0.17, height: 0.2, seed: 3 }), basket = BK.object3d ?? BK.group ?? BK; basket.position.set(ROCK[0] - 0.35, top - 0.005, ROCK[1] + 0.25); basket.rotation.set(0.04, 0.4, 0.03); add(S, basket); W.shadows(basket);
  let weave = null; basket.traverse((m) => { if (!weave && m.isMesh) weave = m.material; });
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.018, 64), weave); lid.position.set(ROCK[0] - 0.12, top + 0.13, ROCK[1] + 0.36); lid.rotation.set(0.3, 0, -0.75); add(S, W.shadows(lid));
  const hs = await MATS.hessian(), bag = W.sack(hs, { w: 0.42, h: 0.38, seed: 5 }); bag.position.set(ROCK[0] + 0.45, top - 0.02, ROCK[1] - 0.1); bag.rotation.set(0, 1, 0.1); add(S, bag);
  const leather = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.55, normalMap: fibreNormal(4), normalScale: new THREE.Vector2(0.3, 0.3) });
  const skin = W.sack(leather, { w: 0.34, h: 0.42, seed: 8 }); skin.rotation.set(0, 0.3, Math.PI / 2 - 0.15); skin.scale.set(1, 0.7, 0.8); skin.position.set(ROCK[0] + 0.85, top + 0.14, ROCK[1] + 0.35); add(S, skin);
  // the fish: lies in the basket; setFish(q) moves it along a closed-form path into the sea and away
  const fish = fishMesh(); add(S, fish);
  const P0 = V3(ROCK[0] - 0.35, top + 0.16, ROCK[1] + 0.25), P1 = V3(ROCK[0] - 0.55, top + 0.42, ROCK[1] + 0.55), P2 = V3(ROCK[0] - 0.9, top + 0.01, ROCK[1] + 0.85), P3 = V3(ROCK[0] - 1.35, hy(ROCK[0] - 1.6, ROCK[1] + 0.2) + 0.05, ROCK[1] + 0.2);
  const setFish = (q) => {
    q = clamp(q); let p, rx = 0, rz = Math.PI / 2, ry = -2.4;
    if (q < 0.2) { const f = q / 0.2; p = P0.clone().lerp(P1, f).add(V3(0, Math.sin(Math.PI * f) * 0.2, 0)); rz = Math.PI / 2 + f * 3.5; }
    else if (q < 0.45) { const f = (q - 0.2) / 0.25; p = P1.clone().lerp(P2, f); p.y = lerp(P1.y, P2.y, Math.min(1, f * 1.6)) ; rz = Math.PI / 2 + 3.5 + f * 2.8; ry = -2.4 + f * 0.6; }
    else if (q < 0.6) { const f = (q - 0.45) / 0.15; p = P2.clone().lerp(P3, f); p.y = lerp(P2.y, P3.y - 0.25, f * f); rz = Math.PI / 2 + 6.3 - f * 1.2; rx = f * 0.8; ry = -1.8; }
    else { const f = (q - 0.6) / 0.4; p = P3.clone().add(V3(-f * 1.5 + 2.2 * f * f, -0.25 - 0.15 * f, -f * 7 - 8 * f * f)); rz = 0; rx = 0; ry = Math.PI + 0.3 * Math.sin(f * 20); }
    fish.position.copy(p); fish.rotation.set(rx, ry, rz); fish.visible = q < 0.995;
  };
  setFish(0);
  S.updaters.push((t, o) => { if (o.fish !== undefined) setFish(o.fish); });
  // the track inland across the dry plain toward the sea
  const cameras = {
    hero:       { pos: [ROCK[0] - 1.6, top + 0.55, ROCK[1] + 3.6], look: [ROCK[0] + 1.2, top - 0.2, ROCK[1] - 6], fov: 46 },   // the rock, the basket, the seam beyond
    basket:     { pos: [ROCK[0] + 0.25, top + 0.75, ROCK[1] + 1.55], look: [ROCK[0] - 0.55, top + 0.1, ROCK[1] + 0.35], fov: 38 },
    seam:       { pos: [SEAM_X - 1.5, 0.45, -1.2], look: [SEAM_X, 0.0, -80], fov: 40 },                                         // at the water, the two colours meeting
    footprints: { pos: [-0.6, hy(-0.6, 8) + 1.2, 8.5], look: [-2.2, hy(-2.2, 4), 4], fov: 42 },
    track:      { pos: [-14, hy(-14, 70) + 1.7, 70], look: [SEAM_X, 0, -120], fov: 44 },
    wide:       { pos: [12, 9, 26], look: [-2, 0, -20], fov: 46 },
  };
  const slots = { traveller_tall: [ROCK[0] + 0.2, top, ROCK[1] + 0.8, Math.PI + 0.3], traveller_young: [ROCK[0] - 0.9, hy(ROCK[0] - 0.9, ROCK[1] + 1.6), ROCK[1] + 1.6, Math.PI],
    seated_figure: [9, hy(9, 1.4 + shore(9)) + 0.9, 1.4 + shore(9), Math.PI] };
  return finish(S, 'confluence', cameras, { water, sea, rock, basket, lid, bag, skin, fish, setFish, prints, terrain: T, sun: S.atmo.sun }, slots);
}

// ------------------------------------------------------------------ calm sea: sum-of-sines swell, the same function in JS and GLSL
const SWELL = [[0.07, 21, 0.93, 0.36, 0.0], [0.045, 11, -0.4, 0.92, 1.7], [0.028, 5.3, 0.7, -0.71, 3.1], [0.012, 2.1, -0.95, -0.3, 4.4]];   // amp, wavelength, dir x, dir z, phase
export function swellAt(x, z, t, k = 1) { let h = 0, dx = 0, dz = 0;
  for (const [a, L, ux, uz, ph] of SWELL) { const w = TAU / L, c = Math.sqrt(9.81 / w), arg = w * (ux * x + uz * z) - w * c * t + ph; h += a * Math.sin(arg); const d = a * w * Math.cos(arg); dx += d * ux; dz += d * uz; }
  return { h: h * k, dx: dx * k, dz: dz * k }; }
const SWELL_GLSL = `uniform float swellK;
  vec3 swell(vec2 p, float t){ vec3 r = vec3(0.); ${SWELL.map(([a, L, ux, uz, ph]) => { const w = TAU / L, c = Math.sqrt(9.81 / w); return `{ float arg = ${w.toFixed(5)} * dot(vec2(${ux}, ${uz}), p) - ${(w * c).toFixed(5)} * t + ${ph.toFixed(3)}; r.x += ${a} * sin(arg); r.yz += ${(a * w).toFixed(5)} * cos(arg) * vec2(${ux}, ${uz}); }`; }).join(' ')} return r * swellK; }`;
function oceanMaterial(opts) {
  const m = seaMat(opts), prev = m.onBeforeCompile, U = m.userData.U; U.swellK = { value: 1 };
  m.onBeforeCompile = (s, r) => { prev(s, r); s.uniforms.swellK = U.swellK;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;\n' + SWELL_GLSL)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec4 wp0 = modelMatrix * vec4(position, 1.); vec3 sw = swell(wp0.xz, time); objectNormal = normalize(vec3(-sw.y, 1., -sw.z)); }')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 wp1 = modelMatrix * vec4(position, 1.); transformed.y += swell(wp1.xz, time).x; }');
    s.fragmentShader = s.fragmentShader.replace('uniform vec3 colA, colB, shal; uniform float time, foamK;', 'uniform vec3 colA, colB, shal; uniform float foamK; uniform float time;'); };
  m.customProgramCacheKey = () => 'ocean1';
  return m;
}
// a big flat sheet dense near the centre (for water seen from close and to the horizon); depth attribute = 30
function warpedSheet(size = 3000, seg = 360, warp = 0.04, y = 0) {
  const n = seg + 1, half = size / 2, f = (s) => half * (warp * s + (1 - warp) * s * s * s), g = new THREE.PlaneGeometry(1, 1, seg, seg).rotateX(-Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i) * 2), y, f(p.getZ(i) * 2));
  g.setAttribute('depth', new THREE.BufferAttribute(new Float32Array(p.count).fill(30), 1)); g.computeVertexNormals();
  return g;
}
// ------------------------------------------------------------------ a clinker-built wooden boat (double-ender), bow = +z, keel bottom at y = 0
function hullFns({ L = 6.4, B = 1.9, D = 0.8 } = {}) {
  const hb = (u) => B / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 2.2)), 0.6);
  const yk = (u) => 0.1 * Math.pow(Math.abs(2 * u - 1), 2);
  const Du = (u) => D + 0.38 * Math.pow(Math.abs(2 * u - 1), 2.5);
  const pt = (u, v, side = 1) => { const th = v * Math.PI / 2; return V3(side * hb(u) * Math.pow(Math.sin(th), 0.62), yk(u) + Du(u) * Math.pow(1 - Math.cos(th), 0.85), (u - 0.5) * L); };
  const halfAt = (u, y) => { const q = clamp((y - yk(u)) / Du(u)), th = Math.acos(clamp(1 - Math.pow(q, 1 / 0.85), -1, 1)); return hb(u) * Math.pow(Math.sin(th), 0.62); };
  return { L, B, D, hb, yk, Du, pt, halfAt };
}
async function buildBoat({ scale = 1, sailColors = null, seed = 1, damaged = true, banner = false } = {}) {
  const H = hullFns(), N = 8, grp = new THREE.Group(); grp.name = 'boat';
  const plank = (await MATS.hullPlanks()).clone(); plank.vertexColors = true;
  const [dpl, hs] = await Promise.all([MATS.darkPlanks(), MATS.hessian()]);
  // one strake (side, k, u0..u1) as a clinker strip: the lower edge stands proud of the plank below
  const strake = (side, k, u0, u1, segU = 48) => {
    const pos = [], uv = [], col = [], idx = [], SV = 5;
    for (let i = 0; i <= segU; i++) for (let j = 0; j <= SV; j++) {
      const u = lerp(u0, u1, i / segU), fv = j / SV, v = (k + fv) / N, p = H.pt(u, v, side), p2 = H.pt(u, Math.min(1, v + 0.01), side), out = V3(side, 0, 0).multiplyScalar(1);
      const nrm = V3(p2.y - p.y > 0 ? side : side, -(p2.x - p.x) * side * 4, 0).normalize();
      p.addScaledVector(nrm, 0.016 * (1 - fv) + 0.002);
      pos.push(p.x, p.y, p.z); uv.push(p.z * 1.0, k * 0.37 + fv * 0.21);
      const edge = 1 - 0.45 * Math.exp(-Math.min(fv, 1 - fv) * 40); col.push(edge, edge, edge);
    }
    for (let i = 0; i < segU; i++) for (let j = 0; j < SV; j++) { const a = i * (SV + 1) + j, b = a + SV + 1; side > 0 ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return W.shadows(new THREE.Mesh(g, plank));
  };
  const GAP = [0.43, 0.57], GK = 4;                                   // the strake at the waterline (boat floats at draft 0.36)
  for (const side of [-1, 1]) for (let k = 0; k < N; k++) {
    if (damaged && side > 0 && k === GK) { grp.add(strake(side, k, 0, GAP[0], 24), strake(side, k, GAP[1], 1, 24)); }
    else grp.add(strake(side, k, 0, 1));
  }
  // the loose plank: pivots about its upper edge (setDamage)
  let loose = null;
  if (damaged) { const m = strake(1, GK, GAP[0] + 0.002, GAP[1] - 0.002, 12), a = H.pt(GAP[0], (GK + 1) / N, 1), b = H.pt(GAP[1], (GK + 1) / N, 1);
    loose = new THREE.Group(); loose.position.copy(a); m.position.sub(a); loose.add(m); loose.userData.axis = b.clone().sub(a).normalize(); grp.add(loose);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x050403 })); }
  // keel, stems, gunwale rails, ribs, floorboards, thwarts
  const tubeAlong = (fn, n, r, matl) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(fn(i / n)); return W.shadows(new THREE.Mesh(W.boxUV(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, r, 10)), matl)); };
  grp.add(tubeAlong((u) => H.pt(lerp(0.01, 0.99, u), 0, 1).add(V3(0, -0.03, 0)), 30, 0.05, dpl));
  for (const u0 of [0, 1]) grp.add(tubeAlong((t) => { const u = u0 ? 1 - 0.015 * (1 - t) : 0.015 * (1 - t); const p = H.pt(u, Math.min(1, t * 1.1), 1); p.x = 0; p.z += (u0 ? 1 : -1) * 0.06 * t; p.y += 0.12 * t * t; return p; }, 12, 0.05, dpl));
  for (const side of [-1, 1]) grp.add(tubeAlong((u) => H.pt(lerp(0.015, 0.985, u), 1, side).add(V3(side * 0.01, 0.02, 0)), 40, 0.032, dpl));
  for (let u = 0.12; u < 0.9; u += 0.075) grp.add(tubeAlong((v) => { const side = v < 0.5 ? -1 : 1, vv = Math.abs(v - 0.5) * 2; const p = H.pt(u, vv, side); p.x *= 0.95; p.y += 0.02; return p; }, 16, 0.022, dpl));
  const floorY = 0.2;
  for (let z = -2.1; z < 2.2; z += 0.19) { const u = z / H.L + 0.5, w = H.halfAt(u, floorY) * 2 - 0.08; if (w < 0.2) continue; const b = W.rbox(w, 0.025, 0.17, dpl, { r: 0.008 }); b.position.set(0, floorY, z); grp.add(b); }
  const thwarts = [];
  for (const z of [-1.9, -0.3, 1.3]) { const u = z / H.L + 0.5, y = H.yk(u) + H.Du(u) * 0.72, w = H.halfAt(u, y) * 2 - 0.03, t = W.rbox(w, 0.04, 0.24, dpl, { r: 0.01 }); t.position.set(0, y, z); grp.add(t); thwarts.push(t); }
  // mast, yard, the patched sail
  const mastZ = 0.75, mast = W.rbox(0.1, 4.1 * 1, 0.1, dpl, { r: 0.04, seg: 4 }); mast.position.set(0, 0.15, mastZ); grp.add(mast);
  const yard = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.035, 0.04, 3.2, 16).rotateZ(Math.PI / 2)), dpl); yard.position.set(0, 3.8, mastZ + 0.08); grp.add(W.shadows(yard));
  const sailTex = canvasTex(512, 512, (x) => { const rr = W.rng(seed + 3), cols = sailColors ?? ['#d8ccb0', '#cdbf9e'];
    for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(i * 64, 0, 64, 512); }
    if (!sailColors) for (let k = 0; k < 7; k++) { const px = rr() * 420, py = rr() * 420, w = 40 + rr() * 70, h = 40 + rr() * 70; x.fillStyle = ['#b8a882', '#a89a7a', '#c8b48a'][k % 3]; x.fillRect(px, py, w, h);
      x.strokeStyle = 'rgba(80,60,40,0.6)'; x.setLineDash([3, 4]); x.strokeRect(px + 3, py + 3, w - 6, h - 6); }
    x.setLineDash([]); x.strokeStyle = 'rgba(60,45,30,0.35)'; for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke(); }
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${rr() < 0.5 ? '255,255,255' : '40,30,20'},0.04)`; x.fillRect(rr() * 512, rr() * 512, 2, 2); } });
  const sm = new THREE.MeshStandardMaterial({ map: sailTex, color: 0x8a8274, roughness: 0.95, side: THREE.DoubleSide, normalMap: hs.normalMap, normalScale: new THREE.Vector2(0.5, 0.5) });
  const sail = W.cloth(3.0, 2.9, sm, { segW: 48, segH: 48, folds: 0.01, seed, sag: (u, v) => 0.32 * Math.sin(u * Math.PI) * Math.sin((1 - v * 0.8) * Math.PI * 0.9) });
  sail.geometry.attributes.uv.array.forEach((_, i, a) => { a[i] = i % 2 ? a[i] / 2.9 : a[i] / 3.0; }); sail.geometry.attributes.uv.needsUpdate = true;
  sail.position.set(0, 2.35, mastZ + 0.12); grp.add(sail);
  if (banner) { const bn = W.cloth(0.5, 1.6, new THREE.MeshStandardMaterial({ color: 0x9a1a12, roughness: 0.8, side: THREE.DoubleSide }), { segW: 12, segH: 32, folds: 0.03, sag: (u, v) => 0.1 * Math.sin(v * 6) }); bn.rotation.y = Math.PI / 2; bn.position.set(0, 4.6, mastZ - 0.3); grp.add(bn); }
  grp.scale.setScalar(scale);
  return { group: grp, H, loose, floorY, thwarts, mastZ, sail, GAP, GK, N };
}

// ================================================================== SEA BOAT
// A small weathered clinker fishing boat with a patched cloth sail, coiled nets, wooden floats and a bailing bucket,
// on a calm bright sea off a rocky coast; far out, a royal ship (red-and-gold sail, banner) with a smart boat seized
// alongside. The boat rides the same swell the sea shader draws (pure in t).
// props.setDamage(q): the plank at the waterline (starboard, midships) is prised out, a dark gap opens.
// props.setFlood(q): water rises over the floorboards inside. Lesson 10.
export async function sea_boat({ time = 'day', seed = 70 } = {}) {
  const S = await base('sea_boat', time, { sun: { azim: 35 }, shadowBox: 9, focus: [0, 0.8, 0], fog: 0.0007, exposure: 0.85 });
  const ocean = oceanMaterial({ colA: 0x0a3442, colB: 0x0a3442, shallow: 0x0e4a52, foam: 0, tile: 5, flow: [0.01, 0.004], opacity: 1, rough: 0.08, envI: 0.7 });
  const sea = new THREE.Mesh(warpedSheet(6000, 420, 0.012), ocean); sea.receiveShadow = true; add(S, sea);
  // the rocky coast to the west
  const n = W.noise2(seed), coastH = (x, z) => { const d = -x - 180 + 60 * Math.sin(z / 140); return -6 + 46 * sstep(-30, 120, d) * (0.5 + 0.5 * W.ridged(n, x / 70, z / 70, 5)) + 3 * W.fbm(n, x / 20, z / 20, 3); };
  const cm = await W.terrainMaterial([{ name: 'rocky_terrain', tile: 6, tint: 0xd8ccb8 }, { name: 'dry_ground_rocks', tile: 4 }, { name: 'sand_01', tile: 4 }], { macro: 0.25 });
  const coast = W.terrain({ size: 1400, seg: 260, warp: 0.5, centre: [-500, -100], height: coastH, material: cm, weights: (x, z, h, sl) => [sstep(0.3, 0.5, sl) + 0.3, 1 - sstep(0.3, 0.5, sl), sstep(2, -2, h) * 2] });
  add(S, coast.mesh);
  // our boat
  const B = await buildBoat({ seed, damaged: true }), boat = B.group, H = B.H; add(S, boat);
  const draft = 0.36;
  // inside: nets (rope coils + a net heap), floats, the bailing bucket, a steering oar
  const netTex = canvasTex(128, 128, (x) => { x.clearRect(0, 0, 128, 128); x.strokeStyle = '#6a5a44'; x.lineWidth = 3; for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } });
  const net = W.cloth(1.4, 1.1, new THREE.MeshStandardMaterial({ map: netTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.95 }), { segW: 40, segH: 40, folds: 0.05, seed: 4, sag: (u, v) => 0.18 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + 0.06 * Math.sin(u * 13 + v * 7) });
  net.geometry.attributes.uv.array.forEach((_, i, a) => { a[i] *= 5; }); net.rotation.x = -Math.PI / 2; net.position.set(-0.1, B.floorY + 0.06, -2.35); boat.add(net);
  for (let c = 0; c < 2; c++) { const pts = []; for (let i = 0; i <= 400; i++) { const a = i / 400 * TAU * 7, r0 = 0.12 + 0.012 * (i / 400) * 7; pts.push(V3(Math.cos(a) * r0, 0.012 * i / 57 + 0.01 * Math.sin(a * 3), Math.sin(a) * r0)); }
    const coil = W.rope(pts, 0.009); coil.position.set(c ? 0.35 : -0.38, B.floorY + 0.02, c ? 1.85 : -1.3); boat.add(coil); }
  const floatM = (await MATS.planks()).clone(); floatM.color.set(0xc8b090);
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 20).rotateZ(Math.PI / 2)), floatM); f.position.set(-0.3 + i * 0.12, B.floorY + 0.09 + (i % 2) * 0.02, -2.75 + (i % 3) * 0.06); f.rotation.y = i * 0.6; boat.add(W.shadows(f)); }
  const bucket = await W.prop('wooden_bucket_01', { height: 0.28 }); bucket.position.set(0.45, B.floorY + 0.02, -0.9); boat.add(bucket);
  const dpl = await MATS.darkPlanks(); const oar = new THREE.Group(); oar.add(W.shadows(new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 12)), dpl))); const blade = W.rbox(0.03, 0.7, 0.2, dpl, { r: 0.01 }); blade.position.y = -1.6; oar.add(blade);
  oar.position.set(0.55, 1.1, -3.2); oar.rotation.set(0.9, 0, -0.25); boat.add(oar);
  // the gap behind the loose plank (dark) and the water rising inside
  const flood = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 40, 6), seaMat({ colA: 0x1a2a26, colB: 0x1a2a26, shallow: 0x2a3a34, foam: 0, tile: 0.8, opacity: 0.85, envI: 0.4 }));
  flood.geometry.setAttribute('depth', new THREE.BufferAttribute(new Float32Array(flood.geometry.attributes.position.count).fill(1), 1)); boat.add(flood);
  const setFlood = (q) => { q = clamp(q); const h = B.floorY - 0.04 + 0.32 * q, p = flood.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const iu = i % 41, iv = Math.floor(i / 41), u = lerp(0.1, 0.9, iu / 40), sgn = iv / 6 * 2 - 1; p.setXYZ(i, sgn * Math.max(0, H.halfAt(u, h) - 0.02), h, (u - 0.5) * H.L); }
    p.needsUpdate = true; flood.geometry.computeVertexNormals(); flood.visible = q > 0.001; };
  const setDamage = (q) => { q = clamp(q); if (!B.loose) return; B.loose.quaternion.setFromAxisAngle(B.loose.userData.axis, -0.55 * sstep(0, 0.7, q)); B.loose.position.copy(H.pt(0.43, 5 / 8, 1)).add(V3(0.06 * sstep(0.5, 1, q), -0.02 * sstep(0.5, 1, q), 0)); };
  setFlood(0); setDamage(0);
  // far out: the royal ship and the seized boat
  const K = await buildBoat({ scale: 2.7, seed: seed + 5, damaged: false, banner: true, sailColors: ['#9a1a12', '#d8a838'] }); K.group.position.set(260, -draft * 2.7, -520); K.group.rotation.y = 0.9; add(S, K.group);
  const Sm = await buildBoat({ scale: 1.15, seed: seed + 9, damaged: false, sailColors: ['#e8e0d0'] }); Sm.group.position.set(246, -draft * 1.15, -505); Sm.group.rotation.y = 0.95; add(S, Sm.group);
  // everything afloat rides the swell (pure in t)
  const ride = (obj, x, z, t, base, k = 1) => { const w = swellAt(x, z, t); obj.position.y = base + w.h * k; obj.rotation.x = -Math.atan(w.dz) * 0.7 * k; obj.rotation.z = Math.atan(w.dx) * 0.7 * k; };
  const yaw0 = boat.rotation.y;
  S.updaters.push((t, o) => { ocean.userData.update(t); ride(boat, 0, 0, t, -draft); boat.rotation.y = yaw0; ride(K.group, 260, -520, t, -draft * 2.7, 0.4); ride(Sm.group, 246, -505, t, -draft * 1.15, 0.7);
    if (o.damage !== undefined) setDamage(o.damage); if (o.flood !== undefined) setFlood(o.flood); });
  const gp = H.pt(0.5, 4.5 / 8, 1);
  const cameras = {
    hero:      { pos: [8.5, 2.4, 12], look: [0, 0.7, 0], fov: 40 },                                   // the little boat on the sea
    waterline: { pos: [gp.x + 1.5, gp.y - draft + 0.45, gp.z + 1.1], look: [gp.x, gp.y - draft + 0.05, gp.z], fov: 34 },   // the plank at the waterline
    inside:    { pos: [0.1, B.floorY - draft + 0.35, -1.0], look: [0.35, B.floorY - draft + 0.6, 1.6], fov: 58 },
    stern:     { pos: [0.4, 1.7, -5.6], look: [0, 0.9, 2.5], fov: 46 },
    horizon:   { pos: [-0.5, 1.35, -2.4], look: [253, 4, -512], fov: 30 },                             // past the stern to the king's ship
  };
  const slots = { passenger_tall: [0.25, B.floorY, -1.9, 0], passenger_young: [-0.3, B.floorY, -1.3, 0], boatman: [0.1, B.floorY, -2.75, 0] };
  return finish(S, 'sea_boat', cameras, { boat, hull: B, bucket, net, oar, plank: B.loose, setDamage, setFlood, flood, sail: B.sail, sea, ocean, kingShip: K.group, seizedBoat: Sm.group, coast: coast.mesh, swellAt, sun: S.atmo.sun }, slots, { slotsParent: boat });
}

// ------------------------------------------------------------------ a rock overlay: an SDF skin over a heightfield's steep parts (no texture stretch)
// Covers the terrain inside box (sits 'lift' metres above it, sinking under it at the box edges), triplanar rock.
async function rockSkin({ H, box, step = 0.3, lift = 0.5, amp = 0.9, seed = 5, tex = 'rocky_terrain', tile = 5, tint = 0xe8dccb, strata = 0.25, occ = true }) {
  const n3 = noise3(seed), [x0, y0, z0, x1, y1, z1] = box, edge = Math.min(x1 - x0, z1 - z0) * 0.08;
  const f = (x, y, z, col) => {
    let d = y - (col.h + col.off);
    if (d > -2.5 && d < 2.5) d += amp * fbm3(n3, x / 4, y / 3, z / 4, 4) + 0.25 * Math.sin(y * 1.7 + 2 * n3(x * 0.1, y * 0.4, z * 0.1));
    return d;
  };
  f.column = (x, z) => { const e = Math.min(x - x0, x1 - x, z - z0, z1 - z); return { h: H(x, z), off: lerp(-1.5, lift, sstep(0, edge, e)) }; };
  const M = sdfMesh(f, { min: [x0, y0, z0], max: [x1, y1, z1], step, ground: null, occ, reach: 30 });
  const m = await triMat(tex, { tile, tint, normal: 1.3, strata, strataTint: 0xb0a088, macro: 0.3, occ: occ ? 'attr' : null, desat: 0.45 });
  return { mesh: W.shadows(new THREE.Mesh(M.geometry, m)), occAt: M.occAt };
}

// ================================================================== VILLAGE WALL
// The edge of a dry hill town: flat-roofed mud-brick houses with shuttered doors and window screens, a single thorn
// tree for shade, and one long wall of sun-dried bricks that leans out over the lane with a bulge and a crack.
// A sealed clay jar is buried under the wall's foot (props.cutaway: a soil cross-section from growth.js for the
// "down through the earth" shot; camera 'jar'). props.setRepair(p): 0 leaning/cracked .. 1 straight; the work moves
// along the wall from west to east and the gaps are filled with fresh bricks carried from the stack by the tree
// (the stack shrinks as they go in). props.setCrack(q): the hairline crack widening (only while unrepaired).
// time: 'day' (midday glare) | 'golden'. Lessons 12 (and 16's distant wall).
export async function village_wall({ time = 'day', seed = 82, repair = 0 } = {}) {
  const S = await base('village_wall', time, { sun: { azim: 150 }, shadowBox: 18, focus: [0, 1, 2], fog: 0.0025 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const height = (x, z) => 0.05 * n(x / 3, z / 3) + 0.015 * n2(x * 2, z * 2) + 0.03 * z * sstep(0, 30, z) + 18 * sstep(90, 300, Math.hypot(x, z)) * W.fbm(n2, x / 120, z / 120, 4);
  const mt = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3, tint: 0xf0e0c8 }, { name: 'raked_dirt', tile: 2.6, tint: 0xf0e0c8 }, { name: 'brown_mud_dry', tile: 2.4 }], { macro: 0.2 });
  const T = W.terrain({ size: 900, seg: 520, warp: 0.08, centre: [0, 3], height, material: mt, weights: (x, z) => [1, (1 - sstep(1.5, 3.5, Math.abs(z - 3.2))) * 1.4, 0.4 + 0.4 * n(x / 5, z / 5)] });
  add(S, T.mesh);
  const hy = height;
  // ---- the brick wall (two wythes of instanced sun-dried bricks over a mud core)
  const WL = 18, WH = 2.75, BW = 0.37, BH = 0.115, BD = 0.18, rows = Math.round(WH / BH), per = Math.round(WL / BW);
  const brickM = await W.pbr('clay_plaster', { tile: 0.7, tint: 0xd8b088, res: 1024, normal: 1.4 });
  const coreM = (await MATS.mudPlaster()).clone(); coreM.color.set(0xa88a6a);
  const core = W.rbox(WL - 0.1, WH - 0.05, 0.3, coreM, { r: 0.04 }); core.position.set(0, hy(0, 0) - 0.02, 0); add(S, core);
  const bricks = [], r = W.rng(seed);
  for (const face of [-1, 1]) for (let row = 0; row < rows; row++) for (let i = 0; i < per; i++) {
    const x = -WL / 2 + BW * (i + 0.5 + (row % 2 ? 0.5 : 0)); if (x > WL / 2 - BW * 0.3) continue;
    bricks.push({ x, y: row * BH + BH / 2, z: face * (0.15 + BD / 2 - 0.02), face, row, jit: [(r() - 0.5) * 0.006, (r() - 0.5) * 0.004, (r() - 0.5) * 0.01, (r() - 0.5) * 0.04], tone: 0.82 + r() * 0.24, rnd: r() });
  }
  // the crack: a jagged diagonal through the bulge (front face); bricks along it fell out (they lie in the lane as rubble)
  const crackX = (y) => -0.6 + 0.9 * (y / WH) + 0.25 * Math.sin(y * 7);
  const missing = new Set();
  bricks.forEach((b, i) => { if (b.face > 0 && Math.abs(b.x - crackX(b.y)) < 0.3 && b.y > 0.6 && b.y < 2.4 && b.rnd < 0.55) missing.add(i); });
  const bulge = (x, y) => 0.22 * Math.exp(-(((x - 0.4) / 2.6) ** 2)) * Math.sin(Math.PI * clamp(y / WH)) ** 1.4;
  const leanAt = (x, y) => (0.11 * Math.exp(-((x / 5.5) ** 2))) * (y / WH) * (y / WH) * 2.4;
  const g = new RoundedBoxGeometry(BW - 0.016, BH - 0.014, BD, 2, 0.012); W.boxUV(g);
  const im = new THREE.InstancedMesh(g, brickM, bricks.length), stackN = missing.size;
  const freshM = brickM.clone(); freshM.color.set(0xfff0dc);
  const fresh = new THREE.InstancedMesh(g, freshM, stackN), rubble = new THREE.InstancedMesh(g, brickM, stackN);
  im.castShadow = im.receiveShadow = fresh.castShadow = fresh.receiveShadow = rubble.castShadow = rubble.receiveShadow = true;
  const C = new THREE.Color(); bricks.forEach((b, i) => { C.setRGB(b.tone, b.tone * 0.97, b.tone * 0.93); im.setColorAt(i, C); });
  add(S, im); add(S, fresh); add(S, rubble);
  const gy0 = hy(0, 0), STACK = [-5.6, 5.4];
  const missList = [...missing].sort((a, b) => bricks[a].x - bricks[b].x || bricks[a].y - bricks[b].y);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  // rubble: where each fallen brick lies (fixed, seeded), in the lane at the wall foot
  missList.forEach((i, k) => { const b = bricks[i], rx = b.x + (r() - 0.5) * 0.9, rz = 0.55 + r() * 1.1; E.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.4 + (r() < 0.3 ? Math.PI / 2 : 0));
    M4.compose(V3(rx, hy(rx, rz) + BH * 0.45, rz), Q.setFromEuler(E), V3(1, 1, 1)); rubble.setMatrixAt(k, M4); });
  const setRepair = (p, crack = 1) => {
    p = clamp(p);
    bricks.forEach((b, i) => {
      const a = 0.05 + 0.7 * (b.x + WL / 2) / WL + 0.02 * b.row / rows, f = sstep(a, a + 0.18, p), dmg = 1 - f;
      const cw = crack * dmg * 0.045 * Math.sign(b.x - crackX(b.y)) * (b.face > 0 ? 1 : 0.6);
      const dz = (bulge(b.x, b.y) + leanAt(b.x, b.y)) * dmg * (b.face > 0 ? 1 : 0.85);
      E.set(-0.18 * dmg * Math.exp(-((b.x / 5.5) ** 2)) * (b.y / WH), b.jit[3] * dmg, b.jit[3] * 0.5 * dmg);
      M4.compose(V3(b.x + cw + b.jit[0] * dmg, gy0 + b.y + b.jit[1] - Math.abs(cw) * 0.3, b.z + dz + b.jit[2] * dmg), Q.setFromEuler(E), missing.has(i) ? V3(0, 0, 0) : V3(1, 1, 1));
      im.setMatrixAt(i, M4);
    });
    // fresh bricks: from the stack by the tree, along a lifted arc, into the gaps (in wall order)
    missList.forEach((i, k) => { const b = bricks[i], a = 0.05 + 0.7 * (b.x + WL / 2) / WL, f = sstep(a + 0.08, a + 0.2, p);
      const sp = V3(STACK[0] + (k % 3) * 0.38, hy(...STACK) + BH * (Math.floor((stackN - 1 - k) / 3) + 0.5), STACK[1] + 0.02 * (k % 2));
      const dst = V3(b.x, gy0 + b.y, b.z); const pnt = sp.clone().lerp(dst, f); pnt.y += Math.sin(Math.PI * f) * 0.8;
      E.set(0, (1 - f) * 1.2, 0); M4.compose(pnt, Q.setFromEuler(E), V3(1, 1, 1)); fresh.setMatrixAt(k, M4); });
    im.instanceMatrix.needsUpdate = true; fresh.instanceMatrix.needsUpdate = true; core.position.z = 0.12 * (1 - sstep(0.05, 0.8, p)); core.rotation.x = -0.035 * (1 - sstep(0.05, 0.8, p));
    im.computeBoundingSphere(); fresh.computeBoundingSphere();
  };
  setRepair(repair);
  S.updaters.push((t, o) => { if (o.repair !== undefined || o.crack !== undefined) setRepair(o.repair ?? 0, o.crack ?? 1); });
  // a cap of mud plaster along the top (follows nothing: it is on the far, straight end only), a buttress stub
  // ---- houses along the lane (shuttered), a step where two children can sit, the thorn tree
  const houses = [];
  for (const [x, z, w, d, h, ry] of [[-12, 9.5, 6, 5, 3.3, Math.PI], [-4.5, 10.2, 7, 5.5, 3.6, Math.PI], [3.8, 9.8, 6, 5, 3.0, Math.PI], [11.5, 10.4, 7, 5, 3.8, Math.PI], [-17, 1, 5, 6, 3.2, Math.PI / 2], [17.5, 1.5, 5, 6, 3.4, -Math.PI / 2], [0, -9, 9, 6, 4.2, 0], [-10, -8.5, 6, 6, 3.4, 0]]) {
    const hgrp = await mudHouse({ w, d, h, seed: seed + x | 0 }); hgrp.position.set(x, hy(x, z) - 0.05, z); hgrp.rotation.y = ry; add(S, hgrp); houses.push(hgrp); }
  const stone = await MATS.rustic();
  const step = W.rbox(2.2, 0.32, 0.6, stone, { r: 0.04 }); step.position.set(-4.5, hy(-4.5, 7.1) - 0.02, 7.1); add(S, step);
  const tree = GR.makeTree(THREE, { species: 'olive', seed: seed + 3 }); tree.set(1, 0); const thorn = tree.object3d; thorn.scale.set(1.9, 1.35, 1.9);
  thorn.traverse((m) => { if (m.isInstancedMesh && m.material) { m.material = m.material.clone(); m.material.color?.multiply(new THREE.Color(0xc8c090)); } });
  thorn.position.set(-6.8, hy(-6.8, 4.2), 4.2); add(S, thorn);
  // the stack of fresh bricks by the tree, a basket of mud, a trowel
  add(S, await W.prop('wooden_bucket_01', { pos: [STACK[0] + 1.4, hy(STACK[0] + 1.4, STACK[1]), STACK[1] + 0.3], height: 0.3 }));
  // ---- the sealed jar under the wall's foot and the soil cut-away for the underground shot
  const JAR = [1.1, 0.55], jar = clayJar({ h: 0.62, r: 0.26, seal: true, seed }); jar.position.set(JAR[0], hy(...JAR) - 0.95, JAR[1]); add(S, jar);
  const cut = GR.makeSoilCutaway(THREE, { w: 1.7, h: 1.25, d: 1.1, seed: seed + 5, surround: false, xray: 0.6, haze: 0.05 }); cut.object3d.position.set(JAR[0], hy(...JAR) + 0.002, JAR[1] - 0.05); add(S, cut.object3d);
  if (cut.object3d.getObjectByName) cut.object3d.traverse((m) => { if (m.name === 'seed') m.visible = false; }); if (cut.seed?.object3d) cut.seed.object3d.visible = false;
  add(S, await W.groundCover({ heightAt: hy, focus: [0, 4], radius: 16, seed: seed + 9, pebbles: 600, rocks: 25, tuftN: 80, tuftColor: 0xb8a878, area: (x, z) => z > 0.5 && z < 7.5 && Math.abs(x) < 15 ? 1 : 0 }));
  const cg = gy0;
  const cameras = {
    hero:    { pos: [7.5, cg + 1.6, 7.2], look: [-1, cg + 1.4, 0], fov: 46 },                         // along the lane: the leaning wall, houses, the tree
    crack:   { pos: [crackX(1.5) + 0.35, cg + 1.55, 1.25], look: [crackX(1.5), cg + 1.45, 0.25], fov: 34 },
    doors:   { pos: [6, cg + 1.5, 4.6], look: [-6, cg + 1.6, 8], fov: 44 },                            // shuttered doors along the lane
    tree:    { pos: [-3.2, cg + 1.3, 7.6], look: [-6.8, cg + 1.2, 3.8], fov: 46 },
    track_a: { pos: [-8, cg + 1.5, 3.2], look: [-6, cg + 1.3, 0], fov: 40 },                            // tracking along the wall as it straightens
    track_b: { pos: [8, cg + 1.5, 3.2], look: [10, cg + 1.3, 0], fov: 40 },
    jar:     { pos: [JAR[0] + 0.25, cg - 0.55, JAR[1] + 3.3], look: [JAR[0], cg - 0.62, JAR[1]], fov: 34, exposure: 1.3 },   // below ground, through the soil section
  };
  const slots = { traveller_1: [-6.4, hy(-6.4, 5.2), 5.2, Math.PI * 0.9], traveller_2: [-7.4, hy(-7.4, 5.4), 5.4, Math.PI * 0.9], child_1: [-5.0, hy(-5, 7.1) + 0.3, 7.1, Math.PI], child_2: [-4.1, hy(-4.1, 7.1) + 0.3, 7.1, Math.PI], mason: [0, gy0, 1.1, Math.PI] };
  return finish(S, 'village_wall', cameras, { wall: im, freshBricks: fresh, rubble, setRepair, setCrack: (q) => setRepair(0, q), houses, thorn, jar, cutaway: cut.object3d, step, terrain: T, sun: S.atmo.sun }, slots);
}

// ------------------------------------------------------------------ molten metal (emissive, flowing; pure in t)
function moltenMat({ heat = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0x6a2a10, roughness: 0.35, metalness: 0.6, emissive: 0xffffff, emissiveIntensity: 1 });
  const U = { time: { value: 0 }, heat: { value: heat } };
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      uniform float time, heat; varying vec3 vMW; float mh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float mn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(mix(mh(i), mh(i+vec3(1,0,0)), f.x), mix(mh(i+vec3(0,1,0)), mh(i+vec3(1,1,0)), f.x), f.y), mix(mix(mh(i+vec3(0,0,1)), mh(i+vec3(1,0,1)), f.x), mix(mh(i+vec3(0,1,1)), mh(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <emissivemap_fragment>', `{ float fl = mn(vMW * 9. + vec3(0., time * 3.5, 0.)) * 0.6 + mn(vMW * 23. + vec3(0., time * 6., time)) * 0.4;
        float h = heat * (0.65 + 0.55 * fl);
        totalEmissiveRadiance = mix(vec3(0.), mix(vec3(1.0, 0.16, 0.02), vec3(1.0, 0.6, 0.22), smoothstep(0.7, 1.3, h)), clamp(h, 0., 1.)) * 2.6 * h; }`);
  };
  m.customProgramCacheKey = () => 'molten1'; m.userData.U = U;
  return m;
}
// sparks: points on closed-form ballistic arcs from an emitter (pure in t)
function sparks({ count = 260, origin = [0, 0, 0], seed = 3, rate = 1 } = {}) {
  const r = W.rng(seed), a = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) a.set([r(), 0.6 + r() * 1.6, r() * TAU, 0.6 + r() * 1.4], i * 4);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); g.setAttribute('aS', new THREE.BufferAttribute(a, 4));
  const U = { time: { value: 0 }, k: { value: 1 }, o: { value: V3(...origin) } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, k; uniform vec3 o; attribute vec4 aS; varying float vA;
      void main(){ float life = 0.9 * aS.w, tt = mod(time + aS.x * 7.3, life) , f = tt / life;
        vec3 v = vec3(cos(aS.z), 0., sin(aS.z)) * aS.y * 0.9 + vec3(0., aS.y * 1.4, 0.);
        vec3 p = o + v * tt + vec3(0., -4.9 * tt * tt, 0.); p.y = max(p.y, o.y - 0.02);
        vA = (1. - f) * k; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (3. + 5. * (1. - f)) * 3.5 / max(0.2, -mv.z); }`,
    fragmentShader: `varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float a = exp(-dot(q, q) * 22.) * vA; gl_FragColor = vec4(vec3(1., 0.62, 0.22) * a * 4., a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.U = U; p.renderOrder = 6;
  return p;
}
// leather bellows: a pleated lathe between two boards, a clay nozzle
async function bellows() {
  const g = new THREE.Group(), leather = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.7, normalMap: fibreNormal(5), normalScale: new THREE.Vector2(0.5, 0.5) }), pl = await MATS.darkPlanks();
  const prof = []; for (let i = 0; i <= 60; i++) { const y = i / 60 * 0.9; prof.push([0.32 * Math.sin(Math.PI * (0.08 + 0.84 * i / 60)) * (1 + 0.06 * Math.cos(i * 1.2)) + 0.06, y]); }
  const body = W.lathe(prof, leather, { seg: 64 }); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.45); body.position.set(0.45, 0.22, 0); g.add(body);
  for (const x of [-0.46, 0.46]) { const b = W.rbox(0.04, 0.5, 0.42, pl, { r: 0.01 }); b.position.set(x, 0, 0); g.add(b); }
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.5, 24).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 })); noz.position.set(0.7, 0.2, 0); g.add(W.shadows(noz));
  return W.shadows(g);
}

// ================================================================== MOUNTAIN PASS + BARRIER
// A narrow windy pass (about 30 m wide) between two steep bare rock walls. On the pass floor: charcoal heaps, leather
// bellows, a fire pit with a clay crucible of glowing metal, stacked iron blocks. The barrier is built course by course
// across the gap: props.setBuild(p) (each block travels along the supply track from the valley to its place, west to
// east, bottom up; a block is never created or deleted), then props.setPour(q) runs molten copper down through the
// seams from the top; it glows, then cools to copper. Close-up rig: props.pour (a crucible pouring a thin stream onto
// iron, sparks, glow), camera 'pour'. Lessons 14, 16 (hinge beat: camera 'hinge').
export async function mountain_pass_barrier({ time = 'golden', seed = 98, build = 1, pour = 1 } = {}) {
  const S = await base('mountain_pass_barrier', time, { sun: { azim: time === 'golden' ? 200 : 130 }, shadowBox: 40, focus: [0, 4, 0], fog: 0.002 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const GAPW = (z) => 15 + 0.06 * z * z * 0.02 + 2.5 * Math.sin(z / 17);
  const height = (x, z) => {
    const ax = Math.abs(x), wall = sstep(GAPW(z) - 2, GAPW(z) + 9, ax);
    let h = 0.15 * n(x / 6, z / 6) + wall * (70 + 30 * W.ridged(n, x / 90, z / 60, 5)) * (1 - 0.35 * sstep(60, 160, Math.abs(z)));
    h += 0.08 * Math.abs(z) * (1 - wall) * sstep(10, 80, Math.abs(z)) * (z > 0 ? -0.6 : 0.6);
    return h + 40 * sstep(260, 700, Math.hypot(x, z)) * W.fbm(n2, x / 200, z / 200, 3);
  };
  const mt = occify(await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3, tint: 0xe8dcc8 }, { name: 'rocky_terrain', tile: 6, tint: 0xd8ccb8 }, { name: 'gravel_road', tile: 2.6, tint: 0xe0d0b8 }], { macro: 0.25 }));
  const T = W.terrain({ size: 1600, seg: 520, warp: 0.1, centre: [0, 0], height, material: mt, weights: (x, z, h, sl) => [1 - sstep(0.2, 0.4, sl), sstep(0.2, 0.4, sl) * 1.6, (1 - sstep(4, 8, Math.abs(x))) * sstep(4, 20, z) * 1.2] });
  add(S, T.mesh);
  T.mesh.geometry.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(T.mesh.geometry.attributes.position.count).fill(1), 1));
  // the two rock walls as a triplanar SDF skin (no stretched textures on the cliffs)
  const skin = await rockSkin({ H: height, box: [-60, -2, -60, 60, 95, 60], step: 0.45, lift: 0.6, amp: 1.4, seed, tile: 7, tint: 0xe2d4c0, strata: 0.3 });
  add(S, skin.mesh);
  // ---- the barrier: courses of iron blocks spanning the gap at z = 0, as high as the walls allow (to 14 m)
  const iron = ironPBR({ tile: 2.6 }), BLW = 1.6, BLH = 0.42, BLD = 1.0, BH = 14;
  const blocks = [];
  for (let k = 0; k * BLH < BH; k++) { const y = k * BLH; let xl = -GAPW(0) - 4, xr = GAPW(0) + 4;
    // the open width at this height (where the ground is below the course)
    for (let x = 0; x > -40; x -= 0.2) if (height(x, 0) > y + 0.2) { xl = x; break; }
    for (let x = 0; x < 40; x += 0.2) if (height(x, 0) > y + 0.2) { xr = x; break; }
    const nb = Math.ceil((xr - xl) / BLW) + 1, x0 = (xl + xr) / 2 - nb * BLW / 2 + (k % 2 ? BLW / 2 : 0);
    for (let i = 0; i < nb; i++) { const x = x0 + i * BLW; blocks.push({ x, y: Math.max(height(x, 0) - 0.3, 0) * 0 + y + BLH / 2 + 0.05, k, i, j: blocks.length }); } }
  const bg = new RoundedBoxGeometry(BLW - 0.025, BLH - 0.02, BLD, 3, 0.03); W.boxUV(bg);
  const bim = new THREE.InstancedMesh(bg, iron, blocks.length); bim.castShadow = bim.receiveShadow = true; add(S, bim);
  // copper core behind the seams (glows as it is poured, then cools)
  const coreG = new THREE.BoxGeometry(2 * GAPW(0) + 8, BH + 0.3, BLD - 0.06, 40, 40, 1); W.boxUV(coreG);
  const copper = moltenMat({ heat: 0 }); const core = new THREE.Mesh(coreG, copper); core.position.set(0, (BH + 0.3) / 2, 0); add(S, core);
  const SUP = (s) => V3(2.5 * Math.sin(s * 3), height(0, 14 + s * 120) + 0.3, 14 + s * 120);       // the supply track down the pass (s: 1 far .. 0 the site)
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const setBuild = (p) => { p = clamp(p); const N = blocks.length;
    blocks.forEach((b, i) => { const a = (i / N) * 0.88, f = clamp((p - a) / 0.12);
      let pos; if (f >= 1) pos = V3(b.x, b.y, 0); else { const s = 1 - f, track = SUP(Math.max(0, s - 0.15) * 0.6); const site = V3(b.x, b.y, 0);
        pos = f < 0.6 ? SUP(0.6 * (1 - f / 0.6) + 0.02) : SUP(0.02).lerp(site, sstep(0.6, 1, f)); pos.y += Math.sin(Math.PI * sstep(0.6, 1, f)) * 1.2 + (f < 0.6 ? 0.25 : 0); }
      const hidden = p < a - 0.001 ? 0 : 1;                                    // not yet sent: waits at the far end of the track (beyond the haze)
      if (!hidden) { const col = i % 16, lay = Math.floor((N - 1 - i) / 16); pos = SUP(0.62).add(V3((col - 7.5) * (BLW + 0.05), lay * BLH + BLH / 2, (lay % 2) * 0.3)); }
      E.set(0, f < 0.6 ? 0.3 * Math.sin(i) : 0, 0); M4.compose(pos, Q.setFromEuler(E), V3(1, 1, 1)); bim.setMatrixAt(i, M4); });
    bim.instanceMatrix.needsUpdate = true; bim.computeBoundingSphere(); bim.userData.p = p;
    core.scale.y = Math.max(0.001, sstep(0.05, 0.95, p)); core.position.y = (BH + 0.3) * core.scale.y / 2;
  };
  const setPour = (q) => { q = clamp(q); copper.userData.U.heat.value = sstep(0, 0.15, q) * (1 - sstep(0.55, 1, q));
    copper.color.set(0x6a2a10).lerp(new THREE.Color(0xb86a3a), sstep(0.5, 1, q)); copper.metalness = lerp(0.6, 0.9, sstep(0.5, 1, q)); copper.roughness = lerp(0.35, 0.4, q); };
  setBuild(build); setPour(pour);
  // ---- the work site: fire pit + crucible, bellows, charcoal heaps, stacks of iron, the pour rig
  const site = V3(-6, height(-6, 9), 9);
  const pit = await W.prop('stone_fire_pit', { pos: [site.x, site.y, site.z], height: 0.4 }); add(S, pit);
  const fire = W.flame({ h: 0.9, w: 0.7, seed: 4, inten: 6, light: 8, dist: 16 }); add(S, fire, site.x, site.y + 0.15, site.z);
  const clay = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 });
  const crucible = W.lathe([[0.001, 0], [0.2, 0.01], [0.26, 0.15], [0.27, 0.36], [0.24, 0.4], [0.2, 0.38], [0.2, 0.06], [0.001, 0.05]], clay, { seg: 64 }); crucible.position.set(site.x, site.y + 0.3, site.z); add(S, crucible);
  const melt = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48).rotateX(-Math.PI / 2), moltenMat({ heat: 1.2 })); melt.position.set(site.x, site.y + 0.62, site.z); add(S, melt);
  const bel = await bellows(); bel.position.set(site.x - 1.6, site.y, site.z + 0.2); bel.rotation.y = 0.1; add(S, bel);
  const coal = await W.scatter('rock_09', W.scatterPoints({ seed: seed + 3, count: 220, rect: [site.x - 4.5, site.z + 1.5, site.x - 2, site.z + 4], heightAt: height, s: [0.8, 2.4], sink: 0.01 }).map((q) => ({ ...q, y: q.y + 0.25 * Math.max(0, 1 - Math.hypot(q.x - site.x + 3.2, q.z - site.z - 2.7) / 1.3) })), { tint: 0x2a2624, matte: true }); add(S, coal);
  for (const [x, z, nst] of [[5, 8, 7], [6.8, 8.4, 5], [5.8, 10.2, 6]]) for (let k = 0; k < nst; k++) { const b = W.rbox(BLW - 0.02, BLH - 0.02, BLD, iron, { r: 0.03, seg: 3 }); b.position.set(x + (k % 2) * 0.04, height(x, z) + k * BLH, z); b.rotation.y = 0.15 * Math.sin(k + x); add(S, b); }
  // the pour rig (close-up): a tilted crucible above a block, a thin glowing stream, sparks
  const R0 = V3(3.2, height(3.2, 7) , 7);
  const testBlock = W.rbox(BLW - 0.02, BLH - 0.02, BLD, iron, { r: 0.03, seg: 3 }); testBlock.position.copy(R0); add(S, testBlock);
  const tilt = W.lathe([[0.001, 0], [0.14, 0.01], [0.18, 0.12], [0.18, 0.26], [0.15, 0.28], [0.14, 0.04], [0.001, 0.03]], clay, { seg: 48 }); tilt.position.set(R0.x - 0.25, R0.y + BLH + 0.75, R0.z); tilt.rotation.z = -1.1; add(S, tilt);
  const streamC = new THREE.CatmullRomCurve3([V3(R0.x - 0.06, R0.y + BLH + 0.78, R0.z), V3(R0.x - 0.02, R0.y + BLH + 0.5, R0.z), V3(R0.x, R0.y + BLH + 0.01, R0.z)]);
  const stream = new THREE.Mesh(new THREE.TubeGeometry(streamC, 40, 0.009, 12), moltenMat({ heat: 1.0 })); add(S, stream);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.09, 40).rotateX(-Math.PI / 2), moltenMat({ heat: 1.1 })); puddle.position.set(R0.x, R0.y + BLH + 0.002, R0.z); add(S, puddle);
  const spk = sparks({ origin: [R0.x, R0.y + BLH + 0.01, R0.z], count: 220 }); add(S, spk);
  const steam = mistLayer({ rect: [R0.x - 0.6, R0.z - 0.6, R0.x + 0.6, R0.z + 0.6], y: R0.y + BLH + 0.08, layers: 3, gap: 0.12, color: 0xe8e0d8, op: 0.25, speed: [0.05, 0.6], scale: 3 }); add(S, steam);
  const glow = new THREE.PointLight(0xff6a20, 1.2, 2.5, 2); glow.position.set(R0.x, R0.y + BLH + 0.15, R0.z); add(S, glow);
  const mats = [copper, melt.material, stream.material, puddle.material];
  S.updaters.push((t, o) => { mats.forEach((m) => { m.userData.U.time.value = t; }); fire.userData.update(t, o.fire ?? 1); spk.userData.U.time.value = t; spk.userData.U.k.value = o.sparks ?? 1; steam.userData.update(t);
    if (o.build !== undefined) setBuild(o.build); if (o.pour !== undefined) setPour(o.pour); });
  add(S, await W.groundCover({ heightAt: height, focus: [0, 12], radius: 26, seed: seed + 5, pebbles: 900, rocks: 60, tuftN: 90, boulders: 30, tuftColor: 0xb0a070, area: (x, z) => Math.abs(z) > 1.5 && Math.hypot(x - site.x, z - site.z) > 2.5 ? 1 : 0 }));
  const top = blocks.reduce((m, b) => Math.max(m, b.y), 0);
  const cameras = {
    hero:    { pos: [9, 1.8, 30], look: [0, 6, 0], fov: 50 },                                   // from the villagers' side into the gap
    barrier: { pos: [-4, 2.2, 16], look: [1, 6.5, 0], fov: 50 },
    pour:    { pos: [R0.x + 0.55, R0.y + BLH + 0.32, R0.z + 0.65], look: [R0.x - 0.02, R0.y + BLH + 0.22, R0.z], fov: 34 },
    bellows: { pos: [site.x + 0.4, site.y + 1.1, site.z + 3.2], look: [site.x - 1, site.y + 0.4, site.z], fov: 44 },
    hinge:   { pos: [1.5, 1.45, 2.1], look: [0.6, 1.25, 0.5], fov: 34 },                          // dark iron, a copper seam
    gap:     { pos: [0, 3, 70], look: [0, 10, 0], fov: 40 },
  };
  const slots = { ruler: [0.5, height(0.5, 18), 18, Math.PI], villager_1: [8, height(8, 22), 22, Math.PI + 0.4], villager_2: [9.5, height(9.5, 23), 23, Math.PI + 0.5], villager_3: [7, height(7, 24.5), 24.5, Math.PI + 0.3],
    villager_4: [10.5, height(10.5, 21), 21, Math.PI + 0.6], worker_bellows: [site.x - 2.1, site.y, site.z + 0.6, 1.4], worker_1: [3, height(3, 4), 4, Math.PI], worker_2: [-3, height(-3, 4), 4, Math.PI] };
  return finish(S, 'mountain_pass_barrier', cameras, { blocks: bim, setBuild, setPour, copper: core, fire, crucible, bellows: bel, pour: { crucible: tilt, stream, puddle, sparks: spk, steam, glow }, skin: skin.mesh, terrain: T, barrierTop: top, sun: S.atmo.sun }, slots, { bloom: 0.22, bloomThreshold: 0.92 });
}

// reeds: instanced tall blades with a plume, swaying with the shared wind (pure in t)
function reeds(items, { h = 2.2, color = 0x6a6a3a, wind = 0.5 } = {}) {
  const parts = [], r = W.rng(5);
  for (let k = 0; k < 5; k++) { const L = h * (0.7 + r() * 0.4), a = r() * TAU, g = new THREE.PlaneGeometry(0.012, L, 1, 8).translate(0, L / 2, 0), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / L; p.setX(i, p.getX(i) * (1 - y * 0.8)); p.setZ(i, y * y * 0.25 * L * r()); }
    g.rotateY(a); g.translate(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04); parts.push(g.toNonIndexed()); }
  const plume = new THREE.SphereGeometry(0.05, 8, 6).scale(0.6, 3, 0.6).translate(0, h * 1.05, 0.05); parts.push(plume.toNonIndexed());
  const geo = W.BGU.mergeGeometries(parts.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }), U = { time: { value: 0 }, wind: { value: wind } };
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\nuniform float time, wind;\n${WIND_GLSL}`)
    .replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      { vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]); float k = pow(clamp(position.y / ${h.toFixed(2)}, 0., 1.2), 2.); mvPosition.xz += WIND_DIR * windAt(ip, time, wind) * 0.35 * k; }
      mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`); };
  m.customProgramCacheKey = () => 'reeds1';
  const im = new THREE.InstancedMesh(geo, m, items.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), C = new THREE.Color();
  items.forEach((it, i) => { M4.compose(V3(it.x, it.y, it.z), Q.setFromAxisAngle(V3(0, 1, 0), it.ry), V3(it.s, it.s * (0.8 + 0.4 * r()), it.s)); im.setMatrixAt(i, M4); C.set(color).multiplyScalar(0.7 + r() * 0.5); im.setColorAt(i, C); });
  im.castShadow = im.receiveShadow = true; im.userData.U = U; return im;
}

// ================================================================== JOURNEYS (Dhul-Qarnayn's west and east)
// side 'west': the sun's red disc touching a dark muddy lagoon at the far western shore, reed beds in silhouette, mist.
// side 'east': sunrise over an open plain of bare, shadeless dry earth, a few thin cloth shelters, a ridge where a
// caravan path crosses (slots caravan_1..8), and a dusty meeting ground (camera 'meeting', slots crowd_1..10 + ruler).
// Lesson 13.
export async function journeys({ side = 'west', seed = 130 } = {}) {
  const west = side === 'west';
  const S = await base('journeys_' + side, 'golden', { hdri: west ? 'plains_sunset' : 'belfast_sunset', background: 'sky', envI: 0.8,
    sun: { elev: west ? 0.7 : 2.2, azim: west ? 270 : 280 }, sunI: west ? 1.4 : 2.0, sunColor: west ? 0xff7a40 : 0xffb070, fog: west ? 0.0022 : 0.0016,
    sky: west ? { zenith: 0x2a3a6a, sunColor: 0xff6a30, glow: 1.6, hazeH: 0.35, sunDisc: 0.99993 } : { zenith: 0x5a7ab0, sunColor: 0xffb070, glow: 1.3, hazeH: 0.4, sunDisc: 0.99993 },
    fogColor: west ? 0xc87a5a : 0xe0b890, shadowBox: 40, focus: [0, 0, -10], exposure: west ? 1.05 : 0.95 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  let height, T, props = {}, cameras, slots = {};
  if (west) {
    height = (x, z) => { const shore = 6 + 4 * Math.sin(x / 19) + 2 * Math.sin(x / 7); const d = z - shore;
      return d > 0 ? 0.05 * d + 0.12 * n(x / 4, z / 4) + 2 * sstep(40, 120, d) * W.fbm(n2, x / 60, z / 60, 3) : -0.04 * Math.min(-d, 30) + 0.06 * n(x / 3, z / 3) * sstep(-8, 0, d); };
    const mt = await W.terrainMaterial([{ name: 'brown_mud_dry', tile: 2.4, tint: 0x8a7a68 }, { name: 'mud_cracked_dry_03', tile: 2.2, tint: 0x9a8a78 }, { name: 'sandy_gravel', tile: 3 }], { macro: 0.2 });
    T = W.terrain({ size: 1600, seg: 460, warp: 0.1, centre: [0, 0], height, material: mt, weights: (x, z) => [1, 0.5 * sstep(-0.2, 0.5, n(x / 8, z / 8)), 0.2] });
    add(S, T.mesh);
    const lag = seaMat({ colA: 0x120c06, colB: 0x18100a, shallow: 0x2a2012, foam: 0, rough: 0.09, tile: 9, flow: [0.004, 0.002], opacity: 1, envI: 0.22 });
    const water = new THREE.Mesh(waterSheet({ rect: [-800, -1500, 800, 20], seg: [300, 300], y: -0.08, bed: height }), lag); add(S, water); S.updaters.push((t) => lag.userData.update(t));
    const rd = W.scatterPoints({ seed: seed + 2, count: 1100, rect: [-40, -6, 40, 14], heightAt: (x, z) => Math.max(height(x, z), -0.1), s: [0.7, 1.3], area: (x, z) => { const d = z - (6 + 4 * Math.sin(x / 19) + 2 * Math.sin(x / 7)); return Math.abs(d + 0.5) < 2.5 && n(x / 4, z / 4) > 0.1 && Math.abs(x - 1.5) > 5 ? 1 : 0; } });
    const rb = reeds(rd, { h: 1.8, color: 0x5a5a34, wind: 0.35 }); add(S, rb); S.updaters.push((t) => { rb.userData.U.time.value = t; });
    const mist = mistLayer({ rect: [-200, -400, 200, 10], y: 0.15, layers: 4, gap: 0.6, color: 0xe8a888, op: 0.3, speed: [0.12, 0.03], scale: 0.035 }); add(S, mist); S.updaters.push((t, o) => mist.userData.update(t, o.mist ?? 1));
    cameras = {
      hero:  { pos: [1.5, 0.9, 7.5], look: [0, 0.6, -200], fov: 34 },                    // the red disc on the dark lagoon, reeds in silhouette
      reeds: { pos: [-3, 0.7, 10.5], look: [0, 1.2, -60], fov: 42 },
      wide:  { pos: [20, 14, 40], look: [-10, 0, -150], fov: 44 },
    };
    props = { water, lagoon: lag, reeds: rb, mist };
  } else {
    height = (x, z) => 0.1 * n(x / 7, z / 7) + 0.03 * n2(x * 1.5, z * 1.5) + 22 * sstep(60, 160, -z) * Math.exp(-(((x - 30) / 260) ** 2)) * (0.6 + 0.4 * W.ridged(n2, x / 50, z / 50, 4)) + 30 * sstep(300, 700, Math.hypot(x, z)) * W.fbm(n, x / 200, z / 200, 3);
    const mt = await W.terrainMaterial([{ name: 'cracked_red_ground', tile: 2.6, tint: 0xf0dcc4 }, { name: 'dry_ground_rocks', tile: 3 }, { name: 'red_sand', tile: 3.4, tint: 0xf0dcc8 }], { macro: 0.24 });
    T = W.terrain({ size: 1600, seg: 460, warp: 0.1, centre: [0, -10], height, material: mt, weights: (x, z, h, sl) => [1, sstep(0.15, 0.35, sl) * 1.5 + 0.2, 0.5 * sstep(0, 0.6, n(x / 12, z / 12))] });
    add(S, T.mesh);
    const shelters = [];
    for (const [x, z, ry, c] of [[-6, -4, 0.3, 0xe0d4bc], [-1.5, -9, -0.2, 0xc8b49a], [4.5, -5.5, 0.6, 0xd8c8b0], [9, -12, 0.1, 0xb8a080]]) { const sh = await shelter({ w: 2.8, d: 2.2, h: 1.7, seed: x * 3 | 0, color: c }); sh.position.set(x, height(x, z) - 0.03, z); sh.rotation.y = ry; add(S, sh); shelters.push(sh); }
    add(S, await W.groundCover({ heightAt: height, focus: [0, 0], radius: 30, seed: seed + 4, pebbles: 900, rocks: 40, tuftN: 40, tuftColor: 0xa89060, boulders: 20 }));
    const dust = mistLayer({ rect: [-150, -200, 150, 30], y: 0.2, layers: 3, gap: 0.8, color: 0xe8c8a0, op: 0.18, speed: [0.3, 0.05], scale: 0.05 }); add(S, dust); S.updaters.push((t, o) => dust.userData.update(t, o.dust ?? 1));
    const ridgeZ = -110; for (let i = 0; i < 8; i++) { const x = -40 + i * 3.2; slots[`caravan_${i + 1}`] = [x, height(x, ridgeZ), ridgeZ, -Math.PI / 2]; }
    const MG = [40, 30]; slots.ruler = [MG[0], height(...MG), MG[1], Math.PI];
    for (let i = 0; i < 10; i++) { const a = Math.PI * (0.15 + 0.7 * i / 9), x = MG[0] + Math.cos(a) * 5, z = MG[1] - Math.sin(a) * 5 + 6; slots[`crowd_${i + 1}`] = [x, height(x, z), z, Math.atan2(MG[0] - x, MG[1] - z)]; }
    cameras = {
      hero:    { pos: [-2, 1.2, 12], look: [3, 1.0, -120], fov: 40 },                   // sunrise over the bare plain, thin shelters
      shelter: { pos: [-1.5, 1.0, 1.5], look: [-1.5, 1.2, -9], fov: 44 },
      ridge:   { pos: [-10, 2, 20], look: [-25, 18, ridgeZ], fov: 30 },
      meeting: { pos: [MG[0] + 2, height(...MG) + 2.4, MG[1] + 16], look: [MG[0], height(...MG) + 1.2, MG[1]], fov: 42 },
      wide:    { pos: [30, 20, 60], look: [0, 0, -60], fov: 46 },
    };
    props = { shelters, dust };
  }
  return finish(S, 'journeys', cameras, { ...props, terrain: T, sky: S.atmo.sky, sun: S.atmo.sun }, slots, { bloom: 0.25, bloomThreshold: 0.85 });
}

// coins: stamped discs (canvas relief normal + colour), instanced
function coinMaterial(kind = 'silver') {
  const relief = cachedTex('coinN', () => { const N = 256, H = new Float32Array(N * N), r = W.rng(9);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / N - 0.5, y = j / N - 0.5, d = Math.hypot(x, y);
      let h = sstep(0.47, 0.44, d) * 0.4 + (d > 0.38 && d < 0.43 ? 0.25 * (0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 60)) : 0);
      h += (d < 0.3 ? 0.35 * sstep(0.3, 0.15, Math.abs(Math.sin(x * 14 + Math.cos(y * 9) * 2) * 0.3 + y * 0.8)) : 0) + 0.04 * r(); H[j * N + i] = h; }
    return normalFromHeight(N, N, H, 6); });
  return new THREE.MeshStandardMaterial({ color: kind === 'gold' ? 0xe8b048 : 0xd0d0cc, metalness: 1, roughness: kind === 'gold' ? 0.28 : 0.32, normalMap: relief, normalScale: new THREE.Vector2(0.9, 0.9) });
}
function coinPile(material, { n = 40, r0 = 0.012, cx = 0, cy = 0, cz = 0, spread = 0.07, seed = 2 } = {}) {
  const g = new THREE.CylinderGeometry(r0, r0, r0 * 0.16, 40, 1); const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * r0) + 0.5, p.getZ(i) / (2 * r0) + 0.5);
  const im = new THREE.InstancedMesh(g, material, n), r = W.rng(seed), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * spread * (1 - i / n * 0.6), y = cy + r0 * 0.1 + (i / n) * spread * 0.45 * (1 - d / spread);
    E.set((r() - 0.5) * 0.5, r() * TAU, (r() - 0.5) * 0.5); M4.compose(V3(cx + Math.cos(a) * d, y, cz + Math.sin(a) * d), Q.setFromEuler(E), V3(1, 1, 1)); im.setMatrixAt(i, M4); }
  im.castShadow = im.receiveShadow = true; return im;
}
function ladder(mat, { h = 2.6, w = 0.45 } = {}) { const g = new THREE.Group();
  for (const s of [-1, 1]) { const rl = W.rbox(0.05, h, 0.06, mat, { r: 0.012 }); rl.position.x = s * w / 2; g.add(rl); }
  for (let y = 0.25; y < h - 0.1; y += 0.3) { const rg = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.018, 0.018, w, 12).rotateZ(Math.PI / 2)), mat); rg.position.y = y; g.add(W.shadows(rg)); }
  return g; }
function tallyTexture(n = 7) { return canvasTex(256, 128, (x) => { x.clearRect(0, 0, 256, 128); for (let i = 0; i < n; i++) { const X = 20 + i * 30 + (i % 5 === 4 ? 0 : 0); x.strokeStyle = 'rgba(60,38,22,0.85)'; x.lineWidth = 6; x.lineCap = 'round';
  x.beginPath(); x.moveTo(X, 22 + (i % 2) * 4); x.lineTo(X + 6, 104 - (i % 3) * 3); x.stroke(); x.strokeStyle = 'rgba(240,215,180,0.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X + 4, 22); x.lineTo(X + 10, 104); x.stroke(); } }, { repeat: false }); }

// ================================================================== CITY OF OLD (the town the youths fled and the hill village)
// A town of flat-roofed mud-brick and stone houses terraced on a hillside, lanes with old olive trees, a market corner
// with a table of silver coins, and one courtyard house. yard: 'tools' (lesson 3: clay wall with thumb-scratched tally
// marks, ladder, rope coil, spade and basket by a low doorway, an olive tree, a coop) | 'adornment' (lesson 7: date palm
// in the corner, water jar, wall niche lamp, a woven mat with a dish of gold coins and a silver bracelet, a child's
// sandals and a toy hoop, a bowl of bread and dates, a palm sapling in a pot). Windows and doorway lamps glow at
// dusk/night (props.setLights(k)). time: 'dusk' | 'night' | 'day' | 'golden' | 'dawn'. Lessons 1 (lights), 3, 7, 11, (19: coins).
export async function city_of_old({ time = 'dusk', seed = 11, yard = 'tools' } = {}) {
  const S = await base('city_of_old', time === 'dawn' ? 'overcast' : time, { sun: { azim: 200 }, shadowBox: 16, focus: [0, 1, 0], fog: 0.003 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1);
  const height = (x, z) => { const t = Math.max(0, -z - 6) * 0.22; const q = Math.floor(t / 1.6) * 1.6 + 1.6 * sstep(0.75, 1, (t / 1.6) % 1); return lerp(t, q, 0.7) + 0.04 * n(x / 3, z / 3) + 30 * sstep(150, 450, Math.hypot(x, z)) * W.fbm(n2, x / 150, z / 150, 4); };
  const mt = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3, tint: 0xece0cc }, { name: 'gravel_road', tile: 2.4, tint: 0xe8dcc8 }, { name: 'brown_mud_dry', tile: 2.4 }], { macro: 0.2 });
  const lane = (x, z) => Math.min(Math.abs(x - 7.5), Math.abs(z - 8));
  const T = W.terrain({ size: 1000, seg: 500, warp: 0.08, centre: [0, 0], height, material: mt, weights: (x, z) => [1, (1 - sstep(1.2, 2.2, lane(x, z))) * 1.5, 0.3 + 0.4 * n(x / 4, z / 4)] });
  add(S, T.mesh);
  const hy = height, [mud, wash, stone, pl, dpl] = await Promise.all([MATS.mudPlaster(), MATS.whitewash(), MATS.rustic(), MATS.planks(), MATS.darkPlanks()]);
  // ---- the courtyard house (origin centre of the yard, open toward +z; house block at the back)
  const YW = 8, YD = 7, gy = hy(0, 0);
  const wl = (w, h, d, x, z, m = mud) => { const b = W.rbox(w, h, d, m, { r: 0.06, seg: 3 }); b.position.set(x, gy - 0.05, z); add(S, b); return b; };
  wl(YW + 0.5, 2.4, 0.45, 0, YD / 2, stone); wl(0.45, 2.4, YD, -YW / 2, 0, stone); wl(0.45, 2.4, YD, YW / 2, 0, stone);
  const house = await mudHouse({ w: YW + 0.5, d: 4.5, h: 3.4, seed, door: true, shutters: true, plaster: yard === 'adornment' ? MATS.whitewash() : null }); house.position.set(0, gy - 0.05, -YD / 2 - 2.2); add(S, house);
  const doorX = house.userData.door ? house.userData.door.group.position.x : 0;
  const floor = await W.pbr(yard === 'adornment' ? 'clay_plaster' : 'brown_mud_dry', { tile: 2, res: 1024, tint: 0xe8d8c0 }); const fl = new THREE.Mesh(new THREE.PlaneGeometry(YW, YD).rotateX(-Math.PI / 2), floor);
  { const uv = fl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * YW, uv.getY(i) * YD); } fl.position.set(0, gy + 0.005, 0); fl.receiveShadow = true; add(S, fl);
  const front = V3(doorX, gy, -YD / 2 + 0.3);
  const P = {};
  const lamps = [];
  if (yard === 'tools') {
    // tally marks on the inner face of the west wall, beside the lined-up tools
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshStandardMaterial({ map: tallyTexture(7), transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 })); tm.rotation.y = Math.PI / 2; tm.position.set(-YW / 2 + 0.226, gy + 1.35, -1.8); add(S, tm); P.tally = tm;
    const lad = ladder(dpl); lad.position.set(front.x + 1.3, gy, front.z - 0.05); lad.rotation.x = -0.28; add(S, lad); P.ladder = lad;
    const pts = []; for (let i = 0; i <= 500; i++) { const a = i / 500 * TAU * 8, rr0 = 0.16 + 0.004 * a; pts.push(V3(Math.cos(a) * 0.17, 0.016 * i / 62 + 0.012, Math.sin(a) * 0.17)); }
    const coil = W.rope(pts, 0.012); coil.position.set(front.x - 0.9, gy, front.z + 0.35); add(S, coil); P.rope = coil;
    const spade = new THREE.Group(); spade.add(W.shadows(new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.018, 0.02, 1.2, 12)), pl))); const bl = W.rbox(0.2, 0.28, 0.012, W.ironMat(), { r: 0.006 }); bl.position.y = -0.74; spade.add(bl);
    spade.position.set(front.x - 1.4, gy + 0.88, front.z + 0.08); spade.rotation.set(-0.18, 0, 0.06); add(S, spade); P.spade = spade;
    const bk = GR.makeBasket(THREE, { radius: 0.2, height: 0.24, seed: 4 }); bk.object3d.position.set(front.x - 0.35, gy, front.z + 0.4); add(S, W.shadows(bk.object3d)); P.basket = bk.object3d;
    const ol = GR.makeTree(THREE, { species: 'olive', seed: seed + 2 }); ol.set(1, 0.6); ol.object3d.position.set(2.4, gy, 1.2); ol.object3d.scale.setScalar(1.15); add(S, ol.object3d); P.olive = ol.object3d;
    const coop = new THREE.Group(); const cb = W.rbox(0.9, 0.6, 0.6, pl, { r: 0.02 }); coop.add(cb); for (let i = 0; i < 6; i++) { const sl = W.rbox(0.03, 0.5, 0.02, dpl, { r: 0.005 }); sl.position.set(-0.38 + i * 0.15, 0.05, 0.31); coop.add(sl); }
    const roof = W.rbox(1.0, 0.05, 0.75, dpl, { r: 0.01 }); roof.position.y = 0.6; roof.rotation.x = 0.12; coop.add(roof); coop.position.set(YW / 2 - 0.8, gy, -0.6); coop.rotation.y = -Math.PI / 2; add(S, W.shadows(coop)); P.coop = coop;
    const L = oilLamp(S, { seed: 2, light: time === 'day' ? 0.2 : 1.4 }); L.position.set(front.x + 0.55, gy + 0.02, front.z - 0.25); add(S, L); lamps.push(L);
  } else {
    const palm = GR.makeTree(THREE, { species: 'date_palm', seed: seed + 5 }); palm.set(1, 0.7); palm.object3d.position.set(-YW / 2 + 1.0, gy, YD / 2 - 1.0); palm.object3d.scale.setScalar(1.25); add(S, palm.object3d); P.palm = palm.object3d;
    const jar = clayJar({ h: 0.75, r: 0.27, seed }); jar.position.set(YW / 2 - 0.7, gy, -1.6); add(S, jar); P.jar = jar;
    // the wall niche with a lamp, by the doorway
    const niche = W.rbox(0.42, 0.42, 0.16, new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }), { r: 0.02 }); niche.position.set(front.x + 1.1, gy + 1.3, -YD / 2 - 0.03 + 0.05 - 0.1); add(S, niche);
    const L = oilLamp(S, { seed: 3, light: time === 'day' ? 0.25 : 1.2 }); L.position.set(front.x + 1.1, gy + 1.33, -YD / 2 - 0.05); add(S, L); lamps.push(L); P.nicheLamp = L;
    const matTex = canvasTex(256, 256, (x) => { const rr = W.rng(3); for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const k = ((Math.floor(i / 2) + j) % 2) ? 0.82 : 1, c = (j % 32 < 3 ? [120, 52, 34] : [178, 146, 96]).map((v) => v * k * (0.9 + rr() * 0.12)); x.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; x.fillRect(i * 2, j * 2, 2, 2); } });
    const mat = W.cloth(1.6, 1.1, new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.95, side: THREE.DoubleSide }), { segW: 32, segH: 24, folds: 0.004 }); mat.rotation.x = -Math.PI / 2; mat.position.set(-0.6, gy + 0.012, 0.4); add(S, mat);
    { const uv = mat.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 1.1); }
    const dish = W.lathe([[0.001, 0], [0.12, 0.004], [0.16, 0.025], [0.165, 0.03], [0.15, 0.028], [0.11, 0.01], [0.001, 0.008]], W.brassMat(), { seg: 72 }); dish.position.set(-0.85, gy + 0.016, 0.3); add(S, dish); P.dish = dish;
    const gold = coinPile(coinMaterial('gold'), { n: 46, r0: 0.011, cx: -0.85, cy: gy + 0.026, cz: 0.3, spread: 0.1, seed: 3 }); add(S, gold); P.coins = gold;
    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 16, 64), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, metalness: 1, roughness: 0.2 })); bracelet.rotation.x = Math.PI / 2 + 0.25; bracelet.position.set(-0.82, gy + 0.07, 0.31); add(S, W.shadows(bracelet)); P.bracelet = bracelet;
    const sandal = (x, z, ry) => { const g = new THREE.Group(), lea = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.7 }); const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.012, 32).scale(0.75, 1, 2), lea); sole.position.y = 0.006; g.add(sole);
      for (const zz of [0.02, -0.03]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 24, Math.PI), lea); st.position.set(0, 0.006, zz); g.add(st); } g.position.set(x, gy + 0.005, z); g.rotation.y = ry; add(S, W.shadows(g)); return g; };
    P.sandals = [sandal(front.x - 0.5, front.z + 0.5, 0.2), sandal(front.x - 0.38, front.z + 0.55, -0.1)];
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 12, 96), dpl); hoop.position.set(front.x - 0.75, gy + 0.22, front.z + 0.12); hoop.rotation.set(0.15, 0.3, 0); add(S, W.shadows(hoop)); P.hoop = hoop;
    const bowl = await W.prop('wooden_bowl_01', { pos: [-0.25, gy + 0.014, 0.55], height: 0.08 }); add(S, bowl); P.bowl = bowl;
    const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.018, 40), new THREE.MeshStandardMaterial({ color: 0xc89058, roughness: 0.85 })); bread.position.set(-0.27, gy + 0.07, 0.53); bread.rotation.z = 0.2; add(S, W.shadows(bread));
    const dm = new THREE.MeshPhysicalMaterial({ color: 0x5a2a10, roughness: 0.35, clearcoat: 0.6 }); for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12).scale(1, 1, 1.7), dm); d.position.set(-0.22 + (i % 3) * 0.02, gy + 0.07 + Math.floor(i / 3) * 0.008, 0.57 + (i % 2) * 0.015); d.rotation.y = i; add(S, W.shadows(d)); }
    const pot = await W.prop('planter_pot_clay', { pos: [0.6, gy, 0.9], height: 0.3 }); add(S, pot); const sap = GR.makeTree(THREE, { species: 'date_palm', seed: seed + 9 }); sap.set(0.12, 0); sap.object3d.position.set(0.6, gy + 0.27, 0.9); add(S, sap.object3d); P.sapling = { pot, tree: sap };
  }
  // ---- the town around: terraced houses up the hill, a lane with old olive trees, a family doorway with a lamp
  const r = W.rng(seed + 3), houses = [], windows = [];
  const glowM = new THREE.MeshStandardMaterial({ color: 0x1a1008, emissive: 0xffa040, emissiveIntensity: 0, roughness: 1 });
  for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 120, z = -12 - r() * 110; if (Math.abs(x - 7.5) < 3) continue; const w = 5 + r() * 4, d = 5 + r() * 3, h = 3 + r() * 2;
    const hb = W.rbox(w, h, d, i % 3 ? mud : (i % 2 ? wash : stone), { r: 0.1, seg: 2 }); hb.position.set(x, hy(x, z) - 0.2, z); hb.rotation.y = (r() - 0.5) * 0.2; add(S, hb); houses.push(hb);
    for (let k = 0; k < 2; k++) { const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), glowM); wdw.position.set(x - w / 4 + k * w / 2, hy(x, z) + 1.6, z + d / 2 + 0.01); add(S, wdw); windows.push(wdw); } }
  for (const [x, z] of [[-9, 3], [-12, 9], [10, 4]]) { const hg = await mudHouse({ w: 6, d: 5, h: 3.2, seed: x * 7 | 0 }); hg.position.set(x, hy(x, z) - 0.05, z); hg.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; add(S, hg); houses.push(hg); }
  const olives = []; for (const [x, z, sd] of [[5, 5, 1], [10.5, 12, 2], [4.6, 15, 3]]) { const t = GR.makeTree(THREE, { species: 'olive', seed: seed + sd * 11 }); t.set(1, 0.4); t.object3d.position.set(x, hy(x, z), z); t.object3d.scale.setScalar(1.4); add(S, t.object3d); olives.push(t.object3d); }
  const fam = await mudHouse({ w: 6, d: 5, h: 3.2, seed: seed + 50 }); fam.position.set(7.5, hy(7.5, 22), 22); fam.rotation.y = Math.PI; add(S, fam);
  const famLamp = oilLamp(S, { seed: 7, light: time === 'day' ? 0.2 : 1.6 }); const fd = fam.userData.door?.group.position.x ?? 0; famLamp.position.set(7.5 - fd + 0.5, hy(7.5, 19.3) + 0.02, 19.35); add(S, famLamp); lamps.push(famLamp);
  const famStep = W.rbox(1.6, 0.25, 0.5, stone, { r: 0.03 }); famStep.position.set(7.5 - fd, hy(7.5, 19.2) - 0.05, 19.2); add(S, famStep);
  // market corner: a table of silver coins
  const tbl = await W.prop('wooden_table_02', { pos: [12.5, hy(12.5, 6), 6], height: 0.8, ry: 0.4 }); add(S, tbl);
  const silver = coinPile(coinMaterial('silver'), { n: 60, r0: 0.012, cx: 12.5, cy: hy(12.5, 6) + 0.8, cz: 6, spread: 0.13, seed: 5 }); add(S, silver);
  const setLights = (k) => { glowM.emissiveIntensity = 1.6 * k; lamps.forEach((l) => l.userData.flame.visible = k > 0.02 || time === 'day'); };
  const lightK = { night: 1, dusk: 0.8, golden: 0.25, day: 0, dawn: 0.4 }[time] ?? 0.5; setLights(lightK);
  S.updaters.push((t, o) => { if (o.lights !== undefined) setLights(o.lights); });
  const cameras = {
    hero:     { pos: [-1.8, gy + 1.55, YD / 2 - 0.5], look: [doorX + 0.4, gy + 1.0, -YD / 2], fov: 50 },        // the courtyard toward the low doorway
    doorway:  { pos: [front.x + 0.4, gy + 1.0, front.z + 2.2], look: [front.x - 0.4, gy + 0.4, front.z], fov: 44 },
    tally:    { pos: [-YW / 2 + 0.9, gy + 1.45, -1.55], look: [-YW / 2 + 0.23, gy + 1.35, -1.8], fov: 34 },
    mat:      { pos: [-0.5, gy + 0.32, 0.78], look: [-0.82, gy + 0.03, 0.3], fov: 36 },
    town:     { pos: [7.5, hy(7.5, 30) + 1.7, 30], look: [-5, 8, -60], fov: 46 },                                // the town up the hill, windows glowing
    lane:     { pos: [7.2, hy(7.2, 2) + 1.6, 2], look: [7.5, hy(7.5, 20) + 1.2, 20], fov: 44 },                  // the lane of olive trees to the family doorway
    coins:    { pos: [12.9, hy(12.5, 6) + 1.05, 6.45], look: [12.5, hy(12.5, 6) + 0.8, 6], fov: 32 },
    far:      { pos: [20, 60, 160], look: [0, 10, -40], fov: 30 },                                               // the town far below the goat path
  };
  const slots = { man_tools: [front.x, gy, front.z + 1.4, Math.PI], hand_wall: [-YW / 2 + 0.6, gy, -1.8, -Math.PI / 2], child_lane: [7.5, hy(7.5, 9), 9, 0], traveller_1: [7.2, hy(7.2, 6), 6, 0], traveller_2: [8.0, hy(8, 5), 5, 0],
    parent_1: [7.5 - fd - 0.4, hy(7.5, 19.2) + 0.2, 19.2, Math.PI], parent_2: [7.5 - fd + 0.4, hy(7.5, 19.2) + 0.2, 19.2, Math.PI], buyer: [12.6, hy(12.6, 6.9), 6.9, Math.PI] };
  return finish(S, 'city_of_old', cameras, { ...P, house, houses, windows, olives, lamps, setLights, silverCoins: silver, table: tbl, familyHouse: fam, terrain: T, sun: S.atmo.sun }, slots);
}

// ================================================================== NIGHT SHORE (if the sea were ink)
// A quiet pebbled shore at night under stars and a half moon, black water with silver ripples. On a driftwood table
// at the water's edge: a clay inkwell (props.setInk(q): the ink level falls), a cut reed pen, and a sheet of aged
// parchment with abstract strokes that glow faintly gold as they are drawn (props.setWriting(q)). props.setTide(q):
// the sea draws back down the shore, leaving wet stones (pure). Lesson 15.
export async function night_shore({ seed = 150 } = {}) {
  const S = await base('night_shore', 'night', { sun: { elev: 24, azim: 262 }, moon: { dir: dirFrom(24, 262), phase: 0.5 }, envI: 0.5, shadowBox: 8, focus: [0, 0.6, 0], fog: 0.004, exposure: 1.6 });
  const n = W.noise2(seed);
  const height = (x, z) => 0.07 * z + 0.04 * n(x / 2, z / 2) - 0.0008 * z * z * (z < 0 ? 1 : 0) + 8 * sstep(40, 160, z) * W.fbm(n, x / 80, z / 80, 3);
  const mt = await W.terrainMaterial([{ name: 'sandy_gravel', tile: 1.6 }, { name: 'gravel_road', tile: 1.4 }, { name: 'sand_01', tile: 3 }], { macro: 0.2 });
  const T = W.terrain({ size: 1200, seg: 520, warp: 0.06, centre: [0, 2], height, material: mt, weights: (x, z) => [1, 0.6 + 0.4 * n(x / 3, z / 3), sstep(4, 12, z)] });
  add(S, T.mesh);
  add(S, await W.scatter('rock_09', W.scatterPoints({ seed: seed + 1, count: 2600, rect: [-14, -8, 14, 9], heightAt: height, s: [0.25, 1.4], sink: 0.004 }), { tint: 0x8a8a90, matte: false }));
  const ocean = oceanMaterial({ colA: 0x020408, colB: 0x020408, shallow: 0x04080a, foam: 0, rough: 0.06, tile: 3.5, flow: [0.01, 0.004], opacity: 1, envI: 0.12 });
  ocean.userData.U.swellK.value = 0.35;
  const sea = new THREE.Mesh(warpedSheet(5000, 360, 0.01), ocean); sea.position.z = -1.5; add(S, sea);
  const setTide = (q) => { q = clamp(q); sea.position.y = -0.04 - 0.22 * q; sea.position.z = -1.5 - 3.2 * q; };
  // the driftwood table, the inkwell, the reed pen, the parchment
  const drift = (await MATS.planks()).clone(); drift.color.set(0x8a8478);
  const table = new THREE.Group(); const top = W.rbox(1.1, 0.06, 0.6, drift, { r: 0.025, seg: 3 }); top.position.y = 0.72; table.add(top);
  for (const [x, z] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) { const leg = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.035, 0.045, 0.74, 12)), drift); leg.position.set(x, 0.37, z); leg.rotation.set(z * 0.12, 0, x * 0.1); table.add(W.shadows(leg)); }
  table.position.set(0, height(0, 0.6) - 0.02, 0.6); add(S, W.shadows(table));
  const ty = table.position.y + 0.75;
  const well = W.lathe([[0.001, 0], [0.045, 0.002], [0.05, 0.03], [0.042, 0.055], [0.025, 0.065], [0.024, 0.075], [0.03, 0.078], [0.022, 0.075], [0.02, 0.03], [0.001, 0.028]], new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.6 }), { seg: 64 });
  well.position.set(0.32, ty, 0.55); add(S, well);
  const ink = new THREE.Mesh(new THREE.CircleGeometry(0.0205, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.02, clearcoat: 1 })); add(S, ink);
  const setInk = (q) => { q = clamp(q); ink.position.set(0.32, ty + 0.068 - 0.035 * q, 0.55); };
  const pen = new THREE.Group(); const shaft = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.005, 0.006, 0.24, 16)), new THREE.MeshStandardMaterial({ color: 0xc8a870, roughness: 0.5 })); pen.add(W.shadows(shaft));
  const nib = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.4 })); nib.position.y = -0.135; nib.rotation.x = Math.PI; pen.add(nib);
  pen.position.set(0.05, ty + 0.012, 0.66); pen.rotation.set(Math.PI / 2, 0, 0.35); add(S, pen);
  // parchment: aged texture, abstract calligraphic strokes revealed along their length (no legible text)
  const strokeCanvas = (gold) => canvasTex(1024, 768, (x) => { const rr = W.rng(31);
    if (!gold) { x.fillStyle = '#d8c49a'; x.fillRect(0, 0, 1024, 768); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${rr() < 0.5 ? '120,90,50' : '255,240,210'},${0.03 + rr() * 0.05})`; x.beginPath(); x.arc(rr() * 1024, rr() * 768, 2 + rr() * 18, 0, TAU); x.fill(); }
      const gr = x.createRadialGradient(512, 384, 200, 512, 384, 620); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,60,30,0.45)'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 768); }
    else { x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 768); }
    x.lineCap = 'round';
    for (let k = 0; k < 7; k++) { const y0 = 120 + k * 85; x.strokeStyle = gold ? '#fff' : 'rgba(25,18,12,0.9)'; x.lineWidth = 9 + (k % 3) * 3; x.beginPath(); x.moveTo(900, y0);
      for (let s = 0; s <= 40; s++) { const X = 900 - s * 20, Y = y0 + 18 * Math.sin(s * 0.7 + k) + (s % 9 === 4 ? -40 : 0); x.lineTo(X, Y); } x.stroke(); } }, { repeat: false });
  const reveal = { value: 0 };
  const parchM = new THREE.MeshStandardMaterial({ map: strokeCanvas(false), roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffc860, emissiveMap: strokeCanvas(true), emissiveIntensity: 0.0 });
  parchM.onBeforeCompile = (s) => { s.uniforms.reveal = reveal; s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float reveal;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= smoothstep(reveal + 0.02, reveal - 0.02, 1. - vEmissiveMapUv.x) * step(0.001, reveal);'); };
  const parch = W.cloth(0.5, 0.37, parchM, { segW: 40, segH: 30, folds: 0.002, sag: (u, v) => 0.006 * (Math.pow(u * 2 - 1, 6) + Math.pow(v * 2 - 1, 8)) });
  { const uv = parch.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.5, uv.getY(i) / 0.37); }
  parch.rotation.x = -Math.PI / 2; parch.position.set(-0.12, ty + 0.004, 0.58); add(S, parch);
  const setWriting = (q) => { reveal.value = clamp(q); parchM.emissiveIntensity = 0.9 * sstep(0, 0.05, q); };
  setTide(0); setInk(0); setWriting(0);
  S.updaters.push((t, o) => { ocean.userData.update(t); if (o.tide !== undefined) setTide(o.tide); if (o.ink !== undefined) setInk(o.ink); if (o.writing !== undefined) setWriting(o.writing); });
  const cameras = {
    hero:   { pos: [0.75, ty + 0.22, 1.55], look: [-0.6, ty - 0.35, -8], fov: 46 },                 // table height, the sea and the moon glint beyond
    ink:    { pos: [0.4, ty + 0.21, 0.69], look: [0.32, ty + 0.055, 0.55], fov: 34 },
    parchment: { pos: [-0.05, ty + 0.42, 0.95], look: [-0.12, ty, 0.56], fov: 38 },
    shore:  { pos: [2.5, 1.1, 3.5], look: [-1, 0, -4], fov: 46 },
    sky:    { pos: [0, 1.3, 3], look: [-2, 12, -40], fov: 60 },
  };
  return finish(S, 'night_shore', cameras, { table, inkwell: well, ink, pen, parchment: parch, sea, ocean, setTide, setInk, setWriting, terrain: T, moon: S.atmo.sky, stars: S.atmo.stars }, { writer_hand: [0.1, height(0.1, 1.15), 1.15, Math.PI] });
}

// all builders by name (for the gallery and lesson films)
export const SETS = { mountain_cave, city_of_old, two_gardens, rain_on_plants, confluence, sea_boat, village_wall, journeys, mountain_pass_barrier, night_shore };
