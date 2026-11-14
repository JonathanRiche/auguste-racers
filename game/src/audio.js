// All sounds are synthesised, so there are no audio files to ship.
let ctx = null, master = null, engGain = null, osc1 = null, osc2 = null;
let soundOn = true;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended' && !paused) ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch (e) {
    return;
  }
  master = ctx.createGain();
  master.gain.value = soundOn ? 0.8 : 0;
  master.connect(ctx.destination);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 700;
  engGain = ctx.createGain();
  engGain.gain.value = 0;
  filt.connect(engGain);
  engGain.connect(master);
  osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc1.connect(filt);
  osc2.connect(filt);
  osc1.start();
  osc2.start();
}

let paused = false;
export function pauseAudio(p) {
  paused = p;
  if (!ctx) return;
  if (p) ctx.suspend();
  else ctx.resume();
}

export function setSound(on) {
  soundOn = on;
  if (master) master.gain.value = on ? 0.8 : 0;
}

// speed is 0..1 of top speed; on = engine audible.
export function setEngine(speed, on) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const f = 55 + Math.abs(speed) * 110;
  osc1.frequency.setTargetAtTime(f, t, 0.08);
  osc2.frequency.setTargetAtTime(f * 0.502, t, 0.08);
  engGain.gain.setTargetAtTime(on ? 0.05 + Math.abs(speed) * 0.05 : 0, t, 0.1);
}

function tone(freq, start, dur, type = 'square', vol = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.setValueAtTime(vol, t + dur - 0.04);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function horn() {
  tone(392, 0, 0.14, 'square', 0.12);
  tone(494, 0, 0.14, 'square', 0.12);
  tone(392, 0.18, 0.26, 'square', 0.12);
  tone(494, 0.18, 0.26, 'square', 0.12);
}
export function siren() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    o.frequency.setValueAtTime(620, t + i * 0.5);
    o.frequency.linearRampToValueAtTime(980, t + i * 0.5 + 0.25);
    o.frequency.linearRampToValueAtTime(620, t + i * 0.5 + 0.5);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.1, t + 0.03);
  g.gain.setValueAtTime(0.1, t + 1.45);
  g.gain.linearRampToValueAtTime(0, t + 1.5);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 1.55);
}
export function blip() {
  tone(660, 0, 0.07, 'triangle', 0.2);
}
export function beep(high) {
  tone(high ? 880 : 440, 0, high ? 0.5 : 0.2, 'triangle', 0.25);
}
export function lapChime() {
  tone(659, 0, 0.12, 'triangle', 0.22);
  tone(880, 0.12, 0.2, 'triangle', 0.22);
}
export function fanfare() {
  const notes = [523, 659, 784, 1047, 784, 1047];
  const times = [0, 0.15, 0.3, 0.45, 0.7, 0.85];
  notes.forEach((n, i) => tone(n, times[i], i === 5 ? 0.6 : 0.16, 'triangle', 0.25));
}
