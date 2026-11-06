import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-digit-card-extremes',
  level: 1,
  title: 'Build numbers with digit cards',
  objective: 'Choose the tens card first to make the smallest allowed number or to find both the smallest and greatest numbers.',
  skillIds: ['P1.S.WN.02', 'P1.S.WN.04'],
  canonicalPatternId: 'p1-extreme-number-from-digit-cards',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const anchor = rng.pick([0, 3, 5]);
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== anchor);
  const cards = rng.shuffle([anchor, ...rng.shuffle(pool).slice(0, 3)]);
  const ascending = [...cards].sort((a, b) => a - b);
  const tensCards = ascending.filter(d => d > 0);
  const largestCard = ascending[3];
  const base = {
    key,
    picture: { type: 'pattern' as const, items: cards.map(String) },
  };
  const rules = [
    'Choose two cards for each number. Use one for the tens and the other for the ones.',
    'The tens digit must be from 1 to 9.',
  ];

  if (((seed + index) & 1) === 0) {
    // There are at least three nonzero cards. Keep a smaller tens card to rule out.
    const tensIndex = rng.int(1, tensCards.length - 2);
    const tens = tensCards[tensIndex];
    const previous = tensCards[tensIndex - 1];
    const remaining = ascending.filter(d => d !== tens);
    const firstTry = 10 * tens + remaining[0];
    const lower = rng.pick([10 * (previous + 1), firstTry]);
    const upper = rng.pick([10 * (tens + 1), 100]);
    const ones = remaining.find(d => 10 * tens + d > lower && 10 * tens + d < upper)!;
    const answer = 10 * tens + ones;
    const previousBest = 10 * previous + largestCard;
    const onesStep = firstTry === lower
      ? `${firstTry} equals the lower limit. Try the next ones card, ${ones}, to get ${answer}.`
      : `${ones} is the smallest card left. Using it for the ones gives ${answer}.`;
    const workedSteps = [
      { text: `With ${previous} tens, even ${largestCard} ones gives only ${previousBest}. Fewer tens would make an even smaller number. Try ${tens} tens.`, equation: `${previousBest} < ${lower}` },
      { text: onesStep, equation: `${tens} tens and ${ones} ones = ${answer}` },
      { text: 'Check that the number is between the two limits.', equation: `${lower} < ${answer} < ${upper}` },
    ];
    return {
      ...base,
      prompt: 'What is the smallest two-digit number you can build?',
      context: [...rules, `Your number must be greater than ${lower} and less than ${upper}.`],
      answer: String(answer),
      hint: 'Try the tens cards from smallest to largest. Look for a ones card that puts your number between the limits.',
      workedSteps,
      explanation: `${workedSteps[0].text} ${onesStep} The smallest number that fits is ${answer}.`,
    };
  }

  const smallTens = tensCards[0];
  const smallOnes = ascending.find(d => d !== smallTens)!;
  const largeOnes = ascending[2];
  const smallest = 10 * smallTens + smallOnes;
  const greatest = 10 * largestCard + largeOnes;
  const workedSteps = [
    { text: `For the smallest number, ${smallTens} is the smallest card you can put first.`, equation: `${smallTens} tens = ${10 * smallTens}` },
    { text: `The smallest card left is ${smallOnes}. Put it in the ones place.`, equation: `${smallTens} tens and ${smallOnes} ones = ${smallest}` },
    { text: `Start again with all four cards. Use ${largestCard}, the largest card, for the tens. Then choose ${largeOnes}, the largest card left, for the ones.`, equation: `${largestCard} tens and ${largeOnes} ones = ${greatest}` },
  ];
  return {
    ...base,
    prompt: 'What are the smallest and greatest two-digit numbers you can build?',
    context: [...rules, 'Put the cards back before making the second number.'],
    structuredResponse: { kind: 'number-pair', firstLabel: 'Smallest number', secondLabel: 'Greatest number' },
    answer: JSON.stringify([String(smallest), String(greatest)]),
    hint: 'Choose the tens first. Try the smallest tens card for the first box and the largest tens card for the second.',
    workedSteps,
    explanation: `${smallTens} tens and ${smallOnes} ones make the smallest number, ${smallest}. ${largestCard} tens and ${largeOnes} ones make the greatest number, ${greatest}.`,
  };
}
