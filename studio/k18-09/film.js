// k18-09 "Losing the Fish Was What He Was Looking For" (Al-Kahf 18:61, 18:64). confluence, midday.
// The fish flips out of the basket, slides off the rock into the sea and darts to the seam; the travellers are only
// shadows, a pointing hand, feet walking back along their footprints; footprints fill with sea water (loop).
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { confluence } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 28.37;

let ST, SET, CAP, TALL, YOUNG, C = {}, SHOTS, TOP, BK0, FISH, STREAK, RIPPLES = [], PUDDLES = [], GLINT, STAFF, HT;
const ENTRY = V(-0.3, 0.0, -0.35);                 // where the fish meets the water
const SEAM = V(2.8, -0.04, -9);                    // where it vanishes (on the seam line x = 2.8)

// ------------------------------------------------------------------ fish path (closed form)
// 0.05-0.45 flips up out of the basket, 0.45-1.10 slides over the wet rock top, 1.10-1.35 drops off the edge,
// then darts under the surface from ENTRY to SEAM (1.35-3.6, fast at first, then gone at the seam)
function fishAt(t) {
  const P0 = V(BK0.x, TOP + 0.12, BK0.z), P1 = V(BK0.x - 0.08, TOP + 0.36, BK0.z - 0.28), P2 = V(BK0.x - 0.16, TOP + 0.025, BK0.z - 0.72), P3 = V(BK0.x - 0.3, TOP + 0.02, 0.2);
  let p, rx = 0, ry = Math.PI, rz = Math.PI / 2, vis = 1;
  if (t < 0.05) p = P0.clone();
  else if (t < 0.45) { const f = E.outQuad((t - 0.05) / 0.4); p = P0.clone().lerp(P1, f); p.y += 0.12 * Math.sin(Math.PI * f); rz = Math.PI / 2 + f * 3.2; rx = 0.3 * Math.sin(f * 9); }
  else if (t < 0.62) { const f = E.inQuad((t - 0.45) / 0.17); p = P1.clone().lerp(P2, f); rz = Math.PI / 2 + 3.2 + f * 2.9; }
  else if (t < 1.1) { const f = E.outQuad((t - 0.62) / 0.48); p = P2.clone().lerp(P3, f); rz = Math.PI / 2 + 0.15 * Math.sin(t * 40) * (1 - f); ry = Math.PI + 0.3 * Math.sin(t * 23); }
  else if (t < 1.35) { const f = (t - 1.1) / 0.25; p = P3.clone().lerp(ENTRY, f); p.y = lerp(P3.y, ENTRY.y - 0.02, f * f); rz = Math.PI / 2 - f * 0.9; rx = f * 1.2; }
  else { const f = clamp((t - 1.35) / 2.25), g = 1 - (1 - f) ** 2.2; p = ENTRY.clone().lerp(SEAM, g); p.y = -0.03 - 0.03 * g; rz = 0; rx = 0;
    const d = SEAM.clone().sub(ENTRY); ry = Math.atan2(d.x, d.z) + 0.25 * Math.sin(t * 30) * (1 - g); vis = f < 1 ? 1 : 0; }
  return { p, rx, ry, rz, vis };
}

