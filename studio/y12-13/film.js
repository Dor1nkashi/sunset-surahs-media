// y12-13 "He Cried Until His Eyes Turned White, and He Never Gave Up" (Yusuf 12:86-87). The Canaan house years
// later: a reed awning by the house wall, a worn mat, the old staff, a water jar under a dripping waterskin, an olive
// sapling that grows through the years. One gap in the awning lets a patch of sun in; the sun is always placed so the
// patch lands where the story needs it, and it crawls toward the seated father until it rests on his open hand.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as GR from '../lib_shared/growth.js';
import * as K from '../y12-12/kit.js';
const { THREE, clamp, lerp, sstep } = W;
const V3 = K.V3, D = 34.17;
const DBG = {};
const OBJ = {};

let SET, ST, CAP, hAt, h0, P = {}, TREE, SHAFT, MOTES, JAR = {}, SKIN, DROPS = [], SHOTS;
const pr = (t, a, b) => clamp((t - a) / (b - a));
const sm = (t, a, b) => K.easeIO(pr(t, a, b));
const C = (pos, look, fov, roll = 0) => ({ pos, look, fov, roll });

// key places (x, z) in the courtyard; y from h0
const GAP = [3.55, 2.36, 2.05];               // the hole in the reed awning (world, y above h0)
const YQ = [3.0, 0.85];                      // Yaʿqūb's bench
const STAFF = [[3.25, -0.33], [3.42, 1.72, -0.55]];
const JARP = [1.55, -0.3];
const TREEP = [0.9, 1.95];

// ------------------------------------------------------------------ sun: always aimed through the awning gap at a target
const staffMid = () => V3(3.33, h0 + 1.0, -0.44);
const T1 = () => V3(4.25, h0, 2.75), T2 = () => V3(3.3, h0, 1.75);
function sunTarget(t) {
  if (t < 3.97) return staffMid();
  if (t < 6.73) {                                     // time-lapse: three days race across wall and floor
    const ph = pr(t, 3.97, 6.73) * 3, a = (ph % 1) * Math.PI;
    return V3(2.2 + 1.9 * (ph % 1), h0 + Math.max(0, 1.4 * Math.sin(a) - 0.2), -0.5 + 2.6 * Math.sin(a * 0.5) ** 2);
  }
  const hand = P.yq ? K.handPos(P.yq, 'Right').add(V3(0, 0.03, 0)) : T2();
  if (t < 18.9) return T1().lerp(T2(), 0.15 * sm(t, 6.73, 18.9));
  if (t < 30.58) return T1().lerp(T2(), 0.15 + 0.85 * sm(t, 18.9, 30.58));
  return T2().lerp(hand, sm(t, 30.58, 33.2));
}
function aimSun(t) {
  const g = V3(GAP[0], h0 + GAP[1], GAP[2]), d = g.clone().sub(sunTarget(t)).normalize();
  if (d.y < 0.2) d.y = 0.2, d.normalize();
  const L = SET.atmo.sun, f = V3(2.5, h0, 0.8);
  L.position.copy(f).addScaledVector(d, 200); L.target.position.copy(f); L.target.updateMatrixWorld();
  L.shadow.camera.left = L.shadow.camera.bottom = -9; L.shadow.camera.right = L.shadow.camera.top = 9; L.shadow.camera.updateProjectionMatrix();
  return { g, d };
}

