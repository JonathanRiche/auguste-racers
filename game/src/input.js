// One input state fed by: the Android shell (gamepad), the browser Gamepad
// API, the keyboard and touch. Menus listen for actions; driving reads state.
const NATIVE = /[?&]native=1/.test(location.search);

export const input = { steer: 0, gas: 0, brake: 0 };

let handler = () => {};
export function onAction(fn) { handler = fn; }
function fire(name) { handler(name); }

const held = new Set();       // named buttons currently down (any source)
const keys = new Set();       // keyboard
const pad = { x: 0, y: 0, hx: 0, hy: 0, gas: 0, brake: 0 };
const nav = { left: false, right: false, up: false, down: false };
const touch = new Map();      // pointerId -> -1 | 1

// Button name -> menu action fired when it goes down.
const ACTIONS = {
  a: 'ok', b: 'back', x: 'horn', y: 'opt', start: 'pause', select: 'pause', back: 'sysback',
  l1: 'horn', r1: 'horn', l3: 'horn', r3: 'horn',
};

function button(name, down) {
  if (down) {
    if (held.has(name)) return;
    held.add(name);
    if (ACTIONS[name]) fire(ACTIONS[name]);
  } else {
    held.delete(name);
  }
}

// Stick or d-pad pushed far enough counts as a menu press, once per push.
function updateNav() {
  const x = Math.abs(pad.x) > Math.abs(pad.hx) ? pad.x : pad.hx;
  const y = Math.abs(pad.y) > Math.abs(pad.hy) ? pad.y : pad.hy;
  const now = {
    left: x < -0.6 || held.has('left'), right: x > 0.6 || held.has('right'),
    up: y < -0.6 || held.has('up'), down: y > 0.6 || held.has('down'),
  };
  for (const k in now) {
    if (now[k] && !nav[k]) fire(k);
    nav[k] = now[k];
  }
}

// Called by the Android shell.
window.padAxes = (x, y, hx, hy, gas, brake) => {
  pad.x = x; pad.y = y; pad.hx = hx; pad.hy = hy; pad.gas = gas; pad.brake = brake;
  updateNav();
};
window.padKey = (name, down) => {
  button(name, !!down);
  updateNav();
};

const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
  Enter: 'a', ' ': 'a', Escape: 'start', Backspace: 'b', h: 'x', o: 'y', p: 'start',
};
addEventListener('keydown', (e) => {
  const n = KEYMAP[e.key];
  if (!n) return;
  e.preventDefault();
  keys.add(e.key);
  button(n, true);
  updateNav();
});
addEventListener('keyup', (e) => {
  const n = KEYMAP[e.key];
  if (!n) return;
  keys.delete(e.key);
  button(n, false);
  updateNav();
});

const STD = ['a', 'b', 'x', 'y', 'l1', 'r1', null, null, 'select', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right'];
const webHeld = new Set();
function pollWebGamepad() {
  if (NATIVE || !navigator.getGamepads) return;
  let gp = null;
  for (const g of navigator.getGamepads()) if (g && g.connected) { gp = g; break; }
  if (!gp) return;
  const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
  pad.x = dz(gp.axes[0] || 0);
  pad.y = dz(gp.axes[1] || 0);
  pad.brake = gp.buttons[6] ? gp.buttons[6].value : 0;
  pad.gas = gp.buttons[7] ? gp.buttons[7].value : 0;
  STD.forEach((name, i) => {
    if (!name || !gp.buttons[i]) return;
    const down = gp.buttons[i].pressed;
    if (down !== webHeld.has(name)) {
      if (down) webHeld.add(name); else webHeld.delete(name);
      button(name, down);
    }
  });
  updateNav();
}

// Touch: hold the left or right half of the screen to steer.
export function bindTouch(el) {
  const set = (e) => touch.set(e.pointerId, e.clientX < innerWidth / 2 ? -1 : 1);
  el.addEventListener('pointerdown', set);
  el.addEventListener('pointermove', (e) => { if (touch.has(e.pointerId)) set(e); });
  const end = (e) => touch.delete(e.pointerId);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
}

export function clearInput() {
  held.clear(); keys.clear(); touch.clear(); webHeld.clear();
  pad.x = pad.y = pad.hx = pad.hy = pad.gas = pad.brake = 0;
  for (const k in nav) nav[k] = false;
}

export function pollInput() {
  pollWebGamepad();
  let s = pad.x + pad.hx;
  if (held.has('left')) s -= 1;
  if (held.has('right')) s += 1;
  let t = 0;
  for (const v of touch.values()) t += v;
  s += Math.max(-1, Math.min(1, t));
  input.steer = Math.max(-1, Math.min(1, s));
  input.gas = Math.max(pad.gas, held.has('a') || held.has('r2') || held.has('up') || touch.size ? 1 : 0);
  input.brake = Math.max(pad.brake, held.has('b') || held.has('l2') || held.has('down') ? 1 : 0);
}
