import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4LocateAndValueDecimalDigits';

function captures(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Could not read the givens in ${text}`);
  return match.slice(1);
}

// A digit just left of the point has exponent 0. Each move right lowers it by 1.
function exponentOf(decimal: string, digit: string): number {
  const written = decimal.replace('.', '');
  expect([...written].filter(character => character === digit)).toHaveLength(1);
  return decimal.indexOf('.') - 1 - written.indexOf(digit);
}

const placeByExponent: Record<number, string> = {
  1: 'tens', 0: 'ones', [-1]: 'tenths', [-2]: 'hundredths', [-3]: 'thousandths',
};

function solveVisible(q: Question): { kind: string; answer: string } {
  const display = q.display ?? '';
  if (display.includes('×')) {
    const [factor, multiplier] = captures(display, /^(\d+\.\d{2}) × ([2-9])$/);
    const [target] = captures(q.prompt, /^How much is the digit (\d) worth in the product\?$/);
    const product = (Number(factor) * Number(multiplier)).toFixed(2);
    const place = placeByExponent[exponentOf(product, target)];
    expect(['tens', 'ones', 'tenths', 'hundredths']).toContain(place);
    const label = target === '1' ? place.slice(0, -1) : place;
    return { kind: 'product', answer: `${target} ${label}` };
  }
  if (q.prompt.startsWith('How much greater')) {
    expect(display).toMatch(/^\d{2}\.\d{2}$/);
    const [first, second] = captures(q.prompt, /^How much greater is the value of the digit (\d) than the value of the digit (\d)\?$/);
    const firstValue = Number(first) * 10 ** exponentOf(display, first);
    const secondValue = Number(second) * 10 ** exponentOf(display, second);
    expect(firstValue).toBeGreaterThan(secondValue);
    return { kind: 'difference', answer: String(Number((firstValue - secondValue).toFixed(2))) };
  }
  const [, fraction] = captures(display, /^(\d)\.(\d{3})$/);
  if (q.prompt.startsWith('Which digit')) {
    const [place] = captures(q.prompt, /^Which digit is in the (tenths|hundredths|thousandths) place\?$/);
    const offset = ['tenths', 'hundredths', 'thousandths'].indexOf(place);
    return { kind: 'read', answer: fraction[offset] };
  }
  const [target] = captures(q.prompt, /^Which place does the digit (\d) occupy\?$/);
  return { kind: 'name', answer: placeByExponent[exponentOf(display, target)] };
}

it('solves every variant from the displayed number or multiplication and the pupil prompt', () => {
  for (let seed = -16; seed < 48; seed++) {
    const kinds = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(q);
      kinds.add(solved.kind);
      const options = q.choices ?? [];
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter(option => option === solved.answer)).toHaveLength(1);
      expect(q.answer).toBe(solved.answer);
      if (solved.kind === 'difference') expect(new Set(options.map(Number)).size).toBe(4);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect([...kinds].sort()).toEqual(['difference', 'name', 'product', 'read']);
  }
});

it('reproduces a question and its choice order from its seed and index', () => {
  for (let index = 0; index < 8; index++) {
    expect(makeRagQuestion(271, index)).toEqual(makeRagQuestion(271, index));
  }
  expect(makeRagQuestion(271)).toEqual(makeRagQuestion(271, 0));
});
