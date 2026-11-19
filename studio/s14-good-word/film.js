// One Good Word (Ibrāhīm 14:24-25). Pure function of time: window.seek(t) paints frame t.
// Plan: docs/shotlist.md. Cuts land on the spoken key word; each shot has one purposeful camera move.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const { THREE } = G;
const { W, H, E, prog, lerp, clamp, font, fill, mulberry32 } = M;

const D = 28.8;                       // voice ends 27.4; logo + loop in the last second
const GOLD = '#FFD15C', DISPLAY = 'Display', UI = 'UI';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------- captions (line by line, key words gold)
// [t0, t1, text with *key* words, label]; label marks a Quran line (verse face + source chip)
const CAPS = [
  [0.0, 1.86, 'One *good* *word* can grow into'], [1.8, 2.83, 'a *tree.*'],
  [2.77, 4.14, 'In Sūrah *Ibrāhīm,*'], [4.08, 5.21, 'Allāh says:'],
  [5.15, 7.25, 'Have you not considered how Allāh', 'Ibrāhīm 14:24'], [7.18, 8.47, 'presents an example,', 'Ibrāhīm 14:24'],
  [8.41, 10.09, '[making] a *good* *word* like a', 'Ibrāhīm 14:24'], [10.03, 10.76, '*good* *tree,*', 'Ibrāhīm 14:24'],
  [10.7, 12.64, 'whose *root* is *firmly* *fixed* and', 'Ibrāhīm 14:24'], [12.58, 14.92, 'its *branches* [high] in the *sky?*', 'Ibrāhīm 14:24'],
  [15.01, 16.91, 'It produces its *fruit* *all* the', 'Ibrāhīm 14:25'], [16.85, 19.36, '*time,* by permission of its Lord.', 'Ibrāhīm 14:25'],
  [19.55, 20.61, 'A *kind* word.'], [20.55, 21.91, 'A *true* word.'], [21.85, 23.58, 'Its *roots* go *deep.*'],
  [23.52, 25.55, 'Its *fruit* keeps *coming.*'], [25.59, 27.84, 'Plant one *good* *word* today.'],
];
function captions(ctx, t) {
  const loopIn = t > D - 0.3;                         // the first line returns for a seamless loop
  CAPS.forEach(([a, b, str, label], i) => {
    let k = 0;
    if (t >= a && t < b) k = Math.min(i === 0 ? 1 : (t - a) / 0.12, (b - t) / 0.1, 1);
    if (i === 0 && loopIn) k = Math.min(1, (t - (D - 0.3)) / 0.2);
    if (k <= 0) return;
    const q = !!label, size = q ? 64 : 76, f = font(size, q ? 600 : 800, q ? UI : DISPLAY);
    ctx.save(); ctx.globalAlpha = k; ctx.font = f; ctx.textBaseline = 'alphabetic';
    // wrap to two lines max inside the safe width
    const words = str.split(' '), maxW = W * 0.84, lines = [[]];
    const plain = (w) => w.replace(/\*/g, '');
    for (const w of words) { const L = lines[lines.length - 1]; const test = [...L, w].map(plain).join(' ');
      if (L.length && ctx.measureText(test).width > maxW) lines.push([w]); else L.push(w); }
    const lh = size * 1.18, y0 = H * 0.70 - (lines.length - 1) * lh / 2 + (1 - E.outCubic(k)) * 18;
    if (q) {                                            // source chip
      ctx.font = font(26, 600, DISPLAY); const cw = ctx.measureText(label.toUpperCase()).width + 44, cy = y0 - size - 34;
      M.rrect(ctx, W / 2 - cw / 2, cy - 30, cw, 44, 22); ctx.fillStyle = 'rgba(255,209,92,0.92)'; ctx.fill();
      ctx.fillStyle = '#3a2508'; ctx.textAlign = 'center'; ctx.fillText(label.toUpperCase(), W / 2, cy); ctx.font = f;
    }
    lines.forEach((L, li) => {
      const total = ctx.measureText(L.map(plain).join(' ')).width; let x = W / 2 - total / 2; const y = y0 + li * lh;
      ctx.textAlign = 'left';
      L.forEach((w, wi) => { const s = plain(w) + (wi < L.length - 1 ? ' ' : ''), key = w.includes('*');
        ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.strokeText(plain(w), x, y);
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        ctx.fillStyle = key ? GOLD : '#FFFFFF'; ctx.fillText(plain(w), x, y); ctx.shadowColor = 'transparent';
        x += ctx.measureText(s).width; });
    });
    ctx.restore();
  });
}

