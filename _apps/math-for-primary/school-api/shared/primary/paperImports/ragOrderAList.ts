import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-order-a-list',
  level: 1,
  title: 'Put numbers in order',
  objective: 'Put four numbers in decreasing order or choose the row that increases at every step.',
  skillIds: ['P1.S.WN.04'],
  canonicalPatternId: 'order-cards-descending-or-select-increasing-row',
} as const;

// The middle pair shares a tens digit, so comparing tens alone is not enough.
function increasingValues(r: Rng, withinTwenty: boolean): [number, number, number, number] {
  if (withinTwenty) return [r.int(1, 9), r.int(12, 15), r.int(16, 19), 20];
  const tens = r.int(2, 8);
  const [u, v] = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return [10 * r.int(1, tens - 1) + r.int(0, 9), 10 * tens + Math.min(u, v),
    10 * tens + Math.max(u, v), 10 * r.int(tens + 1, 9) + r.int(0, 9)];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const chooseRow = (Math.trunc(seed) + Math.trunc(index)) % 4 === 0;
  const [a, b, c, d] = increasingValues(r, !chooseRow && r.chance(0.5));
  const sameTens = `${b} and ${c} have the same tens digit. Compare their ones.`;
  const finish = (prompt: string, answer: string, hint: string, workedSteps: NonNullable<Question['workedSteps']>, response: Pick<Question, 'order' | 'choices'>): Question => ({
    key, prompt, answer, hint, workedSteps, ...response,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (chooseRow) {
    const row = (values: number[]) => values.join(', ');
    const answer = row([a, b, c, d]);
    // Each wrong row fails at a different adjacent pair.
    const choices = r.shuffle([answer, row([b, a, c, d]), row([a, c, b, d]), row([a, b, d, c])]);
    return finish('Which row goes from smallest to greatest?', answer,
      'Read each row from left to right. If a number is smaller than the one before it, try another row.', [
        { text: sameTens, equation: `${b % 10} < ${c % 10}, so ${b} < ${c}.` },
        { text: 'Check all three pairs in the row. Each next number must be greater.', equation: `${a} < ${b}, ${b} < ${c}, ${c} < ${d}.` },
        { text: `Choose the row ${answer}.` },
      ], { choices });
  }

  const target = [d, c, b, a];
  const cards = r.shuffle(target.map(String));
  if (cards.join(',') === target.join(',')) [cards[1], cards[2]] = [cards[2], cards[1]];
  return finish('Put the four cards in a row with the greatest number first.', target.join(','),
    'Choose the greatest card left each time. If two cards have the same tens digit, look at their ones.', [
      { text: `${d} has more tens than any other card. Put it first.` },
      { text: sameTens, equation: `${c % 10} > ${b % 10}, so ${c} comes before ${b}.` },
      { text: `Put ${a}, the smallest number, last. Check the whole row.`, equation: target.join(' > ') },
    ], { order: cards });
}
