import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-semicircles-per-whole-circle',
  level: 2,
  title: 'Build circles from semicircles',
  objective: 'Recognise that two semicircles form one circle and count the pieces needed for several circles.',
  skillIds: ['P1.S.SHAPE.02', 'P2.S.MD.01'],
  canonicalPatternId: 'p2-semicircles-per-whole-circle',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const circles = rng.int(3, 10);
  const pieces = circles * 2;
  const equation = `${circles} × 2 = ${pieces}`;

  return {
    key,
    prompt: `Mei joins semicircles of the same size to make ${circles} whole circles. How many semicircles does she use?`,
    picture: { type: 'pattern', items: Array<string>(circles).fill('◯') },
    answer: String(pieces),
    unit: 'semicircles',
    hint: 'Imagine cutting one circle in half through its centre. How many pieces would you get?',
    workedSteps: [
      { text: 'Two matching semicircles fit together along their straight edges to make one circle.' },
      { text: `Count one pair for each of the ${circles} circles.`, equation },
    ],
    explanation: `Each circle needs two semicircles. For ${circles} circles, Mei uses ${equation} semicircles.`,
    proof: { op: '*', a: circles, b: 2 },
  };
}
