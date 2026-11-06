import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { Batch11UpperDiagram } from './Batch11UpperDiagram';
import { makeRagQuestion } from './ragComponentPlaneShapeInventory';

function tallyDrawing(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw Error('Missing train drawing');
  const svg = renderToStaticMarkup(createElement(Batch11UpperDiagram, { model: q.picture }));
  const tally = { squares: 0, rectangles: 0, triangles: 0, circles: 0 };
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)];
  const footprints = new Set<string>();
  for (const [, path] of paths) {
    expect(path.trim()).toMatch(/Z$/i);
    const points = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    const footprint = points.map(p => p.join(',')).sort().join('|');
    expect(footprints.has(footprint)).toBe(false);
    footprints.add(footprint);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(320);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(200);
    }
    const edges = points.map(([x, y], i) => {
      const [nextX, nextY] = points[(i + 1) % points.length];
      return [nextX - x, nextY - y];
    });
    if (edges.length === 3) {
      const [[a, b], [c, d]] = edges;
      expect(Math.abs(a * d - b * c)).toBeGreaterThan(0);
      tally.triangles++;
    } else {
      expect(edges).toHaveLength(4);
      const lengths = edges.map(([dx, dy], i) => {
        const [vx, vy] = edges[(i + 1) % 4];
        expect(Math.abs(dx * vx + dy * vy)).toBe(0);
        const length = Math.hypot(dx, dy);
        expect(length).toBeGreaterThan(0);
        return length;
      });
      if (new Set(lengths).size === 1) tally.squares++;
      else tally.rectangles++;
    }
  }
  for (const [tag] of svg.matchAll(/<circle\b[^>]*>/g)) {
    const attr = (name: string) => Number(tag.match(new RegExp(name + '="([^"]+)"'))?.[1]);
    const x = attr('cx'), y = attr('cy'), radius = attr('r');
    expect(radius).toBeGreaterThan(0);
    expect(Math.min(x - radius, y - radius, 320 - x - radius, 200 - y - radius)).toBeGreaterThan(0);
    const footprint = [x, y, radius].join(',');
    expect(footprints.has(footprint)).toBe(false);
    footprints.add(footprint);
    tally.circles++;
  }
  return tally;
}

it('solves all three tasks from the rendered pieces and the visible requests', () => {
  const seen = { count: new Set<string>(), match: new Set<string>(), compare: new Set<string>() };
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const tally = tallyDrawing(q);
      expect(tally.circles).toBeGreaterThan(0);
      expect(tally.triangles).toBeGreaterThan(0);
      let expected: string;
      let wrong: string;
      if (q.structuredResponse?.kind === 'number-pair') {
        expect(q.structuredResponse.firstLabel).toBe('Squares');
        expect(q.structuredResponse.secondLabel).toBe('Triangles');
        expected = JSON.stringify([String(tally.squares), String(tally.triangles)]);
        wrong = JSON.stringify([String(tally.triangles), String(tally.squares)]);
        seen.count.add(expected);
      } else if (q.choices) {
        const requests = [...q.prompt.matchAll(/(\d+) pieces/g)].map(m => Number(m[1]));
        expect(requests).toHaveLength(2);
        const names = requests.map(n => {
          const hits = Object.entries(tally).filter(([, count]) => count === n);
          expect(hits).toHaveLength(1);
          return hits[0][0];
        });
        expected = names.join(', then ');
        wrong = names.slice().reverse().join(', then ');
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.choices).toContain(expected);
        expect(q.choices).toContain(wrong);
        seen.match.add(expected);
      } else {
        expect(q.prompt).toContain('extra rectangles');
        expect(tally.squares).toBe(0);
        expect(tally.rectangles).toBeGreaterThan(tally.triangles);
        expected = String(tally.rectangles - tally.triangles);
        wrong = String(tally.rectangles + tally.triangles);
        seen.compare.add(expected);
      }
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, wrong)).toBe(false);
    }
  }
  for (const answers of Object.values(seen)) expect(answers.size).toBeGreaterThan(1);
});

it('repeats a seed and index exactly and varies the drawing across indices', () => {
  const pictures = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(83, i);
    expect(makeRagQuestion(83, i)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(1);
});
