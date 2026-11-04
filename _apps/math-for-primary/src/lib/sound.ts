/** Small, locally synthesised game sounds. Audio starts only after interaction. */
let ctx: AudioContext | null = null;
const active = new Set<OscillatorNode>();
let lastTap = 0;

function audio(): AudioContext | null {
  try {
    if (!ctx || ctx.state === 'closed') {
      if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', peak = 0.07, end = freq) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start, osc = c.createOscillator(), gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(end, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  active.add(osc);
  osc.onended = () => { active.delete(osc); osc.disconnect(); gain.disconnect(); };
  osc.start(t); osc.stop(t + duration + 0.02);
}

const SOUNDS = {
  correct() { [659, 880, 1319].forEach((f, i) => tone(f, i * .075, .3, 'sine', .075)); },
  retry() { tone(392, 0, .19, 'sine', .045, 330); tone(440, .16, .2, 'sine', .035); },
  tap() { tone(520, 0, .075, 'sine', .025, 760); },
  hint() { [523, 784].forEach((f, i) => tone(f, i * .09, .23, 'triangle', .045)); },
  toggle() { tone(660, 0, .13); tone(880, .08, .2); },
  complete() {
    [523, 659, 784, 1047, 988, 1319].forEach((f, i) => tone(f, i * .12, .4, 'sine', .065));
    [523, 659, 784].forEach(f => tone(f, .75, .55, 'triangle', .025));
  },
};
export type SoundName = keyof typeof SOUNDS;
export function stopSounds(): void {
  for (const osc of active) { try { osc.stop(); } catch { /* Already finished. */ } }
  active.clear();
}
export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  if (name === 'tap') { const now = Date.now(); if (now - lastTap < 45) return; lastTap = now; }
  try { SOUNDS[name](); } catch { /* A device without audio must still be playable. */ }
}