async function build() {
  SET = await canaan_hills({ time: 'day', olives: 12 });
  ST = W.stage(SET); hAt = SET.props.terrain.heightAt; h0 = SET.props.house.position.y; OBJ.n0 = SET.group.children.length;
  // the HDRI's own sun lights everything without shadows: turn the image light down so the awning's shade (and the patch) read
  SET.scene.environmentIntensity *= 0.32; SET.atmo.sun.intensity = 5.2; if (SET.atmo.hemi) SET.atmo.hemi.intensity *= 0.4;
  for (const c of SET.group.children) if (/^scatter:|ground_cover/.test(c.name)) K.clearScatter(c, 1.0, 1.2, 8.5);
  const g = SET.group, pl = await K.mats.planks();
  // the packed-earth courtyard floor (a PBR ground laid over the terrain: the terrain shader goes black from cameras under the awning)
  { const fm = await W.pbr('brown_mud_dry', { tile: 2.2, res: 2048, tint: 0xe8d6c0 }), fw = 16, fd = 14, cx = 1.0, cz = 2.0;
    const fg = new THREE.PlaneGeometry(fw, fd, 160, 140).rotateX(-Math.PI / 2), fp = fg.attributes.position, nn = W.noise2(19);
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i) + cx, z = fp.getZ(i) + cz, e = Math.min(fw / 2 - Math.abs(x - cx), fd / 2 - Math.abs(z - cz));
      fp.setXYZ(i, x, hAt(x, z) + 0.018 + 0.006 * nn(x * 3, z * 3) - 0.08 * (1 - sstep(0, 1.2, e)), z); }
    fg.computeVertexNormals(); W.boxUV(fg);
    const fl = new THREE.Mesh(fg, fm); fl.receiveShadow = true; g.add(fl); }
  // the reed awning: four posts, two beams, a reed mat with one gap
  const reed = await W.pbr('reed_roof_03', { tile: 1.4, res: 1024, side: THREE.DoubleSide });
  for (const [x, z] of [[1.25, 3.15], [4.75, 3.15], [1.25, -0.5], [4.75, -0.5]]) { const p = W.rbox(0.11, 2.42, 0.11, pl, { r: 0.02 }); p.position.set(x, h0, z); g.add(W.shadows(p)); }
  for (const z of [3.15, -0.5]) { const b = W.rbox(3.75, 0.1, 0.12, pl, { r: 0.02 }); b.position.set(3.0, h0 + 2.38, z); g.add(W.shadows(b)); }
  const sh = new THREE.Shape(); sh.moveTo(-1.85, -1.9); sh.lineTo(1.85, -1.9); sh.lineTo(1.85, 1.9); sh.lineTo(-1.85, 1.9); sh.lineTo(-1.85, -1.9);
  const hole = new THREE.Path(), hx = GAP[0] - 3.0, hz = GAP[2] - 1.32; hole.moveTo(hx - 0.2, hz - 0.16); hole.lineTo(hx + 0.17, hz - 0.2); hole.lineTo(hx + 0.21, hz + 0.18); hole.lineTo(hx - 0.16, hz + 0.21); hole.lineTo(hx - 0.2, hz - 0.16); sh.holes.push(hole);
  const mg = new THREE.ShapeGeometry(sh, 24); mg.rotateX(Math.PI / 2); W.boxUV(mg);
  const mat = new THREE.Mesh(mg, reed); mat.position.set(3.0, h0 + 2.46, 1.32); g.add(W.shadows(mat)); OBJ.mat = mat;
  // the bench and the worn mat
  const bench = W.rbox(1.1, 0.42, 0.38, pl, { r: 0.03 }); bench.position.set(YQ[0], h0, YQ[1] - 0.12); g.add(W.shadows(bench));
  const mm = await K.mats.dyed(0x8a5a3a); const rug = W.cloth(1.3, 0.85, mm, { segW: 60, segH: 40, folds: 0.004, seed: 4 }); rug.rotation.x = -Math.PI / 2; rug.position.set(YQ[0] + 0.1, h0 + 0.012, YQ[1] + 0.85); g.add(rug); OBJ.rug = rug;
  // the old staff leaning on the wall
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.95, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.75 }));
  { const a = V3(STAFF[0][0], h0 + 0.02, STAFF[0][1]), b = V3(STAFF[1][0], h0 + STAFF[1][1], STAFF[1][2]); st.position.copy(a).lerp(b, 0.5); st.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.024, 12, 32, Math.PI), st.material); crook.position.set(0, 0.97, 0.07); crook.rotation.y = Math.PI / 2; st.add(crook); }
  g.add(W.shadows(st));
  // the water jar (open, with water that rises) and the waterskin hanging from a roof-beam end
  const clay = (await W.pbr('clay_plaster', { tile: 0.5, tint: 0xb06a44, res: 1024, normal: 1.4 })).clone();
  const prof = [[0.001, 0], [0.12, 0], [0.2, 0.08], [0.24, 0.24], [0.22, 0.4], [0.14, 0.5], [0.12, 0.56], [0.14, 0.6], [0.125, 0.61], [0.11, 0.58], [0.12, 0.52], [0.19, 0.42], [0.21, 0.24], [0.17, 0.09], [0.001, 0.04]];
  const jar = new THREE.Mesh(W.boxUV(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64)), clay); jar.position.set(JARP[0], h0, JARP[1]); g.add(W.shadows(jar));
  JAR.top = h0 + 0.58; JAR.pos = jar.position;
  JAR.water = W.water(new THREE.CircleGeometry(0.12, 48).rotateX(-Math.PI / 2), { color: 0x24343a, rough: 0.04, tile: 0.4, flow: [0.0, 0.0] }); JAR.water.position.set(JARP[0], h0 + 0.5, JARP[1]); g.add(JAR.water);
  JAR.ringTex = G.canvasTexture(256, 256);
  JAR.rings = new THREE.Mesh(new THREE.CircleGeometry(0.118, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: JAR.ringTex, transparent: true, depthWrite: false, opacity: 0.8 }));
  JAR.rings.position.copy(JAR.water.position); g.add(JAR.rings); OBJ.rings = JAR.rings; OBJ.water = JAR.water; OBJ.jar = jar;
  const hs = await K.mats.dyed(0x5a3a26);
  SKIN = W.sack(hs, { w: 0.34, h: 0.44, seed: 9, tie: true }); SKIN.rotation.z = Math.PI; SKIN.position.set(JARP[0], h0 + 2.2, JARP[1] - 0.02); g.add(SKIN);
  g.add(W.rope([V3(JARP[0], h0 + 2.42, JARP[1] - 0.06), V3(JARP[0], h0 + 2.36, JARP[1] - 0.03), V3(JARP[0], h0 + 2.24, JARP[1] - 0.02)], 0.008));
  const dm = new THREE.MeshStandardMaterial({ color: 0xbfd6de, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.85, envMapIntensity: 2.5 });
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), dm); d.scale.y = 1.5; g.add(d); DROPS.push(d); }
  // the olive sapling (growth.js): grows through the years in the time-lapse
  TREE = GR.makeTree(THREE, { species: 'olive', seed: 13 }); TREE.object3d.position.set(TREEP[0], hAt(...TREEP) - 0.02, TREEP[1]); g.add(TREE.object3d);
  const pit = W.contactShadow(0.9, 0.9, { op: 0.35 }); pit.position.set(TREEP[0], hAt(...TREEP) + 0.01, TREEP[1]); g.add(pit);
  // the light shaft through the gap + dust motes in it
  SHAFT = W.lightShaft({ from: [GAP[0], h0 + GAP[1], GAP[2]], to: [3.6, h0, 1.9], r0: 0.18, r1: 0.26, op: 0.07, color: 0xffe2b0 }); g.add(SHAFT);
  const N = 260, mg2 = new THREE.SphereGeometry(0.0022, 6, 4), mm2 = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  MOTES = new THREE.InstancedMesh(mg2, mm2, N); MOTES.frustumCulled = false; g.add(MOTES);
  // people: Yaʿqūb (elder) and five of his sons
  const PE = await K.people();
  P.yq = PE.make({ kind: 'elder', outfit: 'traveller', palette: { robe: '#a8987c', wrap: '#d8ccb4', cloak: '#8e7d62', sash: '#6a4a2a', trousers: '#9c8a6c', shemagh: '#b8892e' }, beard: 'grey', headwear: 'keffiyeh', seed: 3, detail: 1 });
  g.add(P.yq.object3d);
  const bro = [['rust', 'full', 'keffiyeh'], ['olive', 'full', 'turban'], ['night', 'full', 'wrap'], ['earth', 'short', 'keffiyeh'], ['sand', 'short', 'turban']];
  P.bro = bro.map(([pal, beard, hw], i) => PE.make({ kind: 'man', outfit: 'traveller', palette: pal, beard, headwear: hw, seed: 80 + i * 5, detail: 0.6 }));
  P.bro.forEach((b) => g.add(b.object3d));
}

