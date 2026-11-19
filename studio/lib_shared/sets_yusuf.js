// sets_yusuf.js: the locations of "15 Lessons from Surah Yusuf", built with world.js. See WORLD.md.
//
// Each builder is async and returns
//   { name, scene, group, cameras: { hero, ... }, props: { ... }, atmo, exposure, bloom, update(t, cam, o) }
// group holds everything built (with an empty 'people_slots' group of named anchors for people.js);
// cameras are named anchor poses { pos, look, fov }; props are named objects a film can animate.
// Wrap with W.stage(set) to render through lib/gl.js. Call W.init(G.R) once before building.
// opts.time picks the light: 'night' | 'predawn' | 'dawn' | 'day' | 'golden' | 'dusk' (where the set allows).
import * as W from './world.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const { THREE } = W;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dirFrom = (elev, azim) => { const e = elev * Math.PI / 180, a = azim * Math.PI / 180; return V3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); };
const { lerp, sstep, clamp } = W;

// ------------------------------------------------------------------ shared materials (cached)
const MC = new Map();
function mat(key, name, o = {}) { if (!MC.has(key)) MC.set(key, W.pbr(name, o)); return MC.get(key); }
const MATS = {
  plaster: () => mat('plaster', 'clay_plaster', { tile: 2.2, tint: 0xf0dcc0, res: 1024 }),
  whitewash: () => mat('whitewash', 'rough_plaster_03', { tile: 2.0, tint: 0xf4ece0, res: 1024, normal: 0.7 }),
  mudPlaster: () => mat('mudPlaster', 'rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }),
  stone: () => mat('stone', 'old_stone_wall', { tile: 2.4, tint: 0xe6dccb, res: 2048, normal: 1.3 }),
  stoneDisp: () => mat('stoneDisp', 'old_stone_wall', { tile: 2.4, tint: 0xe6dccb, res: 2048, normal: 1.3, disp: 0.07 }),
  rustic: () => mat('rustic', 'rustic_stone_wall', { tile: 2.2, tint: 0xeee2cc, res: 2048, normal: 1.3 }),
  rusticDisp: () => mat('rusticDisp', 'rustic_stone_wall', { tile: 2.0, tint: 0xeee2cc, res: 2048, normal: 1.2, disp: 0.09 }),
  planks: () => mat('planks', 'old_planks_02', { tile: 1.6, tint: 0xcaa880, res: 1024 }),
  darkPlanks: () => mat('darkPlanks', 'old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 }),
  hessian: () => mat('hessian', 'hessian_230', { tile: 0.5, tint: 0xd8c09a, res: 1024 }),
  linen: () => mat('linen', 'hessian_230', { tile: 0.35, tint: 0xf2ebdd, res: 1024, side: THREE.DoubleSide, normal: 0.5 }),
  tentCloth: () => mat('tentCloth', 'hessian_230', { tile: 0.6, tint: 0x3a2e26, res: 1024, side: THREE.DoubleSide, normal: 1.4 }),
  reed: () => mat('reed', 'reed_roof_03', { tile: 1.6, res: 1024, side: THREE.DoubleSide }),
  floorStone: () => mat('floorStone', 'clay_plaster', { tile: 1.8, tint: 0xe9dcc6, res: 1024, rough: 0.55, normal: 0.6, vertexColors: true }),
  mudFloor: () => mat('mudFloor', 'brown_mud_dry', { tile: 2.0, res: 1024 }),
};

// ------------------------------------------------------------------ light presets
const TIMES = {
  night:   { hdri: 'rogland_moonlit_night', sun: { elev: 38, azim: 210 }, sunI: 0.55, sunColor: 0xa8bcff, envI: 1.6, starsOn: 1, exposure: 1.9, fog: 0.004,
             sky: { zenith: 0x02040c, sunColor: 0x000000, glow: 0, hazeH: 0.35 }, fogColor: 0x0b1222, moon: { dir: dirFrom(38, 210), phase: 0.7 }, hemi: 0.15 },
  predawn: { hdri: 'rogland_moonlit_night', sun: { elev: 30, azim: 210 }, sunI: 0.4, sunColor: 0xb0c4ff, envI: 1.8, starsOn: 0.8, exposure: 1.9, fog: 0.004,
             sky: { zenith: 0x040a1e, sunColor: 0x000000, glow: 0, hazeH: 0.45 }, fogColor: 0x1c2640, moon: { dir: dirFrom(30, 210), phase: 0.4 }, hemi: 0.2 },
  dawn:    { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: -25 }, sunI: 2.4, envI: 1.0, exposure: 1.0, fog: 0.0022 },
  day:     { hdri: 'goegap', background: 'hdri', sun: { azim: 40 }, sunI: 3.6, envI: 1.0, exposure: 0.85, fog: 0.0016 },
  golden:  { hdri: 'plains_sunset', background: 'hdri', bgI: 0.75, sun: { azim: -30 }, sunI: 3.2, envI: 0.9, exposure: 0.72, fog: 0.0011, fogGain: 0.55 },
  dusk:    { hdri: 'rogland_sunset', background: 'hdri', sun: { azim: -35 }, sunI: 2.0, envI: 1.1, exposure: 1.0, fog: 0.0018, fogGain: 0.8 },
};
async function base(name, time, extra = {}) {
  const scene = new THREE.Scene(), group = new THREE.Group(); group.name = name; scene.add(group);
  const T = { ...TIMES[time], ...extra }, atmo = await W.atmosphere(scene, T);
  return { scene, group, atmo, exposure: T.exposure ?? 1, flames: [], updaters: [] };
}
function finish(S, name, cameras, props, slots, more = {}) {
  S.group.add(W.peopleSlots(slots));
  const ups = S.updaters;
  return { name, scene: S.scene, group: S.group, cameras, props, atmo: S.atmo, exposure: S.exposure, bloom: more.bloom ?? 0.18, bloomThreshold: more.bloomThreshold ?? 0.9,
    update(t, cam, o = {}) { for (const f of ups) f(t, o); } };
}
const add = (S, o, ...pos) => { if (pos.length) o.position.set(...pos); S.group.add(o); return o; };

// ------------------------------------------------------------------ reusable structures
// stone-rimmed hand-dug well; returns { group, rimTop, depth, waterY, rope, bucket }
async function buildWell(S, { depth = 9, r = 0.78, wall = 0.34, h = 0.82, beam = true } = {}) {
  const g = new THREE.Group(); g.name = 'well';
  const [rim, shaft] = await Promise.all([MATS.rusticDisp(), MATS.stoneDisp()]);
  const ro = r + wall, prof = [];
  // outer face, rounded capstone top, inner face (dense, for displacement)
  for (let i = 0; i <= 16; i++) prof.push([ro + 0.04 * Math.sin(i * 1.3), -0.15 + (h + 0.15) * i / 16]);
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI; prof.push([r + wall / 2 + Math.cos(a) * wall / 2, h + Math.sin(a) * 0.09]); }
  for (let i = 1; i <= 12; i++) prof.push([r, h - (h + 0.4) * i / 12]);
  const ring = W.lathe(prof, rim, { seg: 180 }); g.add(ring);
  // the shaft, seen from inside: dense open cylinder, faces inward
  const sp = []; const n = Math.ceil(depth * 10); for (let i = 0; i <= n; i++) sp.push([r + 0.02 * Math.sin(i * 0.7), -0.35 - depth * i / n]);
  const sh = W.lathe(sp, shaft, { seg: 160 }); sh.material = shaft.clone(); sh.material.side = THREE.DoubleSide; sh.name = 'shaft'; g.add(sh);
  // water at the bottom (still, dark) and a wet stone floor ring
  const waterY = -depth + 0.25;
  const wat = W.water(new THREE.CircleGeometry(r + 0.02, 64).rotateX(-Math.PI / 2), { color: 0x0c1a1c, rough: 0.03, tile: 1.2, flow: [0.004, 0.002] });
  wat.position.y = waterY; g.add(wat); S.updaters.push((t) => wat.userData.update(t));
  const out = { group: g, rimTop: h + 0.09, depth, waterY, water: wat };
  if (beam) {
    const pl = await MATS.planks();
    for (const s of [-1, 1]) { const p = W.rbox(0.16, 2.0, 0.16, pl, { r: 0.03 }); p.position.set(s * (ro + 0.15), -0.1, 0); p.rotation.z = -s * 0.04; g.add(p); }
    const bar = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.075, 0.075, ro * 2 + 0.7, 32, 1).rotateZ(Math.PI / 2)), pl); bar.position.y = 1.86; g.add(W.shadows(bar));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 12, 48), W.ropeMat()); coil.rotation.y = Math.PI / 2; coil.position.set(0.25, 1.86, 0); g.add(W.shadows(coil));
    out.rope = W.rope([V3(0, 1.86, 0.08), V3(0.0, 1.0, 0.1), V3(0.02, -1.5, 0.12), V3(0.0, -4.0, 0.1)], 0.014); g.add(out.rope);
    out.bucket = await W.prop('wooden_bucket_01', { pos: [ro - 0.05, h + 0.07, 0.55], height: 0.36, ry: 0.6 }); g.add(out.bucket);
  }
  return out;
}
// flat-roofed stone-and-mud house; origin at the front-door threshold centre, facing +z
async function buildHouse(S, { w = 7.2, d = 5.6, h = 3.1, seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'house';
  const [stone, mud, pl, dpl, iron] = await Promise.all([MATS.rustic(), MATS.mudPlaster(), MATS.planks(), MATS.darkPlanks(), Promise.resolve(W.ironMat())]);
  const t = 0.45, plinth = 0.85, dw = 1.05, dh = 1.95;
  const wall = (x, z, ww, dd, hh, y0, m) => { const b = W.rbox(ww, hh, dd, m, { r: 0.06, seg: 3 }); b.position.set(x, y0, z); g.add(b); return b; };
  // back + sides (stone plinth, mud plaster above)
  for (const [x, z, ww, dd] of [[0, -d, w, t], [-w / 2 + t / 2, -d / 2, t, d], [w / 2 - t / 2, -d / 2, t, d]]) { wall(x, z, ww + 0.06, dd + 0.06, plinth, 0, stone); wall(x, z, ww, dd, h - plinth, plinth, mud); }
  // front with a door opening and a small window
  const fx = [(-w / 2 + -dw / 2) / 2, (w / 2 + dw / 2) / 2], fw = (w - dw) / 2;
  for (const x of fx) { wall(x, 0, fw + 0.06, t + 0.06, plinth, 0, stone); wall(x, 0, fw, t, h - plinth, plinth, mud); }
  wall(0, 0, dw + 0.1, t, h - dh - 0.18, dh + 0.18, mud);
  const lintel = W.rbox(dw + 0.6, 0.18, t + 0.12, dpl, { r: 0.03 }); lintel.position.set(0, dh, 0); g.add(lintel);
  const D = W.door(pl, iron, { w: dw - 0.02, h: dh - 0.02, t: 0.07, frame: 0.001, studs: false }); D.group.position.set(0, 0, -0.05); D.leaf.rotation.y = -0.35; g.add(D.group);
  const sill = W.rbox(dw + 0.2, 0.12, t + 0.25, stone, { r: 0.03 }); sill.position.set(0, -0.06, 0.05); g.add(sill);
  // window (dark recess with a wooden shutter frame) on the front-left
  const win = W.rbox(0.6, 0.5, 0.05, new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }), { r: 0.01 }); win.position.set(-2.1, 1.75, t / 2 + 0.005); g.add(win);
  const wf = W.rbox(0.74, 0.08, 0.12, dpl, { r: 0.02 }); wf.position.set(-2.1, 1.7, t / 2 + 0.03); g.add(wf);
  // roof: slab + parapet + protruding beam ends
  const slab = W.rbox(w + 0.3, 0.26, d + t + 0.3, mud, { r: 0.08, seg: 4 }); slab.position.set(0, h, -d / 2); g.add(slab);
  for (const [x, z, ww, dd] of [[0, -d - t / 2 + 0.05, w + 0.3, 0.22], [-w / 2 - 0.04, -d / 2, 0.22, d + t + 0.3], [w / 2 + 0.04, -d / 2, 0.22, d + t + 0.3], [-w / 4 - 0.6, t / 2 + 0.05, w / 2 - 0.6, 0.22], [w / 4 + 0.6, t / 2 + 0.05, w / 2 - 0.6, 0.22]]) wall(x, z, ww, dd, 0.42, h + 0.26, mud);
  const r = W.rng(seed);
  for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.5 + i * (w - 1) / 8, b = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.085, 0.09, 0.5, 24).rotateX(Math.PI / 2)), dpl);
    b.position.set(x + (r() - 0.5) * 0.05, h + 0.05 + (r() - 0.5) * 0.04, t / 2 + 0.2); g.add(W.shadows(b)); const b2 = b.clone(); b2.position.z = -d - t / 2 - 0.2; g.add(b2); }
  // stone steps up the right side to the roof
  const ns = 11;
  for (let i = 0; i < ns; i++) { const st = W.rbox(0.95, 0.3 + (h + 0.2) * i / ns, 0.36, stone, { r: 0.05, seg: 3 }); st.position.set(w / 2 + 0.5, 0, -d + 0.55 + i * 0.36); g.add(st); }
  W.shadows(g);
  return { group: g, door: D, roofY: h + 0.13, w, d };
}
// circular dry-stone wall (sheep pen / yard), opening of `gap` radians centred on +z
async function stoneRing(radius = 4.5, { h = 1.15, thick = 0.6, gap = 0.6 } = {}) {
  const m = await MATS.rusticDisp(), prof = [];
  for (let i = 0; i <= 14; i++) prof.push([radius + thick / 2 + 0.03 * Math.sin(i * 2.1), (h * i) / 14]);
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI; prof.push([radius + Math.cos(a) * thick / 2, h + Math.sin(a) * 0.14]); }
  for (let i = 1; i <= 14; i++) prof.push([radius - thick / 2 + 0.03 * Math.sin(i * 1.7), h - (h * i) / 14]);
  const ring = W.lathe(prof, m, { seg: 220, phi: Math.PI * 2 - gap }); ring.rotation.y = Math.PI / 2 + gap / 2;
  return ring;
}
// black goat-hair tent: sagging roof cloth on two rows of poles, back wall, guy ropes
async function buildTent({ w = 6, d = 4, h = 2.0 } = {}) {
  const g = new THREE.Group(); g.name = 'tent';
  const [cl, pl] = await Promise.all([MATS.tentCloth(), MATS.darkPlanks()]);
  const roof = W.cloth(w, d, cl, { segW: 96, segH: 64, folds: 0.012, sag: (u, v) => -(0.28 * Math.abs(Math.sin(u * Math.PI * 3)) + 0.4 * Math.pow(Math.abs(v - 0.5) * 2, 2)) });
  roof.rotation.x = -Math.PI / 2; roof.position.y = h; g.add(roof);
  const back = W.cloth(w, h, cl, { segW: 64, segH: 32, folds: 0.03, sag: (u, v) => 0.08 * Math.sin(u * 20) * (1 - v) }); back.position.set(0, h / 2 - 0.15, -d / 2 + 0.1); back.rotation.x = 0.12; g.add(back);
  for (const x of [-w / 3, 0, w / 3]) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) { const p = W.rbox(0.07, h + 0.05, 0.07, pl, { r: 0.02 }); p.position.set(x, 0, z); g.add(p);
    g.add(W.rope([V3(x, h - 0.05, z), V3(x * 1.1, h * 0.5, z + Math.sign(z) * 1.2), V3(x * 1.15, 0.02, z + Math.sign(z) * 2.0)], 0.009)); }
  return W.shadows(g);
}
// instanced floor of bevelled stone slabs with unique uvs and per-slab tone (merged, one draw call)
async function slabFloor({ w = 20, d = 30, size = 1.4, seed = 4, rough = 0.5, tint = 0xe9dcc6, jitter = 0.006, origin = [0, 0, 0] } = {}) {
  const m = (await MATS.floorStone()).clone(); m.roughness = rough; m.color.set(tint);
  const r = W.rng(seed), geos = [], nx = Math.round(w / size), nz = Math.round(d / size);
  const proto = new THREE.Mesh(new RoundedBoxGeometry(size - 0.025, 0.14, size - 0.025, 2, 0.02));
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const g = proto.geometry.clone(), x = origin[0] - w / 2 + (i + 0.5) * size, z = origin[2] - d / 2 + (j + 0.5) * size;
    g.translate(x, origin[1] - 0.07 + (r() - 0.5) * jitter, z); W.boxUV(g, { offset: [r() * 40, 0, r() * 40] });
    const k = 0.86 + r() * 0.2, c = new Float32Array(g.attributes.position.count * 3).fill(k); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geos.push(g);
  }
  const mesh = new THREE.Mesh(W.BGU.mergeGeometries(geos), m); mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'slab_floor';
  return mesh;
}
// a pack bundle: hessian-wrapped load, cloth sagging between rope lashings (two girths + one lengthwise), knot tails
async function bundle({ w = 0.9, h = 0.5, d = 0.55, seed = 1 } = {}) {
  const hs = await MATS.hessian(), g = new THREE.Group(), b = W.rbox(w, h, d, hs, { r: Math.min(h, d) * 0.32, seg: 10 }), n = W.noise2(seed * 7 + Math.round(w * 100));
  const bands = [-w * 0.27, w * 0.27], p = b.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) - h / 2, z = p.getZ(i);
    // pinch toward the core at each rope, bulge between; cloth wrinkles; sag of the top
    const pinch = bands.reduce((a, bx) => a + Math.exp(-((x - bx) ** 2) / 0.0012), 0) + Math.exp(-(z * z) / 0.0012) * (y > 0 ? 1 : 0) * 0.6;
    const k = 1 - 0.07 * pinch + 0.025 * n(x * 9, y * 9 + z * 5) + 0.012 * n(x * 31, z * 31);
    const sag = y > h * 0.3 ? -0.035 * Math.cos(Math.min(1, Math.abs(x) / (w / 2)) * Math.PI / 2) * (1 - 0.6 * pinch) : 0;
    p.setXYZ(i, x * (1 + 0.02 * n(y * 5, z * 5)), (y * k + sag) + h / 2, z * k);
  }
  b.geometry.computeVertexNormals(); g.add(b);
  const ring = (fn, segs = 64) => { const pts = []; for (let i = 0; i <= segs; i++) pts.push(fn(i / segs * Math.PI * 2)); return W.rope(pts, 0.011, { segs: 160 }); };
  for (const bx of bands) g.add(ring((a) => V3(bx, h / 2 + Math.sin(a) * (h * 0.47 + 0.008), Math.cos(a) * (d * 0.47 + 0.008))));
  g.add(ring((a) => V3(Math.cos(a) * (w * 0.49 + 0.008), h / 2 + Math.sin(a) * (h * 0.47 + 0.008), 0)));
  const kx = bands[1], tail = W.rope([V3(kx, h + 0.005, 0.02), V3(kx + 0.05, h + 0.02, 0.06), V3(kx + 0.04, h * 0.7, d / 2 + 0.03), V3(kx + 0.07, h * 0.35, d / 2 + 0.05)], 0.01);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), W.ropeMat()); knot.position.set(kx, h + 0.01, 0.02);
  g.add(tail, W.shadows(knot));
  return g;
}
// striped saddle blanket roll
function blanketRoll(len = 1.1, r = 0.16, cols = ['#7a2a1a', '#d8b878', '#2a3a5a', '#d8b878']) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(i * 16, 0, 16, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 48, 4).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.geometry.translate(0, r, 0); return W.shadows(m);
}
// beehive grain silo (Egyptian granary)
async function silo({ r = 2.0, h = 4.2, dome = 2.4 } = {}) {
  const m = await MATS.mudPlaster(), prof = [];
  for (let i = 0; i <= 10; i++) prof.push([r * (1.04 - 0.04 * i / 10), (h * i) / 10]);
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([Math.max(0.001, r * 0.96 * Math.cos(a)), h + dome * Math.sin(a)]); }
  const g = new THREE.Group(), body = W.lathe(prof, m, { seg: 128 }); g.add(body);
  const hatch = W.rbox(0.6, 0.6, 0.12, await MATS.darkPlanks(), { r: 0.02 }); hatch.position.set(0, h + dome * 0.55, r * 0.72); hatch.rotation.x = -0.6; g.add(hatch);
  const low = W.rbox(0.7, 0.9, 0.12, await MATS.darkPlanks(), { r: 0.02 }); low.position.set(0, 0.3, r * 1.03); g.add(low);
  return W.shadows(g);
}
// clay saucer oil lamp with a flame
function oilLamp(S, { seed = 1, light = 2.2 } = {}) {
  const g = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.004], [0.075, 0.025], [0.06, 0.04], [0.03, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay);
  body.scale.set(1, 1, 1.35); g.add(W.shadows(body));
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.035, 0.09); g.add(W.shadows(sp));
  const f = W.flame({ h: 0.09, w: 0.04, seed, inten: 3.5, light, dist: 9, planes: 2 }); f.position.set(0, 0.045, 0.115); g.add(f);
  S.updaters.push((t) => f.userData.update(t));
  g.userData.flame = f; return g;
}
async function brazier(S, { seed = 1, light = 6 } = {}) {
  const g = new THREE.Group(), br = W.brassMat(); br.color.set(0x8a5a2a); br.roughness = 0.45;
  const bowl = W.lathe([[0.001, 0.0], [0.3, 0.02], [0.45, 0.16], [0.5, 0.24], [0.47, 0.25], [0.42, 0.18], [0.001, 0.1]], br, { seg: 64 }); bowl.position.y = 1.0; g.add(bowl);
  for (let i = 0; i < 3; i++) { const a = i * 2.094, l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 12), br); l.position.set(Math.cos(a) * 0.22, 0.52, Math.sin(a) * 0.22); l.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); g.add(W.shadows(l)); }
  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 12, 0, Math.PI * 2, 0, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 1 }));
  coals.position.y = 0.92; g.add(coals);
  const f = W.flame({ h: 0.8, w: 0.55, seed, inten: 5, light, dist: 16 }); f.position.y = 1.12; g.add(f);
  S.updaters.push((t) => f.userData.update(t));
  return g;
}

