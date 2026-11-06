import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-divisibility-clues',
  level: 2 as const,
  title: 'Find the number that fits the clues',
  objective: 'Use times tables to find the only total that fits the grouping clues and the given limits.',
  skillIds: ['P2.S.MD.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-divisibility-and-remainder-clues',
};

function positiveNumbersBelow(limit: number): number[] {
  return Array.from({ length: limit - 1 }, (_, i) => i + 1);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = ((hashString(String(seed)) + index) >>> 0) % 4;
  const build = (
    prompt: string, context: string[], answer: number, hint: string,
    workedSteps: NonNullable<Question['workedSteps']>, extra: Pick<Question, 'choices' | 'unit'> = {},
  ): Question => ({
    key, prompt, context, answer: String(answer), hint, workedSteps, ...extra,
    explanation: workedSteps.map(step => step.equation ? `${step.text} ${step.equation}.` : step.text).join(' '),
  });

  if (form === 0) {
    const [first, second] = rng.pick([[2, 5], [3, 4], [3, 5], [4, 5], [3, 10], [4, 10]] as const);
    const numbers = positiveNumbersBelow(10 * Math.min(first, second) + 1).filter(n => n >= Math.max(first, second));
    const answer = rng.pick(numbers.filter(n => n % first === 0 && n % second === 0));
    const firstOnly = rng.pick(numbers.filter(n => n % first === 0 && n % second !== 0));
    const secondOnly = rng.pick(numbers.filter(n => n % first !== 0 && n % second === 0));
    const neither = rng.pick(numbers.filter(n => n % first !== 0 && n % second !== 0));
    const choices = rng.shuffle([answer, firstOnly, secondOnly, neither]).map(String);
    const shortlist = choices.filter(value => Number(value) % first === 0);
    return build(`Which number makes full groups of ${first} and also full groups of ${second}, with none left over?`, [], answer,
      'Try the first group size. Check the numbers that work using the other group size too.', [
        { text: `Look for choices in the ${first} times table. These are ${shortlist.join(' and ')}.` },
        { text: `Try groups of ${second}. With ${firstOnly}, there would be ${firstOnly % second} left over. With ${answer}, every group is full.`, equation: `${answer} ÷ ${second} = ${answer / second}` },
      ], { choices });
  }

  if (form === 1) {
    // Each interval has several numbers from the first table and one in all three tables.
    const [first, second, third, minLimit, maxLimit] = rng.pick([
      [2, 3, 4, 16, 19], [5, 2, 4, 21, 25], [5, 10, 3, 31, 36], [4, 5, 10, 23, 37],
    ] as const);
    const limit = rng.int(minLimit, maxLimit);
    const candidates = positiveNumbersBelow(limit).filter(n => n >= 10 && n % first === 0);
    const shortlist = candidates.filter(n => n % second === 0);
    const answer = shortlist.find(n => n % third === 0)!;
    return build('Which number is on the card?', [
      `The card has a two-digit number less than ${limit}.`,
      `The number is in the ${first}, ${second} and ${third} times tables.`,
    ], answer, 'Start at the first two-digit number in one table. Stop before the limit, then try the other tables.', [
      { text: `List the two-digit numbers in the ${first} times table below ${limit}: ${candidates.join(', ')}.` },
      { text: `Keep the numbers also in the ${second} times table: ${shortlist.join(', ')}.` },
      { text: `Only ${answer} is also in the ${third} times table.`, equation: `${third} × ${answer / third} = ${answer}` },
    ]);
  }

  if (form === 2) {
    const children = rng.pick([2, 3, 4, 5, 10]);
    const each = rng.int(3, 8);
    const answer = children * each;
    const low = answer - rng.int(1, children);
    const high = answer + rng.int(2, children);
    return build('How many beads are in the jar?', [
      `There are more than ${low} beads and fewer than ${high} beads in the jar.`,
      `All the beads can be shared equally among ${children} children with none left over.`,
    ], answer, `Count in ${children}s. Look for a total after ${low} and before ${high}.`, [
      { text: `Find the totals near the two limits that ${children} children can share equally. Three in a row are ${answer - children}, ${answer} and ${answer + children}.` },
      { text: `Only ${answer} is strictly between ${low} and ${high}. Each child gets ${each} beads.`, equation: `${answer} ÷ ${children} = ${each}` },
    ], { unit: 'beads' });
  }

  const fullSize = rng.pick([3, 4, 5]);
  const otherSize = rng.pick([3, 4, 5].filter(size => size !== fullSize));
  // The sizes are coprime. In the first otherSize multiples of fullSize, each leftover occurs once.
  const answer = fullSize * rng.int(2, otherSize - 1);
  const left = answer % otherSize;
  const nextMatch = answer + fullSize * otherSize;
  const limit = rng.int(Math.max(answer + 1, 3 * fullSize + 1), Math.min(31, nextMatch));
  const candidates = positiveNumbersBelow(limit).filter(n => n % fullSize === 0);
  return build('How many buttons does Tara have?', [
    `Tara has some buttons, fewer than ${limit} in all.`,
    `She can make piles of ${fullSize} without leaving any buttons out.`,
    `If she makes piles of ${otherSize} instead, she has ${left} left over.`,
  ], answer, 'List the totals that make full piles. Try the other pile size with each total on your list.', [
    { text: `Count in ${fullSize}s and stop before ${limit}. The possible totals are ${candidates.join(', ')}.` },
    { text: `Check what is left with piles of ${otherSize}: ${candidates.map(n => `${n} leaves ${n % otherSize}`).join(', ')}.` },
    { text: `Only ${answer} leaves ${left} over.`, equation: `${Math.floor(answer / otherSize)} × ${otherSize} + ${left} = ${answer}` },
  ], { unit: 'buttons' });
}
