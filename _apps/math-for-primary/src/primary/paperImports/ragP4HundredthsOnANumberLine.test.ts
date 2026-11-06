import {expect, test} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion} from './ragP4HundredthsOnANumberLine';

type Line = Extract<Batch11UpperMark, {kind: 'line'}>;
type Label = Extract<Batch11UpperMark, {kind: 'text'}>;

// Read the two printed numbers and the dot, then count back from the right.
function readDrawing(picture: Question['picture'], prompt: string) {
  if (picture?.type !== 'batch11-upper') throw new Error('Missing number line');
  const lines = picture.marks.filter((m): m is Line => m.kind === 'line');
  const axes = lines.filter(l => l.y1 === l.y2);
  expect(axes).toHaveLength(1);
  const axis = axes[0];
  const ticks = lines.filter(l => l.x1 === l.x2 && l.y1 < axis.y1 && l.y2 > axis.y1)
    .map(l => l.x1).sort((a, b) => a - b);
  const spacing = ticks[1] - ticks[0];
  expect(spacing).toBeGreaterThan(0);
  ticks.slice(1).forEach((x, i) => expect(x - ticks[i]).toBe(spacing));
  expect(axis.x1).toBeLessThanOrEqual(ticks[0]);
  expect(axis.x2).toBeGreaterThanOrEqual(ticks[ticks.length - 1]);

  const labels = picture.marks.filter((m): m is Label => m.kind === 'text');
  const numbers = labels.filter(m => /^\d+\.\d$/.test(m.text)).sort((a, b) => a.x - b.x);
  expect(numbers).toHaveLength(2);
  function tickAtLabel(label: Label) {
    const matches = ticks.filter(x => Math.abs(x - label.x) < spacing / 2);
    expect(matches).toHaveLength(1);
    return ticks.indexOf(matches[0]);
  }
  const [left, right] = numbers.map(tickAtLabel);
  const gaps = right - left;
  expect(gaps).toBe(10);
  const [low, high] = numbers.map(m => Math.round(Number(m.text) * 100));
  const step = (high - low) / gaps;
  expect(step).toBe(1);

  const dots = picture.marks.filter((m): m is Extract<Batch11UpperMark, {kind: 'circle'}> => m.kind === 'circle');
  expect(dots).toHaveLength(1);
  const dot = dots[0];
  expect(dot.cy).toBe(axis.y1);
  const marked = ticks.indexOf(dot.cx);
  expect(marked).toBeGreaterThan(left);
  expect(marked).toBeLessThan(right);
  const letters = labels.filter(m => /^[A-Z]$/.test(m.text));
  expect(letters).toHaveLength(1);
  expect(tickAtLabel(letters[0])).toBe(marked);
  expect(prompt).toContain(`dot labelled ${letters[0].text}`);
  return {
    expected: ((high - (right - marked) * step) / 100).toFixed(2),
    offset: marked - left,
    extended: left > 0 && right < ticks.length - 1,
  };
}

test('both response formats agree with the marked tick across seeds and indices', () => {
  const offsets = new Set<number>();
  const layouts = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const {expected, offset, extended} = readDrawing(q.picture, q.prompt);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBeUndefined();
      offsets.add(offset);
      if (q.choices) {
        expect(q.prompt).toMatch(/^Which/);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map(Number)).size).toBe(4);
        expect(q.choices.filter(s => Number(s) === Number(expected))).toHaveLength(1);
        layouts.add('choice');
      } else {
        expect(q.prompt).toMatch(/^Write/);
        layouts.add(extended ? 'extended entry' : 'entry');
      }
    }
  }
  expect(offsets.size).toBe(9);
  expect(layouts).toEqual(new Set(['entry', 'extended entry', 'choice']));
});

test('seed and index reproduce the same item and a run contains different drawings', () => {
  const drawings = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    drawings.add(JSON.stringify(q.picture));
  }
  expect(drawings.size).toBeGreaterThan(1);
});
