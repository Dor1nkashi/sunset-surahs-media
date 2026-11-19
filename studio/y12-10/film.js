// y12-10 "Seven Fat Cows, Seven Thin Cows, and a Plan That Saved a Country" (Yusuf 12:43, 12:47).
// Three places: the king's dream (a hazy Nile bank at dawn: cattle, grain spikes), the palace hall at
// night (advisers, the empty carved chair), and the fields and granary of the plan (seven plots, sheaves,
// the storeroom filling, a drought plot, the store door closing to a gold sliver). Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { palace_hall, nile_fields_granary } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
import { makeCow, grainSpike } from './cattle.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 37.97;

// ------------------------------------------------------------------ the dream: a Nile bank at dawn
async function dreamSet() {
  const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group);
  const atmo = await W.atmosphere(scene, { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: 155 }, sunI: 2.4, envI: 0.8, fog: 0.007, fogGain: 0.6, blur: 0.08, shadowBox: 30, focus: [0, 0, -4] });
  const n = W.noise2(5);
  // the river lies at z < -9 (water at y = -0.35); the bank rises gently to the fields at z > -2
  const height = (x, z) => -0.9 * (1 - W.sstep(-12, -3, z)) + 0.35 * W.sstep(-3, 8, z) + 0.06 * n(x / 4, z / 4) + 0.02 * n(x, z);
  const mt = await W.terrainMaterial([{ name: 'brown_mud_dry', tile: 2.4 }, { name: 'grass_ground', tile: 3 }, { name: 'sand_01', tile: 4, tint: 0xe8d0a8 }], { macro: 0.2 });
  const T = W.terrain({ size: 500, seg: 360, centre: [0, -4], height, material: mt, weights: (x, z) => [1 - W.sstep(-4, 2, z) + 0.2, W.sstep(-2, 4, z) * 1.3, 0.2] });
  group.add(T.mesh);
  const river = W.water(new THREE.PlaneGeometry(900, 300).rotateX(-Math.PI / 2).translate(0, -0.35, -158), { color: 0x2a3e44, rough: 0.035, tile: 4, flow: [0.02, 0.004] });
  group.add(river);
  // reeds along the waterline (instanced blades)
  const reedG = new THREE.CylinderGeometry(0.004, 0.008, 1, 4, 3).translate(0, 0.5, 0), reedM = new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.8 });
  const NR = 2400, reeds = new THREE.InstancedMesh(reedG, reedM, NR), r = W.rng(9), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < NR; i++) { let x = -40 + r() * 90, z = -9.5 + r() * 2.4; if (Math.abs(x - 2) < 9 && r() < 0.85) x += 22 * Math.sign(x - 2 || 1);
    Q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3)); Mx.compose(V(x, height(x, z) - 0.05, z), Q, V(1, 0.8 + r() * 1.4, 1)); reeds.setMatrixAt(i, Mx); }
  reeds.castShadow = true; group.add(reeds);
  // palms on the far side, in the haze
  for (let i = 0; i < 8; i++) { const pm = W.datePalm({ seed: 30 + i, height: 9 + r() * 4 }); pm.position.set(-30 + i * 11 + r() * 4, height(0, 14), 12 + r() * 8); group.add(pm); }
  // the cattle: seven fat (sleek, reddish) and seven lean (grey, ribs showing)
  const fat = [], lean = [];
  for (let i = 0; i < 7; i++) { const c = makeCow({ fat: 1, seed: i }); group.add(c); fat.push(c); }
  for (let i = 0; i < 7; i++) { const c = makeCow({ fat: 0, seed: i + 3 }); group.add(c); lean.push(c); }
  // grain: a clump of seven green spikes (row A) and a clump where seven dry ones stand among seven green (row B)
  const rowA = [], rowB = [];
  for (let i = 0; i < 7; i++) { const s = grainSpike({ dry: 0, seed: i, h: 0.95 + 0.08 * Math.sin(i * 2.3) }); s.position.set(14 + i * 0.07, height(14, 5), 5 + 0.02 * Math.sin(i * 3)); group.add(s); rowA.push(s); }
  for (let i = 0; i < 14; i++) { const dry = i % 2 ? 1 : 0, s = grainSpike({ dry, seed: 20 + i, h: 0.92 + 0.08 * Math.sin(i * 1.7) });
    s.position.set(24 + i * 0.055, height(24, 5), 5 + 0.05 * Math.sin(i * 2.1) + (dry ? 0.03 : 0)); s.userData.dry = dry; group.add(s); rowB.push(s); }
  const cameras = {
    low:    { pos: [-7.5, 0.25, -6.6], look: [8, 0.6, -7.8], fov: 44 },
    clean:  { pos: [-3, 0.6, -5.5], look: [6, 0.1, -40], fov: 40 },
    row:    { pos: [8, 1.25, 7.5], look: [7.5, 0.9, -2.6], fov: 46 },
    spikeA: { pos: [14.24, 0.92, 5.75], look: [14.24, 0.98, 5.0], fov: 22 },
    spikeB: { pos: [24.4, 0.9, 5.8], look: [24.38, 0.95, 5.0], fov: 24 },
  };
  return { name: 'dream', scene, group, atmo, exposure: 1.0, bloom: 0.2, bloomThreshold: 0.88, cameras, props: { T, river, fat, lean, rowA, rowB, height },
    update(t) { river.userData.update(t); } };
}

