// y12-03 "At the Bottom of a Well, He Got a Promise". Shot list: studio/shotlists/y12_03.md.
// No figure is ever shown inside the well. Inside: a cool stone shaft with ferns, a coin of sky, a rope end
// swinging; the sun climbs so the sunlit patch slides down the wall (real shadowing by the shaft) until it
// reaches the water. Outside: five brothers (people.js, faceless, backs) pay out the rope and walk away.
// Pure function of t.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import * as W from '../lib_shared/world.js';
import { the_well } from '../lib_shared/sets_yusuf.js';
import { captions, loadLines } from '../lib_shared/captions.js';
import { loadPeople } from '../lib_shared/people.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const { THREE } = W;
const { W: FW, H: FH, prog, E, lerp, clamp, mulberry32 } = M;
const PORT = M.FORMAT.portrait;
const D = 25.69;
const fv = (f) => (PORT ? f : f * 0.64);
const L3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const camL = (a, b, p) => ({ pos: L3(a.pos, b.pos, p), look: L3(a.look, b.look, p), fov: lerp(a.fov, b.fov, p), roll: lerp(a.roll || 0, b.roll || 0, p) });
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = () => new THREE.Vector3(), _q = () => new THREE.Quaternion();

let WELL, CAP, K = {};

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

// a fern frond: curved rachis with paired pinnae (each a tapered blade), merged; double-sided, translucent green
function frond(len, seed) {
  const r = mulberry32(seed), geos = [], N = 18;
  const rach = (s) => V3(0, Math.sin(s * 1.3) * len * 0.35 - s * s * len * 0.25, s * len);      // out from the wall (+z), arching down
  for (let i = 1; i < N; i++) {
    const s = i / N, p = rach(s), nx = rach(Math.min(1, s + 0.02)).sub(p).normalize(), pl = len * 0.22 * Math.sin(Math.PI * (0.15 + 0.85 * s)) * (1 - 0.5 * s);
    for (const sd of [-1, 1]) {
      const g = new THREE.PlaneGeometry(pl, pl * 0.22, 6, 1), q = g.attributes.position;
      for (let k = 0; k < q.count; k++) { const x = q.getX(k) + pl / 2, w = 1 - (x / pl) ** 1.6; q.setXYZ(k, x * sd, q.getY(k) * w, -0.12 * x * x / pl); }
      g.rotateX(-Math.PI / 2 + 0.25); g.rotateY(Math.atan2(nx.x, nx.z) + sd * 0.35 * (r() - 0.5));
      g.translate(p.x, p.y, p.z); geos.push(g);
    }
  }
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(rach(i / 20));
  geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.004, 5));
  const geo = W.BGU.mergeGeometries(geos.map((g) => g.index ? g.toNonIndexed() : g));
  geo.computeVertexNormals();
  return geo;
}

// expanding water rings (a shader disc on the water): rings born at fixed times
function rings(radius, times) {
  const u = { t: { value: 0 }, T: { value: times.concat([-99, -99, -99, -99]).slice(0, 4) }, P: { value: [new THREE.Vector2(0.1, -0.15), new THREE.Vector2(-0.2, 0.1), new THREE.Vector2(0.1, -0.15), new THREE.Vector2(0, 0)] } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float t; uniform float T[4]; uniform vec2 P[4]; varying vec2 vP;
      void main(){ float a = 0.; for (int i = 0; i < 4; i++) { float age = t - T[i]; if (age < 0. || age > 3.5) continue;
        float d = length(vP - P[i]), R = 0.32 * age, w = 0.025 + 0.02 * age; float ring = exp(-pow((d - R) / w, 2.)) + 0.6 * exp(-pow((d - R * 0.62) / w, 2.));
        a += ring * exp(-age * 1.1) * 0.55; }
        gl_FragColor = vec4(vec3(0.75, 0.85, 0.9) * a, a);
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), m); mesh.rotation.x = -Math.PI / 2;
  mesh.userData.update = (t) => { u.t.value = t; };
  return mesh;
}

