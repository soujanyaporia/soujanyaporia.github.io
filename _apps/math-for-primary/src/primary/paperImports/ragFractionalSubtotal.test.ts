import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragFractionalSubtotal';

const fractionsIn = (s: string) => Array.from(s.matchAll(/(\d+)\/(\d+)/g), m => ({ n: Number(m[1]), d: Number(m[2]) }));

it('finds the only legal three-card selection by testing subsets of the visible cards', () => {
  const hands = new Set<string>();
  const positions = new Set<string>();
  for (let seed = 0; seed < 64; seed++) for (let index = 0; index < 3; index++) {
    const q = makeRagQuestion(seed, index);
    if (!q.display) continue;
    const cards = fractionsIn(q.display);
    const targets = fractionsIn(q.prompt);
    expect(targets).toHaveLength(1);
    const target = targets[0];
    expect(target.n > 0 && target.n < target.d && target.d <= 12).toBe(true);
    expect(cards).toHaveLength(5);
    expect(new Set(cards.map(c => c.n)).size).toBe(5);
    expect(cards.every(c => c.d === target.d && c.n > 0 && c.n < c.d)).toBe(true);
    const solutions: number[][] = [];
    for (let mask = 0; mask < 2 ** cards.length; mask++) {
      const chosen = cards.filter((_, i) => (mask & (1 << i)) !== 0);
      if (chosen.length === 3 && chosen.reduce((s, c) => s + c.n, 0) === target.n) solutions.push(chosen.map(c => c.n));
    }
    expect(solutions).toHaveLength(1);
    const chosen = solutions[0];
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields') throw Error('Expected three fraction blanks');
    expect(spec.fields).toHaveLength(3);
    expect(spec.fields.every(field => field.label.endsWith(`□/${target.d}`))).toBe(true);
    const input = JSON.stringify(chosen.map(String));
    expect(JSON.parse(q.answer)).toEqual(chosen.map(String));
    expect(structuredResponseCorrect(spec, q.answer, input)).toBe(true);
    const decoy = cards.find(c => !chosen.includes(c.n))!;
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([decoy.n, ...chosen.slice(1)].map(String)))).toBe(false);
    hands.add(q.display);
    positions.add(cards.map(c => chosen.includes(c.n) ? '1' : '0').join(''));
  }
  expect(hands.size).toBeGreaterThan(8);
  expect(positions.size).toBeGreaterThan(3);
});

it('recovers both strip answers by counting pieces from the visible story', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 64; seed++) for (let index = 0; index < 3; index++) {
    const q = makeRagQuestion(seed, index);
    if (q.display) continue;
    const [kiteLine, usedLine] = q.context ?? [];
    const whole = Number(/(\d+) equal pieces/.exec(kiteLine)?.[1]);
    const [kite] = fractionsIn(kiteLine);
    const [used] = fractionsIn(usedLine);
    expect(whole >= 3 && whole <= 12).toBe(true);
    expect([kite.d, used.d]).toEqual([whole, whole]);
    expect(kite.n > 0 && kite.n < used.n && used.n < whole).toBe(true);
    // Lay out one piece per position: kite first, then flag up to the used total.
    const pieces = Array.from({ length: whole }, (_, i) => i < kite.n ? 'kite' : i < used.n ? 'flag' : 'left');
    const response = ['flag', 'left'].map(part => String(pieces.filter(p => p === part).length));
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields') throw Error('Both fractions need an answer blank');
    expect(spec.fields.map(f => f.label)).toEqual([`For the flag: □/${whole}`, `Left over: □/${whole}`]);
    expect(JSON.parse(q.answer)).toEqual(response);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(response))).toBe(true);
    // Subtracting only the kite from the whole would count the flag as unused.
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([response[0], String(whole - kite.n)]))).toBe(false);
    stories.add(kiteLine + usedLine);
  }
  expect(stories.size).toBeGreaterThan(8);
});

it('replays a seed and index and presents both tasks on consecutive indices', () => {
  for (const seed of [0, 1, 17, 94]) {
    const first = makeRagQuestion(seed);
    expect(first).toEqual(makeRagQuestion(seed, 0));
    expect(Boolean(makeRagQuestion(seed, 1).display)).not.toBe(Boolean(first.display));
  }
});
