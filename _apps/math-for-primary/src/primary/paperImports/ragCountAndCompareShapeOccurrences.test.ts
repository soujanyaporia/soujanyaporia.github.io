import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { Batch11UpperDiagram } from './Batch11UpperDiagram';
import { makeRagQuestion } from './ragCountAndCompareShapeOccurrences';

type Outline = { name: string; left: number; top: number; right: number; bottom: number };

function attribute(tag: string, key: string) {
  const value = new RegExp(`\\b${key}="([^"]+)"`).exec(tag)?.[1];
  if (!value) throw Error(`Missing ${key} on a visible outline`);
  return value;
}

function outline(tag: string): Outline {
  if (tag.startsWith('<circle')) {
    const x = Number(attribute(tag, 'cx')), y = Number(attribute(tag, 'cy')), r = Number(attribute(tag, 'r'));
    if (!(r > 0)) throw Error('Circle needs a positive radius');
    return { name: 'circle', left: x - r, top: y - r, right: x + r, bottom: y + r };
  }
  const path = attribute(tag, 'd');
  if (!/^M.*Z$/i.test(path)) throw Error('Shape must be closed');
  const vertices = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  const xs = vertices.map(p => p[0]), ys = vertices.map(p => p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  let name: string;
  if (vertices.length === 3) {
    const [[a, b], [c, d], [e, f]] = vertices;
    if ((c - a) * (f - b) === (d - b) * (e - a)) throw Error('Triangle has no area');
    name = 'triangle';
  } else {
    if (vertices.length !== 4 || new Set(xs).size !== 2 || new Set(ys).size !== 2 ||
        new Set(vertices.map(p => p.join(','))).size !== 4) throw Error('Expected four rectangle corners');
    vertices.forEach(([x, y], i) => {
      const [nextX, nextY] = vertices[(i + 1) % 4];
      if (x !== nextX && y !== nextY) throw Error('Crossed rectangle');
    });
    name = right - left === bottom - top ? 'square' : 'long rectangle';
  }
  return { name, left, top, right, bottom };
}

function readPicture(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw Error('Missing shape drawing');
  const svg = renderToStaticMarkup(createElement(Batch11UpperDiagram, { model: q.picture }));
  const parts = (svg.match(/<(?:circle|path)\b[^>]*>/g) ?? []).map(outline);
  if (!parts.length) throw Error('Empty drawing');
  for (const [i, part] of parts.entries()) {
    if (!(part.left > 1 && part.right < 319 && part.top > 1 && part.bottom < 199)) throw Error('Clipped outline');
    for (const other of parts.slice(0, i)) {
      if (Math.min(part.right, other.right) > Math.max(part.left, other.left) &&
          Math.min(part.bottom, other.bottom) > Math.max(part.top, other.top)) throw Error('Overlapping shapes');
    }
  }
  return parts.map(p => p.name);
}

it('solves from the drawn outlines, the printed question and the field labels', () => {
  const missingNames = new Set<string>(), singleCounts = new Set<number>(), pairedCounts = new Set<string>();
  for (let seed = -20; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const shapes = readPicture(q);
      const count = (name: string) => shapes.filter(s => s === name).length;
      const rectangles = count('long rectangle'), circles = count('circle');
      if (q.choices) {
        expect(q.prompt).toMatch(/missing/);
        expect([...q.choices].sort()).toEqual(['circle', 'long rectangle', 'square', 'triangle']);
        const absent = q.choices.filter(choice => count(choice) === 0);
        expect(absent).toHaveLength(1);
        expect(q.answer).toBe(absent[0]);
        missingNames.add(absent[0]);
      } else if (q.structuredResponse?.kind === 'number-pair') {
        expect(q.prompt).toMatch(/rectangles.*circles/);
        expect([q.structuredResponse.firstLabel, q.structuredResponse.secondLabel]).toEqual(['Rectangles', 'Circles']);
        const response = JSON.stringify([String(rectangles), String(circles)]);
        expect(rectangles).toBeGreaterThan(0);
        expect(circles).toBeGreaterThan(rectangles);
        expect(q.answer).toBe(response);
        expect(correctAnswer(q, response)).toBe(true);
        expect(correctAnswer(q, JSON.stringify([String(circles), String(rectangles)]))).toBe(false);
        pairedCounts.add(response);
      } else {
        expect(q.structuredResponse).toBeUndefined();
        expect(q.prompt).toMatch(/How many triangles/);
        const givens = /(\d+) rectangles and (\d+) circles/.exec(q.context?.join(' ') ?? '');
        expect(givens?.slice(1).map(Number)).toEqual([rectangles, circles]);
        const triangles = count('triangle');
        expect(triangles).toBeGreaterThanOrEqual(3);
        expect(q.answer).toBe(String(triangles));
        singleCounts.add(triangles);
      }
    }
  }
  expect(missingNames.size).toBe(4);
  expect(singleCounts.size).toBeGreaterThan(2);
  expect(pairedCounts.size).toBeGreaterThan(3);
});

it('repeats a seed and index and varies the visible picture across indices', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(41, index);
    expect(makeRagQuestion(41, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(1);
});
