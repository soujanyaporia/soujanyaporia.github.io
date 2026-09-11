/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Every generator in the engine receives an `Rng` instead of calling
 * Math.random(), so any question can be reproduced from its seed and the
 * generators can be tested deterministically.
 */
export class Rng {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed || 0x9e3779b9;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] (inclusive). Returns min if the range is empty. */
  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty list');
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick using relative weights, e.g. [['a', 3], ['b', 1]]. */
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    if (total <= 0) return this.pick(items.map(([item]) => item));
    let roll = this.next() * total;
    for (const [item, w] of items) {
      roll -= Math.max(0, w);
      if (roll < 0) return item;
    }
    return items[items.length - 1][0];
  }

  /** Returns a shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** Derive an independent child stream (stable for a given salt). */
  fork(salt: string | number): Rng {
    return new Rng(hashString(`${this.seed}:${salt}`));
  }
}

/** FNV-1a 32-bit hash. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A fresh seed for live sessions (tests always pass explicit seeds). */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
