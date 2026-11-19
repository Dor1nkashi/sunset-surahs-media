// lane.js: a narrow city lane of mud-brick houses with latticed (mashrabiya) windows, ending at the
// squat stone prison wall with a low iron-bound door, torches either side. Built on top of the
// egypt_market set (its ground, sky, light and palms); the lane walls hide the market stalls.
// The lane runs along -z from z = 8 to the prison wall at z = GATE_Z; walls at x = +-LANE_W/2.
import * as W from '../lib_shared/world.js';
import * as K from './kit.js';
const { THREE } = W;
export const LANE_W = 3.6, GATE_Z = -18, DOOR = { w: 1.05, h: 1.85 };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// a mashrabiya grid (merged), w x h, bars `bar` thick, `n` cells across; faces +z, centred
function lattice(w, h, mat, { n = 9, bar = 0.022, depth = 0.04 } = {}) {
  const geos = [], m = Math.round(n * h / w);
  for (let i = 0; i <= n; i++) { const g = new THREE.BoxGeometry(bar, h, depth); g.translate(-w / 2 + i * w / n, 0, 0); geos.push(g); }
  for (let j = 0; j <= m; j++) { const g = new THREE.BoxGeometry(w, bar, depth); g.translate(0, -h / 2 + j * h / m, 0.004); geos.push(g); }
  // a small turned bead at every crossing
  for (let i = 1; i < n; i++) for (let j = 1; j < m; j++) { const g = new THREE.SphereGeometry(bar * 0.9, 8, 6); g.translate(-w / 2 + i * w / n, -h / 2 + j * h / m, 0.012); geos.push(g); }
  const geo = W.BGU.mergeGeometries(geos.map((g) => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal'].includes(k)) ng.deleteAttribute(k); return ng; }));
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}

export async function buildLane(S, { seed = 8 } = {}) {
  const r = W.rng(seed), n = W.noise2(seed);
  const [mud, plaster, stone, dpl, pl] = await Promise.all([
    W.pbr('rough_plaster_03', { tile: 2.0, tint: 0xd9b48a, res: 1024 }), W.pbr('clay_plaster', { tile: 2.2, tint: 0xf0dcc0, res: 1024 }),
    W.pbr('old_stone_wall', { tile: 2.4, tint: 0xd6ccb8, res: 2048, normal: 1.3 }), W.pbr('old_planks_02', { tile: 1.6, tint: 0x8a6a4e, res: 1024 }),
    W.pbr('old_planks_02', { tile: 1.6, tint: 0xcaa880, res: 1024 })]);
  const iron = W.ironMat(), wood = dpl.clone(); wood.roughness = 0.75;
  const out = { windows: [], torches: [], group: new THREE.Group() };
  const G = out.group; S.add(G);
  const box = (w, h, d, m, x, y, z) => { const b = W.rbox(w, h, d, m, { r: 0.05, seg: 3 }); b.position.set(x, y, z); G.add(b); return b; };
  // facades on both sides, segment by segment
  for (const side of [-1, 1]) {
    let z = 8;
    while (z > GATE_Z + 0.3) {
      const L = Math.min(3.6 + r() * 2.0, z - GATE_Z), H = 4.6 + r() * 2.2, m = r() < 0.5 ? mud : plaster, z0 = z - L / 2, x = side * (LANE_W / 2 + 0.25);
      // window bay (lattice) at mid-height: wall pieces around a 1.0 x 1.1 opening
      const wy = 2.35 + r() * 0.3, ww = 0.95, wh = 1.05, wz = z0 + (r() - 0.5) * (L - 1.6);
      const t = 0.5;
      box(t, wy, L, m, x, 0, z0);                                                    // below the window
      box(t, H - wy - wh, L, m, x, wy + wh, z0);                                     // above
      box(t, wh, (z - (wz + ww / 2)), m, x, wy, (z + wz + ww / 2) / 2);              // either side
      box(t, wh, ((wz - ww / 2) - (z - L)), m, x, wy, ((wz - ww / 2) + (z - L)) / 2);
      // a projecting wooden window box with the lattice, and a warm lit room behind
      const lat = lattice(ww - 0.06, wh - 0.06, wood); lat.rotation.y = -side * Math.PI / 2; lat.position.set(side * (LANE_W / 2 - 0.02), wy + wh / 2, wz); G.add(lat);
      for (const yy of [wy - 0.06, wy + wh]) { const sill = W.rbox(0.28, 0.07, ww + 0.16, dpl, { r: 0.02 }); sill.position.set(side * (LANE_W / 2 + 0.02), yy, wz); G.add(sill); }
      const room = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.6), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 1, side: THREE.BackSide }));
      room.position.set(side * (LANE_W / 2 + 0.5 + 1.1), wy + 0.4, wz); room.receiveShadow = true; G.add(room);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: true }));
      glow.rotation.y = side * Math.PI / 2; glow.position.set(side * (LANE_W / 2 + 0.5 + 2.15), wy + 0.5, wz); G.add(glow);
      const lamp = new THREE.PointLight(0xffa050, 0, 5, 1.8); lamp.position.set(side * (LANE_W / 2 + 1.3), wy + 0.5, wz); G.add(lamp);
      out.windows.push({ side, wz, wy, glow, lamp, ph: r() * 6.3, rate: 0.6 + r() * 0.8 });
      // an occasional low door at ground level
      if (r() < 0.55) { const dz = z0 + (wz < z0 ? 0.9 : -0.9) * Math.min(1, (L - 1.2) / 2);
        const dr = W.rbox(0.12, 1.8, 0.85, pl, { r: 0.02 }); dr.position.set(side * (LANE_W / 2 + 0.02), 0, dz); G.add(dr);
        const lin = W.rbox(0.3, 0.12, 1.1, dpl, { r: 0.02 }); lin.position.set(side * (LANE_W / 2 + 0.05), 1.8, dz); G.add(lin); }
      // roof parapet and beam ends
      box(t + 0.12, 0.25, L + 0.05, m, x, H, z0);
      for (let k = 0; k < Math.floor(L / 0.7); k++) { const b = new THREE.Mesh(W.boxUV(new THREE.CylinderGeometry(0.07, 0.075, 0.45, 16).rotateZ(Math.PI / 2)), dpl); b.position.set(side * (LANE_W / 2 - 0.05), H - 0.25, z - 0.35 - k * 0.7); G.add(W.shadows(b)); }
      z -= L;
    }
  }
  // the prison wall across the lane: big dressed stone, a low door with iron straps, torches
  const GW = LANE_W + 1.2, GH = 5.2, GT = 0.9;
  const piece = (w, h, x, y) => { const b = W.rbox(w, h, GT, stone, { r: 0.04, seg: 3 }); b.position.set(x, y, GATE_Z - GT / 2); G.add(b); return b; };
  piece((GW - DOOR.w) / 2, GH, -(GW + DOOR.w) / 4, 0); piece((GW - DOOR.w) / 2, GH, (GW + DOOR.w) / 4, 0); piece(DOOR.w + 0.02, GH - DOOR.h, 0, DOOR.h);
  const lint = W.rbox(DOOR.w + 0.7, 0.3, GT + 0.12, stone, { r: 0.03 }); lint.position.set(0, DOOR.h, GATE_Z - GT / 2); G.add(lint);
  const thr = W.rbox(DOOR.w + 0.3, 0.1, GT + 0.3, stone, { r: 0.02 }); thr.position.set(0, -0.06, GATE_Z - GT / 2); G.add(thr);
  // inside the prison: a lit passage seen through the open door
  // (floor, two walls, ceiling and the far end; open toward the door so it can be seen from inside)
  const pm = stone.clone(); pm.color = new THREE.Color(0x9a8a74);
  const pz = GATE_Z - GT - 2, pas = new THREE.Group();
  const pl_ = (w, h, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm); W.boxUV(m.geometry); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; pas.add(m); };
  pl_(2.2, 4.2, 0, 0.002, pz, -Math.PI / 2, 0); pl_(2.2, 4.2, 0, 2.6, pz, Math.PI / 2, 0);
  pl_(4.2, 2.6, -1.0, 1.3, pz, 0, Math.PI / 2); pl_(4.2, 2.6, 1.0, 1.3, pz, 0, -Math.PI / 2); pl_(2.2, 2.6, 0, 1.3, pz - 2.0, 0, 0);
  G.add(pas);
  const inLight = new THREE.PointLight(0xffa860, 6, 6, 1.6); inLight.position.set(0, 1.9, GATE_Z - GT - 1.6); G.add(inLight);
  const D = W.door(pl, iron, { w: DOOR.w - 0.02, h: DOOR.h - 0.01, t: 0.09, frame: 0.0001, studs: true });
  D.group.position.set(0, 0, GATE_Z - 0.12); G.add(D.group);
  // its outer bolt (lane side): slides into a keeper on the stone
  const bolt = K.doorBolt(iron, { len: 0.42, travel: 0.28 }); bolt.position.set(DOOR.w / 2 - 0.12, 1.02, GATE_Z - 0.12 + 0.065); G.add(bolt);
  const kp = W.rbox(0.07, 0.08, 0.06, iron, { r: 0.008 }); kp.position.set(DOOR.w / 2 + 0.08, 0.98, GATE_Z - 0.05); G.add(kp);
  out.door = D; out.bolt = bolt; out.inLight = inLight;
  // torches on iron brackets either side
  for (const s of [-1, 1]) {
    const tg = new THREE.Group(); tg.position.set(s * 1.25, 2.15, GATE_Z + 0.08);
    const arm = W.rbox(0.03, 0.03, 0.32, iron, { r: 0.005 }); arm.position.set(0, -0.12, 0.1); tg.add(arm);
    const cup = W.lathe([[0.001, 0], [0.05, 0.0], [0.07, 0.12], [0.065, 0.13]], iron, { seg: 32 }); cup.position.set(0, -0.12, 0.26); tg.add(cup);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.42, 16), dpl); stick.position.set(0, -0.02, 0.26); tg.add(W.shadows(stick));
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1, emissive: 0x401000, emissiveIntensity: 0.6 })); wrap.position.set(0, 0.2, 0.26); tg.add(wrap);
    const f = W.flame({ h: 0.42, w: 0.22, seed: 4 + s, inten: 3.2, light: 2.2, dist: 9 }); f.position.set(0, 0.24, 0.26); tg.add(f);
    G.add(tg); out.torches.push({ group: tg, flame: f });
  }
  W.shadows(G);
  for (const w of out.windows) { w.glow.castShadow = false; }
  // the swinging lamp that throws lattice shadows into the lane (left wall, at his stopping place)
  return out;
}
