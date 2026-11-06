import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-inverse-area-triangle-relationships',
  level: 5,
  title: 'Find a triangle height from an equal area',
  objective: 'Use a rectangle area and an equal-area condition to recover a triangle perpendicular height.',
  skillIds: ['P3.S.AREA.03', 'P5.S.AREA.01', 'P5.S.AREA.02'],
  canonicalPatternId: 'p5-inverse-area-triangle-relationships',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const width = r.pick([4, 5, 7, 8, 9, 10, 11, 12]);
  const length = width * r.pick([4, 5, 6]);
  const area = length * width;
  const perimeter = 2 * (length + width);
  const bases: number[] = [];

  for (let base = 12; base <= 72; base++) {
    if (base === 18 || (2 * area) % base !== 0) continue;
    const height = 2 * area / base;
    if (height < 4 || height > 36) continue;
    const otherSides = perimeter - base;
    // At a fixed base and height, the shortest sum of the other two
    // sides occurs when the apex is directly above the base midpoint.
    // Moving the apex sideways permits every larger sum.
    if (otherSides > base && otherSides * otherSides >= base * base + 4 * height * height) {
      bases.push(base);
    }
  }
  // The base equal to the rectangle length is always feasible here.
  if (!bases.length) throw new Error('No feasible triangle base');
  const base = r.pick(bases);
  const height = 2 * area / base;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Find the area enclosed by the rectangle. The triangle has the same area.',
      equation: `${length} × ${width} = ${area} cm²`,
    },
    {
      text: 'A triangle has half the product of its base and perpendicular height. Double its area to find that product.',
      equation: `${area} × 2 = ${2 * area} cm²`,
    },
    {
      text: 'Divide this product by the given base to find the perpendicular height.',
      equation: `${2 * area} ÷ ${base} = ${height} cm`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'What is the perpendicular height of the triangle for this base?',
    context: [
      `A wire loop makes a rectangle measuring ${length} cm by ${width} cm.`,
      'Lina reshapes the whole loop into a triangle without cutting or stretching the wire. The triangle encloses the same area as the rectangle.',
      `The chosen base of the triangle is ${base} cm long.`,
    ],
    answer: String(height),
    unit: 'cm',
    hint: 'Find the rectangle area first. Then use triangle area = base × perpendicular height ÷ 2.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    workedSteps,
  };
}
