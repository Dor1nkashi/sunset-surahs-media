// k18-00 "Fifteen Lessons from the Surah of the Cave" (intro, Al-Kahf 18:13). Blue hour before sunrise.
// Inside the cave looking out -> over the lip -> the four far places in the valley -> the stones turn gold ->
// four match-cut glimpses (cave lip, palm by a wall, two waters, iron and copper) -> fifteen wicks lit like a
// fuse on the ledge -> back inside, the same arch (loop). No people. Pure function of time; seeded noise only.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { mountain_cave, two_gardens, confluence, mountain_pass_barrier } from '../lib_shared/sets_kahf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import * as K from './kit.js';
const { THREE } = W;
const { prog, E, clamp } = M;
const V = (...a) => new THREE.Vector3(...a);

let FOG0 = 0, CAVE, GARD, SEAS, PASS, CAP, Hc, WICKS = [], RUNNER, ROWLIGHT, WARM, SPOTS = {}, PALM;
const D = 18.17;
// the ledge of fifteen wicks on the shelf outside the mouth
const LEDGE_Z = 4.6, WX0 = -3.5, WX1 = 3.5, NW = 15;
const wickX = (i) => WX0 + (WX1 - WX0) * i / (NW - 1);
const RUN0 = 13.15, RUN1 = 15.05;                       // the flame runs the channel
const runX = (t) => WX0 - 0.25 + (WX1 - WX0 + 0.25) * E.inOutSine(prog(t, RUN0, RUN1));

// camera poses (fov = vertical degrees in 9x16; 16x9 tightened by K.lensFov)
const C = {};
function poses() {
  const h = Hc;
  C.in_a = { pos: [0.3, 1.0, -8.2], look: [0, 0.9, 6], fov: 60 };
  C.in_b = { pos: [0.3, 1.0, -7.75], look: [0, 0.9, 6], fov: 60 };
  C.lip_a = { pos: [0.15, 0.85, -1.6], look: [2.0, 0.2, 12], fov: 52 };
  C.lip_b = { pos: [0.5, 1.45, 2.6], look: [6.5, h(6.5, 22) + 0.4, 24], fov: 50 };
  // telephoto pan along the valley: barrier -> garden -> two waters -> village
  C.v0 = { pos: [10, 24, 12], look: [-330, -120, 640], fov: 16 };
  C.v1 = { pos: [10, 24, 12], look: [-150, -178, 360], fov: 16 };
  C.v2 = { pos: [10, 24, 12], look: [140, -178, 470], fov: 16 };
  C.v3 = { pos: [10, 24, 12], look: [250, -176, 320], fov: 16 };
  C.mouth_a = { pos: [2.6, 0.45, 8.6], look: [0, 1.0, -1], fov: 44 };
  C.mouth_b = { pos: [2.1, 0.42, 6.6], look: [0, 0.95, -1.5], fov: 42 };
  C.stones = { pos: [1.15, 0.42, 1.55], look: [0.35, 0.12, 0.25], fov: 30 };
  C.g_lip = { pos: [-1.15, 0.36, 1.45], look: [-1.75, 0.15, 0.3], fov: 28 };
  C.row_a = { pos: [wickX(0) - 0.5, 0.48, LEDGE_Z + 1.35], look: [wickX(0) - 0.2, 0.22, LEDGE_Z], fov: 30 };
  C.row_b = { pos: [wickX(NW - 1) + 0.2, 0.62, LEDGE_Z + 2.4], look: [wickX(NW - 1) - 0.9, 0.2, LEDGE_Z], fov: 36 };
  C.back_a = { pos: [0.25, 1.05, -0.6], look: [0.1, 0.75, 8], fov: 58 };
}
// the shot table (times from shotlists/k18_00.md)
const SHOTS = [
  { t0: 0.00, t1: 1.63, set: 'cave', a: 'in_a', b: 'in_b', ease: E.inOutSine },
  { t0: 1.63, t1: 3.26, set: 'cave', a: 'lip_a', b: 'lip_b', ease: E.inOutSine },
  { t0: 3.26, t1: 5.56, set: 'cave', vista: true },
  { t0: 5.56, t1: 7.81, set: 'cave', a: 'mouth_a', b: 'mouth_b', ease: E.outSine },
  { t0: 7.81, t1: 10.07, set: 'cave', a: 'stones' },
  { t0: 10.07, t1: 10.81, set: 'cave', a: 'g_lip' },
  { t0: 10.81, t1: 11.55, set: 'gard', a: 'g_palm' },
  { t0: 11.55, t1: 12.29, set: 'seas', a: 'g_seam' },
  { t0: 12.29, t1: 13.03, set: 'pass', a: 'g_iron' },
  { t0: 13.03, t1: 15.40, set: 'cave', row: true },
  { t0: 15.40, t1: D, set: 'cave', a: 'back_a', b: 'in_a', ease: E.inOutCubic },
];

