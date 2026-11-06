import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-quadrilateral-property-claim',
  level: 4,
  title: 'Check a quadrilateral claim',
  objective: 'Decide whether stated properties prove, contradict, or leave uncertain a claim about a square or rectangle.',
  skillIds: ['P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-quadrilateral-property-claim-classification',
};

const items = [
  {
    givens: 'A shape has 4 equal sides and 4 right angles.',
    claim: 'The shape is a square.', answer: 'True',
    hint: 'Check both the side lengths and the angles.',
    explanation: 'A square has four equal sides and four right angles, so the claim must be true.',
  },
  {
    givens: 'A rectangle has 4 equal angles and exactly 1 pair of parallel sides.',
    claim: 'The rectangle has exactly 1 pair of parallel sides.', answer: 'False',
    hint: 'A rectangle has two pairs of opposite sides.',
    explanation: 'Both pairs of opposite sides of a rectangle are parallel, so it cannot have exactly one pair.',
  },
  {
    givens: 'Figure A has 2 pairs of perpendicular lines.',
    claim: 'Figure A is a rectangle.', answer: 'Cannot tell',
    hint: 'Ask whether the given line property fixes the whole shape.',
    explanation: 'The line information alone does not describe all the sides and corners of Figure A. More than one shape could fit it.',
  },
  {
    givens: 'Figure B has 4 equal sides and 2 pairs of parallel sides.',
    claim: 'Figure B is a square.', answer: 'Cannot tell',
    hint: 'Check whether the information says the corners are right angles.',
    explanation: 'These side properties also fit a rhombus whose corners are not right angles. The information does not prove Figure B is a square.',
  },
  {
    givens: 'Figure C has 4 sides, and its opposite sides are equal in length.',
    claim: 'Figure C is a square.', answer: 'Cannot tell',
    hint: 'Equal opposite sides do not give the lengths of every side or the angles.',
    explanation: 'The givens do not say that all four sides are equal or that the angles are right angles. Several quadrilaterals could fit.',
  },
  {
    givens: 'Figure D has 4 equal sides.',
    claim: 'Figure D is a rectangle.', answer: 'Cannot tell',
    hint: 'Check whether four equal sides tell you the corner angles.',
    explanation: 'A square and a non-square rhombus both have four equal sides. The givens do not tell us whether Figure D has right angles.',
  },
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  // A small deterministic integer mixer selects among the reviewed claim forms.
  let n = (seed | 0) ^ Math.imul(index + 1, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  const item = items[(n >>> 0) % items.length];
  const choices = ['True', 'False', 'Cannot tell'];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `Is this claim true, false, or not possible to tell? ${item.claim}`,
    context: [item.givens],
    answer: item.answer,
    choices,
    hint: item.hint,
    explanation: item.explanation,
    workedSteps: [
      { text: item.givens },
      { text: item.explanation },
    ],
  };
}
