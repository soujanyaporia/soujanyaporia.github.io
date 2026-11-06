import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragInternalTransfers';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'reverse' | 'equalise' | 'difference';
  answers: string[];
  total: number;
  states: number[][];
  transfers: number[];
};

function read(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match.slice(1).map(Number);
}

function only<T>(items: T[]): T {
  if (items.length !== 1) throw new Error(`Expected exactly one solution, found ${items.length}`);
  return items[0];
}

// This interface excludes stored answers, proofs, keys and generation parameters.
// Reverse problems are solved by enumerating integer starting states and replaying transfers.
function solveVisible(question: Visible): Solution {
  const text = [...(question.context ?? []), question.prompt].join('\n');
  if (text.includes('Lila passes')) {
    const [total] = read(text, /have (\d+) counters altogether/);
    const [an, ad] = read(text, /Lila passes (\d+)\/(\d+) of her counters to Omar/);
    const [bn, bd] = read(text, /Omar passes (\d+)\/(\d+) of the counters he now has to Wen/);
    const end = total / 3;
    const matches: Solution[] = [];
    for (let lila = 1; lila < total - 1; lila += 1) {
      if ((lila * an) % ad !== 0) continue;
      const firstGift = lila * an / ad;
      if (lila - firstGift !== end) continue;
      for (let omar = 1; omar < total - lila; omar += 1) {
        const wen = total - lila - omar;
        const held = omar + firstGift;
        if ((held * bn) % bd !== 0) continue;
        const secondGift = held * bn / bd;
        if (held - secondGift !== end || wen + secondGift !== end) continue;
        matches.push({
          kind: 'reverse', answers: [String(end), String(omar)], total,
          states: [[lila, omar, wen], [end, held, wen], [end, end, end]],
          transfers: [firstGift, secondGift],
        });
      }
    }
    return only(matches);
  }

  if (text.includes('trays P, Q and R')) {
    const [an, ad, bn, bd] = read(text,
      /puts (\d+)\/(\d+) of all the counters in tray P, then (\d+)\/(\d+) of the remaining counters in tray Q/);
    const [givenTransfer] = read(text, /Next, (\d+) counters are moved from tray R to tray Q/);
    const matches: Solution[] = [];
    // A positive gap from one third is at least 1/(3*ad*bd).
    // This search bound follows entirely from the visible fractions and transfer.
    const maximumTotal = 3 * ad * bd * givenTransfer;
    for (let total = 3; total <= maximumTotal; total += 3) {
      const pCount = total * an / ad;
      const qCount = (total - pCount) * bn / bd;
      const rCount = total - pCount - qCount;
      if (![pCount, qCount, rCount].every(n => Number.isInteger(n) && n > 0)) continue;
      const end = total / 3;
      const toP = end - pCount;
      if (toP <= 0 || qCount + givenTransfer !== end) continue;
      if (rCount - givenTransfer - toP !== end) continue;
      // Find the smallest possible denominator directly from the counted objects.
      let fractionAnswer: string[] | undefined;
      for (let denominator = 1; denominator <= total; denominator += 1) {
        if ((rCount * denominator) % total === 0) {
          fractionAnswer = [String(rCount * denominator / total), String(denominator)];
          break;
        }
      }
      if (!fractionAnswer) throw new Error('Could not express the visible count as a fraction');
      matches.push({
        kind: 'equalise', answers: [...fractionAnswer, String(total)], total,
        states: [
          [pCount, qCount, rCount],
          [pCount, qCount + givenTransfer, rCount - givenTransfer],
          [end, end, end],
        ],
        transfers: [givenTransfer, toP],
      });
    }
    return only(matches);
  }

  const [total] = read(text, /split (\d+) counters equally/);
  const [fixed] = read(text, /Omar passes (\d+) counters to Lila/);
  const [n, d] = read(text, /Wen passes (\d+)\/(\d+) of his counters to Lila/);
  const start = total / 3;
  const gift = start * n / d;
  const final = [start + fixed + gift, start - fixed, start - gift];
  return {
    kind: 'difference', answers: [String(final[0] - final[2])], total,
    states: [[start, start, start], [start + fixed, start - fixed, start], final],
    transfers: [fixed, gift],
  };
}

