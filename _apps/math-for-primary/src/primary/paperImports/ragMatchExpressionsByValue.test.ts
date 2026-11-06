import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragMatchExpressionsByValue';

// Interpret only the expressions printed for the pupil.
function readValue(text: string): number {
  const groups = /^(\d+) groups of (\d+)$/.exec(text);
  if (groups) return Number(groups[1]) * Number(groups[2]);
  if (/^\d+(?: \+ \d+)+$/.test(text)) return text.split(' + ').reduce((sum, n) => sum + Number(n), 0);
  if (/^\d+(?: × \d+)+$/.test(text)) return text.split(' × ').reduce((product, n) => product * Number(n), 1);
  const divide = /^(\d+) ÷ (\d+)$/.exec(text);
  if (divide) {
    const [dividend, divisor] = divide.slice(1).map(Number);
    expect([2, 3, 4, 5, 10]).toContain(divisor);
    expect(dividend % divisor).toBe(0);
    expect(dividend / divisor).toBeGreaterThan(0);
    expect(dividend / divisor).toBeLessThanOrEqual(10);
    return dividend / divisor;
  }
  throw new Error(`Unreadable expression: ${text}`);
}

test('the visible cards, counts and products determine exactly one offered answer', () => {
  const kinds = new Set<string>();
  const cardTotals = new Set<number>();
  const beadTotals = new Set<number>();
  for (let seed = -12; seed <= 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      let solutions: string[];
      if (q.prompt === 'Which three cards give the same answer?') {
        kinds.add('matching cards');
        const cards = new Map<string, number>();
        for (const line of q.context ?? []) {
          const m = /^Card ([A-D]): (.+)$/.exec(line);
          if (!m) throw new Error(`Unreadable card: ${line}`);
          cards.set(m[1], readValue(m[2]));
        }
        expect([...cards.keys()].sort()).toEqual(['A', 'B', 'C', 'D']);
        expect(new Set(cards.values()).size).toBe(2);
        solutions = choices.filter(choice => {
          const m = /^([A-D]), ([A-D]) and ([A-D])$/.exec(choice);
          if (!m) throw new Error(`Unreadable card selection: ${choice}`);
          const names = m.slice(1);
          expect(new Set(names).size).toBe(3);
          const values = names.map(name => cards.get(name)!);
          if (!values.every(value => value === values[0])) return false;
          cardTotals.add(values[0]);
          return true;
        });
      } else {
        const given = q.display ?? '';
        const beads = /^(\d+) beads$/.exec(given);
        const target = beads ? Number(beads[1]) : readValue(given);
        const wantsDifferent = q.prompt.includes('different');
        if (beads) {
          beadTotals.add(target);
          kinds.add(wantsDifferent ? 'different grouping' : 'matching grouping');
          for (const choice of choices) expect(choice).toMatch(/^\d+ groups of \d+$/);
        } else {
          kinds.add('different from product');
          expect(given).toMatch(/^\d+ × \d+$/);
          expect(wantsDifferent).toBe(true);
          expect(choices.some(choice => choice.includes('÷'))).toBe(true);
        }
        solutions = choices.filter(choice => wantsDifferent ? readValue(choice) !== target : readValue(choice) === target);
      }
      expect(solutions).toHaveLength(1);
      expect(q.answer).toBe(solutions[0]);
    }
  }
  expect(kinds.size).toBe(4);
  expect(cardTotals.size).toBeGreaterThan(2);
  expect(beadTotals.size).toBeGreaterThan(2);
});

test('a seed and index replay the question, and four consecutive indices offer four tasks', () => {
  for (const seed of [-17, 0, 23, 407]) {
    const prompts = new Set<string>();
    for (let index = 4; index < 8; index++) {
      const question = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(question);
      prompts.add(question.prompt);
    }
    expect(prompts.size).toBe(4);
  }
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
});
