import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-cuboid-filling-and-draining',
  level: 5,
  title: 'Filling and draining rectangular tanks',
  objective: 'Find the volume of water to move, convert units, and use a steady flow rate to find the time needed.',
  skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05', 'P5.S.FRAC.05', 'P5.S.RATE.02', 'P5.S.DEC.02'],
  canonicalPatternId: 'p5-cuboid-filling-and-draining',
};

type Steps = NonNullable<Question['workedSteps']>;
const exact = (value: number): string => String(Number(value.toFixed(3)));

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed % 3) + (index % 3) + 6) % 3;
  const make = (
    context: string[], prompt: string, answer: string,
    hint: string, workedSteps: Steps, extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const length = r.int(5, 13) * 4;
    const width = r.int(4, 9) * 5;
    const height = r.int(3, 7) * 6;
    const [numerator, denominator] = r.pick([
      [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5],
    ]);
    const capacityMl = length * width * height;
    const waterMl = capacityMl * numerator / denominator;
    // Require a rounding decision: the exact duration is not already a tenth.
    const possibleRates = [7, 9, 11, 13, 14, 17, 19].filter(rate => waterMl % (6 * rate) !== 0);
    const rate = r.pick(possibleRates);
    const answer = (Math.round(waterMl / (6 * rate)) / 10).toFixed(1);
    return make(
      [
        `The inside of a rectangular tank measures ${length} cm by ${width} cm by ${height} cm.`,
        `The tank is ${numerator}/${denominator} full of water.`,
        `Water drains out at a steady rate of ${rate} ml per second. No water enters the tank.`,
      ],
      'How many minutes will it take to empty the tank? Give your answer correct to 1 decimal place.',
      answer,
      'Find the starting volume of water. Divide by the rate, then change seconds to minutes before rounding.',
      [
        {text: 'Multiply the inside dimensions to find the full capacity.', equation: `${length} × ${width} × ${height} = ${capacityMl} cm³`},
        {text: 'Find the fraction of the capacity occupied by water.', equation: `${capacityMl} ÷ ${denominator} × ${numerator} = ${waterMl} cm³`},
        {text: 'One cubic centimetre holds one millilitre.', equation: `${waterMl} cm³ = ${waterMl} ml`},
        {text: 'Divide the water volume by the amount draining each second. Keep this value unrounded.', equation: `Time in seconds = ${waterMl} ÷ ${rate}`},
        {text: 'There are 60 seconds in a minute. Convert, then round to one decimal place.', equation: `${waterMl} ÷ ${rate} ÷ 60 ≈ ${answer} min`},
      ],
      {unit: 'min'},
    );
  }

  if (variant === 1) {
    const length = r.pick([35, 45, 55, 65, 75]);
    const width = r.pick([20, 30, 40]);
    const height = r.pick([16, 24, 32]);
    const capacityMl = length * width * height;
    const capacityL = capacityMl / 1000;
    const possibleRates = [2, 3, 4, 6, 7, 8, 9, 10].filter(rate =>
      (capacityMl * 10) % (1000 * rate) === 0 &&
      capacityMl / (1000 * rate) >= 0.5 && capacityMl / (1000 * rate) <= 60,
    );
    const rate = r.pick(possibleRates);
    const answer = exact(capacityMl / (1000 * rate));
    return make(
      [
        `The inside of an empty rectangular tank measures ${length} cm by ${width} cm by ${height} cm.`,
        `A tap adds water at a steady rate of ${rate} L per minute. No water leaves the tank.`,
      ],
      'How many minutes does the tap take to fill the tank?',
      answer,
      'Calculate the capacity in cubic centimetres, convert it to litres, then divide by the litres added each minute.',
      [
        {text: 'Find the capacity of the empty tank.', equation: `${length} × ${width} × ${height} = ${capacityMl} cm³`},
        {text: 'Use 1000 cm³ = 1 L.', equation: `${capacityMl} ÷ 1000 = ${exact(capacityL)} L`},
        {text: 'Divide the volume needed by the flow rate.', equation: `${exact(capacityL)} ÷ ${rate} = ${answer} min`},
      ],
      {unit: 'min'},
    );
  }

  // Each shape has whole-number dimensions and an even full height.
  // The pupil sees relationships and water depth, not these dimensions.
  const shape = r.pick([
    {height: 20, width: 30, length: 40, wn: 3, wd: 2, ln: 4, ld: 3},
    {height: 24, width: 30, length: 40, wn: 5, wd: 4, ln: 4, ld: 3},
    {height: 30, width: 40, length: 50, wn: 4, wd: 3, ln: 5, ld: 4},
    {height: 20, width: 28, length: 35, wn: 7, wd: 5, ln: 5, ld: 4},
  ]);
  const scale = r.int(1, 2);
  const height = shape.height * scale;
  const width = shape.width * scale;
  const length = shape.length * scale;
  const depth = height / 2;
  const capacityMl = length * width * height;
  const waterNeededMl = capacityMl / 2;
  const capacityL = capacityMl / 1000;
  const waterNeededL = waterNeededMl / 1000;
  const possibleRates = [2, 3, 4, 5, 7, 8, 9, 10, 12].filter(rate =>
    (waterNeededMl * 10) % (1000 * rate) === 0 &&
    waterNeededMl / (1000 * rate) >= 0.5 && waterNeededMl / (1000 * rate) <= 60,
  );
  const rate = r.pick(possibleRates);
  const minutes = exact(waterNeededMl / (1000 * rate));
  return make(
    [
      `A rectangular tank is half full of water. The water is ${depth} cm deep.`,
      `The inside width is ${shape.wn}/${shape.wd} of the tank's full inside height. The inside length is ${shape.ln}/${shape.ld} of its inside width.`,
      `A tap adds water at a steady rate of ${rate} L per minute. No water leaves the tank.`,
    ],
    '(a) What is the capacity of the tank in litres? (b) How many minutes will the tap take to fill the rest of the tank?',
    JSON.stringify([exact(capacityL), minutes]),
    'Half full means the water reaches half the full height. Find all three dimensions for part (a), then use the empty half for part (b).',
    [
      {text: 'The full height is twice the water depth.', equation: `${depth} × 2 = ${height} cm`},
      {text: 'Use the given fraction of the full height to find the width.', equation: `${height} ÷ ${shape.wd} × ${shape.wn} = ${width} cm`},
      {text: 'Use the given fraction of the width to find the length.', equation: `${width} ÷ ${shape.ld} × ${shape.ln} = ${length} cm`},
      {text: '(a) Multiply the dimensions, then convert to litres.', equation: `${length} × ${width} × ${height} = ${capacityMl} cm³ = ${exact(capacityL)} L`},
      {text: '(b) The empty half is the volume that must be added.', equation: `${exact(capacityL)} ÷ 2 = ${exact(waterNeededL)} L`},
      {text: 'Divide the volume to be added by the amount added each minute.', equation: `${exact(waterNeededL)} ÷ ${rate} = ${minutes} min`},
    ],
    {structuredResponse: {kind: 'number-pair', firstLabel: '(a) Capacity (L)', secondLabel: '(b) Time (min)', decimal: true}},
  );
}
