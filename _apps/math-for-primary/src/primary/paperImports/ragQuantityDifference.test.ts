import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragQuantityDifference';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Kind = 'total' | 'offsets' | 'costs' | 'equal-groups';
type Solution = {kind: Kind; fields: string[]; unit?: string};

function match(pattern: RegExp, text: string): RegExpMatchArray {
  const found = text.match(pattern);
  if (!found) throw new Error(`Missing visible given: ${pattern}`);
  return found;
}

// Enumerate integer quantities instead of using the generator's unit construction.
function findPair(
  firstParts: number,
  secondParts: number,
  satisfies: (first: number, second: number) => boolean,
): [number, number] {
  const results: [number, number][] = [];
  for (let first = 1; first <= 2000; first++) {
    const numerator = first * secondParts;
    if (numerator % firstParts !== 0) continue;
    const second = numerator / firstParts;
    if (satisfies(first, second)) results.push([first, second]);
  }
  if (results.length !== 1) throw new Error(`Expected one integer solution, found ${results.length}`);
  return results[0];
}

// This solver can access only the visible prompt and context, never the answer,
// worked solution, key, random state or generation parameters.
function solveVisible(q: VisibleQuestion): Solution {
  const text = `${(q.context ?? []).join('\n')}\n${q.prompt}`;

  if (text.includes('How many books does the club have altogether?')) {
    match(/has only comic books and storybooks/, text);
    const ratio = match(/ratio of comic books to storybooks is (\d+) : (\d+)/, text);
    const difference = Number(match(/There are (\d+) more storybooks than comic books/, text)[1]);
    const [comic, story] = findPair(Number(ratio[1]), Number(ratio[2]), (a, b) => b - a === difference);
    return {kind: 'total', fields: [String(comic + story)], unit: 'books'};
  }

  if (text.includes('How many blue beads are in the tray?')) {
    const ratio = match(/ratio of red beads to blue beads is (\d+) : (\d+)/, text);
    const aboveRed = Number(match(/There are (\d+) more yellow beads than red beads/, text)[1]);
    const aboveBlue = Number(match(/There are (\d+) more yellow beads than blue beads/, text)[1]);
    if (!(aboveRed > aboveBlue && aboveBlue > 0)) throw new Error('Inconsistent visible offsets');
    const [red, blue] = findPair(Number(ratio[1]), Number(ratio[2]), (a, b) => a + aboveRed === b + aboveBlue);
    if (red + aboveRed <= blue) throw new Error('Yellow must exceed both other quantities');
    return {kind: 'offsets', fields: [String(blue)], unit: 'beads'};
  }

  if (text.includes('(a) Give the ratio of the amounts spent')) {
    match(/in simplest form\. \(b\) How much does the order cost altogether\?/, text);
    const fractions = match(/(\d+)\/(\d+) of the items are notebooks and (\d+)\/(\d+) are pens/, text);
    const n1 = Number(fractions[1]);
    const d1 = Number(fractions[2]);
    const n2 = Number(fractions[3]);
    const d2 = Number(fractions[4]);
    const multipliers = match(/One notebook costs (\d+) times the price of one pen and (\d+) times the price of one ruler/, text);
    const m = Number(multipliers[1]);
    const n = Number(multipliers[2]);
    const remainderNumerator = d1 * d2 - n1 * d2 - n2 * d1;
    if (!(n1 > 0 && n1 < d1 && n2 > 0 && n2 < d2 && remainderNumerator > 0 && m > 1 && n > 1)) {
      throw new Error('Invalid fraction or relative-price givens');
    }

    // Take the notebook price as one. Spending weights are f, g/m and (1-f-g)/n.
    // Clear their denominators directly, independently of the generator's price-unit method.
    const weights = [n1 * d2 * m * n, n2 * d1 * n, remainderNumerator * m];
    const ratio = [...weights];
    for (let divisor = 2; divisor <= Math.min(...ratio); divisor++) {
      while (ratio.every(value => value % divisor === 0)) {
        for (let i = 0; i < ratio.length; i++) ratio[i] /= divisor;
      }
    }
    const difference = Number(match(/spends \$(\d+\.\d{2}) more on notebooks than on rulers/, text)[1]);
    const differenceCents = Math.round(difference * 100);
    const weightGap = weights[0] - weights[2];
    if (weightGap <= 0 || differenceCents <= 0) throw new Error('Invalid spending difference');
    const totalCents = differenceCents * weights.reduce((sum, value) => sum + value, 0) / weightGap;
    if (!Number.isSafeInteger(totalCents)) throw new Error('Total is not an exact cent amount');
    return {kind: 'costs', fields: [...ratio.map(String), (totalCents / 100).toFixed(2)]};
  }

  if (text.includes('How many counters were in the tub before packing?')) {
    match(/equal numbers of green and purple counters/, text);
    match(/All the purple counters are put into Bag A and Bag B, with none left over/, text);
    const ratio = match(/ratio of purple counters in Bag A to those in Bag B is (\d+) : (\d+)/, text);
    const difference = Number(match(/Bag B contains (\d+) more purple counters than Bag A/, text)[1]);
    const [bagA, bagB] = findPair(Number(ratio[1]), Number(ratio[2]), (a, b) => b - a === difference);
    const purple = bagA + bagB;
    return {kind: 'equal-groups', fields: [String(purple + purple)], unit: 'counters'};
  }

  throw new Error('Unrecognised visible question');
}

