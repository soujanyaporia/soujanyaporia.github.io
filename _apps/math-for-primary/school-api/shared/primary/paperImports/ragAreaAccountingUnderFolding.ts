import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import {drawRecoveredRectangle, drawCutRectangle} from './ragFoldAreaDiagram';

export const RAG_PATTERN = {
  id: 'rag-p5-area-accounting-under-folding',
  level: 5,
  title: 'Areas of folded paper',
  objective: 'Use equal areas before and after a fold to recover a rectangle area or find the area left after cutting.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-area-accounting-under-folding',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = new Rng(hashString(RAG_PATTERN.id + ':' + seed + ':' + index));
  const variant = ((hashString(String(seed)) + Math.trunc(index)) >>> 0) % 2;
  const base = {
    key: RAG_PATTERN.id + ':' + seed + ':' + index,
    unit: 'cm²',
  };

  if (variant === 0) {
    const width = random.pick([12, 14, 16, 18, 20, 22, 24]);
    const depth = random.pick([3, 4, 5]);
    const height = 2 * depth + random.int(3, 6);
    const triangleArea = width * depth / 2;
    const shadedArea = width * height - 2 * triangleArea;
    const answer = width * height;
    const workedSteps: NonNullable<Question['workedSteps']> = [
      {
        text: 'AD and DE meet at a right angle. Find the area of corner triangle ADE.',
        equation: width + ' × ' + depth + ' ÷ 2 = ' + triangleArea + ' cm²',
      },
      {
        text: 'Folding keeps the triangle’s area the same. Triangle AFE covers an equal area of the sheet.',
        equation: 'Area of AFE = ' + triangleArea + ' cm²',
      },
      {
        text: 'Add the shaded area, the covered area and the original corner area.',
        equation: shadedArea + ' + ' + triangleArea + ' + ' + triangleArea + ' = ' + answer + ' cm²',
      },
    ];
    return {
      ...base,
      prompt: 'What was the area of rectangle ABCD before the fold?',
      context: [
        'A rectangular sheet ABCD is coloured on one side. Corner D is folded onto F along AE. E lies on CD.',
        'The white triangle AFE lies completely on the sheet. The shaded region ABCEF is the coloured part still showing.',
        'AD = ' + width + ' cm and DE = ' + depth + ' cm.',
        'The shaded region ABCEF has area ' + shadedArea + ' cm².',
        'Dashed lines show the original edges. The diagram is not for measuring.',
      ],
      answer: String(answer),
      picture: drawRecoveredRectangle(width, height, depth),
      hint: 'Find the area of the original triangular corner. Think about both the corner that moved and the part covered by it.',
      workedSteps,
      explanation: workedSteps.map(step => step.text + ' ' + (step.equation ?? '')).join(' '),
    };
  }

  const equalSide = random.pick([12, 14, 16, 18]);
  const topDepth = equalSide - random.pick([2, 4]);
  const width = 2 * equalSide + random.pick([10, 12, 14]);
  const foldedBase = equalSide - random.pick([4, 6]);
  const bottomDepth = random.pick([3, 4, 5]);
  const height = topDepth + equalSide;
  const topBase = width - equalSide;
  const firstTriangle = topBase * topDepth / 2;
  const secondTriangle = foldedBase * bottomDepth / 2;
  const removedArea = 2 * (firstTriangle + secondTriangle);
  const answer = width * height - removedArea;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'The matching marks show that PD and QB are equal. Find the full height AD.',
      equation: topDepth + ' + ' + equalSide + ' = ' + height + ' cm',
    },
    {
      text: 'Find AQ by subtracting QB from the full top edge AB.',
      equation: width + ' − ' + equalSide + ' = ' + topBase + ' cm',
    },
    {
      text: 'Triangle APQ folds onto triangle FPQ. Use the perpendicular edges AQ and AP to find its area.',
      equation: topBase + ' × ' + topDepth + ' ÷ 2 = ' + firstTriangle + ' cm²',
    },
    {
      text: 'RC folds onto RG, so RC and RG have equal lengths. Find the area of triangle RCS.',
      equation: foldedBase + ' × ' + bottomDepth + ' ÷ 2 = ' + secondTriangle + ' cm²',
    },
    {
      text: 'Each cut removes the folded flap and the equal-sized piece underneath it. Add both pairs of areas.',
      equation: '2 × (' + firstTriangle + ' + ' + secondTriangle + ') = ' + removedArea + ' cm²',
    },
    {
      text: 'Subtract the removed pieces from the area of the original rectangle.',
      equation: width + ' × ' + height + ' − ' + removedArea + ' = ' + answer + ' cm²',
      picture: drawCutRectangle(width, equalSide, topDepth, foldedBase, bottomDepth, true),
    },
  ];
  return {
    ...base,
    prompt: 'What is the area of the paper left after both cuts?',
    context: [
      'ABCD is a rectangular sheet. A is folded onto F along PQ, and C is folded onto G along RS.',
      'P lies on AD, Q on AB, R on DC and S on BC. The two shaded folded triangles lie completely on the sheet and are separate.',
      'AB = ' + width + ' cm, AP = ' + topDepth + ' cm and QB = ' + equalSide + ' cm.',
      'PD = QB. RG = ' + foldedBase + ' cm and SC = ' + bottomDepth + ' cm.',
      'Cut out the shaded triangles PFQ and RGS through both layers of paper. Remove all the cut pieces.',
      'Dashed lines show the original edges. Matching marks show equal lengths. The diagram is not for measuring.',
    ],
    answer: String(answer),
    picture: drawCutRectangle(width, equalSide, topDepth, foldedBase, bottomDepth),
    hint: 'Recover the rectangle’s dimensions and the two original corner areas. Each cut goes through two layers.',
    workedSteps,
    explanation: workedSteps.map(step => step.text + ' ' + (step.equation ?? '')).join(' '),
  };
}
