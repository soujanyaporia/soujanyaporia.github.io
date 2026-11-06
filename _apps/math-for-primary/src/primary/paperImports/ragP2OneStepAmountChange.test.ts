import {describe, expect, it} from 'vitest';
import {correctAnswer} from '../generate';
import {makeRagQuestion} from './ragP2OneStepAmountChange';

describe('P2 one-step amount change model', () => {
  it('solves the visible givens and grades all model labels across seeds', () => {
    for (const [seed, index] of [[1, 0], [17, 3], [8421, 2], [20261105, 9]] as const) {
      const question = makeRagQuestion(seed, index);
      const totalMatch = question.context?.[0].match(/had (\d+) /);
      const leftMatch = question.context?.[1].match(/(\d+) .* were left/);
      expect(totalMatch).not.toBeNull();
      expect(leftMatch).not.toBeNull();

      const total = Number(totalMatch![1]);
      const left = Number(leftMatch![1]);
      const used = total - left;
      const fields = question.structuredResponse;
      expect(fields?.kind).toBe('number-fields');
      if (fields?.kind !== 'number-fields') throw new Error('Expected numeric model-label fields');
      const values = fields.fields.map(field => {
        if (field.label.startsWith('All ')) return String(total);
        if (field.label.endsWith(' used')) return String(used);
        if (field.label.endsWith(' left')) return String(left);
        throw new Error(`Unexpected visible response field: ${field.label}`);
      });
      expect(correctAnswer(question, JSON.stringify(values))).toBe(true);
      expect(correctAnswer(question, JSON.stringify([String(left), String(used), String(total)]))).toBe(false);
    }
  });
});