// ------------------------------------------------------------------ small water effects (pure functions of t)
let _grad = null;
function gradTex() {
  if (_grad) return _grad;
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(235,245,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 32);
  const v = x.createLinearGradient(0, 0, 0, 32); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, 256, 32);
  return (_grad = new THREE.CanvasTexture(c));
}
function streakMesh() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xdfeeff }));
  m.renderOrder = 8; m.frustumCulled = false; return m;
}
let _ring = null;
function ringTex() {
  if (_ring) return _ring;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.82, 'rgba(255,255,255,0)'); g.addColorStop(0.9, 'rgba(255,255,255,0.9)'); g.addColorStop(0.95, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return (_ring = new THREE.CanvasTexture(c));
}
function ringMesh() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfe6ee }));
  m.renderOrder = 7; m.frustumCulled = false; return m;
}
// rings spreading from a point: born at t0 + i * gap, radius grows like sqrt, fades out
function rings(list, centre, t, t0, { gap = 0.22, speed = 0.55, life = 2.2, op = 0.5 } = {}) {
  list.forEach((m, i) => { const a = t - t0 - i * gap; m.visible = a > 0 && a < life;
    if (!m.visible) return; const r = 0.03 + speed * Math.sqrt(a) * 0.8 + 0.12 * a; m.scale.set(r, 1, r); m.position.set(centre.x, 0.006, centre.z); m.material.opacity = op * (1 - a / life) ** 1.5; });
}
// streak behind the fish: from the fish back along its path by `len`
function streak(t) {
  const on = t > 1.33 && t < 3.75 ? 1 : 0; STREAK.visible = !!on; if (!on) return;
  const f = fishAt(t), b = fishAt(Math.max(1.35, t - 0.35));
  const head = f.p.clone(), tail = b.p.clone(); head.y = tail.y = 0.004;
  const d = head.clone().sub(tail), L = Math.max(0.05, d.length());
  STREAK.position.copy(head.clone().add(tail).multiplyScalar(0.5)); STREAK.rotation.y = Math.atan2(-d.z, d.x);
  STREAK.scale.set(L, 1, 0.03 + 0.02 * L);
  STREAK.material.opacity = (1 - prog(t, 3.0, 3.75)) * (0.6 + 0.4 * prog(t, 1.33, 1.5));
}

// a sandal print silhouette (toe toward canvas top = -z after rotateX), soft edge
let _pt = null;
function printTex() {
  if (_pt) return _pt;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256); x.filter = 'blur(5px)'; x.fillStyle = '#fff';
  // one sole outline: round heel, narrow arch, broad ball and toe
  x.beginPath(); x.moveTo(64, 236);
  x.bezierCurveTo(34, 236, 36, 190, 44, 160); x.bezierCurveTo(50, 138, 30, 110, 30, 76); x.bezierCurveTo(30, 34, 52, 16, 70, 16);
  x.bezierCurveTo(92, 16, 102, 40, 100, 78); x.bezierCurveTo(98, 112, 84, 138, 86, 162); x.bezierCurveTo(90, 196, 94, 236, 64, 236); x.fill();
  return (_pt = new THREE.CanvasTexture(c));
}

// ------------------------------------------------------------------ people: two travellers (shadows, a hand, feet)
function hideAll() { TALL.object3d.visible = YOUNG.object3d.visible = false; STAFF.visible = false; }
function standRest(t, i) {
  // standing on the sand behind the rock, looking out to sea (backs to the land); seen only by their shadows
  TALL.object3d.visible = YOUNG.object3d.visible = true; STAFF.visible = true;
  TALL.object3d.position.set(C.tallAt.x, C.tallAt.y, C.tallAt.z); TALL.object3d.rotation.y = Math.PI + 0.12;
  YOUNG.object3d.position.set(C.youngAt.x, C.youngAt.y, C.youngAt.z); YOUNG.object3d.rotation.y = Math.PI - 0.1;
  TALL.setPose('stand', t + 2); YOUNG.setPose('stand', t + 7);
  placeStaff();
}
function placeStaff() {
  // the tall traveller's staff, planted on the sand at his left side, held in the left hand
  TALL.object3d.updateMatrixWorld(true);
  const base = TALL.object3d.localToWorld(V(0.32, 0, 0.12)), grip = base.clone().add(V(0, 1.25, 0));
  K.reach(TALL, 'Left', grip, TALL.object3d.localToWorld(V(1.2, 0.8, -0.6)));
  STAFF.position.copy(base); STAFF.rotation.set(0, 0, 0.03);
}
function pointPose(t) {
  // the tall traveller lifts his right hand and points at the seam (14.2-15.0), then holds it there
  const k = E.inOutCubic(prog(t, 14.2, 15.05));
  TALL.object3d.updateMatrixWorld(true);
  const sh = TALL.bones('RightArm').getWorldPosition(V()), h0 = TALL.bones('RightHand').getWorldPosition(V());
  const dir = C.pointAt.clone().sub(sh).normalize(), tgt = sh.clone().addScaledVector(dir, 0.56);
  K.reach(TALL, 'Right', h0.clone().lerp(tgt, k), sh.clone().add(V(0.6, -0.6, 0.3)));
  K.handAim(TALL, 'Right', tgt.clone().addScaledVector(dir, 0.5), 0);
  // index straight, the other fingers curled in
  K.flatHand(TALL, 'Right', 1 - 0.95 * k);                                            // the open hand straightens toward the seam
  TALL.object3d.updateMatrixWorld(true);
}
function walkBack(t) {
  // both walk back up the beach along their own footprints (away from camera, +z)
  TALL.object3d.visible = YOUNG.object3d.visible = true; STAFF.visible = false;
  const w = Math.max(0, t - 16.6);
  for (const [P, x0, z0, ph] of [[TALL, -1.7, 3.15, 0.3], [YOUNG, -2.4, 3.55, 0]]) {
    const z = z0 + P.speed('walk') * w * 0.9; P.object3d.position.set(x0 + 0.35 * Math.sin(z / 6), HT(x0, z), z); P.object3d.rotation.y = 0.06 * Math.cos(z / 6);
    P.setPose(w > 0 ? 'walk' : 'stand', t + ph);
  }
}

