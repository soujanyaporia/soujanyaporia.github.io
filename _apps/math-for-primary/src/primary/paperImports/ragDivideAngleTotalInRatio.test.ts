import {describe, expect, test} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragDivideAngleTotalInRatio';

type Visible = Pick<Question, 'prompt' | 'context'>;

function readNumber(value:string, expression:RegExp):number {
  const match = expression.exec(value);
  if (!match) throw new Error(`Missing visible given: ${expression}`);
  return Number(match[1]);
}

function unique(values:number[]):number {
  if (values.length !== 1) throw new Error(`Expected one solution, found ${values.length}`);
  return values[0];
}

function integers(max = 179):number[] {
  return Array.from({length:max}, (_, index) => index + 1);
}

// This solver receives only the question text, never answers, worked steps,
// random state or generation parameters. It enumerates angle assignments.
function solveVisible(question:Visible):string[] {
  const visible = (question.context ?? []).join(' ');
  if (visible.includes('AB and CD meet at O at right angles.')) {
    if (!visible.includes('in the order OA, OP, OQ, OD')) throw new Error('Missing ray order');
    const given = readNumber(visible, /Angle AOP = (\d+)°/);
    const multiplier = readNumber(visible, /Angle POQ is (\d+) times angle QOD/);
    const small = unique(integers(89).filter(candidate =>
      given + multiplier * candidate + candidate === 90,
    ));
    return [String(small)];
  }

  if (visible.includes('ABCD is a trapezium.')) {
    if (!visible.includes('AB is parallel to DC') || !visible.includes('ED and EC are equal')) {
      throw new Error('Missing geometric constraints');
    }
    const atA = readNumber(visible, /Angle DAB = (\d+)°/);
    const base = readNumber(visible, /angle EDC = (\d+)°/i);
    const multiplier = readNumber(visible, /Angle BCE is (\d+) times angle CBE/);
    // Parallel sides determine the whole angle at D.
    const atD = unique(integers().filter(angle => angle + atA === 180));
    const first = unique(integers().filter(angle => angle + base === atD));
    // Equal sides give DCE = EDC. Use the quadrilateral angle sum as
    // an independent route instead of the generator's EBC triangle route.
    const atB = unique(integers().filter(angle => {
      const target = multiplier * angle;
      const atC = base + target;
      return target < 180 && atC < 180 && 2 * base < 180 &&
        atA + angle + atC + atD === 360;
    }));
    return [String(first), String(multiplier * atB)];
  }

  if (!visible.includes('In triangle ABD, C is between B and D')) {
    throw new Error('Unrecognised visible geometry');
  }
  const atA = readNumber(visible, /Angle BAC = (\d+)°/);
  const atB = readNumber(visible, /angle ABC = (\d+)°/i);
  const multiplier = readNumber(visible, /Angle ACB is (\d+) times angle CAD/);
  const small = unique(integers().filter(candidate => {
    const atC = multiplier * candidate;
    const adjacentAtC = 180 - atC;
    const atD = 180 - adjacentAtC - candidate;
    return atC < 180 && adjacentAtC > 0 && atD > 0 &&
      atA + atB + atC === 180 && atA + candidate < 180;
  }));
  return [String(small)];
}

function kind(question:Question):string {
  const visible = (question.context ?? []).join(' ');
  return visible.includes('ABCD is a trapezium.') ? 'trapezium' :
    visible.includes('meet at O at right angles') ? 'perpendicular' : 'triangle';
}

