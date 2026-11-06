import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { drawSharedCorner, drawSplitCorner } from './ragP4RectangleCornerFigure';

export const RAG_PATTERN = {
  id: 'rag-p4-rectangle-corner-angles',
  level: 4,
  title: 'Find an angle at a rectangle corner',
  objective: 'Use a right angle and the labelled sides of a rectangle to find a missing angle.',
  skillIds: ['P4.S.SHAPE.01', 'P4.S.ANGLE.01', 'P3.S.ANGLE.01'],
  canonicalPatternId: 'p4-rectangle-corner-angles-parallel-sides-and-shared-vertex',
};

type Step = { text: string; equation: string };
const parallelClue = 'A sloping line makes the same small angle with the top and bottom sides because those sides are parallel.';

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['one cut', 'two cuts', 'whole angle', 'part angle'] as const);

  function make(target: string, size: number, steps: Step[],
    task: Pick<Question, 'context' | 'picture' | 'hint'>, options?: number[]): Question {
    return {
      ...task, key, prompt: `How many degrees are in ∠${target}?`,
      answer: options ? `${size}°` : String(size),
      ...(options ? { choices: rng.shuffle(options).map(n => `${n}°`) } : { unit: '°' }),
      workedSteps: steps,
      explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (form === 'one cut') {
    const top = rng.pick([52, 54, 55, 57, 59, 61, 63, 65, 67, 69]);
    const missing = 90 - top;
    return make('DAE', missing, [
      { text: 'Follow AE from the top edge to the bottom edge. The two small angles are equal.', equation: `∠EAB = ∠DEA = ${top}°` },
      { text: 'The corner of the square is 90°. Take away the part beside AB.', equation: `∠DAE = 90° − ${top}° = ${missing}°` },
    ], {
      context: ['ABCD is a square. Point E lies on side DC.', `∠DEA = ${top}°.`, parallelClue],
      picture: drawSplitCorner(top),
      hint: 'Find the angle that AE makes with AB. How much of the corner is left?',
    });
  }

  if (form === 'two cuts') {
    const left = rng.pick([14, 16, 18, 20, 23, 24, 26]);
    const top = rng.pick([27, 28, 30, 32, 34, 35, 36, 38]);
    const outside = left + top;
    const missing = 90 - outside;
    return make('EAF', missing, [
      { text: 'Follow AF to find the angle it makes with the bottom edge.', equation: `∠FAB = ∠EFA = ${top}°` },
      { text: 'Add the two angles on either side of the curved mark.', equation: `${left}° + ${top}° = ${outside}°` },
      { text: 'Take their sum away from the right angle at A.', equation: `∠EAF = 90° − ${outside}° = ${missing}°` },
    ], {
      context: ['ABCD is a rectangle. The points along its top side are D, E, F and C, in that order.',
        `∠DAE = ${left}° and ∠EFA = ${top}°.`, parallelClue],
      picture: drawSplitCorner(top, left),
      hint: 'Look for an angle at A equal to ∠EFA. Which two parts of the corner sit outside the marked angle?',
    });
  }

  const small = rng.pick([26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52]);
  const whole = small + 90;
  const findWhole = form === 'whole angle';
  const target = findWhole ? 'DAG' : 'DAE';
  const context = ['The rectangles ABCD and AEFG share corner A. Point E lies on side DC.',
    findWhole ? `∠DAE = ${small}°.` : `∠DAG = ${whole}°.`];
  const steps = [
    { text: 'AE and AG form a corner of rectangle AEFG.', equation: '∠EAG = 90°' },
    findWhole
      ? { text: 'From AD to AG, pass AE and add both angles.', equation: `∠DAG = ${small}° + 90° = ${whole}°` }
      : { text: 'Take the corner of AEFG away from the larger angle.', equation: `∠DAE = ${whole}° − 90° = ${small}°` },
  ];
  return make(target, findWhole ? whole : small, steps, {
    context, picture: drawSharedCorner(small, target),
    hint: 'Trace the angle from AD to AG through AE. Which sides of the tilted rectangle meet at A?',
  }, findWhole ? [whole, 180 - small, 90 - small, 90] : [small, 90 - small, 90, whole]);
}
