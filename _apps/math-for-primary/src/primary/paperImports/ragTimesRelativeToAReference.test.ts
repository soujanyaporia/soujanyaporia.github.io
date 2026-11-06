import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragTimesRelativeToAReference';

// Read each face from the marks that the application draws. The centre, the
// label beside the rim and the two hand directions are sufficient to solve it.
function readFaces(question: Question) {
  const picture = question.picture;
  if (picture?.type !== 'batch11-upper') throw Error('Expected labelled clock faces');
  const { marks } = picture;
  const rims = marks.flatMap(m => m.kind === 'circle' && m.r > 10 ? [m] : []);
  expect(rims).toHaveLength(4);
  return rims.map(({ cx, cy, r }) => {
    const labels = marks.flatMap(m => m.kind === 'text' && /^[A-Za-z]+$/.test(m.text) &&
      m.x < cx - r && m.x >= cx - 160 && Math.abs(m.y - cy) < r ? [m.text] : []);
    expect(labels).toHaveLength(1);
    const rays = marks.flatMap(m => m.kind === 'line' && m.x1 === cx && m.y1 === cy
      ? [{ dx: m.x2 - cx, dy: m.y2 - cy }] : []);
    const length = (ray: typeof rays[number]) => Math.hypot(ray.dx, ray.dy);
    rays.sort((a, b) => length(a) - length(b));
    expect(rays).toHaveLength(2);
    expect(length(rays[0])).toBeGreaterThan(0);
    expect(length(rays[0])).toBeLessThan(length(rays[1]));
    const direction = (ray: typeof rays[number]) => (Math.atan2(ray.dx, -ray.dy) / (2 * Math.PI) + 1) % 1;
    const minutes = Math.round(direction(rays[0]) * 720) % 720;
    const minuteHand = Math.round(direction(rays[1]) * 60) % 60;
    expect([0, 30]).toContain(minuteHand);
    expect(minutes % 60).toBe(minuteHand);
    return { name: labels[0], minutes };
  });
}

it('finds both available show names, including starts exactly on arrival', () => {
  const boundary = new Set<boolean>();
  const answers = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    const set = Array.from({ length: 3 }, (_, i) => makeRagQuestion(seed, i));
    const shows = set.filter(q => q.prompt.includes('at or after'));
    expect(shows).toHaveLength(1);
    const q = shows[0];
    const match = /arrives at (\d{1,2}):(00|30) pm/.exec(q.context?.join(' ') ?? '');
    if (!match) throw Error('Missing afternoon arrival time');
    const cutoff = Number(match[1]) % 12 * 60 + Number(match[2]);
    const faces = readFaces(q);
    const labels = [...new Set(faces.map(f => f.name))];
    expect(labels).toHaveLength(3);
    expect(new Set(faces.map(f => f.minutes)).size).toBe(4);
    const expected = labels.filter(name => faces.some(f => f.name === name && f.minutes >= cutoff));
    expect(expected).toHaveLength(2);
    const repeated = labels.find(name => faces.filter(f => f.name === name).length === 2);
    expect(faces.some(f => f.name === repeated && f.minutes < cutoff)).toBe(true);
    expect(faces.some(f => f.name === repeated && f.minutes >= cutoff)).toBe(true);
    boundary.add(faces.some(f => f.minutes === cutoff));
    answers.add(expected.slice().sort().join('/'));
    expect(JSON.parse(q.answer).sort()).toEqual(expected.slice().sort());
    const spec = q.structuredResponse;
    if (spec?.kind !== 'named-pair') throw Error('Expected a two-show response');
    expect(spec.options.slice().sort()).toEqual(labels.slice().sort());
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected.slice().reverse()))).toBe(true);
    const missed = labels.find(name => !expected.includes(name));
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([missed, expected[0]]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0], expected[0]]))).toBe(false);
  }
  expect(boundary.size).toBe(2);
  expect(answers.size).toBeGreaterThan(1);
});

it('solves the before and after questions independently on their shared clocks', () => {
  for (let seed = -5; seed <= 32; seed++) {
    for (const start of [0, 3]) {
      const set = Array.from({ length: 3 }, (_, i) => makeRagQuestion(seed, start + i));
      const children = set.filter(q => q.prompt.startsWith('Who'));
      expect(children).toHaveLength(2);
      expect(children[0].picture).toEqual(children[1].picture);
      const relations = new Set<string>();
      for (const q of children) {
        expect(q.context?.join(' ')).toContain('morning');
        const clue = /\b(before|after) ([A-Za-z]+)\?$/.exec(q.prompt);
        if (!clue) throw Error('Missing named reference');
        relations.add(clue[1]);
        const faces = readFaces(q);
        expect(new Set(faces.map(f => f.name)).size).toBe(4);
        expect(new Set(faces.map(f => f.minutes)).size).toBe(4);
        const ref = faces.find(f => f.name === clue[2]);
        if (!ref) throw Error('Reference person has no visible clock');
        const matches = faces.filter(f => clue[1] === 'before' ? f.minutes < ref.minutes : f.minutes > ref.minutes);
        expect(matches.map(f => f.name)).toEqual([q.answer]);
      }
      expect([...relations].sort()).toEqual(['after', 'before']);
    }
  }
});

it('reproduces the same visible question for each seed and index', () => {
  for (let index = 0; index < 6; index++) {
    expect(makeRagQuestion(52, index)).toEqual(makeRagQuestion(52, index));
  }
});
