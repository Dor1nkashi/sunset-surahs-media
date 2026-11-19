// world.js: the shared 3-D world kit for Sunset Surahs films (three.js, Motion Reel). See WORLD.md.
//
// Everything here builds geometry ONCE (in a film's init) and animates only through update(t) functions
// that are pure functions of time (seeded noise, no clocks, no Math.random).
//
//   import * as W from '../lib_shared/world.js';
//   await G.initGL(); W.init(G.R);                       // G = the film's lib/gl.js
//   const set = await canaan_hills({ time: 'dusk' });    // from sets_yusuf.js
//   const S = W.stage(set);                              // a gl.js set: { scene, camera, update }
//   G.renderSet(ctx, S, t, u, { cam: 'hero' });          // or { cam: ['wide', 'hero'], p: 0.4 }
//
// Units are metres. Every geometry made here carries uv in METRES, so a PBR material's tile size is
// the size of one texture repeat on the ground/wall (W.pbr(name, { tile: 2 }) = one repeat per 2 m).
// Library files live in studio/library (laptop only, gitignored), served at /library/.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE, BGU };
export const LIB = { root: '/library' };
export let R = null;
let PM = null, ANISO = 8;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };

export function init(renderer, { root = '/library' } = {}) {
  R = renderer; LIB.root = root;
  PM = new THREE.PMREMGenerator(R);
  ANISO = Math.min(16, R.capabilities.getMaxAnisotropy());
  R.shadowMap.enabled = true;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.outputColorSpace = THREE.SRGBColorSpace;
}

// ------------------------------------------------------------------ seeded randomness + noise
export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 2-D gradient noise in about [-1, 1]
export function noise2(seed = 1) {
  const r = rng(seed), perm = [...Array(256).keys()], p = new Uint8Array(512), g = new Float32Array(512);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; g[i * 2] = Math.cos(a); g[i * 2 + 1] = Math.sin(a); }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const d = (h, dx, dy) => g[h * 2] * dx + g[h * 2 + 1] * dy;
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const n00 = d(p[p[X] + Y], xf, yf), n10 = d(p[p[X + 1] + Y], xf - 1, yf);
    const n01 = d(p[p[X] + Y + 1], xf, yf - 1), n11 = d(p[p[X + 1] + Y + 1], xf - 1, yf - 1);
    const u = fade(xf), v = fade(yf);
    return 1.414 * (n00 + u * (n10 - n00) + v * (n01 - n00) + u * v * (n00 - n10 - n01 + n11));
  };
}
export function fbm(n, x, y, oct = 5, lac = 2.03, gain = 0.5) {
  let s = 0, a = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += a * n(x * f + i * 17.3, y * f - i * 9.1); norm += a; a *= gain; f *= lac; }
  return s / norm;
}
export function ridged(n, x, y, oct = 5) {
  let s = 0, a = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(n(x * f + i * 31.7, y * f + i * 5.3)); s += a * v * v; norm += a; a *= 0.5; f *= 2.1; }
  return s / norm;
}

// ------------------------------------------------------------------ textures + PBR materials
const imgCache = new Map(), srcCache = new Map();
function loadImage(url) {
  if (!imgCache.has(url)) imgCache.set(url, new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => rej(new Error(`world.js: missing ${url}`)); im.src = url;
  }));
  return imgCache.get(url);
}
// one GPU upload per (url, res); clones share the Source, so each material can have its own repeat
async function texSource(url, res = 0, srgb = false) {
  const key = `${url}|${res}`;
  if (!srcCache.has(key)) srcCache.set(key, (async () => {
    const im = await loadImage(url);
    let src = im;
    if (res && im.width > res) { const c = document.createElement('canvas'); c.width = c.height = res;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, res, res); src = c; }
    const t = new THREE.Texture(src);
    t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  })());
  const t = (await srcCache.get(key)).clone();
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}
// the three maps of a library PBR set (diffuse sRGB, GL normal, packed AO/rough/metal)
export async function pbrMaps(name, res = 2048) {
  const b = `${LIB.root}/tex/${name}/${name}_`;
  const [map, nor, arm] = await Promise.all([texSource(`${b}Diffuse_2k.jpg`, res, true), texSource(`${b}nor_gl_2k.jpg`, res), texSource(`${b}arm_2k.jpg`, res)]);
  return { map, nor, arm };
}
export async function dispMap(name, res = 1024) { return texSource(`${LIB.root}/tex/${name}/${name}_Displacement_2k.jpg`, res); }

// A MeshStandardMaterial from a library set. tile = metres per repeat (geometry uv is in metres).
export async function pbr(name, { tile = 2, res = 2048, tint = 0xffffff, rough = 1, normal = 1, ao = 1, side = THREE.FrontSide,
  disp = 0, dispBias = 0, vertexColors = false, envI = 1, emissive = 0x000000 } = {}) {
  const T = await pbrMaps(name, res), rep = 1 / tile;
  for (const t of [T.map, T.nor, T.arm]) t.repeat.set(rep, rep);
  const m = new THREE.MeshStandardMaterial({ map: T.map, normalMap: T.nor, roughnessMap: T.arm, aoMap: T.arm, aoMapIntensity: ao,
    roughness: rough, metalness: 0, color: tint, side, vertexColors, envMapIntensity: envI, emissive });
  m.normalScale.set(normal, normal);
  if (disp) { const d = await dispMap(name); d.repeat.set(rep, rep); m.displacementMap = d; m.displacementScale = disp; m.displacementBias = dispBias - disp / 2; }
  m.name = name;
  return m;
}

// uv in metres for any geometry: planar projection along the dominant normal axis (box mapping)
export function boxUV(geo, { offset = [0, 0, 0] } = {}) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + offset[0], y = p.getY(i) + offset[1], z = p.getZ(i) + offset[2];
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; }
    else if (ax >= az) { uv[i * 2] = z * Math.sign(n.getX(i) || 1); uv[i * 2 + 1] = y; }
    else { uv[i * 2] = -x * Math.sign(n.getZ(i) || 1); uv[i * 2 + 1] = y; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
export function shadows(o, cast = true, receive = true) { o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } }); return o; }

// a bevelled box with metre uvs, sitting on y = 0 unless centred
export function rbox(w, h, d, mat, { r = 0.04, seg = 4, centre = false } = {}) {
  const g = boxUV(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
  if (!centre) g.translate(0, h / 2, 0);
  return shadows(new THREE.Mesh(g, mat));
}
// a dense flat panel (for displacement-mapped walls/floors); faces +z, uv in metres
export function panel(w, h, mat, { dens = 24 } = {}) {
  const g = new THREE.PlaneGeometry(w, h, Math.ceil(w * dens), Math.ceil(h * dens)), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + w / 2, p.getY(i) + h / 2);
  return shadows(new THREE.Mesh(g, mat));
}
// a surface of revolution with metre uvs (u around, v along the profile); pts = [[r, y], ...]
export function lathe(pts, mat, { seg = 96, phi = Math.PI * 2, uScale = 1, flip = false } = {}) {
  const P = pts.map(([r, y]) => new THREE.Vector2(r, y)), g = new THREE.LatheGeometry(P, seg, 0, phi);
  const rMean = pts.reduce((a, [r]) => a + r, 0) / pts.length, circ = rMean * phi;
  // arc length along the profile for v
  const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + P[i].distanceTo(P[i - 1]));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const j = Math.round(uv.getY(i) * (P.length - 1)); uv.setXY(i, uv.getX(i) * circ * uScale, acc[j]); }
  if (flip) { g.scale(1, 1, -1); }
  g.computeVertexNormals();
  return shadows(new THREE.Mesh(g, mat));
}

