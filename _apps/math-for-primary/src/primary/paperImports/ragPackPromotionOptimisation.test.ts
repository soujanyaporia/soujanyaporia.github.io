import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragPackPromotionOptimisation';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {kind: string; expected: string; flags: string[]};

function match(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Missing visible given: ${pattern}`);
  return result;
}
function cents(value: string): number {
  const parts = match(value, /^(\d+)\.(\d{2})$/);
  return Number(parts[1]) * 100 + Number(parts[2]);
}
function dollars(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

// This solver receives only displayed givens. It cannot access answers,
// worked steps, keys, seeds, hints, or generation parameters.
function solveVisible(question: Visible): Solution {
  const text = [...(question.context ?? []), question.prompt].join('\n');
  if (text.includes('Zara needs at least')) {
    const target = Number(match(text, /Zara needs at least (\d+) (?:badges|muffins)/)[1]);
    const single = Number(match(text, /One (?:badge|muffin) costs (\d+) cents\./)[1]);
    const pack = /A sealed pack of (\d+) badges costs \$(\d+\.\d{2})\./.exec(text);
    let size: number;
    let price: number;
    let promotion = false;
    if (pack) {
      size = Number(pack[1]);
      price = cents(pack[2]!);
    } else {
      const offer = match(text, /Offer: Pay \$(\d+\.\d{2}) for (\d+) muffins and receive (\d+) free muffin\./);
      price = cents(offer[1]!);
      size = Number(offer[2]) + Number(offer[3]);
      promotion = true;
    }
    if (!text.includes('may keep any extra')) throw new Error('Extra-item policy is missing');
    // Exhaustively buy BOTH counts independently, instead of calculating
    // the required singles for each pack count as the generator does.
    let minimum = Infinity;
    let hasExtraOptimum = false;
    let hasExactOptimum = false;
    for (let packs = 0; packs <= target; packs++) {
      for (let singles = 0; singles <= target; singles++) {
        const quantity = packs * size + singles;
        if (quantity < target) continue;
        const cost = packs * price + singles * single;
        if (cost < minimum) {
          minimum = cost;
          hasExtraOptimum = quantity > target;
          hasExactOptimum = quantity === target;
        } else if (cost === minimum) {
          hasExtraOptimum ||= quantity > target;
          hasExactOptimum ||= quantity === target;
        }
      }
    }
    return {kind: 'minimum', expected: dollars(minimum), flags: [
      promotion ? 'free-item-offer' : 'ordinary-pack',
      ...(hasExtraOptimum ? ['extra-pack-optimum'] : []),
      ...(hasExactOptimum ? ['exact-target-optimum'] : []),
    ]};
  }

  if (text.includes('sells beads only in sealed packs')) {
    const pack = match(text, /Each pack contains (\d+) beads and costs \$(\d+\.\d{2})\./);
    const size = Number(pack[1]);
    const price = cents(pack[2]!);
    const budget = cents(match(text, /can spend up to \$(\d+\.\d{2})\./)[1]!);
    let quantity = 0;
    let spent = 0;
    while (spent + price <= budget) {
      spent += price;
      quantity += size;
    }
    return {kind: 'fixed', expected: String(quantity), flags: [spent === budget ? 'exact-budget' : 'unused-budget']};
  }

  if (text.includes('identical erasers')) {
    const single = cents(match(text, /One eraser costs \$(\d+\.\d{2})\./)[1]!);
    const pack = match(text, /A sealed pack of (\d+) erasers costs \$(\d+\.\d{2})\./);
    const size = Number(pack[1]);
    const price = cents(pack[2]!);
    const budget = cents(match(text, /A pupil has \$(\d+\.\d{2}) to spend/)[1]!);
    let maximum = -1;
    let singlesOnlyOptimal = false;
    let mixedOptimal = false;
    for (let packs = 0; packs * price <= budget; packs++) {
      for (let singles = 0; singles * single <= budget; singles++) {
        if (packs * price + singles * single > budget) continue;
        const quantity = packs * size + singles;
        if (quantity > maximum) {
          maximum = quantity;
          singlesOnlyOptimal = packs === 0;
          mixedOptimal = packs > 0 && singles > 0;
        } else if (quantity === maximum) {
          singlesOnlyOptimal ||= packs === 0;
          mixedOptimal ||= packs > 0 && singles > 0;
        }
      }
    }
    return {kind: 'budget', expected: String(maximum), flags: [
      ...(singlesOnlyOptimal ? ['singles-only-optimum'] : []),
      ...(mixedOptimal ? ['packs-and-singles-optimum'] : []),
      price > size * single ? 'pack-costs-more-per-item' : 'pack-not-more-per-item',
    ]};
  }

  if (text.includes('A nature park')) {
    const adultPrice = cents(match(text, /An individual adult pass costs \$(\d+\.\d{2})\./)[1]!);
    const childPrice = cents(match(text, /An individual child pass costs \$(\d+\.\d{2})\./)[1]!);
    const group = match(text, /A group pass for (\d+) adults and (\d+) children costs \$(\d+\.\d{2})\./);
    const groupAdults = Number(group[1]);
    const groupChildren = Number(group[2]);
    const groupPrice = cents(group[3]!);
    const firstAdults = Number(match(text, /\(a\) (\d+) adults visit without any children\./)[1]);
    const party = match(text, /\(b\) Another party has (\d+) adults and (\d+) children\./);
    const adults = Number(party[1]);
    const children = Number(party[2]);
    if (!text.includes('only for a full group')) throw new Error('Complete-group policy is missing');
    // Independently construct the cheapest exact population using a 2D
    // dynamic programme, rather than enumerating the generator's plans.
    const costs: number[][] = Array.from({length: Math.max(adults, firstAdults) + 1},
      () => Array<number>(children + 1).fill(Infinity));
    costs[0]![0] = 0;
    for (let a = 0; a < costs.length; a++) {
      for (let c = 0; c <= children; c++) {
        if (a > 0) costs[a]![c] = Math.min(costs[a]![c]!, costs[a - 1]![c]! + adultPrice);
        if (c > 0) costs[a]![c] = Math.min(costs[a]![c]!, costs[a]![c - 1]! + childPrice);
        if (a >= groupAdults && c >= groupChildren) {
          costs[a]![c] = Math.min(costs[a]![c]!, costs[a - groupAdults]![c - groupChildren]! + groupPrice);
        }
      }
    }
    const adultLimit = Math.floor(adults / groupAdults);
    const childLimit = Math.floor(children / groupChildren);
    return {kind: 'mixed', expected: JSON.stringify([
      dollars(costs[firstAdults]![0]!), dollars(costs[adults]![children]!),
    ]), flags: [adultLimit < childLimit ? 'adults-limit-groups' : adultLimit > childLimit ? 'children-limit-groups' : 'equal-group-limits']};
  }
  throw new Error('Unrecognised visible purchasing question');
}

describe('pack and promotion optimisation candidate', () => {
  test('matches independent solutions from visible givens across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const flags = new Set<string>();
    for (let seed = -40; seed < 160; seed++) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible({context: question.context, prompt: question.prompt});
        expect(question.answer, `seed ${seed}, index ${index}`).toBe(solution.expected);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(40);
        expect(question.picture).toBeUndefined();
        kinds.add(solution.kind);
        solution.flags.forEach(flag => flags.add(flag));
        if (solution.kind === 'mixed') {
          expect(question.structuredResponse?.kind).toBe('number-fields');
          expect(question.unit).toBe('dollars');
        } else {
          expect(question.structuredResponse).toBeUndefined();
          expect(question.unit).toBe(solution.kind === 'minimum' ? 'dollars' : solution.kind === 'fixed' ? 'beads' : 'erasers');
        }
      }
    }
    expect([...kinds].sort()).toEqual(['budget', 'fixed', 'minimum', 'mixed']);
    for (const flag of [
      'free-item-offer', 'ordinary-pack', 'extra-pack-optimum', 'exact-target-optimum',
      'exact-budget', 'unused-budget', 'singles-only-optimum', 'packs-and-singles-optimum',
      'pack-costs-more-per-item', 'adults-limit-groups', 'children-limit-groups',
    ]) expect(flags.has(flag), flag).toBe(true);
  });

  test('preserves and grades both linked money responses', () => {
    for (const seed of [3, 7, 11, 15, 19, 23, 27, 31]) {
      const question = makeRagQuestion(seed);
      const expected = solveVisible({context: question.context, prompt: question.prompt}).expected;
      const spec = question.structuredResponse;
      if (!spec || spec.kind !== 'number-fields') throw new Error('Expected two money fields');
      expect(spec.fields).toHaveLength(2);
      expect(spec.fields.every(field => field.decimal === true)).toBe(true);
      expect(structuredResponseCorrect(spec, question.answer, expected)).toBe(true);
      const values = JSON.parse(expected) as string[];
      const changedSecond = JSON.stringify([values[0], dollars(cents(values[1]!) + 1)]);
      const changedFirst = JSON.stringify([dollars(cents(values[0]!) + 1), values[1]]);
      expect(structuredResponseCorrect(spec, question.answer, changedSecond)).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, changedFirst)).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([values[0]]))).toBe(false);
    }
  });

  test('is deterministic and keeps identities distinct across indices', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('pack-and-promotion-optimisation');
    expect(RAG_PATTERN.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    for (const seed of [-2147483648, -1, 0, 17, 2147483647]) {
      const keys = new Set<string>();
      for (let index = 0; index < 8; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        keys.add(first.key);
      }
      expect(keys.size).toBe(8);
    }
  });
});
