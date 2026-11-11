// Tiny synthesised sound effects (no audio files). Starts on the first user gesture.

import type { Sfx } from './engine';

let ctx: AudioContext | null = null;
let last: Partial<Record<Sfx, number>> = {};

export function unlockAudio() {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

export function playSfx(s: Sfx, muted: boolean) {
  if (muted || !ctx) return;
  const now = performance.now();
  // do not stack the same sound many times in a few ms
  if (now - (last[s] ?? 0) < (s === 'hit' ? 60 : 30)) return;
  last[s] = now;
  switch (s) {
    case 'deploy': tone(330, 0.12, 'square', 0.06, 660); break;
    case 'hit': tone(180, 0.05, 'square', 0.035, 90); break;
    case 'kill': tone(520, 0.1, 'triangle', 0.05, 220); break;
    case 'skill': tone(440, 0.3, 'sawtooth', 0.06, 1100); break;
    case 'heal': tone(660, 0.14, 'sine', 0.05, 880); break;
    case 'react': tone(220, 0.25, 'sawtooth', 0.07, 880); break;
    case 'leak': tone(150, 0.3, 'square', 0.08, 70); break;
    case 'retreat': tone(500, 0.12, 'triangle', 0.05, 250); break;
    case 'win': tone(523, 0.15, 'square', 0.06); setTimeout(() => tone(659, 0.15, 'square', 0.06), 150); setTimeout(() => tone(784, 0.3, 'square', 0.06), 300); break;
    case 'lose': tone(300, 0.5, 'sawtooth', 0.07, 80); break;
  }
}
