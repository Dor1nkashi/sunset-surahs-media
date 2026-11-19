// tunic.js: a plain linen tunic (front + back panels) with a tear in the BACK panel that can open
// progressively (tear length L in metres, opening `open` 0..1), loose threads along the torn edges
// that glow in backlight. Pure function of its setters. Local frame: shoulders at y = 0, hem at
// y = -1.1, back panel faces +z, front panel faces -z.
import * as W from '../lib_shared/world.js';
const { THREE } = W;

const TW = 1.24, TH = 1.1, MW = 512, MH = 454;      // size (m) and mask canvas size
const TEAR_X = 0.015, TEAR_Y0 = -0.14, TEAR_MAX = 0.56;
// jagged tear centre line: x offset at depth s (0..1 down the tear), seeded
function tearPath(s) { return TEAR_X + 0.012 * Math.sin(s * 23.0) + 0.007 * Math.sin(s * 61.0 + 1.3) - 0.02 * s; }
const tearHalf = (s, open) => open * (0.004 + 0.03 * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.8) * (1 - 0.6 * s);

function outline(x, w, h, back) {
  // T-shaped tunic outline in canvas pixels (x right, y down from the top edge = shoulders)
  const px = (m) => (m + TW / 2) / TW * w, py = (m) => -m / TH * h;
  x.beginPath();
  x.moveTo(px(-0.1), py(0));
  x.lineTo(px(-0.6), py(-0.02)); x.lineTo(px(-0.62), py(-0.3)); x.lineTo(px(-0.29), py(-0.36));
  x.lineTo(px(-0.3), py(-1.08)); x.quadraticCurveTo(px(0), py(-1.1), px(0.3), py(-1.08));
  x.lineTo(px(0.29), py(-0.36)); x.lineTo(px(0.62), py(-0.3)); x.lineTo(px(0.6), py(-0.02)); x.lineTo(px(0.1), py(0));
  // neckline: shallow at the back, deeper at the front
  x.quadraticCurveTo(px(0), py(back ? -0.045 : -0.11), px(-0.1), py(0));
  x.closePath();
}
function maskCanvas(back) {
  const c = document.createElement('canvas'); c.width = MW; c.height = MH; return c;
}
function drawMask(c, back, L, open) {
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#000'; x.fillRect(0, 0, MW, MH); x.fillStyle = '#fff'; outline(x, MW, MH, back); x.fill();
  if (back && L > 0.002) {
    const px = (m) => (m + TW / 2) / TW * MW, py = (m) => -m / TH * MH, n = 60, k = L / TEAR_MAX;
    x.fillStyle = '#000'; x.beginPath();
    for (let i = 0; i <= n; i++) { const s = i / n * k, y = TEAR_Y0 - s * TEAR_MAX, hw = tearHalf(s, open) * Math.min(1, (k - s) * 12 + 0.15); x.lineTo(px(tearPath(s) - hw), py(y)); }
    for (let i = n; i >= 0; i--) { const s = i / n * k, y = TEAR_Y0 - s * TEAR_MAX, hw = tearHalf(s, open) * Math.min(1, (k - s) * 12 + 0.15); x.lineTo(px(tearPath(s) + hw), py(y)); }
    x.closePath(); x.fill();
    // a short cut where the tear started at the top
    x.fillRect(px(TEAR_X) - 1, py(TEAR_Y0) - 2, 2, 4);
  }
}

