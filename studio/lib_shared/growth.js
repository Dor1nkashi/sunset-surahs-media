// growth.js: realistic plant growth for three.js films (Motion Reel). See GROWTH.md.
//
// Every object here is a PURE FUNCTION OF ITS INPUTS: setGrowth(g), setFruit(f), setGerm(g) recompute
// every vertex / instance from scratch, no state carried between calls, seeded randomness only.
// THREE is passed in (no import), so the module works with any three.js >= 0.160 instance.
//
//   makeTree(THREE, { species: 'orange'|'olive'|'date_palm'|'generic', seed })
//   makeRoots(THREE, { seed, depth, spread, origin, obstacles })
//   makeSoilCutaway(THREE, { w, h, d, seed })     (has .seed = makeSeed(...))
//   makeSeed(THREE, { size, seed })
//   makeGround(THREE, { size, seed, clear })      realistic ground + grass for tree shots
//   makeBasket(THREE, { radius, height })         woven basket with fruit slots
//   fallingFruit({ from, to, t0, radius })        closed-form fall + bounce + settle (t) -> pose
//
// Growth is structural: lengths grow from the apical tips (a branch prefix never moves once laid
// down), girth comes from a pipe model of everything grown beyond each ring, children break bud
// only after the parent tip has passed their node, leaves unfold from a folded bud, fruit swells
// from the flower's ovary and changes colour.

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rr = (R, a, b) => a + (b - a) * R();
const ri = (R, a, b) => Math.floor(a + (b + 1 - a) * R());

// ------------------------------------------------------------------ small vector helpers (arrays)
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function randUnit(R) { const z = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }
function anyPerp(t) { const a = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; return norm(cross(t, a)); }
// rotate v about unit axis k by angle a (Rodrigues)
function rotAxis(v, k, a) {
  const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), kd = dot(k, v);
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}
// write a basis (X,Y,Z columns scaled) + position into a Float32Array instance matrix slot
function writeMat(arr, i, X, Y, Z, P, sx, sy = sx, sz = sx) {
  const o = i * 16;
  arr[o] = X[0] * sx; arr[o + 1] = X[1] * sx; arr[o + 2] = X[2] * sx; arr[o + 3] = 0;
  arr[o + 4] = Y[0] * sy; arr[o + 5] = Y[1] * sy; arr[o + 6] = Y[2] * sy; arr[o + 7] = 0;
  arr[o + 8] = Z[0] * sz; arr[o + 9] = Z[1] * sz; arr[o + 10] = Z[2] * sz; arr[o + 11] = 0;
  arr[o + 12] = P[0]; arr[o + 13] = P[1]; arr[o + 14] = P[2]; arr[o + 15] = 1;
}
function hideMat(arr, i) { const o = i * 16; for (let k = 0; k < 16; k++) arr[o + k] = 0; arr[o + 15] = 1; }
// basis whose Y is the given axis
function basisY(y, hint) {
  const Y = norm(y); let Z = sub(hint, mul(Y, dot(hint, Y)));
  if (len(Z) < 1e-4) Z = anyPerp(Y);
  Z = norm(Z); const X = cross(Y, Z);
  return [X, Y, Z];
}

// ------------------------------------------------------------------ procedural texture toolkit
function hash2(i, j, s) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// tileable value noise, period p lattice cells
function vnoise(x, y, p, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const m = (a) => ((a % p) + p) % p;
  const a = hash2(m(ix), m(iy), s), b = hash2(m(ix + 1), m(iy), s), c = hash2(m(ix), m(iy + 1), s), d = hash2(m(ix + 1), m(iy + 1), s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
// fbm in [0,1]; u,v in [0,1) tile; base = lattice cells at octave 0
function fbm(u, v, base, s, oct = 5, gain = 0.5) {
  let a = 1, f = base, sum = 0, n = 0;
  for (let o = 0; o < oct; o++) { sum += a * vnoise(u * f, v * f, f, s + o * 31); n += a; a *= gain; f *= 2; }
  return sum / n;
}
// separate periods for u and v (non-square textures)
function fbm2(u, v, bu, bv, s, oct = 5, gain = 0.5) {
  let a = 1, fu = bu, fv = bv, sum = 0, n = 0;
  for (let o = 0; o < oct; o++) {
    const x = u * fu, y = v * fv, ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy;
    const ux = dx * dx * (3 - 2 * dx), uy = dy * dy * (3 - 2 * dy), so = s + o * 31;
    const mx = (q) => ((q % fu) + fu) % fu, my = (q) => ((q % fv) + fv) % fv;
    const A = hash2(mx(ix), my(iy), so), B = hash2(mx(ix + 1), my(iy), so), C = hash2(mx(ix), my(iy + 1), so), D = hash2(mx(ix + 1), my(iy + 1), so);
    sum += a * lerp(lerp(A, B, ux), lerp(C, D, ux), uy); n += a; a *= gain; fu *= 2; fv *= 2;
  }
  return sum / n;
}
function dataTex(THREE, w, h, data, { srgb = true, repeat = true } = {}) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.flipY = false; t.needsUpdate = true;
  return t;
}
// height field (Float32Array w*h, wraps) -> tangent-space normal map
function normalTex(THREE, w, h, H, strength, wrap = true) {
  const d = new Uint8Array(w * h * 4);
  const at = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1); }
    return H[y * w + x];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    // flipY=false: image row y grows with uv.v, so +dy along v
    let nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (y * w + x) * 4; d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  return dataTex(THREE, w, h, d, { srgb: false, repeat: wrap });
}
const toByte = (x) => clamp(Math.round(x * 255), 0, 255);
const TEXCACHE = new WeakMap();
function cached(THREE, key, fn) {
  let m = TEXCACHE.get(THREE); if (!m) { m = new Map(); TEXCACHE.set(THREE, m); }
  if (!m.has(key)) m.set(key, fn());
  return m.get(key);
}

// bark: vertical fissured plates; neutral colour (vertex colour tints per species)
function barkTextures(THREE, kind) {
  return cached(THREE, 'bark_' + kind, () => {
    const w = 256, h = 512, H = new Float32Array(w * h), C = new Uint8Array(w * h * 4);
    const olive = kind === 'olive', palm = kind === 'palm';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      let ht, c;
      if (palm) {
        // date palm: diamond lattice of old frond bases (boots), fibrous
        const a = u * 6 + v * 6, b = u * 6 - v * 6 + 100;
        const fa = a - Math.floor(a), fb = b - Math.floor(b);
        const ridge = Math.min(Math.min(fa, 1 - fa), Math.min(fb, 1 - fb));
        const fib = fbm2(u, v, 64, 4, 7, 3);
        ht = sstep(0.0, 0.18, ridge) * 0.8 + fib * 0.25;
        c = 0.55 + 0.35 * sstep(0.02, 0.2, ridge) + (fib - 0.5) * 0.3;
      } else {
        const warp = fbm2(u, v, 4, 4, 11, 4) * 0.25;
        const n1 = fbm2(u + warp, v, olive ? 10 : 14, olive ? 3 : 2, 3, 5);
        const fiss = Math.abs(n1 - 0.5) * 2;                        // ridged noise -> long fissures
        const plates = olive ? sstep(0.08, 0.35, fiss) : sstep(0.02, 0.16, fiss);
        const grain = fbm2(u, v, 64, 32, 5, 3), blot = fbm2(u, v, 6, 6, 17, 4);
        const lent = !olive && hash2(x >> 2, y >> 1, 23) > 0.985 ? 1 : 0;             // lenticels: small pale flecks
        ht = plates * (olive ? 0.8 : 0.35) + grain * 0.3;
        c = olive ? 0.45 + 0.42 * plates + (grain - 0.5) * 0.35 : 0.8 + 0.14 * plates + (grain - 0.5) * 0.3 + (blot - 0.5) * 0.3 + lent * 0.15;
        if (!olive) ht += lent * 0.4 + (grain - 0.5) * 0.3;
        if (olive) c += (fbm2(u, v, 8, 8, 21, 3) - 0.5) * 0.4;      // lichen-like blotches
      }
      H[y * w + x] = ht;
      const o = (y * w + x) * 4, k = clamp(c, 0.05, 1);
      C[o] = toByte(k); C[o + 1] = toByte(k * 0.97); C[o + 2] = toByte(k * 0.92); C[o + 3] = 255;
    }
    return { map: dataTex(THREE, w, h, C), normalMap: normalTex(THREE, w, h, H, palm ? 6 : olive ? 9 : 5) };
  });
}

// leaf: RGBA with alpha silhouette, midrib and lateral veins. shape: 'citrus' | 'olive' | 'broad'
function leafTextures(THREE, shape) {
  return cached(THREE, 'leaf_' + shape, () => {
    const w = 128, h = 256, C = new Uint8Array(w * h * 4), H = new Float32Array(w * h);
    const half = (y) => {               // half width (0..0.5 of texture) at length fraction y (0 base .. 1 tip)
      if (shape === 'olive') return 0.46 * Math.pow(Math.sin(Math.PI * clamp(y, 0, 1)), 0.75) * (1 - 0.25 * y);
      if (shape === 'broad') return 0.48 * Math.pow(Math.sin(Math.PI * clamp(y * 0.95, 0, 1)), 0.7);
      return 0.47 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(y, 0, 1), 0.85)), 0.8);     // citrus: ovate, acuminate tip
    };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = (i + 0.5) / w - 0.5, y = (j + 0.5) / h, ax = Math.abs(x), hw = half(y);
      const edge = hw - ax, a = sstep(-0.006, 0.006, edge) * (y > 0.005 ? 1 : 0);
      const rib = Math.exp(-((ax / 0.012) ** 2));
      // faint, irregular secondary veins (spacing and angle wander), fading toward the margin
      const vw = (fbm(x + 0.5, y, 4, 9, 3) - 0.5) * 0.6, vph = ((((y - ax * (0.75 + vw * 0.3)) * 8 + vw) % 1) + 1) % 1;
      const vein = ax < hw ? Math.exp(-((vph - 0.5) ** 2) / 0.0025) * sstep(0.02, 0.1, ax) * (1 - sstep(hw * 0.6, hw * 0.95, ax)) * 0.6 : 0;
      const mottle = fbm(x + 0.5, y, 8, 3, 4);
      const rim = sstep(0.02, 0.0, edge) * a;
      let r = 0.62, g = 0.74, b = 0.5;                                  // neutral light green; instanceColor tints
      const k = 0.9 + (mottle - 0.5) * 0.14 + rib * 0.18 + vein * 0.05 + rim * 0.06;
      const o = (j * w + i) * 4;
      C[o] = toByte(r * k + rib * 0.15); C[o + 1] = toByte(g * k + rib * 0.1); C[o + 2] = toByte(b * k); C[o + 3] = toByte(a);
      H[j * w + i] = -rib * 0.5 - vein * 0.08 + (mottle - 0.5) * 0.04;
    }
    return { map: dataTex(THREE, w, h, C, { repeat: false }), normalMap: normalTex(THREE, w, h, H, 2, false) };
  });
}

// citrus peel: dense oil-gland dimples + mottling, near-white colour (instanceColor tints ripeness)
function peelTextures(THREE, kind = 'orange') {
  return cached(THREE, 'peel_' + kind, () => {
    // oil-gland pores: many small, uniform, non-accumulating dimples (min, not sum) -> fine even texture
    const w = 1024, h = 512, H = new Float32Array(w * h), C = new Uint8Array(w * h * 4), R = mulberry32(77);
    const n = kind === 'orange' ? 26000 : 3000, rad = kind === 'orange' ? 1.5 : 2;
    for (let k = 0; k < n; k++) {
      const cx = R() * w, cy = R() * h, r = rad * (0.7 + 0.6 * R()), r2 = r * r, ir = Math.ceil(r * 1.6);
      for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
        const d2 = dx * dx + dy * dy, x = (Math.floor(cx) + dx + w) % w, y = Math.floor(cy) + dy;
        if (y < 0 || y >= h) continue;
        H[y * w + x] = Math.min(H[y * w + x], -Math.exp(-d2 / r2) * 0.5);
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, m = fbm2(u, v, 8, 4, 9, 5), fine = fbm2(u, v, 256, 128, 13, 2);
      H[y * w + x] += (fine - 0.5) * 0.08;
      const k = 0.9 + (m - 0.5) * 0.1 + H[y * w + x] * 0.04, o = (y * w + x) * 4;
      C[o] = toByte(k); C[o + 1] = toByte(k * 0.98); C[o + 2] = toByte(k * 0.95); C[o + 3] = 255;
    }
    return { map: dataTex(THREE, w, h, C), normalMap: normalTex(THREE, w, h, H, kind === 'orange' ? 0.9 : 0.5) };
  });
}

// ------------------------------------------------------------------ curves + tube geometry
// A curve: fixed full-length polyline with parallel-transport frames. Growth draws a PREFIX of it.
function makeCurve(points) {
  const n = points.length, P = new Float32Array(n * 3), T = new Float32Array(n * 3), N = new Float32Array(n * 3), B = new Float32Array(n * 3), S = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = points[i][0]; P[i * 3 + 1] = points[i][1]; P[i * 3 + 2] = points[i][2]; if (i) S[i] = S[i - 1] + len(sub(points[i], points[i - 1])); }
  let nPrev = null;
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)], t = norm(sub(b, a));
    let nn = nPrev ? norm(sub(nPrev, mul(t, dot(nPrev, t)))) : anyPerp(t);
    if (!isFinite(nn[0]) || len(nn) < 0.5) nn = anyPerp(t);
    const bb = cross(t, nn); nPrev = nn;
    T.set(t, i * 3); N.set(nn, i * 3); B.set(bb, i * 3);
  }
  return { n, P, T, N, B, S, L: S[n - 1] };
}
// sample position/frame at arc length s into out {p,t,n,b}
function sampleCurve(c, s, out) {
  s = clamp(s, 0, c.L);
  let lo = 0, hi = c.n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c.S[m] <= s) lo = m; else hi = m; }
  const seg = c.S[hi] - c.S[lo], f = seg > 0 ? (s - c.S[lo]) / seg : 0;
  for (const [k, A] of [['p', c.P], ['t', c.T], ['n', c.N], ['b', c.B]]) {
    const o = out[k];
    o[0] = lerp(A[lo * 3], A[hi * 3], f); o[1] = lerp(A[lo * 3 + 1], A[hi * 3 + 1], f); o[2] = lerp(A[lo * 3 + 2], A[hi * 3 + 2], f);
  }
  return out;
}
const newSample = () => ({ p: [0, 0, 0], t: [0, 0, 0], n: [0, 0, 0], b: [0, 0, 0] });

