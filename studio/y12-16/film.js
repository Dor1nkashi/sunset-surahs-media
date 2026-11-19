// y12-16 "Fifteen Lessons from the Best of Stories" (outro, Yusuf 12:111). Canaan hills at first light: the sun
// breaks over the eastern ridge (the same east as y12-00), the light walks over terraces, the well, the house roof;
// three object glimpses (a lit lamp, a whole shirt on a line, an open hand); then a tilt up to the still-dark zenith
// where the eleven stars of the dream shine (lib_shared/eleven.js), ending on y12-00's first frame. Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { canaan_hills } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { elevenStars, ELEVEN, BRIGHTEST, ELEVEN_CENTRE } from '../lib_shared/eleven.js';
import * as K from '../y12-12/kit.js';
const { THREE, clamp, lerp, sstep } = W;
const V3 = K.V3, D = 14.22;

let SET, ST, CAP, E11, hy, h0, LAMP, SHIRT, P = {}, SHOTS, BASE = {};
const pr = (t, a, b) => clamp((t - a) / (b - a));
const sm = (t, a, b) => K.easeIO(pr(t, a, b));
const C = (pos, look, fov, roll = 0) => ({ pos, look, fov, roll });
const G0 = (x, z, dy) => [x, hy(x, z) + dy, z];
const toward = (pos, tx, tz, el, d = 30) => { const dx = tx - pos[0], dz = tz - pos[2], l = Math.hypot(dx, dz); return [pos[0] + dx / l * d, pos[1] + Math.tan(el * Math.PI / 180) * d, pos[2] + dz / l * d]; };
// the sun: just under the eastern ridge at 0, clear of it by ~2 s, about 9 degrees up by the end
const SUN_AZ = new THREE.Vector3(0.52, 0, -0.85).normalize();
const sunEl = (t) => (5.5 + 8.5 * sm(t, 0, D)) * Math.PI / 180;   // the eastern ridge stands ~5 degrees high
const sunDir = (t) => { const e = sunEl(t); return V3(SUN_AZ.x * Math.cos(e), Math.sin(e), SUN_AZ.z * Math.cos(e)); };
const LX = 3.9, LZ = 1.6;          // the lamp ledge and shirt line, in the house courtyard

