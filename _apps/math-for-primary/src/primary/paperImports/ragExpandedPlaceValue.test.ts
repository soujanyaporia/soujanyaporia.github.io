import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragExpandedPlaceValue';

type Visible = Pick<Question, 'display' | 'choices'>;
const clean = (text: string): string => text.replace(/[,\s]/g, '');

// Independent arithmetic reader: only displayed numbers and operators are inputs.
function value(text: string): number {
  const source = clean(text);
  const tokens = source.match(/\d+|[+−×÷]/g) ?? [];
  if (!tokens.length || tokens.join('') !== source) throw new Error(`Invalid arithmetic: ${text}`);
  let at = 0;
  const number = (): number => {
    const token = tokens[at++];
    if (!token || !/^\d+$/.test(token)) throw new Error('Expected a visible whole number');
    return Number(token);
  };
  const product = (): number => {
    let result = number();
    while (tokens[at] === '×' || tokens[at] === '÷') {
      const operation = tokens[at++];
      const right = number();
      if (operation === '÷' && right === 0) throw new Error('Division by zero');
      result = operation === '×' ? result * right : result / right;
    }
    return result;
  };
  let result = product();
  while (at < tokens.length) {
    const operation = tokens[at++];
    if (operation !== '+' && operation !== '−') throw new Error('Expected addition or subtraction');
    const right = product();
    result = operation === '+' ? result + right : result - right;
  }
  return result;
}

// The solver cannot access an answer, worked steps, proof or generation parameters.
function solveVisible(q: Visible): string {
  const display = q.display;
  if (!display) throw new Error('Missing visible givens');
  if (!display.includes('=')) {
    const target = value(display);
    const matches = (q.choices ?? []).filter(choice => value(choice) === target);
    if (matches.length !== 1) throw new Error('Expected exactly one matching expansion');
    return matches[0];
  }
  const sides = display.split('=');
  if (sides.length !== 2 || (display.match(/□/g) ?? []).length !== 1) {
    throw new Error('Expected an equation with one box');
  }
  const [left, right] = sides;
  const l0 = value(left.replace('□', '0'));
  const l1 = value(left.replace('□', '1'));
  const r0 = value(right.replace('□', '0'));
  const r1 = value(right.replace('□', '1'));
  const slope = (l1 - l0) - (r1 - r0);
  if (slope === 0) throw new Error('The box has no unique solution');
  const solution = (r0 - l0) / slope;
  if (!Number.isSafeInteger(solution) || solution < 0) throw new Error('Expected a whole-number solution');
  return String(solution);
}

function kind(q: Visible): string {
  const display = q.display ?? '';
  if (!display.includes('=')) return 'numeral-to-expansion';
  if (/=\s*□$/.test(display)) return 'expansion-to-numeral';
  if (display.includes('□ ×')) return 'missing-coefficient';
  return 'missing-term';
}

// Build a canonical expansion using repeated division, independently of production helpers.
function canonical(n: number): string {
  const terms: number[] = [];
  let remaining = n;
  let place = 1;
  while (remaining > 0) {
    const digit = remaining % 10;
    if (digit) terms.unshift(digit * place);
    remaining = Math.floor(remaining / 10);
    place *= 10;
  }
  return terms.join('+');
}

const seeds = [
  -2147483648, -1001, -1, 0, 1, 17, 2026, 2147483647, 4294967295,
  Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 80}, (_, i) => 23 + 7919 * i),
];