const visible = (q: Question): VisibleQuestion => ({context: q.context, prompt: q.prompt});

 describe('quantity difference candidate', () => {
  it('independently solves all four variants across varied seeds and indices', () => {
    const kinds = new Set<Kind>();
    const questions = new Set<string>();
    for (let seed = -12; seed < 28; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        questions.add(JSON.stringify(visible(q)));
        const expected = solved.kind === 'costs' ? JSON.stringify(solved.fields) : solved.fields[0];
        expect(q.answer).toBe(expected);
        expect(q.unit).toBe(solved.unit);
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(50);
        for (const value of solved.fields) {
          expect(Number(value)).toBeGreaterThan(0);
          expect(Number(value)).toBeLessThanOrEqual(2000);
        }

        if (solved.kind === 'costs') {
          expect(q.structuredResponse?.kind).toBe('number-fields');
          if (q.structuredResponse?.kind !== 'number-fields') throw new Error('Missing linked response');
          expect(q.structuredResponse.fields).toHaveLength(4);
          expect(q.structuredResponse.fields.slice(0, 3).every(field => !field.decimal)).toBe(true);
          expect(q.structuredResponse.fields[3].decimal).toBe(true);
          expect(q.choices).toBeUndefined();
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(Number.isSafeInteger(Number(expected))).toBe(true);
          if (solved.kind === 'equal-groups') {
            expect(q.choices).toHaveLength(4);
            expect(new Set(q.choices).size).toBe(4);
            expect(q.choices?.filter(choice => choice === expected)).toHaveLength(1);
            expect(q.choices?.every(choice => Number.isSafeInteger(Number(choice)) && Number(choice) > 0)).toBe(true);
          } else {
            expect(q.choices).toBeUndefined();
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['costs', 'equal-groups', 'offsets', 'total']);
    expect(questions.size).toBeGreaterThan(60);
  });

  it('is repeatable and covers each variant in four consecutive indices', () => {
    for (const seed of [-2147, 0, 1, 12345678]) {
      const kinds = new Set<Kind>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        kinds.add(solveVisible(visible(q)).kind);
      }
      expect(kinds.size).toBe(4);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  });

  it('uses supported linked fields and rejects unsimplified ratios or a wrong total', () => {
    const q = Array.from({length: 4}, (_, index) => makeRagQuestion(91, index))
      .find(question => solveVisible(visible(question)).kind === 'costs');
    if (!q || q.structuredResponse?.kind !== 'number-fields') throw new Error('Missing cost question');
    const solved = solveVisible(visible(q));
    const spec = q.structuredResponse;
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(solved.fields))).toBe(true);

    const unsimplified = solved.fields.map((value, i) => i < 3 ? String(Number(value) * 2) : value);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(unsimplified))).toBe(false);
    const wrongTotal = [...solved.fields];
    wrongTotal[3] = (Number(wrongTotal[3]) + 1).toFixed(2);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrongTotal))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(solved.fields.slice(0, 3)))).toBe(false);

    const equivalentMoney = [...solved.fields];
    equivalentMoney[3] = String(Number(equivalentMoney[3]));
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(equivalentMoney))).toBe(true);
  });

  it('declares the requested level, family and existing curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-scaling-from-quantity-difference');
    const allowed = new Set(['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.03', 'P6.S.RATIO.04', 'P6.S.RATIO.05']);
    expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });
});
