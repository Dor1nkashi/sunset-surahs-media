// k18-13 "He Was Given a Way to Everything. See What He Chose" (Al-Kahf 18:84, 18:88). journeys west + east.
// The red sun sinks into the dark western lagoon; a caravan on a ridge; sunrise on the bare eastern plain; a gold route
// line draws itself over both; the meeting ground: the ruler (back only, long cloak, plain head cloth) lowers and opens
// his hand, villagers step in, bread and water pass between hands; a fist and an open palm. Pure function of time.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { journeys } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 31.34;

let WEST, EAST, SW, SE, CAP, RULER, CROWD = [], CARAVAN = [], ROUTE_W, ROUTE_E, BREAD = [], BOWLS = [], HANDS = [], C = {}, SHOTS, HE, MG, E0 = {};

// a golden route line on the ground that draws itself (drawRange grows with k)
function routeLine(pts, heightAt, { r = 0.25, color = 0xffc860 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, heightAt(x, z) + 0.6, z)));
  const g = new THREE.TubeGeometry(curve, 600, r, 8, false);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 9;
  const total = g.index.count;
  mesh.userData.set = (k) => { g.setDrawRange(0, Math.floor(total * clamp(k) / 6) * 6); mesh.visible = k > 0.002; };
  mesh.userData.curve = curve;
  return mesh;
}
// open hand palm-up: tries four rolls about the finger axis and keeps the one whose palm faces most upward.
// The palm side is calibrated from a render: roll +90 deg put this rig's left palm face down.
function palmNormal(f, side) { const h = f.bones(side + 'Hand').getWorldPosition(V()), a = f.bones(side + 'HandIndex1').getWorldPosition(V()), b = f.bones(side + 'HandPinky1').getWorldPosition(V());
  return new THREE.Vector3().crossVectors(a.sub(h), b.sub(h)).normalize(); }
