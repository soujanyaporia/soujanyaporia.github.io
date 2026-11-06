import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion, RAG_PATTERN } from './ragLinkedThreePartRatios';

type Label = 'A' | 'B' | 'C';
type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Relation = { left: Label; leftWeight: number; right: Label; rightWeight: number };

// Every relation is read from pupil-visible wording as leftWeight * left = rightWeight * right.
function readRelation(line: string): Relation {
  let match = /^([ABC])'s mass is (\d+)\/(\d+) of ([ABC])'s mass\.$/.exec(line);
  if (match) return {
    left: match[1] as Label, leftWeight: Number(match[3]),
    right: match[4] as Label, rightWeight: Number(match[2]),
  };
  match = /^([ABC])'s mass : ([ABC])'s mass = (\d+) : (\d+)\.$/.exec(line);
  if (match) return {
    left: match[1] as Label, leftWeight: Number(match[4]),
    right: match[2] as Label, rightWeight: Number(match[3]),
  };
  match = /^(\d+)\/(\d+) of ([ABC])'s mass equals (\d+)\/(\d+) of ([ABC])'s mass\.$/.exec(line);
  if (match) return {
    left: match[3] as Label, leftWeight: Number(match[1]) * Number(match[5]),
    right: match[6] as Label, rightWeight: Number(match[4]) * Number(match[2]),
  };
  match = /^([ABC])'s mass is (\d+) times ([ABC])'s mass\.$/.exec(line);
  if (match) return {
    left: match[1] as Label, leftWeight: 1,
    right: match[3] as Label, rightWeight: Number(match[2]),
  };
  throw new Error(`Unsupported visible relationship: ${line}`);
}

function readOrder(prompt: string): Label[] {
  const match = /ratio ([ABC]) : ([ABC]) : ([ABC]) of/.exec(prompt);
  if (!match || new Set(match.slice(1)).size !== 3) throw new Error('Missing or ambiguous requested order');
  return match.slice(1) as Label[];
}

// Independent method: search positive integer values of A, propagating each visible equality.
// The first complete solution is primitive. No answer, worked steps, seed or generator parameters are read.
function solveVisible(q: VisibleQuestion): number[] {
  if (!q.context || q.context.length !== 3) throw new Error('Expected two visible relationships');
  const relations = q.context.slice(1).map(readRelation);
  const order = readOrder(q.prompt);
  for (let a = 1; a <= 512; a++) {
    const values: Partial<Record<Label, number>> = { A: a };
    let possible = true;
    for (let pass = 0; pass < 3 && possible; pass++) {
      for (const relation of relations) {
        const left = values[relation.left];
        const right = values[relation.right];
        if (left !== undefined && right === undefined) {
          const value = left * relation.leftWeight / relation.rightWeight;
          if (!Number.isSafeInteger(value) || value <= 0) { possible = false; break; }
          values[relation.right] = value;
        } else if (right !== undefined && left === undefined) {
          const value = right * relation.rightWeight / relation.leftWeight;
          if (!Number.isSafeInteger(value) || value <= 0) { possible = false; break; }
          values[relation.left] = value;
        }
      }
    }
    if (!possible || values.B === undefined || values.C === undefined) continue;
    const complete = values as Record<Label, number>;
    if (relations.every(relation =>
      complete[relation.left] * relation.leftWeight === complete[relation.right] * relation.rightWeight
    )) return order.map(label => complete[label]);
  }
  throw new Error('No positive whole-number solution within the candidate bounds');
}

function ratioTerms(value: string): number[] {
  if (!/^\d+:\d+:\d+$/.test(value)) throw new Error(`Invalid ratio option: ${value}`);
  return value.split(':').map(Number);
}

function equivalent(a: number[], b: number[]): boolean {
  return a.length === 3 && a.every(value => Number.isSafeInteger(value) && value > 0)
    && a[0] * b[1] === a[1] * b[0]
    && a[0] * b[2] === a[2] * b[0];
}

function expectPrimitive(terms: number[]): void {
  expect(terms).toHaveLength(3);
  expect(terms.every(value => Number.isSafeInteger(value) && value > 0)).toBe(true);
  for (let factor = 2; factor <= Math.min(...terms); factor++) {
    expect(terms.every(value => value % factor === 0)).toBe(false);
  }
}

function visibleKind(q: Question): string {
  const [first, second] = q.context!.slice(1);
  if (first.includes('equals')) return 'fractional-equality';
  if (first.includes(' of ')) return 'successive-fractions';
  if (second.includes(' of ')) return 'ratio-and-fraction';
  return 'linked-pairs';
}