// a sheaf: a bound bundle of cut stalks with ears at the top
function sheaf(seed = 1, { ripe = 0.25 } = {}) {
  const g = new THREE.Group(), r = W.rng(seed), N = 140;
  const stalk = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4, 1).translate(0, 0.5, 0);
  const col = new THREE.Color(0x7a9a3a).lerp(new THREE.Color(0xc8a85a), ripe);
  const sm = new THREE.InstancedMesh(stalk, new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 }), N);
  const ear = new THREE.SphereGeometry(1, 8, 6), em = new THREE.InstancedMesh(ear, new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xd8c070), 0.3), roughness: 0.6 }), N);
  const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), dir = V(), up = V(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const a = r() * 6.283, rr = Math.sqrt(r()) * 0.06, tieY = 0.38;
    const bot = V(Math.cos(a) * rr * 2.0, 0, Math.sin(a) * rr * 2.0), tie = V(Math.cos(a) * rr * 0.7, tieY, Math.sin(a) * rr * 0.7);
    const top = tie.clone().add(tie.clone().sub(bot).normalize().multiplyScalar(0.55)).add(V(Math.cos(a) * 0.12 * r(), 0, Math.sin(a) * 0.12 * r()));
    const L1 = tie.distanceTo(bot) + top.distanceTo(tie);
    dir.copy(top).sub(bot).normalize(); Q.setFromUnitVectors(up, dir); Mx.compose(bot, Q, V(1, L1, 1)); sm.setMatrixAt(i, Mx);
    Mx.compose(top.clone().add(dir.clone().multiplyScalar(0.04)), Q, V(0.009, 0.04, 0.008)); em.setMatrixAt(i, Mx);
  }
  sm.castShadow = em.castShadow = true; g.add(sm, em);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 32), new THREE.MeshStandardMaterial({ color: 0x8a7048, roughness: 0.9 })); band.rotation.x = Math.PI / 2; band.position.y = 0.38; g.add(band);
  g.userData.tieY = 0.38;
  return g;
}
// a cracked dry-mud ground plate with dead stubble (the drought plot)
function droughtPlot(w, d, seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'), r = W.rng(seed);
  x.fillStyle = '#a88a64'; x.fillRect(0, 0, 1024, 1024);
  const pts = Array.from({ length: 140 }, () => [r() * 1024, r() * 1024]);
  const img = x.getImageData(0, 0, 1024, 1024), dd = img.data;
  for (let j = 0; j < 1024; j += 1) for (let i = 0; i < 1024; i += 1) {
    let a = 1e9, b = 1e9; for (const [px, py] of pts) { const dx = Math.min(Math.abs(px - i), 1024 - Math.abs(px - i)), dy = Math.min(Math.abs(py - j), 1024 - Math.abs(py - j)), q = dx * dx + dy * dy; if (q < a) { b = a; a = q; } else if (q < b) b = q; }
    const e = Math.sqrt(b) - Math.sqrt(a), k = (j * 1024 + i) * 4, crack = e < 3 ? 0.25 : e < 6 ? 0.7 : 1, shade = 0.85 + 0.15 * Math.min(1, e / 40);
    dd[k] *= crack * shade; dd[k + 1] *= crack * shade; dd[k + 2] *= crack * shade;
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 4, d / 4);
  const g = new THREE.Group();
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 3, roughness: 0.95 })); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; g.add(pl);
  const N = 900, st = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.004, 1, 4).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 }), N), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) { Q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9)); Mx.compose(V((r() - 0.5) * w, 0, (r() - 0.5) * d), Q, V(1, 0.08 + r() * 0.25, 1)); st.setMatrixAt(i, Mx); }
  st.castShadow = true; g.add(st);
  return g;
}

