import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragP5CountRatiosTotalValue';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solved = {
  expected: string;
  unit: string;
  kind: 'purchase-count' | 'expenditure-difference' | 'note-count' | 'equal-subtotals';
  spendingDirection?: number;
};

function match(text: string, expression: RegExp): RegExpMatchArray {
  const result = text.match(expression);
  if (!result) throw new Error(`Missing visible given for ${expression}`);
  return result;
}

function cents(value: string): number {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error('Money must show dollars and two cent digits');
  const [whole, fraction] = value.split('.');
  return Number(whole) * 100 + Number(fraction);
}

function unique<T>(values: T[]): T {
  expect(values).toHaveLength(1);
  if (values.length !== 1) throw new Error('Visible constraints do not determine one answer');
  return values[0];
}

// This solver receives only learner-visible text and units. It enumerates
// possible counts rather than reusing the generator's matching-group formula.
function solveVisible(q: Visible): Solved {
  const text = (q.context ?? []).join('\n');
  if (text.includes('notes for every')) {
    const denominations = match(text, /keeps only \$(\d+) coins and \$(\d+) notes in a tin\./);
    const coinValue = Number(denominations[1]) * 100;
    const noteValue = Number(denominations[2]) * 100;
    const multiple = Number(match(text, /There are (\d+) notes for every \$1 coin\./)[1]);
    const total = cents(match(text, /totals \$(\d+\.\d{2})\./)[1]);
    expect(coinValue).toBe(100);
    expect(noteValue).toBe(200);
    expect(q.prompt).toBe('How many $1 coins are in the tin?');
    const possible: number[] = [];
    for (let coinCount = 1; coinCount * coinValue < total; coinCount++) {
      const noteCount = (total - coinCount * coinValue) / noteValue;
      if (Number.isInteger(noteCount) && noteCount > 0 && noteCount === coinCount * multiple) {
        possible.push(coinCount);
      }
    }
    return {expected: String(unique(possible)), unit: 'coins', kind: 'note-count'};
  }

  if (text.includes('coins are worth the same amount altogether')) {
    const denominations = match(text, /has only (\d+)-cent coins and (\d+)-cent coins\./);
    const low = Number(denominations[1]);
    const high = Number(denominations[2]);
    const equal = match(text, /The (\d+)-cent coins are worth the same amount altogether as the (\d+)-cent coins\./);
    expect([Number(equal[1]), Number(equal[2])]).toEqual([low, high]);
    expect([10, 20, 50]).toContain(low);
    expect([10, 20, 50]).toContain(high);
    expect(low).toBeLessThan(high);
    const totalCount = Number(match(text, /There are (\d+) coins in all\./)[1]);
    expect(q.prompt).toBe('What is the value of all the coins, in dollars?');
    const possible: number[] = [];
    for (let lowCount = 1; lowCount < totalCount; lowCount++) {
      const highCount = totalCount - lowCount;
      if (lowCount * low === highCount * high) {
        possible.push(lowCount * low + highCount * high);
      }
    }
    return {expected: (unique(possible) / 100).toFixed(2), unit: 'dollars', kind: 'equal-subtotals'};
  }

  expect(text).toContain('buys only notebooks and pencil cases.');
  const relation = match(text, /For every (\d+) notebooks, \w+ buys (\d+) pencil cases?\./);
  const a = Number(relation[1]);
  const b = Number(relation[2]);
  const prices = match(text, /A notebook costs \$(\d+\.\d{2}) and a pencil case costs \$(\d+\.\d{2})\./);
  const notebookPrice = cents(prices[1]);
  const casePrice = cents(prices[2]);
  const total = cents(match(text, /The total bill is \$(\d+\.\d{2})\./)[1]);
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(0);
  expect(notebookPrice).toBeGreaterThan(0);
  expect(casePrice).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(100000);
  const possible: {notebooks: number; cases: number}[] = [];
  for (let notebooks = 1; notebooks * notebookPrice < total; notebooks++) {
    const cases = (total - notebooks * notebookPrice) / casePrice;
    if (Number.isInteger(cases) && cases > 0 && notebooks * b === cases * a) {
      possible.push({notebooks, cases});
    }
  }
  const counts = unique(possible);
  if (q.prompt.startsWith('What is the difference between the amounts')) {
    expect(q.prompt).toMatch(/spends on notebooks and on pencil cases\? Give your answer in dollars\.$/);
    const signedCents = counts.notebooks * notebookPrice - counts.cases * casePrice;
    expect(signedCents).not.toBe(0);
    return {
      expected: (Math.abs(signedCents) / 100).toFixed(2),
      unit: 'dollars',
      kind: 'expenditure-difference',
      spendingDirection: Math.sign(signedCents),
    };
  }
  const item = match(q.prompt, /^How many (notebooks|pencil cases) does \w+ buy\?$/)[1];
  return {
    expected: String(item === 'notebooks' ? counts.notebooks : counts.cases),
    unit: item,
    kind: 'purchase-count',
  };
}

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, unit: q.unit};
}

describe('count relationships and total value', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const countUnits = new Set<string>();
    const spendingDirections = new Set<number>();
    const prompts = new Set<string>();
    const keys = new Set<string>();
    const seeds = [-2147483648, -101, -1, 2147483647, ...Array.from({length: 96}, (_, i) => i)];
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        expect(q.answer).toBe(solved.expected);
        expect(q.unit).toBe(solved.unit);
        expect(Number(q.answer)).toBeGreaterThan(0);
        if (q.unit !== 'dollars') expect(Number.isInteger(Number(q.answer))).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        kinds.add(solved.kind);
        prompts.add(JSON.stringify([q.prompt, q.context]));
        if (solved.kind === 'purchase-count') countUnits.add(solved.unit);
        if (solved.spendingDirection !== undefined) spendingDirections.add(solved.spendingDirection);
      }
    }
    expect([...kinds].sort()).toEqual(['equal-subtotals', 'expenditure-difference', 'note-count', 'purchase-count']);
    expect([...countUnits].sort()).toEqual(['notebooks', 'pencil cases']);
    expect([...spendingDirections].sort()).toEqual([-1, 1]);
    expect(prompts.size).toBeGreaterThan(100);
  });

  it('is deterministic and treats the omitted index as zero', () => {
    for (const seed of [-7, 0, 19, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 7, 31]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const contexts = Array.from({length: 16}, (_, index) => JSON.stringify(visible(makeRagQuestion(seed, index))));
      expect(new Set(contexts).size).toBeGreaterThan(8);
    }
  });

  it('keeps the independent solver separate from stored answers and explanations', () => {
    for (let seed = 0; seed < 24; seed++) {
      const q = makeRagQuestion(seed, 3);
      const expected = solveVisible(visible(q));
      const tampered: Question = {...q, answer: '-999', hint: '', explanation: '', workedSteps: []};
      expect(solveVisible(visible(tampered))).toEqual(expected);
      expect(tampered.answer).not.toBe(expected.expected);
    }
  });

  it('uses one P5 family and skill IDs present in the supplied curriculum', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-count-ratios-and-total-value');
    expect(RAG_PATTERN.level).toBe(5);
    const allowedSkills = new Set(['P5.S.RATE.02', 'P5.S.WN.02']);
    for (const skill of RAG_PATTERN.skillIds) expect(allowedSkills.has(skill)).toBe(true);
  });
});
