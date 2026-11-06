import {expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragWholeFromFractionalDifference';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Kind = 'spending' | 'equal-starts' | 'first-final';
type Solution = {
  kind: Kind;
  answers: string[];
  fractions: number[];
  amounts: number[];
  whole: number;
  difference: number;
};

function requireMatch(text: string, pattern: RegExp): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error('An essential visible given is missing.');
  return match;
}

// This solver receives only pupil-visible text. It enumerates possible whole
// quantities and performs the stated allocations; it does not use generator
// tables, unit calculations, worked solutions, keys or stored answers.
function solveVisible(visible: Visible): Solution {
  const text = [...(visible.context ?? []), visible.prompt].join('\n');
  const fractions = [...text.matchAll(/\b(\d+)\/(\d+)\b/g)].flatMap(match => [Number(match[1]), Number(match[2])]);
  if (fractions.length !== 4) throw new Error('Expected two visible fractions.');
  const [a, b, c, d] = fractions;
  if (!(a > 0 && a < b && c > 0 && c < d)) throw new Error('Fractions must be proper and positive.');

  let kind: Kind;
  let difference: number;
  if (text.includes('on a bag')) {
    kind = 'spending';
    const match = requireMatch(text, /The bag costs \$(\d+)\.(\d{2}) more than the book\./);
    difference = Number(match[1]) * 100 + Number(match[2]);
  } else if (text.includes('orange buttons')) {
    kind = 'equal-starts';
    requireMatch(text, /same number of orange buttons and purple buttons/);
    difference = Number(requireMatch(text, /There are (\d+) more orange buttons than purple buttons left\./)[1]);
  } else {
    kind = 'first-final';
    requireMatch(text, /only red, blue and green beads/);
    requireMatch(text, /of the beads that are not red are blue\. The rest are green/);
    difference = Number(requireMatch(text, /There are (\d+) more red beads than green beads\./)[1]);
  }

  const matches: {whole: number; first: number; second: number; last: number}[] = [];
  const limit = kind === 'spending' ? 100000 : 5000;
  // Money is enumerated in cents; objects are enumerated as whole items.
  for (let whole = 1; whole <= limit; whole++) {
    if ((whole * a) % b !== 0) continue;
    const firstAllocation = whole * a / b;
    if (kind === 'equal-starts') {
      if ((whole * c) % d !== 0) continue;
      const firstLeft = whole - firstAllocation;
      const secondLeft = whole - whole * c / d;
      if (firstLeft > 0 && secondLeft > 0 && firstLeft - secondLeft === difference) {
        matches.push({whole, first: firstLeft, second: secondLeft, last: 0});
      }
    } else {
      const remaining = whole - firstAllocation;
      if ((remaining * c) % d !== 0) continue;
      const second = remaining * c / d;
      const last = remaining - second;
      const compared = kind === 'spending' ? second : last;
      if (second > 0 && last > 0 && firstAllocation - compared === difference) {
        matches.push({whole, first: firstAllocation, second, last});
      }
    }
  }
  if (matches.length !== 1) throw new Error(`Expected one solution, found ${matches.length}.`);
  const result = matches[0];
  const answers = kind === 'spending'
    ? [(result.first / 100).toFixed(2), (result.whole / 100).toFixed(2)]
    : [String(kind === 'equal-starts' ? 2 * result.whole : result.whole)];
  return {
    kind,
    answers,
    fractions,
    amounts: kind === 'equal-starts' ? [result.first, result.second] : [result.first, result.second, result.last],
    whole: result.whole,
    difference,
  };
}

const visibleOf = (q: Question): Visible => ({prompt: q.prompt, context: q.context});