// ================================================================== the sets

// CANAAN HILLS: terraced limestone slopes, olive trees on the terraces, the family house, sheep pen,
// tents, the well off to one side. Lessons 0, 1, 2, 4, 13, 16. time: night|predawn|dawn|day|golden|dusk
export async function canaan_hills({ time = 'dusk', seed = 12, olives = 14, tents = true } = {}) {
  const S = await base('canaan_hills', time, { shadowBox: 34, focus: [0, 0, -4] });
  const n = W.noise2(seed), n2 = W.noise2(seed + 1), HOUSE = [0, -2], PAD = 11;
  const raw = (x, z) => 9 * W.fbm(n, x / 85, z / 85, 5) + 0.06 * Math.max(0, -z - 10) * (1 + 0.5 * n2(x / 40, z / 40)) + 22 * sstep(150, 320, Math.hypot(x, z)) * (0.6 + 0.4 * W.ridged(n2, x / 120, z / 120, 4));
  const h0 = raw(...HOUSE);
  const step = 1.25;
  const height = (x, z) => {
    let h = raw(x, z);
    const tq = h / step, q = Math.floor(tq), fr = tq - q, terr = (q + sstep(0.72, 1, fr)) * step;
    const tm = sstep(14, 26, Math.hypot(x - HOUSE[0], z - HOUSE[1])) * (1 - sstep(110, 160, Math.hypot(x, z)));
    h = lerp(h, terr, tm * 0.92);
    const pad = 1 - sstep(PAD - 4, PAD + 6, Math.hypot(x - HOUSE[0], (z - HOUSE[1]) * 1.2));
    h = lerp(h, h0 + 0.15 * n(x * 0.4, z * 0.4), pad);
    return h + 0.05 * n2(x * 1.3, z * 1.3);
  };
  const terrMat = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3.2 }, { name: 'rustic_stone_wall', tile: 2.2, tint: 0xf4ead8 }, { name: 'brown_mud_dry', tile: 2.6 }], { macro: 0.22 });
  const T = W.terrain({ size: 900, seg: 440, centre: [0, -6], height, material: terrMat,
    weights: (x, z, h, sl) => { const rock = sstep(0.18, 0.4, sl), yard = 1 - sstep(4, 10, Math.hypot(x - HOUSE[0], (z - HOUSE[1] - 3) * 1.1)); return [1 - rock, rock * 1.4, yard * (1 - rock) * 1.4]; } });
  add(S, T.mesh);
  const hy = (x, z) => height(x, z);
  // the house, facing the camera side (+z), with its roof and steps
  const H = await buildHouse(S); add(S, H.group, HOUSE[0], h0, HOUSE[1] + 1.2);
  // courtyard: low stone wall in front of the door, with a gap for the gate
  const yard = await stoneRing(4.2, { h: 0.85, thick: 0.5, gap: 0.9 }); yard.scale.set(1.25, 1, 0.75); add(S, yard, HOUSE[0], h0 - 0.05, HOUSE[1] + 2.6);
  // sheep pen behind-right of the house with a fire pit and wool sacks
  const pen = await stoneRing(4.6, { h: 1.15, thick: 0.6, gap: 0.7 }); pen.rotation.y += 0.9; add(S, pen, 12, hy(12, -10) - 0.1, -10);
  const pit = await W.prop('stone_fire_pit', { pos: [7.2, hy(7.2, -4.5), -4.5], height: 0.35 }); add(S, pit);
  const fire = W.flame({ h: 0.7, w: 0.5, seed: 3, inten: 5, light: 5, dist: 14 }); add(S, fire, 7.2, hy(7.2, -4.5) + 0.12, -4.5); fire.visible = time !== 'day';
  S.updaters.push((t, o) => fire.userData.update(t, o.fire ?? 1));
  const hs = await MATS.hessian(), wool = [];
  for (const [x, z, s] of [[8.6, -3.4, 0.9], [9.2, -4.1, 0.75], [8.9, -5.4, 0.85]]) { const k = W.sack(hs, { w: 0.5 * s, h: 0.7 * s, seed: x * 10 | 0 }); add(S, k, x, hy(x, z) - 0.02, z); k.rotation.y = x; wool.push(k); }
  // the well, off to one side on the slope
  const WELL = [-17, 9], well = await buildWell(S, { depth: 9, beam: true }); add(S, well.group, WELL[0], hy(...WELL), WELL[1]); well.group.rotation.y = 0.4;
  // olive trees ONLY on terrace treads (flat ground away from the house pad and paths)
  const oliveProto = await Promise.all([1, 2, 3].map((s) => W.oliveTree({ seed: seed * 10 + s, height: 5.2 + s * 0.5 })));
  const spots = W.scatterPoints({ seed: seed + 5, count: olives, rect: [-60, -70, 60, 25], heightAt: hy, s: [0.8, 1.15], minDist: 7, sink: 0,
    area: (x, z) => { const d = Math.hypot(x - HOUSE[0], z - HOUSE[1]), sl = 1 - T.normalAt(x, z, 0.6).y; return d > 15 && Math.hypot(x - WELL[0], z - WELL[1]) > 6 && Math.hypot(x - 12, z + 10) > 7 && sl < 0.05 ? 1 : 0; } });
  const oliveList = spots.map((p, i) => { const o = oliveProto[i % 3].clone(true); o.position.set(p.x, p.y, p.z); o.rotation.y = p.ry; o.scale.setScalar(p.s); add(S, o); return o; });
  S.updaters.push((t) => oliveProto.forEach((o) => o.userData.update(t)));
  // tents of the brothers' camp further along the slope
  const tentList = [];
  if (tents) for (const [x, z, ry] of [[-26, -20, 0.5], [-34, -14, 0.9]]) { const tg = await buildTent(); tg.position.set(x, hy(x, z) - 0.05, z); tg.rotation.y = ry; add(S, tg); tentList.push(tg); }
  // rocks (library, LOD) and dry shrubs on the hillside
  const rocks = W.scatterPoints({ seed: seed + 9, count: 260, rect: [-160, -200, 160, 60], heightAt: hy, s: [0.5, 2.2], sink: 0.15,
    area: (x, z) => Math.hypot(x - HOUSE[0], z - HOUSE[1]) > 12 && Math.hypot(x - 12, z + 10) > 6 && Math.hypot(x - WELL[0], z - WELL[1]) > 3 ? 0.55 + 0.45 * (1 - T.normalAt(x, z).y) * 3 : 0 });
  add(S, await W.scatter('rock_07', rocks.map((p) => ({ ...p, s: p.s * 5 })), { lod: { focus: [0, 0], far: 45 } }));
  const shrubs = W.scatterPoints({ seed: seed + 13, count: 90, rect: [-70, -90, 70, 30], heightAt: hy, s: [0.5, 0.9], sink: 0.05,
    area: (x, z) => Math.hypot(x - HOUSE[0], z - HOUSE[1]) > 11 && Math.hypot(x - 12, z + 10) > 6 ? 0.7 : 0 });
  add(S, await W.scatter('shrub_02', shrubs, { lod: null }));
  const at = (x, z, dy) => [x, Math.max(hy(x, z), h0) + dy, z];
  add(S, await W.groundCover({ heightAt: hy, focus: [3, 8], radius: 26, seed: seed + 21, pebbles: 700, rocks: 70, tuftN: 220, boulders: 30,
    area: (x, z) => Math.hypot(x - HOUSE[0], z - HOUSE[1]) > 5.5 && Math.hypot(x - 12, z + 10) > 5.5 && Math.hypot(x - WELL[0], z - WELL[1]) > 2.2 ? 1 : 0 }));
  wool.forEach((k) => S.group.add(W.contactShadow(0.9, 0.9, { op: 0.5 })).children.at(-1).position.set(k.position.x, k.position.y + 0.03, k.position.z));
  const cameras = {
    hero:     { pos: at(6.5, 16, 1.7), look: [0, h0 + 2.0, -2], fov: 48 },               // the house on its pad, olive terraces, sky
    roof:     { pos: [3.2, h0 + 4.4, 1.8], look: [-1.2, h0 + 4.0, -3.5], fov: 48 },          // on the flat roof
    sky:      { pos: at(2, 14, 1.6), look: [-2, h0 + 16, -20], fov: 58 },                 // the dream sky above the roof
    pen_fire: { pos: [4.6, hy(4.6, -1.8) + 1.0, -1.8], look: [8.5, hy(8.5, -6) + 0.6, -6], fov: 44 },
    doorway:  { pos: at(0.6, 6.8, 1.4), look: [0, h0 + 1.1, 1.2], fov: 38 },
    well:     { pos: [WELL[0] + 5, hy(...WELL) + 1.6, WELL[1] + 5], look: [WELL[0], hy(...WELL) + 0.6, WELL[1]], fov: 40 },
    wide:     { pos: at(22, 34, 9), look: [-4, h0 + 2, -8], fov: 42 },
  };
  const slots = { father_door: [0, h0, 2.2, 0], boy_roof: [-1.0, h0 + H.roofY, -1.5, Math.PI], brothers_fire_1: [6.2, hy(6.2, -3.4), -3.4, 2.2], brothers_fire_2: [8.2, hy(8.2, -5.8), -5.8, -0.6], brothers_fire_3: [6.4, hy(6.4, -5.6), -5.6, 0.9] };
  const props = { house: H.group, door: H.door, pen, fire, firepit: pit, wool, well: well.group, wellRope: well.rope, olives: oliveList, tents: tentList, terrain: T, sky: S.atmo.sky, stars: S.atmo.stars, sun: S.atmo.sun };
  return finish(S, 'canaan_hills', cameras, props, slots);
}

