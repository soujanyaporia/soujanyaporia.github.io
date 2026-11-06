import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragPerpendicularLineIdentification';

type Line = Extract<Batch11UpperMark, { kind: 'line' }>;
type Visible = Pick<Question, 'prompt' | 'picture' | 'choices' | 'structuredResponse'>;

function readLines(q: Visible) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing labelled figure');
  const marks = q.picture.marks;
  const texts = marks.filter(m => m.kind === 'text');
  const lines = marks.filter(m => m.kind === 'line');
  const vertices = new Map<string, string>();
  function letter(x: number, y: number) {
    // The renderer positions a letter by its left edge and baseline.
    const ranked = texts.map(t => ({ name: t.text, distance: Math.hypot(t.x + 6 - x, t.y - 6 - y) }))
      .sort((a, b) => a.distance - b.distance);
    if (!ranked[1] || ranked[0].distance > 20 || ranked[1].distance - ranked[0].distance < 1) {
      throw new Error('Ambiguous endpoint label');
    }
    const name = ranked[0].name, point = [x, y].join(',');
    if (vertices.has(name) && vertices.get(name) !== point) throw new Error('Repeated point name');
    vertices.set(name, point);
    return name;
  }
  const lookup = new Map<string, Line>();
  for (const line of lines) {
    const a = letter(line.x1, line.y1), b = letter(line.x2, line.y2);
    if (a === b || lookup.has(a + b)) throw new Error('Missing or duplicate segment');
    lookup.set(a + b, line);
    lookup.set(b + a, line);
  }
  expect(vertices.size).toBe(texts.length);
  return (name: string) => {
    const line = lookup.get(name);
    if (!line) throw new Error(`Line ${name} is missing from the figure`);
    return line;
  };
}

function sideOf(line: Line, x: number, y: number) {
  return (line.x2 - line.x1) * (y - line.y1) - (line.y2 - line.y1) * (x - line.x1);
}

function meetsAtRightAngle(a: Line, b: Line) {
  const dot = (a.x2 - a.x1) * (b.x2 - b.x1) + (a.y2 - a.y1) * (b.y2 - b.y1);
  const straddles = (u: Line, v: Line) =>
    sideOf(u, v.x1, v.y1) * sideOf(u, v.x2, v.y2) <= 0;
  return dot === 0 && straddles(a, b) && straddles(b, a);
}

function solveVisible(q: Visible) {
  const line = readLines(q);
  const reference = /perpendicular to ([A-Z]{2})\?$/.exec(q.prompt)?.[1];
  if (q.structuredResponse?.kind === 'named-pair') {
    if (!reference) throw new Error('Rectangle side is missing');
    const sides = q.structuredResponse.options;
    expect(sides).toHaveLength(4);
    expect(new Set(sides).size).toBe(4);
    expect(sides).toContain(reference);
    const neighbours = sides.filter(s => meetsAtRightAngle(line(s), line(reference)));
    expect(neighbours).toHaveLength(2);
    for (const end of reference) expect(neighbours.filter(name => name.includes(end))).toHaveLength(1);
    return { mode: 'rectangle', matches: neighbours };
  }
  const choices = q.choices ?? [];
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  if (reference) {
    const ref = line(reference);
    expect(choices).not.toContain(reference);
    return {
      mode: ref.y1 === ref.y2 ? 'level line' : 'sloping line',
      matches: choices.filter(choice => meetsAtRightAngle(ref, line(choice))),
    };
  }
  expect(q.prompt).toMatch(/pair/);
  return {
    mode: 'pair',
    matches: choices.filter(choice => {
      const names = choice.split(' and ');
      expect(names).toHaveLength(2);
      return meetsAtRightAngle(line(names[0]), line(names[1]));
    }),
  };
}

it('solves each response from the drawn segments and their endpoint labels', () => {
  const modes = new Set<string>();
  for (let seed = -8; seed <= 48; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const { mode, matches } = solveVisible(q);
      modes.add(mode);
      if (q.structuredResponse?.kind === 'named-pair') {
        expect(JSON.parse(q.answer).sort()).toEqual([...matches].sort());
        for (const order of [matches, [...matches].reverse()]) {
          expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(order))).toBe(true);
        }
        const other = q.structuredResponse.options.find(side => !matches.includes(side));
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([matches[0], other]))).toBe(false);
      } else {
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(matches[0]);
      }
    }
  }
  expect([...modes].sort()).toEqual(['level line', 'pair', 'rectangle', 'sloping line']);
});

it('reproduces each diagram and choice order for the same seed and index', () => {
  for (const seed of [-101, 0, 29, 9001]) {
    for (const index of [0, 1, 7]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
