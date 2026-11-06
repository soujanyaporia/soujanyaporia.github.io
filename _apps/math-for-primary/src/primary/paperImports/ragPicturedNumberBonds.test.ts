import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragPicturedNumberBonds';

const seeds = Array.from({ length: 64 }, (_, i) => i - 16);
const samples = seeds.flatMap(seed => [makeRagQuestion(seed), makeRagQuestion(seed, 1)]);

it('derives both entries from the pencils in the labelled trays and checks the stated whole', () => {
  const splits = new Set<string>();
  for (const q of samples) {
    const fields = q.structuredResponse;
    if (fields?.kind !== 'number-pair') continue;
    const pic = q.picture;
    if (pic?.type !== 'paper' || pic.layout !== 'cards') throw new Error('Missing tray picture');
    const heading = /^Whole: (\d+) pencils$/.exec(pic.heading ?? '');
    if (!heading) throw new Error('Missing visible whole');
    const whole = Number(heading[1]);
    expect(whole).toBeLessThanOrEqual(10);
    expect(pic.cards.map(card => card.label)).toEqual(['Tray A', 'Tray B']);
    expect([fields.firstLabel, fields.secondLabel]).toEqual(pic.cards.map(card => card.label));
    const counts = pic.cards.map(card => {
      if (card.icon !== 'pencil' || typeof card.count !== 'number') throw new Error('Missing pencil group');
      expect(Number.isInteger(card.count)).toBe(true);
      expect(card.count).toBeGreaterThan(0);
      return card.count;
    });
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(whole);
    const parts = counts.map(String);
    const response = JSON.stringify(parts);
    expect(q.answer).toBe(response);
    expect(structuredResponseCorrect(fields, q.answer, response)).toBe(true);
    expect(structuredResponseCorrect(fields, q.answer, JSON.stringify([parts[0]]))).toBe(false);
    expect(structuredResponseCorrect(fields, q.answer, JSON.stringify([...parts].reverse()))).toBe(false);
    expect(q.workedSteps?.at(-1)?.equation).toBe(`${parts.join(' + ')} = ${whole}`);
    splits.add(response);
  }
  expect(splits.size).toBeGreaterThan(3);
});

it('enumerates pairs of different visible numbers and accepts exactly the winning pair in either order', () => {
  const winningPairs = new Set<string>();
  for (const q of samples) {
    const selection = q.structuredResponse;
    if (selection?.kind !== 'named-pair') continue;
    const match = /add up to (\d+)\?/.exec(q.prompt);
    if (!match) throw new Error('Missing target in the question');
    const target = Number(match[1]);
    expect(target).toBe(10);
    const { options } = selection;
    expect(options).toHaveLength(5);
    expect(new Set(options).size).toBe(5);
    const solutions: string[][] = [];
    for (const [i, a] of options.entries()) {
      expect(a).toMatch(/^[1-9]$/);
      expect(structuredResponseCorrect(selection, q.answer, JSON.stringify([a, a]))).toBe(false);
      for (const b of options.slice(i + 1)) {
        const fits = Number(a) + Number(b) === target;
        if (fits) solutions.push([a, b]);
        for (const order of [[a, b], [b, a]]) {
          expect(structuredResponseCorrect(selection, q.answer, JSON.stringify(order))).toBe(fits);
        }
      }
    }
    expect(solutions).toHaveLength(1);
    const solution = solutions[0];
    if (!solution) throw new Error('No pair makes the visible target');
    const sorted = [...solution].sort();
    expect(JSON.parse(q.answer).sort()).toEqual(sorted);
    expect(structuredResponseCorrect(selection, q.answer, JSON.stringify([solution[0]]))).toBe(false);
    winningPairs.add(sorted.join('+'));
  }
  expect(winningPairs.size).toBeGreaterThan(1);
});

it('reproduces each question and gives both response tasks across consecutive indices', () => {
  for (const seed of seeds) {
    const first = makeRagQuestion(seed);
    const next = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    expect(makeRagQuestion(seed, 1)).toEqual(next);
    expect(next.key).not.toBe(first.key);
    expect([first.structuredResponse?.kind, next.structuredResponse?.kind].sort()).toEqual(['named-pair', 'number-pair']);
  }
});
