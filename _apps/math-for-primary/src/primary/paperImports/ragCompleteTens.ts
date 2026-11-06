import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-count-complete-tens',
  level: 2 as const,
  title: 'Count the tens',
  objective: 'Express a whole total in tens, finding the product first when two factors are shown.',
  skillIds: ['P2.S.WN.02', 'P2.S.MD.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-complete-tens-in-a-total',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if (rng.chance(0.5)) {
    const table = rng.pick([5, 10]);
    const factor = table === 5 ? rng.pick([4, 8, 10]) : rng.int(2, 9);
    const total = table * factor;
    const tens = total / 10;
    return {
      key,
      prompt: 'Fill the box with the number of tens.',
      display: `${table} × ${factor} = □ tens`,
      answer: String(tens),
      unit: 'tens',
      hint: 'Multiply first. Then count how many groups of ten make that total.',
      workedSteps: [
        { text: 'Find the total.', equation: `${table} × ${factor} = ${total}` },
        { text: 'Count one ten for each group of 10.', equation: `${total} ÷ 10 = ${tens}` },
      ],
      explanation: `${table} times ${factor} makes ${total}. That is ${tens} tens.`,
      proof: { op: '/', a: { op: '*', a: table, b: factor }, b: 10 },
    };
  }

  const choice = rng.chance(0.5);
  const hundreds = rng.int(2, 9);
  const extraTens = choice ? rng.int(1, 7) : 0;
  const total = hundreds * 100 + extraTens * 10;
  const tensFromHundreds = hundreds * 10;
  const tens = total / 10;
  return {
    key,
    prompt: choice ? 'Choose the number that belongs in the box.' : 'Write the number that belongs in the box.',
    display: `${total} = □ tens`,
    answer: String(tens),
    unit: 'tens',
    ...(choice ? { choices: rng.shuffle([tens, extraTens, tensFromHundreds, hundreds * 100].map(String)) } : {}),
    hint: 'Each hundred makes ten tens. Look for any more tens after the hundreds.',
    workedSteps: [
      { text: 'Count ten tens for each hundred.', equation: `${hundreds} hundreds = ${tensFromHundreds} tens` },
      extraTens > 0
        ? { text: 'Add the tens left after counting the hundreds.', equation: `${tensFromHundreds} + ${extraTens} = ${tens}` }
        : { text: 'Check how many groups of ten make the whole number.', equation: `${tens} × 10 = ${total}` },
    ],
    explanation: `${tens} groups of ten make ${total}, so the box holds ${tens}.`,
    proof: { op: '/', a: total, b: 10 },
  };
}
