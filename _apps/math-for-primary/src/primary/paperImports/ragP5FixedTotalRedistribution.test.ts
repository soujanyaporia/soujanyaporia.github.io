import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragP5FixedTotalRedistribution';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'rows' | 'friends' | 'difference';
  value: number;
  total: number;
  initialGroups: number;
  initialSize: number;
  divisor: number;
  regrouped: number;
  unit: string;
};

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens: ${pattern}`);
  return match.slice(1).map(Number);
}

// Independent arithmetic: count equal groups by addition, then form new
// groups by subtraction. Only context and prompt are passed to this solver.
function countItems(groups: number, size: number): number {
  if (![groups, size].every(n => Number.isSafeInteger(n) && n > 0)) {
    throw new Error('Expected positive whole counts.');
  }
  let total = 0;
  for (let group = 0; group < groups; group++) total += size;
  return total;
}

function exactGroups(total: number, size: number): number {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Invalid group size.');
  let remaining = total;
  let count = 0;
  while (remaining >= size) {
    remaining -= size;
    count++;
  }
  if (remaining !== 0) throw new Error('The visible givens leave a remainder.');
  return count;
}

function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join(' ');
  let kind: Solution['kind'];
  let initialGroups: number;
  let initialSize: number;
  let divisor: number;
  let unit: string;
  if (q.prompt === 'How many rows of chairs are in the courtyard?') {
    kind = 'rows';
    [initialGroups, initialSize] = readNumbers(text, /A hall has (\d+) rows of chairs, with (\d+) chairs in each row\./);
    [divisor] = readNumbers(text, /arranged with (\d+) chairs in each new row\./);
    unit = 'rows';
  } else if (q.prompt === 'How many stickers does each child get?') {
    kind = 'friends';
    [initialGroups, initialSize] = readNumbers(text, /Mei brings (\d+) boxes of stickers to a club\. There are (\d+) stickers in each box\./);
    const [friends] = readNumbers(text, /among herself and her (\d+) friends\./);
    divisor = friends + 1;
    unit = 'stickers';
  } else if (q.prompt === 'How many fewer beads would each child get with the larger group?') {
    kind = 'difference';
    [initialGroups, initialSize] = readNumbers(text, /enough beads for (\d+) children to get (\d+) beads each/);
    [divisor] = readNumbers(text, /shared equally among (\d+) children instead\./);
    unit = 'beads';
  } else {
    throw new Error('Unrecognised visible task.');
  }
  const total = countItems(initialGroups, initialSize);
  const regrouped = exactGroups(total, divisor);
  const value = kind === 'difference' ? initialSize - regrouped : regrouped;
  return {kind, value, total, initialGroups, initialSize, divisor, regrouped, unit};
}

function checkEquations(q: Question): void {
  expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
  for (const step of q.workedSteps ?? []) {
    expect(step.text.length).toBeGreaterThan(10);
    const [left, right, result] = readNumbers(
      step.equation ?? '', /^(\d+) [×÷+−] (\d+) = (\d+) [a-z]+$/,
    );
    const operator = (step.equation ?? '').split(' ')[1];
    const calculated = operator === '×' ? left * right
      : operator === '÷' ? left / right
      : operator === '+' ? left + right : left - right;
    expect(result).toBe(calculated);
    expect(q.explanation).toContain(step.equation);
  }
}

describe('fixed-total redistribution candidate', () => {
  it('independently solves visible givens, units and choices across varied seeds', () => {
    const seeds = [-123456, -1, 0, 1, 7, 42, 2026, 2147483647, 4294967295,
      ...Array.from({length: 96}, (_, i) => i * 7919)];
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    const answerPositions = new Set<number>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        kinds.add(solved.kind);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        expect(q.answer).toBe(String(solved.value));
        expect(q.unit).toBe(solved.unit);
        expect(Number.isSafeInteger(solved.value)).toBe(true);
        expect(solved.value).toBeGreaterThan(0);
        expect(solved.total).toBeLessThanOrEqual(3000);
        expect(solved.regrouped * solved.divisor).toBe(solved.total);
        expect(q.hint.length).toBeGreaterThan(10);
        expect(q.picture).toBeUndefined();
        checkEquations(q);

        if (solved.kind === 'rows') {
          expect(q.choices).toBeUndefined();
          expect(solved.initialSize).not.toBe(solved.divisor);
          expect(solved.initialGroups).not.toBe(38);
          expect(solved.initialSize).not.toBe(50);
          expect(solved.divisor).not.toBe(20);
        } else {
          const options = q.choices ?? [];
          expect(options).toHaveLength(4);
          expect(new Set(options).size).toBe(4);
          expect(options.filter(option => Number(option) === solved.value)).toHaveLength(1);
          expect(options.every(option => /^[1-9]\d*$/.test(option))).toBe(true);
          answerPositions.add(options.indexOf(String(solved.value)));
          if (solved.kind === 'friends') {
            expect(solved.divisor).toBeGreaterThanOrEqual(4);
            expect(solved.initialGroups).not.toBe(16);
            expect(solved.initialSize).not.toBe(9);
            expect(q.workedSteps?.[0].equation).toBe(`${solved.divisor - 1} + 1 = ${solved.divisor} children`);
          } else {
            expect(solved.divisor).toBeGreaterThan(solved.initialGroups);
            expect(solved.regrouped).toBeLessThan(solved.initialSize);
            expect(solved.initialGroups).not.toBe(6);
            expect(solved.initialSize).not.toBe(42);
            expect(solved.divisor).not.toBe(9);
            expect(q.workedSteps?.at(-1)?.equation).toBe(`${solved.initialSize} − ${solved.regrouped} = ${solved.value} beads`);
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['difference', 'friends', 'rows']);
    expect(visibleQuestions.size).toBeGreaterThan(50);
    expect(answerPositions.size).toBe(4);
  });

  it('counts the owner and asks for the difference rather than the new share', () => {
    const friends = solveVisible({
      context: [
        'Mei brings 18 boxes of stickers to a club. There are 10 stickers in each box.',
        'She takes all the stickers out of the boxes and shares them equally among herself and her 4 friends.',
      ],
      prompt: 'How many stickers does each child get?',
    });
    expect(friends.divisor).toBe(5);
    expect(friends.value).toBe(36);
    const comparison = solveVisible({
      context: [
        'A bag has enough beads for 4 children to get 35 beads each, with none left over.',
        'All the beads in this bag are shared equally among 7 children instead.',
      ],
      prompt: 'How many fewer beads would each child get with the larger group?',
    });
    expect(comparison.regrouped).toBe(20);
    expect(comparison.value).toBe(15);
  });

  it('is reproducible and cycles through all three forms using the index', () => {
    for (const seed of [-17, 0, 23, 1000001]) {
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        kinds.add(solveVisible({context: first.context, prompt: first.prompt}).kind);
      }
      expect(kinds.size).toBe(3);
    }
    expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
    expect(makeRagQuestion(23, 0).key).not.toBe(makeRagQuestion(23, 1).key);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-fixed-total-redistribution');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.02', 'P5.S.WN.03']);
  });
});