// Many tubes in one BufferGeometry with a fixed vertex budget; rings rewritten every call.
class TubeSet {
  constructor(THREE, specs, { colors = true } = {}) {
    this.specs = specs; let nv = 0, ni = 0;
    this.off = specs.map((s) => { const o = { v: nv, i: ni }; nv += s.rings * (s.radial + 1); ni += (s.rings - 1) * s.radial * 6 + s.radial * 3; return o; });
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(nv * 3); this.nrm = new Float32Array(nv * 3); this.uv = new Float32Array(nv * 2);
    this.col = colors ? new Float32Array(nv * 3).fill(1) : null;
    const idx = new Uint32Array(ni);
    specs.forEach((s, k) => {
      const { v, i } = this.off[k], R1 = s.radial + 1; let q = i;
      for (let r = 0; r < s.rings - 1; r++) for (let a = 0; a < s.radial; a++) {
        const A = v + r * R1 + a, B = A + 1, C = A + R1, D = C + 1;
        idx[q++] = A; idx[q++] = C; idx[q++] = B; idx[q++] = B; idx[q++] = C; idx[q++] = D;
      }
      // tip cap (fan to the ring's first vertex region; harmless when the tip radius ~0)
      const last = v + (s.rings - 1) * R1;
      for (let a = 0; a < s.radial; a++) { idx[q++] = last + a; idx[q++] = last + a + 1; idx[q++] = last; }
    });
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aNrm = new THREE.BufferAttribute(this.nrm, 3); this.aUv = new THREE.BufferAttribute(this.uv, 2);
    this.aPos.setUsage(THREE.DynamicDrawUsage); this.aNrm.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('normal', this.aNrm); g.setAttribute('uv', this.aUv);
    if (colors) { this.aCol = new THREE.BufferAttribute(this.col, 3); this.aCol.setUsage(THREE.DynamicDrawUsage); g.setAttribute('color', this.aCol); }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.geometry = g;
  }
  ring(k, r, p, n, b, rad, v, col) {
    const s = this.specs[k], R1 = s.radial + 1, base = this.off[k].v + r * R1;
    for (let a = 0; a <= s.radial; a++) {
      const ang = (a / s.radial) * TAU, c = Math.cos(ang), sn = Math.sin(ang);
      const dx = n[0] * c + b[0] * sn, dy = n[1] * c + b[1] * sn, dz = n[2] * c + b[2] * sn, o = (base + a) * 3;
      this.pos[o] = p[0] + dx * rad; this.pos[o + 1] = p[1] + dy * rad; this.pos[o + 2] = p[2] + dz * rad;
      this.nrm[o] = dx; this.nrm[o + 1] = dy; this.nrm[o + 2] = dz;
      const u = (base + a) * 2; this.uv[u] = a / s.radial; this.uv[u + 1] = v;
      if (col) { this.col[o] = col[0]; this.col[o + 1] = col[1]; this.col[o + 2] = col[2]; }
    }
  }
  commit() { this.aPos.needsUpdate = true; this.aNrm.needsUpdate = true; this.aUv.needsUpdate = true; if (this.aCol) this.aCol.needsUpdate = true; }
}

// ------------------------------------------------------------------ leaf geometry + unfolding material
// Leaf in local space: midrib along +Y (0..1), blade across X (-0.5..0.5), face normal +Z.
function leafGeometry(THREE, { segX = 4, segY = 8, droop = 0.18, cup = 0.12 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY); g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -droop * y * y + cup * x * x * 4 * 0.25); }
  g.computeVertexNormals();
  // UV: plane UVs already 0..1; texture has base at v=0 (flipY false) -> v = y
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, p.getY(i));
  return g;
}
// material whose instances fold along the midrib by a per-instance 'unfold' attribute (0 folded bud, 1 open)
function leafMaterial(THREE, tex, { roughness = 0.4, sheen = 0, backLight = 1.25 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), roughness, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5, envMapIntensity: 0.7 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float unfold;\nvec3 foldv(vec3 v, float px){ float a = -(1.0 - unfold) * 1.3 * sign(px); float c = cos(a), s = sin(a); return vec3(v.x*c + v.z*s, v.y, -v.x*s + v.z*c); }\n')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = foldv(objectNormal, position.x);\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = foldv(transformed, position.x);\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= vec3(${backLight.toFixed(3)}, ${(backLight * 1.04).toFixed(3)}, ${(backLight * 0.92).toFixed(3)});\n`);
  };
  m.customProgramCacheKey = () => 'leaf-unfold-' + backLight;
  return m;
}
function leafMesh(THREE, count, tex, matOpts, geoOpts) {
  const geo = leafGeometry(THREE, geoOpts);
  const unfold = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1); unfold.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('unfold', unfold);
  const mesh = new THREE.InstancedMesh(geo, leafMaterial(THREE, tex, matOpts), count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.unfold = unfold;
  return mesh;
}
function srgb(THREE, hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }   // -> linear working space
const setCol = (arr, i, c) => { arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]; };

// ------------------------------------------------------------------ species
const SPECIES = {
  orange: {
    crown: { c: [0, 1.9, 0], r: [1.65, 1.45, 1.65], floor: 0.42 },
    trunk: { L: 0.85, lean: 0.05, gnarl: 0.06, segs: 12, radial: 20, rings: 22 },
    levels: [
      { n: [4, 5], s: [0.5, 1.0], ang: [32, 50], L: [1.4, 2.0], segs: 12, trop: 0.18, gnarl: 0.3, radial: 12, rings: 16, dur: 0.30 },
      { n: [9, 11], s: [0.18, 1.0], ang: [42, 68], L: [0.55, 1.0], segs: 8, trop: 0.02, gnarl: 0.45, radial: 8, rings: 10, dur: 0.22 },
      { n: [13, 16], s: [0.1, 1.0], ang: [35, 62], L: [0.14, 0.34], segs: 4, trop: 0.25, gnarl: 0.5, radial: 5, rings: 5, dur: 0.12 },
    ],
    pipeK: 0.0102, rMin: 0.0032, flare: 0.4,
    // leaf spacing per level (m), [sFrom fraction], abscise after (g units) or null
    leafSpacing: [[0.035, 0.1, 0.3], [0.05, 0.08, 0.36], [0.05, 0.3, null], [0.018, 0.06, null]],
    leaf: { shape: 'citrus', size: [0.075, 0.1], aspect: 0.48, elev: [40, 65], young: '#b5d36a', mature: '#2a5a22', old: '#c9a640', roughness: 0.48, droop: 0.16, cup: 0.18, back: 1.6 },
    barkKind: 'smooth', barkCol: '#9a9080', youngCol: '#93b45a',

    fruit: { kind: 'orange', sites: 190, set: 78, r: 0.037, stalk: 0.012, oblate: 0.93, unripe: '#3f6a1c', break: '#b6a530', ripe: '#ff7a05', flower: 'citrus' },
  },
  olive: {
    crown: { c: [0, 2.0, 0], r: [2.1, 1.45, 2.1], floor: 0.55 },
    trunk: { L: 0.95, lean: 0.12, gnarl: 0.22, segs: 14, radial: 22, rings: 24 },
    levels: [
      { n: [3, 4], s: [0.45, 1.0], ang: [28, 45], L: [1.5, 2.1], segs: 14, trop: 0.12, gnarl: 0.55, radial: 14, rings: 18, dur: 0.32 },
      { n: [9, 12], s: [0.2, 1.0], ang: [40, 65], L: [0.5, 0.95], segs: 8, trop: -0.05, gnarl: 0.6, radial: 8, rings: 10, dur: 0.22 },
      { n: [11, 14], s: [0.15, 1.0], ang: [30, 55], L: [0.15, 0.35], segs: 4, trop: -0.12, gnarl: 0.5, radial: 5, rings: 5, dur: 0.12 },
    ],
    pipeK: 0.0125, rMin: 0.0022, flare: 0.6,
    leafSpacing: [[0.06, 0.2, 0.2], [0.06, 0.1, 0.3], [0.04, 0.3, null], [0.012, 0.06, null]],
    leaf: { shape: 'olive', size: [0.065, 0.085], aspect: 0.2, elev: [25, 50], young: '#c1cf9a', mature: '#56684a', old: '#b8a46a', roughness: 0.55, droop: 0.06, cup: 0.25, back: 1.9 },
    barkKind: 'olive', barkCol: '#b4ad9e', youngCol: '#8f9c72',
    fruit: { kind: 'olive', sites: 420, set: 260, r: 0.0085, stalk: 0.008, oblate: 1.28, unripe: '#6f8a2a', break: '#6a3a48', ripe: '#1f1420', flower: 'olive' },
  },
  generic: {
    crown: { c: [0, 3.6, 0], r: [2.3, 2.0, 2.3], floor: 1.6 },
    trunk: { L: 1.9, lean: 0.04, gnarl: 0.08, segs: 14, radial: 20, rings: 24 },
    levels: [
      { n: [5, 6], s: [0.55, 1.0], ang: [30, 48], L: [1.8, 2.6], segs: 12, trop: 0.25, gnarl: 0.35, radial: 12, rings: 16, dur: 0.30 },
      { n: [9, 11], s: [0.2, 1.0], ang: [40, 62], L: [0.6, 1.1], segs: 8, trop: 0.05, gnarl: 0.45, radial: 8, rings: 10, dur: 0.22 },
      { n: [9, 12], s: [0.15, 1.0], ang: [35, 60], L: [0.18, 0.38], segs: 4, trop: 0.15, gnarl: 0.5, radial: 5, rings: 5, dur: 0.12 },
    ],
    pipeK: 0.0115, rMin: 0.0028, flare: 0.45,
    leafSpacing: [[0.08, 0.3, 0.3], [0.09, 0.1, 0.36], [0.07, 0.35, null], [0.026, 0.08, null]],
    leaf: { shape: 'broad', size: [0.1, 0.14], aspect: 0.62, elev: [35, 60], young: '#b9d86e', mature: '#3d7a2a', old: '#c8a03a', roughness: 0.55, droop: 0.2, cup: 0.1 },
    barkKind: 'smooth', barkCol: '#7d7266', youngCol: '#6f8a40',
    fruit: null,
  },
};

const growLen = (a) => (a <= 0 ? 0 : a >= 1 ? 1 : 1 - Math.pow(1 - a, 1.7));
const invGrow = (x) => 1 - Math.pow(1 - clamp(x), 1 / 1.7);

