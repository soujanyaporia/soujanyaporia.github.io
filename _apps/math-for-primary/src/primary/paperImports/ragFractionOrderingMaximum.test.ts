import {expect, test} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragFractionOrderingMaximum';

type VisibleFraction = {label: string; n: number; d: number; mixed: boolean; part: number};
type VisibleQuestion = {prompt: string; display?: string};

function parseFraction(text: string): VisibleFraction {
  const label = text.trim();
  const match = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(label);
  if (!match) throw new Error(`Invalid visible fraction: ${label}`);
  const whole = Number(match[1] ?? 0);
  const part = Number(match[2]);
  const d = Number(match[3]);
  if (d <= 0) throw new Error('A visible denominator must be positive');
  return {label, n: whole * d + part, d, mixed: match[1] !== undefined, part};
}

function compare(a: VisibleFraction, b: VisibleFraction): number {
  return a.n * b.d - b.n * a.d;
}

// Read only the displayed numbers and instruction. No answer, key, metadata or
// generation parameters are used to solve the question.
function solveVisible(q: VisibleQuestion) {
  if (!q.display) throw new Error('Missing visible givens');
  const values = q.display.split(', ').map(parseFraction);
  let mode: 'ascending' | 'descending' | 'largest';
  if (q.prompt.includes('from least to greatest')) mode = 'ascending';
  else if (q.prompt.includes('from greatest to least')) mode = 'descending';
  else if (q.prompt === 'Which of these numbers has the greatest value?') mode = 'largest';
  else throw new Error(`Unknown instruction: ${q.prompt}`);
  // Exact cross-products provide a solver independent of the generator's
  // common-denominator construction and scaled-numerator comparison.
  const ranked = [...values].sort(compare);
  if (mode !== 'ascending') ranked.reverse();
  const expected = mode === 'largest' ? ranked[0]!.label : ranked.map(value => value.label).join(', ');
  return {values, mode, expected};
}

function isValidChoice(choice: string, visible: ReturnType<typeof solveVisible>): boolean {
  const row = choice.split(', ').map(parseFraction);
  if (visible.mode === 'largest') {
    return row.length === 1 && visible.values.every(value => compare(row[0]!, value) >= 0);
  }
  if (row.length !== visible.values.length) return false;
  if (row.map(value => value.label).sort().join('|') !== visible.values.map(value => value.label).sort().join('|')) return false;
  return row.slice(1).every((value, i) => visible.mode === 'ascending'
    ? compare(row[i]!, value) < 0
    : compare(row[i]!, value) > 0);
}

test('independently solves visible givens and checks all variants across varied seeds', () => {
  const coverage = new Set<string>();
  const displays = new Set<string>();
  const correctPositions = new Set<number>();
  for (let s = 0; s < 128; s++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(s * 97 - 4301, index);
      const visible = solveVisible({prompt: q.prompt, display: q.display});
      expect(visible.values).toHaveLength(visible.mode === 'largest' ? 4 : 3);
      expect(q.answer).toBe(visible.expected);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices!.filter(choice => isValidChoice(choice, visible))).toEqual([visible.expected]);
      correctPositions.add(q.choices!.indexOf(visible.expected));
      displays.add(`${q.prompt}|${q.display}`);

      const labels = visible.values.map(value => value.label).sort();
      for (const choice of q.choices!) {
        if (visible.mode === 'largest') {
          expect(labels).toContain(choice);
        } else {
          expect(choice.split(', ').sort()).toEqual(labels);
        }
      }
      for (const value of visible.values) {
        expect(value.d).toBeGreaterThanOrEqual(2);
        expect(value.d).toBeLessThanOrEqual(12);
        expect(value.n).toBeGreaterThan(0);
        expect(value.n).toBeLessThan(4 * value.d);
        if (value.mixed) {
          expect(value.part).toBeGreaterThan(0);
          expect(value.part).toBeLessThan(value.d);
        }
      }
      expect(new Set(visible.values.map(value => value.d)).size).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < visible.values.length; i++) {
        for (let j = i + 1; j < visible.values.length; j++) {
          expect(compare(visible.values[i]!, visible.values[j]!)).not.toBe(0);
        }
      }
      const boundedCommonMultiple = Array.from({length: 120}, (_, i) => i + 1)
        .find(candidate => visible.values.every(value => candidate % value.d === 0));
      expect(boundedCommonMultiple).toBeDefined();
      const allProper = visible.values.every(value => value.n < value.d);
      const crossesOne = visible.values.some(value => value.n < value.d) && visible.values.some(value => value.n > value.d);
      const profile = allProper ? 'proper' : crossesOne ? 'across-one' : 'same-whole';
      coverage.add(`${visible.mode}:${profile}`);
      if (!allProper) {
        expect(visible.values.some(value => value.mixed)).toBe(true);
        expect(visible.values.some(value => !value.mixed && value.n > value.d)).toBe(true);
      }
      if (profile === 'same-whole') {
        expect(new Set(visible.values.map(value => Math.floor(value.n / value.d))).size).toBe(1);
      }
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
    }
  }
  for (const mode of ['ascending', 'descending', 'largest']) {
    for (const profile of ['proper', 'across-one', 'same-whole']) {
      expect(coverage.has(`${mode}:${profile}`)).toBe(true);
    }
  }
  expect(displays.size).toBeGreaterThan(100);
  expect(correctPositions.size).toBe(4);
});

