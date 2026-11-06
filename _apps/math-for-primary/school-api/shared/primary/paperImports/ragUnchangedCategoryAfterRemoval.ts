import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-unchanged-category-after-removal',
  level: 5,
  title: 'Find what stays and what leaves',
  objective: 'Use an unchanged group to connect fractions before and after removal and find missing counts.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P3.S.FRAC.01'],
  canonicalPatternId: 'p5-unchanged-category-after-removal',
};

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) + Math.trunc(index)) % 3 + 3) % 3;
  const make = (
    context: string[], prompt: string, answers: number[], hint: string,
    steps: string[], unit: string, labels?: [string, string],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: answers.length === 1 ? String(answers[0]) : JSON.stringify(answers.map(String)),
    unit,
    hint,
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
    ...(labels ? {
      structuredResponse: {
        kind: 'number-pair' as const,
        firstLabel: labels[0],
        secondLabel: labels[1],
      },
    } : {}),
  });

  if (variant === 0) {
    // First share, share of its complement, and smaller final first share.
    const [a, b, c, d, e, f] = r.pick([
      [2, 5, 1, 4, 1, 3],
      [3, 7, 2, 5, 1, 3],
      [3, 5, 1, 4, 1, 2],
      [2, 3, 2, 5, 3, 5],
      [3, 4, 1, 5, 2, 3],
      [4, 7, 1, 3, 2, 5],
    ]);
    const k = r.int(2, 9);
    const total = b * d * (f - e) * k;
    const red = a * d * (f - e) * k;
    const notRed = total - red;
    const yellow = (b - a) * (d - c) * (f - e) * k;
    const finalTotal = (b - a) * d * f * k;
    const redLeft = finalTotal - notRed;
    const removed = red - redLeft;
    return make([
      'A craft box holds only red, blue and yellow buttons.',
      `At first, ${a}/${b} of all the buttons are red.`,
      `Of the buttons that are not red, ${c}/${d} are blue. The other ${yellow} buttons are yellow.`,
      'Some red buttons are taken out. No blue or yellow buttons are taken out, and no buttons are added.',
      `After that, ${e}/${f} of the buttons left in the box are red.`,
    ],
    '(a) How many red buttons were in the box at first? (b) How many red buttons were taken out?',
    [red, removed],
    'Work back from the yellow buttons. The blue and yellow buttons stay in the box, so their combined number does not change.',
    [
      `Yellow buttons make up ${d - c} of ${d} equal parts of the buttons that are not red. Buttons that are not red: ${yellow} ÷ ${d - c} × ${d} = ${notRed}.`,
      `At first, the buttons that are not red make up ${b - a}/${b} of all the buttons. First total: ${notRed} ÷ ${b - a} × ${b} = ${total}.`,
      `(a) Red buttons at first: ${total} − ${notRed} = ${red}.`,
      `The same ${notRed} blue and yellow buttons now make up ${f - e}/${f} of the buttons left. New total: ${notRed} ÷ ${f - e} × ${f} = ${finalTotal}.`,
      `Red buttons left: ${finalTotal} − ${notRed} = ${redLeft}.`,
      `(b) Red buttons taken out: ${red} − ${redLeft} = ${removed}.`,
    ], 'buttons', ['(a) Red buttons at first', '(b) Red buttons taken out']);
  }

  if (variant === 1) {
    // Match the numerators because the square counters do not change.
    const [a, b, c, d] = r.pick([
      [2, 5, 3, 5],
      [3, 7, 2, 3],
      [3, 8, 3, 5],
      [4, 9, 2, 3],
      [2, 7, 3, 7],
      [3, 5, 4, 5],
      [4, 7, 5, 8],
    ]);
    const common = a * c / gcd(a, c);
    const beforeUnits = b * (common / a);
    const afterUnits = d * (common / c);
    const difference = beforeUnits - afterUnits;
    const k = r.pick([4, 7, 8, 9, 11, 12]);
    const removed = difference * k;
    const squares = common * k;
    return make([
      'A games tray contains only square and round counters.',
      `At first, ${a}/${b} of the counters are square.`,
      `${removed} round counters are taken away. All the square counters stay in the tray, and no counters are added.`,
      `Now ${c}/${d} of the counters in the tray are square.`,
    ],
    'How many square counters were in the tray at first?',
    [squares],
    'The square counters stay the same. Write the two fractions with the same numerator, then compare the total numbers of equal units.',
    [
      `Use ${common} equal units for the square counters at both times. These units have the same size because no square counters move.`,
      `At first, ${a}/${b} = ${common}/${beforeUnits}, so the first total is ${beforeUnits} units.`,
      `At the end, ${c}/${d} = ${common}/${afterUnits}, so the new total is ${afterUnits} units.`,
      `The counters taken away represent ${beforeUnits} − ${afterUnits} = ${difference} units.`,
      `One unit: ${removed} ÷ ${difference} = ${k} counters.`,
      `Square counters at first: ${common} × ${k} = ${squares}.`,
    ], 'counters');
  }

  // Adults and children wearing caps both stay; only the other children leave.
  const [a, b, c, d, e, f] = r.pick([
    [2, 5, 1, 4, 2, 3],
    [3, 7, 1, 5, 3, 4],
    [1, 2, 1, 4, 2, 3],
    [3, 5, 2, 5, 2, 3],
    [2, 3, 1, 4, 4, 5],
    [4, 7, 1, 5, 4, 5],
  ]);
  const k = r.pick([2, 3, 4, 5, 6, 7].filter(value => b * d * e * value !== 420));
  const total = b * d * e * k;
  const adults = a * d * e * k;
  const children = total - adults;
  const caps = (b - a) * c * e * k;
  const finalTotal = a * d * f * k;
  const finalChildren = finalTotal - adults;
  const withoutCaps = finalChildren - caps;
  return make([
    `A hall has ${total} visitors. They are all adults or children.`,
    `${a}/${b} of the visitors are adults.`,
    `${c}/${d} of the children wear caps; the other children do not.`,
    'Some children without caps leave the hall. Every adult and every child wearing a cap stays, and nobody enters. Nobody puts on or takes off a cap.',
    `Then ${e}/${f} of the visitors still in the hall are adults.`,
  ],
  '(a) How many adults were in the hall at first? (b) How many children without caps are in the hall at the end?',
  [adults, withoutCaps],
  'Find the adults and the children wearing caps first. Both groups stay. Use the adults to find the new total.',
  [
    `(a) Adults at first: ${total} ÷ ${b} × ${a} = ${adults}.`,
    `Children at first: ${total} − ${adults} = ${children}.`,
    `Children wearing caps: ${children} ÷ ${d} × ${c} = ${caps}. All of them stay.`,
    `The same ${adults} adults are now ${e}/${f} of the visitors. New total: ${adults} ÷ ${e} × ${f} = ${finalTotal}.`,
    `Children at the end: ${finalTotal} − ${adults} = ${finalChildren}.`,
    `(b) Children without caps at the end: ${finalChildren} − ${caps} = ${withoutCaps}.`,
  ], 'people', ['(a) Adults at first', '(b) Children without caps at the end']);
}
