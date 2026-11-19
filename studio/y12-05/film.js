// y12-05 "Sold for a Few Coins. Not His Real Worth". Shot list: studio/shotlists/y12_05.md.
// The caravan's wayside well (late afternoon) and the Egyptian market (bright morning). The boy (a prophet) is
// never shown: at the well we see the rope come up heavy and the trader call out; in the market the stone
// block stands empty with a coil of rope on it, in a patch of sun that stays steady while the crowd passes.
// The price is coins on a brass scale: counted on, the pan barely dips, one coin drops off, the pan is left
// empty (loops to the coins of frame 1). Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { caravan_route, egypt_market } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { loadPeople } from '../lib_shared/people.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const { THREE } = W;
const { W: FW, H: FH, prog, E, lerp, clamp, mulberry32 } = M;
const PORT = M.FORMAT.portrait;
const D = 27.64;
const fv = (f) => (PORT ? f : f * 0.64);
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = () => new THREE.Vector3(), _q = () => new THREE.Quaternion();

let ROAD, MKT, CAP, K = {};

function aimBone(bone, child, target) {
  const bp = bone.getWorldPosition(_v()), cp = child.getWorldPosition(_v());
  const qd = _q().setFromUnitVectors(cp.sub(bp).normalize(), target.clone().sub(bp).normalize());
  const qw = bone.getWorldQuaternion(_q()).premultiply(qd);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q()).invert().multiply(qw)); bone.updateMatrixWorld(true);
}
function reach(p, side, target, pole) {
  const B = p.bones, U = B(side + 'Arm'), L = B(side + 'ForeArm'), H = B(side + 'Hand');
  p.object3d.updateMatrixWorld(true);
  const a = U.getWorldPosition(_v()), b = L.getWorldPosition(_v());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(H.getWorldPosition(_v())), toT = target.clone().sub(a);
  const d = clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4), dir = toT.normalize();
  const pv = pole.clone().sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  aimBone(U, L, a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA)); aimBone(L, H, a.clone().addScaledVector(dir, d));
}
// a struck silver dirham: lathe profile with a rim, a stamped ring pattern in the normal map
function coinGeo() {
  const p = [[0.0001, 0.0016], [0.009, 0.0016], [0.0105, 0.0019], [0.0118, 0.0014], [0.012, 0], [0.0118, -0.0014], [0.0105, -0.0019], [0.009, -0.0016], [0.0001, -0.0016]];
  return new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 48);
}
function coinMat() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgb(128,128,255)'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgb(160,160,255)'; x.lineWidth = 3; for (const r of [56, 40]) { x.beginPath(); x.arc(64, 64, r, 0, 7); x.stroke(); }
  x.fillStyle = 'rgb(100,150,255)'; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; x.fillRect(64 + Math.cos(a) * 48 - 2, 64 + Math.sin(a) * 48 - 4, 4, 8); }
  const nm = new THREE.CanvasTexture(c);
  return new THREE.MeshStandardMaterial({ color: 0xd4d2c8, metalness: 1, roughness: 0.32, normalMap: nm, normalScale: new THREE.Vector2(0.6, 0.6) });
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    ROAD = W.stage(await caravan_route({ time: 'golden' }));
    MKT = W.stage(await egypt_market({ time: 'day' }));
    const fixT = (x) => x.replace(/ʿ/g, '‘').replace(/ʾ/g, '’').replace(/ṣ/g, 's').replace(/ḥ/g, 'h');
    CAP = captions((await loadLines('lines.json')).map((l) => ({ ...l, text: fixT(l.text), keys: (l.keys || []).map(fixT) })), { display: 'Display', ui: 'UI', size: PORT ? 84 : 74 });
    const PP = await loadPeople(THREE, GLTFLoader);
    // ---------------- the road: the wayside well, the rope with whipped knots that rises as it is hauled
    const RS = ROAD.set, RP = RS.props, rhy = RP.terrain.heightAt, wellG = RP.well, WP = wellG.position.clone(); K.WP = WP;
    RP.rope.visible = false;
    const rm = W.ropeMat(), rope = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 6, 12, 1), rm); rope.position.set(WP.x, WP.y + 1.86 - 3, WP.z + 0.1); ROAD.scene.add(W.shadows(rope));
    const knots = Array.from({ length: 14 }, () => { const k = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.006, 8, 20), rm); k.rotation.x = Math.PI / 2; ROAD.scene.add(k); return k; });
    K.knots = knots;
    K.rimY = WP.y + 0.91;
    const T3 = [{ outfit: 'traveller', beard: 'full', headwear: 'turban', seed: 51 }, { outfit: 'thobe', beard: 'short', headwear: 'turban', seed: 52 }, { outfit: 'worker', beard: 'short', headwear: 'wrap', seed: 53 }];
    const mk = (i, pal, o = {}) => PP.make({ kind: 'man', ...T3[i % 3], palette: pal, detail: 0.65, ...o });
    K.trader = mk(0, { robe: '#3d4a68', wrap: '#e9e2d4', cloak: '#2b2a2c', sash: '#b08a3c', trousers: '#a89a80' });
    K.trader2 = mk(1, { robe: '#e8e0d0', wrap: '#e9e2d4', cloak: '#3a4660', sash: '#7a3b2b', trousers: '#b8a684' });
    // trader at the rim (back to the camera side, +x+z), second man beside him
    const tp = V3(WP.x + 0.95, 0, WP.z + 0.75); K.trader.object3d.position.set(tp.x, rhy(tp.x, tp.z), tp.z); K.trader.object3d.rotation.y = Math.atan2(WP.x - tp.x, WP.z - tp.z);
    const tp2 = V3(WP.x - 0.6, 0, WP.z + 1.15); K.trader2.object3d.position.set(tp2.x, rhy(tp2.x, tp2.z), tp2.z); K.trader2.object3d.rotation.y = Math.atan2(WP.x - tp2.x, WP.z - tp2.z);
    ROAD.scene.add(K.trader.object3d, K.trader2.object3d);
    // ---------------- the market: our own coins and scale motion
    const MS = MKT.set, MP = MS.props; MP.coins.visible = false;
    const scale = MP.pans[0].parent;
    { const bm = MP.pans[0].material.clone(); bm.side = THREE.DoubleSide; scale.traverse((m) => { if (m.isMesh) m.material = bm; }); }   // pans are open lathes: show their insides
    ROAD.bloom = 0.05; MKT.bloom = 0.05; K.scale = scale; K.scaleKids = scale.children.slice(); // post, beam, pan-, 3 chains-, pan+, 3 chains+
    K.scaleRest = K.scaleKids.map((c) => c.position.clone());
    const cg = coinGeo(), cm = coinMat(), r = mulberry32(12);
    K.coins = Array.from({ length: 9 }, (_, i) => { const c = new THREE.Mesh(cg, cm); c.castShadow = c.receiveShadow = true; MKT.scene.add(c); return { c, rx: (r() - 0.5) * 0.09, rz: (r() - 0.5) * 0.09, ry: r() * 6, tilt: (r() - 0.5) * 0.12 }; });
    K.panW = V3(-2.4 + 0.29, 0.8 + 0.3 + 0.006, -21); K.tableY = 0.8;
    // a hessian cloth on the table (the coin drops onto it in shot 12)
    const hs = await W.pbr('hessian_230', { tile: 0.12, tint: 0xc8b8a0, res: 1024, normal: 0.7 });
    const cloth = W.cloth(0.6, 0.45, hs, { segW: 40, segH: 30, folds: 0.006, seed: 4 }); cloth.rotation.x = -Math.PI / 2; cloth.position.set(-2.05, 0.803, -20.62); MKT.scene.add(W.shadows(cloth));
    // the stone block: empty, a coil of rope left on it
    const coil = new THREE.Group(); for (let k = 0; k < 4; k++) { const tr = new THREE.Mesh(new THREE.TorusGeometry(0.15 - k * 0.012, 0.013, 10, 60), rm); tr.rotation.x = Math.PI / 2; tr.position.y = 0.012 + k * 0.022; coil.add(tr); }
    coil.add(W.rope([V3(0.13, 0.02, 0), V3(0.3, 0.012, 0.12), V3(0.5, 0.01, 0.06)], 0.012)); coil.position.set(0.55, 0.755, -25.85); MKT.scene.add(W.shadows(coil));
    // crowd: four people walking the lane (pure in t: position = start + speed * t)
    const PAL = [{ robe: '#e0d2b6', cloak: '#3f3026', wrap: '#ece4d2' }, { robe: '#8b4f36', cloak: '#3a2b22', wrap: '#e6dccb' }, { robe: '#ece5d8', cloak: '#5b4130', wrap: '#f1ece2' }, { robe: '#6e6847', cloak: '#3b3528', wrap: '#ddd2bb' }];
    K.crowd = PAL.map((pal, i) => { const p = mk(i, { ...pal, sash: '#8a4b2e', trousers: '#c2ae8c' }, { detail: 0.55 }); MKT.scene.add(p.object3d);
      return { p, x: [-0.9, 1.0, -0.5, 1.3][i], z0: [-14, -22, -31, -9][i], dir: i % 2 ? 1 : -1, sp: 0.85 + 0.1 * i }; });
    // ---------------- cameras
    const PW = K.panW, PL = [-2.4 - 0.29, PW.y, -21];
    K.cams = {
      coinsA: { pos: [-1.82, 1.0, -20.3], look: [-2.07, 0.806, -20.63], fov: fv(24) },
      coinsB: { pos: [-1.84, 0.99, -20.33], look: [-2.07, 0.806, -20.63], fov: fv(23) },
      wellA: { pos: [WP.x + 5.5, rhy(WP.x + 5.5, WP.z + 6.5) + 1.6, WP.z + 6.5], look: [WP.x, WP.y + 1.0, WP.z], fov: fv(48) },
      wellB: { pos: [WP.x + 4.6, rhy(WP.x + 4.6, WP.z + 5.4) + 1.5, WP.z + 5.4], look: [WP.x, WP.y + 1.0, WP.z], fov: fv(46) },
      haulA: { pos: [WP.x + 1.95, K.rimY + 0.8, WP.z + 1.65], look: [WP.x + 0.1, K.rimY + 0.15, WP.z + 0.1], fov: fv(42) },
      haulB: { pos: [WP.x + 1.85, K.rimY + 0.75, WP.z + 1.55], look: [WP.x + 0.1, K.rimY + 0.35, WP.z + 0.1], fov: fv(40) },
      call: { pos: [WP.x + 3.8, K.rimY + 0.9, WP.z + 3.2], look: [WP.x + 0.4, K.rimY + 0.6, WP.z + 0.2], fov: fv(46) },
      laneA: { pos: [1.4, 1.6, 2.0], look: [-0.6, 1.2, -12], fov: fv(46) },
      laneB: { pos: [-0.2, 1.6, 1.0], look: [-1.4, 1.2, -12], fov: fv(46) },
      count: { pos: [-2.0, 1.32, -20.25], look: [PW.x, PW.y + 0.02, PW.z], fov: fv(34) },
      scoopA: { pos: [-2.0, 1.25, -20.45], look: [PW.x, PW.y + 0.02, PW.z], fov: fv(30) },
      scoopB: { pos: [-2.02, 1.23, -20.5], look: [PW.x, PW.y + 0.02, PW.z], fov: fv(29) },
      blockA: { pos: [2.6, 0.45, -21.8], look: [0.3, 0.9, -26], fov: fv(44) },
      blockB: { pos: [2.1, 0.5, -22.6], look: [0.3, 0.9, -26], fov: fv(42) },
      craneA: { pos: [2.1, 1.0, -22.6], look: [0.3, 0.8, -26], fov: fv(44) },
      craneB: { pos: [4, 13, -14], look: [0.3, 0, -24], fov: fv(48) },
      patch: { pos: [3.0, 2.6, -21.5], look: [0.4, 0.75, -25.9], fov: fv(34) },
      swing: { pos: [-2.25, 1.42, -19.95], look: [-2.4, 1.12, -21], fov: fv(40) },
      drop: { pos: [-1.85, 1.0, -20.28], look: [-2.0, 0.81, -20.6], fov: fv(28) },
      widenA: { pos: [1.8, 1.0, -23.4], look: [0.3, 0.7, -26], fov: fv(36) },
      widenB: { pos: [3.2, 1.7, -20.5], look: [0.3, 0.7, -26], fov: fv(46) },
      empty: { pos: [-2.55, 1.36, -20.55], look: [PL[0], PL[1] + 0.02, PL[2]], fov: fv(30) },
    };
    for (const s of [ROAD, MKT]) { s.update(0, 0, {}); G.R.compile(s.scene, s.camera); }
    console.error(`[y12-05] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams;
    let st = MKT, cam;
    if (t < 2.26) cam = camL(C.coinsA, C.coinsB, prog(t, 0, 2.26));
    else if (t < 4.22) { st = ROAD; cam = camL(C.wellA, C.wellB, E.inOutSine(prog(t, 2.26, 4.22))); }
    else if (t < 6.0) { st = ROAD; cam = camL(C.haulA, C.haulB, E.inOutSine(prog(t, 4.3, 5.9))); }
    else if (t < 7.41) { st = ROAD; cam = C.call; }
    else if (t < 8.78) cam = camL(C.laneA, C.laneB, E.inOutSine(prog(t, 7.41, 8.78)));
    else if (t < 10.72) cam = C.count;
    else if (t < 12.77) cam = camL(C.scoopA, C.scoopB, E.inOutSine(prog(t, 10.72, 12.77)));
    else if (t < 14.61) cam = camL(C.blockA, C.blockB, E.inOutSine(prog(t, 12.77, 14.61)));
    else if (t < 16.15) cam = camL(C.craneA, C.craneB, E.inOutCubic(prog(t, 14.61, 16.15)));
    else if (t < 17.66) cam = C.patch;
    else if (t < 19.45) cam = C.swing;
    else if (t < 21.75) cam = C.drop;
    else if (t < 23.97) cam = camL(C.widenA, C.widenB, E.inOutSine(prog(t, 21.75, 23.97)));
    else cam = C.empty;
    // ---------------- road state: rope rises (hauled) 4.3-6.0: knots move up the rope
    if (st === ROAD) {
      const WP = K.WP, haul = t < 4.3 ? -0.9 * prog(t, 2.4, 4.2) : -0.9 + 1.25 * E.inOutSine(prog(t, 4.3, 6.0));
      K.knots.forEach((k, i) => { const y = K.rimY + 0.95 - i * 0.42 + haul; k.position.set(WP.x, y, WP.z + 0.1); k.visible = y < WP.y + 1.8 && y > WP.y - 3; });
      const tr = K.trader, o = tr.object3d; tr.setPose('stand', t);
      const fw = V3(WP.x - o.position.x, 0, WP.z - o.position.z).normalize(), pole = o.position.clone().add(V3(0, 0.4, 0)).addScaledVector(fw, -0.5);
      if (t < 6.0) { const ph = Math.sin(t * 4.2); reach(tr, 'Right', V3(WP.x + 0.04, K.rimY + 0.55 + 0.1 * ph, WP.z + 0.12), pole); reach(tr, 'Left', V3(WP.x + 0.04, K.rimY + 0.3 - 0.1 * ph, WP.z + 0.12), pole); }
      else { const k = E.outCubic(prog(t, 6.05, 6.5)); reach(tr, 'Right', o.position.clone().add(V3(0, 1.35 + 0.55 * k, 0)).addScaledVector(fw, 0.25), pole); }
      K.trader2.setPose(t < 6.2 ? 'stand' : 'agree', t + 1.3);
    }
    // ---------------- market state: coins, scale, crowd
    if (st === MKT) {
      // coins: 0-8.8 seven on the cloth (frame 1); 8.8-10.6 counted onto the right pan one by one (fall 6 cm);
      // 10.6-19.45 in the pan; one drops off onto the cloth at 20.0; from 24 the left (empty) pan is the shot
      const PW = K.panW, onPan = (i) => 9.0 + i * 0.24, n = 7;
      let inPan = 0;
      K.coins.forEach((o, i) => { const c = o.c; c.visible = i < n;
        if (i >= n) return;
        const tl = onPan(i), cloth = V3(-2.12 + (i % 4) * 0.03 + o.rx * 0.3, 0.806 + 0.0035 * Math.floor(i / 4), -20.64 + Math.floor(i / 4) * 0.03 + o.rz * 0.3);
        const pan = V3(PW.x + o.rx * 0.6, PW.y + 0.0035 * (i % 3), PW.z + o.rz * 0.6);
        if (t < tl - 0.25) { c.position.copy(cloth); c.rotation.set(0, o.ry, 0); }
        else if (t < tl) { const k = (t - (tl - 0.25)) / 0.25; c.position.copy(pan).add(V3(0, 0.06 * (1 - k * k), 0)); c.rotation.set(o.tilt * (1 - k), o.ry, 0); }
        else { inPan++; c.position.copy(pan); c.rotation.set(0, o.ry, 0); }
        if (i === 3 && t > 19.9) { const k = t - 19.9, f = Math.min(1, k / 0.18), land = V3(-2.0, 0.807, -20.6);           // slides off the pan rim, falls to the cloth, wobbles flat
          c.position.copy(pan.clone().lerp(land, f)); c.position.y = f < 1 ? lerp(pan.y, land.y, f * f) : land.y + 0.002 * Math.exp(-6 * (k - 0.18)) * Math.abs(Math.sin((k - 0.18) * 30));
          c.rotation.set(f < 1 ? 1.2 * f : 0.25 * Math.exp(-5 * (k - 0.18)) * Math.cos((k - 0.18) * 28), o.ry, 0); inPan--; }
      });
      // the beam dips a little per coin (a light price), then swings and stills in shot 11
      const dip = 0.004 * inPan, sw = t > 17.66 ? 0.07 * Math.exp(-1.6 * (t - 17.66)) * Math.sin((t - 17.66) * 5.2) : 0, th = dip + sw;
      K.scaleKids.forEach((ch, j) => { const rest = K.scaleRest[j]; if (j === 1) { ch.rotation.z = -th; return; } if (j < 2) return;
        const s = rest.x < -0.1 ? -1 : 1; ch.position.y = rest.y - s * 0.29 * Math.sin(th); ch.position.x = rest.x + 0.01 * Math.sin(sw * 20); });
      const coinDy = -0.29 * Math.sin(th); K.coins.forEach((o, i) => { if (i < n && t >= onPan(i) && !(i === 3 && t > 19.9)) o.c.position.y += coinDy; });
      // crowd walks the lane
      K.crowd.forEach((c, i) => { const p = c.p, o = p.object3d, sp = 0.85, z = c.z0 + c.dir * sp * t;
        p.setPose('walk', t * 0.75 + i); o.position.set(c.x, 0, z); o.rotation.y = c.dir > 0 ? 0 : Math.PI; });
    }
    const exposure = st === ROAD ? 0.95 : 0.85;
    G.renderSet(ctx, st, t, u, { cam, exposure });
    CAP.draw(ctx, t);
    const su = prog(t, 26.04, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
