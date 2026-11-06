import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragPairedQuantitiesFromTotalCost';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

type VisibleGivens = {
  kind: 'bundles' | 'items' | 'notes';
  packA: number;
  packB: number;
  priceA: number;
  priceB: number;
  total: number;
  unit: string;
};

function numbersFrom(pattern: RegExp, text: string): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens in ${text}`);
  return match.slice(1).map(Number);
}

// This reader has access only to the displayed context and question.
function readVisible(question: VisibleQuestion): VisibleGivens {
  const [first = '', second = ''] = question.context ?? [];

  if (first.startsWith('A stall sells muffins')) {
    const [packA, priceA, packB, priceB] = numbersFrom(
      /^A stall sells muffins in packs of (\d+) for \$(\d+) per pack and rolls in packs of (\d+) for \$(\d+) per pack\.$/,
      first,
    );
    const [total] = numbersFrom(
      /^Nisha buys whole packs and gets exactly as many muffins as rolls\. She pays \$(\d+) altogether\.$/,
      second,
    );
    expect(question.prompt).toBe('How many rolls does Nisha buy?');
    return { kind: 'bundles', packA, packB, priceA, priceB, total, unit: 'rolls' };
  }

  if (first.startsWith('For an art activity')) {
    expect(first).toBe('For an art activity, Hana buys the same number of brushes and sketchbooks.');
    const [priceA, priceB, total] = numbersFrom(
      /^A brush costs \$(\d+)\. A sketchbook costs \$(\d+)\. Hana pays \$(\d+) in all\.$/,
      second,
    );
    expect(question.prompt).toBe('How many brushes does Hana buy?');
    return { kind: 'items', packA: 1, packB: 1, priceA, priceB, total, unit: 'brushes' };
  }

  const [priceA, priceB] = numbersFrom(
    /^A donation box contains only \$(\d+) notes and \$(\d+) notes\.$/,
    first,
  );
  const [total] = numbersFrom(
    /^The two types have equal numbers of notes\. Their total value is \$(\d+)\.$/,
    second,
  );
  expect(question.prompt).toBe(`How many $${priceB} notes are in the box?`);
  return { kind: 'notes', packA: 1, packB: 1, priceA, priceB, total, unit: 'notes' };
}

// Enumerate feasible equal counts using only visible prices and pack sizes.
// This does not use the generator's common-multiple calculation or its answer.
function solveVisible(givens: VisibleGivens): number[] {
  const solutions: number[] = [];
  const upperBound = Math.floor(givens.total * givens.packA / givens.priceA);
  for (let count = 1; count <= upperBound; count += 1) {
    if (count % givens.packA !== 0 || count % givens.packB !== 0) continue;
    const costA = count / givens.packA * givens.priceA;
    const costB = count / givens.packB * givens.priceB;
    if (costA + costB === givens.total) solutions.push(count);
  }
  return solutions;
}

describe('paired quantities from total cost', () => {
  it('checks the independent solver against three hand-calculated examples', () => {
    const examples: { question: VisibleQuestion; expected: number }[] = [
      {
        question: {
          context: [
            'A stall sells muffins in packs of 4 for $17 per pack and rolls in packs of 6 for $19 per pack.',
            'Nisha buys whole packs and gets exactly as many muffins as rolls. She pays $356 altogether.',
          ],
          prompt: 'How many rolls does Nisha buy?',
        },
        expected: 48,
      },
      {
        question: {
          context: [
            'For an art activity, Hana buys the same number of brushes and sketchbooks.',
            'A brush costs $3. A sketchbook costs $7. Hana pays $180 in all.',
          ],
          prompt: 'How many brushes does Hana buy?',
        },
        expected: 18,
      },
      {
        question: {
          context: [
            'A donation box contains only $5 notes and $10 notes.',
            'The two types have equal numbers of notes. Their total value is $315.',
          ],
          prompt: 'How many $10 notes are in the box?',
        },
        expected: 21,
      },
    ];
    for (const example of examples) {
      expect(solveVisible(readVisible(example.question))).toEqual([example.expected]);
    }
  });

  it('independently solves varied seeds and checks counts, units and response formats', () => {
    const seeds = [
      -2147483648, -1, 0, 1, 2147483647, Number.MAX_SAFE_INTEGER,
      ...Array.from({ length: 96 }, (_, index) => index * 7919 - 100000),
    ];
    const seenKinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    let sawFractionalUnitPrice = false;

    for (const seed of seeds) {
      for (const index of [0, 1, 2, 3, 7, 19]) {
        const question = makeRagQuestion(seed, index);
        const givens = readVisible(question);
        const solutions = solveVisible(givens);
        seenKinds.add(givens.kind);
        visibleQuestions.add(JSON.stringify([question.context, question.prompt]));

        expect(solutions).toHaveLength(1);
        const solvedCount = solutions[0];
        expect(question.answer).toBe(String(solvedCount));
        expect(Number.isSafeInteger(solvedCount)).toBe(true);
        expect(solvedCount).toBeGreaterThan(0);
        expect(question.unit).toBe(givens.unit);
        expect(question.picture).toBeUndefined();
        expect(question.hint.trim().length).toBeGreaterThan(0);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(question.workedSteps!.every(step => step.text.trim().length > 0)).toBe(true);
        expect(question.explanation).toBe(question.workedSteps!.map(step => step.text).join(' '));
        expect(question.workedSteps!.at(-1)!.text).toContain(String(solvedCount));
        for (const value of [givens.packA, givens.packB, givens.priceA, givens.priceB, givens.total]) {
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }

        if (givens.kind === 'bundles') {
          expect(givens.packA).not.toBe(givens.packB);
          expect(givens.packA).toBeGreaterThanOrEqual(3);
          expect(givens.packB).toBeLessThanOrEqual(9);
          expect(solvedCount % givens.packA).toBe(0);
          expect(solvedCount % givens.packB).toBe(0);
          expect(solvedCount).toBeLessThanOrEqual(150);
          expect(givens.total).toBeLessThanOrEqual(1200);
          expect(question.choices).toBeUndefined();
          sawFractionalUnitPrice ||= givens.priceA % givens.packA !== 0
            || givens.priceB % givens.packB !== 0;
        } else if (givens.kind === 'items') {
          expect(solvedCount).toBeLessThanOrEqual(36);
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices!.filter(choice => choice === String(solvedCount))).toHaveLength(1);
          expect(question.choices!.every(choice => /^[1-9]\d*$/.test(choice))).toBe(true);
          expect(new Set(question.choices)).toEqual(new Set([
            String(solvedCount),
            String(solvedCount / 2),
            String(solvedCount * 2),
            String(givens.total / (givens.priceB - givens.priceA)),
          ]));
        } else {
          expect([2, 5, 10, 50]).toContain(givens.priceA);
          expect([2, 5, 10, 50]).toContain(givens.priceB);
          expect(givens.priceB).toBeGreaterThan(givens.priceA);
          expect(solvedCount).toBeLessThanOrEqual(42);
          expect(givens.total).toBeLessThanOrEqual(2520);
          expect(question.choices).toBeUndefined();
        }
      }
    }

    expect(seenKinds).toEqual(new Set(['bundles', 'items', 'notes']));
    expect(visibleQuestions.size).toBeGreaterThan(50);
    expect(sawFractionalUnitPrice).toBe(true);
  });

  it('is deterministic and keeps seed and index in question identity', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('paired-quantities-from-total-cost');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.01', 'P5.S.RATE.02']);
    for (const seed of [-31, 0, 97, Number.MAX_SAFE_INTEGER]) {
      for (const index of [0, 1, 8]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(makeRagQuestion(seed, index).key).not.toBe(makeRagQuestion(seed, index + 1).key);
      }
    }
  });

  it('solves visible givens independently of stored solution fields', () => {
    for (let index = 0; index < 12; index += 1) {
      const question = makeRagQuestion(713, index);
      const expected = solveVisible(readVisible(question));
      const changedSolution = {
        ...question,
        answer: '999999',
        hint: '',
        explanation: '',
        workedSteps: [],
      };
      expect(solveVisible(readVisible(changedSolution))).toEqual(expected);
    }
  });
});
