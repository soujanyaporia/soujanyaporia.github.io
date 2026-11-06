import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { makeRagQuestion } from './ragMeasurementTotalsAndDifferences';

function compareNamed(prompt: string, noun: 'Cord', values: Map<string, number>): number {
  const match = prompt.match(/(Cord) ([AB]) than (Cord) ([AB])\?/);
  if (!match || match[1] !== noun || match[3] !== noun) throw Error('Missing comparison labels');
  const larger = values.get(`${noun} ${match[2]}`);
  const smaller = values.get(`${noun} ${match[4]}`);
  if (larger === undefined || smaller === undefined) throw Error('Missing measured object');
  expect(larger).toBeGreaterThan(smaller);
  return larger - smaller;
}

function solve(q: Question) {
  const p = q.picture;
  if (p?.type !== 'batch11-upper') throw Error('Missing measurement diagram');
  const context = q.context?.join(' ') ?? '';
  const labels = p.marks.filter(m => m.kind === 'text');
  expect(labels.map(m => m.text).sort()).toEqual(['Cord A', 'Cord B']);
  expect(context).toMatch(/each tile is 1 cm long/i);
  expect(q.unit).toBe('cm');
  return solveCords(q, p);
}

function solveCords(q: Question, p: Batch11UpperPicture) {
  const lines = p.marks.filter(m => m.kind === 'line');
  const edges = lines.filter(l => !l.dashed && l.x1 === l.x2).sort((a, b) => a.x1 - b.x1);
  expect(edges.length).toBeGreaterThan(3);
  const tileWidth = edges[1].x1 - edges[0].x1;
  expect(tileWidth).toBeGreaterThan(0);
  edges.slice(1).forEach((line, i) => {
    expect(line.x1 - edges[i].x1).toBe(tileWidth);
    expect([line.y1, line.y2]).toEqual([edges[0].y1, edges[0].y2]);
  });
  const spans = lines.filter(l => l.y1 === l.y2 && (l.y1 < edges[0].y1 || l.y1 > edges[0].y2));
  expect(spans).toHaveLength(2);
  const estimates = new Map<string, number>();
  const approximate = q.prompt.includes('altogether');
  let actualSum = 0;
  for (const label of p.marks.filter(m => m.kind === 'text')) {
    const [span] = [...spans].sort((a, b) => Math.abs(label.y - a.y1) - Math.abs(label.y - b.y1));
    expect(span.x1).toBe(edges[0].x1);
    expect(lines.some(l => l.dashed && l.x1 === span.x2 && l.x2 === span.x2 && l.y1 === span.y1 &&
      l.y2 === (span.y1 < edges[0].y1 ? edges[0].y1 : edges[0].y2))).toBe(true);
    const distances = edges.map(e => Math.abs(e.x1 - span.x2));
    const min = Math.min(...distances);
    expect(distances.filter(d => d === min)).toHaveLength(1);
    const tiles = distances.indexOf(min);
    expect(tiles).toBeGreaterThan(0);
    expect(tiles).toBeLessThan(edges.length - 1);
    if (approximate) {
      expect(min / tileWidth).toBeGreaterThan(0.1);
      expect(min / tileWidth).toBeLessThan(0.4);
    } else {
      expect(min).toBe(0);
    }
    estimates.set(label.text, tiles);
    actualSum += (span.x2 - span.x1) / tileWidth;
  }
  if (approximate) {
    expect(q.context?.join(' ')).toContain('nearest whole centimetre first');
    expect(q.prompt).toContain('About');
    const result = [...estimates.values()].reduce((sum, n) => sum + n, 0);
    return { mode: 'length estimate', result, roundTogether: Math.round(actualSum) };
  }
  expect(q.prompt).toContain('longer');
  return { mode: 'length difference', result: compareNamed(q.prompt, 'Cord', estimates) };
}

it('solves exact and estimated lengths from the displayed centimetre spans', () => {
  const answers = new Map<string, Set<number>>();
  let catchesRoundingAtTheEnd = false;
  for (let seed = -8; seed < 56; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solve(q);
      expect(q.answer).toBe(String(solved.result));
      expect(correctAnswer(q, String(solved.result))).toBe(true);
      expect(correctAnswer(q, String(solved.result + 1))).toBe(false);
      expect(q.choices).toBeUndefined();
      expect(q.workedSteps).toHaveLength(3);
      if ('roundTogether' in solved && solved.roundTogether !== undefined && solved.roundTogether !== solved.result) {
        catchesRoundingAtTheEnd = true;
      }
      const seen = answers.get(solved.mode) ?? new Set<number>();
      seen.add(solved.result);
      answers.set(solved.mode, seen);
    }
  }
  expect([...answers.keys()].sort()).toEqual(['length difference', 'length estimate']);
  for (const seen of answers.values()) expect(seen.size).toBeGreaterThan(2);
  expect(catchesRoundingAtTheEnd).toBe(true);
});

it('replays a question and varies the visible measurements across indices', () => {
  const diagrams = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(q);
    diagrams.add(JSON.stringify(q.picture));
  }
  expect(diagrams.size).toBeGreaterThan(5);
});
