import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragMatchBarValuesAndLabels';

it('solves both parts using only the labelled graph and the printed clue', () => {
  for (let seed = -8; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const chart = q.picture;
      if (chart?.type !== 'bars') throw new Error('Expected a bar graph');
      const { labels, values, scale } = chart;
      expect(labels).toHaveLength(5);
      expect(new Set(labels).size).toBe(5);
      expect(values).toHaveLength(labels.length);
      expect(scale).toBeGreaterThan(1);
      for (const value of values) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(40);
        expect(value % scale).toBe(0);
      }

      const text = [...(q.context ?? []), q.prompt].join(' ');
      expect(text).toMatch(/\(a\).*equal numbers of cards/);
      expect(text).toContain('from left to right');
      const pairs: string[][] = [];
      for (let left = 0; left < values.length; left++) {
        for (let right = left + 1; right < values.length; right++) {
          if (values[left] === values[right]) pairs.push([labels[left], labels[right]]);
        }
      }
      expect(pairs).toHaveLength(1);
      const [pair] = pairs;

      const clue = /\(b\) One child packed (\d+) more cards than ([A-Za-z]+)\./.exec(text);
      if (!clue) throw new Error('Missing comparison in part (b)');
      const extra = Number(clue[1]);
      const reference = clue[2];
      expect(extra).toBeGreaterThan(0);
      expect(pair).toContain(reference);
      const referenceValue = values[labels.indexOf(reference)];
      const matches = labels.filter((_, i) => values[i] - referenceValue === extra);
      expect(matches).toHaveLength(1);

      const solution = [...pair, ...matches].join(' ');
      expect(q.answer).toBe(solution);
      expect(correctAnswer(q, solution)).toBe(true);
      expect(correctAnswer(q, pair.join(' '))).toBe(false);
      expect(correctAnswer(q, matches[0])).toBe(false);
      expect(correctAnswer(q, [...pair, reference].join(' '))).toBe(false);
      expect(correctAnswer(q, [pair[0], matches[0], matches[0]].join(' '))).toBe(false);
    }
  }
});

it('reproduces a variation and changes the chart across indices', () => {
  const charts = new Set<string>();
  const scales = new Set<number>();
  for (let index = 0; index < 48; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    if (q.picture?.type !== 'bars') throw new Error('Expected a bar graph');
    charts.add(JSON.stringify([q.picture.labels, q.picture.values]));
    scales.add(q.picture.scale);
  }
  expect(charts.size).toBeGreaterThan(1);
  expect(scales.size).toBeGreaterThan(1);
});
