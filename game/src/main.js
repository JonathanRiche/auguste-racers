import * as THREE from 'three';
import { VEHICLES, DRIVERS, buildCar, mat, beamMat } from './models.js';
import { TRACKS, ROAD_W, buildWorld } from './world.js';
import { input, onAction, pollInput, bindTouch, clearInput } from './input.js';
import * as audio from './audio.js';

const PLAYER_NAME = 'Auguste';
const TOP_SPEED = 34;
const HALF = ROAD_W / 2;
const WALL = HALF + 2.5;

// ---------- settings ----------
const OPTIONS = [
  { key: 'laps', label: 'Laps', values: [1, 2, 3, 5], show: (v) => String(v) },
  { key: 'friends', label: 'Friends', values: [true, false], show: (v) => (v ? 'Race with friends' : 'Just drive') },
  { key: 'speed', label: 'Speed', values: [0.6, 0.8, 1.0], show: (v) => ({ 0.6: 'Slow', 0.8: 'Medium', 1: 'Fast' }[v]) },
  { key: 'help', label: 'Steering help', values: [2, 1, 0], show: (v) => ['Off', 'A little', 'Lots'][v] },
  { key: 'autoGo', label: 'Driving', values: [true, false], show: (v) => (v ? 'Goes by itself' : 'Hold A to go') },
  { key: 'sky', label: 'Sky', values: ['cycle', 'day', 'night'], show: (v) => ({ cycle: 'Day and night', day: 'Always day', night: 'Always night' }[v]) },
  { key: 'sound', label: 'Sound', values: [true, false], show: (v) => (v ? 'On' : 'Off') },
];
const settings = { vehicle: 0, driver: 0, track: 0, laps: 3, friends: true, speed: 0.8, help: 2, autoGo: true, sky: 'cycle', sound: true };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('august-racers') || '{}'));
} catch (e) { /* storage unavailable */ }
settings.vehicle = Math.min(Math.max(settings.vehicle | 0, 0), VEHICLES.length - 1);
settings.driver = Math.min(Math.max(settings.driver | 0, 0), DRIVERS.length - 1);
settings.track = Math.min(Math.max(settings.track | 0, 0), TRACKS.length - 1);
function save() {
  try { localStorage.setItem('august-racers', JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
audio.setSound(settings.sound);

// ---------- renderer and scenes ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const camera = new THREE.PerspectiveCamera(62, 1, 1, 1200);

function lights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a70, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(60, 120, -40);
  scene.add(sun);
  return { hemi, sun };
}

const raceScene = new THREE.Scene();
const raceLights = lights(raceScene);
raceScene.background = new THREE.Color();
raceScene.fog = new THREE.Fog(0xffffff, 250, 900);
const showScene = new THREE.Scene();
showScene.background = new THREE.Color(0x58b7f5);
lights(showScene);
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.5, 40), mat(0xffd23f));
  disc.position.y = -0.25;
  showScene.add(disc);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 40).rotateX(-Math.PI / 2), mat(0x3f9ee0));
  floor.position.y = -0.5;
  showScene.add(floor);
}
const turntable = new THREE.Group();
showScene.add(turntable);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- game state ----------
let state = 'title';
let world = null;
let showCar = null;
let player = null;
let rivals = [];
let optRow = 0, pauseRow = 0;
let countdown = 0, countShown = 0, finishTime = 0, time = 0;

function setShowCar() {
  if (showCar) turntable.remove(showCar.group);
  showCar = buildCar(settings.vehicle, settings.driver);
  turntable.add(showCar.group);
}

function loadWorld() {
  if (world && world.def === TRACKS[settings.track]) return;
  if (world) {
    raceScene.remove(world.group);
    world.dispose();
  }
  world = buildWorld(TRACKS[settings.track]);
  raceScene.add(world.group);
  daySky.set(world.def.sky);
  updateSky(0);
}