// THE WELL: a stone-lined dry well on an open desert slope at midday; inside-looking-up shot.
export async function the_well({ time = 'day', seed = 31 } = {}) {
  const S = await base('the_well', time, { shadowBox: 18, sun: { azim: 35 } });
  const n = W.noise2(seed), n2 = W.noise2(seed + 4);
  const height = (x, z) => { const d = Math.hypot(x, z); return 3 * W.fbm(n, x / 70, z / 70, 5) + 0.03 * -z + 26 * sstep(160, 420, d) * (0.5 + 0.5 * W.fbm(n2, x / 200, z / 200, 4)) + 0.04 * n2(x, z); };
  const h0 = height(0, 0), hf = (x, z) => lerp(height(x, z), h0, 1 - sstep(2.2, 5, Math.hypot(x, z)));
  const mt = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3.0 }, { name: 'sand_01', tile: 3.5, tint: 0xe8d4b4 }, { name: 'brown_mud_dry', tile: 2.6 }], { macro: 0.25, normal: 1.0 });
  const T = W.terrain({ size: 900, seg: 440, height: hf, material: mt, weights: (x, z, h, sl) => [0.7 + 0.3 * n(x / 12, z / 12), 0.6 * sstep(-0.2, 0.6, n2(x / 25, z / 25)), (1 - sstep(1.5, 4, Math.hypot(x, z))) * 1.2 + 0.3 * sstep(0, 0.6, n(x / 7, z / 7))] });
  add(S, T.mesh);
  const well = await buildWell(S, { depth: 9 }); add(S, well.group, 0, h0, 0);
  add(S, await W.groundCover({ heightAt: hf, focus: [2, 4], radius: 24, seed: seed + 2, pebbles: 900, rocks: 90, tuftN: 200, boulders: 40, area: (x, z) => Math.hypot(x, z) > 1.35 ? 1 : 0 }));
  add(S, await W.scatter('dry_branches_medium_01', W.scatterPoints({ seed: seed + 3, count: 26, rect: [-40, -50, 40, 20], heightAt: hf, s: [0.6, 1.1], sink: 0.02, area: (x, z) => Math.hypot(x, z) > 4 ? 1 : 0 })));
  add(S, await W.scatter('shrub_02', W.scatterPoints({ seed: seed + 7, count: 40, rect: [-60, -80, 60, 25], heightAt: hf, s: [0.3, 0.6], sink: 0.04, area: (x, z) => Math.hypot(x, z) > 5 ? 0.8 : 0 })));
  S.group.add(W.contactShadow(3.4, 3.4, { op: 0.45 })).children.at(-1).position.set(0, h0 + 0.012, 0);
  const trunk = await W.prop('dead_tree_trunk', { pos: [-9, hf(-9, -7) - 0.1, -7], height: 3.2, ry: 1.1 }); add(S, trunk);
  const top = h0 + well.rimTop;
  const cameras = {
    hero:      { pos: [3.4, h0 + 1.05, 4.6], look: [0, h0 + 0.8, 0], fov: 44 },                 // the rim, beam and rope against hard sky
    inside_up: { pos: [0.18, h0 - well.depth + 1.1, 0.12], look: [0, h0 + 6, 0.05], fov: 64 },    // from the bottom: a coin of sky
    rim_close: { pos: [0.9, top + 0.45, 1.25], look: [0, top - 1.2, 0], fov: 40 },
    over_rim:  { pos: [0, top + 1.4, 0.35], look: [0, h0 - 4, 0], fov: 50 },                     // sinking into the shaft
    wide:      { pos: [12, h0 + 3.2, 18], look: [0, h0 + 0.8, -2], fov: 40 },
  };
  const slots = { brother_1: [-1.6, h0, 0.6, 1.6], brother_2: [1.5, h0, -0.9, -1.6], brother_3: [0.4, h0, -1.8, 3.0], boy: [0, h0 - well.depth + 0.4, 0, 0] };
  return finish(S, 'the_well', cameras, { well: well.group, rope: well.rope, bucket: well.bucket, water: well.water, terrain: T, sun: S.atmo.sun }, slots);
}

