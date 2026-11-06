import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragMoneyShares';

function solveVisibleStory(question: Question) {
  const [opening, ...clues] = question.context ?? [];
  const header = /^(.+) (?:cost|saved) \$(\d+) altogether\.$/.exec(opening ?? '');
  if (!header) throw new Error('Missing combined amount');
  const names = header[1].match(/\b(?:cap|scarf|jacket|Ida|Ravi|Zoe)\b/g) ?? [];
  const asked = question.prompt.match(/\b(?:cap|scarf|jacket|Ida|Ravi|Zoe)\b/g) ?? [];
  expect(asked).toHaveLength(1);
  const target = asked[0];
  if (target === undefined) throw new Error('Missing requested item or person');
  expect(names).toContain(target);
  expect([2, 3]).toContain(names.length);
  expect(clues).toHaveLength(names.length - 1);
  const total = Number(header[2]);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(200);

  const relations = clues.map(line => {
    const match = /^(?:The )?(\w+) (?:costs|saved) \$(\d+) (more|less) than (?:the )?(\w+)\.$/.exec(line);
    if (!match) throw new Error(`Unrecognised comparison: ${line}`);
    const [, subject, dollars, direction, reference] = match;
    expect(names).toContain(subject);
    expect(names).toContain(reference);
    expect(Number(dollars)).toBeGreaterThan(0);
    return { subject, reference, change: Number(dollars) * (direction === 'more' ? 1 : -1) };
  });

  // Try each possible answer, follow the printed comparisons, and count the dollars.
  const solutions: number[] = [];
  for (let guess = 1; guess < total; guess++) {
    const amounts = new Map<string, number>([[target, guess]]);
    for (const { subject, reference, change } of relations) {
      const other = amounts.get(reference);
      if (other === undefined || amounts.has(subject)) throw new Error('Expected a comparison to an amount already found');
      amounts.set(subject, other + change);
    }
    const values = names.map(name => amounts.get(name) ?? NaN);
    if (values.every(value => value > 0) && values.reduce((sum, value) => sum + value, 0) === total) {
      expect(Math.min(...values)).toBe(guess);
      solutions.push(guess);
    }
  }
  expect(solutions).toHaveLength(1);
  const shape = relations.map(r => `${r.subject}${r.change > 0 ? '>' : '<'}${r.reference}`).join(',');
  return { answer: solutions[0], count: names.length, shape };
}

it('finds a unique answer from the displayed total and comparisons in each of the four forms', () => {
  const answers = new Set<number>();
  for (const seed of [-19, 0, 1, 7, 83, 444, 901]) {
    const shapes = new Set<string>();
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const { answer, count, shape } = solveVisibleStory(q);
      shapes.add(shape);
      answers.add(answer);
      expect(q.answer).toBe(String(answer));
      expect(q.unit).toBe('dollars');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.workedSteps?.at(-1)?.equation).toBe(`$${count * answer} ÷ ${count} = $${answer}`);
    }
    expect(shapes).toEqual(new Set(['scarf>cap', 'scarf>cap,jacket>cap', 'Ravi>Ida,Zoe<Ravi', 'scarf>cap,jacket>scarf']));
  }
  expect(answers.size).toBeGreaterThan(5);
});

it('replays the same question for a seed and index, including the default index', () => {
  expect(makeRagQuestion(52)).toEqual(makeRagQuestion(52, 0));
  expect(makeRagQuestion(52, 3)).toEqual(makeRagQuestion(52, 3));
  expect(makeRagQuestion(52, 0).context).not.toEqual(makeRagQuestion(52, 1).context);
});