test('independently solves all three variants from visible givens across varied seeds', () => {
  const seeds = [-2147483648, -101, -1, ...Array.from({length: 80}, (_, i) => i), 2147483647, 4294967295];
  const seen = new Map<Kind, Set<string>>();
  for (const seed of seeds) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(visibleOf(q));
      const signatures = seen.get(solved.kind) ?? new Set<string>();
      signatures.add(JSON.stringify(visibleOf(q)));
      seen.set(solved.kind, signatures);
      const [a, b, c, d] = solved.fractions;
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThan(b);
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(d);
      expect(b).toBeLessThanOrEqual(12);
      expect(d).toBeLessThanOrEqual(12);
      expect(solved.difference).toBeGreaterThan(0);
      expect(solved.amounts.every(value => Number.isInteger(value) && value > 0)).toBe(true);
      expect(q.picture).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
      expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.explanation.length).toBeGreaterThan(100);

      if (solved.kind === 'spending') {
        expect(q.prompt).toContain('(a)');
        expect(q.prompt).toContain('(b)');
        expect(q.unit).toBe('dollars');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toEqual({
          kind: 'number-fields',
          fields: [
            {label: '(a) Bag cost ($)', decimal: true},
            {label: '(b) Starting money ($)', decimal: true},
          ],
        });
        expect(solved.whole % 100).toBe(0);
        expect(solved.amounts.every(value => value % 100 === 0)).toBe(true);
        expect(solved.difference).not.toBe(3600);
        const expected = JSON.stringify(solved.answers);
        expect(q.answer).toBe(expected);
        expect(structuredResponseReady(q.structuredResponse!, expected)).toBe(true);
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, expected)).toBe(true);
        const swapped = JSON.stringify([...solved.answers].reverse());
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, swapped)).toBe(false);
        const wrong = JSON.stringify([String(Number(solved.answers[0]) + 1), solved.answers[1]]);
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, wrong)).toBe(false);
      } else {
        expect(q.answer).toBe(solved.answers[0]);
        expect(q.structuredResponse).toBeUndefined();
        if (solved.kind === 'equal-starts') {
          expect(q.unit).toBe('buttons');
          expect(solved.difference).not.toBe(72);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.every(choice => Number.isInteger(Number(choice)) && Number(choice) > 0)).toBe(true);
          expect(q.choices!.filter(choice => choice === solved.answers[0])).toHaveLength(1);
          expect(q.choices).toContain(String(solved.whole));
        } else {
          expect(q.unit).toBe('beads');
          expect(q.choices).toBeUndefined();
          expect(solved.difference).not.toBe(133);
          expect(solved.amounts.reduce((sum, amount) => sum + amount, 0)).toBe(solved.whole);
        }
      }
    }
  }
  expect([...seen.keys()].sort()).toEqual(['equal-starts', 'first-final', 'spending']);
  for (const signatures of seen.values()) expect(signatures.size).toBeGreaterThan(15);
});

test('the independent solver responds to changed visible differences and rejects missing givens', () => {
  for (let index = 0; index < 3; index++) {
    const q = makeRagQuestion(617, index);
    const visible = visibleOf(q);
    const original = solveVisible(visible);
    const changed: Visible = {
      prompt: visible.prompt,
      context: visible.context!.map(line => original.kind === 'spending'
        ? line.replace(/\$(\d+\.\d{2})( more than)/, (_match, amount: string, suffix: string) => `$${(Number(amount) * 2).toFixed(2)}${suffix}`)
        : line.replace(/There are (\d+) more/, (_match, amount: string) => `There are ${Number(amount) * 2} more`)),
    };
    const doubled = solveVisible(changed);
    expect(doubled.answers).toEqual(original.answers.map(answer => original.kind === 'spending'
      ? (Number(answer) * 2).toFixed(2)
      : String(Number(answer) * 2)));
    expect(() => solveVisible({
      prompt: visible.prompt,
      context: visible.context!.filter(line => !line.includes(' more ')),
    })).toThrow();
  }
});

test('metadata is scoped to P5 and generation is deterministic with three task variants', () => {
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('whole-from-fractional-difference');
  const allowedSkills = new Set(['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P4.S.FRAC.04']);
  expect(RAG_PATTERN.skillIds.every(id => allowedSkills.has(id))).toBe(true);
  for (const seed of [-19, 0, 31, 9001]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    const kinds = new Set<Kind>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q).toEqual(makeRagQuestion(seed, index));
      kinds.add(solveVisible(visibleOf(q)).kind);
    }
    expect(kinds.size).toBe(3);
    expect(makeRagQuestion(seed, -1)).toEqual(makeRagQuestion(seed, -1));
  }
});
