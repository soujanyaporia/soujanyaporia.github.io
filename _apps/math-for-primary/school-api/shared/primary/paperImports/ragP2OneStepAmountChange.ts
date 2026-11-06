import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p2-one-step-amount-change',
  level: 2,
  title: 'Label a removal model',
  objective: 'Use a part-whole model to find and label an amount removed.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'p2-one-step-amount-change',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const total = rng.int(310, 890);
  const left = rng.int(105, total - 85);
  const used = total - left;
  const object = rng.pick(['apples', 'stickers', 'shells']);
  const name = rng.pick(['Mina', 'Arun', 'Hana']);
  const partSizes = [used, left];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'Complete the model by labelling each amount. The question mark shows the unknown part. How many were used?',
    context: [
      `${name} had ${total} ${object} at first.`,
      `After using some, ${left} ${object} were left.`,
    ],
    answer: JSON.stringify([String(total), String(used), String(left)]),
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: `All ${object} at first`},
        {label: `${object} used`},
        {label: `${object} left`},
      ],
    },
    picture: {
      type: 'paper',
      layout: 'bars',
      heading: 'Part-whole model',
      unit: object,
      rows: [
        {label: 'All at first', parts: [{size: total, label: String(total)}]},
        {label: 'After using some', parts: [
          {size: partSizes[0], label: '?'},
          {size: partSizes[1], label: String(left)},
        ]},
      ],
    },
    hint: 'The two parts make the whole. Subtract the amount left from the amount at first.',
    explanation: `${total} − ${left} = ${used}. The used amount and the amount left make ${total}.`,
    workedSteps: [
      {text: 'The whole amount is shown in the top bar.', equation: `All at first: ${total}`},
      {text: 'Subtract the amount left to find the part used.', equation: `${total} − ${left} = ${used}`},
      {text: 'Check that both parts make the whole.', equation: `${used} + ${left} = ${total}`},
    ],
  };
}
