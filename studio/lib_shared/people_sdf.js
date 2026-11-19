// people_sdf.js: signed-distance modelling + surface-nets meshing + skin weights + baked AO.
// Pure JS (no three.js) so it runs in the browser and in node. Units: centimetres, Xbot armature space
// (y up, +z forward, character's left = +x).

// ---------------------------------------------------------------- small vector helpers
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- primitives (all return signed distance)
export const sphere = (c, r) => (x, y, z) => len3(x - c[0], y - c[1], z - c[2]) - r;
// ellipsoid (iq's bound: good near the surface)
export const ellipsoid = (c, r) => (x, y, z) => {
  const px = x - c[0], py = y - c[1], pz = z - c[2];
  const k0 = len3(px / r[0], py / r[1], pz / r[2]), k1 = len3(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]));
  return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
};
// round cone between a (radius ra) and b (radius rb): iq's exact sdRoundCone for arbitrary endpoints
export const roundCone = (a, b, ra, rb) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
    const xx = pax * l2 - bax * yy, xy = pay * l2 - bay * yy, xz = paz * l2 - baz * yy;
    const x2 = xx * xx + xy * xy + xz * xz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
};
// capsule chain through points with radii (smooth-unioned)
export const chain = (pts, radii, k = 0.5) => {
  const segs = []; for (let i = 0; i < pts.length - 1; i++) segs.push(roundCone(pts[i], pts[i + 1], radii[i], radii[i + 1]));
  return union(segs, k);
};
// torus around the y axis through c, major radii (rx, rz) (elliptic), minor radius r; tilt about x (rad)
export const torusY = (c, rx, rz, r, tiltX = 0, tiltZ = 0) => {
  const cx = Math.cos(tiltX), sx = Math.sin(tiltX), cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
  return (x, y, z) => {
    let px = x - c[0], py = y - c[1], pz = z - c[2];
    let qy = py * cx - pz * sx, qz = py * sx + pz * cx; py = qy; pz = qz;            // rotate about x
    const qx = px * cz - py * sz; qy = px * sz + py * cz; px = qx; py = qy;           // rotate about z
    const e = ellipse2(px, pz, rx, rz);
    return Math.sqrt(e * e + py * py) - r;
  };
};
// approx signed distance to an ellipse in 2-D
export function ellipse2(x, z, a, b) {
  const k0 = Math.hypot(x / a, z / b), k1 = Math.hypot(x / (a * a), z / (b * b));
  return k1 < 1e-9 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1;
}
export const box = (c, h, r = 0) => (x, y, z) => {
  const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

// ---------------------------------------------------------------- operators
export const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
export const union = (fs, k = 0) => (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k); return d; };
export const shell = (f, t) => (x, y, z) => Math.abs(f(x, y, z) + t / 2) - t / 2;   // inner side grows inward

// monotone cubic interpolation (Fritsch-Carlson) of keys [[x, v], ...] sorted by x: smooth profiles
export function curve(keys) {
  keys = [...keys].sort((p, q) => p[0] - q[0]);
  const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]), d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// a body of revolution with elliptic sections: keys [[y, halfWidthX, halfDepthZ, centreZ, centreX?], ...]
export function lathe(keys) {
  keys = [...keys].sort((p, q) => p[0] - q[0]);
  const fa = curve(keys.map((k) => [k[0], k[1]])), fb = curve(keys.map((k) => [k[0], k[2]])), fc = curve(keys.map((k) => [k[0], k[3]]));
  const y0 = keys[0][0], y1 = keys[keys.length - 1][0];
  const f = (x, y, z) => { const a = fa(y), b = fb(y), c = fc(y); return ellipse2(x, z - c, a, b); };
  f.a = fa; f.b = fb; f.c = fc; f.y0 = Math.min(y0, y1); f.y1 = Math.max(y0, y1);
  return f;
}

// ---------------------------------------------------------------- value noise (seeded, smooth)
export function noise3(seed = 1) {
  const R = mulberry32(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = R() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
    const u = fade(fx), v = fade(fy), w = fade(fz), xi = X & 255, yi = Y & 255, zi = Z & 255;
    const h = (i, j, k) => G[P[P[P[xi + i] + yi + j] + zi + k]];
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
  };
}

