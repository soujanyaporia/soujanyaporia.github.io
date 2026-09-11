/**
 * Small, soft synthesised sounds (no audio files to load). Kept gentle on
 * purpose: feedback, not arcade noise.
 */
type Ctx = AudioContext;
let ctx: Ctx | null = null;

function audio(): Ctx | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', peak = 0.1) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const SOUNDS = {
  correct() {
    tone(659, 0, 0.16);
    tone(988, 0.09, 0.28);
  },
  retry() {
    tone(392, 0, 0.14, 'triangle', 0.06);
    tone(349, 0.1, 0.2, 'triangle', 0.05);
  },
  tap() {
    tone(560, 0, 0.05, 'sine', 0.03);
  },
  complete() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.32, 'sine', 0.09));
  },
};

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName, enabled: boolean): void {
  if (enabled) SOUNDS[name]();
}
