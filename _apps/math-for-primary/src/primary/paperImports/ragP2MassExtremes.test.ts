import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { Batch10MiddleDiagram } from './Batch10MiddleDiagram';
import { makeRagQuestion } from './ragP2MassExtremes';

// Read one rendered dial from its numbered face, tick marks and pointer.
function readGrams(svg: string): number {
  const capacity = svg.match(/>0\/(\d+)<\/text>/);
  const pointer = svg.match(/data-mass-pointer="true" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
  if (!capacity || !pointer) throw new Error('Missing dial label or pointer');
  const [cx, cy, x, y] = pointer.slice(1).map(Number);
  const tickCount = (svg.match(/<line\b/g) ?? []).length - 1;
  const fullTurn = 2 * Math.PI;
  const angle = Math.atan2(x - cx, cy - y);
  const tick = ((angle + fullTurn) % fullTurn) * tickCount / fullTurn;
  const gramsPerTick = Number(capacity[1]) / tickCount;
  expect(tick).toBeCloseTo(Math.round(tick), 7);
  expect(gramsPerTick).toBe(5);
  return Math.round(tick) * gramsPerTick;
}

it('solves each prompt from the displayed scales and grades a single gram answer', () => {
  const positions = new Set<number>();
  const totals = new Set<number>();
  const differences = new Set<number>();
  for (let seed = 0; seed < 24; seed++) {
    for (const index of [0, 1]) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'batch10-middle' || q.picture.layout !== 'mass-pair') throw new Error('Missing weighing scales');
      const html = renderToStaticMarkup(createElement(Batch10MiddleDiagram, { model: q.picture }));
      const grams = (html.match(/<svg\b[\s\S]*?<\/svg>/g) ?? []).map(readGrams);
      const together = q.prompt.includes('weigh together');
      if (!together) expect(q.prompt).toContain('grams heavier');
      expect(grams).toHaveLength(together ? 3 : 4);
      expect(new Set(grams).size).toBe(grams.length);
      expect(grams.every(value => value > 0 && value < 200)).toBe(true);
      const low = Math.min(...grams);
      const high = Math.max(...grams);
      positions.add(grams.indexOf(high));
      const expected = together ? high + low : high - low;
      (together ? totals : differences).add(expected);
      expect(q.unit).toBe('g');
      expect(q.answer).toBe(String(expected));
      expect(correctAnswer(q, String(expected))).toBe(true);
      expect(correctAnswer(q, String(together ? high - low : high + low))).toBe(false);
      expect(correctAnswer(q, String(grams.reduce((sum, mass) => sum + mass, 0)))).toBe(false);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${high} g ${together ? '+' : '−'} ${low} g = ${expected} g`);
    }
  }
  expect(positions.size).toBeGreaterThan(2);
  expect(totals.size).toBeGreaterThan(4);
  expect(differences.size).toBeGreaterThan(4);
});

it('replays the same dials and visits both tasks at consecutive indices', () => {
  for (const seed of [-7, 0, 41, 205]) {
    const first = makeRagQuestion(seed, 0);
    expect(makeRagQuestion(seed)).toEqual(first);
    expect(makeRagQuestion(seed, 1).prompt).not.toBe(first.prompt);
  }
});
