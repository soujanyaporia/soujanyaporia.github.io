import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragReadAndCompareDigitPositions';

type Visible = Pick<Question, 'prompt' | 'context' | 'display' | 'choices'>;
type Variant = 'name' | 'one-place' | 'two-places' | 'difference';
interface Solution {
  expected: string;
  variant: Variant;
  numbers: number[];
  positions: number[];
  targetDigits: number[];
  values?: number[];
  matches?: boolean[][];
}
const names = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
const readNumber = (text: string): number => {
  expect(text).toMatch(/^\d{1,3}(?:,\d{3})*$/);
  const value = Number(text.replace(/,/g, ''));
  expect(Number.isSafeInteger(value)).toBe(true);
  return value;
};
const positionOf = (name: string): number => {
  const position = names.indexOf(name);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
};
// Arithmetic extraction is independent of the generator's string indexing.
const readDigit = (number: number, position: number): number => {
  for (let i = 0; i < position; i++) number = Math.floor(number / 10);
  return number % 10;
};
const occurrences = (number: number, digit: number): number[] => {
  const positions: number[] = [];
  let position = 0;
  while (number > 0) {
    if (number % 10 === digit) positions.push(position);
    number = Math.floor(number / 10);
    position++;
  }
  return positions;
};
const solveChoices = (q: Visible, clues: {digit: number; place: string}[]): Solution => {
  const choices = q.choices ?? [];
  expect(choices).toHaveLength(4);
  const numbers = choices.map(readNumber);
  const positions = clues.map(clue => positionOf(clue.place));
  const matches = numbers.map(number => clues.map((clue, i) => readDigit(number, positions[i]!) === clue.digit));
  const valid = choices.filter((_, i) => matches[i]!.every(Boolean));
  expect(valid).toHaveLength(1);
  return {expected: valid[0]!, variant: clues.length === 1 ? 'one-place' : 'two-places', numbers, positions, targetDigits: clues.map(clue => clue.digit), matches};
};

// This solver receives only pupil-visible fields, never answers, proofs or seed parameters.
function solveVisible(q: Visible): Solution {
  let m = /^Which place does the digit (\d) occupy in this number\?$/.exec(q.prompt);
  if (m) {
    const digit = Number(m[1]);
    const number = readNumber(q.display ?? '');
    const positions = occurrences(number, digit);
    expect(positions).toHaveLength(1);
    return {expected: names[positions[0]!]!, variant: 'name', numbers: [number], positions, targetDigits: [digit]};
  }
  m = /^Which number has (\d) in the ([a-z ]+) place and (\d) in the ([a-z ]+) place\?$/.exec(q.prompt);
  if (m) return solveChoices(q, [{digit: Number(m[1]), place: m[2]!}, {digit: Number(m[3]), place: m[4]!}]);
  m = /^Which number has (\d) in the ([a-z ]+) place\?$/.exec(q.prompt);
  if (m) return solveChoices(q, [{digit: Number(m[1]), place: m[2]!}]);
  m = /^How far apart are the values of the digit (\d) in these two numbers\?$/.exec(q.prompt);
  if (m) {
    const digit = Number(m[1]);
    expect(q.context).toHaveLength(2);
    const numbers = ['A', 'B'].map((label, i) => {
      const match = new RegExp(`^Number ${label}: ([\\d,]+)\\.$`).exec(q.context?.[i] ?? '');
      expect(match).not.toBeNull();
      return readNumber(match![1]!);
    });
    const positions = numbers.map(number => {
      const found = occurrences(number, digit);
      expect(found).toHaveLength(1);
      return found[0]!;
    });
    expect(new Set(positions).size).toBe(2);
    const values = positions.map(position => Number(String(digit) + '0'.repeat(position)));
    return {expected: String(Math.abs(values[0]! - values[1]!)), variant: 'difference', numbers, positions, targetDigits: [digit], values};
  }
  throw new Error(`Unrecognised visible question: ${q.prompt}`);
}
const visibleOnly = (q: Question): Visible => ({prompt: q.prompt, context: q.context, display: q.display, choices: q.choices});