async function build() {
  SET = await canaan_hills({ time: 'predawn' });
  ST = W.stage(SET); const P0 = SET.props; hy = P0.terrain.heightAt; h0 = P0.house.position.y;
  BASE.env = SET.scene.environmentIntensity; BASE.hemi = SET.atmo.hemi?.intensity ?? 0;
  E11 = elevenStars(THREE, { size: 17 }); SET.scene.add(E11);
  // same olive clearing as y12-00 (its lamp terrace), so frame 1 of the series matches exactly
  for (const o of P0.olives) { const dx = o.position.x - 12, dz = o.position.z - 15, d = Math.hypot(dx, dz), c = (dx * 0.52 - dz * 0.85) / d; if (d < 10 || (d < 60 && c > 0.75)) o.visible = false; }
  const g = SET.group, pl = await K.mats.planks();
  // a low stone ledge by the courtyard wall with a clay oil lamp
  const stone = await W.pbr('rustic_stone_wall', { tile: 1.2, tint: 0xeee2cc, res: 1024 });
  const ledge = W.rbox(0.9, 0.85, 0.42, stone, { r: 0.04 }); ledge.position.set(LX, h0, LZ); g.add(W.shadows(ledge));
  const clay = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 0.85 });
  LAMP = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.004], [0.075, 0.025], [0.06, 0.04], [0.03, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 48), clay); body.scale.set(1, 1, 1.35); LAMP.add(W.shadows(body));
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.06, 16).rotateX(Math.PI / 2), clay); sp.position.set(0, 0.035, 0.09); LAMP.add(W.shadows(sp));
  const fl = W.flame({ h: 0.09, w: 0.04, seed: 4, inten: 3.5, light: 1.2, dist: 4, planes: 2 }); fl.position.set(0, 0.045, 0.115); LAMP.add(fl); LAMP.userData.f = fl;
  LAMP.position.set(LX + 0.1, h0 + 0.85, LZ + 0.05); LAMP.rotation.y = 0.6; g.add(LAMP);
  // a washing line between two posts with a whole linen shirt hanging straight
  for (const x of [LX - 1.9, LX + 1.4]) { const p = W.rbox(0.07, 1.9, 0.07, pl, { r: 0.015 }); p.position.set(x, h0, LZ + 1.4); g.add(W.shadows(p)); }
  g.add(W.rope([V3(LX - 1.9, h0 + 1.86, LZ + 1.4), V3(LX - 0.25, h0 + 1.78, LZ + 1.4), V3(LX + 1.4, h0 + 1.86, LZ + 1.4)], 0.006));
  const sh = new THREE.Shape(), hw = 0.25, sl = 0.3;
  sh.moveTo(-0.06, 0); sh.lineTo(-hw - sl * 0.9, -0.05); sh.lineTo(-hw - sl, -0.22); sh.lineTo(-hw, -0.24); sh.lineTo(-hw + 0.02, -0.95); sh.lineTo(hw - 0.02, -0.95); sh.lineTo(hw, -0.24); sh.lineTo(hw + sl, -0.22); sh.lineTo(hw + sl * 0.9, -0.05); sh.lineTo(0.06, 0); sh.quadraticCurveTo(0, -0.07, -0.06, 0);
  const sg = new THREE.ShapeGeometry(sh, 40), pp = sg.attributes.position, nn = W.noise2(8);
  // re-mesh densely by subdividing via a plane projection: displace for soft vertical folds
  const dense = new THREE.PlaneGeometry(0.62 + 2 * sl, 0.97, 120, 120), dp = dense.attributes.position;
  const inside = (x, y) => { // point-in-shape test against the outline (convex enough per row)
    const yy = -y; if (yy < 0 || yy > 0.95) return false; const half = yy < 0.24 ? (yy < 0.05 ? 0.06 + (hw + sl * 0.9 - 0.06) * yy / 0.05 : hw + sl * 0.95) : hw - 0.02 * (yy - 0.24) / 0.71; return Math.abs(x) <= half; };
  dense.translate(0, -0.97 / 2, 0);
  const keep = [];
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), y = dp.getY(i); dp.setZ(i, 0.012 * Math.sin(x * 38 + nn(x * 4, y * 4) * 2) * sstep(0, 0.3, -y) + 0.008 * nn(x * 9, y * 9)); }
  const idx = dense.index.array, ni = [];
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; const cx = (dp.getX(a) + dp.getX(b) + dp.getX(c)) / 3, cy = (dp.getY(a) + dp.getY(b) + dp.getY(c)) / 3; if (inside(cx, cy)) ni.push(a, b, c); }
  dense.setIndex(ni); dense.computeVertexNormals(); sg.dispose();
  const linen = (await K.mats.dyed(0xf0e8d8)).clone(); linen.side = THREE.DoubleSide;
  SHIRT = new THREE.Mesh(dense, linen); SHIRT.castShadow = SHIRT.receiveShadow = true; SHIRT.position.set(LX - 0.25, h0 + 1.79, LZ + 1.41); g.add(SHIRT);
  for (const dx of [-0.16, 0.16]) { const pg = W.rbox(0.015, 0.06, 0.02, pl, { r: 0.004 }); pg.position.set(LX - 0.25 + dx, h0 + 1.76, LZ + 1.41); g.add(pg); }
  // a person for the open hand (only the hand and sleeve are seen)
  const PE = await K.people();
  P.m = PE.make({ kind: 'man', outfit: 'thobe', palette: 'cream', beard: 'short', seed: 31, detail: 0.8 }); g.add(P.m.object3d);
}

function light(t) {
  const sky = SET.props.sky.userData.u, d = sunDir(t), e = sunEl(t), k = sstep(0.09, 0.24, e);
  const dawn = 0.55 + 0.45 * k;
  sky.sunD.value.copy(d); sky.sunC.value.setRGB(1.0 * dawn, 0.62 * dawn, 0.25 * dawn); sky.glow.value = 1.0; sky.sunDisc.value = 0.99993;
  sky.zen.value.setRGB(lerp(0.016, 0.06, k * 0.6), lerp(0.04, 0.12, k * 0.6), lerp(0.12, 0.28, k * 0.6));
  sky.hor.value.setRGB(lerp(0.5, 1.0, k), lerp(0.28, 0.62, k), lerp(0.2, 0.38, k));
  sky.moonOn.value = 0;
  const L = SET.atmo.sun, f = V3(0, h0, 0); L.position.copy(f).addScaledVector(d, 200); L.target.position.copy(f); L.target.updateMatrixWorld();
  L.color.setRGB(1, 0.62 + 0.16 * k, 0.32 + 0.2 * k); L.intensity = 5.5;
  SET.scene.environmentIntensity = BASE.env * lerp(0.55, 0.42, k); if (SET.atmo.hemi) SET.atmo.hemi.intensity = BASE.hemi;
  if (SET.scene.fog) SET.scene.fog.color.setRGB(lerp(0.2, 0.62, k), lerp(0.16, 0.45, k), lerp(0.2, 0.36, k));
  return k;
}