test('worked equivalent fractions and comparison chains are true for the visible numbers', () => {
  for (let seed = 0; seed < 96; seed++) {
    const q = makeRagQuestion(seed * 101, seed % 7);
    const visible = solveVisible({prompt: q.prompt, display: q.display});
    const commonStep = q.workedSteps?.find(step => /^Use \d+ as a common denominator\.$/.test(step.text));
    if (!commonStep?.equation) throw new Error('Missing common-denominator working');
    const common = Number(/^Use (\d+)/.exec(commonStep.text)![1]);
    expect(common).toBeGreaterThan(0);
    expect(common).toBeLessThanOrEqual(120);
    const equations = commonStep.equation.split('; ');
    expect(equations).toHaveLength(visible.values.length);
    const leftLabels: string[] = [];
    for (const equation of equations) {
      const sides = equation.split(' = ');
      expect(sides).toHaveLength(2);
      const left = parseFraction(sides[0]!);
      const right = parseFraction(sides[1]!);
      leftLabels.push(left.label);
      expect(right.d).toBe(common);
      expect(compare(left, right)).toBe(0);
    }
    expect(leftLabels.sort()).toEqual(visible.values.map(value => value.label).sort());

    const comparison = q.workedSteps?.find(step => step.text.startsWith('The denominators match'));
    if (!comparison?.equation) throw new Error('Missing comparison working');
    const chain = comparison.equation.split(/ [<>] /).map(parseFraction);
    const signs = comparison.equation.match(/ [<>] /g) ?? [];
    expect(chain).toHaveLength(visible.values.length);
    expect(signs).toHaveLength(chain.length - 1);
    expect(signs.every(sign => sign === (visible.mode === 'ascending' ? ' < ' : ' > '))).toBe(true);
    for (const value of chain) {
      expect(value.d).toBe(common);
      expect(visible.values.filter(given => compare(given, value) === 0)).toHaveLength(1);
    }
    for (let i = 1; i < chain.length; i++) {
      const difference = compare(chain[i - 1]!, chain[i]!);
      if (visible.mode === 'ascending') expect(difference).toBeLessThan(0);
      else expect(difference).toBeGreaterThan(0);
    }
  }
});

test('metadata is valid and generation is reproducible without shared mutable choices', () => {
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('fraction-ordering-and-maximum');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const allowedSkills = new Set(['P3.S.FRAC.01', 'P3.S.FRAC.03', 'P4.S.FRAC.01', 'P4.S.FRAC.02']);
  expect(RAG_PATTERN.skillIds.every(id => allowedSkills.has(id))).toBe(true);
  for (const seed of [-2147483648, -1, 0, 17, 2147483647, 4294967295]) {
    for (const index of [0, 1, 7, 23]) {
      const q = makeRagQuestion(seed, index);
      const snapshot = JSON.stringify(q);
      makeRagQuestion(seed + 1, index + 1);
      expect(JSON.stringify(makeRagQuestion(seed, index))).toBe(snapshot);
      q.choices!.reverse();
      expect(JSON.stringify(makeRagQuestion(seed, index))).toBe(snapshot);
    }
  }
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
});
