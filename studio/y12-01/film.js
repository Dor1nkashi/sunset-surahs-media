// y12-01 "Eleven Stars, the Sun and the Moon Bowed to a Boy". Shot list: studio/shotlists/y12_01.md.
// The prophets (Yusuf, Ya'qub) are never shown as figures: the dream is light in the sky, the boy is his
// empty bedding on the roof, the father is his mat, staff and lamp; the brothers are blankets breathing
// around the embers. Night (dream) to dawn grey. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { elevenStars, ELEVEN_CENTRE as EC } from '../lib_shared/eleven.js';
const { THREE } = W;
const { W: FW, H: FH, prog, E, lerp, clamp, mulberry32 } = M;
const PORT = M.FORMAT.portrait;
const D = 32.42;
const fv = (f) => (PORT ? f : f * 0.64);
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

let HILLS, CAP, K = {};

// ---------------------------------------------------------------- props
function clayLamp(seed, light = 1.4) {
  const g = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ color: 0x8a5030, roughness: 0.82 });
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.05, 0.004], [0.068, 0.022], [0.056, 0.038], [0.022, 0.034], [0.012, 0.045]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay);
  body.scale.set(1, 1, 1.3); g.add(body);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.02, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.032, 0.085); g.add(sp);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.02, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1c1206, roughness: 0.05 })); oil.position.y = 0.04; g.add(oil);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 })); wick.position.set(0, 0.046, 0.108); wick.rotation.x = 0.5; g.add(wick);
  const f = W.flame({ h: 0.075, w: 0.034, seed, inten: 1.0, light: 0, planes: 2 }); f.position.set(0, 0.05, 0.112); g.add(f);
  const L = new THREE.PointLight(0xff9a50, light, 6, 1.7); L.position.set(0, 0.14, 0.11); g.add(L);
  W.shadows(g); f.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  g.userData = { flame: f, light: L, base: light,
    set(t, k = 1, lean = 0) { f.visible = k > 0.003; f.scale.set(0.6 + 0.4 * k, Math.max(0.03, k), 0.6 + 0.4 * k); f.rotation.z = lean; f.userData.update(t, k); L.intensity = light * k * (0.9 + 0.1 * Math.sin(t * 13.1 + seed)); } };
  return g;
}
// a thin wisp of smoke: two crossed ribbons, a shader draws a wavering line that rises and thins
function smoke() {
  const u = { time: { value: 0 }, op: { value: 0 }, age: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float time, op, age; varying vec2 vUv;
      void main(){ float y = vUv.y; float x = vUv.x - 0.5 - 0.18 * y * sin(y * 9. - time * 2.1) - 0.07 * y * sin(y * 23. - time * 3.7);
        float w = 0.025 + 0.12 * y; float a = exp(-x * x / (w * w)) * smoothstep(0., 0.06, y) * (1. - smoothstep(age * 1.1, age * 1.1 + 0.25, y)) * (1. - y);
        gl_FragColor = vec4(vec3(0.62, 0.6, 0.58), a * op * 0.55);
        #include <colorspace_fragment>
      }` });
  const g = new THREE.Group();
  for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.7).translate(0, 0.35, 0), mat); p.rotation.y = i * Math.PI / 2; g.add(p); }
  g.userData.set = (t, op, age) => { u.time.value = t; u.op.value = op; u.age.value = age; g.visible = op > 0.001; };
  return g;
}
// a sleeper under a wool blanket: a soft lump with folds, on a reed mat; breathes (pure in t)
function sleeper(mat, mat2, seed) {
  const g = new THREE.Group(), r = mulberry32(seed * 97 + 3), n = W.noise2(seed + 5);
  const mt = W.rbox(0.82, 0.03, 2.0, mat2, { r: 0.012, seg: 2 }); g.add(mt);
  const geo = new THREE.CapsuleGeometry(0.23, 1.25, 12, 48).rotateX(Math.PI / 2), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const sh = 1 + 0.18 * Math.exp(-((z + 0.45) ** 2) / 0.05) - 0.12 * Math.exp(-((z - 0.15) ** 2) / 0.04);   // shoulders, waist
    x *= 1.45 * sh; y = (y > 0 ? y * 0.85 : y * 0.25) * sh; const f = 0.02 * n(x * 8, z * 5) + 0.012 * Math.sin(z * 30 + x * 9);
    p.setXYZ(i, x + f * Math.sign(x), y + f, z); }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat); body.position.y = 0.09; body.castShadow = body.receiveShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.12, 8, 24).rotateX(Math.PI / 2).scale(1.3, 0.8, 1), mat); head.position.set(0.04, 0.12, -0.92); head.castShadow = true; g.add(head);
  W.shadows(g);
  g.userData = { body, head, ph: r() * 6, rate: 0.24 + r() * 0.05 };
  return g;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    HILLS = W.stage(await canaan_hills({ time: 'predawn' }));
    const fixT = (x) => x.replace(/ʿ/g, '‘').replace(/ʾ/g, '’').replace(/ṣ/g, 's').replace(/ḥ/g, 'h');   // glyphs the faces lack
    CAP = captions((await loadLines('lines.json')).map((l) => ({ ...l, text: fixT(l.text), keys: (l.keys || []).map(fixT) })), { display: 'Display', ui: 'UI', size: PORT ? 84 : 66 });
    const S = HILLS.set, P = S.props, hy = P.terrain.heightAt, h0 = P.house.position.y, sc = HILLS.scene;
    P.door.leaf.rotation.y = 0;                                                   // the door stays shut all night
    const R = h0 + 3.1 + 0.26;                                             // top of the roof slab K.R = R; K.h0 = h0; K.hy = hy;
    const [planks, wool, reedMat, darkPl] = await Promise.all([
      W.pbr('old_planks_02', { tile: 1.6, tint: 0xcaa880, res: 1024 }), W.pbr('hessian_230', { tile: 0.14, tint: 0xd8c8a8, res: 1024, normal: 0.6 }),
      W.pbr('hessian_230', { tile: 0.3, tint: 0xb89a68, res: 1024 }), W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 })]);
    // ---- the roof: the boy's bedding (thrown back), the father's mat and staff, the lamp between them
    const roof = new THREE.Group(); roof.position.set(0, R, 0); sc.add(roof);
    const bmat = W.rbox(0.8, 0.035, 1.85, reedMat, { r: 0.012 }); bmat.position.set(-1.3, 0, -2.3); bmat.rotation.y = 0.08; roof.add(bmat);
    const blanket = W.cloth(0.95, 1.2, wool.clone(), { segW: 48, segH: 60, folds: 0.018, seed: 4, sag: (u, v) => 0.09 * Math.exp(-((v - 0.82) ** 2) / 0.01) + 0.05 * Math.exp(-((v - 0.7) ** 2) / 0.006) });
    blanket.material.color.set(0xc8b090); blanket.rotation.x = -Math.PI / 2; blanket.position.set(-1.28, 0.05, -1.95); blanket.rotation.z = 0.08; roof.add(blanket);
    const pillow = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 32, 2).rotateZ(Math.PI / 2)), reedMat); pillow.position.set(-1.33, 0.1, -3.05); roof.add(W.shadows(pillow));
    const fmat = W.rbox(0.95, 0.035, 1.6, reedMat, { r: 0.012 }); fmat.position.set(1.05, 0, -3.7); fmat.rotation.y = -0.15; roof.add(fmat);
    const fold = W.rbox(0.5, 0.09, 0.4, wool, { r: 0.04 }); fold.position.set(1.15, 0.035, -4.25); roof.add(fold);
    const staff = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.022, 0.028, 1.75, 16)), darkPl); staff.position.set(3.3, 0.85, -4.3); staff.rotation.z = -0.2; roof.add(W.shadows(staff));
    const lamp = clayLamp(5, 1.6); lamp.scale.setScalar(1.25); lamp.position.set(-0.05, 0.035, -3.0); lamp.rotation.y = 2.4; roof.add(lamp);
    const sm1 = smoke(); sm1.position.set(-0.05 + Math.sin(2.4) * 0.11, 0.09, -3.0 + Math.cos(2.4) * 0.11); roof.add(sm1);
    K.roof = { lamp, smoke: sm1, lampW: [-0.05, R + 0.08, -3.0], matW: [-1.3, R, -2.3], staffW: [1.85, R + 1.0, -5.9] };
    // ---- the brothers asleep around the embers of the fire (bedrolls radial to the pit)
    const FP = [7.2, -4.5], cols = [0x7a3a22, 0x5a6030, 0x3a3634, 0x9a7034, 0x6a2a1c, 0x4a5a3a, 0x2e2c2a, 0x8a6a3a, 0x5a3424, 0x6a6a52];
    K.sleepers = [];
    for (let i = 0; i < 10; i++) {
      const a = (62 + i * 25.5) * Math.PI / 180, rr = 2.9 + (i % 2) * 0.25, x = FP[0] + Math.cos(a) * rr, z = FP[1] + Math.sin(a) * rr;
      const wm = wool.clone(); wm.color.set(cols[i]); const sl = sleeper(wm, reedMat, i + 1);
      sl.position.set(x, hy(x, z) + 0.01, z); sl.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)) + (i % 3 - 1) * 0.12; sc.add(sl); K.sleepers.push(sl);
    }
    // ---- the sheep-pen gate (a wattle hurdle between two posts) and its drop latch
    const pen = P.pen, gap = 0.7, ang = 0.9, PC = [12, -10], nrm = [Math.sin(ang), Math.cos(ang)], GC = [PC[0] + 4.6 * nrm[0], PC[1] + 4.6 * nrm[1]];
    const gate = new THREE.Group(); gate.position.set(GC[0], hy(...GC) - 0.05, GC[1]); gate.rotation.y = ang; sc.add(gate);
    const gw = 2 * 4.6 * Math.sin(gap / 2) - 0.2;
    for (const s of [-1, 1]) { const po = W.rbox(0.16, 1.45, 0.16, darkPl, { r: 0.03 }); po.position.set(s * gw / 2, 0, 0); gate.add(po); }
    for (let k = 0; k < 4; k++) { const rl = W.rbox(gw - 0.25, 0.09, 0.05, planks, { r: 0.015 }); rl.position.set(0, 0.2 + k * 0.3, 0); gate.add(rl); }
    for (let k = 0; k < 7; k++) { const st = W.rbox(0.07, 1.1, 0.04, planks, { r: 0.012 }); st.position.set(-gw / 2 + 0.3 + k * (gw - 0.6) / 6, 0.15, 0.045); st.rotation.z = (k % 2 - 0.5) * 0.06; gate.add(st); }
    const hook = W.rbox(0.07, 0.16, 0.08, darkPl, { r: 0.015 }); hook.position.set(gw / 2 - 0.02, 1.06, 0.12); gate.add(hook);
    const latchPiv = new THREE.Group(); latchPiv.position.set(gw / 2 - 0.62, 1.12, 0.12); gate.add(latchPiv);
    const latch = W.rbox(0.68, 0.06, 0.05, planks, { r: 0.015 }); latch.position.set(0.32, -0.03, 0); latchPiv.add(latch);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 12).rotateX(Math.PI / 2), W.ironMat()); latchPiv.add(pin);
    W.shadows(gate);
    K.gate = { latchPiv, GC, nrm, gw, y: hy(...GC) - 0.05 };
    // ---- a wall-niche lamp beside the door (the last shot): a stone shelf on the front wall
    const shelf = W.rbox(0.36, 0.06, 0.22, await W.pbr('rustic_stone_wall', { tile: 1.2, tint: 0xeee2cc, res: 1024 }), { r: 0.015 }); shelf.position.set(1.15, h0 + 1.42, -0.48); sc.add(W.shadows(shelf));
    const nl = clayLamp(11, 0.7); nl.position.set(1.15, h0 + 1.48, -0.44); nl.rotation.y = 0.3; sc.add(nl); K.niche = nl;
    // ---- the dream sky: the eleven stars with a gold sun disc and a pale moon disc, as light
    const E11 = elevenStars(THREE, { size: 17 }), dream = new THREE.Group(); dream.add(E11); sc.add(dream);
    const disc = (cols2, size) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      cols2.forEach(([s, col]) => g.addColorStop(s, col)); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, toneMapped: false })); };
    const sunD = disc([[0, 'rgba(255,236,190,1)'], [0.16, 'rgba(255,214,130,1)'], [0.2, 'rgba(255,190,90,0.55)'], [0.45, 'rgba(255,160,60,0.12)'], [1, 'rgba(255,140,40,0)']], 150);
    const moonD = disc([[0, 'rgba(225,232,245,0.95)'], [0.14, 'rgba(205,215,235,0.9)'], [0.17, 'rgba(180,195,230,0.25)'], [0.4, 'rgba(160,180,230,0.06)'], [1, 'rgba(150,170,220,0)']], 140);
    const c = V3(...EC), up = V3(0, 1, 0), rgt = new THREE.Vector3().crossVectors(c, up).normalize(), uu = new THREE.Vector3().crossVectors(rgt, c).normalize();
    const place = (m, dx, dy) => { const d = c.clone().addScaledVector(rgt, dx).addScaledVector(uu, dy).normalize(); m.position.copy(d.multiplyScalar(1250)); m.lookAt(0, 0, 0); dream.add(m); };
    place(sunD, -0.075, 0.03); place(moonD, 0.075, 0.03);
    K.dream = { group: dream, E11, sun: sunD, moon: moonD, axis: rgt.clone(), c };
    // ---- cameras
    const G0 = (x, z, dy) => [x, hy(x, z) + dy, z], far = (p, d, s = 40) => p.map((v, i) => v + d[i] * s);
    const roofLow = [-0.6, R + 0.5, -0.9];
    K.cams = {
      roofUpA: { pos: roofLow, look: far(roofLow, [EC[0], EC[1] * 0.55, EC[2]]), fov: fv(72) },
      roofUpB: { pos: [-0.62, R + 0.48, -0.95], look: far([-0.62, R + 0.48, -0.95], [EC[0], EC[1] * 0.85, EC[2]]), fov: fv(70) },
      bow: { pos: [-0.6, R + 0.6, -1.0], look: far([-0.6, R + 0.6, -1.0], [EC[0], EC[1] - (PORT ? 0.1 : 0.05), EC[2]]), fov: fv(44) },
      blanketA: { pos: [-0.55, R + 0.62, -1.35], look: [-1.3, R + 0.06, -2.2], fov: fv(36) },
      blanketB: { pos: [-0.75, R + 0.52, -1.55], look: [-1.3, R + 0.06, -2.3], fov: fv(32) },
      roofA: { pos: [-2.6, R + 1.0, -0.9], look: [0.5, R + 0.2, -3.9], fov: fv(40) },
      roofB: { pos: [-2.25, R + 0.95, -1.3], look: [0.5, R + 0.2, -3.9], fov: fv(39) },
      lampA: { pos: [-0.95, R + 0.5, -1.9], look: [0.2, R + 0.12, -3.4], fov: fv(34) },
      lampB: { pos: [-0.72, R + 0.42, -2.2], look: [0.2, R + 0.12, -3.4], fov: fv(30) },
      replay: { pos: [0.1, R + 1.1, -2.2], look: far([0.1, R + 1.1, -2.2], [EC[0], EC[1] - 0.08, EC[2]]), fov: fv(56) },
      bowCloseA: { pos: [0.1, R + 1.1, -2.2], look: far([0.1, R + 1.1, -2.2], EC), fov: fv(40) },
      bowCloseB: { pos: [0.1, R + 1.1, -2.2], look: far([0.1, R + 1.1, -2.2], EC), fov: fv(33) },
      warnA: { pos: [1.4, R + 1.3, -3.6], look: [7.2, hy(7.2, -4.5) + 0.3, -4.6], fov: fv(44) },
      warnB: { pos: [1.9, R + 1.3, -3.75], look: [7.2, hy(7.2, -4.5) + 0.2, -4.6], fov: fv(38) },
      panA: { pos: [3.0, R + 1.25, -3.2], look: [2.4, R + 0.3, -4.2], fov: fv(40) },
      panB: { pos: [3.0, R + 1.25, -3.2], look: [7.2, hy(7.2, -4.5), -4.5], fov: fv(40) },
      bedA: { pos: G0(3.2, -6.4, 0.95), look: [7.6, hy(7.6, -3.4) + 0.05, -3.4], fov: fv(44) },
      bedB: { pos: G0(3.8, -6.0, 0.85), look: [7.6, hy(7.6, -3.4) + 0.05, -3.4], fov: fv(40) },
      door: { pos: [0.5, h0 + 1.35, 2.3], look: [0, h0 + 1.0, -0.8], fov: fv(38) },
      lampOut: { pos: [-0.05 + 0.32, R + 0.2, -3.0 + 0.36], look: [-0.05, R + 0.08, -3.0], fov: fv(30) },
      latchA: { pos: [GC[0] + nrm[0] * 1.7 + nrm[1] * 0.4, K.gate.y + 1.45, GC[1] + nrm[1] * 1.7 - nrm[0] * 0.4], look: [GC[0] + nrm[1] * (gw / 2 - 0.3), K.gate.y + 1.0, GC[1] - nrm[0] * (gw / 2 - 0.3)], fov: fv(40) },
      niche: { pos: [1.15 + 0.18, h0 + 1.62, -0.44 + 0.62], look: [1.15, h0 + 1.53, -0.44], fov: fv(34) },
    };
    { const a = K.cams.latchA; K.cams.latchB = { ...a, pos: L3(a.pos, a.look, 0.18) }; }
    HILLS.update(0, 0, {}); G.R.compile(HILLS.scene, HILLS.camera);
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams;
    let cam, dreamOp = 0, bow = 0, spin = 0, night = 1, expo = 1.0, fire = 0.12;
    // ------------------------------------------------------------ shots
    if (t < 2.43) { cam = camL(C.roofUpA, C.roofUpB, E.inOutSine(prog(t, 0, 2.43))); dreamOp = 1; bow = -3 * E.inOutSine(prog(t, 0.4, 2.43)); }
    else if (t < 4.17) { cam = C.bow; dreamOp = 1; bow = -3 - 9 * E.inOutSine(prog(t, 2.43, 4.0)); }
    else if (t < 6.85) { cam = camL(C.blanketA, C.blanketB, E.inOutSine(prog(t, 4.17, 6.85))); night = 0.35; }
    else if (t < 9.06) { cam = camL(C.roofA, C.roofB, E.inOutSine(prog(t, 6.85, 9.06))); night = 0.45; }
    else if (t < 11.51) { cam = camL(C.lampA, C.lampB, E.inOutSine(prog(t, 9.06, 11.51))); night = 0.45; }
    else if (t < 14.25) { cam = C.replay; dreamOp = 0.75; spin = 0.05 * (t - 11.51); night = 0.7; }
    else if (t < 16.83) { cam = camL(C.bowCloseA, C.bowCloseB, E.inOutSine(prog(t, 14.25, 16.83))); dreamOp = 0.85; bow = -10 * E.inOutSine(prog(t, 14.3, 16.6)); night = 0.7; }
    else if (t < 19.09) { cam = camL(C.warnA, C.warnB, E.inOutSine(prog(t, 16.83, 19.09))); night = 0.4; }
    else if (t < 20.97) { cam = camL(C.panA, C.panB, E.inOutSine(prog(t, 19.09, 20.97))); night = 0.38; }
    else if (t < 23.43) { cam = camL(C.bedA, C.bedB, E.inOutSine(prog(t, 20.97, 23.43))); night = 0.35; }
    else if (t < 25.71) { cam = C.door; night = 0.2; }
    else if (t < 27.67) { cam = C.lampOut; night = 0.2; }
    else if (t < 29.42) { cam = camL(C.latchA, C.latchB, E.inOutSine(prog(t, 27.67, 29.42))); night = 0.15; }
    else { cam = C.niche; night = 0.15; }
    // ------------------------------------------------------------ world state (pure in t)
    const P = HILLS.set.props, sky = P.sky.userData.u;
    const dawn = lerp(0.35, 1.1, sm(prog(t, 4.0, 30)));                         // the band of first light in the east grows all film
    sky.sunD.value.set(0.52, -0.06, -0.85).normalize(); sky.sunC.value.setRGB(1.0 * dawn, 0.58 * dawn, 0.22 * dawn); sky.glow.value = 1.0; sky.sunDisc.value = 2.0;
    sky.moonD.value.set(-0.93, 0.2, -0.3).normalize(); sky.moonOn.value = 1;
    expo = dreamOp > 0 ? 1.25 : t > 29.42 ? 0.7 : 0.88;
    // the roof lamp burns all night and goes out when its oil runs dry (shot 12); smoke rises after
    const tOut = 26.35, kRoof = 1 - sm((t - tOut) / 0.75);
    K.roof.lamp.userData.set(t, kRoof * (0.92 + 0.08 * Math.sin(t * 7.3)), 0.05 * Math.sin(t * 2.3));
    const sAge = prog(t, tOut + 0.3, tOut + 1.6); K.roof.smoke.userData.set(t, (1 - sm((t - 30) / 1)) * (t > tOut + 0.3 ? 1 : 0), sAge);
    // the niche lamp: a draught bends the flame, it steadies (last shot)
    const gust = Math.exp(-((t - 30.0) ** 2) / 0.25);
    K.niche.userData.set(t, 1 - 0.25 * gust, 0.45 * gust * Math.sin(Math.min(1, (t - 29.4) / 1.2) * Math.PI));
    // sleepers breathe; one turns over at 21.6
    K.sleepers.forEach((s, i) => { const b = s.userData, br = Math.sin((t * b.rate) * Math.PI * 2 + b.ph);
      b.body.scale.y = 1 + 0.035 * br; b.body.scale.x = 1 + 0.012 * br;
      if (i === 5) { const k = E.inOutCubic(prog(t, 21.6, 22.6)); b.body.rotation.z = 0.35 * k; b.body.position.x = -0.06 * k; b.head.rotation.z = 0.3 * k; } });
    // the pen latch drops into its hook (gravity: t^2 fall, one small bounce)
    { const tt = t - 28.15; let a = 1.05; if (tt > 0) { const fall = 1.05 - 9 * tt * tt; a = fall > 0 ? fall : Math.max(0, 0.06 * Math.sin(Math.PI * Math.min(1, (tt - Math.sqrt(1.05 / 9)) / 0.16))); } K.gate.latchPiv.rotation.z = a; }
    // the dream sky follows the camera; it bows (rotates about its own horizontal axis) and turns slowly in the replay
    const dg = K.dream.group; dg.position.set(...cam.pos);
    dg.quaternion.setFromAxisAngle(K.dream.axis, bow * Math.PI / 180).multiply(new THREE.Quaternion().setFromAxisAngle(K.dream.c, spin));
    K.dream.E11.userData.update(t, null, { op: Math.max(dreamOp, 0.55 * (1 - sm((t - 4) / 20))), zoom: cam.fov < 40 ? 1.2 : 1, hi: 0 });
    K.dream.sun.visible = K.dream.moon.visible = dreamOp > 0;
    K.dream.sun.material.opacity = K.dream.moon.material.opacity = dreamOp;
    G.renderSet(ctx, HILLS, t, u, { cam, exposure: expo, fire });
    // the last shot sinks to a dark warm frame under the seal
    const dk = sm(prog(t, 31.0, D));
    if (dk > 0) { ctx.fillStyle = `rgba(14,6,2,${0.55 * dk})`; ctx.fillRect(0, 0, FW, FH); }
    CAP.draw(ctx, t);
    const su = prog(t, 30.82, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
