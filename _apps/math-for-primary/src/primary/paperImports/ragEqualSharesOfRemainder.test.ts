import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion} from './ragEqualSharesOfRemainder';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Facts = {
  kind: 'algebraic-share' | 'substitution' | 'unit-cost' | 'keep-half';
  total: number;
  deduction: number;
  coefficient: number;
  shares: number;
  variable?: string;
  unit: string;
};

function required(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given matching ${pattern}`);
  return match;
}

// Only pupil-visible text enters this solver: no answer, key or generation data.
function readVisible(question: VisibleQuestion): Facts {
  const text = (question.context ?? []).join('\n');
  if (text.includes('counters')) {
    const total = Number(required(text, /Mira has (\d+) counters\./)[1]);
    const removed = required(text, /She puts (\d+)([a-z]) counters in a storage box\./);
    const shares = Number(required(text, /equally among (\d+) pupils\./)[1]);
    required(text, /positive whole number/);
    required(text, /at least one counter, and none are left over/);
    required(question.prompt, /number of counters each pupil gets/);
    return {kind: 'algebraic-share', total, deduction: 0, coefficient: Number(removed[1]), shares, variable: removed[2], unit: 'counters'};
  }
  if (text.includes('beads')) {
    const letter = required(text, /starts with ([a-z]) beads\./)[1];
    const assignment = required(text, /\b([a-z]) = (\d+)\./);
    if (assignment[1] !== letter) throw new Error('The starting letter has no visible value');
    const deduction = Number(required(text, /sets aside (\d+) beads/)[1]);
    const shares = Number(required(text, /equally among (\d+) pupils/)[1]);
    required(question.prompt, /How many beads does each pupil receive/);
    return {kind: 'substitution', total: Number(assignment[2]), deduction, coefficient: 0, shares, unit: 'beads'};
  }
  if (text.includes('key rings')) {
    const total = Number(required(text, /Farah has \$(\d+)\./)[1]);
    const purchase = required(text, /buys (\d+) key rings at \$([a-z]) each\./);
    const deduction = Number(required(text, /pays \$(\d+) for a bus ride\./)[1]);
    const shares = Number(required(text, /buy (\d+) identical mugs\./)[1]);
    required(text, /All prices are positive whole numbers of dollars/);
    required(question.prompt, /cost of one mug in dollars/);
    return {kind: 'unit-cost', total, deduction, coefficient: Number(purchase[1]), shares, variable: purchase[2], unit: 'dollars'};
  }
  if (text.includes('packs of cards')) {
    const total = Number(required(text, /A club has \$(\d+)\./)[1]);
    const purchase = required(text, /buys (\d+) packs of cards at \$([a-z]) per pack\./);
    required(text, /gives half of the money left to a charity and keeps the other half/);
    required(text, /positive whole number of dollars, and money remains/);
    required(question.prompt, /amount the club keeps, in dollars/);
    return {kind: 'keep-half', total, deduction: 0, coefficient: Number(purchase[1]), shares: 2, variable: purchase[2], unit: 'dollars'};
  }
  throw new Error('Unrecognised visible scenario');
}

function solve(facts: Facts, variableValue = 0): number {
  const totalDeducted = facts.deduction + facts.coefficient * variableValue;
  return (facts.total - totalDeducted) / facts.shares;
}

function feasibleValues(facts: Facts): number[] {
  const values: number[] = [];
  for (let value = 1; value < facts.total; value += 1) {
    const remainder = facts.total - facts.deduction - facts.coefficient * value;
    if (remainder > 0 && remainder % facts.shares === 0) values.push(value);
  }
  return values;
}

// An independent, restricted expression reader; no eval or generator helpers.
function expressionValue(expression: string, variable: string, value: number): number {
  const text = expression.replace(/\s+/g, '').replace(/−/g, '-');
  const quotient = /^\((\d+)([+-])(\d*)([a-z])\)\/([1-9]\d*)$/.exec(text);
  const plain = /^(\d+)([+-])(\d*)([a-z])$/.exec(text);
  const match = quotient ?? plain;
  if (!match || match[4] !== variable) throw new Error(`Unsupported expression: ${expression}`);
  const coefficient = Number(match[3] || '1');
  const numerator = Number(match[1]) + (match[2] === '+' ? 1 : -1) * coefficient * value;
  return numerator / (quotient ? Number(quotient[5]) : 1);
}

describe('equal shares of a remainder', () => {
  it('independently solves visible givens and identifies exactly one correct choice across varied seeds', () => {
    const seeds = [-2147483648, -1, 0, 1, 2147483647, 4294967295, ...Array.from({length: 48}, (_, i) => i * 7919 - 40000)];
    const kinds = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const q = makeRagQuestion(seed, index);
        const facts = readVisible({prompt: q.prompt, context: q.context});
        kinds.add(facts.kind);
        expect(facts.total).toBeGreaterThan(0);
        expect(facts.shares).toBeGreaterThan(1);
        expect(facts.deduction).toBeGreaterThanOrEqual(0);
        expect(q.unit).toBe(facts.unit);
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);

        if (!facts.variable) {
          const expected = solve(facts);
          expect(expected).toBeGreaterThan(0);
          expect(Number.isInteger(expected)).toBe(true);
          expect(q.choices).toBeUndefined();
          expect(q.answer).toBe(String(expected));
          expect(correctAnswer(q, String(expected))).toBe(true);
          expect(correctAnswer(q, String(expected + 1))).toBe(false);
          continue;
        }

        expect(q.prompt).toContain(`in terms of ${facts.variable}`);
        const valid = feasibleValues(facts);
        expect(valid.length).toBeGreaterThanOrEqual(2);
        const probes = valid.slice(0, 2).concat(valid.slice(-1));
        for (const value of probes) {
          expect(solve(facts, value)).toBeGreaterThan(0);
          expect(Number.isInteger(solve(facts, value))).toBe(true);
        }
        const choices = q.choices;
        expect(choices).toHaveLength(4);
        if (!choices) throw new Error('Symbolic question needs selectable expressions');
        expect(new Set(choices).size).toBe(4);
        const variable = facts.variable;
        const matching = choices.filter(choice => probes.every(value =>
          Math.abs(expressionValue(choice, variable, value) - solve(facts, value)) < 1e-9,
        ));
        expect(matching).toHaveLength(1);
        expect(q.answer).toBe(matching[0]);
        for (const choice of choices) {
          expect(correctAnswer(q, choice)).toBe(matching.includes(choice));
        }
      }
    }
    expect([...kinds].sort()).toEqual(['algebraic-share', 'keep-half', 'substitution', 'unit-cost']);
  });

  it('reproduces questions and choice order while cycling through all four contexts', () => {
    expect(makeRagQuestion(431)).toEqual(makeRagQuestion(431, 0));
    const keys = new Set<string>();
    const kinds = new Set<string>();
    for (let index = 0; index < 16; index += 1) {
      const first = makeRagQuestion(431, index);
      const second = makeRagQuestion(431, index);
      expect(first).toEqual(second);
      keys.add(first.key);
      kinds.add(readVisible({prompt: first.prompt, context: first.context}).kind);
    }
    expect(keys.size).toBe(16);
    expect(kinds.size).toBe(4);
  });
});
