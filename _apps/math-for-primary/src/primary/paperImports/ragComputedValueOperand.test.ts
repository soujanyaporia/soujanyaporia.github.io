import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragComputedValueOperand';

const p2Tables = [2, 3, 4, 5, 10];

// Interpret the printed equation and try whole numbers in its square.
// The solver never reads the answer, proof, hint or worked steps.
function readEquation(display: string) {
  const sum = /^□ × (\d+) = (\d+) \+ (\d+) \+ (\d+)$/.exec(display);
  if (sum) {
    const [size, first, second, third] = sum.slice(1).map(Number);
    expect(p2Tables).toContain(size);
    expect(second).toBe(size);
    expect(third).toBe(size);
    expect(first).toBeGreaterThan(size);
    expect(first + second + third).toBeLessThanOrEqual(10 * size);
    return { kind: 'sum', fits: (box: number) => box * size === first + second + third };
  }

  const groups = /^(\d+) groups of (\d+) = □ × (\d+)$/.exec(display);
  if (groups) {
    const [count, size, newSize] = groups.slice(1).map(Number);
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(10);
    expect(p2Tables).toContain(size);
    expect(p2Tables).toContain(newSize);
    expect(newSize).not.toBe(size);
    expect(count * size).toBeLessThanOrEqual(10 * newSize);
    return { kind: 'regroup', fits: (box: number) => count * size === box * newSize };
  }

  const division = /^(\d+) × (\d+) = □ ÷ (\d+)$/.exec(display);
  if (division) {
    const [a, b, divisor] = division.slice(1).map(Number);
    expect(p2Tables).toContain(a);
    expect(p2Tables).toContain(divisor);
    expect(a * b).toBeGreaterThanOrEqual(2);
    expect(a * b).toBeLessThanOrEqual(10);
    return { kind: 'dividend', fits: (box: number) => a * b === box / divisor };
  }

  const places = /^\((\d+) tens and (\d+) ones\) \+ □ = (\d+)$/.exec(display);
  if (places) {
    const [tens, ones, total] = places.slice(1).map(Number);
    expect(tens).toBeGreaterThanOrEqual(10);
    expect(tens).toBeLessThan(100);
    expect(ones).toBeLessThan(10);
    expect(total).toBeLessThan(1000);
    const known = 10 * tens + ones;
    expect(Math.floor(total / 100)).toBe(Math.floor(known / 100) + 1);
    return { kind: 'place', fits: (box: number) => known + box === total };
  }
  throw new Error(`Unrecognised equation: ${display}`);
}

it('has one solution from the visible givens and the right response mode for every form', () => {
  for (let seed = -12; seed <= 36; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const item = makeRagQuestion(seed, index);
      const { kind, fits } = readEquation(item.display ?? '');
      forms.add(kind);
      const solutions: string[] = [];
      for (let box = 0; box <= 999; box++) {
        if (fits(box)) solutions.push(String(box));
      }
      expect(solutions).toHaveLength(1);
      expect(item.answer).toBe(solutions[0]);
      expect(item.unit).toBeUndefined();
      expect(item.picture).toBeUndefined();
      expect(item.numberSentence).toBeUndefined();
      if (kind === 'place') {
        expect(item.choices).toBeUndefined();
      } else {
        const choices = item.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices.filter(value => fits(Number(value)))).toEqual(solutions);
      }
    }
    expect([...forms].sort()).toEqual(['dividend', 'place', 'regroup', 'sum']);
  }
});

it('reproduces the same item and varies the visible numbers within each form', () => {
  const displays = new Map<string, Set<string>>();
  for (let seed = 0; seed < 32; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const item = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(item);
      const display = item.display ?? '';
      const { kind } = readEquation(display);
      const seen = displays.get(kind) ?? new Set<string>();
      seen.add(display);
      displays.set(kind, seen);
    }
  }
  expect(displays.size).toBe(4);
  for (const seen of displays.values()) expect(seen.size).toBeGreaterThan(3);
});
