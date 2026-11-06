import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-difference-of-container-volumes',
  level: 5,
  title: 'Water left after pouring',
  objective: 'Calculate container capacities and fractional contents, subtract the water poured, and express the remainder in the requested units.',
  skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05', 'P5.S.FRAC.05'],
  canonicalPatternId: 'p5-difference-of-container-volumes',
} as const;

type Fill = [number, number];
const properFills: Fill[] = [[1, 2], [2, 3], [4, 5]];
const squareSourceFills: Fill[] = [[1, 1], ...properFills];
const receivingFills: Fill[] = [[1, 2], [1, 3], [2, 3], [3, 4]];

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) >>> 0) + (index >>> 0)) % 4;
  const lengthA = rng.pick([45, 50, 55, 65]);
  const widthA = rng.pick([24, 28, 32, 36]);
  const heightA = rng.pick([30, 36, 42, 48]);

  let sourceFill: Fill = [1, 1];
  if (variant === 2) sourceFill = rng.pick(properFills);
  if (variant === 3) sourceFill = rng.pick(squareSourceFills);
  const receivingFill: Fill = variant === 2 ? rng.pick(receivingFills) : [1, 1];

  let dimensionsB: [number, number, number];
  let descriptionB: string;
  let capacityHintB: string;
  if (variant === 1) {
    const side = rng.pick([12, 14, 16, 18]);
    dimensionsB = [side, side, side];
    descriptionB = `Tank B is a cube with an inside edge length of ${side} cm.`;
    capacityHintB = 'A cube has three equal dimensions. Multiply them to find its capacity.';
  } else if (variant === 3) {
    const side = rng.pick([16, 18, 20, 24]);
    const height = rng.pick([12, 16, 24]);
    dimensionsB = [side, side, height];
    descriptionB = `Tank B is a cuboid with a square base. Each inside base edge is ${side} cm and its inside height is ${height} cm.`;
    capacityHintB = 'Find the area of the square base, then multiply by the height.';
  } else {
    const length = rng.pick([22, 26, 34, 38]);
    const width = rng.pick([8, 12, 16]);
    const height = rng.pick([12, 18, 24]);
    dimensionsB = [length, width, height];
    descriptionB = `Tank B is a cuboid. Its inside length is ${length} cm, width is ${width} cm and height is ${height} cm.`;
    capacityHintB = 'Multiply the inside length, width and height to find B’s capacity.';
  }

  const [lengthB, widthB, heightB] = dimensionsB;
  const [sourceNumerator, sourceDenominator] = sourceFill;
  const [receivingNumerator, receivingDenominator] = receivingFill;
  const sourceFull = sourceNumerator === sourceDenominator;
  const receiverFull = receivingNumerator === receivingDenominator;
  const capacityA = lengthA * widthA * heightA;
  const capacityB = lengthB * widthB * heightB;
  const initialWater = capacityA / sourceDenominator * sourceNumerator;
  const pouredWater = capacityB / receivingDenominator * receivingNumerator;
  const remainingWater = initialWater - pouredWater;

  // The smallest initial content is 16200 cm³. Every possible transfer is smaller.
  // Dimensions also make all selected fractional contents whole numbers of cm³.
  const initialFillText = sourceFull ? 'full' : `${sourceNumerator}/${sourceDenominator} full`;
  const finalFillText = receiverFull ? 'full' : `${receivingNumerator}/${receivingDenominator} full`;
  const context = [
    `Tank A is a cuboid. Its inside length is ${lengthA} cm, width is ${widthA} cm and height is ${heightA} cm.`,
    `Tank A starts ${initialFillText} of water.`,
    descriptionB,
    `Tank B starts empty. Water is poured from Tank A into Tank B until Tank B is ${finalFillText}. No water is spilled.`,
  ];

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: capacityHintB, equation: `${lengthB} × ${widthB} × ${heightB} = ${capacityB} cm³`},
    {
      text: sourceFull ? 'A starts full, so its initial water volume equals its capacity.' : 'Calculate the full capacity of A.',
      equation: `${lengthA} × ${widthA} × ${heightA} = ${capacityA} cm³`,
    },
  ];
  if (!sourceFull) {
    workedSteps.push({
      text: 'Find the fraction of A’s capacity that contains water at the start.',
      equation: `${capacityA} ÷ ${sourceDenominator} × ${sourceNumerator} = ${initialWater} cm³`,
    });
  }
  if (!receiverFull) {
    workedSteps.push({
      text: 'B starts empty. Its final water volume is the amount poured from A.',
      equation: `${capacityB} ÷ ${receivingDenominator} × ${receivingNumerator} = ${pouredWater} cm³`,
    });
  }
  workedSteps.push({
    text: receiverFull
      ? 'B receives one full tank of water. Subtract this from the water A had at the start.'
      : 'Subtract the amount poured from the water A had at the start.',
    equation: `${initialWater} − ${pouredWater} = ${remainingWater} cm³`,
  });

  let response: Pick<Question, 'prompt' | 'answer' | 'unit' | 'structuredResponse'>;
  if (variant === 0 || (variant === 3 && sourceFull)) {
    workedSteps.push({
      text: 'Convert the remainder to litres using 1000 cm³ = 1 litre.',
      equation: `${remainingWater} ÷ 1000 = ${remainingWater / 1000} litres`,
    });
    response = {
      prompt: '(a) What is the capacity of Tank B in cm³? (b) How much water is left in Tank A after pouring? Give part (b) in litres.',
      answer: JSON.stringify([String(capacityB), String(remainingWater / 1000)]),
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Capacity of Tank B (cm³)'},
          {label: '(b) Water left in Tank A (litres)', decimal: true},
        ],
      },
    };
  } else if (variant === 2) {
    response = {
      prompt: 'How much water is left in Tank A after pouring? Give your answer in cm³.',
      answer: String(remainingWater),
      unit: 'cm³',
    };
  } else {
    const litres = Math.floor(remainingWater / 1000);
    const millilitres = remainingWater % 1000;
    workedSteps.push({
      text: 'Each cm³ is 1 ml. Group the millilitres into litres of 1000 ml each.',
      equation: `${remainingWater} ml = ${litres} × 1000 ml + ${millilitres} ml = ${litres} litres ${millilitres} ml`,
    });
    response = {
      prompt: 'How much water is left in Tank A after pouring? Give your answer in litres and millilitres.',
      answer: JSON.stringify([String(litres), String(millilitres)]),
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: 'Litres',
        secondLabel: 'Millilitres',
      },
    };
  }

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    ...response,
    context,
    hint: 'Find how much water A starts with and how much empty B receives. Subtract, then check the units requested.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  };
}
