// eleven.js: the eleven stars of Yusuf's dream, fixed in the Canaan sky so every film that shows them
// (y12-00, 01, 15, 16) puts them in exactly the same place. A loose arch of eleven brighter stars above
// the house, seen from the canaan_hills hero side. Pure function of time (twinkle from a seeded phase).
//
//   import { elevenStars, ELEVEN } from '../lib_shared/eleven.js';
//   const E11 = elevenStars(THREE); hillsSet.scene.add(E11);
//   E11.userData.update(t, camera, { op: 1, zoom: 1, hi: 0 });   // hi: extra glow on the brightest (index 5)
//
// ELEVEN: unit direction vectors [x, y, z] (world space, y up). ELEVEN_CENTRE: the arch's centre.
export const ELEVEN_CENTRE = (() => { const v = [-0.16, 0.6, -0.78], l = Math.hypot(...v); return v.map((x) => x / l); })();
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const BRIGHTEST = 5;
export const ELEVEN = (() => {
  const c = ELEVEN_CENTRE, up = [0, 1, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nz = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const r = nz(cr(c, up)), u = nz(cr(r, c)), R = rng(1211), out = [];
  for (let i = 0; i < 11; i++) {
    const a = (12 + i * 15.6 + (R() - 0.5) * 5) * Math.PI / 180, rad = (10.5 + (R() - 0.5) * 2.2) * Math.PI / 180;
    const x = Math.cos(a) * Math.tan(rad), y = Math.sin(a) * Math.tan(rad) - 0.04;
    out.push(nz([c[0] + r[0] * x + u[0] * y, c[1] + r[1] * x + u[1] * y, c[2] + r[2] * x + u[2] * y]));
  }
  return out;
})();

export function elevenStars(THREE, { size = 7, radius = 1300, color = [1.0, 0.94, 0.82] } = {}) {
  const n = ELEVEN.length, pos = new Float32Array(n * 3), mag = new Float32Array(n), ph = new Float32Array(n), id = new Float32Array(n), R = rng(77);
  ELEVEN.forEach((d, i) => { pos.set(d.map((x) => x * radius), i * 3); mag[i] = i === BRIGHTEST ? 1.35 : 0.82 + R() * 0.22; ph[i] = R() * 100; id[i] = i; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
  g.setAttribute('ph', new THREE.BufferAttribute(ph, 1)); g.setAttribute('sid', new THREE.BufferAttribute(id, 1));
  const u = { time: { value: 0 }, op: { value: 1 }, size: { value: size }, zoom: { value: 1 }, hi: { value: 0 }, col: { value: new THREE.Color(...color) } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: true, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float mag, ph, sid; uniform float time, size, zoom, hi; varying float vA, vH;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.99985;
        float tw = 0.86 + 0.14 * sin(time * (1.1 + fract(ph) * 1.6) + ph);
        vH = sid == ${BRIGHTEST}. ? hi : 0.; vA = mag * tw; gl_PointSize = size * zoom * (0.7 + mag * 0.9) * (1. + vH * 1.6); }`,
    fragmentShader: `uniform float op; uniform vec3 col; varying float vA, vH; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q);
      float core = exp(-d * d * 34.), halo = exp(-d * d * 7.) * (0.3 + vH * 0.5);
      float a = (core + halo) * vA * op; vec3 c = mix(col, vec3(1.0, 0.82, 0.42), vH * 0.7);
      gl_FragColor = vec4(c * a * 2.4, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = -8; p.name = 'eleven_stars';
  p.userData.update = (t, cam, { op = 1, zoom = 1, hi = 0 } = {}) => { if (cam) p.position.copy(cam.position); u.time.value = t; u.op.value = op; u.zoom.value = zoom; u.hi.value = hi; };
  return p;
}
