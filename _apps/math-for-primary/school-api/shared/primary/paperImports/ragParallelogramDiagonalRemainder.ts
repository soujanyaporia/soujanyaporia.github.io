import type { Question, Picture } from '../generate';
import type { Batch11UpperPicture, Batch11UpperMark } from './batch11UpperPicture';

const line = (x1: number, y1: number, x2: number, y2: number): Batch11UpperMark => ({ kind: 'line', x1, y1, x2, y2 });
const label = (x: number, y: number, text: string): Batch11UpperMark => ({ kind: 'text', x, y, text });

function makeFigure(angleA: number, angleBEC: number, angleDFC: number): Picture {
  const marks: Batch11UpperMark[] = [
    line(50, 35, 240, 35), line(240, 35, 190, 165), line(190, 165, 20, 165), line(20, 165, 50, 35),
    line(20, 165, 240, 35), line(145, 35, 190, 165),
    label(42, 30, 'A'), label(243, 30, 'B'), label(192, 171, 'C'), label(8, 171, 'D'),
    label(138, 25, 'E'), label(157, 94, 'F'), label(58, 55, `${angleA}°`),
    label(151, 48, `${angleBEC}°`), label(150, 121, `${angleDFC}°`), label(208, 57, '?')
  ];
  return { type: 'batch11-upper', label: 'Parallelogram ABCD; E lies on AB; E, F, C are collinear; diagonal DB passes through F.', marks } as Batch11UpperPicture as unknown as Picture;
}

function values(seed: number, index: number) {
  const n = Math.abs(Math.trunc(seed * 31 + index * 17));
  const angleA = 105 + n % 16;
  const angleBEC = 55 + Math.floor(n / 7) % 16;
  const angleDFC = 70 + Math.floor(n / 13) % 16;
  return { angleA, angleBEC, angleDFC };
}

export const RAG_PATTERN = {
  id: 'p5-parallelogram-diagonal-remainder',
  level: 5,
  title: 'Find an angle beside a parallelogram diagonal',
  objective: 'Use parallelogram angles, vertically opposite angles and a triangle angle sum to find an angle split by a diagonal.',
  skillIds: ['P5.S.SHAPE.02', 'P5.S.SHAPE.03', 'P5.S.ANGLE.03'],
  canonicalPatternId: 'p5-parallelogram-diagonal-remainder'
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const { angleA, angleBEC, angleDFC } = values(seed, index);
  const angleABC = 180 - angleA;
  const angleDBA = 180 - angleBEC - angleDFC;
  const answer = angleABC - angleDBA;
  const steps = [
    `Adjacent angles in a parallelogram add to 180°: angle ABC = 180° − ${angleA}° = ${angleABC}°.`,
    `At F, angle BFE equals angle DFC because they are vertically opposite, so angle BFE = ${angleDFC}°.`,
    `In triangle EBF, angle DBE = 180° − ${angleBEC}° − ${angleDFC}° = ${angleDBA}°.`,
    `Angle CBD = angle ABC − angle DBE = ${angleABC}° − ${angleDBA}° = ${answer}°.`
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      'ABCD is a parallelogram. E lies on AB. E, F and C lie on one straight line, and diagonal DB passes through F.',
      `Angle DAB = ${angleA}°, angle BEC = ${angleBEC}° and angle DFC = ${angleDFC}°. The figure is not drawn to scale.`
    ],
    prompt: 'Find angle CBD.',
    answer: String(answer),
    unit: 'degrees',
    hint: 'Use the parallelogram angle at B. Then find the angle at B in triangle EBF before subtracting.',
    explanation: steps.join(' '),
    workedSteps: steps.map(text => ({ text })),
    picture: makeFigure(angleA, angleBEC, angleDFC)
  };
}
