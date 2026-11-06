import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4NonfactorFactorClaims';

function solveVisible(question: ReturnType<typeof makeRagQuestion>): string {
  const match = /not a factor of (\d+)|two numbers that are not factors of (\d+)/.exec(question.prompt);
  if (!match || !question.choices) throw new Error('Expected a visible number and answer choices.');
  const total = Number(match[1] ?? match[2]);
  const pair = /two numbers/.test(question.prompt);
  const valid = question.choices.filter(option => {
    const values = option.match(/\d+/g)?.map(Number) ?? [];
    return values.length === (pair ? 2 : 1) && values.every(value => total % value !== 0);
  });
  if (valid.length !== 1) throw new Error(`Expected one correct choice, found ${valid.length}.`);
  return valid[0];
}

describe('P4 nonfactor factor claims', () => {
  it('makes the visible choices independently solvable across seeds and indices', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (let index = 0; index < 5; index++) {
        const question = makeRagQuestion(seed, index);
        const answer = solveVisible(question);
        expect(question.choices).toHaveLength(4);
        expect(answer).toBe(question.answer);
      }
    }
  });
});
