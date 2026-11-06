import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Picture } from '../Picture';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragSolidSurfaceProperties';

function readFigures(q: Question) {
  if (!q.picture) throw Error('A picture of the choices is required');
  const html = renderToStaticMarkup(createElement(Picture, { model: q.picture }));
  // Use the accessible descriptions of the drawn figures and their printed labels.
  const figures = Array.from(html.matchAll(/aria-label="Object ([^":]+): ([a-z]+)"/g),
    ([, label, shape]) => ({ label, shape }));
  const captions = Array.from(html.matchAll(/<figcaption[^>]*>Object ([^<]+)<\/figcaption>/g), m => m[1]);
  expect(figures.map(o => o.label)).toEqual(captions);
  expect(new Set(captions).size).toBe(captions.length);
  return figures;
}

it('selects the complete set from the drawn solids and the property in the prompt', () => {
  const counts: Record<string, number> = { cube: 6, cuboid: 6, cylinder: 2, cone: 1, sphere: 0 };
  const curved = new Set(['sphere', 'cylinder', 'cone']);
  const modes = new Set<string>();
  const targets = new Set<number>();

  for (let seed = -2; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const figures = readFigures(q);
      const labels = figures.map(o => o.label);
      for (const o of figures) expect(counts[o.shape]).toBeDefined();

      if (q.prompt.includes('can roll')) {
        modes.add('roll');
        expect(figures).toHaveLength(4);
        const expected = figures.filter(o => curved.has(o.shape)).map(o => o.label);
        expect(expected).toHaveLength(2);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw Error('Expected two selectable labels');
        expect(spec.options).toEqual(labels);
        expect(JSON.parse(q.answer).sort()).toEqual([...expected].sort());
        for (const a of labels) {
          for (const b of labels) {
            expect(correctAnswer(q, JSON.stringify([a, b]))).toBe(a !== b && expected.includes(a) && expected.includes(b));
          }
        }
        expect(correctAnswer(q, JSON.stringify(expected.slice(0, 1)))).toBe(false);
        expect(correctAnswer(q, JSON.stringify(labels))).toBe(false);
        continue;
      }

      let matches: typeof figures;
      if (q.prompt.includes('flat part and a curved part')) {
        modes.add('both');
        expect(figures).toHaveLength(4);
        for (const label of labels) expect(label).toMatch(/^[A-D] \(.+\)$/);
        matches = figures.filter(o => curved.has(o.shape) && counts[o.shape] > 0);
      } else {
        modes.add('face-count');
        expect(figures).toHaveLength(3);
        const clue = /^Which solid has (?:exactly (\d+) flat faces?|no flat faces)\?$/.exec(q.prompt);
        if (!clue) throw Error('Missing flat-face count');
        const target = Number(clue[1] ?? 0);
        targets.add(target);
        matches = figures.filter(o => counts[o.shape] === target);
      }
      expect(matches).toHaveLength(1);
      expect(q.choices).toEqual(labels);
      expect(q.answer).toBe(matches[0].label);
      for (const label of labels) expect(correctAnswer(q, label)).toBe(label === matches[0].label);
    }
  }
  expect([...modes].sort()).toEqual(['both', 'face-count', 'roll']);
  expect([...targets].sort((a, b) => a - b)).toEqual([0, 1, 2, 6]);
});

it('repeats the same seed and index and varies the visible problems within a session', () => {
  const problems = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(17, index);
    expect(q).toEqual(makeRagQuestion(17, index));
    problems.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(problems.size).toBeGreaterThanOrEqual(8);
});