// ------------------------------------------------------------------ HDR environments
const hdrCache = new Map();
const hdrLoader = () => new HDRLoader().setDataType(THREE.FloatType);
// equirect radiance -> { zenith, horizon, ground, sunDir, sunColor, sunPower } (linear, scene units)
function analyse(tex) {
  const { data, width: w, height: h } = tex.image, st = data.length / (w * h);
  const acc = { zen: [0, 0, 0, 0], hor: [0, 0, 0, 0], gnd: [0, 0, 0, 0] };
  let best = -1, bi = 0, bj = 0;
  for (let j = 0; j < h; j++) {
    const v = 1 - (j + 0.5) / h, lat = (v - 0.5) * Math.PI, cw = Math.cos(lat);
    for (let i = 0; i < w; i += 2) {
      const o = (j * w + i) * st, r = data[o], g = data[o + 1], b = data[o + 2], L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lat > 0 && L > best) { best = L; bi = i; bj = j; }
      const k = Math.min(1, 4 / Math.max(L, 1e-4));          // clamp the sun out of the averages
      const add = (a) => { a[0] += r * k * cw; a[1] += g * k * cw; a[2] += b * k * cw; a[3] += cw; };
      if (lat > 0.95) add(acc.zen); else if (lat > 0.0 && lat < 0.12) add(acc.hor); else if (lat < -0.2) add(acc.gnd);
    }
  }
  const avg = (a) => new THREE.Color(a[0] / a[3], a[1] / a[3], a[2] / a[3]);
  const u = (bi + 0.5) / w, v = 1 - (bj + 0.5) / h, phi = (u - 0.5) * Math.PI * 2, lat = (v - 0.5) * Math.PI;
  const sunDir = V3(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)).normalize();
  const o = (bj * w + bi) * st, sc = new THREE.Color(data[o], data[o + 1], data[o + 2]);
  const m = Math.max(sc.r, sc.g, sc.b, 1e-6);
  return { zenith: avg(acc.zen), horizon: avg(acc.hor), ground: avg(acc.gnd), sunDir, sunColor: sc.clone().multiplyScalar(1 / m), sunPower: best };
}
export async function hdri(name) {
  if (!hdrCache.has(name)) hdrCache.set(name, (async () => {
    const tex = await hdrLoader().loadAsync(`${LIB.root}/hdri/${name}_2k.hdr`);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const info = analyse(tex), env = PM.fromEquirectangular(tex).texture;
    return { tex, env, info };
  })());
  return hdrCache.get(name);
}

