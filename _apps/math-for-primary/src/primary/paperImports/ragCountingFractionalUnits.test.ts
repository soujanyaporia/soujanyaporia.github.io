import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragCountingFractionalUnits';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'display'>;
type Rational = {numerator: number; denominator: number};
type VisibleModel = {
  family: 'count' | 'pieces' | 'gap';
  start: Rational;
  target: Rational;
  unit: Rational;
};

function requiredMatch(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Unrecognised visible given ${text}`);
  return match;
}

function readAmount(text: string): Rational {
  if (/^\d+$/.test(text)) {
    return {numerator: Number(text), denominator: 1};
  }
  const match = requiredMatch(/^(?:(\d+) )?(\d+)\/([1-9]\d*)$/, text);
  const denominator = Number(match[3]);
  return {
    numerator: Number(match[1] ?? 0) * denominator + Number(match[2]),
    denominator,
  };
}

function readVisible(question: VisibleQuestion): VisibleModel {
  const context = question.context ?? [];
  const count = /^Each small part is (1\/\d+) of a whole\.$/.exec(context[0] ?? '');
  if (count) {
    return {
      family: 'count',
      start: {numerator: 0, denominator: 1},
      target: readAmount(question.display ?? ''),
      unit: readAmount(count[1]),
    };
  }

  const cord = /^A craft club has (\d+) m of cord\.$/.exec(context[0] ?? '');
  if (cord) {
    const piece = requiredMatch(
      /^Each piece is (\d+\/\d+) m long\. All the cord is used\.$/,
      context[1] ?? '',
    );
    return {
      family: 'pieces',
      start: {numerator: 0, denominator: 1},
      target: readAmount(cord[1]),
      unit: readAmount(piece[1]),
    };
  }

  const gap = requiredMatch(
    /^A total starts at ([\d /]+) and must reach ([\d /]+)\.$/,
    context[0] ?? '',
  );
  const addedPart = requiredMatch(
    /^Each added part has a value of (1\/\d+)\.$/,
    context[1] ?? '',
  );
  return {
    family: 'gap',
    start: readAmount(gap[1]),
    target: readAmount(gap[2]),
    unit: readAmount(addedPart[1]),
  };
}

// Repeated addition on an integer scale independently solves the visible task.
// The solver receives only learner-visible fields.
function solveVisible(question: VisibleQuestion): {model: VisibleModel; count: number} {
  const model = readVisible(question);
  const scale = model.start.denominator * model.target.denominator * model.unit.denominator;
  const startTicks = model.start.numerator * (scale / model.start.denominator);
  const targetTicks = model.target.numerator * (scale / model.target.denominator);
  const unitTicks = model.unit.numerator * (scale / model.unit.denominator);
  if (unitTicks <= 0 || targetTicks <= startTicks) {
    throw new Error('The visible amounts must give a positive counting task.');
  }

  let position = startTicks;
  let count = 0;
  while (position < targetTicks && count < 500) {
    position += unitTicks;
    count += 1;
  }
  if (position !== targetTicks) {
    throw new Error('The target cannot be reached in whole parts.');
  }
  return {model, count};
}

function visibleFields(question: Question): VisibleQuestion {
  return {
    context: question.context,
    prompt: question.prompt,
    display: question.display,
  };
}

describe('counting fractional units', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    expect(solveVisible({
      context: ['Each small part is 1/6 of a whole.'],
      display: '4 1/2',
      prompt: 'Choose the number of small parts in the amount shown.',
    }).count).toBe(27);

    expect(solveVisible({
      context: [
        'A craft club has 14 m of cord.',
        'Each piece is 2/7 m long. All the cord is used.',
      ],
      prompt: 'How many equal pieces are made? Show your working.',
    }).count).toBe(49);

    expect(solveVisible({
      context: [
        'A total starts at 3 3/4 and must reach 6 1/2.',
        'Each added part has a value of 1/8.',
      ],
      prompt: 'How many parts must be added? Show your working.',
    }).count).toBe(22);

    expect(() => solveVisible({
      context: [
        'A total starts at 3 1/3 and must reach 4 1/2.',
        'Each added part has a value of 1/4.',
      ],
      prompt: 'How many parts must be added? Show your working.',
    })).toThrow('The target cannot be reached in whole parts.');
  });

  it('independently solves visible givens across 1080 generated questions', () => {
    const families = new Set<string>();
    const regrouping = new Set<string>();
    const countDenominators = new Set<boolean>();

    for (let seed = -40; seed < 80; seed += 1) {
      for (let index = 0; index < 9; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleFields(question));
        const {model, count} = solved;
        families.add(model.family);

        expect(question.answer).toBe(String(count));
        expect(Number.isInteger(count)).toBe(true);
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(84);
        expect(model.unit.denominator).toBeGreaterThanOrEqual(3);
        expect(model.unit.denominator).toBeLessThanOrEqual(12);
        expect(model.unit.numerator).toBeGreaterThan(0);
        expect(model.unit.numerator).toBeLessThan(model.unit.denominator);
        expect(question.picture).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(3);
        for (const step of question.workedSteps ?? []) {
          expect(question.explanation).toContain(step.text);
          if (step.equation) expect(question.explanation).toContain(step.equation);
        }

        if (model.family === 'count') {
          expect(model.unit.numerator).toBe(1);
          expect(question.prompt).toBe('Choose the number of small parts in the amount shown.');
          expect(question.unit).toBe('parts');
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices?.filter(choice => Number(choice) === count)).toHaveLength(1);
          expect(question.choices?.every(choice => /^[1-9]\d*$/.test(choice))).toBe(true);
          countDenominators.add(model.target.denominator !== model.unit.denominator);

          const whole = Math.floor(model.target.numerator / model.target.denominator);
          const fractionalParts = count - whole * model.unit.denominator;
          expect(question.workedSteps?.[0].equation).toBe(
            `${whole} × ${model.unit.denominator} = ${whole * model.unit.denominator}`,
          );
          expect(question.workedSteps?.[2].equation).toBe(
            `${whole * model.unit.denominator} + ${fractionalParts} = ${count} parts`,
          );
        } else if (model.family === 'pieces') {
          expect(model.target.denominator).toBe(1);
          expect(model.unit.numerator).toBeGreaterThan(1);
          expect(question.prompt).toBe('How many equal pieces are made? Show your working.');
          expect(question.unit).toBe('pieces');
          expect(question.choices).toBeUndefined();
          const smallLengths = model.target.numerator * model.unit.denominator;
          expect(question.workedSteps?.[0].equation).toBe(
            `${model.target.numerator} × ${model.unit.denominator} = ${smallLengths}`,
          );
          expect(question.workedSteps?.[2].equation).toBe(
            `${smallLengths} ÷ ${model.unit.numerator} = ${count} pieces`,
          );
        } else {
          expect(model.unit.numerator).toBe(1);
          expect(question.prompt).toBe('How many parts must be added? Show your working.');
          expect(question.unit).toBe('parts');
          expect(question.choices).toBeUndefined();
          const startRemainder = model.start.numerator % model.start.denominator;
          const targetRemainder = model.target.numerator % model.target.denominator;
          const needsRegrouping = startRemainder * model.target.denominator
            > targetRemainder * model.start.denominator;
          regrouping.add(needsRegrouping ? 'borrow' : 'no-borrow');

          const denominator = model.unit.denominator;
          const startParts = model.start.numerator * denominator / model.start.denominator;
          const targetParts = model.target.numerator * denominator / model.target.denominator;
          expect(question.workedSteps?.[2].equation).toBe(
            `${targetParts}/${denominator} − ${startParts}/${denominator} = ${count}/${denominator}`,
          );
        }
      }
    }

    expect([...families].sort()).toEqual(['count', 'gap', 'pieces']);
    expect([...regrouping].sort()).toEqual(['borrow', 'no-borrow']);
    expect(countDenominators.has(false)).toBe(true);
    expect(countDenominators.has(true)).toBe(true);
  });

  it('is deterministic and includes every variant in three consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-counting-fractional-units');
    expect(RAG_PATTERN.skillIds).toEqual([
      'P4.S.FRAC.02', 'P5.S.FRAC.04', 'P5.S.RATE.02',
    ]);

    for (const seed of [0, 17, -29, 2026, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const startIndex of [-3, 0, 6]) {
        const families = new Set<string>();
        const keys = new Set<string>();
        for (let index = startIndex; index < startIndex + 3; index += 1) {
          const question = makeRagQuestion(seed, index);
          expect(question).toEqual(makeRagQuestion(seed, index));
          families.add(readVisible(visibleFields(question)).family);
          keys.add(question.key);
        }
        expect(families.size).toBe(3);
        expect(keys.size).toBe(3);
      }
    }
  });
});
