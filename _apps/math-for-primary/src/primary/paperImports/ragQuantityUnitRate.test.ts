import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragQuantityUnitRate';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Solution = {kind: 'measured' | 'packs' | 'floor'; answers: string[]};

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const found = pattern.exec(text);
  if (!found) throw new Error(`Missing visible given: ${pattern}`);
  return found;
}

function readCents(text: string): number {
  const found = capture(text, /^(\d+)\.(\d{2})$/);
  return Number(found[1]) * 100 + Number(found[2]);
}

function centsText(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Cost is not an exact non-negative cent amount');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

// Only the displayed context and prompt are available to this solver.
// It cannot read the answer, worked solution, random state or generation parameters.
function solveVisible(q: VisibleQuestion): Solution {
  const text = (q.context ?? []).join(' ');
  if (text.includes('bags of rice each day')) {
    const bags = Number(capture(text, /uses (\d+) bags of rice each day\./)[1]);
    const mass = capture(text, /Each bag holds (\d+) (\d+)\/(\d+) kg of rice\./);
    const whole = Number(mass[1]);
    const numerator = Number(mass[2]);
    const denominator = Number(mass[3]);
    const rate = readCents(capture(text, /Rice costs \$(\d+\.\d{2}) for 1 kg\./)[1]);
    expect(q.prompt).toContain('one day');
    expect(bags).toBeGreaterThan(1);
    expect(bags).toBeLessThanOrEqual(9);
    expect(whole).toBeGreaterThan(0);
    expect(whole).toBeLessThanOrEqual(4);
    expect([2, 4]).toContain(denominator);
    expect(numerator).toBeGreaterThan(0);
    expect(numerator).toBeLessThan(denominator);
    expect(rate).toBeGreaterThan(0);
    // Price one bag by separating its whole and fractional kilograms,
    // then add that price once for each bag.
    const oneBagCents = whole * rate + numerator * rate / denominator;
    expect(Number.isInteger(oneBagCents)).toBe(true);
    let cost = 0;
    for (let bag = 0; bag < bags; bag += 1) cost += oneBagCents;
    return {kind: 'measured', answers: [centsText(cost)]};
  }

  if (text.includes('Erasers come in packs')) {
    const eraserPack = Number(capture(text, /Erasers come in packs of (\d+)\./)[1]);
    const pencilPack = Number(capture(text, /Pencils come in packs of (\d+)\./)[1]);
    const purchase = capture(text, /buys (\d+) pencils in complete packs and pays \$(\d+\.\d{2}) altogether\./);
    const pencils = Number(purchase[1]);
    const paid = readCents(purchase[2]);
    expect(text).toContain('Each pack of erasers costs the same as each pack of pencils.');
    expect(q.prompt).toBe('How much does one pack of erasers cost?');
    expect(eraserPack).toBeGreaterThan(1);
    expect(pencilPack).toBeGreaterThan(1);
    expect(eraserPack).not.toBe(pencilPack);
    expect(pencils % pencilPack).toBe(0);
    expect(pencils / pencilPack).toBeGreaterThanOrEqual(2);
    expect(pencils / pencilPack).toBeLessThanOrEqual(9);
    expect(paid).toBeGreaterThan(0);
    // A pack accounts for pencilPack/pencils of the entire payment.
    return {kind: 'packs', answers: [centsText(paid * pencilPack / pencils)]};
  }

  expect(text).toContain('A rectangular room');
  expect(text).toContain('They share a full side of the square and together make the whole room.');
  expect(q.prompt).toContain('(a) What is the perimeter');
  expect(q.prompt).toContain('(b) How much does it cost');
  const squareArea = Number(capture(text, /square section has an area of (\d+) m²\./)[1]);
  const multiple = Number(capture(text, /rectangular section has (\d+) times the area of the square\./)[1]);
  const rate = readCents(capture(text, /Covering the floor costs \$(\d+\.\d{2}) for each 1 m²\./)[1]);
  expect(squareArea).toBeGreaterThan(0);
  expect(squareArea).toBeLessThanOrEqual(100);
  expect(multiple).toBeGreaterThan(1);
  expect(rate).toBeGreaterThan(0);
  // Recover the width from the displayed area by trying equal factors.
  let width = 1;
  while (width * width < squareArea) width += 1;
  expect(width * width).toBe(squareArea);
  const wholeArea = squareArea * (multiple + 1);
  const wholeLength = wholeArea / width;
  const perimeter = 2 * wholeLength + 2 * width;
  return {kind: 'floor', answers: [String(perimeter), centsText(wholeArea * rate)]};
}

describe('quantity and unit-rate conversion candidate', () => {
  it('has the required family metadata and curriculum skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-quantity-and-unit-rate-conversion');
    const allowed = new Set(['P5.S.RATE.02', 'P5.S.FRAC.07', 'P4.S.DEC.06', 'P5.S.AREA.03']);
    for (const skill of RAG_PATTERN.skillIds) expect(allowed.has(skill)).toBe(true);
  });

  it('independently solves every generated response from visible givens across varied seeds', () => {
    const seeds = [...Array.from({length: 64}, (_, i) => i - 32), -2147483648, 2147483647, Number.MAX_SAFE_INTEGER];
    const kinds = new Set<string>();
    const keys = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 9; index += 1) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(q);
        kinds.add(expected.kind);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        const actual: unknown = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
        expect(actual).toEqual(expected.answers);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps?.every(step => step.text.trim().length > 0)).toBe(true);
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        if (expected.kind === 'floor') {
          expect(q.structuredResponse).toEqual({
            kind: 'number-fields',
            fields: [{label: '(a) Perimeter (m)'}, {label: '(b) Covering cost ($)', decimal: true}],
          });
          expect(q.unit).toBeUndefined();
          expect(expected.answers[0]).toMatch(/^\d+$/);
          expect(expected.answers[1]).toMatch(/^\d+\.\d{2}$/);
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['floor', 'measured', 'packs']);
  });

  it('checks the independent solver against three hand-calculated examples', () => {
    expect(solveVisible({
      context: [
        'A school kitchen uses 6 bags of rice each day.',
        'Each bag holds 2 1/4 kg of rice.',
        'Rice costs $4.80 for 1 kg.',
      ],
      prompt: 'How much does the rice used in one day cost?',
    }).answers).toEqual(['64.80']);
    expect(solveVisible({
      context: [
        'Erasers come in packs of 5. Pencils come in packs of 8.',
        'Each pack of erasers costs the same as each pack of pencils.',
        'Farah buys 56 pencils in complete packs and pays $36.75 altogether.',
      ],
      prompt: 'How much does one pack of erasers cost?',
    }).answers).toEqual(['5.25']);
    expect(solveVisible({
      context: [
        'A rectangular room has a square section and a rectangular section. They share a full side of the square and together make the whole room.',
        'The square section has an area of 25 m².',
        'The rectangular section has 3 times the area of the square.',
        'Covering the floor costs $18.00 for each 1 m².',
      ],
      prompt: '(a) What is the perimeter of the room in metres? (b) How much does it cost to cover the whole floor?',
    }).answers).toEqual(['50', '1800.00']);
  });

  it('is repeatable and presents all three variants over consecutive indices', () => {
    for (const seed of [-2147483648, -7, 0, 18, 2026, Number.MAX_SAFE_INTEGER]) {
      const first = makeRagQuestion(seed);
      makeRagQuestion(seed + 1, 11);
      expect(makeRagQuestion(seed, 0)).toEqual(first);
      expect(new Set([0, 1, 2].map(index => solveVisible(makeRagQuestion(seed, index)).kind)).size).toBe(3);
      expect(new Set([-3, -2, -1].map(index => solveVisible(makeRagQuestion(seed, index)).kind)).size).toBe(3);
    }
  });

  it('does not let stored answers or worked steps influence the independent solver', () => {
    for (let index = 0; index < 3; index += 1) {
      const q = makeRagQuestion(43, index);
      const altered = {...q, answer: '999999', hint: '', explanation: '', workedSteps: []};
      expect(solveVisible(altered)).toEqual(solveVisible(q));
    }
  });

  it('keeps an equal pack price independent of the target pack size', () => {
    const context = [
      'Erasers come in packs of 5. Pencils come in packs of 8.',
      'Each pack of erasers costs the same as each pack of pencils.',
      'Farah buys 56 pencils in complete packs and pays $36.75 altogether.',
    ];
    const prompt = 'How much does one pack of erasers cost?';
    const changed = context.map(line => line.replace('Erasers come in packs of 5.', 'Erasers come in packs of 2.'));
    expect(solveVisible({context, prompt}).answers).toEqual(['5.25']);
    expect(solveVisible({context: changed, prompt}).answers).toEqual(['5.25']);
  });
});
