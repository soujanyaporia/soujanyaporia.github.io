import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragInverseRoundingIntervals';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'choices'>;
interface RoundingRule {
  unit: number;
  rounded: number;
}

function readVisibleRules(question: VisibleQuestion): RoundingRule[] {
  const text = (question.context ?? []).join(' ').replaceAll(',', '');
  const pattern = /Rounded to the nearest (\d+)(?: dollars)? the (?:amount|total|number) is \$?(\d+)\./g;
  const rules = Array.from(text.matchAll(pattern), match => ({
    unit: Number(match[1]),
    rounded: Number(match[2]),
  }));
  if (rules.length === 0) {
    throw new Error('The visible question must state its rounding clues.');
  }
  return rules;
}

function readVisibleNumber(text: string): number {
  const digits = text.replace(/[$,]/g, '');
  if (!/^\d+$/.test(digits)) {
    throw new Error(`Expected a visible whole-number value, received ${text}`);
  }
  return Number(digits);
}

// Forward rounding uses integer remainders, independently of the generator's endpoints.
function roundForCheck(value: number, unit: number): number {
  const remainder = value % unit;
  const lowerMultiple = value - remainder;
  return remainder * 2 >= unit ? lowerMultiple + unit : lowerMultiple;
}

function satisfiesRules(value: number, rules: RoundingRule[]): boolean {
  return rules.every(rule => roundForCheck(value, rule.unit) === rule.rounded);
}

function enumerateAllowed(rules: RoundingRule[]): number[] {
  const first = rules[0];
  const allowed: number[] = [];
  // Searching a full rounding unit on either side contains every possible original.
  for (
    let value = Math.max(0, first.rounded - first.unit);
    value <= first.rounded + first.unit;
    value += 1
  ) {
    if (satisfiesRules(value, rules)) allowed.push(value);
  }
  return allowed;
}

function independentlySolve(question: VisibleQuestion): string {
  const rules = readVisibleRules(question);
  if (question.choices) {
    const possible = question.choices.filter(choice =>
      satisfiesRules(readVisibleNumber(choice), rules),
    );
    if (possible.length !== 1) {
      throw new Error('A choice question must have exactly one possible original.');
    }
    return possible[0];
  }

  const allowed = enumerateAllowed(rules);
  if (allowed.length === 0) throw new Error('The rounding clues have no shared solution.');
  if (/\bsmallest\b/.test(question.prompt)) return String(allowed[0]);
  if (/\bgreatest\b/.test(question.prompt) && rules.length === 2) {
    return String(allowed[allowed.length - 1]);
  }
  throw new Error('Expected a minimum or a maximum satisfying two rounding clues.');
}

const seeds = [
  ...Array.from({ length: 48 }, (_, index) => index),
  -17,
  104729,
  2147483647,
  4294967295,
];

describe('inverse rounding intervals candidate', () => {
  it('independently solves visible givens and checks interval boundaries across seeds and indices', () => {
    const seenForms = new Set<string>();
    const seenUnits = new Set<number>();
    const seenChoiceLocations = new Set<string>();
    const visibleQuestions = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const question = makeRagQuestion(seed, index);
        // The solver receives only fields visible before answering.
        const visible: VisibleQuestion = {
          prompt: question.prompt,
          context: question.context,
          choices: question.choices,
        };
        const rules = readVisibleRules(visible);
        const expected = independentlySolve(visible);
        const allowed = enumerateAllowed(rules);
        const lower = allowed[0];
        const upper = allowed[allowed.length - 1];

        expect(question.answer).toBe(expected);
        expect(allowed.length).toBeGreaterThan(0);
        expect(lower).toBeGreaterThanOrEqual(0);
        expect(upper).toBeLessThanOrEqual(10000000);
        expect(satisfiesRules(lower - 1, rules)).toBe(false);
        expect(satisfiesRules(upper + 1, rules)).toBe(false);
        expect(question.context).toContain('Round halfway values up.');
        expect(question.hint.trim().length).toBeGreaterThan(0);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
        expect(question.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(3);
        expect(question.workedSteps?.every(step => step.text.trim().length > 0)).toBe(true);
        expect(question.picture).toBeUndefined();
        visibleQuestions.add(JSON.stringify(visible));

        for (const rule of rules) {
          seenUnits.add(rule.unit);
          expect(Number.isSafeInteger(rule.rounded)).toBe(true);
          expect(rule.rounded % rule.unit).toBe(0);
          expect(roundForCheck(rule.rounded - rule.unit / 2, rule.unit)).toBe(rule.rounded);
          expect(roundForCheck(rule.rounded + rule.unit / 2, rule.unit)).toBe(rule.rounded + rule.unit);
        }

        if (question.choices) {
          expect(rules).toHaveLength(1);
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          const values = question.choices.map(readVisibleNumber);
          expect(values).toContain(lower - 1);
          expect(values).toContain(upper + 1);
          expect(values.every(value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000)).toBe(true);

          const chosenValue = readVisibleNumber(expected);
          if (chosenValue === lower) seenChoiceLocations.add('lower');
          else if (chosenValue === upper) seenChoiceLocations.add('upper');
          else seenChoiceLocations.add('interior');

          if (question.choices[0].startsWith('$')) {
            seenForms.add('money-choice');
            expect(question.choices.every(choice => choice.startsWith('$'))).toBe(true);
            expect(question.context?.join(' ')).toContain('whole number of dollars');
          } else {
            seenForms.add('count-choice');
            expect(question.context?.join(' ')).toContain('visitors');
          }
        } else if (rules.length === 2) {
          seenForms.add('two-rounding-maximum');
          expect(question.prompt).toMatch(/greatest/);
          expect(rules.map(rule => rule.unit)).toEqual([100, 1000]);
          expect(rules[0].rounded).toBe(rules[1].rounded);
          expect(readVisibleNumber(expected)).toBe(upper);
        } else {
          seenForms.add('minimum');
          expect(rules).toHaveLength(1);
          expect(question.prompt).toMatch(/smallest/);
          expect(readVisibleNumber(expected)).toBe(lower);
        }
      }
    }

    expect([...seenForms].sort()).toEqual([
      'count-choice',
      'minimum',
      'money-choice',
      'two-rounding-maximum',
    ]);
    expect([...seenUnits].sort((a, b) => a - b)).toEqual([100, 1000, 10000]);
    expect([...seenChoiceLocations].sort()).toEqual(['interior', 'lower', 'upper']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is deterministic and supports the default question index', () => {
    for (const seed of seeds) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 7, 19]) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        expect(first.key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
        expect(makeRagQuestion(seed, index + 1).key).not.toBe(first.key);
      }
    }
  });

  it('declares the requested family and supplied curriculum skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('inverse-rounding-intervals');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.WN.02', 'P5.S.WN.01']);
  });
});
