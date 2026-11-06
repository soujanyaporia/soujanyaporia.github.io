import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRatioPartsComparedWithSums';

// The solver receives only text visible before answering.
type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'display'>;
type Solution = {
  kind: 'ratio' | 'fraction';
  expected: string;
  givens: number[];
  counts: number[];
};

function visibleOnly(question: Question): VisibleQuestion {
  return {
    prompt: question.prompt,
    context: question.context,
    display: question.display,
  };
}

// Deliberately use trial divisors rather than the generator's Euclidean algorithm.
function reduceCounts(a: number, b: number): [number, number] {
  for (let divisor = Math.min(a, b); divisor >= 1; divisor--) {
    if (a % divisor === 0 && b % divisor === 0) {
      return [a / divisor, b / divisor];
    }
  }
  throw new Error('Expected positive integer counts');
}

function solveVisible(question: VisibleQuestion): Solution {
  const text = (question.context ?? []).join('\n');
  if (question.prompt.startsWith('Find the ratio of star stickers to all the stickers')) {
    if (!text.includes('only oval stickers and star stickers')) {
      throw new Error('The whole must contain exactly the two stated groups');
    }
    const comparison = /The number of oval stickers is (\d+)\/(\d+) of the number of star stickers\./.exec(text);
    if (!comparison) throw new Error('Missing visible fractional comparison');
    const numerator = Number(comparison[1]);
    const denominator = Number(comparison[2]);
    // Construct an integer collection satisfying the visible fraction.
    for (let stars = 1; stars <= 500; stars++) {
      const ovals = stars * numerator / denominator;
      if (ovals > 0 && Number.isInteger(ovals)) {
        const [first, second] = reduceCounts(stars, stars + ovals);
        return {
          kind: 'ratio',
          expected: JSON.stringify([String(first), String(second)]),
          givens: [numerator, denominator],
          counts: [ovals, stars],
        };
      }
    }
    throw new Error('No bounded integer collection satisfies the comparison');
  }

  if (!question.prompt.startsWith('Which fraction of all the buttons are triangular?')) {
    throw new Error('Unrecognised requested group or whole');
  }
  if (!text.includes('only square, round and triangular buttons')) {
    throw new Error('The whole must contain exactly the three stated groups');
  }
  const inner = /The ratio of square buttons to round buttons is (\d+):(\d+)\./.exec(text);
  const combined = /The ratio of triangular buttons to square and round buttons together is (\d+):(\d+)\./.exec(text);
  if (!inner || !combined) throw new Error('Missing visible ratio');
  const a = Number(inner[1]);
  const b = Number(inner[2]);
  const c = Number(combined[1]);
  const d = Number(combined[2]);
  // Satisfy both visible ratios with actual integer counts, then count the whole.
  for (let squares = 1; squares <= 500; squares++) {
    const rounds = squares * b / a;
    if (!Number.isInteger(rounds) || rounds <= 0) continue;
    const triangular = (squares + rounds) * c / d;
    if (!Number.isInteger(triangular) || triangular <= 0) continue;
    const [top, bottom] = reduceCounts(triangular, squares + rounds + triangular);
    return {
      kind: 'fraction',
      expected: `${top}/${bottom}`,
      givens: [a, b, c, d],
      counts: [squares, rounds, triangular],
    };
  }
  throw new Error('The two visible ratios do not produce a bounded integer collection');
}

function fractionTerms(text: string): [number, number] {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match) throw new Error(`Expected a fraction: ${text}`);
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (denominator <= 0) throw new Error('Denominator must be positive');
  return [numerator, denominator];
}

describe('ratio parts compared with sums', () => {
  it('independently solves visible givens across 960 seed/index combinations', () => {
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (let seed = -32; seed < 128; seed++) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const visible = visibleOnly(question);
        const solved = solveVisible(visible);
        kinds.add(solved.kind);
        visibleQuestions.add(JSON.stringify(visible));
        expect(question.answer).toBe(solved.expected);
        expect(solved.givens.every(n => Number.isInteger(n) && n > 0 && n <= 12)).toBe(true);
        expect(solved.counts.every(n => Number.isInteger(n) && n > 0)).toBe(true);
        expect(question.picture).toBeUndefined();
        expect(question.unit).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);

        if (solved.kind === 'ratio') {
          const [n, d] = solved.givens;
          expect(n).toBeLessThan(d);
          expect(['4/5', '3/7']).not.toContain(`${n}/${d}`);
          expect(question.structuredResponse?.kind).toBe('number-pair');
          expect(question.choices).toBeUndefined();
        } else {
          expect(solved.givens.slice(0, 2).join(':')).not.toBe('1:2');
          expect(solved.givens.slice(2).join(':')).not.toBe('1:4');
          expect(question.structuredResponse).toBeUndefined();
          expect(question.requireSimplified).toBe(true);
          expect(question.choices).toHaveLength(4);
          const options = (question.choices ?? []).map(fractionTerms);
          const [expectedN, expectedD] = fractionTerms(solved.expected);
          expect(options.filter(([n, d]) => n * expectedD === expectedN * d)).toHaveLength(1);
          for (let i = 0; i < options.length; i++) {
            const [n, d] = options[i];
            expect(n).toBeGreaterThan(0);
            expect(n).toBeLessThan(d);
            expect(reduceCounts(n, d)).toEqual([n, d]);
            for (let j = i + 1; j < options.length; j++) {
              expect(n * options[j][1]).not.toBe(options[j][0] * d);
            }
          }
        }
      }
    }
    expect(kinds).toEqual(new Set(['ratio', 'fraction']));
    expect(visibleQuestions.size).toBeGreaterThan(20);
  });

  it('uses existing grading controls with the requested order and simplest form', () => {
    const kinds = new Set<string>();
    for (let seed = -20; seed < 20; seed++) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        kinds.add(solved.kind);
        expect(correctAnswer(question, solved.expected)).toBe(true);
        expect(correctAnswer(question, '')).toBe(false);
        if (solved.kind === 'ratio') {
          const terms = JSON.parse(solved.expected) as string[];
          const scaled = terms.map(term => String(Number(term) * 2));
          expect(correctAnswer(question, JSON.stringify(scaled))).toBe(false);
          expect(correctAnswer(question, JSON.stringify([...terms].reverse()))).toBe(false);
        } else {
          const [n, d] = fractionTerms(solved.expected);
          expect(correctAnswer(question, `${2 * n}/${2 * d}`)).toBe(false);
          expect(correctAnswer(question, `${d - n}/${d}`)).toBe(false);
          expect((question.choices ?? []).filter(choice => correctAnswer(question, choice))).toEqual([solved.expected]);
        }
      }
    }
    expect(kinds.size).toBe(2);
  });

  it('is deterministic and varies visible questions when the index changes', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-ratio-parts-compared-with-sums');
    const signatures = new Set<string>();
    const keys = new Set<string>();
    for (let index = 0; index < 64; index++) {
      const question = makeRagQuestion(812, index);
      expect(makeRagQuestion(812, index)).toEqual(question);
      signatures.add(JSON.stringify(visibleOnly(question)));
      keys.add(question.key);
    }
    expect(signatures.size).toBeGreaterThan(10);
    expect(keys.size).toBe(64);
    expect(makeRagQuestion(812)).toEqual(makeRagQuestion(812, 0));
  });
});