let DREAM, PAL, NILE, CAP, P = {}, X = {};
const ST = {};
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    DREAM = await dreamSet();
    PAL = await palace_hall({ time: 'night' });
    NILE = await nile_fields_granary({ time: 'golden', ripe: 0.12 });
    await extras();
    const PP = await K.people();
    P.adv = [
      PP.make({ kind: 'elder', outfit: 'noble', palette: 'white', beard: 'grey', headwear: 'turban', seed: 71, detail: 0.6 }),
      PP.make({ kind: 'man', outfit: 'noble', palette: { robe: '#b8863a', wrap: '#e9dfc8', cloak: '#6b4a24', sash: '#5a2e1a', trim: '#d9b25a', trousers: '#c8b48e' }, beard: 'full', headwear: 'kufi', seed: 72, detail: 0.6 }),
      PP.make({ kind: 'man', outfit: 'noble', palette: { robe: '#3d4a68', wrap: '#e9e2d4', cloak: '#2b2a2c', sash: '#b08a3c', trim: '#c9a046', trousers: '#a89a80' }, beard: 'short', headwear: 'wrap', seed: 73, detail: 0.6 }),
    ];
    for (const a of P.adv) PAL.scene.add(a.object3d);
    P.freed = PP.make({ kind: 'man', outfit: 'worker', palette: { robe: '#8e8a80', wrap: '#cfc6b4', sash: '#5a4a3a', cloak: '#6b645a', trousers: '#a89c88' }, beard: 'short', headwear: 'wrap', seed: 27, detail: 0.8 });
    PAL.scene.add(P.freed.object3d);
    P.farmer = PP.make({ kind: 'man', outfit: 'worker', palette: 'white', beard: 'short', headwear: 'wrap', seed: 81, detail: 0.7 });
    P.lab = PP.make({ kind: 'man', outfit: 'worker', palette: 'white', beard: 'short', headwear: 'keffiyeh', seed: 82, detail: 0.7 });
    P.f2 = PP.make({ kind: 'man', outfit: 'worker', palette: 'sand', beard: 'full', headwear: 'wrap', seed: 83, detail: 0.5 });
    P.f3 = PP.make({ kind: 'man', outfit: 'worker', palette: 'cream', beard: 'short', headwear: 'wrap', seed: 84, detail: 0.5 });
    for (const k of ['farmer', 'lab', 'f2', 'f3']) NILE.scene.add(P[k].object3d);
    for (const [k, s] of [['dream', DREAM], ['pal', PAL], ['nile', NILE]]) { ST[k] = W.stage(s); s.update(0, null, {}); G.R.compile(s.scene, ST[k].camera); }
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    const set = s.set, st = ST[set];
    const A = s.a, B = s.b;
    let cam = K.camLerp(A, B, (s.ease || E.inOutSine)(p));
    if (set === 'dream') { dream(t, i, s, p); if (s.spike) { const h = DREAM.props.height(cam.look[0], 5); cam = { ...cam, pos: [cam.pos[0], cam.pos[1] + h, cam.pos[2]], look: [cam.look[0], cam.look[1] + h, cam.look[2]] }; } }
    if (set === 'pal') palace(t, i, s, p);
    if (set === 'nile') fields(t, i, s, p);
    cam = K.breathe(cam, t, s.locked ? 0.0008 : 0.002, 51 + i);
    G.renderSet(ctx, st, t, u, { cam, exposure: st.set.exposure * (s.ex ?? 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.5);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});

