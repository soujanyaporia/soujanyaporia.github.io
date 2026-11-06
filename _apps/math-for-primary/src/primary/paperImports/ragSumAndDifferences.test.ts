import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragSumAndDifferences';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'choices'>;
type Solution = {kind: 'coins' | 'rows' | 'mass'; expected: string; mass?: number};

function required(pattern: RegExp, text: string): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing or unclear visible given: ${text}`);
  return match;
}

// Evaluate only the displayed arithmetic, respecting brackets and precedence.
function evaluateCalculation(expression: string): number {
  const tokens = expression.match(/\d+|[()+−÷]/g) ?? [];
  if (tokens.join('') !== expression.replace(/\s+/g, '')) {
    throw new Error(`Unsupported calculation: ${expression}`);
  }
  let position = 0;
  function atom(): number {
    if (tokens[position] === '(') {
      position++;
      const result = sum();
      if (tokens[position++] !== ')') throw new Error('Unclosed bracket');
      return result;
    }
    const token = tokens[position++];
    if (!token || !/^\d+$/.test(token)) throw new Error('Expected a number');
    return Number(token);
  }
  function term(): number {
    let result = atom();
    while (tokens[position] === '÷') {
      position++;
      const divisor = atom();
      if (divisor === 0) throw new Error('Division by zero');
      result /= divisor;
    }
    return result;
  }
  function sum(): number {
    let result = term();
    while (tokens[position] === '+' || tokens[position] === '−') {
      const operator = tokens[position++];
      const next = term();
      result = operator === '+' ? result + next : result - next;
    }
    return result;
  }
  const result = sum();
  if (position !== tokens.length) throw new Error('Unexpected trailing tokens');
  return result;
}

// This solver cannot access the stored answer, worked solution or generator parameters.
// It enumerates possibilities using only the pupil-visible constraints.
function solveVisible(q: VisibleQuestion): Solution {
  const lines = q.context ?? [];
  if (q.prompt.startsWith('(a)')) {
    expect(lines).toHaveLength(3);
    const sum = required(/^([A-Za-z]+) and ([A-Za-z]+) have (\d+) coins between them\.$/, lines[0]);
    const gap = required(/^([A-Za-z]+) has (\d+) more coins than ([A-Za-z]+)\.$/, lines[1]);
    const purse = required(/^([A-Za-z]+)'s purse holds only (\d+)-cent and (\d+)-cent coins\. The coins in that purse are worth \$(\d+)\.(\d{2})\.$/, lines[2]);
    expect(gap[1]).toBe(sum[1]);
    expect(gap[3]).toBe(sum[2]);
    expect(purse[1]).toBe(sum[2]);
    const total = Number(sum[3]);
    const difference = Number(gap[2]);
    const low = Number(purse[2]);
    const high = Number(purse[3]);
    const cents = Number(purse[4]) * 100 + Number(purse[5]);
    expect(q.prompt).toContain(`coins are in ${purse[1]}'s purse`);
    expect(q.prompt).toContain(`(b) How many of those coins are ${high}-cent coins?`);
    expect(total).toBeGreaterThan(difference);
    expect(total).toBeLessThan(10000);
    expect(difference).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    const solutions: [number, number][] = [];
    for (let smaller = 1; smaller < total; smaller++) {
      const larger = total - smaller;
      if (larger - smaller !== difference) continue;
      for (let highCount = 0; highCount <= smaller; highCount++) {
        if ((smaller - highCount) * low + highCount * high === cents) {
          solutions.push([smaller, highCount]);
        }
      }
    }
    expect(solutions).toHaveLength(1);
    const [smaller, highCount] = solutions[0];
    expect(highCount).toBeGreaterThan(0);
    expect(highCount).toBeLessThan(smaller);
    expect(cents).toBeGreaterThan(smaller * low);
    expect(cents).toBeLessThan(smaller * high);
    return {kind: 'coins', expected: JSON.stringify([String(smaller), String(highCount)])};
  }

  if (q.prompt.startsWith('How many rows')) {
    expect(lines).toHaveLength(3);
    const sum = required(/^A hall has (\d+) ([a-z]+) and ([a-z]+) chairs altogether\.$/, lines[0]);
    const gap = required(/^There are (\d+) more ([a-z]+) chairs than ([a-z]+) chairs\.$/, lines[1]);
    const rows = required(/^The chairs are set out in rows of (\d+)\. Every chair is used, and each row has chairs of just one colour\.$/, lines[2]);
    expect(gap[2]).toBe(sum[2]);
    expect(gap[3]).toBe(sum[3]);
    expect(q.prompt).toBe(`How many rows of ${sum[2]} chairs are there?`);
    const total = Number(sum[1]);
    const difference = Number(gap[1]);
    const size = Number(rows[1]);
    expect(total).toBeGreaterThan(difference);
    expect(total).toBeLessThan(10000);
    expect(difference).toBeGreaterThan(0);
    expect(size).toBeGreaterThan(1);
    const solutions: number[] = [];
    for (let rowCount = 1; rowCount * size < total; rowCount++) {
      const larger = rowCount * size;
      const smaller = total - larger;
      if (larger - smaller === difference && smaller % size === 0) {
        solutions.push(rowCount);
      }
    }
    expect(solutions).toHaveLength(1);
    return {kind: 'rows', expected: String(solutions[0])};
  }

  expect(lines).toHaveLength(2);
  const sum = required(/^Two crates, ([A-Z]) and ([A-Z]), have a combined mass of (\d+) kg\.$/, lines[0]);
  const gap = required(/^Crate ([A-Z]) is (\d+) kg heavier than crate ([A-Z])\.$/, lines[1]);
  expect(gap[1]).toBe(sum[1]);
  expect(gap[3]).toBe(sum[2]);
  expect(q.prompt).toBe(`Which calculation gives the mass of crate ${sum[1]} in kilograms?`);
  const total = Number(sum[3]);
  const difference = Number(gap[2]);
  expect(total).toBeGreaterThan(difference);
  expect(total).toBeLessThan(10000);
  expect(difference).toBeGreaterThan(0);
  const masses: number[] = [];
  for (let twiceHeavy = 1; twiceHeavy < 2 * total; twiceHeavy++) {
    const twiceLight = 2 * total - twiceHeavy;
    if (twiceHeavy - twiceLight === 2 * difference) masses.push(twiceHeavy / 2);
  }
  expect(masses).toHaveLength(1);
  const heavier = masses[0];
  const choices = q.choices ?? [];
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  const values = choices.map(evaluateCalculation);
  expect(new Set(values).size).toBe(4);
  const matching = choices.filter((_, i) => values[i] === heavier);
  expect(matching).toHaveLength(1);
  return {kind: 'mass', expected: matching[0], mass: heavier};
}