describe('angle totals shared using a multiplicative relationship', () => {
  test('independent solver handles known visible examples and rejects inconsistency', () => {
    const perpendicular:Visible = {prompt:'Find angle QOD.', context:[
      'AB and CD meet at O at right angles.',
      'The rays are in the order OA, OP, OQ, OD.',
      'Angle AOP = 30°. Angle POQ is 4 times angle QOD.',
    ]};
    expect(solveVisible(perpendicular)).toEqual(['12']);
    expect(() => solveVisible({...perpendicular, context:[
      ...perpendicular.context!.slice(0, 2),
      'Angle AOP = 31°. Angle POQ is 4 times angle QOD.',
    ]})).toThrow('Expected one solution');

    expect(solveVisible({prompt:'Find both angles.', context:[
      'ABCD is a trapezium. AB is parallel to DC. ED and EC are equal.',
      'Angle DAB = 56° and angle EDC = 68°.',
      'Angle BCE is 3 times angle CBE.',
    ]})).toEqual(['56', '84']);

    expect(solveVisible({prompt:'Find angle CAD.', context:[
      'In triangle ABD, C is between B and D on side BD.',
      'Angle BAC = 74° and angle ABC = 42°.',
      'Angle ACB is 4 times angle CAD.',
    ]})).toEqual(['16']);
  });

  test('varied seeds have unique solutions from visible givens and correct response grading', () => {
    const variations = new Map<string, Set<string>>();
    for (let seed = -32; seed < 96; seed++) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt:question.prompt, context:question.context});
        const family = kind(question);
        if (!variations.has(family)) variations.set(family, new Set());
        variations.get(family)!.add(JSON.stringify(question.context));
        const expected = family === 'trapezium' ? JSON.stringify(solved) : solved[0];
        expect(question.answer).toBe(expected);
        expect(question.unit).toBe('degrees');
        expect(correctAnswer(question, expected)).toBe(true);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation).toBe(question.workedSteps!.map(step => step.text).join(' '));
        for (const answer of solved.map(Number)) {
          expect(Number.isInteger(answer)).toBe(true);
          expect(answer).toBeGreaterThan(0);
          expect(answer).toBeLessThan(180);
        }
        if (family === 'trapezium') {
          expect(question.structuredResponse?.kind).toBe('number-pair');
          expect(solved).toHaveLength(2);
          expect(correctAnswer(question, JSON.stringify([solved[1], solved[0]]))).toBe(false);
          expect(correctAnswer(question, JSON.stringify([solved[0], String(Number(solved[1]) + 1)]))).toBe(false);
          expect(correctAnswer(question, solved[0])).toBe(false);
          expect(question.prompt).toContain('(a)');
          expect(question.prompt).toContain('(b)');
        } else {
          expect(question.structuredResponse).toBeUndefined();
          expect(correctAnswer(question, String(Number(solved[0]) + 1))).toBe(false);
        }
      }
    }
    expect([...variations.keys()].sort()).toEqual(['perpendicular', 'trapezium', 'triangle']);
    for (const values of variations.values()) expect(values.size).toBeGreaterThan(8);
  });

  test('generation is deterministic and cycles through all three forms', () => {
    for (const seed of [-1001, 0, 1, 23, 99991]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(new Set([0, 1, 2].map(index => kind(makeRagQuestion(seed, index)))).size).toBe(3);
      for (const index of [-3, 0, 1, 7]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('divide-an-angle-total-in-a-ratio');
    const allowed = new Set(['P5.S.ANGLE.01', 'P5.S.ANGLE.04', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03']);
    for (const skill of RAG_PATTERN.skillIds) expect(allowed.has(skill)).toBe(true);
  });

  test('diagrams use supported marks within the canvas and text specifies every angle', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        const picture = question.picture;
        if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
        expect(picture.label).toBe(question.context!.join(' '));
        expect(picture.marks.length).toBeGreaterThan(7);
        const point = (x:number, y:number) => {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(320);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(200);
        };
        for (const mark of picture.marks) {
          if (mark.kind === 'line') {
            point(mark.x1, mark.y1);
            point(mark.x2, mark.y2);
            expect(Math.hypot(mark.x2 - mark.x1, mark.y2 - mark.y1)).toBeGreaterThan(0);
          } else if (mark.kind === 'text') {
            point(mark.x, mark.y);
            expect(mark.text).toMatch(/^[A-Z]$/);
          } else throw new Error('Unexpected diagram primitive');
        }
        const visible = question.context!.join(' ');
        if (kind(question) === 'triangle') {
          expect(readNumber(visible, /Angle BAC = (\d+)°/)).not.toBe(80);
          expect(readNumber(visible, /angle ABC = (\d+)°/i)).not.toBe(40);
        } else if (kind(question) === 'trapezium') {
          expect(readNumber(visible, /Angle DAB = (\d+)°/)).not.toBe(60);
          expect(readNumber(visible, /angle EDC = (\d+)°/i)).not.toBe(75);
        } else {
          expect(readNumber(visible, /Angle AOP = (\d+)°/)).not.toBe(36);
        }
      }
    }
  });
});
