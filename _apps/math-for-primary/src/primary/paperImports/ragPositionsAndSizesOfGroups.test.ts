import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragPositionsAndSizesOfGroups';

const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

function readRow(q: Question) {
  const figure = q.picture;
  if (figure?.type !== 'paper' || figure.layout !== 'bars') throw Error('Missing card row');
  expect(figure.rows).toHaveLength(1);
  const cells = figure.rows[0].parts;
  expect(cells.length).toBeGreaterThanOrEqual(4);
  expect(cells.length).toBeLessThanOrEqual(6);
  expect(cells.every(cell => cell.size === 1)).toBe(true);
  const marks = cells.flatMap((cell, i) => cell.label.split('\n').filter(line => line === '1st').map(() => i));
  expect(marks).toEqual([cells.length - 1]);
  const counts = cells.map(cell => {
    expect(cell.label.replace(/1st|●|\s/g, '')).toBe('');
    const count = [...cell.label].filter(symbol => symbol === '●').length;
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(8);
    return count;
  });
  // Walk inward from the visible marker, one cell per position.
  return Array.from({ length: cells.length }, (_, offset) => counts[marks[0] - offset]);
}

it('solves all three prompts using only the marked row and the question text', () => {
  const seenRanks = new Set<string>();
  const seenSizes = new Set<number>();
  const seenPairs = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const counts = readRow(q);
      const byPlace = /^How many dots can you count on the (\w+) card\?$/.exec(q.prompt);
      const bySize = /^One card shows (\d+) dots\. What is its position\?$/.exec(q.prompt);
      if (byPlace) {
        const slot = ordinals.indexOf(byPlace[1]);
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThan(counts.length);
        expect(counts[slot]).not.toBe(counts[counts.length - 1 - slot]);
        expect(q.unit).toBe('dots');
        expect(q.answer).toBe(String(counts[slot]));
        seenSizes.add(counts[slot]);
      } else if (bySize) {
        const slots = counts.flatMap((size, i) => size === Number(bySize[1]) ? [i] : []);
        expect(slots).toHaveLength(1);
        expect(q.context).toContain('Write the position in words.');
        expect(q.answer).toBe(ordinals[slots[0]]);
        seenRanks.add(ordinals[slots[0]]);
      } else {
        expect(q.prompt).toBe('Which two cards have the same number of dots? Choose their positions.');
        const matches: string[][] = [];
        for (let i = 0; i < counts.length; i++) {
          for (let j = i + 1; j < counts.length; j++) {
            if (counts[i] === counts[j]) matches.push([ordinals[i], ordinals[j]]);
          }
        }
        expect(matches).toHaveLength(1);
        const [a, b] = matches[0];
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw Error('Missing position selectors');
        expect(spec.options).toEqual(ordinals.slice(0, counts.length));
        expect(JSON.parse(q.answer).sort()).toEqual([a, b].sort());
        const grade = (values: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(values));
        expect(grade([a, b])).toBe(true);
        expect(grade([b, a])).toBe(true);
        expect(grade([a, a])).toBe(false);
        const other = spec.options.find(word => word !== a && word !== b)!;
        expect(grade([a, other])).toBe(false);
        seenPairs.add(matches[0].join(' '));
      }
    }
  }
  expect(seenSizes.size).toBeGreaterThan(3);
  expect(seenRanks.size).toBeGreaterThan(2);
  expect(seenPairs.size).toBeGreaterThan(2);
});

it('keeps the two independent lookup tasks together on the same reproducible row', () => {
  const layouts = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    for (const start of [0, 3, 6]) {
      const questions = [start, start + 1, start + 2].map(index => makeRagQuestion(seed, index));
      const a = questions.findIndex(q => q.prompt.startsWith('How many dots'));
      const b = questions.findIndex(q => q.prompt.startsWith('One card shows'));
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(Math.abs(a - b)).toBe(1);
      expect(questions[a].picture).toEqual(questions[b].picture);
      expect(questions[a].key).not.toBe(questions[b].key);
      expect(questions[a]).toEqual(makeRagQuestion(seed, start + a));
      layouts.add(JSON.stringify(questions[a].picture));
    }
  }
  expect(layouts.size).toBeGreaterThan(24);
});
