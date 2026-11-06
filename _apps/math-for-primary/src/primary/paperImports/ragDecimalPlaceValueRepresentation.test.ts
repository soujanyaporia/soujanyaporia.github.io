import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragDecimalPlaceValueRepresentation';

// The oracle receives only text shown to the pupil, never answers or generation parameters.
type Visible = {prompt: string; display?: string};
const units: Record<string, number> = {
  thousands: 1000000, hundreds: 100000, tens: 10000, ones: 1000,
  tenths: 100, hundredths: 10, thousandths: 1,
};
const decimalNames = ['tenths', 'hundredths', 'thousandths'];

function readParts(text: string): {known: number; blanks: number[]} {
  let known = 0;
  const blanks: number[] = [];
  for (const term of text.split(' + ')) {
    const match = /^(\d|□) (thousands|hundreds|tens|ones|tenths|hundredths|thousandths)$/.exec(term);
    if (!match) throw new Error(`Unrecognised visible part: ${term}`);
    const scale = units[match[2]];
    if (match[1] === '□') blanks.push(scale);
    else known += Number(match[1]) * scale;
  }
  return {known, blanks};
}

function readDecimal(text: string): number {
  const match = /^(\d+)\.(\d{1,3})$/.exec(text);
  if (!match) throw new Error(`Expected a visible decimal: ${text}`);
  return Number(match[1]) * 1000 + Number(match[2].padEnd(3, '0'));
}

function solveVisible(q: Visible): string {
  if (!q.display) throw new Error('Missing visible givens');
  if (q.prompt === 'Write the decimal formed by these place-value parts.') {
    const parts = readParts(q.display);
    if (parts.blanks.length) throw new Error('Composition has an unknown part');
    return String(parts.known / 1000);
  }
  const digitRequest = /What digit is in the (tenths|hundredths|thousandths) place\?/.exec(q.prompt);
  if (digitRequest) {
    readDecimal(q.display);
    return q.display.split('.')[1][decimalNames.indexOf(digitRequest[1])];
  }
  const nameRequest = /Which decimal place contains the digit (\d)\?/.exec(q.prompt);
  if (nameRequest) {
    readDecimal(q.display);
    const target = nameRequest[1];
    if (q.display.replace('.', '').split('').filter(d => d === target).length !== 1) {
      throw new Error('The named digit is ambiguous');
    }
    const position = q.display.split('.')[1].indexOf(target);
    if (position < 0) throw new Error('Target is outside the decimal places');
    return decimalNames[position];
  }
  if (q.prompt === 'Find the number for □ so that the two sides are equal.') {
    const sides = q.display.split(' = ');
    if (sides.length !== 2) throw new Error('Expected two visible sides');
    const parts = readParts(sides[1]);
    if (parts.blanks.length !== 1) throw new Error('Expected exactly one missing component');
    const count = (readDecimal(sides[0]) - parts.known) / parts.blanks[0];
    if (!Number.isInteger(count) || count < 0 || count > 9) throw new Error('Missing count is not a digit');
    return String(count);
  }
  throw new Error(`Unknown prompt: ${q.prompt}`);
}

function visible(q: Visible): Visible {
  return {prompt: q.prompt, display: q.display};
}

function kind(q: Visible): string {
  if (q.prompt.startsWith('Write the decimal')) return 'compose';
  if (q.prompt.startsWith('Read this decimal')) return 'digit';
  if (q.prompt.startsWith('Which decimal place')) return 'name';
  if (q.prompt.startsWith('Find the number for')) return 'missing';
  throw new Error('Unexpected question variant');
}

describe('decimal place-value representation candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    const examples: Array<[Visible, string]> = [
      [{prompt: 'Write the decimal formed by these place-value parts.', display: '4 thousands + 6 hundreds + 3 ones + 8 hundredths'}, '4603.08'],
      [{prompt: 'Read this decimal. What digit is in the hundredths place?', display: '245.907'}, '0'],
      [{prompt: 'Read this decimal. What digit is in the hundredths place?', display: '279.684'}, '8'],
      [{prompt: 'Which decimal place contains the digit 7? Write tenths, hundredths or thousandths.', display: '245.907'}, 'thousandths'],
      [{prompt: 'Find the number for □ so that the two sides are equal.', display: '274.603 = 2 hundreds + 7 tens + 4 ones + 6 tenths + □ hundredths + 3 thousandths'}, '0'],
      [{prompt: 'Find the number for □ so that the two sides are equal.', display: '274.653 = 2 hundreds + 7 tens + 4 ones + 6 tenths + □ hundredths + 3 thousandths'}, '5'],
    ];
    for (const [givens, expected] of examples) expect(solveVisible(givens)).toBe(expected);
  });

  it('solves generated questions solely from visible givens across varied seeds and indices', () => {
    const seen = new Set<string>();
    const seeds = [-4096, -41, -1, 0, 1, 2, 3, 7, 42, 2026, 99991, 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 24; index++) {
        const q = makeRagQuestion(seed, index);
        expect(q.answer).toBe(solveVisible(visible(q)));
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBeUndefined();
        seen.add(kind(q));
      }
    }
    expect([...seen].sort()).toEqual(['compose', 'digit', 'missing', 'name']);
  });

  it('preserves placeholder zeros, unique named digits and single-digit component answers', () => {
    const zeroCases = new Set<string>();
    const namedPlaces = new Set<string>();
    for (let seed = 0; seed < 512; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const variant = kind(q);
        expect(q.answer).toBe(solveVisible(visible(q)));
        if (variant === 'compose') {
          expect(q.answer).toMatch(/^[2-6]\d{3}\.\d{1,3}$/);
          const wholePlaces = ['hundreds', 'tens', 'ones'];
          expect(wholePlaces.filter(p => !q.display!.split(' + ').some(term => term.endsWith(` ${p}`)))).toHaveLength(1);
        } else {
          const displayedNumber = q.display!.split(' = ')[0];
          expect(displayedNumber).toMatch(/^[2-5]\d{2}\.\d{3}$/);
        }
        if (variant === 'digit' || variant === 'missing') {
          expect(q.answer).toMatch(/^\d$/);
          if (q.answer === '0') zeroCases.add(variant);
        }
        if (variant === 'name') {
          namedPlaces.add(solveVisible(visible(q)));
          const target = /contains the digit (\d)/.exec(q.prompt)![1];
          expect(q.display!.split('').filter(d => d === target)).toHaveLength(1);
        }
      }
    }
    expect([...zeroCases].sort()).toEqual(['digit', 'missing']);
    expect([...namedPlaces].sort()).toEqual(['hundredths', 'tenths', 'thousandths']);
  });

  it('is deterministic and presents all four variants over consecutive indices', () => {
    for (const seed of [-17, 0, 23, 500]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        kinds.add(kind(q));
        keys.add(q.key);
      }
      expect(kinds.size).toBe(4);
      expect(keys.size).toBe(4);
    }
  });

  it('declares the requested level and the provided decimal-place-value prerequisite', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('decimal-place-value-representation');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.DEC.01']);
  });
});
