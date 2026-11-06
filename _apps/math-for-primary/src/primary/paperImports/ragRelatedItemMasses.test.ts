import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRelatedItemMasses';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solution = {
  kind: 'ratio' | 'difference' | 'contents';
  targetGrams: number;
  emptyGrams: number;
  smallerGrams: number;
  largerGrams: number;
  unit: 'kg' | 'g';
};

function match(text: string, pattern: RegExp): string[] {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Cannot read visible givens: ${text}`);
  return result.slice(1);
}

// Read decimal kilograms exactly as whole grams, independently of the generator.
function toGrams(value: string, unit: 'g' | 'kg'): number {
  if (unit === 'g') {
    if (!/^\d+$/.test(value)) throw new Error('Expected whole grams');
    return Number(value);
  }
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) throw new Error('Invalid kilogram precision');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}

function unique(solutions: Solution[]): Solution {
  if (solutions.length !== 1) throw new Error(`Expected one positive whole-gram solution, found ${solutions.length}`);
  return solutions[0];
}

// Only visible question fields are available here. Enumerate possible masses and
// verify both weighings, rather than repeating the generation formula.
function solveVisible(q: Visible): Solution {
  const c = q.context ?? [];
  const solutions: Solution[] = [];
  if (q.prompt === 'What is the mass of the empty box in kilograms?') {
    if (q.unit !== 'kg' || c.length !== 3) throw new Error('Invalid box response');
    const [woodCount, firstTotal] = match(c[0], /^A box holds only (\d+) identical wooden discs\. The box and discs together have a mass of (\d+) g\.$/).map(Number);
    const [metalText, totalText] = match(c[1], /^After all the wooden discs are removed, (\d+) identical metal discs are put in the same box\. The box and metal discs together have a mass of (\d+(?:\.\d+)?) kg\.$/);
    const metalCount = Number(metalText);
    const secondTotal = toGrams(totalText, 'kg');
    const multiplier = Number(match(c[2], /^Each metal disc has (\d+) times the mass of each wooden disc\.$/)[0]);
    const extraCount = metalCount * multiplier - woodCount;
    if (woodCount < 1 || metalCount < 1 || multiplier <= 1 || extraCount < 2 || extraCount > 9 || secondTotal <= firstTotal) throw new Error('Invalid ratio bounds');
    for (let wood = 1; wood * woodCount < firstTotal; wood++) {
      const empty = firstTotal - woodCount * wood;
      const metal = multiplier * wood;
      if (empty + metalCount * metal === secondTotal) {
        solutions.push({kind: 'ratio', targetGrams: empty, emptyGrams: empty, smallerGrams: wood, largerGrams: metal, unit: 'kg'});
      }
    }
    return unique(solutions);
  }

  if (q.prompt === 'What is the mass of the empty tray in kilograms?') {
    if (q.unit !== 'kg' || c.length !== 3) throw new Error('Invalid tray response');
    const [blocks, balls, before] = match(c[0], /^A tray holds only (\d+) identical wooden blocks and (\d+) identical metal balls\. The total mass, including the tray, is (\d+) g\.$/).map(Number);
    const [removedBlocks, removedBalls, after] = match(c[1], /^Removing (\d+) blocks and (\d+) balls leaves a total mass of (\d+) g, including the same tray\.$/).map(Number);
    const extra = Number(match(c[2], /^Each metal ball is (\d+) g heavier than each wooden block\.$/)[0]);
    if (removedBlocks <= 0 || removedBalls !== removedBlocks || blocks <= removedBlocks || balls <= removedBalls || extra <= 0 || after <= 0 || before <= after) throw new Error('Invalid removal bounds');
    for (let block = 1; block * blocks < before; block++) {
      const ball = block + extra;
      const empty = before - blocks * block - balls * ball;
      if (empty > 0 && empty + (blocks - removedBlocks) * block + (balls - removedBalls) * ball === after) {
        solutions.push({kind: 'difference', targetGrams: empty, emptyGrams: empty, smallerGrams: block, largerGrams: ball, unit: 'kg'});
      }
    }
    return unique(solutions);
  }

  if (q.prompt !== 'What is the mass of the dried peas in grams?' || q.unit !== 'g' || c.length !== 4 || c[0] !== 'Two empty tubs have the same mass.') throw new Error('Unknown or incomplete visible question');
  const firstTotal = Number(match(c[1], /^One tub holds only dried peas\. The tub and peas together have a mass of (\d+) g\.$/)[0]);
  const secondTotal = Number(match(c[2], /^The other tub holds only lentils\. The tub and lentils together have a mass of (\d+) g\.$/)[0]);
  const multiplier = Number(match(c[3], /^The lentils alone have (\d+) times the mass of the dried peas alone\.$/)[0]);
  if (multiplier <= 1 || secondTotal <= firstTotal) throw new Error('Invalid contents bounds');
  for (let peas = 1; peas < firstTotal; peas++) {
    const empty = firstTotal - peas;
    const lentils = secondTotal - empty;
    if (lentils === multiplier * peas) {
      solutions.push({kind: 'contents', targetGrams: peas, emptyGrams: empty, smallerGrams: peas, largerGrams: lentils, unit: 'g'});
    }
  }
  return unique(solutions);
}

const fixtures: Visible[] = [
  {
    prompt: 'What is the mass of the empty box in kilograms?', unit: 'kg',
    context: [
      'A box holds only 17 identical wooden discs. The box and discs together have a mass of 730 g.',
      'After all the wooden discs are removed, 7 identical metal discs are put in the same box. The box and metal discs together have a mass of 0.83 kg.',
      'Each metal disc has 3 times the mass of each wooden disc.',
    ],
  },
  {
    prompt: 'What is the mass of the empty tray in kilograms?', unit: 'kg',
    context: [
      'A tray holds only 8 identical wooden blocks and 6 identical metal balls. The total mass, including the tray, is 999 g.',
      'Removing 3 blocks and 3 balls leaves a total mass of 699 g, including the same tray.',
      'Each metal ball is 16 g heavier than each wooden block.',
    ],
  },
  {
    prompt: 'What is the mass of the dried peas in grams?', unit: 'g',
    context: [
      'Two empty tubs have the same mass.',
      'One tub holds only dried peas. The tub and peas together have a mass of 291 g.',
      'The other tub holds only lentils. The tub and lentils together have a mass of 957 g.',
      'The lentils alone have 4 times the mass of the dried peas alone.',
    ],
  },
];

describe('related item masses in loaded containers', () => {
  it('solves independently specified visible examples of all three variants', () => {
    expect(fixtures.map(q => solveVisible(q).targetGrams)).toEqual([305, 315, 222]);
    expect(fixtures.map(q => solveVisible(q).emptyGrams)).toEqual([305, 315, 69]);
  });

  it('matches a unique solution from visible givens across seeds and indices', () => {
    const seeds = [-2147483648, -1, 0, 2147483647, 4294967295, ...Array.from({length: 60}, (_, i) => i * 101 - 900)];
    const kinds = new Set<string>();
    const contexts = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({context: q.context, prompt: q.prompt, unit: q.unit});
        kinds.add(solution.kind);
        contexts.add(JSON.stringify(q.context));
        expect(toGrams(q.answer, solution.unit)).toBe(solution.targetGrams);
        expect(Number.isInteger(solution.emptyGrams)).toBe(true);
        expect(solution.emptyGrams).toBeGreaterThan(0);
        expect(solution.smallerGrams).toBeGreaterThan(0);
        expect(solution.largerGrams).toBeGreaterThan(solution.smallerGrams);
        expect(solution.targetGrams).toBeLessThan(1000);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(makeRagQuestion(seed, index)).toEqual(q);
      }
    }
    expect([...kinds].sort()).toEqual(['contents', 'difference', 'ratio']);
    expect(contexts.size).toBeGreaterThan(100);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-related-item-masses-in-loaded-containers');
  });

  it('rejects inconsistent visible totals, missing givens and wrong response units', () => {
    for (const fixture of fixtures) {
      const context = [...fixture.context!];
      const totalLine = fixture.unit === 'g' ? 1 : 0;
      context[totalLine] = context[totalLine].replace(/(\d+) g\.$/, (_, value: string) => `${Number(value) + 1} g.`);
      expect(() => solveVisible({...fixture, context})).toThrow(/Expected one/);
      expect(() => solveVisible({...fixture, context: fixture.context!.slice(0, -1)})).toThrow();
      expect(() => solveVisible({...fixture, unit: fixture.unit === 'g' ? 'kg' : 'g'})).toThrow();
    }
  });
});
