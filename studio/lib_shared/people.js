// people.js: high-quality faceless human figures for the Quran-story reels (three.js).
//
//   import { loadPeople } from '../lib_shared/people.js';
//   const people = await loadPeople(THREE, GLTFLoader);
//   const p = people.make({ kind: 'man', outfit: 'thobe', beard: 'full', seed: 7 });
//   scene.add(p.object3d);
//   p.setPose('walk', t);                     // pure function of t: seekable, no accumulated state
//   p.setPose('stand', t, { carry: 'jar' });  // carry: 'jar' | 'basket'; also 'kneel', 'dig', 'idle', 'run', ...
//
// Skeleton + animation clips: three.js example Xbot.glb (Mixamo rig). Its surface is discarded; every
// visible surface is built here from signed-distance parts (people_parts.js), meshed with surface nets,
// smooth-skinned to the Xbot skeleton in a relaxed rest pose, with baked AO in the vertex colours and
// physically based cloth / skin materials with procedural weave and strand micro-normals. See PEOPLE.md.
import { mesh, skinWeights, bakeAO, mulberry32, clamp, sstep } from './people_sdf.js';
import { buildParts } from './people_parts.js';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------- palettes
const SKIN = ['#e6bc94', '#d8a87e', '#c99468', '#b57d55', '#9c6744', '#7f5236', '#64402b'];
const HAIR = ['#1b1512', '#241a14', '#33251b', '#4a3526'];
const GREY = ['#a7a29b', '#c3beb6', '#8f8a84'];
export const PALETTES = {
  white:  { robe: '#ece5d8', wrap: '#f1ece2', cloak: '#5b4130', sash: '#8a4b2e', trousers: '#cdbb9c' },
  cream:  { robe: '#e0d2b6', wrap: '#ece4d2', cloak: '#3f3026', sash: '#9b7a3a', trousers: '#c2ae8c' },
  sand:   { robe: '#c9ad85', wrap: '#e8dfcc', cloak: '#6b4c33', sash: '#7a3b2b', trousers: '#b19c7c' },
  earth:  { robe: '#94714e', wrap: '#d9ccb3', cloak: '#4a3626', sash: '#b48a46', trousers: '#c4b08e' },
  olive:  { robe: '#6e6847', wrap: '#ddd2bb', cloak: '#3b3528', sash: '#a3542f', trousers: '#b8a684' },
  indigo: { robe: '#3d4a68', wrap: '#e9e2d4', cloak: '#2b2a2c', sash: '#b08a3c', trousers: '#a89a80' },
  rust:   { robe: '#8b4f36', wrap: '#e6dccb', cloak: '#3a2b22', sash: '#c9a35a', trousers: '#bfa987' },
  night:  { robe: '#2a2826', wrap: '#2a2826', cloak: '#1d1b1a', sash: '#6b5a3c', trousers: '#8f826c' },
  noble:  { robe: '#efe9de', wrap: '#f3efe6', cloak: '#1f1b19', trim: '#c9a046', sash: '#7a2e24', trousers: '#cdbb9c' },
};
const ABAYA = [['#1e1c1b', '#2b2826'], ['#3f3128', '#b9a483'], ['#262b3b', '#d6cbb6'], ['#4a4733', '#cbbd9d'], ['#3c2a31', '#a4847a'], ['#3a3d41', '#e3dccd'], ['#5b4636', '#e7dfcf']];
const CLOAKS = ['#5b4130', '#4a3626', '#2e2a28', '#6b645a', '#3e3428', '#7a5a3c'];

