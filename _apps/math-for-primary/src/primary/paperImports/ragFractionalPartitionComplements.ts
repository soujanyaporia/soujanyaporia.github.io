import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fractional-partition-complements',
  level: 5,
  title: 'Parts of a collection',
  objective: 'Use fractions of one whole to compare groups, track removals and decide what can be known.',
  skillIds: ['P5.S.FRAC.05', 'P4.S.FRAC.04', 'P3.S.FRAC.03'],
  canonicalPatternId: 'p5-fractional-partition-and-complements',
};

type Steps = NonNullable<Question['workedSteps']>;
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const lcm = (a: number, b: number): number => a / gcd(a, b) * b;
const fraction = (n: number, d: number): string => {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};
const explain = (steps: Steps): string => steps
  .map(step => `${step.text}${step.equation ? ' ' + step.equation : ''}`)
  .join(' ');

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const variant = r.int(0, 2);

  if (variant === 0) {
    const shares: readonly (readonly [number, number])[] = [
      [1, 3], [1, 4], [1, 5], [2, 5], [1, 6],
      [3, 8], [2, 9], [3, 10], [5, 12],
    ];
    const [n, d] = r.pick(shares);
    const onePart = r.int(15, 30);
    const total = d * onePart;
    const square = n * onePart;
    const round = total - square;
    const difference = round - square;
    const workedSteps: Steps = [
      {text: 'Find the number of buttons in one equal part.', equation: `${total} ÷ ${d} = ${onePart}`},
      {text: 'Find the number of square buttons.', equation: `${onePart} × ${n} = ${square}`},
      {text: 'All the other buttons are round.', equation: `${total} − ${square} = ${round}`},
      {text: 'Compare the two groups.', equation: `${round} − ${square} = ${difference} buttons`},
    ];
    return {
      key,
      context: [
        `A craft box holds ${total} buttons.`,
        `${n}/${d} of the buttons are square. The other buttons are round.`,
      ],
      prompt: 'How many more round buttons than square buttons are in the box?',
      answer: String(difference),
      unit: 'buttons',
      hint: 'Find each group first. Then subtract the smaller group from the larger group.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  if (variant === 1) {
    const partitions: readonly (readonly [number, number])[] = [[1, 3], [1, 4], [2, 7], [3, 8]];
    const gifts: readonly (readonly [number, number])[] = [[1, 2], [2, 3], [3, 5]];
    const finalShares: readonly (readonly [number, number])[] = [[1, 5], [1, 4], [1, 6]];
    const [pn, pd] = r.pick(partitions);
    const [gn, gd] = r.pick(gifts);
    const [fn, fd] = r.pick(finalShares);
    // These multiples make every count integral. All totals are between 120 and 900.
    const block = lcm(lcm(pd * gd, fd), 3);
    const total = block * r.int(Math.ceil(120 / block), Math.floor(900 / block));
    const banana = total / pd * pn;
    const oat = total - banana;
    const oatGift = oat / gd * gn;
    const finalLeft = total / fd * fn;
    // Keep at least two banana muffins available and at least two muffins for helpers.
    const maxFixed = Math.min(banana - 2, total - oatGift - finalLeft - 2);
    const fixed = r.int(5, maxFixed);
    const firstGift = fixed + oatGift;
    const afterVisitors = total - firstGift;
    const helpers = afterVisitors - finalLeft;
    const workedSteps: Steps = [
      {text: 'Find the original number of banana muffins.', equation: `${total} ÷ ${pd} × ${pn} = ${banana}`},
      {text: 'The rest of the original batch consists of oat muffins.', equation: `${total} − ${banana} = ${oat}`},
      {text: '(a) Apply the visitors’ fraction to the oat muffins only.', equation: `${oat} ÷ ${gd} × ${gn} = ${oatGift} oat muffins`},
      {text: 'Add both kinds packed for visitors.', equation: `${fixed} + ${oatGift} = ${firstGift}`},
      {text: 'Find how many muffins remain after packing for visitors.', equation: `${total} − ${firstGift} = ${afterVisitors}`},
      {text: 'The final fraction refers to the original batch.', equation: `${total} ÷ ${fd} × ${fn} = ${finalLeft}`},
      {text: '(b) Subtract the final number left to find the helpers’ share.', equation: `${afterVisitors} − ${finalLeft} = ${helpers} muffins`},
    ];
    return {
      key,
      context: [
        `A school kitchen prepares ${total} banana muffins and oat muffins altogether.`,
        `${pn}/${pd} of all the muffins are banana muffins. The rest are oat muffins.`,
        `The cook packs ${fixed} banana muffins and ${gn}/${gd} of the oat muffins for visitors.`,
        `Next, the cook gives the helpers some of each kind of muffin still in the kitchen. Afterwards, ${fn}/${fd} of the original total number of muffins is left.`,
      ],
      prompt: '(a) How many oat muffins are packed for the visitors? (b) How many muffins go to the helpers?',
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Oat muffins for visitors (muffins)'},
          {label: '(b) All muffins for helpers (muffins)'},
        ],
      },
      answer: JSON.stringify([String(oatGift), String(helpers)]),
      hint: 'The first fraction removed is a fraction of the oat muffins. The final fraction is a fraction of the original total.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  const denominator = r.pick([6, 8, 10, 12]);
  const children = r.int(2, denominator - 2);
  const women = r.int(1, denominator - children - 1);
  const adults = denominator - children;
  const men = adults - women;
  const first = men === women ? 'True' : 'False';
  const second = children > 2 * men ? 'Impossible to tell' : 'False';
  const verdicts = ['True', 'False', 'Impossible to tell'];
  const choices = verdicts.flatMap(a => verdicts.map(b => `(a) ${a}; (b) ${b}`));
  const workedSteps: Steps = [
    {text: 'Adults make up the part that is not children.', equation: `1 − ${fraction(children, denominator)} = ${fraction(adults, denominator)}`},
    {text: 'Subtract the women’s share to find the men’s share.', equation: `${adults}/${denominator} − ${women}/${denominator} = ${men}/${denominator}`},
    {
      text: `(a) Compare the men’s share with the women’s share. The statement is ${first}.`,
      equation: `${men}/${denominator} ${men === women ? '=' : '≠'} ${women}/${denominator}`,
    },
  ];
  if (second === 'False') {
    workedSteps.push({
      text: '(b) Twice the number of men is at least the number of children.',
      equation: `2 × ${men}/${denominator} = ${2 * men}/${denominator} ≥ ${children}/${denominator}`,
    });
    workedSteps.push({
      text: 'Girls are fewer than half of the children because boys outnumber girls. Half of the children is no more than the number of men. So girls are fewer than men, and (b) is False.',
    });
  } else {
    const exampleTotal = 6 * denominator;
    const exampleChildren = 6 * children;
    const exampleWomen = 6 * women;
    const exampleMen = 6 * men;
    const moreGirls = exampleMen + 1;
    workedSteps.push({
      text: `(b) To check what is possible, imagine ${exampleTotal} people: ${exampleChildren} children, ${exampleWomen} women and ${exampleMen} men. This fits both given fractions.`,
    });
    workedSteps.push({
      text: `There could be 1 girl and ${exampleChildren - 1} boys. Then girls are fewer than men. There could instead be ${moreGirls} girls and ${exampleChildren - moreGirls} boys. Then girls outnumber men. Both examples have more boys than girls, so (b) is Impossible to tell.`,
    });
  }
  return {
    key,
    context: [
      'A community walk has adults and children. Every adult is a man or a woman, and every child is a boy or a girl.',
      `Of all the people, ${fraction(children, denominator)} are children and ${fraction(women, denominator)} are women.`,
      'There are more boys than girls.',
    ],
    prompt: '(a) The number of men equals the number of women. (b) There are more girls than men. Choose a pair of answers, one for each statement.',
    choices: r.shuffle(choices),
    answer: `(a) ${first}; (b) ${second}`,
    hint: 'Find the men’s share first. Then consider whether the number of girls is fixed by the information.',
    workedSteps,
    explanation: explain(workedSteps),
  };
}