// CARAVAN ROUTE: dunes and rocky hills, a beaten track, a resting place with loaded pack bundles,
// water jars, saddle blankets, and a wayside well. No camels (bundles tell the story).
export async function caravan_route({ time = 'golden', seed = 51 } = {}) {
  const S = await base('caravan_route', time, { sun: { azim: 125 }, shadowBox: 26 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 2);
  const path = (z) => 5 * Math.sin(z / 36) + 2 * Math.sin(z / 11);
  const raw = (x, z) => {
    const dune = 3.2 * Math.pow(Math.abs(Math.sin((x * 0.8 + z * 0.35) / 14 + 1.6 * n(x / 60, z / 60))), 1.6) + 2 * W.fbm(n, x / 50, z / 50, 4);
    const hills = 30 * sstep(60, 220, Math.abs(x - path(z))) * W.ridged(n2, x / 110, z / 110, 5);
    return dune + hills;
  };
  const height = (x, z) => { const dp = Math.abs(x - path(z)), flat = 1 - sstep(2.5, 9, dp); return lerp(raw(x, z), raw(path(z), z) * 0.7 + 0.5, flat * 0.8) - flat * 0.06; };
  const mt = await W.terrainMaterial([{ name: 'sand_01', tile: 4.0, tint: 0xf0d8b0 }, { name: 'dry_ground_rocks', tile: 3.2 }, { name: 'brown_mud_dry', tile: 2.8, tint: 0xe8d0b0 }], { macro: 0.28, normal: 0.6 });
  const T = W.terrain({ size: 1000, seg: 440, centre: [0, -10], height, material: mt,
    weights: (x, z, h, sl) => { const dp = Math.abs(x - path(z)); return [1, sstep(0.22, 0.45, sl) * 1.6 + sstep(80, 160, dp) * 0.7, (1 - sstep(1.2, 3.5, dp)) * 1.5]; } });
  add(S, T.mesh);
  const hy = height, CAMP = [path(4) + 6, 4];
  const items = [], hs = await MATS.hessian();
  const place = (o, x, z, ry = 0, dy = 0) => { add(S, o); W.ground(o, x, z, hy, { sink: 0.04 - dy, ry, op: 0.55, parent: S.group }); items.push(o); return o; };
  for (const [dx, dz, w, h, d, ry] of [[0, 0, 1.0, 0.55, 0.6, 0.3], [1.1, 0.2, 0.9, 0.5, 0.55, 0.1], [0.5, 0.9, 0.85, 0.45, 0.5, -0.4], [-1.0, -0.6, 0.8, 0.45, 0.5, 0.8]]) place(await bundle({ w, h, d }), CAMP[0] + dx, CAMP[1] + dz, ry, -0.03);
  const top = await bundle({ w: 0.8, h: 0.4, d: 0.5, seed: 9 }); top.position.set(CAMP[0] + 0.55, hy(...CAMP) + 0.46, CAMP[1] + 0.1); top.rotation.set(0.04, 0.5, -0.06); add(S, top);
  for (const [dx, dz, s] of [[2.2, -0.4, 1], [2.6, 0.3, 0.85], [-1.8, 0.9, 0.9]]) place(W.sack(hs, { w: 0.5 * s, h: 0.75 * s, seed: dx * 7 | 0 }), CAMP[0] + dx, CAMP[1] + dz, dx, -0.02);
  place(blanketRoll(1.2, 0.17), CAMP[0] - 0.2, CAMP[1] + 1.8, 0.4); place(blanketRoll(1.0, 0.15, ['#5a1a12', '#c8a060', '#1a2a3a']), CAMP[0] + 1.6, CAMP[1] + 1.5, -0.3);
  place(await W.prop('ceramic_pot', { height: 0.5 }), CAMP[0] + 2.0, CAMP[1] + 1.2, 0.2); place(await W.prop('antique_ceramic_vase_01', { height: 0.55 }), CAMP[0] + 2.4, CAMP[1] + 1.6, 1.2);
  place(await W.prop('wicker_basket_01', { height: 0.38 }), CAMP[0] - 1.5, CAMP[1] + 0.2, 0.5);
  const leather = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.6 });
  for (const [dx, dz] of [[2.9, -0.9], [3.2, -0.4]]) place(W.sack(leather, { w: 0.38, h: 0.5, seed: dz * 9 | 0 }), CAMP[0] + dx, CAMP[1] + dz, 0);
  // the wayside well a little off the track
  const WELL = [path(-14) - 7, -14], well = await buildWell(S, { depth: 6, beam: true }); add(S, well.group, WELL[0], hy(...WELL) + 0.02, WELL[1]);
  // stones and dead wood along the route
  const rocks = W.scatterPoints({ seed: seed + 6, count: 260, rect: [-200, -260, 200, 60], heightAt: hy, s: [0.5, 2.6], sink: 0.2,
    area: (x, z) => { const dp = Math.abs(x - path(z)); return dp < 3.5 || Math.hypot(x - CAMP[0], z - CAMP[1]) < 4 || Math.hypot(x - WELL[0], z - WELL[1]) < 3 ? 0 : 0.25 + 0.75 * (1 - T.normalAt(x, z).y) * 3; } });
  add(S, await W.scatter('rock_07', rocks.filter((_, i) => i % 3 !== 2).map((p) => ({ ...p, s: p.s * 4 })), { lod: { focus: CAMP, far: 50 } }));
  add(S, await W.groundCover({ heightAt: hy, focus: CAMP, radius: 22, seed: seed + 11, pebbles: 700, rocks: 40, tuftN: 140, tuftColor: 0xc0a870, area: (x, z) => Math.abs(x - path(z)) > 1.2 && Math.hypot(x - CAMP[0], z - CAMP[1]) > 2.6 ? 1 : 0 }));
  add(S, await W.scatter('namaqualand_boulder_03', rocks.filter((_, i) => i % 3 === 2 && Math.hypot(rocks[i].x, rocks[i].z) > 30).map((p) => ({ ...p, s: p.s * 0.8 })), { lod: { focus: CAMP, far: 70 } }));
  add(S, await W.prop('dead_quiver_trunk', { pos: [CAMP[0] - 5, hy(CAMP[0] - 5, CAMP[1] - 6) - 0.1, CAMP[1] - 6], height: 2.4, ry: 2 }));
  add(S, await W.scatter('dry_branches_medium_01', W.scatterPoints({ seed: seed + 8, count: 30, rect: [-50, -80, 50, 30], heightAt: hy, s: [0.6, 1.1], area: (x, z) => Math.abs(x - path(z)) > 3 ? 0.6 : 0 })));
  const cy = hy(...CAMP);
  const cameras = {
    hero:  { pos: [CAMP[0] - 2.4, cy + 1.15, CAMP[1] + 4.6], look: [CAMP[0] + 0.5, cy + 0.55, CAMP[1] - 3], fov: 46 },   // bundles in front, the track winding off
    track: { pos: [path(16), hy(path(16), 16) + 1.7, 16], look: [path(-30), hy(path(-30), -30) + 1, -30], fov: 42 },
    well:  { pos: [WELL[0] + 3.5, hy(...WELL) + 1.4, WELL[1] + 3.8], look: [WELL[0], hy(...WELL) + 0.7, WELL[1]], fov: 40 },
    wide:  { pos: [CAMP[0] + 18, cy + 9, CAMP[1] + 22], look: [CAMP[0] - 4, cy, CAMP[1] - 14], fov: 40 },
  };
  const slots = { trader_1: [CAMP[0] + 1.2, cy, CAMP[1] + 2.4, 2.6], trader_2: [WELL[0] + 1.2, hy(...WELL), WELL[1] + 0.4, -1.8] };
  return finish(S, 'caravan_route', cameras, { bundles: items, well: well.group, rope: well.rope, terrain: T, path, sun: S.atmo.sun }, slots);
}

