import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragMeasuredPartOfWhole';

// The oracle receives only the displayed prompt. It uses centimetres
// and seconds as reference units, independently of the generator.
const units: Record<string, {dimension: string; factor: number}> = {
  cm: {dimension: 'length', factor: 1},
  m: {dimension: 'length', factor: 100},
  km: {dimension: 'length', factor: 100000},
  minutes: {dimension: 'time', factor: 60},
  hours: {dimension: 'time', factor: 3600},
};

function thousandths(text: string): number {
  const [whole, decimal = ''] = text.split('.');
  if (decimal.length > 3) throw new Error('Unexpected measurement precision');
  return Number(whole) * 1000 + Number(decimal.padEnd(3, '0'));
}

function solveVisible(prompt: string) {
  const match = /^What percentage of (\d+(?:\.\d+)?) (km|m|cm|hours|minutes) is (\d+(?:\.\d+)?) (km|m|cm|hours|minutes)\?$/.exec(prompt);
  if (!match) throw new Error(`Unrecognised visible givens: ${prompt}`);
  const [, wholeText, wholeUnit, partText, partUnit] = match;
  if (units[wholeUnit].dimension !== units[partUnit].dimension) {
    throw new Error('Cannot compare different measurement dimensions');
  }
  const whole = thousandths(wholeText) * units[wholeUnit].factor;
  const part = thousandths(partText) * units[partUnit].factor;
  if (whole <= 0) throw new Error('The whole must be positive');
  return {
    wholeText,
    wholeUnit,
    partText,
    partUnit,
    whole,
    part,
    wholeInPartUnits: whole / (1000 * units[partUnit].factor),
    percentage: 100 * part / whole,
  };
}

const samples = Array.from({length: 81}, (_, n) => n - 20).flatMap(seed =>
  Array.from({length: 6}, (_, index) => makeRagQuestion(seed, index)),
);

describe('measured part of a whole', () => {
  it('checks the independent oracle with hand-calculated measurements', () => {
    expect(solveVisible('What percentage of 0.8 km is 120 m?').percentage).toBe(15);
    expect(solveVisible('What percentage of 4 hours is 54 minutes?').percentage).toBe(22.5);
    expect(solveVisible('What percentage of 240 cm is 42 cm?').percentage).toBe(17.5);
    expect(() => solveVisible('What percentage of 4 hours is 54 cm?')).toThrow();
  });

  it('solves every answer from visible measurements across varied seeds and indices', () => {
    for (const question of samples) {
      const solved = solveVisible(question.prompt);
      expect(Number(question.answer)).toBe(solved.percentage);
      expect(solved.part).toBeGreaterThan(0);
      expect(solved.part).toBeLessThan(solved.whole);
      expect(Number.isInteger(Number(solved.partText))).toBe(true);
      expect(Number.isInteger(solved.wholeInPartUnits)).toBe(true);
      expect(solved.percentage).toBeGreaterThanOrEqual(5);
      expect(solved.percentage).toBeLessThanOrEqual(95);
      expect(Number.isInteger(solved.percentage * 2)).toBe(true);
      expect(question.unit).toBe('%');
      expect(question.picture).toBeUndefined();
      expect(question.structuredResponse).toBeUndefined();
      expect(question.hint.length).toBeGreaterThan(0);
      expect(question.explanation.length).toBeGreaterThan(0);
    }
  });

  it('checks conversion and percentage arithmetic in the worked steps', () => {
    for (const question of samples) {
      const solved = solveVisible(question.prompt);
      const steps = question.workedSteps;
      expect(steps).toHaveLength(3);
      if (!steps) throw new Error('Missing worked steps');

      if (solved.wholeUnit !== solved.partUnit) {
        const conversion = /^(\d+(?:\.\d+)?) (km|hours) = (\d+) (m|minutes)$/.exec(steps[0].equation ?? '');
        if (!conversion) throw new Error('Missing unit conversion');
        expect(conversion[1]).toBe(solved.wholeText);
        expect(conversion[2]).toBe(solved.wholeUnit);
        expect(conversion[4]).toBe(solved.partUnit);
        expect(Number(conversion[3])).toBe(solved.wholeInPartUnits);
      } else {
        expect(steps[0].equation).toBe(`${solved.wholeText} cm represents 100%`);
      }

      const division = /^(\d+) ÷ (\d+) = (\d+(?:\.\d+)?)$/.exec(steps[1].equation ?? '');
      if (!division) throw new Error('Missing part divided by whole');
      expect(Number(division[1])).toBe(Number(solved.partText));
      expect(Number(division[2])).toBe(solved.wholeInPartUnits);
      expect(Number(division[3])).toBeCloseTo(solved.percentage / 100, 10);

      const percent = /^(\d+(?:\.\d+)?) × 100 = (\d+(?:\.\d+)?)%$/.exec(steps[2].equation ?? '');
      if (!percent) throw new Error('Missing conversion to percentage');
      expect(Number(percent[1]) * 100).toBeCloseTo(solved.percentage, 10);
      expect(Number(percent[2])).toBe(solved.percentage);
    }
  });

  it('preserves response forms and offers exactly one correct choice', () => {
    const correctPositions = new Set<number>();
    for (const question of samples) {
      const solved = solveVisible(question.prompt);
      if (solved.wholeUnit === 'km') {
        expect(question.choices).toHaveLength(4);
        if (!question.choices) throw new Error('Missing choices');
        const values = question.choices.map(Number);
        expect(values.every(Number.isFinite)).toBe(true);
        expect(new Set(values).size).toBe(4);
        expect(values.filter(value => value === solved.percentage)).toHaveLength(1);
        correctPositions.add(values.indexOf(solved.percentage));
      } else {
        expect(question.choices).toBeUndefined();
      }
    }
    expect(correctPositions.size).toBeGreaterThan(1);
  });

  it('covers all three forms, decimal percentages and varied visible givens', () => {
    const forms = new Set<string>();
    const fractionalForms = new Set<string>();
    const prompts = new Set<string>();
    for (const question of samples) {
      const solved = solveVisible(question.prompt);
      forms.add(solved.wholeUnit);
      if (!Number.isInteger(solved.percentage)) fractionalForms.add(solved.wholeUnit);
      prompts.add(question.prompt);
    }
    expect([...forms].sort()).toEqual(['cm', 'hours', 'km']);
    expect([...fractionalForms].sort()).toEqual(['cm', 'hours', 'km']);
    expect(prompts.size).toBeGreaterThan(30);
  });

  it('has stable output, a working default index and matching metadata', () => {
    expect(makeRagQuestion(83, 4)).toEqual(makeRagQuestion(83, 4));
    expect(makeRagQuestion(83)).toEqual(makeRagQuestion(83, 0));
    expect(makeRagQuestion(83, 4).key).not.toBe(makeRagQuestion(83, 5).key);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('measured-part-of-whole');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.PCT.02', 'P5.S.DEC.02']);
  });
});
