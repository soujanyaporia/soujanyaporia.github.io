import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragMeasurementOrdering';

type Amount = {numerator: number; denominator: number; dimension: 'length' | 'volume'};
type VisibleQuestion = Pick<Question, 'prompt' | 'display' | 'order'>;

// This parser reads only pupil-visible measurement strings. Lengths are
// independently normalised to millimetres, not the generator's centimetres.
function readMeasurement(label: string): Amount {
  const compound = /^(\d+) L (\d+) mL$/.exec(label);
  if (compound) {
    return {numerator: Number(compound[1]) * 1000 + Number(compound[2]), denominator: 1, dimension: 'volume'};
  }
  const match = /^(.*?) (mL|L|km|cm|m)$/.exec(label);
  if (!match) throw new Error(`Unreadable visible measurement: ${label}`);
  const quantity = match[1];
  const unit = match[2];
  let numerator: number;
  let denominator: number;
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(quantity);
  const fraction = /^(\d+)\/(\d+)$/.exec(quantity);
  if (mixed) {
    denominator = Number(mixed[3]);
    numerator = Number(mixed[1]) * denominator + Number(mixed[2]);
  } else if (fraction) {
    numerator = Number(fraction[1]);
    denominator = Number(fraction[2]);
  } else {
    if (!/^\d+(?:\.\d+)?$/.test(quantity)) throw new Error(`Unreadable quantity: ${quantity}`);
    const [whole, decimal = ''] = quantity.split('.');
    denominator = 10 ** decimal.length;
    numerator = Number(whole) * denominator + Number(decimal || '0');
  }
  if (denominator <= 0) throw new Error('Non-positive denominator');
  const factors: Record<string, number> = {mL: 1, L: 1000, km: 1000000, m: 1000, cm: 10};
  return {
    numerator: numerator * factors[unit],
    denominator,
    dimension: unit === 'L' || unit === 'mL' ? 'volume' : 'length',
  };
}

function compare(left: Amount, right: Amount): number {
  if (left.dimension !== right.dimension) throw new Error('Incompatible units');
  return left.numerator * right.denominator - right.numerator * left.denominator;
}

function visibleValues(q: VisibleQuestion): string[] {
  if (q.order) return q.order.slice();
  if (!q.display) throw new Error('Missing visible givens');
  return q.display.split(' ; ');
}

function solveVisible(q: VisibleQuestion) {
  const givens = visibleValues(q);
  const descending = q.prompt.includes('largest to smallest');
  const smallest = q.prompt.includes('is the smallest?');
  if (!descending && !smallest && !q.prompt.includes('smallest to largest')) {
    throw new Error('Missing ordering direction');
  }
  const sorted = givens.slice().sort((a, b) => {
    const difference = compare(readMeasurement(a), readMeasurement(b));
    return descending ? -difference : difference;
  });
  return {
    givens,
    sorted,
    descending,
    smallest,
    answer: smallest ? sorted[0] : sorted.join(descending ? ',' : ', '),
  };
}

function validChoice(choice: string, solution: ReturnType<typeof solveVisible>): boolean {
  if (solution.smallest) {
    return solution.givens.includes(choice) && solution.givens.every(other =>
      compare(readMeasurement(choice), readMeasurement(other)) <= 0);
  }
  const items = choice.split(', ');
  if (items.slice().sort().join('|') !== solution.givens.slice().sort().join('|')) return false;
  return items.every((item, position) => position === 0 ||
    compare(readMeasurement(items[position - 1]), readMeasurement(item)) < 0);
}

