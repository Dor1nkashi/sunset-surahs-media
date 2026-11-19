// cattle.js: Egyptian long-horned cattle for the king's dream, modelled with signed distances and meshed
// with surface nets (people_sdf.js), so they are smooth, dense and not low-poly. Fat and lean builds from
// one parameter. Legs are separate meshes pivoting at hip and knee for a calm walk; the head nods.
// A pure function of time through walk(t). Units: metres; the cow faces +x, ground at y = 0.
import * as W from '../lib_shared/world.js';
import * as SD from '../lib_shared/people_sdf.js';
const { THREE } = W;

const cache = new Map();
function geom(f, bb, h, seed, colFn) {
  const { pos, nrm, idx } = SD.mesh(f, bb, h, { project: 1 });
  const ao = SD.bakeAO(pos, nrm, f, { steps: [0.02, 0.05, 0.1, 0.18], strength: 0.8 });
  const n = SD.noise3(seed), col = new Float32Array(pos.length);
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const c = colFn(x, y, z, n), a = ao[v];
    col[v * 3] = c[0] * a; col[v * 3 + 1] = c[1] * a; col[v * 3 + 2] = c[2] * a;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// fat: 1 = sleek and heavy, 0 = gaunt (ribs, hip bones, spine ridge)
export function makeCow({ fat = 1, seed = 1, coat = null } = {}) {
  const shape = seed % 3, key = `${fat}|${shape}`;
  const r = SD.mulberry32(shape * 977 + 13), j = (a) => 1 + (r() - 0.5) * a;
  const L = 1.0 * j(0.06), H = 1.0 * j(0.05);
  const bw = (0.25 + 0.15 * fat) * j(0.05), bh = (0.31 + 0.12 * fat) * j(0.05);
  const base = fat > 0.5 ? lin('#8a5634') : lin('#8a8070');
  const tint = coat ? new THREE.Color(coat) : fat > 0.5 ? new THREE.Color(['#ffffff', '#e8d0c0', '#c8a890', '#fff0e0', '#b89078'][seed % 5]) : new THREE.Color(['#ffffff', '#e0dcd4', '#c8c4bc', '#f0e8e0'][seed % 4]);
  // ---- body (torso, belly, neck, head, horns, ears, tail root)
  const torso = SD.ellipsoid([0, 1.02 * H, 0], [0.86 * L, bh, bw]);
  const belly = SD.ellipsoid([-0.05, 0.92 * H - 0.06 * (1 - fat), 0], [0.62 * L, bh * (0.75 + 0.2 * fat), bw * (0.95 + 0.1 * fat)]);
  const chest = SD.ellipsoid([0.55 * L, 1.0 * H, 0], [0.38, bh * 0.95, bw * 0.92]);
  const rump = SD.ellipsoid([-0.62 * L, 1.06 * H, 0], [0.34, bh * 0.92, bw * 0.95]);
  const neck = SD.roundCone([0.7 * L, 1.12 * H, 0], [1.02 * L, 1.12 * H, 0], 0.2 + 0.05 * fat, 0.13);
  const dew = SD.ellipsoid([0.86 * L, 0.88 * H, 0], [0.16, 0.18 * (0.6 + 0.4 * fat), 0.07]);
  const head = SD.roundCone([1.08 * L, 1.16 * H, 0], [1.36 * L, 0.84 * H, 0], 0.115, 0.075);
  const muzzle = SD.ellipsoid([1.36 * L, 0.83 * H, 0], [0.08, 0.075, 0.08]);
  const poll = SD.ellipsoid([1.07 * L, 1.2 * H, 0], [0.08, 0.06, 0.1]);
  const horns = [-1, 1].map((s) => SD.chain([[1.07 * L, 1.24 * H, s * 0.07], [1.05 * L, 1.36 * H, s * 0.2], [1.1 * L, 1.52 * H, s * 0.3], [1.16 * L, 1.62 * H, s * 0.26]], [0.035, 0.028, 0.018, 0.006], 0.01));
  const ears = [-1, 1].map((s) => SD.ellipsoid([1.06 * L, 1.14 * H, s * 0.15], [0.05, 0.025, 0.08]));
  const hump = SD.ellipsoid([0.55 * L, 1.3 * H, 0], [0.18, 0.1 * (0.4 + 0.6 * fat), 0.13]);
  const tailRoot = SD.roundCone([-0.92 * L, 1.24 * H, 0], [-0.98 * L, 0.6 * H, 0], 0.04, 0.015);
  const tuft = SD.ellipsoid([-0.99 * L, 0.52 * H, 0], [0.03, 0.08, 0.03]);
  // gaunt: hip bones (hooks and pins), a spine ridge, the rib cage showing through
  const hooks = [-1, 1].map((s) => SD.sphere([-0.48 * L, 1.28 * H, s * bw * 0.85], 0.06));
  const pins = [-1, 1].map((s) => SD.sphere([-0.86 * L, 1.22 * H, s * 0.08], 0.045));
  const spine = SD.roundCone([-0.8 * L, 1.32 * H, 0], [0.5 * L, 1.34 * H, 0], 0.035, 0.04);
  const lean = 1 - fat;
  const parts = [torso, belly, chest, rump, neck, dew, head, muzzle, poll, ...horns, ...ears, hump, tailRoot, tuft];
  const body = (x, y, z) => {
    let d = parts[0](x, y, z);
    for (let i = 1; i < parts.length; i++) d = SD.smin(d, parts[i](x, y, z), i >= 9 && i <= 12 ? 0.02 : 0.09);
    if (lean > 0.2) {
      for (const f of [...hooks, ...pins, spine]) d = SD.smin(d, f(x, y, z), 0.06);
      // ribs: shallow grooves around the barrel, only on the flanks
      const ribZone = SD.sstep(-0.3, -0.1, x) * (1 - SD.sstep(0.35, 0.55, x)) * SD.sstep(0.7, 0.95, y / H);
      d += lean * 0.012 * ribZone * (0.5 + 0.5 * Math.cos(x * 2 * Math.PI / 0.085));
      // sunken flank in front of the hip
      d += lean * 0.03 * Math.exp(-(((x + 0.32 * L) / 0.12) ** 2) - (((y - 1.0 * H) / 0.15) ** 2));
    }
    return d;
  };
  const colFn = (x, y, z, n) => {
    const v = 0.85 + 0.15 * n(x * 6, y * 6, z * 6) + 0.05 * n(x * 30, y * 30, z * 30);
    let c = base.map((k) => k * v);
    const belly = SD.sstep(0.95 * H, 0.75 * H, y), muzz = SD.sstep(1.25 * L, 1.36 * L, x);
    c = c.map((k, i) => k * (1 - 0.25 * belly) + [0.9, 0.85, 0.78][i] * 0.25 * belly * 0.5);
    if (muzz > 0) c = c.map((k, i) => k * (1 - muzz) + [0.12, 0.1, 0.09][i] * muzz);
    const hornK = SD.sstep(1.26 * H, 1.32 * H, y) * SD.sstep(0.95 * L, 1.0 * L, x);
    if (hornK > 0) c = c.map((k, i) => k * (1 - hornK) + [0.72, 0.66, 0.55][i] * hornK);
    return c;
  };
  if (!cache.has(key)) {
    const bodyG = geom(body, [-1.1 * L, 0.45 * H, -0.55, 1.5 * L, 1.72 * H, 0.55], 0.018, seed, colFn);
    // one leg (front or hind), local origin at the hip/shoulder pivot; knee pivot at -0.42
    const legThick = 0.055 + 0.025 * fat;
    const upper = SD.chain([[0, 0.05, 0], [0, -0.22, 0], [0.01, -0.44, 0]], [legThick * 1.5, legThick * 1.1, legThick * 0.75], 0.03);
    const lower = SD.chain([[0, 0, 0], [0, -0.3, 0], [0.02, -0.47, 0]], [legThick * 0.75, legThick * 0.6, legThick * 0.62], 0.02);
    const hoof = SD.ellipsoid([0.035, -0.5, 0], [0.06, 0.035, 0.05]);
    const lc = (x, y, z, n) => { const v = 0.85 + 0.15 * n(x * 9, y * 9, z * 9); const hk = SD.sstep(-0.42, -0.47, y); return base.map((k, i) => (k * v) * (1 - hk) + [0.1, 0.08, 0.07][i] * hk); };
    const upG = geom(upper, [-0.15, -0.5, -0.15, 0.15, 0.15, 0.15], 0.012, seed + 1, lc);
    const loG = geom((x, y, z) => SD.smin(lower(x, y, z), hoof(x, y, z), 0.02), [-0.12, -0.56, -0.1, 0.14, 0.08, 0.1], 0.01, seed + 2, lc);
    cache.set(key, { bodyG, upG, loG });
  }
  const { bodyG, upG, loG } = cache.get(key);
  const mat = new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 0.62 + 0.25 * (1 - fat), metalness: 0 });
  const root = new THREE.Group(), body3 = new THREE.Mesh(bodyG, mat); body3.castShadow = body3.receiveShadow = true; root.add(body3);
  const legs = [];
  for (const [fx, sz] of [[0.6, 1], [0.6, -1], [-0.62, 1], [-0.62, -1]]) {
    const hip = new THREE.Group(); hip.position.set(fx * L, 0.95 * H, sz * (bw * 0.62)); root.add(hip);
    const up = new THREE.Mesh(upG, mat); up.castShadow = true; hip.add(up);
    const knee = new THREE.Group(); knee.position.set(0.01, -0.44, 0); hip.add(knee);
    const lo = new THREE.Mesh(loG, mat); lo.castShadow = true; knee.add(lo);
    legs.push({ hip, knee, front: fx > 0, side: sz });
  }
  // the stance puts hooves at y = 0: hip 0.95H - 0.44 - 0.5 => lift the whole cow
  const lift = 0.95 * H - 0.44 - 0.53; root.userData.lift = -lift;
  root.position.y = -lift;
  // walk(phase, amp): legs swing in a lateral-sequence walk; amp 0 = standing square
  root.userData.walk = (ph, amp = 1) => {
    const order = { '1,1': 0, '-1,-1': 0.25, '1,-1': 0.5, '-1,1': 0.75 };
    for (const l of legs) {
      const o = order[`${l.front ? 1 : -1},${l.side}`], a = (ph + o) * Math.PI * 2;
      const swing = Math.sin(a), lift = Math.max(0, Math.cos(a));
      l.hip.rotation.z = amp * (0.32 * swing);
      l.knee.rotation.z = amp * (l.front ? 0.55 : -0.5) * lift * lift;
    }
    body3.rotation.z = amp * 0.015 * Math.sin(ph * Math.PI * 4);
    body3.position.y = amp * 0.012 * Math.cos(ph * Math.PI * 4);
  };
  root.userData.walk(0, 0);
  root.userData.L = L;
  return root;
}

