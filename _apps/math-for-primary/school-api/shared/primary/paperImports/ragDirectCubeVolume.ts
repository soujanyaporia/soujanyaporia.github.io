import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-direct-cube-volume',
  level: 5,
  title: 'Volume from a cube edge',
  objective: 'Use one edge length to find the volume of a cube.',
  skillIds: ['P5.S.VOL.03'],
  canonicalPatternId: 'p5-direct-cube-and-cuboid-volume',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const edge = rng.pick([2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 16]);
  const baseArea = edge * edge;
  const volume = baseArea * edge;
  const workedSteps = [
    {
      text: 'A cube has equal length, width and height.',
      equation: `Length = width = height = ${edge} cm`,
    },
    {
      text: 'Find the area of its square base.',
      equation: `${edge} × ${edge} = ${baseArea} cm²`,
    },
    {
      text: 'Multiply the base area by the height to find the volume.',
      equation: `${baseArea} × ${edge} = ${volume} cm³`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      'A wooden block is shaped like a cube.',
      `Each edge is ${edge} cm long.`,
    ],
    prompt: 'Calculate the volume of the block.',
    answer: String(volume),
    unit: 'cm³',
    hint: 'All three dimensions are equal. Multiply the edge length by itself, then by the edge length again.',
    explanation: `The length, width and height are each ${edge} cm. The volume is ${edge} × ${edge} × ${edge} = ${volume} cm³.`,
    workedSteps,
    proof: {op: '*', a: {op: '*', a: edge, b: edge}, b: edge},
  };
}