export async function makeTunic({ seed = 5, linen = null } = {}) {
  const g = new THREE.Group();
  const base = linen || await W.pbr('hessian_230', { tile: 0.3, tint: 0xf3ead6, res: 1024, side: THREE.DoubleSide, normal: 0.55 });
  const n = W.noise2(seed);
  const geo = (back) => {
    const G = new THREE.PlaneGeometry(TW, TH, 160, 140); G.translate(0, -TH / 2, 0);
    const p = G.attributes.position, uv = G.attributes.uv, uv1 = new Float32Array(uv.count * 2);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      uv1[i * 2] = uv.getX(i); uv1[i * 2 + 1] = uv.getY(i);
      uv.setXY(i, x + TW / 2, y + TH);              // metres for the linen texture
      // hanging folds from the shoulders, sleeves droop, panels bow apart a little
      const fold = 0.011 * Math.sin(x * 21 + 1.7 * n(x * 2, y * 2)) * Math.min(1, -y * 2.2) + 0.004 * n(x * 9, y * 9);
      const bow = 0.016 * Math.cos(Math.min(1, Math.abs(x) / 0.3) * Math.PI / 2) * Math.min(1, -y * 3);
      const sl = Math.abs(x) > 0.3 ? -0.05 * ((Math.abs(x) - 0.3) / 0.32) ** 1.5 : 0;
      p.setXYZ(i, x, y + sl, (back ? 1 : -1) * (0.006 + bow) + fold);
    }
    G.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); G.computeVertexNormals(); return G;
  };
  const panels = {};
  for (const back of [true, false]) {
    const c = maskCanvas(back); drawMask(c, back, 0, 0);
    const am = new THREE.CanvasTexture(c); am.channel = 1; am.colorSpace = THREE.NoColorSpace;
    const m = base.clone(); m.alphaMap = am; m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; m.emissive = new THREE.Color(0xffd9a0); m.emissiveIntensity = 0;
    const mesh = new THREE.Mesh(geo(back), m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ alphaMap: am, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking });
    g.add(mesh); panels[back ? 'back' : 'front'] = { mesh, c, am, m };
  }
  // loose threads along both torn edges: thin curved tubes (instanced), shown once the tear passes them
  const NT = 90, r = W.rng(seed + 3), th = [];
  const tg = new THREE.CylinderGeometry(0.00045, 0.0003, 1, 5, 6, true); tg.translate(0, 0.5, 0);
  const tm = new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.7, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const threads = new THREE.InstancedMesh(tg, tm, NT); threads.frustumCulled = false; g.add(threads);
  for (let i = 0; i < NT; i++) th.push({ s: r() * 0.98, side: r() < 0.5 ? -1 : 1, len: 0.006 + r() ** 2 * 0.022, ang: (r() - 0.5) * 1.1, lift: (r() - 0.5) * 0.6 });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Z = new THREE.Vector3();
  let lastKey = '';
  const state = { L: 0, open: 0 };
  g.userData = {
    // tear length L (m, 0..0.56) and opening 0..1; redraws the mask only when they change
    tear(L, open) {
      const key = `${L.toFixed(4)}|${open.toFixed(3)}`; state.L = L; state.open = open;
      if (key !== lastKey) { drawMask(panels.back.c, true, L, open); panels.back.am.needsUpdate = true; lastKey = key; }
      const k = L / TEAR_MAX;
      for (let i = 0; i < NT; i++) {
        const t = th[i];
        if (t.s > k - 0.01 || L < 0.002) { M4.makeScale(0, 0, 0); threads.setMatrixAt(i, M4); continue; }
        const y = TEAR_Y0 - t.s * TEAR_MAX, hw = tearHalf(t.s, open) * Math.min(1, (k - t.s) * 12 + 0.15);
        const x0 = tearPath(t.s) + t.side * hw;
        // threads point across the gap (and a little outward, toward +z), drooping slightly
        E.set(t.lift + 0.3, 0, -t.side * (Math.PI / 2) + t.ang * 0.6); Q.setFromEuler(E);
        M4.compose(new THREE.Vector3(x0, y, 0.011), Q, new THREE.Vector3(1, t.len * (0.6 + 0.4 * open), 1)); threads.setMatrixAt(i, M4);
      }
      threads.instanceMatrix.needsUpdate = true;
    },
    // backlight glow 0..1 (fake translucency of the linen and the threads)
    glow(k) { panels.back.m.emissiveIntensity = 0.32 * k; panels.front.m.emissiveIntensity = 0.32 * k; tm.emissiveIntensity = 1.8 * k; },
    // world-space helpers in tunic-local metres
    shoulder: (s) => new THREE.Vector3(s * 0.24, -0.02, -0.03),
    tearTip: () => new THREE.Vector3(tearPath(state.L / TEAR_MAX), TEAR_Y0 - state.L, 0.015),
    tearTop: () => new THREE.Vector3(tearPath(0), TEAR_Y0, 0.015),
    TEAR_MAX, TEAR_Y0,
  };
  g.userData.tear(0, 0);
  return g;
}

// the tunic folded on a bench: a soft stack of linen with the torn back panel on top
export async function foldedTunic({ linen = null } = {}) {
  const base = linen || await W.pbr('hessian_230', { tile: 0.3, tint: 0xf3ead6, res: 1024, side: THREE.DoubleSide, normal: 0.55 });
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const b = W.rbox(0.42 - i * 0.004, 0.022, 0.34 - i * 0.006, base, { r: 0.01, seg: 4 }); b.position.y = i * 0.021; b.rotation.y = (i % 2 ? 1 : -1) * 0.01; g.add(b); }
  // top layer: a cloth sheet with the tear drawn as a dark jagged slit with a lighter fray
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#1a140e'; x.lineWidth = 3.5; x.beginPath();
  for (let i = 0; i <= 40; i++) { const s = i / 40; x.lineTo(128 + 220 * (tearPath(s) - TEAR_X) + 3 * Math.sin(s * 40), 30 + s * 200); } x.stroke();
  const map = new THREE.CanvasTexture(c); map.channel = 1; map.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.PlaneGeometry(0.4, 0.32, 40, 32); top.rotateX(-Math.PI / 2);
  const uv = top.attributes.uv, uv1 = new Float32Array(uv.count * 2), p = top.attributes.position;
  for (let i = 0; i < uv.count; i++) { uv1[i * 2] = uv.getX(i); uv1[i * 2 + 1] = uv.getY(i); uv.setXY(i, p.getX(i), p.getZ(i)); p.setY(i, 0.004 * Math.sin(p.getX(i) * 30)); }
  top.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); top.computeVertexNormals();
  const m = base.clone(); m.lightMap = null; m.aoMap = map; m.aoMapIntensity = 1.0;
  const mesh = new THREE.Mesh(top, m); mesh.position.y = 4 * 0.021 + 0.003; mesh.receiveShadow = true; g.add(mesh);
  return W.shadows(g);
}
