import {describe, expect, test} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragEndpointBoundarySpacing';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  kind: 'route' | 'added' | 'linked';
  values: number[];
  commonMistake: number[];
};

function numbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1).map(Number);
}

// Independently place points at candidate whole-centimetre spacings.
// This uses only a span and point count recovered from the printed question.
function fitSpacing(span: number, points: number): number {
  if (!Number.isInteger(span) || span <= 0 || !Number.isInteger(points) || points < 2) {
    throw new Error('Invalid visible span or point count');
  }
  const fits: number[] = [];
  for (let spacing = 1; spacing <= span; spacing++) {
    let position = 0;
    for (let point = 1; point < points; point++) position += spacing;
    if (position === span) fits.push(spacing);
  }
  if (fits.length !== 1) throw new Error('Visible givens do not yield one whole-centimetre spacing');
  return fits[0];
}

// Deliberately cannot read answer, workedSteps, explanation, key or RNG state.
function solveVisible(q: VisibleQuestion): Solution {
  const text = (q.context ?? []).join('\n');
  if (q.prompt === 'How many route markers are there altogether?') {
    const distance = /between two different gates is (\d+(?:\.\d{1,3})?) km long\./.exec(text);
    if (!distance || !text.includes('including both the start and the finish')) {
      throw new Error('Missing route length or endpoint condition');
    }
    const [whole, decimal = ''] = distance[1].split('.');
    const metres = Number(whole) * 1000 + Number(decimal.padEnd(3, '0'));
    const [spacing] = numbers(text, /Route markers are placed (\d+) m apart/);
    if (spacing <= 0 || metres % spacing !== 0) throw new Error('Finish is not on a marker position');
    const positions: number[] = [];
    for (let position = 0; position <= metres; position += spacing) positions.push(position);
    if (positions[positions.length - 1] !== metres) throw new Error('Finish was omitted');
    return {kind: 'route', values: [positions.length], commonMistake: [positions.length - 1]};
  }

  if (q.prompt === 'How long is each space after the dots are redrawn?') {
    const [points] = numbers(text, /A straight line has (\d+) dots, including one at each end\./);
    const [spacing] = numbers(text, /neighbouring dots is (\d+) cm long\./);
    const [added] = numbers(text, /using (\d+) more dots along the same line\./);
    if (!text.includes('The end dots stay in place') || !text.includes('all the dots are equally spaced again')) {
      throw new Error('Missing fixed-endpoint re-spacing conditions');
    }
    const oldPositions = Array.from({length: points}, (_, i) => i * spacing);
    const span = oldPositions[oldPositions.length - 1];
    const answer = fitSpacing(span, points + added);
    if (!(answer < spacing)) throw new Error('Adding dots did not decrease spacing');
    return {kind: 'added', values: [answer], commonMistake: [span / (points + added)]};
  }

  if (!q.prompt.startsWith('(a) How long is one of these sides')) throw new Error('Unknown visible task');
  const [total] = numbers(text, /stage has (\d+) lights altogether/);
  const [spacing] = numbers(text, /On both sides, neighbouring lights are (\d+) cm apart/);
  const [removed] = numbers(text, /(\d+) lights are then removed from one of these sides\./);
  if (!text.includes('only along two opposite sides') || !text.includes('with a light at each end') ||
      !text.includes('There is still a light at each end') || !text.includes('side length stays unchanged')) {
    throw new Error('Missing opposite-side or endpoint constraints');
  }
  // Enumerate splits of the visible total. Equal opposite lengths select one split.
  const possibleCounts: number[] = [];
  for (let first = 2; first <= total - 2; first++) {
    const second = total - first;
    if ((first - 1) * spacing === (second - 1) * spacing) possibleCounts.push(first);
  }
  if (possibleCounts.length !== 1) throw new Error('Opposite-side counts are not determined');
  const points = possibleCounts[0];
  const positions = Array.from({length: points}, (_, i) => i * spacing);
  const span = positions[positions.length - 1];
  const remaining = points - removed;
  const nextSpacing = fitSpacing(span, remaining);
  if (!(nextSpacing > spacing)) throw new Error('Removing lights did not increase spacing');
  return {
    kind: 'linked',
    values: [span, nextSpacing],
    commonMistake: [points * spacing, nextSpacing],
  };
}

function encode(q: Question, values: number[]): string {
  return q.structuredResponse ? JSON.stringify(values.map(String)) : String(values[0]);
}

describe('endpoint and boundary spacing candidate', () => {
  test('answers agree with an independent visible-givens solver across seeds and indices', () => {
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    const seeds = [-2147483648, 2147483647, ...Array.from({length: 100}, (_, i) => i - 25)];
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        kinds.add(solved.kind);
        visibleQuestions.add(JSON.stringify([q.prompt, q.context]));
        const stored: unknown = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
        expect(Array.isArray(stored)).toBe(true);
        expect((stored as string[]).every(value => typeof value === 'string')).toBe(true);
        expect((stored as string[]).map(Number)).toEqual(solved.values);
        expect(solved.values.every(value => Number.isSafeInteger(value) && value > 0 && value <= 2000)).toBe(true);
        expect(correctAnswer(q, encode(q, solved.values))).toBe(true);
        expect(correctAnswer(q, encode(q, solved.commonMistake))).toBe(false);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps?.every(step => step.text.length > 0 && Boolean(step.equation))).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        if (solved.kind === 'linked') {
          expect(q.structuredResponse).toEqual({
            kind: 'number-fields',
            fields: [
              {label: '(a) Length of one side (cm)'},
              {label: '(b) New spacing (cm)'},
            ],
          });
          expect(q.unit).toBeUndefined();
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe(solved.kind === 'route' ? 'markers' : 'cm');
        }
      }
    }
    expect([...kinds].sort()).toEqual(['added', 'linked', 'route']);
    expect(visibleQuestions.size).toBeGreaterThan(30);
  });

  test('linked answers must both be supplied correctly and in the requested order', () => {
    let checked = 0;
    for (let seed = 0; seed < 30; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        if (solved.kind !== 'linked') continue;
        checked++;
        const [length, spacing] = solved.values;
        expect(correctAnswer(q, JSON.stringify([String(length)]))).toBe(false);
        expect(correctAnswer(q, encode(q, [length + 1, spacing]))).toBe(false);
        expect(correctAnswer(q, encode(q, [length, spacing + 1]))).toBe(false);
        expect(correctAnswer(q, encode(q, [spacing, length]))).toBe(false);
      }
    }
    expect(checked).toBe(30);
  });

  test('generation is deterministic and successive indices exercise all three forms', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-endpoint-boundary-spacing');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of [-91, -1, 0, 1, 42, 987654]) {
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible({prompt: q.prompt, context: q.context}).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  });
});
