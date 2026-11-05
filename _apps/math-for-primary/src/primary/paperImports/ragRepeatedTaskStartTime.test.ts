import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion} from './ragRepeatedTaskStartTime';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;

function visibleGivens(q: VisibleQuestion) {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  function read(pattern: RegExp): number {
    const match = pattern.exec(text);
    if (!match) throw new Error(`Missing visible given: ${pattern}`);
    return Number(match[1]);
  }
  if (!text.includes('one after another, with no breaks')) {
    throw new Error('Consecutive work must be explicit.');
  }
  return {
    count: read(/decorates (\d+) cards/),
    each: read(/Each card takes (\d+) minutes/),
    afterNoon: read(/finishes the last card (\d+) minutes after noon/),
  };
}

// Solve solely from the displayed story. Walk a clock backwards one minute
// at a time for each card, independently of the generator's total subtraction.
function solveVisible(q: VisibleQuestion) {
  const givens = visibleGivens(q);
  let hour = 12;
  let minute = givens.afterNoon;
  for (let card = 0; card < givens.count; card++) {
    for (let tick = 0; tick < givens.each; tick++) {
      if (minute === 0) {
        hour--;
        minute = 59;
      } else {
        minute--;
      }
    }
  }
  const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
  return {...givens, hour, minute, time};
}

describe('repeated task start time', () => {
  it('independently solves varied seeds and indices using only visible givens', () => {
    const seeds = [
      -2147483648, -1, 0, 1, 2147483647, 4294967295,
      ...Array.from({length: 192}, (_, i) => i * 97 + 13),
    ];
    const combinations = new Set<string>();
    const starts = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        expect(q.answer).toBe(solved.time);
        expect(correctAnswer(q, solved.time)).toBe(true);
        expect(correctAnswer(q, `  ${solved.time.toUpperCase()}  `)).toBe(true);
        expect(correctAnswer(q, solved.time.replace('am', 'pm'))).toBe(false);
        expect([4, 5]).toContain(solved.count);
        expect([15, 20, 25]).toContain(solved.each);
        expect([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]).toContain(solved.afterNoon);
        const total = solved.count * solved.each;
        expect(total).toBeGreaterThanOrEqual(60);
        expect(total).toBeLessThanOrEqual(125);
        expect(total).toBeGreaterThan(solved.afterNoon);
        expect(solved.hour * 60 + solved.minute).toBeGreaterThanOrEqual(600);
        expect(solved.hour * 60 + solved.minute).toBeLessThanOrEqual(715);
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.prompt).toContain('first card');
        combinations.add(`${solved.count}:${solved.each}:${solved.afterNoon}`);
        starts.add(solved.time);
      }
    }
    expect(combinations.size).toBeGreaterThanOrEqual(40);
    expect(starts.has('10:00 am')).toBe(true);
    expect(starts.has('11:55 am')).toBe(true);
  });

  it('provides consistent worked arithmetic and deterministic questions', () => {
    for (const seed of [9, 77, 1234, 98127]) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(makeRagQuestion(seed, index + 1).key).not.toBe(q.key);
        const equations = (q.workedSteps ?? []).map(step => step.equation ?? '');
        const addition = equations.find(equation => /^\d+(?: \+ \d+)+ = \d+ minutes$/.test(equation));
        if (!addition) throw new Error('Missing repeated-duration addition step.');
        const match = /^([\d +]+) = (\d+) minutes$/.exec(addition)!;
        const terms = match[1].split('+').map(term => Number(term.trim()));
        expect(terms).toHaveLength(solved.count);
        expect(terms.every(term => term === solved.each)).toBe(true);
        expect(Number(match[2])).toBe(terms.reduce((sum, term) => sum + term, 0));
        const total = terms.reduce((sum, term) => sum + term, 0);
        expect(equations.some(equation => equation.startsWith(`${total} − ${solved.afterNoon} = ${total - solved.afterNoon} minutes`))).toBe(true);
        expect(equations.at(-1)).toContain(`= ${solved.time}`);
        expect(q.explanation).toContain(solved.time);
        expect(q.hint.length).toBeGreaterThan(0);
      }
    }
  });
});
