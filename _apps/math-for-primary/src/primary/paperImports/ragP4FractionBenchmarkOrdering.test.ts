import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP4FractionBenchmarkOrdering';

function readCard(label: string) {
  const match = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(label);
  if (!match) throw new Error(`Unreadable fraction: ${label}`);
  const whole = Number(match[1] ?? 0);
  const n = Number(match[2]);
  const d = Number(match[3]);
  expect(d).toBeGreaterThanOrEqual(2);
  expect(d).toBeLessThanOrEqual(12);
  expect(n).toBeGreaterThan(0);
  if (whole) expect(n).toBeLessThan(d);
  return { n: whole * d + n, d };
}

function compare(a: string, b: string): number {
  const x = readCard(a);
  const y = readCard(b);
  return x.n * y.d - y.n * x.d;
}

function wholePart(label: string): number {
  const f = readCard(label);
  return Math.floor(f.n / f.d);
}

it('solves each visible task and checks the pupil response in both directions', () => {
  for (let seed = -5; seed <= 45; seed++) {
    const seen = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.order) {
        const ascending = q.prompt.includes('smallest to largest');
        if (!ascending) expect(q.prompt).toContain('largest to smallest');
        expect(q.order).toHaveLength(3);
        const ranked = [...q.order].sort((a, b) => ascending ? compare(a, b) : compare(b, a));
        expect(compare(ranked[0], ranked[1])).not.toBe(0);
        expect(compare(ranked[1], ranked[2])).not.toBe(0);
        if (ascending) {
          const mixed = ranked.filter(s => s.includes(' '));
          const improper = ranked.filter(s => !s.includes(' ') && wholePart(s) >= 1);
          expect(mixed).toHaveLength(1);
          expect(improper).toHaveLength(1);
          expect(wholePart(improper[0])).toBe(wholePart(mixed[0]));
          expect(wholePart(ranked[0])).toBe(0);
        } else {
          const fractions = ranked.map(readCard);
          expect(fractions.every(f => f.n < f.d)).toBe(true);
          expect(new Set(fractions.map(f => f.d)).size).toBe(3);
          expect(new Set(fractions.map(f => f.n)).size).toBe(2);
        }
        expect(q.answer).toBe(ranked.join(','));
        expect(correctAnswer(q, ranked.join(','))).toBe(true);
        expect(correctAnswer(q, [...ranked].reverse().join(','))).toBe(false);
        expect(correctAnswer(q, ranked.slice(1).join(','))).toBe(false);
        seen.add(ascending ? 'mixed ascending' : 'proper descending');
      } else {
        const target = q.prompt.match(/(less|greater) than (\d+\/\d+)/);
        if (!target) throw new Error('Missing comparison or benchmark');
        const below = target[1] === 'less';
        const options = q.structuredResponse?.kind === 'named-pair' ? q.structuredResponse.options : q.choices;
        if (!options) throw new Error('Missing fraction choices');
        expect(options).toHaveLength(4);
        const fractions = options.map(readCard);
        expect(fractions.every(f => f.n < f.d)).toBe(true);
        expect(new Set(fractions.map(f => f.n / f.d)).size).toBe(4);
        const equal = options.filter(s => compare(s, target[2]) === 0);
        expect(equal).toHaveLength(1);
        const selected = options.filter(s => below ? compare(s, target[2]) < 0 : compare(s, target[2]) > 0);
        expect(selected).toHaveLength(below ? 2 : 1);
        if (below) {
          expect(q.structuredResponse?.kind).toBe('named-pair');
          expect((JSON.parse(q.answer) as string[]).sort()).toEqual([...selected].sort());
          for (const pair of [selected, [...selected].reverse()]) {
            expect(correctAnswer(q, JSON.stringify(pair))).toBe(true);
          }
          for (const pair of [[equal[0], selected[0]], [selected[0], selected[0]], selected.slice(1)]) {
            expect(correctAnswer(q, JSON.stringify(pair))).toBe(false);
          }
        } else {
          expect(q.choices).toEqual(options);
          expect(q.answer).toBe(selected[0]);
          for (const option of options) expect(correctAnswer(q, option)).toBe(selected.includes(option));
        }
        seen.add(below ? 'two below' : 'one above');
      }
    }
    expect(seen.size).toBe(4);
  }
});

it('reproduces a seed and index while varying the visible numbers across seeds', () => {
  const signatures = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    const q = makeRagQuestion(seed, 2);
    expect(makeRagQuestion(seed, 2)).toEqual(q);
    const cards = q.order ?? q.choices ?? (q.structuredResponse?.kind === 'named-pair' ? q.structuredResponse.options : []);
    signatures.add([...cards].sort().join(','));
  }
  expect(signatures.size).toBeGreaterThan(8);
});