// ------------------------------------------------------------------ makeTree
export function makeTree(THREE, { species = 'orange', seed = 1 } = {}) {
  if (species === 'date_palm') return makeDatePalm(THREE, { seed });
  const SP = SPECIES[species] || SPECIES.generic, R = mulberry32(seed * 7919 + 17);
  const UP = [0, 1, 0], { crown } = SP;
  const inCrown = (p) => { const d = [(p[0] - crown.c[0]) / crown.r[0], (p[1] - crown.c[1]) / crown.r[1], (p[2] - crown.c[2]) / crown.r[2]]; return dot(d, d); };

  // ---- skeleton (built once, full-grown shape)
  const branches = [];
  const smp = newSample();
  function grow(start, dir, L, segs, trop, gnarl, level) {
    const ds = L / segs, pts = [start.slice()];
    let p = start.slice(), d = norm(dir);
    for (let i = 0; i < segs; i++) {
      const q = add(p, mul(d, ds));
      if (level > 0 && i > 0 && (inCrown(q) > 1 || q[1] < crown.floor)) break;   // envelope: stop at the crown surface
      p = q; pts.push(p.slice());
      d = norm(add(add(d, mul(UP, trop * ds * 2)), mul(randUnit(R), gnarl * 0.35)));
      if (level > 0) { const out = inCrown(p); if (out > 0.75) d = norm(add(d, mul(norm(sub(crown.c, p)), (out - 0.75) * 0.6))); }
    }
    if (pts.length < 2) pts.push(add(start, mul(d, ds * 0.5)));
    return pts;
  }
  const T0 = SP.trunk;
  const trunkDir = norm([rr(R, -1, 1) * T0.lean, 1, rr(R, -1, 1) * T0.lean]);
  const trunk = { level: 0, parent: null, sA: 0, curve: makeCurve(grow([0, 0, 0], trunkDir, T0.L, T0.segs, 0.05, T0.gnarl, 0)), children: [], radial: T0.radial, rings: T0.rings, b: 0, dur: 0.33 };
  branches.push(trunk);
  const queue = [trunk];
  while (queue.length) {
    const par = queue.shift(), LV = SP.levels[par.level];
    if (!LV) continue;
    const n = ri(R, LV.n[0], LV.n[1]), phi0 = R() * TAU;
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 1 : i / (n - 1), sA = lerp(LV.s[0], LV.s[1], f) * par.curve.L;
      sampleCurve(par.curve, sA, smp);
      const az = phi0 + i * 2.39996 + rr(R, -0.3, 0.3), ang = (rr(R, LV.ang[0], LV.ang[1]) * Math.PI) / 180;
      const perp = add(mul(smp.n, Math.cos(az)), mul(smp.b, Math.sin(az)));
      let dir = add(mul(smp.t, Math.cos(ang)), mul(perp, Math.sin(ang)));
      if (par.level === 0 && i === n - 1) dir = mix3(smp.t, dir, 0.4);   // leader continues the trunk
      const Lb = rr(R, LV.L[0], LV.L[1]) * (par.level >= 1 ? lerp(1, 0.55, f) : 1);   // shorter toward the tip
      const pts = grow(smp.p.slice(), dir, Lb, LV.segs, LV.trop, LV.gnarl, par.level + 1);
      const br = { level: par.level + 1, parent: par, sA, curve: makeCurve(pts), children: [], radial: LV.radial, rings: LV.rings, durBase: LV.dur * rr(R, 0.85, 1.15) };
      par.children.push(br); branches.push(br); queue.push(br);
    }
  }
  branches.forEach((b, i) => { b.id = i; b.children.sort((a, c) => a.sA - c.sA); });
  // ---- timing: child breaks bud when the parent tip has passed its node
  let maxEnd = 0;
  for (const b of branches) {
    if (b.parent) { const p = b.parent; b.b = p.b + p.dur * invGrow(b.sA / p.curve.L) + 0.02 + R() * 0.03; b.dur = b.durBase; }
    maxEnd = Math.max(maxEnd, b.b + b.dur);
  }
  const TS = 0.86 / maxEnd;
  for (const b of branches) { b.b *= TS; b.dur *= TS; }

  // ---- leaves
  const LF = SP.leaf, leaves = [];
  for (const b of branches) {
    const [sp, from, absc] = SP.leafSpacing[b.level], L = b.curve.L;
    let phi = R() * TAU;
    for (let s = Math.max(from * L, 0.02); s < L - 0.005; s += sp * rr(R, 0.8, 1.2)) {
      phi += 2.513 + rr(R, -0.25, 0.25);
      const bL = b.b + b.dur * invGrow((s + 0.015) / L);
      leaves.push({ br: b, s, az: phi, elev: (rr(R, LF.elev[0], LF.elev[1]) * Math.PI) / 180, size: rr(R, LF.size[0], LF.size[1]), roll: rr(R, -0.5, 0.5), b: bL + 0.005,
        absc: absc == null ? Infinity : bL + absc * rr(R, 0.85, 1.15), drift: randUnit(R), spin: rr(R, 3, 7), tilt: R() });
    }
    // terminal leaf cluster at twig tips
    if (b.level === SP.levels.length) for (let k = 0; k < 3; k++) {
      const s = L * (1 - 0.02 * k);
      leaves.push({ br: b, s, az: R() * TAU, elev: (rr(R, 10, 35) * Math.PI) / 180, size: rr(R, LF.size[0], LF.size[1]) * 0.8, roll: rr(R, -0.5, 0.5), b: b.b + b.dur * 0.97, absc: Infinity, drift: [0, 0, 0], spin: 0, tilt: R() });
    }
  }
  const LEAFDUR = 0.05;

  // ---- meshes
  const group = new THREE.Group(); group.name = 'tree_' + species;
  const bark = barkTextures(THREE, SP.barkKind);
  const tubes = new TubeSet(THREE, branches.map((b) => ({ rings: b.rings, radial: b.radial })));
  const barkMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.85, vertexColors: true });
  const wood = new THREE.Mesh(tubes.geometry, barkMat); wood.castShadow = true; wood.receiveShadow = true; wood.frustumCulled = false; group.add(wood);
  const ltex = leafTextures(THREE, LF.shape);
  const lm = leafMesh(THREE, leaves.length, ltex, { roughness: LF.roughness, backLight: LF.back || 1.3 }, { droop: LF.droop, cup: LF.cup });
  group.add(lm);
  const C = { young: srgb(THREE, LF.young), mature: srgb(THREE, LF.mature), old: srgb(THREE, LF.old), bark: srgb(THREE, SP.barkCol), green: srgb(THREE, SP.youngCol) };

  // final-state radii, for bark UV scale
  const state = { g: 1, f: 0, hide: null };
  const lenAt = (b, g) => b.curve.L * growLen((g - b.b) / b.dur);
  function masses(g) {
    const M = new Float32Array(branches.length), Lc = new Float32Array(branches.length);
    for (let i = branches.length - 1; i >= 0; i--) {
      const b = branches[i]; Lc[i] = lenAt(b, g); let m = Lc[i];
      for (const c of b.children) if (c.sA <= Lc[i] + 1e-6) m += M[c.id];
      M[i] = m;
    }
    return { M, Lc };
  }
  { const { M } = masses(1); for (const b of branches) b.rRef = Math.max(SP.rMin, SP.pipeK * Math.sqrt(M[b.id])); }
  const radiusAt = (b, s, l, M) => {
    let m = l - s;
    for (const c of b.children) if (c.sA >= s && c.sA <= l) m += M[c.id];
    let r = Math.max(SP.rMin * (s >= l - 1e-5 ? 0.45 : 1), SP.pipeK * Math.sqrt(Math.max(0, m)));
    if (b.level === 0) r *= 1 + SP.flare * Math.exp(-s / 0.07);
    return r;
  };

  // ---- blossoms + fruit (sites on outer twigs)
  const FR = SP.fruit, sites = [];
  let petals = null, centers = null, fruitM = null, calyx = null, stalks = null;
  if (FR) {
    const twigs = branches.filter((b) => b.level === SP.levels.length);
    const cand = [];
    for (const b of twigs) {
      for (const sf of [1.0, 0.7, 0.45]) {
        const s = b.curve.L * sf; sampleCurve(b.curve, s, smp);
        const out = inCrown(smp.p);
        cand.push({ br: b, s, w: out * (0.6 + 0.4 * R()) + (smp.p[1] > crown.c[1] - crown.r[1] * 0.6 ? 0.2 : -0.4) });
      }
    }
    cand.sort((a, b) => b.w - a.w);
    const pick = cand.slice(0, Math.min(FR.sites, cand.length));
    pick.forEach((c, i) => {
      sampleCurve(c.br.curve, c.s, smp);
      const outward = norm(sub(smp.p, crown.c));
      const axis = norm(add(add(mul(smp.t, 0.6), mul(outward, 0.6)), [0, 0.25, 0]));
      sites.push({ br: c.br, s: c.s, axis, sets: false, open: rr(R, 0, 0.06), petalDrop: rr(R, 0.0, 0.08), dropDir: randUnit(R), petalSpin: R() * TAU, ripeJit: rr(R, -0.06, 0.06), sizeJit: rr(R, 0.88, 1.1), spinY: R() * TAU });
    });
    // fruit set on a spread-out subset (every k-th by azimuth so the fruit reads all round the crown)
    const order = sites.map((s, i) => i).sort((a, b) => hash2(a, 3, seed) - hash2(b, 3, seed));
    const usedTwig = new Set(); let nSet = 0;
    for (const i of order) { if (nSet >= FR.set) break; if (usedTwig.has(sites[i].br.id)) continue; usedTwig.add(sites[i].br.id); sites[i].sets = true; nSet++; }   // one fruit per twig: no "beads on a string"

    const fruitSites = sites.filter((s) => s.sets);
    // petal mesh: 5 (citrus) or 4 (olive) per blossom
    const nP = FR.flower === 'olive' ? 4 : 5;
    const pg = new THREE.PlaneGeometry(1, 1, 3, 4); pg.translate(0, 0.5, 0);
    { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setX(i, x * (0.42 * Math.sin(Math.PI * Math.min(1, y * 0.9 + 0.1)) + 0.04)); p.setZ(i, 0.35 * x * x + 0.12 * y * y); } pg.computeVertexNormals(); }
    const pmat = new THREE.MeshStandardMaterial({ color: FR.flower === 'olive' ? 0xf3efd8 : 0xfffcf2, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x1a1a14, emissiveIntensity: 0.25 });
    petals = new THREE.InstancedMesh(pg, pmat, sites.length * nP); petals.frustumCulled = false; petals.castShadow = true; petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    petals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(sites.length * nP * 3).fill(1), 3);
    group.add(petals);
    // flower centre: style + stamens (yellow) as one small geometry
    const cg = new THREE.CylinderGeometry(0.06, 0.1, 1, 6, 1); cg.translate(0, 0.5, 0);
    const cmat = new THREE.MeshStandardMaterial({ color: 0xf2d24a, roughness: 0.6 });
    centers = new THREE.InstancedMesh(cg, cmat, sites.length); centers.frustumCulled = false; centers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(centers);
    // fruit
    const peel = peelTextures(THREE, FR.kind);
    const fg = new THREE.SphereGeometry(1, FR.kind === 'orange' ? 48 : 24, FR.kind === 'orange' ? 32 : 16);
    const fmat = new THREE.MeshPhysicalMaterial({ map: peel.map, normalMap: peel.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: FR.kind === 'orange' ? 0.42 : 0.3, clearcoat: FR.kind === 'orange' ? 0.25 : 0.6, clearcoatRoughness: 0.35 });
    fruitM = new THREE.InstancedMesh(fg, fmat, fruitSites.length); fruitM.frustumCulled = false; fruitM.castShadow = true; fruitM.receiveShadow = true;
    fruitM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fruitM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(fruitSites.length * 3).fill(1), 3);
    group.add(fruitM);
    // calyx button (5-lobed star) + stalk
    const shape = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = (k / 10) * TAU, r = k % 2 ? 0.45 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    const kg = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 }); kg.rotateX(-Math.PI / 2);
    calyx = new THREE.InstancedMesh(kg, new THREE.MeshStandardMaterial({ color: 0x4a5a22, roughness: 0.7 }), fruitSites.length); calyx.frustumCulled = false; calyx.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(calyx);
    const sg = new THREE.CylinderGeometry(1, 1, 1, 6, 1); sg.translate(0, 0.5, 0);
    stalks = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0x55603a, roughness: 0.8 }), fruitSites.length); stalks.frustumCulled = false; stalks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(stalks);
    group.userData.fruitSites = fruitSites;
  }
  const fruitSites = group.userData.fruitSites || [];
  const fruitPos = fruitSites.map(() => [0, 0, 0]), fruitRad = new Float32Array(fruitSites.length);

  // ---- the one update: everything from (g, f)
  function apply() {
    const g = state.g, f = state.f, { M, Lc } = masses(g);
    // wood
    const S = newSample();
    for (const b of branches) {
      const l = Lc[b.id], N = b.rings;
      for (let j = 0; j < N; j++) {
        const s = (l * j) / (N - 1);
        sampleCurve(b.curve, s, S);
        let r = l > 1e-5 ? radiusAt(b, s, l, M) : 0;
        if (l < 1e-5 || (b.parent && Lc[b.parent.id] < b.sA)) r = 0;
        const k = sstep(0.0035, 0.014, r), col = mix3(C.green, C.bark, k);
        tubes.ring(b.id, j, S.p, S.n, S.b, r, s / (TAU * b.rRef) / 2, col);
      }
    }
    tubes.commit();
    // leaves
    const LM = lm.instanceMatrix.array, LC = lm.instanceColor.array, UF = lm.userData.unfold.array;
    leaves.forEach((lf, i) => {
      const b = lf.br;
      if (g < lf.b || Lc[b.id] < lf.s) { hideMat(LM, i); return; }
      const age = (g - lf.b) / LEAFDUR;
      sampleCurve(b.curve, lf.s, S);
      const r = radiusAt(b, lf.s, Lc[b.id], M);
      const perp = add(mul(S.n, Math.cos(lf.az)), mul(S.b, Math.sin(lf.az)));
      const un = sstep(0.05, 1, age), grow = 0.3 + 0.7 * sstep(0, 1.25, age);

      let m = norm(add(mul(S.t, Math.cos(lf.elev * (0.35 + 0.65 * un))), mul(perp, Math.sin(lf.elev * (0.35 + 0.65 * un)))));
      m = norm(add(m, [0, -0.35 * un * (1 - Math.abs(m[1])), 0]));
      let P = add(S.p, mul(perp, r * 0.9));
      let nrm = norm(add(sub(UP, mul(m, dot(UP, m))), mul(perp, 0.35)));
      nrm = rotAxis(nrm, m, lf.roll * un);
      const jit = 0.86 + 0.28 * hash2(i, 7, seed);                 // per-leaf tone variation
      let col = mul(mix3(C.young, C.mature, sstep(0.4, 3.5, age)), jit);
      let sc = lf.size * grow;
      if (g > lf.absc - 0.06) {                              // yellowing, then the leaf drops and stays on the ground
        col = mix3(col, C.old, sstep(lf.absc - 0.06, lf.absc, g));
        if (g > lf.absc) {
          const fa = clamp((g - lf.absc) / 0.05), h0 = P[1];
          const drop = Math.pow(fa, 1.4);
          P = [P[0] + lf.drift[0] * 0.35 * fa + Math.sin(fa * 9 + lf.spin) * 0.04 * (1 - fa), lerp(h0, 0.004 + lf.tilt * 0.004, drop), P[2] + lf.drift[2] * 0.35 * fa];
          const tum = rotAxis(m, norm(lf.drift[0] || lf.drift[2] ? [lf.drift[2], 0, -lf.drift[0]] : [1, 0, 0]), fa * lf.spin);
          const flatM = norm([Math.cos(lf.spin * 3), 0, Math.sin(lf.spin * 3)]);
          const land = sstep(0.75, 1, fa);
          m = norm(mix3(tum, flatM, land)); nrm = norm(mix3(nrm, UP, land));
          col = mix3(C.old, [0.11, 0.065, 0.03], land * 0.85);
        }
      }
      const [X, Y, Z] = basisY(m, nrm);
      writeMat(LM, i, X, Y, Z, P, sc * LF.aspect, sc, sc);
      UF[i] = g > lf.absc ? 0.9 : un;
      setCol(LC, i, col);
    });
    lm.instanceMatrix.needsUpdate = true; lm.instanceColor.needsUpdate = true; lm.userData.unfold.needsUpdate = true;
    if (!FR) return;
    // blossoms + fruit, f: 0 bud .. 0.1 open .. 0.22-0.32 petal fall .. 0.3-0.75 swell green .. 0.75-1 colour
    const PCo = petals.instanceColor.array, PM = petals.instanceMatrix.array, CM = centers.instanceMatrix.array, FM = fruitM.instanceMatrix.array, FC = fruitM.instanceColor.array, KM = calyx.instanceMatrix.array, SM = stalks.instanceMatrix.array;
    const nP = FR.flower === 'olive' ? 4 : 5, petalL = FR.flower === 'olive' ? 0.0045 : 0.017;
    const cUn = srgb(THREE, FR.unripe), cBr = srgb(THREE, FR.break), cRi = srgb(THREE, FR.ripe);
    let fi = 0;
    sites.forEach((st, si) => {
      const present = Lc[st.br.id] >= st.s - 1e-4 && g > st.br.b + st.br.dur * 0.98 && f > 0;
      sampleCurve(st.br.curve, st.s, S);
      const A = S.p, ax = st.axis;
      const [bx, by, bz] = basisY(ax, anyPerp(ax));
      // petals
      const budGrow = sstep(st.open, st.open + 0.08, f), open = sstep(0.08 + st.open, 0.16 + st.open, f);
      for (let k = 0; k < nP; k++) {
        const idx = si * nP + k;
        if (!present || budGrow <= 0) { hideMat(PM, idx); continue; }
        const a = st.spinY + (k / nP) * TAU, rad = add(mul(bx, Math.cos(a)), mul(bz, Math.sin(a)));
        const tilt = lerp(0.12, 1.75, open);                          // closed bud -> recurved open petal
        let Y = norm(add(mul(by, Math.cos(tilt)), mul(rad, Math.sin(tilt))));
        let Zp = norm(cross(Y, cross(rad, Y))); Zp = mul(Zp, -1);
        let P = add(A, mul(ax, 0.004));
        const td = 0.22 + st.petalDrop + k * 0.012;
        let sc = petalL * (0.35 + 0.65 * budGrow);
        if (f > td) {                                                 // petal falls to the ground and stays
          const fa = clamp((f - td) / 0.06), dd = rotAxis(st.dropDir, [0, 1, 0], k);
          P = [P[0] + dd[0] * 0.25 * fa, lerp(P[1], 0.003 + k * 0.0004, Math.pow(fa, 1.5)), P[2] + dd[2] * 0.25 * fa];
          const land = sstep(0.8, 1, fa);
          Y = norm(mix3(rotAxis(Y, norm([dd[2] + 0.01, 0, -dd[0]]), fa * 7 + k), norm([dd[0], 0, dd[2] + 0.01]), land));
          Zp = norm(mix3(Zp, [0, 1, 0], land));
          // on the ground the petal wilts and browns into the litter over the following weeks
          const decay = sstep(td + 0.08, td + 0.4, f);
          setCol(PCo, idx, mix3([1, 1, 1], [0.16, 0.1, 0.05], decay)); sc *= 1 - 0.35 * decay;
        } else setCol(PCo, idx, [1, 1, 1]);
        const [X2, Y2, Z2] = basisY(Y, Zp);
        writeMat(PM, idx, X2, Y2, Z2, P, sc);
      }
      // centre (stamens): shows while open, withers (shortens, falls with petals)
      if (!present || budGrow <= 0 || f > 0.3 + st.petalDrop) hideMat(CM, si);
      else { const sc = (FR.flower === 'olive' ? 0.003 : 0.011) * open * (1 - sstep(0.24, 0.3, f)); writeMat(CM, si, bx, by, bz, A, sc * 0.6, sc, sc * 0.6); }
      // fruit
      if (!st.sets) return;
      const i = fi++;
      const hidden = state.hide && state.hide.has(i);
      if (!present || hidden || f < 0.2) { hideMat(FM, i); hideMat(KM, i); hideMat(SM, i); fruitRad[i] = 0; return; }
      const sw = sstep(0.2, 0.8, f) * 0.9 + sstep(0.75, 1, f) * 0.1;
      const r = FR.r * st.sizeJit * (0.1 + 0.9 * sw);
      const heavy = sstep(0.3, 0.75, f);
      const hang = norm(mix3(ax, [0, -1, 0], heavy * 0.9));
      const top = add(A, mul(hang, FR.stalk * (0.5 + 0.5 * sw)));
      const Pc = add(top, mul(hang, r * FR.oblate * 0.98));
      const [fx, fy, fz] = basisY(mul(hang, -1), anyPerp(hang));
      writeMat(FM, i, fx, fy, fz, Pc, r, r * FR.oblate, r);
      const cpos = add(top, mul(hang, r * 0.12));
      writeMat(KM, i, fx, fy, fz, cpos, r * 0.22, r * 0.25, r * 0.22);
      const sl = len(sub(top, A)); writeMat(SM, i, ...basisY(sub(top, A), anyPerp(hang)), A, r * 0.07 + 0.0012, Math.max(1e-4, sl), r * 0.07 + 0.0012);
      const rip = clamp(sstep(0.72, 0.9, f + st.ripeJit)), full = sstep(0.86, 1.0, f + st.ripeJit);
      setCol(FC, i, mix3(mix3(cUn, cBr, rip), cRi, full));
      fruitPos[i] = Pc; fruitRad[i] = r;
    });
    petals.instanceMatrix.needsUpdate = true; petals.instanceColor.needsUpdate = true;
 centers.instanceMatrix.needsUpdate = true; fruitM.instanceMatrix.needsUpdate = true;
    fruitM.instanceColor.needsUpdate = true; calyx.instanceMatrix.needsUpdate = true; stalks.instanceMatrix.needsUpdate = true;
  }
  apply();
  return {
    object3d: group, species, branches: branches.length, leaves: leaves.length, fruitCount: fruitSites.length,
    setGrowth(g) { state.g = clamp(g); apply(); },
    setFruit(f, { hide } = {}) { state.f = clamp(f); state.hide = hide ? new Set(hide) : null; apply(); },
    // both at once (one rebuild instead of two)
    set(g, f, { hide } = {}) { state.g = clamp(g); state.f = clamp(f); state.hide = hide ? new Set(hide) : null; apply(); },
    fruitWorldPositions() {
      group.updateMatrixWorld(true); const m = group.matrixWorld, out = [];
      fruitPos.forEach((p, i) => { if (fruitRad[i] > 0) { const v = new THREE.Vector3(...p).applyMatrix4(m); out.push({ index: i, position: v, radius: fruitRad[i] * m.getMaxScaleOnAxis() }); } });
      return out;
    },
  };
}