// EGYPT MARKET: a lane of mud-brick stalls under reed awnings: grain sacks, baskets of fruit, pots,
// a brass scale on a table, and a stone block (the sale platform) in a small square.
export async function egypt_market({ time = 'day', seed = 61 } = {}) {
  const S = await base('egypt_market', time, { sun: { azim: 150 }, shadowBox: 24, focus: [0, 0, -8], fog: 0.004 });
  const n = W.noise2(seed), height = (x, z) => 0.05 * n(x / 3, z / 3) + 0.02 * n(x, z);
  const mt = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3 }, { name: 'raked_dirt', tile: 2.6, tint: 0xf0e0c8 }, { name: 'brown_mud_dry', tile: 2.4 }], { macro: 0.2 });
  const T = W.terrain({ size: 400, seg: 300, height, material: mt, weights: (x, z) => [1, (1 - sstep(1.2, 2.8, Math.abs(x))) * 1.4, sstep(3, 6, Math.abs(x)) * 0.8 + 0.3 * n(x / 4, z / 4)] });
  add(S, T.mesh);
  const [mud, plaster, reed, pl, dpl, hs] = await Promise.all([MATS.mudPlaster(), MATS.plaster(), MATS.reed(), MATS.planks(), MATS.darkPlanks(), MATS.hessian()]);
  const r = W.rng(seed), stalls = [], goods = [];
  const fruitNames = ['food_pomegranate_01', 'yellow_onion', 'lemon'];
  for (let side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const z = 4 - i * 4.4, x = side * 4.2, g = new THREE.Group();
    const back = W.rbox(0.4, 3.1 + r() * 0.8, 4.2, i % 2 ? mud : plaster, { r: 0.08, seg: 3 }); back.position.x = side * 1.7; g.add(back);
    for (const dz of [-2.0, 2.0]) { const sw = W.rbox(3.4, 2.6, 0.32, mud, { r: 0.07 }); sw.position.set(0, 0, dz); g.add(sw); }
    const awn = W.cloth(3.6, 4.2, reed, { segW: 24, segH: 24, folds: 0.01, sag: (u, v) => -0.08 * Math.sin(v * Math.PI) }); awn.rotation.set(-Math.PI / 2, 0, side * 0.18, 'ZXY'); awn.position.set(-side * 0.2, 2.65, 0); g.add(awn);
    for (const dz of [-1.9, 1.9]) { const p = W.rbox(0.09, 2.45, 0.09, dpl, { r: 0.02 }); p.position.set(-side * 1.85, 0, dz); g.add(p); }
    const counter = W.rbox(0.8, 0.85, 3.2, i % 3 ? pl : mud, { r: 0.04 }); counter.position.x = -side * 1.1; g.add(counter);
    g.position.set(x, height(x, z), z); add(S, g); stalls.push(g);
    // goods on and in front of each counter
    const kind = i % 3;
    for (let k = 0; k < 3; k++) {
      const gx = x - side * 1.1, gz = z - 1.0 + k * 1.0;
      if (kind === 0) { const sk = W.sack(hs, { w: 0.42, h: 0.5, seed: i * 10 + k, open: true }); sk.position.set(gx, 0.85, gz); add(S, sk); goods.push(sk);
        const grain = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, 1.0), new THREE.MeshStandardMaterial({ color: [0xd8b060, 0x9a6a3a, 0xe8d8a0][k], roughness: 1 })); grain.scale.y = 0.4; grain.position.set(gx, 0.85 + 0.42, gz); add(S, grain); }
      else if (kind === 1) { const b = await W.prop('wicker_basket_02', { pos: [gx, 0.85, gz], height: 0.28, ry: k }); add(S, b); goods.push(b);
        const fr = fruitNames[(i + k) % 3], gl = await W.gltf(fr), fs = 0.26 / (gl.bbox.max.x - gl.bbox.min.x) * 0.3;
        add(S, await W.scatter(fr, Array.from({ length: 7 }, (_, q) => ({ x: gx + Math.cos(q * 0.9) * 0.08 * (q % 3), y: 0.85 + 0.18 + (q > 4 ? 0.05 : 0), z: gz + Math.sin(q * 0.9) * 0.08 * (q % 3), s: fs * (1 + 0.1 * Math.sin(q)) * (fr === 'lemon' ? 0.9 : 1), ry: q }))));
      } else { const p = await W.prop(['ceramic_pot', 'jug_01', 'antique_ceramic_vase_01'][k], { pos: [gx, 0.85, gz], height: [0.4, 0.3, 0.45][k], ry: k }); add(S, p); goods.push(p); }
    }
    for (let k = 0; k < 2; k++) { const sk = W.sack(hs, { w: 0.5, h: 0.7, seed: i * 31 + k }); sk.position.set(x - side * 1.9, height(x, z), z - 1.3 + k * 2.4); sk.rotation.y = r() * 6; add(S, sk); }
  }
  // the small square with the stone block, and the brass scale
  const stone = await MATS.rustic();
  const block = W.rbox(1.6, 0.75, 1.2, stone, { r: 0.08, seg: 4 }); add(S, block, 0.3, 0, -26);
  const step = W.rbox(0.9, 0.35, 0.5, stone, { r: 0.05 }); add(S, step, 0.3, 0, -25.15);
  const table = await W.prop('wooden_table_02', { pos: [-2.4, 0, -21], height: 0.8, ry: 0.3 }); add(S, table);
  const br = W.brassMat(), scale = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.55, 24), br); post.position.y = 0.275; scale.add(post);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 16).rotateZ(Math.PI / 2), br); beam.position.y = 0.55; scale.add(beam);
  const pans = [];
  for (const s of [-1, 1]) { const pan = W.lathe([[0.001, 0], [0.09, 0.005], [0.13, 0.035], [0.125, 0.04]], br, { seg: 64 }); pan.position.set(s * 0.29, 0.3, 0); scale.add(pan); pans.push(pan);
    for (let k = 0; k < 3; k++) { const a = k * 2.094, c = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.27, 6), br); c.position.set(s * 0.29 + Math.cos(a) * 0.06, 0.43, Math.sin(a) * 0.06); scale.add(c); } }
  scale.position.set(-2.4, 0.8, -21); add(S, W.shadows(scale));
  const coins = new THREE.Group(), silver = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 1, roughness: 0.3 });
  for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 32), silver); c.position.set(-2.1 + k * 0.03, 0.802, -20.8 + (k % 2) * 0.03); coins.add(c); }
  add(S, W.shadows(coins));
  // background: blocks of two-storey mud-brick houses and palms beyond the lane
  for (let i = 0; i < 14; i++) { const x = (i % 2 ? 1 : -1) * (12 + r() * 10), z = -6 - Math.floor(i / 2) * 9 - r() * 4, w = 6 + r() * 5, h = 4 + r() * 4;
    const b = W.rbox(w, h, 7, i % 3 ? mud : plaster, { r: 0.12 }); add(S, b, x, 0, z); }
  for (let i = 0; i < 6; i++) add(S, W.datePalm({ seed: seed + i, height: 8 + r() * 4 }), (i % 2 ? 1 : -1) * (9 + r() * 4), 0, -14 - i * 7);
  const cameras = {
    hero:  { pos: [0.6, 1.6, 9.5], look: [0.2, 1.6, -22], fov: 44 },                  // down the lane to the stone block
    scale: { pos: [-1.9, 1.35, -20.1], look: [-2.4, 0.95, -21], fov: 36 },
    block: { pos: [2.6, 1.3, -21.5], look: [0.3, 0.6, -26], fov: 40 },
    high:  { pos: [6, 14, 8], look: [0, 0, -16], fov: 44 },
  };
  const slots = { buyer: [-1.6, 0, -20.4, 2.6], seller: [-3.1, 0, -21.6, -0.6], on_block: [0.3, 0.75, -26, 0], crowd_1: [1.2, 0, -10, 3], crowd_2: [-1.0, 0, -14, 0.4] };
  return finish(S, 'egypt_market', cameras, { stalls, goods, block, scale, pans, coins, terrain: T, sun: S.atmo.sun }, slots);
}

// MINISTER'S HOUSE (interior): whitewashed plaster hall, painted papyrus columns, a carved wooden
// door with bolts, oil lamps, linen curtain, a high window with an amber shaft, and an opening to a
// bright courtyard with a pond and a date palm. time: 'evening' (amber + lamps) | 'morning'
export async function ministers_house({ time = 'evening', seed = 71 } = {}) {
  const eve = time !== 'morning';
  const S = await base('ministers_house', 'golden', { hdri: 'plains_sunset', envI: 0.22, sun: { elev: eve ? 14 : 40, azim: 200 }, sunI: eve ? 5.5 : 4.5, sunColor: eve ? 0xffb070 : 0xfff0d8,
    shadowBox: 12, focus: [0, 1.5, -2], fog: 0, exposure: eve ? 1.35 : 1.1, background: 'sky', hemi: 0.05 });
  const [wash, pl, dpl, linen, iron] = await Promise.all([MATS.whitewash(), MATS.planks(), MATS.darkPlanks(), MATS.linen(), Promise.resolve(W.ironMat())]);
  const RW = 9, RD = 11, RH = 4.4, t = 0.5;
  add(S, await slabFloor({ w: RW, d: RD, size: 0.9, seed, rough: 0.45, origin: [0, 0, -RD / 2 + 2] }));
  // walls (pieces around the openings): back wall with the carved door, left wall with high window, right wall opening to the courtyard
  const wall = (w, h, d, x, y, z) => add(S, W.rbox(w, h, d, wash, { r: 0.05, seg: 3 }), x, y, z);
  const zb = -RD + 2 - t / 2, DW = 1.5, DH = 2.7;
  wall((RW - DW) / 2, RH, t, -(RW + DW) / 4 - 0.0, 0, zb); wall((RW - DW) / 2, RH, t, (RW + DW) / 4, 0, zb); wall(DW + 0.02, RH - DH, t, 0, DH, zb);
  const xl = -RW / 2 - t / 2, WZ = -4.2, WW = 1.1, WH = 0.8, WY = 3.0;
  const lz0 = 2 + 0.5, lz1 = -RD + 2;                                   // left wall spans z from lz1..lz0
  wall(t, RH, lz0 - (WZ + WW / 2), xl, 0, (lz0 + WZ + WW / 2) / 2); wall(t, RH, (WZ - WW / 2) - lz1, xl, 0, (WZ - WW / 2 + lz1) / 2);
  wall(t, WY - WH / 2, WW, xl, 0, WZ); wall(t, RH - WY - WH / 2, WW, xl, WY + WH / 2, WZ);
  const OZ = -3.0, OW = 2.4, OH = 3.0, xr = RW / 2 + t / 2;
  wall(t, RH, lz0 - (OZ + OW / 2), xr, 0, (lz0 + OZ + OW / 2) / 2); wall(t, RH, (OZ - OW / 2) - lz1, xr, 0, (OZ - OW / 2 + lz1) / 2); wall(t, RH - OH, OW, xr, OH, OZ);
  // painted dado band
  const band = new THREE.MeshStandardMaterial({ color: 0x8a3a22, roughness: 0.9 }), band2 = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.9 });
  for (const [x, z, w, d] of [[-(RW + DW) / 4 - 0.15, zb + t / 2 + 0.01, (RW - DW) / 2 - 0.3, 0.02], [(RW + DW) / 4 + 0.15, zb + t / 2 + 0.01, (RW - DW) / 2 - 0.3, 0.02]]) { add(S, W.rbox(w, 0.12, d, band, { r: 0.005 }), x, 0.9, z); add(S, W.rbox(w, 0.06, d, band2, { r: 0.005 }), x, 1.05, z); }
  // ceiling: planks on heavy beams
  add(S, W.rbox(RW + 1, 0.12, RD + 1, dpl, { r: 0.02 }), 0, RH, -RD / 2 + 2);
  for (let i = 0; i < 7; i++) add(S, W.rbox(0.26, 0.3, RD + 1, dpl, { r: 0.04 }), -RW / 2 + 0.6 + i * (RW - 1.2) / 6, RH - 0.3, -RD / 2 + 2);
  // the carved door (closed) with bolts, a carved emblem above the lintel
  const D = W.door(dpl, iron, { w: DW - 0.04, h: DH - 0.02, t: 0.1, frame: 0.18 }); add(S, D.group, 0, 0, zb + 0.1);
  for (const y of [0.32, 1.45]) for (const fx of [0.27, 0.73]) { const pnl = W.rbox(0.5, 0.95, 0.03, pl, { r: 0.015 }); pnl.position.set((DW - 0.04) * fx, y, 0.065); D.leaf.add(pnl); }   // carved raised panels
  const emb = W.lathe([[0.001, 0], [0.32, 0], [0.34, 0.03], [0.3, 0.06], [0.2, 0.08], [0.08, 0.12], [0.001, 0.12]], dpl, { seg: 96 }); emb.rotation.x = Math.PI / 2; add(S, emb, 0, DH + 0.68, zb + t / 2 + 0.01);
  // two painted papyrus columns
  const colMat = (await MATS.plaster()).clone(); colMat.vertexColors = true;
  const cols = [-2.2, 2.2].map((x) => add(S, W.column(colMat, { h: RH - 0.3, r: 0.32, cap: 'papyrus' }), x, 0, -4.6));
  // oil lamps on wooden stands either side of the door, one on a wall ledge
  const lamps = [];
  for (const x of [-1.35, 1.35]) { const st = W.rbox(0.08, 1.25, 0.08, dpl, { r: 0.02 }); add(S, st, x, 0, zb + 0.6); const top = W.rbox(0.3, 0.05, 0.3, dpl, { r: 0.015 }); add(S, top, x, 1.25, zb + 0.6);
    const L = oilLamp(S, { seed: x > 0 ? 3 : 4, light: eve ? 0.7 : 0.2 }); add(S, L, x, 1.3, zb + 0.6); L.rotation.y = x > 0 ? 0.6 : -0.6; lamps.push(L); }
  const ledge = W.rbox(0.6, 0.08, 0.25, wash, { r: 0.02 }); add(S, ledge, xl + 0.35, 1.6, -1.2);
  const L3 = oilLamp(S, { seed: 7, light: eve ? 0.5 : 0.15 }); add(S, L3, xl + 0.38, 1.68, -1.2); L3.rotation.y = Math.PI / 2; lamps.push(L3);
  // linen curtain at the courtyard opening, a low cedar bench, jars
  const cur = W.cloth(1.0, OH - 0.1, linen, { segW: 40, segH: 60, folds: 0.03, sag: (u, v) => 0.06 * Math.sin(u * 18) }); cur.rotation.y = -Math.PI / 2; add(S, cur, xr - t / 2 - 0.05, (OH - 0.1) / 2 + 0.02, OZ + OW / 2 - 0.45);
  add(S, W.rbox(2.2, 0.45, 0.55, pl, { r: 0.05 }), -3.2, 0, -1.0);
  add(S, await W.prop('antique_ceramic_vase_01', { pos: [3.6, 0, -7.6], height: 0.8 }));
  add(S, await W.prop('ceramic_vase_01', { pos: [3.9, 0, -7.0], height: 0.55, ry: 1 }));
  // the courtyard beyond the opening: pond, date palm, sunlit wall
  const cour = await slabFloor({ w: 8, d: 10, size: 1.1, seed: seed + 1, rough: 0.7, tint: 0xe2d2b8, origin: [RW / 2 + t + 4, 0, -3] }); add(S, cour);
  const pondRim = W.lathe([[1.6, -0.05], [1.62, 0.18], [1.5, 0.22], [1.4, 0.18], [1.4, -0.1]], await MATS.stone(), { seg: 96 }); add(S, pondRim, RW / 2 + 4.5, 0, -3);
  const pond = W.water(new THREE.CircleGeometry(1.42, 64).rotateX(-Math.PI / 2), { color: 0x1a3a34, rough: 0.04, tile: 1.5 }); add(S, pond, RW / 2 + 4.5, 0.1, -3); S.updaters.push((tt) => pond.userData.update(tt));
  add(S, W.datePalm({ seed: seed + 2, height: 7.5 }), RW / 2 + 6.5, 0, -6);
  add(S, W.rbox(0.5, 4.5, 11, wash, { r: 0.06 }), RW / 2 + 8.5, 0, -3);
  // the shaft of window light
  const sd = S.atmo.sunDir;
  const shaft = W.lightShaft({ from: [xl, WY, WZ], to: [xl + 4.2, 0.05, WZ - 1.2], r0: 0.45, r1: 1.0, color: eve ? 0xffc080 : 0xfff2dc, op: eve ? 0.1 : 0.06 }); add(S, shaft);
  S.updaters.push((tt, o) => shaft.userData.update(tt, o.shaft ?? 1));
  const cameras = {
    hero:      { pos: [1.4, 1.45, 1.8], look: [-0.1, 1.7, zb], fov: 42 },                      // the carved door between the lamps
    door:      { pos: [0.35, 1.4, zb + 1.6], look: [0.4, 1.3, zb], fov: 34 },                  // bolt + hand on the door
    lintel:    { pos: [0.1, 1.7, zb + 2.6], look: [0, DH + 0.7, zb], fov: 40 },                // tilt up to the emblem
    courtyard: { pos: [-2.5, 1.6, 0.5], look: [RW / 2 + 4, 1.4, -3], fov: 44 },                // through the opening to the pond and palm
    window:    { pos: [2.0, 1.2, -0.5], look: [xl, WY, WZ], fov: 44 },
  };
  const slots = { young_man_door: [0, 0, zb + 1.1, Math.PI], woman_sleeve: [-1.6, 0, zb + 2.2, -2.6], servant_court: [RW / 2 + 3, 0, -1.5, 0.5], husband_threshold: [0, 0, zb - 0.6, 0] };
  return finish(S, 'ministers_house', cameras, { door: D, bolt: D.leaf.userData.bolt, lamps, columns: cols, curtain: cur, shaft, pond, emblem: emb }, slots, { bloom: 0.14, bloomThreshold: 0.92 });
}

