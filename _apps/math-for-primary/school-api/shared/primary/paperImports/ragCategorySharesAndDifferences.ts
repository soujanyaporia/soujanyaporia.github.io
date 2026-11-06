import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-category-shares-and-differences',
  level: 5,
  title: 'Compare shares of a collection',
  objective: 'Use percentages and shares of a remainder to find a total, a category percentage or an allocation shortfall.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'p5-category-shares-and-differences',
} as const;

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + Math.trunc(index)) % 3 + 3) % 3;

  if (variant === 2) {
    const givenPercent = random.pick([20, 25, 30, 35, 45]);
    const receivedPercent = random.pick([20, 40, 60, 80]);
    const onePercent = random.int(3, 25);
    const originalTotal = 100 * onePercent;
    const keptPercent = 100 - givenPercent;
    const recipientPercent = givenPercent * receivedPercent / 100;
    const differencePercent = keptPercent - recipientPercent;
    const difference = differencePercent * onePercent;
    const extraPercent = givenPercent - recipientPercent;
    const extraStamps = extraPercent * onePercent;
    const workedSteps: Steps = [
      {
        text: 'Find the percentage of the original collection that Mei kept.',
        equation: `100% − ${givenPercent}% = ${keptPercent}%`,
      },
      {
        text: `Arun received ${receivedPercent}% of the part given away. Express his stamps as a percentage of the original collection.`,
        equation: `${givenPercent}% × ${receivedPercent} ÷ 100 = ${recipientPercent}%`,
      },
      {
        text: 'Find the difference between their shares of the original collection.',
        equation: `${keptPercent}% − ${recipientPercent}% = ${differencePercent}%`,
      },
      {
        text: `${differencePercent}% represents ${difference} stamps. Divide to find 1%, then multiply by 100 to find the original collection.`,
        equation: `${difference} ÷ ${differencePercent} × 100 = ${originalTotal} stamps`,
      },
      {
        text: 'Arun wants as many stamps as Mei gave to all her friends. Find the extra share he needs.',
        equation: `${givenPercent}% − ${recipientPercent}% = ${extraPercent}%`,
      },
      {
        text: 'Find this extra percentage of the original collection.',
        equation: `${originalTotal} ÷ 100 × ${extraPercent} = ${extraStamps} stamps`,
      },
    ];
    return {
      key,
      context: [
        'Mei had a collection of stamps.',
        `Mei gave ${givenPercent}% of her stamps to her friends.`,
        `Arun had no stamps before receiving ${receivedPercent}% of the stamps Mei gave away.`,
        `Arun then had ${difference} fewer stamps than Mei.`,
      ],
      prompt: 'How many more stamps must Arun buy to have as many stamps as Mei gave away to all her friends?',
      answer: String(extraStamps),
      unit: 'stamps',
      hint: 'Express both children’s stamps as percentages of Mei’s original collection. Use their difference, then compare Arun’s share with the whole share given away.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    };
  }

  // Each remainder splits into whole percentage shares in the stated ratio.
  // Red always exceeds green, and the four percentage choices are distinct.
  const [redPercent, greenParts, blueParts] = random.pick([
    [40, 2, 3],
    [55, 1, 2],
    [60, 3, 7],
    [52, 2, 1],
    [36, 1, 3],
    [65, 3, 4],
  ]);
  const ratioParts = greenParts + blueParts;
  const remainderPercent = 100 - redPercent;
  const greenPercent = remainderPercent / ratioParts * greenParts;
  const bluePercent = remainderPercent / ratioParts * blueParts;
  const onePercent = random.int(3, 24);
  const total = onePercent * 100;

  if (variant === 0) {
    const differencePercent = redPercent - greenPercent;
    const difference = differencePercent * onePercent;
    const workedSteps: Steps = [
      {
        text: 'Find the percentage of beads that are green or blue.',
        equation: `100% − ${redPercent}% = ${remainderPercent}%`,
      },
      {
        text: 'Add the parts in the ratio for the remaining beads.',
        equation: `${greenParts} + ${blueParts} = ${ratioParts} parts`,
      },
      {
        text: 'Find the green beads as a percentage of all the beads.',
        equation: `${remainderPercent}% ÷ ${ratioParts} × ${greenParts} = ${greenPercent}%`,
      },
      {
        text: 'Find the percentage represented by the extra red beads.',
        equation: `${redPercent}% − ${greenPercent}% = ${differencePercent}%`,
      },
      {
        text: `${differencePercent}% represents ${difference} beads. Find how many beads make up 1%.`,
        equation: `${difference} ÷ ${differencePercent} = ${onePercent} beads`,
      },
      {
        text: 'Find the number of beads that make up 100%.',
        equation: `${onePercent} × 100 = ${total} beads`,
      },
    ];
    return {
      key,
      context: [
        'An art club has a tub containing only red, green and blue beads.',
        `${redPercent}% of all the beads are red.`,
        `Among the remaining beads, the ratio of green beads to blue beads is ${greenParts} : ${blueParts}.`,
        `There are ${difference} more red beads than green beads.`,
      ],
      prompt: 'How many beads are in the tub altogether?',
      answer: String(total),
      unit: 'beads',
      hint: 'Split the remaining percentage using the ratio. Compare the red and green percentages to find the share represented by the given difference.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    };
  }

  const redCount = redPercent * onePercent;
  const remainingCount = total - redCount;
  const countPerPart = remainingCount / ratioParts;
  const blueCount = countPerPart * blueParts;
  const workedSteps: Steps = [
    {
      text: 'Remove the red counters from the total to find the green and blue counters together.',
      equation: `${total} − ${redCount} = ${remainingCount} counters`,
    },
    {
      text: 'Add the parts in the green-to-blue ratio.',
      equation: `${greenParts} + ${blueParts} = ${ratioParts} parts`,
    },
    {
      text: 'Find the number of counters in one ratio part.',
      equation: `${remainingCount} ÷ ${ratioParts} = ${countPerPart} counters`,
    },
    {
      text: 'Find the number of blue counters.',
      equation: `${countPerPart} × ${blueParts} = ${blueCount} counters`,
    },
    {
      text: 'Express the blue counters as a percentage of all the counters.',
      equation: `${blueCount} ÷ ${total} × 100% = ${bluePercent}%`,
    },
  ];
  return {
    key,
    context: [
      `A tray holds ${total} counters. Each counter is red, green or blue.`,
      `${redCount} counters are red.`,
      `The ratio of green counters to blue counters is ${greenParts} : ${blueParts}.`,
    ],
    prompt: 'What percentage of all the counters are blue?',
    answer: String(bluePercent),
    choices: random.shuffle([bluePercent, greenPercent, remainderPercent, redPercent].map(String)),
    unit: '%',
    hint: 'Find the remaining counters and split them using the ratio. Use the total number of counters when converting the blue count to a percentage.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
