import { describe, expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragSuccessiveRelativePricePurchases';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Rational = { n: number; d: number };
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return Math.abs(a);
}
function fraction(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) throw Error('Invalid rational');
  const common = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: sign * n / common, d: sign * d / common };
}
const subtract = (a: Rational, b: Rational): Rational => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a: Rational, b: Rational): Rational => fraction(a.n * b.n, a.d * b.d);
const divide = (a: Rational, b: Rational): Rational => fraction(a.n * b.d, a.d * b.n);
function integer(value: Rational): number {
  if (value.d !== 1) throw Error('Expected an exact integer');
  return value.n;
}
function match(text: string, expression: RegExp): RegExpMatchArray {
  const result = text.match(expression);
  if (!result) throw Error(`Missing or malformed visible given: ${text}`);
  return result;
}

// Independent whole-budget solver: subtract non-target spending from all
// spending, then divide by one target item's fraction of the budget.
// Its input has no answer, worked steps, key or generation parameters.
function solveVisible(visible: Visible) {
  const lines = visible.context ?? [];
  if (lines.length !== 3 && lines.length !== 4) throw Error('Incomplete context');
  const first = match(lines[0], /^(\w+) uses (\d+)\/(\d+) of her starting money to buy (\d+) (\w+) and (\d+) (\w+)\.$/);
  const prices = match(lines[1], /^Each (\w+) costs (\d+) times as much as each (\w+)\.$/);
  const second = match(lines[2], /^She then spends (\d+)\/(\d+) of the money she has left on more (\w+), at the same price each\.$/);
  const name = first[1];
  const a = Number(first[2]), b = Number(first[3]);
  const initialCount = Number(first[4]), target = first[5];
  const dearCount = Number(first[6]), dear = first[7];
  const ratio = Number(prices[2]);
  const c = Number(second[1]), d = Number(second[2]);
  if (prices[1] + 's' !== dear || prices[3] + 's' !== target || second[3] !== target) throw Error('Item mismatch');
  if (!(a > 0 && a < b && c > 0 && c < d && ratio > 1 && initialCount > 0 && dearCount > 0)) throw Error('Invalid bounds');
  if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || b > 12 || d > 12) throw Error('Unsuitable displayed fraction');
  const countPrompt = `How many ${target} does ${name} buy in the two purchases altogether?`;
  const moneyPrompt = `How much does ${name} spend on ${target} in the two purchases altogether?`;
  if (visible.prompt !== countPrompt && visible.prompt !== moneyPrompt) throw Error('Unknown response task');

  const firstShare = fraction(a, b);
  const remainderShare = subtract(fraction(1), firstShare);
  const finalShare = multiply(remainderShare, subtract(fraction(1), fraction(c, d)));
  const oneItemShare = divide(firstShare, fraction(initialCount + ratio * dearCount));
  const nonTargetShare = multiply(oneItemShare, fraction(ratio * dearCount));
  const targetShare = subtract(subtract(fraction(1), finalShare), nonTargetShare);
  const count = integer(divide(targetShare, oneItemShare));
  const extra = count - initialCount;
  if (extra <= 0 || finalShare.n <= 0) throw Error('Non-positive purchase or balance');
  const common = { count, extra, initialCount, dearCount, ratio, fractions: `${a}/${b}:${c}/${d}` };

  if (visible.prompt === countPrompt) {
    if (lines.length !== 3) throw Error('Count task has an unnecessary money given');
    return { ...common, expected: String(count), unit: target, money: undefined };
  }
  if (lines.length !== 4) throw Error('Money task needs a final balance');
  const final = match(lines[3], /^After both purchases, she has \$(\d+)\.(\d{2}) left\.$/);
  const leftCents = Number(final[1]) * 100 + Number(final[2]);
  const budget = divide(fraction(leftCents), finalShare);
  const budgetCents = integer(budget);
  const priceCents = integer(multiply(budget, oneItemShare));
  const answerCents = integer(multiply(budget, targetShare));
  const firstCents = integer(multiply(budget, firstShare));
  const secondCents = integer(multiply(multiply(budget, remainderShare), fraction(c, d)));
  return {
    ...common,
    expected: (answerCents / 100).toFixed(2),
    unit: 'dollars',
    money: { budgetCents, priceCents, answerCents, leftCents, firstCents, secondCents },
  };
}

const fixtureContext = [
  'Nora uses 2/5 of her starting money to buy 6 pencils and 4 notebooks.',
  'Each notebook costs 3 times as much as each pencil.',
  'She then spends 2/3 of the money she has left on more pencils, at the same price each.',
];