// ---------- day and night ----------
const DAY_LENGTH = 150; // seconds for a full day and night
const daySky = new THREE.Color(), nightSky = new THREE.Color(0x0c1642), duskSky = new THREE.Color(0xff9d5c);
const dayLight = new THREE.Color(0xffffff), nightLight = new THREE.Color(0x9db4ff);
let clock = 0.12; // 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
function updateSky(dt) {
  if (settings.sky === 'day') clock = 0.2;
  else if (settings.sky === 'night') clock = 0.75;
  else clock = (clock + dt / DAY_LENGTH) % 1;
  // Daytime takes up about two thirds of the cycle.
  const a = clock < 0.62 ? (clock / 0.62) * Math.PI : Math.PI + ((clock - 0.62) / 0.38) * Math.PI;
  const h = Math.sin(a);
  const day = Math.max(0, Math.min(1, (h + 0.12) / 0.3));
  const dusk = Math.max(0, 1 - Math.abs(h) / 0.3);
  const sky = raceScene.background;
  sky.copy(nightSky).lerp(daySky, day).lerp(duskSky, dusk * 0.55);
  raceScene.fog.color.copy(sky);
  raceLights.hemi.intensity = 0.6 + 0.9 * day;
  raceLights.sun.intensity = 0.35 + 1.25 * day;
  raceLights.sun.color.copy(nightLight).lerp(dayLight, day);
  const c = world.center;
  world.sun.position.set(c.x + Math.cos(a) * 480, h * 330, c.z - 380);
  world.moon.position.set(c.x - Math.cos(a) * 480, -h * 330, c.z - 380);
  world.stars.material.opacity = 1 - day;
  world.stars.visible = day < 1;
  beamMat.opacity = (1 - day) * 0.35;
}

function placeOnTrack(car) {
  const N = world.N;
  const i = ((Math.floor(car.prog) % N) + N) % N;
  const j = (i + 1) % N;
  const f = car.prog - Math.floor(car.prog);
  const x = world.px[i] + (world.px[j] - world.px[i]) * f;
  const z = world.pz[i] + (world.pz[j] - world.pz[i]) * f;
  const tx = world.tx[i] + (world.tx[j] - world.tx[i]) * f;
  const tz = world.tz[i] + (world.tz[j] - world.tz[i]) * f;
  car.x = x + tz * car.lane;
  car.z = z - tx * car.lane;
  car.h = Math.atan2(tx, tz);
}

function newCar(vehicleIdx, driverIdx, prog, lane) {
  const car = buildCar(vehicleIdx, driverIdx);
  Object.assign(car, { prog, lane, x: 0, z: 0, h: 0, speed: 0, idx: 0, y: 0, vy: 0, spin: 0 });
  placeOnTrack(car);
  car.idx = world.locate(car.x, car.z, -1);
  raceScene.add(car.group);
  return car;
}

function setupRace() {
  loadWorld();
  if (player) raceScene.remove(player.group);
  for (const r of rivals) raceScene.remove(r.group);
  rivals = [];
  player = newCar(settings.vehicle, settings.driver, -14, -3.5);
  if (settings.friends) {
    const grid = [[-7, 3.5], [-21, 3.5], [-28, -3.5]];
    grid.forEach(([prog, lane], k) => {
      const v = (settings.vehicle + 1 + k) % VEHICLES.length;
      const d = (settings.driver + 1 + k) % DRIVERS.length;
      const r = newCar(v, d, prog, lane);
      r.pace = 0.8 + k * 0.05;
      r.wob = k * 2.1;
      r.baseLane = lane;
      rivals.push(r);
    });
  }
  syncCar(player, 0);
  rivals.forEach((r) => syncCar(r, 0));
  snapNext = true;
}

