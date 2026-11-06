import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-button-bag-counts',
  level: 3,
  title: 'Count the blue and yellow bags',
  objective: 'Use the total number of bags and buttons to find how many bags are of each colour.',
  skillIds: ['P3.S.MD.03', 'P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-two-rate-allocation',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.pick(['blue', 'blue', 'blue', 'yellow', 'either', 'both'] as const);
  const target = task === 'either' ? rng.pick(['blue', 'yellow'] as const) : task;
  const bags = rng.int(18, 38);
  const blueRate = rng.int(2, 5);
  const yellowRate = blueRate + rng.int(1, 3);
  const packedBlue = rng.int(3, bags - 3);
  const buttons = packedBlue * blueRate + (bags - packedBlue) * yellowRate;

  const startHigh = task === 'blue';
  const startColour = startHigh ? 'yellow' : 'blue';
  const foundColour = startHigh ? 'blue' : 'yellow';
  const startRate = startHigh ? yellowRate : blueRate;
  const firstTotal = bags * startRate;
  const difference = startHigh ? firstTotal - buttons : buttons - firstTotal;
  const changePerBag = yellowRate - blueRate;
  const found = difference / changePerBag;
  const remaining = bags - found;
  const blue = startHigh ? found : remaining;
  const yellow = startHigh ? remaining : found;

  const workedSteps = [
    {
      text: `Imagine all ${bags} bags were ${startColour}. How many buttons would they hold?`,
      equation: `${bags} × ${startRate} = ${firstTotal} buttons`,
    },
    {
      text: startHigh ? 'Find how many buttons you counted twice or extra by assuming every bag was yellow.'.replace('counted twice or extra', 'counted in excess') : 'Find how many buttons are missing from this first count.',
      equation: startHigh ? `${firstTotal} − ${buttons} = ${difference}` : `${buttons} − ${firstTotal} = ${difference}`,
    },
    {
      text: `Changing one ${startColour} bag to one ${foundColour} bag keeps the number of bags the same. It ${startHigh ? 'takes away' : 'adds'} this many buttons.`,
      equation: `${yellowRate} − ${blueRate} = ${changePerBag}`,
    },
    {
      text: `Divide the difference by the change for one bag. This tells us how many bags were ${foundColour}.`,
      equation: `${difference} ÷ ${changePerBag} = ${found} ${foundColour} bags`,
    },
    {
      text: `The rest of the bags were ${startColour}.`,
      equation: `${bags} − ${found} = ${remaining} ${startColour} bags`,
    },
    {
      text: 'Check the buttons in the blue bags and the yellow bags together.',
      equation: `${blue} × ${blueRate} + ${yellow} × ${yellowRate} = ${buttons} buttons`,
    },
  ];

  const common = {
    key,
    context: [
      `Mei filled ${bags} bags with buttons. Each bag was either blue or yellow.`,
      `She put ${blueRate} buttons in each blue bag and ${yellowRate} buttons in each yellow bag.`,
      `She used ${buttons} buttons in all.`,
    ],
    unit: 'bags',
    hint: `Imagine all the bags were ${startColour}. How would the button count change if just one bag were ${foundColour} instead?`,
    workedSteps,
    explanation: `Each ${foundColour} bag accounts for a change of ${changePerBag} in the button count. The difference of ${difference} buttons tells us there were ${found} ${foundColour} bags. The other ${remaining} bags were ${startColour}.`,
  };

  if (target === 'both') {
    return {
      ...common,
      prompt: 'How many blue bags and how many yellow bags did Mei fill?',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Blue bags', secondLabel: 'Yellow bags' },
      answer: JSON.stringify([String(blue), String(yellow)]),
    };
  }
  return {
    ...common,
    prompt: `How many ${target} bags did Mei fill?`,
    answer: String(target === 'blue' ? blue : yellow),
  };
}
