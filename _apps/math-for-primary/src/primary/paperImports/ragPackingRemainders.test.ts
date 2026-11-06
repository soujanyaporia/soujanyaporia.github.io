import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragPackingRemainders';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Givens =
  | {kind: 'pouches'; small: number; large: number; extra: number; shortage: number}
  | {kind: 'attendance'; known: number[]; small: number; large: number; first: number; second: number};

function extract(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1).map(Number);
}

// This parser sees only the displayed question, never its answer or worked solution.
function readGivens(question: VisibleQuestion): Givens {
  const text = (question.context ?? []).join(' ');
  if (question.prompt.startsWith('(a)')) {
    const [small, extra] = extract(text, /Hana puts (\d+) tokens in every full pouch and has (\d+) tokens left/);
    const [large, shortage] = extract(text, /Ravi puts (\d+) tokens in every full pouch\. His last pouch is partly filled and needs (\d+) more tokens/);
    return {kind: 'pouches', small, large, extra, shortage};
  }
  const known = extract(text, /Art sends (\d+) pupils, Chess sends (\d+) pupils, Garden sends (\d+) pupils and Music sends (\d+) pupils/);
  const rules = [...text.matchAll(/Making teams of (\d+) pupils leaves (\d+) pupils without a team/g)];
  if (rules.length !== 2) throw new Error('Expected two visible grouping rules');
  return {
    kind: 'attendance', known,
    small: Number(rules[0][1]), first: Number(rules[0][2]),
    large: Number(rules[1][1]), second: Number(rules[1][2]),
  };
}

// Exhaustive search is independent of the generator's difference and LCM formulas.
function solveVisible(question: VisibleQuestion): number[] {
  const g = readGivens(question);
  if (g.kind === 'pouches') {
    let equal: number | undefined;
    let unequal: number | undefined;
    for (let total = 1; total <= 2 * g.small * g.large; total++) {
      if (total <= g.extra || (total - g.extra) % g.small !== 0) continue;
      if ((total + g.shortage) % g.large !== 0) continue;
      const hana = (total - g.extra) / g.small;
      const ravi = (total + g.shortage) / g.large;
      if (hana < 1 || ravi < 1) continue;
      if (hana === ravi && equal === undefined) equal = total;
      if (hana !== ravi && unequal === undefined) unequal = total;
    }
    if (equal === undefined || unequal === undefined) throw new Error('No solutions within the one-digit search domain');
    return [equal, unequal];
  }
  const knownTotal = g.known.reduce((sum, value) => sum + value, 0);
  for (let missing = 1; missing <= g.small * g.large; missing++) {
    const total = knownTotal + missing;
    if (total % g.small === g.first && total % g.large === g.second) return [missing];
  }
  throw new Error('No positive missing attendance satisfies the visible rules');
}

function pouchFixture(small: number, large: number, extra: number, shortage: number): VisibleQuestion {
  return {
    context: [
      'Hana and Ravi each have the same number of tokens.',
      `Hana puts ${small} tokens in every full pouch and has ${extra} tokens left outside the pouches.`,
      `Ravi puts ${large} tokens in every full pouch. His last pouch is partly filled and needs ${shortage} more tokens to be full.`,
      'Count Ravi’s partly filled pouch.',
    ],
    prompt: '(a) Find the total for equal pouch counts. (b) Find the least total for different pouch counts.',
  };
}

describe('simultaneous packing remainders', () => {
  it('solves both visible variants independently across varied seeds and indices', () => {
    const variants = new Set<string>();
    const visibleQuestions = new Set<string>();
    let sawNonCoprime = false;
    for (let seed = -40; seed < 160; seed++) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const givens = readGivens(question);
        const expected = solveVisible(question);
        variants.add(givens.kind);
        visibleQuestions.add(JSON.stringify([question.prompt, question.context]));
        expect(givens.small).toBeGreaterThanOrEqual(3);
        expect(givens.large).toBeLessThanOrEqual(9);
        expect(givens.large).toBeGreaterThan(givens.small);
        for (let divisor = 2; divisor <= givens.small; divisor++) {
          if (givens.small % divisor === 0 && givens.large % divisor === 0) sawNonCoprime = true;
        }
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(question.picture).toBeUndefined();
        if (givens.kind === 'pouches') {
          expect(givens.extra).toBeGreaterThan(0);
          expect(givens.extra).toBeLessThan(givens.small);
          expect(givens.shortage).toBeGreaterThan(0);
          expect(givens.shortage).toBeLessThan(givens.large);
          expect(JSON.parse(question.answer)).toEqual(expected.map(String));
          expect(question.prompt).toContain('In a separate case');
          expect(question.context?.join(' ')).toContain('count Ravi’s partly filled pouch');
          const spec = question.structuredResponse;
          if (!spec) throw new Error('The linked parts need two response fields');
          expect(spec.kind).toBe('number-fields');
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(expected.map(String)))).toBe(true);
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([...expected].reverse().map(String)))).toBe(false);
        } else {
          expect(givens.first).toBeGreaterThan(0);
          expect(givens.first).toBeLessThan(givens.small);
          expect(givens.second).toBeGreaterThan(0);
          expect(givens.second).toBeLessThan(givens.large);
          expect(question.answer).toBe(String(expected[0]));
          expect(expected[0]).toBeGreaterThan(0);
          expect(expected[0]).toBeLessThanOrEqual(36);
          expect(question.unit).toBe('pupils');
          expect(question.context?.join(' ')).toContain('Each club sends at least one pupil');
          expect(question.structuredResponse).toBeUndefined();
        }
      }
    }
    expect([...variants].sort()).toEqual(['attendance', 'pouches']);
    expect(visibleQuestions.size).toBeGreaterThan(80);
    expect(sawNonCoprime).toBe(true);
  });

  it('handles shortage signs, the unfinished pouch and shared factors', () => {
    expect(solveVisible(pouchFixture(4, 7, 1, 5))).toEqual([9, 37]);
    expect(solveVisible(pouchFixture(4, 6, 2, 2))).toEqual([10, 22]);
  });

  it('excludes zero attendance even when the known subtotal fits both rules', () => {
    const visible: VisibleQuestion = {
      context: [
        'Each club sends at least one pupil.',
        'Art sends 20 pupils, Chess sends 21 pupils, Garden sends 22 pupils and Music sends 19 pupils. Drama’s number is not given.',
        'Making teams of 4 pupils leaves 2 pupils without a team.',
        'Making teams of 6 pupils leaves 4 pupils without a team.',
      ],
      prompt: 'What is the least possible number of pupils from Drama?',
    };
    expect(solveVisible(visible)).toEqual([12]);
  });

  it('is deterministic and changes variant across consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-packing-simultaneous-remainders');
    for (const seed of [-999, 0, 17, 2147483647]) {
      for (let index = 0; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(readGivens(makeRagQuestion(seed, index)).kind).not.toBe(readGivens(makeRagQuestion(seed, index + 1)).kind);
      }
    }
  });
});