// ------------------------------------------------------------------ date palm (monocot: no branching)
// Establishment phase (g < 0.25): fronds rise from a ground-level rosette while the stem reaches full
// girth underground; then the trunk elongates from the crown. Each frond emerges as a closed spear,
// its leaflets open, it arches out, and old fronds droop and brown into a skirt.
function makeDatePalm(THREE, { seed = 1 } = {}) {
  const R = mulberry32(seed * 131 + 7), H = 5.2, RT = 0.21, NF = 34;
  const hTop = (g) => H * Math.pow(sstep(0.25, 1.0, g), 1.1);
  const group = new THREE.Group(); group.name = 'tree_date_palm';
  const fr = [];
  for (let k = 0; k < NF; k++) {
    const b = 0.02 + (0.88 * k) / NF;
    fr.push({ b, az: k * 2.39996 + rr(R, -0.1, 0.1), L: rr(R, 2.4, 3.0) * (0.45 + 0.55 * sstep(0.0, 0.5, b)), elev: rr(R, 0.55, 0.95), curl: rr(R, 0.25, 0.5), hb: hTop(b) });
  }
  const RINGS = 14, RAD = 6;
  const tubes = new TubeSet(THREE, [{ rings: 24, radial: 24 }, ...fr.map(() => ({ rings: RINGS, radial: RAD }))]);
  const tb = barkTextures(THREE, 'palm');
  const trunkMat = new THREE.MeshStandardMaterial({ map: tb.map, normalMap: tb.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.95, vertexColors: true });
  const wood = new THREE.Mesh(tubes.geometry, trunkMat); wood.castShadow = wood.receiveShadow = true; wood.frustumCulled = false; group.add(wood);
  // leaflets: V-folded narrow strips
  const leaflets = [];
  fr.forEach((f, fi) => {
    const n = Math.round(f.L / 0.04);
    for (let j = 0; j < n; j++) for (const side of [-1, 1]) {
      const u = 0.22 + (0.78 * (j + 0.5)) / n;
      leaflets.push({ fi, u, side, plane: (j % 3) - 1, len: 0.42 * Math.sin(Math.PI * Math.min(1, (u - 0.1) / 0.95)) + 0.06, jit: rr(R, -0.12, 0.12) });
    }
  });
  const lg = new THREE.PlaneGeometry(1, 1, 2, 6); lg.translate(0, 0.5, 0);
  { const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setX(i, x * (1 - 0.85 * y)); p.setZ(i, Math.abs(x) * 0.6 - 0.12 * y * y); } lg.computeVertexNormals(); }
  const lmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide, vertexColors: false });
  const LM = new THREE.InstancedMesh(lg, lmat, leaflets.length); LM.frustumCulled = false; LM.castShadow = true; LM.receiveShadow = true;
  LM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); LM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(leaflets.length * 3).fill(1), 3);
  group.add(LM);
  // fruit bunches
  const NB = 5, NS = 28, ND = 6, bunches = [];
  for (let k = 0; k < NB; k++) bunches.push({ az: (k / NB) * TAU + rr(R, -0.3, 0.3), L: rr(R, 0.55, 0.8), strands: Array.from({ length: NS }, () => ({ u: rr(R, 0.55, 1), az: R() * TAU, L: rr(R, 0.25, 0.42), dates: Array.from({ length: ND }, () => ({ u: rr(R, 0.15, 1), az: R() * TAU, j: rr(R, 0.85, 1.1) })) })) });
  const sg = new THREE.CylinderGeometry(1, 1, 1, 5, 1); sg.translate(0, 0.5, 0);
  const SM = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0xd9a63c, roughness: 0.7 }), NB * (NS + 1)); SM.frustumCulled = false; SM.castShadow = true; SM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(SM);
  const dg = new THREE.SphereGeometry(1, 16, 12);
  const DM = new THREE.InstancedMesh(dg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 }), NB * NS * ND);
  DM.frustumCulled = false; DM.castShadow = true; DM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); DM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NB * NS * ND * 3).fill(1), 3); group.add(DM);
  const C = { trunk: srgb(THREE, '#c2ae8e'),
 young: srgb(THREE, '#a9c28a'), leaf: srgb(THREE, '#5d7a5a'), dead: srgb(THREE, '#a8865a'), rach: srgb(THREE, '#c7b77a'), d0: srgb(THREE, '#6f8f2a'), d1: srgb(THREE, '#e8b51e'), d2: srgb(THREE, '#6a2e12') };
  const state = { g: 1, f: 0, hide: null }, datePos = [], dateRad = [];
  function frondCurve(f, g, out) {
    const age = g - f.b, grow = sstep(0, 0.07, age), open = sstep(0.04, 0.18, age);
    const younger = fr.filter((o) => o.b > f.b && o.b <= g).length, old = sstep(14, 24, younger);
    const L = f.L * (0.15 + 0.85 * grow), elev = lerp(0.08, f.elev, open) + old * 1.25;   // radians from vertical
    // fronds sit in a packed crown at the top of the stem: each newer frond pushes the older ones down a little
    const top = hTop(g), base = [0, Math.max(0.05, top + 0.12 - Math.min(younger, 26) * 0.035), 0];
    const pts = []; let d = [Math.sin(elev) * Math.cos(f.az), Math.cos(elev), Math.sin(elev) * Math.sin(f.az)], p = add(base, mul([Math.cos(f.az), 0, Math.sin(f.az)], RT * 0.7 * sstep(0, 0.3, g)));
    const n = RINGS; pts.push(p);
    for (let i = 1; i < n; i++) { p = add(p, mul(d, L / (n - 1))); pts.push(p); d = norm(add(d, [0, -(f.curl * open + old * 0.4) * (L / (n - 1)) * 0.9, 0])); }
    out.curve = makeCurve(pts); out.open = open; out.old = old; out.grow = grow; out.L = L;
    return out;
  }
  function apply() {
    const g = state.g, f = state.f, S = newSample();
    // trunk
    const top = hTop(g), rt = RT * (0.25 + 0.75 * sstep(0.0, 0.3, g));
    const tc = makeCurve(Array.from({ length: 24 }, (_, i) => [Math.sin(i * 0.15) * 0.02 * top, (top + 0.2) * (i / 23), 0]));
    for (let j = 0; j < 24; j++) { const s = (tc.L * j) / 23; sampleCurve(tc, s, S); const r = rt * (1 + 0.3 * Math.exp(-s / 0.25)) * (j === 23 ? 0.6 : 1); tubes.ring(0, j, S.p, S.n, S.b, r, s / (TAU * RT) * 1.0, C.trunk); }
    const F = [];
    fr.forEach((f2, k) => {
      const tid = k + 1;
      if (g < f2.b) { for (let j = 0; j < RINGS; j++) tubes.ring(tid, j, [0, Math.min(f2.hb, top), 0], [1, 0, 0], [0, 0, 1], 0, 0, C.rach); F.push(null); return; }
      const fc = frondCurve(f2, g, {}); F.push(fc);
      for (let j = 0; j < RINGS; j++) { const s = (fc.curve.L * j) / (RINGS - 1); sampleCurve(fc.curve, s, S); tubes.ring(tid, j, S.p, S.n, S.b, lerp(0.04, 0.006, j / (RINGS - 1)) * (0.4 + 0.6 * fc.grow), s * 2, mix3(C.rach, C.dead, fc.old)); }
    });
    tubes.commit();
    const LMa = LM.instanceMatrix.array, LC = LM.instanceColor.array;
    leaflets.forEach((lf, i) => {
      const fc = F[lf.fi]; if (!fc) { hideMat(LMa, i); return; }
      sampleCurve(fc.curve, lf.u * fc.curve.L, S);
      const side = add(mul(S.n, 0), cross(S.t, [0, 1, 0])); const sd = len(side) > 1e-3 ? norm(side) : S.b;
      const ang = lerp(0.04, 0.75 + lf.jit, fc.open);                 // folded spear -> open
      let dir = norm(add(mul(S.t, Math.cos(ang)), mul(sd, Math.sin(ang) * lf.side)));
      dir = norm(add(dir, [0, lf.plane * 0.35 * fc.open, 0]));
      const [X, Y, Z] = basisY(dir, [0, 1, 0]);
      writeMat(LMa, i, X, Y, Z, S.p, 0.034 * (0.5 + 0.5 * fc.open), lf.len * fc.grow, 0.034);
      setCol(LC, i, mix3(mix3(C.young, C.leaf, fc.open), C.dead, fc.old));
    });
    LM.instanceMatrix.needsUpdate = true; LM.instanceColor.needsUpdate = true;
    // bunches
    const SMa = SM.instanceMatrix.array, DMa = DM.instanceMatrix.array, DC = DM.instanceColor.array;
    let si = 0, di = 0; datePos.length = 0; dateRad.length = 0;
    const show = g > 0.8 && f > 0, heavy = sstep(0.3, 0.8, f);
    bunches.forEach((bu, k) => {
      const base = [Math.cos(bu.az) * RT * 0.9, top + 0.05, Math.sin(bu.az) * RT * 0.9], out = [Math.cos(bu.az), 0, Math.sin(bu.az)];
      const ext = sstep(0, 0.2, f), Lb = bu.L * ext;
      const dirB = norm(add(mul(out, 0.8), [0, lerp(0.6, -0.9, heavy), 0]));
      const end = add(base, mul(dirB, Lb));
      if (!show) hideMat(SMa, si); else writeMat(SMa, si, ...basisY(dirB, out), base, 0.022, Math.max(Lb, 1e-4), 0.022); si++;
      bu.strands.forEach((st) => {
        const a = add(base, mul(dirB, Lb * st.u));
        const sd = norm(add([0, -1, 0], mul([Math.cos(st.az), 0, Math.sin(st.az)], lerp(0.6, 0.15, heavy))));
        const sl = st.L * sstep(0.05, 0.3, f);
        if (!show || sl <= 0) hideMat(SMa, si); else writeMat(SMa, si, ...basisY(sd, out), a, 0.004, sl, 0.004); si++;
        st.dates.forEach((dt) => {
          const id = di++;
          const sw = sstep(0.28, 0.75, f), r = 0.013 * dt.j * (0.25 + 0.75 * sw);
          if (!show || f < 0.25 || (state.hide && state.hide.has(id))) { hideMat(DMa, id); dateRad[id] = 0; return; }
          const p = add(add(a, mul(sd, sl * dt.u)), mul([Math.cos(dt.az), 0, Math.sin(dt.az)], r * 1.2));
          writeMat(DMa, id, [1, 0, 0], [0, 1, 0], [0, 0, 1], add(p, [0, -r * 1.4, 0]), r, r * 1.7, r);
          setCol(DC, id, mix3(mix3(C.d0, C.d1, sstep(0.7, 0.82, f)), C.d2, sstep(0.86, 1, f)));
          datePos[id] = add(p, [0, -r * 1.4, 0]); dateRad[id] = r;
        });
      });
    });
    SM.instanceMatrix.needsUpdate = true; DM.instanceMatrix.needsUpdate = true; DM.instanceColor.needsUpdate = true;
  }
  apply();
  return {
    object3d: group, species: 'date_palm', fruitCount: NB * NS * ND,
    setGrowth(g) { state.g = clamp(g); apply(); },
    setFruit(f, { hide } = {}) { state.f = clamp(f); state.hide = hide ? new Set(hide) : null; apply(); },
    set(g, f, { hide } = {}) { state.g = clamp(g); state.f = clamp(f); state.hide = hide ? new Set(hide) : null; apply(); },
    fruitWorldPositions() { group.updateMatrixWorld(true); const m = group.matrixWorld, out = []; datePos.forEach((p, i) => { if (dateRad[i] > 0) out.push({ index: i, position: new THREE.Vector3(...p).applyMatrix4(m), radius: dateRad[i] }); }); return out; },
  };
}