function syncCar(car, dt) {
  car.group.position.set(car.x, 0.1 + car.y, car.z);
  car.group.rotation.y = car.h;
  car.shadow.position.y = 0.06 - car.y;
  car.spin += (car.speed * dt);
  for (const w of car.wheels) w.g.rotation.x = car.spin / w.r;
  car.body.position.y = Math.abs(car.speed) > 1 ? Math.sin(time * 22 + car.x) * 0.025 : 0;
  flashLights(car);
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function flashLights(car) {
  if (!car.flash) return;
  const on = Math.floor(time * 4) % 2;
  car.flash[0].scale.y = on ? 0.4 : 0.14;
  car.flash[1].scale.y = on ? 0.14 : 0.4;
}

function honk() {
  if (player && player.def.id === 'police') audio.siren();
  else audio.horn();
  if (player && player.y === 0) player.vy = 7;
}

// ---------- driving ----------
function updatePlayer(dt, auto) {
  const p = player, N = world.N;
  const top = TOP_SPEED * settings.speed * p.def.speed;
  let steer = auto ? 0 : input.steer;
  let gas = auto ? 0.6 : settings.autoGo ? 1 : input.gas;
  const brake = auto ? 0 : input.brake;

  const off0 = (p.x - world.px[p.idx]) * world.tz[p.idx] - (p.z - world.pz[p.idx]) * world.tx[p.idx];
  let target = gas * top;
  if (Math.abs(off0) > HALF) target *= 0.75;
  if (brake > 0.1) target = settings.autoGo || p.speed > 0.5 ? 0 : -8 * brake;
  const rate = target > p.speed ? 14 : brake > 0.1 ? 40 : 12;
  p.speed += Math.max(-rate * dt, Math.min(rate * dt, target - p.speed));

  // Stick steering. Turning right lowers the heading angle.
  const grip = Math.max(-1, Math.min(1, p.speed / 8));
  p.h -= steer * 1.9 * dt * grip;

  // Steering help aims at the middle of the road a little way ahead.
  const help = auto ? 2 : settings.help;
  if (help > 0 && p.speed > 0.5) {
    const a = (p.idx + 12 + Math.floor(Math.abs(p.speed) * 0.4)) % N;
    const want = Math.atan2(world.px[a] - p.x, world.pz[a] - p.z);
    const k = (help === 2 ? 3.2 : 1.3) * (1 - 0.65 * Math.abs(steer));
    p.h += wrapAngle(want - p.h) * Math.min(1, k * dt);
  }

  p.x += Math.sin(p.h) * p.speed * dt;
  p.z += Math.cos(p.h) * p.speed * dt;

  // Friendly bumps with the other cars.
  for (const r of rivals) {
    const dx = p.x - r.x, dz = p.z - r.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.6 && d > 0.01) {
      const push = (3.6 - d) * 0.5;
      p.x += (dx / d) * push;
      p.z += (dz / d) * push;
    }
  }

  const prev = p.idx;
  p.idx = world.locate(p.x, p.z, p.idx);
  let d = p.idx - prev;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  p.prog += d;

  // Soft walls: slide along the edge instead of stopping.
  const i = p.idx;
  const off = (p.x - world.px[i]) * world.tz[i] - (p.z - world.pz[i]) * world.tx[i];
  if (Math.abs(off) > WALL) {
    const over = off - Math.sign(off) * WALL;
    p.x -= world.tz[i] * over;
    p.z += world.tx[i] * over;
    const along = Math.atan2(world.tx[i], world.tz[i]);
    const facing = Math.cos(wrapAngle(p.h - along)) >= 0 ? along : along + Math.PI;
    p.h += wrapAngle(facing - p.h) * Math.min(1, 5 * dt);
    p.speed *= 1 - Math.min(1, 1.2 * dt);
  }

  if (p.y > 0 || p.vy > 0) {
    p.vy -= 24 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; }
  }
  syncCar(p, dt);
}

function updateRivals(dt) {
  const N = world.N;
  const goal = N * settings.laps;
  const top = TOP_SPEED * settings.speed;
  for (const r of rivals) {
    const gap = r.prog - player.prog;
    let pace = r.pace;
    if (gap > 50) pace = 0.5;
    else if (gap > 20) pace *= 0.85;
    else if (gap < -60) pace = 1.15;
    else if (gap < -25) pace = 1.0;
    // Friends always let the player cross the line first.
    if (state === 'race' && gap > 0 && goal - r.prog < 120) pace = Math.min(pace, 0.35);
    const target = top * pace;
    r.speed += Math.max(-10 * dt, Math.min(10 * dt, target - r.speed));
    r.prog += (r.speed * dt) / world.segLen;
    if (state === 'race' && r.prog > goal - 6) { r.prog = goal - 6; r.speed = 0; }
    r.lane = r.baseLane + Math.sin(time * 0.5 + r.wob) * 1.5;
    placeOnTrack(r);
    syncCar(r, dt);
  }
}