// ------------------------------------------------------------------ extras in the palace and the fields
const GX = 22, GZ = -18;
const PLOTS = Array.from({ length: 7 }, (_, k) => ({ x0: -44 + k * 6.6, x1: -44 + k * 6.6 + 6, z0: 16, z1: 26 }));
const STORE = { x0: 30, x1: 36, z0: -17, z1: -11, h: 2.7, door: { z: -14, w: 1.3, h: 2.1 } };
async function extras() {
  // palace: a golden headcloth resting on the carved chair; a dawn sky beyond the open end of the hall
  const th = PAL.props.throne, gold = new THREE.MeshStandardMaterial({ color: 0xc89a3a, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide });
  const hc = W.cloth(0.62, 0.5, gold, { segW: 40, segH: 30, folds: 0.012, sag: (u, v) => -0.06 * Math.sin(u * Math.PI) - 0.1 * (v < 0.4 ? (0.4 - v) * 2.5 : 0) }); hc.rotation.x = -Math.PI / 2 + 0.08; hc.position.set(0.05, 0.69, 0.08); th.add(hc); W.shadows(hc);
  X.dawn = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: 0x0a0e1a, fog: false })); X.dawn.position.set(0, 10, 18); X.dawn.rotation.y = Math.PI; PAL.scene.add(X.dawn);
  const lampClay = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 0.85 });
  X.lamp = new THREE.Group(); const lb = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.004], [0.075, 0.025], [0.06, 0.04], [0.03, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 32), lampClay); lb.scale.set(1, 1, 1.35); X.lamp.add(lb);
  X.lampF = W.flame({ h: 0.09, w: 0.045, seed: 3, inten: 3.5, light: 1.6, dist: 6, planes: 2 }); X.lampF.position.set(0, 0.04, 0.1); X.lamp.add(X.lampF); PAL.scene.add(X.lamp);
  // fields: seven plots of young green wheat in a row, each sown on its own year
  X.plots = [];
  for (const [k, P_] of PLOTS.entries()) { const c = W.cropField({ rect: [P_.x0, P_.z0, P_.x1, P_.z1], count: 5200, seed: 300 + k, heightAt: NILE.props.terrain.heightAt, h: [0.55, 0.85], ripe: 0.08 + 0.05 * k, rows: 0.3 }); NILE.scene.add(c); X.plots.push(c); }
  // the drought plot: same place as plot 3, baked dry in the lean years (shown only in shot 17)
  const p3 = PLOTS[3]; X.dry = droughtPlot(6, 10, 4); X.dry.position.set((p3.x0 + p3.x1) / 2, NILE.props.terrain.heightAt((p3.x0 + p3.x1) / 2, 21) + 0.02, 21); X.dry.visible = false; NILE.scene.add(X.dry);
  // sheaves stacked at the edge of plot 1 (the harvest)
  X.sheaves = [];
  for (let k = 0; k < 6; k++) { const s = sheaf(k + 1); const x = PLOTS[1].x1 + 0.6 + (k % 3) * 0.24, z = 15.2 + Math.floor(k / 3) * 0.3; s.position.set(x, NILE.props.terrain.heightAt(x, z), z); s.rotation.set((k % 3 - 1) * 0.12, k, 0); NILE.scene.add(s); X.sheaves.push(s); }
  X.held = sheaf(9); NILE.scene.add(X.held);
  // the storeroom in the granary yard: mud-brick walls, roof, a plank door on the west side
  const mud = await W.pbr('rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }), hs = await W.pbr('hessian_230', { tile: 0.5, tint: 0xc8b8a0, res: 1024 });
  const S_ = STORE, gy = NILE.props.terrain.heightAt((S_.x0 + S_.x1) / 2, (S_.z0 + S_.z1) / 2) - 0.05, g = new THREE.Group(); g.position.y = gy; NILE.scene.add(g); X.store = g;
  const wall = (w, h, d, x, y, z) => { const b = W.rbox(w, h, d, mud, { r: 0.04, seg: 2 }); b.position.set(x, y, z); g.add(b); };
  const t_ = 0.35, dz = S_.door.z, dw = S_.door.w, dh = S_.door.h;
  wall(t_, S_.h, (S_.z1 - (dz + dw / 2)), S_.x0, 0, (S_.z1 + dz + dw / 2) / 2); wall(t_, S_.h, ((dz - dw / 2) - S_.z0), S_.x0, 0, (dz - dw / 2 + S_.z0) / 2); wall(t_, S_.h - dh, dw, S_.x0, dh, dz);
  wall(t_, S_.h, S_.z1 - S_.z0, S_.x1, 0, (S_.z0 + S_.z1) / 2); wall(S_.x1 - S_.x0, S_.h, t_, (S_.x0 + S_.x1) / 2, 0, S_.z0); wall(S_.x1 - S_.x0, S_.h, t_, (S_.x0 + S_.x1) / 2, 0, S_.z1);
  wall(S_.x1 - S_.x0 + 0.6, 0.22, S_.z1 - S_.z0 + 0.6, (S_.x0 + S_.x1) / 2, S_.h, (S_.z0 + S_.z1) / 2);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(S_.x1 - S_.x0, S_.z1 - S_.z0), mud); W.boxUV(fl.geometry); fl.rotation.x = -Math.PI / 2; fl.position.set((S_.x0 + S_.x1) / 2, 0.01, (S_.z0 + S_.z1) / 2); fl.receiveShadow = true; g.add(fl);
  const pl = await W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 });
  X.door = W.door(pl, W.ironMat(), { w: dw - 0.04, h: dh - 0.02, t: 0.07, frame: 0.0001, studs: true }); X.door.group.rotation.y = -Math.PI / 2; X.door.group.position.set(S_.x0 + 0.05, 0, dz); g.add(X.door.group);
  // sacks stacked to the ceiling along the back wall, and the grain heap that grows in the middle
  for (let k = 0; k < 40; k++) { const row = Math.floor(k / 10), col = k % 10, s = W.sack(hs, { w: 0.5, h: 0.62, seed: k + 11 });
    s.position.set(S_.x1 - 0.5 - (row % 2) * 0.05, row * 0.56, S_.z0 + 0.45 + col * 0.58 + (row % 2) * 0.2); s.rotation.y = k * 0.9; g.add(s); }
  X.grainM = await W.pbr('sand_01', { tile: 0.35, tint: 0xe8c070, res: 1024 });
  X.heap = W.lathe(Array.from({ length: 24 }, (_, i) => { const a = i / 23; return [Math.max(0.001, 1 - a) * 1.0, Math.sin(a * Math.PI / 2) ** 0.8 * 0.55]; }), X.grainM, { seg: 96 });
  X.heap.position.set(S_.x0 + 2.6, 0, dz + 0.3); X.heap.castShadow = X.heap.receiveShadow = true; g.add(X.heap);
  X.stream = K.dustMotes({ centre: [0, 0, 0], size: [0.05, 1.0, 0.05], count: 500, seed: 8, color: 0xe0c070, px: 0.012, op: 0.9, fall: 1.4 }); NILE.scene.add(X.stream);
  X.pourSack = W.sack(hs, { w: 0.45, h: 0.55, seed: 5, open: true }); NILE.scene.add(X.pourSack);
  X.inLight = new THREE.PointLight(0xffc880, 0, 7, 1.6); X.inLight.position.set(S_.x0 + 1.6, 2.3, dz - 1.2); g.add(X.inLight);
}

