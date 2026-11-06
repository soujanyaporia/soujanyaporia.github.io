import {test, expect} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragFractionalPartitionComplements';

// The oracle receives only information visible before answering.
type Visible = Pick<Question, 'context' | 'prompt'>;
const match = (text: string, pattern: RegExp): number[] => {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Unrecognised visible givens: ${text}`);
  return result.slice(1).map(Number);
};
const unique = (values: number[]): number => {
  if (values.length !== 1) throw new Error(`Expected one solution, found ${values.length}`);
  return values[0];
};
const counts = (maximum: number): number[] => Array.from({length: maximum + 1}, (_, i) => i);
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const verdict = (values: boolean[]): string => {
  if (!values.length) throw new Error('The visible givens have no feasible world');
  return values.every(Boolean) ? 'True' : values.every(value => !value) ? 'False' : 'Impossible to tell';
};

function solveVisible(q: Visible) {
  const lines = q.context ?? [];
  if (lines[0]?.startsWith('A craft box')) {
    if (q.prompt !== 'How many more round buttons than square buttons are in the box?') throw new Error('Unexpected comparison task');
    const [total] = match(lines[0], /^A craft box holds (\d+) buttons\.$/);
    const [n, d] = match(lines[1], /^(\d+)\/(\d+) of the buttons are square\. The other buttons are round\.$/);
    const square = unique(counts(total).filter(value => value * d === total * n));
    const round = total - square;
    return {kind: 'difference' as const, expected: String(total - 2 * square), total, n, d, square, round};
  }
  if (lines[0]?.startsWith('A school kitchen')) {
    if (q.prompt !== '(a) How many oat muffins are packed for the visitors? (b) How many muffins go to the helpers?') throw new Error('Missing linked task');
    const [total] = match(lines[0], /^A school kitchen prepares (\d+) banana muffins and oat muffins altogether\.$/);
    const [pn, pd] = match(lines[1], /^(\d+)\/(\d+) of all the muffins are banana muffins\. The rest are oat muffins\.$/);
    const [fixed, gn, gd] = match(lines[2], /^The cook packs (\d+) banana muffins and (\d+)\/(\d+) of the oat muffins for visitors\.$/);
    const [fn, fd] = match(lines[3], /^Next, the cook gives the helpers some of each kind of muffin still in the kitchen\. Afterwards, (\d+)\/(\d+) of the original total number of muffins is left\.$/);
    const banana = unique(counts(total).filter(value => value * pd === total * pn));
    const oat = total - banana;
    const oatGift = unique(counts(oat).filter(value => value * gd === oat * gn));
    // Solve the conservation constraint for the unknown second removal.
    const helpers = unique(counts(total).filter(value =>
      (total - fixed - oatGift - value) * fd === total * fn,
    ));
    const left = total - fixed - oatGift - helpers;
    const feasibleSplits = counts(banana - fixed).filter(bananaGiven => {
      const oatGiven = helpers - bananaGiven;
      return bananaGiven >= 1 && oatGiven >= 1 && oatGiven <= oat - oatGift;
    });
    return {
      kind: 'removals' as const,
      expected: JSON.stringify([String(oatGift), String(helpers)]),
      total, banana, oat, fixed, oatGift, helpers, left, feasibleSplits,
      fractions: [[pn, pd], [gn, gd], [fn, fd]],
    };
  }
  if (!q.prompt.includes('(a) The number of men equals the number of women.') ||
      !q.prompt.includes('(b) There are more girls than men.')) throw new Error('Missing judgement task');
  if (lines[0] !== 'A community walk has adults and children. Every adult is a man or a woman, and every child is a boy or a girl.') throw new Error('Missing exhaustive categories');
  if (lines[2] !== 'There are more boys than girls.') throw new Error('Missing inequality');
  const [cn, cd, wn, wd] = match(lines[1], /^Of all the people, (\d+)\/(\d+) are children and (\d+)\/(\d+) are women\.$/);
  const common = cd * wd / gcd(cd, wd);
  // A sufficiently fine integer model exposes both sides of every possible
  // strict comparison for these bounded rational shares. Enumerate all splits.
  const total = common * 12;
  const children = total * cn / cd;
  const women = total * wn / wd;
  const men = total - children - women;
  const worlds = counts(children)
    .map(girls => ({girls, boys: children - girls}))
    .filter(world => world.boys > world.girls);
  const first = verdict(worlds.map(() => men === women));
  const second = verdict(worlds.map(world => world.girls > men));
  return {
    kind: 'comparisons' as const,
    expected: `(a) ${first}; (b) ${second}`,
    first, second, total, children, women, men, worlds,
    fractions: [[cn, cd], [wn, wd]],
  };
}

test('independently solves all visible tasks across varied seeds and indices', () => {
  const variants = new Set<string>();
  const comparisonAnswers = new Set<string>();
  const visibleQuestions = new Set<string>();
  let equalityBoundarySeen = false;
  for (let seed = -100; seed < 140; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible({context: q.context, prompt: q.prompt});
      variants.add(solved.kind);
      visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
      expect(q.answer).toBe(solved.expected);
      expect(correctAnswer(q, solved.expected)).toBe(true);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
      expect(q.hint.length).toBeGreaterThan(15);
      expect(q.explanation.length).toBeGreaterThan(40);
      expect(q.picture).toBeUndefined();

      if (solved.kind === 'difference') {
        expect(solved.n).toBeGreaterThan(0);
        expect(2 * solved.n).toBeLessThan(solved.d);
        expect(solved.d).toBeLessThanOrEqual(12);
        expect(solved.square).toBeGreaterThan(0);
        expect(solved.round).toBeGreaterThan(solved.square);
        expect(solved.square + solved.round).toBe(solved.total);
        expect(q.unit).toBe('buttons');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(correctAnswer(q, String(Number(solved.expected) + 1))).toBe(false);
      } else if (solved.kind === 'removals') {
        expect(solved.total).toBeGreaterThanOrEqual(120);
        expect(solved.total).toBeLessThanOrEqual(900);
        expect(solved.fixed).toBeGreaterThan(0);
        expect(solved.fixed).toBeLessThan(solved.banana);
        expect(solved.oatGift).toBeGreaterThan(0);
        expect(solved.oatGift).toBeLessThan(solved.oat);
        expect(solved.helpers).toBeGreaterThanOrEqual(2);
        expect(solved.left).toBeGreaterThan(0);
        expect(solved.feasibleSplits.length).toBeGreaterThan(0);
        for (const value of [solved.banana, solved.oat, solved.oatGift, solved.helpers, solved.left]) {
          expect(Number.isInteger(value)).toBe(true);
        }
        expect(solved.fixed + solved.oatGift + solved.helpers + solved.left).toBe(solved.total);
        for (const [n, d] of solved.fractions) {
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThan(d);
          expect(d).toBeLessThanOrEqual(12);
        }
        const response = q.structuredResponse;
        expect(response?.kind).toBe('number-fields');
        if (response?.kind !== 'number-fields') throw new Error('Both parts need separate number fields');
        expect(response.fields).toHaveLength(2);
        expect(response.fields[0].label).toContain('(a)');
        expect(response.fields[1].label).toContain('(b)');
        expect(correctAnswer(q, JSON.stringify([String(solved.oatGift + 1), String(solved.helpers)]))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([String(solved.oatGift), String(solved.helpers + 1)]))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([String(solved.oatGift)]))).toBe(false);
      } else {
        comparisonAnswers.add(solved.expected);
        expect(solved.men).toBeGreaterThan(0);
        expect(solved.women).toBeGreaterThan(0);
        expect(solved.children).toBeGreaterThan(0);
        expect(solved.children + solved.men + solved.women).toBe(solved.total);
        expect(solved.worlds.length).toBeGreaterThan(0);
        for (const [n, d] of solved.fractions) {
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThan(d);
          expect(d).toBeLessThanOrEqual(12);
        }
        expect(q.choices).toHaveLength(9);
        expect(new Set(q.choices).size).toBe(9);
        for (const choice of q.choices ?? []) {
          expect(correctAnswer(q, choice)).toBe(choice === solved.expected);
        }
        if (solved.second === 'Impossible to tell') {
          expect(solved.worlds.some(world => world.girls > solved.men)).toBe(true);
          expect(solved.worlds.some(world => world.girls > 0 && world.girls < solved.men)).toBe(true);
        } else {
          expect(solved.worlds.every(world => world.girls <= solved.men)).toBe(true);
        }
        if (solved.children === 2 * solved.men) {
          equalityBoundarySeen = true;
          expect(solved.second).toBe('False');
          expect(solved.worlds.every(world => world.girls < solved.men)).toBe(true);
        }
      }
    }
  }
  expect([...variants].sort()).toEqual(['comparisons', 'difference', 'removals']);
  expect(comparisonAnswers).toEqual(new Set([
    '(a) True; (b) False',
    '(a) False; (b) False',
    '(a) True; (b) Impossible to tell',
    '(a) False; (b) Impossible to tell',
  ]));
  expect(equalityBoundarySeen).toBe(true);
  expect(visibleQuestions.size).toBeGreaterThan(200);
});

test('retains deterministic questions and distinct session keys', () => {
  for (const seed of [-2147483648, -3, 0, 1, 97, 2147483647]) {
    for (const index of [0, 1, 5, 23]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  const session = Array.from({length: 18}, (_, index) => makeRagQuestion(73, index));
  expect(new Set(session.map(q => q.key)).size).toBe(session.length);
});

test('declares the requested family and supported curriculum skills', () => {
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-fractional-partition-and-complements');
  const allowedSkills = new Set(['P5.S.FRAC.05', 'P4.S.FRAC.04', 'P3.S.FRAC.03']);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for (const id of RAG_PATTERN.skillIds) expect(allowedSkills.has(id)).toBe(true);
});