// ------------------------------------------------------------------ sky dome + stars (tone-mapped, so fog = horizon matches)
const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`;
const SKY_FS = `
uniform vec3 zen, hor, gnd, sunD, sunC, moonD, moonC; uniform float sunDisc, glow, moonOn, gain, hazeH, moonPhase;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = y > 0. ? mix(hor, zen, pow(clamp(y / hazeH, 0., 1.), 0.6)) : mix(hor, gnd, smoothstep(0., 0.25, -y));
  float s = max(dot(d, sunD), 0.);
  c += sunC * (pow(s, 6.) * 0.22 + pow(s, 48.) * 0.55 + pow(s, 900.) * 1.6) * glow * smoothstep(-0.12, 0.02, y + 0.06);
  c += sunC * smoothstep(sunDisc, sunDisc + 0.00012, s) * 40.;
  if (moonOn > 0.) { float m = max(dot(d, moonD), 0.); float disc = smoothstep(0.99985, 0.99989, m);
    vec3 t = normalize(cross(moonD, vec3(0.,1.,0.))); float sh = dot(d - moonD, t) * 9000.; disc *= smoothstep(-1.0, 1.0, sh + moonPhase * 2.);
    c += moonC * (disc * 6. + pow(m, 400.) * 0.25 + pow(m, 30.) * 0.03) * moonOn; }
  gl_FragColor = vec4(c * gain, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function skyDome({ zenith, horizon, ground, sunDir, sunColor = new THREE.Color(1, 0.9, 0.7), sunDisc = 0.99996, glow = 1, gain = 1, hazeH = 0.5,
  moonDir = null, moonColor = new THREE.Color(0.8, 0.85, 1), moonPhase = 0.6 } = {}) {
  const u = { zen: { value: zenith }, hor: { value: horizon }, gnd: { value: ground }, sunD: { value: sunDir.clone() }, sunC: { value: sunColor },
    sunDisc: { value: sunDisc }, glow: { value: glow }, gain: { value: gain }, hazeH: { value: hazeH },
    moonD: { value: (moonDir || V3(0, -1, 0)).clone() }, moonC: { value: moonColor }, moonOn: { value: moonDir ? 1 : 0 }, moonPhase: { value: moonPhase } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VS, fragmentShader: SKY_FS,
    side: THREE.BackSide, depthWrite: false, fog: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.userData.u = u;
  return m;
}
// seeded star field; update(t, opacity) twinkles; special: [{dir, mag, col}] extra named stars (e.g. the eleven)
export function stars({ count = 3500, seed = 11, radius = 1400, size = 2.2 } = {}) {
  const r = rng(seed), pos = new Float32Array(count * 3), mag = new Float32Array(count), ph = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    pos[i * 3] = Math.cos(a) * s * radius; pos[i * 3 + 1] = Math.abs(z) * radius; pos[i * 3 + 2] = Math.sin(a) * s * radius;
    mag[i] = Math.pow(r(), 6) * 1.0 + 0.08; ph[i] = r() * 100;
    const k = r(); col.set(k < 0.2 ? [1, 0.85, 0.7] : k < 0.5 ? [0.8, 0.88, 1] : [1, 1, 1], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
  g.setAttribute('ph', new THREE.BufferAttribute(ph, 1)); g.setAttribute('scol', new THREE.BufferAttribute(col, 3));
  const u = { time: { value: 0 }, op: { value: 1 }, size: { value: size }, horizonFade: { value: 0.08 } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float mag, ph; attribute vec3 scol; uniform float time, size, horizonFade; varying float vA; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999;
        float tw = 0.75 + 0.25 * sin(time * (1.3 + fract(ph) * 2.) + ph);
        vA = mag * tw * smoothstep(0., horizonFade, normalize(position).y); vC = scol; gl_PointSize = size * (0.8 + mag * 2.2); }`,
    fragmentShader: `uniform float op; varying float vA; varying vec3 vC; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q);
      float a = exp(-d * d * 28.) * vA * op; gl_FragColor = vec4(vC * a * 3., a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = -9;
  p.userData.update = (t, opacity = 1) => { u.time.value = t; u.op.value = opacity; };
  return p;
}

// ------------------------------------------------------------------ atmosphere: env + sky + sun + fog, matched to one HDRI
// sun: { elev, azim } in degrees (azim 0 = +x, 90 = +z) overrides the HDRI's sun; the env is rotated to agree.
export async function atmosphere(scene, { hdri: name = 'plains_sunset', envI = 1, bgI = 1, background = 'sky', blur = 0.05, sun = null,
  sunI = 3, sunColor = null, fog = 0.004, fogColor = null, sky = {}, starsOn = 0, moon = null, shadowBox = 30, focus = [0, 0, 0],
  shadowFar = 400, shadowRes = 4096, hemi = 0.25, skyGain = 1, fogGain = 1 } = {}) {
  const H = await hdri(name), info = H.info;
  let dir = info.sunDir.clone();
  if (sun) {
    const e = sun.elev === undefined ? Math.asin(info.sunDir.y) : THREE.MathUtils.degToRad(sun.elev), a = THREE.MathUtils.degToRad(sun.azim);
    const nd = V3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const rot = Math.atan2(info.sunDir.z, info.sunDir.x) - Math.atan2(nd.z, nd.x);
    scene.environmentRotation.set(0, rot, 0); scene.backgroundRotation.set(0, rot, 0);
    dir = nd;
  }
  scene.environment = H.env; scene.environmentIntensity = envI;
  const hor = (fogColor ? new THREE.Color(fogColor) : info.horizon.clone().multiplyScalar(skyGain * fogGain));
  const out = { info, sunDir: dir, horizon: hor, hdri: H };
  if (background === 'hdri') {
    scene.background = H.tex; scene.backgroundBlurriness = blur; scene.backgroundIntensity = bgI;
  } else if (background === 'sky') {
    const sk = skyDome({ zenith: sky.zenith ? new THREE.Color(sky.zenith) : info.zenith.clone().multiplyScalar(skyGain), horizon: hor.clone(),
      ground: sky.ground ? new THREE.Color(sky.ground) : hor.clone().multiplyScalar(0.7), sunDir: dir,
      sunColor: new THREE.Color(sky.sunColor ?? sunColor ?? info.sunColor), glow: sky.glow ?? 1, hazeH: sky.hazeH ?? 0.5,
      sunDisc: sky.sunDisc ?? 0.99996, moonDir: moon ? moon.dir : null, moonPhase: moon?.phase ?? 0.6 });
    scene.add(sk); out.sky = sk;
  } else if (background) scene.background = new THREE.Color(background);
  if (starsOn) { const st = stars(); scene.add(st); out.stars = st; st.userData.update(0, starsOn); }
  if (fog) scene.fog = new THREE.FogExp2(hor.clone(), fog);
  // the sun (or moon) as a soft shadow-casting directional light
  const L = new THREE.DirectionalLight(new THREE.Color(sunColor ?? info.sunColor), sunI);
  L.position.copy(dir).multiplyScalar(shadowFar * 0.5).add(V3(...focus)); L.target.position.set(...focus);
  L.castShadow = sunI > 0;
  L.shadow.mapSize.set(shadowRes, shadowRes);
  Object.assign(L.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 1, far: shadowFar });
  L.shadow.bias = -0.0003; L.shadow.normalBias = 0.03; L.shadow.radius = 3; L.shadow.blurSamples = 12;
  scene.add(L, L.target); out.sun = L;
  if (hemi) { const h = new THREE.HemisphereLight(info.zenith.clone().multiplyScalar(1 / Math.max(0.001, info.zenith.r, info.zenith.g, info.zenith.b)), 0x5a4632, hemi); scene.add(h); out.hemi = h; }
  out.update = (t, cam) => {
    if (out.sky) out.sky.position.copy(cam.position);
    if (out.stars) { out.stars.position.copy(cam.position); out.stars.userData.update(t, starsOn); }
  };
  return out;
}

// ------------------------------------------------------------------ terrain
// A displaced heightfield, dense in the middle (around centre) and coarse at the edge, blending up to
// three PBR layers per vertex weight (with height-aware transitions, two-scale anti-tiling and macro
// variation so it never reads as a repeating tile).
const TERR_FRAG_DECL = `
uniform sampler2D tA1, tA2, tN1, tN2, tR1, tR2; uniform vec3 tileInv, tint0, tint1, tint2; uniform float macroAmt, aoStr, hdepth;
varying vec3 vLW; varying vec3 vWP;
float th(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(th(i), th(i+vec2(1,0)), f.x), mix(th(i+vec2(0,1)), th(i+vec2(1,1)), f.x), f.y); }
vec4 tri(sampler2D s, vec2 uv, float k){ mat2 r = mat2(0.8253, -0.5646, 0.5646, 0.8253);
  return mix(texture2D(s, uv), texture2D(s, r * uv * 0.37 + 0.31), k); }
`;
const TERR_MAP = `
  float mn = tvn(vWP.xz * 0.045) * 0.6 + tvn(vWP.xz * 0.19) * 0.4;
  float kk = 0.25 + 0.4 * tvn(vWP.xz * 0.07 + 3.1);
  vec2 uv0 = vMapUv * tileInv.x, uv1 = vMapUv * tileInv.y, uv2 = vMapUv * tileInv.z;
  vec4 r0 = texture2D(roughnessMap, uv0), r1 = texture2D(tR1, uv1), r2 = texture2D(tR2, uv2);
  vec3 hh = vec3(r0.r, r1.r, r2.r) + vLW * 1.0;
  float hm = max(hh.x, max(hh.y, hh.z)) - hdepth;
  vec3 tw = max(hh - hm, 0.) * step(0.001, vLW); tw /= max(dot(tw, vec3(1.)), 1e-4);
  vec3 c0 = tri(map, uv0, kk).rgb * tint0, c1 = tri(tA1, uv1, kk).rgb * tint1, c2 = tri(tA2, uv2, kk).rgb * tint2;
  vec3 col = c0 * tw.x + c1 * tw.y + c2 * tw.z;
  col *= 1. + macroAmt * (mn - 0.5) * 2.;
  diffuseColor.rgb *= col;
`;
const TERR_ROUGH = `float roughnessFactor = roughness * dot(vec3(r0.g, r1.g, r2.g), tw);`;
const TERR_NORM = `
  vec3 mapN = (texture2D(normalMap, uv0).xyz * 2. - 1.) * tw.x + (texture2D(tN1, uv1).xyz * 2. - 1.) * tw.y + (texture2D(tN2, uv2).xyz * 2. - 1.) * tw.z;
  mapN.xy *= normalScale; normal = normalize(tbn * mapN);
`;
const TERR_AO = `{ float tao = mix(1., dot(vec3(r0.r, r1.r, r2.r), tw), aoStr); reflectedLight.indirectDiffuse *= tao; reflectedLight.indirectSpecular *= tao; reflectedLight.directDiffuse *= mix(1., tao, 0.4); }
#include <aomap_fragment>`;
export async function terrainMaterial(layers, { macro = 0.18, ao = 0.9, normal = 1.2, hdepth = 0.25, res = 2048 } = {}) {
  const L = await Promise.all(layers.map((l) => pbrMaps(l.name, l.res ?? res)));
  while (L.length < 3) L.push(L[0]);
  const tiles = [0, 1, 2].map((i) => 1 / (layers[i]?.tile ?? layers[0].tile ?? 3));
  const tints = [0, 1, 2].map((i) => new THREE.Color(layers[i]?.tint ?? 0xffffff));
  const m = new THREE.MeshStandardMaterial({ map: L[0].map, normalMap: L[0].nor, roughnessMap: L[0].arm, roughness: 1, metalness: 0 });
  m.normalScale.set(normal, normal);
  const U = { tA1: { value: L[1].map }, tA2: { value: L[2].map }, tN1: { value: L[1].nor }, tN2: { value: L[2].nor }, tR1: { value: L[1].arm }, tR2: { value: L[2].arm },
    tileInv: { value: V3(...tiles) }, tint0: { value: tints[0] }, tint1: { value: tints[1] }, tint2: { value: tints[2] },
    macroAmt: { value: macro }, aoStr: { value: ao }, hdepth: { value: hdepth } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 lw; varying vec3 vLW; varying vec3 vWP;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLW = lw; vWP = (modelMatrix * vec4(position, 1.)).xyz;\n');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + TERR_FRAG_DECL)
      .replace('#include <map_fragment>', TERR_MAP).replace('#include <roughnessmap_fragment>', TERR_ROUGH)
      .replace('#include <normal_fragment_maps>', TERR_NORM).replace('#include <aomap_fragment>', TERR_AO);
  };
  m.customProgramCacheKey = () => 'terrain3';
  m.userData.uniforms = U;
  return m;
}
// height(x, z) -> metres; weights(x, z, h, slope) -> [w0, w1, w2] (slope 0 flat .. 1 vertical)
export function terrain({ size = 700, seg = 420, centre = [0, 0], warp = 0.22, height = () => 0, weights = () => [1, 0, 0], material }) {
  const n = seg + 1, half = size / 2, f = (s) => half * (warp * s + (1 - warp) * s * s * s);
  const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), lw = new Float32Array(n * n * 3);
  const xs = new Float32Array(n); for (let i = 0; i < n; i++) xs[i] = f(i / seg * 2 - 1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, x = centre[0] + xs[i], z = centre[1] + xs[j], y = height(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x; uv[k * 2 + 1] = -z;
  }
  const idx = new Uint32Array(seg * seg * 6); let q = 0;
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if ((i + j) & 1) { idx.set([a, c, b, b, c, d], q); } else { idx.set([a, c, d, a, d, b], q); } q += 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const nr = g.attributes.normal;
  for (let k = 0; k < n * n; k++) {
    const w = weights(pos[k * 3], pos[k * 3 + 2], pos[k * 3 + 1], 1 - nr.getY(k)), s = Math.max(1e-4, w[0] + (w[1] || 0) + (w[2] || 0));
    lw[k * 3] = w[0] / s; lw[k * 3 + 1] = (w[1] || 0) / s; lw[k * 3 + 2] = (w[2] || 0) / s;
  }
  g.setAttribute('lw', new THREE.BufferAttribute(lw, 3));
  const mesh = new THREE.Mesh(g, material); mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'terrain';
  const normalAt = (x, z, e = 0.25) => V3(height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)).normalize();
  return { mesh, heightAt: height, normalAt };
}

// ------------------------------------------------------------------ library models
const gltfCache = new Map();
export function modelPath(name) {
  if (name.startsWith('khronos_')) { const b = name.slice(8); return `${LIB.root}/models/${name}/${b}.${b === 'MandarinOrange' ? 'gltf' : 'glb'}`; }
  if (name === 'Xbot' || name === 'Michelle') return `${LIB.root}/models/${name}/${name}.glb`;
  return `${LIB.root}/models/${name}/${name}_2k.gltf`;
}
export function gltf(name) {
  if (!gltfCache.has(name)) gltfCache.set(name, new GLTFLoader().loadAsync(modelPath(name)).then((g) => {
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true;
      for (const t of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap']) if (m.material[t]) m.material[t].anisotropy = ANISO; } });
    g.bbox = new THREE.Box3().setFromObject(g.scene);
    return g;
  }));
  return gltfCache.get(name);
}
// a placed copy: base on the ground (y), optional target height or scale, yaw, tint
export async function prop(name, { pos = [0, 0, 0], height = null, scale = 1, ry = 0, rx = 0, rz = 0, tint = null, rough = null } = {}) {
  const g = await gltf(name), o = g.scene.clone(true), s = height ? height / (g.bbox.max.y - g.bbox.min.y) : scale;
  if (tint !== null || rough !== null) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); if (tint !== null) m.material.color.multiply(new THREE.Color(tint)); if (rough !== null) m.material.roughness = rough; } });
  const w = new THREE.Group(); o.scale.setScalar(s); o.position.set(-(g.bbox.min.x + g.bbox.max.x) / 2 * s, -g.bbox.min.y * s, -(g.bbox.min.z + g.bbox.max.z) / 2 * s);
  w.add(o); w.position.set(...pos); w.rotation.set(rx, ry, rz); w.name = name;
  return w;
}
// instanced copies of a library model. items: [{ x, y, z, s, ry, rx, rz }]. near/far LOD: items farther
// than lod.far from lod.focus use a cheap proxy geometry (a displaced icosphere with the model's material).
export async function scatter(name, items, { lod = null, cast = true, base = true, tint = null } = {}) {
  const g = await gltf(name), grp = new THREE.Group(); grp.name = `scatter:${name}`;
  const meshes = []; g.scene.traverse((m) => { if (m.isMesh) meshes.push(tint === null ? m : Object.assign(Object.create(m), { material: m.material.clone() })); });
  if (tint !== null) meshes.forEach((m) => m.material.color.multiply(new THREE.Color(tint)));
  const yoff = base ? -g.bbox.min.y : 0;
  const near = lod ? items.filter((it) => Math.hypot(it.x - lod.focus[0], it.z - lod.focus[1]) < lod.far) : items;
  const far = lod ? items.filter((it) => !near.includes(it)) : [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = V3(), P = V3(), T = new THREE.Matrix4();
  const mat = (it) => { E.set(it.rx || 0, it.ry || 0, it.rz || 0); Q.setFromEuler(E); S.setScalar(it.s ?? 1);
    if (it.sy) S.y *= it.sy; P.set(it.x, it.y ?? 0, it.z); return M.compose(P, Q, S).multiply(T.makeTranslation(0, yoff, 0)); };
  for (const m of meshes) {
    if (!near.length) break;
    const im = new THREE.InstancedMesh(m.geometry, m.material, near.length);
    near.forEach((it, i) => im.setMatrixAt(i, mat(it).clone().multiply(m.matrixWorld)));
    im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); grp.add(im);
  }
  if (far.length) {
    const sz = g.bbox.getSize(V3()), ctr = g.bbox.getCenter(V3()), pg = proxyRock(7).scale(sz.x, sz.y, sz.z).translate(ctr.x, ctr.y, ctr.z);
    const im = new THREE.InstancedMesh(pg, meshes[0].material, far.length);
    far.forEach((it, i) => im.setMatrixAt(i, mat(it))); im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); grp.add(im);
  }
  return grp;
}
export function proxyRock(seed = 1) {
  const g = new THREE.IcosahedronGeometry(0.5, 3), p = g.attributes.position, n = noise2(seed);
  for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)), k = 1 + 0.18 * n(v.x * 3 + v.y, v.z * 3 - v.y); v.multiplyScalar(k); p.setXYZ(i, v.x, Math.max(v.y, -0.42), v.z); }
  g.computeVertexNormals(); return g;
}
// scatter positions over terrain with rejection: area(x, z) -> probability 0..1
export function scatterPoints({ seed = 1, count = 100, rect = [-50, -50, 50, 50], area = () => 1, heightAt = () => 0, s = [0.6, 1.2], sink = 0.05, tries = 20, minDist = 0 }) {
  const r = rng(seed), out = [];
  for (let k = 0; k < count * tries && out.length < count; k++) {
    const x = lerp(rect[0], rect[2], r()), z = lerp(rect[1], rect[3], r());
    if (r() > area(x, z)) continue;
    if (minDist && out.some((o) => Math.hypot(o.x - x, o.z - z) < minDist)) continue;
    const sc = lerp(s[0], s[1], r());
    out.push({ x, z, y: heightAt(x, z) - sink * sc, s: sc, ry: r() * Math.PI * 2, rx: (r() - 0.5) * 0.15, rz: (r() - 0.5) * 0.15 });
  }
  return out;
}

