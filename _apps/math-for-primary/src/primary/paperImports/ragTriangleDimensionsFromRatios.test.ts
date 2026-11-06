import {expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragTriangleDimensionsFromRatios';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;

// The solver receives only pupil-visible text. It searches for side lengths
// satisfying the perimeter, proportions and right-angle condition together.
function solveVisible(question: VisibleQuestion) {
  const text = [...(question.context ?? []), question.prompt].join(' ');
  if (!text.includes('Triangle ABC has a right angle at B.')) {
    throw new Error('The perpendicular sides are not established.');
  }
  const proportions = /The lengths AB, BC and CA are (\d+), (\d+) and (\d+) equal units respectively\./.exec(text);
  const boundary = /The perimeter of triangle ABC is (\d+) cm\./.exec(text);
  if (!proportions || !boundary) throw new Error('Missing visible length information.');
  const first = Number(proportions[1]);
  const second = Number(proportions[2]);
  const third = Number(proportions[3]);
  const perimeter = Number(boundary[1]);
  if (Math.min(first, second, third, perimeter) <= 0) throw new Error('Lengths must be positive.');
  const solutions: {ab: number; bc: number; ca: number; area: number}[] = [];
  for (let ab = 1; ab < perimeter; ab += 1) {
    const bc = ab * second / first;
    const ca = perimeter - ab - bc;
    if (!Number.isInteger(bc) || !Number.isInteger(ca) || bc <= 0 || ca <= 0) continue;
    if (ca * first !== ab * third) continue;
    if (ab * ab + bc * bc !== ca * ca) continue;
    solutions.push({ab, bc, ca, area: ab * bc / 2});
  }
  if (solutions.length !== 1) throw new Error('Expected exactly one valid whole-centimetre triangle.');
  return {perimeter, proportions: [first, second, third], ...solutions[0]!};
}

function visible(question: Question): VisibleQuestion {
  return {prompt: question.prompt, context: question.context};
}

const fixture: VisibleQuestion = {
  prompt: 'Find the area of triangle ABC.',
  context: [
    'Triangle ABC has a right angle at B.',
    'The lengths AB, BC and CA are 5, 12 and 13 equal units respectively. One unit represents the same length on every side.',
    'The perimeter of triangle ABC is 180 cm.',
  ],
};

test('the independent solver recovers a triangle from visible constraints', () => {
  expect(solveVisible(fixture)).toMatchObject({ab: 30, bc: 72, ca: 78, area: 1080});
  expect(() => solveVisible({
    ...fixture,
    context: fixture.context!.map(line => line.replace('180 cm', '181 cm')),
  })).toThrow('exactly one');
  expect(() => solveVisible({
    ...fixture,
    context: fixture.context!.filter(line => !line.includes('right angle')),
  })).toThrow('perpendicular sides');
});

test('varied seeds and indices have uniquely solvable visible givens and correct area answers', () => {
  const questions = new Set<string>();
  const shapes = new Set<string>();
  const scales = new Set<number>();
  const orientations = new Set<boolean>();
  for (let seed = -32; seed <= 96; seed += 1) {
    for (const index of [0, 1, 7]) {
      const question = makeRagQuestion(seed, index);
      const solved = solveVisible(visible(question));
      expect(question.answer).toBe(String(solved.area));
      expect(question.unit).toBe('cm²');
      expect(Number.isInteger(solved.area)).toBe(true);
      expect(solved.area).toBeGreaterThan(0);
      expect(solved.area).toBeLessThanOrEqual(6000);
      expect(solved.perimeter).toBeGreaterThanOrEqual(24);
      expect(solved.perimeter).toBeLessThanOrEqual(400);
      expect(solved.perimeter).not.toBe(156);
      expect(question.choices).toBeUndefined();
      expect(question.structuredResponse).toBeUndefined();
      expect(question.workedSteps).toHaveLength(5);
      expect(question.workedSteps?.at(-1)?.equation).toBe(`${solved.ab} × ${solved.bc} ÷ 2 = ${solved.area} cm²`);
      expect(question.hint.length).toBeGreaterThan(0);
      expect(question.explanation).toContain('perpendicular height');
      questions.add(JSON.stringify(visible(question)));
      shapes.add([...solved.proportions].sort((a, b) => a - b).join(':'));
      scales.add(solved.ab / solved.proportions[0]!);
      orientations.add(solved.ab < solved.bc);
    }
  }
  expect(questions.size).toBeGreaterThan(12);
  expect(shapes.size).toBe(3);
  expect(scales.size).toBeGreaterThan(1);
  expect(orientations.size).toBe(2);
});

test('generation is repeatable and metadata uses the supplied P5 area skills', () => {
  for (const seed of [-1000000, -0.5, 0, 17, 2147483647]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
    expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 3).key);
    const question = makeRagQuestion(seed, 3);
    expect(Number(question.answer)).toBe(solveVisible(visible(question)).area);
  }
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('triangle-dimensions-from-ratios');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.01', 'P5.S.AREA.02']);
});
