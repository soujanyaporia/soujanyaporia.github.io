import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4GreatestRiseOrDrop';

it('solves the question from the plotted readings and the direction and response requested in the prompt', () => {
  const positions = new Map<string, Set<number>>();
  const oppositeIsLarger = new Set<string>();
  for (let seed = -8; seed < 56; seed++) for (let index = 0; index < 4; index++) {
    const q = makeRagQuestion(seed, index);
    const p = q.picture;
    if (p?.type !== 'bars' || !p.line) throw new Error('A line graph is required');
    const { labels, values, scale } = p;
    expect(values).toHaveLength(6);
    expect(scale).toBeGreaterThan(0);
    expect(values.every(v => v > 0 && Number.isInteger(v / scale))).toBe(true);
    const monthly = q.prompt.includes('months'), hourly = q.prompt.includes('one-hour');
    const rise = /\brise\b/.test(q.prompt);
    expect(Number(rise) + Number(/\bfall\b/.test(q.prompt))).toBe(1);
    const kind = monthly ? 'months' : hourly ? 'hours' : rise ? 'litres-rise' : 'litres-fall';
    const axis = monthly ? 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
      : hourly ? Array.from({ length: 11 }, (_, i) => `${i + 1} pm`)
      : Array.from({ length: 6 }, (_, i) => `Day ${i + 1}`);
    const first = axis.indexOf(labels[0]);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(labels).toEqual(axis.slice(first, first + 6));

    // Read left to right, discarding segments going the wrong way before ranking distances.
    const eligible: { i: number; size: number }[] = [];
    let opposite = 0;
    for (let i = 0; i < labels.length - 1; i++) {
      const a = values[i], b = values[i + 1], size = Math.abs(a - b);
      if (rise ? b > a : b < a) eligible.push({ i, size });
      else opposite = Math.max(opposite, size);
    }
    eligible.sort((a, b) => b.size - a.size);
    expect(eligible.length).toBeGreaterThanOrEqual(2);
    const best = eligible[0];
    expect(best.size).toBeGreaterThan(eligible[1].size);
    if (!positions.has(kind)) positions.set(kind, new Set<number>());
    positions.get(kind)!.add(best.i);
    if (opposite > best.size) oppositeIsLarger.add(kind);
    const pair = labels.slice(best.i, best.i + 2);
    if (monthly) {
      expect(rise).toBe(false);
      expect(q.structuredResponse).toEqual({ kind: 'interval', labels });
      expect(q.choices).toBeUndefined();
      expect(JSON.parse(q.answer)).toEqual(pair);
    } else {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      const expected = hourly ? pair.join(' to ') : String(best.size);
      expect(q.choices).toContain(expected);
      expect(q.answer).toBe(expected);
      if (hourly) {
        expect(rise).toBe(false);
        const valid = labels.slice(1).map((end, i) => `${labels[i]} to ${end}`);
        expect(q.choices!.every(c => valid.includes(c))).toBe(true);
      } else {
        expect(q.unit).toBe('L');
        expect(q.prompt).toContain('litres');
      }
    }
  }
  expect([...positions.keys()].sort()).toEqual(['hours', 'litres-fall', 'litres-rise', 'months']);
  for (const observed of positions.values()) expect(observed.size).toBeGreaterThan(1);
  expect([...oppositeIsLarger].sort()).toEqual(['litres-fall', 'litres-rise', 'months']);
});

it('reproduces the same graph, choices and working for the same seed and index', () => {
  const first = makeRagQuestion(37, 5);
  makeRagQuestion(38, 6);
  expect(makeRagQuestion(37, 5)).toEqual(first);
});
