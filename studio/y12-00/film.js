// y12-00 "The Best of Stories in Fifteen Lessons" (intro). Shot list: studio/shotlists/y12_00.md.
// Canaan hills before dawn (eleven stars, moon low, gold band on the eastern ridge), four object glimpses
// (stars, well, prison window, palace column) matched on one gold highlight, fifteen wicks lit by a flame
// running along an oil channel, and a pull-back that lands on frame 1 for the loop. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills, the_well, prison, palace_hall } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { elevenStars, ELEVEN, BRIGHTEST, ELEVEN_CENTRE as ELEVEN_C } from '../lib_shared/eleven.js';
const { THREE } = W;
const { W: FW, H: FH, prog, E, lerp, clamp, mulberry32 } = M;
const PORT = M.FORMAT.portrait;
const D = 17.19;
const fv = (f) => (PORT ? f : f * 0.64);                        // vertical fov per format (16:9 sees wider)
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const SPOT = PORT ? [0.62, 0.40] : [0.62, 0.42];               // where every glimpse puts its gold highlight

let HILLS, WELL, PRISON, PALACE, CAP, E11, K = {};

// a camera that puts world point P exactly at screen fraction SPOT, looking from pos
function aimAt(pos, P, fov, spot = SPOT) {
  const cam = new THREE.PerspectiveCamera(fov, FW / FH, 0.05, 4000); cam.position.set(...pos); cam.lookAt(...P); cam.updateMatrixWorld();
  // rotate the look so P lands at the spot: offset the look direction by the spot's angular offset
  const tanV = Math.tan(fov * Math.PI / 360), tanH = tanV * FW / FH;
  const dx = (spot[0] - 0.5) * 2 * tanH, dy = (0.5 - spot[1]) * 2 * tanV;
  const fwd = new THREE.Vector3(...P).sub(cam.position).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
  const look = fwd.clone().sub(right.multiplyScalar(dx)).sub(up.multiplyScalar(dy)).normalize();
  return { pos, look: [pos[0] + look.x * 10, pos[1] + look.y * 10, pos[2] + look.z * 10], fov };
}

async function buildLamps(hy) {
  // a stone ledge with a carved oil channel and fifteen cotton wicks; a flame runs along the oil like a fuse
  const stone = await W.pbr('rustic_stone_wall', { tile: 1.6, tint: 0xeee2cc, res: 1024, normal: 1.2 });
  const g = new THREE.Group(), N = 15, LEN = 4.2, LX = K.LX, LZ = K.LZ, y0 = hy(LX, LZ);
  const ledge = W.rbox(LEN + 0.5, 0.82, 0.62, stone, { r: 0.05, seg: 3 }); g.add(ledge);
  const lip = W.rbox(LEN + 0.3, 0.06, 0.12, stone, { r: 0.02 }); lip.position.set(0, 0.82, 0.2); g.add(lip);
  const oil = new THREE.Mesh(new THREE.BoxGeometry(LEN + 0.1, 0.012, 0.12), new THREE.MeshStandardMaterial({ color: 0x24170a, roughness: 0.08, metalness: 0 }));
  oil.position.set(0, 0.826, 0.06); g.add(oil);
  const wickMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }), charMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 });
  const flames = [], wicks = [];
  for (let i = 0; i < N; i++) {
    const x = -LEN / 2 + 0.15 + i * (LEN - 0.3) / (N - 1);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.05, 10), wickMat); w.position.set(x, 0.85, 0.06); g.add(w); wicks.push(w);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), charMat); tip.position.set(x, 0.876, 0.06); g.add(tip);
    const f = W.flame({ h: 0.1, w: 0.045, seed: 20 + i, inten: 0.85, light: 0, planes: 2 }); f.position.set(x, 0.868, 0.06); g.add(f); flames.push(f);
  }
  const run = W.flame({ h: 0.06, w: 0.06, seed: 9, inten: 3.2, light: 0, planes: 2 }); run.position.set(0, 0.83, 0.06); g.add(run);
  const runL = new THREE.PointLight(0xff9a4a, 3, 3.5, 1.6); g.add(runL);
  const rowL = new THREE.PointLight(0xffa860, 0, 9, 1.4); rowL.position.set(0, 1.25, 0.6); g.add(rowL);
  g.position.set(LX, y0 - 0.06, LZ); g.rotation.y = K.LRY; W.shadows(g);
  g.traverse((m) => { if (m.isMesh && m.material.type === 'ShaderMaterial') { m.castShadow = false; m.receiveShadow = false; } });
  HILLS.scene.add(g);
  const xs = flames.map((f) => f.position.x);
  const T0 = 12.05, T1 = 13.75;                                 // the fuse runs left to right along the channel
  const litAt = xs.map((x) => lerp(T0, T1, (x - xs[0]) / (xs[N - 1] - xs[0])));
  const outAt = xs.map((_, i) => 14.6 + 0.07 * i + 0.5 * mulberry32(i * 31 + 5)());   // oil burns down, wicks gutter out one by one
  const level = (t, i) => sm((t - litAt[i]) / 0.28) * (1 - sm((t - outAt[i]) / 0.7));
  K.lamps = { g, flames, run, runL, rowL, xs, litAt, outAt, level, T0, T1, y0 };
  K.lamps.update = (t) => {
    let sum = 0;
    flames.forEach((f, i) => { const k = level(t, i); sum += k; f.visible = k > 0.002; f.scale.set(0.5 + 0.5 * k, Math.max(0.05, k), 0.5 + 0.5 * k); f.userData.update(t, k); });
    const fp = prog(t, T0 - 0.15, T1), on = t > T0 - 0.15 && t < T1 + 0.12;
    const x = lerp(xs[0] - 0.12, xs[N - 1], fp);
    run.visible = on; run.position.x = x; run.userData.update(t, on ? 1 : 0);
    runL.position.set(x, 0.95, 0.25); runL.intensity = on ? 3 : 0;
    rowL.intensity = sum * 0.3;
  };
  return K.lamps;
}