// PRISON: a stone cell with a small high barred window (sun shaft), two cellmates' bedding,
// a water jar, a heavy iron-bound door. time: 'morning' | 'evening'
export async function prison({ time = 'morning', seed = 81 } = {}) {
  const S = await base('prison', 'day', { hdri: 'goegap', envI: 0.12, sun: { elev: time === 'evening' ? 16 : 34, azim: 90 }, sunI: 7, sunColor: time === 'evening' ? 0xffb070 : 0xfff0d8,
    shadowBox: 6, focus: [0, 1.5, 0], fog: 0, exposure: 1.45, hemi: 0.03, background: 'sky' });
  const [sd, pl, iron, hs, linen, mudF] = await Promise.all([MATS.stoneDisp(), MATS.darkPlanks(), Promise.resolve(W.ironMat()), MATS.hessian(), MATS.linen(), MATS.mudFloor()]);
  const CW = 4.2, CD = 5.2, CH = 3.8, WX = 0.6, WY = 2.95, WWd = 0.62, WHt = 0.46;
  // walls: dense displaced panels facing inward; the back wall (-z) has the window hole (built from 4 panels)
  const pnl = (w, h, x, y, z, ry) => { const p = W.panel(w, h, sd, { dens: 22 }); p.position.set(x, y, z); p.rotation.y = ry; add(S, p); return p; };
  const zb = -CD / 2;
  pnl(CW / 2 + WX - WWd / 2, CH, (-CW / 2 + WX - WWd / 2) / 2, CH / 2, zb, 0);
  pnl(CW / 2 - WX - WWd / 2, CH, (CW / 2 + WX + WWd / 2) / 2, CH / 2, zb, 0);
  pnl(WWd, WY - WHt / 2, WX, (WY - WHt / 2) / 2, zb, 0); pnl(WWd, CH - WY - WHt / 2, WX, (CH + WY + WHt / 2) / 2, zb, 0);
  pnl(CD, CH, -CW / 2, CH / 2, 0, Math.PI / 2); pnl(CD, CH, CW / 2, CH / 2, 0, -Math.PI / 2); pnl(CW, CH, 0, CH / 2, CD / 2, Math.PI);
  // the window reveal (wall thickness) and its bars; an outer wall slab so light enters only through the hole
  const out = (w, h, d, x, y, z) => add(S, W.rbox(w, h, d, sd, { r: 0.02 }), x, y, z);
  const th = 0.6;
  for (const [w, h, x, y] of [[WWd, 0.04, WX, WY - WHt / 2 - 0.02], [WWd, 0.04, WX, WY + WHt / 2 - 0.02], [0.04, WHt, WX - WWd / 2 - 0.02, WY - WHt / 2], [0.04, WHt, WX + WWd / 2 - 0.02, WY - WHt / 2]]) {
    const b = new THREE.Mesh(W.boxUV(new THREE.BoxGeometry(w + 0.001, h, th, 4, 4, 8).translate(0, h / 2, -th / 2)), sd); b.position.set(x, y, zb); add(S, W.shadows(b)); }
  // outer skin (the shadow caster), with the window hole: four boxes
  for (const [w, h, x, y] of [[CW / 2 + WX - WWd / 2 + 0.6, CH + 0.4, (-CW / 2 - 0.6 + WX - WWd / 2) / 2, -0.2], [CW / 2 - WX - WWd / 2 + 0.6, CH + 0.4, (CW / 2 + 0.6 + WX + WWd / 2) / 2, -0.2],
    [WWd, WY - WHt / 2 + 0.2, WX, -0.2], [WWd, CH + 0.2 - WY - WHt / 2, WX, WY + WHt / 2]]) out(w, h, 0.1, x, y, zb - th);
  const bars = [];
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, WHt + 0.02, 16), iron); b.position.set(WX - WWd / 2 + (i + 0.5) * WWd / 4, WY, zb - th * 0.4); add(S, W.shadows(b)); bars.push(b); }
  // floor (packed earth) and ceiling (stone), straw
  const fl = W.panel(CW, CD, mudF, { dens: 10 }); fl.rotation.x = -Math.PI / 2; add(S, fl, 0, 0, 0);
  const ce = W.panel(CW, CD, sd, { dens: 8 }); ce.rotation.x = Math.PI / 2; add(S, ce, 0, CH, 0);
  const straw = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.18, 4).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 0.9 }), 1600);
  { const r = W.rng(seed), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
    for (let i = 0; i < 1600; i++) { const cx = i % 2 ? -1.3 : 1.2, x = cx + (r() - 0.5) * 1.6, z = (r() - 0.5) * 3.2; E.set(0, r() * 6.3, (r() - 0.5) * 0.2); Q.setFromEuler(E); M.compose(V3(x, 0.004 + r() * 0.01, z), Q, V3(1, 1, 1)); straw.setMatrixAt(i, M); } }
  straw.receiveShadow = true; add(S, straw);
  // two cellmates' bedding: mats, folded blankets, rolled pillows
  const beds = [];
  for (const [x, ry, seedB] of [[-1.3, 0.04, 1], [1.25, -0.05, 2]]) {
    const g = new THREE.Group();
    g.add(W.rbox(0.85, 0.05, 1.95, hs, { r: 0.02, seg: 3 }));
    const bl = W.cloth(0.8, 1.0, linen, { segW: 40, segH: 50, folds: 0.012, seed: seedB, sag: (u, v) => 0.02 * Math.sin(u * 12) }); bl.rotation.x = -Math.PI / 2; bl.position.set(0.02, 0.07, 0.35); g.add(bl);
    const pil = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 32, 2).rotateZ(Math.PI / 2)), hs); pil.position.set(0, 0.13, -0.8); g.add(W.shadows(pil));
    g.position.set(x, 0, 0.1); g.rotation.y = ry; add(S, g); beds.push(g);
  }
  const jar = await W.prop('jug_01', { pos: [1.7, 0, -1.9], height: 0.45, ry: 0.5 }); add(S, jar);
  const bowl = await W.prop('wooden_bowl_01', { pos: [-0.4, 0, -1.6], height: 0.08 }); add(S, bowl);
  // heavy door in the side wall
  const D = W.door(pl, iron, { w: 0.95, h: 1.9, t: 0.12, frame: 0.12 }); D.group.rotation.y = -Math.PI / 2; add(S, D.group, CW / 2 - 0.08, 0, 1.2);
  const shaft = W.lightShaft({ from: [WX, WY, zb], to: [WX - 0.6, 0.02, zb + 2.6], r0: 0.26, r1: 0.42, color: time === 'evening' ? 0xffc080 : 0xfff2d8, op: 0.05 }); add(S, shaft);
  S.updaters.push((tt, o) => shaft.userData.update(tt, o.shaft ?? 1));
  // aim the sun through the window onto the floor
  const sun = S.atmo.sun, dir = V3(WX, WY, zb).sub(V3(WX - 0.6, 0.02, zb + 2.6)).normalize();
  sun.position.copy(V3(WX, WY, zb).add(dir.multiplyScalar(40))); sun.target.position.set(WX - 0.6, 0, zb + 2.6); sun.shadow.camera.far = 80; sun.shadow.camera.updateProjectionMatrix();
  const fill = new THREE.PointLight(0xffd8b0, 0.6, 7, 2); fill.position.set(0, 1.2, 0.8); add(S, fill);
  const cameras = {
    hero:   { pos: [-0.2, 1.75, 2.35], look: [0.35, 0.95, zb + 0.6], fov: 54 },                 // the cell: window shaft, both beds
    window: { pos: [0.2, 1.4, -0.4], look: [WX, WY, zb], fov: 38 },
    floor:  { pos: [0.6, 0.35, 0.9], look: [WX - 0.6, 0.0, zb + 2.0], fov: 42 },         // the patch of light on the floor
    door:   { pos: [-0.6, 1.3, 0.4], look: [CW / 2, 1.0, 1.2], fov: 44 },
  };
  const slots = { cellmate_a: [-1.3, 0, 0.4, 0.5], cellmate_b: [1.25, 0, 0.4, -0.5], young_man_wall: [-1.6, 0, -1.6, 0.3] };
  return finish(S, 'prison', cameras, { door: D, bars, beds, jar, bowl, shaft, sun }, slots, { bloom: 0.2, bloomThreshold: 0.88 });
}

