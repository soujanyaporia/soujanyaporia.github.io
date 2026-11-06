import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeRagQuestion, RAG_PATTERN} from './ragProtractorMeasurement';
import {Batch8AnglesDiagram} from './Batch8AnglesDiagram';
import {correctAnswer, type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

function rays(q: Pick<Question, 'picture'>) {
  const picture = q.picture;
  if (picture?.type !== 'batch8-angles' || picture.layout !== 'rays') {
    throw new Error('A visible two-arm angle is required');
  }
  return picture;
}

// Only the displayed vertex and endpoints enter this solver.
// The answer, worked steps, seed and arc-angle parameters are not used.
function measureVisible(q: Pick<Question, 'picture'>): number {
  const picture = rays(q);
  const p = picture.ends.find(point => point.label === 'P');
  const r = picture.ends.find(point => point.label === 'R');
  if (!p || !r || picture.vertex.label !== 'Q' || picture.ends.length !== 2) {
    throw new Error('The named angle is incomplete');
  }
  const u = [p.x - picture.vertex.x, p.y - picture.vertex.y];
  const v = [r.x - picture.vertex.x, r.y - picture.vertex.y];
  const lengths = Math.hypot(...u) * Math.hypot(...v);
  if (!lengths) throw new Error('An arm has no length');
  const cosine = (u[0] * v[0] + u[1] * v[1]) / lengths;
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

const seeds = [-2147483648, -7, 2147483647, ...Array.from({length: 96}, (_, i) => i)];

describe('protractor measurement candidate', () => {
  it('has the requested level and existing measurement skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('protractor-measurement');
    expect(RAG_PATTERN.skillIds).toContain('P4.S.ANGLE.02');
    for (const id of RAG_PATTERN.skillIds) {
      expect(CURRICULUM_SKILLS.some(skill => skill.id === id)).toBe(true);
    }
  });

  it('independently solves the visible rays across seeds and indices', () => {
    const answers = new Set<number>();
    const sides = new Set<string>();
    const labels = new Set<string>();
    const baselines = new Set<number>();
    for (const seed of seeds) for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const picture = rays(q);
      const measured = measureVisible({picture: q.picture});
      const expected = Math.round(measured);
      answers.add(expected);
      sides.add(picture.ends[0].x < picture.vertex.x ? 'left' : 'right');
      labels.add(picture.markLabel ?? '');
      baselines.add(Math.round(Math.atan2(
        picture.vertex.y - picture.ends[0].y,
        picture.ends[0].x - picture.vertex.x,
      ) * 180 / Math.PI));
      expect(measured).toBeCloseTo(expected, 8);
      expect(expected).toBeGreaterThan(90);
      expect(expected).toBeLessThan(180);
      expect(q.answer).toBe(String(expected));
      expect(q.unit).toBe('°');
      expect(correctAnswer(q, String(expected))).toBe(true);
      expect(correctAnswer(q, String(180 - expected))).toBe(false);
      expect(correctAnswer(q, String(expected + 5))).toBe(false);
      expect(picture.mark[1] - picture.mark[0]).toBeCloseTo(measured, 8);
      expect(q.choices).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.angleConstruction).toBeUndefined();
      expect(q).toEqual(makeRagQuestion(seed, index));
      for (const point of [picture.vertex, ...picture.ends]) {
        expect(point.x).toBeGreaterThan(25);
        expect(point.x).toBeLessThan(475);
        expect(point.y).toBeGreaterThan(25);
        expect(point.y).toBeLessThan(330);
      }
    }
    expect(answers.size).toBeGreaterThanOrEqual(6);
    expect(sides).toEqual(new Set(['left', 'right']));
    expect(labels).toEqual(new Set(['x', '?']));
    expect(baselines.size).toBeGreaterThanOrEqual(4);
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
    expect(makeRagQuestion(17, 0).key).not.toBe(makeRagQuestion(17, 1).key);
  });

  it('keeps the initial diagram unnumbered and aligns a protractor only in the solution', () => {
    for (const seed of seeds) {
      const q = makeRagQuestion(seed, 2);
      const picture = rays(q);
      const measured = Math.round(measureVisible({picture}));
      const initial = renderToStaticMarkup(createElement(Batch8AnglesDiagram, {model: picture}));
      expect(picture.protractorRotation).toBeUndefined();
      expect(picture.closeShape).toBeUndefined();
      expect(initial).toContain('viewBox="0 0 500 360"');
      expect(initial).toContain('role="img"');
      expect(initial).not.toMatch(/data-protractor|NaN|Infinity|undefined/);
      expect(initial).not.toMatch(/>\s*\d+(?:°)?\s*<\/text>/);
      expect([q.prompt, ...(q.context ?? []), q.hint].join(' ')).not.toMatch(/\d/);
      expect(q.workedSteps).toHaveLength(3);
      const aligned = rays({picture: q.workedSteps![1].picture});
      expect(aligned.vertex).toEqual(picture.vertex);
      expect(aligned.ends).toEqual(picture.ends);
      const rotation = aligned.protractorRotation;
      expect(rotation).toBeDefined();
      if (rotation === undefined) throw new Error('Missing aligned protractor');
      const directions = picture.ends.map(point => Math.atan2(
        picture.vertex.y - point.y, point.x - picture.vertex.x,
      ) * 180 / Math.PI);
      const zeroOffset = directions[0] - rotation;
      expect(Math.min(Math.abs(zeroOffset), Math.abs(zeroOffset - 180))).toBeLessThan(1e-8);
      expect(directions[1] - rotation).toBeGreaterThan(0);
      expect(directions[1] - rotation).toBeLessThan(180);
      // Check the full solution tool fits the renderer's viewBox, including rotation.
      for (let tick = 0; tick <= 180; tick++) {
        const a = (rotation + tick) * Math.PI / 180;
        const x = aligned.vertex.x + 175 * Math.cos(a);
        const y = aligned.vertex.y - 175 * Math.sin(a);
        expect(x).toBeGreaterThan(20);
        expect(x).toBeLessThan(480);
        expect(y).toBeGreaterThan(20);
        expect(y).toBeLessThan(340);
      }
      const finalPicture = rays({picture: q.workedSteps![2].picture});
      expect(finalPicture.markLabel).toBe(measured + '°');
      expect(measureVisible({picture: finalPicture})).toBeCloseTo(measured, 8);
      const solution = renderToStaticMarkup(createElement(Batch8AnglesDiagram, {model: finalPicture}));
      expect(solution).toContain('data-protractor="dual-scale"');
      expect(solution).toContain('>' + measured + '°</text>');
      expect(solution).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
