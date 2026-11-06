import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragConstructSpecifiedSegment';

it('grades the length of the segment the pupil draws from the visible comparison', () => {
  const relations = new Set<string>();
  for (let seed = -8; seed < 48; seed++) {
    const q = makeRagQuestion(seed, 1);
    const base = Number(/AB is (\d+) cm/.exec(q.context?.join(' ') ?? '')?.[1]);
    const comparison = /(\d+) cm (longer|shorter) than AB/.exec(q.prompt);
    if (!comparison || !q.gridDrawing) throw new Error('Missing length clue or drawing response');
    const length = base + (comparison[2] === 'longer' ? 1 : -1) * Number(comparison[1]);
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(q.gridDrawing.columns);
    relations.add(comparison[2]);
    expect(correctAnswer(q, `${length},1:0,1`)).toBe(true);
    expect(correctAnswer(q, `0,0:${base},0`)).toBe(false);
    expect(correctAnswer(q, `0,0:${length},1`)).toBe(false);
    expect(correctAnswer(q, String(length))).toBe(false);
    expect(q.choices).toBeUndefined();
    expect(q.structuredResponse).toBeUndefined();
  }
  expect([...relations].sort()).toEqual(['longer', 'shorter']);
});
