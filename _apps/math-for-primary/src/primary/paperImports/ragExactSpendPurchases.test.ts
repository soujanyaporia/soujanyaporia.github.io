import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragExactSpendPurchases';

function solveVisible(q: Question) {
  const [story, ...lines] = q.context ?? [];
  const tags = lines.map(line => {
    const match = /^(.+): \$(\d+)$/.exec(line);
    if (!match) throw new Error(`Unreadable price tag: ${line}`);
    return { name: match[1], price: Number(match[2]) };
  });
  const amounts = Array.from(story.matchAll(/\$(\d+)/g), match => Number(match[1]));
  const full = story.includes('spent exactly');
  const pair = story.includes('two different toys');
  const balance = story.includes('one lunch box');
  expect(full || pair || balance || story.includes('one toy')).toBe(true);
  if (full) expect(story).toContain('at most one of each toy');
  expect(amounts).toHaveLength(full ? 1 : 2);
  expect(tags).toHaveLength(pair || balance ? 4 : 3);
  expect(new Set(tags.map(tag => tag.name)).size).toBe(tags.length);
  for (const value of [...amounts, ...tags.map(tag => tag.price)]) {
    expect(Number.isInteger(value) && value > 0 && value <= 100).toBe(true);
  }

  const spend = full ? amounts[0] : amounts[0] - amounts[1];
  expect(spend).toBeGreaterThan(0);
  const solutions: string[][] = [];
  for (let mask = 1; mask < 2 ** tags.length; mask++) {
    const selected = tags.filter((_, i) => (mask & (1 << i)) !== 0);
    if (!full && selected.length !== (pair ? 2 : 1)) continue;
    const cost = selected.reduce((sum, tag) => sum + tag.price, 0);
    if (cost === spend) solutions.push(selected.map(tag => tag.name).sort());
  }
  expect(solutions).toHaveLength(1);
  return { tags, names: solutions[0], full, pair, balance, amounts, spend };
}

const unpackChoice = (label: string) => label.split(/, | and /).sort();

test('the visible price tags and story determine exactly the response accepted for each form', () => {
  const forms = new Set<string>();
  const fullSpendSizes = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { tags, names, full, pair, balance, amounts, spend } = solveVisible(q);
      const labels = tags.map(tag => tag.name);
      if (!full) expect(q.workedSteps?.[0].equation).toBe(`$${amounts[0]} − $${amounts[1]} = $${spend}`);
      if (pair) {
        forms.add('pair');
        expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: labels });
        expect(JSON.parse(q.answer).sort()).toEqual(names);
        for (const a of labels) for (const b of labels) {
          const valid = a !== b && names.includes(a) && names.includes(b);
          expect(correctAnswer(q, JSON.stringify([a, b]))).toBe(valid);
        }
      } else if (balance) {
        forms.add('balance');
        expect(q.prompt).toContain('letter');
        for (const label of labels) {
          const letter = /^Box ([A-D])$/.exec(label)?.[1];
          if (!letter) throw new Error(`Missing box letter: ${label}`);
          expect(correctAnswer(q, letter.toLowerCase())).toBe(label === names[0]);
        }
      } else if (full) {
        forms.add('full');
        fullSpendSizes.add(names.length);
        const choices = q.choices ?? [];
        expect(choices).toHaveLength(4);
        const baskets = choices.map(unpackChoice);
        expect(new Set(baskets.map(parts => parts.join('|'))).size).toBe(4);
        for (const parts of baskets) {
          expect(parts.length).toBe(new Set(parts).size);
          expect(parts.every(name => labels.includes(name))).toBe(true);
        }
        const winners = choices.filter((_, i) => baskets[i].join('|') === names.join('|'));
        expect(winners).toEqual([q.answer]);
      } else {
        forms.add('single');
        expect(q.choices).toEqual(labels);
        expect(q.answer).toBe(names[0]);
      }
    }
  }
  expect([...forms].sort()).toEqual(['balance', 'full', 'pair', 'single']);
  expect([...fullSpendSizes].sort()).toEqual([1, 2, 3]);
});

test('seed and index reproduce a question and allow different price lists within a session', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context?.slice(1)));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