// ------------------------------------------------------------------ the film
M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: (t) => (t < 4 ? 3 : 2),
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await confluence({ time: 'day' });
    const S = SET.scene, P = SET.props;
    // less sky glare on the water and a clearer horizon (the seam reads to the far distance)
    // the HDRI carries its own (unshadowed) sun: less env, more direct sun, so cast shadows read at midday
    S.environmentIntensity = 0.42; P.sun.intensity = 5.2;
    P.sea.envMapIntensity = 0.3; if (S.fog) S.fog.density = 0.0005;
    { const U = P.sea.userData.U; U.foamK.value = 0.3; U.colA.value.set(0x066272); U.colB.value.set(0x2c3c18); U.shal.value.set(0x2a8a86); }
    HT = P.terrain.heightAt;
    TOP = P.rock.position.y + 0.95; BK0 = P.basket.position.clone();
    FISH = P.fish;
    STREAK = streakMesh(); S.add(STREAK);
    for (let i = 0; i < 4; i++) { const r = ringMesh(); S.add(r); RIPPLES.push(r); }
    // footprints that fill with seawater: the nearest prints to the sea of each walker's line (props.prints)
    const near = P.prints.filter(([, z]) => z < 12).sort((a, b) => a[1] - b[1]);
    // each print: a damp sandal-shaped hollow (always there) and the water that seeps into it (grows with fill)
    const pt = printTex();
    const dryM = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.6, alphaMap: pt, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const wetM = new THREE.MeshBasicMaterial({ color: 0xa9c6d6, alphaMap: pt, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (const [x, z, a] of near) { const h = HT(x, z);
      const dry = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.29).rotateX(-Math.PI / 2), dryM); dry.position.set(x, h + 0.003, z); dry.rotation.y = a; dry.receiveShadow = true; S.add(dry);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.29).rotateX(-Math.PI / 2), wetM.clone()); m.userData.base = [x, z, a, h]; m.receiveShadow = true; S.add(m); PUDDLES.push(m); }
    GLINT = streakMesh(); GLINT.material.color.set(0xffffff); S.add(GLINT);
    // travellers (built once; only shadows, a hand and feet are ever framed)
    const PP = await K.people();
    TALL = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#8a7458', wrap: '#9a8468', cloak: '#5a4632', sash: '#3c3024', trousers: '#9a8a70' }, beard: 'full', headwear: 'wrap', seed: 31 });
    YOUNG = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#c8b89a', wrap: '#b49a74', cloak: '#7a6a52', sash: '#5a3a2a', trousers: '#b0a080' }, beard: 'none', headwear: 'wrap', seed: 44, detail: 0.8 });
    S.add(TALL.object3d, YOUNG.object3d);
    for (const f of [TALL, YOUNG]) f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.7 });
    STAFF = W.shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.7, 14).translate(0, 0.85, 0), wood)); S.add(STAFF);
    // world points
    // stand them on the rock top so that their shadows fall across the stone toward the sea
    const sd = SET.atmo.sunDir.clone().normalize(), sh = V(sd.x, 0, sd.z).normalize(), tanE = sd.y / Math.hypot(sd.x, sd.z);
    console.error('[k18-09] sun elev', (Math.atan(tanE) * 57.3).toFixed(1), 'dir', sd.x.toFixed(2), sd.z.toFixed(2));
    const R1 = V(0.75, TOP, 0.75), R2 = V(-0.15, TOP, 0.85), off = Math.min(1.1, 1.15 / tanE);
    C.tallAt = R1.clone().addScaledVector(sh, off); C.youngAt = R2.clone().addScaledVector(sh, off);
    C.shadowCam = { pos: [-1.55, TOP + 1.2, 0.05], look: [0.45, TOP - 0.05, 0.75], fov: 40 };
    C.pointAt = V(2.8, 0.4, -14);
    const top = TOP, bx = BK0.x, bz = BK0.z;
    // camera poses (vertical fov for 9x16; 16x9 is tightened in K.lensFov)
    Object.assign(C, {
      flip_a:  { pos: [bx + 0.5, top + 0.95, bz + 0.42], look: [bx - 0.1, top + 0.04, bz - 0.25], fov: 44 },
      flip_b:  { pos: [bx + 0.85, top + 0.55, bz + 0.1], look: [bx - 0.3, top - 0.2, -0.15], fov: 44 },
      water_a: { pos: [0.2, 0.9, 0.3], look: [1.4, -0.05, -4.5], fov: 32 },
      water_b: { pos: [0.25, 0.86, 0.15], look: [1.6, -0.05, -5.2], fov: 31 },
      pull_a:  { pos: [0.45, top + 0.45, 0.95], look: [-0.25, 0.0, -0.7], fov: 36 },
      pull_b:  { pos: C.shadowCam.pos, look: C.shadowCam.look, fov: 44 },
      far:     { pos: [-6, 3.4, 62], look: [0.6, 1.3, 1.5], fov: 9 },
      basket_a:{ pos: [bx + 1.25, top + 0.8, bz + 0.85], look: [bx - 0.05, top + 0.08, bz], fov: 46 },
      basket_b:{ pos: [bx + 1.0, top + 0.66, bz + 0.68], look: [bx - 0.05, top + 0.08, bz], fov: 44 },
      seam:    { pos: [0.6, 2.0, 0.4], look: [2.8, 0.0, -9], fov: 40 },
      shadow:  C.shadowCam,
      feet_a:  { pos: [-2.05, 1.5, 1.9], look: [-2.05, 0.0, 4.0], fov: 46 },
      feet_b:  { pos: [-2.05, 0.2, 2.3], look: [-2.05, -0.2, 8.0], fov: 44 },
      empty:   { pos: [bx + 1.5, top + 0.95, bz + 1.25], look: [bx - 0.1, top + 0.05, bz - 0.1], fov: 46 },
      prints:  { pos: [-2.25, 0.3, 2.55], look: [-2.05, 0.04, 4.8], fov: 38 },
    });
    const pr = PUDDLES[0].userData.base;
    C.one = { pos: [pr[0] - 0.42, pr[3] + 0.42, pr[1] - 0.2], look: [pr[0], pr[3], pr[1] - 0.02], fov: 36 };
    SHOTS = [
      { t0: 0.00, t1: 1.87, a: C.flip_a, b: C.flip_b, ease: E.inOutSine },
      { t0: 1.87, t1: 3.74, a: C.water_a, b: C.water_b },
      { t0: 3.74, t1: 5.30, a: C.pull_a, b: C.pull_b, ease: E.inOutCubic },
      { t0: 5.30, t1: 6.85, a: C.far },
      { t0: 6.85, t1: 9.22, a: C.basket_a, b: C.basket_b, ease: E.inOutSine },
      { t0: 9.22, t1: 11.58, a: C.seam },
      { t0: 11.58, t1: 13.95, a: C.shadow },
      { t0: 13.95, t1: 16.34, a: 'hand' },
      { t0: 16.34, t1: 18.73, a: C.feet_a, b: C.feet_b, ease: E.inOutCubic },
      { t0: 18.73, t1: 21.04, a: C.empty },
      { t0: 21.04, t1: 22.64, a: 'hand' },
      { t0: 22.64, t1: 25.32, a: C.prints },
      { t0: 25.32, t1: D, a: C.one },
    ];
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    // the fish (only before it is gone); the basket tips as it kicks out, and stays tipped
    const f = fishAt(t); FISH.visible = !!f.vis && t < 3.6; FISH.position.copy(f.p); FISH.rotation.set(f.rx, f.ry, f.rz);
    const tip = E.outCubic(prog(t, 0.1, 0.42)); SET.props.basket.rotation.set(0.04 + 0.2 * tip, 0.4, 0.03 - 0.12 * tip);
    streak(t);
    rings(RIPPLES.slice(0, 3), ENTRY, t, 1.33, { op: 0.55 });
    // a second small ring where the fish vanished into the seam (shot 6 shows a dart there again: a later glint)
    const dart = t > 9.4 && t < 11.3;
    RIPPLES[3].visible = false;
    if (dart) { const a = (t - 10.2); RIPPLES[3].visible = a > 0; const r = 0.05 + 0.5 * Math.sqrt(Math.max(0, a)); RIPPLES[3].scale.set(r, 1, r); RIPPLES[3].position.set(SEAM.x - 0.4, 0.006, -6.2); RIPPLES[3].material.opacity = 0.5 * clamp(1 - a / 1.1); }
    // the dart in shot 6: a thin silver line under the surface along the seam, then gone
    GLINT.visible = false;
    if (dart) { const g = prog(t, 9.6, 10.4), a = V(SEAM.x - 0.3, 0.004, -4.6).lerp(V(SEAM.x + 0.25, 0.004, -11), E.outQuad(g));
      GLINT.visible = g > 0 && g < 1; GLINT.position.copy(a); GLINT.rotation.y = Math.atan2(6.4, 0.55) - Math.PI / 2; GLINT.scale.set(0.5, 1, 0.025); GLINT.material.opacity = 0.7 * Math.sin(Math.PI * g); }
    // the puddles in the prints: dry until the walkers have left; they fill slowly (seawater seeps up the sand)
    const fill = (k) => E.outQuad(clamp(k));
    PUDDLES.forEach((m, j) => { const [x, z, a, h] = m.userData.base; const k = fill(prog(t, 18.9 + 0.3 * j, 27.6 + 0.15 * j)) * (t > 16 ? 1 : 0);
      m.visible = k > 0.01; m.position.set(x, h + 0.004, z); m.rotation.y = a; const q = 0.45 + 0.5 * Math.sqrt(k); m.scale.set(q, 1, q); m.material.opacity = 0.25 + 0.6 * k; });
    if (i === 12) { const pr = PUDDLES[0].userData.base, g = prog(t, 26.0, 27.2);
      GLINT.visible = g > 0 && g < 1; GLINT.position.set(pr[0] - 0.08 + 0.16 * g, pr[3] + 0.006, pr[1] + 0.02); GLINT.rotation.y = 0; GLINT.scale.set(0.05, 1, 0.006); GLINT.material.opacity = 0.9 * Math.sin(Math.PI * g); }
    // people per shot
    hideAll();
    if (i === 2 || i === 3 || i === 6) standRest(t, i);
    if (i === 7 || i === 10) { standRest(t, i); pointPose(i === 10 ? Math.max(t, 15.2) : t); }
    if (i === 8) walkBack(t);
    // camera
    let cam;
    if (s.a === 'hand') {
      const sh = TALL.bones('RightArm').getWorldPosition(V()), dd = C.pointAt.clone().sub(sh).normalize(), h = sh.clone().addScaledVector(dd, 0.56), d = C.pointAt.clone().sub(h).normalize();
      const side = V(-d.z, 0, d.x).normalize();                                          // to the right of the pointing line
      const k = i === 7 ? E.inOutSine(p) : 1;
      const pos = h.clone().addScaledVector(d, -lerp(0.78, 0.66, k)).addScaledVector(side, 0.13).add(V(0, 0.0, 0));
      cam = { pos: pos.toArray(), look: h.clone().addScaledVector(d, 1.6).add(V(0, -0.12, 0)).toArray(), fov: K.lensFov(i === 7 ? 36 : 32) };
    } else {
      cam = K.camLerp(s.a, s.b, (s.ease || E.linear)(p));
      cam = K.breathe(cam, t, s.b ? 0.0015 : 0.0025, 11 + i);
    }
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * ([1, 2, 5, 7, 10].includes(i) ? 0.8 : i === 3 ? 0.92 : 0.95) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
