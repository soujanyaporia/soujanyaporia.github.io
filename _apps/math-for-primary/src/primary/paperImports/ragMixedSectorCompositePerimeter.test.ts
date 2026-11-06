import {expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragMixedSectorCompositePerimeter';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'picture'>;

function requiredMatch(text: string, expression: RegExp): RegExpMatchArray {
  const match = text.match(expression);
  if (!match) throw new Error(`Missing visible given matching ${expression}`);
  return match;
}

function solveVisible(question: VisibleQuestion) {
  const text = (question.context ?? []).join(' ');
  const piMatch = requiredMatch(text, /π = (\d+(?:\.\d+)?)(?:\/(\d+))?/);
  const pi = Number(piMatch[1]) / Number(piMatch[2] ?? 1);

  if (text.includes('large semicircle')) {
    const radius = Number(requiredMatch(text, /OC = (\d+) cm/)[1]);
    const factor = Number(requiredMatch(text, /large diameter is (\d+) times a small radius/)[1]);
    const fullDiameter = radius + radius;
    const smallRadius = fullDiameter / factor;
    const side = smallRadius + smallRadius;
    const oneOverhang = (fullDiameter - side) / 2;
    const arcFractions = [
      {diameter: fullDiameter, fraction: 1 / 2 - 1 / 4},
      {diameter: side, fraction: 1 / 2},
      {diameter: side, fraction: 1 / 2},
    ];
    const curved = arcFractions.reduce((sum, arc) => sum + pi * arc.diameter * arc.fraction, 0);
    const straight = [radius, radius, oneOverhang, oneOverhang, side].reduce((sum, edge) => sum + edge, 0);
    return {kind: 'linked', values: [side, curved + straight], pi, largestRadius: radius};
  }

  if (text.includes('meet only at O')) {
    const match = requiredMatch(text, /radii are (\d+) cm and (\d+) cm/);
    const radii = [Number(match[1]), Number(match[2])];
    const perimeter = radii.reduce((sum, radius) => sum + pi * (radius + radius) / 4 + radius + radius, 0);
    return {kind: 'unequal', values: [perimeter], pi, largestRadius: Math.max(...radii)};
  }

  const radius = Number(requiredMatch(text, /centre A and radius (\d+) cm/)[1]);
  const outerCircumference = pi * (radius + radius);
  const innerCircumference = pi * radius;
  return {
    kind: 'cut-out',
    values: [outerCircumference / 4 + innerCircumference / 2 + radius],
    pi,
    largestRadius: radius,
  };
}

// Measure the visible filled outlines independently of the generator's formulas.
// Every arc used here is circular. The SVG sweep affects position, while the
// chord, radius and large-arc flag determine its length.
function measurePath(path: string, pi: number) {
  const tokens = path.match(/[MLHVAZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let cursor = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let length = 0;
  let largestRadius = 0;
  let closed = false;
  const next = () => {
    const value = Number(tokens[cursor++]);
    if (!Number.isFinite(value)) throw new Error('Invalid path coordinate');
    return value;
  };
  const lineTo = (endX: number, endY: number) => {
    length += Math.hypot(endX - x, endY - y);
    x = endX;
    y = endY;
  };

  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    switch (command) {
      case 'M':
        x = next();
        y = next();
        startX = x;
        startY = y;
        break;
      case 'L': {
        const endX = next();
        const endY = next();
        lineTo(endX, endY);
        break;
      }
      case 'H':
        lineTo(next(), y);
        break;
      case 'V':
        lineTo(x, next());
        break;
      case 'A': {
        const radius = next();
        const radiusY = next();
        const rotation = next();
        const largeArc = next();
        const sweep = next();
        const endX = next();
        const endY = next();
        expect(radius).toBeGreaterThan(0);
        expect(radiusY).toBe(radius);
        expect(rotation).toBe(0);
        expect([0, 1]).toContain(largeArc);
        expect([0, 1]).toContain(sweep);
        const chord = Math.hypot(endX - x, endY - y);
        expect(chord).toBeLessThanOrEqual(2 * radius + 1e-9);
        const minorAngle = 2 * Math.asin(Math.min(1, chord / (2 * radius)));
        const angle = largeArc ? 2 * Math.PI - minorAngle : minorAngle;
        length += radius * angle * pi / Math.PI;
        largestRadius = Math.max(largestRadius, radius);
        x = endX;
        y = endY;
        break;
      }
      case 'Z':
        lineTo(startX, startY);
        closed = true;
        break;
      default:
        throw new Error(`Unsupported path command ${command}`);
    }
  }
  expect(closed).toBe(true);
  expect(largestRadius).toBeGreaterThan(0);
  return {length, largestRadius};
}

function measureVisibleBoundary(question: VisibleQuestion, pi: number, largestRadiusCm: number): number {
  const picture = question.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Expected the supported vector diagram');
  let totalPixels = 0;
  let largestRadiusPixels = 0;
  for (const mark of picture.marks) {
    if (mark.kind !== 'path' || !mark.fill) continue;
    const measured = measurePath(mark.d, pi);
    totalPixels += measured.length;
    largestRadiusPixels = Math.max(largestRadiusPixels, measured.largestRadius);
  }
  expect(totalPixels).toBeGreaterThan(0);
  expect(largestRadiusPixels).toBeGreaterThan(0);
  return totalPixels * largestRadiusCm / largestRadiusPixels;
}

function visibleOnly(question: Question): VisibleQuestion {
  return {prompt: question.prompt, context: question.context, picture: question.picture};
}

test('answers and drawn boundaries agree with independent visible-givens solutions across seeds', () => {
  const answersByKind = new Map<string, Set<string>>();
  for (let seed = -10; seed < 90; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const visible = visibleOnly(question);
      const solved = solveVisible(visible);
      const expectedPerimeter = solved.values[solved.values.length - 1];
      const actualValues: number[] = question.structuredResponse
        ? (JSON.parse(question.answer) as string[]).map(Number)
        : [Number(question.answer)];
      expect(actualValues).toHaveLength(solved.values.length);
      actualValues.forEach((value, position) => {
        expect(value).toBeCloseTo(solved.values[position], 7);
        expect(value).toBeGreaterThan(0);
      });
      expect(measureVisibleBoundary(visible, solved.pi, solved.largestRadius)).toBeCloseTo(expectedPerimeter, 6);
      expect(question.unit).toBe('cm');
      expect(question.hint.length).toBeGreaterThan(20);
      expect(question.workedSteps!.length).toBeGreaterThanOrEqual(4);
      expect(question.explanation).toBe(question.workedSteps!.map(step => step.text).join(' '));
      const answers = answersByKind.get(solved.kind) ?? new Set<string>();
      answers.add(question.answer);
      answersByKind.set(solved.kind, answers);

      if (solved.kind === 'linked') {
        expect(solved.largestRadius).not.toBe(8);
        expect(solved.largestRadius % 2).toBe(0);
        expect(question.structuredResponse?.kind).toBe('number-fields');
        expect(question.prompt).toContain('(a)');
        expect(question.prompt).toContain('(b)');
        expect(question.choices).toBeUndefined();
        const spec = question.structuredResponse!;
        const response = JSON.stringify(solved.values.map(value => String(Number(value.toFixed(2)))));
        expect(structuredResponseReady(spec, response)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, response)).toBe(true);
        expect(structuredResponseReady(spec, JSON.stringify([String(solved.values[0])]))).toBe(false);
        for (let part = 0; part < 2; part++) {
          const wrong = [...solved.values];
          wrong[part] += 1;
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(wrong.map(String)))).toBe(false);
        }
      } else {
        expect(solved.largestRadius % 7).toBe(0);
        expect(solved.largestRadius).toBeGreaterThan(14);
        expect(question.structuredResponse).toBeUndefined();
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices!.filter(choice => Math.abs(Number(choice) - expectedPerimeter) < 1e-7)).toHaveLength(1);
        expect(question.choices!.every(choice => Number.isFinite(Number(choice)) && Number(choice) > 0)).toBe(true);
      }
    }
  }
  expect([...answersByKind.keys()].sort()).toEqual(['cut-out', 'linked', 'unequal']);
  for (const answers of answersByKind.values()) expect(answers.size).toBeGreaterThanOrEqual(3);
});

test('generation is repeatable and exposes the required curriculum metadata', () => {
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-mixed-sector-composite-perimeter');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds).toEqual(['P6.S.CIRCLE.02', 'P6.S.CIRCLE.03']);
  for (const seed of [-100, 0, 19, 2026, 2147483647]) {
    for (const index of [0, 1, 7]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  expect(makeRagQuestion(19, 0).key).not.toBe(makeRagQuestion(19, 1).key);
});
