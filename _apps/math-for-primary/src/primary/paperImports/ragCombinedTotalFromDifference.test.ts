import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragCombinedTotalFromDifference';

test('solves each response from the two facts the pupil sees', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const knownFact = /^(\w+) has (\d+) (\w+)\.$/.exec(q.context?.[0] ?? '');
      const clue = /^(\w+) has (\d+) (more|fewer) (\w+) than (\w+)\.$/.exec(q.context?.[1] ?? '');
      if (!knownFact || !clue) throw new Error(`Missing comparison facts in ${q.key}`);
      const [, first, knownText, unit] = knownFact;
      const [, second, gapText, direction, comparedUnit, referenceChild] = clue;
      expect(comparedUnit).toBe(unit);
      expect(referenceChild).toBe(first);
      expect(second).not.toBe(first);
      const known = Number(knownText);
      const gap = Number(gapText);
      expect(known).toBeGreaterThan(0);
      expect(gap).toBeGreaterThan(0);

      // Two equal collections would total twice the known count. Apply the gap once.
      const total = 2 * known + (direction === 'more' ? gap : -gap);
      const other = total - known;
      expect(other).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
      expect(q.prompt).toContain(`How many ${unit} do ${first} and ${second} have together?`);
      const linked = q.prompt.includes(`How many ${unit} does ${second} have?`);
      forms.add(`${direction}/${linked ? 'linked' : 'total'}`);
      const expected = linked ? JSON.stringify([String(other), String(total)]) : String(total);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      if (linked) {
        expect(q.structuredResponse).toEqual({
          kind: 'number-pair', firstLabel: `${second}’s ${unit}`, secondLabel: `Total ${unit}`,
        });
        expect(correctAnswer(q, JSON.stringify([String(total), String(other)]))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([String(known), String(total)]))).toBe(false);
      } else {
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe(unit);
        expect(correctAnswer(q, String(other))).toBe(false);
      }
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${known} ${direction === 'more' ? '+' : '−'} ${gap} = ${other}`,
        `${known} + ${other} = ${total}`,
      ]);
    }
  }
  expect([...forms].sort()).toEqual(['fewer/linked', 'more/linked', 'more/total']);
});

test('replays the same practice set and varies its visible givens by index', () => {
  const set = () => Array.from({ length: 12 }, (_, index) => makeRagQuestion(42, index));
  const questions = set();
  expect(set()).toEqual(questions);
  expect(new Set(questions.map(q => q.context?.join(' '))).size).toBeGreaterThan(1);
});
