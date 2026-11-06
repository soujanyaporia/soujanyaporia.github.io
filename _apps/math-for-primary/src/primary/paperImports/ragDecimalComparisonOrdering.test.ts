import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragDecimalComparisonOrdering';

// Parse only visible decimal strings. Integer thousandths avoid floating-point comparisons.
function scaled(text: string): number {
  const match = /^(\d+)\.(\d{1,3})$/.exec(text);
  if (!match) throw new Error(`Invalid visible decimal: ${text}`);
  return Number(match[1]) * 1000 + Number(match[2].padEnd(3, '0'));
}

function familyVariant(q: Question): string {
  if (q.choices) return 'bounds';
  if (q.order) {
    if (q.prompt.includes('largest to smallest')) return 'descending';
    if (q.prompt.includes('smallest to largest')) return 'ascending';
    throw new Error('The ordering direction is missing.');
  }
  return 'duration';
}

// This solver never consults answer, key, hint, explanation or workedSteps.
function solveVisible(q: Question): string {
  const variant = familyVariant(q);
  if (variant === 'bounds') {
    const text = (q.context ?? []).join(' ');
    const lowerMatch = /greater than (\d+\.\d{2})\./.exec(text);
    const upperMatch = /less than (\d+\.\d{2})\./.exec(text);
    if (!lowerMatch || !upperMatch || !q.choices) throw new Error('Missing visible bounds or choices.');
    const lower = scaled(lowerMatch[1]);
    const upper = scaled(upperMatch[1]);
    expect(lower).toBeLessThan(upper);
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices.map(scaled)).size).toBe(4);
    const valid = q.choices.filter(value => scaled(value) > lower && scaled(value) < upper);
    expect(valid).toHaveLength(1);
    // The endpoints are deliberate distractors; strict inequalities must reject both.
    expect(q.choices).toContain(lowerMatch[1]);
    expect(q.choices).toContain(upperMatch[1]);
    expect(valid).not.toContain(lowerMatch[1]);
    expect(valid).not.toContain(upperMatch[1]);
    return valid[0];
  }

  if (variant === 'ascending' || variant === 'descending') {
    if (!q.order) throw new Error('Missing visible ordering tokens.');
    expect(q.order).toHaveLength(4);
    const tokens = q.order.map(text => ({text, value: scaled(text)}));
    expect(new Set(tokens.map(token => token.value)).size).toBe(4);
    tokens.sort((a, b) => a.value - b.value);
    if (variant === 'descending') tokens.reverse();
    return tokens.map(token => token.text).join(',');
  }

  expect(q.prompt).toBe('Who completed the puzzle first?');
  expect((q.context ?? []).join(' ')).toContain('at the same time');
  const rows = (q.context ?? []).flatMap(line => {
    const match = /^([A-Za-z]+): (\d+\.\d) seconds\.$/.exec(line);
    return match ? [{name: match[1], value: scaled(match[2])}] : [];
  });
  expect(rows).toHaveLength(4);
  expect(new Set(rows.map(row => row.name)).size).toBe(4);
  expect(new Set(rows.map(row => row.value)).size).toBe(4);
  expect(rows.every(row => row.value > 0)).toBe(true);
  const minimum = Math.min(...rows.map(row => row.value));
  const winners = rows.filter(row => row.value === minimum);
  expect(winners).toHaveLength(1);
  return winners[0].name;
}

describe('decimal comparison and ordering candidate', () => {
  it('independently solves all four response variants across varied seeds and indices', () => {
    const seeds = [-2147483648, -91, -1, 0, 2147483647, ...Array.from({length: 160}, (_, i) => i + 1)];
    const seen = new Set<string>();
    const boundPositions = new Set<number>();
    const durationWinners = new Set<string>();
    const visibleInstances = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(q);
        expect(q.answer).toBe(expected);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
        seen.add(familyVariant(q));
        visibleInstances.add(JSON.stringify([q.prompt, q.context, q.choices, q.order]));
        if (q.choices) boundPositions.add(q.choices.indexOf(expected));
        if (familyVariant(q) === 'duration') durationWinners.add(expected);
      }
    }
    expect([...seen].sort()).toEqual(['ascending', 'bounds', 'descending', 'duration']);
    expect(boundPositions.size).toBe(4);
    expect(durationWinners.size).toBe(4);
    expect(visibleInstances.size).toBeGreaterThan(200);
  });

  it('reproduces identical questions and reaches every variant within four indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.DEC.02']);
    expect(RAG_PATTERN.canonicalPatternId).toBe('decimal-comparison-and-ordering');
    for (const seed of [-7, 0, 23, 1009]) {
      const variants = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        variants.add(familyVariant(first));
      }
      expect(variants.size).toBe(4);
    }
  });

  it('solves from visible givens even when stored answers and feedback are replaced', () => {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(311, index);
      const expected = solveVisible(q);
      const withoutSolutions: Question = {
        ...q,
        key: 'unavailable',
        answer: 'incorrect placeholder',
        hint: '',
        explanation: '',
        workedSteps: [],
      };
      expect(solveVisible(withoutSolutions)).toBe(expected);
    }
  });
});