function vistaCam(t) {
  // one continuous glide; each place's ray rises as the pan reaches it
  const p = prog(t, 3.26, 5.56), q = p * 3, k = Math.min(2, Math.floor(q)), f = E.inOutSine(q - k);
  const a = [C.v0, C.v1, C.v2, C.v3][k], b = [C.v1, C.v2, C.v3, C.v3][k];
  // keep speed even across the joins: blend the eased segment with a linear one
  const g = 0.5 * f + 0.5 * (q - k);
  return K.camLerp(a, b, g);
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    const T0 = performance.now();
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    CAVE = await mountain_cave({ time: 'bluehour', sleepers: 0, dog: false, lamp: true, vista: true });
    Hc = CAVE.props.terrain.heightAt; poses(); FOG0 = CAVE.scene.fog.density;
    const S = CAVE.scene;
    // the wick ledge: a long carved stone with an oil channel and fifteen wicks
    const stoneM = await W.pbr('old_stone_wall', { tile: 0.9, tint: 0xa89a86, res: 1024 });
    const ledge = new THREE.Mesh(W.boxUV(new THREE.BoxGeometry(WX1 - WX0 + 0.8, 0.16, 0.34)), stoneM); ledge.position.set(0, Hc(0, LEDGE_Z) + 0.08, LEDGE_Z); S.add(W.shadows(ledge));
    const oil = new THREE.Mesh(new THREE.BoxGeometry(WX1 - WX0 + 0.5, 0.004, 0.06), new THREE.MeshStandardMaterial({ color: 0x140e08, roughness: 0.45, envMapIntensity: 0.15 }));
    oil.position.set(0, ledge.position.y + 0.081, LEDGE_Z); S.add(oil);
    const wickM = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 });
    for (let i = 0; i < NW; i++) {
      const g = new THREE.Group(); g.position.set(wickX(i), ledge.position.y + 0.085, LEDGE_Z);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.035, 10), wickM); w.position.y = 0.012; g.add(w);
      const f = W.flame({ h: 0.12, w: 0.05, seed: 11 + i, inten: 3.2, light: 0, planes: 2 }); f.position.y = 0.026; g.add(f); g.userData.f = f;
      S.add(g); WICKS.push(g);
    }
    RUNNER = W.flame({ h: 0.09, w: 0.07, seed: 3, inten: 3.6, light: 1.0, dist: 4 }); S.add(RUNNER);
    ROWLIGHT = new THREE.PointLight(0xff9a4a, 0, 9, 1.6); ROWLIGHT.position.set(0, ledge.position.y + 0.5, LEDGE_Z + 0.5); S.add(ROWLIGHT);
    // the first sun: a low warm light from the east that turns the stones gold in shot 6
    WARM = new THREE.DirectionalLight(0xff9a3c, 0); WARM.position.set(60, 9, 18); WARM.target.position.set(0, 0, 0.5);
    WARM.castShadow = true; WARM.shadow.mapSize.set(1024, 1024); Object.assign(WARM.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 140 }); WARM.shadow.bias = -0.0005;
    S.add(WARM, WARM.target);
    // stronger rays in the valley so the four places read
    
    CAVE = W.stage(CAVE);

    // glimpses: the same screen spot for each gold highlight (centre-right)
    const spot = (S, pos, tgt, col = 0xffc070, I = 40, ang = 0.12) => { const L = new THREE.SpotLight(col, I, 40, ang, 0.6, 1.2); L.position.set(...pos); L.target.position.set(...tgt); S.add(L, L.target); return L; };
    SPOTS.lip = spot(S, [-0.8, 1.6, 2.2], [-1.62, 0.15, 0.4], 0xffc070, 0, 0.1);

    const gard = await two_gardens({ time: 'golden' });
    // a palm by the back wall of garden A
    let best = null; for (const p of gard.props.palms) { const d = Math.hypot(p.position.x - (-21 - 7.5), p.position.z - (-15.8)); if (!best || d < best.d) best = { p, d }; }
    PALM = best.p.position.clone();
    C.g_palm = { pos: [PALM.x - 3.2, PALM.y + 1.4, PALM.z + 8.0], look: [PALM.x + 0.9, PALM.y + 3.0, PALM.z - 1.5], fov: 36 };
    SPOTS.palm = spot(gard.scene, [PALM.x - 2, PALM.y + 3.5, PALM.z + 3], [PALM.x + 0.15, PALM.y + 1.4, PALM.z], 0xffc070, 120, 0.09);
    GARD = W.stage(gard);

    const seas = await confluence({ time: 'golden' });
    C.g_seam = { pos: [2.3, 5.5, 5.0], look: [2.85, 0.0, -24], fov: 30 };
    SEAS = W.stage(seas);
    const pass = await mountain_pass_barrier({ time: 'golden', build: 1, pour: 0.3 });
    C.g_iron = { pos: [1.45, 1.4, 2.0], look: [0.55, 1.25, 0.5], fov: 30 };
    SPOTS.iron = spot(pass.scene, [3, 3, 4], [0.7, 1.26, 0.5], 0xffc070, 30, 0.08);
    PASS = W.stage(pass);
    for (const st of [CAVE, GARD, SEAS, PASS]) { st.set.update(0, null, {}); G.R.compile(st.scene, st.camera); }
    CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
    console.error(`[k18-00] init ${((performance.now() - T0) / 1000).toFixed(1)} s`);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const { i, s, p } = K.shotAt(SHOTS, t);
    const pe = (s.ease || E.linear)(p);
    let cam;
    if (s.vista) cam = vistaCam(t);
    else if (s.row) {
      // lateral track that follows the running flame
      const x = clamp(runX(t), WX0, WX1), k = (x - WX0) / (WX1 - WX0);
      cam = K.camLerp(C.row_a, C.row_b, k);
      cam = { ...cam, look: [x + 0.25, cam.look[1], cam.look[2]], pos: [x - 0.35 + 0.5 * k, cam.pos[1], cam.pos[2]] };
    } else cam = K.camLerp(C[s.a], s.b ? C[s.b] : null, pe);
    cam = K.breathe(cam, t, 0.002, 7 + i);

    if (s.set === 'cave') {
      // wicks: lit as the runner passes; they burn on, then gutter out in the last shot
      const rx = runX(t), out = 1 - E.inOutSine(prog(t, 15.6, 17.2));
      let lit = 0;
      WICKS.forEach((w, j) => { const on = t >= RUN0 && rx >= wickX(j) - 0.02 ? clamp((rx - wickX(j) + 0.02) / 0.12) : 0, k = on * out * (0.9 + 0.1 * Math.sin(t * 7 + j)); w.userData.f.visible = k > 0.01; w.userData.f.userData.update(t, k); lit += k; });
      const running = t > RUN0 - 0.05 && t < RUN1 + 0.1;
      RUNNER.visible = running; RUNNER.position.set(rx, WICKS[0].position.y + 0.005, LEDGE_Z); RUNNER.userData.update(t, running ? 1 : 0);
      ROWLIGHT.intensity = 6 * lit / NW; ROWLIGHT.position.x = 0.5 * rx;
      // the sun comes up over shots 5-7; it never goes back (the loop shot is again blue: the light fades with the wicks)
      const sunK = i <= 2 ? 0 : i === 3 ? 0.25 * prog(t, 5.56, 7.81) : i === 4 ? 0.25 + 0.75 * E.inOutSine(prog(t, 7.81, 9.9)) : i === 5 ? 1 : i === 9 ? 0.35 : 0;
      WARM.intensity = 11 * sunK; WARM.position.set(60, 4 + 10 * sunK, 18);
      SPOTS.lip.intensity = i === 5 ? 40 : 0;
      CAVE.set.props.vista.rays.forEach((r, j) => { const c = [0.1, 0.36, 0.62, 0.86][[3, 0, 1, 2].indexOf(j)]; const kp = s.vista ? Math.exp(-(((prog(t, 3.26, 5.56) - c) / 0.16) ** 2)) : 0; r.userData.update(t, 1.3 * kp); });
      const ex = i === 0 || i === 10 ? 2.3 : i === 2 ? 1.45 : i === 4 || i === 5 ? 1.3 : i === 9 ? 1.9 : 1.6;
      CAVE.scene.fog.density = FOG0 * (s.vista ? 0.3 : 1);
      G.renderSet(ctx, CAVE, t, u, { cam, exposure: ex, mist: i === 0 || i === 10 ? 1 : 0, lamp: i === 0 || i === 10 ? 0.4 : 1 });
    } else if (s.set === 'gard') G.renderSet(ctx, GARD, t, u, { cam });
    else if (s.set === 'seas') G.renderSet(ctx, SEAS, t, u, { cam, fish: 0 });
    else G.renderSet(ctx, PASS, t, u, { cam, build: 1, pour: 0.3 });
    CAP.draw(ctx, t);
    K.seal(ctx, IMG, t, D, 1.6);
  },
  post(ctx, u, t) { K.grain(ctx, t); },
});
