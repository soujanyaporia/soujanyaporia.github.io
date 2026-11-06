import {expect, test} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion, RAG_PATTERN} from './ragP5DecimalNumberLine';

type LineMark = Extract<Batch11UpperMark, {kind: 'line'}>;
type TextMark = Extract<Batch11UpperMark, {kind: 'text'}>;

function thousandths(label: string): number {
  expect(label).toMatch(/^\d+(?:\.\d{1,3})?$/);
  const [whole, fraction = ''] = label.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}

// This solver receives only the prompt and the displayed drawing. It cannot
// inspect the stored answer, hints, worked steps or generation parameters.
function solveVisible(q: Pick<Question, 'prompt' | 'picture'>) {
  const p = q.picture;
  if (!p || p.type !== 'batch11-upper') throw new Error('Missing number-line drawing');
  const lines = p.marks.filter((m): m is LineMark => m.kind === 'line');
  const texts = p.marks.filter((m): m is TextMark => m.kind === 'text');
  const baseline = lines.filter(l => l.y1 === l.y2)
    .sort((a, b) => Math.abs(b.x2 - b.x1) - Math.abs(a.x2 - a.x1))[0];
  if (!baseline) throw new Error('Missing horizontal number line');
  const ticks = lines.filter(l => l.x1 === l.x2
    && Math.min(l.y1, l.y2) < baseline.y1
    && Math.max(l.y1, l.y2) > baseline.y1)
    .sort((a, b) => a.x1 - b.x1);
  expect(ticks.length).toBeGreaterThanOrEqual(9);
  expect(ticks.length).toBeLessThanOrEqual(11);
  const spacing = ticks[1].x1 - ticks[0].x1;
  expect(spacing).toBeGreaterThan(20);
  for (let i = 1; i < ticks.length; i++) {
    expect(ticks[i].x1 - ticks[i - 1].x1).toBeCloseTo(spacing, 10);
  }

  function tickFor(label: TextMark): number {
    const distances = ticks.map(t => Math.abs(t.x1 - label.x));
    const nearest = distances.indexOf(Math.min(...distances));
    expect(distances[nearest]).toBeLessThan(spacing / 2);
    return nearest;
  }

  const numericLabels = texts.filter(t => /^\d+(?:\.\d+)?$/.test(t.text));
  expect(numericLabels).toHaveLength(2);
  for (const label of numericLabels) expect(label.y).toBeGreaterThan(baseline.y1);
  const anchors = numericLabels.map(t => ({tick: tickFor(t), milli: thousandths(t.text)}))
    .sort((a, b) => a.tick - b.tick);
  const markers = texts.filter(t => t.text === 'P');
  expect(markers).toHaveLength(1);
  const target = tickFor(markers[0]);
  expect(target).not.toBe(anchors[0].tick);
  expect(target).not.toBe(anchors[1].tick);
  expect(target).toBeGreaterThan(anchors[0].tick);

  // The arrow shaft must point to the same tick as the visible P label.
  const shafts = lines.filter(l => l.x1 === l.x2
    && Math.max(l.y1, l.y2) < baseline.y1);
  expect(shafts).toHaveLength(1);
  expect(shafts[0].x1).toBeCloseTo(ticks[target].x1, 10);
  expect(markers[0].y).toBeLessThan(Math.min(shafts[0].y1, shafts[0].y2));
  for (const m of p.marks) {
    if (m.kind === 'line') {
      for (const x of [m.x1, m.x2]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(320); }
      for (const y of [m.y1, m.y2]) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(200); }
    } else if (m.kind === 'text') {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(280);
      expect(m.y).toBeGreaterThan(0);
      expect(m.y).toBeLessThan(200);
    }
  }

  const count = anchors[1].tick - anchors[0].tick;
  const difference = anchors[1].milli - anchors[0].milli;
  expect(difference).toBeGreaterThan(0);
  expect(difference % count).toBe(0);
  const interval = difference / count;
  let rawMilli = anchors[0].milli;
  for (let tick = anchors[0].tick; tick < target; tick++) rawMilli += interval;
  expect(rawMilli).toBeGreaterThan(0);
  expect(rawMilli).toBeLessThan(11000);

  const rounded = /1 decimal place/.test(q.prompt);
  let resultMilli = rawMilli;
  if (rounded) {
    // Compare distances to the two neighbouring tenths; ties go upwards.
    const lower = Math.floor(rawMilli / 100) * 100;
    const upper = lower + 100;
    resultMilli = rawMilli - lower < upper - rawMilli ? lower : upper;
  }
  return {
    answer: rounded ? (resultMilli / 1000).toFixed(1) : String(rawMilli / 1000),
    rawMilli,
    resultMilli,
    rounded,
    extrapolated: target > anchors[1].tick,
  };
}

test('independently solves visible labels and ticks across varied seeds and indices', () => {
  const seeds = [-99, -1, ...Array.from({length: 160}, (_, i) => i), 2147483647];
  const formats = new Set<string>();
  let sawExtrapolation = false;
  let sawUp = false;
  let sawDown = false;
  let sawHalf = false;
  let sawCarry = false;
  for (const seed of seeds) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible({prompt: q.prompt, picture: q.picture});
      expect(q.answer).toBe(solved.answer);
      expect(q.unit).toBeUndefined();
      expect(q.workedSteps?.length).toBe(solved.rounded ? 4 : 3);
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.explanation.length).toBeGreaterThan(50);
      sawExtrapolation ||= solved.extrapolated;
      if (q.choices) {
        formats.add('choice-exact');
        expect(solved.rounded).toBe(false);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map(Number)).size).toBe(4);
        expect(q.choices.filter(c => Number(c) === Number(solved.answer))).toHaveLength(1);
      } else {
        formats.add(solved.rounded ? 'entry-rounded' : 'entry-exact');
      }
      if (solved.rounded) {
        expect(q.answer).toMatch(/^\d+\.\d$/);
        expect(solved.rawMilli % 100).not.toBe(0);
        sawUp ||= solved.resultMilli > solved.rawMilli;
        sawDown ||= solved.resultMilli < solved.rawMilli;
        sawHalf ||= solved.rawMilli % 100 === 50;
        sawCarry ||= Math.floor(solved.resultMilli / 1000) > Math.floor(solved.rawMilli / 1000);
      }
    }
  }
  expect([...formats].sort()).toEqual(['choice-exact', 'entry-exact', 'entry-rounded']);
  expect(sawExtrapolation).toBe(true);
  expect(sawUp).toBe(true);
  expect(sawDown).toBe(true);
  expect(sawHalf).toBe(true);
  expect(sawCarry).toBe(true);
});

test('keeps a reproducible level-five family with varied visible questions', () => {
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-decimal-number-line-reading');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds).toEqual(['P4.S.DEC.01', 'P5.S.FRAC.03', 'P4.S.DEC.04']);
  const visible = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    const q = makeRagQuestion(seed, 3);
    expect(makeRagQuestion(seed, 3)).toEqual(q);
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 4).key).not.toBe(q.key);
    visible.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(visible.size).toBeGreaterThan(30);
});
