// k18-07 "Wealth and Children Are an Adornment. What Lasts?" (Al-Kahf 18:46, 18:30). A small stone courtyard.
// A hand lays a silver bracelet on a dish of gold coins; pan to a child's sandals and hoop; glints on each; the same mat
// again, warm and steady, a hand sets down bread and dates; a lamp is set in the wall niche; a cup waters a palm sapling
// in the corner where a grown palm stands; the coins in shadow; the flame; a new leaf; the lamp glow turns gold (loop).
// Hands and sleeves only. Pure function of time; seeded noise only.
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
const D = 33.63;

let SET, ST, CAP, gy, P, DISH, BR0, LAMP0, POT0, SAP, MAN, CUP, DROPS = [], WETSPOT, GLINT, NICHE, PALMTOP = 6;
const C = {};
const POT = [-2.25, 1.85];

const SHOTS = [
  { t0: 0.00, t1: 2.05, a: 'mat', b: 'mat_b', who: 'bracelet' },
  { t0: 2.05, t1: 4.09, a: 'br_a', b: 'br_b', who: 'bracelet', ease: E.inOutSine },
  { t0: 4.09, t1: 6.13, a: 'pan_a', b: 'pan_b', ease: E.inOutSine },
  { t0: 6.13, t1: 7.15, a: 'coins', glint: 'coins' },
  { t0: 7.15, t1: 8.17, a: 'brace', glint: 'brace' },
  { t0: 8.17, t1: 9.19, a: 'sandals', glint: 'sandals' },
  { t0: 9.19, t1: 10.22, a: 'hoop', glint: 'hoop' },
  { t0: 10.22, t1: 13.18, a: 'mat', b: 'mat_b', who: 'bowl', warm: true },
  { t0: 13.18, t1: 16.14, a: 'niche_a', b: 'niche_b', who: 'lamp', warm: true, ease: E.inOutSine },
  { t0: 16.14, t1: 18.91, a: 'pot_a', b: 'pot_b', who: 'water', warm: true, ease: E.inOutSine },
  { t0: 18.91, t1: 21.67, a: 'soil', warm: true },
  { t0: 21.67, t1: 24.43, a: 'tilt_a', b: 'tilt_b', warm: true, ease: E.inOutSine },
  { t0: 24.43, t1: 26.29, a: 'coins', shade: true, warm: true },
  { t0: 26.29, t1: 28.09, a: 'flame', warm: true },
  { t0: 28.09, t1: 30.47, a: 'leaf', warm: true },
  { t0: 30.47, t1: 32.05, a: 'niche_b', warm: true },
  { t0: 32.05, t1: D, a: 'glow_a', b: 'glow_b', warm: true, ease: E.inOutSine },
];
// shot index -> step number in the shot list (1-based), for timing notes
function poseMan(t, s) {
  const who = s.who; MAN.object3d.visible = !!who; if (!who) return;
  const at = (x, z, yaw, clip = 'kneel') => { K.place(MAN, x, gy, z, yaw); MAN.setPose(clip, 1.5); MAN.object3d.updateMatrixWorld(true); };
  if (who === 'bracelet' || who === 'bowl') {
    const bx = who === 'bracelet' ? DISH.x : P.bowl.position.x, bz = who === 'bracelet' ? DISH.z : P.bowl.position.z;
    at(bx - 0.5, bz + 0.12, Math.PI / 2);
    const target = who === 'bracelet' ? V(BR0.x, BR0.y + 0.01, BR0.z) : V(P.bowl.position.x - 0.05, gy + 0.1, P.bowl.position.z - 0.02);
    const k = who === 'bracelet' ? E.inOutSine(prog(t, -0.6, 1.6)) * (1 - E.inOutSine(prog(t, 2.9, 3.9))) : E.inOutSine(prog(t, 10.4, 11.6)) * (1 - E.inOutSine(prog(t, 12.2, 13.1)));
    K.tilt(MAN, 'Spine', 22 * k, 0, 0); K.tilt(MAN, 'Spine1', 18 * k, 0, 0); K.tilt(MAN, 'Spine2', 10 * k, 0, 0);
    const h0 = K.handPos(MAN, 'Right'); K.reach(MAN, 'Right', h0.clone().lerp(target.clone().add(V(0.02, 0.05, 0)), k), K.onBody(MAN, -0.8, 0.7, -0.3));
    K.handAim(MAN, 'Right', target.clone().add(V(-0.12, 0.0, 0.04)), 0.6); K.flatHand(MAN, 'Right', 0.7);
  } else if (who === 'lamp') {
    at(NICHE.x - 0.45, NICHE.z + 0.6, Math.PI + 0.45, 'stand');
    const k = E.inOutSine(prog(t, 13.3, 14.6)) * (1 - E.inOutSine(prog(t, 15.0, 16.0)));
    const h0 = K.handPos(MAN, 'Right'), tgt = NICHE.clone().add(V(0.0, 0.03, 0.08));
    K.reach(MAN, 'Right', h0.lerp(tgt, k), K.onBody(MAN, -0.8, 0.6, -0.3)); K.handAim(MAN, 'Right', tgt.clone().add(V(0, 0.02, -0.15)), 1.2); K.flatHand(MAN, 'Right', 0.8);
  } else if (who === 'water') {
    at(POT[0] - 0.12, POT[1] + 0.62, Math.PI);
    const tgt = V(POT[0] + 0.14, gy + 0.55, POT[1] + 0.05);
    const k = E.inOutSine(prog(t, 16.2, 16.9));
    const h0 = K.handPos(MAN, 'Right'); K.reach(MAN, 'Right', h0.lerp(tgt, k), K.onBody(MAN, -0.8, 0.6, -0.3)); K.handAim(MAN, 'Right', tgt.clone().add(V(-0.1, 0.06, 0)), 0.2); K.flatHand(MAN, 'Right', 1.3);
  }
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    SET = await city_of_old({ time: 'golden', yard: 'adornment' });
    P = SET.props; gy = P.terrain.heightAt(0, 0);
    const S = SET.scene;
    DISH = P.dish.position.clone(); BR0 = P.bracelet.position.clone();
    LAMP0 = P.nicheLamp.position.clone(); NICHE = LAMP0.clone();
    // the sapling and its pot move to the corner where the grown palm stands
    P.sapling.pot.position.set(POT[0], gy, POT[1]); P.sapling.tree.object3d.visible = false;
    // the seedling: a few folded palm blades from the soil; a new blade unfolds (shot 13) as a pure function of t
    { SAP = new THREE.Group(); SAP.position.set(POT[0], gy + 0.265, POT[1]); S.add(SAP); const lm = new THREE.MeshStandardMaterial({ color: 0x5a8a34, roughness: 0.55, side: THREE.DoubleSide });
      const blade = (L, w) => { const g = new THREE.PlaneGeometry(w, L, 2, 12).translate(0, L / 2, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k) / L, x = p.getX(k); p.setX(k, x * (1 - 0.8 * y)); p.setZ(k, -Math.abs(x) * 0.6 + 0.05 * L * y * y); } g.computeVertexNormals(); return g; };
      for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(blade(0.2 + 0.05 * (k % 3), 0.026), lm); m.rotation.set(0.25 + 0.1 * (k % 2), k * 1.3, 0); m.castShadow = true; SAP.add(m); }
      const nb = new THREE.Mesh(blade(0.24, 0.03), lm); nb.rotation.set(0.05, 0.6, 0); SAP.add(nb); SAP.userData.nb = nb; }
    { const bb = new THREE.Box3().setFromObject(P.palm); PALMTOP = bb.max.y; }
    // wet soil disc in the pot (darkens as the water sinks in)
    WETSPOT = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e140c, roughness: 0.9, envMapIntensity: 0.1, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    { const bb = new THREE.Box3().setFromObject(P.sapling.pot), rr = Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.44, top = bb.max.y - 0.025;
      const soil = new THREE.Mesh(new THREE.CircleGeometry(rr, 48).rotateX(-Math.PI / 2), await W.pbr('brown_mud_dry', { tile: 0.4, res: 1024, tint: 0x6a4a32 })); soil.position.set((bb.min.x + bb.max.x) / 2, top, (bb.min.z + bb.max.z) / 2); soil.receiveShadow = true; soil.material = soil.material.clone(); soil.material.roughness = 1; soil.material.metalness = 0; soil.material.envMapIntensity = 0.12; S.add(soil);
      SAP.position.set(soil.position.x, top - 0.005, soil.position.z); WETSPOT.position.set(soil.position.x, top + 0.002, soil.position.z); WETSPOT.geometry.scale(rr / 0.1, 1, rr / 0.1); }
    S.add(WETSPOT);
    // a clay cup (hand-held) and the water drops
    CUP = W.lathe([[0.001, 0], [0.03, 0.002], [0.036, 0.05], [0.04, 0.07], [0.037, 0.072], [0.033, 0.052], [0.027, 0.006], [0.001, 0.005]], new THREE.MeshStandardMaterial({ color: 0xa8683e, roughness: 0.8 }), { seg: 48 }); S.add(CUP);
    { const dm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 0.9, thickness: 0.003, ior: 1.33, transparent: true });
      for (let k = 0; k < 10; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), dm); S.add(d); DROPS.push(d); } }
    // glints: small additive stars that twinkle on the coins / bracelet / sandals / hoop
    { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.2, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.strokeStyle = 'rgba(255,250,230,0.9)'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 2); x.lineTo(32, 62); x.moveTo(2, 32); x.lineTo(62, 32); x.stroke();
      const N = 24, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      GLINT = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: 0.02, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); GLINT.frustumCulled = false; S.add(GLINT); }
    const PE = await K.people();
    MAN = PE.make({ kind: 'man', outfit: 'traveller', palette: { ...PALETTES.cream, robe: '#8a7458', wrap: '#9a8468', cloak: '#5a4632', skin: '#8e5e3e' }, beard: 'short', headwear: 'wrap', seed: 71, detail: 0.9 });
    S.add(MAN.object3d);
    // cameras
    const sd = P.sandals[0].position, hp = P.hoop.position;
    { const cx = (DISH.x + P.bowl.position.x) / 2, cz = (DISH.z + P.bowl.position.z) / 2; C.mat = { pos: [cx + 0.2, gy + 1.0, cz + 1.1], look: [cx - 0.05, gy + 0.02, cz], fov: 42 }; C.mat_b = { pos: [cx + 0.16, gy + 0.9, cz + 0.95], look: [cx - 0.05, gy + 0.02, cz], fov: 40 }; }
    C.br_a = { pos: [BR0.x + 0.26, gy + 0.22, BR0.z + 0.28], look: [BR0.x, gy + 0.04, BR0.z], fov: 24 };
    C.br_b = { pos: [BR0.x + 0.2, gy + 0.18, BR0.z + 0.22], look: [BR0.x, gy + 0.04, BR0.z], fov: 22 };
    C.pan_a = { pos: [0.4, gy + 0.85, 1.9], look: [DISH.x, gy + 0.05, DISH.z], fov: 40 };
    C.pan_b = { pos: [0.4, gy + 0.85, 1.9], look: [sd.x - 0.15, gy + 0.12, sd.z], fov: 40 };
    C.coins = { pos: [DISH.x + 0.18, gy + 0.2, DISH.z + 0.2], look: [DISH.x, gy + 0.03, DISH.z], fov: 26 };
    C.brace = { pos: [BR0.x + 0.12, gy + 0.14, BR0.z + 0.16], look: [BR0.x, gy + 0.05, BR0.z], fov: 24 };
    C.sandals = { pos: [sd.x + 0.3, gy + 0.22, sd.z + 0.32], look: [sd.x + 0.05, gy + 0.01, sd.z + 0.02], fov: 26 };
    C.hoop = { pos: [hp.x + 0.7, gy + 0.45, hp.z + 0.85], look: [hp.x, gy + 0.2, hp.z], fov: 34 };
    C.niche_a = { pos: [NICHE.x + 1.25, gy + 1.5, NICHE.z + 1.6], look: [NICHE.x - 0.1, NICHE.y + 0.05, NICHE.z], fov: 36 };
    C.niche_b = { pos: [NICHE.x + 0.95, gy + 1.45, NICHE.z + 1.25], look: [NICHE.x - 0.05, NICHE.y + 0.05, NICHE.z], fov: 34 };
    C.pot_a = { pos: [POT[0] + 0.95, gy + 0.85, POT[1] + 0.55], look: [POT[0] - 0.05, gy + 0.4, POT[1] + 0.05], fov: 38 };
    C.pot_b = { pos: [POT[0] + 0.8, gy + 0.78, POT[1] + 0.45], look: [POT[0] - 0.05, gy + 0.38, POT[1] + 0.05], fov: 36 };
    C.soil = { pos: [POT[0] + 0.45, gy + 0.75, POT[1] + 0.2], look: [POT[0] + 0.02, gy + 0.27, POT[1] + 0.02], fov: 32 };
    C.tilt_a = { pos: [POT[0] + 1.7, gy + 0.55, POT[1] + 1.3], look: [POT[0], gy + 0.35, POT[1]], fov: 44 };
    C.tilt_b = { pos: [POT[0] + 1.7, gy + 0.55, POT[1] + 1.3], look: [P.palm.position.x, PALMTOP - 1.2, P.palm.position.z], fov: 56 };
    C.flame = { pos: [NICHE.x - 0.3, NICHE.y + 0.2, NICHE.z + 1.2], look: [NICHE.x, NICHE.y + 0.1, NICHE.z], fov: 16 };
    C.leaf = { pos: [POT[0] + 0.85, gy + 0.62, POT[1] + 0.5], look: [POT[0], gy + 0.38, POT[1]], fov: 30 };
    C.glow_a = { pos: [NICHE.x - 0.4, NICHE.y + 0.22, NICHE.z + 1.5], look: [NICHE.x, NICHE.y + 0.1, NICHE.z], fov: 20 };
    C.glow_b = { pos: [NICHE.x - 0.3, NICHE.y + 0.2, NICHE.z + 1.15], look: [NICHE.x, NICHE.y + 0.1, NICHE.z], fov: 15 };
    ST = W.stage(SET);
    SET.update(0, null, {}); G.R.compile(S, ST.camera);
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-07] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    // held shots still move: a slow 7 % push toward the subject (never a camera parked in one spot)
    const A = C[s.a], Bp = s.b ? C[s.b] : { ...A, pos: A.pos.map((v, j) => v + (A.look[j] - v) * 0.07) };
    let cam = K.camLerp(A, Bp, (s.ease || E.inOutSine)(p));
    cam = K.breathe(cam, t, 0.0006, 9 + i);
    poseMan(t, s);
    // the bracelet: carried in the hand, laid on the coins at 1.6 s (a small settle), and stays there
    { const lay = 1.6; if (t < lay && s.who === 'bracelet') { const h = K.handPos(MAN, 'Right'); P.bracelet.position.copy(h).add(V(0.0, -0.03, 0)); }
      else { P.bracelet.position.copy(BR0); if (t > lay && t < lay + 0.8) P.bracelet.position.y += 0.006 * Math.exp(-(t - lay) * 6) * Math.abs(Math.sin((t - lay) * 30)); }
      P.bracelet.visible = t > 0.15 || s.who === 'bracelet'; }
    // the niche lamp: carried in and set down (shot 7), lit thereafter; before that, it is not in the niche
    { const k = E.inOutSine(prog(t, 13.3, 14.6)); if (t < 13.18) { P.nicheLamp.visible = false; }
      else { P.nicheLamp.visible = true; P.nicheLamp.position.copy(t < 14.6 ? LAMP0.clone().add(V(0, 0.1, 0.5)).lerp(LAMP0, k) : LAMP0); } }
    // watering: the cup in the hand tilts (16.6-18.4), a thin run of drops, the soil darkens
    { const on = s.who === 'water'; CUP.visible = on;
      if (on) { const h = K.handPos(MAN, 'Right'); CUP.position.copy(h).add(V(-0.04, -0.03, 0)); CUP.rotation.set(0, 0, 1.6 * E.inOutSine(prog(t, 16.8, 17.6))); }
      const lip = V(POT[0] + 0.08, gy + 0.5, POT[1] + 0.04);
      DROPS.forEach((d, k) => { const t0 = 17.4 + k * 0.17, dt = t - t0, y = lip.y - 4.9 * dt * dt; d.visible = (i === 9 || i === 10) && dt > 0 && y > gy + 0.27 && t < 21.2;
        d.position.set(lip.x - 0.02 * k % 0.05, y, lip.z + 0.01 * Math.sin(k * 2)); d.scale.set(1, 1 + 0.5 * Math.min(1, dt * 3), 1); });
      WETSPOT.material.opacity = 0.75 * E.inOutSine(prog(t, 17.6, 21.0)); WETSPOT.scale.setScalar(0.5 + 0.5 * E.inOutSine(prog(t, 17.6, 21.0))); }
    // the sapling grows a new leaf in shot 13 (and is a shade fuller after the watering)
    { const k = E.inOutSine(prog(t, 28.2, 30.3)); SAP.userData.nb.scale.set(0.3 + 0.7 * k, 0.45 + 0.55 * k, 1); SAP.userData.nb.rotation.x = 0.05 + 0.3 * k; }
    // glints
    { const pos = GLINT.geometry.attributes.position, tgt = s.glint === 'coins' ? DISH : s.glint === 'brace' ? BR0 : s.glint === 'sandals' ? P.sandals[0].position : s.glint === 'hoop' ? P.hoop.position : null;
      const r = W.rng(11 + i);
      for (let k = 0; k < 24; k++) { const a = r() * 6.28, rr = r() * (s.glint === 'hoop' ? 0.22 : 0.09); pos.setXYZ(k, (tgt?.x ?? 0) + Math.cos(a) * rr, (tgt?.y ?? 0) + 0.02 + r() * (s.glint === 'hoop' ? 0.25 : 0.03), (tgt?.z ?? 0) + Math.sin(a) * rr); }
      pos.needsUpdate = true; GLINT.material.opacity = tgt ? 0.55 + 0.45 * Math.sin(t * 9 + i) : 0; GLINT.visible = !!tgt; }
    // light: sparkle (shots 1-5) -> steady warm; shadow over the coins in shot 11; gold at the end
    P.sun.intensity = s.shade ? 0.25 : s.warm ? 1.6 : 2.6;
    SET.props.setLights(s.warm ? 0.6 : 0.2);
    const flameShot = i === 13 || i === 15 || i === 16, gold = i <= 6 || s.shade;
    ST.bloom = flameShot || s.shade ? 0 : SET.bloom;
    const nearLamp = i >= 8 && (s.a.startsWith('niche') || flameShot);
    G.renderSet(ctx, ST, t, u, { cam, exposure: SET.exposure * (s.shade ? 0.18 : flameShot ? 0.3 : gold && i !== 2 && i !== 5 && i !== 6 ? 0.5 : i === 14 || i === 10 ? 0.6 : 1), lamp: nearLamp ? 0.1 : 1 });
    if (i === SHOTS.length - 1) { const k = E.inOutSine(p); ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.6 * k; ctx.fillStyle = '#e8a83a'; ctx.fillRect(0, 0, M.W, M.H); ctx.restore(); }
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