function palmUp(f, side, tip) {
  // handAim's roll is applied on top of the bone's current rotation, so restore the bone before each trial
  const H = f.bones(side + 'Hand'), q0 = H.quaternion.clone(), aim = (r) => { H.quaternion.copy(q0); f.object3d.updateMatrixWorld(true); K.handAim(f, side, tip, r); f.object3d.updateMatrixWorld(true); };
  aim(Math.PI / 2); const n0 = palmNormal(f, side), sg = n0.y < 0 ? 1 : -1;
  let best = 0, bv = -9; for (let k = 0; k < 12; k++) { const r = k * Math.PI / 6; aim(r); const v = sg * palmNormal(f, side).y; if (v > bv) { bv = v; best = r; } }
  aim(best); return palmNormal(f, side).multiplyScalar(sg);
}
function curl(f, side, k) { for (const n of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let j = 1; j <= 3; j++) { const b = f.bones(`${side}Hand${n}${j}`); if (!b) continue; const q = b.quaternion.clone(); b.quaternion.slerp(q.clone().multiply(q).multiply(q), k); } f.object3d.updateMatrixWorld(true); }

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    WEST = await journeys({ side: 'west' }); EAST = await journeys({ side: 'east' });
    if (WEST.scene.fog) { WEST.scene.fog.density *= 0.3; WEST.scene.fog.color.multiplyScalar(0.55); }
    { const lg = WEST.props.lagoon; lg.envMapIntensity = 0.05; lg.specularIntensity = 0.35; lg.roughness = 0.14; }
    HE = EAST.props.terrain.heightAt; const HW = WEST.props.terrain.heightAt;
    E0 = { I: EAST.props.sun.intensity, env: EAST.scene.environmentIntensity, col: EAST.props.sun.color.getHex(), pos: EAST.props.sun.position.clone() };
    // gold route lines: along the western shore, and across the eastern plain to the ridge
    ROUTE_W = routeLine([[-60, 30], [-30, 22], [-5, 16], [10, 14], [30, 18], [60, 26], [90, 40]], HW); WEST.scene.add(ROUTE_W);
    ROUTE_E = routeLine([[-60, 40], [-30, 25], [-5, 10], [5, -10], [-10, -50], [-25, -110], [10, -140]], HE); EAST.scene.add(ROUTE_E);
    // people
    const PP = await K.people();
    const slot = (n) => EAST.group.getObjectByName('people_slots').getObjectByName(n);
    MG = slot('ruler').position.clone();
    RULER = PP.make({ kind: 'man', outfit: 'noble', palette: { robe: '#3a3530', cloak: '#2a2622', wrap: '#9c9080', sash: '#5a4a38', trousers: '#4a4440', trim: '#6a5a40' }, headwear: 'wrap', beard: 'full', seed: 90 });
    EAST.scene.add(RULER.object3d);
    const pals = ['earth', 'sand', 'olive', 'indigo', 'rust', 'cream', 'earth', 'sand', 'olive', 'rust'], kinds = ['man', 'woman', 'elder', 'man', 'boy', 'woman', 'man', 'elder', 'man', 'woman'];
    for (let i = 0; i < 10; i++) { const f = PP.make({ kind: kinds[i], outfit: kinds[i] === 'woman' ? 'abaya' : i % 3 ? 'worker' : 'thobe', palette: pals[i], seed: 100 + i, detail: 0.6 }); EAST.scene.add(f.object3d); CROWD.push(f); }
    for (let i = 0; i < 6; i++) { const f = PP.make({ kind: 'man', outfit: 'traveller', palette: pals[i], seed: 120 + i, detail: 0.6 }); EAST.scene.add(f.object3d); CARAVAN.push(f); }
    for (const f of [RULER, ...CROWD, ...CARAVAN]) f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } });
    // bread and bowls for the circle of hands
    const breadM = new THREE.MeshStandardMaterial({ color: 0xc89058, roughness: 0.85 }), bowlM = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 }), waterM = new THREE.MeshPhysicalMaterial({ color: 0x5a7a7a, roughness: 0.05, clearcoat: 1 });
    for (let i = 0; i < 4; i++) { const b = W.shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.022, 40), breadM)); EAST.scene.add(b); BREAD.push(b); }
    for (let i = 0; i < 2; i++) { const g = new THREE.Group(); g.add(W.shadows(new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.05, 0.004], [0.08, 0.035], [0.085, 0.05], [0.078, 0.05], [0.045, 0.012], [0.001, 0.01]].map(([a, b]) => new THREE.Vector2(a, b)), 40), bowlM)));
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.074, 32).rotateX(-Math.PI / 2), waterM); w.position.y = 0.04; g.add(w); EAST.scene.add(g); BOWLS.push(g); }
    HANDS = [CROWD[0], CROWD[1], CROWD[3], CROWD[5]];
    // cameras
    const my = MG.y;
    const mgx = MG.x, mgz = MG.z;
    Object.assign(C, {
      sun_a:   { pos: [1.5, 0.9, 7.5], look: [0, 0.6, -200], fov: 30 },
      sun_b:   { pos: [1.5, 0.88, 7.0], look: [0, 0.6, -200], fov: 29 },
      sink:    { pos: [1.6, 0.7, 6.4], look: [0, 0.5, -200], fov: 16 },
      shore_a: { pos: [0.5, 2.6, 17], look: [-1, 0.0, -60], fov: 44 },
      shore_b: { pos: [3.0, 2.6, 17], look: [1.5, 0.0, -60], fov: 44 },
      ridge:   { pos: [-10, 2, 20], look: [-30, HE(-30, -110) + 1.0, -110], fov: 9 },
      plain:   { pos: [-2, 1.2, 12], look: [3, 2.5, -120], fov: 44 },
      airW_a:  { pos: [-50, 45, 70], look: [0, 0, -10], fov: 44 },
      airW_b:  { pos: [10, 42, 75], look: [40, 0, -5], fov: 44 },
      airE_a:  { pos: [-50, 45, 70], look: [-5, 0, -20], fov: 44 },
      airE_b:  { pos: [-5, 50, 45], look: [-15, 0, -90], fov: 44 },
      meet:    { pos: [mgx + 0.8, my + 1.1, mgz - 3.2], look: [mgx, my + 1.3, mgz + 6], fov: 46 },
      hand_a:  { pos: [mgx + 0.55, my + 1.25, mgz - 1.2], look: [mgx + 0.2, my + 1.25, mgz + 3], fov: 34 },
      hand_b:  { pos: [mgx + 0.5, my + 1.22, mgz - 0.95], look: [mgx + 0.2, my + 1.22, mgz + 3], fov: 33 },
      crowd_a: { pos: [mgx - 8.5, my + 1.5, mgz + 0.5], look: [mgx - 1, my + 1.0, mgz + 6.5], fov: 40 },
      crowd_b: { pos: [mgx - 7.5, my + 1.5, mgz + 0.2], look: [mgx + 0.5, my + 1.0, mgz + 6.5], fov: 40 },
      circle_a:{ pos: [mgx, my + 2.4, mgz + 3.3], look: [mgx, my + 0.9, mgz + 3.35], fov: 44 },
      circle_b:{ pos: [mgx, my + 2.05, mgz + 3.32], look: [mgx, my + 0.9, mgz + 3.35], fov: 42 },
      tall:    { pos: [mgx + 0.4, my + 0.35, mgz - 1.6], look: [mgx, my + 2.2, mgz + 2], fov: 48 },
    });
    SHOTS = [
      { t0: 0.00, t1: 1.74, a: C.sun_a, b: C.sun_b, w: 1 },
      { t0: 1.74, t1: 3.48, a: C.sink, w: 1 },
      { t0: 3.48, t1: 5.04, a: C.shore_a, b: C.shore_b, w: 1 },
      { t0: 5.04, t1: 6.61, a: C.ridge },
      { t0: 6.61, t1: 8.18, a: C.plain },
      { t0: 8.18, t1: 10.77, a: C.airW_a, b: C.airW_b, w: 1, ease: E.inOutSine },
      { t0: 10.77, t1: 13.36, a: C.airE_a, b: C.airE_b, ease: E.inOutSine },
      { t0: 13.36, t1: 15.45, a: C.meet, m: 1 },
      { t0: 15.45, t1: 17.54, a: C.hand_a, b: C.hand_b, m: 1, ease: E.inOutSine },
      { t0: 17.54, t1: 19.63, a: C.crowd_a, b: C.crowd_b, m: 1 },
      { t0: 19.63, t1: 21.72, a: C.circle_a, b: C.circle_b, m: 1, ease: E.inOutSine },
      { t0: 21.72, t1: 23.65, a: C.tall, m: 1 },
      { t0: 23.65, t1: 26.07, a: 'fist', m: 1 },
      { t0: 26.07, t1: 28.57, a: 'palm', m: 1 },
      { t0: 28.57, t1: D, a: 'both', m: 1 },
    ];
    SW = W.stage(WEST); SE = W.stage(EAST);
    WEST.update(0, null, {}); EAST.update(0, null, {}); G.R.compile(WEST.scene, SW.camera); G.R.compile(EAST.scene, SE.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    const set = s.w ? WEST : EAST, st = s.w ? SW : SE;
    // west: the sun sinks (elevation from 0.7 deg to -0.6 deg over shots 1-3)
    if (s.w) { const el = lerp(0.9, -0.7, E.inOutSine(prog(t, 0, 5.04))) * Math.PI / 180, a = 270 * Math.PI / 180, d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      if (WEST.props.sky?.material?.uniforms?.sunDir) WEST.props.sky.material.uniforms.sunDir.value.copy(d); }
    ROUTE_W.userData.set(i === 5 ? E.inOutSine(prog(t, 8.4, 10.7)) : 0);
    ROUTE_E.userData.set(i === 6 ? E.inOutSine(prog(t, 10.9, 13.2)) : 0);
    // east light: sunrise for the plain; a calmer, softer afternoon for the meeting ground; the last shot warms to sunset
    const P = EAST.props;
    if (s.m) { const warm = i === 14 ? E.inOutSine(prog(t, 29.0, D)) : 0; P.sun.intensity = E0.I * lerp(0.55, 1.1, warm); P.sun.color.set(warm > 0 ? new THREE.Color(0xfff0e0).lerp(new THREE.Color(0xff6a30), warm) : 0xfff0e0); EAST.scene.environmentIntensity = E0.env * 1.3;
      P.sun.position.copy(MG).add(V(-60, 120 - 100 * warm, 40)); P.sun.target.position.copy(MG); }
    else { P.sun.intensity = E0.I; P.sun.color.set(E0.col); EAST.scene.environmentIntensity = E0.env; P.sun.position.copy(E0.pos); P.sun.target.position.set(0, 0, -10); }
    // people
    for (const f of [RULER, ...CROWD, ...CARAVAN]) f.object3d.visible = false; BREAD.forEach((b) => (b.visible = false)); BOWLS.forEach((b) => (b.visible = false));
    if (i === 3) CARAVAN.forEach((f, k) => { const sl = EAST.group.getObjectByName('people_slots').getObjectByName(`caravan_${k + 1}`).position; const x = sl.x + 1.3 * (t - 5.04);
      f.object3d.visible = true; f.object3d.position.set(x, HE(x, sl.z), sl.z); f.object3d.rotation.y = Math.PI / 2; f.setPose('walk', t + k * 0.37); f.object3d.scale.setScalar(1); });
    if (i === 4) [0, 1, 2].forEach((k) => { const f = CARAVAN[k], sh = P.shelters[k].position; f.object3d.visible = true; f.object3d.position.set(sh.x + 0.2, HE(sh.x, sh.z), sh.z + 0.2); f.object3d.rotation.y = 0.5 * k; f.setPose('kneel', t + k); });
    if (s.m && i <= 11) {
      RULER.object3d.visible = true; RULER.object3d.position.copy(MG); RULER.object3d.rotation.y = 0; RULER.setPose('stand', t);
      RULER.object3d.updateMatrixWorld(true);
      // shot 8: right hand raised; shot 9: it lowers and opens; after: down and open
      const lower = i < 8 ? 0 : i === 8 ? E.inOutCubic(prog(t, 15.7, 16.9)) : 1;
      const sh = RULER.bones('RightArm').getWorldPosition(V()), up = sh.clone().add(V(-0.12, 0.42, 0.25)), low = sh.clone().add(V(-0.15, -0.28, 0.42));
      K.reach(RULER, 'Right', up.lerp(low, lower), sh.clone().add(V(-0.6, -0.4, -0.3)));
      K.handAim(RULER, 'Right', (lower < 0.5 ? sh.clone().add(V(-0.12, 0.9, 0.3)) : low.clone().add(V(0, -0.05, 0.4))), lower * Math.PI * 0.5);
      if (lower < 1) curl(RULER, 'Right', 1 - lower); else K.flatHand(RULER, 'Right', 0.25);
      // villagers in a half circle, facing him; they step forward from shot 10
      const step = i < 9 ? 0 : E.inOutSine(prog(t, 17.6, 19.4));
      CROWD.forEach((f, k) => { const sl = EAST.group.getObjectByName('people_slots').getObjectByName(`crowd_${k + 1}`).position, d = V(MG.x - sl.x, 0, MG.z - sl.z).normalize();
        const pos = sl.clone().add(V(0, 0, 2.6)).addScaledVector(d, 1.3 * step); f.object3d.visible = true; f.object3d.position.set(pos.x, HE(pos.x, pos.z), pos.z); f.object3d.rotation.y = Math.atan2(d.x, d.z);
        f.setPose(i === 9 && step > 0.02 && step < 0.98 ? 'walk' : 'stand', t + k * 0.6); });
    }
    if (i === 10) {
      // a circle of hands passing bread and bowls (seen from above): four villagers around a point in front of the crowd
      const c = V(MG.x, 0, MG.z + 3.35);
      HANDS.forEach((f, k) => { const a = k / 4 * Math.PI * 2 + 0.4, pos = c.clone().add(V(Math.sin(a) * 0.72, 0, Math.cos(a) * 0.72)); f.object3d.visible = true; f.object3d.position.set(pos.x, HE(pos.x, pos.z), pos.z);
        f.object3d.rotation.y = a + Math.PI; f.setPose('stand', t + k); f.object3d.updateMatrixWorld(true);
        const out = E.inOutSine(prog(t, 19.8 + 0.2 * k, 20.9 + 0.2 * k)), tg = c.clone().add(V(Math.sin(a) * lerp(0.42, 0.22, out), HE(c.x, c.z) + 0.98, Math.cos(a) * lerp(0.42, 0.22, out)));
        K.reach(f, 'Right', tg, tg.clone().add(V(0, -0.6, 0)).add(V(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)));
        K.handAim(f, 'Right', tg.clone().add(V(-Math.sin(a) * 0.3, -0.02, -Math.cos(a) * 0.3)), Math.PI / 2); K.flatHand(f, 'Right', 0.35);
        f.object3d.updateMatrixWorld(true);
        const hp = f.bones('RightHand').getWorldPosition(V()).add(V(0, 0.04, 0)), item = k % 2 ? BOWLS[(k - 1) / 2] : BREAD[k / 2]; item.visible = true; item.position.copy(hp); item.rotation.set(0, a, 0); });
    }
    if (i >= 12) {
      // hands only: the ruler's right (a fist) and left (open, bread on the palm)
      RULER.object3d.visible = true; RULER.object3d.position.copy(MG); RULER.object3d.rotation.y = 0; RULER.setPose('stand', t); RULER.object3d.updateMatrixWorld(true);
      const shR = RULER.bones('RightArm').getWorldPosition(V()), shL = RULER.bones('LeftArm').getWorldPosition(V());
      const tR = shR.clone().add(V(0.08, -0.3, 0.42)), tL = shL.clone().add(V(-0.08, -0.3, 0.42));
      K.reach(RULER, 'Right', tR, shR.clone().add(V(-0.5, -0.5, -0.2))); K.handAim(RULER, 'Right', tR.clone().add(V(0, 0, 0.3)), 0); curl(RULER, 'Right', 1);
      K.reach(RULER, 'Left', tL, shL.clone().add(V(0.5, -0.5, -0.2))); K.flatHand(RULER, 'Left', 0.15); C.palmN = palmUp(RULER, 'Left', tL.clone().add(V(0, 0, 0.3)));
      RULER.object3d.updateMatrixWorld(true);
      C.fistW = RULER.bones('RightHand').getWorldPosition(V()); C.palmW = RULER.bones('LeftHandMiddle1').getWorldPosition(V()).lerp(RULER.bones('LeftHand').getWorldPosition(V()), 0.45);
      BREAD[0].visible = i >= 13; BREAD[0].position.copy(C.palmW).addScaledVector(C.palmN, 0.03); BREAD[0].quaternion.setFromUnitVectors(V(0, 1, 0), C.palmN);
    }
    // camera
    let cam;
    if (s.a === 'fist' || s.a === 'palm' || s.a === 'both') {
      const tg = s.a === 'fist' ? C.fistW : s.a === 'palm' ? C.palmW : C.fistW.clone().lerp(C.palmW, 0.5);
      const off = s.a === 'both' ? V(0.0, 0.05, 1.15) : V(s.a === 'fist' ? 0.15 : -0.15, 0.06, 0.72);
      cam = { pos: tg.clone().add(off).toArray(), look: tg.toArray(), fov: K.lensFov(s.a === 'both' ? 30 : 28) };
    } else { cam = K.camLerp(s.a, s.b, (s.ease || E.linear)(p)); cam = K.breathe(cam, t, s.b ? 0.0015 : 0.0025, 11 + i); }
    st.bloom = s.m ? 0.06 : s.w && i < 3 ? 0.12 : 0.2;
    G.renderSet(ctx, st, t, u, { cam, exposure: set.exposure * (s.w ? (i === 5 ? 1.0 : i < 2 ? 0.5 : 0.7) : s.m ? 0.95 : 1) });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