// ------------------------------------------------------------------ per-frame state
function yaqub(t, { hand = null, fold = false, open = null, face = 0 } = {}) {
  const p = P.yq; p.object3d.visible = true;
  K.place(p, YQ[0], h0, YQ[1], 0); p.setPose('stand', t);
  K.sit(p, 0.42, { lean: 16 }); K.tilt(p, 'Neck', 10, 0, 0); K.tilt(p, 'Head', 8, 0, 0);
  const hs = (p.height / 1.8);
  // default: hands resting on the knees
  const knee = (sx) => K.onBody(p, sx * 0.14, 0.56 * hs, 0.36);
  K.reach(p, 'Left', knee(1), K.onBody(p, 0.6, 0.6, -0.4)); K.reach(p, 'Right', knee(-1).add(V3(0, 0, 0)), K.onBody(p, -0.6, 0.6, -0.4));
  if (fold) { K.reach(p, 'Left', K.onBody(p, 0.03, 0.6 * hs, 0.3), K.onBody(p, 0.6, 0.6, -0.4)); K.reach(p, 'Right', K.onBody(p, -0.03, 0.62 * hs, 0.32), K.onBody(p, -0.6, 0.6, -0.4)); }
  if (face > 0) K.reach(p, 'Right', K.onBody(p, -0.04, 1.32 * hs, 0.14), K.onBody(p, -0.6, 0.5, -0.3), face);
  if (hand) K.reach(p, 'Right', hand, K.onBody(p, -0.6, 0.6, -0.4));
  if (open !== null) { K.tilt(p, 'RightHand', 0, -70 * open, 0); K.fingers(p, 'Right', 1 - open); }
}
const hideAll = () => { P.yq.object3d.visible = false; P.bro.forEach((b) => (b.object3d.visible = false)); };
function sons(t, list) { list.forEach(([x, z, yaw, clip, o], i) => { const b = P.bro[i]; b.object3d.visible = true; K.place(b, x, hAt(x, z), z, yaw); b.setPose(clip, t, { offset: i * 0.6, ...(o || {}) }); }); }
function growth(t) { const gg = 0.07 + 0.43 * sm(t, 4.0, 6.7); TREE.setGrowth(gg); }
function drops(t) {
  const per = 0.9, top = h0 + 1.78, bot = JAR.top - 0.08, fall = Math.sqrt(2 * (top - bot) / 9.81), rings = [];
  for (let i = 0; i < 3; i++) {
    const k = Math.floor(t / per) - i, t0 = k * per, a = t - t0, d = DROPS[i];
    if (a < 0.35) { d.visible = true; const s = 0.4 + 0.6 * a / 0.35; d.scale.set(s, s * 1.5, s); d.position.set(JARP[0], top + 0.01 - 0.01 * s, JARP[1] - 0.02); }
    else if (a < 0.35 + fall) { const f = a - 0.35; d.visible = true; d.scale.set(1, 1.5 + 2 * f, 1); d.position.set(JARP[0], top - 4.905 * f * f, JARP[1] - 0.02); }
    else { d.visible = false; rings.push(a - 0.35 - fall); }
  }
  // water level rises slowly over the film (the jar fills, drop by drop)
  const lvl = JAR.top - 0.2 + 0.1 * pr(t, 0, D); JAR.water.position.y = lvl; JAR.rings.position.y = lvl + 0.001;
  JAR.ringTex.draw((c, w, h) => { for (const r of rings) { const rr = r * 260, op = Math.max(0, 1 - r / 0.8); if (op <= 0) continue; c.strokeStyle = `rgba(255,250,240,${0.55 * op})`; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, rr % (w / 2), 0, 6.28); c.stroke(); } });
}
function dust(t, g, d, tgt) {
  const M4 = new THREE.Matrix4(), axis = tgt.clone().sub(g), len = axis.length(), n = W.noise2(5);
  const u = axis.clone().normalize(), a = V3(1, 0, 0).cross(u).normalize(), b = u.clone().cross(a);
  for (let i = 0; i < MOTES.count; i++) {
    const h = M.hash01(i, 3), s = (h + t * 0.012 * (0.5 + M.hash01(i, 7))) % 1, r = 0.2 * Math.sqrt(M.hash01(i, 11)), ang = M.hash01(i, 13) * 6.28 + 0.3 * n(t * 0.2, i);
    const p = g.clone().addScaledVector(u, s * len).addScaledVector(a, Math.cos(ang) * r).addScaledVector(b, Math.sin(ang) * r).add(V3(0.02 * n(t * 0.3 + i, 1), 0.02 * n(i, t * 0.25), 0));
    const sc = 0.6 + 1.2 * M.hash01(i, 17); M4.makeScale(sc, sc, sc).setPosition(p); MOTES.setMatrixAt(i, M4);
  }
  MOTES.instanceMatrix.needsUpdate = true;
}

