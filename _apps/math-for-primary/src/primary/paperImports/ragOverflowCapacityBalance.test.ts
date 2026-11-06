import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragOverflowCapacityBalance';

// The oracle receives only information available to the pupil.
type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'unit' | 'structuredResponse'>;
type Solution = {
  kind: 'rim' | 'outlet' | 'capacity';
  answer: string;
  capacity: number;
  initial: number;
  added: number;
  retained: number;
  overflow: number;
};

function match(text: string, expression: RegExp): RegExpMatchArray {
  const result = text.match(expression);
  if (!result) throw new Error(`Missing visible given: ${expression}`);
  return result;
}

function readLitresAsMl(value: string): number {
  const [whole, fractional = ''] = value.split('.');
  if (fractional.length > 3) throw new Error('Unexpected precision');
  return Number(whole) * 1000 + Number(fractional.padEnd(3, '0'));
}

function solveVisible(question: VisibleQuestion): Solution {
  const text = (question.context ?? []).join(' ');
  if (text.includes('a jug holds')) {
    const initial = Number(match(text, /a jug holds (\d+) ml/)[1]);
    const added = Number(match(text, /pours in another (\d+) ml/)[1]);
    const overflow = Number(match(text, /Exactly (\d+) ml spills over the rim/)[1]);
    const capacity = initial + added - overflow;
    return {
      kind: 'capacity', capacity, initial, added, retained: capacity, overflow,
      answer: JSON.stringify([String(Math.floor(capacity / 1000)), String(capacity % 1000)]),
    };
  }

  const dimensions = match(text, /measures (\d+) cm long, (\d+) cm wide and (\d+) cm high on the inside/);
  const [length, width, height] = dimensions.slice(1).map(Number);
  const fraction = match(text, /(\d+)\/(\d+) of the tank's capacity/);
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  if (!(numerator > 0 && numerator < denominator)) throw new Error('Invalid starting fraction');
  // Solve through water depth and available space, rather than the generator's volume sum.
  const startingDepth = height * numerator / denominator;
  const capacity = length * width * height;
  const initial = length * width * startingDepth;
  const outlet = text.includes('side outlet');
  const finalDepth = outlet
    ? Number(match(text, /bottom edge of a side outlet is (\d+) cm above the inside base/)[1])
    : height;
  if (!(finalDepth > startingDepth && finalDepth <= height)) throw new Error('Invalid retaining level');
  if (outlet && finalDepth === height) throw new Error('Outlet must be below the brim');
  let added: number;
  if (outlet) {
    const portions = match(text, /empties (\d+) full cups, each holding (\d+) cm³ of water/);
    const count = Number(portions[1]);
    const portion = Number(portions[2]);
    if (count < 2 || portion <= 0) throw new Error('Invalid repeated portions');
    added = count * portion;
  } else {
    added = readLitresAsMl(match(text, /pours (\d+(?:\.\d+)?) L of water into the tank/)[1]);
  }
  const emptySpace = length * width * (finalDepth - startingDepth);
  const overflow = added - emptySpace;
  return {
    kind: outlet ? 'outlet' : 'rim',
    answer: String(overflow / 1000),
    capacity, initial, added, retained: length * width * finalDepth, overflow,
  };
}

function visibleOnly(question: Question): VisibleQuestion {
  return {
    prompt: question.prompt,
    context: question.context,
    unit: question.unit,
    structuredResponse: question.structuredResponse,
  };
}

describe('overflow and capacity balance candidate', () => {
  it('independently solves all variants from visible givens across seeds and indices', () => {
    const kinds = new Set<string>();
    const questions = new Set<string>();
    let smallRemainder = false;
    let zeroRemainder = false;
    for (let seed = -60; seed < 60; seed++) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        kinds.add(solved.kind);
        questions.add(JSON.stringify(question.context));
        expect(question.answer).toBe(solved.answer);
        expect(solved.initial).toBeGreaterThan(0);
        expect(solved.initial).toBeLessThan(solved.capacity);
        expect(solved.added).toBeGreaterThan(0);
        expect(solved.overflow).toBeGreaterThan(0);
        expect(solved.overflow).toBeLessThan(solved.added);
        expect(solved.initial + solved.added).toBe(solved.retained + solved.overflow);
        for (const volume of [solved.capacity, solved.initial, solved.added, solved.retained, solved.overflow]) {
          expect(Number.isSafeInteger(volume)).toBe(true);
        }
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(question.workedSteps?.every(step => !!step.text && !!step.equation)).toBe(true);
        expect(question.hint.length).toBeGreaterThan(15);
        expect(question.explanation).toContain(question.workedSteps![0].equation!);
        if (solved.kind === 'capacity') {
          const answer = JSON.parse(solved.answer) as string[];
          const remainder = Number(answer[1]);
          expect(question.structuredResponse).toEqual({kind: 'number-pair', firstLabel: 'Litres (L)', secondLabel: 'Millilitres (ml)'});
          expect(Number(answer[0])).toBeGreaterThanOrEqual(1);
          expect(remainder).toBeGreaterThanOrEqual(0);
          expect(remainder).toBeLessThan(1000);
          expect(structuredResponseCorrect(question.structuredResponse!, question.answer, solved.answer)).toBe(true);
          const wrong = JSON.stringify([answer[0], String(remainder + 1)]);
          expect(structuredResponseCorrect(question.structuredResponse!, question.answer, wrong)).toBe(false);
          expect(structuredResponseCorrect(question.structuredResponse!, question.answer, JSON.stringify([`${answer[0]}.5`, answer[1]]))).toBe(false);
          smallRemainder ||= remainder > 0 && remainder < 100;
          zeroRemainder ||= remainder === 0;
        } else {
          expect(question.unit).toBe('L');
          expect(question.structuredResponse).toBeUndefined();
          expect(question.answer).toMatch(/^\d+(?:\.\d{1,3})?$/);
          if (solved.kind === 'outlet') {
            expect(solved.retained).toBeLessThan(solved.capacity);
            expect(solved.initial + solved.added).toBeLessThan(solved.capacity);
            expect(Number(question.answer)).not.toBe((solved.initial + solved.added - solved.capacity) / 1000);
          } else {
            expect(solved.retained).toBe(solved.capacity);
            expect(solved.initial + solved.added).toBeGreaterThan(solved.capacity);
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['capacity', 'outlet', 'rim']);
    expect(questions.size).toBeGreaterThan(200);
    expect(smallRemainder).toBe(true);
    expect(zeroRemainder).toBe(true);
  });

  it('checks the independent oracle against hand-calculated visible examples', () => {
    const rim: VisibleQuestion = {
      prompt: 'How many litres spill out?',
      context: [
        'A rectangular tank measures 32 cm long, 18 cm wide and 25 cm high on the inside.',
        "In the beginning, 2/5 of the tank's capacity is filled with water.",
        'Arun pours 9 L of water into the tank. Water that does not fit spills over the top.',
      ],
    };
    expect(solveVisible(rim).answer).toBe('0.36');
    const outlet: VisibleQuestion = {
      prompt: 'How many litres reach the bucket?',
      context: [
        'A rectangular tank measures 30 cm long, 12 cm wide and 40 cm high on the inside.',
        "In the beginning, 3/8 of the tank's capacity is filled with water.",
        'The bottom edge of a side outlet is 18 cm above the inside base.',
        'Mei empties 5 full cups, each holding 350 cm³ of water, into the tank.',
      ],
    };
    expect(solveVisible(outlet).answer).toBe('0.67');
    const capacity: VisibleQuestion = {
      prompt: 'Give the capacity in litres and millilitres.',
      context: ['At first, a jug holds 640 ml. Sana pours in another 1180 ml. Exactly 205 ml spills over the rim, leaving the jug full.'],
    };
    expect(solveVisible(capacity).answer).toBe('["1","615"]');
  });

  it('is deterministic, supports signed seeds, and cycles through all three variants', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-overflow-capacity-balance');
    for (const seed of [-2147483648, -7, 0, 17, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = -1; index <= 1; index++) {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        kinds.add(solveVisible(visibleOnly(question)).kind);
        keys.add(question.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
    }
  });
});
