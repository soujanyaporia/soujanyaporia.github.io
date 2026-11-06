import {expect, it} from 'vitest';
import type {Batch11UpperPicture} from './batch11UpperPicture';
import {makeRagQuestion} from './ragLengthFromRulerEndpoints';

function readWires(picture: Batch11UpperPicture) {
  const marks = picture.marks;
  const ticks = marks.flatMap(m => m.kind === 'line' && !m.dashed && m.x1 === m.x2 ? [m.x1] : []).sort((a, b) => a - b);
  const numbers = marks.flatMap(m => m.kind === 'text' && /^\d+$/.test(m.text) ? [m] : []).sort((a, b) => a.x - b.x);
  expect(ticks).toHaveLength(11);
  expect(numbers.map(m => Number(m.text))).toEqual(ticks.map((_, i) => i));
  numbers.forEach((m, i) => expect(Math.abs(m.x - ticks[i])).toBeLessThan(12));
  expect(marks.some(m => m.kind === 'text' && m.text === 'cm')).toBe(true);

  const dots = marks.flatMap(m => m.kind === 'circle' ? [m] : []);
  const rows = [...new Set(dots.map(m => m.cy))].sort((a, b) => a - b);
  const labels = marks.flatMap(m => m.kind === 'text' && /^[ABC]$/.test(m.text) ? [m] : []).sort((a, b) => a.y - b.y);
  expect(rows).toHaveLength(3);
  expect(labels.map(m => m.text)).toEqual(['A', 'B', 'C']);
  return rows.map((y, row) => {
    const ends = dots.filter(m => m.cy === y).map(m => m.cx).sort((a, b) => a - b);
    expect(ends).toHaveLength(2);
    const [left, right] = ends;
    expect(Math.abs(labels[row].y - y)).toBeLessThan(12);
    expect(marks.some(m => m.kind === 'line' && m.y1 === y && m.y2 === y && m.x1 === left && m.x2 === right)).toBe(true);
    for (const x of ends) {
      expect(ticks).toContain(x);
      expect(marks.some(m => m.kind === 'line' && m.dashed && m.x1 === x && m.x2 === x && m.y2 === y)).toBe(true);
    }
    const start = ticks.indexOf(left), end = ticks.indexOf(right);
    expect(end).toBeGreaterThan(start);
    const letter = labels[row].text;
    expect(picture.label).toContain(`Wire ${letter} runs from ${start} cm to ${end} cm.`);
    return {letter, start, end, length: ticks.filter(x => left <= x && x < right).length};
  });
}

it('solves the printed task using only the labelled marks and the stated piece count', () => {
  const forms = new Set<string>(), winners = new Set<string>();
  let farthestIsShorter = false;
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const picture = q.picture;
      if (picture?.type === 'batch11-upper') {
        expect(q.prompt).toMatch(/longest.*letter/i);
        const wires = readWires(picture);
        expect(wires.some(w => w.start === 0)).toBe(true);
        expect(new Set(wires.map(w => w.start)).size).toBe(3);
        expect(new Set(wires.map(w => w.length)).size).toBe(3);
        const longest = wires.reduce((a, b) => a.length > b.length ? a : b);
        expect(q.answer).toBe(longest.letter);
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBeUndefined();
        winners.add(longest.letter);
        if (wires.some(w => w.end > longest.end)) farthestIsShorter = true;
        forms.add('longest');
        continue;
      }
      if (picture?.type !== 'batch9-early' || picture.layout !== 'ruler-total') throw Error('Missing measuring scale');
      expect(picture.objects).toHaveLength(1);
      const {start, end} = picture.objects[0];
      expect(Number.isInteger(start) && Number.isInteger(end)).toBe(true);
      expect(start).toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(picture.maximum);
      const gaps = Array.from({length: picture.maximum}, (_, n) => n).filter(n => start <= n && n < end);
      expect(q.unit).toBe('cm');
      if (q.prompt.includes('total')) {
        const match = /(\d+) equal pieces of cord/.exec(q.context?.join(' ') ?? '');
        if (!match) throw Error('The number of equal pieces must be visible');
        const count = Number(match[1]);
        expect([2, 3, 4, 5, 10]).toContain(count);
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(String(gaps.length * count));
        forms.add('repeated');
      } else {
        expect(q.prompt).toMatch(/strip.*centimetres/);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(gaps.length));
        expect(q.answer).toBe(String(gaps.length));
        forms.add('single');
      }
    }
  }
  expect([...forms].sort()).toEqual(['longest', 'repeated', 'single']);
  expect([...winners].sort()).toEqual(['A', 'B', 'C']);
  expect(farthestIsShorter).toBe(true);
});

it('reproduces a question and varies the visible givens across a session', () => {
  const drawings = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    drawings.add(JSON.stringify([q.picture, q.context]));
  }
  expect(drawings.size).toBeGreaterThan(8);
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
});
