import {expect, it} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperPicture, Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion} from './ragRouteAndPathLength';

type TextMark = Extract<Batch11UpperMark, {kind: 'text'}>;

function readSpan(q: Question): number[] {
  const order = /From left to right they are ([A-Z]), ([A-Z]), ([A-Z])\./.exec(q.context?.[0] ?? '')?.slice(1);
  const ends = /How far is flag ([A-Z]) from flag ([A-Z])\?/.exec(q.prompt)?.slice(1);
  if (!order || !ends) throw Error('Missing flag order or endpoints');
  expect(new Set(order).size).toBe(3);
  const gaps = new Map<string, number>();
  for (const row of q.context!.slice(1)) {
    const match = /^Flag ([A-Z]) is (\d+) m from flag ([A-Z])\.$/.exec(row);
    if (!match) throw Error('Missing distance');
    gaps.set([match[1], match[3]].sort().join(''), Number(match[2]));
  }
  const [start, end] = ends.map(name => order.indexOf(name)).sort((a, b) => a - b);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const legs: number[] = [];
  for (let i = start; i < end; i++) {
    const length = gaps.get([order[i], order[i + 1]].sort().join(''));
    if (length === undefined) throw Error('Missing intervening gap');
    legs.push(length);
  }
  return legs;
}

function closestText(texts: TextMark[], x: number, y: number): TextMark {
  if (!texts.length) throw Error('Missing map label');
  return texts.reduce((a, b) => Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b);
}

function readWalk(picture: Batch11UpperPicture, display: string): number[] {
  const text = picture.marks.flatMap(mark => mark.kind === 'text' ? [mark] : []);
  const places = text.filter(mark => /^[A-Za-z]+$/.test(mark.text));
  const lengths = text.filter(mark => /^\d+ m$/.test(mark.text));
  expect(places).toHaveLength(3);
  expect(lengths).toHaveLength(3);
  const roads = new Map<string, number>();
  for (const line of picture.marks) {
    if (line.kind !== 'line') continue;
    const from = closestText(places, line.x1, line.y1).text;
    const to = closestText(places, line.x2, line.y2).text;
    expect(from).not.toBe(to);
    const midway = closestText(lengths, (line.x1 + line.x2) / 2, (line.y1 + line.y2) / 2);
    roads.set([from, to].sort().join('/'), parseInt(midway.text, 10));
  }
  expect(roads.size).toBe(3);
  expect(new Set(roads.values()).size).toBe(3);
  const stops = display.split(' → ');
  expect(new Set(stops).size).toBe(3);
  return stops.slice(1).map((to, i) => {
    const leg = roads.get([stops[i], to].sort().join('/'));
    if (leg === undefined) throw Error('Arrow does not follow a mapped path');
    return leg;
  });
}

function longestString(picture: Batch11UpperPicture): string {
  const labels = picture.marks.flatMap(mark => mark.kind === 'text' ? [mark] : []);
  const paths = picture.marks.flatMap(mark => mark.kind === 'path' ? [mark] : []);
  expect(paths).toHaveLength(3);
  expect(labels).toHaveLength(3);
  const spans = new Set<string>();
  const measured = paths.map(path => {
    const tokens = path.d.trim().split(/\s+/);
    let length = 0;
    let x = Number(tokens[1]), y = Number(tokens[2]);
    const left = x, row = y;
    expect(tokens[0]).toBe('M');
    expect(tokens.length % 3).toBe(0);
    for (let i = 3; i < tokens.length; i += 3) {
      expect(tokens[i]).toBe('L');
      const nextX = Number(tokens[i + 1]), nextY = Number(tokens[i + 2]);
      expect(nextX >= 0 && nextX <= 320 && nextY >= 0 && nextY <= 200).toBe(true);
      length += Math.hypot(nextX - x, nextY - y);
      x = nextX; y = nextY;
    }
    expect(y).toBe(row);
    spans.add(`${left}/${x}`);
    return {letter: closestText(labels, left, row).text, length};
  }).sort((a, b) => b.length - a.length);
  expect(spans.size).toBe(1);
  expect(new Set(measured.map(item => item.letter)).size).toBe(3);
  expect(measured[0].length - measured[1].length).toBeGreaterThan(10);
  return measured[0].letter;
}

it('solves from the printed flag order, map labels and arrows, or traced strings', () => {
  const shapes = new Set<string>(), winners = new Set<string>();
  for (let seed = -2; seed < 38; seed++) {
    for (let index = 0; index < 9; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.prompt.includes('string')) {
        if (q.picture?.type !== 'batch11-upper') throw Error('Missing strings');
        const winner = longestString(q.picture);
        expect(q.answer).toBe(winner);
        expect(q.unit).toBeUndefined();
        winners.add(winner);
        continue;
      }
      const walk = q.display !== undefined;
      let legs: number[];
      if (walk) {
        if (q.picture?.type !== 'batch11-upper') throw Error('Missing map');
        legs = readWalk(q.picture, q.display!);
        expect(new Set(legs).size).toBe(2);
      } else {
        legs = readSpan(q);
      }
      const metres = legs.reduce((sum, metres) => sum + metres, 0);
      expect(legs.every(n => Number.isInteger(n) && n > 0)).toBe(true);
      expect(metres).toBeLessThan(1000);
      expect(q.answer).toBe(String(metres));
      expect(q.unit).toBe('m');
      shapes.add(`${walk ? 'walk' : 'span'}/${legs.length}`);
    }
  }
  expect(shapes).toEqual(new Set(['span/1', 'span/2', 'walk/2', 'walk/3']));
  expect(winners).toEqual(new Set(['J', 'K', 'L']));
});

it('replays the question and its worked example for the same seed and index', () => {
  for (const seed of [0, 7, -19, 701]) {
    for (let index = -1; index < 9; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  }
});
