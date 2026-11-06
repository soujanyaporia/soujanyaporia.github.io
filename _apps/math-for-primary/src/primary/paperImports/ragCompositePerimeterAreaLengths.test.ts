import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragCompositePerimeterAreaLengths';

type Visible = Pick<Question, 'prompt' | 'context' | 'unit'>;
type Solution = {
  variant: 'joined' | 'percentage';
  perimeter: number;
  area: number;
  sharedSide: number;
  otherSide: number;
  parameter: number;
};

// This solver receives only pupil-visible text and units. It cannot read the
// answer, explanation, worked steps, seed, or generator parameters.
function solveVisible(visible: Visible): Solution {
  if (visible.unit !== 'cm') throw new Error('Expected a length response in cm');
  const text = [visible.prompt, ...(visible.context ?? [])].join(' ');
  const totalMatch = /The total area of the two pieces is (\d+) cm²\./.exec(text);
  if (totalMatch) {
    if (!text.includes('without gaps or overlaps') ||
        !text.includes('shared edge is a full side of the square and the full breadth of the rectangle') ||
        !text.includes('Together they form one larger rectangle')) {
      throw new Error('Missing shared-side geometry');
    }
    const differenceMatch = /The rectangle's length is (\d+) cm more than its breadth\./.exec(text);
    if (!differenceMatch) throw new Error('Missing side difference');
    const area = Number(totalMatch[1]);
    const difference = Number(differenceMatch[1]);
    const solutions: Solution[] = [];
    // Recover the rectangular piece by subtracting each possible square area.
    // Compute perimeter by cancelling the shared edge from both piece boundaries.
    for (let squareSide = 1; squareSide * squareSide < area; squareSide += 1) {
      const remainingArea = area - squareSide * squareSide;
      if (remainingArea % squareSide !== 0) continue;
      const rectangleLength = remainingArea / squareSide;
      if (rectangleLength - squareSide !== difference) continue;
      solutions.push({
        variant: 'joined',
        perimeter: 4 * squareSide + 2 * (rectangleLength + squareSide) - 2 * squareSide,
        area,
        sharedSide: squareSide,
        otherSide: rectangleLength,
        parameter: difference,
      });
    }
    if (solutions.length !== 1) throw new Error('Joined dimensions are not uniquely determined');
    return solutions[0];
  }

  const squareMatch = /A square sheet of card has an area of (\d+) cm²\./.exec(text);
  const percentageMatch = /One of the rectangles has (\d+)% of the square's area\./.exec(text);
  if (!squareMatch || !percentageMatch ||
      !text.includes('One straight cut, parallel to a side') ||
      !text.includes('Each rectangle has one side equal to a full side of the square')) {
    throw new Error('Missing square-strip givens');
  }
  const area = Number(squareMatch[1]);
  const percentage = Number(percentageMatch[1]);
  if (percentage <= 0 || percentage >= 100) throw new Error('Both rectangles must have positive area');
  const solutions: Solution[] = [];
  // Enumerate integer side pairs using the percentage relation directly;
  // do not use the generator's square-root or area-division calculations.
  for (let side = 1; side * side <= area; side += 1) {
    if (side * side !== area) continue;
    for (let width = 1; width < side; width += 1) {
      if (100 * side * width !== percentage * area) continue;
      solutions.push({
        variant: 'percentage',
        perimeter: side + width + side + width,
        area,
        sharedSide: side,
        otherSide: width,
        parameter: percentage,
      });
    }
  }
  if (solutions.length !== 1) throw new Error('Strip dimensions are not uniquely determined');
  return solutions[0];
}

function visibleOnly(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, unit: q.unit};
}

describe('area-derived perimeter candidate', () => {
  it('solves hand-calculated cases outside the generated parameter sets', () => {
    const joined: Visible = {
      prompt: 'What is the perimeter of the larger rectangle?',
      unit: 'cm',
      context: [
        'A square piece of card and a rectangular piece of card are placed side by side, without gaps or overlaps.',
        'Their shared edge is a full side of the square and the full breadth of the rectangle. Together they form one larger rectangle.',
        `The rectangle's length is 1 cm more than its breadth.`,
        'The total area of the two pieces is 136 cm².',
      ],
    };
    // Square 8 by 8; rectangular piece 9 by 8; outer rectangle 17 by 8.
    expect(solveVisible(joined).perimeter).toBe(50);
    const strip: Visible = {
      prompt: 'What is the perimeter of this rectangle?',
      unit: 'cm',
      context: [
        'A square sheet of card has an area of 196 cm².',
        'One straight cut, parallel to a side, divides the sheet into two rectangles.',
        'Each rectangle has one side equal to a full side of the square.',
        `One of the rectangles has 50% of the square's area.`,
      ],
    };
    // Half of a 14 by 14 square is a 14 by 7 rectangle.
    expect(solveVisible(strip).perimeter).toBe(42);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [...Array.from({length: 128}, (_,i) => i), -17, 1000003, 2147483647];
    const variants = new Set<string>();
    const questions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 4; index += 1) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const solved = solveVisible(visible);
        expect(q.answer).toBe(String(solved.perimeter));
        expect(Number.isSafeInteger(solved.perimeter)).toBe(true);
        expect(solved.sharedSide).toBeGreaterThan(0);
        expect(solved.otherSide).toBeGreaterThan(0);
        expect(solved.area).toBeLessThanOrEqual(600);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        if (solved.variant === 'joined') {
          expect(solved.otherSide).toBeGreaterThan(solved.sharedSide);
          expect(solved.area).not.toBe(90);
          expect(solved.parameter).not.toBe(3);
        } else {
          expect(solved.otherSide).toBeLessThan(solved.sharedSide);
          expect(solved.area).not.toBe(100);
          expect(solved.parameter).not.toBe(60);
        }
        variants.add(solved.variant);
        questions.add(JSON.stringify(visible));
      }
    }
    expect([...variants].sort()).toEqual(['joined', 'percentage']);
    expect(questions.size).toBeGreaterThan(20);
  });

  it('is repeatable and includes both variants at consecutive indices', () => {
    for (const seed of [-7, 0, 19, 1000003]) {
      const first = makeRagQuestion(seed);
      const second = makeRagQuestion(seed, 1);
      expect(first).toEqual(makeRagQuestion(seed, 0));
      expect(second).toEqual(makeRagQuestion(seed, 1));
      expect(first.key).not.toBe(second.key);
      expect(solveVisible(visibleOnly(first)).variant)
        .not.toBe(solveVisible(visibleOnly(second)).variant);
    }
  });
});
