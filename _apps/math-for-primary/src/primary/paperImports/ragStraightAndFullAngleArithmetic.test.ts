import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragStraightAndFullAngleArithmetic';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Diagram = Extract<NonNullable<Question['picture']>, { type: 'batch11-upper' }>;
type Mark = Diagram['marks'][number];
type Vector = [number, number];

function targetOf(q: Visible): string {
  const match = /angle ([A-Z]O[A-Z])\?/.exec(q.prompt);
  if (!match) throw new Error('Missing visible target');
  return match[1];
}

function given(q: Visible, name: string): number {
  const match = new RegExp(`^Angle ${name} = (\\d+)°\\.$`, 'm').exec((q.context ?? []).join('\n'));
  if (!match) throw new Error(`Missing visible angle ${name}`);
  return Number(match[1]);
}

// Enumerate solutions to angle facts stated in the visible question.
// This function receives no answer, explanation, proof or generation parameters.
function solveVisible(q: Visible): number {
  const context = (q.context ?? []).join('\n');
  const target = targetOf(q);
  const solutions: number[] = [];
  if (target === 'SOQ') {
    if (!context.includes('P, O and Q lie on a straight line') ||
        !context.includes('OP, OR, OS, OQ')) throw new Error('Missing straight-line order');
    const first = given(q, 'POR');
    const second = given(q, 'ROS');
    for (let unknown = 1; unknown < 180; unknown++) {
      if (first + second + unknown === 180) solutions.push(unknown);
    }
  } else if (target === 'ROS') {
    if (!context.includes('P, O and Q lie on a straight line') ||
        !context.includes('OP, OR, OS, OQ') ||
        !context.includes('Angle SOT is a right angle, with OQ inside it.')) {
      throw new Error('Missing linked-angle constraints');
    }
    const first = given(q, 'POR');
    const lower = given(q, 'QOT');
    for (let middle = 1; middle < 90; middle++) {
      for (let unknown = 1; unknown < 180; unknown++) {
        if (middle + lower === 90 && first + unknown + middle === 180) {
          solutions.push(unknown);
        }
      }
    }
  } else if (target === 'ROQ') {
    if (!context.includes('Ray OR is inside the smaller angle POQ.') ||
        !context.includes('Angle POR is a right angle.')) throw new Error('Missing reflex partition');
    const match = /The reflex angle POQ = (\d+)°\./.exec(context);
    if (!match) throw new Error('Missing reflex measure');
    const reflex = Number(match[1]);
    if (reflex <= 180 || reflex >= 360) throw new Error('Invalid reflex angle');
    for (let unknown = 1; unknown < 180; unknown++) {
      if (unknown + 90 + reflex === 360) solutions.push(unknown);
    }
  } else {
    throw new Error(`Unexpected target ${target}`);
  }
  if (solutions.length !== 1) throw new Error(`Expected one solution; found ${solutions.length}`);
  return solutions[0];
}

function pictureOf(q: Question): Diagram {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  return q.picture;
}

function raysFromLabels(picture: Diagram): Record<string, Vector> {
  const lines = picture.marks.filter((m): m is Extract<Mark, { kind: 'line' }> => m.kind === 'line');
  const labels = picture.marks.filter((m): m is Extract<Mark, { kind: 'text' }> => m.kind === 'text' && /^[PQRST]$/.test(m.text));
  if (!lines.length || lines.length !== labels.length) throw new Error('Unlabelled or missing ray');
  const rays: Record<string, Vector> = {};
  for (const label of labels) {
    const distance = (line: typeof lines[number]) => (line.x2 - label.x) ** 2 + (line.y2 - label.y) ** 2;
    const nearest = lines.reduce((best, line) => distance(line) < distance(best) ? line : best);
    expect(nearest.x1).toBe(lines[0].x1);
    expect(nearest.y1).toBe(lines[0].y1);
    rays[label.text] = [nearest.x2 - nearest.x1, nearest.y2 - nearest.y1];
  }
  expect(new Set(Object.values(rays).map(v => v.join(','))).size).toBe(labels.length);
  return rays;
}

