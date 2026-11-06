import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPlausibleMeasurementUnit';

// Broad real-world bounds, in grams for mass and centimetres for length.
// Try both printed units against the bounds using the number in the gap sentence.
const benchmarks: [string, string, number, number][] = [
  ['tennis ball', 'g or kg', 45, 70],
  ['chicken egg', 'g or kg', 35, 85],
  ['adult bicycle', 'g or kg', 7000, 25000],
  ['water in a full one-litre jug', 'g or kg', 950, 1050],
  ['new crayon', 'cm or m', 5, 16],
  ['classroom door', 'cm or m', 175, 240],
  ['skipping rope', 'cm or m', 150, 350],
  ['school bus', 'cm or m', 600, 1500],
];
const factor: Record<string, number> = { g: 1, kg: 1000, cm: 1, m: 100 };

function solveGap(sentence: string, prompt: string): string {
  const benchmark = benchmarks.find(([object]) => sentence.includes(object));
  const number = /\babout (\d+) ___\.$/.exec(sentence);
  const units = /\b(g or kg|cm or m)\b/.exec(prompt);
  if (!benchmark || !number || !units) throw new Error(`Cannot solve the printed gap: ${sentence}`);
  const [, expectedPair, low, high] = benchmark;
  expect(units[1]).toBe(expectedPair);
  const value = Number(number[1]);
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThanOrEqual(1000);
  const possible = units[1].split(' or ').filter(unit => {
    const size = value * factor[unit];
    return size >= low && size <= high;
  });
  expect(possible).toHaveLength(1);
  return possible[0];
}

it('solves each visible gap and keeps the two length responses in printed order', () => {
  const responses = new Set<string>();
  const doorUnits = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const lines = q.context ?? [];
      const paired = q.prompt.includes('cm or m');
      expect(lines).toHaveLength(paired ? 2 : 1);
      if (paired) {
        expect(lines[0]).toMatch(/^\(a\) /);
        expect(lines[1]).toMatch(/^\(b\) /);
      }
      const units = lines.map(line => solveGap(line, q.prompt));
      const expected = units.join(' ');
      expect(q.answer).toBe(expected);
      expect(q.workedSteps).toHaveLength(lines.length);
      expect(q.picture).toBeUndefined();
      responses.add(expected);
      lines.forEach((line, i) => {
        if (line.includes('classroom door')) doorUnits.add(units[i]);
      });
    }
  }
  expect(responses).toEqual(new Set(['g', 'kg', 'cm cm', 'cm m', 'm cm', 'm m']));
  expect(doorUnits).toEqual(new Set(['cm', 'm']));
});

it('reproduces the same item and varies the printed givens across a session', () => {
  const statements = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    statements.add((q.context ?? []).join('\n'));
  }
  expect(statements.size).toBeGreaterThanOrEqual(8);
});