describe('linked three-part ratio candidate', () => {
  it('declares the supported level and curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-linked-three-part-ratios');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.05']);
  });

  it('checks the independent solver with hand-solved examples and changed target orders', () => {
    const fixtures = [
      {
        lines: ["A's mass is 2/3 of B's mass.", "C's mass is 3/5 of A's mass."],
        order: 'C : A : B', expected: [6, 10, 15],
      },
      {
        lines: ["A's mass : B's mass = 2 : 5.", "B's mass : C's mass = 3 : 4."],
        order: 'C : B : A', expected: [20, 15, 6],
      },
      {
        lines: ["A's mass : B's mass = 4 : 7.", "C's mass is 2/5 of B's mass."],
        order: 'B : C : A', expected: [35, 14, 20],
      },
      {
        lines: ["1/4 of A's mass equals 3/5 of B's mass.", "A's mass is 3 times C's mass."],
        order: 'A : C : B', expected: [12, 4, 5],
      },
    ];
    for (const fixture of fixtures) {
      expect(solveVisible({
        context: ['Three parcels are compared.', ...fixture.lines],
        prompt: `What is the ratio ${fixture.order} of the parcels' masses in simplest form?`,
      })).toEqual(fixture.expected);
    }
  });

  it('solves visible givens across varied seeds and checks both response modes', () => {
    const modes = new Set<string>();
    const orders = new Set<string>();
    const visibleQuestions = new Set<string>();
    let simplifiedCases = 0;
    for (let seed = 0; seed < 64; seed++) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible({ context: q.context, prompt: q.prompt });
        const order = readOrder(q.prompt);
        expectPrimitive(expected);
        expect(Math.max(...expected)).toBeLessThanOrEqual(168);
        expect(q.unit).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.requireSimplified).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps!.at(-1)!.equation).toBe(`${order.join(' : ')} = ${expected.join(' : ')}`);
        expect(q.explanation).toContain(q.workedSteps!.at(-1)!.equation!);
        if (q.workedSteps!.some(step => step.text.startsWith('Divide all three terms'))) simplifiedCases++;
        for (const line of q.context!) {
          for (const match of line.matchAll(/(\d+)\/(\d+)/g)) {
            const numerator = Number(match[1]);
            const denominator = Number(match[2]);
            expect(numerator).toBeGreaterThan(0);
            expect(numerator).toBeLessThan(denominator);
            expect(denominator).toBeLessThanOrEqual(9);
          }
        }
        orders.add(order.join(':'));
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        if (q.choices) {
          modes.add(`${visibleKind(q)}:choice`);
          expect(q.structuredResponse).toBeUndefined();
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.answer).toBe(expected.join(':'));
          expect(q.choices).toContain(q.answer);
          const options = q.choices.map(ratioTerms);
          options.forEach(expectPrimitive);
          expect(options.filter(option => equivalent(option, expected))).toHaveLength(1);
        } else {
          modes.add(`${visibleKind(q)}:fields`);
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Expected existing number-fields response');
          expect(spec.fields.map(field => field.label)).toEqual(order.map(label => `${label}'s ratio term`));
          const correct = JSON.stringify(expected.map(String));
          expect(q.answer).toBe(correct);
          expect(structuredResponseCorrect(spec, q.answer, correct)).toBe(true);
          const scaled = JSON.stringify(expected.map(value => String(2 * value)));
          expect(structuredResponseCorrect(spec, q.answer, scaled)).toBe(false);
          const wrong = expected.map(String);
          wrong[0] = String(expected[0] + 1);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
        }
      }
    }
    expect([...modes].sort()).toEqual([
      'fractional-equality:choice', 'fractional-equality:fields',
      'linked-pairs:choice', 'linked-pairs:fields',
      'ratio-and-fraction:choice', 'ratio-and-fraction:fields',
      'successive-fractions:choice', 'successive-fractions:fields',
    ]);
    expect(orders.size).toBe(6);
    expect(visibleQuestions.size).toBeGreaterThan(32);
    expect(simplifiedCases).toBeGreaterThan(0);
  });

  it('is deterministic for repeated inputs, including negative and large seeds', () => {
    for (const seed of [-2147483648, -17, 0, 1, 2026, 4294967295]) {
      for (const index of [0, 1, 7, 31]) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        const expected = solveVisible({ context: first.context, prompt: first.prompt });
        expect(first.answer).toBe(first.choices ? expected.join(':') : JSON.stringify(expected.map(String)));
      }
    }
    expect(makeRagQuestion(20, 0).key).not.toBe(makeRagQuestion(20, 1).key);
  });

  it('rejects inconsistent visible relationships instead of inventing a third quantity', () => {
    expect(() => solveVisible({
      context: [
        'Three parcels are compared.',
        "A's mass : B's mass = 2 : 3.",
        "A's mass : B's mass = 4 : 5.",
      ],
      prompt: "What is the ratio A : B : C of the parcels' masses in simplest form?",
    })).toThrow('No positive whole-number solution');
  });
});