describe('measurement ordering candidate', () => {
  it('independently solves visible givens and finds exactly one valid choice across varied seeds', () => {
    const covered = new Set<string>();
    const firstVolumeForms = new Set<string>();
    const visibleSignatures = new Set<string>();
    const seeds = [-2147483648, -73, -1, ...Array.from({length: 128}, (_, i) => i), 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(q);
        const amounts = solved.givens.map(readMeasurement);
        const dimension = amounts[0].dimension;
        covered.add(`${solved.descending ? 'descending' : solved.smallest ? 'smallest' : 'ascending'}:${dimension}`);
        visibleSignatures.add(`${q.prompt}|${solved.givens.join('|')}`);
        expect(q.answer).toBe(solved.answer);
        expect(new Set(solved.givens).size).toBe(solved.givens.length);
        expect(solved.givens.length).toBe(dimension === 'length' ? 4 : 3);
        for (let a = 0; a < amounts.length; a++) {
          const amount = amounts[a];
          expect(amount.dimension).toBe(dimension);
          expect(amount.numerator).toBeGreaterThan(0);
          expect(amount.numerator / amount.denominator).toBeLessThan(dimension === 'length' ? 4000000 : 19000);
          for (let b = a + 1; b < amounts.length; b++) expect(compare(amount, amounts[b])).not.toBe(0);
        }
        if (solved.descending) {
          expect(q.order).toEqual(solved.givens);
          expect(q.order!.join(',')).not.toBe(solved.answer);
          expect(q.choices).toBeUndefined();
        } else {
          expect(q.order).toBeUndefined();
          expect(q.choices?.length).toBe(solved.smallest ? 3 : 4);
          expect(new Set(q.choices).size).toBe(q.choices!.length);
          expect(q.choices!.filter(choice => validChoice(choice, solved))).toEqual([solved.answer]);
          for (const choice of q.choices!) {
            if (solved.smallest) expect(solved.givens).toContain(choice);
            else expect(choice.split(', ').sort()).toEqual(solved.givens.slice().sort());
          }
        }
        if (solved.smallest) {
          const label = solved.sorted[0];
          firstVolumeForms.add(label.includes(' mL') ? 'compound' : label.includes('/') ? 'fraction' : 'decimal');
        }
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(10);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(solved.givens.length + 2);
      }
    }
    expect([...covered].sort()).toEqual(['ascending:length', 'ascending:volume', 'descending:volume', 'smallest:volume']);
    expect(firstVolumeForms.size).toBeGreaterThan(1);
    expect(visibleSignatures.size).toBeGreaterThan(200);
  });

  it('checks every worked conversion against its visible measurement', () => {
    for (let seed = 0; seed < 80; seed++) {
      const q = makeRagQuestion(seed, seed % 7);
      const givens = visibleValues(q);
      for (const given of givens) {
        const conversions = q.workedSteps!.filter(step => step.equation?.startsWith(`${given} = `));
        expect(conversions).toHaveLength(1);
        const result = conversions[0].equation!.split(' = ').at(-1)!;
        expect(compare(readMeasurement(given), readMeasurement(result))).toBe(0);
      }
      expect(q.explanation).toBe(q.workedSteps!.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '));
    }
  });

  it('repeats deterministically and changes the visible response task with index', () => {
    for (const seed of [-91, 0, 7, 2026, 987654]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (let index = 0; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const questions = [0, 1, 2, 3].map(index => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.key)).size).toBe(4);
      expect(new Set(questions.map(q => q.prompt)).size).toBe(4);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-measurement-ordering');
    const allowed = new Set(['P5.S.DEC.02', 'P5.S.FRAC.03', 'P4.S.DEC.02']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });

  it('handles leading-zero remainders and fractional smaller units in the independent solver', () => {
    expect(solveVisible({
      prompt: 'Choose the order from smallest to largest.',
      display: '840 mL ; 8 3/4 L ; 8 L 6 mL',
    }).answer).toBe('840 mL, 8 L 6 mL, 8 3/4 L');
    expect(solveVisible({
      prompt: 'Put these volumes in order from largest to smallest.',
      order: ['6 L 8 mL', '6.7 L', '6 3/4 L'],
    }).answer).toBe('6 3/4 L,6.7 L,6 L 8 mL');
    expect(solveVisible({
      prompt: 'Choose the order from smallest to largest.',
      display: '620 m ; 2.4 km ; 3/4 m ; 280 m',
    }).answer).toBe('3/4 m, 280 m, 620 m, 2.4 km');
  });
});
