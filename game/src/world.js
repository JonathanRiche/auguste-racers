// Tracks: a closed loop of road with scenery around it.
import * as THREE from 'three';
import { mat } from './models.js';

export const ROAD_W = 16;
const SEG = 1.0; // approximate spacing of track sample points

export const TRACKS = [
  {
    id: 'meadow', name: 'Sunny Meadow', theme: 'meadow',
    sky: 0x8fd3ff, ground: 0x6ecb4f, road: 0x5a5f6b,
    pts: [[0, -70], [60, -75], [105, -45], [110, 10], [75, 45], [30, 35], [0, 60], [-50, 75], [-100, 50], [-110, -5], [-80, -50], [-40, -60]],
  },
  {
    id: 'beach', name: 'Sandy Beach', theme: 'beach',
    sky: 0x7fe0f5, ground: 0xf2dc9b, road: 0x6b6259,
    pts: [[0, -60], [70, -85], [130, -50], [125, 15], [80, 30], [60, 75], [0, 95], [-60, 70], [-70, 20], [-125, 0], [-120, -60], [-60, -80]],
  },
  {
    id: 'snow', name: 'Snowy Hills', theme: 'snow',
    sky: 0xbfe3ff, ground: 0xf4f8ff, road: 0x4d5560,
    pts: [[0, -90], [60, -75], [75, -25], [120, 5], [112, 62], [60, 85], [20, 52], [-22, 80], [-78, 92], [-118, 50], [-95, 0], [-122, -50], [-72, -92], [-35, -62]],
  },
  {
    id: 'desert', name: 'Dusty Canyon', theme: 'desert',
    sky: 0x9fdcff, ground: 0xe8b56a, road: 0x5d5048,
    pts: [[0, -85], [75, -80], [125, -35], [95, 15], [125, 70], [60, 100], [0, 70], [-60, 100], [-125, 65], [-100, 5], [-130, -50], [-65, -90]],
  },
];