function shots() {
  const y = h0, sm0 = staffMid(), jarTop = V3(JARP[0], JAR.top, JARP[1]);
  return [
    // 1 the old staff against the wall in the morning shaft; a slow lateral drift across the mat
    { t0: 0, t1: 2.26, a: C([3.95, y + 0.95, 0.75], [sm0.x, sm0.y + 0.05, sm0.z], 34), b: C([3.55, y + 0.92, 0.85], [sm0.x - 0.05, sm0.y + 0.05, sm0.z], 33), s(t) { yaqub(t); } },
    // 2 low behind the seated father: he lifts the edge of his head-cloth to his face; shoulders still
    { t0: 2.26, t1: 3.97, a: C([YQ[0] + 0.35, y + 0.72, YQ[1] - 1.05], [YQ[0], y + 0.95, YQ[1] + 0.6], 40), b: C([YQ[0] + 0.3, y + 0.72, YQ[1] - 0.9], [YQ[0], y + 0.95, YQ[1] + 0.6], 38), s(t) { yaqub(t, { face: sm(t, 2.4, 3.4) }); } },
    // 3 the years: locked wide; the patch races across wall and floor, the sapling grows, the father never moves
    { t0: 3.97, t1: 6.73, a: C([-1.2, y + 1.75, 3.6], [2.4, y + 0.9, 0.4], 50), b: null, s(t) { yaqub(t); } },
    // 4 the sons at the gate, one with a raised arm (seen past the father's shoulder)
    { t0: 6.73, t1: 8.47, a: C([YQ[0] + 0.45, y + 1.15, YQ[1] - 0.7], [0.4, y + 1.3, 4.6], 40), b: C([YQ[0] + 0.42, y + 1.15, YQ[1] - 0.62], [0.4, y + 1.3, 4.6], 39), s(t) {
      yaqub(t); sons(t, [[-0.3, 3.9, Math.PI + 0.3, 'stand'], [0.5, 4.2, Math.PI - 0.1, 'agree'], [1.3, 4.0, Math.PI - 0.4, 'headShake'], [-1.1, 4.4, Math.PI + 0.5, 'stand'], [0.1, 5.0, Math.PI, 'stand']]);
      const b = P.bro[1]; K.reach(b, 'Right', K.onBody(b, -0.25, 1.95, 0.45), K.onBody(b, -0.9, 1.0, -0.4), sm(t, 6.8, 7.4));
    } },
    // 5 the father lifts one hand slowly
    { t0: 8.47, t1: 9.48, a: C([YQ[0] - 0.55, y + 0.95, YQ[1] - 0.55], [YQ[0] - 0.1, y + 0.85, YQ[1] + 0.35], 36), b: C([YQ[0] - 0.5, y + 0.95, YQ[1] - 0.48], [YQ[0] - 0.1, y + 0.88, YQ[1] + 0.35], 35), s(t) {
      const p = P.yq; yaqub(t); const e = sm(t, 8.47, 9.4); K.reach(p, 'Right', K.onBody(p, -0.16, 0.56 + 0.5 * e, 0.36 + 0.12 * e), K.onBody(p, -0.6, 0.6, -0.4));
    } },
    // 6 close on the folded hands in the lap
    { t0: 9.48, t1: 12.81, cam: (t) => { const p = P.yq, hc = K.handPos(p, 'Left').lerp(K.handPos(p, 'Right'), 0.5), k = 1 - 0.15 * sm(t, 9.48, 12.81);
      return C(hc.clone().add(V3(0.62 * k, 0.52 * k, -0.2)).toArray(), hc.toArray(), 34); }, s(t) { yaqub(t, { fold: true }); } },
    // 7 up from his hands to the open sky (his gaze), a cloud drifts
    { t0: 12.81, t1: 14.14, a: C([YQ[0] + 0.4, y + 1.1, YQ[1] + 3.0], [YQ[0], y + 0.7, YQ[1] + 0.4], 40), b: C([YQ[0] + 0.4, y + 1.1, YQ[1] + 3.0], [YQ[0] + 0.6, y + 9, YQ[1] + 9], 46), s(t) { yaqub(t, { fold: true }); } },
    // 8 dust lifting through the shaft over the mat, the edge of his cloak in the light
    { t0: 14.14, t1: 16.37, a: C([YQ[0] + 1.25, y + 0.55, YQ[1] + 1.6], [YQ[0] + 0.25, y + 0.45, YQ[1] + 0.6], 34), b: C([YQ[0] + 1.15, y + 0.6, YQ[1] + 1.5], [YQ[0] + 0.25, y + 0.5, YQ[1] + 0.6], 33), s(t) { yaqub(t, { fold: true }); } },
    // 9 the sons leave through the gate and down the road toward the horizon
    { t0: 16.37, t1: 18.9, a: C([YQ[0] - 0.2, y + 1.3, YQ[1] - 0.4], [-0.2, y + 1.0, 8], 42), b: C([YQ[0] - 0.2, y + 1.3, YQ[1] - 0.45], [-0.2, y + 1.0, 8], 41), s(t) {
      yaqub(t, { fold: true });
      const w = (i) => Math.max(0, t - 16.37 - i * 0.25) * 1.2;
      sons(t, [[-0.3, 4.2 + w(0), 0.05, 'walk'], [0.5, 4.5 + w(1), -0.05, 'walk'], [1.2, 4.1 + w(2), 0, 'walk'], [-1.0, 4.6 + w(3), 0.1, 'walk'], [0.2, 5.3 + w(4), 0, 'walk']]);
    } },
    // 10 the patch of sun crawls across the stones toward him
    { t0: 18.9, t1: 21.89, a: C([4.6, y + 0.75, 3.0], [3.6, y + 0.05, 1.7], 44), b: C([4.5, y + 0.72, 2.85], [3.5, y + 0.08, 1.6], 42), s(t) { yaqub(t, { fold: true }); } },
    // 11 olive leaves turn in the rising wind (the old olive by the yard)
    { t0: 21.89, t1: 24.7, a: C([7.4, y + 2.0, 5.6], [9.5, hAt(9.5, 3.5) + 4.2, 3.5], 40), b: C([7.45, y + 2.0, 5.55], [9.5, hAt(9.5, 3.5) + 4.3, 3.5], 39.5), s(t) { yaqub(t, { fold: true }); } },
    // 12 the water jar fills, drop by drop, from the hanging waterskin
    { t0: 24.7, t1: 26.94, a: C([JARP[0] + 0.85, JAR.top + 0.3, JARP[1] + 1.55], jarTop.clone().add(V3(0, 0.72, 0)).toArray(), 56), b: C([JARP[0] + 0.8, JAR.top + 0.3, JARP[1] + 1.45], jarTop.clone().add(V3(0, 0.7, 0)).toArray(), 54), s(t) { yaqub(t, { fold: true }); } },
    // 13 the staff in the light, slow push
    { t0: 26.94, t1: 28.9, a: C([3.7, y + 1.15, 0.9], [sm0.x, sm0.y + 0.2, sm0.z], 36), b: C([3.6, y + 1.12, 0.6], [sm0.x, sm0.y + 0.2, sm0.z], 32), s(t) { yaqub(t, { fold: false }); } },
    // 14 his hand opens slowly on his knee
    { t0: 28.9, t1: 30.58, cam: () => handCam(), s(t) { yaqub(t, { open: sm(t, 29.0, 30.4) }); } },
    // 15 the patch of sun reaches the open hand and rests on it (end, seal)
    { t0: 30.58, t1: D + 0.01, cam: () => handCam(1.15), s(t) { yaqub(t, { open: 1 }); } },
  ];
}
function handCam(k = 1) {
  const p = P.yq, h = K.handPos(p, 'Right');
  return C(h.clone().add(V3(-0.42 * k, 0.36 * k, 0.32 * k)).toArray(), h.clone().add(V3(0, -0.02, 0)).toArray(), 30);
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
    if (DBG.bisect) { const pts = [V3(-3.4, h0 + 1.7, 4.6), V3(2.45, h0 + 0.95, 0.3), V3(2.8, h0 + 1.3, 0.45)];
      console.error('h0', h0.toFixed(3), 'hy', pts.map((p) => hAt(p.x, p.z).toFixed(3)).join(','));
      SET.group.children.slice(0, OBJ.n0).forEach((o, i) => { const b = new THREE.Box3().setFromObject(o); const hit = pts.map((p) => b.containsPoint(p) ? 1 : 0).join('');
        console.error('child', i, o.name || o.type, o.isInstancedMesh ? 'inst' + o.count : '', hit, b.min.toArray().map((v) => v.toFixed(1)).join('/'), b.max.toArray().map((v) => v.toFixed(1)).join('/')); }); }
    ST.update(0, 0, {}); G.R.compile(ST.scene, ST.camera);
  },
  draw(ctx, u, t0, IMG) {
    const OVER = t0 >= 40, t = OVER ? t0 - 40 : t0;
    M.fill(ctx, '#000');
    hideAll(); growth(t); drops(t); TREE.setFruit?.(0); TREE.object3d.visible = !DBG.notree; SKIN.visible = !DBG.noskin; MOTES.visible = !DBG.nomotes;
    const s = K.shotAt(SHOTS, t);
    s.s(t);
    const { g, d } = aimSun(t), tgt = sunTarget(t);
    SHAFT.visible = !(t >= 3.97 && t < 6.73);
    { const L0 = V3(GAP[0], h0 + GAP[1], GAP[2]).distanceTo(V3(3.6, h0, 1.9)), dv = tgt.clone().sub(g);
      SHAFT.position.copy(g); SHAFT.quaternion.setFromUnitVectors(V3(0, -1, 0), dv.clone().normalize()); SHAFT.scale.set(1, dv.length() / L0, 1); SHAFT.userData.update(t, 1); }
    dust(t, g, d, tgt);
    MOTES.visible = SHAFT.visible;
    if (s.t0 === 12.81) SET.scene.backgroundRotation.y = SET.scene.environmentRotation.y + 0.04 * pr(t, 12.81, 14.14); else SET.scene.backgroundRotation.y = SET.scene.environmentRotation.y;
    let cam = s.cam ? s.cam(t) : K.camAt(s, t);
    if (DBG.bisect) { cam = SHOTS[2].a; const k = Math.floor(t), ch = SET.group.children, n0 = OBJ.n0, n1 = ch.length;
      ch.forEach((o, i) => { o.visible = true; });
      const T0 = ch[0]; OBJ.tm = OBJ.tm || T0.material; T0.material = OBJ.tm; T0.receiveShadow = true; SET.atmo.sun.castShadow = true; OBJ.mat.visible = true;
      if (k === 1) T0.material = OBJ.grey || (OBJ.grey = new THREE.MeshStandardMaterial({ color: 0x888070 }));
      if (k === 2) T0.receiveShadow = false;
      if (k === 3) SET.atmo.sun.castShadow = false;
      if (k === 4) OBJ.mat.visible = false;
      if (k === 5) cam = C([-1.7, h0 + 3.5, 3.3], [2.4, h0 + 0.9, 0.4], 50);
      if (k === 6) cam = C([-1.7, h0 + 0.6, 3.3], [2.4, h0 + 0.9, 0.4], 50);
      if (k === 7) cam = C([-6, h0 + 1.75, 8], [2.4, h0 + 0.9, 0.4], 50);
    }
    if (OVER) cam = C([3.0, h0 + 9, 4.5], [3.0, h0, 0.8], 50);
    G.renderSet(ctx, ST, t, u, { cam, exposure: 0.95 });
    K.vignette(ctx, 0.3);
    CAP.draw(ctx, t);
    K.drawSeal(ctx, IMG.seal, t, 32.6, D);
  },
  post(ctx, u, t) { K.grain(ctx, t, M.mulberry32, 0.035); },
});