function windowGlow() {
  const H = HILLS.set.props.house;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.46), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(1.6), toneMapped: true }));
  pane.position.set(-2.1, 1.75, 0.255); H.add(pane);
  const L = new THREE.PointLight(0xff9a50, 5, 7, 1.6); L.position.set(-2.1, 1.6, 1.0); H.add(L);
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    HILLS = W.stage(await canaan_hills({ time: 'predawn' }));
    WELL = W.stage(await the_well({ time: 'golden' }));
    PRISON = W.stage(await prison({ time: 'evening' }));
    PALACE = W.stage(await palace_hall({ time: 'day' }));
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI', size: PORT ? 84 : 66 });
    const P = HILLS.set.props, hy = P.terrain.heightAt, hp = P.house.position;
    K.h0 = hp.y; K.hx = hp.x; K.hz = hp.z; K.hy = hy;
    K.LX = 12; K.LZ = 15; K.LRY = -0.55;   // ledge on the terrace, facing back toward the house, the eastern glow beyond it
    // the lamp terrace is kept clear of olive trees (for every shot, so the world never changes)
    for (const o of P.olives) { const dx = o.position.x - K.LX, dz = o.position.z - K.LZ, d = Math.hypot(dx, dz), c = (dx * 0.52 - dz * 0.85) / d;
      if (d < 10 || (d < 60 && c > 0.75)) o.visible = false; }
    E11 = elevenStars(THREE, { size: 17 }); HILLS.scene.add(E11);
    windowGlow();
    await buildLamps(hy);
    const h0 = K.h0, wp = P.well.position;
    K.well = [wp.x, wp.y, wp.z];
    const far = (d, s = 1300) => d.map((v) => v * s);
    // camera poses (shot list names)
    const G0 = (x, z, dy) => [x, hy(x, z) + dy, z];                       // a camera dy metres above the ground at (x, z)
    const toward = (pos, tx, tz, el, d = 30) => { const dx = tx - pos[0], dz = tz - pos[2], l = Math.hypot(dx, dz); return [pos[0] + dx / l * d, pos[1] + Math.tan(el * Math.PI / 180) * d, pos[2] + dz / l * d]; };
    K.toward = toward;
    const wp0 = G0(10.5, 21.5, 1.5), wideA = { pos: wp0, look: toward(wp0, -3, -10, PORT ? 13 : 9), fov: fv(62) };
    const ly = K.lamps.y0, cr = Math.cos(K.LRY), sr = Math.sin(K.LRY);
    K.LW = (x, y, z) => [K.LX + x * cr + z * sr, ly + y, K.LZ - x * sr + z * cr];   // ledge-local -> world
    K.cams = {
      wideA, wideB: { ...wideA, pos: G0(10.1, 20.6, 1.5), look: toward(G0(10.1, 20.6, 1.5), -3, -10, PORT ? 13 : 9) },
      tiltA: { pos: G0(9.8, 19.8, 1.5), look: toward(G0(9.8, 19.8, 1.5), -3, -10, PORT ? 14 : 10), fov: fv(48) },
      tiltB: { pos: G0(9.8, 19.8, 1.5), look: ((p) => ELEVEN_C.map((v, i) => p[i] + v * 30 - (i === 1 ? (PORT ? 4 : 2) : 0)))(G0(9.8, 19.8, 1.5)), fov: fv(48) },
      skyHold: { pos: G0(6, 14, 1.6), look: toward(G0(6, 14, 1.6), 0.5, -20, PORT ? 24 : 31), fov: fv(52) },
      craneA: { pos: G0(-24.5, 12.5, 9), look: ((p) => ELEVEN_C.map((v, i) => p[i] + v * 40))(G0(-24.5, 12.5, 9)), fov: fv(46) },
      craneB: { pos: G0(-24.5, 12.5, 2.7), look: [-3, h0 + 1.3, -1], fov: fv(46) },
      settleA: { pos: G0(-24.5, 12.5, 2.7), look: [-3, h0 + 1.3, -1], fov: fv(46) },
      settleB: { pos: G0(-23.9, 12.0, 2.6), look: [-3.2, h0 + 1.25, -1], fov: fv(45) },
      lampA: { pos: K.LW(-1.2, PORT ? 1.25 : 1.05, PORT ? 2.5 : 1.9), look: K.LW(-0.7, PORT ? 1.2 : 1.15, -4), fov: PORT ? 38 : 24 },
      lampB: { pos: K.LW(1.0, PORT ? 1.25 : 1.05, PORT ? 2.5 : 1.9), look: K.LW(0.7, PORT ? 1.2 : 1.15, -4), fov: PORT ? 38 : 24 },
    };
    { const sp = G0(4, 12, 1.6); K.cams.stars = aimAt(sp, far(ELEVEN[BRIGHTEST]).map((v, i) => v + sp[i]), fv(24)); }
    const wc = WELL.set.cameras, pc = PRISON.set.cameras, qc = PALACE.set.cameras;
    K.cams.well = { pos: [1.3, wc.hero.pos[1] + 0.25, 1.75], look: [0, wc.hero.pos[1] - 0.35, 0], fov: fv(36) };
    K.cams.prison = pc.window; K.cams.palace = { pos: [-1.2, 0.75, 1.2], look: [-3.6, 0.5, -3.6], fov: fv(38) };
    for (const s of [HILLS, WELL, PRISON, PALACE]) { s.update(0, 0, {}); G.R.compile(s.scene, s.camera); }
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams;
    let st = HILLS, cam, hi = 0, glint = 0, gl = SPOT;
    // ------------------------------------------------------------ shots
    if (t < 1.68) cam = camL(C.wideA, C.wideB, E.inOutSine(prog(t, -1.6, 4.0)));
    else if (t < 3.19) cam = camL(C.tiltA, C.tiltB, E.inOutSine(prog(t, 1.75, 2.95)));
    else if (t < 5.42) cam = C.skyHold;
    else if (t < 7.35) cam = camL(C.craneA, C.craneB, E.inOutCubic(prog(t, 5.42, 7.1)));
    else if (t < 9.25) cam = camL(C.settleA, C.settleB, E.inOutSine(prog(t, 7.35, 9.25)));
    else if (t < 9.97) { cam = C.stars; hi = 1; glint = 1; }
    else if (t < 10.49) { st = WELL; cam = C.well; glint = 1; }
    else if (t < 11.14) { st = PRISON; cam = C.prison; glint = 1; }
    else if (t < 11.90) { st = PALACE; cam = C.palace; glint = 1; }
    else if (t < 14.28) { const p = E.inOutSine(prog(t, 11.9, 14.1)); cam = camL(C.lampA, C.lampB, p); }
    else { const p = E.inOutCubic(prog(t, 14.28, D)), a = camL(C.lampB, C.wideA, p), lift = 4.5 * Math.sin(Math.PI * p);
      cam = { ...a, pos: [a.pos[0], a.pos[1] + lift, a.pos[2]] }; }
    // ------------------------------------------------------------ world state (pure in t)
    if (st === HILLS) {
      const P = HILLS.set.props, sky = P.sky.userData.u;
      // a thin gold band under the eastern ridge, slowly growing; the moon low in the west-south-west
      const dawn = 0.35 + 0.25 * prog(t, 0, D) * (1 - prog(t, 14.3, D));
      const sd = new THREE.Vector3(0.52, -0.06, -0.85).normalize();
      sky.sunD.value.copy(sd); sky.sunC.value.setRGB(1.0 * dawn, 0.55 * dawn, 0.18 * dawn); sky.glow.value = 1.0; sky.sunDisc.value = 2.0;
      sky.moonD.value.set(-0.93, 0.2, -0.3).normalize(); sky.moonOn.value = 1;
      K.lamps.update(t);
      E11.position.set(...cam.pos);
      E11.userData.update(t, null, { op: 1, zoom: t >= 9.25 && t < 9.97 ? 1.3 : 1, hi });
    }
    G.renderSet(ctx, st, t, u, { cam, exposure: st === HILLS ? 1.3 : undefined });
    // gold highlight: the same screen spot on every glimpse (match cuts)
    if (glint) {
      const x = gl[0] * FW, y = gl[1] * FH, k = 0.85, r = FW * 0.16;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,214,120,${0.55 * k})`); g.addColorStop(0.25, `rgba(255,190,90,${0.18 * k})`); g.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      ctx.restore();
    }
    CAP.draw(ctx, t);
    const su = prog(t, 15.59, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
