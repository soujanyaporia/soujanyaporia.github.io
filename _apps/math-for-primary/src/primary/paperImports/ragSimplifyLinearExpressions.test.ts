import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {answerInputMode, responseReady} from '../answerFormat';
import {makeRagQuestion, RAG_PATTERN} from './ragSimplifyLinearExpressions';

// This evaluator reads only displayed expressions. It does not import generation
// helpers, inspect random parameters, or use the stored answer to solve a task.
function evaluateVisible(expression: string, letter: string, value: number): number {
  const compact = expression
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/\s+/g, '')
    .replace(/(\d)([a-z])/g, '$1*$2');
  const tokens = compact.match(/\d+|[a-z]|[+*\-]/g) ?? [];
  if (tokens.join('') !== compact || tokens.length === 0) {
    throw new Error(`Unsupported visible expression: ${expression}`);
  }
  let position = 0;
  function atom(): number {
    const token = tokens[position++];
    if (token === '+') return atom();
    if (token === '-') return -atom();
    if (token === letter) return value;
    if (token !== undefined && /^\d+$/.test(token)) return Number(token);
    throw new Error(`Unexpected token: ${String(token)}`);
  }
  function product(): number {
    let result = atom();
    while (tokens[position] === '*') {
      position++;
      result *= atom();
    }
    return result;
  }
  let result = product();
  while (position < tokens.length) {
    const operation = tokens[position++];
    if (operation !== '+' && operation !== '-') throw new Error('Expected addition or subtraction.');
    const next = product();
    result = operation === '+' ? result + next : result - next;
  }
  return result;
}

function solveVisible(question: Pick<Question, 'display'>) {
  if (!question.display) throw new Error('Missing visible expression.');
  const letters = [...new Set(question.display.match(/[a-z]/g) ?? [])];
  if (letters.length !== 1) throw new Error('Expected exactly one letter.');
  const letter = letters[0];
  // For a linear expression, its value at zero is its constant; the change
  // from zero to one is its coefficient. Further values check linearity.
  const constant = evaluateVisible(question.display, letter, 0);
  const coefficient = evaluateVisible(question.display, letter, 1) - constant;
  for (const value of [2, 5, 11]) {
    expect(evaluateVisible(question.display, letter, value)).toBe(coefficient * value + constant);
  }
  expect(Number.isSafeInteger(coefficient)).toBe(true);
  expect(Number.isSafeInteger(constant)).toBe(true);
  expect(coefficient).toBeGreaterThan(0);
  expect(constant).toBeGreaterThanOrEqual(0);
  const answer = `${coefficient === 1 ? '' : coefficient}${letter}${constant === 0 ? '' : `+${constant}`}`;
  return {letter, coefficient, constant, answer};
}

function checkWorkedEquations(question: Question, letter: string): void {
  expect(question.workedSteps?.length).toBeGreaterThanOrEqual(2);
  for (const step of question.workedSteps ?? []) {
    expect(step.text.length).toBeGreaterThan(0);
    if (!step.equation) throw new Error('Expected a worked equation.');
    const sides = step.equation.split('=');
    expect(sides).toHaveLength(2);
    for (const value of [0, 2, 9]) {
      expect(evaluateVisible(sides[0], letter, value)).toBe(evaluateVisible(sides[1], letter, value));
    }
  }
}

describe('simplify linear expressions candidate', () => {
  it('checks the independent solver against hand-calculated examples', () => {
    const examples = [
      {display: '44 − n + 5n − 16 + 7n', answer: '11n+28'},
      {display: '3p + 6 × 4 − 2p − 13', answer: 'p+11'},
      {display: '6t + 4t − 9t', answer: 't'},
    ];
    for (const example of examples) {
      expect(solveVisible({display: example.display}).answer).toBe(example.answer);
    }
    expect(() => evaluateVisible('3n / 2', 'n', 4)).toThrow();
  });

  it('solves visible givens and checks worked equations across 600 seed/index pairs', () => {
    const forms = new Set<string>();
    const displays = new Set<string>();
    let unitCoefficientCount = 0;
    for (let seed = -75; seed < 75; seed++) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(question);
        expect(question.answer).toBe(solved.answer);
        expect(correctAnswer(question, solved.answer)).toBe(true);
        const wrong = `${solved.coefficient + 1}${solved.letter}${solved.constant === 0 ? '' : `+${solved.constant}`}`;
        expect(correctAnswer(question, wrong)).toBe(false);
        expect(responseReady(question, solved.answer)).toBe(true);
        expect(answerInputMode(question)).toBe('text');
        expect(question.prompt).toContain('letter term first');
        expect(question.prompt).toContain('Leave out spaces');
        expect(question.answer).not.toMatch(/\s/);
        expect(question.display).not.toMatch(/[()\[\]²³/=]/);
        expect(question.picture).toBeUndefined();
        expect(question.unit).toBeUndefined();
        expect(question.choices).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(solved.coefficient).toBeLessThanOrEqual(24);
        expect(solved.constant).toBeLessThanOrEqual(115);
        checkWorkedEquations(question, solved.letter);
        expect(question.explanation).toContain(question.workedSteps![0].equation!);
        displays.add(question.display!);
        forms.add(question.display!.includes('×') ? 'numerical-product' : solved.constant === 0 ? 'letters-only' : 'letters-and-constants');
        if (solved.coefficient === 1) unitCoefficientCount++;
      }
    }
    expect([...forms].sort()).toEqual(['letters-and-constants', 'letters-only', 'numerical-product']);
    expect(displays.size).toBeGreaterThan(100);
    expect(unitCoefficientCount).toBeGreaterThan(0);
  });

  it('is deterministic and uses the default index consistently', () => {
    for (const seed of [-100000, -1, 0, 17, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 2, 9]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.key)).size).toBe(3);
      expect(new Set(questions.map(q => q.display)).size).toBe(3);
    }
  });

  it('declares the supported curriculum skill and validates input bounds', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('simplify-linear-expressions');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.ALG.03']);
    expect(() => makeRagQuestion(Number.NaN)).toThrow(RangeError);
    expect(() => makeRagQuestion(1.5)).toThrow(RangeError);
    expect(() => makeRagQuestion(1, -1)).toThrow(RangeError);
  });
});