// ------------------------------------------------------------------ shots
const C = {
  dream_low: { pos: [5.0, 0.55, 1.8], look: [6.5, 0.1, -8.0], fov: 50 },
  dream_low2: { pos: [6.0, 0.6, 1.9], look: [8.0, 0.1, -8.0], fov: 50 },
  spikeB_a: { pos: [24.25, 0.95, 5.95], look: [24.25, 0.92, 5.0], fov: 26 },
  spikeB_b: { pos: [24.6, 0.95, 5.95], look: [24.6, 0.92, 5.0], fov: 26 },
  hall_a: { pos: [0.4, 1.6, -9.5], look: [0, 1.6, -28], fov: 44 },
  hall_b: { pos: [0.2, 1.6, -12.5], look: [0, 1.6, -28], fov: 42 },
  chair_a: { pos: [1.7, 2.3, -29.2], look: [0, 1.6, -33.6], fov: 30 },
  chair_b: { pos: [1.5, 2.25, -29.8], look: [0, 1.6, -33.6], fov: 29 },
  door_back: { pos: [0.55, 1.6, 0.4], look: [0, 1.35, 12], fov: 46 },
  clean: { pos: [-3, 0.55, -6.0], look: [6, 0.05, -40], fov: 40 },
  fat_row: { pos: [-3.5, 1.35, 2.2], look: [10, 0.75, -3.6], fov: 46 },
  spikeA: { pos: [14.22, 0.96, 5.95], look: [14.22, 0.93, 5.0], fov: 26 },
  plots_a: { pos: [-21, 2.0, 32], look: [-21, 0.4, 19], fov: 52 },
  plots_b: { pos: [-21, 14, 38], look: [-21, 0, 18], fov: 54 },
  bundle_a: { pos: [-27.6, 0.95, 14.5], look: [-28.9, 0.55, 15.05], fov: 40 },
  bundle_b: { pos: [-27.85, 0.9, 14.65], look: [-28.9, 0.55, 15.05], fov: 36 },
  fill_a: { pos: [31.0, 1.45, -11.9], look: [32.7, 0.85, -13.5], fov: 52 },
  fill_b: { pos: [30.9, 1.5, -11.75], look: [32.7, 0.85, -13.5], fov: 56 },
  green: { pos: [-10, 0.7, 11.5], look: [-6, 0.6, 3], fov: 40 },
  full: { pos: [32.0, 1.4, -14.2], look: [36, 1.2, -14.0], fov: 54 },
  drought: { pos: [-23.2, 1.6, 29.5], look: [-23.0, 0.2, 21], fov: 48 },
  door_in: { pos: [34.6, 1.4, -14.4], look: [30, 1.1, -14.0], fov: 44 },
};
const SHOTS = [
  { t0: 0.00, t1: 1.33, set: 'dream', a: C.dream_low, b: C.dream_low2, ex: 1.0 },
  { t0: 1.33, t1: 2.63, set: 'dream', a: C.dream_low2, b: { ...C.dream_low2, pos: [6.8, 0.62, 2.0] }, ex: 1.0 },
  { t0: 2.63, t1: 5.00, set: 'dream', a: C.spikeB_a, b: C.spikeB_b, spike: 1, ex: 0.8 },
  { t0: 5.00, t1: 6.40, set: 'pal', a: C.hall_a, b: C.hall_b, ex: 0.42 },
  { t0: 6.40, t1: 8.35, set: 'pal', a: C.chair_a, b: C.chair_b, ex: 0.45 },
  { t0: 8.35, t1: 11.32, set: 'pal', a: C.door_back, locked: true, ex: 0.6 },
  { t0: 11.32, t1: 13.07, set: 'dream', a: C.clean, locked: true },
  { t0: 13.07, t1: 14.22, set: 'dream', a: C.fat_row, locked: true, ex: 0.8 },
  { t0: 14.22, t1: 16.66, set: 'dream', a: C.fat_row, locked: true, ex: 0.8 },
  { t0: 16.66, t1: 18.65, set: 'dream', a: C.spikeA, locked: true, spike: 1, ex: 0.8 },
  { t0: 18.65, t1: 20.73, set: 'dream', a: C.spikeB_b, locked: true, spike: 1, ex: 0.8 },
  { t0: 20.73, t1: 23.27, set: 'nile', a: C.plots_a, b: C.plots_b, ease: E.inOutCubic },
  { t0: 23.27, t1: 25.60, set: 'nile', a: C.bundle_a, b: C.bundle_b },
  { t0: 25.60, t1: 28.52, set: 'nile', a: C.fill_a, b: C.fill_b, ex: 1.3 },
  { t0: 28.52, t1: 30.00, set: 'nile', a: C.green, locked: true },
  { t0: 30.00, t1: 31.52, set: 'nile', a: C.full, locked: true },
  { t0: 31.52, t1: 34.16, set: 'nile', a: C.drought, locked: true },
  { t0: 34.16, t1: 37.97, set: 'nile', a: C.door_in, locked: true },
];