// ------------------------------------------------------------------ roots (space colonization, Runions et al. 2007)
// Built once: attractor points fill a soil volume shaped like a root zone (wide near the top, a taproot
// column below); tips advance one step per iteration toward the attractors they "see", with gravitropism
// and tortuosity. Each node records the iteration it was laid down; setGrowth(g) shows nodes born <= g*N,
// interpolates the advancing tip, thickens older roots by a pipe model, colours the young cream root tips
// and older tan-brown wood, and draws root hairs only in the maturation zone just behind each tip.
export function makeRoots(THREE, { seed = 1, depth = 0.4, spread = 0.15, origin = [0, 0, 0], zSpread = null, obstacles = [], attractors = 1100, baseRadius = null, hairs = true } = {}) {
  const R = mulberry32(seed * 977 + 3), zs = zSpread ?? spread;
  const D = depth / 70, di = depth * 0.22, dk = D * 2.0;
  const inObs = (p) => obstacles.some((o) => len(sub(p, o.p)) < o.r * 1.05);
  // attractors: lateral zone (upper 55%) + taproot column
  const A = [];
  let guard = 0;
  while (A.length < attractors && guard++ < attractors * 50) {
    const t = Math.pow(R(), 1.15), y = -depth * (0.04 + 0.96 * t);
    const wR = spread * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * clamp(0.15 + t * 1.25, 0, 1)), 0.8)) * (1 - 0.65 * t);
    const x = (R() * 2 - 1), z = (R() * 2 - 1);
    if (x * x + z * z > 1) continue;
    const p = [origin[0] + x * wR, origin[1] + y, origin[2] + z * zs * (wR / spread)];
    if (inObs(p)) continue;
    A.push(p);
  }
  for (let k = 0; k < attractors * 0.15; k++) { const y = -depth * rr(R, 0.3, 1.0); A.push([origin[0] + rr(R, -1, 1) * spread * 0.12, origin[1] + y, origin[2] + rr(R, -1, 1) * zs * 0.12]); }
  const alive = new Uint8Array(A.length).fill(1);
  // nodes
  const P = [origin.slice()], parent = [-1], born = [0], dirs = [[0, -1, 0]], kids = [[]];
  // spatial hash for nodes
  const cell = di, grid = new Map(), key = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  const gridAdd = (i) => { const k = key(P[i]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); };
  gridAdd(0);
  // seed the taproot: a few straight steps down before colonization starts
  for (let k = 1; k <= 6; k++) { const p = add(P[k - 1], mul(norm(add([0, -1, 0], mul(randUnit(R), 0.15))), D)); P.push(p); parent.push(k - 1); born.push(k); dirs.push([0, -1, 0]); kids.push([]); kids[k - 1].push(k); gridAdd(k); }
  let iter = 6;
  const near = (p, rad) => {
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell), out = [];
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
      const L = grid.get(`${x},${y},${z}`); if (!L) continue;
      for (const i of L) { const d = len(sub(P[i], p)); if (d < rad) out.push([i, d]); }
    }
    return out;
  };
  for (; iter < 400; iter++) {
    const pull = new Map();
    for (let a = 0; a < A.length; a++) {
      if (!alive[a]) continue;
      let best = -1, bd = di;
      for (const [i, d] of near(A[a], di)) if (d < bd && kids[i].length < 3) { bd = d; best = i; }
      if (best < 0) continue;
      const v = norm(sub(A[a], P[best]));
      if (!pull.has(best)) pull.set(best, [0, 0, 0]);
      const s = pull.get(best); s[0] += v[0]; s[1] += v[1]; s[2] += v[2];
    }
    if (!pull.size) break;
    const fresh = [];
    for (const [i, s] of pull) {
      // tips extend; older nodes may sprout a lateral only rarely (laterals originate behind the tip)
      const isTip = kids[i].length === 0;
      if (!isTip && R() > 0.05) continue;
      let d = norm(s);
      if (!isTip) { const pd = dirs[i], side = norm(sub(d, mul(pd, dot(d, pd)))); if (len(side) > 0.1) d = norm(add(mul(side, 0.85), mul(pd, 0.25))); }
      d = norm(add(add(d, [0, -0.34, 0]), mul(randUnit(R), 0.3)));
      if (isTip) d = norm(add(d, mul(dirs[i], 1.25)));                  // tips keep momentum: smooth wavy roots
      const np = add(P[i], mul(d, D));
      if (inObs(np)) continue;
      if (near(np, D * 0.6).length) continue;
      fresh.push([i, np, d]);
    }
    if (!fresh.length) break;
    for (const [i, np, d] of fresh) {
      const k = P.length; P.push(np); parent.push(i); born.push(iter + 1); dirs.push(d); kids.push([]); kids[i].push(k); gridAdd(k);
      for (const [a] of []) void a;
    }
    // kill reached attractors
    for (let a = 0; a < A.length; a++) if (alive[a] && near(A[a], dk).length) alive[a] = 0;
  }
  const NN = P.length, maxBorn = Math.max(...born);
  // smooth node positions (keeps the topology; removes the step-wise kinks)
  const SPOS = P.map((p) => p.slice());
  for (let pass = 0; pass < 3; pass++) {
    const nxt = SPOS.map((p) => p.slice());
    for (let i = 1; i < NN; i++) {
      const pa = parent[i], ch = kids[i].length ? kids[i][0] : -1;
      if (ch < 0) continue;
      nxt[i] = mix3(SPOS[i], mul(add(SPOS[pa], SPOS[ch]), 0.5), 0.5);
    }
    for (let i = 0; i < NN; i++) SPOS[i] = nxt[i];
  }
  // subtree sizes at full growth -> chain decomposition (follow the heaviest child)
  const sub_ = new Float32Array(NN).fill(1);
  for (let i = NN - 1; i > 0; i--) sub_[parent[i]] += sub_[i];
  const chains = [];
  const startChain = (first, from) => {
    const nodes = from >= 0 ? [from, first] : [first]; let c = first;
    while (kids[c].length) {
      const ks = kids[c].slice().sort((a, b) => sub_[b] - sub_[a]);
      for (let j = 1; j < ks.length; j++) startChain(ks[j], c);
      c = ks[0]; nodes.push(c);
    }
    chains.push(nodes);
  };
  startChain(0, -1);
  // meander: low-frequency wiggle along each root (circumnutation), on top of the colonization path
  chains.forEach((c, k) => {
    const ph = hash2(k, 1, seed) * TAU, ph2 = hash2(k, 2, seed) * TAU, fq = 0.9 + hash2(k, 3, seed) * 0.8;
    for (let j = 1; j < c.length; j++) {
      const i = c[j], pa = c[j - 1], t = norm(sub(SPOS[i], SPOS[pa]));
      if (!isFinite(t[0])) continue;
      const nn = anyPerp(t), bb = cross(t, nn), damp = Math.min(1, j / 3);
      SPOS[i] = add(SPOS[i], mul(add(mul(nn, Math.sin(j * fq + ph)), mul(bb, Math.sin(j * fq * 0.7 + ph2))), D * 0.32 * damp));
    }
  });
  const maxSub = sub_[0];
  const rBase = baseRadius ?? depth * 0.0042, rTip = depth * 0.0011, K = (rBase - rTip) / Math.sqrt(maxSub);
  const rChain = new Float32Array(NN);
  chains.forEach((c, k) => { const f = c[k === 0 ? 0 : 1] ?? c[0], rc = rTip * 2.2 + K * Math.sqrt(sub_[f]); for (let j = k === 0 ? 0 : 1; j < c.length; j++) rChain[c[j]] = rc; });
  const SUB = 3;   // Catmull-Rom rings per node interval: smooth curves, rounded caps
  const tubes = new TubeSet(THREE, chains.map((c) => ({ rings: (c.length - 1) * SUB + 1, radial: sub_[c[1] ?? c[0]] > 40 ? 12 : 8 })));
  const rt = rootTextures(THREE);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: rt.map, normalMap: rt.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.72, metalness: 0, envMapIntensity: 0.3 });

  const mesh = new THREE.Mesh(tubes.geometry, mat); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  const group = new THREE.Group(); group.name = 'roots'; group.add(mesh);
  // root hairs
  const HPN = 22, hairLen = depth * 0.0055, hairDir = [];
  for (let i = 0; i < NN; i++) for (let h = 0; h < HPN; h++) hairDir.push([R() * TAU, rr(R, -0.2, 0.35), rr(R, 0.35, 1.0), R()]);
  let hairGeo = null, hairPos = null;
  if (hairs) {
    hairGeo = new THREE.BufferGeometry(); hairPos = new Float32Array(NN * HPN * 6);
    const at = new THREE.BufferAttribute(hairPos, 3); at.setUsage(THREE.DynamicDrawUsage); hairGeo.setAttribute('position', at);
    hairGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const hl = new THREE.LineSegments(hairGeo, new THREE.LineBasicMaterial({ color: 0xf6eedc, transparent: true, opacity: 0.16, depthWrite: false }));
    hl.frustumCulled = false; group.add(hl);
  }
  const C = { tip: srgb(THREE, '#fbf4e2'), young: srgb(THREE, '#f0e0bc'), old: srgb(THREE, '#d8bc90'), wood: srgb(THREE, '#b8946a') };
  const cnt = new Float32Array(NN), rad = new Float32Array(NN), pos = SPOS.map((p) => p.slice()), tng = new Array(NN);
  // chain-local tangents
  for (let i = 0; i < NN; i++) { const pa = parent[i] >= 0 ? parent[i] : i, ch = kids[i].length ? kids[i][0] : i; tng[i] = norm(sub(SPOS[ch], SPOS[pa])); if (!isFinite(tng[i][0])) tng[i] = [0, -1, 0]; }
  function setGrowth(g) {
    const G = clamp(g) * (maxBorn + 1);
    for (let i = 0; i < NN; i++) cnt[i] = clamp(G - born[i]);
    for (let i = NN - 1; i > 0; i--) cnt[parent[i]] += cnt[i];
    for (let i = 0; i < NN; i++) {
      const vis = clamp(G - born[i]);
      if (vis <= 0) { rad[i] = 0; pos[i] = parent[i] >= 0 ? pos[parent[i]] : SPOS[i]; continue; }
      pos[i] = parent[i] >= 0 ? mix3(pos[parent[i]], SPOS[i], vis) : SPOS[i];
      const age = G - born[i];
      rad[i] = rChain[i] * (0.62 + 0.38 * sstep(0, 40, age)) * Math.sqrt(clamp(age / 1.3)) * (0.75 + 0.25 * clamp(cnt[i] / Math.max(1, sub_[i])));
    }
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map((q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)); };
    chains.forEach((c, k) => {
      const n = c.length, tiny = n < 4 && sub_[c[n - 1]] <= 1;
      let lastVis = -1;
      for (let j = n - 1; j >= 0; j--) if (rad[c[j]] > 0) { lastVis = j; break; }
      // resampled centreline, radius, colour
      const P = [], Rr = [], Cc = [];
      for (let j = 0; j < n - 1; j++) for (let s2 = 0; s2 < SUB; s2++) {
        const t = s2 / SUB, i0 = c[Math.max(0, j - 1)], i1 = c[j], i2 = c[j + 1], i3 = c[Math.min(n - 1, j + 2)];
        P.push(cr(pos[i0], pos[i1], pos[i2], pos[i3], t));
        let r1 = j === 0 && k > 0 ? Math.min(rad[c[0]], rad[c[1]]) : rad[i1];
        Rr.push(j + 1 > lastVis ? (j < lastVis ? r1 : 0) : lerp(r1, rad[i2], t));
        Cc.push([i1, i2, t]);
      }
      P.push(pos[c[n - 1]]); Rr.push(rad[c[n - 1]]); Cc.push([c[n - 1], c[n - 1], 0]);
      // rounded cap: radius follows a quarter-ellipse over the last ~2.2 radii before the visible tip
      let tipIdx = -1; for (let q = Rr.length - 1; q >= 0; q--) if (Rr[q] > 0) { tipIdx = q; break; }
      if (tipIdx > 0) {
        const rT = Rr[Math.max(0, tipIdx - SUB)] || Rr[tipIdx], capL = rT * 2.6; let acc = 0;
        for (let q = tipIdx; q >= 0 && acc < capL; q--) { const x = acc / capL; Rr[q] = Math.min(Rr[q], rT * Math.sqrt(Math.max(0.02, 1 - (1 - x) * (1 - x)))); if (q) acc += len(sub(P[q], P[q - 1])); }
        for (let q = tipIdx + 1; q < P.length; q++) { P[q] = P[tipIdx]; Rr[q] = 0; }
      }
      // parallel-transport frames
      let nPrev = null, v = 0;
      for (let q = 0; q < P.length; q++) {
        const a = P[Math.max(0, q - 1)], b2 = P[Math.min(P.length - 1, q + 1)];
        let t = norm(sub(b2, a)); if (!isFinite(t[0]) || len(sub(b2, a)) < 1e-9) t = nPrev ? cross(nPrev, [0, 0, 1]) : [0, -1, 0];
        let nn = nPrev ? sub(nPrev, mul(t, dot(nPrev, t))) : anyPerp(t);
        nn = len(nn) < 1e-4 ? anyPerp(t) : norm(nn); nPrev = nn;
        const bb = cross(t, nn);
        if (q) v += len(sub(P[q], P[q - 1])) / (TAU * Math.max(rBase * 0.3, rTip * 2)) * 0.5;
        const [i1, i2, tt] = Cc[q], age = G - lerp(born[i1], born[i2], tt);
        const ck = clamp(Math.sqrt(cnt[i1] / maxSub) * 2.2);
        let col = age < 1.5 ? C.tip : age < 12 ? mix3(C.tip, C.young, sstep(1.5, 12, age)) : mix3(C.young, C.old, sstep(12, 45, age));
        col = mix3(col, C.wood, ck * sstep(20, 60, age));
        tubes.ring(k, q, P[q], nn, bb, tiny ? 0 : Rr[q], v, col);
      }
    });
    tubes.commit();
    if (hairs) {
      for (let i = 0; i < NN; i++) {
        const age = G - born[i], ok = age > 1.4 && age < 14 && rad[i] > 0;
        const L = ok ? hairLen * sstep(1.4, 3.5, age) * (1 - sstep(8, 14, age)) : 0;
        const t = tng[i], nn = anyPerp(t), bb = cross(t, nn);
        for (let h = 0; h < HPN; h++) {
          const o = (i * HPN + h) * 6, [a, fwd, lj, along] = hairDir[i * HPN + h];
          const d = norm(add(add(mul(nn, Math.cos(a)), mul(bb, Math.sin(a))), mul(t, fwd)));
          const pa = parent[i] >= 0 ? pos[parent[i]] : pos[i], base = mix3(pa, pos[i], along);   // spread along the segment
          const b0 = add(base, mul(d, rad[i] * 0.85)), b1 = add(b0, mul(d, L * lj));
          hairPos[o] = b0[0]; hairPos[o + 1] = b0[1]; hairPos[o + 2] = b0[2]; hairPos[o + 3] = b1[0]; hairPos[o + 4] = b1[1]; hairPos[o + 5] = b1[2];
        }
      }
      hairGeo.attributes.position.needsUpdate = true;
    }
  }
  setGrowth(1);
  return { object3d: group, setGrowth, nodes: NN, iterations: maxBorn, chains: chains.length };
}

