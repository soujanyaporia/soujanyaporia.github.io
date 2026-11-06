import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Picture } from '../Picture';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragSolidInventory';

function readModel(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw Error('Missing model');
  const svg = renderToStaticMarkup(createElement(Picture, { model: q.picture }));
  const paths = Array.from(svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g), m => m[1]);
  const counts: Record<string, number> = { cuboids: 0, cones: 0, cylinders: 0 };
  let sideways = 0;
  // Each closed outline is one physical piece. Open strokes show seams or rims.
  const pieces = paths.filter(d => /Z\s*$/i.test(d));
  for (const d of pieces) {
    const curves = (d.match(/Q/g) ?? []).length;
    if (!/[CQ]/.test(d) && d.includes('L') && d.includes('V')) counts.cuboids++;
    else if (d.includes('C') && d.includes('H')) { counts.cylinders++; sideways++; }
    else if (curves === 2 && d.includes('V')) counts.cylinders++;
    else if (curves === 1 && d.includes('L')) counts.cones++;
    else throw Error('Unrecognised piece outline: ' + d);
  }
  expect(paths.length - pieces.length).toBe(counts.cuboids + counts.cylinders);
  const given = q.context?.join(' ').match(/has (\d+) pieces/);
  expect(given).toBeTruthy();
  expect(pieces.length).toBe(Number(given![1]));
  expect(pieces.length).toBeGreaterThanOrEqual(4);
  expect(pieces.length).toBeLessThanOrEqual(7);
  return { counts, sideways };
}

it('solves every response from the visible outlines, total and requested types', () => {
  const modes = new Set<string>();
  let sawBothOrientations = false;
  for (let seed = 0; seed < 60; seed++) {
    for (let i = 0; i < 4; i++) {
      const q = makeRagQuestion(seed, i);
      const { counts, sideways } = readModel(q);
      sawBothOrientations ||= sideways > 0 && counts.cylinders > sideways;
      const fields = q.structuredResponse;
      if (fields?.kind === 'number-pair') {
        modes.add('pair');
        const targets = /^How many (\w+) and how many (\w+) are in the model\?$/.exec(q.prompt);
        expect(targets).toBeTruthy();
        const labels = targets!.slice(1);
        expect([fields.firstLabel, fields.secondLabel]).toEqual(labels);
        const values = labels.map(label => String(counts[label]));
        expect(q.answer).toBe(JSON.stringify(values));
        expect(correctAnswer(q, JSON.stringify(values))).toBe(true);
        expect(correctAnswer(q, JSON.stringify(values.slice(0, 1)))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([values[0], String(Number(values[1]) + 1)]))).toBe(false);
        if (values[0] !== values[1]) expect(correctAnswer(q, JSON.stringify([...values].reverse()))).toBe(false);
      } else if (fields?.kind === 'named-pair') {
        modes.add('names');
        const names = Object.keys(counts).filter(k => counts[k] > 0).map(k => k.slice(0, -1));
        expect(names).toHaveLength(2);
        expect(fields.options).toEqual(expect.arrayContaining(names));
        expect(correctAnswer(q, JSON.stringify(names))).toBe(true);
        expect(correctAnswer(q, JSON.stringify([...names].reverse()))).toBe(true);
        expect(correctAnswer(q, JSON.stringify([names[0], names[0]]))).toBe(false);
      } else {
        const compare = /^How many more (\w+) than (\w+) are in the model\?$/.exec(q.prompt);
        let expected: number;
        if (compare) {
          modes.add('difference');
          expected = counts[compare[1]] - counts[compare[2]];
          expect(expected).toBeGreaterThan(0);
        } else {
          modes.add('one');
          const target = /^How many (\w+) can you find in the model\?$/.exec(q.prompt);
          expect(target).toBeTruthy();
          expected = counts[target![1]];
        }
        expect(q.answer).toBe(String(expected));
        expect(correctAnswer(q, String(expected))).toBe(true);
        expect(correctAnswer(q, String(expected + 1))).toBe(false);
      }
    }
  }
  expect([...modes].sort()).toEqual(['difference', 'names', 'one', 'pair']);
  expect(sawBothOrientations).toBe(true);
});

it('repeats a seed and index exactly while varying the pictures across a session', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(23, index);
    expect(makeRagQuestion(23, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(8);
});
