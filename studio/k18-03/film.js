// k18-03 "Never Say 'I'll Do It Tomorrow' Without This" (Al-Kahf 18:23-24). A hill-village courtyard.
// A thumb scratches the seventh tally mark into the clay wall; at dusk a man lines up his tools for tomorrow and
// stands looking at them; the lamp throws his shadow over them; the night passes; grey morning, the same tools;
// a cord is wound round a finger as a reminder; the first sun over the wall; an open hand; the thumb on the marks.
// The man is seen only from behind, as a shadow, or as hands. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { city_of_old } from '../lib_shared/sets_kahf.js';
import { PALETTES } from '../lib_shared/people.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);
const D = 29.91;

let DUSK, MORN, CAP, MAN, gy, FRONT, TALLY = {}, CRUMBS, CORD, LAMPL, MLIGHT;
const C = {};
const WALLX = -4 + 0.226, TZ = -1.8, TY = 1.35;                 // tally plane (west wall), centre
const markZ = (i) => TZ - (((20 + i * 30) / 256) - 0.5) * 0.42;  // mark i (0..6) in world z
const SCR0 = 0.25, SCR1 = 1.25;                                  // the fresh scratch is drawn
const scratchK = (t) => t < 26.96 ? E.inOutSine(prog(t, SCR0, SCR1)) : 1;

// shot table: set 'd' (dusk) or 'm' (morning)
const SHOTS = [
  { t0: 0.00, t1: 1.55, set: 'd', a: 'tally_a', b: 'tally_b', who: 'tally' },
  { t0: 1.55, t1: 3.11, set: 'd', a: 'rack_a', b: 'rack_b', who: 'tally', ease: E.inOutSine },
  { t0: 3.11, t1: 4.58, set: 'd', a: 'back_a', b: 'back_b', who: 'tools', ease: E.inOutSine },
  { t0: 4.58, t1: 6.06, set: 'd', a: 'hips_a', b: 'hips_b', who: 'hips' },
  { t0: 6.06, t1: 8.11, set: 'd', a: 'push_a', b: 'push_b', who: 'shadow', ease: E.inOutSine },
  { t0: 8.11, t1: 10.15, set: 'd', a: 'lamp', who: 'leave' },
  { t0: 10.15, t1: 12.69, set: 'm', a: 'push_b', who: 'none' },
  { t0: 12.69, t1: 15.24, set: 'm', a: 'cord_a', b: 'cord_b', who: 'hand', ease: E.inOutSine },
  { t0: 15.24, t1: 17.78, set: 'm', a: 'cord_b', who: 'hand' },
  { t0: 17.78, t1: 20.32, set: 'm', a: 'wide_a', b: 'wide_b', who: 'none', ease: E.inOutSine },
  { t0: 20.32, t1: 22.52, set: 'm', a: 'sun_a', b: 'sun_b', who: 'none' },
  { t0: 22.52, t1: 24.52, set: 'm', a: 'open', who: 'hand' },
  { t0: 24.52, t1: 26.96, set: 'm', a: 'knot', who: 'hand' },
  { t0: 26.96, t1: D, set: 'm', a: 'tally_a', b: 'tally_c', who: 'tally' },
];
// where the man stands for each action
const STAND = { tally: [WALLX + 0.52, -1.62, -Math.PI / 2], tools: [0, 0, Math.PI], hips: [0, 0, Math.PI], hand: [-1.6, 1.6, 0.35] };