function shots() {
  const wideA = (() => { const p = G0(10.5, 21.5, 1.5); return C(p, toward(p, -3, -10, 13), 62); })();   // y12-00 frame 1
  const crA = (() => { const p = G0(10.5, 21.5, 6.0); return C(p, toward(p, 20, -30, 9), 58); })();
  const crB = (() => { const p = G0(10.5, 21.5, 1.5); return C(p, toward(p, 10.5 + SUN_AZ.x * 50, 21.5 + SUN_AZ.z * 50, 5), 58); })();
  const zen = (() => { const p = G0(10.5, 21.5, 1.5); return C(p, ELEVEN_CENTRE.map((v, i) => p[i] + v * 30 - (i === 1 ? 3 : 0)), 56); })();
  const W0 = SET.props.well.position, H = SET.props.house.position;
  const hand = () => { const h = K.handPos(P.m, 'Right'), side = V3(-SUN_AZ.z, 0, SUN_AZ.x); return C(h.clone().addScaledVector(side, -0.8).addScaledVector(SUN_AZ, -0.2).add(V3(0, 0.12, 0)).toArray(), h.toArray(), 30); };
  return [
    { t0: 0, t1: 2.2, a: zen, b: crB, ease: (x) => K.easeIO(clamp(x * 1.05)) },                                                                                       // 1 sunrise over the eastern ridge; the eleven fade above it
    { t0: 2.2, t1: 3.56, a: C(G0(16, 24, 4.2), [H.x + 1, H.y + 2, H.z], 46), b: C(G0(11, 15, 3.0), [H.x + 0.5, H.y + 2, H.z], 44) },   // 2 gliding over the terraces toward the house
    { t0: 3.56, t1: 4.66, a: C([W0.x + 2.6, W0.y + 1.25, W0.z + 2.4], [W0.x, W0.y + 0.75, W0.z], 36), b: null },                     // 3 light reaches the well rim and rope
    { t0: 4.66, t1: 5.6, a: C([H.x + 5.5, H.y + 3.0, H.z + 7.5], [H.x, H.y + 3.2, H.z - 2], 38), b: C([H.x + 4.9, H.y + 3.1, H.z + 6.6], [H.x, H.y + 3.25, H.z - 2], 36) }, // 4 the house roof catches the light
    { t0: 5.6, t1: 6.32, a: C(G0(-6, 18, 1.8), [-20, hy(-20, -10) + 3, -10], 46), b: C(G0(-6, 18, 3.0), [-20, hy(-20, -10) + 4.5, -10], 46) }, // 5 the terraces light up, one by one
    { t0: 6.32, t1: 8.29, a: SET.cameras.wide, b: null },                                                                       // 6 the whole hillside in warm light
    { t0: 8.29, t1: 8.96, a: C([LX - 0.35, h0 + 1.12, LZ + 0.75], [LX + 0.1, h0 + 0.9, LZ + 0.05], 30), b: null },                  // 7 patience: a lamp burning on the ledge
    { t0: 8.96, t1: 9.56, a: C([LX + 0.1, h0 + 1.5, LZ - 0.35], [LX - 0.25, h0 + 1.35, LZ + 1.41], 46), b: null },                    // 8 honesty: a whole shirt hanging straight
    { t0: 9.56, t1: 10.87, cam: hand },                                                                                         // 9 forgiveness: an open hand in the light
    { t0: 10.87, t1: D + 0.01, a: wideA, b: zen, ease: (x) => K.easeIO(clamp(x * 1.1)) },                                        // 10 up into the still-dark zenith: the eleven
  ];
}
function person(t) {
  const p = P.m; p.object3d.visible = t >= 9.56 && t < 10.87;
  if (!p.object3d.visible) return;
  K.place(p, LX - 1.0, h0, LZ + 0.2, Math.atan2(SUN_AZ.x, SUN_AZ.z)); p.setPose('stand', t);
  const e = sm(t, 9.6, 10.5); K.reach(p, 'Right', K.onBody(p, -0.18, 1.12, 0.42), K.onBody(p, -0.8, 0.6, -0.5)); K.tilt(p, 'RightHand', 0, -70 * e, 0); K.fingers(p, 'Right', 1 - e);
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
    ST.update(0, 0, {}); G.R.compile(ST.scene, ST.camera);
  },
  draw(ctx, u, t, IMG) {
    M.fill(ctx, '#000');
    const k = light(t); person(t); LAMP.userData.f.userData.update(t, 1);
    const s = K.shotAt(SHOTS, t), cam = s.cam ? s.cam(t) : K.camAt(s, t);
    // the eleven: fading as the sun clears the ridge; back at full in the dark zenith at the end
    const op = s.t0 === 10.87 ? lerp(0.35, 1, sm(t, 11.2, 13.6)) : s.t0 === 0 ? lerp(1, 0.4, sm(t, 0.2, 2.2)) : lerp(1, 0.3, k);
    E11.position.set(...cam.pos); E11.userData.update(t, null, { op, hi: 0 });
    const ex = s.t0 === 10.87 ? lerp(1.15, 1.45, sm(t, 11.2, 13.6)) : s.t0 === 0 ? lerp(1.45, 1.4, sm(t, 0, 2.2)) : lerp(1.55, 1.1, k);
    G.renderSet(ctx, ST, t, u, { cam, exposure: ex });
    K.vignette(ctx, 0.3);
    CAP.draw(ctx, t);
    K.drawSeal(ctx, IMG.seal, t, 12.62, D);
  },
  post(ctx, u, t) { K.grain(ctx, t, M.mulberry32, 0.035); },
});