// Levels go round the four tracks three times; the other racers get quicker each round.
export const LEVELS = [];
for (let round = 0; round < 3; round++) {
  for (let t = 0; t < TRACKS.length; t++) {
    LEVELS.push({ track: t, laps: round < 2 ? 2 : 3, pace: [0.82, 1.0, 1.1][round] });
  }
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkerTexture(cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols * 16;
  c.height = rows * 16;
  const g = c.getContext('2d');
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    g.fillStyle = (x + y) % 2 ? '#ffffff' : '#1a1a1a';
    g.fillRect(x * 16, y * 16, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

const ico = new THREE.IcosahedronGeometry(1, 1);
const coneG = new THREE.ConeGeometry(1, 1, 8);
const cylG = new THREE.CylinderGeometry(1, 1, 1, 8);
const boxG = new THREE.BoxGeometry(1, 1, 1);
const flat = (c) => mat(c, { flatShading: true });

// Each scenery kind is a list of parts: geometry, colour, offset and scale.
const KINDS = {
  tree: [
    { g: cylG, c: 0x8b5a2b, p: [0, 1.5, 0], s: [0.45, 3, 0.45] },
    { g: ico, c: 0x3fa34d, p: [0, 4.6, 0], s: [2.6, 2.6, 2.6] },
  ],
  bush: [{ g: ico, c: 0x55b85a, p: [0, 0.7, 0], s: [1.4, 1.0, 1.4] }],
  flower: [
    { g: cylG, c: 0x3fa34d, p: [0, 0.4, 0], s: [0.06, 0.8, 0.06] },
    { g: ico, c: 0xffd23f, p: [0, 0.9, 0], s: [0.3, 0.3, 0.3] },
  ],
  flower2: [
    { g: cylG, c: 0x3fa34d, p: [0, 0.4, 0], s: [0.06, 0.8, 0.06] },
    { g: ico, c: 0xff6b9a, p: [0, 0.9, 0], s: [0.3, 0.3, 0.3] },
  ],
  palm: [
    { g: cylG, c: 0xa9793f, p: [0, 3, 0], s: [0.35, 6, 0.35] },
    { g: ico, c: 0x2e9e4f, p: [0, 6.2, 0], s: [3.2, 0.5, 1.0] },
    { g: ico, c: 0x37b35c, p: [0, 6.3, 0], s: [1.0, 0.5, 3.2] },
    { g: ico, c: 0x8b5a2b, p: [0.3, 5.7, 0.2], s: [0.35, 0.35, 0.35] },
  ],
  umbrella: [
    { g: cylG, c: 0xffffff, p: [0, 1.4, 0], s: [0.08, 2.8, 0.08] },
    { g: coneG, c: 0xff5252, p: [0, 3.0, 0], s: [2.2, 0.9, 2.2] },
  ],
  ball: [{ g: ico, c: 0x29b6f6, p: [0, 0.6, 0], s: [0.6, 0.6, 0.6] }],
  rock: [{ g: ico, c: 0x9aa0a6, p: [0, 0.5, 0], s: [1.3, 0.9, 1.1] }],
  pine: [
    { g: cylG, c: 0x6d4c2f, p: [0, 0.8, 0], s: [0.4, 1.6, 0.4] },
    { g: coneG, c: 0x2e7d4f, p: [0, 3.0, 0], s: [2.4, 3.2, 2.4] },
    { g: coneG, c: 0x2e7d4f, p: [0, 5.0, 0], s: [1.8, 2.6, 1.8] },
    { g: coneG, c: 0xffffff, p: [0, 6.6, 0], s: [1.0, 1.6, 1.0] },
  ],
  snowman: [
    { g: ico, c: 0xffffff, p: [0, 0.9, 0], s: [1.0, 1.0, 1.0] },
    { g: ico, c: 0xffffff, p: [0, 2.2, 0], s: [0.72, 0.72, 0.72] },
    { g: ico, c: 0xffffff, p: [0, 3.2, 0], s: [0.5, 0.5, 0.5] },
    { g: coneG, c: 0xff8a3d, p: [0, 3.2, 0.6], s: [0.1, 0.5, 0.1], rx: Math.PI / 2 },
    { g: cylG, c: 0x22232a, p: [0, 3.8, 0], s: [0.4, 0.5, 0.4] },
  ],
  cactus: [
    { g: cylG, c: 0x3f9b4a, p: [0, 2.2, 0], s: [0.55, 4.4, 0.55] },
    { g: boxG, c: 0x3f9b4a, p: [0.9, 2.4, 0], s: [1.3, 0.5, 0.5] },
    { g: boxG, c: 0x3f9b4a, p: [1.4, 3.1, 0], s: [0.5, 1.6, 0.5] },
    { g: boxG, c: 0x3f9b4a, p: [-0.9, 1.7, 0], s: [1.3, 0.5, 0.5] },
    { g: boxG, c: 0x3f9b4a, p: [-1.4, 2.3, 0], s: [0.5, 1.4, 0.5] },
  ],
  redrock: [{ g: ico, c: 0xc9713b, p: [0, 0.8, 0], s: [2.0, 1.5, 1.7] }],
  mesa: [
    { g: cylG, c: 0xc9713b, p: [0, 22, 0], s: [48, 44, 48] },
    { g: cylG, c: 0xdb8a4e, p: [0, 46, 0], s: [50, 5, 50] },
  ],
  cloud: [
    { g: ico, c: 0xffffff, p: [0, 0, 0], s: [9, 4, 6] },
    { g: ico, c: 0xffffff, p: [7, -0.5, 1], s: [6, 3, 4.5] },
    { g: ico, c: 0xffffff, p: [-7, -0.8, -1], s: [6.5, 3, 5] },
  ],
  hill: [{ g: ico, c: 0x58b54a, p: [0, 0, 0], s: [60, 26, 60] }],
  mountain: [
    { g: coneG, c: 0xdce9f7, p: [0, 30, 0], s: [55, 60, 55] },
    { g: coneG, c: 0xffffff, p: [0, 48, 0], s: [22.5, 24, 22.5] },
  ],
  island: [{ g: ico, c: 0x58b54a, p: [0, 0, 0], s: [45, 14, 45] }],
};

const THEMES = {
  meadow: { near: [['tree', 70], ['bush', 50], ['flower', 60], ['flower2', 60]], far: ['hill', 14] },
  beach: { near: [['palm', 60], ['umbrella', 22], ['ball', 25], ['rock', 30]], far: ['island', 9] },
  desert: { near: [['cactus', 60], ['redrock', 45], ['bush', 20]], far: ['mesa', 10] },
  snow: { near: [['pine', 80], ['snowman', 18], ['rock', 30]], far: ['mountain', 14] },
};

function addInstances(group, kind, placements) {
  if (!placements.length) return;
  const parts = KINDS[kind];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (const part of parts) {
    const im = new THREE.InstancedMesh(part.g, flat(part.c), placements.length);
    placements.forEach((pl, i) => {
      const cs = Math.cos(pl.rot), sn = Math.sin(pl.rot);
      const ox = part.p[0] * pl.s, oz = part.p[2] * pl.s;
      pos.set(pl.x + ox * cs + oz * sn, pl.y + part.p[1] * pl.s, pl.z - ox * sn + oz * cs);
      e.set(part.rx || 0, pl.rot, 0, 'YXZ');
      q.setFromEuler(e);
      scl.set(part.s[0] * pl.s, part.s[1] * pl.s, part.s[2] * pl.s);
      im.setMatrixAt(i, m4.compose(pos, q, scl));
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    group.add(im);
  }
}

export function buildWorld(def) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const N = Math.round(curve.getLength() / SEG);
  const sp = curve.getSpacedPoints(N);
  const px = new Float32Array(N), pz = new Float32Array(N);
  const tx = new Float32Array(N), tz = new Float32Array(N);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < N; i++) {
    px[i] = sp[i].x; pz[i] = sp[i].z;
    minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i]);
    minZ = Math.min(minZ, pz[i]); maxZ = Math.max(maxZ, pz[i]);
  }
  for (let i = 0; i < N; i++) {
    const a = (i + N - 1) % N, b = (i + 1) % N;
    const dx = px[b] - px[a], dz = pz[b] - pz[a];
    const l = Math.hypot(dx, dz) || 1;
    tx[i] = dx / l; tz[i] = dz / l;
  }
  // Left-hand normal of the direction of travel is (tz, -tx).

  // Coloured strips laid along the track, built as separate quads.
  const pos = [], col = [];
  const c = new THREE.Color();
  function quad(i, off1, off2, y, color) {
    const j = (i + 1) % N;
    c.set(color);
    const ax = px[i] + tz[i] * off1, az = pz[i] - tx[i] * off1;
    const bx = px[i] + tz[i] * off2, bz = pz[i] - tx[i] * off2;
    const cx = px[j] + tz[j] * off1, cz = pz[j] - tx[j] * off1;
    const dx = px[j] + tz[j] * off2, dz = pz[j] - tx[j] * off2;
    // off1 is the more-left edge.
    pos.push(ax, y, az, bx, y, bz, cx, y, cz, bx, y, bz, dx, y, dz, cx, y, cz);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  const H = ROAD_W / 2;
  for (let i = 0; i < N; i++) {
    quad(i, H, -H, 0.1, def.road);
    const stripe = Math.floor(i / 3) % 2 ? 0xffffff : 0xe53935;
    quad(i, H + 1.4, H, 0.12, stripe);
    quad(i, -H, -H - 1.4, 0.12, stripe);
    if (i > 6 && Math.floor(i / 4) % 2 === 0) quad(i, 0.3, -0.3, 0.13, 0xffffff);
  }
  for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) {
    quad(r, H - k * 2, H - (k + 1) * 2, 0.14, (r + k) % 2 ? 0xffffff : 0x1a1a1a);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  rg.computeVertexNormals();
  const road = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  road.frustumCulled = false;
  group.add(road);

  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const radius = Math.max(maxX - minX, maxZ - minZ) / 2;

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(def.theme === 'beach' ? radius + 70 : 900, 48).rotateX(-Math.PI / 2),
    mat(def.ground)
  );
  ground.position.set(cx, 0, cz);
  group.add(ground);
  if (def.theme === 'beach') {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(900, 32).rotateX(-Math.PI / 2), mat(0x2aa7e0));
    sea.position.set(cx, -0.4, cz);
    group.add(sea);
  }

  // Start arch.
  const arch = new THREE.Group();
  const postM = mat(0xe53935);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(cylG, postM);
    post.scale.set(0.5, 8, 0.5);
    post.position.set(s * (H + 2.4), 4, 0);
    arch.add(post);
  }
  const banner = new THREE.Mesh(boxG, new THREE.MeshBasicMaterial({ map: checkerTexture(16, 2) }));
  banner.scale.set(ROAD_W + 5.4, 1.8, 0.4);
  banner.position.set(0, 7.6, 0);
  arch.add(banner);
  arch.position.set(px[0], 0, pz[0]);
  arch.rotation.y = Math.atan2(tx[0], tz[0]);
  group.add(arch);

  // Scenery.
  const rand = rng(def.id.length * 7919 + def.pts.length);
  function trackDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < N; i += 3) {
      const d = (x - px[i]) ** 2 + (z - pz[i]) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  const theme = THEMES[def.theme];
  const landR = def.theme === 'beach' ? radius + 60 : 1e9;
  for (const [kind, count] of theme.near) {
    const list = [];
    let tries = 0;
    while (list.length < count && tries++ < count * 30) {
      const x = minX - 45 + rand() * (maxX - minX + 90);
      const z = minZ - 45 + rand() * (maxZ - minZ + 90);
      const d = trackDist(x, z);
      if (d < H + 6 || d > 55) continue;
      if (Math.hypot(x - cx, z - cz) > landR) continue;
      list.push({ x, y: 0, z, s: 0.8 + rand() * 0.6, rot: rand() * Math.PI * 2 });
    }
    addInstances(group, kind, list);
  }
  const [farKind, farCount] = theme.far;
  const far = [];
  for (let i = 0; i < farCount; i++) {
    const a = (i / farCount) * Math.PI * 2 + rand() * 0.3;
    const r = radius + 170 + rand() * 90;
    far.push({ x: cx + Math.cos(a) * r, y: 0, z: cz + Math.sin(a) * r, s: 0.7 + rand() * 0.7, rot: rand() * 6 });
  }
  addInstances(group, farKind, far);
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, r = 120 + rand() * 420;
    clouds.push({ x: cx + Math.cos(a) * r, y: 190 + rand() * 60, z: cz + Math.sin(a) * r, s: 0.7 + rand() * 0.8, rot: rand() * 6 });
  }
  addInstances(group, 'cloud', clouds);

  const sun = new THREE.Mesh(ico, new THREE.MeshBasicMaterial({ color: 0xfff2a8, fog: false }));
  sun.scale.setScalar(26);
  group.add(sun);
  const moon = new THREE.Mesh(ico, new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false }));
  moon.scale.setScalar(18);
  group.add(moon);
  const starPos = [];
  for (let i = 0; i < 350; i++) {
    const a = rand() * Math.PI * 2, el = 0.08 + rand() * 1.45;
    starPos.push(cx + Math.cos(a) * Math.cos(el) * 800, Math.sin(el) * 800, cz + Math.sin(a) * Math.cos(el) * 800);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  group.add(stars);

  // Nearest sample point to (x, z). Pass the last known index as a hint.
  function locate(x, z, hint) {
    let best = 0, bd = 1e18;
    const lo = hint < 0 ? 0 : hint - 30, hi = hint < 0 ? N - 1 : hint + 30;
    for (let k = lo; k <= hi; k++) {
      const i = ((k % N) + N) % N;
      const d = (x - px[i]) ** 2 + (z - pz[i]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  return {
    def, group, N, px, pz, tx, tz, locate, sun, moon, stars,
    center: new THREE.Vector3(cx, 0, cz), radius,
    segLen: curve.getLength() / N,
    dispose() {
      group.traverse((o) => {
        if ((o.isMesh || o.isPoints) && o.geometry !== ico && o.geometry !== coneG && o.geometry !== cylG && o.geometry !== boxG) o.geometry.dispose();
        if (o.isInstancedMesh) o.dispose();
      });
      banner.material.map.dispose();
    },
  };
}