function rootTextures(THREE) {
  return cached(THREE, 'root', () => {
    const w = 64, h = 256, H = new Float32Array(w * h), C = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, n = fbm2(u, v, 16, 2, 41, 4), f = fbm2(u, v, 32, 64, 43, 2);
      H[y * w + x] = n * 0.8 + f * 0.2;
      const k = 0.88 + (n - 0.5) * 0.2, o = (y * w + x) * 4; C[o] = C[o + 1] = C[o + 2] = toByte(k); C[o + 3] = 255;
    }
    return { map: dataTex(THREE, w, h, C), normalMap: normalTex(THREE, w, h, H, 3) };
  });
}

// ------------------------------------------------------------------ seed (citrus-like pip) that germinates
// setGerm(g): 0-0.25 imbibition (swells), 0.18-0.4 the seed coat splits open, the radicle leaves at the
// pointed end (drive makeRoots from g ~ 0.25 on, from seed.rootOrigin), 0.42-0.85 the shoot pushes up
// through the soil as a protective hook, the hook straightens once out of the soil, 0.82-1 the first
// true leaves unfold. Citrus germination is hypogeal: the cotyledons stay inside the seed.
export function makeSeed(THREE, { size = 0.014, seed = 5, surface = 0.035, leafShape = 'citrus' } = {}) {
  const R = mulberry32(seed), group = new THREE.Group(); group.name = 'seed';
  const L = size, rw = size * 0.36;
  const coatTex = cached(THREE, 'seedcoat', () => {
    const w = 128, h = 128, H = new Float32Array(w * h), C = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w, v = y / h, n = fbm2(u, v, 6, 3, 61, 5), rid = Math.abs(fbm2(u, v, 10, 2, 63, 3) - 0.5); H[y * w + x] = n * 0.6 - rid * 0.8; const k = 0.82 + (n - 0.5) * 0.3, o = (y * w + x) * 4; C[o] = toByte(k); C[o + 1] = toByte(k * 0.95); C[o + 2] = toByte(k * 0.82); C[o + 3] = 255; }
    return { map: dataTex(THREE, w, h, C), normalMap: normalTex(THREE, w, h, H, 5) };
  });
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xe2cfa4, map: coatTex.map, normalMap: coatTex.normalMap, roughness: 0.6, envMapIntensity: 0.5, side: THREE.DoubleSide });

  const teardrop = (geo) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y < 0 ? 1 + y * 0.55 : 1 - y * 0.12; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.78); } geo.computeVertexNormals(); return geo; };
  const half = (phi0) => { const g = teardrop(new THREE.SphereGeometry(1, 40, 28, phi0, Math.PI)); g.scale(rw, L / 2, rw); return g; };
  const hingeY = L * 0.42;
  const halves = [half(0), half(Math.PI)].map((geo) => { const piv = new THREE.Group(); piv.position.y = hingeY; const m = new THREE.Mesh(geo, coatMat); m.position.y = -hingeY; m.castShadow = true; piv.add(m); group.add(piv); return piv; });
  const emb = new THREE.Mesh(teardrop(new THREE.SphereGeometry(1, 32, 24)), new THREE.MeshStandardMaterial({ color: 0xe6dcb4, roughness: 0.55, envMapIntensity: 0.5 }));
  emb.scale.set(rw * 0.86, L / 2 * 0.9, rw * 0.86); group.add(emb);
  // shoot: one tube + two first leaves
  const RG = 28, tubes = new TubeSet(THREE, [{ rings: RG, radial: 10 }]);
  const shootMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, envMapIntensity: 0.5 });
  const shoot = new THREE.Mesh(tubes.geometry, shootMat); shoot.frustumCulled = false; shoot.castShadow = true; group.add(shoot);
  const lm = leafMesh(THREE, 3, leafTextures(THREE, leafShape), { roughness: 0.45, backLight: 1.3 }, { droop: 0.1, cup: 0.25 }); group.add(lm);
  const C = { pale: srgb(THREE, '#ece6c8'), green: srgb(THREE, '#7fa83a'), leafY: srgb(THREE, '#bcd76a'), leafG: srgb(THREE, '#3f7a28') };
  const top = surface, above = size * 2.6, rS = size * 0.1, hookLen = size * 0.9;
  const rootOrigin = new THREE.Vector3(0, -L / 2 * 1.02, 0);
  function setGerm(g) {
    g = clamp(g);
    const sw = 1 + 0.14 * sstep(0, 0.25, g);
    group.children.forEach(() => {});
    emb.scale.set(rw * 0.86 * sw, (L / 2) * 0.9 * sw, rw * 0.86 * sw);
    const crack = 0.5 * sstep(0.18, 0.42, g);
    halves[0].rotation.z = -crack; halves[1].rotation.z = crack;
    halves.forEach((h) => h.scale.setScalar(sw));
    // shoot path: straight then hooked tip, hook opens after it breaks the surface
    const Ltot = top - L * 0.4 + above;
    const Ls = Ltot * sstep(0.42, 0.88, g);
    const Le = top - L * 0.4 + hookLen * 0.35;                      // apex reaches the surface
    const hook = 2.5 * (1 - sstep(Le, Le + size * 1.2, Ls));
    const S = newSample(), pts = [];
    let x = 0, y = L * 0.4 * sw, th = 0, ds = Math.max(Ls, 1e-5) / (RG - 1);
    for (let i = 0; i < RG; i++) {
      pts.push([x, y, 0]);
      const s = i * ds; th = s > Ls - hookLen ? (hook * (s - (Ls - hookLen))) / hookLen : 0;
      x += Math.sin(th) * ds; y += Math.cos(th) * ds;
    }
    const cv = makeCurve(pts);
    for (let j = 0; j < RG; j++) {
      const s = (cv.L * j) / (RG - 1); sampleCurve(cv, s, S);
      const r = Ls < 1e-4 ? 0 : rS * (0.55 + 0.45 * sstep(0, 0.3, (Ls - s) / Ls + 0.2)) * (j === RG - 1 ? 0.5 : 1);
      const col = mix3(C.pale, C.green, sstep(top - 0.004, top + 0.01, S.p[1]) * sstep(0.7, 0.9, g));
      tubes.ring(0, j, S.p, S.n, S.b, r, s * 40, col);
    }
    tubes.commit();
    // first true leaves at the apex once it is out and straight
    const LMa = lm.instanceMatrix.array, UF = lm.userData.unfold.array, LC = lm.instanceColor.array;
    sampleCurve(cv, cv.L, S);
    for (let k = 0; k < 3; k++) {
      const a0 = 0.84 + k * 0.03, age = sstep(a0, 1.0, g);
      if (g < a0 || hook > 0.3) { hideMat(LMa, k); continue; }
      const az = k * 2.4 + 0.6, side = [Math.cos(az), 0, Math.sin(az)];
      const m = norm(add(mul(S.t, Math.cos(0.3 + 0.9 * age)), mul(side, Math.sin(0.3 + 0.9 * age))));
      const [X, Y, Z] = basisY(m, add([0, 1, 0], mul(side, 0.3)));
      const sc = size * (k === 2 ? 1.2 : 2.4) * (0.2 + 0.8 * age);
      writeMat(LMa, k, X, Y, Z, S.p, sc * 0.5, sc, sc); UF[k] = age; setCol(LC, k, mix3(C.leafY, C.leafG, age * 0.6));
    }
    lm.instanceMatrix.needsUpdate = true; lm.userData.unfold.needsUpdate = true; lm.instanceColor.needsUpdate = true;
  }
  setGerm(0);
  // radicle origin moves with the swelling (pure function of g)
  return { object3d: group, setGerm, rootOrigin, rootStart: (g) => clamp((g - 0.3) / 0.7) };
}

