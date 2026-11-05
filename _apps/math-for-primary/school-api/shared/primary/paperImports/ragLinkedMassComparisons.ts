import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-linked-mass-comparisons',
  level: 3,
  title: 'Compare three parcel masses',
  objective: 'Convert a mass to grams, follow two linked comparisons, and express the final mass in kilograms and grams.',
  skillIds: ['P3.S.AS.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03'],
  canonicalPatternId: 'compound-mass-add-then-subtract-linked-parts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const greenKg = r.int(1, 4);
  const greenGrams = r.pick([120, 230, 340, 450, 560, 670, 780, 890]);
  const extra = r.int(21, 39) * 100 + r.pick([20, 40, 60, 80]);
  const less = r.int(11, 20) * 100 + r.pick([10, 30, 50, 70, 90]);
  // extra > less: green < red < blue. Every mass stays below 10000 g.
  const green = greenKg * 1000 + greenGrams;
  const blue = green + extra;
  const red = blue - less;
  const redKg = Math.floor(red / 1000);
  const redGrams = red % 1000;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Each kilogram is 1000 grams. Write the green parcel’s mass in grams.',
      equation: `${greenKg} kg ${greenGrams} g = ${green} g`,
    },
    {
      text: '(a) The blue parcel is heavier than the green parcel, so add the extra mass.',
      equation: `${green} g + ${extra} g = ${blue} g`,
    },
    {
      text: '(b) The red parcel is lighter than the blue parcel, so subtract from the mass found in (a).',
      equation: `${blue} g − ${less} g = ${red} g`,
    },
    {
      text: 'Group the grams into thousands. Write the whole kilograms and the grams left over.',
      equation: `${red} g = ${redKg} kg ${redGrams} g`,
    },
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `The red parcel weighs ${less} g less than the blue parcel.`,
      `The blue parcel weighs ${extra} g more than the green parcel.`,
      `The green parcel has a mass of ${greenKg} kg ${greenGrams} g.`,
    ],
    prompt: '(a) Find the mass of the blue parcel in grams. (b) Find the mass of the red parcel in kilograms and grams.',
    answer: JSON.stringify([String(blue), String(redKg), String(redGrams)]),
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: '(a) Blue parcel (g)'},
        {label: '(b) Red parcel: kilograms'},
        {label: '(b) Red parcel: remaining grams'},
      ],
    },
    hint: 'Write the green parcel’s mass in grams first. Find the blue parcel’s mass before finding the red parcel’s mass.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