// ---------------------------------------------------------------- surface nets
// f: sdf, bb: [x0,y0,z0,x1,y1,z1], h: cell size. Returns { pos: Float32Array, nrm: Float32Array, idx: Uint32Array }
export function mesh(f, bb, h, { project = 1 } = {}) {
  const [x0, y0, z0] = bb;
  const nx = Math.ceil((bb[3] - x0) / h) + 1, ny = Math.ceil((bb[4] - y0) / h) + 1, nz = Math.ceil((bb[5] - z0) / h) + 1;
  const V = new Float32Array(nx * ny * nz);
  // sparse evaluation: sample a coarse grid (every 4th point); a 4x4x4 block whose corner is farther from the
  // surface than the block diagonal (with a safety factor for approximate SDFs) is filled with that corner's value
  const BK = 4, cx = Math.ceil((nx - 1) / BK) + 1, cy = Math.ceil((ny - 1) / BK) + 1, cz = Math.ceil((nz - 1) / BK) + 1;
  const C = new Float32Array(cx * cy * cz), lim = 1.6 * BK * h * 1.7321;
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++)
    C[i + j * cx + k * cx * cy] = f(x0 + Math.min(i * BK, nx - 1) * h, y0 + Math.min(j * BK, ny - 1) * h, z0 + Math.min(k * BK, nz - 1) * h);
  for (let bk = 0; bk < cz - 1; bk++) for (let bj = 0; bj < cy - 1; bj++) for (let bi = 0; bi < cx - 1; bi++) {
    let far = null;
    for (let c = 0; c < 8 && far === null; c++) { const v = C[(bi + (c & 1)) + (bj + ((c >> 1) & 1)) * cx + (bk + ((c >> 2) & 1)) * cx * cy]; if (Math.abs(v) > lim) far = v; }
    const i0 = bi * BK, j0 = bj * BK, k0 = bk * BK, i1 = Math.min(i0 + BK, nx - 1), j1 = Math.min(j0 + BK, ny - 1), k1 = Math.min(k0 + BK, nz - 1);
    for (let k = k0; k <= k1; k++) { const z = z0 + k * h; for (let j = j0; j <= j1; j++) { const y = y0 + j * h, row = j * nx + k * nx * ny;
      for (let i = i0; i <= i1; i++) V[i + row] = far !== null ? far : f(x0 + i * h, y, z); } }
  }
  const sx = 1, sy = nx, sz = nx * ny;
  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cs = (i, j, k) => i + j * (nx - 1) + k * (nx - 1) * (ny - 1);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const g = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const b = i + j * sy + k * sz; let mask = 0;
    for (let c = 0; c < 8; c++) { const v = V[b + CO[c][0] + CO[c][1] * sy + CO[c][2] * sz]; g[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let ax = 0, ay = 0, az = 0, n = 0;
    for (const [a, c] of E) { const ga = g[a], gc = g[c]; if ((ga < 0) === (gc < 0)) continue;
      const t = ga / (ga - gc); ax += CO[a][0] + (CO[c][0] - CO[a][0]) * t; ay += CO[a][1] + (CO[c][1] - CO[a][1]) * t; az += CO[a][2] + (CO[c][2] - CO[a][2]) * t; n++; }
    cell[cs(i, j, k)] = P.length / 3;
    P.push(x0 + (i + ax / n) * h, y0 + (j + ay / n) * h, z0 + (k + az / n) * h);
  }
  const I = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) I.push(a, b, c, a, c, d); else I.push(a, c, b, a, d, c); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {   // x edges
    const v0 = V[i + j * sy + k * sz], v1 = V[i + 1 + j * sy + k * sz]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cs(i, j - 1, k - 1)], cell[cs(i, j, k - 1)], cell[cs(i, j, k)], cell[cs(i, j - 1, k)], v0 < 0);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // y edges
    const v0 = V[i + j * sy + k * sz], v1 = V[i + (j + 1) * sy + k * sz]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cs(i - 1, j, k - 1)], cell[cs(i - 1, j, k)], cell[cs(i, j, k)], cell[cs(i, j, k - 1)], v0 < 0);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // z edges
    const v0 = V[i + j * sy + k * sz], v1 = V[i + j * sy + (k + 1) * sz]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cs(i - 1, j - 1, k)], cell[cs(i, j - 1, k)], cell[cs(i, j, k)], cell[cs(i - 1, j, k)], v0 < 0);
  }
  const pos = new Float32Array(P), nrm = new Float32Array(P.length), e = h * 0.25;
  for (let v = 0; v < pos.length; v += 3) {
    let x = pos[v], y = pos[v + 1], z = pos[v + 2];
    for (let it = 0; it <= project; it++) {           // Newton-project onto the surface, then take the gradient
      const d = f(x, y, z);
      let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
      const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
      if (it < project) { const s = clamp(d, -h * 0.7, h * 0.7); x -= gx * s; y -= gy * s; z -= gz * s; }
      else { nrm[v] = gx; nrm[v + 1] = gy; nrm[v + 2] = gz; }
    }
    pos[v] = x; pos[v + 1] = y; pos[v + 2] = z;
  }
  const idx = new Uint32Array(I);
  return { pos, nrm, idx };
}

