import { describe, expect, it } from 'vitest';
import { CURRICULUM_SKILLS } from '../../school/curriculum';
import { responseReady } from '../answerFormat';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragAggregateSuppliedExpressions';

type Variable = 'k' | 'd';
type Term = { expression: string; copies: number };
type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'prices' | 'distances' | 'week';
  expected: number[];
  minimumComponents: number[];
  unit: string;
  wholeWeekAtValue?: number;
};

function capture(text: string, pattern: RegExp): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing visible given matching ${pattern}`);
  return match;
}

function evaluate(expression: string, variable: Variable, value: number): number {
  const compact = expression.replace(/\s+/g, '').replace(/−/g, '-');
  const match = capture(compact, /^(\d*)([kd])(?:([+-])(\d+))?$/);
  if (match[2] !== variable) throw new Error('Inconsistent visible variable');
  const coefficient = match[1] === '' ? 1 : Number(match[1]);
  const magnitude = Number(match[4] ?? 0);
  const constant = match[3] === '-' ? -magnitude : magnitude;
  return coefficient * value + constant;
}

function totalAt(terms: Term[], variable: Variable, value: number): number {
  return terms.reduce(
    (total, term) => total + term.copies * evaluate(term.expression, variable, value),
    0,
  );
}

// Recover the linear expression from totals at two allowed consecutive values.
// This solver receives only visible context and prompt text.
function expressionFromTotals(
  terms: Term[],
  variable: Variable,
  minimum: number,
): [number, number] {
  const firstTotal = totalAt(terms, variable, minimum);
  const coefficient = totalAt(terms, variable, minimum + 1) - firstTotal;
  return [coefficient, firstTotal - coefficient * minimum];
}

function solveVisible(question: VisibleQuestion): Solution {
  const text = (question.context ?? []).join('\n');

  if (text.includes('A sketchbook costs')) {
    const sketchbook = capture(text, /A sketchbook costs \(([^)]+)\) dollars\./)[1];
    const notebook = capture(text, /A notebook costs ([kd]) dollars\./)[1];
    const quantities = capture(text, /Lena buys (\d+) sketchbooks and (\d+) notebooks\./);
    capture(text, /k is a positive whole number\./);
    const value = Number(capture(question.prompt, /k = (\d+)/)[1]);
    const terms = [
      { expression: sketchbook, copies: Number(quantities[1]) },
      { expression: notebook, copies: Number(quantities[2]) },
    ];
    return {
      kind: 'prices',
      expected: [...expressionFromTotals(terms, 'k', 1), totalAt(terms, 'k', value)],
      minimumComponents: terms.map(term => evaluate(term.expression, 'k', 1)),
      unit: 'dollars',
    };
  }

  if (text.includes('A cycle route')) {
    const matches = [...text.matchAll(/The (?:river|park|hill) section is \(([^)]+)\) km long\./g)];
    if (matches.length !== 3) throw new Error('Expected three visible route sections');
    const minimum = Number(capture(text, /k is a whole number and k is at least (\d+)\./)[1]);
    const terms = matches.map(match => ({ expression: match[1], copies: 1 }));
    return {
      kind: 'distances',
      expected: expressionFromTotals(terms, 'k', minimum),
      minimumComponents: terms.map(term => evaluate(term.expression, 'k', minimum)),
      unit: 'km',
    };
  }

  capture(text, /A school club folds paper cranes during one week\./);
  const weekday = capture(text, /From Monday to Friday, the club folds (\d+d) cranes each day\./)[1];
  const saturday = capture(text, /On Saturday, the club folds \(([^)]+)\) cranes\./)[1];
  const sunday = capture(text, /On Sunday, the club folds \(([^)]+)\) cranes\./)[1];
  const minimum = Number(capture(text, /d is a whole number and d is at least (\d+)\./)[1]);
  const value = Number(capture(question.prompt, /d = (\d+)/)[1]);
  capture(question.prompt, /Saturday and Sunday together/);
  const weekend = [
    { expression: saturday, copies: 1 },
    { expression: sunday, copies: 1 },
  ];
  const week = [{ expression: weekday, copies: 5 }, ...weekend];
  return {
    kind: 'week',
    expected: [...expressionFromTotals(week, 'd', minimum), totalAt(weekend, 'd', value)],
    minimumComponents: week.map(term => evaluate(term.expression, 'd', minimum)),
    unit: 'cranes',
    wholeWeekAtValue: totalAt(week, 'd', value),
  };
}

function visiblePart(question: Question): VisibleQuestion {
  return { context: question.context, prompt: question.prompt };
}

const seeds = [
  0, 1, -1, 7, 2026, 4294967295,
  ...Array.from({ length: 50 }, (_, index) => index * 97 + 13),
];

describe('aggregate supplied expressions candidate', () => {
  it('declares one P6 family with existing curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-aggregate-supplied-expressions');
    const knownSkills = new Set(CURRICULUM_SKILLS.map(skill => skill.id));
    for (const skill of RAG_PATTERN.skillIds) {
      expect(knownSkills.has(skill)).toBe(true);
    }
  });

  it('independently solves visible givens across seeds and every variant', () => {
    const signatures = new Set<string>();
    for (const seed of seeds) {
      const kinds = new Set<string>();
      for (let index = 0; index < 6; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible(visiblePart(question));
        const response = question.structuredResponse;
        if (!response || response.kind !== 'number-fields') {
          throw new Error('Expected the existing number-fields control');
        }
        kinds.add(solution.kind);
        signatures.add(JSON.stringify(visiblePart(question)));
        expect(JSON.parse(question.answer)).toEqual(solution.expected.map(String));
        expect(response.fields).toHaveLength(solution.expected.length);
        expect(question.prompt).toContain(solution.unit);
        expect(question.picture).toBeUndefined();
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(40);
        for (const component of solution.minimumComponents) {
          expect(Number.isInteger(component)).toBe(true);
          expect(component).toBeGreaterThan(0);
        }
        for (const result of solution.expected) {
          expect(Number.isSafeInteger(result)).toBe(true);
          expect(result).toBeGreaterThan(0);
          expect(result).toBeLessThan(1000);
        }
        if (solution.kind === 'week') {
          expect(solution.wholeWeekAtValue).toBeGreaterThan(solution.expected[2]);
        }
      }
      expect([...kinds].sort()).toEqual(['distances', 'prices', 'week']);
    }
    expect(signatures.size).toBeGreaterThan(40);
  });

  it('repeats exactly for a seed and index and gives distinct question keys', () => {
    for (const seed of seeds.slice(0, 12)) {
      const keys = new Set<string>();
      for (let index = 0; index < 6; index += 1) {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        keys.add(question.key);
      }
      expect(keys.size).toBe(6);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  it('grades every field through the existing response entry points', () => {
    for (const seed of seeds.slice(0, 20)) {
      for (let index = 0; index < 3; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible(visiblePart(question));
        const expected = solution.expected.map(String);
        const submitted = JSON.stringify(expected);
        expect(responseReady(question, submitted)).toBe(true);
        expect(correctAnswer(question, submitted)).toBe(true);
        expect(correctAnswer(question, JSON.stringify(expected.map(value => ` ${value} `)))).toBe(true);

        for (let field = 0; field < expected.length; field += 1) {
          const incorrect = [...expected];
          incorrect[field] = String(Number(incorrect[field]) + 1);
          expect(correctAnswer(question, JSON.stringify(incorrect))).toBe(false);
        }

        const incomplete = JSON.stringify(expected.slice(0, -1));
        expect(responseReady(question, incomplete)).toBe(false);
        expect(correctAnswer(question, incomplete)).toBe(false);
        expect(responseReady(question, 'invalid')).toBe(false);
        expect(correctAnswer(question, 'invalid')).toBe(false);

        if (solution.kind === 'week') {
          const wholeWeekMistake = [...expected];
          wholeWeekMistake[2] = String(solution.wholeWeekAtValue);
          expect(correctAnswer(question, JSON.stringify(wholeWeekMistake))).toBe(false);
        }
      }
    }
  });
});
