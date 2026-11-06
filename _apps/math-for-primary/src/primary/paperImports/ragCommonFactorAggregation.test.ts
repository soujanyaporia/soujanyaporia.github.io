import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragCommonFactorAggregation';

function solveVisible(question: Question) {
  const match = /^The numbers are (\d+) and (\d+)\.$/.exec(question.context?.[0] ?? '');
  if (!match) throw new Error('The two visible whole-number givens are missing.');
  const first = Number(match[1]);
  const second = Number(match[2]);

  // Independent method using the GCD and its factor pairs.
  let divisor = first;
  let remainder = second;
  while (remainder !== 0) {
    const next = divisor % remainder;
    divisor = remainder;
    remainder = next;
  }
  const shared = new Set<number>();
  for (let candidate = 1; candidate * candidate <= divisor; candidate++) {
    if (divisor % candidate === 0) {
      shared.add(candidate);
      shared.add(divisor / candidate);
    }
  }
  const common = [...shared].sort((left, right) => left - right);

  if (question.prompt.startsWith('Write every common factor')) {
    return {first, second, common, mode: 'list', answer: JSON.stringify(common.map(String))};
  }
  if (question.prompt.startsWith('Count the factors')) {
    return {first, second, common, mode: 'count', answer: String(common.length)};
  }
  if (question.prompt.startsWith('Add all the factors')) {
    return {
      first, second, common, mode: 'sum',
      answer: String(common.reduce((total, factor) => total + factor, 0)),
    };
  }
  throw new Error('The visible prompt does not identify an aggregation task.');
}

const samples = Array.from({length: 120}, (_, offset) => {
  const seed = offset - 40;
  return Array.from({length: 8}, (_, index) => ({
    seed,
    index,
    question: makeRagQuestion(seed, index),
  }));
}).flat();

function factorListByQuotients(number: number): number[] {
  return Array.from({length: number}, (_, position) => position + 1)
    .filter(candidate => Number.isInteger(number / candidate));
}

describe('common-factor aggregation candidate', () => {
  test('solves every response from visible givens across varied seeds and indices', () => {
    const modes = new Set<string>();
    const pairKeys = new Set<string>();
    const commonCounts = new Set<number>();
    for (const {question} of samples) {
      const solved = solveVisible(question);
      expect(question.answer).toBe(solved.answer);
      modes.add(solved.mode);
      pairKeys.add(`${solved.first},${solved.second}`);
      commonCounts.add(solved.common.length);
      expect(Number.isInteger(solved.first)).toBe(true);
      expect(Number.isInteger(solved.second)).toBe(true);
      expect(solved.first).toBeGreaterThan(1);
      expect(solved.second).toBeGreaterThan(solved.first);
      expect(solved.second).toBeLessThanOrEqual(100);
      expect(solved.second % solved.first).not.toBe(0);
      expect(solved.common[0]).toBe(1);
      expect(solved.common.length).toBeGreaterThanOrEqual(2);
      expect(solved.common.length).toBeLessThanOrEqual(6);
      for (const sourceValue of [16, 36, 40, 48, 60]) {
        expect(solved.first).not.toBe(sourceValue);
        expect(solved.second).not.toBe(sourceValue);
      }
      expect(question.unit).toBeUndefined();
      expect(question.picture).toBeUndefined();
    }
    expect([...modes].sort()).toEqual(['count', 'list', 'sum']);
    expect(pairKeys.size).toBeGreaterThan(20);
    expect([...commonCounts].sort((left, right) => left - right)).toEqual([2, 3, 4, 5, 6]);
  });

  test('offers four distinct numeric choices with exactly one independently correct answer', () => {
    let checked = 0;
    for (const {question} of samples) {
      const solved = solveVisible(question);
      if (solved.mode === 'list') continue;
      checked++;
      const choices = question.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices.every(choice => /^[1-9]\d*$/.test(choice))).toBe(true);
      expect(choices.filter(choice => Number(choice) === Number(solved.answer))).toHaveLength(1);
      expect(question.structuredResponse).toBeUndefined();
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('uses the existing numeric-field grader for complete ascending factor lists', () => {
    let checked = 0;
    for (const {question} of samples) {
      const solved = solveVisible(question);
      if (solved.mode !== 'list') continue;
      checked++;
      const spec = question.structuredResponse;
      if (!spec || spec.kind !== 'number-fields') {
        throw new Error('List mode requires the supported numeric-field response.');
      }
      expect(question.prompt).toContain('starting with the smallest');
      expect(spec.fields).toHaveLength(solved.common.length);
      expect(question.choices).toBeUndefined();
      expect(structuredResponseReady(spec, solved.answer)).toBe(true);
      expect(structuredResponseCorrect(spec, question.answer, solved.answer)).toBe(true);
      const spaced = JSON.stringify(solved.common.map(value => ` ${value} `));
      expect(structuredResponseCorrect(spec, question.answer, spaced)).toBe(true);
      const reversed = JSON.stringify([...solved.common].reverse().map(String));
      const incomplete = JSON.stringify(solved.common.slice(1).map(String));
      const duplicated = solved.common.map(String);
      duplicated[1] = duplicated[0];
      const wrong = solved.common.map(String);
      wrong[0] = '0';
      const malformed = solved.common.map(String);
      malformed[0] = 'one';
      for (const input of [reversed, incomplete, JSON.stringify(duplicated), JSON.stringify(wrong), JSON.stringify(malformed)]) {
        expect(structuredResponseCorrect(spec, question.answer, input)).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('shows complete factor lists and the requested final operation in worked steps', () => {
    for (const {question} of samples) {
      const solved = solveVisible(question);
      const steps = question.workedSteps ?? [];
      expect(steps).toHaveLength(solved.mode === 'list' ? 3 : 4);
      expect(steps[0].text).toContain(String(solved.first));
      expect(steps[1].text).toContain(String(solved.second));
      expect(steps[0].equation).toBe(factorListByQuotients(solved.first).join(', '));
      expect(steps[1].equation).toBe(factorListByQuotients(solved.second).join(', '));
      expect(steps[2].equation).toBe(solved.common.join(', '));
      if (solved.mode === 'count') {
        expect(steps[3].equation).toBe(`${solved.common.map(() => '1').join(' + ')} = ${solved.answer}`);
      }
      if (solved.mode === 'sum') {
        expect(steps[3].equation).toBe(`${solved.common.join(' + ')} = ${solved.answer}`);
      }
      expect(question.hint.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(question.explanation).toContain(step.text);
        expect(question.explanation).toContain(step.equation ?? '');
        expect(step.picture).toBeUndefined();
      }
    }
  });

  test('is deterministic and declares the requested level, family and curriculum skill', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-common-factor-aggregation');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.FACT.02']);
    for (const {seed, index, question} of samples) {
      expect(makeRagQuestion(seed, index)).toEqual(question);
    }
    expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
    const session = Array.from({length: 24}, (_, index) => makeRagQuestion(23, index));
    expect(new Set(session.map(question => question.key)).size).toBe(24);
    expect(new Set(session.map(question => JSON.stringify([question.prompt, question.context]))).size)
      .toBeGreaterThan(1);
  });
});
