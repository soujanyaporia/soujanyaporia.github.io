import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rhombus-angle-propagation',
  level: 6,
  title: 'Follow angles through rhombuses',
  objective: 'Use rhombus, straight-line and parallel-line angle facts to find an unknown angle.',
  skillIds: ['P6.S.SHAPE.01'],
  canonicalPatternId: 'p6-rhombus-angle-propagation',
} as const;

/**
 * Text states all line positions and givens directly, so a diagram is not needed
 * to interpret any generated question.
 */
export function makeRagQuestion(seed: number, index = 0): Question {
  const n = Math.abs(Math.trunc(seed * 31 + index * 17));
  const variant = n % 3;
  const base = { key: `${RAG_PATTERN.id}:${seed}:${index}`, unit: '°' };

  if (variant === 0) {
    const a = 32 + (n % 8) * 3;
    const b = 41 + (Math.floor(n / 3) % 8) * 3;
    const answer = a + b;
    return {
      ...base,
      prompt: 'Find angle ABC.',
      context: [
        'ABCD is a rhombus. Ray DP lies inside angle ADC.',
        `Angle ADP is ${a}° and angle PDC is ${b}°.`
      ],
      answer: String(answer),
      hint: 'The two smaller angles join to make angle ADC. Opposite angles in a rhombus are equal.',
      explanation: `Angle ADC = ${a}° + ${b}° = ${answer}°. Opposite angles ABC and ADC are equal, so angle ABC = ${answer}°.`,
      workedSteps: [
        { text: 'Join the two parts of angle ADC.', equation: `${a}° + ${b}° = ${answer}°` },
        { text: 'Opposite angles in a rhombus are equal.', equation: '∠ABC = ∠ADC' },
        { text: 'So the required angle is the same size.', equation: `∠ABC = ${answer}°` },
      ],
    };
  }

  if (variant === 1) {
    const exterior = 108 + (n % 8) * 6;
    const interior = 180 - exterior;
    return {
      ...base,
      prompt: 'Find angle ABC.',
      context: [
        'ABCD is a rhombus. A, D and E lie on one straight line, with D between A and E.',
        `Angle EDC is ${exterior}°.`
      ],
      answer: String(interior),
      hint: 'Angles on a straight line add to 180°. Opposite angles in a rhombus are equal.',
      explanation: `Angle ADC = 180° − ${exterior}° = ${interior}°. Opposite angles ABC and ADC are equal, so angle ABC = ${interior}°.`,
      workedSteps: [
        { text: 'Angles EDC and ADC form a straight line.', equation: `∠ADC = 180° − ${exterior}° = ${interior}°` },
        { text: 'Opposite angles in a rhombus are equal.', equation: `∠ABC = ∠ADC = ${interior}°` },
      ],
    };
  }

  const parallelAngle = 54 + (n % 7) * 6;
  return {
    ...base,
    prompt: 'Find angle BCD.',
    context: [
      'ABCD is a rhombus. A line through D is parallel to AB.',
      `The angle between that line and DC, measured on the side matching angle BCD, is ${parallelAngle}°.`
    ],
    answer: String(parallelAngle),
    hint: 'When a transversal crosses parallel lines, matching angles are equal.',
    explanation: `The line through D is parallel to AB, and CD crosses both lines. The stated matching angle equals angle BCD, so angle BCD = ${parallelAngle}°.`,
    workedSteps: [
      { text: 'Use the matching angles made by a transversal across parallel lines.', equation: `∠BCD = ${parallelAngle}°` },
    ],
  };
}