M.film({
  fonts: ['800 76px Display', '600 64px UI', '600 30px Display'],
  images: { seal: 'assets/seal.png' },
  samples: 1,
  async init() {
    await G.initGL({ exposure: 1.0 }); W.init(G.R);
    WELL = W.stage(await the_well({ time: 'day' }));
    const fixT = (x) => x.replace(/ʿ/g, '‘').replace(/ʾ/g, '’').replace(/ṣ/g, 's').replace(/ḥ/g, 'h');
    CAP = captions((await loadLines('lines.json')).map((l) => ({ ...l, text: fixT(l.text), keys: (l.keys || []).map(fixT) })), { display: 'Display', ui: 'UI', size: PORT ? 84 : 74 });
    const S = WELL.set, P = S.props, sc = WELL.scene, hy = P.terrain.heightAt, h0 = P.well.position.y;
    K.h0 = h0; K.hy = hy;
    P.terrain.mesh.castShadow = false;                                       // the ground has no hole: let the sun into the shaft
    const R0 = 0.78, WY = h0 - 9 + 0.25, top = h0 + 0.91; K.WY = WY; K.top = top;
    // ---- the rope end hangs from the beam; pivot at the beam so it can swing (pendulum, pure in t)
    const rope = P.rope, piv = new THREE.Group(); piv.position.set(0, h0 + 1.86, 0); sc.add(piv);
    rope.parent.remove(rope); rope.position.set(0, -1.86, 0); piv.add(rope); K.ropePiv = piv;
    // ---- ferns on the shaft wall (rooted in seams, arching out and down), cool green, translucent
    const fm = new THREE.MeshStandardMaterial({ color: 0x4a7a32, roughness: 0.62, side: THREE.DoubleSide, emissive: 0x0a1a04 });
    K.ferns = [];
    const spots = [[-2.6, 0.3], [-2.75, 1.1], [-4.9, 3.6], [-5.1, 4.2], [-6.6, 2.0], [-6.75, 2.5], [-7.4, 5.0], [-3.8, 5.6]];
    spots.forEach(([dy, a], i) => {
      const geo = frond(0.32 + 0.12 * ((i * 7) % 3) / 2, i + 3), m = new THREE.Mesh(geo, fm); m.castShadow = true; m.receiveShadow = true;
      const g = new THREE.Group(); g.position.set(Math.cos(a) * (R0 - 0.02), h0 + dy, Math.sin(a) * (R0 - 0.02)); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)) + (i % 2 ? 0.4 : -0.3);
      g.add(m); sc.add(g); K.ferns.push({ g, m, ph: i * 1.9, base: (i % 2 ? 0.12 : -0.08) });
    });
    // ---- dust motes in the sunlit column (drift on fixed paths)
    { const n = 160, r = mulberry32(9), pos = new Float32Array(n * 3), base = [];
      for (let i = 0; i < n; i++) base.push([(r() - 0.5) * 1.3, WY + 0.3 + r() * 8.2, (r() - 0.5) * 1.3, r() * 6.28, 0.02 + r() * 0.03]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      const m = new THREE.PointsMaterial({ color: 0xffe8c0, size: 0.009, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; sc.add(pts);
      K.motes = { pts, m, upd: (t) => { base.forEach(([x, y, z, ph, v], i) => pos.set([x + 0.08 * Math.sin(t * 0.3 + ph), y + ((v * t + ph) % 1.2) - 0.6, z + 0.08 * Math.cos(t * 0.27 + ph)], i * 3)); g.attributes.position.needsUpdate = true; } }; }
    // ---- water rings: grit at 13.3, the droplet at 23.35; a seam drop falls from the wall
    K.rings = rings(R0, [13.3, 23.35]); K.rings.position.y = WY + 0.004; sc.add(K.rings);
    K.dropSeam = V3(-0.62, h0 - 3.4, 0.45);
    K.drop = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xcfe0e8, roughness: 0.05, transmission: 0.6, thickness: 0.02 })); K.drop.scale.y = 1.4; sc.add(K.drop);
    // a cool fill so the shaft is not black where the sun does not reach
    const cool = new THREE.PointLight(0x7a9ac8, 0.6, 9, 1.2); cool.position.set(0, WY + 3, 0); sc.add(cool); K.cool = cool;
    // ---- five brothers at the rim (backs to camera), two pay out the rope
    const PP = await loadPeople(THREE, GLTFLoader);
    const PAL = [['#7a3a22', '#3a2b22'], ['#5a6030', '#3b3528'], ['#3a3634', '#2a2624'], ['#9a7034', '#4a3626'], ['#6a2a1c', '#2e2a28']];
    const T3 = [{ outfit: 'traveller', beard: 'full', headwear: 'keffiyeh', seed: 41 }, { outfit: 'thobe', beard: 'short', headwear: 'keffiyeh', seed: 42 }, { outfit: 'thobe', beard: 'full', headwear: 'wrap', seed: 43 }];
    const at = [[-0.3, 1.6, 0], [0.95, 1.3, 0], [-1.35, 1.05, 0], [1.65, 0.25, 0], [-1.7, -0.15, 0]];
    K.bros = at.map(([x, z, yaw], i) => {
      const p = PP.make({ kind: 'man', ...T3[i % 3], palette: { robe: PAL[i][0], cloak: PAL[i][1], wrap: '#d8ccb4', trousers: '#9a8a70', sash: '#6a4a2a' }, detail: 0.7, height: 0.95 + 0.06 * Math.sin(i * 2.7) });
      p.object3d.position.set(x, hy(x, z), z); p.object3d.rotation.y = Math.atan2(-x, -z) + yaw * 0.1; sc.add(p.object3d);
      return { p, x, z, yaw: p.object3d.rotation.y };
    });
    const rm = W.ropeMat(); K.pull = [0, 1].map(() => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10, 1), rm); c.castShadow = true; sc.add(c); return c; });
    // ---- cameras
    const up = [0.16, WY + 0.75, 0.1];
    K.cams = {
      upA: { pos: up, look: [0.02, h0 + 6, 0.0], fov: fv(70), roll: 0 },
      upB: { pos: up, look: [0.02, h0 + 6, 0.0], fov: fv(70), roll: 5 * Math.PI / 180 },
      upC: { pos: [0.16, WY + 1.25, 0.1], look: [0.02, h0 + 6, 0.0], fov: fv(68), roll: 5 * Math.PI / 180 },
      rim: { pos: [0.9, hy(0.9, 4.6) + 0.6, 4.6], look: [0, h0 + 1.25, -0.4], fov: fv(50) },
      rimB: { pos: [0.85, hy(0.85, 4.4) + 0.62, 4.4], look: [0, h0 + 1.25, -0.4], fov: fv(50) },
      ropeA: { pos: [1.0, top + 0.4, 0.95], look: [0, top - 0.7, 0], fov: fv(50) },
      ropeB: { pos: [0.85, top + 0.3, 0.8], look: [0, top - 1.4, 0], fov: fv(46) },
      leaveA: { pos: [0.5, h0 + 1.2, 4.2], look: [0, h0 + 1.3, -5], fov: fv(48) },
      leaveB: { pos: [0.15, top + 0.7, 0.5], look: [0, h0 - 1.0, -1.5], fov: fv(48) },
      sink: { pos: [0.0, h0 - 1.2, 0.15], look: [0, WY, -0.2], fov: fv(52) },
      descA: { pos: [0.3, h0 - 1.6, 0.35], look: [-0.7, h0 - 3.2, -0.45], fov: fv(46) },
      descB: { pos: [0.3, h0 - 5.6, 0.35], look: [-0.7, h0 - 7.0, -0.45], fov: fv(46) },
      waterA: { pos: [0.3, h0 - 5.6, 0.35], look: [-0.7, h0 - 7.0, -0.45], fov: fv(46) },
      waterB: { pos: [0.3, WY + 1.8, 0.35], look: [-0.1, WY, -0.15], fov: fv(48) },
      settle: { pos: [0.35, WY + 1.4, 0.4], look: [-0.05, WY, -0.1], fov: fv(50) },
      coinA: { pos: up, look: [-0.3, WY + 2.5, -0.4], fov: fv(70) },
      coinB: { pos: up, look: [0.02, h0 + 6, 0.0], fov: fv(70), roll: 0 },
      ring: { pos: [0.25, WY + 2.2, 0.3], look: [-0.3, h0 - 2.5, -0.35], fov: fv(46) },
      dropA: { pos: [0.2, WY + 1.0, 0.0], look: [-0.6, WY + 0.25, 0.44], fov: fv(40) },
    };
    WELL.update(0, 0, {}); G.R.compile(WELL.scene, WELL.camera);
  },
  draw(ctx, u, t, IMG) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    const C = K.cams, S = WELL.set, A = S.atmo;
    let cam, inside = true, expo = 1.0;
    if (t < 1.55) cam = camL(C.upA, C.upB, E.inOutSine(prog(t, 0, 1.55)));
    else if (t < 2.99) cam = camL(C.upB, C.upC, E.inOutSine(prog(t, 1.55, 2.99)));
    else if (t < 4.45) { inside = false; cam = camL(C.rim, C.rimB, E.inOutSine(prog(t, 2.99, 4.45))); }
    else if (t < 6.49) { inside = false; cam = camL(C.ropeA, C.ropeB, E.inOutSine(prog(t, 4.45, 6.49))); }
    else if (t < 7.6) { inside = false; cam = C.leaveA; }
    else if (t < 8.46) { const p = E.inOutCubic(prog(t, 7.6, 8.46)); cam = camL(C.leaveB, C.sink, p); inside = p > 0.3; }
    else if (t < 12.43) cam = camL(C.descA, C.descB, E.inOutSine(prog(t, 8.46, 12.43)));
    else if (t < 15.15) cam = camL(C.waterA, C.waterB, E.inOutSine(prog(t, 12.43, 14.6)));
    else if (t < 17.49) cam = C.settle;
    else if (t < 20.0) cam = camL(C.coinA, C.coinB, E.inOutSine(prog(t, 17.49, 19.9)));
    else if (t < 22.13) cam = C.ring;
    else if (t < 24.0) cam = C.dropA;
    else cam = camL(C.dropA, C.upA, E.inOutCubic(prog(t, 24.0, D)));
    // ---- the sun climbs: the sunlit patch slides down the far wall until it reaches the water (14.6)
    const el = t < 8.46 ? 62 : t < 15.0 ? lerp(62, 82.5, E.inOutSine(prog(t, 8.46, 15.0))) : lerp(82.5, 85, prog(t, 15, D));
    const e = el * Math.PI / 180, az = 35 * Math.PI / 180, dir = V3(Math.cos(az) * Math.cos(e), Math.sin(e), Math.sin(az) * Math.cos(e));
    A.sun.target.position.set(0, K.h0 - 4, 0); A.sun.position.copy(A.sun.target.position).addScaledVector(dir, 200); A.sun.target.updateMatrixWorld();
    A.sun.shadow.camera.far = 400; A.sun.intensity = 3.6;
    WELL.scene.environmentIntensity = inside ? 0.14 : 1.0; if (A.hemi) A.hemi.intensity = inside ? 0.02 : 0.25;
    K.cool.intensity = inside ? 0.5 + 0.25 * prog(t, 17.5, 20) : 0;
    expo = inside ? 1.15 + 0.15 * prog(t, 17.5, 20) : 0.9;
    // rope end swings (damped pendulum restarted when the rope is let go at 6.4) and drifts in the draught
    const sw = 0.05 * Math.sin(t * 1.9) * Math.exp(-0.15 * t) + (t > 6.4 ? 0.09 * Math.exp(-0.5 * (t - 6.4)) * Math.sin((t - 6.4) * 2.1) : 0) + 0.012 * Math.sin(t * 0.7);
    K.ropePiv.rotation.set(sw, 0, 0.6 * sw);
    // ferns sway in the draught
    K.ferns.forEach((f) => { f.g.rotation.x = 0.06 * Math.sin(t * 1.1 + f.ph) + 0.03 * Math.sin(t * 2.7 + f.ph * 2); f.g.rotation.z = f.base + 0.04 * Math.sin(t * 0.9 + f.ph); });
    K.motes.upd(t); K.motes.m.opacity = inside ? 0.55 : 0;
    K.rings.userData.update(t);
    // the droplet: gathers at the seam, falls (g = 9.8) from 22.6 and lands at 23.35
    { const td = 22.6, fall = Math.sqrt(2 * (K.dropSeam.y - K.WY) / 9.8), k = t - td;
      K.drop.visible = t > 21.4 && k < fall; const y = k < 0 ? K.dropSeam.y : K.dropSeam.y - 4.9 * k * k; K.drop.position.set(K.dropSeam.x * (k < 0 ? 1 : 0.98), Math.max(K.WY, y), K.dropSeam.z); K.drop.scale.setScalar(k < 0 ? 0.5 + 0.5 * sm((t - 21.4) / 1.1) : 1); }
    // ---- the brothers: two pay out the rope hand over hand (3.0-6.4), then all walk away up the slope (6.5-)
    K.bros.forEach((b, i) => {
      const p = b.p, o = p.object3d, leave = t > 6.5 + i * 0.12;
      if (!leave) { p.setPose('stand', t + i * 1.3); o.position.set(b.x, K.h0 + 0.0, b.z); o.rotation.y = b.yaw;
        if (i < 2) { // hands at the chest, one above the other on the rope, alternating as it is paid out toward the beam
          const ph = (t - 3.0) * 2.4 + i * Math.PI, fw = V3(-b.x, 0, -b.z).normalize(), base = o.position.clone().addScaledVector(fw, 0.38).setY(K.h0 + 1.15);
          const h1 = base.clone().add(V3(0, 0.12 + 0.08 * Math.sin(ph), 0)).addScaledVector(fw, 0.06), h2 = base.clone().add(V3(0, -0.12 - 0.08 * Math.sin(ph), 0)).addScaledVector(fw, -0.04);
          const pole = o.position.clone().add(V3(0, 0.2, 0)).addScaledVector(fw, -0.3); reach(p, 'Right', h1, pole); reach(p, 'Left', h2, pole);
          const hw = p.bones('RightHand').getWorldPosition(_v()), top = V3(0, K.h0 + 1.86, 0), c = K.pull[i], d = top.clone().sub(hw);
          c.visible = t < 6.45; c.position.copy(hw).addScaledVector(d, 0.5); c.scale.set(1, d.length(), 1); c.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); } }
      else { const tw = t - 6.5 - i * 0.12, sp = p.speed ? p.speed('walk') : 1.2, d = sp * tw, sx = b.x >= 0 ? 1 : -1, dx = sx * 0.55, dz = -1, n = Math.hypot(dx, dz);
        // walk out round the well and on up the slope (-z), backs to the camera
        const x = b.x + Math.min(d, 1.6) * sx * 0.9 + Math.max(0, d - 1.6) * dx / n, z = b.z - d * 0.8;
        p.setPose('walk', tw + i * 0.4); o.rotation.y = Math.atan2(d < 1.6 ? sx * 0.9 : dx / n, d < 1.6 ? -0.8 : dz / n); o.position.set(x, K.hy(x, z), z); }
      o.visible = !inside; if (i < 2 && (leave || inside)) K.pull[i].visible = false;
    });
    G.renderSet(ctx, WELL, t, u, { cam, exposure: expo });
    CAP.draw(ctx, t);
    const su = prog(t, 24.09, D - 0.05), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { const s = PORT ? 480 : 400; ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, FW / 2 - s / 2, FH * (PORT ? 0.36 : 0.42) - s / 2, s, s); ctx.restore(); }
  },
  post(ctx, u, t) {
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.045;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * FW, R() * FH, 2, 2); }
    ctx.restore();
  },
});