// ------------------------------------------------------------------ the dream
function placeCow(c, x, z, ry, ph, amp) { const h = DREAM.props.height(x, z); c.position.set(x, h + c.userData.lift, z); c.rotation.y = ry; c.userData.walk(ph, amp); }
function dream(t, i) {
  const { fat, lean, rowA, rowB } = DREAM.props;
  // shots 1-2: the fat cows climb out of the river and walk up the bank; the lean ones follow behind them
  // shots 8-9: the fat row stands on the bank; the lean move in behind and the fat walk on into the haze
  const climbing = t < 3;
  for (let k = 0; k < 7; k++) {
    if (climbing) {
      const w = t + 0.4 * k, x = -2 + k * 2.4 + 0.6 * w, z = -11.5 + Math.min(7, 1.1 * w + 3.0);
      placeCow(fat[k], x, z, 0.7 - 0.45 * clamp((z + 6) / 3), w * 0.62 + k * 0.17, 1);
      const wl = t - 0.9 + 0.4 * k, xl = -3.2 + k * 2.4 + 0.6 * wl, zl = -12.5 + Math.min(5.5, 1.0 * Math.max(0, wl) + 1.2);
      placeCow(lean[k], xl, zl, 0.7, wl * 0.62 + k * 0.23, 1);
    } else {
      // the fat row stands side-on on the bank; in shot 9 the lean walk in from the right in front of them
      placeCow(fat[k], 2 + k * 2.4, -2.6, 0, 0, 0);
      const inn = i === 8 ? prog(t, 14.22, 16.4) : 0, wx = 2.6 + k * 2.4 + 14 * (1 - E.outCubic(inn));
      placeCow(lean[k], wx, 0.6, Math.PI, t * 0.6 + k * 0.2, 1 - 0.85 * E.inCubic(inn));
      lean[k].visible = i === 8;
    }
    fat[k].visible = i <= 1 || i === 7 || i === 8;
    if (climbing) lean[k].visible = i === 1 || (i === 0 && t > 0.9);
  }
  // spikes sway together in one breeze
  const n = W.noise2(3);
  for (const [j, s] of [...rowA, ...rowB].entries()) { const wv = 0.05 * Math.sin(t * 1.4 - s.position.x * 3) + 0.02 * n(t * 0.6, j); s.rotation.z = wv * (s.userData.dry ? 0.6 : 1); s.rotation.x = 0.4 * wv; }
  // the haze thickens in the dream
  DREAM.scene.fog.density = 0.007 + (i === 8 ? 0.02 * prog(t, 14.6, 16.6) : 0);
}