// ---------- camera ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
function chaseTargets() {
  const p = player;
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  wantPos.set(p.x - fx * 9, 5, p.z - fz * 9);
  wantLook.set(p.x + fx * 5, 1.8, p.z + fz * 5);
}
let snapNext = true;
function updateCamera(dt) {
  if (state === 'track' || state === 'options') {
    const a = time * 0.15;
    const r = world.radius * 1.2;
    wantPos.set(world.center.x + Math.cos(a) * r, world.radius * 1.5, world.center.z + Math.sin(a) * r);
    wantLook.copy(world.center);
  } else if (state === 'finish') {
    const a = player.h + Math.PI + (time - finishTime) * 0.6;
    wantPos.set(player.x + Math.sin(a) * 12, 5, player.z + Math.cos(a) * 12);
    wantLook.set(player.x, 2, player.z);
  } else if (inShowroom()) {
    const s = showCar.seat.y;
    if (state === 'driver') { wantPos.set(0, s + 2.6, 7.5); wantLook.set(0, s - 0.5, 0); }
    else { wantPos.set(0, 4.2, 11.5); wantLook.set(0, 1.5, 0); }
  } else {
    chaseTargets();
  }
  const k = snapNext ? 1 : 1 - Math.exp(-dt * (inShowroom() ? 4 : 6));
  snapNext = false;
  camPos.lerp(wantPos, k);
  camLook.lerp(wantLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}
function inShowroom() {
  return state === 'title' || state === 'vehicle' || state === 'driver';
}

// ---------- screens ----------
const ui = document.getElementById('ui');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const dots = (n, cur) => `<div class="dots">${Array.from({ length: n }, (_, i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('')}</div>`;

function picker(heading, name, n, cur) {
  return `<div class="top">${heading}</div>
    <button class="arrow left" data-act="left">◀</button>
    <button class="arrow right" data-act="right">▶</button>
    <div class="bottom"><div class="name">${esc(name)}</div>${dots(n, cur)}
    <div class="row"><button class="small" data-act="back">◀ Back</button><button class="go" data-act="ok">OK ✔</button></div></div>`;
}

function render() {
  let h = '';
  if (state === 'title') {
    h = `<div class="title"><h1>${PLAYER_NAME}<br>Racers</h1></div>
      <div class="bottom"><button class="go big" data-act="ok">▶ PLAY</button></div>`;
  } else if (state === 'vehicle') {
    h = picker('Pick your ride!', VEHICLES[settings.vehicle].name, VEHICLES.length, settings.vehicle);
  } else if (state === 'driver') {
    h = picker('Who is driving?', DRIVERS[settings.driver].name, DRIVERS.length, settings.driver);
  } else if (state === 'track') {
    h = `<div class="top">Where shall we race?</div>
      <button class="arrow left" data-act="left">◀</button>
      <button class="arrow right" data-act="right">▶</button>
      <button class="corner" data-act="opt">⚙ Options</button>
      <div class="bottom"><div class="name">${esc(TRACKS[settings.track].name)}</div>${dots(TRACKS.length, settings.track)}
      <div class="row"><button class="small" data-act="back">◀ Back</button><button class="go" data-act="ok">GO! 🏁</button></div></div>`;
  } else if (state === 'options') {
    h = `<div class="panel"><h2>Options</h2>${OPTIONS.map((o, i) => `
      <div class="opt ${i === optRow ? 'sel' : ''}" data-row="${i}">
        <span>${o.label}</span><b><button data-row="${i}" data-act="left">◀</button>
        <em>${o.show(settings[o.key])}</em><button data-row="${i}" data-act="right">▶</button></b></div>`).join('')}
      <button class="go" data-act="back">Done ✔</button></div>`;
  } else if (state === 'countdown') {
    h = hud() + `<div class="count" id="count"></div>`;
  } else if (state === 'race') {
    h = hud();
  } else if (state === 'paused') {
    const items = ['▶ Keep going', '↺ Start again', '⌂ Menu'];
    h = `<div class="panel"><h2>Paused</h2>${items.map((t, i) =>
      `<button class="item ${i === pauseRow ? 'sel' : ''}" data-pick="${i}">${t}</button>`).join('')}</div>`;
  } else if (state === 'finish') {
    h = `<div class="confetti">${Array.from({ length: 60 }, (_, i) =>
      `<i style="left:${(i * 37) % 100}%;background:hsl(${(i * 47) % 360} 90% 60%);animation-delay:${-((i * 0.37) % 3)}s;animation-duration:${2.2 + (i % 5) * 0.4}s"></i>`).join('')}</div>
      <div class="title"><h1>🏆<br>Yay ${PLAYER_NAME}!</h1></div>
      <div class="bottom"><div class="row"><button class="small" data-act="back">⌂ Menu</button><button class="go" data-act="ok">Again! 🏁</button></div></div>`;
  }
  ui.innerHTML = h;
  updateHud();
}

function hud() {
  return `<div class="lap" id="lap"></div><button class="corner" data-act="pause">❚❚</button>
    <button class="horn" data-act="horn">📣</button>`;
}
let lapShown = -1;
function updateHud() {
  const el = document.getElementById('lap');
  if (!el || !player) return;
  const lap = Math.min(settings.laps, Math.max(1, Math.floor(player.prog / world.N) + 1));
  if (el.dataset.lap !== String(lap)) {
    el.dataset.lap = String(lap);
    el.textContent = `🏁 ${lap} / ${settings.laps}`;
    if (lap > 1 && lap !== lapShown && state === 'race') audio.lapChime();
    lapShown = lap;
  }
}

const SMOOTH = { 'countdown>race': 1, 'race>paused': 1, 'paused>race': 1, 'race>finish': 1, 'title>vehicle': 1, 'vehicle>driver': 1, 'driver>vehicle': 1, 'vehicle>title': 1 };
function go(next) {
  if (!SMOOTH[state + '>' + next]) snapNext = true;
  state = next;
  render();
}

function startRace() {
  setupRace();
  lapShown = 1;
  countdown = 3.2;
  countShown = 0;
  go('countdown');
}

function cycle(key, n, dir) {
  settings[key] = (settings[key] + dir + n) % n;
  save();
  audio.blip();
}

// ---------- actions (from buttons, keys, gamepad) ----------
function act(a, row) {
  audio.initAudio();
  if (a === 'sysback') a = state === 'race' || state === 'countdown' ? 'pause' : 'back';
  const dir = a === 'left' ? -1 : a === 'right' ? 1 : 0;
  switch (state) {
    case 'title':
      if (a === 'ok' || a === 'pause') { audio.blip(); go('vehicle'); }
      break;
    case 'vehicle':
      if (dir) { cycle('vehicle', VEHICLES.length, dir); setShowCar(); render(); }
      else if (a === 'ok') { audio.blip(); go('driver'); }
      else if (a === 'back') go('title');
      break;
    case 'driver':
      if (dir) { cycle('driver', DRIVERS.length, dir); setShowCar(); render(); }
      else if (a === 'ok') { audio.blip(); setupRace(); go('track'); }
      else if (a === 'back') go('vehicle');
      break;
    case 'track':
      if (dir) { cycle('track', TRACKS.length, dir); setupRace(); render(); }
      else if (a === 'ok' || a === 'pause') startRace();
      else if (a === 'back') go('driver');
      else if (a === 'opt') { optRow = 0; go('options'); }
      break;
    case 'options':
      if (row !== undefined) optRow = row;
      if (a === 'up') optRow = (optRow + OPTIONS.length - 1) % OPTIONS.length;
      else if (a === 'down') optRow = (optRow + 1) % OPTIONS.length;
      else if (dir) {
        const o = OPTIONS[optRow];
        const i = o.values.indexOf(settings[o.key]);
        settings[o.key] = o.values[(i + dir + o.values.length) % o.values.length];
        save();
        audio.setSound(settings.sound);
        audio.blip();
      } else if (a === 'back' || a === 'ok' || a === 'opt' || a === 'pause') { setupRace(); go('track'); return; }
      render();
      break;
    case 'countdown':
      if (a === 'horn' || a === 'ok') honk();
      else if (a === 'pause') { setupRace(); go('track'); }
      break;
    case 'race':
      if (a === 'pause') { pauseRow = 0; audio.setEngine(0, false); go('paused'); }
      else if (a === 'horn' || (a === 'ok' && settings.autoGo)) honk();
      break;
    case 'paused':
      if (a === 'up') { pauseRow = (pauseRow + 2) % 3; render(); }
      else if (a === 'down') { pauseRow = (pauseRow + 1) % 3; render(); }
      else if (a === 'pause' || a === 'back') go('race');
      else if (a === 'ok') pick(pauseRow);
      break;
    case 'finish':
      if (time - finishTime < 2) break;
      if (a === 'ok') startRace();
      else if (a === 'back' || a === 'pause') { setupRace(); go('track'); }
      else if (a === 'horn') honk();
      break;
  }
}
function pick(i) {
  if (i === 0) go('race');
  else if (i === 1) startRace();
  else { setupRace(); go('track'); }
}
onAction((a) => act(a));

ui.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act],[data-pick]');
  if (!b) return;
  if (b.dataset.pick !== undefined) { audio.initAudio(); pick(+b.dataset.pick); return; }
  act(b.dataset.act, b.dataset.row !== undefined ? +b.dataset.row : undefined);
});
bindTouch(canvas);
canvas.addEventListener('pointerdown', () => audio.initAudio());

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (hidden) return;
  pollInput();

  if (state !== 'paused') {
    time += dt;
    if (!inShowroom()) updateSky(dt);
    if (inShowroom()) {
      turntable.rotation.y += dt * 0.7;
      flashLights(showCar);
    } else if (state === 'track' || state === 'options') {
      // Cars wait on the grid.
    } else if (state === 'countdown') {
      countdown -= dt;
      const n = Math.ceil(countdown - 0.2);
      if (n !== countShown) {
        countShown = n;
        const el = document.getElementById('count');
        if (el && n > 0) { el.textContent = String(n); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        if (n > 0) audio.beep(false);
      }
      audio.setEngine(0.1, true);
      if (player.y > 0 || player.vy > 0) {
        player.vy -= 24 * dt; player.y += player.vy * dt;
        if (player.y <= 0) { player.y = 0; player.vy = 0; }
        syncCar(player, 0);
      }
      if (countdown <= 0.2) {
        go('race');
        audio.beep(true);
        const el = document.createElement('div');
        el.className = 'count pop';
        el.textContent = 'GO!';
        ui.appendChild(el);
        setTimeout(() => el.remove(), 900);
      }
    } else if (state === 'race') {
      updatePlayer(dt, false);
      updateRivals(dt);
      updateHud();
      audio.setEngine(player.speed / TOP_SPEED, true);
      if (player.prog >= world.N * settings.laps) {
        finishTime = time;
        audio.setEngine(0, false);
        audio.fanfare();
        go('finish');
      }
    } else if (state === 'finish') {
      updatePlayer(dt, true);
      updateRivals(dt);
    }
    updateCamera(dt);
  }
  renderer.render(inShowroom() ? showScene : raceScene, camera);
}

// The Android shell calls this when the app goes to the background.
let hidden = false;
window.appPause = (p) => {
  hidden = !!p;
  audio.pauseAudio(hidden);
  clearInput();
  if (hidden && state === 'race') { pauseRow = 0; go('paused'); }
};
document.addEventListener('visibilitychange', () => window.appPause(document.hidden));

// Test hook: jump straight to a screen, e.g. index.html#race
window.__game = { act, settings, get state() { return state; }, get player() { return player; } };

setShowCar();
render();
camPos.set(0, 4.2, 11.5);
camLook.set(0, 1.5, 0);
requestAnimationFrame(frame);
