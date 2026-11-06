import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN, makeRagQuestion} from './ragFractionalFilledVolume';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'unit'>;

// Only pupil-visible givens are accepted here: no answer, steps or seed.
// Solve by adding horizontal 1 cm layers, independently of the generator's
// capacity-divide-multiply calculation.
function solveVisible(q: VisibleQuestion) {
  const text = (q.context ?? []).join(' ');
  const dimensions = /measures (\d+) cm long, (\d+) cm wide and (\d+) cm high on the inside\./.exec(text);
  const area = /inside base area of (\d+) cm² and an inside height of (\d+) cm\./.exec(text);
  const fraction = /(\d+)\/(\d+) of (?:its capacity|the tank's height)/.exec(text);
  if ((!dimensions && !area) || (dimensions && area) || !fraction) {
    throw new Error('Missing or ambiguous visible measurements');
  }
  if (q.unit !== 'cm³' || !q.prompt.includes('cm³')) {
    throw new Error('The response must be in cubic centimetres');
  }
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  let height: number;
  let baseArea: number;
  let length: number | undefined;
  let width: number | undefined;
  if (dimensions) {
    length = Number(dimensions[1]);
    width = Number(dimensions[2]);
    height = Number(dimensions[3]);
    baseArea = 0;
    for (let row = 0; row < length; row++) baseArea += width;
  } else {
    baseArea = Number(area![1]);
    height = Number(area![2]);
  }
  if (numerator <= 0 || numerator >= denominator || baseArea <= 0 || height <= 0) {
    throw new Error('Invalid physical givens');
  }
  const waterDepth = height * numerator / denominator;
  if (!Number.isInteger(waterDepth)) throw new Error('Expected whole-centimetre layers');
  let volume = 0;
  let capacity = 0;
  for (let layer = 0; layer < height; layer++) {
    capacity += baseArea;
    if (layer < waterDepth) volume += baseArea;
  }
  const presentation = area ? 'base-area'
    : text.includes("of the tank's height") ? 'fractional-height' : 'dimensions';
  return {volume, capacity, height, baseArea, length, width, numerator, denominator, presentation};
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

const seeds = [-2147483648, -29, -1, 2147483647, Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 96}, (_, i) => i)];

describe('fractional filled volume', () => {
  it('anchors the visible-givens solver with independently calculated examples', () => {
    const cases = [
      {
        context: [
          'A cuboid tank measures 16 cm long, 8 cm wide and 18 cm high on the inside.',
          'Water takes up 2/3 of its capacity.',
        ],
        expected: 1536,
      },
      {
        context: [
          'A cuboid tank has an inside base area of 84 cm² and an inside height of 15 cm.',
          'Water takes up 3/5 of its capacity.',
        ],
        expected: 756,
      },
      {
        context: [
          'A cuboid tank measures 12 cm long, 6 cm wide and 20 cm high on the inside.',
          "The water reaches 3/4 of the tank's height.",
        ],
        expected: 1080,
      },
    ];
    for (const example of cases) {
      expect(solveVisible({context: example.context, prompt: 'Find the water volume in cm³.', unit: 'cm³'}).volume)
        .toBe(example.expected);
    }
  });

  it('independently solves varied seeds and checks response choices, bounds and worked results', () => {
    const presentations = new Set<string>();
    const fractions = new Set<string>();
    const visibleQuestions = new Set<string>();
    const answerPositions = new Set<number>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt, unit: q.unit});
        expect(q.answer).toBe(String(solved.volume));
        expect(Number.isSafeInteger(solved.volume)).toBe(true);
        expect(solved.volume).toBeGreaterThan(0);
        expect(solved.volume).toBeLessThan(solved.capacity);
        expect(solved.capacity).toBeLessThanOrEqual(28224);
        expect(solved.height).toBeGreaterThanOrEqual(6);
        expect(solved.height).toBeLessThanOrEqual(56);
        expect(solved.denominator).toBeGreaterThanOrEqual(2);
        expect(solved.denominator).toBeLessThanOrEqual(8);
        expect(gcd(solved.numerator, solved.denominator)).toBe(1);
        expect(solved.height % solved.denominator).toBe(0);

        if (solved.presentation === 'dimensions') {
          const choices = q.choices ?? [];
          expect(choices).toHaveLength(4);
          expect(new Set(choices).size).toBe(4);
          expect(choices.filter(value => Number(value) === solved.volume)).toHaveLength(1);
          expect(choices.every(value => /^\d+$/.test(value) && Number(value) > 0)).toBe(true);
          answerPositions.add(choices.indexOf(String(solved.volume)));
        } else {
          expect(q.choices).toBeUndefined();
        }

        const equations = (q.workedSteps ?? []).map(step => step.equation ?? '');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(equations.some(equation => equation.endsWith(`= ${solved.capacity} cm³`))).toBe(true);
        expect(equations.some(equation => equation.endsWith(`= ${solved.volume} cm³`))).toBe(true);
        expect(q.explanation).toContain(`${solved.volume} cm³`);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();

        // Reject accidental reproduction of the attached dimension triples.
        if (solved.length !== undefined) {
          expect(['25,10,42', '20,15,5', '4,2,30'])
            .not.toContain([solved.length, solved.width, solved.height].join(','));
        }
        presentations.add(solved.presentation);
        fractions.add(`${solved.numerator}/${solved.denominator}`);
        visibleQuestions.add(JSON.stringify(q.context));
      }
    }
    expect([...presentations].sort()).toEqual(['base-area', 'dimensions', 'fractional-height']);
    expect(fractions.size).toBeGreaterThanOrEqual(8);
    expect(visibleQuestions.size).toBeGreaterThan(100);
    expect(answerPositions.size).toBeGreaterThan(1);
  });

  it('is deterministic and reaches every presentation in three consecutive indices', () => {
    for (const seed of [-17, 0, 7, 91]) {
      const presentations = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        presentations.add(solveVisible(q).presentation);
        keys.add(q.key);
      }
      expect(presentations.size).toBe(3);
      expect(keys.size).toBe(3);
    }
    expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('fractional-filled-or-empty-volume');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.FRAC.05']);
  });
});
