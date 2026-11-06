import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragSuccessiveMeasurementChanges';

function read(facts: string, pattern: RegExp): number {
  const match = pattern.exec(facts);
  if (!match) throw new Error(`Missing visible given ${pattern} in ${facts}`);
  return Number(match[1]);
}

it('solves each requested measurement from the labelled facts in either reading order', () => {
  for (const seed of [-213, -1, 0, 1, 13, 89, 2048, 90001]) {
    const prompts = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const facts = (q.context ?? []).join(' ');
      prompts.add(q.prompt);
      let answer: number;
      let middle: number;
      let unit: string;
      let equations: string[];

      if (q.prompt === 'How long is the red ribbon? Show your working.') {
        const gold = read(facts, /gold ribbon is (\d+) cm long\./);
        const drop = read(facts, /white ribbon is (\d+) cm shorter than the gold ribbon\./);
        const rise = read(facts, /red ribbon is (\d+) cm longer than the white ribbon\./);
        middle = gold - drop;
        answer = middle + rise;
        unit = 'cm';
        equations = [`${gold} − ${drop} = ${middle} cm`, `${middle} + ${rise} = ${answer} cm`];
      } else if (q.prompt === 'How long is the lake path? Show your working.') {
        const pond = read(facts, /pond path is (\d+) m long\./);
        const rise = read(facts, /hill path is (\d+) m longer than the pond path\./);
        const drop = read(facts, /lake path is (\d+) m shorter than the hill path\./);
        middle = pond + rise;
        answer = middle - drop;
        unit = 'm';
        equations = [`${pond} + ${rise} = ${middle} m`, `${middle} − ${drop} = ${answer} m`];
      } else {
        expect(q.prompt).toBe('How many kilograms of potatoes were delivered? Show your working.');
        const start = read(facts, /started the day with (\d+) kg of potatoes\./);
        const sold = read(facts, /sold (\d+) kg before lunch\./);
        const end = read(facts, /After a delivery, the stall had (\d+) kg of potatoes\./);
        middle = start - sold;
        // The delivery must replace the sale and account for the net gain in stock.
        answer = sold + (end - start);
        expect(middle + answer).toBe(end);
        unit = 'kg';
        equations = [`${start} − ${sold} = ${middle} kg`, `${end} − ${middle} = ${answer} kg`];
      }

      for (const value of [...(facts.match(/\d+/g) ?? []).map(Number), middle, answer]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1000);
      }
      expect(q.answer).toBe(String(answer));
      expect(q.unit).toBe(unit);
      expect(q.workedSteps?.map(step => step.equation)).toEqual(equations);
    }
    expect(prompts.size).toBe(3);
  }
});

it('replays a seed and index and varies the visible givens, including which ribbon clue comes first', () => {
  const stories = new Map<string, Set<string>>();
  const ribbonStarts = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const seen = stories.get(q.prompt) ?? new Set<string>();
      seen.add((q.context ?? []).join(' '));
      stories.set(q.prompt, seen);
      if (q.unit === 'cm') ribbonStarts.add((q.context?.[0] ?? '').split(' is ')[0]);
    }
  }
  expect(stories.size).toBe(3);
  for (const seen of stories.values()) expect(seen.size).toBeGreaterThan(4);
  expect([...ribbonStarts].sort()).toEqual(['The gold ribbon', 'The red ribbon']);
});
