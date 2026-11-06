import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragSumAndDifferenceOfTwoQuantities';

function solveBoxes(context: string[] = []) {
  const known = /^The (red|blue) box holds (\d+) (buttons|beads|paper clips)\.$/.exec(context[0] ?? '');
  const relation = /^The (red|blue) box holds (\d+) (more|fewer) (buttons|beads|paper clips) than the (red|blue) box\.$/.exec(context[1] ?? '');
  if (!known || !relation) throw new Error('The box count and comparison must both be visible.');
  const [, knownBox, count, items] = known;
  const [, subject, difference, direction, comparedItems, reference] = relation;
  expect(subject).not.toBe(reference);
  expect(comparedItems).toBe(items);
  const given = Number(count);
  const gap = Number(difference);
  // The comparison describes subject minus reference. Solve for the box whose count is missing.
  const signedDifference = direction === 'more' ? gap : -gap;
  const other = knownBox === subject ? given - signedDifference : given + signedDifference;
  return { given, gap, other, total: given + other, items, direction };
}

test('both response forms agree with the visible count, comparison direction and units', () => {
  const forms = new Set<string>();
  let reached1000 = false;
  let gapExceedsGiven = false;
  for (let seed = 0; seed < 128; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { given, gap, other, total, items, direction } = solveBoxes(q.context);
      expect(given).toBeGreaterThanOrEqual(100);
      expect(gap).toBeGreaterThan(0);
      expect(other).toBeGreaterThan(given);
      expect(total).toBeLessThanOrEqual(1000);
      expect(q.prompt).toContain(items);
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${given} + ${gap} = ${other}`, `${given} + ${other} = ${total}`,
      ]);
      reached1000 ||= total === 1000;
      gapExceedsGiven ||= gap > given;
      if (q.choices) {
        forms.add(`${direction}-equation`);
        expect(q.prompt).toMatch(/number sentence/);
        expect(new Set(q.choices).size).toBe(4);
        const solutions = q.choices.filter(choice => {
          const equation = /^(\d+) ([+−]) (\d+) = (\d+)$/.exec(choice);
          if (!equation) throw new Error('Each option must be a readable number sentence.');
          const [, left, op, right, result] = equation;
          const a = Number(left), b = Number(right);
          expect(Number(result)).toBe(op === '+' ? a + b : a - b);
          return op === '+' && Math.min(a, b) === given && Math.max(a, b) === other && Number(result) === total;
        });
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(solutions[0]);
      } else {
        forms.add(`${direction}-entry`);
        expect(q.prompt).toMatch(/altogether/);
        expect(q.unit).toBe(items);
        expect(q.answer).toBe(String(total));
      }
    }
  }
  expect(forms).toEqual(new Set(['more-entry', 'fewer-entry', 'more-equation', 'fewer-equation']));
  expect(reached1000).toBe(true);
  expect(gapExceedsGiven).toBe(true);
});

test('seed and index reproduce a question and vary the visible givens across a session', () => {
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