function angle(rays: Record<string, Vector>, name: string): number {
  const a = rays[name[0]];
  const b = rays[name[2]];
  if (!a || !b) throw new Error(`Missing rays for ${name}`);
  const cosine = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

const seeds = [-2147483648, -17, -1, 0, 1, 2, 7, 99, 2026, 2147483647,
  ...Array.from({ length: 70 }, (_, i) => i * 137 + 23)];

describe('straight and full angle arithmetic candidate', () => {
  it('has an independently solvable answer across seeds and indices', () => {
    const forms = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const visible: Visible = { prompt: q.prompt, context: q.context };
        const expected = solveVisible(visible);
        expect(q.answer).toBe(String(expected));
        expect(Number.isInteger(expected)).toBe(true);
        expect(expected).toBeGreaterThan(0);
        expect(expected).toBeLessThan(180);
        expect(q.unit).toBe('degrees');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps).toHaveLength(2);
        expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));
        expect(q.hint.length).toBeGreaterThan(20);
        forms.add(targetOf(visible));
        visibleQuestions.add(JSON.stringify(visible));
      }
    }
    expect([...forms].sort()).toEqual(['ROQ', 'ROS', 'SOQ']);
    expect(visibleQuestions.size).toBeGreaterThan(40);
  });

  it('draws the visible measures, right angles, straight lines and reflex sweep consistently', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const picture = pictureOf(q);
        const rays = raysFromLabels(picture);
        const context = (q.context ?? []).join('\n');
        for (const match of context.matchAll(/^Angle ([A-Z]O[A-Z]) = (\d+)°\.$/gm)) {
          expect(angle(rays, match[1])).toBeCloseTo(Number(match[2]), 7);
          expect(picture.marks.some(m => m.kind === 'text' && m.text === `${match[2]}°`)).toBe(true);
        }
        if (context.includes('P, O and Q lie on a straight line')) {
          expect(angle(rays, 'POQ')).toBeCloseTo(180, 5);
          expect(rays.R[1]).toBeLessThan(0);
          expect(rays.S[1]).toBeLessThan(0);
        }
        if (context.includes('Angle SOT is a right angle')) {
          expect(angle(rays, 'SOT')).toBeCloseTo(90, 7);
          expect(rays.T[1]).toBeGreaterThan(0);
          expect(angle(rays, 'SOQ') + angle(rays, 'QOT')).toBeCloseTo(90, 7);
        }
        if (context.includes('Angle POR is a right angle.')) {
          expect(angle(rays, 'POR')).toBeCloseTo(90, 7);
          const match = /The reflex angle POQ = (\d+)°\./.exec(context);
          if (!match) throw new Error('Missing reflex label');
          expect(360 - angle(rays, 'POQ')).toBeCloseTo(Number(match[1]), 7);
          expect(angle(rays, 'POR') + angle(rays, 'ROQ')).toBeCloseTo(angle(rays, 'POQ'), 7);
          expect(picture.marks.some(m => m.kind === 'path' && / A [\d.]+ [\d.]+ 0 1 0 /.test(m.d))).toBe(true);
        }
        if (context.includes('is a right angle')) {
          expect(picture.marks.some(m => m.kind === 'path' && (m.d.match(/ L /g) ?? []).length === 2)).toBe(true);
        }
        expect(angle(rays, targetOf(q))).toBeCloseTo(solveVisible({ prompt: q.prompt, context: q.context }), 7);
        expect(picture.marks.filter(m => m.kind === 'text' && m.text === '?')).toHaveLength(1);
        for (const mark of picture.marks) {
          const positions = mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]] :
            mark.kind === 'text' ? [[mark.x, mark.y]] : [];
          for (const [x, y] of positions) {
            expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(320);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(200);
          }
        }
      }
    }
  });

  it('uses visible givens independently of stored answers and reacts to changed givens', () => {
    const variants = Array.from({ length: 3 }, (_, index) => makeRagQuestion(19, index));
    const q = variants.find(value => targetOf(value) === 'SOQ');
    if (!q) throw new Error('Missing straight-angle example');
    const before = solveVisible({ prompt: q.prompt, context: q.context });
    const changed: Visible = {
      prompt: q.prompt,
      context: q.context?.map(line => line.replace(/^Angle POR = (\d+)°\.$/, (_, value: string) => `Angle POR = ${Number(value) + 1}°.`)),
    };
    expect(solveVisible(changed)).toBe(before - 1);
    expect(solveVisible({ prompt: q.prompt, context: q.context })).toBe(before);
    const incomplete = { prompt: q.prompt, context: q.context?.filter(line => !line.startsWith('Angle ROS =')) };
    expect(() => solveVisible(incomplete)).toThrow('Missing visible angle ROS');
  });

  it('is deterministic and exposes valid family metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-straight-and-full-angle-arithmetic');
    const skills = new Set(['P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.ANGLE.04']);
    for (const skill of RAG_PATTERN.skillIds) expect(skills.has(skill)).toBe(true);
    for (const seed of [-8, 0, 57, 999]) {
      const questions = Array.from({ length: 3 }, (_, index) => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.prompt)).size).toBe(3);
      expect(new Set(questions.map(q => q.key)).size).toBe(3);
      questions.forEach((q, index) => expect(makeRagQuestion(seed, index)).toEqual(q));
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