// ------------------------------------------------------------------ the palace
function palace(t, i) {
  for (const a of P.adv) a.object3d.visible = i === 3;
  P.freed.object3d.visible = i === 5; X.lamp.visible = i === 5;
  if (i === 3) {
    const spots = [[-1.6, -17, 2.7], [1.3, -18.2, -2.9], [0.1, -20.5, 3.1]];
    P.adv.forEach((a, k) => {
      a.object3d.position.set(spots[k][0], 0, spots[k][1]); a.object3d.rotation.y = spots[k][2];
      a.setPose('stand', t + k * 3);
      a.object3d.updateMatrixWorld(true);
      // hands raised in confusion, a slow helpless lift
      const lift = 0.5 + 0.5 * Math.sin(t * 1.6 + k * 2);
      for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
        const tgt = a.object3d.localToWorld(V(sx * (0.34 + 0.05 * lift), 1.1 + 0.18 * lift, 0.22));
        K.reach(a, side, tgt, a.object3d.localToWorld(V(sx * 0.8, 0.6, -0.3))); K.flatHand(a, side, 0.4);
      }
    });
  }
  if (i === 5) {
    // the freed man stands at the open end of the hall with a lamp; beyond, the sky turns from dark to dawn grey
    const f = P.freed; f.object3d.position.set(0.1, 0, 3.0); f.object3d.rotation.y = 0; f.setPose('stand', t);
    f.object3d.updateMatrixWorld(true);
    const tgt = f.object3d.localToWorld(V(-0.18, 0.98, 0.28));
    K.reach(f, 'Right', tgt, f.object3d.localToWorld(V(-0.6, 0.6, -0.3)));
    X.lamp.position.copy(f.bones('RightHand').getWorldPosition(V()).add(V(0, 0.03, 0.05)));
    X.lampF.userData.update(t, 1);
  }
  const dawn = prog(t, 8.6, 11.2);
  X.dawn.material.color.setRGB(0.04 + 0.32 * dawn, 0.055 + 0.33 * dawn, 0.1 + 0.34 * dawn);
}