describe('successive purchases with relative prices', () => {
  test('independent solver recovers hand-calculated count and money examples', () => {
    const count = solveVisible({
      context: fixtureContext,
      prompt: 'How many pencils does Nora buy in the two purchases altogether?',
    });
    expect(count.expected).toBe('24');
    expect(count.extra).toBe(18);
    const money = solveVisible({
      context: [...fixtureContext, 'After both purchases, she has $6.75 left.'],
      prompt: 'How much does Nora spend on pencils in the two purchases altogether?',
    });
    expect(money.expected).toBe('18.00');
    expect(money.money?.budgetCents).toBe(3375);
    expect(money.money?.priceCents).toBe(75);
    const scaled = solveVisible({
      context: [...fixtureContext, 'After both purchases, she has $13.50 left.'],
      prompt: 'How much does Nora spend on pencils in the two purchases altogether?',
    });
    expect(scaled.expected).toBe('36.00');
    expect(scaled.count).toBe(money.count);
  });

  test('solves both generated variants from visible givens across varied seeds and indices', () => {
    const seeds = [-2147483648, -99, -1, 2147483647, 4294967295, ...Array.from({ length: 80 }, (_, i) => i)];
    const variants = new Set<string>();
    const fractionPairs = new Set<string>();
    const countContexts = new Set<string>();
    const moneyContexts = new Set<string>();
    let hasNonWholeDollarAnswer = false;
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({ context: q.context, prompt: q.prompt });
        expect(q.answer).toBe(solved.expected);
        expect(q.unit).toBe(solved.unit);
        expect(solved.count).toBeGreaterThan(solved.initialCount);
        expect(solved.count).toBeLessThanOrEqual(80);
        expect(solved.extra).toBeLessThanOrEqual(60);
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps?.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.explanation).toBe(q.workedSteps?.map(step => `${step.text} ${step.equation}`).join(' '));
        fractionPairs.add(solved.fractions);
        if (solved.money) {
          variants.add('money');
          moneyContexts.add(JSON.stringify(q.context));
          const m = solved.money;
          expect(m.priceCents).toBeGreaterThan(0);
          expect(m.leftCents).toBeGreaterThan(0);
          expect(m.budgetCents).toBeLessThanOrEqual(22500);
          expect(m.firstCents).toBe((solved.initialCount + solved.ratio * solved.dearCount) * m.priceCents);
          expect(m.secondCents).toBe(solved.extra * m.priceCents);
          expect(m.firstCents + m.secondCents + m.leftCents).toBe(m.budgetCents);
          expect(m.answerCents).toBe(solved.count * m.priceCents);
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          if (m.answerCents % 100 !== 0) hasNonWholeDollarAnswer = true;
        } else {
          variants.add('count');
          countContexts.add(JSON.stringify(q.context));
          expect(q.answer).toMatch(/^[1-9]\d*$/);
        }
      }
    }
    expect([...variants].sort()).toEqual(['count', 'money']);
    expect(fractionPairs.size).toBeGreaterThan(4);
    expect(countContexts.size).toBeGreaterThan(20);
    expect(moneyContexts.size).toBeGreaterThan(20);
    expect(hasNonWholeDollarAnswer).toBe(true);
  });

  test('generation is deterministic and neighbouring indices exercise both response tasks', () => {
    for (const seed of [-7, 0, 19, 2026]) {
      const q0 = makeRagQuestion(seed);
      const q1 = makeRagQuestion(seed, 1);
      expect(makeRagQuestion(seed, 0)).toEqual(q0);
      expect(makeRagQuestion(seed, 1)).toEqual(q1);
      expect(q0.key).not.toBe(q1.key);
      expect([q0.unit, q1.unit].filter(unit => unit === 'dollars')).toHaveLength(1);
    }
  });

  test('uses the requested family identity and valid curriculum skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-successive-purchases-relative-prices');
    const permitted = new Set(['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P6.S.FRAC.02', 'P6.S.RATIO.05']);
    expect(RAG_PATTERN.skillIds.every(id => permitted.has(id))).toBe(true);
  });

  test('the visible solver rejects a missing final balance and inconsistent item labels', () => {
    expect(() => solveVisible({
      context: fixtureContext,
      prompt: 'How much does Nora spend on pencils in the two purchases altogether?',
    })).toThrow('Money task needs a final balance');
    expect(() => solveVisible({
      context: [fixtureContext[0], fixtureContext[1], fixtureContext[2].replace('more pencils', 'more erasers')],
      prompt: 'How many pencils does Nora buy in the two purchases altogether?',
    })).toThrow('Item mismatch');
  });
});
