import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragOverlappingPriceConstraints';

// The oracle receives only displayed givens and response labels.
// It neither reads the answer nor imports generator arithmetic helpers.
type Visible = Pick<Question, 'context' | 'structuredResponse'>;
type Row = {counts: number[]; total: number};

function cents(text: string): number {
  if (!/^\d+\.\d{2}$/.test(text)) throw new Error(`Invalid money: ${text}`);
  const [whole, fraction] = text.split('.');
  return Number(whole) * 100 + Number(fraction);
}

function amount(value: number): string {
  if (!Number.isInteger(value) || value < 0) throw new Error('Expected whole cents');
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function readItems(text: string): number[] {
  const term = /(\d+) (cup|plate|bowl)s?\b/g;
  const counts = [0, 0, 0];
  const terms = [...text.matchAll(term)];
  if (terms.length === 0 || text.replace(term, '').replace(/\band\b|,|\s/g, '') !== '') {
    throw new Error(`Unrecognised visible items: ${text}`);
  }
  for (const match of terms) {
    const count = Number(match[1]);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid quantity');
    counts[['cup', 'plate', 'bowl'].indexOf(match[2])] += count;
  }
  return counts;
}

function determinant(a: number[][]): number {
  return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
    - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
    + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
}

function solveVisible(q: Visible) {
  const rows: Row[] = [];
  for (const line of q.context ?? []) {
    const match = /^A set of (.+) costs \$(\d+\.\d{2})\.$/.exec(line);
    if (match) rows.push({counts: readItems(match[1]), total: cents(match[2])});
  }
  if (rows.length !== 3) throw new Error('Three visible price constraints are required');
  const matrix = rows.map(row => row.counts);
  const divisor = determinant(matrix);
  if (divisor === 0) throw new Error('The visible constraints do not determine unique prices');
  // Cramer's rule provides an independent oracle for all three templates.
  const prices = [0, 1, 2].map(column => determinant(matrix.map((row, i) =>
    row.map((coefficient, j) => j === column ? rows[i].total : coefficient),
  )) / divisor);
  if (prices.some(price => !Number.isInteger(price) || price <= 0)) {
    throw new Error('Prices must be positive whole cents');
  }
  const spec = q.structuredResponse;
  if (!spec || spec.kind !== 'number-pair' || spec.decimal !== true) {
    throw new Error('Two decimal responses are required');
  }
  const targets = [spec.firstLabel, spec.secondLabel].map((label, i) => {
    const match = /^\(([ab])\) Cost of (.+) \(dollars\)$/.exec(label);
    if (!match || match[1] !== (i === 0 ? 'a' : 'b')) throw new Error('Invalid visible target');
    return readItems(match[2]);
  });
  const expected = targets.map(target => amount(target.reduce((sum, count, i) => sum + count * prices[i], 0)));
  return {rows, prices, targets, expected};
}

function visible(q: Question): Visible {
  return {context: q.context, structuredResponse: q.structuredResponse};
}

function response(firstLabel: string, secondLabel: string): NonNullable<Question['structuredResponse']> {
  return {kind: 'number-pair', firstLabel, secondLabel, decimal: true};
}

const fixtures: {name: string; question: Visible; expected: string[]}[] = [
  {
    name: 'shared price followed by the other pair',
    question: {
      context: [
        'A set of 1 cup and 1 plate costs $7.20.',
        'A set of 1 cup and 1 bowl costs $11.40.',
        'A set of 8 cups, 3 plates and 3 bowls costs $60.00.',
      ],
      structuredResponse: response('(a) Cost of 1 cup (dollars)', '(b) Cost of 1 plate and 1 bowl (dollars)'),
    },
    expected: ['2.10', '14.40'],
  },
  {
    name: 'target combination followed by a unit price',
    question: {
      context: [
        'A set of 9 cups, 4 plates and 1 bowl costs $48.20.',
        'A set of 2 cups and 1 bowl costs $13.00.',
        'A set of 1 cup and 1 plate costs $7.00.',
      ],
      structuredResponse: response('(a) Cost of 6 cups and 3 plates (dollars)', '(b) Cost of 1 plate (dollars)'),
    },
    expected: ['28.20', '4.60'],
  },
  {
    name: 'repeated pairs followed by chained subtraction',
    question: {
      context: [
        'A set of 6 cups, 3 plates and 3 bowls costs $50.40.',
        'A set of 1 plate and 1 bowl costs $12.20.',
        'A set of 1 cup and 1 plate costs $6.80.',
      ],
      structuredResponse: response('(a) Cost of 1 cup (dollars)', '(b) Cost of 1 bowl (dollars)'),
    },
    expected: ['2.30', '7.70'],
  },
];

describe('overlapping price constraints', () => {
  test.each(fixtures)('independent oracle solves $name', ({question, expected}) => {
    expect(solveVisible(question).expected).toEqual(expected);
  });

  test('both answers follow from visible givens across varied seeds and indices', () => {
    const seeds = [0, 1, -1, 2147483647, -2147483648,
      ...Array.from({length: 96}, (_, i) => i * 7919 - 400000)];
    const contexts = new Set<string>();
    const structures = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        expect(JSON.parse(q.answer)).toEqual(solved.expected);
        expect(q.unit).toBe('dollars');
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        for (const row of solved.rows) {
          expect(row.total).toBeGreaterThan(0);
          expect(row.total).toBeLessThan(10000);
          expect(row.counts.every(count => Number.isInteger(count) && count >= 0 && count <= 9)).toBe(true);
          expect(row.counts.reduce((sum, count, i) => sum + count * solved.prices[i], 0)).toBe(row.total);
        }
        const largeSet = solved.rows.find(row => row.counts.every(count => count > 0));
        expect(largeSet).toBeDefined();
        structures.add(largeSet!.counts[2] === 1 ? 'target-combination'
          : solved.rows.some(row => row.counts[0] === 0) ? 'repeated-pairs' : 'shared-price');
        contexts.add(JSON.stringify(q.context));
      }
    }
    expect(structures).toEqual(new Set(['shared-price', 'target-combination', 'repeated-pairs']));
    expect(contexts.size).toBeGreaterThan(150);
  });

  test('the existing response control accepts equivalent decimals and rejects wrong or reversed parts', () => {
    for (let seed = 0; seed < 18; seed++) {
      const q = makeRagQuestion(seed);
      const solved = solveVisible(visible(q));
      const spec = q.structuredResponse!;
      const equivalent = JSON.stringify(solved.expected.map(value => String(Number(value))));
      expect(structuredResponseCorrect(spec, q.answer, equivalent)).toBe(true);
      const wrong = [...solved.expected];
      wrong[1] = amount(cents(wrong[1]) + 1);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...solved.expected].reverse()))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([solved.expected[0]]))).toBe(false);
    }
  });

  test('the oracle uses the visible price data and requires a complete independent set of constraints', () => {
    const original = fixtures[0].question;
    const changed: Visible = {
      ...original,
      context: [...original.context!.slice(0, 2), 'A set of 8 cups, 3 plates and 3 bowls costs $62.00.'],
    };
    expect(solveVisible(changed).expected).toEqual(['3.10', '12.40']);
    expect(() => solveVisible({...original, context: original.context!.slice(0, 2)})).toThrow('Three visible');
    expect(() => solveVisible({...original, context: [original.context![0], original.context![1], original.context![0]]})).toThrow('unique prices');
  });

  test('repeated calls are deterministic and metadata identifies this P5 family', () => {
    for (const seed of [-27, 0, 45, 123456]) {
      for (let index = 0; index < 6; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
    expect(makeRagQuestion(12)).toEqual(makeRagQuestion(12, 0));
    expect(makeRagQuestion(12, 0).key).not.toBe(makeRagQuestion(12, 1).key);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-overlapping-price-constraints');
  });
});
