import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragVolumeProportionalDimensions';

type Solution = {
  variant: 'height' | 'square-base' | 'water';
  dimensions: [number, number, number];
  fractions: [number, number][];
  volume: number;
};

// The solver receives only the context displayed to the pupil.
function solveVisibleGivens(context: readonly string[]): Solution {
  const text = context.join(' ');
  const cuboid = /^A cuboid block has a length of (\d+) cm and a breadth of (\d+) cm\. Its height is (\d+)\/(\d+) of its length\.$/.exec(text);
  if (cuboid) {
    const [length, breadth, numerator, denominator] = cuboid.slice(1).map(Number);
    const height = length * numerator / denominator;
    return {
      variant: 'height',
      dimensions: [length, breadth, height],
      fractions: [[numerator, denominator]],
      volume: length * breadth * height,
    };
  }

  const square = /^A cuboid block has a square base and a height of (\d+) cm\. Each side of its base is (\d+)\/(\d+) of its height\.$/.exec(text);
  if (square) {
    const [height, numerator, denominator] = square.slice(1).map(Number);
    const side = height * numerator / denominator;
    return {
      variant: 'square-base',
      dimensions: [side, side, height],
      fractions: [[numerator, denominator]],
      volume: side ** 2 * height,
    };
  }

  const tank = /^A rectangular tank has an inside length of (\d+) cm and an inside height of (\d+) cm\. Its inside breadth is (\d+)\/(\d+) of its inside length\. Water fills the tank to (\d+)\/(\d+) of its inside height\.$/.exec(text);
  if (tank) {
    const [length, height, numerator, denominator, fillNumerator, fillDenominator] = tank.slice(1).map(Number);
    const breadth = length * numerator / denominator;
    const depth = height * fillNumerator / fillDenominator;
    // Solve through full capacity, independently of the generator's depth-first calculation.
    const capacity = length * breadth * height;
    return {
      variant: 'water',
      dimensions: [length, breadth, depth],
      fractions: [[numerator, denominator], [fillNumerator, fillDenominator]],
      volume: capacity * fillNumerator / fillDenominator,
    };
  }

  throw new Error(`Incomplete or unrecognised visible givens: ${text}`);
}

function checkWorkedEquation(equation: string): number {
  const match = /^(\d+(?: [×÷] \d+)+) = (\d+) (cm(?:²|³)?)$/.exec(equation);
  if (!match) throw new Error(`Unexpected worked equation: ${equation}`);
  const tokens = match[1].split(' ');
  let value = Number(tokens[0]);
  for (let index = 1; index < tokens.length; index += 2) {
    const operand = Number(tokens[index + 1]);
    value = tokens[index] === '×' ? value * operand : value / operand;
  }
  expect(value).toBe(Number(match[2]));
  return value;
}

const SEEDS = [
  -2147483648, -77, -1, 0, 1, 2, 19, 2026, 2147483647,
  ...Array.from({length: 64}, (_, index) => index + 100),
];

describe('volume from proportional dimensions', () => {
  it('checks the independent solver against hand-calculated examples', () => {
    const examples = [
      {
        context: [
          'A cuboid block has a length of 24 cm and a breadth of 8 cm.',
          'Its height is 1/4 of its length.',
        ],
        volume: 1152,
      },
      {
        context: [
          'A cuboid block has a square base and a height of 20 cm.',
          'Each side of its base is 3/4 of its height.',
        ],
        volume: 4500,
      },
      {
        context: [
          'A rectangular tank has an inside length of 36 cm and an inside height of 40 cm.',
          'Its inside breadth is 1/3 of its inside length.',
          'Water fills the tank to 3/4 of its inside height.',
        ],
        volume: 12960,
      },
    ];
    for (const example of examples) {
      expect(solveVisibleGivens(example.context).volume).toBe(example.volume);
    }
    expect(() => solveVisibleGivens(['A tank contains some water.'])).toThrow();
  });

  it('independently solves visible givens across varied seeds and all variants', () => {
    const variants = new Set<string>();
    const contexts = new Set<string>();
    for (const seed of SEEDS) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisibleGivens(question.context ?? []);
        variants.add(solution.variant);
        contexts.add(JSON.stringify(question.context));
        expect(question.answer).toBe(String(solution.volume));
        expect(question.unit).toBe('cm³');
        expect(question.prompt).toContain('volume');
        expect(question.choices).toBeUndefined();
        expect(question.picture).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(Number.isSafeInteger(solution.volume)).toBe(true);
        expect(solution.volume).toBeGreaterThan(0);
        expect(solution.volume).toBeLessThan(100000);
        for (const dimension of solution.dimensions) {
          expect(Number.isSafeInteger(dimension)).toBe(true);
          expect(dimension).toBeGreaterThan(0);
          expect(dimension).toBeLessThanOrEqual(60);
        }
        for (const [numerator, denominator] of solution.fractions) {
          expect(numerator).toBeGreaterThan(0);
          expect(numerator).toBeLessThan(denominator);
          expect(denominator).toBeGreaterThanOrEqual(2);
          expect(denominator).toBeLessThanOrEqual(4);
        }
      }
    }
    expect([...variants].sort()).toEqual(['height', 'square-base', 'water']);
    expect(contexts.size).toBeGreaterThan(50);
  });

  it('provides accurate intermediate equations and a final cubic-centimetre result', () => {
    for (const seed of SEEDS) {
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisibleGivens(question.context ?? []);
        const steps = question.workedSteps ?? [];
        expect(steps).toHaveLength(solution.variant === 'height' ? 2 : 3);
        expect(question.hint.length).toBeGreaterThan(20);
        for (const step of steps) {
          expect(step.text.length).toBeGreaterThan(10);
          checkWorkedEquation(step.equation ?? '');
          expect(question.explanation).toContain(step.text);
          expect(question.explanation).toContain(step.equation);
        }
        const finalEquation = steps[steps.length - 1].equation ?? '';
        expect(finalEquation.endsWith(' cm³')).toBe(true);
        expect(checkWorkedEquation(finalEquation)).toBe(solution.volume);
      }
    }
  });

  it('keeps metadata consistent and generation deterministic', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-volume-proportional-dimensions');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.05', 'P5.S.VOL.03', 'P5.S.VOL.04']);
    expect(makeRagQuestion(71)).toEqual(makeRagQuestion(71, 0));
    for (const seed of [-17, 0, 2026]) {
      const variants = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        variants.add(solveVisibleGivens(question.context ?? []).variant);
        keys.add(question.key);
      }
      expect(variants.size).toBe(3);
      expect(keys.size).toBe(3);
    }
  });
});
