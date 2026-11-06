import {expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import type {Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion} from './ragP3NumberLineReadings';

type Stroke = Extract<Batch11UpperMark, {kind: 'line'}>;
type Label = Extract<Batch11UpperMark, {kind: 'text'}>;
type Dot = Extract<Batch11UpperMark, {kind: 'circle'}>;

function solvePicture(picture: Question['picture']) {
  if (picture?.type !== 'batch11-upper') throw new Error('Expected a drawn number line');
  const strokes = picture.marks.filter((m): m is Stroke => m.kind === 'line');
  const labels = picture.marks.filter((m): m is Label => m.kind === 'text');
  const dots = picture.marks.filter((m): m is Dot => m.kind === 'circle');
  const axes = strokes.filter(s => s.y1 === s.y2 && s.x1 < s.x2);
  const values = new Map<string, number>();
  const scales: number[] = [];
  for (const axis of axes) {
    const ticks = strokes.filter(s => s.x1 === s.x2 && s.y1 < axis.y1 && axis.y1 < s.y2)
      .sort((a, b) => a.x1 - b.x1);
    expect(ticks.length).toBeGreaterThan(3);
    const spacing = ticks[1].x1 - ticks[0].x1;
    for (let i = 1; i < ticks.length; i++) expect(ticks[i].x1 - ticks[i - 1].x1).toBeCloseTo(spacing);
    // Attach each printed number to the long tick above it.
    const numbers = labels.filter(t => /^\d+$/.test(t.text) && t.y > axis.y1 && t.y < axis.y1 + 45)
      .sort((a, b) => a.x - b.x);
    const height = Math.max(...ticks.map(t => t.y2 - t.y1));
    const anchors = ticks.map((t, i) => ({tick: t, i})).filter(a => a.tick.y2 - a.tick.y1 === height);
    expect(numbers.length).toBeGreaterThanOrEqual(2);
    expect(anchors).toHaveLength(numbers.length);
    const labelled = anchors.map(({tick, i}, k) => {
      const label = numbers[k];
      expect(tick.x1).toBeGreaterThanOrEqual(label.x);
      expect(tick.x1).toBeLessThan(label.x + label.text.length * 11);
      return {i, value: Number(label.text)};
    });
    const right = labelled[labelled.length - 1];
    const left = labelled[0];
    const unit = (right.value - left.value) / (right.i - left.i);
    expect(Number.isInteger(unit) && unit > 0).toBe(true);
    scales.push(unit);
    // Count backwards from the right-hand label, including unnumbered end ticks.
    const tickValues = ticks.map((_, i) => right.value - (right.i - i) * unit);
    expect(Math.min(...tickValues)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...tickValues)).toBeLessThanOrEqual(10000);
    for (const a of labelled) expect(tickValues[a.i]).toBe(a.value);
    const rowDots = dots.filter(d => d.cy === axis.y1);
    expect(rowDots.length).toBeGreaterThan(0);
    expect(rowDots.length).toBeLessThanOrEqual(2);
    expect(anchors.length).toBe(rowDots.length === 2 ? 3 : 2);
    for (const dot of rowDots) {
      const i = ticks.findIndex(t => t.x1 === dot.cx);
      expect(i).toBeGreaterThan(left.i);
      expect(i).toBeLessThan(right.i);
      expect(anchors.some(a => a.i === i)).toBe(false);
      const names = labels.filter(t => /^[PQ]$/.test(t.text) && t.y < dot.cy && t.y > dot.cy - 35
        && t.x <= dot.cx && dot.cx < t.x + 16);
      expect(names).toHaveLength(1);
      const name = names[0].text;
      expect(values.has(name)).toBe(false);
      if (anchors.length === 3) {
        expect(name === 'P' ? i < anchors[1].i : i > anchors[1].i).toBe(true);
      }
      values.set(name, tickValues[i]);
    }
  }
  expect(values.size).toBe(dots.length);
  return {values, scales};
}

test('scores the readings obtained from the visible ticks, dots and prompt', () => {
  const modes = new Set<string>();
  for (let seed = -12; seed < 60; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const {values, scales} = solvePicture(q.picture);
      const p = values.get('P');
      const other = values.get('Q');
      expect(p).toBeDefined();
      expect(q.unit).toBeUndefined();
      expect(q.choices).toBeUndefined();
      if (q.prompt.includes('both boxes')) {
        modes.add('pair');
        expect(scales).toHaveLength(1);
        expect(other).toBeDefined();
        const spec = q.structuredResponse;
        expect(spec).toEqual({kind: 'number-pair', firstLabel: 'P', secondLabel: 'Q'});
        if (!spec) throw new Error('Missing answer fields');
        const ordered = [String(p), String(other)];
        expect(q.answer).toBe(JSON.stringify(ordered));
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(ordered))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(ordered.slice().reverse()))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([ordered[0], '']))).toBe(false);
      } else if (q.prompt.includes('add')) {
        modes.add('sum');
        expect(scales).toHaveLength(2);
        expect(scales[0]).not.toBe(scales[1]);
        expect(other).toBeDefined();
        const total = Number(p) + Number(other);
        expect(total).toBeLessThanOrEqual(9999);
        expect(q.answer).toBe(String(total));
        expect(q.structuredResponse).toBeUndefined();
      } else {
        modes.add('single');
        expect(scales).toHaveLength(1);
        expect(values.size).toBe(1);
        expect(q.prompt).toContain('P');
        expect(q.answer).toBe(String(p));
        expect(q.structuredResponse).toBeUndefined();
      }
    }
  }
  expect([...modes].sort()).toEqual(['pair', 'single', 'sum']);
});

test('replays the same question and varies visible givens across indices', () => {
  const pictures = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = makeRagQuestion(37, i);
    expect(makeRagQuestion(37, i)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  expect(pictures.size).toBeGreaterThan(12);
});