// ---------------------------------------------------------------- the 3-D farm set
const T = { tree: 10.1, root: 11.1, fixed: 11.6, branches: 12.9, sky: 14.1, fruit: 15.9, l1: 19.6, l3: 23.55, end: 25.6, land: 4.6, speak: 0.6 };
async function loadModels() {
  const L = new GLTFLoader(), names = ['Orange_1', 'Orange_2', 'Orange_3', 'Orange_4', 'PalmTree_1', 'PalmTree_2', 'Wheat_4', 'Donkey', 'Well', 'Cart', 'Hay'], out = {};
  await Promise.all(names.map(async (n) => { out[n] = await L.loadAsync(`assets/models/${n}.glb`); }));
  return out;
}
function place(g, h, x, z, ry = 0) {
  const o = SkeletonUtils.clone(g.scene), bb = new THREE.Box3().setFromObject(o), s = bb.getSize(V(0, 0, 0)), k = h / s.y, w = new THREE.Group();
  o.scale.setScalar(k); o.position.set(-(bb.min.x + s.x / 2) * k, -bb.min.y * k, -(bb.min.z + s.z / 2) * k); w.add(o); w.position.set(x, 0, z); w.rotation.y = ry;
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return w;
}
// faceless peg person like the reference: cone body, round head, a bar for shoulders, no face
function peg(col, h = 1.7) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }), k = h / 1.7;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * k, 0.36 * k, 1.25 * k, 24), m); body.position.y = 0.62 * k; g.add(body);
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * k, 0.5 * k, 4, 12), m); bar.rotation.z = Math.PI / 2; bar.position.y = 1.22 * k; g.add(bar);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * k, 24, 18), m); head.position.y = 1.5 * k; g.add(head);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
function fieldTex(r, g, b, rows, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = mulberry32(seed), im = x.createImageData(256, 256);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const n = 0.85 + 0.25 * R(), f = rows ? 0.72 + 0.28 * Math.sin(j / 256 * rows * Math.PI * 2) : 1, o = (j * 256 + i) * 4;
    im.data[o] = r * n * f; im.data[o + 1] = g * n * f; im.data[o + 2] = b * n * f; im.data[o + 3] = 255; }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

