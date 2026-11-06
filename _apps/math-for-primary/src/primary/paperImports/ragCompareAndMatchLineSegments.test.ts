import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragCompareAndMatchLineSegments';

function measure(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'grid-drawing') throw new Error('Expected a diagram with visible endpoints');
  const legend = q.context?.find(line => line.startsWith('From top to bottom: '));
  if (!legend) throw new Error('Missing row labels');
  const labels = legend.slice('From top to bottom: '.length, -1).split(', ');
  const segments = [...picture.segments].sort((a, b) => a[0][1] - b[0][1]);
  expect(segments).toHaveLength(labels.length);
  expect(new Set(labels).size).toBe(labels.length);
  const lengths = new Map<string, number>();
  segments.forEach(([[x, y], [end, row]], i) => {
    expect(row).toBe(y);
    expect(y).toBe(i);
    expect(y).toBeLessThanOrEqual(picture.rows);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(end).toBeLessThanOrEqual(picture.columns);
    expect(end).toBeGreaterThan(x);
    lengths.set(labels[i], end - x);
  });
  return lengths;
}

it('solves each response from the row labels, endpoints and question wording', () => {
  const relations = new Set<string>();
  const matchRows = new Set<number>();
  const seen = new Set<string>();
  for (let seed = -8; seed <= 40; seed++) {
    for (let index = 0; index < 10; index++) {
      const q = makeRagQuestion(seed, index);
      const lengths = measure(q);
      const labels = [...lengths.keys()];
      const direct = /^Rope (\w+) is ___ rope (\w+)/.exec(q.prompt);
      const reference = /as long as line (\w+)\?/.exec(q.prompt);
      const shorter = /shorter is the (\w+) strip than the (\w+) strip\?/.exec(q.prompt);
      if (direct) {
        expect(labels).toHaveLength(2);
        expect(q.context).toContain('One space between neighbouring dots stands for 1 m.');
        const left = lengths.get(direct[1])!, right = lengths.get(direct[2])!;
        expect(Number.isFinite(left + right)).toBe(true);
        const relation = left === right ? 'the same length as' : left < right ? 'shorter than' : 'longer than';
        expect(q.choices?.slice().sort()).toEqual(['longer than', 'shorter than', 'the same length as']);
        expect(q.answer).toBe(relation);
        relations.add(relation);
        seen.add('comparison');
      } else if (reference) {
        expect(labels).toHaveLength(4);
        const matches = labels.filter(label => label !== reference[1] && lengths.get(label) === lengths.get(reference[1]));
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(matches[0]);
        expect(q.choices).toBeUndefined();
        matchRows.add(labels.indexOf(matches[0]));
        seen.add('reference');
      } else if (shorter) {
        expect(q.context).toContain('One space between neighbouring dots stands for 1 cm.');
        const difference = lengths.get(shorter[2])! - lengths.get(shorter[1])!;
        expect(difference).toBeGreaterThan(0);
        expect(q.answer).toBe(String(difference));
        expect(q.unit).toBe('cm');
        seen.add('difference');
      } else {
        expect(q.prompt).toBe('Which two strips have the same length?');
        expect(labels).toHaveLength(4);
        const pairs = labels.flatMap((a, i) => labels.slice(i + 1)
          .filter(b => lengths.get(a) === lengths.get(b)).map(b => [a, b]));
        expect(pairs).toHaveLength(1);
        expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: labels });
        const [a, b] = pairs[0];
        expect(JSON.parse(q.answer).sort()).toEqual([a, b].sort());
        const input = q.structuredResponse!;
        expect(structuredResponseCorrect(input, q.answer, JSON.stringify([b, a]))).toBe(true);
        expect(structuredResponseCorrect(input, q.answer, JSON.stringify([a, a]))).toBe(false);
        seen.add('equal pair');
      }
    }
  }
  expect(relations.size).toBe(3);
  expect([...matchRows].sort()).toEqual([1, 2, 3]);
  expect(seen.size).toBe(4);
});

it('keeps the same scale, row labels and endpoints for both strip questions', () => {
  for (let seed = 0; seed < 35; seed++) {
    const questions = Array.from({ length: 5 }, (_, i) => makeRagQuestion(seed, i));
    const i = questions.findIndex(q => q.structuredResponse?.kind === 'named-pair');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(makeRagQuestion(seed, i)).toEqual(questions[i]);
    const next = makeRagQuestion(seed, i + 1);
    expect(next.prompt).toMatch(/^How many centimetres shorter/);
    expect(next.picture).toEqual(questions[i].picture);
    expect(next.context).toEqual(questions[i].context);
    expect(next.key).not.toBe(questions[i].key);
    const names = /is the (\w+) strip than the (\w+) strip/.exec(next.prompt)!;
    const lengths = measure(questions[i]);
    const smaller = lengths.get(names[1]);
    expect([...lengths.values()].filter(value => value === smaller)).toHaveLength(2);
    expect(lengths.get(names[2])).toBe(Math.max(...lengths.values()));
  }
});