// vertex adjacency (CSR) from triangles
export function adjacency(nv, idx) {
  const cnt = new Uint32Array(nv + 1);
  for (let t = 0; t < idx.length; t += 3) { cnt[idx[t]] += 2; cnt[idx[t + 1]] += 2; cnt[idx[t + 2]] += 2; }
  const off = new Uint32Array(nv + 1); for (let i = 0; i < nv; i++) off[i + 1] = off[i] + cnt[i];
  const nb = new Uint32Array(off[nv]), fillp = off.slice(0, nv);
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    nb[fillp[a]++] = b; nb[fillp[a]++] = c; nb[fillp[b]++] = a; nb[fillp[b]++] = c; nb[fillp[c]++] = a; nb[fillp[c]++] = b; }
  return { off, nb };
}

// ---------------------------------------------------------------- skin weights
// segs: [{ bone: index, a:[x,y,z], b:[x,y,z], gain?:1 }]. Weight ~ gain / dist^pw, top 4, then smoothed over the mesh.
// custom(x,y,z) may return [[bone, w], ...] to override. smooth: Laplacian iterations.
export function skinWeights(pos, idx, segs, { pw = 6, smooth = 6, custom = null } = {}) {
  const nv = pos.length / 3, NB = segs.length;
  const boneIds = [...new Set(segs.map((s) => s.bone))], bi = new Map(boneIds.map((b, i) => [b, i])), nb = boneIds.length;
  let W = new Float32Array(nv * nb);
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const c = custom && custom(x, y, z);
    if (c) { let s = 0; for (const [b, w] of c) s += w; for (const [b, w] of c) { const j = bi.get(b); if (j === undefined) throw new Error('skinWeights: custom bone ' + b + ' not in segs'); W[v * nb + j] += w / s; } continue; }
    let s = 0;
    for (let q = 0; q < NB; q++) { const S = segs[q];
      const abx = S.b[0] - S.a[0], aby = S.b[1] - S.a[1], abz = S.b[2] - S.a[2], l2 = abx * abx + aby * aby + abz * abz || 1;
      const t = clamp(((x - S.a[0]) * abx + (y - S.a[1]) * aby + (z - S.a[2]) * abz) / l2);
      const d = Math.max(0.5, len3(x - S.a[0] - abx * t, y - S.a[1] - aby * t, z - S.a[2] - abz * t));
      const w = (S.gain ?? 1) / d ** pw; W[v * nb + bi.get(S.bone)] += w; s += w; }
    for (let j = 0; j < nb; j++) W[v * nb + j] /= s;
  }
  if (smooth > 0) {
    const { off, nb: N } = adjacency(nv, idx); let W2 = new Float32Array(W.length);
    for (let it = 0; it < smooth; it++) {
      for (let v = 0; v < nv; v++) { const a = off[v], b = off[v + 1];
        for (let j = 0; j < nb; j++) { let s = W[v * nb + j]; for (let e = a; e < b; e++) s += W[N[e] * nb + j]; W2[v * nb + j] = s / (1 + b - a); } }
      [W, W2] = [W2, W];
    }
  }
  const skinIndex = new Uint16Array(nv * 4), skinWeight = new Float32Array(nv * 4);
  for (let v = 0; v < nv; v++) {
    const arr = []; for (let j = 0; j < nb; j++) if (W[v * nb + j] > 1e-4) arr.push([boneIds[j], W[v * nb + j]]);
    arr.sort((p, q) => q[1] - p[1]); const top = arr.slice(0, 4); let s = 0; for (const p of top) s += p[1];
    top.forEach((p, i) => { skinIndex[v * 4 + i] = p[0]; skinWeight[v * 4 + i] = p[1] / s; });
  }
  return { skinIndex, skinWeight };
}

// ---------------------------------------------------------------- baked ambient occlusion (SDF cone steps)
export function bakeAO(pos, nrm, f, { steps = [0.8, 1.8, 3.6, 7], strength = 0.85 } = {}) {
  const nv = pos.length / 3, ao = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
    let occ = 0, wsum = 0;
    for (let i = 0; i < steps.length; i++) { const s = steps[i], d = f(x + nx * s, y + ny * s, z + nz * s), w = 1 / (i + 1);
      occ += w * clamp((s - d) / s); wsum += w; }
    ao[v] = clamp(1 - strength * occ / wsum, 0.15, 1);
  }
  return ao;
}
