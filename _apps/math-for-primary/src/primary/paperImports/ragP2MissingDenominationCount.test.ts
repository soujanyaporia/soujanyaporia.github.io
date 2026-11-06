import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP2MissingDenominationCount';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible amount in ${text}`);
  return Number(match[1]);
}

// Only the parts shown to the pupil enter this solver.
function readGivens({ prompt, context, picture }: Pick<Question, 'prompt' | 'context' | 'picture'>) {
  const text = (context ?? []).join(' ');
  const coins = prompt.includes('-cent coins');
  const face = coins ? readNumber(prompt, /(\d+)-cent coins/) : readNumber(prompt, /\$(\d+) notes/);
  if (picture) {
    if (picture.type !== 'pattern') throw new Error('Expected labelled coins');
    expect(prompt).toContain('more');
    expect(text).toContain('Each label shows one coin');
    const known = picture.items.reduce((sum, label) => sum + readNumber(label, /^(5|10|20)¢$/), 0);
    const total = readNumber(text, /wants (\d+) cents/);
    return { form: 'tray', coins, face, known, total };
  }
  if (text.includes('pays with')) {
    expect(text).toContain(`All his change is in $${face} notes`);
    const total = readNumber(text, /pays with one \$(\d+) note/);
    const known = readNumber(text, /kite costs \$(\d+)/);
    return { form: 'shop', coins, face, known, total };
  }
  const total = readNumber(text, coins ? /holds (\d+) cents/ : /holds \$(\d+)/);
  const envelope = text.includes('envelope');
  const groups = [...text.matchAll(/(\d+) (?:\$(\d+) (?:notes|coins)|(\d+)-cent coins)/g)];
  expect(groups).toHaveLength(envelope ? 2 : 1);
  const known = groups.reduce((sum, group) => sum + Number(group[1]) * Number(group[2] ?? group[3]), 0);
  expect(text).toContain(`The rest of the money is in ${coins ? `${face}-cent coins` : `$${face} notes`}.`);
  return { form: envelope ? 'envelope' : coins ? 'coin tin' : 'note tin', coins, face, known, total };
}

test('exactly one count completes each visible total', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, coins, face, known, total } = readGivens(q);
      forms.add(form);
      expect(known).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
      const solutions: number[] = [];
      for (let count = 0; count <= total; count++) {
        if (known + count * face === total) solutions.push(count);
      }
      expect(solutions).toHaveLength(1);
      expect(solutions[0]).toBeGreaterThan(0);
      expect(solutions[0]).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(String(solutions[0]));
      expect(q.unit).toBe(coins ? 'coins' : 'notes');
      expect(q.choices).toBeUndefined();
      const equations = q.workedSteps?.map(step => step.equation);
      const money = (n: number) => coins ? `${n} cents` : `$${n}`;
      expect(equations).toContain(`${money(total)} − ${money(known)} = ${money(total - known)}`);
      expect(equations).toContain(`${total - known} ÷ ${face} = ${solutions[0]}`);
    }
  }
  expect([...forms].sort()).toEqual(['coin tin', 'envelope', 'note tin', 'shop', 'tray']);
});

test('seed and index reproduce a question and allow different visible givens', () => {
  expect(makeRagQuestion(12)).toEqual(makeRagQuestion(12, 0));
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(19, index);
    expect(q).toEqual(makeRagQuestion(19, index));
    stories.add(JSON.stringify([q.context, q.prompt, q.picture]));
  }
  expect(stories.size).toBeGreaterThan(4);
});
