import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-volume-proportional-dimensions',
  level: 5,
  title: 'Volume from related dimensions',
  objective: 'Find a dimension from a fraction of another dimension, then calculate the volume of a cuboid or its water.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.VOL.03', 'P5.S.VOL.04'],
  canonicalPatternId: 'p5-volume-proportional-dimensions',
} as const;

const FRACTIONS = [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4]] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variantOffset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = (variantOffset + (index >>> 0)) % 3;
  const [numerator, denominator] = random.pick(FRACTIONS);
  const fraction = `${numerator}/${denominator}`;
  // Multiples of the denominator give whole-centimetre derived dimensions.
  const referenceDimension = denominator * random.int(8, 12);
  const relatedDimension = referenceDimension / denominator * numerator;

  let context: string[];
  let prompt: string;
  let hint: string;
  let volume: number;
  let workedSteps: NonNullable<Question['workedSteps']>;

  if (variant === 0) {
    const length = referenceDimension;
    const breadth = random.pick([5, 7, 8, 10, 11, 12]);
    const height = relatedDimension;
    volume = length * breadth * height;
    context = [
      `A cuboid block has a length of ${length} cm and a breadth of ${breadth} cm.`,
      `Its height is ${fraction} of its length.`,
    ];
    prompt = 'What is the volume of the block?';
    hint = 'Find the height from the length first. Then multiply length, breadth and height.';
    workedSteps = [
      {
        text: 'Use the fraction of the length to find the height.',
        equation: `${length} ÷ ${denominator} × ${numerator} = ${height} cm`,
      },
      {
        text: 'Multiply the three dimensions to find the volume.',
        equation: `${length} × ${breadth} × ${height} = ${volume} cm³`,
      },
    ];
  } else if (variant === 1) {
    const height = referenceDimension;
    const side = relatedDimension;
    const baseArea = side * side;
    volume = baseArea * height;
    context = [
      `A cuboid block has a square base and a height of ${height} cm.`,
      `Each side of its base is ${fraction} of its height.`,
    ];
    prompt = 'What is the volume of the block?';
    hint = 'Find one side of the square base. Multiply it by itself, then multiply by the height.';
    workedSteps = [
      {
        text: 'Use the fraction of the height to find a side of the base.',
        equation: `${height} ÷ ${denominator} × ${numerator} = ${side} cm`,
      },
      {
        text: 'The square base has equal length and breadth. Find its area.',
        equation: `${side} × ${side} = ${baseArea} cm²`,
      },
      {
        text: 'Multiply the base area by the height to find the volume.',
        equation: `${baseArea} × ${height} = ${volume} cm³`,
      },
    ];
  } else {
    const length = referenceDimension;
    const breadth = relatedDimension;
    const [fillNumerator, fillDenominator] = random.pick(FRACTIONS);
    const tankHeight = fillDenominator * random.int(8, 15);
    const waterDepth = tankHeight / fillDenominator * fillNumerator;
    volume = length * breadth * waterDepth;
    context = [
      `A rectangular tank has an inside length of ${length} cm and an inside height of ${tankHeight} cm.`,
      `Its inside breadth is ${fraction} of its inside length.`,
      `Water fills the tank to ${fillNumerator}/${fillDenominator} of its inside height.`,
    ];
    prompt = 'What volume of water is in the tank?';
    hint = 'Find the inside breadth and the water depth. Multiply these by the inside length.';
    workedSteps = [
      {
        text: 'Use the fraction of the inside length to find the inside breadth.',
        equation: `${length} ÷ ${denominator} × ${numerator} = ${breadth} cm`,
      },
      {
        text: 'Use the filled fraction of the inside height to find the water depth.',
        equation: `${tankHeight} ÷ ${fillDenominator} × ${fillNumerator} = ${waterDepth} cm`,
      },
      {
        text: 'Multiply the inside length, inside breadth and water depth.',
        equation: `${length} × ${breadth} × ${waterDepth} = ${volume} cm³`,
      },
    ];
  }

  return {
    key,
    prompt,
    context,
    answer: String(volume),
    unit: 'cm³',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