// ------------------------------------------------------------------ procedural props (high-segment, PBR)
// a filled sack (grain/wool): deformed sphere, gathered neck, metre uvs
export function sack(mat, { w = 0.55, h = 0.75, seed = 1, open = false, tie = true } = {}) {
  const g = new THREE.SphereGeometry(0.5, 64, 48), p = g.attributes.position, n = noise2(seed);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const yy = y + 0.5;                                  // 0 bottom .. 1 top
    let r = 1 + 0.06 * n(x * 6 + seed, z * 6 + y * 4) + 0.03 * n(x * 17, y * 17 + z * 9);
    if (!open) { const neck = sstep(0.8, 0.98, yy); r *= 1 - 0.5 * neck; y += neck * 0.06; r *= 1 + 0.12 * Math.sin(Math.PI * clamp(yy * 1.3)); }
    else { r *= 1 + 0.08 * sstep(0.7, 1, yy); }
    y = y < -0.3 ? -0.3 - (y + 0.3) * 0.15 : y;          // flat, settled bottom
    p.setXYZ(i, x * r * w * 1.05, (y + 0.32) * h, z * r * w * (0.9 + 0.1 * n(seed, 3)));
  }
  g.computeVertexNormals(); boxUV(g);
  const grp = new THREE.Group(), body = shadows(new THREE.Mesh(g, mat)); grp.add(body);
  if (tie && !open) {
    const tuft = new THREE.Mesh(boxUV(new THREE.ConeGeometry(0.075 * w * 2, 0.16 * h, 24, 4, true).translate(0, 0.08 * h, 0)), mat); tuft.position.y = h * 0.93; grp.add(shadows(tuft));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075 * w * 2, 0.012, 10, 40), ropeMat()); band.rotation.x = Math.PI / 2; band.position.y = h * 0.9; grp.add(shadows(band));
  }
  return grp;
}
let _rope = null;
export function ropeMat() { return _rope || (_rope = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 })); }
// a twisted 3-strand rope along points
export function rope(points, r = 0.012, { segs = 200, mat = ropeMat() } = {}) {
  const curve = new THREE.CatmullRomCurve3(points), len = curve.getLength(), g = new THREE.TubeGeometry(curve, Math.max(segs, Math.ceil(len * 80)), r, 12, false);
  const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const a = uv.getY(i) * Math.PI * 2, s = uv.getX(i) * len; const k = 1 + 0.18 * Math.abs(Math.sin(a * 1.5 + s * 90));
    p.setXYZ(i, p.getX(i) + nrm.getX(i) * r * (k - 1), p.getY(i) + nrm.getY(i) * r * (k - 1), p.getZ(i) + nrm.getZ(i) * r * (k - 1)); }
  g.computeVertexNormals();
  return shadows(new THREE.Mesh(g, mat));
}
// cloth panel w x h (x, y), sagFn(u, v) -> z offset; uv in metres; double sided
export function cloth(w, h, mat, { segW = 64, segH = 64, sag = () => 0, folds = 0.02, seed = 3 } = {}) {
  const g = new THREE.PlaneGeometry(w, h, segW, segH), p = g.attributes.position, uv = g.attributes.uv, n = noise2(seed);
  for (let i = 0; i < p.count; i++) { const u = uv.getX(i), v = uv.getY(i), x = p.getX(i), y = p.getY(i);
    p.setZ(i, sag(u, v) + folds * (Math.sin(x * 9 + n(x, y) * 2) + 0.5 * n(x * 3, y * 3))); uv.setXY(i, x + w / 2, y + h / 2); }
  g.computeVertexNormals();
  return shadows(new THREE.Mesh(g, mat));
}
// egyptian lotus/papyrus column: fluted shaft, bulb capital, abacus; painted bands via vertex colour
export function column(mat, { h = 6, r = 0.45, flutes = 8, cap = 'lotus', bands = [0xb8892e, 0x2f5e8a, 0x9a3a26], seg = 96 } = {}) {
  const pts = [];
  const base = [[r * 1.45, 0], [r * 1.45, 0.25], [r * 1.25, 0.32]];
  pts.push(...base);
  const sh = h * 0.72;
  for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push([r * (1.12 - 0.12 * k) * (1 - 0.12 * Math.sin(k * Math.PI * 0.5) * (cap === 'papyrus' ? 1 : 0)), 0.32 + k * (sh - 0.32)]); }
  const ch = h - sh - 0.35;
  for (let i = 1; i <= 20; i++) { const k = i / 20; const bulge = cap === 'lotus' ? Math.sin(k * Math.PI * 0.95) * 0.55 + k * 0.2 : Math.pow(k, 0.7) * 0.75;
    pts.push([r * (1.0 + bulge), sh + k * ch]); }
  pts.push([r * 0.95, sh + ch + 0.02], [r * 0.95, h - 0.3], [r * 1.25, h - 0.3], [r * 1.25, h], [0.001, h]);
  const m = lathe(pts, mat, { seg });
  const g = m.geometry, p = g.attributes.position, col = new Float32Array(p.count * 3), C = bands.map((b) => new THREE.Color(b));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    // flutes on the shaft and ribs on the capital
    const onShaft = y > 0.35 && y < sh, onCap = y >= sh && y < sh + ch;
    const fl = onShaft ? 0.035 : onCap ? 0.06 : 0;
    const k = 1 - fl * Math.pow(Math.abs(Math.cos(a * flutes)), 0.5);
    if (rr > 0.01) { p.setX(i, x * k); p.setZ(i, z * k); }
    let c = [1, 1, 1];
    const bandY = [sh - 0.55, sh - 0.4, sh - 0.25, sh - 0.1];
    for (let b = 0; b < 3; b++) if (y > bandY[b] && y < bandY[b + 1]) { c = C[b].toArray(); }
    if (onCap && Math.cos(a * flutes) > 0.6 && y < sh + ch * 0.7) c = C[1].toArray();
    col.set(c, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return m;
}
// a heavy plank door w x h with frame, iron straps and studs; returns { group, leaf } (leaf pivots on its left edge)
export function door(planks, iron, { w = 1.1, h = 2.1, t = 0.08, frame = 0.14, studs = true } = {}) {
  const grp = new THREE.Group(), leaf = new THREE.Group();
  const nb = 5, bw = w / nb;
  for (let i = 0; i < nb; i++) { const b = rbox(bw - 0.006, h - 0.01, t, planks, { r: 0.012, seg: 2 }); b.position.set(-w / 2 + bw * (i + 0.5), 0, 0); leaf.add(b); }
  for (const y of [0.25, h - 0.3]) { const s = rbox(w * 0.96, 0.06, 0.012, iron, { r: 0.004, seg: 2 }); s.position.set(0, y, t / 2 + 0.006); leaf.add(s);
    if (studs) for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), iron); st.position.set(-w * 0.44 + i * w * 0.11, y + 0.03, t / 2 + 0.014); leaf.add(shadows(st)); } }
  const bolt = rbox(0.3, 0.04, 0.03, iron, { r: 0.008 }); bolt.position.set(w * 0.25, h * 0.5, -t / 2 - 0.02); leaf.add(bolt); leaf.userData.bolt = bolt;
  leaf.children.forEach((c) => (c.position.x += w / 2));
  leaf.position.x = -w / 2; grp.add(leaf);
  for (const s of [-1, 1]) { const j = rbox(frame, h + frame, t * 2.4, planks, { r: 0.02 }); j.position.set(s * (w / 2 + frame / 2), 0, 0); grp.add(j); }
  const lin = rbox(w + frame * 2.6, frame * 1.2, t * 2.8, planks, { r: 0.02 }); lin.position.y = h; grp.add(lin);
  return { group: grp, leaf };
}
export const ironMat = () => new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.55, metalness: 0.85 });
export const brassMat = () => new THREE.MeshStandardMaterial({ color: 0xc89a48, roughness: 0.28, metalness: 1 });
export const goldMat = () => new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.18, metalness: 1 });

