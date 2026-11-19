// k18-12 "A Town Refused Them Food. He Repaired Its Wall Anyway" (Al-Kahf 18:82). village_wall.
// Midday: a crack in the leaning wall, a palm pressed flat on it; shut doors; two shadows and a staff under the thorn
// tree; fresh bricks travel from the stack into the gaps and the wall comes straight; down through the earth to the
// sealed jar; two children on a step; years pass in the light; two grown backs kneel and lift the jar; sunset shadow.
// Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { village_wall } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp, lerp } = M;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D = 33.43;
const JAR = [1.1, 0.55];

let ST, SET, CAP, HT, GY, KHIDR, SHADE = [], KIDS = [], MEN = [], STAFF, TROWEL, SOIL, SOILFLOOR, PIT, MOUND, JLIGHT, DUST, C = {}, SHOTS, SUN0 = {}, JAR0;
const crackX = (y) => -0.6 + 0.9 * (y / 2.75) + 0.25 * Math.sin(y * 7);

// the sun as a pure function of (azim, elev): the set's directional light, moved around the wall
function setSun(az, el, I, col = 0xfff2e0, env = SUN0.env) {
  const P = SET.props, a = az * Math.PI / 180, e = el * Math.PI / 180, d = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
  P.sun.position.copy(d.multiplyScalar(200)).add(SUN0.tgt); P.sun.intensity = I; P.sun.color.set(col); SET.scene.environmentIntensity = env;
}
// story state
const repairAt = (t) => E.inOutSine(prog(t, 7.0, 8.96));
const crackAt = (t) => 0.55 + 0.45 * E.inOutSine(prog(t, 0.0, 3.6));

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 2,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await village_wall({ time: 'day', repair: 0 });
    const S = SET.scene, P = SET.props; HT = P.terrain.heightAt; GY = HT(0, 0);
    SUN0 = { tgt: P.sun.target.position.clone(), I: P.sun.intensity, env: S.environmentIntensity, col: P.sun.color.getHex() };
    // the underground: the set's glass cut-away is replaced by a wide soil section (the camera is the cut)
    P.cutaway.visible = false;
    JAR0 = P.jar.position.clone();
    { const soilM = await W.pbr('brown_mud_dry', { tile: 0.9, res: 1024, tint: 0x8a6a4c });
      const g = new THREE.PlaneGeometry(9, 2.4, 1, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 2.4);
      const sm = soilM.clone(); sm.onBeforeCompile = (s2) => { s2.fragmentShader = s2.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= mix(0.35, 1.0, smoothstep(0.0, 1.0, vMapUv.y / 2.4));'); };
      SOIL = new THREE.Mesh(g, sm); SOIL.position.set(JAR[0], GY - 1.2, JAR[1] - 0.02); SOIL.receiveShadow = false; S.add(SOIL);
      SOILFLOOR = new THREE.Mesh(new THREE.PlaneGeometry(9, 3).rotateX(-Math.PI / 2), sm); SOILFLOOR.position.set(JAR[0], GY - 1.3, JAR[1] + 1.4); S.add(SOILFLOOR);
      // a dug pit and a mound of loose earth for the lifting (only seen in shot 12)
      PIT = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e140c, roughness: 1, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      PIT.position.set(JAR[0], HT(...JAR) + 0.004, JAR[1]); S.add(PIT);
      MOUND = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), soilM); MOUND.scale.set(0.9, 0.28, 0.6); MOUND.position.set(JAR[0] + 0.85, HT(...JAR) - 0.02, JAR[1] + 0.45); W.shadows(MOUND); S.add(MOUND); }
    JLIGHT = new THREE.PointLight(0xffc890, 0, 3.5, 1.6); S.add(JLIGHT);
    DUST = K.dustMotes({ centre: [crackX(1.4), GY + 1.2, 0.7], size: [0.25, 1.0, 0.12], count: 120, seed: 5, px: 0.005, op: 0.8, fall: 0.25, color: 0xd8c0a0 }); S.add(DUST);
    // people: Khidr's hands (a full figure, framed only to the hands); the two travellers as shadows only;
    // two small boys on the step (backs); two grown men kneeling at the wall (backs, hands)
    const PP = await K.people();
    KHIDR = PP.make({ kind: 'man', outfit: 'traveller', palette: { robe: '#3e5a3a', wrap: '#6a7a5a', cloak: '#2e3e2a', sash: '#4a3a2a', trousers: '#7a7060', skin: '#9a6a48' }, beard: 'full', headwear: 'wrap', seed: 52 });
    S.add(KHIDR.object3d);
    for (const [seed, pal] of [[31, { robe: '#8a7458', cloak: '#5a4632' }], [52, { robe: '#3e5a3a', cloak: '#2e3e2a' }]]) {
      const f = PP.make({ kind: 'man', outfit: 'traveller', palette: pal, beard: 'full', headwear: 'wrap', seed, detail: 0.6 });
      S.add(f.object3d); SHADE.push(f); }
    for (const [seed, pal] of [[71, { robe: '#7a6248', sash: '#4a2a1e' }], [72, { robe: '#5a6a7a', sash: '#3a2a1e' }]]) { const f = PP.make({ kind: 'boy', outfit: 'thobe', palette: pal, seed, detail: 0.6 }); S.add(f.object3d); KIDS.push(f); }
    for (const [seed, pal] of [[81, { robe: '#7a6248', cloak: '#4a3a2c', wrap: '#b8a888' }], [82, { robe: '#5a6a7a', cloak: '#3a4048', wrap: '#c8bca4' }]]) { const f = PP.make({ kind: 'man', outfit: 'thobe', palette: pal, beard: 'short', headwear: 'wrap', seed, detail: 0.8 }); S.add(f.object3d); MEN.push(f); }
    for (const f of [KHIDR, ...KIDS, ...MEN]) f.object3d.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } });
    STAFF = W.shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 1.75, 16).translate(0, 0.875, 0), new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: 0.62 })));
    STAFF.position.set(-6.62, HT(-6.62, 4.05), 4.05); STAFF.rotation.set(-0.05, 0, 0.2); S.add(STAFF);
    TROWEL = new THREE.Group(); { const iron = W.ironMat(); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.16), iron); bl.position.z = 0.1; TROWEL.add(bl);
      const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.7 })); hd.position.set(0, 0.03, -0.02); TROWEL.add(hd); W.shadows(TROWEL); }
    S.add(TROWEL);
    // cameras
    const cg = GY, cx = crackX(1.45), fz = 0.6;
    Object.assign(C, {
      crack_a: { pos: [cx - 0.45, cg + 1.5, 2.3], look: [cx + 0.12, cg + 1.38, 0.5], fov: 34 },
      crack_b: { pos: [cx - 0.38, cg + 1.47, 2.0], look: [cx + 0.12, cg + 1.36, 0.5], fov: 32 },
      dust_a:  { pos: [cx - 0.3, cg + 1.0, 1.75], look: [cx + 0.05, cg + 1.1, 0.5], fov: 30 },
      dust_b:  { pos: [cx - 0.26, cg + 1.0, 1.5], look: [cx + 0.05, cg + 1.1, 0.5], fov: 28 },
      doors_a: { pos: [6.5, cg + 1.5, 4.4], look: [-4, cg + 1.5, 9.4], fov: 42 },
      doors_b: { pos: [2.0, cg + 1.5, 4.4], look: [-8.5, cg + 1.5, 9.4], fov: 42 },
      tree:    { pos: [-4.9, cg + 0.55, 7.4], look: [-6.6, cg + 0.35, 4.6], fov: 46 },
      tr_a:    { pos: [0.95, cg + 1.3, 1.75], look: [0.35, cg + 1.2, 0.5], fov: 36 },
      tr_b:    { pos: [1.0, cg + 1.28, 1.6], look: [0.3, cg + 1.18, 0.5], fov: 34 },
      tr_c:    { pos: [6.5, cg + 1.6, 3.6], look: [-4.0, cg + 1.3, 0.2], fov: 44 },
      tr_d:    { pos: [5.6, cg + 1.6, 3.9], look: [-4.5, cg + 1.3, 0.2], fov: 44 },
      down_a:  { pos: [JAR[0] + 0.3, cg + 1.5, JAR[1] + 3.2], look: [JAR[0], cg + 0.15, JAR[1]], fov: 44 },
      down_b:  { pos: [JAR[0] + 0.25, cg - 0.5, JAR[1] + 2.3], look: [JAR[0], cg - 0.7, JAR[1]], fov: 40 },
      jar_a:   { pos: [JAR[0] + 0.25, cg - 0.5, JAR[1] + 2.0], look: [JAR[0], cg - 0.72, JAR[1]], fov: 38 },
      jar_b:   { pos: [JAR[0] + 0.2, cg - 0.52, JAR[1] + 1.75], look: [JAR[0], cg - 0.74, JAR[1]], fov: 36 },
      kids:    { pos: [-1.6, HT(-1.6, 8.6) + 1.15, 8.6], look: [-4.3, cg + 0.55, 5.8], fov: 40 },
      lapse:   { pos: [5.5, cg + 1.6, 6.0], look: [-1.5, cg + 1.3, 0], fov: 46 },
      men:     { pos: [JAR[0] + 0.3, cg + 0.7, JAR[1] + 3.3], look: [JAR[0], cg + 0.65, 0], fov: 38 },
      lift_a:  { pos: [JAR[0] + 1.7, cg + 1.0, JAR[1] + 2.4], look: [JAR[0], cg + 0.3, JAR[1]], fov: 38 },
      lift_b:  { pos: [JAR[0] + 1.5, cg + 0.95, JAR[1] + 2.15], look: [JAR[0], cg + 0.35, JAR[1]], fov: 36 },
      jar_c:   { pos: [JAR[0] + 0.15, cg - 0.55, JAR[1] + 1.55], look: [JAR[0], cg - 0.75, JAR[1]], fov: 34 },
      straight:{ pos: [4.8, cg + 1.4, 6.5], look: [-1.0, cg + 1.35, 0], fov: 40 },
      plaster: { pos: [0.9, cg + 1.3, 1.6], look: [0.5, cg + 1.2, 0.3], fov: 30 },
      sunset:  { pos: [7.0, cg + 1.8, 8.6], look: [-2.0, cg + 1.3, 0.0], fov: 48 },
    });
    SHOTS = [
      { t0: 0.00, t1: 2.15, a: C.crack_a, b: C.crack_b, l: 'noon' },
      { t0: 2.15, t1: 4.31, a: C.dust_a, b: C.dust_b, l: 'noon', ease: E.inOutSine },
      { t0: 4.31, t1: 5.47, a: C.doors_a, b: C.doors_b, l: 'noon' },
      { t0: 5.47, t1: 6.63, a: C.tree, l: 'noon' },
      { t0: 6.63, t1: 7.80, a: C.tr_a, b: C.tr_b, l: 'noon' },
      { t0: 7.80, t1: 8.96, a: C.tr_c, b: C.tr_d, l: 'noon' },
      { t0: 8.96, t1: 11.96, a: C.down_a, b: C.down_b, l: 'noon', dissolve: [9.7, 10.7] },
      { t0: 11.96, t1: 14.95, a: C.jar_a, b: C.jar_b, l: 'noon', ease: E.inOutSine },
      { t0: 14.95, t1: 17.95, a: C.kids, l: 'noon' },
      { t0: 17.95, t1: 20.26, a: C.lapse, l: 'lapse' },
      { t0: 20.26, t1: 22.57, a: C.men, l: 'gold' },
      { t0: 22.57, t1: 24.88, a: C.lift_a, b: C.lift_b, l: 'gold', ease: E.inOutSine },
      { t0: 24.88, t1: 26.93, a: C.jar_c, l: 'noon' },
      { t0: 26.93, t1: 28.93, a: C.straight, l: 'gold' },
      { t0: 28.93, t1: 30.80, a: C.plaster, l: 'gold' },
      { t0: 30.80, t1: D, a: C.sunset, l: 'sunset' },
    ];
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t), P = SET.props;
    // light per shot
    let expo = SET.exposure;
    if (s.l === 'noon') setSun(150, 62, SUN0.I, SUN0.col);
    if (s.l === 'lapse') { const q = prog(t, 17.95, 20.26); setSun(lerp(20, 175, q), 18 + 50 * Math.sin(Math.PI * q), SUN0.I * (0.6 + 0.4 * Math.sin(Math.PI * q)), 0xffe8cc); }
    if (s.l === 'gold') { setSun(165, 16, SUN0.I * 0.85, 0xffbe78, SUN0.env * 0.7); expo *= 1.05; }
    if (s.l === 'sunset') { const q = prog(t, 31.8, D); setSun(lerp(-150, -146, q), lerp(11, 9, q), SUN0.I * lerp(0.9, 0.6, q), 0xff9a50, SUN0.env * lerp(1.0, 1.1, q)); expo *= lerp(1.1, 0.95, q); }
    const under = i === 7 || i === 12;
    // the wall: crack opens in shots 1-2, repaired across shots 5-6
    const rep = repairAt(t);
    // the jar: in the earth until the men lift it (22.8-24.4); then it stays out on the lane
    const lift = E.inOutCubic(prog(t, 22.8, 24.4)), jarOut = t > 22.57 && t < 24.88;
    P.jar.position.copy(JAR0); if (jarOut) P.jar.position.y = JAR0.y + lift * 0.62 + 0.25;
    PIT.visible = MOUND.visible = jarOut; P.jar.visible = true;
    JLIGHT.intensity = under || i === 6 ? 0.9 : 0; JLIGHT.position.set(JAR[0] - 0.4, GY - 0.3, JAR[1] + 0.9);
    SOIL.visible = SOILFLOOR.visible = under;
    DUST.userData.update(t, i <= 1 ? 1 : 0);
    // people
    for (const f of [KHIDR, ...SHADE, ...KIDS, ...MEN]) f.object3d.visible = false; TROWEL.visible = false; STAFF.visible = i === 3;
    if (i <= 1) {
      // a palm pressed flat against the wall beside the crack
      const f = KHIDR; f.object3d.visible = true; f.object3d.position.set(crackX(1.4) + 0.75, HT(0.4, 1.3), 1.15); f.object3d.rotation.y = Math.PI + 0.5; f.setPose('stand', t + 2);
      f.object3d.updateMatrixWorld(true);
      const tgt = V(crackX(1.4) + 0.22, GY + 1.33, 0.66), h0 = f.bones('RightHand').getWorldPosition(V()), k = i === 0 ? E.inOutCubic(prog(t, 0.6, 1.4)) : 1;
      K.reach(f, 'Right', h0.lerp(tgt, k), V(crackX(1.4) + 1.2, GY + 0.9, 1.3));
      K.handAim(f, 'Right', tgt.clone().add(V(0.02, 0.25, -0.03)), Math.PI / 2 * k); K.flatHand(f, 'Right', 1 - 0.95 * k);
    }
    if (i === 3) {
      // the travellers rest in the tree's shade, kneeling; only their shadows are seen
      SHADE.forEach((f, k) => { f.object3d.visible = true; f.object3d.position.set(-6.2 - 0.9 * k, HT(-6.2 - 0.9 * k, 5.0 + 0.3 * k), 5.0 + 0.3 * k); f.object3d.rotation.y = Math.PI * 0.92; f.setPose('stand', t + 3 * k);
        f.object3d.traverse((m) => { if (m.isMesh) m.material.colorWrite = true; }); });
    }
    if (i === 4) {
      // the hand with the trowel smooths fresh mud over the bulge
      const f = KHIDR; f.object3d.visible = true; TROWEL.visible = true;
      f.object3d.position.set(1.05, GY, 1.25); f.object3d.rotation.y = Math.PI + 0.45; f.setPose('stand', t);
      f.object3d.updateMatrixWorld(true);
      const tgt = V(0.42 + 0.12 * Math.sin(t * 4.2), GY + 1.2 + 0.08 * Math.sin(t * 2.1), 0.66);
      K.reach(f, 'Right', tgt, V(1.4, GY + 0.7, 1.4)); K.handAim(f, 'Right', tgt.clone().add(V(-0.12, 0.06, -0.12)), 0);
      f.object3d.updateMatrixWorld(true);
      const hp = f.bones('RightHand').getWorldPosition(V()); TROWEL.position.copy(hp).add(V(-0.03, -0.02, -0.05)); TROWEL.rotation.set(-1.3, 0.75, 0);
    }
    if (i === 8) KIDS.forEach((f, k) => { f.object3d.visible = true; f.object3d.position.set(-5.0 + 0.95 * k, HT(-4.5, 7.1) + 0.27, 7.15); f.object3d.rotation.y = Math.PI; f.setPose('kneel', t + 2 * k); });
    if (i === 10 || i === 11) MEN.forEach((f, k) => {
      f.object3d.visible = true; f.object3d.position.set(JAR[0] - 0.45 + 0.9 * k, HT(...JAR), JAR[1] + 0.55); f.object3d.rotation.y = Math.PI + (k ? 0.35 : -0.35); f.setPose('kneel', t + 1.5 * k);
      if (i === 11) { f.object3d.updateMatrixWorld(true); const sd = k ? 'Left' : 'Right', side = k ? 1 : -1, jp = P.jar.position;
        const tgt = V(jp.x + side * 0.26, jp.y + 0.38, jp.z + 0.05); K.reach(f, sd, tgt, V(jp.x + side * 0.8, jp.y + 0.1, jp.z + 0.6)); K.handAim(f, sd, tgt.clone().add(V(-side * 0.1, 0.12, -0.05)), 0); K.flatHand(f, sd, 0.4); }
    });
    // camera
    let cam = K.camLerp(s.a, s.b, (s.ease || E.linear)(p));
    cam = K.breathe(cam, t, s.b ? 0.0012 : 0.002, 11 + i);
    ST.bloom = 0.08;
    const ro = { exposure: expo * (under ? 1.3 : 1), repair: rep, crack: t < 6.63 ? crackAt(t) : 1 };
    if (s.dissolve) {
      const k = E.inOutSine(prog(t, ...s.dissolve));
      SOIL.visible = SOILFLOOR.visible = false; G.renderSet(ctx, ST, t, u, { ...ro, cam: K.breathe(K.camLerp(s.a, null, 0), t, 0.002, 3) });
      if (k > 0) { SOIL.visible = SOILFLOOR.visible = true; G.renderSet(ctx, ST, t, u, { ...ro, exposure: expo * 1.3, cam: K.camLerp(s.b, null, 0), alpha: k }); }
    } else G.renderSet(ctx, ST, t, u, { ...ro, cam });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t, 0.035); },
});
