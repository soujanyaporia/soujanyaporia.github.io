import { describe, expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragEqualSharing';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Kind = 'combined-litres' | 'combined-mixed' | 'converted-share' | 'rounded-mass';
interface Solution {
  kind: Kind;
  expected: string;
  unit: string;
  total: number;
  shares: number;
}

function millilitres(amount: string, unit: string): number {
  if (unit === 'ml') {
    if (!/^\d+$/.test(amount)) throw new Error('Expected whole millilitres');
    return Number(amount);
  }
  if (unit !== 'L' || !/^\d+(?:\.\d{1,3})?$/.test(amount)) {
    throw new Error('Unsupported visible volume');
  }
  const [whole, decimal = ''] = amount.split('.');
  return Number(whole) * 1000 + Number(decimal.padEnd(3, '0'));
}

// This solver receives only pupil-visible givens and the requested unit.
// It cannot inspect the answer, worked solution, key or generation parameters.
function solveVisible(q: VisibleQuestion): Solution {
  const first = q.context?.[0] ?? '';
  const second = q.context?.[1] ?? '';
  const mixture = /^A helper mixes (\d+(?:\.\d+)?) L of water with (\d+(?:\.\d+)?) (L|ml) of fruit juice\.$/.exec(first);
  const cups = /^All the drink is shared equally among (\d+) cups\.$/.exec(second);
  if (mixture && cups) {
    if (!q.prompt.includes('millilitres') || q.unit !== 'ml') throw new Error('Wrong requested volume unit');
    const total = millilitres(mixture[1], 'L') + millilitres(mixture[2], mixture[3]);
    const shares = Number(cups[1]);
    return {
      kind: mixture[3] === 'L' ? 'combined-litres' : 'combined-mixed',
      expected: String(total / shares), unit: 'ml', total, shares,
    };
  }

  const glue = /^An art club has (\d+) ml of liquid glue\.$/.exec(first);
  const pots = /^All the glue is shared equally among (\d+) pots\.$/.exec(second);
  if (glue && pots) {
    if (!q.prompt.includes('litres') || !q.prompt.includes('decimal') || q.unit !== 'L') {
      throw new Error('Missing decimal-litre request');
    }
    const total = Number(glue[1]);
    const shares = Number(pots[1]);
    // Convert the whole total first, unlike the generator's worked order.
    return { kind: 'converted-share', expected: String(total / (1000 * shares)), unit: 'L', total, shares };
  }

  const oats = /^A grocer has (\d+) kg of oats\.$/.exec(first);
  const bags = /^All the oats are packed into (\d+) bags of equal mass\.$/.exec(second);
  const accuracy = /Round your answer to (\d+) decimal places\./.exec(q.prompt);
  if (oats && bags && accuracy) {
    if (!q.prompt.includes('kilograms') || q.unit !== 'kg') throw new Error('Wrong requested mass unit');
    const total = Number(oats[1]);
    const shares = Number(bags[1]);
    const places = Number(accuracy[1]);
    const scale = 10 ** places;
    const scaledTotal = total * scale;
    // Round by comparing the exact division remainder with half a share.
    let rounded = Math.floor(scaledTotal / shares);
    const remainder = scaledTotal - rounded * shares;
    if (remainder * 2 >= shares) rounded += 1;
    return {
      kind: 'rounded-mass', expected: (rounded / scale).toFixed(places),
      unit: 'kg', total, shares,
    };
  }
  throw new Error('Question cannot be solved from its visible givens');
}

const seeds = [-17, -1, 0, 1, 2026, 2147483647,
  ...Array.from({ length: 64 }, (_, i) => i * 7919 + 11)];

function visible(q: Question): VisibleQuestion {
  return { context: q.context, prompt: q.prompt, unit: q.unit };
}

describe('equal sharing candidate', () => {
  it('checks the independent solver against hand-calculated examples', () => {
    expect(solveVisible({
      context: ['A helper mixes 1 L of water with 0.26 L of fruit juice.', 'All the drink is shared equally among 6 cups.'],
      prompt: 'How many millilitres of drink are in each cup?', unit: 'ml',
    }).expected).toBe('210');
    expect(solveVisible({
      context: ['A helper mixes 2 L of water with 160 ml of fruit juice.', 'All the drink is shared equally among 8 cups.'],
      prompt: 'How many millilitres of drink are in each cup?', unit: 'ml',
    }).expected).toBe('270');
    expect(solveVisible({
      context: ['An art club has 8100 ml of liquid glue.', 'All the glue is shared equally among 6 pots.'],
      prompt: 'How many litres of glue are in each pot? Write your answer as a decimal.', unit: 'L',
    }).expected).toBe('1.35');
    for (const [mass, count, expected] of [[4, 7, '0.57'], [5, 8, '0.63'], [2, 3, '0.67']] as const) {
      expect(solveVisible({
        context: [`A grocer has ${mass} kg of oats.`, `All the oats are packed into ${count} bags of equal mass.`],
        prompt: 'What is the mass of oats in each bag, in kilograms? Round your answer to 2 decimal places.', unit: 'kg',
      }).expected).toBe(expected);
    }
  });

  it('independently solves 560 generated questions and checks grading and bounds', () => {
    const kinds = new Set<Kind>();
    const roundingCases = new Set<string>();
    let belowOneKg = false;
    let aboveOneKg = false;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        expect(q.answer).toBe(solved.expected);
        expect(q.unit).toBe(solved.unit);
        expect(correctAnswer(q, solved.expected)).toBe(true);
        expect(solved.shares).toBeGreaterThanOrEqual(3);
        expect(solved.shares).toBeLessThanOrEqual(9);
        expect(Number(q.answer)).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        if (solved.kind === 'rounded-mass') {
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          const remainder = (solved.total * 100) % solved.shares;
          expect(remainder).not.toBe(0);
          roundingCases.add(remainder * 2 === solved.shares
            ? 'tie' : remainder * 2 < solved.shares ? 'down' : 'up');
          belowOneKg ||= solved.total < solved.shares;
          aboveOneKg ||= solved.total > solved.shares;
          expect(correctAnswer(q, String(solved.total / solved.shares))).toBe(false);
        } else {
          expect(solved.total % solved.shares).toBe(0);
          if (solved.kind === 'converted-share') {
            expect(solved.total).toBeLessThanOrEqual(9900);
            expect(q.answer).toContain('.');
            // Millilitres entered where litres are requested must fail.
            expect(correctAnswer(q, String(solved.total / solved.shares))).toBe(false);
          } else {
            expect(solved.total / solved.shares).toBeLessThanOrEqual(500);
            // Litres entered where millilitres are requested must fail.
            expect(correctAnswer(q, String(solved.total / (1000 * solved.shares)))).toBe(false);
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['combined-litres', 'combined-mixed', 'converted-share', 'rounded-mass']);
    expect([...roundingCases].sort()).toEqual(['down', 'tie', 'up']);
    expect(belowOneKg).toBe(true);
    expect(aboveOneKg).toBe(true);
  });

  it('is reproducible and covers all four forms in four consecutive indices', () => {
    for (const seed of [-17, 0, 42, 2147483647]) {
      const kinds = new Set<Kind>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index += 1) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible(visible(q)).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(4);
      expect(keys.size).toBe(4);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('measurement-equal-sharing');
    const permittedSkills = new Set(['P5.S.DEC.02', 'P4.S.DEC.05', 'P4.S.DEC.06', 'P4.S.DEC.07']);
    expect(RAG_PATTERN.skillIds.every(id => permittedSkills.has(id))).toBe(true);
  });
});