describe('internal transfers from visible givens', () => {
  test('anchors the independent solver with three hand-calculated examples', () => {
    const reverse = solveVisible({
      context: [
        'Lila, Omar and Wen have 360 counters altogether.',
        'Lila passes 1/3 of her counters to Omar.',
        'Next, Omar passes 1/4 of the counters he now has to Wen.',
        'They finish with equal numbers of counters. All counters stay with these three children.',
      ],
      prompt: '(a) How many counters does each child have at the end? (b) How many counters did Omar have before either transfer?',
    });
    expect(reverse.answers).toEqual(['120', '100']);
    expect(reverse.states[0]).toEqual([180, 100, 80]);

    const equalise = solveVisible({
      context: [
        'A club arranges all its counters in trays P, Q and R.',
        'It puts 1/5 of all the counters in tray P, then 1/4 of the remaining counters in tray Q. Everything left goes into tray R.',
        'Next, 32 counters are moved from tray R to tray Q. Some counters are also moved from tray R to tray P.',
        'After these two moves, the three trays hold equal numbers of counters. None are added or taken away.',
      ],
      prompt: '(a) What fraction of all the counters was in tray R at the start? Give the simplest fraction. (b) How many counters are there in all?',
    });
    expect(equalise.answers).toEqual(['3', '5', '240']);
    expect(equalise.states[0]).toEqual([48, 48, 144]);

    const difference = solveVisible({
      context: [
        'Lila, Omar and Wen split 270 counters equally.',
        'Omar passes 17 counters to Lila.',
        'Wen passes 2/5 of his counters to Lila.',
        'No other counters change hands.',
      ],
      prompt: 'How many more counters does Lila have than Wen after both transfers?',
    });
    expect(difference.answers).toEqual(['89']);
    expect(difference.states[2]).toEqual([143, 73, 54]);
  });

  test('solves varied seeds independently and checks all transfer states and responses', () => {
    const seeds = [
      ...Array.from({length: 96}, (_, i) => i - 48),
      -2147483648, 2147483647, 4294967295,
    ];
    const seenKinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        seenKinds.add(solved.kind);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        expect(solved.total).toBeLessThan(2000);
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps?.filter(step => step.equation).length).toBeGreaterThanOrEqual(4);
        for (const state of solved.states) {
          expect(state.reduce((sum, n) => sum + n, 0)).toBe(solved.total);
          for (const count of state) {
            expect(Number.isSafeInteger(count)).toBe(true);
            expect(count).toBeGreaterThan(0);
            expect(count).toBeLessThan(solved.total);
          }
        }
        for (const transfer of solved.transfers) {
          expect(Number.isSafeInteger(transfer)).toBe(true);
          expect(transfer).toBeGreaterThan(0);
        }
        for (const match of (q.context ?? []).join(' ').matchAll(/(\d+)\/(\d+)/g)) {
          const numerator = Number(match[1]);
          const denominator = Number(match[2]);
          expect(numerator).toBeGreaterThan(0);
          expect(numerator).toBeLessThan(denominator);
          expect(denominator).toBeLessThanOrEqual(9);
        }
        if (solved.kind === 'difference') {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('counters');
          expect(q.answer).toBe(solved.answers[0]);
          expect(Number(q.answer)).toBeGreaterThan(0);
        } else {
          expect(q.prompt).toContain('(a)');
          expect(q.prompt).toContain('(b)');
          expect(q.structuredResponse?.kind).toBe(solved.kind === 'reverse' ? 'number-pair' : 'number-fields');
          const spec = q.structuredResponse;
          if (!spec) throw new Error('Missing linked response controls');
          const expected = JSON.stringify(solved.answers);
          expect(q.answer).toBe(expected);
          expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
          for (let field = 0; field < solved.answers.length; field += 1) {
            const wrong = [...solved.answers];
            wrong[field] = String(Number(wrong[field]) + 1);
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
          }
          if (solved.kind === 'equalise') {
            expect(q.prompt).toContain('simplest fraction');
            const unsimplified = [
              String(Number(solved.answers[0]) * 2),
              String(Number(solved.answers[1]) * 2),
              solved.answers[2],
            ];
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(unsimplified))).toBe(false);
          }
        }
      }
    }
    expect([...seenKinds].sort()).toEqual(['difference', 'equalise', 'reverse']);
    expect(visibleQuestions.size).toBeGreaterThan(60);
  });

  test('repeats deterministically and selects all three variants across consecutive indices', () => {
    for (const seed of [-29, 0, 17, 2026, 4294967295]) {
      const kinds = new Set<string>();
      for (const index of [-1, 0, 1]) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible({context: q.context, prompt: q.prompt}).kind);
      }
      expect(kinds.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-internal-transfers-changing-shares');
  });
});
