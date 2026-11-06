import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragSquareEquilateralBoundary';

// Solve from the student-visible wording and context; do not inspect the stored answer.
function solveVisibleQuestion(prompt: string, context: string[] = []): number {
  const text = `${prompt} ${context.join(' ')}`;
  const areaMatch = text.match(/area of (\d+) cm²/i);
  const sideMatch = text.match(/side length (\d+) cm/i);
  const side = areaMatch ? Math.sqrt(Number(areaMatch[1])) : Number(sideMatch?.[1]);
  if (!Number.isInteger(side) || side <= 0) throw new Error(`Could not recover a square side from: ${text}`);
  if (!/equilateral triangle/i.test(text) || !/shares exactly one whole side/i.test(text)) {
    throw new Error(`The visible shape relationships are incomplete: ${text}`);
  }
  return 3 * side + 2 * side;
}

describe('rag square and equilateral triangle boundary', () => {
  it('matches an independent solution from visible givens across varied seeds', () => {
    const seenForms = new Set<string>();
    const seenAnswers = new Set<number>();
    for (let seed = 1; seed <= 48; seed += 1) {
      const question = makeRagQuestion(seed, seed % 5);
      expect(Number(question.answer)).toBe(solveVisibleQuestion(question.prompt, question.context));
      seenForms.add(/area of \d+ cm²/i.test(question.prompt) ? 'area' : 'side');
      seenAnswers.add(Number(question.answer));
    }
    expect(seenForms).toEqual(new Set(['area', 'side']));
    expect(seenAnswers.size).toBeGreaterThan(3);
  });
});
