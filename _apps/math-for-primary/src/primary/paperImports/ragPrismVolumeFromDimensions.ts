import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-prism-volume-from-dimensions',
  level: 6,
  title: 'Water volume from tank measurements',
  objective: 'Find the water volume in a rectangular tank and convert cubic centimetres to litres.',
  skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05'],
  canonicalPatternId: 'p6-prism-volume-from-dimensions',
};

function litres(cm3: number): string {
  const whole = Math.floor(cm3 / 1000);
  const remainder = cm3 % 1000;
  return remainder === 0
    ? String(whole)
    : `${whole}.${String(remainder).padStart(3, '0').replace(/0+$/, '')}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const useDepth = r.int(0, 1) === 0;

  if (useDepth) {
    const length = r.pick([50, 60, 70, 90]);
    const width = r.pick([10, 30]);
    const depth = r.pick([10, 20, 40]);
    const height = depth + r.pick([10, 20, 30]);
    const baseArea = length * width;
    const waterCm3 = baseArea * depth;
    const capacityCm3 = baseArea * height;
    const answer = litres(waterCm3);
    const workedSteps = [
      {
        text: 'Find the area of the inside base.',
        equation: `${length} × ${width} = ${baseArea} cm²`,
      },
      {
        text: `The water is ${depth} cm deep. Use this depth, rather than the full tank height, to find the water volume.`,
        equation: `${baseArea} × ${depth} = ${waterCm3} cm³`,
      },
      {
        text: 'There are 1000 cm³ in 1 litre. Divide by 1000.',
        equation: `${waterCm3} ÷ 1000 = ${answer} litres`,
      },
    ];
    return {
      key,
      context: [
        `The inside of a rectangular tank is ${length} cm long, ${width} cm wide and ${height} cm high.`,
        `The tank is empty at first. Jo adds water until the water is ${depth} cm deep.`,
      ],
      prompt: 'How many litres of water are in the tank? Choose the correct answer.',
      unit: 'litres',
      answer,
      choices: r.shuffle([
        answer,
        litres(capacityCm3),
        String(waterCm3),
        String(capacityCm3),
      ]),
      hint: 'Use the water depth as the height. Then convert cubic centimetres to litres.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    };
  }

  const length = r.pick([21, 25, 27, 29, 31, 33]);
  const width = r.pick([12, 14, 16, 17, 19]);
  const [numerator, denominator] = r.pick([
    [1, 2], [1, 4], [3, 4], [2, 5],
    [3, 5], [4, 5], [1, 6], [5, 6],
  ]);
  const height = denominator * r.pick([4, 5, 7, 10]);
  const capacityCm3 = length * width * height;
  const waterCm3 = capacityCm3 / denominator * numerator;
  const answer = litres(waterCm3);
  const workedSteps = [
    {
      text: 'First find the volume the tank holds when full.',
      equation: `${length} × ${width} × ${height} = ${capacityCm3} cm³`,
    },
    {
      text: `Find ${numerator}/${denominator} of the full capacity.`,
      equation: `${capacityCm3} ÷ ${denominator} × ${numerator} = ${waterCm3} cm³`,
    },
    {
      text: 'There are 1000 cm³ in 1 litre. Divide by 1000.',
      equation: `${waterCm3} ÷ 1000 = ${answer} litres`,
    },
  ];
  return {
    key,
    context: [
      `The inside of a rectangular tank is ${length} cm long, ${width} cm wide and ${height} cm high.`,
      `Water fills ${numerator}/${denominator} of the tank's capacity.`,
    ],
    prompt: 'How much water is in the tank? Give your answer in litres. You may use a calculator.',
    unit: 'litres',
    answer,
    hint: 'Find the full capacity, take the fraction filled with water, then convert to litres.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