// ------------------------------------------------------------------ fire + lamp flames (pure functions of t)
const FIRE_FS = `uniform float time, seed, inten; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){ vec2 uv = vUv; float n = vn(vec2(uv.x * 5. + seed, uv.y * 4. - time * 3.2)) * 0.6 + vn(vec2(uv.x * 11. - seed, uv.y * 9. - time * 5.5)) * 0.4;
  float w = (1. - uv.y) * 0.45 + 0.05; float d = abs(uv.x - 0.5 + (n - 0.5) * 0.25 * uv.y) / w;
  float a = smoothstep(1., 0.25, d + uv.y * 0.55 + (n - 0.5) * 0.9) * smoothstep(0., 0.08, uv.y);
  vec3 c = mix(vec3(1.0, 0.35, 0.06), vec3(1.0, 0.85, 0.45), smoothstep(0.2, 0.9, a)); c = mix(c, vec3(1., 0.97, 0.85), smoothstep(0.85, 1., a) * (1. - uv.y));
  gl_FragColor = vec4(c * a * inten, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function flame({ h = 0.6, w = 0.35, seed = 1, inten = 6, light = 3, lightColor = 0xff9a4a, dist = 8, planes = 3 } = {}) {
  const grp = new THREE.Group(), mats = [];
  for (let i = 0; i < planes; i++) {
    const m = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, seed: { value: seed * 7.1 + i * 3.3 }, inten: { value: inten } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0), m); p.rotation.y = (i / planes) * Math.PI; grp.add(p); mats.push(m);
  }
  const L = light ? new THREE.PointLight(lightColor, light * 8, dist, 1.6) : null;
  if (L) { L.position.y = h * 0.45; grp.add(L); }
  const n = noise2(seed * 13 + 5);
  grp.userData.update = (t, k = 1) => {
    mats.forEach((m) => { m.uniforms.time.value = t; m.uniforms.inten.value = inten * k; });
    if (L) L.intensity = light * 8 * k * (0.82 + 0.18 * (0.6 * n(t * 3.1, 0.5) + 0.4 * n(t * 9.7, 2.5)));
  };
  return grp;
}

// ------------------------------------------------------------------ water (rippled, reflective, animated by t)
let _ripple = null;
function rippleNormal() {
  if (_ripple) return _ripple;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N);
  const n = noise2(77), H = (i, j) => fbm(n, i / N * 8, j / N * 8, 4) * 0.5 + 0.5;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    // tileable by sampling a torus is overkill; mirror-blend edges instead
    const dx = (H((i + 1) % N, j) - H((i - 1 + N) % N, j)) * 6, dy = (H(i, (j + 1) % N) - H(i, (j - 1 + N) % N)) * 6;
    const v = V3(-dx, -dy, 1).normalize(), o = (j * N + i) * 4;
    im.data[o] = (v.x * 0.5 + 0.5) * 255; im.data[o + 1] = (v.y * 0.5 + 0.5) * 255; im.data[o + 2] = (v.z * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
  }
  x.putImageData(im, 0, 0); _ripple = new THREE.CanvasTexture(c); _ripple.wrapS = _ripple.wrapT = THREE.MirroredRepeatWrapping; _ripple.anisotropy = ANISO;
  return _ripple;
}
export function water(geo, { color = 0x1d3a3a, rough = 0.06, tile = 6, flow = [0.02, 0.01], opacity = 0.92 } = {}) {
  const nm = rippleNormal().clone(); nm.needsUpdate = true; nm.repeat.set(1 / tile, 1 / tile);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, normalMap: nm, transparent: opacity < 1, opacity, ior: 1.33, envMapIntensity: 1.2 });
  m.normalScale.set(0.35, 0.35);
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true;
  mesh.userData.update = (t) => nm.offset.set(t * flow[0], t * flow[1]);
  return mesh;
}

// ------------------------------------------------------------------ trees
// olive-ish tree via ez-tree (MIT): short gnarled trunk, wide silvery crown. Cached per seed.
let EZ = null;
export async function ezTree() { return EZ || (EZ = await import('/node_modules/@dgreenheck/ez-tree/build/ez-tree.es.js')); }
export async function oliveTree({ seed = 1, height = 5.5 } = {}) {
  const { Tree } = await ezTree(), t = new Tree(), o = t.options;
  o.seed = seed; o.type = 'deciduous';
  Object.assign(o.bark, { type: 'oak', tint: 0x9a9286, textured: true, textureScale: { x: 1, y: 3 } });
  Object.assign(o.branch, { levels: 3,
    angle: { 1: 52, 2: 48, 3: 40 }, children: { 0: 5, 1: 4, 2: 4 }, force: { direction: { x: 0, y: 1, z: 0 }, strength: -0.004 },
    gnarliness: { 0: 0.22, 1: 0.28, 2: 0.25, 3: 0.12 }, length: { 0: 9, 1: 9, 2: 5.5, 3: 2.2 }, radius: { 0: 1.35, 1: 0.55, 2: 0.6, 3: 0.6 },
    sections: { 0: 14, 1: 10, 2: 7, 3: 4 }, segments: { 0: 14, 1: 9, 2: 6, 3: 4 }, start: { 1: 0.32, 2: 0.25, 3: 0.2 },
    taper: { 0: 0.62, 1: 0.6, 2: 0.7, 3: 0.75 }, twist: { 0: 0.35, 1: 0.2, 2: 0.1, 3: 0 } });
  Object.assign(o.leaves, { type: 'ash', billboard: 'double', angle: 35, count: 22, start: 0.05, size: 1.25, sizeVariance: 0.5, tint: 0xb4bfa6, alphaTest: 0.45 });
  t.generate();
  const bb = new THREE.Box3().setFromObject(t), k = height / (bb.max.y - bb.min.y);
  t.scale.setScalar(k); t.position.y = -bb.min.y * k;
  // bark as a PBR standard material (keeps ez-tree's textures)
  const bm = t.branchesMesh.material;
  t.branchesMesh.material = new THREE.MeshStandardMaterial({ map: bm.map, normalMap: bm.normalMap, aoMap: bm.aoMap, roughnessMap: bm.roughnessMap, color: 0x8d877c, roughness: 1 });
  const lm = t.leavesMesh.material; if (lm.color) lm.color.set(0xb4bfa6); lm.shininess = 6; if (lm.specular) lm.specular.set(0x222222);
  const g = new THREE.Group(); g.add(t); g.userData.tree = t; g.name = 'olive';
  g.userData.update = (time) => t.update(time);                // wind sway: a pure function of absolute time
  return g;
}
// date palm: curved scarred trunk + instanced pinnate fronds (procedural textures, no library asset needed)
let _palmTex = null;
function palmTextures() {
  if (_palmTex) return _palmTex;
  // leaflet: narrow lanceolate shape, green gradient
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#3d5a26'); gr.addColorStop(0.5, '#6d8a3e'); gr.addColorStop(1, '#3a5524');
  x.fillStyle = gr; x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(64, 260, 32, 512); x.quadraticCurveTo(0, 260, 32, 0); x.fill();
  x.strokeStyle = 'rgba(200,210,140,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 4); x.lineTo(32, 508); x.stroke();
  const leaf = new THREE.CanvasTexture(c); leaf.colorSpace = THREE.SRGBColorSpace; leaf.anisotropy = ANISO;
  // bark: diamond leaf-base scars
  const b = document.createElement('canvas'); b.width = b.height = 512; const y = b.getContext('2d'), r = rng(9);
  y.fillStyle = '#6b5640'; y.fillRect(0, 0, 512, 512);
  for (let j = -1; j < 9; j++) for (let i = -1; i < 9; i++) {
    const cx = i * 64 + (j % 2 ? 32 : 0), cy = j * 64; const k = 0.75 + r() * 0.3;
    y.fillStyle = `rgb(${120 * k},${98 * k},${72 * k})`; y.beginPath(); y.moveTo(cx, cy - 30); y.lineTo(cx + 30, cy); y.lineTo(cx, cy + 30); y.lineTo(cx - 30, cy); y.closePath(); y.fill();
    y.strokeStyle = 'rgba(30,20,12,0.85)'; y.lineWidth = 5; y.stroke();
    for (let f = 0; f < 6; f++) { y.strokeStyle = `rgba(60,44,30,${0.3 + r() * 0.4})`; y.lineWidth = 1; y.beginPath(); y.moveTo(cx - 24 + r() * 48, cy - 20); y.lineTo(cx - 24 + r() * 48, cy + 20); y.stroke(); }
  }
  const bark = new THREE.CanvasTexture(b); bark.colorSpace = THREE.SRGBColorSpace; bark.wrapS = bark.wrapT = THREE.RepeatWrapping; bark.anisotropy = ANISO;
  return (_palmTex = { leaf, bark });
}
function frondGeometry(len = 3.6, n = 56, seed = 1) {
  const r = rng(seed), quads = [];
  const spine = (s) => V3(0, Math.sin(s * 1.2) * len * 0.32 - s * s * len * 0.42, s * len);     // rises then droops (along +z)
  const geos = [];
  // rachis
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(spine(i / 20));
  geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.025, 6).deleteAttribute('uv').setAttribute('uv', new THREE.BufferAttribute(new Float32Array(41 * 7 * 2).fill(0.5), 2)));
  for (let i = 0; i < n; i++) {
    const s = 0.12 + (i / n) * 0.86, p = spine(s), side = i % 2 ? 1 : -1, L = 0.55 * Math.sin(Math.PI * (0.15 + s * 0.8)) * (0.85 + r() * 0.3) + 0.15;
    const q = new THREE.PlaneGeometry(0.07, L, 1, 4);
    q.translate(0, L / 2, 0); q.rotateZ(-side * (1.05 + r() * 0.25)); q.rotateX(-0.6 - r() * 0.3 + s * 0.4); q.rotateY(side * 0.25);
    q.translate(p.x, p.y, p.z); geos.push(q);
  }
  return BGU.mergeGeometries(geos.map((g) => g.index ? g.toNonIndexed() : g));
}
export function datePalm({ seed = 1, height = 9, fronds = 26, lean = 0.08 } = {}) {
  const r = rng(seed), T = palmTextures(), grp = new THREE.Group(); grp.name = 'date_palm';
  const lx = (r() - 0.5) * 2 * lean * height, lz = (r() - 0.5) * 2 * lean * height;
  const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(V3(lx * k * k, k * height, lz * k * k)); }
  const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, 90, 0.24, 20, false);
  const p = tg.attributes.position, nr = tg.attributes.normal, uv = tg.attributes.uv;
  for (let i = 0; i < p.count; i++) { const along = uv.getX(i), rad = 1.18 - along * 0.25 + (along < 0.04 ? (0.04 - along) * 9 : 0);
    const bump = 0.035 * Math.abs(Math.sin(along * height * 9));
    for (const [a, f] of [['X', 'getX'], ['Y', 'getY'], ['Z', 'getZ']]) p['set' + a](i, p[f](i) + nr[f](i) * 0.24 * (rad - 1 + bump * 4));
    uv.setXY(i, uv.getY(i) * 1.6, along * height * 1.4); }
  tg.computeVertexNormals();
  const bark = T.bark.clone(); bark.needsUpdate = true;
  const trunk = shadows(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95, color: 0xd8c8b0 }))); grp.add(trunk);
  const top = curve.getPoint(1);
  const fg = frondGeometry(height * 0.36, 60, seed), fm = new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 });
  const im = new THREE.InstancedMesh(fg, fm, fronds), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < fronds; i++) {
    const az = i * 2.39996 + r() * 0.3, layer = i / fronds, el = -0.9 + layer * 1.6 + (r() - 0.5) * 0.2;
    E.set(el, az, 0, 'YXZ'); Q.setFromEuler(E); M.compose(top, Q, V3(1, 1, 1).multiplyScalar(0.85 + r() * 0.25)); im.setMatrixAt(i, M);
    const dead = layer < 0.18; im.setColorAt(i, new THREE.Color(dead ? 0xb8925a : 0xffffff).multiplyScalar(0.85 + r() * 0.2));
  }
  im.castShadow = true; im.receiveShadow = true; grp.add(im);
  // date clusters
  const dm = new THREE.MeshStandardMaterial({ color: 0x8a3a12, roughness: 0.45 });
  for (let c = 0; c < 4; c++) { const a = c * 1.7 + r(), cl = new THREE.Group();
    for (let k = 0; k < 40; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.4, 1), dm); d.position.set((r() - 0.5) * 0.3, -r() * 0.5, (r() - 0.5) * 0.3); cl.add(d); }
    cl.position.copy(top).add(V3(Math.cos(a) * 0.45, -0.35, Math.sin(a) * 0.45)); grp.add(shadows(cl)); }
  return grp;
}

// ------------------------------------------------------------------ crop field (instanced stalks with heads)
export function cropField({ rect = [-10, -10, 10, 10], count = 30000, seed = 5, heightAt = () => 0, h = [0.7, 1.0], color = 0x8a9a46, headColor = 0xc8b060, rows = 0.3, ripe = 0 } = {}) {
  const blade = new THREE.PlaneGeometry(0.02, 1, 1, 6).translate(0, 0.5, 0), p = blade.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.6)); p.setZ(i, y * y * 0.12); }
  const head = new THREE.CylinderGeometry(0.012, 0.018, 0.09, 6, 1).translate(0, 1.02, 0.12);
  const geo = BGU.mergeGeometries([blade.toNonIndexed(), head.toNonIndexed()]); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(headColor), ripe), roughness: 0.8, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, count), r = rng(seed), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    let x = lerp(rect[0], rect[2], r()), z = lerp(rect[1], rect[3], r());
    if (rows) z = Math.round(z / rows) * rows + (r() - 0.5) * rows * 0.35;
    const s = lerp(h[0], h[1], r());
    E.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3); Q.setFromEuler(E); M.compose(V3(x, heightAt(x, z) - 0.02, z), Q, V3(1, s, 1)); im.setMatrixAt(i, M);
    im.setColorAt(i, new THREE.Color().setHSL(0.18 + (r() - 0.5) * 0.04, 0.5, 0.35 + r() * 0.15));
  }
  im.castShadow = true; im.receiveShadow = true;
  return im;
}

// ------------------------------------------------------------------ light shaft (fake volumetric, additive)
export function lightShaft({ from, to, r0 = 0.3, r1 = 0.9, color = 0xffd9a0, op = 0.12 }) {
  const a = V3(...from), b = V3(...to), len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r0, r1, len, 32, 8, true).translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(color) }, op: { value: op }, time: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 col; uniform float op, time; varying vec2 vUv; varying vec3 vN, vV;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.5); float fall = smoothstep(0., 0.25, vUv.y) * smoothstep(0., 0.6, 1. - vUv.y + 0.2);
        float dust = 0.85 + 0.15 * h(floor(vUv * vec2(60., 90.) + time));
        gl_FragColor = vec4(col * op * edge * fall * dust, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(g, m); mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(V3(0, -1, 0), b.clone().sub(a).normalize()); mesh.renderOrder = 5;
  mesh.userData.update = (t, k = 1) => { m.uniforms.time.value = Math.floor(t * 8); m.uniforms.op.value = op * k; };
  return mesh;
}


// ------------------------------------------------------------------ contact shadows + ground cover (scale cues)
let _blob = null;
function blobTex() {
  if (_blob) return _blob;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (_blob = new THREE.CanvasTexture(c));
}
// a soft dark contact patch under an object (ambient occlusion where it meets the ground)
export function contactShadow(w, d, { op = 0.55, y = 0.012 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: op, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, color: 0x000000 }));
  m.position.y = y; m.renderOrder = 2; m.name = 'contact';
  return m;
}
// put an object on the ground: sink it a little, align to slope, add its contact shadow. Returns the object.
export function ground(o, x, z, heightAt, { sink = 0.03, ry = null, shadow = [1, 1], op = 0.5, parent = null, align = 0.6, normalAt = null } = {}) {
  const y = heightAt(x, z); o.position.set(x, y - sink, z); if (ry !== null) o.rotation.y = ry;
  if (normalAt && align) { const n = normalAt(x, z); o.rotation.x += Math.atan2(n.z, n.y) * align; o.rotation.z -= Math.atan2(n.x, n.y) * align; }
  if (shadow) { const b = new THREE.Box3().setFromObject(o), sz = b.getSize(V3()); const c = contactShadow(Math.max(0.2, sz.x * 1.25 * shadow[0]), Math.max(0.2, sz.z * 1.25 * shadow[1]), { op });
    c.position.set(x, y + 0.012, z); (parent || o.parent)?.add(c); o.userData.contact = c; }
  return o;
}
// dry grass tufts: instanced clumps of curved blades
export function tufts(items, { color = 0xb8a868, h = 0.35, blades = 14, seed = 2 } = {}) {
  const r = rng(seed), geos = [];
  for (let i = 0; i < blades; i++) { const a = r() * Math.PI * 2, lean = 0.3 + r() * 0.6, L = h * (0.6 + r() * 0.5);
    const g = new THREE.PlaneGeometry(0.012, L, 1, 5).translate(0, L / 2, 0), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k) / L; p.setX(k, p.getX(k) * (1 - y * 0.8)); p.setZ(k, y * y * lean * L); }
    g.rotateY(a); g.translate(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03); geos.push(g.toNonIndexed()); }
  const geo = BGU.mergeGeometries(geos); geo.computeVertexNormals();
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }), items.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  items.forEach((it, i) => { Q.setFromAxisAngle(V3(0, 1, 0), it.ry ?? 0); M.compose(V3(it.x, it.y, it.z), Q, V3(it.s, it.s * (0.8 + 0.4 * r()), it.s)); im.setMatrixAt(i, M);
    im.setColorAt(i, new THREE.Color(color).multiplyScalar(0.75 + r() * 0.4)); });
  im.castShadow = true; im.receiveShadow = true; im.name = 'tufts';
  return im;
}
// pebbles + tufts + medium rocks over terrain near a focus (the scale cues the eye needs)
export async function groundCover({ heightAt, focus = [0, 0], radius = 30, area = () => 1, seed = 5, pebbles = 900, rocks = 60, tuftN = 160, tuftColor = 0xb8a868, boulders = 0 }) {
  const g = new THREE.Group(); g.name = 'ground_cover';
  const rect = [focus[0] - radius, focus[1] - radius, focus[0] + radius, focus[1] + radius];
  const near = (x, z) => area(x, z) * (1 - sstep(radius * 0.4, radius, Math.hypot(x - focus[0], z - focus[1])) * 0.7);
  if (pebbles) g.add(await scatter('rock_09', scatterPoints({ seed, count: pebbles, rect, heightAt, s: [0.25, 1.6], sink: 0.004, area: near })));
  if (rocks) g.add(await scatter('rock_07', scatterPoints({ seed: seed + 1, count: rocks, rect, heightAt, s: [1.5, 7], sink: 0.04, area: near })));
  if (boulders) g.add(await scatter('namaqualand_boulder_03', scatterPoints({ seed: seed + 3, count: boulders, rect: [rect[0] * 3, rect[1] * 3, rect[2] * 3, rect[3] * 3], heightAt, s: [0.4, 1.2], sink: 0.25, area: (x, z) => area(x, z) * (Math.hypot(x - focus[0], z - focus[1]) > radius * 0.5 ? 1 : 0) }), { lod: { focus, far: 80 } }));
  if (tuftN) g.add(tufts(scatterPoints({ seed: seed + 2, count: tuftN, rect, heightAt, s: [0.6, 1.4], sink: 0.01, area: near }), { color: tuftColor }));
  return g;
}

// ------------------------------------------------------------------ people hooks
// empty named anchors where the people.js figures will stand: slots = { name: [x, y, z, yaw] }
export function peopleSlots(slots = {}) {
  const g = new THREE.Group(); g.name = 'people_slots';
  for (const [k, [x, y, z, yaw = 0]] of Object.entries(slots)) { const o = new THREE.Object3D(); o.name = k; o.position.set(x, y, z); o.rotation.y = yaw; g.add(o); }
  return g;
}

// ------------------------------------------------------------------ stage: a set -> a gl.js render set
// cam: anchor name | [a, b] with p in 0..1 | { pos, look, fov }. Anchors: { pos:[..], look:[..], fov, roll }
export function pose(cameras, cam, p = 0) {
  if (typeof cam === 'string') return cameras[cam] || cameras.hero;
  if (Array.isArray(cam)) { const a = pose(cameras, cam[0]), b = pose(cameras, cam[1]);
    return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], p)), look: a.look.map((v, i) => lerp(v, b.look[i], p)), fov: lerp(a.fov ?? 40, b.fov ?? 40, p), roll: lerp(a.roll ?? 0, b.roll ?? 0, p) };
  }
  return cam;
}
export function stage(set, { near = 0.05, far = 4000 } = {}) {
  const cam = new THREE.PerspectiveCamera(40, R.domElement.width / R.domElement.height, near, far);
  return { scene: set.scene, camera: cam, set, bloom: set.bloom ?? 0.16, bloomThreshold: set.bloomThreshold ?? 0.92, bloomRadius: 0.45,
    update(t, u, o = {}) {
      const P = pose(set.cameras, o.cam ?? 'hero', o.p ?? 0);
      cam.position.set(...P.pos); cam.fov = P.fov ?? 40; cam.aspect = R.domElement.width / R.domElement.height;
      cam.up.set(Math.sin(P.roll ?? 0), Math.cos(P.roll ?? 0), 0); cam.lookAt(...P.look); cam.updateProjectionMatrix();
      R.toneMappingExposure = o.exposure ?? set.exposure ?? 1;
      set.atmo?.update(t, cam); set.update?.(t, cam, o);
    } };
}