// NILE FIELDS + GRANARY: irrigated plots (green crop, furrows), channels, palms, a row of beehive silos
// in a walled yard with stacked sacks and a scribes' table; the desert edge beyond.
export async function nile_fields_granary({ time = 'golden', seed = 91, ripe = 0 } = {}) {
  const S = await base('nile_fields_granary', time, { sun: { azim: 150 }, shadowBox: 40, focus: [0, 0, -14], fog: 0.0016 });
  const n = W.noise2(seed), n2 = W.noise2(seed + 3);
  const desert = (x, z) => sstep(70, 140, x + 10 * n(z / 50, 0)) ;
  const chan = (x, z) => Math.min(Math.abs(z + 2), Math.abs(x + 12));
  const height = (x, z) => 0.12 * n(x / 10, z / 10) + desert(x, z) * (6 + 14 * W.fbm(n2, x / 60, z / 60, 4)) - 0.5 * (1 - sstep(0.6, 1.4, chan(x, z))) + 8 * sstep(260, 420, Math.hypot(x, z)) * W.ridged(n2, x / 150, z / 150);
  const plot = (x, z) => { const fx = Math.floor((x + 4) / 14), fz = Math.floor((z + 2) / 12); return ((fx * 7 + fz * 13) & 3); };
  const mt = await W.terrainMaterial([{ name: 'farm_furrows', tile: 7, tint: 0xf0e0cc }, { name: 'grass_ground', tile: 3 }, { name: 'sand_01', tile: 4, tint: 0xf0d8b0 }], { macro: 0.2 });
  const T = W.terrain({ size: 900, seg: 440, centre: [0, -10], height, material: mt,
    weights: (x, z, h) => { const d = desert(x, z), bank = 1 - sstep(1.0, 2.2, chan(x, z)); const k = plot(x, z); return [(1 - d) * (k < 2 ? 1 : 0.2), (1 - d) * (k >= 2 ? 1 : 0.15) + bank * 1.5, d * 1.6 + sstep(14, 26, -z + x * 0.2) * 0 ]; } });
  add(S, T.mesh);
  // channels
  for (const g of [new THREE.PlaneGeometry(260, 1.6).rotateX(-Math.PI / 2).translate(-40, -0.28, -2), new THREE.PlaneGeometry(1.6, 200).rotateX(-Math.PI / 2).translate(-12, -0.28, -60)]) {
    const w = W.water(g, { color: 0x30483c, rough: 0.05, tile: 3, flow: [0.03, 0.0] }); add(S, w); S.updaters.push((t) => w.userData.update(t)); }
  // the Nile in the distance
  const nile = W.water(new THREE.PlaneGeometry(1200, 120).rotateX(-Math.PI / 2).translate(-100, -0.4, -230), { color: 0x3a5a5a, rough: 0.08, tile: 10, flow: [0.05, 0] }); add(S, nile); S.updaters.push((t) => nile.userData.update(t));
  // green crop in the near plots (instanced stalks), only inside plots, never on the channel banks
  const crops = [];
  for (const [x0, z0, x1, z1] of [[-10.5, 0, 2, 9.5], [-26, 0, -13.5, 9.5], [-10.5, -14, 2, -3.5]]) {
    const c = W.cropField({ rect: [x0, z0, x1, z1], count: 22000, seed: x0 * 3 + z0 | 0, heightAt: height, h: [0.55, 0.95], ripe, rows: 0.32 }); add(S, c); crops.push(c); }
  // palms along the channel
  const r = W.rng(seed);
  for (let i = 0; i < 9; i++) add(S, W.datePalm({ seed: seed + i, height: 8 + r() * 5 }), -14 - r() * 2, 0, 6 - i * 11 - r() * 3);
  for (let i = 0; i < 7; i++) add(S, W.datePalm({ seed: seed + 20 + i, height: 9 + r() * 4 }), -30 - i * 13, 0, -4.5 - r() * 2);
  // the granary yard: enclosure wall, five beehive silos, sacks, scribes' table
  const GX = 22, GZ = -18, [mud, hs] = await Promise.all([MATS.mudPlaster(), MATS.hessian()]);
  for (const [w, d, x, z] of [[30, 0.6, 0, -9], [0.6, 18, -15, 0], [0.6, 18, 15, 0], [12, 0.6, -9, 9], [12, 0.6, 9, 9]]) add(S, W.rbox(w, 2.6, d, mud, { r: 0.1, seg: 3 }), GX + x, height(GX + x, GZ + z) - 0.1, GZ + z);
  const silos = [];
  for (let i = 0; i < 5; i++) { const s = await silo({ r: 2.1, h: 4.0 + (i % 2) * 0.4, dome: 2.4 }); s.position.set(GX - 11 + i * 5.5, height(GX - 11 + i * 5.5, GZ - 4.5) - 0.05, GZ - 4.5); add(S, s); silos.push(s); }
  const sacks = [];
  for (let k = 0; k < 18; k++) { const row = Math.floor(k / 6), x = GX - 4 + (k % 6) * 0.62 + row * 0.3, z = GZ + 3.2, y = height(x, z) + row * 0.5;
    const sk = W.sack(hs, { w: 0.5, h: 0.62, seed: k + 3 }); sk.position.set(x, y - 0.03, z + row * -0.05); sk.rotation.set(Math.PI / 2 * (row ? 1 : 0) * 0, k * 0.7, 0); add(S, sk); sacks.push(sk); }
  const table = await W.prop('wooden_table_02', { pos: [GX + 4, height(GX + 4, GZ + 5), GZ + 5], height: 0.75, ry: -0.2 }); add(S, table);
  const clay = new THREE.MeshStandardMaterial({ color: 0x9a6a48, roughness: 0.95 });
  for (let k = 0; k < 4; k++) add(S, W.rbox(0.16, 0.03, 0.22, clay, { r: 0.01 }), GX + 3.7 + k * 0.2, height(GX + 4, GZ + 5) + 0.75, GZ + 5 + (k % 2) * 0.1);
  add(S, await W.prop('wicker_basket_01', { pos: [GX + 2.5, height(GX + 2.5, GZ + 5.5), GZ + 5.5], height: 0.4 }));
  const gy = height(GX, GZ);
  const cameras = {
    hero:    { pos: [-3, 1.5, 13], look: [12, 2.4, -16], fov: 46 },                         // green plots, channel, palms, silos beyond
    fields:  { pos: [-4.5, 0.9, 10.5], look: [-4, 0.5, 0], fov: 40 },
    granary: { pos: [GX - 6, gy + 1.7, GZ + 8], look: [GX - 2, gy + 3, GZ - 4.5], fov: 46 },
    sacks:   { pos: [GX - 2.4, gy + 1.2, GZ + 6.2], look: [GX - 2.4, gy + 0.5, GZ + 3.2], fov: 40 },
    high:    { pos: [-30, 32, 40], look: [6, 0, -16], fov: 42 },
  };
  const slots = { scribe: [GX + 4, gy, GZ + 5.7, Math.PI], worker_1: [GX - 3, gy, GZ + 4.4, 0.2], farmer: [-4, 0, 4.5, 1.2], steward: [GX - 6, gy, GZ + 2, -1.2] };
  return finish(S, 'nile_fields_granary', cameras, { crops, silos, sacks, table, nile, terrain: T, sun: S.atmo.sun }, slots);
}