// ------------------------------------------------------------------ soil cross-section textures
// Layered profile: dark humus topsoil with organic fibres, brown subsoil with sand and gravel,
// reddish clay with grey mottles and darker moist bands at depth. Pebbles shaded as 3-D stones.
function soilSectionTextures(THREE, seed, aspect) {
  return cached(THREE, 'soil_' + seed + '_' + aspect.toFixed(2), () => {
    const w = 2048, h = Math.round(2048 * aspect), R = mulberry32(seed);
    const H = new Float32Array(w * h), C = new Float32Array(w * h * 3), A = new Uint8Array(w * h * 4);
    const hexf = (x) => [((x >> 16) & 255) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255].map((c) => Math.pow(c, 2.2));
    const TOP = hexf(0x2a1c12), MID = hexf(0x5b3e27), SUB = hexf(0x74513a), CLAY = hexf(0x86593b), MOIST = hexf(0x3b2819), GREY = hexf(0x77705f);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const wob = (fbm2(u, v, 4, 2, seed + 1, 4) - 0.5) * 0.06;
      const d = v + wob;                                             // 0 top .. 1 bottom
      let c = d < 0.17 ? mix3(TOP, MID, sstep(0.1, 0.19, d)) : d < 0.5 ? mix3(MID, SUB, sstep(0.17, 0.45, d)) : mix3(SUB, CLAY, sstep(0.5, 0.7, d));
      const mott = fbm2(u, v, 12, 12 * aspect | 0 || 1, seed + 5, 4);
      if (d > 0.55) c = mix3(c, GREY, sstep(0.6, 0.72, mott) * 0.55);
      const band = Math.sin((d * 14 + fbm2(u, v, 6, 3, seed + 7, 3) * 2.5) * Math.PI);
      c = mix3(c, MOIST, sstep(0.35, 0.95, band) * sstep(0.45, 0.62, d) * 0.55 + sstep(0.78, 1, d) * 0.35);
      const grain = fbm2(u, v, 256, 256, seed + 9, 2), crumbs = fbm2(u, v, 64, 64, seed + 11, 3);
      const k = 0.78 + (grain - 0.5) * 0.5 + (crumbs - 0.5) * 0.35;
      let r = c[0] * k, g = c[1] * k, b = c[2] * k;
      // sand speckles (subsoil), organic fibres (topsoil)
      const sp = hash2(x, y, seed + 13);
      if (d > 0.18 && sp > 0.985) { r += 0.06; g += 0.05; b += 0.035; }
      if (d < 0.2 && sp < 0.006) { r *= 0.5; g *= 0.45; b *= 0.4; }
      const o = (y * w + x) * 3; C[o] = r; C[o + 1] = g; C[o + 2] = b;
      H[y * w + x] = crumbs * 0.6 + grain * 0.3;
    }
    // organic fibres / fine dead roots in the topsoil
    for (let k = 0; k < 420; k++) {
      let x = R() * w, y = R() * h * 0.2, a = R() * TAU; const n = 20 + R() * 60, col = R() < 0.5 ? [0.09, 0.055, 0.03] : [0.025, 0.015, 0.008];
      for (let s = 0; s < n; s++) { a += (R() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a) * 0.7 + 0.2; const xi = ((x | 0) + w) % w, yi = y | 0; if (yi < 0 || yi >= h) break; const o = (yi * w + xi) * 3; C[o] = col[0]; C[o + 1] = col[1]; C[o + 2] = col[2]; H[yi * w + xi] += 0.3; }
    }
    // pebbles and stones: shaded ellipses, more in the subsoil
    const stones = 900;
    for (let k = 0; k < stones; k++) {
      const big = R() < 0.05, rx = big ? 10 + R() * 16 : 1.5 + R() * 5, ry = rx * (0.55 + R() * 0.35), rot = R() * Math.PI;
      const cy = h * clamp(0.12 + Math.pow(R(), 0.8) * 0.9, 0.1, 0.98), cx = R() * w;
      const base = R() < 0.5 ? [0.2, 0.18, 0.15] : R() < 0.5 ? [0.26, 0.19, 0.12] : [0.12, 0.11, 0.1];
      const tint = 0.75 + R() * 0.35, cr = Math.cos(rot), sr = Math.sin(rot);
      for (let dy = -Math.ceil(rx); dy <= Math.ceil(rx); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const lx = (dx * cr + dy * sr) / rx, ly = (-dx * sr + dy * cr) / ry, q = (lx * lx + ly * ly) * (1 + 0.35 * (vnoise(Math.atan2(ly, lx) * 1.3 + 10, k, 8, 5) - 0.5));
        const xi = ((Math.floor(cx) + dx) % w + w) % w, yi = Math.floor(cy) + dy; if (yi < 0 || yi >= h) continue;
        const o = (yi * w + xi) * 3;
        if (q > 1.25) continue;
        if (q > 1) { const sh = 0.75; C[o] *= sh; C[o + 1] *= sh; C[o + 2] *= sh; continue; }      // contact shadow ring
        const hz = Math.sqrt(1 - q), shade = (0.45 + 0.55 * clamp(hz * 0.8 - lx * 0.3 - ly * 0.4)) * (0.8 + 0.4 * fbm2(xi / w, yi / h, 128, 128, 7, 2)) + (hash2(xi, yi, 3) - 0.5) * 0.1;
        C[o] = base[0] * tint * shade; C[o + 1] = base[1] * tint * shade; C[o + 2] = base[2] * tint * shade;
        H[yi * w + xi] = 1 + hz * (big ? 2 : 1);
      }
    }
    for (let i = 0; i < w * h; i++) { const o = i * 4; A[o] = toByte(Math.pow(clamp(C[i * 3]), 1 / 2.2)); A[o + 1] = toByte(Math.pow(clamp(C[i * 3 + 1]), 1 / 2.2)); A[o + 2] = toByte(Math.pow(clamp(C[i * 3 + 2]), 1 / 2.2)); A[o + 3] = 255; }
    const map = dataTex(THREE, w, h, A, { repeat: false });
    return { map, normalMap: normalTex(THREE, w, h, H, 3, false), w, h };
  });
}
// ground (top view) soil/dry-grass texture, tileable
function groundTextures(THREE, seed, kind = 'field') {
  return cached(THREE, 'ground_' + kind + seed, () => {
    const w = 1024, h = 1024, R = mulberry32(seed), H = new Float32Array(w * h), C = new Float32Array(w * h * 3), A = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, n = fbm(u, v, 6, seed, 5), crumbs = fbm(u, v, 48, seed + 3, 3), grain = fbm(u, v, 256, seed + 5, 2);
      const clod = sstep(0.45, 0.75, crumbs);
      let c = mix3([0.12, 0.07, 0.036], [0.21, 0.13, 0.07], n);
      if (kind === 'soil') c = mix3([0.035, 0.022, 0.013], [0.07, 0.045, 0.026], n);
      c = mix3(c, mul(c, 0.55), clod * 0.5);
      const k = 0.85 + (grain - 0.5) * 0.4;
      const o = (y * w + x) * 3; C[o] = c[0] * k; C[o + 1] = c[1] * k; C[o + 2] = c[2] * k;
      H[y * w + x] = clod * 0.8 + grain * 0.25 + n * 0.3;
    }
    // pebbles, straw, twig bits
    const stamp = (cx, cy, rx, ry, rot, col, hgt, shadow = true) => {
      const cr = Math.cos(rot), sr = Math.sin(rot), m = Math.ceil(Math.max(rx, ry) * 1.3);
      for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) {
        const lx = (dx * cr + dy * sr) / rx, ly = (-dx * sr + dy * cr) / ry, q = lx * lx + ly * ly;
        const xi = ((Math.floor(cx) + dx) % w + w) % w, yi = ((Math.floor(cy) + dy) % h + h) % h, o = (yi * w + xi) * 3;
        if (q > 1.6) continue;
        if (q > 1) { if (shadow && dx + dy > 0) { C[o] *= 0.8; C[o + 1] *= 0.8; C[o + 2] *= 0.8; } continue; }
        const hz = Math.sqrt(1 - q), sh = 0.6 + 0.4 * clamp(hz - lx * 0.35 - ly * 0.35);
        C[o] = col[0] * sh; C[o + 1] = col[1] * sh; C[o + 2] = col[2] * sh; H[yi * w + xi] = 1 + hz * hgt;
      }
    };
    for (let k = 0; k < 900; k++) { const r = 1.5 + Math.pow(R(), 3) * 9, g = (0.42 + R() * 0.25) ** 2.2 * (kind === 'soil' ? 0.5 : 1); stamp(R() * w, R() * h, r, r * (0.6 + R() * 0.4), R() * 3, [g, g * 0.9, g * 0.8], 1.5); }
    if (kind === 'field') for (let k = 0; k < 1100; k++) { const l = 6 + R() * 22, g = R(); const col = (g < 0.6 ? [0.62, 0.53, 0.33] : g < 0.85 ? [0.45, 0.42, 0.22] : [0.3, 0.38, 0.16]).map((x) => x ** 2.2); stamp(R() * w, R() * h, l, 0.9 + R() * 0.8, R() * Math.PI, col, 0.5, false); }
    for (let i = 0; i < w * h; i++) { const o = i * 4; A[o] = toByte(Math.pow(clamp(C[i * 3]), 1 / 2.2)); A[o + 1] = toByte(Math.pow(clamp(C[i * 3 + 1]), 1 / 2.2)); A[o + 2] = toByte(Math.pow(clamp(C[i * 3 + 2]), 1 / 2.2)); A[o + 3] = 255; }
    return { map: dataTex(THREE, w, h, A), normalMap: normalTex(THREE, w, h, H, 2.5) };
  });
}
function rockGeometry(THREE, R, detail = 3) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, s = R() * 100;
  for (let i = 0; i < p.count; i++) {
    const v = [p.getX(i), p.getY(i), p.getZ(i)], n = fbm(v[0] * 0.5 + 0.5, v[1] * 0.5 + 0.5, 3, s | 0, 4);
    const k = 0.8 + n * 0.45; p.setXYZ(i, v[0] * k, v[1] * k * 0.7, v[2] * k);
  }
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------ soil cut-away block
// Local frame: the soil surface is y = 0, the block spans x in [-w/2, w/2], y in [-h, 0], z in
// [-d/2, d/2]; the X-ray cut face is the +z side. Roots placed inside show through the cut face and
// a few thin soil-haze layers (deeper roots fade into the soil = depth cue). .seed germinates.
export function makeSoilCutaway(THREE, { w = 0.6, h = 0.5, d = 0.14, seed = 3, surround = true, seedPos = [0, -0.035, 0.03], seedSize = 0.014, xray = 0.24, haze = 0.17 } = {}) {
  const R = mulberry32(seed * 31 + 1), group = new THREE.Group(); group.name = 'soil_cutaway';
  const sec = soilSectionTextures(THREE, seed, h / w);
  const solid = new THREE.MeshStandardMaterial({ map: sec.map, normalMap: sec.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95 });
  // section textures are authored top row = soil surface; PlaneGeometry has v = 1 at the top, so flip v
  const face = (W2, H2, mat) => { const g = new THREE.PlaneGeometry(W2, H2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return new THREE.Mesh(g, mat); };
  // back + sides + bottom (solid soil)
  const back = face(w, h, solid.clone()); back.material.color = new THREE.Color(0x9a8e86); back.position.set(0, -h / 2, -d / 2); group.add(back);
  const sideMat = solid.clone();
  for (const s of [-1, 1]) { const m = face(d, h, sideMat); m.rotation.y = s * Math.PI / 2; m.position.set(s * w / 2, -h / 2, 0); m.material.side = THREE.DoubleSide; group.add(m); }
  const bot = face(w, d, solid); bot.rotation.x = Math.PI / 2; bot.position.set(0, -h, 0); group.add(bot);
  // soil haze inside the volume (no stones painted: just soil body), deeper = more layers in front
  const hazeTex = cached(THREE, 'haze_' + seed, () => {
    const W2 = 256, H2 = Math.round(256 * h / w), A = new Uint8Array(W2 * H2 * 4);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const u = x / W2, v = y / H2, n = fbm2(u, v, 16, 16, seed + 21, 4), d0 = v + (n - 0.5) * 0.05;
      const c = d0 < 0.17 ? [0.02, 0.012, 0.007] : d0 < 0.55 ? [0.09, 0.05, 0.027] : [0.12, 0.065, 0.033];
      const k = 0.7 + n * 0.6, o = (y * W2 + x) * 4;
      A[o] = toByte(Math.pow(c[0] * k, 1 / 2.2)); A[o + 1] = toByte(Math.pow(c[1] * k, 1 / 2.2)); A[o + 2] = toByte(Math.pow(c[2] * k, 1 / 2.2)); A[o + 3] = toByte(0.55 + n * 0.45);
    }
    return dataTex(THREE, W2, H2, A, { repeat: false });
  });
  const hazeLayers = [];
  for (let k = 1; k <= 3; k++) {
    const m = face(w, h, new THREE.MeshStandardMaterial({ map: hazeTex, transparent: true, opacity: haze, depthWrite: false, roughness: 1 }));
    m.position.set(0, -h / 2, -d / 2 + (d * k) / 4); m.renderOrder = 1; group.add(m); hazeLayers.push(m);
  }
  // the cut face: the same section texture, partly transparent ("X-ray"), then the glass in front
  const cutMat = new THREE.MeshStandardMaterial({ map: sec.map, normalMap: sec.normalMap, roughness: 0.95, transparent: true, opacity: xray, depthWrite: false });
  const cut = face(w, h, cutMat); cut.position.set(0, -h / 2, d / 2 - 0.0005); cut.renderOrder = 2; group.add(cut);
  const glass = face(w, h, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, depthWrite: false }));
  glass.position.set(0, -h / 2, d / 2 + 0.001); glass.renderOrder = 3; group.add(glass);
  // glass edge highlights
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe9e6, roughness: 0.1, transparent: true, opacity: 0.35, clearcoat: 1 });
  for (const [sx, sy, px, py] of [[w, 0.0025, 0, -h], [0.0025, h, -w / 2, -h / 2], [0.0025, h, w / 2, -h / 2]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.004), edgeMat); e.position.set(px, py, d / 2 + 0.002); group.add(e); }
  // the surface: crumbly, displaced; extends behind the block when surround is on
  const gt = groundTextures(THREE, seed + 2, 'soil');
  const surfW = surround ? Math.max(w * 4, 3) : w, surfD = surround ? Math.max(d * 20, 3) : d;
  const sg = new THREE.PlaneGeometry(surfW, surfD, 220, 220); sg.rotateX(-Math.PI / 2);
  { const p = sg.attributes.position, uv = sg.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) - surfD / 2 + d / 2;
      p.setZ(i, z);
      const inBlock = Math.abs(x) <= w / 2 + 1e-6 && z >= -d / 2 - 1e-6;
      const hgt = (fbm((x / surfW) + 0.5, (z / surfD) + 0.5, 40, seed + 4, 4) - 0.5) * 0.008 + (fbm(x * 2 + 0.5, z * 2 + 0.5, 8, seed + 6, 3) - 0.5) * 0.008;
      p.setY(i, inBlock ? hgt * sstep(d / 2 + 0.0001, d / 2 - 0.01, z) * sstep(w / 2, w / 2 - 0.01, Math.abs(x)) : hgt);
      uv.setXY(i, x * 4, z * 4);
    }
    sg.computeVertexNormals(); }
  // keep only the part over the block plus behind / beside it (nothing in front of the cut)
  { const idx = sg.index.array, p = sg.attributes.position, keep = [];
    for (let t = 0; t < idx.length; t += 3) { const zs = [idx[t], idx[t + 1], idx[t + 2]].map((i) => p.getZ(i)), xs = [idx[t], idx[t + 1], idx[t + 2]].map((i) => p.getX(i));
      const front = Math.max(...zs) > d / 2 + 1e-5 && true; if (!front) keep.push(idx[t], idx[t + 1], idx[t + 2]); void xs; }
    sg.setIndex(keep); }
  const surf = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: gt.map, normalMap: gt.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.97 }));
  gt.map.repeat.set(1, 1); surf.receiveShadow = true; group.add(surf);
  // a lip of soil on the cut edge so the surface reads as the top of the cross-section
  
  // real stones inside the volume (also obstacles for roots)
  const stones = [], rockMat = new THREE.MeshStandardMaterial({ color: 0x5e554a, roughness: 0.9, normalMap: sec.normalMap });
  for (let k = 0; k < 11; k++) {
    const r = rr(R, 0.006, 0.016), p = [rr(R, -w * 0.45, w * 0.45), -rr(R, 0.09, h * 0.92), rr(R, -d * 0.35, d * 0.3)];
    if (Math.abs(p[0] - seedPos[0]) < 0.05 && p[1] > -0.2) continue;
    const m = new THREE.Mesh(rockGeometry(THREE, R), rockMat); m.scale.setScalar(r); m.position.set(...p); m.rotation.set(R() * 3, R() * 3, R() * 3); m.castShadow = true; group.add(m);
    stones.push({ p, r });
  }
  // tiny surface grasses / sprouts well behind the seed, for scale
  const bladeG = new THREE.PlaneGeometry(1, 1, 1, 4); bladeG.translate(0, 0.5, 0);
  { const p = bladeG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.95)); p.setZ(i, y * y * 0.3); } bladeG.computeVertexNormals(); }
  const NBL = surround ? 1800 : 0;
  if (NBL) {
    const bm = new THREE.InstancedMesh(bladeG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), NBL);
    bm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NBL * 3), 3);
    const M = bm.instanceMatrix.array;
    for (let i = 0; i < NBL; i++) {
      const cx = rr(R, -surfW * 0.4, surfW * 0.4), cz = -d / 2 - Math.pow(R(), 0.7) * surfD * 0.6 - 0.02;
      const a = R() * TAU, hgt = rr(R, 0.02, 0.07) * (1 + Math.max(0, -cz - 0.3) * 1.5);
      const Y = norm([Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3]), [X, Y2, Z] = basisY(Y, [Math.cos(a + 1), 0, Math.sin(a + 1)]);
      writeMat(M, i, X, Y2, Z, [cx, 0, cz], 0.004 + hgt * 0.05, hgt, hgt);
      setCol(bm.instanceColor.array, i, R() < 0.7 ? srgb(THREE, '#6f8f3a') : srgb(THREE, '#a39a5a'));
    }
    bm.castShadow = true; group.add(bm);
  }
  const sd = makeSeed(THREE, { size: seedSize, seed: seed + 9, surface: -seedPos[1] });
  sd.object3d.position.set(...seedPos); group.add(sd.object3d);
  return { object3d: group, seed: sd, stones, surfaceY: 0, frontZ: d / 2, size: { w, h, d }, seedRootOrigin: new THREE.Vector3(...seedPos).add(sd.rootOrigin) };
}

