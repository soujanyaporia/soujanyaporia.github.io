import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-triangle-area-derived-base',
  level: 5,
  title: 'Find a triangle area from related lengths',
  objective: 'Find the base from its relationship to the perpendicular height, then calculate the triangle area.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02'],
  canonicalPatternId: 'triangle-area-from-base-and-height',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const height = r.pick([5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18]);
  const multiplier = r.pick([2, 4, 5, 6]);
  const base = height * multiplier;
  const rectangleArea = base * height;
  const area = rectangleArea / 2;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'First work out the length of the base.',
      equation: `${multiplier} × ${height} = ${base} cm`,
    },
    {
      text: 'A rectangle with the same base and perpendicular height has twice the triangle’s area.',
      equation: `${base} × ${height} = ${rectangleArea} cm²`,
    },
    {
      text: 'Take half to find the area of the triangular banner.',
      equation: `${rectangleArea} ÷ 2 = ${area} cm²`,
    },
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `A triangular banner has a perpendicular height of ${height} cm. Its base is ${multiplier} times this height. What is the area of the banner?`,
    answer: String(area),
    unit: 'cm²',
    hint: 'Find the base first. Then multiply the base by the perpendicular height and divide by 2.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    workedSteps,
    proof: {
      op: '/',
      a: {
        op: '*',
        a: {op: '*', a: multiplier, b: height},
        b: height,
      },
      b: 2,
    },
  };
}
