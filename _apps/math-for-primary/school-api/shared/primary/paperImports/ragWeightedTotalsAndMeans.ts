import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-weighted-totals-and-means',
  level: 6,
  title: 'Combine totals and averages',
  objective: 'Find category totals using their sizes, then combine the totals and find an overall average when needed.',
  skillIds: ['P6.S.AVG.01', 'P6.S.AVG.02'],
  canonicalPatternId: 'p6-weighted-totals-and-means',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];

function explain(steps: Step[]): string {
  return steps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) % 3) + (Math.trunc(index) % 3) + 6) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 1) {
    // Each pair gives an exact whole-hour average across all seven days.
    const schedules: [number, number][] = [
      [3, 1], [3, 8], [4, 6], [5, 4], [6, 2],
      [9, 3], [10, 1], [10, 8], [11, 6], [12, 4],
    ];
    const [firstHours, laterHours] = r.pick(schedules);
    const firstTotal = 4 * firstHours;
    const laterTotal = 2 * laterHours;
    const total = firstTotal + laterTotal;
    const average = total / 7;
    const steps: Step[] = [
      {
        text: 'Monday to Thursday covers four days. Friday and Saturday cover two more days. Include Sunday too.',
        equation: '4 + 2 + 1 = 7 days',
      },
      {
        text: 'Find the working time from Monday to Thursday.',
        equation: `4 × ${firstHours} = ${firstTotal} h`,
      },
      {
        text: 'Find the working time on Friday and Saturday.',
        equation: `2 × ${laterHours} = ${laterTotal} h`,
      },
      {
        text: 'Add the working time for the whole week, including zero hours on Sunday.',
        equation: `${firstTotal} + ${laterTotal} + 0 = ${total} h`,
      },
      {
        text: 'Divide the total working time by all seven days.',
        equation: `${total} ÷ 7 = ${average} h`,
      },
    ];
    return {
      key,
      context: ['Mr Lim recorded his working time for one full week.'],
      prompt: 'What was his average working time per day for the whole week, including Sunday?',
      picture: {
        type: 'paper',
        layout: 'cards',
        heading: 'Working time during one week',
        cards: [
          {label: 'Monday to Thursday', value: `${firstHours} h per day`},
          {label: 'Friday and Saturday', value: `${laterHours} h per day`},
          {label: 'Sunday', value: '0 h per day'},
        ],
      },
      answer: String(average),
      unit: 'h',
      hint: 'Count how many days each card represents. Find the total hours, then divide by the number of days in the whole week.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  // Unequal sizes and different averages make the weighting essential.
  // These sizes and even differences give exact means with at most two decimal places.
  const sizes: [number, number][] = [
    [2, 6], [3, 5], [4, 6], [6, 10], [4, 12],
    [5, 15], [7, 3], [6, 4], [8, 2],
  ];
  const [countA, countB] = r.pick(sizes);
  const lower = r.int(6, 16);
  const higher = lower + r.pick([2, 4, 6, 8, 10]);
  const [meanA, meanB] = r.chance(0.5) ? [lower, higher] : [higher, lower];
  const totalA = countA * meanA;
  const totalB = countB * meanB;
  const total = totalA + totalB;
  const count = countA + countB;

  if (variant === 0) {
    const average = total / count;
    const steps: Step[] = [
      {
        text: 'Multiply Team A’s average by its number of children to find its total distance.',
        equation: `${countA} × ${meanA} = ${totalA} km`,
      },
      {
        text: 'Find Team B’s total distance in the same way.',
        equation: `${countB} × ${meanB} = ${totalB} km`,
      },
      {
        text: 'Add the distances covered by the two teams.',
        equation: `${totalA} + ${totalB} = ${total} km`,
      },
      {
        text: 'Count all the children in both teams.',
        equation: `${countA} + ${countB} = ${count} children`,
      },
      {
        text: 'Divide the combined distance by the combined number of children.',
        equation: `${total} ÷ ${count} = ${average} km`,
      },
    ];
    return {
      key,
      context: [
        'Two teams took part in a walking challenge. No child belonged to both teams.',
        `Team A has ${countA} children. Their average walking distance was ${meanA} km per child.`,
        `Team B has ${countB} children. Their average walking distance was ${meanB} km per child.`,
      ],
      prompt: 'What was the average distance walked per child for both teams together?',
      answer: String(average),
      unit: 'km',
      hint: 'First find each team’s total distance. Then use the total distance and the total number of children.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  const steps: Step[] = [
    {
      text: 'Find how many paper stars Group A folded by multiplying its average by its number of pupils.',
      equation: `${countA} × ${meanA} = ${totalA} paper stars`,
    },
    {
      text: 'Find how many paper stars Group B folded.',
      equation: `${countB} × ${meanB} = ${totalB} paper stars`,
    },
    {
      text: 'Add the group totals. The question asks for the total number of stars.',
      equation: `${totalA} + ${totalB} = ${total} paper stars`,
    },
  ];
  return {
    key,
    context: [
      'Two separate groups made paper stars during art week. Each pupil belonged to only one group.',
      `Group A has ${countA} pupils. They folded an average of ${meanA} paper stars per pupil.`,
      `Group B has ${countB} pupils. They folded an average of ${meanB} paper stars per pupil.`,
    ],
    prompt: 'How many paper stars did the pupils in both groups fold altogether?',
    answer: String(total),
    unit: 'paper stars',
    hint: 'An average multiplied by the group size gives that group’s total. Find both totals and add them.',
    workedSteps: steps,
    explanation: explain(steps),
  };
}
