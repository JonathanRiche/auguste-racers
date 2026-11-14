// Vehicles and drivers, all built from simple shapes. Forward is +Z.
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, ...(opts || {}) });
    matCache.set(key, m);
  }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphGeo = new THREE.SphereGeometry(1, 20, 14);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
const coneGeo = new THREE.ConeGeometry(1, 1, 14);
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 18).rotateZ(Math.PI / 2);

function box(parent, w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(boxGeo, mat(color, opts));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function sph(parent, r, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(sphGeo, mat(color));
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cyl(parent, r, h, color, x, y, z) {
  const m = new THREE.Mesh(cylGeo, mat(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cone(parent, r, h, color, x, y, z) {
  const m = new THREE.Mesh(coneGeo, mat(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function wheel(v, r, w, x, z, hub = 0xdddddd) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(wheelGeo, mat(0x22232a));
  tire.scale.set(w, r, r);
  g.add(tire);
  // A bar across the hub so you can see the wheel spinning.
  box(g, w + 0.06, r * 1.1, r * 0.3, hub, 0, 0, 0);
  box(g, w + 0.06, r * 0.3, r * 1.1, hub, 0, 0, 0);
  g.position.set(x, r, z);
  v.group.add(g);
  v.wheels.push({ g, r });
}

// Pools of light on the road in front of each car; faded in at night.
export const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0, depthWrite: false });
const beamGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);

function shell(shadowW, shadowL) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  shadow.scale.set(shadowW, 1, shadowL);
  shadow.position.y = 0.06;
  group.add(shadow);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.scale.set(shadowW * 1.5, 1, 5);
  beam.position.set(0, 0.08, shadowL + 5);
  group.add(beam);
  return { group, body, shadow, wheels: [], seat: new THREE.Vector3() };
}

function raceCar(color) {
  const v = shell(1.7, 2.9);
  const b = v.body;
  box(b, 1.7, 0.5, 4.0, color, 0, 0.6, 0);
  box(b, 0.4, 0.52, 4.02, 0xffffff, 0, 0.6, 0);
  box(b, 1.0, 0.36, 1.0, color, 0, 0.52, 2.3);
  box(b, 2.5, 0.1, 0.5, 0x2b2d36, 0, 0.36, 2.75);
  box(b, 2.3, 0.12, 0.6, 0x2b2d36, 0, 1.4, -1.9);
  box(b, 0.12, 0.6, 0.3, 0x2b2d36, -0.7, 1.1, -1.9);
  box(b, 0.12, 0.6, 0.3, 0x2b2d36, 0.7, 1.1, -1.9);
  box(b, 1.15, 0.25, 1.3, 0x2b2d36, 0, 0.92, -0.3);
  sph(b, 0.14, 0xfff3a0, -0.6, 0.62, 2.0);
  sph(b, 0.14, 0xfff3a0, 0.6, 0.62, 2.0);
  for (const x of [-1.15, 1.15]) for (const z of [1.35, -1.35]) wheel(v, 0.5, 0.5, x, z);
  v.seat.set(0, 0.8, -0.3);
  return v;
}

function policeCar() {
  const v = shell(1.8, 2.9);
  const b = v.body;
  const dark = 0x1f2a44;
  box(b, 1.9, 0.65, 4.3, dark, 0, 0.78, 0);
  box(b, 1.92, 0.67, 1.7, 0xffffff, 0, 0.78, -0.2);
  box(b, 1.7, 0.6, 2.0, 0xffffff, 0, 1.38, -0.3);
  box(b, 1.5, 0.42, 0.06, 0x9fdcff, 0, 1.4, 0.71);
  box(b, 1.5, 0.42, 0.06, 0x9fdcff, 0, 1.4, -1.31);
  for (const x of [-0.86, 0.86]) box(b, 0.05, 0.38, 1.6, 0x9fdcff, x, 1.42, -0.3);
  box(b, 1.95, 0.22, 0.2, 0xcfd3da, 0, 0.6, 2.2);
  box(b, 1.2, 0.12, 0.3, 0x2b2d36, 0, 1.74, -0.95);
  v.flash = [
    box(b, 0.5, 0.26, 0.34, 0xff2a2a, -0.36, 1.86, -0.95),
    box(b, 0.5, 0.26, 0.34, 0x2a6bff, 0.36, 1.86, -0.95),
  ];
  sph(b, 0.15, 0xfff3a0, -0.65, 0.85, 2.16);
  sph(b, 0.15, 0xfff3a0, 0.65, 0.85, 2.16);
  for (const x of [-1.05, 1.05]) for (const z of [1.4, -1.4]) wheel(v, 0.5, 0.42, x, z);
  v.seat.set(0, 1.3, -0.1);
  return v;
}

function monsterTruck(color) {
  const v = shell(2.4, 3.1);
  const b = v.body;
  box(b, 1.5, 0.3, 3.8, 0x2b2d36, 0, 1.25, 0);
  box(b, 2.3, 0.8, 4.3, color, 0, 2.0, 0);
  box(b, 2.32, 0.2, 4.32, 0xffd23f, 0, 1.85, 0);
  box(b, 2.1, 0.25, 1.5, color, 0, 2.5, 1.3);
  box(b, 2.0, 0.6, 0.1, 0x9fdcff, 0, 2.75, 0.5, { transparent: true, opacity: 0.6 });
  box(b, 2.1, 1.0, 0.16, 0x2b2d36, 0, 2.9, -1.0);
  box(b, 2.3, 0.3, 0.3, 0xcfd3da, 0, 1.75, 2.25);
  sph(b, 0.18, 0xfff3a0, -0.8, 2.1, 2.16);
  sph(b, 0.18, 0xfff3a0, 0.8, 2.1, 2.16);
  for (const x of [-1.5, 1.5]) for (const z of [1.55, -1.55]) wheel(v, 1.05, 0.85, x, z, 0xffd23f);
  v.seat.set(0, 2.3, -0.25);
  return v;
}

function fireTruck() {
  const v = shell(1.9, 3.4);
  const b = v.body;
  const red = 0xe53935;
  box(b, 2.3, 1.3, 3.5, red, 0, 1.35, -0.95);
  box(b, 2.3, 1.5, 1.7, red, 0, 1.45, 1.65);
  box(b, 2.32, 0.2, 5.22, 0xffffff, 0, 1.0, -0.1);
  box(b, 2.0, 0.6, 0.06, 0x9fdcff, 0, 1.8, 2.5);
  box(b, 2.2, 0.3, 0.2, 0xcfd3da, 0, 0.75, 2.55);
  for (const x of [-0.4, 0.4]) box(b, 0.1, 0.1, 3.4, 0xcfd3da, x, 2.15, -0.95);
  for (let i = 0; i < 6; i++) box(b, 0.8, 0.08, 0.08, 0xcfd3da, 0, 2.15, -2.45 + i * 0.6);
  sph(b, 0.2, 0x29b6f6, -0.8, 2.3, 1.2);
  sph(b, 0.2, 0x29b6f6, 0.8, 2.3, 1.2);
  sph(b, 0.16, 0xfff3a0, -0.8, 1.1, 2.5);
  sph(b, 0.16, 0xfff3a0, 0.8, 1.1, 2.5);
  for (const x of [-1.2, 1.2]) for (const z of [1.7, -0.9, -2.0]) wheel(v, 0.58, 0.45, x, z);
  v.seat.set(0, 1.95, 1.75);
  return v;
}

function schoolBus() {
  const v = shell(1.9, 3.7);
  const b = v.body;
  const yel = 0xffc400;
  box(b, 2.3, 1.9, 5.4, yel, 0, 1.65, -0.3);
  box(b, 2.2, 0.9, 1.0, yel, 0, 1.15, 2.85);
  box(b, 2.32, 0.12, 5.42, 0x22232a, 0, 1.25, -0.3);
  for (const x of [-1.16, 1.16]) for (let i = 0; i < 4; i++) box(b, 0.05, 0.6, 0.95, 0x7fd0ff, x, 2.05, 1.6 - i * 1.25);
  box(b, 2.0, 0.7, 0.06, 0x7fd0ff, 0, 2.05, 2.4);
  box(b, 2.3, 0.25, 0.2, 0x22232a, 0, 0.8, 3.35);
  sph(b, 0.16, 0xfff3a0, -0.75, 1.2, 3.35);
  sph(b, 0.16, 0xfff3a0, 0.75, 1.2, 3.35);
  sph(b, 0.14, 0xff5252, -0.6, 2.72, 2.3);
  sph(b, 0.14, 0xff5252, 0.6, 2.72, 2.3);
  for (const x of [-1.2, 1.2]) for (const z of [1.9, -1.9]) wheel(v, 0.58, 0.45, x, z);
  v.seat.set(0, 2.35, 1.3);
  return v;
}

function tractor() {
  const v = shell(1.9, 2.7);
  const b = v.body;
  const green = 0x43a047;
  box(b, 1.1, 0.95, 2.3, green, 0, 1.35, 1.0);
  box(b, 1.5, 0.5, 1.9, green, 0, 1.15, -0.8);
  box(b, 1.12, 0.12, 2.32, 0xffd23f, 0, 1.2, 1.0);
  box(b, 0.9, 0.5, 0.08, 0x22232a, 0, 1.4, 2.16);
  cyl(b, 0.09, 1.1, 0x2b2d36, 0.3, 2.3, 1.5);
  box(b, 0.9, 0.7, 0.2, 0xffd23f, 0, 1.75, -1.5);
  for (const x of [-1.05, 1.05]) box(b, 0.7, 0.14, 1.9, green, x, 2.3, -1.0);
  sph(b, 0.15, 0xfff3a0, -0.35, 1.6, 2.18);
  sph(b, 0.15, 0xfff3a0, 0.35, 1.6, 2.18);
  for (const x of [-1.2, 1.2]) wheel(v, 1.1, 0.6, x, -1.0, 0xffd23f);
  for (const x of [-0.95, 0.95]) wheel(v, 0.58, 0.4, x, 1.6, 0xffd23f);
  v.seat.set(0, 1.4, -0.8);
  return v;
}

export const VEHICLES = [
  { id: 'racecar', name: 'Race Car', speed: 1.0, build: () => raceCar(0xe53935) },
  { id: 'police', name: 'Police Car', speed: 0.98, build: () => policeCar() },
  { id: 'monster', name: 'Monster Truck', speed: 0.94, build: () => monsterTruck(0x3f6fe0) },
  { id: 'fire', name: 'Fire Truck', speed: 0.94, build: () => fireTruck() },
  { id: 'bus', name: 'School Bus', speed: 0.9, build: () => schoolBus() },
  { id: 'tractor', name: 'Tractor', speed: 0.86, build: () => tractor() },
];

function eyes(g, y, z, dx = 0.19) {
  sph(g, 0.075, 0x1a1a1a, -dx, y, z);
  sph(g, 0.075, 0x1a1a1a, dx, y, z);
}

function racer(g) {
  cyl(g, 0.32, 0.5, 0xffffff, 0, 0.25, 0);
  sph(g, 0.52, 0x1e88e5, 0, 0.95, 0);
  box(g, 0.74, 0.26, 0.3, 0x1a1a1a, 0, 0.98, 0.36);
  box(g, 0.16, 0.1, 0.95, 0xffffff, 0, 1.44, 0);
}
function puppy(g) {
  cyl(g, 0.32, 0.5, 0xe53935, 0, 0.25, 0);
  sph(g, 0.5, 0xd9a066, 0, 0.95, 0);
  sph(g, 0.24, 0x8b5a2b, -0.5, 0.9, 0, 0.55, 1.4, 0.8);
  sph(g, 0.24, 0x8b5a2b, 0.5, 0.9, 0, 0.55, 1.4, 0.8);
  sph(g, 0.22, 0xf3d9b0, 0, 0.84, 0.42);
  sph(g, 0.085, 0x1a1a1a, 0, 0.92, 0.63);
  eyes(g, 1.08, 0.43);
}
function kitty(g) {
  cyl(g, 0.32, 0.5, 0x8e44ad, 0, 0.25, 0);
  sph(g, 0.5, 0xf79b3c, 0, 0.95, 0);
  cone(g, 0.19, 0.38, 0xf79b3c, -0.29, 1.45, 0);
  cone(g, 0.19, 0.38, 0xf79b3c, 0.29, 1.45, 0);
  sph(g, 0.16, 0xffffff, 0, 0.84, 0.43);
  sph(g, 0.06, 0xff7aa8, 0, 0.9, 0.58);
  eyes(g, 1.06, 0.44);
}
function bear(g) {
  cyl(g, 0.32, 0.5, 0x29b6f6, 0, 0.25, 0);
  sph(g, 0.5, 0x8b5a2b, 0, 0.95, 0);
  sph(g, 0.19, 0x8b5a2b, -0.37, 1.36, 0);
  sph(g, 0.19, 0x8b5a2b, 0.37, 1.36, 0);
  sph(g, 0.21, 0xe2b98a, 0, 0.84, 0.42);
  sph(g, 0.08, 0x1a1a1a, 0, 0.92, 0.62);
  eyes(g, 1.08, 0.43);
}
function dino(g) {
  cyl(g, 0.32, 0.5, 0xffc400, 0, 0.25, 0);
  sph(g, 0.5, 0x4caf50, 0, 0.95, 0);
  box(g, 0.52, 0.36, 0.55, 0x4caf50, 0, 0.84, 0.5);
  sph(g, 0.05, 0x1a1a1a, -0.12, 0.98, 0.78);
  sph(g, 0.05, 0x1a1a1a, 0.12, 0.98, 0.78);
  cone(g, 0.12, 0.3, 0xff8a3d, 0, 1.52, 0.05);
  cone(g, 0.12, 0.3, 0xff8a3d, 0, 1.42, -0.28);
  cone(g, 0.12, 0.3, 0xff8a3d, 0, 1.2, -0.5);
  eyes(g, 1.12, 0.4, 0.24);
}
function bunny(g) {
  cyl(g, 0.32, 0.5, 0xff7aa8, 0, 0.25, 0);
  sph(g, 0.5, 0xf5f5f5, 0, 0.95, 0);
  sph(g, 0.2, 0xf5f5f5, -0.2, 1.65, 0, 0.55, 2.1, 0.5);
  sph(g, 0.2, 0xf5f5f5, 0.2, 1.65, 0, 0.55, 2.1, 0.5);
  sph(g, 0.06, 0xff7aa8, 0, 0.9, 0.5);
  eyes(g, 1.06, 0.44);
}

export const DRIVERS = [
  { id: 'racer', name: 'Racer', build: racer },
  { id: 'puppy', name: 'Puppy', build: puppy },
  { id: 'kitty', name: 'Kitty', build: kitty },
  { id: 'bear', name: 'Bear', build: bear },
  { id: 'dino', name: 'Dino', build: dino },
  { id: 'bunny', name: 'Bunny', build: bunny },
];

// A complete vehicle with its driver sitting in it.
export function buildCar(vehicleIdx, driverIdx) {
  const def = VEHICLES[vehicleIdx];
  const v = def.build();
  const d = new THREE.Group();
  DRIVERS[driverIdx].build(d);
  d.position.copy(v.seat);
  v.body.add(d);
  v.def = def;
  v.driver = d;
  return v;
}
