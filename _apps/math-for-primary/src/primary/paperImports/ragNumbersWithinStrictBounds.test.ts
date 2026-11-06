import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragNumbersWithinStrictBounds';

function solveFromQuestion(q: Question) {
  const upperText = /less than (\d+)/.exec(q.prompt);
  if (!upperText) throw new Error('Missing upper bound in the prompt');
  const lowerText = /greater than (\d+)/.exec(q.prompt);
  const upper = Number(upperText[1]);
  const lower = lowerText ? Number(lowerText[1]) : undefined;
  const labels = q.structuredResponse?.kind === 'named-pair'
    ? q.structuredResponse.options
    : q.choices ?? q.display?.split(' · ');
  if (!labels?.length) throw new Error('Missing list of numbers');
  const matches = labels.filter(label => {
    const n = Number(label);
    return n < upper && (lower === undefined || n > lower);
  });
  return { labels, matches, lower, upper };
}

it('grades exactly the visible numbers meeting every bound, including pairs in either order', () => {
  const forms = new Set<string>();
  const endpointCases = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { labels, matches, lower, upper } = solveFromQuestion(q);
      const pair = q.prompt.includes('two numbers');
      expect(labels).toHaveLength(pair ? 5 : 4);
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels.every(label => /^[1-9]\d$/.test(label))).toBe(true);
      expect(matches).toHaveLength(pair ? 2 : 1);
      if (lower !== undefined) {
        expect(lower).toBeLessThan(upper);
        expect(labels.some(label => Number(label) < lower)).toBe(true);
        expect(labels.some(label => Number(label) > upper)).toBe(true);
        if (labels.includes(String(lower))) endpointCases.add('lower');
        if (labels.includes(String(upper))) endpointCases.add('upper');
      }
      if (pair) {
        forms.add('two between');
        expect(q.structuredResponse?.kind).toBe('named-pair');
        expect(JSON.parse(q.answer).sort()).toEqual([...matches].sort());
        for (const first of labels) {
          for (const second of labels) {
            const expected = first !== second && matches.includes(first) && matches.includes(second);
            expect(correctAnswer(q, JSON.stringify([first, second]))).toBe(expected);
          }
        }
        expect(correctAnswer(q, JSON.stringify(matches.slice(0, 1)))).toBe(false);
      } else {
        forms.add(lower === undefined ? 'one below' : 'one between');
        expect(q.answer).toBe(matches[0]);
        for (const label of labels) {
          expect(correctAnswer(q, label)).toBe(matches.includes(label));
        }
        expect(correctAnswer(q, String(upper))).toBe(false);
        if (lower !== undefined) expect(correctAnswer(q, String(lower))).toBe(false);
      }
    }
  }
  expect(forms).toEqual(new Set(['one between', 'two between', 'one below']));
  expect(endpointCases).toEqual(new Set(['lower', 'upper']));
});

it('replays a question from its seed and varies the visible givens across indices', () => {
  const rows = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    rows.add(solveFromQuestion(q).labels.join(','));
  }
  expect(rows.size).toBeGreaterThan(1);
});