function poseMan(t, s) {
  const p = MAN, who = s.who;
  p.object3d.visible = who !== 'none' && who !== 'leave' ? true : who === 'leave' && t < 9.2;
  if (!p.object3d.visible) return;
  if (who === 'tally') {
    const [x, z, yaw] = STAND.tally; K.place(p, x, gy, z, yaw); p.setPose('stand', 1.2);
    // thumb at the 7th mark: drags down while scratching; rests there at the end; lowers away in shot 2
    const k = scratchK(t), y = gy + TY + 0.06 - 0.12 * k, away = t > 1.55 && t < 26 ? E.inOutSine(prog(t, 1.9, 2.9)) : 0;
    const tip = V(WALLX + 0.035, y, markZ(6) + 0.015);
    K.place(p, x, gy, z, yaw); p.object3d.updateMatrixWorld(true);
    const h0 = K.onBody(p, -0.22, 0.85, 0.05), wrist = tip.clone().add(V(0.085, 0.07, 0.03)), tgt = wrist.clone().lerp(h0, away);
    K.reach(p, 'Right', tgt, K.onBody(p, -0.7, 0.8, -0.3)); K.handAim(p, 'Right', tgt.clone().add(V(-0.09, -0.07, -0.03)), 1.2); K.flatHand(p, 'Right', 0.9);
  } else if (who === 'tools' || who === 'hips' || who === 'shadow' || who === 'leave') {
    const walk = who === 'leave' ? clamp((t - 8.11) / 1.1) : 0;
    const sx = who === 'shadow' || who === 'leave' ? 1.25 : 0.7, sz = who === 'shadow' || who === 'leave' ? 1.15 : 1.45;
    K.place(p, FRONT.x + sx + 1.4 * walk, gy, FRONT.z + sz + 0.6 * walk, (who === 'shadow' || who === 'leave' ? Math.PI - 0.5 : Math.PI) + 1.7 * walk); p.setPose(walk > 0 ? 'walk' : 'stand', t);
    if (who === 'tools') { K.tilt(p, 'Spine', 14 * (1 - E.inOutSine(prog(t, 3.6, 4.4))), 0, 0); K.tilt(p, 'Neck', 12, 0, 0); }
    if (who === 'hips' || who === 'shadow') {
      const k = who === 'hips' ? E.inOutSine(prog(t, 4.6, 5.2)) : 1;
      K.reach(p, 'Left', K.onBody(p, 0.2, 1.0, -0.02), K.onBody(p, 0.8, 1.1, -0.4)); K.reach(p, 'Right', K.onBody(p, -0.2, 1.0, -0.02), K.onBody(p, -0.8, 1.1, -0.4));
      if (k < 1) p.setPose('stand', t);
      K.tilt(p, 'Neck', 10, 0, 0);
    }
  } else if (who === 'hand') {
    const [x, z, yaw] = STAND.hand; K.place(p, x, gy, z, yaw); p.setPose('stand', 3.0);
    // left hand raised in front of the chest, palm up; fingers curl over the cord, then open
    const H = K.onBody(p, 0.1, 1.17, 0.3); K.reach(p, 'Left', H, K.onBody(p, 0.7, 0.7, -0.4));
    K.handAim(p, 'Left', K.onBody(p, 0.05, 1.19, 0.6), 1.45);
    const open = t < 15.24 ? 0.85 : t < 17.78 ? 0.85 - 0.6 * E.inOutSine(prog(t, 15.5, 16.6)) : t < 24.52 ? 0.25 : 0.4;
    K.flatHand(p, 'Left', open);
  }
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    const d = await city_of_old({ time: 'dusk', yard: 'tools' });
    const m = await city_of_old({ time: 'sunrise', yard: 'tools' });
    gy = d.props.terrain.heightAt(0, 0);
    // FRONT: where the tools line up, by the low doorway
    const lad = d.props.ladder.position; FRONT = V(lad.x - 1.3, gy, lad.z + 0.05);
    // my own tally texture (six old marks + the fresh seventh, drawn as a pure function of t)
    for (const [S, key] of [[d, 'd'], [m, 'm']]) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      S.props.tally.material = S.props.tally.material.clone(); S.props.tally.material.map = tx; TALLY[key] = { c, tx, k: -1 };
    }
    // the doorway lamp throws his shadow over the tools (dusk set): move it into the yard, low, and let it cast shadows
    const L = d.props.lamps[0]; L.position.set(FRONT.x + 2.6, gy + 0.02, FRONT.z + 2.7); L.rotation.y = 2.3;
    L.traverse((o) => { if (o.isPointLight) { o.castShadow = true; o.shadow.mapSize.set(1024, 1024); o.shadow.bias = -0.002; o.distance = 9; LAMPL = o; } });
    m.props.lamps[0].position.copy(L.position); m.props.lamps[0].visible = false;
    // the morning: a cold fill that warms as the sun clears the wall
    MLIGHT = new THREE.HemisphereLight(0xb8c4d8, 0x5a4a3a, 0.0); m.scene.add(MLIGHT);
    // clay crumbs that fall from the fresh scratch
    { const N = 40, g = new THREE.SphereGeometry(0.0022, 6, 4), mm = new THREE.MeshStandardMaterial({ color: 0xa88a64, roughness: 1 });
      CRUMBS = new THREE.InstancedMesh(g, mm, N); CRUMBS.userData.r = Array.from({ length: N }, (_, k) => { const r = W.rng(50 + k); return [r(), r(), r()]; }); }
    // the reminder cord: a loose helix round the index finger, wound as a pure function of t (child of the finger bone)
    const PE = await K.people();
    MAN = PE.make({ kind: 'man', outfit: 'worker', palette: { ...PALETTES.earth, robe: '#8a6a4a', wrap: '#cfc2a8', skin: '#8e5e3e' }, beard: 'short', headwear: 'wrap', seed: 33, detail: 1 });
    { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2 * 2.3, y = 0.006 + 0.016 * i / 160; pts.push(V(Math.cos(a) * 0.0095, y, Math.sin(a) * 0.0095)); }
      pts.push(V(0.02, 0.03, 0.0), V(0.035, 0.024, 0.006));
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.0014, 8);
      CORD = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x7a2618, roughness: 0.8 })); CORD.userData.n = g.index.count; CORD.castShadow = true;
      const b = MAN.bones('LeftHandIndex1'); b.add(CORD); CORD.scale.setScalar(100); CORD.rotation.set(0, 0, 0); }
    DUST_SET = { d, m };
    SUN = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false, fog: false, transparent: true, depthWrite: false }));
    { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.42, 'rgba(255,236,190,1)'); g.addColorStop(0.5, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      SUN.material.map = new THREE.CanvasTexture(c); SUN.material.color.set(0xffffff); SUN.scale.setScalar(2.4); }
    m.scene.add(SUN);
    // cameras
    C.tally_a = { pos: [WALLX + 0.5, gy + TY + 0.04, markZ(6) - 0.34], look: [WALLX, gy + TY - 0.01, markZ(4)], fov: 30 };
    C.tally_b = { pos: [WALLX + 0.48, gy + TY + 0.03, markZ(6) - 0.33], look: [WALLX, gy + TY - 0.02, markZ(4)], fov: 29 };
    C.tally_c = { pos: [WALLX + 0.49, gy + TY + 0.035, markZ(6) - 0.335], look: [WALLX, gy + TY - 0.01, markZ(4)], fov: 29.5 };
    C.rack_a = { pos: [WALLX + 0.48, gy + TY + 0.03, markZ(6) - 0.33], look: [WALLX, gy + TY - 0.02, markZ(5)], fov: 27 };
    C.rack_b = { pos: [WALLX + 0.5, gy + TY + 0.05, markZ(6) - 0.3], look: [WALLX, gy + TY, markZ(1)], fov: 26 };
    C.back_a = { pos: [FRONT.x + 1.5, gy + 1.55, FRONT.z + 3.9], look: [FRONT.x - 0.4, gy + 0.7, FRONT.z], fov: 44 };
    C.back_b = { pos: [FRONT.x + 1.3, gy + 1.5, FRONT.z + 3.5], look: [FRONT.x - 0.4, gy + 0.7, FRONT.z], fov: 43 };
    C.hips_a = { pos: [FRONT.x + 1.9, gy + 1.25, FRONT.z + 4.1], look: [FRONT.x - 0.1, gy + 0.9, FRONT.z], fov: 40 };
    C.hips_b = { pos: [FRONT.x + 1.8, gy + 1.22, FRONT.z + 3.85], look: [FRONT.x - 0.1, gy + 0.9, FRONT.z], fov: 39 };
    C.push_a = { pos: [FRONT.x + 0.2, gy + 1.15, FRONT.z + 2.5], look: [FRONT.x - 0.9, gy + 0.4, FRONT.z + 0.15], fov: 46 };
    C.push_b = { pos: [FRONT.x - 0.1, gy + 0.95, FRONT.z + 1.95], look: [FRONT.x - 0.9, gy + 0.35, FRONT.z + 0.15], fov: 44 };
    C.lamp = { pos: [FRONT.x + 1.75, gy + 0.38, FRONT.z + 3.55], look: [FRONT.x + 2.55, gy + 0.1, FRONT.z + 2.7], fov: 36 };
    poseMan(13, SHOTS[7]); const hd = MAN.bones('LeftHand').getWorldPosition(V()); console.error(`[k18-03] hand ${hd.toArray().map((v) => v.toFixed(2))}`);
    C.cord_a = { pos: [hd.x + 0.12, hd.y + 0.3, hd.z + 0.34], look: [hd.x, hd.y, hd.z], fov: 26 };
    C.cord_b = { pos: [hd.x + 0.1, hd.y + 0.25, hd.z + 0.28], look: [hd.x, hd.y, hd.z], fov: 24 };
    C.open = { pos: [hd.x + 0.14, hd.y + 0.34, hd.z + 0.38], look: [hd.x, hd.y, hd.z], fov: 28 };
    C.knot = { pos: [hd.x + 0.07, hd.y + 0.18, hd.z + 0.2], look: [hd.x, hd.y, hd.z], fov: 20 };
    C.wide_a = { pos: [2.8, gy + 1.7, 3.0], look: [-1.0, gy + 1.0, -2.8], fov: 54 };
    C.wide_b = { pos: [1.6, gy + 1.7, 3.2], look: [-1.6, gy + 1.0, -2.8], fov: 54 };
    C.sun_a = { pos: [0.8, gy + 0.75, -2.2], look: [-4.2, gy + 2.6, -0.6], fov: 30 };
    C.sun_b = { pos: [0.8, gy + 0.62, -2.2], look: [-4.2, gy + 2.6, -0.6], fov: 30 };
    DUSK = W.stage(d); MORN = W.stage(m);
    for (const st of [DUSK, MORN]) { st.scene.add(CRUMBS); st.set.update(0, null, {}); }
    DUSK.scene.add(MAN.object3d); G.R.compile(DUSK.scene, DUSK.camera); MORN.scene.add(MAN.object3d); G.R.compile(MORN.scene, MORN.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-03] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    const ST = s.set === 'd' ? DUSK : MORN, key = s.set;
    if (MAN.object3d.parent !== ST.scene) ST.scene.add(MAN.object3d);
    if (CRUMBS.parent !== ST.scene) ST.scene.add(CRUMBS);
    poseMan(t, s);
    let cam = K.camLerp(C[s.a], s.b ? C[s.b] : null, (s.ease || E.linear)(p));
    if (s.who === 'hand') {
      // over his left shoulder, from behind: the hand, the sleeve, the cord (never the face)
      const hp = K.handPos(MAN, 'Left'), k = (s.ease || E.linear)(p);
      const near = { 7: [0.42, 1.92, -0.62, 30], 8: [0.4, 1.88, -0.55, 26], 11: [0.45, 1.95, -0.68, 32], 12: [0.38, 1.82, -0.45, 22] }[i] || [0.42, 1.92, -0.62, 30];
      const pos = K.onBody(MAN, near[0] - 0.02 * k, near[1] - 0.03 * k, near[2] + 0.05 * k);
      cam = { pos: pos.toArray(), look: hp.toArray(), fov: K.lensFov(near[3]) };
    }
    cam = K.breathe(cam, t, 0.0008, 3 + i);
    // tally texture (redrawn only when the fresh mark changes)
    { const T = TALLY[key], k = Math.round(scratchK(t) * 200) / 200; if (T.k !== k) { T.k = k; const x = T.c.getContext('2d'); x.clearRect(0, 0, 512, 256); x.lineCap = 'round';
        for (let j = 0; j < 7; j++) { const X = (20 + j * 30) * 2, len = j < 6 ? 1 : k; if (len <= 0) continue; const y0 = 50, y1 = 50 + 160 * len;
          x.strokeStyle = 'rgba(40,24,14,0.92)'; x.lineWidth = 8; x.beginPath(); x.moveTo(X + (j % 2) * 3, y0); x.lineTo(X - 4 + (j % 3), y1); x.stroke();
          x.strokeStyle = j < 6 ? 'rgba(150,110,80,0.35)' : 'rgba(210,170,130,0.75)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X + 2, y0 + 4); x.lineTo(X, y1 - 4); x.stroke(); }
        T.tx.needsUpdate = true; } }
    // crumbs: fall from the scratch point while it is drawn (and settle out of frame)
    { const M4 = new THREE.Matrix4(), r = CRUMBS.userData.r;
      r.forEach(([a, b, c], j) => { const tb = SCR0 + a * (SCR1 - SCR0), dt = t - tb, y0 = gy + TY + 0.06 - 0.12 * clamp((tb - SCR0) / (SCR1 - SCR0));
        const on = dt > 0 && dt < 1.2 && t < 3.2; M4.makeTranslation(WALLX + 0.008 + 0.06 * b * dt, on ? y0 - 4.9 * dt * dt : -10, markZ(6) + (c - 0.5) * 0.02); CRUMBS.setMatrixAt(j, M4); }); CRUMBS.instanceMatrix.needsUpdate = true; }
    // the cord winds round the finger during shot 8 and stays
    { const w = t < 12.69 ? 0 : clamp((t - 12.9) / 2.0); CORD.visible = w > 0.01; CORD.geometry.setDrawRange(0, Math.floor(CORD.userData.n * w / 3) * 3); }
    // lights: the lamp burns lower through the night; morning grey -> first sun
    const night = E.inOutSine(prog(t, 6.0, 10.1)), sunUp = E.inOutSine(prog(t, 20.4, 22.3));
    DUSK.set.props.setLights(0.6 + 0.4 * night);
    const fl = DUSK.set.props.lamps[0].userData.flame; fl.scale.setScalar(1 - 0.35 * E.inOutSine(prog(t, 8.2, 10.1)));
    MORN.set.props.sun.intensity = 0.4 + 2.4 * (t < 20.32 ? 0 : sunUp);
    MLIGHT.intensity = t < 20.32 ? 0.6 : 0.6 - 0.4 * sunUp;
    DUSK.bloom = i === 5 ? 0.05 : DUSK.set.bloom;
    { const k = E.inOutSine(prog(t, 20.4, 22.5)), cpos = V(...C.sun_a.pos), dir = V(...C.sun_a.look).sub(cpos).normalize();
      const at = cpos.clone().addScaledVector(dir, 70); at.y += -7.5 + 9.5 * k; SUN.position.copy(at); SUN.lookAt(cpos); SUN.visible = i === 10; }
    const ex = s.set === 'd' ? (i === 5 ? 0.75 : 1.0) : i === 10 ? 0.55 : (t < 20.32 ? 0.9 : 1.0);
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex, lamp: s.set === 'd' ? 1 - 0.3 * E.inOutSine(prog(t, 8.2, 10.1)) : 0 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
let DUST_SET = null, SUN = null;
