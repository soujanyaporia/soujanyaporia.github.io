import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragSquareFaceVolume';

// Solve using only the dimensions printed in the generated prompt.
function solveVisiblePrompt(prompt: string): number {
  let m = /perimeter (\d+) cm and height (\d+) cm/.exec(prompt);
  if (m) {
    const side = Number(m[1]) / 4;
    return side * side * Number(m[2]);
  }
  m = /base with area (\d+) cm²\. Its height is (\d+)\/(\d+) of the side/.exec(prompt);
  if (m) {
    const baseArea = Number(m[1]);
    const side = Math.sqrt(baseArea);
    const height = side * Number(m[2]) / Number(m[3]);
    return baseArea * height;
  }
  m = /face of a cube has an area of (\d+) cm²/.exec(prompt);
  if (m) {
    const edge = Math.sqrt(Number(m[1]));
    return edge ** 3;
  }
  throw new Error(`Unrecognised visible question: ${prompt}`);
}

describe('square-face volume generator', () => {
  it('matches an independent solver reading the visible givens across variants and seeds', () => {
    for (let seed = 0; seed < 30; seed++) {
      const question = makeRagQuestion(seed);
      expect(Number(question.answer)).toBe(solveVisiblePrompt(question.prompt));
      expect(question.unit).toBe('cm³');
      expect(question.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('varies the generated dimensions while keeping each answer solvable from the prompt', () => {
    const questions = Array.from({ length: 12 }, (_, seed) => makeRagQuestion(seed));
    expect(new Set(questions.map(q => q.prompt)).size).toBe(12);
    for (const question of questions) {
      expect(Number(question.answer)).toBe(solveVisiblePrompt(question.prompt));
    }
  });
});
