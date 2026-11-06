import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragExtremeDigitArrangements';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

function readVisible(q: VisibleQuestion) {
  const cards = q.context?.find(line => line.startsWith('Digit cards:'));
  const cardMatch = /^Digit cards: ([0-9](?:, [0-9])*)\.$/.exec(cards ?? '');
  const task = /\b(smallest|greatest) (\d)-digit (odd|even)\b/.exec(q.prompt);
  if (!cardMatch || !task) throw new Error('Missing visible digit cards or arrangement rule');
  const closest = /closest to ([\d,]+)\?/.exec(q.prompt);
  return {
    digits: cardMatch[1]!.split(', ').map(Number),
    width: Number(task[2]),
    extreme: task[1]!,
    parity: task[3]!,
    target: closest ? Number(closest[1]!.replace(/,/g, '')) : null,
  };
}

// Independent oracle: insert each visible digit at every possible position.
// It does not reserve a last digit, sort a prefix, or access generator parameters.
function solveVisible(q: VisibleQuestion) {
  const givens = readVisible(q);
  let words = [''];
  for (const digit of givens.digits) {
    const next: string[] = [];
    for (const word of words) {
      for (let position = 0; position <= word.length; position++) {
        next.push(word.slice(0, position) + String(digit) + word.slice(position));
      }
    }
    words = next;
  }
  const values = words.filter(word => word.length === givens.width && word[0] !== '0').map(Number);
  const parityRemainder = givens.parity === 'odd' ? 1 : 0;
  const permitted = values.filter(value => value % 2 === parityRemainder);
  if (!permitted.length) throw new Error('No permitted arrangement');
  const best = givens.extreme === 'smallest' ? Math.min(...permitted) : Math.max(...permitted);
  const answers = [String(best)];
  let nearestCount = 0;
  if (givens.target !== null) {
    const target = givens.target;
    const distance = Math.min(...values.map(value => Math.abs(value - target)));
    const nearest = values.filter(value => Math.abs(value - target) === distance);
    nearestCount = nearest.length;
    answers.push(String(nearest[0]));
  }
  return {answers, nearestCount};
}

function fixture(extreme: string, parity: string): VisibleQuestion {
  return {
    context: ['Digit cards: 0, 2, 3, 7.'],
    prompt: `What is the ${extreme} 4-digit ${parity} number you can make?`,
  };
}

describe('extreme digit arrangements candidate', () => {
  it('checks the independent oracle against explicit zero and parity examples', () => {
    expect(solveVisible(fixture('smallest', 'odd')).answers).toEqual(['2037']);
    expect(solveVisible(fixture('greatest', 'odd')).answers).toEqual(['7203']);
    expect(solveVisible(fixture('smallest', 'even')).answers).toEqual(['2370']);
    expect(solveVisible(fixture('greatest', 'even')).answers).toEqual(['7320']);
    const linked: VisibleQuestion = {
      context: ['Digit cards: 2, 7, 5, 8.'],
      prompt: '(a) What is the greatest 4-digit odd number you can make? (b) Which 4-digit number is closest to 5,000? The number in (b) may be odd or even.',
    };
    expect(solveVisible(linked)).toEqual({answers: ['8725', '5278'], nearestCount: 1});
  });

  it('independently solves visible givens across seeds, indices, widths and all four rules', () => {
    const combinations = new Set<string>();
    const rulesWithZero = new Set<string>();
    const visibleQuestions = new Set<string>();
    let linkedCount = 0;
    let evenClosestCount = 0;
    let zeroEndingCount = 0;
    for (let seed = 0; seed < 160; seed++) {
      for (const index of [0, 1, 2]) {
        const q = makeRagQuestion(seed, index);
        const visible = {prompt: q.prompt, context: q.context};
        const givens = readVisible(visible);
        const solved = solveVisible(visible);
        const rule = `${givens.extreme}-${givens.parity}`;
        combinations.add(`${rule}-${givens.width}`);
        if (givens.digits.includes(0)) rulesWithZero.add(rule);
        visibleQuestions.add(JSON.stringify(visible));

        expect([4, 6, 7]).toContain(givens.width);
        expect(givens.digits).toHaveLength(givens.width);
        expect(new Set(givens.digits).size).toBe(givens.width);
        expect(givens.digits.every(d => Number.isInteger(d) && d >= 0 && d <= 9)).toBe(true);
        expect(givens.digits.filter(d => d % 2 === 0).length).toBeGreaterThanOrEqual(2);
        expect(givens.digits.filter(d => d % 2 === 1).length).toBeGreaterThanOrEqual(2);
        expect(q.context?.join(' ')).toContain('Use every digit exactly once in each answer');
        expect(q.context?.join(' ')).toContain('Do not begin a number with 0');
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation).toContain(q.workedSteps![0]!.text);

        const actual: string[] = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
        expect(actual).toEqual(solved.answers);
        for (const answer of actual) {
          expect(answer).toMatch(/^[1-9]\d*$/);
          expect(answer).toHaveLength(givens.width);
          expect(Number(answer)).toBeLessThan(10000000);
          expect(answer.split('').map(Number).sort((a, b) => a - b)).toEqual([...givens.digits].sort((a, b) => a - b));
        }
        if (actual[0]!.endsWith('0')) zeroEndingCount++;

        const needsPair = givens.width === 4 && rule === 'greatest-odd';
        expect(givens.target !== null).toBe(needsPair);
        if (needsPair) {
          linkedCount++;
          expect(q.structuredResponse?.kind).toBe('number-pair');
          expect(solved.nearestCount).toBe(1);
          expect(q.prompt).toContain('Using the same digits again');
          expect(q.prompt).toContain('The number in (b) may be odd or even');
          expect(givens.target! % 1000).toBe(0);
          expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(solved.answers))).toBe(true);
          if (Number(solved.answers[1]) % 2 === 0) evenClosestCount++;
        } else {
          expect(q.structuredResponse).toBeUndefined();
        }
      }
    }
    expect(combinations.size).toBe(12);
    expect(rulesWithZero.size).toBe(4);
    expect(visibleQuestions.size).toBeGreaterThan(100);
    expect(linkedCount).toBeGreaterThan(0);
    expect(evenClosestCount).toBeGreaterThan(0);
    expect(zeroEndingCount).toBeGreaterThan(0);
  });

  it('uses the existing pair response validator and rejects incomplete or incorrect pairs', () => {
    const q = makeRagQuestion(1);
    const expected = solveVisible({prompt: q.prompt, context: q.context}).answers;
    expect(q.structuredResponse?.kind).toBe('number-pair');
    const spec = q.structuredResponse!;
    expect(structuredResponseReady(spec, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseReady(spec, JSON.stringify([expected[0]]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(Number(expected[0]) + 1), expected[1]]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0], String(Number(expected[1]) + 1)]))).toBe(false);
  });

  it('is deterministic and independently solves signed and large seed cases', () => {
    for (const seed of [-2147483648, -1, 0, 17, 4294967295]) {
      for (const index of [0, 1, 5, 12]) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        const expected = solveVisible({prompt: q.prompt, context: q.context});
        expect(q.structuredResponse ? JSON.parse(q.answer) : [q.answer]).toEqual(expected.answers);
      }
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('extreme-digit-arrangements');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
