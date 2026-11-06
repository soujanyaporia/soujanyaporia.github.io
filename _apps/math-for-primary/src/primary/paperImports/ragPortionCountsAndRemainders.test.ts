import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragPortionCountsAndRemainders';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solution = {
  kind: 'liquid' | 'mass-count' | 'two-stage';
  total: number;
  removed: number;
  portion: number;
  count: number;
  left: number;
  answer: number;
};

function read(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Unreadable visible given: ${pattern}`);
  return match;
}

// Exact decimal parsing, independent of the generator's formatting helper.
function thousandths(value: string): number {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) throw new Error('Invalid measurement');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}

// Count portions by repeated subtraction rather than floor, division or modulo.
function takePortions(total: number, portion: number): {count: number; left: number} {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(portion) || portion <= 0) {
    throw new Error('Invalid portion problem');
  }
  let count = 0;
  let left = total;
  while (left >= portion) {
    left -= portion;
    count += 1;
  }
  return {count, left};
}

// This function receives no answer, explanation, worked steps or generation state.
function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join(' ');
  if (q.unit === 'ml') {
    const total = thousandths(read(text, /jug holds (\d+(?:\.\d+)?) L/)[1]);
    const portion = Number(read(text, /Each cup holds (\d+) ml/)[1]);
    const result = takePortions(total, portion);
    return {kind: 'liquid', total, removed: 0, portion, ...result, answer: result.left};
  }
  if (q.unit === 'bags') {
    const total = thousandths(read(text, /starts with (\d+(?:\.\d+)?) kg/)[1]);
    const removed = Number(read(text, /uses (\d+) g/)[1]);
    const portion = Number(read(text, /bags of (\d+) g each/)[1]);
    const result = takePortions(total - removed, portion);
    return {kind: 'mass-count', total, removed, portion, ...result, answer: result.count};
  }
  if (q.unit === 'kg') {
    const total = thousandths(read(text, /shop has (\d+(?:\.\d+)?) kg/)[1]);
    const first = read(text, /first fills (\d+) bags with (\d+(?:\.\d+)?) kg/);
    const firstMass = thousandths(first[2]);
    // Add the first bag mass repeatedly instead of copying the production product.
    let removed = 0;
    for (let bag = 0; bag < Number(first[1]); bag += 1) removed += firstMass;
    const portion = thousandths(read(text, /putting (\d+(?:\.\d+)?) kg in each one/)[1]);
    const result = takePortions(total - removed, portion);
    return {kind: 'two-stage', total, removed, portion, ...result, answer: result.left / 1000};
  }
  throw new Error(`Unsupported visible answer unit: ${q.unit}`);
}

function visibleOnly(q: Question): Visible {
  return {context: q.context, prompt: q.prompt, unit: q.unit};
}

function checkEquation(equation: string): void {
  for (const part of equation.split(';')) {
    const match = read(
      part.trim(),
      /^(\d+(?:\.\d+)?)\s*([×÷−+])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)(?:\s+(?:ml|kg|g|bags))?$/,
    );
    const a = Number(match[1]);
    const b = Number(match[3]);
    const rhs = Number(match[4]);
    if (match[2] === '÷') expect(b).toBeGreaterThan(0);
    const lhs = match[2] === '×' ? a * b
      : match[2] === '÷' ? a / b
      : match[2] === '−' ? a - b
      : a + b;
    expect(lhs).toBeCloseTo(rhs, 8);
  }
}

describe('portion counts and remainders', () => {
  it('checks the independent solver at exact and neighbouring capacity boundaries', () => {
    for (const [litres, count, left] of [
      ['0.79', 1, 390],
      ['0.8', 2, 0],
      ['0.81', 2, 10],
    ] as const) {
      const result = solveVisible({
        context: [
          `A jug holds ${litres} L of fruit drink.`,
          'Each cup holds 400 ml. Fill as many cups completely as possible.',
        ],
        prompt: 'How many millilitres remain?',
        unit: 'ml',
      });
      expect(result.count).toBe(count);
      expect(result.answer).toBe(left);
    }
  });

  it('solves independently specified mass-use and two-stage examples', () => {
    const bags = solveVisible({
      context: [
        'A baker starts with 2.52 kg of oats.',
        'The baker uses 420 g for biscuits.',
        'All the rest is packed into bags of 140 g each.',
      ],
      prompt: 'How many bags are filled?',
      unit: 'bags',
    });
    expect(bags.answer).toBe(15);
    expect(bags.left).toBe(0);

    const rice = solveVisible({
      context: [
        'A shop has 25.8 kg of rice.',
        'The shop first fills 12 bags with 1.3 kg in each bag.',
        'It fills as many smaller bags completely as possible, putting 0.8 kg in each one.',
      ],
      prompt: 'How much rice remains in kilograms?',
      unit: 'kg',
    });
    expect(rice.removed).toBe(15600);
    expect(rice.count).toBe(12);
    expect(rice.left).toBe(600);
    expect(rice.answer).toBe(0.6);
  });

  it('independently solves visible givens across 128 seeds and six indexes', () => {
    const seen: Record<Solution['kind'], Set<string>> = {
      liquid: new Set(),
      'mass-count': new Set(),
      'two-stage': new Set(),
    };
    const keys = new Set<string>();
    for (let seed = -32; seed < 96; seed += 1) {
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const result = solveVisible(visible);
        expect(q.answer).toMatch(/^\d+(?:\.\d{1,3})?$/);
        expect(Number(q.answer)).toBe(result.answer);
        expect(result.total).toBeGreaterThan(result.removed);
        expect(result.count).toBeGreaterThan(0);
        expect(result.left).toBeGreaterThanOrEqual(0);
        expect(result.left).toBeLessThan(result.portion);
        expect(result.removed + result.count * result.portion + result.left).toBe(result.total);
        expect(result.removed + (result.count + 1) * result.portion).toBeGreaterThan(result.total);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        seen[result.kind].add(JSON.stringify(visible));

        if (result.kind === 'mass-count') {
          expect(result.left).toBe(0);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(choice => Number(choice) === result.answer)).toHaveLength(1);
          for (const choice of q.choices ?? []) {
            expect(choice).toMatch(/^[1-9]\d*$/);
          }
        } else {
          expect(result.left).toBeGreaterThan(0);
          expect(q.choices).toBeUndefined();
          if (result.kind === 'two-stage') {
            expect(thousandths(q.answer)).toBe(result.left);
          }
        }

        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect((q.workedSteps ?? []).length).toBeGreaterThanOrEqual(3);
        for (const step of q.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation).toBeTruthy();
          checkEquation(step.equation!);
        }
      }
    }
    expect(keys.size).toBe(768);
    for (const variants of Object.values(seen)) expect(variants.size).toBeGreaterThan(25);
  });

  it('is deterministic and reaches all three tasks for consecutive indexes', () => {
    for (const seed of [-2147483648, -1, 0, 1, 2147483647]) {
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index += 1) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible(visibleOnly(q)).kind);
      }
      expect([...kinds].sort()).toEqual(['liquid', 'mass-count', 'two-stage']);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  });
});
