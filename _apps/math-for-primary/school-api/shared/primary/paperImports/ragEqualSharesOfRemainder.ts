import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-equal-shares-of-remainder',
  level: 6,
  title: 'Share what is left equally',
  objective: 'Form or evaluate an expression by subtracting deductions from a starting amount and dividing the remainder into equal shares.',
  skillIds: ['P6.S.ALG.01', 'P6.S.ALG.02', 'P6.S.ALG.04'],
  canonicalPatternId: 'p6-equal-shares-of-remainder',
} as const;

type Step = {text: string; equation?: string};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 4 + 4) % 4;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    unit: string,
    hint: string,
    workedSteps: Step[],
    wrong?: string[],
  ): Question => ({
    key,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...(wrong ? {choices: r.shuffle([answer, ...wrong])} : {}),
  });

  if (variant === 0) {
    const shares = r.pick([3, 5, 6, 7]);
    const coefficient = r.pick([2, 4, 5, 6]);
    // Construct a feasible total; the pupil still answers in terms of p.
    const total = shares * r.int(32, 48) + coefficient * r.int(1, 4);
    const answer = `(${total} - ${coefficient}p)/${shares}`;
    return make(
      [
        `Mira has ${total} counters.`,
        `She puts ${coefficient}p counters in a storage box.`,
        `She shares all the other counters equally among ${shares} pupils.`,
        'p is a positive whole number. Each pupil gets at least one counter, and none are left over.',
      ],
      'Which expression in terms of p gives the number of counters each pupil gets?',
      answer,
      'counters',
      'Subtract the counters put aside, then divide the whole remainder by the number of pupils.',
      [
        {text: 'Write the number of counters put aside.', equation: `${coefficient} × p = ${coefficient}p`},
        {text: 'Find the number available for sharing.', equation: `${total} - ${coefficient}p`},
        {text: `Share the entire remainder among ${shares} pupils.`, equation: `(${total} - ${coefficient}p) ÷ ${shares} = ${answer}`},
      ],
      [
        `(${total} - p)/${shares}`,
        `${total} - ${coefficient}p`,
        `(${total} + ${coefficient}p)/${shares}`,
      ],
    );
  }

  if (variant === 1) {
    const shares = r.pick([3, 5, 6, 7]);
    const deduction = r.int(7, 29);
    const each = r.int(6, 18);
    const total = shares * each + deduction;
    const remaining = total - deduction;
    return make(
      [
        'A craft group starts with m beads.',
        `It sets aside ${deduction} beads for a display.`,
        `All the other beads are shared equally among ${shares} pupils, with none left over.`,
        `m = ${total}.`,
      ],
      'How many beads does each pupil receive?',
      String(each),
      'beads',
      'Use the given value of m first. Subtract the beads set aside before sharing.',
      [
        {text: 'Substitute the given starting number.', equation: `m = ${total}`},
        {text: 'Find the number of beads available for sharing.', equation: `${total} - ${deduction} = ${remaining}`},
        {text: 'Find one equal share.', equation: `${remaining} ÷ ${shares} = ${each}`},
      ],
    );
  }

  if (variant === 2) {
    const count = r.pick([3, 4, 5, 6]);
    const shares = r.pick([2, 4, 5, 6]);
    const fare = r.pick([4, 5, 6, 7, 8]);
    const afterFare = shares * r.int(8, 14) + count * r.int(1, 4);
    const total = afterFare + fare;
    const answer = `(${afterFare} - ${count}p)/${shares}`;
    return make(
      [
        `Farah has $${total}.`,
        `She buys ${count} key rings at $p each.`,
        `She pays $${fare} for a bus ride.`,
        `She uses all her remaining money to buy ${shares} identical mugs.`,
        'All prices are positive whole numbers of dollars.',
      ],
      'Which expression in terms of p gives the cost of one mug in dollars?',
      answer,
      'dollars',
      'Find the total cost of the key rings. Subtract both expenses, then divide by the number of mugs.',
      [
        {text: 'Find the total cost of the key rings in dollars.', equation: `${count} × p = ${count}p`},
        {text: 'Subtract the key rings and the bus fare from the starting money.', equation: `${total} - ${count}p - ${fare} = ${afterFare} - ${count}p`},
        {text: `The remaining money pays for ${shares} equal-priced mugs.`, equation: `(${afterFare} - ${count}p) ÷ ${shares} = ${answer}`},
      ],
      [
        `(${total} - ${count}p)/${shares}`,
        `(${afterFare} - p)/${shares}`,
        `${afterFare} - ${count}p`,
      ],
    );
  }

  const total = r.pick([48, 56, 64, 72, 84, 96, 112, 128]);
  const count = r.pick([4, 6, 10, 12]);
  const answer = `${total / 2} - ${count / 2}x`;
  return make(
    [
      `A club has $${total}.`,
      `It buys ${count} packs of cards at $x per pack.`,
      'It gives half of the money left to a charity and keeps the other half.',
      'Each pack costs a positive whole number of dollars, and money remains after the purchase.',
    ],
    'Which expression in terms of x gives the amount the club keeps, in dollars?',
    answer,
    'dollars',
    'Subtract the purchase cost first. Giving away half leaves the other half.',
    [
      {text: 'Find the total purchase cost in dollars.', equation: `${count} × x = ${count}x`},
      {text: 'Subtract the purchase cost from the starting money.', equation: `${total} - ${count}x`},
      {text: 'The club keeps one of two equal halves.', equation: `(${total} - ${count}x) ÷ 2 = (${total} - ${count}x)/2`},
      {text: 'Divide both terms by 2.', equation: `(${total} - ${count}x)/2 = ${answer}`},
    ],
    [
      `${total / 2} - ${count}x`,
      `${total} - ${count / 2}x`,
      `${total} - ${count}x`,
    ],
  );
}
