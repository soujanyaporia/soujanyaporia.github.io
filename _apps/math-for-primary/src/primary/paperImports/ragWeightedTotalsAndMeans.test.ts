import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragWeightedTotalsAndMeans';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'unit'>;
type Kind = 'group-mean' | 'frequency-mean' | 'group-total';
type Solution = {
  kind: Kind;
  expected: number;
  total: number;
  observations: number[];
  categorySizes: number[];
  categoryValues: number[];
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture, unit: q.unit};
}

// This solver receives only displayed givens: no answer, proof, seed or generation parameters.
function solveVisible(q: Visible): Solution {
  if (q.unit === 'h') {
    const picture = q.picture;
    if (!picture || picture.type !== 'paper' || picture.layout !== 'cards') {
      throw new Error('Missing visible daily data');
    }
    const hoursByDay = new Map<string, number>();
    const categorySizes: number[] = [];
    const categoryValues: number[] = [];
    for (const card of picture.cards) {
      const value = /^(\d+(?:\.\d+)?) h per day$/.exec(card.value);
      if (!value) throw new Error('Unreadable daily hours');
      let days: string[];
      if (card.label.includes(' to ')) {
        const [start, end] = card.label.split(' to ');
        const first = DAYS.indexOf(start);
        const last = DAYS.indexOf(end);
        if (first < 0 || last < first) throw new Error('Invalid day range');
        days = DAYS.slice(first, last + 1);
      } else {
        days = card.label.split(' and ');
      }
      const hours = Number(value[1]);
      for (const day of days) {
        if (!DAYS.includes(day) || hoursByDay.has(day)) throw new Error('Invalid or repeated day');
        hoursByDay.set(day, hours);
      }
      categorySizes.push(days.length);
      categoryValues.push(hours);
    }
    if (hoursByDay.size !== DAYS.length) throw new Error('Incomplete week');
    const observations = DAYS.map(day => hoursByDay.get(day)!);
    const total = observations.reduce((sum, hours) => sum + hours, 0);
    return {
      kind: 'frequency-mean', expected: total / observations.length,
      total, observations, categorySizes, categoryValues,
    };
  }

  if (q.unit !== 'km' && q.unit !== 'paper stars') throw new Error('Unexpected visible unit');
  const isMean = q.unit === 'km';
  if (isMean && !q.prompt.includes('average distance')) throw new Error('Missing mean request');
  if (!isMean && !q.prompt.includes('altogether')) throw new Error('Missing total request');
  const pattern = isMean
    ? /^Team ([AB]) has (\d+) children\. Their average walking distance was (\d+) km per child\.$/
    : /^Group ([AB]) has (\d+) pupils\. They folded an average of (\d+) paper stars per pupil\.$/;
  const groups = (q.context ?? []).flatMap(line => {
    const match = pattern.exec(line);
    return match ? [{label: match[1], count: Number(match[2]), average: Number(match[3])}] : [];
  });
  if (groups.length !== 2 || new Set(groups.map(group => group.label)).size !== 2) {
    throw new Error('Expected two distinct visible groups');
  }
  if (groups.some(group => !Number.isSafeInteger(group.count) || group.count <= 0)) {
    throw new Error('Invalid group size');
  }
  // Repeated averages preserve each group total without assuming equal actual individual results.
  const observations = groups.flatMap(group => Array<number>(group.count).fill(group.average));
  const total = observations.reduce((sum, value) => sum + value, 0);
  return {
    kind: isMean ? 'group-mean' : 'group-total',
    expected: isMean ? total / observations.length : total,
    total, observations,
    categorySizes: groups.map(group => group.count),
    categoryValues: groups.map(group => group.average),
  };
}

function checkEquation(equation: string): void {
  const sides = equation.split(' = ');
  if (sides.length !== 2) throw new Error('Expected an equality');
  const right = /^(\d+(?:\.\d+)?) (km|children|h|days|paper stars)$/.exec(sides[1]);
  if (!right) throw new Error('Missing result or unit');
  const result = sides[0].split(' + ').reduce((sum, term) => {
    const match = /^(\d+(?:\.\d+)?)(?: ([×÷]) (\d+(?:\.\d+)?))?$/.exec(term);
    if (!match) throw new Error('Unsupported working expression');
    const first = Number(match[1]);
    const second = Number(match[3]);
    if (match[2] === '÷' && second === 0) throw new Error('Division by zero');
    const value = match[2] === '×' ? first * second : match[2] === '÷' ? first / second : first;
    return sum + value;
  }, 0);
  expect(Number(right[1])).toBeCloseTo(result, 10);
}