// one ear of grain (wheat/emmer) on a stalk, close-up quality: plump green (dry 0) or shrivelled grey (dry 1)
export function grainSpike({ dry = 0, seed = 1, h = 1.0 } = {}) {
  const r = SD.mulberry32(seed * 31 + 7), g = new THREE.Group();
  const green = new THREE.Color(0x6f9a3a), gold = new THREE.Color(0x9a9078), col = green.clone().lerp(gold, dry);
  const stemMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.9), roughness: 0.6 + 0.3 * dry });
  const earMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 + 0.4 * dry });
  // the stalk bends over at the top when dry (droops) and stands straight when green
  const bend = 0.12 + 0.9 * dry * (0.8 + 0.4 * r());
  const pts = []; for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push(new THREE.Vector3(Math.sin(s * s * bend) * h * 0.35, h * s * (1 - 0.15 * dry * s * s), 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.004, 8), stemMat));
  for (const [s, a] of [[0.3, 0.5], [0.55, 3.6]]) {        // two leaves
    const lf = new THREE.PlaneGeometry(0.018, 0.3, 1, 12), lp = lf.attributes.position;
    for (let i = 0; i < lp.count; i++) { const y = lp.getY(i) / 0.3 + 0.5; lp.setX(i, lp.getX(i) * (1 - y * 0.85) * (1 - 0.5 * dry)); lp.setZ(i, y * y * (0.1 + 0.15 * dry)); lp.setY(i, y * 0.3); }
    lf.computeVertexNormals(); const m = new THREE.Mesh(lf, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, side: THREE.DoubleSide }));
    m.position.copy(curve.getPoint(s)); m.rotation.set(-0.6, a, 0); g.add(m);
  }
  // the ear: spikelets alternating up a rachis, each a plump grain (shrivelled when dry) with an awn
  const top = curve.getPoint(1), dir = curve.getTangent(1).normalize();
  const ear = new THREE.Group(); ear.position.copy(top); ear.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(ear);
  const N = 16, plump = 1 - 0.55 * dry;
  const grain = new THREE.SphereGeometry(1, 14, 10);
  const awnG = new THREE.CylinderGeometry(0.0004, 0.0007, 1, 4, 1).translate(0, 0.5, 0);
  const awnMat = new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xd8cfa8), 0.4), roughness: 0.7 });
  for (let k = 0; k < N; k++) {
    const side = k % 2 ? 1 : -1, y = 0.006 + k * 0.0065, sz = (0.0085 - 0.003 * Math.abs(k / N - 0.45)) * plump;
    const m = new THREE.Mesh(grain, earMat); m.scale.set(sz, sz * 1.9, sz * (0.8 + 0.2 * plump)); m.position.set(side * 0.0055, y, 0); m.rotation.z = side * 0.35; ear.add(m);
    const m2 = m.clone(); m2.position.z = 0.004 * side; m2.rotation.x = 0.4 * side; ear.add(m2);
    const aw = new THREE.Mesh(awnG, awnMat); aw.scale.set(1, 0.06 + 0.02 * r(), 1); aw.position.set(side * 0.008, y + sz, 0); aw.rotation.z = side * (0.22 + 0.1 * dry); ear.add(aw);
  }
  W.shadows(g);
  g.userData.ear = ear;
  return g;
}