// ------------------------------------------------------------------ ground for tree shots
export function makeGround(THREE, { size = 160, seed = 1, clear = 1.3, grass = 2600, pebbles = 220, center = [0, 0] } = {}) {
  const R = mulberry32(seed * 53 + 9), group = new THREE.Group(); group.name = 'ground';
  const gt = groundTextures(THREE, seed, 'field');
  const g = new THREE.PlaneGeometry(size, size, 320, 320); g.rotateX(-Math.PI / 2);

  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x - center[0], z - center[1]);
    const hgt = (fbm(x / size + 0.5, z / size + 0.5, 6, seed, 4) - 0.5) * 0.6 * sstep(3, 12, r) + (fbm(x / size + 0.5, z / size + 0.5, 60, seed + 1, 3) - 0.5) * 0.04;
    p.setY(i, hgt - (r < clear ? 0.015 * (1 - r / clear) : 0));
    uv.setXY(i, x / 2.2, z / 2.2);
    const m = fbm(x / size + 0.5, z / size + 0.5, 10, seed + 2, 4), bare = 1 - sstep(clear * 0.8, clear * 1.6, r);
    const c = mix3(mix3([0.82, 0.78, 0.62], [0.68, 0.74, 0.5], m), [0.75, 0.66, 0.55], bare);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: gt.map, normalMap: gt.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.96, vertexColors: true }));
  ground.receiveShadow = true; group.add(ground);
  const heightAt = (x, z) => { const r = Math.hypot(x - center[0], z - center[1]); return (fbm(x / size + 0.5, z / size + 0.5, 6, seed, 4) - 0.5) * 0.6 * sstep(3, 12, r); };
  // grass: tufts of curved tapered blades, dry Mediterranean mix of green and straw
  const bladeG = new THREE.PlaneGeometry(1, 1, 1, 5); bladeG.translate(0, 0.5, 0);
  { const q = bladeG.attributes.position; for (let i = 0; i < q.count; i++) { const y = q.getY(i); q.setX(i, q.getX(i) * (1 - y * 0.92)); q.setZ(i, y * y * 0.35); } bladeG.computeVertexNormals(); }
  const PER = 14, N = grass * PER;
  const bm = new THREE.InstancedMesh(bladeG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide }), N);
  bm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const M = bm.instanceMatrix.array, Cc = bm.instanceColor.array;
  const greens = ['#5d7a2e', '#6f8a3a', '#8a9446', '#a69a5c', '#b8a46a', '#4f6a2a'].map((h) => srgb(THREE, h));
  let n = 0;
  for (let t = 0; t < grass; t++) {
    let x, z, r;
    do { const a = R() * TAU; r = clear * 1.05 + Math.pow(R(), 1.6) * 14; x = center[0] + Math.cos(a) * r; z = center[1] + Math.sin(a) * r; } while (false);
    const tuft = rr(R, 0.12, 0.4) * (r < clear * 1.6 ? 0.6 : 1), base = heightAt(x, z), dry = R();
    for (let b = 0; b < PER; b++) {
      const a = R() * TAU, lean = rr(R, 0.1, 0.55), Y = norm([Math.cos(a) * lean, 1, Math.sin(a) * lean]);
      const [X, Y2, Z] = basisY(Y, [Math.cos(a), 0, Math.sin(a)]);
      const hh = tuft * rr(R, 0.5, 1.1);
      writeMat(M, n, X, Y2, Z, [x + rr(R, -0.04, 0.04), base - 0.005, z + rr(R, -0.04, 0.04)], rr(R, 0.004, 0.007), hh, hh);
      setCol(Cc, n, mix3(greens[Math.floor(dry * 3.99) + (R() < 0.3 ? 1 : 0)], greens[5], R() * 0.3)); n++;
    }
  }
  bm.castShadow = true; bm.receiveShadow = true; group.add(bm);
  // pebbles
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 0.9, normalMap: gt.normalMap });
  const rg = rockGeometry(THREE, R, 2), rm = new THREE.InstancedMesh(rg, rockMat, pebbles), RM = rm.instanceMatrix.array;
  for (let i = 0; i < pebbles; i++) { const a = R() * TAU, r = Math.pow(R(), 0.8) * 8, s = 0.01 + Math.pow(R(), 4) * 0.12; const x = center[0] + Math.cos(a) * r, z = center[1] + Math.sin(a) * r; const [X, Y, Z] = basisY(randUnit(R), [1, 0, 0]); writeMat(RM, i, X, Y, Z, [x, heightAt(x, z) + s * 0.1, z], s, s * 0.7, s * 1.1); }
  rm.castShadow = true; rm.receiveShadow = true; group.add(rm);
  return { object3d: group, heightAt };
}

// ------------------------------------------------------------------ basket
export function makeBasket(THREE, { radius = 0.22, height = 0.17, seed = 2 } = {}) {
  const group = new THREE.Group(); group.name = 'basket';
  const tex = cached(THREE, 'weave', () => {
    const w = 256, h = 256, H = new Float32Array(w * h), C = new Uint8Array(w * h * 4);
    const NU = 16, NV = 12;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x / w) * NU, v = (y / h) * NV, iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
      const over = (iu + iv) % 2 === 0;                    // weaver over / under the stake
      const weaver = Math.sin(Math.PI * fv), stake = Math.sin(Math.PI * fu);
      const hh = over ? weaver * (0.6 + 0.4 * Math.sin(Math.PI * fu)) : stake * 0.5 + weaver * 0.35;
      const fib = fbm2(x / w, y / h, 64, 4, 71, 3);
      H[y * w + x] = hh + fib * 0.15;
      const k = (0.55 + 0.45 * hh) * (0.85 + fib * 0.3), o = (y * w + x) * 4;
      C[o] = toByte(0.78 * k); C[o + 1] = toByte(0.6 * k); C[o + 2] = toByte(0.38 * k); C[o + 3] = 255;
    }
    return { map: dataTex(THREE, w, h, C), normalMap: normalTex(THREE, w, h, H, 7) };
  });
  const prof = [], N = 16;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(radius * (0.74 + 0.26 * Math.sin(t * Math.PI * 0.5)) + 0.004 * Math.sin(t * Math.PI), t * height)); }
  const outer = new THREE.LatheGeometry(prof, 64);
  const mat = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.85, side: THREE.DoubleSide });
  tex.map.repeat.set(3, 1); tex.normalMap.repeat.set(3, 1);
  const wall = new THREE.Mesh(outer, mat); wall.castShadow = wall.receiveShadow = true; group.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.745, 48).rotateX(-Math.PI / 2), mat); floor.position.y = 0.012; floor.receiveShadow = true; group.add(floor);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.0 + 0.004, 0.011, 12, 96).rotateX(Math.PI / 2), mat); rim.position.y = height; rim.castShadow = true; group.add(rim);
  const floorY = 0.012;
  // resting slots for n fruit of radius fr: hex-packed rings, layer by layer
  function slots(n, fr) {
    const out = [], rIn = radius * 0.74 - fr * 1.05;
    for (let layer = 0; out.length < n && layer < 6; layer++) {
      const y = floorY + fr + layer * fr * 1.55, rl = rIn + layer * fr * 0.55, off = layer % 2 ? fr : 0;
      for (let ring = 0; out.length < n; ring++) {
        const rad = ring * fr * 1.95 + (layer % 2 ? fr * 0.5 : 0); if (rad > rl) break;
        const m = ring === 0 ? 1 : Math.floor((TAU * rad) / (fr * 2.02));
        for (let k = 0; k < m && out.length < n; k++) { const a = (k / m) * TAU + off + layer; out.push([Math.cos(a) * rad, y, Math.sin(a) * rad]); }
      }
    }
    return out;
  }
  return { object3d: group, floorY, slots, radius, height };
}

// ------------------------------------------------------------------ falling fruit (closed form)
// fallingFruit({ from:[x,y,z], to:[x,y,z] (resting centre, e.g. a basket slot in world space), t0,
//   radius, gravity = 9.81, restitution = 0.32, seed }) -> (t) => { position:[x,y,z], quaternion:[x,y,z,w], phase }
// phase: 'hanging' (t < t0) | 'falling' | 'bounce' | 'settling' | 'rest'. The fruit lands slightly off
// its slot, bounces once, rolls into the slot and stays there for every t after: it never vanishes.
export function fallingFruit({ from, to, t0 = 0, radius = 0.037, gravity = 9.81, restitution = 0.32, seed = 1 } = {}) {
  const R = mulberry32(seed * 17 + 5), g = gravity;
  const offA = R() * TAU, off = [Math.cos(offA) * radius * 1.1, 0, Math.sin(offA) * radius * 1.1];
  const c1 = [to[0] + off[0], to[1] + radius * 0.35, to[2] + off[2]];
  const H = Math.max(0.01, from[1] - c1[1]), T1 = Math.sqrt((2 * H) / g);
  const vx = (c1[0] - from[0]) / T1, vz = (c1[2] - from[2]) / T1, vImp = g * T1;
  const vb = vImp * restitution, T2 = (2 * vb) / g;
  const c2 = [lerp(c1[0], to[0], 0.55), c1[1], lerp(c1[2], to[2], 0.55)];
  const T3 = 0.5;
  const spinAxis = norm(randUnit(R)), spinW = rr(R, 4, 9);
  const qAxis = (ax, a) => { const s = Math.sin(a / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(a / 2)]; };
  const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const rollAxis = (d) => { const h = [d[0], 0, d[2]], l = Math.hypot(h[0], h[2]); return l < 1e-6 ? [1, 0, 0] : [h[2] / l, 0, -h[0] / l]; };
  const qFallEnd = qAxis(spinAxis, spinW * (T1 + T2 * 0.5));
  return function (t) {
    const tau = t - t0;
    if (tau <= 0) return { position: from.slice(), quaternion: [0, 0, 0, 1], phase: 'hanging' };
    if (tau < T1) return { position: [from[0] + vx * tau, from[1] - 0.5 * g * tau * tau, from[2] + vz * tau], quaternion: qAxis(spinAxis, spinW * tau), phase: 'falling' };
    const t2 = tau - T1;
    if (t2 < T2) {
      const k = t2 / T2;
      return { position: [lerp(c1[0], c2[0], k), c1[1] + vb * t2 - 0.5 * g * t2 * t2, lerp(c1[2], c2[2], k)], quaternion: qAxis(spinAxis, spinW * (T1 + t2 * 0.5)), phase: 'bounce' };
    }
    const t3 = tau - T1 - T2, k = clamp(t3 / T3), e = 1 - Math.pow(1 - k, 3);
    const p = [lerp(c2[0], to[0], e), lerp(c2[1], to[1], e) + Math.abs(Math.sin(k * Math.PI * 2)) * vb * 0.02 * (1 - k), lerp(c2[2], to[2], e)];
    const dist = len(sub(to, c2)) * e, roll = qAxis(rollAxis(sub(to, c2)), dist / radius);
    return { position: p, quaternion: qMul(roll, qFallEnd), phase: k < 1 ? 'settling' : 'rest' };
  };
}

// one loose fruit (for drops, baskets, close-ups): same peel as the tree's fruit, radius 1 (scale it)
export function makeFruitMesh(THREE, { kind = 'orange', color = '#ff7a05' } = {}) {
  const peel = peelTextures(THREE, kind), g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), map: peel.map, normalMap: peel.normalMap, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 }));
  m.scale.y = kind === 'orange' ? 0.93 : 1.28; m.castShadow = m.receiveShadow = true; g.add(m);
  const shape = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = (k / 10) * TAU, r = k % 2 ? 0.45 : 1; k ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const kg = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 }); kg.rotateX(-Math.PI / 2);
  const c = new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ color: 0x4a5a22, roughness: 0.7 })); c.scale.set(0.22, 0.25, 0.22); c.position.y = 0.9; g.add(c);
  return g;
}