describe('expanded place-value equations', () => {
  it('checks the independent solver against hand-solved visible examples', () => {
    expect(solveVisible({display: '50,000 + 600 + 2 = □'})).toBe('50602');
    expect(solveVisible({
      display: '302,040',
      choices: ['300,000 + 2,000 + 40', '300,000 + 20,000 + 4', '30,000 + 2,000 + 40', '300,000 + 2,000 + 400'],
    })).toBe('300,000 + 2,000 + 40');
    expect(solveVisible({display: '642,507 = 600,000 + 40,000 + □ + 500 + 7'})).toBe('2000');
    expect(solveVisible({display: '386,428 = □ × 10,000 + 16 × 1,000 + 4 × 100 + 28'})).toBe('37');
  });

  it('solves visible givens and checks every worked equation across varied seeds', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const visible: Visible = {display: q.display, choices: q.choices};
        const solved = solveVisible(visible);
        expect(clean(q.answer), q.key).toBe(clean(solved));
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices.map(clean)).size).toBe(4);
          expect(q.choices.filter(choice => clean(choice) === clean(solved))).toHaveLength(1);
        }
        if (q.display!.includes('=')) {
          const [left, right] = q.display!.split('=');
          expect(value(left.replace('□', solved))).toBe(value(right.replace('□', solved)));
          for (const wrong of [Number(solved) - 1, Number(solved) + 1]) {
            expect(value(left.replace('□', String(wrong)))).not.toBe(value(right.replace('□', String(wrong))));
          }
        }
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        for (const step of q.workedSteps!) {
          expect(step.text.length).toBeGreaterThan(0);
          const sides = step.equation!.split('=');
          expect(sides).toHaveLength(2);
          expect(value(sides[0]), step.equation).toBe(value(sides[1]));
        }
      }
    }
  });

  it('preserves zero places, canonical sums, response forms, bounds and regrouped counts', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const form = kind(q);
        const display = q.display!;
        const solved = solveVisible({display, choices: q.choices});
        const total = form === 'expansion-to-numeral' ? Number(solved) : value(display.split('=')[0]);
        expect(Number.isSafeInteger(total)).toBe(true);
        expect(total).toBeGreaterThanOrEqual(10000);
        expect(total).toBeLessThanOrEqual(10000000);
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        if (form !== 'missing-coefficient') expect(String(total)).toContain('0');

        if (form === 'expansion-to-numeral') {
          expect(clean(display.split('=')[0])).toBe(canonical(total));
          expect(q.choices).toHaveLength(4);
          for (const choice of q.choices!) {
            expect(clean(choice)).toMatch(/^\d+$/);
            expect(value(choice)).toBeGreaterThanOrEqual(10000);
            expect(value(choice)).toBeLessThanOrEqual(10000000);
          }
        } else if (form === 'numeral-to-expansion') {
          expect(clean(solved)).toBe(canonical(total));
          expect(q.choices).toHaveLength(4);
          for (const choice of q.choices!) {
            expect(clean(choice)).toBe(canonical(value(choice)));
            expect(value(choice)).toBeLessThanOrEqual(10000000);
          }
        } else if (form === 'missing-term') {
          expect(q.choices).toBeUndefined();
          expect(solved).toMatch(/^[1-9]0*$/);
          expect(clean(display.split('=')[1].replace('□', solved))).toBe(canonical(total));
        } else {
          expect(q.choices).toBeUndefined();
          const terms = display.split('=')[1].split('+');
          expect(terms).toHaveLength(4);
          const place = value(terms[0].split('×')[1]);
          const lowerCount = value(terms[1].split('×')[0]);
          expect([10000, 100000]).toContain(place);
          expect(lowerCount).toBeGreaterThan(9);
          expect(Number(solved)).toBeGreaterThan(9);
          // A direct reading of the leading place groups must give the wrong answer.
          expect(Math.floor(total / place)).toBeGreaterThan(Number(solved));
        }
      }
    }
  });

  it('is deterministic, varies its visible questions and cycles through all four forms', () => {
    const displays = new Set<string>();
    for (const seed of seeds) {
      const forms = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        forms.add(kind(q));
        keys.add(q.key);
        displays.add(q.display!);
      }
      expect(forms.size).toBe(4);
      expect(keys.size).toBe(4);
    }
    expect(displays.size).toBeGreaterThan(160);
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
    expect(makeRagQuestion(-17, -3)).toEqual(makeRagQuestion(-17, -3));
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('expanded-place-value-equations');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.WN.01', 'P5.S.WN.02']);
    expect(() => makeRagQuestion(NaN)).toThrow(RangeError);
    expect(() => makeRagQuestion(Infinity)).toThrow(RangeError);
    expect(() => makeRagQuestion(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => makeRagQuestion(1, 0.5)).toThrow(RangeError);
  });
});