const seeds = [-123456, -1, 0, 1, 2, 7, 19, 31, 73, 2027, 65536, 2147483647];

describe('sum-and-differences candidate', () => {
  it('independently solves all visible tasks across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const massFractions = new Set<number>();
    const visibleCases = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = {context: q.context, prompt: q.prompt, choices: q.choices};
        const solution = solveVisible(visible);
        kinds.add(solution.kind);
        visibleCases.add(JSON.stringify(visible));
        expect(q.answer).toBe(solution.expected);
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
        expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(3);
        expect(q.picture).toBeUndefined();
        if (solution.kind === 'mass') massFractions.add(solution.mass! % 1);
        if (solution.kind === 'rows') expect(q.unit).toBe('rows');
        if (solution.kind === 'coins') {
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Both linked answers need number fields');
          expect(spec.fields).toHaveLength(2);
          expect(spec.fields.every(field => !field.decimal && field.label.includes('coins'))).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, solution.expected)).toBe(true);
          const solved = JSON.parse(solution.expected) as string[];
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...solved].reverse()))).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([solved[0], String(Number(solved[1]) + 1)]))).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([solved[0]]))).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([`${solved[0]}.5`, solved[1]]))).toBe(false);
        }
      }
    }
    expect(kinds).toEqual(new Set(['coins', 'rows', 'mass']));
    expect(massFractions).toEqual(new Set([0, 0.5]));
    expect(visibleCases.size).toBeGreaterThan(60);
  });

  it('is reproducible and includes each variant in every block of three indices', () => {
    for (const seed of seeds) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const start of [-3, 0, 3, 9]) {
        const kinds = new Set<string>();
        const keys = new Set<string>();
        for (let index = start; index < start + 3; index++) {
          const q = makeRagQuestion(seed, index);
          expect(q).toEqual(makeRagQuestion(seed, index));
          kinds.add(solveVisible({context: q.context, prompt: q.prompt, choices: q.choices}).kind);
          keys.add(q.key);
        }
        expect(kinds).toEqual(new Set(['coins', 'rows', 'mass']));
        expect(keys.size).toBe(3);
      }
    }
  });

  it('declares the required level, family and available curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('sum-and-differences');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const available = new Set(['P5.S.WN.03', 'P5.S.RATE.02']);
    expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
    expect(RAG_PATTERN.skillIds.every(id => available.has(id))).toBe(true);
  });
});