describe('weighted totals and means', () => {
  test('the visible-givens solver agrees with independently calculated examples', () => {
    const groupMean = solveVisible({
      prompt: 'Find the average distance for both teams.', unit: 'km',
      context: [
        'Team A has 3 children. Their average walking distance was 10 km per child.',
        'Team B has 5 children. Their average walking distance was 16 km per child.',
      ],
    });
    expect(groupMean.expected).toBe(13.75);
    const groupTotal = solveVisible({
      prompt: 'How many paper stars were folded altogether?', unit: 'paper stars',
      context: [
        'Group A has 4 pupils. They folded an average of 7 paper stars per pupil.',
        'Group B has 6 pupils. They folded an average of 9 paper stars per pupil.',
      ],
    });
    expect(groupTotal.expected).toBe(82);
    const week = solveVisible({
      prompt: 'Find the average working time for the whole week.', unit: 'h',
      picture: {type: 'paper', layout: 'cards', cards: [
        {label: 'Monday to Thursday', value: '3 h per day'},
        {label: 'Friday and Saturday', value: '8 h per day'},
        {label: 'Sunday', value: '0 h per day'},
      ]},
    });
    expect(week.total).toBe(28);
    expect(week.expected).toBe(4);
  });

  test('solves generated visible givens across varied seeds and checks bounds and working', () => {
    const seeds = [-2147483648, -97, -1, 0, 1, 2, 7, 31, 99, 255, 1024, 2147483647];
    const signatures = new Map<Kind, Set<string>>();
    let sawWholeMean = false;
    let sawDecimalMean = false;
    for (const seed of seeds) {
      for (let index = 0; index < 18; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        const seen = signatures.get(solved.kind) ?? new Set<string>();
        seen.add(JSON.stringify(visible(q)));
        signatures.set(solved.kind, seen);
        expect(Number.isFinite(Number(q.answer))).toBe(true);
        expect(Number(q.answer)).toBeCloseTo(solved.expected, 10);
        expect(q.answer).toMatch(/^\d+(?:\.\d{1,2})?$/);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        for (const step of q.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          if (!step.equation) throw new Error('Missing worked calculation');
          checkEquation(step.equation);
          expect(q.explanation).toContain(step.equation);
        }
        const steps = q.workedSteps!;
        expect(steps[steps.length - 1].equation).toContain(`= ${solved.expected} ${q.unit}`);

        if (solved.kind === 'frequency-mean') {
          expect(solved.observations).toHaveLength(7);
          expect(solved.observations[6]).toBe(0);
          expect(Math.min(...solved.observations)).toBeGreaterThanOrEqual(0);
          expect(Math.max(...solved.observations)).toBeLessThanOrEqual(12);
          expect(q.prompt).toContain('including Sunday');
          expect(solved.expected).not.toBeCloseTo(solved.total / 6, 10);
          const unweighted = solved.categoryValues.reduce((sum, value) => sum + value, 0) / solved.categoryValues.length;
          expect(solved.expected).not.toBeCloseTo(unweighted, 10);
          expect(solved.categoryValues).not.toEqual([8, 5, 0]);
        } else {
          expect(solved.categorySizes[0]).not.toBe(solved.categorySizes[1]);
          expect(solved.categoryValues[0]).not.toBe(solved.categoryValues[1]);
          expect(Math.min(...solved.categorySizes)).toBeGreaterThanOrEqual(2);
          expect(solved.observations.length).toBeLessThanOrEqual(20);
          expect(Math.min(...solved.categoryValues)).toBeGreaterThanOrEqual(6);
          expect(Math.max(...solved.categoryValues)).toBeLessThanOrEqual(26);
          if (solved.kind === 'group-mean') {
            expect(solved.expected).toBeGreaterThan(Math.min(...solved.categoryValues));
            expect(solved.expected).toBeLessThan(Math.max(...solved.categoryValues));
            expect(solved.expected).not.toBeCloseTo((solved.categoryValues[0] + solved.categoryValues[1]) / 2, 10);
            sawWholeMean ||= Number.isInteger(solved.expected);
            sawDecimalMean ||= !Number.isInteger(solved.expected);
          } else {
            expect(q.answer).toMatch(/^\d+$/);
            expect(Number.isSafeInteger(solved.expected)).toBe(true);
            expect(solved.expected).toBeGreaterThan(solved.categoryValues[0] + solved.categoryValues[1]);
          }
        }
      }
    }
    expect([...signatures.keys()].sort()).toEqual(['frequency-mean', 'group-mean', 'group-total']);
    for (const seen of signatures.values()) expect(seen.size).toBeGreaterThan(3);
    expect(sawWholeMean).toBe(true);
    expect(sawDecimalMean).toBe(true);
  });

  test('is deterministic and presents all three variants across consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-weighted-totals-and-means');
    expect([...RAG_PATTERN.skillIds]).toEqual(['P6.S.AVG.01', 'P6.S.AVG.02']);
    for (const seed of [-4, 0, 17]) {
      const questions = Array.from({length: 9}, (_, index) => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.key)).size).toBe(9);
      expect(new Set(questions.slice(0, 3).map(q => solveVisible(visible(q)).kind)).size).toBe(3);
      makeRagQuestion(seed, 100);
      questions.forEach((q, index) => expect(makeRagQuestion(seed, index)).toEqual(q));
    }
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  });
});
