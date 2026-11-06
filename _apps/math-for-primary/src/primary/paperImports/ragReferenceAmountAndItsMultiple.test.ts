import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragReferenceAmountAndItsMultiple';

function readGiven(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return Number(match[1]);
}

it('grades both answers using only the story to reconstruct the two balances', () => {
  for (let seed = -3; seed <= 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const story = (question.context ?? []).join(' ');
      const lead = readGiven(story, /red tin held \$(\d+) more than the blue tin/);
      const paid = readGiven(story, /used \$(\d+) from the red tin to pay a baker/);
      const times = readGiven(story, /red tin then held (\d+) times as much money as the blue tin/);
      expect(story).toContain('The money in the blue tin stayed the same.');
      expect(paid).toBeGreaterThan(0);
      expect(lead).toBeGreaterThan(paid);
      expect(lead).toBeLessThan(1000);
      expect(times).toBeGreaterThan(1);
      expect(times).toBeLessThanOrEqual(9);

      // Try each possible blue balance. The red balance must fit both clues.
      const solutions: number[] = [];
      for (let blue = 1; blue <= 999; blue++) {
        const redAfter = blue + lead - paid;
        if (redAfter === times * blue) solutions.push(blue);
      }
      expect(solutions).toHaveLength(1);
      const blue = solutions[0];
      const difference = times * blue - blue;
      const pair = [String(difference), String(blue)];
      const expected = JSON.stringify(pair);
      expect(question.unit).toBe('dollars');
      expect(question.structuredResponse).toMatchObject({
        kind: 'number-pair',
        firstLabel: '(a) Difference after the payment ($)',
        secondLabel: '(b) Money in the blue tin ($)',
      });
      const spec = question.structuredResponse;
      if (!spec) throw new Error('Both parts need answer fields');
      expect(question.answer).toBe(expected);
      expect(structuredResponseCorrect(spec, question.answer, expected)).toBe(true);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([pair[1], pair[0]]))).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([pair[0]]))).toBe(false);
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `$${lead} − $${paid} = $${difference}`,
        `${times} − 1 = ${times - 1}`,
        `$${difference} ÷ ${times - 1} = $${blue}`,
      ]);
    }
  }
});

it('replays a seed and index and varies the visible givens across a session', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(72, index);
    expect(makeRagQuestion(72, index)).toEqual(question);
    stories.add(JSON.stringify(question.context));
  }
  expect(stories.size).toBeGreaterThan(1);
  expect(makeRagQuestion(72)).toEqual(makeRagQuestion(72, 0));
});
