import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-triangle-exterior-angle-chain',
  level: 6,
  title: 'Follow exterior angles in a triangle',
  objective: 'Use an exterior angle and the angles of a triangle to find another exterior angle.',
  skillIds: ['P5.S.SHAPE.01', 'P5.S.SHAPE.03'],
  canonicalPatternId: 'p6-triangle-exterior-angle-chain',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const state = (Math.imul(seed >>> 0, 1664525) + Math.imul((index + 1) >>> 0, 1013904223)) >>> 0;
  const angleAtA = 30 + (state % 36);
  const exteriorAtD = 110 + (Math.floor(state / 36) % 36);
  const angleAtC = exteriorAtD - angleAtA;
  const answer = 180 - angleAtC;

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `A, C and B lie on a straight line. A, D and E lie on another straight line. In triangle ACD, angle CAD is ${angleAtA}°. The exterior angle CDE is ${exteriorAtD}°. Find angle BCD.`,
    answer: String(answer),
    unit: '°',
    hint: 'First find the angle inside the triangle at D. The three inside angles of a triangle add to 180°. Then use the straight line through A, C and B.',
    explanation: `The inside angle at D is 180° − ${exteriorAtD}° = ${180 - exteriorAtD}°. The angle at C inside triangle ACD is 180° − ${angleAtA}° − ${180 - exteriorAtD}° = ${angleAtC}°. Angles ACD and BCD make a straight angle, so angle BCD is 180° − ${angleAtC}° = ${answer}°.`,
    workedSteps: [
      { text: 'The inside angle at D and its exterior angle make a straight angle.', equation: `∠ADC = 180° − ${exteriorAtD}° = ${180 - exteriorAtD}°` },
      { text: 'The angles inside a triangle add to 180°.', equation: `∠ACD = 180° − ${angleAtA}° − ${180 - exteriorAtD}° = ${angleAtC}°` },
      { text: 'Angles ACD and BCD lie on a straight line.', equation: `∠BCD = 180° − ${angleAtC}° = ${answer}°` },
    ],
  };
}