function farmSet(A) {
  const scene = new THREE.Scene(), cam = G.camera(42, 0.05, 1500), R = mulberry32(14);
  scene.fog = new THREE.FogExp2(0xf0c088, 0.0042);
  // sky dome: warm haze at the horizon, dusky violet above (reference)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: V(0.75, 0.16, 0.5).normalize() } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 sun; varying vec3 d; void main(){ float h = clamp(d.y,0.,1.); vec3 c = mix(vec3(1.0,0.80,0.55), vec3(0.62,0.58,0.80), pow(h,0.55)); float s = max(dot(d,sun),0.); c += vec3(1.0,0.75,0.4)*pow(s,8.)*0.6 + vec3(1.0,0.95,0.8)*pow(s,300.)*2.0; gl_FragColor = vec4(c,1.); }' }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x6a4a30, 1.6));
  const sun = new THREE.DirectionalLight(0xffc27a, 3.4); sun.position.set(80, 20, 52); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 260 }); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);
  // ground + patchwork plots + canals
  const TX = { dirt: fieldTex(126, 84, 54, 0, 1), green: fieldTex(92, 136, 56, 22, 2), wheat: fieldTex(212, 168, 84, 30, 3), soil: fieldTex(112, 70, 44, 18, 4) };
  TX.dirt.repeat.set(160, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TX.dirt, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);
  const plots = [];
  for (let i = -7; i <= 7; i++) for (let j = -9; j <= 4; j++) {
    if (i === 0 && (j === 0 || j === -1)) continue;
    const kind = ['green', 'wheat', 'soil', 'green', 'wheat'][Math.floor(R() * 5)];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 12.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TX[kind], roughness: 1 }));
    m.position.set(i * 14, 0.02, j * 14 - 4); if (R() < 0.5) m.rotation.y = Math.PI / 2; m.receiveShadow = true; scene.add(m); plots.push({ kind, x: i * 14, z: j * 14 - 4 });
  }
  const bare = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 26.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TX.soil, roughness: 1 })); bare.position.set(0, 0.025, -11); bare.receiveShadow = true; scene.add(bare);
  const water = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.12, metalness: 0.3, emissive: 0x13355a, emissiveIntensity: 0.5 });
  for (const x of [-7, 7, 35, -49]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 400).rotateX(-Math.PI / 2), water); c.position.set(x, 0.035, -40); scene.add(c); }
  for (const z of [7.5, -53]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(400, 1.2).rotateX(-Math.PI / 2), water); c.position.set(0, 0.036, z); scene.add(c); }
  // wheat stalks, instanced, in the wheat plots
  const wm = []; A.Wheat_4.scene.traverse((m) => { if (m.isMesh) wm.push(m); });
  const wbb = new THREE.Box3().setFromObject(A.Wheat_4.scene), wk = 1.0 / wbb.getSize(V(0, 0, 0)).y, wp = plots.filter((p) => p.kind === 'wheat'), N = 260 * wp.length;
  const inst = wm.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, N); im.receiveShadow = true; scene.add(im); return im; });
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
  for (const p of wp) for (let s = 0; s < 260; s++) { const k = wk * (0.8 + 0.4 * R());
    mat.compose(V(p.x + (R() - 0.5) * 12, 0, p.z + (R() - 0.5) * 12), q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.2, R() * 6.3, (R() - 0.5) * 0.2)), V(k, k, k)); inst.forEach((im) => im.setMatrixAt(n, mat)); n++; }
  // palms along the canals, mud houses, well, cart, hay, a donkey, people at work
  for (let s = 0; s < 40; s++) { const z = -180 + s * 8 + R() * 3, x = [-8.4, 8.4, 33.6, -50.4][s % 4]; if (Math.abs(x) < 10 && Math.abs(z) < 14) continue; scene.add(place(A[R() < 0.5 ? 'PalmTree_1' : 'PalmTree_2'], 7 + R() * 4, x, z, R() * 6.3)); }
  const mud = new THREE.MeshStandardMaterial({ color: 0xdcb48a, roughness: 1 }), door = new THREE.MeshBasicMaterial({ color: 0x3a2416 });
  for (let s = 0; s < 18; s++) { const x = -80 + R() * 160, z = -150 - R() * 60, w = 5 + R() * 6, h = 3 + R() * 3, b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), mud);
    b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true; scene.add(b); const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), door); d.position.set(x, 0.95, z + 3.01); scene.add(d); }
  scene.add(place(A.Well, 2.0, 7.6, 1.2, 0.5), place(A.Cart, 1.5, -9.5, 6, 1.1), place(A.Hay, 1.1, -10.5, 8.2, 0.3));
  const donkey = place(A.Donkey, 1.5, -15, 0); scene.add(donkey); const mixer = new THREE.AnimationMixer(donkey.children[0]);
  const walk = A.Donkey.animations.find((a) => /Walk$/.test(a.name)); if (walk) mixer.clipAction(walk).play();
  const workers = [[0xb85a34, 16, -14], [0x3a5f8a, -22, -26], [0xe8dcc4, 28, -8], [0x6a8a4a, -30, 2]].map(([c, x, z]) => { const p = peg(c); p.position.set(x, 0, z); scene.add(p); return p; });
  // the two people at the bare plot, the tree, the seed, the roots, the fruit
  const speaker = peg(0xe8e0d0); speaker.position.set(1.35, 0, 3.1); speaker.rotation.y = -1.75; scene.add(speaker);
  const listener = peg(0x2f4d86, 1.6); listener.position.set(-1.25, 0, 3.4); listener.rotation.y = 1.75; scene.add(listener);
  const stages = ['Orange_1', 'Orange_2', 'Orange_3', 'Orange_4'].map((nm, i) => { const g = place(A[nm], [0.8, 1.6, 3.4, 6.8][i], 0, 0); g.visible = false; scene.add(g); return g; });
  const GT = glowTex(), sprite = (col, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.set(s, s, 1); scene.add(sp); return sp; };
  const seed = sprite(0xfff0c0, 0.7), seedCore = sprite(0xffffff, 0.22);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); ring.position.y = 0.05; scene.add(ring);
  const rootMat = new THREE.MeshBasicMaterial({ color: 0xffcf6a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const roots = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + R() * 0.3, pts = []; let x = 0, z = 0; for (let s = 0; s < 8; s++) { pts.push(V(x, 0.04, z)); const b = a + (R() - 0.5) * 0.9; x += Math.cos(b) * 0.6; z += Math.sin(b) * 0.6; }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 6), rootMat); m.userData.d = i * 0.03; scene.add(m); roots.push(m); }
  const glints = Array.from({ length: 30 }, () => { const s = sprite(0xffa828, 0.55, 0); const a = R() * 6.3, r = 0.9 + R() * 1.8; s.userData = { p: V(Math.cos(a) * r, 4.2 + R() * 2.8, Math.sin(a) * r), d: R() }; return s; });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.32, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 1, side: THREE.DoubleSide })); basket.position.set(-1.3, 0.16, 1.5); scene.add(basket);
  const falls = Array.from({ length: 4 }, (_, i) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff9a1a, roughness: 0.5, emissive: 0x6a3000 })); o.userData = { t: T.fruit + 0.5 + i * 0.75, x: -1.3 + (i % 2) * 0.12, z: 1.5 }; scene.add(o); return o; });
  const orchard = Array.from({ length: 70 }, () => { const a = R() * 6.3, r = 9 + R() * 70, g = place(A.Orange_4, 5 + R() * 2, Math.cos(a) * r, Math.sin(a) * r - 10, R() * 6.3); g.userData.r = r; g.visible = false; scene.add(g); return g; });

  // camera: one purposeful move per shot; cuts on the key words
  const SHOTS = [
    [0.0, 2.4, [1.2, 3.4, 13], [0.6, 2.0, 9.2], [0.2, 1.0, 3.4], [0.15, 1.1, 3.4], 40],          // glide in over the fields to the two people
    [2.4, 5.15, [4.6, 2.2, 3.6], [2.2, 0.7, 1.6], [0.9, 1.1, 2.4], [0, 0.05, 0], 40],          // follow the word down into the soil
    [5.15, 8.4, [1.25, 0.3, 1.55], [0.85, 0.32, 1.05], [0, 0.18, 0], [0, 0.32, 0], 38],         // macro: the sprout
    [8.4, 10.7, [-1.6, 0.9, 2.2], [-1.25, 1.15, 1.8], [0, 0.7, 0], [0, 1.1, 0], 40],            // the young tree takes shape
    [10.7, 12.65, [4.0, 0.7, 2.6], [3.0, 0.6, 1.8], [0, 0.2, 0], [0, 0.5, 0], 44],             // ground level: the root grips
    [12.65, 15.0, [1.9, 0.6, 2.3], [1.7, 0.9, 2.1], [0, 1.2, 0], [0, 7.5, 0], 58],               // tilt up the trunk into the sky
    [15.0, 17.2, [6.5, 4.6, 6.0], [4.0, 5.4, 6.8], [0, 4.6, 0], [0, 4.9, 0], 44],                // around the canopy: fruit
    [17.2, 19.5, [-3.8, 1.5, -0.4], [-3.0, 1.0, 0.2], [-1.3, 0.8, 1.5], [-1.3, 0.3, 1.5], 42],        // fruit falls into the basket
    [19.5, 23.5, [7, 3.2, 9], [22, 26, 34], [0, 2, -2], [0, 0, -14], 48],                       // crane up: the land fills with trees
    [23.5, 25.6, [-6, 52, 4], [4, 52, -10], [-6, 0, -4], [4, 0, -16], 46],                      // top-down drift over the valley
    [25.6, D, [4, 5.0, 17], [1.2, 3.4, 13], [0.4, 1.4, 2.6], [0.2, 1.0, 3.4], 40],                // back down to the two people (loop)
  ];
  const tmp = V(0, 0, 0), look = V(0, 0, 0);
  return { scene, camera: cam, bloom: 0.32, bloomThreshold: 0.86, bloomRadius: 0.55,
    update(t) {
      const s = SHOTS.find((x) => t >= x[0] && t < x[1]) || SHOTS[SHOTS.length - 1];
      const p = E.inOutSine(prog(t, s[0], s[1]));
      cam.position.lerpVectors(V(...s[2]), V(...s[3]), p); look.lerpVectors(V(...s[4]), V(...s[5]), p);
      cam.fov = s[6]; cam.updateProjectionMatrix(); cam.lookAt(look); sky.position.copy(cam.position);
      mixer.setTime(t); donkey.position.z = 6 - ((t * 0.6) % 22);
      workers.forEach((w, i) => { w.rotation.y = 0.6 * Math.sin(t * 0.5 + i * 2); w.position.y = 0.04 * Math.abs(Math.sin(t * 3 + i)); });
      speaker.rotation.z = 0.03 * Math.sin(t * 6) * (t < 2.4 ? 1 : 0);
      // the word: a seed of light from the speaker's head down to the soil
      const u = clamp((t - T.speak) / (T.land - T.speak)), a = E.inOutSine(u);
      tmp.set(lerp(1.2, 0, a), 1.5 * (1 - a) + 0.9 * Math.sin(Math.PI * a) + 0.06, lerp(2.9, 0, a));
      const so = t < T.speak ? 0 : t < T.land + 0.6 ? 1 : 1 - sm((t - T.land - 0.6) / 0.8);
      seed.position.copy(tmp); seedCore.position.copy(tmp); seed.material.opacity = 0.95 * so; seedCore.material.opacity = so; seed.scale.setScalar(0.6 + 0.12 * Math.sin(t * 9));
      const rk = prog(t, T.land, T.land + 1.4); ring.scale.setScalar(0.3 + 6 * E.outCubic(rk)); ring.material.opacity = rk > 0 && rk < 1 ? 0.8 * (1 - rk) : 0;
      // growth: stage 1 (sprout) -> 2 -> 3 -> 4 (full tree), each springing up as the verse names it
      const keysT = [5.4, 8.4, 10.1, 12.65], back = t > T.end + 0.3;
      stages.forEach((g, i) => {
        const on = !back && t >= keysT[i] && (i === 3 || t < keysT[i + 1]);
        g.visible = on; if (!on) return;
        const k = M.spring(t - keysT[i], M.SPRING.bouncy); g.scale.setScalar(Math.max(0.001, i === 0 ? sm((t - keysT[0]) / 2.6) : 0.75 + 0.25 * k));
      });
      if (back) stages[3].visible = t > D - 0.4 ? false : true;   // the first frame has bare soil
      if (back && t <= D - 0.4) stages[3].scale.setScalar(1);
      rootMat.opacity = 0.42 * sm((t - T.root + 0.15) / 0.5) * (1 - sm((t - 13.5) / 1.2));
      roots.forEach((m) => m.scale.setScalar(Math.max(0.001, 1.6 * E.outCubic(prog(t, T.root - 0.1 + m.userData.d, T.fixed + 0.8 + m.userData.d)))));
      glints.forEach((g) => { const on = sm((t - T.fruit - g.userData.d * 1.2) / 0.3) * (1 - sm((t - T.end) / 0.5)); g.position.copy(g.userData.p); g.material.opacity = on * (0.6 + 0.4 * Math.sin(t * 4 + g.userData.d * 9)); });
      falls.forEach((f) => { const d = t - f.userData.t; f.visible = d > 0 && t < T.end; const y = Math.max(0.3, 4.6 - 4.9 * d * d); f.position.set(f.userData.x, y, f.userData.z); });
      basket.visible = t > 15 && t < T.end;
      orchard.forEach((g) => { const k = E.outBack(prog(t, T.l1 + g.userData.r * 0.04, T.l1 + 0.6 + g.userData.r * 0.04), 1.4) * (1 - prog(t, T.end + 0.2, T.end + 1.0)); g.visible = k > 0.01; g.scale.setScalar(Math.max(0.001, k)); });
    } };
}