// ---------------------------------------------------------------- material micro-detail (shader patch)
// bump kinds: 0 none, 1 cloth weave + slub, 2 hair / beard strands, 3 coarse basket weave. pattern 1: shemagh check.
const GLSL_COMMON = /* glsl */`
varying vec3 vBindPos; varying vec3 vBindNrm;
uniform float uBumpKind, uBump, uFreq, uPattern; uniform vec3 uPatColor;
float h31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float weave(vec2 g){ float a = 0.5 + 0.5 * sin(g.x), b = 0.5 + 0.5 * sin(g.y);
  float s = step(0.0, sin(g.x * 0.5) * sin(g.y * 0.5)); return mix(a * (0.6 + 0.4 * b), b * (0.6 + 0.4 * a), s); }
vec3 triw(){ vec3 w = pow(abs(normalize(vBindNrm)), vec3(4.0)); return w / (w.x + w.y + w.z); }
float microH(vec3 p, float fw){
  vec3 w = triw(); float h = 0.0;
  if (uBumpKind < 0.5) return 0.0;
  if (uBumpKind < 1.5) {
    float F = uFreq, fade = 1.0 - smoothstep(0.35, 0.9, fw * F / 6.2832);
    float wv = w.x * weave(p.zy * F) + w.y * weave(p.xz * F) + w.z * weave(p.xy * F);
    float slub = vn3(p * 0.55) * 1.0 + vn3(p * 2.3 + 7.0) * 0.45 * (1.0 - smoothstep(0.4, 1.2, fw * 2.3));
    return wv * 0.22 * fade + slub * 0.9;
  }
  if (uBumpKind < 2.5) {
    float F = uFreq, fade = 1.0 - smoothstep(0.3, 0.9, fw * F / 6.2832);
    float warp = vn3(p * vec3(0.7, 0.12, 0.7)) * 6.0;
    float sx = sin(p.x * F + warp), sz = sin(p.z * F + warp * 1.3);
    float clump = vn3(p * vec3(0.9, 0.18, 0.9));
    return ((w.x + 0.5 * w.y) * sz + (w.z + 0.5 * w.y) * sx) * 0.3 * fade + clump * 1.1;
  }
  float F = uFreq; float wv = w.x * weave(p.zy * F) + w.y * weave(p.xz * F) + w.z * weave(p.xy * F);
  return wv * (1.0 - smoothstep(0.4, 1.0, fw * F / 6.2832)) + vn3(p * 0.8) * 0.3;
}
vec3 pnArb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
  vec3 vSigmaX = normalize(dFdx(surf_pos)), vSigmaY = normalize(dFdy(surf_pos)), vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX); float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2); return normalize(abs(fDet) * surf_norm - vGrad); }
float patternMask(vec3 p){
  vec3 w = triw(); vec2 uv = w.x > w.z ? p.zy : p.xy; if (w.y > 0.6) uv = p.xz;
  float s = 1.75, a = smoothstep(0.62, 0.8, cos(uv.x * 6.2832 / s)), b = smoothstep(0.62, 0.8, cos(uv.y * 6.2832 / s));
  float dots = smoothstep(0.55, 0.75, cos(uv.x * 6.2832 / s + 3.14159) * cos(uv.y * 6.2832 / s + 3.14159));
  return clamp(max(a, b) * 0.9 + dots * 0.6, 0.0, 1.0);
}
`;
function patchMaterial(m, { kind = 0, bump = 0, freq = 20, pattern = 0, patColor = '#a3282a' } = {}, THREE) {
  const U = { uBumpKind: { value: kind }, uBump: { value: bump }, uFreq: { value: freq }, uPattern: { value: pattern }, uPatColor: { value: new THREE.Color(patColor) } };
  m.userData.micro = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBindPos; varying vec3 vBindNrm;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindPos = position; vBindNrm = normal;\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON + '\n')
      .replace('#include <color_fragment>', '#include <color_fragment>\n#ifdef USE_COLOR\nif (uPattern > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, uPatColor * vColor.rgb, patternMask(vBindPos));\n#endif\n')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uBump > 0.0) { float fw = length(fwidth(vBindPos)); float hh = microH(vBindPos, fw);
          normal = pnArb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)) * uBump, faceDirection); }`);
  };
  m.customProgramCacheKey = () => 'people-micro';
  return m;
}

// ---------------------------------------------------------------- loader
export async function loadPeople(THREE, GLTFLoader, opts = {}) {
  const gltf = opts.gltf || await new GLTFLoader().loadAsync(opts.url || '/library/models/Xbot/Xbot.glb');
  const scene0 = gltf.scene;
  let arm0 = null; scene0.traverse((o) => { if (!arm0 && o.isBone) arm0 = o.parent; });
  const dead = []; scene0.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) dead.push(o); });
  dead.forEach((o) => o.parent.remove(o));
  const bones0 = []; arm0.traverse((o) => { if (o.isBone) bones0.push(o); });
  const bname = (b) => b.name.replace(/^mixamorig:?/, '');
  const index = new Map(bones0.map((b, i) => [bname(b), i]));
  const byName = (bones, n) => bones[index.get(n)];

  // relaxed rest pose (arms lowered, elbows a touch bent, fingers softly curled): clothing is modelled here
  const qe = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG));
  const REST = { LeftArm: qe(0, 0, -77), RightArm: qe(0, 0, 77), LeftForeArm: qe(0, -14, 0), RightForeArm: qe(0, 14, 0) };
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const [i, a] of [[1, 8], [2, 14], [3, 10]]) { REST['LeftHand' + f + i] = qe(0, 0, -a); REST['RightHand' + f + i] = qe(0, 0, a); }
  for (const [n, q] of Object.entries(REST)) byName(bones0, n).quaternion.copy(q);
  scene0.position.set(0, 0, 0); scene0.rotation.set(0, 0, 0); scene0.scale.set(1, 1, 1);
  scene0.updateMatrixWorld(true);
  const armInv = arm0.matrixWorld.clone().invert(), J = {}, restQ = bones0.map((b) => b.quaternion.clone()), restP = bones0.map((b) => b.position.clone());
  const boneInverses = bones0.map((b) => b.matrixWorld.clone().invert());
  for (const b of bones0) { const p = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(armInv); J[bname(b)] = [p.x, p.y, p.z]; }
  const bindMatrix = arm0.matrixWorld.clone();
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));

  // in-place walk/run speed (cm/s at scale 1), measured from the planted foot
  function measureSpeed(name) {
    const c = clips[name]; if (!c) return 0;
    const tmp = arm0.clone(true), mx = new THREE.AnimationMixer(tmp), a = mx.clipAction(c); a.play();
    const foot = tmp.getObjectByName(byName(bones0, 'LeftFoot').name), samples = [];
    for (let i = 0; i <= 96; i++) { mx.setTime(c.duration * i / 96); tmp.updateMatrixWorld(true); const p = new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld); samples.push([p.y, p.z]); }
    const minY = Math.min(...samples.map((s) => s[0])); let dz = 0, n = 0;
    for (let i = 1; i < samples.length; i++) if (samples[i][0] < minY + 0.012 && samples[i - 1][0] < minY + 0.012) { dz += samples[i - 1][1] - samples[i][1]; n++; }
    return n ? (dz / n) * 96 / c.duration * 100 : 0;      // armature scale 0.01: metres -> cm
  }
  const SPEED = { walk: measureSpeed('walk'), run: measureSpeed('run') };

  // ---------------------------------------------------------------- materials
  const physical = (col, o = {}) => new THREE.MeshPhysicalMaterial({ color: col, vertexColors: true, ...o });
  function clothMat(col, o = {}) {
    const c = new THREE.Color(col), sheen = c.clone().lerp(new THREE.Color('#fff4e6'), 0.55);
    const { bump, freq, pattern, patColor, ...rest } = o;
    return patchMaterial(physical(col, { roughness: 0.86, sheen: 0.55, sheenRoughness: 0.75, sheenColor: sheen, envMapIntensity: 0.55, ...rest }),
      { kind: 1, bump: o.bump ?? 0.012, freq: o.freq ?? 26, pattern: o.pattern ?? 0, patColor: o.patColor }, THREE);
  }
  const geoCache = new Map();

  // ---------------------------------------------------------------- props (built lazily, shared geometry)
  const propGeo = {};
  function jarGeo() {
    if (propGeo.jar) return propGeo.jar;
    const pts = [[0, 0], [4.2, 0], [5.6, 1.2], [9.5, 6], [11.6, 13], [11.2, 19], [8.8, 25], [5.0, 29], [3.9, 31.5], [4.1, 33.5], [5.0, 34.5], [4.4, 35.2], [3.4, 34.2], [3.2, 31]];
    const curve = new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    return (propGeo.jar = new THREE.LatheGeometry(curve.getPoints(120), 96).translate(0, -17, 0));
  }
  function basketGeo() {
    if (propGeo.basket) return propGeo.basket;
    const pts = [[0, 0], [11, 0], [14, 1.5], [18, 8], [20, 15], [20.6, 17], [19.6, 17.4], [19, 15.5], [17.4, 8.5], [13.5, 2.4], [0, 1.6]];
    const g = new THREE.LatheGeometry(new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(100), 96).translate(0, -9, 0);
    const fruit = []; const R = mulberry32(5);
    for (let i = 0; i < 26; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * 13.5, s = new THREE.SphereGeometry(3.2 + R() * 1.2, 20, 14);
      s.scale(1, 0.85, 1).translate(Math.cos(a) * r, 5.5 + R() * 2.5 - r * 0.12, Math.sin(a) * r); fruit.push(s); }
    return (propGeo.basket = { body: g, fruit });
  }
  function hoeGeo() {
    if (propGeo.hoe) return propGeo.hoe;
    const handle = new THREE.CylinderGeometry(1.5, 1.7, 112, 24, 1).rotateX(Math.PI / 2).translate(0, 0, 56);
    const blade = new THREE.BoxGeometry(17, 0.9, 15, 8, 1, 8).translate(0, 0, 7.5);
    const pos = blade.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, pos.getY(i) - 0.012 * x * x + z * 0.05); pos.setX(i, x * (1 - z * 0.02)); }
    blade.computeVertexNormals(); blade.rotateX(-1.25).translate(0, -1, 110);
    return (propGeo.hoe = { handle, blade });
  }
  const simple = (col, o = {}) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.8, ...o });

  // ---------------------------------------------------------------- make
  function make(o = {}) {
    const seed = o.seed ?? 1, R = mulberry32(seed * 9973 + 17), pick = (a) => a[Math.floor(R() * a.length)];
    const kind = o.kind || 'man', fem = kind === 'woman', boy = kind === 'boy', elder = kind === 'elder';
    let outfit = o.outfit || (fem ? 'abaya' : elder ? 'thobe' : 'thobe'); if (fem) outfit = outfit === 'traveller' ? 'traveller' : 'abaya';
    const beard = fem || boy ? 'none' : o.beard ?? (elder ? 'grey' : pick(['short', 'full', 'short', 'none']));
    const headwear = o.headwear || (fem ? 'khimar' : boy ? pick(['kufi', 'none', 'kufi']) : outfit === 'worker' ? 'wrap' : outfit === 'noble' || elder ? 'turban' : outfit === 'traveller' ? 'keffiyeh' : pick(['keffiyeh', 'kufi', 'keffiyeh', 'turban']));
    const pal = typeof o.palette === 'object' ? o.palette : PALETTES[o.palette] || PALETTES[pick(outfit === 'noble' ? ['noble'] : outfit === 'worker' ? ['earth', 'sand', 'olive', 'rust'] : ['white', 'cream', 'sand', 'white', 'earth', 'indigo'])];
    const P = {
      sex: fem ? 'f' : 'm', kind, outfit: fem ? 'abaya' : outfit, beard, headwear, seed, R,
      cloak: outfit === 'noble' ? 'bisht' : outfit === 'traveller' ? 'travel' : null,
      sash: !fem && (outfit === 'worker' || (outfit === 'traveller' && R() < 0.5)),
      g: o.build ?? (boy ? 0.86 : fem ? 0.93 + R() * 0.12 : 0.92 + R() * 0.2), belly: elder ? 1.4 : R() * 1.2, sh: fem ? 0.94 : boy ? 0.88 : 0.97 + R() * 0.07,
      hs: boy ? 1.12 : fem ? 0.96 : 1.0, turbanTail: outfit === 'noble' || (elder && R() < 0.5), detail: o.detail ?? 1, headDetail: o.headDetail ?? o.detail ?? 1,
    };
    const height = o.height ?? (boy ? 0.68 + R() * 0.08 : fem ? 0.9 + R() * 0.05 : elder ? 0.94 + R() * 0.04 : 0.965 + R() * 0.075);
    // geometry (cached by everything that shapes it)
    const key = JSON.stringify({ ...P, R: 0, pal: 0 });
    let built = geoCache.get(key);
    if (!built) {
      const t0 = performance.now(), parts = buildParts(J, P), meshes = [];
      const sdfAll = (x, y, z) => { let d = 1e9; for (const p of parts) { const b = p.bb; if (x < b[0] - 8 || y < b[1] - 8 || z < b[2] - 8 || x > b[3] + 8 || y > b[4] + 8 || z > b[5] + 8) continue; d = Math.min(d, p.f(x, y, z)); } return d; };
      let minY = 1e9;
      for (const p of parts) {
        const m = mesh(p.f, p.bb, p.res);
        if (!m.idx.length) continue;
        const segs = p.segs.map(([bn, a, b, gain]) => ({ bone: index.get(bn), a: typeof a === 'string' ? J[a] : a, b: typeof b === 'string' ? J[b] : b, gain: gain ?? 1 }));
        const custom = p.custom ? (x, y, z) => { const c = p.custom(x, y, z); return c && c.map(([n, w]) => [index.get(n), w]); } : null;
        const { skinIndex, skinWeight } = skinWeights(m.pos, m.idx, segs, { pw: p.pw ?? 5, smooth: p.smooth ?? 4, custom });
        const ao = bakeAO(m.pos, m.nrm, p.aoSelf ? p.f : sdfAll, { strength: p.mat === 'skin' ? 0.6 : 0.85 });
        const col = new Float32Array(m.pos.length);
        for (let v = 0; v < ao.length; v++) { const y = m.pos[v * 3 + 1], dust = p.mat === 'skin' || p.mat === 'trim' ? 0 : sstep(26, 0, y) * 0.8;
          const sh = p.shade ? p.shade(m.pos[v * 3], y, m.pos[v * 3 + 2]) : 1;
          col[v * 3] = sh * ao[v] * (1 - 0.1 * dust); col[v * 3 + 1] = sh * ao[v] * (1 - 0.15 * dust); col[v * 3 + 2] = sh * ao[v] * (1 - 0.24 * dust); if (y < minY) minY = y; }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
        geo.setIndex(new THREE.BufferAttribute(m.idx, 1)); geo.computeBoundingSphere();
        meshes.push({ name: p.name, mat: p.mat, geo });
      }
      built = { meshes, minY, ms: performance.now() - t0, verts: meshes.reduce((s, m) => s + m.geo.attributes.position.count, 0) };
      geoCache.set(key, built);
    }

    // colours
    const skin = o.skin || pal.skin || SKIN[Math.floor(R() * SKIN.length)];
    const ab = pick(ABAYA);
    const robeCol = fem ? (pal.abaya || ab[0]) : pal.robe, wrapCol = fem ? (pal.khimar || ab[1]) : (pal.wrap || '#efe9df');
    const cloakCol = pal.cloak && outfit === 'noble' ? pal.cloak : (o.palette && pal.cloak) || pick(CLOAKS);
    const hairCol = elder ? pick(GREY) : pick(HAIR), beardCol = beard === 'grey' ? pick(GREY) : hairCol;
    const shemagh = headwear === 'keffiyeh' && (pal.shemagh ?? (outfit === 'traveller' || R() < 0.3));
    const MATS = {
      skin: patchMaterial(physical(skin, { emissive: new THREE.Color(skin).multiplyScalar(0.06), roughness: 0.5, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffb59a'), specularIntensity: 0.45, envMapIntensity: 0.6 }), {}, THREE),
      robe: clothMat(robeCol), cloak: clothMat(cloakCol, { bump: 0.02, freq: 16, sheen: 0.7 }), sash: clothMat(pal.sash || '#8a4b2e', { freq: 22 }),
      trousers: clothMat(pal.trousers || '#c4b08e'), wrap: clothMat(wrapCol, { freq: 30, pattern: shemagh ? 1 : 0, patColor: pal.check || '#a3282a' }),
      cap: clothMat(pal.cap || '#f2eee6', { freq: 14, bump: 0.02 }),
      beard: patchMaterial(physical(beardCol, { roughness: 0.62, sheen: 0.8, sheenRoughness: 0.45, sheenColor: new THREE.Color(beardCol).lerp(new THREE.Color('#ffffff'), 0.35), envMapIntensity: 0.5 }), { kind: 2, bump: 0.02, freq: 34 }, THREE),
      hair: patchMaterial(physical(hairCol, { roughness: 0.55, sheen: 0.8, sheenRoughness: 0.4, sheenColor: new THREE.Color(hairCol).lerp(new THREE.Color('#ffffff'), 0.3) }), { kind: 2, bump: 0.015, freq: 40 }, THREE),
      trim: physical(pal.trim || '#c9a046', { metalness: 0.85, roughness: 0.38, envMapIntensity: 1.2 }),
      cord: physical('#141210', { roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#555') }),
      leather: patchMaterial(physical(pal.leather || '#6a4a30', { roughness: 0.7 }), { kind: 1, bump: 0.006, freq: 8 }, THREE),
    };

    // assemble: root (placement, scale) > lift (feet on y = 0) > armature clone (bones) + skinned meshes
    const root = new THREE.Group(), lift = new THREE.Group(), arm = arm0.clone(true);
    root.name = `person-${kind}-${outfit}-${seed}`; root.add(lift); lift.add(arm);
    lift.position.y = -built.minY * 0.01 * (arm0.scale.y / 0.01);
    root.scale.setScalar(height);
    const bones = []; arm.traverse((b) => { if (b.isBone) bones.push(b); });
    const skeleton = new THREE.Skeleton(bones, boneInverses.map((m) => m.clone()));
    for (const m of built.meshes) {
      const sm = new THREE.SkinnedMesh(m.geo, MATS[m.mat] || MATS.robe);
      sm.name = m.name; sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
      arm.add(sm); sm.bind(skeleton, bindMatrix);
    }
    const B = (n) => bones[index.get(n)];

    // props, parented to bones (bone-local units are centimetres)
    const props = {};
    const prop = (name) => {
      if (props[name]) return props[name];
      let g;
      if (name === 'jar') { g = new THREE.Mesh(jarGeo(), patchMaterial(simple('#b0663e', { roughness: 0.78 }), { kind: 1, bump: 0.01, freq: 3 }, THREE)); B('Spine2').add(g); }
      if (name === 'basket') { const bg = basketGeo(); g = new THREE.Group();
        g.add(new THREE.Mesh(bg.body, patchMaterial(simple('#a57a45', { roughness: 0.9, side: THREE.DoubleSide }), { kind: 3, bump: 0.05, freq: 1.6 }, THREE)));
        const fm = simple('#b8471f', { roughness: 0.45, clearcoat: 0.3 }); for (const f of bg.fruit) g.add(new THREE.Mesh(f, fm)); B('Spine1').add(g); }
      if (name === 'hoe') { const hg = hoeGeo(); g = new THREE.Group();
        g.add(new THREE.Mesh(hg.handle, patchMaterial(simple('#8a6038', { roughness: 0.7 }), { kind: 1, bump: 0.01, freq: 2 }, THREE)), new THREE.Mesh(hg.blade, simple('#4a4643', { roughness: 0.5, metalness: 0.7 })));
        B('Hips').add(g); }
      g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      return (props[name] = g);
    };

    // ---------------------------------------------------------------- pose
    const longGarment = P.outfit !== 'worker';
    const mixer = new THREE.AnimationMixer(arm), actions = {};
    for (const [n, c] of Object.entries(clips)) { const a = mixer.clipAction(c); a.play(); a.enabled = false; actions[n] = a; }
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
    const legNames = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
    const post = (n, x, y, z) => B(n).quaternion.multiply(q1.setFromEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG)));
    function aim(bone, child, target) {
      const bp = bone.getWorldPosition(v1), cp = child.getWorldPosition(v2);
      const qd = q1.setFromUnitVectors(v2.sub(bp).normalize(), v3.copy(target).sub(bp).normalize());
      const qw = bone.getWorldQuaternion(q2).premultiply(qd);
      bone.quaternion.copy(bone.parent.getWorldQuaternion(q3).invert().multiply(qw));
      bone.updateMatrixWorld(true);
    }
    function ik(upper, lower, end, target, pole) {
      const a = upper.getWorldPosition(new THREE.Vector3()), b = lower.getWorldPosition(new THREE.Vector3()), c = end.getWorldPosition(new THREE.Vector3());
      const L1 = a.distanceTo(b), L2 = b.distanceTo(c), toT = target.clone().sub(a), d = clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4);
      const dir = toT.normalize(), pv = pole.clone().sub(a), n = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
      const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
      const elbow = a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(n, L1 * sinA);
      aim(upper, lower, elbow); aim(lower, end, a.clone().addScaledVector(dir, d));
    }
    const at = (bone, x, y, z) => bone.localToWorld(new THREE.Vector3(x, y, z));
    const setWorldQ = (bone, q) => { bone.quaternion.copy(bone.parent.getWorldQuaternion(q3).invert().multiply(q)); bone.updateMatrixWorld(true); };
    const hipsRestY = restP[index.get('Hips')].y;

    function setPose(clip = 'stand', t = 0, op = {}) {
      const base = { stand: 'idle', kneel: 'idle', dig: 'idle', carry: 'idle' }[clip] || clip;
      for (const [n, a] of Object.entries(actions)) a.enabled = n === base;
      if (!actions[base]) throw new Error(`people: unknown clip ${clip}`);
      mixer.setTime(Math.max(0, t + (op.offset ?? 0)));
      const hips = B('Hips');
      if (base === 'walk' || base === 'run') hips.position.z = restP[index.get('Hips')].z;
      if (clip === 'stand' || clip === 'carry' || clip === 'dig' || clip === 'kneel') {
        for (const n of legNames) B(n).quaternion.copy(restQ[index.get(n)]);
        hips.position.x = restP[index.get('Hips')].x + (hips.position.x - restP[index.get('Hips')].x) * 0.3; hips.position.y = hipsRestY; hips.position.z = restP[index.get('Hips')].z;
        post('LeftUpLeg', 0, 0, 2.5); post('RightUpLeg', 0, 0, -2.5); post('LeftFoot', 0, 0, -2.5); post('RightFoot', 0, 0, 2.5);
        post('LeftArm', 0, 0, -7); post('RightArm', 0, 0, 7); post('LeftForeArm', 0, -6, 0); post('RightForeArm', 0, 6, 0);
      }
      if (base === 'walk') { post('LeftArm', 0, 0, -5); post('RightArm', 0, 0, 5); }
      if ((base === 'walk' || base === 'run') && longGarment && op.gait !== 'free') {
        for (const n of ['LeftLeg', 'RightLeg']) B(n).quaternion.slerp(restQ[index.get(n)], 0.45);
        for (const n of ['LeftFoot', 'RightFoot']) B(n).quaternion.slerp(restQ[index.get(n)], 0.3);
      }
      if (elder) { post('Spine', 7, 0, 0); post('Spine1', 5, 0, 0); post('Neck', 8, 0, 0); post('Head', -10, 0, 0); }
      if (op.lookYaw) post('Head', 0, op.lookYaw, 0);
      for (const k of Object.keys(props)) props[k].visible = false;
      arm.updateMatrixWorld(true);

      if (clip === 'kneel') {             // right knee down, left foot planted forward, torso upright
        hips.position.y = hipsRestY - 45; hips.position.z = restP[index.get('Hips')].z + 4; arm.updateMatrixWorld(true);
        ik(B('LeftUpLeg'), B('LeftLeg'), B('LeftFoot'), at(arm, 9, 8.6, 34), at(arm, 9, 80, 120));
        ik(B('RightUpLeg'), B('RightLeg'), B('RightFoot'), at(arm, -9, 11, -38), at(arm, -9, -60, 60));
        setWorldQ(B('LeftFoot'), arm.getWorldQuaternion(new THREE.Quaternion()));
        setWorldQ(B('RightFoot'), arm.getWorldQuaternion(new THREE.Quaternion()).multiply(q2.setFromEuler(new THREE.Euler(55 * DEG, 0, 0))));
        post('Spine', 4, 0, 0); arm.updateMatrixWorld(true);
        if (!op.carry) {                   // hands resting on the raised knee and thigh
          const kn = B('LeftLeg').getWorldPosition(new THREE.Vector3());
          ik(B('LeftArm'), B('LeftForeArm'), B('LeftHand'), kn.clone().add(at(arm, 2, 6, 2).sub(at(arm, 0, 0, 0))), at(arm, 60, 80, -40));
          ik(B('RightArm'), B('RightForeArm'), B('RightHand'), kn.clone().add(at(arm, -10, 4, -6).sub(at(arm, 0, 0, 0))), at(arm, -60, 80, -40));
        }
      }
      if (clip === 'dig') {               // a hoe stroke: lift, strike, drag; rate strokes per second
        const rate = op.rate ?? 0.6, ph = ((t * rate) % 1 + 1) % 1;
        const up = ph < 0.55 ? sstep(0, 0.55, ph) : ph < 0.68 ? 1 - sstep(0.55, 0.68, ph) : 0, drag = ph >= 0.68 ? sstep(0.68, 1, ph) : 0;
        post('Spine', 10 - 8 * up, 0, 0); post('Spine1', 8 - 6 * up, 0, 0); post('Neck', 6, 0, 0);
        post('LeftUpLeg', -6, 0, 3); post('RightUpLeg', 8, 0, -3); post('LeftLeg', 10, 0, 0); post('RightLeg', 6, 0, 0);
        hips.position.y = hipsRestY - 3; arm.updateMatrixWorld(true);
        // handle end E and direction u in hips space (cm)
        const E = new THREE.Vector3(-3, -4 + 54 * up - 6 * drag, 16 - 6 * up - 10 * drag);
        const ang = (-48 + 100 * up + 6 * drag) * DEG, u = new THREE.Vector3(0, Math.sin(ang), Math.cos(ang));
        const hoe = prop('hoe'); hoe.visible = true; hoe.position.copy(E); hoe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), u);
        hoe.updateMatrixWorld(true);
        ik(B('RightArm'), B('RightForeArm'), B('RightHand'), at(hoe, 0, 0, 7), at(B('Hips'), -80, 10, -30));
        ik(B('LeftArm'), B('LeftForeArm'), B('LeftHand'), at(hoe, 0, 0, 36), at(B('Hips'), 80, 0, -20));
      }
      const carry = op.carry ?? (clip === 'carry' ? 'jar' : null);
      if (carry === 'jar') {              // jar on the right shoulder, steadied by the right hand
        const jar = prop('jar'); jar.visible = true; jar.position.set(-19.5, 26, -6); jar.rotation.set(0.05, 0, 0.5); jar.updateMatrixWorld(true);
        ik(B('RightArm'), B('RightForeArm'), B('RightHand'), at(jar, -10.5, -6, 1.5), at(B('Spine2'), -70, -30, -10));
      } else if (carry === 'basket') {    // basket held in front with both hands
        const bk = prop('basket'); bk.visible = true; bk.position.set(0, -15, 27); bk.rotation.set(0.08, 0, 0); bk.updateMatrixWorld(true);
        ik(B('LeftArm'), B('LeftForeArm'), B('LeftHand'), at(bk, 19, 3, 2), at(B('Spine1'), 60, -40, -10));
        ik(B('RightArm'), B('RightForeArm'), B('RightHand'), at(bk, -19, 3, 2), at(B('Spine1'), -60, -40, -10));
      }
      root.updateMatrixWorld(true);
    }
    setPose('stand', 0);
    return {
      object3d: root, setPose, bones: B, skeleton, mixer, props: prop, height: 1.8 * height, scale: height,
      speed: (clip = 'walk') => (SPEED[clip] || 0) * 0.01 * height,      // metres per second of in-place clip motion
      info: { kind, outfit, beard, headwear, seed, verts: built.verts, buildMs: Math.round(built.ms) },
    };
  }
  return { make, clips: Object.keys(clips).concat(['stand', 'kneel', 'dig', 'carry']), J, SPEED, PALETTES };
}
