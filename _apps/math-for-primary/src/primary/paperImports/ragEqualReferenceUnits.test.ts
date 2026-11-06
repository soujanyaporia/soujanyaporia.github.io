import {expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion} from './ragEqualReferenceUnits';

function visibleNumber(lines: string[] | undefined, pattern: RegExp): number {
  const match = pattern.exec((lines ?? []).join(' '));
  if (!match) throw new Error('Missing measurement or copy count');
  return Number(match[1]);
}

function solve(q: Question) {
  const p = q.picture;
  if (p?.type === 'paper' && p.layout === 'bars') {
    const [strip, row] = p.rows;
    expect(strip.label).toBe('Strip');
    expect(strip.parts).toHaveLength(1);
    expect(row.label).toBe('Tiles');
    const tiles = row.parts;
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.every(t => t.label === 'tile' && t.size === tiles[0].size && t.size > 0)).toBe(true);
    expect(tiles.reduce((sum, tile) => sum + tile.size, 0)).toBe(strip.parts[0].size);
    if (q.prompt.includes('centimetres')) {
      const cm = visibleNumber(q.context, /Each tile is (\d+) cm long/);
      const total = tiles.reduce(sum => sum + cm, 0);
      return {form: 'tile length', answer: String(total), unit: 'cm'};
    }
    expect(q.prompt).toMatch(/how many tiles/i);
    return {form: 'tile count', answer: String(tiles.length), unit: 'tiles'};
  }
  if (p?.type === 'batch9-early' && p.layout === 'ruler-total') {
    expect(p.objects.every(o => Number.isInteger(o.start) && Number.isInteger(o.end)
      && 0 <= o.start && o.start < o.end && o.end <= p.maximum)).toBe(true);
    if (p.objects.length === 1) {
      const tape = p.objects[0];
      expect(tape.start).toBeGreaterThan(0);
      const copies = visibleNumber(q.context, /There are (\d+) equal pieces of tape/);
      const cm = Array.from({length: copies}, () => tape.end - tape.start).reduce((a, b) => a + b, 0);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(`${tape.end * copies} cm`);
      return {form: 'tape choice', answer: `${cm} cm`, unit: undefined};
    }
    expect(p.objects).toHaveLength(2);
    const long = p.objects.find(o => o.label === 'Long strip');
    const short = p.objects.find(o => o.label === 'Short strip');
    if (!long || !short) throw new Error('The ruler must show both strips');
    expect([long.start, short.start]).toEqual([0, 0]);
    const step = short.end - short.start;
    let mark = long.start;
    let strips = 0;
    while (mark < long.end) {
      mark += step;
      strips++;
    }
    expect(mark).toBe(long.end);
    return {form: 'strip count', answer: String(strips), unit: 'strips'};
  }
  if (p?.type === 'batch11-upper') {
    const marbles = p.marks.filter(m => m.kind === 'circle');
    expect(p.marks.some(m => m.kind === 'text' && m.text === 'Box')).toBe(true);
    expect(marbles.length).toBeGreaterThan(1);
    expect(p.label).toContain(`${marbles.length} marbles`);
    const grams = visibleNumber(q.context, /Each marble weighs (\d+) g/);
    const mass = marbles.reduce(sum => sum + grams, 0);
    return {form: 'balance', answer: String(mass), unit: 'g'};
  }
  throw new Error('No readable reference-unit diagram');
}

it('solves every response form from the figure and the pupil’s text', () => {
  const outcomes = new Map<string, Set<string>>();
  for (let seed = -10; seed < 70; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solve(q);
      expect(q.answer).toBe(expected.answer);
      expect(q.unit).toBe(expected.unit);
      expect(correctAnswer(q, expected.answer)).toBe(true);
      if (expected.form === 'tape choice') {
        expect(q.choices?.filter(option => correctAnswer(q, option))).toEqual([expected.answer]);
      } else {
        expect(q.choices).toBeUndefined();
      }
      const answers = outcomes.get(expected.form) ?? new Set<string>();
      answers.add(expected.answer);
      outcomes.set(expected.form, answers);
    }
  }
  expect([...outcomes.keys()].sort()).toEqual(['balance', 'strip count', 'tape choice', 'tile count', 'tile length']);
  for (const answers of outcomes.values()) expect(answers.size).toBeGreaterThan(2);
});

it('recreates the same question and varies the visible givens with the index', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(4);
});
