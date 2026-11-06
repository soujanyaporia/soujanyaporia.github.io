import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fractional-filled-volume',
  level: 5,
  title: 'Water in a partly filled tank',
  objective: 'Find the volume of water using a cuboid tank’s dimensions or base area, height and filled fraction.',
  skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.FRAC.05'],
  canonicalPatternId: 'fractional-filled-or-empty-volume',
};

const FRACTIONS = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [7, 8],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const start = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  // Two forms of the dimensions task, followed by the base-area task.
  const variant = (start % 3 + offset) % 3;
  const [numerator, denominator] = r.pick(FRACTIONS);
  const length = r.pick([12, 16, 18, 24, 28, 32, 36]);
  const width = r.pick([6, 8, 9, 12, 14]);
  const height = denominator * r.int(3, 7);
  const baseArea = variant === 2
    ? r.pick([60, 72, 84, 96, 108, 120, 144, 168])
    : length * width;
  const capacity = baseArea * height;
  const onePart = capacity / denominator;
  const water = onePart * numerator;
  const fraction = `${numerator}/${denominator}`;

  const context = [
    variant === 2
      ? `A cuboid tank has an inside base area of ${baseArea} cm² and an inside height of ${height} cm.`
      : `A cuboid tank measures ${length} cm long, ${width} cm wide and ${height} cm high on the inside.`,
    variant === 1
      ? `The water reaches ${fraction} of the tank's height.`
      : `Water takes up ${fraction} of its capacity.`,
  ];

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (variant === 1) {
    workedSteps.push({
      text: `A cuboid has the same base area all the way up. Water reaching ${fraction} of its height fills ${fraction} of its capacity.`,
    });
  }
  workedSteps.push(
    {
      text: variant === 2
        ? 'Multiply the base area by the height to find the full capacity.'
        : 'Multiply the inside length, width and height to find the full capacity.',
      equation: variant === 2
        ? `${baseArea} × ${height} = ${capacity} cm³`
        : `${length} × ${width} × ${height} = ${capacity} cm³`,
    },
    {
      text: `Divide the capacity into ${denominator} equal parts.`,
      equation: `${capacity} ÷ ${denominator} = ${onePart} cm³`,
    },
    {
      text: `The water occupies ${numerator} of these equal parts.`,
      equation: `${onePart} × ${numerator} = ${water} cm³`,
    },
  );

  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt: variant === 0
      ? 'Which value is the volume of water in the tank, in cm³?'
      : 'How much water is in the tank? Give your answer in cm³.',
    answer: String(water),
    unit: 'cm³',
    hint: variant === 1
      ? 'In a cuboid tank, the fraction of the height filled is also the fraction of the capacity filled.'
      : 'Find the full capacity first. Then find the fraction occupied by water.',
    workedSteps,
    explanation: workedSteps.map(step =>
      `${step.text}${step.equation ? ` ${step.equation}.` : ''}`,
    ).join(' '),
  };

  if (variant === 0) {
    // Common errors: full capacity, empty volume, one part, or base area.
    // The final value represents using an extra centimetre of water depth.
    const options = [...new Set([
      water, capacity, capacity - water, onePart, baseArea, water + baseArea,
    ])].slice(0, 4);
    question.choices = r.shuffle(options.map(String));
  }
  return question;
}