// ---------------------------------------------------------------- film
const S = {};
M.film({
  fonts: [font(76, 800, DISPLAY), font(64, 600, UI), font(26, 600, DISPLAY)],
  images: { seal: 'assets/seal.png' },
  hits: [],
  samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); S.farm = farmSet(await loadModels()); },
  draw(ctx, u, t, IMG) {
    fill(ctx, '#000');
    G.renderSet(ctx, S.farm, t, u);
    // soft vignette + a band behind the captions so they read over bright sky
    const g = ctx.createLinearGradient(0, H * 0.56, 0, H * 0.84); g.addColorStop(0, 'rgba(10,6,2,0)'); g.addColorStop(0.5, 'rgba(10,6,2,0.38)'); g.addColorStop(1, 'rgba(10,6,2,0)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.56, W, H * 0.28);
    captions(ctx, t);
    const su = prog(t, D - 1.1, D - 0.2), a = Math.sin(Math.PI * su);
    if (a > 0 && IMG.seal) { ctx.save(); ctx.globalAlpha = a * 0.95; ctx.drawImage(IMG.seal, W / 2 - 240, H * 0.33 - 240, 480, 480); ctx.restore(); }
  },
  post(ctx, u, t) {                                   // fine film grain (seeded per frame)
    const R = mulberry32(Math.floor(t * 60) + 7); ctx.save(); ctx.globalAlpha = 0.05;
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = R() < 0.5 ? '#000' : '#fff'; ctx.fillRect(R() * W, R() * H, 2, 2); }
    ctx.restore();
  },
});