// ------------------------------------------------------------------ the fields, the storeroom
function fields(t, i) {
  for (const k of ['farmer', 'lab', 'f2', 'f3']) P[k].object3d.visible = false;
  const H = NILE.props.terrain.heightAt;
  for (const c of X.plots) c.userData.update(t);
  // drought: plot 3's green is gone and the cracked plate shows (later years) only in shot 17
  X.dry.visible = i === 16; X.plots[3].visible = i !== 16;
  X.held.visible = i === 12; X.stream.visible = X.pourSack.visible = i === 13;
  if (i === 11) {     // farmers working two of the plots
    for (const [k, x, z] of [['f2', -36.5, 20], ['f3', -10.5, 23]]) { const f = P[k]; f.object3d.visible = true; f.object3d.position.set(x, H(x, z), z); f.object3d.rotation.y = 0.3; f.setPose('dig', t, { rate: 0.5 }); }
  }
  if (i === 12) {     // a farmer kneels and binds a sheaf, then stands it with the others
    const f = P.farmer, x = -29.0, z = 14.5; f.object3d.visible = true; f.object3d.position.set(x, H(x, z), z); f.object3d.rotation.y = 0.25; f.setPose('kneel', t);
    f.object3d.updateMatrixWorld(true);
    const sh = f.object3d.localToWorld(V(0, 0, 0.55)); X.held.position.copy(sh); X.held.rotation.set(0.05, 0, 0.0);
    const tie = sh.clone().add(V(0, X.held.userData.tieY, 0)), wob = 0.03 * Math.sin(t * 5);
    K.reach(f, 'Left', tie.clone().add(V(0.06, wob, -0.02)), f.object3d.localToWorld(V(0.6, 0.6, -0.2)));
    K.reach(f, 'Right', tie.clone().add(V(-0.06, -wob, -0.02)), f.object3d.localToWorld(V(-0.6, 0.6, -0.2)));
  }
  // storeroom: the heap grows while grain is poured (shot 14); full afterwards
  const fill = 0.4 + 0.3 * E.inOutSine(prog(t, 25.6, 28.5));
  X.heap.scale.set(fill, fill, fill);
  X.inLight.intensity = i >= 13 ? 1.6 : 0;
  if (i === 13) {
    const l = P.lab, S_ = STORE, x = S_.x0 + 2.6 + 0.62, z = S_.door.z + 0.95; l.object3d.visible = true;
    l.object3d.position.set(x, X.store.position.y, z); l.object3d.rotation.y = Math.PI + 0.55; l.setPose('stand', t);
    l.object3d.updateMatrixWorld(true);
    const mouth = l.object3d.localToWorld(V(0, 1.25, 0.5));
    X.pourSack.position.copy(mouth.clone().add(V(0, 0.15, 0))); X.pourSack.rotation.set(2.3, 0.55, 0);
    K.reach(l, 'Left', mouth.clone().add(l.object3d.localToWorld(V(0.18, 0.15, 0)).sub(l.object3d.position)).sub(V(0, 0, 0)), l.object3d.localToWorld(V(0.7, 0.8, -0.2)));
    K.reach(l, 'Right', mouth.clone().add(l.object3d.localToWorld(V(-0.18, 0.3, -0.05)).sub(l.object3d.position)), l.object3d.localToWorld(V(-0.7, 0.8, -0.2)));
    const top = X.heap.position.clone().add(X.store.position).add(V(0, 0.55 * fill, 0));
    X.stream.position.set(mouth.x, (mouth.y + top.y) / 2, mouth.z); X.stream.scale.set(1, Math.max(0.1, mouth.y - top.y), 1); X.stream.userData.update(t, 1);
  }
  if (i === 17) {     // the labourer pushes the store door shut from inside; daylight narrows to a gold sliver
    const close = E.inOutSine(prog(t, 34.4, 36.6)), l = P.lab, S_ = STORE;
    X.door.leaf.rotation.y = -1.3 * (1 - close) - 0.012;
    l.object3d.visible = true; l.object3d.position.set(S_.x0 + 0.75 + 0.25 * (1 - close), X.store.position.y, S_.door.z + 0.75); l.object3d.rotation.y = -Math.PI / 2 - 0.4; l.setPose('stand', t);
    l.object3d.updateMatrixWorld(true);
    X.door.leaf.updateMatrixWorld(true);
    const edge = X.door.leaf.localToWorld(V(S_.door.w * 0.7, 1.1, 0.06));
    K.reach(l, 'Right', edge, l.object3d.localToWorld(V(-0.6, 0.8, -0.3)));
    X.inLight.intensity = 1.6 * (1 - close);
  } else X.door.leaf.rotation.y = -1.3;
  // the store interior shots are darker; exposure per shot via table
}
