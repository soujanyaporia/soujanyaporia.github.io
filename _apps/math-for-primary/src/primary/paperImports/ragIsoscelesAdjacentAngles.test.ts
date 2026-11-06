import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragIsoscelesAdjacentAngles';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = readonly [number, number];

function visibleAngles(q: Visible): Record<string, number> {
  const result: Record<string, number> = {};
  for (const match of (q.context ?? []).join(' ').matchAll(/[Aa]ngle ([A-Z]{3}) is (\d+)°/g)) {
    result[match[1]] = Number(match[2]);
  }
  return result;
}

// Solve by searching angle assignments satisfying the visible constraints.
// This function cannot access answers, worked steps or generation parameters.
function solveVisible(q: Visible): number {
  const context = (q.context ?? []).join(' ');
  const angles = visibleAngles(q);
  const solutions: number[] = [];
  if (q.prompt.includes('BED')) {
    expect(context).toContain('C between A and D');
    expect(context).toContain('E between B and C');
    expect(context).toContain('CE = CD');
    if (!Number.isInteger(angles.BAC) || !Number.isInteger(angles.ABC)) throw Error('Missing visible angles');
    for (let target = 1; target < 180; target++) {
      const angleCED = 180 - target;
      const angleEDC = angleCED;
      const angleECD = 180 - angleCED - angleEDC;
      const angleACB = 180 - angleECD;
      if (angleECD > 0 && angleACB > 0 && angles.BAC + angles.ABC + angleACB === 180) solutions.push(target);
    }
  } else if (q.prompt.includes('KLM')) {
    expect(context).toContain('KM = LM');
    expect(context).toContain('M between K and N');
    expect(context).toContain('Ray MP splits angle LMN');
    if (!Number.isInteger(angles.LMP) || !Number.isInteger(angles.PMN)) throw Error('Missing visible angles');
    for (let target = 1; target < 90; target++) {
      const angleMKL = target;
      const angleKML = 180 - target - angleMKL;
      if (angleKML > 0 && angleKML + angles.LMP + angles.PMN === 180) solutions.push(target);
    }
  } else {
    throw Error('Unexpected question structure');
  }
  expect(solutions).toHaveLength(1);
  return solutions[0];
}

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function angle(a: Point, o: Point, b: Point): number {
  const dot = (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]);
  const cosine = dot / (distance(a, o) * distance(b, o));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

// Recover vertices from visible letter labels and the drawn segment endpoints.
function diagramPoints(q: Question): Record<string, Point> {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw Error('Missing supported diagram');
  const lines = picture.marks.filter((m): m is Extract<Mark, {kind: 'line'}> => m.kind === 'line');
  const endpoints: Point[] = lines
    .filter(m => Math.hypot(m.x2 - m.x1, m.y2 - m.y1) > 30)
    .flatMap(m => [[m.x1, m.y1] as Point, [m.x2, m.y2] as Point]);
  const points: Record<string, Point> = {};
  for (const mark of picture.marks) {
    if (mark.kind !== 'text' || !/^[A-Z]$/.test(mark.text)) continue;
    const label: Point = [mark.x, mark.y];
    const nearest = [...endpoints].sort((a, b) => distance(a, label) - distance(b, label))[0];
    expect(nearest).toBeDefined();
    expect(distance(nearest, label)).toBeLessThan(25);
    points[mark.text] = nearest;
  }
  return points;
}

function verifyDiagram(q: Question, expected: number): void {
  const p = diagramPoints(q), givens = visibleAngles(q);
  if (q.prompt.includes('BED')) {
    expect(Object.keys(p).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(distance(p.A, p.D)).toBeCloseTo(distance(p.A, p.C) + distance(p.C, p.D), 7);
    expect(distance(p.B, p.C)).toBeCloseTo(distance(p.B, p.E) + distance(p.E, p.C), 7);
    expect(distance(p.C, p.E)).toBeCloseTo(distance(p.C, p.D), 7);
    expect(angle(p.B, p.A, p.C)).toBeCloseTo(givens.BAC, 7);
    expect(angle(p.A, p.B, p.C)).toBeCloseTo(givens.ABC, 7);
    expect(angle(p.B, p.E, p.D)).toBeCloseTo(expected, 7);
  } else {
    expect(Object.keys(p).sort()).toEqual(['K', 'L', 'M', 'N', 'P']);
    expect(distance(p.K, p.N)).toBeCloseTo(distance(p.K, p.M) + distance(p.M, p.N), 7);
    expect(distance(p.K, p.M)).toBeCloseTo(distance(p.L, p.M), 7);
    expect(angle(p.L, p.M, p.P)).toBeCloseTo(givens.LMP, 7);
    expect(angle(p.P, p.M, p.N)).toBeCloseTo(givens.PMN, 7);
    expect(angle(p.L, p.M, p.N)).toBeCloseTo(givens.LMP + givens.PMN, 7);
    expect(angle(p.K, p.L, p.M)).toBeCloseTo(expected, 7);
  }
}

describe('isosceles triangles with adjacent angles', () => {
  it('independently solves visible givens and checks diagrams across varied seeds', () => {
    const seeds = [-1001, -1, 2147483647, 4294967295, ...Array.from({length: 64}, (_, i) => i)];
    const structures = new Set<string>();
    const visibleCases = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible({prompt: q.prompt, context: q.context});
        expect(q.answer).toBe(String(expected));
        expect(q.unit).toBe('degrees');
        expect(Number.isInteger(expected)).toBe(true);
        expect(expected).toBeGreaterThan(0);
        expect(expected).toBeLessThan(180);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));
        verifyDiagram(q, expected);
        const givens = visibleAngles(q);
        if (q.prompt.includes('BED')) {
          structures.add('exterior');
          expect(q.choices).toBeUndefined();
          expect(givens.BAC).not.toBe(86);
          expect(givens.ABC).not.toBe(38);
        } else {
          structures.add('adjacent');
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(choice => Number(choice) === expected)).toHaveLength(1);
          for (const choice of q.choices ?? []) {
            expect(Number.isInteger(Number(choice))).toBe(true);
            expect(Number(choice)).toBeGreaterThan(0);
            expect(Number(choice)).toBeLessThan(180);
          }
          expect(givens.LMP).not.toBe(50);
          expect(givens.PMN).not.toBe(86);
        }
        visibleCases.add(JSON.stringify([q.prompt, q.context]));
      }
    }
    expect([...structures].sort()).toEqual(['adjacent', 'exterior']);
    expect(visibleCases.size).toBeGreaterThan(20);
  });

  it('is reproducible, alternates structures by index, and declares supported skills', () => {
    for (const seed of [-23, 0, 7, 42, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (let index = 0; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(makeRagQuestion(seed, index).prompt).not.toBe(makeRagQuestion(seed, index + 1).prompt);
        expect(makeRagQuestion(seed, index).key).not.toBe(makeRagQuestion(seed, index + 1).key);
      }
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-single-isosceles-triangle-with-adjacent-angles');
    const supported = ['P5.S.ANGLE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.03'];
    expect(RAG_PATTERN.skillIds.every(id => supported.includes(id))).toBe(true);
  });
});