// PALACE HALL: a long hall of painted lotus columns on a polished stone floor, linen hangings, braziers,
// and the throne dais seen from afar at the end. time: 'day' (clerestory shafts) | 'night' (braziers)
export async function palace_hall({ time = 'day', seed = 101 } = {}) {
  const night = time === 'night';
  const S = await base('palace_hall', 'golden', { hdri: 'plains_sunset', envI: night ? 0.08 : 0.3, sun: { elev: night ? -10 : 52, azim: 70 }, sunI: night ? 0 : 6, sunColor: 0xfff0d0,
    shadowBox: 22, focus: [0, 2, -16], fog: 0, exposure: night ? 1.4 : 0.95, hemi: night ? 0.02 : 0.08, background: 'sky' });
  const [plaster, wash, dpl, linen] = await Promise.all([MATS.plaster(), MATS.whitewash(), MATS.darkPlanks(), MATS.linen()]);
  const HW = 14, HL = 40, HH = 9;
  add(S, await slabFloor({ w: HW, d: HL, size: 1.6, seed, rough: 0.22, tint: 0xeee2cc, origin: [0, 0, -HL / 2 + 4] }));
  // side walls with painted bands, a roof with clerestory gaps
  for (const s of [-1, 1]) { add(S, W.rbox(0.8, HH, HL, wash, { r: 0.06, seg: 3 }), s * (HW / 2 + 0.4), 0, -HL / 2 + 4);
    for (const [y, c] of [[1.2, 0x8a3a22], [1.45, 0xb8892e], [1.6, 0x2a4a6a]]) add(S, W.rbox(0.02, 0.14, HL, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }), { r: 0.004 }), s * (HW / 2 - 0.01), y, -HL / 2 + 4); }
  add(S, W.rbox(HW + 2, 0.8, 1, wash, { r: 0.05 }), 0, HH - 0.2, -HL + 4.5);
  for (let i = 0; i < 8; i++) add(S, W.rbox(HW + 1.6, 0.5, 3.2, dpl, { r: 0.05 }), 0, HH, 2 - i * 5.1);   // roof beams with gaps between
  add(S, W.rbox(HW + 1.6, HH + 0.2, 0.8, wash, { r: 0.05 }), 0, 0, -HL + 4.4);                             // back wall
  // two rows of lotus columns (one instanced geometry, painted)
  const colMat = plaster.clone(); colMat.vertexColors = true;
  const proto = W.column(colMat, { h: HH - 0.3, r: 0.6, cap: 'lotus', flutes: 10 }), N = 7;
  const im = new THREE.InstancedMesh(proto.geometry, colMat, N * 2), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) { Q.setFromAxisAngle(V3(0, 1, 0), (i * 1.3 + s) % 6.28); Mx.compose(V3(s * 3.6, 0, 1 - i * 4.6), Q, V3(1, 1, 1)); im.setMatrixAt(i * 2 + (s > 0), Mx); }
  im.castShadow = im.receiveShadow = true; add(S, im);
  // linen hangings between the outer wall and the columns
  for (let i = 0; i < N - 1; i++) for (const s of [-1, 1]) { const c = W.cloth(1.6, 5.5, linen, { segW: 32, segH: 64, folds: 0.04, seed: i, sag: (u, v) => 0.12 * Math.sin(u * 14 + i) }); c.position.set(s * 5.6, 5.4, -1.3 - i * 4.6); c.rotation.y = s * Math.PI / 2; add(S, c); }
  // the dais: three steps, the throne, braziers either side
  const stone = await MATS.rustic(), DZ = -HL + 7.5;
  for (let k = 0; k < 3; k++) add(S, W.rbox(7 - k * 1.4, 0.32, 4.6 - k * 0.9, stone, { r: 0.04, seg: 3 }), 0, k * 0.32, DZ - k * 0.3);
  const gold = W.goldMat(), throne = new THREE.Group();
  throne.add(W.rbox(1.3, 0.55, 1.0, dpl, { r: 0.05 })); const back = W.rbox(1.3, 1.6, 0.16, dpl, { r: 0.05 }); back.position.set(0, 0.55, -0.42); throne.add(back);
  for (const s of [-1, 1]) { const arm = W.rbox(0.12, 0.42, 0.9, gold, { r: 0.04 }); arm.position.set(s * 0.6, 0.55, 0.02); throne.add(arm); }
  const crest = W.rbox(1.45, 0.14, 0.2, gold, { r: 0.05 }); crest.position.set(0, 2.15, -0.42); throne.add(crest);
  const cushion = W.rbox(1.1, 0.12, 0.85, (await MATS.linen()), { r: 0.05 }); cushion.position.y = 0.55; throne.add(cushion);
  throne.position.set(0, 0.96, DZ - 1.0); add(S, W.shadows(throne));
  const braziers = [];
  for (const x of [-2.8, 2.8]) { const b = await brazier(S, { seed: x > 0 ? 2 : 5, light: night ? 18 : 6 }); add(S, b, x, 0.96, DZ - 0.2); braziers.push(b); }
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const b = await brazier(S, { seed: 10 + i * 2 + s, light: night ? 10 : 0 }); add(S, b, s * 2.2, 0, -3 - i * 9.2); braziers.push(b); }
  add(S, await W.prop('brass_vase_01', { pos: [3.4, 0.96, DZ + 1.2], height: 0.9 }));
  add(S, await W.prop('brass_vase_01', { pos: [-3.4, 0.96, DZ + 1.2], height: 0.9, ry: 2 }));
  // clerestory shafts
  const shafts = [];
  if (!night) for (let i = 0; i < 6; i++) { const z = -0.55 - i * 5.1; const sh = W.lightShaft({ from: [-2 + (i % 2) * 0.5, HH - 0.2, z], to: [-0.8, 0.05, z - 2.4], r0: 0.7, r1: 1.4, op: 0.05 }); add(S, sh); shafts.push(sh); }
  S.updaters.push((t, o) => shafts.forEach((s) => s.userData.update(t, o.shaft ?? 1)));
  const cameras = {
    hero:    { pos: [0.6, 1.5, 5.5], look: [0, 2.3, DZ], fov: 40 },                       // down the colonnade to the dais, seen from afar
    dais:    { pos: [1.6, 1.7, DZ + 6.5], look: [0, 1.8, DZ - 1], fov: 40 },
    throne:  { pos: [0.9, 1.6, DZ + 1.8], look: [0, 1.4, DZ - 1], fov: 38 },
    columns: { pos: [-5.2, 1.2, -6], look: [3.6, 6, -16], fov: 50 },
    low:     { pos: [0.4, 0.25, -6], look: [0, 1.4, DZ], fov: 42 },
  };
  const slots = { king_seat: [0, 0.96 + 0.55, DZ - 1.0, 0], young_man_before_dais: [0, 0, DZ + 4.5, Math.PI], adviser_1: [-2.6, 0, DZ + 6, 2.6], adviser_2: [2.4, 0, DZ + 6.5, -2.6], scribe_1: [-4.8, 0, DZ + 3, 1.6] };
  return finish(S, 'palace_hall', cameras, { throne, braziers, columns: im, shafts, dais: DZ }, slots, { bloom: 0.26, bloomThreshold: 0.86 });
}

// REUNION: the city gate (two battered mud-brick pylons, great wooden gate open) onto an open court with
// a colonnade, palms and a dais; golden hour with the first stars. time: 'golden' | 'dusk' | 'day'
export async function reunion({ time = 'golden', seed = 111, stars = 0.6 } = {}) {
  const S = await base('reunion', time === 'golden' ? 'dusk' : time, { sun: { azim: 150 }, shadowBox: 36, focus: [0, 0, -8], starsOn: time === 'day' ? 0 : stars, exposure: 0.8 });
  const n = W.noise2(seed), height = (x, z) => 0.06 * n(x / 4, z / 4) + 6 * sstep(80, 200, Math.hypot(x, z)) * W.fbm(n, x / 80, z / 80, 4);
  const mt = await W.terrainMaterial([{ name: 'dry_ground_rocks', tile: 3 }, { name: 'sand_01', tile: 3.5, tint: 0xf0d8b0 }, { name: 'brown_mud_dry', tile: 2.6 }], { macro: 0.2 });
  const T = W.terrain({ size: 900, seg: 380, height, material: mt, weights: (x, z) => [1, sstep(20, 60, Math.hypot(x, z)) * 1.4, 0.4 * (1 + n(x / 6, z / 6))] });
  add(S, T.mesh);
  const [mud, wash, dpl, iron] = await Promise.all([MATS.mudPlaster(), MATS.whitewash(), MATS.darkPlanks(), Promise.resolve(W.ironMat())]);
  // the court floor
  add(S, await slabFloor({ w: 26, d: 30, size: 1.5, seed, rough: 0.5, tint: 0xead8bc, origin: [0, 0.08, -13] }));
  // the gate: two pylons with battered faces, lintel, two open gate leaves
  const GZ = 2.4;
  const pylon = (s) => { const g = new THREE.BoxGeometry(5.5, 11, 3.6, 8, 24, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = (p.getY(i) + 5.5) / 11; p.setX(i, p.getX(i) * (1 - 0.14 * y)); p.setZ(i, p.getZ(i) * (1 - 0.12 * y)); }
    g.translate(0, 5.5, 0); g.computeVertexNormals(); W.boxUV(g); const m = W.shadows(new THREE.Mesh(g, mud)); m.position.set(s * 5.2, 0, GZ); return m; };
  const pyl = [pylon(-1), pylon(1)]; pyl.forEach((p) => add(S, p));
  for (const s of [-1, 1]) for (const [y, c] of [[8.6, 0x2a4a6a], [8.9, 0xb8892e], [9.15, 0x8a3a22]]) add(S, W.rbox(4.3, 0.18, 0.02, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }), { r: 0.004 }), s * 5.2, y, GZ - 1.5);
  add(S, W.rbox(5.2, 1.2, 3.0, mud, { r: 0.1 }), 0, 7.2, GZ);
  const leaves = [];
  for (const s of [-1, 1]) { const D = W.door(dpl, iron, { w: 2.3, h: 7.0, t: 0.18, frame: 0.001 }); D.group.position.set(s * (2.4 - 1.15), 0, GZ - 1.75); D.group.scale.x = -s; D.leaf.rotation.y = 1.3; add(S, D.group); leaves.push(D); }
  // colonnade along the left side of the court, a wall on the right
  const colMat = (await MATS.plaster()).clone(); colMat.vertexColors = true;
  const proto = W.column(colMat, { h: 6, r: 0.42, cap: 'papyrus' }), im = new THREE.InstancedMesh(proto.geometry, colMat, 6), M = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) im.setMatrixAt(i, M.makeTranslation(-9.5, 0.08, -2 - i * 4.4)); im.castShadow = im.receiveShadow = true; add(S, im);
  add(S, W.rbox(1.6, 0.7, 26, wash, { r: 0.06 }), -10.2, 6.0, -13);
  add(S, W.rbox(0.8, 7, 30, mud, { r: 0.08 }), -12.6, 0, -13);
  add(S, W.rbox(0.8, 6, 30, mud, { r: 0.08 }), 12.6, 0, -13);
  add(S, W.rbox(26, 7.5, 0.8, wash, { r: 0.08 }), 0, 0, -28.4);
  // the dais at the far end with the throne
  const stone = await MATS.rustic(), DZ = -24;
  for (let k = 0; k < 3; k++) add(S, W.rbox(8 - k * 1.6, 0.3, 4.4 - k * 0.9, stone, { r: 0.04, seg: 3 }), 0, 0.08 + k * 0.3, DZ - k * 0.3);
  const throne = new THREE.Group(); throne.add(W.rbox(1.3, 0.55, 1.0, dpl, { r: 0.05 })); const tb = W.rbox(1.3, 1.6, 0.16, dpl, { r: 0.05 }); tb.position.set(0, 0.55, -0.42); throne.add(tb);
  const gold = W.goldMat(); for (const s of [-1, 1]) { const a = W.rbox(0.12, 0.42, 0.9, gold, { r: 0.04 }); a.position.set(s * 0.6, 0.55, 0.02); throne.add(a); }
  throne.position.set(0, 0.98, DZ - 1); add(S, W.shadows(throne));
  // palms in the court corners, travellers' sacks by the gate (empty, folded) and bundles
  for (const [x, z, s] of [[8.5, -6, 1], [9.5, -19, 2], [-6.5, -22, 3]]) add(S, W.datePalm({ seed: seed + s, height: 8 + s }), x, 0.08, z);
  const hs = await MATS.hessian(), sacks = [];
  for (let k = 0; k < 5; k++) { const sk = W.sack(hs, { w: 0.5, h: 0.45, seed: k + 40 }); sk.position.set(2.5 + k * 0.55, 0.08, -2 + (k % 2) * 0.4); sk.rotation.y = k; sk.scale.y = 0.55; add(S, sk); sacks.push(sk); }
  const bundles = []; for (const [x, z] of [[-2.8, -1.4], [-3.6, -0.8]]) { const b = await bundle({ w: 0.9, h: 0.45, d: 0.55 }); b.position.set(x, 0.08, z); b.rotation.y = x; add(S, b); bundles.push(b); }
  const cameras = {
    hero:  { pos: [1.2, 1.3, -14], look: [0, 4.6, GZ + 4], fov: 50 },                       // from the court to the gate, sunset + first stars above
    gate:  { pos: [0.5, 1.6, 14], look: [0, 2.5, -12], fov: 44 },                           // arriving through the gate toward the dais
    dais:  { pos: [-1.4, 1.2, DZ + 9], look: [0, 1.6, DZ - 1], fov: 40 },
    floor: { pos: [0.6, 0.25, -12], look: [0, 0.4, DZ + 2], fov: 44 },
    sky:   { pos: [0, 1.4, -10], look: [0, 30, 20], fov: 60 },
  };
  const slots = { family_1: [-1.2, 0.08, -6, Math.PI], family_2: [0, 0.08, -5.4, Math.PI], family_3: [1.2, 0.08, -6, Math.PI], yusuf_dais: [0, 0.98, DZ + 1.2, 0], brothers_kneel: [0, 0.08, DZ + 4, Math.PI] };
  return finish(S, 'reunion', cameras, { gate: leaves, pylons: pyl, throne, sacks, bundles, terrain: T, sky: S.atmo.sky, stars: S.atmo.stars, sun: S.atmo.sun }, slots);
}

// all builders by name (for the gallery and lesson films)
export const SETS = { canaan_hills, the_well, caravan_route, egypt_market, ministers_house, prison, nile_fields_granary, palace_hall, reunion };
