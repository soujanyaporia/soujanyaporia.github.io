import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-isosceles-parallel-figure',
  level: 6,
  title: 'Angles in parallel sides and an isosceles triangle',
  objective: 'Use parallel sides and equal triangle sides to find an unknown angle.',
  skillIds: ['P6.S.SHAPE.01', 'P5.S.SHAPE.01'],
  canonicalPatternId: 'isosceles-triangle-across-parallel-sided-figures',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const topAngle = rng.pick([100, 110, 115, 120, 125, 130]);
  const splitAngle = rng.pick([20, 25, 30, 35, 40, 45]);
  const otherAngle = 180 - topAngle;
  const triangleBaseAngle = otherAngle - splitAngle;
  const equation = `180° − ${topAngle}° = ${otherAngle}°; ${otherAngle}° − ${splitAngle}° = ${triangleBaseAngle}°`;
  const steps = [
    {text: 'The parallel sides and sloping side make two angles that add to 180°.', equation: `∠ADC = 180° − ${topAngle}° = ${otherAngle}°`},
    {text: 'Subtract the part of the angle at D outside the triangle.', equation: `∠BDC = ${otherAngle}° − ${splitAngle}° = ${triangleBaseAngle}°`},
    {text: 'The equal sides make the two base angles equal.', equation: `∠BCD = ∠BDC = ${triangleBaseAngle}°`},
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'Find angle BCD.',
    context: [
      'ABCD is a trapezium with AB parallel to DC. Triangle BCD is isosceles, with BD = BC.',
      `Angle DAB is ${topAngle}°. Angle ADB is ${splitAngle}°.`,
    ],
    answer: String(triangleBaseAngle),
    unit: '°',
    hint: 'Use the parallel sides to find the whole angle at D. Then use the equal sides of the triangle.',
    explanation: `${equation}. So angle BCD is ${triangleBaseAngle}°.`,
    workedSteps: steps,
  };
}
