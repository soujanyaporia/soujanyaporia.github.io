import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-two-quantities-sum-difference',
  level: 3,
  title: 'Two numbers and their difference',
  objective: 'Use a difference to find the total of two quantities, or use their total and difference to find the smaller quantity.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'two-quantities-sum-and-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  // Alternate the two tasks. Each pair of total questions includes one of each response format.
  const slot = ((hashString(String(seed)) + index) >>> 0) % 4;

  if (slot % 2 === 1) {
    const green = rng.int(155, 408);
    const extra = rng.int(51, 95);
    const total = green * 2 + extra;
    const equalTotal = total - extra;
    return {
      key,
      context: [
        `A blue jar and a green jar hold ${total} buttons altogether.`,
        `The blue jar has ${extra} more buttons than the green jar.`,
      ],
      prompt: 'How many buttons are in the green jar?',
      answer: String(green),
      unit: 'buttons',
      hint: 'Imagine taking the extra buttons out of the blue jar. How would the two jars compare then?',
      workedSteps: [
        { text: 'Set aside the extra buttons from the blue jar. Both jars now hold the same number.', equation: `${total} − ${extra} = ${equalTotal}` },
        { text: 'Half of the buttons left are in the green jar.', equation: `${equalTotal} ÷ 2 = ${green}` },
      ],
      explanation: `After you set aside the ${extra} extra buttons, the ${equalTotal} buttons left make two equal groups. The green jar holds ${green} buttons.`,
      proof: { op: '/', a: { op: '-', a: total, b: extra }, b: 2 },
    };
  }

  const smaller = rng.int(915, 1690);
  const gap = rng.int(125, 318);
  const larger = smaller + gap;
  const total = smaller + larger;
  return {
    key,
    context: [
      `One card shows ${smaller}.`,
      `The number on the other card is ${gap} more than the number on the first card.`,
    ],
    prompt: 'What do the two numbers add up to?',
    answer: String(total),
    ...(slot === 0 ? { choices: rng.shuffle([larger, smaller + smaller, total, larger + larger].map(String)) } : {}),
    hint: 'Find the number on the other card first. Which two numbers should you add?',
    workedSteps: [
      { text: 'Add the difference to the first number to find the number on the other card.', equation: `${smaller} + ${gap} = ${larger}` },
      { text: 'Add the numbers on the two cards.', equation: `${smaller} + ${larger} = ${total}` },
    ],
    explanation: `The other card shows ${larger}. Adding it to the ${smaller} on the first card gives ${total}.`,
    proof: { op: '+', a: smaller, b: { op: '+', a: smaller, b: gap } },
  };
}
