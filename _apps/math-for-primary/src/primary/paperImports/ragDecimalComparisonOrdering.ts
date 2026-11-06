import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-decimal-comparison-and-ordering',
  level: 5,
  title: 'Compare and order decimals',
  objective: 'Compare decimal place values to check strict bounds, order numbers, and identify the shortest duration.',
  skillIds: ['P4.S.DEC.02'],
  canonicalPatternId: 'decimal-comparison-and-ordering',
};

type Steps = NonNullable<Question['workedSteps']>;

function hundredths(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function tenths(value: number): string {
  return `${Math.floor(value / 10)}.${value % 10}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`decimal-family:${seed}`) >>> 0) + (index >>> 0)) % 4;
  const make = (
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: Steps,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const whole = r.int(0, 8);
    const digit = r.int(2, 8);
    const target = whole * 100 + digit * 10;
    const lower = hundredths(target - r.int(2, 7));
    const upper = hundredths(target + r.int(2, 7));
    const answer = `${whole}.${digit}`;
    const misplaced = `${whole}.0${digit}`;
    return make(
      'Which decimal fits both rules?',
      answer,
      'Write the decimals with the same number of places. Check both rules, and exclude the two limits.',
      [
        {
          text: 'Adding a zero at the end does not change a decimal value.',
          equation: `${answer} = ${hundredths(target)}`,
        },
        {
          text: 'Compare the whole-number parts, then the tenths and hundredths. This value satisfies both rules.',
          equation: `${lower} < ${hundredths(target)} < ${upper}`,
        },
        {
          text: `Neither limit is allowed. The other choice, ${misplaced}, is below ${lower}, so it cannot be chosen.`,
        },
      ],
      {
        context: [
          `The number must be greater than ${lower}.`,
          `The number must be less than ${upper}.`,
        ],
        choices: r.shuffle([answer, lower, upper, misplaced]),
      },
    );
  }

  if (variant === 2) {
    const base = r.int(14, 28) * 10;
    const times = r.shuffle([
      base + r.int(1, 4),
      base + r.int(5, 9),
      base + 10 + r.int(1, 4),
      base + 10 + r.int(5, 9),
    ]);
    const names = r.shuffle(['Alya', 'Ravi', 'Hana', 'Jun']);
    const rows = names.map((name, i) => ({name, time: times[i]}));
    const ranked = [...rows].sort((a, b) => a.time - b.time);
    const winner = ranked[0];
    return make(
      'Who completed the puzzle first?',
      winner.name,
      'Since everyone started together, find the shortest time. Compare whole seconds first, then tenths.',
      [
        {text: 'The child who took the least time finished first because everyone started together.'},
        {
          text: 'Compare the whole-number parts. If they match, compare the tenths.',
          equation: ranked.map(row => `${tenths(row.time)} s`).join(' < '),
        },
        {text: `${winner.name} took ${tenths(winner.time)} seconds, the shortest time.`},
      ],
      {
        context: [
          'Four children began identical puzzles at the same time. These are the times they took:',
          ...rows.map(row => `${row.name}: ${tenths(row.time)} seconds.`),
        ],
      },
    );
  }

  const descending = variant === 1;
  const whole = r.int(0, 9);
  const tenth = r.int(2, 7);
  const hundredth = r.int(1, 8);
  const thousandth = r.int(1, 9);
  const values = [
    `${whole}.${tenth}`,
    `${whole}.${tenth}${hundredth}`,
    `${whole}.${tenth}${hundredth}${thousandth}`,
    `${whole}.${tenth + 1}0`,
  ];
  const sorted = [...values].sort((a, b) => descending ? Number(b) - Number(a) : Number(a) - Number(b));
  let order = r.shuffle(values);
  if (order.join(',') === sorted.join(',')) order = [...order.slice(1), order[0]];
  const direction = descending ? 'largest to smallest' : 'smallest to largest';
  const sign = descending ? ' > ' : ' < ';
  return make(
    `Put these decimals in order, from ${direction}.`,
    sorted.join(','),
    'Line up the decimal points. Compare whole-number parts, tenths, hundredths and then thousandths.',
    [
      {
        text: 'Write each decimal to three places without changing its value.',
        equation: order.map(value => `${value} = ${Number(value).toFixed(3)}`).join('; '),
      },
      {
        text: 'The whole-number parts match. Compare tenths first, then hundredths and thousandths where needed.',
        equation: sorted.map(value => Number(value).toFixed(3)).join(sign),
      },
      {
        text: `Place the original decimals from ${direction}.`,
        equation: sorted.join(sign),
      },
    ],
    {order},
  );
}
