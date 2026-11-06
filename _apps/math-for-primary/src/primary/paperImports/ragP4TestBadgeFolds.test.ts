import { test, expect } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP4TestBadgeFolds';

type Line = Extract<Batch11UpperMark, { kind: 'line' }>;
type Circle = Extract<Batch11UpperMark, { kind: 'circle' }>;
type Label = Extract<Batch11UpperMark, { kind: 'text' }>;
const epsilon = 1e-6;

// Reflect a drawn circle's centre in the actual dashed segment's infinite line.
function reflected(circle: Circle, line: Line) {
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const t = ((circle.cx - line.x1) * dx + (circle.cy - line.y1) * dy) / (dx * dx + dy * dy);
  return { x: 2 * (line.x1 + t * dx) - circle.cx, y: 2 * (line.y1 + t * dy) - circle.cy };
}

function solve(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Expected a marked figure');
  const marks = q.picture.marks;
  const rings = marks.filter((m): m is Circle => m.kind === 'circle' && !m.fill);
  const spots = marks.filter((m): m is Circle => m.kind === 'circle' && !!m.fill);
  const lines = marks.filter((m): m is Line => m.kind === 'line' && m.dashed === true);
  const labels = marks.filter((m): m is Label => m.kind === 'text');
  const shared = rings.length === 1;
  const seekMatch = !q.prompt.includes('without a match');
  expect(rings.length).toBe(shared ? 1 : 4);
  expect(q.prompt.startsWith(shared ? 'Which line' : 'Which badge')).toBe(true);
  expect(lines).toHaveLength(4);
  expect(labels).toHaveLength(4);
  const options: string[] = [], winners: string[] = [];
  for (const ring of rings) {
    const inside = spots.filter(s => Math.hypot(s.cx - ring.cx, s.cy - ring.cy) + s.r < ring.r);
    expect(inside.length).toBeGreaterThanOrEqual(2);
    const folds = lines.filter(l => Math.hypot((l.x1 + l.x2) / 2 - ring.cx, (l.y1 + l.y2) / 2 - ring.cy) < epsilon);
    expect(folds).toHaveLength(shared ? 4 : 1);
    for (const line of folds) {
      const near = (l: Label) => shared
        ? Math.min(Math.hypot(l.x - line.x1, l.y - line.y1), Math.hypot(l.x - line.x2, l.y - line.y2))
        : Math.hypot(l.x - ring.cx, l.y - ring.cy);
      const label = [...labels].sort((a, b) => near(a) - near(b))[0];
      const name = (shared ? 'Line ' : 'Badge ') + label.text;
      options.push(name);
      const complete = [ring, ...inside];
      const matches = complete.every(c => {
        const p = reflected(c, line);
        return complete.some(other => c.r === other.r && c.fill === other.fill &&
          Math.hypot(p.x - other.cx, p.y - other.cy) < epsilon);
      });
      if (matches === seekMatch) winners.push(name);
    }
  }
  expect(new Set(options).size).toBe(4);
  expect([...(q.choices ?? [])].sort()).toEqual(options.sort());
  expect(winners).toHaveLength(1);
  return { answer: winners[0], mode: (shared ? 'line' : 'badge') + (seekMatch ? '-match' : '-miss') };
}

test('each question has one answer when its visible rim and spots are reflected', () => {
  const lettersByMode = new Map<string, Set<string>>();
  for (let seed = -24; seed < 40; seed++) {
    const modes = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solve(q);
      expect(q.answer).toBe(solved.answer);
      modes.add(solved.mode);
      const answers = lettersByMode.get(solved.mode) ?? new Set<string>();
      answers.add(solved.answer);
      lettersByMode.set(solved.mode, answers);
    }
    expect(modes.size).toBe(4);
  }
  for (const answers of lettersByMode.values()) expect(answers.size).toBe(4);
});

test('replaying the same seed and index reproduces the diagram, choices and solution', () => {
  for (const seed of [-7, 0, 15]) {
    for (let index = 0; index < 4; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