function checkEquations(q: Question): void {
  for (const step of q.workedSteps ?? []) {
    if (!step.equation) continue;
    const m = /^([\d,]+) ([×−]) ([\d,]+) = ([\d,]+)$/.exec(step.equation);
    expect(m).not.toBeNull();
    const left = readNumber(m![1]!);
    const right = readNumber(m![3]!);
    const result = readNumber(m![4]!);
    expect(result).toBe(m![2] === '×' ? left * right : left - right);
  }
}

describe('read and compare digit positions', () => {
  it('checks the independent solver against hand-solved visible examples', () => {
    expect(solveVisible({prompt: 'Which place does the digit 8 occupy in this number?', display: '5,084,321'}).expected).toBe('ten thousands');
    expect(solveVisible({
      prompt: 'Which number has 2 in the hundred thousands place?',
      choices: ['5,281,406', '5,182,406', '7,812,406', '8,124,506'],
    }).expected).toBe('5,281,406');
    expect(solveVisible({
      prompt: 'Which number has 3 in the ten thousands place and 8 in the hundreds place?',
      choices: ['5,231,804', '6,321,804', '7,231,084', '8,321,084'],
    }).expected).toBe('5,231,804');
    expect(solveVisible({
      prompt: 'How far apart are the values of the digit 7 in these two numbers?',
      context: ['Number A: 5,807,123.', 'Number B: 7,134,205.'],
    }).expected).toBe('6993000');
  });

  it('solves varied generated questions from visible givens and checks ambiguity, bounds and worked arithmetic', () => {
    const seeds = [-2147483648, -19, -1, 20261105, 2147483647, 4294967295, ...Array.from({length: 128}, (_, i) => i)];
    const variants = new Set<Variant>();
    const placesSeen = new Set<number>();
    const differenceOrders = new Set<boolean>();
    const zeroClues = new Set<Variant>();
    for (const seed of seeds) for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(visibleOnly(q));
      expect(q.answer).toBe(solved.expected);
      variants.add(solved.variant);
      solved.positions.forEach(position => placesSeen.add(position));
      for (const number of solved.numbers) {
        expect(number).toBeGreaterThanOrEqual(5000000);
        expect(number).toBeLessThan(10000000);
      }
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
      expect(q.workedSteps!.every(step => step.text.length > 0)).toBe(true);
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      checkEquations(q);
      if (solved.variant === 'difference') {
        expect(q.choices).toBeUndefined();
        expect(Number(q.answer)).toBeGreaterThan(0);
        expect(q.workedSteps).toHaveLength(3);
        differenceOrders.add(solved.values![0]! > solved.values![1]!);
        const statedValues = q.workedSteps!.slice(0, 2).map(step => readNumber(step.equation!.split(' = ')[1]!));
        expect(statedValues).toEqual(solved.values);
      } else {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices!.filter(choice => choice === solved.expected)).toHaveLength(1);
      }
      if (solved.variant === 'two-places') {
        expect(new Set(solved.positions).size).toBe(2);
        // Both single-clue distractors must be present, so neither clue alone suffices.
        expect(solved.matches).toEqual(expect.arrayContaining([[true, true], [true, false], [false, true], [false, false]]));
      }
      if (solved.targetDigits.includes(0)) zeroClues.add(solved.variant);
    }
    expect([...variants].sort()).toEqual(['difference', 'name', 'one-place', 'two-places']);
    expect([...placesSeen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(differenceOrders.size).toBe(2);
    expect([...zeroClues].sort()).toEqual(['one-place', 'two-places']);
  });

  it('is deterministic, uses index to reach every variant, and provides varied visible questions', () => {
    const signatures = new Set<string>();
    for (const seed of [-5, 0, 1, 17, 200, 2147483647]) {
      const variants = new Set<Variant>();
      for (let index = 0; index < 16; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        variants.add(solveVisible(visibleOnly(q)).variant);
        signatures.add(JSON.stringify(visibleOnly(q)));
      }
      expect(variants.size).toBe(4);
    }
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
    expect(signatures.size).toBeGreaterThan(80);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('read-and-compare-digit-positions');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.WN.01']);
  });
});
