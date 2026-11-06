import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p6-intersecting-lines-triangle-closure',
  level: 6,
  title: 'Follow angles through intersecting lines',
  objective: 'Transfer angles across straight lines and intersections, then use triangle angle sums or test for a right angle.',
  skillIds: ['P5.S.SHAPE.03', 'P6.S.SHAPE.01'],
  canonicalPatternId: 'p6-intersecting-lines-triangle-closure',
} as const;

const angleQuestion = (
  key: string,
  prompt: string,
  answer: number,
  hint: string,
  steps: { text: string; equation?: string }[],
): Question => ({
  key,
  prompt,
  answer: String(answer),
  unit: '°',
  hint,
  explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  workedSteps: steps,
});

export function makeRagQuestion(seed: number, index = 0): Question {
  const n = Math.abs(Math.trunc(seed) + 17 * Math.trunc(index));
  const variant = n % 4;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const angleABC = 35 + 5 * (n % 5);
    const angleACB = 180 - 90 - angleABC;
    const angleCED = 105 + 5 * (n % 4);
    const answer = 180 - angleCED - angleACB;
    return angleQuestion(
      key,
      `A, C and D lie on one straight line. B, C and E lie on another. In triangle ABC, angle BAC is 90° and angle ABC is ${angleABC}°. In triangle CDE, angle CED is ${angleCED}°. Find angle CDE.`,
      answer,
      'Find the third angle of triangle ABC. Transfer it to the opposite angle at C, then use the angle sum of triangle CDE.',
      [
        { text: 'Find the third angle in triangle ABC.', equation: `180° − 90° − ${angleABC}° = ${angleACB}°` },
        { text: 'Vertically opposite angles are equal.', equation: `Angle DCE = ${angleACB}°` },
        { text: 'Use the angle sum of triangle CDE.', equation: `180° − ${angleCED}° − ${angleACB}° = ${answer}°` },
      ],
    );
  }

  if (variant === 1) {
    const angleBAC = 70;
    const angleABC = 40 + 5 * (n % 4);
    const angleACB = 180 - angleBAC - angleABC;
    const angleCED = 95 + 5 * (n % 3);
    const answer = 180 - angleCED - angleACB;
    return angleQuestion(
      key,
      `A, C and D lie on one straight line. B, C and E lie on another. In triangle ABC, angle BAC is ${angleBAC}° and angle ABC is ${angleABC}°. In triangle CDE, angle CED is ${angleCED}°. Find angle CDE.`,
      answer,
      'Close triangle ABC. Its angle at C is vertically opposite the angle at C in triangle CDE.',
      [
        { text: 'Find angle ACB using the triangle angle sum.', equation: `180° − ${angleBAC}° − ${angleABC}° = ${angleACB}°` },
        { text: 'Transfer the angle across the intersection.', equation: `Angle DCE = ${angleACB}°` },
        { text: 'Close triangle CDE.', equation: `180° − ${angleCED}° − ${angleACB}° = ${answer}°` },
      ],
    );
  }

  if (variant === 2) {
    const angleAED = 85 + 5 * (n % 4);
    const angleCDE = 25 + 5 * (n % 3);
    const angleBAC = 20 + 5 * (n % 5);
    const angleCED = 180 - angleAED;
    const angleECD = 180 - angleCED - angleCDE;
    const angleACB = 180 - angleECD;
    const answer = 180 - angleBAC - angleACB;
    return angleQuestion(
      key,
      `A, E and C lie on one straight line. B, C and D lie on another. Angle AED is ${angleAED}°. In triangle ECD, angle CDE is ${angleCDE}°. In triangle ABC, angle BAC is ${angleBAC}°. Find angle ABC.`,
      answer,
      'Use the straight line at E, close triangle ECD, then transfer the angle at C to triangle ABC.',
      [
        { text: 'Angles on a straight line at E add to 180°.', equation: `Angle CED = 180° − ${angleAED}° = ${angleCED}°` },
        { text: 'Find angle ECD in triangle ECD.', equation: `180° − ${angleCED}° − ${angleCDE}° = ${angleECD}°` },
        { text: 'The angle at C in triangle ABC is supplementary to angle ECD.', equation: `Angle ACB = 180° − ${angleECD}° = ${angleACB}°` },
        { text: 'Close triangle ABC.', equation: `180° − ${angleBAC}° − ${angleACB}° = ${answer}°` },
      ],
    );
  }

  const angle = 70 + 5 * (n % 5);
  const perpendicular = angle === 90;
  const answer = perpendicular ? 'Yes' : 'No';
  return {
    key,
    prompt: `Two straight lines AB and CD cross at O. Angle AOC is ${angle}°. Are the lines perpendicular?`,
    answer,
    choices: ['Yes', 'No'],
    hint: 'Perpendicular lines meet at a right angle. Check whether the given intersection angle is 90°.',
    explanation: `The intersection angle is ${angle}°. ${perpendicular ? 'It is 90°, so the lines are perpendicular.' : 'It is not 90°, so the lines are not perpendicular.'}`,
    workedSteps: [
      { text: 'Recall the angle formed by perpendicular lines.', equation: '90°' },
      { text: 'Compare the given angle with 90°.', equation: `${angle}° ${perpendicular ? '=' : '≠'} 90°; ${answer}.` },
    ],
  };
}
